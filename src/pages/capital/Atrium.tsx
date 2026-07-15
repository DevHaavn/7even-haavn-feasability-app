import React, { useMemo, useState } from 'react'
import { saveKV } from '../../lib/cloudStore'
import { useStore } from '../../store'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { Sidebar } from '../../components/layout/Sidebar'
import { PageHeader } from '../../components/layout/PageHeader'
import WarMark, { Reticle } from './WarMark'
import HaavnLogistics from './HaavnLogistics'
import WarPipeline from './WarPipeline'
import WarStock from './WarStock'
import WarTenders from './WarTenders'
import CrmMeetingsList from '../../features/meetings/CrmMeetingsList'

// ── ATRIUM — Partner CRM Portal (Capital pillar 03) ────────────────────────
// Glass and forest interface: calm, composed command environment for 7EVEN
// Developments, HAAVN Homes and HAAVN Management. Each runs their own
// target board, unified here under one lens.

type DivisionId = '7even-dev' | 'haavn-homes' | 'haavn-mgmt'

// HAAVN Management only — 7EVEN Developments and HAAVN Homes removed from this
// pillar so it speaks solely to the HAAVN Management team.
const DIVISIONS: { id: DivisionId; name: string; short: string }[] = [
  { id: 'haavn-mgmt', name: 'HAAVN Management', short: 'HAAVN MGMT' },
]

const STAGES = ['painted', 'engaged', 'locked', 'secured'] as const
type Stage = typeof STAGES[number]
const STAGE_META: Record<Stage, { label: string; weight: number }> = {
  painted: { label: 'Painted', weight: 0.25 },
  engaged: { label: 'Engaged', weight: 0.5 },
  locked: { label: 'Locked', weight: 0.75 },
  secured: { label: 'Secured', weight: 1 },
}

interface Target {
  id: string
  division: DivisionId
  name: string
  company: string
  value: number
  stage: Stage
  projectId?: string
  notes?: string
  updated: number
}

interface Contact {
  id: string
  division: DivisionId
  name: string
  company: string
  role: string
  phone: string
  email: string
}

interface FeedSignal { text: string; tag: string; when: string }
interface AtriumData { targets: Target[]; contacts: Contact[]; seq: number; feed?: FeedSignal[] }

