import type { FinanceAssumptions, DebtTranche } from '../db/schema'

export interface TrancheResult {
  id: string
  label: string
  type: DebtTranche['type']
  facilityAmount: number
  peakDebt: number
  interestCost: number
  establishmentFee: number
  lineFee: number
  exitFee: number
  totalCost: number
  effectiveRate: number   // total cost / facility as annual %
}

export interface FinanceResult {
  // Capital stack
  totalFacility: number
  totalDebt: number         // senior + mezz
  totalEquity: number       // TDC - total debt
  equityPct: number         // equity / TDC

  // Land carry
  landDebt: number
  landInterestCost: number

  // Construction interest
  constructionInterestCost: number

  // Tranche breakdown
  tranches: TrancheResult[]

  // All-in finance cost
  totalFinanceCost: number
  financePctOfTDC: number

  // Returns
  equityMultiple: number    // GAV / equity (simplified)

  // Sensitivity scenarios
  base: ScenarioResult
  blowout3m: ScenarioResult
  blowout6m: ScenarioResult
  blowout12m: ScenarioResult
}

export interface ScenarioResult {
  label: string
  extraMonths: number
  extraInterest: number
  totalFinanceCost: number
  profitImpact: number
  marginImpact: number    // % point change
}

// S-curve drawdown: weighted average drawn = ~50% of facility over term
const DRAWDOWN_WEIGHTS: Record<DebtTranche['drawdownProfile'], number> = {
  scurve:      0.50,   // typical construction — drawn gradually
  linear:      0.50,   // equal monthly draws
  upfront:     0.90,   // land — nearly all upfront
  backloaded:  0.35,   // late-stage draws
}

export function calculateFinance(
  fa: FinanceAssumptions,
  tdc: number,
  landCost: number,
  gav: number,
): FinanceResult {
  const tranches: TrancheResult[] = fa.tranches.map(t => {
    const facility = t.useAutoLvr ? tdc * t.lvr : t.amount
    if (facility <= 0) return {
      id: t.id, label: t.label, type: t.type,
      facilityAmount: 0, peakDebt: 0, interestCost: 0,
      establishmentFee: 0, lineFee: 0, exitFee: 0, totalCost: 0, effectiveRate: 0,
    }

    const termYears = t.termMonths / 12
    const avgDrawn = facility * DRAWDOWN_WEIGHTS[t.drawdownProfile]
    const undrawn = facility - avgDrawn

    const interestCost     = avgDrawn * t.interestRate * termYears
    const establishmentFee = facility * t.establishmentFeePct
    const lineFee          = undrawn * t.lineFeePct * termYears
    const exitFee          = facility * t.exitFeePct
    const totalCost        = interestCost + establishmentFee + lineFee + exitFee
    const effectiveRate    = termYears > 0 ? (totalCost / facility) / termYears : 0

    return {
      id: t.id, label: t.label, type: t.type,
      facilityAmount: facility, peakDebt: facility,
      interestCost, establishmentFee, lineFee, exitFee, totalCost, effectiveRate,
    }
  })

  // Land carry (separate from tranche model — always calculated)
  const landDebt = landCost * fa.landLvr
  const landInterestCost = landDebt * fa.landInterestRate * (fa.landCarryMonths / 12)

  // Construction interest (senior tranche or fallback)
  const seniorTranche = tranches.find(t => t.type === 'senior')
  const constructionInterestCost = seniorTranche?.interestCost ?? 0

  const totalFinanceCost = tranches.reduce((s, t) => s + t.totalCost, 0) + landInterestCost
  const financePctOfTDC  = tdc > 0 ? totalFinanceCost / tdc : 0

  const totalDebt   = tranches.filter(t => t.type !== 'equity' && t.type !== 'preferred-equity').reduce((s, t) => s + t.facilityAmount, 0)
  const totalEquity = Math.max(0, tdc - totalDebt)
  const equityPct   = tdc > 0 ? totalEquity / tdc : 1
  const equityMultiple = totalEquity > 0 ? (gav - tdc + totalEquity) / totalEquity : 0

  // Weighted average interest rate across active debt tranches (for blowout sensitivity)
  const weightedDebtRate = totalDebt > 0
    ? fa.tranches
        .filter(t => t.type !== 'equity' && t.type !== 'preferred-equity')
        .reduce((s, t) => {
          const facility = t.useAutoLvr ? tdc * t.lvr : t.amount
          return s + t.interestRate * facility
        }, 0) / totalDebt
    : fa.bbsyRate + 0.025

  function blowoutScenario(extraMonths: number, label: string): ScenarioResult {
    const extraInterest = totalDebt * weightedDebtRate * (extraMonths / 12)
    const totalFinanceCostBlow = totalFinanceCost + extraInterest
    const basePnl  = gav - tdc - totalFinanceCost
    const blowPnl  = gav - tdc - totalFinanceCostBlow
    const profitImpact = blowPnl - basePnl
    const marginImpact = tdc > 0 ? profitImpact / tdc : 0
    return { label, extraMonths, extraInterest, totalFinanceCost: totalFinanceCostBlow, profitImpact, marginImpact }
  }

  const base = blowoutScenario(0, 'Base Case')

  return {
    totalFacility: tranches.reduce((s, t) => s + t.facilityAmount, 0),
    totalDebt, totalEquity, equityPct,
    landDebt, landInterestCost,
    constructionInterestCost,
    tranches,
    totalFinanceCost,
    financePctOfTDC,
    equityMultiple,
    base,
    blowout3m:  blowoutScenario(3,  '+3 Month Delay'),
    blowout6m:  blowoutScenario(6,  '+6 Month Delay'),
    blowout12m: blowoutScenario(12, '+12 Month Delay'),
  }
}
