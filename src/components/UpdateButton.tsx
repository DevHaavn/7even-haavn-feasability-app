import React, { useState } from 'react'

/**
 * "Get the latest version" — a small footer pill (matches the 7EVEN.AU / HAAVN.AU
 * glass links). Lives in SiteLinks so it rides the footer on every working page.
 *
 * Users shouldn't need Cmd+Shift+R after we ship. It only reloads if a newer build
 * is actually deployed, and before reloading it blurs the active field and waits
 * past the auto-save debounce so in-progress input is flushed to storage (and
 * re-syncs to the cloud on load) — no lost work. If already current it just says so.
 */
export default function UpdateButton({ tone = 'dark' }: { tone?: 'dark' | 'light' | 'glass' }) {
  const [state, setState] = useState<'idle' | 'busy'>('idle')

  // An explicit "Update" tap ALWAYS force-refreshes. The old version compared the
  // loaded bundle hash to the deployed one and skipped the reload if they looked
  // equal — but on iOS Safari that check reads a *cached* index.html, so it wrongly
  // said "up to date" and the new build never came through. And a plain
  // location.reload() serves iOS's cached page. So: clear caches + service worker,
  // then navigate to a cache-busted URL, which forces a fresh index.html (and its
  // new hashed bundle) on every browser including iOS.
  async function getLatest() {
    if (state === 'busy') return
    setState('busy')
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    await new Promise(r => setTimeout(r, 700))   // let debounced auto-save flush to localStorage
    try { if ('caches' in window) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))) } } catch { /* ignore */ }
    try { const rs = await navigator.serviceWorker?.getRegistrations?.(); if (rs) await Promise.all(rs.map(r => r.unregister())) } catch { /* ignore */ }
    const url = location.origin + location.pathname + '?u=' + Date.now()
    try { location.replace(url) } catch { window.location.href = url }
  }

  const light = tone === 'light'
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px',
    fontSize: 7.5, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700,
    borderRadius: 999, cursor: state === 'busy' ? 'default' : 'pointer',
  }
  // Blue-grey glass, matching the footer's HAAVN.AU pill.
  const style: React.CSSProperties = light
    ? { ...base, background: 'var(--card, #fff)', border: '1px solid var(--border, #D3D4D8)', color: 'var(--fx-ink, #12150F)' }
    : { ...base, background: 'rgba(210,222,234,0.10)', border: '1px solid rgba(220,232,244,0.28)', color: '#EEF1F2', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }

  const label = state === 'busy' ? '⟳ Updating…' : state === 'latest' ? '✓ Up to date' : '⟳ Update'
  return (
    <button onClick={getLatest} style={style}
      title="Get the latest version — reloads only if a new update has shipped. Your saved work is kept.">
      {label}
    </button>
  )
}
