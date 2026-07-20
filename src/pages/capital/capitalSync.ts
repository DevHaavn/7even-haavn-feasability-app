/**
 * PULL FROM FEASIBILITY (spec §7)
 *
 * The spec assumes Capital Command is a separate Next.js app that reaches the
 * Feasibility Studio over HTTP (`FEASIBILITY_API_BASE`) or via a hand-exported
 * .json file. In this build they are the SAME app — Capital Base is a pillar
 * inside the studio — so neither is needed: we read the studio's own store
 * directly and get live figures with no export step, no API key and no drift.
 *
 * The canonical payload shape from §7 is kept intact as `FeasibilityProject`
 * so that when Capital Command is split into its own deployment, only
 * `readFeasibility()` changes — the mapping and the importer stay as they are.
 */

import * as db from '../../db'
import { buildCashflow } from '../../engine/cashflow'
import { calculateFinanceWaterfall } from '../../engine/financeWaterfall'
import type { CapProject, CapitalState } from './capitalModel'

/** §7 canonical import payload — the contract, kept in one place. */
export interface FeasibilityProject {
  ref: string
  code?: string
  name: string
  address?: string
  assetType?: 'BTR' | 'BTS' | 'HOTEL' | 'MIXED'
  phase?: string
  status?: 'live' | 'hold' | 'complete'
  economics: {
    gdv: number; tdc: number
    devMargin?: number; projectIrr?: number; equityMultiple?: number
    equityRequired: number; debtRequired: number
    peakEquity?: number; peakDebt?: number
  }
  capitalStack: { tranche: string; type: string; amount: number; rate?: number }[]
  cashflow: { month: number; label: string; spend: number; equityDraw: number; debtDraw: number }[]
  milestones?: { name: string; date: string; pct?: number }[]
}

const ASSET: Record<string, FeasibilityProject['assetType']> = {
  btr: 'BTR', bts: 'BTS', hotel: 'HOTEL', mixed: 'MIXED',
}

/** Read every studio project into the §7 payload shape. */
export function readFeasibility(): FeasibilityProject[] {
  const out: FeasibilityProject[] = []
  for (const p of db.getProjects()) {
    let econ: FeasibilityProject['economics'] = { gdv: 0, tdc: 0, equityRequired: 0, debtRequired: 0 }
    let stack: FeasibilityProject['capitalStack'] = []
    let flows: FeasibilityProject['cashflow'] = []
    let milestones: FeasibilityProject['milestones'] = []

    // Each read is defensive: a half-built project must not break the whole sync.
    try {
      const m = db.getProfitMetrics(p.id)
      const t = db.getProjectTDC(p.id)
      // Equity required = the slice debt does not cover. Peak equity from the
      // cashflow is the truer number when it is available; the LVR split is the
      // fallback for a project with no cashflow modelled yet.
      const fa: any = db.getFinanceAssumptions(p.id)
      const lvr = fa?.constructionTranche?.lvr ?? fa?.landLvr ?? 0.65
      const equityRequired = m.peakEquity > 0 ? m.peakEquity : Math.max(0, t.tdc * (1 - lvr))
      econ = {
        gdv: m.gdv, tdc: t.tdc,
        devMargin: m.marginOnCost,
        projectIrr: m.irr == null ? undefined : m.irr * 100,
        equityMultiple: m.equityMultiple,
        equityRequired,
        debtRequired: Math.max(0, t.tdc - equityRequired),
        peakEquity: m.peakEquity,
      }
    } catch { /* leave zeroed */ }

    try {
      const wf: any = calculateFinanceWaterfall(
        db.getDetailedCostStack(p.id), db.getLandTerms(p.id), db.getFinanceAssumptions(p.id),
      )
      if (wf?.tranches) {
        stack = wf.tranches.map((tr: any) => ({
          tranche: tr.name ?? tr.label ?? 'Tranche',
          type: tr.type ?? 'senior',
          amount: tr.facility ?? tr.amount ?? 0,
          rate: tr.rate,
        }))
      }
    } catch { /* optional */ }

    try {
      const built = buildCashflow(db.getCashflow(p.id), db.getPhaseCosts(p.id))
      flows = (built.totalByMonth ?? []).map((spend: number, i: number) => ({
        month: i, label: `M${i + 1}`, spend,
        equityDraw: built.equityByMonth?.[i] ?? 0,
        debtDraw: built.debtByMonth?.[i] ?? 0,
      }))
    } catch { /* optional */ }

    try {
      milestones = db.getTimelineTasks(p.id)
        .filter(t => t.isMilestone)
        .map(t => ({ name: t.name, date: t.endDate, pct: t.progress }))
    } catch { /* optional */ }

    out.push({
      ref: p.id,
      name: p.name,
      address: p.address,
      assetType: ASSET[(p.type ?? '').toLowerCase()] ?? 'MIXED',
      status: p.status === 'on-hold' ? 'hold' : 'live',
      economics: econ, capitalStack: stack, cashflow: flows, milestones,
    })
  }
  return out
}

