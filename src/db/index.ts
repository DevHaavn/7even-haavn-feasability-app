import type { Project, SiteDesign, LandTerms, MixScenario, UnitType, CostStack, BTRAssumptions, BTSAssumptions, HotelAssumptions, CostPreset, BenchmarkSet, FinanceAssumptions, DebtTranche } from './schema'
import * as cloud from './cloud'
import { exGst } from '../engine/gst'
import { defaultCashflowState } from '../engine/cashflow'
import { calculateStampDuty } from '../engine/stampDuty'
import { computeLandCost } from '../engine/landCost'
import { calculateHotelIncome, calculateHotelValuation } from '../engine/hotel'
import { calculateBTRIncome, calculateBTRValuation } from '../engine/btr'
import { calculateBTSValuation } from '../engine/bts'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

// ── Projects ──────────────────────────────────────────────────────────────────

export function getProjects(): Project[] {
  return load<Project[]>('projects', [])
}

export function getProject(id: string): Project | undefined {
  return getProjects().find(p => p.id === id)
}

export function saveProject(project: Project) {
  const updated = { ...project, updatedAt: new Date().toISOString() }
  const all = getProjects().filter(p => p.id !== project.id)
  save('projects', [...all, updated])
  cloud.pushProject(updated as unknown as Record<string, unknown>)
}

export function deleteProject(id: string) {
  save('projects', getProjects().filter(p => p.id !== id))
  cloud.deleteCloudProject(id)
  resetProjectData(id)
}

// Wipe all data for a project but keep the project record itself
export function resetProjectData(id: string) {
  localStorage.removeItem(`site:${id}`)
  localStorage.removeItem(`land:${id}`)
  localStorage.removeItem(`coststack:${id}`)
  localStorage.removeItem(`detailed-costs:${id}`)
  localStorage.removeItem(`finance:${id}`)
  localStorage.removeItem(`timeline:${id}`)
  getMixScenarios(id).forEach(s => deleteMixScenario(s.id, id))
  save(`scenarios:${id}`, [])
}

// ── Site & Design ─────────────────────────────────────────────────────────────

export function getSiteDesign(projectId: string): SiteDesign {
  return load<SiteDesign>(`site:${projectId}`, {
    projectId, resiNSA: 0, resiGFA: 0, resiGBA: 0, balcony: 0,
    basementTotal: 0, carSpaces: 0, childcareGFA: 0, churchGFA: 0,
    churchNSA: 0, otherGFA: 0, notes: '',
  })
}

export function saveSiteDesign(data: SiteDesign) {
  save(`site:${data.projectId}`, data)
  cloud.pushProjectField(data.projectId, 'site', data)
  touchProject(data.projectId)
}

// ── Land Terms ────────────────────────────────────────────────────────────────

const LAND_DEFAULTS: Omit<LandTerms, 'projectId'> = {
  landCost: 0, isInKind: false, inKindLabel: '',
  inKindGFA: 0, inKindRatePerSqm: 3800, inKindNote: 'no debt, no finance, no holding cost',
  state: 'VIC', propertyType: 'vacant_land', foreignBuyer: false,
  applyStampDuty: true, settlementDate: '', landGst: 'inc',
}

function defaultAcquisitionCosts(): import('./schema').AcquisitionCost[] {
  return [
    { id: generateId(), label: 'Acquisition Fee / Commission', mode: 'pct', pct: 0, phase: 'pre-acquisition' },
    { id: generateId(), label: 'Legals', mode: 'fixed', amount: 0, phase: 'pre-acquisition' },
    { id: generateId(), label: 'Accounting', mode: 'fixed', amount: 0, phase: 'pre-acquisition' },
    { id: generateId(), label: 'Due Diligence Costs', mode: 'pct', pct: 0, phase: 'pre-acquisition' },
  ]
}

