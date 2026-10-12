import { flaggedPayload } from '../supabase/functions/send-push/payload'
import { pushMessages } from '../src/i18n/messages/push'
import { DemoBackend } from './support/demoBackend'
import { expect, test } from './support/i18n'

// The headless shell always denies notifications; the full Chromium build in new headless mode doesn't.
test.use({ serviceWorkers: 'allow', permissions: ['notifications'], channel: 'chromium' })

// Headless Chromium has no push service, so subscribing is replaced by a fixed subscription
// (kept in sessionStorage across reloads). Everything after it is real: the opt-in UI, the
// RPCs, and a push delivered to the service worker through the DevTools protocol.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const json = {
      endpoint: 'https://push.example.test/e2e',
      keys: { p256dh: `B${'A'.repeat(86)}`, auth: 'k'.repeat(22) },
    }
    const subscription = () => ({
      endpoint: json.endpoint,
      toJSON: () => json,
      unsubscribe: async () => {
        sessionStorage.removeItem('e2e-push')
        return true
      },
    })
    PushManager.prototype.subscribe = async function () {
      sessionStorage.setItem('e2e-push', '1')
      return subscription() as unknown as PushSubscription
    }
    PushManager.prototype.getSubscription = async function () {
      return sessionStorage.getItem('e2e-push') ? (subscription() as unknown as PushSubscription) : null
    }
  })
})

test('opt in, get a test and a flagged-payment push, then opt out', async ({ page, context, t, lang }) => {
  const backend = new DemoBackend()
  await backend.route(page)
  const p = pushMessages[lang]

  await page.goto('')
  await page.getByRole('button', { name: t.login.start }).click()
  await expect(page.getByRole('heading', { name: t.overview.totalAvailable })).toBeVisible()
  await page.goto('notifications')
  const section = page.getByRole('region', { name: p.title })
  await expect(section).toContainText(p.intro)

  // Opt-in only happens on an explicit click.
  expect(backend.pushSubscriptions).toEqual([])
  await section.getByRole('button', { name: p.turnOn }).click()
  await expect(section).toContainText(p.on)
  await expect(page.getByRole('status').filter({ hasText: p.turnedOn })).toBeVisible()
  expect(backend.pushSubscriptions).toEqual([
    { endpoint: 'https://push.example.test/e2e', p256dh: `B${'A'.repeat(86)}`, auth: 'k'.repeat(22), locale: lang },
  ])

  await section.getByRole('button', { name: p.sendTest }).click()
  await expect(page.getByRole('status').filter({ hasText: p.testSent })).toBeVisible()
  expect(backend.testPushes).toBe(1)

  // Delivery: the payload send-push builds for the seeded review charge, pushed to the worker.
  const payload = flaggedPayload(
    { merchant: 'Unrecognized merchant — online', amount_cents: 98999, card_last4: '4821' },
    lang,
  )
  // The DevTools protocol reports registrations across contexts of this browser, including
  // earlier tests' with the same scope, so the push goes to every live one with this scope.
  const cdp = await context.newCDPSession(page)
  const registrationIds = new Set<string>()
  cdp.on('ServiceWorker.workerRegistrationUpdated', ({ registrations }) => {
    for (const registration of registrations) {
      if (!registration.scopeURL.endsWith('/obsidian-bank/')) continue
      if (registration.isDeleted) registrationIds.delete(registration.registrationId)
      else registrationIds.add(registration.registrationId)
    }
  })
  await cdp.send('ServiceWorker.enable')
  await expect.poll(() => registrationIds.size).toBeGreaterThan(0)
  // A message delivered right after enabling the domain is sometimes dropped, so delivery is
  // retried until it shows; the shared tag means a retry replaces the earlier notification.
  await expect(async () => {
    for (const registrationId of registrationIds) {
      await cdp.send('ServiceWorker.deliverPushMessage', {
        origin: 'http://127.0.0.1:4173',
        registrationId,
        data: JSON.stringify(payload),
      })
    }
    await expect
      .poll(
        () =>
          page.evaluate(async () =>
            (await (await navigator.serviceWorker.ready).getNotifications()).map(({ title, body, tag }) => ({
              title,
              body,
              tag,
            })),
          ),
        { timeout: 2000 },
      )
      .toEqual([
        {
          title: payload.title,
          body: t.notifications.flagged('Unrecognized merchant — online', '$989.99', '4821'),
          tag: 'flagged',
        },
      ])
  }).toPass({ timeout: 15_000 })

  // The choice survives a reload, and opting out removes the subscription.
  await page.reload()
  await expect(section).toContainText(p.on)
  await section.getByRole('button', { name: p.turnOff }).click()
  await expect(page.getByRole('status').filter({ hasText: p.turnedOff })).toBeVisible()
  await expect(section.getByRole('button', { name: p.turnOn })).toBeVisible()
  expect(backend.pushSubscriptions).toEqual([])
  expect(backend.unexpectedRequests).toEqual([])
})
