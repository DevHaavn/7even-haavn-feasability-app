// Step 1 of the Xero OAuth flow: send the user to Xero's consent screen.
// CSRF protection: the state is HMAC-signed with SESSION_SECRET and
// timestamped, so the callback can verify it without relying on cookies.
const crypto = require('crypto')
const { appUrl, groupFromReq } = require('../_utils/session')

// Apps created after March 2026 must use granular scopes — the broad
// accounting.transactions scope is rejected with invalid_scope. Read-only:
// invoices covers bills too (ACCPAY invoices in the Xero API).
const SCOPES = [
  'openid', 'profile', 'email', 'offline_access',
  'accounting.invoices.read', 'accounting.payments.read', 'accounting.banktransactions.read',
  'accounting.contacts.read', 'accounting.settings.read',
].join(' ')

// State carries the connection group ('7even' | 'haavn') so the callback knows
// which Xero account this is, signed so it can't be tampered with.
function signedState(group) {
  const payload = `${Date.now()}.${crypto.randomBytes(8).toString('hex')}.${group}`
  const sig = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('hex').slice(0, 32)
  return `${payload}.${sig}`
}

module.exports = (req, res) => {
  const clientId = process.env.XERO_CLIENT_ID
  if (!clientId || !process.env.SESSION_SECRET) {
    res.status(503).json({
      error: 'Xero is not configured yet',
      setup: 'Add XERO_CLIENT_ID, XERO_CLIENT_SECRET and SESSION_SECRET in the Vercel project settings. See docs/XERO_SETUP.md.',
    })
    return
  }

  const redirectUri = `${appUrl(req)}/api/xero/callback`
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state: signedState(groupFromReq(req)),
  })

  res.statusCode = 302
  res.setHeader('Location', `https://login.xero.com/identity/connect/authorize?${params}`)
  res.end()
}
