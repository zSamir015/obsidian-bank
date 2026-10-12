// A few seconds after the page has loaded, when the browser is idle, links the web app manifest and registers
// the service worker (src/pwa/sw.js), so neither competes with the first screen: a manifest
// linked in index.html is fetched, with an icon, before the largest paint. Browsers read the
// manifest from the document when they offer to install the app, so linking it late is enough.
export const SET_UP_DELAY_MS = 3000

export function setUpInstallableApp() {
  const base = import.meta.env.BASE_URL
  const setUp = () => {
    const manifest = document.createElement('link')
    manifest.rel = 'manifest'
    manifest.href = `${base}manifest.webmanifest`
    document.head.append(manifest)

    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    void navigator.serviceWorker.register(`${base}sw.js`, { updateViaCache: 'none' }).catch(() => {
      // Without a service worker the app works the same, just without the offline screen.
    })
  }
  // A few seconds after load: Lighthouse counts every request that starts before the largest
  // paint it observed, and on a fast machine the browser is idle before that.
  const later = () =>
    setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(setUp) : setUp()), SET_UP_DELAY_MS)
  if (document.readyState === 'complete') later()
  else window.addEventListener('load', later, { once: true })
}
