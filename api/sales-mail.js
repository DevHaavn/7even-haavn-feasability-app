// Runs every 5 minutes (vercel.json crons). Reads the sales@haavnblack.au mailbox through Microsoft Graph and turns enquiry emails into leads, once each.
// Needs CRON_SECRET (Vercel sends it as a Bearer token), the service key, the Microsoft app (MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET) and the app permission
// Mail.Read for that mailbox. Without the permission it says so on the Inbox screen instead of failing quietly. SALES_MAILBOX overrides the address.
const S = require('./_utils/sales')
const SD = require('./_utils/salesDb')
const D = require('./_utils/chatDb')
const B = require('./_utils/blaze')
const PUSH = require('./_utils/chatPush')

async function graphToken(env, fetchImpl = fetch) {
  const body = new URLSearchParams({ client_id: env.MS_CLIENT_ID, client_secret: env.MS_CLIENT_SECRET, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' })
  const r = await fetchImpl(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!r.ok) throw new Error('mail token ' + r.status)
  return (await r.json()).access_token
}

// Reads the mailbox and ingests what is new. Returns { ok, processed, leads, error? } and records the same for the Inbox screen.
async function poll(env, deps, fetchImpl = fetch) {
  const mailbox = env.SALES_MAILBOX || 'sales@haavnblack.au'
  const note = async (v) => { try { await deps.db.settings.set('mail', { ...v, mailbox, at: Date.now() }) } catch { /* ignore */ } return v }
  if (!env.MS_TENANT_ID || !env.MS_CLIENT_ID || !env.MS_CLIENT_SECRET) return note({ ok: false, error: 'The Microsoft 365 connection is not set up (MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET).' })
  let token
  try { token = await graphToken(env, fetchImpl) } catch (e) { return note({ ok: false, error: 'Could not sign in to Microsoft 365 (' + String((e && e.message) || e).slice(0, 60) + ').' }) }
  const since = new Date(Date.now() - 3 * 864e5).toISOString()
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/mailFolders/inbox/messages?$top=50&$orderby=receivedDateTime desc&$filter=receivedDateTime ge ${since}&$select=id,internetMessageId,subject,from,receivedDateTime,body`
  const r = await fetchImpl(url.replace(/ /g, '%20'), { headers: { Authorization: 'Bearer ' + token, Prefer: 'outlook.body-content-type="text"' } })
  if (!r.ok) {
    const msg = r.status === 403 || r.status === 401 ? `Microsoft will not let ATRIUM read ${mailbox}. An admin needs to grant the ATRIUM app the Mail.Read application permission (and the mailbox must exist).` : r.status === 404 ? `The mailbox ${mailbox} was not found.` : `Microsoft answered ${r.status} when reading ${mailbox}.`
    return note({ ok: false, error: msg, status: r.status })
  }
  const list = ((await r.json()).value || []).reverse()   // oldest first
  let processed = 0, leads = 0
  for (const m of list) {
    try {
      const out = await S.ingestEmail(deps, { messageId: m.internetMessageId || m.id, from: m.from && m.from.emailAddress ? `${m.from.emailAddress.name || ''} <${m.from.emailAddress.address || ''}>` : '', subject: m.subject, body: (m.body && m.body.content) || '', html: m.body && m.body.contentType === 'html' ? m.body.content : '', receivedAt: m.receivedDateTime })
      if (!out.skipped) { processed++; if (out.lead && !out.dup) leads++ }
    } catch { /* one bad email never stops the rest */ }
  }
  return note({ ok: true, processed, leads })
}

module.exports = async (req, res) => {
  const env = process.env
  if (!env.CRON_SECRET) { res.status(503).json({ error: 'CRON_SECRET is not set.' }); return }
  if (req.headers.authorization !== 'Bearer ' + env.CRON_SECRET) { res.status(401).json({ error: 'no' }); return }
  try {
    let kv = null
    try { kv = B.kv() } catch { /* tasks are skipped without it */ }
    const { store } = D.supa()
    res.status(200).json(await poll(env, { db: SD.supa(), chat: store, kv, wp: PUSH.makeSender() }))
  } catch (e) { res.status(502).json({ error: 'Could not read the mailbox.', detail: String((e && e.message) || e).slice(0, 140) }) }
}
module.exports.poll = poll
