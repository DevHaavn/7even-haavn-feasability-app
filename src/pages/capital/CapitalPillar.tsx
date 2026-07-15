import React from 'react'
import { Project7Mark } from '../../components/ui'
import { Button } from '../../components/ui/Button'
import SiteLinks from '../../components/SiteLinks'
import type { Pillar } from './CapitalBase'
import BudgetsAdminBase from './BudgetsAdminBase'
import Atrium from './Atrium'
import CapitalDeployment from './CapitalDeployment'

/** Pillar workspace scaffold — each Capital pillar (Budgets, Deployment, CRM)
 *  opens here. ATRIUM (Partner CRM) exits straight to the studio (never back through
 *  Capital admin) so staff stay sealed off from the other pillars. */
export default function CapitalPillar({ pillar, onBack, onLogout, onExit }: { pillar: Pillar; onBack: () => void; onLogout: () => void; onExit: () => void }) {
  const isBudgets = pillar.id === 'budgets'
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, overflowY: 'auto',
      background: isBudgets
        ? 'linear-gradient(rgba(3,3,3,0.30), rgba(3,3,3,0.55) 70%, rgba(3,3,3,0.78)), url(/capital-bg.png) center / cover no-repeat fixed, #030303'
        : 'radial-gradient(ellipse 90% 60% at 50% 25%, rgba(35,122,82,0.08) 0%, rgba(8,7,4,0.9) 55%, rgba(3,3,3,0.96) 100%), url(/home-bg.jpg) center / cover no-repeat fixed, #030303',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header — dark, same treatment as the Capital Base hub */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 32px', borderBottom: '1px solid #1A1A1A', flexShrink: 0, background: 'linear-gradient(rgba(8,8,8,0.80), rgba(8,8,8,0.86)), url(/home-bg.jpg) center / cover no-repeat, #0A0A0A' }}>
        {pillar.id === 'crm' ? (
          <Button variant="glassDark" onClick={onExit} style={{ fontSize: 11 }}>
            Deploy Studio
          </Button>
        ) : (
          <Button variant="glassDark" onClick={onBack} style={{ fontSize: 11 }}>
            ← Capital Base
          </Button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 6 }}>
          <span style={{ color: pillar.color, fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}>{pillar.num}</span>
          {pillar.id === 'crm'
            ? <span style={{ color: '#fff', fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>ATRIUM</span>
            : <span style={{ color: '#fff', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>{pillar.title}</span>}
        </div>
        {pillar.id === 'crm' && (
          <span style={{ color: '#237A52', fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 16, letterSpacing: '0.08em', marginLeft: 'auto' }}>ATRIUM</span>
        )}
      </div>

      {/* Body — live module, or scaffold for pillars not yet built.
          Budgets floats as a soft-grey sheet over the stealth-black texture,
          like the project pages. */}
      {pillar.id === 'budgets' ? <BudgetsAdminBase /> : pillar.id === 'crm' ? <Atrium /> : pillar.id === 'deployment' ? <CapitalDeployment /> : (
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
      <Button variant="glassDark" onClick={onLogout}
        style={{ position: 'fixed', bottom: 18, left: 20, zIndex: 30, fontSize: 11 }}>
        Log Out
      </Button>
    </div>
  )
}
