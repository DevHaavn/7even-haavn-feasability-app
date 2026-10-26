import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const A = require('../../../api/_utils/atriumAuth.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const K = require('../../../api/_utils/kvProxy.js')

const env = { SESSION_SECRET: 'a-test-secret-of-sufficient-length' }
const jamie = () => A.personByEmail('Jamie@7even.au', [], env)

describe('people', () => {
  it('finds a person by any case, and refuses strangers', () => {
    expect(jamie().name).toBe('Jamie Baldwin')
    expect(jamie().role).toBe('admin')
    expect(A.personByEmail('someone@gmail.com', [], env)).toBeNull()
    expect(A.personByEmail('', [], env)).toBeNull()
  })
  it('joins a second address people link to themselves', () => {
    const p = A.personByEmail('jamie@haavn.au', [{ email: 'jamie@haavn.au', person_id: 'jb' }], env)
    expect(p.name).toBe('Jamie Baldwin')
    expect(p.emails).toEqual(expect.arrayContaining(['jamie@7even.au', 'jamie@haavn.au']))
    expect(A.personByEmail('jamie@haavn.au', [], env)).toBeNull()
  })
  it('lands each person on the screen their access code gives', () => {
    const app = (e: string) => A.personByEmail(e, [], env).app
    expect(app('jamie@7even.au')).toBe('admin'); expect(app('james@haavn.au')).toBe('haavnonly'); expect(app('mike@haavn.au')).toBe('blacksales')
    expect(app('jeffrey@haavn.au')).toBe('homes'); expect(app('c.fraser@fraserandpartners.com')).toBe('external')
    expect(A.verify(A.newSession(jamie(), 'x', env, 1000), env, 1001).app).toBe('admin')
  })
  it('lets ATRIUM_ADMINS raise a role', () => {
    expect(A.personByEmail('callum@haavn.au', [], env).role).toBe('staff')
    expect(A.personByEmail('callum@haavn.au', [], { ...env, ATRIUM_ADMINS: 'callum@haavn.au' }).role).toBe('admin')
    expect(A.personByEmail('callum@haavn.au', [], { ...env, ATRIUM_ADMINS: 'callum@haavn.au' }).app).toBe('admin')
  })
})

describe('session', () => {
  it('signs, verifies, and carries who and what role', () => {
    const t = A.newSession(jamie(), 'jamie@7even.au', env, 1000)
    const s = A.verify(t, env, 1001)
    expect(s.sub).toBe('jb'); expect(s.role).toBe('admin')
  })
  it('rejects a tampered, expired, wrong-key or empty token', () => {
    const t = A.newSession(jamie(), 'x', env, 1000)
    const [b, sig] = t.split('.')
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(b, 'base64url').toString()), role: 'admin', sub: 'zz' })).toString('base64url') + '.' + sig
    expect(A.verify(forged, env, 1001)).toBeNull()
    expect(A.verify(t, env, 1000 + 15 * 86400)).toBeNull()
    expect(A.verify(t, { SESSION_SECRET: 'a-different-secret-of-sufficient-length' }, 1001)).toBeNull()
    expect(A.verify('', env)).toBeNull(); expect(A.verify('nonsense', env)).toBeNull()
  })
  it('refuses to sign without a real secret', () => {
    expect(() => A.sign({}, { SESSION_SECRET: 'short' })).toThrow()
  })
})

