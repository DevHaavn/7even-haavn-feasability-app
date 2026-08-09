import React, { useEffect } from 'react'
import { Project7Mark } from '../../components/ui'
import { Button } from '../../components/ui/Button'
import SiteLinks from '../../components/SiteLinks'
import type { HMPillar } from './HaavnManagementBase'
import MeetingsView from '../../features/meetings/MeetingsView'
import { AtriumApex } from '../../components/AtriumMark'
import ThemeToggle from '../../components/ThemeToggle'
import { useAtriumTheme, atriumPalette, atriumNavPill } from '../../lib/atriumTheme'
import { useOpenStudioBridge } from '../../lib/useOpenStudioBridge'
import { useRole } from '../../lib/role'
import { useScrollLock } from '../../lib/useScrollLock'

export default function HaavnManagementPillar({ pillar, onBack, onLogout, onExit }: { pillar: HMPillar; onBack: () => void; onLogout: () => void; onExit: () => void }) {
  const isCRM = pillar.id === 'crm'
  const role = useRole()
  const theme = useAtriumTheme()
  const pal = atriumPalette(theme)
  // Feasibility tab in the embedded Management System can hand off to the studio.
  useOpenStudioBridge(onExit)
  // Pillar 03 (Weekly Meetings) mounts the boardroom agenda tool in an iframe;
  // its top-bar "← Hub" posts this message to return, and we pin the page on mobile.
  useScrollLock(pillar.id === 'agenda')
  useEffect(() => {
    if (pillar.id !== 'agenda') return
    const onMsg = (e: MessageEvent) => { if (e.data === 'haavn-agenda-close') onBack() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack() }
    window.addEventListener('message', onMsg)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('message', onMsg); window.removeEventListener('keydown', onKey) }
  }, [pillar.id, onBack])

  // HAAVN Management System — the full ATRIUM Management prototype (Today, Senior
  // Management, Portfolio, Projects, project workspace, Client Portal, Meetings,
  // New Project wizard) with its own topbar + forest rail and light/dark toggle.
  // Runs as its own full-bleed shell; a carbon pill returns to the Management Hub.
  if (pillar.id === 'crm') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#050706', display: 'flex', flexDirection: 'column' }}>
        {/* Consultants (external) get the full Management System EXCEPT the
            director-only Senior Management module (?role=consultant strips it). */}
        <iframe title="ATRIUM — Management System" src={`/atrium-management.html${role === 'external' ? '?role=consultant' : ''}`}
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

  // Pillar 03 · Weekly Meetings & Agenda Tracking — the boardroom agenda tool,
  // mounted full-bleed. Its own top-bar "← Hub" returns (see the effect above).
  if (pillar.id === 'agenda') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#ECE8DE', display: 'flex', flexDirection: 'column', overflow: 'hidden', overscrollBehavior: 'none' }}>
        <iframe title="Weekly Meetings & Agenda Tracking" src="/haavn-boardroom.html"
          style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }} />
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
        <button onClick={onBack} style={atriumNavPill}>← Management Hub</button>
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
      <button onClick={onLogout} style={{ ...atriumNavPill, position: 'fixed', bottom: 18, left: 20, zIndex: 30, fontSize: 11  }}>Log Out</button>
    </div>
  )
}
