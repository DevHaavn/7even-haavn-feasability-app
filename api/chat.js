// POST /api/chat  { a: 'init' | 'poll' | 'send' | ... , ...args }   ATRIUM Chat. Needs a signed ATRIUM session (Microsoft sign-in).
// The rules live in api/_utils/chat.js, the database in api/_utils/chatDb.js. Tests: src/lib/__tests__/chat.test.ts.
const A = require('./_utils/atriumAuth')
const C = require('./_utils/chat')
const D = require('./_utils/chatDb')
const B = require('./_utils/blaze')
const PUSH = require('./_utils/chatPush')
const OUTLOOK = require('./_utils/outlook')
const SPEECH = require('./_utils/speech')

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return }
  let me = null
  try { me = A.sessionFrom(req) } catch { res.status(503).json({ error: 'Sign-in is not set up.' }); return }
  if (!me) { res.status(401).json({ error: 'signin', message: 'Sign in with Microsoft to use chat.' }); return }
  let b = req.body
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = null } }
  if (!b || typeof b.a !== 'string') { res.status(400).json({ error: 'a is required' }); return }
  try {
    const { store, files } = D.supa()
    let kv = null
    try { kv = B.kv() } catch { /* Workflow link needs the service key too; without it tasks stay in chat */ }
    const site = 'https://' + (req.headers['x-forwarded-host'] || req.headers.host || '7even-haavn-feasability-app-redux.vercel.app')
    res.status(200).json(await C.run(b.a, b, me, { store, files, kv, wp: PUSH.makeSender(), cal: OUTLOOK.make(), speech: SPEECH.make(), site }))
  } catch (e) {
    if (e && (e.code === 'PGRST205' || e.code === '42P01' || (e.status === 404 && /^db 404/.test(e.message || '')))) {
      res.status(200).json({ setup: false, message: 'The chat tables are not created yet. Run supabase/2026-10-26_signin_and_chat.sql in the Supabase SQL editor.' }); return
    }
    if (e instanceof C.ChatError || (e && e.status && e.status < 500 && e.status !== 404)) { res.status(e.status || 400).json({ error: e.message }); return }
    res.status(502).json({ error: 'Chat could not complete that.', detail: String((e && e.message) || e).slice(0, 140) })
  }
}