export function getLandTerms(projectId: string): LandTerms {
  // Merge defaults under stored data so rows saved before the stamp duty
  // fields existed pick up sensible values
  const stored = load<Partial<LandTerms>>(`land:${projectId}`, {})
  const lt = { ...LAND_DEFAULTS, projectId, ...stored }
  // Backfill acquisition costs for projects saved before they existed.
  if (!lt.acquisitionCosts) lt.acquisitionCosts = defaultAcquisitionCosts()
  return lt
}

export function saveLandTerms(data: LandTerms) {
  save(`land:${data.projectId}`, data)
  cloud.pushProjectField(data.projectId, 'land', data)
  touchProject(data.projectId)
}

export interface LandAcquisition {
  purchasePrice: number     // contract price as entered (GST-inclusive)
  gstCredit: number         // 1/11 input credit when the project applies GST
  exGstPrice: number        // price net of the GST credit
  stampDuty: number         // duty on the contract price (general/entity rate)
  foreignSurcharge: number  // foreign purchaser surcharge, if flagged
  total: number             // ex-GST price + duty + surcharge — what the deal carries
  settlementDate: string    // duty due at settlement
  notes: string[]
}

/** Full land acquisition breakdown. Duty is assessed on the contract price;
 *  when the deal carries GST ('inc') the 1/11 credit comes back, so the deal
 *  carries the ex-GST price plus duty. Deals without GST (input-taxed
 *  residential, going concern) get no credit. */
export function getLandAcquisition(projectId: string): LandAcquisition {
  const land = getLandTerms(projectId)
  // Compose via the effective-land-cost engine so the deal STRUCTURE (deferred
  // interest / option holding / adjustments / rebate) flows into the one number.
  const b = computeLandCost(land, getCostStack(projectId).gstEnabled)
  return {
    purchasePrice: b.price,
    gstCredit: b.gstCredit,
    exGstPrice: b.price - b.gstCredit,
    stampDuty: b.stampDuty,
    foreignSurcharge: b.foreignSurcharge,
    total: b.total,
    settlementDate: b.settlementDate,
    notes: [...b.dutyNotes, ...b.flags],
  }
}

/** Land cost used in calculations — ex-GST contract price plus stamp duty
 *  (debt sizing, carry, totals all carry the full acquisition cost). */
export function getEffectiveLandCost(projectId: string): number {
  return getLandAcquisition(projectId).total
}

// ── Mix Scenarios ─────────────────────────────────────────────────────────────

export function getMixScenarios(projectId: string): MixScenario[] {
  return load<MixScenario[]>(`scenarios:${projectId}`, [])
}

export function saveMixScenario(scenario: MixScenario) {
  const all = getMixScenarios(scenario.projectId).filter(s => s.id !== scenario.id)
  save(`scenarios:${scenario.projectId}`, [...all, scenario])
  cloud.pushScenario(scenario as unknown as Record<string, unknown>)
  touchProject(scenario.projectId)
}

export function deleteMixScenario(id: string, projectId: string) {
  const scenarios = getMixScenarios(projectId)
  const updated = scenarios.filter(s => s.id !== id)
  save(`scenarios:${projectId}`, updated)
  cloud.deleteCloudScenario(id)
  localStorage.removeItem(`units:${id}`)
  localStorage.removeItem(`btr:${id}`)
  localStorage.removeItem(`bts:${id}`)
  localStorage.removeItem(`hotel:${id}`)
}

// ── Unit Types ────────────────────────────────────────────────────────────────

export function getUnitTypes(scenarioId: string): UnitType[] {
  return load<UnitType[]>(`units:${scenarioId}`, [])
}

export function saveUnitTypes(scenarioId: string, units: UnitType[]) {
  save(`units:${scenarioId}`, units)
  cloud.pushScenarioField(scenarioId, 'unit_types', units)
}

// ── Cost Stack ────────────────────────────────────────────────────────────────

