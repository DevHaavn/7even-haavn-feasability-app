import React from 'react'
import { Project7Mark } from '../../components/ui'
import { Button } from '../../components/ui/Button'
import SiteLinks from '../../components/SiteLinks'
import type { HMPillar } from './HaavnManagementBase'
import Atrium from './Atrium'
import MeetingsView from '../../features/meetings/MeetingsView'
import { AtriumApex } from '../../components/AtriumMark'

export default function HaavnManagementPillar({ pillar, onBack, onLogout, onExit }: { pillar: HMPillar; onBack: () => void; onLogout: () => void; onExit: () => void }) {
  const isCRM = pillar.id === 'crm'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, overflowY: 'auto',
      background: isCRM
        ? 'radial-gradient(ellipse 90% 60% at 50% 25%, rgba(35,122,82,0.08) 0%, rgba(8,7,4,0.9) 55%, rgba(3,3,3,0.96) 100%), url(/home-bg.jpg) center / cover no-repeat fixed, #030303'
        : 'linear-gradient(rgba(3,3,3,0.30), rgba(3,3,3,0.55) 70%, rgba(3,3,3,0.78)), url(/capital-bg.png) center / cover no-repeat fixed, #030303',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 32px', borderBottom: '1px solid #1A1A1A', flexShrink: 0, background: 'linear-gradient(rgba(8,8,8,0.80), rgba(8,8,8,0.86)), url(/home-bg.jpg) center / cover no-repeat, #0A0A0A' }}>
        <Button variant="glassDark" onClick={onBack} style={{ fontSize: 11 }}>
          ← Management Hub
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 6 }}>
          <span style={{ color: pillar.color, fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}>{pillar.num}</span>
          <span style={{ color: '#fff', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>{pillar.title}</span>
        </div>
        <AtriumApex size={28} style={{ marginLeft: 'auto' }} />
      </div>

      {/* Body — live CRM, live Meetings, or placeholder for future pillars */}
      {pillar.id === 'crm' ? (
        <Atrium />
      ) : pillar.id === 'meetings' ? (
        <MeetingsView />
      ) : (
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
