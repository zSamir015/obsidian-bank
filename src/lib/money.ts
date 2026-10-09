// All money is handled as integer cents. Never use floats for amounts.

const formatters = new Map<string, Intl.NumberFormat>()

export function formatCents(cents: number, currency = 'EUR'): string {
  let formatter = formatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency })
    formatters.set(currency, formatter)
  }
  return formatter.format(cents / 100)
}

const AMOUNT_PATTERN = /^(\d{1,9})(?:[.,](\d{1,2}))?$/

/** Parses user input like "12", "12,5" or "12.50" into cents. Returns null if invalid. */
export function parseAmountToCents(input: string): number | null {
  const match = AMOUNT_PATTERN.exec(input.trim())
  if (!match) return null
  const [, whole = '0', fraction = ''] = match
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}
