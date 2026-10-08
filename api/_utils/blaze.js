// ATRIUM connector for Blaze: the data layer.
// Pure transforms (tested in src/lib/__tests__/blaze.test.ts) plus a small
// capital_kv client that does a safe read-modify-write: it only writes if the row's
// updated_at is unchanged since the read, and retries once on a lost race.
// Never overwrites a blob from a stale copy, because people edit these live.

const SUPA_URL = process.env.SUPABASE_URL || 'https://vgvavmnqrdgcnledztyk.supabase.co'
const BY = 'Blaze'

// Blaze (Jamie's EA) works on tasks only. It does not touch meetings, the boardroom,
// CRM, capital or anything else in ATRIUM; that is the gatekeeper's job.
const KEYS = {
  workflow: 'nav_workspace',        // ATRIUM Workflow workspace; tasks live in .actions
}

const STATUSES = ['todo', 'doing', 'blocked', 'review', 'done']
const PRIORITIES = ['Low', 'Normal', 'Medium', 'High']
const DEPTS = ['company', '7even', 'haavn', 'haavnblack', 'haavnmgmt', 'admin', 'finance']
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
    if (ev.length) tasks.push({ ...compactTask(a), events: ev })
  })
  return { since: cut, tasks }
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
  whats_new: { description: 'The latest feed: tasks created, completed or changed since a time (default last 24 hours).', inputSchema: { type: 'object', properties: { since: { type: 'string', description: 'ISO date or time' } } } },
}

async function callTool(name, args, store) {
  args = args || {}
  switch (name) {
    case 'list_tasks': return listTasks((await store.read(KEYS.workflow) || {}).value, args)
    case 'add_task': return store.update(KEYS.workflow, (ws) => addTask(ws, args))
    case 'update_task': return store.update(KEYS.workflow, (ws) => updateTask(ws, args))
    case 'whats_new': return whatsNew((await store.read(KEYS.workflow) || {}).value, args)
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

module.exports = { KEYS, UserError, resolveOwner, listTasks, addTask, updateTask, whatsNew, kv, handleRpc, SCHEMAS, ROSTER }
