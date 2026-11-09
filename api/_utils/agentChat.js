// Read-only ATRIUM Chat for an agent. An agent that appears in READERS may list and read the chats of ONE person (the director it works for), and nothing else:
// no sending, no reacting, no editing, no "mark as read" (so the director's unread counts never change because an agent looked).
// Only the chats that person still has on their list (not removed from it) can be read, so an agent never sees more than the director does.
// Used by the agent connector (api/_utils/blaze.js, tools list_chats and read_chat). Every database call here is a read.
const A = require('./atriumAuth')

// agent name (as the connector names it) -> the person id whose chats it may read
const READERS = { Julio: 'ds' }   // Julio is Daniel Sette's agent

class ReadError extends Error {}

const MAX_LIMIT = 200, DEFAULT_LIMIT = 50
const SHOWN = new Set(['text', 'system', 'task', 'poll', 'meeting', 'wfupdate'])   // real messages; reactions, icons, wallpapers, votes and edit marks are not

const personFor = (agent) => READERS[agent] || null
const canRead = (agent) => !!personFor(agent)
function need(agent) {
  const id = personFor(agent)
  if (!id) throw new ReadError('Chat is not available to you.')
  return id
}
const nameOf = (id) => {
  const p = A.PEOPLE.find((x) => x.id === id)
  if (p) return p.name
  return String(id).startsWith('x:') ? String(id).slice(2) : String(id)
}
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s }

// The chats this person has on their list, with their members.
async function myChats(store, pid) {
  const mine = (await store.memberRowsFor(pid)).filter((r) => !r.hidden)
  const ids = mine.map((r) => r.group_id)
  if (!ids.length) return []
  const [groups, members] = await Promise.all([store.groupsByIds(ids), store.membersByGroups(ids)])
  const memberOf = {}
  members.forEach((r) => { (memberOf[r.group_id] = memberOf[r.group_id] || []).push(r.member) })
  const flags = {}
  mine.forEach((r) => { flags[r.group_id] = r })
  return groups.map((g) => {
    const m = memberOf[g.id] || []
    const others = m.filter((x) => x !== pid)
    return { id: g.id, name: g.is_dm ? (others.length ? nameOf(others[0]) : nameOf(pid)) : g.name, direct: !!g.is_dm, project: g.project || '', members: m.map(nameOf), archived: !!(flags[g.id] && flags[g.id].archived), muted: !!(flags[g.id] && flags[g.id].muted) }
  })
}

async function listChats(chat, agent) {
  const pid = need(agent)
  const chats = await myChats(chat.store, pid)
  if (!chats.length) return { person: nameOf(pid), total: 0, chats: [] }
  const recent = (await chat.store.messagesFor(chats.map((c) => c.id), { limit: 600 })).filter((m) => SHOWN.has(m.kind) && !m.deleted_at)
  const last = {}, count = {}
  recent.forEach((m) => { last[m.group_id] = m; count[m.group_id] = (count[m.group_id] || 0) + 1 })   // oldest first, so the final one wins
  const rows = chats.map((c) => {
    const m = last[c.id]
    return { id: c.id, name: c.name, type: c.direct ? 'direct' : 'group', ...(c.project ? { project: c.project } : {}), members: c.members, ...(c.archived ? { archived: true } : {}), ...(c.muted ? { muted: true } : {}),
      recent_messages: count[c.id] || 0, ...(m ? { last_at: m.created_at, last_from: nameOf(m.sender), last_text: clip(m.body || (m.task && m.task.title) || '', 100) } : {}) }
  })
  rows.sort((a, b) => String(b.last_at || '').localeCompare(String(a.last_at || '')))
  return { person: nameOf(pid), total: rows.length, chats: rows }
}

function pickChat(chats, ref, who) {
  const q = String(ref || '').trim()
  if (!q) throw new ReadError('Say which chat: its id or part of its name. list_chats shows them.')
  const byId = chats.find((c) => c.id === q)
  if (byId) return byId
  const low = q.toLowerCase()
  const exact = chats.filter((c) => c.name.toLowerCase() === low)
  if (exact.length === 1) return exact[0]
  const part = chats.filter((c) => c.name.toLowerCase().includes(low))
  if (part.length === 1) return part[0]
  if (!part.length) throw new ReadError(`No chat on ${who}'s list matches "${q}". list_chats shows them.`)
  throw new ReadError(`More than one chat matches "${q}": ${part.slice(0, 8).map((c) => `${c.name} (${c.id})`).join('; ')}. Use the id.`)
}

