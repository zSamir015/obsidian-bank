import { test as base } from '@playwright/test'
import { en, type Messages } from '../../src/i18n/messages/en'
import { es } from '../../src/i18n/messages/es'

// Every journey runs once per language (see the projects in playwright.config.ts). Tests read
// their copy from the same catalogues as the app, so both languages get the same assertions.
// Amounts stay in US dollars and keep the "$1,234.56" shape in both, so they are written inline.

export const LANGUAGES = {
  en: { browserLocale: 'en-US', t: en },
  es: { browserLocale: 'es-MX', t: es },
} as const satisfies Record<string, { browserLocale: string; t: Messages }>

export type Language = keyof typeof LANGUAGES

export interface I18nOptions {
  readonly lang: Language
}

export const test = base.extend<I18nOptions & { t: Messages }>({
  lang: ['en', { option: true }],
  // The app starts in the browser's language, so the browser locale picks the language.
  locale: async ({ lang }, provide) => provide(LANGUAGES[lang].browserLocale),
  t: async ({ lang }, provide) => provide(LANGUAGES[lang].t),
})

export { expect } from '@playwright/test'

const GUIDE = 'https://github.com/zSamir015/obsidian-bank/blob/main/docs/'
export const userGuideUrl: Record<Language, string> = {
  en: `${GUIDE}USER_GUIDE.md`,
  es: `${GUIDE}USER_GUIDE.es.md`,
}
