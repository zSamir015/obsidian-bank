import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
import { activateLocale } from '@/i18n/runtime'
import { toNotification } from '@/lib/mappers'
import { notificationRows } from '@/test/fixtures'
import NotificationsPage from './NotificationsPage'

const queries = vi.hoisted(() => ({ useNotifications: vi.fn(), useMarkNotificationsRead: vi.fn() }))
vi.mock('@/hooks/notificationQueries', () => ({ useNotifications: queries.useNotifications }))
vi.mock('@/hooks/notificationMutations', () => ({ useMarkNotificationsRead: queries.useMarkNotificationsRead }))

const mutate = vi.fn()
const unread = notificationRows.map(toNotification)
const withoutCard = toNotification({ ...notificationRows[0]!, id: 'n2', merchant: 'Corner Store', card_last4: null })

beforeEach(() => {
  mutate.mockReset().mockImplementation((_: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.())
  queries.useNotifications.mockReturnValue({ data: unread, isPending: false, isError: false, refetch: vi.fn() })
  queries.useMarkNotificationsRead.mockReturnValue({ mutate, isPending: false })
})

afterEach(async () => {
  await activateLocale('en')
})

const renderPage = () =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    </I18nProvider>,
  )

describe('NotificationsPage', () => {
  it('says what is under review with only the merchant, amount and last four digits', () => {
    renderPage()
    const item = screen.getByRole('listitem')
    expect(item).toHaveTextContent(
      '$989.99 at Unrecognized merchant — online on the card ending in 4821 is under review.',
    )
    expect(item).toHaveTextContent('Unread')
    expect(screen.getByText('1 unread')).toBeInTheDocument()
  })

  it('leaves the card out when the payment had none', () => {
    queries.useNotifications.mockReturnValue({ data: [withoutCard], isPending: false, isError: false })
    renderPage()
    expect(screen.getByRole('listitem')).toHaveTextContent('$989.99 at Corner Store is under review.')
  })

  it('marks everything as read and announces it', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))
    expect(mutate).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveTextContent('All notifications marked as read.')
  })

  it('hides the button when nothing is unread', () => {
    queries.useNotifications.mockReturnValue({
      data: unread.map((notification) => ({ ...notification, isRead: true })),
      isPending: false,
      isError: false,
    })
    renderPage()
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument()
    expect(screen.getByText('0 unread')).toBeInTheDocument()
  })

  it('explains an empty list and a failed load', async () => {
    queries.useNotifications.mockReturnValue({ data: [], isPending: false, isError: false })
    const { unmount } = renderPage()
    expect(screen.getByText('No notifications.')).toBeInTheDocument()
    unmount()

    const refetch = vi.fn()
    queries.useNotifications.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch })
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your notifications.")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('reads the same notification in Spanish', async () => {
    await activateLocale('es')
    renderPage()
    expect(screen.getByRole('listitem')).toHaveTextContent(
      '$989.99 en Unrecognized merchant — online con la tarjeta terminada en 4821 está en revisión.',
    )
    expect(screen.getByRole('button', { name: 'Marcar todo como leído' })).toBeInTheDocument()
  })
})
