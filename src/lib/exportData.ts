// ── Project export — data collection ─────────────────────────────────────────
// Builds structured, format-agnostic sections for any project tab/sub-tab so
// the PDF and Excel exporters can render the same content.

import * as db from '../db'
import { calculateCostStack } from '../engine/costStack'
import { calculateBTRIncome, calculateBTRValuation } from '../engine/btr'
import { calculateBTSValuation } from '../engine/bts'
import { calculateHotelIncome, calculateHotelValuation } from '../engine/hotel'
import { calculateFinance } from '../engine/finance'
import { solveUnitMix } from '../engine/unitMix'

export interface KVBlock { type: 'kv'; title?: string; rows: [string, string][] }
export interface TableBlock { type: 'table'; title?: string; headers: string[]; rows: (string | number)[][] }
export interface NoteBlock { type: 'note'; text: string }
export interface BarsBlock { type: 'bars'; title?: string; items: { label: string; value: number; color?: string }[] }
export type Block = KVBlock | TableBlock | NoteBlock | BarsBlock
export interface Section { id: string; title: string; blocks: Block[] }

export interface ExportNode {
  id: string
  label: string
  children?: ExportNode[]
}

// Tree shown in the export picker — mirrors the project tabs and sub-tabs
export const EXPORT_TREE: ExportNode[] = [
  { id: 'site', label: 'Site & Design' },
  { id: 'land', label: 'Land & Terms' },
  { id: 'mix', label: 'Product Mix' },
  {
    id: 'cost', label: 'Cost Stack', children: [
      { id: 'cost-summary', label: 'Summary' },
      { id: 'cost-hard', label: 'Hard Costs' },
      { id: 'cost-consultants', label: 'Consultants' },
      { id: 'cost-statutory', label: 'Statutory & Finance' },
      { id: 'cost-marketing', label: 'Marketing & Other' },
    ],
  },
  { id: 'finance', label: 'Finance' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'btr', label: 'BTR — Build to Rent' },
  { id: 'bts', label: 'BTS — Build to Sell' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'compare', label: 'Scenario Comparison' },
  { id: 'dashboard', label: 'Project Dashboard' },
  { id: 'summary', label: 'Executive Summary' },
]

export const ALL_EXPORT_IDS: string[] = EXPORT_TREE.flatMap(n => n.children ? n.children.map(c => c.id) : [n.id])

const $ = (n: number) => '$' + Math.round(n).toLocaleString()
const pct = (n: number, d = 1) => (n * 100).toFixed(d) + '%'
const num = (n: number) => n.toLocaleString()
const dateAU = (iso: string) => iso ? new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

// ── Shared computations ───────────────────────────────────────────────────────

function projectTdc(projectId: string, overrides?: { buildRate?: number; financePct?: number }) {
  const site = db.getSiteDesign(projectId)
  const land = db.getLandTerms(projectId)
  const costData = db.getCostStack(projectId)
  const inKindLineItem = land.isInKind && land.inKindGFA > 0
    ? { label: land.inKindLabel, gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote }
    : undefined
  return calculateCostStack({
    ...costData,
    buildRatePerSqm: overrides?.buildRate ?? costData.buildRatePerSqm,
    financePct: overrides?.financePct ?? costData.financePct,
    gba: site.resiGBA,
    inKindLineItem,
  })
}

interface CompareRow { scenario: string; type: string; noi: number | null; gav: number; tdc: number; rlv: number }

// Strategy colours — match the app's data palette (writing stays B/W, data keeps colour)
function strategyColor(type: string): string {
  if (type.startsWith('BTR')) return '#22C55E'
  if (type.startsWith('BTS')) return '#3B82F6'
  if (type.startsWith('Hotel')) return '#A855F7'
  return '#C4973A'
}

