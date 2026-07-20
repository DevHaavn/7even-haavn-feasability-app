import React from 'react'
import { Project7Mark } from '../../components/ui'
import { Button } from '../../components/ui/Button'
import SiteLinks from '../../components/SiteLinks'
import type { Pillar } from './CapitalBase'
import BudgetsAdminBase from './BudgetsAdminBase'
import CapitalCommand from './CapitalCommand'
import ThemeToggle from '../../components/ThemeToggle'
import { useAtriumTheme, atriumPalette, atriumNavPill } from '../../lib/atriumTheme'
import { useRole } from '../../lib/role'
import { useOpenStudioBridge } from '../../lib/useOpenStudioBridge'

/** Pillar workspace scaffold — each Capital pillar (Budgets, Deployment, CRM)
 *  opens here. ATRIUM (Partner CRM) exits straight to the studio (never back through
 *  Capital admin) so staff stay sealed off from the other pillars. */
export default function CapitalPillar({ pillar, onBack, onLogout, onExit }: { pillar: Pillar; onBack: () => void; onLogout: () => void; onExit: () => void }) {
  const isBudgets = pillar.id === 'budgets'
  const isCRM = pillar.id === 'crm'
  const theme = useAtriumTheme()
  const pal = atriumPalette(theme)
  const role = useRole()
  // Feasibility tab in the embedded Management System can hand off to the studio.
  useOpenStudioBridge(onExit)

  // Capital Command brings its own ATRIUM chrome (topbar + tab nav + theme
  // toggle), so it renders full-bleed rather than inside the generic pillar
  // shell — same treatment as the CRM pillar below. Nesting it would have
  // stacked two headers.
  if (pillar.id === 'deployment') {
    return <CapitalCommand onBack={onBack} />
  }

  // Pillar 03 now runs the full ATRIUM Management System — the SAME tool as
  // Management Hub pillar 01 — full-bleed, with all its tabs, and a back pill.
  if (isCRM) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#050706', display: 'flex', flexDirection: 'column' }}>
        <iframe title="ATRIUM — Management System" src={`/atrium-management.html${role === 'external' ? '?role=consultant' : ''}`}
          style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }} />
        {/* Same treatment as the HM pillar: top-left under the Management System's
            own topbar, clear of its icon rail, rather than floating bottom-right. */}
        <button onClick={onBack}
          style={{ position: 'fixed', top: 70, left: 78, zIndex: 501, padding: '9px 16px', fontSize: 9, letterSpacing: '0.20em', textTransform: 'uppercase', fontWeight: 700, color: '#E8EDEF', background: 'rgba(10,13,12,0.94)', border: '1px solid #333b3f', borderRadius: 999, cursor: 'pointer', backdropFilter: 'blur(6px)', boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}>
          ← Capital Base
        </button>
      </div>
    )
  }

  const shellBg = pal.bg
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, overflowY: 'auto',
      // Same architectural plate as the gateways, so entering a pillar keeps the
      // surface rather than dropping to a flat colour. Scrim keeps type legible.
      background: theme === 'light'
        ? `linear-gradient(180deg, rgba(226,233,240,.72), rgba(215,224,233,.9)), url('/renders/atrium-surface-1.jpg') center 30% / cover no-repeat fixed`
        : `linear-gradient(180deg, rgba(7,9,13,.5), rgba(7,9,13,.82)), url('/renders/atrium-surface-1.jpg') center 30% / cover no-repeat fixed`,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header — flips with the theme (CRM stays dark) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 32px', borderBottom: `1px solid ${isCRM ? '#1A1A1A' : pal.headerBorder}`, flexShrink: 0, background: isCRM ? 'linear-gradient(180deg, #0f151c, #0b1015)' : pal.headerBg }}>
        {isCRM ? (
          <button onClick={onExit} style={atriumNavPill}>ATRIUM</button>
        ) : (
          <button onClick={onBack} style={atriumNavPill}>← Capital Base</button>
        )}
        {!isCRM && <ThemeToggle />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 6 }}>
          <span style={{ color: pillar.color, fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}>{pillar.num}</span>
          {isCRM
            ? <span style={{ color: '#fff', fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>ATRIUM</span>
            : <span style={{ color: pal.ink, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>{pillar.title}</span>}
        </div>
        {isCRM && (
          <span style={{ color: '#237A52', fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 16, letterSpacing: '0.08em', marginLeft: 'auto' }}>ATRIUM</span>
        )}
      </div>

      {/* Body — live module, or scaffold for pillars not yet built.
          Budgets floats as a soft-grey sheet over the stealth-black texture,
          like the project pages. */}
      {pillar.id === 'budgets' ? <BudgetsAdminBase /> : (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
        <span style={{ color: pillar.color, fontFamily: 'monospace', fontSize: 44, fontWeight: 700, opacity: 0.9, textShadow: `0 0 30px ${pillar.color}55` }}>{pillar.num}</span>
        <h1 style={{ color: pal.ink, fontFamily: 'var(--font-heading)', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 40px)', letterSpacing: '0.05em', margin: '18px 0 10px' }}>
          {pillar.title}
        </h1>
        <p style={{ color: pillar.color, fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', margin: '0 0 20px' }}>{pillar.sub}</p>
        <p style={{ color: pal.muted, fontSize: 14, lineHeight: 1.7, maxWidth: 460, margin: '0 0 32px' }}>{pillar.blurb}</p>

        <div style={{ display: 'inline-block', padding: '12px 30px', borderRadius: 12, border: `1px solid ${pillar.color}44`, background: `${pillar.color}0D`, color: pillar.color, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 700 }}>
          Module under construction
        </div>
        <p style={{ color: pal.faint, fontSize: 11, letterSpacing: '0.1em', marginTop: 22, maxWidth: 420 }}>
          This pillar is the foundation of the Capital back-of-house. We'll build its screens, data and links to the feasibility projects here, step by step.
        </p>
      </div>
      )}

      <SiteLinks />
      <Project7Mark />

      {/* Quick secure exit — matches the hub's grey-glow logout */}
      <button onClick={onLogout} style={{ ...atriumNavPill, position: 'fixed', bottom: 18, left: 20, zIndex: 30, fontSize: 11  }}>Log Out</button>
    </div>
  )
}
