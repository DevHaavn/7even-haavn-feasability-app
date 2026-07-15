import React from 'react'
import { DesignCredit } from './ui'
import { AtriumApex } from './AtriumMark'

export default function SiteLinks({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const light = tone === 'light'
  // Colours flip for the light ATRIUM work surface (the feasibility studio) vs
  // the dark Capital screens, so links and the copyright stay readable on both.
  const bg = light
    ? 'transparent'
    : 'linear-gradient(rgba(8,8,8,0.80), rgba(8,8,8,0.86)), url(/home-bg.jpg) center / cover no-repeat, #0A0A0A'
  const visitCol = light ? '#636966' : '#fff'
  const dividerCol = light ? '#D3D4D8' : '#333'
  const brandCol = light ? '#3A3F3C' : 'rgba(255,255,255,0.85)'
  const linkBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px',
    fontSize: 7.5, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, textDecoration: 'none',
    borderRadius: 999,
  }
  const sevenLink: React.CSSProperties = light
    ? { ...linkBase, background: '#fff', border: '1px solid rgba(196,151,58,0.45)', color: '#8A6A28' }
    : linkBase
  const haavnLink: React.CSSProperties = light
    ? { ...linkBase, background: '#fff', border: '1px solid #D3D4D8', color: '#12150F' }
    : { ...linkBase, color: 'rgba(255,255,255,0.9)' }

  return (
    <div className="site-footer" style={{ background: bg, borderTop: light ? '1px solid #E1E4E3' : '1px solid #1A1A1A', flexShrink: 0, paddingBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '13px 24px 8px', flexWrap: 'wrap' }}>
        {/* ATRIUM brand device */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <AtriumApex size={16} />
          <span style={{ color: brandCol, fontFamily: "'Inter Tight', var(--font-heading), sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: '0.28em' }}>ATRIUM</span>
        </span>
        <div style={{ width: 1, height: 12, background: dividerCol }} />
        <span style={{ color: visitCol, fontSize: 7.5, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>Visit Us</span>
        <a href="https://7even.au" target="_blank" rel="noopener noreferrer" className={light ? undefined : 'glass-btn glass-btn-gold'} style={sevenLink}>
          7EVEN.AU ↗
        </a>
        <a href="https://www.haavn.au" target="_blank" rel="noopener noreferrer" className={light ? undefined : 'glass-btn'} style={haavnLink}>
          HAAVN.AU ↗
        </a>
      </div>
      <DesignCredit style={light ? { color: '#9AA2A4' } : undefined} />
    </div>
  )
}
