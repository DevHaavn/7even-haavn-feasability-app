import React, { useMemo, useState } from 'react'
import { useCapital } from './CapitalCommand'
import { xirr, accrue } from '../../lib/capitalCalc'
import {
  newId, fmtM, fmtPct, fmtDate,
  investorCommitted, investorFunded, investorDistributed,
  type CapInvestor, type CapPosition, type InvestorStatus, type InstrumentType,
} from './capitalModel'

const ENTITY_TYPES = ['Individual', 'Company', 'Family Office', 'Trust', 'SMSF', 'Partnership', 'Syndicate', 'Institutional']
const CLASSES = ['Wholesale/Sophisticated (s708)', 'Professional', 'Retail']
const OWNERS = ['Lewis Jin', 'D. Ferris']
const STATUSES: InvestorStatus[] = ['prospect', 'engaged', 'soft_commit', 'committed', 'onboarding', 'active', 'redeemed']
const STATUS_LABEL: Record<InvestorStatus, string> = {
  prospect: 'Prospect', engaged: 'Engaged', soft_commit: 'Soft commit', committed: 'Committed',
  onboarding: 'Onboarding', active: 'Active', redeemed: 'Redeemed',
}
const INSTRUMENTS: { id: InstrumentType; label: string }[] = [
  { id: 'lp_equity', label: 'LP Equity' },
  { id: 'pref_equity', label: 'Preferred Equity' },
  { id: 'loan_note', label: 'Loan · Debt Note' },
  { id: 'convertible', label: 'Convertible' },
]

function StatusPill({ s }: { s: InvestorStatus }) {
  const cls = s === 'active' ? 'pos' : s === 'onboarding' || s === 'committed' ? 'marg' : 'info'
  return <span className={`st ${cls}`}>{STATUS_LABEL[s]}</span>
}

/** Net IRR for an investor from their real dated flows: fundings out, distributions in. */
function investorIrr(state: ReturnType<typeof useCapital>['state'], investorId: string): number | null {
  const flows: { date: string; amount: number }[] = []
  state.positions.filter(p => p.investorId === investorId).forEach(p => {
    if (p.fundedAmount > 0) flows.push({ date: p.startDate ?? p.drawdownDate ?? '2026-01-01', amount: -p.fundedAmount })
  })
  state.distAllocations.filter(d => d.investorId === investorId).forEach(d => {
    const dist = state.distributions.find(x => x.id === d.distributionId)
    if (dist) flows.push({ date: d.paidDate ?? dist.distributionDate, amount: d.amount })
  })
  if (flows.length < 2) return null
  return xirr(flows.sort((a, b) => a.date.localeCompare(b.date)))
}

