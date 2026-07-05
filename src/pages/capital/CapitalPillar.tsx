import React from 'react'
import { DesignCredit } from '../../components/ui'
import type { Pillar } from './CapitalBase'
import BudgetsAdmin from './BudgetsAdmin'

/** Pillar workspace scaffold — each Capital pillar (Budgets, Deployment, CRM)
 *  opens here. This is the shell we'll build each module into. */
export default function CapitalPillar({ pillar, onBack, onLogout }: { pillar: Pillar; onBack: () => void; onLogout: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, overflowY: 'auto',
      background: 'radial-gradient(ellipse 90% 60% at 50% 25%, rgba(196,151,58,0.08) 0%, rgba(8,7,4,0.9) 55%, rgba(3,3,3,0.96) 100%), url(/home-bg.jpg) center / cover no-repeat fixed, #030303',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <button onClick={onBack} className="glass-btn"
          style={{ color: 'rgba(255,255,255,0.85)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 14px' }}>
          ← Capital Base
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 6 }}>
          <span style={{ color: pillar.color, fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}>{pillar.num}</span>
          <span style={{ color: '#fff', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>{pillar.title}</span>
        </div>
      </div>

      {/* Body — live module, or scaffold for pillars not yet built */}
      {pillar.id === 'budgets' ? <BudgetsAdmin /> : (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
        <span style={{ color: pillar.color, fontFamily: 'monospace', fontSize: 44, fontWeight: 700, opacity: 0.9, textShadow: `0 0 30px ${pillar.color}55` }}>{pillar.num}</span>
        <h1 style={{ color: '#F0EFED', fontFamily: 'var(--font-heading)', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 40px)', letterSpacing: '0.05em', margin: '18px 0 10px' }}>
          {pillar.title}
        </h1>
        <p style={{ color: pillar.color, fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', margin: '0 0 20px' }}>{pillar.sub}</p>
        <p style={{ color: '#999', fontSize: 14, lineHeight: 1.7, maxWidth: 460, margin: '0 0 32px' }}>{pillar.blurb}</p>

        <div style={{ display: 'inline-block', padding: '12px 30px', borderRadius: 12, border: `1px solid ${pillar.color}44`, background: `${pillar.color}0D`, color: pillar.color, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 700 }}>
          Module under construction
        </div>
        <p style={{ color: '#555', fontSize: 11, letterSpacing: '0.1em', marginTop: 22, maxWidth: 420 }}>
          This pillar is the foundation of the Capital back-of-house. We'll build its screens, data and links to the feasibility projects here, step by step.
        </p>
      </div>
      )}

      <DesignCredit style={{ padding: '20px 0 24px', color: 'rgba(255,255,255,0.22)' }} />

      {/* Quick secure exit — matches the hub's grey-glow logout */}
      <button onClick={onLogout} className="glass-btn glass-btn-grey"
        style={{ position: 'fixed', bottom: 18, left: 20, zIndex: 30, color: 'rgba(255,255,255,0.85)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 16px' }}>
        Log Out
      </button>
    </div>
  )
}
