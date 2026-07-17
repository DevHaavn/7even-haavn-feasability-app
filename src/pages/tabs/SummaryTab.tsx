import React, { useEffect, useState, Component } from 'react'

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  constructor(props: any) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, color: 'var(--ink)', fontFamily: 'monospace', fontSize: 12 }}>
        <p style={{ color: 'var(--red)', marginBottom: 8 }}>Summary tab error:</p>
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
import { getPhaseCosts, getTimelineTasks, getProjectTDC } from '../../db'
import { COST_PHASES, CATEGORY_TO_PHASE } from '../../db/schema'
import ProfitLens from '../../components/ProfitLens'
import InvestorReturn from '../../components/InvestorReturn'

interface Props { projectId: string }

const fmt = (n: number) => n >= 1_000_000
  ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n.toLocaleString()}`

const pct = (n: number) => `${(n * 100).toFixed(1)}%`

function Row({ label, value, highlight, gold, large }: { label: string; value: string; highlight?: boolean; gold?: boolean; large?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 16px', borderBottom: '1px solid var(--line)',
      background: highlight ? 'var(--card-2)' : 'transparent',
    }}>
      <span style={{ color: 'var(--ink-2)', fontSize: large ? 13 : 11, letterSpacing: '0.04em' }}>{label}</span>
      <span style={{
        fontFamily: 'monospace', fontWeight: 700,
        fontSize: large ? 18 : 13,
        color: gold ? 'var(--gold)' : 'var(--ink)',
      }}>{value}</span>
    </div>
  )
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ width: 3, height: 22, background: 'var(--gold)', flexShrink: 0 }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)', margin: 0 }}>{title}</h2>
      </div>
      {sub && <p style={{ color: 'var(--ink-3)', fontSize: 10, letterSpacing: '0.08em', marginLeft: 13, marginBottom: 10 }}>{sub}</p>}
      <div style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>{children}</div>
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
        <div style={{ width: 3, height: 22, background: 'var(--gold)', flexShrink: 0 }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)', margin: 0 }}>LVR & Capital Deployment</h2>
      </div>
      <p style={{ color: 'var(--ink-3)', fontSize: 10, letterSpacing: '0.08em', marginLeft: 13, marginBottom: 10 }}>Required equity by phase — adjust LVR assumptions below</p>

      {/* LVR Inputs */}
      <div style={{ border: '1px solid var(--border)', background: 'var(--card)', marginBottom: 12, padding: '14px 16px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', color: 'var(--ink-3)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Land Phase LVR</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="range" min={0} max={80} value={Math.round(landLVR * 100)}
              onChange={e => setLandLVR(parseInt(e.target.value) / 100)}
              style={{ width: 120, accentColor: 'var(--gold)' }} />
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: 'var(--gold)', width: 40 }}>{Math.round(landLVR * 100)}%</span>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', color: 'var(--ink-3)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Construction LVR</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="range" min={0} max={80} value={Math.round(constLVR * 100)}
              onChange={e => setConstLVR(parseInt(e.target.value) / 100)}
              style={{ width: 120, accentColor: 'var(--gold)' }} />
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: 'var(--gold)', width: 40 }}>{Math.round(constLVR * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Land Phase */}
      <div style={{ border: '1px solid var(--border)', background: 'var(--card)', marginBottom: 12 }}>
        <div style={{ padding: '8px 16px', background: 'var(--card-2)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 }}>Land Phase</span>
        </div>
        <Row label="Land Cost (Total)" value={fmt(landCost)} />
        <Row label={`Bank Debt (${Math.round(landLVR * 100)}% LVR)`} value={fmt(landDebt)} />
        <Row label="Equity Required — Land" value={fmt(landEquity)} highlight gold />
      </div>

      {/* Construction Phase */}
      <div style={{ border: '1px solid var(--border)', background: 'var(--card)', marginBottom: 12 }}>
        <div style={{ padding: '8px 16px', background: 'var(--card-2)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 }}>Construction Phase</span>
        </div>
        <Row label="Total Development Cost" value={fmt(tdc)} />
        <Row label={`Bank Debt (${Math.round(constLVR * 100)}% LVR)`} value={fmt(constDebt)} />
        <Row label="Equity Required — Construction" value={fmt(constEquity)} highlight gold />
      </div>

      {/* Total */}
      <div style={{ border: '1px solid var(--gold)', background: 'var(--card-2)' }}>
        <div style={{ padding: '8px 16px', background: 'var(--gold-soft)', borderBottom: '1px solid var(--gold-line)' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--amber)', fontWeight: 700 }}>Total Capital Summary</span>
        </div>
        <Row label="Total Project Cost (Land + TDC)" value={fmt(totalCost)} />
        <Row label="Total Bank Debt" value={fmt(totalDebt)} />
        <Row label="TOTAL EQUITY REQUIRED" value={fmt(totalEquity)} highlight large gold />
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--gold-line)' }}>
          <span style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
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
  const costResult = calculateCostStack({ ...costData, gba: site.resiGBA, inKindLineItem, landCost: land.landCost })
  const tdc = costResult.totalDevelopmentCost
  // Real project cost — all cost-stack costs + land + the REAL finance cost.
  const proj = getProjectTDC(projectId)

  // Cost of works + programme span + progress, by delivery phase
  const phaseRows = (() => {
    const costs = getPhaseCosts(projectId)
    const tasks = getTimelineTasks(projectId)
    return COST_PHASES.map(p => {
      const inPhase = tasks.filter(t => (t.phase ?? CATEGORY_TO_PHASE[t.category]) === p.id)
      const starts = inPhase.map(t => t.startDate).filter(Boolean).sort()
      const ends = inPhase.map(t => t.endDate).filter(Boolean).sort()
      const s = starts[0], e = ends[ends.length - 1]
      const span = s && e ? `${new Date(s + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })} → ${new Date(e + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })}` : ''
      return { id: p.id, label: p.label, cost: costs[p.id] || 0, tasks: inPhase.length, done: inPhase.filter(t => t.status === 'complete').length, span }
    })
  })()

  useEffect(() => {
    const scenarios = store.getMixScenarios(projectId)
    const landEff = store.getEffectiveLandCost(projectId)   // land into TDC; engines still get land-excluded cost for RLV
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
        computed.push({ scenario: s.name, type: 'BTR (Conservative)', noi: consI.noi, gav: consV.gav, tdc: tdc + landEff, rlv: consV.rlv })
        computed.push({ scenario: s.name, type: 'BTR (Aggressive)', noi: aggI.noi, gav: aggV.gav, tdc: tdc + landEff, rlv: aggV.rlv })
        const btsLines = {
          cons: units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, pricePerUnit: u.salePriceConservative })),
          agg: units.map((u, i) => ({ typeName: u.name, unitCount: sr?.mix[i]?.count ?? u.solvedCount ?? 0, pricePerUnit: u.salePriceAggressive })),
        }
        const otherRev = site.childcareGFA > 0 ? [{ label: 'Childcare', amount: site.childcareGFA * btsA.childcareValuePerSqm }] : []
        const btsCons = calculateBTSValuation(btsLines.cons, otherRev, btsA.sellingCostsPct, tdc, btsA.devMarginPct, costData.gstEnabled)
        const btsAgg = calculateBTSValuation(btsLines.agg, otherRev, btsA.sellingCostsPct, tdc, btsA.devMarginPct, costData.gstEnabled)
        computed.push({ scenario: s.name, type: 'BTS (Conservative)', noi: null, gav: btsCons.grossRevenue, tdc: tdc + landEff, rlv: btsCons.rlv })
        computed.push({ scenario: s.name, type: 'BTS (Aggressive)', noi: null, gav: btsAgg.grossRevenue, tdc: tdc + landEff, rlv: btsAgg.rlv })
      }
      if (store.getHotelAssumptions(s.id).keys > 0) {
        const hotelI = calculateHotelIncome(hotelA)
        const hotelV = calculateHotelValuation(hotelI.noi, hotelA.hotelCapRate, tdc, hotelA.devMarginPct)
        computed.push({ scenario: s.name, type: 'Hotel', noi: hotelI.noi, gav: hotelV.gav, tdc: tdc + landEff, rlv: hotelV.rlv })
      }
    }
    const maxRLV = Math.max(...computed.map(r => r.rlv))
    const rows = computed.map(r => ({ ...r, isBest: r.rlv === maxRLV && maxRLV > 0 }))
    setAllRows(rows)
    setBestRow(rows.find(r => r.isBest) ?? rows[0] ?? null)
  }, [projectId])

  const landAcq = store.getLandAcquisition(projectId)
  const landCost = landAcq.total  // ex-GST contract price + stamp duty + acquisition costs
  const tdcIncl = tdc + landCost  // land-INCLUSIVE Total Development Cost (headline)

  return (
    <div className="flex flex-col">
      <div className="fx-wrap" style={{ maxWidth: 1100 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
          <div>
            <p style={{ color: 'var(--gold)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 6 }}>Executive Summary</p>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 300, fontSize: 28, letterSpacing: '0.06em', color: 'var(--ink)', margin: 0 }}>{project?.name ?? 'Project'}</h1>
            {project?.address && <p style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 6, letterSpacing: '0.04em' }}>{project.address}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <Wordmark size="md" />
            <p style={{ color: 'var(--faint)', fontSize: 9, letterSpacing: '0.18em', marginTop: 8, textTransform: 'uppercase' }}>
              {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* ── Best Scenario Hero ── */}
        {bestRow && (
          // Step 9 asks for the hero as an accent panel — frosted glass with the
          // silver top hairline — rather than a plain box with a silver outline.
          <div className="panel gold-top" style={{ padding: '24px 28px', marginBottom: 36, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 24 }}>
            <div style={{ gridColumn: '1/-1', marginBottom: 8 }}>
              <p style={{ color: 'var(--gold)', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', margin: 0 }}>★ Best Scenario — {bestRow.scenario} · {bestRow.type}</p>
            </div>
            {[
              { label: bestRow.noi != null ? 'Net Operating Income' : 'Gross Revenue', value: fmt(bestRow.noi ?? bestRow.gav) },
              { label: 'Gross Asset Value', value: fmt(bestRow.gav) },
              { label: 'Total Dev Cost (incl land + finance)', value: fmt(proj.tdc) },
              { label: 'Dev Profit', value: fmt(bestRow.gav - proj.tdc) },
              { label: 'Dev Margin', value: proj.tdc > 0 ? pct((bestRow.gav - proj.tdc) / proj.tdc) : '—' },
              { label: 'Residual Land Value', value: fmt(bestRow.rlv) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ color: 'var(--ink-3)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 6px' }}>{label}</p>
                <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: 'var(--ink)', margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Profit — every lens ── */}
        <ProfitLens projectId={projectId} title="Profit — every lens (developer · bank · investor)" />

        {/* ── Investor equity return ── */}
        <InvestorReturn projectId={projectId} />

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
          {landAcq.purchasePrice > 0 && <Row label={landAcq.gstCredit > 0 ? 'Purchase Price (inc GST)' : 'Purchase Price'} value={fmt(landAcq.purchasePrice)} />}
          {landAcq.gstCredit > 0 && <Row label="GST Input Credit (1/11)" value={`−${fmt(landAcq.gstCredit)}`} />}
          {landAcq.stampDuty > 0 && <Row label={`Stamp Duty (${land.state})`} value={fmt(landAcq.stampDuty + landAcq.foreignSurcharge)} />}
          {landAcq.settlementDate && <Row label="Settlement (duty due)" value={new Date(landAcq.settlementDate + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} />}
          <Row label="Land Cost in Feasibility" value={fmt(landCost)} gold />
          {land.isInKind && land.inKindGFA > 0 && <Row label="In-Kind Delivery GFA" value={`${land.inKindGFA.toLocaleString()} sqm`} />}
          {land.isInKind && land.inKindGFA > 0 && <Row label={`In-Kind (${land.inKindLabel})`} value={`${land.inKindGFA.toLocaleString()} sqm`} />}
        </Section>

        {/* ── Cost Stack ── */}
        <Section title="Total Development Cost" sub="Land + construction + all costs + real finance">
          <Row label="Land (incl. duty & acquisition)" value={fmt(landCost)} />
          <Row label="Construction" value={fmt(costResult.construction)} />
          <Row label="Contingency" value={fmt(costResult.contingency)} />
          <Row label="Prelims" value={fmt(costResult.prelims)} />
          <Row label="Professional Fees" value={fmt(costResult.professionalFees)} />
          <Row label="Statutory & council" value={fmt(costData.statutoryFixed)} />
          <Row label="Project management + marketing" value={fmt((costData.projectManagementFixed || 0) + (costData.marketingFixed || 0) + (costData.amenityFitoutFixed || 0))} />
          <Row label="Finance (real — tranches + land carry)" value={fmt(proj.financeCost)} gold />
          {costResult.inKindCost > 0 && <Row label="In-Kind Delivery Cost" value={fmt(costResult.inKindCost)} />}
          <Row label="TOTAL DEVELOPMENT COST" value={fmt(proj.tdc)} highlight large gold />
          {site.resiGBA > 0 && proj.tdc > 0 && <Row label="All-in Rate per GBA sqm" value={`$${Math.round(proj.tdc / site.resiGBA).toLocaleString()}/sqm`} />}
        </Section>

        {/* ── Cost & Time by Phase ── */}
        <Section title="Cost & Time by Phase" sub="Cost of works, programme span and progress by delivery phase">
          {phaseRows.map(p => (
            <Row key={p.id} label={`${p.label}${p.span ? `  ·  ${p.span}` : ''}${p.tasks > 0 ? `  ·  ${p.done}/${p.tasks} tasks` : ''}`} value={fmt(p.cost)} />
          ))}
          <Row label="TOTAL COST OF WORKS" value={fmt(phaseRows.reduce((s, p) => s + p.cost, 0))} highlight gold />
        </Section>

        {/* ── All Scenarios ── */}
        {allRows.length > 0 && (
          <Section title="All Scenarios" sub="Full outcome matrix ranked by RLV">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                <thead>
                  <tr style={{ background: 'var(--card-2)', borderBottom: '1px solid var(--border)' }}>
                    {['Scenario', 'Strategy', 'NOI / Revenue', 'GAV', 'RLV', 'Verdict'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...allRows].sort((a, b) => b.rlv - a.rlv).map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--line)', background: r.isBest ? 'var(--card-2)' : 'var(--card)' }}>
                      <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--ink-3)' }}>{r.scenario}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, color: r.isBest ? 'var(--gold)' : 'var(--ink)' }}>{r.isBest ? '★ ' : ''}{r.type}</td>
                      <td style={{ padding: '9px 14px', fontSize: 11, fontFamily: 'monospace', color: 'var(--ink-2)' }}>{r.noi != null ? fmt(r.noi) + ' NOI' : fmt(r.gav) + ' Rev'}</td>
                      <td style={{ padding: '9px 14px', fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: 'var(--ink)' }}>{fmt(r.gav)}</td>
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
              <div style={{ width: 3, height: 22, background: 'var(--gold)', flexShrink: 0 }} />
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)', margin: 0 }}>Profit & Exit Valuation</h2>
            </div>
            <p style={{ color: 'var(--ink-3)', fontSize: 10, letterSpacing: '0.08em', marginLeft: 13, marginBottom: 10 }}>Developer returns and asset exit analysis — best scenario</p>

            {/* Hero profit card */}
            {(() => {
              const isBTRorHotel = (bestRow.type?.startsWith('BTR') || bestRow.type === 'Hotel') && bestRow.noi != null
              const exitVal = isBTRorHotel ? bestRow.noi / 0.05 : bestRow.gav
              const profit = exitVal - bestRow.tdc
              const margin = bestRow.tdc > 0 ? (profit / bestRow.tdc) * 100 : 0
              const profitColor = profit > 0 ? 'var(--emerald)' : 'var(--red)'
              return (
                <div style={{ border: '1px solid var(--gold)', background: 'var(--card-2)', padding: '20px 24px', marginBottom: 14 }}>
                  <p style={{ color: 'var(--gold)', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', margin: '0 0 16px' }}>★ {bestRow.scenario} · {bestRow.type}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 20 }}>
                    {bestRow.noi != null && (
                      <div>
                        <p style={{ color: 'var(--ink-3)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 5px' }}>Net Operating Income</p>
                        <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: 'var(--ink)', margin: 0 }}>{fmt(bestRow.noi)}</p>
                        <p style={{ color: 'var(--faint)', fontSize: 9, margin: '3px 0 0', letterSpacing: '0.08em' }}>per annum</p>
                      </div>
                    )}
                    {isBTRorHotel ? (
                      <div>
                        <p style={{ color: 'var(--ink-3)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 5px' }}>Exit Value @ 5% Cap Rate</p>
                        <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: 'var(--ink)', margin: 0 }}>{fmt(exitVal)}</p>
                        <p style={{ color: 'var(--faint)', fontSize: 9, margin: '3px 0 0', letterSpacing: '0.08em' }}>NOI ÷ 5%</p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ color: 'var(--ink-3)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 5px' }}>Gross Revenue</p>
                        <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: 'var(--ink)', margin: 0 }}>{fmt(bestRow.gav)}</p>
                        <p style={{ color: 'var(--faint)', fontSize: 9, margin: '3px 0 0', letterSpacing: '0.08em' }}>sale proceeds</p>
                      </div>
                    )}
                    <div>
                      <p style={{ color: 'var(--ink-3)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 5px' }}>Total Dev Cost</p>
                      <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: 'var(--ink)', margin: 0 }}>{fmt(bestRow.tdc)}</p>
                      <p style={{ color: 'var(--faint)', fontSize: 9, margin: '3px 0 0', letterSpacing: '0.08em' }}>all-in TDC</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--ink-3)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 5px' }}>Developer Profit</p>
                      <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: profitColor, margin: 0 }}>{profit >= 0 ? '+' : ''}{fmt(profit)}</p>
                      <p style={{ color: 'var(--faint)', fontSize: 9, margin: '3px 0 0', letterSpacing: '0.08em' }}>exit value − TDC</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--ink-3)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 5px' }}>Profit Margin</p>
                      <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: profitColor, margin: 0 }}>{margin.toFixed(1)}%</p>
                      <p style={{ color: 'var(--faint)', fontSize: 9, margin: '3px 0 0', letterSpacing: '0.08em' }}>on TDC</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* All-scenario exit table */}
            {allRows.length > 1 && (
              <div style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
                <div style={{ padding: '8px 16px', background: 'var(--card-2)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 }}>Exit Analysis — All Scenarios</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                    <thead>
                      <tr style={{ background: 'var(--card-2)', borderBottom: '1px solid var(--border)' }}>
                        {['Strategy', 'NOI / Revenue', 'Exit @ 5% Cap', 'TDC', 'Dev Profit', 'Margin %'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...allRows].sort((a, b) => b.rlv - a.rlv).map((r, i) => {
                        const isBH = (r.type?.startsWith('BTR') || r.type === 'Hotel') && r.noi != null
                        const exitVal = isBH ? r.noi / 0.05 : r.gav
                        const profit = exitVal - r.tdc
                        const margin = r.tdc > 0 ? (profit / r.tdc) * 100 : 0
                        const pc = profit > 0 ? 'var(--emerald)' : 'var(--red)'
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--line)', background: r.isBest ? 'var(--card-2)' : 'var(--card)' }}>
                            <td style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: r.isBest ? 'var(--gold)' : 'var(--ink)' }}>{r.isBest ? '★ ' : ''}{r.type}</td>
                            <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'monospace', color: 'var(--ink-2)' }}>{r.noi != null ? fmt(r.noi) : fmt(r.gav)}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: 'var(--ink)' }}>{isBH ? fmt(exitVal) : '—'}</td>
                            <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'monospace', color: 'var(--ink-3)' }}>{fmt(r.tdc)}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: pc }}>{profit >= 0 ? '+' : ''}{fmt(profit)}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: pc }}>{margin.toFixed(1)}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '8px 14px', borderTop: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 9, color: 'var(--faint)', letterSpacing: '0.08em' }}>BTR/Hotel exit = NOI ÷ 5% cap rate · BTS = gross sales revenue · Profit = Exit Value − TDC</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LVR & Capital ── */}
        <LVRSection landCost={landCost} tdc={tdc} />

        {!bestRow && allRows.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--faint)', fontSize: 12 }}>
            Complete Site & Design, Cost Stack, and at least one Mix scenario to generate the summary.
          </div>
        )}

      </div>

      {/* Render strip */}
      <div style={{ height: 280, backgroundImage: 'url(/renders/haavn-hero.png)', backgroundSize: 'cover', backgroundPosition: 'center 55%', width: '100%', flexShrink: 0 }} />
    </div>
  )
}

export default function SummaryTab(props: Props) {
  return <ErrorBoundary><SummaryTabInner {...props} /></ErrorBoundary>
}
