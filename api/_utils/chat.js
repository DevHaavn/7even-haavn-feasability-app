// ATRIUM Chat: the rules. Pure logic over a small `store` (Supabase in production, a Map in the tests).
// Who you are always comes from the signed session, never from the request. You only ever see groups you are a member of.
const A = require('./atriumAuth')
const B = require('./blaze')
const P = require('./chatPush')

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
// Rows that are not messages: a reaction, a chat icon, one person's wallpaper. They live in the same table (no schema change needed) and travel in the same
// stream, so a poll brings them to everyone; the screen folds them into the chat and never lists them as messages.
const STYLE_KINDS = ['react', 'icon', 'wall', 'avatar']
function shapeMsg(m) {
  const base = { id: m.id, g: m.group_id, u: m.sender, t: Date.parse(m.created_at) }
  if (m.kind === 'react') return { ...base, k: 'react', re: Number(m.task && m.task.re) || 0, e: m.body || '', on: !(m.task && m.task.on === false) }
  if (m.kind === 'icon') return { ...base, k: 'icon', icon: (m.task && m.task.icon) || null }
  if (m.kind === 'wall') return { ...base, k: 'wall', wall: (m.task && m.task.wall) || null }
  if (m.kind === 'avatar') return { ...base, k: 'avatar' }
  if (m.kind === 'wfupdate') return { ...base, x: m.body || '', sys: 0, wf: (m.task && m.task.ref) || undefined, files: (m.files && m.files.length) ? m.files : undefined }
  return { ...base, x: m.body || '', sys: m.kind === 'system' ? 1 : 0, task: m.task || undefined, files: (m.files && m.files.length) ? m.files : undefined }
}

