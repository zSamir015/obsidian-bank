// Transfers between the user's own accounts move money but are neither income nor spending.
import type { BudgetCategory, Category, Cents, Transaction } from '@/types/bank'
import { isInCurrentMonth } from './dates'

const isMonthlyFlow = (t: Transaction) => t.category !== 'transfer' && isInCurrentMonth(t.date)

export interface CategorySpending {
  readonly category: BudgetCategory
  readonly cents: Cents
}

export function spendingByCategory(transactions: readonly Transaction[]): CategorySpending[] {
  const totals = new Map<BudgetCategory, number>()
  for (const t of transactions) {
    if (t.type !== 'debit' || t.category === 'transfer' || !isMonthlyFlow(t)) continue
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount)
  }
  return [...totals].map(([category, cents]) => ({ category, cents: cents as Cents })).sort((a, b) => b.cents - a.cents)
}

export function cashflowThisMonth(transactions: readonly Transaction[]): {
  readonly income: Cents
  readonly spending: Cents
} {
  let income = 0
  let spending = 0
  for (const t of transactions) {
    if (!isMonthlyFlow(t)) continue
    if (t.type === 'credit') income += t.amount
    else spending += t.amount
  }
  return { income: income as Cents, spending: spending as Cents }
}

export type FlowFilter = 'all' | 'in' | 'out'

export interface TransactionFilters {
  readonly search: string
  readonly category: Category | 'all'
  readonly flow: FlowFilter
  readonly accountId: string | 'all'
}

export function filterTransactions(transactions: readonly Transaction[], filters: TransactionFilters): Transaction[] {
  const search = filters.search.trim().toLowerCase()
  return transactions.filter(
    (t) =>
      (filters.category === 'all' || t.category === filters.category) &&
      (filters.accountId === 'all' || t.accountId === filters.accountId) &&
      (filters.flow === 'all' || t.type === (filters.flow === 'in' ? 'credit' : 'debit')) &&
      (!search || t.merchant.toLowerCase().includes(search)),
  )
}
