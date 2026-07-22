import React, { useEffect, useMemo, useState } from 'react'
import SiteLinks from '../components/SiteLinks'
import { Project7Mark } from '../components/ui'

/**
 * HAAVN HOMES — the Black Series homes-building company.
 *
 * A SEPARATE surface from the Feasibility Studio: its own localStorage store, no
 * shared data or IP. The landing mirrors the main project list — the tower hero,
 * the ATRIUM chrome, a brand dropdown, live countdown clocks and + New Project —
 * but the projects are the homes, and opening one goes straight into the HAAVN
 * Black Series feasibility studio (public/haavn-black-series.html), mounted the
 * same way the Administration books are.
 */

const STORE_KEY = 'haavn_homes_v2'
const BLACK_SERIES_URL = '/haavn-black-series.html'

export interface HomeProject {
  id: string
  name: string
  address: string
  external?: boolean       // Merrimu is an external-developer project
  start?: string           // programme start (YYYY-MM)
  handover?: string        // target handover (YYYY-MM) — drives the live clock
  createdAt: string
}

const uid = () => Math.random().toString(36).slice(2, 10)

// The Black Series range as the seeded HAAVN HOMES project list. Merrimu is an
// external developer engagement at Merrimu VIC 3340; the rest are HAAVN's own
// signature homes. Seed handover dates give the clocks something live to count.
const SEED: Omit<HomeProject, 'createdAt'>[] = [
  { id: 'solum', name: 'SOLUM', address: 'Black Series · Signature home', start: '2026-09', handover: '2027-06' },
  { id: 'havan', name: 'HAVAN', address: 'Black Series · Signature home', start: '2026-10', handover: '2027-07' },
  { id: 'forma', name: 'FORMA', address: 'Black Series · Signature home', start: '2026-11', handover: '2027-08' },
  { id: 'magna', name: 'MAGNA', address: 'Black Series · Signature home', start: '2027-01', handover: '2027-10' },
  { id: 'magna-plus', name: 'MAGNA PLUS', address: 'Black Series · Signature home', start: '2027-02', handover: '2027-12' },
  { id: 'merrimu', name: 'MERRIMU', address: 'Merrimu VIC 3340', external: true, start: '2026-08', handover: '2027-09' },
]

function load(): HomeProject[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) { const d = JSON.parse(raw); if (Array.isArray(d) && d.length) return d }
  } catch { /* fall through to seed */ }
  const seeded = SEED.map(s => ({ ...s, createdAt: new Date().toISOString() }))
  try { localStorage.setItem(STORE_KEY, JSON.stringify(seeded)) } catch { /* ignore */ }
  return seeded
}
function save(list: HomeProject[]) { try { localStorage.setItem(STORE_KEY, JSON.stringify(list)) } catch { /* ignore */ } }

// Live countdown to a home's handover (YYYY-MM → first of the following logic).
// Mirrors the studio's stealth clock: months · days on top, hh:mm:ss below.
function HomeClock({ handover }: { handover?: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const target = useMemo(() => {
    if (!handover) return null
    const [y, m] = handover.split('-').map(Number)
    if (!y || !m) return null
    return new Date(y, m, 1).getTime() // end of the handover month
  }, [handover])

  const W = 150, ML = 38
  if (!target) return <div style={{ width: W, marginLeft: ML, flexShrink: 0 }} />
  const diff = target - now
  if (diff <= 0) return (
    <div style={{ width: W, marginLeft: ML, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3DAA6A' }} />
      <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.16em', color: '#3DAA6A', fontWeight: 700 }}>HANDED OVER</span>
    </div>
  )
  const d = Math.floor(diff / 86400000)
  const months = Math.floor(d / 30.44)
  const days = d - Math.round(months * 30.44)
  const hh = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0')
  const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0')
  const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')
  const near = months < 3
  return (
    <div title="Live countdown to handover" style={{ width: W, marginLeft: ML, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ position: 'relative', width: 6, height: 6, flexShrink: 0 }}>
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: near ? '#F0B860' : '#FFFFFF', animation: 'ping 1.6s cubic-bezier(0,0,0.2,1) infinite', opacity: 0.55 }} />
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: near ? '#F0B860' : '#FFFFFF' }} />
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', color: near ? '#FFD9A0' : '#FFFFFF' }}>
          {months}<span style={{ fontSize: 8, opacity: 0.75 }}>M</span> {days}<span style={{ fontSize: 8, opacity: 0.75 }}>D</span>
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{hh}:{mm}:{ss}</span>
      </div>
    </div>
  )
}

