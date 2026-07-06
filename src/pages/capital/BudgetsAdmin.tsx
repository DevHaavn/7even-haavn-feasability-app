import React, { useEffect, useMemo, useState } from 'react'
import { saveKV } from '../../lib/cloudStore'
import { useStore } from '../../store'
import {
  CFO_SEED, CFO_MONTHS, CFO_YEARS,
  type Entity, type BudgetLine, type Section,
  calcEntity, calcGroup, seriesFor, feeEarners,
} from './cfoBudgetSeed'

// ── Budgets / Administration ─────────────────────────────────────────────────
// Group FY27 budget rebuilt from the CFO app (Daniel Sette): four entities, a
// Fathom-style monthly model with trading/financing/pipeline splits, and the
// consolidated + per-entity dashboards. The invoices/bills register keeps the
// live Xero feed and the 7ED sales cross-link. Dark theme to match the app.

export type CompanyId = string

const ENTITY_COLOR: Record<string, string> = {
  sev: '#C4973A',       // 7even — gold
  hm: '#8FA8BF',        // Haavn Management — steel blue
  hprec: '#B48CD9',     // Haavn Precision — violet
  htec: '#5C6B7A',      // Haavn Technologies — slate (dormant)
  group: '#E8E8E8',
}

const XERO_BLUE = '#13B5EA'
const POS = '#6FD39A'
const NEG = '#E0808C'
const OPEXC = '#B8935A'

const XERO_ORGS = [
  { id: '7even-capital', name: '7even Capital Pty Ltd', short: '7even Capital' },
  { id: '7ep-preston', name: '7even Enterprise (Preston) Pty Ltd', short: '7EP · Preston' },
  { id: '7ec-caloundra', name: '7even Enterprise (Caloundra) Pty Ltd', short: '7EC · Caloundra' },
] as const

const TXN_CATEGORIES = [
  'Revenue', 'Cost of Sales', 'Wages & salaries', 'Superannuation', 'Rent & outgoings',
  'Insurance', 'Motor vehicles', 'IT & software', 'Subscriptions', 'Marketing & BD',
  'Entertainment', 'Accounting & legal', 'Phone & internet', 'Office & general',
  'Bank & finance', 'Travel', 'Other',
]

interface Txn {
  id: string
  company: CompanyId
  type: 'invoice' | 'bill'
  contact: string
  desc: string
  category: string
  amount: number
  date: string
  status: 'awaiting' | 'paid'
  projectId?: string
  xeroOrg?: string
  sourceId?: string
}

interface AdminData {
  entities: Entity[]
  txns: Txn[]
}

const STORE_KEY = 'capital_admin_v3'
const LEGACY_KEY = 'capital_admin_v2'

// ── Budget entity ↔ feasibility project links ────────────────────────────────
// Ties a revenue group in the budget to a live project in the feasibility
// studio, so fees, cost budgets and actual spend flow between them.
export interface ProjectLink { group: string; projectId: string; label: string }
export const PROJECT_LINKS: Record<string, ProjectLink[]> = {
  sev: [
    { group: 'Preston', projectId: 'seed-preston-001', label: 'St Village Preston' },
    { group: 'Caloundra', projectId: 'seed-caloundra-001', label: '5IVE Hotels Caloundra' },
    { group: 'Waurn Ponds', projectId: 'seed-geelong-001', label: 'Waurnvale Drive Geelong' },
  ],
}
export function projectLinkFor(projectId: string): ProjectLink | undefined {
  for (const links of Object.values(PROJECT_LINKS)) { const l = links.find(x => x.projectId === projectId); if (l) return l }
  return undefined
}

function seedEntities(): Entity[] {
  return JSON.parse(JSON.stringify(CFO_SEED))
}

function loadData(): AdminData {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const d = JSON.parse(raw)
      if (d.entities && Array.isArray(d.entities)) return d
    }
  } catch { /* fall through */ }
  // migrate transactions from the previous shape
  let txns: Txn[] = []
  try {
    const old = localStorage.getItem(LEGACY_KEY)
    if (old) txns = JSON.parse(old).txns || []
  } catch { /* ignore */ }
  return { entities: seedEntities(), txns }
}

function saveData(d: AdminData) { saveKV(STORE_KEY, d) }

// ── Cross-link: a settled 7EVEN sale posts here as revenue ───────────────────
export function hasSaleRevenue(saleId: string): boolean {
  return loadData().txns.some(t => t.sourceId === `sale:${saleId}`)
}
export function postSaleRevenue(sale: { id: string; buyer: string; project: string; unit: string; price: number }): boolean {
  const d = loadData()
  const sourceId = `sale:${sale.id}`
  if (d.txns.some(t => t.sourceId === sourceId)) return false
  const txn: Txn = {
    id: uid(), company: 'sev', type: 'invoice', contact: sale.buyer || 'Buyer',
    desc: `${sale.project} · ${sale.unit} — settlement`, category: 'Revenue',
    amount: sale.price, date: new Date().toISOString().slice(0, 10), status: 'awaiting', sourceId,
  }
  saveData({ ...d, txns: [txn, ...d.txns] })
  return true
}

// Live actual spend the admin team has tracked against a project (tagged bills).
// Read by the project Cost Stack tab so PMs see admin/Xero spend against budget.
export function getProjectAdminSpend(projectId: string): { spend: number; awaiting: number; count: number } {
  const txns = loadData().txns.filter(t => t.type === 'bill' && t.projectId === projectId)
  return {
    spend: txns.reduce((s, t) => s + t.amount, 0),
    awaiting: txns.filter(t => t.status === 'awaiting').reduce((s, t) => s + t.amount, 0),
    count: txns.length,
  }
}

const uid = () => Math.random().toString(36).slice(2, 10)
const fmt$ = (n: number) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString()
const fmtk = (n: number) => { const x = n / 1000; return (x < 0 ? '-$' : '$') + Math.abs(Math.round(x)).toLocaleString() + 'k' }
const comma = (n: number) => Math.round(n).toLocaleString()

