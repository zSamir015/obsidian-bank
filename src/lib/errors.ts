// Maps server error codes (transfer_funds, freeze_card, update_card_limit) to messages that
// say what happened and how to fix it.
const RPC_ERRORS: Record<string, string> = {
  insufficient_funds: "The source account doesn't have enough money for this transfer.",
  same_account: 'Choose two different accounts.',
  invalid_amount: 'Enter an amount greater than $0.00.',
  account_not_found: "One of these accounts isn't available anymore. Reload and try again.",
  card_not_found: "This card isn't available anymore. Reload and try again.",
  limit_out_of_range: 'Choose a limit between $500 and $100,000.',
  limit_not_whole_dollars: 'Use whole dollars for the limit, like 15000.',
  limit_below_spent: "The limit can't be lower than what's already been spent on this card.",
  invalid_request: 'Something was missing from the request. Reload and try again.',
  not_authenticated: 'Your session ended. Sign in again to continue.',
}

export function toFriendlyMessage(error: unknown, action = 'complete the transfer'): string {
  const message = error instanceof Error ? error.message : String(error)
  const known = Object.keys(RPC_ERRORS).find((code) => message.includes(code))
  return known ? RPC_ERRORS[known]! : `Couldn't ${action}. Check your connection and try again.`
}
