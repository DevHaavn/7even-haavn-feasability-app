import * as db from './index'
import { captureSnapshot } from './snapshots'
import { WERRIBEE_FIXTURE, GEELONG_FIXTURE } from '../engine/__fixtures__/realProjects'
import { defaultCashflowState } from '../engine/cashflow'
import { HAAVN_CONSTRUCTION, HAAVN_CONSULTANTS, HAAVN_STATUTORY, HAAVN_HEADWORKS, HAAVN_MANAGEMENT, HAAVN_MARKETING } from './haavnCostStackData'

export function seedProjectsIfEmpty() {
  const existing = db.getProjects()
  const ids = new Set(existing.map(p => p.id))

  // Ensure Werribee + Geelong exist (idempotent, keyed by id).
  // Previously these only seeded on a fully-empty browser; after cloud sync
  // overwrote localStorage with the 2 cloud projects they vanished. Re-create
  // them if missing so they get restored + pushed back to the cloud.
  if (!ids.has('seed-werribee-001')) {
    seedWerribee()
  }
  if (!ids.has('seed-geelong-001')) {
    seedGeelong()
  }
  // 35 Corio Street, Geelong — Cunningham Place (Fraser & Partners yield analysis)
  if (!ids.has('geelong-35-corio')) {
    seedCorio()
  } else if (!localStorage.getItem('corio-patch-v1')) {
    // One-time patch for already-seeded copies: Fraser & Partners architect +
    // $25M in-kind church land (no interest).
    const pid = 'geelong-35-corio'
    db.saveLandTerms(corioLand(pid))
    db.saveSiteDesign({ ...db.getSiteDesign(pid), notes: CORIO_NOTES })
    localStorage.setItem('corio-patch-v1', 'true')
  }
  // One-time: add Scenario A (studio-led mix) to already-seeded copies
  if (ids.has('geelong-35-corio') && !localStorage.getItem('corio-scenario-a-v2')) {
    seedCorioScenarioA('geelong-35-corio')
    localStorage.setItem('corio-scenario-a-v2', 'true')
  }

  // Always ensure named featured projects exist (idempotent)
  if (!ids.has('seed-preston-001')) {
    seedPreston()
  } else {
    // Patch address if it was seeded with the old value
    const p = existing.find(x => x.id === 'seed-preston-001')
    if (p && p.address !== '20-30 Newman Street, Preston VIC 3072') {
      db.saveProject({ ...p, address: '20-30 Newman Street, Preston VIC 3072', updatedAt: new Date().toISOString() })
    }
    // One-time repair: an earlier build corrupted Preston's unit mix (NSA/unit
    // per unit was overwritten with the counts, giving a huge NSA discrepancy).
    // Restore the correct IVO v7.60 figures once — 400 units, 22,300 sqm NSA.
    if (!localStorage.getItem('preston-mix-repair-v1')) {
      db.saveUnitTypes('seed-preston-mix-001', [
        { id: 'seed-p-u1', scenarioId: 'seed-preston-mix-001', name: 'Studio', nsaPerUnit: 38, targetPct: 0.25, solvedCount: 100, weeklyRentConservative: 582, weeklyRentAggressive: 612, salePriceConservative: 390_000, salePriceMid: 420_000, salePriceAggressive: 460_000, opexPerUnitPerYear: 9_500 },
        { id: 'seed-p-u2', scenarioId: 'seed-preston-mix-001', name: '1 Bedroom', nsaPerUnit: 52, targetPct: 0.50, solvedCount: 200, weeklyRentConservative: 712, weeklyRentAggressive: 748, salePriceConservative: 530_000, salePriceMid: 580_000, salePriceAggressive: 640_000, opexPerUnitPerYear: 9_500 },
        { id: 'seed-p-u3', scenarioId: 'seed-preston-mix-001', name: '2 Bedroom', nsaPerUnit: 75, targetPct: 0.19, solvedCount: 76, weeklyRentConservative: 884, weeklyRentAggressive: 928, salePriceConservative: 760_000, salePriceMid: 820_000, salePriceAggressive: 890_000, opexPerUnitPerYear: 9_500 },
        { id: 'seed-p-u4', scenarioId: 'seed-preston-mix-001', name: '3 Bedroom', nsaPerUnit: 100, targetPct: 0.06, solvedCount: 24, weeklyRentConservative: 1_361, weeklyRentAggressive: 1_429, salePriceConservative: 1_100_000, salePriceMid: 1_180_000, salePriceAggressive: 1_280_000, opexPerUnitPerYear: 9_500 },
      ])
      localStorage.setItem('preston-mix-repair-v1', 'true')
    }
  }

  if (!ids.has('seed-caloundra-001')) {
    // Create a clean blank project — no pre-filled data
    db.saveProject({
      id: 'seed-caloundra-001',
      name: '5IVE Hotels Caloundra',
      address: '31 Esplanade Bulcock Beach, Caloundra QLD 4551',
      suburb: 'Caloundra',
      state: 'QLD',
      zone: '',
      responsibleAuthority: '',
      status: 'active',
      type: 'hotel',
      brand: '7even',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'Daniel Sette',
    })
  } else {
    // One-time reset: wipe all previously seeded data so user starts fresh
    const RESET_FLAG = 'seed-caloundra-reset-v2'
    if (!localStorage.getItem(RESET_FLAG)) {
      db.resetProjectData('seed-caloundra-001')
      const cal = existing.find(x => x.id === 'seed-caloundra-001')
      if (cal) db.saveProject({ ...cal, type: 'hotel', brand: '7even', updatedAt: new Date().toISOString() })
      localStorage.setItem(RESET_FLAG, 'true')
    }
  }

  // One-time: seed the original Caloundra figures as a named snapshot so they can be restored
  const SNAP_FLAG = 'seed-caloundra-snapshot-v1'
  if (!localStorage.getItem(SNAP_FLAG)) {
    seedCaloundraHistoricalSnapshot()
    localStorage.setItem(SNAP_FLAG, 'true')
  }

  // Patch existing seed projects with type + status if missing
  const werribee = existing.find(x => x.id === 'seed-werribee-001')
  if (werribee && (!werribee.type || werribee.status !== 'on-hold')) {
    db.saveProject({ ...werribee, type: 'bts', status: 'on-hold' })
  }
  const geelong = existing.find(x => x.id === 'seed-geelong-001')
  if (geelong && !geelong.type) db.saveProject({ ...geelong, type: 'bts' })
  const preston = existing.find(x => x.id === 'seed-preston-001')
  if (preston && !preston.type) db.saveProject({ ...preston, type: 'btr' })

  // Preston is a SINGLE project — "St Village Preston" — shown in both the 7EVEN
  // and HAAVN boards (brand 'both'). The detailed HAAVN cost stack is grafted onto
  // seed-preston-001 by consolidatePreston() (called from App after the label
  // migration, so it isn't clobbered by the clean-slate reset).

  // Patch: ensure all seeded projects have brand: '7even' or 'haavn'
  const allNow = db.getProjects()
  allNow.forEach(p => {
    if (!p.brand) db.saveProject({ ...p, brand: p.id === 'haavn-preston-001' ? 'haavn' : '7even' })
  })

  // Patch: seed Preston timeline from project programme (260317-7.Preston Programme.xlsx)
  if (db.getTimelineTasks('seed-preston-001').length === 0) {
    seedPrestonTimeline()
  }

  // NOTE: Preston detailed cost stack is no longer seeded here. The CFO's 2026
  // master schedule (COST_STACK_LABELS + migrateCostStackLabels) now owns every
  // project's cost line items. The old "reseed when fees are zero" patch would
  // clobber that clean slate on every load, so it has been removed.

  // Patch: rename assignee M2 → HM across all Preston timeline tasks
  const prestonTasks = db.getTimelineTasks('seed-preston-001')
  const hasM2 = prestonTasks.some(t => t.assignee === 'M2')
  if (hasM2) {
    db.saveTimelineTasks('seed-preston-001', prestonTasks.map(t => t.assignee === 'M2' ? { ...t, assignee: 'HM' } : t))
  }
}

// ── Preston consolidation ─────────────────────────────────────────────────────
// Historically there were TWO Preston projects: seed-preston-001 (7EVEN, empty
// cost stack) and haavn-preston-001 (HAAVN, real cost stack). Business rule: there
// is ONE "St Village Preston" that lives in BOTH boards with the real numbers.
//
// This grafts the real HAAVN cost stack (from the bundled source arrays, so it is
// independent of cloud/localStorage timing) onto the surviving seed-preston-001,
// marks it brand 'both', and deletes the haavn-preston-001 duplicate. All writes
// go through the db layer, which pushes to the cloud, so the change persists.
// Must run AFTER migrateCostStackLabels() (the clean-slate reset) or it is wiped.
// Idempotent, content-based (no run-once flag). Runs every load AFTER the cloud
// pull + label reset, so the surviving Preston always shows the real numbers in the
// UI even when cloud writes are rejected (RLS) and the pull keeps restoring the old
// empty/duplicate state. Cheap: only writes when something is actually out of shape.
export function consolidatePreston() {
  const SURV = 'seed-preston-001'
  const survivor = db.getProjects().find(p => p.id === SURV)
  if (!survivor) return // nothing to graft onto yet

  // 1) Graft the clean HAAVN base when the stack is empty (fresh browser) OR on a
  //    one-time heal that restores the base after earlier stray test edits. Once the
  //    heal has run, normal edits to Preston persist (it won't fight the user).
  const dc = db.getDetailedCostStack(SURV)
  const consTotal = (dc.consultants || []).reduce((s, i) => s + (i.amount || 0), 0)
  const HEAL = 'preston-base-heal-v2'
  if (consTotal === 0 || !localStorage.getItem(HEAL)) {
    db.saveDetailedCostStack({
      projectId: SURV,
      hardCosts: cloneStack(HAAVN_CONSTRUCTION, SURV),
      consultants: cloneStack(HAAVN_CONSULTANTS, SURV),
      statutory: cloneStack(HAAVN_STATUTORY, SURV),
      headworks: cloneStack(HAAVN_HEADWORKS, SURV),
      management: cloneStack(HAAVN_MANAGEMENT, SURV),
      marketing: cloneStack(HAAVN_MARKETING, SURV),
    })
    localStorage.setItem(HEAL, '1')
  }

  // 2) One "St Village Preston", 7EVEN-owned but shown live in BOTH boards.
  if (survivor.name !== 'St Village Preston' || survivor.brand !== 'both' || survivor.type !== 'btr') {
    db.saveProject({ ...survivor, name: 'St Village Preston', brand: 'both', type: 'btr' })
  }

  // 3) Remove the duplicate HAAVN project every load (cloud delete may fail under
  //    RLS, but the local delete keeps the boards showing a single Preston).
  if (db.getProjects().some(p => p.id === 'haavn-preston-001')) {
    db.deleteProject('haavn-preston-001')
  }
}

// Base feasibility starting point: every project begins from the same itemised
// cost stack (the HAAVN base) so all six sub-tabs are populated and their phases
// flow to the Timeline. Only fills projects whose cost stack is still empty, so it
// never clobbers a project the team has already customised. Idempotent; runs each
// load after the cloud pull. Items are shallow-cloned so projects don't share objects.
export function seedBaseCostStackForAll() {
  for (const p of db.getProjects()) {
    const dc = db.getDetailedCostStack(p.id)
    const total = [...dc.hardCosts, ...dc.consultants, ...dc.statutory, ...dc.headworks, ...dc.management, ...dc.marketing]
      .reduce((s, i) => s + (i.amount || 0), 0)
    if (total > 0) continue // already has costs — leave it alone
    db.saveDetailedCostStack({
      projectId: p.id,
      hardCosts: cloneStack(HAAVN_CONSTRUCTION, p.id),
      consultants: cloneStack(HAAVN_CONSULTANTS, p.id),
      statutory: cloneStack(HAAVN_STATUTORY, p.id),
      headworks: cloneStack(HAAVN_HEADWORKS, p.id),
      management: cloneStack(HAAVN_MANAGEMENT, p.id),
      marketing: cloneStack(HAAVN_MARKETING, p.id),
    })
  }
}

