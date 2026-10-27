// Outlook calendar invites for ATRIUM meetings, through Microsoft Graph (the same Entra app as the mailer and the Meetings screen).
// The invite is created on one organizer mailbox (default boardroom@haavn.au) so every meeting has the same organizer; people are invited
// as attendees and Exchange sends the invitations. Needs MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET and the app permission Calendars.ReadWrite.
const TZ = 'Australia/Melbourne'
const p2 = (n) => String(n).padStart(2, '0')

// start and end as local date-times (no zone suffix: the zone is sent alongside)
function span(date, time, minutes) {
  const [y, mo, d] = String(date).split('-').map(Number), [h, mi] = String(time || '10:00').split(':').map(Number)
  const end = new Date(Date.UTC(y, mo - 1, d, h, mi + (Number(minutes) || 60)))
  return { start: `${date}T${p2(h)}:${p2(mi)}:00`, end: `${end.getUTCFullYear()}-${p2(end.getUTCMonth() + 1)}-${p2(end.getUTCDate())}T${p2(end.getUTCHours())}:${p2(end.getUTCMinutes())}:00` }
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function eventFor(meeting, opts = {}) {
  const { start, end } = span(meeting.date, meeting.time, opts.minutes)
  const agenda = (meeting.items || []).map((i) => String(i.title || '').trim()).filter(Boolean)
  const html = `<p>${esc(meeting.title)}</p>` + (agenda.length ? `<p><b>Agenda</b></p><ul>${agenda.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : '') +
    `<p style="color:#666;font-size:12px">${opts.by ? 'Set up by ' + esc(opts.by) + ' in ATRIUM.' : 'Set up in ATRIUM.'}${opts.site ? ` <a href="${esc(opts.site)}">Open ATRIUM</a>` : ''}</p>`
  const emails = [...new Set((opts.emails || []).map((e) => String(e).trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))]
  return {
    subject: String(meeting.title || 'Meeting').slice(0, 200), body: { contentType: 'HTML', content: html },
    start: { dateTime: start, timeZone: TZ }, end: { dateTime: end, timeZone: TZ },
    attendees: emails.map((address) => ({ emailAddress: { address }, type: 'required' })),
    ...(opts.teams === false ? {} : { isOnlineMeeting: true, onlineMeetingProvider: 'teamsForBusiness' }),
  }
}

function make(env = process.env, fetchImpl = fetch) {
  const ok = !!(env.MS_TENANT_ID && env.MS_CLIENT_ID && env.MS_CLIENT_SECRET)
  const organizer = env.MEETING_ORGANIZER || 'boardroom@haavn.au'
  let tok = null
  async function token() {
    if (tok && tok.exp > Date.now() + 60000) return tok.v
    const body = new URLSearchParams({ client_id: env.MS_CLIENT_ID, client_secret: env.MS_CLIENT_SECRET, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' })
    const r = await fetchImpl(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    if (!r.ok) throw new Error('Outlook sign-in failed (' + r.status + ')')
    const j = await r.json(); tok = { v: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3000) * 1000 }
    return tok.v
  }
  // create the event, or move the one made before (same people, time, agenda)
  async function upsert(meeting, opts = {}) {
    if (!ok) { const e = new Error('Outlook invites are not set up yet.'); e.code = 'notset'; throw e }
    const ev = eventFor(meeting, opts), t = await token()
    const H = { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }
    const base = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizer)}/events`
    if (meeting.calendarEventId) {
      const r = await fetchImpl(`${base}/${encodeURIComponent(meeting.calendarEventId)}`, { method: 'PATCH', headers: H, body: JSON.stringify(ev) })
      if (r.ok) { const j = await r.json().catch(() => ({})); return { id: meeting.calendarEventId, joinUrl: (j.onlineMeeting && j.onlineMeeting.joinUrl) || meeting.teamsJoinUrl || null, webLink: j.webLink || meeting.webLink || null, updated: true } }
      if (r.status !== 404) throw new Error(`Outlook update failed (${r.status})`)   // gone from the calendar: make it again below
    }
    const r = await fetchImpl(base, { method: 'POST', headers: H, body: JSON.stringify(ev) })
    const j = await r.json().catch(() => ({}))
    if (r.status === 201) return { id: j.id, joinUrl: (j.onlineMeeting && j.onlineMeeting.joinUrl) || null, webLink: j.webLink || null, updated: false }
    throw new Error(r.status === 403 ? `Outlook refused: the ATRIUM app needs Calendars.ReadWrite, and ${organizer} must be a real mailbox.` : `Outlook invite failed (${r.status}).`)
  }
  // one person's calendar, from `fromISO` to `toISO`, in Melbourne time: what the Meetings tab shows. Never called with an address the caller did not prove is theirs.
  async function listFor(mailbox, fromISO, toISO) {
    if (!ok) { const e = new Error('Outlook is not set up yet.'); e.code = 'notset'; throw e }
    const t = await token()
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/calendarView?startDateTime=${encodeURIComponent(fromISO)}&endDateTime=${encodeURIComponent(toISO)}`
      + '&$orderby=start/dateTime&$top=100&$select=id,subject,start,end,isAllDay,isCancelled,location,onlineMeeting,attendees,organizer,webLink'
    const r = await fetchImpl(url, { headers: { Authorization: 'Bearer ' + t, Prefer: `outlook.timezone="${TZ}"` } })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { const e = new Error((j.error && j.error.message) || `Outlook answered ${r.status}`); e.status = r.status; throw e }
    return (j.value || []).filter((e) => !e.isCancelled).map((e) => ({
      id: e.id, subject: e.subject || '(no subject)', allDay: !!e.isAllDay,
      start: String((e.start && e.start.dateTime) || '').slice(0, 19), end: String((e.end && e.end.dateTime) || '').slice(0, 19),
      location: (e.location && e.location.displayName) || (e.onlineMeeting ? 'Teams' : ''),
      joinUrl: (e.onlineMeeting && e.onlineMeeting.joinUrl) || '', webLink: e.webLink || '',
      organizer: (e.organizer && e.organizer.emailAddress && (e.organizer.emailAddress.name || e.organizer.emailAddress.address)) || '',
      people: (e.attendees || []).length,
    }))
  }
  // a new event on one person's own calendar, with the invitations Exchange sends to the attendees
  async function createOn(mailbox, meeting, opts = {}) {
    if (!ok) { const e = new Error('Outlook is not set up yet.'); e.code = 'notset'; throw e }
    const ev = eventFor(meeting, opts), t = await token()
    const r = await fetchImpl(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/events`, { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(ev) })
    const j = await r.json().catch(() => ({}))
    if (r.status === 201) return { id: j.id, joinUrl: (j.onlineMeeting && j.onlineMeeting.joinUrl) || null, webLink: j.webLink || null }
    const e = new Error((j.error && j.error.message) || `Outlook refused (${r.status})`); e.status = r.status; throw e
  }
  return { configured: ok, organizer, upsert, listFor, createOn }
}
module.exports = { make, eventFor, span }
