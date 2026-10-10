import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TransactionRow } from '@/components/TransactionRow'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Input, Select } from '@/components/ui/form'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAccounts } from '@/hooks/accountQueries'
import { useTransactions } from '@/hooks/transactionQueries'
import { filterTransactions, type FlowFilter, type TransactionFilters } from '@/lib/analytics'
import { groupByDay } from '@/lib/dates'
import { CATEGORY_LABELS } from '@/lib/labels'
import { CATEGORIES, type Category } from '@/types/bank'

const PAGE_SIZE = 30
const NO_FILTERS: TransactionFilters = { search: '', category: 'all', flow: 'all', accountId: 'all' }

export default function ActivityPage() {
  const transactions = useTransactions()
  const accounts = useAccounts()
  const [filters, setFilters] = useState(NO_FILTERS)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => filterTransactions(transactions.data ?? [], filters), [transactions.data, filters])
  const groups = groupByDay(filtered.slice(0, visibleCount))
  const accountNames = new Map(accounts.data?.map((a) => [a.id, a.name]))

  function update<K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
    setVisibleCount(PAGE_SIZE)
  }

  return (
    <>
      <PageHeader title="Activity">
        {transactions.data && `${filtered.length} ${filtered.length === 1 ? 'transaction' : 'transactions'}`}
      </PageHeader>

      <div className="mb-8 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted"
          />
          <Input
            type="search"
            aria-label="Search transactions"
            placeholder="Search merchants"
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            className="pl-11"
          />
        </div>
        {/* Mobile: one swipeable row of filters, with a fade hinting at more to the right.
            Desktop: both wrappers dissolve into the grid. */}
        <div className="relative md:contents">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -right-5 z-10 w-12 bg-gradient-to-l from-bg to-transparent md:hidden"
          />
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:contents">
            <div className="shrink-0">
              <Select
                className="w-auto md:w-full"
                aria-label="Category"
                value={filters.category}
                onChange={(e) => update('category', e.target.value as Category | 'all')}
              >
                <option value="all">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="shrink-0">
              <Select
                className="w-auto md:w-full"
                aria-label="Type"
                value={filters.flow}
                onChange={(e) => update('flow', e.target.value as FlowFilter)}
              >
                <option value="all">Money in and out</option>
                <option value="in">Money in</option>
                <option value="out">Money out</option>
              </Select>
            </div>
            <div className="shrink-0">
              <Select
                className="w-auto md:w-full"
                aria-label="Account"
                value={filters.accountId}
                onChange={(e) => update('accountId', e.target.value)}
              >
                <option value="all">All accounts</option>
                {accounts.data?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </div>

      <section aria-label="Transactions">
        {transactions.isError ? (
          <ErrorMessage onRetry={() => void transactions.refetch()}>Couldn't load your transactions.</ErrorMessage>
        ) : transactions.isPending ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-card border border-hairline bg-sunken p-8 text-center">
            <p className="text-muted">No transactions match these filters.</p>
            <Button variant="secondary" className="mt-5" onClick={() => setFilters(NO_FILTERS)}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-card border border-hairline bg-sunken px-5">
              {groups.map((group) => (
                <div key={group.key} className="border-t border-hairline pt-6 first:border-t-0">
                  <h2 className="text-label font-medium text-muted uppercase">{group.label}</h2>
                  <ul className="divide-y divide-hairline">
                    {group.items.map((t) => (
                      <TransactionRow
                        key={t.id}
                        transaction={t}
                        showDate={false}
                        accountName={filters.accountId === 'all' ? accountNames.get(t.accountId) : undefined}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {visibleCount < filtered.length && (
              <div className="text-center">
                <Button variant="secondary" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
                  Show more
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  )
}
