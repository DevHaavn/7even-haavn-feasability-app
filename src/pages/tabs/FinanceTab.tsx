import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import * as db from '../../db'
import type { FinanceAssumptions, DebtTranche } from '../../db/schema'
import { calculateFinanceWaterfall } from '../../engine/financeWaterfall'
import type { WaterfallResult, WaterfallMonth, TrancheWaterfall } from '../../engine/financeWaterfall'

interface Props { projectId: string }

// ── Formatting ────────────────────────────────────────────────────────────────
const fmtM = (n: number) => `$${(n / 1_000_000).toFixed(2)}M`
const fmtK = (n: number) => Math.abs(n) >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : Math.abs(n) >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`
const pct = (n: number, dp = 1) => `${(n * 100).toFixed(dp)}%`

// ATRIUM palette — muted, no rainbow (brief §10). Same series/meaning, recoloured only.
// SILVER leads the chart series (playbook step 6: series are silver + muted
// blue/purple). GOLD is amber and is kept ONLY for the 'Total finance cost'
// KPI, which the playbook specifies as an amber caution — not for series.
const SILVER = 'var(--gold)', BLUE = 'var(--blue)', PURPLE = 'var(--purple)', GOLD = 'var(--amber)', RED = 'var(--red)', GREEN = 'var(--emerald)', INK = 'var(--ink)', MUTE = 'var(--ink-3)'
const trancheColor = (t: TrancheWaterfall) => t.type === 'mezz' ? PURPLE : t.type === 'preferred-equity' ? SILVER : BLUE

const MODEL_LABEL: Record<string, string> = { compound: 'Compound monthly', pik: 'PIK', simple: 'Simple' }

// ── Charts ────────────────────────────────────────────────────────────────────
function DebtBalanceChart({ months }: { months: WaterfallMonth[] }) {
  const W = 1000, H = 300, PL = 56, PR = 56, PT = 16, PB = 34
  if (months.length === 0) return null
  const maxBal = Math.max(1, ...months.map(m => m.debtBalanceEOP))
  const maxDraw = Math.max(1, ...months.map(m => m.costDraw))
  const x = (i: number) => PL + (i / Math.max(1, months.length - 1)) * (W - PL - PR)
  const yBal = (v: number) => PT + (1 - v / maxBal) * (H - PT - PB)
  const bw = Math.max(1, (W - PL - PR) / months.length * 0.6)
  const line = months.map((m, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${yBal(m.debtBalanceEOP).toFixed(1)}`).join(' ')
  const tick = (v: number) => `$${Math.round(v / 1_000_000)}M`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <g key={i}>
          <line x1={PL} x2={W - PR} y1={yBal(maxBal * f)} y2={yBal(maxBal * f)} stroke="var(--line)" />
          <text x={PL - 8} y={yBal(maxBal * f) + 3} textAnchor="end" fontSize="9" fill={MUTE}>{tick(maxBal * f)}</text>
        </g>
      ))}
      {months.map((m, i) => {
        const h = (m.costDraw / maxDraw) * (H - PT - PB)
        return <rect key={i} x={x(i) - bw / 2} y={H - PB - h} width={bw} height={h} fill={SILVER} opacity={0.5} rx={1} />
      })}
      <path d={line} fill="none" stroke={BLUE} strokeWidth={2.5} />
      {months.filter((_, i) => i % Math.ceil(months.length / 8) === 0).map((m, i, arr) => {
        const idx = months.indexOf(m)
        return <text key={i} x={x(idx)} y={H - 12} textAnchor="middle" fontSize="9" fill={MUTE}>{m.month.replace('-', ' ').slice(2)}</text>
      })}
    </svg>
  )
}

