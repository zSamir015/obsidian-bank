// Maps transfer_funds error codes to messages that say what happened and how to fix it.
const RPC_ERRORS: Record<string, string> = {
  insufficient_funds: "The source account doesn't have enough money for this transfer.",
  same_account: 'Choose two different accounts.',
  invalid_amount: 'Enter an amount greater than $0.00.',
  account_not_found: "One of these accounts isn't available anymore. Reload and try again.",
  not_authenticated: 'Your session ended. Sign in again to continue.',
}

export function toFriendlyMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const known = Object.keys(RPC_ERRORS).find((code) => message.includes(code))
  return known ? RPC_ERRORS[known]! : "Couldn't complete the transfer. Check your connection and try again."
}
