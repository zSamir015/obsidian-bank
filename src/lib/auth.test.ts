import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthClient, type Session } from './auth'

const KEY = 'sb-test-auth-token'
const now = () => Math.round(Date.now() / 1000)

const session = (overrides: Partial<Session> = {}): Session => ({
  access_token: 'access-1',
  refresh_token: 'refresh-1',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: now() + 3600,
  user: { id: 'user-1', is_anonymous: true },
  ...overrides,
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

let fetchMock: ReturnType<typeof vi.fn>
const client = () => new AuthClient('https://x.supabase.co/auth/v1', 'anon', KEY)

beforeEach(() => {
  localStorage.clear()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AuthClient', () => {
  it('signs in anonymously, stores the session like @supabase/auth-js and notifies', async () => {
    fetchMock.mockResolvedValue(json({ ...session(), expires_at: undefined }))
    const auth = client()
    const events: string[] = []
    auth.onAuthStateChange((event) => events.push(event))

    expect(await auth.signInAnonymously()).toEqual({ error: null })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://x.supabase.co/auth/v1/signup')
    expect(init.headers).toMatchObject({ apikey: 'anon' })
    expect(JSON.parse(init.body)).toEqual({ data: {} })
    const stored = JSON.parse(localStorage.getItem(KEY)!)
    expect(stored.access_token).toBe('access-1')
    expect(stored.expires_at).toBeGreaterThan(now())
    await vi.waitFor(() => expect(events).toHaveLength(2))
    expect(events).toContain('SIGNED_IN')
  })

  it('ends with the signed-in session whatever order the events arrive in', async () => {
    fetchMock.mockResolvedValue(json(session()))
    const auth = client()
    const seen: (Session | null)[] = []
    auth.onAuthStateChange((_event, value) => seen.push(value))
    await auth.signInAnonymously()
    await vi.waitFor(() => expect(seen).toHaveLength(2))
    expect(seen.at(-1)?.user.id).toBe('user-1')
  })

  it('returns an error when sign-in fails', async () => {
    fetchMock.mockResolvedValue(json({ msg: 'Anonymous sign-ins are disabled' }, 422))
    const { error } = await client().signInAnonymously()
    expect(error?.message).toBe('Anonymous sign-ins are disabled')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('reads a valid stored session without a request', async () => {
    localStorage.setItem(KEY, JSON.stringify(session()))
    const { data } = await client().getSession()
    expect(data.session?.user.id).toBe('user-1')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ignores stored values that are not a session', async () => {
    localStorage.setItem(KEY, '{"nope":true}')
    expect((await client().getSession()).data.session).toBeNull()
  })

  it('refreshes a session about to expire, once for concurrent callers', async () => {
    localStorage.setItem(KEY, JSON.stringify(session({ expires_at: now() + 10 })))
    fetchMock.mockResolvedValue(json(session({ access_token: 'access-2', refresh_token: 'refresh-2' })))
    const auth = client()
    const [a, b] = await Promise.all([auth.getSession(), auth.getSession()])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://x.supabase.co/auth/v1/token?grant_type=refresh_token')
    expect(JSON.parse(init.body)).toEqual({ refresh_token: 'refresh-1' })
    expect(a.data.session?.access_token).toBe('access-2')
    expect(b.data.session?.access_token).toBe('access-2')
    expect(JSON.parse(localStorage.getItem(KEY)!).refresh_token).toBe('refresh-2')
  })

  it('signs out when the server rejects the refresh token', async () => {
    localStorage.setItem(KEY, JSON.stringify(session({ expires_at: now() - 10 })))
    fetchMock.mockResolvedValue(json({ error_description: 'Invalid Refresh Token' }, 400))
    const auth = client()
    const events: string[] = []
    auth.onAuthStateChange((event) => events.push(event))
    const { data, error } = await auth.getSession()
    expect(data.session).toBeNull()
    expect(error).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(events).toContain('SIGNED_OUT')
  })

  it('keeps the session when the refresh fails on the network', async () => {
    localStorage.setItem(KEY, JSON.stringify(session({ expires_at: now() - 10 })))
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const { data, error } = await client().getSession()
    expect(data.session).toBeNull()
    expect(error).toBeInstanceOf(TypeError)
    expect(localStorage.getItem(KEY)).not.toBeNull()
  })

  it('signs out locally even if the logout request fails', async () => {
    localStorage.setItem(KEY, JSON.stringify(session()))
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const auth = client()
    const events: [string, Session | null][] = []
    auth.onAuthStateChange((event, value) => events.push([event, value]))
    await auth.signOut()
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(events).toContainEqual(['SIGNED_OUT', null])
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://x.supabase.co/auth/v1/logout')
    expect(init.headers).toMatchObject({ Authorization: 'Bearer access-1' })
  })

  it('follows sign-in and sign-out from another tab', async () => {
    const auth = client()
    const events: string[] = []
    auth.onAuthStateChange((event) => events.push(event))
    localStorage.setItem(KEY, JSON.stringify(session()))
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }))
    localStorage.removeItem(KEY)
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }))
    expect(events).toEqual(expect.arrayContaining(['TOKEN_REFRESHED', 'SIGNED_OUT']))
  })

  it('stops notifying after unsubscribe', async () => {
    fetchMock.mockResolvedValue(json(session()))
    const auth = client()
    const listener = vi.fn()
    auth.onAuthStateChange(listener).data.subscription.unsubscribe()
    await auth.signInAnonymously()
    expect(listener).not.toHaveBeenCalled()
  })
})
