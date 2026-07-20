/**
 * CAPITAL COMMAND — data model + store (Capital Base pillar 02)
 *
 * Mirrors the Postgres schema in CAPITALCOMMANDBUILD.md §6, but held as one JSON
 * blob under a capitalCloud key so it shares the Capital Base's existing sync
 * (localStorage + `capital_kv` + realtime fan-out) rather than needing a bespoke
 * table per entity. When real per-user auth lands this maps table-for-table.
 *
 * NOT STORED, DELIBERATELY: bank account name/BSB/account number, KYC and ID
 * documents, PEP checks and source-of-funds (spec §10.1). The Supabase anon key
 * ships in the public JS bundle and every policy is `using(true)`, so anything
 * written here is readable by anyone who opens devtools. That is an accepted
 * trust model for 7EVEN's own commercial data; it is not one for third parties'
 * banking and identity documents. The intake form renders those fields disabled
 * with an explanation — see ArchitectPdfPanel's sibling note in CapitalInvestors.
 */

import { loadKV, saveKV } from '../../lib/cloudStore'
import { allocateProRata } from '../../lib/capitalCalc'

export const CAPITAL_COMMAND_KEY = 'capital_command_v1'

// ── Entities ────────────────────────────────────────────────────────────────

export type AssetType = 'BTR' | 'BTS' | 'HOTEL' | 'MIXED'
export type ProjectStatus = 'live' | 'hold' | 'complete'

export interface CapProject {
  id: string
  code: string                 // '01'..'06'
  name: string
  address?: string
  assetType: AssetType
  status: ProjectStatus
  phase?: string
  // economics — pulled from the Feasibility Studio (§7)
  gdv: number
  tdc: number
  equityRequired: number
  debtRequired: number
  capitalRequired: number      // equity raise target; defaults to equityRequired
  projIrr?: number
  equityMultiple?: number
  devMargin?: number
  peakDebt?: number
  peakEquity?: number
  // capital-command overrides (never overwritten by a sync)
  raiseDeadline?: string
  fundStructure?: string
  waterfallId?: string
  // pulled payloads, kept for audit + drill-down
  capitalStack?: { tranche: string; type: string; amount: number; rate?: number }[]
  cashflow?: { month: number; label: string; spend: number; equityDraw: number; debtDraw: number }[]
  milestones?: { name: string; date: string; pct?: number }[]
  feasibilityRef?: string      // the studio project id this maps to
  feasibilitySyncedAt?: string
}

export interface CapStage {
  id: string
  projectId?: string           // undefined = portfolio-level stage
  stage: string
  required: number
  /** Positions link to PROJECTS, not stages, so a stage's raised/deployed
   *  cannot be derived the way a project's can. Held explicitly (spec §13). */
  raised?: number
  deployed?: number
  sort: number
}

export type InvestorStatus =
  | 'prospect' | 'engaged' | 'soft_commit' | 'committed' | 'onboarding' | 'active' | 'redeemed'

export interface CapInvestor {
  id: string
  companyName: string
  tradingName?: string
  entityType: string           // Individual|Company|Family Office|Trust|SMSF|Partnership|Syndicate|Institutional
  abnAcn?: string
  taxCountry?: string
  regAddr1?: string; regAddr2?: string; regSuburb?: string; regState?: string; regPostcode?: string; regCountry?: string
  postalSame?: boolean
  postalAddr1?: string; postalSuburb?: string; postalState?: string; postalPostcode?: string
  contactName?: string; contactRole?: string; email?: string; phone?: string; preferredContact?: string
  investorClass?: string       // Wholesale/Sophisticated (s708)|Professional|Retail
  certOnFile?: boolean
  kycStatus?: 'not_started' | 'in_progress' | 'verified'
  relationshipOwner: string    // Lewis Jin | D. Ferris
  status: InvestorStatus
  introducedBy?: string
  tags?: string[]
  notes?: string
  createdAt: string
  // NOTE: no bank* / pepCheck / sourceOfFunds fields — see the file header.
}

export interface CapContact {
  id: string; investorId: string
  name: string; role?: string; email?: string; phone?: string
}

export type InstrumentType = 'lp_equity' | 'pref_equity' | 'loan_note' | 'convertible'
export type PositionStatus = 'committed' | 'partially_funded' | 'funded' | 'repaid' | 'redeemed'

