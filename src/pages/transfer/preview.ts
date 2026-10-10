import { asCents, parseCents } from '@/lib/money'
import type { Account, Cents } from '@/types/bank'

export interface TransferPreview {
  readonly from: { readonly name: string; readonly availableAfter: Cents; readonly ledgerAfter: Cents }
  readonly to: {
    readonly name: string
    readonly availableAfter: Cents
    readonly ledgerAfter: Cents
    readonly apyBps: number
  }
  /** null while the amount field is empty or invalid: balances then show as they are now. */
  readonly amount: Cents | null
}

export function transferPreview(
  accounts: readonly Account[],
  fromId: string,
  toId: string,
  amountText: string,
): TransferPreview | null {
  const from = accounts.find((a) => a.id === fromId)
  const to = accounts.find((a) => a.id === toId)
  if (!from || !to || from.id === to.id) return null
  const parsed = parseCents(amountText)
  const amount = parsed !== null && parsed > 0 ? parsed : null
  const moved = amount ?? 0
  return {
    from: {
      name: from.name,
      availableAfter: asCents(from.availableBalance - moved),
      ledgerAfter: asCents(from.ledgerBalance - moved),
    },
    to: {
      name: to.name,
      availableAfter: asCents(to.availableBalance + moved),
      ledgerAfter: asCents(to.ledgerBalance + moved),
      apyBps: to.apyBps,
    },
    amount,
  }
}
