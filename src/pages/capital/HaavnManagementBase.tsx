import React, { useState } from 'react'
import { Project7Mark } from '../../components/ui'
import { Button } from '../../components/ui/Button'
import SiteLinks from '../../components/SiteLinks'
import HaavnManagementPillar from './HaavnManagementPillar'
import { AtriumApex } from '../../components/AtriumMark'
import ThemeToggle from '../../components/ThemeToggle'
import { useAtriumTheme, atriumPalette, atriumNavPill } from '../../lib/atriumTheme'
import { useRole } from '../../lib/role'

export type HMPillarId = 'crm' | 'meetings' | 'social'

export interface HMPillar {
  id: HMPillarId
  num: string
  title: string
  sub: string
  blurb: string
  color: string
}

/** Shared ATRIUM accents — same values as the Capital Base gateway. */
export const HM_PA = {
  silver: '#9aa8b6',
  silverHi: '#cdd8e2',
  silverLine: 'rgba(154,168,182,0.4)',
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
  const role = useRole()
  // Pillar 01 (ATRIUM Management System / CRM) is director-only — consultants
  // (external) never see the card and can never enter it.
  const canManagement = role !== 'external'
  const visiblePillars = HM_PILLARS.filter(p => canManagement || p.id !== 'crm')

  if (pillar && (canManagement || pillar !== 'crm')) {
    const p = HM_PILLARS.find(x => x.id === pillar)!
    return <HaavnManagementPillar pillar={p} onBack={() => setPillar(null)} onLogout={onLogout} onExit={onClose} />
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, overflowY: 'auto',
      background: pal.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Same architectural plate and scrim as the Capital Base gateway, so the
          two hubs read as one product rather than two skins. */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: "url('/renders/atrium-surface-1.jpg') center 30% / cover no-repeat",
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: theme === 'light'
            ? 'linear-gradient(180deg, rgba(226,233,240,.72), rgba(215,224,233,.9))'
            : 'linear-gradient(180deg, rgba(7,9,13,.5), rgba(7,9,13,.82))',
        }} />
      </div>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16, padding: '20px 32px', borderBottom: `1px solid ${pal.headerBorder}`, flexShrink: 0, background: pal.headerBg }}>
        <button onClick={onClose} style={atriumNavPill}>ATRIUM</button>
        <ThemeToggle style={{ marginLeft: 12 }} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            {/* ATRIUM leads the header on every surface, same as Capital Base.
                Was "HAAVN Management" in the neon #1FE87A. */}
            <p style={{ color: HM_PA.silver, fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', margin: 0 }}>ATRIUM</p>
            <p style={{ color: pal.ink, fontSize: 13, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 600, margin: '2px 0 0' }}>Management Hub</p>
          </div>
          <AtriumApex size={40} />
        </div>
      </div>

      {/* Body */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, padding: '48px 32px', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
        {/* Kicker silver, not the bright green — matches the Capital Base hero. */}
        <p style={{ color: HM_PA.silver, fontSize: 11, letterSpacing: '0.34em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 0, textAlign: 'center' }}>Integrated Management Platform</p>
        <h1 style={{ color: pal.ink, fontFamily: 'var(--font-serif, "Cormorant Garamond", serif)', fontWeight: 600, fontSize: 'clamp(34px, 6vw, 64px)', letterSpacing: '0.06em', lineHeight: 1, textAlign: 'center', margin: '14px 0 0', textTransform: 'uppercase' }}>
          Management Hub
        </h1>
        <p style={{ color: pal.sub, fontSize: 14, textAlign: 'center', margin: '16px 0 0' }}>
          Three pillars for project delivery, team collaboration and brand strategy — unified command centre.
        </p>
        <p style={{ color: pal.faint, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', textAlign: 'center', margin: '8px 0 0' }}>
          Strategic partnerships · Operational efficiency · Market intelligence
        </p>

        {/* Hairline — replaces the heavy 2px chrome bar, same as Capital Base */}
        <div style={{ width: 230, height: 1, background: `linear-gradient(90deg, transparent, ${HM_PA.silverLine}, transparent)`, margin: '22px auto 30px' }} />

        {/* Pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, alignItems: 'stretch' }}>
          {visiblePillars.map(pillarDef => {
            // Both HM greens fail on the dark plate: #237A52 is a deep forest
            // green that sinks into it, and #1FE87A is a neon that glares.
            // Lifted / calmed in dark, left as the brand values in light.
            const accent =
              pillarDef.id === 'crm' ? (theme === 'light' ? '#237A52' : '#57c08a')
              : pillarDef.id === 'meetings' ? (theme === 'light' ? '#2f9e6b' : '#57c08a')
              : pillarDef.color
            const p = { ...pillarDef, color: accent }
            return (
            <button key={p.id} onClick={() => setPillar(p.id)}
              className="cap-pillar"
              style={{
                textAlign: 'left', cursor: 'pointer', minHeight: 440,
                position: 'relative', overflow: 'hidden',   // anchors the accent top-rule
                border: `1px solid ${pal.cardBorder}`, borderRadius: 16,
                background: pal.cardBg,
                backdropFilter: 'blur(18px) saturate(1.1)', WebkitBackdropFilter: 'blur(18px) saturate(1.1)',
                padding: '30px 28px 26px', display: 'flex', flexDirection: 'column', gap: 0,
                transition: 'all 0.3s', boxShadow: pal.cardShadow,
              }}
              onMouseEnter={e => { const t = e.currentTarget; t.style.borderColor = `${p.color}66`; t.style.transform = 'translateY(-4px)'; t.style.boxShadow = pal.cardHoverShadow(p.color) }}
              onMouseLeave={e => { const t = e.currentTarget; t.style.borderColor = pal.cardBorder; t.style.transform = 'translateY(0)'; t.style.boxShadow = pal.cardShadow }}>
              {/* Accent hairline across the top of the card */}
              <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${p.color}, transparent)`, opacity: 0.65 }} />

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
            )
          })}
        </div>
      </div>

      <SiteLinks />
      <Project7Mark />

      {/* Log out — bottom left */}
      <button onClick={onLogout} style={{ ...atriumNavPill, position: 'fixed', bottom: 18, left: 20, zIndex: 30, fontSize: 11  }}>Log Out</button>
    </div>
  )
}
