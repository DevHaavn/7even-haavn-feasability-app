// Lists upcoming Outlook events on the shared mailbox (default boardroom@haavn.au)
// so the CRM can pull in meetings that were booked by email rather than typed in.
// Same Entra app + app-only permission as api/calendar.js — Calendars.ReadWrite
// already covers reading, so this needs no extra consent.
// Env: MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET.
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
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }
  const tenant = process.env.MS_TENANT_ID, clientId = process.env.MS_CLIENT_ID, secret = process.env.MS_CLIENT_SECRET
  if (!tenant || !clientId || !secret) {
    res.status(501).json({ error: 'Microsoft 365 not configured — set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET and grant the Entra app Calendars.ReadWrite.' })
    return
  }
  const mailbox = (req.query && req.query.mailbox) || 'boardroom@haavn.au'
  const days = Math.min(parseInt((req.query && req.query.days) || '30', 10) || 30, 120)
  const start = new Date(Date.now() - 24 * 3600e3).toISOString()
  const end = new Date(Date.now() + days * 24 * 3600e3).toISOString()
  try {
    const token = await graphToken(tenant, clientId, secret)
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/calendarView`
      + `?startDateTime=${start}&endDateTime=${end}&$orderby=start/dateTime&$top=50`
      + `&$select=id,subject,start,end,location,onlineMeeting,attendees,bodyPreview,organizer`
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="Australia/Melbourne"' },
    })
    const j = await r.json()
    if (!r.ok) { res.status(r.status).json({ error: (j.error && j.error.message) || 'Graph error' }); return }
    // Flatten to exactly what the CRM meeting register needs.
    const events = (j.value || []).map(e => ({
      calendarEventId: e.id,
      subject: e.subject || '(no subject)',
      start: (e.start && e.start.dateTime) ? e.start.dateTime.slice(0, 16) : '',
      location: (e.location && e.location.displayName) || (e.onlineMeeting ? 'Teams' : ''),
      joinUrl: (e.onlineMeeting && e.onlineMeeting.joinUrl) || '',
      organizer: (e.organizer && e.organizer.emailAddress && e.organizer.emailAddress.address) || '',
      attendees: (e.attendees || []).map(a => ({
        name: (a.emailAddress && a.emailAddress.name) || '',
        email: (a.emailAddress && a.emailAddress.address) || '',
      })),
      preview: (e.bodyPreview || '').slice(0, 400),
    }))
    res.status(200).json({ mailbox, count: events.length, events })
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) })
  }
}
