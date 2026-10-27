// Sends the meeting record via Microsoft Graph as the chosen From (shared mailbox
// or send-as). App-only auth; the client secret never touches the browser.
// Env: MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET. Entra app needs Mail.Send.
async function graphToken(tenant, clientId, secret) {
  const body = new URLSearchParams({
    client_id: clientId, client_secret: secret,
    scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials',
  })
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  })
  if (!r.ok) throw new Error(`token ${r.status}: ${await r.text()}`)
  return (await r.json()).access_token
}

// Needs a signed-in ATRIUM person (Microsoft sign-in). It may send only from a shared company mailbox or the person's own, to real addresses, within limits.
const G = require('./_utils/msGuard')
const MAX_TO = 25, MAX_ATTACH = 6, MAX_ATTACH_B64 = 10 * 1024 * 1024, MAX_HTML = 400000

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  res.setHeader('Cache-Control', 'no-store')
  const me = G.signedIn(req, res); if (!me) return
  let b = req.body
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = null } }
  if (!b || !b.from || !Array.isArray(b.to) || !b.to.length || !b.subject) {
    res.status(400).json({ error: 'from, to and subject are required' }); return
  }
  const from = String(b.from).trim()
  if (!G.senderAllowed(me, from)) { res.status(403).json({ error: 'You cannot send from that mailbox. Use a shared company mailbox or your own.' }); return }
  const to = G.addresses(b.to, MAX_TO); if (to.error) { res.status(400).json({ error: to.error }); return }
  const cc = G.addresses(b.cc || [], MAX_TO); if (cc.error) { res.status(400).json({ error: cc.error }); return }
  const html = String(b.html || ''); if (html.length > MAX_HTML) { res.status(413).json({ error: 'That email is too long.' }); return }
  const atts = Array.isArray(b.attachments) ? b.attachments : []
  if (atts.length > MAX_ATTACH || atts.reduce((n, a) => n + String((a && a.contentBytesBase64) || '').length, 0) > MAX_ATTACH_B64) { res.status(413).json({ error: 'Too many or too large attachments.' }); return }
  const tenant = process.env.MS_TENANT_ID, clientId = process.env.MS_CLIENT_ID, secret = process.env.MS_CLIENT_SECRET
  if (!tenant || !clientId || !secret) {
    res.status(501).json({ error: 'Microsoft 365 not configured — set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET and grant the Entra app Mail.Send.' })
    return
  }
  try {
    const token = await graphToken(tenant, clientId, secret)
    const message = {
      subject: String(b.subject).slice(0, 250),
      body: { contentType: 'HTML', content: html },
      toRecipients: to.list.map(a => ({ emailAddress: { address: a } })),
      ccRecipients: cc.list.map(a => ({ emailAddress: { address: a } })),
      attachments: atts.map(a => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: String((a && a.name) || 'attachment').slice(0, 160), contentType: String((a && a.contentType) || 'application/octet-stream').slice(0, 100), contentBytes: String((a && a.contentBytesBase64) || ''),
      })),
      internetMessageHeaders: [{ name: 'x-atrium-sent-by', value: String(me.name || me.sub).replace(/[^\x20-\x7e]/g, '').slice(0, 80) || 'ATRIUM' }],
    }
    const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, saveToSentItems: true }),
    })
    if (r.status === 202) { res.status(200).json({ ok: true }); return }
    const detail = await r.text()
    res.status(r.status === 403 ? 403 : 502).json({ error: `Graph sendMail failed (${r.status}) — check the From is an authorised send-as / shared mailbox and SPF/DKIM for its domain.`, detail: detail.slice(0, 300) })
  } catch (e) {
    res.status(502).json({ error: 'Send failed', detail: String((e && e.message) || e) })
  }
}
