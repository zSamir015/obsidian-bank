import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type ViewportSize } from '@playwright/test'
import { DemoBackend } from './support/demoBackend'

const viewports: { name: string; size: ViewportSize }[] = [
  { name: 'desktop', size: { width: 1280, height: 900 } },
  { name: 'mobile', size: { width: 375, height: 812 } },
]

async function enterDemo(page: Page) {
  await page.goto('')
  await expect(page.getByRole('heading', { name: 'A calm place for your money.' })).toBeVisible()
  await page.getByRole('button', { name: 'Explore the demo' }).click()
  await expect(page.getByRole('heading', { name: 'Total available' })).toBeVisible()
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

    test('all primary screens have no serious or critical axe violations', async ({ page }) => {
      const backend = new DemoBackend()
      await backend.route(page)

      await page.goto('')
      await expect(page.getByRole('heading', { name: 'A calm place for your money.' })).toBeVisible()
      const violations = await collectSeriousViolations(page, 'Login')
      await page.getByRole('button', { name: 'Explore the demo' }).click()
      await expect(page.getByRole('heading', { name: 'Total available' })).toBeVisible()
      violations.push(...(await collectSeriousViolations(page, 'Overview')))

      for (const screen of [
        { path: 'activity', heading: 'Activity', name: 'Activity' },
        { path: 'transfer', heading: 'Move money', name: 'Move money' },
        { path: 'budgets', heading: 'Budgets', name: 'Budgets' },
        { path: 'cards', heading: 'Cards', name: 'Cards (front)' },
      ]) {
        await page.goto(screen.path)
        await expect(page.getByRole('heading', { name: screen.heading }).first()).toBeVisible()
        violations.push(...(await collectSeriousViolations(page, screen.name)))

        if (screen.path === 'cards') {
          await page.getByRole('button', { name: 'Show back' }).click()
          await expect(page.locator('[data-card-visual="static"]')).toHaveAttribute('data-face', 'back')
          violations.push(...(await collectSeriousViolations(page, 'Cards (back)')))
        }
      }

      await page.goto('accessibility-not-found')
      await expect(page.getByRole('heading', { name: "This page doesn't exist" })).toBeVisible()
      violations.push(...(await collectSeriousViolations(page, 'Not found')))

      expect(backend.unexpectedRequests).toEqual([])
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
    })

    test('route error screen has no serious or critical axe violations', async ({ page }) => {
      const backend = new DemoBackend()
      await backend.route(page)
      await enterDemo(page)

      await page.route('**/assets/CardsPage-*.js', (route) => route.abort())
      await page.goto('cards')
      await expect(page.getByRole('heading', { name: "This page didn't load" })).toBeVisible()

      const violations = await collectSeriousViolations(page, 'Route error')
      expect(backend.unexpectedRequests).toEqual([])
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
    })
  })
}
