import { expect, test } from '@playwright/test'
import { DemoBackend } from './support/demoBackend'

// Smoke tests for the critical flows in Spanish. The full journeys run in English.
test.describe('Spanish @es', () => {
  test.use({ locale: 'es-MX' })

  test('sign-in, balance and transfer follow the browser language', async ({ page }) => {
    const backend = new DemoBackend()
    await backend.route(page)

    await page.goto('')
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    await expect(page.getByRole('heading', { name: 'Un lugar tranquilo para tu dinero.' })).toBeVisible()
    await page.getByRole('button', { name: 'Explorar la demo' }).click()

    await expect(page.getByRole('heading', { name: 'Total disponible' })).toBeVisible()
    await expect(page.getByText('Saldo contable')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ayuda (se abre en una pestaña nueva)' }).first()).toHaveAttribute(
      'href',
      'https://github.com/zSamir015/obsidian-bank/blob/main/docs/USER_GUIDE.es.md',
    )
    // Amounts stay in US dollars whatever the language.
    await expect(page.getByText('$12,640.55').first()).toBeVisible()

    await page.getByRole('link', { name: 'Transferir' }).first().click()
    await expect(page.getByRole('heading', { name: 'Mover dinero' })).toBeVisible()
    await page.getByRole('button', { name: 'Mover dinero' }).click()
    await expect(page.getByText('Escribe un monto.')).toBeVisible()
    await page.getByLabel('Monto').fill('25.50')
    await page.getByRole('button', { name: 'Mover dinero' }).click()
    await expect(page.getByRole('status')).toContainText('Moviste $25.50 a Obsidian Vault')
    expect(backend.accounts[0].available_balance_cents).toBe(1261505)

    await page.getByRole('link', { name: 'Notificaciones, 1 sin leer' }).first().click()
    await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible()
    await expect(page.getByRole('listitem')).toContainText(
      '$989.99 en Unrecognized merchant — online con la tarjeta terminada en 4821 está en revisión.',
    )
    expect(backend.unexpectedRequests).toEqual([])
  })

  test('the not-found and route error pages are in Spanish', async ({ page }) => {
    const backend = new DemoBackend()
    await backend.route(page)

    await page.goto('no-existe')
    await expect(page.getByRole('heading', { name: 'Esta página no existe' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Volver al resumen' })).toBeVisible()

    await page.goto('')
    await page.getByRole('button', { name: 'Explorar la demo' }).click()
    await expect(page.getByRole('heading', { name: 'Total disponible' })).toBeVisible()
    await page.route('**/assets/CardsPage-*.js', (route) => route.abort())
    await page.goto('cards')
    await expect(page.getByRole('heading', { name: 'Esta página no se cargó' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Recargar' })).toBeVisible()
    expect(backend.unexpectedRequests).toEqual([])
  })
})

test('the language picker switches to Spanish and remembers it on this device', async ({ page }) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await expect(page.getByRole('heading', { name: 'A calm place for your money.' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Language' }).selectOption('es')
  await expect(page.getByRole('heading', { name: 'Un lugar tranquilo para tu dinero.' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Un lugar tranquilo para tu dinero.' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Idioma' })).toHaveValue('es')
  expect(backend.unexpectedRequests).toEqual([])
})
