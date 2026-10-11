import { getMessages } from '@/i18n/runtime'
import { formatDollars, parseCents } from '@/lib/money'
import type { Cents } from '@/types/bank'

// Mirrors update_card_limit (migration 005) so mistakes show next to the field right away.
// The server stays the authority and returns the same rules as error codes.
export const LIMIT_MIN = 50_000 as Cents // $500
export const LIMIT_MAX = 10_000_000 as Cents // $100,000

/** Lowest limit a card accepts: what has been spent, rounded up to whole dollars, and at least $500. */
export function minimumLimit(spent: Cents): Cents {
  return Math.max(LIMIT_MIN, Math.ceil(spent / 100) * 100) as Cents
}

export type LimitCheck = { readonly ok: true; readonly cents: Cents } | { readonly ok: false; readonly error: string }

export function validateCardLimit(input: string, spent: Cents): LimitCheck {
  const t = getMessages().cards
  if (!input.trim()) return { ok: false, error: t.limitRequired }
  const cents = parseCents(input)
  if (cents === null) return { ok: false, error: t.limitFormat }
  if (cents % 100 !== 0) return { ok: false, error: t.limitWholeDollars }
  if (cents < LIMIT_MIN || cents > LIMIT_MAX) {
    return { ok: false, error: t.limitRange(formatDollars(LIMIT_MIN), formatDollars(LIMIT_MAX)) }
  }
  if (cents < spent) return { ok: false, error: t.limitBelowSpent(formatDollars(minimumLimit(spent))) }
  return { ok: true, cents }
}
