import { useEffect, useRef } from 'react'
import { useUnreadNotificationCount } from '@/hooks/unreadNotificationQuery'
import { NotificationsLink } from './NotificationsLink'

export default function NotificationsLinkLive({
  desktop = false,
  onNewNotification,
}: {
  readonly desktop?: boolean
  /** Called when the unread count goes up while the app is open. */
  readonly onNewNotification: () => void
}) {
  const unread = useUnreadNotificationCount()

  const previous = useRef(unread)
  useEffect(() => {
    if (unread !== undefined && previous.current !== undefined && unread > previous.current) onNewNotification()
    if (unread !== undefined) previous.current = unread
  }, [unread, onNewNotification])

  return <NotificationsLink desktop={desktop} unread={unread ?? 0} live={unread !== undefined} />
}
