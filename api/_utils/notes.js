// ATRIUM Notes: a person's own meeting notes. Written or dictated, saved, emailed to anyone (outside too), turned into tasks, or filed to a meeting's minutes.
// Notes are private to their author. They are kept in the locked chat tables (a hidden "My notes" group per person, one message per note), so nothing here is
// readable with the public key, and no new table is needed.
const A = require('./atriumAuth')
const B = require('./blaze')

class NoteError extends Error { constructor(m, status = 400) { super(m); this.name = 'NoteError'; this.status = status } }
const MAX_NOTES = 300, MAX_BODY = 60000, MAX_TITLE = 140
const clean = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n)
const lower = (v) => String(v || '').toLowerCase()
const isMail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim()) && String(v).length <= 120
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const onMeeting = (me, m) => (m.attendees || []).some((x) => lower(x.name) === lower(me.name)) || lower(m.chair) === lower(me.name) || me.role === 'admin'

async function groupOf(store, me) {
  const key = 'notes:' + me.sub
  let g = await store.findDm(key); if (g) return g
  try { g = await store.insertGroup({ name: 'My notes', is_dm: false, is_private: true, owner: me.sub, project: null, dm_key: key }) } catch (e) { g = await store.findDm(key); if (g) return g; throw e }
  try { await store.insertMembers([{ group_id: g.id, member: me.sub, is_outside: false, hidden: true, added_by: me.sub }]) } catch (e) { try { await store.deleteGroup(g.id) } catch { /* nothing more to do */ } throw e }
  return g
}
const shape = (r) => { const t = r.task || {}; const created = Date.parse(r.created_at) || 0
  return { id: r.id, title: t.title || '', body: r.body || '', meetingId: t.meetingId == null ? '' : t.meetingId, meetingTitle: t.meetingTitle || '', lang: t.lang || 'en-AU', created, updated: t.u || created, emailed: t.emailed || [], tasks: t.tasks || [], minutes: !!t.minutes } }
async function mine(store, me, id) {
  const g = await groupOf(store, me)
  const m = await store.getMessage(id)
  if (!m || m.group_id !== g.id || m.kind !== 'note') throw new NoteError('No such note.', 404)
  return { g, m }
}

async function list(store, me) {
  const g = await groupOf(store, me)
  const rows = (await store.messagesFor([g.id], { after: 0, limit: 600 })).filter((r) => r.kind === 'note').map(shape)
  rows.sort((a, b) => b.updated - a.updated)
  return { notes: rows }
}
async function save(store, me, a) {
  const g = await groupOf(store, me)
  const body = String(a.body == null ? '' : a.body).slice(0, MAX_BODY)
  const title = clean(a.title, MAX_TITLE)
  const meta = { title, meetingId: a.meetingId == null || a.meetingId === '' ? '' : a.meetingId, meetingTitle: clean(a.meetingTitle, 120), lang: clean(a.lang, 12) || 'en-AU', u: Date.now() }
  if (a.id) {
    const { m } = await mine(store, me, a.id)
    const task = { ...(m.task || {}), ...meta }
    await store.updateMessage(m.id, { body, task })
    return { note: shape({ ...m, body, task }) }
  }
  const existing = (await store.messagesFor([g.id], { after: 0, limit: 600 })).filter((r) => r.kind === 'note')
  if (existing.length >= MAX_NOTES) throw new NoteError('You have a lot of notes. Delete some old ones first.')
  const row = await store.insertMessage({ group_id: g.id, sender: me.sub, kind: 'note', body, task: meta, files: [] })
  return { note: shape(row) }
}
async function remove(store, me, a) {
  const { m } = await mine(store, me, a.id)
  await store.deleteMessage(m.id)
  return { ok: true }
}
// the meetings this person can attach notes to, and the team they can give tasks to
async function options(kv, me) {
  let meetings = []
  if (kv && kv.read) {
    try {
      const row = await kv.read(B.KEYS.boardroom)
      meetings = ((row && row.value && row.value.meetings) || []).filter((m) => onMeeting(me, m)).sort((x, y) => String(y.date).localeCompare(String(x.date))).slice(0, 40)
        .map((m) => ({ id: m.id, title: m.title || 'Meeting', date: m.date || '', time: m.time || '', closed: !!m.closed }))
    } catch { /* notes work without the meeting list */ }
  }
  return { meetings, people: A.PEOPLE.filter((p) => p.role !== 'external').map((p) => p.name), me: { name: me.name, email: (me.emails || [])[0] || '' } }
}
async function note(store, kv, me, id) {
  const { m } = await mine(store, me, id)
  return { m, n: shape(m) }
}
async function patchTask(store, m, patch) { await store.updateMessage(m.id, { task: { ...(m.task || {}), ...patch } }) }

