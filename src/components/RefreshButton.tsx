import React, { useState } from 'react'

/**
 * The footer refresh control. One hairline circle with a circling arrow, no word.
 * Style lives in public/atrium-refresh.css (linked from index.html) so the React
 * app and the static pages share a single source. Colour comes from the custom
 * properties --rb-c / --rb-h / --rb-g, set by the surface it sits on.
 *
 * Behaviour is the old UpdateButton's, kept whole: an explicit tap ALWAYS
 * force-refreshes. Clear caches and the service worker, then navigate to a
 * cache-busted URL. A plain location.reload() serves iOS's cached page, and a
 * bundle-hash comparison reads a cached index.html and wrongly says "current".
 * Before leaving, the active field is blurred and the auto-save debounce is
 * given time to flush, so no input is lost.
 */
export async function getLatest() {
  ;(document.activeElement as HTMLElement | null)?.blur?.()
  await new Promise(r => setTimeout(r, 900))   // the turn of the arrow, and the auto-save flush
  try { if ('caches' in window) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))) } } catch { /* ignore */ }
  try { const rs = await navigator.serviceWorker?.getRegistrations?.(); if (rs) await Promise.all(rs.map(r => r.unregister())) } catch { /* ignore */ }
  const url = location.origin + location.pathname + '?u=' + Date.now() + location.hash
  try { location.replace(url) } catch { window.location.href = url }
}

export default function RefreshButton({ size = 24, className = '', style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className={`rb${busy ? ' go' : ''}${className ? ' ' + className : ''}`}
      style={{ ['--s' as string]: size + 'px', ...style }}
      aria-label="Get the latest version"
      data-tip="Latest version"
      onClick={() => { if (busy) return; setBusy(true); void getLatest() }}
    >
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle className="rb-ring" cx="16" cy="16" r="15" />
        <g className="rb-arc">
          <path className="rb-ink" d="M20.98 11.82 A6.5 6.5 0 1 1 12.75 10.37" />
          <path className="rb-ink" transform="translate(12.75 10.37) rotate(-30)" d="M-2.5 -2.5 L0 0 L-2.5 2.5" />
        </g>
      </svg>
    </button>
  )
}
