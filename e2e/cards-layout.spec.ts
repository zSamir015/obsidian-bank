import { expect, test } from '@playwright/test'
import { DemoBackend } from './support/demoBackend'

// 768 px is the md breakpoint, where the top bar gives way to the side menu.
const locales = [
  { locale: 'en-US', explore: 'Explore the demo', overview: 'Total available', cards: 'Cards' },
  { locale: 'es-MX', explore: 'Explorar la demo', overview: 'Total disponible', cards: 'Tarjetas' },
]

for (const { locale, explore, overview, cards } of locales) {
  test.describe(`Cards layout (${locale})`, () => {
    test.use({ locale })

    test('does not scroll sideways around the md breakpoint', async ({ page }) => {
      const backend = new DemoBackend()
      await backend.route(page)

      await page.goto('')
      await page.getByRole('button', { name: explore }).click()
      await expect(page.getByRole('heading', { name: overview })).toBeVisible()
      await page.goto('cards')
      await expect(page.getByRole('heading', { name: cards }).first()).toBeVisible()

      for (const width of [320, 375, 767, 768, 769, 1024, 1280]) {
        await page.setViewportSize({ width, height: 900 })
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth), { message: `${width} px` })
          .toBeLessThanOrEqual(width)
      }
    })
  })
}
