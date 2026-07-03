import React, { useMemo } from 'react'
import * as db from '../db'
import { calculateCostStack } from '../engine/costStack'
import { calculateHotelIncome, calculateHotelValuation } from '../engine/hotel'
import { calculateBTRIncome, calculateBTRValuation } from '../engine/btr'
import { calculateBTSValuation } from '../engine/bts'
import { Wordmark, DesignCredit } from '../components/ui'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 1) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(decimals)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function pctFmt(n: number) { return `${(n * 100).toFixed(1)}%` }

const TYPE_COLOR: Record<string, string> = {
  hotel: '#A855F7',
  btr:   '#22C55E',
  bts:   '#3B82F6',
  mixed: '#E8E6E1',
}
const STATUS_COLOR: Record<string, string> = {
  active:   '#C4973A',
  pending:  '#EAB308',
  'on-hold':'#EF4444',
  archived: '#444',
}

function dotColor(type?: string, status?: string) {
  if (status === 'on-hold') return '#EF4444'
  if (status === 'pending') return '#EAB308'
  return TYPE_COLOR[type ?? ''] ?? '#555'
}

// ── Data aggregation ──────────────────────────────────────────────────────────

interface ProjectSummary {
  id: string
  name: string
  suburb: string
  type?: string
  status: string
  tdc: number
  bestGAV: number
  bestRLV: number
  bestStrategy: string
  gba: number
  nsa: number
  keys: number
}

function aggregatePortfolio(brand?: '7even' | 'haavn'): ProjectSummary[] {
  const allProjects = db.getProjects()
  const projects = brand
    ? allProjects.filter(p => brand === 'haavn' ? p.brand === 'haavn' : (!p.brand || p.brand === '7even'))
    : allProjects
  const results: ProjectSummary[] = []

  for (const p of projects) {
    const site     = db.getSiteDesign(p.id)
    const land     = db.getLandTerms(p.id)
    const costData = db.getCostStack(p.id)
    const inKindLineItem = land.isInKind && land.inKindGFA > 0
      ? { label: land.inKindLabel, gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote }
      : undefined

    const scenarios = db.getMixScenarios(p.id)
    let bestRLV = -Infinity
    let bestGAV = 0
    let bestStrategy = '—'
    let bestTDC = 0

    for (const s of scenarios) {
      const units   = db.getUnitTypes(s.id)
      const hotelA  = db.getHotelAssumptions(s.id)
      const btrA    = db.getBTRAssumptions(s.id)
      const btsA    = db.getBTSAssumptions(s.id)

      const effectiveBuildRate  = hotelA.buildRateOverride ?? costData.buildRatePerSqm
      const effectiveFinancePct = hotelA.constructionFinancePct ?? costData.financePct
      const tdc = calculateCostStack({
        ...costData,
        buildRatePerSqm: effectiveBuildRate,
        financePct: effectiveFinancePct,
        gba: site.resiGBA,
        inKindLineItem,
      }).totalDevelopmentCost

      // Hotel
      if (hotelA.keys > 0) {
        const inc = calculateHotelIncome(hotelA)
        const val = calculateHotelValuation(inc.noi, hotelA.hotelCapRate, tdc, hotelA.devMarginPct)
        if (val.rlv > bestRLV) { bestRLV = val.rlv; bestGAV = val.gav; bestStrategy = 'Hotel'; bestTDC = tdc }
      }

      // BTR (conservative)
      const hasRentUnits = units.some(u => u.weeklyRentConservative > 0)
      if (hasRentUnits) {
        const unitLines = units.map(u => ({ typeName: u.name, unitCount: u.solvedCount, weeklyRentConservative: u.weeklyRentConservative, weeklyRentAggressive: u.weeklyRentAggressive, opexPerUnitPerYear: u.opexPerUnitPerYear }))
        const btrInputs = { unitLines, vacancyPct: btrA.vacancyPct, managementFeePct: btrA.managementFeePct, commercialIncomeLines: [], carParkIncomeAnnual: btrA.carParkIncomeAnnual, buildingAdminFixed: btrA.buildingAdminFixed }
        const consI = calculateBTRIncome(btrInputs, 'conservative')
        const consV = calculateBTRValuation(consI.noi, btrA.capRateConservative, tdc, btrA.devMarginPct)
        if (consV.rlv > bestRLV) { bestRLV = consV.rlv; bestGAV = consV.gav; bestStrategy = 'BTR'; bestTDC = tdc }

        // BTS (mid)
        const btsLines = units.map(u => ({ typeName: u.name, unitCount: u.solvedCount, pricePerUnit: u.salePriceMid }))
        const btsMid = calculateBTSValuation(btsLines, [], btsA.sellingCostsPct, tdc, btsA.devMarginPct, costData.gstEnabled)
        if (btsMid.rlv > bestRLV) { bestRLV = btsMid.rlv; bestGAV = btsMid.grossRevenue; bestStrategy = 'BTS'; bestTDC = tdc }
      }
    }

    const defaultTDC = calculateCostStack({ ...costData, gba: site.resiGBA, inKindLineItem }).totalDevelopmentCost
    results.push({
      id: p.id, name: p.name, suburb: p.suburb, type: p.type, status: p.status,
      tdc: bestTDC || defaultTDC,
      bestGAV: bestGAV || 0,
      bestRLV: isFinite(bestRLV) ? bestRLV : 0,
      bestStrategy,
      gba: site.resiGBA,
      nsa: site.resiNSA,
      keys: scenarios.reduce((max, s) => Math.max(max, db.getHotelAssumptions(s.id).keys ?? 0), 0),
    })
  }

  return results
}

