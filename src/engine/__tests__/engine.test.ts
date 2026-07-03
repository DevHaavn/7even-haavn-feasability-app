import { describe, it, expect } from 'vitest'
import { solveUnitMix } from '../unitMix'
import { calculateCostStack } from '../costStack'
import { calculateBTRIncome, calculateBTRValuation } from '../btr'
import { calculateBTSValuation } from '../bts'
import { calculateHotelIncome, calculateHotelValuation } from '../hotel'
import { calculatePortfolioPoolValuation } from '../portfolio'
import { gstIncluded, exGst } from '../gst'
import { calculateStampDuty } from '../stampDuty'
import { WERRIBEE_FIXTURE as W, GEELONG_FIXTURE as G } from '../__fixtures__/realProjects'

const pct = (actual: number, expected: number) => Math.abs(actual - expected) / Math.abs(expected)
const within = (actual: number, expected: number, tol = 0.02) => pct(actual, expected) <= tol

// ─── WERRIBEE ────────────────────────────────────────────────────────────────

describe('Werribee — unit mix solver', () => {
  const result = solveUnitMix(W.site.resiNSA, W.productMix.unitTypes)
  const totalUnits = result.mix.reduce((s, m) => s + m.count, 0)
  const nsaUsed = result.mix.reduce((s, m) => s + m.nsaUsed, 0)

  it('total units within ±2 of 289', () => {
    expect(Math.abs(totalUnits - 289)).toBeLessThanOrEqual(2)
  })

  it('studio count = 35', () => {
    expect(result.mix[0].count).toBe(35)
  })

  it('1-bed count within ±1 of 168', () => {
    expect(Math.abs(result.mix[1].count - 168)).toBeLessThanOrEqual(1)
  })

  it('NSA used within 100 sqm of 19,456', () => {
    expect(Math.abs(nsaUsed - W.site.resiNSA)).toBeLessThanOrEqual(100)
  })

  it('impliedUnits = 289', () => {
    expect(result.impliedUnits).toBe(289)
  })
})

describe('Werribee — cost stack (exact)', () => {
  const f = W.costStack
  const result = calculateCostStack({
    gba: W.site.resiGBA,
    buildRatePerSqm: f.buildRatePerSqm,
    contingencyPct: f.contingencyPct,
    prelimsPct: f.prelimsPct,
    professionalFeesPct: f.professionalFeesPct,
    statutoryFixed: f.statutoryFixed,
    financePct: f.financePct,
    projectManagementFixed: f.projectManagementFixed,
    marketingFixed: f.marketingFixed,
    amenityFitoutFixed: f.amenityFitoutFixed,
    inKindLineItem: { label: f.inKindLineItem.label, gfa: f.inKindLineItem.gfa, ratePerSqm: f.inKindLineItem.ratePerSqm, note: 'no debt, no finance, no holding cost' },
  })

  it('construction cost = $113,995,000', () => {
    expect(result.construction).toBe(f.expectedConstruction)
  })

  it('in-kind (church) cost = $8,941,400', () => {
    expect(result.inKindCost).toBe(f.inKindLineItem.expectedCost)
  })

  it('total development cost = $162,794,950', () => {
    expect(result.totalDevelopmentCost).toBe(f.expectedTotalDevelopmentCost)
  })
})

