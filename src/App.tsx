import React, { useState, useEffect } from 'react'
import { useStore } from './store'
import { pullFromCloud, subscribeRealtime, setSeeding } from './db/cloud'
import { migrateCostStackLabels, seedBaseFinanceForAll } from './db'
import { seedProjectsIfEmpty, consolidatePreston, seedBaseCostStackForAll, migrateCatalogues } from './db/seed'
import ProjectList from './pages/ProjectList'
import ProjectWorkspace from './pages/ProjectWorkspace'
import Dashboard from './pages/Dashboard'
import PasswordGate, { isAuthenticated } from './pages/PasswordGate'
import IntroScreen from './pages/IntroScreen'
import ProjectManagePanel from './components/ProjectManagePanel'
import { RoleContext, getStoredRole, clearStoredRole, type Role } from './lib/role'

export default function App() {
  const { activeProjectId, projects, loadProjects } = useStore()
  const [authed, setAuthed] = useState(isAuthenticated())
  const [role, setRole] = useState<Role>(getStoredRole())
  const [showIntro, setShowIntro] = useState(false)
  const [dashboardBrand, setDashboardBrand] = useState<'7even' | 'haavn' | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  // JB Light (default) / JB BLK (dark-gold) — lifted here so the Manage screen can toggle it.
  const [theme, setThemeState] = useState<'light' | 'blk'>(() => (localStorage.getItem('jb_theme') as 'light' | 'blk') || 'light')
  const setTheme = (t: 'light' | 'blk') => { setThemeState(t); localStorage.setItem('jb_theme', t) }

  // Workspace zoom follows the window: full 1.4 design zoom on large monitors,
  // scaling down linearly to 1.0 at 1280px so laptops aren't stuck with monitor sizing.
  useEffect(() => {
    function applyZoom() {
      const w = window.innerWidth
      const z = Math.min(1.4, Math.max(1, 1 + 0.4 * (w - 1280) / 640))
      document.documentElement.style.setProperty('--ws-zoom', String(Math.round(z * 100) / 100))
    }
    applyZoom()
    window.addEventListener('resize', applyZoom)
    return () => window.removeEventListener('resize', applyZoom)
  }, [])

  // On mount: pull cloud data then subscribe to live changes
  useEffect(() => {
    setSyncing(true)
    // Run the seed/repair pipeline exactly once, whether the cloud pull succeeds,
    // fails, or is slow. A hung network must never strand the app in "syncing" or
    // skip the local seeds — the app stays usable off localStorage regardless.
    let ran = false
    const runSeeds = () => {
      if (ran) return
      ran = true
      // Seeds/migrations write ONLY to localStorage — never to the shared cloud.
      // setSeeding(true) suppresses every push while the baseline is rebuilt, so a
      // client loading with blank templates can't overwrite another user's real
      // cloud data. Only edits the user makes after this (seeding=false) push up.
      setSeeding(true)
      try {
        seedProjectsIfEmpty()
        migrateCostStackLabels()
        seedBaseCostStackForAll()
        seedBaseFinanceForAll()
        consolidatePreston()
        migrateCatalogues()
      } finally {
        setSeeding(false)
      }
      loadProjects()
      setSyncing(false)
    }
    // Whichever finishes first — the pull or a 6s safety timeout — runs the seeds.
    const timer = setTimeout(runSeeds, 6000)
    pullFromCloud().catch(() => false).then(() => { clearTimeout(timer); runSeeds() })
    const unsub = subscribeRealtime(() => {
      // A realtime event means another client persisted a change; the pull inside
      // subscribeRealtime already hydrated it into localStorage (respecting the
      // per-key edit guard, so it can't clobber this user's in-progress edits).
      // Just re-render. Do NOT run seeds/migrations or consolidatePreston here —
      // consolidatePreston saves→pushes on every event, which creates a realtime
      // feedback loop that re-pulls and fights live edits.
      loadProjects()
    })
    return unsub
  }, [])

  const activeProject = projects.find(p => p.id === activeProjectId)

  function handleLogout() {
    localStorage.removeItem('7even_auth')
    clearStoredRole()
    setAuthed(false)
    setRole('admin')
    setDashboardBrand(null)
    setManageOpen(false)
  }

  if (!authed) return <PasswordGate onAuth={() => { setAuthed(true); setRole(getStoredRole()); setShowIntro(true) }} />

  if (showIntro) return <IntroScreen onDone={() => setShowIntro(false)} />

  return (
    <RoleContext.Provider value={role}>
      {dashboardBrand && (dashboardBrand === 'haavn' || role === 'admin') ? (
        <div className="h-screen flex flex-col bg-charcoal overflow-hidden">
          <Dashboard onBack={() => setDashboardBrand(null)} brand={dashboardBrand} />
        </div>
      ) : (
        <div className="h-screen flex flex-col bg-charcoal overflow-hidden">
          {syncing && (
            <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9000, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C4973A', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(196,151,58,0.3)', padding: '5px 10px', backdropFilter: 'blur(6px)' }}>
              ⟳ Syncing…
            </div>
          )}
          {activeProjectId && (
            <>
              {/* Full-screen manage panel */}
              {manageOpen && activeProject && (
                <ProjectManagePanel
                  projectId={activeProject.id}
                  projectName={activeProject.name}
                  onClose={() => setManageOpen(false)}
                  theme={theme}
                  onPickTheme={setTheme}
                  onLogout={handleLogout}
                />
              )}
            </>
          )}

          {activeProjectId
            ? <ProjectWorkspace onManage={role === 'admin' ? () => setManageOpen(true) : undefined} onLogout={handleLogout} theme={theme} />
            : <ProjectList onLogout={handleLogout} onDashboard={(brand) => {
                // HAAVN portfolio dashboard is open to consultants; 7EVEN dashboard is admin-only.
                if (brand === '7even' && role !== 'admin') return
                setDashboardBrand(brand)
              }} />
          }
        </div>
      )}
    </RoleContext.Provider>
  )
}
