import { useMemo, useState } from 'react'
import { TransactionRow } from '../components/TransactionRow'
import { Card, PageHeader, QueryState } from '../components/ui'
import { useAccounts, useTransactions } from '../hooks/queries'
import { filterTransactions, type FlowFilter, type TransactionFilters } from '../lib/analytics'
import { CATEGORY_LABELS } from '../lib/labels'
import { CATEGORIES, type Category } from '@/types/bank'

const PAGE_SIZE = 15

const selectClass = 'rounded-lg border border-obsidian-700 bg-obsidian-900 px-3 py-2 text-sm'

export function TransactionsPage() {
  const transactions = useTransactions()
  const accounts = useAccounts()
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    category: 'all',
    flow: 'all',
    accountId: 'all',
  })
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => filterTransactions(transactions.data ?? [], filters), [transactions.data, filters])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const accountNames = new Map(accounts.data?.map((a) => [a.id, a.name]))

  function update<K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(0)
  }

  return (
    <>
      <PageHeader title="Movimientos" subtitle={`${filtered.length} resultados`} />
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          aria-label="Buscar movimientos"
          placeholder="Buscar…"
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          className={selectClass}
        />
        <select
          aria-label="Categoría"
          value={filters.category}
          onChange={(e) => update('category', e.target.value as Category | 'all')}
          className={selectClass}
        >
          <option value="all">Todas las categorías</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          aria-label="Tipo"
          value={filters.flow}
          onChange={(e) => update('flow', e.target.value as FlowFilter)}
          className={selectClass}
        >
          <option value="all">Ingresos y gastos</option>
          <option value="in">Solo ingresos</option>
          <option value="out">Solo gastos</option>
        </select>
        <select
          aria-label="Cuenta"
          value={filters.accountId}
          onChange={(e) => update('accountId', e.target.value)}
          className={selectClass}
        >
          <option value="all">Todas las cuentas</option>
          {accounts.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <QueryState isLoading={transactions.isLoading} error={transactions.error} />
        {transactions.data && visible.length === 0 && (
          <p className="text-sm text-zinc-500">Ningún movimiento coincide con los filtros.</p>
        )}
        <ul className="divide-y divide-obsidian-700">
          {visible.map((t) => (
            <TransactionRow key={t.id} transaction={t} accountName={accountNames.get(t.accountId)} />
          ))}
        </ul>
      </Card>

      {pageCount > 1 && (
        <nav aria-label="Paginación" className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg px-3 py-2 hover:bg-obsidian-800 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-zinc-400">
            Página {page + 1} de {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg px-3 py-2 hover:bg-obsidian-800 disabled:opacity-40"
          >
            Siguiente →
          </button>
        </nav>
      )}
    </>
  )
}
