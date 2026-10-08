// ATRIUM connector for Blaze: the data layer.
// Pure transforms (tested in src/lib/__tests__/blaze.test.ts) plus a small
// capital_kv client that does a safe read-modify-write: it only writes if the row's
// updated_at is unchanged since the read, and retries once on a lost race.
// Never overwrites a blob from a stale copy, because people edit these live.

const SUPA_URL = process.env.SUPABASE_URL || 'https://vgvavmnqrdgcnledztyk.supabase.co'
const BY = 'Blaze'

const KEYS = {
  workflow: 'nav_workspace',        // ATRIUM Workflow workspace; tasks live in .actions
  boardroom: 'haavn_boardroom',     // Meeting Management; { meetings: [{ items: [...] }] }
  meetings: 'atrium_meetings_v1',   // HM meetings module; { bundles: [...] }
}

const STATUSES = ['todo', 'doing', 'blocked', 'review', 'done']
const PRIORITIES = ['Low', 'Normal', 'Medium', 'High']
const DEPTS = ['company', '7even', 'haavn', 'haavnblack', 'haavnmgmt', 'admin', 'finance']
const ITEM_STATUSES = ['update', 'action', 'followup', 'trouble', 'complete']
const ROSTER = [
  'Jamie Baldwin', 'Daniel Sette', 'Lewis Jin', 'James Winstanley', 'Callum Macdonald', 'Mike Furniss',
  'Christina Witbreuk', 'Domenic Paolilli', 'John Dimattina', 'Jeffrey Witbreuk', 'James Maloney',
  'Amy Baldwin', 'Dominika Ma', 'Alessia Bresciano', 'Bonnie Zhao', 'Callum Fraser', 'Lucas Menegazzo',
]

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

const compactTask = (a) => ({
  id: a.id, title: a.title, owner: a.owner || '', status: a.status || 'todo', due: a.due || '',
  dept: a.dept || '', priority: a.priority || '', ...(a.notes ? { notes: a.notes } : {}),
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
  rows = rows.slice().sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))
  const limit = Math.min(Math.max(parseInt(f.limit, 10) || 50, 1), 200)
  return { total: rows.length, tasks: rows.slice(0, limit).map(compactTask) }
}

function addTask(ws, a) {
  const next = clone(ws && typeof ws === 'object' ? ws : {})
  if (!Array.isArray(next.actions)) next.actions = []
  const dept = a.dept ? checkEnum(a.dept, DEPTS, 'dept') : 'company'
  const t = {
    id: newId(), title: requireTitle(a.title), owner: resolveOwner(a.owner), due: checkDate(a.due, 'due') || today(),
    priority: a.priority ? checkEnum(a.priority, PRIORITIES, 'priority') : 'Low', status: 'todo', done: false, dept,
    weekly: false, context: null, meetingId: '', notes: String(a.notes || ''), watchers: [], files: [], subs: [],
    created: nowIso(), completedAt: null, createdBy: BY,
  }
  next.actions.push(t)
  return { next, result: compactTask(t) }
}

function updateTask(ws, a) {
  const next = clone(ws && typeof ws === 'object' ? ws : {})
  const t = (next.actions || []).find((x) => x.id === a.id)
  if (!t) throw new UserError(`No task with id "${a.id}"`)
  const changed = []
  if (a.status !== undefined) {
    checkEnum(a.status, STATUSES, 'status')
    t.status = a.status; t.done = a.status === 'done'
    t.completedAt = t.done ? (t.completedAt || nowIso()) : null
    changed.push('status')
  }
  if (a.owner !== undefined) { t.owner = resolveOwner(a.owner); changed.push('owner') }
  if (a.due !== undefined) { t.due = checkDate(a.due, 'due'); changed.push('due') }
  if (a.notes !== undefined) { t.notes = String(a.notes); changed.push('notes') }
  if (!changed.length) throw new UserError('Nothing to change: give status, owner, due or notes')
  t.updatedBy = BY; t.updatedAt = nowIso()
  return { next, result: { ...compactTask(t), changed } }
}

