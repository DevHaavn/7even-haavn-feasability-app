import React, { useEffect, useState } from 'react'
import SiteLinks from '../components/SiteLinks'
import { Project7Mark } from '../components/ui'
import { AtriumApex } from '../components/AtriumMark'
import { atriumPalette, atriumNavPill } from '../lib/atriumTheme'
import { HM_PA } from './capital/HaavnManagementBase'

/**
 * HAAVN HOMES — Management hub, opened from the top-right HM link inside HAAVN
 * Homes. Styled to read as one product with the ATRIUM Management Hub (same
 * architectural plate, header, glowing pillars and footer). Two pillars, then
 * the chosen self-contained tool mounts full-bleed in an iframe:
 *
 *   01 · Customer Journey Management  → public/haavn-homes-crm.html
 *   02 · Shareholder · Path to Market → public/haavn-path-to-market.html
 *
 * EXCLUSIVE to HAAVN Homes — not the 7EVEN CRM and not the shared HM Hub.
 * Each tool's "← Back" (postMessage) returns to the hub; the hub returns to
 * HAAVN Homes. Escape mirrors this.
 */
const PILLARS = [
  {
    id: 'crm', src: '/haavn-homes-crm.html', num: '01', color: '#57c08a',
    title: 'Customer Journey Management',
    sub: 'Sales · Construction · Contracts',
    blurb: 'Every enquiry, contract and home in delivery — the 15-step customer journey from first consult to handover, with the full sales and construction pipeline.',
  },
  {
    id: 'ptm', src: '/haavn-path-to-market.html', num: '02', color: '#13B5EA',
    title: 'Shareholder · Path to Market',
    sub: 'Process · Deliverables · Gates',
    blurb: 'The six-month path to market: what each partner ships, the seven gates to a trading business, and the launch timeline to the full HAAVN range.',
  },
] as const

