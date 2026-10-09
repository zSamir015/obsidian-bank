import { describe, expect, it } from 'vitest'
import type { Tables } from '@/types/database'
import { toAccount, toBudget, toCard, toTransaction } from './mappers'

describe('toAccount', () => {
  const row: Tables<'accounts'> = {
    id: 'a1',
    user_id: 'u1',
    name: 'Obsidian Vault',
    kind: 'vault',
    balance_cents: 2_500_000,
    currency: 'USD',
    apy_bps: 425,
    created_at: '2026-10-01T00:00:00Z',
  }

  it('maps a database row to the domain account', () => {
    expect(toAccount(row)).toEqual({
      id: 'a1',
      name: 'Obsidian Vault',
      type: 'vault',
      balance: 2_500_000,
      currency: 'USD',
      apyBps: 425,
      createdAt: '2026-10-01T00:00:00Z',
    })
  })

  it.each([
    ['kind', 'savings'],
    ['currency', 'EUR'],
    ['balance_cents', 10.5],
  ])('rejects an unexpected %s', (key, value) => {
    expect(() => toAccount({ ...row, [key]: value })).toThrow()
  })
})

describe('toTransaction', () => {
  const row: Tables<'transactions'> = {
    id: 't1',
    user_id: 'u1',
    account_id: 'a1',
    amount_cents: 8940,
    type: 'debit',
    status: 'pending',
    category: 'travel',
    description: 'Uber',
    transfer_id: null,
    created_at: '2026-10-09T08:00:00Z',
  }

  it('maps a database row to the domain transaction', () => {
    expect(toTransaction(row)).toEqual({
      id: 't1',
      accountId: 'a1',
      date: '2026-10-09T08:00:00Z',
      merchant: 'Uber',
      amount: 8940,
      category: 'travel',
      status: 'pending',
      type: 'debit',
      transferId: null,
    })
  })

  it.each([
    ['amount_cents', 0],
    ['amount_cents', -100],
    ['type', 'refund'],
    ['status', 'void'],
    ['category', 'groceries'],
  ])('rejects %s = %j', (key, value) => {
    expect(() => toTransaction({ ...row, [key]: value })).toThrow()
  })
})

describe('toCard', () => {
  const row: Tables<'cards'> = {
    id: 'c1',
    user_id: 'u1',
    account_id: 'a1',
    card_holder: 'OBSIDIAN MEMBER',
    last4: '4242',
    expiry: '10/29',
    tier: 'black',
    limit_cents: 5_000_000,
    spent_cents: 1_284_750,
    is_frozen: false,
    created_at: '2026-10-01T00:00:00Z',
  }

  it('maps a database row to the domain card', () => {
    expect(toCard(row)).toEqual({
      id: 'c1',
      accountId: 'a1',
      cardHolder: 'OBSIDIAN MEMBER',
      last4: '4242',
      expiry: '10/29',
      limit: 5_000_000,
      spent: 1_284_750,
      tier: 'black',
      isFrozen: false,
    })
  })

  it.each([
    ['last4', '4242424242424242'],
    ['tier', 'gold'],
  ])('rejects %s = %j', (key, value) => {
    expect(() => toCard({ ...row, [key]: value })).toThrow()
  })
})

describe('toBudget', () => {
  it('maps a database row to the domain budget', () => {
    expect(toBudget({ id: 'b1', user_id: 'u1', category: 'services', limit_cents: 80_000 })).toEqual({
      id: 'b1',
      category: 'services',
      limit: 80_000,
    })
  })

  it('rejects a transfer budget', () => {
    expect(() => toBudget({ id: 'b1', user_id: 'u1', category: 'transfer', limit_cents: 1 })).toThrow()
  })
})
