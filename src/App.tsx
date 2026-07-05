import React, { useState, useEffect } from 'react'
import { useStore } from './store'
import { pullFromCloud, subscribeRealtime } from './db/cloud'
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
    pullFromCloud().then(() => {
      loadProjects()
      setSyncing(false)
    })
    const unsub = subscribeRealtime(() => {
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
              {/* Manage + Log Out — top-right on desktop; a slim strip above the header on mobile */}
              <div className="ws-actions no-drag" style={{ position: 'fixed', top: 15, right: 18, zIndex: 200, display: 'flex', alignItems: 'center', gap: 8 }}>
                {role === 'admin' && (
                  <button className="glass-btn glass-btn-gold" onClick={() => setManageOpen(true)}
                    style={{ fontSize: 6.5, letterSpacing: '0.20em', textTransform: 'uppercase', padding: '5px 11px', whiteSpace: 'nowrap' }}>
                    ⊞ Manage
                  </button>
                )}
                <button className="glass-btn glass-btn-grey" onClick={handleLogout}
                  style={{ fontSize: 6.5, letterSpacing: '0.20em', textTransform: 'uppercase', padding: '5px 11px', whiteSpace: 'nowrap' }}>
                  Log Out
                </button>
              </div>

              {/* Full-screen manage panel */}
              {manageOpen && activeProject && (
                <ProjectManagePanel
                  projectId={activeProject.id}
                  projectName={activeProject.name}
                  onClose={() => setManageOpen(false)}
                />
              )}
            </>
          )}

          {activeProjectId
            ? <ProjectWorkspace />
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
