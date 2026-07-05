import React, { useMemo, useState } from 'react'
import { useStore } from '../../store'

// ── Budgets / Administration — Xero-centred admin tool for both companies ────
// Data is captured locally today; the same shapes map 1:1 onto the Xero
// Accounting API (invoices, bills, budgets) so the live feed can replace the
// local layer without changing any screen.

export type CompanyId = '7even' | 'haavn'

const COMPANIES: { id: CompanyId; name: string; color: string }[] = [
  { id: '7even', name: '7EVEN', color: '#C4973A' },
  { id: 'haavn', name: 'HAAVN', color: '#E8E8E8' },
]

const XERO_BLUE = '#13B5EA'

// Xero-style chart-of-account groups. Revenue tracks invoices; the rest track bills.
const CATEGORIES = [
  'Revenue',
  'Consultants',
  'Construction Costs',
  'Marketing',
  'Rent & Utilities',
  'Salaries & Wages',
  'Insurance',
  'Software & IT',
  'Legal & Compliance',
  'Finance Costs',
  'Travel',
  'Other',
] as const

interface Txn {
  id: string
  company: CompanyId
  type: 'invoice' | 'bill'      // invoice = money in, bill = money out
  contact: string
  desc: string
  category: string
  amount: number                 // ex GST
  date: string                   // ISO
  status: 'awaiting' | 'paid'
  projectId?: string             // link to a feasibility project
}

interface AdminData {
  txns: Txn[]
  budgets: Record<CompanyId, Record<string, number>>   // annual budget by category
}

const STORE_KEY = 'capital_admin_v1'

function loadData(): AdminData {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* fall through */ }
  return { txns: [], budgets: { '7even': {}, 'haavn': {} } }
}

function saveData(d: AdminData) {
  localStorage.setItem(STORE_KEY, JSON.stringify(d))
}

const fmt$ = (n: number) =>
  n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })

const uid = () => Math.random().toString(36).slice(2, 10)

// Shared field styling
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 8, color: '#fff', fontSize: 12, padding: '8px 10px', outline: 'none', width: '100%',
}
const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.45)', fontSize: 8, letterSpacing: '0.22em',
  textTransform: 'uppercase', display: 'block', marginBottom: 5,
}

