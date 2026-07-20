import React, { useMemo, useState } from 'react'
import { useCapital } from './CapitalCommand'
import { runWaterfall, accrue, xirr, equityMultiple, cashOnCash, type WaterfallPosition } from '../../lib/capitalCalc'
import {
  newId, fmtM, fmtPct, fmtDate,
  investorFunded, investorDistributed,
  type CapDistAllocation, type DistCategory,
} from './capitalModel'

const CAT_LABEL: Record<DistCategory, string> = {
  return_of_capital: 'Return of capital', pref: 'Preferred return',
  interest: 'Interest', promote: 'Residual / promote', income: 'Income',
}
const CAT_COLOUR: Record<string, string> = {
  return_of_capital: 'var(--blue)', pref: 'var(--purple)', gp_catch_up: 'var(--amber)',
  promote: 'var(--gold)', interest: 'var(--slate)', income: 'var(--emerald)',
}

const today = () => new Date().toISOString().slice(0, 10)

/** Accrued-unpaid pref per position, less pref already distributed. */
function accruedPref(state: ReturnType<typeof useCapital>['state'], positionId: string): number {
  const p = state.positions.find(x => x.id === positionId)
  if (!p || !p.prefRate || p.fundedAmount <= 0) return 0
  const gross = accrue({
    principal: p.fundedAmount, ratePct: p.prefRate,
    fromDate: p.startDate ?? '2026-01-01', toDate: today(),
    compounding: p.prefCompounding ?? 'compound',
  })
  const paid = state.distAllocations
    .filter(d => d.positionId === p.id && d.category === 'pref')
    .reduce((a, d) => a + d.amount, 0)
  return Math.max(0, gross - paid)
}

/** Capital not yet returned = funded less return-of-capital already paid. */
function unreturnedCapital(state: ReturnType<typeof useCapital>['state'], positionId: string): number {
  const p = state.positions.find(x => x.id === positionId)
  if (!p) return 0
  const returned = state.distAllocations
    .filter(d => d.positionId === p.id && d.category === 'return_of_capital')
    .reduce((a, d) => a + d.amount, 0)
  return Math.max(0, p.fundedAmount - returned)
}

