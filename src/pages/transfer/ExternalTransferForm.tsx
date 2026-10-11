import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Button, ButtonLink } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Field, Input, MoneyInput, Select } from '@/components/ui/form'
import { Label } from '@/components/ui/Label'
import { Money } from '@/components/ui/Money'
import { useExternalTransfer } from '@/hooks/transferQueries'
import { useI18n } from '@/i18n/useI18n'
import { toFriendlyMessage } from '@/lib/errors'
import { asCents, formatMoney, parseCents } from '@/lib/money'
import type { Account, Cents } from '@/types/bank'
import { AccountNumberField } from './AccountNumberField'
import {
  EXTERNAL_DAILY_LIMIT,
  EXTERNAL_PER_TRANSFER_LIMIT,
  makeExternalTransferSchema,
  type ExternalTransferFormValues,
} from './externalSchema'

interface Sent {
  readonly amount: Cents
  readonly recipientName: string
  readonly accountLast4: string
  readonly routingNumber: string
}

/** Sends money to a fictional account at another US bank. Nothing leaves the app. */
export function ExternalTransferForm({ accounts }: { readonly accounts: readonly Account[] }) {
  const transfer = useExternalTransfer()
  const [sent, setSent] = useState<Sent | null>(null)
  const [accountNumberError, setAccountNumberError] = useState<string | null>(null)
  const { t } = useI18n()
  const schema = useMemo(() => makeExternalTransferSchema(accounts, t), [accounts, t])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ExternalTransferFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fromId: accounts[0]?.id ?? '',
      recipientName: '',
      routingNumber: '',
      accountLast4: '',
      amount: '',
      note: '',
    },
  })

  const [fromId, amountText] = useWatch({ control, name: ['fromId', 'amount'] })
  const from = accounts.find((a) => a.id === fromId)
  const amount = parseCents(amountText ?? '')

  async function onSubmit(values: ExternalTransferFormValues) {
    const cents = parseCents(values.amount)!
    await transfer.mutateAsync({
      fromId: values.fromId,
      amount: cents,
      routingNumber: values.routingNumber,
      accountLast4: values.accountLast4,
      recipientName: values.recipientName,
      note: values.note,
    })
    setSent({
      amount: cents,
      recipientName: values.recipientName,
      accountLast4: values.accountLast4,
      routingNumber: values.routingNumber,
    })
  }

  if (sent) {
    return (
      <div role="status" className="max-w-[520px] rounded-card border border-hairline bg-surface p-8">
        <p className="text-2xl font-medium tracking-[-0.01em]">
          {t.transfer.sent(formatMoney(sent.amount), sent.recipientName)}
        </p>
        <p className="mt-2 text-muted">
          {t.transfer.sentAccount} <span className="font-mono">{sent.accountLast4}</span>, {t.transfer.sentRouting}{' '}
          <span className="font-mono">{sent.routingNumber}</span>.
        </p>
        <p className="mt-4 text-muted">{t.transfer.sentDetail}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() => setSent(null)}>{t.transfer.sendAnother}</Button>
          <ButtonLink to="/activity" variant="secondary">
            {t.app.viewActivity}
          </ButtonLink>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,520px)_minmax(0,320px)] lg:items-start lg:gap-16">
      <form onSubmit={handleSubmit((v) => onSubmit(v).catch(() => {}))} noValidate className="space-y-6">
        <DemoNetworkNotice />

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
        <Field label={t.transfer.recipientName} error={errors.recipientName?.message}>
          {(props) => <Input {...props} maxLength={70} autoComplete="off" {...register('recipientName')} />}
        </Field>
        <Field label={t.transfer.routingNumber} hint={t.transfer.routingHint} error={errors.routingNumber?.message}>
          {(props) => (
            <Input
              {...props}
              inputMode="numeric"
              autoComplete="off"
              maxLength={9}
              className="font-mono"
              {...register('routingNumber')}
            />
          )}
        </Field>
        <Controller
          control={control}
          name="accountLast4"
          render={({ field }) => (
            <Field
              label={t.transfer.accountNumber}
              hint={t.transfer.accountNumberHint}
              error={accountNumberError ?? errors.accountLast4?.message}
            >
              {(props) => (
                <AccountNumberField
                  control={props}
                  last4={field.value}
                  onLast4Change={field.onChange}
                  onFormatError={setAccountNumberError}
                />
              )}
            </Field>
          )}
        />
        <Field
          label={t.transfer.amount}
          hint={t.transfer.externalAmountHint(
            formatMoney(EXTERNAL_PER_TRANSFER_LIMIT),
            formatMoney(EXTERNAL_DAILY_LIMIT),
          )}
          error={errors.amount?.message}
        >
          {(props) => <MoneyInput {...props} {...register('amount')} className="h-16 text-2xl" />}
        </Field>
        <Field label={t.transfer.note} hint={t.transfer.noteHint} error={errors.note?.message}>
          {(props) => (
            <Input {...props} maxLength={140} placeholder={t.transfer.externalNotePlaceholder} {...register('note')} />
          )}
        </Field>

        {transfer.error && <ErrorMessage>{toFriendlyMessage(transfer.error, 'sendTransfer')}</ErrorMessage>}

        <Button type="submit" loading={isSubmitting || transfer.isPending} className="w-full sm:w-auto">
          {t.transfer.submitExternal}
        </Button>
      </form>
      {from && amount !== null && amount > 0 && amount <= from.availableBalance && (
        <section
          aria-label={t.transfer.summary}
          className="rounded-card border border-hairline bg-sunken p-6 lg:sticky lg:top-16"
        >
          <Label>{t.transfer.after}</Label>
          <dl className="mt-5 space-y-5">
            <div>
              <dt className="text-sm text-muted">{t.transfer.availableAfter(from.name)}</dt>
              <dd className="mt-1 text-2xl font-medium tracking-[-0.01em]">
                <Money cents={asCents(from.availableBalance - amount)} />
              </dd>
              <dd className="mt-1 text-sm text-muted">
                {t.transfer.ledger} <Money cents={from.ledgerBalance} /> {t.transfer.ledgerUntilSettled}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t.transfer.status}</dt>
              <dd className="mt-1">{t.transfer.pendingStatus}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  )
}

function DemoNetworkNotice() {
  const { t } = useI18n()
  return (
    <div role="note" className="flex items-start gap-3 rounded-card border border-hairline bg-sunken p-5 text-sm">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
      <p className="text-muted">
        <span className="font-medium text-text">{t.transfer.demoOnly}</span> {t.transfer.demoNotice}
      </p>
    </div>
  )
}
