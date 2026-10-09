import { formatShortDate } from '../lib/dates'
import { CATEGORY_LABELS } from '@/lib/labels'
import type { Transaction } from '@/types/bank'
import { Amount } from './ui'

export function TransactionRow({ transaction, accountName }: { transaction: Transaction; accountName?: string }) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{transaction.merchant}</p>
        <p className="text-xs text-zinc-500">
          {formatShortDate(transaction.date)} · {CATEGORY_LABELS[transaction.category]}
          {accountName && ` · ${accountName}`}
        </p>
      </div>
      <Amount cents={transaction.amount} type={transaction.type} className="shrink-0 text-sm" />
    </li>
  )
}
