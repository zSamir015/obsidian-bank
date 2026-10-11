import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }))

const { settleDueTransfers } = await import('./settlement')

beforeEach(() => {
  rpc.mockReset()
})

describe('settleDueTransfers', () => {
  it('asks the server to settle due transfers', async () => {
    rpc.mockResolvedValue({ data: 1, error: null })
    await settleDueTransfers()
    expect(rpc).toHaveBeenCalledExactlyOnceWith('settle_external_transfers')
  })

  it('shares one request between concurrent callers, then starts a new one', async () => {
    let finish: (value: { data: number; error: null }) => void = () => {}
    rpc.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
    const first = settleDueTransfers()
    const second = settleDueTransfers()
    finish({ data: 0, error: null })
    await Promise.all([first, second])
    expect(rpc).toHaveBeenCalledTimes(1)

    rpc.mockResolvedValueOnce({ data: 0, error: null })
    await settleDueTransfers()
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('reports a server error so the read fails visibly', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'not_authenticated' } })
    await expect(settleDueTransfers()).rejects.toThrow('not_authenticated')
  })
})
