import React, { useEffect, useRef } from 'react'
import HaavnManagementBase from './HaavnManagementBase'
import { useScrollLock } from '../../lib/useScrollLock'
import { shortWindowHeight } from '../../lib/shortWindow'
import { getLatest } from '../../components/RefreshButton'

// What the HAAVN menu's ATRIUM button (and a consultant's login) opens: one screen, no hub.
// public/atrium-hm.html holds the sidebar, the tab row and My day in the HAAVN skin, and runs the real tools behind them
// (HAAVN workflow, the HAAVN BLACK Sales pipeline, Meeting Management), so their data and rules are untouched.
// The old Management Hub is still one query string away (?hub=old).
const VERSION = '20261109th'

export default function AtriumHaavnShell({ onClose, onLogout, exit = 'close' }: { onClose: () => void; onLogout: () => void; exit?: 'close' | 'logout' }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const oldHub = typeof location !== 'undefined' && new URLSearchParams(location.search).get('hub') === 'old'
  useScrollLock(!oldHub)
  const [sh, setSh] = React.useState(() => shortWindowHeight())
  const [dark, setDark] = React.useState(() => { try { return localStorage.getItem('atrium_theme') === 'dark' } catch { return false } })
  useEffect(() => {
    const re = () => { setSh(shortWindowHeight()); try { setDark(localStorage.getItem('atrium_theme') === 'dark') } catch { /* private mode */ } }
    window.addEventListener('resize', re); window.addEventListener('orientationchange', re); window.addEventListener('storage', re)
    return () => { window.removeEventListener('resize', re); window.removeEventListener('orientationchange', re); window.removeEventListener('storage', re) }
  }, [])
  useEffect(() => {
    if (oldHub) return
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return
      const m = e.data && (e.data as { hbShell?: string }).hbShell
      if (m === 'close') onClose()
      else if (m === 'logout') onLogout()
      else if (m === 'refresh') void getLatest()
      else if (m === 'feasibility') window.location.href = '/haavn-feasibility.html?from=atrium'
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [oldHub, onClose, onLogout])

  if (oldHub) return <HaavnManagementBase onClose={onClose} onLogout={onLogout} />
  return (
    <div style={{ position: 'fixed', ...(sh ? { top: 0, left: 0, right: 0, height: sh } : { inset: 0 }), zIndex: 500, background: dark ? '#050605' : '#cfccc6', overflow: 'hidden', overscrollBehavior: 'none', boxSizing: 'border-box', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <iframe ref={frame} title="ATRIUM · HAAVN" src={`/atrium-hm.html?v=${VERSION}${exit === 'logout' ? '&exit=logout' : ''}`} allow="microphone; clipboard-write"
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
    </div>
  )
}
