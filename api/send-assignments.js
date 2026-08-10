// Vercel serverless function — emails each attendee their boardroom assignments
// FROM boardroom@7even.au, via Microsoft Graph (app-only / client credentials).
//
// Returns HTTP 501 until the M365 credentials are configured, so the boardroom
// client falls back to a pre-filled mail-app draft. To activate silent send:
//   1. Azure app registration with APPLICATION permission Mail.Send (admin-consented).
//      (The Meetings module registration can be reused.)
//   2. Ensure the boardroom@7even.au mailbox exists / is sendable by the app.
//   3. Set Vercel env vars: MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET,
//      and optionally BOARDROOM_SENDER (defaults to boardroom@7even.au).
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const TENANT = process.env.MS_TENANT_ID, CLIENT = process.env.MS_CLIENT_ID, SECRET = process.env.MS_CLIENT_SECRET;
  const SENDER = process.env.BOARDROOM_SENDER || 'boardroom@7even.au';
  if (!TENANT || !CLIENT || !SECRET) { res.status(501).json({ error: 'M365 mail not configured' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { meeting, assignments } = body || {};
  if (!Array.isArray(assignments) || !assignments.length) { res.status(400).json({ error: 'no assignments' }); return; }

  try {
    const tokRes = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT, client_secret: SECRET, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }),
    });
    const tok = await tokRes.json();
    if (!tok.access_token) { res.status(502).json({ error: 'token failed', detail: tok.error_description || '' }); return; }

    let sent = 0; const errors = [];
    for (const p of assignments) {
      if (!p || !p.email) continue;
      const lines = (p.items || []).map(it =>
        `• ${it.title || ''} — ${it.status || ''}${it.due ? ` (due ${it.due})` : ''}${it.notes ? `\n    ${it.notes}` : ''}`).join('\n');
      const content = `Hi ${(p.name || '').split(' ')[0]},\n\nFrom the weekly boardroom (${meeting || ''}) you have been assigned:\n\n${lines}\n\n— 7EVEN · HAAVN boardroom`;
      const mail = {
        message: { subject: `Your boardroom assignments — ${meeting || ''}`, body: { contentType: 'Text', content }, toRecipients: [{ emailAddress: { address: p.email } }] },
        saveToSentItems: true,
      };
      const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(SENDER)}/sendMail`, {
        method: 'POST', headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(mail),
      });
      if (r.status === 202) sent++;
      else { const t = await r.text().catch(() => ''); errors.push(`${p.email}: ${r.status} ${String(t).slice(0, 140)}`); }
    }
    res.status(200).json({ sent, errors });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
