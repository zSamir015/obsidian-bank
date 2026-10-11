import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NOTIFICATION_COLUMNS, toNotification } from '@/lib/mappers'
import { supabase } from '@/lib/supabase'
import type { FlaggedNotification } from '@/types/bank'
import { queryKeys } from './queryKeys'
import { refreshUnreadCount, UNREAD_NOTIFICATIONS_KEY } from './unreadNotificationQuery'

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

/** Marks every unread notification as read. Shows as read immediately and rolls back on error. */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('mark_notifications_read')
      if (error) throw new Error(error.message)
      return data
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications })
      const previous = queryClient.getQueryData<readonly FlaggedNotification[]>(queryKeys.notifications)
      const previousUnread = queryClient.getQueryData<number>(UNREAD_NOTIFICATIONS_KEY)
      queryClient.setQueryData(
        queryKeys.notifications,
        previous?.map((notification) => ({ ...notification, isRead: true })),
      )
      queryClient.setQueryData(UNREAD_NOTIFICATIONS_KEY, 0)
      return { previous, previousUnread }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.notifications, context.previous)
      if (context?.previousUnread !== undefined) {
        queryClient.setQueryData(UNREAD_NOTIFICATIONS_KEY, context.previousUnread)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications, exact: true })
      void refreshUnreadCount(queryClient)
    },
  })
}