// Raw summary cost stack — no cross-links. Used internally to break the cycle
// with getDetailedCostStack (which needs the build rate to derive % fees).
function costStackRaw(projectId: string): CostStack {
  const cs = load<CostStack>(`coststack:${projectId}`, {
    projectId,
    buildRatePerSqm: 3500,
    contingencyPct: 0.05,
    prelimsPct: 0.08,
    professionalFeesPct: 0.07,
    statutoryFixed: 1_400_000,
    financePct: 0.09,
    projectManagementFixed: 2_800_000,
    marketingFixed: 2_000_000,
    amenityFitoutFixed: 600_000,
    gstEnabled: true,
  })
  // Rows saved before the GST field existed default to GST on
  return { ...cs, gstEnabled: cs.gstEnabled !== false }
}

export function getCostStack(projectId: string): CostStack {
  const cs = costStackRaw(projectId)
  // Hybrid feasibility — when the CFO itemises a Cost Stack section, its total is
  // the source of truth and overrides the top-down figure; otherwise the summary
  // value holds. This flows through calculateCostStack → TDC → RLV everywhere.
  const d = getDetailedCostStack(projectId)
  const sum = (arr: { amount: number }[]) => arr.reduce((s, x) => s + (x.amount || 0), 0)
  const hard = sum(d.hardCosts)
  const cons = sum(d.consultants)
  const statHead = sum(d.statutory) + sum(d.headworks)
  const mgmt = sum(d.management)
  const mkt = sum(d.marketing)
  return {
    ...cs,
    constructionOverride: hard > 0 ? hard : undefined,
    professionalFeesOverride: cons > 0 ? cons : undefined,
    statutoryFixed: statHead > 0 ? statHead : cs.statutoryFixed,
    projectManagementFixed: mgmt > 0 ? mgmt : cs.projectManagementFixed,
    marketingFixed: mkt > 0 ? mkt : cs.marketingFixed,
  }
}

export function saveCostStack(data: CostStack) {
  // Strip the read-time itemised overrides so only the top-down summary persists.
  const { constructionOverride: _c, professionalFeesOverride: _p, ...raw } = data
  save(`coststack:${data.projectId}`, raw)
  cloud.pushProjectField(data.projectId, 'cost_stack', raw)
  touchProject(data.projectId)
}

// ── BTR Assumptions ───────────────────────────────────────────────────────────

export function getBTRAssumptions(scenarioId: string): BTRAssumptions {
  return load<BTRAssumptions>(`btr:${scenarioId}`, {
    scenarioId,
    vacancyPct: 0.05,
    managementFeePct: 0.07,
    carParkIncomeAnnual: 0,
    buildingAdminFixed: 0,
    childcareAnnualNet: 0,
    commercialAnnualNet: 0,
    capRateConservative: 0.055,
    capRateAggressive: 0.052,
    devMarginPct: 0.18,
  })
}

export function saveBTRAssumptions(data: BTRAssumptions) {
  save(`btr:${data.scenarioId}`, data)
  cloud.pushScenarioField(data.scenarioId, 'btr', data)
}

// ── BTS Assumptions ───────────────────────────────────────────────────────────

export function getBTSAssumptions(scenarioId: string): BTSAssumptions {
  return load<BTSAssumptions>(`bts:${scenarioId}`, {
    scenarioId,
    sellingCostsPct: 0.025,
    childcareValuePerSqm: 6000,
    devMarginPct: 0.18,
  })
}

export function saveBTSAssumptions(data: BTSAssumptions) {
  save(`bts:${data.scenarioId}`, data)
  cloud.pushScenarioField(data.scenarioId, 'bts', data)
}

// ── Hotel Assumptions ─────────────────────────────────────────────────────────

export function getHotelAssumptions(scenarioId: string): HotelAssumptions {
  return load<HotelAssumptions>(`hotel:${scenarioId}`, {
    scenarioId,
    keys: 100,
    adr: 200,
    occupancyPct: 0.72,
    otherRevenuePerKeyPerYear: 8000,
    gopMarginPct: 0.35,
    managementFeePct: 0.05,
    ffeReservePct: 0.04,
    hotelCapRate: 0.065,
    devMarginPct: 0.18,
  })
}

