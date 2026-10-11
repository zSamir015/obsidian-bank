import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { ArrowUpDown } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Field, Input, MoneyInput, Select } from '@/components/ui/form'
import { Label } from '@/components/ui/Label'
import { Money } from '@/components/ui/Money'
import { useTransfer } from '@/hooks/transferQueries'
import { useI18n } from '@/i18n/useI18n'
import { toFriendlyMessage } from '@/lib/errors'
import { formatApy } from '@/lib/labels'
import { formatMoney, parseCents } from '@/lib/money'
import type { Account } from '@/types/bank'
import { transferPreview, type TransferPreview } from './preview'
import { makeTransferSchema, type TransferFormValues } from './transferSchema'

/** Moves money between the user's own accounts. */
export function InternalTransferForm({ accounts }: { readonly accounts: readonly Account[] }) {
  const transfer = useTransfer()
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const { t } = useI18n()
  const schema = useMemo(() => makeTransferSchema(accounts, t), [accounts, t])

  // Most transfers go from checking into the vault, so that is the starting point.
  const defaults = useMemo<TransferFormValues>(
    () => ({
      fromId: accounts[0]?.id ?? '',
      toId: accounts[1]?.id ?? '',
      amount: '',
      description: '',
    }),
    [accounts],
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
  const preview = transferPreview(accounts, fromId, toId, amountText)

  function swapAccounts() {
    const { fromId: from, toId: to } = getValues()
    setValue('fromId', to, { shouldDirty: true })
    setValue('toId', from, { shouldDirty: true })
  }

  async function onSubmit(values: TransferFormValues) {
    const amount = parseCents(values.amount)!
    await transfer.mutateAsync({ fromId: values.fromId, toId: values.toId, amount, description: values.description })
    const to = accounts.find((a) => a.id === values.toId)?.name ?? t.transfer.theAccount
    setConfirmation(t.transfer.moved(formatMoney(amount), to))
  }

  return confirmation ? (
    <div role="status" className="max-w-[520px] rounded-card border border-hairline bg-surface p-8">
      <p className="text-2xl font-medium tracking-[-0.01em]">{confirmation}</p>
      <p className="mt-2 text-muted">{t.transfer.movedDetail}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => setConfirmation(null)}>{t.transfer.another}</Button>
        <ButtonLink to="/" variant="secondary">
          {t.app.backToOverview}
        </ButtonLink>
      </div>
    </div>
  ) : (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,520px)_minmax(0,320px)] lg:items-start lg:gap-16">
      <form onSubmit={handleSubmit((v) => onSubmit(v).catch(() => {}))} noValidate className="space-y-6">
        <Field label={t.transfer.from} error={errors.fromId?.message}>
          {(props) => (
            <Select {...props} {...register('fromId')}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {t.transfer.accountOption(a.name, formatMoney(a.availableBalance))}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="-my-3 flex justify-center">
          <Button
            variant="secondary"
            aria-label={t.transfer.swap}
            title={t.transfer.swap}
            onClick={swapAccounts}
            size="icon"
          >
            <ArrowUpDown aria-hidden="true" className="size-4" />
          </Button>
        </div>
        <Field label={t.transfer.to} error={errors.toId?.message}>
          {(props) => (
            <Select {...props} {...register('toId')}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {t.transfer.accountOption(a.name, formatMoney(a.availableBalance))}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t.transfer.amount} error={errors.amount?.message}>
          {(props) => <MoneyInput {...props} {...register('amount')} className="h-16 text-2xl" />}
        </Field>
        <Field label={t.transfer.note} hint={t.transfer.noteHint} error={errors.description?.message}>
          {(props) => (
            <Input
              {...props}
              maxLength={140}
              placeholder={t.transfer.internalNotePlaceholder}
              {...register('description')}
            />
          )}
        </Field>

        {transfer.error && <ErrorMessage>{toFriendlyMessage(transfer.error)}</ErrorMessage>}

        <Button type="submit" loading={isSubmitting || transfer.isPending} className="w-full sm:w-auto">
          {t.transfer.submitInternal}
        </Button>
      </form>
      {preview && <Summary preview={preview} />}
    </div>
  )
}

function Summary({ preview }: { readonly preview: TransferPreview }) {
  const { t } = useI18n()
  return (
    <section
      aria-label={t.transfer.summary}
      className="rounded-card border border-hairline bg-sunken p-6 lg:sticky lg:top-16"
    >
      <Label>{t.transfer.after}</Label>
      <dl className="mt-5 space-y-5">
        <div>
          <dt className="text-sm text-muted">{t.transfer.availableAfter(preview.from.name)}</dt>
          <dd className="mt-1 text-2xl font-medium tracking-[-0.01em]">
            <Money cents={preview.from.availableAfter} />
          </dd>
          <dd className="mt-1 text-sm text-muted">
            {t.transfer.ledger} <Money cents={preview.from.ledgerAfter} />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t.transfer.availableAfter(preview.to.name)}</dt>
          <dd className="mt-1 text-2xl font-medium tracking-[-0.01em]">
            <Money cents={preview.to.availableAfter} />
          </dd>
          <dd className="mt-1 text-sm text-muted">
            {t.transfer.ledger} <Money cents={preview.to.ledgerAfter} />
          </dd>
          {preview.to.apyBps > 0 && (
            <dd className="mt-1 text-sm text-muted">{t.transfer.earns(formatApy(preview.to.apyBps, t))}</dd>
          )}
        </div>
      </dl>
    </section>
  )
}
