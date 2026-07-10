import React, { useState } from 'react'
import { Project7Mark } from '../../components/ui'
import { Button } from '../../components/ui/Button'
import SiteLinks from '../../components/SiteLinks'
import HaavnManagementPillar from './HaavnManagementPillar'

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
    id: 'crm', num: '01', title: 'Partner CRM',
    sub: 'Targets · Range · Signals · Contacts',
    blurb: 'Strategic partner relationships, deal pipeline, contact management and partnership signals across 7EVEN and HAAVN brands.',
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

  if (pillar) {
    const p = HM_PILLARS.find(x => x.id === pillar)!
    return <HaavnManagementPillar pillar={p} onBack={() => setPillar(null)} onLogout={onLogout} onExit={onClose} />
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, overflowY: 'auto',
      background: 'linear-gradient(rgba(3,3,3,0.30), rgba(3,3,3,0.55) 70%, rgba(3,3,3,0.78)), url(/capital-bg.png) center / cover no-repeat fixed, #030303',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 32px', borderBottom: '1px solid #1A1A1A', flexShrink: 0, background: 'linear-gradient(rgba(8,8,8,0.80), rgba(8,8,8,0.86)), url(/home-bg.jpg) center / cover no-repeat, #0A0A0A' }}>
        <Button variant="glassDark" onClick={onClose} style={{ fontSize: 11 }}>
          Deploy Studio
        </Button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#1FE87A', fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', margin: 0 }}>HAAVN Management</p>
            <p style={{ color: '#fff', fontSize: 13, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 600, margin: '2px 0 0' }}>Command Centre</p>
          </div>
          <img src="/hm-device-white.png" alt="HAAVN Management" draggable={false} style={{ width: 44, height: 'auto' }} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '48px 32px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <p style={{ color: '#1FE87A', fontSize: 9, letterSpacing: '0.34em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>Integrated Management Platform</p>
        <h1 style={{ color: '#F0EFED', fontFamily: 'var(--font-heading)', fontWeight: 300, fontSize: 'clamp(24px, 4vw, 38px)', letterSpacing: '0.10em', textTransform: 'uppercase', textAlign: 'center', margin: '0 0 6px' }}>
          Management Hub
        </h1>
        <p style={{ color: '#A7A7A7', fontSize: 12, textAlign: 'center', margin: '0 0 8px' }}>
          Three pillars for partner relations, team collaboration and brand strategy — unified command centre.
        </p>
        <p style={{ color: '#777', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 44 }}>
          Strategic partnerships · Operational efficiency · Market intelligence
        </p>

        {/* Black-chrome divider */}
        <div style={{ height: 2, borderRadius: 2, background: 'linear-gradient(to right, transparent, #3A3A3A 16%, #D9D9D9 50%, #3A3A3A 84%, transparent)', boxShadow: '0 1px 4px rgba(0,0,0,0.8), 0 0 10px rgba(255,255,255,0.05)', maxWidth: 320, margin: '0 auto 44px' }} />

        {/* Pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22, alignItems: 'stretch' }}>
          {HM_PILLARS.map(p => (
            <button key={p.id} onClick={() => setPillar(p.id)}
              className="cap-pillar"
              style={{
                textAlign: 'left', cursor: 'pointer', minHeight: '52vh',
                border: '1px solid rgba(255,255,255,0.10)', borderRadius: 18,
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02) 40%, rgba(0,0,0,0.25))',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 16,
                transition: 'all 0.2s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 44px rgba(0,0,0,0.40)',
              }}
              onMouseEnter={e => { const t = e.currentTarget; t.style.borderColor = `${p.color}66`; t.style.transform = 'translateY(-4px)'; t.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.16), 0 22px 52px rgba(0,0,0,0.5), 0 0 30px ${p.color}22` }}
              onMouseLeave={e => { const t = e.currentTarget; t.style.borderColor = 'rgba(255,255,255,0.10)'; t.style.transform = 'translateY(0)'; t.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 44px rgba(0,0,0,0.40)' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="chrome-black-text" style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700 }}>{p.num}</span>
              </div>
              <div>
                <img src="/hm-device-white.png" alt="HAAVN Management" draggable={false} style={{ height: 20, width: 'auto', display: 'block', margin: '0 0 12px', opacity: 0.95 }} />
                <h2 style={{ color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 20, letterSpacing: '0.04em', margin: '0 0 8px' }}>{p.title}</h2>
                <p style={{ color: p.color, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0 }}>{p.sub}</p>
              </div>
              <div style={{ height: 1, background: `linear-gradient(to right, ${p.color}55, transparent)` }} />
              <p style={{ color: '#999', fontSize: 12.5, lineHeight: 1.7, margin: 0 }}>{p.blurb}</p>

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
