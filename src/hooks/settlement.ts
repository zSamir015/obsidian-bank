import { supabase } from '@/lib/supabase'

let inFlight: Promise<void> | null = null

/**
 * Settlement of external transfers is simulated on read: before balances or activity load, the
 * server marks this user's transfers whose two-minute delay has passed as completed. Balances and
 * activity usually load together, so concurrent callers share a single request.
 */
export function settleDueTransfers(): Promise<void> {
  inFlight ??= (async () => {
    const { error } = await supabase.rpc('settle_external_transfers')
    if (error) throw new Error(error.message)
  })().finally(() => {
    inFlight = null
  })
  return inFlight
}
