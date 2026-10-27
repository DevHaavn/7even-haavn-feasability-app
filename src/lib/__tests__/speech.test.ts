import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const S = require('../../../api/_utils/speech.js')

const KEY = 'a'.repeat(32)
const graph = (accept: (k: string, url: string) => boolean) => {
  const seen: any[] = []
  const f = async (url: string, o: any) => { const k = o.headers['Ocp-Apim-Subscription-Key']; seen.push({ url, k }); const ok = accept(k, url); return { ok, status: ok ? 200 : 401, text: async () => 'token-abc' } }
  return { f, seen }
}

describe('the speech key is tidied before it is used', () => {
  it('drops spaces, line breaks and quotes around or inside a pasted key, and reads a region given as an address', () => {
    expect(S.config({ AZURE_SPEECH_KEY: KEY + ' \n', AZURE_SPEECH_REGION: 'AustraliaEast ' })).toMatchObject({ key: KEY, region: 'australiaeast', keyTidied: true })
    expect(S.config({ AZURE_SPEECH_KEY: `"${KEY}"`, AZURE_SPEECH_REGION: 'https://australiaeast.api.cognitive.microsoft.com/' }).region).toBe('australiaeast')
    expect(S.config({ AZURE_SPEECH_KEY: KEY.slice(0, 10) + ' ' + KEY.slice(10), AZURE_SPEECH_REGION: 'australiaeast' }).key).toBe(KEY)
    expect(S.config({ AZURE_SPEECH_KEY: KEY, AZURE_SPEECH_REGION: 'australiaeast' })).toMatchObject({ keyTidied: false, regionTidied: false })
    expect(S.config({}).key).toBe('')
  })
  it('a key with a stray space on the end now works, where it was refused before', async () => {
    const g = graph((k) => k === KEY)
    const sp = S.make({ AZURE_SPEECH_KEY: KEY + ' ', AZURE_SPEECH_REGION: 'australiaeast' }, g.f)
    expect(await sp.token()).toEqual({ token: 'token-abc', region: 'australiaeast' })
    expect(g.seen[0].url).toBe('https://australiaeast.api.cognitive.microsoft.com/sts/v1.0/issueToken')
  })
  it('a genuinely wrong key is refused with the status, and the check explains without showing the key', async () => {
    const sp = S.make({ AZURE_SPEECH_KEY: 'wrong-key-value', AZURE_SPEECH_REGION: 'australiaeast' }, graph(() => false).f)
    await expect(sp.token()).rejects.toMatchObject({ status: 401 })
    const c = await sp.check()
    expect(c).toMatchObject({ configured: true, azure: 'refused (401)', ok: false, looksLikeAKey: false, keyLength: 15 })
    expect(JSON.stringify(c)).not.toContain('wrong-key-value')
  })
  it('says so when it is not set up', async () => {
    const sp = S.make({}, graph(() => true).f)
    expect(sp.configured).toBe(false); await expect(sp.token()).rejects.toMatchObject({ code: 'notset' })
    expect((await sp.check()).azure).toBe('not set')
  })
})
