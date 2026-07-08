// SELF-DESTRUCTING SERVICE WORKER.
// A previous version cached the app shell and pinned browsers to old deploys.
// This replacement unregisters itself, deletes every cache, and reloads any
// controlled tabs ONCE so they pick up the latest deploy fresh from the network.
// The app no longer registers a service worker, so this runs a single time.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach((c) => c.navigate(c.url))
    } catch (_) { /* no-op */ }
  })())
})

// Always go straight to the network — never serve a cached build.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
