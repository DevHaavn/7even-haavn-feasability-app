import React, { useMemo, useState } from 'react'
import { useAutosave } from '../../lib/useAutosave'
import {
  getCashflow, saveCashflow, getDetailedCostStack, saveDetailedCostStack,
  getLandTerms, getCostStack, getProjectGDV, getProjectTDC, getProject,
} from '../../db'
import { computeLandCost } from '../../engine/landCost'
import { spreadWeights } from '../../engine/cashflow'
import type { CashflowState, CostLineItem, DetailedCostStack, SCurveProfile } from '../../db/schema'

// ─────────────────────────────────────────────────────────────────────────────
// Cash Flow — full rebuild (Design Handoff Spec v1).
// GRV / Revenue at the very top (sector-togglable BTR / BTS / Hotel), every real
// cost line item FLAT under plain category dividers (no phase boxes), Total
// Development Cost + Net Cashflow (pre-finance), then Finance at the bottom:
// Equity (no interest/fee), Senior Debt and Mezzanine each with their OWN
// Interest + Line Fee computed independently from their own running balance and
// facility limit. Every $ cell is drag-and-drop onto another month in the same
// row; cost-line drags persist into the line's `monthly` map, so the re-timing
// sticks and feeds the rest of the app.
// ─────────────────────────────────────────────────────────────────────────────

interface Props { projectId: string }

type Sector = 'btr' | 'bts' | 'hotel'
type RowKind = 'grv' | 'item' | 'equity' | 'senior' | 'mezz'

const money = (n: number) => (n === 0 ? '—' : `${n < 0 ? '−' : ''}$${Math.round(Math.abs(n)).toLocaleString()}`)
const fmtM = (n: number) => `$${(n / 1e6).toFixed(1)}M`
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

// Spread a total across [a0..a1] (inclusive) with an S-curve profile, into an N-month array.
function spread(total: number, a0: number, a1: number, profile: SCurveProfile, N: number): number[] {
  const arr = Array(N).fill(0)
  if (total === 0) return arr
  const s = Math.max(0, Math.min(N - 1, a0)); const e = Math.max(s, Math.min(N - 1, a1))
  const w = spreadWeights(profile, e - s + 1)
  let acc = 0
  for (let i = s; i <= e; i++) { const v = Math.round(total * w[i - s]); arr[i] = v; acc += v }
  // rounding fix on the largest cell
  const diff = Math.round(total) - acc
  if (diff !== 0) { let k = s; for (let i = s; i <= e; i++) if (arr[i] > arr[k]) k = i; arr[k] += diff }
  return arr
}

// Month index of 'YYYY-MM' relative to the programme start (clamped to the grid).
function monthIndex(ym: string | undefined, startYM: string, N: number): number | null {
  if (!ym) return null
  const [py, pm] = startYM.split('-').map(Number); const [y, m] = ym.slice(0, 7).split('-').map(Number)
  if (!py || !pm || !y || !m) return null
  return Math.max(0, Math.min(N - 1, (y - py) * 12 + (m - pm)))
}

