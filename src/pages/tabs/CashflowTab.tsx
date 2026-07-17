import React, { useMemo, useState } from 'react'
import { useAutosave } from '../../lib/useAutosave'
import { SectionHeading } from '../../components/ui'
import { getCashflow, saveCashflow, getDetailedCostStack, getEffectiveLandCost, getLandTerms, getCostStack, generateId } from '../../db'
import { buildCashflow } from '../../engine/cashflow'
import { COST_PHASES, type CashflowState, type CostPhase, type SCurveProfile, type FundingSource } from '../../db/schema'

interface Props { projectId: string }

const fmtK = (n: number) => (n === 0 ? '—' : (n < 0 ? '-$' : '$') + Math.round(Math.abs(n) / 1000).toLocaleString() + 'k')
const fmtM = (n: number) => (n < 0 ? '-$' : '$') + (Math.abs(n) / 1e6).toFixed(1) + 'M'

const SCURVES: SCurveProfile[] = ['scurve', 'linear', 'upfront', 'backloaded']
const FUNDING: FundingSource[] = ['equity', 'debt', 'blend']

const inp: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--ink)', outline: 'none' }
const th: React.CSSProperties = { padding: '8px 6px', fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600, textAlign: 'right', minWidth: 58 }
const sticky: React.CSSProperties = { position: 'sticky', left: 0, background: 'var(--card)', zIndex: 2, textAlign: 'left', minWidth: 180 }

