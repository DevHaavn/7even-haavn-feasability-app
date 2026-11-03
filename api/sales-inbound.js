// POST /api/sales-inbound   An enquiry email, pushed in by a forwarding rule (Power Automate, an Outlook rule, the website form itself).
// Header  x-sales-secret: <SALES_INBOUND_SECRET>   (or Authorization: Bearer <secret>)
// Body    JSON { subject, from, body | html, messageId?, receivedAt? }, or the plain text / html of the email with subject, from, messageId and receivedAt in the address (?subject=...).
//         One email never makes two leads (messageId, else a fingerprint).
const crypto = require('crypto')
const S = require('./_utils/sales')
const SD = require('./_utils/salesDb')
const D = require('./_utils/chatDb')
const B = require('./_utils/blaze')
const PUSH = require('./_utils/chatPush')

const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y) }

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return }
  const secret = process.env.SALES_INBOUND_SECRET
  if (!secret) { res.status(503).json({ error: 'SALES_INBOUND_SECRET is not set.' }); return }
  const given = req.headers['x-sales-secret'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!given || !same(given, secret)) { res.status(401).json({ error: 'no' }); return }
  let b = req.body
  // Power Automate sends the email's text as the body and the details in the address: ?subject=...&from=...&messageId=...&receivedAt=...
  const q = req.query || {}
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = { body: b, subject: q.subject, from: q.from, messageId: q.messageId, receivedAt: q.receivedAt } } }
  else if (Buffer.isBuffer(b)) b = { body: b.toString('utf8'), subject: q.subject, from: q.from, messageId: q.messageId, receivedAt: q.receivedAt }
  if (!b || typeof b !== 'object') b = {}
  // a plain form post: fields become "Label: value" lines, so the same reader handles it
  if (!b.body && !b.html) {
    const skip = new Set(['subject', 'from', 'messageId', 'receivedAt'])
    const lines = Object.keys(b).filter((k) => !skip.has(k) && typeof b[k] !== 'object').map((k) => `${k}: ${b[k]}`)
    if (lines.length) b = { ...b, body: lines.join('\n') }
  }
  if (!b.body && !b.html) { res.status(400).json({ error: 'The email has no body.' }); return }
  try {
    let kv = null
    try { kv = B.kv() } catch { /* the task is skipped without it */ }
    const { store } = D.supa()
    const r = await S.ingestEmail({ db: SD.supa(), chat: store, kv, wp: PUSH.makeSender() }, b)
    res.status(200).json({ ok: true, ...(r.lead ? { leadId: r.lead.id, duplicate: !!r.dup } : r) })
  } catch (e) {
    if (e && (e.code === 'PGRST205' || e.code === '42P01')) { res.status(503).json({ error: 'The sales tables are not created yet.' }); return }
    res.status(502).json({ error: 'Could not take that email.', detail: String((e && e.message) || e).slice(0, 140) })
  }
}
