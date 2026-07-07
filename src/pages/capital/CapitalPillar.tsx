import React from 'react'
import { Project7Mark } from '../../components/ui'
import SiteLinks from '../../components/SiteLinks'
import type { Pillar } from './CapitalBase'
import BudgetsAdmin from './BudgetsAdmin'
import WarRoom from './WarRoom'
import WarMark from './WarMark'
import CapitalDeployment from './CapitalDeployment'

/** Pillar workspace scaffold — each Capital pillar (Budgets, Deployment, CRM)
 *  opens here. The War Room exits straight to the studio (never back through
 *  Capital admin) so staff stay sealed off from the other pillars. */
export default function CapitalPillar({ pillar, onBack, onLogout, onExit }: { pillar: Pillar; onBack: () => void; onLogout: () => void; onExit: () => void }) {
  const isBudgets = pillar.id === 'budgets'
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, overflowY: 'auto',
      background: isBudgets
        ? 'linear-gradient(rgba(0,0,0,0.04), rgba(0,0,0,0.18)), url(/premium-bg.jpg) center / cover fixed, #101010'
        : 'radial-gradient(ellipse 90% 60% at 50% 25%, rgba(196,151,58,0.08) 0%, rgba(8,7,4,0.9) 55%, rgba(3,3,3,0.96) 100%), url(/home-bg.jpg) center / cover no-repeat fixed, #030303',
      display: 'flex', flexDirection: 'column',
    }}>
      {isBudgets ? (
        /* Floating rounded light header — matches the project pages */
        <div className="ws-header-float" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', flexShrink: 0, background: 'linear-gradient(rgba(238,236,232,0.80), rgba(224,221,216,0.86)), url(/header-bg.jpg) center / cover no-repeat, #ECEAE6' }}>
          <button onClick={onBack}
            style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8, color: '#1A1A1A', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, padding: '8px 14px', cursor: 'pointer' }}>
            ← Capital Base
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 6 }}>
            <span style={{ color: '#13B5EA', fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}>{pillar.num}</span>
            <span style={{ color: '#1A1A1A', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>{pillar.title}</span>
          </div>
        </div>
      ) : (
        /* Header — same treatment as the main-page footer */
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 32px', borderBottom: '1px solid #1A1A1A', flexShrink: 0, background: 'linear-gradient(rgba(8,8,8,0.80), rgba(8,8,8,0.86)), url(/home-bg.jpg) center / cover no-repeat, #0A0A0A' }}>
          {pillar.id === 'crm' ? (
            <button onClick={onExit} className="glass-btn"
              style={{ color: 'rgba(255,255,255,0.85)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 14px' }}>
              Deploy Studio
            </button>
          ) : (
            <button onClick={onBack} className="glass-btn"
              style={{ color: 'rgba(255,255,255,0.85)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 14px' }}>
              ← Capital Base
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 6 }}>
            <span style={{ color: pillar.color, fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}>{pillar.num}</span>
            {pillar.id === 'crm'
              ? <WarMark width={110} />
              : <span style={{ color: '#fff', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>{pillar.title}</span>}
          </div>
          {pillar.id === 'crm' && (
            <img src="/hm-device-white.png" alt="HAAVN Management" draggable={false} style={{ height: 20, width: 'auto', display: 'block', marginLeft: 'auto', opacity: 0.9 }} />
          )}
        </div>
      )}

      {/* Body — live module, or scaffold for pillars not yet built.
          Budgets floats as a soft-grey sheet over the stealth-black texture,
          like the project pages. */}
      {pillar.id === 'budgets' ? <div className="premium-stage" style={{ flex: 1, overflowY: 'auto' }}><BudgetsAdmin /></div> : pillar.id === 'crm' ? <WarRoom /> : pillar.id === 'deployment' ? <CapitalDeployment /> : (
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

      <SiteLinks />
      <Project7Mark />

      {/* Quick secure exit — matches the hub's grey-glow logout */}
      <button onClick={onLogout} className="glass-btn glass-btn-grey"
        style={{ position: 'fixed', bottom: 18, left: 20, zIndex: 30, color: 'rgba(255,255,255,0.85)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 16px' }}>
        Log Out
      </button>
    </div>
  )
}
