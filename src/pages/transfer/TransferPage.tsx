import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, ButtonLink } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Field, Input, MoneyInput, Select } from '@/components/ui/form'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAccounts, useTransfer } from '@/hooks/queries'
import { toFriendlyMessage } from '@/lib/errors'
import { formatMoney, parseCents } from '@/lib/money'
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

  async function onSubmit(values: TransferFormValues) {
    const amount = parseCents(values.amount)!
    await transfer.mutateAsync({ fromId: values.fromId, toId: values.toId, amount, description: values.description })
    const to = accounts.data?.find((a) => a.id === values.toId)?.name ?? 'the account'
    setConfirmation(`Moved ${formatMoney(amount)} to ${to}`)
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Move money">Between your own accounts. Transfers arrive instantly.</PageHeader>

      {accounts.isError ? (
        <ErrorMessage onRetry={() => void accounts.refetch()}>Couldn't load your accounts.</ErrorMessage>
      ) : accounts.isPending ? (
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : confirmation ? (
        <div role="status" className="rounded-card border border-hairline bg-surface p-8">
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
        <form onSubmit={handleSubmit((v) => onSubmit(v).catch(() => {}))} noValidate className="space-y-6">
          <Field label="From" error={errors.fromId?.message}>
            {(props) => (
              <Select {...props} {...register('fromId')}>
                {accounts.data.map((a) => (
                  <option key={a.id} value={a.id}>
                    {`${a.name} · ${formatMoney(a.balance)}`}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="To" error={errors.toId?.message}>
            {(props) => (
              <Select {...props} {...register('toId')}>
                {accounts.data.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Amount" error={errors.amount?.message}>
            {(props) => <MoneyInput {...props} {...register('amount')} className="h-16 text-2xl" />}
          </Field>
          <Field label="Note" hint="Optional. Only you can see it." error={errors.description?.message}>
            {(props) => <Input {...props} maxLength={140} placeholder="Monthly savings" {...register('description')} />}
          </Field>

          {transfer.error && <ErrorMessage>{toFriendlyMessage(transfer.error)}</ErrorMessage>}

          <Button type="submit" loading={isSubmitting || transfer.isPending} className="w-full sm:w-auto">
            Move money
          </Button>
        </form>
      )}
    </div>
  )
}
