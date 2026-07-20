import React, { useEffect, useMemo, useRef, useState } from 'react'
import { loadMeetings, upsertBundle, deleteBundle, newBundle, newId } from './meetingsStore'
import { crmSearch, type CrmLink } from './crm'
import { startTranscription, type EngineController } from './engine'
import { emailHtml, transcriptPdfBase64 } from './exports'
import { defaultSender, TEAM, type Sender } from './senders'
import { fmtDateTime } from './format'
import SenderSelect from './SenderSelect'
import type { MeetingBundle, Utterance, AgendaItem, Attendee } from './types'
import { useAtriumTheme } from '../../lib/atriumTheme'

// ── dark-shell style helpers ──────────────────────────────────────────────────
const REC = '#C6402B'

/**
 * Shared surface tokens.
 *
 * These constants are module-level, so they can't read a hook — but every screen
 * in this feature (list, agenda, live, wrap) is built from them. Routing them
 * through CSS custom properties means <MeetingsView> sets the values ONCE on its
 * root (see MTG_VARS) and all four screens follow the theme together. Previously
 * they were hardcoded to the old forest-dark palette, which washed out to
 * unreadable once the pillar gained the light architectural plate.
 *
 * The fallbacks after each `var()` are the dark values, so anything rendering
 * outside the root still looks like it always did.
 */
const panel: React.CSSProperties = { background: 'var(--mtg-card, rgba(255,255,255,0.035))', border: '1px solid var(--mtg-border, rgba(255,255,255,0.10))', borderRadius: 15, backdropFilter: 'blur(16px) saturate(1.08)', WebkitBackdropFilter: 'blur(16px) saturate(1.08)', boxShadow: 'var(--mtg-shadow, 0 24px 50px -30px rgba(0,0,0,.45))' }
const pHead: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px 12px', borderBottom: '1px solid var(--mtg-line, rgba(255,255,255,0.07))' }
const pTitle: React.CSSProperties = { fontFamily: "'Inter Tight', sans-serif", fontWeight: 600, fontSize: 14.5, color: 'var(--mtg-ink, #EDF1EF)', letterSpacing: '-0.01em' }
const pSub: React.CSSProperties = { fontSize: 11.5, color: 'var(--mtg-faint, #8B928E)', marginTop: 2 }
const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: 'var(--mtg-accent, #9FE1CB)', background: 'var(--mtg-accent-bg, rgba(111,190,150,0.10))', border: '1px solid var(--mtg-accent-bd, rgba(111,190,150,0.22))', padding: '2px 8px', borderRadius: 100 }
const mono: React.CSSProperties = { fontFamily: 'monospace' }
const inputCss: React.CSSProperties = { background: 'var(--mtg-field, rgba(255,255,255,0.05))', border: '1px solid var(--mtg-border, rgba(255,255,255,0.12))', borderRadius: 8, color: 'var(--mtg-ink, #EAEEEC)', fontSize: 12.5, padding: '7px 10px', outline: 'none' }
const av = (bg = 'var(--mtg-accent-bg, rgba(111,190,150,0.14))', bd = 'var(--mtg-accent-bd, rgba(111,190,150,0.28))', c = 'var(--mtg-accent, #9FE1CB)'): React.CSSProperties => ({ width: 30, height: 30, borderRadius: 10, background: bg, border: `1px solid ${bd}`, color: c, display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 700, flex: '0 0 auto' })

/** Per-theme values for the tokens above. Applied to the feature root. */
function mtgVars(light: boolean): React.CSSProperties {
  return {
    // Silver-glass sheet in light, the same faint white wash in dark.
    ['--mtg-card' as any]: light ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.045)',
    ['--mtg-border' as any]: light ? 'rgba(35,44,55,0.12)' : 'rgba(255,255,255,0.10)',
    ['--mtg-line' as any]: light ? 'rgba(35,44,55,0.09)' : 'rgba(255,255,255,0.07)',
    ['--mtg-shadow' as any]: '0 24px 50px -30px rgba(0,0,0,.45)',
    ['--mtg-ink' as any]: light ? '#232c37' : '#eef2f5',
    ['--mtg-ink2' as any]: light ? '#5b6672' : '#9aa7b2',
    ['--mtg-faint' as any]: light ? '#8592a0' : '#697682',
    ['--mtg-sel' as any]: light ? 'rgba(110,124,142,0.10)' : 'rgba(154,168,182,0.12)',
    // Fields need to read as inset on a white sheet, not as a lighter wash.
    ['--mtg-field' as any]: light ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.05)',
    ['--mtg-accent' as any]: light ? '#2f9e6b' : '#9FE1CB',
    ['--mtg-accent-bg' as any]: light ? 'rgba(47,158,107,0.10)' : 'rgba(111,190,150,0.14)',
    ['--mtg-accent-bd' as any]: light ? 'rgba(47,158,107,0.26)' : 'rgba(111,190,150,0.28)',
    ['--mtg-glass' as any]: light ? 'rgba(255,255,255,0.66)' : 'rgba(255,255,255,0.06)',
  }
}

