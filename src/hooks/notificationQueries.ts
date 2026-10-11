import { useQuery } from '@tanstack/react-query'
import { NOTIFICATION_COLUMNS, toNotification } from '@/lib/mappers'
import { supabase } from '@/lib/supabase'
import type { FlaggedNotification } from '@/types/bank'
import { queryKeys } from './queryKeys'

// The server creates notifications when a payment moves to review. The app checks for new
// ones whenever the tab regains focus (always stale, so focus always refetches) and once a
// minute while it is open.
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async (): Promise<FlaggedNotification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select(NOTIFICATION_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data.map(toNotification)
    },
    staleTime: 0,
    refetchInterval: 60_000,
  })
}
