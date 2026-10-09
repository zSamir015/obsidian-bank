import type { ReactNode } from 'react'
import { formatMoney } from '@/lib/money'
import type { Cents, TransactionType } from '@/types/bank'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-obsidian-700 bg-obsidian-900/70 p-5 ${className}`}>
      {children}
    </section>
  )
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
    </header>
  )
}

/** Pass the transaction type to show its direction (+ credit / − debit). */
export function Amount({ cents, type, className = '' }: { cents: Cents; type?: TransactionType; className?: string }) {
  const color = type === 'credit' ? 'text-emerald-400' : type === 'debit' ? 'text-zinc-200' : ''
  const prefix = type === 'credit' ? '+' : type === 'debit' ? '−' : ''
  return (
    <span className={`font-mono tabular-nums ${color} ${className}`}>
      {prefix}
      {formatMoney(cents)}
    </span>
  )
}

export function QueryState({ isLoading, error }: { isLoading: boolean; error: Error | null }) {
  if (isLoading) return <p className="text-sm text-zinc-500">Cargando…</p>
  if (error)
    return (
      <p role="alert" className="text-sm text-rose-400">
        No se pudieron cargar los datos.
      </p>
    )
  return null
}
