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
  const [files, setFiles] = useState<FeasibilityFile[]>(() => {
    try {
      const f = db.getFeasibilityFiles(projectId)
      return f
    } catch (e) {
      console.error('Error loading feasibility files:', e)
      return []
    }
  })
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

  function handleDeleteFile(fileId: string) {
    db.deleteFeasibilityFile(projectId, fileId)
    setFiles(db.getFeasibilityFiles(projectId))
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', fontWeight: 700, margin: 0 }}>Feasibility Files</h3>
        <button onClick={() => setShowNew(!showNew)}
          style={{ fontSize: 9, padding: '6px 12px', background: 'rgba(214,179,106,0.08)', color: '#d6b36a', border: '1px solid rgba(214,179,106,0.5)', borderRadius: 4, cursor: 'pointer', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          + New File
        </button>
      </div>

      {showNew && (
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 6, marginBottom: 12, border: '1px solid rgba(255,255,255,0.16)' }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 9, color: '#aab0b6', display: 'block', marginBottom: 4, fontWeight: 700 }}>File Name</label>
            <input type="text" placeholder="e.g. v1, Phase 1 Concept"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreateFile}
              style={{ flex: 1, padding: '8px', background: '#2fe07a', color: '#05130b', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
              Create File
            </button>
            <button onClick={() => setShowNew(false)}
              style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.1)', color: '#e6e9ec', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
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
                  background: f.isLive ? 'rgba(47,224,122,0.05)' : 'rgba(255,255,255,0.04)',
                  padding: 12,
                  borderRadius: 6,
                  border: f.isLive ? '1px solid rgba(47,224,122,0.55)' : isLegacy ? '1px solid rgba(196,151,58,0.5)' : '1px solid rgba(255,255,255,0.14)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: f.isLive ? '0 0 30px -12px rgba(47,224,122,0.5), inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                }}
                onMouseEnter={e => !f.isLive && (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
                onMouseLeave={e => !f.isLive && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', margin: 0 }}>
                        {f.fileName}
                      </p>
                      {isLegacy && (
                        <span style={{ fontSize: 8, fontWeight: 700, color: '#C4973A', background: 'rgba(196,151,58,0.15)', padding: '2px 6px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          LEGACY
                        </span>
                      )}
                    </div>
                    {f.isLive && (
                      <p style={{ fontSize: 9, color: '#2fe07a', margin: '4px 0 0', fontWeight: 600, letterSpacing: '0.12em' }}>
                        ● LIVE (autosaving)
                      </p>
                    )}
                  </div>
                  {files.length > 1 && !isLegacy && (
                    <button onClick={() => handleDeleteFile(f.id)}
                      style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.2)', color: '#EF4444', border: 'none', borderRadius: 3, fontSize: 9, cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}>
                      Delete
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 9, color: f.isLive ? 'rgba(255,255,255,0.65)' : '#8a8f95', margin: 0 }}>
                  Last autosaved: {formatDate(f.lastAutosavedAt)}
                </p>
                <div style={{ fontSize: 9, color: f.isLive ? 'rgba(255,255,255,0.65)' : '#8a8f95', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
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
