// Runs every 15 minutes (vercel.json crons). For each person who has connected their other Outlook, keeps a copy of their haavn.au diary in it.
// Needs CRON_SECRET (Vercel sends it as a Bearer token), the service key, and the Microsoft connections the diary read and the sign-in app already use.
const A = require('./_utils/atriumAuth')
const B = require('./_utils/blaze')
const CT = require('./_utils/calToken')
const CM = require('./_utils/calMirror')
const OUTLOOK = require('./_utils/outlook')

module.exports = async (req, res) => {
  const env = process.env
  if (!env.CRON_SECRET) { res.status(503).json({ error: 'CRON_SECRET is not set.' }); return }
  if (req.headers.authorization !== 'Bearer ' + env.CRON_SECRET) { res.status(401).json({ error: 'no' }); return }
  let kv
  try { kv = B.kv(env) } catch { res.status(503).json({ error: 'The service key is not set.' }); return }
  const del = CT.make(env), cal = OUTLOOK.make(env), results = {}
  try {
    const row = await kv.read(CT.KEY)
    for (const id of Object.keys((row && row.value) || {})) {
      const p = A.PEOPLE.find((x) => x.id === id)
      if (!p) continue
      try { results[p.name] = await CM.syncPerson({ person: { id, emails: p.emails }, kv, cal, del }) }
      catch (e) { results[p.name] = { error: String((e && e.message) || e).slice(0, 140) } }   // one person's trouble never stops the rest
    }
    res.status(200).json({ ok: true, results })
  } catch (e) { res.status(502).json({ error: 'Could not run the diary copy.', detail: String((e && e.message) || e).slice(0, 140) }) }
}
