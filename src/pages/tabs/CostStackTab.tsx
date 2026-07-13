import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useAutosave } from '../../lib/useAutosave'
import { useStore } from '../../store'
import { SectionHeading, FieldRow, NumberInput, PctInput, Button } from '../../components/ui'
import { calculateCostStack } from '../../engine/costStack'
import { computeLandCost } from '../../engine/landCost'
import { getCostPresets, getProjectGDV } from '../../db'
import type { CostStack, CostLineItem, DetailedCostStack, SCurveProfile, FundingSource } from '../../db/schema'
import { COST_PHASES } from '../../db/schema'
import { spreadWeights } from '../../engine/cashflow'
import { useRole } from '../../lib/role'
import { getProjectAdminSpend, projectLinkFor } from '../capital/BudgetsAdmin'
import CostStackTable, { type GroupConfig } from './CostStackTable'

// Which sections band their rows into labelled groups (matching the design).
// Consultants → 5 discipline groups; Headworks → utilities vs environmental.
// Every other section renders flat.
const COST_GROUPS: Record<string, GroupConfig[] | undefined> = {
  consultants: [
    { id: 'arch',     label: 'Architecture',                   color: '#AFA9EC', notes: 'Architecture',        match: it => /architect/i.test(it.notes || '') },
    { id: 'civil',    label: 'Civil & structural engineering', color: '#85B7EB', notes: 'Civil & structural',  match: it => /civil|structural/i.test(it.notes || '') },
    { id: 'acoustic', label: 'Acoustic engineering',           color: '#9FE1CB', notes: 'Acoustic',            match: it => /acoustic/i.test(it.notes || '') },
    { id: 'env',      label: 'Environmental & planning',       color: '#C0DD97', notes: 'Environmental',       match: it => /environ/i.test(it.notes || '') },
    { id: 'other',    label: 'Other consultants',              color: '#FAC775', notes: 'Other',               match: () => true },
  ],
  headworks: [
    { id: 'util', label: 'Utility connections',       color: '#85B7EB', notes: 'Utility',       match: it => /utilit/i.test(it.notes || '') },
    { id: 'env',  label: 'Environmental consultants', color: '#9FE1CB', notes: 'Environmental', match: it => /environ/i.test(it.notes || '') },
  ],
}

interface Props { projectId: string }

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n.toLocaleString()}`

// Live spend the admin / Xero register has tracked against this project.
// Only shows for projects linked to a budget entity (Preston, Caloundra, …).
function AdminSpendBanner({ projectId, tdc }: { projectId: string; tdc: number }) {
  if (!projectLinkFor(projectId)) return null
  const { spend, awaiting, count } = getProjectAdminSpend(projectId)
  if (count === 0 && spend === 0) return null
  const pct = tdc > 0 ? spend / tdc : 0
  const over = tdc > 0 && spend > tdc
  const warn = pct > 0.85
  const col = over ? '#9B2335' : warn ? '#B8860B' : '#2A7A4F'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '10px 16px', background: '#F5F3F0', borderBottom: '2px solid #E0DDD8' }}>
      <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', fontWeight: 700 }}>Admin · Xero tracked spend</span>
      <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#1A1A1A', fontWeight: 700 }}>${spend.toLocaleString()}</span>
      <span style={{ fontSize: 11, color: '#999' }}>of {fmt(tdc)} TDC · {(pct * 100).toFixed(0)}%</span>
      {awaiting > 0 && <span style={{ fontSize: 10, color: '#B8860B' }}>${awaiting.toLocaleString()} awaiting</span>}
      <span style={{ marginLeft: 'auto', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: col }}>
        {over ? '⚠ Over budget' : warn ? '● Approaching budget' : '● On budget'}
      </span>
      <div style={{ flexBasis: '100%', height: 5, borderRadius: 3, background: '#E0DDD8', overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(2, Math.min(100, pct * 100))}%`, height: '100%', background: col }} />
      </div>
    </div>
  )
}

// ── Inner sub-tab bar ─────────────────────────────────────────────────────────
const INNER_TABS = [
  { id: 'summary',     label: 'Summary',                        short: 'Summary' },
  { id: 'hard',        label: 'Construction Costs',             short: 'Construction' },
  { id: 'consultants', label: 'Consultant & Professional Fees', short: 'Consultants' },
  { id: 'statutory',   label: 'Statutory Fees',                 short: 'Statutory' },
  { id: 'headworks',   label: 'Headworks & Enviro',            short: 'Headworks & Env.' },
  { id: 'management',  label: 'Management Fees',                 short: 'Management' },
  { id: 'marketing',   label: 'Marketing & Advertising',        short: 'Marketing' },
]

function InnerTabBar({ active, onChange, tabs = INNER_TABS }: { active: string; onChange: (id: string) => void; tabs?: typeof INNER_TABS }) {
  return (
    <div style={{ display: 'flex', borderBottom: '2px solid #E0DDD8', background: '#F5F3F0', flexShrink: 0 }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          title={t.label}
          style={{
            flex: 1, minWidth: 0, textAlign: 'center',
            padding: '10px 6px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
            color: active === t.id ? '#1A1A1A' : '#999',
            borderBottom: active === t.id ? '2px solid #C4973A' : '2px solid transparent',
            marginBottom: -2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            transition: 'color 0.15s',
          }}
        >
          {t.short ?? t.label}
        </button>
      ))}
    </div>
  )
}

// ── Line-item table ───────────────────────────────────────────────────────────
// ── CFO cost-schedule helpers ─────────────────────────────────────────────────
const S_CURVE_OPTS: { id: SCurveProfile; label: string }[] = [
  { id: 'scurve', label: 'S-Curve' },
  { id: 'linear', label: 'Linear' },
  { id: 'upfront', label: 'Front-loaded' },
  { id: 'backloaded', label: 'Back-loaded' },
]
const FUNDING_OPTS: { id: FundingSource; label: string }[] = [
  { id: 'equity', label: 'Equity' },
  { id: 'debt', label: 'Debt' },
  { id: 'blend', label: 'Blend' },
]
function monthsBetween(start?: string, end?: string): string[] {
  if (!start || !end) return []
  const [sy, sm] = start.slice(0, 7).split('-').map(Number)
  const [ey, em] = end.slice(0, 7).split('-').map(Number)
  if (!sy || !sm || !ey || !em) return []
  const out: string[] = []
  let y = sy, m = sm, guard = 0
  while ((y < ey || (y === ey && m <= em)) && guard < 360) {
    out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++ }; guard++
  }
  return out
}
function fmtMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
}
const cellInput: React.CSSProperties = { background: '#fff', border: '1px solid #E0DDD8', borderRadius: 4, padding: '5px 6px', fontSize: 11, color: '#1A1A1A', outline: 'none', width: '100%' }

