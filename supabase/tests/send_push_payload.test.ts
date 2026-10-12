// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { en } from '../../src/i18n/messages/en'
import { es } from '../../src/i18n/messages/es'
import { asPushLocale, flaggedPayload, testPayload } from '../functions/send-push/payload'

const charge = { merchant: 'Unrecognized merchant — online', amount_cents: 98999, card_last4: '4821' }

describe('send-push payload', () => {
  it('says the same as the in-app notification, in each language', () => {
    expect(flaggedPayload(charge, 'en').body).toBe(en.notifications.flagged(charge.merchant, '$989.99', '4821'))
    expect(flaggedPayload(charge, 'es').body).toBe(es.notifications.flagged(charge.merchant, '$989.99', '4821'))
    expect(flaggedPayload({ ...charge, card_last4: null }, 'en').body).toBe(
      en.notifications.flaggedWithoutCard(charge.merchant, '$989.99'),
    )
    expect(flaggedPayload(charge, 'es').title).toBe('Pago en revisión')
  })

  it('carries merchant, amount and last four digits only', () => {
    const payload = flaggedPayload(charge, 'en')
    expect(Object.keys(payload).sort()).toEqual(['body', 'path', 'tag', 'title'])
    expect(payload).toEqual({
      title: 'Payment under review',
      body: '$989.99 at Unrecognized merchant — online on the card ending in 4821 is under review.',
      tag: 'flagged',
      path: 'notifications',
    })
  })

  it('drops a last4 that is not four digits', () => {
    expect(flaggedPayload({ ...charge, card_last4: '4111111111111111' }, 'en').body).not.toContain('4111')
  })

  it('has a test message in each language and falls back to English', () => {
    expect(testPayload('es').body).toMatch(/activadas/)
    expect(asPushLocale('fr')).toBe('en')
    expect(asPushLocale('es')).toBe('es')
  })
})
