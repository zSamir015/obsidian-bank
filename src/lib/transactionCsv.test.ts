import { describe, expect, it } from 'vitest'
import { toTransaction } from './mappers'
import { transactionsToCsv } from './transactionCsv'
import { transactionRows } from '@/test/fixtures'

describe('transactionsToCsv', () => {
  it('writes the required columns, signed decimal amounts, account name, ISO date, and status', () => {
    const rows = transactionRows.slice(0, 2).map(toTransaction)
    const csv = transactionsToCsv(rows, new Map([[rows[0]!.accountId, 'Everyday Checking']]))

    expect(csv).toBe(
      '\uFEFF' +
        [
          '"date","merchant","category","account","type","amount","status","note"',
          `"${rows[0]!.date}","Uber","Travel","Everyday Checking","debit","-89.40","Pending",""`,
          `"${rows[1]!.date}","Amazon Web Services","Corporate","Everyday Checking","debit","-219.00","Pending",""`,
          '',
        ].join('\r\n'),
    )
  })

  it('starts with a UTF-8 byte order mark and keeps non-ASCII text intact', () => {
    const csv = transactionsToCsv([toTransaction(transactionRows[4]!)], new Map())

    expect(csv.startsWith('\uFEFF"date"')).toBe(true)
    expect(csv.indexOf('\uFEFF')).toBe(csv.lastIndexOf('\uFEFF'))
    expect(csv).toContain('"Payroll — Obsidian Labs Inc."')
  })

  it('keeps credit and debit amounts numeric, with a sign and two decimals', () => {
    const credit = toTransaction({ ...transactionRows[4]!, amount_cents: 412_505 })
    const debit = toTransaction({ ...transactionRows[0]!, amount_cents: 7 })

    const csv = transactionsToCsv([credit, debit], new Map())
    expect(csv).toContain('"credit","+4125.05"')
    expect(csv).toContain('"debit","-0.07"')
    expect(csv).not.toMatch(/"'[+-]\d/)
  })

  it('escapes quotes and neutralizes formula-leading text', () => {
    const transaction = toTransaction({
      ...transactionRows[0]!,
      description: '="merchant", "name"',
    })

    expect(transactionsToCsv([transaction], new Map())).toContain(`"'=""merchant"", ""name"""`)
  })

  it('exports a transfer description as a note rather than a merchant', () => {
    const transaction = toTransaction({
      ...transactionRows[0]!,
      category: 'transfer',
      description: 'Monthly savings',
    })

    expect(transactionsToCsv([transaction], new Map())).toContain(
      `"${transaction.date}","","Transfer","${transaction.accountId}","debit","-89.40","Pending","Monthly savings"`,
    )
  })

  it('neutralizes merchant values beginning with every spreadsheet formula prefix', () => {
    const rows = ['=SUM(A1:A2)', '+1', '-1', '@command'].map((description, index) =>
      toTransaction({
        ...transactionRows[0]!,
        id: `formula-${index}`,
        description,
      }),
    )

    const csv = transactionsToCsv(rows, new Map())
    expect(csv).toContain(`"'=SUM(A1:A2)"`)
    expect(csv).toContain(`"'+1"`)
    expect(csv).toContain(`"'-1"`)
    expect(csv).toContain(`"'@command"`)
  })

  it('neutralizes formula-leading account names and transfer notes', () => {
    const transaction = toTransaction({
      ...transactionRows[0]!,
      category: 'transfer',
      description: '@SUM(1+1)',
    })

    const csv = transactionsToCsv([transaction], new Map([[transaction.accountId, '=HYPERLINK("x")']]))
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`)
    expect(csv).toContain(`"'@SUM(1+1)"`)
  })
})
