import React from 'react'
import { DesignCredit } from './ui'

export default function SiteLinks() {
  return (
    <div style={{ background: '#0A0A0A', borderTop: '1px solid #1A1A1A', flexShrink: 0, paddingBottom: 12 }}>
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 16, padding: '18px 24px 10px',
    }}>
      <span style={{ color: '#fff', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>Visit Us</span>
      <div style={{ width: 1, height: 14, background: '#333' }} />
      <a
        href="https://7even.au"
        target="_blank"
        rel="noopener noreferrer"
        className="glass-btn glass-btn-gold"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '9px 22px',
          fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase',
          fontWeight: 700, textDecoration: 'none',
        }}
      >
        7EVEN.AU ↗
      </a>
      <a
        href="https://www.haavn.au"
        target="_blank"
        rel="noopener noreferrer"
        className="glass-btn"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '9px 22px',
          fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase',
          fontWeight: 700, textDecoration: 'none', color: 'rgba(255,255,255,0.9)',
        }}
      >
        HAAVN.AU ↗
      </a>
    </div>
    <DesignCredit />
    </div>
  )
}
