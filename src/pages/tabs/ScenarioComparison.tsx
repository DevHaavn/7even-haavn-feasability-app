import React, { useEffect, useState } from 'react'
import { useStore } from '../../store'
import { SectionHeading, Money, VerdictBadge, Wordmark } from '../../components/ui'
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
      const tdc = calculateCostStack({ ...costData, buildRatePerSqm: effectiveBuildRate, financePct: effectiveFinancePct, gba: site.resiGBA, inKindLineItem }).totalDevelopmentCost

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
        computed.push({ scenario: s.name, type: 'BTR (Conservative)', noi: consI.noi, gav: consV.gav, tdc, rlv: consV.rlv })
        computed.push({ scenario: s.name, type: 'BTR (Aggressive)', noi: aggI.noi, gav: aggV.gav, tdc, rlv: aggV.rlv })

        // BTS
        const btsLines = { cons: units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, pricePerUnit: u.salePriceConservative })), mid: units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, pricePerUnit: u.salePriceMid })), agg: units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, pricePerUnit: u.salePriceAggressive })) }
        const otherRev = site.childcareGFA > 0 ? [{ label: 'Childcare', amount: site.childcareGFA * btsA.childcareValuePerSqm }] : []
        const btsCons = calculateBTSValuation(btsLines.cons, otherRev, btsA.sellingCostsPct, tdc, btsA.devMarginPct, costData.gstEnabled)
        const btsMid = calculateBTSValuation(btsLines.mid, otherRev, btsA.sellingCostsPct, tdc, btsA.devMarginPct, costData.gstEnabled)
        const btsAgg = calculateBTSValuation(btsLines.agg, otherRev, btsA.sellingCostsPct, tdc, btsA.devMarginPct, costData.gstEnabled)
        computed.push({ scenario: s.name, type: 'BTS (Conservative)', noi: null, gav: btsCons.grossRevenue, tdc, rlv: btsCons.rlv })
        computed.push({ scenario: s.name, type: 'BTS (Mid)', noi: null, gav: btsMid.grossRevenue, tdc, rlv: btsMid.rlv })
        computed.push({ scenario: s.name, type: 'BTS (Aggressive)', noi: null, gav: btsAgg.grossRevenue, tdc, rlv: btsAgg.rlv })
        btsAggRevenue = btsAgg.grossRevenue
      }

      // Hotel — only show if keys are configured
      if (hotelA.keys > 0) {
        const hotelI = calculateHotelIncome(hotelA)
        const hotelV = calculateHotelValuation(hotelI.noi, hotelA.hotelCapRate, tdc, hotelA.devMarginPct)
        const note = hotelA.buildRateOverride != null
          ? `Modular build $${hotelA.buildRateOverride.toLocaleString()}/sqm — cost savings flow to RLV`
          : undefined
        computed.push({ scenario: s.name, type: 'Hotel', noi: hotelI.noi, gav: hotelV.gav, tdc, rlv: hotelV.rlv, note })

        // Blended (recommended) — sell the resi (aggressive BTS) AND hold the hotel as an
        // income asset. The hotel GAV that the pure-BTS row ignores is credited here.
        if (btsAggRevenue > 0) {
          const blendedGav = btsAggRevenue + hotelV.gav
          computed.push({
            scenario: s.name, type: 'Blended — Resi BTS + Hotel hold', noi: hotelI.noi,
            gav: blendedGav, tdc, rlv: blendedGav - tdc,
            note: 'Sell resi (aggressive) + hold hotel. Medical B2 sale (~$90M) is additional upside on top.',
          })
        }
      }
    }

    // Tag best RLV
    const maxRLV = Math.max(...computed.map(r => r.rlv))
    setRows(computed.map(r => ({ ...r, isBest: r.rlv === maxRLV && maxRLV > 0 })))
  }, [projectId])


  if (rows.length === 0) return (
    <div className="flex flex-col">
      <div className="p-6">
        <p className="text-[#888] text-sm border border-[#E8E5E0] bg-white inline-block p-4">
          Complete at least one mix scenario with unit counts to see the comparison matrix.
        </p>
      </div>
      <div style={{ padding: '80px 40px 72px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, background: '#ECEAE7' }}>
        <img src="/brand-logo-white.png" alt="7EVEN · HAAVN" draggable={false} style={{ width: 195, height: 'auto', objectFit: 'contain', filter: 'invert(1)' }} />
        <p style={{ color: '#888', fontSize: 13, letterSpacing: '0.08em', textAlign: 'center', fontStyle: 'italic' }}>
          We have a HAAVN for <em style={{ fontStyle: 'normal', fontWeight: 700, color: '#555' }}>every</em> adventure,
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 32 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 72, fontWeight: 900, letterSpacing: '-0.02em', color: '#1A1A1A', lineHeight: 1 }}>BIG</span>
          <span style={{ fontSize: 13, color: '#999', letterSpacing: '0.12em' }}>or</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 36, fontStyle: 'italic', fontWeight: 300, color: '#1A1A1A', letterSpacing: '0.01em' }}>small.</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col">
      <div className="relative p-4 md:p-6">
      <SectionHeading sub="All scenarios ranked by RLV — the full outcome matrix">Scenario Comparison</SectionHeading>

      <div className="border border-[#E0DDD8] bg-white overflow-x-auto mt-2">
        <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 540 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E0DDD8', background: '#F7F5F2' }}>
              {['Mix Scenario', 'Strategy', 'NOI / Revenue', 'GAV', 'TDC', 'RLV', 'Verdict'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows].sort((a, b) => b.rlv - a.rlv).map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F0EDE8', background: r.isBest ? '#FDFBF4' : 'white' }}>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: 11, color: '#888', display: 'block' }}>{r.scenario}</span>
                  {r.note && <span style={{ fontSize: 9, color: '#B8963C', letterSpacing: '0.06em', display: 'block', marginTop: 2 }}>{r.note}</span>}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: r.isBest ? '#B8963C' : '#1A1A1A' }}>
                    {r.isBest ? '★ ' : ''}{r.type}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', fontSize: 11, color: '#666', fontFamily: 'monospace' }}>
                  {r.noi != null ? `$${(r.noi / 1_000_000).toFixed(2)}M NOI` : `$${(r.gav / 1_000_000).toFixed(1)}M Rev`}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#1A1A1A' }}>${(r.gav / 1_000_000).toFixed(1)}M</span>
                </td>
                <td style={{ padding: '10px 16px', fontSize: 11, color: '#888', fontFamily: 'monospace' }}>${(r.tdc / 1_000_000).toFixed(1)}M</td>
                <td style={{ padding: '10px 16px' }}><Money value={r.rlv} size="md" /></td>
                <td style={{ padding: '10px 16px' }}><VerdictBadge rlv={r.rlv} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {/* Brand + tagline section */}
      <div style={{ padding: '80px 40px 72px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, background: '#ECEAE7' }}>
        <img src="/brand-logo-white.png" alt="7EVEN · HAAVN" draggable={false} style={{ width: 195, height: 'auto', objectFit: 'contain', filter: 'invert(1)' }} />
        <p style={{ color: '#888', fontSize: 13, letterSpacing: '0.08em', textAlign: 'center', fontStyle: 'italic' }}>
          We have a HAAVN for <em style={{ fontStyle: 'normal', fontWeight: 700, color: '#555' }}>every</em> adventure,
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 32 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 72, fontWeight: 900, letterSpacing: '-0.02em', color: '#1A1A1A', lineHeight: 1 }}>BIG</span>
          <span style={{ fontSize: 13, color: '#999', letterSpacing: '0.12em' }}>or</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 36, fontStyle: 'italic', fontWeight: 300, color: '#1A1A1A', letterSpacing: '0.01em' }}>small.</span>
        </div>
      </div>

      {/* Render strip */}
    </div>
  )
}
