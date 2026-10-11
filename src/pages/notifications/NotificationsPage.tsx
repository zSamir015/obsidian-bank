import { ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useMarkNotificationsRead } from '@/hooks/notificationMutations'
import { useNotifications } from '@/hooks/notificationQueries'
import { formatNumber } from '@/i18n/runtime'
import { useI18n } from '@/i18n/useI18n'
import { formatShortDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import type { FlaggedNotification } from '@/types/bank'

export default function NotificationsPage() {
  const { t } = useI18n()
  const notifications = useNotifications()
  const markRead = useMarkNotificationsRead()
  const [announcement, setAnnouncement] = useState('')
  const unread = notifications.data?.filter((notification) => !notification.isRead).length ?? 0

  return (
    <div className="max-w-3xl">
      <PageHeader title={t.notifications.title}>{t.notifications.intro}</PageHeader>

      {notifications.isError ? (
        <ErrorMessage onRetry={() => void notifications.refetch()}>{t.notifications.failed}</ErrorMessage>
      ) : notifications.isPending ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16 rounded-card" />
          ))}
        </div>
      ) : notifications.data.length === 0 ? (
        <p className="text-muted">{t.notifications.empty}</p>
      ) : (
        <>
          <div className="mb-5 flex min-h-9 items-center justify-between gap-4">
            <p className="text-sm text-muted">{t.notifications.unread(unread, formatNumber(unread))}</p>
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="-mr-4"
                loading={markRead.isPending}
                onClick={() =>
                  markRead.mutate(undefined, { onSuccess: () => setAnnouncement(t.notifications.allRead) })
                }
              >
                {t.notifications.markAllRead}
              </Button>
            )}
          </div>
          <ul className="divide-y divide-hairline rounded-card border border-hairline bg-sunken px-5">
            {notifications.data.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} />
            ))}
          </ul>
          <div className="mt-8">
            <ButtonLink to="/activity" variant="secondary">
              {t.app.viewActivity}
            </ButtonLink>
          </div>
        </>
      )}
      <p role="status" aria-live="polite" className="mt-6 text-sm text-muted">
        {announcement}
      </p>
    </div>
  )
}

function NotificationRow({ notification }: { readonly notification: FlaggedNotification }) {
  const { t } = useI18n()
  const amount = formatMoney(notification.amount)
  const message = notification.cardLast4
    ? t.notifications.flagged(notification.merchant, amount, notification.cardLast4)
    : t.notifications.flaggedWithoutCard(notification.merchant, amount)

  return (
    <li className="flex items-start gap-4 py-4" data-read={notification.isRead}>
      <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className={notification.isRead ? 'text-muted' : undefined}>{message}</p>
        <p className="mt-1 text-sm text-muted">{formatShortDate(notification.createdAt)}</p>
      </div>
      {!notification.isRead && (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-text">
          <span className="sr-only">{t.notifications.unreadItem}</span>
        </span>
      )}
    </li>
  )
}
