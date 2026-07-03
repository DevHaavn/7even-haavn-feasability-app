import { calculateBTRIncome, BTRIncomeInputs, UnitIncomeLine } from './btr'
import { UnitSaleLine } from './bts'

export function calculateHybridValuation(
  holdUnitLines: UnitIncomeLine[],
  sellUnitLines: UnitSaleLine[],
  btrIncomeInputs: Omit<BTRIncomeInputs, 'unitLines'>,
  capRate: number,
  sellingCostsPct: number,
  totalDevelopmentCost: number,
  devMarginPct: number,
  scenario: 'conservative' | 'aggressive'
) {
  const holdIncome = calculateBTRIncome({ ...btrIncomeInputs, unitLines: holdUnitLines }, scenario)
  const holdGAV = holdIncome.noi / capRate
  const sellRevenue = sellUnitLines.reduce((s, l) => s + l.unitCount * l.pricePerUnit, 0)
  const sellNetRevenue = sellRevenue * (1 - sellingCostsPct)
  const combinedProceeds = holdGAV + sellNetRevenue
  const rlv = (combinedProceeds - totalDevelopmentCost) / (1 + devMarginPct)
  return { holdIncome, holdGAV, sellRevenue, sellNetRevenue, combinedProceeds, rlv }
}
