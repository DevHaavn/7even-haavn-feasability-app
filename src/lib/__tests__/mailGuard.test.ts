import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const A = require('../../../api/_utils/atriumAuth.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const G = require('../../../api/_utils/msGuard.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sendMail = require('../../../api/send-mail.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sendAssignments = require('../../../api/send-assignments.js')

const env = { SESSION_SECRET: 'a-test-secret-of-sufficient-length' }
const person = (id: string) => A.PEOPLE.find((p: any) => p.id === id)
const cookieFor = (id: string) => A.COOKIE + '=' + A.newSession(person(id), 'x', env)
function call(handler: any, { method = 'POST', cookie = '', body = {} } = {}) {
  const out: any = { status: 0, json: null, headers: {} }
  const res: any = { setHeader: (k: string, v: string) => { out.headers[k] = v }, status(s: number) { out.status = s; return res }, json(j: any) { out.json = j; return res } }
  return handler({ method, headers: { cookie }, body }, res).then(() => out)
}
const good = { from: 'boardroom@haavn.au', to: ['a@b.com'], subject: 'Minutes', html: '<p>Hi</p>' }
const setMs = () => { process.env.MS_TENANT_ID = 't'; process.env.MS_CLIENT_ID = 'c'; process.env.MS_CLIENT_SECRET = 's' }
const stubGraph = () => { const sent: any[] = []; vi.stubGlobal('fetch', vi.fn(async (url: string, o: any) => { if (String(url).includes('login.microsoftonline')) return { ok: true, status: 200, json: async () => ({ access_token: 'x' }) }; sent.push({ url, body: JSON.parse(o.body) }); return { status: 202, text: async () => '' } })); return sent }

describe('the email endpoints are locked', () => {
  beforeEach(() => { process.env.SESSION_SECRET = env.SESSION_SECRET; delete process.env.MS_TENANT_ID; delete process.env.MS_CLIENT_ID; delete process.env.MS_CLIENT_SECRET })

  it('refuse anyone who is not signed in, and outside consultants', async () => {
    expect((await call(sendMail, { body: good })).status).toBe(401)
    expect((await call(sendAssignments, { body: { assignments: [{ email: 'a@b.com' }] } })).status).toBe(401)
    expect((await call(sendMail, { cookie: A.COOKIE + '=forged.token', body: good })).status).toBe(401)
    expect((await call(sendMail, { cookie: cookieFor('cf'), body: good })).status).toBe(403)
    expect((await call(sendAssignments, { cookie: cookieFor('cf'), body: { assignments: [{ email: 'a@b.com' }] } })).status).toBe(403)
    expect((await call(sendMail, { method: 'GET' })).status).toBe(405)
  })
  it('send-mail only sends from a shared company mailbox or your own', async () => {
    const jb = cookieFor('jb')
    for (const from of ['daniel@haavn.au', 'ceo@evil.com', 'someone@gmail.com', 'not an email']) expect((await call(sendMail, { cookie: jb, body: { ...good, from } })).status).toBe(403)
    for (const from of ['boardroom@haavn.au', 'accounts@haavn.au', 'reception@7even.au', 'jamie@haavn.au', 'jamie@7even.au']) expect((await call(sendMail, { cookie: jb, body: { ...good, from } })).status).toBe(501)   // past the door; Microsoft is not set up in the test
  })
  it('send-mail refuses bad recipients, too many, and oversized attachments, before Microsoft is asked', async () => {
    const jb = cookieFor('jb')
    expect((await call(sendMail, { cookie: jb, body: { ...good, to: ['nope'] } })).status).toBe(400)
    expect((await call(sendMail, { cookie: jb, body: { ...good, to: Array.from({ length: 26 }, (_, i) => `p${i}@b.com`) } })).status).toBe(400)
    expect((await call(sendMail, { cookie: jb, body: { ...good, cc: ['x'] } })).status).toBe(400)
    expect((await call(sendMail, { cookie: jb, body: { ...good, attachments: Array.from({ length: 7 }, () => ({ name: 'a', contentBytesBase64: 'QQ==' })) } })).status).toBe(413)
    expect((await call(sendMail, { cookie: jb, body: { ...good, attachments: [{ name: 'big', contentBytesBase64: 'A'.repeat(11 * 1024 * 1024) }] } })).status).toBe(413)
    expect((await call(sendMail, { cookie: jb, body: { ...good, html: 'x'.repeat(400001) } })).status).toBe(413)
    expect((await call(sendMail, { cookie: jb, body: { from: good.from, to: [], subject: 's' } })).status).toBe(400)
  })
  it('a good send goes to Microsoft as that mailbox, with the sender recorded in a header and a tidy recipient list', async () => {
    setMs(); const sent = stubGraph()
    const r = await call(sendMail, { cookie: cookieFor('jb'), body: { ...good, to: ['A@B.com', 'a@b.com', 'c@d.org'], subject: 'S'.repeat(400), attachments: [{ name: 'f.pdf', contentType: 'application/pdf', contentBytesBase64: 'QQ==' }] } })
    vi.unstubAllGlobals()
    expect(r.status).toBe(200)
    expect(sent[0].url).toBe('https://graph.microsoft.com/v1.0/users/boardroom%40haavn.au/sendMail')
    const m = sent[0].body.message
    expect(m.toRecipients.map((x: any) => x.emailAddress.address)).toEqual(['a@b.com', 'c@d.org']); expect(m.subject.length).toBe(250)
    expect(m.internetMessageHeaders).toEqual([{ name: 'x-atrium-sent-by', value: 'Jamie Baldwin' }]); expect(m.attachments[0].name).toBe('f.pdf')
  })
  it('send-assignments needs real addresses, a sensible size, and always sends from the boardroom mailbox', async () => {
    const jb = cookieFor('jb')
    expect((await call(sendAssignments, { cookie: jb, body: { assignments: [] } })).status).toBe(400)
    expect((await call(sendAssignments, { cookie: jb, body: { assignments: Array.from({ length: 31 }, (_, i) => ({ email: `p${i}@b.com` })) } })).status).toBe(400)
    expect((await call(sendAssignments, { cookie: jb, body: { assignments: [{ email: 'a@b.com' }] } })).status).toBe(501)
    setMs(); const sent = stubGraph()
    const r = await call(sendAssignments, { cookie: jb, body: { from: 'ceo@evil.com', meeting: 'Mon 3 Nov', assignments: [{ name: 'Daniel Sette', email: 'daniel@7even.au', items: [{ title: 'Cash flow', status: 'Action', due: '2026-11-06' }] }, { name: 'Bad', email: 'junk' }] } })
    vi.unstubAllGlobals()
    expect(r.status).toBe(200); expect(r.json.sent).toBe(1)
    expect(sent[0].url).toBe('https://graph.microsoft.com/v1.0/users/boardroom%407even.au/sendMail')
    expect(sent[0].body.message.body.content).toContain('Cash flow'); expect(sent[0].body.message.toRecipients[0].emailAddress.address).toBe('daniel@7even.au')
  })
  it('the sender rule and the address tidy on their own', () => {
    const jb = person('jb')
    expect(G.senderAllowed(jb, 'boardroom@7even.au')).toBe(true); expect(G.senderAllowed(jb, 'lewis@7even.au')).toBe(false)
    expect(G.senderAllowed(jb, 'cfo@haavn.au', { MAIL_SHARED_MAILBOXES: 'cfo@haavn.au' })).toBe(true)
    expect(G.addresses(['A@b.com', ' a@b.com '], 5)).toEqual({ list: ['a@b.com'] }); expect(G.addresses(['x'], 5).error).toMatch(/not an email/); expect(G.addresses(['a@b.com', 'c@d.com'], 1).error).toMatch(/At most 1/)
  })
})
