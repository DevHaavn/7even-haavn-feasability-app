// Keeps a copy of a person's haavn.au diary inside their other Outlook (7even.au), so that Outlook shows both and they do not double-book.
// One way only: haavn.au -> the connected diary. The copies are plain busy blocks: no attendees (so nobody is emailed or invited), no reminder, tagged
// "HAAVN diary" so ATRIUM and the person can tell them from real meetings. "Free" time is not copied, private meetings show as "Busy (HAAVN)".
// Needs the person to have connected their diary (api/_utils/calToken.js). State, so edits and cancellations carry over: capital_kv atrium_cal_mirror.
const crypto = require('crypto')

const KEY = 'atrium_cal_mirror'     // { [personId]: { [haavn event id]: { m: copy id, h: what it looked like, s: start } } }
const TAG = 'HAAVN diary'
const TZ = 'Australia/Melbourne'
const MAX_NEW = 120                  // per run; the next run carries on
const lower = (v) => String(v == null ? '' : v).trim().toLowerCase()
const keyOf = (e) => [lower(e.subject), e.start, e.end].join('|')
const hashOf = (e) => crypto.createHash('sha1').update([e.subject, e.start, e.end, e.allDay, e.location, e.showAs, e.sensitivity].join('|')).digest('hex').slice(0, 16)
const melDay = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(ms))

function payload(e, mailbox) {
  const priv = e.sensitivity === 'private' || e.sensitivity === 'confidential'
  return {
    subject: priv ? 'Busy (HAAVN)' : e.subject,
    start: { dateTime: e.start, timeZone: TZ }, end: { dateTime: e.end, timeZone: TZ }, isAllDay: !!e.allDay,
    location: { displayName: priv ? '' : e.location || '' },
    showAs: ['busy', 'tentative', 'oof', 'workingElsewhere'].includes(e.showAs) ? e.showAs : 'busy',
    isReminderOn: false, categories: [TAG],
    body: { contentType: 'text', content: `Copied from ${mailbox} by ATRIUM so this diary shows it. Change it in that diary, not here.` + (!priv && e.joinUrl ? '\nJoin: ' + e.joinUrl : '') },
  }
}

// One sync at a time per person. The button and the 15-minute timer can both ask; if one is already running the other stands aside (a lock that lapses by itself after 3 minutes).
const LOCK_KEY = 'atrium_cal_lock', LOCK_MS = 180000
async function takeLock(kv, id, now) {
  let got = false
  await kv.update(LOCK_KEY, (v) => { const cur = Number((v && v[id]) || 0); got = !(cur && now - cur < LOCK_MS); return { next: got ? { ...(v || {}), [id]: now } : (v || {}), result: null } })
  return got
}
async function freeLock(kv, id) { try { await kv.update(LOCK_KEY, (v) => ({ next: { ...(v || {}), [id]: 0 }, result: null })) } catch { /* it lapses by itself */ } }
// the key a copy of this event has in the other diary (a private meeting is copied under a different name)
const copyKey = (e) => [lower(payload(e, '').subject), e.start, e.end].join('|')

// person: { id, emails }. cal: the shared-mailbox reader (listFor). del: api/_utils/calToken.js make(). Returns what it did.
async function syncPerson({ person, kv, cal, del, now = Date.now() }) {
  const st = await del.status(person.id, kv)
  if (!st.connected) return { skipped: 'not connected' }
  if (lower(st.account).endsWith('@haavn.au')) return { skipped: 'their connected diary is the haavn.au one' }
  const sources = [...new Set((person.emails || []).map(lower).filter((e) => e && !e.endsWith('@haavn.au')).map((e) => e.split('@')[0] + '@haavn.au'))]
  if (!sources.length || !cal || !cal.configured || !cal.listFor) return { skipped: 'no haavn.au diary to copy' }
  if (!(await takeLock(kv, person.id, now))) return { skipped: 'already running' }
  try { return await run({ person, kv, cal, del, now, st, sources }) } finally { await freeLock(kv, person.id) }
}