function comparisonRows(projectId: string): CompareRow[] {
  const site = db.getSiteDesign(projectId)
  const costData = db.getCostStack(projectId)
  const rows: CompareRow[] = []
  for (const s of db.getMixScenarios(projectId)) {
    const units = db.getUnitTypes(s.id)
    const btrA = db.getBTRAssumptions(s.id)
    const btsA = db.getBTSAssumptions(s.id)
    const hotelA = db.getHotelAssumptions(s.id)
    const tdc = projectTdc(projectId, { buildRate: hotelA.buildRateOverride, financePct: hotelA.constructionFinancePct }).totalDevelopmentCost

    const sr = site.resiNSA > 0 && units.length > 0
      ? solveUnitMix(site.resiNSA, units.map(u => ({ name: u.name, nsaPerUnit: u.nsaPerUnit, targetPct: u.targetPct })))
      : null
    const hasUnits = (sr ? sr.solvedUnits > 0 : units.some(u => u.solvedCount > 0))
      && units.some(u => u.weeklyRentConservative > 0 || u.salePriceConservative > 0)

    if (hasUnits) {
      const unitLines = units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, weeklyRentConservative: u.weeklyRentConservative, weeklyRentAggressive: u.weeklyRentAggressive, opexPerUnitPerYear: u.opexPerUnitPerYear }))
      const btrInputs = { unitLines, vacancyPct: btrA.vacancyPct, managementFeePct: btrA.managementFeePct, commercialIncomeLines: [], carParkIncomeAnnual: btrA.carParkIncomeAnnual, buildingAdminFixed: btrA.buildingAdminFixed }
      const consI = calculateBTRIncome(btrInputs, 'conservative')
      const aggI = calculateBTRIncome(btrInputs, 'aggressive')
      const consV = calculateBTRValuation(consI.noi, btrA.capRateConservative, tdc, btrA.devMarginPct)
      const aggV = calculateBTRValuation(aggI.noi, btrA.capRateAggressive, tdc, btrA.devMarginPct)
      rows.push({ scenario: s.name, type: 'BTR (Conservative)', noi: consI.noi, gav: consV.gav, tdc, rlv: consV.rlv })
      rows.push({ scenario: s.name, type: 'BTR (Aggressive)', noi: aggI.noi, gav: aggV.gav, tdc, rlv: aggV.rlv })

      const mkLines = (f: (u: typeof units[number]) => number) => units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, pricePerUnit: f(u) }))
      const otherRev = site.childcareGFA > 0 ? [{ label: 'Childcare', amount: site.childcareGFA * btsA.childcareValuePerSqm }] : []
      const btsCons = calculateBTSValuation(mkLines(u => u.salePriceConservative), otherRev, btsA.sellingCostsPct, tdc, btsA.devMarginPct, costData.gstEnabled)
      const btsMid = calculateBTSValuation(mkLines(u => u.salePriceMid), otherRev, btsA.sellingCostsPct, tdc, btsA.devMarginPct, costData.gstEnabled)
      const btsAgg = calculateBTSValuation(mkLines(u => u.salePriceAggressive), otherRev, btsA.sellingCostsPct, tdc, btsA.devMarginPct, costData.gstEnabled)
      rows.push({ scenario: s.name, type: 'BTS (Conservative)', noi: null, gav: btsCons.grossRevenue, tdc, rlv: btsCons.rlv })
      rows.push({ scenario: s.name, type: 'BTS (Mid)', noi: null, gav: btsMid.grossRevenue, tdc, rlv: btsMid.rlv })
      rows.push({ scenario: s.name, type: 'BTS (Aggressive)', noi: null, gav: btsAgg.grossRevenue, tdc, rlv: btsAgg.rlv })
    }

    if (hotelA.keys > 0) {
      const hotelI = calculateHotelIncome(hotelA)
      const hotelV = calculateHotelValuation(hotelI.noi, hotelA.hotelCapRate, tdc, hotelA.devMarginPct)
      rows.push({ scenario: s.name, type: 'Hotel', noi: hotelI.noi, gav: hotelV.gav, tdc, rlv: hotelV.rlv })
    }
  }
  return rows
}

// ── Section builders ──────────────────────────────────────────────────────────

