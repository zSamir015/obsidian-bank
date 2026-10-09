import { describe, expect, it } from 'vitest'
import type { Account } from '../lib/types'
import { makeTransferSchema } from './transferSchema'

const accounts: Account[] = [
  { id: 'a', name: 'Corriente', kind: 'checking', balance_cents: 10_000, currency: 'EUR', created_at: '' },
  { id: 'b', name: 'Ahorro', kind: 'savings', balance_cents: 0, currency: 'EUR', created_at: '' },
]
const schema = makeTransferSchema(accounts)
const valid = { fromId: 'a', toId: 'b', amount: '25,50', description: 'Ahorro mensual' }

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

  it.each(['0', 'abc', '-3', '1,999'])('rejects invalid amount %j', (amount) => {
    expect(issuePaths({ ...valid, amount })).toContain('amount')
  })

  it('rejects amounts above the available balance', () => {
    expect(issuePaths({ ...valid, amount: '100,01' })).toContain('amount')
    expect(issuePaths({ ...valid, amount: '100' })).toEqual([])
  })
})
