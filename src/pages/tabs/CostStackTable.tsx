import React, { useState, useRef } from 'react'
import type { CostLineItem } from '../../db/schema'

// A grouping rule: items whose notes match are gathered under this labelled band.
export type GroupConfig = { id: string; label: string; color: string; match: (item: CostLineItem) => boolean }

interface Props {
  items: CostLineItem[]
  onChange: (items: CostLineItem[]) => void
  gstEnabled?: boolean
  // 'units' shows Units / Base rate columns (construction); 'basis' shows Basis / Rate.
  basisMode?: 'basis' | 'units'
  // When provided the rows are banded into labelled groups with subtotals; otherwise flat.
  groups?: GroupConfig[]
  // Basis values so %-of-Construction / %-of-GRV lines can derive their budget live.
  constructionValue?: number
  gdvValue?: number
}

// Basis dropdown (fee tabs): direct $ / unit, or a % of a basis that derives the budget.
const BASIS_OPTS: [string, string][] = [['', '$ / Unit'], ['construction', '% of Constr.'], ['gdv', '% of GRV']]

// ── Phase badges ──────────────────────────────────────────────────────────────
const PHASE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  preacq:       { bg: '#E6F1FB', text: '#0C447C', label: 'Pre-acq' },
  acqplan:      { bg: '#FAEEDA', text: '#854F0B', label: 'Acq/planning' },
  preconst:     { bg: '#F1EFE8', text: '#5F5E5A', label: 'Pre-const' },
  construction: { bg: '#EAF3DE', text: '#3B6D11', label: 'Construction' },
  closeout:     { bg: '#FCEBEB', text: '#A32D2D', label: 'Close-out' },
  allphases:    { bg: '#EFEFF4', text: '#4B4B57', label: 'All phases' },
}

function fundingDisplay(fundedBy?: string): { label: string; dots: string[] } {
  switch (fundedBy) {
    case 'equity': return { label: 'Equity', dots: ['#5DCAA5'] }
    case 'debt':
    case 'senior': return { label: 'Senior', dots: ['#85B7EB'] }
    case 'blend':
    case 'both':   return { label: 'Both',   dots: ['#5DCAA5', '#85B7EB'] }
    default:       return { label: fundedBy || 'Equity', dots: ['#5DCAA5'] }
  }
}

const S_CURVE_LABEL: Record<string, string> = { scurve: 'S-curve', linear: 'Linear', upfront: 'Upfront', backloaded: 'Back' }

function fmtMonth(ym?: string): string {
  if (!ym) return '—'
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return '—'
  return new Date(y, m - 1, 1).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
}

// Basis label shown in 'basis' mode (Consultants / Statutory / Headworks / Management).
function basisLabel(it: CostLineItem): string {
  if (it.feeBasis === 'construction') return '% constr'
  if (it.feeBasis === 'gdv') return '% land'
  if ((it.units || 0) > 0 || (it.baseRate || 0) > 0) return '$ / unit'
  return '$ fixed'
}

// Design convention: amounts are entered EX-GST; GST is 10% added on top.
const GST_RATE = 0.1
const money = (n: number) => `$${Math.round(n).toLocaleString()}`

// Fixed widths (px) for every column after the draggable Item column. Wide enough
// that large dollar figures never collide. Item width is user-resizable (descW).
const COLS_AFTER_ITEM = [78, 66, 72, 116, 96, 118, 100, 108, 80, 112, 112] // Basis…End
const COLS_SUM = COLS_AFTER_ITEM.reduce((s, w) => s + w, 0)
const cellR: React.CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

// Editable-cell styling — borderless so the grid stays clean but every field is live.
const editInput: React.CSSProperties = { border: '1px solid transparent', borderRadius: 3, background: 'transparent', fontSize: 10, color: '#1A1A1A', outline: 'none', width: '100%', padding: '2px 3px', fontFamily: 'inherit' }
const editSelect: React.CSSProperties = { ...editInput, cursor: 'pointer', appearance: 'none' as const }
const actBtn: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, lineHeight: 1, color: '#B4B2AD', padding: '0 1px' }

const PHASE_OPTS: [string, string][] = [['', '—'], ['preacq', 'Pre-acq'], ['acqplan', 'Acq/planning'], ['preconst', 'Pre-const'], ['construction', 'Construction'], ['closeout', 'Close-out'], ['allphases', 'All phases']]
const FUND_OPTS: [string, string][] = [['equity', 'Equity'], ['senior', 'Senior'], ['debt', 'Debt'], ['blend', 'Blend'], ['both', 'Both']]
const SCURVE_OPTS: [string, string][] = [['scurve', 'S-curve'], ['linear', 'Linear'], ['upfront', 'Upfront'], ['backloaded', 'Back']]