function siteSection(projectId: string): Section {
  const s = db.getSiteDesign(projectId)
  const blocks: Block[] = [{
    type: 'kv', rows: [
      ['Residential NSA (sqm)', num(s.resiNSA)],
      ['Residential GFA (sqm)', num(s.resiGFA)],
      ['Residential GBA (sqm)', num(s.resiGBA)],
      ['Balcony (sqm)', num(s.balcony)],
      ['Basement (sqm)', num(s.basementTotal)],
      ['Car spaces', num(s.carSpaces)],
      ['Childcare GFA (sqm)', num(s.childcareGFA)],
      ['Church / Vendor GFA (sqm)', num(s.churchGFA)],
      ['Church / Vendor NSA (sqm)', num(s.churchNSA)],
      ['Other GFA (sqm)', num(s.otherGFA)],
      ['NSA / GFA efficiency', s.resiGFA > 0 ? pct(s.resiNSA / s.resiGFA) : '—'],
    ],
  }]
  if (s.notes) blocks.push({ type: 'note', text: `Notes: ${s.notes}` })
  return { id: 'site', title: 'Site & Design', blocks }
}

function landSection(projectId: string): Section {
  const land = db.getLandTerms(projectId)
  const acq = db.getLandAcquisition(projectId)
  const blocks: Block[] = [{
    type: 'kv', title: 'Acquisition', rows: [
      ['Purchase price' + (acq.gstCredit > 0 ? ' (inc GST)' : ''), $(acq.purchasePrice)],
      ...(acq.gstCredit > 0 ? [['Less GST input credit (1/11)', '−' + $(acq.gstCredit)] as [string, string]] : []),
      ['GST treatment', land.landGst === 'inc' ? 'GST in price — credit claimed' : 'No GST — going concern / input-taxed'],
      ['State / territory', land.state],
      ['Property type', land.propertyType.replace(/_/g, ' ')],
      ...(acq.stampDuty > 0 ? [['Stamp duty (' + land.state + ', general rate)', $(acq.stampDuty)] as [string, string]] : []),
      ...(acq.foreignSurcharge > 0 ? [['Foreign purchaser surcharge', $(acq.foreignSurcharge)] as [string, string]] : []),
      ...(acq.settlementDate ? [['Settlement (duty due)', dateAU(acq.settlementDate)] as [string, string]] : []),
      ['Land cost in feasibility', $(acq.total)],
    ],
  }]
  if (land.isInKind && land.inKindGFA > 0) {
    blocks.push({
      type: 'kv', title: `In-Kind — ${land.inKindLabel}`, rows: [
        ['Delivery GFA (sqm)', num(land.inKindGFA)],
        ['Build rate ($/sqm)', $(land.inKindRatePerSqm)],
        ['Implied in-kind cost', $(land.inKindGFA * land.inKindRatePerSqm)],
        ['Note', land.inKindNote || '—'],
      ],
    })
  }
  return { id: 'land', title: 'Land & Terms', blocks }
}

function mixSection(projectId: string): Section {
  const site = db.getSiteDesign(projectId)
  const blocks: Block[] = []
  for (const s of db.getMixScenarios(projectId)) {
    const units = db.getUnitTypes(s.id)
    if (units.length === 0) continue
    const sr = site.resiNSA > 0
      ? solveUnitMix(site.resiNSA, units.map(u => ({ name: u.name, nsaPerUnit: u.nsaPerUnit, targetPct: u.targetPct })))
      : null
    blocks.push({
      type: 'table', title: `Scenario — ${s.name}`,
      headers: ['Type', 'NSA/unit', 'Target %', 'Units', 'Rent cons ($/wk)', 'Rent agg ($/wk)', 'Price cons', 'Price mid', 'Price agg'],
      rows: units.map((u, i) => [
        u.name, num(u.nsaPerUnit), pct(u.targetPct, 0), sr?.mix[i]?.count ?? u.solvedCount ?? 0,
        num(u.weeklyRentConservative), num(u.weeklyRentAggressive),
        $(u.salePriceConservative), $(u.salePriceMid), $(u.salePriceAggressive),
      ]),
    })
  }
  if (blocks.length === 0) blocks.push({ type: 'note', text: 'No mix scenarios configured.' })
  return { id: 'mix', title: 'Product Mix', blocks }
}