export default function CapitalReturns() {
  const { state, openDrawer } = useCapital()

  const totalFunded = state.positions.reduce((a, p) => a + p.fundedAmount, 0)
  const distributed = state.distAllocations.reduce((a, d) => a + d.amount, 0)
  const wf = state.waterfalls[0]

  // Weighted net IRR across investors who have real dated flows both ways.
  const weightedIrr = useMemo(() => {
    let num = 0, den = 0
    state.investors.forEach(i => {
      const funded = investorFunded(state, i.id)
      if (funded <= 0) return
      const flows: { date: string; amount: number }[] = []
      state.positions.filter(p => p.investorId === i.id && p.fundedAmount > 0)
        .forEach(p => flows.push({ date: p.startDate ?? '2026-01-01', amount: -p.fundedAmount }))
      state.distAllocations.filter(d => d.investorId === i.id).forEach(d => {
        const dist = state.distributions.find(x => x.id === d.distributionId)
        if (dist) flows.push({ date: d.paidDate ?? dist.distributionDate, amount: d.amount })
      })
      const r = flows.length >= 2 ? xirr(flows.sort((a, b) => a.date.localeCompare(b.date))) : null
      if (r != null) { num += r * funded; den += funded }
    })
    return den > 0 ? num / den : null
  }, [state])

  const moic = equityMultiple(totalFunded, distributed)

  // Waterfall preview at the CURRENT distributable position, so the chart shows
  // where the portfolio actually stands rather than an illustrative cascade.
  const positions: WaterfallPosition[] = state.positions
    .filter(p => p.fundedAmount > 0)
    .map(p => ({
      positionId: p.id, investorId: p.investorId, funded: p.fundedAmount,
      unreturnedCapital: unreturnedCapital(state, p.id),
      accruedPref: accruedPref(state, p.id),
    }))

  const preview = wf ? runWaterfall(
    positions.reduce((a, p) => a + p.unreturnedCapital + p.accruedPref, 0),
    positions,
    { prefRate: wf.prefRate, prefCompounding: wf.prefCompounding, catchUp: wf.catchUp, catchUpTarget: wf.catchUpTarget, tiers: wf.tiers },
  ) : null

  const maxTier = Math.max(1, ...(preview?.tierTotals.map(t => t.amount) ?? [1]))

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="kicker">Returns · Waterfall</div>
          <h1 className="h-sec">Distributions &amp; Returns</h1>
          <div className="h-sub">The distribution waterfall and what every partner has been paid — return of capital, preferred return, catch-up and residual splits.</div>
        </div>
        <button className="btn" onClick={() => openDrawer(<RunDistribution />)}>Run distribution</button>
      </div>

      <div className="kpis k4 mb">
        <div className="kpi g"><div className="lab">Weighted net IRR</div><div className="val">{weightedIrr == null ? '—' : fmtPct(weightedIrr, 1)}</div><div className="sub">realised · by funded capital</div></div>
        <div className="kpi"><div className="lab">Equity multiple</div><div className="val">{totalFunded > 0 ? `${moic.toFixed(2)}x` : '—'}</div><div className="sub">realised MOIC</div></div>
        <div className="kpi"><div className="lab">Preferred return</div><div className="val">{wf ? `${wf.prefRate}%` : '—'}</div><div className="sub">{wf?.prefCompounding ?? ''}</div></div>
        <div className="kpi accent"><div className="lab">Distributed to date</div><div className="val">{fmtM(distributed)}</div><div className="sub">all categories</div></div>
      </div>

      <div className="two mb">
        <div className="panel pad">
          <div className="divlabel">
            Distribution waterfall · {fmtM(positions.reduce((a, p) => a + p.unreturnedCapital + p.accruedPref, 0))} owed to LPs
          </div>
          {!preview || preview.tierTotals.length === 0
            ? <div className="note">Nothing outstanding — no capital or pref currently owed.</div>
            : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 200, padding: '10px 0' }}>
                  {preview.tierTotals.map((t, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 8, height: '100%' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--gold)' }}>{fmtM(t.amount)}</div>
                      <div style={{ width: '100%', borderRadius: '6px 6px 0 0', height: `${(t.amount / maxTier) * 100}%`, background: CAT_COLOUR[t.category] ?? 'var(--slate)' }} />
                      <div style={{ fontSize: 10, color: 'var(--ink-2)', textAlign: 'center' }}>{t.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8 }}>
                  {preview.tierTotals.map((t, i) => (
                    <div key={i} className="sumrow">
                      <span className="l">
                        <i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: CAT_COLOUR[t.category] ?? 'var(--slate)', marginRight: 8 }} />
                        {t.label}
                      </span>
                      <span className="v">{fmtM(t.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>

        <div className="panel pad">
          <div className="divlabel">Waterfall configuration</div>
          {wf
            ? <>
                <div className="sumrow"><span className="l">Structure</span><span className="v">{wf.name}</span></div>
                <div className="sumrow"><span className="l">Preferred return</span><span className="v">{wf.prefRate}% {wf.prefCompounding}</span></div>
                <div className="sumrow"><span className="l">GP catch-up</span><span className="v">{wf.catchUp ? `to ${wf.catchUpTarget}%` : 'none'}</span></div>
                {wf.tiers.map((t, i) => (
                  <div key={i} className="sumrow"><span className="l">Tier {i + 1} · to {t.hurdleIrr}% IRR</span><span className="v">{t.lpSplit}/{t.gpSplit}</span></div>
                ))}
              </>
            : <div className="note">No waterfall configured.</div>}

          <div className="divlabel">Cash-on-cash · realised</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 30, color: 'var(--emerald)' }}>
            {fmtPct(cashOnCash(distributed, totalFunded), 1)}
          </div>
          <div className="note mt">Distributions {fmtM(distributed)} on {fmtM(totalFunded)} funded.</div>
        </div>
      </div>

      <div className="panel pad mb">
        <div className="divlabel">Investor distributions &amp; returns</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="dtable">
            <thead>
              <tr>
                <th>Investor</th><th className="num">Funded</th><th className="num">Distributed</th>
                <th className="num">Accrued pref</th><th className="num">Equity ×</th>
              </tr>
            </thead>
            <tbody>
              {state.investors.map(i => {
                const funded = investorFunded(state, i.id)
                if (funded <= 0) return null
                const dist = investorDistributed(state, i.id)
                const pref = state.positions.filter(p => p.investorId === i.id)
                  .reduce((a, p) => a + accruedPref(state, p.id), 0)
                return (
                  <tr key={i.id}>
                    <td className="name">{i.companyName}</td>
                    <td className="num">{fmtM(funded)}</td>
                    <td className="num" style={{ color: 'var(--gold)' }}>{fmtM(dist)}</td>
                    <td className="num">{fmtM(pref)}</td>
                    <td className="num">{equityMultiple(funded, dist).toFixed(2)}x</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel pad">
        <div className="divlabel">Distribution history</div>
        {state.distributions.length === 0 && <div className="empty">No distributions run yet.</div>}
        {state.distributions.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="dtable">
              <thead>
                <tr><th>Date</th><th>Project</th><th>Source</th><th className="num">Amount</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {[...state.distributions].sort((a, b) => b.distributionDate.localeCompare(a.distributionDate)).map(d => {
                  const p = state.projects.find(x => x.id === d.projectId)
                  const cls = d.status === 'paid' ? 'pos' : d.status === 'approved' ? 'marg' : 'info'
                  return (
                    <tr key={d.id} className="click" onClick={() => openDrawer(<DistributionDetail distId={d.id} />)}>
                      <td className="num" style={{ color: 'var(--ink)' }}>{fmtDate(d.distributionDate)}</td>
                      <td className="name">{p?.name ?? 'Portfolio'}</td>
                      <td>{d.source}</td>
                      <td className="num">{fmtM(d.totalAmount)}</td>
                      <td><span className={`st ${cls}`}>{d.status}</span></td>
                      <td className="num" style={{ color: 'var(--faint)' }}>↗</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ── Run distribution (§10.4) ────────────────────────────────────────────────

function RunDistribution() {
  const { state, update, closeDrawer, openDrawer } = useCapital()
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState(0)
  const [source, setSource] = useState<'rental' | 'sale' | 'refinance' | 'other'>('rental')
  const [lines, setLines] = useState<CapDistAllocation[] | null>(null)
  const [gp, setGp] = useState(0)
  const [err, setErr] = useState('')

  const wf = state.waterfalls[0]

  const calculate = () => {
    if (!amount || amount <= 0) { setErr('Enter a distributable amount'); return }
    if (!wf) { setErr('No waterfall configured'); return }
    const scoped = state.positions.filter(p => p.fundedAmount > 0 && (!projectId || p.projectId === projectId))
    if (scoped.length === 0) { setErr('No funded positions to distribute to'); return }

    const positions: WaterfallPosition[] = scoped.map(p => ({
      positionId: p.id, investorId: p.investorId, funded: p.fundedAmount,
      unreturnedCapital: unreturnedCapital(state, p.id),
      accruedPref: accruedPref(state, p.id),
    }))
    const r = runWaterfall(amount, positions, {
      prefRate: wf.prefRate, prefCompounding: wf.prefCompounding,
      catchUp: wf.catchUp, catchUpTarget: wf.catchUpTarget, tiers: wf.tiers,
    })
    const distId = newId('dist')
    setLines(r.lines.map(l => ({
      id: newId('da'), distributionId: distId, investorId: l.investorId, positionId: l.positionId,
      category: l.category as DistCategory, amount: l.amount, status: 'pending',
    })))
    setGp(r.gpCatchUp)
    setErr('')
  }

  const approve = () => {
    if (!lines || lines.length === 0) return
    const distId = lines[0].distributionId
    update(s => ({
      ...s,
      distributions: [...s.distributions, {
        id: distId, projectId: projectId || undefined, distributionDate: date,
        totalAmount: amount, source, status: 'approved', waterfallId: wf?.id,
      }],
      distAllocations: [...s.distAllocations, ...lines],
    }))
    openDrawer(<DistributionDetail distId={distId} />)
  }

  const byInvestor = useMemo(() => {
    const m: Record<string, { total: number; cats: Record<string, number> }> = {}
    ;(lines ?? []).forEach(l => {
      m[l.investorId] ??= { total: 0, cats: {} }
      m[l.investorId].total += l.amount
      m[l.investorId].cats[l.category] = (m[l.investorId].cats[l.category] ?? 0) + l.amount
    })
    return m
  }, [lines])

  return (
    <>
      <div className="kicker">Run distribution</div>
      <h2>Distribute cash</h2>

      <div className="fgrid mt">
        <div>
          <label className="flab">Project / fund</label>
          <select className="fin" value={projectId} onChange={e => { setProjectId(e.target.value); setLines(null) }}>
            <option value="">Portfolio (all positions)</option>
            {state.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="flab">Distribution date <span className="freq">*</span></label>
          <input className="fin" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="flab">Total distributable <span className="freq">*</span></label>
          <input className="fin mono" type="number" value={amount || ''} onChange={e => { setAmount(parseFloat(e.target.value) || 0); setLines(null) }} />
        </div>
        <div>
          <label className="flab">Source</label>
          <select className="fin" value={source} onChange={e => setSource(e.target.value as any)}>
            <option value="rental">Rental</option><option value="sale">Sale</option>
            <option value="refinance">Refinance</option><option value="other">Other</option>
          </select>
        </div>
      </div>
      {err && <div className="ferr">{err}</div>}

      <div className="flex gap mt" style={{ gap: 8 }}>
        <button className="btn" onClick={calculate}>Calculate</button>
        <button className="btn ghost" onClick={closeDrawer}>Cancel</button>
      </div>

      {lines && (
        <>
          <div className="divlabel">Per-investor allocation</div>
          {Object.entries(byInvestor).map(([invId, v]) => {
            const inv = state.investors.find(i => i.id === invId)
            return (
              <div key={invId} className="sumrow" style={{ display: 'block' }}>
                <div className="flex between aic">
                  <span className="l" style={{ color: 'var(--ink)' }}>{inv?.companyName}</span>
                  <span className="v" style={{ color: 'var(--gold)' }}>{fmtM(v.total)}</span>
                </div>
                <div className="note" style={{ fontSize: 10.5, color: 'var(--faint)', marginTop: 3 }}>
                  {Object.entries(v.cats).map(([c, amt]) => `${CAT_LABEL[c as DistCategory] ?? c} ${fmtM(amt)}`).join(' · ')}
                </div>
              </div>
            )
          })}
          {gp > 0 && (
            <div className="sumrow gold">
              <span className="l">GP catch-up / promote</span>
              <span className="v">{fmtM(gp)}</span>
            </div>
          )}
          <div className="sumrow gold">
            <span className="l">Total allocated</span>
            <span className="v">{fmtM(lines.reduce((a, l) => a + l.amount, 0) + gp)} of {fmtM(amount)}</span>
          </div>
          <div className="flex gap mt" style={{ gap: 8 }}>
            <button className="btn" onClick={approve}>Approve</button>
            <button className="btn ghost" onClick={() => setLines(null)}>Recalculate</button>
          </div>
        </>
      )}
    </>
  )
}

function DistributionDetail({ distId }: { distId: string }) {
  const { state, update, closeDrawer } = useCapital()
  const d = state.distributions.find(x => x.id === distId)
  if (!d) return null
  const allocs = state.distAllocations.filter(a => a.distributionId === d.id)
  const project = state.projects.find(p => p.id === d.projectId)

  const markPaid = () => update(s => ({
    ...s,
    distributions: s.distributions.map(x => x.id === d.id ? { ...x, status: 'paid' } : x),
    distAllocations: s.distAllocations.map(a => a.distributionId === d.id
      ? { ...a, status: 'paid', paidDate: today() } : a),
  }))

  const byInv: Record<string, number> = {}
  allocs.forEach(a => { byInv[a.investorId] = (byInv[a.investorId] ?? 0) + a.amount })

  return (
    <>
      <div className="kicker">{d.source} · {fmtDate(d.distributionDate)}</div>
      <h2>{project?.name ?? 'Portfolio'}</h2>
      <div className="flex gap mt" style={{ gap: 8 }}>
        <span className={`st ${d.status === 'paid' ? 'pos' : 'marg'}`}>{d.status}</span>
        <span className="tag">{fmtM(d.totalAmount)}</span>
      </div>

      <div className="divlabel">Allocations</div>
      {Object.entries(byInv).map(([invId, amt]) => (
        <div key={invId} className="sumrow">
          <span className="l">{state.investors.find(i => i.id === invId)?.companyName}</span>
          <span className="v" style={{ color: 'var(--gold)' }}>{fmtM(amt)}</span>
        </div>
      ))}

      <div className="flex gap mt" style={{ gap: 8, flexWrap: 'wrap' }}>
        {d.status !== 'paid' && <button className="btn" onClick={markPaid}>Mark paid</button>}
        <button className="btn ghost" disabled title="Statement PDFs ship with the investor portal">Generate statements</button>
        <button className="btn ghost" onClick={closeDrawer}>Close</button>
      </div>
    </>
  )
}
