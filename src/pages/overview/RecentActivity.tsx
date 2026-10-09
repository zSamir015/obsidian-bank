import { ButtonLink } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { SectionTitle } from '@/components/ui/Label'
import { Skeleton } from '@/components/ui/Skeleton'
import { TransactionRow } from '@/components/TransactionRow'
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
          <ButtonLink to="/activity" variant="ghost" size="sm" className="-mr-4">
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
              <TransactionRow
                key={t.id}
                transaction={t}
                accountName={accountNames.size > 1 ? accountNames.get(t.accountId) : undefined}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
