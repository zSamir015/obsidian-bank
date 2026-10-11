import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from './queryKeys'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }))

const { settleDueTransfers } = await import('./settlement')

let client: QueryClient
let invalidate: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  rpc.mockReset()
  client = new QueryClient()
  invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
})

describe('settleDueTransfers', () => {
  it('refetches balances and activity when something settled', async () => {
    rpc.mockResolvedValue({ data: 2, error: null })
    await settleDueTransfers(client)
    expect(rpc).toHaveBeenCalledExactlyOnceWith('settle_external_transfers')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.accounts })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.transactions })
  })

  it('does not refetch when nothing was due', async () => {
    rpc.mockResolvedValue({ data: 0, error: null })
    await settleDueTransfers(client)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('shares one request between concurrent callers, then starts a new one', async () => {
    let finish: (value: { data: number; error: null }) => void = () => {}
    rpc.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
    const first = settleDueTransfers(client)
    const second = settleDueTransfers(client)
    finish({ data: 0, error: null })
    await Promise.all([first, second])
    expect(rpc).toHaveBeenCalledTimes(1)

    rpc.mockResolvedValueOnce({ data: 0, error: null })
    await settleDueTransfers(client)
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('never breaks the read it runs alongside', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'not_authenticated' } })
    await expect(settleDueTransfers(client)).resolves.toBeUndefined()
    rpc.mockRejectedValueOnce(new Error('fetch failed'))
    await expect(settleDueTransfers(client)).resolves.toBeUndefined()
    expect(invalidate).not.toHaveBeenCalled()
  })
})
