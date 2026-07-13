import React, { useMemo, useState } from 'react'
import { useStore } from '../../store'
import * as db from '../../db'
import { calculateCostStack } from '../../engine/costStack'
import { calculateHotelIncome, calculateHotelValuation } from '../../engine/hotel'
import { calculateBTRIncome, calculateBTRValuation } from '../../engine/btr'
import { calculateBTSValuation } from '../../engine/bts'
import { calculateFinance } from '../../engine/finance'
import { COST_PHASES, CATEGORY_TO_PHASE } from '../../db/schema'

interface Props { projectId: string }

// ── Formatting ────────────────────────────────────────────────────────────────
function fmt(n: number, d = 1) {
  if (!isFinite(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(d)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString()}`
}
const pctS = (n: number, d = 1) => isFinite(n) ? `${(n * 100).toFixed(d)}%` : '—'

const INK = '#1A1A1A', MUTE = '#8A8A8A', LINE = '#ECEAE5', RED = '#DC2626', GREEN = '#16A34A', GOLD = '#F59E0B'

const PHASE_COLOR: Record<string, string> = {
  'pre-acquisition': '#F59E0B', 'acquisition-planning': '#8B5CF6',
  'pre-construction': '#3B82F6', 'construction': '#16A34A', 'close-out': '#9CA3AF',
}
// Cost-breakdown palette
const COST_COLORS = { land: '#60A5FA', build: '#8B8CF0', fees: '#34D399', statutory: '#F59E0B', finance: '#F87171', mgmt: '#A3E635' }

const LENSES = [['developer', 'Developer'], ['builder', 'Builder'], ['bank', 'Bank / lender'], ['equity', 'Equity investor']] as const

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, padding: 20, ...style }}>{children}</div>
}
function Label({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTE, fontWeight: 600 }}>{children}</span>
      {right}
    </div>
  )
}

export default function ProjectDashboard({ projectId }: Props) {
  const store = useStore()
  const [lens, setLens] = useState<typeof LENSES[number][0]>('developer')
  const project = store.projects.find(p => p.id === projectId)
  const site = store.getSiteDesign(projectId)
  const land = store.getLandTerms(projectId)
  const landCostEff = store.getEffectiveLandCost(projectId)
  const costData = store.getCostStack(projectId)
  const inKindLineItem = land.isInKind && land.inKindGFA > 0
    ? { label: land.inKindLabel, gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote } : undefined

  const { bestScenario } = useMemo(() => {
    const scenarios = store.getMixScenarios(projectId)
    const landEff = store.getEffectiveLandCost(projectId)
    let best: any = null
    for (const s of scenarios) {
      const units = store.getUnitTypes(s.id)
      const hotelA = store.getHotelAssumptions(s.id), btrA = store.getBTRAssumptions(s.id), btsA = store.getBTSAssumptions(s.id)
      const cs = calculateCostStack({ ...costData, buildRatePerSqm: hotelA.buildRateOverride ?? costData.buildRatePerSqm, financePct: hotelA.constructionFinancePct ?? costData.financePct, gba: site.resiGBA, inKindLineItem, landCost: land.landCost })
      const tdcBuild = cs.totalDevelopmentCost, tdc = tdcBuild + landEff
      if (hotelA.keys > 0) {
        const inc = calculateHotelIncome(hotelA); const val = calculateHotelValuation(inc.noi, hotelA.hotelCapRate, tdcBuild, hotelA.devMarginPct)
        if (!best || val.rlv > best.rlv) best = { ...val, strategy: 'Hotel', tdc }
      }
      if (units.some(u => u.weeklyRentConservative > 0)) {
        const ul = units.map(u => ({ typeName: u.name, unitCount: u.solvedCount, weeklyRentConservative: u.weeklyRentConservative, weeklyRentAggressive: u.weeklyRentAggressive, opexPerUnitPerYear: u.opexPerUnitPerYear }))
        const i2 = calculateBTRIncome({ unitLines: ul, vacancyPct: btrA.vacancyPct, managementFeePct: btrA.managementFeePct, commercialIncomeLines: [], carParkIncomeAnnual: btrA.carParkIncomeAnnual, buildingAdminFixed: btrA.buildingAdminFixed }, 'conservative')
        const v2 = calculateBTRValuation(i2.noi, btrA.capRateConservative, tdcBuild, btrA.devMarginPct)
        if (!best || v2.rlv > best.rlv) best = { ...v2, strategy: 'BTR', tdc }
        const bl = units.map(u => ({ typeName: u.name, unitCount: u.solvedCount, pricePerUnit: u.salePriceMid }))
        const v3 = calculateBTSValuation(bl, [], btsA.sellingCostsPct, tdcBuild, btsA.devMarginPct, costData.gstEnabled)
        if (!best || v3.rlv > best.rlv) best = { gav: v3.grossRevenue, rlv: v3.rlv, strategy: 'BTS', tdc }
      }
    }
    return { bestScenario: best }
  }, [projectId, costData, site])

  const costStack = useMemo(() => calculateCostStack({ ...costData, gba: site.resiGBA, inKindLineItem, landCost: land.landCost }), [costData, site])
  const proj = useMemo(() => db.getProjectTDC(projectId), [projectId, costData, site])

  const buckets = {
    land: landCostEff,
    build: costStack.construction + costStack.contingency + costStack.prelims,
    fees: costStack.professionalFees,
    statutory: costData.statutoryFixed || 0,
    finance: proj.financeCost,
    mgmt: (costData.projectManagementFixed || 0) + (costData.marketingFixed || 0) + (costData.amenityFitoutFixed || 0),
  }
  const tdc = proj.tdc
  const gav = bestScenario?.gav ?? proj.gdv
  const rlv = bestScenario?.rlv ?? 0
  const devProfit = gav - tdc
  const margin = tdc > 0 ? devProfit / tdc : 0
  const fundingIncomplete = gav <= 0 || bestScenario == null

  // Phase tracking
  const phaseTracking = useMemo(() => {
    const costs = db.getPhaseCosts(projectId)
    const tasks = db.getTimelineTasks(projectId)
    return COST_PHASES.map(p => {
      const inPhase = tasks.filter(t => (t.phase ?? CATEGORY_TO_PHASE[t.category]) === p.id)
      const done = inPhase.filter(t => t.status === 'complete').length
      const progress = inPhase.length ? Math.round(inPhase.reduce((s, t) => s + t.progress, 0) / inPhase.length) : 0
      const starts = inPhase.map(t => t.startDate).filter(Boolean).sort()
      const ends = inPhase.map(t => t.endDate).filter(Boolean).sort()
      return { id: p.id, label: p.label, cost: costs[p.id] || 0, tasks: inPhase.length, done, progress, start: starts[0], end: ends[ends.length - 1] }
    })
  }, [projectId, costData, tdc])
  const phaseTotal = phaseTracking.reduce((s, p) => s + p.cost, 0) || 1

  // Finance sensitivity + capital stack
  const fa = useMemo(() => db.getFinanceAssumptions(projectId), [projectId])
  const finance = useMemo(() => calculateFinance(fa, tdc, landCostEff, gav), [fa, tdc, landCostEff, gav])

  // Timeline health
  const tasks = db.getTimelineTasks(projectId)
  const counts = {
    critical: tasks.filter(t => t.status === 'critical').length,
    delayed: tasks.filter(t => t.status === 'delayed').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    complete: tasks.filter(t => t.status === 'complete').length,
    'not-started': tasks.filter(t => t.status === 'not-started').length,
  }
  const overallPct = tasks.length ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0
  const milestones = tasks.filter(t => t.isMilestone).sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 8)
  const allStart = phaseTracking.map(p => p.start).filter(Boolean).sort()[0]
  const allEnd = phaseTracking.map(p => p.end).filter(Boolean).sort().slice(-1)[0]
  const fmtMY = (d?: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }) : '—'

  const COST_ROWS = [
    { key: 'land', label: 'Land & acquisition', v: buckets.land, c: COST_COLORS.land },
    { key: 'build', label: 'Hard costs (build)', v: buckets.build, c: COST_COLORS.build },
    { key: 'fees', label: 'Professional fees', v: buckets.fees, c: COST_COLORS.fees },
    { key: 'statutory', label: 'Statutory & council', v: buckets.statutory, c: COST_COLORS.statutory },
    { key: 'finance', label: 'Finance cost', v: buckets.finance, c: COST_COLORS.finance },
    { key: 'mgmt', label: 'Mgmt & marketing', v: buckets.mgmt, c: COST_COLORS.mgmt },
  ]
  const costMax = Math.max(...COST_ROWS.map(r => r.v), 1)
  const costSum = COST_ROWS.reduce((s, r) => s + r.v, 0) || 1

  return (
    <div style={{ background: '#FAF9F7', minHeight: '100%', padding: '18px 24px 48px', color: INK }}>
      {/* Setup banner */}
      {fundingIncomplete && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#FEFCE8', border: '1px solid #FDE68A', borderRadius: 8, marginBottom: 18, fontSize: 12, color: '#854D0E' }}>
          <span>⚠</span> Setup incomplete — equity and revenue inputs required before profit and margin outputs are valid.
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display: 'flex', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, marginBottom: 16 }}>
        {[
          { l: 'Total dev cost', v: fmt(tdc, 1), s: 'land + all costs', c: INK },
          { l: 'Gross asset value', v: gav > 0 ? fmt(gav, 1) : '—', s: bestScenario ? `${bestScenario.strategy} yield basis` : 'no scenario', c: INK },
          { l: 'Dev profit', v: gav > 0 ? fmt(devProfit, 1) : '—', s: fundingIncomplete ? 'funding incomplete' : 'GAV − TDC', c: devProfit < 0 ? RED : GREEN },
          { l: 'Dev margin', v: gav > 0 ? pctS(margin) : '—', s: 'on total cost', c: margin < 0 ? RED : margin > 0.15 ? GREEN : GOLD },
          { l: 'Residual land value', v: rlv > 0 ? fmt(rlv, 1) : '—', s: `vs ${fmt(landCostEff, 1)} paid`, c: rlv > landCostEff ? GREEN : GOLD },
          { l: 'GFA', v: site.resiGFA ? site.resiGFA.toLocaleString() : '—', s: 'sqm', c: INK },
        ].map((k, i) => (
          <div key={i} style={{ flex: 1, padding: '16px 18px', borderRight: i < 5 ? `1px solid ${LINE}` : 'none' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTE, fontWeight: 600, marginBottom: 6 }}>{k.l}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: k.c }}>{k.v}</div>
            <div style={{ fontSize: 10, color: MUTE, marginTop: 3 }}>{k.s}</div>
          </div>
        ))}
      </div>

      {/* Lenses */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: MUTE }}>View as</span>
        {LENSES.map(([id, label]) => (
          <button key={id} onClick={() => setLens(id)} style={{ borderRadius: 20, border: `1px solid ${LINE}`, padding: '5px 14px', fontSize: 11, cursor: 'pointer', background: lens === id ? INK : '#fff', color: lens === id ? '#fff' : INK, fontWeight: lens === id ? 600 : 400 }}>{label}</button>
        ))}
      </div>

      {/* Row: cost stack + value creation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <Label right={<span onClick={() => store.setActiveTab('cost')} style={{ fontSize: 11, color: '#2563EB', cursor: 'pointer' }}>full breakdown →</span>}>Development cost stack — {fmt(tdc, 1)} TDC</Label>
          {COST_ROWS.map(r => (
            <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 11 }}>
              <span style={{ fontSize: 11, color: '#444', width: 128, flexShrink: 0 }}>{r.label}</span>
              <div style={{ flex: 1, height: 6, background: '#F1EFEA', borderRadius: 4 }}>
                <div style={{ width: `${(r.v / costMax) * 100}%`, height: '100%', background: r.c, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, width: 68, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.v, 1)}</span>
            </div>
          ))}
          {/* Composition bar */}
          <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 14 }}>
            {COST_ROWS.map(r => <div key={r.key} style={{ width: `${(r.v / costSum) * 100}%`, background: r.c }} />)}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
            {COST_ROWS.map(r => <span key={r.key} style={{ fontSize: 9, color: MUTE }}><span style={{ display: 'inline-block', width: 7, height: 7, background: r.c, marginRight: 4, borderRadius: 2 }} />{r.label.split(' ')[0]}</span>)}
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: 16 }}>
            <Label>Value creation</Label>
            <div style={{ display: 'flex', height: 26, borderRadius: 5, overflow: 'hidden', fontSize: 9, color: '#fff', fontWeight: 600 }}>
              <div style={{ width: `${Math.max(6, (buckets.land / Math.max(gav, tdc, 1)) * 100)}%`, background: '#93C5FD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E3A8A' }}>Land</div>
              <div style={{ width: `${Math.max(10, ((tdc - buckets.land) / Math.max(gav, tdc, 1)) * 100)}%`, background: '#C7C8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3730A3' }}>Build + soft</div>
              {devProfit > 0 && <div style={{ width: `${(devProfit / Math.max(gav, tdc, 1)) * 100}%`, background: '#6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#065F46' }}>+{fmt(devProfit, 1)}</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: MUTE }}>
              <span>Land {fmt(buckets.land, 1)}</span>
              <span>GAV {gav > 0 ? fmt(gav, 1) : '—'}</span>
              <span style={{ color: rlv > landCostEff ? GREEN : MUTE }}>RLV {rlv > 0 ? `${rlv > landCostEff ? '+' : ''}${fmt(rlv - landCostEff, 1)}` : '—'}</span>
            </div>
          </Card>
          <Card style={{ padding: 16 }}>
            <Label>Land & acquisition</Label>
            <div style={{ fontSize: 20, fontWeight: 600, color: GOLD, marginBottom: 8 }}>{fmt(landCostEff, 2)}</div>
            <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5 }}>{land.notes || `Contract ${fmt(land.landCost, 1)} · stamp duty ${fmt(land.stampDuty || 0, 1)} · settlement ${land.settlementDate || '—'}.`}</div>
          </Card>
        </div>
      </div>

      {/* Cost & time by phase */}
      <Card style={{ marginBottom: 16 }}>
        <Label right={<span onClick={() => store.setActiveTab('timeline')} style={{ fontSize: 11, color: '#2563EB', cursor: 'pointer' }}>timeline →</span>}>Cost & time by phase</Label>
        {phaseTracking.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: PHASE_COLOR[p.id], flexShrink: 0 }} />
            <span style={{ fontSize: 12, width: 150, flexShrink: 0 }}>{p.label}</span>
            <div style={{ flex: 1, height: 6, background: '#F1EFEA', borderRadius: 4 }}>
              <div style={{ width: `${(p.cost / phaseTotal) * 100}%`, height: '100%', background: PHASE_COLOR[p.id], borderRadius: 4, opacity: 0.85 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, width: 72, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.cost, 1)}</span>
            <span style={{ fontSize: 10, fontWeight: 600, width: 46, textAlign: 'right', color: p.progress >= 100 ? GREEN : p.progress > 0 ? GOLD : MUTE, background: p.progress >= 100 ? '#DCFCE7' : p.progress > 0 ? '#FEF3C7' : '#F3F4F6', borderRadius: 10, padding: '2px 0' }}>{p.progress}%</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: MUTE }}>
          <span>{fmtMY(allStart)} → {fmtMY(allEnd)}</span>
          <span style={{ fontWeight: 600, color: INK }}>Total {fmt(phaseTotal, 1)}</span>
        </div>
      </Card>

      {/* Row: finance sensitivity + health + milestones/returns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Finance sensitivity */}
        <Card>
          <Label right={<span onClick={() => store.setActiveTab('finance')} style={{ fontSize: 11, color: '#2563EB', cursor: 'pointer' }}>full →</span>}>Finance — critical path sensitivity</Label>
          <div style={{ padding: '10px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, fontSize: 12, color: '#166534', marginBottom: 14 }}>✓ On track · Month {overallPct > 0 ? Math.max(1, Math.round(tasks.length * overallPct / 100)) : 0}/{tasks.length}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead><tr style={{ color: MUTE }}><th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }} /><th style={{ padding: '4px 6px' }}>Base</th><th style={{ padding: '4px 6px' }}>+3mo</th><th style={{ padding: '4px 6px' }}>+6mo</th><th style={{ padding: '4px 6px' }}>+12mo</th></tr></thead>
            <tbody>
              <tr>
                <td style={{ padding: '6px', color: '#444' }}>Finance cost</td>
                {[finance.base, finance.blowout3m, finance.blowout6m, finance.blowout12m].map((s, i) => (
                  <td key={i} style={{ textAlign: 'center', padding: '6px', fontWeight: 600, background: i === 0 ? '#F0FDF4' : i === 3 ? '#FEF2F2' : '#FFFBEB', borderRadius: 4 }}>{fmt(s.totalFinanceCost, 0)}</td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '6px', color: '#444' }}>Margin Δ</td>
                {[finance.base, finance.blowout3m, finance.blowout6m, finance.blowout12m].map((s, i) => (
                  <td key={i} style={{ textAlign: 'center', padding: '6px', color: i === 0 ? MUTE : RED }}>{i === 0 ? '—' : pctS(s.marginImpact, 1)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </Card>

        {/* Project health */}
        <Card>
          <Label>Project health</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {([['critical', 'Critical', RED], ['delayed', 'Delayed', GOLD], ['in-progress', 'On track', GREEN], ['complete', 'Complete', '#2563EB'], ['not-started', 'Not started', MUTE]] as const).map(([k, lab, c]) => (
              <div key={k} style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: counts[k] > 0 ? c : INK }}>{counts[k]}</div>
                <div style={{ fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTE, marginTop: 2 }}>{lab}</div>
              </div>
            ))}
            <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '10px 12px', textAlign: 'center', background: '#FAF9F7' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: GOLD }}>{overallPct}%</div>
              <div style={{ fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTE, marginTop: 2 }}>Overall</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: MUTE, margin: '14px 0 6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Capital stack</div>
          <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${(finance.totalDebt / Math.max(tdc, 1)) * 100}%`, background: '#3B82F6' }} />
            <div style={{ width: `${(finance.totalEquity / Math.max(tdc, 1)) * 100}%`, background: '#16A34A' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10, color: MUTE }}>
            <span><span style={{ display: 'inline-block', width: 7, height: 7, background: '#3B82F6', marginRight: 4, borderRadius: 2 }} />Debt {fmt(finance.totalDebt, 1)}</span>
            <span><span style={{ display: 'inline-block', width: 7, height: 7, background: '#16A34A', marginRight: 4, borderRadius: 2 }} />Equity {fmt(finance.totalEquity, 1)}</span>
          </div>
        </Card>

        {/* Milestones + returns */}
        <Card>
          <Label right={<span onClick={() => store.setActiveTab('timeline')} style={{ fontSize: 11, color: '#2563EB', cursor: 'pointer' }}>all tasks →</span>}>Upcoming milestones</Label>
          {milestones.length === 0 && <div style={{ fontSize: 11, color: MUTE }}>No milestones scheduled.</div>}
          {milestones.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.status === 'complete' ? GREEN : GOLD, flexShrink: 0 }} />
              <span style={{ fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
              <span style={{ fontSize: 10, color: MUTE, flexShrink: 0 }}>{fmtMY(t.startDate)}</span>
            </div>
          ))}
          <div style={{ fontSize: 10, color: MUTE, margin: '16px 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Returns at completion</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
            {[['IRR', '—'], ['Multiple', '—'], ['ROC', '—'], ['Margin', gav > 0 ? pctS(margin, 0) : '—']].map(([l, v]) => (
              <div key={l} style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTE }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: l === 'Margin' && margin < 0 ? RED : INK, marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>
          {fundingIncomplete && <div style={{ marginTop: 10, padding: '8px 10px', background: '#FEFCE8', border: '1px solid #FDE68A', borderRadius: 6, fontSize: 10, color: '#854D0E' }}>🔒 Complete funding stack to unlock returns</div>}
        </Card>
      </div>
    </div>
  )
}
