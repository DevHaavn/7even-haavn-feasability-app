import React, { useState } from 'react'
import { DesignCredit } from '../../components/ui'
import { useStore } from '../../store'
import * as db from '../../db'
import CapitalPillar from './CapitalPillar'

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
    color: '#C4973A',
  },
  {
    id: 'deployment', num: '02', title: 'Capital Deployment',
    sub: 'Funding · Drawdowns · Equity & Debt',
    blurb: 'Capital allocation across projects, funding rounds, drawdown schedules, equity and debt tracking.',
    color: '#3DAA6A',
  },
  {
    id: 'crm', num: '03', title: 'Partner CRM Portal',
    sub: 'Investors · Partners · Relationships',
    blurb: 'Investor and partner relationships, contacts, commitments, communications and deal-flow.',
    color: '#7C6FE0',
  },
]

export default function CapitalBase({ onClose }: { onClose: () => void }) {
  const { projects } = useStore()
  const [pillar, setPillar] = useState<PillarId | null>(null)

  if (pillar) {
    const p = PILLARS.find(x => x.id === pillar)!
    return <CapitalPillar pillar={p} onBack={() => setPillar(null)} onClose={onClose} />
  }

  // A small live figure from the projects to show the Capital ↔ Projects link
  const totalTDC = projects.reduce((sum, proj) => {
    try { return sum + db.getEffectiveLandCost(proj.id) } catch { return sum }
  }, 0)
  const fmtM = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${Math.round(n)}`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, overflowY: 'auto',
      background: 'radial-gradient(ellipse 90% 60% at 50% 30%, rgba(196,151,58,0.10) 0%, rgba(8,7,4,0.86) 55%, rgba(3,3,3,0.94) 100%), url(/home-bg.jpg) center / cover no-repeat fixed, #030303',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <img src="/winged-device-white.png" alt="7EVEN Capital" draggable={false} style={{ width: 44, height: 'auto' }} />
        <div>
          <p style={{ color: '#C4973A', fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', margin: 0 }}>7EVEN Capital</p>
          <p style={{ color: '#fff', fontSize: 13, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 600, margin: '2px 0 0' }}>Capital Base</p>
        </div>
        <button onClick={onClose} className="glass-btn"
          style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.85)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', padding: '8px 16px' }}>
          ✕ Return to Studio
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '48px 32px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <p style={{ color: '#C4973A', fontSize: 9, letterSpacing: '0.34em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>Precision Capital Deployed</p>
        <h1 style={{ color: '#F0EFED', fontFamily: 'var(--font-heading)', fontWeight: 300, fontSize: 'clamp(24px, 4vw, 38px)', letterSpacing: '0.06em', textAlign: 'center', margin: '0 0 6px' }}>
          Administration &amp; Capital Command
        </h1>
        <p style={{ color: '#777', fontSize: 12, textAlign: 'center', margin: '0 0 8px' }}>
          Three pillars for the accounts, capital and partner teams — linked to the feasibility studio.
        </p>
        <p style={{ color: '#555', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 44 }}>
          {projects.length} live project{projects.length !== 1 ? 's' : ''} · {fmtM(totalTDC)} land committed
        </p>

        {/* Gold divider */}
        <div style={{ height: 1, background: 'linear-gradient(to right, transparent, #C4973A 30%, #C4973A 70%, transparent)', maxWidth: 320, margin: '0 auto 44px' }} />

        {/* Pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {PILLARS.map(p => (
            <button key={p.id} onClick={() => setPillar(p.id)}
              className="cap-pillar"
              style={{
                textAlign: 'left', cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16,
                background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                padding: '28px 26px', display: 'flex', flexDirection: 'column', gap: 14,
                transition: 'all 0.2s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
              onMouseEnter={e => { const t = e.currentTarget; t.style.borderColor = `${p.color}66`; t.style.background = 'rgba(255,255,255,0.06)'; t.style.transform = 'translateY(-3px)' }}
              onMouseLeave={e => { const t = e.currentTarget; t.style.borderColor = 'rgba(255,255,255,0.10)'; t.style.background = 'rgba(255,255,255,0.03)'; t.style.transform = 'translateY(0)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: p.color, fontFamily: 'monospace', fontSize: 22, fontWeight: 700 }}>{p.num}</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, boxShadow: `0 0 10px ${p.color}` }} />
              </div>
              <div>
                <h2 style={{ color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 18, letterSpacing: '0.04em', margin: '0 0 6px' }}>{p.title}</h2>
                <p style={{ color: p.color, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0 }}>{p.sub}</p>
              </div>
              <p style={{ color: '#888', fontSize: 12, lineHeight: 1.6, margin: 0 }}>{p.blurb}</p>
              <span style={{ marginTop: 'auto', color: p.color, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700 }}>Enter Pillar →</span>
            </button>
          ))}
        </div>
      </div>

      <DesignCredit style={{ padding: '20px 0 24px', color: 'rgba(255,255,255,0.22)' }} />
    </div>
  )
}
