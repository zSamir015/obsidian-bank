import { WifiOff } from 'lucide-react'
import { type ReactNode, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/i18n/useI18n'

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
  if (startedOffline && online) setStartedOffline(false)

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
