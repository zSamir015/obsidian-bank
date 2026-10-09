import { useState } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Logo } from '@/components/Logo'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const { session } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session) return <Navigate to="/" replace />

  async function enterDemo() {
    setPending(true)
    setError(null)
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      setError('No se pudo iniciar la demo. Inténtalo de nuevo en unos segundos.')
      setPending(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top,#1d1630,transparent_60%)] px-4">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">Tu dinero, con claridad.</h1>
        <p className="mt-3 text-zinc-400">
          Consulta tus cuentas, revisa movimientos, transfiere entre cuentas y controla tus presupuestos.
        </p>
        <button
          type="button"
          onClick={enterDemo}
          disabled={pending}
          className="mt-8 w-full rounded-xl bg-sheen px-4 py-3 font-medium text-obsidian-950 transition hover:bg-violet-300 active:scale-[.98] disabled:opacity-60"
        >
          {pending ? 'Preparando tu cuenta demo…' : 'Entrar como demo'}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-sm text-rose-400">
            {error}
          </p>
        )}
        <p className="mt-6 rounded-lg border border-obsidian-700 p-3 text-xs leading-relaxed text-zinc-500">
          Proyecto de portafolio. Obsidian Bank no es un banco real: los datos son ficticios y se generan para cada
          sesión demo. No introduzcas información personal.
        </p>
      </div>
    </main>
  )
}

export default LoginPage
