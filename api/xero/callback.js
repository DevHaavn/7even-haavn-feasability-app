// Step 2 of the Xero OAuth flow: exchange the code for tokens, remember the
// organisations, and store everything in an encrypted httpOnly cookie.
const crypto = require('crypto')
const { encrypt, sessionCookie, appUrl } = require('../_utils/session')

const STATE_MAX_AGE_MS = 30 * 60 * 1000

// State format: `${timestamp}.${nonce}.${hmac}` — verify signature and age.
function stateValid(state) {
  if (!state) return false
  const parts = String(state).split('.')
  if (parts.length !== 3) return false
  const [ts, nonce, sig] = parts
  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET)
    .update(`${ts}.${nonce}`).digest('hex').slice(0, 32)
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false
  return Date.now() - Number(ts) < STATE_MAX_AGE_MS
}

module.exports = async (req, res) => {
  const { code, state, error } = req.query
  const base = appUrl(req)

  if (error) {
    res.statusCode = 302
    res.setHeader('Location', `${base}/?xero=denied`)
    res.end()
    return
  }

  if (!stateValid(state)) {
    res.status(400).send('Invalid OAuth state — please try connecting again.')
    return
  }

  // trim() guards against stray whitespace/newlines picked up when the
  // values were pasted into the env-var prompts
  const clientId = (process.env.XERO_CLIENT_ID || '').trim()
  const clientSecret = (process.env.XERO_CLIENT_SECRET || '').trim()
  if (!clientId || !clientSecret) {
    res.status(503).send('Xero credentials are not configured.')
    return
  }

  try {
    const tokenRes = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: `${base}/api/xero/callback`,
      }),
    })
    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      throw new Error(`token_exchange_${tokenRes.status}_${body.slice(0, 120)}`)
    }
    const tokens = await tokenRes.json()

    // Which Xero organisations did the user authorise?
    const connRes = await fetch('https://api.xero.com/connections', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const connections = connRes.ok ? await connRes.json() : []

    const session = {
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expires_at: Date.now() + (tokens.expires_in - 60) * 1000,
      tenants: connections.map(c => ({ id: c.tenantId, name: c.tenantName })),
    }

    res.setHeader('Set-Cookie', [
      sessionCookie(encrypt(session), 60 * 60 * 24 * 60), // 60 days
      'xero_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    ])
    res.statusCode = 302
    res.setHeader('Location', `${base}/?xero=connected`)
    res.end()
  } catch (e) {
    console.error('Xero callback error:', e)
    // Surface a sanitised reason in the URL so it can be diagnosed without log access
    const reason = encodeURIComponent(String(e.message || e).replace(/[^\w .:{}"-]/g, '').slice(0, 160))
    res.statusCode = 302
    res.setHeader('Location', `${base}/?xero=error&reason=${reason}`)
    res.end()
  }
}