function costSummarySection(projectId: string): Section {
  const costData = db.getCostStack(projectId)
  const land = db.getLandTerms(projectId)
  const r = projectTdc(projectId)
  const rows: [string, string][] = [
    ['Construction', $(r.construction)],
    [`Contingency (${pct(costData.contingencyPct, 0)})`, $(r.contingency)],
    [`Prelims (${pct(costData.prelimsPct, 0)})`, $(r.prelims)],
    [`Professional fees (${pct(costData.professionalFeesPct, 0)})`, $(r.professionalFees)],
    ['Statutory & council', $(costData.statutoryFixed)],
    [`Finance (${pct(costData.financePct, 0)})`, $(r.finance)],
    ['Project management', $(costData.projectManagementFixed)],
    ['Marketing', $(costData.marketingFixed)],
    ['BTR amenity fitout', $(costData.amenityFitoutFixed)],
  ]
  if (land.isInKind && r.inKindCost > 0) rows.push([`In-kind (${land.inKindLabel})`, $(r.inKindCost)])
  if (r.gstCredits > 0) rows.push(['Less GST input credits (1/11)', '−' + $(r.gstCredits)])
  rows.push([`Total Development Cost${r.gstCredits > 0 ? ' (ex GST)' : ''}`, $(r.totalDevelopmentCost)])
  const bars: Block = {
    type: 'bars', title: 'Cost Composition', items: ([
      { label: 'Construction', value: r.construction },
      { label: 'Contingency', value: r.contingency },
      { label: 'Prelims', value: r.prelims },
      { label: 'Professional fees', value: r.professionalFees },
      { label: 'Statutory & council', value: costData.statutoryFixed },
      { label: 'Finance', value: r.finance },
      { label: 'Project management', value: costData.projectManagementFixed },
      { label: 'Marketing', value: costData.marketingFixed },
      { label: 'Amenity fitout', value: costData.amenityFitoutFixed },
      ...(r.inKindCost > 0 ? [{ label: 'In-kind', value: r.inKindCost }] : []),
    ] as { label: string; value: number }[]).filter(i => i.value > 0).map(i => ({ ...i, color: '#C4973A' })),
  }
  return { id: 'cost-summary', title: 'Cost Stack — Summary', blocks: [{ type: 'kv', rows }, bars] }
}

function costDetailSection(projectId: string, key: 'hardCosts' | 'consultants' | 'statutory' | 'marketing', id: string, title: string): Section {
  const detailed = db.getDetailedCostStack(projectId)
  const items = detailed[key]
  const total = items.reduce((s, i) => s + i.amount, 0)
  return {
    id, title, blocks: [{
      type: 'table',
      headers: ['Item', 'Amount', 'Notes'],
      rows: [
        ...items.map(i => [i.label, $(i.amount), i.notes || ''] as (string | number)[]),
        ['TOTAL', $(total), ''],
      ],
    }],
  }
}

