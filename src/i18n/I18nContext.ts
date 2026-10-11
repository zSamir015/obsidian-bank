import { createContext } from 'react'
import { DEFAULT_LOCALE, type Locale } from './locales'
import { en, type Messages } from './messages/en'

export interface I18nState {
  readonly locale: Locale
  readonly t: Messages
  readonly setLocale: (locale: Locale) => void
}

// Without a provider (unit tests) components render in English.
export const I18nContext = createContext<I18nState>({ locale: DEFAULT_LOCALE, t: en, setLocale: () => {} })
