// ATRIUM Chat: the rules. Pure logic over a small `store` (Supabase in production, a Map in the tests).
// Who you are always comes from the signed session, never from the request. You only ever see groups you are a member of.
const A = require('./atriumAuth')
const B = require('./blaze')

const BUCKET = 'chat-files'
const MAX_BODY = 8000, MAX_NAME = 80, MAX_FILES = 8, MAX_FILE_BYTES = 50 * 1024 * 1024
const PEOPLE = A.PEOPLE
const byId = (id) => PEOPLE.find((p) => p.id === id)
const isMail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 120
class ChatError extends Error { constructor(m, status = 400) { super(m); this.status = status } }

// the project a chat task belongs to, in Workflow's own departments
const DEPT = { 'Belmont Estate': '7even', 'Corio Quarter': '7even', 'Preston': '7even', 'Palmerston Crescent': '7even', 'HAAVN BLACK': 'haavnblack' }
const PRIORITY = { Low: 'Low', Normal: 'Low', Medium: 'Medium', High: 'High' }

function colour(id) { const i = PEOPLE.findIndex((p) => p.id === id); return i < 0 ? 7 % 7 : i % 7 }
function person(id) {
  const p = byId(id)
  if (p) return { id: p.id, n: p.name, e: p.emails.slice(), c: colour(p.id) }
  if (String(id).startsWith('x:')) { const e = id.slice(2); return { id, n: e.split('@')[0], e: [e], c: 0, ext: true } }
  return { id, n: id, e: [''], c: 0 }
}
const shapeMsg = (m) => ({ id: m.id, g: m.group_id, u: m.sender, t: Date.parse(m.created_at), x: m.body || '', sys: m.kind === 'system' ? 1 : 0, task: m.task || undefined, files: (m.files && m.files.length) ? m.files : undefined })

async function mustBeMember(store, gid, me) {
  const rows = await store.membersByGroups([gid])
  const mine = rows.find((r) => r.member === me.sub)
  if (!mine) throw new ChatError('You are not in that chat.', 403)
  return { rows, mine }
}

// Everything the screen needs about my chats. `after` = only messages newer than that id (a poll); none = the recent history (first load).
async function snapshot(store, files, me, after) {
  const mine = await store.memberRowsFor(me.sub)
  const live = mine.filter((r) => !r.hidden)
  const ids = live.map((r) => r.group_id)
  const out = { me: { id: me.sub, n: me.name, e: me.emails, role: me.role }, groups: [], msgs: [], state: { muted: {}, arch: {}, gone: {} }, read: {}, people: PEOPLE.map((p) => person(p.id)) }
  mine.forEach((r) => { const k = me.sub + r.group_id; if (r.muted) out.state.muted[k] = 1; if (r.archived) out.state.arch[k] = 1; if (r.hidden) out.state.gone[k] = 1; out.read[r.group_id] = Number(r.last_read) || 0 })
  if (!ids.length) { out.cursor = Number(after) || 0; return out }
  const [groups, members, msgs] = await Promise.all([store.groupsByIds(ids), store.membersByGroups(ids), store.messagesFor(ids, { after: after || 0, limit: after ? 300 : 500 })])
  const memberOf = {}
  members.forEach((r) => { (memberOf[r.group_id] = memberOf[r.group_id] || []).push(r.member) })
  const seen = new Set(out.people.map((p) => p.id))
  members.forEach((r) => { if (!seen.has(r.member)) { seen.add(r.member); out.people.push(person(r.member)) } })
  out.groups = groups.map((g) => ({ id: g.id, n: g.name, dm: !!g.is_dm, priv: !!g.is_private, owner: g.owner, proj: g.project || 'No project', m: memberOf[g.id] || [] }))
  let list = msgs.map(shapeMsg)
  const paths = []
  list.forEach((m) => (m.files || []).forEach((f) => { if (f.path) paths.push(f.path) }))
  if (paths.length) {
    const urls = await files.signDownloads(paths)
    list.forEach((m) => (m.files || []).forEach((f) => { if (f.path && urls[f.path]) f.url = urls[f.path] }))
  }
  out.msgs = list
  out.cursor = list.reduce((a, m) => Math.max(a, m.id), Number(after) || 0)
  return out
}