function financeSection(projectId: string): Section {
  const fa = db.getFinanceAssumptions(projectId)
  const tdc = projectTdc(projectId).totalDevelopmentCost
  const landCost = db.getEffectiveLandCost(projectId)
  const rows = comparisonRows(projectId)
  const gav = rows.length > 0 ? Math.max(...rows.map(r => r.gav)) : 0
  const result = calculateFinance(fa, tdc, landCost, gav)
  return {
    id: 'finance', title: 'Finance', blocks: [
      {
        type: 'kv', title: 'Assumptions', rows: [
          ['BBSY / base rate', pct(fa.bbsyRate, 2)],
          ['Land LVR', pct(fa.landLvr, 0)],
          ['Land interest rate', pct(fa.landInterestRate, 2)],
          ['Land carry (months)', num(fa.landCarryMonths)],
          ['Construction period (months)', num(fa.constructionMonths)],
          ['Equity hurdle (target IRR)', pct(fa.equityHurdleRate, 0)],
        ],
      },
      {
        type: 'table', title: 'Debt Tranches',
        headers: ['Tranche', 'Type', 'Facility', 'Rate', 'Interest', 'Fees', 'Total Cost'],
        rows: result.tranches.filter(t => t.facilityAmount > 0).map(t => [
          t.label, t.type, $(t.facilityAmount), pct(t.effectiveRate, 2), $(t.interestCost),
          $(t.establishmentFee + t.lineFee + t.exitFee), $(t.totalCost),
        ]),
      },
      {
        type: 'kv', title: 'Capital Stack & Cost', rows: [
          ['Total development cost', $(tdc)],
          ['Land cost (ex GST + duty)', $(landCost)],
          ['Total debt', $(result.totalDebt)],
          ['Common equity required', $(result.totalEquity)],
          ['Equity % of TDC', pct(result.equityPct, 1)],
          ['Land debt', $(result.landDebt)],
          ['Land interest cost', $(result.landInterestCost)],
          ['Construction interest', $(result.constructionInterestCost)],
          ['All-in finance cost', $(result.totalFinanceCost)],
          ['Finance % of TDC', pct(result.financePctOfTDC, 2)],
        ],
      },
      {
        type: 'table', title: 'Timeline Sensitivity',
        headers: ['Scenario', 'Extra Interest', 'Total Finance Cost', 'Profit Impact'],
        rows: [result.base, result.blowout3m, result.blowout6m, result.blowout12m].map(sc => [
          sc.label, $(sc.extraInterest), $(sc.totalFinanceCost), $(sc.profitImpact),
        ]),
      },
    ],
  }
}

function timelineSection(projectId: string): Section {
  const tasks = db.getTimelineTasks(projectId)
  if (tasks.length === 0) return { id: 'timeline', title: 'Timeline', blocks: [{ type: 'note', text: 'No timeline tasks configured.' }] }
  return {
    id: 'timeline', title: 'Timeline', blocks: [{
      type: 'table',
      headers: ['Task', 'Category', 'Assignee', 'Start', 'End', 'Status', 'Progress'],
      rows: tasks.map(t => [
        (t.isMilestone ? '◆ ' : '') + t.name, t.category, t.assignee,
        dateAU(t.startDate), dateAU(t.endDate), t.status, `${t.progress}%`,
      ]),
    }],
  }
}