const STORE_KEY = 'atrium_v1'
const load = (): AtriumData => {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) return JSON.parse(raw) } catch { /* fresh */ }
  return { targets: [], contacts: [], seq: 446 }
}
const save = (d: AtriumData) => saveKV(STORE_KEY, d)
const fmt$ = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`

type View = 'dashboard' | 'pipeline' | 'stock' | 'tenders' | 'range' | 'contacts' | 'logistics' | 'meetings'

export default function Atrium() {
  const { projects } = useStore()
  const [division, setDivision] = useState<DivisionId>('haavn-mgmt')
  const [view, setView] = useState<View>('dashboard')
  const [data, setData] = useState<AtriumData>(load)
  const [showAdd, setShowAdd] = useState(false)

  const [fName, setFName] = useState('')
  const [fCompany, setFCompany] = useState('')
  const [fValue, setFValue] = useState('')
  const [fProject, setFProject] = useState('')
  const [fNotes, setFNotes] = useState('')
  const [fSignal, setFSignal] = useState('')
  const [fSignalTag, setFSignalTag] = useState('CAPITAL')
  const [cName, setCName] = useState('')
  const [cCompany, setCCompany] = useState('')
  const [cRole, setCRole] = useState('')
  const [cPhone, setCPhone] = useState('')
  const [cEmail, setCEmail] = useState('')

  const update = (next: AtriumData) => { setData(next); save(next) }

  const targets = useMemo(
    () => data.targets.filter(t => t.division === division).sort((a, b) => STAGES.indexOf(b.stage) - STAGES.indexOf(a.stage) || b.value - a.value),
    [data, division],
  )
  const contacts = useMemo(() => data.contacts.filter(c => c.division === division), [data, division])

  const total = targets.reduce((s, t) => s + t.value, 0)
  const weighted = targets.reduce((s, t) => s + t.value * STAGE_META[t.stage].weight, 0)
  const lockedValue = targets.filter(t => t.stage === 'locked').reduce((s, t) => s + t.value, 0)
  const securedValue = targets.filter(t => t.stage === 'secured').reduce((s, t) => s + t.value, 0)
  const signals = useMemo(
    () => [...data.targets].sort((a, b) => b.updated - a.updated).slice(0, 5),
    [data],
  )

  function addTarget() {
    const value = parseFloat(fValue)
    if (!fName.trim() || !fCompany.trim() || !value || value <= 0) return
    const seq = data.seq + 1
    const t: Target = {
      id: `TGT-${String(seq).padStart(4, '0')}`, division, name: fName.trim(), company: fCompany.trim(),
      value, stage: 'painted', projectId: fProject || undefined, notes: fNotes.trim() || undefined, updated: Date.now(),
    }
    update({ ...data, targets: [t, ...data.targets], seq })
    setFName(''); setFCompany(''); setFValue(''); setFProject(''); setFNotes(''); setShowAdd(false)
  }

  function advance(id: string) {
    update({
      ...data,
      targets: data.targets.map(t => t.id === id
        ? { ...t, stage: STAGES[(STAGES.indexOf(t.stage) + 1) % STAGES.length], updated: Date.now() }
        : t),
    })
  }

  function removeTarget(id: string) { update({ ...data, targets: data.targets.filter(t => t.id !== id) }) }

  function addContact() {
    if (!cName.trim()) return
    const seq = data.seq + 1
    update({
      ...data, seq,
      contacts: [{ id: `CON-${String(seq).padStart(4, '0')}`, division, name: cName.trim(), company: cCompany.trim(), role: cRole.trim(), phone: cPhone.trim(), email: cEmail.trim() }, ...data.contacts],
    })
    setCName(''); setCCompany(''); setCRole(''); setCPhone(''); setCEmail('')
  }

  function removeContact(id: string) { update({ ...data, contacts: data.contacts.filter(c => c.id !== id) }) }

  function logSignal() {
    if (!fSignal.trim()) return
    update({ ...data, feed: [{ text: fSignal.trim(), tag: fSignalTag, when: 'now' }, ...(data.feed ?? [])] })
    setFSignal('')
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'pipeline', label: 'Pipeline' },
    ...(division === '7even-dev' ? [{ id: 'stock', label: 'Stock' }] : []),
    ...(division === 'haavn-mgmt' ? [{ id: 'tenders', label: 'Tenders' }] : []),
    { id: 'range', label: 'The Range' },
    ...(division === 'haavn-homes' ? [{ id: 'logistics', label: 'Logistics' }] : []),
    { id: 'meetings', label: 'Meetings' },
    { id: 'contacts', label: 'Contacts' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--grey-100)' }}>
      {/* Sidebar */}
      <Sidebar
        items={navItems as any}
        active={view}
        onSelect={(id) => {
          if (view === 'dashboard' && id !== 'dashboard') setView(id as View)
          else if (view !== 'dashboard') setView(id as View)
          if ((id === 'logistics' && division !== 'haavn-homes') ||
              (id === 'stock' && division !== '7even-dev') ||
              (id === 'tenders' && division !== 'haavn-mgmt')) {
            setDivision(id === 'logistics' ? 'haavn-homes' : id === 'stock' ? '7even-dev' : 'haavn-mgmt')
          }
        }}
        brand={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>ATRIUM</span>
          </div>
        }
        footer={
          <div>
            <div className="font-mono" style={{ fontSize: 8, color: 'rgba(255,255,255,.4)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>Division</div>
            <div className="atr-btn atr-btn--mint atr-btn--sq" style={{ fontSize: 9, fontWeight: 600, height: 32, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              HAAVN MGMT
            </div>
          </div>
        }
      />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <PageHeader
          title="ATRIUM"
          subtitle={DIVISIONS.find(d => d.id === division)?.name}
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" onClick={() => { setView('range'); setShowAdd(true) }}>+ New deal</Button>
            </div>
          }
        />

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--grey-100)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
            {/* Dashboard View */}
            {view === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* KPI Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <Panel title="Pipeline Value" subtitle={fmt$(total)}>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--f-600)', fontFamily: 'var(--font-mono)' }}>{fmt$(total)}</p>
                  </Panel>
                  <Panel title="Weighted" subtitle={fmt$(weighted)}>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--f-600)', fontFamily: 'var(--font-mono)' }}>{fmt$(weighted)}</p>
                  </Panel>
                  <Panel title="Locked" subtitle={fmt$(lockedValue)}>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--f-600)', fontFamily: 'var(--font-mono)' }}>{fmt$(lockedValue)}</p>
                  </Panel>
                  <Panel title="Secured" subtitle={fmt$(securedValue)}>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--f-600)', fontFamily: 'var(--font-mono)' }}>{fmt$(securedValue)}</p>
                  </Panel>
                </div>

                {/* Latest Signals & Studio Link */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                  <Panel title="Latest Movement" subtitle="Recent target activity">
                    {signals.length === 0 ? (
                      <p style={{ color: 'var(--mute)', fontSize: 13, margin: 0, padding: '0 18px 18px' }}>No movement yet — paint your first target on The Range.</p>
                    ) : (
                      <div style={{ padding: '0 18px 18px' }}>
                        {signals.slice(0, 3).map(t => (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line-2)', fontSize: 13 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.stage === 'locked' ? 'var(--f-600)' : 'var(--mute)', flexShrink: 0 }} />
                            <span style={{ color: 'var(--ink)', flex: 1 }}>{t.name}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>{STAGE_META[t.stage].label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>

                  <Panel title="Live Projects" subtitle="In the studio">
                    <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <Reticle size={48} />
                      <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--f-600)', fontFamily: 'var(--font-mono)' }}>{projects.length}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--mute)' }}>Feasibility projects</p>
                    </div>
                  </Panel>
                </div>

                {/* Team Feed */}
                <Panel title="Signals &amp; Approvals" subtitle="Team activity log">
                  <div style={{ padding: '0 18px 18px' }}>
                    {(data.feed ?? []).length === 0 ? (
                      <p style={{ color: 'var(--mute)', fontSize: 13, margin: 0 }}>Nothing logged yet — approvals, slips and wins land here.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(data.feed ?? []).slice(0, 3).map((sig, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingBottom: 8, borderBottom: i < Math.min(2, (data.feed ?? []).length - 1) ? '1px solid var(--line-2)' : 'none' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--f-600)', marginTop: 4, flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>{sig.text}</p>
                              <div className="font-mono" style={{ fontSize: 10, color: 'var(--faint)', marginTop: 3 }}>{sig.tag}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)', background: 'var(--grey-50)', borderRadius: '0 0 var(--r-m) var(--r-m)', display: 'flex', gap: 8 }}>
                    <input value={fSignal} onChange={e => setFSignal(e.target.value)} placeholder="Log a signal…"
                      onKeyDown={e => { if (e.key === 'Enter') logSignal() }}
                      style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r-s)', fontSize: 13, fontFamily: 'var(--font-body)' }} />
                    <select value={fSignalTag} onChange={e => setFSignalTag(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-s)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                      {['CAPITAL', 'LOGISTICS', 'PLANNING', 'FEASIBILITY', 'DELIVERY'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <Button variant="primary" onClick={logSignal}>Log</Button>
                  </div>
                </Panel>
              </div>
            )}

            {/* The Range View */}
            {view === 'range' && (
              <Panel title="The Range" subtitle={`${DIVISIONS.find(d => d.id === division)?.name} targets`}>
                <div style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <Button variant={showAdd ? 'primary' : 'glass'} onClick={() => setShowAdd(!showAdd)}>
                      {showAdd ? 'Close' : '+ Paint Target'}
                    </Button>
                  </div>

                  {showAdd && (
                    <div style={{ background: 'var(--grey-50)', border: '1px solid var(--line)', borderRadius: 'var(--r-m)', padding: 16, marginBottom: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 12 }}>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Target</label>
                          <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Who" style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-s)', fontSize: 12 }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Company</label>
                          <input value={fCompany} onChange={e => setFCompany(e.target.value)} placeholder="Their outfit" style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-s)', fontSize: 12 }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Deal Value (AUD)</label>
                          <input type="number" value={fValue} onChange={e => setFValue(e.target.value)} placeholder="0" style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-s)', fontSize: 12 }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Project</label>
                          <select value={fProject} onChange={e => setFProject(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-s)', fontSize: 12 }}>
                            <option value="">— No project —</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Notes</label>
                          <input value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Intel" style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-s)', fontSize: 12 }} />
                        </div>
                      </div>
                      <Button variant="primary" onClick={addTarget}>Paint It</Button>
                    </div>
                  )}

                  {targets.length === 0 ? (
                    <p style={{ color: 'var(--mute)', fontSize: 13 }}>The range is clear. Paint the first target.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {targets.map(t => {
                        const proj = t.projectId ? projects.find(p => p.id === t.projectId) : undefined
                        return (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--grey-50)', border: '1px solid var(--line)', borderRadius: 'var(--r-s)', borderLeft: `3px solid var(--f-600)` }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>{t.name}</p>
                              <p style={{ margin: 0, color: 'var(--mute)', fontSize: 11 }}>{t.company}</p>
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--f-600)', fontSize: 13 }}>{fmt$(t.value)}</span>
                            <Button variant="quiet" shape="square" onClick={() => advance(t.id)} title="Advance stage" style={{ width: 32, height: 32, padding: 0 }}>{STAGE_META[t.stage].label[0]}</Button>
                            <Button variant="quiet" shape="square" onClick={() => removeTarget(t.id)} title="Stand down" style={{ width: 32, height: 32, padding: 0, color: 'var(--mute)' }}>×</Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Panel>
            )}

            {/* Contacts View */}
            {view === 'contacts' && (
              <Panel title="Contacts" subtitle={`${DIVISIONS.find(d => d.id === division)?.name} ecosystem`}>
                <div style={{ padding: '18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 16 }}>
                    <input value={cName} onChange={e => setCName(e.target.value)} placeholder="Name" style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-s)', fontSize: 12 }} />
                    <input value={cCompany} onChange={e => setCCompany(e.target.value)} placeholder="Company" style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-s)', fontSize: 12 }} />
                    <input value={cRole} onChange={e => setCRole(e.target.value)} placeholder="Role" style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-s)', fontSize: 12 }} />
                    <input value={cPhone} onChange={e => setCPhone(e.target.value)} placeholder="Phone" style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-s)', fontSize: 12 }} />
                    <input value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="Email" style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-s)', fontSize: 12 }} />
                    <Button variant="primary" onClick={addContact}>+ Add</Button>
                  </div>

                  {contacts.length === 0 ? (
                    <p style={{ color: 'var(--mute)', fontSize: 13 }}>No contacts logged yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {contacts.map(c => (
                        <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 120px auto 32px', gap: 12, alignItems: 'center', padding: '10px', background: 'var(--grey-50)', borderRadius: 'var(--r-s)', borderBottom: '1px solid var(--line)' }}>
                          <span style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 12 }}>{c.name}</span>
                          <span style={{ color: 'var(--mute)', fontSize: 11 }}>{c.company}</span>
                          <span style={{ color: 'var(--mute)', fontSize: 11 }}>{c.role}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--faint)', fontSize: 10 }}>{c.phone}</span>
                          <span style={{ color: 'var(--mute)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</span>
                          <Button variant="quiet" shape="square" onClick={() => removeContact(c.id)} style={{ width: 32, height: 32, padding: 0, color: 'var(--mute)' }}>×</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>
            )}

            {/* Other Views */}
            {view === 'pipeline' && <WarPipeline division={division} />}
            {view === 'stock' && <WarStock />}
            {view === 'tenders' && <WarTenders />}
            {view === 'logistics' && <HaavnLogistics />}
            {view === 'meetings' && <CrmMeetingsList />}
          </div>
        </div>
      </div>
    </div>
  )
}
