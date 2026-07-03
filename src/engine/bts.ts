import { gstIncluded } from './gst'

export interface UnitSaleLine {
  typeName: string
  unitCount: number
  pricePerUnit: number
}

export interface BTSValuationResult {
  grossRevenue: number
  /** GST remitted on sales (1/11 of GST-inclusive gross revenue; 0 when GST off) */
  gstOnSales: number
  netRevenue: number
  rlv: number
}

export function calculateBTSValuation(
  unitLines: UnitSaleLine[],
  otherRevenueLines: { label: string; amount: number }[],
  sellingCostsPct: number,
  totalDevelopmentCost: number,
  devMarginPct: number,
  // Sale prices are entered GST-inclusive; when enabled, GST payable (1/11)
  // is deducted alongside selling costs before net revenue.
  gstEnabled = false
): BTSValuationResult {
  const grossRevenue =
    unitLines.reduce((s, l) => s + l.unitCount * l.pricePerUnit, 0) +
    otherRevenueLines.reduce((s, l) => s + l.amount, 0)
  const gstOnSales = gstEnabled ? gstIncluded(grossRevenue) : 0
  const netRevenue = grossRevenue * (1 - sellingCostsPct) - gstOnSales
  const denom = 1 + devMarginPct
  const rlv = denom !== 0 ? (netRevenue - totalDevelopmentCost) / denom : 0
  return { grossRevenue, gstOnSales, netRevenue, rlv }
}
