import type { Category, TransactionStatus } from '@/types/bank'

export const CATEGORY_LABELS: Record<Category, string> = {
  corporate: 'Corporate',
  travel: 'Travel',
  services: 'Services',
  payroll: 'Payroll',
  transfer: 'Transfer',
}

export const STATUS_LABELS: Record<Exclude<TransactionStatus, 'completed'>, string> = {
  pending: 'Pending',
  flagged: 'Under review',
}

/** 425 basis points → "4.25% APY", using integer math. */
export function formatApy(bps: number): string {
  return `${Math.trunc(bps / 100)}.${String(bps % 100).padStart(2, '0')}% APY`
}
