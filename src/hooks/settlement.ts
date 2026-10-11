import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from './queryKeys'

let inFlight: Promise<void> | null = null

/**
 * Settlement of external transfers is simulated on read. Whenever balances or activity load, this
 * asks the server to mark the user's transfers whose two-minute delay has passed as completed. It
 * runs alongside the read instead of before it, so it never delays the page; when something did
 * settle, balances and activity are refetched. Concurrent callers share one request, and a failed
 * attempt is simply retried on the next read.
 */
export function settleDueTransfers(queryClient: QueryClient): Promise<void> {
  inFlight ??= (async () => {
    const { data, error } = await supabase.rpc('settle_external_transfers')
    if (!error && data > 0) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
    }
  })()
    .catch(() => {})
    .finally(() => {
      inFlight = null
    })
  return inFlight
}
