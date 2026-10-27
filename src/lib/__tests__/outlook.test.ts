import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const O = require('../../../api/_utils/outlook.js')

const env = { MS_TENANT_ID: 't', MS_CLIENT_ID: 'c', MS_CLIENT_SECRET: 's' }
function fakeGraph(script: any[] = []) {
  const calls: any[] = []
  const f = async (url: string, o: any = {}) => {
    calls.push({ url, method: o.method || 'GET', body: o.body })
    if (String(url).includes('login.microsoftonline.com')) return { ok: true, status: 200, json: async () => ({ access_token: 'tok', expires_in: 3600 }) }
    const r = script.shift() || { status: 201, body: { id: 'ev9', webLink: 'https://o/9', onlineMeeting: { joinUrl: 'https://teams/9' } } }
    return { ok: r.status < 300, status: r.status, json: async () => r.body || {} }
  }
  return { f, calls }
}
const meeting = { id: 1, title: 'Board <review>', date: '2026-11-04', time: '23:30', items: [{ title: 'Numbers' }] }

describe('Outlook invites', () => {
  it('computes the end across midnight and builds the event with a Teams link', () => {
    expect(O.span('2026-11-04', '23:30', 45)).toEqual({ start: '2026-11-04T23:30:00', end: '2026-11-05T00:15:00' })
    const ev = O.eventFor(meeting, { minutes: 60, emails: ['A@b.com', 'a@b.com', 'junk'], by: 'Jamie' })
    expect(ev.attendees).toEqual([{ emailAddress: { address: 'a@b.com' }, type: 'required' }])
    expect(ev.isOnlineMeeting).toBe(true); expect(ev.start.timeZone).toBe('Australia/Melbourne'); expect(ev.body.content).toContain('Board &lt;review&gt;')
    expect(O.eventFor(meeting, { teams: false }).isOnlineMeeting).toBeUndefined()
  })
  it('creates the event on the organizer mailbox and returns the Teams link', async () => {
    const g = fakeGraph(); const c = O.make(env, g.f)
    const r = await c.upsert(meeting, { minutes: 60, emails: ['a@b.com'] })
    expect(r).toEqual({ id: 'ev9', joinUrl: 'https://teams/9', webLink: 'https://o/9', updated: false })
    expect(g.calls[1].url).toBe('https://graph.microsoft.com/v1.0/users/boardroom%40haavn.au/events'); expect(g.calls[1].method).toBe('POST')
  })
  it('moves the same event when there is one, and makes it again if it was deleted', async () => {
    const g = fakeGraph([{ status: 200, body: { webLink: 'https://o/new' } }]); const c = O.make(env, g.f)
    const r = await c.upsert({ ...meeting, calendarEventId: 'old', teamsJoinUrl: 'https://teams/old' }, { minutes: 30 })
    expect(r).toMatchObject({ id: 'old', updated: true, joinUrl: 'https://teams/old' }); expect(g.calls[1].method).toBe('PATCH')
    const g2 = fakeGraph([{ status: 404 }]); const r2 = await O.make(env, g2.f).upsert({ ...meeting, calendarEventId: 'gone' }, {})
    expect(r2).toMatchObject({ id: 'ev9', updated: false }); expect(g2.calls.map((x: any) => x.method)).toEqual(['POST', 'PATCH', 'POST'])
  })
  it('explains a refusal and an unset app', async () => {
    await expect(O.make(env, fakeGraph([{ status: 403 }]).f).upsert(meeting, {})).rejects.toThrow(/Calendars.ReadWrite/)
    await expect(O.make(env, fakeGraph([{ status: 500 }]).f).upsert(meeting, {})).rejects.toThrow(/failed \(500\)/)
    const none = O.make({}, fakeGraph().f); expect(none.configured).toBe(false)
    await expect(none.upsert(meeting, {})).rejects.toThrow(/not set up/)
  })
})
