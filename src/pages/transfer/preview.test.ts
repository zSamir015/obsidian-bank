import { describe, expect, it } from 'vitest'
import { toAccount } from '@/lib/mappers'
import { accountRows } from '@/test/fixtures'
import { transferPreview } from './preview'

const [checking, vault] = accountRows.map(toAccount) as [ReturnType<typeof toAccount>, ReturnType<typeof toAccount>]
const accounts = [checking, vault]

describe('transferPreview', () => {
  it('shows both balances after a valid amount', () => {
    expect(transferPreview(accounts, checking.id, vault.id, '25.50')).toEqual({
      from: {
        name: 'Everyday Checking',
        availableAfter: 1264055 - 2550,
        ledgerAfter: 1393894 - 2550,
      },
      to: {
        name: 'Obsidian Vault',
        availableAfter: 3557252 + 2550,
        ledgerAfter: 3557252 + 2550,
        apyBps: 425,
      },
      amount: 2550,
    })
  })

  it('previews current balances while the amount is empty or invalid', () => {
    for (const text of ['', '1.999', 'abc']) {
      expect(transferPreview(accounts, checking.id, vault.id, text)).toMatchObject({
        from: { availableAfter: 1264055, ledgerAfter: 1393894 },
        to: { availableAfter: 3557252, ledgerAfter: 3557252 },
        amount: null,
      })
    }
  })

  it('returns null until two different accounts are chosen', () => {
    expect(transferPreview(accounts, checking.id, checking.id, '10')).toBeNull()
    expect(transferPreview(accounts, '', vault.id, '10')).toBeNull()
  })
})
