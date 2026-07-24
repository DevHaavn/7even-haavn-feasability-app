import React, { useState } from 'react'

/**
 * "Get the latest version" button.
 *
 * Users shouldn't need Cmd+Shift+R after we ship an update. This checks whether a
 * newer build is actually deployed and, if so, reloads onto it — WITHOUT losing
 * work: it first blurs the active field (committing its value) and waits past the
 * auto-save debounce so every edit is written to localStorage (and re-syncs to the
 * cloud on load). If there's no new build it just says so and does nothing, so it
 * never disrupts someone mid-task.
 *
 * It's a fixed, high-z-index pill so the ONE button rides above every surface —
 * the Feasibility Studio, and the HAAVN CRM / Black Series / Homes screens that
 * run in same-origin iframes (reloading the top window refreshes those too).
 */
export default function UpdateButton() {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  // The main app bundle currently running in this tab.
  function currentBundle(): string | null {
    return Array.from(document.querySelectorAll('script[src]'))
      .map(s => (s as HTMLScriptElement).src)
      .find(s => /\/assets\/index-[\w-]+\.js/.test(s)) || null
  }
  // The main app bundle the server is serving right now (fresh, no cache).
  async function deployedBundle(): Promise<string | null> {
    try {
      const html = await fetch(`/?_=${Date.now()}`, { cache: 'no-store' }).then(r => r.text())
      const m = html.match(/\/assets\/index-[\w-]+\.js/)
      return m ? new URL(m[0], location.origin).href : null
    } catch { return null }
  }

  async function getLatest() {
    if (busy) return
    setBusy(true); setNote(null)

    // Only reload if the deployed build differs from what's running.
    const cur = currentBundle()
    const live = await deployedBundle()
    if (cur && live && cur === live) {
      setBusy(false)
      setNote('You’re on the latest version')
      setTimeout(() => setNote(null), 2600)
      return
    }

    // New build (or we couldn't tell) → safe reload.
    // 1) Commit the field being edited and let the debounced auto-save flush to
    //    localStorage so nothing typed is lost.
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    await new Promise(r => setTimeout(r, 900))
    // 2) Belt & braces: drop any Cache Storage / stale service worker so the
    //    reload pulls the freshly-deployed assets.
    try { if ('caches' in window) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))) } } catch { /* ignore */ }
    try { const rs = await navigator.serviceWorker?.getRegistrations?.(); if (rs) await Promise.all(rs.map(r => r.unregister())) } catch { /* ignore */ }
    // 3) index.html is served no-cache, so this lands on the latest build.
    window.location.reload()
  }

  return (
    <div style={{ position: 'fixed', bottom: 18, right: 18, zIndex: 9998, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      {note && (
        <div style={{ background: 'rgba(13,13,15,0.92)', color: '#8fe0b0', border: '1px solid rgba(127,208,163,0.4)', borderRadius: 8, padding: '7px 12px', fontSize: 11, letterSpacing: '0.06em', backdropFilter: 'blur(8px)', boxShadow: '0 6px 20px rgba(0,0,0,0.35)' }}>
          ✓ {note}
        </div>
      )}
      <button onClick={getLatest} disabled={busy}
        title="Get the latest version — safely reloads if we've shipped an update. Your saved work is kept."
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 15px', borderRadius: 999, cursor: busy ? 'default' : 'pointer',
          background: 'rgba(13,13,15,0.9)', color: '#E8EDEF', border: '1px solid rgba(196,151,58,0.45)',
          fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700,
          backdropFilter: 'blur(8px)', boxShadow: '0 6px 20px rgba(0,0,0,0.35)' }}>
        <span style={{ display: 'inline-block', fontSize: 13, lineHeight: 1, animation: busy ? 'atr-spin 0.8s linear infinite' : 'none' }}>⟳</span>
        {busy ? 'Updating…' : 'Update'}
      </button>
      <style>{`@keyframes atr-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
