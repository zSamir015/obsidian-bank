import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRenderGate } from './useRenderGate'

let notify: (isIntersecting: boolean) => void
const disconnect = vi.fn()

beforeEach(() => {
  disconnect.mockClear()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        notify = (isIntersecting) =>
          callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
      }
      observe() {}
      disconnect = disconnect
    },
  )
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
})

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

function setup() {
  const element = document.createElement('div')
  return renderHook(() => useRenderGate({ current: element }))
}

describe('useRenderGate', () => {
  it('is active only while the card is on screen', () => {
    const { result } = setup()
    expect(result.current).toBe(false)
    act(() => notify(true))
    expect(result.current).toBe(true)
    act(() => notify(false))
    expect(result.current).toBe(false)
  })

  it('pauses while the tab is in the background', () => {
    const { result } = setup()
    act(() => notify(true))
    act(() => setHidden(true))
    expect(result.current).toBe(false)
    act(() => setHidden(false))
    expect(result.current).toBe(true)
  })

  it('stops observing on unmount', () => {
    const { unmount } = setup()
    unmount()
    expect(disconnect).toHaveBeenCalled()
  })
})
