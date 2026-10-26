// ATRIUM sign-in: Microsoft work accounts (either company), one signed session for the whole app.
// Server side only. Nothing here reaches the browser's JavaScript: the session is an httpOnly cookie.
// Env (set in Vercel, never in chat):
//   MS_AUTH_CLIENT_ID / MS_AUTH_CLIENT_SECRET  a multi-tenant Entra app (accounts in any organizational directory), redirect URI
//                                              https://<site>/api/auth/callback, delegated scopes openid profile email only.
//   SESSION_SECRET                             16+ chars, already used for the Xero cookie. Sessions use a key derived from it.
//   ATRIUM_ADMINS                              optional, comma separated extra admin emails.
const crypto = require('crypto')

const COOKIE = 'atrium_session'
const FLOW_COOKIE = 'atrium_auth_flow'
const SESSION_DAYS = 14

// The team, from the same roster the Blaze connector uses. Role decides what the server will let a person read or write.
//   admin     the three directors: everything
//   staff     the team: Workflow, meetings, chat, HAAVN work
//   blacksales  the HAAVN BLACK sales login: display and sales tools only
//   external  consultants and designers: chat they are added to, nothing else
// `app` is the role the ATRIUM screens already know (admin, haavnonly, homes, blacksales, external) so signing in with Microsoft lands where the same person's access code does.
const PEOPLE = [
  { id: 'jb', name: 'Jamie Baldwin', role: 'admin', app: 'admin', emails: ['jamie@7even.au'] },
  { id: 'ds', name: 'Daniel Sette', role: 'admin', app: 'admin', emails: ['daniel@7even.au'] },
  { id: 'lj', name: 'Lewis Jin', role: 'admin', app: 'admin', emails: ['lewis@7even.au'] },
  { id: 'jw', name: 'James Winstanley', role: 'staff', app: 'haavnonly', emails: ['james@haavn.au'] },
  { id: 'cm', name: 'Callum Macdonald', role: 'staff', app: 'haavnonly', emails: ['callum@haavn.au'] },
  { id: 'mf', name: 'Mike Furniss', role: 'blacksales', app: 'blacksales', emails: ['mike@haavn.au'] },
  { id: 'cw', name: 'Christina Witbreuk', role: 'staff', app: 'homes', emails: ['christina@haavn.au'] },
  { id: 'dp', name: 'Domenic Paolilli', role: 'staff', app: 'haavnonly', emails: ['domenic@haavn.au'] },
  { id: 'jd', name: 'John Dimattina', role: 'staff', app: 'haavnonly', emails: ['john@haavn.au'] },
  { id: 'jwi', name: 'Jeffrey Witbreuk', role: 'staff', app: 'homes', emails: ['jeffrey@haavn.au'] },
  { id: 'jm', name: 'James Maloney', role: 'staff', app: 'haavnonly', emails: ['jamesm@haavn.au'] },
  { id: 'ab', name: 'Amy Baldwin', role: 'staff', app: 'haavnonly', emails: ['accounts@7even.au'] },
  { id: 'dm', name: 'Dominika Ma', role: 'staff', app: 'haavnonly', emails: ['accounts@haavn.au'] },
  { id: 'ar', name: 'Alessia Bresciano', role: 'staff', app: 'haavnonly', emails: ['reception@haavn.au'] },
  { id: 'bz', name: 'Bonnie Zhao', role: 'staff', app: 'haavnonly', emails: ['bonnie@haavn.au'] },
  { id: 'cf', name: 'Callum Fraser', role: 'external', app: 'external', emails: ['c.fraser@fraserandpartners.com'] },
  { id: 'lm', name: 'Lucas Menegazzo', role: 'external', app: 'external', emails: ['l.menegazzo@fraserandpartners.com'] },
  // Seth Bean, designer for HAAVN BLACK (identityx): part of the team. His mail is Google, so he signs in with a Microsoft account made with that address.
  { id: 'sb', name: 'Seth Bean', role: 'staff', app: 'haavnonly', emails: ['hello@identityx.com.au'] },
]
const norm = (e) => String(e || '').trim().toLowerCase()

// extra: [{ email, person_id }] from the atrium_identities table (second and third addresses people add themselves).
function personByEmail(email, extra = [], env = process.env) {
  const e = norm(email)
  if (!e) return null
  let p = PEOPLE.find((x) => x.emails.includes(e))
  if (!p) { const link = extra.find((x) => norm(x.email) === e); if (link) p = PEOPLE.find((x) => x.id === link.person_id) }
  if (!p) return null
  const admins = String(env.ATRIUM_ADMINS || '').split(',').map(norm).filter(Boolean)
  const role = admins.includes(e) ? 'admin' : p.role
  return { id: p.id, name: p.name, role, app: role === 'admin' && p.app !== 'admin' ? 'admin' : p.app, emails: [...new Set([...p.emails, ...extra.filter((x) => x.person_id === p.id).map((x) => norm(x.email))])] }
}

