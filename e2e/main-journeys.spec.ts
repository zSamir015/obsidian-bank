import { expect, test } from '@playwright/test'
import { DemoBackend } from './support/demoBackend'

test('the demo sign-in, money, budget, and card journeys work without a live backend', async ({ page }, testInfo) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await expect(page.getByRole('heading', { name: 'A calm place for your money.' })).toBeVisible()
  await page.getByRole('button', { name: 'Explore the demo' }).click()
  await expect(page.getByRole('heading', { name: 'Total available' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Everyday Checking' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('overview-available-balances.png') })

  await page.getByRole('link', { name: 'Transfer' }).first().click()
  await expect(page.getByRole('heading', { name: 'Move money' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('transfer-available-balances.png') })
  await page.getByLabel('Amount').fill('25.50')
  await page.getByRole('button', { name: 'Move money' }).click()
  await expect(page.getByRole('status')).toContainText('Moved $25.50 to Obsidian Vault')
  expect(backend.accounts[0].available_balance_cents).toBe(1261505)
  expect(backend.accounts[0].ledger_balance_cents).toBe(1391344)
  expect(backend.accounts[1].available_balance_cents).toBe(3559802)
  expect(backend.accounts[1].ledger_balance_cents).toBe(3559802)
  await page.getByRole('link', { name: 'Back to overview' }).click()
  await expect(page.getByText('$12,615.05').last()).toBeVisible()
  await expect(page.getByText('$35,598.02').last()).toBeVisible()

  await page.getByRole('link', { name: 'Budgets' }).first().click()
  const corporate = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Corporate' }) })
  await corporate.getByRole('button', { name: 'Set budget' }).click()
  await page.getByLabel('Monthly limit for Corporate').fill('1500')
  await corporate.getByRole('button', { name: 'Save limit' }).click()
  await expect(corporate).toContainText('$1,500.00')
  await corporate.getByRole('button', { name: 'Edit limit' }).click()
  await page.getByLabel('Monthly limit for Corporate').fill('1750')
  await corporate.getByRole('button', { name: 'Save limit' }).click()
  await expect(corporate).toContainText('$1,750.00')
  expect(backend.budgets.find((budget) => budget.category === 'corporate')?.limit_cents).toBe(175000)

  await page.getByRole('link', { name: 'Cards' }).first().click()
  await expect(page.locator('[data-card-visual="static"]')).toBeVisible()
  await expect(page.locator('[data-card-visual="static"]')).toHaveAttribute('data-face', 'front')
  await page.getByRole('button', { name: 'Show back' }).click()
  await expect(page.locator('[data-card-visual="static"]')).toHaveAttribute('data-face', 'back')
  await page.getByRole('button', { name: 'Show front' }).click()
  await expect(page.locator('[data-card-visual="static"]')).toHaveAttribute('data-face', 'front')

  await page.getByRole('button', { name: 'Freeze card' }).click()
  const cardSettings = page.getByRole('region', { name: 'Black card ending in 4821 settings' })
  await expect(cardSettings.getByText('Frozen: new payments are declined.')).toBeVisible()
  expect(backend.cards[0].is_frozen).toBe(true)
  await page.getByRole('button', { name: 'Unfreeze card' }).click()
  await expect(cardSettings.getByText('Active')).toBeVisible()
  expect(backend.cards[0].is_frozen).toBe(false)

  await page.getByRole('button', { name: 'Change limit' }).click()
  await page.getByLabel('New credit limit').fill('20000')
  await page.getByRole('button', { name: 'Save limit' }).click()
  await expect(page.getByRole('status')).toContainText('Limit updated to $20,000.00')
  expect(backend.cards[0].limit_cents).toBe(2000000)
  expect(backend.unexpectedRequests).toEqual([])
})

test('reduced motion uses the static card and flips it without animation', async ({ page }) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await page.getByRole('button', { name: 'Explore the demo' }).click()
  await page.getByRole('link', { name: 'Cards' }).first().click()

  const card = page.locator('[data-card-visual="static"]')
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('data-face', 'front')
  await page.getByRole('button', { name: 'Show back' }).click()
  await expect(card).toHaveAttribute('data-face', 'back')
  expect(backend.unexpectedRequests).toEqual([])
})

test('Help opens the user guide and leaves the mobile tab bar unchanged', async ({ page }) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await page.getByRole('button', { name: 'Explore the demo' }).click()

  const helpLinks = page.getByRole('link', { name: 'Help (opens in a new tab)' })
  await expect(helpLinks).toHaveCount(1)
  await expect(helpLinks.first()).toHaveAttribute(
    'href',
    'https://github.com/zSamir015/obsidian-bank/blob/main/docs/USER_GUIDE.md',
  )
  await expect(helpLinks.first()).toHaveAttribute('target', '_blank')
  await expect(helpLinks.first()).toHaveAttribute('rel', 'noopener noreferrer')

  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(helpLinks.first()).toBeVisible()

  await page.setViewportSize({ width: 375, height: 812 })
  await expect(helpLinks).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Main' }).last().getByRole('link')).toHaveCount(5)
  expect(backend.unexpectedRequests).toEqual([])
})