export interface CapPosition {
  id: string
  investorId: string
  projectId?: string           // undefined = portfolio / fund-level
  instrumentType: InstrumentType
  committedAmount: number      // "how much they're lending"
  fundedAmount: number         // "dollar amount funded to us" — Σ funded calls, override allowed
  fundedOverride?: boolean     // true = fundedAmount is manual, don't recompute from calls
  // equity terms
  prefRate?: number            // % p.a.
  prefCompounding?: 'simple' | 'compound'
  promoteParticipation?: number
  // debt terms
  interestRate?: number        // % p.a. "interest rate on their money"
  interestType?: 'fixed' | 'variable'
  paymentFrequency?: 'monthly' | 'quarterly' | 'at_maturity' | 'capitalised'
  securityPriority?: 'senior' | 'mezzanine' | 'subordinated' | 'unsecured' | 'equity'
  termMonths?: number
  drawdownDate?: string
  maturityDate?: string
  establishmentFee?: number
  lineFee?: number
  startDate?: string
  status: PositionStatus
}

export type CallStatus = 'draft' | 'issued' | 'part_funded' | 'funded' | 'overdue'

export interface CapCall {
  id: string
  projectId: string
  stage: string
  callDate: string
  dueDate: string
  totalAmount: number
  purpose?: string
  allocationMethod: 'pro_rata' | 'manual'
  status: CallStatus
}

export interface CapCallAllocation {
  id: string; callId: string; positionId: string; investorId: string
  amount: number; fundedAmount: number; fundedDate?: string
  status: 'outstanding' | 'part' | 'funded' | 'overdue'
}

export type DistStatus = 'draft' | 'calculated' | 'approved' | 'paid'

export interface CapDistribution {
  id: string
  projectId?: string
  distributionDate: string
  totalAmount: number
  source: 'rental' | 'sale' | 'refinance' | 'other'
  status: DistStatus
  waterfallId?: string
}

export type DistCategory = 'return_of_capital' | 'pref' | 'interest' | 'promote' | 'income'

export interface CapDistAllocation {
  id: string; distributionId: string; investorId: string; positionId: string
  category: DistCategory
  amount: number; paidDate?: string; status: 'pending' | 'paid'
}

export type PipeStage = 'prospect' | 'engaged' | 'soft_commit' | 'hard_commit' | 'funded'

export const PIPE_STAGES: { id: PipeStage; label: string }[] = [
  { id: 'prospect', label: 'Prospect' },
  { id: 'engaged', label: 'Engaged · DD' },
  { id: 'soft_commit', label: 'Soft Commit' },
  { id: 'hard_commit', label: 'Hard Commit' },
  { id: 'funded', label: 'Funded · 30d' },
]

export interface CapPipelineItem {
  id: string
  investorId?: string
  prospectName: string
  projectId?: string
  targetAmount: number
  stage: PipeStage
  probability: number
  owner: string
  nextAction?: string
  nextActionDate?: string
  notes?: string
  convertedPositionId?: string   // set when a funded card becomes a position
}

export interface CapActivity {
  id: string; investorId: string
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'doc'
  body: string; nextActionDate?: string; createdAt: string; createdBy?: string
}

export interface CapWaterfall {
  id: string; name: string
  prefRate: number
  prefCompounding: 'simple' | 'compound'
  catchUp: boolean
  catchUpTarget: number
  tiers: { hurdleIrr: number; lpSplit: number; gpSplit: number }[]
}

export interface CapObjective {
  id: string; label: string; target: number; current: number; unit?: string; owner?: string; sort: number
}

export interface CapitalState {
  projects: CapProject[]
  stages: CapStage[]
  investors: CapInvestor[]
  contacts: CapContact[]
  positions: CapPosition[]
  calls: CapCall[]
  callAllocations: CapCallAllocation[]
  distributions: CapDistribution[]
  distAllocations: CapDistAllocation[]
  pipeline: CapPipelineItem[]
  activities: CapActivity[]
  waterfalls: CapWaterfall[]
  objectives: CapObjective[]
}

// ── ids ─────────────────────────────────────────────────────────────────────

let _seq = 0
export const newId = (p = 'id') => `${p}_${Date.now().toString(36)}_${(_seq++).toString(36)}`

// ── Seed (spec §13) ─────────────────────────────────────────────────────────
//
// TODO(review): the prototype's per-project and per-investor figures are
// illustrative and cannot BOTH be satisfied exactly by one allocation.
// What reconciles here:
//   • committed — exact on both margins (project totals AND investor totals)
//   • funded    — exact per project, and exact at portfolio level ($124M)
//   • funded    — per investor lands within ~$3M of the prototype's figures
// Σ required $312M · Σ raised $198M · Σ deployed $124M all match the spec.
// Lewis should confirm the real per-investor split before this is relied on.

