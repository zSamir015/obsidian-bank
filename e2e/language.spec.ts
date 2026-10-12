import { DemoBackend } from './support/demoBackend'
import { expect, LANGUAGES, test } from './support/i18n'

test('the app starts in the browser language', async ({ page, t, lang }) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await expect(page.locator('html')).toHaveAttribute('lang', lang)
  await expect(page.getByRole('heading', { name: t.login.title })).toBeVisible()
  await expect(page.getByRole('combobox', { name: t.language.label })).toHaveValue(lang)
  expect(backend.unexpectedRequests).toEqual([])
})

test('the language picker switches language and remembers it on this device', async ({ page, t, lang }) => {
  const backend = new DemoBackend()
  await backend.route(page)
  const other = lang === 'en' ? 'es' : 'en'
  const otherT = LANGUAGES[other].t

  await page.goto('')
  await expect(page.getByRole('heading', { name: t.login.title })).toBeVisible()
  await page.getByRole('combobox', { name: t.language.label }).selectOption(other)
  await expect(page.getByRole('heading', { name: otherT.login.title })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', other)

  await page.reload()
  await expect(page.getByRole('heading', { name: otherT.login.title })).toBeVisible()
  await expect(page.getByRole('combobox', { name: otherT.language.label })).toHaveValue(other)
  expect(backend.unexpectedRequests).toEqual([])
})
