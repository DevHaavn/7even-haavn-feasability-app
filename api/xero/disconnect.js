// Clears the Xero session cookie.
const { COOKIE_NAME } = require('../_utils/session')

module.exports = (req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)
  res.status(200).json({ connected: false })
}