// Assign each item to the first matching group; unmatched fall into an "Other" band.
function buildGroups(items: CostLineItem[], groups?: GroupConfig[]) {
  if (!groups || groups.length === 0) return null
  const buckets = groups.map(g => ({ def: g, items: [] as CostLineItem[] }))
  const other: { def: GroupConfig; items: CostLineItem[] } = { def: { id: '_other', label: 'Other', color: '#C9C6C0', match: () => true }, items: [] }
  for (const it of items) {
    const b = buckets.find(x => x.def.match(it))
    ;(b ? b.items : other.items).push(it)
  }
  const res = buckets.filter(b => b.items.length)
  if (other.items.length) res.push(other)
  return res
}

export default function CostStackTable({ items, onChange, gstEnabled = true, basisMode = 'basis', groups, constructionValue = 0, gdvValue = 0 }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (id: string) => { const n = new Set(collapsed); n.has(id) ? n.delete(id) : n.add(id); setCollapsed(n) }

  // Draggable Item ("description") column width — grab the divider to resize; persisted.
  const [descW, setDescW] = useState<number>(() => {
    const s = typeof localStorage !== 'undefined' ? parseInt(localStorage.getItem('cs.descW') || '', 10) : NaN
    return Number.isFinite(s) ? Math.max(160, Math.min(760, s)) : 300
  })
  const dragRef = useRef<{ startX: number; startW: number } | null>(null)
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragRef.current = { startX: e.clientX, startW: descW }
    const move = (ev: PointerEvent) => {
      if (!dragRef.current) return
      setDescW(Math.max(160, Math.min(760, dragRef.current.startW + (ev.clientX - dragRef.current.startX))))
    }
    const up = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setDescW(w => { try { localStorage.setItem('cs.descW', String(w)) } catch {} ; return w })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  // Item width honours the user's drag on desktop but is capped to the viewport on
  // small screens so the other columns stay reachable (the table scrolls sideways).
  const GRID = `clamp(150px, ${descW}px, 62vw) ${COLS_AFTER_ITEM.map(w => `${w}px`).join(' ')}`
  const MINW = Math.min(descW, 240) + COLS_SUM + 32

  const update = (id: string, patch: Partial<CostLineItem>) => onChange(items.map(it => (it.id === id ? { ...it, ...patch } : it)))
  const add = () => onChange([...items, { id: Math.random().toString(36).slice(2) + Date.now(), label: '', amount: 0, notes: '', sCurve: 'scurve', fundedBy: 'equity' }])
  // Delete a line, and move it up/down within the section.
  const removeRow = (id: string) => onChange(items.filter(i => i.id !== id))
  const moveRow = (id: string, dir: -1 | 1) => {
    const i = items.findIndex(x => x.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= items.length) return
    const next = items.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  // Budget build-up: % of a basis, else Units × Rate, else the directly entered amount.
  const basisVal = (it: CostLineItem) => (it.feeBasis === 'gdv' ? gdvValue : constructionValue)
  const hasUnitRate = (it: CostLineItem) => (it.units ?? 0) > 0 && (it.baseRate ?? 0) > 0
  const effAmt = (it: CostLineItem) =>
    it.feeBasis ? Math.round((it.pct ?? 0) * basisVal(it))
    : hasUnitRate(it) ? Math.round((it.units || 0) * (it.baseRate || 0))
    : (it.amount || 0)
  // Picking a basis sets the derived budget; clearing it keeps the entered amount.
  const changeBasis = (it: CostLineItem, v: string) => {
    const fb = (v || undefined) as CostLineItem['feeBasis']
    if (fb) update(it.id, { feeBasis: fb, pct: it.pct ?? 0, amount: Math.round((it.pct ?? 0) * (fb === 'gdv' ? gdvValue : constructionValue)) })
    else update(it.id, { feeBasis: undefined })
  }
  const changePct = (it: CostLineItem, pctPercent: number) => {
    const p = pctPercent / 100
    update(it.id, { pct: p, amount: Math.round(p * basisVal(it)) })
  }
  // Units × Rate drives the budget when both are present.
  const changeUnits = (it: CostLineItem, u: number) =>
    update(it.id, { units: u, amount: (u > 0 && (it.baseRate ?? 0) > 0) ? Math.round(u * (it.baseRate || 0)) : (it.amount || 0) })
  const changeRate = (it: CostLineItem, r: number) =>
    update(it.id, { baseRate: r, amount: ((it.units ?? 0) > 0 && r > 0) ? Math.round((it.units || 0) * r) : (it.amount || 0) })

  // GST is shown straight off the budget figure (10%), except lines flagged GST-free.
  const gstOf = (it: CostLineItem) => (it.gstFree ? 0 : effAmt(it) * GST_RATE)
  const grandBudget = items.reduce((s, i) => s + effAmt(i), 0)
  const grandGst = items.reduce((s, i) => s + gstOf(i), 0)

  const th: React.CSSProperties = { fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, whiteSpace: 'nowrap' }
  const banded = buildGroups(items, groups)

  // NB: rendered as a plain function (not <Row/>) so inputs keep focus while typing —
  // defining a component inside render remounts every row on each keystroke.
  const renderRow = (item: CostLineItem, idx: number) => {
    const gst = gstOf(item)
    const fund = fundingDisplay(item.fundedBy)
    const badge = item.phase ? PHASE_BADGE[item.phase] : undefined
    const isPct = item.feeBasis === 'construction' || item.feeBasis === 'gdv'
    return (
      <div key={item.id} className="cs-row" style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, padding: '6px 16px', borderBottom: '1px solid #F0EDE8', background: idx % 2 === 0 ? '#fff' : '#FDFCFB', alignItems: 'center' }}>
        {/* Item description — editable, with move/delete controls (reveal on hover) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
          <span className="cs-act" style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
            <button onClick={() => moveRow(item.id, -1)} title="Move up" style={actBtn}>↑</button>
            <button onClick={() => moveRow(item.id, 1)} title="Move down" style={actBtn}>↓</button>
            <button onClick={() => removeRow(item.id)} title="Delete row" style={{ ...actBtn, color: '#C0392B', fontSize: 12 }}>×</button>
          </span>
          <input type="text" value={item.label} onChange={e => update(item.id, { label: e.target.value })} placeholder="Item description"
            style={{ ...editInput, fontSize: 11, minWidth: 0 }} />
        </div>
        {/* Basis — dropdown: $ / Unit · % of Constr. · % of GRV */}
        <select value={item.feeBasis ?? ''} onChange={e => changeBasis(item, e.target.value)} style={{ ...editSelect, color: '#6B6A66' }}>
          {BASIS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {/* Units — editable (n/a for % basis) */}
        {isPct ? (
          <span style={{ fontSize: 10, color: '#CBC9C4', ...cellR }}>—</span>
        ) : (
          <input type="text" inputMode="decimal" value={item.units ? item.units.toLocaleString() : ''} placeholder="—"
            onChange={e => changeUnits(item, parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
            style={{ ...editInput, ...cellR, color: '#6B6A66' }} />
        )}
        {/* Rate — pct % for a %-basis line, otherwise the per-unit rate */}
        {isPct ? (
          <input type="text" inputMode="decimal" value={item.pct != null ? +(item.pct * 100).toFixed(2) : ''} placeholder="0"
            onChange={e => changePct(item, parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
            style={{ ...editInput, ...cellR, color: '#6B6A66' }} />
        ) : (
          <input type="text" inputMode="decimal" value={item.baseRate ? item.baseRate.toLocaleString() : ''} placeholder="—"
            onChange={e => changeRate(item, parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
            style={{ ...editInput, ...cellR, color: '#6B6A66' }} />
        )}
        {/* Budget $ — derived (read-only) when % basis or Units × Rate; else editable */}
        {isPct || hasUnitRate(item) ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', ...cellR }}>{money(effAmt(item))}</span>
        ) : (
          <input type="text" inputMode="numeric" value={(item.amount || 0).toLocaleString()}
            onChange={e => update(item.id, { amount: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0 })}
            style={{ ...editInput, fontSize: 11, fontWeight: 700, ...cellR }} />
        )}
        {/* GST from budget (10%) + Incl. GST */}
        <span style={{ fontSize: 10, color: '#999', ...cellR }}>{item.gstFree ? '—' : money(gst)}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: '#1A1A1A', ...cellR }}>{money(effAmt(item) + gst)}</span>
        {/* Funded by — editable dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }}>{fund.dots.map((c, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />)}</span>
          <select value={item.fundedBy || 'equity'} onChange={e => update(item.id, { fundedBy: e.target.value as CostLineItem['fundedBy'] })} style={editSelect}>
            {FUND_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {/* Phase — editable dropdown */}
        <select value={item.phase || ''} onChange={e => update(item.id, { phase: (e.target.value || undefined) as CostLineItem['phase'] })}
          style={{ ...editSelect, color: badge ? badge.text : '#BBB', background: badge ? badge.bg : 'transparent', borderRadius: 3 }}>
          {PHASE_OPTS.map(([v, l]) => <option key={v} value={v} style={{ color: '#1A1A1A', background: '#fff' }}>{l}</option>)}
        </select>
        {/* S-curve — editable dropdown */}
        <select value={item.sCurve || 'scurve'} onChange={e => update(item.id, { sCurve: e.target.value as CostLineItem['sCurve'] })} style={{ ...editSelect, color: '#7A7975' }}>
          {SCURVE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {/* Start / End — editable month pickers */}
        <input type="month" value={item.startDate?.slice(0, 7) || ''} onChange={e => update(item.id, { startDate: e.target.value })} style={{ ...editInput, fontSize: 9.5, color: '#666' }} />
        <input type="month" value={item.endDate?.slice(0, 7) || ''} onChange={e => update(item.id, { endDate: e.target.value })} style={{ ...editInput, fontSize: 9.5, color: '#666' }} />
      </div>
    )
  }

  const renderSubtotal = (label: string, rows: CostLineItem[]) => {
    const b = rows.reduce((s, i) => s + effAmt(i), 0)
    const g = rows.reduce((s, i) => s + gstOf(i), 0)
    return (
      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, padding: '9px 16px', borderBottom: '1px solid #E8E5E0', background: '#F5F3F0', fontWeight: 600, fontSize: 11 }}>
        <span style={{ color: '#1A1A1A', paddingLeft: 16 }}>{label} subtotal</span>
        <span /><span /><span />
        <span style={{ color: '#2A7A4F', ...cellR }}>{money(b)}</span>
        <span style={{ color: '#999', ...cellR }}>{money(g)}</span>
        <span style={{ color: '#2A7A4F', ...cellR }}>{money(b + g)}</span>
        <span style={{ gridColumn: '8 / -1' }} />
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #E8E5E0', borderRadius: 6, overflowX: 'auto' }}>
      <style>{`.cs-row .cs-act{opacity:0;transition:opacity .12s}.cs-row:hover .cs-act{opacity:1}`}</style>
      <div style={{ minWidth: MINW }}>
        {/* + add row at the top */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 16px', borderBottom: '1px solid #F0EDE8' }}>
          <button onClick={add} style={{ fontSize: 11, fontWeight: 500, color: '#2A7A4F', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>+ add row</button>
        </div>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, background: '#F7F5F2', borderBottom: '1px solid #E0DDD8', padding: '10px 16px' }}>
          <span style={{ ...th, position: 'relative', paddingRight: 12 }}>
            Item description
            {/* drag divider — resize the Item column */}
            <span onPointerDown={startResize} title="Drag to resize"
              style={{ position: 'absolute', right: 2, top: -10, bottom: -10, width: 12, cursor: 'col-resize', display: 'flex', justifyContent: 'center', zIndex: 2 }}>
              <span style={{ width: 2, background: '#D8D5CF', height: '100%' }} />
            </span>
          </span>
          <span style={th}>Basis</span>
          <span style={{ ...th, ...cellR }}>Units</span>
          <span style={{ ...th, ...cellR }}>Rate</span>
          <span style={{ ...th, ...cellR }}>Budget $</span>
          <span style={{ ...th, ...cellR }}>GST</span>
          <span style={{ ...th, ...cellR }}>Incl. GST</span>
          <span style={th}>Funded by</span>
          <span style={th}>Phase</span>
          <span style={th}>S-curve</span>
          <span style={th}>Start</span>
          <span style={th}>End</span>
        </div>

        {/* Banded (grouped) or flat rows */}
        {banded ? banded.map(({ def, items: rows }) => {
          const open = !collapsed.has(def.id)
          return (
            <div key={def.id}>
              <div onClick={() => toggle(def.id)} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, padding: '10px 16px', background: '#F5F3F0', borderBottom: '1px solid #E8E5E0', cursor: 'pointer', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: def.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A' }}>{def.label} <span style={{ fontSize: 9, color: '#999', fontWeight: 400 }}>({rows.length} {rows.length === 1 ? 'line' : 'lines'})</span></span>
                </div>
                <span style={{ gridColumn: '2 / -1', textAlign: 'right', color: '#999', fontSize: 10 }}>{open ? '▾' : '▸'}</span>
              </div>
              {open && rows.map((item, idx) => renderRow(item, idx))}
              {renderSubtotal(def.label, rows)}
            </div>
          )
        }) : items.map((item, idx) => renderRow(item, idx))}

        {/* Section total */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, padding: '11px 16px', background: '#F5F3F0', borderTop: '1px solid #E0DDD8', fontWeight: 700, fontSize: 12 }}>
          <span style={{ color: '#1A1A1A', letterSpacing: '0.04em' }}>Section total</span>
          <span /><span /><span />
          <span style={{ color: '#1A1A1A', ...cellR }}>{money(grandBudget)}</span>
          <span style={{ color: '#999', ...cellR }}>{money(grandGst)}</span>
          <span style={{ color: '#1A1A1A', ...cellR }}>{money(grandBudget + grandGst)}</span>
          <span style={{ gridColumn: '8 / -1' }} />
        </div>
      </div>
    </div>
  )
}
