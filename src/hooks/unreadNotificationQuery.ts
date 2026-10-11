import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase'

// Not in queryKeys.ts on purpose: the bell's chunk would then share that module with every
// data screen and split their common chunk. Under 'notifications', so invalidating
// notifications refreshes the count too.
export const UNREAD_NOTIFICATIONS_KEY = ['notifications', 'unread'] as const

async function fetchUnreadCount(): Promise<number> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, read_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data.filter((row) => row.read_at === null).length
}

const isUnreadKey = (key: readonly unknown[]) =>
  key.length === UNREAD_NOTIFICATIONS_KEY.length && key.every((part, i) => part === UNREAD_NOTIFICATIONS_KEY[i])

/** Fetches the unread count again, for example after notifications were marked read. */
export function refreshUnreadCount(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient
    .fetchQuery({ queryKey: UNREAD_NOTIFICATIONS_KEY, queryFn: fetchUnreadCount, staleTime: 0 })
    .catch(() => undefined)
}

/**
 * The unread count for the bell on every screen, refreshed when the tab regains focus and once
 * a minute. Built on the query client directly rather than useQuery: useQuery's observer code
 * lives in the chunk every data screen shares, and using it from the bell would split that
 * chunk and add a request to each of those screens.
 */
export function useUnreadNotificationCount(): number | undefined {
  const queryClient = useQueryClient()

  const subscribe = useCallback(
    (onChange: () => void) =>
      queryClient.getQueryCache().subscribe((event) => {
        if (isUnreadKey(event.query.queryKey)) onChange()
      }),
    [queryClient],
  )
  const count = useSyncExternalStore(subscribe, () => queryClient.getQueryData<number>(UNREAD_NOTIFICATIONS_KEY))

  useEffect(() => {
    const refresh = () => void refreshUnreadCount(queryClient)
    refresh()
    const intervalId = window.setInterval(refresh, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('visibilitychange', onVisible)
    }
  }, [queryClient])

  return count
}