const P = (
  code: string, name: string, address: string, assetType: AssetType, status: ProjectStatus,
  phase: string, gdv: number, capitalRequired: number, projIrr: number, equityMultiple: number,
  feasibilityRef?: string,
): CapProject => ({
  id: `prj_${code}`, code, name, address, assetType, status, phase,
  gdv: gdv * 1e6, tdc: 0, equityRequired: capitalRequired * 1e6, debtRequired: 0,
  capitalRequired: capitalRequired * 1e6, projIrr, equityMultiple, feasibilityRef,
})

const SEED_PROJECTS: CapProject[] = [
  P('01', 'St Village Preston', '20–30 Newman St, Preston VIC', 'BTR', 'live', 'Construction', 78, 96, 19.4, 1.9, 'seed-preston-001'),
  P('02', '5IVE Hotels Caloundra', '31 Esplanade, Caloundra QLD', 'HOTEL', 'live', 'Permits & Design', 64, 58, 22.1, 2.1),
  P('03', 'Cunningham Place', '35 Corio St, Geelong VIC', 'MIXED', 'live', 'Land Settlement', 52, 47, 18.2, 1.8),
  P('04', 'Waurnvale Drive', 'Belmont, Geelong VIC', 'BTS', 'live', 'Feasibility → DA', 41, 38, 20.5, 1.7),
  P('05', '225 Heaths Road Werribee', 'Werribee VIC', 'BTS', 'hold', 'On Hold', 34, 34, 16.0, 1.6),
  P('06', '575 Derrimut Road Tarneit', 'Tarneit VIC', 'MIXED', 'live', 'Feasibility', 31, 39, 17.8, 1.75),
]

// dep / raised / req per §13. Σ req 312 · Σ raised 198 · Σ dep 124 — the same
// totals the positions produce, so the stage panel and the KPI strip agree.
const SEED_STAGES: CapStage[] = [
  { id: 'stg_1', stage: 'Soft Costs & Permits', deployed: 19e6, raised: 24e6, required: 28e6, sort: 0 },
  { id: 'stg_2', stage: 'Land Acquisition', deployed: 58e6, raised: 71e6, required: 86e6, sort: 1 },
  { id: 'stg_3', stage: 'Construction Equity', deployed: 39e6, raised: 86e6, required: 164e6, sort: 2 },
  { id: 'stg_4', stage: 'Working Capital', deployed: 8e6, raised: 17e6, required: 34e6, sort: 3 },
]

const INV = (
  id: string, companyName: string, entityType: string, relationshipOwner: string,
  status: InvestorStatus, contactName: string, email: string, prefRate: number,
): CapInvestor & { _pref: number } => ({
  id, companyName, entityType, relationshipOwner, status,
  contactName, email, taxCountry: 'Australia', investorClass: 'Wholesale/Sophisticated (s708)',
  kycStatus: status === 'active' ? 'verified' : 'in_progress',
  createdAt: new Date().toISOString(), _pref: prefRate,
})

const SEED_INVESTOR_DEFS = [
  INV('inv_mer', 'Meridian Family Office', 'Family Office', 'Lewis Jin', 'active', 'A. Meridian', 'capital@meridianfo.example', 8),
  INV('inv_aur', 'Aureus Private Wealth', 'Syndicate', 'Lewis Jin', 'active', 'J. Aureus', 'ir@aureuspw.example', 8),
  INV('inv_blk', 'Blackwattle Super', 'SMSF', 'D. Ferris', 'active', 'M. Blackwattle', 'invest@blackwattle.example', 9),
  INV('inv_tan', 'Tanaka Capital Partners', 'Institutional', 'Lewis Jin', 'active', 'H. Tanaka', 'deals@tanakacap.example', 8),
  INV('inv_har', 'Harbour Point Ventures', 'Syndicate', 'D. Ferris', 'active', 'R. Harbour', 'ir@harbourpoint.example', 8),
  INV('inv_red', 'Redgum Holdings', 'Family Office', 'Lewis Jin', 'active', 'S. Redgum', 'office@redgum.example', 8),
  INV('inv_oka', 'K. Okafor', 'Individual', 'D. Ferris', 'onboarding', 'K. Okafor', 'k.okafor@example.com', 8),
  INV('inv_ste', 'Sterling Nominees', 'Syndicate', 'Lewis Jin', 'committed', 'P. Sterling', 'admin@sterlingnom.example', 8),
]

