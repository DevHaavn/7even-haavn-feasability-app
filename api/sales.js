// POST /api/sales  { a: 'init' | 'poll' | 'saveLead' | ... }   The HAAVN BLACK sales pipeline. Needs a signed ATRIUM session (Microsoft sign in).
// Rules live in api/_utils/sales.js, the database in api/_utils/salesDb.js. Tests: src/lib/__tests__/sales.test.ts.
const A = require('./_utils/atriumAuth')
const O = require('./_utils/outside')
const S = require('./_utils/sales')
const SD = require('./_utils/salesDb')
const D = require('./_utils/chatDb')
const B = require('./_utils/blaze')
const PUSH = require('./_utils/chatPush')
const MAILER = require('./_utils/mailer')

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return }
  let me = null
  try { me = A.sessionFrom(req) } catch { res.status(503).json({ error: 'Sign-in is not set up.' }); return }
  if (!me) { res.status(401).json({ error: 'signin', message: 'Sign in with Microsoft to use the sales pipeline.' }); return }
  let b = req.body
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = null } }
  if (!b || typeof b.a !== 'string') { res.status(400).json({ error: 'a is required' }); return }
  try {
    let kv = null
    try { kv = B.kv() } catch { /* tasks and outside sign in need the service key */ }
    try { await O.sync(kv) } catch { /* ignore */ }
    if (!(await O.stillAllowed(me, kv))) { res.status(401).json({ error: 'signin' }); return }
    const db = SD.supa()
    const { store } = D.supa()
    res.status(200).json(await S.run(b.a, b, me, { db, chat: store, kv, wp: PUSH.makeSender(), mail: MAILER.make() }))
  } catch (e) {
    if (e && (e.code === 'PGRST205' || e.code === '42P01' || (e.status === 404 && /^db 404/.test(e.message || '')))) {
      res.status(200).json({ setup: false, message: 'The sales tables are not created yet. Run supabase/2026-11-04_hb_sales.sql in the Supabase SQL editor.' }); return
    }
    if (e instanceof S.SalesError) { res.status(e.status || 400).json({ error: e.message }); return }
    res.status(502).json({ error: 'The sales pipeline could not complete that.', detail: String((e && e.message) || e).slice(0, 140) })
  }
}
