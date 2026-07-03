import React, { useMemo } from 'react'
import type { FinanceAssumptions, TimelineTask } from '../db/schema'
import type { FinanceResult } from '../engine/finance'

// Logistic S-curve normalised to [0,1] for t ∈ [0,1]
function scurve(t: number): number {
  const k = 10
  const s0 = 1 / (1 + Math.exp(k * 0.5))
  const s1 = 1 / (1 + Math.exp(-k * 0.5))
  const sv = 1 / (1 + Math.exp(-k * (t - 0.5)))
  return (sv - s0) / (s1 - s0)
}

export type HealthRisk = 'green' | 'amber' | 'orange' | 'red'

export interface TimelineHealth {
  color: string
  label: string
  delayMonths: number
  atRiskPct: number
  risk: HealthRisk
  atRiskCount: number
}

export function getTimelineHealth(tasks: TimelineTask[]): TimelineHealth {
  if (tasks.length === 0) return { color: '#22C55E', label: 'On Track', delayMonths: 0, atRiskPct: 0, risk: 'green', atRiskCount: 0 }
  const atRiskCount = tasks.filter(t => t.status === 'delayed' || t.status === 'critical').length
  const pct = atRiskCount / tasks.length
  if (pct > 0.30) return { color: '#EF4444', label: 'Critical Risk',  delayMonths: 12, atRiskPct: pct, risk: 'red',    atRiskCount }
  if (pct > 0.15) return { color: '#F97316', label: 'High Risk',       delayMonths: 6,  atRiskPct: pct, risk: 'orange', atRiskCount }
  if (pct > 0.05) return { color: '#EAB308', label: 'Monitor',         delayMonths: 3,  atRiskPct: pct, risk: 'amber',  atRiskCount }
  return { color: '#22C55E', label: 'On Track', delayMonths: 0, atRiskPct: pct, risk: 'green', atRiskCount }
}

interface Props {
  fa: FinanceAssumptions
  result: FinanceResult
  tdc: number
  tasks: TimelineTask[]
  dark?: boolean       // true = dark bg (Dashboard), false = light bg (Finance tab)
  compact?: boolean
}

const GOLD   = '#C4973A'
const AMBER  = '#EAB308'
const ORANGE = '#F97316'
const RED    = '#EF4444'

function fmtM(n: number) {
  return n >= 1e6 ? `$${(n / 1e6).toFixed(0)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${Math.round(n)}`
}

