export interface UnitIncomeLine {
  typeName: string
  unitCount: number
  weeklyRentConservative: number
  weeklyRentAggressive: number
  opexPerUnitPerYear: number
}

export interface BTRIncomeInputs {
  unitLines: UnitIncomeLine[]
  vacancyPct: number
  managementFeePct: number
  commercialIncomeLines: { label: string; annualNet: number }[]
  carParkIncomeAnnual: number
  buildingAdminFixed: number
}

export interface BTRIncomeResult {
  grossAnnualRent: number
  vacancyLoss: number
  managementFee: number
  netApartmentIncome: number
  commercialIncome: number
  otherIncome: number
  totalGrossIncome: number
  opex: number
  noi: number
}

export interface BTRValuationResult {
  gav: number
  rlv: number
}

export function calculateBTRIncome(
  inputs: BTRIncomeInputs,
  scenario: 'conservative' | 'aggressive'
): BTRIncomeResult {
  const grossAnnualRent = inputs.unitLines.reduce(
    (sum, l) =>
      sum +
      l.unitCount *
        (scenario === 'conservative' ? l.weeklyRentConservative : l.weeklyRentAggressive) *
        52,
    0
  )
  const vacancyLoss = grossAnnualRent * inputs.vacancyPct
  const managementFee = (grossAnnualRent - vacancyLoss) * inputs.managementFeePct
  const netApartmentIncome = grossAnnualRent - vacancyLoss - managementFee
  const commercialIncome = inputs.commercialIncomeLines.reduce((s, l) => s + l.annualNet, 0)
  // All non-apartment income (childcare + commercial + car park) — this is what
  // flows into NOI and must be shown in full on the outcome breakdown.
  const otherIncome = commercialIncome + inputs.carParkIncomeAnnual
  const totalGrossIncome = netApartmentIncome + otherIncome
  const opex =
    inputs.unitLines.reduce((sum, l) => sum + l.unitCount * l.opexPerUnitPerYear, 0) +
    inputs.buildingAdminFixed
  const noi = totalGrossIncome - opex
  return { grossAnnualRent, vacancyLoss, managementFee, netApartmentIncome, commercialIncome, otherIncome, totalGrossIncome, opex, noi }
}

export function calculateBTRValuation(
  noi: number,
  capRate: number,
  totalDevelopmentCost: number,
  devMarginPct: number
): BTRValuationResult {
  const gav = capRate > 0 ? noi / capRate : 0
  const denom = 1 + devMarginPct
  const rlv = denom !== 0 ? (gav - totalDevelopmentCost) / denom : 0
  return { gav, rlv }
}
