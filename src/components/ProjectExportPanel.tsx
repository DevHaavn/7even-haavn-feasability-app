import React, { useMemo, useState } from 'react'
import { EXPORT_TREE, ALL_EXPORT_IDS, buildExportSections, type ExportNode } from '../lib/exportData'
import { useStore } from '../store'

/** Export picker — tick any tab or sub-tab, download as PDF or Excel. */
export default function ProjectExportPanel({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { projects } = useStore()
  const project = projects.find(p => p.id === projectId)
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_EXPORT_IDS))
  const [busy, setBusy] = useState<'pdf' | 'excel' | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const allSelected = selected.size === ALL_EXPORT_IDS.length

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleGroup(node: ExportNode) {
    const ids = node.children!.map(c => c.id)
    const allOn = ids.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      ids.forEach(id => allOn ? next.delete(id) : next.add(id))
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(ALL_EXPORT_IDS))
  }

  async function run(format: 'pdf' | 'excel') {
    if (selected.size === 0 || busy) return
    setBusy(format)
    setDone(null)
    try {
      // Let the button state paint before the generation work
      await new Promise(r => setTimeout(r, 30))
      // Exporter libs are heavy — loaded on demand so the app bundle stays lean
      const { exportPdf, exportExcel } = await import('../lib/exporters')
      const sections = buildExportSections(projectId, Array.from(selected))
      if (format === 'pdf') exportPdf(projectName, project?.address ?? '', sections)
      else exportExcel(projectName, project?.address ?? '', sections)
      setDone(format === 'pdf' ? 'PDF downloaded' : 'Excel downloaded')
    } finally {
      setBusy(null)
      setTimeout(() => setDone(null), 4000)
    }
  }

  const count = selected.size

  const checkboxStyle: React.CSSProperties = { width: 14, height: 14, accentColor: '#C4973A', cursor: 'pointer', flexShrink: 0 }

  function renderNode(node: ExportNode) {
    if (node.children) {
      const onCount = node.children.filter(c => selected.has(c.id)).length
      return (
        <div key={node.id} style={{ border: '1px solid #141414', background: '#0A0A0A', padding: '14px 18px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={onCount === node.children.length}
              ref={el => { if (el) el.indeterminate = onCount > 0 && onCount < node.children!.length }}
              onChange={() => toggleGroup(node)}
              style={checkboxStyle}
            />
            <span style={{ color: '#D8D6D2', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>{node.label}</span>
            <span style={{ color: '#444', fontSize: 8, letterSpacing: '0.1em', marginLeft: 'auto' }}>{onCount}/{node.children.length}</span>
          </label>
          <div style={{ marginTop: 10, marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {node.children.map(c => (
              <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} style={checkboxStyle} />
                <span style={{ color: selected.has(c.id) ? '#A0A0A0' : '#555', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{c.label}</span>
              </label>
            ))}
          </div>
        </div>
      )
    }
    return (
      <label key={node.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: '1px solid #141414', background: '#0A0A0A', padding: '14px 18px' }}>
        <input type="checkbox" checked={selected.has(node.id)} onChange={() => toggle(node.id)} style={checkboxStyle} />
        <span style={{ color: selected.has(node.id) ? '#D8D6D2' : '#555', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>{node.label}</span>
      </label>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '36px 48px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Heading */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <p style={{ color: '#C4973A', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 6 }}>Project Export</p>
            <h2 style={{ color: '#F0EFED', fontFamily: 'var(--font-heading)', fontWeight: 300, fontSize: 22, letterSpacing: '0.06em', margin: 0 }}>
              Choose what to share
            </h2>
            <p style={{ color: '#666', fontSize: 11, marginTop: 6 }}>
              Tick any tab or sub-tab, then export a branded PDF for meetings or an Excel workbook for your team.
            </p>
          </div>
          <button
            onClick={toggleAll}
            style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#888', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 16px', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#C4973A'; (e.currentTarget as HTMLElement).style.color = '#C4973A' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2A2A2A'; (e.currentTarget as HTMLElement).style.color = '#888' }}
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>

        {/* Checkbox grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 22 }}>
          {EXPORT_TREE.map(renderNode)}
        </div>

        {/* Action bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 30, paddingTop: 22, borderTop: '1px solid #141414' }}>
          <span style={{ color: '#666', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {count} section{count !== 1 ? 's' : ''} selected
          </span>
          <div style={{ flex: 1 }} />
          {done && <span style={{ color: '#3DAA6A', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>✓ {done}</span>}
          <button
            onClick={() => run('pdf')}
            disabled={count === 0 || busy !== null}
            style={{
              background: count > 0 ? '#C4973A' : '#141414', border: 'none',
              color: count > 0 ? '#000' : '#333', fontSize: 10, letterSpacing: '0.22em',
              textTransform: 'uppercase', fontWeight: 700, padding: '13px 30px',
              cursor: count > 0 ? 'pointer' : 'default', transition: 'all 0.2s',
            }}
          >
            {busy === 'pdf' ? 'Generating…' : '⬇ Export PDF'}
          </button>
          <button
            onClick={() => run('excel')}
            disabled={count === 0 || busy !== null}
            style={{
              background: 'transparent', border: `1px solid ${count > 0 ? '#2A7A4F' : '#141414'}`,
              color: count > 0 ? '#3DAA6A' : '#333', fontSize: 10, letterSpacing: '0.22em',
              textTransform: 'uppercase', fontWeight: 700, padding: '12px 30px',
              cursor: count > 0 ? 'pointer' : 'default', transition: 'all 0.2s',
            }}
          >
            {busy === 'excel' ? 'Generating…' : '⬇ Export Excel'}
          </button>
        </div>

        <p style={{ color: '#333', fontSize: 9, letterSpacing: '0.1em', marginTop: 18 }}>
          Exports carry current saved data, the 7EVEN | HAAVN header and a confidential footer — ready for external and internal distribution.
        </p>
      </div>
    </div>
  )
}
