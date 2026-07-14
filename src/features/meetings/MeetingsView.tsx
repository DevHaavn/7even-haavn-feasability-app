import React, { useEffect, useMemo, useRef, useState } from 'react'
import { loadMeetings, upsertBundle, newId } from './meetingsStore'
import { crmSearch, type CrmLink } from './crm'
import { startMockStream } from './mockStream'
import { defaultSender, type Sender } from './senders'
import SenderSelect from './SenderSelect'
import type { MeetingBundle, Utterance, AgendaItem } from './types'

// ── dark-shell style helpers ──────────────────────────────────────────────────
const REC = '#C6402B'
const panel: React.CSSProperties = { background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, backdropFilter: 'blur(8px)' }
const pHead: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }
const pTitle: React.CSSProperties = { fontFamily: "'Inter Tight', sans-serif", fontWeight: 600, fontSize: 14.5, color: '#EDF1EF', letterSpacing: '-0.01em' }
const pSub: React.CSSProperties = { fontSize: 11.5, color: '#8B928E', marginTop: 2 }
const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: '#9FE1CB', background: 'rgba(111,190,150,0.10)', border: '1px solid rgba(111,190,150,0.22)', padding: '2px 8px', borderRadius: 100 }
const mono: React.CSSProperties = { fontFamily: 'monospace' }
const av = (bg = 'rgba(111,190,150,0.14)', bd = 'rgba(111,190,150,0.28)', c = '#9FE1CB'): React.CSSProperties => ({ width: 30, height: 30, borderRadius: 10, background: bg, border: `1px solid ${bd}`, color: c, display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 700, flex: '0 0 auto' })

