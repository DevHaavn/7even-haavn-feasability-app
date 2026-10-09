import React, { useEffect, useState } from 'react'
import { DesignCredit } from './ui'
import UpdateButton from './UpdateButton'

// Melbourne time, ticking, for the footer's Live line.
function FootClock() {
  const [now, setNow] = useState('--:--:--')
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString('en-AU', { hour12: false, timeZone: 'Australia/Melbourne' }))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{now}</span>
}

// The round ATRIUM mark: the ring with the open A, same as every new footer.
function AtriumRing({ color }: { color: string }) {
  return (
    <a href="/?open=home" aria-label="ATRIUM, choose a company" style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}`, color, textDecoration: 'none' }}>
      <svg viewBox="0 0 100 100" aria-hidden="true" style={{ width: 15, height: 15, display: 'block' }}><path d="M22.7 81.2 L50 18.8 L77.3 81.2" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="miter" strokeLinecap="butt" /></svg>
    </a>
  )
}

export default function SiteLinks({ tone = 'dark' }: { tone?: 'dark' | 'light' | 'glass' }) {
  const light = tone === 'light'
  const glass = tone === 'glass'
  // Three surfaces: dark Capital screens, the light ATRIUM studio, and the
  // grey/blue glass over the home render — links + copyright stay readable on all.
  const bg = light ? 'transparent'
    : glass ? 'rgba(150,172,196,0.10)'
    // ATRIUM chrome, matching the header bar. Was the /home-bg.jpg particle
    // mesh, which left a black textured strip under the architectural plate.
    : 'linear-gradient(180deg, #0f151c, #0b1015)'
  // Footer language (Jessica's, same as the access screen): one line, Inter 300 at 12,
  // tracking zero, plain links, no pills, no arrows. Colour follows the surface.
  const textCol = light ? 'rgba(16,16,16,.58)' : glass ? 'rgba(238,241,242,.66)' : 'rgba(243,242,238,.6)'
  const hoverCol = light ? '#101010' : '#F3F2EE'
  const dividerCol = light ? '#D3D4D8' : glass ? 'rgba(220,232,244,0.28)' : '#333'
  const brandCol = light ? '#3A3F3C' : glass ? '#EEF1F2' : 'rgba(255,255,255,0.85)'
  const type: React.CSSProperties = { fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, fontWeight: 300, letterSpacing: 0, textTransform: 'none' }
  const link: React.CSSProperties = { ...type, color: textCol, textDecoration: 'none', transition: 'color .3s' }
  const over = (e: React.SyntheticEvent<HTMLAnchorElement>, on: boolean) => { e.currentTarget.style.color = on ? hoverCol : textCol }
  return (
    <div className="site-footer" style={{ background: bg,
      backdropFilter: glass ? 'blur(16px) saturate(1.1)' : undefined, WebkitBackdropFilter: glass ? 'blur(16px) saturate(1.1)' : undefined,
      borderTop: light ? '1px solid #E1E4E3' : glass ? '1px solid rgba(220,232,244,0.16)' : '1px solid #1A1A1A', flexShrink: 0, paddingBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, padding: '13px 24px 8px', flexWrap: 'wrap' }}>
        <AtriumRing color={textCol} />
        <div style={{ width: 1, height: 12, background: dividerCol }} />
        <span style={{ ...type, color: textCol }}>Live &nbsp;·&nbsp; <FootClock /> &nbsp;·&nbsp; Melbourne</span>
        <a href="https://7even.au" target="_blank" rel="noopener noreferrer" style={link} onMouseEnter={e => over(e, true)} onMouseLeave={e => over(e, false)}>7even.au</a>
        <a href="https://www.haavn.au" target="_blank" rel="noopener noreferrer" style={link} onMouseEnter={e => over(e, true)} onMouseLeave={e => over(e, false)}>haavn.au</a>
        {/* Get-latest: the single refresh circle. */}
        <UpdateButton tone={tone} />
      </div>
      <DesignCredit style={light ? { color: '#9AA2A4' } : glass ? { color: 'rgba(255,255,255,0.44)' } : undefined} />
    </div>
  )
}
