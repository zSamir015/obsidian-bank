import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toCard } from '@/lib/mappers'
import { cardRows } from '@/test/fixtures'
import type { Cents, CreditCard } from '@/types/bank'
import { queryKeys, useFreezeCard, useUpdateCardLimit } from './queries'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }))

let client: QueryClient
const cards = cardRows.map(toCard)
const black = cards[0]!

beforeEach(() => {
  rpc.mockReset()
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  })
  client.setQueryData(queryKeys.cards, cards)
  // Keep the invalidation from refetching cards (there is no query function in these tests).
  vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
)
const cached = () => client.getQueryData<CreditCard[]>(queryKeys.cards)!.find((c) => c.id === black.id)!

describe('useFreezeCard', () => {
  it('calls freeze_card and shows the new state before the server answers', async () => {
    let resolve!: (value: unknown) => void
    rpc.mockReturnValue(new Promise((r) => (resolve = r)))
    const { result } = renderHook(() => useFreezeCard(), { wrapper })
    act(() => result.current.mutate({ cardId: black.id, frozen: true }))
    await waitFor(() => expect(cached().isFrozen).toBe(true))
    expect(rpc).toHaveBeenCalledWith('freeze_card', { p_card_id: black.id, p_frozen: true })
    resolve({ data: true, error: null })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(cached().isFrozen).toBe(true)
  })

  it('rolls the card back if the server refuses', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'card_not_found' } })
    const { result } = renderHook(() => useFreezeCard(), { wrapper })
    act(() => result.current.mutate({ cardId: black.id, frozen: true }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(cached().isFrozen).toBe(false)
    expect(result.current.error?.message).toContain('card_not_found')
  })
})

describe('useUpdateCardLimit', () => {
  it('calls update_card_limit with cents and stores the confirmed limit', async () => {
    rpc.mockResolvedValue({ data: 2_000_000, error: null })
    const { result } = renderHook(() => useUpdateCardLimit(), { wrapper })
    await act(() => result.current.mutateAsync({ cardId: black.id, limit: 2_000_000 as Cents }))
    expect(rpc).toHaveBeenCalledWith('update_card_limit', { p_card_id: black.id, p_new_limit_cents: 2_000_000 })
    expect(cached().limit).toBe(2_000_000)
  })

  it('surfaces the server error code', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'limit_below_spent' } })
    const { result } = renderHook(() => useUpdateCardLimit(), { wrapper })
    await expect(act(() => result.current.mutateAsync({ cardId: black.id, limit: 50_000 as Cents }))).rejects.toThrow(
      'limit_below_spent',
    )
    expect(cached().limit).toBe(black.limit)
  })
})
