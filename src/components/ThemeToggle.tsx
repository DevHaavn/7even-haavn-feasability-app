import React from 'react'
import { useAtriumTheme, toggleAtriumTheme } from '../lib/atriumTheme'

// ── Light / dark toggle ─────────────────────────────────────────────────────────
// A compact ATRIUM-styled pill that flips the global theme. Sun = will switch to
// light; Moon = will switch to dark. Adapts its own chrome to the active theme so
// it reads on both the dark carbon header and the light frosted header.

export default function ThemeToggle({ style }: { style?: React.CSSProperties }) {
  const theme = useAtriumTheme()
  const light = theme === 'light'
  return (
    <button
      onClick={toggleAtriumTheme}
      aria-label={light ? 'Switch to dark theme' : 'Switch to light theme'}
      title={light ? 'Dark theme' : 'Light theme'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        height: 30, padding: '0 12px', borderRadius: 999, cursor: 'pointer',
        fontSize: 8.5, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color: light ? '#3A4750' : '#C6CDCF',
        border: `1px solid ${light ? 'rgba(120,140,162,0.36)' : 'rgba(220,232,244,0.18)'}`,
        background: light ? 'rgba(255,255,255,0.55)' : 'rgba(24,34,48,0.55)',
        backdropFilter: 'blur(10px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(10px) saturate(1.2)',
        boxShadow: light ? 'inset 0 1px 0 rgba(255,255,255,0.8)' : 'inset 0 1px 0 rgba(255,255,255,0.14)',
        transition: 'all 0.2s',
        ...style,
      }}
    >
      {light ? (
        // moon — tap for dark
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        // sun — tap for light
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
        </svg>
      )}
      {light ? 'Dark' : 'Light'}
    </button>
  )
}
