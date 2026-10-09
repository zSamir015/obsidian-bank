// All money is handled as integer cents (Cents). Never use floats for amounts.
import type { Cents } from '@/types/bank'

// Optional minus, digits with optional en-US thousands groups, up to two decimals.
const AMOUNT_PATTERN = /^(-)?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/
const MAX_CENTS = BigInt(Number.MAX_SAFE_INTEGER)

/** Brands an integer number of cents (e.g. a value read from the database). */
export function asCents(value: number): Cents {
  if (!Number.isSafeInteger(value)) throw new RangeError(`Not an integer amount of cents: ${value}`)
  return value as Cents
}

/**
 * Converts a decimal amount like "1,234.56", "-0.29" or 19.99 to cents by parsing its digits,
 * never by multiplying floats. Throws RangeError for NaN, Infinity, more than two decimals,
 * exponents or values beyond the safe integer range.
 */
export function toCents(value: string | number): Cents {
  const text = typeof value === 'number' ? String(value) : value.trim()
  const match = AMOUNT_PATTERN.exec(text)
  if (!match) throw new RangeError(`Invalid amount: ${JSON.stringify(value)}`)
  const [, sign, whole = '0', fraction = ''] = match
  const cents = BigInt(whole.replaceAll(',', '')) * 100n + BigInt(fraction.padEnd(2, '0'))
  if (cents > MAX_CENTS) throw new RangeError(`Amount too large: ${JSON.stringify(value)}`)
  return (sign && cents !== 0n ? -Number(cents) : Number(cents)) as Cents
}

/** Like toCents, but returns null for invalid input (form validation). */
export function parseCents(value: string): Cents | null {
  try {
    return toCents(value)
  } catch {
    return null
  }
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function formatMoney(cents: Cents): string {
  return usd.format(cents / 100)
}

/** Unsigned "$1,234" and ".56" parts, so the UI can render cents smaller. The caller shows the sign. */
export function formatMoneyParts(cents: Cents): { readonly whole: string; readonly cents: string } {
  const parts = usd.formatToParts(Math.abs(cents) / 100)
  const split = parts.findIndex((p) => p.type === 'decimal')
  const text = (from: number, to?: number) =>
    parts
      .slice(from, to)
      .map((p) => p.value)
      .join('')
  return { whole: text(0, split), cents: text(split) }
}

/** Plain "1200.00" for prefilling inputs, using integer math only. */
export function toAmountInput(cents: Cents): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}
