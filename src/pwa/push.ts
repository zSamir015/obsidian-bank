import type { Locale } from '@/i18n/locales'
import { supabase } from '@/lib/supabase'

// Web push opt-in for flagged activity (#40). The subscription is per browser; the server
// keeps it in push_subscriptions and pushes from the send-push Edge Function.

export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

export type PushStatus = 'unsupported' | 'blocked' | 'off' | 'on'

export function pushSupported() {
  return import.meta.env.PROD && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** The app's service worker, registering it now if the page hasn't yet (it waits for idle). */
async function registration() {
  const base = import.meta.env.BASE_URL
  const existing = await navigator.serviceWorker.getRegistration(base)
  if (!existing) await navigator.serviceWorker.register(`${base}sw.js`, { updateViaCache: 'none' })
  return navigator.serviceWorker.ready
}

async function currentSubscription() {
  return (await registration()).pushManager.getSubscription()
}

export async function pushStatus(): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission !== 'granted') return 'off'
  return (await currentSubscription()) ? 'on' : 'off'
}

/** Asks for permission (only ever from a click), subscribes and stores the subscription. */
export async function turnOnPush(locale: Locale): Promise<PushStatus> {
  const permission = await Notification.requestPermission()
  if (permission === 'denied') return 'blocked'
  if (permission !== 'granted') return 'off'

  const pushManager = (await registration()).pushManager
  const subscription =
    (await pushManager.getSubscription()) ??
    (await pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY) }))
  try {
    await saveSubscription(subscription, locale)
  } catch (error) {
    await subscription.unsubscribe()
    throw error
  }
  return 'on'
}

/** Keeps the language of the notifications in step with the app's. */
export async function updatePushLocale(locale: Locale) {
  const subscription = await currentSubscription()
  if (subscription) await saveSubscription(subscription, locale)
}

export async function turnOffPush(): Promise<PushStatus> {
  const subscription = await currentSubscription()
  if (subscription) {
    const { error } = await supabase.rpc('delete_push_subscription', { p_endpoint: subscription.endpoint })
    if (error) throw new Error(error.message)
    await subscription.unsubscribe()
  }
  return 'off'
}

export async function sendTestPush() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('not_authenticated')
  const url = import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, '')
  const response = await fetch(`${url}/functions/v1/send-push`, {
    method: 'POST',
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ test: true }),
  })
  if (!response.ok) throw new Error(`send-push ${response.status}`)
}

async function saveSubscription(subscription: PushSubscription, locale: Locale) {
  const { endpoint, keys } = subscription.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: endpoint ?? '',
    p_p256dh: keys?.p256dh ?? '',
    p_auth: keys?.auth ?? '',
    p_locale: locale,
  })
  if (error) throw new Error(error.message)
}

export function base64UrlToBytes(value: string) {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}