export default function CashflowTab({ projectId }: Props) {
  const [state, setState] = useState<CashflowState>(() => getCashflow(projectId))
  const [detailed, setDetailed] = useState<DetailedCostStack>(() => getDetailedCostStack(projectId))
  const { commit } = useAutosave<CashflowState>(saveCashflow, [projectId])
  const updateState = (next: Partial<CashflowState>) => { const s = { ...state, ...next }; commit(state, s); setState(s) }

  const project = getProject(projectId)
  const [sector, setSector] = useState<Sector>(() => {
    const ty = (project?.type || '').toLowerCase()
    return ty === 'hotel' ? 'hotel' : ty === 'bts' ? 'bts' : 'btr'
  })

  const N = Math.max(12, Math.min(120, state.months || 36))
  const startYM = state.startDate || '2026-08'
  const label = (i: number) => {
    const [py, pm] = startYM.split('-').map(Number)
    const m = ((pm - 1) + i) % 12, y = py + Math.floor(((pm - 1) + i) / 12)
    return { top: `M${i + 1}`, bot: `${MON[m]}${String(y).slice(2)}` }
  }

  // ── Category windows (months) from the existing phase-timing state ──────────
  const win = (id: keyof CashflowState['phases']): [number, number] => {
    const p = state.phases[id]
    return [p.startMonth, p.startMonth + Math.max(1, p.durationMonths) - 1]
  }
  const land = getLandTerms(projectId)
  const settleIdx = monthIndex(land.settlementDate, startYM, N) ?? win('pre-acquisition')[0]

  // ── Build the flat row model: category dividers + real line items ───────────
  interface Row { key: string; kind: RowKind; name: string; base: number[]; itemRef?: { section: keyof Omit<DetailedCostStack, 'projectId'>; id: string }; calcOnly?: boolean; dim?: boolean }
  interface Divider { div: string }

  const landB = useMemo(() => computeLandCost(land, getCostStack(projectId).gstEnabled), [projectId, land])

  const model = useMemo<(Row | Divider)[]>(() => {
    const out: (Row | Divider)[] = []
    // Land & Acquisition — upfront at settlement.
    out.push({ div: 'Land & Acquisition' })
    const landRows: [string, number][] = [
      ['Land — purchase price', Math.max(0, landB.price - landB.gstCredit)],
      ['Stamp duty + government levies', landB.stampDuty + landB.foreignSurcharge],
      ['Acquisition costs (fees · legals · DD)', landB.acquisitionCosts],
      ['Settlement adjustments', landB.adjustments],
      ['Finance on terms', landB.financeOnTerms],
    ]
    const sched = (land.isInKind ? [] : (land.paymentSchedule ?? [])).filter(p => p.date && p.amount)
    landRows.filter(([, v]) => v > 0).forEach(([nm, v], i) => {
      let base: number[]
      if (i === 0 && sched.length > 0) {
        // Purchase price follows the vendor payment schedule (deposit → stages →
        // settlement balance) — the same months the finance waterfall draws on.
        base = Array(N).fill(0)
        let placed = 0
        for (const p of sched) { const ix = monthIndex(p.date, startYM, N); if (ix != null) { base[ix] += p.amount; placed += p.amount } }
        if (v - placed > 1) base[settleIdx] += v - placed
      } else {
        base = spread(v, settleIdx, settleIdx, 'upfront', N)
      }
      out.push({ key: `land${i}`, kind: 'item', name: nm, base, calcOnly: true })
    })

    // A detailed section → flat rows under its divider. Non-zero items are listed
    // individually; zero items roll into one "+N more" line. Timing: the line's own
    // Start/End + S-curve when set (or persisted `monthly` from a drag), else the
    // category window/default shape.
    const section = (div: string, sec: keyof Omit<DetailedCostStack, 'projectId'>, defWin: [number, number], defCurve: SCurveProfile) => {
      const items = detailed[sec] as CostLineItem[]
      if (!items || items.length === 0) return
      out.push({ div })
      let zeros = 0
      items.forEach(it => {
        const amt = it.amount || 0
        if (amt === 0) { zeros++; return }
        let base: number[]
        const mKeys = it.monthly ? Object.keys(it.monthly) : []
        if (mKeys.length > 0) {
          base = Array(N).fill(0)
          mKeys.forEach(k => { const idx = monthIndex(k, startYM, N); if (idx != null) base[idx] += it.monthly![k] })
          const tot = base.reduce((s, v) => s + v, 0)
          if (Math.abs(tot - amt) > 1) base = base.map(v => Math.round(v * (amt / (tot || 1)))) // re-scale if budget changed since drag
        } else {
          const s0 = monthIndex(it.startDate, startYM, N); const e0 = monthIndex(it.endDate, startYM, N)
          const w: [number, number] = s0 != null ? [s0, e0 != null ? Math.max(s0, e0) : Math.max(s0, defWin[1])] : defWin
          base = spread(amt, w[0], w[1], it.sCurve || defCurve, N)
        }
        out.push({ key: `${sec}:${it.id}`, kind: 'item', name: it.label || '(unnamed)', base, itemRef: { section: sec, id: it.id } })
      })
      if (zeros > 0) out.push({ key: `${sec}:zeros`, kind: 'item', name: `+ ${zeros} more (mostly $0)`, base: Array(N).fill(0), calcOnly: true, dim: true })
    }
    section('Statutory & Planning', 'statutory', win('acquisition-planning'), 'linear')
    section('Consultants', 'consultants', win('pre-construction'), 'linear')
    section('Headworks & Infrastructure', 'headworks', win('construction'), 'linear')
    section('Construction', 'hardCosts', win('construction'), 'scurve')
    section('Marketing', 'marketing', win('close-out'), 'backloaded')
    section('Management (runs across every phase)', 'management', [Math.min(2, N - 1), N - 1], 'linear')
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailed, landB, settleIdx, N, startYM, state.phases])

  // ── GRV / Revenue — sector-togglable, session-draggable ─────────────────────
  const grvTotal = useMemo(() => getProjectGDV(projectId), [projectId, detailed])
  const grvDefault = useMemo(() => {
    const lastQ = Math.max(0, N - 6)
    if (sector === 'bts') return spread(grvTotal, N - 1, N - 1, 'upfront', N)          // settlement lump
    if (sector === 'hotel') return spread(grvTotal, Math.max(0, N - 7), N - 1, 'backloaded', N) // occupancy ramp
    return spread(grvTotal, lastQ, N - 1, 'linear', N)                                  // BTR rent ramp-up
  }, [grvTotal, sector, N])
  const [grvMoved, setGrvMoved] = useState<number[] | null>(null)
  const grv = grvMoved ?? grvDefault

  // ── Finance — THE real debt waterfall (same run as Finance/Overview/Dashboard).
  // The grid's cost plot drives it, so these rows reconcile to the dollar with
  // every headline figure in the app.
  const tdcByMonth = useMemo(() => {
    const t = Array(N).fill(0)
    model.forEach(r => { if ('base' in r) r.base.forEach((v, i) => (t[i] += v)) })
    return t
  }, [model, N])

  const wf = useMemo(() => getProjectTDC(projectId).wf, [projectId, detailed, state, N])
  const wfArr = (pick: (m: typeof wf.months[number]) => number): number[] => {
    const a = Array(N).fill(0)
    for (const m of wf.months) { const ix = monthIndex(m.month, startYM, N); if (ix != null) a[ix] += pick(m) }
    return a
  }
  const eqArr = wfArr(m => m.equityDraw)
  const trancheRows = wf.tranches.map(t => ({
    t,
    draw: wfArr(m => m.drawByTranche[t.id] || 0),
    interest: wfArr(m => m.interestByTranche[t.id] || 0),
    fees: wfArr(m => m.feeByTranche[t.id] || 0),
  }))
  const debtDrawArr = wfArr(m => m.debtDraw)

  // ── Drag-to-retime ──────────────────────────────────────────────────────────
  const [picked, setPicked] = useState<{ key: string; m: number } | null>(null)
  const dragKeyOf = (r: Row) => r.key
  function applyMove(r: Row, from: number, to: number) {
    if (r.kind === 'grv') { const a = grv.slice(); a[to] += a[from]; a[from] = 0; setGrvMoved(a); return }
    // Cost line item — persist into the line's `monthly` map so the re-timing sticks.
    if (!r.itemRef) return
    const a = r.base.slice(); a[to] += a[from]; a[from] = 0
    const [py, pm] = startYM.split('-').map(Number)
    const ym = (i: number) => { const mm = (pm - 1) + i; return `${py + Math.floor(mm / 12)}-${String((mm % 12) + 1).padStart(2, '0')}` }
    const monthly: Record<string, number> = {}
    a.forEach((v, i) => { if (v !== 0) monthly[ym(i)] = v })
    const next: DetailedCostStack = {
      ...detailed,
      [r.itemRef.section]: (detailed[r.itemRef.section] as CostLineItem[]).map(it => it.id === r.itemRef!.id ? { ...it, monthly } : it),
    }
    setDetailed(next); saveDetailedCostStack(next)
  }

  // ── Render helpers ──────────────────────────────────────────────────────────
  const thS: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 4, background: 'var(--card-2)', color: 'var(--ink-3)', fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600, borderBottom: '1px solid var(--border-hi)', padding: '7px 10px', textAlign: 'right', whiteSpace: 'nowrap' }
  const nameS: React.CSSProperties = { position: 'sticky', left: 0, zIndex: 3, textAlign: 'left', background: 'var(--card)', minWidth: 240, fontFamily: 'var(--sans)', color: 'var(--ink)', fontWeight: 500, borderRight: '1px solid var(--border)', padding: '7px 12px', fontSize: 11.5, whiteSpace: 'nowrap', borderBottom: '1px solid var(--line)' }
  const totS: React.CSSProperties = { position: 'sticky', right: 0, zIndex: 3, background: 'var(--card)', borderLeft: '1px solid var(--border)', fontWeight: 600, color: 'var(--ink)', padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap', borderBottom: '1px solid var(--line)' }
  const cellS = (v: number, drag: boolean, isPicked: boolean, dropOk: boolean): React.CSSProperties => ({
    padding: '7px 10px', fontSize: 10.5, fontFamily: 'var(--mono)', textAlign: 'right', whiteSpace: 'nowrap', minWidth: 74,
    color: v === 0 ? 'var(--faint)' : 'var(--ink-2)', borderBottom: '1px solid var(--line)',
    cursor: drag && v !== 0 ? 'grab' : 'default',
    background: isPicked ? 'var(--em-soft)' : dropOk ? 'rgba(88,120,168,0.14)' : undefined,
    outline: isPicked ? '2px solid var(--emerald)' : 'none', outlineOffset: -2, borderRadius: isPicked || dropOk ? 5 : 0,
  })

  const renderDataRow = (r: Row, opts?: { nameColor?: string; indent?: boolean; italic?: boolean; bold?: boolean; arr?: number[] }) => {
    const arr = opts?.arr ?? r.base
    const total = arr.reduce((s, v) => s + v, 0)
    const draggable = !r.calcOnly || r.kind !== 'item'
    return (
      <tr key={r.key}>
        <td style={{ ...nameS, color: opts?.nameColor || (r.dim ? 'var(--ink-3)' : 'var(--ink)'), paddingLeft: opts?.indent ? 28 : 12, fontStyle: opts?.italic ? 'italic' : 'normal', fontWeight: opts?.bold ? 700 : 500 }}>{r.name}</td>
        {arr.map((v, i) => {
          const isP = picked?.key === r.key && picked.m === i
          const dropOk = picked?.key === r.key && picked.m !== i
          return (
            <td key={i} draggable={draggable && v !== 0}
              onDragStart={() => setPicked({ key: r.key, m: i })}
              onDragEnd={() => setPicked(null)}
              onDragOver={e => { if (picked?.key === r.key && picked.m !== i) e.preventDefault() }}
              onDrop={e => { e.preventDefault(); if (picked && picked.key === r.key && picked.m !== i) { applyMove(r, picked.m, i); setPicked(null) } }}
              style={cellS(v, draggable, isP, !!dropOk && v === v)}>{money(v)}</td>
          )
        })}
        <td style={totS}>{total === 0 ? '—' : fmtM(total)}</td>
      </tr>
    )
  }
  const calcRow = (name: string, arr: number[], o?: { color?: string; bold?: boolean; bg?: string; neg?: boolean; eop?: boolean; indent?: boolean; italic?: boolean }) => {
    const total = o?.eop ? arr[N - 1] : arr.reduce((s, v) => s + v, 0)
    return (
      <tr key={name}>
        <td style={{ ...nameS, fontWeight: o?.bold ? 700 : 500, color: o?.color || 'var(--ink)', background: o?.bg || 'var(--card)', paddingLeft: o?.indent ? 28 : 12, fontStyle: o?.italic ? 'italic' : 'normal' }}>{name}</td>
        {arr.map((v, i) => (
          <td key={i} style={{ padding: '7px 10px', fontSize: 10.5, fontFamily: 'var(--mono)', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: o?.bold ? 700 : 400, color: o?.neg && v < 0 ? 'var(--red)' : v === 0 ? 'var(--faint)' : (o?.color || 'var(--ink-2)'), background: o?.bg, borderBottom: '1px solid var(--line)' }}>
            {v === 0 ? '—' : o?.neg && v < 0 ? `($${Math.round(Math.abs(v)).toLocaleString()})` : money(v)}
          </td>
        ))}
        <td style={{ ...totS, fontWeight: 700 }}>{total === 0 ? '—' : fmtM(total)}</td>
      </tr>
    )
  }
  const dividerRow = (label: string) => (
    <tr key={`div-${label}`}>
      <td style={{ ...nameS, background: 'var(--card-3, rgba(0,0,0,0.05))', color: 'var(--gold)', fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 700 }}>{label}</td>
      <td colSpan={N + 1} style={{ background: 'var(--card-3, rgba(0,0,0,0.05))', borderBottom: '1px solid var(--line)' }} />
    </tr>
  )

  const netArr = grv.map((v, i) => v - tdcByMonth[i])
  const fundArr = eqArr.map((v, i) => v + debtDrawArr[i])
  const debtBalEOP = (() => {
    const a = Array(N).fill(0)
    for (const m of wf.months) { const ix = monthIndex(m.month, startYM, N); if (ix != null) a[ix] = m.debtBalanceEOP }
    return a
  })()

  return (
    <div className="fx-wrap overflow-auto" style={{ minHeight: 0 }}>
      <div className="pagehead">
        <div>
          <div className="kicker">06 · Cash Flow</div>
          <h1 className="h-sec">Cash Flow</h1>
          <div className="h-sub">Revenue at the top, every real cost line item flat underneath, then Total Development Cost and pre-finance Net Cashflow. This plot is the source of truth for WHEN costs draw — the finance rows below are the real debt waterfall run on it (equity-first, tranches in priority, interest + establishment/line/exit fees), the same run behind Finance, Overview and Dashboard.</div>
        </div>
        <div className="flex gap aic wrapf"><span className="check">✓ Auto-saved</span></div>
      </div>

      {/* Sector toggle + programme config + drag hint */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', margin: '2px 0 14px' }}>
        <span style={{ display: 'inline-flex', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          {([['btr', 'BTR — rent ramp-up'], ['bts', 'BTS — settlement curve'], ['hotel', 'Hotel — occupancy ramp']] as [Sector, string][]).map(([s, l]) => (
            <button key={s} onClick={() => { setSector(s); setGrvMoved(null) }}
              style={{ border: 'none', background: sector === s ? 'var(--ink)' : 'none', color: sector === s ? 'var(--card, #fff)' : 'var(--ink-3)', borderRadius: 8, padding: '8px 14px', fontSize: 11, letterSpacing: '.06em', fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase' }}>{l}</button>
          ))}
        </span>
        <label style={{ fontSize: 10, color: 'var(--ink-2)' }}>Start <input type="month" value={startYM} onChange={e => updateState({ startDate: e.target.value })} style={{ marginLeft: 6, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--ink)' }} /></label>
        <label style={{ fontSize: 10, color: 'var(--ink-2)' }}>Months <input type="number" value={N} onChange={e => updateState({ months: Math.max(12, Math.min(120, parseInt(e.target.value, 10) || 36)) })} style={{ marginLeft: 6, width: 64, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--ink)' }} /></label>
        <label style={{ fontSize: 10, color: 'var(--ink-2)' }} title="Sponsor equity drawn before any debt">Equity first $ <input type="number" step={100000} value={state.equityFirst || 0} onChange={e => updateState({ equityFirst: Math.max(0, parseInt(e.target.value, 10) || 0) })} style={{ marginLeft: 6, width: 110, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--input-ink, var(--ink))', textAlign: 'right' }} /></label>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>Drag any <b style={{ color: 'var(--ink)' }}>cost amount</b> onto another month to re-time it — the waterfall below (and every finance figure in the app) recalculates from your new timing.</span>
      </div>

      {/* The grid */}
      <div className="panel gold-top" style={{ overflow: 'hidden' }}>
        <div className="scrollx" style={{ maxHeight: '72vh', overflow: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ ...thS, ...nameS, zIndex: 6, borderBottom: '1px solid var(--border-hi)' }}>Line item</th>
                {Array.from({ length: N }, (_, i) => { const L = label(i); return <th key={i} style={thS}><div>{L.top}</div><div style={{ color: 'var(--faint)', fontWeight: 400, fontSize: 8 }}>{L.bot}</div></th> })}
                <th style={{ ...thS, ...totS, zIndex: 6, borderBottom: '1px solid var(--border-hi)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {/* GRV / Revenue */}
              {renderDataRow({ key: 'grv', kind: 'grv', name: 'GRV / Revenue', base: grv }, { nameColor: 'var(--emerald)', bold: true, arr: grv })}
              {/* Cost line items, flat under category dividers */}
              {model.map(r => ('div' in r ? dividerRow(r.div) : renderDataRow(r)))}
              {/* TDC + Net */}
              {calcRow('Total Development Cost', tdcByMonth, { bold: true, bg: 'var(--card-2)' })}
              {calcRow('Net Cashflow (pre-finance)', netArr, { neg: true, color: 'var(--ink-2)' })}
              {/* Finance — the REAL debt waterfall (same engine + same run as the
                  Finance tab, Overview and Dashboard; reconciles to the dollar) */}
              {dividerRow('Finance — Equity & Debt · real waterfall')}
              {calcRow('Equity Draw (sponsor + preferred)', eqArr, { color: 'var(--emerald)', bold: true })}
              {trancheRows.map(({ t, draw, interest, fees }) => (
                <React.Fragment key={t.id}>
                  {calcRow(`${t.label} — Draw (facility ${fmtM(t.facility)})`, draw, { color: 'var(--blue)', bold: true })}
                  {calcRow(`Interest — ${t.label}`, interest, { color: 'var(--amber)', indent: true, italic: true })}
                  {fees.some(v => v > 0.5) && calcRow(`Fees — ${t.label} (estab · line · exit)`, fees, { color: 'var(--amber)', indent: true, italic: true })}
                </React.Fragment>
              ))}
              {calcRow('Total Funding Drawn (Equity + Debt)', fundArr, { bold: true, bg: 'var(--card-2)' })}
              {calcRow('Total Finance Cost (interest + fees)', wfArr(m => m.interestTotal + Object.values(m.feeByTranche).reduce((s, v) => s + v, 0)), { color: 'var(--amber)', bold: true })}
              {calcRow('Debt Balance (EOP)', debtBalEOP, { color: 'var(--ink-2)', eop: true })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 12, fontSize: 11, color: 'var(--ink-2)' }}>
        <span>GRV / Revenue — draggable, swaps per sector</span>
        <span>Cost line item — draggable (persists to the line's monthly timing and drives the finance waterfall)</span>
        <span style={{ color: 'var(--amber)' }}>Equity / Debt / Interest / Fees — computed by the real waterfall from YOUR cost timing; matches Finance · Overview · Dashboard to the dollar</span>
      </div>
    </div>
  )
}