function btn(kind: 'primary' | 'glass' | 'rec' | 'quiet', extra: React.CSSProperties = {}): React.CSSProperties {
  const base: React.CSSProperties = { height: 38, padding: '0 16px', borderRadius: 11, fontSize: 13, fontWeight: 550, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, whiteSpace: 'nowrap', border: '1px solid transparent', transition: 'transform .12s, background .2s', ...extra }
  if (kind === 'primary') return { ...base, background: 'linear-gradient(180deg,#237A52,#14452F)', color: '#fff', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 6px 18px -4px rgba(27,94,63,0.5)' }
  if (kind === 'rec') return { ...base, background: 'linear-gradient(180deg,#D4553E,#A6301D)', color: '#fff' }
  if (kind === 'quiet') return { ...base, background: 'transparent', color: '#8B928E' }
  return { ...base, background: 'rgba(255,255,255,0.06)', color: '#EAEEEC', border: '1px solid rgba(255,255,255,0.12)' }
}

const initials = (name: string) => name.split(/[\s·]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

// ── main ──────────────────────────────────────────────────────────────────────
export default function MeetingsView() {
  const [bundle, setBundle] = useState<MeetingBundle>(() => loadMeetings().bundles[0])
  const [view, setView] = useState<'agenda' | 'live' | 'wrap'>('agenda')
  const m = bundle.meeting

  const persist = (b: MeetingBundle) => { setBundle(b); upsertBundle(b) }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', color: '#EAEEEC' }}>
      {/* meeting header */}
      <div style={{ padding: '16px 26px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 600, fontSize: 20, letterSpacing: '-0.02em', color: '#F3F6F4' }}>{m.title}</div>
          <div style={{ fontSize: 12.5, color: '#8B928E', marginTop: 3 }}>
            Fri 10 July · 2:00pm · {m.locationLabel} · {bundle.attendees.length} attendees
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'inline-flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['agenda', 'live', 'wrap'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ border: 0, background: view === v ? 'rgba(255,255,255,0.12)' : 'transparent', color: view === v ? '#fff' : '#8B928E', fontSize: 12.5, fontWeight: view === v ? 600 : 500, padding: '7px 16px', borderRadius: 8, cursor: 'pointer' }}>
              {v === 'wrap' ? 'Wrap-up' : v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
        {view === 'agenda' && <Agenda bundle={bundle} persist={persist} onStart={() => setView('live')} />}
        {view === 'live' && <Live bundle={bundle} persist={persist} onEnd={() => setView('wrap')} />}
        {view === 'wrap' && <Wrap bundle={bundle} persist={persist} />}
      </div>
    </div>
  )
}

// ── AGENDA ──────────────────────────────────────────────────────────────────
function Agenda({ bundle, persist, onStart }: { bundle: MeetingBundle; persist: (b: MeetingBundle) => void; onStart: () => void }) {
  const totalMin = bundle.agenda.reduce((s, a) => s + a.minutes, 0)
  const [pull, setPull] = useState<CrmLink[]>(() => crmSearch(''))
  const [q, setQ] = useState('')

  const addItem = () => {
    const it: AgendaItem = { id: newId('ag'), meetingId: bundle.meeting.id, order: bundle.agenda.length + 1, title: 'New agenda item', ownerId: null, minutes: 10, linkType: null, linkId: null, state: 'pending' }
    persist({ ...bundle, agenda: [...bundle.agenda, it] })
  }
  const editItem = (id: string, patch: Partial<AgendaItem>) => persist({ ...bundle, agenda: bundle.agenda.map(a => a.id === id ? { ...a, ...patch } : a) })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr)', gap: 16 }} className="mtg-grid">
      <div style={panel}>
        <div style={pHead}>
          <div><div style={pTitle}>Agenda</div><div style={pSub}>{bundle.agenda.length} items · {totalMin} min · linked to {bundle.meeting.locationLabel}</div></div>
        </div>
        {bundle.agenda.map(a => (
          <div key={a.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '13px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(111,190,150,0.12)', color: '#9FE1CB', ...mono, fontSize: 11, fontWeight: 600, display: 'grid', placeItems: 'center', flex: '0 0 auto', marginTop: 1 }}>{a.order}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <input value={a.title} onChange={e => editItem(a.id, { title: e.target.value })} style={{ width: '100%', background: 'none', border: 0, color: '#EDF1EF', fontSize: 14, fontWeight: 500, outline: 'none' }} />
              <div style={{ fontSize: 12, color: '#8B928E', marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {a.linkType && <span style={chip}>{a.linkType === 'project' ? 'Project' : a.linkType === 'deal' ? 'Deal' : a.linkType === 'capital' ? 'Capital' : 'Contact'}</span>}
                <span>Owner · <input value={a.ownerId || ''} placeholder="—" onChange={e => editItem(a.id, { ownerId: e.target.value })} style={{ background: 'none', border: 0, color: '#B9C0BC', width: 70, outline: 'none' }} /></span>
              </div>
            </div>
            <span style={{ ...mono, fontSize: 11, color: '#6B726E', flex: '0 0 auto' }}>{a.minutes} min</span>
          </div>
        ))}
        <div onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 18px', borderTop: '1px dashed rgba(255,255,255,0.10)', color: '#8B928E', fontSize: 13, cursor: 'pointer' }}>
          <span style={{ width: 22, height: 22, borderRadius: 7, border: '1px dashed rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center' }}>+</span>Add agenda item
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={panel}>
          <div style={pHead}><div><div style={pTitle}>Pull from CRM</div><div style={pSub}>Attach live records to the agenda</div></div></div>
          <div style={{ padding: 14 }}>
            <input value={q} onChange={e => { setQ(e.target.value); setPull(crmSearch(e.target.value)) }} placeholder="Search projects, deals, contacts…" style={{ width: '100%', padding: '9px 11px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#EAEEEC', fontSize: 12.5, marginBottom: 10, outline: 'none' }} />
            {pull.length === 0 && <div style={{ fontSize: 12, color: '#6B726E', padding: '6px 2px' }}>No CRM records yet — add contacts/deals in the CRM pillar.</div>}
            {pull.map(l => (
              <div key={l.type + l.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 10, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, marginBottom: 8, cursor: 'pointer' }}>
                <div style={av()}>{l.type === 'project' ? '▣' : l.type === 'deal' ? '◎' : '☺'}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, color: '#EDF1EF' }}>{l.label}</div><div style={{ fontSize: 11.5, color: '#8B928E' }}>{l.sub}</div></div>
                <span style={{ color: '#6FBE96', flex: '0 0 auto' }}>+</span>
              </div>
            ))}
          </div>
        </div>

        <div style={panel}>
          <div style={pHead}><div><div style={pTitle}>Attendees</div><div style={pSub}>Pulled from your team + CRM contacts</div></div></div>
          <div style={{ padding: '6px 8px 12px' }}>
            {bundle.attendees.map(at => (
              <div key={at.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9 }}>
                <div style={at.speaksLanguage === 'zh' ? av('rgba(255,255,255,0.06)', 'rgba(255,255,255,0.12)', '#B9C0BC') : av()}>{at.speaksLanguage === 'zh' ? '中' : initials(at.displayName)}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, color: '#EDF1EF' }}>{at.displayName}</div><div style={{ fontSize: 11, color: '#8B928E', ...mono }}>{at.email}</div></div>
                <span style={{ ...mono, fontSize: 10, color: '#6B726E' }}>{at.roleLabel}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button style={btn('glass')}>Save agenda</button>
          <button style={btn('rec')} onClick={onStart}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff' }} />Start recording</button>
        </div>
      </div>
    </div>
  )
}