async function email(store, me, a, mail) {
  const { m, n } = await note(store, null, me, a.id)
  if (!mail || !mail.configured) throw new NoteError('Email is not set up yet.', 503)
  const to = [...new Set((Array.isArray(a.to) ? a.to : String(a.to || '').split(/[\s,;]+/)).map((x) => String(x).trim().toLowerCase()).filter(Boolean))]
  if (!to.length) throw new NoteError('Add at least one email address.')
  if (to.length > 10) throw new NoteError('Ten addresses at most.')
  const bad = to.find((x) => !isMail(x)); if (bad) throw new NoteError(`"${bad}" is not an email address.`)
  if (!n.body.trim()) throw new NoteError('There is nothing in this note yet.')
  const subject = clean(a.subject, 200) || n.title || 'Meeting notes'
  const intro = String(a.message || '').slice(0, 2000).trim()
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.55;color:#111">` +
    (intro ? `<p style="white-space:pre-wrap">${esc(intro)}</p><hr style="border:0;border-top:1px solid #ddd;margin:16px 0">` : '') +
    `<h2 style="font-size:18px;margin:0 0 4px">${esc(n.title || 'Meeting notes')}</h2>` + (n.meetingTitle ? `<div style="color:#666;margin-bottom:12px">${esc(n.meetingTitle)}</div>` : '') +
    `<div style="white-space:pre-wrap">${esc(n.body)}</div>` +
    `<p style="color:#888;font-size:12px;margin-top:24px">Sent from ATRIUM by ${esc(me.name)}.</p></div>`
  try { await mail.send({ to, subject, html, replyTo: (me.emails || [])[0], replyName: me.name, bcc: (me.emails || [])[0] }) }
  catch (e) { throw new NoteError(String((e && e.message) || e).slice(0, 160), 502) }
  const emailed = [...n.emailed, { to, at: Date.now() }].slice(-20)
  await patchTask(store, m, { emailed })
  return { ok: true, sent: to.length }
}
async function makeTask(store, kv, me, a) {
  const { m, n } = await note(store, kv, me, a.id)
  if (!kv || !kv.update) throw new NoteError('Tasks are not linked right now. Try again shortly.', 503)
  const title = clean(a.title, 160); if (!title) throw new NoteError('Give the task a title.')
  const line = String(a.line || '').slice(0, 1500).trim()
  const notes = `From meeting notes "${n.title || 'Untitled'}"${n.meetingTitle ? ' (' + n.meetingTitle + ')' : ''}${line ? ':\n' + line : ''}`
  let made
  try {
    made = await kv.update(B.KEYS.workflow, (ws) => B.addTask(ws, { title, owner: clean(a.owner, 80) || me.name, due: clean(a.due, 10), priority: ['Low', 'Medium', 'High'].includes(a.priority) ? a.priority : 'Low', project: clean(a.project, 60), notes }, `${me.name} (notes)`))
  } catch (e) { if (e instanceof B.UserError) throw new NoteError(e.message); throw e }
  await patchTask(store, m, { tasks: [...n.tasks, { id: made.id, title, owner: made.owner }].slice(-50) })
  return { ok: true, task: made }
}
async function toMeeting(store, kv, me, a) {
  const { m, n } = await note(store, kv, me, a.id)
  if (!kv || !kv.update) throw new NoteError('Meetings are not linked right now. Try again shortly.', 503)
  if (!n.body.trim()) throw new NoteError('There is nothing in this note yet.')
  const text = ((n.title ? n.title + '\n' : '') + n.body).slice(0, 20000)
  let out
  try {
    out = await kv.update(B.KEYS.boardroom, (bd) => {
      const mt = ((bd && bd.meetings) || []).find((x) => String(x.id) === String(a.meetingId))
      if (!mt) throw new B.UserError('No such meeting.')
      if (!onMeeting(me, mt)) throw new NoteError('You are not on this meeting.', 403)
      const r = B.addMinutes(bd, { meeting_id: mt.id, text }, `${me.name} (notes)`)
      return { next: r.next, result: { id: mt.id, title: mt.title || 'Meeting', date: mt.date || '' } }
    })
  } catch (e) { if (e instanceof B.UserError) throw new NoteError(e.message, 404); throw e }
  await patchTask(store, m, { meetingId: out.id, meetingTitle: out.title, minutes: true })
  return { ok: true, meeting: out }
}
module.exports = { NoteError, list, save, remove, options, email, makeTask, toMeeting, note }
