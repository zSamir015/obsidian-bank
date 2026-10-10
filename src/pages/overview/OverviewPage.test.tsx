import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toAccount, toBudget, toCard, toTransaction } from '@/lib/mappers'
import { accountRows, budgetRows, cardRows, transactionRows } from '@/test/fixtures'
import OverviewPage from './OverviewPage'

const refetchAccounts = vi.fn()
const queries = vi.hoisted(() => ({
  useAccounts: vi.fn(),
  useCards: vi.fn(),
  useTransactions: vi.fn(),
  useBudgets: vi.fn(),
}))
vi.mock('@/hooks/accountQueries', () => ({ useAccounts: queries.useAccounts }))
vi.mock('@/hooks/budgetQueries', () => ({ useBudgets: queries.useBudgets }))
vi.mock('@/hooks/cardQueries', () => ({ useCards: queries.useCards }))
vi.mock('@/hooks/transactionQueries', () => ({ useTransactions: queries.useTransactions }))

const ok = <T,>(data: T) => ({ data, isPending: false, isError: false, refetch: vi.fn() })

beforeEach(() => {
  queries.useAccounts.mockReturnValue(ok(accountRows.map(toAccount)))
  queries.useCards.mockReturnValue(ok(cardRows.map(toCard)))
  queries.useTransactions.mockReturnValue(ok(transactionRows.map(toTransaction)))
  queries.useBudgets.mockReturnValue(ok(budgetRows.map(toBudget)))
})

const renderPage = async () => {
  render(
    <MemoryRouter>
      <OverviewPage />
    </MemoryRouter>,
  )
  await screen.findByRole('region', { name: 'Cards' })
}

describe('OverviewPage', () => {
  it('leads with total available funds and shows the settled ledger total secondarily', async () => {
    await renderPage()
    const hero = screen.getByRole('region', { name: 'Total available' })
    expect(within(hero).getByText('$48,213.07')).toBeInTheDocument()
    expect(within(hero).getByText('$49,511.46')).toBeInTheDocument()
    expect(within(hero).getByText(/Available excludes pending and under-review debits/)).toBeInTheDocument()
  })

  it("summarizes this month's money in and out, without transfers", async () => {
    await renderPage()
    const hero = screen.getByRole('region', { name: 'Total available' })
    expect(within(hero).getByText('+$4,125.00')).toBeInTheDocument()
    expect(within(hero).getByText('−$2,513.49')).toBeInTheDocument()
  })

  it('shows cards by last four digits only', async () => {
    await renderPage()
    const cards = screen.getByRole('region', { name: 'Cards' })
    expect(within(cards).getByText('4821')).toHaveClass('font-mono')
    for (const label of within(cards).getAllByText('Card ending in')) expect(label).toHaveClass('sr-only')
    expect(within(cards).getByText('Frozen')).toBeInTheDocument()
  })

  it('labels transactions that are not settled', async () => {
    await renderPage()
    const activity = screen.getByRole('region', { name: 'Recent activity' })
    expect(within(activity).getAllByText('Pending')).toHaveLength(2)
    expect(within(activity).getByText('Under review')).toBeInTheDocument()
  })

  it('explains a failed load and retries it', async () => {
    queries.useAccounts.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch: refetchAccounts })
    await renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your balance.")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetchAccounts).toHaveBeenCalled()
  })
})

describe('OverviewPage spending', () => {
  const spending = () => screen.getByRole('region', { name: 'Spending this month' })

  it('shows each budgeted category against its budget', async () => {
    await renderPage()
    // Money announces the full amount once through its sr-only text.
    expect(within(spending()).getByText('$1,200.00')).toHaveClass('sr-only')
    expect(within(spending()).getByRole('meter', { name: 'Travel: 94% of budget' })).toBeInTheDocument()
  })

  it('highlights only categories at 90% of their budget or more', async () => {
    await renderPage()
    expect(within(spending()).getByRole('meter', { name: /^Travel/ })).toHaveAttribute('data-near-limit', 'true')
    expect(within(spending()).getByRole('meter', { name: /^Services/ })).toHaveAttribute('data-near-limit', 'false')
  })

  it('shows only the amount for categories without a budget', async () => {
    await renderPage()
    expect(within(spending()).getByText('Corporate')).toBeInTheDocument()
    expect(within(spending()).queryByRole('meter', { name: /^Corporate/ })).not.toBeInTheDocument()
  })
})

describe('OverviewPage frozen card', () => {
  it('mutes a frozen card, not only its tag', async () => {
    await renderPage()
    const meter = screen.getByRole('meter', { name: 'Platinum card limit used' })
    expect(meter.closest('[data-frozen]')).toHaveAttribute('data-frozen', 'true')
    expect(screen.getByRole('meter', { name: 'Black card limit used' }).closest('[data-frozen]')).toHaveAttribute(
      'data-frozen',
      'false',
    )
  })
})

describe('OverviewPage card management', () => {
  it('links the Cards section to the cards page', async () => {
    await renderPage()
    expect(within(screen.getByRole('region', { name: 'Cards' })).getByRole('link', { name: 'Manage' })).toHaveAttribute(
      'href',
      '/cards',
    )
  })
})
