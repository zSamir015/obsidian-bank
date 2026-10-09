const RPC_ERRORS: Record<string, string> = {
  insufficient_funds: 'Saldo insuficiente en la cuenta de origen.',
  same_account: 'La cuenta de origen y destino no pueden ser la misma.',
  invalid_amount: 'El importe no es válido.',
  account_not_found: 'Cuenta no encontrada.',
  not_authenticated: 'Tu sesión ha caducado. Vuelve a entrar.',
}

export function toFriendlyMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const known = Object.keys(RPC_ERRORS).find((code) => message.includes(code))
  return known ? RPC_ERRORS[known]! : 'Algo ha fallado. Inténtalo de nuevo.'
}
