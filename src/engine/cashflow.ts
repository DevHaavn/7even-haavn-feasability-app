// ── Development cashflow engine ───────────────────────────────────────────────
// Spreads each phase's cost across its months by an S-curve, then funds the
// programme equity-first (sponsor equity up to `equityFirst`, then debt). Blend
// lines draw equity while budget remains, else debt; equity/debt lines are
// forced. Produces a month-by-month matrix + funding profile for the CFO view.

import type { CashflowState, CostPhase, SCurveProfile, PhaseTiming, CashflowManualEntry } from '../db/schema'
import { COST_PHASES } from '../db/schema'

/** Monthly weights for a profile over n months, summing to 1. */
export function spreadWeights(profile: SCurveProfile, n: number): number[] {
  if (n <= 0) return []
  if (n === 1) return [1]
  let raw: number[]
  switch (profile) {
    case 'linear':     raw = Array(n).fill(1); break
    case 'upfront':    raw = Array.from({ length: n }, (_, i) => n - i); break        // front-loaded
    case 'backloaded': raw = Array.from({ length: n }, (_, i) => i + 1); break        // back-loaded
    case 'scurve':
    default: {
      // difference of a logistic CDF → classic S-curve draw
      const k = 8 / n, mid = (n - 1) / 2
      const cdf = (x: number) => 1 / (1 + Math.exp(-k * (x - mid)))
      raw = Array.from({ length: n }, (_, i) => cdf(i + 0.5) - cdf(i - 0.5))
    }
  }
  const sum = raw.reduce((a, b) => a + b, 0) || 1
  return raw.map(w => w / sum)
}

export function defaultPhaseTiming(): Record<CostPhase, PhaseTiming> {
  return {
    'pre-acquisition':      { startMonth: 0,  durationMonths: 3,  sCurve: 'upfront', fundedBy: 'equity' },
    'acquisition-planning': { startMonth: 2,  durationMonths: 6,  sCurve: 'linear',  fundedBy: 'equity' },
    'pre-construction':     { startMonth: 6,  durationMonths: 6,  sCurve: 'linear',  fundedBy: 'blend'  },
    'construction':         { startMonth: 10, durationMonths: 24, sCurve: 'scurve',  fundedBy: 'debt'   },
    'close-out':            { startMonth: 32, durationMonths: 4,  sCurve: 'backloaded', fundedBy: 'blend' },
  }
}

export function defaultCashflowState(projectId: string): CashflowState {
  const now = new Date()
  return {
    projectId,
    startDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    months: 36,
    equityFirst: 0,
    phases: defaultPhaseTiming(),
    manual: [],
  }
}

export interface CashflowResult {
  months: number
  monthLabels: { n: number; date: string }[]         // month # + 'Mmm-YY'
  phaseRows: { phase: CostPhase; label: string; monthly: number[]; total: number }[]
  totalByMonth: number[]
  equityByMonth: number[]
  debtByMonth: number[]
  cumEquity: number[]
  cumDebt: number[]
  peakEquity: number
  peakDebt: number
  total: number
}

function monthLabel(startDate: string, offset: number): string {
  const [y, m] = startDate.split('-').map(Number)
  if (!y || !m) return `M${offset + 1}`
  const d = new Date(y, (m - 1) + offset, 1)
  return d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
}

/** Build the cashflow. `phaseCosts` = total $ per phase from the cost stack. */
export function buildCashflow(state: CashflowState, phaseCosts: Record<CostPhase, number>): CashflowResult {
  const months = Math.max(1, state.months || 36)
  const zero = () => Array(months).fill(0)

  // 1) spread each phase's total across its window; capture funding source per month
  const phaseRows: CashflowResult['phaseRows'] = []
  const equityForced = zero(), debtForced = zero(), blend = zero()

  for (const { id, label } of COST_PHASES) {
    const total = phaseCosts[id] || 0
    const t = state.phases[id]
    const monthly = zero()
    if (total > 0 && t) {
      const start = Math.max(0, Math.min(months - 1, t.startMonth))
      const dur = Math.max(1, Math.min(months - start, t.durationMonths))
      const w = spreadWeights(t.sCurve, dur)
      for (let i = 0; i < dur; i++) {
        const v = total * w[i]
        monthly[start + i] += v
        if (t.fundedBy === 'equity') equityForced[start + i] += v
        else if (t.fundedBy === 'debt') debtForced[start + i] += v
        else blend[start + i] += v
      }
    }
    phaseRows.push({ phase: id, label, monthly, total })
  }

  // 2) manual entries — add to the phase row + funding bucket at their month
  for (const e of state.manual || []) {
    const m = Math.max(0, Math.min(months - 1, e.month))
    const row = phaseRows.find(r => r.phase === e.phase)
    if (row) { row.monthly[m] += e.amount; row.total += e.amount }
    if (e.fundedBy === 'equity') equityForced[m] += e.amount
    else if (e.fundedBy === 'debt') debtForced[m] += e.amount
    else blend[m] += e.amount
  }

  // 3) fund equity-first: forced equity + blend up to the equity budget, rest debt
  const totalByMonth = zero(), equityByMonth = zero(), debtByMonth = zero(), cumEquity = zero(), cumDebt = zero()
  let ce = 0, cd = 0
  for (let m = 0; m < months; m++) {
    const remainingBudget = Math.max(0, state.equityFirst - ce)
    const equityFromBlend = Math.min(blend[m], remainingBudget)
    const eq = equityForced[m] + equityFromBlend
    const dt = debtForced[m] + (blend[m] - equityFromBlend)
    equityByMonth[m] = eq; debtByMonth[m] = dt; totalByMonth[m] = eq + dt
    ce += eq; cd += dt; cumEquity[m] = ce; cumDebt[m] = cd
  }

  return {
    months,
    monthLabels: Array.from({ length: months }, (_, i) => ({ n: i + 1, date: monthLabel(state.startDate, i) })),
    phaseRows,
    totalByMonth, equityByMonth, debtByMonth, cumEquity, cumDebt,
    peakEquity: Math.max(0, ...cumEquity),
    peakDebt: Math.max(0, ...cumDebt),
    total: totalByMonth.reduce((a, b) => a + b, 0),
  }
}
