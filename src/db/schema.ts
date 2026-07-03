// Types shared between DB layer and UI
export interface Project {
  id: string
  name: string
  address: string
  suburb: string
  state: string
  zone: string
  responsibleAuthority: string
  status: 'active' | 'on-hold' | 'pending' | 'archived'
  createdAt: string
  updatedAt: string
  mapPin?: string   // custom pin label (default '7')
  type?: 'hotel' | 'btr' | 'bts' | 'mixed'  // project concept type for colour coding
  brand?: '7even' | 'haavn'                  // which entity owns this project
}

export interface SiteDesign {
  projectId: string
  resiNSA: number
  resiGFA: number
  resiGBA: number
  balcony: number
  basementTotal: number
  carSpaces: number
  childcareGFA: number
  churchGFA: number
  churchNSA: number
  otherGFA: number
  notes: string
}

export interface LandTerms {
  projectId: string
  landCost: number
  isInKind: boolean
  inKindLabel: string
  inKindGFA: number
  inKindRatePerSqm: number
  inKindNote: string
}

export interface UnitType {
  id: string
  scenarioId: string
  name: string
  nsaPerUnit: number
  targetPct: number
  solvedCount: number
  weeklyRentConservative: number
  weeklyRentAggressive: number
  salePriceConservative: number
  salePriceMid: number
  salePriceAggressive: number
  opexPerUnitPerYear: number
}

export interface MixScenario {
  id: string
  projectId: string
  name: string
  createdAt: string
}

export interface CostStack {
  projectId: string
  buildRatePerSqm: number
  contingencyPct: number
  prelimsPct: number
  professionalFeesPct: number
  statutoryFixed: number
  financePct: number
  projectManagementFixed: number
  marketingFixed: number
  amenityFitoutFixed: number
}

export interface CostLineItem {
  id: string
  label: string
  amount: number
  notes: string
}

export interface DetailedCostStack {
  projectId: string
  hardCosts: CostLineItem[]
  consultants: CostLineItem[]
  statutory: CostLineItem[]
  marketing: CostLineItem[]
}

export interface BTRAssumptions {
  scenarioId: string
  vacancyPct: number
  managementFeePct: number
  carParkIncomeAnnual: number
  buildingAdminFixed: number
  childcareAnnualNet: number
  commercialAnnualNet: number
  capRateConservative: number
  capRateAggressive: number
  devMarginPct: number
}

export interface BTSAssumptions {
  scenarioId: string
  sellingCostsPct: number
  childcareValuePerSqm: number
  devMarginPct: number
}

export interface HotelAssumptions {
  scenarioId: string
  keys: number
  adr: number
  occupancyPct: number
  otherRevenuePerKeyPerYear: number
  gopMarginPct: number
  managementFeePct: number
  ffeReservePct: number
  hotelCapRate: number
  devMarginPct: number
  // Scenario-level cost overrides (optional — falls back to project CostStack)
  buildRateOverride?: number        // $/sqm — replaces project buildRatePerSqm for this scenario
  constructionFinancePct?: number   // interest on build during construction period (% of construction cost)
  // Hold / stabilisation debt model (optional)
  holdDebtLvr?: number              // LVR on stabilised hold debt (e.g. 0.60)
  holdDebtRate?: number             // annual interest rate on hold debt (e.g. 0.065)
}

export type TimelineCategory = 'acquisition' | 'planning' | 'approvals' | 'site' | 'construction' | 'fitout' | 'commissioning'
export type TimelineStatus   = 'not-started' | 'in-progress' | 'complete' | 'delayed' | 'critical'

export interface TimelineTask {
  id: string
  projectId: string
  name: string
  category: TimelineCategory
  assignee: string
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
  status: TimelineStatus
  progress: number    // 0–100
  notes: string
  isMilestone: boolean
}

// ── Finance Assumptions ───────────────────────────────────────────────────────

export interface DebtTranche {
  id: string
  label: string                // e.g. "Senior Construction Debt"
  type: 'senior' | 'mezz' | 'preferred-equity' | 'equity' | 'land'
  amount: number               // $ drawn (0 = auto from LVR)
  lvr: number                  // LVR if auto-sizing (e.g. 0.65)
  useAutoLvr: boolean          // if true, amount = TDC × lvr
  interestRate: number         // annual rate (e.g. 0.085 = 8.5%)
  establishmentFeePct: number  // % of facility (e.g. 0.01)
  lineFeePct: number           // % p.a. on undrawn (e.g. 0.005)
  exitFeePct: number           // % of facility at repayment
  termMonths: number           // facility term
  drawdownProfile: 'scurve' | 'linear' | 'upfront' | 'backloaded'
  notes: string
}

export interface FinanceAssumptions {
  projectId: string
  // Base rate
  bbsyRate: number             // current BBSY / base rate (e.g. 0.044)
  // Land carry
  landInterestRate: number     // annual rate on land from settlement to construction
  landLvr: number              // LVR on land purchase (e.g. 0.60)
  landCarryMonths: number      // months from land settlement to construction start
  // Construction period
  constructionMonths: number   // build programme duration
  // Debt tranches
  tranches: DebtTranche[]
  // Sensitivity: timeline blowout scenarios
  blowout3mActive: boolean
  blowout6mActive: boolean
  blowout12mActive: boolean
  // Equity hurdle
  equityHurdleRate: number     // target IRR for equity (e.g. 0.18)
  preferredReturnRate: number  // preferred equity return (e.g. 0.12)
}

export interface CostPreset {
  id: string
  name: string
  buildRatePerSqm: number
  description: string
}

export interface BenchmarkSet {
  id: string
  suburb: string
  state: string
  unitType: string
  medianWeeklyRent: number
  medianSalePrice: number
  vacancyPct: number
  asOfDate: string
  source: string
}
