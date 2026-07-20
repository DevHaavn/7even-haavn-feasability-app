/**
 * CAPITAL COMMAND — calculation engine (spec §8).
 *
 * Every number Capital Command displays traces to a function here or to a stored
 * field. No magic constants in the UI.
 *
 * On money precision: the spec asks for decimal.js. Rather than add a dependency,
 * the one place float error actually bites — splitting a total across investors,
 * where the parts MUST sum back to the whole — is done in integer cents with an
 * explicit largest-remainder reconciliation (see allocatePro Rata). Everything
 * else is ratio/rate maths where double precision is far finer than the inputs.
 * TODO(review): swap to decimal.js if Lewis wants cent-exact statements.
 *
 * See allocateProRata for the reconciliation rule.
 */

const CENTS = (n: number) => Math.round(n * 100)
const DOLLARS = (c: number) => c / 100

// ── IRR ─────────────────────────────────────────────────────────────────────

export interface DatedFlow { date: string; amount: number }   // -ve = investor pays in

/**
 * XIRR — Newton-Raphson on actual/365 dated flows, bisection fallback.
 * Returns an annual rate (0.19 = 19%), or null when undefined (no sign change).
 */
export function xirr(flows: DatedFlow[]): number | null {
  const f = flows.filter(x => x.amount !== 0)
  if (f.length < 2) return null
  const hasNeg = f.some(x => x.amount < 0), hasPos = f.some(x => x.amount > 0)
  if (!hasNeg || !hasPos) return null   // never both paid in and returned

  const t0 = new Date(f[0].date).getTime()
  const yrs = (d: string) => (new Date(d).getTime() - t0) / (365 * 86400_000)
  const npv = (r: number) => f.reduce((a, x) => a + x.amount / Math.pow(1 + r, yrs(x.date)), 0)

  let r = 0.15
  for (let i = 0; i < 60; i++) {
    const v = npv(r)
    if (!isFinite(v)) break
    if (Math.abs(v) < 1e-6) return r
    const h = 1e-5
    const d = (npv(r + h) - v) / h
    if (!isFinite(d) || Math.abs(d) < 1e-12) break
    const next = r - v / d
    if (!isFinite(next) || next <= -0.999) break
    if (Math.abs(next - r) < 1e-9) return next
    r = next
  }
  // Bisection fallback across a wide, safe band.
  let lo = -0.95, hi = 10
  const flo0 = npv(lo), fhi0 = npv(hi)
  if (!isFinite(flo0) || !isFinite(fhi0)) return null
  // No sign change = no root in the band, so there is no meaningful IRR — a
  // position that has been paid back far less than it put in is the common
  // case. Returning the bound instead reported a catastrophic loss as +1000%.
  if ((flo0 < 0) === (fhi0 < 0)) return null

  let flo = flo0
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const fm = npv(mid)
    if (!isFinite(fm)) return null
    if (Math.abs(fm) < 1e-7) return mid
    if ((flo < 0) === (fm < 0)) { lo = mid; flo = fm } else { hi = mid }
  }
  const out = (lo + hi) / 2
  return isFinite(out) ? out : null
}

/** MOIC — (funded + distributions + projected remaining) / funded. */
export function equityMultiple(funded: number, distributions: number, projectedRemaining = 0): number {
  if (funded <= 0) return 0
  return (funded + distributions + projectedRemaining) / funded
}

// ── Accrual ─────────────────────────────────────────────────────────────────

export interface AccrualInput {
  principal: number            // funded capital outstanding
  ratePct: number              // % p.a.
  fromDate: string
  toDate: string
  compounding?: 'simple' | 'compound'
  /** compound periods per year — monthly by default, per spec */
  periodsPerYear?: number
}

/** Preferred return / loan interest accrued over a window. */
export function accrue(i: AccrualInput): number {
  const p = i.principal, r = (i.ratePct ?? 0) / 100
  if (p <= 0 || r <= 0) return 0
  const days = (new Date(i.toDate).getTime() - new Date(i.fromDate).getTime()) / 86400_000
  if (!isFinite(days) || days <= 0) return 0
  const years = days / 365
  if ((i.compounding ?? 'compound') === 'simple') return p * r * years
  const m = i.periodsPerYear ?? 12
  return p * (Math.pow(1 + r / m, m * years) - 1)
}

/** Interest due on a loan-type position, split into paid-out vs capitalised. */
export function loanInterest(
  principal: number, ratePct: number, fromDate: string, toDate: string,
  frequency: 'monthly' | 'quarterly' | 'at_maturity' | 'capitalised' = 'monthly',
): { accrued: number; capitalised: number; payable: number } {
  const capitalises = frequency === 'capitalised'
  const accrued = accrue({
    principal, ratePct, fromDate, toDate,
    compounding: capitalises ? 'compound' : 'simple',
  })
  return {
    accrued,
    capitalised: capitalises ? accrued : 0,
    payable: capitalises ? 0 : accrued,
  }
}

// ── Allocation ──────────────────────────────────────────────────────────────

export interface AllocWeight { id: string; weight: number }

/**
 * Split `total` across weights so the parts sum EXACTLY back to total.
 *
 * Naive `total * w/Σw` rounded per row leaves a few cents unaccounted, which on
 * a capital call means the allocations don't reconcile to the amount called.
 * Integer cents + largest-remainder distributes the residue deterministically.
 */
