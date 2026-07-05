import React, { useEffect, useMemo, useState } from 'react'
import { saveKV } from '../../lib/cloudStore'
import { useStore } from '../../store'
import { FY27_SEED, FY27_MONTHS, CompanyBudget } from './fy27BudgetSeed'

// ── Budgets / Administration — Xero-centred admin tool for the group ─────────
// Three companies, each carrying the FY27 budget from the group finance
// workbook. Data shapes mirror the Xero Accounting API (invoices, bills,
// budgets, tracking categories) so the live Xero feed can replace the local
// capture layer without changing any screen. Project-tagged costs flow both
// ways between here and the feasibility projects.

export type CompanyId = '7even' | 'haavn' | 'haavn-mgmt'

const COMPANIES: { id: CompanyId; name: string; color: string }[] = [
  { id: '7even', name: '7EVEN', color: '#C4973A' },
  { id: 'haavn', name: 'HAAVN', color: '#E8E8E8' },
  { id: 'haavn-mgmt', name: 'HAAVN MANAGEMENT', color: '#8FA8BF' },
]

const XERO_BLUE = '#13B5EA'

// Xero organisations — the bank/entity a transaction settles through.
const XERO_ORGS = [
  { id: '7even-capital', name: '7even Capital Pty Ltd', short: '7even Capital' },
  { id: '7ep-preston', name: '7even Enterprise (Preston) Pty Ltd', short: '7EP · Preston' },
  { id: '7ec-caloundra', name: '7even Enterprise (Caloundra) Pty Ltd', short: '7EC · Caloundra' },
] as const

const TXN_CATEGORIES = [
  'Revenue', 'Cost of Sales', 'Wages & Salaries', 'Superannuation', 'Rent & Outgoings',
  'Insurance', 'Motor Vehicles', 'IT & Software', 'Subscriptions & Services', 'Marketing & BD',
  'Entertainment', 'Accounting & Legal', 'Telephone & Internet', 'Office & General',
  'Bank & Finance', 'Travel', 'Other',
]

interface Txn {
  id: string
  company: CompanyId
  type: 'invoice' | 'bill'
  contact: string
  desc: string
  category: string
  amount: number                 // ex GST
  date: string
  status: 'awaiting' | 'paid'
  projectId?: string             // link to a feasibility project
  xeroOrg?: string               // XERO_ORGS id
}

interface AdminData {
  budgets: Record<CompanyId, CompanyBudget>
  txns: Txn[]
}

const STORE_KEY = 'capital_admin_v2'
const LEGACY_KEY = 'capital_admin_v1'

function seedBudgets(): Record<CompanyId, CompanyBudget> {
  return JSON.parse(JSON.stringify({
    '7even': FY27_SEED['7even'],
    'haavn': FY27_SEED['haavn'],
    'haavn-mgmt': FY27_SEED['haavn-mgmt'],
  }))
}

function loadData(): AdminData {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* fall through */ }
  // migrate any v1 transactions into the new shape
  let txns: Txn[] = []
  try {
    const old = localStorage.getItem(LEGACY_KEY)
    if (old) txns = (JSON.parse(old).txns || []).filter((t: Txn) => t.company === '7even' || t.company === 'haavn')
  } catch { /* ignore */ }
  return { budgets: seedBudgets(), txns }
}

function saveData(d: AdminData) { saveKV(STORE_KEY, d) }

const fmt$ = (n: number) =>
  n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
const uid = () => Math.random().toString(36).slice(2, 10)

const sumMonths = (m: number[]) => m.reduce((s, v) => s + v, 0)

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 8, color: '#fff', fontSize: 12, padding: '8px 10px', outline: 'none', width: '100%',
}
const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.45)', fontSize: 8, letterSpacing: '0.22em',
  textTransform: 'uppercase', display: 'block', marginBottom: 5,
}
const panel: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16,
  background: 'linear-gradient(to bottom, rgba(255,255,255,0.04), rgba(0,0,0,0.25))',
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 14px 36px rgba(0,0,0,0.35)',
  padding: '22px 24px',
}
const panelTitle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.55)', fontSize: 9, letterSpacing: '0.28em',
  textTransform: 'uppercase', marginBottom: 16, fontWeight: 700,
}

type View = 'overview' | 'budget' | 'transactions' | 'projects'

