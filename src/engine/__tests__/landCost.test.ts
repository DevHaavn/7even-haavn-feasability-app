import { describe, it, expect } from 'vitest'
import { computeLandCost } from '../landCost'
import type { LandTerms } from '../../db/schema'

const base: LandTerms = {
  projectId: 't', landCost: 25_000_000, isInKind: false, inKindLabel: '', inKindGFA: 0,
  inKindRatePerSqm: 0, inKindNote: '', state: 'VIC', propertyType: 'commercial',
  foreignBuyer: false, applyStampDuty: true, settlementDate: '', landGst: 'none',
  dealType: 'standard',
}

describe('Effective land cost — VIC worked examples', () => {
  it('VIC $25M commercial: duty ≈ $1.605M, FPAD $0', () => {
    const b = computeLandCost(base, false)
    expect(b.stampDuty).toBeCloseTo(1_605_000, -2)
    expect(b.foreignSurcharge).toBe(0)                       // commercial → no FPAD
    expect(b.total).toBeCloseTo(26_605_000, -2)             // price + duty
  })

  it('FPAD is residential-only: commercial + foreign flag still $0 surcharge', () => {
    const b = computeLandCost({ ...base, foreignBuyer: true }, false)
    expect(b.foreignSurcharge).toBe(0)
  })

  it('VIC $25M residential + foreign: duty + $2.0M FPAD surcharge', () => {
    const b = computeLandCost({ ...base, propertyType: 'house_and_land', foreignBuyer: true }, false)
    expect(b.stampDuty).toBeCloseTo(1_605_000, -2)
    expect(b.foreignSurcharge).toBeCloseTo(2_000_000, -2)   // 8% × $25M
    expect(b.total).toBeCloseTo(28_605_000, -2)
  })

  it('Deferred settlement adds finance-on-terms', () => {
    const b = computeLandCost({ ...base, applyStampDuty: false, dealType: 'deferred', deferredAmount: 10_000_000, deferredRate: 0.08, deferredMonths: 12 }, false)
    expect(b.financeOnTerms).toBeCloseTo(800_000, -2)       // 10M × 8% × 1yr
    expect(b.total).toBeCloseTo(25_800_000, -2)
  })

  it('Option fee credited on exercise is not double-counted; non-credited is a terms cost', () => {
    const credited = computeLandCost({ ...base, applyStampDuty: false, dealType: 'option', optionFee: 500_000, optionFeeCredited: true }, false)
    const forfeit  = computeLandCost({ ...base, applyStampDuty: false, dealType: 'option', optionFee: 500_000, optionFeeCredited: false }, false)
    expect(credited.financeOnTerms).toBe(0)
    expect(forfeit.financeOnTerms).toBe(500_000)
  })

  it('Rebate reduces the effective land cost', () => {
    const b = computeLandCost({ ...base, applyStampDuty: false, dealType: 'rebate', rebateAmount: 1_000_000 }, false)
    expect(b.total).toBeCloseTo(24_000_000, -2)
  })

  it('In-kind zeroes the cash price', () => {
    const b = computeLandCost({ ...base, applyStampDuty: false, dealType: 'inkind', inKindGFA: 6250, inKindRatePerSqm: 4000 }, false)
    expect(b.price).toBe(0)
  })
})
