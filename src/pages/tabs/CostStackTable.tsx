import React, { useState, useRef, useMemo } from 'react'
import type { CostLineItem } from '../../db/schema'
import { effAmt, gstOf, isFixed, withBasis, withPct, withUnits, withRate, type CostCtx } from '../../lib/costLine'
import CostLineDetailModal from './CostLineDetailModal'

// Band marker colours for data-driven (by-category) groups. Decorative only —
// the group is named in text beside the dot, so these just separate the bands.
// Muted silver/blue/slate/purple per the ATRIUM palette: no rainbow, and green
// and red stay reserved for good/bad. Tokens so the bands follow light/dark.
const GROUP_PALETTE = ['var(--gold)', 'var(--blue)', 'var(--slate)', 'var(--purple)', 'var(--gold-hi)', 'var(--ink-3)']

// A grouping rule: items whose notes match are gathered under this labelled band.
// `notes` is the value written to a line when it is added to / moved into this group.
export type GroupConfig = { id: string; label: string; color: string; notes: string; match: (item: CostLineItem) => boolean }

// ── Numeric cell ────────────────────────────────────────────────────────────────
// A decimal-friendly numeric input. Binding an input directly to a derived number
// (e.g. `+(pct*100).toFixed(2)`) makes React re-render "2." back to "2" mid-keystroke,
// so you can never type a decimal. This keeps a local text buffer while the field is
// focused — letting you type "2.5", ".0", "0.05" — and commits the parsed value as you
// go. When blurred it shows the formatted committed value. Module-level so its state
// survives parent re-renders (rows keep focus while typing).
function NumCell({ num, onCommit, fmt, placeholder, blankZero = true, style, className }: {
  num: number | null
  onCommit: (n: number) => void
  fmt?: (n: number) => string
  placeholder?: string
  blankZero?: boolean
  style?: React.CSSProperties
  className?: string
}) {
  const [buf, setBuf] = useState<string | null>(null)
  const isBlank = num == null || (blankZero && num === 0)
  const blurred = isBlank ? '' : (fmt ? fmt(num as number) : (num as number).toLocaleString())
  return (
    <input
      type="text"
      inputMode="decimal"
      value={buf != null ? buf : blurred}
      placeholder={placeholder}
      onFocus={() => setBuf(isBlank ? '' : String(num))}
      onChange={e => {
        // Keep digits + a single decimal point, so "2.5" / ".0" / "0.05" all type through.
        let raw = e.target.value.replace(/[^0-9.]/g, '')
        raw = raw.replace(/(\..*)\./g, '$1')
        setBuf(raw)
        const n = parseFloat(raw)
        onCommit(Number.isFinite(n) ? n : 0)
      }}
      onBlur={() => setBuf(null)}
      style={style}
      className={className}
    />
  )
}

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
  // When true, band rows into groups by each line's category (its `notes`), so any
  // number of categories render without a predefined config.
  groupByNotes?: boolean
  // Section name (e.g. "Consultant & Professional Fees") shown in the detail modal.
  sectionLabel?: string
  // The project this section belongs to — needed to upload fee-proposal PDFs.
  projectId?: string
}

// Basis dropdown (fee tabs): direct $ / unit, or a % of a basis that derives the budget.
const BASIS_OPTS: [string, string][] = [['', '$ / Unit'], ['construction', '% of Constr.'], ['gdv', '% of GRV']]

// ── Badge skins ───────────────────────────────────────────────────────────────
// The reference draws Funded-by and Phase as pills. In this app both are live
// dropdowns, so the <select> wears the pill class instead of being replaced by a
// static span — same look, control intact.
// Phase uses the reference's single neutral .b-phase for every phase.
const FUND_BADGE: Record<string, string> = {
  equity: 'b-eq', senior: 'b-sen', debt: 'b-debt', blend: 'b-bl', both: 'b-bl',
}




// Design convention: amounts are entered EX-GST; GST is 10% added on top.
const GST_RATE = 0.1
const money = (n: number) => `$${Math.round(n).toLocaleString()}`

