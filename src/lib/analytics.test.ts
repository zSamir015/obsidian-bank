import { describe, expect, it } from 'vitest'
import type { Budget, Cents, Transaction } from '@/types/bank'
import {
  cashflowThisMonth,
  filterTransactions,
  spendingAgainstBudgets,
  spendingByCategory,
  type TransactionFilters,
} from './analytics'

const now = new Date().toISOString()
const lastYear = new Date(new Date().getFullYear() - 1, 0, 15).toISOString()

function tx(overrides: Partial<Omit<Transaction, 'amount'>> & { amount?: number }): Transaction {
  return {
    id: crypto.randomUUID(),
    accountId: 'a',
    date: now,
    merchant: 'Amazon Web Services',
    category: 'corporate',
    status: 'completed',
    type: 'debit',
    transferId: null,
    ...overrides,
    amount: (overrides.amount ?? 1000) as Cents,
  }
}

const all: TransactionFilters = { search: '', category: 'all', flow: 'all', accountId: 'all' }

describe('spendingByCategory', () => {
  it("sums this month's debits per category, largest first, ignoring credits and old months", () => {
    const result = spendingByCategory([
      tx({ amount: 1000 }),
      tx({ amount: 500 }),
      tx({ category: 'travel', amount: 4000 }),
      tx({ category: 'payroll', type: 'credit', amount: 412500 }),
      tx({ amount: 7777, date: lastYear }),
    ])
    expect(result.map((r) => [r.category, r.cents])).toEqual([
      ['travel', 4000],
      ['corporate', 1500],
    ])
  })
})

describe('transfers between own accounts', () => {
  const transferLegs = [
    tx({ category: 'transfer', type: 'debit', amount: 50000, transferId: 'x' }),
    tx({ category: 'transfer', type: 'credit', amount: 50000, transferId: 'x' }),
  ]

  it('are not counted as spending', () => {
    expect(spendingByCategory([tx({ amount: 1000 }), ...transferLegs])).toEqual([
      { category: 'corporate', cents: 1000 },
    ])
  })

  it('are not counted as income or spending in the monthly cashflow', () => {
    expect(
      cashflowThisMonth([
        tx({ amount: 1000 }),
        tx({ category: 'payroll', type: 'credit', amount: 412500 }),
        ...transferLegs,
      ]),
    ).toEqual({ income: 412500, spending: 1000 })
  })
})

describe('cashflowThisMonth', () => {
  it('ignores previous months and is zero for no activity', () => {
    expect(cashflowThisMonth([tx({ date: lastYear })])).toEqual({ income: 0, spending: 0 })
  })
})

describe('filterTransactions', () => {
  const list = [
    tx({ merchant: 'Amazon Web Services' }),
    tx({
      merchant: 'Payroll — Obsidian Labs Inc.',
      category: 'payroll',
      type: 'credit',
      amount: 412500,
      accountId: 'b',
    }),
    tx({ merchant: 'Delta Air Lines', category: 'travel' }),
  ]

  it('returns everything with no filters', () => {
    expect(filterTransactions(list, all)).toHaveLength(3)
  })

  it('searches merchants case-insensitively', () => {
    expect(filterTransactions(list, { ...all, search: '  DELTA ' }).map((t) => t.merchant)).toEqual(['Delta Air Lines'])
  })

  it('filters by flow, category and account', () => {
    expect(filterTransactions(list, { ...all, flow: 'in' })).toHaveLength(1)
    expect(filterTransactions(list, { ...all, flow: 'out' })).toHaveLength(2)
    expect(filterTransactions(list, { ...all, category: 'travel' })).toHaveLength(1)
    expect(filterTransactions(list, { ...all, accountId: 'b' })).toHaveLength(1)
  })
})

describe('spendingAgainstBudgets', () => {
  const budget = (category: Budget['category'], limit: number): Budget => ({
    id: category,
    category,
    limit: limit as Cents,
  })

  it('pairs spending with its budget, including budgeted categories with nothing spent yet', () => {
    const result = spendingAgainstBudgets(
      [tx({ category: 'travel', amount: 9000 }), tx({ category: 'corporate', amount: 500 })],
      [budget('travel', 10000), budget('services', 8000)],
    )
    expect(result).toEqual([
      { category: 'travel', spent: 9000, limit: 10000, ratio: 0.9 },
      { category: 'corporate', spent: 500, limit: null, ratio: null },
      { category: 'services', spent: 0, limit: 8000, ratio: 0 },
    ])
  })

  it('never includes transfers', () => {
    const result = spendingAgainstBudgets([tx({ category: 'transfer', amount: 5000, transferId: 'x' })], [])
    expect(result).toEqual([])
  })
})
