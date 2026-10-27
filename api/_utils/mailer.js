// Email out of ATRIUM through Microsoft Graph, from one shared mailbox (default boardroom@haavn.au), with the person's own address as Reply-To and a blind copy,
// so replies reach them. Needs MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET and the Entra app permission Mail.Send.
function make(env = process.env, fetchImpl = fetch) {
  const ok = !!(env.MS_TENANT_ID && env.MS_CLIENT_ID && env.MS_CLIENT_SECRET)
  const from = env.NOTES_MAIL_FROM || env.MEETING_ORGANIZER || 'boardroom@haavn.au'
  let tok = null
  async function token() {
    if (tok && tok.exp > Date.now() + 60000) return tok.v
    const body = new URLSearchParams({ client_id: env.MS_CLIENT_ID, client_secret: env.MS_CLIENT_SECRET, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' })
    const r = await fetchImpl(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    if (!r.ok) throw new Error('Email sign-in failed (' + r.status + ')')
    const j = await r.json(); tok = { v: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3000) * 1000 }
    return tok.v
  }
  async function send({ to, subject, html, replyTo, replyName, bcc }) {
    if (!ok) { const e = new Error('Email is not set up yet.'); e.code = 'notset'; throw e }
    const t = await token()
    const addr = (a) => ({ emailAddress: { address: a } })
    const message = { subject: String(subject).slice(0, 250), body: { contentType: 'HTML', content: html }, toRecipients: to.map(addr),
      ...(replyTo ? { replyTo: [{ emailAddress: { address: replyTo, name: replyName || undefined } }] } : {}), ...(bcc ? { bccRecipients: [addr(bcc)] } : {}) }
    const r = await fetchImpl(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ message, saveToSentItems: true }) })
    if (r.status !== 202) throw new Error(r.status === 403 ? `Email refused: the ATRIUM app needs Mail.Send, and ${from} must be a real mailbox.` : `Email failed (${r.status}).`)
    return { ok: true, from }
  }
  return { configured: ok, from, send }
}
module.exports = { make }
