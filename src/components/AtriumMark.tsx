import React from 'react'

// ── The ATRIUM Apex — the canonical brand device (design brief §Device) ─────────
// A thin chrome-silver "A" built from layered light-lines rising to a sharp apex,
// with a green light-well orb glowing at its base. Never redraw it by hand — use
// this component everywhere the ATRIUM mark appears.
//
// Each instance mints unique gradient ids so multiple marks on one page don't
// collide. Pair with the "ATRIUM" wordmark (Inter Tight 600, .30em) via <AtriumLockup>.

let _seq = 0

// 11 nested silver strokes, faint+wide on the outside → bright+narrow inside,
// generated from the brief's canonical geometry (M28 216 L120 24 L212 216 …).
const STROKES = Array.from({ length: 11 }, (_, i) => ({
  d: `M${(28 + i * 5.06).toFixed(1)} ${(216 - i * 3.19).toFixed(1)} L120 ${(24 + i * 7.56).toFixed(1)} L${(212 - i * 5.06).toFixed(1)} ${(216 - i * 3.19).toFixed(1)}`,
  w: (1 + i * 0.055).toFixed(2),
  o: (0.16 + i * 0.074).toFixed(2),
}))

export function AtriumApex({ size = 20, style }: { size?: number; style?: React.CSSProperties }) {
  const [id] = React.useState(() => `atx${++_seq}`)
  const c = `c_${id}`, k = `k_${id}`, h = `h_${id}`, s = `s_${id}`
  return (
    <svg viewBox="0 0 240 240" width={size} height={size} aria-label="ATRIUM" style={{ display: 'block', flexShrink: 0, ...style }}>
      <defs>
        <linearGradient id={c} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F4F7F8" /><stop offset=".42" stopColor="#AEB6B8" />
          <stop offset=".52" stopColor="#6E7779" /><stop offset=".66" stopColor="#D6DBDC" />
          <stop offset="1" stopColor="#8A9395" />
        </linearGradient>
        <radialGradient id={k} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#EAFBF1" /><stop offset=".3" stopColor="#6FBE96" />
          <stop offset=".62" stopColor="#237A52" stopOpacity=".5" /><stop offset="1" stopColor="#237A52" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={h} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#6FBE96" stopOpacity=".55" /><stop offset="1" stopColor="#6FBE96" stopOpacity="0" />
        </radialGradient>
        <filter id={s}><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      <ellipse cx="120" cy="150" rx="58" ry="66" fill={`url(#${h})`} filter={`url(#${s})`} />
      {STROKES.map((st, i) => (
        <path key={i} d={st.d} fill="none" stroke={`url(#${c})`} strokeWidth={st.w} strokeLinejoin="round" strokeLinecap="round" opacity={st.o} />
      ))}
      <circle cx="120" cy="152" r="19" fill={`url(#${k})`} />
      <circle cx="120" cy="152" r="5" fill="#EAFBF1" />
    </svg>
  )
}

// Apex + "ATRIUM" wordmark lockup. tone controls the wordmark colour only.
export function AtriumLockup({ size = 20, wordSize = 13, tone = 'silver', gap = 9, style }: {
  size?: number; wordSize?: number; tone?: 'silver' | 'ink'; gap?: number; style?: React.CSSProperties
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap, ...style }}>
      <AtriumApex size={size} />
      <span style={{ color: tone === 'ink' ? '#3A3F3C' : '#EEF1F2', fontFamily: "'Inter Tight', var(--font-heading), system-ui, sans-serif", fontWeight: 600, fontSize: wordSize, letterSpacing: '0.30em', paddingLeft: '0.04em' }}>ATRIUM</span>
    </span>
  )
}