// Fixed widths (px) for every column after the draggable Item column. Wide enough
// that large dollar figures never collide. Item width is user-resizable (descW).
// Basis…End. Trimmed so the whole 12-column line reads without sideways scroll:
// .workspace-content is CSS-zoomed (--ws-zoom, up to 1.4 on large monitors), so the
// real estate is roughly viewport/zoom — about 1180px, not the ~1340 the raw window
// suggests. These + the Item column + actions come to ~1160, which fits.
// (Under the old table-layout:auto the table quietly squeezed itself to fit, which
// is why this never showed — and why the drag did nothing. Fixed layout is honest,
// so the widths have to be too.)
const COLS_AFTER_ITEM = [76, 58, 66, 100, 82, 100, 88, 92, 76, 88, 88] // Basis…End


const PHASE_OPTS: [string, string][] = [['', '—'], ['preacq', 'Pre-acq'], ['acqplan', 'Acq/planning'], ['preconst', 'Pre-const'], ['construction', 'Construction'], ['closeout', 'Close-out'], ['allphases', 'All phases']]
const FUND_OPTS: [string, string][] = [['equity', 'Equity'], ['senior', 'Senior'], ['debt', 'Debt'], ['blend', 'Blend'], ['both', 'Both']]
const SCURVE_OPTS: [string, string][] = [['scurve', 'S-curve'], ['linear', 'Linear'], ['upfront', 'Upfront'], ['backloaded', 'Back']]

// Assign each item to the first matching group; unmatched fall into an "Other" band.
function buildGroups(items: CostLineItem[], groups?: GroupConfig[]) {
  if (!groups || groups.length === 0) return null
  const buckets = groups.map(g => ({ def: g, items: [] as CostLineItem[] }))
  const other: { def: GroupConfig; items: CostLineItem[] } = { def: { id: '_other', label: 'Other', color: 'var(--ink-3)', match: () => true }, items: [] }
  for (const it of items) {
    const b = buckets.find(x => x.def.match(it))
    ;(b ? b.items : other.items).push(it)
  }
  const res = buckets.filter(b => b.items.length)
  if (other.items.length) res.push(other)
  return res
}

