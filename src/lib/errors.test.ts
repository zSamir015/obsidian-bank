import { describe, expect, it } from 'vitest'
import { toFriendlyMessage } from './errors'

describe('toFriendlyMessage', () => {
  it.each([
    [
      'insufficient_funds',
      "The source account doesn't have enough available money for this transfer. Pending and under-review payments are already set aside.",
    ],
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

describe('toFriendlyMessage for card controls', () => {
  it.each([
    ['card_not_found', "This card isn't available anymore. Reload and try again."],
    ['limit_out_of_range', 'Choose a limit between $500 and $100,000.'],
    ['limit_not_whole_dollars', 'Use whole dollars for the limit, like 15000.'],
    ['limit_below_spent', "The limit can't be lower than what's already been spent on this card."],
    ['invalid_request', 'Something was missing from the request. Reload and try again.'],
  ])('explains %s and how to fix it', (code, message) => {
    expect(toFriendlyMessage(new Error(`P0001: ${code}`))).toBe(message)
  })

  it('names the action in the generic fallback', () => {
    expect(toFriendlyMessage(new Error('fetch failed'), 'update the card')).toBe(
      "Couldn't update the card. Check your connection and try again.",
    )
  })
})

describe('toFriendlyMessage for external transfers', () => {
  it.each([
    [
      'invalid_routing_number',
      "That routing number isn't valid. Check the 9 digits printed on the recipient's checks or statement.",
    ],
    ['invalid_account_number', 'Enter the recipient’s account number again, 4 to 17 digits.'],
    ['invalid_recipient', "Enter the recipient's name, up to 70 characters."],
    ['invalid_note', 'Keep the note under 140 characters.'],
    ['per_transfer_limit', 'External transfers are limited to $10,000.00 each.'],
    ['daily_limit_exceeded', 'This would take you over the $25,000.00 limit for external transfers in 24 hours.'],
  ])('explains %s and how to fix it', (code, message) => {
    expect(toFriendlyMessage(new Error(`P0001: ${code}`))).toBe(message)
  })
})
