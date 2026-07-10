import React, { useState, useEffect, useCallback } from 'react'
import { getSnapshots, deleteSnapshot, restoreSnapshot, captureSnapshot, type ProjectSnapshot } from '../db/snapshots'
import { resetProjectData, getProject } from '../db'
import { useStore } from '../store'
import ProjectExportPanel from './ProjectExportPanel'
import FeasibilityFilesSelector from './FeasibilityFilesSelector'

interface Props {
  projectId: string
  projectName: string
  onClose: () => void
  theme: 'light' | 'blk'
  onPickTheme: (t: 'light' | 'blk') => void
  onLogout: () => void
}

export default function ProjectManagePanel({ projectId, projectName, onClose, theme, onPickTheme, onLogout }: Props) {
  const { loadProjects, setActiveTab } = useStore()
  const [tab, setTab] = useState<'history' | 'export' | 'display' | 'reset'>('history')
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([])
  const [confirmRestore, setConfirmRestore] = useState<ProjectSnapshot | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ProjectSnapshot | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [justRestored, setJustRestored] = useState<string | null>(null)

  const reload = useCallback(() => setSnapshots(getSnapshots(projectId)), [projectId])
  useEffect(() => { reload() }, [reload])

  function handleRestore(snap: ProjectSnapshot) {
    restoreSnapshot(snap)
    setJustRestored(snap.id)
    setConfirmRestore(null)
    reload()
    setTimeout(() => { setJustRestored(null); loadProjects(); onClose() }, 1200)
  }

  function handleDelete(snap: ProjectSnapshot) {
    deleteSnapshot(projectId, snap.id)
    setConfirmDelete(null)
    reload()
  }

  function handleReset() {
    captureSnapshot(projectId, `Before reset — ${new Date().toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`)
    resetProjectData(projectId)
    loadProjects()
    setActiveTab('site')
    setConfirmReset(false)
    onClose()
  }

  return (
    <>
      {/* Full-screen overlay — z-index 9999 puts it above everything including Leaflet */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: '#050505' }}>

        {/* Particle wave background — blurred up from source, dark overlay keeps content legible */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/manage-bg.webp)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(3px)', opacity: 0.55, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(3,3,3,0.82), rgba(3,3,3,0.62) 40%, rgba(3,3,3,0.88))', pointerEvents: 'none' }} />

        {/* Header */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 0, borderBottom: '1px solid #222', flexShrink: 0, background: 'rgba(5,5,5,0.72)', backdropFilter: 'blur(8px)' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', flex: 1 }}>
            {([{ id: 'history', label: '⏱ Version History' }, { id: 'export', label: '⬇ Export' }, { id: 'display', label: '◐ Display' }, { id: 'reset', label: '↺ Reset Project' }] as const).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  padding: '18px 28px',
                  fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: tab === t.id ? (t.id === 'reset' ? '#EF4444' : '#C4973A') : '#A8A8A8',
                  background: 'transparent', border: 'none',
                  borderBottom: tab === t.id ? `2px solid ${t.id === 'reset' ? '#EF4444' : '#C4973A'}` : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s', fontWeight: tab === t.id ? 700 : 400,
                }}>
                {t.label}
              </button>
            ))}
          </div>
          {/* Project name */}
          <div style={{ padding: '0 28px', color: '#B8B8B8', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {projectName}
          </div>
          {/* Close (header) — larger tap target */}
          <button onClick={onClose} aria-label="Close"
            style={{ flexShrink: 0, padding: '0 22px', minWidth: 56, height: '100%', color: '#D8D8D8', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', transition: 'color 0.2s', lineHeight: 1 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#D8D8D8')}>
            ✕
          </button>
        </div>

        {/* Mobile-friendly close — large, thumb-reachable at the bottom */}
        <button onClick={onClose} aria-label="Close manage panel"
          style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)', zIndex: 20,
            padding: '15px 40px', borderRadius: 999,
            background: 'rgba(18,18,18,0.94)', border: '1px solid rgba(255,255,255,0.32)',
            color: '#fff', fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase', fontWeight: 700,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.55)', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
          ✕ Close
        </button>

        {/* Body */}
        <div style={{ position: 'relative', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* ── EXPORT TAB ── */}
          {tab === 'export' && (
            <ProjectExportPanel projectId={projectId} projectName={projectName} />
          )}

          {/* ── HISTORY TAB ── */}
          {tab === 'history' && (() => {
            const project = getProject(projectId)
            return (
            <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 28px', width: '100%' }}>
              <p style={{ fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#C4973A', marginBottom: 6 }}>Project Data</p>
              <h2 style={{ fontSize: 22, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700, color: '#fff', letterSpacing: '0.06em', marginBottom: 28 }}>Feasibility Working Files</h2>

              {/* Feasibility Files Selector */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #222', borderRadius: 8, marginBottom: 28 }}>
                <FeasibilityFilesSelector
                  projectId={projectId}
                  projectName={projectName}
                  projectAddress={project?.address || ''}
                />
              </div>

              {/* Legacy Snapshots Section */}
              <div style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid #222' }}>
                <p style={{ fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#888', marginBottom: 12 }}>Auto-Snapshots (Legacy)</p>
                <p style={{ fontSize: 9, color: '#666', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
                  {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} stored · max 20
                </p>

              {snapshots.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', gap: 16 }}>
                  <div style={{ width: 48, height: 48, border: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#2A2A2A', fontSize: 20 }}>⏱</span>
                  </div>
                  <p style={{ color: '#2A2A2A', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.8 }}>
                    No snapshots yet.<br />Reset the project to create one.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {snapshots.map((snap, i) => {
                    const date = new Date(snap.createdAt)
                    const isRestored = justRestored === snap.id
                    const scenarioCount = snap.data.scenarios.length
                    const hasSite = snap.data.site.resiGBA > 0
                    const hasTimeline = snap.data.timeline.length > 0
                    const hasFinance = snap.data.finance.tranches.length > 0

                    return (
                      <div key={snap.id} style={{
                        border: '1px solid #0E0E0E',
                        background: isRestored ? 'rgba(196,151,58,0.06)' : i % 2 === 0 ? '#080808' : '#060606',
                        padding: '20px 24px',
                        transition: 'background 0.3s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div>
                            <p style={{ fontSize: 12, color: isRestored ? '#C4973A' : '#D0D0D0', fontWeight: 500, letterSpacing: '0.04em', marginBottom: 4 }}>
                              {snap.label}
                            </p>
                            <p style={{ fontSize: 9, color: '#2E2E2E', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
                              {date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                              {' · '}
                              {date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {isRestored && (
                            <span style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C4973A', border: '1px solid #C4973A44', padding: '3px 8px', flexShrink: 0 }}>
                              Restored ✓
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                          {hasSite && <Pill label="Site Data" />}
                          {scenarioCount > 0 && <Pill label={`${scenarioCount} Scenario${scenarioCount > 1 ? 's' : ''}`} />}
                          {hasTimeline && <Pill label={`${snap.data.timeline.length} Tasks`} />}
                          {hasFinance && <Pill label="Finance" />}
                          {snap.data.land.landCost > 0 && <Pill label="Land" />}
                          {!hasSite && scenarioCount === 0 && !hasTimeline && <Pill label="Empty snapshot" dim />}
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setConfirmRestore(snap)} className="glass-btn glass-btn-gold"
                            style={{ flex: 1, padding: '9px 0', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                            ↩ Restore
                          </button>
                          <button onClick={() => setConfirmDelete(snap)} className="glass-btn glass-btn-red"
                            style={{ padding: '9px 18px', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888' }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              </div>
            </div>
            )
          })()}

          {/* ── DISPLAY TAB — theme switch + session ── */}
          {tab === 'display' && (
            <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 28px', width: '100%' }}>
              <p style={{ fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#C4973A', marginBottom: 6 }}>Appearance</p>
              <h2 style={{ fontSize: 22, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700, color: '#fff', letterSpacing: '0.06em', marginBottom: 8 }}>Colour Theme</h2>
              <p style={{ fontSize: 10, color: '#8A8A8A', letterSpacing: '0.06em', lineHeight: 1.6, marginBottom: 24 }}>
                Choose the workspace palette. JB Light is the default natural scheme; JB Blk is the dark black-chrome &amp; gold scheme.
              </p>

              <div className="jb-switch jb-switch-dark" style={{ maxWidth: 280, marginBottom: 40 }}>
                <button className={theme === 'light' ? 'on' : ''} onClick={() => onPickTheme('light')}>JB Light</button>
                <button className={theme === 'blk' ? 'on' : ''} onClick={() => onPickTheme('blk')}>JB Blk</button>
              </div>

              <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: 28 }}>
                <p style={{ fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#666', marginBottom: 14 }}>Session</p>
                <button onClick={onLogout} className="glass-btn glass-btn-red"
                  style={{ padding: '11px 26px', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700 }}>
                  ⎋ Log Out
                </button>
              </div>
            </div>
          )}

          {/* ── RESET TAB ── */}
          {tab === 'reset' && (
            <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 28px' }}>
              <p style={{ fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#EF4444', marginBottom: 6 }}>Danger Zone</p>
              <h2 style={{ fontSize: 22, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700, color: '#fff', letterSpacing: '0.06em', marginBottom: 16 }}>Reset Project Data</h2>
              <p style={{ fontSize: 12, color: '#444', lineHeight: 1.7, letterSpacing: '0.04em', marginBottom: 10 }}>
                This will wipe all data for <span style={{ color: '#C8C8C8' }}>{projectName}</span> — Site & Design, Cost Stack, Finance, Timeline, and all scenarios.
              </p>
              <p style={{ fontSize: 11, color: '#C4973A', letterSpacing: '0.06em', marginBottom: 40, lineHeight: 1.6 }}>
                A snapshot will be saved automatically before the reset, so you can restore it from Version History at any time.
              </p>

              <div style={{ border: '1px solid #1A1A1A', padding: '24px', marginBottom: 20 }}>
                <div style={{ height: 1, background: 'linear-gradient(to right, #EF4444, transparent)', marginBottom: 20 }} />
                <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#333', marginBottom: 20 }}>
                  This action cannot be undone except via Version History restore.
                </p>
                <button onClick={() => setConfirmReset(true)} className="glass-btn glass-btn-red"
                  style={{ width: '100%', padding: '14px 0', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#EF4444', fontWeight: 700 }}>
                  ↺ Reset & Snapshot
                </button>
              </div>

              <p style={{ fontSize: 9, color: '#1E1E1E', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} currently stored for this project
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: '12px 28px', borderTop: '1px solid #0D0D0D', flexShrink: 0 }}>
          <p style={{ fontSize: 8, color: '#1A1A1A', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Snapshots stored locally in browser · not synced across devices
          </p>
        </div>
      </div>

      {/* Restore confirmation */}
      {confirmRestore && (
        <ConfirmDialog zIndex={10000}
          title="Restore this snapshot?"
          body={`This will overwrite all current project data with the version from ${new Date(confirmRestore.createdAt).toLocaleString('en-AU')}. Your current data will not be saved.`}
          confirmLabel="Restore"
          confirmColor="#C4973A"
          onConfirm={() => handleRestore(confirmRestore)}
          onCancel={() => setConfirmRestore(null)}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmDialog zIndex={10000}
          title="Delete this snapshot?"
          body="This snapshot will be permanently removed and cannot be recovered."
          confirmLabel="Delete"
          confirmColor="#EF4444"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Reset confirmation */}
      {confirmReset && (
        <ConfirmDialog zIndex={10000}
          title="Reset project data?"
          body={`All data for ${projectName} will be wiped. A snapshot will be captured first so you can restore it from Version History.`}
          confirmLabel="Reset & Snapshot"
          confirmColor="#EF4444"
          onConfirm={handleReset}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </>
  )
}

function Pill({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <span style={{
      fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase',
      color: dim ? '#2A2A2A' : '#444',
      border: `1px solid ${dim ? '#181818' : '#1E1E1E'}`,
      padding: '2px 7px',
    }}>
      {label}
    </span>
  )
}

function ConfirmDialog({ title, body, confirmLabel, confirmColor, onConfirm, onCancel, zIndex }: {
  title: string; body: string; confirmLabel: string; confirmColor: string; zIndex: number
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)' }}>
      <div style={{ width: 400, background: '#080808', border: '1px solid #1E1E1E', padding: '32px 32px 28px' }}>
        <div style={{ height: 2, background: `linear-gradient(to right, ${confirmColor}, transparent)`, marginBottom: 24 }} />
        <h3 style={{ fontSize: 15, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700, color: '#fff', letterSpacing: '0.06em', marginBottom: 12 }}>{title}</h3>
        <p style={{ fontSize: 11, color: '#555', lineHeight: 1.6, letterSpacing: '0.04em', marginBottom: 28 }}>{body}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="glass-btn"
            style={{ padding: '9px 22px', color: '#999', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Cancel
          </button>
          <button onClick={onConfirm} className={`glass-btn ${confirmColor === '#EF4444' ? 'glass-btn-red' : 'glass-btn-gold'}`}
            style={{ padding: '9px 22px', color: confirmColor, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
