import { DemoBackend } from './support/demoBackend'
import { expect, test } from './support/i18n'

const FULL_ACCOUNT_NUMBER = '000123456789'

test('an external transfer keeps only the last four digits and stays pending', async ({ page, t }) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await page.getByRole('button', { name: t.login.start }).click()
  await expect(page.getByRole('heading', { name: t.overview.totalAvailable })).toBeVisible()

  await page.getByRole('link', { name: t.nav.transfer }).first().click()
  await expect(page.getByRole('heading', { name: t.transfer.title })).toBeVisible()
  await page.getByText(t.transfer.externalMode).click()
  await expect(page.getByRole('radio', { name: t.transfer.externalMode })).toBeChecked()
  await expect(page.getByRole('note')).toContainText(t.transfer.demoNotice)

  const accountNumber = page.getByRole('textbox', { name: t.transfer.accountNumber, exact: true })
  await page.getByLabel(t.transfer.recipientName).fill('Ada Lovelace')
  await page.getByLabel(t.transfer.routingNumber).fill('021000022')
  await accountNumber.fill(FULL_ACCOUNT_NUMBER)
  await accountNumber.blur()
  await expect(accountNumber).toHaveValue(t.transfer.endingIn('6789'))
  await page.getByLabel(t.transfer.amount).fill('125.50')
  await page.getByRole('button', { name: t.transfer.submitExternal }).click()
  await expect(page.getByText(t.validation.routingChecksum)).toBeVisible()

  await page.getByLabel(t.transfer.routingNumber).fill('021000021')
  await page.getByRole('button', { name: t.transfer.submitExternal }).click()
  const status = page.getByRole('status')
  await expect(status).toContainText(t.transfer.sent('$125.50', 'Ada Lovelace'))
  await expect(status).toContainText(`${t.transfer.sentAccount} 6789, ${t.transfer.sentRouting} 021000021.`)
  await expect(status).toContainText(t.transfer.sentDetail)
  expect(backend.accounts[0].available_balance_cents).toBe(1264055 - 12550)
  expect(backend.accounts[0].ledger_balance_cents).toBe(1393894)

  await page.getByRole('link', { name: t.app.viewActivity }).click()
  const row = page.getByRole('listitem').filter({ hasText: 'Ada Lovelace ••6789' })
  await expect(row).toContainText(t.statuses.pending)

  expect(backend.requestBodies.some((body) => body.includes(FULL_ACCOUNT_NUMBER))).toBe(false)
  expect(backend.requestBodies.some((body) => body.includes('"p_account_last4":"6789"'))).toBe(true)
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
  expect(stored).not.toContain(FULL_ACCOUNT_NUMBER)
  expect(backend.unexpectedRequests).toEqual([])
})
