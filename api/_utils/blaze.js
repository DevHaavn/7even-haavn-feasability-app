// ATRIUM connector for Blaze: the data layer.
// Pure transforms (tested in src/lib/__tests__/blaze.test.ts) plus a small
// capital_kv client that does a safe read-modify-write: it only writes if the row's
// updated_at is unchanged since the read, and retries once on a lost race.
// Never overwrites a blob from a stale copy, because people edit these live.

const SUPA_URL = process.env.SUPABASE_URL || 'https://vgvavmnqrdgcnledztyk.supabase.co'
const DEFAULT_BY = 'Blaze'

// Agents are Jamie's and the directors' assistants. Each has its own secret in its own
// Vercel setting: BLAZE_SECRET for Blaze, AGENT_SECRET_<NAME> for any other (AGENT_SECRET_JULIO
// makes "Julio"). The secret in the connector URL says who is calling, so every change is stamped
// with, and logged under, the right agent.
const crypto = require('crypto')
const hash = (v) => crypto.createHash('sha256').update(String(v)).digest()
function agentRegistry(env = process.env) {
  const list = []
  if (env.BLAZE_SECRET && env.BLAZE_SECRET.length >= 24) list.push({ name: 'Blaze', secret: env.BLAZE_SECRET })
  Object.keys(env).forEach((k) => {
    const m = k.match(/^AGENT_SECRET_([A-Z0-9]+)$/)
    if (m && env[k] && env[k].length >= 24) list.push({ name: m[1][0] + m[1].slice(1).toLowerCase(), secret: env[k] })
  })
  return list
}
// Returns the agent's name for a matching secret, or null. Checks every agent so timing does not reveal which.
function identifyAgent(given, env = process.env) {
  if (typeof given !== 'string' || !given) return null
  const g = hash(given); let found = null
  agentRegistry(env).forEach((a) => { if (crypto.timingSafeEqual(g, hash(a.secret))) found = a.name })
  return found
}

// Blaze (Jamie's EA) works on tasks only. It does not touch meetings, the boardroom,
// CRM, capital or anything else in ATRIUM; that is the gatekeeper's job.
const KEYS = {
  workflow: 'nav_workspace',        // ATRIUM Workflow workspace; tasks live in .actions
  boardroom: 'haavn_boardroom',     // Meeting Management: { meetings: [...], currentId, ... }
  audit: 'blaze_audit',             // { entries: [{ at, tool, ok, taskId, note }] }, newest last, capped
}
const AUDIT_MAX = 1000

const STATUSES = ['todo', 'doing', 'blocked', 'review', 'done']
const PRIORITIES = ['Low', 'Normal', 'Medium', 'High']
const DEPTS = ['company', '7even', 'haavn', 'haavnblack', 'haavnmgmt', 'admin', 'finance']
const ROSTER = [
  'Jamie Baldwin', 'Daniel Sette', 'Lewis Jin', 'James Winstanley', 'Callum Macdonald', 'Mike Furniss',
  'Christina Witbreuk', 'Domenic Paolilli', 'John Dimattina', 'Jeffrey Witbreuk', 'James Maloney',
  'Amy Baldwin', 'Dominika Ma', 'Alessia Bresciano', 'Bonnie Zhao', 'Callum Fraser', 'Lucas Menegazzo', 'Seth Bean',
]

const ITEM_STATUSES = ['update', 'action', 'followup', 'trouble', 'complete']
const MEETING_KINDS = ['weekly', 'internal', 'external']
const EMAILS = {
  'Jamie Baldwin': 'jamie@7even.au', 'Daniel Sette': 'daniel@7even.au', 'Lewis Jin': 'lewis@7even.au', 'James Winstanley': 'james@haavn.au',
  'Callum Macdonald': 'callum@haavn.au', 'Mike Furniss': 'mike@haavn.au', 'Christina Witbreuk': 'christina@haavn.au', 'Domenic Paolilli': 'domenic@haavn.au',
  'John Dimattina': 'john@haavn.au', 'Jeffrey Witbreuk': 'jeffrey@haavn.au', 'James Maloney': 'jamesm@haavn.au', 'Amy Baldwin': 'accounts@7even.au',
  'Dominika Ma': 'accounts@haavn.au', 'Alessia Bresciano': 'reception@haavn.au', 'Callum Fraser': 'c.fraser@fraserandpartners.com',
  'Lucas Menegazzo': 'l.menegazzo@fraserandpartners.com', 'Seth Bean': 'hello@identityx.com.au', 'Bonnie Zhao': 'bonnie@haavn.au',
}

const files = require('./files')

class UserError extends Error {}

const nowIso = () => new Date().toISOString()
const today = () => new Date().toISOString().slice(0, 10)
const newId = () => 'b' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
const clone = (v) => JSON.parse(JSON.stringify(v))
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

