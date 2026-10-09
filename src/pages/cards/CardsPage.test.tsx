import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toCard } from '@/lib/mappers'
import { cardRows } from '@/test/fixtures'
import type { CreditCard } from '@/types/bank'
import CardsPage from './CardsPage'

const queries = vi.hoisted(() => ({ useCards: vi.fn(), useFreezeCard: vi.fn(), useUpdateCardLimit: vi.fn() }))
vi.mock('@/hooks/queries', () => queries)
// The visual is covered in CardVisual.test.tsx; here it only reports what it was given.
vi.mock('./CardVisual', () => ({
  CardVisual: ({ card }: { card: CreditCard }) => (
    <div data-testid="visual" data-card={card.last4} data-frozen={card.isFrozen} />
  ),
}))

const freeze = vi.fn()
const updateLimit = vi.fn()
const cards = cardRows.map(toCard)

beforeEach(() => {
  freeze.mockReset().mockResolvedValue(true)
  updateLimit.mockReset().mockResolvedValue(2_000_000)
  queries.useCards.mockReturnValue({ data: cards, isPending: false, isError: false, refetch: vi.fn() })
  queries.useFreezeCard.mockReturnValue({ mutateAsync: freeze, isPending: false })
  queries.useUpdateCardLimit.mockReturnValue({ mutateAsync: updateLimit, isPending: false })
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <CardsPage />
    </MemoryRouter>,
  )
const status = () => screen.getByRole('status')

describe('CardsPage', () => {
  it("lists only the user's cards by tier and last four digits", () => {
    renderPage()
    const picker = screen.getByRole('radiogroup', { name: 'Card' })
    expect(
      within(picker)
        .getAllByRole('radio')
        .map((r) => r.getAttribute('aria-label') ?? r.textContent),
    ).toEqual(['Black •••• 4821', 'Platinum •••• 0937'])
    expect(within(picker).queryByText(/corporate/i)).not.toBeInTheDocument()
  })

  it('switches the visual and the details to the selected card', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('radio', { name: 'Platinum •••• 0937' }))
    expect(screen.getByTestId('visual')).toHaveAttribute('data-card', '0937')
    expect(screen.getByRole('button', { name: 'Unfreeze card' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Credit limit').closest('div')).toHaveTextContent('$15,000.00')
  })

  it('freezes a card and announces the result', async () => {
    renderPage()
    const button = screen.getByRole('button', { name: 'Freeze card' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(button)
    expect(freeze).toHaveBeenCalledWith({ cardId: cards[0]!.id, frozen: true })
    expect(status()).toHaveTextContent('Black card ending in 4821 frozen.')
  })

  it('explains a failed freeze in plain words', async () => {
    freeze.mockRejectedValue(new Error('card_not_found'))
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Freeze card' }))
    expect(screen.getByRole('alert')).toHaveTextContent("This card isn't available anymore. Reload and try again.")
  })

  it('changes the limit in cents and announces it', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Change limit' }))
    const input = screen.getByRole('textbox', { name: 'New credit limit' })
    expect(input).toHaveValue('50000')
    await userEvent.clear(input)
    await userEvent.type(input, '20000')
    await userEvent.click(screen.getByRole('button', { name: 'Save limit' }))
    expect(updateLimit).toHaveBeenCalledWith({ cardId: cards[0]!.id, limit: 2_000_000 })
    expect(status()).toHaveTextContent('Limit updated to $20,000.00.')
  })

  it('checks the limit before sending it', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Change limit' }))
    const input = screen.getByRole('textbox', { name: 'New credit limit' })
    await userEvent.clear(input)
    await userEvent.type(input, '12847')
    await userEvent.click(screen.getByRole('button', { name: 'Save limit' }))
    expect(input).toHaveAccessibleDescription(/can't be lower than what's already been spent/)
    expect(updateLimit).not.toHaveBeenCalled()
  })

  it('shows server limit errors next to the field', async () => {
    updateLimit.mockRejectedValue(new Error('limit_out_of_range'))
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Change limit' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save limit' }))
    expect(screen.getByRole('textbox', { name: 'New credit limit' })).toHaveAccessibleDescription(
      /Choose a limit between \$500 and \$100,000\./,
    )
  })

  it('explains a failed load and retries it', async () => {
    const refetch = vi.fn()
    queries.useCards.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch })
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your cards.")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })

  it('says so when there are no cards', () => {
    queries.useCards.mockReturnValue({ data: [], isPending: false, isError: false, refetch: vi.fn() })
    renderPage()
    expect(screen.getByText("You don't have any cards yet.")).toBeInTheDocument()
  })
})
