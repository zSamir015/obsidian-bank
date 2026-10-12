import { WifiOff } from 'lucide-react'
import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/i18n/useI18n'

// Not cached by the service worker (it only keeps files that exist), so it always goes to
// the network: any response, a 404 included, means the connection is back.
const CONNECTION_CHECK = `${import.meta.env.BASE_URL}assets/connection-check`
const RETRY_MS = 1000

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
}

/**
 * Opened without a connection (for example from the home screen), the app shows an offline
 * screen instead of screens that can't load their data. Losing the connection later keeps the
 * current screen and adds a notice, so nothing typed is lost. Back online, everything refetches.
 */
export function OfflineGate({ children }: { readonly children: ReactNode }) {
  const online = useOnline()
  const { t } = useI18n()
  const [startedOffline, setStartedOffline] = useState(!online)

  // "online" can fire before requests get through (the service worker's own fetches can lag
  // behind the page's). The app only mounts once a request through the service worker
  // reaches the server, so the first route load doesn't fail.
  useEffect(() => {
    if (!startedOffline || !online) return
    let cancelled = false
    void (async () => {
      while (!cancelled) {
        try {
          await fetch(CONNECTION_CHECK, { cache: 'no-store' })
          if (!cancelled) setStartedOffline(false)
          return
        } catch {
          await new Promise((resolve) => setTimeout(resolve, RETRY_MS))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [startedOffline, online])

  if (startedOffline) {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <div role="alert" className="max-w-sm text-center">
          <WifiOff aria-hidden="true" className="mx-auto size-6 text-muted" />
          <h1 className="mt-4 text-2xl font-medium tracking-[-0.01em]">{t.offline.title}</h1>
          <p className="mt-2 text-muted">{t.offline.body}</p>
          <div className="mt-6">
            <Button onClick={() => window.location.reload()}>{t.app.tryAgain}</Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <>
      {children}
      {!online && (
        <p
          role="status"
          className="fixed inset-x-4 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 mx-auto flex max-w-md items-center gap-2 rounded-full border border-hairline bg-surface-2 px-4 py-2.5 text-sm text-text shadow-lg"
        >
          <WifiOff aria-hidden="true" className="size-4 shrink-0 text-muted" />
          {t.offline.banner}
        </p>
      )}
    </>
  )
}