// Deep-clone base cost-stack rows and give each project its own item IDs, so no two
// projects (or the bundled template) ever share the same object or line-item id —
// edits on one project can never touch another.
function cloneStack(arr: import('./schema').CostLineItem[], projectId: string): import('./schema').CostLineItem[] {
  return arr.map(it => ({ ...JSON.parse(JSON.stringify(it)), id: `${projectId}:${it.id}` }))
}

// Roll the CFO's full consultant catalogue (Cost_Stack_Grouped.xlsx — categories +
// item descriptions, amounts blank) onto every project's Consultants section.
// Content-based: re-applies while the OLD 5-group structure is still present (so it
// survives cloud pulls that restore stale data), then stops — leaving the new
// catalogue and any user edits within it alone.
const OLD_CONSULTANT_CATS = new Set(['Architecture', 'Civil & structural', 'Acoustic', 'Environmental', 'Other'])
export function migrateConsultantCatalogue() {
  for (const p of db.getProjects()) {
    const dc = db.getDetailedCostStack(p.id)
    const cons = dc.consultants || []
    const isLegacy = cons.length === 0 || cons.some(i => OLD_CONSULTANT_CATS.has((i.notes || '').trim()))
    if (isLegacy) {
      db.saveDetailedCostStack({ ...dc, projectId: p.id, consultants: cloneStack(HAAVN_CONSULTANTS, p.id) })
    }
  }
}

function seedWerribee() {
  const f = WERRIBEE_FIXTURE
  const pid = 'seed-werribee-001'

  // Project
  db.saveProject({
    id: pid,
    name: '225 Heaths Road Werribee',
    address: '225 Heaths Road, Werribee VIC 3030',
    suburb: 'Werribee',
    state: 'VIC',
    zone: 'Residential Growth Zone',
    responsibleAuthority: 'Wyndham City Council',
    status: 'on-hold',
    type: 'bts',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  })

  // Site design
  db.saveSiteDesign({
    projectId: pid,
    resiNSA: f.site.resiNSA,
    resiGFA: f.site.resiGFA,
    resiGBA: f.site.resiGBA,
    balcony: f.site.balcony,
    basement: f.site.basementTotal,
    carSpaces: f.site.carSpaces,
    childcareGFA: f.site.childcareGFA,
    churchGFA: f.site.churchGFA,
    churchNSA: f.site.churchNSA,
    otherGFA: 0,
    notes: 'In-kind church convention centre delivery. HAAVN prefab hybrid construction methodology.',
  })

  // Land terms — in-kind church delivery
  db.saveLandTerms({
    projectId: pid,
    landCost: 0,
    isInKind: true,
    inKindLabel: 'Church convention centre',
    inKindGFA: f.costStack.inKindLineItem.gfa,
    inKindRatePerSqm: f.costStack.inKindLineItem.ratePerSqm,
    inKindNote: 'Vendor requires new church convention centre delivered as part of site acquisition.',
    stampDuty: 0,
    legalFees: 0,
    otherAcquisitionCosts: 0,
  })

  // Cost stack
  db.saveCostStack({
    projectId: pid,
    buildRatePerSqm: f.costStack.buildRatePerSqm,
    contingencyPct: f.costStack.contingencyPct,
    prelimsPct: f.costStack.prelimsPct,
    professionalFeesPct: f.costStack.professionalFeesPct,
    statutoryFixed: f.costStack.statutoryFixed,
    financePct: f.costStack.financePct,
    projectManagementFixed: f.costStack.projectManagementFixed,
    marketingFixed: f.costStack.marketingFixed,
    amenityFitoutFixed: f.costStack.amenityFitoutFixed,
  })

  // Mix scenario — primary
  const scenarioId = 'seed-werribee-mix-001'
  db.saveMixScenario({ id: scenarioId, projectId: pid, name: 'Mix A — 12/58/30', createdAt: '2025-01-01T00:00:00.000Z' })

  // Unit types
  db.saveUnitTypes(scenarioId, [
    {
      id: 'seed-w-u1', scenarioId, name: 'Studio', nsaPerUnit: 36, targetPct: 0.12, solvedCount: 35,
      weeklyRentConservative: f.income.rentsConservativeWeekly.studio,
      weeklyRentAggressive: f.income.rentsAggressiveWeekly.studio,
      salePriceConservative: f.btsSell.pricesConservative.studio,
      salePriceMid: Math.round((f.btsSell.pricesConservative.studio + f.btsSell.pricesAggressive.studio) / 2 / 5000) * 5000,
      salePriceAggressive: f.btsSell.pricesAggressive.studio,
      opexPerUnitPerYear: 2000,
    },
    {
      id: 'seed-w-u2', scenarioId, name: '1 Bedroom', nsaPerUnit: 64, targetPct: 0.58, solvedCount: 168,
      weeklyRentConservative: f.income.rentsConservativeWeekly.oneBed,
      weeklyRentAggressive: f.income.rentsAggressiveWeekly.oneBed,
      salePriceConservative: f.btsSell.pricesConservative.oneBed,
      salePriceMid: Math.round((f.btsSell.pricesConservative.oneBed + f.btsSell.pricesAggressive.oneBed) / 2 / 5000) * 5000,
      salePriceAggressive: f.btsSell.pricesAggressive.oneBed,
      opexPerUnitPerYear: 2000,
    },
    {
      id: 'seed-w-u3', scenarioId, name: '2 Bedroom', nsaPerUnit: 86, targetPct: 0.30, solvedCount: 86,
      weeklyRentConservative: f.income.rentsConservativeWeekly.twoBed,
      weeklyRentAggressive: f.income.rentsAggressiveWeekly.twoBed,
      salePriceConservative: f.btsSell.pricesConservative.twoBed,
      salePriceMid: Math.round((f.btsSell.pricesConservative.twoBed + f.btsSell.pricesAggressive.twoBed) / 2 / 5000) * 5000,
      salePriceAggressive: f.btsSell.pricesAggressive.twoBed,
      opexPerUnitPerYear: 2000,
    },
  ])

  // BTR assumptions
  db.saveBTRAssumptions({
    scenarioId,
    vacancyPct: f.income.vacancyPct,
    managementFeePct: f.income.managementFeePct,
    buildingAdminFixed: 0,
    childcareAnnualNet: 0,
    commercialAnnualNet: 0,
    carParkIncomeAnnual: 0,
    capRateConservative: f.valuation.capRateConservative,
    capRateAggressive: f.valuation.capRateAggressive,
    devMarginPct: f.valuation.devMarginPct,
  })

  // BTS assumptions
  db.saveBTSAssumptions({
    scenarioId,
    sellingCostsPct: f.btsSell.sellingCostsPct,
    childcareValuePerSqm: f.btsSell.childcareCommercialValuePerSqm,
    devMarginPct: f.valuation.devMarginPct,
  })

  // Hotel defaults
  db.saveHotelAssumptions({
    scenarioId,
    operatorType: 'management',
    keys: 0, adr: 250, occupancyPct: 0.72,
    otherRevenuePerKey: 15,
    gopMarginPct: 0.35,
    managementFeePct: 0.04,
    ffeReservePct: 0.04,
    hotelCapRate: 0.065,
    devMarginPct: 0.18,
  })
}

