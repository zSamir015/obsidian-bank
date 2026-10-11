import { act, render, screen } from '@testing-library/react'
import { lazy, type ComponentType } from 'react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toCard } from '@/lib/mappers'
import { cardRows } from '@/test/fixtures'
import type { Card3DProps } from './Card3D'
import { CardVisual } from './CardVisual'

const capabilities = vi.hoisted(() => ({ prefersReducedMotion: vi.fn(), supportsWebGL: vi.fn() }))
vi.mock('./capabilities', () => capabilities)

const [black, platinum] = cardRows.map(toCard) as [ReturnType<typeof toCard>, ReturnType<typeof toCard>]

function Fake3D({ card, onFailure }: Card3DProps) {
  return (
    <div data-card-visual="3d" data-frozen={card.isFrozen}>
      <button type="button" onClick={onFailure}>
        lose context
      </button>
    </div>
  )
}

const working3D = vi.fn(() => Promise.resolve({ default: Fake3D }))
// A fresh lazy component per test, so each one observes whether the chunk is requested.
let Lazy3D: ComponentType<Card3DProps>
const visual = () => document.querySelector('[data-card-visual]')

beforeEach(() => {
  working3D.mockClear()
  Lazy3D = lazy(working3D)
  capabilities.prefersReducedMotion.mockReturnValue(false)
  capabilities.supportsWebGL.mockReturnValue(true)
})

describe('CardVisual', () => {
  it('renders the 3D card when WebGL is available and motion is welcome', async () => {
    render(<CardVisual card={black} Card3D={Lazy3D} />)
    expect(await screen.findByRole('button', { name: 'lose context' })).toBeInTheDocument()
    expect(visual()).toHaveAttribute('data-card-visual', '3d')
  })

  it('shows the static card while the 3D chunk loads', () => {
    render(<CardVisual card={black} Card3D={lazy(() => new Promise<{ default: typeof Fake3D }>(() => {}))} />)
    expect(visual()).toHaveAttribute('data-card-visual', 'static')
  })

  it('never loads three.js for users who prefer reduced motion', () => {
    capabilities.prefersReducedMotion.mockReturnValue(true)
    render(<CardVisual card={black} Card3D={Lazy3D} />)
    expect(visual()).toHaveAttribute('data-card-visual', 'static')
    expect(working3D).not.toHaveBeenCalled()
  })

  it('falls back to the static card without WebGL', () => {
    capabilities.supportsWebGL.mockReturnValue(false)
    render(<CardVisual card={black} Card3D={Lazy3D} />)
    expect(visual()).toHaveAttribute('data-card-visual', 'static')
    expect(working3D).not.toHaveBeenCalled()
  })

  it('falls back to the static card if the 3D chunk fails to load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <CardVisual
        card={black}
        Card3D={lazy(() => Promise.reject(new Error('Failed to fetch dynamically imported module')))}
      />,
    )
    await act(async () => {})
    expect(visual()).toHaveAttribute('data-card-visual', 'static')
  })

  it('falls back to the static card when the WebGL context is lost', async () => {
    render(<CardVisual card={black} Card3D={Lazy3D} />)
    await userEvent.click(await screen.findByRole('button', { name: 'lose context' }))
    expect(visual()).toHaveAttribute('data-card-visual', 'static')
  })

  it('passes the frozen state to whichever card is shown', async () => {
    const { rerender } = render(<CardVisual card={platinum} Card3D={Lazy3D} />)
    expect(await screen.findByRole('button', { name: 'lose context' })).toBeInTheDocument()
    expect(visual()).toHaveAttribute('data-frozen', 'true')
    capabilities.prefersReducedMotion.mockReturnValue(true)
    rerender(<CardVisual key="static" card={platinum} Card3D={Lazy3D} />)
    expect(visual()).toHaveAttribute('data-frozen', 'true')
  })
})

describe('StaticCard', () => {
  it('shows tier, last four digits, holder, expiry and the Obsidian mark, as decoration', async () => {
    capabilities.supportsWebGL.mockReturnValue(false)
    render(<CardVisual card={black} Card3D={Lazy3D} />)
    const card = visual()!
    expect(card).toHaveAttribute('aria-hidden', 'true')
    expect(card).toHaveTextContent('Black')
    expect(card).toHaveTextContent('•••• 4821')
    expect(card).toHaveTextContent('OBSIDIAN MEMBER')
    expect(card).toHaveTextContent('10/29')
    expect(card).toHaveTextContent('Obsidian')
    expect(card.textContent).not.toMatch(/\d{5,}/)
  })
})

describe('CardVisual faces', () => {
  it('passes the requested face to the 3D card', async () => {
    function FaceProbe({ face }: Card3DProps) {
      return <div data-card-visual="3d" data-face={face} />
    }
    render(<CardVisual card={black} face="back" Card3D={FaceProbe} />)
    expect(await screen.findByText('', { selector: '[data-face="back"]' })).toBeInTheDocument()
  })

  it('shows the designed back on the static card, with a decorative CVV only', () => {
    capabilities.supportsWebGL.mockReturnValue(false)
    render(<CardVisual card={black} face="back" />)
    const card = visual()!
    expect(card).toHaveAttribute('data-face', 'back')
    expect(card).toHaveAttribute('aria-hidden', 'true')
    expect(card).toHaveTextContent('•••')
    expect(card).toHaveTextContent('Demo card, not a payment card.')
    expect(card.textContent).not.toMatch(/\d{3,}/)
  })
})
