import { DemoBackend } from './support/demoBackend'
import { expect, test, userGuideUrl } from './support/i18n'

test('the demo sign-in, money, budget, and card journeys work without a live backend', async ({
  page,
  t,
}, testInfo) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await expect(page.getByRole('heading', { name: t.login.title })).toBeVisible()
  await page.getByRole('button', { name: t.login.start }).click()
  await expect(page.getByRole('heading', { name: t.overview.totalAvailable })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Everyday Checking' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('overview-available-balances.png') })

  await page.getByRole('link', { name: t.nav.transfer }).first().click()
  await expect(page.getByRole('heading', { name: t.transfer.title })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('transfer-available-balances.png') })
  await page.getByLabel(t.transfer.amount).fill('25.50')
  await page.getByRole('button', { name: t.transfer.submitInternal }).click()
  await expect(page.getByRole('status')).toContainText(t.transfer.moved('$25.50', 'Obsidian Vault'))
  expect(backend.accounts[0].available_balance_cents).toBe(1261505)
  expect(backend.accounts[0].ledger_balance_cents).toBe(1391344)
  expect(backend.accounts[1].available_balance_cents).toBe(3559802)
  expect(backend.accounts[1].ledger_balance_cents).toBe(3559802)
  await page.getByRole('link', { name: t.app.backToOverview }).click()
  await expect(page.getByText('$12,615.05').last()).toBeVisible()
  await expect(page.getByText('$35,598.02').last()).toBeVisible()

  await page.getByRole('link', { name: t.nav.budgets }).first().click()
  const corporate = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: t.categories.corporate }) })
  await corporate.getByRole('button', { name: t.budgets.setBudget }).click()
  await page.getByLabel(t.budgets.limitFor(t.categories.corporate)).fill('1500')
  await corporate.getByRole('button', { name: t.budgets.save }).click()
  await expect(corporate).toContainText('$1,500.00')
  await corporate.getByRole('button', { name: t.budgets.editLimit }).click()
  await page.getByLabel(t.budgets.limitFor(t.categories.corporate)).fill('1750')
  await corporate.getByRole('button', { name: t.budgets.save }).click()
  await expect(corporate).toContainText('$1,750.00')
  expect(backend.budgets.find((budget) => budget.category === 'corporate')?.limit_cents).toBe(175000)

  await page.getByRole('link', { name: t.nav.cards }).first().click()
  await expect(page.locator('[data-card-visual="static"]')).toBeVisible()
  await expect(page.locator('[data-card-visual="static"]')).toHaveAttribute('data-face', 'front')
  await page.getByRole('button', { name: t.cards.showBack }).click()
  await expect(page.locator('[data-card-visual="static"]')).toHaveAttribute('data-face', 'back')
  await page.getByRole('button', { name: t.cards.showFront }).click()
  await expect(page.locator('[data-card-visual="static"]')).toHaveAttribute('data-face', 'front')

  await page.getByRole('button', { name: t.cards.freeze }).click()
  const cardSettings = page.getByRole('region', {
    name: t.cards.settings(t.cards.fullName(t.cardTiers.black, '4821')),
  })
  await expect(cardSettings.getByText(t.cards.frozenStatus)).toBeVisible()
  expect(backend.cards[0].is_frozen).toBe(true)
  await page.getByRole('button', { name: t.cards.unfreeze }).click()
  await expect(cardSettings.getByText(t.cards.active, { exact: true })).toBeVisible()
  expect(backend.cards[0].is_frozen).toBe(false)

  await page.getByRole('button', { name: t.cards.changeLimit }).click()
  await page.getByLabel(t.cards.newLimit).fill('20000')
  await page.getByRole('button', { name: t.cards.save }).click()
  await expect(page.getByRole('status')).toContainText(t.cards.limitUpdated('$20,000.00'))
  expect(backend.cards[0].limit_cents).toBe(2000000)
  expect(backend.unexpectedRequests).toEqual([])
})

test('reduced motion uses the static card and flips it without animation', async ({ page, t }) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await page.getByRole('button', { name: t.login.start }).click()
  await page.getByRole('link', { name: t.nav.cards }).first().click()

  const card = page.locator('[data-card-visual="static"]')
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('data-face', 'front')
  await page.getByRole('button', { name: t.cards.showBack }).click()
  await expect(card).toHaveAttribute('data-face', 'back')
  expect(backend.unexpectedRequests).toEqual([])
})

test('Help opens the user guide and leaves the mobile tab bar unchanged', async ({ page, t, lang }) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await page.getByRole('button', { name: t.login.start }).click()

  const helpLinks = page.getByRole('link', { name: t.nav.helpLabel })
  await expect(helpLinks).toHaveCount(1)
  await expect(helpLinks.first()).toHaveAttribute('href', userGuideUrl[lang])
  await expect(helpLinks.first()).toHaveAttribute('target', '_blank')
  await expect(helpLinks.first()).toHaveAttribute('rel', 'noopener noreferrer')

  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(helpLinks.first()).toBeVisible()

  await page.setViewportSize({ width: 375, height: 812 })
  await expect(helpLinks).toBeVisible()
  await expect(page.getByRole('navigation', { name: t.nav.main }).last().getByRole('link')).toHaveCount(5)
  expect(backend.unexpectedRequests).toEqual([])
})
