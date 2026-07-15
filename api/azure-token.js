// Mints a short-lived Azure Speech token so the browser can open the streaming
// recognizer WITHOUT ever seeing the Speech key.
// Env: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (e.g. australiaeast).
module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }
  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || !region) { res.status(501).json({ error: 'Azure Speech not configured — set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.' }); return }
  try {
    const r = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Length': '0' },
    })
    if (!r.ok) { res.status(502).json({ error: `Azure token request failed (${r.status})` }); return }
    const token = await r.text()
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ token, region })
  } catch (e) {
    res.status(502).json({ error: 'Azure token request failed', detail: String((e && e.message) || e) })
  }
}
