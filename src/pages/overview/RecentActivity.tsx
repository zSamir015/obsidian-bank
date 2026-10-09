import { ButtonLink } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { SectionTitle } from '@/components/ui/Label'
import { Money } from '@/components/ui/Money'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tag } from '@/components/ui/Tag'
import { formatShortDate } from '@/lib/dates'
import { CATEGORY_LABELS, STATUS_LABELS } from '@/lib/labels'
import type { Account, Transaction } from '@/types/bank'
import type { QueryView } from './query'

export function RecentActivity({
  transactions,
  accounts,
}: {
  readonly transactions: QueryView<readonly Transaction[]>
  readonly accounts: readonly Account[] | undefined
}) {
  const accountNames = new Map(accounts?.map((a) => [a.id, a.name]))
  return (
    <section aria-labelledby="recent-activity">
      <SectionTitle
        id="recent-activity"
        action={
          <ButtonLink to="/activity" variant="ghost" className="-mr-3 h-9 px-3">
            View all
          </ButtonLink>
        }
      >
        Recent activity
      </SectionTitle>
      <div className="rounded-card border border-hairline bg-sunken px-5">
        {transactions.isError ? (
          <div className="py-5">
            <ErrorMessage onRetry={() => void transactions.refetch()}>Couldn't load your activity.</ErrorMessage>
          </div>
        ) : transactions.isPending ? (
          <div className="space-y-4 py-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : transactions.data?.length === 0 ? (
          <p className="py-5 text-muted">No activity yet. Transfers and card payments will show up here.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {transactions.data?.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate">{t.merchant}</p>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {formatShortDate(t.date)} · {CATEGORY_LABELS[t.category]}
                    {accountNames.size > 1 && (
                      <span className="hidden sm:inline"> · {accountNames.get(t.accountId)}</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col-reverse items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  {t.status !== 'completed' && <Tag>{STATUS_LABELS[t.status]}</Tag>}
                  <Money cents={t.amount} type={t.type} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
