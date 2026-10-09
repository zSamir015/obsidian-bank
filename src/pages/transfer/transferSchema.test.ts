import { describe, expect, it } from 'vitest'
import type { Account, Cents } from '@/types/bank'
import { makeTransferSchema } from './transferSchema'

const account = (id: string, balance: number, type: Account['type']): Account => ({
  id,
  name: id,
  type,
  balance: balance as Cents,
  currency: 'USD',
  apyBps: 0,
  createdAt: '',
})
const accounts = [account('a', 10_000, 'checking'), account('b', 0, 'vault')]
const schema = makeTransferSchema(accounts)
const valid = { fromId: 'a', toId: 'b', amount: '25.50', description: 'Monthly savings' }

function issuePaths(values: typeof valid) {
  const result = schema.safeParse(values)
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'))
}

describe('transfer schema', () => {
  it('accepts a valid transfer', () => {
    expect(schema.safeParse(valid).success).toBe(true)
  })

  it('rejects transfers to the same account', () => {
    expect(issuePaths({ ...valid, toId: 'a' })).toContain('toId')
  })

  it.each(['0', '0.00', 'abc', '-3', '1.999', '25,50'])('rejects invalid amount %j', (amount) => {
    expect(issuePaths({ ...valid, amount })).toContain('amount')
  })

  it('rejects amounts above the available balance', () => {
    expect(issuePaths({ ...valid, amount: '100.01' })).toContain('amount')
    expect(issuePaths({ ...valid, amount: '100' })).toEqual([])
  })
})