// What a chat icon, a wallpaper and a reaction may hold. Checked here, so nothing odd is ever stored.
const ICON_IDS = ['blk', 'blkw', 'haavnw', 'haavn', 'hotels', 'student', 'aged', 'btr', 'afford', 'data', 'hm', 'seven', 'wm7', 'x7', 'five', 'fivev', 'five5v', 'p7', 'atrium']
const TILE_IDS = ['lime', 'graphite', 'bone', 'gold', 'black', 'sage', 'silver', 'carbon', 'glass', 'frost', 'crystal', 'bluegl', 'sagegl']
const WALL_IDS = ['field', 'black', 'seven', 'atrium', 'park', 'seven7', 'wmbone', 'five', 'five2', 'hori', 'ent', 'p7', 'blkg', 'blkw', 'blks', 'blkn', 'dvsage', 'dvmist', 'dvstone', 'dvblush', 'dvlime', 'dvcobalt', 'dvsun', 'dvcoral', 'color', 'custom']
const ACC_IDS = ['auto', 'lime', 'gold', 'bone', 'bronze', 'black', 'graphite', 'grey', 'crystal', 'blue', 'sage', 'sagedeep']
const TACC_IDS = ['auto', 'glass', 'white', 'black', 'crystal', 'sage', 'grey']
const MAX_ICON_IMG = 24000
function cleanIcon(i) {
  if (i && typeof i.img === 'string') {
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(i.img) || i.img.length > MAX_ICON_IMG) throw new ChatError('That icon image is too large. Pick a smaller picture.')
    return { img: i.img }
  }
  if (i && ICON_IDS.includes(i.id) && TILE_IDS.includes(i.tile)) return { id: i.id, tile: i.tile }
  throw new ChatError('That is not one of the chat icons.')
}
function cleanWall(w) {
  if (!w || !WALL_IDS.includes(w.id)) throw new ChatError('That is not one of the wallpapers.')
  const out = { id: w.id }
  if (w.id === 'color') { if (!/^#[0-9a-fA-F]{6}$/.test(w.color || '')) throw new ChatError('Pick a colour.'); out.color = w.color; out.dark = !!w.dark }
  if (w.id === 'custom') out.dark = !!w.dark   // the picture itself stays on the device it was chosen on
  const n = (v, lo, hi) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : undefined }
  const dim = n(w.dim, 0, 80), blur = n(w.blur, 0, 14)
  if (dim !== undefined) out.dim = dim
  if (blur !== undefined) out.blur = blur
  if (ACC_IDS.includes(w.acc)) out.acc = w.acc
  if (TACC_IDS.includes(w.tacc)) out.tacc = w.tacc
  return out
}

async function mustBeMember(store, gid, me) {
  const rows = await store.membersByGroups([gid])
  const mine = rows.find((r) => r.member === me.sub)
  if (!mine) throw new ChatError('You are not in that chat.', 403)
  return { rows, mine }
}

// Everything the screen needs about my chats. `after` = only messages newer than that id (a poll); none = the recent history (first load).
async function snapshot(store, files, me, after, clientV) {
  const mine = await store.memberRowsFor(me.sub)
  const live = mine.filter((r) => !r.hidden)
  const ids = live.map((r) => r.group_id)
  const out = { me: { id: me.sub, n: me.name, e: me.emails, role: me.role }, groups: [], msgs: [], state: { muted: {}, arch: {}, gone: {} }, read: {}, people: PEOPLE.map((p) => person(p.id)) }
  mine.forEach((r) => { const k = me.sub + r.group_id; if (r.muted) out.state.muted[k] = 1; if (r.archived) out.state.arch[k] = 1; if (r.hidden) out.state.gone[k] = 1; out.read[r.group_id] = Number(r.last_read) || 0 })
  if (!ids.length) { out.cursor = Number(after) || 0; if (!after) out.avatars = await avatarUrls(files).catch(() => ({})); return out }
  const avatarsP = !after ? avatarUrls(files).catch(() => ({})) : null
  const [groups, members, msgs] = await Promise.all([store.groupsByIds(ids), store.membersByGroups(ids), store.messagesFor(ids, { after: after || 0, limit: after ? 400 : 700 })])
  const memberOf = {}
  members.forEach((r) => { (memberOf[r.group_id] = memberOf[r.group_id] || []).push(r.member) })
  const seen = new Set(out.people.map((p) => p.id))
  members.forEach((r) => { if (!seen.has(r.member)) { seen.add(r.member); out.people.push(person(r.member)) } })
  const readBy = {}
  members.forEach((r) => { (readBy[r.group_id] = readBy[r.group_id] || {})[r.member] = Number(r.last_read) || 0 })
  out.groups = groups.map((g) => ({ id: g.id, n: g.name, dm: !!g.is_dm, priv: !!g.is_private, owner: g.owner, proj: g.project || 'No project', m: memberOf[g.id] || [], rd: readBy[g.id] || {} }))
  // a wallpaper is one person's own view: never send anyone else's
  // a wallpaper is one person's own; and a screen from before reactions and icons existed (no v) is never sent rows it could not read
  let list = msgs.filter((m) => !(m.kind === 'wall' && m.sender !== me.sub) && (Number(clientV) >= 2 || !STYLE_KINDS.includes(m.kind))).map(shapeMsg)
  if (!after && store.latestStyle) {
    // first load: the current icon of each chat and my own wallpaper, however long ago they were set
    out.style = { icons: {}, walls: {} }
    const rows = await store.latestStyle(ids)
    for (const r of rows) {   // newest first
      if (r.kind === 'icon' && !out.style.icons[r.group_id] && r.task && r.task.icon) out.style.icons[r.group_id] = r.task.icon
      if (r.kind === 'wall' && r.sender === me.sub && !out.style.walls[r.group_id] && r.task && r.task.wall) out.style.walls[r.group_id] = r.task.wall
    }
  }
  const paths = []
  list.forEach((m) => (m.files || []).forEach((f) => { if (f.path) paths.push(f.path) }))
  if (paths.length) {
    const urls = await files.signDownloads(paths)
    list.forEach((m) => (m.files || []).forEach((f) => { if (f.path && urls[f.path]) f.url = urls[f.path] }))
  }
  out.msgs = list
  if (avatarsP) out.avatars = await avatarsP
  out.cursor = msgs.reduce((a, m) => Math.max(a, m.id), Number(after) || 0)   // counts the rows left out of the list too, so they are not fetched again
  return out
}

// Any member can rename a group (not a direct message, which is just the two people). The change is logged in the chat so nobody is surprised.
async function renameGroup(store, me, a) {
  await mustBeMember(store, a.gid, me)
  const g = (await store.groupsByIds([a.gid]))[0]
  if (!g || g.is_dm) throw new ChatError('A direct message takes the other person\'s name.')
  const name = String(a.name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)
  if (!name) throw new ChatError('Give the chat a name.')
  if (name === g.name) return { ok: true, name }
  await store.updateGroup(a.gid, { name })
  await store.insertMessage({ group_id: a.gid, sender: me.sub, kind: 'system', body: `${me.name.split(' ')[0]} renamed the chat to \u201c${name}\u201d.`, task: null, files: [] })
  return { ok: true, name }
}

// Chats a person has pinned to the top of their own list, in their own order. One small row per person; chats they are no longer in are dropped.
const orderKey = (id) => 'atrium_chat_order_' + id
async function readOrder(store, kv, me) {
  if (!kv || !kv.read) return []
  try {
    const row = await kv.read(orderKey(me.sub))
    const list = row && row.value && Array.isArray(row.value.order) ? row.value.order : []
    const mine = new Set((await store.memberRowsFor(me.sub)).filter((r) => !r.hidden).map((r) => r.group_id))
    return list.filter((g) => mine.has(g))
  } catch { return [] }
}
async function setOrder(store, kv, me, a) {
  if (!kv || !kv.update) throw new ChatError('Saving your order is not available right now.', 503)
  const mine = new Set((await store.memberRowsFor(me.sub)).map((r) => r.group_id))
  const order = [...new Set((Array.isArray(a.order) ? a.order : []).map(String))].filter((g) => mine.has(g)).slice(0, 80)
  await kv.update(orderKey(me.sub), () => ({ next: { order }, result: null }))
  return { ok: true, order }
}

// My group chats, light: just enough to pick one from a task.
async function myGroups(store, me) {
  const mine = (await store.memberRowsFor(me.sub)).filter((r) => !r.hidden)
  if (!mine.length) return { groups: [] }
  const gs = await store.groupsByIds(mine.map((r) => r.group_id))
  return { groups: gs.filter((g) => !g.is_dm).map((g) => ({ id: g.id, n: g.name, proj: g.project || '' })) }
}
// The chat for a project, made from a task: found by its project name, or created with the task's team. People on the task who are not in it yet are added.
async function groupForProject(store, me, a) {
  const project = String(a.project || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)
  if (!project) throw new ChatError('Give the task a project first.')
  const names = new Set((Array.isArray(a.names) ? a.names : []).map((n) => String(n).trim().toLowerCase()))
  const ids = A.PEOPLE.filter((p) => names.has(p.name.toLowerCase()) && p.id !== me.sub).map((p) => p.id)
  const mine = (await store.memberRowsFor(me.sub)).filter((r) => !r.hidden)
  const gs = mine.length ? await store.groupsByIds(mine.map((r) => r.group_id)) : []
  const found = gs.find((g) => !g.is_dm && String(g.project || '').toLowerCase() === project.toLowerCase())
  if (found) {
    let added = []
    if (ids.length) added = (await addMembers(store, me, { gid: found.id, ids })).added
    return { gid: found.id, existing: true, added }
  }
  if (!ids.length) throw new ChatError('Add a team member to the task first, then start its chat.')
  const r = await newGroup(store, me, { name: project, ids, proj: project, priv: true })
  return { gid: r.gid, existing: false }
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

// One person (or several) into many chats at once. Each chat is checked on its own: you must be in it, and it must be a group. A chat that cannot be done is reported, the rest still go through.
async function addToGroups(store, me, a) {
  const gids = [...new Set(Array.isArray(a.gids) ? a.gids : [])].slice(0, 60)
  if (!gids.length) throw new ChatError('Pick at least one chat.')
  const done = [], skipped = []
  for (const gid of gids) {
    try { const r = await addMembers(store, me, { gid, ids: a.ids, ext: a.ext }); done.push({ gid, added: r.added }) }
    catch (e) { skipped.push({ gid, why: String(e.message || e).slice(0, 100) }) }
  }
  return { done, skipped }
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
      const res = await kv.update(B.KEYS.workflow, (ws) => B.addTask(ws, { title, owner: own.name, due, priority: PRIORITY[task.pri], dept: DEPT[task.proj] || 'company', project: task.proj && task.proj !== 'No project' ? task.proj : '', notes: text ? `From chat: ${text}` : '' }, by))
      task.wfId = res.id
    } catch (e) { task.wf = 0; task.wfError = String(e.message || e).slice(0, 120) }
  }
  if (task.ag && kv) {
    try { await kv.update(B.KEYS.boardroom, (bd) => B.addAgendaItem(bd, { title, assignee: own.name, due, dept: DEPT[task.proj] === 'haavnblack' ? 'haavnblack' : 'company' }, by)) }
    catch (e) { task.ag = 0; task.agError = String(e.message || e).slice(0, 120) }
  }
  return task
}