export function saveHotelAssumptions(data: HotelAssumptions) {
  save(`hotel:${data.scenarioId}`, data)
  cloud.pushScenarioField(data.scenarioId, 'hotel', data)
}

// ── Timeline ──────────────────────────────────────────────────────────────────

export function getTimelineTasks(projectId: string): import('./schema').TimelineTask[] {
  return load(`timeline:${projectId}`, [])
}

export function saveTimelineTasks(projectId: string, tasks: import('./schema').TimelineTask[]) {
  save(`timeline:${projectId}`, tasks)
  cloud.pushProjectField(projectId, 'timeline', tasks)
}

// ── Cost Presets ──────────────────────────────────────────────────────────────

// JW: build-rate presets by building type — indicative $/sqm on GFA. Regional
// loading is layered on top separately (kept as standard constant rates here).
export function getCostPresets(): CostPreset[] {
  return load<CostPreset[]>('costpresets_v2', [
    { id: 'resi', name: 'Residential $4,000', buildRatePerSqm: 4000, description: 'Apartments / mixed-use residential (GFA)' },
    { id: 'commercial', name: 'Commercial $3,500', buildRatePerSqm: 3500, description: 'Office / commercial (GFA)' },
    { id: 'retail', name: 'Retail $2,800', buildRatePerSqm: 2800, description: 'Ground-floor retail / F&B (GFA)' },
    { id: 'pbsa', name: 'PBSA $3,600', buildRatePerSqm: 3600, description: 'Purpose-built student accommodation (GFA)' },
    { id: 'hotel', name: 'Hotel 5★ $6,000', buildRatePerSqm: 6000, description: 'Full-service 5-star hotel (GFA)' },
    { id: 'hybrid', name: 'HAAVN Hybrid $3,000', buildRatePerSqm: 3000, description: 'HAAVN precision hybrid method' },
  ])
}

export function saveCostPreset(preset: CostPreset) {
  const all = getCostPresets().filter(p => p.id !== preset.id)
  save('costpresets', [...all, preset])
}

// ── Benchmark Sets ────────────────────────────────────────────────────────────

export function getBenchmarkSets(): BenchmarkSet[] {
  return load<BenchmarkSet[]>('benchmarks', [])
}

export function saveBenchmarkSet(b: BenchmarkSet) {
  const all = getBenchmarkSets().filter(x => x.id !== b.id)
  save('benchmarks', [...all, b])
}

export function deleteBenchmarkSet(id: string) {
  save('benchmarks', getBenchmarkSets().filter(b => b.id !== id))
}

// ── Detailed Cost Stack ───────────────────────────────────────────────────────

function li(label: string): import('./schema').CostLineItem {
  return { id: Math.random().toString(36).slice(2), label, amount: 0, notes: '' }
}

