import type { ReactNode } from 'react'
import { formatCents } from '../lib/money'

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

export function Amount({
  cents,
  signed = false,
  className = '',
}: {
  cents: number
  signed?: boolean
  className?: string
}) {
  const color = !signed ? '' : cents > 0 ? 'text-emerald-400' : 'text-zinc-200'
  const prefix = signed && cents > 0 ? '+' : ''
  return (
    <span className={`font-mono tabular-nums ${color} ${className}`}>
      {prefix}
      {formatCents(cents)}
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