type XeroState =
  | { kind: 'unconfigured' }
  | { kind: 'disconnected' }
  | { kind: 'connected'; tenants: { id: string; name: string }[] }

/** Live Xero connection chip. Talks to the serverless OAuth endpoints; falls
 *  back to "ready to connect" when the backend isn't configured yet. */
function XeroChip() {
  const [state, setState] = useState<XeroState>({ kind: 'unconfigured' })

  useEffect(() => {
    fetch('/api/xero/status')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(s => {
        if (s.connected) setState({ kind: 'connected', tenants: s.tenants || [] })
        else if (s.configured) setState({ kind: 'disconnected' })
        else setState({ kind: 'unconfigured' })
      })
      .catch(() => setState({ kind: 'unconfigured' }))
  }, [])

  const label = state.kind === 'connected'
    ? `Connected · ${state.tenants.length} org${state.tenants.length !== 1 ? 's' : ''}`
    : state.kind === 'disconnected' ? 'Connect to Xero' : 'Push / pull · ready to connect'
  const clickable = state.kind === 'disconnected'

  return (
    <button
      onClick={() => { if (clickable) window.location.href = '/api/xero/connect' }}
      title={state.kind === 'connected' ? state.tenants.map(t => t.name).join(' · ') : undefined}
      style={{
        marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10,
        border: `1px solid ${XERO_BLUE}${state.kind === 'connected' ? '88' : '44'}`, borderRadius: 12, padding: '7px 14px',
        background: `${XERO_BLUE}0D`, cursor: clickable ? 'pointer' : 'default',
      }}>
      <img src="/xero-logo.png" alt="Xero" draggable={false} style={{ width: 42, height: 'auto' }} />
      <span className="xero-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: state.kind === 'connected' ? '#3DAA6A' : XERO_BLUE }} />
      <span style={{ color: XERO_BLUE, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700 }}>
        {label}
      </span>
    </button>
  )
}

