import { CATEGORY_LABELS, STATUS_LABELS } from './labels'
import type { Transaction } from '@/types/bank'

const HEADERS = ['date', 'merchant', 'category', 'account', 'type', 'amount', 'status', 'note'] as const

/** Lets Excel detect UTF-8, so accents and em dashes survive the import. */
const UTF8_BOM = '\uFEFF'

function neutralizeFormula(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}

function quote(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function textCell(value: string): string {
  return quote(neutralizeFormula(value))
}

function signedAmount(transaction: Transaction): string {
  const sign = transaction.type === 'debit' ? '-' : '+'
  const absoluteCents = Math.abs(transaction.amount)
  return `${sign}${Math.trunc(absoluteCents / 100)}.${String(absoluteCents % 100).padStart(2, '0')}`
}

function statusLabel(status: Transaction['status']): string {
  return status === 'completed' ? 'Completed' : STATUS_LABELS[status]
}

export function transactionsToCsv(
  transactions: readonly Transaction[],
  accountNames: ReadonlyMap<string, string>,
): string {
  const rows = transactions.map((transaction) => {
    const isTransfer = transaction.category === 'transfer'
    return [
      textCell(new Date(transaction.date).toISOString()),
      textCell(isTransfer ? '' : transaction.merchant),
      textCell(CATEGORY_LABELS[transaction.category]),
      textCell(accountNames.get(transaction.accountId) ?? transaction.accountId),
      textCell(transaction.type),
      // Generated as /^[+-]\d+\.\d{2}$/, so it stays a number in spreadsheets.
      quote(signedAmount(transaction)),
      textCell(statusLabel(transaction.status)),
      textCell(isTransfer ? transaction.merchant : ''),
    ].join(',')
  })

  return UTF8_BOM + [HEADERS.map(textCell).join(','), ...rows].join('\r\n') + '\r\n'
}

export function downloadCsv(filename: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
