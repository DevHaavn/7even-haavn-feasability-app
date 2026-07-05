import React, { useId } from 'react'

// ── WAR ◎ ROOM — the integrated mark ─────────────────────────────────────────
// WAR and ROOM pull tight to centre; both R's are carved (SVG mask) into a
// circular aperture that cradles the red reticle. Black-chrome letters,
// #FF2F00 crosshair. From the approved look-and-feel (war-room-look-and-feel).

const RED = '#FF2F00'

function Reticle({ size = 90 }: { size?: number }) {
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size} role="img" aria-label="War Room reticle">
      <g fill="none" strokeLinecap="round">
        <circle r="40" stroke="#2E2F33" strokeWidth="1.2" />
        <circle r="31" stroke={RED} strokeWidth="1.6" strokeDasharray="3 4" opacity="0.6" />
        <path d="M0,-45 V-15 M0,15 V45 M-45,0 H-15 M15,0 H45" stroke={RED} strokeWidth="2.8" />
        <path d="M-22,-30 H-30 V-22 M22,-30 H30 V-22 M-22,30 H-30 V22 M22,30 H30 V22" stroke="#E9EAEC" strokeWidth="2" />
        <circle r="9.5" stroke={RED} strokeWidth="2.6" />
        <circle r="2.8" fill={RED} stroke="none" />
      </g>
    </svg>
  )
}

export default function WarMark({ width = 320, icon = false }: { width?: number; icon?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  if (icon) return <Reticle size={width} />
  // Geometry from the v2 brand doc (viewBox 0 22 686 104, aperture cx 288).
  // textLength pins WAR/ROOM to the doc's design widths so the lockup renders
  // identically before, during and after the webfont loads — no clipped M.
  return (
    <svg viewBox="0 22 686 104" width={width} height={width * 104 / 686} role="img" aria-label="War Room" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`chrome_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfd2d6" /><stop offset=".15" stopColor="#83878e" />
          <stop offset=".39" stopColor="#33353a" /><stop offset=".5" stopColor="#0b0c0d" />
          <stop offset=".57" stopColor="#191b1e" /><stop offset=".81" stopColor="#4c5057" />
          <stop offset="1" stopColor="#9a9ea5" />
        </linearGradient>
        <mask id={`cut_${uid}`}>
          <rect x="-20" y="-20" width="726" height="200" fill="white" />
          <circle cx="288" cy="74" r="45" fill="black" />
        </mask>
      </defs>
      <g mask={`url(#cut_${uid})`} fontFamily="'Archivo Black',sans-serif" fontSize="124" letterSpacing="-3">
        <text x="286" y="116" textAnchor="end" textLength="260" lengthAdjust="spacingAndGlyphs" fill={`url(#chrome_${uid})`}>WAR</text>
        <text x="290" y="116" textAnchor="start" textLength="344" lengthAdjust="spacingAndGlyphs" fill={`url(#chrome_${uid})`}>ROOM</text>
      </g>
      <g transform="translate(288,74)">
        <g fill="none" strokeLinecap="round">
          <circle r="40" stroke="#2E2F33" strokeWidth="1.2" />
          <circle r="31" stroke={RED} strokeWidth="1.6" strokeDasharray="3 4" opacity="0.6" />
          <path d="M0,-45 V-15 M0,15 V45 M-45,0 H-15 M15,0 H45" stroke={RED} strokeWidth="2.8" />
          <path d="M-22,-30 H-30 V-22 M22,-30 H30 V-22 M-22,30 H-30 V22 M22,30 H30 V22" stroke="#E9EAEC" strokeWidth="2" />
          <circle r="9.5" stroke={RED} strokeWidth="2.6" />
          <circle r="2.8" fill={RED} stroke="none" />
        </g>
      </g>
    </svg>
  )
}

export { Reticle, RED as WAR_RED }
