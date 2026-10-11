// Transfers between the user's own accounts move money but are neither income nor spending.
// External transfers are money out, but they have no budget category.
import {
  isBudgetCategory,
  type Budget,
  type BudgetCategory,
  type Category,
  type Cents,
  type Transaction,
} from '@/types/bank'
import { isInCurrentMonth } from './dates'

const isMonthlyFlow = (t: Transaction) => t.category !== 'transfer' && isInCurrentMonth(t.date)

export interface CategorySpending {
  readonly category: BudgetCategory
  readonly cents: Cents
}

export function spendingByCategory(transactions: readonly Transaction[]): CategorySpending[] {
  const totals = new Map<BudgetCategory, number>()
  for (const t of transactions) {
    if (t.type !== 'debit' || !isBudgetCategory(t.category) || !isMonthlyFlow(t)) continue
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount)
  }
  return [...totals].map(([category, cents]) => ({ category, cents: cents as Cents })).sort((a, b) => b.cents - a.cents)
}

/** From this share of a budget on, its bar turns white to draw attention. */
export const NEAR_LIMIT_RATIO = 0.9

export interface BudgetProgress {
  readonly category: BudgetCategory
  readonly spent: Cents
  /** null when the category has no budget. */
  readonly limit: Cents | null
  readonly ratio: number | null
}

/** This month's spending per category next to its budget; budgeted categories appear even at $0. */
export function spendingAgainstBudgets(
  transactions: readonly Transaction[],
  budgets: readonly Budget[],
): BudgetProgress[] {
  const spent = new Map(spendingByCategory(transactions).map((s) => [s.category, s.cents]))
  const limits = new Map(budgets.map((b) => [b.category, b.limit]))
  const categories = new Set([...spent.keys(), ...limits.keys()])
  return [...categories]
    .map((category) => {
      const cents = spent.get(category) ?? (0 as Cents)
      const limit = limits.get(category) ?? null
      return { category, spent: cents, limit, ratio: limit === null ? null : cents / limit }
    })
    .sort((a, b) => b.spent - a.spent)
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
