import React, { useEffect, useRef } from 'react'
import HaavnManagementBase, { HM_PILLARS_BLACK } from './HaavnManagementBase'
import { useScrollLock } from '../../lib/useScrollLock'
import { shortWindowHeight } from '../../lib/shortWindow'
import { getLatest } from '../../components/RefreshButton'

// What the ATRIUM button on the HAAVN BLACK home opens: one screen, no hub.
// public/atrium-hb.html holds the sidebar, the tab row and My day, and runs the three real tools
// (HAAVN BLACK workflow, Sales pipeline, Meeting Management) behind them, so their data and rules are untouched.
// The old Management Hub is still one query string away (?hub=old) in case the shell ever needs to be bypassed.
const VERSION = '20261109fu'

export default function AtriumBlackShell({ onClose, onLogout, onDisplay }: { onClose: () => void; onLogout: () => void; onDisplay?: () => void }) {
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
      else if (m === 'display') onDisplay ? onDisplay() : onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && e.target === document.body) onClose() }
    window.addEventListener('message', onMsg)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('message', onMsg); window.removeEventListener('keydown', onKey) }
  }, [oldHub, onClose, onLogout, onDisplay])

  if (oldHub) return <HaavnManagementBase pillars={HM_PILLARS_BLACK} onClose={onClose} onLogout={onLogout} />
  return (
    <div style={{ position: 'fixed', ...(sh ? { top: 0, left: 0, right: 0, height: sh } : { inset: 0 }), zIndex: 500, background: dark ? '#050607' : '#a6aab1', overflow: 'hidden', overscrollBehavior: 'none', boxSizing: 'border-box', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <iframe ref={frame} title="ATRIUM · HAAVN BLACK" src={`/atrium-hb.html?v=${VERSION}`} allow="microphone; clipboard-write"
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
    </div>
  )
}
