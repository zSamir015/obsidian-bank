import { en, type Messages } from './messages/en'

// Adding a language: write its catalogue in messages/, then add one entry here.
export const LOCALES = {
  en: { label: 'English', intl: 'en-US', load: async () => en },
  // es-US: Spanish as used in the United States. Amounts stay in USD and keep the
  // "$1,234.56" shape that the amount fields accept.
  es: { label: 'Español', intl: 'es-US', load: async () => (await import('./messages/es')).es },
} as const satisfies Record<string, { label: string; intl: string; load: () => Promise<Messages> }>

export type Locale = keyof typeof LOCALES

export const DEFAULT_LOCALE: Locale = 'en'
export const STORAGE_KEY = 'obsidian-bank:locale'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && Object.hasOwn(LOCALES, value)
}

/** The first browser language we support ("es-MX" → "es"), or English. */
export function browserLocale(languages: readonly string[] = navigator.languages ?? [navigator.language]): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0]
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}

export function storedLocale(): Locale | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isLocale(value) ? value : null
  } catch {
    return null
  }
}

export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Private mode or blocked storage: the choice lasts until the tab closes.
  }
}

/** The saved choice on this device, otherwise the browser language. */
export function initialLocale(): Locale {
  return storedLocale() ?? browserLocale()
}
