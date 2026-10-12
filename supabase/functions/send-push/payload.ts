// What a push notification says. Pure functions, shared by the Edge Function (Deno) and its
// tests (Vitest). The copy matches the in-app notifications in src/i18n/messages/; the
// function is deployed on its own, so it keeps its own copy.
//
// A flagged-activity push carries the merchant, the amount and the card's last four digits,
// and nothing else: no account, balance, transaction id or user id.

export type PushLocale = 'en' | 'es'

export interface FlaggedNotification {
  readonly merchant: string
  readonly amount_cents: number
  readonly card_last4: string | null
}

export interface PushPayload {
  readonly title: string
  readonly body: string
  /** Groups pushes of the same kind, so a newer one replaces an older one on screen. */
  readonly tag: string
  /** Path inside the app, relative to its base, that a click opens. */
  readonly path: 'notifications'
}

const INTL: Record<PushLocale, string> = { en: 'en-US', es: 'es-US' }

const COPY = {
  en: {
    flaggedTitle: 'Payment under review',
    flagged: (merchant: string, amount: string, last4: string) =>
      `${amount} at ${merchant} on the card ending in ${last4} is under review.`,
    flaggedWithoutCard: (merchant: string, amount: string) => `${amount} at ${merchant} is under review.`,
    testTitle: 'Obsidian Bank',
    testBody: 'Browser notifications are on. You’ll hear about payments placed under review.',
  },
  es: {
    flaggedTitle: 'Pago en revisión',
    flagged: (merchant: string, amount: string, last4: string) =>
      `${amount} en ${merchant} con la tarjeta terminada en ${last4} está en revisión.`,
    flaggedWithoutCard: (merchant: string, amount: string) => `${amount} en ${merchant} está en revisión.`,
    testTitle: 'Obsidian Bank',
    testBody: 'Las notificaciones del navegador están activadas. Te avisaremos de los pagos en revisión.',
  },
} as const

export function asPushLocale(value: unknown): PushLocale {
  return value === 'es' ? 'es' : 'en'
}

export function flaggedPayload(notification: FlaggedNotification, locale: PushLocale): PushPayload {
  const copy = COPY[locale]
  const amount = new Intl.NumberFormat(INTL[locale], { style: 'currency', currency: 'USD' }).format(
    notification.amount_cents / 100,
  )
  const merchant = notification.merchant.slice(0, 140)
  const last4 = notification.card_last4 && /^[0-9]{4}$/.test(notification.card_last4) ? notification.card_last4 : null
  return {
    title: copy.flaggedTitle,
    body: last4 ? copy.flagged(merchant, amount, last4) : copy.flaggedWithoutCard(merchant, amount),
    tag: 'flagged',
    path: 'notifications',
  }
}

export function testPayload(locale: PushLocale): PushPayload {
  const copy = COPY[locale]
  return { title: copy.testTitle, body: copy.testBody, tag: 'test', path: 'notifications' }
}