export default function BudgetsAdmin() {
  const { projects } = useStore()
  const [company, setCompany] = useState<CompanyId>('7even')
  const [data, setData] = useState<AdminData>(loadData)
  const [showAdd, setShowAdd] = useState(false)

  // Add-transaction form state
  const [fType, setFType] = useState<'invoice' | 'bill'>('bill')
  const [fContact, setFContact] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fCategory, setFCategory] = useState<string>('Consultants')
  const [fAmount, setFAmount] = useState('')
  const [fDate, setFDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [fProject, setFProject] = useState('')

  const co = COMPANIES.find(c => c.id === company)!
  const txns = useMemo(() => data.txns.filter(t => t.company === company), [data, company])

  const revenue = txns.filter(t => t.type === 'invoice').reduce((s, t) => s + t.amount, 0)
  const costs = txns.filter(t => t.type === 'bill').reduce((s, t) => s + t.amount, 0)
  const awaitingIn = txns.filter(t => t.type === 'invoice' && t.status === 'awaiting').reduce((s, t) => s + t.amount, 0)
  const awaitingOut = txns.filter(t => t.type === 'bill' && t.status === 'awaiting').reduce((s, t) => s + t.amount, 0)

  const budgets = data.budgets[company] || {}

  const actualFor = (cat: string) =>
    cat === 'Revenue'
      ? txns.filter(t => t.type === 'invoice' && t.category === cat).reduce((s, t) => s + t.amount, 0)
      : txns.filter(t => t.type === 'bill' && t.category === cat).reduce((s, t) => s + t.amount, 0)

  // Live spend per feasibility project (bills tagged with a project, both companies)
  const projectSpend = useMemo(() => {
    const map = new Map<string, number>()
    data.txns.filter(t => t.type === 'bill' && t.projectId).forEach(t => {
      map.set(t.projectId!, (map.get(t.projectId!) || 0) + t.amount)
    })
    return map
  }, [data])

  function update(next: AdminData) { setData(next); saveData(next) }

  function addTxn() {
    const amount = parseFloat(fAmount)
    if (!fContact.trim() || !amount || amount <= 0) return
    const txn: Txn = {
      id: uid(), company, type: fType, contact: fContact.trim(), desc: fDesc.trim(),
      category: fType === 'invoice' ? 'Revenue' : fCategory, amount,
      date: fDate, status: 'awaiting', projectId: fProject || undefined,
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

  function setBudget(cat: string, annual: number) {
    update({ ...data, budgets: { ...data.budgets, [company]: { ...budgets, [cat]: annual } } })
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

  return (
    <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto', padding: '28px 24px 60px', display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Company switch + Xero status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {COMPANIES.map(c => (
          <button key={c.id} onClick={() => setCompany(c.id)} className="glass-btn"
            style={{
              padding: '10px 26px', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700,
              color: company === c.id ? c.color : 'rgba(255,255,255,0.45)',
              borderColor: company === c.id ? `${c.color}88` : undefined,
              boxShadow: company === c.id ? `inset 0 1px 0 rgba(255,255,255,0.25), 0 0 22px ${c.color}22` : undefined,
            }}>
            {c.name}
          </button>
        ))}
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10,
          border: `1px solid ${XERO_BLUE}44`, borderRadius: 12, padding: '8px 16px',
          background: `${XERO_BLUE}0D`,
        }}>
          <img src="/xero-logo.png" alt="Xero" draggable={false} style={{ width: 46, height: 'auto' }} />
          <span className="xero-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: XERO_BLUE }} />
          <span style={{ color: XERO_BLUE, fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700 }}>
            Live feed · ready to connect
          </span>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {[
          { label: 'Revenue', value: fmt$(revenue), color: XERO_BLUE },
          { label: 'Operating Costs', value: fmt$(costs), color: '#E8E8E8' },
          { label: 'Net Position', value: fmt$(revenue - costs), color: revenue - costs >= 0 ? '#3DAA6A' : '#E0808C' },
          { label: 'Awaiting Payment In', value: fmt$(awaitingIn), color: XERO_BLUE },
          { label: 'Bills To Pay', value: fmt$(awaitingOut), color: '#C4973A' },
        ].map(k => (
          <div key={k.label} style={{ ...panel, padding: '16px 18px' }}>
            <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 7.5, letterSpacing: '0.24em', textTransform: 'uppercase', margin: '0 0 8px' }}>{k.label}</p>
            <p style={{ color: k.color, fontSize: 20, fontWeight: 600, margin: 0, fontFamily: 'var(--font-mono)' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Budget vs actual — Xero-style category tracking */}
      <div style={panel}>
        <p style={panelTitle}>{co.name} · Budget vs Actual — FY{new Date().getFullYear()}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CATEGORIES.map(cat => {
            const annual = budgets[cat] || 0
            const actual = actualFor(cat)
            const pct = annual > 0 ? Math.min(100, (actual / annual) * 100) : 0
            const over = annual > 0 && actual > annual
            const barColor = cat === 'Revenue' ? XERO_BLUE : over ? '#E0808C' : co.color
            return (
              <div key={cat} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 180px) 1fr 110px 120px', gap: 12, alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{cat}</span>
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: `linear-gradient(to right, ${barColor}66, ${barColor})`, transition: 'width 0.4s' }} />
                </div>
                <span style={{ color: over ? '#E0808C' : 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{fmt$(actual)}</span>
                <input
                  type="number" placeholder="budget" defaultValue={annual || ''}
                  onBlur={e => setBudget(cat, parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', padding: '6px 8px', fontSize: 11 }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Transactions register */}
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
                    {CATEGORIES.filter(c => c !== 'Revenue').map(c => <option key={c} value={c}>{c}</option>)}
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
              return (
                <div key={t.id} style={{
                  display: 'grid', gridTemplateColumns: '10px minmax(110px,1fr) minmax(120px,2fr) 110px 96px 90px 24px',
                  gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.type === 'invoice' ? XERO_BLUE : '#C4973A' }} />
                  <span style={{ color: '#fff', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.contact}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.desc || t.category}{proj ? ` · ${proj.name}` : ''}
                  </span>
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
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Live project spend — the Capital ↔ Projects link */}
      <div style={panel}>
        <p style={panelTitle}>Project Spend — linked to the feasibility studio</p>
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
    </div>
  )
}
