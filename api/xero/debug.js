// Temporary diagnostic: probes Xero's token endpoint with a deliberately bogus
// code to check whether our client credentials are accepted. Never exposes
// secrets — returns only Xero's error class and metadata.
//   invalid_grant  -> credentials OK (only the fake code was rejected)
//   invalid_client -> client id/secret wrong
//   invalid_request -> request shape/headers broken
module.exports = async (req, res) => {
  const clientId = (process.env.XERO_CLIENT_ID || '').trim()
  const clientSecret = (process.env.XERO_CLIENT_SECRET || '').trim()

  const meta = {
    idLen: clientId.length,
    secretLen: clientSecret.length,
    idHadWhitespace: clientId !== process.env.XERO_CLIENT_ID,
    secretHadWhitespace: clientSecret !== process.env.XERO_CLIENT_SECRET,
  }

  try {
    const r = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'diagnostic-bogus-code',
        redirect_uri: `${(process.env.APP_URL || '').trim().replace(/\/$/, '')}/api/xero/callback`,
      }),
    })
    const body = await r.text()
    res.status(200).json({ ...meta, xeroStatus: r.status, xeroBody: body.slice(0, 300) })
  } catch (e) {
    res.status(200).json({ ...meta, fetchError: String(e.message || e) })
  }
}