function btrSection(projectId: string): Section {
  const site = db.getSiteDesign(projectId)
  const blocks: Block[] = []
  for (const s of db.getMixScenarios(projectId)) {
    const units = db.getUnitTypes(s.id)
    const a = db.getBTRAssumptions(s.id)
    if (units.length === 0) continue
    const sr = site.resiNSA > 0 ? solveUnitMix(site.resiNSA, units.map(u => ({ name: u.name, nsaPerUnit: u.nsaPerUnit, targetPct: u.targetPct }))) : null
    const unitLines = units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, weeklyRentConservative: u.weeklyRentConservative, weeklyRentAggressive: u.weeklyRentAggressive, opexPerUnitPerYear: u.opexPerUnitPerYear }))
    const inputs = { unitLines, vacancyPct: a.vacancyPct, managementFeePct: a.managementFeePct, commercialIncomeLines: [], carParkIncomeAnnual: a.carParkIncomeAnnual, buildingAdminFixed: a.buildingAdminFixed }
    const tdc = projectTdc(projectId).totalDevelopmentCost
    const consI = calculateBTRIncome(inputs, 'conservative')
    const aggI = calculateBTRIncome(inputs, 'aggressive')
    const consV = calculateBTRValuation(consI.noi, a.capRateConservative, tdc, a.devMarginPct)
    const aggV = calculateBTRValuation(aggI.noi, a.capRateAggressive, tdc, a.devMarginPct)
    blocks.push({
      type: 'table', title: `Scenario — ${s.name}`,
      headers: ['Metric', 'Conservative', 'Aggressive'],
      rows: [
        ['Gross annual rent', $(consI.grossAnnualRent), $(aggI.grossAnnualRent)],
        [`Vacancy (${pct(a.vacancyPct, 0)})`, '−' + $(consI.vacancyLoss), '−' + $(aggI.vacancyLoss)],
        [`Management (${pct(a.managementFeePct, 0)})`, '−' + $(consI.managementFee), '−' + $(aggI.managementFee)],
        ['Car park income', $(a.carParkIncomeAnnual), $(a.carParkIncomeAnnual)],
        ['Opex + building admin', '−' + $(consI.opex), '−' + $(aggI.opex)],
        ['NOI', $(consI.noi), $(aggI.noi)],
        ['Cap rate', pct(a.capRateConservative, 2), pct(a.capRateAggressive, 2)],
        ['GAV', $(consV.gav), $(aggV.gav)],
        ['RLV', $(consV.rlv), $(aggV.rlv)],
      ],
    })
  }
  if (blocks.length === 0) blocks.push({ type: 'note', text: 'No BTR scenarios configured.' })
  return { id: 'btr', title: 'BTR — Build to Rent', blocks }
}

function btsSection(projectId: string): Section {
  const site = db.getSiteDesign(projectId)
  const costData = db.getCostStack(projectId)
  const blocks: Block[] = []
  for (const s of db.getMixScenarios(projectId)) {
    const units = db.getUnitTypes(s.id)
    const a = db.getBTSAssumptions(s.id)
    if (units.length === 0) continue
    const sr = site.resiNSA > 0 ? solveUnitMix(site.resiNSA, units.map(u => ({ name: u.name, nsaPerUnit: u.nsaPerUnit, targetPct: u.targetPct }))) : null
    const tdc = projectTdc(projectId).totalDevelopmentCost
    const mkLines = (f: (u: typeof units[number]) => number) => units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, pricePerUnit: f(u) }))
    const otherRev = site.childcareGFA > 0 ? [{ label: 'Childcare (commercial)', amount: site.childcareGFA * a.childcareValuePerSqm }] : []
    const cons = calculateBTSValuation(mkLines(u => u.salePriceConservative), otherRev, a.sellingCostsPct, tdc, a.devMarginPct, costData.gstEnabled)
    const mid = calculateBTSValuation(mkLines(u => u.salePriceMid), otherRev, a.sellingCostsPct, tdc, a.devMarginPct, costData.gstEnabled)
    const agg = calculateBTSValuation(mkLines(u => u.salePriceAggressive), otherRev, a.sellingCostsPct, tdc, a.devMarginPct, costData.gstEnabled)
    blocks.push({
      type: 'table', title: `Scenario — ${s.name} (selling costs ${pct(a.sellingCostsPct, 1)}, margin ${pct(a.devMarginPct, 0)})`,
      headers: ['Metric', 'Conservative', 'Mid', 'Aggressive'],
      rows: [
        ['Gross revenue', $(cons.grossRevenue), $(mid.grossRevenue), $(agg.grossRevenue)],
        ...(costData.gstEnabled ? [['Less GST on sales (1/11)', '−' + $(cons.gstOnSales), '−' + $(mid.gstOnSales), '−' + $(agg.gstOnSales)] as (string | number)[]] : []),
        ['Net revenue', $(cons.netRevenue), $(mid.netRevenue), $(agg.netRevenue)],
        ['TDC', $(tdc), $(tdc), $(tdc)],
        ['RLV', $(cons.rlv), $(mid.rlv), $(agg.rlv)],
      ] as (string | number)[][],
    })
  }
  if (blocks.length === 0) blocks.push({ type: 'note', text: 'No BTS scenarios configured.' })
  return { id: 'bts', title: 'BTS — Build to Sell', blocks }
}

