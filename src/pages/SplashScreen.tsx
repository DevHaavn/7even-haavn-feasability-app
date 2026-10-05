import React, { useEffect, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// The boot splash. A dead-black screen; the A sits still while the ring draws
// itself, starting at the right and sweeping counter-clockwise (right, over
// the top, to the left, under the bottom, back to the right) until it closes
// into a full circle — the exact ring + A of the app icon, at 1024-unit scale
// so both pieces line up with the icon's own proportions. Holds a beat once
// closed, then fades into whatever screen comes next.
// ─────────────────────────────────────────────────────────────────────────────

const CX = 511.5, CY = 511.5, R = 303.5
const CIRC = 2 * Math.PI * R
const DRAW_MS = 320
const HOLD_MS = 30
const FADE_MS = 150

const CSS = `
.splash-root{position:fixed;inset:0;z-index:99999;background:#0B0D0F;display:flex;align-items:center;justify-content:center;
  transition:opacity ${FADE_MS}ms ease;opacity:1}
.splash-root.out{opacity:0;pointer-events:none}
.splash-mark{width:min(51vw,300px);height:auto;overflow:visible}
.splash-ring{stroke-dasharray:${CIRC};stroke-dashoffset:${CIRC};animation:splashDraw ${DRAW_MS}ms cubic-bezier(.45,0,.2,1) 0s forwards}
@keyframes splashDraw{to{stroke-dashoffset:0}}
`

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [out, setOut] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), DRAW_MS + HOLD_MS)
    const t2 = setTimeout(onDone, DRAW_MS + HOLD_MS + FADE_MS)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div className={`splash-root${out ? ' out' : ''}`}>
      <style>{CSS}</style>
      <svg className="splash-mark" viewBox="0 30 1024 964" role="img" aria-label="ATRIUM">
        {/* flipped vertically so the dash-draw (naturally clockwise from 3 o'clock)
            reads counter-clockwise on screen: right, up and over, left, under, right */}
        <g transform={`translate(0,${CY * 2}) scale(1,-1)`}>
          <circle className="splash-ring" cx={CX} cy={CY} r={R} fill="none" stroke="#F3F2EE" strokeWidth="13" strokeLinecap="round" />
        </g>
        <path d="M418.5 639 L511.5 385 L604.5 639" fill="none" stroke="#F3F2EE" strokeWidth="17" strokeLinejoin="miter" strokeLinecap="butt" />
      </svg>
    </div>
  )
}