// ── SVG Donut Chart ───────────────────────────────────────────────────────────

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null
  const r = 60, cx = 80, cy = 80, strokeW = 22
  const circ = 2 * Math.PI * r
  let offset = 0

  return (
    <svg viewBox="0 0 160 160" style={{ width: 160, height: 160, flexShrink: 0 }}>
      {data.map((d, i) => {
        const dash = (d.value / total) * circ
        const seg = (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={d.color} strokeWidth={strokeW}
            strokeDasharray={`${dash - 2} ${circ - dash + 2}`}
            strokeDashoffset={-offset + circ / 4}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        )
        offset += dash
        return seg
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize={22} fontWeight={700} fontFamily="'Optima',serif">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#555" fontSize={8} letterSpacing={2}>PROJECTS</text>
    </svg>
  )
}

// ── Horizontal Bar ─────────────────────────────────────────────────────────────

function HBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#555' }}>{label}</span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#C4973A', fontWeight: 700 }}>{fmt(value)}</span>
      </div>
      <div style={{ height: 4, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 2, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPI({ label, value, sub, color = '#C4973A' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ padding: '20px 24px', border: '1px solid #1A1A1A', background: '#0C0C0C', flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#444', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 26, fontFamily: "'Optima','Gill Sans',serif", fontWeight: 700, color, letterSpacing: '-0.01em', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 9, color: '#333', marginTop: 6, letterSpacing: '0.06em' }}>{sub}</p>}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard({ onBack, brand = '7even' }: { onBack: () => void; brand?: '7even' | 'haavn' }) {
  const portfolio = useMemo(() => aggregatePortfolio(brand), [brand])
  const is7even = brand === '7even'
  const accentColor = is7even ? '#C4973A' : 'rgba(255,255,255,0.70)'
  const brandLabel = is7even ? '7EVEN' : 'HAAVN'

  const totalTDC   = portfolio.reduce((s, p) => s + p.tdc, 0)
  const totalGAV   = portfolio.reduce((s, p) => s + p.bestGAV, 0)
  const totalRLV   = portfolio.reduce((s, p) => s + p.bestRLV, 0)
  const maxVal     = Math.max(...portfolio.map(p => Math.max(p.tdc, p.bestGAV, p.bestRLV)), 1)

  // Donut data by type
  const typeCounts: Record<string, number> = {}
  portfolio.forEach(p => { const k = p.type ?? 'unknown'; typeCounts[k] = (typeCounts[k] ?? 0) + 1 })
  const donutData = Object.entries(typeCounts).map(([label, value]) => ({
    label: label.toUpperCase(), value, color: TYPE_COLOR[label] ?? '#444',
  }))

  // Status counts
  const statusCounts: Record<string, number> = {}
  portfolio.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1 })

  const totalGBA = portfolio.reduce((s, p) => s + p.gba, 0)
  const totalKeys = portfolio.reduce((s, p) => s + p.keys, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#060606', color: '#fff', overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <div className="drag-region" style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '16px 40px', borderBottom: '1px solid #111', flexShrink: 0, background: '#0A0A0A' }}>
        <button className="no-drag" onClick={onBack} style={{ color: '#666', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#C4973A')}
          onMouseLeave={e => (e.currentTarget.style.color = '#666')}>
          ← Menu
        </button>
        <div style={{ width: 1, height: 20, background: '#1C1C1C' }} />
        <Wordmark size="sm" />
        <div style={{ width: 1, height: 20, background: '#1C1C1C' }} />
        <div>
          <p style={{ fontSize: 9, letterSpacing: '0.30em', textTransform: 'uppercase', color: accentColor, lineHeight: 1 }}>{brandLabel} · Portfolio</p>
          <p style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#fff', fontWeight: 600, marginTop: 2 }}>Intelligence Dashboard</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <p style={{ fontSize: 8, letterSpacing: '0.22em', color: '#333', textTransform: 'uppercase', textAlign: 'right' }}>
            {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px 48px' }}>

        {/* ── KPI row ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          <KPI label="Total Projects" value={String(portfolio.length)} sub={`${totalGBA.toLocaleString()} sqm GBA`} color="#fff" />
          <KPI label="Portfolio TDC" value={fmt(totalTDC)} sub="Total development cost" color={accentColor} />
          <KPI label="Portfolio GAV" value={fmt(totalGAV)} sub="Gross asset value" color="#A855F7" />
          <KPI label="Portfolio RLV" value={fmt(totalRLV)} sub="Residual land value" color="#22C55E" />
          {totalKeys > 0 && <KPI label="Hotel Keys" value={String(totalKeys)} sub="Across hotel projects" color="#C4973A" />}
        </div>

        {/* ── Row 2: Donut + Status + Type breakdown ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>

          {/* Donut */}
          <div style={{ padding: '24px 28px', border: '1px solid #1A1A1A', background: '#0C0C0C', display: 'flex', alignItems: 'center', gap: 32 }}>
            <DonutChart data={donutData} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#444', marginBottom: 2 }}>By Concept</p>
              {donutData.map(d => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, letterSpacing: '0.12em', color: '#888', textTransform: 'uppercase' }}>{d.label}</span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#fff', marginLeft: 'auto', paddingLeft: 16, fontWeight: 700 }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status breakdown */}
          <div style={{ padding: '24px 28px', border: '1px solid #1A1A1A', background: '#0C0C0C', flex: 1 }}>
            <p style={{ fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#444', marginBottom: 20 }}>Project Status</p>
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'capitalize', color: STATUS_COLOR[status] ?? '#888' }}>{status}</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#fff' }}>{count} / {portfolio.length}</span>
                </div>
                <div style={{ height: 3, background: '#111', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${(count / portfolio.length) * 100}%`, background: STATUS_COLOR[status] ?? '#888', borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Portfolio value split */}
          <div style={{ padding: '24px 28px', border: '1px solid #1A1A1A', background: '#0C0C0C', flex: 1 }}>
            <p style={{ fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#444', marginBottom: 20 }}>Portfolio Value Split</p>
            {totalTDC > 0 && <HBar value={totalTDC} max={totalGAV || totalTDC} color="#C4973A" label="Total Dev Cost" />}
            {totalGAV > 0 && <HBar value={totalGAV} max={totalGAV} color="#A855F7" label="Gross Asset Value" />}
            {totalRLV > 0 && <HBar value={totalRLV} max={totalGAV} color="#22C55E" label="Residual Land Value" />}
            {totalTDC > 0 && totalGAV > 0 && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #111' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, color: '#444', letterSpacing: '0.10em' }}>GAV / TDC Multiple</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#C4973A', fontWeight: 700 }}>{(totalGAV / totalTDC).toFixed(2)}×</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 9, color: '#444', letterSpacing: '0.10em' }}>RLV / TDC Margin</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#22C55E', fontWeight: 700 }}>{pctFmt(totalRLV / totalTDC)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 3: Per-project value comparison ── */}
        <div style={{ padding: '24px 28px', border: '1px solid #1A1A1A', background: '#0C0C0C', marginBottom: 28 }}>
          <p style={{ fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#444', marginBottom: 24 }}>Project Value Comparison</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {portfolio.map(p => {
              const color = dotColor(p.type, p.status)
              return (
                <div key={p.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, letterSpacing: '0.06em', color: '#C8C8C8', fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color, opacity: 0.8, marginLeft: 4 }}>{p.type ?? p.status}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 9, color: '#333', letterSpacing: '0.10em' }}>{p.bestStrategy !== '—' ? p.bestStrategy : 'No scenario'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <HBar value={p.tdc}     max={maxVal} color="#C4973A66" label="TDC" />
                    {p.bestGAV > 0 && <HBar value={p.bestGAV} max={maxVal} color={color}      label="GAV" />}
                    {p.bestRLV > 0 && <HBar value={p.bestRLV} max={maxVal} color="#22C55E"    label="RLV" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Row 4: Project summary table ── */}
        <div style={{ border: '1px solid #1A1A1A', background: '#0C0C0C', overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #111' }}>
            <p style={{ fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#444' }}>Project Feasibility Matrix</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #111' }}>
                {['Project', 'Type', 'Status', 'GBA sqm', 'TDC', 'GAV', 'RLV', 'Multiple', 'Strategy', 'Verdict'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 7, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#333', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {portfolio.map((p, i) => {
                const color   = dotColor(p.type, p.status)
                const multiple = p.tdc > 0 && p.bestGAV > 0 ? (p.bestGAV / p.tdc).toFixed(2) + '×' : '—'
                const verdict  = p.bestRLV > 10_000_000 ? 'POSITIVE' : p.bestRLV > 0 ? 'MARGINAL' : p.bestRLV === 0 ? 'NO DATA' : 'NEGATIVE'
                const vColor   = verdict === 'POSITIVE' ? '#22C55E' : verdict === 'MARGINAL' ? '#EAB308' : verdict === 'NO DATA' ? '#444' : '#EF4444'
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #0E0E0E', background: i % 2 === 0 ? 'transparent' : '#080808' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 2, height: 24, background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: '#C8C8C8', fontWeight: 500 }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color, fontWeight: 700 }}>{p.type ?? '—'}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 8, letterSpacing: '0.14em', textTransform: 'capitalize', color: STATUS_COLOR[p.status] ?? '#555' }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#666' }}>{p.gba > 0 ? p.gba.toLocaleString() : '—'}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#C4973A', fontWeight: 700 }}>{fmt(p.tdc)}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#A855F7', fontWeight: 700 }}>{p.bestGAV > 0 ? fmt(p.bestGAV) : '—'}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#22C55E', fontWeight: 700 }}>{p.bestRLV > 0 ? fmt(p.bestRLV) : '—'}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#888' }}>{multiple}</td>
                    <td style={{ padding: '12px 16px', fontSize: 10, color: '#666', letterSpacing: '0.06em' }}>{p.bestStrategy}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: vColor, fontWeight: 700, padding: '3px 8px', border: `1px solid ${vColor}33`, background: `${vColor}0D` }}>{verdict}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Row 5: Waterfall chart (GAV composition) ── */}
        <WaterfallChart portfolio={portfolio} />

        {/* Brand footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, paddingTop: 40, borderTop: '1px solid #0E0E0E', marginTop: 12 }}>
          <img src="/brand-logo-white.png" alt="7EVEN" draggable={false} style={{ width: 80, height: 'auto', objectFit: 'contain', opacity: 0.15 }} />
          <p style={{ fontSize: 8, letterSpacing: '0.22em', color: '#222', textTransform: 'uppercase' }}>Portfolio Intelligence Dashboard · {brandLabel}</p>
        </div>
        <DesignCredit style={{ marginTop: 14 }} />
      </div>
    </div>
  )
}

// ── Waterfall / Stacked bar chart ─────────────────────────────────────────────

function WaterfallChart({ portfolio }: { portfolio: ProjectSummary[] }) {
  const validProjects = portfolio.filter(p => p.tdc > 0)
  if (validProjects.length === 0) return null

  const maxVal = Math.max(...validProjects.map(p => Math.max(p.tdc, p.bestGAV)), 1)
  const barH = 32
  const labelW = 180
  const chartW = 520
  const rowH = barH + 12
  const svgH = validProjects.length * rowH + 60

  return (
    <div style={{ padding: '24px 28px', border: '1px solid #1A1A1A', background: '#0C0C0C', marginBottom: 28 }}>
      <p style={{ fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#444', marginBottom: 20 }}>TDC vs GAV — Visual Waterfall</p>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
        {[{ color: '#C4973A', label: 'TDC' }, { color: '#A855F7', label: 'GAV' }, { color: '#22C55E', label: 'RLV (GAV − TDC)' }].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 3, background: l.color, display: 'block' }} />
            <span style={{ fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#444' }}>{l.label}</span>
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${labelW + chartW + 100} ${svgH}`} style={{ width: '100%', height: 'auto' }}>
        {/* X-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <g key={t}>
            <line x1={labelW + t * chartW} y1={0} x2={labelW + t * chartW} y2={svgH - 40} stroke="#111" strokeWidth={1} />
            <text x={labelW + t * chartW} y={svgH - 24} textAnchor="middle" fill="#333" fontSize={8}>{fmt(maxVal * t, 0)}</text>
          </g>
        ))}

        {validProjects.map((p, i) => {
          const y = i * rowH + 8
          const color = dotColor(p.type, p.status)
          const tdcW  = (p.tdc / maxVal) * chartW
          const gavW  = (p.bestGAV / maxVal) * chartW
          const rlvW  = Math.max(0, gavW - tdcW)
          return (
            <g key={p.id}>
              {/* Project name */}
              <text x={labelW - 10} y={y + barH / 2 + 4} textAnchor="end" fill="#666" fontSize={10}>{p.name.length > 22 ? p.name.slice(0, 22) + '…' : p.name}</text>
              {/* Colour accent */}
              <rect x={labelW - 14} y={y + 8} width={2} height={barH - 16} fill={color} />
              {/* TDC bar */}
              <rect x={labelW} y={y} width={tdcW} height={barH} fill="#C4973A" opacity={0.25} rx={2} />
              {/* GAV bar (overlay) */}
              {p.bestGAV > 0 && <rect x={labelW} y={y + barH * 0.3} width={gavW} height={barH * 0.4} fill="#A855F7" opacity={0.5} rx={1} />}
              {/* RLV band */}
              {rlvW > 0 && <rect x={labelW + tdcW} y={y + barH * 0.3} width={rlvW} height={barH * 0.4} fill="#22C55E" opacity={0.7} rx={1} />}
              {/* Value labels */}
              <text x={labelW + Math.max(tdcW, gavW) + 8} y={y + barH / 2 + 4} fill="#C4973A" fontSize={9} fontFamily="monospace">{fmt(p.tdc)}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
