import React, { useState } from 'react'
import { Project7Mark } from '../../components/ui'
import SiteLinks from '../../components/SiteLinks'
import { useStore } from '../../store'
import * as db from '../../db'
import CapitalPillar from './CapitalPillar'
import CapitalCommandMark from './CapitalCommandMark'
import { AtriumApex } from '../../components/AtriumMark'
import ThemeToggle from '../../components/ThemeToggle'
import { useAtriumTheme, atriumPalette } from '../../lib/atriumTheme'

export type PillarId = 'budgets' | 'deployment' | 'crm'

export interface Pillar {
  id: PillarId
  num: string
  title: string
  sub: string
  blurb: string
  color: string
}

/** ATRIUM accents for this gateway. Silver is the system accent; the per-pillar
 *  colours carry each pillar's own identity (Xero blue · silver · ATRIUM green),
 *  exactly as the redesign draws them. No gold anywhere. */
export const PA = {
  silver: '#9aa8b6',
  silverHi: '#cdd8e2',
  silverDeep: '#6c7a88',
  silverLine: 'rgba(154,168,182,0.4)',
}

export const PILLARS: Pillar[] = [
  {
    id: 'budgets', num: '01', title: 'Budgets / Administration',
    sub: 'Accounts · Budgets · Invoices · Approvals',
    blurb: 'Project budgets, cost tracking against feasibility, invoice register, approvals and the accounts backbone.',
    color: '#13B5EA', // Xero brand blue
  },
  {
    id: 'deployment', num: '02', title: 'Capital Command',
    sub: 'Raise · Investors · Calls · Returns',
    blurb: 'The capital command centre. Every dollar across the portfolio — pulled live from the feasibility studio — plus the full investor lifecycle: intake, pipeline, capital calls and distributions.',
    // Silver, not the old bright green — the redesign gives pillar 02 the
    // system accent, leaving green to ATRIUM (03) and Xero blue to 01.
    color: '#cdd8e2',
  },
  {
    id: 'crm', num: '03', title: 'Management System',
    sub: 'Projects · Files · Workflow · Contacts',
    blurb: 'The full ATRIUM Management System — project delivery from job start to completion, SharePoint file management, end-to-end workflow, and the partner & contact relationships behind every job. Mirrors the HAAVN Management command centre.',
    color: '#237A52',
  },
]