async function run({ person, kv, cal, del, now, st, sources }) {
  const fromMs = now - 24 * 3600e3, from = new Date(fromMs).toISOString(), to = new Date(now + 45 * 864e5).toISOString()
  let src = null, mailbox = ''
  for (const mb of sources) {
    try { src = await cal.listFor(mb, from, to); mailbox = mb; break } catch (e) { if (!(e && (e.status === 404 || e.status === 400))) throw e }
  }
  if (!src) return { skipped: 'no haavn.au mailbox found' }
  const mine = await del.eventsFor(person.id, kv, from, to)
  if (!mine.connected) return { skipped: mine.reconnect ? 'needs reconnecting' : 'not connected', reconnect: !!mine.reconnect }
  const row = await kv.read(KEY)
  const state = (row && row.value && row.value[person.id]) || {}
  const natural = new Set(mine.events.filter((e) => !(e.categories || []).includes(TAG)).map(keyOf))   // real meetings already in this diary
  // the copies already in the diary (ours carry the tag). A copy with no record is adopted rather than made again; a copy nothing points at is a stray and goes.
  const tagged = mine.events.filter((e) => (e.categories || []).includes(TAG))
  const recorded = new Set(Object.values(state).map((x) => x.m))
  const pool = new Map()
  tagged.forEach((c) => { if (!recorded.has(c.id)) { const k = keyOf(c); if (!pool.has(k)) pool.set(k, []); pool.get(k).push(c.id) } })
  const srcIds = new Set(src.map((e) => e.id)), next = {}, gone = new Set(), out = { created: 0, updated: 0, removed: 0, cleaned: 0, skipped: 0, failed: 0 }
  const create = async (e) => {
    const r = await del.call(person.id, kv, 'POST', '/me/events', payload(e, mailbox))
    if (r.ok && r.json && r.json.id) { next[e.id] = { m: r.json.id, h: hashOf(e), s: e.start }; out.created++; return true }
    out.failed++; out.lastStatus = r.status; return false
  }
  for (const e of src) {
    if (!e.start || !e.end) continue
    if (e.showAs === 'free' || natural.has(keyOf(e))) { out.skipped++; continue }   // free time is not busy; a real meeting already here is not doubled
    const old = state[e.id], h = hashOf(e)
    if (old && old.h === h) { next[e.id] = old; continue }
    if (old) {
      const r = await del.call(person.id, kv, 'PATCH', '/me/events/' + encodeURIComponent(old.m), payload(e, mailbox))
      if (r.ok) { next[e.id] = { m: old.m, h, s: e.start }; out.updated++ }
      else if (r.status === 404) { if (out.created < MAX_NEW) await create(e) }   // someone deleted the copy by hand: put it back
      else { next[e.id] = old; out.failed++; out.lastStatus = r.status }
      continue
    }
    const there = (pool.get(copyKey(e)) || []).shift()
    if (there) { next[e.id] = { m: there, h, s: e.start }; continue }   // already in the diary (an earlier run, or one that overlapped): keep that one
    if (out.created >= MAX_NEW) continue
    await create(e)
  }
  // a copy whose original is gone (cancelled, declined, now free) goes too, if it is still in the window; older copies stay as history
  const windowStart = melDay(fromMs)
  for (const [sid, old] of Object.entries(state)) {
    if (next[sid]) continue
    if (srcIds.has(sid) && out.created >= MAX_NEW) { next[sid] = old; continue }
    if ((old.s || '').slice(0, 10) >= windowStart) {
      const r = await del.call(person.id, kv, 'DELETE', '/me/events/' + encodeURIComponent(old.m))
      if (r.ok || r.status === 404) { out.removed++; gone.add(old.m) } else { next[sid] = old; out.failed++; out.lastStatus = r.status }
    }
  }
  // strays: tagged copies in the window that no record points at any more (a double made by two syncs that overlapped)
  const used = new Set(Object.values(next).map((x) => x.m))
  for (const c of tagged) {
    if (used.has(c.id) || gone.has(c.id) || (c.start || '').slice(0, 10) < windowStart) continue
    const r = await del.call(person.id, kv, 'DELETE', '/me/events/' + encodeURIComponent(c.id))
    if (r.ok || r.status === 404) out.cleaned++; else { out.failed++; out.lastStatus = r.status }
  }
  await kv.update(KEY, (v) => ({ next: { ...(v || {}), [person.id]: next }, result: true }))
  return { ...out, mailbox, account: st.account }
}

// everything this person's copies in their other Outlook, removed: used when they disconnect
async function clearPerson({ person, kv, del }) {
  const row = await kv.read(KEY)
  const state = (row && row.value && row.value[person.id]) || {}
  let removed = 0
  for (const old of Object.values(state)) { const r = await del.call(person.id, kv, 'DELETE', '/me/events/' + encodeURIComponent(old.m)); if (r.ok || r.status === 404) removed++ }
  await kv.update(KEY, (v) => { const n = { ...(v || {}) }; delete n[person.id]; return { next: n, result: true } })
  return { removed }
}

module.exports = { KEY, TAG, syncPerson, clearPerson, payload }
