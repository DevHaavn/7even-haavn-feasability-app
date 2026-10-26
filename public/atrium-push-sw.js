// ATRIUM Chat alerts. This service worker only ever receives pushes and shows them. It caches nothing and never touches pages,
// so it cannot pin anyone to an old version of ATRIUM (which is why ATRIUM removes every other service worker).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch { d = { title: 'ATRIUM Chat', body: event.data ? event.data.text() : '' } }
  event.waitUntil((async () => {
    // when ATRIUM is already open and in front, the page shows its own banner and chime: this one stays silent
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const seen = wins.some((c) => c.visibilityState === 'visible')
    await self.registration.showNotification(d.title || 'ATRIUM Chat', {
      body: d.body || '',
      tag: d.tag || 'atrium-chat',          // one notification per chat, the newest replaces the last
      renotify: !seen,
      silent: seen,
      data: { url: d.url || '/', gid: d.tag || '' },
    })
  })())
})

// Tapping it: bring ATRIUM forward on that chat if it is already open, otherwise open it there.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const { url, gid } = event.notification.data || {}
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of list) {
      if ('focus' in c) { c.postMessage({ atriumChat: 'goto', gid }); try { await c.focus() } catch { /* ignore */ } return }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url || '/')
  })())
})
