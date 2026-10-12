import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PushSettings } from './PushSettings'

const push = vi.hoisted(() => ({
  VAPID_PUBLIC_KEY: 'key',
  pushStatus: vi.fn(),
  turnOnPush: vi.fn(),
  turnOffPush: vi.fn(),
  sendTestPush: vi.fn(),
  updatePushLocale: vi.fn(),
}))
vi.mock('@/pwa/push', () => push)

beforeEach(() => {
  push.VAPID_PUBLIC_KEY = 'key'
  vi.clearAllMocks()
})

describe('PushSettings', () => {
  it('renders nothing when push is not configured', () => {
    push.VAPID_PUBLIC_KEY = ''
    const { container } = render(<PushSettings onAnnounce={() => {}} />)
    expect(container).toBeEmptyDOMElement()
    expect(push.pushStatus).not.toHaveBeenCalled()
  })

  it('explains when the browser cannot show notifications', async () => {
    push.pushStatus.mockResolvedValue('unsupported')
    render(<PushSettings onAnnounce={() => {}} />)
    expect(await screen.findByText(/add the app to your home screen first/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('explains when notifications are blocked', async () => {
    push.pushStatus.mockResolvedValue('blocked')
    render(<PushSettings onAnnounce={() => {}} />)
    expect(await screen.findByText(/blocked for this site/)).toBeInTheDocument()
  })

  it('only asks for permission when the button is pressed, then shows the on state', async () => {
    push.pushStatus.mockResolvedValue('off')
    push.turnOnPush.mockResolvedValue('on')
    const onAnnounce = vi.fn()
    render(<PushSettings onAnnounce={onAnnounce} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Turn on browser notifications' }))
    expect(push.turnOnPush).toHaveBeenCalledWith('en')
    expect(await screen.findByText(/nothing else/)).toBeInTheDocument()
    expect(onAnnounce).toHaveBeenCalledWith('Browser notifications are on.')
  })

  it('shows the blocked message when permission is refused', async () => {
    push.pushStatus.mockResolvedValue('off')
    push.turnOnPush.mockResolvedValue('blocked')
    render(<PushSettings onAnnounce={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Turn on browser notifications' }))
    expect(await screen.findByText(/blocked for this site/)).toBeInTheDocument()
  })

  it('sends a test and turns off', async () => {
    push.pushStatus.mockResolvedValue('on')
    push.sendTestPush.mockResolvedValue(undefined)
    push.turnOffPush.mockResolvedValue('off')
    const onAnnounce = vi.fn()
    render(<PushSettings onAnnounce={onAnnounce} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Send a test notification' }))
    expect(onAnnounce).toHaveBeenCalledWith('Test notification sent.')
    await userEvent.click(screen.getByRole('button', { name: 'Turn off' }))
    expect(onAnnounce).toHaveBeenCalledWith('Browser notifications are off.')
    expect(await screen.findByRole('button', { name: 'Turn on browser notifications' })).toBeInTheDocument()
  })

  it('shows an error and keeps the state when a change fails', async () => {
    push.pushStatus.mockResolvedValue('on')
    push.turnOffPush.mockRejectedValue(new Error('offline'))
    render(<PushSettings onAnnounce={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Turn off' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't change browser notifications.")
    expect(screen.getByRole('button', { name: 'Turn off' })).toBeInTheDocument()
  })
})
