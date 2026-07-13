import React, { useState } from 'react'
import type { CostLineItem } from '../../db/schema'

interface Props {
  items: CostLineItem[]
  onChange: (items: CostLineItem[]) => void
  gstEnabled?: boolean
}

// ── Category model ────────────────────────────────────────────────────────────
// Each line's category is stored in its `notes` field on seeded data. We map that
// to a display group. Anything unrecognised falls into "Other consultants" so the
// table renders correctly for EVERY project, not just the HAAVN seed.
type GroupDef = { id: string; label: string; color: string; match: (notes: string) => boolean }

const GROUPS: GroupDef[] = [
  { id: 'architecture',  label: 'Architecture',                     color: '#AFA9EC', match: n => /architect/i.test(n) },
  { id: 'civil',         label: 'Civil & structural engineering',   color: '#85B7EB', match: n => /civil|structural/i.test(n) },
  { id: 'acoustic',      label: 'Acoustic engineering',             color: '#9FE1CB', match: n => /acoustic/i.test(n) },
  { id: 'environmental', label: 'Environmental & planning',         color: '#C0DD97', match: n => /environ|planning/i.test(n) },
  { id: 'other',         label: 'Other consultants',                color: '#FAC775', match: () => true },
]

function groupOf(item: CostLineItem): GroupDef {
  const n = item.notes || ''
  return GROUPS.find(g => g.match(n)) || GROUPS[GROUPS.length - 1]
}

