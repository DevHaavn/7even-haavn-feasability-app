// Vercel serverless — mints a short-lived Azure Speech token so the browser can
// open the streaming recognizer WITHOUT ever seeing the Speech key.
// Secrets (Vercel env): AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (e.g. australiaeast).
// The Live view calls this, then feeds { token, region } to the Speech SDK.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return }
  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || !region) {
    res.status(501).json({ error: 'Azure Speech not configured — set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in Vercel.' })
    return
  }
  try {
    const r = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Length': '0' },
    })
    if (!r.ok) { res.status(502).json({ error: `Azure token request failed (${r.status})` }); return }
    const token = await r.text()
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ token, region })
  } catch (e: any) {
    res.status(502).json({ error: 'Azure token request failed', detail: String(e?.message || e) })
  }
}
