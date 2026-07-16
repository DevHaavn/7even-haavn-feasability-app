import React, { useState } from 'react'
import { Project7Mark } from '../../components/ui'
import { Button } from '../../components/ui/Button'
import SiteLinks from '../../components/SiteLinks'
import HaavnManagementPillar from './HaavnManagementPillar'
import { AtriumApex } from '../../components/AtriumMark'
import ThemeToggle from '../../components/ThemeToggle'
import { useAtriumTheme, atriumPalette } from '../../lib/atriumTheme'

export type HMPillarId = 'crm' | 'meetings' | 'social'

export interface HMPillar {
  id: HMPillarId
  num: string
  title: string
  sub: string
  blurb: string
  color: string
}

export const HM_PILLARS: HMPillar[] = [
  {
    id: 'crm', num: '01', title: 'HAAVN Management',
    sub: 'Projects · Files · Workflow · Contacts',
    blurb: 'The HAAVN Management company tool — project delivery from job start to completion, SharePoint file management, end-to-end workflow, and the partner & contact relationships behind every job.',
    color: '#237A52', // Forest green (ATRIUM)
  },
  {
    id: 'meetings', num: '02', title: 'Meetings & Digital Workflow',
    sub: 'Calendar · Notes · Approvals · Tasks',
    blurb: 'Centralized meeting management, collaborative notes, approval workflows and task automation for the leadership team.',
    color: '#1FE87A', // Green
  },
  {
    id: 'social', num: '03', title: 'Social Media & Business News',
    sub: 'Analytics · Publishing · Market Intelligence',
    blurb: 'Social media publishing hub, news aggregation, brand analytics and market intelligence for strategic decision-making.',
    color: '#13B5EA', // Blue
  },
]

export default function HaavnManagementBase({ onClose, onLogout }: { onClose: () => void; onLogout: () => void }) {
  const [pillar, setPillar] = useState<HMPillarId | null>(null)
  const theme = useAtriumTheme()
  const pal = atriumPalette(theme)

  if (pillar) {
    const p = HM_PILLARS.find(x => x.id === pillar)!
    return <HaavnManagementPillar pillar={p} onBack={() => setPillar(null)} onLogout={onLogout} onExit={onClose} />
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, overflowY: 'auto',
      background: pal.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 32px', borderBottom: `1px solid ${pal.headerBorder}`, flexShrink: 0, background: pal.headerBg }}>
        <Button variant="glassDark" onClick={onClose} style={{ fontSize: 11 }}>
          Deploy Studio
        </Button>
        <ThemeToggle style={{ marginLeft: 12 }} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#1FE87A', fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', margin: 0 }}>HAAVN Management</p>
            <p style={{ color: pal.ink, fontSize: 13, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 600, margin: '2px 0 0' }}>Command Centre</p>
          </div>
          <AtriumApex size={40} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '48px 32px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <p style={{ color: '#1FE87A', fontSize: 9, letterSpacing: '0.34em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>Integrated Management Platform</p>
        <h1 style={{ color: pal.ink, fontFamily: 'var(--font-heading)', fontWeight: 300, fontSize: 'clamp(24px, 4vw, 38px)', letterSpacing: '0.10em', textTransform: 'uppercase', textAlign: 'center', margin: '0 0 6px' }}>
          Management Hub
        </h1>
        <p style={{ color: pal.sub, fontSize: 12, textAlign: 'center', margin: '0 0 8px' }}>
          Three pillars for project delivery, team collaboration and brand strategy — unified command centre.
        </p>
        <p style={{ color: pal.faint, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 44 }}>
          Strategic partnerships · Operational efficiency · Market intelligence
        </p>

        {/* Black-chrome divider */}
        <div style={{ height: 2, borderRadius: 2, background: pal.divider, boxShadow: '0 1px 4px rgba(0,0,0,0.5), 0 0 10px rgba(255,255,255,0.05)', maxWidth: 320, margin: '0 auto 44px' }} />

        {/* Pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22, alignItems: 'stretch' }}>
          {HM_PILLARS.map(p => (
            <button key={p.id} onClick={() => setPillar(p.id)}
              className="cap-pillar"
              style={{
                textAlign: 'left', cursor: 'pointer', minHeight: '52vh',
                border: `1px solid ${pal.cardBorder}`, borderRadius: 18,
                background: pal.cardBg,
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 16,
                transition: 'all 0.2s', boxShadow: pal.cardShadow,
              }}
              onMouseEnter={e => { const t = e.currentTarget; t.style.borderColor = `${p.color}66`; t.style.transform = 'translateY(-4px)'; t.style.boxShadow = pal.cardHoverShadow(p.color) }}
              onMouseLeave={e => { const t = e.currentTarget; t.style.borderColor = pal.cardBorder; t.style.transform = 'translateY(0)'; t.style.boxShadow = pal.cardShadow }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="chrome-black-text" style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700 }}>{p.num}</span>
              </div>
              <div>
                <AtriumApex size={34} style={{ margin: '0 0 12px' }} />
                <h2 style={{ color: pal.ink, fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 20, letterSpacing: '0.04em', margin: '0 0 8px' }}>{p.title}</h2>
                <p style={{ color: p.color, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0 }}>{p.sub}</p>
              </div>
              <div style={{ height: 1, background: `linear-gradient(to right, ${p.color}55, transparent)` }} />
              <p style={{ color: pal.muted, fontSize: 12.5, lineHeight: 1.7, margin: 0 }}>{p.blurb}</p>

              <span className="chrome-black-text" style={{ marginTop: 'auto', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700 }}>Enter Pillar →</span>
            </button>
          ))}
        </div>
      </div>

      <SiteLinks />
      <Project7Mark />

      {/* Log out — bottom left */}
      <Button variant="glassDark" onClick={onLogout}
        style={{ position: 'fixed', bottom: 18, left: 20, zIndex: 30, fontSize: 11 }}>
        Log Out
      </Button>
    </div>
  )
}