// ── shared styles ────────────────────────────────────────────────────────────
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
const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.45)', fontSize: 8, letterSpacing: '0.22em',
  textTransform: 'uppercase', display: 'block', marginBottom: 5,
}
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 8, color: '#fff', fontSize: 12, padding: '8px 10px', outline: 'none', width: '100%',
}

// ── sparkline ────────────────────────────────────────────────────────────────
function Spark({ arr, color }: { arr: number[]; color: string }) {
  const w = 150, h = 30, pad = 3
  const mn = Math.min(...arr, 0), mx = Math.max(...arr, 0), rg = (mx - mn) || 1
  const x = (i: number) => pad + i * (w - 2 * pad) / (arr.length - 1)
  const y = (v: number) => h - pad - (v - mn) / rg * (h - 2 * pad)
  const pts = arr.map((v, i) => `${x(i)},${y(v).toFixed(1)}`)
  const zero = y(0).toFixed(1)
  const area = `M${x(0)},${zero} L${pts.join(' L')} L${x(arr.length - 1)},${zero} Z`
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ marginTop: 8 }}>
      <path d={area} fill={color} opacity={0.12} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

type XeroState = { kind: 'unconfigured' } | { kind: 'disconnected' } | { kind: 'connected'; tenants: { id: string; name: string }[] }
function XeroChip() {
  const [state, setState] = useState<XeroState>({ kind: 'unconfigured' })
  useEffect(() => {
    fetch('/api/xero/status').then(r => (r.ok ? r.json() : Promise.reject())).then(s => {
      if (s.connected) setState({ kind: 'connected', tenants: s.tenants || [] })
      else if (s.configured) setState({ kind: 'disconnected' })
      else setState({ kind: 'unconfigured' })
    }).catch(() => setState({ kind: 'unconfigured' }))
  }, [])
  const label = state.kind === 'connected'
    ? `Connected · ${state.tenants.length} org${state.tenants.length !== 1 ? 's' : ''}`
    : state.kind === 'disconnected' ? 'Connect to Xero' : 'Push / pull · ready to connect'
  const clickable = state.kind === 'disconnected'
  return (
    <button onClick={() => { if (clickable) window.location.href = '/api/xero/connect' }}
      title={state.kind === 'connected' ? state.tenants.map(t => t.name).join(' · ') : undefined}
      style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10,
        border: `1px solid ${XERO_BLUE}${state.kind === 'connected' ? '88' : '44'}`, borderRadius: 12, padding: '7px 14px',
        background: `${XERO_BLUE}0D`, cursor: clickable ? 'pointer' : 'default' }}>
      <img src="/xero-logo.png" alt="Xero" draggable={false} style={{ width: 42, height: 'auto' }} />
      <span className="xero-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: state.kind === 'connected' ? '#3DAA6A' : XERO_BLUE }} />
      <span style={{ color: XERO_BLUE, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700 }}>{label}</span>
    </button>
  )
}

type View = 'dashboard' | 'entry' | 'transactions' | 'projects' | 'tracking'

