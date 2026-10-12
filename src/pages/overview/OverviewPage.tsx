import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useAccounts } from '@/hooks/accountQueries'
import { useTransactions } from '@/hooks/transactionQueries'
import { AccountsSection } from './AccountsSection'
import { BalanceHero } from './BalanceHero'

const OverviewDetails = lazy(() => import('./OverviewDetails'))

/**
 * The sections below the balances (spending, cards, recent activity) start loading this long
 * after the balances have arrived. The total balance is the screen's largest paint, and
 * Lighthouse counts every request that starts before it, so the details' chunks must not
 * start alongside it (#57).
 */
export const DETAILS_AFTER_BALANCES_MS = 600

export default function OverviewPage() {
  const accounts = useAccounts()
  const transactions = useTransactions()
  const detailsRef = useRef<HTMLDivElement>(null)
  const [loadDetails, setLoadDetails] = useState(() => typeof IntersectionObserver === 'undefined')
  const [balancesShown, setBalancesShown] = useState(false)

  useEffect(() => {
    if (accounts.isPending || balancesShown) return
    const timeoutId = window.setTimeout(() => setBalancesShown(true), DETAILS_AFTER_BALANCES_MS)
    return () => window.clearTimeout(timeoutId)
  }, [accounts.isPending, balancesShown])

  useEffect(() => {
    const element = detailsRef.current
    if (!element) return
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setLoadDetails(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="space-y-16 md:space-y-20">
      <BalanceHero accounts={accounts} transactions={transactions.data} />
      <AccountsSection accounts={accounts} />
      <div ref={detailsRef} className="space-y-16 md:space-y-20" aria-busy={!(loadDetails && balancesShown)}>
        {loadDetails && balancesShown ? (
          <Suspense fallback={<DetailsSkeleton />}>
            <OverviewDetails accounts={accounts.data} transactions={transactions} />
          </Suspense>
        ) : (
          <DetailsSkeleton />
        )}
      </div>
    </div>
  )
}

function DetailsSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-8">
      <div className="h-8 w-32 animate-pulse rounded-full bg-surface-2" />
      <div className="h-56 animate-pulse rounded-card bg-surface-2" />
      <div className="h-48 animate-pulse rounded-card bg-surface-2" />
    </div>
  )
}
