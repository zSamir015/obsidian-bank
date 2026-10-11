import { Bell } from 'lucide-react'
import { NavLink } from 'react-router'
import { formatNumber } from '@/i18n/runtime'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/cn'

/**
 * Bell with the unread count. The count is part of the link's name, so it is announced too.
 * The shell renders it with no count until NotificationsLinkLive (a separate chunk, so the
 * query code stays out of the initial JavaScript) has loaded the notifications.
 */
export function NotificationsLink({
  desktop = false,
  unread = 0,
  live = false,
}: {
  readonly desktop?: boolean
  readonly unread?: number
  /** Set once the count is real, not the placeholder shown while it loads. */
  readonly live?: boolean
}) {
  const { t } = useI18n()
  const count = formatNumber(unread)

  return (
    <NavLink
      to="/notifications"
      data-testid={live ? 'notifications-live' : undefined}
      aria-label={t.notifications.link(unread, count)}
      className={({ isActive }) =>
        cn(
          'relative inline-flex items-center rounded-full text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text',
          desktop ? 'gap-3 px-4 py-2.5' : 'size-10 justify-center',
          isActive ? 'text-text' : 'text-muted hover:text-text',
          desktop && isActive && 'bg-surface-2',
        )
      }
    >
      <Bell aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
      {desktop && <span>{t.notifications.title}</span>}
      {unread > 0 && (
        <span
          aria-hidden="true"
          data-testid="unread-count"
          className={cn(
            'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-text px-1 text-[11px] font-medium text-bg tabular-nums',
            !desktop && 'absolute top-0.5 right-0.5',
          )}
        >
          {count}
        </span>
      )}
    </NavLink>
  )
}
