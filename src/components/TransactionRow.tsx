import { Money } from '@/components/ui/Money'
import { Tag } from '@/components/ui/Tag'
import { formatShortDate } from '@/lib/dates'
import { CATEGORY_LABELS, STATUS_LABELS } from '@/lib/labels'
import type { Transaction } from '@/types/bank'

/** One transaction: merchant and context on the left, status and signed amount on the right. */
export function TransactionRow({
  transaction: t,
  accountName,
  showDate = true,
}: {
  readonly transaction: Transaction
  readonly accountName?: string
  /** Hidden when rows are already grouped under a day heading. */
  readonly showDate?: boolean
}) {
  const context = [showDate && formatShortDate(t.date), CATEGORY_LABELS[t.category]].filter(Boolean).join(' · ')
  return (
    <li className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="truncate">{t.merchant}</p>
        <p className="mt-0.5 truncate text-sm text-muted">
          {context}
          {accountName && <span className="hidden sm:inline"> · {accountName}</span>}
        </p>
      </div>
      <div className="flex shrink-0 flex-col-reverse items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        {t.status !== 'completed' && <Tag>{STATUS_LABELS[t.status]}</Tag>}
        <Money cents={t.amount} type={t.type} />
      </div>
    </li>
  )
}