function seedGeelong() {
  const f = GEELONG_FIXTURE
  const pid = 'seed-geelong-001'

  db.saveProject({
    id: pid,
    name: 'Waurnvale Drive Geelong',
    address: 'Waurnvale Drive, Belmont VIC 3216',
    suburb: 'Belmont',
    state: 'VIC',
    zone: 'Residential Growth Zone',
    responsibleAuthority: 'City of Greater Geelong',
    status: 'active',
    type: 'bts',
    createdAt: '2025-02-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  })

  db.saveSiteDesign({
    projectId: pid,
    resiNSA: f.site.resiNSA,
    resiGFA: f.site.resiGFA,
    resiGBA: f.site.resiGBA,
    balcony: f.site.balcony,
    basement: f.site.basementTotal,
    carSpaces: f.site.totalCarSpaces,
    childcareGFA: f.site.childcareGFA,
    churchGFA: f.site.churchGFA,
    churchNSA: f.site.churchSiteArea,
    otherGFA: 0,
    notes: 'In-kind community church delivery. 396-unit BTR scheme. HAAVN hybrid construction.',
  })

  db.saveLandTerms({
    projectId: pid,
    landCost: 0,
    isInKind: true,
    inKindLabel: 'Community church',
    inKindGFA: f.costStack.inKindLineItem.gfa,
    inKindRatePerSqm: f.costStack.inKindLineItem.ratePerSqm,
    inKindNote: 'Community church delivered as part of vendor agreement for site acquisition.',
    stampDuty: 0,
    legalFees: 0,
    otherAcquisitionCosts: 0,
  })

  db.saveCostStack({
    projectId: pid,
    buildRatePerSqm: f.costStack.buildRatePerSqm,
    contingencyPct: f.costStack.contingencyPct,
    prelimsPct: f.costStack.prelimsPct,
    professionalFeesPct: f.costStack.professionalFeesPct,
    statutoryFixed: f.costStack.statutoryFixed,
    financePct: f.costStack.financePct,
    projectManagementFixed: f.costStack.projectManagementFixed,
    marketingFixed: f.costStack.marketingFixed,
    amenityFitoutFixed: f.costStack.amenityFitoutFixed,
  })

  const scenarioId = 'seed-geelong-mix-001'
  db.saveMixScenario({ id: scenarioId, projectId: pid, name: 'Mix A — 25/30/35/10', createdAt: '2025-02-01T00:00:00.000Z' })

  db.saveUnitTypes(scenarioId, [
    {
      id: 'seed-g-u1', scenarioId, name: 'Studio', nsaPerUnit: 28, targetPct: 0.25, solvedCount: 99,
      weeklyRentConservative: f.income.rentsConservativeWeekly.studio,
      weeklyRentAggressive: f.income.rentsAggressiveWeekly.studio,
      salePriceConservative: f.btsSell.pricesConservative.studio,
      salePriceMid: f.btsSell.pricesMid.studio,
      salePriceAggressive: f.btsSell.pricesAggressive.studio,
      opexPerUnitPerYear: 2000,
    },
    {
      id: 'seed-g-u2', scenarioId, name: '1 Bedroom', nsaPerUnit: 64, targetPct: 0.30, solvedCount: 119,
      weeklyRentConservative: f.income.rentsConservativeWeekly.oneBed,
      weeklyRentAggressive: f.income.rentsAggressiveWeekly.oneBed,
      salePriceConservative: f.btsSell.pricesConservative.oneBed,
      salePriceMid: f.btsSell.pricesMid.oneBed,
      salePriceAggressive: f.btsSell.pricesAggressive.oneBed,
      opexPerUnitPerYear: 2000,
    },
    {
      id: 'seed-g-u3', scenarioId, name: '2 Bedroom', nsaPerUnit: 73, targetPct: 0.35, solvedCount: 138,
      weeklyRentConservative: f.income.rentsConservativeWeekly.twoBed,
      weeklyRentAggressive: f.income.rentsAggressiveWeekly.twoBed,
      salePriceConservative: f.btsSell.pricesConservative.twoBed,
      salePriceMid: f.btsSell.pricesMid.twoBed,
      salePriceAggressive: f.btsSell.pricesAggressive.twoBed,
      opexPerUnitPerYear: 2000,
    },
    {
      id: 'seed-g-u4', scenarioId, name: '3 Bedroom', nsaPerUnit: 96, targetPct: 0.10, solvedCount: 40,
      weeklyRentConservative: f.income.rentsConservativeWeekly.threeBed,
      weeklyRentAggressive: f.income.rentsAggressiveWeekly.threeBed,
      salePriceConservative: f.btsSell.pricesConservative.threeBed,
      salePriceMid: f.btsSell.pricesMid.threeBed,
      salePriceAggressive: f.btsSell.pricesAggressive.threeBed,
      opexPerUnitPerYear: 2000,
    },
  ])

  db.saveBTRAssumptions({
    scenarioId,
    vacancyPct: f.income.vacancyPct,
    managementFeePct: f.income.managementFeePct,
    buildingAdminFixed: 0,
    childcareAnnualNet: 0,
    commercialAnnualNet: 0,
    carParkIncomeAnnual: 0,
    capRateConservative: f.valuation.capRateConservative,
    capRateAggressive: f.valuation.capRateAggressive,
    devMarginPct: f.valuation.devMarginPct,
  })

  db.saveBTSAssumptions({
    scenarioId,
    sellingCostsPct: f.btsSell.sellingCostsPct,
    childcareValuePerSqm: f.btsSell.childcareCommercialValuePerSqm,
    devMarginPct: f.valuation.devMarginPct,
  })

  db.saveHotelAssumptions({
    scenarioId,
    operatorType: 'management',
    keys: 0, adr: 220, occupancyPct: 0.70,
    otherRevenuePerKey: 12,
    gopMarginPct: 0.33,
    managementFeePct: 0.04,
    ffeReservePct: 0.04,
    hotelCapRate: 0.068,
    devMarginPct: 0.18,
  })
}

// ── 5IVE HOTELS CALOUNDRA ─────────────────────────────────────────────────────
// Source: 7C Financials Caloundra Investment Summary
// 77 bespoke hotel rooms, Marriott Bonvoy managed, Bulcock Beach
function seedCaloundra() {
  const pid = 'seed-caloundra-001'

  db.saveProject({
    id: pid,
    name: '5IVE Hotels Caloundra',
    address: '31 Esplanade Bulcock Beach, Caloundra QLD 4551',
    suburb: 'Caloundra',
    state: 'QLD',
    zone: 'Tourist Accommodation Zone',
    responsibleAuthority: 'Sunshine Coast Council',
    status: 'active',
    mapPin: '5',
    type: 'hotel',
    createdAt: '2025-06-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  })

  // Fraser & Partners 24014 (28 Oct 2024): GFA 3,339 | GBA 3,698 | NSA 1,787 | 77 keys | 31 parks | 8 storeys | site 635 sqm
  // Levels 0: lobby 46m² + cafe + 7 street rooms (21m² gross each)
  // Levels 1-2: standard rooms | Levels 3-6: terrace suites with plunge pools
  // Rooftop: pool 180m² + bar/reception 96m² + fire pit
  db.saveSiteDesign({
    projectId: pid,
    resiNSA: 1_787,   // confirmed hotel room NSA from Fraser schedule
    resiGFA: 3_339,   // confirmed total GFA
    resiGBA: 3_698,   // confirmed total GBA
    balcony: 420,     // terrace suites L3-L6 plunge pool terraces + rooftop 276m²
    basementTotal: 500,  // 2 basement levels on 635 sqm site (valet B1: 15 spaces)
    carSpaces: 31,    // confirmed from Fraser schedule
    childcareGFA: 0,
    churchGFA: 0,
    churchNSA: 0,
    otherGFA: 436,    // lobby 46m² + cafe/BOH ~114m² + rooftop bar 96m² + pool 180m²
    notes: '77 bespoke 5-star hotel rooms across 8 storeys on 635 sqm beachfront site. Fraser & Partners design 24014. L0: lobby + cafe. L1-2: standard rooms. L3-6: terrace suites with plunge pools. Rooftop pool 180m² + bar 96m². Managed by Marriott Bonvoy. 7EVEN luxury hospitality brand.',
  })

  // Land: $14,800,000 purchase + $1,284,909 acquisition costs
  db.saveLandTerms({
    projectId: pid,
    landCost: 14_800_000,
    isInKind: false,
    inKindLabel: '',
    inKindGFA: 0,
    inKindRatePerSqm: 0,
    inKindNote: 'Beachfront esplanade site 635 sqm. Tourist Accommodation zone. Acquisition costs: stamp duty, legal & due diligence $1,284,909.',
  })

  // Construction on 3,698 sqm GBA @ $9,500/sqm = $35.1M (luxury Marriott-standard boutique hotel)
  // High rate reflects: rooftop pool, in-room plunge pools L3-6, premium beachfront finishes, 8-storey concrete structure on small footprint
  db.saveCostStack({
    projectId: pid,
    buildRatePerSqm: 9_500,
    contingencyPct: 0.05,
    prelimsPct: 0.08,
    professionalFeesPct: 0.07,
    statutoryFixed: 1_200_000,
    financePct: 0.09,
    projectManagementFixed: 1_800_000,
    marketingFixed: 850_000,
    amenityFitoutFixed: 3_200_000,  // rooftop pool, bar fitout, lobby, FF&E common areas
  })

  const scenarioId = 'seed-caloundra-mix-001'
  db.saveMixScenario({
    id: scenarioId,
    projectId: pid,
    name: 'Hotel — 77 Keys (Marriott Bonvoy)',
    createdAt: '2025-06-01T00:00:00.000Z',
  })

  // Fraser & Partners 24014 confirmed room schedule — 77 keys across 2 types
  // L0-L2: Standard Hotel Rooms 20m² NSA × 41 keys
  // L3-L6: Terrace Suites + Plunge Pool 27m² NSA × 36 keys
  // Total NSA: 820 + 972 = 1,792 ≈ 1,787 confirmed ✓
  db.saveUnitTypes(scenarioId, [
    {
      id: 'seed-cal-room-std-001',
      scenarioId,
      name: 'Standard Hotel Room',
      nsaPerUnit: 20,
      targetPct: 0.532,
      solvedCount: 41,
      weeklyRentConservative: 0,
      weeklyRentAggressive: 0,
      salePriceConservative: 0,
      salePriceMid: 0,
      salePriceAggressive: 0,
      opexPerUnitPerYear: 0,
    },
    {
      id: 'seed-cal-room-suite-001',
      scenarioId,
      name: 'Terrace Suite + Plunge Pool',
      nsaPerUnit: 27,
      targetPct: 0.468,
      solvedCount: 36,
      weeklyRentConservative: 0,
      weeklyRentAggressive: 0,
      salePriceConservative: 0,
      salePriceMid: 0,
      salePriceAggressive: 0,
      opexPerUnitPerYear: 0,
    },
  ])

  db.saveBTRAssumptions({
    scenarioId,
    vacancyPct: 0.10,
    managementFeePct: 0.06,
    carParkIncomeAnnual: 0,
    buildingAdminFixed: 0,
    childcareAnnualNet: 0,
    commercialAnnualNet: 0,
    capRateConservative: 0.055,
    capRateAggressive: 0.050,
    devMarginPct: 0.20,
  })

  db.saveBTSAssumptions({
    scenarioId,
    sellingCostsPct: 0.025,
    childcareValuePerSqm: 0,
    devMarginPct: 0.20,
  })

  // Hotel: ADR $380, occupancy 85%, GOP 42%, management 6%, FF&E reserve 5%
  // Other revenue (F&B, spa, conferencing): ~$45,760 per key per year
  db.saveHotelAssumptions({
    scenarioId,
    operatorType: 'management',
    keys: 77,
    adr: 380,
    occupancyPct: 0.85,
    otherRevenuePerKeyPerYear: 45_760,
    gopMarginPct: 0.42,
    managementFeePct: 0.06,
    ffeReservePct: 0.05,
    hotelCapRate: 0.05,
    devMarginPct: 0.20,
  })

  seedCaloundraModularScenario()
}

// Scenario 2: Modular / Precision-Manufactured Build — extracted so it can be
// seeded independently when the project already exists in localStorage.
function seedCaloundraModularScenario() {
  const pid = 'seed-caloundra-001'
  const scenarioId2 = 'seed-caloundra-mix-002'

  db.saveMixScenario({
    id: scenarioId2,
    projectId: pid,
    name: 'Modular — $3,500/sqm | 6.5% Hold Debt',
    createdAt: '2025-06-01T00:00:00.000Z',
  })

  db.saveUnitTypes(scenarioId2, [
    {
      id: 'seed-cal-mod-room-std-001',
      scenarioId: scenarioId2,
      name: 'Standard Hotel Room',
      nsaPerUnit: 20,
      targetPct: 0.532,
      solvedCount: 41,
      weeklyRentConservative: 0,
      weeklyRentAggressive: 0,
      salePriceConservative: 0,
      salePriceMid: 0,
      salePriceAggressive: 0,
      opexPerUnitPerYear: 0,
    },
    {
      id: 'seed-cal-mod-room-suite-001',
      scenarioId: scenarioId2,
      name: 'Terrace Suite + Plunge Pool',
      nsaPerUnit: 27,
      targetPct: 0.468,
      solvedCount: 36,
      weeklyRentConservative: 0,
      weeklyRentAggressive: 0,
      salePriceConservative: 0,
      salePriceMid: 0,
      salePriceAggressive: 0,
      opexPerUnitPerYear: 0,
    },
  ])

  db.saveBTRAssumptions({
    scenarioId: scenarioId2,
    vacancyPct: 0.10,
    managementFeePct: 0.06,
    carParkIncomeAnnual: 0,
    buildingAdminFixed: 0,
    childcareAnnualNet: 0,
    commercialAnnualNet: 0,
    capRateConservative: 0.055,
    capRateAggressive: 0.050,
    devMarginPct: 0.20,
  })

  db.saveBTSAssumptions({
    scenarioId: scenarioId2,
    sellingCostsPct: 0.025,
    childcareValuePerSqm: 0,
    devMarginPct: 0.20,
  })

  // $3,500/sqm installed — 47% lower build cost vs $6,624 traditional
  // Shorter modular programme → lower construction finance (5% vs 9%)
  // Ongoing hold/stabilisation debt at 6.5% p.a.
  db.saveHotelAssumptions({
    scenarioId: scenarioId2,
    operatorType: 'management',
    keys: 77,
    adr: 380,
    occupancyPct: 0.85,
    otherRevenuePerKeyPerYear: 45_760,
    gopMarginPct: 0.42,
    managementFeePct: 0.06,
    ffeReservePct: 0.05,
    hotelCapRate: 0.05,
    devMarginPct: 0.20,
    buildRateOverride: 3_500,
    constructionFinancePct: 0.05,
    holdDebtLvr: 0.60,
    holdDebtRate: 0.065,
  })
}

// ── ST. VILLAGE PRESTON ───────────────────────────────────────────────────────
// Source: IVO - Preston - June 2026 (feasibility v7.60)
// 400 BTR apartments + 2,000 sqm commercial (co-working + retail)
// 1–3 Newman St & 56–58 Oakover Rd, Preston VIC 3072
function seedPreston() {
  const pid = 'seed-preston-001'

  db.saveProject({
    id: pid,
    name: 'St Village Preston',
    address: '20-30 Newman Street, Preston VIC 3072',
    suburb: 'Preston',
    state: 'VIC',
    zone: 'Mixed Use Zone',
    responsibleAuthority: 'Darebin City Council',
    status: 'active',
    type: 'btr',
    createdAt: '2025-09-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    createdBy: 'Daniel Sette',
  })

  // Site areas — 400 BTR + 2,000 sqm commercial
  // NSA: 100×38 + 200×52 + 76×75 + 24×100 = 22,300 sqm
  // GFA @ 80% efficiency = 27,875 sqm | GBA + balconies/circulation = 32,000 sqm
  db.saveSiteDesign({
    projectId: pid,
    resiNSA: 22_300,
    resiGFA: 27_875,
    resiGBA: 32_000,
    balcony: 2_400,
    basementTotal: 5_400,
    carSpaces: 180,
    childcareGFA: 0,
    churchGFA: 0,
    churchNSA: 0,
    otherGFA: 2_000,
    notes: '400 BTR apartments (25% furnished) + 1,400 sqm co-working + 1,000 sqm retail. FIBA 3x3 court. Newman Reserve integration. Stage 1 of 5-acre St Village precinct.',
  })

  db.saveLandTerms({
    projectId: pid,
    landCost: 16_288_000,
    isInKind: false,
    inKindLabel: '',
    inKindGFA: 0,
    inKindRatePerSqm: 0,
    inKindNote: 'Site secured Sep 2025. $2M deposit paid. $13M land balance + stamp duty + WC. Post-permit RLV: $35M (conservative).',
  })

  // Cost stack — calibrated to IVO feasibility v7.60 (pre-GST, TDC ex-land ≈ $231.5M)
  // GBA 32,000 × $5,947 = $190.3M base construction
  db.saveCostStack({
    projectId: pid,
    buildRatePerSqm: 5_947,
    contingencyPct: 0.05,
    prelimsPct: 0,
    professionalFeesPct: 0.032,
    statutoryFixed: 3_374_000,
    financePct: 0.0788,
    projectManagementFixed: 4_359_371,
    marketingFixed: 0,
    amenityFitoutFixed: 2_853_124,
  })

  const scenarioId = 'seed-preston-mix-001'
  db.saveMixScenario({
    id: scenarioId,
    projectId: pid,
    name: 'BTR Mix — 25/50/19/6 (IVO v7.60)',
    createdAt: '2025-09-01T00:00:00.000Z',
  })

  // 2029 escalated rents (3.5% p.a. from 2026 base) per IVO
  db.saveUnitTypes(scenarioId, [
    {
      id: 'seed-p-u1', scenarioId,
      name: 'Studio', nsaPerUnit: 38, targetPct: 0.25, solvedCount: 100,
      weeklyRentConservative: 582, weeklyRentAggressive: 612,
      salePriceConservative: 390_000, salePriceMid: 420_000, salePriceAggressive: 460_000,
      opexPerUnitPerYear: 9_500,
    },
    {
      id: 'seed-p-u2', scenarioId,
      name: '1 Bedroom', nsaPerUnit: 52, targetPct: 0.50, solvedCount: 200,
      weeklyRentConservative: 712, weeklyRentAggressive: 748,
      salePriceConservative: 530_000, salePriceMid: 580_000, salePriceAggressive: 640_000,
      opexPerUnitPerYear: 9_500,
    },
    {
      id: 'seed-p-u3', scenarioId,
      name: '2 Bedroom', nsaPerUnit: 75, targetPct: 0.19, solvedCount: 76,
      weeklyRentConservative: 884, weeklyRentAggressive: 928,
      salePriceConservative: 760_000, salePriceMid: 820_000, salePriceAggressive: 890_000,
      opexPerUnitPerYear: 9_500,
    },
    {
      id: 'seed-p-u4', scenarioId,
      name: '3 Bedroom', nsaPerUnit: 100, targetPct: 0.06, solvedCount: 24,
      weeklyRentConservative: 1_361, weeklyRentAggressive: 1_429,
      salePriceConservative: 1_100_000, salePriceMid: 1_180_000, salePriceAggressive: 1_280_000,
      opexPerUnitPerYear: 9_500,
    },
  ])

  // BTR — IVO v7.60 NOI target: $13,658,814 | GAV @ 4.25% res = $316,057,667
  // carParkIncomeAnnual = parking $518,880 + storage $155,664 + ancillary $380,080
  db.saveBTRAssumptions({
    scenarioId,
    vacancyPct: 0,
    managementFeePct: 0,
    carParkIncomeAnnual: 1_054_624,
    buildingAdminFixed: 0,
    childcareAnnualNet: 0,
    commercialAnnualNet: 776_103,
    capRateConservative: 0.0425,
    capRateAggressive: 0.0400,
    devMarginPct: 0.20,
  })

  db.saveBTSAssumptions({
    scenarioId,
    sellingCostsPct: 0.025,
    childcareValuePerSqm: 0,
    devMarginPct: 0.20,
  })

  db.saveHotelAssumptions({
    scenarioId,
    operatorType: 'management',
    keys: 0, adr: 220, occupancyPct: 0.70,
    otherRevenuePerKey: 0,
    gopMarginPct: 0.33,
    managementFeePct: 0.04,
    ffeReservePct: 0.04,
    hotelCapRate: 0.065,
    devMarginPct: 0.20,
  })
}

// ── CALOUNDRA TIMELINE ────────────────────────────────────────────────────────
function seedCaloundraTimeline() {
  const pid = 'seed-caloundra-001'
  db.saveTimelineTasks(pid, [
    { id: 'cal-tl-01', projectId: pid, name: 'Site Acquisition & Settlement', category: 'acquisition', assignee: '7EVEN Capital', startDate: '2025-01-15', endDate: '2025-03-28', status: 'complete', progress: 100, notes: 'Bulcock Beach esplanade site 635 sqm. $14.8M purchase price.', isMilestone: false },
    { id: 'cal-tl-02', projectId: pid, name: 'Phase 1 Contamination Assessment', category: 'site', assignee: 'GHD Environmental', startDate: '2025-02-01', endDate: '2025-04-15', status: 'complete', progress: 100, notes: 'Phase 1 ESA completed. Low contamination risk — coastal sandy soils.', isMilestone: false },
    { id: 'cal-tl-03', projectId: pid, name: 'Architectural Concept & Schematic Design', category: 'planning', assignee: 'Fraser & Partners', startDate: '2024-10-01', endDate: '2025-06-30', status: 'complete', progress: 100, notes: 'Fraser & Partners project 24014. 8-storey, 77 keys, rooftop pool.', isMilestone: false },
    { id: 'cal-tl-04', projectId: pid, name: 'Marriott Bonvoy Brand Agreement', category: 'planning', assignee: '7EVEN Capital / Marriott', startDate: '2025-04-01', endDate: '2025-08-31', status: 'in-progress', progress: 65, notes: 'Term sheet agreed. Franchise agreement under review by legal.', isMilestone: false },
    { id: 'cal-tl-05', projectId: pid, name: 'Town Planning Report & DA Package', category: 'approvals', assignee: 'Urbis', startDate: '2025-07-01', endDate: '2025-10-31', status: 'in-progress', progress: 40, notes: 'Tourist Accommodation Zone — code assessable. No public notification required.', isMilestone: false },
    { id: 'cal-tl-06', projectId: pid, name: 'DA Lodgement', category: 'approvals', assignee: 'Sunshine Coast Council', startDate: '2025-11-01', endDate: '2025-11-01', status: 'not-started', progress: 0, notes: '', isMilestone: true },
    { id: 'cal-tl-07', projectId: pid, name: 'Council Assessment & Information Requests', category: 'approvals', assignee: 'Sunshine Coast Council', startDate: '2025-11-01', endDate: '2026-05-31', status: 'not-started', progress: 0, notes: 'Estimated 6-month assessment period. Code assessable streamlines process.', isMilestone: false },
    { id: 'cal-tl-08', projectId: pid, name: 'DA Approval', category: 'approvals', assignee: 'Sunshine Coast Council', startDate: '2026-06-01', endDate: '2026-06-01', status: 'not-started', progress: 0, notes: '', isMilestone: true },
    { id: 'cal-tl-09', projectId: pid, name: 'Construction Documentation (CD Set)', category: 'planning', assignee: 'Fraser & Partners', startDate: '2026-04-01', endDate: '2026-07-31', status: 'not-started', progress: 0, notes: 'Structural, hydraulic, electrical engineering coordination.', isMilestone: false },
    { id: 'cal-tl-10', projectId: pid, name: 'Demolition & Site Enabling Works', category: 'site', assignee: 'TBC Contractor', startDate: '2026-07-01', endDate: '2026-09-30', status: 'not-started', progress: 0, notes: 'Existing structures demolished. Piling and excavation for 2 basement levels.', isMilestone: false },
    { id: 'cal-tl-11', projectId: pid, name: 'Construction — Basement & Structure', category: 'construction', assignee: 'TBC Builder', startDate: '2026-09-01', endDate: '2027-06-30', status: 'not-started', progress: 0, notes: 'RC frame, post-tensioned slabs, 2 basement levels. Modular option from L1 up.', isMilestone: false },
    { id: 'cal-tl-12', projectId: pid, name: 'Construction — Superstructure L1–L8', category: 'construction', assignee: 'TBC Builder', startDate: '2027-04-01', endDate: '2028-06-30', status: 'not-started', progress: 0, notes: 'Hotel floor plate construction. In-room plunge pools L3-L6. Rooftop pool.', isMilestone: false },
    { id: 'cal-tl-13', projectId: pid, name: 'FF&E Procurement & Fitout', category: 'fitout', assignee: 'Marriott / Interior Designer', startDate: '2028-04-01', endDate: '2028-11-30', status: 'not-started', progress: 0, notes: '$3.2M amenity fitout — lobby, rooftop bar, pool deck, FF&E all rooms.', isMilestone: false },
    { id: 'cal-tl-14', projectId: pid, name: 'Practical Completion', category: 'commissioning', assignee: 'TBC Builder', startDate: '2028-12-01', endDate: '2028-12-01', status: 'not-started', progress: 0, notes: '', isMilestone: true },
    { id: 'cal-tl-15', projectId: pid, name: 'Pre-Opening & Staff Training', category: 'commissioning', assignee: 'Marriott Bonvoy', startDate: '2028-12-01', endDate: '2029-02-28', status: 'not-started', progress: 0, notes: 'Marriott pre-opening team. Soft opening period.', isMilestone: false },
    { id: 'cal-tl-16', projectId: pid, name: '5IVE Hotels Caloundra — Grand Opening', category: 'commissioning', assignee: '7EVEN Capital', startDate: '2029-03-01', endDate: '2029-03-01', status: 'not-started', progress: 0, notes: 'Target grand opening March 2029.', isMilestone: true },
  ])
}


function seedPrestonTimeline() {
  const pid = 'seed-preston-001'
  db.saveTimelineTasks(pid, [
    // ── Town Planning ──────────────────────────────────────────────────────────
    { id: 'ptn-tl-01', projectId: pid, name: 'Town Planning Documents', category: 'planning', assignee: 'Consultants', startDate: '2025-11-01', endDate: '2026-04-01', status: 'complete', progress: 100, notes: 'Full planning documentation package prepared by consultant team.', isMilestone: false },
    { id: 'ptn-tl-02', projectId: pid, name: 'DA Submission', category: 'planning', assignee: 'PPP', startDate: '2026-04-30', endDate: '2026-04-30', status: 'complete', progress: 100, notes: 'Application lodged with council via PPP.', isMilestone: true },
    { id: 'ptn-tl-03', projectId: pid, name: 'Advertising Period', category: 'approvals', assignee: 'Council/DFP', startDate: '2026-06-01', endDate: '2026-07-01', status: 'complete', progress: 100, notes: 'Statutory advertising period. Neighbour notifications issued.', isMilestone: false },
    { id: 'ptn-tl-04', projectId: pid, name: 'Planning Permit Issued', category: 'approvals', assignee: 'Council/DFP', startDate: '2026-08-31', endDate: '2026-08-31', status: 'not-started', progress: 0, notes: 'Target permit issue date. Subject to council assessment period.', isMilestone: true },
    { id: 'ptn-tl-05', projectId: pid, name: 'Prepare Endorsement Documentation', category: 'approvals', assignee: 'Consultants', startDate: '2026-09-30', endDate: '2026-10-30', status: 'not-started', progress: 0, notes: 'Prepare plans and docs for permit endorsement conditions.', isMilestone: false },
    { id: 'ptn-tl-06', projectId: pid, name: 'Permit Endorsement', category: 'approvals', assignee: 'Council/DFP', startDate: '2026-11-30', endDate: '2026-12-30', status: 'not-started', progress: 0, notes: 'Council endorsement of drawings and conditions of permit.', isMilestone: true },
    // ── Contamination / Remediation ────────────────────────────────────────────
    { id: 'ptn-tl-07', projectId: pid, name: 'Site Remediation Works', category: 'site', assignee: 'Resolve', startDate: '2026-05-31', endDate: '2027-02-05', status: 'in-progress', progress: 15, notes: 'Contamination remediation by Resolve. Active from June 2026 through to Feb 2027.', isMilestone: false },
    // ── Tender Process ─────────────────────────────────────────────────────────
    { id: 'ptn-tl-08', projectId: pid, name: 'Request for Tender (RFT)', category: 'planning', assignee: 'HM', startDate: '2026-09-01', endDate: '2026-10-06', status: 'not-started', progress: 0, notes: 'Issue RFT to shortlisted D&C contractors.', isMilestone: false },
    { id: 'ptn-tl-09', projectId: pid, name: 'Tender Evaluation', category: 'planning', assignee: 'HM', startDate: '2026-09-22', endDate: '2026-10-12', status: 'not-started', progress: 0, notes: 'Evaluate and score tender submissions.', isMilestone: false },
    { id: 'ptn-tl-10', projectId: pid, name: 'Contractor Negotiation', category: 'planning', assignee: 'HM', startDate: '2026-10-21', endDate: '2026-11-04', status: 'not-started', progress: 0, notes: 'Commercial negotiation with preferred contractor.', isMilestone: false },
    { id: 'ptn-tl-11', projectId: pid, name: 'Contractor Award', category: 'planning', assignee: 'HM', startDate: '2026-10-11', endDate: '2026-10-11', status: 'not-started', progress: 0, notes: 'Award decision and notification to successful tenderer.', isMilestone: true },
    // ── Early Contractor Involvement (ECI) ─────────────────────────────────────
    { id: 'ptn-tl-12', projectId: pid, name: 'ECI Agreement Executed', category: 'construction', assignee: 'HM', startDate: '2026-11-11', endDate: '2026-11-11', status: 'not-started', progress: 0, notes: 'Sign ECI agreement with selected contractor.', isMilestone: true },
    { id: 'ptn-tl-13', projectId: pid, name: 'Value Management 1', category: 'construction', assignee: 'HM', startDate: '2026-11-13', endDate: '2027-01-04', status: 'not-started', progress: 0, notes: 'First round value management workshop — overall scheme.', isMilestone: false },
    { id: 'ptn-tl-14', projectId: pid, name: 'Cost Plan 1 Review', category: 'construction', assignee: 'HM', startDate: '2027-02-02', endDate: '2027-02-07', status: 'not-started', progress: 0, notes: 'Quantum review of cost plan 1 post VM1.', isMilestone: false },
    { id: 'ptn-tl-15', projectId: pid, name: 'Value Management 2 — Structure', category: 'construction', assignee: 'HM', startDate: '2027-09-02', endDate: '2027-09-25', status: 'not-started', progress: 0, notes: 'Structure-focused value management workshop with structural engineer.', isMilestone: false },
    { id: 'ptn-tl-16', projectId: pid, name: 'Value Management 3 — Finishes', category: 'construction', assignee: 'HM', startDate: '2027-03-16', endDate: '2027-04-05', status: 'not-started', progress: 0, notes: 'Finishes and FF&E value management workshop.', isMilestone: false },
    { id: 'ptn-tl-17', projectId: pid, name: 'Letter of Intent', category: 'construction', assignee: 'HM', startDate: '2027-04-13', endDate: '2027-04-13', status: 'not-started', progress: 0, notes: 'Issue Letter of Intent to contractor ahead of contract execution.', isMilestone: true },
    { id: 'ptn-tl-18', projectId: pid, name: 'Contract Execution', category: 'construction', assignee: 'HM', startDate: '2027-04-05', endDate: '2027-04-05', status: 'not-started', progress: 0, notes: 'Execute D&C contract. Financial close.', isMilestone: true },
    { id: 'ptn-tl-19', projectId: pid, name: 'Novate Consultant Team', category: 'planning', assignee: 'HM', startDate: '2027-04-05', endDate: '2027-04-15', status: 'not-started', progress: 0, notes: 'Novate architects, engineers and key consultants to contractor.', isMilestone: false },
    // ── Consultant Documentation ───────────────────────────────────────────────
    { id: 'ptn-tl-20', projectId: pid, name: 'Fraser — Design Development to Tender', category: 'planning', assignee: 'Fraser & Partners', startDate: '2026-11-30', endDate: '2027-01-09', status: 'not-started', progress: 0, notes: 'Fraser & Partners design development through to tender issue.', isMilestone: false },
    { id: 'ptn-tl-21', projectId: pid, name: 'Fraser — Construction Documentation', category: 'planning', assignee: 'Fraser & Partners', startDate: '2027-01-09', endDate: '2027-02-08', status: 'not-started', progress: 0, notes: 'Fraser & Partners full construction documentation set.', isMilestone: false },
    { id: 'ptn-tl-22', projectId: pid, name: 'IGS — Structural & Services Documentation', category: 'planning', assignee: 'IGS', startDate: '2027-02-08', endDate: '2027-02-28', status: 'not-started', progress: 0, notes: 'IGS tender and contract documentation package.', isMilestone: false },
    { id: 'ptn-tl-23', projectId: pid, name: 'EDGE — Services Documentation', category: 'planning', assignee: 'EDGE', startDate: '2027-02-28', endDate: '2027-03-25', status: 'not-started', progress: 0, notes: 'EDGE ESD/services tender and construction documentation.', isMilestone: false },
    { id: 'ptn-tl-24', projectId: pid, name: 'Specialist Reports (Fire, Acoustic, Arborist)', category: 'planning', assignee: 'Consultants', startDate: '2027-03-25', endDate: '2027-04-24', status: 'not-started', progress: 0, notes: 'Finalise fire, acoustic, arborist and other specialist consultant reports.', isMilestone: false },
    // ── Pre-Construction / Permits ──────────────────────────────────────────────
    { id: 'ptn-tl-25', projectId: pid, name: 'Stage 1 Building Permit — Checklist', category: 'approvals', assignee: 'Building Surveyor', startDate: '2027-04-24', endDate: '2027-05-04', status: 'not-started', progress: 0, notes: 'FS Stage 1 BP checklist review and submission.', isMilestone: false },
    { id: 'ptn-tl-26', projectId: pid, name: 'Stage 1 Building Permit — Admin', category: 'approvals', assignee: 'Building Surveyor', startDate: '2027-05-04', endDate: '2027-06-03', status: 'not-started', progress: 0, notes: 'Admin items for Stage 1 building permit application.', isMilestone: false },
    { id: 'ptn-tl-27', projectId: pid, name: 'Stage 1 Building Permit Issued', category: 'approvals', assignee: 'Building Surveyor', startDate: '2027-06-03', endDate: '2027-06-13', status: 'not-started', progress: 0, notes: 'FS Stage 1 building permit issued.', isMilestone: false },
    { id: 'ptn-tl-28', projectId: pid, name: 'Construction Management Plan (CMP)', category: 'approvals', assignee: 'Contractor', startDate: '2027-06-13', endDate: '2027-07-11', status: 'not-started', progress: 0, notes: 'Contractor prepares and submits CMP to council.', isMilestone: false },
    { id: 'ptn-tl-29', projectId: pid, name: 'D&C Pile Design', category: 'construction', assignee: 'Contractor', startDate: '2027-07-11', endDate: '2027-07-26', status: 'not-started', progress: 0, notes: 'Builder D&C pile design finalised by structural engineer.', isMilestone: false },
    { id: 'ptn-tl-30', projectId: pid, name: 'Protection Works Notice (PWN)', category: 'approvals', assignee: 'Building Surveyor', startDate: '2027-07-26', endDate: '2027-08-25', status: 'not-started', progress: 0, notes: 'Serve and resolve protection works notices with adjoining owners.', isMilestone: false },
    { id: 'ptn-tl-31', projectId: pid, name: 'Full Building Permit Issued', category: 'approvals', assignee: 'Building Surveyor', startDate: '2027-09-04', endDate: '2027-09-04', status: 'not-started', progress: 0, notes: 'FS full building permit issued. Construction can formally commence.', isMilestone: true },
    // ── Demolition ────────────────────────────────────────────────────────────
    { id: 'ptn-tl-32', projectId: pid, name: 'Engage Demo Contractor', category: 'site', assignee: 'HM', startDate: '2026-11-30', endDate: '2027-01-06', status: 'not-started', progress: 0, notes: 'Appoint demolition contractor and execute contract.', isMilestone: false },
    { id: 'ptn-tl-33', projectId: pid, name: 'Site Settlement', category: 'acquisition', assignee: 'HM', startDate: '2027-02-02', endDate: '2027-02-02', status: 'not-started', progress: 0, notes: 'Legal settlement of land purchase. Access for construction commences.', isMilestone: true },
    { id: 'ptn-tl-34', projectId: pid, name: 'Notice to Vacate — Tenants', category: 'site', assignee: 'HM', startDate: '2027-02-03', endDate: '2027-02-23', status: 'not-started', progress: 0, notes: 'Serve and manage notice to vacate for any remaining tenants.', isMilestone: false },
    { id: 'ptn-tl-35', projectId: pid, name: 'Service Abolishments', category: 'site', assignee: 'HM', startDate: '2027-03-16', endDate: '2027-05-15', status: 'not-started', progress: 0, notes: 'Abolish gas, power, water and comms connections prior to demolition.', isMilestone: false },
    { id: 'ptn-tl-36', projectId: pid, name: 'Demolition Permit', category: 'site', assignee: 'Building Surveyor', startDate: '2027-05-25', endDate: '2027-06-09', status: 'not-started', progress: 0, notes: 'Obtain demolition permit from building surveyor.', isMilestone: false },
    { id: 'ptn-tl-37', projectId: pid, name: 'Demolition Works', category: 'site', assignee: 'Demo Contractor', startDate: '2027-06-15', endDate: '2027-07-05', status: 'not-started', progress: 0, notes: 'Full demolition of existing structures on site.', isMilestone: false },
    // ── Construction ──────────────────────────────────────────────────────────
    { id: 'ptn-tl-38', projectId: pid, name: 'Site Establishment', category: 'construction', assignee: 'Contractor', startDate: '2027-07-05', endDate: '2027-07-17', status: 'not-started', progress: 0, notes: 'Site fencing, hoardings, crane pad, temporary services.', isMilestone: false },
    { id: 'ptn-tl-39', projectId: pid, name: 'Substructure — Piles & Footings', category: 'construction', assignee: 'Contractor', startDate: '2027-07-17', endDate: '2027-08-17', status: 'not-started', progress: 0, notes: 'Pile installation, footing excavation and pour.', isMilestone: false },
    { id: 'ptn-tl-40', projectId: pid, name: 'Concrete Structure', category: 'construction', assignee: 'Contractor', startDate: '2027-11-17', endDate: '2027-12-29', status: 'not-started', progress: 0, notes: 'Reinforced concrete structure across all levels.', isMilestone: false },
    { id: 'ptn-tl-41', projectId: pid, name: 'Roof & Plant Room', category: 'construction', assignee: 'Contractor', startDate: '2028-01-02', endDate: '2028-02-16', status: 'not-started', progress: 0, notes: 'Roof structure, waterproofing and plant room installation.', isMilestone: false },
    // ── Fitout ────────────────────────────────────────────────────────────────
    { id: 'ptn-tl-42', projectId: pid, name: 'Internal Fitout & Apartments', category: 'fitout', assignee: 'Contractor', startDate: '2028-09-04', endDate: '2029-03-13', status: 'not-started', progress: 0, notes: 'Internal fitout of all apartments, common areas, lobbies and amenities.', isMilestone: false },
    { id: 'ptn-tl-43', projectId: pid, name: 'External Works & Landscaping', category: 'fitout', assignee: 'Contractor', startDate: '2028-11-23', endDate: '2029-01-07', status: 'not-started', progress: 0, notes: 'External cladding, landscaping, street activation and Newman St works.', isMilestone: false },
    // ── Commissioning ─────────────────────────────────────────────────────────
    { id: 'ptn-tl-44', projectId: pid, name: 'Marketing Launch — St. Village Preston', category: 'commissioning', assignee: 'Carr / 7EVEN', startDate: '2028-01-04', endDate: '2028-01-04', status: 'not-started', progress: 0, notes: 'Public launch event. Website live, hoarding installed, PR activated.', isMilestone: true },
    { id: 'ptn-tl-45', projectId: pid, name: 'BTR Leasing Campaign', category: 'commissioning', assignee: 'Property Manager', startDate: '2028-01-05', endDate: '2029-03-14', status: 'not-started', progress: 0, notes: 'Pre-lease BTR apartments ahead of completion. Target 70% pre-leased at handover.', isMilestone: false },
    { id: 'ptn-tl-46', projectId: pid, name: 'Handover & Defects', category: 'commissioning', assignee: 'Contractor', startDate: '2029-01-20', endDate: '2029-02-04', status: 'not-started', progress: 0, notes: 'Practical completion inspection, defects list and handover to property manager.', isMilestone: false },
    { id: 'ptn-tl-47', projectId: pid, name: 'St. Village Preston — Practical Completion', category: 'commissioning', assignee: '7EVEN Capital', startDate: '2029-02-04', endDate: '2029-02-04', status: 'not-started', progress: 0, notes: 'Target practical completion Feb 2029. BTR operational. Stabilisation phase commences.', isMilestone: true },
  ])
}

function seedPrestonDetailedCosts() {
  const pid = 'seed-preston-001'
  db.saveDetailedCostStack({
    projectId: pid,
    hardCosts: [
      { id: 'ptn-hc-01', label: 'Construction Costs — Built Form', amount: 0, notes: 'D&C contractor — to be confirmed post tender' },
      { id: 'ptn-hc-02', label: 'Construction Costs — External Works', amount: 0, notes: '' },
      { id: 'ptn-hc-03', label: 'Commercial Fitout', amount: 0, notes: '' },
      { id: 'ptn-hc-04', label: 'Demolition — Stage 1', amount: 0, notes: '' },
      { id: 'ptn-hc-05', label: 'Demolition — Stage 2', amount: 0, notes: '' },
      { id: 'ptn-hc-06', label: 'Construction Contingency (5%)', amount: 0, notes: '' },
      { id: 'ptn-hc-07', label: 'Site Remediation — Resolve (407.2)', amount: 98589, notes: 'Signed fee — Resolve Environmental. Contamination remediation works.' },
      { id: 'ptn-hc-08', label: 'Retropolis — Tenant Lease Payment (407.1)', amount: 1000000, notes: 'Existing tenant lease buyout / relocation payment. Signed.' },
    ],
    consultants: [
      // ── Architecture — Fraser & Partners ──────────────────────────────────
      { id: 'ptn-con-01', label: 'Architect | Feasibility Design — Fraser & Partners (402.6)', amount: 10000, notes: 'Signed fee proposal. Fraser & Partners.' },
      { id: 'ptn-con-02', label: 'Architect | Master Planning — Fraser & Partners (402.7)', amount: 50000, notes: 'Signed fee proposal. Fraser & Partners.' },
      { id: 'ptn-con-03', label: 'Architect | 50% Sketch Design — Fraser & Partners (402.10)', amount: 150000, notes: 'Signed fee proposal. Fraser & Partners.' },
      { id: 'ptn-con-04', label: 'Architect | 100% Sketch Design — Fraser & Partners (402.11)', amount: 560000, notes: 'Signed fee proposal. Fraser & Partners.' },
      { id: 'ptn-con-05', label: 'Architect | 50% Design Development — Fraser & Partners (402.12)', amount: 770000, notes: 'Signed fee proposal. Fraser & Partners.' },
      { id: 'ptn-con-06', label: 'Architect | 100% Design Development — Fraser & Partners (402.13)', amount: 770000, notes: 'Signed fee proposal. Fraser & Partners.' },
      { id: 'ptn-con-07', label: 'Architect | Construction Drawings — Fraser & Partners (402.14)', amount: 770000, notes: 'Signed fee proposal. Fraser & Partners.' },
      { id: 'ptn-con-08', label: 'Architect | Construction Services — Fraser & Partners (402.15)', amount: 770000, notes: 'Signed fee proposal. Fraser & Partners.' },
      // ── Acoustic — Marshall Day ────────────────────────────────────────────
      { id: 'ptn-con-09', label: 'Acoustic Engineer | Planning — Marshall Day (402.1)', amount: 7300, notes: 'Signed fee proposal. Marshall Day Acoustics.' },
      { id: 'ptn-con-10', label: 'Acoustic Engineer | Schematic Design — Marshall Day (402.2)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-11', label: 'Acoustic Engineer | Construction — Marshall Day (402.3)', amount: 0, notes: 'TBC — not yet signed' },
      // ── Civil / Drainage — DCE ────────────────────────────────────────────
      { id: 'ptn-con-12', label: 'Civil Eng | Services & Infrastructure — DCE (402.22)', amount: 9720, notes: 'Signed fee proposal. DCE.' },
      { id: 'ptn-con-13', label: 'Civil Eng | Flooding & Stormwater Management — DCE (402.23)', amount: 21160, notes: 'Signed fee proposal. DCE. Variation $1,400.' },
      // ── DDA — DDEG ────────────────────────────────────────────────────────
      { id: 'ptn-con-14', label: 'DDA | Town Planning — DDEG (402.28)', amount: 2250, notes: 'Signed fee proposal. DDEG.' },
      { id: 'ptn-con-15', label: 'DDA | Design Development — DDEG (402.29)', amount: 2500, notes: 'Signed fee proposal. DDEG.' },
      // ── ESD — Stantec ─────────────────────────────────────────────────────
      { id: 'ptn-con-16', label: 'ESD | Town Planning — Stantec (402.33)', amount: 13100, notes: 'Signed fee proposal. Stantec.' },
      { id: 'ptn-con-17', label: 'ESD | JV3 & Green Star — Stantec (402.34)', amount: 6500, notes: 'Signed fee proposal. Stantec.' },
      // ── Geotechnical ──────────────────────────────────────────────────────
      { id: 'ptn-con-18', label: 'Geotechnical Engineer | Investigation Report — Melbourne Geotechnical (402.43)', amount: 21650, notes: 'Signed fee proposal. Melbourne Geotechnical.' },
      // ── Housing Diversity ─────────────────────────────────────────────────
      { id: 'ptn-con-19', label: 'Housing Diversity Report — ASR Research (402.48)', amount: 13340, notes: 'Signed fee proposal. ASR Research.' },
      // ── Land Surveyor — Land Dimensions ───────────────────────────────────
      { id: 'ptn-con-20', label: 'Land Surveyor | Feature & Level Survey — Land Dimensions (402.59)', amount: 9000, notes: 'Signed fee proposal. Land Dimensions.' },
      { id: 'ptn-con-21', label: 'Land Surveyor | Title Re-establishment — Land Dimensions (402.60)', amount: 3900, notes: 'Signed fee proposal. Land Dimensions.' },
      { id: 'ptn-con-22', label: 'Land Surveyor | Plan of Subdivision — Land Dimensions (402.61)', amount: 3000, notes: 'Signed fee proposal. Land Dimensions.' },
      { id: 'ptn-con-23', label: 'Land Surveyor | Subdivision Certification — Land Dimensions (402.62)', amount: 11500, notes: 'Signed fee proposal. Land Dimensions.' },
      // ── Landscape — Spiire ────────────────────────────────────────────────
      { id: 'ptn-con-24', label: 'Landscape | DPO — Spiire (402.63)', amount: 19830, notes: 'Signed fee proposal. Spiire.' },
      { id: 'ptn-con-25', label: 'Landscape | Town Planning Submission — Spiire (402.64)', amount: 14630, notes: 'Signed fee proposal. Spiire.' },
      { id: 'ptn-con-26', label: 'Landscape | Design Development — Spiire (402.65)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-27', label: 'Landscape | Contract Documentation — Spiire (402.66)', amount: 0, notes: 'TBC — not yet signed' },
      // ── Project Management — HM ───────────────────────────────────────────
      { id: 'ptn-con-28', label: 'Project Manager | Design Stage — HM (402.71)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-29', label: 'Project Manager | Construction Stage — HM (402.72)', amount: 0, notes: 'TBC — not yet signed' },
      // ── Quantity Surveyor ─────────────────────────────────────────────────
      { id: 'ptn-con-30', label: 'Quantity Surveyor | Initial Report — Draw Down (402.73)', amount: 1000, notes: 'Signed fee proposal. Draw Down.' },
      { id: 'ptn-con-31', label: 'Quantity Surveyor | Monthly Claims — TBC (402.74)', amount: 0, notes: 'TBC — not yet signed' },
      // ── Traffic ───────────────────────────────────────────────────────────
      { id: 'ptn-con-32', label: 'Traffic Management | Town Planning — Stantec (402.101)', amount: 35700, notes: 'Signed fee proposal. Stantec.' },
      { id: 'ptn-con-33', label: 'Traffic Management | CMP — Infra Engineering (402.102)', amount: 5000, notes: 'Signed fee proposal. Infra Engineering.' },
      // ── Urban Design — Hansen ─────────────────────────────────────────────
      { id: 'ptn-con-34', label: 'Urban Design | Concept & Development Plan — Hansen (402.103)', amount: 14500, notes: 'Signed fee proposal. Hansen Partnership.' },
      { id: 'ptn-con-35', label: 'Urban Design | Development Plan Preparation — Hansen (402.104)', amount: 12500, notes: 'Signed fee proposal. Hansen Partnership.' },
      { id: 'ptn-con-36', label: 'Urban Design | TP Application Support — Hansen (402.105)', amount: 7000, notes: 'Signed fee proposal. Hansen Partnership.' },
      // ── Waste — MGA ───────────────────────────────────────────────────────
      { id: 'ptn-con-37', label: 'Waste Management | Town Planning — MGA (402.109)', amount: 2400, notes: 'Signed fee proposal. MGA.' },
      // ── Wind — VIPAC ──────────────────────────────────────────────────────
      { id: 'ptn-con-38', label: 'Wind | Town Planning — VIPAC (402.112)', amount: 2650, notes: 'Signed fee proposal. VIPAC.' },
      { id: 'ptn-con-39', label: 'Wind | Design Development — VIPAC (402.113)', amount: 14500, notes: 'Signed fee proposal. VIPAC.' },
      // ── TBC items ─────────────────────────────────────────────────────────
      { id: 'ptn-con-40', label: 'Building Surveyor | BCA Report — TBC (402.20)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-41', label: 'Building Surveyor | Construction — TBC (402.21)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-42', label: 'Fire Engineering | Schematic — TBC (402.39)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-43', label: 'Fire Engineering | FEB — TBC (402.40)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-44', label: 'Fire Engineering | FER — TBC (402.41)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-45', label: 'Structural Engineer | Schematic — TBC (402.89)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-46', label: 'Structural Engineer | Design Development — TBC (402.90)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-47', label: 'Structural Engineer | Construction Drawings — TBC (402.91)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-48', label: 'Services (M&E) | Schematic — TBC (402.85)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-49', label: 'Services (M&E) | Design Development — TBC (402.86)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-50', label: 'Services (M&E) | Construction Drawings — TBC (402.87)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-51', label: 'Interior Design | Schematic — TBC (402.54)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-52', label: 'Interior Design | Design Development — TBC (402.56)', amount: 0, notes: 'TBC — not yet signed' },
      { id: 'ptn-con-53', label: 'Town Planner | Strategy & Approval — PPP (402.96)', amount: 0, notes: 'TBC — fee to be confirmed with PPP' },
      { id: 'ptn-con-54', label: 'Arborist | Planning — TBC (402.4)', amount: 0, notes: 'TBC — not yet signed' },
    ],
    statutory: [
      { id: 'ptn-stat-01', label: 'Planning Application Fee / MPL — City of Darebin / SRO (404.3)', amount: 290358.10, notes: 'Signed/paid. City of Darebin & SRO.' },
      { id: 'ptn-stat-02', label: 'Asset Protection Bond — City of Darebin (404.1)', amount: 0, notes: 'Construction phase — TBC' },
      { id: 'ptn-stat-03', label: 'Building Application Fee — City of Darebin (404.2)', amount: 0, notes: 'TBC — post planning permit' },
      { id: 'ptn-stat-04', label: 'Development Contribution — City of Darebin (404.5)', amount: 0, notes: 'TBC — post planning permit' },
      { id: 'ptn-stat-05', label: 'NBN / Comms Connection (407.3)', amount: 0, notes: 'TBC' },
      { id: 'ptn-stat-06', label: 'Sewer & Water Headworks — PIC (407.4)', amount: 0, notes: 'TBC' },
      { id: 'ptn-stat-07', label: 'Substation / Electrical Design (407.6)', amount: 0, notes: 'TBC' },
      { id: 'ptn-stat-08', label: 'Substation / Electrical Works (407.7)', amount: 0, notes: 'TBC' },
    ],
    marketing: [
      { id: 'ptn-mkt-01', label: 'Marketing Renders — Flood Slicer (406.4)', amount: 0, notes: 'TBC — Flood Slicer' },
      { id: 'ptn-mkt-02', label: 'Marketing Website — Identity X (406.5)', amount: 0, notes: 'TBC — Identity X' },
      { id: 'ptn-mkt-03', label: 'Marketing Collateral (406.2)', amount: 0, notes: 'TBC' },
      { id: 'ptn-mkt-04', label: 'Advertising — One Off (406.1)', amount: 0, notes: 'TBC' },
      { id: 'ptn-mkt-05', label: 'Sporting Goat', amount: 7638.68, notes: 'Paid. Sporting Goat.' },
    ],
  })
}

// ── Caloundra Historical Snapshot ─────────────────────────────────────────────
// Seeds the original 7C Financials figures as a named snapshot in Version History
// so users can restore the original feasibility data at any time.
function seedCaloundraHistoricalSnapshot() {
  const pid = 'seed-caloundra-001'

  // Temporarily write the original data so captureSnapshot picks it up
  const project = db.getProject(pid)
  if (!project) return

  db.saveSiteDesign({
    projectId: pid,
    resiNSA: 1_787, resiGFA: 3_339, resiGBA: 3_698,
    balcony: 420, basementTotal: 500, carSpaces: 31,
    childcareGFA: 0, churchGFA: 0, churchNSA: 0, otherGFA: 436,
    notes: '77 bespoke 5-star hotel rooms across 8 storeys on 635 sqm beachfront site. Fraser & Partners design 24014. L0: lobby + cafe. L1-2: standard rooms. L3-6: terrace suites with plunge pools. Rooftop pool 180m² + bar 96m². Managed by Marriott Bonvoy.',
  })
  db.saveLandTerms({ projectId: pid, landCost: 7_200_000, isInKind: false, inKindLabel: '', inKindGFA: 0, inKindRatePerSqm: 3800, inKindNote: '' })
  db.saveCostStack({
    projectId: pid,
    buildRatePerSqm: 9_500, contingencyPct: 0.05, prelimsPct: 0.08,
    professionalFeesPct: 0.07, statutoryFixed: 1_200_000, financePct: 0.09,
    projectManagementFixed: 1_800_000, marketingFixed: 850_000, amenityFitoutFixed: 3_200_000,
  })

  const scenarioId = 'seed-caloundra-mix-001'
  db.saveMixScenario({ id: scenarioId, projectId: pid, name: 'Standard Configuration — 77 Keys', createdAt: new Date().toISOString() })
  db.saveUnitTypes(scenarioId, [
    { id: 'seed-cal-room-std-001', scenarioId, name: 'Standard Hotel Room', nsaPerUnit: 20, targetPct: 0.532, solvedCount: 41, weeklyRentConservative: 0, weeklyRentAggressive: 0, salePriceConservative: 0, salePriceMid: 0, salePriceAggressive: 0, opexPerUnitPerYear: 0 },
    { id: 'seed-cal-room-suite-001', scenarioId, name: 'Terrace Suite + Plunge Pool', nsaPerUnit: 27, targetPct: 0.468, solvedCount: 36, weeklyRentConservative: 0, weeklyRentAggressive: 0, salePriceConservative: 0, salePriceMid: 0, salePriceAggressive: 0, opexPerUnitPerYear: 0 },
  ])
  db.saveHotelAssumptions({
    scenarioId,
    keys: 77, adr: 480, occupancyPct: 0.72,
    otherRevenuePerKeyPerYear: 4_200,
    gopMarginPct: 0.42, managementFeePct: 0.035, ffeReservePct: 0.04,
    hotelCapRate: 0.065, devMarginPct: 0.18,
    buildRateOverride: 9_500, constructionFinancePct: 0.09,
    holdDebtLvr: 0.55, holdDebtRate: 0.068,
  })
  db.saveBTRAssumptions({ scenarioId, vacancyPct: 0.05, managementFeePct: 0.07, carParkIncomeAnnual: 0, buildingAdminFixed: 0, childcareAnnualNet: 0, commercialAnnualNet: 0, capRateConservative: 0.055, capRateAggressive: 0.048, devMarginPct: 0.18 })
  db.saveBTSAssumptions({ scenarioId, sellingCostsPct: 0.025, childcareValuePerSqm: 0, devMarginPct: 0.18 })

  // Capture snapshot with original data
  captureSnapshot(pid, 'Original Feasibility — 7C Financials · 5IVE Hotels Caloundra')

  // Now wipe again so the project remains blank for manual entry
  db.resetProjectData(pid)
  db.saveProject({ ...project, type: 'hotel', brand: '7even', updatedAt: new Date().toISOString() })
}

// ── 35 CORIO STREET, GEELONG — CUNNINGHAM PLACE ──────────────────────────────
// Architect: Fraser & Partners (concept design & yield analysis, Feb 2025).
// Market data: CoreLogic / YIP / Domain / CBRE, June 2026. 2 towers (17 + 12
// lvls), 274 apts, 1,550 sqm retail, 357 car spaces + a hypothetical 150-key hotel.
const CORIO_NOTES = 'Fraser & Partners — concept design & yield analysis (Feb 2025). Tower A: 17 lvls / 154 apts / 12,260 NSA. Tower B: 12 lvls / 120 apts / 9,555 NSA. Retail GF 1,550 sqm NSA. 357 car spaces (356 required — VPP 52.06 compliant). NSA/GFA efficiency 96.2%. Build rate $4,000/sqm on 25,439 sqm resi+retail GBA; 11,350 sqm parking costed separately ($18M allowance).'

// Land: acquired from the church for $25M on vendor terms — carried as an in-kind
// project cost with NO debt, finance or holding interest (as Werribee/Geelong).
function corioLand(pid: string) {
  return {
    projectId: pid,
    landCost: 0,
    isInKind: true,
    inKindLabel: 'Church land acquisition',
    inKindGFA: 6250,
    inKindRatePerSqm: 4000,     // 6,250 × $4,000 = $25,000,000 church land consideration
    inKindNote: 'Land acquired from the church for $25M on vendor terms — treated as a project cost with no debt, finance or holding interest.',
    state: 'VIC' as const,
    propertyType: 'commercial' as const,
    foreignBuyer: false,
    applyStampDuty: false,
    settlementDate: '',
    landGst: 'none' as const,
  }
}

function seedCorio() {
  const pid = 'geelong-35-corio'

  db.saveProject({
    id: pid,
    name: 'Cunningham Place',
    address: '35 Corio Street, Geelong VIC 3220',
    suburb: 'Geelong',
    state: 'VIC',
    zone: 'Capital City Zone (CCZ) — Geelong CBD',
    responsibleAuthority: 'City of Greater Geelong',
    status: 'active',
    type: 'mixed',
    brand: '7even',
    createdAt: '2025-02-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  })

  db.saveSiteDesign({
    projectId: pid,
    resiNSA: 21815,
    resiGFA: 22685,
    resiGBA: 25439,
    balcony: 2754,
    basementTotal: 0,          // 11,350 sqm structured parking sits in the detailed cost stack, not the GBA basis
    carSpaces: 357,
    childcareGFA: 0,
    churchGFA: 0,
    churchNSA: 0,
    retailGFA: 1540,
    retailNSA: 1550,
    commercialGFA: 0,
    commercialNSA: 0,
    communalGFA: 0,
    otherGFA: 0,
    notes: CORIO_NOTES,
  })

  db.saveLandTerms(corioLand(pid))

  db.saveCostStack({
    projectId: pid,
    buildRatePerSqm: 4000,     // CBD Geelong mixed-use ($3,800 low / $4,300 high)
    contingencyPct: 0.05,
    prelimsPct: 0.08,
    professionalFeesPct: 0.07,
    statutoryFixed: 2200000,
    financePct: 0.09,
    projectManagementFixed: 4500000,
    marketingFixed: 3500000,
    amenityFitoutFixed: 800000,
    gstEnabled: true,
  })

  // Detailed itemisation (CFO view) — includes the $18M underground parking allowance
  db.saveDetailedCostStack({
    projectId: pid,
    hardCosts: [
      { id: 'corio-hc-1', label: 'Construction — residential + retail (25,439 sqm @ $4,000)', amount: 101756000, notes: 'WMK GBA basis, CBD build rate', sCurve: 'scurve', fundedBy: 'blend', equityPct: 0.3 },
      { id: 'corio-hc-2', label: 'Underground parking — 357 spaces (11,350 sqm)', amount: 18000000, notes: 'VPP 52.06 compliant; separate allowance', sCurve: 'scurve', fundedBy: 'debt' },
      { id: 'corio-hc-3', label: 'Contingency (5%)', amount: 5087800, notes: '', sCurve: 'linear', fundedBy: 'equity' },
      { id: 'corio-hc-4', label: 'Preliminaries (8%)', amount: 8140480, notes: '', sCurve: 'scurve', fundedBy: 'blend', equityPct: 0.3 },
    ],
    consultants: [
      { id: 'corio-cn-1', label: 'Professional fees (7%) — WMK + engineering + advisory', amount: 7122920, notes: 'Concept → DD → documentation → CA', sCurve: 'upfront', fundedBy: 'equity' },
    ],
    statutory: [
      { id: 'corio-st-1', label: 'Statutory, planning & council levies', amount: 2200000, notes: 'City of Greater Geelong — CCZ', sCurve: 'upfront', fundedBy: 'equity' },
      { id: 'corio-st-2', label: 'Construction finance (9%)', amount: 9157920, notes: 'Interest on debt during build', sCurve: 'backloaded', fundedBy: 'debt' },
    ],
    marketing: [
      { id: 'corio-mk-1', label: 'Project management', amount: 4500000, notes: '', sCurve: 'linear', fundedBy: 'equity' },
      { id: 'corio-mk-2', label: 'Marketing & sales', amount: 3500000, notes: '', sCurve: 'backloaded', fundedBy: 'equity' },
      { id: 'corio-mk-3', label: 'Amenity fit-out', amount: 800000, notes: 'Resi amenity + lobby', sCurve: 'backloaded', fundedBy: 'equity' },
    ],
  })

  const scenarioId = 'geelong-35-corio-mix-001'
  db.saveMixScenario({ id: scenarioId, projectId: pid, name: 'WMK Yield — 8/82/10', createdAt: '2025-02-01T00:00:00.000Z' })

  db.saveUnitTypes(scenarioId, [
    {
      id: 'corio-u1', scenarioId, name: '1 Bedroom', nsaPerUnit: 58, targetPct: 0.077, solvedCount: 21,
      weeklyRentConservative: 515, weeklyRentAggressive: 630,
      salePriceConservative: 580000, salePriceMid: 660000, salePriceAggressive: 750000,
      opexPerUnitPerYear: 3500,
    },
    {
      id: 'corio-u2', scenarioId, name: '2 Bedroom', nsaPerUnit: 79, targetPct: 0.821, solvedCount: 225,
      weeklyRentConservative: 600, weeklyRentAggressive: 750,
      salePriceConservative: 750000, salePriceMid: 870000, salePriceAggressive: 1000000,
      opexPerUnitPerYear: 4200,
    },
    {
      id: 'corio-u3', scenarioId, name: '3 Bedroom', nsaPerUnit: 108, targetPct: 0.102, solvedCount: 28,
      weeklyRentConservative: 740, weeklyRentAggressive: 915,
      salePriceConservative: 1100000, salePriceMid: 1250000, salePriceAggressive: 1450000,
      opexPerUnitPerYear: 5500,
    },
  ])

  db.saveBTRAssumptions({
    scenarioId,
    vacancyPct: 0.05,
    leaseUpMonths: 12,
    managementFeePct: 0.07,
    carParkIncomeAnnual: 963900,   // 357 spaces × $250/mth × 90% occ
    buildingAdminFixed: 250000,
    childcareAnnualNet: 0,
    commercialAnnualNet: 572230,   // retail GF: $380/sqm net × 1,550 sqm × 97% occ
    capRateConservative: 0.05,     // CBD Geelong — tighter than 5.5% outer suburban
    capRateAggressive: 0.05,
    devMarginPct: 0.18,
  })

  db.saveBTSAssumptions({
    scenarioId,
    sellingCostsPct: 0.025,
    childcareValuePerSqm: 10000,   // retail GF value $/sqm (mid)
    devMarginPct: 0.18,
  })

  // Hotel is hypothetical (requires design variation) — base case: 150 keys, ADR $260, 72% occ
  db.saveHotelAssumptions({
    scenarioId,
    keys: 150,
    adr: 260,
    occupancyPct: 0.72,
    otherRevenuePerKeyPerYear: 12000,
    gopMarginPct: 0.36,
    managementFeePct: 0.05,
    ffeReservePct: 0.04,
    hotelCapRate: 0.055,
    devMarginPct: 0.18,
  })

  // Programme — powers the live countdown clock on the board (36-month build)
  db.saveCashflow({ ...defaultCashflowState(pid), startDate: '2026-09', months: 36 })

  seedCorioScenarioA(pid)
}

// Scenario A — Preston mix (25/50/19/6) across both towers, hotel converted to
// residential (keys 0). Preston unit sizes (38/52/75/100 sqm). Same residential
// envelope (21,815 NSA) so it can be compared against the WMK yield scenario.
function seedCorioScenarioA(pid: string) {
  const scenarioId = 'geelong-35-corio-mix-A'
  db.saveMixScenario({ id: scenarioId, projectId: pid, name: 'Scenario A — Preston mix 25/50/19/6', createdAt: '2025-02-01T00:00:00.000Z' })

  db.saveUnitTypes(scenarioId, [
    {
      id: 'corioA-u1', scenarioId, name: 'Studio', nsaPerUnit: 38, targetPct: 0.25, solvedCount: 98,
      weeklyRentConservative: 460, weeklyRentAggressive: 560,
      salePriceConservative: 480000, salePriceMid: 540000, salePriceAggressive: 620000,
      opexPerUnitPerYear: 3000,
    },
    {
      id: 'corioA-u2', scenarioId, name: '1 Bedroom', nsaPerUnit: 52, targetPct: 0.50, solvedCount: 195,
      weeklyRentConservative: 515, weeklyRentAggressive: 630,
      salePriceConservative: 580000, salePriceMid: 660000, salePriceAggressive: 750000,
      opexPerUnitPerYear: 3500,
    },
    {
      id: 'corioA-u3', scenarioId, name: '2 Bedroom', nsaPerUnit: 75, targetPct: 0.19, solvedCount: 74,
      weeklyRentConservative: 600, weeklyRentAggressive: 750,
      salePriceConservative: 750000, salePriceMid: 870000, salePriceAggressive: 1000000,
      opexPerUnitPerYear: 4200,
    },
    {
      id: 'corioA-u4', scenarioId, name: '3 Bedroom', nsaPerUnit: 100, targetPct: 0.06, solvedCount: 24,
      weeklyRentConservative: 740, weeklyRentAggressive: 915,
      salePriceConservative: 1100000, salePriceMid: 1250000, salePriceAggressive: 1450000,
      opexPerUnitPerYear: 5500,
    },
  ])

  db.saveBTRAssumptions({
    scenarioId,
    vacancyPct: 0.05,
    leaseUpMonths: 12,
    managementFeePct: 0.07,
    carParkIncomeAnnual: 963900,
    buildingAdminFixed: 250000,
    childcareAnnualNet: 0,
    commercialAnnualNet: 572230,
    capRateConservative: 0.05,
    capRateAggressive: 0.05,
    devMarginPct: 0.18,
  })

  db.saveBTSAssumptions({
    scenarioId,
    sellingCostsPct: 0.025,
    childcareValuePerSqm: 10000,
    devMarginPct: 0.18,
  })

  // Scenario A converts the hotel to residential — no hotel keys in this scheme
  db.saveHotelAssumptions({
    scenarioId,
    keys: 0,
    adr: 260, occupancyPct: 0.72, otherRevenuePerKeyPerYear: 12000,
    gopMarginPct: 0.36, managementFeePct: 0.05, ffeReservePct: 0.04,
    hotelCapRate: 0.055, devMarginPct: 0.18,
  })
}

// ── HAAVN St Village Preston BTR ────────────────────────────────────────
/**
 * Complete HAAVN project seed from Design Review 2 (2026)
 * Populated with detailed cost stack line items across all 6 categories
 */
function seedHAAVN() {
  const pid = 'haavn-preston-001'
  const now = new Date().toISOString()

  // Project
  db.saveProject({
    id: pid,
    name: 'St Village Preston · BTR',
    address: '20-30 Newman Street, Preston VIC 3072',
    suburb: 'Preston',
    state: 'VIC',
    zone: 'Mixed Use',
    responsibleAuthority: 'Darebin City Council',
    status: 'active',
    type: 'btr',
    brand: 'haavn',
    createdAt: now,
    updatedAt: now,
    createdBy: 'HAAVN Dev',
  })

  // Site design (from HTML design: 46,237 sqm GBA, 22,390 sqm residential)
  db.saveSiteDesign({
    projectId: pid,
    resiNSA: 21_000,
    resiGFA: 22_390,
    resiGBA: 46_237,
    balcony: 3_850,
    basement: 12_500,
    carSpaces: 280,
    childcareGFA: 1_200,
    churchGFA: 0,
    churchNSA: 0,
    otherGFA: 850,
    notes: 'Mixed-use development: 120 residential apartments, ground-floor retail & commercial, basement car parking.',
  })

  // Land terms (from HTML design: $15M purchase, $955K stamp duty)
  db.saveLandTerms({
    projectId: pid,
    landCost: 17_870_500,
    contractPrice: 15_000_000,
    stampDuty: 955_000,
    settlementDate: '2027-03',
    legalFees: 16_500,
    otherAcquisitionCosts: 398_500,
    isInKind: false,
  })

  // Cost stack setup
  db.saveCostStack({
    projectId: pid,
    buildRatePerSqm: 3000, // HAAVN hybrid preset
    contingencyPct: 0.05,
    prelimsPct: 0.08,
    professionalFeesPct: 0.05,
    statutoryFixed: 6_800_000,
    financePct: 0.44,
    projectManagementFixed: 5_000_000,
    marketingFixed: 200_000,
    amenityFitoutFixed: 0,
    gstEnabled: true,
    currentPhase: 'acqplan',
  })

  // Detailed cost stack — populate all 6 sections with line items from design
  db.saveDetailedCostStack({
    projectId: pid,
    hardCosts: HAAVN_CONSTRUCTION,
    consultants: HAAVN_CONSULTANTS,
    statutory: HAAVN_STATUTORY,
    headworks: HAAVN_HEADWORKS,
    management: HAAVN_MANAGEMENT,
    marketing: HAAVN_MARKETING,
  })

  // Mix scenario
  const scenarioId = 'haavn-preston-mix-001'
  db.saveMixScenario({ id: scenarioId, projectId: pid, name: 'Primary Mix', createdAt: now })

  // Unit types — 120 units total
  db.saveUnitTypes(scenarioId, [
    {
      id: 'haavn-u1', scenarioId, name: 'Studio', nsaPerUnit: 38, targetPct: 0.25, solvedCount: 30,
      weeklyRentConservative: 470, weeklyRentAggressive: 520,
      salePriceConservative: 380_000, salePriceMid: 420_000, salePriceAggressive: 470_000,
      opexPerUnitPerYear: 5_200,
    },
    {
      id: 'haavn-u2', scenarioId, name: '1 Bedroom', nsaPerUnit: 56, targetPct: 0.50, solvedCount: 60,
      weeklyRentConservative: 620, weeklyRentAggressive: 680,
      salePriceConservative: 520_000, salePriceMid: 580_000, salePriceAggressive: 650_000,
      opexPerUnitPerYear: 5_200,
    },
    {
      id: 'haavn-u3', scenarioId, name: '2 Bedroom', nsaPerUnit: 75, targetPct: 0.19, solvedCount: 23,
      weeklyRentConservative: 800, weeklyRentAggressive: 880,
      salePriceConservative: 720_000, salePriceMid: 800_000, salePriceAggressive: 900_000,
      opexPerUnitPerYear: 5_200,
    },
    {
      id: 'haavn-u4', scenarioId, name: '3 Bedroom', nsaPerUnit: 100, targetPct: 0.06, solvedCount: 7,
      weeklyRentConservative: 1_100, weeklyRentAggressive: 1_200,
      salePriceConservative: 1_000_000, salePriceMid: 1_100_000, salePriceAggressive: 1_250_000,
      opexPerUnitPerYear: 5_200,
    },
  ])

  // BTR assumptions (12% cap rate assumption, 7% management, 5% vacancy)
  db.saveBTRAssumptions({
    scenarioId,
    vacancyPct: 0.05,
    leaseUpMonths: 9,
    managementFeePct: 0.07,
    carParkIncomeAnnual: 640_000, // 280 spaces @ ~$2,286/year
    buildingAdminFixed: 400_000,
    childcareAnnualNet: 180_000,
    commercialAnnualNet: 420_000,
    capRateConservative: 0.05,
    capRateAggressive: 0.06,
    devMarginPct: 0.15,
  })

  // Snapshot — preserve initial design review state
  captureSnapshot(pid, 'Design Review 2 · Complete Cost Stack Seed', now)
}
