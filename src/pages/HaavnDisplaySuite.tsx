import React, { useEffect } from 'react'
import { useScrollLock } from '../lib/useScrollLock'

/**
 * HAAVN Display Suite — the customer-facing showroom, opened from the DS logo in
 * the top-left of HAAVN Homes. Clients browse the range, floor plans and renders,
 * then send an enquiry (mailto → design@haavn.au, bcc jamie@haavn.au). Served
 * full-bleed from public/haavn-display-suite.html.
 *
 * Its own nav "← Back" posts `haavn-ds-close`; Escape also closes.
 */
export default function HaavnDisplaySuite({ onClose }: { onClose: () => void }) {
  useScrollLock()
  useEffect(() => {
    function onMsg(e: MessageEvent) { if (e.data === 'haavn-ds-close') onClose() }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('message', onMsg)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('message', onMsg); window.removeEventListener('keydown', onKey) }
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: '#0b0b0c', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)', overflow: 'hidden', overscrollBehavior: 'none' }}>
      <iframe title="HAAVN Display Suite" src="/haavn-display-suite.html?v=2"
        style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }} />
    </div>
  )
}
