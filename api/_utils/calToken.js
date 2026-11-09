// ATRIUM diary connection: lets a signed-in person's OWN Outlook diary show in ATRIUM, whichever Microsoft company it is in (haavn.au or 7even.au).
// ATRIUM's shared Microsoft connection can only reach haavn.au mailboxes. A person in another company connects once: they sign in again with a Microsoft prompt
// that asks for permission to read and write their own calendar. Reading shows it in ATRIUM; writing lets ATRIUM keep a copy of their other company's diary in it
// (api/_utils/calMirror.js), so Outlook shows both. Microsoft then gives ATRIUM a refresh token for that person, which is kept here.
//
// The token is stored in capital_kv, which the browser can read with the public key, so it is NEVER stored as plain text: it is sealed with AES-256-GCM using a key
// derived from SESSION_SECRET and tied to the person it belongs to. Without the server secret it is unreadable, and it cannot be moved onto another person.
// Env: MS_AUTH_CLIENT_ID, MS_AUTH_CLIENT_SECRET (the multi-tenant sign-in app, which needs the delegated permissions Calendars.ReadWrite and offline_access), SESSION_SECRET.
const crypto = require('crypto')
const { shapeEvents } = require('./outlook')

const KEY = 'atrium_cal_tokens'            // capital_kv: { [personId]: sealed text }
const TZ = 'Australia/Melbourne'
const GRAPH_SCOPE = 'https://graph.microsoft.com/Calendars.ReadWrite offline_access'

function aesKey(env = process.env) {
  const s = env.SESSION_SECRET
  if (!s || s.length < 16) throw new Error('SESSION_SECRET is missing or too short (16+ characters)')
  return crypto.createHmac('sha256', s).update('atrium-cal-token-v1').digest()
}
function seal(obj, personId, env = process.env) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', aesKey(env), iv)
  c.setAAD(Buffer.from(String(personId)))
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()])
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.')
}
function open(text, personId, env = process.env) {
  try {
    const [v, iv, tag, ct] = String(text).split('.')
    if (v !== 'v1') return null
    const d = crypto.createDecipheriv('aes-256-gcm', aesKey(env), Buffer.from(iv, 'base64url'))
    d.setAAD(Buffer.from(String(personId))); d.setAuthTag(Buffer.from(tag, 'base64url'))
    return JSON.parse(Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8'))
  } catch { return null }
}

// rec: { rt (refresh token), acct (the Microsoft sign-in name), tid, at }
async function save(kv, personId, rec, env = process.env) {
  const sealed = seal(rec, personId, env)
  await kv.update(KEY, (v) => ({ next: { ...(v || {}), [personId]: sealed }, result: true }))
}
async function forget(kv, personId) {
  await kv.update(KEY, (v) => { const next = { ...(v || {}) }; delete next[personId]; return { next, result: true } })
}

function make(env = process.env, fetchImpl = fetch) {
  const clientId = env.MS_AUTH_CLIENT_ID, secret = env.MS_AUTH_CLIENT_SECRET
  const configured = !!(clientId && secret && env.SESSION_SECRET && env.SESSION_SECRET.length >= 16)
  const memo = new Map()   // person -> { tok, exp }: the short-lived access token, so most requests make one call to Microsoft

  async function record(kv, personId) {
    const row = await kv.read(KEY)
    const sealed = row && row.value && row.value[personId]
    return sealed ? open(sealed, personId, env) : null
  }
  async function status(personId, kv) {
    if (!configured || !kv) return { connected: false }
    const r = await record(kv, personId)
    return r ? { connected: true, account: r.acct || '', at: r.at || 0 } : { connected: false }
  }
  // A fresh access token from the stored refresh token. null when Microsoft no longer accepts it (the person changed their password, or took the permission away).
  async function access(kv, personId, r) {
    const m = memo.get(personId)
    if (m && m.exp > Date.now() + 60000) return m.tok
    const body = new URLSearchParams({ client_id: clientId, client_secret: secret, grant_type: 'refresh_token', refresh_token: r.rt, scope: GRAPH_SCOPE })
    const tr = await fetchImpl('https://login.microsoftonline.com/common/oauth2/v2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    const j = await tr.json().catch(() => ({}))
    if (!tr.ok || !j.access_token) { memo.delete(personId); const e = new Error(j.error || 'refresh failed'); e.revoked = j.error === 'invalid_grant' || j.error === 'interaction_required'; throw e }
    memo.set(personId, { tok: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3000) * 1000 })
    if (j.refresh_token && j.refresh_token !== r.rt) { try { await save(kv, personId, { ...r, rt: j.refresh_token }, env) } catch { /* the old one still works until it expires */ } }
    return j.access_token
  }
  // The person's own diary, from fromISO to toISO. { connected:false } when they have not connected it; { connected:false, reconnect:true } when Microsoft has ended the permission.
  async function eventsFor(personId, kv, fromISO, toISO) {
    if (!configured || !kv) return { connected: false }
    const r = await record(kv, personId)
    if (!r) return { connected: false }
    let tok
    try { tok = await access(kv, personId, r) }
    catch (e) { if (e.revoked) { try { await forget(kv, personId) } catch { /* ignore */ } return { connected: false, reconnect: true } } throw e }
    const url = 'https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=' + encodeURIComponent(fromISO) + '&endDateTime=' + encodeURIComponent(toISO)
      + '&$orderby=start/dateTime&$top=100&$select=id,subject,start,end,isAllDay,isCancelled,location,onlineMeeting,attendees,organizer,webLink,showAs,sensitivity,categories'
    // Outlook hands back a page at a time; follow the pages (a few at most) so a long window is read whole
    const value = []
    let next = url
    for (let page = 0; next && page < 6; page++) {
      const g = await fetchImpl(next, { headers: { Authorization: 'Bearer ' + tok, Prefer: `outlook.timezone="${TZ}"` } })
      const j = await g.json().catch(() => ({}))
      if (g.status === 401 || g.status === 403) { memo.delete(personId); return { connected: false, reconnect: true } }
      if (!g.ok) throw new Error((j.error && j.error.message) || `Outlook answered ${g.status}`)
      value.push(...(Array.isArray(j.value) ? j.value : []))
      next = j['@odata.nextLink'] || ''
    }
    return { connected: true, account: r.acct || '', events: shapeEvents(value) }
  }
  // Any call to the person's own Graph diary. Returns { ok, status, json }; { revoked:true } when Microsoft has ended the permission.
  async function call(personId, kv, method, path, body) {
    if (!configured || !kv) return { ok: false, status: 0, noConn: true }
    const r = await record(kv, personId)
    if (!r) return { ok: false, status: 0, noConn: true }
    let tok
    try { tok = await access(kv, personId, r) }
    catch (e) { if (e.revoked) { try { await forget(kv, personId) } catch { /* ignore */ } return { ok: false, status: 0, revoked: true } } throw e }
    const g = await fetchImpl('https://graph.microsoft.com/v1.0' + path, { method, headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Prefer: `outlook.timezone="${TZ}"` }, body: body === undefined ? undefined : JSON.stringify(body) })
    const json = g.status === 204 ? {} : await g.json().catch(() => ({}))
    return { ok: g.ok, status: g.status, json }
  }
  return { configured, status, eventsFor, call, forget: (personId, kv) => forget(kv, personId) }
}

module.exports = { KEY, seal, open, save, forget, make }