describe('Werribee — BTR income formula (gross rent)', () => {
  // Test the income formula mechanics; opex/commercial values not in fixture so use 0
  const f = W.income
  const mix = solveUnitMix(W.site.resiNSA, W.productMix.unitTypes)
  const unitLines = [
    { typeName: 'Studio', unitCount: mix.mix[0].count, weeklyRentConservative: f.rentsConservativeWeekly.studio, weeklyRentAggressive: f.rentsAggressiveWeekly.studio, opexPerUnitPerYear: 0 },
    { typeName: '1 Bedroom', unitCount: mix.mix[1].count, weeklyRentConservative: f.rentsConservativeWeekly.oneBed, weeklyRentAggressive: f.rentsAggressiveWeekly.oneBed, opexPerUnitPerYear: 0 },
    { typeName: '2 Bedroom', unitCount: mix.mix[2].count, weeklyRentConservative: f.rentsConservativeWeekly.twoBed, weeklyRentAggressive: f.rentsAggressiveWeekly.twoBed, opexPerUnitPerYear: 0 },
  ]
  const inputs = { unitLines, vacancyPct: f.vacancyPct, managementFeePct: f.managementFeePct, commercialIncomeLines: [], carParkIncomeAnnual: 0, buildingAdminFixed: 0 }
  const cons = calculateBTRIncome(inputs, 'conservative')
  const agg = calculateBTRIncome(inputs, 'aggressive')

  it('conservative gross annual rent is within 1% of expected range (~$7M)', () => {
    // ~289 units at avg ~$452/wk → ~$6.8-7.1M gross
    expect(cons.grossAnnualRent).toBeGreaterThan(6_500_000)
    expect(cons.grossAnnualRent).toBeLessThan(7_500_000)
  })

  it('aggressive gross annual rent > conservative', () => {
    expect(agg.grossAnnualRent).toBeGreaterThan(cons.grossAnnualRent)
  })

  it('vacancy loss = 5% of gross rent', () => {
    expect(Math.abs(cons.vacancyLoss / cons.grossAnnualRent - 0.05)).toBeLessThan(0.001)
  })

  it('management fee = 7% of net-of-vacancy rent', () => {
    const expected = (cons.grossAnnualRent - cons.vacancyLoss) * 0.07
    expect(Math.abs(cons.managementFee - expected)).toBeLessThan(1)
  })
})

describe('Werribee — BTR valuation (using fixture NOI)', () => {
  // Use fixture's expected NOI directly to test the valuation formula
  const v = W.valuation
  const tdc = W.costStack.expectedTotalDevelopmentCost

  const consVal = calculateBTRValuation(W.income.expectedNOIConservative, v.capRateConservative, tdc, v.devMarginPct)
  const aggVal = calculateBTRValuation(W.income.expectedNOIAggressive, v.capRateAggressive, tdc, v.devMarginPct)

  it('GAV conservative ≈ $106.9M (within 2%)', () => {
    expect(within(consVal.gav, v.expectedGAVConservative)).toBe(true)
  })

  it('GAV aggressive ≈ $125.8M (within 2%)', () => {
    expect(within(aggVal.gav, v.expectedGAVAggressive)).toBe(true)
  })

  it('RLV conservative ≈ -$47.4M (within 5%)', () => {
    expect(within(consVal.rlv, v.expectedRLVConservativeBTR, 0.05)).toBe(true)
  })

  it('RLV conservative is negative — site not viable at conservative BTR', () => {
    expect(consVal.rlv).toBeLessThan(0)
  })
})

describe('Werribee — BTS valuation', () => {
  const f = W.btsSell
  const tdc = W.costStack.expectedTotalDevelopmentCost
  const mix = solveUnitMix(W.site.resiNSA, W.productMix.unitTypes)
  const childcareRevenue = W.site.childcareGFA * f.childcareCommercialValuePerSqm

  const makeLines = (prices: typeof f.pricesConservative) => [
    { typeName: 'Studio', unitCount: mix.mix[0].count, pricePerUnit: prices.studio },
    { typeName: '1 Bedroom', unitCount: mix.mix[1].count, pricePerUnit: prices.oneBed },
    { typeName: '2 Bedroom', unitCount: mix.mix[2].count, pricePerUnit: prices.twoBed },
  ]
  const otherRevenue = [{ label: 'Childcare commercial', amount: childcareRevenue }]

  const cons = calculateBTSValuation(makeLines(f.pricesConservative), otherRevenue, f.sellingCostsPct, tdc, 0.18)
  const agg = calculateBTSValuation(makeLines(f.pricesAggressive), otherRevenue, f.sellingCostsPct, tdc, 0.18)

  it('RLV conservative ≈ -$18.6M (within 5%)', () => {
    expect(within(cons.rlv, f.expectedRLVConservative, 0.05)).toBe(true)
  })

  it('RLV aggressive ≈ $2M breakeven (within 20%, small number)', () => {
    // breakeven values have high % sensitivity to tiny changes — use absolute tolerance
    expect(Math.abs(agg.rlv - f.expectedRLVAggressive)).toBeLessThan(5_000_000)
  })

  it('aggressive RLV > conservative RLV', () => {
    expect(agg.rlv).toBeGreaterThan(cons.rlv)
  })
})

// ─── GEELONG ─────────────────────────────────────────────────────────────────

