// Minimal Supabase Auth (GoTrue) client for anonymous demo sessions.
//
// The app only signs in anonymously, reads the session, refreshes it and signs out, so it
// talks to the Auth REST API directly instead of shipping @supabase/auth-js (about 23 kB of
// gzip in the first JavaScript, which put Overview's LCP over budget; see #57). Sessions are
// stored under the same key and in the same shape as @supabase/auth-js, so existing sessions
// keep working.

export interface Session {
  readonly access_token: string
  readonly refresh_token: string
  readonly token_type: string
  readonly expires_in: number
  /** Unix time in seconds. */
  readonly expires_at: number
  readonly user: { readonly id: string; readonly is_anonymous?: boolean }
}

export type AuthEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED'
type Listener = (event: AuthEvent, session: Session | null) => void

/** Refresh when the access token has less than this left. */
const REFRESH_MARGIN_S = 60
const AUTO_REFRESH_MS = 30_000

export class AuthClient {
  private readonly listeners = new Set<Listener>()
  private refreshing: Promise<Session | null> | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  /** Fallback when localStorage is unavailable (some private modes). */
  private memory: Session | null = null

  private readonly url: string
  private readonly apiKey: string
  readonly storageKey: string

  constructor(url: string, apiKey: string, storageKey: string) {
    this.url = url
    this.apiKey = apiKey
    this.storageKey = storageKey
    if (typeof window !== 'undefined') {
      // Another tab signed in, refreshed or signed out.
      window.addEventListener('storage', (event) => {
        if (event.key !== this.storageKey) return
        const session = this.read()
        this.emit(session ? 'TOKEN_REFRESHED' : 'SIGNED_OUT', session)
      })
    }
  }

  /** The stored session, refreshed first if it is about to expire. Never throws. */
  async getSession(): Promise<{ data: { session: Session | null }; error: Error | null }> {
    const session = this.read()
    if (!session) return { data: { session: null }, error: null }
    if (session.expires_at - Date.now() / 1000 > REFRESH_MARGIN_S) {
      this.startAutoRefresh()
      return { data: { session }, error: null }
    }
    try {
      return { data: { session: await this.refresh(session) }, error: null }
    } catch (error) {
      return { data: { session: null }, error: error as Error }
    }
  }

  async signInAnonymously(): Promise<{ error: Error | null }> {
    try {
      const session = await this.request('/signup', { data: {} })
      this.save(session)
      this.emit('SIGNED_IN', session)
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async signOut(): Promise<void> {
    const session = this.read()
    this.clear()
    this.emit('SIGNED_OUT', null)
    if (session) {
      // Revokes the refresh token on the server; signing out locally doesn't depend on it.
      await fetch(`${this.url}/logout`, {
        method: 'POST',
        headers: { apikey: this.apiKey, Authorization: `Bearer ${session.access_token}` },
      }).catch(() => {})
    }
  }

  /** Calls back on every change, and once with the current session (like @supabase/auth-js). */
  onAuthStateChange(listener: Listener) {
    this.listeners.add(listener)
    // Delivered after any refresh, with the session as it is then: a sign-in that happened in
    // the meantime must not be overwritten by the value read at subscribe time.
    void this.getSession().then(() => {
      if (this.listeners.has(listener)) listener('INITIAL_SESSION', this.read())
    })
    return { data: { subscription: { unsubscribe: () => void this.listeners.delete(listener) } } }
  }

  private refresh(session: Session): Promise<Session | null> {
    this.refreshing ??= this.request('/token?grant_type=refresh_token', { refresh_token: session.refresh_token })
      .then((next) => {
        this.save(next)
        this.emit('TOKEN_REFRESHED', next)
        return next
      })
      .catch((error: Error & { status?: number }) => {
        // The server rejected the refresh token (expired, revoked, user deleted): sign out.
        // A network error keeps the session so the next attempt can succeed.
        if (error.status !== undefined && error.status >= 400 && error.status < 500) {
          this.clear()
          this.emit('SIGNED_OUT', null)
          return null
        }
        throw error
      })
      .finally(() => {
        this.refreshing = null
      })
    return this.refreshing
  }

  private startAutoRefresh() {
    if (this.timer || typeof window === 'undefined') return
    this.timer = setInterval(() => {
      if (document.visibilityState === 'visible') void this.getSession()
    }, AUTO_REFRESH_MS)
  }

  private async request(path: string, body: unknown): Promise<Session> {
    const response = await fetch(`${this.url}${path}`, {
      method: 'POST',
      headers: { apikey: this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.access_token) {
      throw Object.assign(new Error(data?.msg ?? data?.error_description ?? `auth ${response.status}`), {
        status: response.status,
      })
    }
    const expiresIn = Number(data.expires_in) || 3600
    return { ...data, expires_in: expiresIn, expires_at: data.expires_at ?? Math.round(Date.now() / 1000) + expiresIn }
  }

  private read(): Session | null {
    try {
      const value = JSON.parse(localStorage.getItem(this.storageKey) ?? 'null')
      return value?.access_token && value?.refresh_token && value?.user?.id ? (value as Session) : null
    } catch {
      return this.memory
    }
  }

  private save(session: Session) {
    this.memory = session
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(session))
    } catch {
      // Private mode without storage: the session lives until the tab closes.
    }
    this.startAutoRefresh()
  }

  private clear() {
    this.memory = null
    try {
      localStorage.removeItem(this.storageKey)
    } catch {
      // Nothing stored.
    }
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private emit(event: AuthEvent, session: Session | null) {
    for (const listener of this.listeners) listener(event, session)
  }
}
