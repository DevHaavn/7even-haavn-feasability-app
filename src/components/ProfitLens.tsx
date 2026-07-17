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
export default function ProfitLens({ projectId, title = 'Profit — every lens', dark = false }: { projectId: string; title?: string; dark?: boolean }) {
  const m = getProfitMetrics(projectId)
  if (!(m.gdv > 0)) return null

  const border = dark ? '#2A2A2A' : 'var(--border, #E4E1DC)'
  const cardBg = dark ? '#0E0E0E' : 'var(--card, #FFFFFF)'
  const sub = dark ? '#888' : 'var(--ink-3, #999)'
  const label = dark ? '#B8B8B8' : 'var(--ink-3, #888)'
  const good = 'var(--emerald, #22C55E)', warn = 'var(--amber, #C9A24B)', bad = 'var(--red, #EF4444)'
  const profitCol = m.profit > 0 ? good : bad
  const marginCol = (v: number) => (v >= 0.15 ? good : v > 0 ? warn : bad)

  const items: { k: string; v: string; sub: string; col: string; who: string }[] = [
    { k: 'Dev Profit', v: money(m.profit), sub: 'GDV − TDC', col: profitCol, who: 'Absolute' },
    { k: 'Margin on Cost', v: pct(m.marginOnCost), sub: 'profit ÷ TDC', col: marginCol(m.marginOnCost), who: 'Developer · builder' },
    { k: 'Margin on GDV', v: pct(m.marginOnGdv), sub: 'profit ÷ GDV', col: marginCol(m.marginOnGdv), who: 'Bank · financier' },
    { k: 'Project IRR', v: m.irr == null ? '—' : m.irr > 5 ? '>500%' : pct(m.irr), sub: 'equity, sell at completion', col: m.irr != null ? marginCol(m.irr / 2) : sub, who: 'Equity return' },
    { k: 'Equity Multiple', v: m.equityMultiple > 0 ? `${m.equityMultiple.toFixed(2)}×` : '—', sub: 'on equity in', col: m.equityMultiple >= 1.5 ? good : warn, who: 'Investor' },
  ]

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <p style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: label, margin: 0, fontWeight: 700 }}>{title}</p>
        <span style={{ fontSize: 9, color: sub }}>GDV {money(m.gdv)} · TDC {money(m.tdc)} (incl land)</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {items.map(it => (
          <div key={it.k} style={{ border: `1px solid ${border}`, background: cardBg, padding: '14px 16px' }}>
            <p style={{ fontSize: 7.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: label, margin: '0 0 6px' }}>{it.k}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: 20, color: it.col, margin: 0 }}>{it.v}</p>
            <p style={{ fontSize: 8, color: sub, margin: '4px 0 0', letterSpacing: '0.04em' }}>{it.sub}</p>
            <p style={{ fontSize: 7, color: it.col, margin: '2px 0 0', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85 }}>{it.who}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