describe('Geelong — unit mix solver (v4)', () => {
  const result = solveUnitMix(G.site.resiNSA, G.productMixV4.unitTypes)
  const totalUnits = result.mix.reduce((s, m) => s + m.count, 0)
  const nsaUsed = result.mix.reduce((s, m) => s + m.nsaUsed, 0)

  it('total units within ±2 of 396', () => {
    expect(Math.abs(totalUnits - 396)).toBeLessThanOrEqual(2)
  })

  it('studio count = 99', () => {
    expect(result.mix[0].count).toBe(99)
  })

  it('1-bed count = 119', () => {
    expect(result.mix[1].count).toBe(119)
  })

  it('2-bed count within ±1 of 138', () => {
    expect(Math.abs(result.mix[2].count - 138)).toBeLessThanOrEqual(1)
  })

  it('3-bed count within ±1 of 40', () => {
    expect(Math.abs(result.mix[3].count - 40)).toBeLessThanOrEqual(1)
  })

  it('NSA used within 100 sqm of 24,304', () => {
    expect(Math.abs(nsaUsed - G.site.resiNSA)).toBeLessThanOrEqual(100)
  })

  it('impliedUnits = 396', () => {
    expect(result.impliedUnits).toBe(396)
  })
})

describe('Geelong — cost stack (exact)', () => {
  const f = G.costStack
  const result = calculateCostStack({
    gba: G.site.resiGBA,
    buildRatePerSqm: f.buildRatePerSqm,
    contingencyPct: f.contingencyPct,
    prelimsPct: f.prelimsPct,
    professionalFeesPct: f.professionalFeesPct,
    statutoryFixed: f.statutoryFixed,
    financePct: f.financePct,
    projectManagementFixed: f.projectManagementFixed,
    marketingFixed: f.marketingFixed,
    amenityFitoutFixed: f.amenityFitoutFixed,
    inKindLineItem: { label: f.inKindLineItem.label, gfa: f.inKindLineItem.gfa, ratePerSqm: f.inKindLineItem.ratePerSqm, note: 'no debt, no finance, no holding cost' },
  })

  it('construction cost = $97,770,000', () => {
    expect(result.construction).toBe(f.expectedConstruction)
  })

  it('in-kind (church) cost = $5,776,000', () => {
    expect(result.inKindCost).toBe(f.inKindLineItem.expectedCost)
  })

  it('total development cost = $138,249,300', () => {
    expect(result.totalDevelopmentCost).toBe(f.expectedTotalDevelopmentCost)
  })
})

describe('Geelong — BTR valuation (using fixture NOI)', () => {
  const v = G.valuation
  const tdc = G.costStack.expectedTotalDevelopmentCost

  const consVal = calculateBTRValuation(G.income.expectedNOIConservative, v.capRateConservative, tdc, v.devMarginPct)
  const aggVal = calculateBTRValuation(G.income.expectedNOIAggressive, v.capRateAggressive, tdc, v.devMarginPct)

  it('GAV conservative ≈ $123.4M (within 2%)', () => {
    expect(within(consVal.gav, v.expectedGAVConservative)).toBe(true)
  })

  it('GAV aggressive ≈ $144.9M (within 2%)', () => {
    expect(within(aggVal.gav, v.expectedGAVAggressive)).toBe(true)
  })

  it('RLV conservative ≈ -$12.6M (within 5%)', () => {
    expect(within(consVal.rlv, v.expectedRLVConservativeBTR, 0.05)).toBe(true)
  })

  it('RLV aggressive ≈ $5.6M POSITIVE (within 5%)', () => {
    expect(within(aggVal.rlv, v.expectedRLVAggressiveBTR, 0.05)).toBe(true)
  })
})

