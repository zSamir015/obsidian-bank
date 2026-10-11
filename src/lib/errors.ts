// Maps server error codes (transfer_funds, create_external_transfer, freeze_card, update_card_limit) to messages that
// say what happened and how to fix it.
const RPC_ERRORS: Record<string, string> = {
  insufficient_funds:
    "The source account doesn't have enough available money for this transfer. Pending and under-review payments are already set aside.",
  same_account: 'Choose two different accounts.',
  invalid_amount: 'Enter an amount greater than $0.00.',
  account_not_found: "One of these accounts isn't available anymore. Reload and try again.",
  card_not_found: "This card isn't available anymore. Reload and try again.",
  limit_out_of_range: 'Choose a limit between $500 and $100,000.',
  limit_not_whole_dollars: 'Use whole dollars for the limit, like 15000.',
  limit_below_spent: "The limit can't be lower than what's already been spent on this card.",
  invalid_request: 'Something was missing from the request. Reload and try again.',
  invalid_routing_number:
    "That routing number isn't valid. Check the 9 digits printed on the recipient's checks or statement.",
  invalid_account_number: 'Enter the recipient’s account number again, 4 to 17 digits.',
  invalid_recipient: "Enter the recipient's name, up to 70 characters.",
  invalid_note: 'Keep the note under 140 characters.',
  per_transfer_limit: 'External transfers are limited to $10,000.00 each.',
  daily_limit_exceeded: 'This would take you over the $25,000.00 limit for external transfers in 24 hours.',
  not_authenticated: 'Your session ended. Sign in again to continue.',
}

export function toFriendlyMessage(error: unknown, action = 'complete the transfer'): string {
  const message = error instanceof Error ? error.message : String(error)
  const known = Object.keys(RPC_ERRORS).find((code) => message.includes(code))
  return known ? RPC_ERRORS[known]! : `Couldn't ${action}. Check your connection and try again.`
}
