/* global self, caches, URL, Response */
// Service worker. The build (see `serviceWorker()` in vite.config.ts) fills in the
// placeholders below and writes it to dist/sw.js.
//
// It also shows web push notifications (#40); see the push handlers at the end.
//
// It only ever caches the app shell: the HTML, the hashed JavaScript, CSS and fonts under
// assets/, the icons and the manifest. Supabase requests (accounts, balances, activity,
// auth) are never handled here, so no financial data is stored for offline use.

const VERSION = '__VERSION__'
const BASE = '__BASE__'
const PRECACHE = __PRECACHE__

const PREFIX = 'obsidian-bank-shell-'
const CACHE = `${PREFIX}${VERSION}`
// The current shell and the one before it. A tab opened before a deploy can still load the
// route chunks it already used, so "This page didn't load" stays rare.
const KEEP_VERSIONS = 2
const SHELL = new Set(PRECACHE.map((path) => BASE + path))

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      // Hashed files never change, so the HTTP cache is fine for them; the rest is revalidated.
      await cache.addAll(
        PRECACHE.map(
          (path) => new Request(BASE + path, { cache: path.startsWith('assets/') ? 'default' : 'no-cache' }),
        ),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // caches.keys() lists caches in the order they were created.
      const shells = (await caches.keys()).filter((key) => key.startsWith(PREFIX) && key !== CACHE)
      const stale = shells.slice(0, Math.max(0, shells.length - (KEEP_VERSIONS - 1)))
      await Promise.all(stale.map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return

  if (request.mode === 'navigate') {
    event.respondWith(navigate(request))
  } else if (url.pathname.startsWith(`${BASE}assets/`) || SHELL.has(url.pathname)) {
    event.respondWith(shellFile(request))
  }
})

/** Network first, so a deploy shows up on the next visit; the cached shell when offline. */
async function navigate(request) {
  try {
    return await fetch(request)
  } catch {
    return (await caches.match(`${BASE}index.html`, { ignoreVary: true })) ?? Response.error()
  }
}

/** Cache first. Route chunks that weren't precached are kept the first time they load. */
async function shellFile(request) {
  // Static files only: a Vary header (Origin, Accept-Encoding) must not hide a cached copy.
  const cached = await caches.match(request, { ignoreVary: true })
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok && new URL(request.url).pathname.startsWith(`${BASE}assets/`)) {
    const cache = await caches.open(CACHE)
    await cache.put(request, response.clone())
  }
  return response
}

// Web push. The payload is built by the send-push Edge Function and only carries a title and
// a body (merchant, amount and last four digits), a tag and the screen a click opens.
self.addEventListener('push', (event) => {
  let payload = null
  try {
    payload = event.data?.json() ?? null
  } catch {
    payload = null
  }
  if (!payload || typeof payload.title !== 'string' || typeof payload.body !== 'string') return
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: typeof payload.tag === 'string' ? payload.tag : undefined,
      icon: `${BASE}icons/icon-192.png`,
      data: { path: payload.path === 'notifications' ? 'notifications' : '' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(BASE + (event.notification.data?.path ?? ''), self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window' })
      const open = windows.find((client) => new URL(client.url).pathname.startsWith(BASE))
      if (open) {
        await open.focus()
        await open.navigate(url)
      } else {
        await self.clients.openWindow(url)
      }
    })(),
  )
})
