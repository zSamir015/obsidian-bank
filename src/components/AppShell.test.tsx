import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toNotification } from '@/lib/mappers'
import { notificationRows } from '@/test/fixtures'
import { AppShell } from './AppShell'

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }))
const queries = vi.hoisted(() => ({ useNotifications: vi.fn() }))
vi.mock('@/hooks/notificationQueries', () => queries)

beforeEach(() => {
  queries.useNotifications.mockReturnValue({ data: notificationRows.map(toNotification) })
})

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
  it('names the unread count, on desktop and on phones', async () => {
    renderShell()
    const links = await screen.findAllByRole('link', { name: 'Notifications, 1 unread' })
    expect(links).toHaveLength(2)
    for (const link of links) expect(link).toHaveAttribute('href', '/notifications')
  })

  it('drops the count once everything is read', async () => {
    queries.useNotifications.mockReturnValue({
      data: notificationRows.map((row) => toNotification({ ...row, read_at: row.created_at })),
    })
    renderShell()
    // Wait for the live link (it replaces the placeholder, which has no count either).
    expect(await screen.findAllByTestId('notifications-live')).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Notifications' })).toHaveLength(2)
    expect(screen.queryByTestId('unread-count')).not.toBeInTheDocument()
  })
})