export default function HaavnHomes({ onBack, restricted, onOpenCrm, onLogout }: {
  onBack: () => void
  /** Builder login (Jeffrey Witbreuk): no route back to the 7EVEN studio; the
   *  brand dropdown is hidden and an HM CRM entry + Log Out are shown instead. */
  restricted?: boolean
  onOpenCrm?: () => void
  onLogout?: () => void
}) {
  const [list, setList] = useState<HomeProject[]>(() => load())
  const [openId, setOpenId] = useState<string | null>(null)
  const [brandMenu, setBrandMenu] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [start, setStart] = useState('')
  const [handover, setHandover] = useState('')

  useEffect(() => { save(list) }, [list])
  const open = list.find(p => p.id === openId) || null

  function addProject() {
    if (!name.trim()) return
    setList(prev => [...prev, { id: uid(), name: name.trim(), address: address.trim(), start: start || undefined, handover: handover || undefined, createdAt: new Date().toISOString() }])
    setName(''); setAddress(''); setStart(''); setHandover(''); setShowNew(false)
  }
  function remove(id: string) { setList(prev => prev.filter(p => p.id !== id)) }

  const mono = 'monospace'

  // ── the mounted Black Series feasibility studio ──────────────────────────────
  if (open) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: '#0b0b0c', display: 'flex', flexDirection: 'column' }}>
        <iframe title={`HAAVN Black Series — ${open.name}`}
          src={`${BLACK_SERIES_URL}#home=${encodeURIComponent(open.id)}`}
          style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }} />
        <button onClick={() => setOpenId(null)}
          style={{ position: 'fixed', top: 12, left: 16, zIndex: 601, padding: '8px 15px', fontSize: 9,
            letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, color: '#E8EDEF',
            background: 'rgba(12,12,14,0.9)', border: '1px solid #333', borderRadius: 999, cursor: 'pointer', backdropFilter: 'blur(6px)' }}>
          ← HAAVN Homes
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'linear-gradient(rgba(5,7,10,0.15), rgba(5,7,10,0.15)), linear-gradient(to bottom, rgba(5,7,10,0.30) 0%, rgba(5,7,10,0.04) 30%, rgba(5,7,10,0.16) 62%, rgba(5,7,10,0.60) 100%), url(/renders/tower-hero.jpg) center / cover no-repeat, #05070a' }}>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', height: 'clamp(280px, 52vh, 60vh)', flexShrink: 0 }}>
        {/* HM CRM entry — the HM device button, same mark/treatment as the main
            app page (no plate, device only). Shown in every HAAVN HOMES view. */}
        {onOpenCrm && (
          <button onClick={onOpenCrm} className="no-drag" title="HM CRM — Management Hub"
            style={{ position: 'absolute', top: 30, right: 44, zIndex: 30, background: 'transparent', border: 'none', padding: '6px 10px', cursor: 'pointer', opacity: 0.9, transition: 'opacity 0.2s', lineHeight: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9' }}>
            <img src="/hm-device-white.png" alt="HAAVN Management" draggable={false} style={{ height: 22, width: 'auto', display: 'block' }} />
          </button>
        )}

        <div style={{ position: 'absolute', top: '4%', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
          <p style={{ color: 'white', fontSize: 11, letterSpacing: '0.38em', textTransform: 'uppercase', fontWeight: 500 }}>Precision Homes · Black Series</p>
        </div>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, gap: 16, transform: 'translateY(-6px)' }}>
          {/* Real HAAVN wordmark (grey #474748 source), rendered white for the dark hero */}
          <svg viewBox="0 0 4020.14 639.17" role="img" aria-label="HAAVN" fill="#FFFFFF"
            style={{ width: 'min(430px, 64vw)', height: 'auto', filter: 'drop-shadow(0 2px 14px rgba(0,0,0,0.45))' }}>
            <polygon points="4020.14 639.17 3787.03 639.17 3723.54 572.13 3620.55 471.17 3544.69 396.65 3307.1 163.63 3307.08 639.17 3140.8 639.17 3140.57 .65 3369.89 .65 3507.96 135.08 3591.43 216.8 3670.23 294.11 3774.77 396.56 3850.97 471.05 3853.7 469.31 3853.69 1.5 4020.14 1.47 4020.14 639.17"/>
            <polygon points="880.97 638.32 715.06 638.32 715.04 427.68 165.71 427.69 165.71 638.32 0 638.32 .01 1.96 165.71 1.88 165.71 261.98 715.04 261.98 715.05 1.89 880.95 1.97 880.97 638.32"/>
            <path d="M3064.68.65l-.02,638.52h-329L2085.15.09l237.1-.09,137.2,135.3,114.85,113.38,132.98,131.05,117.05,115.5,71.57,70.36c-.19.68,1.22-1.02,2.28-2.57l-.02-562.37h166.52Z"/>
            <path d="M1625.19,560.05l-499.68-486.47-.21,564.74h-167.22l-.15-377.23-.21-259.9,319.91.27s658.4,638.47,655.7,637.71h-230.37l-77.76-79.12Z"/>
            <polygon points="2320.39 559.87 2247.92 488.97 2175.04 417.79 2101.43 345.84 2030.1 276.11 1961.01 208.61 1887.47 136.63 1822.32 73.24 1821.02 420.83 1733.97 336.34 1655.56 260 1655.49 1.45 1985.17 1.47 2033.84 49 2099.72 113.71 2181.57 193.87 2258.16 268.85 2327.9 337.24 2424.84 432.29 2501.54 507.38 2636.18 639.17 2401.73 639.17 2320.39 559.87"/>
          </svg>
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '0.5em', paddingLeft: '0.5em', opacity: 0.9 }}>HOMES</span>
        </div>

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: '7%', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
          <button onClick={() => setShowNew(true)}
            style={{ padding: '13px 32px', borderRadius: 14, border: '1px solid rgba(220,232,244,0.28)', background: 'linear-gradient(180deg, rgba(150,172,196,0.24), rgba(120,146,172,0.10))', backdropFilter: 'blur(14px) saturate(1.2)', WebkitBackdropFilter: 'blur(14px) saturate(1.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30), 0 12px 34px rgba(0,0,0,0.4)', cursor: 'pointer' }}>
            <span style={{ color: '#fff', fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 600 }}>+ New Project</span>
          </button>
        </div>
      </div>

      <div className="chrome-line" style={{ height: 2, flexShrink: 0 }} />

      {/* ── Board ── */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Column header — brand dropdown + count + menu, mirroring the main list */}
        <div style={{ position: 'relative', zIndex: 60, flexShrink: 0, padding: '15px 28px 13px 10mm', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            {/* Builders can't switch to the 7EVEN studio — the dropdown is a static label. */}
            <button onClick={restricted ? undefined : () => setBrandMenu(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: restricted ? 'default' : 'pointer', padding: 0 }}>
              <span style={{ fontFamily: "Optima,'Gill Sans',serif", fontWeight: 800, letterSpacing: '0.1em', fontSize: 15, color: '#EDEFF1' }}>HAAVN HOMES</span>
              {!restricted && <span className="jet-chrome-text" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>▾</span>}
            </button>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.82)', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: mono, marginLeft: 4, fontWeight: 700 }}>{list.length} home{list.length !== 1 ? 's' : ''}</span>
            {!restricted && brandMenu && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 300, background: 'rgba(24,34,48,0.66)', backdropFilter: 'blur(24px) saturate(1.25)', WebkitBackdropFilter: 'blur(24px) saturate(1.25)', border: '1px solid rgba(220,232,244,0.20)', borderRadius: 12, overflow: 'hidden', minWidth: 200, boxShadow: '0 14px 34px rgba(0,0,0,0.5)' }}>
                {[['7even', '7EVEN'], ['haavn', 'HAAVN MANAGEMENT']].map(([id, lbl]) => (
                  <button key={id} onClick={() => { setBrandMenu(false); onBack() }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '11px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #141414', cursor: 'pointer' }}>
                    <span className="chrome-silver-text" style={{ fontSize: 11, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{lbl}</span>
                  </button>
                ))}
                <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'default' }}>
                  <span className="chrome-silver-text" style={{ fontSize: 11, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700, letterSpacing: '0.1em' }}>HAAVN HOMES</span>
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: '#C4973A' }}>✓</span>
                </button>
              </div>
            )}
          </div>
          <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontFamily: mono }}>Black Series · Feasibility Studio</span>
        </div>

        {/* Rows */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {list.map((p, i) => {
            const near = false
            return (
              <div key={p.id} onClick={() => setOpenId(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 28px 18px 10mm', borderBottom: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                <span style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.4)', width: 22, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                {/* Name + address styled to match the main app's project rows —
                    clean sans, not the heavy Optima serif. */}
                <div style={{ width: 300, flexShrink: 0, minWidth: 0 }}>
                  <div style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', marginBottom: 2, textShadow: '0 0 8px rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ color: '#FFFFFF', fontSize: 9, letterSpacing: '0.08em', textShadow: '0 0 6px rgba(255,255,255,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address || '—'}</div>
                </div>
                {/* LIVE pill */}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid rgba(61,170,106,0.4)', borderRadius: 999, padding: '4px 11px', flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3DAA6A' }} />
                  <span style={{ fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8fe0b0', fontWeight: 700, fontFamily: mono }}>Live</span>
                </span>
                <HomeClock handover={p.handover} />
                <span style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>{p.handover ? handoverLabel(p.handover) : '—'}</span>
                {p.external
                  ? <span style={{ fontSize: 7.5, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: '#d5b26a', border: '1px solid rgba(213,178,106,0.4)', borderRadius: 999, padding: '4px 10px', flexShrink: 0, fontFamily: mono }}>External</span>
                  : <span style={{ fontSize: 7.5, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: '#7fd0a3', border: '1px solid rgba(127,208,163,0.35)', borderRadius: 999, padding: '4px 10px', flexShrink: 0, fontFamily: mono }}>HAAVN</span>}
                {!SEED.some(s => s.id === p.id) && (
                  <button onClick={e => { e.stopPropagation(); remove(p.id) }} title="Remove"
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 15, flexShrink: 0 }}>×</button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* New project modal — mirrors the studio's create dialog */}
      {showNew && (
        <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(rgba(5,7,10,0.55), rgba(5,7,10,0.68)), url(/renders/tower-hero.jpg) center / cover no-repeat, #05070a' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(480px, calc(100vw - 28px))', padding: 38, background: 'rgba(44,60,78,0.52)', backdropFilter: 'blur(30px) saturate(1.25)', WebkitBackdropFilter: 'blur(30px) saturate(1.25)', border: '1px solid rgba(220,232,244,0.22)', borderRadius: 20, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 30px 70px -20px rgba(0,0,0,0.7)' }}>
            <div style={{ height: 2, borderRadius: 2, marginBottom: 28, background: 'linear-gradient(to right, transparent, #C6CDCF 30%, #EEF1F2 50%, #9AA2A4 72%, transparent)' }} />
            <p style={{ color: '#E8C87A', fontSize: 9, letterSpacing: '0.30em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>New Home</p>
            <h2 style={{ fontWeight: 300, color: '#EEF1F2', fontSize: 22, letterSpacing: '0.08em', margin: '0 0 24px' }}>Create Project</h2>
            {[['Home / project name', name, setName, 'e.g. SOLUM', 'text'],
              ['Address', address, setAddress, 'Suburb, State, Postcode', 'text'],
              ['Programme start', start, setStart, '', 'month'],
              ['Target handover', handover, setHandover, '', 'month']].map(([lbl, val, set, ph, type]) => (
              <div key={lbl as string} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#AEB6B8', fontWeight: 700, marginBottom: 7 }}>{lbl as string}</label>
                <input type={type as string} value={val as string} placeholder={ph as string} onChange={e => (set as (v: string) => void)(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(220,232,244,0.22)', borderRadius: 9, color: '#EEF1F2', fontSize: 13, padding: '11px 13px', outline: 'none' }} />
              </div>
            ))}
            <button onClick={addProject} style={{ marginTop: 10, width: '100%', padding: '13px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, color: '#0c0d0f', background: 'linear-gradient(180deg,#e7ebef,#c3ccd3)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Create Project</button>
          </div>
        </div>
      )}

      {/* Same footer as the main ATRIUM app — brand, VISIT US links + copyright,
          Log Out bottom-left, P7 mark bottom-right. */}
      <SiteLinks tone="glass" />
      <button onClick={restricted ? onLogout : onBack} className="glass-btn glass-btn-grey"
        style={{ position: 'fixed', bottom: 18, left: 20, zIndex: 320, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 16px' }}>{restricted ? 'Log Out' : '← Home'}</button>
      <Project7Mark />
    </div>
  )
}

function handoverLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  return new Date(y, m - 1, 1).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
}
