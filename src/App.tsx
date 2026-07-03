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
      {dashboardBrand ? (
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
              {/* Manage button — admin only, sits left of Log Out at same z-level */}
              {role === 'admin' && (
                <button
                  className="no-drag"
                  onClick={() => setManageOpen(true)}
                  style={{
                    position: 'fixed', top: 14, right: 110, zIndex: 200,
                    background: 'rgba(196,151,58,0.10)', border: '1px solid rgba(196,151,58,0.35)',
                    color: '#C4973A', fontSize: 9, letterSpacing: '0.22em',
                    textTransform: 'uppercase', padding: '5px 12px',
                    cursor: 'pointer', transition: 'all 0.2s',
                    backdropFilter: 'blur(6px)', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(196,151,58,0.22)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(196,151,58,0.10)' }}
                >
                  ⊞ Manage
                </button>
              )}

              {/* Log Out button */}
              <button
                className="no-drag"
                onClick={handleLogout}
                style={{
                  position: 'fixed', top: 14, right: 20, zIndex: 200,
                  background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.5)',
                  color: '#fff', fontSize: 9, letterSpacing: '0.22em',
                  textTransform: 'uppercase', padding: '5px 12px',
                  cursor: 'pointer', transition: 'all 0.2s',
                  backdropFilter: 'blur(6px)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#9B2335'
                  ;(e.currentTarget as HTMLElement).style.color = '#9B2335'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)'
                  ;(e.currentTarget as HTMLElement).style.color = '#fff'
                }}
              >
                Log Out
              </button>

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
            : <ProjectList onLogout={handleLogout} onDashboard={role === 'admin' ? (brand) => setDashboardBrand(brand) : undefined} />
          }
        </div>
      )}
    </RoleContext.Provider>
  )
}
