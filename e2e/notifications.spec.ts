import { expect, test, type Page } from '@playwright/test'
import { DemoBackend } from './support/demoBackend'

/** TanStack Query refetches notifications when the tab becomes visible again. */
const returnToTab = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))

test('a payment moved to Under review shows up as a notification', async ({ page }) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await page.getByRole('button', { name: 'Explore the demo' }).click()
  await expect(page.getByRole('heading', { name: 'Total available' })).toBeVisible()

  // The seeded review charge already has its notification.
  const bell = page.getByRole('link', { name: /^Notifications/ }).first()
  await expect(bell).toHaveAccessibleName('Notifications, 1 unread')

  // The server moves a pending card payment to review; the app hears about it on the next check.
  backend.flag('Uber')
  await returnToTab(page)
  await expect(bell).toHaveAccessibleName('Notifications, 2 unread')

  await page.getByRole('link', { name: 'Activity' }).first().click()
  const uber = page.getByRole('listitem').filter({ hasText: 'Uber' })
  await expect(uber).toContainText('Under review')

  await bell.click()
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.first()).toHaveText(/^\$89\.40 at Uber on the card ending in 4821 is under review\./)
  await expect(items.first()).toContainText('Unread')

  await page.getByRole('button', { name: 'Mark all as read' }).click()
  await expect(page.getByRole('status')).toHaveText('All notifications marked as read.')
  await expect(bell).toHaveAccessibleName('Notifications')
  await expect(page.getByText('0 unread')).toBeVisible()
  expect(backend.notifications.every((row) => row.read_at !== null)).toBe(true)

  // Nothing but merchant, amount and last four digits travels with a notification.
  for (const row of backend.notifications) {
    expect(Object.keys(row).sort()).toEqual(['amount_cents', 'card_last4', 'created_at', 'id', 'merchant', 'read_at'])
  }
  expect(backend.unexpectedRequests).toEqual([])
})
