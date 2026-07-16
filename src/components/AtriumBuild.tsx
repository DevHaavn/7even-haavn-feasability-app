import React from 'react'

// ── The ATRIUM self-building device — "A3 · Lit Floors" ─────────────────────────
// Chrome and green frames alternate as they draw on, foot → apex → foot, climbing
// to the light-core which brightens with every level then blooms. Autoloops.
// Ported verbatim from the design prototype (atrium-A-animated.html · A3 + buildDevice).
// Use on splash / intro surfaces; for static marks use <AtriumApex>.

let _seq = 0

// A3 · Lit Floors — 9 alternating chrome / green strokes, faint+narrow → bright+wide.
const A3 = [
  { d: 'M30.0 214.0 L120.0 26.0 L210.0 214.0', w: '1.20', o: '0.18', green: false },
  { d: 'M36.1 209.9 L120.0 34.8 L203.9 209.9', w: '1.29', o: '0.41', green: true },
  { d: 'M42.1 205.9 L120.0 43.7 L197.8 205.9', w: '1.38', o: '0.36', green: false },
  { d: 'M48.2 201.8 L120.0 52.5 L191.8 201.8', w: '1.46', o: '0.54', green: true },
  { d: 'M54.3 197.8 L120.0 61.4 L185.7 197.8', w: '1.55', o: '0.54', green: false },
  { d: 'M60.4 193.8 L120.0 70.2 L179.6 193.8', w: '1.64', o: '0.66', green: true },
  { d: 'M66.5 189.7 L120.0 79.1 L173.6 189.7', w: '1.72', o: '0.72', green: false },
  { d: 'M72.5 185.7 L120.0 87.9 L167.5 185.7', w: '1.81', o: '0.79', green: true },
  { d: 'M78.6 181.6 L120.0 96.8 L161.4 181.6', w: '1.90', o: '0.90', green: false },
]

// A1 · Tight Weave — 11 chrome strokes, faint+narrow outside → bright+wide inside.
const A1 = [
  { d: 'M28.0 216.0 L120.0 24.0 L212.0 216.0', w: '1.00', o: '0.16', green: false },
  { d: 'M33.1 212.8 L120.0 31.6 L206.9 212.8', w: '1.05', o: '0.23', green: false },
  { d: 'M38.1 209.6 L120.0 39.1 L201.9 209.6', w: '1.11', o: '0.31', green: false },
  { d: 'M43.2 206.4 L120.0 46.7 L196.8 206.4', w: '1.17', o: '0.38', green: false },
  { d: 'M48.2 203.2 L120.0 54.2 L191.8 203.2', w: '1.22', o: '0.46', green: false },
  { d: 'M53.3 200.1 L120.0 61.8 L186.7 200.1', w: '1.27', o: '0.53', green: false },
  { d: 'M58.4 196.9 L120.0 69.4 L181.6 196.9', w: '1.33', o: '0.60', green: false },
  { d: 'M63.4 193.7 L120.0 76.9 L176.6 193.7', w: '1.39', o: '0.68', green: false },
  { d: 'M68.5 190.5 L120.0 84.5 L171.5 190.5', w: '1.44', o: '0.75', green: false },
  { d: 'M73.5 187.3 L120.0 92.0 L166.5 187.3', w: '1.50', o: '0.83', green: false },
  { d: 'M78.6 184.1 L120.0 99.6 L161.4 184.1', w: '1.55', o: '0.90', green: false },
]

const GEOM = {
  A3: { frames: A3, halo: { cx: 120, cy: 148, rx: 54, ry: 62 }, core: { cx: 120, cy: 150, r: 18 } },
  A1: { frames: A1, halo: { cx: 120, cy: 150, rx: 58, ry: 66 }, core: { cx: 120, cy: 152, r: 19 } },
}