function InterestByTrancheChart({ result }: { result: WaterfallResult }) {
  const W = 1000, H = 300, PL = 56, PR = 16, PT = 16, PB = 34
  const qs = result.quarters
  if (qs.length === 0) return null
  const totals = qs.map(q => Object.values(q.interestByTranche).reduce((s, v) => s + v, 0))
  const maxT = Math.max(1, ...totals)
  const bw = Math.max(6, (W - PL - PR) / qs.length * 0.62)
  const x = (i: number) => PL + (i + 0.5) / qs.length * (W - PL - PR)
  const y = (v: number) => PT + (1 - v / maxT) * (H - PT - PB)
  const order = result.tranches
  const tick = (v: number) => `$${(v / 1_000_000).toFixed(2)}M`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <g key={i}>
          <line x1={PL} x2={W - PR} y1={y(maxT * f)} y2={y(maxT * f)} stroke="var(--line)" />
          <text x={PL - 8} y={y(maxT * f) + 3} textAnchor="end" fontSize="9" fill={MUTE}>{tick(maxT * f)}</text>
        </g>
      ))}
      {qs.map((q, i) => {
        let acc = 0
        return (
          <g key={i}>
            {order.map(t => {
              const v = q.interestByTranche[t.id] || 0
              if (v <= 0) return null
              const yTop = y(acc + v), hgt = y(acc) - y(acc + v)
              acc += v
              return <rect key={t.id} x={x(i) - bw / 2} y={yTop} width={bw} height={Math.max(0, hgt)} fill={trancheColor(t)} />
            })}
            <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="8.5" fill={MUTE}>{q.quarter}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="kpi">
      <div className="lab">{label}</div>
      <div className="val" style={color ? { color } : undefined}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

const SUB_TABS = [['capital', 'Capital stack'], ['cashflow', 'Cashflow'], ['sensitivity', 'Sensitivity'], ['drawdown', 'Drawdown']] as const
const LENSES = [['developer', 'Developer'], ['bank', 'Bank / lender'], ['mezz', 'Mezz investor'], ['equity', 'Equity partner']] as const

const inputCss: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px', fontSize: 11, width: 90, outline: 'none', background: 'var(--card)' }
const selCss: React.CSSProperties = { ...inputCss, width: 132 }

export default function FinanceTab({ projectId }: Props) {
  const [fa, setFa] = useState<FinanceAssumptions>(() => db.getFinanceAssumptions(projectId))
  const [tab, setTab] = useState<typeof SUB_TABS[number][0]>('capital')
  const [lens, setLens] = useState<typeof LENSES[number][0]>('developer')
  const [freq, setFreq] = useState<'quarterly' | 'monthly'>('quarterly')

  // Live update: repaint when another client's change is pulled in, unless this
  // user just edited (guard) so we don't disturb active input.
  const syncTick = useStore(s => s.syncTick)
  const lastEdit = useRef(0)
  useEffect(() => { setFa(db.getFinanceAssumptions(projectId)) }, [projectId])
  useEffect(() => {
    if (Date.now() - lastEdit.current < 4000) return
    setFa(db.getFinanceAssumptions(projectId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncTick])

  const detailed = db.getDetailedCostStack(projectId)
  const land = db.getLandTerms(projectId)
  const result = useMemo(() => calculateFinanceWaterfall(detailed, land, fa), [detailed, land, fa])

  function patchTranche(id: string, patch: Partial<DebtTranche>) {
    lastEdit.current = Date.now()
    const next = { ...fa, tranches: fa.tranches.map(t => t.id === id ? { ...t, ...patch } : t) }
    setFa(next)
    db.saveFinanceAssumptions(next)
  }

  const financePctBase = result.baseTDC > 0 ? result.totalFinanceCost / result.baseTDC : 0

  // Cashflow schedule buckets (quarterly or monthly)
  const buckets = freq === 'quarterly'
    ? result.quarters.map(q => ({ label: q.quarter, debtDraw: q.debtDraw, equityDraw: q.equityDraw, interestByTranche: q.interestByTranche, balance: q.debtBalanceEOP }))
    : result.months.map(m => ({ label: m.month.slice(2), debtDraw: m.debtDraw, equityDraw: m.equityDraw, interestByTranche: m.interestByTranche, balance: m.debtBalanceEOP }))
  const shown = buckets.length > 10 && freq === 'quarterly' ? buckets : buckets.slice(0, 12)

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div className="fx-wrap">
        <div className="pagehead">
          <div>
            <div className="kicker">05 · Finance</div>
            <h1 className="h-sec">Capital Stack</h1>
            <div className="h-sub">Debt, equity and the true cost of money across the programme.</div>
          </div>
          <span className="check">✓ Auto-saved</span>
        </div>

        {/* Sub-tabs */}
        <div className="subtabs mb">
          {SUB_TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`subtab${tab === id ? ' on' : ''}`}>{label}</button>
          ))}
        </div>

        {/* KPI row */}
        <div className="kpis k5 mb">
          <Kpi label="Base TDC" value={fmtM(result.baseTDC)} sub="ex finance costs" />
          <Kpi label="Total finance cost" value={fmtM(result.totalFinanceCost)} sub={`${pct(financePctBase)} of base TDC`} color={GOLD} />
          <Kpi label="Peak debt balance" value={fmtM(result.peakDebt)} sub="max outstanding" />
          <Kpi label="Senior capitalised" value={fmtM(result.seniorCapitalised)} sub="rolls into debt balance" />
          <Kpi label="All-in TDC" value={fmtM(result.allInTDC)} sub="incl. all finance" color={GREEN} />
        </div>

        {/* View-as lenses */}
        <div className="flex aic gap mb wrapf">
          <span className="eyebrow">View as</span>
          <div className="seg">
            {LENSES.map(([id, label]) => (
              <button key={id} onClick={() => setLens(id)} className={lens === id ? 'on' : ''}>{label}</button>
            ))}
          </div>
        </div>

      <div style={{ paddingBottom: 20 }}>
        {/* Charts */}
        {(tab === 'capital' || tab === 'drawdown') && (
          <div style={{ display: 'grid', gridTemplateColumns: tab === 'capital' ? '1fr 1fr' : '1fr', gap: 20, marginBottom: 28 }}>
            <div className="panel chartcard">
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTE, fontWeight: 600, marginBottom: 4 }}>Debt balance — monthly drawdown curve</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 10, color: MUTE, marginBottom: 8 }}>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, background: BLUE, marginRight: 4 }} />Debt balance</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, background: SILVER, opacity: 0.5, marginRight: 4 }} />Monthly draws</span>
              </div>
              <DebtBalanceChart months={result.months} />
            </div>
            {tab === 'capital' && (
              <div className="panel chartcard">
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTE, fontWeight: 600, marginBottom: 4 }}>Interest accrual — by tranche per quarter</div>
                <div style={{ display: 'flex', gap: 16, fontSize: 10, color: MUTE, marginBottom: 8 }}>
                  {result.tranches.map(t => <span key={t.id}><span style={{ display: 'inline-block', width: 8, height: 8, background: trancheColor(t), marginRight: 4 }} />{t.type === 'mezz' ? 'Mezzanine' : t.type === 'preferred-equity' ? 'Preferred equity' : 'Senior interest'}</span>)}
                </div>
                <InterestByTrancheChart result={result} />
              </div>
            )}
          </div>
        )}

        {/* Tranche configuration */}
        {tab === 'capital' && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTE, fontWeight: 600, marginBottom: 10 }}>Tranche configuration — interest model per facility</div>
            <div className="panel scrollx">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 720 }}>
                <thead>
                  <tr style={{ color: MUTE, textAlign: 'left' }}>
                    {['Facility', 'Amount', 'Rate %', 'Interest model', 'Capitalised?', 'Day count'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, textAlign: i === 1 || i === 2 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fa.tranches.map(t => {
                    const wf = result.tranches.find(x => x.id === t.id)
                    const facility = t.useAutoLvr ? result.baseTDC * (t.lvr || 0) : (t.amount || 0)
                    return (
                      <tr key={t.id} style={{ borderTop: '1px solid var(--line)' }}>
                        <td style={{ padding: '10px 14px' }}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: wf ? trancheColor(wf) : MUTE, marginRight: 8 }} />{t.label}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtM(facility)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <input type="number" step="0.1" value={((t.interestRate || 0) * 100).toFixed(1)} onChange={e => patchTranche(t.id, { interestRate: (parseFloat(e.target.value) || 0) / 100 })} style={{ ...inputCss, width: 56, textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <select value={t.interestModel || (t.type === 'mezz' ? 'pik' : 'compound')} onChange={e => patchTranche(t.id, { interestModel: e.target.value as DebtTranche['interestModel'] })} style={selCss}>
                            <option value="compound">Compound monthly</option>
                            <option value="pik">PIK</option>
                            <option value="simple">Simple</option>
                          </select>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <select value={(t.capitalised ?? (t.type !== 'preferred-equity')) ? 'yes' : 'no'} onChange={e => patchTranche(t.id, { capitalised: e.target.value === 'yes' })} style={selCss}>
                            <option value="yes">Yes — capitalised</option>
                            <option value="no">No — cash pay</option>
                          </select>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <select value={t.dayCount || 'act365'} onChange={e => patchTranche(t.id, { dayCount: e.target.value as DebtTranche['dayCount'] })} style={{ ...selCss, width: 90 }}>
                            <option value="act360">Act/360</option>
                            <option value="act365">Act/365</option>
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cashflow schedule */}
        {(tab === 'capital' || tab === 'cashflow') && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTE, fontWeight: 600 }}>Cashflow — draw schedule with interest accrual</div>
              <div style={{ display: 'flex', gap: 2, background: 'var(--line)', borderRadius: 6, padding: 2 }}>
                {(['quarterly', 'monthly'] as const).map(f => (
                  <button key={f} onClick={() => setFreq(f)} style={{ border: 'none', borderRadius: 5, padding: '4px 12px', fontSize: 10, cursor: 'pointer', textTransform: 'capitalize', background: freq === f ? INK : 'transparent', color: freq === f ? 'var(--card)' : MUTE, fontWeight: freq === f ? 600 : 400 }}>{f}</button>
                ))}
              </div>
            </div>
            <div className="panel scrollx">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5, minWidth: 720 }}>
                <thead>
                  <tr style={{ color: MUTE }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Item</th>
                    {shown.map(b => <th key={b.label} style={{ padding: '8px 10px', textAlign: 'right', fontSize: 9, fontWeight: 600, whiteSpace: 'nowrap' }}>{b.label}</th>)}
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 9, textTransform: 'uppercase' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan={shown.length + 2} style={{ padding: '6px 12px', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTE, background: 'var(--card-2)' }}>Cost drawdowns</td></tr>
                  <ScheduleRow label="Debt draws" vals={shown.map(b => -b.debtDraw)} />
                  <ScheduleRow label="Equity draws" vals={shown.map(b => -b.equityDraw)} />
                  <tr><td colSpan={shown.length + 2} style={{ padding: '6px 12px', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTE, background: 'var(--card-2)' }}>Interest accrual — by tranche</td></tr>
                  {result.tranches.map(t => (
                    <ScheduleRow key={t.id} label={t.type === 'mezz' ? 'Mezzanine' : t.type === 'preferred-equity' ? 'Preferred equity' : t.label} vals={shown.map(b => -(b.interestByTranche[t.id] || 0))} />
                  ))}
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>Debt balance (EOP)</td>
                    {shown.map((b, i) => <td key={i} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtM(b.balance)}</td>)}
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Finance cost per TDC category */}
        {tab === 'capital' && (
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTE, fontWeight: 600, marginBottom: 10 }}>Finance cost allocated to each TDC category</div>
            <div className="panel scrollx">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 720 }}>
                <thead>
                  <tr style={{ color: MUTE }}>
                    {['Category', 'Base cost', 'Debt drawn', 'Avg hold', 'Senior int.', 'Mezz int.', 'Pref int.', 'Total fin. cost'].map((h, i) => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: i === 0 ? 'left' : 'right', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.categories.map(c => (
                    <tr key={c.category} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '9px 14px' }}>{c.category}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtM(c.baseCost)}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c.debtDrawn > 0 ? fmtM(c.debtDrawn) : '$0'}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', color: MUTE }}>{c.avgHoldMonths} mo</td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', color: BLUE, fontVariantNumeric: 'tabular-nums' }}>{c.seniorInt > 0 ? fmtK(c.seniorInt) : '—'}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', color: PURPLE, fontVariantNumeric: 'tabular-nums' }}>{c.mezzInt > 0 ? fmtK(c.mezzInt) : '—'}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', color: SILVER, fontVariantNumeric: 'tabular-nums' }}>{c.prefInt > 0 ? fmtK(c.prefInt) : '—'}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{c.total > 0 ? fmtK(c.total) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'sensitivity' && (
          <div className="panel pad" style={{ color: 'var(--ink-2)', fontSize: 12 }}>
            Peak debt {fmtM(result.peakDebt)} · total finance cost {fmtM(result.totalFinanceCost)} ({pct(financePctBase)} of TDC). Adjust tranche rates/models on Capital stack to stress the outcome.
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

function ScheduleRow({ label, vals }: { label: string; vals: number[] }) {
  const total = vals.reduce((s, v) => s + v, 0)
  return (
    <tr style={{ borderTop: '1px solid #F6F4F0' }}>
      <td style={{ padding: '7px 12px', color: 'var(--ink-2)' }}>{label}</td>
      {vals.map((v, i) => <td key={i} style={{ padding: '7px 10px', textAlign: 'right', color: v < 0 ? RED : 'var(--ink-3)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{v === 0 ? '—' : fmtK(v)}</td>)}
      <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 600, color: total < 0 ? RED : 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{total === 0 ? '—' : fmtK(total)}</td>
    </tr>
  )
}
