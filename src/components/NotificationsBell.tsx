import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { NotificationsLink } from './NotificationsLink'

const NotificationsLinkLive = lazy(() => import('./NotificationsLinkLive'))

export const AFTER_DATA_MS = 3000
export const WITHOUT_DATA_MS = 4000

/**
 * The bell starts without a count. The count, and the small chunk that fetches it, wait until
 * a few seconds after the screen's own data has arrived: by then the screen has painted, so
 * the extra request never competes with it (Lighthouse counts every request that starts
 * before the largest paint against it).
 */
export function NotificationsBell({ desktop = false }: { readonly desktop?: boolean }) {
  const queryClient = useQueryClient()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (ready) return
    const cache = queryClient.getQueryCache()
    let delayId: number | undefined
    const start = () => {
      if (delayId === undefined) delayId = window.setTimeout(() => setReady(true), AFTER_DATA_MS)
    }
    if (cache.getAll().some((query) => query.state.status === 'success')) start()
    const unsubscribe = cache.subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success') start()
    })
    // Screens without data of their own still get the count, a little later.
    const timeoutId = window.setTimeout(() => setReady(true), WITHOUT_DATA_MS)
    return () => {
      unsubscribe()
      window.clearTimeout(timeoutId)
      window.clearTimeout(delayId)
    }
  }, [ready, queryClient])

  // More unread than before means a transaction just moved to review: refresh whatever the
  // screen shows (activity then reads "Under review") instead of waiting for it to go stale.
  const refresh = useCallback(() => void queryClient.invalidateQueries(), [queryClient])

  const placeholder = <NotificationsLink desktop={desktop} />
  if (!ready) return placeholder
  return (
    <Suspense fallback={placeholder}>
      <NotificationsLinkLive desktop={desktop} onNewNotification={refresh} />
    </Suspense>
  )
}