export default function CapitalInvestors() {
  const { state, update, openDrawer } = useCapital()
  const [q, setQ] = useState('')
  const [fStatus, setFStatus] = useState<'all' | InvestorStatus>('all')
  const [fOwner, setFOwner] = useState<'all' | string>('all')

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return state.investors
      .filter(i => fStatus === 'all' || i.status === fStatus)
      .filter(i => fOwner === 'all' || i.relationshipOwner === fOwner)
      .filter(i => !needle || i.companyName.toLowerCase().includes(needle) || (i.contactName ?? '').toLowerCase().includes(needle))
      .map(i => ({
        inv: i,
        committed: investorCommitted(state, i.id),
        funded: investorFunded(state, i.id),
        distributed: investorDistributed(state, i.id),
        irr: investorIrr(state, i.id),
      }))
      .sort((a, b) => b.committed - a.committed)
  }, [state, q, fStatus, fOwner])

  const totCommitted = state.investors.reduce((a, i) => a + investorCommitted(state, i.id), 0)
  const totFunded = state.investors.reduce((a, i) => a + investorFunded(state, i.id), 0)
  const activeCount = state.investors.filter(i => i.status === 'active').length
  const followUps = state.pipeline.filter(p => p.nextActionDate && new Date(p.nextActionDate) <= new Date(Date.now() + 7 * 864e5)).length

  const newInvestor = () => openDrawer(<InvestorForm />)

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="kicker">Relationships · Investor CRM</div>
          <h1 className="h-sec">Investors</h1>
          <div className="h-sub">Manage capital partners like a CRM — commitments, funded capital, distributions, contact log and follow-ups. Click any investor to open their file.</div>
        </div>
        <button className="btn" onClick={newInvestor}>+ New investor</button>
      </div>

      <div className="kpis k4 mb">
        <div className="kpi"><div className="lab">Active investors</div><div className="val">{activeCount}</div><div className="sub">{state.investors.length} on file</div></div>
        <div className="kpi accent"><div className="lab">Total committed</div><div className="val">{fmtM(totCommitted)}</div><div className="sub">across {new Set(state.positions.map(p => p.projectId)).size} projects</div></div>
        <div className="kpi g"><div className="lab">Funded to date</div><div className="val">{fmtM(totFunded)}</div><div className="sub">{totCommitted > 0 ? fmtPct(totFunded / totCommitted) : '—'} of commitments</div></div>
        <div className="kpi am"><div className="lab">Follow-ups · 7 days</div><div className="val">{followUps}</div><div className="sub">from the raise pipeline</div></div>
      </div>

      <div className="panel pad">
        <div className="flex between aic mb wrapf gap">
          <div className="divlabel" style={{ margin: 0 }}>Investor directory</div>
          <div className="flex gap wrapf aic">
            <input className="srch" placeholder="Search investors…" value={q} onChange={e => setQ(e.target.value)} />
            <select className="fin" style={{ width: 'auto' }} value={fStatus} onChange={e => setFStatus(e.target.value as any)}>
              <option value="all">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <select className="fin" style={{ width: 'auto' }} value={fOwner} onChange={e => setFOwner(e.target.value)}>
              <option value="all">All owners</option>
              {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="dtable">
            <thead>
              <tr>
                <th>Investor</th><th>Owner</th><th className="num">Committed</th><th className="num">Funded</th>
                <th className="num">Net IRR</th><th className="num">Distributed</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.inv.id} className="click" onClick={() => openDrawer(<InvestorProfile investorId={r.inv.id} />)}>
                  <td>
                    <div className="name">{r.inv.companyName}</div>
                    <div style={{ fontSize: 11, color: 'var(--faint)' }}>{r.inv.entityType}</div>
                  </td>
                  <td>{r.inv.relationshipOwner}</td>
                  <td className="num">{fmtM(r.committed)}</td>
                  <td className="num">
                    <span className="mini-track"><i style={{ width: `${r.committed > 0 ? Math.min(100, (r.funded / r.committed) * 100) : 0}%` }} /></span>{' '}
                    {fmtM(r.funded)}
                  </td>
                  <td className="num" style={{ color: r.irr == null ? 'var(--faint)' : 'var(--emerald)' }}>
                    {r.irr == null ? '—' : fmtPct(r.irr, 1)}
                  </td>
                  <td className="num">{fmtM(r.distributed)}</td>
                  <td><StatusPill s={r.inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="empty">No investors match those filters.</div>}
        </div>
      </div>
    </>
  )
}

// ── Investor profile ────────────────────────────────────────────────────────

