import React from 'react'

export default function SiteLinks() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 16, padding: '18px 24px',
      background: '#0A0A0A', borderTop: '1px solid #1A1A1A',
      flexShrink: 0,
    }}>
      <span style={{ color: '#fff', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>Visit Us</span>
      <div style={{ width: 1, height: 14, background: '#333' }} />
      <a
        href="https://7even.au"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '7px 20px',
          border: '1px solid #fff',
          color: '#fff',
          fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase',
          fontWeight: 700, textDecoration: 'none',
          transition: 'all 0.2s',
          background: 'transparent',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = '#fff'
          ;(e.currentTarget as HTMLElement).style.color = '#000'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = '#fff'
        }}
      >
        7EVEN.AU ↗
      </a>
      <a
        href="https://www.haavn.au"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '7px 20px',
          border: '1px solid #C4973A',
          color: '#C4973A',
          fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase',
          fontWeight: 700, textDecoration: 'none',
          transition: 'all 0.2s',
          background: 'transparent',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = '#C4973A'
          ;(e.currentTarget as HTMLElement).style.color = '#000'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = '#C4973A'
        }}
      >
        HAAVN.AU ↗
      </a>
    </div>
  )
}
