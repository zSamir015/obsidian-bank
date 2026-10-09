import { useAccounts, useBudgets, useCards, useTransactions } from '@/hooks/queries'
import { AccountsSection } from './AccountsSection'
import { BalanceHero } from './BalanceHero'
import { CardsSection } from './CardsSection'
import { RecentActivity } from './RecentActivity'
import { SpendingSection } from './SpendingSection'

export default function OverviewPage() {
  const accounts = useAccounts()
  const cards = useCards()
  const transactions = useTransactions()
  const budgets = useBudgets()

  return (
    <div className="space-y-16 md:space-y-20">
      <BalanceHero accounts={accounts} transactions={transactions.data} />
      <AccountsSection accounts={accounts} />
      <CardsSection cards={cards} />
      <SpendingSection transactions={transactions} budgets={budgets.data} />
      <RecentActivity transactions={transactions} accounts={accounts.data} />
    </div>
  )
}
