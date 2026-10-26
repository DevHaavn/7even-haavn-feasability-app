// ATRIUM Chat alerts: who gets one, what it says, and the sending. Pure rules here; the sender (web-push) is handed in.
const A = require('./atriumAuth')
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BO_1HrRAkixSnWwwQETJzeoAXbck-JBxl1ADb9SN_pExfaBf3eqowqtFaAI6Qe3h0K9Fw6dF9YmkN96uhwXK_bg'

const firstName = (n) => String(n || '').split(' ')[0]
// Is this message for that person even in a muted chat: an @mention of their first name, or a task set for them.
function isForThem(msg, member, personName) {
  const body = String(msg.body || '')
  if (personName && body.toLowerCase().includes('@' + firstName(personName).toLowerCase())) return true
  return !!(msg.task && msg.task.own === member)
}

// who to alert for a new message: every other real member, except in a chat they muted or hid (unless it is for them)
function recipients(msg, senderId, memberRows) {
  return memberRows.filter((r) => r.member !== senderId && !String(r.member).startsWith('x:') && !r.hidden).filter((r) => {
    const p = A.PEOPLE.find((x) => x.id === r.member)
    return !r.muted || isForThem(msg, r.member, p && p.name)
  }).map((r) => r.member)
}

function payloadFor(msg, sender, group, groupName) {
  const body = msg.kind === 'task' && msg.task ? `Set you a task: ${msg.task.title}` : (msg.body || (msg.files && msg.files.length ? 'Sent a file' : ''))
  return {
    title: group.is_dm ? sender.name : `${sender.name} · ${groupName}`,
    body: String(body).slice(0, 140),
    tag: group.id,
    url: '/?chatopen=' + encodeURIComponent(group.id),
  }
}

// Sends to every saved device of each recipient. A device that has gone (404, 410) is forgotten. Never throws: an alert must not lose a message.
async function notify({ store, sender, msg, group, memberRows, groupName }, wp) {
  if (!wp) return { sent: 0 }
  try {
    const to = recipients(msg, sender.sub, memberRows)
    if (!to.length) return { sent: 0 }
    const subs = await store.pushSubsFor(to)
    const data = JSON.stringify(payloadFor(msg, { name: sender.name }, group, groupName))
    let sent = 0
    await Promise.allSettled(subs.map(async (s) => {
      try { await wp.send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data); sent++ }
      catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) { try { await store.deletePush(s.endpoint) } catch { /* ignore */ } } }
    }))
    return { sent }
  } catch { return { sent: 0 } }
}

// The real sender, or nothing when the keys are not set.
function makeSender(env = process.env) {
  const priv = env.VAPID_PRIVATE_KEY
  if (!priv) return null
  const webpush = require('web-push')
  webpush.setVapidDetails('mailto:' + (env.VAPID_SUBJECT || 'reception@7even.au'), PUBLIC_KEY, priv)
  return { send: (sub, data) => webpush.sendNotification(sub, data, { TTL: 3600, urgency: 'high' }) }
}

// ---- the email nudge: unread for 10 minutes means a short email, once per message ----
// messages: recent, kind != system. members: rows for their groups. Returns one email per person.
function nudges({ messages, members, groups, now = Date.now(), waitMin = 10 }) {
  const gname = new Map(groups.map((g) => [g.id, g]))
  const byPerson = new Map()
  for (const r of members) {
    if (String(r.member).startsWith('x:') || r.hidden || r.archived) continue
    const p = A.PEOPLE.find((x) => x.id === r.member)
    if (!p || !p.emails[0]) continue
    const floor = Math.max(Number(r.last_read) || 0, Number(r.last_emailed) || 0)
    const unread = messages.filter((m) => m.group_id === r.group_id && m.id > floor && m.sender !== r.member && now - Date.parse(m.created_at) >= waitMin * 60000)
      .filter((m) => !r.muted || isForThem(m, r.member, p.name))
    if (!unread.length) continue
    const g = gname.get(r.group_id); if (!g) continue
    const entry = byPerson.get(r.member) || { person: p, items: [] }
    const sender = A.PEOPLE.find((x) => x.id === unread[unread.length - 1].sender)
    entry.items.push({ gid: r.group_id, name: g.is_dm ? (sender ? sender.name : 'Direct message') : g.name, count: unread.length, last: unread[unread.length - 1], topId: Math.max(...unread.map((m) => m.id)) })
    byPerson.set(r.member, entry)
  }
  return [...byPerson.values()]
}
function emailFor(n, site) {
  const rows = n.items.map((i) => `<tr><td style="padding:6px 0"><b>${esc(i.name)}</b><br><span style="color:#555">${i.count} unread, latest: ${esc(String(i.last.body || (i.last.task && i.last.task.title) || 'a file').slice(0, 120))}</span><br><a href="${site}/?chatopen=${encodeURIComponent(i.gid)}">Open this chat</a></td></tr>`).join('')
  return { to: n.person.emails[0], subject: `Unread in ATRIUM Chat (${n.items.reduce((a, i) => a + i.count, 0)})`, html: `<div style="font:15px/1.5 Arial,sans-serif;color:#111"><p>${esc(firstName(n.person.name))}, you have messages waiting in ATRIUM Chat.</p><table>${rows}</table><p style="color:#777;font-size:12px">You are emailed only when a message has been unread for 10 minutes. Mute a chat in ATRIUM to stop these.</p></div>` }
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

module.exports = { PUBLIC_KEY, recipients, payloadFor, notify, makeSender, isForThem, nudges, emailFor }
