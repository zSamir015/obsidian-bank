import { describe, expect, it } from 'vitest'
import { formatShortDate, isInCurrentMonth } from './dates'

describe('formatShortDate', () => {
  it('uses US month-first short dates', () => {
    expect(formatShortDate('2026-10-08T15:00:00')).toBe('Oct 8')
  })
})

describe('isInCurrentMonth', () => {
  const now = new Date(2026, 9, 9)
  it.each([
    ['2026-10-01T00:00:00', true],
    ['2026-09-30T23:59:59', false],
    ['2025-10-15T12:00:00', false],
  ])('%s → %s', (iso, expected) => {
    expect(isInCurrentMonth(iso, now)).toBe(expected)
  })
})
