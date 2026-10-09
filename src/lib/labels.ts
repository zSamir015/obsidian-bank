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
