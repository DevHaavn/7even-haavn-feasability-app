import { describe, it, expect } from 'vitest'
import {
  xirr, equityMultiple, accrue, loanInterest,
  allocateProRata, runWaterfall, dscr, cashOnCash,
  type WaterfallPosition, type WaterfallConfig,
} from '../capitalCalc'

describe('xirr', () => {
  it('returns the exact rate for a clean doubling over one year', () => {
    // -100 today, +110 in a year = 10%
    const r = xirr([
      { date: '2026-01-01', amount: -100 },
      { date: '2027-01-01', amount: 110 },
    ])
    expect(r).not.toBeNull()
    expect(r!).toBeCloseTo(0.10, 4)
  })

  it('handles a realistic multi-draw equity position', () => {
    const r = xirr([
      { date: '2026-01-01', amount: -5_000_000 },
      { date: '2026-07-01', amount: -3_000_000 },
      { date: '2027-01-01', amount: -2_000_000 },
      { date: '2029-06-30', amount: 16_500_000 },
    ])
    expect(r).not.toBeNull()
    // ~17% — sanity band rather than a magic constant
    expect(r!).toBeGreaterThan(0.12)
    expect(r!).toBeLessThan(0.22)
  })

  it('is null when there is no sign change (never returned)', () => {
    expect(xirr([
      { date: '2026-01-01', amount: -100 },
      { date: '2027-01-01', amount: -50 },
    ])).toBeNull()
  })

  it('is null with fewer than two flows', () => {
    expect(xirr([{ date: '2026-01-01', amount: -100 }])).toBeNull()
  })

  it('survives a total loss without throwing or returning Infinity', () => {
    const r = xirr([
      { date: '2026-01-01', amount: -1_000_000 },
      { date: '2028-01-01', amount: 1 },
    ])
    expect(r === null || Number.isFinite(r)).toBe(true)
  })

  // REGRESSION: a partly-returned position reported +1000% net IRR on screen —
  // the bisection band's upper bound leaking out when no root exists in it. A
  // loss must never surface as a spectacular gain.
  it('returns null (not the search bound) when far less came back than went in', () => {
    const r = xirr([
      { date: '2026-01-15', amount: -125_500_000 },
      { date: '2026-07-21', amount: 20_000_000 },
    ])
    expect(r).toBeNull()
  })

  it('never returns the bisection bound as a real answer', () => {
    // Any partial repayment inside the term should be null or plainly negative
    for (const back of [1, 1_000, 500_000, 5_000_000]) {
      const r = xirr([
        { date: '2026-01-01', amount: -10_000_000 },
        { date: '2026-09-01', amount: back },
      ])
      expect(r === null || r < 0).toBe(true)
      expect(r).not.toBe(10)
    }
  })

  it('still finds a genuine high return', () => {
    const r = xirr([
      { date: '2026-01-01', amount: -1_000_000 },
      { date: '2026-07-01', amount: 1_800_000 },
    ])
    expect(r).not.toBeNull()
    expect(r!).toBeGreaterThan(1)      // >100% annualised, correctly
    expect(r!).toBeLessThan(3)
  })
})

describe('equityMultiple', () => {
  it('counts distributions and projected remaining', () => {
    expect(equityMultiple(10_000_000, 4_000_000, 8_000_000)).toBeCloseTo(2.2, 6)
  })
  it('is 0 when nothing was funded (no divide by zero)', () => {
    expect(equityMultiple(0, 500, 0)).toBe(0)
  })
})

describe('accrue', () => {
  it('simple interest is principal x rate x years', () => {
    expect(accrue({
      principal: 1_000_000, ratePct: 8, fromDate: '2026-01-01', toDate: '2027-01-01',
      compounding: 'simple',
    })).toBeCloseTo(80_000, 0)
  })

  it('monthly compounding beats simple over a year', () => {
    const c = accrue({ principal: 1_000_000, ratePct: 8, fromDate: '2026-01-01', toDate: '2027-01-01', compounding: 'compound' })
    expect(c).toBeGreaterThan(80_000)
    expect(c).toBeCloseTo(83_000, -3)   // (1+.08/12)^12 - 1 = 8.30%
  })

  it('returns 0 for zero principal, zero rate or a backwards window', () => {
    expect(accrue({ principal: 0, ratePct: 8, fromDate: '2026-01-01', toDate: '2027-01-01' })).toBe(0)
    expect(accrue({ principal: 1e6, ratePct: 0, fromDate: '2026-01-01', toDate: '2027-01-01' })).toBe(0)
    expect(accrue({ principal: 1e6, ratePct: 8, fromDate: '2027-01-01', toDate: '2026-01-01' })).toBe(0)
  })
})

describe('loanInterest', () => {
  it('capitalised interest rolls up rather than becoming payable', () => {
    const r = loanInterest(1_000_000, 9, '2026-01-01', '2027-01-01', 'capitalised')
    expect(r.capitalised).toBeGreaterThan(0)
    expect(r.payable).toBe(0)
    expect(r.accrued).toBeCloseTo(r.capitalised, 6)
  })
  it('monthly-pay interest is payable, not capitalised', () => {
    const r = loanInterest(1_000_000, 9, '2026-01-01', '2027-01-01', 'monthly')
    expect(r.capitalised).toBe(0)
    expect(r.payable).toBeCloseTo(90_000, 0)
  })
})

