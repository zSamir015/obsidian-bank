import { describe, expect, it } from 'vitest'
import { toFriendlyMessage } from './errors'

describe('toFriendlyMessage', () => {
  it.each([
    ['insufficient_funds', "The source account doesn't have enough money for this transfer."],
    ['same_account', 'Choose two different accounts.'],
    ['invalid_amount', 'Enter an amount greater than $0.00.'],
    ['account_not_found', "One of these accounts isn't available anymore. Reload and try again."],
    ['not_authenticated', 'Your session ended. Sign in again to continue.'],
  ])('explains %s and how to fix it', (code, message) => {
    expect(toFriendlyMessage(new Error(`P0001: ${code}`))).toBe(message)
  })

  it('falls back to a generic, actionable message', () => {
    expect(toFriendlyMessage(new Error('fetch failed'))).toBe(
      "Couldn't complete the transfer. Check your connection and try again.",
    )
  })
})