// ── CFO master cost schedule (2026) ───────────────────────────────────────────
// Authoritative line-item labels per Cost Stack section. The migration below
// rewrites every project's sections to match these, zeroed, so the CFO/DM build
// budgets from a clean slate.
export const COST_STACK_LABELS: Record<'hardCosts' | 'consultants' | 'statutory' | 'headworks' | 'management' | 'marketing', string[]> = {
  hardCosts: [
    'Construction Costs | Basement (s)',
    'Construction Costs | Apartment',
    'Construction Costs | Cold Shell',
    'Construction Costs | Common Area',
    'Construction Costs | Ammenities',
    'Construction Costs | Balconies',
    'Construction Costs | External Works',
    'Construction Costs | Commercial Fit Out',
    'Demolition | Temporary Works',
    'Demolition | Hard Works',
    'Contingency',
  ],
  consultants: [
    'Acoustic Engineer | Planning',
    'Acoustic Engineer | Schematic',
    'Acoustic Engineer | Construction',
    'Arborist | Planning',
    'Arborist | Project Arobrist',
    'Architect | Feasibility DPO',
    'Architect | Master Planning DPO',
    'Architect | Feasibility Permit',
    'Architect | Master Planning Permit',
    'Architect | 50% Sketch Design - Planning Lodgment',
    'Architect | 100% Sketch Design – Balance',
    'Architect | 50% Design Development - Marketing/GMP',
    'Architect | 100% Design Development - Tender',
    'Architect | Construction Documentation',
    'Architect | Construction Services',
    'Audio Visual | Schematic',
    'Audio Visual | Construction drawings',
    'BIM | Management | Design Stage',
    'BIM | Management | Construction Stage',
    'Building Surveyor | BCA Review',
    'Building Surveyor | Construction',
    'Services and Infrastructure Report | Town Planning',
    'Flooding and Stormwater Management Plan | Town Planning',
    'Civil Eng | Design Development',
    'Civil Eng | Construction Drawings',
    'Cultural Heritage | CHMP',
    'Cultural Heritage | Project CH Review',
    'DDA | Town Plannng',
    'DDA | Design Development',
    'Demolition | Permit and Documents',
    'Enviromental',
    'End of Trip | Scope',
    'End of Trip | Documentation',
    'ESD | Town Planning',
    'ESD | JV3 Green Star',
    'Facade Eng | Town Planning',
    'Facade Eng| Design Development',
    'Facade Eng | Construction Drawings',
    'Fire Engineering | Schematic',
    'Fire Engineering | FEB',
    'Fire Engineering | FER',
    'Fire Engineering | Construction',
    'Geotechnical Engineer | Report',
    'Geotechnical Engineer | Acid Sulphate',
    'Heritage | Town Planning',
    'Heritage | Design Development',
    'Heritage | Construction Services',
    'Housing Diversity Report',
    'Hotel Management | Feasability',
    'Hotel Management | Operator Selection',
    'Intergrated Comms | Schematic',
    'Intergrated Comms | Design development',
    'Intergrated Comms | Construction',
    'Interior Design | Schematic',
    'Interior Design | Marketing',
    'Interior Design | Design Development',
    'Interior Design | Construction',
    'Investigations | HAZMAT testing',
    'Land Surveyor | Feature & Level Survey',
    'Land Surveyor | Title Re-establishment Survey',
    'Land Surveyor | Plan of Subdivision',
    'Land Surveyor | Subdivision Certification Process',
    'Landscape | DPO',
    'Landscape | Town Planning Submissiom',
    'Landscape | Design Development',
    'Landscape | Contract Documentation',
    'Landscape | Construction Services',
    'Landscape | Defect Liability Period',
    'Legal | Head Contracts',
    'Legal | Sales Contract',
    'Project Management | Design Stage',
    'Project Management | Construction',
    'Quanitiy Surveyor | initial Report',
    'Quanitiy Surveyor | Monthly Claims',
    'Security | Scope',
    'Security | Documentation',
    'Specialist Lighting | Schematic',
    'Specialist Lighting | Design Development',
    'Specialist Engineer | FP 1.4',
    'Specialist Engineer | Zero Fall',
    'Specialist Engineer | Threshold',
    'Seismic | Report',
    'Service Diversion | Design',
    'Service Diversion | Construction Services',
    'Services | Schematic',
    'Services | Design Development',
    'Services | Construction Drawings',
    'Services | Construction Services',
    'Structural Eng | Schematic',
    'Structural Eng | Design Development',
    'Structural Eng | Construction Drawings',
    'Structural Eng | Construction Services',
    'Superintendent | Monthly Reporting',
    'Technology | Program Writing',
    'Temporary Works Engineering',
    'Town Planner | Strategy & Approval Process',
    'Town Planner | Project Team Appointment & Design Inputs',
    'Town Planner | DFP Engagement',
    'Town Planner | Lodgement DPO / TP',
    'Town Planner | RFI DPO / TPO',
    'Traffic Management | Town Planning',
    'Traffic Management | CMP',
    'Urban Design | Concept & Development Plan Scoping',
    'Urban Design | Development Plan Preparation',
    'Urban Design | TP Application Support *Refer to Fee Proposal',
    'VCAT | Expert Witness',
    'VCAT | Legal',
    'VCAT | Town Planner',
    'Waste Management | Town Planning',
    'Way Finding and Signage | Scope',
    'Way Finding and Signage | Documents',
    'Wind | Town Planing',
    'Wind | Design Development',
    'Contingency',
  ],
  statutory: [
    'Asset Protection Bond | Demo',
    'Asset Protection Bond | Construction',
    'Building Application Fee',
    'Metropolitan Planning Levy',
    'Open Space Contribution',
    'Planning Application Fee',
    'Subdivision Costs',
    'Development Contribution | Residential',
    'Development Contribution | Commercial',
    'Tenant Relocation',
  ],
  headworks: [
    'Asset Relocation | Headworks',
    'Enviro Consultant | Soil Classification',
    'Enviro Consultant | PSI and Sampling',
    'Enviro Consultant | Assess and monitoring',
    'Enviro Consultant | Site Remediation',
    'Enviro Consultant | Assessment',
    'Enviromental Auditor | Assessment',
    'Enviromental Auditor | Site Review',
    'Enviromental Auditor | Final Assessment',
    'Gas | Application',
    'NBN / Comms | Application',
    'Power Application | Site Power',
    'Power Application | Powerline Change',
    'Sewer and Water | Application',
    'Sewer and Water | PIC',
    'Sewer Manhole | CMP and Permits',
    'Sewer Manhole | Site works',
    'Storm Water | Connection',
    'Storm Water | Diversion',
    'Substation | Design',
    'Substation | Works',
  ],
  management: [
    'Adminstration Management',
    'Accounting Management',
    'Legal Management',
    'Marketing Management',
    'Development Management',
  ],
  marketing: [
    'Advertising | One Off',
    'Advertising | Ongoing Management',
    'Display Suite | Design Documentation',
    'Display Suite | Construction',
    'Display Suite | Holding Costs',
    'Display Suite | Loose Furniture',
    'Marketing | Collateral',
    'Marketing | Print Media',
    'Marketing | Renders Drafts',
    'Marketing | Renders Final',
    'Marketing | Website',
    'Marketing | Website Hosting',
    'Marketing | Special use',
  ],
}

