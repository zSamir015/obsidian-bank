// send-push Edge Function (Deno). Deployed with --no-verify-jwt: it checks its callers itself.
//
// Two callers:
// * The database (migration 010), with the shared secret, right after a flagged-activity
//   notification is created: { notification_id }. It pushes that notification to every
//   browser its owner opted in on.
// * A signed-in user, with their own access token: { test: true }. It sends a test push to
//   that user's browsers only, so the opt-in screen can show that delivery works.
//
// Subscriptions the push service reports as gone (404/410) are deleted.
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_WEBHOOK_SECRET and,
// optionally, PUSH_ALLOWED_ORIGINS. SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
import webpush from 'npm:web-push@3.6.7'
import { asPushLocale, flaggedPayload, type PushLocale, type PushPayload, testPayload } from './payload.ts'

const env = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

const SUPABASE_URL = env('SUPABASE_URL')
const ANON_KEY = env('SUPABASE_ANON_KEY')
const SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY')
const WEBHOOK_SECRET = env('PUSH_WEBHOOK_SECRET')
const ALLOWED_ORIGINS = (Deno.env.get('PUSH_ALLOWED_ORIGINS') ?? 'https://zsamir015.github.io').split(',')

webpush.setVapidDetails(env('VAPID_SUBJECT'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Subscription {
  readonly endpoint: string
  readonly p256dh: string
  readonly auth: string
  readonly locale: string
}

Deno.serve(async (request) => {
  const cors = corsHeaders(request)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors)

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const body = await request.json().catch(() => null)

  if (token && constantTimeEqual(token, WEBHOOK_SECRET)) {
    const id = body?.notification_id
    if (typeof id !== 'string' || !UUID.test(id)) return json({ error: 'invalid_request' }, 400, cors)
    const [notification] = await rest<
      { user_id: string; merchant: string; amount_cents: number; card_last4: string | null }[]
    >(`notifications?id=eq.${id}&select=user_id,merchant,amount_cents,card_last4`)
    if (!notification) return json({ error: 'not_found' }, 404, cors)
    const sent = await pushToUser(notification.user_id, (locale) => flaggedPayload(notification, locale))
    return json({ sent }, 200, cors)
  }

  const user = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  })
  if (!user.ok) return json({ error: 'not_authenticated' }, 401, cors)
  if (body?.test !== true) return json({ error: 'invalid_request' }, 400, cors)
  const { id } = (await user.json()) as { id: string }
  const sent = await pushToUser(id, testPayload)
  return json({ sent }, 200, cors)
})

async function pushToUser(userId: string, build: (locale: PushLocale) => PushPayload) {
  const subscriptions = await rest<Subscription[]>(
    `push_subscriptions?user_id=eq.${userId}&select=endpoint,p256dh,auth,locale`,
  )
  const results = await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          JSON.stringify(build(asPushLocale(subscription.locale))),
          { TTL: 60 * 60 },
        )
        return true
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await rest(`push_subscriptions?endpoint=eq.${encodeURIComponent(subscription.endpoint)}`, {
            method: 'DELETE',
          })
        } else {
          console.error('push failed', status)
        }
        return false
      }
    }),
  )
  return results.filter(Boolean).length
}

/** PostgREST with the service role: this function reads across users by design. */
async function rest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  })
  if (!response.ok) throw new Error(`PostgREST ${response.status}`)
  return init.method === 'DELETE' ? (undefined as T) : ((await response.json()) as T)
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]!,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(data: unknown, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
}

function constantTimeEqual(a: string, b: string) {
  const left = new TextEncoder().encode(a)
  const right = new TextEncoder().encode(b)
  let difference = left.length ^ right.length
  for (let i = 0; i < Math.max(left.length, right.length); i++) difference |= (left[i] ?? 0) ^ (right[i] ?? 0)
  return difference === 0
}