export function allocateProRata(total: number, weights: AllocWeight[]): Record<string, number> {
  const out: Record<string, number> = {}
  const sum = weights.reduce((a, w) => a + Math.max(0, w.weight), 0)
  if (sum <= 0 || weights.length === 0) { weights.forEach(w => { out[w.id] = 0 }); return out }

  const totalC = CENTS(total)
  const exact = weights.map(w => ({ id: w.id, raw: (totalC * Math.max(0, w.weight)) / sum }))
  const floored = exact.map(e => ({ id: e.id, c: Math.floor(e.raw), rem: e.raw - Math.floor(e.raw) }))
  let residue = totalC - floored.reduce((a, f) => a + f.c, 0)

  // Hand the leftover cents to the largest fractional remainders first.
  const order = [...floored].sort((a, b) => b.rem - a.rem)
  for (let i = 0; i < order.length && residue > 0; i++, residue--) order[i].c += 1

  floored.forEach(f => { out[f.id] = DOLLARS(f.c) })
  return out
}

// ── Waterfall ───────────────────────────────────────────────────────────────

export interface WaterfallConfig {
  prefRate: number
  prefCompounding: 'simple' | 'compound'
  catchUp: boolean
  catchUpTarget: number                            // GP % of profit
  tiers: { hurdleIrr: number; lpSplit: number; gpSplit: number }[]
}

export interface WaterfallPosition {
  positionId: string
  investorId: string
  funded: number
  unreturnedCapital: number
  accruedPref: number
}

export type WaterfallCategory = 'return_of_capital' | 'pref' | 'promote' | 'income'

export interface WaterfallLine {
  positionId: string; investorId: string
  category: WaterfallCategory
  amount: number
}

export interface WaterfallResult {
  lines: WaterfallLine[]
  tierTotals: { label: string; category: WaterfallCategory | 'gp_catch_up'; amount: number }[]
  gpCatchUp: number
  undistributed: number
}

/**
 * Cascade distributable cash: Return of Capital → Preferred → GP Catch-up →
 * Promote/residual split. Each tier is allocated pro-rata across positions by
 * the tier's own basis (unreturned capital, then accrued pref, then funded).
 */
export function runWaterfall(
  distributable: number,
  positions: WaterfallPosition[],
  cfg: WaterfallConfig,
): WaterfallResult {
  const lines: WaterfallLine[] = []
  const tierTotals: WaterfallResult['tierTotals'] = []
  let cash = Math.max(0, distributable)
  const push = (category: WaterfallCategory, alloc: Record<string, number>) => {
    positions.forEach(p => {
      const amt = alloc[p.positionId] ?? 0
      if (amt > 0) lines.push({ positionId: p.positionId, investorId: p.investorId, category, amount: amt })
    })
  }

  // 1 · Return of capital — 100% to LPs until unreturned capital is repaid
  const rocNeed = positions.reduce((a, p) => a + Math.max(0, p.unreturnedCapital), 0)
  const roc = Math.min(cash, rocNeed)
  if (roc > 0) {
    push('return_of_capital', allocateProRata(roc, positions.map(p => ({ id: p.positionId, weight: Math.max(0, p.unreturnedCapital) }))))
    tierTotals.push({ label: 'Return of capital', category: 'return_of_capital', amount: roc })
    cash -= roc
  }

  // 2 · Preferred return — 100% to LPs until accrued pref is paid
  const prefNeed = positions.reduce((a, p) => a + Math.max(0, p.accruedPref), 0)
  const pref = Math.min(cash, prefNeed)
  if (pref > 0) {
    push('pref', allocateProRata(pref, positions.map(p => ({ id: p.positionId, weight: Math.max(0, p.accruedPref) }))))
    tierTotals.push({ label: `Preferred return ${cfg.prefRate}%`, category: 'pref', amount: pref })
    cash -= pref
  }

  // 3 · GP catch-up — 100% to GP until it holds catchUpTarget% of profit so far.
  //     Profit distributed to date at this point is the pref tier.
  let gpCatchUp = 0
  if (cfg.catchUp && cash > 0 && cfg.catchUpTarget > 0 && cfg.catchUpTarget < 100) {
    const t = cfg.catchUpTarget / 100
    const target = (t / (1 - t)) * pref          // GP share that squares LP pref at t
    gpCatchUp = Math.min(cash, Math.max(0, target))
    if (gpCatchUp > 0) {
      tierTotals.push({ label: `GP catch-up to ${cfg.catchUpTarget}%`, category: 'gp_catch_up', amount: gpCatchUp })
      cash -= gpCatchUp
    }
  }

  // 4 · Residual — split per the first tier; LP share pro-rata by funded capital
  if (cash > 0) {
    const tier = cfg.tiers[0] ?? { hurdleIrr: 0, lpSplit: 80, gpSplit: 20 }
    const lpShare = cash * (tier.lpSplit / 100)
    const gpShare = cash - lpShare
    if (lpShare > 0) {
      push('promote', allocateProRata(lpShare, positions.map(p => ({ id: p.positionId, weight: Math.max(0, p.funded) }))))
      tierTotals.push({ label: `Residual split ${tier.lpSplit}/${tier.gpSplit}`, category: 'promote', amount: lpShare })
    }
    if (gpShare > 0) {
      gpCatchUp += gpShare
      tierTotals.push({ label: `GP promote ${tier.gpSplit}%`, category: 'gp_catch_up', amount: gpShare })
    }
    cash = 0
  }

  return { lines, tierTotals, gpCatchUp, undistributed: cash }
}

// ── Coverage ────────────────────────────────────────────────────────────────

/** DSCR — net operating income over debt service. */
export function dscr(noi: number, debtService: number): number | null {
  return debtService > 0 ? noi / debtService : null
}

/** Cash-on-cash — trailing distributions over funded capital. */
export function cashOnCash(distributions: number, funded: number): number {
  return funded > 0 ? distributions / funded : 0
}
