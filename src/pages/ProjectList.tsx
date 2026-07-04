import React, { useEffect, useState, useRef } from 'react'
import { useStore } from '../store'
import { Wordmark, Project7Mark } from '../components/ui'
import { seedProjectsIfEmpty } from '../db/seed'
import SiteLinks from '../components/SiteLinks'
import PortalComingSoon from '../components/PortalComingSoon'
import { useRole } from '../lib/role'

function useAddressSearch(query: string) {
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    if (query.length < 4) { setResults([]); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=au&limit=6&q=${encodeURIComponent(query)}`
        const res = await fetch(url, { headers: { 'Accept-Language': 'en-AU' } })
        const data = await res.json()
        setResults(data.map((r: any) => r.display_name as string))
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 350)
    return () => clearTimeout(timer.current)
  }, [query])
  return { results, loading }
}

// Below this width the 7EVEN/HAAVN columns stack vertically instead of sitting side by side
function useIsNarrow(query = '(max-width: 1024px)') {
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return narrow
}

export default function ProjectList({ onLogout, onDashboard }: { onLogout?: () => void; onDashboard?: (brand: '7even' | 'haavn') => void }) {
  const { projects, loadProjects, createProject, setActiveProject, updateProject } = useStore()
  const role = useRole()
  const isNarrow = useIsNarrow()
  const isMobile = useIsNarrow('(max-width: 640px)')
  const [showNew, setShowNew] = useState(false)
  const [portalOpen, setPortalOpen] = useState(false)
  const [newBrand, setNewBrand] = useState<'7even' | 'haavn'>('7even')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const { results, loading } = useAddressSearch(address)
  const addressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (addressRef.current && !addressRef.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => { seedProjectsIfEmpty(); loadProjects() }, [])

  function handleCreate() {
    if (!name.trim()) return
    const p = createProject(name.trim(), address.trim(), newBrand)
    setName(''); setAddress(''); setShowNew(false)
    setActiveProject(p.id)
  }

  function openNew(brand: '7even' | 'haavn') {
    setNewBrand(brand)
    setShowNew(true)
  }

  const sevenProjects = projects.filter(p => !p.brand || p.brand === '7even')
  const haavnProjects = projects.filter(p => p.brand === 'haavn')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#080808', overflow: 'hidden' }}>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', height: 'clamp(260px, 52vh, 62vh)', flexShrink: 0 }}>
        {/* Render zoomed + panned so the house central column sits under the page-centred V — alignment locked.
            5s reveal fades it up from dark into full-bleed colour on entry, then holds. */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/renders/haavn-render2.png)', backgroundSize: '122%', backgroundPosition: '54.15% 56%', backgroundRepeat: 'no-repeat', pointerEvents: 'none', animation: 'hero-reveal 6s cubic-bezier(0.4, 0, 0.2, 1) both' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.06) 40%, rgba(0,0,0,0.06) 60%, rgba(0,0,0,0.85) 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.28) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.28) 100%)', pointerEvents: 'none' }} />

        {/* Top bar — drag region for the frameless window */}
        <div className="drag-region" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56, zIndex: 10 }} />

        {/* Winged device — future investor portal entry (compact on mobile) */}
        <button
          className="no-drag"
          title="Director Portal — coming soon"
          onClick={() => setPortalOpen(true)}
          style={{ position: 'absolute', top: isMobile ? 12 : 22, left: isMobile ? 14 : 40, zIndex: 20, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', opacity: 0.85, transition: 'opacity 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
        >
          <img src="/winged-device-white.png" alt="7EVEN" draggable={false} style={{ width: isMobile ? 48 : 88, height: 'auto', display: 'block' }} />
          <span style={{ display: 'block', textAlign: 'center', marginTop: isMobile ? 2 : 5, color: 'rgba(255,255,255,0.85)', fontSize: isMobile ? 6 : 8, letterSpacing: '0.42em', textTransform: 'uppercase', fontWeight: 400, paddingLeft: '0.42em' }}>
            Capital
          </span>
        </button>
        <button onClick={() => onLogout?.()} className="no-drag glass-btn glass-btn-red"
          style={isMobile
            ? { position: 'fixed', top: 12, right: 12, zIndex: 30, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '5px 12px' }
            : { position: 'fixed', bottom: 18, left: 20, zIndex: 30, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', padding: '7px 16px' }}>
          Log Out
        </button>

        {/* Title — high in the treeline on desktop; dropped clear of the wings on mobile */}
        <div style={{ position: 'absolute', top: isMobile ? '32%' : '12%', left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 16px', zIndex: 10 }}>
          <p style={{ color: 'white', fontSize: isMobile ? 9 : 11, letterSpacing: isMobile ? '0.28em' : '0.38em', textTransform: 'uppercase', fontWeight: 500, textAlign: 'center' }}>Development Feasibility Studio</p>
        </div>

        {/* Wordmark — centred so the V lands on the house central column */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <Wordmark size="hero" />
        </div>

        {/* + New Project — low, between the house base and the gold divider */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: '8%', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
          <button onClick={() => openNew('7even')} className="no-drag glass-btn"
            style={{ padding: '14px 48px' }}>
            <span style={{ color: 'rgba(255,255,255,0.90)', fontSize: 11, letterSpacing: '0.30em', textTransform: 'uppercase', fontWeight: 500 }}>+ New Project</span>
          </button>
        </div>
      </div>

      {/* ── Gold divider ── */}
      <div style={{ height: 1, background: 'linear-gradient(to right, transparent, #C4973A 30%, #C4973A 70%, transparent)', flexShrink: 0 }} />

      {/* ── Lower half — shimmering particle backdrop behind the project panels ── */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/home-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.6, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,8,8,0.92), rgba(8,8,8,0.42) 38%, rgba(8,8,8,0.55) 70%, rgba(8,8,8,0.85))', pointerEvents: 'none' }} />

      {/* ── Sub-header ── */}
      <div style={{ position: 'relative', flexShrink: 0, padding: '10px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.30em', textTransform: 'uppercase', color: '#383838', fontWeight: 600 }}>
            {projects.length} {projects.length !== 1 ? 'Projects' : 'Project'}
          </span>
        </div>
        <div className="hero-legend" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <TypeLegend color="#A855F7" label="Hotel" />
          <TypeLegend color="#22C55E" label="BTR" />
          <TypeLegend color="#3B82F6" label="BTS" />
          <TypeLegend color="#EAB308" label="Pending" pulse />
          <TypeLegend color="#EF4444" label="On Hold" pulse />
        </div>
      </div>

      {/* ── Split columns — stacked below 1024px, side by side above ── */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: isNarrow ? 'column' : 'row', overflow: 'hidden', overflowY: isNarrow ? 'auto' : 'hidden', minHeight: 0 }}>

        {/* LEFT — 7EVEN */}
        <div style={{ flex: isNarrow ? 'none' : 1, display: 'flex', flexDirection: 'column', overflow: isNarrow ? 'visible' : 'hidden', borderRight: isNarrow ? 'none' : '1px solid #111', borderBottom: isNarrow ? '1px solid #111' : 'none' }}>
          {/* Column header */}
          <div style={{ flexShrink: 0, padding: '14px 28px 12px', background: 'rgba(6,6,6,0.55)', backdropFilter: 'blur(2px)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 2, height: 18, background: '#C4973A', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700, letterSpacing: '0.12em', color: '#C4973A' }}>7EVEN</span>
              <span style={{ fontSize: 8, color: '#333', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace', marginLeft: 4 }}>
                {sevenProjects.length} project{sevenProjects.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {role === 'admin' && <>
                <button onClick={() => onDashboard?.('7even')}
                  style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C4973A66', background: 'transparent', border: 'none', padding: '5px 4px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#C4973A' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#C4973A66' }}>
                  ▦ Dashboard
                </button>
                <div style={{ width: 1, height: 10, background: '#1C1C1C' }} />
              </>}
              <button onClick={() => openNew('7even')} className="glass-btn glass-btn-gold"
                style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '6px 16px' }}>
                + New
              </button>
            </div>
          </div>

          {/* 7EVEN project list */}
          <div style={{ flex: isNarrow ? 'none' : 1, overflowY: isNarrow ? 'visible' : 'auto' }}>
            {sevenProjects.length === 0 ? (
              <EmptyState brand="7even" onNew={() => openNew('7even')} />
            ) : (
              sevenProjects.map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i + 1} onClick={() => setActiveProject(p.id)} onUpdate={updateProject} accentColor="#C4973A" />
              ))
            )}
          </div>
        </div>

        {/* RIGHT — HAAVN */}
        <div style={{ flex: isNarrow ? 'none' : 1, display: 'flex', flexDirection: 'column', overflow: isNarrow ? 'visible' : 'hidden' }}>
          {/* Column header */}
          <div style={{ flexShrink: 0, padding: '14px 28px 12px', background: 'rgba(5,5,5,0.5)', backdropFilter: 'blur(2px)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 2, height: 18, background: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.75)' }}>HAAVN</span>
              <span style={{ fontSize: 8, color: '#2A2A2A', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace', marginLeft: 4 }}>
                {haavnProjects.length} project{haavnProjects.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {role === 'admin' && <>
                <button onClick={() => onDashboard?.('haavn')}
                  style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.20)', background: 'transparent', border: 'none', padding: '5px 4px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.20)' }}>
                  ▦ Dashboard
                </button>
                <div style={{ width: 1, height: 10, background: '#1C1C1C' }} />
              </>}
              <button onClick={() => openNew('haavn')} className="glass-btn"
                style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '6px 16px', color: 'rgba(255,255,255,0.8)' }}>
                + New
              </button>
            </div>
          </div>

          {/* HAAVN project list */}
          <div style={{ flex: isNarrow ? 'none' : 1, overflowY: isNarrow ? 'visible' : 'auto' }}>
            {haavnProjects.length === 0 ? (
              <EmptyState brand="haavn" onNew={() => openNew('haavn')} />
            ) : (
              haavnProjects.map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i + 1} onClick={() => setActiveProject(p.id)} onUpdate={updateProject} accentColor="rgba(255,255,255,0.55)" />
              ))
            )}
          </div>
        </div>
      </div>
      </div>

      <SiteLinks />
      <Project7Mark />

      {/* Director portal teaser — shown until the portal is built */}
      {portalOpen && <PortalComingSoon onClose={() => setPortalOpen(false)} />}

      {/* ── New project modal ── */}
      {showNew && (
        <div onClick={() => setShowNew(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(rgba(3,3,3,0.66), rgba(3,3,3,0.74)), url(/home-bg.jpg) center / cover no-repeat, #030303',
          }}>
          <div onClick={e => e.stopPropagation()} className="no-drag"
            style={{
              width: 480, padding: '40px',
              background: 'rgba(8,8,8,0.40)',
              border: '1px solid rgba(255,255,255,0.16)', borderRadius: 18, overflow: 'hidden',
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 24px 60px rgba(0,0,0,0.55)',
            }}>

            {/* Coloured top bar — gold for 7EVEN, white for HAAVN */}
            <div style={{ height: 2, background: newBrand === '7even' ? 'linear-gradient(to right, #C4973A, #E8B84B)' : 'linear-gradient(to right, rgba(255,255,255,0.50), rgba(255,255,255,0.80))', marginBottom: 32 }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
              <div>
                <p style={{ color: newBrand === '7even' ? '#C4973A' : 'rgba(255,255,255,0.45)', fontSize: 9, letterSpacing: '0.30em', textTransform: 'uppercase', marginBottom: 8 }}>
                  New Development
                </p>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 300, color: '#fff', fontSize: 22, letterSpacing: '0.08em', margin: 0 }}>Create Project</h2>
              </div>
              <button onClick={() => setShowNew(false)} style={{ color: '#444', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', lineHeight: 1, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = '#444')}>✕</button>
            </div>

            {/* Brand toggle */}
            <div style={{ marginBottom: 28 }}>
              <p style={{ color: '#444', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 10 }}>Brand</p>
              <div style={{ display: 'flex', gap: 0, border: '1px solid #1E1E1E' }}>
                {(['7even', 'haavn'] as const).map(b => (
                  <button key={b} onClick={() => setNewBrand(b)}
                    style={{
                      flex: 1, padding: '11px 0', fontSize: 11, letterSpacing: '0.20em',
                      textTransform: 'uppercase', fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700,
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                      background: newBrand === b
                        ? (b === '7even' ? 'rgba(196,151,58,0.14)' : 'rgba(255,255,255,0.10)')
                        : 'transparent',
                      color: newBrand === b
                        ? (b === '7even' ? '#C4973A' : 'rgba(255,255,255,0.80)')
                        : '#333',
                      borderRight: b === '7even' ? '1px solid #1E1E1E' : 'none',
                    }}>
                    {b === '7even' ? '7EVEN' : 'HAAVN'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Project name */}
              <div>
                <label style={{ display: 'block', color: '#555', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 10 }}>Project Name *</label>
                <input autoFocus
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #2A2A2A', padding: '10px 0', color: '#fff', fontSize: 14, outline: 'none', letterSpacing: '0.04em' }}
                  placeholder="e.g. 225 Heaths Road Werribee"
                  value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()} />
              </div>

              {/* Address */}
              <div ref={addressRef} style={{ position: 'relative' }}>
                <label style={{ display: 'block', color: '#555', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 10 }}>Address</label>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #2A2A2A' }}>
                  <input
                    style={{ flex: 1, background: 'transparent', border: 'none', padding: '10px 0', color: '#fff', fontSize: 14, outline: 'none', letterSpacing: '0.04em' }}
                    placeholder="Start typing an address…"
                    value={address} onChange={e => { setAddress(e.target.value); setShowSuggestions(true) }}
                    onFocus={() => results.length > 0 && setShowSuggestions(true)}
                    autoComplete="off" />
                  {loading && <span style={{ color: '#444', fontSize: 10, flexShrink: 0 }}>···</span>}
                </div>
                {showSuggestions && results.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#0E0E0E', border: '1px solid #1E1E1E', maxHeight: 200, overflowY: 'auto' }}>
                    {results.map((r, i) => (
                      <button key={i} onMouseDown={e => { e.preventDefault(); setAddress(r.split(', ').slice(0, 4).join(', ')); setShowSuggestions(false) }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #161616', color: '#C0BDB8', fontSize: 12, cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1A1A1A')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {r.split(', ').slice(0, 4).join(', ')}
                        <span style={{ color: '#444', fontSize: 10, display: 'block', marginTop: 2 }}>{r.split(', ').slice(4, 7).join(', ')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #111' }}>
                <button onClick={() => setShowNew(false)} className="glass-btn"
                  style={{ padding: '10px 24px', color: '#999', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={!name.trim()}
                  className={`glass-btn ${!name.trim() ? 'glass-btn-disabled' : newBrand === '7even' ? 'glass-btn-gold' : ''}`}
                  style={{ padding: '10px 32px', fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ brand, onNew }: { brand: '7even' | 'haavn'; onNew: () => void }) {
  const is7even = brand === '7even'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', gap: 16, padding: '48px 24px', textAlign: 'center' }}>
      <p style={{ color: '#222', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', textAlign: 'center' }}>
        No {is7even ? '7EVEN' : 'HAAVN'} projects yet
      </p>
      <button onClick={onNew} className={`glass-btn ${is7even ? 'glass-btn-gold' : ''}`}
        style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '8px 20px', ...(is7even ? {} : { color: 'rgba(255,255,255,0.7)' }) }}>
        Create First Project
      </button>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeColor(type?: string, status?: string): { color: string; pulse: boolean; label: string } {
  if (status === 'on-hold') return { color: '#EF4444', pulse: true,  label: 'On Hold' }
  if (status === 'pending') return { color: '#EAB308', pulse: true,  label: 'Pending' }
  switch (type) {
    case 'hotel': return { color: '#A855F7', pulse: false, label: 'Hotel' }
    case 'btr':   return { color: '#22C55E', pulse: false, label: 'BTR'   }
    case 'bts':   return { color: '#3B82F6', pulse: false, label: 'BTS'   }
    case 'mixed': return { color: '#E8E6E1', pulse: false, label: 'Mixed' }
    default:      return { color: '#2A2A2A', pulse: false, label: 'Active' }
  }
}

function StatusDot({ type, status, size = 8 }: { type?: string; status?: string; size?: number }) {
  const { color, pulse } = typeColor(type, status)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {pulse && <span style={{ position: 'absolute', borderRadius: '50%', width: size + 6, height: size + 6, background: color, opacity: 0.25, animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite' }} />}
      <span style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'block', flexShrink: 0 }} />
    </span>
  )
}

function TypeLegend({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {pulse && <span style={{ position: 'absolute', borderRadius: '50%', width: 12, height: 12, background: color, opacity: 0.25, animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite' }} />}
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'block' }} />
      </span>
      <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#383838' }}>{label}</span>
    </span>
  )
}

const STATUS_OPTIONS = [
  { type: 'hotel',   status: 'active',  label: 'Hotel',   color: '#A855F7', pulse: false },
  { type: 'btr',     status: 'active',  label: 'BTR',     color: '#22C55E', pulse: false },
  { type: 'bts',     status: 'active',  label: 'BTS',     color: '#3B82F6', pulse: false },
  { type: 'mixed',   status: 'active',  label: 'Mixed',   color: '#E8E6E1', pulse: false },
  { type: undefined, status: 'pending', label: 'Pending', color: '#EAB308', pulse: true  },
  { type: undefined, status: 'on-hold', label: 'On Hold', color: '#EF4444', pulse: true  },
]

function ProjectCard({ project, index, onClick, onUpdate, accentColor }: {
  project: any; index: number; onClick: () => void; onUpdate: (p: any) => void; accentColor: string
}) {
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const updated = new Date(project.updatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  const { color, label } = typeColor(project.type, project.status)

  useEffect(() => {
    if (!dropOpen) return
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [dropOpen])

  function handleStatusChange(opt: typeof STATUS_OPTIONS[0], e: React.MouseEvent) {
    e.stopPropagation()
    onUpdate({ ...project, type: opt.type, status: opt.status, updatedAt: new Date().toISOString() })
    setDropOpen(false)
  }

  return (
    <div onClick={onClick} className="group cursor-pointer"
      style={{ borderBottom: '1px solid #0D0D0D', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 14, transition: 'background 0.18s', background: 'transparent' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0C0C0C'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>

      {/* Accent bar first — lines up with the 7EVEN/HAAVN header bar */}
      <div style={{ width: 2, height: 30, background: color, flexShrink: 0, opacity: 0.75 }} />
      <span style={{ color: '#222', fontSize: 10, fontFamily: 'monospace', flexShrink: 0, width: 20 }}>
        {String(index).padStart(2, '0')}
      </span>
      <StatusDot type={project.type} status={project.status} size={7} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#D0CCC6', fontSize: 12, fontWeight: 300, letterSpacing: '0.05em', marginBottom: 2, transition: 'color 0.18s' }}
          className="group-hover:text-white truncate">
          {project.name}
        </p>
        <p style={{ color: '#252525', fontSize: 9, letterSpacing: '0.08em' }} className="truncate">
          {project.address || '—'}
        </p>
      </div>

      {/* Type badge + dropdown */}
      <div ref={dropRef} style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <button onClick={e => { e.stopPropagation(); setDropOpen(v => !v) }}
          className={`glass-chip ${dropOpen ? 'glass-chip-open' : ''}`}
          style={{ '--chip': color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, width: 96, padding: '6px 0' } as React.CSSProperties}>
          <span style={{ fontSize: 8, letterSpacing: '0.20em', textTransform: 'uppercase', color, fontWeight: 700 }}>{label}</span>
          <span style={{ fontSize: 8, color, opacity: 0.6 }}>▾</span>
        </button>
        {dropOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200, background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, overflow: 'hidden', minWidth: 130, boxShadow: '0 12px 32px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.10)' }}>
            <div style={{ padding: '6px 10px 4px', borderBottom: '1px solid #1A1A1A' }}>
              <span style={{ fontSize: 7, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#444' }}>Set Status</span>
            </div>
            {STATUS_OPTIONS.map(opt => {
              const isActive = (opt.status === 'on-hold' || opt.status === 'pending')
                ? project.status === opt.status
                : project.type === opt.type && project.status !== 'on-hold' && project.status !== 'pending'
              return (
                <button key={opt.label} onClick={e => handleStatusChange(opt, e)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '9px 12px', background: isActive ? `${opt.color}14` : 'transparent', border: 'none', borderBottom: '1px solid #111', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${opt.color}1A`)}
                  onMouseLeave={e => (e.currentTarget.style.background = isActive ? `${opt.color}14` : 'transparent')}>
                  <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 10, height: 10, flexShrink: 0 }}>
                    {opt.pulse && <span style={{ position: 'absolute', borderRadius: '50%', width: 14, height: 14, background: opt.color, opacity: 0.22, animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite' }} />}
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: opt.color, display: 'block' }} />
                  </span>
                  <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: isActive ? opt.color : '#888', fontWeight: isActive ? 700 : 400 }}>{opt.label}</span>
                  {isActive && <span style={{ marginLeft: 'auto', fontSize: 8, color: opt.color }}>✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <span className="pcard-date" style={{ color: '#222', fontSize: 9, letterSpacing: '0.06em', flexShrink: 0 }}>{updated}</span>
      <span className="pcard-arrow group-hover:text-[#C4973A]" style={{ color: '#222', fontSize: 14, flexShrink: 0, transition: 'color 0.18s' }}>→</span>
    </div>
  )
}