export default function BudgetsAdmin() {
  const { projects } = useStore()
  const [company, setCompany] = useState<CompanyId>('7even')
  const [view, setView] = useState<View>('overview')
  const [data, setData] = useState<AdminData>(loadData)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [showAdd, setShowAdd] = useState(false)

  // Add-transaction form
  const [fType, setFType] = useState<'invoice' | 'bill'>('bill')
  const [fContact, setFContact] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fCategory, setFCategory] = useState('Subscriptions & Services')
  const [fAmount, setFAmount] = useState('')
  const [fDate, setFDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [fProject, setFProject] = useState('')
  const [fOrg, setFOrg] = useState<string>('7even-capital')

  const co = COMPANIES.find(c => c.id === company)!
  const budget = data.budgets[company]
  const txns = useMemo(() => data.txns.filter(t => t.company === company), [data, company])

  function update(next: AdminData) { setData(next); saveData(next) }

  // ── Budget maths ────────────────────────────────────────────────────────
  const sectionFY = (name: string) => {
    const s = budget.sections.find(x => x.name === name)
    return s ? s.groups.reduce((t, g) => t + g.lines.reduce((u, l) => u + sumMonths(l.months), 0), 0) : 0
  }
  const sectionMonthly = (name: string): number[] => {
    const out = new Array(12).fill(0)
    const s = budget.sections.find(x => x.name === name)
    s?.groups.forEach(g => g.lines.forEach(l => l.months.forEach((v, i) => { out[i] += v })))
    return out
  }
  const revFY = sectionFY('Revenue')
  const cogsFY = sectionFY('Cost of Sales')
  const opexFY = sectionFY('Operating Expenses')
  const ebitdaFY = revFY - cogsFY - opexFY
  const ebitdaMonthly = useMemo(() => {
    const r = sectionMonthly('Revenue'), c = sectionMonthly('Cost of Sales'), o = sectionMonthly('Operating Expenses')
    return r.map((v, i) => v - c[i] - o[i])
  }, [budget])

  function setMonth(sIdx: number, gIdx: number, lIdx: number, mIdx: number, value: number) {
    const next: AdminData = JSON.parse(JSON.stringify(data))
    next.budgets[company].sections[sIdx].groups[gIdx].lines[lIdx].months[mIdx] = value
    update(next)
  }
  function setLineLabel(sIdx: number, gIdx: number, lIdx: number, label: string) {
    const next: AdminData = JSON.parse(JSON.stringify(data))
    next.budgets[company].sections[sIdx].groups[gIdx].lines[lIdx].label = label
    update(next)
  }
  function addLine(sIdx: number, gIdx: number) {
    const next: AdminData = JSON.parse(JSON.stringify(data))
    next.budgets[company].sections[sIdx].groups[gIdx].lines.push({ label: 'New line', months: new Array(12).fill(0) })
    update(next)
  }
  function removeLine(sIdx: number, gIdx: number, lIdx: number) {
    const next: AdminData = JSON.parse(JSON.stringify(data))
    next.budgets[company].sections[sIdx].groups[gIdx].lines.splice(lIdx, 1)
    update(next)
  }

  // ── Transactions ────────────────────────────────────────────────────────
  const revenueActual = txns.filter(t => t.type === 'invoice').reduce((s, t) => s + t.amount, 0)
  const costsActual = txns.filter(t => t.type === 'bill').reduce((s, t) => s + t.amount, 0)
  const awaitingIn = txns.filter(t => t.type === 'invoice' && t.status === 'awaiting').reduce((s, t) => s + t.amount, 0)
  const awaitingOut = txns.filter(t => t.type === 'bill' && t.status === 'awaiting').reduce((s, t) => s + t.amount, 0)

  const projectSpend = useMemo(() => {
    const map = new Map<string, number>()
    data.txns.filter(t => t.type === 'bill' && t.projectId).forEach(t => {
      map.set(t.projectId!, (map.get(t.projectId!) || 0) + t.amount)
    })
    return map
  }, [data])

  function addTxn() {
    const amount = parseFloat(fAmount)
    if (!fContact.trim() || !amount || amount <= 0) return
    const txn: Txn = {
      id: uid(), company, type: fType, contact: fContact.trim(), desc: fDesc.trim(),
      category: fType === 'invoice' ? 'Revenue' : fCategory, amount,
      date: fDate, status: 'awaiting', projectId: fProject || undefined, xeroOrg: fOrg,
    }
    update({ ...data, txns: [txn, ...data.txns] })
    setFContact(''); setFDesc(''); setFAmount(''); setFProject(''); setShowAdd(false)
  }
  function setStatus(id: string, status: Txn['status']) {
    update({ ...data, txns: data.txns.map(t => t.id === id ? { ...t, status } : t) })
  }
  function removeTxn(id: string) {
    update({ ...data, txns: data.txns.filter(t => t.id !== id) })
  }

  const viewTab = (v: View, label: string) => (
    <button key={v} onClick={() => setView(v)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '10px 2px',
        color: view === v ? co.color : 'rgba(255,255,255,0.40)',
        borderBottom: `2px solid ${view === v ? co.color : 'transparent'}`,
        fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 700,
        transition: 'all 0.2s',
      }}>
      {label}
    </button>
  )

  return (
    <div style={{ width: '100%', maxWidth: 1240, margin: '0 auto', padding: '26px 24px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Company switch + Xero status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {COMPANIES.map(c => (
          <button key={c.id} onClick={() => setCompany(c.id)} className="glass-btn"
            style={{
              padding: '9px 20px', fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 700,
              color: company === c.id ? c.color : 'rgba(255,255,255,0.45)',
              borderColor: company === c.id ? `${c.color}88` : undefined,
              boxShadow: company === c.id ? `inset 0 1px 0 rgba(255,255,255,0.25), 0 0 22px ${c.color}22` : undefined,
            }}>
            {c.name}
          </button>
        ))}
        <XeroChip />
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 26, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {viewTab('overview', 'Overview')}
        {viewTab('budget', 'FY27 Budget')}
        {viewTab('transactions', 'Invoices & Bills')}
        {viewTab('projects', 'Project Spend')}
      </div>

      {/* ── OVERVIEW ── */}
      {view === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
            {[
              { label: 'FY27 Budget Revenue', value: fmt$(revFY), color: XERO_BLUE },
              { label: 'FY27 Budget Costs', value: fmt$(cogsFY + opexFY), color: '#E8E8E8' },
              { label: 'FY27 Budget EBITDA', value: fmt$(ebitdaFY), color: ebitdaFY >= 0 ? '#3DAA6A' : '#E0808C' },
              { label: 'Actual Revenue', value: fmt$(revenueActual), color: XERO_BLUE },
              { label: 'Actual Costs', value: fmt$(costsActual), color: '#E8E8E8' },
              { label: 'Awaiting In / Out', value: `${fmt$(awaitingIn)} / ${fmt$(awaitingOut)}`, color: co.color },
            ].map(k => (
              <div key={k.label} style={{ ...panel, padding: '16px 18px' }}>
                <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 7.5, letterSpacing: '0.22em', textTransform: 'uppercase', margin: '0 0 8px' }}>{k.label}</p>
                <p style={{ color: k.color, fontSize: 17, fontWeight: 600, margin: 0, fontFamily: 'var(--font-mono)' }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Monthly EBITDA strip */}
          <div style={panel}>
            <p style={panelTitle}>{co.name} · Monthly EBITDA — FY27 Budget</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
              {ebitdaMonthly.map((v, i) => {
                const max = Math.max(...ebitdaMonthly.map(Math.abs), 1)
                const h = Math.max(3, Math.abs(v) / max * 92)
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }} title={`${FY27_MONTHS[i]}: ${fmt$(v)}`}>
                    <div style={{
                      width: '100%', maxWidth: 44, height: h, borderRadius: 4,
                      background: v >= 0
                        ? `linear-gradient(to top, ${co.color}44, ${co.color})`
                        : 'linear-gradient(to top, #E0808C, #E0808C66)',
                    }} />
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 7.5, letterSpacing: '0.08em' }}>{FY27_MONTHS[i].slice(0, 3)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── FY27 BUDGET GRID ── */}
      {view === 'budget' && (
        <div style={{ ...panel, padding: '22px 0 10px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, padding: '0 24px' }}>
            <p style={panelTitle}>{co.name} · FY27 Budget — Jul-26 to Jun-27 (AUD ex-GST)</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginLeft: 'auto' }}>
              Gross Profit {fmt$(revFY - cogsFY)} · EBITDA <span style={{ color: ebitdaFY >= 0 ? '#6FD39A' : '#E0808C' }}>{fmt$(ebitdaFY)}</span>
            </p>
          </div>
          <div style={{ overflowX: 'auto', padding: '0 12px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1180 }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, background: '#0B0B0B', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '8px 12px', minWidth: 210, zIndex: 2 }}>Line Item</th>
                  {FY27_MONTHS.map(m => (
                    <th key={m} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, letterSpacing: '0.1em', padding: '8px 6px', textAlign: 'right', minWidth: 66 }}>{m}</th>
                  ))}
                  <th style={{ color: 'rgba(255,255,255,0.55)', fontSize: 8, letterSpacing: '0.14em', padding: '8px 10px', textAlign: 'right', minWidth: 84 }}>FY27</th>
                  <th style={{ width: 26 }} />
                </tr>
              </thead>
              <tbody>
                {budget.sections.map((s, sIdx) => {
                  const sTotal = s.groups.reduce((t, g) => t + g.lines.reduce((u, l) => u + sumMonths(l.months), 0), 0)
                  const sMonthly = new Array(12).fill(0)
                  s.groups.forEach(g => g.lines.forEach(l => l.months.forEach((v, i) => { sMonthly[i] += v })))
                  return (
                    <React.Fragment key={s.name}>
                      {/* Section row */}
                      <tr>
                        <td style={{ position: 'sticky', left: 0, background: '#0B0B0B', color: co.color, fontSize: 9.5, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 700, padding: '14px 12px 6px', zIndex: 2 }}>{s.name}</td>
                        {sMonthly.map((v, i) => (
                          <td key={i} style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '14px 6px 6px' }}>{v ? Math.round(v / 1000) + 'k' : ''}</td>
                        ))}
                        <td style={{ color: co.color, fontSize: 10.5, fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '14px 10px 6px', fontWeight: 700 }}>{fmt$(sTotal)}</td>
                        <td />
                      </tr>
                      {s.groups.map((g, gIdx) => {
                        const key = `${company}:${s.name}:${g.name}`
                        const open = !!openGroups[key]
                        const gTotal = g.lines.reduce((t, l) => t + sumMonths(l.months), 0)
                        const gMonthly = new Array(12).fill(0)
                        g.lines.forEach(l => l.months.forEach((v, i) => { gMonthly[i] += v }))
                        const showGroupRow = !(s.groups.length === 1 && g.name === s.name)
                        return (
                          <React.Fragment key={g.name}>
                            {showGroupRow && (
                              <tr onClick={() => setOpenGroups(o => ({ ...o, [key]: !open }))} style={{ cursor: 'pointer' }}>
                                <td style={{ position: 'sticky', left: 0, background: '#0B0B0B', color: 'rgba(255,255,255,0.85)', fontSize: 11, padding: '7px 12px', zIndex: 2 }}>
                                  <span style={{ color: 'rgba(255,255,255,0.4)', marginRight: 8, fontSize: 9 }}>{open ? '▾' : '▸'}</span>{g.name}
                                </td>
                                {gMonthly.map((v, i) => (
                                  <td key={i} style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '7px 6px' }}>{v ? v.toLocaleString() : ''}</td>
                                ))}
                                <td style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10.5, fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '7px 10px' }}>{fmt$(gTotal)}</td>
                                <td />
                              </tr>
                            )}
                            {(open || !showGroupRow) && (
                              <>
                                {g.lines.map((l, lIdx) => (
                                  <tr key={lIdx}>
                                    <td style={{ position: 'sticky', left: 0, background: '#0B0B0B', padding: '2px 12px 2px 30px', zIndex: 2 }}>
                                      <input
                                        key={`${key}:${lIdx}:label`}
                                        defaultValue={l.label}
                                        onBlur={e => e.target.value !== l.label && setLineLabel(sIdx, gIdx, lIdx, e.target.value)}
                                        style={{ background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.65)', fontSize: 11, width: '100%' }}
                                      />
                                    </td>
                                    {l.months.map((v, mIdx) => (
                                      <td key={mIdx} style={{ padding: '2px 2px' }}>
                                        <input
                                          key={`${key}:${lIdx}:${mIdx}:${v}`}
                                          type="number" defaultValue={v || ''}
                                          onBlur={e => { const nv = parseFloat(e.target.value) || 0; if (nv !== v) setMonth(sIdx, gIdx, lIdx, mIdx, nv) }}
                                          style={{
                                            width: 64, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                                            borderRadius: 6, color: 'rgba(255,255,255,0.8)', fontSize: 10, fontFamily: 'var(--font-mono)',
                                            textAlign: 'right', padding: '4px 5px', outline: 'none',
                                          }}
                                        />
                                      </td>
                                    ))}
                                    <td style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '2px 10px' }}>{fmt$(sumMonths(l.months))}</td>
                                    <td style={{ textAlign: 'center' }}>
                                      <button onClick={() => removeLine(sIdx, gIdx, lIdx)} title="Remove line"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>×</button>
                                    </td>
                                  </tr>
                                ))}
                                <tr>
                                  <td colSpan={15} style={{ position: 'sticky', left: 0, padding: '2px 12px 8px 30px' }}>
                                    <button onClick={() => addLine(sIdx, gIdx)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: `${co.color}AA`, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>
                                      + Add line
                                    </button>
                                  </td>
                                </tr>
                              </>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
                {/* EBITDA row */}
                <tr>
                  <td style={{ position: 'sticky', left: 0, background: '#0B0B0B', color: '#fff', fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 700, padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.12)', zIndex: 2 }}>EBITDA</td>
                  {ebitdaMonthly.map((v, i) => (
                    <td key={i} style={{ color: v >= 0 ? '#6FD39A' : '#E0808C', fontSize: 10, fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '16px 6px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>{Math.round(v / 1000)}k</td>
                  ))}
                  <td style={{ color: ebitdaFY >= 0 ? '#6FD39A' : '#E0808C', fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '16px 10px', fontWeight: 700, borderTop: '1px solid rgba(255,255,255,0.12)' }}>{fmt$(ebitdaFY)}</td>
                  <td style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TRANSACTIONS ── */}
      {view === 'transactions' && (
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ ...panelTitle, marginBottom: 0 }}>{co.name} · Invoices &amp; Bills</p>
            <button onClick={() => setShowAdd(s => !s)} className="glass-btn"
              style={{ marginLeft: 'auto', color: XERO_BLUE, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 16px', fontWeight: 700 }}>
              {showAdd ? 'Close' : '+ New Transaction'}
            </button>
          </div>

          {showAdd && (
            <div style={{ border: `1px solid ${XERO_BLUE}33`, borderRadius: 12, padding: 18, marginBottom: 18, background: `${XERO_BLUE}08` }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={fType} onChange={e => setFType(e.target.value as 'invoice' | 'bill')} style={inputStyle}>
                    <option value="bill">Bill (money out)</option>
                    <option value="invoice">Invoice (money in)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Xero Entity / Bank</label>
                  <select value={fOrg} onChange={e => setFOrg(e.target.value)} style={inputStyle}>
                    {XERO_ORGS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Contact</label>
                  <input value={fContact} onChange={e => setFContact(e.target.value)} placeholder="Supplier / client" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="What for" style={inputStyle} />
                </div>
                {fType === 'bill' && (
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select value={fCategory} onChange={e => setFCategory(e.target.value)} style={inputStyle}>
                      {TXN_CATEGORIES.filter(c => c !== 'Revenue').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Amount ex GST</label>
                  <input type="number" value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="0.00" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={inputStyle} />
                </div>
                {fType === 'bill' && (
                  <div>
                    <label style={labelStyle}>Project (optional)</label>
                    <select value={fProject} onChange={e => setFProject(e.target.value)} style={inputStyle}>
                      <option value="">— Business overhead —</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {fAmount && parseFloat(fAmount) > 0 && (
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, margin: '12px 0 0', fontFamily: 'var(--font-mono)' }}>
                  GST 10%: {fmt$(parseFloat(fAmount) * 0.1)} · Total inc GST: {fmt$(parseFloat(fAmount) * 1.1)}
                </p>
              )}
              <button onClick={addTxn} className="glass-btn"
                style={{ marginTop: 14, color: XERO_BLUE, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', padding: '9px 22px', fontWeight: 700 }}>
                Add {fType === 'bill' ? 'Bill' : 'Invoice'}
              </button>
            </div>
          )}

          {txns.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '6px 0' }}>
              No transactions yet — add the first, or connect Xero to pull them in automatically.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {txns.map(t => {
                const proj = t.projectId ? projects.find(p => p.id === t.projectId) : undefined
                const org = XERO_ORGS.find(o => o.id === t.xeroOrg)
                return (
                  <div key={t.id} style={{
                    display: 'grid', gridTemplateColumns: '10px minmax(100px,1fr) minmax(120px,1.7fr) minmax(86px,0.9fr) 104px 92px 86px 22px',
                    gap: 10, alignItems: 'center', padding: '10px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.type === 'invoice' ? XERO_BLUE : '#C4973A' }} />
                    <span style={{ color: '#fff', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.contact}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.desc || t.category}{proj ? ` · ${proj.name}` : ''}
                    </span>
                    <span style={{ color: `${XERO_BLUE}CC`, fontSize: 9, letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org?.short || '—'}</span>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{fmt$(t.amount)}</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>{t.date}</span>
                    <button onClick={() => setStatus(t.id, t.status === 'paid' ? 'awaiting' : 'paid')}
                      style={{
                        background: 'none', cursor: 'pointer', borderRadius: 8, padding: '4px 8px',
                        border: `1px solid ${t.status === 'paid' ? '#3DAA6A55' : 'rgba(255,255,255,0.18)'}`,
                        color: t.status === 'paid' ? '#6FD39A' : 'rgba(255,255,255,0.5)',
                        fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
                      }}>
                      {t.status}
                    </button>
                    <button onClick={() => removeTxn(t.id)} title="Delete"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>×</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PROJECT SPEND ── */}
      {view === 'projects' && (
        <div style={panel}>
          <p style={panelTitle}>Project Spend — pushed &amp; pulled with the feasibility studio</p>
          {projectSpend.size === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '6px 0' }}>
              Tag bills to a project and live spend totals appear here and against each project.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {[...projectSpend.entries()].map(([pid, spend]) => {
                const proj = projects.find(p => p.id === pid)
                if (!proj) return null
                return (
                  <div key={pid} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', background: 'rgba(255,255,255,0.02)' }}>
                    <p style={{ color: '#fff', fontSize: 12, fontWeight: 600, margin: '0 0 6px' }}>{proj.name}</p>
                    <p style={{ color: XERO_BLUE, fontSize: 16, fontFamily: 'var(--font-mono)', margin: 0 }}>{fmt$(spend)}</p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', margin: '6px 0 0' }}>Live spend to date</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