export default function FinanceSCurve({ fa, result, tdc, tasks, dark = false, compact = false }: Props) {
  const health = useMemo(() => getTimelineHealth(tasks), [tasks])

  const baseDuration = fa.landCarryMonths + fa.constructionMonths
  const xMax = baseDuration + 16

  // Determine today's position relative to project start
  const todayMonth = useMemo(() => {
    if (tasks.length === 0) return null
    const starts = tasks.map(t => new Date(t.startDate + 'T00:00:00').getTime()).filter(d => !isNaN(d))
    if (starts.length === 0) return null
    const projectStartMs = Math.min(...starts)
    const ms = Date.now() - projectStartMs
    const months = ms / (1000 * 60 * 60 * 24 * 30.44)
    return Math.max(0, Math.min(xMax - 1, months))
  }, [tasks, xMax])

  const W = compact ? 580 : 760
  const H = compact ? 190 : 290
  const pad = { top: compact ? 18 : 26, right: compact ? 18 : 44, bottom: compact ? 34 : 46, left: compact ? 54 : 72 }
  const cW = W - pad.left - pad.right
  const cH = H - pad.top - pad.bottom

  const yMax = tdc > 0 ? tdc * 1.12 : 1

  function px(month: number) { return pad.left + (month / xMax) * cW }
  function py(cost: number)  { return pad.top + cH - Math.max(0, Math.min(1, cost / yMax)) * cH }

  function buildPath(durationMonths: number, totalCost: number): string {
    const steps = Math.max(durationMonths, 1)
    return Array.from({ length: steps + 1 }, (_, i) => {
      const cx = px(i).toFixed(1)
      const cy = py(scurve(i / steps) * totalCost).toFixed(1)
      return `${i === 0 ? 'M' : 'L'} ${cx} ${cy}`
    }).join(' ')
  }

  const extraCost3m  = result.blowout3m.totalFinanceCost  - result.base.totalFinanceCost
  const extraCost6m  = result.blowout6m.totalFinanceCost  - result.base.totalFinanceCost
  const extraCost12m = result.blowout12m.totalFinanceCost - result.base.totalFinanceCost

  const basePath  = buildPath(baseDuration, tdc)
  const path3m    = buildPath(baseDuration + 3,  tdc + extraCost3m)
  const path6m    = buildPath(baseDuration + 6,  tdc + extraCost6m)
  const path12m   = buildPath(baseDuration + 12, tdc + extraCost12m)

  const projExtraCost = health.delayMonths === 3 ? extraCost3m : health.delayMonths === 6 ? extraCost6m : health.delayMonths === 12 ? extraCost12m : 0
  const projPath  = health.delayMonths > 0 ? buildPath(baseDuration + health.delayMonths, tdc + projExtraCost) : null

  const bgColor    = dark ? '#090909' : '#F9F7F4'
  const gridColor  = dark ? '#181818' : '#EDEBE8'
  const axisColor  = dark ? '#2A2A2A' : '#CFCCC8'
  const labelColor = dark ? '#555'    : '#AAA'
  const textColor  = dark ? '#888'    : '#666'

  const yTicks = [0, 0.25, 0.50, 0.75, 1.00].map(f => f * tdc)
  const xTicks = Array.from({ length: Math.ceil(xMax / 6) + 1 }, (_, i) => i * 6).filter(m => m <= xMax)

  // Current spend position (where we are on the planned curve today)
  const todayCost = todayMonth !== null ? scurve(Math.min(1, todayMonth / baseDuration)) * tdc : null

  return (
    <div>
      {/* ── Traffic light status banner ── */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '10px 14px', background: `${health.color}10`, borderLeft: `3px solid ${health.color}`, borderRight: 'none', borderTop: 'none', borderBottom: 'none' }}>
        {/* Pulsing dot */}
        <span style={{ position: 'relative', width: 10, height: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {health.risk !== 'green' && (
            <span style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: health.color, opacity: 0.2, animation: 'pulse 1.4s ease-in-out infinite' }} />
          )}
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: health.color, display: 'block', boxShadow: `0 0 6px ${health.color}88` }} />
        </span>
        <span style={{ fontWeight: 800, fontSize: 11, color: health.color, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>{health.label}</span>
        {health.atRiskCount > 0 && (
          <span style={{ fontSize: 9, color: textColor }}>
            {health.atRiskCount} task{health.atRiskCount !== 1 ? 's' : ''} at risk ({(health.atRiskPct * 100).toFixed(0)}%)
            &nbsp;·&nbsp;Est. +{health.delayMonths}m delay
            &nbsp;·&nbsp;Extra finance cost <strong style={{ color: health.color, fontFamily: 'monospace' }}>{fmtM(projExtraCost)}</strong>
          </span>
        )}
        {health.risk === 'green' && health.atRiskCount === 0 && (
          <span style={{ fontSize: 9, color: textColor }}>All tasks on track · No additional finance cost projected</span>
        )}
        {todayMonth !== null && (
          <span style={{ marginLeft: 'auto', fontSize: 9, color: labelColor, fontFamily: 'monospace' }}>
            Month {Math.round(todayMonth)}/{baseDuration}
          </span>
        )}
      </div>

      {/* ── SVG chart ── */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
        {/* Chart background */}
        <rect x={pad.left} y={pad.top} width={cW} height={cH} fill={bgColor} />

        {/* Grid — Y */}
        {yTicks.map((tick, i) => (
          <g key={`y${i}`}>
            <line x1={pad.left} y1={py(tick)} x2={pad.left + cW} y2={py(tick)} stroke={gridColor} strokeWidth={1} />
            <text x={pad.left - 5} y={py(tick) + 3} textAnchor="end" fill={labelColor} fontSize={compact ? 7 : 8} fontFamily="monospace">{fmtM(tick)}</text>
          </g>
        ))}

        {/* Grid — X */}
        {xTicks.map((tick, i) => (
          <g key={`x${i}`}>
            <line x1={px(tick)} y1={pad.top} x2={px(tick)} y2={pad.top + cH} stroke={gridColor} strokeWidth={1} />
            <text x={px(tick)} y={pad.top + cH + (compact ? 12 : 14)} textAnchor="middle" fill={labelColor} fontSize={compact ? 7 : 8} fontFamily="monospace">m{tick}</text>
          </g>
        ))}

        {/* Land / construction phase divider */}
        {fa.landCarryMonths > 0 && (
          <>
            <rect x={pad.left} y={pad.top} width={px(fa.landCarryMonths) - pad.left} height={cH} fill={dark ? '#0D0B07' : '#FDF9F0'} />
            <line x1={px(fa.landCarryMonths)} y1={pad.top} x2={px(fa.landCarryMonths)} y2={pad.top + cH} stroke={dark ? '#2A2A1A' : '#DDD9C8'} strokeWidth={1} strokeDasharray="4,3" />
            {!compact && <text x={pad.left + 4} y={pad.top + 12} fill={dark ? '#3A3520' : '#C8C4AE'} fontSize={7} fontFamily="monospace" letterSpacing={1}>LAND CARRY</text>}
            {!compact && <text x={px(fa.landCarryMonths) + 4} y={pad.top + 12} fill={dark ? '#2A2A1A' : '#CCC9B8'} fontSize={7} fontFamily="monospace" letterSpacing={1}>CONSTRUCTION</text>}
          </>
        )}

        {/* Completion line */}
        <line x1={px(baseDuration)} y1={pad.top} x2={px(baseDuration)} y2={pad.top + cH} stroke={dark ? '#2A2410' : '#E8E0C8'} strokeWidth={1} strokeDasharray="2,3" />

        {/* ── Risk zone fills (lightest first) ── */}
        {fa.blowout12mActive && (
          <path d={`${path12m} L ${px(baseDuration + 12).toFixed(1)} ${(pad.top + cH).toFixed(1)} L ${pad.left} ${(pad.top + cH).toFixed(1)} Z`} fill={`${RED}07`} />
        )}
        {fa.blowout6mActive && (
          <path d={`${path6m} L ${px(baseDuration + 6).toFixed(1)} ${(pad.top + cH).toFixed(1)} L ${pad.left} ${(pad.top + cH).toFixed(1)} Z`} fill={`${ORANGE}08`} />
        )}
        {fa.blowout3mActive && (
          <path d={`${path3m} L ${px(baseDuration + 3).toFixed(1)} ${(pad.top + cH).toFixed(1)} L ${pad.left} ${(pad.top + cH).toFixed(1)} Z`} fill={`${AMBER}09`} />
        )}

        {/* Baseline fill */}
        <path d={`${basePath} L ${px(baseDuration).toFixed(1)} ${(pad.top + cH).toFixed(1)} L ${pad.left} ${(pad.top + cH).toFixed(1)} Z`} fill={`${GOLD}14`} />

        {/* ── Blowout curves (dashed) ── */}
        {fa.blowout12mActive && <path d={path12m} fill="none" stroke={RED}    strokeWidth={1.5} strokeDasharray="5,3" opacity={0.65} />}
        {fa.blowout6mActive  && <path d={path6m}  fill="none" stroke={ORANGE} strokeWidth={1.5} strokeDasharray="5,3" opacity={0.70} />}
        {fa.blowout3mActive  && <path d={path3m}  fill="none" stroke={AMBER}  strokeWidth={1.5} strokeDasharray="5,3" opacity={0.75} />}

        {/* ── Projected trajectory (health-driven, fat dashed) ── */}
        {projPath && (
          <path d={projPath} fill="none" stroke={health.color} strokeWidth={2.5} strokeDasharray="7,4" opacity={0.9} />
        )}

        {/* ── Baseline curve (primary) ── */}
        <path d={basePath} fill="none" stroke={GOLD} strokeWidth={2.5} />

        {/* Baseline end dot + label */}
        <circle cx={px(baseDuration)} cy={py(tdc)} r={3.5} fill={GOLD} />
        {!compact && tdc > 0 && (
          <text x={px(baseDuration) - 4} y={py(tdc) - 8} textAnchor="end" fill={GOLD} fontSize={8} fontFamily="monospace" fontWeight={700}>{fmtM(tdc)}</text>
        )}

        {/* ── Today marker ── */}
        {todayMonth !== null && todayCost !== null && (
          <g>
            <line x1={px(todayMonth)} y1={pad.top} x2={px(todayMonth)} y2={pad.top + cH}
              stroke="#fff" strokeWidth={1} strokeDasharray="3,4" opacity={dark ? 0.25 : 0.4} />
            <circle cx={px(todayMonth)} cy={py(todayCost)} r={4} fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.7} />
            <circle cx={px(todayMonth)} cy={py(todayCost)} r={2} fill="#fff" opacity={0.8} />
            {!compact && (
              <text x={px(todayMonth) + 5} y={pad.top + (dark ? 22 : 24)} fill={dark ? '#555' : '#AAA'} fontSize={7} fontFamily="monospace" letterSpacing={0.5}>TODAY</text>
            )}
          </g>
        )}

        {/* ── Axes ── */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + cH} stroke={axisColor} strokeWidth={1} />
        <line x1={pad.left} y1={pad.top + cH} x2={pad.left + cW} y2={pad.top + cH} stroke={axisColor} strokeWidth={1} />

        {/* Axis labels (full only) */}
        {!compact && (
          <>
            <text x={pad.left + cW / 2} y={H - 4} textAnchor="middle" fill={labelColor} fontSize={7} fontFamily="monospace" letterSpacing={1.5}>PROJECT MONTHS</text>
            <text x={10} y={pad.top + cH / 2} textAnchor="middle" fill={labelColor} fontSize={7} fontFamily="monospace" letterSpacing={1.5}
              transform={`rotate(-90 10 ${pad.top + cH / 2})`}>CUMULATIVE COST</text>
          </>
        )}
      </svg>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', marginTop: 10 }}>
        {([
          { color: GOLD,         label: 'Baseline Plan',      dash: false },
          ...(fa.blowout3mActive  ? [{ color: AMBER,  label: '+3m Blowout',          dash: true }] : []),
          ...(fa.blowout6mActive  ? [{ color: ORANGE, label: '+6m Blowout',           dash: true }] : []),
          ...(fa.blowout12mActive ? [{ color: RED,    label: '+12m Blowout',          dash: true }] : []),
          ...(projPath             ? [{ color: health.color, label: `Projected (${health.label})`, dash: true }] : []),
        ] as { color: string; label: string; dash: boolean }[]).map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width={22} height={8}>
              <line x1={0} y1={4} x2={22} y2={4} stroke={l.color} strokeWidth={l.dash ? 1.5 : 2.5} strokeDasharray={l.dash ? '5,3' : undefined} />
              {!l.dash && <circle cx={11} cy={4} r={2} fill={l.color} />}
            </svg>
            <span style={{ fontSize: 8, color: textColor, letterSpacing: '0.06em' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