const DEFAULT_HARD_COSTS = COST_STACK_LABELS.hardCosts.map(li)
const DEFAULT_CONSULTANTS = COST_STACK_LABELS.consultants.map(li)
const DEFAULT_STATUTORY = COST_STACK_LABELS.statutory.map(li)
const DEFAULT_HEADWORKS = COST_STACK_LABELS.headworks.map(li)
const DEFAULT_MANAGEMENT = COST_STACK_LABELS.management.map(li)
const DEFAULT_MARKETING = COST_STACK_LABELS.marketing.map(li)

export function getDetailedCostStack(projectId: string): import('./schema').DetailedCostStack {
  const stack = load<import('./schema').DetailedCostStack>(`detailed-costs:${projectId}`, {
    projectId,
    hardCosts: DEFAULT_HARD_COSTS.map(x => ({ ...x, id: generateId() })),
    consultants: DEFAULT_CONSULTANTS.map(x => ({ ...x, id: generateId() })),
    statutory: DEFAULT_STATUTORY.map(x => ({ ...x, id: generateId() })),
    headworks: DEFAULT_HEADWORKS.map(x => ({ ...x, id: generateId() })),
    management: DEFAULT_MANAGEMENT.map(x => ({ ...x, id: generateId() })),
    marketing: DEFAULT_MARKETING.map(x => ({ ...x, id: generateId() })),
  })
  // Backfill the Headworks & Enviro / Management Fees sections for stacks saved
  // before those sections existed, so existing projects pick them up.
  if (!stack.headworks) stack.headworks = DEFAULT_HEADWORKS.map(x => ({ ...x, id: generateId() }))
  if (!stack.management) stack.management = DEFAULT_MANAGEMENT.map(x => ({ ...x, id: generateId() }))

  // Development / Marketing / Administration Management are percentage-based
  // fees (default basis = construction; the CFO can switch to GDV in the tab).
  // Tag them and DERIVE the construction-based amount live from the build cost.
  // (GDV-based amounts are derived in the Cost Stack tab where revenue is known.)
  const csr = costStackRaw(projectId)
  const construction = getSiteDesign(projectId).resiGBA * csr.buildRatePerSqm * (1 + (csr.regionalLoadingPct ?? 0))
  stack.management = stack.management.map(it => {
    let line = it
    if (line.feeBasis == null && /development management|marketing management|adminstration management|administration management/i.test(line.label)) {
      line = { ...line, feeBasis: 'construction', pct: line.pct ?? 0 }
    }
    if (line.feeBasis === 'construction') line = { ...line, amount: Math.round((line.pct ?? 0) * construction) }
    return line
  })
  return stack
}

