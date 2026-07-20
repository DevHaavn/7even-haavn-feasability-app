import React from 'react'
import { Project7Mark } from '../../components/ui'
import { Button } from '../../components/ui/Button'
import SiteLinks from '../../components/SiteLinks'
import type { HMPillar } from './HaavnManagementBase'
import MeetingsView from '../../features/meetings/MeetingsView'
import { AtriumApex } from '../../components/AtriumMark'
import ThemeToggle from '../../components/ThemeToggle'
import { useAtriumTheme, atriumPalette } from '../../lib/atriumTheme'
import { useOpenStudioBridge } from '../../lib/useOpenStudioBridge'

/** Back control for the pillar header. The header flips with the theme, so a
 *  translucent "glass" pill went light-on-light and became unreadable in light
 *  mode. This is solid carbon in both themes — always legible, never guessed. */
const backPill: React.CSSProperties = {
  padding: '9px 16px', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
  fontWeight: 700, color: '#EDF1F3', background: '#141a20', border: '1px solid #2b343d',
  borderRadius: 999, cursor: 'pointer', flexShrink: 0,
  boxShadow: '0 4px 14px rgba(12,18,26,0.28)',
}

export default function HaavnManagementPillar({ pillar, onBack, onLogout, onExit }: { pillar: HMPillar; onBack: () => void; onLogout: () => void; onExit: () => void }) {
  const isCRM = pillar.id === 'crm'
  const theme = useAtriumTheme()
  const pal = atriumPalette(theme)
  // Feasibility tab in the embedded Management System can hand off to the studio.
  useOpenStudioBridge(onExit)

  // HAAVN Management System — the full ATRIUM Management prototype (Today, Senior
  // Management, Portfolio, Projects, project workspace, Client Portal, Meetings,
  // New Project wizard) with its own topbar + forest rail and light/dark toggle.
  // Runs as its own full-bleed shell; a carbon pill returns to the Management Hub.
  if (pillar.id === 'crm') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#050706', display: 'flex', flexDirection: 'column' }}>
        <iframe title="ATRIUM — Management System" src="/atrium-management.html"
          style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }} />
        {/* Top-left, under the Management System's own 58px topbar and clear of its
            64px icon rail — where you look for a back control. It was bottom-right,
            which read as a floating action rather than navigation. */}
        <button onClick={onBack}
          style={{ position: 'fixed', top: 70, left: 78, zIndex: 501, padding: '9px 16px', fontSize: 9, letterSpacing: '0.20em', textTransform: 'uppercase', fontWeight: 700, color: '#E8EDEF', background: 'rgba(10,13,12,0.94)', border: '1px solid #333b3f', borderRadius: 999, cursor: 'pointer', backdropFilter: 'blur(6px)', boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}>
          ← Management Hub
        </button>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, overflowY: 'auto',
      // Same architectural plate as the hub and the Capital pillars.
      background: theme === 'light'
        ? `linear-gradient(180deg, rgba(226,233,240,.72), rgba(215,224,233,.9)), url('/renders/atrium-surface-1.jpg') center 30% / cover no-repeat fixed`
        : `linear-gradient(180deg, rgba(7,9,13,.5), rgba(7,9,13,.82)), url('/renders/atrium-surface-1.jpg') center 30% / cover no-repeat fixed`,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 32px', borderBottom: `1px solid ${pal.headerBorder}`, flexShrink: 0, background: pal.headerBg }}>
        <button onClick={onBack} style={backPill}>← Management Hub</button>
        <ThemeToggle />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 6 }}>
          <span style={{ color: pillar.color, fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}>{pillar.num}</span>
          <span style={{ color: pal.ink, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>{pillar.title}</span>
        </div>
        <AtriumApex size={28} style={{ marginLeft: 'auto' }} />
      </div>

      {/* Body — live Meetings, or placeholder for future pillars */}
      {pillar.id === 'meetings' ? (
        <MeetingsView />
      ) : (
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
            This pillar is being built to power team collaboration and strategic initiatives. Coming soon.
          </p>
        </div>
      )}

      <SiteLinks />
      <Project7Mark />

      {/* Quick exit */}
      <Button variant="glassDark" onClick={onLogout}
        style={{ position: 'fixed', bottom: 18, left: 20, zIndex: 30, fontSize: 11 }}>
        Log Out
      </Button>
    </div>
  )
}
