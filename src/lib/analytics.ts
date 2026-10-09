import { isInCurrentMonth } from './dates'
import { CATEGORY_LABELS, type Category, type Transaction } from './types'

export function spendingByCategory(transactions: Transaction[]) {
  const totals = new Map<Category, number>()
  for (const t of transactions) {
    if (t.amount_cents >= 0 || t.category === 'transfer' || !isInCurrentMonth(t.created_at)) continue
    totals.set(t.category, (totals.get(t.category) ?? 0) - t.amount_cents)
  }
  return [...totals]
    .map(([category, cents]) => ({ category, label: CATEGORY_LABELS[category], cents }))
    .sort((a, b) => b.cents - a.cents)
}

export type FlowFilter = 'all' | 'in' | 'out'

export interface TransactionFilters {
  search: string
  category: Category | 'all'
  flow: FlowFilter
  accountId: string | 'all'
}

export function filterTransactions(transactions: Transaction[], filters: TransactionFilters) {
  const search = filters.search.trim().toLowerCase()
  return transactions.filter(
    (t) =>
      (filters.category === 'all' || t.category === filters.category) &&
      (filters.accountId === 'all' || t.account_id === filters.accountId) &&
      (filters.flow === 'all' || (filters.flow === 'in' ? t.amount_cents > 0 : t.amount_cents < 0)) &&
      (!search || t.description.toLowerCase().includes(search)),
  )
}