function btn(kind: 'primary' | 'glass' | 'rec' | 'quiet', extra: React.CSSProperties = {}): React.CSSProperties {
  const base: React.CSSProperties = { height: 36, padding: '0 15px', borderRadius: 10, fontSize: 12.5, fontWeight: 550, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, whiteSpace: 'nowrap', border: '1px solid transparent', ...extra }
  if (kind === 'primary') return { ...base, background: 'linear-gradient(180deg,#237A52,#14452F)', color: '#fff', border: '1px solid rgba(255,255,255,0.10)' }
  if (kind === 'rec') return { ...base, background: 'linear-gradient(180deg,#D4553E,#A6301D)', color: '#fff' }
  if (kind === 'quiet') return { ...base, background: 'transparent', color: 'var(--mtg-faint, #8B928E)' }
  return { ...base, background: 'var(--mtg-glass, rgba(255,255,255,0.06))', color: 'var(--mtg-ink, #EAEEEC)', border: '1px solid var(--mtg-border, rgba(255,255,255,0.12))' }
}
const initials = (name: string) => name.split(/[\s·]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const iconOf = (t?: string) => t === 'project' ? '▣' : t === 'deal' ? '◎' : t === 'capital' ? '$' : '☺'

// ── CRM picker — search projects/deals/contacts, attach one ───────────────────
function CrmPicker({ onPick, onClose }: { onPick: (l: CrmLink) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<CrmLink[]>(() => crmSearch(''))
  return (
    <div style={{ ...panel, padding: 12, marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input autoFocus value={q} onChange={e => { setQ(e.target.value); setRes(crmSearch(e.target.value)) }} placeholder="Search projects, deals, contacts…" style={{ ...inputCss, flex: 1 }} />
        <button style={btn('quiet')} onClick={onClose}>Close</button>
      </div>
      {res.length === 0 && <div style={{ fontSize: 12, color: 'var(--mtg-faint)', padding: 6 }}>No matches. Add records in the CRM pillar.</div>}
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {res.map(l => (
          <div key={l.type + l.id} onClick={() => onPick(l)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 9, borderRadius: 9, cursor: 'pointer', border: '1px solid var(--mtg-line)', marginBottom: 6 }}>
            <div style={av()}>{iconOf(l.type)}</div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, color: 'var(--mtg-ink)', fontWeight: 500 }}>{l.label}</div><div style={{ fontSize: 11.5, color: 'var(--mtg-faint)' }}>{l.sub}</div></div>
            <span style={{ color: '#6FBE96' }}>+</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Staff quick-pick — the team directory, one click to add ───────────────────
function StaffMenu({ onPick, exclude = [] }: { onPick: (m: { name: string; email: string }) => void; exclude?: string[] }) {
  const list = TEAM.filter(m => !exclude.includes(m.email))
  return (
    <div style={{ ...panel, padding: 6, marginTop: 8, maxHeight: 240, overflowY: 'auto' }}>
      {list.length === 0 && <div style={{ padding: 8, fontSize: 12, color: 'var(--mtg-faint)' }}>Everyone's already added.</div>}
      {list.map(m => (
        <div key={m.email} onClick={() => onPick(m)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, cursor: 'pointer' }}>
          <div style={av()}>{m.initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, color: 'var(--mtg-ink)' }}>{m.name}</div><div style={{ fontSize: 11, color: 'var(--mtg-faint)', ...mono }}>{m.email}</div></div>
          <span style={{ ...mono, fontSize: 9, color: 'var(--mtg-faint)' }}>{m.org}</span>
        </div>
      ))}
    </div>
  )
}

// ── root: meetings list ↔ one meeting ─────────────────────────────────────────
export default function MeetingsView() {
  const [bundles, setBundles] = useState<MeetingBundle[]>(() => loadMeetings().bundles)
  const [activeId, setActiveId] = useState<string | null>(null)

  const refresh = () => setBundles(loadMeetings().bundles)
  const openMeeting = (b: MeetingBundle) => { upsertBundle(b); refresh(); setActiveId(b.meeting.id) }
  const persist = (b: MeetingBundle) => { upsertBundle(b); setBundles(prev => prev.map(x => x.meeting.id === b.meeting.id ? b : x)) }
  const remove = (id: string) => { deleteBundle(id); refresh(); if (activeId === id) setActiveId(null) }

  const active = bundles.find(b => b.meeting.id === activeId) || null

  // One wrapper carries the theme tokens for every screen below it, so the
  // agenda / live / wrap views match the list instead of staying forest-dark.
  // It's a transparent flex passthrough — the children still own their layout.
  const light = useAtriumTheme() === 'light'
  return (
    <div style={{ ...mtgVars(light), flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {active
        ? <MeetingScreen bundle={active} persist={persist} onBack={() => { refresh(); setActiveId(null) }} />
        : <MeetingsList bundles={bundles} onNew={() => openMeeting(newBundle())} onOpen={b => setActiveId(b.meeting.id)} onDelete={remove} />}
    </div>
  )
}

// ── LIST ──────────────────────────────────────────────────────────────────────
/**
 * Meetings — two-pane workspace, per the approved screen and playbook Step 7:
 * the list on the left, and the selected meeting's agenda previewed on the right
 * ("AGENDA · ROUTED TO CRM") so you can read what a meeting covers without
 * opening it. It was one dark full-width list panel.
 *
 * Theme-aware: the pillar shell now carries the architectural plate in both
 * themes, and the design is drawn light. Colours come from the ATRIUM tokens
 * rather than the old hardcoded dark greens.
 *
 * Behaviour is unchanged — same bundles, same onOpen/onNew/onDelete, same
 * status values. Clicking a row still opens the meeting; the preview is a
 * read-only summary of what is already in the bundle.
 */
function MeetingsList({ bundles, onNew, onOpen, onDelete }: { bundles: MeetingBundle[]; onNew: () => void; onOpen: (b: MeetingBundle) => void; onDelete: (id: string) => void }) {
  const theme = useAtriumTheme()
  const light = theme === 'light'
  const T = {
    ink: light ? '#232c37' : '#eef2f5',
    ink2: light ? '#5b6672' : '#9aa7b2',
    faint: light ? '#8592a0' : '#697682',
    card: light ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.045)',
    border: light ? 'rgba(35,44,55,0.12)' : 'rgba(255,255,255,0.10)',
    line: light ? 'rgba(35,44,55,0.09)' : 'rgba(255,255,255,0.07)',
    sel: light ? 'rgba(110,124,142,0.10)' : 'rgba(154,168,182,0.12)',
    chipBg: light ? 'rgba(47,158,107,0.10)' : 'rgba(87,192,138,0.14)',
  }
  const badge = (s: string): [string, string] => ({
    scheduled: [T.faint, 'Draft'], recording: [REC, 'Recording'],
    ended: [light ? '#5878a8' : '#6f92c9', 'Ended'], sent: [light ? '#2f9e6b' : '#57c08a', 'Sent'],
  } as Record<string, [string, string]>)[s] || [T.faint, s]

  // The pane on the right previews whichever meeting is selected; first by default.
  const [selId, setSelId] = useState<string | null>(null)
  const sel = bundles.find(b => b.meeting.id === selId) ?? bundles[0]

  const panelStyle: React.CSSProperties = {
    background: T.card, border: `1px solid ${T.border}`, borderRadius: 15,
    backdropFilter: 'blur(16px) saturate(1.08)', WebkitBackdropFilter: 'blur(16px) saturate(1.08)',
    boxShadow: '0 24px 50px -30px rgba(0,0,0,.45)', overflow: 'hidden',
  }
  const eyebrow: React.CSSProperties = {
    fontSize: 9.5, letterSpacing: '0.22em', color: T.faint, textTransform: 'uppercase', fontWeight: 600,
  }

  return (
    <div style={{ flex: 1, minHeight: 0, color: T.ink, padding: '26px 30px 80px', overflowY: 'auto', maxWidth: 1300, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-serif, "Cormorant Garamond", serif)', fontWeight: 600, fontSize: 40, lineHeight: 1, color: T.ink }}>Meetings</div>
          <div style={{ fontSize: 13, color: T.ink2, marginTop: 10 }}>Agendas, live recording &amp; translation, records routed to the CRM.</div>
        </div>
        <button style={{ ...btn('primary'), marginLeft: 'auto', height: 40 }} onClick={onNew}>+ New meeting</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, alignItems: 'start' }} className="mtg-two">
        {/* ── Left: the list ── */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px' }}>
            <span style={eyebrow}>All meetings</span>
            <span style={{ ...eyebrow, letterSpacing: 0 }}>{bundles.length}</span>
          </div>
          {bundles.length === 0 && <div style={{ padding: '30px 20px', color: T.faint, fontSize: 13 }}>No meetings yet — click “New meeting” to build an agenda.</div>}
          {bundles.map(b => {
            const [col, lbl] = badge(b.meeting.status)
            const isSel = sel && b.meeting.id === sel.meeting.id
            return (
              <div key={b.meeting.id}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderTop: `1px solid ${T.line}`, cursor: 'pointer', background: isSel ? T.sel : 'transparent', transition: '.15s' }}
                onClick={() => setSelId(b.meeting.id)}
                onDoubleClick={() => onOpen(b)}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: T.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: light ? '#2f9e6b' : '#57c08a', flex: 'none', fontSize: 14 }}>▤</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: T.ink }}>{b.meeting.title}</div>
                  <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>{fmtDateTime(b.meeting.startsAt)} · {b.agenda.length} items · {b.attendees.length} attendees{b.meeting.locationLabel ? ` · ${b.meeting.locationLabel}` : ''}</div>
                </div>
                <span style={{ ...mono, fontSize: 8.5, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 600, color: col, background: `${col}1f`, borderRadius: 14, padding: '5px 11px' }}>{lbl}</span>
                <button style={{ ...btn('quiet'), width: 30, height: 30, padding: 0 }} title="Delete"
                  onClick={e => { e.stopPropagation(); if (confirm('Delete this meeting?')) onDelete(b.meeting.id) }}>×</button>
              </div>
            )
          })}
          {bundles.length > 0 && (
            <div style={{ padding: '12px 20px 16px', fontSize: 10.5, color: T.faint, borderTop: `1px solid ${T.line}` }}>
              Click to preview · double-click to open
            </div>
          )}
        </div>

        {/* ── Right: agenda preview of the selected meeting ── */}
        {sel && (
          <div style={{ ...panelStyle, padding: '22px 24px' }}>
            <div style={eyebrow}>Agenda · routed to CRM</div>
            <h3 style={{ fontFamily: 'var(--font-serif, "Cormorant Garamond", serif)', fontSize: 22, fontWeight: 500, margin: '8px 0 0', color: T.ink }}>{sel.meeting.title}</h3>
            <div style={{ fontSize: 12, color: T.ink2, marginTop: 6 }}>
              {fmtDateTime(sel.meeting.startsAt)}{sel.meeting.locationLabel ? ` · ${sel.meeting.locationLabel}` : ''}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              {sel.meeting.status === 'recording' && (
                <span style={{ ...mono, fontSize: 8.5, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 600, color: REC, border: `1px solid ${REC}55`, borderRadius: 14, padding: '5px 11px' }}>● Recording</span>
              )}
              <span style={{ ...mono, fontSize: 8.5, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 600, color: T.ink2, background: T.sel, borderRadius: 14, padding: '5px 11px' }}>
                {sel.attendees.length} attendee{sel.attendees.length === 1 ? '' : 's'}
              </span>
            </div>

            {sel.agenda.length === 0 && <div style={{ fontSize: 12.5, color: T.faint, marginTop: 18 }}>No agenda items yet.</div>}
            {sel.agenda.map((a, i) => (
              <div key={a.id ?? i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderTop: i === 0 ? 'none' : `1px solid ${T.line}`, marginTop: i === 0 ? 10 : 0 }}>
                <span style={{ ...mono, fontSize: 11, color: T.faint, flex: 'none' }}>{String(i + 1).padStart(2, '0')}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: T.ink }}>{a.title || 'Item'}</div>
                  {a.ownerId && <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>Owner: {a.ownerId}</div>}
                </div>
              </div>
            ))}

            <button style={{ ...btn('quiet'), marginTop: 18, width: '100%' }} onClick={() => onOpen(sel)}>Open meeting →</button>
          </div>
        )}
      </div>

      <style>{`@media(max-width:980px){.mtg-two{grid-template-columns:1fr !important}}`}</style>
    </div>
  )
}

