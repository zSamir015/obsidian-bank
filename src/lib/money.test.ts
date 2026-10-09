import { describe, expect, it } from 'vitest'
import { formatCents, parseAmountToCents } from './money'

describe('parseAmountToCents', () => {
  it.each([
    ['12', 1200],
    ['12,5', 1250],
    ['12.50', 1250],
    ['0,01', 1],
    [' 7 ', 700],
  ])('parses %j as %i cents', (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected)
  })

  it.each(['', 'abc', '-5', '1,234', '1.2.3', '12,'])('rejects %j', (input) => {
    expect(parseAmountToCents(input)).toBeNull()
  })

  it('avoids floating point errors', () => {
    expect(parseAmountToCents('0,29')).toBe(29)
    expect(parseAmountToCents('1.10')).toBe(110)
  })
})

describe('formatCents', () => {
  it('formats cents as euros', () => {
    expect(formatCents(123456)).toMatch(/1\.?234,56\s€/)
  })

  it('formats negative amounts', () => {
    expect(formatCents(-500)).toMatch(/-5,00\s€/)
  })
})
