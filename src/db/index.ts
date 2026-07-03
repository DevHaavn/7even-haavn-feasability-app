import type { Project, SiteDesign, LandTerms, MixScenario, UnitType, CostStack, BTRAssumptions, BTSAssumptions, HotelAssumptions, CostPreset, BenchmarkSet, FinanceAssumptions, DebtTranche } from './schema'
import * as cloud from './cloud'

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

export function getLandTerms(projectId: string): LandTerms {
  return load<LandTerms>(`land:${projectId}`, {
    projectId, landCost: 0, isInKind: false, inKindLabel: '',
    inKindGFA: 0, inKindRatePerSqm: 3800, inKindNote: 'no debt, no finance, no holding cost',
  })
}

export function saveLandTerms(data: LandTerms) {
  save(`land:${data.projectId}`, data)
  cloud.pushProjectField(data.projectId, 'land', data)
  touchProject(data.projectId)
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

export function getCostStack(projectId: string): CostStack {
  return load<CostStack>(`coststack:${projectId}`, {
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
  })
}

export function saveCostStack(data: CostStack) {
  save(`coststack:${data.projectId}`, data)
  cloud.pushProjectField(data.projectId, 'cost_stack', data)
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

export function getCostPresets(): CostPreset[] {
  return load<CostPreset[]>('costpresets', [
    { id: 'standard', name: '$3,500/sqm — Standard', buildRatePerSqm: 3500, description: 'Traditional construction' },
    { id: 'hybrid', name: '$3,000/sqm — HAAVN Hybrid', buildRatePerSqm: 3000, description: 'HAAVN precision hybrid method' },
    { id: 'bespoke', name: '$3,800/sqm — Bespoke/Church', buildRatePerSqm: 3800, description: 'High-spec or church build' },
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

const DEFAULT_HARD_COSTS = [
  li('Demolition & Site Clearance'),
  li('Bulk Earthworks & Excavation'),
  li('Retaining Walls & Shoring'),
  li('Basement & Substructure'),
  li('Concrete Structure & Post-Tension Slabs'),
  li('External Envelope — Facade & Cladding'),
  li('Roofing & Waterproofing'),
  li('Windows, Glazing & Curtain Wall'),
  li('Mechanical — HVAC'),
  li('Electrical & Data'),
  li('Hydraulic & Plumbing'),
  li('Fire Protection & Detection'),
  li('Lifts & Vertical Transport'),
  li('Apartment Internal Fitout'),
  li('Common Area Fitout & Finishes'),
  li('Joinery, Cabinetry & Wardrobes'),
  li('Flooring (Tiles, Carpet, Timber)'),
  li('Landscaping & External Works'),
  li('Car Parking (Line Marking, Bollards, Equipment)'),
  li('Signage & Wayfinding'),
  li('FF&E — Amenity, Lobby & Gym'),
  li('Preliminaries & Site Establishment'),
  li("Builder's Overhead & Profit Margin"),
  li('Construction Contingency'),
]

const DEFAULT_CONSULTANTS = [
  li('Architect — Concept & Schematic Design'),
  li('Architect — Design Development & Documentation'),
  li('Architect — Contract Administration'),
  li('Town Planner'),
  li('Civil Engineer'),
  li('Structural Engineer'),
  li('Mechanical & Electrical Services Engineer'),
  li('Hydraulic Engineer'),
  li('Fire Engineer'),
  li('Acoustic Consultant'),
  li('Traffic Engineer'),
  li('Landscape Architect'),
  li('Interior Designer'),
  li('ESD / Sustainability Consultant'),
  li('Geotechnical Engineer'),
  li('Land Surveyor & Feature Survey'),
  li('Quantity Surveyor (QS)'),
  li('Building Surveyor / Certifier'),
  li("Project Manager (Developer's Representative)"),
]

const DEFAULT_STATUTORY = [
  li('Planning Permit Application Fee'),
  li('Building Permit Fee'),
  li('Council Infrastructure Levy (CIL)'),
  li('VPA / Government Authority Levy'),
  li('Affordable Housing Contribution'),
  li('Water / Sewer Headworks'),
  li('Electrical Connection & Substation'),
  li('Gas Connection Fee'),
  li('NBN / Communications Connection'),
  li('VicRoads / DTP Contributions'),
  li('Stamp Duty'),
  li('Other Government Fees & Bonds'),
  li('Senior Construction Debt Interest'),
  li('Loan Establishment & Line Fees'),
  li('Mezzanine / Junior Debt Interest'),
  li('Bank Valuation & Legal Fees'),
  li('PEXA & Conveyancing Costs'),
  li('Council Rates (Holding Period)'),
  li('Land Tax (Holding Period)'),
  li('Strata / OC Title Registration'),
  li('Owners Corporation Setup'),
]

const DEFAULT_MARKETING = [
  li('Sales Agent Commission'),
  li('Marketing Collateral & Sales Kit'),
  li('CGI Renders & 3D Visualisations'),
  li('Display Suite Construction'),
  li('Photography & Videography'),
  li('Digital, Social Media & SEO'),
  li('Launch Event & PR'),
  li('Legal — Contract of Sale & Purchaser Contracts'),
  li('Project Insurance (OCIP / Contract Works)'),
  li('Public Liability Insurance'),
  li('Developer Management Fee'),
  li('Defects Rectification Reserve'),
]

export function getDetailedCostStack(projectId: string): import('./schema').DetailedCostStack {
  return load<import('./schema').DetailedCostStack>(`detailed-costs:${projectId}`, {
    projectId,
    hardCosts: DEFAULT_HARD_COSTS.map(x => ({ ...x, id: generateId() })),
    consultants: DEFAULT_CONSULTANTS.map(x => ({ ...x, id: generateId() })),
    statutory: DEFAULT_STATUTORY.map(x => ({ ...x, id: generateId() })),
    marketing: DEFAULT_MARKETING.map(x => ({ ...x, id: generateId() })),
  })
}

export function saveDetailedCostStack(data: import('./schema').DetailedCostStack) {
  save(`detailed-costs:${data.projectId}`, data)
  cloud.pushProjectField(data.projectId, 'detailed_costs', data)
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
