import React from 'react'
import { DesignCredit } from './ui'
import { AtriumApex } from './AtriumMark'

export default function SiteLinks({ tone = 'dark' }: { tone?: 'dark' | 'light' | 'glass' }) {
  const light = tone === 'light'
  const glass = tone === 'glass'
  // Three surfaces: dark Capital screens, the light ATRIUM studio, and the
  // grey/blue glass over the home render — links + copyright stay readable on all.
  const bg = light ? 'transparent'
    : glass ? 'rgba(150,172,196,0.10)'
    : 'linear-gradient(rgba(8,8,8,0.80), rgba(8,8,8,0.86)), url(/home-bg.jpg) center / cover no-repeat, #0A0A0A'
  const visitCol = light ? '#636966' : glass ? '#C6CDCF' : '#fff'
  const dividerCol = light ? '#D3D4D8' : glass ? 'rgba(220,232,244,0.28)' : '#333'
  const brandCol = light ? '#3A3F3C' : glass ? '#EEF1F2' : 'rgba(255,255,255,0.85)'
  const linkBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px',
    fontSize: 7.5, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, textDecoration: 'none',
    borderRadius: 999,
  }
  // Clear glass pill for the glass footer (grey/blue, see-through)
  const glassLink: React.CSSProperties = {
    ...linkBase, background: 'rgba(210,222,234,0.10)', border: '1px solid rgba(220,232,244,0.28)',
    color: '#EEF1F2', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
  }
  const sevenLink: React.CSSProperties = light
    ? { ...linkBase, background: 'var(--card, #fff)', border: '1px solid color-mix(in srgb, var(--gold, #C4973A) 45%, transparent)', color: 'var(--gold, #8A6A28)' }
    : glass ? glassLink : linkBase
  const haavnLink: React.CSSProperties = light
    ? { ...linkBase, background: 'var(--card, #fff)', border: '1px solid var(--border, #D3D4D8)', color: 'var(--ink, #12150F)' }
    : glass ? glassLink : { ...linkBase, color: 'rgba(255,255,255,0.9)' }
  const plain = light || glass

  return (
    <div className="site-footer" style={{ background: bg,
      backdropFilter: glass ? 'blur(16px) saturate(1.1)' : undefined, WebkitBackdropFilter: glass ? 'blur(16px) saturate(1.1)' : undefined,
      borderTop: light ? '1px solid #E1E4E3' : glass ? '1px solid rgba(220,232,244,0.16)' : '1px solid #1A1A1A', flexShrink: 0, paddingBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '13px 24px 8px', flexWrap: 'wrap' }}>
        {/* ATRIUM brand device */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <AtriumApex size={16} />
          <span style={{ color: brandCol, fontFamily: "'Inter Tight', var(--font-heading), sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: '0.28em' }}>ATRIUM</span>
        </span>
        <div style={{ width: 1, height: 12, background: dividerCol }} />
        <span style={{ color: visitCol, fontSize: 7.5, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>Visit Us</span>
        <a href="https://7even.au" target="_blank" rel="noopener noreferrer" className={plain ? undefined : 'glass-btn glass-btn-gold'} style={sevenLink}>
          7EVEN.AU ↗
        </a>
        <a href="https://www.haavn.au" target="_blank" rel="noopener noreferrer" className={plain ? undefined : 'glass-btn'} style={haavnLink}>
          HAAVN.AU ↗
        </a>
      </div>
      <DesignCredit style={light ? { color: '#9AA2A4' } : glass ? { color: 'rgba(255,255,255,0.44)' } : undefined} />
    </div>
  )
}
