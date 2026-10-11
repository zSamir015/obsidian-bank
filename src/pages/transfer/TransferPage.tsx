import { useState } from 'react'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAccounts } from '@/hooks/accountQueries'
import { cn } from '@/lib/cn'
import { ExternalTransferForm } from './ExternalTransferForm'
import { InternalTransferForm } from './InternalTransferForm'

type Mode = 'internal' | 'external'

const MODES: readonly { readonly value: Mode; readonly label: string; readonly intro: string }[] = [
  {
    value: 'internal',
    label: 'Between my accounts',
    intro:
      'Between your own accounts. Available excludes pending and under-review debits; ledger reflects settled activity.',
  },
  {
    value: 'external',
    label: 'To another bank',
    intro: 'To an account at another US bank, by routing and account number. A demo: nothing is really sent.',
  },
]

export default function TransferPage() {
  const accounts = useAccounts()
  const [mode, setMode] = useState<Mode>('internal')
  const current = MODES.find((m) => m.value === mode)!

  return (
    <div>
      <PageHeader title="Move money">{current.intro}</PageHeader>

      {accounts.isError ? (
        <ErrorMessage onRetry={() => void accounts.refetch()}>Couldn't load your accounts.</ErrorMessage>
      ) : accounts.isPending ? (
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
        <>
          <fieldset className="mb-10">
            <legend className="sr-only">Where the money goes</legend>
            <div className="inline-flex flex-wrap gap-1 rounded-full border border-hairline p-1">
              {MODES.map((m) => (
                <label key={m.value} className="relative">
                  <input
                    type="radio"
                    name="transfer-mode"
                    value={m.value}
                    checked={mode === m.value}
                    onChange={() => setMode(m.value)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      'inline-flex h-9 cursor-pointer items-center rounded-full px-4 text-sm font-medium text-muted transition-colors',
                      'peer-checked:bg-text peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-text',
                      'hover:text-text peer-checked:hover:text-bg',
                    )}
                  >
                    {m.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {mode === 'internal' ? (
            <InternalTransferForm accounts={accounts.data} />
          ) : (
            <ExternalTransferForm accounts={accounts.data} />
          )}
        </>
      )}
    </div>
  )
}
