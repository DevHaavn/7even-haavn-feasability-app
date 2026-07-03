export interface UnitSaleLine {
  typeName: string
  unitCount: number
  pricePerUnit: number
}

export interface BTSValuationResult {
  grossRevenue: number
  netRevenue: number
  rlv: number
}

export function calculateBTSValuation(
  unitLines: UnitSaleLine[],
  otherRevenueLines: { label: string; amount: number }[],
  sellingCostsPct: number,
  totalDevelopmentCost: number,
  devMarginPct: number
): BTSValuationResult {
  const grossRevenue =
    unitLines.reduce((s, l) => s + l.unitCount * l.pricePerUnit, 0) +
    otherRevenueLines.reduce((s, l) => s + l.amount, 0)
  const netRevenue = grossRevenue * (1 - sellingCostsPct)
  const denom = 1 + devMarginPct
  const rlv = denom !== 0 ? (netRevenue - totalDevelopmentCost) / denom : 0
  return { grossRevenue, netRevenue, rlv }
}