function LineItemTable({ items, onChange, constructionValue = 0, gdvValue = 0, showBasis = false, gstEnabled = false }: { items: CostLineItem[]; onChange: (items: CostLineItem[]) => void; constructionValue?: number; gdvValue?: number; showBasis?: boolean; gstEnabled?: boolean }) {
  const basisValue = (fb?: 'construction' | 'gdv') => (fb === 'gdv' ? gdvValue : constructionValue)
  const [openId, setOpenId] = useState<string | null>(null)
  // Derive the budget from the CFO's build-up: % of a basis, or Units × Base Rate.
  function derive(it: CostLineItem): number {
    if (it.feeBasis === 'construction') return Math.round((it.pct ?? 0) * constructionValue)
    if (it.feeBasis === 'gdv') return Math.round((it.pct ?? 0) * gdvValue)
    if ((it.units ?? 0) > 0 && (it.baseRate ?? 0) > 0) return Math.round((it.units ?? 0) * (it.baseRate ?? 0))
    return it.amount || 0
  }
  const isDerived = (it: CostLineItem) => !!it.feeBasis || ((it.units ?? 0) > 0 && (it.baseRate ?? 0) > 0)
  const gstOf = (it: CostLineItem) => (it.gstFree || !gstEnabled) ? 0 : (it.amount || 0) / 11
  // Drag-resizable "Item Description" column so long consultant/trade names can
  // be read in full. Persisted per browser so a user's preferred width sticks.
  const [descW, setDescW] = useState<number>(() => {
    const s = typeof localStorage !== 'undefined' ? parseInt(localStorage.getItem('cs.descW') || '', 10) : NaN
    return Number.isFinite(s) ? Math.max(200, Math.min(760, s)) : 320
  })
  const drag = useRef<{ startX: number; startW: number } | null>(null)
  useEffect(() => {
    function move(e: PointerEvent) {
      if (!drag.current) return
      const w = Math.max(200, Math.min(760, drag.current.startW + (e.clientX - drag.current.startX)))
      descWRef.current = w
      setDescW(w)
    }
    function up() {
      if (!drag.current) return
      drag.current = null
      document.body.style.cursor = ''
      try { localStorage.setItem('cs.descW', String(Math.round(descWRef.current))) } catch { /* no-op */ }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [])
  const descWRef = useRef(descW); descWRef.current = descW
  function update(id: string, patch: Partial<CostLineItem>) {
    onChange(items.map(item => item.id === id ? { ...item, ...patch } : item))
  }
  // Apply a patch to the build-up inputs and re-derive the budget in one step.
  function updateCalc(item: CostLineItem, patch: Partial<CostLineItem>) {
    const merged = { ...item, ...patch }
    update(item.id, { ...patch, amount: derive(merged) })
  }
  function remove(id: string) { onChange(items.filter(item => item.id !== id)) }
  function add() {
    onChange([...items, { id: Math.random().toString(36).slice(2) + Date.now(), label: '', amount: 0, notes: '', sCurve: 'scurve', fundedBy: 'equity' }])
  }
  function autoSpread(item: CostLineItem) {
    const months = monthsBetween(item.startDate, item.endDate)
    if (months.length === 0) return
    const w = spreadWeights(item.sCurve ?? 'scurve', months.length)
    const monthly: Record<string, number> = {}
    months.forEach((mo, i) => { monthly[mo] = Math.round((item.amount || 0) * w[i]) })
    update(item.id, { monthly })
  }
  const total = items.reduce((s, i) => s + (i.amount || 0), 0)
  const gstTotal = items.reduce((s, i) => s + gstOf(i), 0)
  // Column build-up — Basis dropdown only shows on the fee tabs (consultants etc).
  const cols: { w: number; h: string }[] = [
    { w: descW, h: 'Item Description' },
    ...(showBasis ? [{ w: 116, h: 'Basis' }] : []),
    { w: 66, h: 'Units' },
    { w: 100, h: 'Base Rate' },
    { w: 130, h: 'Budget ($)' },
    { w: 100, h: 'GST' },
    { w: 96, h: 'Start' },
    { w: 96, h: 'End' },
    { w: 104, h: 'S-Curve' },
    { w: 112, h: 'Funded By' },
    { w: 118, h: 'Phase' },
    { w: 28, h: '' },
    { w: 26, h: '' },
  ]
  const GRID = cols.map(c => `${c.w}px`).join(' ')
  const MINW = cols.reduce((s, c) => s + c.w, 0) + (cols.length - 1) * 8 + 28

  return (
    <div style={{ background: '#fff', border: '1px solid #E8E5E0', overflowX: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '8px 14px', background: '#F7F5F2', borderBottom: '1px solid #E0DDD8', minWidth: MINW }}>
        {cols.map((c, i) => (
          <span key={i} style={{ position: 'relative', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', fontWeight: 600 }}>
            {c.h}
            {i === 0 && (
              <span
                title="Drag to widen — read full item names"
                onPointerDown={e => { drag.current = { startX: e.clientX, startW: descW }; document.body.style.cursor = 'col-resize'; e.preventDefault() }}
                style={{ position: 'absolute', top: -8, right: -8, width: 14, height: 26, cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span style={{ width: 2, height: 14, background: '#C9C4BC', borderRadius: 2, boxShadow: '3px 0 0 #E4DFD8' }} />
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Rows */}
      {items.map((item, idx) => {
        const months = monthsBetween(item.startDate, item.endDate)
        const scheduled = months.reduce((s, mo) => s + (item.monthly?.[mo] || 0), 0)
        const isOpen = openId === item.id
        const eqPct = item.equityPct ?? 0.5
        return (
          <div key={item.id} style={{ borderBottom: '1px solid #F0EDE8', background: idx % 2 === 0 ? '#fff' : '#FDFCFB', minWidth: MINW }}>
            <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '7px 14px', alignItems: 'center' }}>
              <input style={{ ...cellInput, border: '1px solid transparent', background: 'transparent', fontSize: 12 }}
                value={item.label} placeholder="Item description" title={item.label || undefined}
                onChange={e => update(item.id, { label: e.target.value })} />

              {/* Basis — fee tabs only: $ / Unit, % of Construction, or % of GRV */}
              {showBasis && (
                <select style={{ ...cellInput, fontSize: 10, padding: '5px 3px' }} value={item.feeBasis ?? ''} title="How this line is built up"
                  onChange={e => { const v = e.target.value; updateCalc(item, { feeBasis: (v || undefined) as CostLineItem['feeBasis'] }) }}>
                  <option value="">$ / Unit</option>
                  <option value="construction">% of Constr.</option>
                  <option value="gdv">% of GRV</option>
                </select>
              )}

              {/* Units — quantity (n/a on % basis lines) */}
              <input type="number" min={0} title={item.feeBasis ? 'Not used for % basis lines' : 'Quantity'}
                style={{ ...cellInput, border: '1px solid transparent', background: 'transparent', fontFamily: 'monospace', textAlign: 'right', color: item.feeBasis ? '#CCC' : '#1A1A1A' }}
                value={item.feeBasis ? '' : (item.units || '')} placeholder={item.feeBasis ? '—' : '0'} disabled={!!item.feeBasis}
                onChange={e => updateCalc(item, { units: parseFloat(e.target.value) || 0 })} />

              {/* Base Rate — $ per unit, or the percentage when a % basis is chosen */}
              {item.feeBasis ? (
                <div style={{ display: 'flex', alignItems: 'center' }} title="Percentage of the chosen basis">
                  <input type="number" min={0} step={0.25} style={{ ...cellInput, border: '1px solid transparent', background: 'transparent', fontFamily: 'monospace', textAlign: 'right' }}
                    value={item.pct != null ? +(item.pct * 100).toFixed(2) : ''} placeholder="0"
                    onChange={e => updateCalc(item, { pct: (parseFloat(e.target.value) || 0) / 100 })} />
                  <span style={{ color: '#BBB', fontSize: 10, marginLeft: 2 }}>%</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center' }} title="$ per unit">
                  <span style={{ color: '#BBB', fontSize: 11, marginRight: 3 }}>$</span>
                  <input type="number" min={0} style={{ ...cellInput, border: '1px solid transparent', background: 'transparent', fontFamily: 'monospace' }}
                    value={item.baseRate || ''} placeholder="0"
                    onChange={e => updateCalc(item, { baseRate: parseFloat(e.target.value) || 0 })} />
                </div>
              )}

              {/* Budget — auto-derived when built up; editable otherwise */}
              {isDerived(item) ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }} title="Auto-calculated budget">
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>${(item.amount || 0).toLocaleString()}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#BBB', fontSize: 11, marginRight: 3 }}>$</span>
                  <input type="number" min={0} style={{ ...cellInput, border: '1px solid transparent', background: 'transparent', fontFamily: 'monospace' }}
                    value={item.amount || ''} placeholder="0"
                    onChange={e => update(item.id, { amount: parseFloat(e.target.value) || 0 })} />
                </div>
              )}

              {/* GST component — click to toggle this line GST-free */}
              <button onClick={() => update(item.id, { gstFree: !item.gstFree })}
                title={item.gstFree ? 'GST-free — click to include GST' : 'Click to mark GST-free'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right', fontFamily: 'monospace', fontSize: 11,
                  color: item.gstFree ? '#C9C4BC' : '#2A7A4F', textDecoration: item.gstFree ? 'line-through' : 'none', padding: 0 }}>
                {item.gstFree ? 'excl' : `$${Math.round(gstOf(item)).toLocaleString()}`}
              </button>

              <input type="month" style={cellInput} value={item.startDate ?? ''} onChange={e => update(item.id, { startDate: e.target.value })} />
              <input type="month" style={cellInput} value={item.endDate ?? ''} onChange={e => update(item.id, { endDate: e.target.value })} />
              <select style={cellInput} value={item.sCurve ?? 'scurve'} onChange={e => update(item.id, { sCurve: e.target.value as SCurveProfile })}>
                {S_CURVE_OPTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <select style={cellInput} value={item.fundedBy ?? 'equity'} onChange={e => update(item.id, { fundedBy: e.target.value as FundingSource })}>
                {FUNDING_OPTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              {/* Phase — which delivery phase this line relates to (links to cashflow & programme) */}
              <select style={cellInput} value={item.phase ?? ''} onChange={e => update(item.id, { phase: (e.target.value || undefined) as CostLineItem['phase'] })}>
                <option value="">—</option>
                {COST_PHASES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <button onClick={() => setOpenId(isOpen ? null : item.id)} title="Monthly cashflow & notes"
                style={{ background: 'none', border: 'none', color: isOpen ? '#1A1A1A' : '#BBB', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>
                {isOpen ? '▾' : '▸'}
              </button>
              <button onClick={() => remove(item.id)}
                style={{ background: 'none', border: 'none', color: '#DDD', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#9B2335')} onMouseLeave={e => (e.currentTarget.style.color = '#DDD')}>×</button>
            </div>

            {/* Expandable detail — funding split, notes & month-by-month cashflow */}
            {isOpen && (
              <div style={{ padding: '4px 14px 16px 14px', background: '#FAF8F5', borderTop: '1px dashed #E4E1DC' }}>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', margin: '10px 0 12px' }}>
                  {item.fundedBy === 'blend' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888' }}>Equity</span>
                      <input type="number" min={0} max={100} style={{ ...cellInput, width: 62 }}
                        value={Math.round(eqPct * 100)} onChange={e => update(item.id, { equityPct: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) / 100 })} />
                      <span style={{ fontSize: 11, color: '#888' }}>% · Debt {Math.round((1 - eqPct) * 100)}%</span>
                    </div>
                  )}
                  <input style={{ ...cellInput, flex: 1, minWidth: 200 }} value={item.notes} placeholder="Notes / consultant / ref"
                    onChange={e => update(item.id, { notes: e.target.value })} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', fontWeight: 700 }}>Monthly Cashflow</span>
                  <button onClick={() => autoSpread(item)} disabled={months.length === 0}
                    style={{ background: 'none', border: '1px solid #D0CEC9', color: months.length ? '#555' : '#CCC', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '4px 10px', cursor: months.length ? 'pointer' : 'default', borderRadius: 4 }}>
                    ⟲ Auto-spread by {S_CURVE_OPTS.find(o => o.id === (item.sCurve ?? 'scurve'))!.label}
                  </button>
                  {months.length > 0 && (
                    <span style={{ fontSize: 10, color: Math.abs(scheduled - (item.amount || 0)) < 1 ? '#2A7A4F' : '#B8860B', fontFamily: 'monospace' }}>
                      Scheduled {fmt(scheduled)} / {fmt(item.amount || 0)}
                    </span>
                  )}
                </div>
                {months.length === 0 ? (
                  <p style={{ fontSize: 11, color: '#AAA' }}>Set a Start and End month above to schedule this line month-by-month.</p>
                ) : (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {months.map(mo => (
                      <div key={mo} style={{ flexShrink: 0, width: 78 }}>
                        <div style={{ fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 3, textAlign: 'center' }}>{fmtMonth(mo)}</div>
                        <input type="number" min={0} style={{ ...cellInput, textAlign: 'right', fontFamily: 'monospace' }}
                          value={item.monthly?.[mo] || ''} placeholder="0"
                          onChange={e => update(item.id, { monthly: { ...(item.monthly ?? {}), [mo]: parseFloat(e.target.value) || 0 } })} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F7F5F2', borderTop: '1px solid #E0DDD8', minWidth: MINW }}>
        <button
          onClick={add}
          style={{ background: 'none', border: '1px solid #D0CEC9', color: '#888', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '6px 16px', cursor: 'pointer' }}
          onMouseEnter={e => { (e.currentTarget.style.borderColor = '#2A2A2A'); (e.currentTarget.style.color = '#2A2A2A') }}
          onMouseLeave={e => { (e.currentTarget.style.borderColor = '#D0CEC9'); (e.currentTarget.style.color = '#888') }}
        >+ Add Row</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: '#AAA', letterSpacing: '0.16em', textTransform: 'uppercase' }}>GST incl.</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#2A7A4F' }}>{fmt(Math.round(gstTotal))}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 9, color: '#AAA', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Section Total</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: '#1A1A1A' }}>{fmt(total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Cashflow schedule matrix — Daniel wants the time-duration view per section ─
// Read-only spread of each line item across the months of a selected year, with
// month totals along the bottom (mirrors the cashflow model slide).
function ScheduleMatrix({ items }: { items: CostLineItem[] }) {
  const scheduledYears = React.useMemo(() => {
    const ys = new Set<number>()
    items.forEach(it => Object.keys(it.monthly ?? {}).forEach(k => { const y = parseInt(k.slice(0, 4), 10); if (y) ys.add(y) }))
    return [...ys].sort((a, b) => a - b)
  }, [items])
  const [year, setYear] = useState<number>(() => scheduledYears[0] ?? new Date().getFullYear())
  const activeYear = scheduledYears.includes(year) ? year : (scheduledYears[0] ?? year)
  const months = Array.from({ length: 12 }, (_, i) => `${activeYear}-${String(i + 1).padStart(2, '0')}`)
  const rows = items.filter(it => months.some(mo => (it.monthly?.[mo] || 0) > 0))

  if (scheduledYears.length === 0) return null

  const colTotals = months.map(mo => rows.reduce((s, it) => s + (it.monthly?.[mo] || 0), 0))
  const grand = colTotals.reduce((s, v) => s + v, 0)

  return (
    <div style={{ maxWidth: 960, marginTop: 20, border: '1px solid #E8E5E0', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F7F5F2', borderBottom: '1px solid #E0DDD8' }}>
        <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', fontWeight: 700 }}>Cashflow Schedule · Time Duration</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#AAA' }}>Year</span>
          <select value={activeYear} onChange={e => setYear(Number(e.target.value))} style={{ ...cellInput, width: 90, fontWeight: 700 }}>
            {scheduledYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 900, fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#FBFAF8' }}>
              <th style={{ ...mCell, textAlign: 'left', position: 'sticky', left: 0, background: '#FBFAF8', minWidth: 180 }}>Line Item</th>
              {months.map(mo => <th key={mo} style={{ ...mCell, color: '#999' }}>{fmtMonth(mo)}</th>)}
              <th style={{ ...mCell, color: '#555', fontWeight: 700 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it, i) => {
              const rowTotal = months.reduce((s, mo) => s + (it.monthly?.[mo] || 0), 0)
              return (
                <tr key={it.id} style={{ background: i % 2 ? '#FDFCFB' : '#fff' }}>
                  <td style={{ ...mCell, textAlign: 'left', position: 'sticky', left: 0, background: i % 2 ? '#FDFCFB' : '#fff', color: '#1A1A1A' }}>{it.label || 'Untitled'}</td>
                  {months.map(mo => <td key={mo} style={{ ...mCell, fontFamily: 'monospace', color: (it.monthly?.[mo] || 0) > 0 ? '#1A1A1A' : '#DDD' }}>{(it.monthly?.[mo] || 0) > 0 ? fmt(it.monthly![mo]) : '·'}</td>)}
                  <td style={{ ...mCell, fontFamily: 'monospace', color: '#1A1A1A', fontWeight: 700 }}>{fmt(rowTotal)}</td>
                </tr>
              )
            })}
            <tr style={{ background: '#0A0A0A' }}>
              <td style={{ ...mCell, textAlign: 'left', position: 'sticky', left: 0, background: '#0A0A0A', color: '#888', letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 9 }}>Monthly Total</td>
              {colTotals.map((v, i) => <td key={i} style={{ ...mCell, fontFamily: 'monospace', color: v > 0 ? '#E8C87A' : '#444' }}>{v > 0 ? fmt(v) : '·'}</td>)}
              <td style={{ ...mCell, fontFamily: 'monospace', color: '#E8C87A', fontWeight: 800 }}>{fmt(grand)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
const mCell: React.CSSProperties = { padding: '7px 10px', borderBottom: '1px solid #F0EDE8', textAlign: 'right', whiteSpace: 'nowrap' }

// ── Grand total bar ───────────────────────────────────────────────────────────
function GstBadge({ gstEnabled }: { gstEnabled: boolean }) {
  // James/CFO: every cost table must state whether amounts are incl/excl GST.
  const label = gstEnabled ? 'AMOUNTS GST-INCLUSIVE · input tax credits claimed' : 'AMOUNTS EX-GST'
  const col = gstEnabled ? '#C4973A' : '#3DAA6A'
  return (
    <span title={gstEnabled ? 'Line amounts are entered GST-inclusive; the ex-GST cost carries into TDC (ITCs reclaimed).' : 'Line amounts exclude GST.'}
      style={{ fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: col, border: `1px solid ${col}55`, borderRadius: 4, padding: '3px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function GrandTotalBar({ detailed, gstEnabled }: { detailed: DetailedCostStack; gstEnabled: boolean }) {
  const sections = [
    { label: 'Construction Costs', items: detailed.hardCosts },
    { label: 'Consultant & Professional Fees', items: detailed.consultants },
    { label: 'Statutory Fees', items: detailed.statutory },
    { label: 'Headworks & Enviro', items: detailed.headworks },
    { label: 'Management Fees', items: detailed.management },
    { label: 'Marketing & Advertising', items: detailed.marketing },
  ]
  const totals = sections.map(s => ({ ...s, total: s.items.reduce((sum, i) => sum + (i.amount || 0), 0) }))
  const grand = totals.reduce((s, t) => s + t.total, 0)

  return (
    <div style={{ background: '#F5F3F0', borderBottom: '1px solid #E0DDD8', padding: '14px 24px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', fontWeight: 700, flexShrink: 0 }}>Detailed Total</span>
        <GstBadge gstEnabled={gstEnabled} />
        {totals.map(t => (
          <div key={t.label} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: '#777', letterSpacing: '0.08em' }}>{t.label}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: t.total > 0 ? '#9A7B2E' : '#BBB' }}>{fmt(t.total)}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', fontWeight: 700 }}>Grand Total</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: grand > 0 ? '#9A7B2E' : '#BBB' }}>{fmt(grand)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Detail tab layout ─────────────────────────────────────────────────────────
const DETAIL_META: Record<string, { title: string; sub: string; key: keyof Omit<DetailedCostStack, 'projectId'>; hint: string }> = {
  hard: {
    title: 'Construction Costs',
    sub: 'Trade-by-trade construction budget. Enter actual quoted or estimated amounts per line item.',
    key: 'hardCosts',
    hint: 'Typical range: 60–70% of total development cost. Includes structure, services, fitout, prelims and contingency.',
  },
  consultants: {
    title: 'Consultant & Professional Fees',
    sub: 'All design, engineering and advisory consultant fees across the project lifecycle.',
    key: 'consultants',
    hint: 'Typical range: 3–8% of construction cost. Include all stages — concept, DD, documentation and CA.',
  },
  statutory: {
    title: 'Statutory Fees',
    sub: 'Planning and building fees, government levies and statutory contributions.',
    key: 'statutory',
    hint: 'Statutory levies vary by council. Includes planning/building permits, CIL, VPA and affordable housing contributions.',
  },
  headworks: {
    title: 'Headworks & Enviro',
    sub: 'Service authority headworks/connections and environmental assessment & remediation.',
    key: 'headworks',
    hint: 'Water, sewer, power, gas and comms headworks plus any contamination, acid sulfate or environmental works.',
  },
  management: {
    title: 'Management Fees',
    sub: 'Developer, project and construction management fees and monitoring costs.',
    key: 'management',
    hint: 'Developer management fee, project management, superintendent, financier monitoring and legal/accounting.',
  },
  marketing: {
    title: 'Marketing & Advertising',
    sub: 'Sales agent fees, marketing spend, legal, insurance and defects reserve.',
    key: 'marketing',
    hint: 'BTS projects: 2–4% of gross revenue for sales/marketing. BTR projects: lower spend, no agent commission.',
  },
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CostStackTab({ projectId }: Props) {
  const store = useStore()
  const role = useRole()
  const visibleInnerTabs = role === 'external' ? INNER_TABS.filter(t => t.id !== 'summary') : INNER_TABS
  const [innerTab, setInnerTab] = useState(role === 'external' ? 'hard' : 'summary')
  const [data, setData] = useState<CostStack>(store.getCostStack(projectId))
  const [detailed, setDetailed] = useState<DetailedCostStack>(store.getDetailedCostStack(projectId))
  const [detailedDirty, setDetailedDirty] = useState(false)
  const cs = useAutosave<CostStack>(store.saveCostStack, [projectId])
  const dc = useAutosave<DetailedCostStack>(store.saveDetailedCostStack, [projectId])
  const presets = getCostPresets()

  const land = store.getLandTerms(projectId)
  const site = store.getSiteDesign(projectId)

  useEffect(() => {
    setData(store.getCostStack(projectId))
    setDetailed(store.getDetailedCostStack(projectId))
    setDetailedDirty(false)
  }, [projectId])

  function update<K extends keyof CostStack>(field: K, value: CostStack[K]) {
    const next = { ...data, [field]: value }; cs.commit(data, next); setData(next)
  }
  function updateSection(key: keyof Omit<DetailedCostStack, 'projectId'>, items: CostLineItem[]) {
    const next = { ...detailed, [key]: items }; dc.commit(detailed, next); setDetailed(next); setDetailedDirty(true)
  }
  function saveDetailed() { dc.flush(); store.saveDetailedCostStack(detailed); setDetailedDirty(false) }

  const inKindLineItem = land.isInKind && land.inKindGFA > 0 ? {
    label: land.inKindLabel || 'In-kind delivery',
    gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote,
  } : undefined

  // Itemised section totals — each overrides its top-down summary figure once the
  // CFO enters line items (hybrid feasibility, live in-tab as they type).
  const sumSec = (arr: CostLineItem[]) => arr.reduce((s, x) => s + (x.amount || 0), 0)
  const hardTotal = sumSec(detailed.hardCosts)
  const consTotal = sumSec(detailed.consultants)
  const statTotal = sumSec(detailed.statutory) + sumSec(detailed.headworks)
  const mgmtTotal = sumSec(detailed.management)
  const mktTotal = sumSec(detailed.marketing)

  const result = calculateCostStack({
    ...data,
    constructionOverride: hardTotal > 0 ? hardTotal : undefined,
    professionalFeesOverride: consTotal > 0 ? consTotal : undefined,
    statutoryFixed: statTotal > 0 ? statTotal : data.statutoryFixed,
    projectManagementFixed: mgmtTotal > 0 ? mgmtTotal : data.projectManagementFixed,
    marketingFixed: mktTotal > 0 ? mktTotal : data.marketingFixed,
    gba: site.resiGBA, inKindLineItem, landCost: land.landCost,
  })

  // Project GDV (best scenario gross realisation) — the alternate fee basis.
  const gdv = useMemo(() => getProjectGDV(projectId), [projectId, detailedDirty])

  // Keep %-based fee lines (Development / Marketing / Administration Management)
  // live as the Construction value or GDV changes in-session. Construction-based
  // lines are also derived persistence-side in getDetailedCostStack; this re-syncs
  // the on-screen numbers (and GDV-based lines, which are derived here).
  useEffect(() => {
    setDetailed(prev => {
      let changed = false
      const management = prev.management.map(it => {
        if (it.feeBasis) {
          const base = it.feeBasis === 'gdv' ? gdv : result.construction
          const amt = Math.round((it.pct ?? 0) * base)
          if (amt !== it.amount) { changed = true; return { ...it, amount: amt } }
        }
        return it
      })
      return changed ? { ...prev, management } : prev
    })
  }, [result.construction, gdv])

  const summaryRows = [
    { label: 'Construction', value: result.construction },
    { label: `Contingency (${(data.contingencyPct * 100).toFixed(0)}%)`, value: result.contingency },
    { label: `Prelims (${(data.prelimsPct * 100).toFixed(0)}%)`, value: result.prelims },
    { label: `Professional fees (${(data.professionalFeesPct * 100).toFixed(0)}%)`, value: result.professionalFees },
    { label: 'Statutory & council', value: data.statutoryFixed },
    ...(result.posContribution > 0 ? [{ label: `Public Open Space (${((data.posContributionPct ?? 0) * 100).toFixed(1)}%)`, value: result.posContribution }] : []),
    { label: `Finance (${(data.financePct * 100).toFixed(0)}%)`, value: result.finance },
    { label: 'Project management', value: data.projectManagementFixed },
    { label: 'Marketing', value: data.marketingFixed },
    { label: 'BTR amenity fitout', value: data.amenityFitoutFixed },
  ]

  // Land & acquisition — itemised from Land & Terms (shows in the Cost Summary).
  const landB = computeLandCost(land, data.gstEnabled)
  const landRows = [
    { label: 'Land — purchase price', value: Math.max(0, landB.price - landB.gstCredit) },
    ...(landB.stampDuty + landB.foreignSurcharge > 0 ? [{ label: 'Stamp duty + surcharge', value: landB.stampDuty + landB.foreignSurcharge }] : []),
    ...(landB.acquisitionCosts > 0 ? [{ label: 'Acquisition costs (fees · legals · DD)', value: landB.acquisitionCosts }] : []),
    ...(landB.adjustments > 0 ? [{ label: 'Settlement adjustments', value: landB.adjustments }] : []),
    ...(landB.financeOnTerms > 0 ? [{ label: 'Finance on terms', value: landB.financeOnTerms }] : []),
    ...(landB.rebate > 0 ? [{ label: 'Less vendor rebate', value: -landB.rebate }] : []),
  ]
  const tdcInclLand = result.totalDevelopmentCost + landB.total

  // Active detail section
  const meta = innerTab !== 'summary' ? DETAIL_META[innerTab] : null

  return (
    <div className="flex flex-col" style={{ minHeight: 0 }}>

      <InnerTabBar active={innerTab} onChange={setInnerTab} tabs={visibleInnerTabs} />

      {/* Project phase — where the project currently sits; shown on Timeline & Dashboard */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', background: '#F5F3F0', borderBottom: '1px solid #E0DDD8', flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', fontWeight: 700 }}>Project Phase</span>
        <select value={data.currentPhase ?? ''}
          onChange={e => { const next = { ...data, currentPhase: (e.target.value || undefined) as CostStack['currentPhase'] }; setData(next); store.saveCostStack(next) }}
          style={{ background: '#fff', border: '1px solid #D0CEC9', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#1A1A1A', fontWeight: 700, outline: 'none' }}>
          <option value="">— not set —</option>
          {COST_PHASES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <span style={{ fontSize: 10, color: '#AAA' }}>Surfaces on the project Timeline &amp; Dashboard.</span>
      </div>

      <AdminSpendBanner projectId={projectId} tdc={result.totalDevelopmentCost} />

      {innerTab !== 'summary' && <GrandTotalBar detailed={detailed} gstEnabled={data.gstEnabled} />}

      {/* ── SUMMARY TAB ── */}
      {innerTab === 'summary' && (
        <div className="relative p-5 md:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start overflow-auto flex-1">
          {/* ── Cost Stack rates — left column ── */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-6">
              <SectionHeading sub="Construction rate applied to GBA plus all soft costs">Cost Stack</SectionHeading>
              <span style={{ fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3DAA6A' }}>⤳ Auto-saved</span>
              {cs.canUndo && <Button size="sm" variant="ghost" onClick={() => cs.undo(setData)}>Undo</Button>}
            </div>

            <div className="mb-5">
              <p className="text-[#888] text-[9px] tracking-[0.18em] uppercase mb-2">Build Rate Preset</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {presets.map((p) => {
                  const isActive = data.buildRatePerSqm === p.buildRatePerSqm
                  return (
                    <button key={p.id}
                      onClick={() => update('buildRatePerSqm', p.buildRatePerSqm)}
                      style={{
                        padding: '6px 12px',
                        fontSize: 9,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer',
                        border: '1px solid #D0CEC9',
                        borderRadius: 4,
                        background: isActive ? '#F0F0F0' : '#FFFFFF',
                        color: isActive ? '#1A1A1A' : '#999',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = '#1A1A1A'
                          (e.currentTarget as HTMLButtonElement).style.color = '#1A1A1A'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = '#D0CEC9'
                          (e.currentTarget as HTMLButtonElement).style.color = '#999'
                        }
                      }}
                    >{p.name}</button>
                  )
                })}
              </div>
            </div>

            <InnerSection label="Construction">
              <FieldRow label="GBA (sqm)" note="From Site & Design">
                <span className="text-[#1A1A1A] font-mono text-sm">{site.resiGBA.toLocaleString()}</span>
              </FieldRow>
              <FieldRow label="Build rate ($/sqm)" note="Standard rate for the building type">
                <NumberInput value={data.buildRatePerSqm} onChange={v => update('buildRatePerSqm', v)} prefix="$" step={50} />
              </FieldRow>
              {hardTotal > 0 && (
                <p className="text-[10px] mt-1" style={{ color: '#9A7B2E' }}>
                  Construction is itemised — feasibility uses the <b>Construction tab</b> total <span className="font-mono font-semibold">{fmt(hardTotal)}</span> (contingency & prelims included there); the rate above is ignored.
                </p>
              )}
              <FieldRow label="Regional loading" note="Locational impact layered on the standard rate (e.g. +8%)">
                <PctInput value={data.regionalLoadingPct ?? 0} onChange={v => update('regionalLoadingPct', v)} />
              </FieldRow>
              {(data.regionalLoadingPct ?? 0) !== 0 && (
                <p className="text-[#888] text-[10px] mt-1">
                  Loaded rate <span className="font-mono text-[#1A1A1A] font-semibold">${Math.round(data.buildRatePerSqm * (1 + (data.regionalLoadingPct ?? 0))).toLocaleString()}/sqm</span> → construction <span className="font-mono text-[#1A1A1A] font-semibold">{fmt(result.construction)}</span>
                </p>
              )}
            </InnerSection>

            <InnerSection label="Soft Costs — % of construction">
              <FieldRow label="Contingency"><PctInput value={data.contingencyPct} onChange={v => update('contingencyPct', v)} /></FieldRow>
              <FieldRow label="Prelims"><PctInput value={data.prelimsPct} onChange={v => update('prelimsPct', v)} /></FieldRow>
              {consTotal > 0 ? (
                <FieldRow label="Professional fees" note="From Consultants tab">
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#1A1A1A', fontWeight: 700 }}>{fmt(consTotal)}</span>
                  <span style={{ fontSize: 10, color: '#9A7B2E', marginLeft: 8 }}>↑ itemised</span>
                </FieldRow>
              ) : (
                <FieldRow label="Professional fees"><PctInput value={data.professionalFeesPct} onChange={v => update('professionalFeesPct', v)} /></FieldRow>
              )}
              <FieldRow label="Finance cost"><PctInput value={data.financePct} onChange={v => update('financePct', v)} /></FieldRow>
            </InnerSection>

            <InnerSection label="Fixed Costs">
              {statTotal > 0 ? (
                <FieldRow label="Statutory & council" note="From Statutory + Headworks tabs">
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#1A1A1A', fontWeight: 700 }}>{fmt(statTotal)}</span>
                  <span style={{ fontSize: 10, color: '#9A7B2E', marginLeft: 8 }}>↑ itemised</span>
                </FieldRow>
              ) : (
                <FieldRow label="Statutory & council"><NumberInput value={data.statutoryFixed} onChange={v => update('statutoryFixed', v)} prefix="$" step={50000} /></FieldRow>
              )}
              <FieldRow label="Public Open Space (% land value)" note="Vic standard ~5% — adjust per project">
                <PctInput value={data.posContributionPct ?? 0} onChange={v => update('posContributionPct', v)} />
              </FieldRow>
              {result.posContribution > 0 && (
                <p className="text-[#888] text-[10px] mt-1 mb-1">POS contribution: <span className="font-mono text-[#1A1A1A] font-semibold">{fmt(result.posContribution)}</span> ({((data.posContributionPct ?? 0) * 100).toFixed(1)}% of land value)</p>
              )}
              {mgmtTotal > 0 ? (
                <FieldRow label="Project management" note="From Management tab">
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#1A1A1A', fontWeight: 700 }}>{fmt(mgmtTotal)}</span>
                  <span style={{ fontSize: 10, color: '#9A7B2E', marginLeft: 8 }}>↑ itemised Management Fees</span>
                </FieldRow>
              ) : (
                <FieldRow label="Project management"><NumberInput value={data.projectManagementFixed} onChange={v => update('projectManagementFixed', v)} prefix="$" step={50000} /></FieldRow>
              )}
              {mktTotal > 0 ? (
                <FieldRow label="Marketing" note="From Marketing tab">
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#1A1A1A', fontWeight: 700 }}>{fmt(mktTotal)}</span>
                  <span style={{ fontSize: 10, color: '#9A7B2E', marginLeft: 8 }}>↑ itemised</span>
                </FieldRow>
              ) : (
                <FieldRow label="Marketing"><NumberInput value={data.marketingFixed} onChange={v => update('marketingFixed', v)} prefix="$" step={50000} /></FieldRow>
              )}
              <FieldRow label="BTR amenity fitout"><NumberInput value={data.amenityFitoutFixed} onChange={v => update('amenityFitoutFixed', v)} prefix="$" step={50000} /></FieldRow>
            </InnerSection>

            <InnerSection label="GST — 10%">
              <FieldRow label="Apply GST" note="Costs entered GST-inclusive; credits claimed on commercial costs & consultants. Sales GST deducted in BTS.">
                <input type="checkbox" checked={data.gstEnabled} onChange={e => update('gstEnabled', e.target.checked)} />
              </FieldRow>
              {data.gstEnabled && (
                <p className="text-[#888] text-[10px] mt-2 leading-relaxed">
                  Input credits recovered: <span className="font-mono font-semibold text-[#2A7A4F]">${Math.round(result.gstCredits).toLocaleString()}</span>.
                  Statutory charges (GST-free), finance (input-taxed) and in-kind/land carry no GST.
                </p>
              )}
            </InnerSection>

            {land.isInKind && land.inKindGFA > 0 && (
              <div className="mt-4 border border-[#C8C0D8] bg-[#F8F5FC] p-4">
                <p className="text-[9px] tracking-[0.18em] uppercase text-[#7A4AAA] mb-2">In-Kind — {land.inKindLabel}</p>
                <p className="text-[#888] text-xs mb-2">{land.inKindNote}</p>
                <div className="flex justify-between">
                  <span className="text-[10px] text-[#666]">{land.inKindGFA.toLocaleString()} sqm × ${land.inKindRatePerSqm.toLocaleString()}/sqm</span>
                  <span className="text-[#1A1A1A] font-mono font-bold text-sm">${result.inKindCost.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Cost Summary — right column, beside the rates ── */}
          <div className="w-full">
            <div className="mb-6"><SectionHeading sub="Rolled-up total development cost incl. land">Cost Summary</SectionHeading></div>
            <div className="border border-[#E0DDD8] rounded-2xl overflow-hidden bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
              {/* Line items flow across two roomy columns so nothing feels cramped */}
              <div className="grid grid-cols-1 px-4 md:px-6 py-4">
                {(() => {
                  const rows: { label: string; value: number; tone: 'land' | 'dev' | 'inkind' | 'gst' }[] = [
                    ...landRows.map(r => ({ ...r, tone: 'land' as const })),
                    ...summaryRows.map(r => ({ ...r, tone: 'dev' as const })),
                    ...(land.isInKind && result.inKindCost > 0 ? [{ label: land.inKindLabel || 'In-kind', value: result.inKindCost, tone: 'inkind' as const }] : []),
                    ...(result.gstCredits > 0 ? [{ label: 'Less GST input credits (1/11)', value: -Math.round(result.gstCredits), tone: 'gst' as const }] : []),
                  ]
                  const col = { land: '#8A6A28', dev: '#1A1A1A', inkind: '#7A4AAA', gst: '#2A7A4F' }
                  return rows.map((r, i) => (
                    <div key={i} className="flex justify-between items-baseline gap-4 py-3.5 border-b border-[#F1EEE9]">
                      <span className="text-[13px] tracking-wide" style={{ color: r.tone === 'dev' ? '#666' : col[r.tone] }}>{r.label}</span>
                      <span className="text-[17px] font-mono font-semibold whitespace-nowrap" style={{ color: col[r.tone] }}>
                        {r.value < 0 ? '−' : ''}${Math.abs(r.value).toLocaleString()}
                      </span>
                    </div>
                  ))
                })()}
              </div>
              {/* Total — full-width banner across the bottom */}
              <div className="flex flex-wrap justify-between items-center gap-4 px-6 md:px-10 py-7 border-t border-[#D0CEC9] bg-[#F5F3F0]">
                <span className="text-[14px] font-semibold tracking-[0.14em] uppercase text-[#1A1A1A]">Total Dev Cost{landB.total > 0 ? ' (incl land)' : ''}{result.gstCredits > 0 ? ' (ex GST)' : ''}</span>
                <div className="flex items-baseline gap-5">
                  {site.resiGBA > 0 && (
                    <span className="text-[#AAA] text-[12px] tracking-wide">${Math.round(tdcInclLand / site.resiGBA).toLocaleString()}/sqm GBA all-in</span>
                  )}
                  <span className="font-mono font-bold text-4xl md:text-[40px] text-[#B8963C] leading-none">${(tdcInclLand / 1_000_000).toFixed(1)}M</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL TABS (hard / consultants / statutory / marketing) ── */}
      {meta && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #E8E5E0' }}>
            <div>
              <p style={{ color: '#C4973A', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 4 }}>Cost Breakdown</p>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 300, fontSize: 20, letterSpacing: '0.06em', color: '#1A1A1A', margin: '0 0 6px' }}>{meta.title}</h2>
              <p style={{ color: '#AAA', fontSize: 11, margin: 0 }}>{meta.sub}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 24, alignItems: 'center' }}>
              <span style={{ fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3DAA6A' }}>⤳ Auto-saved</span>
              {dc.canUndo && (
                <button onClick={() => dc.undo(setDetailed)}
                  style={{ background: 'transparent', border: '1px solid #D0CEC9', color: '#888', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, padding: '8px 16px', cursor: 'pointer' }}>
                  Undo
                </button>
              )}
            </div>
          </div>

          {/* Market benchmark hint */}
          <div style={{ background: '#F7F5F2', border: '1px solid #E8E5E0', borderLeft: '3px solid #C4973A', padding: '10px 16px', marginBottom: 24 }}>
            <p style={{ fontSize: 10, color: '#888', margin: 0, letterSpacing: '0.04em' }}>
              <span style={{ color: '#C4973A', fontWeight: 700 }}>Market guide — </span>{meta.hint}
            </p>
          </div>

          {/* Line item table — unified design across every cost-stack section */}
          <div style={{ maxWidth: '100%' }}>
            <CostStackTable
              items={detailed[meta.key]}
              onChange={items => updateSection(meta.key, items)}
              gstEnabled={data.gstEnabled}
              basisMode={innerTab === 'hard' ? 'units' : 'basis'}
              groups={COST_GROUPS[innerTab]}
              constructionValue={result.construction}
              gdvValue={gdv}
            />
          </div>

          {/* Cashflow schedule — appears once any line has monthly cashflow set */}
          <ScheduleMatrix items={detailed[meta.key]} />
        </div>
      )}
    </div>
  )
}

function InnerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 border border-[#E8E5E0] bg-white">
      <div className="px-4 py-2 border-b border-[#E8E5E0] bg-[#F5F3F0]">
        <span className="text-[9px] tracking-[0.2em] uppercase text-[#888]">{label}</span>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  )
}
