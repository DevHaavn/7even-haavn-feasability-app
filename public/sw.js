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

// NO fetch handler on purpose. A self-destructing worker must never intercept
// network requests: re-issuing POSTs via respondWith(fetch(event.request))
// can fail cross-origin uploads with "Failed to fetch", which silently breaks
// the Supabase save/push (edits then only live in localStorage and never sync).
// Without a fetch listener the browser goes straight to the network for
// everything, so this worker can only clean up and unregister — never break a
// request.
