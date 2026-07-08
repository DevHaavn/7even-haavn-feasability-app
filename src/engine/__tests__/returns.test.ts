import { describe, it, expect } from 'vitest'
import { annualIRR, developmentIRR } from '../returns'

describe('annualIRR', () => {
  it('−100 now, +110 in 12 months ≈ 10%', () => {
    const cf = [-100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110]
    const r = annualIRR(cf)
    expect(r).not.toBeNull()
    expect(r!).toBeCloseTo(0.10, 2)
  })

  it('returns null when there is no sign change', () => {
    expect(annualIRR([-1, -2, -3])).toBeNull()
    expect(annualIRR([1, 2, 3])).toBeNull()
  })

  it('higher profit for the same timing gives a higher IRR', () => {
    const lo = annualIRR([-100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 120])!
    const hi = annualIRR([-100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 160])!
    expect(hi).toBeGreaterThan(lo)
  })
})

describe('developmentIRR', () => {
  it('equity drawn over 12m, returned + profit at exit → positive IRR & multiple', () => {
    const equityByMonth = Array(13).fill(0)
    for (let m = 0; m < 12; m++) equityByMonth[m] = 100 / 12   // $100 equity spread over a year
    const { irr, equityMultiple, equityInvested } = developmentIRR(equityByMonth, 25) // $25 profit
    expect(equityInvested).toBeCloseTo(100, 0)
    expect(equityMultiple).toBeCloseTo(1.25, 2)
    expect(irr).not.toBeNull()
    expect(irr!).toBeGreaterThan(0)
  })
})