async function send(store, kv, me, a, wp) {
  const { rows } = await mustBeMember(store, a.gid, me)
  const body = String(a.body || '').slice(0, MAX_BODY)
  const filesIn = (Array.isArray(a.files) ? a.files : []).slice(0, MAX_FILES)
  const files = filesIn.map((f) => {
    if (!f || typeof f.path !== 'string' || !f.path.startsWith(a.gid + '/')) throw new ChatError('That file does not belong to this chat.')
    return { name: String(f.name || 'file').slice(0, 160), type: String(f.type || 'application/octet-stream').slice(0, 100), size: Math.min(Number(f.size) || 0, MAX_FILE_BYTES), path: f.path }
  })
  if (!body.trim() && !files.length && !a.task) throw new ChatError('Nothing to send.')
  // a message that is about a Workflow task: it carries the task, and the words are also filed on the task as a comment
  let wf = null
  if (a.wf && !a.task) {
    if (!kv || !kv.read) throw new ChatError('Tasks are not linked right now. Try again shortly.', 503)
    const row = await kv.read(B.KEYS.workflow)
    const t = row && row.value && (row.value.actions || []).find((x) => x.id === String(a.wf))
    if (!t) throw new ChatError('That task no longer exists.', 404)
    wf = { id: t.id, t: String(t.title || '').slice(0, 160), p: String(t.project || '').slice(0, 60) }
  }
  let task = null
  if (a.task) {
    if (!rows.some((r) => r.member === a.task.own) && !byId(a.task.own)) throw new ChatError('The owner must be someone on the team.')
    task = await filterTask(kv, me, a.task, body)
  }
  const row = await store.insertMessage({ group_id: a.gid, sender: me.sub, kind: task ? 'task' : wf ? 'wfupdate' : 'text', body, task: task || (wf ? { ref: wf } : null), files })
  if (wf && body.trim() && kv) { try { await kv.update(B.KEYS.workflow, (ws) => B.addComment(ws, { id: wf.id, text: body.trim().slice(0, 2000) }, `${me.name} (chat)`)) } catch { /* the message is sent; the task note is best effort */ } }
  await store.updateMember(a.gid, me.sub, { last_read: row.id })
  // a new message brings an archived chat back for everyone else
  await store.unarchiveOthers(a.gid, me.sub)
  // alert everyone else's phones and computers; a failure here never loses the message
  try {
    const group = (await store.groupsByIds([a.gid]))[0]
    const others = rows.filter((r) => r.member !== me.sub)
    if (group && others.length) await P.notify({ store, sender: me, msg: row, group, memberRows: others, groupName: group.name }, wp)
  } catch { /* ignore */ }
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

// A reaction is a tiny row of its own. Turning it off is another row, so the stream stays append-only and every device ends up with the same picture.
async function react(store, me, a) {
  const m = await store.getMessage(a.mid)
  if (!m || m.kind === 'system' || STYLE_KINDS.includes(m.kind)) throw new ChatError('No such message.', 404)
  await mustBeMember(store, m.group_id, me)
  const e = String(a.emoji || '').trim()
  if (!e || e.length > 24 || !/\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]\uFE0F?\u20E3/u.test(e)) throw new ChatError('That is not an emoji.')
  const row = await store.insertMessage({ group_id: m.group_id, sender: me.sub, kind: 'react', body: e, task: { re: m.id, on: a.on !== false }, files: [] })
  return { ok: true, id: row.id }
}
// The chat's icon belongs to the chat (everyone sees it), so only people in a group can change it. Direct messages keep the person's initial.
async function setIcon(store, me, a) {
  await mustBeMember(store, a.gid, me)
  const g = (await store.groupsByIds([a.gid]))[0]
  if (!g || g.is_dm) throw new ChatError('A direct message shows the other person, not an icon.')
  const icon = cleanIcon(a.icon)
  const row = await store.insertMessage({ group_id: a.gid, sender: me.sub, kind: 'icon', body: '', task: { icon }, files: [] })
  return { ok: true, id: row.id, icon }
}
// A wallpaper belongs to the person (only they ever receive it), so it follows them from phone to computer.
async function setWall(store, me, a) {
  await mustBeMember(store, a.gid, me)
  const wall = cleanWall(a.wall)
  const row = await store.insertMessage({ group_id: a.gid, sender: me.sub, kind: 'wall', body: '', task: { wall }, files: [] })
  return { ok: true, id: row.id, wall }
}