async function newGroup(store, me, a) {
  const name = String(a.name || '').trim().slice(0, MAX_NAME)
  const ids = [...new Set((a.ids || []).filter((id) => byId(id) && id !== me.sub))]
  const ext = [...new Set((a.ext || []).map(A.norm).filter(isMail))]
  if (!ids.length && !ext.length) throw new ChatError('Pick at least one person.')
  // one person and no name: a direct message, and only ever one between the same two
  if (!name && ids.length === 1 && !ext.length) {
    const key = [me.sub, ids[0]].sort().join('|')
    const found = await store.findDm(key)
    if (found) return { gid: found.id, existing: true }
    const g = await store.insertGroup({ name: '', is_dm: true, is_private: true, owner: me.sub, project: null, dm_key: key })
    await store.insertMembers([me.sub, ids[0]].map((m) => ({ group_id: g.id, member: m, is_outside: false, added_by: me.sub })))
    return { gid: g.id }
  }
  if (!name) throw new ChatError('Give the group a name.')
  const g = await store.insertGroup({ name, is_dm: false, is_private: a.priv !== false, owner: me.sub, project: a.proj || null, dm_key: null })
  await store.insertMembers([{ group_id: g.id, member: me.sub, is_outside: false, added_by: me.sub }, ...ids.map((m) => ({ group_id: g.id, member: m, is_outside: false, added_by: me.sub })), ...ext.map((e) => ({ group_id: g.id, member: 'x:' + e, is_outside: true, added_by: me.sub }))])
  return { gid: g.id }
}

async function addMembers(store, me, a) {
  const { rows } = await mustBeMember(store, a.gid, me)
  const g = (await store.groupsByIds([a.gid]))[0]
  if (!g || g.is_dm) throw new ChatError('People can only be added to a group.')
  const have = new Set(rows.map((r) => r.member))
  const ids = [...new Set((a.ids || []).filter((id) => byId(id) && !have.has(id)))]
  const ext = [...new Set((a.ext || []).map(A.norm).filter(isMail))].filter((e) => !have.has('x:' + e))
  if (!ids.length && !ext.length) return { added: [] }
  await store.insertMembers([...ids.map((m) => ({ group_id: a.gid, member: m, is_outside: false, added_by: me.sub })), ...ext.map((e) => ({ group_id: a.gid, member: 'x:' + e, is_outside: true, added_by: me.sub }))])
  const names = [...ids.map((id) => byId(id).name), ...ext.map((e) => e + ' (outside, invited by email)')]
  await store.insertMessage({ group_id: a.gid, sender: me.sub, kind: 'system', body: `${me.name.split(' ')[0]} added ${names.join(', ')} to the chat. They can see everything shared in it.`, task: null, files: [] })
  return { added: names }
}

async function removeMember(store, me, a) {
  const { rows } = await mustBeMember(store, a.gid, me)
  const g = (await store.groupsByIds([a.gid]))[0]
  if (!g || g.is_dm || g.owner !== me.sub) throw new ChatError('Only the owner can remove people.', 403)
  if (a.member === me.sub) throw new ChatError('You cannot remove yourself. Remove the chat from your list instead.')
  if (!rows.some((r) => r.member === a.member)) return { ok: true }
  await store.deleteMember(a.gid, a.member)
  await store.insertMessage({ group_id: a.gid, sender: me.sub, kind: 'system', body: `${me.name.split(' ')[0]} removed ${person(a.member).n} from the chat.`, task: null, files: [] })
  return { ok: true }
}

async function setMine(store, me, a) {
  await mustBeMember(store, a.gid, me)
  const patch = {}
  ;['muted', 'archived', 'hidden'].forEach((k) => { if (typeof a[k] === 'boolean') patch[k] = a[k] })
  if (!Object.keys(patch).length) throw new ChatError('Nothing to change.')
  await store.updateMember(a.gid, me.sub, patch)
  return { ok: true }
}

async function markRead(store, me, a) {
  const { mine } = await mustBeMember(store, a.gid, me)
  const upto = Math.max(Number(mine.last_read) || 0, Number(a.upto) || 0)
  if (upto !== Number(mine.last_read)) await store.updateMember(a.gid, me.sub, { last_read: upto })
  return { ok: true }
}

async function deleteGroup(store, files, me, a) {
  await mustBeMember(store, a.gid, me)
  const g = (await store.groupsByIds([a.gid]))[0]
  if (!g || g.is_dm || g.owner !== me.sub) throw new ChatError('Only the owner can delete a chat for everyone. Remove it from your list instead.', 403)
  const paths = await store.filePaths(a.gid)
  await store.deleteGroup(a.gid)
  if (paths.length) { try { await files.remove(paths) } catch { /* files are removed on a best effort */ } }
  return { ok: true }
}

