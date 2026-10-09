import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Card, PageHeader, QueryState } from '../components/ui'
import { useAccounts, useTransfer } from '../hooks/queries'
import { toFriendlyMessage } from '../lib/errors'
import { formatCents, parseAmountToCents } from '../lib/money'
import { makeTransferSchema, type TransferFormValues } from './transferSchema'

const fieldClass =
  'mt-1 w-full rounded-lg border border-obsidian-700 bg-obsidian-950 px-3 py-2.5 aria-invalid:border-rose-500'

export function TransferPage() {
  const accounts = useAccounts()
  const transfer = useTransfer()
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const schema = useMemo(() => makeTransferSchema(accounts.data ?? []), [accounts.data])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fromId: '', toId: '', amount: '', description: '' },
  })

  async function onSubmit(values: TransferFormValues) {
    setConfirmation(null)
    const amountCents = parseAmountToCents(values.amount)!
    await transfer.mutateAsync({
      fromId: values.fromId,
      toId: values.toId,
      amountCents,
      description: values.description,
    })
    setConfirmation(`Transferencia de ${formatCents(amountCents)} realizada.`)
    reset()
  }

  return (
    <>
      <PageHeader title="Transferir" subtitle="Mueve dinero entre tus cuentas al instante." />
      <QueryState isLoading={accounts.isLoading} error={accounts.error} />
      {accounts.data && (
        <Card className="max-w-lg">
          <form onSubmit={handleSubmit((values) => onSubmit(values).catch(() => {}))} noValidate className="grid gap-4">
            <Field label="Desde" error={errors.fromId?.message} id="fromId">
              <select id="fromId" {...register('fromId')} aria-invalid={!!errors.fromId} className={fieldClass}>
                <option value="">Selecciona una cuenta</option>
                {accounts.data.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {formatCents(a.balance_cents)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hacia" error={errors.toId?.message} id="toId">
              <select id="toId" {...register('toId')} aria-invalid={!!errors.toId} className={fieldClass}>
                <option value="">Selecciona una cuenta</option>
                {accounts.data.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Importe (€)" error={errors.amount?.message} id="amount">
              <input
                id="amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                {...register('amount')}
                aria-invalid={!!errors.amount}
                className={`${fieldClass} font-mono`}
              />
            </Field>
            <Field label="Concepto (opcional)" error={errors.description?.message} id="description">
              <input
                id="description"
                maxLength={140}
                placeholder="Ahorro mensual"
                {...register('description')}
                aria-invalid={!!errors.description}
                className={fieldClass}
              />
            </Field>
            <button
              type="submit"
              disabled={transfer.isPending}
              className="rounded-xl bg-sheen px-4 py-3 font-medium text-obsidian-950 transition hover:bg-violet-300 active:scale-[.98] disabled:opacity-60"
            >
              {transfer.isPending ? 'Enviando…' : 'Transferir'}
            </button>
            <div aria-live="polite">
              {confirmation && <p className="text-sm text-emerald-400">{confirmation}</p>}
              {transfer.error && (
                <p role="alert" className="text-sm text-rose-400">
                  {toFriendlyMessage(transfer.error)}
                </p>
              )}
            </div>
          </form>
        </Card>
      )}
    </>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm text-zinc-300">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-rose-400">{error}</p>}
    </div>
  )
}