// ── LIVE ──────────────────────────────────────────────────────────────────────
function Live({ bundle, persist, onEnd }: { bundle: MeetingBundle; persist: (b: MeetingBundle) => void; onEnd: () => void }) {
  const [utts, setUtts] = useState<Utterance[]>([])
  const [secs, setSecs] = useState(862)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctrl = startMockStream(bundle.meeting.id, u => {
      setUtts(prev => { const i = prev.findIndex(x => x.id === u.id); if (i >= 0) { const n = [...prev]; n[i] = u; return n } return [...prev, u] })
    }, { rate: 1 })
    const t = setInterval(() => setSecs(s => s + 1), 1000)
    return () => { ctrl.stop(); clearInterval(t) }
  }, [bundle.meeting.id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [utts.length])

  const clock = (n: number) => `00:${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
  const finals = utts.filter(u => u.isFinal)
  const translated = finals.filter(u => u.sourceLang === 'zh').length

  const end = () => {
    // freeze the transcript onto the bundle, then wrap up
    persist({ ...bundle, utterances: utts.filter(u => u.isFinal), meeting: { ...bundle.meeting, status: 'ended' } })
    onEnd()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', ...panel, marginBottom: 16 }}>
        <span className="mtg-recdot" style={{ width: 11, height: 11, borderRadius: '50%', background: REC, flex: '0 0 auto' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#F3F6F4' }}>Recording</span>
        <span style={{ ...mono, fontSize: 13, color: '#B9C0BC' }}>{clock(secs)}</span>
        <div className="mtg-wave" style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 24, flex: 1, maxWidth: 260 }} aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => <i key={i} style={{ width: 3, borderRadius: 2, background: '#38996B', animationDelay: `${(i % 5) * 0.1}s` }} />)}
        </div>
        <span style={{ marginLeft: 'auto', ...mono, fontSize: 10.5, fontWeight: 600, color: '#9FE1CB', background: 'rgba(111,190,150,0.10)', border: '1px solid rgba(111,190,150,0.22)', padding: '4px 9px', borderRadius: 100 }}>中文 → EN</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16 }} className="mtg-grid">
        <div style={panel}>
          <div style={pHead}><div><div style={pTitle}>Live transcript</div><div style={pSub}>Original + English translation · speaker-labelled</div></div></div>
          <div style={{ padding: '6px 0' }}>
            {utts.length === 0 && <div style={{ padding: '30px 18px', color: '#6B726E', fontSize: 13 }}>Listening… the transcript will appear here as people speak.</div>}
            {utts.map(u => <UtteranceRow key={u.id} u={u} />)}
            <div ref={endRef} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={panel}>
            <div style={pHead}><div><div style={pTitle}>Agenda progress</div><div style={pSub}>Auto-tracked</div></div></div>
            <div style={{ padding: '4px 0' }}>
              {bundle.agenda.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 13 }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', flex: '0 0 auto', border: `2px solid ${a.state === 'done' ? '#237A52' : a.state === 'active' ? '#6FBE96' : 'rgba(255,255,255,0.2)'}`, background: a.state === 'done' ? '#237A52' : 'transparent', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 9 }}>{a.state === 'done' ? '✓' : ''}</span>
                  <span style={{ color: a.state === 'active' ? '#9FE1CB' : a.state === 'done' ? '#8B928E' : '#B9C0BC', fontWeight: a.state === 'active' ? 600 : 400 }}>{a.title.split('—')[0].trim()}</span>
                  <span style={{ marginLeft: 'auto', ...mono, fontSize: 10.5, color: '#6B726E' }}>{a.state === 'done' ? `${a.minutes}m` : a.state === 'active' ? 'now' : '—'}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={panel}>
            <div style={{ padding: '16px 18px' }}>
              {[['Elapsed', clock(secs).slice(3)], ['Lines captured', String(finals.length)], ['Translated (zh→en)', String(translated)], ['Actions flagged', '3']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 12.5, color: '#8B928E' }}>{k}</span><span style={{ ...mono, fontSize: 13, fontWeight: 600, color: '#EDF1EF' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '0 18px 16px' }}>
              <button style={{ ...btn('glass'), flex: 1 }}>Pause</button>
              <button style={{ ...btn('primary'), flex: 1 }} onClick={end}>End &amp; wrap up</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function UtteranceRow({ u }: { u: Utterance }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '104px 1fr', gap: 14, padding: '13px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#EDF1EF' }}>{u.speaker}</div>
        <div style={{ ...mono, fontSize: 10.5, color: '#6B726E' }}>{u.isFinal ? `${String(Math.floor(u.tsMs / 60000)).padStart(2, '0')}:${String(Math.floor(u.tsMs / 1000) % 60).padStart(2, '0')}` : 'now'}</div>
        {u.sourceLang === 'zh' && <div style={{ ...mono, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: u.isFinal ? '#6FBE96' : REC, marginTop: 3 }}>● {u.isFinal ? 'zh→en' : 'translating…'}</div>}
      </div>
      <div>
        {u.sourceLang === 'zh' && <div style={{ fontFamily: "'Noto Sans SC', sans-serif", fontSize: 14, color: '#8B928E', lineHeight: 1.5 }}>{u.original}{!u.isFinal && <Caret />}</div>}
        <div style={{ fontSize: 14.5, color: u.isFinal ? '#E6EBE8' : '#8B928E', lineHeight: 1.55, marginTop: u.sourceLang === 'zh' ? 5 : 0 }}>
          {u.sourceLang === 'zh' ? (u.translation || '') : u.original}{!u.isFinal && u.sourceLang === 'en' && <Caret />}
        </div>
      </div>
    </div>
  )
}
const Caret = () => <span className="mtg-caret" style={{ display: 'inline-block', width: 2, height: 15, background: '#6FBE96', marginLeft: 2, verticalAlign: '-3px' }} />

// ── WRAP-UP / SEND ──────────────────────────────────────────────────────────
function Wrap({ bundle, persist }: { bundle: MeetingBundle; persist: (b: MeetingBundle) => void }) {
  const [from, setFrom] = useState<Sender>(defaultSender())
  const [route, setRoute] = useState<CrmLink | null>(() => crmSearch('')[0] || null)
  const [routeOpts] = useState<CrmLink[]>(() => crmSearch('').slice(0, 3))
  const [incSummary, setIncSummary] = useState(true)
  const [makeTasks, setMakeTasks] = useState(true)
  const [recips, setRecips] = useState(() => bundle.attendees.filter(a => a.roleLabel !== 'Host').map(a => ({ name: a.displayName.split(/[\s·]/)[0], initials: initials(a.displayName) })))
  const [sent, setSent] = useState(false)

  const actions = [
    { t: 'Send formal quotation for precast components', o: 'Due next week', who: 'Zheng Wei' },
    { t: 'Confirm payment schedule against Aug capital call', o: 'Due Wed', who: 'Lewis Jin' },
    { t: 'Update Saint Village programme in CRM', o: 'Today', who: 'Daniel Sette' },
  ]

  const send = (alsoEmail: boolean) => {
    persist({ ...bundle, meeting: { ...bundle.meeting, status: 'sent' }, record: {
      id: newId('rec'), meetingId: bundle.meeting.id,
      summary: SUMMARY, decisions: DECISIONS, actions: actions.map(a => ({ text: a.t, dueLabel: a.o })),
      exports: {}, routedTo: route ? { type: route.type, id: route.id } : null,
      sentAt: alsoEmail ? new Date().toISOString() : undefined, sentFrom: alsoEmail ? from.email : undefined,
    } })
    setSent(true)
  }

  const field: React.CSSProperties = { marginBottom: 15 }
  const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: '#B9C0BC', display: 'block', marginBottom: 7 }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16 }} className="mtg-grid">
      <div style={panel}>
        <div style={pHead}><div><div style={pTitle}>Meeting record</div><div style={pSub}>Auto-summary · full transcript attached</div></div></div>
        <div style={{ padding: '16px 18px' }}>
          <h4 style={{ ...pTitle, fontSize: 14, margin: '0 0 8px' }}>Summary</h4>
          <p style={{ fontSize: 13.5, color: '#B9C0BC', lineHeight: 1.55 }}>{SUMMARY}</p>
          <h4 style={{ ...pTitle, fontSize: 14, margin: '16px 0 8px' }}>Decisions</h4>
          {DECISIONS.map((d, i) => <p key={i} style={{ fontSize: 13.5, color: '#B9C0BC', lineHeight: 1.55 }}>· {d}</p>)}
          <h4 style={{ ...pTitle, fontSize: 14, margin: '16px 0 8px' }}>Actions</h4>
          {actions.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '11px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ width: 18, height: 18, borderRadius: 6, background: '#237A52', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, flex: '0 0 auto', marginTop: 1 }}>✓</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 500, color: '#EDF1EF' }}>{a.t}</div><div style={{ fontSize: 12, color: '#8B928E', marginTop: 2 }}>{a.o}</div></div>
              <span style={{ ...mono, fontSize: 11, color: '#9FE1CB' }}>{a.who}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={panel}>
        <div style={pHead}><div><div style={pTitle}>Route &amp; send</div><div style={pSub}>Where should this record go?</div></div></div>
        <div style={{ padding: '16px 18px' }}>
          <div style={field}>
            <label style={label}>Save to CRM</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {routeOpts.map(r => {
                const sel = route?.id === r.id
                return (
                  <div key={r.id} onClick={() => setRoute(r)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 12, border: `1.5px solid ${sel ? 'rgba(111,190,150,0.5)' : 'rgba(255,255,255,0.10)'}`, borderRadius: 11, cursor: 'pointer', background: sel ? 'rgba(35,122,82,0.14)' : 'transparent' }}>
                    <div style={av()}>{r.type === 'project' ? '▣' : r.type === 'deal' ? '◎' : '☺'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: '#EDF1EF' }}>{r.label}</div><div style={{ fontSize: 11.5, color: '#8B928E' }}>{r.sub}</div></div>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${sel ? '#6FBE96' : 'rgba(255,255,255,0.2)'}`, background: sel ? '#237A52' : 'transparent', flex: '0 0 auto', boxShadow: sel ? 'inset 0 0 0 3px rgba(16,20,17,1)' : 'none' }} />
                  </div>
                )
              })}
              {routeOpts.length === 0 && <div style={{ fontSize: 12, color: '#6B726E' }}>No CRM records to route to yet.</div>}
            </div>
          </div>

          <div style={field}>
            <label style={label}>Send from <span style={{ color: '#6B726E', fontWeight: 400 }}>— the address the email is sent as</span></label>
            <SenderSelect value={from} onChange={setFrom} />
          </div>

          <div style={field}>
            <label style={label}>To</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {recips.map((r, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 10px 6px 6px', background: 'rgba(111,190,150,0.10)', border: '1px solid rgba(111,190,150,0.22)', borderRadius: 100, color: '#9FE1CB', fontWeight: 500 }}>
                  <span style={{ ...av(), width: 20, height: 20, borderRadius: 6, fontSize: 8.5 }}>{r.initials}</span>{r.name}
                  <span onClick={() => setRecips(recips.filter((_, j) => j !== i))} style={{ color: '#6B726E', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</span>
                </span>
              ))}
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, padding: '6px 10px', border: '1px dashed rgba(111,190,150,0.4)', borderRadius: 100, color: '#6FBE96', cursor: 'pointer' }}>+ Add</span>
            </div>
          </div>

          <div style={field}>
            <label style={label}>Attachments</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Transcript_EN.pdf', 'Transcript_中英.pdf', 'Audio.m4a'].map(f => (
                <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '8px 11px', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 9, background: 'rgba(255,255,255,0.03)', color: '#B9C0BC' }}>📄 {f}</span>
              ))}
            </div>
          </div>

          <Toggle on={incSummary} set={setIncSummary} label="Include summary & actions in email body" />
          <Toggle on={makeTasks} set={setMakeTasks} label="Create CRM tasks from actions" />
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '16px 18px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button style={{ ...btn('glass'), flex: 1 }} onClick={() => send(false)}>Save only</button>
          <button style={{ ...btn('primary'), flex: 1.4 }} onClick={() => send(true)}>Save to CRM &amp; send</button>
        </div>
        {sent && <div style={{ padding: '10px 18px 16px', fontSize: 11.5, color: '#9FE1CB', ...mono }}>✓ Record saved to CRM{route ? ` · ${route.label}` : ''}. Email dispatch activates once the Microsoft 365 connection is wired (phase 8).</div>}
      </div>
    </div>
  )
}

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: '#D6DAD9' }}>
      <span>{label}</span>
      <button role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)} style={{ width: 42, height: 25, borderRadius: 100, background: on ? '#237A52' : 'rgba(255,255,255,0.15)', position: 'relative', cursor: 'pointer', border: 'none', flex: '0 0 auto', transition: 'background .25s' }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 19 : 2, width: 21, height: 21, borderRadius: '50%', background: '#fff', transition: 'left .25s', boxShadow: '0 1px 3px rgba(0,0,0,0.35)' }} />
      </button>
    </div>
  )
}

const SUMMARY = 'HAAVN management sync covering Saint Village construction progress, CSCEC co-investment terms, factory lead times for precision-manufactured build form, and the 90-day capital call schedule. Programme is two weeks ahead. CSCEC can accelerate precast delivery pending confirmed payment terms, which align with the mid-August capital call.'
const DECISIONS = ['Accept accelerated precast delivery, contingent on formal quotation.', 'Payment terms tied to the mid-August capital call — confirmed by Lewis.']
