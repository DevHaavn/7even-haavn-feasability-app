import React from 'react'
import { getProfitMetrics } from '../db'

const money = (n: number) => {
  const a = Math.abs(n)
  const s = a >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : a >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`
  return s
}
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

/**
 * Multi-lens profit view — the same deal judged the way each stakeholder sees it:
 *  • Dev Profit  (GDV − TDC)
 *  • Margin on Cost   (profit / TDC)   — developer & builder
 *  • Margin on GDV    (profit / GDV)   — bank & financier
 *  • IRR              (equity return over time)
 *  • Equity Multiple  (× on equity)
 */
export default function ProfitLens({ projectId, title = 'Profit — every lens · developer · bank · investor' }: { projectId: string; title?: string }) {
  const m = getProfitMetrics(projectId)
  if (!(m.gdv > 0)) return null

  // The design draws all five tiles green. Green/red/amber stay functional here —
  // a negative margin must not read as a healthy one just because the mockup's
  // sample project happened to be profitable.
  const tone = (v: number) => (v >= 0.15 ? 'g' : v > 0 ? 'am' : 'r')

  const items: { lab: string; v: string; sub: string; t: string }[] = [
    { lab: 'Dev profit · absolute', v: money(m.profit), sub: 'GDV − TDC', t: m.profit > 0 ? 'g' : 'r' },
    { lab: 'Margin on cost', v: pct(m.marginOnCost), sub: 'developer · builder', t: tone(m.marginOnCost) },
    { lab: 'Margin on GDV', v: pct(m.marginOnGdv), sub: 'bank · financier', t: tone(m.marginOnGdv) },
    { lab: 'Project IRR', v: m.irr == null ? '—' : m.irr > 5 ? '>500%' : pct(m.irr), sub: 'equity return', t: m.irr == null ? '' : tone(m.irr / 2) },
    { lab: 'Equity multiple', v: m.equityMultiple > 0 ? `${m.equityMultiple.toFixed(2)}×` : '—', sub: 'investor', t: m.equityMultiple >= 1.5 ? 'g' : 'am' },
  ]

  return (
    <>
      <div className="eyebrow mt2 mb">{title} · GDV {money(m.gdv)} · TDC {money(m.tdc)}</div>
      <div className="kpis k5 mb">
        {items.map(it => (
          <div key={it.lab} className={`kpi ${it.t}`.trim()}>
            <div className="lab">{it.lab}</div>
            <div className="val">{it.v}</div>
            <div className="sub">{it.sub}</div>
          </div>
        ))}
      </div>
    </>
  )
}