// ---------- the session: payload.signature, HMAC-SHA256 with a key derived from SESSION_SECRET ----------
const b64 = (b) => Buffer.from(b).toString('base64url')
function sessionKey(env = process.env) {
  const s = env.SESSION_SECRET
  if (!s || s.length < 16) throw new Error('SESSION_SECRET is missing or too short (16+ characters)')
  return crypto.createHmac('sha256', s).update('atrium-session-v1').digest()
}
function sign(payload, env = process.env) {
  const body = b64(JSON.stringify(payload))
  return body + '.' + crypto.createHmac('sha256', sessionKey(env)).update(body).digest('base64url')
}
function verify(token, env = process.env, nowSec = Math.floor(Date.now() / 1000)) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  let good
  try { good = crypto.createHmac('sha256', sessionKey(env)).update(body).digest('base64url') } catch { return null }
  const a = Buffer.from(sig || ''), c = Buffer.from(good)
  if (a.length !== c.length || !crypto.timingSafeEqual(a, c)) return null
  let p
  try { p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) } catch { return null }
  if (!p || !p.exp || p.exp < nowSec) return null
  return p
}
function newSession(person, via, env = process.env, nowSec = Math.floor(Date.now() / 1000)) {
  return sign({ v: 1, sub: person.id, name: person.name, role: person.role, app: person.app, emails: person.emails, via, iat: nowSec, exp: nowSec + SESSION_DAYS * 86400 }, env)
}
function parseCookies(req) {
  const out = {}
  String((req.headers && req.headers.cookie) || '').split(';').forEach((part) => {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  })
  return out
}
const cookie = (name, value, maxAge) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
function sessionFrom(req, env = process.env) { return verify(parseCookies(req)[COOKIE], env) }

// ---------- the Microsoft flow: authorization code with PKCE ----------
const pkce = () => {
  const verifier = crypto.randomBytes(32).toString('base64url')
  return { verifier, challenge: crypto.createHash('sha256').update(verifier).digest('base64url') }
}
function authorizeUrl({ clientId, redirectUri, state, nonce, challenge, hint }) {
  const q = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, response_mode: 'query', scope: 'openid profile email',
    state, nonce, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account' })
  if (hint) q.set('login_hint', hint)
  return 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' + q
}
// The id_token comes straight from Microsoft's token endpoint over TLS, so it is read, not re-verified against the keys; every claim that matters is checked.
function readIdToken(idToken, { clientId, nonce }, nowSec = Math.floor(Date.now() / 1000)) {
  let c
  try { c = JSON.parse(Buffer.from(String(idToken).split('.')[1], 'base64url').toString('utf8')) } catch { throw new Error('Microsoft sent an unreadable sign-in token') }
  if (c.aud !== clientId) throw new Error('That sign-in was not issued for ATRIUM')
  if (!c.tid || !String(c.iss || '').startsWith('https://login.microsoftonline.com/' + c.tid)) throw new Error('That sign-in came from an unexpected place')
  if (c.nonce !== nonce) throw new Error('That sign-in does not match the one we started')
  if (!c.exp || c.exp < nowSec - 60) throw new Error('That sign-in has expired')
  // Who it is: the account's own sign-in name. The `email` claim is NOT trusted for work accounts: in a multi-company app another company's
  // administrator can set it to anything. A work account's sign-in name (UPN) must be on a domain that company has proven it owns, so it cannot be
  // faked. A personal Microsoft account's email is verified by Microsoft, so there it is fine.
  const PERSONAL = '9188040d-6c67-4c5b-b112-36a304b66dad'
  const email = norm(c.preferred_username || c.upn || (c.tid === PERSONAL ? c.email : ''))
  if (!email || !email.includes('@')) throw new Error('Microsoft did not share an email address for that account')
  return { email, name: c.name || '', tid: c.tid }
}

// Only same-site paths, so a sign-in link cannot be used to send someone elsewhere.
const safeReturn = (r) => (typeof r === 'string' && /^\/(?!\/)[\w\-./?=&#%]*$/.test(r) ? r : '/')

module.exports = { COOKIE, FLOW_COOKIE, SESSION_DAYS, PEOPLE, personByEmail, sign, verify, newSession, parseCookies, cookie, sessionFrom, pkce, authorizeUrl, readIdToken, safeReturn, norm }