export default function CashflowTab({ projectId }: Props) {
  const [state, setState] = useState<CashflowState>(() => getCashflow(projectId))

  // Cost per phase, from the detailed cost stack + land (mapped to delivery phases)
  const phaseCosts = useMemo(() => {
    const d = getDetailedCostStack(projectId)
    const sum = (a: { amount: number }[]) => a.reduce((s, x) => s + (x.amount || 0), 0)
    const detailedTotal = sum(d.hardCosts) + sum(d.consultants) + sum(d.statutory) + sum(d.headworks) + sum(d.management) + sum(d.marketing)
    // If no detailed lines yet, fall back to the summary cost stack build cost as construction.
    let hard = sum(d.hardCosts) + sum(d.headworks)   // headworks/enviro spent through construction
    if (detailedTotal === 0) { const cs = getCostStack(projectId); hard = 0 /* summary handled below */; void cs }
    return {
      // Effective land cost (price + duty + acquisition costs + terms) — matches TDC.
      'pre-acquisition': getEffectiveLandCost(projectId),
      'acquisition-planning': sum(d.statutory),
      'pre-construction': sum(d.consultants) + sum(d.management),   // consultant & management fees run pre/through delivery
      'construction': hard,
      'close-out': sum(d.marketing),
    } as Record<CostPhase, number>
  }, [projectId])

  // Settlement date (Land & Terms) drives WHEN land hits the cashflow — land is
  // paid as a lump at settlement, so the pre-acquisition phase is timed to it.
  const settleMonth = useMemo(() => {
    const land = getLandTerms(projectId)
    if (!land.settlementDate) return null
    const [py, pm] = state.startDate.split('-').map(Number)
    const [sy, sm] = land.settlementDate.split('-').map(Number)
    if (!py || !pm || !sy || !sm) return null
    return Math.max(0, (sy - py) * 12 + (sm - pm))
  }, [projectId, state.startDate])

  const effectiveState = useMemo(() => {
    if (settleMonth == null) return state
    return { ...state, phases: { ...state.phases, 'pre-acquisition': { ...state.phases['pre-acquisition'], startMonth: settleMonth, durationMonths: 1, sCurve: 'upfront' as const } } }
  }, [state, settleMonth])

  const cf = useMemo(() => buildCashflow(effectiveState, phaseCosts), [effectiveState, phaseCosts])

  const { commit, undo, canUndo } = useAutosave<CashflowState>(saveCashflow, [projectId])
  function update(next: Partial<CashflowState>) { const s = { ...state, ...next }; commit(state, s); setState(s) }
  function setPhase(id: CostPhase, patch: Partial<CashflowState['phases'][CostPhase]>) {
    update({ phases: { ...state.phases, [id]: { ...state.phases[id], ...patch } } })
  }

  // manual entry form
  const [mLabel, setMLabel] = useState(''); const [mPhase, setMPhase] = useState<CostPhase>('construction')
  const [mMonth, setMMonth] = useState('1'); const [mAmount, setMAmount] = useState(''); const [mFund, setMFund] = useState<FundingSource>('blend')
  function addManual() {
    const amount = parseFloat(mAmount); const month = parseInt(mMonth, 10) - 1
    if (!mLabel.trim() || !amount) return
    update({ manual: [...state.manual, { id: generateId(), label: mLabel.trim(), phase: mPhase, month: Math.max(0, month), amount, fundedBy: mFund }] })
    setMLabel(''); setMAmount('')
  }
  const delManual = (id: string) => update({ manual: state.manual.filter(m => m.id !== id) })

  const cell = (v: number, color = 'var(--ink-2)'): React.CSSProperties => ({ padding: '6px', fontSize: 10.5, fontFamily: 'var(--font-mono)', textAlign: 'right', color: v < 0 ? 'var(--red)' : color, whiteSpace: 'nowrap' })

  return (
    <div className="fx-wrap overflow-auto" style={{ minHeight: 0 }}>
      <div className="pagehead">
        <div>
          <div className="kicker">06 · Cash Flow</div>
          <h1 className="h-sec">Development Cashflow</h1>
          <div className="h-sub">Month-by-month spend by phase, funded equity-first then debt. Phase timing drives the S-curve; add manual costs to any month.</div>
        </div>
        <div className="flex gap aic wrapf">
          <span className="check">✓ Auto-saved</span>
          {canUndo && <span className="chip" onClick={() => undo(setState)}>↶ Undo</span>}
        </div>
      </div>

      {/* KPI row — three cards, Peak equity accented, per the design. They were
          squeezed into the page head as bare right-aligned label/value pairs. */}
      <div className="kpis k3" style={{ marginBottom: 16 }}>
        <div className="kpi"><div className="lab">Total cost</div><div className="val">{fmtM(cf.total)}</div></div>
        <div className="kpi gold"><div className="lab">Peak equity</div><div className="val" style={{ color: 'var(--gold)' }}>{fmtM(cf.peakEquity)}</div></div>
        <div className="kpi"><div className="lab">Peak debt</div><div className="val">{fmtM(cf.peakDebt)}</div></div>
      </div>

      {/* Config */}
      <div className="panel" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16, padding: '14px 18px' }}>
        <label style={{ fontSize: 10, color: 'var(--ink-2)' }}>Programme start<br /><input type="month" value={state.startDate} onChange={e => update({ startDate: e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>
        <label style={{ fontSize: 10, color: 'var(--ink-2)' }}>Programme (months)<br /><input type="number" value={state.months} onChange={e => update({ months: Math.max(1, Math.min(120, parseInt(e.target.value, 10) || 36)) })} style={{ ...inp, marginTop: 4, width: 80 }} /></label>
        <label style={{ fontSize: 10, color: 'var(--ink-2)' }}>Equity-first ($)<br /><input type="number" value={state.equityFirst} onChange={e => update({ equityFirst: Math.max(0, parseFloat(e.target.value) || 0) })} style={{ ...inp, marginTop: 4, width: 130 }} /><span style={{ fontSize: 9, color: 'var(--ink-3)', marginLeft: 6 }}>equity in before debt draws</span></label>
      </div>

      {/* Phase timing editor */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'var(--card-2)' }}>
            {['Phase', 'Cost', 'Start month', 'Duration', 'S-curve', 'Funded by'].map(h => (
              <th key={h} style={{ ...th, textAlign: h === 'Phase' ? 'left' : 'left', padding: '9px 12px' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {COST_PHASES.map(p => {
              const t = state.phases[p.id]
              // Land timing follows the Land & Terms settlement date (paid as a lump then).
              const landDriven = p.id === 'pre-acquisition' && settleMonth != null
              return (
                <tr key={p.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>{p.label}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gold)' }}>{fmtM(phaseCosts[p.id] || 0)}</td>
                  {landDriven ? (
                    <td style={{ padding: '6px 12px' }} title="Timed to the Land & Terms settlement date">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)' }}>M{(settleMonth ?? 0) + 1}</span>
                      <span style={{ fontSize: 9, color: 'var(--gold)', marginLeft: 6 }}>⇠ settlement</span>
                    </td>
                  ) : (
                    <td style={{ padding: '6px 12px' }}><input type="number" value={t.startMonth + 1} onChange={e => setPhase(p.id, { startMonth: Math.max(0, (parseInt(e.target.value, 10) || 1) - 1) })} style={{ ...inp, width: 64 }} /></td>
                  )}
                  <td style={{ padding: '6px 12px' }}>{landDriven ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>1</span> : <input type="number" value={t.durationMonths} onChange={e => setPhase(p.id, { durationMonths: Math.max(1, parseInt(e.target.value, 10) || 1) })} style={{ ...inp, width: 64 }} />}</td>
                  <td style={{ padding: '6px 12px' }}>{landDriven ? <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>upfront</span> : <select value={t.sCurve} onChange={e => setPhase(p.id, { sCurve: e.target.value as SCurveProfile })} style={inp}>{SCURVES.map(s => <option key={s} value={s}>{s}</option>)}</select>}</td>
                  <td style={{ padding: '6px 12px' }}><select value={t.fundedBy} onChange={e => setPhase(p.id, { fundedBy: e.target.value as FundingSource })} style={inp}>{FUNDING.map(f => <option key={f} value={f}>{f}</option>)}</select></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Month-by-month grid */}
      <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700, marginBottom: 8 }}>Monthly Cashflow ($000s)</p>
      <div className="panel scrollx">
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ background: 'var(--card-2)' }}>
              <th style={{ ...th, ...sticky, padding: '8px 12px' }}>Phase</th>
              {cf.monthLabels.map(m => (
                <th key={m.n} style={th}><div>M{m.n}</div><div style={{ color: 'var(--faint)', fontSize: 7.5, fontWeight: 400 }}>{m.date}</div></th>
              ))}
              <th style={{ ...th, color: 'var(--gold)' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {cf.phaseRows.map(r => r.total > 0 && (
              <tr key={r.phase} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={{ ...sticky, padding: '6px 12px', fontSize: 11, color: 'var(--ink)' }}>{r.label}</td>
                {r.monthly.map((v, i) => <td key={i} style={cell(v)}>{v ? Math.round(v / 1000).toLocaleString() : ''}</td>)}
                <td style={cell(r.total, 'var(--gold)')}>{Math.round(r.total / 1000).toLocaleString()}</td>
              </tr>
            ))}
            {/* Total spend */}
            <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--card-3)' }}>
              <td style={{ ...sticky, background: 'var(--card-3)', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>Total spend</td>
              {cf.totalByMonth.map((v, i) => <td key={i} style={{ ...cell(v, 'var(--ink)'), fontWeight: 700 }}>{v ? Math.round(v / 1000).toLocaleString() : ''}</td>)}
              <td style={{ ...cell(cf.total, 'var(--ink)'), fontWeight: 700 }}>{Math.round(cf.total / 1000).toLocaleString()}</td>
            </tr>
            {/* Funding */}
            <tr style={{ background: 'var(--em-soft)' }}><td style={{ ...sticky, background: 'var(--em-soft)', padding: '6px 12px', fontSize: 10.5, color: 'var(--emerald)' }}>Equity draw</td>{cf.equityByMonth.map((v, i) => <td key={i} style={cell(v, 'var(--emerald)')}>{v ? Math.round(v / 1000).toLocaleString() : ''}</td>)}<td style={cell(cf.equityByMonth.reduce((a, b) => a + b, 0), 'var(--emerald)')}>{Math.round(cf.equityByMonth.reduce((a, b) => a + b, 0) / 1000).toLocaleString()}</td></tr>
            <tr style={{ background: 'rgba(88,120,168,0.10)' }}><td style={{ ...sticky, background: 'rgba(88,120,168,0.10)', padding: '6px 12px', fontSize: 10.5, color: 'var(--blue)' }}>Debt draw</td>{cf.debtByMonth.map((v, i) => <td key={i} style={cell(v, 'var(--blue)')}>{v ? Math.round(v / 1000).toLocaleString() : ''}</td>)}<td style={cell(cf.debtByMonth.reduce((a, b) => a + b, 0), 'var(--blue)')}>{Math.round(cf.debtByMonth.reduce((a, b) => a + b, 0) / 1000).toLocaleString()}</td></tr>
            <tr><td style={{ ...sticky, padding: '6px 12px', fontSize: 10, color: 'var(--ink-3)' }}>Cumulative equity</td>{cf.cumEquity.map((v, i) => <td key={i} style={cell(v, 'var(--emerald)')}>{v ? Math.round(v / 1000).toLocaleString() : ''}</td>)}<td style={cell(cf.peakEquity, 'var(--emerald)')}>{Math.round(cf.peakEquity / 1000).toLocaleString()}</td></tr>
            <tr><td style={{ ...sticky, padding: '6px 12px', fontSize: 10, color: 'var(--ink-3)' }}>Cumulative debt (peak = facility)</td>{cf.cumDebt.map((v, i) => <td key={i} style={cell(v, 'var(--blue)')}>{v ? Math.round(v / 1000).toLocaleString() : ''}</td>)}<td style={cell(cf.peakDebt, 'var(--blue)')}>{Math.round(cf.peakDebt / 1000).toLocaleString()}</td></tr>
            {/* GST — dealt separately as its own cash-timing line */}
            <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--gold-soft)' }}><td style={{ ...sticky, background: 'var(--gold-soft)', padding: '6px 12px', fontSize: 10.5, color: 'var(--amber)' }}>GST paid on costs</td>{cf.gstPaid.map((v, i) => <td key={i} style={cell(-v, 'var(--amber)')}>{v ? '-' + Math.round(v / 1000).toLocaleString() : ''}</td>)}<td style={cell(-cf.gstPaid.reduce((a, b) => a + b, 0), 'var(--amber)')}>{'-' + Math.round(cf.gstPaid.reduce((a, b) => a + b, 0) / 1000).toLocaleString()}</td></tr>
            <tr style={{ background: 'var(--gold-soft)' }}><td style={{ ...sticky, background: 'var(--gold-soft)', padding: '6px 12px', fontSize: 10.5, color: 'var(--emerald)' }}>GST credits (ITC)</td>{cf.gstReclaimed.map((v, i) => <td key={i} style={cell(v, 'var(--emerald)')}>{v ? Math.round(v / 1000).toLocaleString() : ''}</td>)}<td style={cell(cf.gstReclaimed.reduce((a, b) => a + b, 0), 'var(--emerald)')}>{Math.round(cf.gstReclaimed.reduce((a, b) => a + b, 0) / 1000).toLocaleString()}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Manual entries */}
      <div style={{ marginTop: 20 }}>
        <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700, marginBottom: 8 }}>Manual entries — add / move a cost to a specific month</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <input placeholder="Cost description" value={mLabel} onChange={e => setMLabel(e.target.value)} style={{ ...inp, minWidth: 200 }} />
          <select value={mPhase} onChange={e => setMPhase(e.target.value as CostPhase)} style={inp}>{COST_PHASES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
          <input type="number" placeholder="Month #" value={mMonth} onChange={e => setMMonth(e.target.value)} style={{ ...inp, width: 80 }} />
          <input type="number" placeholder="Amount $" value={mAmount} onChange={e => setMAmount(e.target.value)} style={{ ...inp, width: 120 }} />
          <select value={mFund} onChange={e => setMFund(e.target.value as FundingSource)} style={inp}>{FUNDING.map(f => <option key={f} value={f}>{f}</option>)}</select>
          <button onClick={addManual} style={{ background: 'var(--ink)', color: 'var(--card)', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700 }}>+ Add</button>
        </div>
        {state.manual.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {state.manual.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11.5, color: 'var(--ink-2)', padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ flex: 1 }}>{m.label}</span>
                <span style={{ color: 'var(--ink-3)' }}>{COST_PHASES.find(p => p.id === m.phase)?.label}</span>
                <span style={{ color: 'var(--ink-3)' }}>M{m.month + 1}</span>
                <span style={{ color: 'var(--ink-3)', textTransform: 'uppercase', fontSize: 9 }}>{m.fundedBy}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{fmtK(m.amount)}</span>
                <button onClick={() => delManual(m.id)} style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 16, lineHeight: 1.6 }}>
        Costs are drawn from the project's Cost Stack (Land → Pre-Acquisition, Statutory → Acquisition/Planning, Consultants → Pre-Construction, Hard Costs → Construction, Marketing → Close-out) and spread by each phase's S-curve. Funding is equity-first up to your equity-first figure, then debt. This cashflow feeds the Capital Base budget/admin.
      </p>
    </div>
  )
}
