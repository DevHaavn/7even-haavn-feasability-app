import React, { useMemo, useState } from 'react'
import { useStore } from '../../store'
import WarMark, { Reticle, WAR_RED } from './WarMark'

// ── WAR ROOM — Partner CRM Portal (Capital pillar 03) ────────────────────────
// Stealth command environment: obsidian surfaces, black-chrome mark, one red
// line. Three commands, one lens: 7EVEN Developments, HAAVN Homes and HAAVN
// Management each run their own target board, unified here.

type DivisionId = '7even-dev' | 'haavn-homes' | 'haavn-mgmt'

const DIVISIONS: { id: DivisionId; name: string; short: string }[] = [
  { id: '7even-dev', name: '7EVEN Developments', short: '7EVEN DEV' },
  { id: 'haavn-homes', name: 'HAAVN Homes', short: 'HAAVN HOMES' },
  { id: 'haavn-mgmt', name: 'HAAVN Management', short: 'HAAVN MGMT' },
]

// The range ladder — every target walks it
const STAGES = ['painted', 'engaged', 'locked', 'secured'] as const
type Stage = typeof STAGES[number]
const STAGE_META: Record<Stage, { label: string; weight: number }> = {
  painted: { label: 'Painted', weight: 0.25 },
  engaged: { label: 'Engaged', weight: 0.5 },
  locked: { label: 'Locked', weight: 0.75 },
  secured: { label: 'Secured', weight: 1 },
}

interface Target {
  id: string          // TGT-0001
  division: DivisionId
  name: string        // person
  company: string
  value: number       // deal value AUD
  stage: Stage
  projectId?: string  // link to a feasibility project
  notes?: string
  updated: number
}

interface Contact {
  id: string          // CON-0001
  division: DivisionId
  name: string
  company: string
  role: string
  phone: string
  email: string
}

interface WarData { targets: Target[]; contacts: Contact[]; seq: number }

const STORE_KEY = 'war_room_v1'
const load = (): WarData => {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) return JSON.parse(raw) } catch { /* fresh */ }
  return { targets: [], contacts: [], seq: 446 } // TGT ids start where the briefing left off
}
const save = (d: WarData) => localStorage.setItem(STORE_KEY, JSON.stringify(d))

