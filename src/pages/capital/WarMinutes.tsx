import React, { useMemo, useState } from 'react'
import { loadKV, saveKV } from '../../lib/cloudStore'
import { WAR_RED } from './WarMark'

// ── WAR ROOM · MINUTES — per-project meeting minutes & action register ───────
// An industry-standard project meeting-minutes sheet (pre-lodgement, design,
// site, PCG) with a live accountability register: every agenda item can carry
// an owner and a due date, and stays "open" until closed. The whole board is
// shared with the team and external consultants so there is one record of who
// owns what, and by when.

// Light stealth palette — matches the War Room surfaces
const PAGE = '#E8E8EA', PANEL = '#F6F6F7', CARD = '#FFFFFF', LINE = '#D3D4D8'
const INK = '#0D0D0F', INK_SOFT = '#4A4B50', DIM = '#63656C'
const HUD: React.CSSProperties = { fontFamily: "'Chakra Petch', sans-serif", textTransform: 'uppercase' }

const MEETING_TYPES = ['Pre-Lodgement', 'Design', 'PCG / Control Group', 'Site / Construction', 'Consultant', 'Client', 'Internal'] as const

type ItemKind = 'heading' | 'item'
type ItemStatus = 'open' | 'done'

interface Attendee { id: string; name: string; initial: string; company: string; present: boolean }
interface AgendaItem { id: string; kind: ItemKind; description: string; owner: string; due: string; status: ItemStatus }
interface Meeting {
  id: string
  projectId: string
  no: string
  type: string
  date: string
  time: string
  location: string
  attendees: Attendee[]
  items: AgendaItem[]
  created: number
}
interface MinutesData { meetings: Meeting[]; seq: number }

