import type { Page } from '@playwright/test'
import { DemoBackend } from './support/demoBackend'
import { expect, test } from './support/i18n'

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** TanStack Query refetches notifications when the tab becomes visible again. */
const returnToTab = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))

test('a payment moved to Under review shows up as a notification', async ({ page, t }) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await page.getByRole('button', { name: t.login.start }).click()
  await expect(page.getByRole('heading', { name: t.overview.totalAvailable })).toBeVisible()

  // The seeded review charge already has its notification.
  const bell = page.getByRole('link', { name: new RegExp(`^${escapeRegExp(t.notifications.title)}`) }).first()
  await expect(bell).toHaveAccessibleName(t.notifications.link(1, '1'))

  // The server moves a pending card payment to review; the app hears about it on the next check.
  backend.flag('Uber')
  await returnToTab(page)
  await expect(bell).toHaveAccessibleName(t.notifications.link(2, '2'))

  await page.getByRole('link', { name: t.nav.activity }).first().click()
  const uber = page.getByRole('listitem').filter({ hasText: 'Uber' })
  await expect(uber).toContainText(t.statuses.flagged)

  await bell.click()
  await expect(page.getByRole('heading', { name: t.notifications.title })).toBeVisible()
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.first()).toHaveText(
    new RegExp(`^${escapeRegExp(t.notifications.flagged('Uber', '$89.40', '4821'))}`),
  )
  await expect(items.first()).toContainText(t.notifications.unreadItem)

  await page.getByRole('button', { name: t.notifications.markAllRead }).click()
  await expect(page.getByRole('status')).toHaveText(t.notifications.allRead)
  await expect(bell).toHaveAccessibleName(t.notifications.link(0, '0'))
  await expect(page.getByText(t.notifications.unread(0, '0'))).toBeVisible()
  expect(backend.notifications.every((row) => row.read_at !== null)).toBe(true)

  // Nothing but merchant, amount and last four digits travels with a notification.
  for (const row of backend.notifications) {
    expect(Object.keys(row).sort()).toEqual(['amount_cents', 'card_last4', 'created_at', 'id', 'merchant', 'read_at'])
  }
  expect(backend.unexpectedRequests).toEqual([])
})
