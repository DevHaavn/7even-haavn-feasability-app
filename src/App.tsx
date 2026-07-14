import React, { useState, useEffect } from 'react'
import { useStore } from './store'
import { pullFromCloud, subscribeRealtime } from './db/cloud'
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

  // On mount: pull the cloud (the single source of truth), then subscribe to
  // live changes. SEEDING RULE — the app seeds/migrates ONLY when the cloud is
  // confirmed empty (a brand-new database). When the cloud already has projects,
  // it is authoritative and the client never regenerates, migrates, or overwrites
  // anything — it only reads, and pushes the specific numbers a user edits. This
  // is what stops any one computer from resetting feasibility for everyone.
  useEffect(() => {
    let done = false
    const finish = (status: 'has-data' | 'empty' | 'error') => {
      if (done) return
      done = true
      if (status === 'empty') {
        // Brand-new / empty database (or local-only mode): build the baseline once
        // and let it push up to populate the cloud. This is the ONLY path allowed
        // to write template data to the cloud, and it only runs on an empty cloud.
        seedProjectsIfEmpty()
        migrateCostStackLabels()
        seedBaseCostStackForAll()
        seedBaseFinanceForAll()
        consolidatePreston()
        migrateCatalogues()
      }
      // 'has-data': cloud is authoritative — do NOT seed/migrate/overwrite.
      // 'error': pull failed — render whatever local cache exists, but do NOT seed
      //          (seeding over an unreachable-but-populated cloud would clobber it).
      loadProjects()
      setSyncing(false)
    }
    setSyncing(true)
    // If the pull hangs, fall back to local cache WITHOUT seeding (treat as 'error').
    const timer = setTimeout(() => finish('error'), 8000)
    pullFromCloud().then(
      (status) => { clearTimeout(timer); finish(status) },
      () => { clearTimeout(timer); finish('error') },
    )
    const unsub = subscribeRealtime(() => {
      // Another client saved a change; the pull inside subscribeRealtime already
      // hydrated it (respecting the per-key edit guard so it can't clobber an
      // in-progress local edit). Just re-render — never seed/migrate here.
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
