import React, { useState } from 'react'
import * as db from '../db'

const money = (n: number) => {
  const a = Math.abs(n)
  return a >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : a >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`
}
const pctFmt = (n: number) => `${(n * 100).toFixed(1)}%`

/**
 * Investor equity lens — "if an investor gives us $X equity, what do they make?"
 * Shows profit, IRR on their money, equity multiple and return on equity. On the
 * Finance tab the equity cheque is editable; elsewhere it reads the saved value.
 */
export default function InvestorReturn({ projectId, editable = false }: { projectId: string; editable?: boolean }) {
  // Investor Return section removed at user request
  return null

  const good = 'var(--emerald, #22C55E)', warn = 'var(--amber, #C9A24B)', bad = 'var(--red, #EF4444)'
  const irrCol = r.irr == null ? 'var(--ink-3, #888)' : r.irr >= 0.2 ? good : r.irr > 0 ? warn : bad
  const profitCol = r.profit > 0 ? good : bad

  const saveEquity = (v: number) => {
    setEquity(v)
    const fa = db.getFinanceAssumptions(projectId)
    db.saveFinanceAssumptions({ ...fa, investorEquity: v })
  }

  const items = [
    { k: 'Investor Equity', v: money(r.equity), sub: `project needs ~${money(r.projectEquity)}`, col: 'var(--gold, #6e7c8e)' },
    { k: 'Profit to Investor', v: money(r.profit), sub: 'development profit', col: profitCol },
    { k: 'Equity IRR', v: r.irr == null ? '—' : r.irr > 5 ? '>500%' : pctFmt(r.irr), sub: `on their money · ${r.months} mo hold`, col: irrCol },
    { k: 'Equity Multiple', v: r.multiple > 0 ? `${r.multiple.toFixed(2)}×` : '—', sub: 'capital returned', col: r.multiple >= 1.5 ? good : warn },
    { k: 'Return on Equity', v: r.roe > 0 ? pctFmt(r.roe) : '—', sub: 'profit ÷ equity', col: r.roe >= 0.5 ? good : warn },
  ]

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--ink-3, #888)', margin: 0, fontWeight: 700 }}>Investor Return — equity IRR</p>
        {editable ? (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--ink-3, #888)' }}>
            Equity cheque
            <span style={{ color: 'var(--ink-3, #AAA)' }}>$</span>
            <input type="number" value={equity || ''} step={1_000_000}
              onChange={e => saveEquity(Math.max(0, parseFloat(e.target.value) || 0))}
              style={{ width: 130, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--ink, #1A1A1A)', background: 'transparent', border: 'none', borderBottom: '1px solid var(--gold, #6e7c8e)', padding: '2px 0', outline: 'none' }} />
          </label>
        ) : (
          <span style={{ fontSize: 9, color: 'var(--ink-3, #999)' }}>on a {money(r.equity)} equity cheque</span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {items.map(it => (
          <div key={it.k} style={{ border: '1px solid var(--border, #E4E1DC)', background: 'var(--card, #FFFFFF)', padding: '14px 16px' }}>
            <p style={{ fontSize: 7.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3, #888)', margin: '0 0 6px' }}>{it.k}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: 20, color: it.col, margin: 0 }}>{it.v}</p>
            <p style={{ fontSize: 8, color: 'var(--ink-3, #999)', margin: '4px 0 0', letterSpacing: '0.04em' }}>{it.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
