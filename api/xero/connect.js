// Step 1 of the Xero OAuth flow: send the user to Xero's consent screen.
const crypto = require('crypto')
const { appUrl } = require('../_utils/session')

const SCOPES = [
  'openid', 'profile', 'email', 'offline_access',
  'accounting.transactions', 'accounting.contacts.read',
  'accounting.settings.read', 'accounting.budgets.read', 'accounting.reports.read',
].join(' ')

module.exports = (req, res) => {
  const clientId = process.env.XERO_CLIENT_ID
  if (!clientId) {
    res.status(503).json({
      error: 'Xero is not configured yet',
      setup: 'Add XERO_CLIENT_ID, XERO_CLIENT_SECRET and SESSION_SECRET in the Vercel project settings. See docs/XERO_SETUP.md.',
    })
    return
  }

  const state = crypto.randomBytes(16).toString('hex')
  const redirectUri = `${appUrl(req)}/api/xero/callback`
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  })

  res.setHeader('Set-Cookie', `xero_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`)
  res.statusCode = 302
  res.setHeader('Location', `https://login.xero.com/identity/connect/authorize?${params}`)
  res.end()
}
