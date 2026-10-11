import { useState } from 'react'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAccounts } from '@/hooks/accountQueries'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/cn'
import { ExternalTransferForm } from './ExternalTransferForm'
import { InternalTransferForm } from './InternalTransferForm'

type Mode = 'internal' | 'external'

const MODES = [
  { value: 'internal', label: 'internalMode', intro: 'internalIntro' },
  { value: 'external', label: 'externalMode', intro: 'externalIntro' },
] as const satisfies readonly { readonly value: Mode; readonly label: string; readonly intro: string }[]

export default function TransferPage() {
  const accounts = useAccounts()
  const [mode, setMode] = useState<Mode>('internal')
  const { t } = useI18n()
  const current = MODES.find((m) => m.value === mode)!

  return (
    <div>
      <PageHeader title={t.transfer.title}>{t.transfer[current.intro]}</PageHeader>

      {accounts.isError ? (
        <ErrorMessage onRetry={() => void accounts.refetch()}>{t.transfer.accountsFailed}</ErrorMessage>
      ) : accounts.isPending ? (
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
        <>
          <fieldset className="mb-10">
            <legend className="sr-only">{t.transfer.modeLegend}</legend>
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
                      // No colour transition: a half-faded state fails contrast while it animates.
                      'inline-flex h-9 cursor-pointer items-center rounded-full px-4 text-sm font-medium text-muted',
                      'peer-checked:bg-text peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-text',
                      'hover:text-text peer-checked:hover:text-bg',
                    )}
                  >
                    {t.transfer[m.label]}
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
