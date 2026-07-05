// Step 2 of the Xero OAuth flow: exchange the code for tokens, remember the
// organisations, and store everything in an encrypted httpOnly cookie.
const { encrypt, parseCookies, sessionCookie, appUrl } = require('../_utils/session')

module.exports = async (req, res) => {
  const { code, state, error } = req.query
  const base = appUrl(req)

  if (error) {
    res.statusCode = 302
    res.setHeader('Location', `${base}/?xero=denied`)
    res.end()
    return
  }

  const cookies = parseCookies(req)
  if (!state || cookies.xero_state !== state) {
    res.status(400).send('Invalid OAuth state — please try connecting again.')
    return
  }

  const clientId = process.env.XERO_CLIENT_ID
  const clientSecret = process.env.XERO_CLIENT_SECRET
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
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`)
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
    res.statusCode = 302
    res.setHeader('Location', `${base}/?xero=error`)
    res.end()
  }
}
