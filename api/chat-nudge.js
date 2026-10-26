// Runs every 5 minutes (vercel.json crons). Emails people who have had a chat message unread for 10 minutes, once per message.
// Needs CRON_SECRET (Vercel sends it as a Bearer token), the service key, and the Microsoft mail app (MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET).
const D = require('./_utils/chatDb')
const P = require('./_utils/chatPush')

async function graphToken(env) {
  const body = new URLSearchParams({ client_id: env.MS_CLIENT_ID, client_secret: env.MS_CLIENT_SECRET, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' })
  const r = await fetch(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!r.ok) throw new Error('mail token ' + r.status)
  return (await r.json()).access_token
}

module.exports = async (req, res) => {
  const env = process.env
  if (!env.CRON_SECRET) { res.status(503).json({ error: 'CRON_SECRET is not set.' }); return }
  if (req.headers.authorization !== 'Bearer ' + env.CRON_SECRET) { res.status(401).json({ error: 'no' }); return }
  if (!env.MS_TENANT_ID || !env.MS_CLIENT_ID || !env.MS_CLIENT_SECRET) { res.status(200).json({ skipped: 'mail not set up' }); return }
  try {
    const { store } = D.supa()
    const messages = await store.recentMessages(new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    const gids = [...new Set(messages.map((m) => m.group_id))]
    if (!gids.length) { res.status(200).json({ emailed: 0 }); return }
    const [groups, members] = await Promise.all([store.allGroups(gids), store.membersByGroups(gids)])
    const list = P.nudges({ messages, members, groups })
    if (!list.length) { res.status(200).json({ emailed: 0 }); return }
    const token = await graphToken(env)
    const from = env.CHAT_MAIL_FROM || 'reception@7even.au'
    const site = 'https://' + (req.headers['x-forwarded-host'] || req.headers.host || '7even-haavn-feasability-app-redux.vercel.app')
    let emailed = 0
    for (const n of list) {
      const m = P.emailFor(n, site)
      const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: { subject: m.subject, body: { contentType: 'HTML', content: m.html }, toRecipients: [{ emailAddress: { address: m.to } }] }, saveToSentItems: false }) })
      if (r.status === 202) { emailed++; for (const i of n.items) await store.markEmailed(i.gid, n.person.id, i.topId) }
    }
    res.status(200).json({ emailed })
  } catch (e) { res.status(502).json({ error: String((e && e.message) || e).slice(0, 140) }) }
}
