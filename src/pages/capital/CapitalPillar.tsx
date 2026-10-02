import React, { useEffect, useState } from 'react'
import { Project7Mark } from '../../components/ui'
import { Button } from '../../components/ui/Button'
import SiteLinks from '../../components/SiteLinks'
import type { Pillar } from './CapitalBase'
import BudgetsAdminBase from './BudgetsAdminBase'
import ThemeToggle from '../../components/ThemeToggle'
import { useAtriumTheme, atriumPalette, atriumNavPill } from '../../lib/atriumTheme'
import { useOpenStudioBridge } from '../../lib/useOpenStudioBridge'
import { useScrollLock } from '../../lib/useScrollLock'

// Pillar 02 (Management System) now runs the exact ATRIUM Workflow tool —
// same CRM pipeline + meetings/agenda as HAAVN Management Hub pillar 01 —
// but it holds live buyer/partner data, so only the 7EVEN team gets in.
const CRM_ALLOWED_EMAILS = ['jamie@7even.au', 'daniel@7even.au', 'lewis@7even.au', 'accounts@7even.au', 'reception@7even.au']
const CRM_AUTH_KEY = 'capital_crm_email'

function CrmEmailGate({ onPass, onBack }: { onPass: (email: string) => void; onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = email.trim().toLowerCase()
    if (CRM_ALLOWED_EMAILS.includes(v)) {
      try { sessionStorage.setItem(CRM_AUTH_KEY, v) } catch { /* ignore */ }
      onPass(v)
    } else {
      setError("That email isn't on the ATRIUM access list.")
    }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#050706', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
      <span style={{ color: '#d6b36a', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase' }}>ATRIUM — Management System</span>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
        <input type="email" required autoFocus value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          placeholder="you@7even.au"
          style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #333b3f', background: 'rgba(255,255,255,0.04)', color: '#E8EDEF', fontSize: 14, outline: 'none' }} />
        {error && <span style={{ color: '#e2715a', fontSize: 11 }}>{error}</span>}
        <button type="submit" style={{ padding: '12px 14px', borderRadius: 999, border: '1px solid rgba(214,179,106,0.4)', background: 'rgba(214,179,106,0.12)', color: '#d6b36a', fontWeight: 700, letterSpacing: '0.1em', fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>
          Continue
        </button>
      </form>
      <button onClick={onBack} style={{ padding: '9px 16px', fontSize: 9, letterSpacing: '0.20em', textTransform: 'uppercase', fontWeight: 700, color: '#8a9094', background: 'transparent', border: '1px solid #333b3f', borderRadius: 999, cursor: 'pointer' }}>
        ← Capital Base
      </button>
    </div>
  )
}

/** Pillar workspace scaffold — each Capital pillar (Budgets, CRM) opens here.
 *  ATRIUM (Partner CRM) exits straight to the studio (never back through
 *  Capital admin) so staff stay sealed off from the other pillars. */
export default function CapitalPillar({ pillar, onBack, onLogout, onExit }: { pillar: Pillar; onBack: () => void; onLogout: () => void; onExit: () => void }) {
  const isBudgets = pillar.id === 'budgets'
  const isCRM = pillar.id === 'crm'
  const theme = useAtriumTheme()
  const pal = atriumPalette(theme)
  // Feasibility tab in the embedded Management System can hand off to the studio.
  useOpenStudioBridge(onExit)
  const [crmEmail, setCrmEmail] = useState<string | null>(() => {
    try { return sessionStorage.getItem(CRM_AUTH_KEY) } catch { return null }
  })
  useScrollLock(isCRM && !!crmEmail)
  useEffect(() => {
    if (!isCRM || !crmEmail) return
    const onMsg = (e: MessageEvent) => { if (e.data === 'haavn-workflow-close') onBack() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack() }
    window.addEventListener('message', onMsg)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('message', onMsg); window.removeEventListener('keydown', onKey) }
  }, [isCRM, crmEmail, onBack])

  // Pillar 02 — the same ATRIUM Workflow tool as Management Hub pillar 01
  // (CRM pipeline + meetings/agenda, all in one), full-bleed. Gated by email
  // since this pillar carries live buyer/partner data.
  if (isCRM) {
    if (!crmEmail) return <CrmEmailGate onPass={setCrmEmail} onBack={onBack} />
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#eceae4', display: 'flex', flexDirection: 'column', overflow: 'hidden', overscrollBehavior: 'none' }}>
        <iframe title="ATRIUM · Workflow" src="/atrium-workflow.html?v=20261002a" allow="microphone"
          style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }} />
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
