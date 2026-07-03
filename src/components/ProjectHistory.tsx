import React, { useState, useEffect, useCallback } from 'react'
import { getSnapshots, deleteSnapshot, restoreSnapshot, type ProjectSnapshot } from '../db/snapshots'

interface Props {
  projectId: string
  open: boolean
  onClose: () => void
  onRestored: () => void
}

export default function ProjectHistory({ projectId, open, onClose, onRestored }: Props) {
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([])
  const [confirmRestore, setConfirmRestore] = useState<ProjectSnapshot | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ProjectSnapshot | null>(null)
  const [justRestored, setJustRestored] = useState<string | null>(null)

  const reload = useCallback(() => setSnapshots(getSnapshots(projectId)), [projectId])

  useEffect(() => { if (open) reload() }, [open, reload])

  function handleRestore(snap: ProjectSnapshot) {
    restoreSnapshot(snap)
    setJustRestored(snap.id)
    setConfirmRestore(null)
    reload()
    setTimeout(() => { setJustRestored(null); onRestored() }, 1200)
  }

  function handleDelete(snap: ProjectSnapshot) {
    deleteSnapshot(projectId, snap.id)
    setConfirmDelete(null)
    reload()
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(4px)' }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 301,
        width: 420, background: '#060606', borderLeft: '1px solid #1A1A1A',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #111', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <p style={{ fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#C4973A', marginBottom: 4 }}>Project Data</p>
              <h2 style={{ fontSize: 16, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>Version History</h2>
            </div>
            <button onClick={onClose}
              style={{ color: '#444', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', lineHeight: 1, transition: 'color 0.2s', padding: 4 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#444')}>✕</button>
          </div>
          <p style={{ fontSize: 10, color: '#333', letterSpacing: '0.06em', lineHeight: 1.5 }}>
            Snapshots are captured automatically before each reset. Restore any version at any time.
          </p>
          <div style={{ marginTop: 12, fontSize: 9, color: '#252525', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} stored · max 20
          </div>
        </div>

        {/* Snapshot list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {snapshots.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 40 }}>
              <div style={{ width: 36, height: 36, border: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#2A2A2A', fontSize: 16 }}>⏱</span>
              </div>
              <p style={{ color: '#2A2A2A', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', textAlign: 'center' }}>
                No snapshots yet.<br />Reset the project to create one.
              </p>
            </div>
          ) : (
            snapshots.map((snap, i) => {
              const date = new Date(snap.createdAt)
              const isRestored = justRestored === snap.id
              const scenarioCount = snap.data.scenarios.length
              const hasSite = snap.data.site.resiGBA > 0
              const hasTimeline = snap.data.timeline.length > 0
              const hasFinance = snap.data.finance.tranches.length > 0

              return (
                <div key={snap.id} style={{
                  borderBottom: '1px solid #0D0D0D', padding: '18px 28px',
                  background: isRestored ? 'rgba(196,151,58,0.06)' : i % 2 === 0 ? 'transparent' : '#040404',
                  transition: 'background 0.3s',
                }}>
                  {/* Timestamp row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <p style={{ fontSize: 11, color: isRestored ? '#C4973A' : '#C8C8C8', fontWeight: 500, letterSpacing: '0.04em', marginBottom: 2 }}>
                        {snap.label}
                      </p>
                      <p style={{ fontSize: 9, color: '#333', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
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

                  {/* Content summary pills */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {hasSite && <Pill label="Site Data" />}
                    {scenarioCount > 0 && <Pill label={`${scenarioCount} Scenario${scenarioCount > 1 ? 's' : ''}`} />}
                    {hasTimeline && <Pill label={`${snap.data.timeline.length} Tasks`} />}
                    {hasFinance && <Pill label="Finance" />}
                    {snap.data.land.landCost > 0 && <Pill label="Land" />}
                    {!hasSite && scenarioCount === 0 && !hasTimeline && (
                      <Pill label="Empty snapshot" dim />
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setConfirmRestore(snap)}
                      style={{ flex: 1, padding: '8px 0', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C4973A', background: 'rgba(196,151,58,0.06)', border: '1px solid rgba(196,151,58,0.20)', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(196,151,58,0.14)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(196,151,58,0.06)' }}>
                      ↩ Restore
                    </button>
                    <button onClick={() => setConfirmDelete(snap)}
                      style={{ padding: '8px 16px', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#444', background: 'transparent', border: '1px solid #1A1A1A', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.borderColor = '#EF444433' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#444'; (e.currentTarget as HTMLElement).style.borderColor = '#1A1A1A' }}>
                      Delete
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer note */}
        <div style={{ padding: '14px 28px', borderTop: '1px solid #0D0D0D', flexShrink: 0 }}>
          <p style={{ fontSize: 8, color: '#1E1E1E', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Snapshots stored locally in browser · not synced across devices
          </p>
        </div>
      </div>

      {/* Restore confirmation */}
      {confirmRestore && (
        <ConfirmDialog
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
        <ConfirmDialog
          title="Delete this snapshot?"
          body="This snapshot will be permanently removed and cannot be recovered."
          confirmLabel="Delete"
          confirmColor="#EF4444"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  )
}

function Pill({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <span style={{
      fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase',
      color: dim ? '#2A2A2A' : '#555',
      border: `1px solid ${dim ? '#181818' : '#1E1E1E'}`,
      padding: '2px 7px',
    }}>
      {label}
    </span>
  )
}

function ConfirmDialog({ title, body, confirmLabel, confirmColor, onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string; confirmColor: string
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.60)' }}>
      <div style={{ width: 380, background: '#080808', border: '1px solid #1E1E1E', padding: '32px 32px 28px' }}>
        <div style={{ height: 2, background: `linear-gradient(to right, ${confirmColor}, transparent)`, marginBottom: 24 }} />
        <h3 style={{ fontSize: 15, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700, color: '#fff', letterSpacing: '0.06em', marginBottom: 12 }}>{title}</h3>
        <p style={{ fontSize: 11, color: '#555', lineHeight: 1.6, letterSpacing: '0.04em', marginBottom: 28 }}>{body}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel}
            style={{ padding: '9px 22px', border: '1px solid #222', background: 'transparent', color: '#666', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{ padding: '9px 22px', border: 'none', background: confirmColor, color: '#000', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
