/* global self, caches, URL, Response */
// Service worker. The build (see `serviceWorker()` in vite.config.ts) fills in the
// placeholders below and writes it to dist/sw.js.
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
