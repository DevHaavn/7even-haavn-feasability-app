import React, { useEffect, useState } from 'react'
import { useStore } from '../../store'
import { SectionHeading, FieldRow, NumberInput, Money } from '../../components/ui'
import { calculateBTRIncome, calculateBTRValuation } from '../../engine/btr'
import { calculateCostStack } from '../../engine/costStack'
import { calculatePortfolioPoolValuation } from '../../engine/portfolio'

export default function PortfolioView() {
  const store = useStore()
  const projects = useStore(s => s.projects)
  const [poolCapRate, setPoolCapRate] = useState(0.0475)
  const [assets, setAssets] = useState<any[]>([])

  useEffect(() => {
    const computed: any[] = []
    for (const p of projects) {
      const site = store.getSiteDesign(p.id)
      const land = store.getLandTerms(p.id)
      const costData = store.getCostStack(p.id)
      const inKindLineItem = land.isInKind && land.inKindGFA > 0 ? { label: land.inKindLabel, gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote } : undefined
      const tdc = calculateCostStack({ ...costData, gba: site.resiGBA, inKindLineItem }).totalDevelopmentCost
      const scenarios = store.getMixScenarios(p.id)

      for (const s of scenarios) {
        const units = store.getUnitTypes(s.id)
        const btrA = store.getBTRAssumptions(s.id)
        if (!units.some(u => u.solvedCount > 0)) continue
        const unitLines = units.map(u => ({ typeName: u.name, unitCount: u.solvedCount, weeklyRentConservative: u.weeklyRentConservative, weeklyRentAggressive: u.weeklyRentAggressive, opexPerUnitPerYear: u.opexPerUnitPerYear }))
        const btrInputs = { unitLines, vacancyPct: btrA.vacancyPct, managementFeePct: btrA.managementFeePct, commercialIncomeLines: [], carParkIncomeAnnual: btrA.carParkIncomeAnnual, buildingAdminFixed: btrA.buildingAdminFixed }
        const aggI = calculateBTRIncome(btrInputs, 'aggressive')
        const aggV = calculateBTRValuation(aggI.noi, btrA.capRateAggressive, tdc, btrA.devMarginPct)
        computed.push({ projectName: p.name, scenario: s.name, noi: aggI.noi, standaloneCapRate: btrA.capRateAggressive, standaloneGAV: aggV.gav, tdc, units: units.reduce((n, u) => n + (u.solvedCount || 0), 0) })
      }
    }
    setAssets(computed)
  }, [projects])

  const poolResult = assets.length > 0
    ? calculatePortfolioPoolValuation(assets, poolCapRate)
    : null

  return (
    <div className="p-6">
      <SectionHeading sub="Roll-up across all BTR projects — institutional pool valuation">Portfolio View</SectionHeading>

      {assets.length === 0 ? (
        <div className="text-text-grey text-sm">No BTR scenarios with solved unit counts found across projects.</div>
      ) : (
        <>
          {/* Asset table */}
          <div className="bg-charcoal-md border border-charcoal-lt rounded-[8px] overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-charcoal-lt bg-charcoal">
                  {['Project', 'Scenario', 'Units', 'NOI (p.a.)', 'Standalone GAV', 'Cap Rate', 'TDC'].map(h => (
                    <th key={h} className="text-left text-text-grey text-xs px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map((a, i) => (
                  <tr key={i} className="border-b border-charcoal-lt last:border-0">
                    <td className="px-4 py-2.5 text-white font-semibold text-xs">{a.projectName}</td>
                    <td className="px-4 py-2.5 text-text-grey text-xs">{a.scenario}</td>
                    <td className="px-4 py-2.5 text-white font-heading font-bold">{a.units}</td>
                    <td className="px-4 py-2.5 text-gold font-heading font-bold">${(a.noi / 1_000_000).toFixed(2)}M</td>
                    <td className="px-4 py-2.5 text-white font-heading">${(a.standaloneGAV / 1_000_000).toFixed(1)}M</td>
                    <td className="px-4 py-2.5 text-text-grey text-xs">{(a.standaloneCapRate * 100).toFixed(2)}%</td>
                    <td className="px-4 py-2.5 text-text-grey text-xs">${(a.tdc / 1_000_000).toFixed(1)}M</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pool valuation */}
          {poolResult && (
            <div className="bg-charcoal border border-gold/30 rounded-[8px] p-5">
              <h3 className="text-gold font-heading font-bold text-base mb-4">Institutional Pool Valuation</h3>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-text-grey text-xs">Pool cap rate</span>
                <div className="flex items-center gap-1">
                  <input type="number" step={0.25} min={3} max={10} value={Math.round(poolCapRate * 10000) / 100} onChange={e => setPoolCapRate((parseFloat(e.target.value) || 0) / 100)} className="w-16 text-right" />
                  <span className="text-mid-grey text-xs">%</span>
                </div>
                <span className="text-text-grey text-xs">(vs {assets.length > 0 ? (assets[0].standaloneCapRate * 100).toFixed(2) : '—'}% standalone)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <PoolStat label="Combined NOI" value={`$${(poolResult.combinedNOI / 1_000_000).toFixed(2)}M`} />
                <PoolStat label="Standalone GAV sum" value={`$${(poolResult.standaloneGAVSum / 1_000_000).toFixed(1)}M`} />
                <PoolStat label="Pool GAV" value={`$${(poolResult.poolGAV / 1_000_000).toFixed(1)}M`} highlight />
                <PoolStat label="Portfolio premium" value={`+$${(poolResult.portfolioPremium / 1_000_000).toFixed(1)}M`} positive />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PoolStat({ label, value, highlight, positive }: { label: string; value: string; highlight?: boolean; positive?: boolean }) {
  return (
    <div className={`rounded p-3 ${highlight ? 'bg-gold/10 border border-gold/30' : 'bg-charcoal-md border border-charcoal-lt'}`}>
      <div className="text-text-grey text-xs mb-1">{label}</div>
      <div className={`font-heading font-bold text-lg ${highlight ? 'text-gold' : positive ? 'text-green' : 'text-white'}`}>{value}</div>
    </div>
  )
}
