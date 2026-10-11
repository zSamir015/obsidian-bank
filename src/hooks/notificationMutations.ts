import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { FlaggedNotification } from '@/types/bank'
import { queryKeys } from './queryKeys'

// Kept apart from notificationQueries.ts: the app shell loads that file on every screen,
// and the mutation code is only needed on the notifications page.

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
      queryClient.setQueryData(
        queryKeys.notifications,
        previous?.map((notification) => ({ ...notification, isRead: true })),
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.notifications, context.previous)
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  })
}