// "mike" / "Mike Furniss" / "furniss" -> canonical roster name. Unknown or
// ambiguous names are refused so a typo never creates a task nobody owns.
function resolveOwner(input) {
  const q = String(input || '').trim().toLowerCase()
  if (!q) throw new UserError('owner is required')
  const exact = ROSTER.find((n) => n.toLowerCase() === q)
  if (exact) return exact
  const hits = ROSTER.filter((n) => n.toLowerCase().split(/\s+/).includes(q) || n.toLowerCase().startsWith(q))
  if (hits.length === 1) return hits[0]
  if (hits.length > 1) throw new UserError(`"${input}" matches more than one person: ${hits.join(', ')}. Use the full name.`)
  throw new UserError(`Unknown owner "${input}". Known people: ${ROSTER.join(', ')}.`)
}

function requireTitle(t) {
  const s = String(t || '').trim()
  if (!s) throw new UserError('title is required')
  if (s.length > 300) throw new UserError('title is too long (300 characters max)')
  return s
}
function checkDate(d, field) {
  if (d === undefined || d === null || d === '') return ''
  if (!isDate(d)) throw new UserError(`${field} must be a date as YYYY-MM-DD`)
  return d
}
function checkEnum(v, list, field) {
  if (!list.includes(v)) throw new UserError(`${field} must be one of: ${list.join(', ')}`)
  return v
}

// The agent a task is handed to ('' = none). Must be a configured agent.
function resolveAgent(input, agents) {
  const q = String(input || '').trim().toLowerCase()
  if (!q) return ''
  const hit = (agents || []).find((n) => n.toLowerCase() === q)
  if (!hit) throw new UserError(`Unknown agent "${input}". Agents: ${(agents || []).join(', ') || 'none configured'}.`)
  return hit
}
const compactTask = (a) => ({
  id: a.id, title: a.title, owner: a.owner || '', status: a.status || 'todo', due: a.due || '',
  dept: a.dept || '', priority: a.priority || '', ...(a.agent ? { agent: a.agent } : {}),
  ...((a.comments || []).length ? { comments: a.comments.length } : {}), ...(a.notes ? { notes: a.notes } : {}),
})

// ---------- Workflow tasks ----------
function listTasks(ws, f = {}) {
  let rows = Array.isArray(ws && ws.actions) ? ws.actions : []
  if (f.owner) {
    const q = String(f.owner).toLowerCase()
    rows = rows.filter((a) => String(a.owner || '').toLowerCase().includes(q))
  }
  if (f.status) { checkEnum(f.status, STATUSES, 'status'); rows = rows.filter((a) => (a.status || 'todo') === f.status) }
  else if (!f.include_done) rows = rows.filter((a) => !a.done && a.status !== 'done')
  if (f.due_before) { checkDate(f.due_before, 'due_before'); rows = rows.filter((a) => a.due && a.due < f.due_before) }
  if (f.dept) rows = rows.filter((a) => a.dept === f.dept)
  if (f.agent) { const q = String(f.agent).toLowerCase(); rows = rows.filter((a) => String(a.agent || '').toLowerCase() === q) }
  rows = rows.slice().sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))
  const limit = Math.min(Math.max(parseInt(f.limit, 10) || 50, 1), 200)
  return { total: rows.length, tasks: rows.slice(0, limit).map(compactTask) }
}

function addTask(ws, a, by = DEFAULT_BY, agents = []) {
  const next = clone(ws && typeof ws === 'object' ? ws : {})
  if (!Array.isArray(next.actions)) next.actions = []
  const dept = a.dept ? checkEnum(a.dept, DEPTS, 'dept') : 'company'
  const t = {
    id: newId(), title: requireTitle(a.title), owner: resolveOwner(a.owner), due: checkDate(a.due, 'due') || today(),
    priority: a.priority ? checkEnum(a.priority, PRIORITIES, 'priority') : 'Low', status: 'todo', done: false, dept,
    weekly: false, context: null, meetingId: '', notes: String(a.notes || ''), watchers: [], files: [], subs: [],
    created: nowIso(), completedAt: null, createdBy: by, comments: [],
    agent: resolveAgent(a.agent, agents),
  }
  next.actions.push(t)
  return { next, result: compactTask(t), audit: { before: null, after: clone(t) } }
}

function updateTask(ws, a, by = DEFAULT_BY, agents = []) {
  const next = clone(ws && typeof ws === 'object' ? ws : {})
  const t = (next.actions || []).find((x) => x.id === a.id)
  if (!t) throw new UserError(`No task with id "${a.id}"`)
  const changed = []
  const prev = { status: t.status, done: t.done, completedAt: t.completedAt || null, owner: t.owner, due: t.due, notes: t.notes, agent: t.agent || '' }
  if (a.status !== undefined) {
    checkEnum(a.status, STATUSES, 'status')
    t.status = a.status; t.done = a.status === 'done'
    t.completedAt = t.done ? (t.completedAt || nowIso()) : null
    changed.push('status')
  }
  if (a.owner !== undefined) { t.owner = resolveOwner(a.owner); changed.push('owner') }
  if (a.due !== undefined) { t.due = checkDate(a.due, 'due'); changed.push('due') }
  if (a.agent !== undefined) { t.agent = resolveAgent(a.agent, agents); changed.push('agent') }
  if (a.notes !== undefined) {
    // Notes are only ever added to, never replaced: "<agent>, 2026-10-09: ..." under what is already there.
    const line = `${by}, ${today()}: ${String(a.notes).trim()}`
    if (!String(a.notes).trim()) throw new UserError('notes is empty')
    t.notes = t.notes ? `${t.notes}\n\n${line}` : line
    changed.push('notes')
  }
  if (!changed.length) throw new UserError('Nothing to change: give status, owner, due or notes')
  t.updatedBy = by; t.updatedAt = nowIso()
  const before = {}, after = {}
  ;['status', 'done', 'completedAt', 'owner', 'due', 'notes', 'agent'].forEach((k) => {
    const nv = k === 'completedAt' ? (t.completedAt || null) : t[k]
    if (JSON.stringify(prev[k]) !== JSON.stringify(nv)) { before[k] = prev[k] === undefined ? null : prev[k]; after[k] = nv }
  })
  return { next, result: { ...compactTask(t), changed }, audit: { before, after } }
}

