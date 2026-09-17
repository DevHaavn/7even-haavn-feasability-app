import React, { useEffect } from 'react'
import { useScrollLock } from '../lib/useScrollLock'

/**
 * HAAVN BLACK Studio — the display suite, opened from the DS logo in the
 * top-left of HAAVN Homes. Built as a launch: the story, the design, the range
 * with a page per home, and how it is made. It presents to a television either
 * by pairing (the TV opens /haavn-black-studio.html?tv=1 and shows a code) or
 * by mirroring with Present. Served full-bleed from public/haavn-black-studio.html;
 * the previous suite stays at public/haavn-display-suite.html as a fallback.
 *
 * Its "← Return" posts `haavn-ds-close`; Escape also closes.
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: '#0b0b0c', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', overflow: 'hidden', overscrollBehavior: 'none' }}>
      <iframe title="HAAVN BLACK Studio" src="/haavn-black-studio.html?v=6" allow="fullscreen; autoplay"
        style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }} />
    </div>
  )
}
