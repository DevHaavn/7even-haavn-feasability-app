// Vercel serverless — sends the meeting record email via Microsoft Graph, as the
// chosen From address (shared mailbox or send-as). App-only auth; the client
// secret never touches the browser.
// Secrets (Vercel env): MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET.
// The Entra app needs application permission Mail.Send (admin-consented), and the
// From mailbox must be a real shared mailbox / the app scoped to send as it.

interface Attachment { name: string; contentType: string; contentBytesBase64: string }
interface SendBody { from: string; to: string[]; cc?: string[]; subject: string; html: string; attachments?: Attachment[] }

async function graphToken(tenant: string, clientId: string, secret: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: clientId, client_secret: secret,
    scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials',
  })
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  })
  if (!r.ok) throw new Error(`token ${r.status}: ${await r.text()}`)
  return (await r.json()).access_token as string
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  const tenant = process.env.MS_TENANT_ID, clientId = process.env.MS_CLIENT_ID, secret = process.env.MS_CLIENT_SECRET
  if (!tenant || !clientId || !secret) {
    res.status(501).json({ error: 'Microsoft 365 not configured — set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET in Vercel, and grant the Entra app Mail.Send.' })
    return
  }
  const b: SendBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  if (!b?.from || !b?.to?.length || !b?.subject) { res.status(400).json({ error: 'from, to and subject are required' }); return }
  try {
    const token = await graphToken(tenant, clientId, secret)
    const message = {
      subject: b.subject,
      body: { contentType: 'HTML', content: b.html || '' },
      toRecipients: b.to.map(a => ({ emailAddress: { address: a } })),
      ccRecipients: (b.cc || []).map(a => ({ emailAddress: { address: a } })),
      attachments: (b.attachments || []).map(a => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: a.name, contentType: a.contentType, contentBytes: a.contentBytesBase64,
      })),
    }
    const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(b.from)}/sendMail`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, saveToSentItems: true }),
    })
    if (r.status === 202) { res.status(200).json({ ok: true }); return }
    const detail = await r.text()
    // Common case: the From isn't an authorised send-as → surface it clearly, don't fail silently.
    res.status(r.status === 403 ? 403 : 502).json({ error: `Graph sendMail failed (${r.status}) — check the From is an authorised send-as/shared mailbox and SPF/DKIM for its domain.`, detail })
  } catch (e: any) {
    res.status(502).json({ error: 'Send failed', detail: String(e?.message || e) })
  }
}
