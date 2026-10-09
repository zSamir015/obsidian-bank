import { useState } from 'react'
import { Amount, Card, PageHeader, QueryState } from '../components/ui'
import { useBudgets, useTransactions, useUpdateBudget } from '../hooks/queries'
import { spendingByCategory } from '../lib/analytics'
import { CATEGORY_LABELS } from '../lib/labels'
import { asCents, formatMoney, parseCents } from '../lib/money'
import type { Budget, Cents } from '@/types/bank'

export function BudgetsPage() {
  const budgets = useBudgets()
  const transactions = useTransactions()
  const spentByCategory = new Map(spendingByCategory(transactions.data ?? []).map((s) => [s.category, s.cents]))

  return (
    <>
      <PageHeader title="Presupuestos" subtitle="Límite mensual por categoría." />
      <QueryState isLoading={budgets.isLoading} error={budgets.error} />
      <div className="grid gap-4 md:grid-cols-2">
        {budgets.data?.map((budget) => (
          <BudgetCard key={budget.id} budget={budget} spentCents={spentByCategory.get(budget.category) ?? asCents(0)} />
        ))}
      </div>
    </>
  )
}

function BudgetCard({ budget, spentCents }: { budget: Budget; spentCents: Cents }) {
  const update = useUpdateBudget()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const ratio = spentCents / budget.limit
  const barColor = ratio >= 1 ? 'bg-rose-500' : ratio >= 0.8 ? 'bg-amber-400' : 'bg-sheen'
  const label = CATEGORY_LABELS[budget.category]

  function save() {
    const cents = parseCents(draft)
    if (cents === null || cents <= 0) {
      setError('Importe no válido')
      return
    }
    update.mutate({ id: budget.id, limit: cents }, { onSuccess: () => setEditing(false) })
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">{label}</h2>
        <span className="text-sm text-zinc-400">
          <Amount cents={spentCents} /> / {formatMoney(budget.limit)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Gasto en ${label}`}
        aria-valuemin={0}
        aria-valuemax={budget.limit}
        aria-valuenow={Math.min(spentCents, budget.limit)}
        className="mt-3 h-2 overflow-hidden rounded-full bg-obsidian-800"
      >
        <div
          className={`h-full rounded-full ${barColor} transition-[width] duration-500`}
          style={{ width: `${Math.min(ratio, 1) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        {ratio >= 1
          ? `Excedido en ${formatMoney(asCents(spentCents - budget.limit))}`
          : `Quedan ${formatMoney(asCents(budget.limit - spentCents))}`}
      </p>

      {editing ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <input
            autoFocus
            inputMode="decimal"
            aria-label={`Nuevo límite para ${label}`}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setError(null)
            }}
            className="w-32 rounded-lg border border-obsidian-700 bg-obsidian-950 px-3 py-1.5 font-mono text-sm"
          />
          <button
            type="submit"
            disabled={update.isPending}
            className="rounded-lg bg-sheen px-3 text-sm font-medium text-obsidian-950"
          >
            Guardar
          </button>
          <button type="button" onClick={() => setEditing(false)} className="px-2 text-sm text-zinc-400">
            Cancelar
          </button>
          {error && <span className="self-center text-xs text-rose-400">{error}</span>}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft((budget.limit / 100).toFixed(2))
            setEditing(true)
          }}
          className="mt-3 text-sm text-sheen hover:underline"
        >
          Editar límite
        </button>
      )}
    </Card>
  )
}

export default BudgetsPage
