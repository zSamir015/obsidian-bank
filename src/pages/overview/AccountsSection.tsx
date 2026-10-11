import { Card } from '@/components/ui/Card'
import { Label, SectionTitle } from '@/components/ui/Label'
import { Money } from '@/components/ui/Money'
import { Skeleton } from '@/components/ui/Skeleton'
import { useI18n } from '@/i18n/useI18n'
import { accountTypeLabel, formatApy } from '@/lib/labels'
import type { Account } from '@/types/bank'
import type { QueryView } from './query'

export function AccountsSection({ accounts }: { readonly accounts: QueryView<readonly Account[]> }) {
  const { t } = useI18n()
  // The balance hero already reports a failed accounts query, with its own retry.
  if (accounts.isError) return null
  return (
    <section aria-labelledby="accounts">
      <SectionTitle id="accounts">{t.overview.accounts}</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {accounts.isPending
          ? [0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-card" />)
          : accounts.data?.map((account) => (
              <Card key={account.id} className="flex min-h-40 flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label>{accountTypeLabel(account.type, t)}</Label>
                    <h3 className="mt-1.5 font-medium">{account.name}</h3>
                  </div>
                  {account.apyBps > 0 && <span className="text-sm text-muted">{formatApy(account.apyBps, t)}</span>}
                </div>
                <dl className="mt-8">
                  <div>
                    <dt className="text-sm text-muted">{t.overview.available}</dt>
                    <dd className="mt-1 text-[2rem] leading-none font-medium tracking-[-0.01em]">
                      <Money cents={account.availableBalance} />
                    </dd>
                  </div>
                  <div className="mt-3 flex gap-2 text-sm">
                    <dt className="text-muted">{t.overview.ledger}</dt>
                    <dd>
                      <Money cents={account.ledgerBalance} />
                    </dd>
                  </div>
                </dl>
              </Card>
            ))}
      </div>
    </section>
  )
}
