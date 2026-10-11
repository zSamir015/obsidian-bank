import type { CardTier, Category, TransactionStatus } from '@/types/bank'

export const CATEGORY_LABELS: Record<Category, string> = {
  corporate: 'Corporate',
  travel: 'Travel',
  services: 'Services',
  payroll: 'Payroll',
  transfer: 'Transfer',
  external: 'External transfer',
}

export const STATUS_LABELS: Record<Exclude<TransactionStatus, 'completed'>, string> = {
  pending: 'Pending',
  flagged: 'Under review',
}

/** 425 basis points → "4.25% APY", using integer math. */
export function formatApy(bps: number): string {
  return `${Math.trunc(bps / 100)}.${String(bps % 100).padStart(2, '0')}% APY`
}

export const CARD_TIER_LABELS: Record<CardTier, string> = {
  black: 'Black',
  platinum: 'Platinum',
  corporate: 'Corporate',
}