// One task in full, with its comments.
function getTask(ws, a) {
  const t = ((ws && ws.actions) || []).find((x) => x.id === a.id)
  if (!t) throw new UserError(`No task with id "${a.id}"`)
  return { ...compactTask(t), notes: t.notes || '', comments: (t.comments || []).map((c) => ({ id: c.id, by: c.by, at: c.at, text: c.text })) }
}
// A comment is a new line under the task: who, when, what. Never edits or removes another.
function addComment(ws, a, by = DEFAULT_BY) {
  const next = clone(ws && typeof ws === 'object' ? ws : {})
  const t = (next.actions || []).find((x) => x.id === a.id)
  if (!t) throw new UserError(`No task with id "${a.id}"`)
  const text = String(a.text || '').trim()
  if (!text) throw new UserError('text is required')
  if (text.length > 2000) throw new UserError('comment is too long (2000 characters max)')
  if (!Array.isArray(t.comments)) t.comments = []
  const c = { id: newId(), by, at: nowIso(), text }
  t.comments.push(c)
  return { next, result: { taskId: t.id, comment: c, comments: t.comments.length }, audit: { before: null, after: { comment: c } } }
}

// What moved since a time (default the last 24 hours). Counts only changes that carry a
// timestamp: task created, completed, or edited by Blaze.
function whatsNew(ws, f = {}) {
  const since = f.since ? new Date(f.since) : new Date(Date.now() - 24 * 3600 * 1000)
  if (isNaN(since.getTime())) throw new UserError('since must be an ISO date or time')
  const cut = since.toISOString()
  const after = (v) => typeof v === 'string' && v >= cut
  const tasks = []
  ;((ws && ws.actions) || []).forEach((a) => {
    const ev = []
    if (after(a.created)) ev.push('created')
    if (after(a.completedAt)) ev.push('completed')
    if (after(a.updatedAt)) ev.push('updated by ' + (a.updatedBy || 'someone'))
    ;(a.comments || []).forEach((c) => { if (after(c.at)) ev.push('comment by ' + c.by) })
    if (ev.length) tasks.push({ ...compactTask(a), events: ev })
  })
  return { since: cut, tasks }
}

