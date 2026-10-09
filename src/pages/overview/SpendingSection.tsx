import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { SectionTitle } from '@/components/ui/Label'
import { Money } from '@/components/ui/Money'
import { Skeleton } from '@/components/ui/Skeleton'
import { spendingAgainstBudgets, type BudgetProgress } from '@/lib/analytics'
import { CATEGORY_LABELS } from '@/lib/labels'
import type { Budget, Transaction } from '@/types/bank'
import type { QueryView } from './query'

/** From this share of a budget on, the bar turns white to draw attention. */
const NEAR_LIMIT = 0.9

export function SpendingSection({
  transactions,
  budgets,
}: {
  readonly transactions: QueryView<readonly Transaction[]>
  // Budgets only add context: if they fail to load, amounts still show, without bars.
  readonly budgets: readonly Budget[] | undefined
}) {
  const rows = spendingAgainstBudgets(transactions.data ?? [], budgets ?? [])

  return (
    <section aria-labelledby="spending">
      <SectionTitle id="spending">Spending this month</SectionTitle>
      {transactions.isError ? (
        <ErrorMessage onRetry={() => void transactions.refetch()}>Couldn't load your spending.</ErrorMessage>
      ) : transactions.isPending ? (
        <Skeleton className="h-20 rounded-card" />
      ) : rows.length === 0 ? (
        <p className="text-muted">No spending yet this month.</p>
      ) : (
        <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <SpendingRow key={row.category} row={row} />
          ))}
        </ul>
      )}
    </section>
  )
}

function SpendingRow({ row }: { readonly row: BudgetProgress }) {
  const label = CATEGORY_LABELS[row.category]
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span>
          <Money cents={row.spent} />
          {row.limit !== null && (
            <span className="text-muted">
              {' '}
              of <Money cents={row.limit} />
            </span>
          )}
        </span>
      </div>
      {row.limit !== null && row.ratio !== null && (
        <div
          role="meter"
          aria-label={`${label}: ${Math.round(row.ratio * 100)}% of budget`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(row.ratio * 100)}
          data-near-limit={row.ratio >= NEAR_LIMIT}
          className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className={`h-full rounded-full ${row.ratio >= NEAR_LIMIT ? 'bg-text' : 'bg-muted/50'}`}
            style={{ width: `${Math.min(row.ratio, 1) * 100}%` }}
          />
        </div>
      )}
    </li>
  )
}
