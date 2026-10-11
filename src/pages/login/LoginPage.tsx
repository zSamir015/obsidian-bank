import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { LanguagePicker } from '@/components/LanguagePicker'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Glow } from '@/components/ui/Glow'
import { Label } from '@/components/ui/Label'
import { useI18n } from '@/i18n/useI18n'
import { supabase } from '@/lib/supabase'
import { LoginScrollStory } from './LoginScrollStory'

export default function LoginPage() {
  const { session } = useAuth()
  const { t } = useI18n()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function startDemo() {
    setPending(true)
    setFailed(false)
    const { error } = await supabase.auth.signInAnonymously()
    // On success the auth listener updates the session and this page redirects.
    if (error) {
      setFailed(true)
      setPending(false)
    }
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-clip px-5 py-6 md:px-12 md:py-8">
      <Glow />
      <div className="flex items-center justify-between gap-4">
        <Logo />
        <LanguagePicker />
      </div>
      <main className="my-auto max-w-xl py-16 lg:mx-auto lg:grid lg:min-h-[calc(100dvh-4rem)] lg:max-w-7xl lg:grid-cols-2 lg:gap-12 lg:py-0">
        <section className="lg:sticky lg:top-0 lg:flex lg:h-dvh lg:items-center">
          <div>
            <Label>{t.login.eyebrow}</Label>
            <h1 className="mt-4 text-[clamp(2.75rem,8vw,4.5rem)] leading-[1.02] font-medium tracking-display">
              {t.login.title}
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted">{t.login.intro}</p>
            <div className="mt-10">
              <Button onClick={() => void startDemo()} loading={pending}>
                {pending ? t.login.starting : t.login.start}
              </Button>
            </div>
            {failed && (
              <div className="mt-5">
                <ErrorMessage>{t.login.startFailed}</ErrorMessage>
              </div>
            )}
            <p className="mt-10 text-sm text-muted">{t.login.privacy}</p>
            <a
              href="https://github.com/zSamir015/obsidian-bank"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm text-muted underline-offset-4 hover:text-text hover:underline"
            >
              {t.login.source}
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
              <span className="sr-only">{t.app.opensInNewTab}</span>
            </a>
          </div>
        </section>
        <LoginScrollStory />
      </main>
    </div>
  )
}
