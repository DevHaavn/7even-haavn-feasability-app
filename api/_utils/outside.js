// Outside people (consultants, designers): added by a director from Chat Settings, kept in capital_kv under one key, no SQL needed.
// They join the in-memory roster (A.PEOPLE) with role `external`: they can sign in and use chat, in the chats they are added to, and nothing else.
// Each server instance keeps the list for a few seconds; a change made on another instance is seen within TTL.
const A = require('./atriumAuth')
const crypto = require('crypto')

const KEY = 'atrium_outside_people'
const TTL_MS = 15000
const MAX_PEOPLE = 200
const isMail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 120

let loadedAt = 0
let loadedOnce = false   // a read has worked at least once on this instance
let current = []   // the saved entries last applied: { id, name, email, by, at }

const idFor = (email) => 'o_' + crypto.createHash('sha1').update(A.norm(email)).digest('hex').slice(0, 8)

// Put the saved list into A.PEOPLE: drop what an earlier call added, add what is saved now. Roster people in the code always win.
function apply(list) {
  for (let i = A.PEOPLE.length - 1; i >= 0; i--) if (A.PEOPLE[i].dyn) A.PEOPLE.splice(i, 1)
  const taken = new Set(A.PEOPLE.flatMap((p) => p.emails))
  current = []
  for (const o of Array.isArray(list) ? list : []) {
    const email = A.norm(o && o.email)
    if (!isMail(email) || taken.has(email)) continue
    taken.add(email)
    current.push({ id: o.id || idFor(email), name: String(o.name || email.split('@')[0]).slice(0, 60), email, by: o.by || '', at: o.at || '' })
    A.PEOPLE.push({ id: current[current.length - 1].id, name: current[current.length - 1].name, role: 'external', app: 'external', emails: [email], dyn: true })
  }
}

// kv: the capital_kv client (read, update). `force` skips the short cache (sign-in does this). Without kv the roster in code is all there is.
async function sync(kv, force = false) {
  if (!kv || !kv.read) return current
  if (!force && Date.now() - loadedAt < TTL_MS) return current
  try {
    const row = await kv.read(KEY)
    apply(row && row.value && row.value.people)
    loadedAt = Date.now(); loadedOnce = true
  } catch { /* keep what we had; a failed read must never lock the team out */ }
  return current
}

const list = () => current.map((o) => ({ ...o }))

async function add(kv, store, me, a) {
  if (!kv || !kv.update) throw Object.assign(new Error('Saving is not available right now.'), { status: 503 })
  const email = A.norm(a.email), name = String(a.name || '').trim().slice(0, 60)
  if (!isMail(email)) throw Object.assign(new Error('Enter their Microsoft email address.'), { status: 400 })
  if (!name) throw Object.assign(new Error('Enter their name.'), { status: 400 })
  if (A.PEOPLE.some((p) => !p.dyn && p.emails.includes(email))) throw Object.assign(new Error('That address is already on the ATRIUM team list.'), { status: 400 })
  const entry = { id: idFor(email), name, email, by: me.name, at: new Date().toISOString() }
  await kv.update(KEY, (v) => {
    const people = ((v && v.people) || []).filter((o) => A.norm(o.email) !== email)
    if (people.length >= MAX_PEOPLE) throw Object.assign(new Error('That is the most outside people ATRIUM holds.'), { status: 400 })
    return { next: { people: [...people, entry] }, result: null }
  })
  await sync(kv, true)
  // anyone who was already invited into chats by email (x:address) is now this person
  let moved = 0
  if (store) {
    try {
      for (const r of await store.memberRowsFor('x:' + email)) {
        await store.insertMembers([{ group_id: r.group_id, member: entry.id, is_outside: false, hidden: false, added_by: r.added_by }])
        await store.deleteMember(r.group_id, 'x:' + email)
        moved++
      }
    } catch { /* the person is added either way; the old email invites stay as they are */ }
  }
  return { people: list(), moved }
}

async function remove(kv, me, a) {
  if (!kv || !kv.update) throw Object.assign(new Error('Saving is not available right now.'), { status: 503 })
  const email = A.norm(a.email)
  await kv.update(KEY, (v) => ({ next: { people: ((v && v.people) || []).filter((o) => A.norm(o.email) !== email) }, result: null }))
  await sync(kv, true)
  return { people: list() }
}

// Is this signed session still good? Everyone on the roster in code always is. An outside person must still be on the saved list, so removing them
// ends their session on the next request, not 14 days later. If the list has never been read here, fail open: a database blip must not lock people out.
async function stillAllowed(session, kv) {
  if (!session || !String(session.sub).startsWith('o_')) return true
  await sync(kv)
  return !loadedOnce || A.PEOPLE.some((p) => p.id === session.sub)
}

const reset = () => { loadedAt = 0 }   // tests: forget the cached list

module.exports = { KEY, idFor, sync, list, add, remove, stillAllowed, reset, isMail }