/** [investorId, projectCode, committed$M, funded$M] — see the TODO above. */
const SEED_ALLOCATIONS: [string, string, number, number][] = [
  ['inv_mer', '01', 30, 24], ['inv_mer', '03', 12, 8],
  ['inv_aur', '01', 26, 18], ['inv_aur', '04', 8, 5],
  ['inv_blk', '02', 20, 13], ['inv_blk', '06', 10, 5],
  ['inv_tan', '03', 14, 11], ['inv_tan', '06', 11, 2], ['inv_tan', '05', 1, 1],
  ['inv_har', '01', 15, 10], ['inv_har', '04', 7, 5],
  ['inv_red', '02', 14, 6], ['inv_red', '05', 4, 3],
  ['inv_oka', '04', 9, 6], ['inv_oka', '05', 5, 2],
  ['inv_ste', '05', 7, 2], ['inv_ste', '03', 5, 3],
]

export function seedCapitalState(): CapitalState {
  const investors: CapInvestor[] = SEED_INVESTOR_DEFS.map(({ _pref, ...rest }) => rest)

  const positions: CapPosition[] = SEED_ALLOCATIONS.map(([investorId, code, com, fun], i) => {
    const pref = SEED_INVESTOR_DEFS.find(d => d.id === investorId)?._pref ?? 8
    return {
      id: `pos_${i}`,
      investorId,
      projectId: `prj_${code}`,
      instrumentType: 'lp_equity',
      committedAmount: com * 1e6,
      fundedAmount: fun * 1e6,
      prefRate: pref,
      prefCompounding: 'compound',
      startDate: '2026-01-15',
      status: fun >= com ? 'funded' : fun > 0 ? 'partially_funded' : 'committed',
    }
  })

  const calls: CapCall[] = [
    { id: 'call_1', projectId: 'prj_01', stage: 'Construction Equity', callDate: '2026-07-29', dueDate: '2026-08-12', totalAmount: 14e6, allocationMethod: 'pro_rata', status: 'issued', purpose: 'Level 7–9 structure' },
    { id: 'call_2', projectId: 'prj_04', stage: 'Working Capital', callDate: '2026-07-11', dueDate: '2026-07-25', totalAmount: 6e6, allocationMethod: 'pro_rata', status: 'issued', purpose: 'DA + consultants' },
    { id: 'call_3', projectId: 'prj_02', stage: 'Construction Equity', callDate: '2026-08-20', dueDate: '2026-09-03', totalAmount: 9e6, allocationMethod: 'pro_rata', status: 'draft' },
    { id: 'call_4', projectId: 'prj_06', stage: 'Land Acquisition', callDate: '2026-07-03', dueDate: '2026-07-17', totalAmount: 3e6, allocationMethod: 'pro_rata', status: 'funded' },
    { id: 'call_5', projectId: 'prj_03', stage: 'Land Acquisition', callDate: '2026-09-30', dueDate: '2026-10-14', totalAmount: 7e6, allocationMethod: 'pro_rata', status: 'draft' },
  ]

  const pipeline: CapPipelineItem[] = [
    { id: 'pip_1', prospectName: 'Whitmore Trust', targetAmount: 15e6, projectId: 'prj_01', stage: 'prospect', probability: 20, owner: 'Lewis Jin', nextAction: 'Intro deck sent' },
    { id: 'pip_2', prospectName: 'Cascade Wealth', targetAmount: 10e6, projectId: 'prj_06', stage: 'prospect', probability: 15, owner: 'D. Ferris', nextAction: 'Warm intro via Meridian' },
    { id: 'pip_3', prospectName: 'Nordia Family Office', targetAmount: 20e6, projectId: 'prj_02', stage: 'engaged', probability: 40, owner: 'Lewis Jin', nextAction: 'Data room access granted' },
    { id: 'pip_4', prospectName: 'Peninsula Group', targetAmount: 12e6, projectId: 'prj_03', stage: 'engaged', probability: 35, owner: 'D. Ferris', nextAction: 'Feasibility Q&A' },
    { id: 'pip_5', prospectName: 'Aureus (top-up)', investorId: 'inv_aur', targetAmount: 8e6, projectId: 'prj_04', stage: 'soft_commit', probability: 65, owner: 'Lewis Jin', nextAction: 'Verbal — awaiting IC' },
    { id: 'pip_6', prospectName: 'Beacon Super', targetAmount: 18e6, stage: 'soft_commit', probability: 60, owner: 'D. Ferris', nextAction: 'Term sheet issued' },
    { id: 'pip_7', prospectName: 'Sterling Nominees', investorId: 'inv_ste', targetAmount: 12e6, projectId: 'prj_06', stage: 'hard_commit', probability: 90, owner: 'Lewis Jin', nextAction: 'Sub-docs signed' },
    { id: 'pip_8', prospectName: 'Redgum (reinvest)', investorId: 'inv_red', targetAmount: 7e6, projectId: 'prj_05', stage: 'hard_commit', probability: 85, owner: 'Lewis Jin', nextAction: 'Awaiting first call' },
    { id: 'pip_9', prospectName: 'Blackwattle Super', investorId: 'inv_blk', targetAmount: 9e6, projectId: 'prj_02', stage: 'funded', probability: 100, owner: 'D. Ferris', nextAction: 'Settled' },
    { id: 'pip_10', prospectName: 'Tanaka Capital', investorId: 'inv_tan', targetAmount: 6e6, projectId: 'prj_03', stage: 'funded', probability: 100, owner: 'Lewis Jin', nextAction: 'Settled' },
    { id: 'pip_11', prospectName: 'Harbour Point', investorId: 'inv_har', targetAmount: 5e6, projectId: 'prj_01', stage: 'funded', probability: 100, owner: 'D. Ferris', nextAction: 'Settled' },
  ]

  // Allocate each seeded call across that project's investors, pro-rata by
  // uncalled commitment — the same rule the New Call form uses. Without this the
  // Calls tab seeds with calls that have nobody on them and nothing to fund.
  const callAllocations: CapCallAllocation[] = []
  for (const c of calls) {
    const eligible = positions
      .filter(p => p.projectId === c.projectId)
      .map(p => ({ p, uncalled: Math.max(0, p.committedAmount - p.fundedAmount) }))
      .filter(x => x.uncalled > 0)
    if (eligible.length === 0) continue
    const split = allocateProRata(c.totalAmount, eligible.map(e => ({ id: e.p.id, weight: e.uncalled })))
    eligible.forEach((e, i) => {
      const amount = split[e.p.id] ?? 0
      if (amount <= 0) return
      // A funded call is fully funded; an issued one is part-paid so Lewis has
      // something live to work with. Drafts sit outstanding.
      const fundedAmount = c.status === 'funded' ? amount : c.status === 'issued' && i === 0 ? amount : 0
      callAllocations.push({
        id: `cal_${c.id}_${i}`, callId: c.id, positionId: e.p.id, investorId: e.p.investorId,
        amount, fundedAmount,
        fundedDate: fundedAmount > 0 ? c.callDate : undefined,
        status: fundedAmount >= amount ? 'funded' : fundedAmount > 0 ? 'part' : 'outstanding',
      })
    })
  }

  const waterfalls: CapWaterfall[] = [{
    id: 'wf_default', name: 'Standard 8% pref · 80/20 to 15% IRR',
    prefRate: 8, prefCompounding: 'compound', catchUp: true, catchUpTarget: 20,
    tiers: [{ hurdleIrr: 15, lpSplit: 80, gpSplit: 20 }, { hurdleIrr: 100, lpSplit: 70, gpSplit: 30 }],
  }]

  const objectives: CapObjective[] = [
    { id: 'obj_1', label: '$300M portfolio GDV', target: 300, current: 246, unit: '$M', owner: 'Directors', sort: 0 },
    { id: 'obj_2', label: '120 HAAVN homes installed', target: 120, current: 70, unit: 'homes', owner: 'HAAVN', sort: 1 },
    { id: 'obj_3', label: 'Blended margin > 22%', target: 22, current: 20, unit: '%', owner: 'Directors', sort: 2 },
  ]

  return {
    projects: SEED_PROJECTS, stages: SEED_STAGES, investors, contacts: [], positions,
    calls, callAllocations, distributions: [], distAllocations: [],
    pipeline, activities: [], waterfalls, objectives,
  }
}