export default function BudgetsAdmin() {
  const { projects, getDetailedCostStack } = useStore()
  const [hadStored] = useState(() => !!localStorage.getItem(STORE_KEY))
  const [data, setData] = useState<AdminData>(loadData)
  const [sel, setSel] = useState<string>('group')        // 'group' or entity id
  const [view, setView] = useState<View>('dashboard')
  const [through, setThrough] = useState(11)

  // transaction form
  const [showAdd, setShowAdd] = useState(false)
  const [fType, setFType] = useState<'invoice' | 'bill'>('bill')
  const [fContact, setFContact] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fCategory, setFCategory] = useState('Subscriptions')
  const [fAmount, setFAmount] = useState('')
  const [fDate, setFDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [fProject, setFProject] = useState('')
  const [fOrg, setFOrg] = useState<string>('7even-capital')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const entities = data.entities
  const isGroup = sel === 'group'
  const entity = entities.find(e => e.id === sel)
  const accent = ENTITY_COLOR[sel] || '#E8E8E8'
  const c = useMemo(() => (isGroup ? calcGroup(entities, through) : entity ? calcEntity(entity, through) : calcGroup(entities, through)), [entities, sel, through])

  function update(next: AdminData) { setData(next); saveData(next) }

  // First-ever open with no shared copy: push the imported baseline so the whole
  // team (and Daniel) start from the same live dataset.
  useEffect(() => { if (!hadStored) saveData(data) }, [])

  // Live: when a teammate saves, the portal refreshes localStorage and fires this
  // event — re-read so open dashboards reflect their edits without a reload.
  useEffect(() => {
    const onRemote = () => setData(loadData())
    window.addEventListener('capital-cloud-updated', onRemote)
    return () => window.removeEventListener('capital-cloud-updated', onRemote)
  }, [])

  // Group can only show the dashboard
  useEffect(() => { if (isGroup && view !== 'dashboard') setView('dashboard') }, [isGroup, view])

  // ── entry-grid mutations ──────────────────────────────────────────────────
  function mutateEntity(entId: string, fn: (e: Entity) => void) {
    const next: AdminData = JSON.parse(JSON.stringify(data))
    const e = next.entities.find(x => x.id === entId)
    if (e) { fn(e); update(next) }
  }
  const setCell = (lineId: string, mi: number, v: number) => mutateEntity(sel, e => { const l = e.lines.find(x => x.id === lineId); if (l) l.m[mi] = v })
  const setName = (lineId: string, name: string) => mutateEntity(sel, e => { const l = e.lines.find(x => x.id === lineId); if (l) l.name = name })
  const delLine = (lineId: string) => mutateEntity(sel, e => { e.lines = e.lines.filter(l => l.id !== lineId) })
  const addLine = (s: Section) => mutateEntity(sel, e => { e.lines.push({ id: uid(), name: 'New line', s, m: new Array(12).fill(0) }) })
  const toCommitted = (lineId: string) => mutateEntity(sel, e => { const l = e.lines.find(x => x.id === lineId); if (l) { delete l.pipeline; if (!l.grp) l.grp = 'Committed' } })
  const toPipeline = (lineId: string) => mutateEntity(sel, e => { const l = e.lines.find(x => x.id === lineId); if (l) l.pipeline = true })

  // ── transactions ──────────────────────────────────────────────────────────
  const txns = useMemo(() => data.txns.filter(t => t.company === sel), [data, sel])
  const projectSpend = useMemo(() => {
    const map = new Map<string, number>()
    data.txns.filter(t => t.type === 'bill' && t.projectId).forEach(t => map.set(t.projectId!, (map.get(t.projectId!) || 0) + t.amount))
    return map
  }, [data])

  async function syncFromXero() {
    setSyncing(true); setSyncMsg('')
    try {
      const res = await fetch('/api/xero/invoices'); const body = await res.json()
      if (!body.connected) { setSyncMsg(body.reason === 'not_connected' ? 'Not connected — click "Connect to Xero" above first.' : 'Xero is not configured yet.'); return }
      const existing = new Set(data.txns.map(t => t.sourceId).filter(Boolean))
      const fresh: Txn[] = (body.invoices as Array<Record<string, unknown>>).filter(inv => !existing.has(inv.sourceId as string)).map(inv => ({
        id: uid(), company: sel === 'group' ? 'sev' : sel, type: inv.type as 'invoice' | 'bill', contact: inv.contact as string, desc: inv.desc as string,
        category: inv.type === 'invoice' ? 'Revenue' : 'Other', amount: inv.amount as number, date: (inv.date as string) || new Date().toISOString().slice(0, 10),
        status: inv.status as 'awaiting' | 'paid', sourceId: inv.sourceId as string,
      }))
      if (fresh.length === 0) { setSyncMsg('Up to date — no new Xero invoices or bills.'); return }
      update({ ...data, txns: [...fresh, ...data.txns] })
      setSyncMsg(`Pulled ${fresh.length} new item${fresh.length !== 1 ? 's' : ''} from Xero.`)
    } catch { setSyncMsg('Could not reach Xero — try again in a moment.') } finally { setSyncing(false) }
  }
  function addTxn() {
    const amount = parseFloat(fAmount)
    if (!fContact.trim() || !amount || amount <= 0) return
    const txn: Txn = { id: uid(), company: sel === 'group' ? 'sev' : sel, type: fType, contact: fContact.trim(), desc: fDesc.trim(),
      category: fType === 'invoice' ? 'Revenue' : fCategory, amount, date: fDate, status: 'awaiting', projectId: fProject || undefined, xeroOrg: fOrg }
    update({ ...data, txns: [txn, ...data.txns] })
    setFContact(''); setFDesc(''); setFAmount(''); setFProject(''); setShowAdd(false)
  }

  // ── insights ──────────────────────────────────────────────────────────────
  const insights: [string, string][] = useMemo(() => {
    const out: [string, string][] = []
    if (c.fin > 0) out.push(['warn', `${fmt$(c.fin)} of working-capital injection sits below the line — EBITDA is trading only; net cash movement after it is ${fmt$(c.netCash)}.`])
    if (c.ebitda < 0) out.push(['warn', `Budgeted EBITDA is ${fmt$(c.ebitda)} on a trading basis${isGroup ? ' across the group' : ''} — the plan runs at a loss before pipeline conversion.`])
    else out.push(['pos', `Budgeted EBITDA is ${fmt$(c.ebitda)} at ${(c.gm * 100).toFixed(0)}% gross margin.`])
    if (c.pipe > 0) out.push(['acc', `Pipeline of ${fmt$(c.pipe)} (not committed) would lift budgeted EBITDA to ${fmt$(c.ebitdaP)} if converted.`])
    const cats = Object.entries(c.opexCat).sort((a, b) => b[1] - a[1])
    if (cats.length && c.opex) out.push(['acc', `Largest cost base: ${cats[0][0]} at ${fmt$(cats[0][1])} (${(cats[0][1] / c.opex * 100).toFixed(0)}% of opex).`])
    if (isGroup) {
      const worst = entities.map(e => [e.name, calcEntity(e, 11).ebitda] as [string, number]).sort((a, b) => a[1] - b[1])[0]
      if (worst && worst[1] < 0) out.push(['warn', `${worst[0]} is the biggest drag at ${fmt$(worst[1])} budgeted EBITDA.`])
    }
    return out.slice(0, 4)
  }, [c, isGroup, entities])
  const dotc: Record<string, string> = { pos: POS, neg: NEG, warn: '#E8B84B', acc: '#8FA8BF' }

  const navBtn = (id: string, label: string) => (
    <button key={id} onClick={() => setSel(id)} className="glass-btn"
      style={{ padding: '8px 16px', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
        color: sel === id ? (ENTITY_COLOR[id] || '#fff') : 'rgba(255,255,255,0.45)',
        borderColor: sel === id ? `${ENTITY_COLOR[id] || '#fff'}88` : undefined }}>
      {label}
    </button>
  )
  const viewTab = (v: View, label: string) => (
    <button key={v} onClick={() => setView(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 2px',
      color: view === v ? accent : 'rgba(255,255,255,0.40)', borderBottom: `2px solid ${view === v ? accent : 'transparent'}`,
      fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 700, transition: 'all 0.2s' }}>{label}</button>
  )

  return (
    <div style={{ width: '100%', maxWidth: 1240, margin: '0 auto', padding: '26px 24px 60px', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* entity nav + Xero */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {navBtn('group', 'Group')}
        {entities.map(e => navBtn(e.id, e.name.replace('Haavn ', 'H. ')))}
        <XeroChip />
      </div>

      {/* project chips — appear for entities linked to feasibility projects (7even Capital) */}
      {!isGroup && PROJECT_LINKS[sel] && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: -6 }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Projects</span>
          {PROJECT_LINKS[sel].map(link => (
            <button key={link.projectId} onClick={() => setView('tracking')}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, color: 'rgba(255,255,255,0.7)', fontSize: 9, letterSpacing: '0.08em', padding: '5px 12px', cursor: 'pointer' }}
              title={`${link.label} — live from the feasibility studio`}>
              {link.group} <span style={{ color: 'rgba(255,255,255,0.35)' }}>· {link.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* header + through selector */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 300, letterSpacing: '0.04em', margin: 0 }}>
            {isGroup ? 'Group — consolidated' : entity?.name}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: '0.06em', margin: '4px 0 0' }}>
            {isGroup ? `${entities.length} entities · FY27 budget · ex-GST · AUD` : entity?.type}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Through</span>
          <select value={through} onChange={e => setThrough(+e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 10px' }}>
            {CFO_MONTHS.map((m, i) => <option key={i} value={i} style={{ background: '#111' }}>{m}-{CFO_YEARS[i]}</option>)}
          </select>
        </div>
      </div>

      {/* view tabs */}
      <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {viewTab('dashboard', 'Dashboard')}
        {!isGroup && PROJECT_LINKS[sel] && viewTab('tracking', 'Project tracking')}
        {!isGroup && viewTab('entry', 'Budget entry')}
        {!isGroup && viewTab('transactions', 'Invoices & Bills')}
        {!isGroup && viewTab('projects', 'Project spend')}
      </div>

      {/* ── DASHBOARD ── */}
      {view === 'dashboard' && (
        <>
          {/* KPI tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
            <Kpi label="Trading revenue" value={fmtk(c.tRev)} meta="FY27 · ex-injections" spark={seriesFor(isGroup ? entities : [entity!], 'rev')} color="#6E9BE6" />
            <Kpi label="EBITDA" value={fmtk(c.ebitda)} meta={c.ebitda >= 0 ? 'trading basis' : 'trading loss'} spark={seriesFor(isGroup ? entities : [entity!], 'ebitda')} color={c.ebitda >= 0 ? POS : NEG} valColor={c.ebitda >= 0 ? POS : NEG} />
            <Kpi label="Operating expenses" value={fmtk(c.opex)} meta="FY27 total" spark={seriesFor(isGroup ? entities : [entity!], 'opex')} color={OPEXC} />
            <Kpi label="Gross margin" value={`${(c.gm * 100).toFixed(1)}%`} meta="monthly trend" spark={seriesFor(isGroup ? entities : [entity!], 'gm')} color={POS} />
            <Kpi label="Financing excluded" value={fmtk(c.fin)} meta="injections / intercompany" bar={c.fin / (c.tRev + c.fin || 1)} barColor={OPEXC} />
            {isGroup
              ? <Kpi label="Entities in profit" value={`${entities.filter(e => calcEntity(e, 11).ebitda > 0).length} / ${entities.length}`} meta="FY27 budget" bar={entities.filter(e => calcEntity(e, 11).ebitda > 0).length / entities.length} barColor={POS} />
              : <Kpi label="EBITDA margin" value={`${(c.tRev ? c.ebitda / c.tRev * 100 : 0).toFixed(1)}%`} meta="trading basis" />}
          </div>

          {/* Insights */}
          <div style={panel}>
            <p style={panelTitle}>Insights</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {insights.map(([cl, t], i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotc[cl], marginTop: 5, flexShrink: 0 }} />
                  <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>{t}</p>
                </div>
              ))}
            </div>
          </div>

          {/* charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            <div style={panel}>
              <p style={panelTitle}>{isGroup ? 'EBITDA by entity' : 'EBITDA by month'} · $000s</p>
              {isGroup
                ? <BarsH items={entities.map(e => ({ label: e.name.replace('Haavn ', 'H. '), v: calcEntity(e, through).ebitda / 1000 }))} />
                : <BarsV labels={CFO_MONTHS as unknown as string[]} values={seriesFor([entity!], 'ebitda').map(v => v / 1000)} />}
            </div>
            <div style={panel}>
              <p style={panelTitle}>Operating expenses — where it goes</p>
              <BarsH items={Object.entries(c.opexCat).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ label: k, v: v / 1000 }))} color={OPEXC} />
            </div>
          </div>

          {/* P&L summary */}
          <div style={panel}>
            <p style={panelTitle}>Profit &amp; loss summary · {CFO_MONTHS[0]}–{CFO_MONTHS[through]} · budget</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <Pl l="Trading revenue" v={c.tRev} />
                <Pl l="Direct costs" v={-c.cogs} />
                <Pl l="Gross profit" v={c.gp} tot />
                <Pl l="Operating expenses" v={-c.opex} />
                <Pl l="EBITDA · trading basis" v={c.ebitda} tot />
                {(c.fin !== 0 || c.ico !== 0 || c.tax !== 0) && <>
                  <PlSec t={`Below the line · financing${c.tax !== 0 ? ' & tax' : ''}`} />
                  {c.fin !== 0 && <Pl l="Working capital injection" v={c.fin} ind />}
                  {c.ico !== 0 && <Pl l="Intercompany loans" v={c.ico} ind />}
                  {c.tax !== 0 && <Pl l="Tax debt repayment" v={c.tax} ind />}
                  <Pl l="Net cash movement · after financing" v={c.netCash} net />
                </>}
                {c.pipe !== 0 && <>
                  <PlSec t="Pipeline — not committed (memo)" col="#8FA8BF" />
                  <Pl l="Total pipeline" v={c.pipe} ind />
                  <Pl l="EBITDA incl. pipeline" v={c.ebitdaP} tot />
                </>}
              </tbody>
            </table>
          </div>

          {/* fee-earner analysis (entity only) */}
          {!isGroup && entity && <FeeEarnerPanel entity={entity} through={through} calc={c} />}
        </>
      )}

      {/* ── PROJECT TRACKING (entity ↔ feasibility projects, live) ── */}
      {view === 'tracking' && entity && PROJECT_LINKS[sel] && (
        <ProjectTracking entity={entity} links={PROJECT_LINKS[sel]} through={through}
          projects={projects} getDetailedCostStack={getDetailedCostStack} adminSpend={getProjectAdminSpend} accent={accent} />
      )}

      {/* ── ENTRY GRID ── */}
      {view === 'entry' && entity && (
        <EntryGrid entity={entity} accent={accent}
          onCell={setCell} onName={setName} onDel={delLine} onAdd={addLine} onCommit={toCommitted} onPipeline={toPipeline} />
      )}

      {/* ── TRANSACTIONS ── */}
      {view === 'transactions' && entity && (
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 10 }}>
            <p style={{ ...panelTitle, marginBottom: 0 }}>{entity.name} · Invoices &amp; Bills</p>
            <button onClick={syncFromXero} disabled={syncing} className="glass-btn"
              style={{ marginLeft: 'auto', color: XERO_BLUE, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 16px', fontWeight: 700, opacity: syncing ? 0.6 : 1 }}>
              {syncing ? 'Syncing…' : '⟲ Sync from Xero'}
            </button>
            <button onClick={() => setShowAdd(s => !s)} className="glass-btn"
              style={{ color: XERO_BLUE, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 16px', fontWeight: 700 }}>
              {showAdd ? 'Close' : '+ New Transaction'}
            </button>
          </div>
          {syncMsg && <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, margin: '-6px 0 12px' }}>{syncMsg}</p>}
          {showAdd && (
            <div style={{ border: `1px solid ${XERO_BLUE}33`, borderRadius: 12, padding: 18, marginBottom: 18, background: `${XERO_BLUE}08` }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <div><label style={labelStyle}>Type</label>
                  <select value={fType} onChange={e => setFType(e.target.value as 'invoice' | 'bill')} style={inputStyle}>
                    <option value="bill">Bill (money out)</option><option value="invoice">Invoice (money in)</option>
                  </select></div>
                <div><label style={labelStyle}>Xero Entity / Bank</label>
                  <select value={fOrg} onChange={e => setFOrg(e.target.value)} style={inputStyle}>{XERO_ORGS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
                <div><label style={labelStyle}>Contact</label><input value={fContact} onChange={e => setFContact(e.target.value)} placeholder="Supplier / client" style={inputStyle} /></div>
                <div><label style={labelStyle}>Description</label><input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="What for" style={inputStyle} /></div>
                {fType === 'bill' && <div><label style={labelStyle}>Category</label>
                  <select value={fCategory} onChange={e => setFCategory(e.target.value)} style={inputStyle}>{TXN_CATEGORIES.filter(x => x !== 'Revenue').map(x => <option key={x} value={x}>{x}</option>)}</select></div>}
                <div><label style={labelStyle}>Amount ex GST</label><input type="number" value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="0.00" style={inputStyle} /></div>
                <div><label style={labelStyle}>Date</label><input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={inputStyle} /></div>
                {fType === 'bill' && <div><label style={labelStyle}>Project (optional)</label>
                  <select value={fProject} onChange={e => setFProject(e.target.value)} style={inputStyle}><option value="">— Business overhead —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>}
              </div>
              <button onClick={addTxn} className="glass-btn" style={{ marginTop: 14, color: XERO_BLUE, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', padding: '9px 22px', fontWeight: 700 }}>
                Add {fType === 'bill' ? 'Bill' : 'Invoice'}
              </button>
            </div>
          )}
          {txns.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>No transactions yet — add the first, or connect Xero to pull them in automatically.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {txns.map(t => {
                const proj = t.projectId ? projects.find(p => p.id === t.projectId) : undefined
                const org = XERO_ORGS.find(o => o.id === t.xeroOrg)
                return (
                  <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '10px minmax(100px,1fr) minmax(120px,1.7fr) minmax(86px,0.9fr) 104px 92px 80px 22px', gap: 10, alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.type === 'invoice' ? XERO_BLUE : '#C4973A' }} />
                    <span style={{ color: '#fff', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.contact}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.sourceId?.startsWith('sale:') && <span style={{ color: '#FF6A45', fontSize: 8, letterSpacing: '0.1em', marginRight: 6 }}>↔ SALES</span>}
                      {t.desc || t.category}{proj ? ` · ${proj.name}` : ''}
                    </span>
                    <span style={{ color: `${XERO_BLUE}CC`, fontSize: 9, letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org?.short || '—'}</span>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{fmt$(t.amount)}</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>{t.date}</span>
                    <button onClick={() => update({ ...data, txns: data.txns.map(x => x.id === t.id ? { ...x, status: x.status === 'paid' ? 'awaiting' : 'paid' } : x) })}
                      style={{ background: 'none', cursor: 'pointer', borderRadius: 8, padding: '4px 8px', border: `1px solid ${t.status === 'paid' ? '#3DAA6A55' : 'rgba(255,255,255,0.18)'}`, color: t.status === 'paid' ? POS : 'rgba(255,255,255,0.5)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>{t.status}</button>
                    <button onClick={() => update({ ...data, txns: data.txns.filter(x => x.id !== t.id) })} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>×</button>
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
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Tag bills to a project and live spend totals appear here and against each project.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {[...projectSpend.entries()].map(([pid, spend]) => {
                const proj = projects.find(p => p.id === pid); if (!proj) return null
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

// ── sub-components ─────────────────────────────────────────────────────────────
function Kpi({ label, value, meta, spark, color, valColor, bar, barColor }: { label: string; value: string; meta: string; spark?: number[]; color?: string; valColor?: string; bar?: number; barColor?: string }) {
  return (
    <div style={{ ...panel, padding: '16px 18px' }}>
      <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 7.5, letterSpacing: '0.22em', textTransform: 'uppercase', margin: '0 0 8px' }}>{label}</p>
      <p style={{ color: valColor || '#fff', fontSize: 20, fontWeight: 600, margin: 0, fontFamily: 'var(--font-mono)' }}>{value}</p>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, margin: '5px 0 0' }}>{meta}</p>
      {spark && color && <Spark arr={spark} color={color} />}
      {bar != null && <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', marginTop: 10, overflow: 'hidden' }}><div style={{ width: `${Math.max(4, Math.min(100, bar * 100))}%`, height: '100%', background: barColor || '#888' }} /></div>}
    </div>
  )
}

function BarsH({ items, color }: { items: { label: string; v: number }[]; color?: string }) {
  const max = Math.max(...items.map(i => Math.abs(i.v)), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '128px 1fr 62px', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
          <div style={{ height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 3, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.abs(it.v) / max * 100}%`, background: it.v < 0 ? NEG : (color || '#6E9BE6'), borderRadius: 3 }} />
          </div>
          <span style={{ color: it.v < 0 ? NEG : 'rgba(255,255,255,0.8)', fontSize: 10.5, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{(it.v < 0 ? '-$' : '$') + Math.abs(Math.round(it.v)) + 'k'}</span>
        </div>
      ))}
    </div>
  )
}

function BarsV({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(...values.map(Math.abs), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 150 }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={`${labels[i]}: ${fmtk(v * 1000)}`}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
            <div style={{ width: '78%', maxWidth: 26, height: `${Math.abs(v) / max * 100}%`, minHeight: 2, borderRadius: 3, background: v < 0 ? NEG : 'linear-gradient(to top, #6E9BE644, #6E9BE6)' }} />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 7.5, marginTop: 5 }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

function Pl({ l, v, tot, ind, net }: { l: string; v: number; tot?: boolean; ind?: boolean; net?: boolean }) {
  return (
    <tr style={{ borderTop: tot ? '1px solid rgba(255,255,255,0.14)' : undefined }}>
      <td style={{ padding: net ? '9px 10px' : '7px 0', paddingLeft: ind ? 26 : net ? 10 : 0, color: net ? '#E8B84B' : tot ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: 12.5, fontWeight: tot || net ? 700 : 400, background: net ? 'rgba(232,184,75,0.08)' : undefined }}>{l}</td>
      <td style={{ padding: net ? '9px 10px' : '7px 0', textAlign: 'right', color: v < 0 ? NEG : tot ? '#fff' : 'rgba(255,255,255,0.85)', fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: tot || net ? 700 : 400, background: net ? 'rgba(232,184,75,0.08)' : undefined }}>{fmt$(v)}</td>
    </tr>
  )
}
function PlSec({ t, col }: { t: string; col?: string }) {
  return <tr><td colSpan={2} style={{ padding: '10px 0 3px', borderTop: '1px solid rgba(255,255,255,0.12)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: col || '#E8B84B', fontWeight: 700 }}>{t}</td></tr>
}

function FeeEarnerPanel({ entity, through, calc }: { entity: Entity; through: number; calc: ReturnType<typeof calcEntity> }) {
  const rows = feeEarners(entity, through)
  if (!rows.length) return null
  const balance = rows.reduce((a, r) => a + Math.max(0, r.targetRev - r.gr), 0)
  return (
    <div style={panel}>
      <p style={panelTitle}>Revenue per fee-earner · target 3× (salary + super)</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {rows.map(r => {
          const col = r.mult >= 3 ? POS : r.mult >= 1.5 ? '#E8B84B' : NEG
          const over = r.gr >= r.targetRev
          return (
            <div key={r.name} style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ color: '#fff', fontSize: 13.5, fontWeight: 600 }}>{r.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600, color: col }}>{r.mult.toFixed(2)}×</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>/ target 3.0×</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 10 }}><div style={{ width: `${Math.max(2, Math.min(100, r.mult / 3 * 100))}%`, height: '100%', background: col }} /></div>
              <table style={{ width: '100%', fontSize: 11.5, color: 'rgba(255,255,255,0.6)', borderCollapse: 'collapse' }}><tbody>
                <tr><td>Gross revenue</td><td style={{ textAlign: 'right', color: '#fff', fontFamily: 'var(--font-mono)' }}>{fmt$(r.gr)}</td></tr>
                <tr><td>Salary + super</td><td style={{ textAlign: 'right', color: '#fff', fontFamily: 'var(--font-mono)' }}>{fmt$(r.cost)}</td></tr>
                <tr><td>{over ? 'Above 3×' : 'Gap to 3×'}</td><td style={{ textAlign: 'right', color: over ? POS : NEG, fontFamily: 'var(--font-mono)' }}>{over ? '+' : ''}{fmt$(Math.abs(r.gr - r.targetRev))}</td></tr>
              </tbody></table>
            </div>
          )
        })}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10.5, lineHeight: 1.6, margin: '14px 0 0' }}>
        Cost base = wage + super. Target: each fee-earner bills 3× their salary + super (the consulting rule of thirds). Green ≥3× · amber 1.5–3× · red &lt;1.5×.
        {balance > 0 && <> If every fee-earner hit 3×, gross revenue would rise by {fmt$(balance)} to {fmt$(calc.tRev + balance)}.</>}
      </p>
    </div>
  )
}

// ── Project tracking — budget ↔ feasibility studio, live ───────────────────────
function ProjectTracking({ entity, links, through, projects, getDetailedCostStack, adminSpend, accent }: {
  entity: Entity; links: ProjectLink[]; through: number
  projects: { id: string; name: string }[]
  getDetailedCostStack: (id: string) => { hardCosts: { amount: number }[]; consultants: { amount: number }[]; statutory: { amount: number }[]; marketing: { amount: number }[] }
  adminSpend: (id: string) => { spend: number; awaiting: number; count: number }
  accent: string
}) {
  const fyThrough = (l: BudgetLine) => l.m.reduce((a, v, i) => a + (i <= through ? +v || 0 : 0), 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...panel, padding: '16px 20px' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11.5, lineHeight: 1.6, margin: 0 }}>
          Live link to the feasibility studio. Each project's <strong>total development cost</strong> is read straight from its cost stack, the <strong>3% DM fee</strong> is recomputed from it, and <strong>actual spend</strong> is every bill tagged to the project. When a cost blows out, it flags here and in the project's cost stack — for both the admin and PM teams.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
        {links.map(link => {
          const proj = projects.find(p => p.id === link.projectId)
          const dcs = getDetailedCostStack(link.projectId)
          const tdc = [...dcs.hardCosts, ...dcs.consultants, ...dcs.statutory, ...dcs.marketing].reduce((s, x) => s + (x.amount || 0), 0)
          const groupLines = entity.lines.filter(l => l.grp === link.group && l.s === 'revenue' && !l.fin && !l.pipeline)
          const budgetedRev = groupLines.reduce((s, l) => s + fyThrough(l), 0)
          const dmLine = groupLines.find(l => /DM fee/i.test(l.name))
          const budgetedDm = dmLine ? dmLine.m.reduce((a, v) => a + (+v || 0), 0) : 0   // full-year budgeted DM fee
          const liveDm = tdc * 0.03                                                       // 3% of live TDC
          const feeDrift = budgetedDm > 0 ? (liveDm - budgetedDm) / budgetedDm : 0
          const { spend, awaiting, count } = adminSpend(link.projectId)
          const spendPct = tdc > 0 ? spend / tdc : 0
          const blowout = tdc > 0 && spend > tdc
          return (
            <div key={link.projectId} style={{ ...panel, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{link.group}</span>
                <span style={{ color: blowout ? NEG : POS, fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>{blowout ? '⚠ Cost blowout' : '● On budget'}</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '0 0 14px' }}>{proj ? proj.name : link.label} · feasibility studio</p>

              <Row label="Total development cost" value={fmt$(tdc)} sub="live from cost stack" />
              <Row label="3% DM fee — live" value={`${fmt$(liveDm)}/yr`} sub={Math.abs(feeDrift) > 0.02 ? `budgeted ${fmt$(budgetedDm)} · ${feeDrift > 0 ? '+' : ''}${(feeDrift * 100).toFixed(0)}%` : 'matches budget'} subColor={Math.abs(feeDrift) > 0.02 ? '#E8B84B' : POS} />
              <Row label="Budgeted fee revenue" value={fmt$(budgetedRev)} sub={`FY · ${entity.name}`} />
              <Row label="Actual spend tracked" value={fmt$(spend)} sub={`${count} bill${count !== 1 ? 's' : ''}${awaiting ? ` · ${fmt$(awaiting)} awaiting` : ''}`} />

              {/* spend vs TDC bar */}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Spend vs TDC</span>
                  <span style={{ color: blowout ? NEG : 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>{(spendPct * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(2, Math.min(100, spendPct * 100))}%`, height: '100%', background: blowout ? NEG : spendPct > 0.85 ? '#E8B84B' : accent }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
function Row({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{label}</span>
      <span style={{ textAlign: 'right' }}>
        <span style={{ color: '#fff', fontSize: 12.5, fontFamily: 'var(--font-mono)' }}>{value}</span>
        {sub && <span style={{ display: 'block', color: subColor || 'rgba(255,255,255,0.35)', fontSize: 8.5, marginTop: 1 }}>{sub}</span>}
      </span>
    </div>
  )
}

// ── Fathom-style entry grid ────────────────────────────────────────────────────
function EntryGrid({ entity, accent, onCell, onName, onDel, onAdd, onCommit, onPipeline }: {
  entity: Entity; accent: string
  onCell: (id: string, mi: number, v: number) => void
  onName: (id: string, name: string) => void
  onDel: (id: string) => void
  onAdd: (s: Section) => void
  onCommit: (id: string) => void
  onPipeline: (id: string) => void
}) {
  const monthly = (pred: (l: BudgetLine) => boolean) => CFO_MONTHS.map((_, mi) => entity.lines.filter(pred).reduce((a, l) => a + (+l.m[mi] || 0), 0))
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
  const revT = monthly(l => l.s === 'revenue' && !l.pipeline && !l.fin)
  const cogT = monthly(l => l.s === 'cogs' && !l.fin)
  const ox = monthly(l => l.s === 'opex')
  const gpT = revT.map((v, i) => v - cogT[i])
  const ebT = gpT.map((v, i) => v - ox[i])
  const revP = monthly(l => l.s === 'revenue' && !!l.pipeline)
  const ebP = ebT.map((v, i) => v + revP[i])
  const finR = monthly(l => l.s === 'revenue' && !!l.fin)
  const icoC = monthly(l => l.s === 'cogs' && !!l.fin && !l.tax)
  const taxC = monthly(l => l.s === 'cogs' && !!l.fin && !!l.tax)
  const netCash = ebT.map((v, i) => v + finR[i] + icoC[i] + taxC[i])
  const hasFin = entity.lines.some(l => l.fin)
  const hasTax = entity.lines.some(l => l.fin && l.tax)
  const hasPipe = entity.lines.some(l => l.s === 'revenue' && l.pipeline)

  const cellStyle: React.CSSProperties = { width: 60, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, color: 'rgba(255,255,255,0.85)', fontSize: 10, fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '4px 5px', outline: 'none' }
  const th: React.CSSProperties = { color: 'rgba(255,255,255,0.4)', fontSize: 8, letterSpacing: '0.06em', padding: '8px 5px', textAlign: 'right', minWidth: 62 }
  const stick: React.CSSProperties = { position: 'sticky', left: 0, background: '#0B0B0B', zIndex: 2 }

  const renderLines = (arr: BudgetLine[]) => {
    // group by grp with a sub-header
    let last: string | null = null
    const out: React.ReactNode[] = []
    arr.forEach(l => {
      if (l.grp && l.grp !== last) { out.push(<tr key={`h-${l.grp}-${l.id}`}><td style={{ ...stick, padding: '9px 12px 3px', color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: '0.08em' }}>{l.grp}</td>{CFO_MONTHS.map((_, i) => <td key={i} />)}<td /><td /></tr>); last = l.grp }
      else if (!l.grp) last = null
      const tot = sum(l.m.map(x => +x || 0))
      out.push(
        <tr key={l.id}>
          <td style={{ ...stick, padding: '2px 12px 2px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input defaultValue={l.name} onBlur={e => e.target.value !== l.name && onName(l.id, e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.72)', fontSize: 11, width: 150 }} />
              {l.fin && <Tag t={l.tax ? 'tax' : 'financing'} />}
              {l.pipeline && <Tag t="pipeline" col="#8FA8BF" />}
              {l.splitGroup && <Tag t={`split ${l.pct}%`} col="#6E9BE6" />}
              {l.s === 'revenue' && l.pipeline && <MiniBtn label="⤴ commit" onClick={() => onCommit(l.id)} />}
              {l.s === 'revenue' && !l.pipeline && !l.fin && !l.splitGroup && <MiniBtn label="↩" title="Move to pipeline" onClick={() => onPipeline(l.id)} />}
            </div>
          </td>
          {l.m.map((v, mi) => (
            <td key={mi} style={{ padding: '2px 2px' }}>
              <input type="number" defaultValue={v || ''} onBlur={e => { const nv = parseFloat(e.target.value) || 0; if (nv !== v) onCell(l.id, mi, nv) }} style={{ ...cellStyle, color: v < 0 ? NEG : cellStyle.color }} />
            </td>
          ))}
          <td style={{ color: tot < 0 ? NEG : 'rgba(255,255,255,0.55)', fontSize: 10, fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '2px 10px' }}>{tot ? comma(tot) : '—'}</td>
          <td style={{ textAlign: 'center' }}><button onClick={() => onDel(l.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>×</button></td>
        </tr>
      )
    })
    return out
  }
  const totalRow = (label: string, arr: number[], strong?: boolean) => (
    <tr>
      <td style={{ ...stick, padding: '8px 12px', color: strong ? accent : 'rgba(255,255,255,0.8)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.02em' }}>{label}</td>
      {arr.map((v, i) => <td key={i} style={{ color: v < 0 ? NEG : 'rgba(255,255,255,0.7)', fontSize: 9.5, fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '8px 5px' }}>{v ? comma(v) : '—'}</td>)}
      <td style={{ color: sum(arr) < 0 ? NEG : (strong ? accent : 'rgba(255,255,255,0.85)'), fontSize: 10.5, fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '8px 10px', fontWeight: 700 }}>{comma(sum(arr))}</td>
      <td />
    </tr>
  )
  const sectionHead = (t: string) => (<tr><td style={{ ...stick, color: accent, fontSize: 9.5, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 700, padding: '16px 12px 6px' }}>{t}</td>{CFO_MONTHS.map((_, i) => <td key={i} />)}<td /><td /></tr>)
  const addRow = (s: Section) => (<tr><td colSpan={15} style={{ ...stick, padding: '3px 12px 8px 22px' }}><button onClick={() => onAdd(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: `${accent}AA`, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>+ Add line</button></td></tr>)

  return (
    <div style={{ ...panel, padding: '18px 0 12px' }}>
      <p style={{ ...panelTitle, padding: '0 24px' }}>{entity.name} · Budget entry — {CFO_MONTHS[0]}-{CFO_YEARS[0]} to {CFO_MONTHS[11]}-{CFO_YEARS[11]} · auto-saves</p>
      <div style={{ overflowX: 'auto', padding: '0 12px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1160 }}>
          <thead>
            <tr>
              <th style={{ ...stick, ...th, textAlign: 'left', minWidth: 200 }}>Line item</th>
              {CFO_MONTHS.map((m, i) => <th key={i} style={th}>{m} <span style={{ color: 'rgba(255,255,255,0.25)' }}>{CFO_YEARS[i]}</span></th>)}
              <th style={{ ...th, color: 'rgba(255,255,255,0.55)' }}>FY total</th>
              <th style={{ width: 24 }} />
            </tr>
          </thead>
          <tbody>
            {sectionHead('Revenue')}
            {renderLines(entity.lines.filter(l => l.s === 'revenue' && !l.pipeline && !l.fin))}
            {addRow('revenue')}
            {totalRow('Total revenue', revT)}
            {sectionHead('Cost of sales')}
            {renderLines(entity.lines.filter(l => l.s === 'cogs' && !l.fin))}
            {addRow('cogs')}
            {totalRow('Total cost of sales', cogT)}
            {totalRow('Gross profit', gpT)}
            {sectionHead('Operating expenses')}
            {renderLines(entity.lines.filter(l => l.s === 'opex'))}
            {addRow('opex')}
            {totalRow('Total operating expenses', ox)}
            {totalRow('EBITDA · trading basis', ebT, true)}
            {hasFin && <>
              {sectionHead(`Below the line · financing${hasTax ? ' & tax' : ''}`)}
              {renderLines(entity.lines.filter(l => l.s === 'revenue' && l.fin))}
              {renderLines(entity.lines.filter(l => l.s === 'cogs' && l.fin))}
              {totalRow('Net cash movement · after financing', netCash, true)}
            </>}
            {hasPipe && <>
              {sectionHead('Pipeline — not committed (memo)')}
              {renderLines(entity.lines.filter(l => l.s === 'revenue' && l.pipeline))}
              {totalRow('Total pipeline', revP)}
              {totalRow('EBITDA incl. pipeline', ebP, true)}
            </>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Tag({ t, col }: { t: string; col?: string }) {
  return <span style={{ fontSize: 7.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: col || '#E8B84B', border: `1px solid ${(col || '#E8B84B')}55`, borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>{t}</span>
}
function MiniBtn({ label, title, onClick }: { label: string; title?: string; onClick: () => void }) {
  return <button onClick={onClick} title={title} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, color: 'rgba(255,255,255,0.6)', fontSize: 8.5, padding: '2px 6px', cursor: 'pointer' }}>{label}</button>
}
