import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Glow } from '@/components/ui/Glow'
import { Label } from '@/components/ui/Label'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const { session } = useAuth()
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
      <Logo />
      <main className="my-auto max-w-xl py-16">
        <Label>Demo project — not a real bank</Label>
        <h1 className="mt-4 text-[clamp(2.75rem,8vw,4.5rem)] leading-[1.02] font-medium tracking-display">
          A calm place for your money.
        </h1>
        <p className="mt-5 max-w-md text-lg text-muted">
          Explore made-up accounts, cards, transfers and budgets. Every visit gets its own fresh data.
        </p>
        <div className="mt-10">
          <Button onClick={() => void startDemo()} loading={pending}>
            {pending ? 'Setting up your demo…' : 'Explore the demo'}
          </Button>
        </div>
        {failed && (
          <div className="mt-5">
            <ErrorMessage>Couldn't start the demo. Try again in a few seconds.</ErrorMessage>
          </div>
        )}
        <p className="mt-10 text-sm text-muted">No sign-up and no personal data: demo sessions are anonymous.</p>
        <a
          href="https://github.com/zSamir015/obsidian-bank"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm text-muted underline-offset-4 hover:text-text hover:underline"
        >
          View source on GitHub
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </main>
    </div>
  )
}
