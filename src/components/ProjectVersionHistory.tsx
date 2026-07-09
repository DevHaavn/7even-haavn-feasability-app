import React, { useState } from 'react'
import * as db from '../db'
import type { ProjectVersion } from '../db/schema'

interface Props {
  projectId: string
  projectName: string
  projectAddress: string
  createdBy?: string
}

export default function ProjectVersionHistory({ projectId, projectName, projectAddress, createdBy }: Props) {
  const [versions, setVersions] = useState<ProjectVersion[]>(() => db.getProjectVersions(projectId))
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCreator, setNewCreator] = useState(createdBy || '')

  function handleCreateVersion() {
    if (!newName.trim() || !newCreator.trim()) return
    const version = db.createProjectVersion(projectId, newName, newCreator)
    setVersions([...versions, version])
    setNewName('')
    setShowNew(false)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', fontWeight: 700, margin: 0 }}>Version History</h3>
        <button onClick={() => setShowNew(!showNew)}
          style={{ fontSize: 9, padding: '6px 12px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}>
          + New Version
        </button>
      </div>

      {showNew && (
        <div style={{ background: '#F5F3F0', padding: 12, borderRadius: 6, marginBottom: 12, border: '1px solid #E0DDD8' }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 9, color: '#666', display: 'block', marginBottom: 4, fontWeight: 700 }}>Version Name</label>
            <input type="text" placeholder="e.g. v1, Phase 1 Concept"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #D0CEC9', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 9, color: '#666', display: 'block', marginBottom: 4, fontWeight: 700 }}>Creator Name</label>
            <input type="text" placeholder="Your name"
              value={newCreator}
              onChange={e => setNewCreator(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #D0CEC9', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCreateVersion}
              style={{ flex: 1, padding: '8px', background: '#22C55E', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
              Save Version
            </button>
            <button onClick={() => setShowNew(false)}
              style={{ flex: 1, padding: '8px', background: '#E0DDD8', color: '#1A1A1A', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {versions.length === 0 ? (
        <div style={{ fontSize: 11, color: '#999', padding: '12px', textAlign: 'center' }}>No versions saved yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {versions.map(v => (
            <div key={v.id} style={{ background: '#FFFFFF', padding: 12, borderRadius: 6, border: '1px solid #E0DDD8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', margin: '0 0 2px' }}>{v.versionName}</p>
                  <p style={{ fontSize: 9, color: '#666', margin: 0 }}>by {v.createdBy}</p>
                </div>
              </div>
              <p style={{ fontSize: 9, color: '#999', margin: 0 }}>
                Created: {formatDate(v.createdAt)}<br />
                Last updated: {formatDate(v.lastUpdatedAt)}
              </p>
              <div style={{ fontSize: 9, color: '#666', marginTop: 6, paddingTop: 6, borderTop: '1px solid #E0DDD8' }}>
                <p style={{ margin: '2px 0' }}>📍 {projectName}</p>
                <p style={{ margin: '2px 0' }}>📧 {projectAddress}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
