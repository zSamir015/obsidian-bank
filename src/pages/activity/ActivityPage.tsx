import { Download, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TransactionRow } from '@/components/TransactionRow'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Input, Select } from '@/components/ui/form'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAccounts } from '@/hooks/accountQueries'
import { useTransactions } from '@/hooks/transactionQueries'
import { formatNumber } from '@/i18n/runtime'
import { useI18n } from '@/i18n/useI18n'
import { filterTransactions, type FlowFilter, type TransactionFilters } from '@/lib/analytics'
import { groupByDay } from '@/lib/dates'
import { categoryLabel } from '@/lib/labels'
import { downloadCsv, transactionsToCsv } from '@/lib/transactionCsv'
import { CATEGORIES, type Category } from '@/types/bank'

const PAGE_SIZE = 30
const NO_FILTERS: TransactionFilters = { search: '', category: 'all', flow: 'all', accountId: 'all' }

export default function ActivityPage() {
  const { t } = useI18n()
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

  function exportCsv() {
    const accountNames = new Map(accounts.data?.map((account) => [account.id, account.name]))
    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(`transactions-${date}.csv`, transactionsToCsv(filtered, accountNames))
  }

  return (
    <>
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4 md:mb-14">
        <div>
          <h1 className="text-[2.5rem] leading-tight font-medium tracking-[-0.01em]">{t.activity.title}</h1>
          {transactions.data && (
            <p className="mt-2 text-muted">{t.activity.count(filtered.length, formatNumber(filtered.length))}</p>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={exportCsv}
          disabled={transactions.isPending || accounts.isPending || transactions.isError || accounts.isError}
        >
          <Download aria-hidden="true" className="size-4" />
          {t.activity.exportCsv}
        </Button>
      </header>

      <div className="mb-8 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted"
          />
          <Input
            type="search"
            aria-label={t.activity.search}
            placeholder={t.activity.searchPlaceholder}
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
                aria-label={t.activity.category}
                value={filters.category}
                onChange={(e) => update('category', e.target.value as Category | 'all')}
              >
                <option value="all">{t.activity.allCategories}</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c, t)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="shrink-0">
              <Select
                className="w-auto md:w-full"
                aria-label={t.activity.type}
                value={filters.flow}
                onChange={(e) => update('flow', e.target.value as FlowFilter)}
              >
                <option value="all">{t.activity.allFlows}</option>
                <option value="in">{t.activity.moneyIn}</option>
                <option value="out">{t.activity.moneyOut}</option>
              </Select>
            </div>
            <div className="shrink-0">
              <Select
                className="w-auto md:w-full"
                aria-label={t.activity.account}
                value={filters.accountId}
                onChange={(e) => update('accountId', e.target.value)}
              >
                <option value="all">{t.activity.allAccounts}</option>
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

      <section aria-label={t.activity.list}>
        {transactions.isError ? (
          <ErrorMessage onRetry={() => void transactions.refetch()}>{t.activity.failed}</ErrorMessage>
        ) : transactions.isPending ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-card border border-hairline bg-sunken p-8 text-center">
            <p className="text-muted">{t.activity.noMatches}</p>
            <Button variant="secondary" className="mt-5" onClick={() => setFilters(NO_FILTERS)}>
              {t.activity.clearFilters}
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
                  {t.activity.showMore}
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  )
}
