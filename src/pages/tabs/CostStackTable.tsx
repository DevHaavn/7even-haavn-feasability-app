import React, { useState } from 'react'
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
}

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

// Grid: Item | Basis/Units | Rate/BaseRate | Budget $ | GST | Incl. GST | Funded By | Phase | S-Curve | Start | End
const GRID = 'minmax(150px, 1.5fr) 60px 60px 84px 66px 88px 82px 92px 62px 52px 52px'
const cellR: React.CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' }

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

export default function CostStackTable({ items, onChange, gstEnabled = true, basisMode = 'basis', groups }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (id: string) => { const n = new Set(collapsed); n.has(id) ? n.delete(id) : n.add(id); setCollapsed(n) }

  const update = (id: string, patch: Partial<CostLineItem>) => onChange(items.map(it => (it.id === id ? { ...it, ...patch } : it)))
  const add = () => onChange([...items, { id: Math.random().toString(36).slice(2) + Date.now(), label: '', amount: 0, notes: '', sCurve: 'scurve', fundedBy: 'equity' }])

  const gstOf = (it: CostLineItem) => (it.gstFree || !gstEnabled ? 0 : (it.amount || 0) * GST_RATE)
  const grandBudget = items.reduce((s, i) => s + (i.amount || 0), 0)
  const grandGst = items.reduce((s, i) => s + gstOf(i), 0)

  const th: React.CSSProperties = { fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, whiteSpace: 'nowrap' }
  const banded = buildGroups(items, groups)

  const Row = ({ item, idx }: { item: CostLineItem; idx: number }) => {
    const gst = gstOf(item)
    const fund = fundingDisplay(item.fundedBy)
    const badge = item.phase ? PHASE_BADGE[item.phase] : undefined
    const isPct = item.feeBasis === 'construction' || item.feeBasis === 'gdv'
    return (
      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, padding: '8px 16px', borderBottom: '1px solid #F0EDE8', background: idx % 2 === 0 ? '#fff' : '#FDFCFB', alignItems: 'center' }}>
        <input type="text" value={item.label} onChange={e => update(item.id, { label: e.target.value })} placeholder="Item description"
          style={{ border: 'none', background: 'transparent', fontSize: 11, color: '#1A1A1A', outline: 'none', width: '100%' }} />
        {basisMode === 'units' ? (
          <>
            <span style={{ fontSize: 10, color: '#B4B2AD' }}>{isPct ? '%' : 'sqm'}</span>
            <span style={{ fontSize: 10, color: '#B4B2AD', ...cellR }}>{item.baseRate ? item.baseRate.toLocaleString() : (isPct ? '%' : '—')}</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 10, color: '#B4B2AD' }}>{basisLabel(item)}</span>
            <span style={{ fontSize: 10, color: '#B4B2AD', ...cellR }}>{item.pct ? `${(item.pct * 100).toFixed(1)}%` : (item.baseRate ? item.baseRate.toLocaleString() : '—')}</span>
          </>
        )}
        <input type="text" inputMode="numeric" value={(item.amount || 0).toLocaleString()}
          onChange={e => update(item.id, { amount: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0 })}
          style={{ border: 'none', background: 'transparent', fontSize: 11, fontWeight: 700, color: '#1A1A1A', outline: 'none', width: '100%', ...cellR }} />
        <span style={{ fontSize: 10, color: '#999', ...cellR }}>{item.gstFree || !gstEnabled ? '—' : money(gst)}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: '#1A1A1A', ...cellR }}>{money((item.amount || 0) + gst)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-flex', gap: 2 }}>{fund.dots.map((c, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />)}</span>
          <span style={{ fontSize: 10, color: '#1A1A1A' }}>{fund.label}</span>
        </div>
        {badge
          ? <span style={{ display: 'inline-flex', alignSelf: 'center', padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 600, background: badge.bg, color: badge.text, whiteSpace: 'nowrap' }}>{badge.label}</span>
          : <span style={{ fontSize: 9, color: '#BBB' }}>—</span>}
        <span style={{ fontSize: 10, color: '#7A7975' }}>{item.sCurve ? (S_CURVE_LABEL[item.sCurve] || item.sCurve) : '—'}</span>
        <span style={{ fontSize: 10, color: '#999' }}>{fmtMonth(item.startDate)}</span>
        <span style={{ fontSize: 10, color: '#999' }}>{fmtMonth(item.endDate)}</span>
      </div>
    )
  }

  const Subtotal = ({ label, rows }: { label: string; rows: CostLineItem[] }) => {
    const b = rows.reduce((s, i) => s + (i.amount || 0), 0)
    const g = rows.reduce((s, i) => s + gstOf(i), 0)
    return (
      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, padding: '9px 16px', borderBottom: '1px solid #E8E5E0', background: '#F5F3F0', fontWeight: 600, fontSize: 11 }}>
        <span style={{ color: '#1A1A1A', paddingLeft: 16 }}>{label} subtotal</span>
        <span /><span />
        <span style={{ color: '#2A7A4F', ...cellR }}>{money(b)}</span>
        <span style={{ color: '#999', ...cellR }}>{money(g)}</span>
        <span style={{ color: '#2A7A4F', ...cellR }}>{money(b + g)}</span>
        <span style={{ gridColumn: '7 / -1' }} />
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #E8E5E0', borderRadius: 6, overflowX: 'auto' }}>
      <div style={{ minWidth: 900 }}>
        {/* + add row at the top */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 16px', borderBottom: '1px solid #F0EDE8' }}>
          <button onClick={add} style={{ fontSize: 11, fontWeight: 500, color: '#2A7A4F', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>+ add row</button>
        </div>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, background: '#F7F5F2', borderBottom: '1px solid #E0DDD8', padding: '10px 16px' }}>
          <span style={th}>Item</span>
          <span style={th}>{basisMode === 'units' ? 'Units' : 'Basis'}</span>
          <span style={{ ...th, ...cellR }}>{basisMode === 'units' ? 'Base rate' : 'Rate'}</span>
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
              {open && rows.map((item, idx) => <Row key={item.id} item={item} idx={idx} />)}
              <Subtotal label={def.label} rows={rows} />
            </div>
          )
        }) : items.map((item, idx) => <Row key={item.id} item={item} idx={idx} />)}

        {/* Section total */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, padding: '11px 16px', background: '#F5F3F0', borderTop: '1px solid #E0DDD8', fontWeight: 700, fontSize: 12 }}>
          <span style={{ color: '#1A1A1A', letterSpacing: '0.04em' }}>Section total</span>
          <span /><span />
          <span style={{ color: '#1A1A1A', ...cellR }}>{money(grandBudget)}</span>
          <span style={{ color: '#999', ...cellR }}>{money(grandGst)}</span>
          <span style={{ color: '#1A1A1A', ...cellR }}>{money(grandBudget + grandGst)}</span>
          <span style={{ gridColumn: '7 / -1' }} />
        </div>
      </div>
    </div>
  )
}
