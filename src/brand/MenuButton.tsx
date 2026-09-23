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

/* the 7, and the V it becomes: the site's own quads */
const Q7_BAR = [[0, 0], [86, 0], [78.5, 8.5], [0, 8.5]]
const Q7_LEG = [[86, 0], [7, 84], [63, 8.5], [78.5, 8.5]]
const QV_L = [[-2.5, 1.5], [34.5, 83], [43, 83], [42.5, 77]]
const QV_R = [[88.5, 1], [51.5, 83], [43, 83], [42.5, 77]]
const CX = 43, CY = 42, SWING = 26, D = 820
const WAIST = 80          // where the two halves of the X meet

type Q = number[][]
const quad = (p: Q) => 'M' + p.map(a => a[0].toFixed(2) + ',' + a[1].toFixed(2)).join(' L') + ' Z'
const lerpQ = (a: Q, c: Q, t: number): Q => a.map((p, k) => [p[0] + (c[k][0] - p[0]) * t, p[1] + (c[k][1] - p[1]) * t])
const rotQ = (q: Q, deg: number): Q => {
  const a = deg * Math.PI / 180, co = Math.cos(a), si = Math.sin(a)
  return q.map(p => { const x = p[0] - CX, y = p[1] - CY; return [CX + x * co - y * si, CY + x * si + y * co] })
}
/** the lower half: the same V, flipped about the waist */
const flipQ = (q: Q): Q => q.map(p => [p[0], 2 * WAIST - p[1]])
const eio = (x: number) => (x = x < 0 ? 0 : x > 1 ? 1 : x, x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

const CIRCLE = { d: 'M5,50 A45,45 0 1,1 95,50 A45,45 0 1,1 5,50 Z', s: 0.442, cx: 50, cy: 50 }

export default function MenuButton({ open, onClick, className }: { open: boolean; onClick: () => void; className?: string }) {
  const p1 = useRef<SVGPathElement | null>(null)
  const p2 = useRef<SVGPathElement | null>(null)
  const p3 = useRef<SVGPathElement | null>(null)
  const p4 = useRef<SVGPathElement | null>(null)
  const grp = useRef<SVGGElement | null>(null)
  const prog = useRef(0)
  const raf = useRef(0)

  useEffect(() => {
    const draw = (t: number, dir: number) => {
      const ang = dir * SWING * Math.sin(Math.PI * t)
      const l = rotQ(lerpQ(Q7_BAR, QV_L, t), ang), r = rotQ(lerpQ(Q7_LEG, QV_R, t), ang)
      p1.current?.setAttribute('d', quad(l))
      p2.current?.setAttribute('d', quad(r))
      /* the lower half arrives over the back half of the tween */
      const u = Math.max(0, (t - .45) / .55)
      p3.current?.setAttribute('d', quad(flipQ(l)))
      p4.current?.setAttribute('d', quad(flipQ(r)))
      const low = grp.current?.querySelector('.mbLow') as SVGGElement | null
      if (low) { low.style.opacity = String(u); low.style.transform = `translateY(${(1 - u) * -8}px)` }
      /* the X is twice the height of the V, so the mark closes down to fit the circle */
      const s = CIRCLE.s * (1 - .38 * t)
      grp.current?.setAttribute('transform',
        `translate(${(CIRCLE.cx - 43 * s).toFixed(2)},${(CIRCLE.cy - (42 + 38 * t) * s).toFixed(2)}) scale(${s.toFixed(4)})`)
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
          <path ref={p1} /><path ref={p2} />
          <g className="mbLow"><path ref={p3} /><path ref={p4} /></g>
        </g>
      </svg>
    </button>
  )
}
