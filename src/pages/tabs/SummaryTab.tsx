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
import { VerdictBadge } from '../../components/ui'
import { calculateBTRIncome, calculateBTRValuation } from '../../engine/btr'
import { calculateBTSValuation } from '../../engine/bts'
import { calculateHotelIncome, calculateHotelValuation } from '../../engine/hotel'
import { calculateCostStack } from '../../engine/costStack'
import { solveUnitMix } from '../../engine/unitMix'
import { getPhaseCosts, getTimelineTasks, getProjectTDC } from '../../db'
import { COST_PHASES, CATEGORY_TO_PHASE } from '../../db/schema'
import ProfitLens from '../../components/ProfitLens'

interface Props { projectId: string }

const fmt = (n: number) => n >= 1_000_000
  ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n.toLocaleString()}`

const pct = (n: number) => `${(n * 100).toFixed(1)}%`

// The design's summary line: label left, mono value right, hairline above.
// `gold` marks a total, `credit` an emerald value.
function SumRow({ label, value, tone, emerald }: {
  label: string; value: string; tone?: 'gold' | 'credit'; emerald?: boolean
}) {
  return (
    <div className={`sumrow${tone ? ` ${tone}` : ''}`}>
      <span className="l">{label}</span>
      <span className="v" style={emerald ? { color: 'var(--emerald)' } : undefined}>{value}</span>
    </div>
  )
}

function Section({ title, children, className = 'panel pad' }: {
  title: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={className}>
      <div className="divlabel">{title}</div>
      {children}
    </div>
  )
}

// The design types LVR straight into the field ("65%") rather than dragging a
// slider. Buffered so a part-typed value isn't reparsed on every keystroke.
function LvrField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const [buf, setBuf] = useState<string | null>(null)
  const commit = () => {
    const n = parseFloat((buf ?? '').replace('%', '').trim())
    if (Number.isFinite(n)) onChange(Math.max(0, Math.min(100, n)) / 100)
    setBuf(null)
  }
  return (
    <div className="frow" style={{ border: 'none', padding: 0, gap: 10 }}>
      <span className="fl">{label}</span>
      <input
        className="inp sm"
        value={buf ?? `${Math.round(value * 100)}%`}
        onChange={e => setBuf(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      />
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
    <div className="panel pad">
      <div className="divlabel">LVR &amp; capital deployment</div>
      <div className="flex gap mb wrapf">
        <LvrField label="Land LVR" value={landLVR} onChange={setLandLVR} />
        <LvrField label="Construction LVR" value={constLVR} onChange={setConstLVR} />
      </div>
      <SumRow label="Land cost" value={fmt(landCost)} />
      <SumRow label={`Bank debt — land (${Math.round(landLVR * 100)}% LVR)`} value={fmt(landDebt)} />
      <SumRow label="Equity — land" value={fmt(landEquity)} />
      <SumRow label="Total development cost" value={fmt(tdc)} />
      <SumRow label={`Bank debt — construction (${Math.round(constLVR * 100)}% LVR)`} value={fmt(constDebt)} />
      <SumRow label="Equity — construction" value={fmt(constEquity)} />
      <SumRow label="Total project cost (land + TDC)" value={fmt(totalCost)} />
      <SumRow label="Total bank debt" value={fmt(totalDebt)} />
      <SumRow label="Total equity required" value={fmt(totalEquity)} tone="gold" />
      <div className="note mt">
        Effective blended LVR: {totalCost > 0 ? Math.round((totalDebt / totalCost) * 100) : 0}%
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

  const devProfit = bestRow ? bestRow.gav - proj.tdc : 0
  // The design colours Dev profit silver and leaves Dev margin as plain ink.
  const heroItems: { lab: string; val: string; color?: string }[] = bestRow ? [
    { lab: bestRow.noi != null ? 'Net operating income' : 'Gross revenue', val: fmt(bestRow.noi ?? bestRow.gav) },
    { lab: 'Gross asset value', val: fmt(bestRow.gav) },
    { lab: 'Total dev cost (incl land + finance)', val: fmt(proj.tdc) },
    { lab: 'Dev profit', val: fmt(devProfit), color: 'var(--gold)' },
    { lab: 'Dev margin', val: proj.tdc > 0 ? pct(devProfit / proj.tdc) : '—' },
    { lab: 'Residual land value', val: fmt(bestRow.rlv) },
  ] : []

  const sortedRows = [...allRows].sort((a, b) => b.rlv - a.rlv)

  return (
    <div className="flex flex-col">
      <div className="fx-wrap">

        <div style={{ marginBottom: 8 }}>
          <div className="kicker">08 · Executive Summary</div>
          <h1 className="h-sec" style={{ fontSize: 46 }}>{project?.name ?? 'Project'}</h1>
          <div className="h-sub">
            {[project?.address, new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })].filter(Boolean).join(' · ')}
          </div>
        </div>

        {bestRow && (
          <div className="panel pad gold-top mt2" style={{ background: 'linear-gradient(160deg,var(--gold-soft),var(--card))' }}>
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>★ Best scenario — {bestRow.scenario} · {bestRow.type}</div>
            <div className="kpis k3 mt2" style={{ gap: 26 }}>
              {heroItems.map(k => (
                // overflow:visible — .kpi clips to its box, and with padding:0 the label
                // sits flush at a fractional x, so the clip ate the first letter. Nothing
                // to clip on a tile with no border or background.
                <div key={k.lab} className="kpi" style={{ border: 'none', boxShadow: 'none', background: 'none', padding: 0, overflow: 'visible' }}>
                  <div className="lab">{k.lab}</div>
                  <div className="val" style={k.color ? { color: k.color } : undefined}>{k.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <ProfitLens projectId={projectId} />

        <div className="three mb" style={{ alignItems: 'start' }}>
          <Section title="Site & design">
            <SumRow label="Residential NSA" value={(site.resiNSA ?? 0).toLocaleString()} />
            <SumRow label="Residential GFA" value={(site.resiGFA ?? 0).toLocaleString()} />
            <SumRow label="Residential GBA" value={(site.resiGBA ?? 0).toLocaleString()} />
            <SumRow label="Balcony" value={(site.balcony ?? 0).toLocaleString()} />
            <SumRow label="Basement" value={(site.basementTotal ?? 0).toLocaleString()} />
            <SumRow label="Car spaces" value={`${site.carSpaces ?? 0}`} />
            {(site.childcareGFA ?? 0) > 0 && <SumRow label="Childcare GFA" value={site.childcareGFA.toLocaleString()} />}
            {(site.resiNSA ?? 0) > 0 && (site.resiGFA ?? 0) > 0 && (
              <SumRow label="NSA/GFA efficiency" value={pct(site.resiNSA / site.resiGFA)} emerald />
            )}
          </Section>

          <Section title="Land & terms">
            {landAcq.purchasePrice > 0 && <SumRow label={landAcq.gstCredit > 0 ? 'Purchase price (inc GST)' : 'Purchase price'} value={fmt(landAcq.purchasePrice)} />}
            {landAcq.gstCredit > 0 && <SumRow label="GST input credit (1/11)" value={`−${fmt(landAcq.gstCredit)}`} tone="credit" />}
            {landAcq.stampDuty > 0 && <SumRow label={`Stamp duty (${land.state})`} value={fmt(landAcq.stampDuty + landAcq.foreignSurcharge)} />}
            {landAcq.settlementDate && <SumRow label="Settlement (duty due)" value={new Date(landAcq.settlementDate + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })} />}
            <SumRow label="Land cost in feasibility" value={fmt(landCost)} tone="gold" />
            {land.isInKind && land.inKindGFA > 0 && <SumRow label="In-kind delivery GFA" value={land.inKindGFA.toLocaleString()} />}
            {land.isInKind && land.inKindGFA > 0 && <SumRow label={`In-kind (${land.inKindLabel})`} value={land.inKindGFA.toLocaleString()} />}
          </Section>

          <Section title="Total development cost">
            <SumRow label="Land (incl duty & acq)" value={fmt(landCost)} />
            <SumRow label="Construction" value={fmt(costResult.construction)} />
            <SumRow label="Contingency" value={fmt(costResult.contingency)} />
            <SumRow label="Prelims" value={fmt(costResult.prelims)} />
            <SumRow label="Professional fees" value={fmt(costResult.professionalFees)} />
            <SumRow label="Statutory & council" value={fmt(costData.statutoryFixed)} />
            <SumRow label="Project management + marketing" value={fmt((costData.projectManagementFixed || 0) + (costData.marketingFixed || 0) + (costData.amenityFitoutFixed || 0))} />
            <SumRow label="Finance (real tranches)" value={fmt(proj.financeCost)} />
            {costResult.inKindCost > 0 && <SumRow label="In-kind delivery cost" value={fmt(costResult.inKindCost)} />}
            <SumRow label="Total dev cost" value={fmt(proj.tdc)} tone="gold" />
            {site.resiGBA > 0 && proj.tdc > 0 && <SumRow label="All-in rate per GBA sqm" value={`$${Math.round(proj.tdc / site.resiGBA).toLocaleString()}/sqm`} />}
          </Section>
        </div>

        <Section title="Cost & time by phase" className="panel pad mb">
          {phaseRows.map(p => (
            <SumRow key={p.id} label={`${p.label}${p.span ? `  ·  ${p.span}` : ''}${p.tasks > 0 ? `  ·  ${p.done}/${p.tasks} tasks` : ''}`} value={fmt(p.cost)} />
          ))}
          <SumRow label="Total cost of works" value={fmt(phaseRows.reduce((s, p) => s + p.cost, 0))} tone="gold" />
        </Section>

        {allRows.length > 0 && (
          <div className="panel pad mb">
            <div className="divlabel">All scenarios — ranked by RLV</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Scenario · strategy</th>
                    <th className="num">NOI / revenue</th>
                    <th className="num">GAV</th>
                    <th className="num">RLV</th>
                    <th>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((r, i) => (
                    <tr key={i}>
                      <td className="name">
                        {r.isBest ? '★ ' : ''}{r.type}
                        <div style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 400, marginTop: 3 }}>{r.scenario}</div>
                      </td>
                      <td className="num">{r.noi != null ? `${fmt(r.noi)} NOI` : `${fmt(r.gav)} Rev`}</td>
                      <td className="num">{fmt(r.gav)}</td>
                      <td className={`num${r.isBest ? ' hero' : ''}`}>{fmt(r.rlv)}</td>
                      <td><VerdictBadge rlv={r.rlv} pill /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {allRows.length > 1 && (
          <div className="panel pad mb">
            <div className="divlabel">Exit analysis — all scenarios</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Strategy</th>
                    <th className="num">NOI / revenue</th>
                    <th className="num">Exit @ 5% cap</th>
                    <th className="num">TDC</th>
                    <th className="num">Dev profit</th>
                    <th className="num">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((r, i) => {
                    const isBH = (r.type?.startsWith('BTR') || r.type === 'Hotel') && r.noi != null
                    const exitVal = isBH ? r.noi / 0.05 : r.gav
                    const profit = exitVal - r.tdc
                    const margin = r.tdc > 0 ? (profit / r.tdc) * 100 : 0
                    const pc = profit > 0 ? 'var(--emerald)' : 'var(--red)'
                    return (
                      <tr key={i}>
                        <td className="name">{r.isBest ? '★ ' : ''}{r.type}</td>
                        <td className="num">{r.noi != null ? fmt(r.noi) : fmt(r.gav)}</td>
                        <td className="num">{isBH ? fmt(exitVal) : '—'}</td>
                        <td className="num">{fmt(r.tdc)}</td>
                        <td className="num" style={{ color: pc }}>{profit >= 0 ? '+' : ''}{fmt(profit)}</td>
                        <td className="num" style={{ color: pc }}>{margin.toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="note mt">BTR/Hotel exit = NOI ÷ 5% cap rate · BTS = gross sales revenue · Profit = exit value − TDC</div>
          </div>
        )}

        <div className="two">
          {bestRow && (() => {
            const isBTRorHotel = (bestRow.type?.startsWith('BTR') || bestRow.type === 'Hotel') && bestRow.noi != null
            const exitVal = isBTRorHotel ? bestRow.noi / 0.05 : bestRow.gav
            const profit = exitVal - bestRow.tdc
            const margin = bestRow.tdc > 0 ? (profit / bestRow.tdc) * 100 : 0
            return (
              <div className="panel pad">
                <div className="divlabel">Profit &amp; exit valuation — best scenario</div>
                <div className="kpis k3 mt" style={{ gap: 12 }}>
                  <div className="kpi" style={{ boxShadow: 'none' }}>
                    <div className="lab">{isBTRorHotel ? 'Exit @ 5% cap' : 'Gross revenue'}</div>
                    <div className="val">{fmt(exitVal)}</div>
                  </div>
                  <div className="kpi" style={{ boxShadow: 'none' }}>
                    <div className="lab">Total dev cost</div>
                    <div className="val">{fmt(bestRow.tdc)}</div>
                  </div>
                  <div className={`kpi ${profit > 0 ? 'g' : 'r'}`} style={{ boxShadow: 'none' }}>
                    <div className="lab">Developer profit</div>
                    <div className="val">{profit >= 0 ? '+' : ''}{fmt(profit)}</div>
                  </div>
                </div>
                {bestRow.noi != null && <SumRow label="Net operating income" value={fmt(bestRow.noi)} />}
                <SumRow label="Profit margin on TDC" value={`${margin.toFixed(1)}%`} />
              </div>
            )
          })()}
          <LVRSection landCost={landCost} tdc={tdc} />
        </div>

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
