import { useBudgets } from '@/hooks/budgetQueries'
import { useCards } from '@/hooks/cardQueries'
import type { Account, Transaction } from '@/types/bank'
import { CardsSection } from './CardsSection'
import { RecentActivity } from './RecentActivity'
import { SpendingSection } from './SpendingSection'
import type { QueryView } from './query'

export default function OverviewDetails({
  accounts,
  transactions,
}: {
  readonly accounts: readonly Account[] | undefined
  readonly transactions: QueryView<readonly Transaction[]>
}) {
  const cards = useCards()
  const budgets = useBudgets()

  return (
    <>
      <CardsSection cards={cards} />
      <SpendingSection transactions={transactions} budgets={budgets.data} />
      <RecentActivity transactions={transactions} accounts={accounts} />
    </>
  )
}
