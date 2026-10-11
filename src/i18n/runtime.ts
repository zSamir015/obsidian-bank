import { DEFAULT_LOCALE, LOCALES, type Locale } from './locales'
import { en, type Messages } from './messages/en'

// The active language for code that runs outside React (formatters, validation, error messages).
// Components read it through useI18n(), which re-renders them when it changes.
let current: { readonly locale: Locale; readonly messages: Messages } = { locale: DEFAULT_LOCALE, messages: en }

export function getLocale(): Locale {
  return current.locale
}

export function getMessages(): Messages {
  return current.messages
}

/** The BCP 47 tag for Intl formatters, e.g. "es-US". */
export function intlLocale(): string {
  return LOCALES[current.locale].intl
}

/** Loads a catalogue and makes it the active one. */
export async function activateLocale(locale: Locale): Promise<Messages> {
  const messages = await LOCALES[locale].load()
  current = { locale, messages }
  if (typeof document !== 'undefined') document.documentElement.lang = locale
  return messages
}

/** Counts and other plain numbers, e.g. "1,234" in English and Spanish (US). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(intlLocale()).format(value)
}
