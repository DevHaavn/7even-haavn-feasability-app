// A short-lived Azure Speech token for voice typing in ATRIUM Chat and the Meetings live transcript, from the same Azure Speech resource.
// The key stays on the server; the phone gets a token that expires in about ten minutes. Needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.

// What was pasted into Vercel, tidied: a key must be 32 plain characters, so quotes, spaces and line breaks around or inside it are dropped (the usual
// cause of a perfectly good key being refused), and a region pasted as the whole endpoint address is cut down to the region name.
function config(env = process.env) {
  const rawKey = String(env.AZURE_SPEECH_KEY == null ? '' : env.AZURE_SPEECH_KEY), rawRegion = String(env.AZURE_SPEECH_REGION == null ? '' : env.AZURE_SPEECH_REGION)
  const key = rawKey.replace(/^[\s"']+|[\s"']+$/g, '').replace(/\s+/g, '')
  let region = rawRegion.replace(/^[\s"']+|[\s"']+$/g, '').replace(/\s+/g, '').toLowerCase()
  const url = /^(?:https?:\/\/)?([a-z0-9]+)\.(?:api\.cognitive|stt\.speech|tts\.speech)\.microsoft\.com/.exec(region); if (url) region = url[1]
  return { key, region, rawKeyLength: rawKey.length, keyTidied: key !== rawKey, regionTidied: region !== rawRegion }
}

function make(env = process.env, fetchImpl = fetch) {
  const c = config(env)
  const ok = !!(c.key && c.region)
  async function ask() { return fetchImpl(`https://${c.region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': c.key, 'Content-Length': '0' } }) }
  async function token() {
    if (!ok) { const e = new Error('Voice typing through ATRIUM is not set up yet.'); e.code = 'notset'; throw e }
    const r = await ask()
    if (!r.ok) { const e = new Error(`The speech service refused (${r.status}).`); e.status = r.status; throw e }
    return { token: await r.text(), region: c.region }
  }
  // what is wrong, in words and shapes only: never the key itself
  async function check() {
    const out = { configured: ok, region: c.region || null, keyLength: c.key.length, keyLengthAsPasted: c.rawKeyLength, keyHadSpacesOrQuotes: c.keyTidied, regionHadSpacesOrAddress: c.regionTidied, looksLikeAKey: /^[A-Za-z0-9]{32}$/.test(c.key) || /^[A-Za-z0-9]{84}$/.test(c.key) }
    if (!ok) return { ...out, azure: 'not set' }
    try { const r = await ask(); out.azure = r.ok ? 'accepted the key' : `refused (${r.status})`; out.ok = r.ok } catch (e) { out.azure = 'could not be reached'; out.ok = false }
    return out
  }
  return { configured: ok, token, check }
}
module.exports = { make, config }