function hotelSection(projectId: string): Section {
  const blocks: Block[] = []
  for (const s of db.getMixScenarios(projectId)) {
    const a = db.getHotelAssumptions(s.id)
    if (a.keys <= 0) continue
    const tdc = projectTdc(projectId, { buildRate: a.buildRateOverride, financePct: a.constructionFinancePct }).totalDevelopmentCost
    const inc = calculateHotelIncome(a)
    const val = calculateHotelValuation(inc.noi, a.hotelCapRate, tdc, a.devMarginPct)
    blocks.push({
      type: 'kv', title: `Scenario — ${s.name}`, rows: [
        ['Keys', num(a.keys)],
        ['ADR', $(a.adr)],
        ['Occupancy', pct(a.occupancyPct, 0)],
        ['RevPAR', $(inc.revpar)],
        ['Room revenue (annual)', $(inc.roomRevenue)],
        ['Other revenue (annual)', $(inc.otherRevenue)],
        ['Total revenue', $(inc.totalRevenue)],
        [`GOP (${pct(a.gopMarginPct, 0)})`, $(inc.gop)],
        ['Management fee', '−' + $(inc.managementFee)],
        ['FF&E reserve', '−' + $(inc.ffeReserve)],
        ['NOI', $(inc.noi)],
        ['Cap rate', pct(a.hotelCapRate, 2)],
        ['GAV', $(val.gav)],
        ['TDC' + (a.buildRateOverride != null ? ` (modular $${a.buildRateOverride.toLocaleString()}/sqm)` : ''), $(tdc)],
        ['RLV', $(val.rlv)],
      ],
    })
  }
  if (blocks.length === 0) blocks.push({ type: 'note', text: 'No hotel scenarios configured (0 keys).' })
  return { id: 'hotel', title: 'Hotel', blocks }
}

function compareSection(projectId: string): Section {
  const rows = comparisonRows(projectId)
  if (rows.length === 0) return { id: 'compare', title: 'Scenario Comparison', blocks: [{ type: 'note', text: 'No scenarios available to compare.' }] }
  const best = Math.max(...rows.map(r => r.rlv))
  return {
    id: 'compare', title: 'Scenario Comparison', blocks: [{
      type: 'table',
      headers: ['Scenario', 'Strategy', 'NOI', 'GAV / Revenue', 'TDC', 'RLV', ''],
      rows: rows.map(r => [
        r.scenario, r.type, r.noi != null ? $(r.noi) : '—', $(r.gav), $(r.tdc), $(r.rlv),
        r.rlv === best && best > 0 ? '★ BEST' : '',
      ]),
    }, {
      type: 'bars', title: 'Residual Land Value by Strategy',
      items: rows.map(r => ({ label: `${r.scenario} — ${r.type}`, value: r.rlv, color: strategyColor(r.type) })),
    }],
  }
}

function dashboardSection(projectId: string): Section {
  const cost = projectTdc(projectId)
  const landCost = db.getEffectiveLandCost(projectId)
  const rows = comparisonRows(projectId)
  const best = rows.length > 0 ? rows.reduce((a, b) => (b.rlv > a.rlv ? b : a)) : null
  const softCosts = cost.contingency + cost.prelims + cost.professionalFees
  const fixedCosts = cost.subtotal - cost.construction - cost.contingency - cost.prelims - cost.professionalFees - cost.finance
  const blocks: Block[] = [
    {
      type: 'kv', title: 'Key Metrics', rows: [
        ['Total development cost' + (cost.gstCredits > 0 ? ' (ex GST)' : ''), $(cost.totalDevelopmentCost)],
        ['Land & acquisition (ex GST + duty)', $(landCost)],
        ...(best ? [
          ['Best strategy', `${best.type} — ${best.scenario}`] as [string, string],
          ['Best GAV / revenue', $(best.gav)] as [string, string],
          ['Best RLV', $(best.rlv)] as [string, string],
          ['Value created (RLV − land)', $(Math.max(0, best.rlv - landCost))] as [string, string],
        ] : []),
      ],
    },
    {
      type: 'bars', title: 'Capital Deployment', items: [
        { label: 'Land & acquisition', value: landCost, color: '#C4973A' },
        { label: 'Construction', value: cost.construction, color: '#1A1A1A' },
        { label: 'Soft costs', value: softCosts, color: '#666666' },
        { label: 'Fixed & statutory', value: fixedCosts, color: '#999999' },
        { label: 'Finance', value: cost.finance, color: '#8A6A10' },
        ...(cost.inKindCost > 0 ? [{ label: 'In-kind', value: cost.inKindCost, color: '#7A4AAA' }] : []),
      ].filter(i => i.value > 0),
    },
  ]
  if (rows.length > 0) {
    blocks.push({
      type: 'bars', title: 'Strategy Outcomes — RLV',
      items: rows.map(r => ({ label: `${r.scenario} — ${r.type}`, value: r.rlv, color: strategyColor(r.type) })),
    })
  }
  return { id: 'dashboard', title: 'Project Dashboard', blocks }
}

