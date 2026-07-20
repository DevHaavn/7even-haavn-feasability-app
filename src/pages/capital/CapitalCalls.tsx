import React, { useMemo, useState } from 'react'
import { useCapital } from './CapitalCommand'
import { allocateProRata } from '../../lib/capitalCalc'
import {
  newId, fmtM, fmtDate, callFunded, callInvestorCount, isCallOverdue,
  type CapCall, type CapCallAllocation,
} from './capitalModel'

const STAGES = ['Soft Costs & Permits', 'Land Acquisition', 'Construction Equity', 'Working Capital']

function CallStatusPill({ call }: { call: CapCall }) {
  const { state } = useCapital()
  if (isCallOverdue(state, call)) return <span className="st neg">Overdue</span>
  const m: Record<string, [string, string]> = {
    draft: ['info', 'Draft'], issued: ['info', 'Issued'],
    part_funded: ['marg', 'Part funded'], funded: ['pos', 'Funded'], overdue: ['neg', 'Overdue'],
  }
  const [cls, label] = m[call.status] ?? ['info', call.status]
  return <span className={`st ${cls}`}>{label}</span>
}

export default function CapitalCalls() {
  const { state, openDrawer } = useCapital()

  const outstanding = state.calls
    .filter(c => c.status !== 'funded')
    .reduce((a, c) => a + Math.max(0, c.totalAmount - callFunded(state, c.id)), 0)
  const overdue = state.calls.filter(c => isCallOverdue(state, c))
  const overdueAmt = overdue.reduce((a, c) => a + Math.max(0, c.totalAmount - callFunded(state, c.id)), 0)
  const fundedYtd = state.callAllocations.reduce((a, x) => a + x.fundedAmount, 0)

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="kicker">Money movement · Drawdowns</div>
          <h1 className="h-sec">Capital Calls</h1>
          <div className="h-sub">Issue calls per project and stage, allocate across investors, and track funded versus outstanding.</div>
        </div>
        <button className="btn" onClick={() => openDrawer(<CallForm />)}>+ New call</button>
      </div>

      <div className="kpis k4 mb">
        <div className="kpi"><div className="lab">Scheduled calls</div><div className="val">{state.calls.filter(c => c.status !== 'funded').length}</div><div className="sub">{state.calls.length} total</div></div>
        <div className="kpi am"><div className="lab">Outstanding to collect</div><div className="val">{fmtM(outstanding)}</div><div className="sub">issued + draft</div></div>
        <div className="kpi r"><div className="lab">Overdue</div><div className="val">{fmtM(overdueAmt)}</div><div className="sub">{overdue.length} call{overdue.length === 1 ? '' : 's'}</div></div>
        <div className="kpi g"><div className="lab">Funded via calls</div><div className="val">{fmtM(fundedYtd)}</div><div className="sub">across all calls</div></div>
      </div>

      {overdue.map(c => {
        const p = state.projects.find(x => x.id === c.projectId)
        const short = c.totalAmount - callFunded(state, c.id)
        return (
          <div key={c.id} className="warn mb">
            ⚠ <b>{p?.name} · {c.stage}</b> — {fmtM(short)} outstanding, due {fmtDate(c.dueDate)}.
            {' '}{callInvestorCount(state, c.id)} investor{callInvestorCount(state, c.id) === 1 ? '' : 's'} allocated.
          </div>
        )
      })}

      <div className="panel pad">
        <div className="divlabel">Capital call &amp; drawdown schedule</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="dtable">
            <thead>
              <tr>
                <th>Due date</th><th>Project · Stage</th><th className="num">Amount</th>
                <th className="num">Funded</th><th className="num">Investors</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...state.calls].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(c => {
                const p = state.projects.find(x => x.id === c.projectId)
                const f = callFunded(state, c.id)
                const pct = c.totalAmount > 0 ? Math.round((f / c.totalAmount) * 100) : 0
                return (
                  <tr key={c.id} className="click" onClick={() => openDrawer(<CallDetail callId={c.id} />)}>
                    <td className="num" style={{ color: 'var(--ink)' }}>{fmtDate(c.dueDate)}</td>
                    <td>
                      <div className="name">{p?.name ?? '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--faint)' }}>{c.stage}</div>
                    </td>
                    <td className="num">{fmtM(c.totalAmount)}</td>
                    <td className="num">
                      <span className="mini-track">
                        <i style={{ width: `${Math.min(100, pct)}%`, background: isCallOverdue(state, c) ? 'var(--red)' : 'var(--gold)' }} />
                      </span>{' '}{pct}%
                    </td>
                    <td className="num">{callInvestorCount(state, c.id)}</td>
                    <td><CallStatusPill call={c} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {state.calls.length === 0 && <div className="empty">No capital calls yet.</div>}
        </div>
      </div>
    </>
  )
}

// ── New call (§10.3) ────────────────────────────────────────────────────────

