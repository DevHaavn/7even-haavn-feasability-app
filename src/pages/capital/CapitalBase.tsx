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

export const PILLARS: Pillar[] = [
  {
    id: 'budgets', num: '01', title: 'Budgets / Administration',
    sub: 'Accounts · Budgets · Invoices · Approvals',
    blurb: 'Project budgets, cost tracking against feasibility, invoice register, approvals and the accounts backbone.',
    color: '#13B5EA', // Xero brand blue
  },
  {
    id: 'deployment', num: '02', title: 'Capital Deployment',
    sub: 'Capital Command Centre · Raise · Deploy',
    blurb: 'The capital command centre. Requirement, committed and deployed across every stage of every project — with partners and upcoming calls.',
    color: '#1FE87A',
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
        <p style={{ color: '#C4973A', fontSize: 9, letterSpacing: '0.34em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>Precision Capital Deployed</p>
        <h1 style={{ color: pal.ink, fontFamily: 'var(--font-heading)', fontWeight: 300, fontSize: 'clamp(24px, 4vw, 38px)', letterSpacing: '0.10em', textTransform: 'uppercase', textAlign: 'center', margin: '0 0 6px' }}>
          Administration Base
        </h1>
        <p style={{ color: pal.sub, fontSize: 12, textAlign: 'center', margin: '0 0 8px' }}>
          Three pillars for the accounts, capital and partner teams — linked to the feasibility studio.
        </p>
        <p style={{ color: pal.faint, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 44 }}>
          {projects.length} live project{projects.length !== 1 ? 's' : ''} · {fmtM(totalTDC)} land committed
        </p>

        {/* Black-chrome divider */}
        <div style={{ height: 2, borderRadius: 2, background: pal.divider, boxShadow: '0 1px 4px rgba(0,0,0,0.5), 0 0 10px rgba(255,255,255,0.05)', maxWidth: 320, margin: '0 auto 44px' }} />

        {/* Pillars — portrait columns falling down the screen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22, alignItems: 'stretch' }}>
          {PILLARS.map(p => (
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="chrome-black-text" style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700 }}>{p.num}</span>
                <AtriumApex size={22} />
              </div>
              <div>
                {p.id === 'crm' && (
                  <span style={{ color: '#237A52', fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 18, letterSpacing: '0.10em', display: 'block', margin: '0 0 12px' }}>ATRIUM</span>
                )}
                <h2 style={{ color: pal.ink, fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 20, letterSpacing: '0.04em', margin: '0 0 8px' }}>{p.title}</h2>
                <p style={{ color: p.id === 'crm' ? pal.sub : p.color, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0 }}>{p.sub}</p>
              </div>
              <div style={{ height: 1, background: `linear-gradient(to right, ${p.color}55, transparent)` }} />
              <p style={{ color: pal.muted, fontSize: 12.5, lineHeight: 1.7, margin: 0 }}>{p.blurb}</p>

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
                  <CapitalCommandMark width={165} />
                </div>
              )}
              {p.id === 'crm' && (
                // ATRIUM — the CRM platform for the Partner CRM pillar
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ color: pal.faint, fontSize: 8, letterSpacing: '0.26em', textTransform: 'uppercase' }}>Powered by</span>
                  <span style={{ color: pal.ink, fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 16, letterSpacing: '0.08em' }}>ATRIUM</span>
                </div>
              )}

              <span className="chrome-black-text" style={{ marginTop: 'auto', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700 }}>Enter Pillar →</span>
            </button>
          ))}
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
