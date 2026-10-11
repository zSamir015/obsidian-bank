import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { DemoBackend } from './support/demoBackend'

test('Activity exports the filtered transactions as an RFC 4180 CSV download', async ({ page }, testInfo) => {
  const backend = new DemoBackend()
  await backend.route(page)

  await page.goto('')
  await page.getByRole('button', { name: 'Explore the demo' }).click()
  await page.getByRole('link', { name: 'Activity' }).first().click()
  await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search transactions' }).fill('delta')
  await testInfo.attach('activity-export-filtered.png', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const download = await downloadPromise
  const contents = await readFile((await download.path())!, 'utf8')

  expect(download.suggestedFilename()).toMatch(/^transactions-\d{4}-\d{2}-\d{2}\.csv$/)
  expect(contents.split('\r\n')[0]).toBe('\uFEFF"date","merchant","category","account","type","amount","status","note"')
  expect(contents).toContain('"Delta Air Lines","Travel","Everyday Checking","debit","-412.80","Completed",""')
  expect(contents).not.toContain('Uber')
  expect(contents.trim().split('\r\n')).toHaveLength(2)
  expect(backend.unexpectedRequests).toEqual([])
})