// ---------- Meeting Management (key haavn_boardroom) ----------
// Same shapes the Meeting Management page reads and writes. Agents never delete: meetings are
// created, filled in and closed; people are added or marked present, never removed.
let _mid = 0
const meetingId = () => Date.now() * 1000 + (_mid++ % 1000)
const nextMonday = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7)); return d.toISOString().slice(0, 10) }
const meetingDepts = (m) => [...new Set([...DEPTS, ...(m.sections || []).map((x) => x.id), ...(m.items || []).map((x) => x.dept).filter(Boolean)])]
const checkTime = (t) => { if (t === undefined || t === '') return ''; if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(t))) throw new UserError('time must be HH:MM (24 hour)'); return t }
const compactMeeting = (m) => ({
  id: m.id, title: m.title || 'Weekly Company Meeting', kind: m.kind || 'weekly', date: m.date || '', time: m.time || '', chair: m.chair || '',
  closed: !!m.closed, attendees: (m.attendees || []).length, present: (m.attendees || []).filter((a) => a.present).length, items: (m.items || []).length,
  open: (m.items || []).filter((i) => !i.discussed && i.status !== 'complete').length,
})
const compactItem = (it, m) => ({
  id: it.id, meeting: m.title || 'Weekly Company Meeting', meetingDate: m.date || '', title: it.title, dept: it.dept || '', status: it.status || '',
  owner: it.owner || '', due: it.due || '', discussed: !!it.discussed, ...(it.carried ? { carried: it.carried } : {}),
  ...(it.notes ? { notes: it.notes } : {}),
})
// A meeting by id; with no id, the next open weekly meeting from today (never creates one).
function pickMeeting(bd, id, { allowClosed = false } = {}) {
  const ms = (bd && bd.meetings) || []
  let m
  if (id !== undefined && id !== null && id !== '') {
    m = ms.find((x) => String(x.id) === String(id))
    if (!m) throw new UserError(`No meeting with id "${id}"`)
  } else {
    const t = today()
    const c = ms.filter((x) => !x.closed && (!x.kind || x.kind === 'weekly')).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    m = c.find((x) => String(x.date || '') >= t) || c[c.length - 1]
    if (!m) throw new UserError('There is no open weekly meeting. Create one with create_meeting.')
  }
  if (m.closed && !allowClosed) throw new UserError('That meeting is closed and filed in the Archive, so it cannot be changed.')
  return m
}
function attendeeFrom(x) {
  const obj = typeof x === 'string' ? { name: x } : (x || {})
  const name = String(obj.name || '').trim()
  if (!name) throw new UserError('Each attendee needs a name')
  let person = null
  try { person = resolveOwner(name) } catch (e) { person = null }
  const full = person || name
  return { id: meetingId(), name: full, email: String(obj.email || (person && EMAILS[person]) || '').trim(), role: String(obj.role || ''), present: obj.present === undefined ? true : !!obj.present }
}
function listMeetings(bd, f = {}) {
  const st = f.status || 'open'
  checkEnum(st, ['open', 'closed', 'all'], 'status')
  let ms = ((bd && bd.meetings) || []).slice()
  if (st === 'open') ms = ms.filter((m) => !m.closed); else if (st === 'closed') ms = ms.filter((m) => m.closed)
  if (f.kind) { checkEnum(f.kind, MEETING_KINDS, 'kind'); ms = ms.filter((m) => (m.kind || 'weekly') === f.kind) }
  if (f.from) { checkDate(f.from, 'from'); ms = ms.filter((m) => m.date >= f.from) }
  if (f.to) { checkDate(f.to, 'to'); ms = ms.filter((m) => m.date <= f.to) }
  ms.sort((a, b) => st === 'closed' ? String(b.date).localeCompare(String(a.date)) : String(a.date).localeCompare(String(b.date)))
  const limit = Math.min(Math.max(parseInt(f.limit, 10) || 20, 1), 100)
  return { total: ms.length, meetings: ms.slice(0, limit).map(compactMeeting) }
}
function getMeeting(bd, a) {
  const m = pickMeeting(bd, a.id, { allowClosed: true })
  return { ...compactMeeting(m),
    attendeeList: (m.attendees || []).map((x) => ({ name: x.name, role: x.role || '', present: !!x.present, email: x.email || '' })),
    agenda: (m.items || []).map((it) => compactItem(it, m)),
    decisions: (m.decisions || []).map((d) => ({ id: d.id, text: d.text, by: d.by, at: d.at })),
    liveNotes: (m.liveNotes || []).map((n) => ({ text: n.text, at: n.at })), minutes: m.minutes || '' }
}
function createMeeting(bd, a, by = DEFAULT_BY) {
  const next = clone(bd && typeof bd === 'object' ? bd : { meetings: [] })
  if (!Array.isArray(next.meetings)) next.meetings = []
  const kind = a.kind ? checkEnum(a.kind, MEETING_KINDS, 'kind') : 'weekly'
  const date = checkDate(a.date, 'date') || (kind === 'weekly' ? nextMonday() : '')
  if (!date) throw new UserError('date is required (YYYY-MM-DD) for internal and external meetings')
  if (kind === 'weekly' && next.meetings.some((m) => !m.closed && (m.kind || 'weekly') === 'weekly' && m.date === date)) throw new UserError(`There is already an open weekly meeting on ${date}.`)
  const names = Array.isArray(a.attendees) && a.attendees.length ? a.attendees : (kind === 'weekly' ? ['Jamie Baldwin', 'James Winstanley', 'John Dimattina', 'Daniel Sette', 'Dominika Ma', 'Amy Baldwin', 'Lewis Jin'] : ['Jamie Baldwin'])
  const attendees = names.map(attendeeFrom)
  const chair = a.chair ? resolveOwner(a.chair) : 'Jamie Baldwin'
  const m = { id: meetingId(), date, time: checkTime(a.time) || (kind === 'weekly' ? '08:30' : '10:00'), chair, attendees, items: [], decisions: [], minutes: '', closed: false,
    kind, title: String(a.title || (kind === 'weekly' ? 'Weekly Company Meeting' : '')).trim(), liveNotes: [], recording: { active: false, startedAt: 0 },
    targetSec: Math.max(300, (parseInt(a.durationMin, 10) || (kind === 'weekly' ? 45 : 60)) * 60), createdBy: by, createdAt: nowIso() }
  if (!m.title) throw new UserError('title is required for internal and external meetings')
  next.meetings.push(m)
  if (!next.currentId) next.currentId = m.id
  return { next, result: { ...compactMeeting(m), summary: `created ${kind} meeting ${m.date}` } }
}
function updateMeeting(bd, a, by = DEFAULT_BY) {
  const next = clone(bd); const m = pickMeeting(next, a.id)
  const changed = []
  if (a.title !== undefined) { m.title = String(a.title).trim() || m.title; changed.push('title') }
  if (a.date !== undefined) { m.date = checkDate(a.date, 'date') || m.date; changed.push('date') }
  if (a.time !== undefined) { m.time = checkTime(a.time) || m.time; changed.push('time') }
  if (a.chair !== undefined) { m.chair = resolveOwner(a.chair); changed.push('chair') }
  if (Array.isArray(a.add_attendees) && a.add_attendees.length) {
    if (!Array.isArray(m.attendees)) m.attendees = []
    a.add_attendees.map(attendeeFrom).forEach((n) => { if (!m.attendees.some((x) => String(x.name).toLowerCase() === n.name.toLowerCase())) m.attendees.push(n) })
    changed.push('attendees')
  }
  if (Array.isArray(a.set_present) && a.set_present.length) {
    a.set_present.forEach((p) => {
      const nm = String(p.name || '').toLowerCase()
      const hit = (m.attendees || []).find((x) => String(x.name).toLowerCase() === nm || String(x.name).toLowerCase().split(/\s+/).includes(nm))
      if (!hit) throw new UserError(`"${p.name}" is not on this meeting's attendee list. Add them with add_attendees first.`)
      hit.present = !!p.present
    })
    changed.push('attendance')
  }
  if (!changed.length) throw new UserError('Nothing to change: give title, date, time, chair, add_attendees or set_present')
  m.updatedBy = by; m.updatedAt = nowIso()
  return { next, result: { ...compactMeeting(m), changed, summary: 'updated ' + changed.join(', ') } }
}
function addAgendaItem(bd, a, by = DEFAULT_BY) {
  const next = clone(bd); const m = pickMeeting(next, a.meeting_id)
  if (!Array.isArray(m.items)) m.items = []
  const it = { id: meetingId(), dept: a.dept ? checkEnum(a.dept, meetingDepts(m), 'dept') : 'company',
    status: a.status ? checkEnum(a.status, ITEM_STATUSES, 'status') : 'action', title: requireTitle(a.title), kind: '', assigneeId: '',
    owner: a.assignee ? resolveOwner(a.assignee) : '', due: checkDate(a.due, 'due'), discussed: false, notes: String(a.notes || ''), carried: 0,
    reviewers: [], files: [], subs: [], comments: [], createdBy: by, createdAt: nowIso() }
  const att = it.owner && (m.attendees || []).find((x) => String(x.name).toLowerCase() === it.owner.toLowerCase())
  if (att) it.assigneeId = att.id
  m.items.push(it)
  return { next, result: { ...compactItem(it, m), summary: 'added agenda item: ' + it.title.slice(0, 60) } }
}
function updateAgendaItem(bd, a, by = DEFAULT_BY) {
  const next = clone(bd)
  const hits = []
  ;(next.meetings || []).filter((m) => !m.closed && (a.meeting_id === undefined || String(m.id) === String(a.meeting_id))).forEach((m) =>
    (m.items || []).forEach((it) => { if (String(it.id) === String(a.id)) hits.push([m, it]) }))
  if (!hits.length) throw new UserError(`No agenda item with id "${a.id}" on an open meeting`)
  if (hits.length > 1) throw new UserError('That item id is on more than one open meeting. Give meeting_id.')
  const [m, it] = hits[0]; const changed = []
  if (a.status !== undefined) { it.status = checkEnum(a.status, ITEM_STATUSES, 'status'); changed.push('status') }
  if (a.assignee !== undefined) { it.owner = resolveOwner(a.assignee); const at = (m.attendees || []).find((x) => String(x.name).toLowerCase() === it.owner.toLowerCase()); it.assigneeId = at ? at.id : ''; changed.push('owner') }
  if (a.due !== undefined) { it.due = checkDate(a.due, 'due'); changed.push('due') }
  if (a.discussed !== undefined) { it.discussed = !!a.discussed; changed.push('discussed') }
  if (a.notes !== undefined) {
    const t = String(a.notes).trim(); if (!t) throw new UserError('notes is empty')
    const line = `${by}, ${today()}: ${t}`
    it.notes = it.notes ? `${it.notes}\n\n${line}` : line; changed.push('notes')
  }
  if (!changed.length) throw new UserError('Nothing to change: give status, assignee, due, discussed or notes')
  it.updatedBy = by; it.updatedAt = nowIso()
  return { next, result: { ...compactItem(it, m), changed, summary: 'updated agenda item (' + changed.join(', ') + '): ' + String(it.title).slice(0, 50) } }
}
function addDecision(bd, a, by = DEFAULT_BY) {
  const next = clone(bd); const m = pickMeeting(next, a.meeting_id)
  const text = String(a.text || '').trim(); if (!text) throw new UserError('text is required')
  if (!Array.isArray(m.decisions)) m.decisions = []
  const d = { id: meetingId(), text, by, at: m.date || today() }
  m.decisions.push(d)
  return { next, result: { meetingId: m.id, decision: d, summary: 'logged decision: ' + text.slice(0, 60) } }
}
// Minutes are added to, never replaced: each call appends a paragraph signed with the agent and date.
function addMinutes(bd, a, by = DEFAULT_BY) {
  const next = clone(bd); const m = pickMeeting(next, a.meeting_id)
  const text = String(a.text || '').trim(); if (!text) throw new UserError('text is required')
  const block = `${by}, ${today()}:\n${text}`
  m.minutes = m.minutes ? `${m.minutes}\n\n${block}` : block
  return { next, result: { meetingId: m.id, minutesLength: m.minutes.length, summary: 'added to minutes: ' + text.slice(0, 60) } }
}
// Same as the page's Close meeting: weekly meetings roll their undiscussed items into next week's meeting.
function closeMeeting(bd, a, by = DEFAULT_BY) {
  if (a.confirm !== true) throw new UserError('Closing files the meeting in the Archive and cannot be undone by an agent. Call again with confirm: true.')
  const next = clone(bd); const m = pickMeeting(next, a.id)
  m.closed = true; m.recording = { active: false, startedAt: 0 }; m.closedBy = by; m.closedAt = nowIso()
  let created = null
  if ((m.kind || 'weekly') === 'weekly') {
    const d = new Date(m.date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 7)
    const attendees = (m.attendees || []).map((x) => ({ id: meetingId(), name: x.name, email: x.email || '', role: x.role || '', present: true }))
    const idmap = {}; (m.attendees || []).forEach((oa, i) => { idmap[oa.id] = attendees[i].id })
    const nm = { id: meetingId(), date: d.toISOString().slice(0, 10), time: m.time || '08:30', chair: m.chair, attendees, items: [], decisions: [], minutes: '', closed: false, kind: 'weekly',
      title: m.title || 'Weekly Company Meeting', liveNotes: [], recording: { active: false, startedAt: 0 }, targetSec: m.targetSec || 2700, createdBy: by, createdAt: nowIso() }
    ;(m.items || []).filter((i) => !i.discussed).forEach((i) => nm.items.push({ ...clone(i), id: meetingId(), assigneeId: idmap[i.assigneeId] || '', carried: (i.carried || 0) + 1, discussed: false }))
    next.meetings.push(nm); created = nm
    if (String(next.currentId) === String(m.id)) next.currentId = nm.id
  }
  return { next, result: { closed: compactMeeting(m), ...(created ? { nextMeeting: compactMeeting(created) } : {}), summary: 'closed meeting ' + m.date + (created ? ', created ' + created.date : '') } }
}

