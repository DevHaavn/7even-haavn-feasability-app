// Development return metrics — the multiple lenses banks, developers and builders
// each use to judge a deal. All pure functions (no data access).

export interface ProfitMetrics {
  gdv: number            // Gross Development Value (gross realisation — GAV / gross revenue)
  tdc: number            // Total Development Cost, INCLUDING land
  profit: number         // GDV − TDC (development profit)
  marginOnCost: number   // profit / TDC   — the developer / builder lens ("margin on cost")
  marginOnGdv: number    // profit / GDV   — the bank lens ("profit on GDV")
  irr: number | null     // annualised IRR on the equity cashflow (null if not solvable)
  equityMultiple: number // (equity returned + profit) / equity invested
  peakEquity: number     // peak equity deployed
}

/** Annualised IRR of a monthly cashflow series (index = month offset).
 *  Negative entries are outflows (equity invested), positive are inflows.
 *  Returns the annual rate where NPV = 0, or null if there's no sign change. */
export function annualIRR(monthly: number[]): number | null {
  if (monthly.length === 0) return null
  const hasNeg = monthly.some(v => v < 0)
  const hasPos = monthly.some(v => v > 0)
  if (!hasNeg || !hasPos) return null

  const npv = (rate: number) =>
    monthly.reduce((s, c, m) => s + c / Math.pow(1 + rate, m / 12), 0)

  let lo = -0.9999, hi = 100
  let nlo = npv(lo), nhi = npv(hi)
  if (nlo === 0) return lo
  if (nhi === 0) return hi
  if (nlo * nhi > 0) return null   // no sign change in range → not solvable

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const nmid = npv(mid)
    if (nmid === 0 || (hi - lo) < 1e-9) return mid
    if (nlo * nmid < 0) { hi = mid; nhi = nmid } else { lo = mid; nlo = nmid }
  }
  return (lo + hi) / 2
}

/** Build the equity cashflow and compute IRR for a develop-and-realise deal:
 *  equity is drawn month-by-month during delivery (outflow), then at the exit
 *  month the investor receives their equity back plus the development profit. */
export function developmentIRR(equityByMonth: number[], profit: number, exitMonth?: number): { irr: number | null; equityInvested: number; equityMultiple: number } {
  const equityInvested = equityByMonth.reduce((s, v) => s + (v || 0), 0)
  const cf = equityByMonth.map(v => -(v || 0))   // draws are outflows to the investor
  // Exit = last month with any equity drawn (sale/realisation on completion), else end.
  let exit = exitMonth ?? -1
  if (exit < 0) { for (let m = equityByMonth.length - 1; m >= 0; m--) { if ((equityByMonth[m] || 0) > 0) { exit = m; break } } }
  if (exit < 0) exit = Math.max(0, equityByMonth.length - 1)
  cf[exit] = (cf[exit] || 0) + equityInvested + profit   // return capital + profit at exit
  const irr = annualIRR(cf)
  const equityMultiple = equityInvested > 0 ? (equityInvested + profit) / equityInvested : 0
  return { irr, equityInvested, equityMultiple }
}
