import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toAccount } from '@/lib/mappers'
import { accountRows } from '@/test/fixtures'
import TransferPage from './TransferPage'

const queries = vi.hoisted(() => ({ useAccounts: vi.fn(), useTransfer: vi.fn() }))
vi.mock('@/hooks/queries', () => queries)

const mutateAsync = vi.fn()
const accounts = accountRows.map(toAccount)

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue('transfer-id')
  queries.useAccounts.mockReturnValue({ data: accounts, isPending: false, isError: false, refetch: vi.fn() })
  queries.useTransfer.mockReturnValue({ mutateAsync, isPending: false, error: null })
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <TransferPage />
    </MemoryRouter>,
  )

const amount = () => screen.getByRole('textbox', { name: 'Amount' })
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Move money' }))

describe('TransferPage', () => {
  it('starts from checking into the vault, with balances in the source list', () => {
    renderPage()
    expect(screen.getByRole('combobox', { name: 'From' })).toHaveDisplayValue('Everyday Checking · $12,640.55')
    expect(screen.getByRole('combobox', { name: 'To' })).toHaveDisplayValue('Obsidian Vault · $35,572.52')
  })

  it('sends the amount as integer cents and confirms with the same verb', async () => {
    renderPage()
    await userEvent.type(amount(), '25.50')
    await submit()
    expect(mutateAsync).toHaveBeenCalledWith({
      fromId: accounts[0]!.id,
      toId: accounts[1]!.id,
      amount: 2550,
      description: '',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Moved $25.50 to Obsidian Vault')
  })

  it('explains an invalid amount next to the field', async () => {
    renderPage()
    await userEvent.type(amount(), '1.999')
    await submit()
    expect(amount()).toHaveAccessibleDescription(/Enter an amount like 25\.50/)
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('blocks moving money into the same account', async () => {
    renderPage()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'To' }), 'Everyday Checking · $12,640.55')
    await userEvent.type(amount(), '10')
    await submit()
    expect(screen.getByRole('combobox', { name: 'To' })).toHaveAccessibleDescription(/Choose a different account/)
  })

  it('shows server errors in plain words', () => {
    queries.useTransfer.mockReturnValue({ mutateAsync, isPending: false, error: new Error('insufficient_funds') })
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent("The source account doesn't have enough money")
  })

  it('lets you start another transfer after a confirmation', async () => {
    renderPage()
    await userEvent.type(amount(), '5')
    await submit()
    await userEvent.click(await screen.findByRole('button', { name: 'Make another transfer' }))
    expect(amount()).toHaveValue('')
  })
})

describe('TransferPage summary', () => {
  const summary = () => screen.getByRole('region', { name: 'Summary' })

  it('shows the source balance after the transfer as you type', async () => {
    renderPage()
    await userEvent.type(amount(), '25.50')
    expect(within(summary()).getByText('$12,615.05')).toHaveClass('sr-only')
  })

  it('mentions the APY when money goes into the vault', () => {
    renderPage()
    expect(within(summary()).getByText('Earns 4.25% APY')).toBeInTheDocument()
  })

  it('swaps source and destination', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Swap accounts' }))
    expect(screen.getByRole('combobox', { name: 'From' })).toHaveDisplayValue('Obsidian Vault · $35,572.52')
    expect(screen.getByRole('combobox', { name: 'To' })).toHaveDisplayValue('Everyday Checking · $12,640.55')
    expect(within(summary()).queryByText('Earns 4.25% APY')).not.toBeInTheDocument()
  })
})
