// /api/auth/login   start Microsoft sign-in           (?return=/path, ?hint=email)
// /api/auth/callback Microsoft sends the person back here
// /api/auth/me      who is signed in (JSON)
// /api/auth/config  is Microsoft sign-in set up (JSON, so the button only shows when it will work)
// /api/auth/logout  end the session
// Routed by vercel.json: /api/auth/:action -> /api/auth?action=:action
const A = require('./_utils/atriumAuth')

const origin = (req) => `https://${req.headers['x-forwarded-host'] || req.headers.host}`
const page = (res, status, title, body) => {
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#2d2f34;color:#fff;font:300 16px/1.55 Inter,system-ui,sans-serif"><main style="max-width:30rem;padding:2rem"><h1 style="font-weight:300;font-size:1.6rem;margin:0 0 .6rem">${title}</h1><p style="color:rgba(255,255,255,.75);margin:0 0 1.4rem">${body}</p><a href="/" style="color:#d6b36a">Back to ATRIUM</a></main>`)
}

// Extra addresses people have linked to themselves. Needs the service key and the atrium_identities table; without them only the roster applies.
async function linked(env = process.env, fetchImpl = fetch) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return []
  try {
    const base = (env.SUPABASE_URL || 'https://vgvavmnqrdgcnledztyk.supabase.co') + '/rest/v1/atrium_identities?select=email,person_id'
    const r = await fetchImpl(base, { headers: { apikey: key, Authorization: 'Bearer ' + key } })
    return r.ok ? await r.json() : []
  } catch { return [] }
}

module.exports = async (req, res) => {
  const env = process.env
  const action = String((req.query && req.query.action) || '').toLowerCase()
  res.setHeader('Cache-Control', 'no-store')

  if (action === 'me') {
    let s = null
    try { s = A.sessionFrom(req, env) } catch { /* no secret set */ }
    if (!s) { res.status(401).json({ ok: false }); return }
    res.status(200).json({ ok: true, person: { id: s.sub, name: s.name, role: s.role, app: s.app || 'haavnonly', emails: s.emails }, via: s.via, expires: s.exp })
    return
  }
  if (action === 'config') {
    // names only, never values: which of the three settings the server can see
    const missing = ['MS_AUTH_CLIENT_ID', 'MS_AUTH_CLIENT_SECRET', 'SESSION_SECRET'].filter((k) => !env[k])
    // the shape of the saved secret and id, never the values: enough to spot a pasted Secret ID, a stray space or a cut-off paste
    const shape = (v) => (v ? { length: v.length, looksLikeGuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v), hasSpaceOrNewline: /\s/.test(v), hasTilde: v.includes('~') } : null)
    res.status(200).json(missing.length ? { microsoft: false, missing } : { microsoft: true, secret: shape(env.MS_AUTH_CLIENT_SECRET), clientId: shape(env.MS_AUTH_CLIENT_ID) }); return
  }
  if (action === 'logout') {
    res.setHeader('Set-Cookie', A.cookie(A.COOKIE, '', 0))
    if ((req.headers.accept || '').includes('text/html')) { res.redirect(302, '/'); return }
    res.status(200).json({ ok: true }); return
  }

  const clientId = env.MS_AUTH_CLIENT_ID, secret = env.MS_AUTH_CLIENT_SECRET
  if (action === 'login' || action === 'callback') {
    if (!clientId || !secret || !env.SESSION_SECRET) {
      page(res, 501, 'Sign in with Microsoft is not set up yet', 'ATRIUM needs the Microsoft sign-in app added in Vercel (MS_AUTH_CLIENT_ID and MS_AUTH_CLIENT_SECRET) before it can sign anyone in.')
      return
    }
  }

  if (action === 'login') {
    const { verifier, challenge } = A.pkce()
    const state = require('crypto').randomBytes(16).toString('base64url'), nonce = require('crypto').randomBytes(16).toString('base64url')
    const flow = A.sign({ v: 1, state, nonce, verifier, ret: A.safeReturn(req.query.return), exp: Math.floor(Date.now() / 1000) + 600 }, env)
    res.setHeader('Set-Cookie', A.cookie(A.FLOW_COOKIE, flow, 600))
    res.redirect(302, A.authorizeUrl({ clientId, redirectUri: origin(req) + '/api/auth/callback', state, nonce, challenge, hint: req.query.hint }))
    return
  }

  if (action === 'callback') {
    const flow = A.verify(A.parseCookies(req)[A.FLOW_COOKIE], env)
    res.setHeader('Set-Cookie', A.cookie(A.FLOW_COOKIE, '', 0))
    if (req.query.error) { page(res, 400, 'Microsoft did not sign you in', String(req.query.error_description || req.query.error).slice(0, 200)); return }
    if (!flow || !req.query.code || req.query.state !== flow.state) { page(res, 400, 'That sign-in did not match', 'It may have taken too long or been opened in another window. Start again from ATRIUM.'); return }
    try {
      const body = new URLSearchParams({ client_id: clientId, client_secret: secret, grant_type: 'authorization_code', code: String(req.query.code),
        redirect_uri: origin(req) + '/api/auth/callback', code_verifier: flow.verifier })
      const tr = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
      if (!tr.ok) {
        let j = {}; try { j = await tr.json() } catch { /* not JSON */ }
        const codes = String(j.error_description || '').match(/AADSTS\d+/)
        const bad = j.error === 'invalid_client' || (codes && ['AADSTS7000215', 'AADSTS7000222', 'AADSTS7000218'].includes(codes[0]))
        throw new Error(bad
          ? 'Microsoft does not accept the app secret saved in Vercel (' + (codes ? codes[0] : 'invalid_client') + '). The secret must be the Value of a current client secret, not its Secret ID, and it must not have expired. Make a new secret in Entra and save its Value as MS_AUTH_CLIENT_SECRET.'
          : 'Microsoft refused the sign-in (' + tr.status + (j.error ? ', ' + j.error : '') + (codes ? ', ' + codes[0] : '') + ')')
      }
      const { id_token } = await tr.json()
      const who = A.readIdToken(id_token, { clientId, nonce: flow.nonce })
      const person = A.personByEmail(who.email, await linked(env), env)
      if (!person) { page(res, 403, 'This account is not on the ATRIUM team list', `${who.email} is not on the list yet. Ask Jamie to add it, then sign in again.`); return }
      res.setHeader('Set-Cookie', [A.cookie(A.FLOW_COOKIE, '', 0), A.cookie(A.COOKIE, A.newSession(person, who.email, env), A.SESSION_DAYS * 86400)])
      res.redirect(302, flow.ret || '/')
    } catch (e) {
      page(res, 502, 'Sign in did not finish', String((e && e.message) || e).slice(0, 200))
    }
    return
  }
  res.status(404).json({ error: 'Unknown action. Use login, callback, me or logout.' })
}
