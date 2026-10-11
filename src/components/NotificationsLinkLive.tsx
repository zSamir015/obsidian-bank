import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useNotifications } from '@/hooks/notificationQueries'
import { queryKeys } from '@/hooks/queryKeys'
import { NotificationsLink } from './NotificationsLink'

export default function NotificationsLinkLive({ desktop = false }: { readonly desktop?: boolean }) {
  const notifications = useNotifications()
  const queryClient = useQueryClient()
  const unread = notifications.data?.filter((notification) => !notification.isRead).length ?? 0

  // A new notification means a transaction just changed status: refresh activity so it
  // shows "Under review" too, instead of waiting for it to go stale.
  const latest = notifications.data?.[0]?.id
  const seen = useRef(latest)
  useEffect(() => {
    if (latest && seen.current && latest !== seen.current) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
    }
    if (latest) seen.current = latest
  }, [latest, queryClient])

  return <NotificationsLink desktop={desktop} unread={unread} live />
}
