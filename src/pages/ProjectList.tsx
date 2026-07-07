import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useStore } from '../store'
import { Wordmark, Project7Mark } from '../components/ui'
import { seedProjectsIfEmpty } from '../db/seed'
import { getCashflow } from '../db'
import SiteLinks from '../components/SiteLinks'
import CapitalPortal from './capital/CapitalPortal'
import type { PillarId } from './capital/CapitalBase'
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
  const [capitalOpen, setCapitalOpen] = useState(false)
  const [capitalStart, setCapitalStart] = useState<PillarId | undefined>(undefined)
  const [newBrand, setNewBrand] = useState<'7even' | 'haavn'>('7even')
  // Director view — the 7EVEN logo flips the admin column between 7EVEN and HAAVN
  // Management. Persisted so it survives a trip into the Dashboard and back.
  const [adminBrand, setAdminBrand] = useState<'7even' | 'haavn'>(
    () => (localStorage.getItem('7even_admin_brand') as '7even' | 'haavn') || '7even',
  )
  const chooseBrand = (b: '7even' | 'haavn') => { setAdminBrand(b); localStorage.setItem('7even_admin_brand', b) }
  const [brandMenu, setBrandMenu] = useState(false)
  const [archiveMenu, setArchiveMenu] = useState(false)
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

  // Archived projects drop off the live board (restored via the Archive dropdown).
  // We use the persisted `status` field ('archived') so it survives cloud sync.
  const live = projects.filter(p => p.status !== 'archived')
  const archivedProjects = projects.filter(p => p.status === 'archived')
  // 7EVEN side = 7even + joint projects (what the master/admin manages).
  const sevenProjects = live.filter(p => !p.brand || p.brand === '7even' || p.brand === 'both')
  // HAAVN Management manages EVERYTHING — every 7even project is mirrored here
  // for the management company plus any HAAVN-only projects.
  const haavnProjects = live
  function setArchived(p: any, archived: boolean) {
    updateProject({ ...p, status: archived ? 'archived' : 'active', updatedAt: new Date().toISOString() })
  }

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
          title="7EVEN Capital — Capital Base"
          onClick={() => setCapitalOpen(true)}
          style={{ position: 'absolute', top: isMobile ? 12 : 22, left: isMobile ? 14 : 40, zIndex: 20, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', opacity: 0.85, transition: 'opacity 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
        >
          <img src="/winged-device-white.png" alt="7EVEN" draggable={false} style={{ width: isMobile ? 48 : 88, height: 'auto', display: 'block' }} />
          <span style={{ display: 'block', textAlign: 'center', marginTop: isMobile ? 2 : 5, color: 'rgba(255,255,255,0.85)', fontSize: isMobile ? 6 : 8, letterSpacing: '0.42em', textTransform: 'uppercase', fontWeight: 400, paddingLeft: '0.42em' }}>
            Capital
          </span>
        </button>
        <button onClick={() => onLogout?.()} className="no-drag glass-btn glass-btn-grey"
          style={{ position: 'fixed', bottom: isMobile ? 12 : 18, left: isMobile ? 14 : 20, zIndex: 30, fontSize: isMobile ? 8 : 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: isMobile ? '5px 12px' : '7px 16px' }}>
          Log Out
        </button>

        {/* HAAVN Management — staff entry to the Partner CRM (War Room).
            The device IS the button, clean to its edges, mirroring the wings
            top-left — no plate. */}
        <button
          className="no-drag hm-shimmer"
          title="HAAVN Management — Partner CRM"
          onClick={() => { setCapitalStart('crm'); setCapitalOpen(true) }}
          style={{ position: 'absolute', top: isMobile ? 16 : 30, right: isMobile ? 16 : 44, zIndex: 20, background: 'transparent', border: 'none', padding: isMobile ? '4px 6px' : '6px 10px', cursor: 'pointer', opacity: 0.9, transition: 'opacity 0.2s', lineHeight: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
        >
          <img src="/hm-device-white.png" alt="HAAVN Management" draggable={false} style={{ height: isMobile ? 16 : 22, width: 'auto', display: 'block' }} />
        </button>

        {/* Title — high in the treeline above the house; dropped clear of the wings on mobile */}
        <div style={{ position: 'absolute', top: isMobile ? '30%' : '3%', left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 16px', zIndex: 10 }}>
          <p style={{ color: 'white', fontSize: isMobile ? 9 : 11, letterSpacing: isMobile ? '0.28em' : '0.38em', textTransform: 'uppercase', fontWeight: 500, textAlign: 'center' }}>Development Feasibility Studio</p>
        </div>

        {/* Wordmark — centred so the V lands on the house central column (nudged up 2mm) */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, transform: 'translateY(-8px)' }}>
          <Wordmark size="hero" />
        </div>

        {/* + New Project — low, between the house base and the gold divider */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: '7%', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
          <button onClick={() => openNew('7even')} className="no-drag glass-btn"
            style={{ padding: '10px 30px' }}>
            <span style={{ color: 'rgba(255,255,255,0.90)', fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 500 }}>+ New Project</span>
          </button>
        </div>
      </div>

      {/* ── Black-chrome shining divider ── */}
      <div className="chrome-line" style={{ height: 2, flexShrink: 0 }} />

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

        {/* LEFT — director column · 7EVEN logo flips between 7EVEN and HAAVN Management */}
        {role === 'admin' && (() => {
          const is7 = adminBrand === '7even'
          const list = is7 ? sevenProjects : haavnProjects
          const accent = is7 ? '#C4973A' : 'rgba(255,255,255,0.75)'
          return (
        <div style={{ flex: isNarrow ? 'none' : 1, display: 'flex', flexDirection: 'column', overflow: isNarrow ? 'visible' : 'hidden', borderBottom: isNarrow ? '1px solid #111' : 'none' }}>
          {/* Column header — frosted soft-grey glass bar that bleeds into the surrounds */}
          <div style={{ flexShrink: 0, padding: '15px 28px 13px', background: 'linear-gradient(rgba(228,226,222,0.16), rgba(210,208,204,0.08))', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderTop: '1px solid rgba(255,255,255,0.10)', borderBottom: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
              {/* 7EVEN / HAAVN MANAGEMENT — black-chrome brand · acts as a view dropdown */}
              <button onClick={() => setBrandMenu(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <span className="chrome-black-text" style={{ fontSize: 21, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 800, letterSpacing: is7 ? '0.14em' : '0.14em', whiteSpace: 'nowrap' }}>{is7 ? '7EVEN' : 'HAAVN MANAGEMENT'}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>▾</span>
              </button>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.82)', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace', marginLeft: 4, fontWeight: 700 }}>
                {list.length} project{list.length !== 1 ? 's' : ''}
              </span>
              {brandMenu && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 300, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, overflow: 'hidden', minWidth: 190, boxShadow: '0 14px 34px rgba(0,0,0,0.7)' }}>
                  {([['7even', '7EVEN'], ['haavn', 'HAAVN MANAGEMENT']] as const).map(([id, lbl]) => (
                    <button key={id} onClick={() => { chooseBrand(id); setBrandMenu(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '11px 14px', background: adminBrand === id ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderBottom: '1px solid #141414', cursor: 'pointer' }}>
                      <span className="chrome-black-text" style={{ fontSize: 11, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{lbl}</span>
                      {adminBrand === id && <span style={{ marginLeft: 'auto', fontSize: 9, color: '#C4973A' }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
              {/* Archive dropdown — parked projects, restore to Live */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setArchiveMenu(v => !v)} className="glass-btn glass-btn-grey"
                  style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ▤ Archive{archivedProjects.length > 0 ? ` · ${archivedProjects.length}` : ''} <span style={{ opacity: 0.6 }}>▾</span>
                </button>
                {archiveMenu && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 300, background: 'rgba(10,10,10,0.93)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, overflow: 'hidden', minWidth: 260, boxShadow: '0 14px 34px rgba(0,0,0,0.7)' }}>
                    <div style={{ padding: '9px 14px 7px', borderBottom: '1px solid #1A1A1A' }}>
                      <span style={{ fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#777' }}>Archived Projects</span>
                    </div>
                    {archivedProjects.length === 0 ? (
                      <div style={{ padding: '14px', fontSize: 11, color: '#666' }}>No archived projects.</div>
                    ) : archivedProjects.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #141414' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 11, color: '#D0CCC6', margin: 0 }} className="truncate">{p.name}</p>
                          <p style={{ fontSize: 8, color: '#555', margin: 0, letterSpacing: '0.06em' }} className="truncate">{p.address || '—'}</p>
                        </div>
                        <button onClick={() => { setArchived(p, false); setArchiveMenu(false) }} className="glass-btn glass-btn-green"
                          style={{ fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, padding: '6px 12px', flexShrink: 0 }}>
                          ↺ Live
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Dashboard — clear glass, crisp white writing */}
              <button onClick={() => onDashboard?.(adminBrand)} className="glass-btn"
                style={{ padding: '10px 0', width: 156, textAlign: 'center', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 800, color: '#FFFFFF' }}>
                ▦ Dashboard
              </button>
            </div>
          </div>

          {/* Project list — follows the selected brand */}
          <div style={{ flex: isNarrow ? 'none' : 1, overflowY: isNarrow ? 'visible' : 'auto' }}>
            {list.length === 0 ? (
              <EmptyState brand={adminBrand} onNew={() => openNew(adminBrand)} />
            ) : (
              list.map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i + 1} onClick={() => setActiveProject(p.id)} onUpdate={updateProject} accentColor={accent} />
              ))
            )}
          </div>
        </div>
          )
        })()}

        {/* RIGHT — HAAVN MANAGEMENT · consultants / PMs (and admin sees 7EVEN side) */}
        {role === 'external' && (
        <div style={{ flex: isNarrow ? 'none' : 1, display: 'flex', flexDirection: 'column', overflow: isNarrow ? 'visible' : 'hidden' }}>
          {/* Column header */}
          <div style={{ flexShrink: 0, padding: '14px 28px 12px', background: 'rgba(5,5,5,0.5)', backdropFilter: 'blur(2px)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 2, height: 18, background: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }}>HAAVN MANAGEMENT</span>
              <span style={{ fontSize: 8, color: '#2A2A2A', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace', marginLeft: 4 }}>
                {haavnProjects.length} project{haavnProjects.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* HAAVN dashboard is available to consultants too (not just admin) */}
              <>
                <button onClick={() => onDashboard?.('haavn')}
                  style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.20)', background: 'transparent', border: 'none', padding: '5px 4px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.20)' }}>
                  ▦ Dashboard
                </button>
                <div style={{ width: 1, height: 10, background: '#1C1C1C' }} />
              </>
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
        )}
      </div>
      </div>

      <SiteLinks />
      <Project7Mark />

      {/* Director portal teaser — shown until the portal is built */}
      {capitalOpen && <CapitalPortal initialPillar={capitalStart} onClose={() => { setCapitalOpen(false); setCapitalStart(undefined) }} />}

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

// Mini stealth countdown — ticks down to the project's feasibility completion
// (programme start + duration months, from the cashflow model).
function CountdownClock({ projectId }: { projectId: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const target = useMemo(() => {
    try {
      const cf = getCashflow(projectId)
      if (cf?.startDate && cf?.months) {
        const [y, m] = cf.startDate.split('-').map(Number)
        if (y && m) return new Date(y, (m - 1) + cf.months, 1).getTime()
      }
    } catch { /* no cashflow yet */ }
    return null
  }, [projectId])

  const W = 150
  const ML = 38   // ~1cm further right of the Live button
  if (!target) return <div style={{ width: W, marginLeft: ML, flexShrink: 0 }} />

  const diff = target - now
  if (diff <= 0) {
    return (
      <div style={{ width: W, marginLeft: ML, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3DAA6A', flexShrink: 0 }} />
        <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.16em', color: '#3DAA6A', fontWeight: 700 }}>COMPLETE</span>
      </div>
    )
  }
  const d = Math.floor(diff / 86400000)
  const months = Math.floor(d / 30.44)
  const days = d - Math.round(months * 30.44)
  const hh = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0')
  const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0')
  const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')
  // Amber when inside the final 3 months, otherwise a cool stealth silver.
  const near = months < 3
  return (
    <div title="Live countdown to feasibility completion"
      style={{ width: W, marginLeft: ML, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ position: 'relative', width: 6, height: 6, flexShrink: 0 }}>
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: near ? '#F0B860' : '#FFFFFF', animation: 'ping 1.6s cubic-bezier(0,0,0.2,1) infinite', opacity: 0.55 }} />
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: near ? '#F0B860' : '#FFFFFF' }} />
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', color: near ? '#FFD9A0' : '#FFFFFF' }}>
          {months}<span style={{ fontSize: 8, opacity: 0.75 }}>M</span> {days}<span style={{ fontSize: 8, opacity: 0.75 }}>D</span>
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
          {hh}:{mm}:{ss}
        </span>
      </div>
    </div>
  )
}

function ProjectCard({ project, index, onClick, onUpdate, accentColor }: {
  project: any; index: number; onClick: () => void; onUpdate: (p: any) => void; accentColor: string
}) {
  const [dropOpen, setDropOpen] = useState(false)
  const [lifeOpen, setLifeOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const lifeRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (!lifeOpen) return
    function handle(e: MouseEvent) {
      if (lifeRef.current && !lifeRef.current.contains(e.target as Node)) setLifeOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [lifeOpen])

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

      <span style={{ color: '#555', fontSize: 10, fontFamily: 'monospace', flexShrink: 0, width: 20 }}>
        {String(index).padStart(2, '0')}
      </span>
      <StatusDot type={project.type} status={project.status} size={7} />

      {/* Fixed-width name column so every Live button lines up down the board */}
      <div style={{ width: 300, flexShrink: 0, minWidth: 0 }}>
        <p style={{ color: '#D0CCC6', fontSize: 12, fontWeight: 300, letterSpacing: '0.05em', marginBottom: 2, transition: 'color 0.18s' }}
          className="group-hover:text-white truncate">
          {project.name}
        </p>
        <p style={{ color: '#5A5A5A', fontSize: 9, letterSpacing: '0.08em' }} className="truncate">
          {project.address || '—'}
        </p>
      </div>

      {/* Live / Archive — parks the project off the board or keeps it live */}
      <div ref={lifeRef} style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <button onClick={e => { e.stopPropagation(); setLifeOpen(v => !v) }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 6, padding: '4px 9px', cursor: 'pointer' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3DAA6A', flexShrink: 0 }} />
          <span style={{ fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>Live</span>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)' }}>▾</span>
        </button>
        {lifeOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, overflow: 'hidden', minWidth: 130, boxShadow: '0 12px 30px rgba(0,0,0,0.65)' }}>
            <button onClick={e => { e.stopPropagation(); setLifeOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '9px 12px', background: 'rgba(61,170,106,0.10)', border: 'none', borderBottom: '1px solid #141414', cursor: 'pointer' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3DAA6A' }} />
              <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3DAA6A', fontWeight: 700 }}>Live</span>
            </button>
            <button onClick={e => { e.stopPropagation(); onUpdate({ ...project, status: 'archived', updatedAt: new Date().toISOString() }); setLifeOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '9px 12px', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ fontSize: 9, color: '#999' }}>▤</span>
              <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#AAA', fontWeight: 700 }}>Archive</span>
            </button>
          </div>
        )}
      </div>

      {/* Live stealth countdown to feasibility completion */}
      <CountdownClock projectId={project.id} />

      <div style={{ flex: 1 }} />

      {/* Updated date — crisp white so it's clearly legible */}
      <span className="pcard-date" style={{ color: 'rgba(255,255,255,0.9)', fontSize: 9, letterSpacing: '0.06em', flexShrink: 0, fontWeight: 600 }}>{updated}</span>

      {/* Type / status chip — clear glass, flush right under the Dashboard button */}
      <div ref={dropRef} style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <button onClick={e => { e.stopPropagation(); setDropOpen(v => !v) }}
          className={`glass-chip ${dropOpen ? 'glass-chip-open' : ''}`}
          style={{ '--chip': 'rgba(255,255,255,0.34)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: 150, padding: '9px 0' } as React.CSSProperties}>
          <span style={{ fontSize: 9, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>{label}</span>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.95)', opacity: 0.8 }}>▾</span>
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
    </div>
  )
}
