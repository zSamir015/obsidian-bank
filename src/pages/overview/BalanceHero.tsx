import { ButtonLink } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Label } from '@/components/ui/Label'
import { Money } from '@/components/ui/Money'
import { Skeleton } from '@/components/ui/Skeleton'
import { cashflowThisMonth } from '@/lib/analytics'
import { asCents } from '@/lib/money'
import type { Account, Transaction } from '@/types/bank'
import type { QueryView } from './query'

export function BalanceHero({
  accounts,
  transactions,
}: {
  readonly accounts: QueryView<readonly Account[]>
  readonly transactions: readonly Transaction[] | undefined
}) {
  const total = asCents(accounts.data?.reduce((sum, a) => sum + a.balance, 0) ?? 0)
  const flow = transactions && cashflowThisMonth(transactions)

  return (
    <section aria-labelledby="total-balance" className="relative isolate pt-4">
      {/* The screen's single red element. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-20 -z-10 size-[20rem] rounded-full bg-accent opacity-[0.1] blur-[90px] sm:-top-40 sm:-left-24 sm:size-[34rem] sm:opacity-[0.16] sm:blur-[120px]"
      />
      <h1 id="total-balance">
        <Label as="span">Total balance</Label>
      </h1>

      {accounts.isError ? (
        <div className="mt-6">
          <ErrorMessage onRetry={() => void accounts.refetch()}>Couldn't load your balance.</ErrorMessage>
        </div>
      ) : accounts.isPending ? (
        <Skeleton className="mt-5 h-20 w-80 max-w-full" />
      ) : (
        <Money
          display
          cents={total}
          className="mt-3 block text-[clamp(3.25rem,11vw,7.5rem)] leading-[0.95] font-medium tracking-display"
        />
      )}

      {flow && (
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted">In this month</dt>
            <dd>
              <Money cents={flow.income} type="credit" />
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">Out this month</dt>
            <dd>
              <Money cents={flow.spending} type="debit" />
            </dd>
          </div>
        </dl>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink to="/transfer">Move money</ButtonLink>
        <ButtonLink to="/activity" variant="secondary">
          View activity
        </ButtonLink>
      </div>
    </section>
  )
}
