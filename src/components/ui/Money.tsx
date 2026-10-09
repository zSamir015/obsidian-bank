import { cn } from '@/lib/cn'
import { formatMoney, formatMoneyParts } from '@/lib/money'
import type { Cents, TransactionType } from '@/types/bank'

const SIGN: Record<TransactionType, string> = { credit: '+', debit: '−' }

/**
 * Proportional figures with tabular-nums; cents smaller and muted. Direction is shown with
 * a sign (never color). Screen readers get the full amount once.
 */
export function Money({
  cents,
  type,
  display = false,
  className,
}: {
  readonly cents: Cents
  readonly type?: TransactionType
  /** Hero-sized figures shrink the cents further. */
  readonly display?: boolean
  readonly className?: string
}) {
  const sign = type ? SIGN[type] : cents < 0 ? '−' : ''
  const parts = formatMoneyParts(cents)
  return (
    <span className={cn('tabular-nums', className)}>
      <span className="sr-only">{`${sign}${formatMoney(Math.abs(cents) as Cents)}`}</span>
      <span aria-hidden="true">
        {sign}
        {parts.whole}
        <span data-part="cents" className={cn(display ? 'text-[0.6em]' : 'text-[0.8em]', 'text-muted')}>
          {parts.cents}
        </span>
      </span>
    </span>
  )
}
