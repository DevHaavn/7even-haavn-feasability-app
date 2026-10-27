// A short-lived Azure Speech token for voice typing in ATRIUM Chat, from the same Azure Speech resource the Meetings live transcript uses.
// The key stays on the server; the phone gets a token that expires in about ten minutes. Needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.
function make(env = process.env, fetchImpl = fetch) {
  const ok = !!(env.AZURE_SPEECH_KEY && env.AZURE_SPEECH_REGION)
  async function token() {
    if (!ok) { const e = new Error('Voice typing through ATRIUM is not set up yet.'); e.code = 'notset'; throw e }
    const r = await fetchImpl(`https://${env.AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY, 'Content-Length': '0' } })
    if (!r.ok) { const e = new Error(`The speech service refused (${r.status}).`); e.status = r.status; throw e }
    return { token: await r.text(), region: env.AZURE_SPEECH_REGION }
  }
  return { configured: ok, token }
}
module.exports = { make }
