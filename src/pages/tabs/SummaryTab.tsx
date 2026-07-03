import SiteLinks from '../../components/SiteLinks'
import React, { useEffect, useState, Component } from 'react'

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  constructor(props: any) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, color: '#1A1A1A', fontFamily: 'monospace', fontSize: 12 }}>
        <p style={{ color: '#9B2335', marginBottom: 8 }}>Summary tab error:</p>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{this.state.error}</pre>
      </div>
    )
    return this.props.children
  }
}
import { useStore } from '../../store'
import { Wordmark, Money, VerdictBadge } from '../../components/ui'
import { calculateBTRIncome, calculateBTRValuation } from '../../engine/btr'
import { calculateBTSValuation } from '../../engine/bts'
import { calculateHotelIncome, calculateHotelValuation } from '../../engine/hotel'
import { calculateCostStack } from '../../engine/costStack'
import { solveUnitMix } from '../../engine/unitMix'

interface Props { projectId: string }

const fmt = (n: number) => n >= 1_000_000
  ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n.toLocaleString()}`

const pct = (n: number) => `${(n * 100).toFixed(1)}%`

function Row({ label, value, highlight, gold, large }: { label: string; value: string; highlight?: boolean; gold?: boolean; large?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 16px', borderBottom: '1px solid #F0EDE8',
      background: highlight ? '#FDFBF4' : 'transparent',
    }}>
      <span style={{ color: '#666', fontSize: large ? 13 : 11, letterSpacing: '0.04em' }}>{label}</span>
      <span style={{
        fontFamily: 'monospace', fontWeight: 700,
        fontSize: large ? 18 : 13,
        color: gold ? '#C4973A' : '#1A1A1A',
      }}>{value}</span>
    </div>
  )
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ width: 3, height: 22, background: '#C4973A', flexShrink: 0 }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1A1A1A', margin: 0 }}>{title}</h2>
      </div>
      {sub && <p style={{ color: '#999', fontSize: 10, letterSpacing: '0.08em', marginLeft: 13, marginBottom: 10 }}>{sub}</p>}
      <div style={{ border: '1px solid #E8E5E0', background: '#fff' }}>{children}</div>
    </div>
  )
}

function LVRSection({ landCost, tdc }: { landCost: number; tdc: number }) {
  const [landLVR, setLandLVR] = useState(0.65)
  const [constLVR, setConstLVR] = useState(0.65)

  const landDebt = landCost * landLVR
  const landEquity = landCost * (1 - landLVR)
  const constDebt = tdc * constLVR
  const constEquity = tdc * (1 - constLVR)
  const totalDebt = landDebt + constDebt
  const totalEquity = landEquity + constEquity
  const totalCost = landCost + tdc

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ width: 3, height: 22, background: '#C4973A', flexShrink: 0 }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1A1A1A', margin: 0 }}>LVR & Capital Deployment</h2>
      </div>
      <p style={{ color: '#999', fontSize: 10, letterSpacing: '0.08em', marginLeft: 13, marginBottom: 10 }}>Required equity by phase — adjust LVR assumptions below</p>

      {/* LVR Inputs */}
      <div style={{ border: '1px solid #E8E5E0', background: '#fff', marginBottom: 12, padding: '14px 16px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', color: '#888', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Land Phase LVR</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="range" min={0} max={80} value={Math.round(landLVR * 100)}
              onChange={e => setLandLVR(parseInt(e.target.value) / 100)}
              style={{ width: 120, accentColor: '#C4973A' }} />
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#C4973A', width: 40 }}>{Math.round(landLVR * 100)}%</span>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', color: '#888', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Construction LVR</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="range" min={0} max={80} value={Math.round(constLVR * 100)}
              onChange={e => setConstLVR(parseInt(e.target.value) / 100)}
              style={{ width: 120, accentColor: '#C4973A' }} />
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#C4973A', width: 40 }}>{Math.round(constLVR * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Land Phase */}
      <div style={{ border: '1px solid #E8E5E0', background: '#fff', marginBottom: 12 }}>
        <div style={{ padding: '8px 16px', background: '#F7F5F2', borderBottom: '1px solid #E8E5E0' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', fontWeight: 600 }}>Land Phase</span>
        </div>
        <Row label="Land Cost (Total)" value={fmt(landCost)} />
        <Row label={`Bank Debt (${Math.round(landLVR * 100)}% LVR)`} value={fmt(landDebt)} />
        <Row label="Equity Required — Land" value={fmt(landEquity)} highlight gold />
      </div>

      {/* Construction Phase */}
      <div style={{ border: '1px solid #E8E5E0', background: '#fff', marginBottom: 12 }}>
        <div style={{ padding: '8px 16px', background: '#F7F5F2', borderBottom: '1px solid #E8E5E0' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', fontWeight: 600 }}>Construction Phase</span>
        </div>
        <Row label="Total Development Cost" value={fmt(tdc)} />
        <Row label={`Bank Debt (${Math.round(constLVR * 100)}% LVR)`} value={fmt(constDebt)} />
        <Row label="Equity Required — Construction" value={fmt(constEquity)} highlight gold />
      </div>

      {/* Total */}
      <div style={{ border: '1px solid #C4973A', background: '#FDFBF4' }}>
        <div style={{ padding: '8px 16px', background: '#F5EDD6', borderBottom: '1px solid #E8D9A0' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8A6A10', fontWeight: 700 }}>Total Capital Summary</span>
        </div>
        <Row label="Total Project Cost (Land + TDC)" value={fmt(totalCost)} />
        <Row label="Total Bank Debt" value={fmt(totalDebt)} />
        <Row label="TOTAL EQUITY REQUIRED" value={fmt(totalEquity)} highlight large gold />
        <div style={{ padding: '8px 16px', borderTop: '1px solid #E8D9A0' }}>
          <span style={{ fontSize: 10, color: '#999', letterSpacing: '0.06em' }}>
            Effective blended LVR: {totalCost > 0 ? Math.round((totalDebt / totalCost) * 100) : 0}%
          </span>
        </div>
      </div>
    </div>
  )
}

function SummaryTabInner({ projectId }: Props) {
  const store = useStore()
  const project = store.projects.find(p => p.id === projectId)
  const site = store.getSiteDesign(projectId)
  const land = store.getLandTerms(projectId)
  const costData = store.getCostStack(projectId)
  const [bestRow, setBestRow] = useState<any>(null)
  const [allRows, setAllRows] = useState<any[]>([])

  const inKindLineItem = land.isInKind && land.inKindGFA > 0
    ? { label: land.inKindLabel, gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote }
    : undefined
  const costResult = calculateCostStack({ ...costData, gba: site.resiGBA, inKindLineItem })
  const tdc = costResult.totalDevelopmentCost

  useEffect(() => {
    const scenarios = store.getMixScenarios(projectId)
    const computed: any[] = []
    for (const s of scenarios) {
      const units = store.getUnitTypes(s.id)
      const btrA = store.getBTRAssumptions(s.id)
      const btsA = store.getBTSAssumptions(s.id)
      const hotelA = store.getHotelAssumptions(s.id)
      const sr = site.resiNSA > 0 && units.length > 0
        ? solveUnitMix(site.resiNSA, units.map(u => ({ name: u.name, nsaPerUnit: u.nsaPerUnit, targetPct: u.targetPct })))
        : null
      const hasUnits = sr ? sr.solvedUnits > 0 : units.some(u => u.solvedCount > 0)
      if (hasUnits) {
        const unitLines = units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, weeklyRentConservative: u.weeklyRentConservative, weeklyRentAggressive: u.weeklyRentAggressive, opexPerUnitPerYear: u.opexPerUnitPerYear }))
        const btrInputs = { unitLines, vacancyPct: btrA.vacancyPct, managementFeePct: btrA.managementFeePct, commercialIncomeLines: [], carParkIncomeAnnual: btrA.carParkIncomeAnnual, buildingAdminFixed: btrA.buildingAdminFixed }
        const consI = calculateBTRIncome(btrInputs, 'conservative')
        const aggI = calculateBTRIncome(btrInputs, 'aggressive')
        const consV = calculateBTRValuation(consI.noi, btrA.capRateConservative, tdc, btrA.devMarginPct)
        const aggV = calculateBTRValuation(aggI.noi, btrA.capRateAggressive, tdc, btrA.devMarginPct)
        computed.push({ scenario: s.name, type: 'BTR (Conservative)', noi: consI.noi, gav: consV.gav, tdc, rlv: consV.rlv })
        computed.push({ scenario: s.name, type: 'BTR (Aggressive)', noi: aggI.noi, gav: aggV.gav, tdc, rlv: aggV.rlv })
        const btsLines = {
          cons: units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, pricePerUnit: u.salePriceConservative })),
          agg: units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, pricePerUnit: u.salePriceAggressive })),
        }
        const otherRev = site.childcareGFA > 0 ? [{ label: 'Childcare', amount: site.childcareGFA * btsA.childcareValuePerSqm }] : []
        const btsCons = calculateBTSValuation(btsLines.cons, otherRev, btsA.sellingCostsPct, tdc, btsA.devMarginPct)
        const btsAgg = calculateBTSValuation(btsLines.agg, otherRev, btsA.sellingCostsPct, tdc, btsA.devMarginPct)
        computed.push({ scenario: s.name, type: 'BTS (Conservative)', noi: null, gav: btsCons.grossRevenue, tdc, rlv: btsCons.rlv })
        computed.push({ scenario: s.name, type: 'BTS (Aggressive)', noi: null, gav: btsAgg.grossRevenue, tdc, rlv: btsAgg.rlv })
      }
      if (store.getHotelAssumptions(s.id).keys > 0) {
        const hotelI = calculateHotelIncome(hotelA)
        const hotelV = calculateHotelValuation(hotelI.noi, hotelA.hotelCapRate, tdc, hotelA.devMarginPct)
        computed.push({ scenario: s.name, type: 'Hotel', noi: hotelI.noi, gav: hotelV.gav, tdc, rlv: hotelV.rlv })
      }
    }
    const maxRLV = Math.max(...computed.map(r => r.rlv))
    const rows = computed.map(r => ({ ...r, isBest: r.rlv === maxRLV && maxRLV > 0 }))
    setAllRows(rows)
    setBestRow(rows.find(r => r.isBest) ?? rows[0] ?? null)
  }, [projectId])

  const landCost = land.landCost ?? 0

  return (
    <div className="flex flex-col">
      <div style={{ padding: '32px 40px', maxWidth: 900, width: '100%', margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, paddingBottom: 24, borderBottom: '1px solid #E8E5E0' }}>
          <div>
            <p style={{ color: '#C4973A', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 6 }}>Executive Summary</p>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 300, fontSize: 28, letterSpacing: '0.06em', color: '#1A1A1A', margin: 0 }}>{project?.name ?? 'Project'}</h1>
            {project?.address && <p style={{ color: '#999', fontSize: 12, marginTop: 6, letterSpacing: '0.04em' }}>{project.address}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <Wordmark size="md" />
            <p style={{ color: '#BBB', fontSize: 9, letterSpacing: '0.18em', marginTop: 8, textTransform: 'uppercase' }}>
              {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* ── Best Scenario Hero ── */}
        {bestRow && (
          <div style={{ border: '1px solid #C4973A', background: '#FDFBF4', padding: '24px 28px', marginBottom: 36, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 24 }}>
            <div style={{ gridColumn: '1/-1', marginBottom: 8 }}>
              <p style={{ color: '#C4973A', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', margin: 0 }}>★ Best Scenario — {bestRow.scenario} · {bestRow.type}</p>
            </div>
            {[
              { label: bestRow.noi != null ? 'Net Operating Income' : 'Gross Revenue', value: fmt(bestRow.noi ?? bestRow.gav) },
              { label: 'Gross Asset Value', value: fmt(bestRow.gav) },
              { label: 'Total Dev Cost', value: fmt(bestRow.tdc) },
              { label: 'Residual Land Value', value: fmt(bestRow.rlv) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ color: '#999', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 6px' }}>{label}</p>
                <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: '#1A1A1A', margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Site Areas ── */}
        <Section title="Site & Design" sub="Gross and net floor areas">
          <Row label="Residential NSA" value={`${(site.resiNSA ?? 0).toLocaleString()} sqm`} />
          <Row label="Residential GFA" value={`${(site.resiGFA ?? 0).toLocaleString()} sqm`} />
          <Row label="Residential GBA" value={`${(site.resiGBA ?? 0).toLocaleString()} sqm`} />
          <Row label="Balcony" value={`${(site.balcony ?? 0).toLocaleString()} sqm`} />
          <Row label="Basement" value={`${(site.basementTotal ?? 0).toLocaleString()} sqm`} />
          <Row label="Car Spaces" value={`${site.carSpaces ?? 0}`} />
          {(site.childcareGFA ?? 0) > 0 && <Row label="Childcare GFA" value={`${site.childcareGFA.toLocaleString()} sqm`} />}
          {(site.resiNSA ?? 0) > 0 && (site.resiGFA ?? 0) > 0 && (
            <Row label="NSA/GFA Efficiency" value={pct(site.resiNSA / site.resiGFA)} highlight />
          )}
        </Section>

        {/* ── Land & Terms ── */}
        <Section title="Land & Terms" sub="Acquisition cost and structure">
          <Row label="Land Cost" value={fmt(landCost)} gold />
          {land.isInKind && land.inKindGFA > 0 && <Row label="In-Kind Delivery GFA" value={`${land.inKindGFA.toLocaleString()} sqm`} />}
          {land.isInKind && land.inKindGFA > 0 && <Row label={`In-Kind (${land.inKindLabel})`} value={`${land.inKindGFA.toLocaleString()} sqm`} />}
        </Section>

        {/* ── Cost Stack ── */}
        <Section title="Total Development Cost" sub="Construction and associated costs">
          <Row label="Construction" value={fmt(costResult.construction)} />
          <Row label="Contingency" value={fmt(costResult.contingency)} />
          <Row label="Prelims" value={fmt(costResult.prelims)} />
          <Row label="Professional Fees" value={fmt(costResult.professionalFees)} />
          <Row label="Finance" value={fmt(costResult.finance)} />
          {costResult.inKindCost > 0 && <Row label="In-Kind Delivery Cost" value={fmt(costResult.inKindCost)} />}
          <Row label="TOTAL DEVELOPMENT COST" value={fmt(tdc)} highlight large gold />
          {site.resiGBA > 0 && tdc > 0 && <Row label="All-in Rate per GBA sqm" value={`$${Math.round(tdc / site.resiGBA).toLocaleString()}/sqm`} />}
        </Section>

        {/* ── All Scenarios ── */}
        {allRows.length > 0 && (
          <Section title="All Scenarios" sub="Full outcome matrix ranked by RLV">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                <thead>
                  <tr style={{ background: '#F7F5F2', borderBottom: '1px solid #E0DDD8' }}>
                    {['Scenario', 'Strategy', 'NOI / Revenue', 'GAV', 'RLV', 'Verdict'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...allRows].sort((a, b) => b.rlv - a.rlv).map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F0EDE8', background: r.isBest ? '#FDFBF4' : '#fff' }}>
                      <td style={{ padding: '9px 14px', fontSize: 11, color: '#888' }}>{r.scenario}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, color: r.isBest ? '#B8963C' : '#1A1A1A' }}>{r.isBest ? '★ ' : ''}{r.type}</td>
                      <td style={{ padding: '9px 14px', fontSize: 11, fontFamily: 'monospace', color: '#555' }}>{r.noi != null ? fmt(r.noi) + ' NOI' : fmt(r.gav) + ' Rev'}</td>
                      <td style={{ padding: '9px 14px', fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: '#1A1A1A' }}>{fmt(r.gav)}</td>
                      <td style={{ padding: '9px 14px' }}><Money value={r.rlv} size="md" /></td>
                      <td style={{ padding: '9px 14px' }}><VerdictBadge rlv={r.rlv} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── Profit & Exit Valuation ── */}
        {bestRow && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 3, height: 22, background: '#C4973A', flexShrink: 0 }} />
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1A1A1A', margin: 0 }}>Profit & Exit Valuation</h2>
            </div>
            <p style={{ color: '#999', fontSize: 10, letterSpacing: '0.08em', marginLeft: 13, marginBottom: 10 }}>Developer returns and asset exit analysis — best scenario</p>

            {/* Hero profit card */}
            {(() => {
              const isBTRorHotel = (bestRow.type?.startsWith('BTR') || bestRow.type === 'Hotel') && bestRow.noi != null
              const exitVal = isBTRorHotel ? bestRow.noi / 0.05 : bestRow.gav
              const profit = exitVal - bestRow.tdc
              const margin = bestRow.tdc > 0 ? (profit / bestRow.tdc) * 100 : 0
              const profitColor = profit > 0 ? '#2A7A4F' : '#9B2335'
              return (
                <div style={{ border: '1px solid #C4973A', background: '#FDFBF4', padding: '20px 24px', marginBottom: 14 }}>
                  <p style={{ color: '#C4973A', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', margin: '0 0 16px' }}>★ {bestRow.scenario} · {bestRow.type}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 20 }}>
                    {bestRow.noi != null && (
                      <div>
                        <p style={{ color: '#999', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 5px' }}>Net Operating Income</p>
                        <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: '#1A1A1A', margin: 0 }}>{fmt(bestRow.noi)}</p>
                        <p style={{ color: '#BBB', fontSize: 9, margin: '3px 0 0', letterSpacing: '0.08em' }}>per annum</p>
                      </div>
                    )}
                    {isBTRorHotel ? (
                      <div>
                        <p style={{ color: '#999', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 5px' }}>Exit Value @ 5% Cap Rate</p>
                        <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: '#1A1A1A', margin: 0 }}>{fmt(exitVal)}</p>
                        <p style={{ color: '#BBB', fontSize: 9, margin: '3px 0 0', letterSpacing: '0.08em' }}>NOI ÷ 5%</p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ color: '#999', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 5px' }}>Gross Revenue</p>
                        <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: '#1A1A1A', margin: 0 }}>{fmt(bestRow.gav)}</p>
                        <p style={{ color: '#BBB', fontSize: 9, margin: '3px 0 0', letterSpacing: '0.08em' }}>sale proceeds</p>
                      </div>
                    )}
                    <div>
                      <p style={{ color: '#999', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 5px' }}>Total Dev Cost</p>
                      <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: '#1A1A1A', margin: 0 }}>{fmt(bestRow.tdc)}</p>
                      <p style={{ color: '#BBB', fontSize: 9, margin: '3px 0 0', letterSpacing: '0.08em' }}>all-in TDC</p>
                    </div>
                    <div>
                      <p style={{ color: '#999', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 5px' }}>Developer Profit</p>
                      <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: profitColor, margin: 0 }}>{profit >= 0 ? '+' : ''}{fmt(profit)}</p>
                      <p style={{ color: '#BBB', fontSize: 9, margin: '3px 0 0', letterSpacing: '0.08em' }}>exit value − TDC</p>
                    </div>
                    <div>
                      <p style={{ color: '#999', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 5px' }}>Profit Margin</p>
                      <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: profitColor, margin: 0 }}>{margin.toFixed(1)}%</p>
                      <p style={{ color: '#BBB', fontSize: 9, margin: '3px 0 0', letterSpacing: '0.08em' }}>on TDC</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* All-scenario exit table */}
            {allRows.length > 1 && (
              <div style={{ border: '1px solid #E8E5E0', background: '#fff' }}>
                <div style={{ padding: '8px 16px', background: '#F7F5F2', borderBottom: '1px solid #E8E5E0' }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', fontWeight: 600 }}>Exit Analysis — All Scenarios</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                    <thead>
                      <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #E8E5E0' }}>
                        {['Strategy', 'NOI / Revenue', 'Exit @ 5% Cap', 'TDC', 'Dev Profit', 'Margin %'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...allRows].sort((a, b) => b.rlv - a.rlv).map((r, i) => {
                        const isBH = (r.type?.startsWith('BTR') || r.type === 'Hotel') && r.noi != null
                        const exitVal = isBH ? r.noi / 0.05 : r.gav
                        const profit = exitVal - r.tdc
                        const margin = r.tdc > 0 ? (profit / r.tdc) * 100 : 0
                        const pc = profit > 0 ? '#2A7A4F' : '#9B2335'
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #F0EDE8', background: r.isBest ? '#FDFBF4' : '#fff' }}>
                            <td style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: r.isBest ? '#B8963C' : '#1A1A1A' }}>{r.isBest ? '★ ' : ''}{r.type}</td>
                            <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'monospace', color: '#555' }}>{r.noi != null ? fmt(r.noi) : fmt(r.gav)}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#1A1A1A' }}>{isBH ? fmt(exitVal) : '—'}</td>
                            <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'monospace', color: '#777' }}>{fmt(r.tdc)}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: pc }}>{profit >= 0 ? '+' : ''}{fmt(profit)}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: pc }}>{margin.toFixed(1)}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '8px 14px', borderTop: '1px solid #F0EDE8' }}>
                  <span style={{ fontSize: 9, color: '#BBB', letterSpacing: '0.08em' }}>BTR/Hotel exit = NOI ÷ 5% cap rate · BTS = gross sales revenue · Profit = Exit Value − TDC</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LVR & Capital ── */}
        <LVRSection landCost={landCost} tdc={tdc} />

        {!bestRow && allRows.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#AAA', fontSize: 12 }}>
            Complete Site & Design, Cost Stack, and at least one Mix scenario to generate the summary.
          </div>
        )}

      </div>

      {/* Render strip */}
      <div style={{ height: 280, backgroundImage: 'url(/renders/haavn-hero.png)', backgroundSize: 'cover', backgroundPosition: 'center 55%', width: '100%', flexShrink: 0 }} />
      <SiteLinks />
    </div>
  )
}

export default function SummaryTab(props: Props) {
  return <ErrorBoundary><SummaryTabInner {...props} /></ErrorBoundary>
}