// A person's picture: a small JPEG in the private store, one per person (the newest wins), handed out as short-lived links with the people list.
const AVATAR_RE = /^([a-z0-9]+)-(\d+)\.jpg$/
const MAX_AVATAR_BYTES = 600 * 1024
async function avatarUrls(files) {
  const rows = await files.list('avatars')
  const latest = {}
  for (const o of rows || []) {
    const m = AVATAR_RE.exec(o.name || ''); if (!m) continue
    if (o.metadata && Number(o.metadata.size) > MAX_AVATAR_BYTES) continue
    const t = Number(m[2]); if (!latest[m[1]] || t > latest[m[1]].t) latest[m[1]] = { t, path: 'avatars/' + o.name }
  }
  const paths = Object.values(latest).map((x) => x.path)
  const urls = paths.length ? await files.signDownloads(paths) : {}
  const out = {}
  Object.entries(latest).forEach(([id, x]) => { if (urls[x.path]) out[id] = urls[x.path] })
  return out
}
async function signAvatar(files, me) {
  const path = `avatars/${me.sub}-${Date.now()}.jpg`
  return { path, ...(await files.signUpload(path)) }
}
// Tell the people in my chats that my picture changed (a tiny row in each, so their screens fetch the new one).
async function announceAvatar(store, me) {
  const mine = (await store.memberRowsFor(me.sub)).filter((r) => !r.hidden).slice(0, 40)
  for (const r of mine) { try { await store.insertMessage({ group_id: r.group_id, sender: me.sub, kind: 'avatar', body: '', task: null, files: [] }) } catch { /* a missed announcement only delays the picture */ } }
}
async function setAvatar(store, files, me, a) {
  const path = String(a.path || '')
  if (!path.startsWith(`avatars/${me.sub}-`) || !AVATAR_RE.test(path.slice('avatars/'.length))) throw new ChatError('That picture is not yours to set.', 403)
  const rows = await files.list('avatars')
  const mineRows = (rows || []).filter((o) => String(o.name || '').startsWith(me.sub + '-'))
  const me_ = mineRows.find((o) => 'avatars/' + o.name === path)
  if (!me_) throw new ChatError('The picture did not arrive. Try again.')
  if (me_.metadata && Number(me_.metadata.size) > MAX_AVATAR_BYTES) { await files.remove([path]); throw new ChatError('That picture is too large. Pick a smaller one.') }
  const old = mineRows.filter((o) => 'avatars/' + o.name !== path).map((o) => 'avatars/' + o.name)
  if (old.length) { try { await files.remove(old) } catch { /* older ones are only clutter */ } }
  await announceAvatar(store, me)
  return { ok: true }
}
async function clearAvatar(store, files, me) {
  const rows = await files.list('avatars')
  const mine = (rows || []).filter((o) => String(o.name || '').startsWith(me.sub + '-')).map((o) => 'avatars/' + o.name)
  if (mine.length) await files.remove(mine)
  await announceAvatar(store, me)
  return { ok: true }
}