function shape(m) {
  const o = { id: m.id, at: m.created_at, from: nameOf(m.sender) }
  if (m.deleted_at) { o.deleted = true; return o }
  if (m.kind === 'system') o.system = true
  o.text = m.body || ''
  if (m.edited_at) o.edited = true
  if (m.reply_to) o.reply_to = Number(m.reply_to)
  if (m.pinned_at) o.pinned = true
  const t = m.task
  if (m.kind === 'task' && t) o.task = { title: t.title || '', owner: t.owner || '', due: t.due || '', priority: t.priority || '', done: !!t.done }
  if (m.kind === 'poll' && t && t.poll) o.poll = t.poll
  if (m.kind === 'meeting' && t && t.meeting) o.meeting = t.meeting
  if (Array.isArray(m.files) && m.files.length) o.files = m.files.map((f) => ({ name: f.name, type: f.type, size: f.size, path: f.path }))
  return o
}

async function readChat(chat, agent, args = {}) {
  const pid = need(agent)
  const chats = await myChats(chat.store, pid)
  const c = pickChat(chats, args.chat, nameOf(pid))
  const limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(Number(args.limit)) || DEFAULT_LIMIT))
  const after = Math.max(0, Math.floor(Number(args.after_id)) || 0)
  // The store counts every row (reactions, votes) against its page size, so the latest messages are fetched with room to spare, and the cursor comes from the raw rows:
  // a page that held only reactions still moves the reader on.
  const raw = await chat.store.messagesFor([c.id], { after, limit: after ? limit : Math.min(MAX_LIMIT * 2, limit * 2) })
  let rows = raw.filter((m) => SHOWN.has(m.kind))
  if (!after) rows = rows.slice(-limit)
  if (args.since) {
    const t = Date.parse(args.since)
    if (!Number.isFinite(t)) throw new ReadError('since must be a date or time, such as 2026-11-01 or 2026-11-01T09:00:00Z.')
    rows = rows.filter((m) => Date.parse(m.created_at) >= t)
  }
  const messages = rows.map(shape)
  // Attachments: a link good for an hour, so the agent can open the file. Signing a link changes nothing in the chat.
  if (args.files !== false && chat.files) {
    const paths = []
    messages.forEach((m) => (m.files || []).forEach((f) => { if (f.path) paths.push(f.path) }))
    if (paths.length) {
      const urls = await chat.files.signDownloads(paths)
      messages.forEach((m) => (m.files || []).forEach((f) => { if (urls[f.path]) f.url = urls[f.path] }))
    }
  }
  messages.forEach((m) => (m.files || []).forEach((f) => { delete f.path }))
  const maxId = raw.reduce((a, m) => Math.max(a, m.id), 0)
  return { chat: { id: c.id, name: c.name, type: c.direct ? 'direct' : 'group', members: c.members }, total: messages.length, messages, ...(maxId ? { next_after_id: maxId } : {}) }
}

const SCHEMAS = {
  list_chats: { description: 'ATRIUM Chat, read only: the chats on your director\'s list, newest activity first, with who is in each one. You can read chats, never send, react or change anything.', inputSchema: { type: 'object', properties: {} } },
  read_chat: { description: 'ATRIUM Chat, read only: the messages of one chat, oldest first. Gives the latest messages (50 by default, 200 at most); pass after_id = next_after_id to read newer messages later. Tasks, polls, meetings and attachments are included, and an attachment comes with a download link good for an hour.', inputSchema: { type: 'object', required: ['chat'], properties: {
    chat: { type: 'string', description: 'The chat id from list_chats, or part of its name' }, limit: { type: 'number', description: '1 to 200, default 50' },
    after_id: { type: 'number', description: 'Only messages after this message id' }, since: { type: 'string', description: 'Only messages from this date or time' }, files: { type: 'boolean', description: 'false to leave out attachment links' } } } },
}

module.exports = { READERS, ReadError, canRead, listChats, readChat, SCHEMAS }
