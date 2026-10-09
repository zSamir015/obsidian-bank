import { describe, expect, it } from 'vitest'
import { filterTransactions, spendingByCategory, type TransactionFilters } from './analytics'
import type { Transaction } from './types'

const now = new Date().toISOString()
const lastYear = new Date(new Date().getFullYear() - 1, 0, 15).toISOString()

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(),
    account_id: 'a',
    amount_cents: -1000,
    category: 'groceries',
    description: 'Mercadona',
    transfer_id: null,
    created_at: now,
    ...overrides,
  }
}

const all: TransactionFilters = { search: '', category: 'all', flow: 'all', accountId: 'all' }

describe('spendingByCategory', () => {
  it('sums this month expenses per category, largest first, ignoring income, transfers and old months', () => {
    const result = spendingByCategory([
      tx({ amount_cents: -1000 }),
      tx({ amount_cents: -500 }),
      tx({ category: 'dining', amount_cents: -4000 }),
      tx({ category: 'salary', amount_cents: 250000 }),
      tx({ category: 'transfer', amount_cents: -9999 }),
      tx({ amount_cents: -7777, created_at: lastYear }),
    ])
    expect(result.map((r) => [r.category, r.cents])).toEqual([
      ['dining', 4000],
      ['groceries', 1500],
    ])
  })
})

describe('filterTransactions', () => {
  const list = [
    tx({ description: 'Mercadona' }),
    tx({ description: 'Nómina', category: 'salary', amount_cents: 245000, account_id: 'b' }),
    tx({ description: 'Cine Yelmo', category: 'entertainment' }),
  ]

  it('returns everything with no filters', () => {
    expect(filterTransactions(list, all)).toHaveLength(3)
  })

  it('searches descriptions case-insensitively', () => {
    expect(filterTransactions(list, { ...all, search: '  CINE ' }).map((t) => t.description)).toEqual(['Cine Yelmo'])
  })

  it('filters by flow, category and account', () => {
    expect(filterTransactions(list, { ...all, flow: 'in' })).toHaveLength(1)
    expect(filterTransactions(list, { ...all, flow: 'out' })).toHaveLength(2)
    expect(filterTransactions(list, { ...all, category: 'entertainment' })).toHaveLength(1)
    expect(filterTransactions(list, { ...all, accountId: 'b' })).toHaveLength(1)
  })
})