// ---------- capital_kv client ----------
function kv(env = process.env, fetchImpl = fetch) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  const base = (env.SUPABASE_URL || SUPA_URL) + '/rest/v1/capital_kv'
  const H = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }
  async function read(k) {
    const r = await fetchImpl(`${base}?key=eq.${encodeURIComponent(k)}&select=value,updated_at`, { headers: H })
    if (!r.ok) throw new Error(`read ${k}: ${r.status}`)
    const rows = await r.json()
    return rows.length ? rows[0] : null
  }
  // fn(value) -> { next, result }. Writes only if updated_at has not moved.
  async function update(k, fn) {
    for (let attempt = 0; attempt < 4; attempt++) { // first try + up to 3 retries, each on a fresh read
      const row = await read(k)
      const { next, result } = fn(row ? row.value : null)
      const stamp = nowIso()
      let r
      if (!row) {
        r = await fetchImpl(base, { method: 'POST', headers: { ...H, Prefer: 'resolution=ignore-duplicates,return=representation' },
          body: JSON.stringify([{ key: k, value: next, updated_at: stamp }]) })
      } else {
        r = await fetchImpl(`${base}?key=eq.${encodeURIComponent(k)}&updated_at=${row.updated_at ? 'eq.' + encodeURIComponent(row.updated_at) : 'is.null'}`,
          { method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ value: next, updated_at: stamp }) })
      }
      if (!r.ok) throw new Error(`write ${k}: ${r.status}`)
      const out = await r.json()
      if (Array.isArray(out) && out.length) return result
    }
    throw new UserError('Someone else kept changing this at the same moment. Nothing was written. Please try again.')
  }
  return { read, update }
}