// ── Store ───────────────────────────────────────────────────────────────────

const EMPTY: CapitalState = {
  projects: [], stages: [], investors: [], contacts: [], positions: [],
  calls: [], callAllocations: [], distributions: [], distAllocations: [],
  pipeline: [], activities: [], waterfalls: [], objectives: [],
}

/**
 * Read the capital state, MERGING the shape over what is stored.
 *
 * The merge is not cosmetic. loadKV (and db/index.ts's load) return a stored
 * record as-is, so any array added to this interface after a save would come
 * back `undefined` and every `.map`/`.reduce` on it would throw — the same class
 * of bug that made the Hotel tab render $NaN. Every key is defaulted here.
 */
export function loadCapital(): CapitalState {
  const stored = loadKV<Partial<CapitalState> | null>(CAPITAL_COMMAND_KEY, null)
  if (!stored || !stored.projects || stored.projects.length === 0) return seedCapitalState()
  return { ...EMPTY, ...stored } as CapitalState
}

export function saveCapital(state: CapitalState): void {
  saveKV(CAPITAL_COMMAND_KEY, state)
}

// ── Derived rollups (spec §7: "derived, not stored") ────────────────────────

/** Σ committed positions for a project — the raise actually secured. */
export function projectRaised(s: CapitalState, projectId: string): number {
  return s.positions.filter(p => p.projectId === projectId).reduce((a, p) => a + p.committedAmount, 0)
}

