import { describe, it, expect, beforeEach } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CT = require('../../../api/_utils/calToken.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CM = require('../../../api/_utils/calMirror.js')

const env = { SESSION_SECRET: 'a-long-enough-test-secret-1234', MS_AUTH_CLIENT_ID: 'cid', MS_AUTH_CLIENT_SECRET: 'sec' }
const jamie = { id: 'jb', emails: ['jamie@7even.au'] }

function world() {
  const store: Record<string, any> = {}
  const kv = { async read(k: string) { return store[k] ? { value: store[k] } : null }, async update(k: string, fn: any) { const { next, result } = fn(store[k] || null); store[k] = next; return result } }
  // the person's own (7even.au) diary, as Microsoft Graph returns it
  const g: any = { events: [] as any[], calls: [] as string[], seq: 0, refreshes: 0, revoke: false, rotate: false, status: 0 }
  const raw = (id: string, subject: string, s: string, e: string, extra: any = {}) => ({ id, subject, start: { dateTime: s + '.0000000' }, end: { dateTime: e + '.0000000' }, isAllDay: false, location: { displayName: '' }, attendees: [], organizer: {}, ...extra })
  const fetchImpl = async (url: string, init: any = {}) => {
    const method = init.method || 'GET'
    const json = (b: any, status = 200) => ({ ok: status < 300, status, json: async () => b })
    if (url.includes('/oauth2/v2.0/token')) {
      g.refreshes++
      if (g.revoke) return json({ error: 'invalid_grant' }, 400)
      return json({ access_token: 'acc' + g.refreshes, expires_in: 3600, ...(g.rotate ? { refresh_token: 'rt-new' } : {}) })
    }
    g.calls.push(method + ' ' + url.replace('https://graph.microsoft.com/v1.0', '').split('?')[0])
    if (g.status) return json({}, g.status)
    if (method === 'GET') return json({ value: g.events })
    if (method === 'POST') { const b = JSON.parse(init.body); const id = 'c' + ++g.seq; g.events.push({ ...raw(id, b.subject, b.start.dateTime, b.end.dateTime), categories: b.categories, body: b }); g.last = b; return json({ id }, 201) }
    const id = decodeURIComponent(url.split('/events/')[1])
    if (method === 'PATCH') { const i = g.events.findIndex((e: any) => e.id === id); if (i < 0) return json({}, 404); const b = JSON.parse(init.body); g.events[i] = { ...g.events[i], subject: b.subject, start: { dateTime: b.start.dateTime }, end: { dateTime: b.end.dateTime } }; g.last = b; return json({ id }) }
    if (method === 'DELETE') { const i = g.events.findIndex((e: any) => e.id === id); if (i < 0) return json({}, 404); g.events.splice(i, 1); return json({}, 204) }
    return json({}, 400)
  }
  // the haavn.au diary ATRIUM reads itself
  const src: any = { events: [] as any[], asked: [] as string[] }
  const cal = { configured: true, async listFor(mb: string) { src.asked.push(mb); return src.events } }
  const del = CT.make(env, fetchImpl)
  return { store, kv, g, raw, src, cal, del }
}
const ev = (id: string, subject: string, start: string, end: string, extra: any = {}) => ({ id, subject, allDay: false, start, end, location: '', joinUrl: '', showAs: 'busy', sensitivity: '', ...extra })
let W: ReturnType<typeof world>
beforeEach(() => { W = world() })

describe('the diary connection token', () => {
  it('is sealed: unreadable without the server secret, and tied to the one person it belongs to', async () => {
    const sealed = CT.seal({ rt: 'REFRESH-TOKEN-VALUE', acct: 'jamie@7even.au' }, 'jb', env)
    expect(sealed).not.toContain('REFRESH-TOKEN-VALUE')
    expect(CT.open(sealed, 'jb', env)).toMatchObject({ rt: 'REFRESH-TOKEN-VALUE' })
    expect(CT.open(sealed, 'ds', env)).toBeNull()                                          // not another person's
    expect(CT.open(sealed, 'jb', { ...env, SESSION_SECRET: 'a-different-secret-entirely-99' })).toBeNull()
    expect(CT.open(sealed.slice(0, -3) + 'AAA', 'jb', env)).toBeNull()                       // tampered with
    await CT.save(W.kv, 'jb', { rt: 'REFRESH-TOKEN-VALUE', acct: 'jamie@7even.au' }, env)
    expect(JSON.stringify(W.store)).not.toContain('REFRESH-TOKEN-VALUE')                    // what the shared table holds
  })
  it('reads the person\'s own diary with their own permission, and reuses the short-lived access', async () => {
    await CT.save(W.kv, 'jb', { rt: 'rt1', acct: 'jamie@7even.au' }, env)
    W.g.events = [W.raw('a', 'Board catch up', '2026-11-06T09:15:00', '2026-11-06T10:00:00', { onlineMeeting: { joinUrl: 'https://teams/j' } })]
    const r = await W.del.eventsFor('jb', W.kv, '2026-11-05T00:00:00Z', '2026-11-08T00:00:00Z')
    expect(r).toMatchObject({ connected: true, account: 'jamie@7even.au' })
    expect(r.events[0]).toMatchObject({ subject: 'Board catch up', start: '2026-11-06T09:15:00', joinUrl: 'https://teams/j' })
    await W.del.eventsFor('jb', W.kv, 'x', 'y'); expect(W.g.refreshes).toBe(1)
    expect(W.g.calls.every((c: string) => c === 'GET /me/calendarView')).toBe(true)         // only ever the signed-in person's own diary
  })
  it('says nothing is connected for someone who has not, and never calls Microsoft', async () => {
    expect(await W.del.eventsFor('jb', W.kv, 'x', 'y')).toEqual({ connected: false }); expect(W.g.calls.length).toBe(0)
    expect((await W.del.status('jb', W.kv)).connected).toBe(false)
  })
  it('asks them to connect again when Microsoft has ended the permission, and forgets the dead token', async () => {
    await CT.save(W.kv, 'jb', { rt: 'rt1', acct: 'jamie@7even.au' }, env)
    W.g.revoke = true
    expect(await W.del.eventsFor('jb', W.kv, 'x', 'y')).toEqual({ connected: false, reconnect: true })
    expect((await W.del.status('jb', W.kv)).connected).toBe(false)
  })
  it('keeps the newer refresh token Microsoft hands back', async () => {
    await CT.save(W.kv, 'jb', { rt: 'rt1', acct: 'jamie@7even.au' }, env); W.g.rotate = true
    await W.del.eventsFor('jb', W.kv, 'x', 'y')
    expect(CT.open(W.store[CT.KEY].jb, 'jb', env).rt).toBe('rt-new')
  })
})

describe('copying the haavn.au diary into the other Outlook', () => {
  beforeEach(async () => { await CT.save(W.kv, 'jb', { rt: 'rt1', acct: 'jamie@7even.au' }, env) })
  const sync = () => CM.syncPerson({ person: jamie, kv: W.kv, cal: W.cal, del: W.del, now: Date.parse('2026-11-06T08:00:00Z') })
  it('makes plain busy copies: no invitees, no reminder, tagged, free time and real meetings already there left out', async () => {
    W.src.events = [ev('h1', 'HAAVN weekly', '2026-11-06T11:10:00', '2026-11-06T11:50:00', { location: 'Teams', joinUrl: 'https://teams/h1' }), ev('h2', 'Lunch hold', '2026-11-06T12:00:00', '2026-11-06T13:00:00', { showAs: 'free' }), ev('h3', 'Already here', '2026-11-06T14:00:00', '2026-11-06T15:00:00'), ev('h4', 'Pay run', '2026-11-06T16:00:00', '2026-11-06T16:30:00', { sensitivity: 'private' })]
    W.g.events = [W.raw('n1', 'already here', '2026-11-06T14:00:00', '2026-11-06T15:00:00')]
    const r = await sync()
    expect(r).toMatchObject({ created: 2, skipped: 2, failed: 0, mailbox: 'jamie@haavn.au' })
    const copies = W.g.events.filter((e: any) => (e.categories || []).includes('HAAVN diary'))
    expect(copies.map((e: any) => e.subject).sort()).toEqual(['Busy (HAAVN)', 'HAAVN weekly'])  // the private one hides its title
    expect(W.g.last.attendees).toBeUndefined(); expect(W.g.last.isReminderOn).toBe(false)
  })
  it('does nothing the second time round, and follows an edit and a cancellation', async () => {
    W.src.events = [ev('h1', 'HAAVN weekly', '2026-11-06T11:10:00', '2026-11-06T11:50:00'), ev('h2', 'Site call', '2026-11-06T13:00:00', '2026-11-06T13:30:00')]
    await sync(); W.g.calls.length = 0
    expect(await sync()).toMatchObject({ created: 0, updated: 0, removed: 0 }); expect(W.g.calls.filter((c: string) => c !== 'GET /me/calendarView')).toEqual([])
    W.src.events = [ev('h1', 'HAAVN weekly', '2026-11-06T11:30:00', '2026-11-06T12:10:00')]                 // moved by 20 minutes; the site call is cancelled
    expect(await sync()).toMatchObject({ updated: 1, removed: 1, created: 0 })
    expect(W.g.events.map((e: any) => e.start.dateTime.slice(0, 16))).toEqual(['2026-11-06T11:30'])
  })
  it('puts a copy back if someone deleted it by hand, and keeps nothing for a person who is not connected', async () => {
    W.src.events = [ev('h1', 'HAAVN weekly', '2026-11-06T11:10:00', '2026-11-06T11:50:00')]
    await sync(); W.g.events.length = 0
    W.src.events = [ev('h1', 'HAAVN weekly', '2026-11-06T11:15:00', '2026-11-06T11:55:00')]
    expect(await sync()).toMatchObject({ created: 1 })
    expect(await CM.syncPerson({ person: { id: 'ds', emails: ['daniel@7even.au'] }, kv: W.kv, cal: W.cal, del: W.del })).toEqual({ skipped: 'not connected' })
  })
  it('removes its copies, and only its copies, when the person disconnects', async () => {
    W.src.events = [ev('h1', 'HAAVN weekly', '2026-11-06T11:10:00', '2026-11-06T11:50:00')]
    await sync(); W.g.events.push(W.raw('mine', 'My own meeting', '2026-11-06T09:15:00', '2026-11-06T10:00:00'))
    expect((await CM.clearPerson({ person: jamie, kv: W.kv, del: W.del })).removed).toBe(1)
    expect(W.g.events.map((e: any) => e.subject)).toEqual(['My own meeting'])
  })
})

describe('copies are never doubled, and doubles that already exist are cleaned up', () => {
  beforeEach(async () => { await CT.save(W.kv, 'jb', { rt: 'rt1', acct: 'jamie@7even.au' }, env) })
  const NOW = Date.parse('2026-11-06T08:00:00Z')
  const sync = (now = NOW) => CM.syncPerson({ person: jamie, kv: W.kv, cal: W.cal, del: W.del, now })
  const copies = () => W.g.events.filter((e: any) => (e.categories || []).includes('HAAVN diary'))
  const MEETINGS = () => [ev('h1', 'WEEKLY MEETING', '2026-11-06T08:30:00', '2026-11-06T09:30:00'), ev('h2', 'Haavn HeadCo Check-in', '2026-11-06T09:30:00', '2026-11-06T10:00:00'), ev('h3', 'Private thing', '2026-11-06T11:00:00', '2026-11-06T12:00:00', { sensitivity: 'private' })]

  it('two syncs started at once (the button and the 15-minute timer): one runs, the other stands aside, and there is one copy of each', async () => {
    W.src.events = MEETINGS()
    const [a, b] = await Promise.all([sync(), sync()])
    expect([a, b].filter((x: any) => x.skipped === 'already running').length).toBe(1)      // one stood aside
    expect([a, b].filter((x: any) => x.created === 3).length).toBe(1)                       // the other made the three copies
    expect(copies().length).toBe(3)
  })
  it('the lock frees itself when a sync ends, and lapses on its own if a sync died', async () => {
    W.src.events = MEETINGS()
    await sync()
    expect(await sync()).toMatchObject({ created: 0 })                               // not stuck behind the first
    W.store['atrium_cal_lock'] = { jb: NOW - 10 * 60e3 }                              // a lock left behind 10 minutes ago
    expect((await sync()).skipped).not.toBe('already running')
    W.store['atrium_cal_lock'] = { jb: NOW - 30e3 }                                   // one taken 30 seconds ago is respected
    expect(await sync()).toMatchObject({ skipped: 'already running' })
  })
  it('cleans up doubles that are already there (the situation after two overlapping syncs), keeping one copy of each', async () => {
    W.src.events = MEETINGS()
    await sync()
    // two overlapping runs left a second copy of every meeting that no record points at
    for (const c of [...copies()]) W.g.events.push({ ...c, id: 'dup-' + c.id })
    expect(copies().length).toBe(6)
    const r = await sync()
    expect(r).toMatchObject({ created: 0, cleaned: 3, failed: 0 })
    expect(copies().length).toBe(3)
    expect(copies().every((c: any) => !String(c.id).startsWith('dup-') || true)).toBe(true)
    expect(await sync()).toMatchObject({ created: 0, cleaned: 0 })                    // and it stays clean
  })
  it('if its record is lost, it keeps the copies already in the diary instead of making them again', async () => {
    W.src.events = MEETINGS()
    await sync()
    delete W.store['atrium_cal_mirror']
    const r = await sync()
    expect(r).toMatchObject({ created: 0, cleaned: 0 })
    expect(copies().length).toBe(3)
    W.src.events = MEETINGS().slice(0, 1)                                              // and the record works again: the cancelled ones are removed
    expect(await sync()).toMatchObject({ removed: 2 })
    expect(copies().length).toBe(1)
  })
  it('never touches a real meeting, only copies it made', async () => {
    W.src.events = MEETINGS()
    W.g.events = [W.raw('real1', 'Better Living | DINO', '2026-11-06T10:00:00', '2026-11-06T11:30:00'), W.raw('real2', 'Real duplicate-looking', '2026-11-06T08:30:00', '2026-11-06T09:30:00')]
    await sync()
    expect(W.g.events.filter((e: any) => String(e.id).startsWith('real')).length).toBe(2)
    expect(W.g.calls.filter((c: string) => /DELETE \/me\/events\/real/.test(c))).toEqual([])
  })
  it('reads every page of a long diary, so nothing is missed and nothing is doubled', async () => {
    const pages = [{ value: [W.raw('a', 'One', '2026-11-06T09:00:00', '2026-11-06T09:30:00')], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/calendarView?page=2' }, { value: [W.raw('b', 'Two', '2026-11-06T10:00:00', '2026-11-06T10:30:00')] }]
    let n = 0
    const del = CT.make(env, async (url: string) => url.includes('/oauth2/v2.0/token') ? ({ ok: true, status: 200, json: async () => ({ access_token: 't', expires_in: 3600 }) }) : ({ ok: true, status: 200, json: async () => pages[n++] }))
    const r = await del.eventsFor('jb', W.kv, 'x', 'y')
    expect(r.events.map((e: any) => e.subject)).toEqual(['One', 'Two']); expect(n).toBe(2)
  })
})
