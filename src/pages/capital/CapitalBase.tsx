import React, { useState } from 'react'
import { Project7Mark } from '../../components/ui'
import SiteLinks from '../../components/SiteLinks'
import { useStore } from '../../store'
import * as db from '../../db'
import CapitalPillar from './CapitalPillar'
import WarMark from './WarMark'
import CapitalCommandMark from './CapitalCommandMark'

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
    id: 'crm', num: '03', title: 'Partner CRM Portal',
    sub: 'Targets · Range · Signals · Contacts',
    blurb: 'The tactical CRM. Three commands — 7EVEN Developments, HAAVN Homes, HAAVN Management — every deal in your sights.',
    color: '#FF2F00',
  },
]

export default function CapitalBase({ onClose, onLogout, initialPillar, crmOnly }: { onClose: () => void; onLogout: () => void; initialPillar?: PillarId; crmOnly?: boolean }) {
  const { projects } = useStore()
  const [pillar, setPillar] = useState<PillarId | null>(initialPillar ?? null)

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
      background: 'linear-gradient(rgba(3,3,3,0.30), rgba(3,3,3,0.55) 70%, rgba(3,3,3,0.78)), url(/capital-bg.png) center / cover no-repeat fixed, #030303',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header — same treatment as the site footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 32px', borderBottom: '1px solid #1A1A1A', flexShrink: 0, background: 'linear-gradient(rgba(8,8,8,0.80), rgba(8,8,8,0.86)), url(/home-bg.jpg) center / cover no-repeat, #0A0A0A' }}>
        <button onClick={onClose} className="glass-btn"
          style={{ color: 'rgba(255,255,255,0.85)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', padding: '8px 16px' }}>
          Deploy Studio
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#C4973A', fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', margin: 0 }}>7EVEN Capital</p>
            <p style={{ color: '#fff', fontSize: 13, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 600, margin: '2px 0 0' }}>Capital Base</p>
          </div>
          <img src="/winged-device-white.png" alt="7EVEN Capital" draggable={false} style={{ width: 44, height: 'auto' }} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '48px 32px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <p style={{ color: '#C4973A', fontSize: 9, letterSpacing: '0.34em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>Precision Capital Deployed</p>
        <h1 style={{ color: '#F0EFED', fontFamily: 'var(--font-heading)', fontWeight: 300, fontSize: 'clamp(24px, 4vw, 38px)', letterSpacing: '0.10em', textTransform: 'uppercase', textAlign: 'center', margin: '0 0 6px' }}>
          Administration Base
        </h1>
        <p style={{ color: '#A7A7A7', fontSize: 12, textAlign: 'center', margin: '0 0 8px' }}>
          Three pillars for the accounts, capital and partner teams — linked to the feasibility studio.
        </p>
        <p style={{ color: '#777', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 44 }}>
          {projects.length} live project{projects.length !== 1 ? 's' : ''} · {fmtM(totalTDC)} land committed
        </p>

        {/* Black-chrome divider */}
        <div style={{ height: 2, borderRadius: 2, background: 'linear-gradient(to right, transparent, #3A3A3A 16%, #D9D9D9 50%, #3A3A3A 84%, transparent)', boxShadow: '0 1px 4px rgba(0,0,0,0.8), 0 0 10px rgba(255,255,255,0.05)', maxWidth: 320, margin: '0 auto 44px' }} />

        {/* Pillars — portrait columns falling down the screen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22, alignItems: 'stretch' }}>
          {PILLARS.map(p => (
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
                {p.id === 'crm' && (
                  <img src="/hm-device-white.png" alt="HAAVN Management CRM" draggable={false} style={{ height: 20, width: 'auto', display: 'block', margin: '0 0 12px', opacity: 0.95 }} />
                )}
                <h2 style={{ color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 20, letterSpacing: '0.04em', margin: '0 0 8px' }}>{p.title}</h2>
                <p style={{ color: p.id === 'crm' ? 'rgba(255,255,255,0.88)' : p.color, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0 }}>{p.sub}</p>
              </div>
              <div style={{ height: 1, background: `linear-gradient(to right, ${p.color}55, transparent)` }} />
              <p style={{ color: '#999', fontSize: 12.5, lineHeight: 1.7, margin: 0 }}>{p.blurb}</p>

              {p.id === 'budgets' && (
                // Xero — the accounts backbone of the Budgets pillar
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8, letterSpacing: '0.26em', textTransform: 'uppercase' }}>Powered by</span>
                  <img src="/xero-logo.png" alt="Xero" draggable={false}
                    style={{ width: 86, height: 'auto', opacity: 0.92, filter: 'drop-shadow(0 0 12px rgba(19,181,234,0.25))' }} />
                </div>
              )}
              {p.id === 'deployment' && (
                // Capital Command — the engine of the Capital Deployment pillar
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8, letterSpacing: '0.26em', textTransform: 'uppercase' }}>Powered by</span>
                  <CapitalCommandMark width={165} />
                </div>
              )}
              {p.id === 'crm' && (
                // War Room — the engine of the Partner CRM pillar
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8, letterSpacing: '0.26em', textTransform: 'uppercase' }}>Powered by</span>
                  <WarMark width={150} />
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
