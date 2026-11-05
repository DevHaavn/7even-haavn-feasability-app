import React, { useEffect, useRef } from 'react'
import HaavnManagementBase from './HaavnManagementBase'
import { useScrollLock } from '../../lib/useScrollLock'

// What the HAAVN menu's ATRIUM button (and a consultant's login) opens: one screen, no hub.
// public/atrium-hm.html holds the sidebar, the tab row and My day in the HAAVN skin, and runs the real tools behind them
// (HAAVN workflow, the HAAVN BLACK Sales pipeline, Meeting Management), so their data and rules are untouched.
// The old Management Hub is still one query string away (?hub=old).
const VERSION = '20261105h3'

export default function AtriumHaavnShell({ onClose, onLogout, exit = 'close' }: { onClose: () => void; onLogout: () => void; exit?: 'close' | 'logout' }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const oldHub = typeof location !== 'undefined' && new URLSearchParams(location.search).get('hub') === 'old'
  useScrollLock(!oldHub)
  useEffect(() => {
    if (oldHub) return
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return
      const m = e.data && (e.data as { hbShell?: string }).hbShell
      if (m === 'close') onClose()
      else if (m === 'logout') onLogout()
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [oldHub, onClose, onLogout])

  if (oldHub) return <HaavnManagementBase onClose={onClose} onLogout={onLogout} />
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#cfccc6', overflow: 'hidden', overscrollBehavior: 'none' }}>
      <iframe ref={frame} title="ATRIUM · HAAVN" src={`/atrium-hm.html?v=${VERSION}${exit === 'logout' ? '&exit=logout' : ''}`} allow="microphone; clipboard-write"
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
    </div>
  )
}