export default function AtriumBuild({ variant = 'A3', size = 240, stagger = 88, draw = 640, hold = 1400, bright = false, style }: {
  variant?: 'A1' | 'A3'; size?: number; stagger?: number; draw?: number; hold?: number; bright?: boolean; style?: React.CSSProperties
}) {
  const svgRef = React.useRef<SVGSVGElement | null>(null)
  const [id] = React.useState(() => `atb${++_seq}`)
  const c = `chr_${id}`, k = `core_${id}`, h = `halo_${id}`, s = `soft_${id}`
  const g = GEOM[variant]
  const grad = bright
    ? ['#FFFFFF', '#EAF0F2', '#C2CACC', '#FFFFFF', '#D6DDDF']
    : ['#F4F7F8', '#AEB6B8', '#6E7779', '#D6DBDC', '#8A9395']

  React.useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const frames = [...svg.querySelectorAll<SVGPathElement>('.atb-frame')]
    const core = svg.querySelector<SVGGElement>('.atb-core')
    const halo = svg.querySelector<SVGEllipseElement>('.atb-halo')

    frames.forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = String(L); p.style.strokeDashoffset = String(L); p.style.opacity = '0' })
    if (core) core.style.opacity = '0'
    if (halo) halo.style.opacity = '0'

    if (REDUCE) {
      frames.forEach(p => { p.style.strokeDashoffset = '0'; p.style.opacity = p.dataset.op || '1' })
      if (core) core.style.opacity = '1'
      if (halo) halo.style.opacity = '0.9'
      return
    }

    let timers: ReturnType<typeof setTimeout>[] = []
    function run() {
      timers.forEach(clearTimeout); timers = []
      const total = (frames.length - 1) * stagger + draw
      frames.forEach((p, i) => {
        const L = p.getTotalLength()
        p.style.strokeDasharray = String(L); p.style.strokeDashoffset = String(L); p.style.opacity = '0'
        p.animate(
          [{ strokeDashoffset: L, opacity: 0 }, { strokeDashoffset: L * 0.15, opacity: Number(p.dataset.op), offset: 0.5 }, { strokeDashoffset: 0, opacity: Number(p.dataset.op) }],
          { duration: draw, delay: i * stagger, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'forwards' }
        )
      })
      if (halo) halo.animate([{ opacity: 0, transform: 'scale(.5)' }, { opacity: 0.9, transform: 'scale(1)' }], { duration: total, easing: 'ease-out', fill: 'forwards' })
      if (core) {
        core.style.transformBox = 'fill-box'; core.style.transformOrigin = 'center'
        core.animate(
          [{ opacity: 0, transform: 'scale(.35)', filter: 'brightness(1)' },
           { opacity: 0.55, transform: 'scale(.7)', filter: 'brightness(1.2)', offset: 0.55 },
           { opacity: 1, transform: 'scale(1)', filter: 'brightness(1.5)', offset: 0.9 },
           { opacity: 1, transform: 'scale(1.14)', filter: 'brightness(2.1)', offset: 0.97 },
           { opacity: 1, transform: 'scale(1)', filter: 'brightness(1.55)' }],
          { duration: total + 340, easing: 'ease-in', fill: 'forwards' }
        )
      }
      timers.push(setTimeout(run, total + 340 + hold))
    }
    run()
    return () => { timers.forEach(clearTimeout) }
  }, [stagger, draw, hold])

  return (
    <svg ref={svgRef} viewBox="0 0 240 240" width={size} height={size} aria-label="ATRIUM" style={{ display: 'block', overflow: 'visible', flexShrink: 0, ...style }}>
      <defs>
        <linearGradient id={c} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={grad[0]} /><stop offset=".42" stopColor={grad[1]} />
          <stop offset=".52" stopColor={grad[2]} /><stop offset=".66" stopColor={grad[3]} />
          <stop offset="1" stopColor={grad[4]} />
        </linearGradient>
        <radialGradient id={k} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#EAFBF1" /><stop offset=".3" stopColor="#6FBE96" />
          <stop offset=".62" stopColor="#237A52" stopOpacity=".5" /><stop offset="1" stopColor="#237A52" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={h} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#6FBE96" stopOpacity=".65" /><stop offset="1" stopColor="#6FBE96" stopOpacity="0" />
        </radialGradient>
        <filter id={s}><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      <ellipse className="atb-halo" cx={g.halo.cx} cy={g.halo.cy} rx={g.halo.rx} ry={g.halo.ry} fill={`url(#${h})`} filter={`url(#${s})`} opacity="0" />
      {g.frames.map((f, i) => (
        <path key={i} className="atb-frame" data-op={f.o} d={f.d} fill="none"
          stroke={f.green ? '#6FBE96' : `url(#${c})`} strokeWidth={f.w} strokeLinejoin="round" strokeLinecap="round" opacity="0" />
      ))}
      <g className="atb-core" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} opacity="0">
        <circle cx={g.core.cx} cy={g.core.cy} r={g.core.r} fill={`url(#${k})`} />
        <circle cx={g.core.cx} cy={g.core.cy} r="5" fill="#EAFBF1" />
      </g>
    </svg>
  )
}