describe('microsoft id token', () => {
  const tok = (c: object) => 'x.' + Buffer.from(JSON.stringify(c)).toString('base64url') + '.y'
  const good = { aud: 'cid', tid: 't1', iss: 'https://login.microsoftonline.com/t1/v2.0', nonce: 'n', exp: 5000, preferred_username: 'Jamie@7even.au', name: 'Jamie' }
  it('reads a good one', () => { expect(A.readIdToken(tok(good), { clientId: 'cid', nonce: 'n' }, 4000).email).toBe('jamie@7even.au') })
  it('refuses wrong audience, issuer, nonce, expiry', () => {
    expect(() => A.readIdToken(tok({ ...good, aud: 'other' }), { clientId: 'cid', nonce: 'n' }, 4000)).toThrow(/not issued/)
    expect(() => A.readIdToken(tok({ ...good, iss: 'https://evil.example/t1' }), { clientId: 'cid', nonce: 'n' }, 4000)).toThrow(/unexpected/)
    expect(() => A.readIdToken(tok(good), { clientId: 'cid', nonce: 'zzz' }, 4000)).toThrow(/does not match/)
    expect(() => A.readIdToken(tok(good), { clientId: 'cid', nonce: 'n' }, 9000)).toThrow(/expired/)
  })
  it('only returns to this site', () => {
    expect(A.safeReturn('/?open=home')).toBe('/?open=home')
    expect(A.safeReturn('//evil.com')).toBe('/'); expect(A.safeReturn('https://evil.com')).toBe('/'); expect(A.safeReturn(undefined)).toBe('/')
  })
  it('builds a PKCE authorize link', () => {
    const { verifier, challenge } = A.pkce()
    const u = new URL(A.authorizeUrl({ clientId: 'cid', redirectUri: 'https://x/cb', state: 's', nonce: 'n', challenge }))
    expect(u.searchParams.get('code_challenge')).toBe(challenge); expect(u.searchParams.get('code_challenge_method')).toBe('S256')
    expect(u.searchParams.get('scope')).toBe('openid profile email'); expect(verifier.length).toBeGreaterThan(20)
  })
})

describe('what each role may touch', () => {
  it('keeps money and CRM to admins, and unknown keys closed', () => {
    for (const k of ['capital_admin_v3', 'atrium-accounts-v1', 'haavn_homes_crm', 'atrium_zeroed:abc', 'blaze_audit']) {
      expect(K.access('admin', k, 'read')).toBe(true); expect(K.access('staff', k, 'read')).toBe(false); expect(K.access('external', k, 'write')).toBe(false)
    }
    expect(K.access('staff', 'something_new', 'read')).toBe(false); expect(K.access('admin', 'something_new', 'write')).toBe(true)
  })
  it('lets the team work and sales see only their tools', () => {
    expect(K.access('staff', 'nav_workspace', 'write')).toBe(true)
    expect(K.access('blacksales', 'haavn_black_series', 'read')).toBe(true); expect(K.access('blacksales', 'haavn_black_series', 'write')).toBe(false)
    expect(K.access('blacksales', 'atrium_meetings_v1', 'read')).toBe(false)
    expect(K.access('external', 'nav_workspace', 'read')).toBe(false)
  })
})

describe('/api/kv', () => {
  const mem = () => { const rows: Record<string, any> = { nav_workspace: { value: { a: 1 }, updated_at: 'T1' } }
    return { rows, async read(k: string) { return rows[k] ? { key: k, ...rows[k] } : null },
      async write(k: string, value: any, expect: any) { const cur = rows[k]; if (expect !== undefined && (cur ? cur.updated_at : null) !== expect) return { conflict: cur ? { key: k, ...cur } : null }
        rows[k] = { value, updated_at: 'T' + Math.random() }; return { ok: true, updated_at: rows[k].updated_at } } } }
  const staff = { sub: 'cm', role: 'staff' }
  it('needs a session', async () => { expect((await K.handleKv({ method: 'GET', query: { key: 'nav_workspace' }, session: null }, mem())).status).toBe(401) })
  it('reads what the role may read, and says no otherwise', async () => {
    const s = mem()
    expect((await K.handleKv({ method: 'GET', query: { key: 'nav_workspace' }, session: staff }, s)).json.value).toEqual({ a: 1 })
    expect((await K.handleKv({ method: 'GET', query: { key: 'capital_admin_v3' }, session: staff }, s)).status).toBe(403)
    expect((await K.handleKv({ method: 'GET', query: { key: '../x' }, session: staff }, s)).status).toBe(400)
  })
  it('writes with compare-and-set and reports a clash', async () => {
    const s = mem()
    const ok = await K.handleKv({ method: 'POST', body: { key: 'nav_workspace', value: { a: 2 }, expect_updated_at: 'T1' }, session: staff }, s)
    expect(ok.status).toBe(200)
    const clash = await K.handleKv({ method: 'POST', body: { key: 'nav_workspace', value: { a: 3 }, expect_updated_at: 'T1' }, session: staff }, s)
    expect(clash.status).toBe(409); expect(clash.json.current.value).toEqual({ a: 2 })
    expect((await K.handleKv({ method: 'POST', body: { key: 'capital_admin_v3', value: {} }, session: staff }, s)).status).toBe(403)
  })
})