// ---------- MCP ----------
const SCHEMAS = {
  list_tasks: { description: 'List ATRIUM Workflow tasks. Open tasks by default, soonest due first.', inputSchema: { type: 'object', properties: {
    owner: { type: 'string', description: 'Part of the owner name' }, status: { type: 'string', enum: STATUSES },
    due_before: { type: 'string', description: 'YYYY-MM-DD, tasks due before this date' }, dept: { type: 'string', enum: DEPTS },
    agent: { type: 'string', description: 'Only tasks handed to this agent' }, include_done: { type: 'boolean' }, limit: { type: 'number' } } } },
  add_task: { description: 'Create a Workflow task. Owner must be a team member.', inputSchema: { type: 'object', required: ['title', 'owner'], properties: {
    title: { type: 'string' }, owner: { type: 'string', description: 'The person it is for' }, agent: { type: 'string', description: 'Optional: hand it to another agent, e.g. Blaze' }, due: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
    dept: { type: 'string', enum: DEPTS }, notes: { type: 'string' }, priority: { type: 'string', enum: PRIORITIES } } } },
  update_task: { description: 'Change status, owner, due or notes on one task by id.', inputSchema: { type: 'object', required: ['id'], properties: {
    id: { type: 'string' }, status: { type: 'string', enum: STATUSES }, owner: { type: 'string' }, agent: { type: 'string', description: 'Hand to an agent, or empty to clear' }, due: { type: 'string' }, notes: { type: 'string', description: 'Added under existing notes, never replaces them' } } } },
  list_meetings: { description: 'Meetings from Meeting Management. Open ones by default, soonest first.', inputSchema: { type: 'object', properties: { status: { type: 'string', enum: ['open', 'closed', 'all'] }, kind: { type: 'string', enum: MEETING_KINDS }, from: { type: 'string' }, to: { type: 'string' }, limit: { type: 'number' } } } },
  get_meeting: { description: 'One meeting in full: attendees and who is present, the whole agenda, decisions, live notes and minutes. No id means the next open weekly meeting.', inputSchema: { type: 'object', properties: { id: { type: ['number', 'string'] } } } },
  create_meeting: { description: 'Create a meeting. Weekly defaults to next Monday 08:30 with the usual attendees; internal and external need a title and date. Attendees are team names, or {name, email, role} for outside guests.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, kind: { type: 'string', enum: MEETING_KINDS }, date: { type: 'string', description: 'YYYY-MM-DD' }, time: { type: 'string', description: 'HH:MM' }, chair: { type: 'string' }, durationMin: { type: 'number' }, attendees: { type: 'array', items: { type: ['string', 'object'] } } } } },
  update_meeting: { description: 'Change an open meeting: title, date, time, chair, add attendees, or mark people present or absent. People are never removed.', inputSchema: { type: 'object', properties: { id: { type: ['number', 'string'] }, title: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' }, chair: { type: 'string' }, add_attendees: { type: 'array', items: { type: ['string', 'object'] } }, set_present: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, present: { type: 'boolean' } } } } } } },
  add_agenda_item: { description: 'Put an item on a meeting agenda. No meeting_id means the next open weekly meeting.', inputSchema: { type: 'object', required: ['title'], properties: { meeting_id: { type: ['number', 'string'] }, title: { type: 'string' }, assignee: { type: 'string' }, due: { type: 'string' }, dept: { type: 'string' }, status: { type: 'string', enum: ITEM_STATUSES }, notes: { type: 'string' } } } },
  update_agenda_item: { description: 'Change an agenda item on an open meeting: status, assignee, due, discussed, or add to its notes (notes are added under existing ones, never replaced).', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: ['number', 'string'] }, meeting_id: { type: ['number', 'string'] }, status: { type: 'string', enum: ITEM_STATUSES }, assignee: { type: 'string' }, due: { type: 'string' }, discussed: { type: 'boolean' }, notes: { type: 'string' } } } },
  add_decision: { description: 'Log a decision on a meeting (adds one line, stamped with you).', inputSchema: { type: 'object', required: ['text'], properties: { meeting_id: { type: ['number', 'string'] }, text: { type: 'string' } } } },
  add_minutes: { description: 'Add to a meeting\'s minutes. Each call appends a paragraph signed with your name and the date; existing minutes are never replaced.', inputSchema: { type: 'object', required: ['text'], properties: { meeting_id: { type: ['number', 'string'] }, text: { type: 'string' } } } },
  close_meeting: { description: 'Close a meeting and file it in the Archive. A weekly meeting rolls its undiscussed items into next week\'s meeting. Needs confirm: true. Cannot be undone by an agent.', inputSchema: { type: 'object', required: ['id', 'confirm'], properties: { id: { type: ['number', 'string'] }, confirm: { type: 'boolean' } } } },
  list_files: { description: 'List presentations, documents, brochures and plans you can download for 7EVEN, HAAVN and HAAVN BLACK. Images and data files are left out unless you ask for them.', inputSchema: { type: 'object', properties: { area: { type: 'string', enum: ['7even', 'haavn', 'haavn-black'] }, kind: { type: 'string', enum: ['presentation', 'document', 'brochure', 'plan', 'page', 'image', 'video', 'model', 'data'] }, query: { type: 'string', description: 'Part of a name or path' }, include_images: { type: 'boolean' }, limit: { type: 'number' }, offset: { type: 'number' } } } },
  get_file: { description: 'Download one file from the list. Text and HTML come back as text, images as images, PDFs and everything else as base64. Big files arrive in pieces: call again with offset = nextOffset until it is absent. The url field is the public address if you can fetch it directly.', inputSchema: { type: 'object', required: ['path'], properties: { path: { type: 'string', description: 'A path from list_files' }, offset: { type: 'number' } } } },
  get_task: { description: 'One task in full, including every comment.', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } },
  add_comment: { description: 'Add a comment to a task, stamped with your name. Agents reply to each other this way.', inputSchema: { type: 'object', required: ['id', 'text'], properties: { id: { type: 'string' }, text: { type: 'string' } } } },
  whats_new: { description: 'The latest feed: tasks created, completed or changed since a time (default last 24 hours).', inputSchema: { type: 'object', properties: { since: { type: 'string', description: 'ISO date or time' } } } },
}

