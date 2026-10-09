import { formatMoney, parseCents } from '@/lib/money'
import type { Cents } from '@/types/bank'

// Mirrors update_card_limit (migration 005) so mistakes show next to the field right away.
// The server stays the authority and returns the same rules as error codes.
export const LIMIT_MIN = 50_000 as Cents // $500
export const LIMIT_MAX = 10_000_000 as Cents // $100,000

export type LimitCheck = { readonly ok: true; readonly cents: Cents } | { readonly ok: false; readonly error: string }

export function validateCardLimit(input: string, spent: Cents): LimitCheck {
  if (!input.trim()) return { ok: false, error: 'Enter a limit.' }
  const cents = parseCents(input)
  if (cents === null) return { ok: false, error: 'Enter a limit in whole dollars, like 15000.' }
  if (cents % 100 !== 0) return { ok: false, error: 'Use whole dollars for the limit, like 15000.' }
  if (cents < LIMIT_MIN || cents > LIMIT_MAX) return { ok: false, error: 'Choose a limit between $500 and $100,000.' }
  if (cents < spent) {
    return {
      ok: false,
      error: `The limit can't be lower than what's already been spent on this card (${formatMoney(spent)}).`,
    }
  }
  return { ok: true, cents }
}