function summarySection(projectId: string): Section {
  const project = db.getProject(projectId)
  const acq = db.getLandAcquisition(projectId)
  const cost = projectTdc(projectId)
  const rows = comparisonRows(projectId)
  const best = rows.length > 0 ? rows.reduce((a, b) => (b.rlv > a.rlv ? b : a)) : null
  const blocks: Block[] = [
    {
      type: 'kv', rows: [
        ['Project', project?.name ?? ''],
        ['Address', project?.address ?? ''],
        ['Status', project?.status ?? ''],
        ['Land cost in feasibility', $(acq.total)],
        ...(acq.stampDuty > 0 ? [['— incl. stamp duty', $(acq.stampDuty + acq.foreignSurcharge)] as [string, string]] : []),
        ['Total development cost', $(cost.totalDevelopmentCost)],
        ...(cost.gstCredits > 0 ? [['— GST credits recovered', $(cost.gstCredits)] as [string, string]] : []),
        ...(best ? [
          ['Best outcome', `${best.type} — ${best.scenario}`] as [string, string],
          ['Best GAV / revenue', $(best.gav)] as [string, string],
          ['Best RLV', $(best.rlv)] as [string, string],
        ] : []),
      ],
    },
  ]
  return { id: 'summary', title: 'Executive Summary', blocks }
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function buildExportSections(projectId: string, selectedIds: string[]): Section[] {
  const sections: Section[] = []
  const has = (id: string) => selectedIds.includes(id)
  if (has('summary')) sections.push(summarySection(projectId))
  if (has('site')) sections.push(siteSection(projectId))
  if (has('land')) sections.push(landSection(projectId))
  if (has('mix')) sections.push(mixSection(projectId))
  if (has('cost-summary')) sections.push(costSummarySection(projectId))
  if (has('cost-hard')) sections.push(costDetailSection(projectId, 'hardCosts', 'cost-hard', 'Cost Stack — Hard Costs'))
  if (has('cost-consultants')) sections.push(costDetailSection(projectId, 'consultants', 'cost-consultants', 'Cost Stack — Consultants'))
  if (has('cost-statutory')) sections.push(costDetailSection(projectId, 'statutory', 'cost-statutory', 'Cost Stack — Statutory & Finance'))
  if (has('cost-marketing')) sections.push(costDetailSection(projectId, 'marketing', 'cost-marketing', 'Cost Stack — Marketing & Other'))
  if (has('finance')) sections.push(financeSection(projectId))
  if (has('timeline')) sections.push(timelineSection(projectId))
  if (has('btr')) sections.push(btrSection(projectId))
  if (has('bts')) sections.push(btsSection(projectId))
  if (has('hotel')) sections.push(hotelSection(projectId))
  if (has('compare')) sections.push(compareSection(projectId))
  if (has('dashboard')) sections.push(dashboardSection(projectId))
  return sections
}