export default function CapitalBase({ onClose, onLogout, initialPillar, crmOnly }: { onClose: () => void; onLogout: () => void; initialPillar?: PillarId; crmOnly?: boolean }) {
  const { projects } = useStore()
  const [pillar, setPillar] = useState<PillarId | null>(initialPillar ?? null)
  const theme = useAtriumTheme()
  const pal = atriumPalette(theme)

  if (pillar) {
    const p = PILLARS.find(x => x.id === pillar)!
    // Consultants are locked to the CRM — Back exits to the app, not the hub (which holds financial pillars)
    return <CapitalPillar pillar={p} onBack={crmOnly ? onClose : () => setPillar(null)} onLogout={onLogout} onExit={onClose} />
  }

  // A small live figure from the projects to show the Capital ↔ Projects link
  const totalTDC = projects.reduce((sum, proj) => {
    try { return sum + db.getEffectiveLandCost(proj.id) } catch { return sum }
  }, 0)
  const fmtM = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${Math.round(n)}`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, overflowY: 'auto',
      background: pal.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header — same treatment as the site footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 32px', borderBottom: `1px solid ${pal.headerBorder}`, flexShrink: 0, background: pal.headerBg }}>
        <button onClick={onClose} className="glass-btn"
          style={{ color: theme === 'light' ? '#33424F' : 'rgba(255,255,255,0.85)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', padding: '8px 16px' }}>
          ATRIUM
        </button>
        <ThemeToggle style={{ marginLeft: 12 }} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#C4973A', fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', margin: 0 }}>7EVEN Capital</p>
            <p style={{ color: pal.ink, fontSize: 13, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 600, margin: '2px 0 0' }}>Capital Base</p>
          </div>
          <img src="/winged-device-white.png" alt="7EVEN Capital" draggable={false} style={{ width: 44, height: 'auto', filter: pal.logoFilter }} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '48px 32px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        {/* Kicker is SILVER, not the old gold — the ATRIUM system has no gold. */}
        <p style={{ color: PA.silver, fontSize: 11, letterSpacing: '0.34em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 0, textAlign: 'center' }}>Precision Capital Deployed</p>
        <h1 style={{ color: pal.ink, fontFamily: 'var(--font-serif, "Cormorant Garamond", serif)', fontWeight: 600, fontSize: 'clamp(34px, 6vw, 64px)', letterSpacing: '0.06em', lineHeight: 1, textAlign: 'center', margin: '14px 0 0' }}>
          Administration Base
        </h1>
        <p style={{ color: pal.sub, fontSize: 14, textAlign: 'center', margin: '16px 0 0' }}>
          Three pillars for the accounts, capital and partner teams — linked to the feasibility studio.
        </p>
        <p style={{ color: pal.faint, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', textAlign: 'center', margin: '8px 0 0' }}>
          {projects.length} live project{projects.length !== 1 ? 's' : ''} · {fmtM(totalTDC)} land committed
        </p>

        {/* Hairline — replaces the heavy 2px black-chrome bar */}
        <div style={{ width: 230, height: 1, background: `linear-gradient(90deg, transparent, ${PA.silverLine}, transparent)`, margin: '22px auto 30px' }} />

        {/* Pillars — portrait columns falling down the screen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, alignItems: 'stretch' }}>
          {PILLARS.map(pillarDef => {
            // The redesign is drawn on a dark base, where silver-hi reads well.
            // On the light theme it washes out to near-invisible, so pillar 02's
            // accent drops to the deeper silver. Xero blue and ATRIUM green
            // carry enough contrast in both and are left alone.
            const accent = pillarDef.id === 'deployment' && theme === 'light' ? '#6e7c8e' : pillarDef.color
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
              {/* Accent hairline across the top of the card, in the pillar's colour */}
              <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${p.color}, transparent)`, opacity: 0.65 }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 34, fontWeight: 300, color: p.color, lineHeight: 1 }}>{p.num}</span>
                <AtriumApex size={20} style={{ opacity: 0.5 }} />
              </div>
              <div>
                {/* Eyebrow above the title, in the accent — per the redesign */}
                <p style={{ color: p.color, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 600, margin: '14px 0 6px' }}>{p.sub}</p>
                <h2 style={{ color: pal.ink, fontFamily: 'var(--font-serif, "Cormorant Garamond", serif)', fontWeight: 500, fontSize: 30, letterSpacing: '0.01em', lineHeight: 1.05, margin: 0 }}>{p.title}</h2>
              </div>
              <div style={{ height: 1, background: pal.cardBorder, margin: '4px 0' }} />
              <p style={{ color: pal.muted, fontSize: 13, lineHeight: 1.6, margin: 0, flex: 1 }}>{p.blurb}</p>

              {p.id === 'budgets' && (
                // Xero — the accounts backbone of the Budgets pillar
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ color: pal.faint, fontSize: 8, letterSpacing: '0.26em', textTransform: 'uppercase' }}>Powered by</span>
                  <img src="/xero-logo.png" alt="Xero" draggable={false}
                    style={{ width: 86, height: 'auto', opacity: 0.92, filter: 'drop-shadow(0 0 12px rgba(19,181,234,0.25))' }} />
                </div>
              )}
              {p.id === 'deployment' && (
                // Capital Command — the engine of the Capital Deployment pillar
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ color: pal.faint, fontSize: 8, letterSpacing: '0.26em', textTransform: 'uppercase' }}>Powered by</span>
                  {/* Desaturated to the pillar's silver — the mark's built-in
                      green fought the accent and broke the no-gold/one-accent rule. */}
                  <span style={{ filter: 'grayscale(1) brightness(1.25)', display: 'inline-flex' }}>
                    <CapitalCommandMark width={165} />
                  </span>
                </div>
              )}
              {p.id === 'crm' && (
                // ATRIUM — the CRM platform for the Partner CRM pillar
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ color: pal.faint, fontSize: 8, letterSpacing: '0.26em', textTransform: 'uppercase' }}>Powered by</span>
                  <span style={{ color: pal.ink, fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 16, letterSpacing: '0.08em' }}>ATRIUM</span>
                </div>
              )}

              <span style={{ marginTop: 22, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: PA.silver }}>Enter Pillar →</span>
            </button>
            )
          })}
        </div>
      </div>

      <SiteLinks />
      <Project7Mark />

      {/* Log out of Capital — bottom left, matches the studio's button but glows soft grey */}
      <button onClick={onLogout} className="glass-btn glass-btn-grey"
        style={{ position: 'fixed', bottom: 18, left: 20, zIndex: 30, color: 'rgba(255,255,255,0.85)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 16px' }}>
        Log Out
      </button>
    </div>
  )
}
