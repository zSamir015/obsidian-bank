import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toAccount } from '@/lib/mappers'
import { accountRows } from '@/test/fixtures'
import TransferPage from './TransferPage'

const queries = vi.hoisted(() => ({ useAccounts: vi.fn(), useTransfer: vi.fn(), useExternalTransfer: vi.fn() }))
vi.mock('@/hooks/accountQueries', () => ({ useAccounts: queries.useAccounts }))
vi.mock('@/hooks/transferQueries', () => ({
  useTransfer: queries.useTransfer,
  useExternalTransfer: queries.useExternalTransfer,
}))

const mutateAsync = vi.fn()
const sendExternal = vi.fn()
const accounts = accountRows.map(toAccount)

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue('transfer-id')
  queries.useAccounts.mockReturnValue({ data: accounts, isPending: false, isError: false, refetch: vi.fn() })
  queries.useTransfer.mockReturnValue({ mutateAsync, isPending: false, error: null })
  sendExternal.mockReset().mockResolvedValue('external-id')
  queries.useExternalTransfer.mockReturnValue({ mutateAsync: sendExternal, isPending: false, error: null })
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
    expect(screen.getByRole('combobox', { name: 'From' })).toHaveDisplayValue(
      'Everyday Checking · $12,640.55 available',
    )
    expect(screen.getByRole('combobox', { name: 'To' })).toHaveDisplayValue('Obsidian Vault · $35,572.52 available')
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
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'To' }),
      'Everyday Checking · $12,640.55 available',
    )
    await userEvent.type(amount(), '10')
    await submit()
    expect(screen.getByRole('combobox', { name: 'To' })).toHaveAccessibleDescription(/Choose a different account/)
  })

  it('shows server errors in plain words', () => {
    queries.useTransfer.mockReturnValue({ mutateAsync, isPending: false, error: new Error('insufficient_funds') })
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent("The source account doesn't have enough available money")
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
    expect(within(summary()).getByText('$13,913.44')).toHaveClass('sr-only')
  })

  it('mentions the APY when money goes into the vault', () => {
    renderPage()
    expect(within(summary()).getByText('Earns 4.25% APY')).toBeInTheDocument()
  })

  it('swaps source and destination', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Swap accounts' }))
    expect(screen.getByRole('combobox', { name: 'From' })).toHaveDisplayValue('Obsidian Vault · $35,572.52 available')
    expect(screen.getByRole('combobox', { name: 'To' })).toHaveDisplayValue('Everyday Checking · $12,640.55 available')
    expect(within(summary()).queryByText('Earns 4.25% APY')).not.toBeInTheDocument()
  })
})