function InvestorProfile({ investorId }: { investorId: string }) {
  const { state, update, openDrawer } = useCapital()
  const i = state.investors.find(x => x.id === investorId)
  if (!i) return null

  const positions = state.positions.filter(p => p.investorId === i.id)
  const committed = investorCommitted(state, i.id)
  const funded = investorFunded(state, i.id)
  const distributed = investorDistributed(state, i.id)
  const irr = investorIrr(state, i.id)
  const activities = state.activities.filter(a => a.investorId === i.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  // Accrued-unpaid preferred return across their equity positions.
  const accruedPref = positions.reduce((a, p) => {
    if (!p.prefRate || p.fundedAmount <= 0) return a
    return a + accrue({
      principal: p.fundedAmount, ratePct: p.prefRate,
      fromDate: p.startDate ?? '2026-01-01', toDate: new Date().toISOString().slice(0, 10),
      compounding: p.prefCompounding ?? 'compound',
    })
  }, 0)

  return (
    <>
      <div className="kicker">{i.entityType} · Owner {i.relationshipOwner}</div>
      <h2>{i.companyName}</h2>
      <div className="flex gap mt" style={{ gap: 8 }}>
        <StatusPill s={i.status} />
        {i.investorClass && <span className="tag">{i.investorClass.split('/')[0]}</span>}
        {i.kycStatus && <span className={`tag${i.kycStatus === 'verified' ? ' gold' : ''}`}>KYC {i.kycStatus.replace('_', ' ')}</span>}
      </div>

      <div className="statgrid">
        <div className="s"><div className="l">Committed</div><div className="v" style={{ color: 'var(--gold)' }}>{fmtM(committed)}</div></div>
        <div className="s"><div className="l">Funded</div><div className="v">{fmtM(funded)}</div></div>
        <div className="s"><div className="l">Net IRR</div><div className="v" style={{ color: irr == null ? 'var(--faint)' : 'var(--emerald)' }}>{irr == null ? '—' : fmtPct(irr, 1)}</div></div>
      </div>

      <div className="divlabel">Commitment funded</div>
      <div className="track" style={{ height: 10 }}>
        <div className="fill" style={{ width: `${committed > 0 ? Math.min(100, (funded / committed) * 100) : 0}%`, background: 'var(--gold)' }} />
      </div>
      <div className="note mt">
        {fmtM(funded)} called &amp; funded · {fmtM(Math.max(0, committed - funded))} uncalled commitment remaining.
      </div>

      <div className="flex between aic" style={{ marginTop: 22 }}>
        <div className="divlabel" style={{ margin: 0 }}>Positions ({positions.length})</div>
        <button className="btn ghost" style={{ padding: '6px 10px' }}
          onClick={() => openDrawer(<PositionForm investorId={i.id} />)}>+ Add position</button>
      </div>
      {positions.length === 0 && <div className="note mt">No positions yet.</div>}
      {positions.map(p => {
        const proj = state.projects.find(x => x.id === p.projectId)
        return (
          <div key={p.id} className="sumrow" style={{ display: 'block', cursor: 'pointer' }}
            onClick={() => openDrawer(<PositionForm investorId={i.id} positionId={p.id} />)}>
            <div className="flex between aic">
              <span className="l" style={{ color: 'var(--ink)' }}>{proj?.name ?? 'Portfolio / fund-level'}</span>
              <span className="v" style={{ color: 'var(--gold)' }}>{fmtM(p.committedAmount)}</span>
            </div>
            <div className="note" style={{ fontSize: 10.5, color: 'var(--faint)', marginTop: 3 }}>
              {INSTRUMENTS.find(x => x.id === p.instrumentType)?.label}
              {' · '}{fmtM(p.fundedAmount)} funded
              {p.interestRate ? ` · ${p.interestRate}% interest` : p.prefRate ? ` · ${p.prefRate}% pref` : ''}
              {' · '}{p.status.replace('_', ' ')}
            </div>
          </div>
        )
      })}

      <div className="divlabel">Accrued preferred return</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 22, color: 'var(--gold)' }}>
        {fmtM(accruedPref)}
        <span style={{ fontSize: 11, color: 'var(--faint)', fontFamily: 'var(--sans)' }}> unpaid to date</span>
      </div>

      <div className="divlabel">Distributions received</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 22, color: 'var(--gold)' }}>
        {fmtM(distributed)}
        <span style={{ fontSize: 11, color: 'var(--faint)', fontFamily: 'var(--sans)' }}> lifetime</span>
      </div>

      <div className="flex between aic" style={{ marginTop: 22 }}>
        <div className="divlabel" style={{ margin: 0 }}>Activity</div>
        <button className="btn ghost" style={{ padding: '6px 10px' }}
          onClick={() => openDrawer(<ActivityForm investorId={i.id} />)}>+ Log activity</button>
      </div>
      {activities.length === 0 && <div className="note mt">No activity logged.</div>}
      {activities.length > 0 && (
        <div className="log mt">
          {activities.map(a => (
            <div key={a.id} className="e">
              <div className="dt">{fmtDate(a.createdAt)} · {a.type}</div>
              {a.body}
              {a.nextActionDate && <div style={{ color: 'var(--gold)', fontSize: 11, marginTop: 3 }}>→ next {fmtDate(a.nextActionDate)}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap mt" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => openDrawer(<InvestorForm investorId={i.id} />)}>Edit investor</button>
        <button className="btn ghost" disabled title="Needs per-user auth — see the Investor Portal tab">Invite to portal</button>
        <button className="btn ghost" disabled title="Statement PDFs ship with the portal">Generate statement</button>
      </div>
    </>
  )
}

// ── Intake form (§10.1) ─────────────────────────────────────────────────────

function InvestorForm({ investorId }: { investorId?: string }) {
  const { state, update, closeDrawer, openDrawer } = useCapital()
  const existing = investorId ? state.investors.find(x => x.id === investorId) : undefined
  const [f, setF] = useState<Partial<CapInvestor>>(existing ?? {
    entityType: 'Family Office', taxCountry: 'Australia', relationshipOwner: 'Lewis Jin',
    status: 'prospect', investorClass: CLASSES[0], kycStatus: 'not_started', postalSame: true,
  })
  const [err, setErr] = useState<Record<string, string>>({})
  const set = (k: keyof CapInvestor, v: any) => { setF(p => ({ ...p, [k]: v })); setErr(e => ({ ...e, [k]: '' })) }

  const save = (then?: 'position') => {
    const e: Record<string, string> = {}
    if (!f.companyName?.trim()) e.companyName = 'Legal entity name is required'
    if (!f.entityType) e.entityType = 'Required'
    if (!f.relationshipOwner) e.relationshipOwner = 'Required'
    if (!f.status) e.status = 'Required'
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) e.email = 'That email does not look right'
    if (Object.keys(e).length) { setErr(e); return }

    const id = existing?.id ?? newId('inv')
    const record: CapInvestor = {
      ...(existing ?? { createdAt: new Date().toISOString() }),
      ...f,
      id,
      companyName: f.companyName!.trim(),
      entityType: f.entityType!,
      relationshipOwner: f.relationshipOwner!,
      status: f.status as InvestorStatus,
    } as CapInvestor

    update(s => ({
      ...s,
      investors: existing ? s.investors.map(x => x.id === id ? record : x) : [...s.investors, record],
    }))
    if (then === 'position') openDrawer(<PositionForm investorId={id} />)
    else closeDrawer()
  }

  const F = ({ label, k, type = 'text', placeholder, full, options }: {
    label: string; k: keyof CapInvestor; type?: string; placeholder?: string; full?: boolean; options?: string[]
  }) => (
    <div className={full ? 'full' : undefined}>
      <label className="flab">{label}</label>
      {options
        ? <select className="fin" value={(f[k] as string) ?? ''} onChange={e => set(k, e.target.value)}>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        : <input className="fin" type={type} placeholder={placeholder} value={(f[k] as string) ?? ''} onChange={e => set(k, e.target.value)} />}
      {err[k as string] && <div className="ferr">{err[k as string]}</div>}
    </div>
  )

  return (
    <>
      <div className="kicker">{existing ? 'Edit' : 'New'} investor</div>
      <h2>{existing ? existing.companyName : 'Client intake'}</h2>

      <div className="divlabel">Entity &amp; identity</div>
      <div className="fgrid">
        <div className="full">
          <label className="flab">Legal entity name <span className="freq">*</span></label>
          <input className="fin" value={f.companyName ?? ''} onChange={e => set('companyName', e.target.value)} />
          {err.companyName && <div className="ferr">{err.companyName}</div>}
        </div>
        <F label="Trading name" k="tradingName" />
        <F label="Entity type *" k="entityType" options={ENTITY_TYPES} />
        <F label="ABN / ACN" k="abnAcn" />
        <F label="Tax residence" k="taxCountry" />
      </div>

      <div className="divlabel">Registered address</div>
      <div className="fgrid">
        <F label="Address line 1" k="regAddr1" full />
        <F label="Suburb" k="regSuburb" />
        <F label="State" k="regState" />
        <F label="Postcode" k="regPostcode" />
        <F label="Country" k="regCountry" />
      </div>

      <div className="divlabel">Primary contact</div>
      <div className="fgrid">
        <F label="Full name" k="contactName" />
        <F label="Role / title" k="contactRole" />
        <div>
          <label className="flab">Email</label>
          <input className="fin" type="email" value={f.email ?? ''} onChange={e => set('email', e.target.value)} />
          {err.email && <div className="ferr">{err.email}</div>}
        </div>
        <F label="Phone" k="phone" />
      </div>

      <div className="divlabel">Classification &amp; relationship</div>
      <div className="fgrid">
        <F label="Investor classification" k="investorClass" options={CLASSES} />
        <div>
          <label className="flab">KYC / AML status</label>
          <select className="fin" value={f.kycStatus ?? 'not_started'} onChange={e => set('kycStatus', e.target.value)}>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="verified">Verified</option>
          </select>
        </div>
        <F label="Relationship owner *" k="relationshipOwner" options={OWNERS} />
        <div>
          <label className="flab">Status <span className="freq">*</span></label>
          <select className="fin" value={f.status ?? 'prospect'} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <F label="Introduced by" k="introducedBy" />
      </div>

      {/* ── Locked: banking + KYC documents ───────────────────────────────────
          Rendered so Lewis can see what's coming, disabled so nothing sensitive
          is written. The anon Supabase key ships in the public JS bundle and
          every policy is using(true), so this table is readable by anyone who
          opens devtools — fine for 7EVEN's own commercial figures, not for a
          third party's bank account or passport. Needs per-user auth + RLS. */}
      <div className="divlabel">Banking &amp; compliance documents</div>
      <div className="flocked">
        <div className="lockmsg">
          🔒 <b>Disabled pending per-user login.</b> Bank details and identity documents are
          third-party personal data. This app authenticates with one shared password and a
          public database key, so anything stored here would be readable by anyone who opens
          the page source. These fields switch on once Supabase Auth and row-level security
          are in place — see the Investor Portal tab.
        </div>
        <div className="fgrid">
          <div><label className="flab">Account name</label><input className="fin" disabled placeholder="—" /></div>
          <div><label className="flab">BSB</label><input className="fin" disabled placeholder="—" /></div>
          <div><label className="flab">Account number</label><input className="fin" disabled placeholder="—" /></div>
          <div><label className="flab">Bank</label><input className="fin" disabled placeholder="—" /></div>
          <div className="full"><label className="flab">Source of funds</label><input className="fin" disabled placeholder="—" /></div>
          <div className="full"><label className="flab">KYC / ID documents</label><input className="fin" disabled placeholder="Upload unavailable" /></div>
        </div>
      </div>

      <div className="divlabel">Notes</div>
      <textarea className="fin" value={f.notes ?? ''} onChange={e => set('notes', e.target.value)} />

      <div className="flex gap mt" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => save()}>Save</button>
        <button className="btn ghost" onClick={() => save('position')}>Save &amp; add position</button>
        <button className="btn ghost" onClick={closeDrawer}>Cancel</button>
      </div>
    </>
  )
}

// ── Position form (§10.2) ───────────────────────────────────────────────────

function PositionForm({ investorId, positionId }: { investorId: string; positionId?: string }) {
  const { state, update, closeDrawer, openDrawer } = useCapital()
  const existing = positionId ? state.positions.find(p => p.id === positionId) : undefined
  const [f, setF] = useState<Partial<CapPosition>>(existing ?? {
    investorId, instrumentType: 'lp_equity', committedAmount: 0, fundedAmount: 0,
    prefRate: 8, prefCompounding: 'compound', status: 'committed',
    startDate: new Date().toISOString().slice(0, 10),
  })
  const [err, setErr] = useState<Record<string, string>>({})
  const set = (k: keyof CapPosition, v: any) => { setF(p => ({ ...p, [k]: v })); setErr(e => ({ ...e, [k]: '' })) }

  const isDebt = f.instrumentType === 'loan_note' || f.instrumentType === 'convertible' || f.instrumentType === 'pref_equity'
  const isEquity = f.instrumentType === 'lp_equity' || f.instrumentType === 'pref_equity'

  const save = () => {
    const e: Record<string, string> = {}
    if (!f.committedAmount || f.committedAmount <= 0) e.committedAmount = 'Committed amount is required'
    if ((f.fundedAmount ?? 0) > (f.committedAmount ?? 0)) e.fundedAmount = 'Funded cannot exceed committed'
    if (isDebt && !f.interestRate) e.interestRate = 'Interest rate is required for a debt instrument'
    if (Object.keys(e).length) { setErr(e); return }

    const committed = f.committedAmount!, fundedAmt = f.fundedAmount ?? 0
    const record: CapPosition = {
      ...(existing ?? {}), ...f,
      id: existing?.id ?? newId('pos'),
      investorId,
      committedAmount: committed,
      fundedAmount: fundedAmt,
      instrumentType: f.instrumentType as InstrumentType,
      status: fundedAmt >= committed ? 'funded' : fundedAmt > 0 ? 'partially_funded' : 'committed',
    } as CapPosition

    update(s => ({
      ...s,
      positions: existing ? s.positions.map(p => p.id === record.id ? record : p) : [...s.positions, record],
    }))
    openDrawer(<InvestorProfile investorId={investorId} />)
  }

  const remove = () => {
    if (!existing) return
    update(s => ({ ...s, positions: s.positions.filter(p => p.id !== existing.id) }))
    openDrawer(<InvestorProfile investorId={investorId} />)
  }

  const money = (k: keyof CapPosition, label: string, required?: boolean) => (
    <div>
      <label className="flab">{label} {required && <span className="freq">*</span>}</label>
      <input className="fin mono" type="number" value={(f[k] as number) ?? ''} min={0}
        onChange={e => set(k, parseFloat(e.target.value) || 0)} />
      {err[k as string] && <div className="ferr">{err[k as string]}</div>}
    </div>
  )

  return (
    <>
      <div className="kicker">{existing ? 'Edit' : 'New'} position</div>
      <h2>{state.investors.find(i => i.id === investorId)?.companyName}</h2>

      <div className="divlabel">Instrument</div>
      <div className="fgrid">
        <div>
          <label className="flab">Linked project</label>
          <select className="fin" value={f.projectId ?? ''} onChange={e => set('projectId', e.target.value || undefined)}>
            <option value="">Portfolio / fund-level</option>
            {state.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="flab">Instrument type <span className="freq">*</span></label>
          <select className="fin" value={f.instrumentType} onChange={e => set('instrumentType', e.target.value)}>
            {INSTRUMENTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="divlabel">Amounts</div>
      <div className="fgrid">
        {money('committedAmount', 'Committed amount', true)}
        {money('fundedAmount', 'Funded to date')}
      </div>
      <div className="note" style={{ marginTop: 6 }}>
        “How much they’re lending” and “the dollar amount funded to us”. Funded normally rolls up
        from capital calls — set it here for money received outside a call.
      </div>

      {isEquity && (
        <>
          <div className="divlabel">Equity terms</div>
          <div className="fgrid">
            <div>
              <label className="flab">Preferred return (% p.a.)</label>
              <input className="fin mono" type="number" step="0.1" value={f.prefRate ?? ''} onChange={e => set('prefRate', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="flab">Compounding</label>
              <select className="fin" value={f.prefCompounding ?? 'compound'} onChange={e => set('prefCompounding', e.target.value)}>
                <option value="compound">Compound</option>
                <option value="simple">Simple</option>
              </select>
            </div>
            <div>
              <label className="flab">Promote participation (%)</label>
              <input className="fin mono" type="number" step="0.1" value={f.promoteParticipation ?? ''} onChange={e => set('promoteParticipation', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        </>
      )}

      {isDebt && (
        <>
          <div className="divlabel">Loan terms</div>
          <div className="fgrid">
            <div>
              <label className="flab">Interest rate (% p.a.) <span className="freq">*</span></label>
              <input className="fin mono" type="number" step="0.1" value={f.interestRate ?? ''} onChange={e => set('interestRate', parseFloat(e.target.value) || 0)} />
              {err.interestRate && <div className="ferr">{err.interestRate}</div>}
            </div>
            <div>
              <label className="flab">Interest type</label>
              <select className="fin" value={f.interestType ?? 'fixed'} onChange={e => set('interestType', e.target.value)}>
                <option value="fixed">Fixed</option><option value="variable">Variable</option>
              </select>
            </div>
            <div>
              <label className="flab">Payment frequency</label>
              <select className="fin" value={f.paymentFrequency ?? 'monthly'} onChange={e => set('paymentFrequency', e.target.value)}>
                <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option>
                <option value="at_maturity">At maturity</option><option value="capitalised">Capitalised</option>
              </select>
            </div>
            <div>
              <label className="flab">Security priority</label>
              <select className="fin" value={f.securityPriority ?? 'senior'} onChange={e => set('securityPriority', e.target.value)}>
                <option value="senior">Senior</option><option value="mezzanine">Mezzanine</option>
                <option value="subordinated">Subordinated</option><option value="unsecured">Unsecured</option>
                <option value="equity">Equity</option>
              </select>
            </div>
            <div>
              <label className="flab">Term (months)</label>
              <input className="fin mono" type="number" value={f.termMonths ?? ''} onChange={e => set('termMonths', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="flab">Maturity date</label>
              <input className="fin" type="date" value={f.maturityDate ?? ''} onChange={e => set('maturityDate', e.target.value)} />
            </div>
            {money('establishmentFee', 'Establishment fee')}
            <div>
              <label className="flab">Line fee (%)</label>
              <input className="fin mono" type="number" step="0.01" value={f.lineFee ?? ''} onChange={e => set('lineFee', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        </>
      )}

      <div className="divlabel">Lifecycle</div>
      <div className="fgrid">
        <div>
          <label className="flab">Start / commitment date</label>
          <input className="fin" type="date" value={f.startDate ?? ''} onChange={e => set('startDate', e.target.value)} />
        </div>
        <div>
          <label className="flab">Drawdown date</label>
          <input className="fin" type="date" value={f.drawdownDate ?? ''} onChange={e => set('drawdownDate', e.target.value)} />
        </div>
      </div>

      <div className="flex gap mt" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={save}>Save position</button>
        {existing && <button className="btn ghost" onClick={remove} style={{ color: 'var(--red)', borderColor: 'rgba(200,80,63,.4)' }}>Delete</button>}
        <button className="btn ghost" onClick={() => openDrawer(<InvestorProfile investorId={investorId} />)}>Cancel</button>
      </div>
    </>
  )
}

// ── Activity (§10.6) ────────────────────────────────────────────────────────

function ActivityForm({ investorId }: { investorId: string }) {
  const { update, openDrawer } = useCapital()
  const [type, setType] = useState<'call' | 'email' | 'meeting' | 'note' | 'task' | 'doc'>('call')
  const [body, setBody] = useState('')
  const [next, setNext] = useState('')
  const [err, setErr] = useState('')

  const save = () => {
    if (!body.trim()) { setErr('Say what happened'); return }
    update(s => ({
      ...s,
      activities: [...s.activities, {
        id: newId('act'), investorId, type, body: body.trim(),
        nextActionDate: next || undefined, createdAt: new Date().toISOString(),
      }],
    }))
    openDrawer(<InvestorProfile investorId={investorId} />)
  }

  return (
    <>
      <div className="kicker">Log activity</div>
      <h2>Contact log</h2>
      <div className="fgrid mt">
        <div>
          <label className="flab">Type <span className="freq">*</span></label>
          <select className="fin" value={type} onChange={e => setType(e.target.value as any)}>
            {['call', 'email', 'meeting', 'note', 'task', 'doc'].map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="flab">Next action date</label>
          <input className="fin" type="date" value={next} onChange={e => setNext(e.target.value)} />
        </div>
        <div className="full">
          <label className="flab">What happened <span className="freq">*</span></label>
          <textarea className="fin" value={body} onChange={e => { setBody(e.target.value); setErr('') }} />
          {err && <div className="ferr">{err}</div>}
        </div>
      </div>
      <div className="flex gap mt" style={{ gap: 8 }}>
        <button className="btn" onClick={save}>Save</button>
        <button className="btn ghost" onClick={() => openDrawer(<InvestorProfile investorId={investorId} />)}>Cancel</button>
      </div>
    </>
  )
}
