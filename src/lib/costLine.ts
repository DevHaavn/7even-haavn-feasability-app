import type { CostLineItem, CostVariation } from '../db/schema'

// Shared cost-line maths for the Cost Stack v2 tools (table, detail modal, dashboard).
//
// INVARIANT: a line's persisted `amount` always equals its CURRENT budget =
// base build-up (units×rate / %-of-basis / entered) + the sum of its variations.
// Because getCostStack (db/index.ts) sums `amount`, keeping variations folded into
// `amount` makes every blow-out flow through to TDC / RLV / GST / cashflow / dashboard
// with no changes to the aggregation code.

export const GST_RATE = 0.1
export interface CostCtx { constructionValue: number; gdvValue: number }

const rid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

export const varSum = (it: CostLineItem) => (it.variations || []).reduce((s, v) => s + (+v.amount || 0), 0)

const basisVal = (it: CostLineItem, ctx: CostCtx) => (it.feeBasis === 'gdv' ? ctx.gdvValue : ctx.constructionValue)
const hasUnitRate = (it: CostLineItem) => (it.units ?? 0) > 0 && (it.baseRate ?? 0) > 0

/** Base budget WITHOUT variations. */
export function baseAmt(it: CostLineItem, ctx: CostCtx): number {
  if (it.feeBasis) return Math.round((it.pct ?? 0) * basisVal(it, ctx))
  if (hasUnitRate(it)) return Math.round((it.units || 0) * (it.baseRate || 0))
  return (it.amount || 0) - varSum(it)
}
/** Current budget = base + all variations (== the persisted `amount`). */
export const effAmt = (it: CostLineItem, ctx: CostCtx) => baseAmt(it, ctx) + varSum(it)
export const gstOf = (it: CostLineItem, ctx: CostCtx) => (it.gstFree ? 0 : effAmt(it, ctx) * GST_RATE)

/** Undefined pricing reads as 'variable' (not yet locked to a fee proposal). */
export const isFixed = (it: CostLineItem) => it.pricing === 'fixed'

// ── Patch builders — return a Partial<CostLineItem> to merge into the line ──────
export function withBasis(it: CostLineItem, v: string, ctx: CostCtx): Partial<CostLineItem> {
  const fb = (v || undefined) as CostLineItem['feeBasis']
  if (fb) return { feeBasis: fb, pct: it.pct ?? 0, amount: Math.round((it.pct ?? 0) * (fb === 'gdv' ? ctx.gdvValue : ctx.constructionValue)) + varSum(it) }
  return { feeBasis: undefined }
}
export function withPct(it: CostLineItem, pctPercent: number, ctx: CostCtx): Partial<CostLineItem> {
  const p = pctPercent / 100
  return { pct: p, amount: Math.round(p * basisVal(it, ctx)) + varSum(it) }
}
export function withUnits(it: CostLineItem, u: number, ctx: CostCtx): Partial<CostLineItem> {
  if (it.feeBasis && u > 0) {
    return { units: u, feeBasis: undefined, pct: undefined, amount: ((it.baseRate ?? 0) > 0 ? Math.round(u * (it.baseRate || 0)) : 0) + varSum(it) }
  }
  return { units: u, amount: ((u > 0 && (it.baseRate ?? 0) > 0) ? Math.round(u * (it.baseRate || 0)) : baseAmt(it, ctx)) + varSum(it) }
}
export function withRate(it: CostLineItem, r: number, ctx: CostCtx): Partial<CostLineItem> {
  return { baseRate: r, amount: (((it.units ?? 0) > 0 && r > 0) ? Math.round((it.units || 0) * r) : baseAmt(it, ctx)) + varSum(it) }
}

// ── Variations — add/remove folds the signed delta into `amount` ───────────────
export function withAddVariation(it: CostLineItem, v: { date: string; reason: string; amount: number }): Partial<CostLineItem> {
  const nv: CostVariation = { id: rid(), date: v.date, reason: v.reason, amount: +v.amount || 0 }
  return { variations: [...(it.variations || []), nv], amount: (it.amount || 0) + nv.amount }
}
export function withRemoveVariation(it: CostLineItem, id: string): Partial<CostLineItem> {
  const rem = (it.variations || []).find(x => x.id === id)
  return { variations: (it.variations || []).filter(x => x.id !== id), amount: (it.amount || 0) - (rem?.amount || 0) }
}

// ── Fee-certainty rollup for the dashboard gauge ───────────────────────────────
export function feeCertainty(items: CostLineItem[], ctx: CostCtx) {
  let fixed = 0, variable = 0, fixedN = 0, variableN = 0
  for (const it of items) {
    const b = effAmt(it, ctx)
    if (isFixed(it)) { fixed += b; fixedN++ } else { variable += b; variableN++ }
  }
  const total = fixed + variable
  return {
    fixed, variable, total, fixedN, variableN,
    pctFixed: total ? (fixed / total) * 100 : 0,
    pctVariable: total ? (variable / total) * 100 : 0,
  }
}