export interface SyncDiffLine {
  ref: string
  name: string
  isNew: boolean
  changes: { field: string; from: string; to: string }[]
}

const money = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n).toLocaleString()}`

/**
 * Compare a pull against current state WITHOUT applying it — the spec's diff
 * preview ("GDV $78M→$81M … Apply / Cancel"). Nothing is written until
 * applySync runs, so a surprising pull can be walked away from.
 */
export function diffSync(state: CapitalState, incoming: FeasibilityProject[]): SyncDiffLine[] {
  return incoming.map(f => {
    const existing = state.projects.find(p => p.feasibilityRef === f.ref)
      ?? state.projects.find(p => p.name.toLowerCase() === f.name.toLowerCase())
    if (!existing) return { ref: f.ref, name: f.name, isNew: true, changes: [] }

    const changes: SyncDiffLine['changes'] = []
    const cmp = (field: string, from: number, to: number, fmt = money) => {
      // Ignore sub-1% noise so the preview shows decisions, not float drift.
      if (to === 0 && from === 0) return
      const denom = Math.abs(from) || 1
      if (Math.abs(to - from) / denom > 0.01) changes.push({ field, from: fmt(from), to: fmt(to) })
    }
    cmp('GDV', existing.gdv, f.economics.gdv)
    cmp('TDC', existing.tdc, f.economics.tdc)
    cmp('Equity required', existing.equityRequired, f.economics.equityRequired)
    cmp('Debt required', existing.debtRequired, f.economics.debtRequired)
    if (f.economics.projectIrr != null && Math.abs((existing.projIrr ?? 0) - f.economics.projectIrr) > 0.1) {
      changes.push({ field: 'Project IRR', from: `${(existing.projIrr ?? 0).toFixed(1)}%`, to: `${f.economics.projectIrr.toFixed(1)}%` })
    }
    if (existing.phase && f.phase && existing.phase !== f.phase) {
      changes.push({ field: 'Phase', from: existing.phase, to: f.phase })
    }
    return { ref: f.ref, name: f.name, isNew: false, changes }
  })
}

/**
 * Apply a pull. Upserts by feasibilityRef (falling back to name), and
 * PRESERVES every Capital-Command-only field — capitalRequired, raiseDeadline,
 * fundStructure, waterfallId. A sync must never quietly reset Lewis's raise
 * target to the model's equity figure.
 */
export function applySync(state: CapitalState, incoming: FeasibilityProject[]): CapitalState {
  const projects = [...state.projects]
  const now = new Date().toISOString()

  for (const f of incoming) {
    const i = projects.findIndex(p => p.feasibilityRef === f.ref)
    const byName = i === -1 ? projects.findIndex(p => p.name.toLowerCase() === f.name.toLowerCase()) : -1
    const idx = i !== -1 ? i : byName

    const pulled = {
      name: f.name,
      address: f.address,
      assetType: f.assetType ?? 'MIXED',
      status: f.status ?? 'live',
      phase: f.phase,
      gdv: f.economics.gdv,
      tdc: f.economics.tdc,
      equityRequired: f.economics.equityRequired,
      debtRequired: f.economics.debtRequired,
      projIrr: f.economics.projectIrr,
      equityMultiple: f.economics.equityMultiple,
      devMargin: f.economics.devMargin,
      peakDebt: f.economics.peakDebt,
      peakEquity: f.economics.peakEquity,
      capitalStack: f.capitalStack,
      cashflow: f.cashflow,
      milestones: f.milestones,
      feasibilityRef: f.ref,
      feasibilitySyncedAt: now,
    }

    if (idx === -1) {
      const code = String(projects.length + 1).padStart(2, '0')
      projects.push({
        id: `prj_${f.ref}`, code,
        capitalRequired: f.economics.equityRequired,   // default only on create
        ...pulled,
      } as CapProject)
    } else {
      const prev = projects[idx]
      projects[idx] = {
        ...prev,
        ...pulled,
        // Capital-Command-owned — never overwritten by a sync.
        capitalRequired: prev.capitalRequired || f.economics.equityRequired,
        raiseDeadline: prev.raiseDeadline,
        fundStructure: prev.fundStructure,
        waterfallId: prev.waterfallId,
      }
    }
  }
  return { ...state, projects }
}