describe('allocateProRata', () => {
  it('splits exactly in proportion to weight', () => {
    const a = allocateProRata(1_000_000, [{ id: 'a', weight: 3 }, { id: 'b', weight: 1 }])
    expect(a.a).toBeCloseTo(750_000, 2)
    expect(a.b).toBeCloseTo(250_000, 2)
  })

  it('RECONCILES: parts always sum back to the total, even when it does not divide', () => {
    // 1/3 splits are the classic case where naive rounding loses a cent
    const total = 1_000_000.01
    const a = allocateProRata(total, [{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }, { id: 'c', weight: 1 }])
    const sum = a.a + a.b + a.c
    expect(Math.round(sum * 100)).toBe(Math.round(total * 100))
  })

  it('reconciles across many uneven weights', () => {
    const weights = [7, 13, 29, 3, 101, 57, 11].map((w, i) => ({ id: `p${i}`, weight: w }))
    const total = 14_000_000 / 3
    const out = allocateProRata(total, weights)
    const sum = Object.values(out).reduce((x, y) => x + y, 0)
    expect(Math.round(sum * 100)).toBe(Math.round(total * 100))
  })

  it('gives everyone zero when all weights are zero rather than NaN', () => {
    const a = allocateProRata(500, [{ id: 'a', weight: 0 }, { id: 'b', weight: 0 }])
    expect(a.a).toBe(0)
    expect(a.b).toBe(0)
  })

  it('ignores negative weights instead of inverting the split', () => {
    const a = allocateProRata(100, [{ id: 'a', weight: -5 }, { id: 'b', weight: 5 }])
    expect(a.a).toBe(0)
    expect(a.b).toBeCloseTo(100, 2)
  })
})

describe('runWaterfall', () => {
  const cfg: WaterfallConfig = {
    prefRate: 8, prefCompounding: 'compound', catchUp: true, catchUpTarget: 20,
    tiers: [{ hurdleIrr: 15, lpSplit: 80, gpSplit: 20 }],
  }
  const positions: WaterfallPosition[] = [
    { positionId: 'p1', investorId: 'i1', funded: 6_000_000, unreturnedCapital: 6_000_000, accruedPref: 480_000 },
    { positionId: 'p2', investorId: 'i2', funded: 4_000_000, unreturnedCapital: 4_000_000, accruedPref: 320_000 },
  ]

  it('pays return of capital first and nothing else when cash is short', () => {
    const r = runWaterfall(5_000_000, positions, cfg)
    expect(r.tierTotals.map(t => t.category)).toEqual(['return_of_capital'])
    const roc = r.lines.filter(l => l.category === 'return_of_capital')
    expect(roc.reduce((a, l) => a + l.amount, 0)).toBeCloseTo(5_000_000, 2)
    // split 60/40 by unreturned capital
    expect(roc.find(l => l.positionId === 'p1')!.amount).toBeCloseTo(3_000_000, 2)
  })

  it('pays capital then pref before any GP participation', () => {
    const r = runWaterfall(10_800_000, positions, cfg)
    const cats = r.tierTotals.map(t => t.category)
    expect(cats).toContain('return_of_capital')
    expect(cats).toContain('pref')
    expect(r.gpCatchUp).toBe(0)
    expect(r.lines.filter(l => l.category === 'pref').reduce((a, l) => a + l.amount, 0)).toBeCloseTo(800_000, 2)
  })

  it('runs the full cascade and never distributes more than it was given', () => {
    const distributable = 20_000_000
    const r = runWaterfall(distributable, positions, cfg)
    const toLps = r.lines.reduce((a, l) => a + l.amount, 0)
    expect(toLps + r.gpCatchUp + r.undistributed).toBeCloseTo(distributable, 2)
    expect(r.gpCatchUp).toBeGreaterThan(0)
  })

  it('distributes nothing for zero or negative cash', () => {
    const r = runWaterfall(0, positions, cfg)
    expect(r.lines).toHaveLength(0)
    expect(r.gpCatchUp).toBe(0)
    const neg = runWaterfall(-5_000, positions, cfg)
    expect(neg.lines).toHaveLength(0)
  })

  it('skips the catch-up tier when it is switched off', () => {
    const r = runWaterfall(20_000_000, positions, { ...cfg, catchUp: false })
    expect(r.tierTotals.some(t => t.label.includes('catch-up'))).toBe(false)
    const toLps = r.lines.reduce((a, l) => a + l.amount, 0)
    expect(toLps + r.gpCatchUp).toBeCloseTo(20_000_000, 2)
  })

  it('handles an empty position list without dividing by zero', () => {
    const r = runWaterfall(1_000_000, [], cfg)
    expect(r.lines).toHaveLength(0)
    expect(Number.isFinite(r.gpCatchUp)).toBe(true)
  })
})

describe('coverage ratios', () => {
  it('dscr is null when there is no debt service', () => {
    expect(dscr(1_000_000, 0)).toBeNull()
    expect(dscr(1_420_000, 1_000_000)).toBeCloseTo(1.42, 6)
  })
  it('cash-on-cash is 0 rather than NaN when nothing is funded', () => {
    expect(cashOnCash(100, 0)).toBe(0)
    expect(cashOnCash(640_000, 10_000_000)).toBeCloseTo(0.064, 6)
  })
})
