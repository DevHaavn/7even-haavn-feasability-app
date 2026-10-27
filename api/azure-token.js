// Mints a short-lived Azure Speech token so the browser can open the streaming recognizer WITHOUT ever seeing the Speech key.
// Only for a signed-in ATRIUM person (an open endpoint would let anyone run up the Azure Speech bill), and only through the tidied key from api/_utils/speech.js.
// Env: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (e.g. australiaeast).
const G = require('./_utils/msGuard')
const SPEECH = require('./_utils/speech')
module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }
  res.setHeader('Cache-Control', 'no-store')
  const me = G.signedIn(req, res); if (!me) return
  const speech = SPEECH.make()
  if (!speech.configured) { res.status(501).json({ error: 'Azure Speech not configured — set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.' }); return }
  try {
    res.status(200).json(await speech.token())
  } catch (e) {
    const s = e && e.status
    res.status(502).json({ error: s === 401 || s === 403 ? `Azure refused the speech key (${s}). It needs renewing in Vercel.` : 'Azure token request failed', detail: String((e && e.message) || e) })
  }
}
