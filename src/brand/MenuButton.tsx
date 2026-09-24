import React, { useEffect, useRef } from 'react'

/**
 * The 7EVEN menu button, carried over from 7even.au.
 *
 * The frame is drawn in the SVG rather than with a CSS border, so the glow
 * follows the real geometry. At rest the mark is the 7; opening the menu turns
 * it into the X, which on the site was the V: the 7's bar and leg tween into
 * the upper V over 820ms with a 26 degree swing, and here the lower half of the
 * device, the same V flipped, arrives with it. The pair is the X.
 *
 * The build is the site's, quad for quad, so the two buttons stay identical.
 */

/* the 7, and the X it becomes: the 7X device's own X. The bar turns into the
   "\" stroke; the leg turns into the "/" stroke, cut where the "\" crosses it
   (the overlap), so it arrives as two pieces. */
const Q7_BAR = [[0, 0], [86, 0], [78.5, 8.5], [0, 8.5]]
const Q7_LEG = [[86, 0], [7, 84], [63, 8.5], [78.5, 8.5]]
const QX_BACK = [[0, 0], [11.45, 0], [81.45, 89], [70, 89]]
const QX_FWD_UP = [[81.45, 0], [52.8, 36.4], [41.4, 36.4], [70, 0]]
const QX_FWD_LO = [[40.05, 52.6], [11.45, 89], [0, 89], [28.6, 52.6]]
const Q7_LEG_UP = Q7_LEG, Q7_LEG_LO = Q7_LEG
const CX = 43, CY = 42, SWING = 26, D = 820
const XC = [40.7, 44.5]   // centre of the X, so it sits in the circle where the 7 did
type Q = number[][]
const quad = (p: Q) => 'M' + p.map(a => a[0].toFixed(2) + ',' + a[1].toFixed(2)).join(' L') + ' Z'
const lerpQ = (a: Q, c: Q, t: number): Q => a.map((p, k) => [p[0] + (c[k][0] - p[0]) * t, p[1] + (c[k][1] - p[1]) * t])
const rotQ = (q: Q, deg: number): Q => {
  const a = deg * Math.PI / 180, co = Math.cos(a), si = Math.sin(a)
  return q.map(p => { const x = p[0] - CX, y = p[1] - CY; return [CX + x * co - y * si, CY + x * si + y * co] })
}
const eio = (x: number) => (x = x < 0 ? 0 : x > 1 ? 1 : x, x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

const CIRCLE = { d: 'M5,50 A45,45 0 1,1 95,50 A45,45 0 1,1 5,50 Z', s: 0.442, cx: 50, cy: 50 }

export default function MenuButton({ open, onClick, className }: { open: boolean; onClick: () => void; className?: string }) {
  const p1 = useRef<SVGPathElement | null>(null)
  const p2 = useRef<SVGPathElement | null>(null)
  const p3 = useRef<SVGPathElement | null>(null)
  const grp = useRef<SVGGElement | null>(null)
  const prog = useRef(0)
  const raf = useRef(0)

  useEffect(() => {
    const draw = (t: number, dir: number) => {
      const ang = dir * SWING * Math.sin(Math.PI * t)
      p1.current?.setAttribute('d', quad(rotQ(lerpQ(Q7_BAR, QX_BACK, t), ang)))
      p2.current?.setAttribute('d', quad(rotQ(lerpQ(Q7_LEG_UP, QX_FWD_UP, t), ang)))
      p3.current?.setAttribute('d', quad(rotQ(lerpQ(Q7_LEG_LO, QX_FWD_LO, t), ang)))
      const s = CIRCLE.s * (1 - .05 * t)
      const cx = CX + (XC[0] - CX) * t, cy = CY + (XC[1] - CY) * t
      grp.current?.setAttribute('transform',
        `translate(${(CIRCLE.cx - cx * s).toFixed(2)},${(CIRCLE.cy - cy * s).toFixed(2)}) scale(${s.toFixed(4)})`)
    }
    const to = open ? 1 : 0
    const from = prog.current, dir = to > from ? 1 : -1, t0 = performance.now()
    if (raf.current) cancelAnimationFrame(raf.current)
    const loop = (now: number) => {
      const k = Math.min(1, (now - t0) / D)
      prog.current = from + (to - from) * eio(k)
      draw(prog.current, dir)
      if (k < 1) raf.current = requestAnimationFrame(loop)
      else { prog.current = to; draw(to, dir) }
    }
    loop(performance.now())
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [open])

  return (
    <button className={`mb${open ? ' lit' : ''}${className ? ' ' + className : ''}`} type="button"
            aria-label={open ? 'Close menu' : 'Menu'} aria-expanded={open} onClick={onClick}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path className="fr rip" d={CIRCLE.d} />
        <path className="fr in" d={CIRCLE.d} />
        <g className="mark" ref={grp} fill="currentColor">
          <path ref={p1} /><path ref={p2} /><path ref={p3} />
        </g>
      </svg>
    </button>
  )
}
