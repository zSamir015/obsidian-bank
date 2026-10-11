import { useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Money } from '@/components/ui/Money'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useMarkNotificationsRead, useNotifications } from '@/hooks/notificationQueries'
import { formatNumber, intlLocale } from '@/i18n/runtime'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/cn'
import { statusLabel } from '@/lib/labels'
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
  // Formatted here rather than with lib/dates: importing it from this page would split it
  // into a chunk of its own and add a request to every screen that uses it.
  const date = new Date(notification.createdAt).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short' })
  const message = notification.cardLast4
    ? t.notifications.flagged(notification.merchant, amount, notification.cardLast4)
    : t.notifications.flaggedWithoutCard(notification.merchant, amount)
  const context = [
    notification.cardLast4 && `${t.overview.cardEndingIn}${notification.cardLast4}`,
    statusLabel('flagged', t),
    date,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="flex items-center gap-3 py-4" data-read={notification.isRead}>
      {/* Read out as one sentence; the row below is the same information laid out visually. */}
      <p className="sr-only">{`${message} ${date}.`}</p>
      <span
        className={cn('size-2 shrink-0 rounded-full', notification.isRead ? 'bg-transparent' : 'bg-text')}
        aria-hidden="true"
      />
      <div aria-hidden="true" className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <div className="min-w-0">
          <p className={cn('truncate', notification.isRead && 'text-muted')}>{notification.merchant}</p>
          <p className="mt-0.5 truncate text-sm text-muted">{context}</p>
        </div>
        <Money cents={notification.amount} type="debit" className="shrink-0" />
      </div>
      {!notification.isRead && <span className="sr-only">{t.notifications.unreadItem}</span>}
    </li>
  )
}
