import { describe, expect, it } from 'vitest'
import type { Cents } from '@/types/bank'
import { minimumLimit, validateCardLimit } from './limit'

const spent = 1_284_750 as Cents // $12,847.50

describe('minimumLimit', () => {
  it('is what has been spent, rounded up to whole dollars', () => {
    expect(minimumLimit(spent)).toBe(1_284_800)
    expect(minimumLimit(1_284_800 as Cents)).toBe(1_284_800)
  })

  it('never goes below $500', () => {
    expect(minimumLimit(0 as Cents)).toBe(50_000)
    expect(minimumLimit(31_204 as Cents)).toBe(50_000)
  })
})

describe('validateCardLimit', () => {
  it.each([
    ['50000', 5_000_000],
    ['50,000', 5_000_000],
    ['20000', 2_000_000],
    ['12848', 1_284_800],
  ])('accepts %j as %i cents', (input, cents) => {
    expect(validateCardLimit(input, spent)).toEqual({ ok: true, cents })
  })

  it.each([
    ['500', 50_000],
    ['100000', 10_000_000],
  ])('accepts the range boundary %j on a card with nothing spent', (input, cents) => {
    expect(validateCardLimit(input, 0 as Cents)).toEqual({ ok: true, cents })
  })

  it.each([
    ['', 'Enter a limit.'],
    ['abc', 'Enter a limit in whole dollars, like 15000.'],
    ['20000.50', 'Use whole dollars for the limit, like 15000.'],
    ['499', 'Choose a limit between $500 and $100,000.'],
    ['100001', 'Choose a limit between $500 and $100,000.'],
    ['12847', "Choose at least $12,848: that's what has already been spent on this card, rounded up."],
  ])('rejects %j with a clear message', (input, error) => {
    expect(validateCardLimit(input, spent)).toEqual({ ok: false, error })
  })
})
