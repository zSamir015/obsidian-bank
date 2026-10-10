import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { ArrowUpDown } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Field, Input, MoneyInput, Select } from '@/components/ui/form'
import { Label } from '@/components/ui/Label'
import { Money } from '@/components/ui/Money'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAccounts } from '@/hooks/accountQueries'
import { useTransfer } from '@/hooks/transferQueries'
import { toFriendlyMessage } from '@/lib/errors'
import { formatApy } from '@/lib/labels'
import { formatMoney, parseCents } from '@/lib/money'
import { transferPreview, type TransferPreview } from './preview'
import { makeTransferSchema, type TransferFormValues } from './transferSchema'

export default function TransferPage() {
  const accounts = useAccounts()
  const transfer = useTransfer()
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const schema = useMemo(() => makeTransferSchema(accounts.data ?? []), [accounts.data])

  // Most transfers go from checking into the vault, so that is the starting point.
  const defaults = useMemo<TransferFormValues>(
    () => ({
      fromId: accounts.data?.[0]?.id ?? '',
      toId: accounts.data?.[1]?.id ?? '',
      amount: '',
      description: '',
    }),
    [accounts.data],
  )

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    setValue,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(schema),
    values: defaults,
    resetOptions: { keepDirtyValues: true },
  })

  // React Hook Form recommends resetting after submission settles, not inside the submit handler.
  useEffect(() => {
    // keepDirtyValues (needed while accounts load) would otherwise keep the old amount.
    if (isSubmitSuccessful) reset(defaults, { keepDirtyValues: false })
  }, [isSubmitSuccessful, reset, defaults])

  const [fromId, toId, amountText] = useWatch({ control, name: ['fromId', 'toId', 'amount'] })
  const preview = transferPreview(accounts.data ?? [], fromId, toId, amountText)

  function swapAccounts() {
    const { fromId: from, toId: to } = getValues()
    setValue('fromId', to, { shouldDirty: true })
    setValue('toId', from, { shouldDirty: true })
  }

  async function onSubmit(values: TransferFormValues) {
    const amount = parseCents(values.amount)!
    await transfer.mutateAsync({ fromId: values.fromId, toId: values.toId, amount, description: values.description })
    const to = accounts.data?.find((a) => a.id === values.toId)?.name ?? 'the account'
    setConfirmation(`Moved ${formatMoney(amount)} to ${to}`)
  }

  return (
    <div>
      <PageHeader title="Move money">
        Between your own accounts. Available excludes pending and under-review debits; ledger reflects settled activity.
      </PageHeader>

      {accounts.isError ? (
        <ErrorMessage onRetry={() => void accounts.refetch()}>Couldn't load your accounts.</ErrorMessage>
      ) : accounts.isPending ? (
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : confirmation ? (
        <div role="status" className="max-w-[520px] rounded-card border border-hairline bg-surface p-8">
          <p className="text-2xl font-medium tracking-[-0.01em]">{confirmation}</p>
          <p className="mt-2 text-muted">The new balances are already on your overview.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => setConfirmation(null)}>Make another transfer</Button>
            <ButtonLink to="/" variant="secondary">
              Back to overview
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,520px)_minmax(0,320px)] lg:items-start lg:gap-16">
          <form onSubmit={handleSubmit((v) => onSubmit(v).catch(() => {}))} noValidate className="space-y-6">
            <Field label="From" error={errors.fromId?.message}>
              {(props) => (
                <Select {...props} {...register('fromId')}>
                  {accounts.data.map((a) => (
                    <option key={a.id} value={a.id}>
                      {`${a.name} · ${formatMoney(a.availableBalance)} available`}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="-my-3 flex justify-center">
              <Button
                variant="secondary"
                aria-label="Swap accounts"
                title="Swap accounts"
                onClick={swapAccounts}
                size="icon"
              >
                <ArrowUpDown aria-hidden="true" className="size-4" />
              </Button>
            </div>
            <Field label="To" error={errors.toId?.message}>
              {(props) => (
                <Select {...props} {...register('toId')}>
                  {accounts.data.map((a) => (
                    <option key={a.id} value={a.id}>
                      {`${a.name} · ${formatMoney(a.availableBalance)} available`}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Amount" error={errors.amount?.message}>
              {(props) => <MoneyInput {...props} {...register('amount')} className="h-16 text-2xl" />}
            </Field>
            <Field label="Note" hint="Optional. Only you can see it." error={errors.description?.message}>
              {(props) => (
                <Input {...props} maxLength={140} placeholder="Monthly savings" {...register('description')} />
              )}
            </Field>

            {transfer.error && <ErrorMessage>{toFriendlyMessage(transfer.error)}</ErrorMessage>}

            <Button type="submit" loading={isSubmitting || transfer.isPending} className="w-full sm:w-auto">
              Move money
            </Button>
          </form>
          {preview && <Summary preview={preview} />}
        </div>
      )}
    </div>
  )
}

function Summary({ preview }: { readonly preview: TransferPreview }) {
  return (
    <section aria-label="Summary" className="rounded-card border border-hairline bg-sunken p-6 lg:sticky lg:top-16">
      <Label>After this transfer</Label>
      <dl className="mt-5 space-y-5">
        <div>
          <dt className="text-sm text-muted">{preview.from.name} · Available</dt>
          <dd className="mt-1 text-2xl font-medium tracking-[-0.01em]">
            <Money cents={preview.from.availableAfter} />
          </dd>
          <dd className="mt-1 text-sm text-muted">
            Ledger <Money cents={preview.from.ledgerAfter} />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{preview.to.name} · Available</dt>
          <dd className="mt-1 text-2xl font-medium tracking-[-0.01em]">
            <Money cents={preview.to.availableAfter} />
          </dd>
          <dd className="mt-1 text-sm text-muted">
            Ledger <Money cents={preview.to.ledgerAfter} />
          </dd>
          {preview.to.apyBps > 0 && <dd className="mt-1 text-sm text-muted">Earns {formatApy(preview.to.apyBps)}</dd>}
        </div>
      </dl>
    </section>
  )
}
