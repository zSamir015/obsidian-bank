import { expect, test } from '@playwright/test'
import { DemoBackend } from './support/demoBackend'

const FULL_ACCOUNT_NUMBER = '000123456789'

test('an external transfer keeps only the last four digits and stays pending', async ({ page }) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await page.getByRole('button', { name: 'Explore the demo' }).click()
  await expect(page.getByRole('heading', { name: 'Total available' })).toBeVisible()

  await page.getByRole('link', { name: 'Transfer' }).first().click()
  await expect(page.getByRole('heading', { name: 'Move money' })).toBeVisible()
  await page.getByText('To another bank').click()
  await expect(page.getByRole('radio', { name: 'To another bank' })).toBeChecked()
  await expect(page.getByRole('note')).toContainText("doesn't connect to ACH, Fedwire or any other payment network")

  const accountNumber = page.getByRole('textbox', { name: 'Account number', exact: true })
  await page.getByLabel('Recipient name').fill('Ada Lovelace')
  await page.getByLabel('Routing number').fill('021000022')
  await accountNumber.fill(FULL_ACCOUNT_NUMBER)
  await accountNumber.blur()
  await expect(accountNumber).toHaveValue('Ending in 6789')
  await page.getByLabel('Amount').fill('125.50')
  await page.getByRole('button', { name: 'Send transfer' }).click()
  await expect(page.getByText("That isn't a valid US routing number. Check the 9 digits.")).toBeVisible()

  await page.getByLabel('Routing number').fill('021000021')
  await page.getByRole('button', { name: 'Send transfer' }).click()
  const status = page.getByRole('status')
  await expect(status).toContainText('Sent $125.50 to Ada Lovelace')
  await expect(status).toContainText('Account ending 6789, routing number 021000021.')
  await expect(status).toContainText("It's pending")
  expect(backend.accounts[0].available_balance_cents).toBe(1264055 - 12550)
  expect(backend.accounts[0].ledger_balance_cents).toBe(1393894)

  await page.getByRole('link', { name: 'View activity' }).click()
  const row = page.getByRole('listitem').filter({ hasText: 'Ada Lovelace ••6789' })
  await expect(row).toContainText('Pending')

  expect(backend.requestBodies.some((body) => body.includes(FULL_ACCOUNT_NUMBER))).toBe(false)
  expect(backend.requestBodies.some((body) => body.includes('"p_account_last4":"6789"'))).toBe(true)
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
  expect(stored).not.toContain(FULL_ACCOUNT_NUMBER)
  expect(backend.unexpectedRequests).toEqual([])
})
