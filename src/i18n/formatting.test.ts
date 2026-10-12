import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { dayLabel, formatShortDate, groupByDay } from '@/lib/dates'
import { asCents, formatDollars, formatMoney, formatMoneyParts } from '@/lib/money'
import type { Locale } from './locales'
import { activateLocale, formatNumber, getMessages, intlLocale } from './runtime'

// The same formatting cases for every language, so neither one is covered by accident only.
const cases: Record<
  Locale,
  {
    intl: string
    money: [number, string][]
    parts: { whole: string; cents: string }
    dollars: string
    numbers: [number, string][]
    shortDate: string
    olderYear: string
    counts: [number, string][]
  }
> = {
  en: {
    intl: 'en-US',
    money: [
      [123456, '$1,234.56'],
      [-4250, '-$42.50'],
      [0, '$0.00'],
    ],
    parts: { whole: '$1,234', cents: '.56' },
    dollars: '$10,000',
    numbers: [
      [7, '7'],
      [1234, '1,234'],
    ],
    shortDate: 'Oct 7',
    olderYear: 'Dec 31, 2025',
    counts: [
      [1, '1 transaction'],
      [1234, '1,234 transactions'],
    ],
  },
  es: {
    intl: 'es-US',
    money: [
      [123456, '$1,234.56'],
      [-4250, '-$42.50'],
      [0, '$0.00'],
    ],
    parts: { whole: '$1,234', cents: '.56' },
    dollars: '$10,000',
    numbers: [
      [7, '7'],
      [1234, '1,234'],
    ],
    shortDate: '7 oct',
    olderYear: '31 dic 2025',
    counts: [
      [1, '1 movimiento'],
      [1234, '1,234 movimientos'],
    ],
  },
}

afterEach(async () => {
  await activateLocale('en')
})

describe.each(Object.entries(cases) as [Locale, (typeof cases)[Locale]][])('formatting in %s', (locale, expected) => {
  const now = new Date(2026, 9, 11, 12)

  beforeEach(async () => {
    await activateLocale(locale)
  })

  it('uses the Intl locale for the language', () => {
    expect(intlLocale()).toBe(expected.intl)
  })

  it.each(expected.money)('writes %i cents as %s', (cents, text) => {
    expect(formatMoney(asCents(cents))).toBe(text)
  })

  it('splits whole dollars and cents', () => {
    expect(formatMoneyParts(asCents(123456))).toEqual(expected.parts)
  })

  it('writes whole-dollar amounts without cents', () => {
    expect(formatDollars(asCents(1_000_000))).toBe(expected.dollars)
  })

  it.each(expected.numbers)('writes %i as %s', (value, text) => {
    expect(formatNumber(value)).toBe(text)
  })

  it('pluralises counts', () => {
    for (const [count, text] of expected.counts) {
      expect(getMessages().activity.count(count, formatNumber(count))).toBe(text)
    }
  })

  it('writes short dates and day labels', () => {
    const t = getMessages()
    expect(formatShortDate(new Date(2026, 9, 7, 10).toISOString())).toBe(expected.shortDate)
    expect(dayLabel(new Date(2026, 9, 11, 9).toISOString(), now)).toBe(t.dates.today)
    expect(dayLabel(new Date(2026, 9, 10, 23, 59).toISOString(), now)).toBe(t.dates.yesterday)
    expect(dayLabel(new Date(2026, 9, 7, 10).toISOString(), now)).toBe(expected.shortDate)
    expect(dayLabel(new Date(2025, 11, 31, 9).toISOString(), now)).toBe(expected.olderYear)
  })

  it('labels day groups in the language', () => {
    const items = [
      { date: new Date(2026, 9, 11, 9).toISOString() },
      { date: new Date(2026, 9, 10, 9).toISOString() },
      { date: new Date(2026, 9, 7, 9).toISOString() },
    ]
    const t = getMessages()
    expect(groupByDay(items, now).map((group) => group.label)).toEqual([
      t.dates.today,
      t.dates.yesterday,
      expected.shortDate,
    ])
  })
})
