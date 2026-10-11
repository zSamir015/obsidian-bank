import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toNotification } from '@/lib/mappers'
import { notificationRows } from '@/test/fixtures'
import type { FlaggedNotification } from '@/types/bank'
import { useMarkNotificationsRead } from './notificationMutations'
import { useNotifications } from './notificationQueries'
import { queryKeys } from './queryKeys'

const api = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), select: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: api.rpc, from: api.from } }))

let client: QueryClient

beforeEach(() => {
  api.rpc.mockReset()
  api.select.mockReset().mockReturnValue({
    order: () => ({ limit: () => Promise.resolve({ data: notificationRows, error: null }) }),
  })
  api.from.mockReset().mockReturnValue({ select: api.select })
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
)

describe('useNotifications', () => {
  it('asks only for the columns a notification shows', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.from).toHaveBeenCalledWith('notifications')
    expect(api.select).toHaveBeenCalledWith('id, merchant, amount_cents, card_last4, created_at, read_at')
    expect(result.current.data).toEqual(notificationRows.map(toNotification))
  })
})

describe('useMarkNotificationsRead', () => {
  it('shows everything as read before the server answers, and rolls back on error', async () => {
    client.setQueryData(queryKeys.notifications, notificationRows.map(toNotification))
    vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
    let reject!: (error: Error) => void
    api.rpc.mockReturnValue(new Promise((_, r) => (reject = r)))

    const { result } = renderHook(() => useMarkNotificationsRead(), { wrapper })
    act(() => result.current.mutate())
    const cached = () => client.getQueryData<FlaggedNotification[]>(queryKeys.notifications)!
    await waitFor(() => expect(cached().every((n) => n.isRead)).toBe(true))
    expect(api.rpc).toHaveBeenCalledWith('mark_notifications_read')

    act(() => reject(new Error('fetch failed')))
    await waitFor(() => expect(cached().some((n) => !n.isRead)).toBe(true))
  })
})
