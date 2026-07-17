import React, { useEffect, useState } from 'react'
import { useStore } from '../../store'
import { VerdictBadge } from '../../components/ui'
import { calculateBTRIncome, calculateBTRValuation } from '../../engine/btr'
import { calculateBTSValuation } from '../../engine/bts'
import { calculateHotelIncome, calculateHotelValuation } from '../../engine/hotel'
import { calculateCostStack } from '../../engine/costStack'
import { solveUnitMix } from '../../engine/unitMix'

interface Props { projectId: string }

export default function ScenarioComparison({ projectId }: Props) {
  const store = useStore()
  const [rows, setRows] = useState<any[]>([])

  const site = store.getSiteDesign(projectId)
  const land = store.getLandTerms(projectId)
  const costData = store.getCostStack(projectId)
  const inKindLineItem = land.isInKind && land.inKindGFA > 0 ? { label: land.inKindLabel, gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote } : undefined

  useEffect(() => {
    const scenarios = store.getMixScenarios(projectId)
    const landEff = store.getEffectiveLandCost(projectId)   // land into TDC; RLV engine still gets land-excluded cost
    const computed: any[] = []

    for (const s of scenarios) {
      const units = store.getUnitTypes(s.id)
      const btrA = store.getBTRAssumptions(s.id)
      const btsA = store.getBTSAssumptions(s.id)
      const hotelA = store.getHotelAssumptions(s.id)
      let btsAggRevenue = 0   // resi BTS aggressive, for the blended (sell resi + hold hotel) strategy

      // Respect scenario-level cost overrides (e.g. modular build rate)
      const effectiveBuildRate = hotelA.buildRateOverride ?? costData.buildRatePerSqm
      const effectiveFinancePct = hotelA.constructionFinancePct ?? costData.financePct
      const tdc = calculateCostStack({ ...costData, buildRatePerSqm: effectiveBuildRate, financePct: effectiveFinancePct, gba: site.resiGBA, inKindLineItem, landCost: land.landCost }).totalDevelopmentCost

      // Solve inline for always-current counts
      const sr = site.resiNSA > 0 && units.length > 0
        ? solveUnitMix(site.resiNSA, units.map(u => ({ name: u.name, nsaPerUnit: u.nsaPerUnit, targetPct: u.targetPct })))
        : null
      const hasResidentialUnits = (sr ? sr.solvedUnits > 0 : units.some(u => u.solvedCount > 0))
        && units.some(u => u.weeklyRentConservative > 0 || u.salePriceConservative > 0)

      // BTR
      if (hasResidentialUnits) {
        const unitLines = units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, weeklyRentConservative: u.weeklyRentConservative, weeklyRentAggressive: u.weeklyRentAggressive, opexPerUnitPerYear: u.opexPerUnitPerYear }))
        const btrInputs = { unitLines, vacancyPct: btrA.vacancyPct, managementFeePct: btrA.managementFeePct, commercialIncomeLines: [], carParkIncomeAnnual: btrA.carParkIncomeAnnual, buildingAdminFixed: btrA.buildingAdminFixed }
        const consI = calculateBTRIncome(btrInputs, 'conservative')
        const aggI = calculateBTRIncome(btrInputs, 'aggressive')
        const consV = calculateBTRValuation(consI.noi, btrA.capRateConservative, tdc, btrA.devMarginPct)
        const aggV = calculateBTRValuation(aggI.noi, btrA.capRateAggressive, tdc, btrA.devMarginPct)
        computed.push({ scenario: s.name, type: 'BTR (Conservative)', noi: consI.noi, gav: consV.gav, tdc: tdc + landEff, rlv: consV.rlv })
        computed.push({ scenario: s.name, type: 'BTR (Aggressive)', noi: aggI.noi, gav: aggV.gav, tdc: tdc + landEff, rlv: aggV.rlv })

        // BTS
        const btsLines = { cons: units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, pricePerUnit: u.salePriceConservative })), mid: units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, pricePerUnit: u.salePriceMid })), agg: units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, pricePerUnit: u.salePriceAggressive })) }
        const otherRev = site.childcareGFA > 0 ? [{ label: 'Childcare', amount: site.childcareGFA * btsA.childcareValuePerSqm }] : []
        const btsCons = calculateBTSValuation(btsLines.cons, otherRev, btsA.sellingCostsPct, tdc, btsA.devMarginPct, costData.gstEnabled)
        const btsMid = calculateBTSValuation(btsLines.mid, otherRev, btsA.sellingCostsPct, tdc, btsA.devMarginPct, costData.gstEnabled)
        const btsAgg = calculateBTSValuation(btsLines.agg, otherRev, btsA.sellingCostsPct, tdc, btsA.devMarginPct, costData.gstEnabled)
        computed.push({ scenario: s.name, type: 'BTS (Conservative)', noi: null, gav: btsCons.grossRevenue, tdc: tdc + landEff, rlv: btsCons.rlv })
        computed.push({ scenario: s.name, type: 'BTS (Mid)', noi: null, gav: btsMid.grossRevenue, tdc: tdc + landEff, rlv: btsMid.rlv })
        computed.push({ scenario: s.name, type: 'BTS (Aggressive)', noi: null, gav: btsAgg.grossRevenue, tdc: tdc + landEff, rlv: btsAgg.rlv })
        btsAggRevenue = btsAgg.grossRevenue
      }

      // Hotel — only show if keys are configured
      if (hotelA.keys > 0) {
        const hotelI = calculateHotelIncome(hotelA)
        const hotelV = calculateHotelValuation(hotelI.noi, hotelA.hotelCapRate, tdc, hotelA.devMarginPct)
        const note = hotelA.buildRateOverride != null
          ? `Modular build $${hotelA.buildRateOverride.toLocaleString()}/sqm — cost savings flow to RLV`
          : undefined
        computed.push({ scenario: s.name, type: 'Hotel', noi: hotelI.noi, gav: hotelV.gav, tdc: tdc + landEff, rlv: hotelV.rlv, note })

        // Blended (recommended) — sell the resi (aggressive BTS) AND hold the hotel as an
        // income asset. The hotel GAV that the pure-BTS row ignores is credited here.
        if (btsAggRevenue > 0) {
          const blendedGav = btsAggRevenue + hotelV.gav
          computed.push({
            scenario: s.name, type: 'Blended — Resi BTS + Hotel hold', noi: hotelI.noi,
            gav: blendedGav, tdc: tdc + landEff, rlv: blendedGav - tdc,
            note: 'Sell resi (aggressive) + hold hotel. Medical B2 sale (~$90M) is additional upside on top.',
          })
        }
      }
    }

    // Tag best RLV
    const maxRLV = Math.max(...computed.map(r => r.rlv))
    setRows(computed.map(r => ({ ...r, isBest: r.rlv === maxRLV && maxRLV > 0 })))
  }, [projectId])


  // The design's sign-off: one quiet serif line. (Was a 195px inverted logo plus
  // a 72px "BIG or small." lockup — the design keeps the tagline, not the block.)
  const Tagline = () => (
    <div style={{ textAlign: 'center', padding: '34px 20px 6px', fontFamily: 'var(--serif)', fontSize: 21, fontWeight: 500, color: 'var(--ink-3)', letterSpacing: '.01em' }}>
      We have a HAAVN for every adventure, <em style={{ fontStyle: 'italic' }}>big</em> or small.
    </div>
  )

  if (rows.length === 0) return (
    <div className="flex flex-col">
      <div>
        <div className="subtitle">Scenario Comparison</div>
        <div className="desc">All scenarios ranked by RLV — the full outcome matrix.</div>
      </div>
      <div className="guide" style={{ marginTop: 14 }}>
        Complete at least one mix scenario with unit counts to see the comparison matrix.
      </div>
      <Tagline />
    </div>
  )

  return (
    <div className="flex flex-col">
      {/* Head — serif subtitle + desc (design) */}
      <div>
        <div className="subtitle">Scenario Comparison</div>
        <div className="desc">All scenarios ranked by RLV — the full outcome matrix.</div>
      </div>

      <div style={{ overflowX: 'auto', marginTop: 16 }}>
        <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 620 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Mix Scenario', 'Strategy', 'NOI / Revenue', 'GAV', 'TDC', 'RLV', 'Verdict'].map((h, i) => (
                <th key={h} style={{ textAlign: i >= 2 && i <= 5 ? 'right' : 'left', padding: '0 16px 11px', fontSize: 9, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows].sort((a, b) => b.rlv - a.rlv).map((r, i) => (
              <tr key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line)', background: r.isBest ? 'var(--gold-soft)' : 'transparent' }}>
                <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{r.scenario}</span>
                  {r.note && <span style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '.06em', display: 'block', marginTop: 2 }}>{r.note}</span>}
                </td>
                <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 12.5, fontWeight: r.isBest ? 700 : 500, color: r.isBest ? 'var(--gold)' : 'var(--ink-2)' }}>
                    {r.isBest ? '★ ' : ''}{r.type}
                  </span>
                </td>
                <td style={{ padding: '13px 16px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                  {r.noi != null ? `$${(r.noi / 1_000_000).toFixed(2)}M NOI` : `$${(r.gav / 1_000_000).toFixed(1)}M Rev`}
                </td>
                <td style={{ padding: '13px 16px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--ink)' }}>${(r.gav / 1_000_000).toFixed(1)}M</td>
                <td style={{ padding: '13px 16px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>${(r.tdc / 1_000_000).toFixed(1)}M</td>
                <td style={{ padding: '13px 16px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 700, color: r.rlv >= 0 ? 'var(--emerald)' : 'var(--red)', whiteSpace: 'nowrap' }}>
                  {r.rlv < 0 ? '−' : ''}${Math.abs(r.rlv / 1_000_000).toFixed(1)}M
                </td>
                <td style={{ padding: '13px 16px' }}><VerdictBadge rlv={r.rlv} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Tagline />
    </div>
  )
}
