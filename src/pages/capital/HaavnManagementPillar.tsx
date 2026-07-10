import React from 'react'
import { Project7Mark } from '../../components/ui'
import SiteLinks from '../../components/SiteLinks'
import type { HMPillar } from './HaavnManagementBase'
import Atrium from './Atrium'

export default function HaavnManagementPillar({ pillar, onBack, onLogout, onExit }: { pillar: HMPillar; onBack: () => void; onLogout: () => void; onExit: () => void }) {
  const isCRM = pillar.id === 'crm'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, overflowY: 'auto',
      background: isCRM
        ? 'radial-gradient(ellipse 90% 60% at 50% 25%, rgba(255,47,0,0.08) 0%, rgba(8,7,4,0.9) 55%, rgba(3,3,3,0.96) 100%), url(/home-bg.jpg) center / cover no-repeat fixed, #030303'
        : 'linear-gradient(rgba(3,3,3,0.30), rgba(3,3,3,0.55) 70%, rgba(3,3,3,0.78)), url(/capital-bg.png) center / cover no-repeat fixed, #030303',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 32px', borderBottom: '1px solid #1A1A1A', flexShrink: 0, background: 'linear-gradient(rgba(8,8,8,0.80), rgba(8,8,8,0.86)), url(/home-bg.jpg) center / cover no-repeat, #0A0A0A' }}>
        <button onClick={onBack} className="glass-btn"
          style={{ color: 'rgba(255,255,255,0.85)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 14px' }}>
          ← Management Hub
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 6 }}>
          <span style={{ color: pillar.color, fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}>{pillar.num}</span>
          <span style={{ color: '#fff', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>{pillar.title}</span>
        </div>
        <img src="/hm-device-white.png" alt="HAAVN Management" draggable={false} style={{ height: 20, width: 'auto', display: 'block', marginLeft: 'auto', opacity: 0.9 }} />
      </div>

      {/* Body — live CRM or placeholder for future pillars */}
      {pillar.id === 'crm' ? (
        <Atrium />
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
      <button onClick={onLogout} className="glass-btn glass-btn-grey"
        style={{ position: 'fixed', bottom: 18, left: 20, zIndex: 30, color: 'rgba(255,255,255,0.85)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 16px' }}>
        Log Out
      </button>
    </div>
  )
}
