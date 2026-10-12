import { DemoBackend } from './support/demoBackend'
import { expect, test } from './support/i18n'

// 768 px is the md breakpoint, where the top bar gives way to the side menu.
test('Cards does not scroll sideways around the md breakpoint', async ({ page, t }) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await page.getByRole('button', { name: t.login.start }).click()
  await expect(page.getByRole('heading', { name: t.overview.totalAvailable })).toBeVisible()
  await page.goto('cards')
  await expect(page.getByRole('heading', { name: t.cards.title }).first()).toBeVisible()

  for (const width of [320, 375, 767, 768, 769, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth), { message: `${width} px` })
      .toBeLessThanOrEqual(width)
  }
  expect(backend.unexpectedRequests).toEqual([])
})
