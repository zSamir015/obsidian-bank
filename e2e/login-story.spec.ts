import { expect, test } from '@playwright/test'
import { DemoBackend } from './support/demoBackend'

test.describe('desktop login scroll story', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('keeps the call to action available and shows the static card story', async ({ page }, testInfo) => {
    const backend = new DemoBackend()
    await backend.route(page)
    await page.goto('')

    const cta = page.getByRole('button', { name: 'Explore the demo' })
    const story = page.getByTestId('login-scroll-story')
    await expect(cta).toBeVisible()
    await expect(story).toBeVisible()
    await expect(story.getByText('Clarity in every detail.')).toBeVisible()
    await expect(story.locator('[data-card-visual="static"]')).toHaveAttribute('data-face', 'front')
    await page.screenshot({ path: testInfo.outputPath('login-story-1440.png') })

    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.1))
    await expect(cta).toBeVisible()
    await expect(story.getByText('Your money, in view.')).toBeVisible()
    await expect(story.locator('[data-card-visual="static"]')).toHaveAttribute('data-face', 'back')
    const ctaBox = await cta.boundingBox()
    expect(ctaBox).not.toBeNull()
    expect(ctaBox!.y).toBeGreaterThanOrEqual(0)
    expect(ctaBox!.y + ctaBox!.height).toBeLessThanOrEqual(900)

    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2))
    await expect(cta).toBeVisible()
    await expect(story.getByText('A calmer way to move forward.')).toBeVisible()
    await expect(story.locator('[data-card-visual="static"]')).toHaveAttribute('data-face', 'back')
    await expect(story.getByTestId('login-story-card-frame')).toHaveCSS('transform', 'none')
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('obsidian-bank:card-entry-played'))).toBe(null)
    await cta.click()
    await expect(page.getByRole('heading', { name: 'Total balance' })).toBeVisible()
    expect(backend.unexpectedRequests).toEqual([])
  })

  test('mobile keeps the original login screen without the story', async ({ page }, testInfo) => {
    const backend = new DemoBackend()
    await backend.route(page)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('')

    await expect(page.getByRole('heading', { name: 'A calm place for your money.' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Explore the demo' })).toBeVisible()
    await expect(page.getByTestId('login-scroll-story')).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath('login-mobile-375.png') })
    expect(backend.unexpectedRequests).toEqual([])
  })

  test('loads the 3D card only after the login and call to action are rendered', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const backend = new DemoBackend()
    await backend.route(page)

    let loginVisibleWhen3DWasRequested = false
    await page.route('**/assets/Card3D-*.js', async (route) => {
      loginVisibleWhen3DWasRequested = await page.getByRole('button', { name: 'Explore the demo' }).isVisible()
      await route.continue()
    })
    await page.goto('')
    await expect(page.getByRole('button', { name: 'Explore the demo' })).toBeVisible()
    await expect(page.getByTestId('login-scroll-story')).toBeVisible()
    await expect.poll(() => loginVisibleWhen3DWasRequested, { timeout: 10_000 }).toBe(true)
    expect(backend.unexpectedRequests).toEqual([])
  })

  test('captures the native-scroll card story progression', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const backend = new DemoBackend()
    await backend.route(page)
    await page.goto('')

    const story = page.getByTestId('login-scroll-story')
    await expect(story).toBeVisible()
    await expect(story.locator('[data-card-visual="3d"]')).toBeVisible({ timeout: 10_000 })

    const storyStart = await story.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)
    for (const [index, progress] of [0, 0.25, 0.5, 0.75, 1].entries()) {
      await page.evaluate(
        ({ top, amount }) =>
          window.scrollTo(
            0,
            top +
              (document.querySelector('[data-testid="login-scroll-story"]')!.scrollHeight - window.innerHeight) *
                amount,
          ),
        { top: storyStart, amount: progress },
      )
      await expect.poll(() => story.getAttribute('data-step')).toBe(String(Math.min(2, Math.floor(progress * 3))))
      await page.waitForTimeout(250)
      await page.screenshot({ path: testInfo.outputPath(`login-story-frame-${index}.png`) })
    }
    expect(backend.unexpectedRequests).toEqual([])
  })
})