// ---------- Boardroom (Meeting Management) ----------
const compactItem = (it, m) => ({
  id: it.id, meeting: m.title || 'Meeting', meetingDate: m.date || '', title: it.title,
  dept: it.dept || '', status: it.status || '', owner: it.owner || '', due: it.due || '', discussed: !!it.discussed,
})
const openMeetings = (bd) => ((bd && bd.meetings) || []).filter((m) => !m.closed)

function listBoardroomItems(bd, f = {}) {
  const ms = openMeetings(bd).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
  let rows = []
  ms.forEach((m) => (m.items || []).forEach((it) => rows.push(compactItem(it, m))))
  if (f.status) { checkEnum(f.status, ITEM_STATUSES, 'status'); rows = rows.filter((r) => r.status === f.status) }
  if (f.assignee) { const q = String(f.assignee).toLowerCase(); rows = rows.filter((r) => r.owner.toLowerCase().includes(q)) }
  if (f.due_before) { checkDate(f.due_before, 'due_before'); rows = rows.filter((r) => r.due && r.due < f.due_before) }
  const limit = Math.min(Math.max(parseInt(f.limit, 10) || 50, 1), 200)
  return { meetings: ms.map((m) => ({ title: m.title || 'Meeting', date: m.date || '', items: (m.items || []).length })), total: rows.length, items: rows.slice(0, limit) }
}

// Goes into the next open weekly meeting (earliest date from today). It never creates
// a meeting: meetings are made in ATRIUM, so a missing one is reported instead.
// Departments a meeting accepts: the company ones plus any section ids already used on it.
const meetingDepts = (m) => [...new Set([...DEPTS, ...(m.sections || []).map((x) => x.id), ...(m.items || []).map((x) => x.dept).filter(Boolean)])]
function addBoardroomItem(bd, a) {
  const next = clone(bd && typeof bd === 'object' ? bd : { meetings: [] })
  const t = today()
  const cands = (next.meetings || []).filter((m) => !m.closed && (!m.kind || m.kind === 'weekly'))
    .sort((x, y) => String(x.date || '').localeCompare(String(y.date || '')))
  const m = cands.find((x) => String(x.date || '') >= t) || cands[cands.length - 1]
  if (!m) throw new UserError('There is no open weekly meeting to add to. Create the meeting in ATRIUM first.')
  if (!Array.isArray(m.items)) m.items = []
  const nums = m.items.map((x) => x.id).filter((n) => typeof n === 'number')
  const it = {
    id: nums.length ? Math.max(...nums) + 1 : 1, dept: a.dept ? checkEnum(a.dept, meetingDepts(m), 'dept') : 'company',
    status: a.status ? checkEnum(a.status, ITEM_STATUSES, 'status') : 'action', title: requireTitle(a.title), kind: '',
    assigneeId: '', owner: a.assignee ? resolveOwner(a.assignee) : '', due: checkDate(a.due, 'due'), discussed: false,
    notes: String(a.notes || ''), carried: 0, reviewers: [], files: [], subs: [], comments: [], createdBy: BY, createdAt: nowIso(),
  }
  m.items.push(it)
  return { next, result: compactItem(it, m) }
}

// Change one item on an open meeting by id (the id is unique within a meeting; give the
// meeting date when the same number could appear on more than one open meeting).
function updateBoardroomItem(bd, a) {
  const next = clone(bd && typeof bd === 'object' ? bd : { meetings: [] })
  const hits = []
  openMeetings(next).forEach((m) => (m.items || []).forEach((it) => {
    if (String(it.id) === String(a.id) && (!a.meeting_date || m.date === a.meeting_date)) hits.push([m, it])
  }))
  if (!hits.length) throw new UserError(`No open meeting item with id "${a.id}"`)
  if (hits.length > 1) throw new UserError(`Item id ${a.id} is on more than one open meeting. Give meeting_date (YYYY-MM-DD).`)
  const [m, it] = hits[0]
  const changed = []
  if (a.status !== undefined) { it.status = checkEnum(a.status, ITEM_STATUSES, 'status'); changed.push('status') }
  if (a.assignee !== undefined) { it.owner = resolveOwner(a.assignee); changed.push('owner') }
  if (a.due !== undefined) { it.due = checkDate(a.due, 'due'); changed.push('due') }
  if (a.notes !== undefined) { it.notes = String(a.notes); changed.push('notes') }
  if (a.discussed !== undefined) { it.discussed = !!a.discussed; changed.push('discussed') }
  if (!changed.length) throw new UserError('Nothing to change: give status, assignee, due, notes or discussed')
  it.updatedBy = BY; it.updatedAt = nowIso()
  return { next, result: { ...compactItem(it, m), changed } }
}

