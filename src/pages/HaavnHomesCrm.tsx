import React, { useEffect, useState } from 'react'
import { HaavnMark } from './HaavnHomes'

/**
 * HAAVN HOMES — Management hub, opened from the top-right HM link inside HAAVN
 * Homes. It presents TWO pillars, then mounts the chosen self-contained tool
 * full-bleed in an iframe:
 *
 *   01 · Customer Journey Management  → public/haavn-homes-crm.html
 *        (sales · construction · contracts · the 15-step home journey)
 *   02 · Shareholder · Path to Market → public/haavn-path-to-market.html
 *        (6-month process · deliverables · seven gates · launch timeline)
 *
 * This is EXCLUSIVE to the HAAVN Homes surface. It is NOT the 7EVEN CRM and NOT
 * the shared HAAVN Management Hub — both of those are unchanged.
 *
 * Navigation: each tool's own "← Back" control posts `haavn-crm-close`; that
 * returns to the pillar hub when a tool is open, or closes back to HAAVN Homes
 * when already on the hub. Escape mirrors this.
 */
const PILLARS = [
  {
    id: 'crm', src: '/haavn-homes-crm.html', num: '01', color: '#C39A46',
    title: 'Customer Journey Management',
    sub: 'Sales · Construction · Contracts',
    blurb: 'Every enquiry, contract and home in delivery — the 15-step customer journey from first consult to handover.',
  },
  {
    id: 'ptm', src: '/haavn-path-to-market.html', num: '02', color: '#8FB79D',
    title: 'Shareholder · Path to Market',
    sub: 'Process · Deliverables · Gates',
    blurb: 'The six-month path to market: what each partner ships, the seven gates to a trading business, and the launch timeline.',
  },
] as const

export default function HaavnHomesCrm({ onClose }: { onClose: () => void }) {
  const [pillar, setPillar] = useState<string | null>(null)

  useEffect(() => {
    const back = () => { if (pillar) setPillar(null); else onClose() }
    function onMsg(e: MessageEvent) { if (e.data === 'haavn-crm-close') back() }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') back() }
    window.addEventListener('message', onMsg)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('message', onMsg); window.removeEventListener('keydown', onKey) }
  }, [pillar, onClose])

  const active = PILLARS.find(p => p.id === pillar)

  // A chosen pillar — mount its tool full-bleed. The tool's own "← Back" returns
  // here (via postMessage); no overlay chrome, so nothing overlaps the tool.
  if (active) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: '#0b0b0c', display: 'flex', flexDirection: 'column' }}>
        <iframe title={active.title} src={active.src}
          style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }} />
      </div>
    )
  }

  // The pillar hub.
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 700, overflowY: 'auto',
      background: `linear-gradient(180deg, rgba(7,9,13,0.74), rgba(7,9,13,0.92)), url('/renders/tower-hero.jpg') center / cover no-repeat fixed, #05070a`,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,0.10)', flexShrink: 0 }}>
        <button onClick={onClose}
          style={{ padding: '8px 15px', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, color: '#E8EDEF', background: 'rgba(12,14,13,0.7)', border: '1px solid #333b3f', borderRadius: 999, cursor: 'pointer', backdropFilter: 'blur(6px)' }}>
          ← HAAVN Homes
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9 }}>
          <HaavnMark height={14} fill="#EDEFF1" />
          <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 600 }}>Homes · Management</span>
        </div>
      </div>

      {/* Title */}
      <div style={{ padding: '46px 28px 8px', textAlign: 'center' }}>
        <p style={{ color: '#C39A46', fontSize: 10, letterSpacing: '0.30em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>HAAVN Homes · Management</p>
        <h1 style={{ color: '#F4F1E9', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 40px)', letterSpacing: '0.04em', margin: 0 }}>Choose a pillar</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13.5, lineHeight: 1.6, maxWidth: 460, margin: '12px auto 0' }}>
          Two management surfaces for HAAVN Homes — the customer's journey, and the shareholder path to market.
        </p>
      </div>

      {/* Pillars */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'stretch', padding: '28px 28px 60px', width: '100%', maxWidth: 880, margin: '0 auto' }}>
        {PILLARS.map(p => (
          <button key={p.id} onClick={() => setPillar(p.id)}
            style={{
              flex: '1 1 330px', minWidth: 0, textAlign: 'left', cursor: 'pointer',
              padding: '26px 26px 22px', borderRadius: 16,
              border: '1px solid rgba(220,232,244,0.18)', background: 'rgba(20,26,32,0.5)',
              backdropFilter: 'blur(14px) saturate(1.15)', WebkitBackdropFilter: 'blur(14px) saturate(1.15)',
              display: 'flex', flexDirection: 'column', gap: 10,
              transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 50px -24px rgba(0,0,0,0.7)',
            }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(28,36,44,0.72)'; el.style.borderColor = `${p.color}88`; el.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'rgba(20,26,32,0.5)'; el.style.borderColor = 'rgba(220,232,244,0.18)'; el.style.transform = 'none' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 700, color: p.color, lineHeight: 1 }}>{p.num}</span>
            <h3 style={{ color: '#F4F1E9', fontSize: 19, fontWeight: 700, letterSpacing: '-0.01em', margin: '4px 0 0' }}>{p.title}</h3>
            <p style={{ color: p.color, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>{p.sub}</p>
            <p style={{ color: 'rgba(255,255,255,0.66)', fontSize: 13, lineHeight: 1.55, margin: '4px 0 0' }}>{p.blurb}</p>
            <span style={{ marginTop: 'auto', paddingTop: 14, color: '#EDEFF1', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>Open →</span>
          </button>
        ))}
      </div>
    </div>
  )
}