const STORE_KEY = 'war_minutes_v1'
const load = (): MinutesData => loadKV<MinutesData>(STORE_KEY, { meetings: [], seq: 0 })

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`
const today = () => new Date().toISOString().slice(0, 10)
const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 3)

interface Props { projects: { id: string; name: string; address?: string }[] }

export default function WarMinutes({ projects }: Props) {
  const [data, setData] = useState<MinutesData>(load)
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [activeId, setActiveId] = useState<string | null>(data.meetings[0]?.id ?? null)

  const update = (next: MinutesData) => { setData(next); saveKV(STORE_KEY, next) }
  const projName = (id: string) => projects.find(p => p.id === id)?.name ?? 'Unassigned project'

  const meetings = useMemo(
    () => data.meetings
      .filter(m => projectFilter === 'all' || m.projectId === projectFilter)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.created - a.created),
    [data, projectFilter],
  )
  const active = data.meetings.find(m => m.id === activeId) ?? null

  // open actions across every meeting (with an owner and a due date)
  const openActions = useMemo(
    () => data.meetings.flatMap(m => m.items
      .filter(i => i.kind === 'item' && i.status === 'open' && i.owner.trim() && i.due)
      .map(i => ({ ...i, meeting: m }))),
    [data],
  )

  function newMeeting() {
    const seq = data.seq + 1
    const pid = projectFilter !== 'all' ? projectFilter : projects[0]?.id ?? ''
    const count = data.meetings.filter(m => m.projectId === pid).length + 1
    const m: Meeting = {
      id: uid('MTG'), projectId: pid, no: String(count).padStart(3, '0'),
      type: 'Pre-Lodgement', date: today(), time: '', location: '',
      attendees: [], items: [{ id: uid('IT'), kind: 'heading', description: 'Project Summary & Key Milestones', owner: '', due: '', status: 'open' }],
      created: Date.now(),
    }
    update({ meetings: [m, ...data.meetings], seq })
    setActiveId(m.id)
  }
  function patch(id: string, fn: (m: Meeting) => Meeting) {
    update({ ...data, meetings: data.meetings.map(m => m.id === id ? fn(m) : m) })
  }
  function removeMeeting(id: string) {
    const next = data.meetings.filter(m => m.id !== id)
    update({ ...data, meetings: next })
    if (activeId === id) setActiveId(next[0]?.id ?? null)
  }

  // computed agenda ref: headings -> 1,2,3 · items -> 1.1, 1.2 under current heading
  function refs(items: AgendaItem[]): string[] {
    let major = 0, minor = 0
    return items.map(it => {
      if (it.kind === 'heading') { major += 1; minor = 0; return String(major) }
      minor += 1; return `${major || 1}.${minor}`
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Command strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ ...HUD, color: DIM, fontSize: 9, letterSpacing: '0.28em', margin: 0 }}>Minutes <span style={{ color: INK }}>· one record, every action owned.</span></p>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} style={field(150)}>
            <option value="all">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={newMeeting} className="wr-btn wr-solid wr-hot" style={{ ...HUD, color: '#fff', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, padding: '9px 16px' }}>+ New Meeting</button>
        </div>
      </div>

      {/* Actions outstanding — accountability roll-up */}
      <div style={{ ...panel, padding: '14px 16px' }}>
        <p style={{ ...label, marginBottom: openActions.length ? 12 : 0 }}>◐ Actions Outstanding · {openActions.length}</p>
        {openActions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {openActions.sort((a, b) => (a.due || '').localeCompare(b.due || '')).map(a => {
              const overdue = a.due < today()
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: INK }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: overdue ? WAR_RED : DIM, flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description || 'Untitled action'}</span>
                  <span style={{ ...HUD, fontSize: 8, letterSpacing: '0.16em', color: DIM }}>{a.owner}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: overdue ? WAR_RED : INK_SOFT, minWidth: 84, textAlign: 'right' }}>{fmtDate(a.due)}</span>
                  <button onClick={() => patch(a.meeting.id, m => ({ ...m, items: m.items.map(i => i.id === a.id ? { ...i, status: 'done' } : i) }))}
                    style={{ ...HUD, background: 'none', border: `1px solid ${LINE}`, borderRadius: 4, color: DIM, fontSize: 8, letterSpacing: '0.14em', padding: '3px 8px', cursor: 'pointer' }}>Close</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(210px, 260px) 1fr', gap: 16, alignItems: 'start' }}>
        {/* Meeting list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {meetings.length === 0 && <p style={{ color: DIM, fontSize: 12, padding: 4 }}>No meetings yet — start one with “New Meeting”.</p>}
          {meetings.map(m => {
            const open = m.items.filter(i => i.kind === 'item' && i.status === 'open' && i.owner.trim() && i.due).length
            const sel = m.id === activeId
            return (
              <button key={m.id} onClick={() => setActiveId(m.id)} style={{
                textAlign: 'left', background: sel ? CARD : PANEL, border: `1px solid ${sel ? INK_SOFT : LINE}`,
                borderLeft: `3px solid ${sel ? WAR_RED : LINE}`, borderRadius: 8, padding: '11px 13px', cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...HUD, fontSize: 8, letterSpacing: '0.18em', color: DIM }}>{m.type}</span>
                  <span style={{ ...HUD, marginLeft: 'auto', fontSize: 8, color: DIM, fontFamily: 'var(--font-mono)' }}>#{m.no}</span>
                </div>
                <p style={{ color: INK, fontSize: 13, fontWeight: 600, margin: '4px 0 2px' }}>{projName(m.projectId)}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: DIM, fontSize: 10, fontFamily: 'var(--font-mono)' }}>{fmtDate(m.date)}</span>
                  {open > 0 && <span style={{ ...HUD, marginLeft: 'auto', fontSize: 8, letterSpacing: '0.14em', color: WAR_RED }}>{open} open</span>}
                </div>
              </button>
            )
          })}
        </div>

        {/* Minute sheet */}
        {active ? (
          <div style={{ ...panel, padding: 0, overflow: 'hidden' }}>
            {/* Meta header */}
            <div style={{ padding: '16px 18px', borderBottom: `1px solid ${LINE}`, background: CARD }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ ...HUD, fontSize: 12, letterSpacing: '0.18em', fontWeight: 700, color: INK }}>{active.type} · Minutes {active.no}</span>
                <button onClick={() => removeMeeting(active.id)} style={{ ...HUD, marginLeft: 'auto', background: 'none', border: 'none', color: DIM, fontSize: 9, letterSpacing: '0.16em', cursor: 'pointer' }}>Delete</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                <Meta label="Project">
                  <select value={active.projectId} onChange={e => patch(active.id, m => ({ ...m, projectId: e.target.value }))} style={field()}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Meta>
                <Meta label="Meeting No"><input value={active.no} onChange={e => patch(active.id, m => ({ ...m, no: e.target.value }))} style={field()} /></Meta>
                <Meta label="Type">
                  <select value={active.type} onChange={e => patch(active.id, m => ({ ...m, type: e.target.value }))} style={field()}>
                    {MEETING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Meta>
                <Meta label="Date"><input type="date" value={active.date} onChange={e => patch(active.id, m => ({ ...m, date: e.target.value }))} style={field()} /></Meta>
                <Meta label="Time"><input value={active.time} placeholder="10:30am" onChange={e => patch(active.id, m => ({ ...m, time: e.target.value }))} style={field()} /></Meta>
                <Meta label="Location"><input value={active.location} placeholder="Site address" onChange={e => patch(active.id, m => ({ ...m, location: e.target.value }))} style={field()} /></Meta>
              </div>
            </div>

            {/* Distribution / attendees */}
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${LINE}` }}>
              <p style={{ ...label, marginBottom: 10 }}>Distribution · P = Present · A = Apology</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {active.attendees.map(at => (
                  <div key={at.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 90px 1fr 24px', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => patch(active.id, m => ({ ...m, attendees: m.attendees.map(a => a.id === at.id ? { ...a, present: !a.present } : a) }))}
                      style={{ ...HUD, fontSize: 9, letterSpacing: '0.12em', fontWeight: 700, padding: '5px 0', borderRadius: 4, cursor: 'pointer',
                        border: `1px solid ${at.present ? INK_SOFT : LINE}`, background: at.present ? INK : PANEL, color: at.present ? '#fff' : DIM }}>
                      {at.present ? 'Present' : 'Apology'}
                    </button>
                    <input value={at.name} placeholder="Name" onChange={e => patch(active.id, m => ({ ...m, attendees: m.attendees.map(a => a.id === at.id ? { ...a, name: e.target.value, initial: a.initial || initials(e.target.value) } : a) }))} style={field()} />
                    <input value={at.initial} placeholder="Init." onChange={e => patch(active.id, m => ({ ...m, attendees: m.attendees.map(a => a.id === at.id ? { ...a, initial: e.target.value } : a) }))} style={field()} />
                    <input value={at.company} placeholder="Company" onChange={e => patch(active.id, m => ({ ...m, attendees: m.attendees.map(a => a.id === at.id ? { ...a, company: e.target.value } : a) }))} style={field()} />
                    <button onClick={() => patch(active.id, m => ({ ...m, attendees: m.attendees.filter(a => a.id !== at.id) }))} style={xBtn}>×</button>
                  </div>
                ))}
              </div>
              <button onClick={() => patch(active.id, m => ({ ...m, attendees: [...m.attendees, { id: uid('AT'), name: '', initial: '', company: '', present: true }] }))}
                style={addBtn}>+ Add attendee</button>
            </div>

            {/* Agenda + actions */}
            <div style={{ padding: '14px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '46px 1fr 110px 108px 78px 24px', gap: 8, padding: '0 0 8px', borderBottom: `1px solid ${LINE}` }}>
                {['Item', 'Description', 'By (owner)', 'Due', 'Status', ''].map((h, i) => (
                  <span key={i} style={{ ...label, marginBottom: 0 }}>{h}</span>
                ))}
              </div>
              {(() => {
                const rf = refs(active.items)
                return active.items.map((it, idx) => it.kind === 'heading' ? (
                  <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '46px 1fr 24px', gap: 8, alignItems: 'center', padding: '10px 0 6px', borderBottom: `1px solid ${LINE}` }}>
                    <span style={{ ...HUD, fontSize: 12, fontWeight: 700, color: INK }}>{rf[idx]}.</span>
                    <input value={it.description} placeholder="Section heading" onChange={e => patch(active.id, m => ({ ...m, items: m.items.map(x => x.id === it.id ? { ...x, description: e.target.value } : x) }))}
                      style={{ ...field(), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: INK }} />
                    <button onClick={() => patch(active.id, m => ({ ...m, items: m.items.filter(x => x.id !== it.id) }))} style={xBtn}>×</button>
                  </div>
                ) : (
                  <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '46px 1fr 110px 108px 78px 24px', gap: 8, alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${LINE}` }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: DIM }}>{rf[idx]}</span>
                    <input value={it.description} placeholder="Discussion / action…" onChange={e => patch(active.id, m => ({ ...m, items: m.items.map(x => x.id === it.id ? { ...x, description: e.target.value } : x) }))} style={{ ...field(), textDecoration: it.status === 'done' ? 'line-through' : undefined, color: it.status === 'done' ? DIM : INK }} />
                    <input value={it.owner} placeholder="—" onChange={e => patch(active.id, m => ({ ...m, items: m.items.map(x => x.id === it.id ? { ...x, owner: e.target.value } : x) }))} style={field()} />
                    <input type="date" value={it.due} onChange={e => patch(active.id, m => ({ ...m, items: m.items.map(x => x.id === it.id ? { ...x, due: e.target.value } : x) }))} style={field()} />
                    <button onClick={() => patch(active.id, m => ({ ...m, items: m.items.map(x => x.id === it.id ? { ...x, status: x.status === 'open' ? 'done' : 'open' } : x) }))}
                      style={{ ...HUD, fontSize: 8, letterSpacing: '0.12em', fontWeight: 700, padding: '5px 0', borderRadius: 4, cursor: 'pointer',
                        border: `1px solid ${it.status === 'done' ? '#2A7A4F' : LINE}`, background: it.status === 'done' ? '#2A7A4F' : PANEL, color: it.status === 'done' ? '#fff' : DIM }}>
                      {it.status === 'done' ? 'Closed' : 'Open'}
                    </button>
                    <button onClick={() => patch(active.id, m => ({ ...m, items: m.items.filter(x => x.id !== it.id) }))} style={xBtn}>×</button>
                  </div>
                ))
              })()}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => patch(active.id, m => ({ ...m, items: [...m.items, { id: uid('IT'), kind: 'item', description: '', owner: '', due: '', status: 'open' }] }))} style={addBtn}>+ Action item</button>
                <button onClick={() => patch(active.id, m => ({ ...m, items: [...m.items, { id: uid('IT'), kind: 'heading', description: '', owner: '', due: '', status: 'open' }] }))} style={addBtn}>+ Section</button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...panel, padding: '40px', textAlign: 'center', color: DIM, fontSize: 13 }}>Select or start a meeting to record minutes.</div>
        )}
      </div>
    </div>
  )
}

// ── bits ──────────────────────────────────────────────────────────────────────
function Meta({ label: l, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={{ ...label, display: 'block', marginBottom: 4 }}>{l}</span>
      {children}
    </div>
  )
}

function fmtDate(d: string) {
  if (!d) return '—'
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: '2-digit' }) } catch { return d }
}

const field = (w?: number): React.CSSProperties => ({
  background: '#fff', border: `1px solid ${LINE}`, borderRadius: 6, color: INK, fontSize: 12,
  padding: '7px 9px', outline: 'none', width: w ? w : '100%',
})
const panel: React.CSSProperties = { background: PANEL, border: `1px solid ${LINE}`, borderRadius: 10 }
const label: React.CSSProperties = { ...HUD, color: DIM, fontSize: 8, letterSpacing: '0.22em', fontWeight: 600, marginBottom: 5 }
const addBtn: React.CSSProperties = { ...HUD, background: 'none', border: `1px dashed ${LINE}`, borderRadius: 6, color: INK_SOFT, fontSize: 9, letterSpacing: '0.16em', fontWeight: 700, padding: '8px 14px', cursor: 'pointer', marginTop: 10 }
const xBtn: React.CSSProperties = { background: 'none', border: 'none', color: DIM, fontSize: 15, cursor: 'pointer', lineHeight: 1 }