export default function CostStackTable({ items, onChange, gstEnabled = true, basisMode = 'basis', groups, constructionValue = 0, gdvValue = 0, groupByNotes = false, sectionLabel = 'Cost item', projectId = '' }: Props) {
  const ctx: CostCtx = { constructionValue, gdvValue }
  // Which line's full detail screen is open (null = none).
  const [openId, setOpenId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (id: string) => { const n = new Set(collapsed); n.has(id) ? n.delete(id) : n.add(id); setCollapsed(n) }

  // Draggable Item ("description") column width — grab the divider to resize; persisted.
  // Default 170 (was 300). With the trimmed columns above (930) + actions (40) the
  // whole line is 1140px. The workspace is CSS-zoomed (--ws-zoom up to 1.4), so the
  // usable width is roughly viewport/zoom — ~1150 at 1680/1.25 — and 1140 leaves a
  // little slack rather than sitting exactly on the edge. All 12 columns read at
  // once; narrower windows still scroll sideways, as the reference does (.gt
  // min-width:1080 inside .scrollx). Drag it wider any time — that now works.
  const [descW, setDescW] = useState<number>(() => {
    const s = typeof localStorage !== 'undefined' ? parseInt(localStorage.getItem('cs.descW') || '', 10) : NaN
    return Number.isFinite(s) ? Math.max(160, Math.min(760, s)) : 170
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
  const newRow = (notes: string): CostLineItem => ({ id: Math.random().toString(36).slice(2) + Date.now(), label: '', amount: 0, notes, sCurve: 'scurve', fundedBy: 'equity' })
  // Add a blank line into a specific group, and move an existing line to another group.
  const addToGroup = (def: GroupConfig) => onChange([...items, newRow(def.notes)])
  const moveToGroup = (id: string, def: GroupConfig) => update(id, { notes: def.notes })

  // Effective groups: explicit configs if given, else one group per distinct category
  // (item.notes) in order of first appearance — data-driven so any catalogue works.
  const effGroups = useMemo<GroupConfig[] | undefined>(() => {
    if (groups && groups.length) return groups
    if (!groupByNotes) return undefined
    const order: string[] = []
    const seen = new Set<string>()
    for (const it of items) {
      const k = (it.notes || '').trim() || 'Uncategorised'
      if (!seen.has(k)) { seen.add(k); order.push(k) }
    }
    return order.map((k, i) => ({ id: k, label: k, color: GROUP_PALETTE[i % GROUP_PALETTE.length], notes: k, match: (it: CostLineItem) => (((it.notes || '').trim()) || 'Uncategorised') === k }))
  }, [groups, groupByNotes, items])
  const groupOf = (it: CostLineItem) => (effGroups || []).find(g => g.match(it))

  // Budget build-up + variations now live in ../../lib/costLine so the table,
  // detail modal and dashboard all agree. `eff`/`gst` bind the shared maths to
  // this table's basis context; the change* handlers merge the returned patch.
  const hasUnitRate = (it: CostLineItem) => (it.units ?? 0) > 0 && (it.baseRate ?? 0) > 0
  const eff = (it: CostLineItem) => effAmt(it, ctx)
  const gst = (it: CostLineItem) => gstOf(it, ctx)
  const changeBasis = (it: CostLineItem, v: string) => update(it.id, withBasis(it, v, ctx))
  const changePct = (it: CostLineItem, pctPercent: number) => update(it.id, withPct(it, pctPercent, ctx))
  const changeUnits = (it: CostLineItem, u: number) => update(it.id, withUnits(it, u, ctx))
  const changeRate = (it: CostLineItem, r: number) => update(it.id, withRate(it, r, ctx))

  const grandBudget = items.reduce((s, i) => s + eff(i), 0)
  const grandGst = items.reduce((s, i) => s + gst(i), 0)

  const banded = buildGroups(items, effGroups)

  // 13 columns: Item · Basis · Units · Rate · Budget $ · GST · Incl. GST ·
  // Funded by · Phase · S-curve · Start · End · actions. Group/subtotal/section
  // rows span to the same 13 so the grid stays true.
  const NCOLS = 13

  // NB: rendered as a plain function (not <Row/>) so inputs keep focus while typing —
  // defining a component inside render remounts every row on each keystroke.
  const renderRow = (item: CostLineItem) => {
    const g = gst(item)
    const isPct = item.feeBasis === 'construction' || item.feeBasis === 'gdv'
    const fundCls = FUND_BADGE[item.fundedBy || 'equity'] || 'b-eq'
    return (
      <tr key={item.id} className="ln">
        {/* Item description — editable, with move/delete/regroup controls (reveal on hover) */}
        <td>
          <span style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
            <span className="acts" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <button className="rowact" onClick={() => moveRow(item.id, -1)} title="Move up">↑</button>
              <button className="rowact" onClick={() => moveRow(item.id, 1)} title="Move down">↓</button>
              <button className="rowact x" onClick={() => removeRow(item.id)} title="Delete row">✕</button>
              {effGroups && effGroups.length > 1 && (
                <select value={groupOf(item)?.id || ''} title="Move to category"
                  onChange={e => { const g = effGroups.find(x => x.id === e.target.value); if (g) moveToGroup(item.id, g) }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 9, color: 'var(--ink-3)', maxWidth: 16, appearance: 'none', outline: 'none', padding: 0 }}>
                  {effGroups.map(g => <option key={g.id} value={g.id} style={{ color: 'var(--ink)' }}>{g.label}</option>)}
                </select>
              )}
            </span>
            <input type="text" value={item.label} onChange={e => update(item.id, { label: e.target.value })} placeholder="Item description"
              className="mini-inp" style={{ width: '100%', maxWidth: 'none', textAlign: 'left', fontFamily: 'var(--sans)', fontSize: 11.5 }} />
          </span>
        </td>
        {/* Basis — dropdown: $ / Unit · % of Constr. · % of GRV */}
        <td>
          <select className="mini-sel" value={item.feeBasis ?? ''} onChange={e => changeBasis(item, e.target.value)}>
            {BASIS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </td>
        {/* Units — editable on every line; typing units on a % line converts it to units × rate */}
        <td className="n">
          <NumCell className="mini-inp" num={isPct ? null : (item.units ?? null)} placeholder="—" onCommit={n => changeUnits(item, n)} />
        </td>
        {/* Rate — pct % for a %-basis line (decimals allowed), otherwise the per-unit rate */}
        <td className="n">
          {isPct ? (
            <NumCell className="mini-inp" num={item.pct != null ? +(item.pct * 100).toFixed(4) : null} blankZero={false} placeholder="0"
              fmt={n => `${+n.toFixed(2)}%`} onCommit={n => changePct(item, n)} />
          ) : (
            <NumCell className="mini-inp" num={item.baseRate ?? null} placeholder="—" onCommit={n => changeRate(item, n)} />
          )}
        </td>
        {/* Budget $ — derived (read-only) when % basis or Units × Rate; else editable */}
        <td className="n">
          {isPct || hasUnitRate(item) || (item.variations && item.variations.length > 0) ? (
            <span style={{ fontWeight: 600 }} title={item.variations && item.variations.length ? `Includes ${item.variations.length} variation(s)` : undefined}>{money(eff(item))}{item.variations && item.variations.length > 0 && <span style={{ color: 'var(--red)', fontSize: 9, marginLeft: 4 }}>▲</span>}</span>
          ) : (
            <input type="text" inputMode="numeric" value={`$${(item.amount || 0).toLocaleString()}`}
              onChange={e => update(item.id, { amount: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0 })}
              className="mini-inp" style={{ width: '100%', fontWeight: 600 }} />
          )}
        </td>
        {/* GST from budget (10%) + Incl. GST */}
        <td className="n" style={{ color: 'var(--ink-3)' }}>{item.gstFree ? '—' : money(g)}</td>
        <td className="n">{money(eff(item) + g)}</td>
        {/* Funded by — the badge IS the control, so it stays a live dropdown */}
        <td>
          <select className={`badge ${fundCls}`} value={item.fundedBy || 'equity'}
            onChange={e => update(item.id, { fundedBy: e.target.value as CostLineItem['fundedBy'] })}>
            {FUND_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </td>
        {/* Phase — badge-skinned dropdown */}
        <td>
          <select className="badge b-phase" value={item.phase || ''}
            onChange={e => update(item.id, { phase: (e.target.value || undefined) as CostLineItem['phase'] })}>
            {PHASE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </td>
        {/* S-curve — editable dropdown */}
        <td>
          <select className="mini-sel" value={item.sCurve || 'scurve'} onChange={e => update(item.id, { sCurve: e.target.value as CostLineItem['sCurve'] })}>
            {SCURVE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </td>
        {/* Start / End — editable month pickers */}
        <td className="n"><input type="month" value={item.startDate?.slice(0, 7) || ''} onChange={e => update(item.id, { startDate: e.target.value })} className="mini-inp" style={{ width: '100%', fontSize: 9 }} /></td>
        <td className="n"><input type="month" value={item.endDate?.slice(0, 7) || ''} onChange={e => update(item.id, { endDate: e.target.value })} className="mini-inp" style={{ width: '100%', fontSize: 9 }} /></td>
        {/* Pricing quick-toggle (Fixed/Variable) + expand to the full detail screen */}
        <td>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <button title={isFixed(item) ? 'Fixed — fee proposal locked in' : 'Variable — not properly priced yet'}
              onClick={() => update(item.id, { pricing: isFixed(item) ? 'variable' : 'fixed' })}
              style={{ border: 'none', borderRadius: 999, padding: '3px 7px', fontSize: 8.5, fontWeight: 700, letterSpacing: '.05em', cursor: 'pointer', color: '#fff', background: isFixed(item) ? 'var(--emerald, #2f7d54)' : 'var(--amber, #c0842c)' }}>
              {isFixed(item) ? 'FIXED' : 'VAR'}
            </button>
            <button className="rowact" title="Open full detail (pricing, PDF, variations, timeline)" onClick={() => setOpenId(item.id)}
              style={{ fontSize: 12 }}>⤢</button>
          </span>
        </td>
      </tr>
    )
  }

  // Group band header — carries the group's own rollup and its "+ row", per the reference.
  const renderGroupHead = (def: GroupConfig, rows: CostLineItem[], open: boolean) => {
    const b = rows.reduce((s, i) => s + eff(i), 0)
    const g = rows.reduce((s, i) => s + gst(i), 0)
    return (
      <tr className="grp" key={`${def.id}-h`}>
        <td onClick={() => toggle(def.id)} style={{ cursor: 'pointer' }}>
          <span className="gname">
            <span className="caret">{open ? '▾' : '▸'}</span>{def.label}
            <span className="gcount">({rows.length} {rows.length === 1 ? 'line' : 'lines'})</span>
          </span>
        </td>
        <td colSpan={3} />
        <td className="n">{money(b)}</td>
        <td className="n">{money(g)}</td>
        <td className="n">{money(b + g)}</td>
        <td colSpan={5} />
        <td>
          <span className="addrow" style={{ padding: '4px 9px', fontSize: 9 }}
            onClick={e => { e.stopPropagation(); addToGroup(def) }} title={`Add a line to ${def.label}`}>+ row</span>
        </td>
      </tr>
    )
  }

  // Per-group subtotal — dashed rule, silver label (reference tr.sub).
  const renderSubtotal = (def: GroupConfig, rows: CostLineItem[]) => {
    const b = rows.reduce((s, i) => s + eff(i), 0)
    const g = rows.reduce((s, i) => s + gst(i), 0)
    return (
      <tr className="sub" key={`${def.id}-s`}>
        <td className="stl">{def.label} subtotal</td>
        <td colSpan={3} />
        <td className="n">{money(b)}</td>
        <td className="n">{money(g)}</td>
        <td className="n">{money(b + g)}</td>
        <td colSpan={5} />
        <td />
      </tr>
    )
  }

  return (
    <div>
      <div className="scrollx">
        <table className="gt">
          {/* Item column keeps its drag-resize; the rest hold the reference widths. */}
          <colgroup>
            <col style={{ width: descW }} />
            {COLS_AFTER_ITEM.map((w, i) => <col key={i} style={{ width: w }} />)}
            <col style={{ width: 84 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ position: 'relative', paddingRight: 14 }}>
                Item description
                {/* drag divider — resize the Item column */}
                <span onPointerDown={startResize} title="Drag to resize"
                  style={{ position: 'absolute', right: 2, top: 0, bottom: 0, width: 12, cursor: 'col-resize', display: 'flex', justifyContent: 'center', zIndex: 2 }}>
                  <span style={{ width: 2, background: 'var(--border-hi)', height: '100%' }} />
                </span>
              </th>
              <th>Basis</th>
              <th className="n">Units</th>
              <th className="n">Rate</th>
              <th className="n">Budget $</th>
              <th className="n">GST</th>
              <th className="n">Incl. GST</th>
              <th>Funded by</th>
              <th>Phase</th>
              <th>S-curve</th>
              <th>Start</th>
              <th>End</th>
              <th>Pricing</th>
            </tr>
          </thead>
          <tbody>
            {/* Banded (grouped) or flat rows */}
            {banded
              ? banded.flatMap(({ def, items: rows }) => {
                  const open = !collapsed.has(def.id)
                  return [
                    renderGroupHead(def, rows, open),
                    ...(open ? rows.map(item => renderRow(item)) : []),
                    renderSubtotal(def, rows),
                  ]
                })
              : items.map(item => renderRow(item))}
            {items.length === 0 && (
              <tr>
                <td colSpan={NCOLS} style={{ textAlign: 'center', color: 'var(--faint)', padding: 26 }}>
                  No items yet — <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={add}>add a row</span> to begin.
                </td>
              </tr>
            )}
            {/* Section total (reference tr.sect) */}
            <tr className="sect">
              <td className="stl2">Section total</td>
              <td colSpan={3} />
              <td className="n">{money(grandBudget)}</td>
              <td className="n">{money(grandGst)}</td>
              <td className="n">{money(grandBudget + grandGst)}</td>
              <td colSpan={5} />
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 14 }}>
        <span className="addrow" onClick={add}>+ ADD ROW</span>
      </div>

      {/* Full detail screen for the open line */}
      {openId && (() => {
        const it = items.find(i => i.id === openId)
        if (!it) return null
        return (
          <CostLineDetailModal
            item={it}
            sectionLabel={sectionLabel}
            groupLabel={groupOf(it)?.label}
            projectId={projectId}
            ctx={ctx}
            onPatch={patch => update(it.id, patch)}
            onDelete={() => removeRow(it.id)}
            onClose={() => setOpenId(null)}
          />
        )
      })()}
    </div>
  )
}