// One-time migration: rewrite every project's Cost Stack sections to the CFO's
// 2026 master schedule (COST_STACK_LABELS) with all amounts zeroed, so the CFO
// and DM build budgets from a clean slate. Runs once per browser after the cloud
// pull, then pushes the rewritten stacks back to the cloud.
export function migrateCostStackLabels() {
  const FLAG = 'coststack_labels_cfo_2026_v2'
  if (localStorage.getItem(FLAG)) return
  const fresh = (labels: string[]) => labels.map(l => ({ id: generateId(), label: l, amount: 0, notes: '' }))
  for (const p of getProjects()) {
    saveDetailedCostStack({
      projectId: p.id,
      hardCosts: fresh(COST_STACK_LABELS.hardCosts),
      consultants: fresh(COST_STACK_LABELS.consultants),
      statutory: fresh(COST_STACK_LABELS.statutory),
      headworks: fresh(COST_STACK_LABELS.headworks),
      management: fresh(COST_STACK_LABELS.management),
      marketing: fresh(COST_STACK_LABELS.marketing),
    })
  }
  localStorage.setItem(FLAG, '1')
}

/** Project Gross Development Value — the best scenario's gross realisation
 *  (BTS gross revenue / BTR-Hotel gross asset value). Revenue is independent of
 *  development cost, so this is safe to use as a fee basis without circularity. */
export function getProjectGDV(projectId: string): number {
  const gst = costStackRaw(projectId).gstEnabled !== false
  let best = 0
  for (const s of getMixScenarios(projectId)) {
    const units = getUnitTypes(s.id)
    const hotelA = getHotelAssumptions(s.id)
    const btrA = getBTRAssumptions(s.id)
    const btsA = getBTSAssumptions(s.id)
    if (hotelA.keys > 0) {
      const inc = calculateHotelIncome(hotelA)
      best = Math.max(best, calculateHotelValuation(inc.noi, hotelA.hotelCapRate, 0, hotelA.devMarginPct).gav)
    }
    if (units.some(u => u.weeklyRentConservative > 0)) {
      const ul = units.map(u => ({ typeName: u.name, unitCount: u.solvedCount, weeklyRentConservative: u.weeklyRentConservative, weeklyRentAggressive: u.weeklyRentAggressive, opexPerUnitPerYear: u.opexPerUnitPerYear }))
      const btrInputs = { unitLines: ul, vacancyPct: btrA.vacancyPct, managementFeePct: btrA.managementFeePct, commercialIncomeLines: [], carParkIncomeAnnual: btrA.carParkIncomeAnnual, buildingAdminFixed: btrA.buildingAdminFixed }
      const incC = calculateBTRIncome(btrInputs, 'conservative')
      best = Math.max(best, calculateBTRValuation(incC.noi, btrA.capRateConservative, 0, btrA.devMarginPct).gav)
      const incA = calculateBTRIncome(btrInputs, 'aggressive')
      best = Math.max(best, calculateBTRValuation(incA.noi, btrA.capRateAggressive, 0, btrA.devMarginPct).gav)
      const bl = units.map(u => ({ typeName: u.name, unitCount: u.solvedCount, pricePerUnit: u.salePriceMid }))
      best = Math.max(best, calculateBTSValuation(bl, [], btsA.sellingCostsPct, 0, btsA.devMarginPct, gst).grossRevenue)
    }
  }
  return best
}

