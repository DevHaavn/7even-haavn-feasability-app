// Clears the Xero session cookie.
const { cookieNameFor, groupFromReq } = require('../_utils/session')

module.exports = (req, res) => {
  const name = cookieNameFor(groupFromReq(req))
  res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)
  res.status(200).json({ connected: false })
}