// Runs one task change and hands back its result plus the before/after values for the audit log.
async function write(store, fn, key = KEYS.workflow) { // fn(value) -> { next, result, audit }
  let cap = null
  const result = await store.update(key, (v) => { const r = fn(v); cap = r.audit; return r })
  return { result, audit: cap || null }
}
const fileErr = (e) => { throw e instanceof files.FileError ? new UserError(e.message) : e }
async function callTool(name, args, store, ctx = {}) {
  const by = ctx.agent || DEFAULT_BY, agents = ctx.agents || []
  args = args || {}
  switch (name) {
    case 'list_tasks': return listTasks((await store.read(KEYS.workflow) || {}).value, args)
    case 'add_task': return write(store, (ws) => addTask(ws, args, by, agents))
    case 'update_task': return write(store, (ws) => updateTask(ws, args, by, agents))
    case 'add_comment': return write(store, (ws) => addComment(ws, args, by))
    case 'list_meetings': return listMeetings((await store.read(KEYS.boardroom) || {}).value, args)
    case 'get_meeting': return getMeeting((await store.read(KEYS.boardroom) || {}).value, args)
    case 'create_meeting': return write(store, (bd) => createMeeting(bd, args, by), KEYS.boardroom)
    case 'update_meeting': return write(store, (bd) => updateMeeting(bd, args, by), KEYS.boardroom)
    case 'add_agenda_item': return write(store, (bd) => addAgendaItem(bd, args, by), KEYS.boardroom)
    case 'update_agenda_item': return write(store, (bd) => updateAgendaItem(bd, args, by), KEYS.boardroom)
    case 'add_decision': return write(store, (bd) => addDecision(bd, args, by), KEYS.boardroom)
    case 'add_minutes': return write(store, (bd) => addMinutes(bd, args, by), KEYS.boardroom)
    case 'close_meeting': return write(store, (bd) => closeMeeting(bd, args, by), KEYS.boardroom)
    case 'list_files': return files.listFiles(args).catch(fileErr)
    case 'get_file': return files.getFile(args).catch(fileErr)
    case 'get_task': return getTask((await store.read(KEYS.workflow) || {}).value, args)
    case 'whats_new': return whatsNew((await store.read(KEYS.workflow) || {}).value, args)
    default: throw new UserError(`Unknown tool ${name}`)
  }
}

