// ── Cost plot: WHEN every dollar is spent ─────────────────────────────────────
// The Cashflow tab is the source of truth for cost TIMING (Daniel's rule): each
// line is plotted by its persisted `monthly` drag map first, then its own
// Start/End dates + S-curve, then the category's phase window. This module
// builds that monthly plot as a pure function so the finance waterfall draws on
// EXACTLY the months the Cashflow tab shows — re-time a cost there and the
// finance cost moves with it. Land follows the vendor payment schedule when one
// is entered; duty and acquisition extras land at settlement.

import type { DetailedCostStack, LandTerms, CashflowState, CostLineItem, SCurveProfile, CostPhase } from '../db/schema'
import type { LandCostBreakdown } from './landCost'
import { spreadWeights } from './cashflow'

export interface CostPlot {
  startYM: string
  months: number
  /** category label -> 'YYYY-MM' -> $ drawn that month */
  byCategory: Record<string, Record<string, number>>
  total: number
  /** last month with construction draws — debt clears here */
  repaymentMonth: string
}

const SECTION_LABEL: Record<keyof Omit<DetailedCostStack, 'projectId'>, string> = {
  hardCosts: 'Construction', consultants: 'Consultants', statutory: 'Statutory',
  headworks: 'Headworks', management: 'Management', marketing: 'Marketing',
}

// Section -> which phase window supplies the default timing (mirrors CashflowTab).
const SECTION_PHASE: Record<keyof Omit<DetailedCostStack, 'projectId'>, CostPhase | 'span'> = {
  statutory: 'acquisition-planning',
  consultants: 'pre-construction',
  headworks: 'construction',
  hardCosts: 'construction',
  marketing: 'close-out',
  management: 'span',
}
const SECTION_CURVE: Record<keyof Omit<DetailedCostStack, 'projectId'>, SCurveProfile> = {
  statutory: 'linear', consultants: 'linear', headworks: 'linear',
  hardCosts: 'scurve', marketing: 'backloaded', management: 'linear',
}

export function buildCostPlot(
  detailed: DetailedCostStack,
  land: LandTerms,
  landB: LandCostBreakdown,
  cf: CashflowState,
): CostPlot {
  const N = Math.max(12, Math.min(120, cf.months || 36))
  const startYM = (cf.startDate || '2026-01').slice(0, 7)
  const [py, pm] = startYM.split('-').map(Number)
  const ym = (i: number) => { const mm = (pm - 1) + i; return `${py + Math.floor(mm / 12)}-${String((mm % 12) + 1).padStart(2, '0')}` }
  const idx = (m?: string): number | null => {
    if (!m) return null
    const [y, mo] = m.slice(0, 7).split('-').map(Number)
    if (!y || !mo) return null
    return Math.max(0, Math.min(N - 1, (y - py) * 12 + (mo - pm)))
  }

  const byCategory: Record<string, Record<string, number>> = {}
  const add = (cat: string, i: number, v: number) => {
    if (!v) return
    const mo = ym(Math.max(0, Math.min(N - 1, i)))
    byCategory[cat] = byCategory[cat] || {}
    byCategory[cat][mo] = (byCategory[cat][mo] || 0) + v
  }
  const spreadInto = (cat: string, total: number, a0: number, a1: number, profile: SCurveProfile) => {
    if (!total) return
    const s = Math.max(0, Math.min(N - 1, a0)), e = Math.max(s, Math.min(N - 1, a1))
    const w = spreadWeights(profile, e - s + 1)
    for (let i = s; i <= e; i++) add(cat, i, total * w[i - s])
  }

  // ── Land: cash price via payment schedule (or lump at settlement); duty,
  //    acquisition costs, adjustments and finance-on-terms at settlement.
  //    In-kind deals have no cash price (its value carries no draw).
  const settleIdx = idx(land.settlementDate) ?? (cf.phases['pre-acquisition']?.startMonth ?? 0)
  const cashPrice = land.isInKind ? 0 : Math.max(0, landB.price - landB.gstCredit)
  const sched = (land.isInKind ? [] : (land.paymentSchedule ?? [])).filter(p => p.date && p.amount)
  if (cashPrice > 0) {
    if (sched.length > 0) {
      let placed = 0
      for (const p of sched) { const i = idx(p.date); if (i != null) { add('Land', i, p.amount); placed += p.amount } }
      if (cashPrice - placed > 1) add('Land', settleIdx, cashPrice - placed)
    } else {
      add('Land', settleIdx, cashPrice)
    }
  }
  const extras = Math.max(0, landB.total - cashPrice - (land.isInKind ? landB.inKindValue ?? 0 : 0))
  add('Land', settleIdx, extras)

  // ── Cost line items: monthly drag map → own dates → category phase window.
  const win = (p: CostPhase | 'span'): [number, number] => {
    if (p === 'span') return [Math.min(2, N - 1), N - 1]
    const t = cf.phases[p]
    if (!t) return [0, N - 1]
    const s = Math.max(0, Math.min(N - 1, t.startMonth))
    return [s, Math.max(s, Math.min(N - 1, s + Math.max(1, t.durationMonths) - 1))]
  }
  for (const sec of Object.keys(SECTION_LABEL) as (keyof Omit<DetailedCostStack, 'projectId'>)[]) {
    const cat = SECTION_LABEL[sec]
    const defWin = win(SECTION_PHASE[sec])
    for (const it of (detailed[sec] as CostLineItem[]) || []) {
      const amt = it.amount || 0
      if (!amt) continue
      const mKeys = it.monthly ? Object.keys(it.monthly) : []
      if (mKeys.length > 0) {
        // Persisted drag map — rescale if the budget moved since the drag.
        let tot = 0
        const cells: { i: number; v: number }[] = []
        for (const k of mKeys) { const i = idx(k); if (i != null) { cells.push({ i, v: it.monthly![k] }); tot += it.monthly![k] } }
        const scale = tot > 0 && Math.abs(tot - amt) > 1 ? amt / tot : 1
        for (const c of cells) add(cat, c.i, c.v * scale)
      } else {
        const s0 = idx(it.startDate), e0 = idx(it.endDate)
        const w: [number, number] = s0 != null ? [s0, e0 != null ? Math.max(s0, e0) : Math.max(s0, defWin[1])] : defWin
        spreadInto(cat, amt, w[0], w[1], it.sCurve || SECTION_CURVE[sec])
      }
    }
  }

  const total = Object.values(byCategory).reduce((s, m) => s + Object.values(m).reduce((a, b) => a + b, 0), 0)
  const constMonths = Object.keys(byCategory['Construction'] || {}).sort()
  const repaymentMonth = constMonths.length ? constMonths[constMonths.length - 1] : ym(N - 1)
  return { startYM, months: N, byCategory, total, repaymentMonth }
}
