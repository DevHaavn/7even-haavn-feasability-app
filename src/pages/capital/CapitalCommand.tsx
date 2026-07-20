import React, { createContext, useContext, useMemo, useState, useCallback } from 'react'
import '../../styles/atrium-capital.css'
import { useAtriumTheme, setAtriumTheme } from '../../lib/atriumTheme'
import { useStore } from '../../store'
import {
  loadCapital, saveCapital, portfolioTotals, stageRollup,
  projectRaised, projectDeployed, investorCommitted, investorFunded,
  callFunded, callInvestorCount,
  fmtM, fmtPct, type CapitalState, type CapProject,
} from './capitalModel'
import { readFeasibility, diffSync, applySync, type SyncDiffLine } from './capitalSync'
import CapitalInvestors from './CapitalInvestors'
import CapitalPipeline from './CapitalPipeline'
import CapitalCalls from './CapitalCalls'
import CapitalReturns from './CapitalReturns'

// ── Shared state ────────────────────────────────────────────────────────────

interface Ctx {
  state: CapitalState
  update: (fn: (s: CapitalState) => CapitalState) => void
  openDrawer: (node: React.ReactNode) => void
  closeDrawer: () => void
  goTab: (t: TabId) => void
}
const CapitalCtx = createContext<Ctx | null>(null)
export const useCapital = () => {
  const c = useContext(CapitalCtx)
  if (!c) throw new Error('useCapital must be used inside CapitalCommand')
  return c
}

export type TabId = 'command' | 'projects' | 'investors' | 'pipeline' | 'calls' | 'returns' | 'portal'

const TABS: { id: TabId; label: string }[] = [
  { id: 'command', label: 'Command' },
  { id: 'projects', label: 'Projects' },
  { id: 'investors', label: 'Investors · CRM' },
  { id: 'pipeline', label: 'Raise Pipeline' },
  { id: 'calls', label: 'Capital Calls' },
  { id: 'returns', label: 'Distributions & Returns' },
  { id: 'portal', label: 'Investor Portal' },
]

// ── Shell ───────────────────────────────────────────────────────────────────

