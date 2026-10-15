import React, { useEffect } from 'react'
import { useScrollLock } from '../lib/useScrollLock'

/**
 * HAAVN BLACK Display: the display suite, opened from the DS logo in the
 * top-left of HAAVN Homes. SOLUM first (choose the home, then the cladding, the
 * interior, the plan and the way home, all following the choice), then the whole
 * range: the Black Series and the Essentials homes, each with its renders and plans.
 * It presents to a television either with a TV window (Present, Open a TV window)
 * or by room code (the TV opens /haavn-black-display/index.html?tv=1 and shows four
 * letters, which are typed under Present). Served full-bleed from
 * public/haavn-black-display/; the previous Studio stays at
 * public/haavn-black-studio.html with its films and live models, one tap away
 * under Present, and the earlier suite at public/haavn-display-suite.html.
 *
 * Its "Return" posts `haavn-ds-close`; Escape also closes.
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
      <iframe title="HAAVN BLACK Display" src="/haavn-black-display/index.html?v=20261015l" allow="fullscreen; autoplay"
        style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }} />
    </div>
  )
}
