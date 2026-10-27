// The door for endpoints that act through the ATRIUM Microsoft app (calendar, and later mail): a signed-in ATRIUM person, never an outside consultant,
// and only the mailboxes that person may use. Without this anyone who knew the address could create events or read calendars.
const A = require('./atriumAuth')

const COMPANY_DOMAINS = ['haavn.au', '7even.au']
const isMail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim())

// Returns the signed-in person, or has already answered 401 / 403 / 503 and returns null.
function signedIn(req, res) {
  let me = null
  try { me = A.sessionFrom(req) } catch { res.status(503).json({ error: 'Sign-in is not set up.' }); return null }
  if (!me) { res.status(401).json({ error: 'Sign in with Microsoft in ATRIUM first.', code: 'signin' }); return null }
  if (me.role === 'external') { res.status(403).json({ error: 'This is not available to outside consultants.' }); return null }
  return me
}

// The shared boardroom calendar (and any named in MEETING_ORGANIZER / CALENDAR_MAILBOXES), or the person's own mailbox on a company domain.
function mailboxAllowed(me, address, env = process.env) {
  const a = String(address || '').trim().toLowerCase()
  if (!isMail(a)) return false
  const shared = ['boardroom@haavn.au', env.MEETING_ORGANIZER, ...String(env.CALENDAR_MAILBOXES || '').split(',')].map((x) => String(x || '').trim().toLowerCase()).filter(Boolean)
  if (shared.includes(a)) return true
  const [local, domain] = a.split('@')
  return COMPANY_DOMAINS.includes(domain) && ((me && me.emails) || []).some((e) => String(e).toLowerCase().split('@')[0] === local)
}
// Sending mail: from a shared company mailbox (named here, plus MAIL_SHARED_MAILBOXES), or from the person's own mailbox. Never as anyone else.
const SHARED_SENDERS = ['boardroom@haavn.au', 'boardroom@7even.au', 'accounts@haavn.au', 'reception@7even.au', 'reception@haavn.au']
function senderAllowed(me, address, env = process.env) {
  const a = String(address || '').trim().toLowerCase()
  if (!isMail(a)) return false
  const shared = [...SHARED_SENDERS, ...String(env.MAIL_SHARED_MAILBOXES || '').split(','), env.NOTES_MAIL_FROM, env.BOARDROOM_SENDER].map((x) => String(x || '').trim().toLowerCase()).filter(Boolean)
  return shared.includes(a) || mailboxAllowed(me, a, env)
}
// A list of addresses, tidied: only real ones, no repeats, never more than max (more than max is an error for the caller to report).
function addresses(list, max) {
  const out = [...new Set((Array.isArray(list) ? list : []).map((x) => String(x == null ? '' : x).trim().toLowerCase()).filter(Boolean))]
  if (out.length > max) return { error: `At most ${max} addresses.` }
  const bad = out.find((x) => !isMail(x)); if (bad) return { error: `"${bad.slice(0, 60)}" is not an email address.` }
  return { list: out }
}
module.exports = { signedIn, mailboxAllowed, senderAllowed, addresses, isMail }
