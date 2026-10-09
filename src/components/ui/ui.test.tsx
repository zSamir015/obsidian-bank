import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Cents } from '@/types/bank'
import { Button, ButtonLink } from './Button'
import { ErrorMessage } from './ErrorMessage'
import { Money } from './Money'

describe('Money', () => {
  it('renders smaller cents but announces the full amount once', () => {
    const { container } = render(<Money cents={4821307 as Cents} />)
    expect(screen.getByText('$48,213.07')).toHaveClass('sr-only')
    const visual = container.querySelector('[aria-hidden="true"]')!
    expect(visual).toHaveTextContent('$48,213.07')
    expect(visual.querySelector('[data-part="cents"]')).toHaveTextContent('.07')
  })

  it.each([
    ['credit', '+$12.50'],
    ['debit', '−$12.50'],
  ] as const)('shows the %s direction as a sign, not a color', (type, text) => {
    render(<Money cents={1250 as Cents} type={type} />)
    expect(screen.getByText(text)).toBeInTheDocument()
  })
})

describe('Button', () => {
  it('blocks clicks and reports progress while loading', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Move money
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Move money' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Cancel</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('renders navigation as a link', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/activity">View activity</ButtonLink>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'View activity' })).toHaveAttribute('href', '/activity')
  })
})

describe('ErrorMessage', () => {
  it('pairs the danger color with an icon and text, announced as an alert', () => {
    render(<ErrorMessage>Couldn't load your accounts.</ErrorMessage>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent("Couldn't load your accounts.")
    expect(alert.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('offers a retry action when given one', async () => {
    const onRetry = vi.fn()
    render(<ErrorMessage onRetry={onRetry}>Couldn't load your accounts.</ErrorMessage>)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
