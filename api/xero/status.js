// Reports the Xero connection state to the app, refreshing tokens if needed.
const { encrypt, readSession, sessionCookie, groupFromReq } = require('../_utils/session')

module.exports = async (req, res) => {
  if (!process.env.XERO_CLIENT_ID || !process.env.SESSION_SECRET) {
    res.status(200).json({ configured: false, connected: false })
    return
  }

  const group = groupFromReq(req)
  let session
  try {
    session = readSession(req, group)
  } catch {
    res.status(200).json({ configured: true, connected: false })
    return
  }
  if (!session) {
    res.status(200).json({ configured: true, connected: false })
    return
  }

  // Refresh the access token when it's about to lapse.
  if (Date.now() >= session.expires_at) {
    try {
      const tokenRes = await fetch('https://identity.xero.com/connect/token', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: session.refresh_token }),
      })
      if (!tokenRes.ok) throw new Error(`refresh failed: ${tokenRes.status}`)
      const tokens = await tokenRes.json()
      session = {
        ...session,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expires_at: Date.now() + (tokens.expires_in - 60) * 1000,
      }
      res.setHeader('Set-Cookie', sessionCookie(encrypt(session), 60 * 60 * 24 * 60, group))
    } catch (e) {
      console.error('Xero refresh error:', e)
      res.status(200).json({ configured: true, connected: false, expired: true })
      return
    }
  }

  res.status(200).json({ configured: true, connected: true, tenants: session.tenants || [] })
}
