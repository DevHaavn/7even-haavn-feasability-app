// /api/kv?key=...   GET one key.   POST {key, value, expect_updated_at?}   write one key.
// Needs a signed ATRIUM session (see /api/auth/*). NOT in use by any page yet.
const A = require('./_utils/atriumAuth')
const K = require('./_utils/kvProxy')
const O = require('./_utils/outside')
const B = require('./_utils/blaze')

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  let session = null
  try { session = A.sessionFrom(req) } catch { res.status(503).json({ error: 'Sign-in is not set up (SESSION_SECRET).' }); return }
  if (session) { let okv = null; try { okv = B.kv() } catch { /* no service key */ } if (!(await O.stillAllowed(session, okv))) { res.status(401).json({ error: 'signin' }); return } }
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
  try {
    const out = await K.handleKv({ method: req.method, query: req.query || {}, body, session }, K.makeStore())
    res.status(out.status).json(out.json)
  } catch (e) {
    res.status(502).json({ error: 'Could not reach the database.', detail: String((e && e.message) || e).slice(0, 120) })
  }
}