function CallForm() {
  const { state, update, closeDrawer, openDrawer } = useCapital()
  const [projectId, setProjectId] = useState(state.projects[0]?.id ?? '')
  const [stage, setStage] = useState(STAGES[2])
  const [amount, setAmount] = useState(0)
  const [callDate, setCallDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10))
  const [purpose, setPurpose] = useState('')
  const [method, setMethod] = useState<'pro_rata' | 'manual'>('pro_rata')
  const [manual, setManual] = useState<Record<string, number>>({})
  const [err, setErr] = useState<Record<string, string>>({})

  // Uncalled commitment is the pro-rata basis — you can only call what's left.
  const eligible = useMemo(() => state.positions
    .filter(p => p.projectId === projectId)
    .map(p => ({ p, uncalled: Math.max(0, p.committedAmount - p.fundedAmount) }))
    .filter(x => x.uncalled > 0), [state.positions, projectId])

  const proRata = useMemo(
    () => allocateProRata(amount, eligible.map(e => ({ id: e.p.id, weight: e.uncalled }))),
    [amount, eligible])

  const alloc = method === 'pro_rata' ? proRata : manual
  const allocSum = Object.values(alloc).reduce((a, b) => a + (b || 0), 0)
  const reconciles = Math.abs(allocSum - amount) < 0.01

  const save = (issue: boolean) => {
    const e: Record<string, string> = {}
    if (!projectId) e.projectId = 'Pick a project'
    if (!amount || amount <= 0) e.amount = 'Call amount is required'
    if (eligible.length === 0) e.amount = 'No investor on this project has uncalled commitment'
    if (issue && !reconciles) e.alloc = `Allocations total ${fmtM(allocSum)} — must equal ${fmtM(amount)}`
    if (Object.keys(e).length) { setErr(e); return }

    const callId = newId('call')
    const allocations: CapCallAllocation[] = eligible.map(x => ({
      id: newId('alloc'), callId, positionId: x.p.id, investorId: x.p.investorId,
      amount: alloc[x.p.id] ?? 0, fundedAmount: 0, status: 'outstanding',
    })).filter(a => a.amount > 0)

    update(s => ({
      ...s,
      calls: [...s.calls, {
        id: callId, projectId, stage, callDate, dueDate,
        totalAmount: amount, purpose, allocationMethod: method,
        status: issue ? 'issued' : 'draft',
      }],
      callAllocations: [...s.callAllocations, ...allocations],
    }))
    if (issue) openDrawer(<CallDetail callId={callId} />)
    else closeDrawer()
  }

  return (
    <>
      <div className="kicker">New capital call</div>
      <h2>Issue a call</h2>

      <div className="fgrid mt">
        <div>
          <label className="flab">Project <span className="freq">*</span></label>
          <select className="fin" value={projectId} onChange={e => setProjectId(e.target.value)}>
            {state.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {err.projectId && <div className="ferr">{err.projectId}</div>}
        </div>
        <div>
          <label className="flab">Stage <span className="freq">*</span></label>
          <select className="fin" value={stage} onChange={e => setStage(e.target.value)}>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="flab">Call amount <span className="freq">*</span></label>
          <input className="fin mono" type="number" value={amount || ''} onChange={e => { setAmount(parseFloat(e.target.value) || 0); setErr({}) }} />
          {err.amount && <div className="ferr">{err.amount}</div>}
        </div>
        <div>
          <label className="flab">Allocation method</label>
          <select className="fin" value={method} onChange={e => setMethod(e.target.value as any)}>
            <option value="pro_rata">Pro-rata by uncalled commitment</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div>
          <label className="flab">Call date <span className="freq">*</span></label>
          <input className="fin" type="date" value={callDate} onChange={e => setCallDate(e.target.value)} />
        </div>
        <div>
          <label className="flab">Due date <span className="freq">*</span></label>
          <input className="fin" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div className="full">
          <label className="flab">Purpose</label>
          <input className="fin" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Level 7–9 structure" />
        </div>
      </div>

      <div className="divlabel">Allocation preview</div>
      {eligible.length === 0 && <div className="note">No investor on this project has uncalled commitment.</div>}
      {eligible.map(x => {
        const inv = state.investors.find(i => i.id === x.p.investorId)
        return (
          <div key={x.p.id} className="frow">
            <span className="fl">
              {inv?.companyName}
              <small>{fmtM(x.uncalled)} uncalled</small>
            </span>
            {method === 'pro_rata'
              ? <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--gold)' }}>{fmtM(alloc[x.p.id] ?? 0)}</span>
              : <input className="fin mono" style={{ width: 130 }} type="number" value={manual[x.p.id] ?? ''}
                  onChange={e => setManual(m => ({ ...m, [x.p.id]: parseFloat(e.target.value) || 0 }))} />}
          </div>
        )
      })}
      {eligible.length > 0 && (
        <div className="sumrow gold" style={{ marginTop: 4 }}>
          <span className="l">Allocated</span>
          <span className="v" style={{ color: reconciles ? 'var(--emerald)' : 'var(--red)' }}>
            {fmtM(allocSum)} of {fmtM(amount)}
          </span>
        </div>
      )}
      {err.alloc && <div className="ferr">{err.alloc}</div>}

      <div className="flex gap mt" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn ghost" onClick={() => save(false)}>Save draft</button>
        <button className="btn" onClick={() => save(true)} disabled={!reconciles || eligible.length === 0}>Issue &amp; allocate</button>
        <button className="btn ghost" onClick={closeDrawer}>Cancel</button>
      </div>
    </>
  )
}

