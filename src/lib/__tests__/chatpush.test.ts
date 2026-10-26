import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const P = require('../../../api/_utils/chatPush.js')

const rows = [
  { group_id: 'g1', member: 'jb' }, { group_id: 'g1', member: 'ds' }, { group_id: 'g1', member: 'lj', muted: true },
  { group_id: 'g1', member: 'jw', hidden: true }, { group_id: 'g1', member: 'x:guest@firm.com' },
]
describe('who gets an alert', () => {
  it('everyone else, but not the sender, a muted chat, a removed one or an outside guest', () => {
    expect(P.recipients({ body: 'hi' }, 'jb', rows)).toEqual(['ds'])
  })
  it('a muted chat still alerts for an @mention or a task set for them', () => {
    expect(P.recipients({ body: '@Lewis please look' }, 'jb', rows).sort()).toEqual(['ds', 'lj'])
    expect(P.recipients({ body: 'x', task: { own: 'lj' } }, 'jb', rows).sort()).toEqual(['ds', 'lj'])
  })
})
describe('what it says', () => {
  it('names the sender and the chat, or just the sender in a direct message', () => {
    expect(P.payloadFor({ body: 'Church package' }, { name: 'Daniel Sette' }, { id: 'g1', is_dm: false }, 'Belmont').title).toBe('Daniel Sette · Belmont')
    expect(P.payloadFor({ body: 'hi' }, { name: 'Daniel Sette' }, { id: 'g2', is_dm: true }, '').title).toBe('Daniel Sette')
    const t = P.payloadFor({ kind: 'task', task: { title: 'Call WPCC' } }, { name: 'D' }, { id: 'g1' }, 'B')
    expect(t.body).toBe('Set you a task: Call WPCC'); expect(t.url).toBe('/?chatopen=g1'); expect(t.tag).toBe('g1')
    expect(P.payloadFor({ body: '', files: [{}] }, { name: 'D' }, { id: 'g1' }, 'B').body).toBe('Sent a file')
  })
})
describe('sending', () => {
  const store = (subs: any[], gone: string[]) => ({ async pushSubsFor() { return subs }, async deletePush(e: string) { gone.push(e) } })
  it('sends to each device and forgets one that has gone', async () => {
    const gone: string[] = [], sent: string[] = []
    const wp = { async send(sub: any) { if (sub.endpoint === 'dead') { const e: any = new Error('x'); e.statusCode = 410; throw e } sent.push(sub.endpoint) } }
    const out = await P.notify({ store: store([{ endpoint: 'a', p256dh: 'k', auth: 'z' }, { endpoint: 'dead', p256dh: 'k', auth: 'z' }], gone), sender: { sub: 'jb', name: 'Jamie' }, msg: { body: 'hi' }, group: { id: 'g1' }, memberRows: rows, groupName: 'B' }, wp)
    expect(out.sent).toBe(1); expect(sent).toEqual(['a']); expect(gone).toEqual(['dead'])
  })
  it('does nothing without keys, and never throws', async () => {
    expect((await P.notify({}, null)).sent).toBe(0)
    expect((await P.notify({ store: { async pushSubsFor() { throw new Error('db') } }, sender: { sub: 'jb' }, msg: { body: 'x' }, group: {}, memberRows: rows }, { send() {} })).sent).toBe(0)
  })
})
describe('the 10 minute email', () => {
  const now = Date.parse('2026-10-26T10:00:00Z')
  const msgs = [
    { id: 5, group_id: 'g1', sender: 'ds', body: 'old unread', created_at: '2026-10-26T09:40:00Z' },
    { id: 6, group_id: 'g1', sender: 'ds', body: 'too fresh', created_at: '2026-10-26T09:57:00Z' },
    { id: 7, group_id: 'g1', sender: 'jb', body: 'mine', created_at: '2026-10-26T09:30:00Z' },
  ]
  const groups = [{ id: 'g1', name: 'Belmont', is_dm: false }]
  it('emails only what has been unread 10 minutes, never your own, and never twice', () => {
    const base = { group_id: 'g1', muted: false, archived: false, hidden: false, last_read: 0, last_emailed: 0 }
    const out = P.nudges({ messages: msgs, members: [{ ...base, member: 'jb' }, { ...base, member: 'ds', last_read: 99 }, { ...base, member: 'lj', last_emailed: 7 }], groups, now })
    expect(out.length).toBe(1); expect(out[0].person.id).toBe('jb'); expect(out[0].items[0].count).toBe(1); expect(out[0].items[0].topId).toBe(5)
    const mail = P.emailFor(out[0], 'https://site'); expect(mail.to).toBe('jamie@7even.au'); expect(mail.html).toContain('chatopen=g1')
  })
  it('respects mute, archive and outside guests', () => {
    const base = { group_id: 'g1', last_read: 0, last_emailed: 0, hidden: false }
    expect(P.nudges({ messages: msgs, members: [{ ...base, member: 'jb', muted: true, archived: false }, { ...base, member: 'lj', muted: false, archived: true }, { ...base, member: 'x:a@b.com', muted: false, archived: false }], groups, now }).length).toBe(0)
  })
})

describe('tagging people', () => {
  it('a full-name tag is for that person only, a bare first name reaches every one called that', () => {
    const full = { body: 'Can you look @James Winstanley' }
    expect(P.isForThem(full, 'jw', 'James Winstanley')).toBe(true)
    expect(P.isForThem(full, 'jm', 'James Maloney')).toBe(false)
    const bare = { body: 'Can you look @James' }
    expect(P.isForThem(bare, 'jw', 'James Winstanley')).toBe(true)
    expect(P.isForThem(bare, 'jm', 'James Maloney')).toBe(true)
    expect(P.isForThem({ body: 'hello' }, 'jw', 'James Winstanley')).toBe(false)
  })
})
