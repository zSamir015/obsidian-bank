import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Cents } from '@/types/bank'
import { Button } from './Button'
import { Card } from './Card'
import { Input, MoneyInput, Select } from './form'
import { Money } from './Money'
import { Skeleton } from './Skeleton'

// A caller's className must replace the conflicting base class instead of competing with it
// (Tailwind would pick whichever utility comes later in the stylesheet).
describe('className overrides on base components', () => {
  it('Skeleton: a card-shaped placeholder is not also a pill', () => {
    const { container } = render(<Skeleton className="h-44 rounded-card" />)
    const el = container.firstElementChild!
    expect(el).toHaveClass('rounded-card', 'h-44')
    expect(el).not.toHaveClass('rounded-full')
  })

  it('Card: padding and surface can be replaced', () => {
    render(<Card className="bg-sunken p-8">x</Card>)
    const el = screen.getByText('x')
    expect(el).toHaveClass('bg-sunken', 'p-8', 'rounded-card')
    expect(el).not.toHaveClass('bg-surface', 'p-6')
  })

  it('MoneyInput: the large transfer amount field is taller than the default', () => {
    render(<MoneyInput aria-label="Amount" className="h-16 text-2xl" />)
    const el = screen.getByRole('textbox', { name: 'Amount' })
    expect(el).toHaveClass('h-16', 'pl-9')
    expect(el).not.toHaveClass('h-12')
  })

  it('Input and Select: width can be replaced', () => {
    render(
      <>
        <Input aria-label="Search" className="w-auto" />
        <Select aria-label="Type" className="w-auto" />
      </>,
    )
    for (const el of [
      screen.getByRole('textbox', { name: 'Search' }),
      screen.getByRole('combobox', { name: 'Type' }),
    ]) {
      expect(el).toHaveClass('w-auto')
      expect(el).not.toHaveClass('w-full')
    }
  })

  it('Button: a className color replaces the variant color', () => {
    render(<Button className="text-text">Go</Button>)
    const el = screen.getByRole('button', { name: 'Go' })
    expect(el).toHaveClass('text-text')
    expect(el).not.toHaveClass('text-bg')
  })

  it('Money: classes merge without duplicating', () => {
    const { container } = render(<Money cents={100 as Cents} className="tabular-nums text-xl" />)
    expect(container.firstElementChild!.className).toBe('tabular-nums text-xl')
  })
})
