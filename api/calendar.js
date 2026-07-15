// Creates an Outlook calendar event (with a Teams online-meeting link) via Graph,
// on the organizer's calendar (default boardroom@haavn.au), inviting attendees.
// Env: MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET. App perm: Calendars.ReadWrite.
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

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  const tenant = process.env.MS_TENANT_ID, clientId = process.env.MS_CLIENT_ID, secret = process.env.MS_CLIENT_SECRET
  if (!tenant || !clientId || !secret) {
    res.status(501).json({ error: 'Microsoft 365 not configured — set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET and grant the Entra app Calendars.ReadWrite.' })
    return
  }
  let b = req.body
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = null } }
  if (!b || !b.subject || !b.start || !b.end) { res.status(400).json({ error: 'subject, start and end are required' }); return }
  const organizer = b.organizer || 'boardroom@haavn.au'
  const tz = b.timeZone || 'Australia/Melbourne'
  try {
    const token = await graphToken(tenant, clientId, secret)
    const event = {
      subject: b.subject,
      body: { contentType: 'HTML', content: b.body || '' },
      start: { dateTime: b.start, timeZone: tz },
      end: { dateTime: b.end, timeZone: tz },
      location: b.location ? { displayName: b.location } : undefined,
      attendees: (b.attendees || []).filter(Boolean).map(a => ({ emailAddress: { address: a }, type: 'required' })),
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness',
    }
    const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizer)}/events`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    const j = await r.json().catch(() => ({}))
    if (r.status === 201) {
      res.status(200).json({ id: j.id, joinUrl: (j.onlineMeeting && j.onlineMeeting.joinUrl) || null, webLink: j.webLink || null })
      return
    }
    res.status(r.status === 403 ? 403 : 502).json({ error: `Calendar create failed (${r.status}) — check the app has Calendars.ReadWrite (admin-consented) and that ${organizer} is a real mailbox.`, detail: JSON.stringify(j).slice(0, 400) })
  } catch (e) {
    res.status(502).json({ error: 'Calendar create failed', detail: String((e && e.message) || e) })
  }
}
