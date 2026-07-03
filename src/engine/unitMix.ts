export interface UnitTypeTarget {
  name: string
  nsaPerUnit: number
  targetPct: number
}

export interface UnitMixResult {
  impliedUnits: number
  solvedUnits: number
  weightedAvgNSA: number
  nsaDiscrepancy: number
  mix: Array<{
    name: string
    nsaPerUnit: number
    targetPct: number
    count: number
    actualPct: number
    nsaUsed: number
  }>
}

export function solveUnitMix(totalNSA: number, unitTypes: UnitTypeTarget[]): UnitMixResult {
  const weightedAvgNSA = unitTypes.reduce((s, t) => s + t.targetPct * t.nsaPerUnit, 0)
  if (weightedAvgNSA <= 0) return { impliedUnits: 0, solvedUnits: 0, weightedAvgNSA: 0, nsaDiscrepancy: 0, mix: unitTypes.map(t => ({ name: t.name, nsaPerUnit: t.nsaPerUnit, targetPct: t.targetPct, count: 0, actualPct: 0, nsaUsed: 0 })) }
  const impliedUnits = Math.round(totalNSA / weightedAvgNSA)

  let bestN = impliedUnits
  let bestDiff = Infinity

  for (let n = Math.max(1, impliedUnits - 15); n <= impliedUnits + 15; n++) {
    const counts = allocateCounts(n, unitTypes)
    const nsaUsed = counts.reduce((s, c, i) => s + c * unitTypes[i].nsaPerUnit, 0)
    const diff = Math.abs(totalNSA - nsaUsed)
    if (diff < bestDiff) {
      bestDiff = diff
      bestN = n
    }
  }

  const counts = allocateCounts(bestN, unitTypes)
  const nsaUsed = counts.reduce((s, c, i) => s + c * unitTypes[i].nsaPerUnit, 0)

  return {
    impliedUnits,
    solvedUnits: bestN,
    weightedAvgNSA,
    nsaDiscrepancy: totalNSA - nsaUsed,
    mix: unitTypes.map((t, i) => ({
      name: t.name,
      nsaPerUnit: t.nsaPerUnit,
      targetPct: t.targetPct,
      count: counts[i],
      actualPct: counts[i] / bestN,
      nsaUsed: counts[i] * t.nsaPerUnit,
    })),
  }
}

function allocateCounts(n: number, unitTypes: UnitTypeTarget[]): number[] {
  // Largest Remainder Method: floor each, then round up the types with largest fractional remainders
  const raws = unitTypes.map(t => n * t.targetPct)
  const floors = raws.map(r => Math.floor(r))
  const extras = n - floors.reduce((s, f) => s + f, 0)
  // sort indices by fractional part descending; ties broken by larger nsaPerUnit descending
  const order = raws
    .map((r, i) => ({ i, frac: r - floors[i], nsa: unitTypes[i].nsaPerUnit }))
    .sort((a, b) => b.frac - a.frac || b.nsa - a.nsa)
  const counts = [...floors]
  for (let k = 0; k < extras; k++) counts[order[k].i]++
  return counts.map(c => Math.max(0, c))
}
