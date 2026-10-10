import { GoTrueClient } from '@supabase/auth-js'
import { PostgrestClient } from '@supabase/postgrest-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.')
}

const baseUrl = url.replace(/\/+$/, '')
const auth = new GoTrueClient({
  url: `${baseUrl}/auth/v1`,
  headers: { apikey: anonKey },
  storageKey: `sb-${new URL(baseUrl).hostname.split('.')[0]}-auth-token`,
})

let accessToken: string | null = null
auth.onAuthStateChange((_event, session) => {
  accessToken = session?.access_token ?? anonKey
})

const rest = new PostgrestClient<Database>(`${baseUrl}/rest/v1`, {
  schema: 'public',
  headers: { apikey: anonKey },
  fetch: async (input, init) => {
    if (accessToken === null) {
      const { data, error } = await auth.getSession()
      if (error) throw error
      accessToken = data.session?.access_token ?? anonKey
    }

    const headers = new Headers(init?.headers)
    headers.set('apikey', anonKey)
    headers.set('Authorization', `Bearer ${accessToken}`)
    return fetch(input, { ...init, headers })
  },
})

export const supabase = Object.assign(rest, { auth })