// What moved since a time (default the last 24 hours). Counts only changes that carry a
// timestamp: task created / completed / Blaze edits, and meeting items Blaze touched.
function whatsNew(ws, bd, f = {}) {
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
    if (ev.length) tasks.push({ ...compactTask(a), events: ev })
  })
  const items = []
  openMeetings(bd).forEach((m) => (m.items || []).forEach((it) => {
    const ev = []
    if (after(it.createdAt)) ev.push('added by ' + (it.createdBy || 'someone'))
    if (after(it.updatedAt)) ev.push('updated by ' + (it.updatedBy || 'someone'))
    if (ev.length) items.push({ ...compactItem(it, m), events: ev })
  }))
  return { since: cut, tasks, meetingItems: items }
}

// ---------- Meetings module (read only) ----------
function listMeetings(data, f = {}) {
  const bundles = (data && data.bundles) || []
  const now = nowIso()
  const upcoming = bundles.filter((b) => b.meeting && b.meeting.status === 'scheduled' && String(b.meeting.startsAt || '') >= now)
    .sort((a, b) => a.meeting.startsAt.localeCompare(b.meeting.startsAt))
    .map((b) => ({ id: b.meeting.id, title: b.meeting.title, startsAt: b.meeting.startsAt, durationMin: b.meeting.durationMin,
      location: b.meeting.locationLabel || '', attendees: (b.attendees || []).map((x) => x.displayName), agenda: (b.agenda || []).map((x) => x.title) }))
  const records = bundles.filter((b) => b.record && ((b.record.actions || []).length || (b.record.decisions || []).length))
    .sort((a, b) => String(b.meeting.startsAt || '').localeCompare(String(a.meeting.startsAt || '')))
    .slice(0, Math.min(Math.max(parseInt(f.recent, 10) || 5, 1), 20))
    .map((b) => ({ meeting: b.meeting.title, startsAt: b.meeting.startsAt, decisions: b.record.decisions || [],
      actions: (b.record.actions || []).map((x) => ({ text: x.text, due: x.dueLabel || '' })) }))
  return { upcoming, recent: records }
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
    for (let attempt = 0; attempt < 2; attempt++) {
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
    throw new UserError('Someone else changed this at the same moment. Nothing was written. Please try again.')
  }
  return { read, update }
}