// Group items by category, preserving insertion order within each group.
function groupItems(items: CostLineItem[]): { def: GroupDef; items: CostLineItem[] }[] {
  const buckets = new Map<string, CostLineItem[]>()
  for (const it of items) {
    const g = groupOf(it)
    if (!buckets.has(g.id)) buckets.set(g.id, [])
    buckets.get(g.id)!.push(it)
  }
  // Render in canonical GROUPS order, skipping empties.
  return GROUPS.filter(g => buckets.get(g.id)?.length).map(g => ({ def: g, items: buckets.get(g.id)! }))
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

// ── Funding ───────────────────────────────────────────────────────────────────
function fundingDisplay(fundedBy?: string): { label: string; dots: string[] } {
  switch (fundedBy) {
    case 'equity': return { label: 'Equity', dots: ['#5DCAA5'] }
    case 'debt':
    case 'senior': return { label: 'Senior', dots: ['#85B7EB'] }
    case 'blend':
    case 'both':   return { label: 'Both',   dots: ['#5DCAA5', '#85B7EB'] }
    default:       return { label: fundedBy ? fundedBy : 'Equity', dots: ['#5DCAA5'] }
  }
}

const S_CURVE_LABEL: Record<string, string> = {
  scurve: 'S-curve', linear: 'Linear', upfront: 'Upfront', backloaded: 'Back',
}

function fmtMonth(ym?: string): string {
  if (!ym) return '—'
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return '—'
  return new Date(y, m - 1, 1).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
}

// Design convention: amounts are entered EX-GST; GST is 10% added on top.
const GST_RATE = 0.1

// Grid: Item | Basis | Rate | Budget $ | GST | Incl. GST | Funded By | Phase | S-Curve | Start | End
// Sized so all 11 columns fit a normal desktop content width without horizontal scroll.
const GRID = 'minmax(150px, 1.5fr) 56px 44px 84px 66px 88px 82px 92px 62px 52px 52px'

const cellR: React.CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const money = (n: number) => `$${Math.round(n).toLocaleString()}`

export default function ConsultantsLineItemTable({ items, onChange, gstEnabled = true }: Props) {
  const groups = groupItems(items)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    const next = new Set(collapsed)
    next.has(id) ? next.delete(id) : next.add(id)
    setCollapsed(next)
  }

  const update = (id: string, patch: Partial<CostLineItem>) =>
    onChange(items.map(it => (it.id === id ? { ...it, ...patch } : it)))

  const add = () =>
    onChange([...items, {
      id: Math.random().toString(36).slice(2) + Date.now(),
      label: '', amount: 0, notes: '', sCurve: 'scurve', fundedBy: 'equity',
    }])

  const gstOf = (it: CostLineItem) => (it.gstFree || !gstEnabled ? 0 : (it.amount || 0) * GST_RATE)

  const grandBudget = items.reduce((s, i) => s + (i.amount || 0), 0)
  const grandGst = items.reduce((s, i) => s + gstOf(i), 0)

  const th: React.CSSProperties = { fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, whiteSpace: 'nowrap' }

  return (
    <div style={{ background: '#fff', border: '1px solid #E8E5E0', borderRadius: 6, overflowX: 'auto' }}>
      <div style={{ minWidth: 900 }}>
        {/* Top toolbar — "+ add row" sits at the top per the design */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 16px', borderBottom: '1px solid #F0EDE8' }}>
          <button onClick={add} style={{ fontSize: 11, fontWeight: 500, color: '#2A7A4F', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>+ add row</button>
        </div>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, background: '#F7F5F2', borderBottom: '1px solid #E0DDD8', padding: '10px 16px' }}>
          <span style={th}>Item</span>
          <span style={th}>Basis</span>
          <span style={th}>Rate</span>
          <span style={{ ...th, ...cellR }}>Budget $</span>
          <span style={{ ...th, ...cellR }}>GST</span>
          <span style={{ ...th, ...cellR }}>Incl. GST</span>
          <span style={th}>Funded by</span>
          <span style={th}>Phase</span>
          <span style={th}>S-curve</span>
          <span style={th}>Start</span>
          <span style={th}>End</span>
        </div>

        {/* Groups */}
        {groups.map(({ def, items: groupRows }) => {
          const open = !collapsed.has(def.id)
          const gBudget = groupRows.reduce((s, i) => s + (i.amount || 0), 0)
          const gGst = groupRows.reduce((s, i) => s + gstOf(i), 0)

          return (
            <div key={def.id}>
              {/* Group header */}
              <div onClick={() => toggle(def.id)} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, padding: '10px 16px', background: '#F5F3F0', borderBottom: '1px solid #E8E5E0', cursor: 'pointer', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: def.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A' }}>
                    {def.label} <span style={{ fontSize: 9, color: '#999', fontWeight: 400 }}>({groupRows.length} {groupRows.length === 1 ? 'line' : 'lines'})</span>
                  </span>
                </div>
                <span style={{ gridColumn: '2 / -1', textAlign: 'right', color: '#999', fontSize: 10 }}>{open ? '▾' : '▸'}</span>
              </div>

              {/* Rows */}
              {open && groupRows.map((item, idx) => {
                const gst = gstOf(item)
                const fund = fundingDisplay(item.fundedBy)
                const badge = item.phase ? PHASE_BADGE[item.phase] : undefined
                return (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, padding: '8px 16px', borderBottom: '1px solid #F0EDE8', background: idx % 2 === 0 ? '#fff' : '#FDFCFB', alignItems: 'center' }}>
                    <input
                      type="text" value={item.label}
                      onChange={e => update(item.id, { label: e.target.value })}
                      placeholder="Item description"
                      style={{ border: 'none', background: 'transparent', fontSize: 11, color: '#1A1A1A', outline: 'none', width: '100%' }}
                    />
                    <span style={{ fontSize: 10, color: '#B4B2AD' }}>$ fixed</span>
                    <span style={{ fontSize: 10, color: '#B4B2AD' }}>—</span>
                    <input
                      type="text" inputMode="numeric" value={(item.amount || 0).toLocaleString()}
                      onChange={e => update(item.id, { amount: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0 })}
                      style={{ border: 'none', background: 'transparent', fontSize: 11, fontWeight: 700, color: '#1A1A1A', outline: 'none', width: '100%', ...cellR }}
                    />
                    <span style={{ fontSize: 10, color: '#999', ...cellR }}>{money(gst)}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#1A1A1A', ...cellR }}>{money((item.amount || 0) + gst)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ display: 'inline-flex', gap: 2 }}>
                        {fund.dots.map((c, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />)}
                      </span>
                      <span style={{ fontSize: 10, color: '#1A1A1A' }}>{fund.label}</span>
                    </div>
                    {badge ? (
                      <span style={{ display: 'inline-flex', alignSelf: 'center', padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 600, background: badge.bg, color: badge.text, whiteSpace: 'nowrap' }}>{badge.label}</span>
                    ) : <span style={{ fontSize: 9, color: '#BBB' }}>—</span>}
                    <span style={{ fontSize: 10, color: '#7A7975' }}>{item.sCurve ? (S_CURVE_LABEL[item.sCurve] || item.sCurve) : '—'}</span>
                    <span style={{ fontSize: 10, color: '#999' }}>{fmtMonth(item.startDate)}</span>
                    <span style={{ fontSize: 10, color: '#999' }}>{fmtMonth(item.endDate)}</span>
                  </div>
                )
              })}

              {/* Group subtotal */}
              <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, padding: '9px 16px', borderBottom: '1px solid #E8E5E0', background: '#F5F3F0', fontWeight: 600, fontSize: 11 }}>
                <span style={{ color: '#1A1A1A', paddingLeft: 16 }}>{def.label} subtotal</span>
                <span /><span />
                <span style={{ color: '#2A7A4F', ...cellR }}>{money(gBudget)}</span>
                <span style={{ color: '#999', ...cellR }}>{money(gGst)}</span>
                <span style={{ color: '#2A7A4F', ...cellR }}>{money(gBudget + gGst)}</span>
                <span style={{ gridColumn: '7 / -1' }} />
              </div>
            </div>
          )
        })}

        {/* Section total */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, padding: '11px 16px', background: '#F5EDD6', borderTop: '2px solid #E8D9A0', fontWeight: 700, fontSize: 12 }}>
          <span style={{ color: '#8A6A10', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Section total — consultants</span>
          <span /><span />
          <span style={{ color: '#2A7A4F', ...cellR }}>{money(grandBudget)}</span>
          <span style={{ color: '#999', ...cellR }}>{money(grandGst)}</span>
          <span style={{ color: '#2A7A4F', ...cellR }}>{money(grandBudget + grandGst)}</span>
          <span style={{ gridColumn: '7 / -1' }} />
        </div>

      </div>
    </div>
  )
}
