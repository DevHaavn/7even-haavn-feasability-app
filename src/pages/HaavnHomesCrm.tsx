import React, { useEffect } from 'react'

/**
 * HAAVN HOMES — ATRIUM CRM & Delivery.
 *
 * A self-contained sales / construction-contract / customer-management tool,
 * EXCLUSIVE to the HAAVN Homes app interface. It opens from the top-right HM
 * link inside HAAVN Homes and is served full-bleed from
 * public/haavn-homes-crm.html.
 *
 * This is deliberately NOT the 7EVEN CRM and NOT the shared HAAVN Management Hub
 * CRM — both of those remain exactly as they were. Only the HAAVN Homes surface
 * points its HM link here.
 *
 * Closing: the embedded CRM's own "← ATRIUM Home" control posts
 * `haavn-crm-close` to the parent; Escape also closes. Both return to HAAVN
 * Homes without leaving the app.
 */
export default function HaavnHomesCrm({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data === 'haavn-crm-close') onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('message', onMsg)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('message', onMsg)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: '#0b0b0c', display: 'flex', flexDirection: 'column' }}>
      <iframe title="HAAVN Homes — ATRIUM CRM & Delivery" src="/haavn-homes-crm.html"
        style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }} />
    </div>
  )
}