async function signUpload(store, files, me, a) {
  await mustBeMember(store, a.gid, me)
  const size = Number(a.size) || 0
  if (size <= 0 || size > MAX_FILE_BYTES) throw new ChatError('Files can be up to 50 MB.')
  const safe = String(a.name || 'file').replace(/[^\w.\- ]+/g, '_').slice(0, 120)
  const path = `${a.gid}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${safe}`
  return { path, ...(await files.signUpload(path)) }
}

async function subscribe(store, me, a) {
  const s = a.sub || {}
  if (typeof s.endpoint !== 'string' || !/^https:\/\//.test(s.endpoint) || s.endpoint.length > 600 || !s.keys || typeof s.keys.p256dh !== 'string' || typeof s.keys.auth !== 'string') throw new ChatError('That device could not be saved.')
  await store.savePush({ endpoint: s.endpoint, person_id: me.sub, p256dh: s.keys.p256dh, auth: s.keys.auth, ua: String(a.ua || '').slice(0, 160) })
  return { ok: true }
}
async function unsubscribe(store, me, a) {
  const mine = await store.pushSubsFor([me.sub])
  if (mine.some((x) => x.endpoint === a.endpoint)) await store.deletePush(a.endpoint)
  return { ok: true }
}
async function pushStatus(store, me, a, wp) {
  const mine = await store.pushSubsFor([me.sub])
  return { key: P.PUBLIC_KEY, enabled: !!wp, devices: mine.length, thisDevice: mine.some((x) => x.endpoint === a.endpoint) }
}

// Sends a test alert to every device this person has switched alerts on for, and says what each one answered. After an optional wait, so the app can be closed first.
async function pushTest(store, me, a, wp) {
  if (!wp) return { enabled: false, devices: 0, results: [] }
  const wait = Math.min(Math.max(Number(a.delay) || 0, 0), 8) * 1000
  if (wait) await new Promise((r) => setTimeout(r, wait))
  const subs = await store.pushSubsFor([me.sub])
  const results = []
  const kind = (ua) => (/iPhone|iPad/.test(ua || '') ? 'iPhone' : /Android/.test(ua || '') ? 'Android phone' : /Macintosh/.test(ua || '') ? 'Mac' : /Windows/.test(ua || '') ? 'Windows PC' : 'a device')
  await Promise.all(subs.map(async (s) => {
    try { await wp.send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: 'ATRIUM Chat', body: 'Test alert. If you can read this, alerts reach this device.', tag: 'test', url: '/' })); results.push({ device: kind(s.ua), ok: true }) }
    catch (e) { results.push({ device: kind(s.ua), ok: false, status: e.statusCode || 0, why: String(e.body || e.message || '').slice(0, 120) }); if (e.statusCode === 404 || e.statusCode === 410) { try { await store.deletePush(s.endpoint) } catch { /* ignore */ } } }
  }))
  return { enabled: true, devices: subs.length, results }
}