export default function CapitalCommand({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<CapitalState>(loadCapital)
  const [tab, setTab] = useState<TabId>('command')
  const [drawer, setDrawer] = useState<React.ReactNode>(null)
  const theme = useAtriumTheme()

  // Every mutation writes through to the shared backend, so Lewis's edit shows
  // up for Daniel. saveCapital → saveKV → localStorage + capital_kv upsert.
  const update = useCallback((fn: (s: CapitalState) => CapitalState) => {
    setState(prev => { const next = fn(prev); saveCapital(next); return next })
  }, [])

  const openDrawer = useCallback((node: React.ReactNode) => setDrawer(node), [])
  const closeDrawer = useCallback(() => setDrawer(null), [])
  const goTab = useCallback((t: TabId) => { setTab(t); window.scrollTo({ top: 0, behavior: 'smooth' }) }, [])

  const ctx = useMemo<Ctx>(() => ({ state, update, openDrawer, closeDrawer, goTab }),
    [state, update, openDrawer, closeDrawer, goTab])

  return (
    <CapitalCtx.Provider value={ctx}>
      <div className={`fxs ccx${theme === 'dark' ? ' dark' : ''}`}
        style={{ position: 'fixed', inset: 0, zIndex: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* ── Chrome — always dark, per the prototype ── */}
        <div className="fx-topbar">
          <button className="fx-home no-drag" onClick={onBack}>← Capital Base</button>
          <div className="fx-div" />
          <div className="cc-brandstack">
            <span className="cc-bs7">7EVEN</span>
            <span className="cc-bsh">CAPITAL</span>
          </div>
          <div className="fx-div" />
          <div className="fx-proj">
            <div className="fx-projname">
              <span className="fx-dot" />
              <span className="fx-nm">Capital Command</span>
              <span className="fx-pillmini"><span className="d" />LIVE</span>
            </div>
            <div className="fx-addr">Pillar 02 · Capital Raise &amp; Investor Command · Portfolio</div>
          </div>
          <div className="fx-right no-drag">
            <div className="cc-persona">
              <span className="pn">Lewis Jin</span>
              <span className="pr">Head of Capital</span>
            </div>
            <div className="cc-avatar">LJ</div>
            <span className="fx-atr">ATRIUM</span>
            <button className="fx-tgl" onClick={() => setAtriumTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? '◐ DARK' : '☀ LIGHT'}
            </button>
          </div>
        </div>

        <div className="fx-tabnav no-drag">
          {TABS.map(t => (
            <button key={t.id} className={`fx-tab ${t.id === tab ? 'on' : ''}`} onClick={() => goTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="fx-wrap" style={{ minWidth: 0 }}>
          {tab === 'command' && <CommandTab />}
          {tab === 'projects' && <ProjectsTab />}
          {tab === 'investors' && <CapitalInvestors />}
          {tab === 'pipeline' && <CapitalPipeline />}
          {tab === 'calls' && <CapitalCalls />}
          {tab === 'returns' && <CapitalReturns />}
          {tab === 'portal' && <PortalTab />}
          <div className="foot">ATRIUM · CAPITAL COMMAND · PILLAR 02 · 7EVEN × HAAVN</div>
        </div>

        {/* ── Drawer ── */}
        <div className={`scrim${drawer ? ' on' : ''}`} onClick={closeDrawer} />
        <div className={`drawer${drawer ? ' open' : ''}`}>
          <button className="drawer-x" onClick={closeDrawer} aria-label="Close">✕</button>
          <div className="dr-pad">{drawer}</div>
        </div>
      </div>
    </CapitalCtx.Provider>
  )
}

// ── Shared bits ─────────────────────────────────────────────────────────────

/** Two-tone bar: solid = deployed, tint = committed-not-yet-deployed. */
export function Bar2({ deployed, raised, required }: { deployed: number; raised: number; required: number }) {
  const d = required > 0 ? Math.min(100, (deployed / required) * 100) : 0
  const c = required > 0 ? Math.max(0, Math.min(100 - d, ((raised - deployed) / required) * 100)) : 0
  return (
    <div className="track">
      <div className="fill" style={{ width: `${d}%`, background: 'var(--gold)' }} />
      <div className="fill" style={{ width: `${c}%`, background: 'var(--gold-line)' }} />
    </div>
  )
}

/**
 * Objective row — reads as the design's "82%" readout, but click the figure to
 * edit the underlying current value. An always-on input box (the first pass)
 * put a form control in a panel the design draws as a summary.
 */
function ObjectiveRow({ objective, onChange }: {
  objective: { id: string; label: string; current: number; target: number; unit?: string }
  onChange: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const pct = objective.target > 0 ? Math.min(100, (objective.current / objective.target) * 100) : 0
  const col = pct < 70 ? 'var(--amber)' : 'var(--emerald)'

  const commit = () => {
    const v = parseFloat(draft)
    if (Number.isFinite(v)) onChange(Math.max(0, v))
    setEditing(false)
  }

  return (
    <div className="barrow" style={{ gridTemplateColumns: '200px 1fr 56px' }}>
      <span className="bl">{objective.label}</span>
      <div className="track"><div className="fill" style={{ width: `${pct}%`, background: col }} /></div>
      {editing ? (
        <input className="fin mono" autoFocus style={{ padding: '3px 5px', fontSize: 11 }}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }} />
      ) : (
        <span className="bv" style={{ color: col, cursor: 'pointer' }}
          title={`${objective.current} of ${objective.target}${objective.unit ? ` ${objective.unit}` : ''} — click to edit`}
          onClick={() => { setDraft(String(objective.current)); setEditing(true) }}>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  )
}

export function StatusTag({ status }: { status: string }) {
  const m: Record<string, [string, string]> = {
    live: ['pos', 'Live'], hold: ['marg', 'On hold'], complete: ['info', 'Complete'],
  }
  const [cls, label] = m[status] ?? ['info', status]
  return <span className={`st ${cls}`}>{label}</span>
}

// ── 1 · COMMAND ─────────────────────────────────────────────────────────────

function CommandTab() {
  const { state, update, goTab } = useCapital()
  const store = useStore()
  const [lens, setLens] = useState<'director' | 'capital' | 'bank'>('director')
  const [sync, setSync] = useState<{ lines: SyncDiffLine[]; payload: ReturnType<typeof readFeasibility> } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const t = portfolioTotals(state)
  const stages = stageRollup(state)

  const runPull = () => {
    const payload = readFeasibility()
    setSync({ lines: diffSync(state, payload), payload })
  }
  const applyPull = () => {
    if (!sync) return
    update(s => applySync(s, sync.payload))
    setToast(`${sync.payload.length} project${sync.payload.length === 1 ? '' : 's'} synced from Feasibility`)
    setSync(null)
    setTimeout(() => setToast(null), 4000)
  }

  // Deployment velocity — cumulative capital working, by month.
  const [velocity, velocityIsActual] = useMemo<[number[], boolean]>(() => {
    const byMonth = new Array(12).fill(0)
    state.callAllocations.forEach(a => {
      if (!a.fundedDate) return
      const m = new Date(a.fundedDate).getMonth()
      if (m >= 0 && m < 12) byMonth[m] += a.fundedAmount
    })
    let run = 0
    const cum = byMonth.map(v => (run += v))
    // Most deployment predates the call register (seed positions are funded
    // directly), so the call history alone understates it badly. When it covers
    // less than half of what is actually deployed, show a modelled S-curve to
    // today's figure instead — flagged in the caption, never presented as actual.
    if (cum[11] >= t.deployed * 0.5 && cum[11] > 0) return [cum, true]
    const shape = (i: number) => {
      const x = (i + 1) / 12
      return x * x * (3 - 2 * x)      // smoothstep: slow start, accelerating middle
    }
    return [Array.from({ length: 12 }, (_, i) => t.deployed * shape(i)), false]
  }, [state.callAllocations, t.deployed])

  const vmax = Math.max(...velocity, 1)
  const W = 560, H = 150
  const path = velocity.map((p, i) => `${i ? 'L' : 'M'}${((i / (velocity.length - 1)) * W).toFixed(1)},${(H - (p / vmax) * H).toFixed(1)}`).join(' ')

  // Capital stack — aggregated across every synced project, else the raise split.
  const stack = useMemo(() => {
    const agg: Record<string, number> = {}
    state.projects.forEach(p => (p.capitalStack ?? []).forEach(s => {
      agg[s.tranche] = (agg[s.tranche] ?? 0) + s.amount
    }))
    const colours = ['var(--blue)', 'var(--purple)', 'var(--gold)', 'var(--emerald)', 'var(--slate)']
    const entries = Object.entries(agg)
    if (entries.length === 0) {
      return [
        { n: 'Committed equity', v: t.raised, c: 'var(--gold)' },
        { n: 'Remaining to raise', v: t.remaining, c: 'var(--slate)' },
      ]
    }
    return entries.map(([n, v], i) => ({ n, v, c: colours[i % colours.length] }))
  }, [state.projects, t])
  const stackTotal = stack.reduce((a, s) => a + s.v, 0) || 1

  const overdueCalls = state.calls.filter(c => c.status !== 'draft' && c.status !== 'funded' && new Date(c.dueDate) < new Date())
  const biggestStage = [...stages].sort((a, b) => b.required - a.required)[0]

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="kicker">Portfolio · Capital Deployment</div>
          <h1 className="h-sec">Capital Command</h1>
          <div className="h-sub">One console for every dollar — track capital from the live feasibility studio to the bank, run the raise, and hold the whole portfolio in view.</div>
        </div>
        <div className="flex aic gap wrapf">
          <button className="btn" onClick={runPull}>⟳ Pull from Feasibility</button>
          <span className="eyebrow">View as</span>
          <div className="seg">
            {(['director', 'capital', 'bank'] as const).map(l => (
              <button key={l} className={lens === l ? 'on' : ''} onClick={() => setLens(l)}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>

      {toast && <div className="okbox mb">✓ {toast}</div>}

      {/* Sync diff preview — nothing is written until Apply */}
      {sync && (
        <div className="panel pad gold-top mb">
          <div className="flex between aic mb wrapf gap">
            <span className="eyebrow">Pull from Feasibility · review changes</span>
            <div className="flex gap">
              <button className="btn" onClick={applyPull}>Apply</button>
              <button className="btn ghost" onClick={() => setSync(null)}>Cancel</button>
            </div>
          </div>
          {sync.lines.length === 0 && <div className="note">No projects found in the studio.</div>}
          {sync.lines.map(l => (
            <div key={l.ref} className="sumrow" style={{ display: 'block' }}>
              <div className="flex between aic">
                <span className="l" style={{ color: 'var(--ink)', fontWeight: 500 }}>{l.name}</span>
                {l.isNew
                  ? <span className="st pos">New</span>
                  : l.changes.length === 0
                    ? <span className="note" style={{ color: 'var(--faint)' }}>no change</span>
                    : <span className="st info">{l.changes.length} change{l.changes.length === 1 ? '' : 's'}</span>}
              </div>
              {l.changes.map(c => (
                <div key={c.field} className="note" style={{ marginTop: 4, color: 'var(--ink-2)' }}>
                  {c.field} <span style={{ color: 'var(--faint)' }}>{c.from}</span> → <span style={{ color: 'var(--gold)' }}>{c.to}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* 0dp throughout the headline figures — the design reads "$312M", and a
          trailing ".0" on every card is noise at portfolio scale. */}
      <div className="kpis k4 mb">
        <div className="kpi"><div className="lab">Total capital required</div><div className="val">{fmtM(t.required, 0)}</div><div className="sub">portfolio · all stages</div></div>
        <div className="kpi accent"><div className="lab">Committed / raised</div><div className="val">{fmtM(t.raised, 0)}</div><div className="sub">{fmtPct(t.pctRaised)} of requirement</div></div>
        <div className="kpi g"><div className="lab">Deployed &amp; working</div><div className="val">{fmtM(t.deployed, 0)}</div><div className="sub">{fmtPct(t.pctDeployed)} drawn</div></div>
        <div className="kpi"><div className="lab">Remaining to raise</div><div className="val">{fmtM(t.remaining, 0)}</div><div className="sub">open equity ticket</div></div>
      </div>

      <div className="panel pad gold-top mb">
        <div className="flex between aic mb">
          <span className="eyebrow">Portfolio raise · committed vs deployed</span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--gold)', fontSize: 13 }}>{fmtPct(t.pctRaised)} RAISED</span>
        </div>
        <div className="track" style={{ height: 12 }}>
          <div className="fill" style={{ width: `${Math.min(100, t.pctDeployed * 100)}%`, background: 'var(--gold)' }} />
          <div className="fill" style={{ width: `${Math.max(0, (t.pctRaised - t.pctDeployed) * 100)}%`, background: 'var(--gold-line)' }} />
        </div>
        <div className="legend">
          <span><i style={{ background: 'var(--gold)' }} />Deployed {fmtM(t.deployed, 0)}</span>
          <span><i style={{ background: 'var(--gold-line)' }} />Committed {fmtM(t.raised - t.deployed, 0)}</span>
          <span><i style={{ background: 'var(--track)' }} />To raise {fmtM(t.remaining, 0)}</span>
        </div>
      </div>

      <div className="two mb">
        <div className="panel pad">
          <div className="divlabel">Capital by stage · deployed · raised · required</div>
          {stages.map(s => (
            <div key={s.id} className="barrow">
              <span className="bl">{s.stage}</span>
              <Bar2 deployed={s.deployed} raised={s.raised} required={s.required} />
              <span className="bv">{fmtM(s.deployed, 0)} · <b>{fmtM(s.raised, 0)}</b> · {fmtM(s.required, 0)}</span>
            </div>
          ))}
        </div>
        <div className="panel pad">
          <div className="flex between aic mb">
            <span className="eyebrow">Deployment velocity · cumulative · 12 mo</span>
            {!velocityIsActual && (
              <span className="note" style={{ fontSize: 10, color: 'var(--faint)' }} title="Most capital was deployed before the call register existed, so this is a modelled ramp to today's figure rather than month-by-month actuals.">
                modelled
              </span>
            )}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={150} preserveAspectRatio="none">
            <defs>
              <linearGradient id="ccv" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--gold)" stopOpacity=".32" />
                <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${path} L${W},${H} L0,${H} Z`} fill="url(#ccv)" />
            <path d={path} fill="none" stroke="var(--gold)" strokeWidth="2.5" />
          </svg>
          <div className="flex between" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--faint)', paddingTop: 6 }}>
            {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => <span key={i}>{m}</span>)}
          </div>
          {(() => {
            // The next call is the next one DUE, not the earliest unfunded —
            // an overdue call is a problem to chase (it has its own banner),
            // not the thing to plan around.
            const today = new Date().toISOString().slice(0, 10)
            const upcoming = [...state.calls]
              .filter(c => c.status !== 'funded' && c.dueDate >= today)
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
            const proj = upcoming && state.projects.find(p => p.id === upcoming.projectId)
            return (
              <div className="note mt">
                {upcoming
                  ? <><b style={{ color: 'var(--gold)' }}>Next call</b> · {new Date(upcoming.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} · {fmtM(upcoming.totalAmount, 0)} — {upcoming.stage}, {proj?.name ?? '—'}</>
                  : 'No upcoming calls scheduled.'}
              </div>
            )
          })()}
        </div>
      </div>

      <div className="two">
        <div className="panel pad">
          <div className="divlabel">Capital stack · how {fmtM(t.required, 0)} is structured</div>
          <div className="track" style={{ height: 16 }}>
            {stack.map(s => <div key={s.n} className="fill" style={{ width: `${(s.v / stackTotal) * 100}%`, background: s.c }} />)}
          </div>
          <div className="legend">
            {stack.map(s => <span key={s.n}><i style={{ background: s.c }} />{s.n} {fmtM(s.v, 0)}</span>)}
          </div>
          <div className="divlabel">Live feasibility &amp; finance feeds</div>
          <div className="two" style={{ gap: 10 }}>
            {[
              { ic: '▦', label: 'Feasibility Studio', tab: 'summary' },
              { ic: '$', label: 'Finance · Capital Stack', tab: 'finance' },
              { ic: '≈', label: 'Cash Flow', tab: 'cashflow' },
              { ic: '◱', label: 'Project Dashboards', tab: 'insights' },
            ].map(l => (
              <button key={l.label} className="linktile" onClick={() => {
                // Deep-link into the studio: open the first synced project on that tab.
                const first = state.projects.find(p => p.feasibilityRef)
                if (first?.feasibilityRef) {
                  store.setActiveProject(first.feasibilityRef)
                  store.setActiveTab(l.tab as any)
                }
              }}>
                <span className="ic">{l.ic}</span>{l.label}<span className="ar">↗</span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel pad">
          <div className="divlabel">Director objectives · alignment</div>
          {state.objectives.map(o => (
            <ObjectiveRow key={o.id} objective={o}
              onChange={v => update(s => ({ ...s, objectives: s.objectives.map(x => x.id === o.id ? { ...x, current: v } : x) }))} />
          ))}
          <div className="mt2" />
          {overdueCalls.map(c => {
            const p = state.projects.find(x => x.id === c.projectId)
            const short = c.totalAmount - callFunded(state, c.id)
            const n = callInvestorCount(state, c.id)
            return (
              <div key={c.id} className="warn mb">
                ⚠ {p?.name} {c.stage.toLowerCase()} call ({fmtM(c.totalAmount, 0)}) is <b>overdue</b>
                {n > 0 && <> — {n} investor{n === 1 ? '' : 's'}, {fmtM(short)} outstanding</>}.
              </div>
            )
          })}
          {/* The largest stage's subscription level, stated rather than alarmed:
              a partly-subscribed stage mid-raise is the normal case. The genuine
              alert above is the overdue call. */}
          {biggestStage && (
            <div className="okbox">
              ✓ {biggestStage.stage} {fmtPct(biggestStage.raised / (biggestStage.required || 1))} subscribed —
              {' '}{fmtM(biggestStage.raised, 0)} of {fmtM(biggestStage.required, 0)} raised.
            </div>
          )}
          {overdueCalls.length === 0 && <div className="okbox mt">✓ No overdue capital calls.</div>}
        </div>
      </div>
    </>
  )
}

// ── 2 · PROJECTS ────────────────────────────────────────────────────────────

function ProjectsTab() {
  const { state, update, openDrawer } = useCapital()
  const t = portfolioTotals(state)

  const pullOne = (p: CapProject) => {
    const payload = readFeasibility().filter(f => f.ref === p.feasibilityRef)
    if (payload.length === 0) return
    update(s => applySync(s, payload))
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="kicker">Portfolio · Capital by Project</div>
          <h1 className="h-sec">Projects</h1>
          <div className="h-sub">Every development's capital position — click a row for the capital stack, investors, drawdowns and links into its live feasibility model.</div>
        </div>
        <div className="flex gap wrapf">
          <span className="tag">{state.projects.length} projects</span>
          <span className="tag">{fmtM(t.required)} required</span>
          <span className="tag gold">{fmtM(t.raised)} raised</span>
        </div>
      </div>

      <div className="panel pad">
        <div style={{ overflowX: 'auto' }}>
          <table className="dtable">
            <thead>
              <tr>
                <th></th><th>Project</th><th>Type</th><th>Status</th><th>Phase</th>
                <th className="num">GDV</th><th className="num">Req.</th><th className="num">Funded</th>
                <th className="num">Proj IRR</th><th></th>
              </tr>
            </thead>
            <tbody>
              {state.projects.map(p => {
                const raised = projectRaised(state, p.id)
                const pct = p.capitalRequired > 0 ? Math.round((raised / p.capitalRequired) * 100) : 0
                return (
                  <tr key={p.id} className="click" onClick={() => openDrawer(<ProjectDrawer projectId={p.id} onPull={() => pullOne(p)} />)}>
                    <td className="num" style={{ color: 'var(--faint)' }}>{p.code}</td>
                    <td>
                      <div className="name">{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--faint)' }}>{p.address}</div>
                    </td>
                    <td><span className="tag">{p.assetType}</span></td>
                    <td><StatusTag status={p.status} /></td>
                    <td>{p.phase ?? '—'}</td>
                    <td className="num">{fmtM(p.gdv)}</td>
                    <td className="num">{fmtM(p.capitalRequired)}</td>
                    <td className="num">
                      <span className="mini-track"><i style={{ width: `${Math.min(100, pct)}%` }} /></span>{' '}
                      <span style={{ color: 'var(--gold)' }}>{pct}%</span>
                    </td>
                    <td className="num" style={{ color: 'var(--emerald)' }}>{p.projIrr ? `${p.projIrr.toFixed(1)}%` : '—'}</td>
                    <td className="num" style={{ color: 'var(--faint)' }}>↗</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function ProjectDrawer({ projectId, onPull }: { projectId: string; onPull: () => void }) {
  const { state, update, goTab, closeDrawer } = useCapital()
  const store = useStore()
  const p = state.projects.find(x => x.id === projectId)
  if (!p) return null

  const raised = projectRaised(state, p.id)
  const deployed = projectDeployed(state, p.id)
  const positions = state.positions.filter(x => x.projectId === p.id)
  const nextCall = [...state.calls]
    .filter(c => c.projectId === p.id && c.status !== 'funded')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]

  const setField = (k: keyof CapProject, v: any) =>
    update(s => ({ ...s, projects: s.projects.map(x => x.id === p.id ? { ...x, [k]: v } : x) }))

  return (
    <>
      <div className="kicker">Project {p.code} · {p.assetType}</div>
      <h2>{p.name}</h2>
      <div style={{ fontSize: 12, color: 'var(--faint)' }}>{p.address}</div>
      <div className="flex gap mt" style={{ gap: 8 }}>
        <StatusTag status={p.status} />
        <span className="tag">{p.phase}</span>
      </div>

      <div className="statgrid">
        <div className="s"><div className="l">GDV</div><div className="v">{fmtM(p.gdv)}</div></div>
        <div className="s"><div className="l">Proj IRR</div><div className="v" style={{ color: 'var(--emerald)' }}>{p.projIrr ? `${p.projIrr.toFixed(1)}%` : '—'}</div></div>
        <div className="s"><div className="l">Equity ×</div><div className="v">{p.equityMultiple ? `${p.equityMultiple.toFixed(2)}x` : '—'}</div></div>
      </div>

      <div className="divlabel">Capital position</div>
      <div className="flex between" style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 6 }}>
        <span>Deployed · raised · required</span>
        <span style={{ fontFamily: 'var(--mono)' }}>{fmtM(deployed)} · <b style={{ color: 'var(--gold)' }}>{fmtM(raised)}</b> · {fmtM(p.capitalRequired)}</span>
      </div>
      <Bar2 deployed={deployed} raised={raised} required={p.capitalRequired} />

      <div className="divlabel">Raise overrides</div>
      <div className="fgrid">
        <div>
          <label className="flab">Raise target</label>
          <input className="fin mono" value={Math.round(p.capitalRequired)}
            onChange={e => setField('capitalRequired', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="flab">Raise deadline</label>
          <input className="fin" type="date" value={p.raiseDeadline ?? ''} onChange={e => setField('raiseDeadline', e.target.value)} />
        </div>
        <div className="full">
          <label className="flab">Fund structure</label>
          <input className="fin" value={p.fundStructure ?? ''} placeholder="e.g. Unit trust · single-asset"
            onChange={e => setField('fundStructure', e.target.value)} />
        </div>
      </div>

      <div className="divlabel">Next capital call</div>
      {nextCall
        ? <div className="okbox gold">⏱ {new Date(nextCall.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} · {fmtM(nextCall.totalAmount)} — {nextCall.stage}</div>
        : <div className="note">No scheduled call.</div>}

      <div className="divlabel">Investors in this project ({positions.length})</div>
      {positions.length === 0 && <div className="note">Allocations pending.</div>}
      {positions.map(pos => {
        const inv = state.investors.find(i => i.id === pos.investorId)
        return (
          <div key={pos.id} className="sumrow">
            <span className="l">{inv?.companyName ?? 'Unknown'}</span>
            <span className="v" style={{ color: 'var(--gold)' }}>{fmtM(pos.committedAmount)}</span>
          </div>
        )
      })}

      <div className="divlabel">Linked modules</div>
      <div className="grid" style={{ gap: 8 }}>
        {[
          { ic: '▦', label: `Live Feasibility — ${p.name}`, tab: 'summary' },
          { ic: '$', label: 'Finance & Funding Model', tab: 'finance' },
          { ic: '≈', label: 'Cash Flow Forecast', tab: 'cashflow' },
          { ic: '◱', label: 'Project Dashboard', tab: 'insights' },
        ].map(l => (
          <button key={l.label} className="linktile" disabled={!p.feasibilityRef}
            title={p.feasibilityRef ? 'Open in the Feasibility Studio' : 'Not linked to a studio project — run Pull from Feasibility'}
            onClick={() => {
              if (!p.feasibilityRef) return
              store.setActiveProject(p.feasibilityRef)
              store.setActiveTab(l.tab as any)
            }}>
            <span className="ic">{l.ic}</span>{l.label}<span className="ar">↗</span>
          </button>
        ))}
      </div>

      <div className="flex gap mt" style={{ gap: 8 }}>
        <button className="btn" onClick={onPull} disabled={!p.feasibilityRef}>⟳ Pull this project</button>
        <button className="btn ghost" onClick={() => { closeDrawer(); goTab('calls') }}>New capital call</button>
      </div>
    </>
  )
}

// ── 7 · PORTAL ──────────────────────────────────────────────────────────────
//
// This is the INTERNAL preview — Lewis picking an investor and seeing exactly
// what that investor would see. It reads the same store as every other tab, so
// it is always true to their real position.
//
// It is not the external portal, and the distinction matters: the external
// route is one where an outside party logs in and the DATABASE has to guarantee
// they see only their own rows. That needs per-user auth + RLS. Previewing it
// from inside the staff app needs neither — Lewis can already see everything.

function PortalTab() {
  const { state } = useCapital()
  const withPositions = state.investors.filter(i => state.positions.some(p => p.investorId === i.id))
  const [sel, setSel] = useState(withPositions[0]?.id ?? '')
  const investor = state.investors.find(i => i.id === sel) ?? withPositions[0]

  if (!investor) {
    return (
      <>
        <div className="pagehead">
          <div>
            <div className="kicker">External · Read-only</div>
            <h1 className="h-sec">Investor Portal</h1>
          </div>
        </div>
        <div className="panel pad"><div className="empty">No investor has a position yet — add one to preview their portal.</div></div>
      </>
    )
  }

  const positions = state.positions.filter(p => p.investorId === investor.id)
  const committed = investorCommitted(state, investor.id)
  const funded = investorFunded(state, investor.id)
  const distributed = state.distAllocations
    .filter(d => d.investorId === investor.id).reduce((a, d) => a + d.amount, 0)
  const pct = committed > 0 ? Math.round((funded / committed) * 100) : 0

  // Their largest position drives the "where your project is" panel.
  const lead = [...positions].sort((a, b) => b.committedAmount - a.committedAmount)[0]
  const leadProject = state.projects.find(p => p.id === lead?.projectId)

  // Phase timeline from the project's real phase, not a fixed list.
  const PHASES = ['Feasibility', 'Permits & Design', 'Land Settlement', 'Construction', 'Completion & Lease-up', 'Stabilise & Return']
  const phaseIdx = leadProject?.phase
    ? Math.max(0, PHASES.findIndex(p => leadProject.phase!.toLowerCase().includes(p.split(' ')[0].toLowerCase())))
    : 0

  const projRaised = leadProject ? projectRaised(state, leadProject.id) : 0
  const projDeployed = leadProject ? projectDeployed(state, leadProject.id) : 0
  const workingPct = projRaised > 0 ? Math.round((projDeployed / projRaised) * 100) : 0

  const prefRate = positions.find(p => p.prefRate)?.prefRate ?? 8
  const projectedMultiple = leadProject?.equityMultiple

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="kicker">External · Read-only</div>
          <h1 className="h-sec">Investor Portal</h1>
          <div className="h-sub">Exactly what this investor sees when they log in — no pipeline, no fees, no other investors, no staff notes.</div>
        </div>
        <div className="flex aic gap wrapf">
          <span className="eyebrow">Preview as</span>
          <select className="fin" style={{ width: 'auto' }} value={investor.id} onChange={e => setSel(e.target.value)}>
            {withPositions.map(i => <option key={i.id} value={i.id}>{i.companyName}</option>)}
          </select>
        </div>
      </div>

      {/* Internal-preview banner — this is staff-side, and says so. */}
      <div className="okbox mb" style={{ color: 'var(--blue)', background: 'rgba(88,120,168,0.10)', borderColor: 'rgba(88,120,168,0.28)' }}>
        ◉ <b>Internal preview.</b> Investors cannot log in yet — the live external portal needs per-user
        authentication so the database, not the screen, guarantees each investor sees only their own rows.
        Everything below is this investor's real position, rendered as they would see it.
      </div>

      <div className="panel pad gold-top mb" style={{ background: 'linear-gradient(160deg,var(--gold-soft),var(--card))' }}>
        <div className="flex between aic wrapf gap">
          <div>
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>Welcome back</div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 500, color: 'var(--ink)', margin: '6px 0 4px' }}>
              {investor.companyName}
            </h2>
            <div className="note">
              Your position across {positions.length} active 7EVEN development{positions.length === 1 ? '' : 's'}
            </div>
            <div className="flex gap mt wrapf" style={{ gap: 8 }}>
              {positions.map(p => {
                const proj = state.projects.find(x => x.id === p.projectId)
                return <span key={p.id} className="tag gold">{proj?.name ?? 'Portfolio'}</span>
              })}
            </div>
          </div>
          <div className="ring" style={{ ['--p' as any]: pct }}>
            <div className="in">
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 22, color: 'var(--gold)' }}>{pct}%</div>
                <div style={{ fontSize: 9, letterSpacing: '.12em', color: 'var(--faint)' }}>CALLED</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="kpis k4 mb">
        <div className="kpi"><div className="lab">Your commitment</div><div className="val">{fmtM(committed)}</div><div className="sub">{fmtM(funded)} called</div></div>
        <div className="kpi accent"><div className="lab">Distributions received</div><div className="val">{fmtM(distributed)}</div><div className="sub">pref + capital return</div></div>
        <div className="kpi g"><div className="lab">Preferred return</div><div className="val">{prefRate}%</div><div className="sub">cumulative hurdle</div></div>
        <div className="kpi"><div className="lab">Projected equity ×</div><div className="val">{projectedMultiple ? `${projectedMultiple.toFixed(2)}x` : '—'}</div><div className="sub">at exit</div></div>
      </div>

      <div className="two">
        <div className="panel pad">
          <div className="divlabel">Where your project is · {leadProject?.name ?? '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 14 }}>
            {leadProject?.assetType} · {leadProject?.address}
          </div>
          {PHASES.map((ph, i) => (
            <div key={ph} className={`tl${i < phaseIdx ? ' done' : i === phaseIdx ? ' now' : ''}`}>
              <div className="node" />
              <div>
                <div className="tt">{ph}</div>
                <div className="td">{i < phaseIdx ? 'Complete' : i === phaseIdx ? 'In progress' : 'Upcoming'}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid">
          <div className="panel pad">
            <div className="divlabel">Where your money is</div>
            <div className="flex between" style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 6 }}>
              <span>Deployed into the project</span>
              <span style={{ fontFamily: 'var(--mono)' }}><b style={{ color: 'var(--gold)' }}>{workingPct}%</b> working</span>
            </div>
            <div className="track" style={{ height: 10 }}>
              <div className="fill" style={{ width: `${workingPct}%`, background: 'var(--gold)' }} />
            </div>
            <div className="note mt">
              {fmtM(funded)} of your {fmtM(committed)} commitment has been called.
              {' '}{fmtM(Math.max(0, committed - funded))} remains uncalled.
            </div>
          </div>

          <div className="panel pad">
            <div className="divlabel">Your positions</div>
            {positions.map(p => {
              const proj = state.projects.find(x => x.id === p.projectId)
              return (
                <div key={p.id} className="sumrow">
                  <span className="l">{proj?.name ?? 'Portfolio'}</span>
                  <span className="v" style={{ color: 'var(--gold)' }}>{fmtM(p.committedAmount)}</span>
                </div>
              )
            })}
            <div className="divlabel">Documents &amp; statements</div>
            <div className="note">
              No statements issued yet. They appear here once a distribution is run and statements are generated.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
