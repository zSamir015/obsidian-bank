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
  const schema = useMemo(() => makeExternalTransferSchema(accounts), [accounts])

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
          Sent {formatMoney(sent.amount)} to {sent.recipientName}
        </p>
        <p className="mt-2 text-muted">
          Account ending <span className="font-mono">{sent.accountLast4}</span>, routing number{' '}
          <span className="font-mono">{sent.routingNumber}</span>.
        </p>
        <p className="mt-4 text-muted">
          It's pending, and it already counts against your available balance. About 2 minutes from now it will show as
          settled, the next time your balances or activity load. No real payment network was contacted.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() => setSent(null)}>Send another</Button>
          <ButtonLink to="/activity" variant="secondary">
            View activity
          </ButtonLink>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,520px)_minmax(0,320px)] lg:items-start lg:gap-16">
      <form onSubmit={handleSubmit((v) => onSubmit(v).catch(() => {}))} noValidate className="space-y-6">
        <DemoNetworkNotice />

        <Field label="From" error={errors.fromId?.message}>
          {(props) => (
            <Select {...props} {...register('fromId')}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {`${a.name} · ${formatMoney(a.availableBalance)} available`}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Recipient name" error={errors.recipientName?.message}>
          {(props) => <Input {...props} maxLength={70} autoComplete="off" {...register('recipientName')} />}
        </Field>
        <Field
          label="Routing number"
          hint="9 digits, printed at the bottom left of a check."
          error={errors.routingNumber?.message}
        >
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
              label="Account number"
              hint="Only the last four digits are kept once you leave this field."
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
          label="Amount"
          hint={`Up to ${formatMoney(EXTERNAL_PER_TRANSFER_LIMIT)} per transfer and ${formatMoney(EXTERNAL_DAILY_LIMIT)} in 24 hours.`}
          error={errors.amount?.message}
        >
          {(props) => <MoneyInput {...props} {...register('amount')} className="h-16 text-2xl" />}
        </Field>
        <Field label="Note" hint="Optional. Only you can see it." error={errors.note?.message}>
          {(props) => <Input {...props} maxLength={140} placeholder="Rent for May" {...register('note')} />}
        </Field>

        {transfer.error && <ErrorMessage>{toFriendlyMessage(transfer.error, 'send the transfer')}</ErrorMessage>}

        <Button type="submit" loading={isSubmitting || transfer.isPending} className="w-full sm:w-auto">
          Send transfer
        </Button>
      </form>
      {from && amount !== null && amount > 0 && amount <= from.availableBalance && (
        <section aria-label="Summary" className="rounded-card border border-hairline bg-sunken p-6 lg:sticky lg:top-16">
          <Label>After this transfer</Label>
          <dl className="mt-5 space-y-5">
            <div>
              <dt className="text-sm text-muted">{from.name} · Available</dt>
              <dd className="mt-1 text-2xl font-medium tracking-[-0.01em]">
                <Money cents={asCents(from.availableBalance - amount)} />
              </dd>
              <dd className="mt-1 text-sm text-muted">
                Ledger <Money cents={from.ledgerBalance} /> until it settles
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Status</dt>
              <dd className="mt-1">Pending, settles in about 2 minutes (simulated)</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  )
}

function DemoNetworkNotice() {
  return (
    <div role="note" className="flex items-start gap-3 rounded-card border border-hairline bg-sunken p-5 text-sm">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
      <p className="text-muted">
        <span className="font-medium text-text">Demo only.</span> Obsidian Bank doesn't connect to ACH, Fedwire or any
        other payment network, and no money leaves the app. The transfer is recorded as pending, and about 2 minutes
        later it's marked as settled the next time your balances or activity load.
      </p>
    </div>
  )
}