/** Σ funded for a project — capital actually working. */
export function projectDeployed(s: CapitalState, projectId: string): number {
  return s.positions.filter(p => p.projectId === projectId).reduce((a, p) => a + p.fundedAmount, 0)
}

export function investorCommitted(s: CapitalState, investorId: string): number {
  return s.positions.filter(p => p.investorId === investorId).reduce((a, p) => a + p.committedAmount, 0)
}

export function investorFunded(s: CapitalState, investorId: string): number {
  return s.positions.filter(p => p.investorId === investorId).reduce((a, p) => a + p.fundedAmount, 0)
}

export function investorDistributed(s: CapitalState, investorId: string): number {
  return s.distAllocations.filter(d => d.investorId === investorId).reduce((a, d) => a + d.amount, 0)
}

export interface PortfolioTotals {
  required: number; raised: number; deployed: number; remaining: number; pctRaised: number; pctDeployed: number
}

export function portfolioTotals(s: CapitalState): PortfolioTotals {
  const required = s.projects.reduce((a, p) => a + p.capitalRequired, 0)
  const raised = s.positions.reduce((a, p) => a + p.committedAmount, 0)
  const deployed = s.positions.reduce((a, p) => a + p.fundedAmount, 0)
  return {
    required, raised, deployed,
    remaining: Math.max(0, required - raised),
    pctRaised: required > 0 ? raised / required : 0,
    pctDeployed: required > 0 ? deployed / required : 0,
  }
}

/**
 * Stage rollup. Uses the stage's own raised/deployed where set (they cannot be
 * derived — positions link to projects, not stages). Falls back to the stage's
 * share of the portfolio only when a stage has no figures at all, so a
 * hand-added stage still draws a sensible bar.
 * TODO(review): once Lewis tags positions by stage, derive this like projects.
 */
export function stageRollup(s: CapitalState) {
  const t = portfolioTotals(s)
  const totalReq = s.stages.reduce((a, x) => a + x.required, 0) || 1
  return [...s.stages].sort((a, b) => a.sort - b.sort).map(st => {
    const share = st.required / totalReq
    return {
      ...st,
      raised: st.raised ?? t.raised * share,
      deployed: st.deployed ?? t.deployed * share,
    }
  })
}

export function callFunded(s: CapitalState, callId: string): number {
  return s.callAllocations.filter(a => a.callId === callId).reduce((x, a) => x + a.fundedAmount, 0)
}

export function callInvestorCount(s: CapitalState, callId: string): number {
  return new Set(s.callAllocations.filter(a => a.callId === callId).map(a => a.investorId)).size
}

/** A call is overdue when its due date has passed and it isn't fully funded. */
export function isCallOverdue(s: CapitalState, c: CapCall): boolean {
  if (c.status === 'draft' || c.status === 'funded') return false
  return new Date(c.dueDate) < new Date() && callFunded(s, c.id) + 1 < c.totalAmount
}

// ── Formatting ──────────────────────────────────────────────────────────────

export const fmtM = (n: number, dp = 1) => {
  const a = Math.abs(n)
  if (a >= 1e6) return `$${(n / 1e6).toFixed(dp)}M`
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`
  return `$${Math.round(n)}`
}
export const fmtPct = (n: number, dp = 0) => `${(n * 100).toFixed(dp)}%`
export const fmtDate = (iso?: string) =>
  iso ? new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