// the one entry point the handler calls
async function run(action, a, me, deps) {
  const { store, files, kv, wp } = deps
  switch (action) {
    case 'init': { const out = await snapshot(store, files, me, 0, a.v); out.order = await readOrder(store, kv, me); return out }
    case 'poll': return snapshot(store, files, me, Number(a.since) || 0, a.v)
    case 'send': return send(store, kv, me, a, wp)
    case 'pushStatus': return pushStatus(store, me, a, wp)
    case 'pushTest': return pushTest(store, me, a, wp)
    case 'subscribe': return subscribe(store, me, a)
    case 'unsubscribe': return unsubscribe(store, me, a)
    case 'read': return markRead(store, me, a)
    case 'newGroup': return newGroup(store, me, a)
    case 'myGroups': return myGroups(store, me)
    case 'groupForProject': return groupForProject(store, me, a)
    case 'addMembers': return addMembers(store, me, a)
    case 'renameGroup': return renameGroup(store, me, a)
    case 'setOrder': return setOrder(store, kv, me, a)
    case 'addToGroups': return addToGroups(store, me, a)
    case 'removeMember': return removeMember(store, me, a)
    case 'setMine': return setMine(store, me, a)
    case 'deleteGroup': return deleteGroup(store, files, me, a)
    case 'taskDone': return taskDone(store, kv, me, a)
    case 'signUpload': return signUpload(store, files, me, a)
    case 'avatars': return { avatars: await avatarUrls(files) }
    case 'signAvatar': return signAvatar(files, me)
    case 'setAvatar': return setAvatar(store, files, me, a)
    case 'clearAvatar': return clearAvatar(store, files, me)
    case 'react': return react(store, me, a)
    case 'setIcon': return setIcon(store, me, a)
    case 'setWall': return setWall(store, me, a)
    default: throw new ChatError('Unknown action.', 404)
  }
}

module.exports = { run, ChatError, person, shapeMsg, cleanIcon, cleanWall, STYLE_KINDS, BUCKET, DEPT }
