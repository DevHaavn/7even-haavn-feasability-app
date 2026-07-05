import React, { useId } from 'react'

// ── CAPITAL COMMAND — green-chrome wordmark for the Capital Deployment pillar ─
// Same treatment family as the WAR ROOM mark: Archivo Black, metallic gradient,
// textLength-pinned so it renders identically in any font-loading state.

export default function CapitalCommandMark({ width = 200 }: { width?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg viewBox="0 0 560 64" width={width} height={width * 64 / 560} role="img" aria-label="Capital Command" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`ccg_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8CF5BC" />
          <stop offset=".28" stopColor="#1FE87A" />
          <stop offset=".52" stopColor="#0A5B30" />
          <stop offset=".62" stopColor="#0F9E52" />
          <stop offset="1" stopColor="#063D20" />
        </linearGradient>
      </defs>
      <text x="0" y="50" fontFamily="'Archivo Black',sans-serif" fontSize="52" letterSpacing="-1"
        textLength="560" lengthAdjust="spacingAndGlyphs" fill={`url(#ccg_${uid})`}>
        CAPITAL COMMAND
      </text>
    </svg>
  )
}