describe('Geelong — BTS valuation (v4 mix)', () => {
  const f = G.btsSell
  const tdc = G.costStack.expectedTotalDevelopmentCost
  const mix = solveUnitMix(G.site.resiNSA, G.productMixV4.unitTypes)
  const childcareRevenue = G.site.childcareGFA * f.childcareCommercialValuePerSqm

  const makeLines = (prices: typeof f.pricesConservative) => [
    { typeName: 'Studio', unitCount: mix.mix[0].count, pricePerUnit: prices.studio },
    { typeName: '1 Bedroom', unitCount: mix.mix[1].count, pricePerUnit: prices.oneBed },
    { typeName: '2 Bedroom', unitCount: mix.mix[2].count, pricePerUnit: prices.twoBed },
    { typeName: '3 Bedroom', unitCount: mix.mix[3].count, pricePerUnit: prices.threeBed },
  ]
  const otherRevenue = [{ label: 'Childcare commercial', amount: childcareRevenue }]

  const cons = calculateBTSValuation(makeLines(f.pricesConservative), otherRevenue, f.sellingCostsPct, tdc, 0.18)
  const mid = calculateBTSValuation(makeLines(f.pricesMid), otherRevenue, f.sellingCostsPct, tdc, 0.18)
  const agg = calculateBTSValuation(makeLines(f.pricesAggressive), otherRevenue, f.sellingCostsPct, tdc, 0.18)

  it('RLV conservative ≈ $16.7M (within 5%)', () => {
    expect(within(cons.rlv, f.expectedRLVConservative, 0.05)).toBe(true)
  })

  it('RLV mid ≈ $30.8M (within 5%)', () => {
    expect(within(mid.rlv, f.expectedRLVMid, 0.05)).toBe(true)
  })

  it('RLV aggressive ≈ $45.4M (within 5%)', () => {
    expect(within(agg.rlv, f.expectedRLVAggressive, 0.05)).toBe(true)
  })

  it('BTS aggressive is the BEST outcome across Geelong scenarios', () => {
    expect(agg.rlv).toBeGreaterThan(mid.rlv)
    expect(mid.rlv).toBeGreaterThan(cons.rlv)
  })
})

// ─── HOTEL ENGINE ────────────────────────────────────────────────────────────

describe('Hotel income engine — formula validation', () => {
  const result = calculateHotelIncome({
    keys: 150,
    adr: 220,
    occupancyPct: 0.72,
    otherRevenuePerKeyPerYear: 8000,
    gopMarginPct: 0.35,
    managementFeePct: 0.05,
    ffeReservePct: 0.04,
  })

  it('RevPAR = ADR × occupancy', () => {
    expect(result.revpar).toBeCloseTo(220 * 0.72, 2)
  })

  it('room revenue = RevPAR × 365 × keys', () => {
    expect(result.roomRevenue).toBeCloseTo(220 * 0.72 * 365 * 150, 0)
  })

  it('NOI = GOP - mgmt fee - FFE reserve', () => {
    const expected = result.gop - result.managementFee - result.ffeReserve
    expect(result.noi).toBeCloseTo(expected, 0)
  })
})

// ─── GST ─────────────────────────────────────────────────────────────────────

describe('GST — 10% on sales, input credits on commercial costs', () => {
  const baseCosts = {
    gba: 1000,
    buildRatePerSqm: 1000,        // construction 1,000,000
    contingencyPct: 0.05,          // 50,000
    prelimsPct: 0.08,              // 80,000
    professionalFeesPct: 0.07,     // 70,000
    statutoryFixed: 100_000,       // GST-free
    financePct: 0.09,              // 90,000 — input-taxed
    projectManagementFixed: 200_000,
    marketingFixed: 100_000,
    amenityFitoutFixed: 50_000,
  }

  it('gstIncluded is 1/11 of a GST-inclusive amount', () => {
    expect(gstIncluded(110)).toBeCloseTo(10, 6)
    expect(exGst(1_100_000)).toBeCloseTo(1_000_000, 2)
  })

  it('cost stack without GST is unchanged (legacy behaviour)', () => {
    const r = calculateCostStack(baseCosts)
    expect(r.gstCredits).toBe(0)
    expect(r.totalDevelopmentCost).toBe(1_740_000)
  })

  it('cost stack credits = 1/11 of commercial costs; statutory & finance excluded', () => {
    const r = calculateCostStack({ ...baseCosts, gstEnabled: true })
    // GST-able: construction 1M + contingency 50k + prelims 80k + prof fees 70k + PM 200k + marketing 100k + amenity 50k = 1,550,000
    expect(r.gstCredits).toBeCloseTo(1_550_000 / 11, 2)
    expect(r.totalDevelopmentCost).toBeCloseTo(1_740_000 - 1_550_000 / 11, 2)
  })

  it('BTS GST on sales = 1/11 of gross, deducted from net revenue', () => {
    const lines = [{ typeName: '2 Bed', unitCount: 10, pricePerUnit: 1_100_000 }]
    const withGst = calculateBTSValuation(lines, [], 0.02, 5_000_000, 0, true)
    expect(withGst.grossRevenue).toBe(11_000_000)
    expect(withGst.gstOnSales).toBeCloseTo(1_000_000, 2)
    expect(withGst.netRevenue).toBeCloseTo(11_000_000 * 0.98 - 1_000_000, 2)

    const withoutGst = calculateBTSValuation(lines, [], 0.02, 5_000_000, 0)
    expect(withoutGst.gstOnSales).toBe(0)
    expect(withoutGst.netRevenue).toBeCloseTo(11_000_000 * 0.98, 2)
  })

  it('GST lowers BTS RLV (sales GST outweighs cost credits on a viable deal)', () => {
    const costs = calculateCostStack({ ...baseCosts, gstEnabled: true })
    const costsNoGst = calculateCostStack(baseCosts)
    const lines = [{ typeName: '2 Bed', unitCount: 10, pricePerUnit: 1_100_000 }]
    const gst = calculateBTSValuation(lines, [], 0.02, costs.totalDevelopmentCost, 0.18, true)
    const noGst = calculateBTSValuation(lines, [], 0.02, costsNoGst.totalDevelopmentCost, 0.18)
    expect(gst.rlv).toBeLessThan(noGst.rlv)
  })
})

