import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import { WITHOUT_DATA_MS } from './NotificationsBell'

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }))
const unread = vi.hoisted(() => ({ useUnreadNotificationCount: vi.fn() }))
vi.mock('@/hooks/unreadNotificationQuery', () => unread)

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  unread.useUnreadNotificationCount.mockReturnValue(1)
})

afterEach(() => {
  vi.useRealTimers()
})

/** The bell waits for the screen's data before asking for its count; here there is none. */
async function waitForBell() {
  await act(async () => {
    vi.advanceTimersByTime(WITHOUT_DATA_MS)
  })
  return screen.findAllByTestId('notifications-live')
}

function renderShell() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<p>Overview</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AppShell help links', () => {
  it('opens the user guide safely in a new tab with an accessible label', () => {
    renderShell()

    for (const link of screen.getAllByRole('link', { name: 'Help (opens in a new tab)' })) {
      expect(link).toHaveAttribute('href', 'https://github.com/zSamir015/obsidian-bank/blob/main/docs/USER_GUIDE.md')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('keeps the mobile tab bar at five navigation links', () => {
    renderShell()
    expect(screen.getAllByRole('navigation', { name: 'Main' })[1]).toHaveTextContent(
      'OverviewActivityTransferBudgetsCards',
    )
  })
})

describe('AppShell notifications link', () => {
  it('starts without a count, then names the unread count on desktop and on phones', async () => {
    renderShell()
    expect(screen.getAllByRole('link', { name: 'Notifications' })).toHaveLength(2)
    await waitForBell()
    const links = screen.getAllByRole('link', { name: 'Notifications, 1 unread' })
    expect(links).toHaveLength(2)
    for (const link of links) expect(link).toHaveAttribute('href', '/notifications')
  })

  it('drops the count once everything is read', async () => {
    unread.useUnreadNotificationCount.mockReturnValue(0)
    renderShell()
    expect(await waitForBell()).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Notifications' })).toHaveLength(2)
    expect(screen.queryByTestId('unread-count')).not.toBeInTheDocument()
  })
})