export function saveDetailedCostStack(data: import('./schema').DetailedCostStack) {
  save(`detailed-costs:${data.projectId}`, data)
  cloud.pushProjectField(data.projectId, 'detailed_costs', data)
  touchProject(data.projectId)
}

// ── Development cashflow ───────────────────────────────────────────────────────
export function getCashflow(projectId: string): import('./schema').CashflowState {
  const def = defaultCashflowState(projectId)
  const s = load<import('./schema').CashflowState>(`cashflow:${projectId}`, def)
  return { ...def, ...s, phases: { ...def.phases, ...(s.phases || {}) }, manual: s.manual || [] }
}
export function saveCashflow(data: import('./schema').CashflowState) {
  save(`cashflow:${data.projectId}`, data)
  cloud.pushProjectField(data.projectId, 'cashflow', data)
  touchProject(data.projectId)
}

// ── Finance Assumptions ───────────────────────────────────────────────────────

function defaultTranche(overrides: Partial<DebtTranche> & { id: string; label: string; type: DebtTranche['type'] }): DebtTranche {
  return {
    lvr: 0.65, useAutoLvr: true, amount: 0,
    interestRate: 0.085, establishmentFeePct: 0.01, lineFeePct: 0.005, exitFeePct: 0.005,
    termMonths: 30, drawdownProfile: 'scurve', notes: '',
    ...overrides,
  }
}

const DEFAULT_TRANCHES: DebtTranche[] = [
  defaultTranche({ id: 'land-debt', label: 'Land / Acquisition Facility', type: 'land', lvr: 0.60, interestRate: 0.08, termMonths: 18, drawdownProfile: 'upfront', notes: 'Interest only from settlement. Repaid at construction loan close.' }),
  defaultTranche({ id: 'senior-debt', label: 'Senior Construction Debt', type: 'senior', lvr: 0.65, interestRate: 0.085, termMonths: 30, drawdownProfile: 'scurve', notes: 'BBSY + 2.5% margin. Interest capitalised during construction.' }),
  defaultTranche({ id: 'mezz-debt', label: 'Mezzanine Finance', type: 'mezz', lvr: 0.80, useAutoLvr: false, amount: 0, interestRate: 0.155, establishmentFeePct: 0.02, exitFeePct: 0.01, termMonths: 30, drawdownProfile: 'linear', notes: 'Junior debt sitting between senior and equity. Activate if required.' }),
  defaultTranche({ id: 'pref-equity', label: 'Preferred Equity', type: 'preferred-equity', lvr: 0.90, useAutoLvr: false, amount: 0, interestRate: 0.13, establishmentFeePct: 0.015, lineFeePct: 0, exitFeePct: 0, termMonths: 36, drawdownProfile: 'upfront', notes: 'Preferred return before common equity participates. Activate if required.' }),
]

export function getFinanceAssumptions(projectId: string): FinanceAssumptions {
  return load<FinanceAssumptions>(`finance:${projectId}`, {
    projectId,
    bbsyRate: 0.044,
    landInterestRate: 0.08,
    landLvr: 0.60,
    landCarryMonths: 12,
    constructionMonths: 24,
    tranches: DEFAULT_TRANCHES.map(t => ({ ...t })),
    blowout3mActive: true,
    blowout6mActive: true,
    blowout12mActive: true,
    equityHurdleRate: 0.18,
    preferredReturnRate: 0.12,
  })
}

export function saveFinanceAssumptions(data: FinanceAssumptions) {
  save(`finance:${data.projectId}`, data)
  cloud.pushProjectField(data.projectId, 'finance', data)
  touchProject(data.projectId)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function touchProject(id: string) {
  const p = getProject(id)
  if (p) saveProject(p)
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
