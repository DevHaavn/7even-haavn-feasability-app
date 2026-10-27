// Emails each attendee their boardroom assignments, FROM the boardroom mailbox, via Microsoft Graph (app-only / client credentials).
// Needs a signed-in ATRIUM person (Microsoft sign-in); at most 30 people per send; the sender is always the boardroom mailbox.
// Returns 501 until the M365 credentials are configured, so the boardroom page falls back to a pre-filled mail-app draft.
// Env: MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, optionally BOARDROOM_SENDER (default boardroom@7even.au).
const G = require('./_utils/msGuard')
const MAX_PEOPLE = 30, MAX_ITEMS = 40

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return }
  res.setHeader('Cache-Control', 'no-store')
  const me = G.signedIn(req, res); if (!me) return
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const { meeting, assignments } = body || {}
  if (!Array.isArray(assignments) || !assignments.length) { res.status(400).json({ error: 'no assignments' }); return }
  if (assignments.length > MAX_PEOPLE) { res.status(400).json({ error: `At most ${MAX_PEOPLE} people per send.` }); return }
  const TENANT = process.env.MS_TENANT_ID, CLIENT = process.env.MS_CLIENT_ID, SECRET = process.env.MS_CLIENT_SECRET
  const SENDER = process.env.BOARDROOM_SENDER || 'boardroom@7even.au'
  if (!TENANT || !CLIENT || !SECRET) { res.status(501).json({ error: 'M365 mail not configured' }); return }
  const clip = (v, n) => String(v == null ? '' : v).slice(0, n)
  try {
    const tokRes = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT, client_secret: SECRET, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }),
    })
    const tok = await tokRes.json()
    if (!tok.access_token) { res.status(502).json({ error: 'token failed', detail: clip(tok.error_description, 200) }); return }

    let sent = 0; const errors = []
    for (const p of assignments) {
      if (!p || !G.isMail(p.email)) continue
      const lines = (Array.isArray(p.items) ? p.items.slice(0, MAX_ITEMS) : []).map(it =>
        `\u2022 ${clip(it && it.title, 200)} \u2014 ${clip(it && it.status, 40)}${it && it.due ? ` (due ${clip(it.due, 20)})` : ''}${it && it.notes ? `\n    ${clip(it.notes, 400)}` : ''}`).join('\n')
      const content = `Hi ${clip(p.name, 80).split(' ')[0]},\n\nFrom the weekly boardroom (${clip(meeting, 80)}) you have been assigned:\n\n${lines}\n\n\u2014 7EVEN \u00b7 HAAVN boardroom`
      const mail = {
        message: { subject: `Your boardroom assignments \u2014 ${clip(meeting, 80)}`, body: { contentType: 'Text', content }, toRecipients: [{ emailAddress: { address: String(p.email).trim() } }],
          internetMessageHeaders: [{ name: 'x-atrium-sent-by', value: String(me.name || me.sub).replace(/[^\x20-\x7e]/g, '').slice(0, 80) || 'ATRIUM' }] },
        saveToSentItems: true,
      }
      const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(SENDER)}/sendMail`, {
        method: 'POST', headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(mail),
      })
      if (r.status === 202) sent++
      else { const t = await r.text().catch(() => ''); errors.push(`${p.email}: ${r.status} ${String(t).slice(0, 140)}`) }
    }
    res.status(200).json({ sent, errors })
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) })
  }
}