// One line per call Blaze makes: when, which tool, which task, whether it worked. Written
// after the call; a failure to log is reported on the server but never hides the result.
async function audit(store, tool, args, outcome, agent = DEFAULT_BY) {
  const taskId = (outcome.out && outcome.out.id) || (args && args.id) || ''
  const note = outcome.error ? String(outcome.error).slice(0, 160)
    : tool === 'add_task' ? 'added: ' + String((outcome.out && outcome.out.title) || '').slice(0, 80)
    : tool === 'update_task' ? 'changed: ' + ((outcome.out && outcome.out.changed) || []).join(', ')
    : (outcome.out && outcome.out.summary) ? String(outcome.out.summary).slice(0, 160)
    : tool === 'add_comment' ? 'commented: ' + String((outcome.out && outcome.out.comment && outcome.out.comment.text) || '').slice(0, 80)
    : 'read' + (outcome.out && typeof outcome.out.total === 'number' ? ` (${outcome.out.total})` : '')
  const entry = { at: nowIso(), agent, tool, ok: !outcome.error, taskId: String(taskId), note }
  if (outcome.trail) { entry.before = outcome.trail.before; entry.after = outcome.trail.after }
  try {
    await store.update(KEYS.audit, (v) => {
      const entries = Array.isArray(v && v.entries) ? v.entries.slice(-(AUDIT_MAX - 1)) : []
      entries.push(entry)
      return { next: { entries }, result: null }
    })
  } catch (e) { console.error('blaze audit write failed', e && e.message) }
}

const PROTOCOL = '2025-03-26'
// Returns a JSON-RPC response object, or null for notifications.
async function handleRpc(msg, store, ctx = {}) {
  const id = msg && msg.id
  const ok = (result) => ({ jsonrpc: '2.0', id, result })
  const err = (code, message) => ({ jsonrpc: '2.0', id: id === undefined ? null : id, error: { code, message } })
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return err(-32600, 'Invalid request')
  if (id === undefined) return null
  switch (msg.method) {
    case 'initialize': return ok({ protocolVersion: (msg.params && msg.params.protocolVersion) || PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: 'ATRIUM', version: '1.3.0' } })
    case 'ping': return ok({})
    case 'tools/list': return ok({ tools: Object.entries(SCHEMAS).map(([name, s]) => ({ name, ...s })) })
    case 'tools/call': {
      const name = msg.params && msg.params.name
      const args = msg.params && msg.params.arguments
      const st = store()
      try {
        const raw = await callTool(name, args, st, ctx)
        const out = raw && raw.audit !== undefined && raw.result !== undefined ? raw.result : raw
        await audit(st, name, args, { out, trail: raw && raw.audit }, ctx.agent)
        if (out && out.__content) return ok({ content: out.__content })
        return ok({ content: [{ type: 'text', text: JSON.stringify(out) }] })
      } catch (e) {
        if (e instanceof UserError) { await audit(st, name, args, { error: e.message }, ctx.agent); return ok({ isError: true, content: [{ type: 'text', text: e.message }] }) }
        console.error('blaze tool error', name, e && e.message)
        await audit(st, name, args, { error: 'failed' }, ctx.agent)
        return ok({ isError: true, content: [{ type: 'text', text: 'ATRIUM could not complete that. Nothing was changed.' }] })
      }
    }
    default: return err(-32601, 'Method not found')
  }
}

module.exports = { KEYS, UserError, resolveOwner, listTasks, addTask, updateTask, addComment, getTask, whatsNew, listMeetings, getMeeting, createMeeting, updateMeeting, addAgendaItem, updateAgendaItem, addDecision, addMinutes, closeMeeting, files, agentRegistry, identifyAgent, kv, handleRpc, SCHEMAS, ROSTER }
