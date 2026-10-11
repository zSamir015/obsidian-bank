import { getMessages } from '@/i18n/runtime'
import type { Messages } from '@/i18n/messages/en'
import type { Account, CardTier, Category, TransactionStatus } from '@/types/bank'

// Labels for domain values, in the active language unless a catalogue is passed
// (the CSV export always uses English).

export function categoryLabel(category: Category, t: Messages = getMessages()): string {
  return t.categories[category]
}

export function statusLabel(status: TransactionStatus, t: Messages = getMessages()): string {
  return t.statuses[status]
}

export function cardTierLabel(tier: CardTier, t: Messages = getMessages()): string {
  return t.cardTiers[tier]
}

export function accountTypeLabel(type: Account['type'], t: Messages = getMessages()): string {
  return t.accountTypes[type]
}

/** 425 basis points → "4.25% APY", using integer math. */
export function formatApy(bps: number, t: Messages = getMessages()): string {
  return t.apy(`${Math.trunc(bps / 100)}.${String(bps % 100).padStart(2, '0')}`)
}
