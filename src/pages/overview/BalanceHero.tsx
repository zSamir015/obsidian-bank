import { ButtonLink } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Glow } from '@/components/ui/Glow'
import { Label } from '@/components/ui/Label'
import { Money } from '@/components/ui/Money'
import { Skeleton } from '@/components/ui/Skeleton'
import { useI18n } from '@/i18n/useI18n'
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
  const { t } = useI18n()
  const available = asCents(accounts.data?.reduce((sum, a) => sum + a.availableBalance, 0) ?? 0)
  const ledger = asCents(accounts.data?.reduce((sum, a) => sum + a.ledgerBalance, 0) ?? 0)
  const flow = transactions && cashflowThisMonth(transactions)

  return (
    <section aria-labelledby="total-balance" className="relative isolate pt-4">
      <Glow />
      <h1 id="total-balance">
        <Label as="span">{t.overview.totalAvailable}</Label>
      </h1>

      {accounts.isError ? (
        <div className="mt-6">
          <ErrorMessage onRetry={() => void accounts.refetch()}>{t.overview.balanceFailed}</ErrorMessage>
        </div>
      ) : accounts.isPending ? (
        <Skeleton className="mt-5 h-20 w-80 max-w-full" />
      ) : (
        <Money
          display
          cents={available}
          className="mt-3 block text-[clamp(3.25rem,11vw,7.5rem)] leading-[0.95] font-medium tracking-display"
        />
      )}

      {!accounts.isPending && !accounts.isError && (
        <p className="mt-3 text-sm text-muted">
          {t.overview.ledgerBalance} <Money cents={ledger} /> · {t.overview.availableNote}
        </p>
      )}

      {flow && (
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted">{t.overview.inThisMonth}</dt>
            <dd>
              <Money cents={flow.income} type="credit" />
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">{t.overview.outThisMonth}</dt>
            <dd>
              <Money cents={flow.spending} type="debit" />
            </dd>
          </div>
        </dl>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink to="/transfer">{t.overview.moveMoney}</ButtonLink>
        <ButtonLink to="/activity" variant="secondary">
          {t.app.viewActivity}
        </ButtonLink>
      </div>
    </section>
  )
}