const fmt$ = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`

// ── Surfaces ──
const OBSIDIAN = '#0C0D0E', GRAPHITE = '#16171A', STEEL = '#24262B', SMOKE = '#9A9CA3', SMOKE_DIM = '#63656C'
const HUD: React.CSSProperties = { fontFamily: "'Chakra Petch', sans-serif", textTransform: 'uppercase' }

const panel: React.CSSProperties = {
  background: GRAPHITE, border: `1px solid ${STEEL}`, borderRadius: 10, padding: '20px 22px',
}
const inputStyle: React.CSSProperties = {
  background: OBSIDIAN, border: `1px solid ${STEEL}`, borderRadius: 6,
  color: '#E6E7E9', fontSize: 12, padding: '8px 10px', outline: 'none', width: '100%',
}
const labelStyle: React.CSSProperties = {
  ...HUD, color: SMOKE_DIM, fontSize: 8, letterSpacing: '0.22em', display: 'block', marginBottom: 5, fontWeight: 600,
}

function StageChip({ stage, onClick, title }: { stage: Stage; onClick?: () => void; title?: string }) {
  const styles: Record<Stage, React.CSSProperties> = {
    painted: { background: '#3A3C42', color: '#C9CBD1' },
    engaged: { background: '#1B1C1F', color: '#fff', border: `1px solid ${STEEL}` },
    locked: { background: WAR_RED, color: '#fff' },
    secured: { background: 'transparent', color: '#E6E7E9', border: '1.5px solid #E6E7E9' },
  }
  return (
    <button onClick={onClick} title={title}
      style={{
        ...HUD, ...styles[stage], borderRadius: 4, padding: '4px 12px', fontSize: 9,
        letterSpacing: '0.18em', fontWeight: 700, cursor: onClick ? 'pointer' : 'default',
        border: styles[stage].border || 'none',
      }}>
      {STAGE_META[stage].label}
    </button>
  )
}

type View = 'command' | 'range' | 'contacts'

export default function WarRoom() {
  const { projects } = useStore()
  const [division, setDivision] = useState<DivisionId>('7even-dev')
  const [view, setView] = useState<View>('command')
  const [data, setData] = useState<WarData>(load)
  const [showAdd, setShowAdd] = useState(false)

  // new-target form
  const [fName, setFName] = useState('')
  const [fCompany, setFCompany] = useState('')
  const [fValue, setFValue] = useState('')
  const [fProject, setFProject] = useState('')
  const [fNotes, setFNotes] = useState('')
  // new-contact form
  const [cName, setCName] = useState(''); const [cCompany, setCCompany] = useState('')
  const [cRole, setCRole] = useState(''); const [cPhone, setCPhone] = useState(''); const [cEmail, setCEmail] = useState('')

  const update = (next: WarData) => { setData(next); save(next) }

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

  const hudTab = (v: View, label: string) => (
    <button key={v} onClick={() => setView(v)}
      style={{
        ...HUD, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 2px',
        color: view === v ? WAR_RED : SMOKE_DIM,
        borderBottom: `2px solid ${view === v ? WAR_RED : 'transparent'}`,
        fontSize: 10, letterSpacing: '0.26em', fontWeight: 700,
      }}>
      {label}
    </button>
  )

  return (
    <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto', padding: '30px 24px 70px', display: 'flex', flexDirection: 'column', gap: 20, background: OBSIDIAN, borderRadius: 16, border: `1px solid ${STEEL}`, marginTop: 8, marginBottom: 40 }}>

      {/* Masthead */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', paddingTop: 6 }}>
        <WarMark width={230} />
        <p style={{ ...HUD, color: SMOKE_DIM, fontSize: 9, letterSpacing: '0.3em', margin: 0 }}>
          Every deal <span style={{ color: '#fff' }}>in your sights.</span>
        </p>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {DIVISIONS.map(d => (
            <button key={d.id} onClick={() => setDivision(d.id)}
              className={division === d.id ? 'wr-btn wr-solid wr-hot' : 'wr-btn'}
              style={{ ...HUD, padding: '8px 14px', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, color: division === d.id ? '#fff' : SMOKE }}>
              {d.short}
            </button>
          ))}
        </div>
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 26, borderBottom: `1px solid ${STEEL}` }}>
        {hudTab('command', 'Command')}
        {hudTab('range', 'The Range')}
        {hudTab('contacts', 'Contacts')}
      </div>

      {/* ── COMMAND ── */}
      {view === 'command' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total Pipeline', value: fmt$(total), color: '#E6E7E9' },
              { label: 'Weighted', value: fmt$(weighted), color: SMOKE },
              { label: 'Locked', value: fmt$(lockedValue), color: WAR_RED },
              { label: 'Secured', value: fmt$(securedValue), color: '#fff' },
              { label: 'Targets', value: String(targets.length), color: '#E6E7E9' },
            ].map(k => (
              <div key={k.label} style={{ ...panel, padding: '14px 16px' }}>
                <p style={{ ...labelStyle, marginBottom: 8 }}>{k.label}</p>
                <p style={{ color: k.color, fontSize: 19, fontWeight: 700, margin: 0, fontFamily: 'var(--font-mono)' }}>{k.value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
            {/* Signals */}
            <div style={panel}>
              <p style={{ ...labelStyle, fontSize: 9, marginBottom: 14 }}>◐ Signals — latest movement</p>
              {signals.length === 0 ? (
                <p style={{ color: SMOKE_DIM, fontSize: 12 }}>No movement yet — paint your first target on The Range.</p>
              ) : signals.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${STEEL}` }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.stage === 'locked' ? WAR_RED : SMOKE_DIM }} />
                  <span style={{ color: '#E6E7E9', fontSize: 12 }}>{t.name}</span>
                  <span style={{ color: SMOKE_DIM, fontSize: 10, fontFamily: 'var(--font-mono)' }}>{t.id}</span>
                  <span style={{ marginLeft: 'auto' }}><StageChip stage={t.stage} /></span>
                </div>
              ))}
            </div>

            {/* Studio link */}
            <div style={panel}>
              <p style={{ ...labelStyle, fontSize: 9, marginBottom: 14 }}>◎ Live theatre — feasibility studio</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Reticle size={54} />
                <div>
                  <p style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0, fontFamily: 'var(--font-mono)' }}>{projects.length}</p>
                  <p style={{ ...labelStyle, marginBottom: 0 }}>Live projects in the studio</p>
                </div>
              </div>
              <p style={{ color: SMOKE_DIM, fontSize: 11, lineHeight: 1.6, marginTop: 12 }}>
                Targets can be linked to any live project — deal-flow lands where the feasibility already lives.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── THE RANGE ── */}
      {view === 'range' && (
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ ...labelStyle, fontSize: 9, marginBottom: 0 }}>{DIVISIONS.find(d => d.id === division)!.name} · The Range</p>
            <button onClick={() => setShowAdd(s => !s)}
              className={showAdd ? 'wr-btn' : 'wr-btn wr-solid wr-hot'}
              style={{ ...HUD, marginLeft: 'auto', padding: '8px 16px', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, color: '#fff' }}>
              {showAdd ? 'Close' : '+ Paint Target'}
            </button>
          </div>

          {showAdd && (
            <div style={{ border: `1px solid ${WAR_RED}44`, borderRadius: 8, padding: 16, marginBottom: 16, background: 'rgba(255,47,0,0.04)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <div><label style={labelStyle}>Target</label><input value={fName} onChange={e => setFName(e.target.value)} placeholder="Who" style={inputStyle} /></div>
                <div><label style={labelStyle}>Company</label><input value={fCompany} onChange={e => setFCompany(e.target.value)} placeholder="Their outfit" style={inputStyle} /></div>
                <div><label style={labelStyle}>Deal Value (AUD)</label><input type="number" value={fValue} onChange={e => setFValue(e.target.value)} placeholder="0" style={inputStyle} /></div>
                <div>
                  <label style={labelStyle}>Project (optional)</label>
                  <select value={fProject} onChange={e => setFProject(e.target.value)} style={inputStyle}>
                    <option value="">— No project link —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Notes</label><input value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Intel" style={inputStyle} /></div>
              </div>
              <button onClick={addTarget} className="wr-btn wr-solid wr-hot"
                style={{ ...HUD, marginTop: 14, padding: '9px 22px', fontSize: 9, letterSpacing: '0.22em', fontWeight: 700, color: '#fff' }}>
                Paint It
              </button>
            </div>
          )}

          {targets.length === 0 ? (
            <p style={{ color: SMOKE_DIM, fontSize: 12 }}>The range is clear. Paint the first target.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {targets.map(t => {
                const proj = t.projectId ? projects.find(p => p.id === t.projectId) : undefined
                const hot = t.stage === 'locked'
                return (
                  <div key={t.id} style={{
                    display: 'grid', gridTemplateColumns: '4px minmax(110px,1.1fr) minmax(110px,1.3fr) 96px 92px 24px',
                    gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 8,
                    background: OBSIDIAN, border: `1px solid ${hot ? `${WAR_RED}55` : STEEL}`,
                  }}>
                    <span style={{ width: 4, height: 26, borderRadius: 2, background: hot ? WAR_RED : STEEL }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: '#fff', fontSize: 12.5, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                      <p style={{ color: SMOKE_DIM, fontSize: 9.5, fontFamily: 'var(--font-mono)', margin: 0 }}>{t.id}</p>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: SMOKE, fontSize: 11.5, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.company}</p>
                      {(proj || t.notes) && <p style={{ color: SMOKE_DIM, fontSize: 10, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj ? `◎ ${proj.name}` : t.notes}</p>}
                    </div>
                    <span style={{ color: '#E6E7E9', fontSize: 12.5, fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 700 }}>{fmt$(t.value)}</span>
                    <StageChip stage={t.stage} onClick={() => advance(t.id)} title="Advance stage" />
                    <button onClick={() => removeTarget(t.id)} title="Stand down"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: SMOKE_DIM, fontSize: 13 }}>×</button>
                  </div>
                )
              })}
            </div>
          )}
          <p style={{ ...HUD, color: SMOKE_DIM, fontSize: 8, letterSpacing: '0.2em', marginTop: 14 }}>
            Painted → Engaged → Locked → Secured · click a status to advance
          </p>
        </div>
      )}

      {/* ── CONTACTS ── */}
      {view === 'contacts' && (
        <div style={panel}>
          <p style={{ ...labelStyle, fontSize: 9, marginBottom: 14 }}>{DIVISIONS.find(d => d.id === division)!.name} · Ecosystem</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 8 }}>
            <input value={cName} onChange={e => setCName(e.target.value)} placeholder="Name" style={inputStyle} />
            <input value={cCompany} onChange={e => setCCompany(e.target.value)} placeholder="Company" style={inputStyle} />
            <input value={cRole} onChange={e => setCRole(e.target.value)} placeholder="Role" style={inputStyle} />
            <input value={cPhone} onChange={e => setCPhone(e.target.value)} placeholder="Phone" style={inputStyle} />
            <input value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="Email" style={inputStyle} />
            <button onClick={addContact} className="wr-btn wr-solid"
              style={{ ...HUD, padding: '8px 0', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, color: '#fff' }}>
              + Add
            </button>
          </div>
          {contacts.length === 0 ? (
            <p style={{ color: SMOKE_DIM, fontSize: 12, marginTop: 10 }}>No contacts logged for this command yet.</p>
          ) : contacts.map(c => (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px,1fr) minmax(100px,1fr) minmax(80px,0.8fr) minmax(90px,0.9fr) minmax(120px,1.2fr) 24px', gap: 12, alignItems: 'center', padding: '9px 4px', borderBottom: `1px solid ${STEEL}` }}>
              <span style={{ color: '#fff', fontSize: 12 }}>{c.name}</span>
              <span style={{ color: SMOKE, fontSize: 11.5 }}>{c.company}</span>
              <span style={{ color: SMOKE_DIM, fontSize: 11 }}>{c.role}</span>
              <span style={{ color: SMOKE, fontSize: 11, fontFamily: 'var(--font-mono)' }}>{c.phone}</span>
              <span style={{ color: SMOKE, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</span>
              <button onClick={() => removeContact(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: SMOKE_DIM, fontSize: 13 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
