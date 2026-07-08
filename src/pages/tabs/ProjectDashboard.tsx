import React, { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../../store'
import * as db from '../../db'
import { calculateCostStack } from '../../engine/costStack'
import { calculateHotelIncome, calculateHotelValuation } from '../../engine/hotel'
import { calculateBTRIncome, calculateBTRValuation } from '../../engine/btr'
import { calculateBTSValuation } from '../../engine/bts'
import { STATUS_COLORS, STATUS_SHORT } from './ProjectTimeline'
import { calculateFinance } from '../../engine/finance'
import { COST_PHASES, CATEGORY_TO_PHASE } from '../../db/schema'
import FinanceSCurve, { getTimelineHealth } from '../../components/FinanceSCurve'

interface Props { projectId: string }

const TYPE_COLOR: Record<string, string> = { hotel: '#A855F7', btr: '#22C55E', bts: '#3B82F6', mixed: '#E8E6E1' }

const PHASE_COLOR: Record<string, string> = {
  'pre-acquisition': '#C4973A', 'acquisition-planning': '#A855F7',
  'pre-construction': '#3B82F6', 'construction': '#6B6B6B', 'close-out': '#22C55E',
}

function fmt(n: number, d = 1) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(d)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString()}`
}

function KPI({ label, value, sub, color = '#C4973A' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ padding: '18px 22px', border: '1px solid #E4E1DC', background: '#FFFFFF', flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 7, letterSpacing: '0.26em', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 22, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700, color, lineHeight: 1, letterSpacing: '-0.01em' }}>{value}</p>
      {sub && <p style={{ fontSize: 9, color: '#555', marginTop: 5, letterSpacing: '0.06em' }}>{sub}</p>}
    </div>
  )
}

function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) * 100 : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.10em', color: '#555', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color, fontWeight: 700 }}>{fmt(value)}</span>
      </div>
      <div style={{ height: 4, background: '#E4E1DC', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

// Simple SVG donut
function Donut({ segments, cx = 70, cy = 70, r = 50, sw = 18, label, sub }: {
  segments: { value: number; color: string; label: string }[]
  cx?: number; cy?: number; r?: number; sw?: number
  label: string; sub?: string
}) {
  const total = segments.reduce((s, d) => s + d.value, 0)
  if (total <= 0) return null
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <svg viewBox={`0 0 ${cx * 2} ${cy * 2}`} style={{ width: cx * 2, height: cy * 2 }}>
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ
        const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={sw}
          strokeDasharray={`${dash - 1.5} ${circ - dash + 1.5}`}
          strokeDashoffset={-offset + circ / 4} />
        offset += dash
        return el
      })}
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#fff" fontSize={16} fontWeight={700} fontFamily="'Optima',serif">{label}</text>
      {sub && <text x={cx} y={cy + 12} textAnchor="middle" fill="#444" fontSize={7} letterSpacing={1.5}>{sub}</text>}
    </svg>
  )
}

export default function ProjectDashboard({ projectId }: Props) {
  const store = useStore()
  const project = store.projects.find(p => p.id === projectId)
  const site     = store.getSiteDesign(projectId)
  const land     = store.getLandTerms(projectId)
  const landCostEff = store.getEffectiveLandCost(projectId)  // ex GST when project applies GST
  const costData = store.getCostStack(projectId)
  const phaseLabel = COST_PHASES.find(p => p.id === costData.currentPhase)?.label
  const accentColor = TYPE_COLOR[project?.type ?? ''] ?? '#C4973A'

  const inKindLineItem = land.isInKind && land.inKindGFA > 0
    ? { label: land.inKindLabel, gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote }
    : undefined

  const { scenarios, bestScenario } = useMemo(() => {
    const scenarios = store.getMixScenarios(projectId)
    const landEff = store.getEffectiveLandCost(projectId)   // effective land cost (duty, acq costs, terms)
    let best: any = null

    for (const s of scenarios) {
      const units  = store.getUnitTypes(s.id)
      const hotelA = store.getHotelAssumptions(s.id)
      const btrA   = store.getBTRAssumptions(s.id)
      const btsA   = store.getBTSAssumptions(s.id)

      const effectiveBuildRate  = hotelA.buildRateOverride ?? costData.buildRatePerSqm
      const effectiveFinancePct = hotelA.constructionFinancePct ?? costData.financePct
      const cs = calculateCostStack({ ...costData, buildRatePerSqm: effectiveBuildRate, financePct: effectiveFinancePct, gba: site.resiGBA, inKindLineItem, landCost: land.landCost })
      // Land-EXCLUDED build/soft cost feeds the RLV engine (RLV = affordable land);
      // the stored `tdc` is land-INCLUSIVE (build/soft + land) for the headline.
      const tdcBuild = cs.totalDevelopmentCost
      const tdc = tdcBuild + landEff

      if (hotelA.keys > 0) {
        const inc = calculateHotelIncome(hotelA)
        const val = calculateHotelValuation(inc.noi, hotelA.hotelCapRate, tdcBuild, hotelA.devMarginPct)
        if (!best || val.rlv > best.rlv) best = { ...val, noi: inc.noi, tdc, landEff, strategy: 'Hotel', name: s.name, hotelA, inc, cs }
      }
      const hasRent = units.some(u => u.weeklyRentConservative > 0)
      if (hasRent) {
        const ul = units.map(u => ({ typeName: u.name, unitCount: u.solvedCount, weeklyRentConservative: u.weeklyRentConservative, weeklyRentAggressive: u.weeklyRentAggressive, opexPerUnitPerYear: u.opexPerUnitPerYear }))
        const i2 = calculateBTRIncome({ unitLines: ul, vacancyPct: btrA.vacancyPct, managementFeePct: btrA.managementFeePct, commercialIncomeLines: [], carParkIncomeAnnual: btrA.carParkIncomeAnnual, buildingAdminFixed: btrA.buildingAdminFixed }, 'conservative')
        const v2 = calculateBTRValuation(i2.noi, btrA.capRateConservative, tdcBuild, btrA.devMarginPct)
        if (!best || v2.rlv > best.rlv) best = { ...v2, noi: i2.noi, tdc, landEff, strategy: 'BTR', name: s.name, cs }
        const bl = units.map(u => ({ typeName: u.name, unitCount: u.solvedCount, pricePerUnit: u.salePriceMid }))
        const v3 = calculateBTSValuation(bl, [], btsA.sellingCostsPct, tdcBuild, btsA.devMarginPct, costData.gstEnabled)
        if (!best || v3.rlv > best.rlv) best = { gav: v3.grossRevenue, rlv: v3.rlv, tdc, landEff, noi: null, strategy: 'BTS', name: s.name, cs }
      }
    }
    return { scenarios, bestScenario: best }
  }, [projectId, costData, site])

  const costStack = useMemo(() => calculateCostStack({ ...costData, gba: site.resiGBA, inKindLineItem, landCost: land.landCost }), [costData, site])

  // Grouped cost buckets for the breakdown bars (the engine returns line-level
  // figures + the fixed inputs live on costData).
  const hardCostsBuild = costStack.construction + costStack.contingency + costStack.prelims
  const statFinance    = costStack.finance + (costData.statutoryFixed || 0)
  const otherSoftCosts = (costData.projectManagementFixed || 0) + (costData.marketingFixed || 0) + (costData.amenityFitoutFixed || 0)

  const tdc    = bestScenario?.tdc ?? (costStack.totalDevelopmentCost + landCostEff)   // land-inclusive TDC
  const gav    = bestScenario?.gav ?? 0
  const rlv    = bestScenario?.rlv ?? 0
  const devProfit = gav - tdc                                                          // GAV − land-inclusive TDC
  const margin = tdc > 0 ? ((gav - tdc) / tdc) : 0

  const costMax = Math.max(hardCostsBuild, costStack.professionalFees, statFinance, otherSoftCosts, landCostEff, 1)

  // ── Cost & time tracked by delivery phase (from all models) ──
  const phaseTracking = useMemo(() => {
    const costs = db.getPhaseCosts(projectId)
    const tasks = db.getTimelineTasks(projectId)
    return COST_PHASES.map(p => {
      const inPhase = tasks.filter(t => (t.phase ?? CATEGORY_TO_PHASE[t.category]) === p.id)
      const starts = inPhase.map(t => t.startDate).filter(Boolean).sort()
      const ends   = inPhase.map(t => t.endDate).filter(Boolean).sort()
      const done   = inPhase.filter(t => t.status === 'complete').length
      return {
        id: p.id, label: p.label, cost: costs[p.id] || 0,
        tasks: inPhase.length, done,
        start: starts[0], end: ends[ends.length - 1],
        current: costData.currentPhase === p.id,
      }
    })
  }, [projectId, costData, tdc])
  const phaseTotal = phaseTracking.reduce((s, p) => s + p.cost, 0) || 1

  // Area breakdown for donut — distinct colour per sector
  const AREA_COLORS = { nsa: '#22C55E', balcony: '#C4973A', basement: '#3B82F6', other: '#A855F7' }
  const areaSegs = [
    { value: site.resiNSA,      color: AREA_COLORS.nsa,      label: 'NSA' },
    { value: site.balcony,      color: AREA_COLORS.balcony,   label: 'Balcony' },
    { value: site.basementTotal,color: AREA_COLORS.basement,  label: 'Basement' },
    { value: site.otherGFA,     color: AREA_COLORS.other,     label: 'Other' },
  ].filter(s => s.value > 0)

  return (
    <div style={{ background: '#F4F2EF', color: '#E4E1DC', minHeight: '100%', padding: '28px 32px 48px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ width: 3, height: 28, background: accentColor, flexShrink: 0 }} />
            <h1 style={{ fontSize: 20, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700, letterSpacing: '0.04em', color: '#E4E1DC' }}>{project?.name}</h1>
            {project?.type && (
              <span style={{ fontSize: 7, letterSpacing: '0.22em', textTransform: 'uppercase', color: accentColor, fontWeight: 700, padding: '2px 8px', border: `1px solid ${accentColor}44`, background: `${accentColor}0E`, marginLeft: 4 }}>{project.type}</span>
            )}
            {phaseLabel && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 7, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#2A2A2A', fontWeight: 700, padding: '3px 9px', background: '#E8E6E1', borderRadius: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3DAA6A' }} /> {phaseLabel}
              </span>
            )}
          </div>
          <p style={{ fontSize: 10, color: '#888', letterSpacing: '0.12em', paddingLeft: 13 }}>{project?.address}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 7, color: '#555', letterSpacing: '0.20em', textTransform: 'uppercase' }}>Project Feasibility Dashboard</p>
          <p style={{ fontSize: 8, color: '#444', marginTop: 3, letterSpacing: '0.06em' }}>{new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <KPI label="Total Dev Cost" value={fmt(tdc)} sub="incl. land + all costs" color="#C4973A" />
        <KPI label="Gross Asset Value" value={gav > 0 ? fmt(gav) : '—'} sub={bestScenario?.strategy ?? 'No scenario'} color={accentColor} />
        <KPI label="Dev Profit" value={gav > 0 ? fmt(devProfit) : '—'} sub="GAV − TDC" color={devProfit > 0 ? '#22C55E' : devProfit < 0 ? '#EF4444' : '#444'} />
        <KPI label="Dev Margin" value={gav > 0 ? `${(margin * 100).toFixed(1)}%` : '—'} sub="on total cost (incl land)" color={margin > 0.15 ? '#22C55E' : margin > 0 ? '#EAB308' : '#444'} />
        <KPI label="Residual Land Value" value={rlv > 0 ? fmt(rlv) : '—'} sub={rlv > 0 ? `benchmark · vs ${fmt(landCostEff)} paid` : undefined} color={rlv > landCostEff ? '#22C55E' : rlv > 0 ? '#EAB308' : '#444'} />
        {site.resiGBA > 0 && <KPI label="GBA" value={`${site.resiGBA.toLocaleString()}`} sub={`NSA ${site.resiNSA.toLocaleString()} sqm`} color="#fff" />}
        {bestScenario?.hotelA?.keys > 0 && <KPI label="Hotel Keys" value={String(bestScenario.hotelA.keys)} sub={`ADR $${bestScenario.hotelA.adr} · ${(bestScenario.hotelA.occupancyPct*100).toFixed(0)}% occ`} color="#C4973A" />}
      </div>

      {/* ── Row 2: Area breakdown + Cost stack ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>

        {/* Area donut */}
        {site.resiGBA > 0 && (
          <div style={{ padding: '20px 24px', border: '1px solid #E4E1DC', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 24 }}>
            <Donut segments={areaSegs} label={site.resiGBA.toLocaleString()} sub="SQM GBA" />
            <div>
              <p style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#888', marginBottom: 14 }}>Area Breakdown</p>
              {[
                { label: 'Net Sellable Area', value: site.resiNSA, color: AREA_COLORS.nsa },
                { label: 'Balcony / Terrace',  value: site.balcony, color: AREA_COLORS.balcony },
                { label: 'Basement',            value: site.basementTotal, color: AREA_COLORS.basement },
                { label: 'Other GFA',           value: site.otherGFA, color: AREA_COLORS.other },
              ].filter(x => x.value > 0).map(x => (
                <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: x.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: '#666', minWidth: 130 }}>{x.label}</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#888', marginLeft: 'auto' }}>{x.value.toLocaleString()} sqm</span>
                </div>
              ))}
              {site.carSpaces > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E4E1DC', fontSize: 9, color: '#444' }}>
                  {site.carSpaces} car spaces
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cost stack bars */}
        <div style={{ padding: '20px 24px', border: '1px solid #E4E1DC', background: '#FFFFFF', flex: 1 }}>
          <p style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#888', marginBottom: 18 }}>Development Cost Stack — {fmt(tdc)} TDC</p>
          <HBar label="Land & Acquisition"     value={landCostEff}                  max={tdc} color="#C4973A" />
          <HBar label="Hard Costs (Build)"      value={hardCostsBuild}                  max={tdc} color="#E8E6E1" />
          <HBar label="Professional Fees"       value={costStack.professionalFees}      max={tdc} color="#A855F7" />
          <HBar label="Statutory & Finance"     value={statFinance}                     max={tdc} color="#3B82F6" />
          <HBar label="Project Mgmt & Marketing" value={otherSoftCosts}                 max={tdc} color="#22C55E" />
          {land.inKindGFA > 0 && <HBar label="In-Kind Delivery"  value={land.inKindGFA * land.inKindRatePerSqm} max={tdc} color="#EAB308" />}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #E4E1DC', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 8, color: '#888', letterSpacing: '0.10em' }}>$/sqm GBA</span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#C4973A', fontWeight: 700 }}>{site.resiGBA > 0 ? `$${Math.round(tdc/site.resiGBA).toLocaleString()}` : '—'}</span>
          </div>
        </div>
      </div>

      {/* ── Cost & Time by Phase — tracked across every model ── */}
      <div style={{ padding: '20px 24px', border: '1px solid #E4E1DC', background: '#FFFFFF', marginBottom: 20 }}>
        <p style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#888', marginBottom: 16 }}>Cost &amp; Time by Phase — cost of works, programme span &amp; progress</p>
        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 96px 120px 78px', gap: 12, alignItems: 'center', fontSize: 7, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#AAA', paddingBottom: 8, borderBottom: '1px solid #EDEBE7', marginBottom: 6 }}>
          <span>Phase</span><span>Cost of works</span><span style={{ textAlign: 'right' }}>Amount</span><span>Programme</span><span style={{ textAlign: 'right' }}>Progress</span>
        </div>
        {phaseTracking.map(p => {
          const col = PHASE_COLOR[p.id]
          const span = p.start && p.end
            ? `${new Date(p.start + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })} → ${new Date(p.end + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })}`
            : '—'
          const pct = p.tasks > 0 ? Math.round((p.done / p.tasks) * 100) : 0
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 96px 120px 78px', gap: 12, alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #F4F2EE' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, color: '#2A2A2A', fontWeight: p.current ? 700 : 500 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: col, flexShrink: 0 }} />{p.label}{p.current && <span style={{ fontSize: 6, letterSpacing: '0.16em', color: col, border: `1px solid ${col}66`, padding: '1px 4px', borderRadius: 3 }}>NOW</span>}
              </span>
              <span style={{ height: 8, background: '#F0EEEA', borderRadius: 4, overflow: 'hidden', display: 'block' }}>
                <span style={{ display: 'block', height: '100%', width: `${Math.min(100, (p.cost / phaseTotal) * 100)}%`, background: col }} />
              </span>
              <span style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: '#1A1A1A', fontWeight: 700 }}>{fmt(p.cost)}</span>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#666' }}>{span}</span>
              <span style={{ textAlign: 'right', fontSize: 9, color: p.tasks > 0 ? (pct === 100 ? '#22C55E' : '#888') : '#CCC' }}>{p.tasks > 0 ? `${p.done}/${p.tasks} · ${pct}%` : '—'}</span>
            </div>
          )
        })}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTop: '1px solid #E4E1DC' }}>
          <span style={{ fontSize: 8, color: '#888', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Total cost of works</span>
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#C4973A', fontWeight: 700 }}>{fmt(phaseTracking.reduce((s, p) => s + p.cost, 0))}</span>
        </div>
      </div>

      {/* ── Row 3: Hotel income waterfall (if hotel project) ── */}
      {bestScenario?.inc && (
        <div style={{ padding: '20px 24px', border: '1px solid #E4E1DC', background: '#FFFFFF', marginBottom: 20 }}>
          <p style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#888', marginBottom: 18 }}>Hotel Income Waterfall — Best Scenario</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, height: 120 }}>
            {(() => {
              const inc = bestScenario.inc
              const bars = [
                { label: 'Room\nRevenue', value: inc.roomRevenue, color: accentColor },
                { label: 'Other\nRevenue', value: inc.otherRevenue, color: '#666' },
                { label: 'Total\nRevenue', value: inc.totalRevenue, color: '#888', connector: true },
                { label: 'GOP', value: inc.gop, color: '#22C55E' },
                { label: 'Mgmt\nFee', value: -inc.managementFee, color: '#EF4444' },
                { label: 'FF&E\nReserve', value: -inc.ffeReserve, color: '#EAB308' },
                { label: 'NOI', value: inc.noi, color: '#22C55E' },
              ]
              const maxVal = Math.max(...bars.map(b => Math.abs(b.value)))
              return bars.map((b, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 8, fontFamily: 'monospace', color: b.value < 0 ? '#EF4444' : '#888', marginBottom: 2 }}>{fmt(Math.abs(b.value), 1)}</span>
                  <div style={{ width: '80%', background: b.value < 0 ? '#EF444433' : `${b.color}33`, borderTop: `2px solid ${b.value < 0 ? '#EF4444' : b.color}`, height: `${Math.max(8, (Math.abs(b.value) / maxVal) * 90)}px` }} />
                  <span style={{ fontSize: 7, letterSpacing: '0.06em', color: '#444', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.2 }}>{b.label}</span>
                </div>
              ))
            })()}
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 14, paddingTop: 12, borderTop: '1px solid #E4E1DC' }}>
            <div><span style={{ fontSize: 7, color: '#888', letterSpacing: '0.10em' }}>RevPAR</span><br /><span style={{ fontSize: 13, fontFamily: 'monospace', color: '#C4973A', fontWeight: 700 }}>${Math.round(bestScenario.inc.revpar)}</span></div>
            <div><span style={{ fontSize: 7, color: '#888', letterSpacing: '0.10em' }}>NOI Yield on Cost</span><br /><span style={{ fontSize: 13, fontFamily: 'monospace', color: '#22C55E', fontWeight: 700 }}>{tdc > 0 ? `${(bestScenario.noi / tdc * 100).toFixed(2)}%` : '—'}</span></div>
            <div><span style={{ fontSize: 7, color: '#888', letterSpacing: '0.10em' }}>Cap Rate</span><br /><span style={{ fontSize: 13, fontFamily: 'monospace', color: accentColor, fontWeight: 700 }}>{(bestScenario.hotelA.hotelCapRate * 100).toFixed(1)}%</span></div>
            <div><span style={{ fontSize: 7, color: '#888', letterSpacing: '0.10em' }}>GAV</span><br /><span style={{ fontSize: 13, fontFamily: 'monospace', color: accentColor, fontWeight: 700 }}>{fmt(gav)}</span></div>
          </div>
        </div>
      )}

      {/* ── Row 4: Scenario comparison ── */}
      {scenarios.length > 1 && (
        <ScenarioComparisonChart projectId={projectId} accentColor={accentColor} />
      )}

      {/* ── Row 5: Value creation summary ── */}
      {tdc > 0 && (
        <div style={{ padding: '20px 24px', border: '1px solid #E4E1DC', background: '#FFFFFF', marginBottom: 20 }}>
          <p style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#888', marginBottom: 16 }}>Value Creation Summary</p>
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { label: 'Land', value: landCostEff, color: '#C4973A' },
              { label: 'Build + Soft', value: tdc - landCostEff, color: '#444' },
              { label: 'Value Created (RLV − Land)', value: Math.max(0, rlv - landCostEff), color: '#22C55E' },
            ].map((seg, i) => {
              const pct = tdc > 0 ? (seg.value / Math.max(tdc, rlv)) * 100 : 0
              return (
                <div key={i} style={{ flex: pct, background: `${seg.color}18`, borderTop: `3px solid ${seg.color}`, padding: '10px 12px', minWidth: 0 }}>
                  <p style={{ fontSize: 8, color: seg.color, letterSpacing: '0.10em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{seg.label}</p>
                  <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#E4E1DC', fontWeight: 700, marginTop: 4 }}>{fmt(seg.value)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Land terms ── */}
      <div style={{ padding: '16px 24px', border: '1px solid #E4E1DC', background: '#FFFFFF' }}>
        <p style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#888', marginBottom: 12 }}>Land & Acquisition</p>
        <div style={{ display: 'flex', gap: 32 }}>
          <div><p style={{ fontSize: 7, color: '#888', letterSpacing: '0.10em' }}>Land Cost</p><p style={{ fontSize: 14, fontFamily: 'monospace', color: '#C4973A', fontWeight: 700, marginTop: 3 }}>{fmt(landCostEff, 2)}</p></div>
          {land.isInKind && <div><p style={{ fontSize: 7, color: '#888', letterSpacing: '0.10em' }}>In-Kind Vendor</p><p style={{ fontSize: 14, fontFamily: 'monospace', color: '#EAB308', fontWeight: 700, marginTop: 3 }}>{land.inKindGFA.toLocaleString()} sqm</p></div>}
          <div style={{ flex: 1, color: '#333', fontSize: 9, letterSpacing: '0.04em', lineHeight: 1.6 }}>{land.inKindNote || project?.address}</div>
        </div>
      </div>

      {/* ── Finance S-Curve ── */}
      <DashboardSCurve projectId={projectId} tdc={tdc} gav={gav} />

      {/* ── Project Health / Traffic Lights ── */}
      <ProjectHealthPanel projectId={projectId} />

      {/* Brand footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, marginTop: 32, paddingTop: 24, borderTop: '1px solid #FBFAF8' }}>
        <img src="/brand-logo-white.png" alt="7EVEN" draggable={false} style={{ width: 60, opacity: 0.12 }} />
        <p style={{ fontSize: 7, color: '#E0DDD8', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Confidential · {project?.name} · 7EVEN Capital</p>
      </div>
    </div>
  )
}

// ── Scenario comparison mini-chart ───────────────────────────────────────────

function ScenarioComparisonChart({ projectId, accentColor }: { projectId: string; accentColor: string }) {
  const store = useStore()
  const costData = store.getCostStack(projectId)
  const site     = store.getSiteDesign(projectId)
  const land     = store.getLandTerms(projectId)
  const inKindLineItem = land.isInKind && land.inKindGFA > 0
    ? { label: land.inKindLabel, gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote }
    : undefined

  const rows = useMemo(() => {
    const scenarios = store.getMixScenarios(projectId)
    return scenarios.map(s => {
      const hotelA = store.getHotelAssumptions(s.id)
      const bldRate = hotelA.buildRateOverride ?? costData.buildRatePerSqm
      const finPct  = hotelA.constructionFinancePct ?? costData.financePct
      const tdc = calculateCostStack({ ...costData, buildRatePerSqm: bldRate, financePct: finPct, gba: site.resiGBA, inKindLineItem, landCost: land.landCost }).totalDevelopmentCost
      let gav = 0, rlv = 0
      if (hotelA.keys > 0) {
        const inc = calculateHotelIncome(hotelA)
        const val = calculateHotelValuation(inc.noi, hotelA.hotelCapRate, tdc, hotelA.devMarginPct)
        gav = val.gav; rlv = val.rlv
      }
      return { name: s.name, tdc, gav, rlv }
    })
  }, [projectId])

  const maxVal = Math.max(...rows.flatMap(r => [r.tdc, r.gav]), 1)

  return (
    <div style={{ padding: '20px 24px', border: '1px solid #E4E1DC', background: '#FFFFFF', marginBottom: 20 }}>
      <p style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#888', marginBottom: 16 }}>Scenario Comparison — {rows.length} scenarios</p>
      {rows.map((r, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 9, color: '#666', marginBottom: 6, letterSpacing: '0.06em' }}>{r.name}</p>
          <HBar label="TDC" value={r.tdc} max={maxVal} color="#C4973A" />
          {r.gav > 0 && <HBar label="GAV" value={r.gav} max={maxVal} color={accentColor} />}
          {r.rlv > 0 && <HBar label="RLV" value={r.rlv} max={maxVal} color="#22C55E" />}
        </div>
      ))}
    </div>
  )
}

// ── Finance S-Curve (dashboard compact widget) ────────────────────────────────

function DashboardSCurve({ projectId, tdc, gav }: { projectId: string; tdc: number; gav: number }) {
  const tasks = useMemo(() => db.getTimelineTasks(projectId), [projectId])
  const fa    = useMemo(() => db.getFinanceAssumptions(projectId), [projectId])
  const land  = db.getLandTerms(projectId)
  const landCostEff = db.getEffectiveLandCost(projectId)  // ex GST when project applies GST
  const result = useMemo(() => calculateFinance(fa, tdc, landCostEff, gav), [fa, tdc, landCostEff, gav])
  const health = useMemo(() => getTimelineHealth(tasks), [tasks])
  const { setActiveTab } = useStore()

  if (tdc <= 0) return null

  return (
    <div style={{ padding: '20px 24px', border: '1px solid #E4E1DC', background: '#FFFFFF', marginBottom: 20 }}>
      {/* Header with click-through to Finance tab */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#888' }}>
          Finance S-Curve · Drawdown & Critical Path Sensitivity
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Mini traffic light summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: `${health.color}12`, border: `1px solid ${health.color}33` }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: health.color, display: 'block', boxShadow: `0 0 5px ${health.color}88` }} />
            <span style={{ fontSize: 8, fontWeight: 700, color: health.color, letterSpacing: '0.10em', textTransform: 'uppercase' as const }}>{health.label}</span>
          </div>
          <button onClick={() => setActiveTab('finance')}
            style={{ fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#C4973A', background: 'none', border: '1px solid #C4973A44', padding: '4px 10px', cursor: 'pointer' }}>
            Full Finance →
          </button>
        </div>
      </div>

      {/* Key finance numbers row */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
        {[
          { label: 'Total Debt',      value: fmt(result.totalDebt),        color: '#3B82F6' },
          { label: 'Equity Required', value: fmt(result.totalEquity),       color: '#22C55E' },
          { label: 'Finance Cost',    value: fmt(result.totalFinanceCost),  color: '#C4973A' },
          { label: '+3m Blowout',     value: fmt(result.blowout3m.totalFinanceCost - result.base.totalFinanceCost), color: '#EAB308' },
          { label: '+6m Blowout',     value: fmt(result.blowout6m.totalFinanceCost - result.base.totalFinanceCost), color: '#F97316' },
          { label: '+12m Blowout',    value: fmt(result.blowout12m.totalFinanceCost - result.base.totalFinanceCost), color: '#EF4444' },
        ].map(({ label, value, color }, i) => (
          <div key={i} style={{ flex: 1, padding: '10px 12px', borderRight: i < 5 ? '1px solid #E4E1DC' : 'none', minWidth: 0 }}>
            <p style={{ fontSize: 7, color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
            <p style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Compact S-curve */}
      <FinanceSCurve fa={fa} result={result} tdc={tdc} tasks={tasks} dark={true} compact={true} />
    </div>
  )
}

// ── Project Health Panel ──────────────────────────────────────────────────────

function ProjectHealthPanel({ projectId }: { projectId: string }) {
  const tasks = db.getTimelineTasks(projectId)
  const { setActiveTab } = useStore()
  if (tasks.length === 0) return null

  function goToTimeline() { setActiveTab('timeline') }

  const counts = {
    critical:    tasks.filter(t => t.status === 'critical').length,
    delayed:     tasks.filter(t => t.status === 'delayed').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    complete:    tasks.filter(t => t.status === 'complete').length,
    'not-started': tasks.filter(t => t.status === 'not-started').length,
  }

  const criticalTasks = tasks.filter(t => t.status === 'critical')
  const delayedTasks  = tasks.filter(t => t.status === 'delayed')
  const atRisk = [...criticalTasks, ...delayedTasks]

  const upcoming = tasks
    .filter(t => t.isMilestone && t.status !== 'complete')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 5)

  const overallPct = tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0

  return (
    <>
      <style>{`
        @keyframes ph-pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .ph-crit { animation: ph-pulse 1.2s ease-in-out infinite; }
        @keyframes ph-ring { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(2.4);opacity:0} }
        .ph-ring { animation: ph-ring 1.2s ease-out infinite; }
      `}</style>

      <div style={{ padding: '20px 24px', border: '1px solid #E4E1DC', background: '#FFFFFF', marginBottom: 20 }}>
        <p style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#888', marginBottom: 18 }}>Project Health — Timeline Tracker</p>

        {/* Traffic light row */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
          {([
            { key: 'critical',    color: '#EF4444', flash: true  },
            { key: 'delayed',     color: '#EAB308', flash: false },
            { key: 'in-progress', color: '#22C55E', flash: false },
            { key: 'complete',    color: '#A855F7', flash: false },
            { key: 'not-started', color: '#555555', flash: false },
          ] as const).map(({ key, color, flash }) => {
            const n = counts[key]
            const pct = tasks.length > 0 ? (n / tasks.length) * 100 : 0
            return (
              <button key={key} onClick={goToTimeline} style={{ flex: 1, padding: '14px 12px', borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 1, borderRightStyle: 'solid', borderRightColor: '#E4E1DC', borderBottomWidth: 3, borderBottomStyle: 'solid', borderBottomColor: n > 0 ? color : '#E4E1DC', background: n > 0 ? `${color}0A` : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = n > 0 ? `${color}18` : '#FBFAF8')}
                onMouseLeave={e => (e.currentTarget.style.background = n > 0 ? `${color}0A` : 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ position: 'relative', width: 12, height: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {flash && n > 0 && <span className="ph-ring" style={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: color } as CSSProperties} />}
                    <span className={flash && n > 0 ? 'ph-crit' : ''} style={{ width: 12, height: 12, borderRadius: '50%', background: n > 0 ? color : '#E4E1DC', border: n === 0 ? `1px solid ${color}33` : 'none', display: 'block' }} />
                  </span>
                  <span style={{ fontSize: 7, letterSpacing: '0.14em', textTransform: 'uppercase', color: n > 0 ? color : '#333' }}>{STATUS_SHORT[key]}</span>
                </div>
                <p style={{ fontSize: 22, fontFamily: "'Optima',serif", fontWeight: 700, color: n > 0 ? color : '#222', lineHeight: 1 }}>{n}</p>
                <p style={{ fontSize: 8, color: '#555', marginTop: 4 }}>{pct.toFixed(0)}% of tasks</p>
              </button>
            )
          })}
          {/* Overall progress */}
          <div style={{ flex: 1, padding: '14px 12px', background: '#F7F5F2' }}>
            <p style={{ fontSize: 7, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>Overall Progress</p>
            <p style={{ fontSize: 22, fontFamily: "'Optima',serif", fontWeight: 700, color: '#C4973A', lineHeight: 1 }}>{overallPct}%</p>
            <div style={{ marginTop: 8, height: 3, background: '#E4E1DC', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${overallPct}%`, background: overallPct >= 80 ? '#22C55E' : overallPct >= 40 ? '#C4973A' : '#3B82F6', borderRadius: 2 }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          {/* At-risk tasks */}
          {atRisk.length > 0 && (
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 7, letterSpacing: '0.20em', textTransform: 'uppercase', color: '#EF4444', marginBottom: 10 }}>⚠ Requires Attention</p>
              {atRisk.slice(0, 6).map(t => (
                <button key={t.id} onClick={goToTimeline} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, padding: '6px 10px', background: `${STATUS_COLORS[t.status]}08`, borderLeft: `2px solid ${STATUS_COLORS[t.status]}`, width: '100%', cursor: 'pointer', textAlign: 'left', border: 'none', borderLeft: `2px solid ${STATUS_COLORS[t.status]}` }}>
                  <span className={t.status === 'critical' ? 'ph-crit' : ''} style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLORS[t.status], flexShrink: 0, display: 'block' }} />
                  <span style={{ fontSize: 10, color: '#aaa', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                  <span style={{ fontSize: 7, color: STATUS_COLORS[t.status], letterSpacing: '0.10em', flexShrink: 0 }}>{STATUS_SHORT[t.status]}</span>
                  <span style={{ fontSize: 9, color: '#444', flexShrink: 0, marginLeft: 4 }}>→</span>
                </button>
              ))}
            </div>
          )}

          {/* Upcoming milestones */}
          {upcoming.length > 0 && (
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 7, letterSpacing: '0.20em', textTransform: 'uppercase', color: '#C4973A', marginBottom: 10 }}>◆ Upcoming Milestones</p>
              {upcoming.map(t => (
                <button key={t.id} onClick={goToTimeline} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, padding: '6px 10px', background: '#FAFAF8', width: '100%', cursor: 'pointer', textAlign: 'left', border: 'none', borderLeft: '2px solid #C4973A44' }}>
                  <span style={{ width: 7, height: 7, transform: 'rotate(45deg)', background: '#C4973A', flexShrink: 0, display: 'block' }} />
                  <span style={{ fontSize: 10, color: '#aaa', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                  <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#666', flexShrink: 0 }}>{new Date(t.startDate + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })}</span>
                  <span style={{ fontSize: 9, color: '#444', flexShrink: 0, marginLeft: 4 }}>→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
