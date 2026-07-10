import React, { useState } from 'react'
import * as db from '../db'
import type { FeasibilityFile } from '../db/schema'

interface Props {
  projectId: string
  projectName: string
  projectAddress: string
  onSwitchFile?: (fileId: string) => void
}

export default function FeasibilityFilesSelector({ projectId, projectName, projectAddress, onSwitchFile }: Props) {
  const [files, setFiles] = useState<FeasibilityFile[]>(() => db.getFeasibilityFiles(projectId))
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')

  function handleCreateFile() {
    if (!newName.trim()) return
    const file = db.createFeasibilityFile(projectId, newName.trim())
    setFiles(db.getFeasibilityFiles(projectId))
    setNewName('')
    setShowNew(false)
    onSwitchFile?.(file.id)
  }

  function handleSwitchFile(fileId: string) {
    db.setActiveFeasibility(projectId, fileId)
    setFiles(db.getFeasibilityFiles(projectId))
    onSwitchFile?.(fileId)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', fontWeight: 700, margin: 0 }}>Feasibility Files</h3>
        <button onClick={() => setShowNew(!showNew)}
          style={{ fontSize: 9, padding: '6px 12px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}>
          + New File
        </button>
      </div>

      {showNew && (
        <div style={{ background: '#F5F3F0', padding: 12, borderRadius: 6, marginBottom: 12, border: '1px solid #E0DDD8' }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 9, color: '#666', display: 'block', marginBottom: 4, fontWeight: 700 }}>File Name</label>
            <input type="text" placeholder="e.g. v1, Phase 1 Concept"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #D0CEC9', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreateFile}
              style={{ flex: 1, padding: '8px', background: '#22C55E', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
              Create File
            </button>
            <button onClick={() => setShowNew(false)}
              style={{ flex: 1, padding: '8px', background: '#E0DDD8', color: '#1A1A1A', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {files.length === 0 ? (
        <div style={{ fontSize: 11, color: '#999', padding: '12px', textAlign: 'center' }}>No files found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map((f, idx) => {
            const isLegacy = f.fileName.includes('Legacy') || idx === 0
            return (
              <div
                key={f.id}
                onClick={() => handleSwitchFile(f.id)}
                style={{
                  background: f.isLive ? '#22C55E' : '#FFFFFF',
                  padding: 12,
                  borderRadius: 6,
                  border: isLegacy ? '2px solid #C4973A' : '1px solid #E0DDD8',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isLegacy && f.isLive ? '0 0 0 2px #C4973A, inset 0 0 0 2px #C4973A' : isLegacy ? 'inset 0 0 0 2px #C4973A' : 'none',
                }}
                onMouseEnter={e => !f.isLive && (e.currentTarget.style.background = '#F9F9F9')}
                onMouseLeave={e => !f.isLive && (e.currentTarget.style.background = '#FFFFFF')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: f.isLive ? '#fff' : '#1A1A1A', margin: '0 0 2px' }}>
                      {f.fileName}
                    </p>
                    {f.isLive && (
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', margin: 0, fontWeight: 600 }}>
                        🔴 LIVE (autosaving)
                      </p>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: 9, color: f.isLive ? 'rgba(255,255,255,0.8)' : '#999', margin: 0 }}>
                  Last autosaved: {formatDate(f.lastAutosavedAt)}
                </p>
                <div style={{ fontSize: 9, color: f.isLive ? 'rgba(255,255,255,0.8)' : '#666', marginTop: 6, paddingTop: 6, borderTop: f.isLive ? '1px solid rgba(255,255,255,0.2)' : '1px solid #E0DDD8' }}>
                  <p style={{ margin: '2px 0' }}>📍 {projectName}</p>
                  <p style={{ margin: '2px 0' }}>📧 {projectAddress}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
