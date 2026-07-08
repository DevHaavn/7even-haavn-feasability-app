import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { SectionHeading, FieldRow, NumberInput, PctInput, Button } from '../../components/ui'
import { calculateCostStack } from '../../engine/costStack'
import { getCostPresets } from '../../db'
import type { CostStack, CostLineItem, DetailedCostStack, SCurveProfile, FundingSource } from '../../db/schema'
import { COST_PHASES } from '../../db/schema'
import { spreadWeights } from '../../engine/cashflow'
import { useRole } from '../../lib/role'
import { getProjectAdminSpend, projectLinkFor } from '../capital/BudgetsAdmin'

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

function LineItemTable({ items, onChange, constructionValue = 0 }: { items: CostLineItem[]; onChange: (items: CostLineItem[]) => void; constructionValue?: number }) {
  const [openId, setOpenId] = useState<string | null>(null)
  function update(id: string, patch: Partial<CostLineItem>) {
    onChange(items.map(item => item.id === id ? { ...item, ...patch } : item))
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
  const GRID = '1fr 120px 100px 100px 108px 118px 150px 30px 26px'
  const MINW = 1000

  return (
    <div style={{ background: '#fff', border: '1px solid #E8E5E0', overflowX: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '8px 14px', background: '#F7F5F2', borderBottom: '1px solid #E0DDD8', minWidth: MINW }}>
        {['Item Description', 'Budget ($)', 'Start', 'End', 'S-Curve', 'Funded By', 'Phase', '', ''].map((h, i) => (
          <span key={i} style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', fontWeight: 600 }}>{h}</span>
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
                value={item.label} placeholder="Item description"
                onChange={e => update(item.id, { label: e.target.value })} />
              {item.pctBasis === 'construction' ? (
                // Fee derived as a % of the summary construction value (live).
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} title="Percentage of the summary Construction value">
                  <input type="number" min={0} step={0.25} style={{ ...cellInput, width: 44, border: '1px solid transparent', background: 'transparent', fontFamily: 'monospace', textAlign: 'right' }}
                    value={item.pct != null ? +(item.pct * 100).toFixed(2) : ''} placeholder="0"
                    onChange={e => { const pct = (parseFloat(e.target.value) || 0) / 100; update(item.id, { pct, amount: Math.round(pct * constructionValue) }) }} />
                  <span style={{ color: '#BBB', fontSize: 10 }}>%</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#9A7B2E', marginLeft: 2 }}>{fmt(Math.round((item.pct ?? 0) * constructionValue))}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#BBB', fontSize: 11, marginRight: 3 }}>$</span>
                  <input type="number" min={0} style={{ ...cellInput, border: '1px solid transparent', background: 'transparent', fontFamily: 'monospace' }}
                    value={item.amount || ''} placeholder="0"
                    onChange={e => update(item.id, { amount: parseFloat(e.target.value) || 0 })} />
                </div>
              )}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 9, color: '#AAA', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Section Total</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: '#1A1A1A' }}>{fmt(total)}</span>
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
  const [dirty, setDirty] = useState(false)
  const [detailedDirty, setDetailedDirty] = useState(false)
  const undoRef = useRef<CostStack | null>(null)
  const undoDetailedRef = useRef<DetailedCostStack | null>(null)
  const presets = getCostPresets()

  const land = store.getLandTerms(projectId)
  const site = store.getSiteDesign(projectId)

  useEffect(() => {
    setData(store.getCostStack(projectId))
    setDetailed(store.getDetailedCostStack(projectId))
    setDirty(false); setDetailedDirty(false)
    undoRef.current = null; undoDetailedRef.current = null
  }, [projectId])

  function update<K extends keyof CostStack>(field: K, value: CostStack[K]) {
    if (!undoRef.current) undoRef.current = structuredClone(data)
    setData(d => ({ ...d, [field]: value })); setDirty(true)
  }
  function updateSection(key: keyof Omit<DetailedCostStack, 'projectId'>, items: CostLineItem[]) {
    if (!undoDetailedRef.current) undoDetailedRef.current = structuredClone(detailed)
    setDetailed(d => ({ ...d, [key]: items })); setDetailedDirty(true)
  }
  function saveDetailed() { store.saveDetailedCostStack(detailed); setDetailedDirty(false); undoDetailedRef.current = null }

  const inKindLineItem = land.isInKind && land.inKindGFA > 0 ? {
    label: land.inKindLabel || 'In-kind delivery',
    gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote,
  } : undefined

  const result = calculateCostStack({ ...data, gba: site.resiGBA, inKindLineItem, landCost: land.landCost })

  // Keep %-of-construction fee lines (Development / PM Fee) live as the summary
  // construction value changes in-session. Persistence-side derivation lives in
  // getDetailedCostStack, so this only re-syncs the on-screen numbers.
  useEffect(() => {
    setDetailed(prev => {
      let changed = false
      const management = prev.management.map(it => {
        if (it.pctBasis === 'construction') {
          const amt = Math.round((it.pct ?? 0) * result.construction)
          if (amt !== it.amount) { changed = true; return { ...it, amount: amt } }
        }
        return it
      })
      return changed ? { ...prev, management } : prev
    })
  }, [result.construction])

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
        <div className="relative p-4 md:p-6 flex flex-col md:flex-row gap-6 md:gap-8 overflow-auto flex-1">
          <div className="flex-1 max-w-xl">
            <div className="flex items-center justify-between mb-6">
              <SectionHeading sub="Construction rate applied to GBA plus all soft costs">Cost Stack</SectionHeading>
              {undoRef.current && <Button size="sm" variant="ghost" onClick={() => { if (undoRef.current) { setData(undoRef.current); undoRef.current = null; setDirty(false) } }}>Undo</Button>}
              {dirty && <Button size="sm" onClick={() => { store.saveCostStack(data); undoRef.current = null; setDirty(false) }}>Save</Button>}
            </div>

            <div className="mb-5">
              <p className="text-[#888] text-[9px] tracking-[0.18em] uppercase mb-2">Build Rate Preset</p>
              <div style={{ display: 'inline-flex', border: '1px solid #D0CEC9' }}>
                {presets.map((p, i) => (
                  <button key={p.id}
                    onClick={() => update('buildRatePerSqm', p.buildRatePerSqm)}
                    className={`px-4 py-2 text-[10px] tracking-[0.1em] uppercase cursor-pointer transition-colors ${data.buildRatePerSqm === p.buildRatePerSqm ? 'bg-[#1A1A1A] text-white font-semibold' : 'text-[#888] hover:text-[#1A1A1A]'} ${i > 0 ? 'border-l border-[#D0CEC9]' : ''}`}
                    style={{ borderRadius: 0 }}
                  >{p.name}</button>
                ))}
              </div>
            </div>

            <InnerSection label="Construction">
              <FieldRow label="GBA (sqm)" note="From Site & Design">
                <span className="text-[#1A1A1A] font-mono text-sm">{site.resiGBA.toLocaleString()}</span>
              </FieldRow>
              <FieldRow label="Build rate ($/sqm)" note="Standard rate for the building type">
                <NumberInput value={data.buildRatePerSqm} onChange={v => update('buildRatePerSqm', v)} prefix="$" step={50} />
              </FieldRow>
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
              <FieldRow label="Professional fees"><PctInput value={data.professionalFeesPct} onChange={v => update('professionalFeesPct', v)} /></FieldRow>
              <FieldRow label="Finance cost"><PctInput value={data.financePct} onChange={v => update('financePct', v)} /></FieldRow>
            </InnerSection>

            <InnerSection label="Fixed Costs">
              <FieldRow label="Statutory & council"><NumberInput value={data.statutoryFixed} onChange={v => update('statutoryFixed', v)} prefix="$" step={50000} /></FieldRow>
              <FieldRow label="Public Open Space (% land value)" note="Vic standard ~5% — adjust per project">
                <PctInput value={data.posContributionPct ?? 0} onChange={v => update('posContributionPct', v)} />
              </FieldRow>
              {result.posContribution > 0 && (
                <p className="text-[#888] text-[10px] mt-1 mb-1">POS contribution: <span className="font-mono text-[#1A1A1A] font-semibold">{fmt(result.posContribution)}</span> ({((data.posContributionPct ?? 0) * 100).toFixed(1)}% of land value)</p>
              )}
              <FieldRow label="Project management"><NumberInput value={data.projectManagementFixed} onChange={v => update('projectManagementFixed', v)} prefix="$" step={50000} /></FieldRow>
              <FieldRow label="Marketing"><NumberInput value={data.marketingFixed} onChange={v => update('marketingFixed', v)} prefix="$" step={50000} /></FieldRow>
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

          {/* Cost Summary waterfall */}
          <div className="w-72 flex-shrink-0">
            <SectionHeading>Cost Summary</SectionHeading>
            <div className="border border-[#E0DDD8] bg-white">
              {summaryRows.map((r, i) => (
                <div key={i} className="flex justify-between items-center px-4 py-3 border-b border-[#F0EDE8]">
                  <span className="text-[10px] text-[#888] tracking-wide">{r.label}</span>
                  <span className="text-sm font-mono font-semibold text-[#1A1A1A]">${r.value.toLocaleString()}</span>
                </div>
              ))}
              {land.isInKind && result.inKindCost > 0 && (
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#F0EDE8] bg-[#F8F5FC]">
                  <span className="text-[10px] text-[#7A4AAA] tracking-wide">{land.inKindLabel || 'In-kind'}</span>
                  <span className="text-sm font-mono font-semibold text-[#7A4AAA]">${result.inKindCost.toLocaleString()}</span>
                </div>
              )}
              {result.gstCredits > 0 && (
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#F0EDE8] bg-[#F2F7F3]">
                  <span className="text-[10px] text-[#2A7A4F] tracking-wide">Less GST input credits (1/11)</span>
                  <span className="text-sm font-mono font-semibold text-[#2A7A4F]">−${Math.round(result.gstCredits).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center px-4 py-4 border-t border-[#D0CEC9] bg-[#F5F3F0]">
                <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#1A1A1A]">Total Dev Cost{result.gstCredits > 0 ? ' (ex GST)' : ''}</span>
                <span className="font-mono font-bold text-2xl text-[#B8963C]">${(result.totalDevelopmentCost / 1_000_000).toFixed(1)}M</span>
              </div>
            </div>
            {site.resiGBA > 0 && (
              <p className="mt-2 text-[#AAA] text-[10px] text-right tracking-wide">
                ${Math.round(result.totalDevelopmentCost / site.resiGBA).toLocaleString()}/sqm GBA all-in
              </p>
            )}
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
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 24 }}>
              {undoDetailedRef.current && (
                <button onClick={() => { if (undoDetailedRef.current) { setDetailed(undoDetailedRef.current); undoDetailedRef.current = null; setDetailedDirty(false) } }}
                  style={{ background: 'transparent', border: '1px solid #D0CEC9', color: '#888', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, padding: '8px 16px', cursor: 'pointer' }}>
                  Undo
                </button>
              )}
              {detailedDirty && (
                <button onClick={saveDetailed}
                  style={{ background: '#C4973A', border: 'none', color: '#000', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, padding: '8px 20px', cursor: 'pointer' }}>
                  Save
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

          {/* Line item table */}
          <div style={{ maxWidth: 960 }}>
            <LineItemTable
              items={detailed[meta.key]}
              onChange={items => updateSection(meta.key, items)}
              constructionValue={result.construction}
            />
          </div>

          {/* Cashflow schedule — appears once any line has monthly cashflow set */}
          <ScheduleMatrix items={detailed[meta.key]} />
        </div>
      )}

      {/* Render strip */}
      <div style={{ height: 280, backgroundImage: 'url(/renders/haavn-hero.png)', backgroundSize: 'cover', backgroundPosition: 'center 55%', width: '100%', flexShrink: 0 }} />
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
