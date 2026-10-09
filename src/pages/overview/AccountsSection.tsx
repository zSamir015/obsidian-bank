import { Card } from '@/components/ui/Card'
import { Label, SectionTitle } from '@/components/ui/Label'
import { Money } from '@/components/ui/Money'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatApy } from '@/lib/labels'
import type { Account } from '@/types/bank'
import type { QueryView } from './query'

const TYPE_LABEL: Record<Account['type'], string> = { checking: 'Checking', vault: 'Vault' }

export function AccountsSection({ accounts }: { readonly accounts: QueryView<readonly Account[]> }) {
  // The balance hero already reports a failed accounts query, with its own retry.
  if (accounts.isError) return null
  return (
    <section aria-labelledby="accounts">
      <SectionTitle id="accounts">Accounts</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {accounts.isPending
          ? [0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-card" />)
          : accounts.data?.map((account) => (
              <Card key={account.id} className="flex min-h-40 flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label>{TYPE_LABEL[account.type]}</Label>
                    <h3 className="mt-1.5 font-medium">{account.name}</h3>
                  </div>
                  {account.apyBps > 0 && <span className="text-sm text-muted">{formatApy(account.apyBps)}</span>}
                </div>
                <Money
                  cents={account.balance}
                  className="mt-8 block text-[2rem] leading-none font-medium tracking-[-0.01em]"
                />
              </Card>
            ))}
      </div>
    </section>
  )
}
