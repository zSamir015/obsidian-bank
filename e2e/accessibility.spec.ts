import AxeBuilder from '@axe-core/playwright'
import type { Page, ViewportSize } from '@playwright/test'
import type { Messages } from '../src/i18n/messages/en'
import { DemoBackend } from './support/demoBackend'
import { expect, test } from './support/i18n'

const viewports: { name: string; size: ViewportSize }[] = [
  { name: 'desktop', size: { width: 1280, height: 900 } },
  { name: 'mobile', size: { width: 375, height: 812 } },
]

async function enterDemo(page: Page, t: Messages) {
  await page.goto('')
  await expect(page.getByRole('heading', { name: t.login.title })).toBeVisible()
  await page.getByRole('button', { name: t.login.start }).click()
  await expect(page.getByRole('heading', { name: t.overview.totalAvailable })).toBeVisible()
}

async function collectSeriousViolations(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()

  return violations
    .filter(({ impact }) => impact === 'critical' || impact === 'serious')
    .map(({ id, impact, help, nodes }) => ({
      screen: label,
      id,
      impact,
      help,
      elements: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    }))
}

for (const { name, size } of viewports) {
  test.describe(`Accessibility at ${name} @a11y`, () => {
    test.use({ viewport: size })

    test('all primary screens have no serious or critical axe violations', async ({ page, t }) => {
      const backend = new DemoBackend()
      await backend.route(page)

      await page.goto('')
      await expect(page.getByRole('heading', { name: t.login.title })).toBeVisible()
      const violations = await collectSeriousViolations(page, 'Login')
      await page.getByRole('button', { name: t.login.start }).click()
      await expect(page.getByRole('heading', { name: t.overview.totalAvailable })).toBeVisible()
      violations.push(...(await collectSeriousViolations(page, 'Overview')))

      for (const screen of [
        { path: 'activity', heading: t.activity.title, name: 'Activity' },
        { path: 'transfer', heading: t.transfer.title, name: 'Move money' },
        { path: 'budgets', heading: t.budgets.title, name: 'Budgets' },
        { path: 'cards', heading: t.cards.title, name: 'Cards (front)' },
        { path: 'notifications', heading: t.notifications.title, name: 'Notifications' },
      ]) {
        await page.goto(screen.path)
        await expect(page.getByRole('heading', { name: screen.heading }).first()).toBeVisible()
        violations.push(...(await collectSeriousViolations(page, screen.name)))

        if (screen.path === 'transfer') {
          await page.getByText(t.transfer.externalMode).click()
          await expect(page.getByRole('button', { name: t.transfer.submitExternal })).toBeVisible()
          violations.push(...(await collectSeriousViolations(page, 'Move money (another bank)')))
          await page.getByRole('button', { name: t.transfer.submitExternal }).click()
          await expect(page.getByText(t.validation.routingRequired)).toBeVisible()
          violations.push(...(await collectSeriousViolations(page, 'Move money (another bank, errors)')))
        }

        if (screen.path === 'cards') {
          await page.getByRole('button', { name: t.cards.showBack }).click()
          await expect(page.locator('[data-card-visual="static"]')).toHaveAttribute('data-face', 'back')
          violations.push(...(await collectSeriousViolations(page, 'Cards (back)')))
        }
      }

      await page.goto('accessibility-not-found')
      await expect(page.getByRole('heading', { name: t.notFound.title })).toBeVisible()
      violations.push(...(await collectSeriousViolations(page, 'Not found')))

      expect(backend.unexpectedRequests).toEqual([])
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
    })

    test('route error screen has no serious or critical axe violations', async ({ page, t }) => {
      const backend = new DemoBackend()
      await backend.route(page)
      await enterDemo(page, t)

      await page.route('**/assets/CardsPage-*.js', (route) => route.abort())
      await page.goto('cards')
      await expect(page.getByRole('heading', { name: t.routeError.staleTitle })).toBeVisible()

      const violations = await collectSeriousViolations(page, 'Route error')
      expect(backend.unexpectedRequests).toEqual([])
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
    })
  })
}
