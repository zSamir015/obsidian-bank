import { DemoBackend } from './support/demoBackend'
import { expect, test } from './support/i18n'

test.use({ serviceWorkers: 'allow' })

test('the manifest makes the app installable', async ({ page, request }) => {
  await page.goto('')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBe('/obsidian-bank/manifest.webmanifest')
  const manifest = await (await request.get(href!)).json()
  expect(manifest).toMatchObject({
    name: 'Obsidian Bank',
    start_url: './',
    scope: './',
    display: 'standalone',
    theme_color: '#050505',
  })
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(['192x192', '512x512', '512x512'])
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true)
  for (const icon of manifest.icons) {
    const response = await request.get(new URL(icon.src, `http://127.0.0.1:4173${href}`).href)
    expect(response.headers()['content-type']).toBe('image/png')
  }
  const appleIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')
  expect((await request.get(appleIcon!)).ok()).toBe(true)
})

test('the service worker caches the app shell and never account data', async ({ page, t }) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await page.getByRole('button', { name: t.login.start }).click()
  await expect(page.getByRole('heading', { name: t.overview.totalAvailable })).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect(page.getByRole('heading', { name: t.overview.totalAvailable })).toBeVisible()
  await page.getByRole('link', { name: t.nav.activity }).first().click()
  await expect(page.getByRole('heading', { name: t.activity.title })).toBeVisible()

  const cached = await page.evaluate(async () => {
    const urls: string[] = []
    for (const key of await caches.keys()) {
      for (const request of await (await caches.open(key)).keys()) urls.push(new URL(request.url).pathname)
    }
    return urls
  })
  expect(cached).toContain('/obsidian-bank/index.html')
  expect(cached.some((path) => path.startsWith('/obsidian-bank/assets/'))).toBe(true)
  expect(
    cached.every((path) =>
      /^\/obsidian-bank\/(assets\/|icons\/|index\.html$|manifest\.webmanifest$|favicon\.svg$)/.test(path),
    ),
  ).toBe(true)
  expect(backend.unexpectedRequests).toEqual([])
})

test('offline, the app explains that data needs a connection', async ({ page, context, t }) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await page.getByRole('button', { name: t.login.start }).click()
  await expect(page.getByRole('heading', { name: t.overview.totalAvailable })).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)

  // Losing the connection keeps the screen and adds a notice.
  await context.setOffline(true)
  await expect(page.getByRole('status').filter({ hasText: t.offline.banner })).toBeVisible()
  await expect(page.getByRole('heading', { name: t.overview.totalAvailable })).toBeVisible()

  // Opening the app offline loads the cached shell and shows the offline screen.
  await page.goto('activity')
  await expect(page.getByRole('heading', { name: t.offline.title })).toBeVisible()
  await expect(page.getByText(t.offline.body)).toBeVisible()

  await context.setOffline(false)
  await expect(page.getByRole('heading', { name: t.activity.title })).toBeVisible()
  expect(backend.unexpectedRequests).toEqual([])
})