// ── ONE MEETING ────────────────────────────────────────────────────────────────
function MeetingScreen({ bundle, persist, onBack }: { bundle: MeetingBundle; persist: (b: MeetingBundle) => void; onBack: () => void }) {
  const [view, setView] = useState<'agenda' | 'live' | 'wrap'>('agenda')
  const [cal, setCal] = useState<string | null>(null)
  const [calBusy, setCalBusy] = useState(false)
  const light = useAtriumTheme() === 'light'   // only for `colorScheme` on native date pickers
  const m = bundle.meeting
  const setMeeting = (patch: Partial<typeof m>) => persist({ ...bundle, meeting: { ...m, ...patch } })

  const scheduleOutlook = async () => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
    const startDate = new Date(m.startsAt)
    if (isNaN(startDate.getTime())) { setCal('Set a valid date/time first.'); return }
    const start = fmt(startDate), end = fmt(new Date(startDate.getTime() + (m.durationMin || 30) * 60000))
    const attendees = bundle.attendees.map(a => a.email).filter(Boolean)
    const body = `<b>Agenda</b><ul>${bundle.agenda.map(a => `<li>${a.title || 'Item'}${a.ownerId ? ` — ${a.ownerId}` : ''}</li>`).join('')}</ul>`
    setCalBusy(true); setCal('Scheduling…')
    try {
      const r = await fetch('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizer: m.organizer || 'boardroom@haavn.au', subject: m.title, start, end, attendees, body, location: m.locationLabel }) })
      const j = await r.json().catch(() => ({}))
      if (r.status === 200) { setMeeting({ calendarEventId: j.id, teamsJoinUrl: j.joinUrl || undefined, webLink: j.webLink || undefined }); setCal(`✓ In Outlook · boardroom@haavn.au${j.joinUrl ? ' · Teams link created' : ''}`) }
      else if (r.status === 501) setCal('Calendar not connected yet (needs Calendars.ReadWrite on the app).')
      else setCal(`Couldn't schedule — ${j.error || 'error ' + r.status}`)
    } catch (e: any) { setCal(`Failed: ${String(e?.message || e)}`) }
    setCalBusy(false)
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', color: 'var(--mtg-ink)' }}>
      {/* Meeting chrome — same silver-glass language as the list screen: serif
          title, hairline rule, eyebrow tabs. Was a dark bar with a white title
          and grey tabs, which is what washed out on the light plate. */}
      <div style={{ padding: '18px 30px 14px', borderBottom: '1px solid var(--mtg-line)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button style={btn('quiet')} onClick={onBack}>← All meetings</button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input value={m.title} onChange={e => setMeeting({ title: e.target.value })}
            style={{ width: '100%', background: 'none', border: 'none', color: 'var(--mtg-ink)', fontFamily: 'var(--font-serif, "Cormorant Garamond", serif)', fontWeight: 600, fontSize: 28, letterSpacing: '-0.01em', outline: 'none' }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="datetime-local" value={m.startsAt} onChange={e => setMeeting({ startsAt: e.target.value })} style={{ ...inputCss, padding: '4px 8px', fontSize: 11.5, colorScheme: light ? 'light' : 'dark' }} />
            <input value={m.locationLabel || ''} onChange={e => setMeeting({ locationLabel: e.target.value })} placeholder="Location" style={{ ...inputCss, padding: '4px 8px', fontSize: 11.5, width: 180 }} />
          </div>
        </div>
        <div style={{ display: 'inline-flex', background: 'var(--mtg-sel)', borderRadius: 12, padding: 3, border: '1px solid var(--mtg-border)', alignSelf: 'flex-start' }}>
          {(['agenda', 'live', 'wrap'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ border: 0, background: view === v ? 'var(--mtg-card)' : 'transparent', color: view === v ? 'var(--mtg-ink)' : 'var(--mtg-faint)', fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: view === v ? 700 : 600, padding: '9px 16px', borderRadius: 9, cursor: 'pointer', boxShadow: view === v ? '0 2px 8px rgba(0,0,0,.10)' : 'none', transition: '.15s' }}>
              {v === 'wrap' ? 'Wrap-up' : v}
            </button>
          ))}
        </div>
        <div style={{ flexBasis: '100%', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
          <button style={btn('glass')} disabled={calBusy} onClick={scheduleOutlook}>📅 {m.calendarEventId ? 'Re-sync Outlook' : 'Schedule in Outlook'}</button>
          {m.teamsJoinUrl && <a href={m.teamsJoinUrl} target="_blank" rel="noreferrer" style={{ ...btn('primary'), textDecoration: 'none' }}>Join Teams meeting →</a>}
          {m.webLink && <a href={m.webLink} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: 'var(--mtg-faint)' }}>Open in Outlook</a>}
          {cal && <span style={{ fontSize: 11.5, color: 'var(--mtg-accent)', ...mono }}>{cal}</span>}
        </div>
      </div>
      <div style={{ padding: '22px 30px 80px', overflowY: 'auto', flex: 1, maxWidth: 1300, width: '100%' }}>
        {view === 'agenda' && <Agenda bundle={bundle} persist={persist} onStart={() => setView('live')} />}
        {view === 'live' && <Live bundle={bundle} persist={persist} onEnd={() => setView('wrap')} />}
        {view === 'wrap' && <Wrap bundle={bundle} persist={persist} />}
      </div>
    </div>
  )
}

// ── AGENDA (full CRUD + CRM attach + attendees) ───────────────────────────────
function Agenda({ bundle, persist, onStart }: { bundle: MeetingBundle; persist: (b: MeetingBundle) => void; onStart: () => void }) {
  const [pickFor, setPickFor] = useState<string | null>(null)     // agenda item id being linked
  const [showPull, setShowPull] = useState(false)
  const [newAtt, setNewAtt] = useState({ name: '', email: '' })
  const [attPick, setAttPick] = useState(false)
  const [staffPick, setStaffPick] = useState(false)
  const totalMin = bundle.agenda.reduce((s, a) => s + (a.minutes || 0), 0)

  const setAgenda = (agenda: AgendaItem[]) => persist({ ...bundle, agenda })
  const editItem = (id: string, patch: Partial<AgendaItem>) => setAgenda(bundle.agenda.map(a => a.id === id ? { ...a, ...patch } : a))
  const addItem = () => setAgenda([...bundle.agenda, { id: newId('ag'), meetingId: bundle.meeting.id, order: bundle.agenda.length + 1, title: '', ownerId: null, minutes: 10, linkType: null, linkId: null, state: 'pending' }])
  const delItem = (id: string) => setAgenda(bundle.agenda.filter(a => a.id !== id).map((a, i) => ({ ...a, order: i + 1 })))
  const move = (id: string, dir: -1 | 1) => {
    const arr = [...bundle.agenda]; const i = arr.findIndex(a => a.id === id); const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]; setAgenda(arr.map((a, k) => ({ ...a, order: k + 1 })))
  }
  const attachLink = (id: string, l: CrmLink) => { editItem(id, { linkType: l.type, linkId: l.id, title: bundle.agenda.find(a => a.id === id)?.title || l.label }); setPickFor(null) }
  const linkLabel = (a: AgendaItem) => a.linkId ? crmSearch('').find(x => x.id === a.linkId)?.label || a.linkType : null

  const setAttendees = (attendees: Attendee[]) => persist({ ...bundle, attendees })
  const addAttendee = (name: string, email: string, role?: string) => {
    if (!name.trim() && !email.trim()) return
    setAttendees([...bundle.attendees, { id: newId('at'), meetingId: bundle.meeting.id, displayName: name.trim() || email, email: email.trim(), roleLabel: role, speaksLanguage: 'en' }])
    setNewAtt({ name: '', email: '' })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr)', gap: 16 }} className="mtg-grid">
      <div style={panel}>
        <div style={pHead}>
          <div><div style={pTitle}>Agenda</div><div style={pSub}>{bundle.agenda.length} items · {totalMin} min</div></div>
          <button style={btn('glass', { height: 32 })} onClick={addItem}>+ Add item</button>
        </div>
        {bundle.agenda.length === 0 && <div style={{ padding: 20, color: 'var(--mtg-faint)', fontSize: 13 }}>No items yet. Click "+ Add item", or "Pull from CRM" on the right to build the agenda from a project, deal or contact.</div>}
        {bundle.agenda.map((a, i) => (
          <div key={a.id} style={{ padding: '12px 18px', borderTop: '1px solid var(--mtg-line)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(111,190,150,0.12)', color: 'var(--mtg-accent)', ...mono, fontSize: 11, fontWeight: 600, display: 'grid', placeItems: 'center', flex: '0 0 auto', marginTop: 3 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input value={a.title} onChange={e => editItem(a.id, { title: e.target.value })} placeholder="Agenda item…" style={{ width: '100%', background: 'none', border: 'none', color: 'var(--mtg-ink)', fontSize: 14, fontWeight: 500, outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {a.linkId && <span style={chip}>{iconOf(a.linkType || '')} {linkLabel(a)}<span onClick={() => editItem(a.id, { linkType: null, linkId: null })} style={{ cursor: 'pointer', marginLeft: 2 }}>×</span></span>}
                  {!a.linkId && <button style={{ ...btn('quiet', { height: 24, padding: '0 8px', fontSize: 11 }) }} onClick={() => setPickFor(pickFor === a.id ? null : a.id)}>+ Link CRM</button>}
                  <input value={a.ownerId || ''} onChange={e => editItem(a.id, { ownerId: e.target.value })} placeholder="Owner" style={{ ...inputCss, padding: '3px 8px', fontSize: 11, width: 90 }} />
                  <input type="number" value={a.minutes} onChange={e => editItem(a.id, { minutes: parseInt(e.target.value) || 0 })} style={{ ...inputCss, padding: '3px 8px', fontSize: 11, width: 54 }} /><span style={{ fontSize: 11, color: 'var(--mtg-faint)' }}>min</span>
                </div>
                {pickFor === a.id && <CrmPicker onPick={l => attachLink(a.id, l)} onClose={() => setPickFor(null)} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button style={{ ...btn('quiet', { height: 22, width: 24, padding: 0, fontSize: 12 }) }} onClick={() => move(a.id, -1)} title="Up">↑</button>
                <button style={{ ...btn('quiet', { height: 22, width: 24, padding: 0, fontSize: 12 }) }} onClick={() => move(a.id, 1)} title="Down">↓</button>
                <button style={{ ...btn('quiet', { height: 22, width: 24, padding: 0, fontSize: 14 }) }} onClick={() => delItem(a.id)} title="Delete">×</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Pull from CRM */}
        <div style={panel}>
          <div style={pHead}><div><div style={pTitle}>Pull from CRM</div><div style={pSub}>Add an agenda item from a live record</div></div>
            <button style={btn('glass', { height: 30 })} onClick={() => setShowPull(s => !s)}>{showPull ? 'Close' : 'Open'}</button></div>
          {showPull && <div style={{ padding: 12 }}><CrmPicker onClose={() => setShowPull(false)} onPick={l => { setAgenda([...bundle.agenda, { id: newId('ag'), meetingId: bundle.meeting.id, order: bundle.agenda.length + 1, title: l.label, ownerId: null, minutes: 10, linkType: l.type, linkId: l.id, state: 'pending' }]); }} /></div>}
        </div>

        {/* Attendees */}
        <div style={panel}>
          <div style={pHead}><div><div style={pTitle}>Attendees</div><div style={pSub}>{bundle.attendees.length} · staff, team + CRM contacts</div></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={btn('glass', { height: 30 })} onClick={() => { setStaffPick(p => !p); setAttPick(false) }}>{staffPick ? 'Close' : '+ Staff'}</button>
              <button style={btn('glass', { height: 30 })} onClick={() => { setAttPick(p => !p); setStaffPick(false) }}>{attPick ? 'Close' : 'CRM'}</button>
            </div></div>
          {staffPick && <div style={{ padding: 12 }}><StaffMenu exclude={bundle.attendees.map(a => a.email)} onPick={m => addAttendee(m.name, m.email)} /></div>}
          {attPick && <div style={{ padding: 12 }}><CrmPicker onClose={() => setAttPick(false)} onPick={l => { if (l.type === 'contact') { addAttendee(l.label, '', l.sub.replace('Contact · ', '')) } else { addAttendee(l.label, '') } setAttPick(false) }} /></div>}
          <div style={{ padding: '6px 8px' }}>
            {bundle.attendees.map(at => (
              <div key={at.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 9 }}>
                <div style={av()}>{initials(at.displayName)}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, color: 'var(--mtg-ink)' }}>{at.displayName}</div>{at.email && <div style={{ fontSize: 11, color: 'var(--mtg-faint)', ...mono }}>{at.email}</div>}</div>
                <button style={{ ...btn('quiet', { width: 26, height: 26, padding: 0 }) }} onClick={() => setAttendees(bundle.attendees.filter(x => x.id !== at.id))}>×</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, padding: '8px 10px' }}>
              <input value={newAtt.name} onChange={e => setNewAtt({ ...newAtt, name: e.target.value })} placeholder="Name" style={{ ...inputCss, flex: 1 }} />
              <input value={newAtt.email} onChange={e => setNewAtt({ ...newAtt, email: e.target.value })} placeholder="Email" style={{ ...inputCss, flex: 1.2 }} onKeyDown={e => { if (e.key === 'Enter') addAttendee(newAtt.name, newAtt.email) }} />
              <button style={btn('glass')} onClick={() => addAttendee(newAtt.name, newAtt.email)}>Add</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button style={btn('rec')} onClick={() => { persist({ ...bundle, meeting: { ...bundle.meeting, status: 'recording' } }); onStart() }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff' }} />Start recording</button>
        </div>
      </div>
    </div>
  )
}

// ── LIVE ──────────────────────────────────────────────────────────────────────
function Live({ bundle, persist, onEnd }: { bundle: MeetingBundle; persist: (b: MeetingBundle) => void; onEnd: () => void }) {
  const [utts, setUtts] = useState<Utterance[]>(bundle.utterances || [])
  const [secs, setSecs] = useState(0)
  const [mode, setMode] = useState<'azure' | 'mock' | '…'>('…')
  const [recording, setRecording] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)
  const ctrlRef = useRef<EngineController | null>(null)

  useEffect(() => {
    let stopped = false
    startTranscription(bundle.meeting.id, u => setUtts(prev => { const i = prev.findIndex(x => x.id === u.id); if (i >= 0) { const n = [...prev]; n[i] = u; return n } return [...prev, u] }))
      .then(c => { if (stopped) c.stop(); else { ctrlRef.current = c; setMode(c.mode) } })
    const t = setInterval(() => setSecs(s => s + 1), 1000)
    return () => { stopped = true; ctrlRef.current?.stop(); clearInterval(t) }
  }, [bundle.meeting.id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [utts.length])
  const clock = (n: number) => `${String(Math.floor(n / 3600)).padStart(2, '0')}:${String(Math.floor(n / 60) % 60).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
  const finals = utts.filter(u => u.isFinal)

  const stopAndWrap = () => { ctrlRef.current?.stop(); setRecording(false); persist({ ...bundle, utterances: finals, meeting: { ...bundle.meeting, status: 'ended' } }); onEnd() }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', ...panel, marginBottom: 16 }}>
        <span className={recording ? 'mtg-recdot' : ''} style={{ width: 11, height: 11, borderRadius: '50%', background: recording ? REC : 'var(--mtg-faint)', flex: '0 0 auto' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--mtg-ink)' }}>{recording ? 'Recording' : 'Stopped'}</span>
        <span style={{ ...mono, fontSize: 13, color: '#B9C0BC' }}>{clock(secs)}</span>
        <div className="mtg-wave" style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 24, flex: 1, maxWidth: 200 }} aria-hidden>{Array.from({ length: 12 }).map((_, i) => <i key={i} style={{ width: 3, borderRadius: 2, background: recording ? '#38996B' : '#3A3F3C', animationDelay: `${(i % 5) * 0.1}s`, animationPlayState: recording ? 'running' : 'paused' }} />)}</div>
        <span style={{ ...mono, fontSize: 10, color: mode === 'azure' ? 'var(--mtg-accent)' : 'var(--mtg-faint)', border: '1px solid rgba(255,255,255,0.14)', padding: '4px 9px', borderRadius: 100 }}>{mode === 'azure' ? '● Azure live · 中文→EN' : mode === 'mock' ? 'demo transcript' : 'connecting…'}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16 }} className="mtg-grid">
        <div style={panel}>
          <div style={pHead}><div><div style={pTitle}>Live transcript</div><div style={pSub}>Original + English · speaker-labelled</div></div></div>
          <div style={{ padding: '6px 0' }}>
            {utts.length === 0 && <div style={{ padding: '30px 18px', color: 'var(--mtg-faint)', fontSize: 13 }}>{mode === 'azure' ? 'Listening… speak and it will transcribe + translate live.' : 'Listening…'}</div>}
            {utts.map(u => <UtteranceRow key={u.id} u={u} />)}
            <div ref={endRef} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={panel}>
            <div style={pHead}><div><div style={pTitle}>Agenda</div><div style={pSub}>Tick off as you go</div></div></div>
            <div style={{ padding: '4px 0' }}>
              {bundle.agenda.map(a => (
                <div key={a.id} onClick={() => persist({ ...bundle, agenda: bundle.agenda.map(x => x.id === a.id ? { ...x, state: x.state === 'done' ? 'pending' : 'done' } : x) })} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', borderTop: '1px solid var(--mtg-line)', fontSize: 13, cursor: 'pointer' }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', flex: '0 0 auto', border: `2px solid ${a.state === 'done' ? '#237A52' : 'rgba(255,255,255,0.2)'}`, background: a.state === 'done' ? '#237A52' : 'transparent', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 9 }}>{a.state === 'done' ? '✓' : ''}</span>
                  <span style={{ color: a.state === 'done' ? 'var(--mtg-faint)' : '#D6DAD9', textDecoration: a.state === 'done' ? 'line-through' : 'none' }}>{a.title || 'Untitled'}</span>
                </div>
              ))}
              {bundle.agenda.length === 0 && <div style={{ padding: '10px 18px', color: 'var(--mtg-faint)', fontSize: 12 }}>No agenda items.</div>}
            </div>
          </div>
          <div style={panel}>
            <div style={{ padding: '16px 18px' }}>
              {[['Elapsed', clock(secs)], ['Lines captured', String(finals.length)], ['Translated', String(finals.filter(u => u.sourceLang === 'zh').length)]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--mtg-line)' }}><span style={{ fontSize: 12.5, color: 'var(--mtg-faint)' }}>{k}</span><span style={{ ...mono, fontSize: 13, fontWeight: 600, color: 'var(--mtg-ink)' }}>{v}</span></div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '0 18px 16px' }}>
              <button style={{ ...btn('glass'), flex: 1 }} onClick={() => { if (recording) { ctrlRef.current?.stop(); setRecording(false) } }}>{recording ? 'Stop' : 'Stopped'}</button>
              <button style={{ ...btn('primary'), flex: 1 }} onClick={stopAndWrap}>End &amp; wrap up</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function UtteranceRow({ u }: { u: Utterance }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '104px 1fr', gap: 14, padding: '13px 18px', borderTop: '1px solid var(--mtg-line)' }}>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--mtg-ink)' }}>{u.speaker}</div>
        <div style={{ ...mono, fontSize: 10.5, color: 'var(--mtg-faint)' }}>{u.isFinal ? `${String(Math.floor(u.tsMs / 60000)).padStart(2, '0')}:${String(Math.floor(u.tsMs / 1000) % 60).padStart(2, '0')}` : 'now'}</div>
      </div>
      <div>
        {u.sourceLang === 'zh' && <div style={{ fontFamily: "'Noto Sans SC', sans-serif", fontSize: 14, color: 'var(--mtg-faint)', lineHeight: 1.5 }}>{u.original}{!u.isFinal && <Caret />}</div>}
        <div style={{ fontSize: 14.5, color: u.isFinal ? '#E6EBE8' : 'var(--mtg-faint)', lineHeight: 1.55, marginTop: u.sourceLang === 'zh' ? 5 : 0 }}>{u.sourceLang === 'zh' ? (u.translation || '') : u.original}{!u.isFinal && u.sourceLang === 'en' && <Caret />}</div>
      </div>
    </div>
  )
}
const Caret = () => <span className="mtg-caret" style={{ display: 'inline-block', width: 2, height: 15, background: '#6FBE96', marginLeft: 2, verticalAlign: '-3px' }} />

// ── WRAP-UP / SEND ──────────────────────────────────────────────────────────
function Wrap({ bundle, persist }: { bundle: MeetingBundle; persist: (b: MeetingBundle) => void }) {
  const rec = bundle.record
  const [from, setFrom] = useState<Sender>(defaultSender())
  const [routeOpts] = useState<CrmLink[]>(() => crmSearch('').slice(0, 6))
  const primary = bundle.meeting.linkedId
  const [route, setRoute] = useState<CrmLink | null>(() => crmSearch('').find(l => l.id === primary) || null)
  const [incSummary, setIncSummary] = useState(true)
  const [makeTasks, setMakeTasks] = useState(true)
  const [recips, setRecips] = useState<{ name: string; email: string }[]>(() => bundle.attendees.filter(a => a.email).map(a => ({ name: a.displayName, email: a.email })))
  const [newRecip, setNewRecip] = useState('')
  const [recStaff, setRecStaff] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Summary/decisions/actions are editable; seeded from the record if present.
  const [summary, setSummary] = useState(rec?.summary || autoSummary(bundle))
  const [decisions, setDecisions] = useState((rec?.decisions || []).join('\n'))
  const [actions, setActions] = useState((rec?.actions?.length ? rec.actions : detectActions(bundle)).map(a => `${a.text}${a.dueLabel ? ' · ' + a.dueLabel : ''}${a.ownerId ? ' · ' + a.ownerId : ''}`).join('\n'))

  const content = () => ({
    summary,
    decisions: decisions.split('\n').map(s => s.trim()).filter(Boolean),
    actions: actions.split('\n').map(s => s.trim()).filter(Boolean).map(line => { const [text, due, owner] = line.split('·').map(x => x.trim()); return { text, dueLabel: due, ownerId: owner } }),
  })

  const saveRecord = (sentFrom?: string) => {
    const c = content()
    persist({ ...bundle, meeting: { ...bundle.meeting, status: sentFrom ? 'sent' : bundle.meeting.status },
      record: { id: rec?.id || newId('rec'), meetingId: bundle.meeting.id, summary: c.summary, decisions: c.decisions, actions: c.actions, exports: {}, routedTo: route ? { type: route.type, id: route.id } : null, sentAt: sentFrom ? new Date().toISOString() : rec?.sentAt, sentFrom: sentFrom || rec?.sentFrom } })
  }

  const send = async (alsoEmail: boolean) => {
    saveRecord(alsoEmail ? from.email : undefined)
    if (!alsoEmail) { setStatus(`✓ Saved to CRM${route ? ` · ${route.label}` : ''}.`); return }
    if (recips.length === 0) { setStatus('Add at least one recipient.'); return }
    setBusy(true); setStatus('Sending…')
    try {
      const c = content()
      const attachments = [
        { name: 'Transcript_EN.pdf', contentType: 'application/pdf', contentBytesBase64: transcriptPdfBase64(bundle, c, false) },
        { name: 'Transcript_中英.pdf', contentType: 'application/pdf', contentBytesBase64: transcriptPdfBase64(bundle, c, true) },
      ]
      const r = await fetch('/api/send-mail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: from.email, to: recips.map(x => x.email), subject: `Meeting record — ${bundle.meeting.title}`, html: incSummary ? emailHtml(bundle, c) : '<p>Meeting record attached.</p>', attachments }) })
      if (r.status === 200) setStatus(`✓ Saved to CRM & emailed from ${from.email} to ${recips.length} recipient(s).`)
      else if (r.status === 501) setStatus('✓ Saved to CRM. Email isn\'t connected yet (Microsoft 365).')
      else { const e = await r.json().catch(() => ({})); setStatus(`✓ Saved. Email not sent — ${e.error || 'error ' + r.status}`) }
    } catch (e: any) { setStatus(`✓ Saved. Email failed: ${String(e?.message || e)}`) }
    setBusy(false)
  }

  const field: React.CSSProperties = { marginBottom: 15 }
  const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: '#B9C0BC', display: 'block', marginBottom: 7 }
  const ta: React.CSSProperties = { ...inputCss, width: '100%', minHeight: 60, resize: 'vertical', lineHeight: 1.5 }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16 }} className="mtg-grid">
      <div style={panel}>
        <div style={pHead}><div><div style={pTitle}>Meeting record</div><div style={pSub}>Editable · {bundle.utterances.length} transcript lines</div></div></div>
        <div style={{ padding: '16px 18px' }}>
          <div style={field}><label style={label}>Summary</label><textarea value={summary} onChange={e => setSummary(e.target.value)} style={{ ...ta, minHeight: 90 }} /></div>
          <div style={field}><label style={label}>Decisions <span style={{ color: 'var(--mtg-faint)', fontWeight: 400 }}>(one per line)</span></label><textarea value={decisions} onChange={e => setDecisions(e.target.value)} style={ta} /></div>
          <div style={field}><label style={label}>Actions <span style={{ color: 'var(--mtg-faint)', fontWeight: 400 }}>(one per line · owner · due)</span></label><textarea value={actions} onChange={e => setActions(e.target.value)} style={ta} /></div>
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
                  <div key={r.id} onClick={() => setRoute(sel ? null : r)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 10, border: `1.5px solid ${sel ? 'rgba(111,190,150,0.5)' : 'var(--mtg-border)'}`, borderRadius: 11, cursor: 'pointer', background: sel ? 'rgba(35,122,82,0.14)' : 'transparent' }}>
                    <div style={av()}>{iconOf(r.type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mtg-ink)' }}>{r.label}</div><div style={{ fontSize: 11.5, color: 'var(--mtg-faint)' }}>{r.sub}</div></div>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${sel ? '#6FBE96' : 'rgba(255,255,255,0.2)'}`, background: sel ? '#237A52' : 'transparent', flex: '0 0 auto' }} />
                  </div>
                )
              })}
              {routeOpts.length === 0 && <div style={{ fontSize: 12, color: 'var(--mtg-faint)' }}>No CRM records yet — add them in the CRM pillar.</div>}
            </div>
          </div>

          <div style={field}><label style={label}>Send from</label><SenderSelect value={from} onChange={setFrom} /></div>

          <div style={field}>
            <label style={label}>To</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
              {recips.map((r, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 8px 6px 6px', background: 'rgba(111,190,150,0.10)', border: '1px solid rgba(111,190,150,0.22)', borderRadius: 100, color: 'var(--mtg-accent)' }}>
                  <span style={{ ...av(), width: 18, height: 18, borderRadius: 6, fontSize: 8 }}>{initials(r.name || r.email)}</span>{r.name || r.email}
                  <span onClick={() => setRecips(recips.filter((_, j) => j !== i))} style={{ cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</span>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={newRecip} onChange={e => setNewRecip(e.target.value)} placeholder="Add email…" style={{ ...inputCss, flex: 1 }} onKeyDown={e => { if (e.key === 'Enter' && newRecip.includes('@')) { setRecips([...recips, { name: newRecip.split('@')[0], email: newRecip.trim() }]); setNewRecip('') } }} />
              <button style={btn('glass')} onClick={() => { if (newRecip.includes('@')) { setRecips([...recips, { name: newRecip.split('@')[0], email: newRecip.trim() }]); setNewRecip('') } }}>Add</button>
              <button style={btn('glass')} onClick={() => setRecStaff(s => !s)}>{recStaff ? 'Close' : '+ Staff'}</button>
            </div>
            {recStaff && <StaffMenu exclude={recips.map(r => r.email)} onPick={m => setRecips([...recips, { name: m.name, email: m.email }])} />}
          </div>

          <div style={field}><label style={label}>Attachments</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{['Transcript_EN.pdf', 'Transcript_中英.pdf'].map(f => <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '8px 11px', border: '1px solid var(--mtg-border)', borderRadius: 9, background: 'var(--mtg-sel)', color: '#B9C0BC' }}>📄 {f}</span>)}</div></div>

          <Toggle on={incSummary} set={setIncSummary} label="Include summary & actions in email body" />
          <Toggle on={makeTasks} set={setMakeTasks} label="Create CRM tasks from actions" />
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '16px 18px', borderTop: '1px solid var(--mtg-line)' }}>
          <button style={{ ...btn('glass'), flex: 1 }} disabled={busy} onClick={() => send(false)}>Save only</button>
          <button style={{ ...btn('primary'), flex: 1.4, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => send(true)}>{busy ? 'Sending…' : 'Save to CRM & send'}</button>
        </div>
        {status && <div style={{ padding: '10px 18px 16px', fontSize: 11.5, color: 'var(--mtg-accent)', ...mono }}>{status}</div>}
      </div>
    </div>
  )
}

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderTop: '1px solid var(--mtg-line)', fontSize: 13, color: '#D6DAD9' }}>
      <span>{label}</span>
      <button role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)} style={{ width: 42, height: 25, borderRadius: 100, background: on ? '#237A52' : 'var(--mtg-border)', position: 'relative', cursor: 'pointer', border: 'none', flex: '0 0 auto' }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 19 : 2, width: 21, height: 21, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
      </button>
    </div>
  )
}

// Lightweight auto-content from the transcript (until the Claude summary pass is wired).
function autoSummary(b: MeetingBundle): string {
  const lines = b.utterances.filter(u => u.isFinal).map(u => u.sourceLang === 'zh' ? (u.translation || '') : u.original).filter(Boolean)
  if (!lines.length) return `${b.meeting.title}. ${b.agenda.length} agenda items${b.meeting.locationLabel ? ` · ${b.meeting.locationLabel}` : ''}.`
  return lines.slice(0, 4).join(' ')
}
function detectActions(b: MeetingBundle): { text: string; ownerId?: string; dueLabel?: string }[] {
  return b.utterances.filter(u => u.isFinal).map(u => u.sourceLang === 'zh' ? (u.translation || '') : u.original)
    .filter(t => /\b(send|confirm|update|follow up|prepare|review|action|by (next|monday|tuesday|wednesday|thursday|friday|wed))\b/i.test(t))
    .slice(0, 6).map(text => ({ text }))
}
