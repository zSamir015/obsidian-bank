import { useState } from 'react'
import { Amount, Card, PageHeader, QueryState } from '../components/ui'
import { useBudgets, useTransactions, useUpdateBudget } from '../hooks/queries'
import { isInCurrentMonth } from '../lib/dates'
import { formatCents, parseAmountToCents } from '../lib/money'
import { CATEGORY_LABELS, type Budget } from '../lib/types'

export function BudgetsPage() {
  const budgets = useBudgets()
  const transactions = useTransactions()

  const spentByCategory = new Map<string, number>()
  for (const t of transactions.data ?? []) {
    if (t.amount_cents < 0 && isInCurrentMonth(t.created_at)) {
      spentByCategory.set(t.category, (spentByCategory.get(t.category) ?? 0) - t.amount_cents)
    }
  }

  return (
    <>
      <PageHeader title="Presupuestos" subtitle="Límite mensual por categoría." />
      <QueryState isLoading={budgets.isLoading} error={budgets.error} />
      <div className="grid gap-4 md:grid-cols-2">
        {budgets.data?.map((budget) => (
          <BudgetCard key={budget.id} budget={budget} spentCents={spentByCategory.get(budget.category) ?? 0} />
        ))}
      </div>
    </>
  )
}

function BudgetCard({ budget, spentCents }: { budget: Budget; spentCents: number }) {
  const update = useUpdateBudget()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const ratio = spentCents / budget.limit_cents
  const barColor = ratio >= 1 ? 'bg-rose-500' : ratio >= 0.8 ? 'bg-amber-400' : 'bg-sheen'
  const label = CATEGORY_LABELS[budget.category]

  function save() {
    const cents = parseAmountToCents(draft)
    if (cents === null || cents <= 0) {
      setError('Importe no válido')
      return
    }
    update.mutate({ id: budget.id, limitCents: cents }, { onSuccess: () => setEditing(false) })
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">{label}</h2>
        <span className="text-sm text-zinc-400">
          <Amount cents={spentCents} /> / {formatCents(budget.limit_cents)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Gasto en ${label}`}
        aria-valuemin={0}
        aria-valuemax={budget.limit_cents}
        aria-valuenow={Math.min(spentCents, budget.limit_cents)}
        className="mt-3 h-2 overflow-hidden rounded-full bg-obsidian-800"
      >
        <div className={`h-full rounded-full ${barColor} transition-[width] duration-500`} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        {ratio >= 1 ? `Excedido en ${formatCents(spentCents - budget.limit_cents)}` : `Quedan ${formatCents(budget.limit_cents - spentCents)}`}
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
          <button type="submit" disabled={update.isPending} className="rounded-lg bg-sheen px-3 text-sm font-medium text-obsidian-950">Guardar</button>
          <button type="button" onClick={() => setEditing(false)} className="px-2 text-sm text-zinc-400">Cancelar</button>
          {error && <span className="self-center text-xs text-rose-400">{error}</span>}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(String(budget.limit_cents / 100).replace('.', ','))
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