// A chat task also lands in ATRIUM Workflow under its owner and, if asked, on the next weekly meeting's agenda.
async function filterTask(kv, me, t, text) {
  const own = byId(t.own)
  if (!own) throw new ChatError('The task needs an owner from the team.')
  const title = String(t.title || '').trim().slice(0, 300)
  if (!title) throw new ChatError('The task needs a title.')
  const due = /^\d{4}-\d{2}-\d{2}$/.test(t.due || '') ? t.due : undefined
  const task = { title, own: own.id, due: due || '', pri: PRIORITY[t.pri] ? t.pri : 'Normal', proj: t.proj || 'No project', wf: t.wf ? 1 : 0, ag: t.ag ? 1 : 0, done: false }
  const by = `${me.name} (chat)`
  if (task.wf && kv) {
    try {
      const res = await kv.update(B.KEYS.workflow, (ws) => B.addTask(ws, { title, owner: own.name, due, priority: PRIORITY[task.pri], dept: DEPT[task.proj] || 'company', notes: text ? `From chat: ${text}` : '' }, by))
      task.wfId = res.id
    } catch (e) { task.wf = 0; task.wfError = String(e.message || e).slice(0, 120) }
  }
  if (task.ag && kv) {
    try { await kv.update(B.KEYS.boardroom, (bd) => B.addAgendaItem(bd, { title, assignee: own.name, due, dept: DEPT[task.proj] === 'haavnblack' ? 'haavnblack' : 'company' }, by)) }
    catch (e) { task.ag = 0; task.agError = String(e.message || e).slice(0, 120) }
  }
  return task
}

async function send(store, kv, me, a) {
  const { rows } = await mustBeMember(store, a.gid, me)
  const body = String(a.body || '').slice(0, MAX_BODY)
  const filesIn = (Array.isArray(a.files) ? a.files : []).slice(0, MAX_FILES)
  const files = filesIn.map((f) => {
    if (!f || typeof f.path !== 'string' || !f.path.startsWith(a.gid + '/')) throw new ChatError('That file does not belong to this chat.')
    return { name: String(f.name || 'file').slice(0, 160), type: String(f.type || 'application/octet-stream').slice(0, 100), size: Math.min(Number(f.size) || 0, MAX_FILE_BYTES), path: f.path }
  })
  if (!body.trim() && !files.length && !a.task) throw new ChatError('Nothing to send.')
  let task = null
  if (a.task) {
    if (!rows.some((r) => r.member === a.task.own) && !byId(a.task.own)) throw new ChatError('The owner must be someone on the team.')
    task = await filterTask(kv, me, a.task, body)
  }
  const row = await store.insertMessage({ group_id: a.gid, sender: me.sub, kind: task ? 'task' : 'text', body, task, files })
  await store.updateMember(a.gid, me.sub, { last_read: row.id })
  // a new message brings an archived chat back for everyone else
  await store.unarchiveOthers(a.gid, me.sub)
  return { msg: shapeMsg(row) }
}

async function taskDone(store, kv, me, a) {
  const m = await store.getMessage(a.mid)
  if (!m || !m.task) throw new ChatError('No such task.', 404)
  await mustBeMember(store, m.group_id, me)
  const task = { ...m.task, done: !!a.done }
  await store.updateMessage(m.id, { task })
  if (task.wfId && kv) {
    try { await kv.update(B.KEYS.workflow, (ws) => B.updateTask(ws, { id: task.wfId, status: task.done ? 'done' : 'todo' }, `${me.name} (chat)`)) } catch { /* Workflow task may have been removed */ }
  }
  return { ok: true, task }
}

async function signUpload(store, files, me, a) {
  await mustBeMember(store, a.gid, me)
  const size = Number(a.size) || 0
  if (size <= 0 || size > MAX_FILE_BYTES) throw new ChatError('Files can be up to 50 MB.')
  const safe = String(a.name || 'file').replace(/[^\w.\- ]+/g, '_').slice(0, 120)
  const path = `${a.gid}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${safe}`
  return { path, ...(await files.signUpload(path)) }
}

// the one entry point the handler calls
async function run(action, a, me, deps) {
  const { store, files, kv } = deps
  switch (action) {
    case 'init': return snapshot(store, files, me, 0)
    case 'poll': return snapshot(store, files, me, Number(a.since) || 0)
    case 'send': return send(store, kv, me, a)
    case 'read': return markRead(store, me, a)
    case 'newGroup': return newGroup(store, me, a)
    case 'addMembers': return addMembers(store, me, a)
    case 'removeMember': return removeMember(store, me, a)
    case 'setMine': return setMine(store, me, a)
    case 'deleteGroup': return deleteGroup(store, files, me, a)
    case 'taskDone': return taskDone(store, kv, me, a)
    case 'signUpload': return signUpload(store, files, me, a)
    default: throw new ChatError('Unknown action.', 404)
  }
}

module.exports = { run, ChatError, person, shapeMsg, BUCKET, DEPT }
