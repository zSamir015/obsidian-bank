import { useId, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Field, MoneyInput } from '@/components/ui/form'
import { Money } from '@/components/ui/Money'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useBudgets, useCreateBudget, useUpdateBudget } from '@/hooks/budgetQueries'
import { useTransactions } from '@/hooks/transactionQueries'
import { NEAR_LIMIT_RATIO, spendingAgainstBudgets, type BudgetProgress } from '@/lib/analytics'
import { CATEGORY_LABELS } from '@/lib/labels'
import { asCents, parseCents, toAmountInput } from '@/lib/money'
import type { Budget, Cents } from '@/types/bank'

export default function BudgetsPage() {
  const budgets = useBudgets()
  const transactions = useTransactions()
  const rows = spendingAgainstBudgets(transactions.data ?? [], budgets.data ?? [])
  const byCategory = new Map(budgets.data?.map((b) => [b.category, b]))

  return (
    <div className="max-w-3xl">
      <PageHeader title="Budgets">Monthly limits for each spending category. Transfers don't count.</PageHeader>
      {budgets.isError ? (
        <ErrorMessage onRetry={() => void budgets.refetch()}>Couldn't load your budgets.</ErrorMessage>
      ) : budgets.isPending || transactions.isPending ? (
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
      ) : (
        <>
          {transactions.isError && (
            <div className="mb-8">
              <ErrorMessage onRetry={() => void transactions.refetch()}>
                Couldn't load this month's spending, so amounts show $0.00.
              </ErrorMessage>
            </div>
          )}
          <ul className="divide-y divide-hairline rounded-card border border-hairline bg-sunken px-6">
            {rows.map((row) => (
              <BudgetRow key={row.category} row={row} budget={byCategory.get(row.category)} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function BudgetRow({ row, budget }: { readonly row: BudgetProgress; readonly budget: Budget | undefined }) {
  const titleId = useId()
  const label = CATEGORY_LABELS[row.category]
  const [editing, setEditing] = useState(false)
  const update = useUpdateBudget()
  const create = useCreateBudget()
  const near = row.ratio !== null && row.ratio >= NEAR_LIMIT_RATIO
  const over = row.limit !== null && row.spent > row.limit

  return (
    <li aria-labelledby={titleId} className="py-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={titleId} className="font-medium">
          {label}
        </h2>
        <span className="text-sm">
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
          data-near-limit={near}
          className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className={`h-full rounded-full ${near ? 'bg-text' : 'bg-muted/50'}`}
            style={{ width: `${Math.min(row.ratio, 1) * 100}%` }}
          />
        </div>
      )}

      {editing ? (
        <LimitForm
          label={label}
          initial={budget?.limit ?? null}
          pending={update.isPending || create.isPending}
          onSave={(limit) =>
            budget
              ? update.mutateAsync({ id: budget.id, limit })
              : create.mutateAsync({ category: row.category, limit })
          }
          onDone={() => setEditing(false)}
        />
      ) : (
        <div className="mt-1.5 flex items-center justify-between gap-4 text-sm">
          {/* Going over is information, not an error: no amber here. */}
          <p className={over ? 'text-text' : 'text-muted'}>
            {row.limit === null ? (
              'No budget'
            ) : over ? (
              <>
                Over by <Money cents={asCents(row.spent - row.limit)} />
              </>
            ) : (
              <>
                <Money cents={asCents(row.limit - row.spent)} /> left
              </>
            )}
          </p>
          <Button variant="ghost" size="sm" className="-mr-4" onClick={() => setEditing(true)}>
            {budget ? 'Edit limit' : 'Set budget'}
          </Button>
        </div>
      )}
    </li>
  )
}

function LimitForm({
  label,
  initial,
  pending,
  onSave,
  onDone,
}: {
  readonly label: string
  readonly initial: Cents | null
  readonly pending: boolean
  readonly onSave: (limit: Cents) => Promise<unknown>
  readonly onDone: () => void
}) {
  const [draft, setDraft] = useState(initial === null ? '' : toAmountInput(initial))
  const [error, setError] = useState<string>()

  async function save() {
    const limit = parseCents(draft)
    if (limit === null || limit <= 0) {
      setError('Enter a limit greater than $0.00, like 1500.')
      return
    }
    try {
      await onSave(limit)
      onDone()
    } catch {
      setError("Couldn't save the limit. Check your connection and try again.")
    }
  }

  return (
    <form
      noValidate
      className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <div className="sm:w-56">
        <Field label={`Monthly limit for ${label}`} error={error}>
          {(props) => (
            <MoneyInput
              {...props}
              autoFocus
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setError(undefined)
              }}
            />
          )}
        </Field>
      </div>
      <div className="flex gap-2 sm:mt-7">
        <Button type="submit" loading={pending}>
          Save limit
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