describe('TransferPage external transfers', () => {
  const FULL_ACCOUNT_NUMBER = '000123456789'

  const openExternal = async () => {
    renderPage()
    await userEvent.click(screen.getByRole('radio', { name: 'To another bank' }))
  }
  const field = (name: string) => screen.getByRole('textbox', { name })
  const send = () => userEvent.click(screen.getByRole('button', { name: 'Send transfer' }))

  async function fillValidForm({ amount = '125.50' } = {}) {
    await userEvent.type(field('Recipient name'), 'Ada Lovelace')
    await userEvent.type(field('Routing number'), '021000021')
    await userEvent.type(field('Account number'), FULL_ACCOUNT_NUMBER)
    await userEvent.tab()
    await userEvent.type(field('Amount'), amount)
  }

  it('offers the external form from an accessible choice, with internal transfers as the default', async () => {
    renderPage()
    expect(screen.getByRole('group', { name: 'Where the money goes' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Between my accounts' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'To another bank' }))
    expect(screen.getByRole('button', { name: 'Send transfer' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'To' })).not.toBeInTheDocument()
  })

  it('says plainly that no real payment network is contacted and that settlement is simulated on read', async () => {
    await openExternal()
    const notice = screen.getByRole('note')
    expect(notice).toHaveTextContent("doesn't connect to ACH, Fedwire or any other payment network")
    expect(notice).toHaveTextContent('no money leaves the app')
    expect(notice).toHaveTextContent('the next time your balances or activity load')
  })

  it.each([
    ['', 'Enter the 9-digit routing number.'],
    ['02100002', 'Routing numbers have exactly 9 digits.'],
    ['021000022', "That isn't a valid US routing number. Check the 9 digits."],
    ['130000006', "That isn't a valid US routing number. Check the 9 digits."],
  ])('explains an invalid routing number %j', async (routing, message) => {
    await openExternal()
    if (routing) await userEvent.type(field('Routing number'), routing)
    await send()
    expect(field('Routing number')).toHaveAccessibleDescription(new RegExp(message.replace(/[.?]/g, '\\$&')))
    expect(sendExternal).not.toHaveBeenCalled()
  })

  it('replaces the account number with its last four digits when you leave the field', async () => {
    await openExternal()
    await userEvent.type(field('Account number'), FULL_ACCOUNT_NUMBER)
    expect(field('Account number')).toHaveValue(FULL_ACCOUNT_NUMBER)
    await userEvent.tab()
    expect(field('Account number')).toHaveValue('Ending in 6789')
    expect(field('Account number')).toHaveAttribute('readonly')
    expect(screen.queryByDisplayValue(FULL_ACCOUNT_NUMBER)).not.toBeInTheDocument()
    expect(document.body.innerHTML).not.toContain(FULL_ACCOUNT_NUMBER)
  })

  it('lets you change the account number, starting from an empty, focused field', async () => {
    await openExternal()
    await userEvent.type(field('Account number'), FULL_ACCOUNT_NUMBER)
    await userEvent.tab()
    await userEvent.click(screen.getByRole('button', { name: 'Change account number' }))
    expect(field('Account number')).toHaveValue('')
    expect(field('Account number')).toHaveFocus()
  })

  it('rejects account numbers that are not 4 to 17 digits', async () => {
    await openExternal()
    await userEvent.type(field('Account number'), '123')
    await userEvent.tab()
    expect(field('Account number')).toHaveAccessibleDescription(/Account numbers have 4 to 17 digits/)
    await send()
    expect(sendExternal).not.toHaveBeenCalled()
  })

  it('asks for the account number when it was left empty', async () => {
    await openExternal()
    await send()
    expect(field('Account number')).toHaveAccessibleDescription(/Enter the recipient's account number, 4 to 17 digits/)
  })

  it('sends integer cents and only the last four digits of the account number', async () => {
    await openExternal()
    await fillValidForm()
    await userEvent.type(field('Note'), 'Rent')
    await send()
    expect(sendExternal).toHaveBeenCalledExactlyOnceWith({
      fromId: accounts[0]!.id,
      amount: 12_550,
      routingNumber: '021000021',
      accountLast4: '6789',
      recipientName: 'Ada Lovelace',
      note: 'Rent',
    })
    expect(JSON.stringify(sendExternal.mock.calls)).not.toContain(FULL_ACCOUNT_NUMBER)
  })

  it('also masks and submits when Enter is pressed inside the account number field', async () => {
    await openExternal()
    await userEvent.type(field('Recipient name'), 'Ada Lovelace')
    await userEvent.type(field('Routing number'), '021000021')
    await userEvent.type(field('Amount'), '20')
    await userEvent.type(field('Account number'), `${FULL_ACCOUNT_NUMBER}{Enter}`)
    expect(sendExternal).toHaveBeenCalledWith(expect.objectContaining({ accountLast4: '6789' }))
    expect(JSON.stringify(sendExternal.mock.calls)).not.toContain(FULL_ACCOUNT_NUMBER)
  })

  it('enforces the $10,000 per-transfer limit before sending', async () => {
    queries.useAccounts.mockReturnValue({
      data: accounts.map((a) => ({ ...a, availableBalance: 5_000_000 })),
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    await openExternal()
    await fillValidForm({ amount: '10000.01' })
    await send()
    expect(field('Amount')).toHaveAccessibleDescription(/External transfers are limited to \$10,000\.00 each/)
    expect(sendExternal).not.toHaveBeenCalled()
  })

  it("blocks amounts above the source account's available balance", async () => {
    queries.useAccounts.mockReturnValue({
      data: accounts.map((a) => ({ ...a, availableBalance: 50_000 })),
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    await openExternal()
    await fillValidForm({ amount: '500.01' })
    await send()
    expect(field('Amount')).toHaveAccessibleDescription(/more than this account has available/)
  })

  it('confirms with the last four digits and explains that the transfer is pending', async () => {
    await openExternal()
    await fillValidForm()
    await send()
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Sent $125.50 to Ada Lovelace')
    expect(status).toHaveTextContent('Account ending 6789, routing number 021000021.')
    expect(status).toHaveTextContent("It's pending")
    expect(status).toHaveTextContent('No real payment network was contacted.')
    expect(status).not.toHaveTextContent(FULL_ACCOUNT_NUMBER)
  })

  it.each([
    ['daily_limit_exceeded', 'over the $25,000.00 limit for external transfers in 24 hours'],
    ['insufficient_funds', "doesn't have enough available money"],
    ['invalid_routing_number', "That routing number isn't valid"],
  ])('shows the server error %s in plain words', async (code, message) => {
    queries.useExternalTransfer.mockReturnValue({ mutateAsync: sendExternal, isPending: false, error: new Error(code) })
    await openExternal()
    expect(screen.getByRole('alert')).toHaveTextContent(message)
  })
})