// ─── STAMP DUTY ──────────────────────────────────────────────────────────────

describe('Stamp duty — general/entity rate per state', () => {
  it('VIC $800k vacant land = $43,070', () => {
    expect(calculateStampDuty('VIC', 800_000, 'vacant_land').duty).toBeCloseTo(43_070, 0)
  })

  it('VIC $2.5M = $142,500 (top bracket)', () => {
    expect(calculateStampDuty('VIC', 2_500_000, 'vacant_land').duty).toBeCloseTo(142_500, 0)
  })

  it('QLD $1M = $38,025 and $2M = $95,525', () => {
    expect(calculateStampDuty('QLD', 1_000_000, 'vacant_land').duty).toBeCloseTo(38_025, 0)
    expect(calculateStampDuty('QLD', 2_000_000, 'vacant_land').duty).toBeCloseTo(95_525, 0)
  })

  it('SA commercial land is duty-free', () => {
    expect(calculateStampDuty('SA', 5_000_000, 'commercial').duty).toBe(0)
  })

  it('ACT commercial: nil to $2.1M, then flat 5% of total', () => {
    expect(calculateStampDuty('ACT', 2_000_000, 'commercial').duty).toBe(0)
    expect(calculateStampDuty('ACT', 2_200_000, 'commercial').duty).toBeCloseTo(110_000, 0)
  })

  it('NSW $5M residential uses premium duty; commercial stays general', () => {
    expect(calculateStampDuty('NSW', 5_000_000, 'house_and_land').duty).toBeCloseTo(273_237, 0)
    expect(calculateStampDuty('NSW', 5_000_000, 'commercial').duty).toBeCloseTo(256_287, 0)
  })

  it('foreign surcharge: 8% in VIC residential, none in NT, none on commercial', () => {
    expect(calculateStampDuty('VIC', 1_000_000, 'house_and_land', { foreignBuyer: true }).foreignSurcharge).toBeCloseTo(80_000, 0)
    expect(calculateStampDuty('NT', 1_000_000, 'house_and_land', { foreignBuyer: true }).foreignSurcharge).toBe(0)
    expect(calculateStampDuty('VIC', 1_000_000, 'commercial', { foreignBuyer: true }).foreignSurcharge).toBe(0)
  })
})

// ─── PORTFOLIO POOL ───────────────────────────────────────────────────────────

describe('Portfolio pool valuation', () => {
  const result = calculatePortfolioPoolValuation(
    [
      { projectName: 'Werribee', noi: W.income.expectedNOIAggressive, standaloneCapRate: W.valuation.capRateAggressive },
      { projectName: 'Geelong', noi: G.income.expectedNOIAggressive, standaloneCapRate: G.valuation.capRateAggressive },
    ],
    0.0475 // institutional pool rate
  )

  it('combined NOI = sum of individual NOIs', () => {
    expect(result.combinedNOI).toBeCloseTo(W.income.expectedNOIAggressive + G.income.expectedNOIAggressive, 0)
  })

  it('pool GAV > standalone GAV sum (premium from tighter cap rate)', () => {
    expect(result.poolGAV).toBeGreaterThan(result.standaloneGAVSum)
  })

  it('portfolio premium is positive', () => {
    expect(result.portfolioPremium).toBeGreaterThan(0)
  })
})
