import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { asCents } from '@/lib/money'
import { toAccount, toTransaction } from '@/lib/mappers'
import { accountRows, transactionRows } from '@/test/fixtures'
import type { Transaction } from '@/types/bank'
import ActivityPage from './ActivityPage'

const queries = vi.hoisted(() => ({ useAccounts: vi.fn(), useTransactions: vi.fn() }))
vi.mock('@/hooks/accountQueries', () => ({ useAccounts: queries.useAccounts }))
vi.mock('@/hooks/transactionQueries', () => ({ useTransactions: queries.useTransactions }))

const ok = <T,>(data: T) => ({ data, isPending: false, isError: false, refetch: vi.fn() })
const transactions = transactionRows.map(toTransaction)

beforeEach(() => {
  queries.useAccounts.mockReturnValue(ok(accountRows.map(toAccount)))
  queries.useTransactions.mockReturnValue(ok(transactions))
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <ActivityPage />
    </MemoryRouter>,
  )

const merchants = () =>
  within(screen.getByRole('region', { name: 'Transactions' }))
    .queryAllByRole('listitem')
    .map((li) => li.querySelector('p')!.textContent)

describe('ActivityPage', () => {
  it('groups transactions under day headings, newest first', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument()
    expect(merchants()[0]).toBe('Uber')
  })

  it('searches merchants', async () => {
    renderPage()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search transactions' }), 'delta')
    expect(merchants()).toEqual(['Delta Air Lines'])
    expect(screen.getByText('1 transaction')).toBeInTheDocument()
  })

  it('filters money in', async () => {
    renderPage()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'Money in')
    expect(merchants()).toEqual(['Payroll — Obsidian Labs Inc.'])
  })

  it('offers to clear filters when nothing matches', async () => {
    renderPage()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search transactions' }), 'zzz')
    expect(screen.getByText('No transactions match these filters.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(merchants()).toHaveLength(transactions.length)
  })

  it('shows 30 transactions at a time', async () => {
    const many: Transaction[] = Array.from({ length: 45 }, (_, i) => ({
      ...transactions[0]!,
      id: `t${i}`,
      merchant: `Merchant ${i}`,
      amount: asCents(100 + i),
    }))
    queries.useTransactions.mockReturnValue(ok(many))
    renderPage()
    expect(merchants()).toHaveLength(30)
    await userEvent.click(screen.getByRole('button', { name: 'Show more' }))
    expect(merchants()).toHaveLength(45)
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument()
  })

  it('explains a failed load and retries it', async () => {
    const refetch = vi.fn()
    queries.useTransactions.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch })
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your transactions.")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })
})
