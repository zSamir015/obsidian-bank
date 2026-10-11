import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { dayLabel, formatShortDate } from '@/lib/dates'
import { toFriendlyMessage } from '@/lib/errors'
import { categoryLabel } from '@/lib/labels'
import { asCents, formatDollars, formatMoney } from '@/lib/money'
import { transactionsToCsv } from '@/lib/transactionCsv'
import type { Transaction } from '@/types/bank'
import { browserLocale, initialLocale, LOCALES, STORAGE_KEY, storedLocale, storeLocale } from './locales'
import { en } from './messages/en'
import { es } from './messages/es'
import { activateLocale, formatNumber, getLocale, intlLocale } from './runtime'

afterEach(async () => {
  localStorage.clear()
  await activateLocale('en')
})

describe('browserLocale', () => {
  it.each([
    [['es-MX', 'en-US'], 'es'],
    [['es'], 'es'],
    [['en-GB'], 'en'],
    [['fr-FR', 'es-AR'], 'es'],
    [['fr-FR', 'de'], 'en'],
    [[], 'en'],
  ] as const)('picks the first supported language from %j', (languages, locale) => {
    expect(browserLocale(languages)).toBe(locale)
  })
})

describe('saved language', () => {
  it('is remembered on this device and wins over the browser language', () => {
    expect(storedLocale()).toBeNull()
    storeLocale('es')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('es')
    expect(initialLocale()).toBe('es')
  })

  it('ignores values that are not a supported language', () => {
    localStorage.setItem(STORAGE_KEY, 'xx')
    expect(storedLocale()).toBeNull()
  })
})

// Walks both catalogues together: same keys at every level, same kind of value, no empty text.
function shape(value: unknown): unknown {
  if (typeof value === 'function') return `function/${value.length}`
  if (Array.isArray(value)) return value.map(shape)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shape(inner)]))
  }
  return typeof value === 'string' && value.trim() ? 'string' : 'EMPTY'
}

describe('catalogues', () => {
  it('Spanish has exactly the English keys, with the same function signatures', () => {
    expect(shape(es)).toEqual(shape(en))
  })

  it('every language in the list loads its catalogue', async () => {
    for (const locale of Object.keys(LOCALES) as (keyof typeof LOCALES)[]) {
      expect(shape(await LOCALES[locale].load())).toEqual(shape(en))
    }
  })
})

describe('formatting in Spanish', () => {
  beforeEach(async () => {
    await activateLocale('es')
  })

  it('switches the active language and the document language', () => {
    expect(getLocale()).toBe('es')
    expect(intlLocale()).toBe('es-US')
    expect(document.documentElement.lang).toBe('es')
  })

  it('keeps amounts in US dollars', () => {
    expect(formatMoney(asCents(123456))).toBe('$1,234.56')
    expect(formatDollars(asCents(1_000_000))).toBe('$10,000')
    expect(formatNumber(1234)).toBe('1,234')
  })

  it('writes dates the Spanish way', () => {
    const now = new Date(2026, 9, 11, 12)
    expect(formatShortDate(new Date(2026, 9, 7, 10).toISOString())).toBe('7 oct')
    expect(dayLabel(new Date(2026, 9, 11, 9).toISOString(), now)).toBe('Hoy')
    expect(dayLabel(new Date(2026, 9, 10, 9).toISOString(), now)).toBe('Ayer')
    expect(dayLabel(new Date(2025, 11, 31, 9).toISOString(), now)).toBe('31 dic 2025')
  })

  it('translates labels and server errors', () => {
    expect(categoryLabel('travel')).toBe('Viajes')
    expect(toFriendlyMessage(new Error('P0001: same_account'))).toBe('Elige dos cuentas distintas.')
    expect(toFriendlyMessage(new Error('fetch failed'), 'updateCard')).toBe(
      'No se pudo actualizar la tarjeta. Revisa tu conexión e inténtalo de nuevo.',
    )
  })

  it('leaves the CSV export in English, its documented format', () => {
    const transaction: Transaction = {
      id: 't1',
      accountId: 'a1',
      merchant: 'Delta',
      category: 'travel',
      amount: asCents(4200),
      type: 'debit',
      status: 'flagged',
      date: '2026-10-07T10:00:00.000Z',
      transferId: null,
    }
    const csv = transactionsToCsv([transaction], new Map([['a1', 'Everyday Checking']]))
    expect(csv).toContain('"Travel"')
    expect(csv).toContain('"Under review"')
    expect(csv).not.toContain('Viajes')
  })
})
