import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const A = require('../../../api/_utils/atriumAuth.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const G = require('../../../api/_utils/msGuard.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const calendar = require('../../../api/calendar.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const calendarList = require('../../../api/calendar-list.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const azureToken = require('../../../api/azure-token.js')

const env = { SESSION_SECRET: 'a-test-secret-of-sufficient-length' }
const person = (id: string) => A.PEOPLE.find((p: any) => p.id === id)
const cookieFor = (id: string) => A.COOKIE + '=' + A.newSession(person(id), 'x', env)
function call(handler: any, { method = 'POST', cookie = '', body = {}, query = {} } = {}) {
  const out: any = { status: 0, json: null, headers: {} }
  const res: any = { setHeader: (k: string, v: string) => { out.headers[k] = v }, status(s: number) { out.status = s; return res }, json(j: any) { out.json = j; return res } }
  return handler({ method, headers: { cookie }, body, query }, res).then(() => out)
}
const good = { subject: 'Board', start: '2026-11-04T10:00', end: '2026-11-04T11:00' }

describe('the calendar endpoints are locked', () => {
  beforeEach(() => { process.env.SESSION_SECRET = env.SESSION_SECRET; delete process.env.MS_TENANT_ID; delete process.env.MS_CLIENT_ID; delete process.env.MS_CLIENT_SECRET })

  it('refuses anyone who is not signed in, on both endpoints', async () => {
    const a = await call(calendar, { body: good }); expect(a.status).toBe(401); expect(a.json.code).toBe('signin')
    const b = await call(calendarList, { method: 'GET' }); expect(b.status).toBe(401)
    const c = await call(calendar, { cookie: A.COOKIE + '=forged.token', body: good }); expect(c.status).toBe(401)
  })
  it('refuses outside consultants', async () => {
    expect((await call(calendar, { cookie: cookieFor('cf'), body: good })).status).toBe(403)
    expect((await call(calendarList, { method: 'GET', cookie: cookieFor('cf') })).status).toBe(403)
  })
  it('lets only the boardroom calendar or your own mailbox be used', async () => {
    const me = cookieFor('jb')
    const other = await call(calendar, { cookie: me, body: { ...good, organizer: 'daniel@7even.au' } }); expect(other.status).toBe(403)
    const outsider = await call(calendar, { cookie: me, body: { ...good, organizer: 'someone@gmail.com' } }); expect(outsider.status).toBe(403)
    const read = await call(calendarList, { method: 'GET', cookie: me, query: { mailbox: 'lewis@7even.au' } }); expect(read.status).toBe(403)
    // allowed addresses get past the door (and then report that Microsoft is not set up here)
    expect((await call(calendar, { cookie: me, body: good })).status).toBe(501)
    expect((await call(calendar, { cookie: me, body: { ...good, organizer: 'boardroom@haavn.au' } })).status).toBe(501)
    expect((await call(calendar, { cookie: me, body: { ...good, organizer: 'jamie@haavn.au' } })).status).toBe(501)
    expect((await call(calendarList, { method: 'GET', cookie: me, query: { mailbox: 'jamie@7even.au' } })).status).toBe(501)
  })
  it('the speech token endpoint needs sign-in too, and is refused to outside consultants', async () => {
    expect((await call(azureToken, { method: 'POST' })).status).toBe(401)
    expect((await call(azureToken, { method: 'GET', cookie: cookieFor('cf') })).status).toBe(403)
    delete process.env.AZURE_SPEECH_KEY; delete process.env.AZURE_SPEECH_REGION
    expect((await call(azureToken, { method: 'POST', cookie: cookieFor('jb') })).status).toBe(501)
  })
  it('wrong methods are still refused first, and answers are never cached', async () => {
    expect((await call(calendar, { method: 'GET' })).status).toBe(405)
    const r = await call(calendar, { body: good }); expect(r.headers['Cache-Control']).toBe('no-store')
  })
  it('the mailbox rule on its own', () => {
    const jb = person('jb')
    expect(G.mailboxAllowed(jb, 'boardroom@haavn.au')).toBe(true); expect(G.mailboxAllowed(jb, 'BOARDROOM@haavn.au')).toBe(true)
    expect(G.mailboxAllowed(jb, 'jamie@7even.au')).toBe(true); expect(G.mailboxAllowed(jb, 'jamie@evil.com')).toBe(false)
    expect(G.mailboxAllowed(jb, 'daniel@7even.au')).toBe(false); expect(G.mailboxAllowed(jb, 'not an email')).toBe(false)
    expect(G.mailboxAllowed(jb, 'cfo@haavn.au', { CALENDAR_MAILBOXES: 'cfo@haavn.au, x@haavn.au' })).toBe(true)
  })
  it('only real attendee addresses go to Microsoft, at most thirty', async () => {
    process.env.MS_TENANT_ID = 't'; process.env.MS_CLIENT_ID = 'c'; process.env.MS_CLIENT_SECRET = 's'
    const sent: any[] = []
    const f = vi.fn(async (url: string, o: any) => { if (String(url).includes('login.microsoftonline')) return { ok: true, status: 200, json: async () => ({ access_token: 'x' }) }; sent.push(JSON.parse(o.body)); return { status: 201, json: async () => ({ id: 'e1' }) } })
    vi.stubGlobal('fetch', f)
    const attendees = ['a@b.com', 'junk', ...Array.from({ length: 40 }, (_, i) => `p${i}@b.com`)]
    const r = await call(calendar, { cookie: cookieFor('jb'), body: { ...good, attendees, subject: 'S'.repeat(500) } })
    vi.unstubAllGlobals()
    expect(r.status).toBe(200); expect(sent[0].attendees.length).toBe(30); expect(sent[0].subject.length).toBe(200)
    expect(sent[0].attendees.every((x: any) => x.emailAddress.address.includes('@'))).toBe(true)
  })
})