// ── Call detail ─────────────────────────────────────────────────────────────

function CallDetail({ callId }: { callId: string }) {
  const { state, update, closeDrawer } = useCapital()
  const c = state.calls.find(x => x.id === callId)
  if (!c) return null
  const project = state.projects.find(p => p.id === c.projectId)
  const allocs = state.callAllocations.filter(a => a.callId === c.id)
  const funded = callFunded(state, c.id)
  const [notice, setNotice] = useState<string | null>(null)

  /**
   * Mark an allocation funded. This is the single place funded money enters the
   * system, so it writes BOTH the allocation and the investor's position — the
   * position's fundedAmount is what every rollup (project deployed, portfolio
   * KPIs, IRR) reads, so leaving it stale would silently under-report capital.
   */
  const markFunded = (allocId: string, amount: number) => {
    update(s => {
      const a = s.callAllocations.find(x => x.id === allocId)
      if (!a) return s
      const delta = amount - a.fundedAmount
      const callAllocations = s.callAllocations.map(x => x.id === allocId
        ? { ...x, fundedAmount: amount, fundedDate: new Date().toISOString().slice(0, 10), status: (amount >= x.amount ? 'funded' : amount > 0 ? 'part' : 'outstanding') as CapCallAllocation['status'] }
        : x)
      const positions = s.positions.map(p => {
        if (p.id !== a.positionId || p.fundedOverride) return p
        const next = Math.min(p.committedAmount, Math.max(0, p.fundedAmount + delta))
        return { ...p, fundedAmount: next, status: (next >= p.committedAmount ? 'funded' : next > 0 ? 'partially_funded' : 'committed') as typeof p.status }
      })
      const total = callAllocations.filter(x => x.callId === c.id).reduce((t, x) => t + x.fundedAmount, 0)
      const calls = s.calls.map(x => x.id === c.id
        ? { ...x, status: (total + 0.01 >= x.totalAmount ? 'funded' : total > 0 ? 'part_funded' : x.status) as typeof x.status }
        : x)
      return { ...s, callAllocations, positions, calls }
    })
  }

  const issue = () => update(s => ({ ...s, calls: s.calls.map(x => x.id === c.id ? { ...x, status: 'issued' } : x) }))

  return (
    <>
      <div className="kicker">{c.stage}</div>
      <h2>{project?.name}</h2>
      <div className="flex gap mt" style={{ gap: 8 }}>
        <CallStatusPill call={c} />
        <span className="tag">Due {fmtDate(c.dueDate)}</span>
      </div>

      <div className="statgrid">
        <div className="s"><div className="l">Called</div><div className="v" style={{ color: 'var(--gold)' }}>{fmtM(c.totalAmount)}</div></div>
        <div className="s"><div className="l">Funded</div><div className="v">{fmtM(funded)}</div></div>
        <div className="s"><div className="l">Outstanding</div><div className="v" style={{ color: funded >= c.totalAmount ? 'var(--emerald)' : 'var(--red)' }}>{fmtM(Math.max(0, c.totalAmount - funded))}</div></div>
      </div>

      {c.purpose && <div className="note">{c.purpose}</div>}

      <div className="divlabel">Allocations</div>
      {allocs.length === 0 && <div className="note">No allocations on this call.</div>}
      {allocs.map(a => {
        const inv = state.investors.find(i => i.id === a.investorId)
        const done = a.fundedAmount >= a.amount
        return (
          <div key={a.id} className="frow">
            <span className="fl">
              {inv?.companyName}
              <small>{fmtM(a.fundedAmount)} of {fmtM(a.amount)}{a.fundedDate ? ` · ${fmtDate(a.fundedDate)}` : ''}</small>
            </span>
            <div className="flex gap aic" style={{ gap: 6 }}>
              {done
                ? <span className="st pos">Funded</span>
                : <button className="btn" style={{ padding: '6px 10px' }} onClick={() => markFunded(a.id, a.amount)}>Mark funded</button>}
              {done && <button className="btn ghost" style={{ padding: '6px 10px' }} onClick={() => markFunded(a.id, 0)}>Undo</button>}
            </div>
          </div>
        )
      })}

      <div className="flex gap mt" style={{ gap: 8, flexWrap: 'wrap' }}>
        {c.status === 'draft' && <button className="btn" onClick={issue}>Issue call</button>}
        <button className="btn ghost" onClick={() => {
          // Notices: generated and logged here. Actual email send needs a mail
          // provider (spec §12 names Resend) which is not wired in this build.
          setNotice(`Notice prepared for ${allocs.length} investor${allocs.length === 1 ? '' : 's'} — email sending is not connected yet.`)
        }}>Prepare notices</button>
        <button className="btn ghost" onClick={closeDrawer}>Close</button>
      </div>
      {notice && <div className="okbox mt" style={{ color: 'var(--amber)', background: 'rgba(198,125,51,0.1)', borderColor: 'rgba(198,125,51,0.25)' }}>{notice}</div>}
    </>
  )
}
