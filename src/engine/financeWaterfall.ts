import type { CostLineItem, DebtTranche, FinanceAssumptions, DetailedCostStack, LandTerms } from '../db/schema'
import { spreadWeights } from './cashflow'

// ── Month helpers ─────────────────────────────────────────────────────────────
const DAYS_IN_MONTH = 30.4375 // average — used for day-count interest

function ym(y: number, m: number): string { return `${y}-${String(m).padStart(2, '0')}` }
function parseYm(s?: string): [number, number] | null {
  if (!s) return null
  const [y, m] = s.slice(0, 7).split('-').map(Number)
  return y && m ? [y, m] : null
}
function addMonth(y: number, m: number, k: number): [number, number] {
  const t = (y * 12 + (m - 1)) + k
  return [Math.floor(t / 12), (t % 12) + 1]
}
function monthDiff(a: string, b: string): number {
  const pa = parseYm(a)!, pb = parseYm(b)!
  return (pb[0] * 12 + pb[1]) - (pa[0] * 12 + pa[1])
}
function monthList(start: string, end: string): string[] {
  const ps = parseYm(start)!, pe = parseYm(end)!
  const out: string[] = []
  let [y, m] = ps
  let guard = 0
  while ((y < pe[0] || (y === pe[0] && m <= pe[1])) && guard < 600) { out.push(ym(y, m)); [y, m] = addMonth(y, m, 1); guard++ }
  return out
}
function quarterOf(month: string): string {
  const [y, m] = parseYm(month)!
  return `Q${Math.floor((m - 1) / 3) + 1} ${String(y).slice(2)}`
}

// ── Result types ──────────────────────────────────────────────────────────────
export interface WaterfallMonth {
  month: string
  costDraw: number
  equityDraw: number
  debtDraw: number
  interestByTranche: Record<string, number>
  interestTotal: number
  debtBalanceEOP: number
}
export interface TrancheWaterfall {
  id: string; label: string; type: DebtTranche['type']
  facility: number; peakDrawn: number
  interestTotal: number; capitalisedInterest: number; cashInterest: number
  rate: number; interestModel: string; capitalised: boolean; dayCount: string
}
export interface CategoryFinance {
  category: string; baseCost: number; debtDrawn: number; avgHoldMonths: number
  seniorInt: number; mezzInt: number; prefInt: number; total: number
}
export interface QuarterPoint {
  quarter: string
  debtDraw: number; equityDraw: number; interestTotal: number
  debtBalanceEOP: number; interestByTranche: Record<string, number>
}
export interface WaterfallResult {
  months: WaterfallMonth[]
  quarters: QuarterPoint[]
  tranches: TrancheWaterfall[]
  baseTDC: number
  totalFinanceCost: number
  peakDebt: number
  seniorCapitalised: number
  allInTDC: number
  categories: CategoryFinance[]
  startMonth: string
  endMonth: string
}

const SECTION_LABEL: Record<keyof Omit<DetailedCostStack, 'projectId'>, string> = {
  hardCosts: 'Construction', consultants: 'Consultants', statutory: 'Statutory',
  headworks: 'Headworks', management: 'Management', marketing: 'Marketing',
}

// Spread one line item's amount across its start→end window using its s-curve shape.
function itemMonthly(it: CostLineItem, fallbackStart: string, fallbackEnd: string): Record<string, number> {
  const start = it.startDate?.slice(0, 7) || fallbackStart
  const end = it.endDate?.slice(0, 7) || start
  const months = monthList(start, end)
  const n = Math.max(1, months.length)
  const weights = spreadWeights(it.sCurve || 'linear', n)
  const amt = it.amount || 0
  const out: Record<string, number> = {}
  months.forEach((mo, i) => { out[mo] = (out[mo] || 0) + amt * (weights[i] ?? 1 / n) })
  return out
}

/**
 * Monthly debt-and-interest waterfall.
 * Funding rule (standard): equity is drawn first up to the equity requirement
 * (base TDC − total debt facilities), then debt tranches fund the remaining draws
 * in priority order (land → senior → mezz → pref-equity), each capped at its facility.
 * Interest accrues monthly on the drawn balance per the tranche's model/day-count;
 * capitalised (and PIK) interest rolls into the balance, cash-pay does not.
 */