// ---------- MCP ----------
const SCHEMAS = {
  list_tasks: { description: 'List ATRIUM Workflow tasks. Open tasks by default, soonest due first.', inputSchema: { type: 'object', properties: {
    owner: { type: 'string', description: 'Part of the owner name' }, status: { type: 'string', enum: STATUSES },
    due_before: { type: 'string', description: 'YYYY-MM-DD, tasks due before this date' }, dept: { type: 'string', enum: DEPTS },
    include_done: { type: 'boolean' }, limit: { type: 'number' } } } },
  add_task: { description: 'Create a Workflow task. Owner must be a team member.', inputSchema: { type: 'object', required: ['title', 'owner'], properties: {
    title: { type: 'string' }, owner: { type: 'string' }, due: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
    dept: { type: 'string', enum: DEPTS }, notes: { type: 'string' }, priority: { type: 'string', enum: PRIORITIES } } } },
  update_task: { description: 'Change status, owner, due or notes on one task by id.', inputSchema: { type: 'object', required: ['id'], properties: {
    id: { type: 'string' }, status: { type: 'string', enum: STATUSES }, owner: { type: 'string' }, due: { type: 'string' }, notes: { type: 'string' } } } },
  list_boardroom_items: { description: 'Items on the open weekly meetings (agenda, assignee, status, due).', inputSchema: { type: 'object', properties: {
    status: { type: 'string', enum: ITEM_STATUSES }, assignee: { type: 'string' }, due_before: { type: 'string' }, limit: { type: 'number' } } } },
  add_boardroom_item: { description: 'Add an item to the upcoming weekly meeting. Does not create meetings.', inputSchema: { type: 'object', required: ['title'], properties: {
    title: { type: 'string' }, assignee: { type: 'string' }, due: { type: 'string' }, dept: { type: 'string', enum: DEPTS },
    status: { type: 'string', enum: ITEM_STATUSES }, notes: { type: 'string' } } } },
  update_boardroom_item: { description: 'Change status, assignee, due, notes or discussed on one item of an open weekly meeting, by id.', inputSchema: { type: 'object', required: ['id'], properties: {
    id: { type: ['number', 'string'] }, meeting_date: { type: 'string', description: 'YYYY-MM-DD, only if the id is on several open meetings' }, status: { type: 'string', enum: ITEM_STATUSES },
    assignee: { type: 'string' }, due: { type: 'string' }, notes: { type: 'string' }, discussed: { type: 'boolean' } } } },
  whats_new: { description: 'The latest feed: tasks and meeting items created, completed or changed since a time (default last 24 hours).', inputSchema: { type: 'object', properties: { since: { type: 'string', description: 'ISO date or time' } } } },
  list_meetings: { description: 'Upcoming scheduled meetings, plus decisions and actions from recent meeting records.', inputSchema: { type: 'object', properties: { recent: { type: 'number' } } } },
}

async function callTool(name, args, store) {
  args = args || {}
  switch (name) {
    case 'list_tasks': return listTasks((await store.read(KEYS.workflow) || {}).value, args)
    case 'add_task': return store.update(KEYS.workflow, (ws) => addTask(ws, args))
    case 'update_task': return store.update(KEYS.workflow, (ws) => updateTask(ws, args))
    case 'list_boardroom_items': return listBoardroomItems((await store.read(KEYS.boardroom) || {}).value, args)
    case 'add_boardroom_item': return store.update(KEYS.boardroom, (bd) => addBoardroomItem(bd, args))
    case 'update_boardroom_item': return store.update(KEYS.boardroom, (bd) => updateBoardroomItem(bd, args))
    case 'whats_new': return whatsNew((await store.read(KEYS.workflow) || {}).value, (await store.read(KEYS.boardroom) || {}).value, args)
    case 'list_meetings': return listMeetings((await store.read(KEYS.meetings) || {}).value, args)
    default: throw new UserError(`Unknown tool ${name}`)
  }
}

const PROTOCOL = '2025-03-26'
// Returns a JSON-RPC response object, or null for notifications.
async function handleRpc(msg, store) {
  const id = msg && msg.id
  const ok = (result) => ({ jsonrpc: '2.0', id, result })
  const err = (code, message) => ({ jsonrpc: '2.0', id: id === undefined ? null : id, error: { code, message } })
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return err(-32600, 'Invalid request')
  if (id === undefined) return null
  switch (msg.method) {
    case 'initialize': return ok({ protocolVersion: (msg.params && msg.params.protocolVersion) || PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: 'ATRIUM', version: '1.0.0' } })
    case 'ping': return ok({})
    case 'tools/list': return ok({ tools: Object.entries(SCHEMAS).map(([name, s]) => ({ name, ...s })) })
    case 'tools/call': {
      const name = msg.params && msg.params.name
      try {
        const out = await callTool(name, msg.params && msg.params.arguments, store())
        return ok({ content: [{ type: 'text', text: JSON.stringify(out) }] })
      } catch (e) {
        if (e instanceof UserError) return ok({ isError: true, content: [{ type: 'text', text: e.message }] })
        console.error('blaze tool error', name, e && e.message)
        return ok({ isError: true, content: [{ type: 'text', text: 'ATRIUM could not complete that. Nothing was changed.' }] })
      }
    }
    default: return err(-32601, 'Method not found')
  }
}

module.exports = { KEYS, UserError, resolveOwner, listTasks, addTask, updateTask, listBoardroomItems, addBoardroomItem, updateBoardroomItem, whatsNew, listMeetings, kv, handleRpc, SCHEMAS, ROSTER }
