import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OfflineGate } from './OfflineGate'

function setOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
}

function goOnline(online: boolean) {
  act(() => {
    setOnline(online)
    window.dispatchEvent(new Event(online ? 'online' : 'offline'))
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('OfflineGate', () => {
  it('renders the app when online', () => {
    setOnline(true)
    render(<OfflineGate>{<p>Overview</p>}</OfflineGate>)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the offline screen instead of the app when opened offline, then the app once back online', async () => {
    setOnline(false)
    render(<OfflineGate>{<p>Overview</p>}</OfflineGate>)
    expect(screen.getByRole('heading', { name: "You're offline" })).toBeInTheDocument()
    expect(screen.getByText(/need a connection/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByText('Overview')).not.toBeInTheDocument()

    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    vi.stubGlobal('fetch', fetch)
    goOnline(true)
    expect(await screen.findByText('Overview')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/assets/connection-check', { cache: 'no-store' })
    expect(screen.queryByRole('heading', { name: "You're offline" })).not.toBeInTheDocument()
  })

  it('waits until a request gets through before showing the app', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    setOnline(false)
    render(<OfflineGate>{<p>Overview</p>}</OfflineGate>)
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(new Response(null, { status: 404 }))
    vi.stubGlobal('fetch', fetch)

    goOnline(true)
    await act(async () => {})
    expect(screen.getByRole('heading', { name: "You're offline" })).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(await screen.findByText('Overview')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('keeps the current screen and adds a notice when the connection drops', () => {
    setOnline(true)
    render(<OfflineGate>{<input aria-label="Amount" defaultValue="25.50" />}</OfflineGate>)

    goOnline(false)
    expect(screen.getByRole('status')).toHaveTextContent("You're offline.")
    expect(screen.getByLabelText('Amount')).toHaveValue('25.50')

    goOnline(true)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