export function calculateFinanceWaterfall(
  detailed: DetailedCostStack,
  land: LandTerms,
  fa: FinanceAssumptions,
  baseTDCOverride?: number,
): WaterfallResult {
  const sections = ['hardCosts', 'consultants', 'statutory', 'headworks', 'management', 'marketing'] as const

  // 1) Establish the timeline window from every dated line item (+ land settlement).
  const allItems: { it: CostLineItem; section: string }[] = []
  for (const s of sections) for (const it of detailed[s] || []) allItems.push({ it, section: s })
  const dated = allItems.map(x => x.it).filter(it => it.startDate || it.endDate)
  const landMonth = land.settlementDate?.slice(0, 7)
  let starts = dated.map(it => (it.startDate || it.endDate)!.slice(0, 7))
  let ends = dated.map(it => (it.endDate || it.startDate)!.slice(0, 7))
  if (landMonth) { starts.push(landMonth); ends.push(landMonth) }
  if (starts.length === 0) { starts = ['2025-01']; ends = ['2027-12'] }
  const startMonth = starts.sort()[0]
  const endMonth = ends.sort()[ends.length - 1]
  const timeline = monthList(startMonth, endMonth)

  // 2) Per-month cost draws (total + per category) and category timing.
  const costByMonth: Record<string, number> = {}
  const catDraw: Record<string, Record<string, number>> = {} // category -> month -> draw
  const landAmount = (land.landCost || 0)
  const addDraw = (cat: string, mo: string, v: number) => {
    if (!v) return
    costByMonth[mo] = (costByMonth[mo] || 0) + v
    catDraw[cat] = catDraw[cat] || {}
    catDraw[cat][mo] = (catDraw[cat][mo] || 0) + v
  }
  // Land draws upfront at settlement (or timeline start).
  addDraw('Land', landMonth || startMonth, landAmount)
  for (const { it, section } of allItems) {
    const m = itemMonthly(it, startMonth, endMonth)
    for (const mo in m) addDraw(SECTION_LABEL[section as keyof typeof SECTION_LABEL], mo, m[mo])
  }

  const baseTDC = baseTDCOverride ?? Object.values(costByMonth).reduce((s, v) => s + v, 0)

  // 3) Tranche facilities + equity requirement.
  const activeTranches = fa.tranches
    .map(t => {
      const facility = t.useAutoLvr ? baseTDC * (t.lvr || 0) : (t.amount || 0)
      return { t, facility }
    })
    .filter(x => x.facility > 0 && x.t.type !== 'equity')
  // Priority order for funding.
  const order: Record<string, number> = { land: 0, senior: 1, mezz: 2, 'preferred-equity': 3 }
  activeTranches.sort((a, b) => (order[a.t.type] ?? 9) - (order[b.t.type] ?? 9))
  // Cap total gearing so debt never exceeds MAX_LVR of TDC — leaves a sensible
  // equity slice and stops oversized/legacy facilities from funding everything.
  const MAX_LVR = 0.80
  const sumFac = activeTranches.reduce((s, x) => s + x.facility, 0)
  if (sumFac > baseTDC * MAX_LVR && sumFac > 0) {
    const scale = (baseTDC * MAX_LVR) / sumFac
    activeTranches.forEach(x => { x.facility *= scale })
  }
  const totalDebtFacility = activeTranches.reduce((s, x) => s + x.facility, 0)
  const equityRequirement = Math.max(0, baseTDC - totalDebtFacility)

  // 4) Monthly waterfall.
  const balance: Record<string, number> = {}       // tranche id -> outstanding
  const drawn: Record<string, number> = {}          // tranche id -> cumulative drawn (principal)
  const peakDrawn: Record<string, number> = {}
  const capInt: Record<string, number> = {}
  const cashInt: Record<string, number> = {}
  const intTotal: Record<string, number> = {}
  activeTranches.forEach(x => { balance[x.t.id] = 0; drawn[x.t.id] = 0; peakDrawn[x.t.id] = 0; capInt[x.t.id] = 0; cashInt[x.t.id] = 0; intTotal[x.t.id] = 0 })

  let equityDrawnCum = 0
  const months: WaterfallMonth[] = []

  for (const mo of timeline) {
    const need = costByMonth[mo] || 0
    let remaining = need
    let equityDraw = 0
    let debtDraw = 0

    // Equity first, up to the equity requirement.
    if (equityDrawnCum < equityRequirement && remaining > 0) {
      const e = Math.min(remaining, equityRequirement - equityDrawnCum)
      equityDraw += e; equityDrawnCum += e; remaining -= e
    }
    // Then debt tranches in priority, capped at facility.
    for (const x of activeTranches) {
      if (remaining <= 0) break
      const room = x.facility - drawn[x.t.id]
      if (room <= 0) continue
      const d = Math.min(remaining, room)
      drawn[x.t.id] += d; balance[x.t.id] += d; debtDraw += d; remaining -= d
    }
    // Anything left over (facilities exhausted) is topped up by equity.
    if (remaining > 0) { equityDraw += remaining; equityDrawnCum += remaining; remaining = 0 }

    // Interest accrual this month on the drawn balance.
    const interestByTranche: Record<string, number> = {}
    let interestTotal = 0
    for (const x of activeTranches) {
      const t = x.t
      const dc = (t.dayCount === 'act360' ? 360 : 365)
      const dcf = DAYS_IN_MONTH / dc
      const rate = t.interestRate || 0
      const bal = balance[t.id]
      if (bal <= 0) { interestByTranche[t.id] = 0; continue }
      const model = t.interestModel || (t.type === 'mezz' ? 'pik' : 'compound')
      const capitalised = t.capitalised ?? (t.type !== 'preferred-equity')
      const interest = bal * rate * dcf
      interestByTranche[t.id] = interest
      interestTotal += interest
      intTotal[t.id] += interest
      if (model === 'pik' || capitalised) { balance[t.id] += interest; capInt[t.id] += interest }
      else { cashInt[t.id] += interest }
      peakDrawn[t.id] = Math.max(peakDrawn[t.id], balance[t.id])
    }

    const debtBalanceEOP = activeTranches.reduce((s, x) => s + balance[x.t.id], 0)
    months.push({ month: mo, costDraw: need, equityDraw, debtDraw, interestByTranche, interestTotal, debtBalanceEOP })
  }

  // 5) Quarter aggregation.
  const qMap = new Map<string, QuarterPoint>()
  for (const m of months) {
    const q = quarterOf(m.month)
    let p = qMap.get(q)
    if (!p) { p = { quarter: q, debtDraw: 0, equityDraw: 0, interestTotal: 0, debtBalanceEOP: 0, interestByTranche: {} }; qMap.set(q, p) }
    p.debtDraw += m.debtDraw; p.equityDraw += m.equityDraw; p.interestTotal += m.interestTotal
    p.debtBalanceEOP = m.debtBalanceEOP // end of quarter = last month's EOP
    for (const id in m.interestByTranche) p.interestByTranche[id] = (p.interestByTranche[id] || 0) + m.interestByTranche[id]
  }
  const quarters = Array.from(qMap.values())

  // 6) Tranche summaries.
  const tranches: TrancheWaterfall[] = activeTranches.map(x => ({
    id: x.t.id, label: x.t.label, type: x.t.type,
    facility: x.facility, peakDrawn: peakDrawn[x.t.id],
    interestTotal: intTotal[x.t.id], capitalisedInterest: capInt[x.t.id], cashInterest: cashInt[x.t.id],
    rate: x.t.interestRate || 0,
    interestModel: x.t.interestModel || (x.t.type === 'mezz' ? 'pik' : 'compound'),
    capitalised: x.t.capitalised ?? (x.t.type !== 'preferred-equity'),
    dayCount: x.t.dayCount || 'act365',
  }))

  const totalFinanceCost = tranches.reduce((s, t) => s + t.interestTotal, 0)
  const peakDebt = months.reduce((mx, m) => Math.max(mx, m.debtBalanceEOP), 0)
  const seniorCapitalised = tranches.filter(t => t.type === 'senior' || t.type === 'land').reduce((s, t) => s + t.capitalisedInterest, 0)
  const allInTDC = baseTDC + totalFinanceCost

  // 7) Finance cost per TDC category (approximate allocation).
  // Share each tranche's interest across categories in proportion to (debt-funded $ × months held).
  const seniorRate = tranches.filter(t => t.type === 'senior' || t.type === 'land').reduce((s, t) => s + t.rate, 0) / Math.max(1, tranches.filter(t => t.type === 'senior' || t.type === 'land').length)
  const totalDebtInterest = { senior: tranches.filter(t => t.type === 'land' || t.type === 'senior').reduce((s, t) => s + t.interestTotal, 0), mezz: tranches.filter(t => t.type === 'mezz').reduce((s, t) => s + t.interestTotal, 0), pref: tranches.filter(t => t.type === 'preferred-equity').reduce((s, t) => s + t.interestTotal, 0) }
  const catNames = ['Land', 'Construction', 'Consultants', 'Statutory', 'Headworks', 'Management', 'Marketing']
  const debtFundedFraction = baseTDC > 0 ? Math.min(1, totalDebtFacility / baseTDC) : 0
  // weight = debtDrawn × avgHold
  const catStats = catNames.map(cat => {
    const draws = catDraw[cat] || {}
    const base = Object.values(draws).reduce((s, v) => s + v, 0)
    const debtDrawn = base * debtFundedFraction
    // avg hold = weighted months from each draw to project end
    let wsum = 0, w = 0
    for (const mo in draws) { const hold = Math.max(0, monthDiff(mo, endMonth)); wsum += draws[mo] * hold; w += draws[mo] }
    const avgHold = w > 0 ? wsum / w : 0
    return { cat, base, debtDrawn, avgHold, weight: debtDrawn * avgHold }
  })
  const weightTotal = catStats.reduce((s, c) => s + c.weight, 0) || 1
  const categories: CategoryFinance[] = catStats.map(c => {
    const share = c.weight / weightTotal
    const seniorInt = totalDebtInterest.senior * share
    const mezzInt = totalDebtInterest.mezz * share
    const prefInt = totalDebtInterest.pref * share
    return { category: c.cat, baseCost: c.base, debtDrawn: c.debtDrawn, avgHoldMonths: Math.round(c.avgHold), seniorInt, mezzInt, prefInt, total: seniorInt + mezzInt + prefInt }
  }).filter(c => c.baseCost > 0)

  void seniorRate
  return { months, quarters, tranches, baseTDC, totalFinanceCost, peakDebt, seniorCapitalised, allInTDC, categories, startMonth, endMonth }
}
