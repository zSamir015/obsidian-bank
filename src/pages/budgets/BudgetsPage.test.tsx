import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toBudget, toTransaction } from '@/lib/mappers'
import { budgetRows, transactionRows } from '@/test/fixtures'
import BudgetsPage from './BudgetsPage'

const queries = vi.hoisted(() => ({ useBudgets: vi.fn(), useTransactions: vi.fn(), useUpdateBudget: vi.fn() }))
vi.mock('@/hooks/queries', () => queries)

const ok = <T,>(data: T) => ({ data, isPending: false, isError: false, refetch: vi.fn() })
const mutateAsync = vi.fn()
const budgets = budgetRows.map(toBudget)

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue(undefined)
  queries.useBudgets.mockReturnValue(ok(budgets))
  queries.useTransactions.mockReturnValue(ok(transactionRows.map(toTransaction)))
  queries.useUpdateBudget.mockReturnValue({ mutateAsync, isPending: false, error: null })
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <BudgetsPage />
    </MemoryRouter>,
  )
const row = (name: string) => screen.getByRole('listitem', { name })

describe('BudgetsPage', () => {
  it('shows what is left in each budget', () => {
    renderPage()
    expect(within(row('Services')).getByText(/left/)).toHaveTextContent('$875.81')
    expect(within(row('Travel')).getByText(/left/)).toHaveTextContent('$74.70')
  })

  it('highlights budgets at 90% or more', () => {
    renderPage()
    expect(within(row('Travel')).getByRole('meter')).toHaveAttribute('data-near-limit', 'true')
    expect(within(row('Services')).getByRole('meter')).toHaveAttribute('data-near-limit', 'false')
  })

  it('lists spending without a budget, without a bar', () => {
    renderPage()
    expect(within(row('Corporate')).getByText('No budget')).toBeInTheDocument()
    expect(within(row('Corporate')).queryByRole('meter')).not.toBeInTheDocument()
  })

  it('edits a monthly limit in cents', async () => {
    renderPage()
    await userEvent.click(within(row('Travel')).getByRole('button', { name: 'Edit limit' }))
    const input = screen.getByRole('textbox', { name: 'Monthly limit for Travel' })
    expect(input).toHaveValue('1200.00')
    await userEvent.clear(input)
    await userEvent.type(input, '1500')
    await userEvent.click(screen.getByRole('button', { name: 'Save limit' }))
    expect(mutateAsync).toHaveBeenCalledWith({ id: budgets[0]!.id, limit: 150000 })
    expect(await within(row('Travel')).findByRole('button', { name: 'Edit limit' })).toBeInTheDocument()
  })

  it('rejects an invalid limit next to the field', async () => {
    renderPage()
    await userEvent.click(within(row('Travel')).getByRole('button', { name: 'Edit limit' }))
    const input = screen.getByRole('textbox', { name: 'Monthly limit for Travel' })
    await userEvent.clear(input)
    await userEvent.type(input, '0')
    await userEvent.click(screen.getByRole('button', { name: 'Save limit' }))
    expect(input).toHaveAccessibleDescription(/Enter a limit greater than \$0\.00/)
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('explains a failed load and retries it', async () => {
    const refetch = vi.fn()
    queries.useBudgets.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch })
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your budgets.")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })
})
