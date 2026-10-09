import { describe, expect, it } from 'vitest'
import { formatApy } from './labels'

describe('formatApy', () => {
  it.each([
    [425, '4.25% APY'],
    [5, '0.05% APY'],
    [1000, '10.00% APY'],
  ])('formats %i basis points as %s', (bps, text) => {
    expect(formatApy(bps)).toBe(text)
  })
})