export default function HaavnHomesCrm({ onClose, onLogout }: { onClose: () => void; onLogout: () => void }) {
  const [pillar, setPillar] = useState<string | null>(null)
  const pal = atriumPalette('dark')

  useEffect(() => {
    const back = () => { if (pillar) setPillar(null); else onClose() }
    function onMsg(e: MessageEvent) { if (e.data === 'haavn-crm-close') back() }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') back() }
    window.addEventListener('message', onMsg)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('message', onMsg); window.removeEventListener('keydown', onKey) }
  }, [pillar, onClose])

  const active = PILLARS.find(p => p.id === pillar)

  // Chosen pillar — mount its tool full-bleed. The tool's own "← Back" returns here.
  if (active) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: '#0b0b0c', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)' }}>
        <iframe title={active.title} src={active.src}
          style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }} />
      </div>
    )
  }

  // The pillar hub — mirrors the ATRIUM Management Hub.
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, overflowY: 'auto', background: pal.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Same architectural plate + scrim as the Management Hub / Capital Base. */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: "url('/renders/atrium-surface-1.jpg') center 30% / cover no-repeat" }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,9,13,.5), rgba(7,9,13,.82))' }} />
      </div>

      {/* Header — ATRIUM brand + apex, matching the Management Hub. */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16, padding: '20px 32px', borderBottom: `1px solid ${pal.headerBorder}`, flexShrink: 0, background: pal.headerBg }}>
        <button onClick={onClose} style={atriumNavPill}>← HAAVN Homes</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: HM_PA.silver, fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', margin: 0 }}>ATRIUM</p>
            <p style={{ color: pal.ink, fontSize: 13, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 600, margin: '2px 0 0' }}>Homes Management</p>
          </div>
          <AtriumApex size={40} />
        </div>
      </div>

      {/* Body */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, padding: '48px 32px', maxWidth: 1180, width: '100%', margin: '0 auto' }}>
        <p style={{ color: HM_PA.silver, fontSize: 11, letterSpacing: '0.34em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 0, textAlign: 'center' }}>Integrated Management Platform</p>
        <h1 style={{ color: pal.ink, fontFamily: 'var(--font-serif, "Cormorant Garamond", serif)', fontWeight: 600, fontSize: 'clamp(34px, 6vw, 64px)', letterSpacing: '0.06em', lineHeight: 1, textAlign: 'center', margin: '14px 0 0', textTransform: 'uppercase' }}>
          Homes Management
        </h1>
        <p style={{ color: pal.sub, fontSize: 14, textAlign: 'center', margin: '16px 0 0' }}>
          Two pillars for HAAVN Homes — the customer's journey, and the shareholder path to market.
        </p>
        <p style={{ color: pal.faint, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', textAlign: 'center', margin: '8px 0 0' }}>
          Customer journey · Deliverables · Gates · Launch
        </p>

        <div style={{ width: 230, height: 1, background: `linear-gradient(90deg, transparent, ${HM_PA.silverLine}, transparent)`, margin: '22px auto 30px' }} />

        {/* Pillars — glowing top-rule + corner apex, stretched vertically. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, alignItems: 'stretch' }}>
          {PILLARS.map(p => (
            <button key={p.id} onClick={() => setPillar(p.id)} className="cap-pillar"
              style={{
                textAlign: 'left', cursor: 'pointer', minHeight: 630,
                position: 'relative', overflow: 'hidden',
                border: `1px solid ${pal.cardBorder}`, borderRadius: 16,
                background: pal.cardBg,
                backdropFilter: 'blur(18px) saturate(1.1)', WebkitBackdropFilter: 'blur(18px) saturate(1.1)',
                padding: '30px 28px 26px', display: 'flex', flexDirection: 'column', gap: 0,
                transition: 'all 0.3s', boxShadow: pal.cardShadow,
              }}
              onMouseEnter={e => { const t = e.currentTarget; t.style.borderColor = `${p.color}66`; t.style.transform = 'translateY(-4px)'; t.style.boxShadow = pal.cardHoverShadow(p.color) }}
              onMouseLeave={e => { const t = e.currentTarget; t.style.borderColor = pal.cardBorder; t.style.transform = 'translateY(0)'; t.style.boxShadow = pal.cardShadow }}>
              {/* Glowing accent light across the top of the card */}
              <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${p.color}, transparent)`, opacity: 0.85, boxShadow: `0 0 16px ${p.color}, 0 0 5px ${p.color}` }} />
              {/* Soft bloom below the top light */}
              <span aria-hidden style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', width: '70%', height: 70, background: `radial-gradient(ellipse at center, ${p.color}44, transparent 70%)`, pointerEvents: 'none' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 34, fontWeight: 300, color: p.color, lineHeight: 1 }}>{p.num}</span>
                <span aria-hidden style={{ fontSize: 15, color: p.color, opacity: 0.75, lineHeight: 1 }}>▲</span>
              </div>
              <div>
                <p style={{ color: p.color, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 600, margin: '14px 0 6px' }}>{p.sub}</p>
                <h2 style={{ color: pal.ink, fontFamily: 'var(--font-serif, "Cormorant Garamond", serif)', fontWeight: 500, fontSize: 30, letterSpacing: '0.01em', lineHeight: 1.05, margin: 0 }}>{p.title}</h2>
              </div>
              <div style={{ height: 1, background: pal.cardBorder, margin: '4px 0' }} />
              <p style={{ color: pal.muted, fontSize: 13, lineHeight: 1.6, margin: 0, flex: 1 }}>{p.blurb}</p>

              <span style={{ marginTop: 22, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: HM_PA.silver }}>Enter Pillar →</span>
            </button>
          ))}
        </div>
      </div>

      {/* Same footer as the Management Hub — links + UPDATE, P7 mark, Log Out. */}
      <SiteLinks />
      <Project7Mark />
      <button onClick={onLogout} style={{ ...atriumNavPill, position: 'fixed', bottom: 18, left: 20, zIndex: 30, fontSize: 11 }}>Log Out</button>
    </div>
  )
}
