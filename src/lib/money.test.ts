import { describe, expect, it } from 'vitest'
import type { Cents } from '@/types/bank'
import { asCents, formatMoney, formatMoneyParts, parseCents, toAmountInput, toCents } from './money'

describe('toCents', () => {
  it.each([
    ['0', 0],
    ['12', 1200],
    ['12.5', 1250],
    ['12.50', 1250],
    ['0.01', 1],
    [' 7 ', 700],
    ['1,234.56', 123456],
    ['-5', -500],
    ['-0.29', -29],
  ])('parses %j as %i cents', (input, expected) => {
    expect(toCents(input)).toBe(expected)
  })

  it.each([
    [0, 0],
    [19.99, 1999],
    [-3.1, -310],
  ])('accepts the number %d', (input, expected) => {
    expect(toCents(input)).toBe(expected)
  })

  it('never goes through float multiplication', () => {
    expect(toCents('0.29')).toBe(29) // 0.29 * 100 === 28.999999999999996
    expect(toCents('1.10')).toBe(110)
    expect(toCents('1.15')).toBe(115) // 1.15 * 100 === 114.99999999999999
  })

  it('returns +0 for negative zero', () => {
    expect(Object.is(toCents('-0'), 0)).toBe(true)
  })

  it.each([
    '',
    ' ',
    'abc',
    '1.234',
    '12.',
    '.5',
    '1,23',
    '1,2345.00',
    '1.2.3',
    '--5',
    '+5',
    '1e3',
    '$5',
    'Infinity',
    'NaN',
  ])('rejects %j', (input) => {
    expect(() => toCents(input)).toThrow(RangeError)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0.001, 0.1 + 0.2, 1e21])(
    'rejects the number %d',
    (input) => {
      expect(() => toCents(input)).toThrow(RangeError)
    },
  )

  it('rejects amounts beyond the safe integer range', () => {
    expect(() => toCents('90071992547409.92')).toThrow(RangeError)
    expect(toCents('90071992547409.91')).toBe(Number.MAX_SAFE_INTEGER)
  })
})

describe('parseCents', () => {
  it('returns null instead of throwing', () => {
    expect(parseCents('12.345')).toBeNull()
    expect(parseCents('12.34')).toBe(1234)
  })
})

describe('asCents', () => {
  it('brands integer cents', () => {
    expect(asCents(1999)).toBe(1999)
  })

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53])('rejects %d', (input) => {
    expect(() => asCents(input)).toThrow(RangeError)
  })
})

describe('formatMoney', () => {
  it.each([
    [0, '$0.00'],
    [1, '$0.01'],
    [123456, '$1,234.56'],
    [-500, '-$5.00'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatMoney(cents as Cents)).toBe(expected)
  })
})

describe('formatMoneyParts', () => {
  it.each([
    [4821307, { whole: '$48,213', cents: '.07' }],
    [0, { whole: '$0', cents: '.00' }],
    [5, { whole: '$0', cents: '.05' }],
    [-123456, { whole: '$1,234', cents: '.56' }],
  ])('splits %i cents into whole and cents parts without the sign', (cents, expected) => {
    expect(formatMoneyParts(cents as Cents)).toEqual(expected)
  })
})

describe('toAmountInput', () => {
  it.each([
    [120000, '1200.00'],
    [5, '0.05'],
    [0, '0.00'],
    [123456789, '1234567.89'],
  ])('writes %i cents as %s for an editable field', (cents, text) => {
    expect(toAmountInput(cents as Cents)).toBe(text)
  })

  it('round-trips through toCents', () => {
    expect(toCents(toAmountInput(98999 as Cents))).toBe(98999)
  })
})
