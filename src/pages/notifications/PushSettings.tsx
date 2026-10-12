import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { SectionTitle } from '@/components/ui/Label'
import { pushMessages } from '@/i18n/messages/push'
import { useI18n } from '@/i18n/useI18n'
import {
  pushStatus,
  type PushStatus,
  sendTestPush,
  turnOffPush,
  turnOnPush,
  updatePushLocale,
  VAPID_PUBLIC_KEY,
} from '@/pwa/push'

type Busy = 'on' | 'off' | 'test' | null

/** Opt-in to web push for flagged activity on this browser. Hidden when push isn't configured. */
export function PushSettings({ onAnnounce }: { readonly onAnnounce: (message: string) => void }) {
  if (!VAPID_PUBLIC_KEY) return null
  return <PushControls onAnnounce={onAnnounce} />
}

function PushControls({ onAnnounce }: { readonly onAnnounce: (message: string) => void }) {
  const { locale } = useI18n()
  const t = pushMessages[locale]
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState('')
  const savedLocale = useRef(locale)

  useEffect(() => {
    let active = true
    pushStatus()
      .then((value) => active && setStatus(value))
      .catch(() => active && setStatus('unsupported'))
    return () => {
      active = false
    }
  }, [])

  // Notifications follow the app's language: re-save the subscription when it changes.
  useEffect(() => {
    if (status !== 'on' || savedLocale.current === locale) return
    savedLocale.current = locale
    void updatePushLocale(locale).catch(() => {})
  }, [status, locale])

  async function run(action: Exclude<Busy, null>) {
    setBusy(action)
    setError('')
    try {
      if (action === 'test') {
        await sendTestPush()
        onAnnounce(t.testSent)
      } else {
        const next = action === 'on' ? await turnOnPush(locale) : await turnOffPush()
        savedLocale.current = locale
        setStatus(next)
        if (next === 'on') onAnnounce(t.turnedOn)
        if (action === 'off') onAnnounce(t.turnedOff)
      }
    } catch {
      setError(action === 'test' ? t.testFailed : t.failed)
    } finally {
      setBusy(null)
    }
  }

  if (status === null) return null

  return (
    <section aria-labelledby="push-title" className="mt-12">
      <SectionTitle id="push-title">{t.title}</SectionTitle>
      <div className="rounded-card border border-hairline bg-sunken p-5">
        {status === 'unsupported' ? (
          <p className="text-muted">{t.unsupported}</p>
        ) : status === 'blocked' ? (
          <p className="text-muted">{t.blocked}</p>
        ) : status === 'off' ? (
          <>
            <p className="text-muted">{t.intro}</p>
            <Button className="mt-5" loading={busy === 'on'} onClick={() => void run('on')}>
              {t.turnOn}
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted">{t.on}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="secondary" loading={busy === 'test'} onClick={() => void run('test')}>
                {t.sendTest}
              </Button>
              <Button variant="ghost" loading={busy === 'off'} onClick={() => void run('off')}>
                {t.turnOff}
              </Button>
            </div>
          </>
        )}
        {error && (
          <div className="mt-4">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
        )}
      </div>
    </section>
  )
}
