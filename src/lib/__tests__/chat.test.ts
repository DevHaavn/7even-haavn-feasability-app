import { describe, it, expect, beforeEach } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const C = require('../../../api/_utils/chat.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const B = require('../../../api/_utils/blaze.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const O = require('../../../api/_utils/outside.js')

const me = (sub: string, name: string) => ({ sub, name, role: 'staff', emails: [sub + '@x'] })
const jamie = me('jb', 'Jamie Baldwin'), daniel = me('ds', 'Daniel Sette'), lewis = me('lj', 'Lewis Jin')

function fake() {
  const t = { groups: [] as any[], members: [] as any[], msgs: [] as any[], seq: 0, gseq: 0 }
  const store = {
    async memberRowsFor(m: string) { return t.members.filter((r) => r.member === m).map((r) => ({ last_read: 0, muted: false, archived: false, hidden: false, ...r })) },
    async groupsByIds(ids: string[]) { return t.groups.filter((g) => ids.includes(g.id)) },
    async membersByGroups(ids: string[]) { return t.members.filter((r) => ids.includes(r.group_id)).map((r) => ({ last_read: 0, muted: false, archived: false, hidden: false, ...r })) },
    async messagesFor(ids: string[], o: any) { return t.msgs.filter((m) => ids.includes(m.group_id) && m.id > (o.after || 0) && (o.after || !['icon', 'wall', 'avatar'].includes(m.kind))) },
    async latestPollUp(mid: number) { return t.msgs.filter((m) => m.kind === 'pollup' && m.task && m.task.poll === Number(mid)).sort((x, y) => y.id - x.id)[0] || null },
    async latestStyle(ids: string[]) { return t.msgs.filter((m) => ids.includes(m.group_id) && ['icon', 'wall'].includes(m.kind)).sort((x, y) => y.id - x.id) },
    async updateGroup(id: string, p: any) { Object.assign(t.groups.find((g) => g.id === id), p) },
    async insertGroup(g: any) { const r = { id: 'g' + ++t.gseq, ...g }; t.groups.push(r); return r },
    async insertMembers(rows: any[]) { const keys = (r: any) => Object.keys(r).sort().join(','); if (rows.some((r) => keys(r) !== keys(rows[0]))) throw new Error('db 400 PGRST102: All object keys must match'); rows.forEach((r) => { if (!t.members.some((x) => x.group_id === r.group_id && x.member === r.member)) t.members.push({ last_read: 0, muted: false, archived: false, hidden: false, ...r }) }) },
    async updateMember(g: string, m: string, p: any) { Object.assign(t.members.find((x) => x.group_id === g && x.member === m), p) },
    async deleteMember(g: string, m: string) { t.members = t.members.filter((x) => !(x.group_id === g && x.member === m)) },
    async insertMessage(m: any) { const r = { id: ++t.seq, created_at: new Date().toISOString(), ...m }; t.msgs.push(r); return r },
    async getMessage(id: number) { return t.msgs.find((m) => m.id === Number(id)) || null },
    async deleteMessage(id: number) { t.msgs = t.msgs.filter((m) => m.id !== Number(id)) },
    async updateMessage(id: number, p: any) { Object.assign(t.msgs.find((m) => m.id === Number(id)), p) },
    async deleteGroup(id: string) { t.groups = t.groups.filter((g) => g.id !== id); t.members = t.members.filter((m) => m.group_id !== id); t.msgs = t.msgs.filter((m) => m.group_id !== id) },
    async findDm(key: string) { return t.groups.find((g) => g.dm_key === key) || null },
    async unhideOthers(g: string, me: string) { t.members.filter((r) => r.group_id === g && r.member !== me && r.hidden).forEach((r) => { r.hidden = false }) },
    async unarchiveOthers(g: string, me: string) { t.members.filter((r) => r.group_id === g && r.member !== me).forEach((r) => { r.archived = false }) },
    async tasksIn(ids: string[]) { return t.msgs.filter((m) => ids.includes(m.group_id) && m.kind === 'task').sort((x, y) => y.id - x.id) },
    async searchMessages(ids: string[], q: string) { const l = q.toLowerCase(); return t.msgs.filter((m) => ids.includes(m.group_id) && ['text', 'task', 'wfupdate', 'meeting'].includes(m.kind) && (String(m.body || '').toLowerCase().includes(l) || String(m.task && m.task.title || '').toLowerCase().includes(l))).sort((x, y) => y.id - x.id) },
    async recentWithFiles(ids: string[]) { return t.msgs.filter((m) => ids.includes(m.group_id) && (m.files || []).length).sort((x, y) => y.id - x.id) },
    async filePaths(g: string) { return t.msgs.filter((m) => m.group_id === g).flatMap((m) => (m.files || []).map((f: any) => f.path)) },
  }
  const objs: any[] = []
  const files = { async signUpload(p: string) { return { uploadUrl: 'https://up/' + p } }, async signDownloads(ps: string[]) { return Object.fromEntries(ps.map((p) => [p, 'https://dl/' + p])) }, async remove(ps: string[]) { ps.forEach((p) => { const i = objs.findIndex((o) => 'avatars/' + o.name === p); if (i >= 0) objs.splice(i, 1) }) }, async list(prefix: string) { return prefix === 'avatars' ? objs.slice() : [] } }
  const db: any = { workflow: { seq: 1, actions: [] }, board: { meetings: [{ id: 1, kind: 'weekly', date: '2099-01-01', closed: false, items: [], attendees: [] }] } }
  const other: any = {}
  const kv = { async read(k: string) { if (k === B.KEYS.workflow) return { value: db.workflow }; if (k === B.KEYS.boardroom) return { value: db.board }; return other[k] ? { value: other[k] } : null }, async update(k: string, fn: any) { if (k.startsWith('atrium_chat_order_') || k === 'atrium_outside_people') { const { next, result } = fn(other[k] || null); other[k] = next; return result } const key = k === B.KEYS.workflow ? 'workflow' : 'board'; const { next, result } = fn(db[key]); db[key] = next; return result } }
  const calls: any[] = []
  const cal: any = { configured: true, calls, fail: false, asked: [] as string[], made: [] as any[], missing: new Set<string>(), forbid: false,
    async upsert(m: any, o: any) { if (cal.fail) throw new Error('Outlook refused'); calls.push({ m, o }); return { id: 'ev1', joinUrl: 'https://teams.example/join', webLink: 'https://outlook.example/ev', updated: !!m.calendarEventId } },
    async listFor(mb: string) { cal.asked.push(mb); if (cal.forbid) throw Object.assign(new Error('denied'), { status: 403 }); if (cal.missing.has(mb)) throw Object.assign(new Error('no such user'), { status: 404 }); return [{ id: 'e1', subject: 'Weekly meeting', allDay: false, start: '2026-10-28T09:30:00', end: '2026-10-28T10:30:00', location: 'Teams', joinUrl: 'https://teams.example/j', webLink: '', organizer: 'Lewis Jin', people: 4 }] },
    async createOn(mb: string, m: any, o: any) { cal.asked.push(mb); if (cal.missing.has(mb)) throw Object.assign(new Error('no such user'), { status: 404 }); cal.made.push({ mb, m, o }); return { id: 'new1', joinUrl: 'https://teams.example/new', webLink: 'https://outlook.example/new' } } }
  const sentMail: any[] = []
  const mail: any = { configured: true, sent: sentMail, fail: false, async send(m: any) { if (mail.fail) throw new Error('Email refused'); sentMail.push(m); return { ok: true } } }
  const speech: any = { configured: true, fail: false, async token() { if (speech.fail) throw Object.assign(new Error('refused'), { status: speech.fail === true ? undefined : speech.fail }); return { token: 'tok123', region: 'australiaeast' } } }
  return { t, objs, deps: { store, files, kv, cal, speech, mail, site: 'https://atrium.example' }, db, cal, speech, mail }
}
let F: ReturnType<typeof fake>
const run = (a: string, args: any, who = jamie) => C.run(a, { v: 2, ...args }, who, F.deps)
beforeEach(() => { F = fake(); O.reset() })

describe('groups and who sees them', () => {
  it('a new group is seen by its members and nobody else', async () => {
    const { gid } = await run('newGroup', { name: 'Belmont', ids: ['ds', 'jw'] })
    await run('send', { gid, body: 'Hello' })
    expect((await run('init', {}, daniel)).groups.map((g: any) => g.n)).toEqual(['Belmont'])
    expect((await run('init', {}, lewis)).groups).toEqual([])
    await expect(run('send', { gid, body: 'sneaky' }, lewis)).rejects.toThrow(/not in that chat/)
  })
  it('needs a name and at least one person, and ignores people who are not on the team', async () => {
    await expect(run('newGroup', { name: 'x', ids: [] })).rejects.toThrow(/at least one/)
    await expect(run('newGroup', { name: '', ids: ['ds', 'jw'] })).rejects.toThrow(/name/)
    await expect(run('newGroup', { name: 'x', ids: ['nobody'] })).rejects.toThrow(/at least one/)
  })
  it('one name-less person is a direct message, and only ever one between two people', async () => {
    const a = await run('newGroup', { ids: ['ds'] }), b = await run('newGroup', { ids: ['jb'] }, daniel)
    expect(b.gid).toBe(a.gid); expect(b.existing).toBe(true)
    const s = await run('init', {}, daniel)
    expect(s.groups[0].dm).toBe(true); expect(s.groups[0].m.sort()).toEqual(['ds', 'jb'])
  })
  it('keeps outside emails as guests', async () => {
    const { gid } = await run('newGroup', { name: 'Plans', ids: ['ds'], ext: ['Architect@Firm.com.au', 'not-an-email'] })
    const s = await run('init', {}, jamie)
    expect(s.groups[0].m).toContain('x:architect@firm.com.au'); expect(s.groups[0].m.length).toBe(3)
    expect(s.people.find((p: any) => p.id === 'x:architect@firm.com.au').ext).toBe(true)
    expect(gid).toBeTruthy()
  })
})

describe('messages, reading and polling', () => {
  it('poll returns only what is new, and unread follows last_read', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    const a = await run('send', { gid, body: 'one' }), first = await run('init', {}, daniel)
    expect(first.msgs.length).toBe(1); expect(first.read[gid]).toBe(0)
    await run('send', { gid, body: 'two' })
    const p = await run('poll', { since: first.cursor }, daniel)
    expect(p.msgs.map((m: any) => m.x)).toEqual(['two'])
    await run('read', { gid, upto: p.cursor }, daniel)
    expect((await run('init', {}, daniel)).read[gid]).toBe(p.cursor)
    await run('read', { gid, upto: 1 }, daniel) // never goes backwards
    expect((await run('init', {}, daniel)).read[gid]).toBe(p.cursor)
    expect(a.msg.u).toBe('jb')
  })
  it('refuses an empty message and caps a long one', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    await expect(run('send', { gid, body: '   ' })).rejects.toThrow(/Nothing to send/)
    expect((await run('send', { gid, body: 'x'.repeat(9000) })).msg.x.length).toBe(8000)
  })
  it('mute, archive and remove-from-my-list are mine alone, and a new message brings archive back', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    await run('setMine', { gid, muted: true, archived: true }, daniel)
    let s = await run('init', {}, daniel)
    expect(s.state.muted['ds' + gid]).toBe(1); expect(s.state.arch['ds' + gid]).toBe(1)
    expect((await run('init', {}, jamie)).state.muted['jb' + gid]).toBeUndefined()
    await run('send', { gid, body: 'ping' })
    s = await run('init', {}, daniel); expect(s.state.arch['ds' + gid]).toBeUndefined(); expect(s.state.muted['ds' + gid]).toBe(1)
    await run('setMine', { gid, hidden: true }, daniel)
    expect((await run('init', {}, daniel)).groups).toEqual([])
    expect((await run('init', {}, jamie)).groups.length).toBe(1)
  })
})

describe('people in a chat', () => {
  it('any member adds, only the owner removes, and each is logged in the chat', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    const r = await run('addMembers', { gid, ids: ['lj', 'ds', 'nobody'], ext: ['x@y.com'] }, daniel)
    expect(r.added.length).toBe(2)
    const s = await run('init', {}, lewis)
    expect(s.msgs.some((m: any) => m.sys && /added/.test(m.x))).toBe(true)
    await expect(run('removeMember', { gid, member: 'lj' }, daniel)).rejects.toThrow(/owner/)
    await run('removeMember', { gid, member: 'lj' }, jamie)
    expect((await run('init', {}, lewis)).groups).toEqual([])
  })
  it('adds people to several chats at once and reports what it skipped', async () => {
    const g1 = (await run('newGroup', { name: 'A', ids: ['ds'] })).gid
    const g2 = (await run('newGroup', { name: 'B', ids: ['ds'] })).gid
    const dm = (await run('newGroup', { ids: ['ds'] })).gid
    const r = await run('addToGroups', { gids: [g1, g2, dm, 'nope'], ids: ['lj'] })
    expect(r.done.length).toBe(2); expect(r.skipped.length).toBe(2)
    const s = await run('init', {}, lewis)
    expect(s.groups.length).toBe(2)
    await expect(run('addToGroups', { gids: [], ids: ['lj'] })).rejects.toThrow(/chat/)
  })
  it('any member renames a group, a direct message cannot be renamed, and it is logged', async () => {
    const { gid } = await run('newGroup', { name: 'Old', ids: ['ds'] })
    await run('renameGroup', { gid, name: '  New   name ' }, daniel)
    const s = await run('init', {}, jamie)
    expect(s.groups[0].n).toBe('New name')
    expect(s.msgs.some((m: any) => m.sys && /renamed the chat/.test(m.x))).toBe(true)
    await expect(run('renameGroup', { gid, name: '' })).rejects.toThrow(/name/)
    await expect(run('renameGroup', { gid, name: 'x' }, lewis)).rejects.toThrow(/not in/)
    const dm = (await run('newGroup', { ids: ['ds'] })).gid
    await expect(run('renameGroup', { gid: dm, name: 'x' })).rejects.toThrow(/direct message/)
  })
  it('keeps my pinned order, only of chats I am in, and hands it back at init', async () => {
    const a = (await run('newGroup', { name: 'A', ids: ['ds'] })).gid
    const b = (await run('newGroup', { name: 'B', ids: ['ds'] })).gid
    const only = (await run('newGroup', { name: 'C', ids: ['lj'] })).gid
    const r = await run('setOrder', { order: [b, a, only, 'nope', b] }, daniel)
    expect(r.order).toEqual([b, a])
    expect((await run('init', {}, daniel)).order).toEqual([b, a])
    expect((await run('init', {}, jamie)).order).toEqual([])
  })
  it('a direct message started from search lands with the other person only once a message is sent', async () => {
    const { gid } = await run('newGroup', { ids: ['ds'] })
    expect((await run('init', {}, daniel)).groups).toEqual([])
    await run('send', { gid, body: 'Hi Daniel' })
    const s = await run('init', {}, daniel)
    expect(s.groups.map((g: any) => g.dm)).toEqual([true]); expect(s.msgs.map((m: any) => m.x)).toEqual(['Hi Daniel'])
  })
  it('repairs a direct message shell left behind with nobody in it', async () => {
    F.t.groups.push({ id: 'gx', name: '', is_dm: true, is_private: true, owner: 'jb', dm_key: 'ds|jb' })
    const r = await run('newGroup', { ids: ['ds'] })
    expect(r.gid).toBe('gx'); expect(r.existing).toBe(true)
    expect((await run('init', {}, jamie)).groups.map((g: any) => g.id)).toEqual(['gx'])
    expect((await run('init', {}, daniel)).groups).toEqual([])
    await run('send', { gid: 'gx', body: 'hi' })
    expect((await run('init', {}, daniel)).groups.length).toBe(1)
  })
  it('does not add people to a direct message', async () => {
    const { gid } = await run('newGroup', { ids: ['ds'] })
    await expect(run('addMembers', { gid, ids: ['lj'] })).rejects.toThrow(/group/)
  })
  it('only the owner deletes for everyone', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    await expect(run('deleteGroup', { gid }, daniel)).rejects.toThrow(/owner/)
    await run('deleteGroup', { gid }, jamie)
    expect((await run('init', {}, daniel)).groups).toEqual([]); expect(F.t.msgs.length).toBe(0)
  })
})

describe('meetings from a chat', () => {
  it('creates the meeting in Meeting Management with the chat as attendees and agenda, and posts a card', async () => {
    const { gid } = await run('newGroup', { name: 'Preston', ids: ['ds', 'lj'] })
    const r = await run('createMeeting', { gid, title: 'Preston facade review', date: '2026-11-04', time: '10:30', durationMin: 45, agenda: ['Facade package', '  ', 'Council RFI'], note: 'Please bring the drawings' })
    expect(r.msg.mt).toMatchObject({ t: 'Preston facade review', d: '2026-11-04', tm: '10:30', n: 2 })
    const m = F.db.board.meetings.find((x: any) => x.title === 'Preston facade review')
    expect(m.kind).toBe('internal'); expect(m.chatGid).toBe(gid); expect(m.chair).toBe('Jamie Baldwin')
    expect(m.attendees.map((x: any) => x.name).sort()).toEqual(['Daniel Sette', 'Jamie Baldwin', 'Lewis Jin'])
    expect(m.items.map((i: any) => i.title)).toEqual(['Facade package', 'Council RFI'])
    const seen = await run('init', {}, daniel)
    expect(seen.msgs.find((x: any) => x.mt).x).toBe('Please bring the drawings')
  })
  it('only chosen attendees come when some are picked, and bad input is refused plainly', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds', 'lj'] })
    await run('createMeeting', { gid, title: 'Small one', date: '2026-11-05', attendees: ['Daniel Sette'] })
    expect(F.db.board.meetings.find((x: any) => x.title === 'Small one').attendees.map((x: any) => x.name).sort()).toEqual(['Daniel Sette', 'Jamie Baldwin'])
    await expect(run('createMeeting', { gid, title: '', date: '2026-11-05' })).rejects.toThrow(/title/)
    await expect(run('createMeeting', { gid, title: 'X', date: 'tomorrow' })).rejects.toThrow(/YYYY-MM-DD/)
    await expect(run('createMeeting', { gid, title: 'X', date: '2026-11-05' }, lewis)).resolves.toBeTruthy()
    await expect(run('createMeeting', { gid: 'nope', title: 'X', date: '2026-11-05' })).rejects.toThrow(/not in/)
  })
  it('lists the meetings of this chat only, adds a message to the agenda, and posts the minutes back', async () => {
    const a = (await run('newGroup', { name: 'A', ids: ['ds'] })).gid, b = (await run('newGroup', { name: 'B', ids: ['ds'] })).gid
    await run('createMeeting', { gid: a, title: 'Meeting A', date: '2026-11-04' }); await run('createMeeting', { gid: b, title: 'Meeting B', date: '2026-11-04' })
    expect((await run('chatMeetings', { gid: a })).meetings.map((m: any) => m.title)).toEqual(['Meeting A'])
    const { msg } = await run('send', { gid: a, body: 'We need a decision on the car park layout' })
    const r = await run('addToMeeting', { gid: a, mid: msg.id })
    expect(r.meeting.title).toBe('Meeting A')
    const mA = F.db.board.meetings.find((x: any) => x.title === 'Meeting A')
    expect(mA.items[0].title).toBe('We need a decision on the car park layout'); expect(mA.items[0].notes).toMatch(/Jamie Baldwin|From the chat/)
    await expect(run('addToMeeting', { gid: b, mid: msg.id })).rejects.toThrow(/No such message/)
    await expect(run('postMinutes', { gid: a, meetingId: mA.id })).rejects.toThrow(/No decisions/)
    mA.decisions = [{ id: 1, text: 'Car park goes to the north side' }]; mA.minutes = 'Agreed to proceed.'
    const p = await run('postMinutes', { gid: a, meetingId: mA.id })
    expect(p.msg.x).toMatch(/Minutes: Meeting A/); expect(p.msg.x).toMatch(/Car park goes to the north side/)
    await expect(run('postMinutes', { gid: b, meetingId: mA.id })).rejects.toThrow(/not from this chat/)
    F.db.board.meetings.find((x: any) => x.title === 'Meeting A').closed = true
    await expect(run('addToMeeting', { gid: a, mid: msg.id })).rejects.toThrow(/No meeting from this chat/)
  })
})

describe('meeting notes', () => {
  it('are saved, listed newest first, edited in place, and deleted, and never show up as a chat', async () => {
    const one = (await run('noteSave', { title: 'Corio board', body: 'Agreed the numbers', lang: 'en-AU' })).note
    await new Promise((r) => setTimeout(r, 5))
    const two = (await run('noteSave', { title: 'Second', body: '你好' , lang: 'zh-CN' })).note
    expect((await run('noteList', {})).notes.map((n: any) => n.title)).toEqual(['Second', 'Corio board'])
    const edited = (await run('noteSave', { id: one.id, title: 'Corio board v2', body: 'Agreed the numbers and dates' })).note
    expect(edited.body).toBe('Agreed the numbers and dates'); expect((await run('noteList', {})).notes[0].id).toBe(one.id)
    expect((await run('init', {})).groups).toEqual([]); expect((await run('myGroups', {})).groups).toEqual([])
    await run('noteDelete', { id: two.id }); expect((await run('noteList', {})).notes.length).toBe(1)
  })
  it('are private to their author', async () => {
    const n = (await run('noteSave', { title: 'Mine', body: 'secret' })).note
    expect((await run('noteList', {}, daniel)).notes).toEqual([])
    await expect(run('noteSave', { id: n.id, body: 'hijack' }, daniel)).rejects.toThrow(/No such note/)
    await expect(run('noteDelete', { id: n.id }, daniel)).rejects.toThrow(/No such note/)
    await expect(run('noteEmail', { id: n.id, to: ['a@b.com'] }, daniel)).rejects.toThrow(/No such note/)
  })
  it('are emailed to anyone, with the person as reply-to and a blind copy, and the sending is remembered', async () => {
    const n = (await run('noteSave', { title: 'Board', body: 'Line <one>\nLine two', meetingTitle: 'Corio board' })).note
    const r = await run('noteEmail', { id: n.id, to: 'Client@Example.com; second@example.org', subject: 'Notes from today', message: 'Hi all' })
    expect(r.sent).toBe(2)
    const m = F.mail.sent[0]
    expect(m.to).toEqual(['client@example.com', 'second@example.org']); expect(m.subject).toBe('Notes from today')
    expect(m.replyTo).toBe('jb@x'); expect(m.bcc).toBe('jb@x'); expect(m.html).toContain('Line &lt;one&gt;'); expect(m.html).toContain('Sent from ATRIUM by Jamie Baldwin'); expect(m.html).toContain('Hi all')
    expect((await run('noteList', {})).notes[0].emailed[0].to).toEqual(['client@example.com', 'second@example.org'])
    await expect(run('noteEmail', { id: n.id, to: [] })).rejects.toThrow(/at least one/)
    await expect(run('noteEmail', { id: n.id, to: ['nope'] })).rejects.toThrow(/not an email/)
    await expect(run('noteEmail', { id: n.id, to: Array.from({ length: 11 }, (_, i) => `p${i}@b.com`) })).rejects.toThrow(/Ten/)
    F.mail.fail = true; await expect(run('noteEmail', { id: n.id, to: ['a@b.com'] })).rejects.toThrow(/Email refused/)
    const empty = (await run('noteSave', { title: 'Empty', body: '  ' })).note
    F.mail.fail = false; await expect(run('noteEmail', { id: empty.id, to: ['a@b.com'] })).rejects.toThrow(/nothing in this note/)
  })
  it('become internal tasks in Workflow, kept on the note', async () => {
    const n = (await run('noteSave', { title: 'Board', body: 'Daniel to send the cash flow', meetingTitle: 'Corio board' })).note
    const r = await run('noteTask', { id: n.id, title: 'Send the cash flow', owner: 'Daniel Sette', due: '2026-11-06', priority: 'High', project: 'Corio', line: 'Daniel to send the cash flow' })
    expect(r.task.owner).toBe('Daniel Sette')
    const w = F.db.workflow.actions[0]
    expect(w).toMatchObject({ title: 'Send the cash flow', owner: 'Daniel Sette', due: '2026-11-06', priority: 'High', project: 'Corio', createdBy: 'Jamie Baldwin (notes)' }); expect(w.notes).toContain('Corio board')
    expect((await run('noteList', {})).notes[0].tasks[0].title).toBe('Send the cash flow')
    await expect(run('noteTask', { id: n.id, title: '' })).rejects.toThrow(/title/)
    await expect(run('noteTask', { id: n.id, title: 'x', owner: 'Nobody Here' })).rejects.toThrow()
  })
  it('go into a meeting\'s minutes, only for people on it, and offer the right meetings and people', async () => {
    F.db.board.meetings.push({ id: 31, title: 'Corio board', date: '2026-11-10', chair: 'Jamie Baldwin', attendees: [{ name: 'Jamie Baldwin' }, { name: 'Daniel Sette' }], items: [], minutes: '' })
    F.db.board.meetings.push({ id: 32, title: 'Private', date: '2026-11-11', chair: 'Lewis Jin', attendees: [{ name: 'Lewis Jin' }], items: [], minutes: '' })
    const n = (await run('noteSave', { title: 'Board', body: 'We agreed to proceed' }, daniel)).note
    const opt = await run('noteOptions', {}, daniel)
    expect(opt.meetings.map((m: any) => m.title)).toEqual(['Corio board']); expect(opt.people).toContain('Seth Bean'); expect(opt.people).not.toContain('Callum Fraser')
    const r = await run('noteToMeeting', { id: n.id, meetingId: 31 }, daniel)
    expect(r.meeting.title).toBe('Corio board'); expect(F.db.board.meetings.find((m: any) => m.id === 31).minutes).toContain('We agreed to proceed')
    await expect(run('noteToMeeting', { id: n.id, meetingId: 32 }, daniel)).rejects.toThrow(/not on this meeting/)
    await expect(run('noteToMeeting', { id: n.id, meetingId: 999 }, daniel)).rejects.toThrow(/No such meeting/)
    expect((await run('noteList', {}, daniel)).notes[0]).toMatchObject({ minutes: true, meetingTitle: 'Corio board' })
  })
  it('can be shared into a chat', async () => {
    const { gid } = await run('newGroup', { name: 'Team', ids: ['ds'] })
    const n = (await run('noteSave', { title: 'Board', body: 'We agreed' })).note
    const r = await run('noteToChat', { id: n.id, gid })
    expect(r.msg.x).toBe('Notes: Board\n\nWe agreed')
  })
})

describe('Outlook invites for meetings', () => {
  it('a meeting made from a chat is invited to Outlook, and the invite is remembered on the meeting', async () => {
    const { gid } = await run('newGroup', { name: 'Preston', ids: ['ds', 'lj'] })
    const r = await run('createMeeting', { gid, title: 'Facade review', date: '2026-11-04', time: '10:30', durationMin: 45, attendees: ['Daniel Sette'], agenda: ['Facade'] })
    expect(r.invite).toMatchObject({ ok: true, joinUrl: 'https://teams.example/join', people: 2 })
    expect(r.msg.mt.inv).toBe(1)
    const c = F.cal.calls[0]
    expect(c.o.emails.sort()).toEqual(['daniel@7even.au', 'jamie@7even.au']); expect(c.o.minutes).toBe(45); expect(c.o.by).toBe('Jamie Baldwin'); expect(c.o.site).toBe('https://atrium.example')
    const m = F.db.board.meetings.find((x: any) => x.title === 'Facade review')
    expect(m).toMatchObject({ calendarEventId: 'ev1', teamsJoinUrl: 'https://teams.example/join', invitedBy: 'Jamie Baldwin' })
    expect((await run('chatMeetings', { gid })).meetings[0]).toMatchObject({ invited: true, joinUrl: 'https://teams.example/join' })
  })
  it('can be switched off, and a failing Outlook never loses the meeting', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    const off = await run('createMeeting', { gid, title: 'No invite', date: '2026-11-04', invite: false })
    expect(off.invite.skipped).toBe(true); expect(F.cal.calls.length).toBe(0); expect(off.msg.mt.inv).toBeUndefined()
    F.cal.fail = true
    const bad = await run('createMeeting', { gid, title: 'Outlook down', date: '2026-11-05' })
    expect(bad.invite).toMatchObject({ ok: false, error: 'Outlook refused' })
    expect(F.db.board.meetings.some((m: any) => m.title === 'Outlook down')).toBe(true)
  })
  it('sends or moves the invite for an existing meeting, for people on it only', async () => {
    F.db.board.meetings.push({ id: 5, title: 'Board', kind: 'internal', date: '2026-11-10', time: '09:00', chair: 'Jamie Baldwin', closed: false, targetSec: 5400, items: [], attendees: [{ id: 1, name: 'Jamie Baldwin' }, { id: 2, name: 'Daniel Sette', email: 'dan@example.com' }] })
    const first = await run('inviteMeeting', { meetingId: 5 })
    expect(first).toMatchObject({ ok: true, updated: false, people: 2 }); expect(F.cal.calls[0].o.minutes).toBe(90); expect(F.cal.calls[0].o.emails).toContain('dan@example.com')
    expect((await run('inviteMeeting', { meetingId: '5' }, daniel)).updated).toBe(true)
    await expect(run('inviteMeeting', { meetingId: 5 }, lewis)).rejects.toThrow(/not on this meeting/)
    await expect(run('inviteMeeting', { meetingId: 99 })).rejects.toThrow(/No such meeting/)
    F.db.board.meetings.push({ id: 6, title: 'Undated', attendees: [{ name: 'Jamie Baldwin' }] })
    await expect(run('inviteMeeting', { meetingId: 6 })).rejects.toThrow(/date/)
  })
  it('says plainly when Outlook is not set up', async () => {
    F.cal.configured = false
    F.db.board.meetings.push({ id: 8, title: 'X', date: '2026-11-10', attendees: [{ name: 'Jamie Baldwin' }] })
    await expect(run('inviteMeeting', { meetingId: 8 })).rejects.toThrow(/not set up/)
  })
})

describe('the chat of a meeting', () => {
  it('is made once for a meeting, with its attendees, and found again by anyone on it', async () => {
    F.db.board.meetings.push({ id: 77, title: 'Corio board', kind: 'internal', date: '2026-11-10', time: '09:00', chair: 'Jamie Baldwin', closed: false, items: [{ id: 1 }], attendees: [{ id: 1, name: 'Jamie Baldwin' }, { id: 2, name: 'Daniel Sette' }, { id: 3, name: 'Outside Consultant' }] })
    const a = await run('meetingChat', { meetingId: 77 })
    expect(a.created).toBe(true)
    expect(F.db.board.meetings.find((m: any) => m.id === 77).chatGid).toBe(a.gid)
    const d = await run('init', {}, daniel)
    expect(d.groups.map((g: any) => g.n)).toEqual(['Corio board']); expect(d.msgs.find((m: any) => m.mt).mt.t).toBe('Corio board')
    const again = await run('meetingChat', { meetingId: '77' }, daniel)
    expect(again).toEqual({ gid: a.gid, created: false })
    await expect(run('meetingChat', { meetingId: 77 }, lewis)).rejects.toThrow(/not on this meeting/)
    await expect(run('meetingChat', { meetingId: 999 })).rejects.toThrow(/No such meeting/)
  })
  it('brings an attendee into the chat a meeting came from, and uses that chat', async () => {
    const { gid } = await run('newGroup', { name: 'Origin', ids: ['ds'] })
    await run('createMeeting', { gid, title: 'From chat', date: '2026-11-04', attendees: ['Daniel Sette'] })
    const id = F.db.board.meetings.find((m: any) => m.title === 'From chat').id
    const r = await run('meetingChat', { meetingId: id }, daniel)
    expect(r).toEqual({ gid, created: false })
  })
})

describe('tasks and project chats', () => {
  it('a chat task carries its project to the Workflow task', async () => {
    const { gid } = await run('newGroup', { name: 'P', ids: ['ds'] })
    await run('send', { gid, task: { title: 'Do it', own: 'ds', proj: 'Preston', wf: 1, ag: 0 } })
    expect(F.db.workflow.actions[0].project).toBe('Preston')
  })
  it('a message about a task is filed on the task as a comment and carries the task', async () => {
    const { gid } = await run('newGroup', { name: 'Preston', ids: ['ds'] })
    F.db.workflow.actions.push({ id: 't1', title: 'Facade package', project: 'Preston', owner: 'Daniel Sette', comments: [] })
    const { msg } = await run('send', { gid, body: 'Revised facade is with the architect', wf: 't1' })
    expect(msg.wf).toEqual({ id: 't1', t: 'Facade package', p: 'Preston' })
    expect(F.db.workflow.actions[0].comments[0]).toMatchObject({ by: 'Jamie Baldwin (chat)', text: 'Revised facade is with the architect' })
    const s = await run('init', {}, daniel)
    expect(s.msgs.find((m: any) => m.id === msg.id).wf.t).toBe('Facade package')
    await expect(run('send', { gid, body: 'x', wf: 'gone' })).rejects.toThrow(/no longer exists/)
  })
  it('puts the task team into the chat it is sent to, and leaves people already in it alone', async () => {
    const { gid } = await run('newGroup', { name: 'Anything', ids: ['ds'] })
    const r = await run('addTeamToGroup', { gid, names: ['Daniel Sette', 'Lewis Jin', 'Jamie Baldwin', 'Nobody Here'] })
    expect(r.added).toEqual(['Lewis Jin'])
    expect((await run('addTeamToGroup', { gid, names: ['Lewis Jin'] })).added).toEqual([])
    await expect(run('addTeamToGroup', { gid, names: ['Seth Bean'] }, lewis)).resolves.toBeTruthy()
    await expect(run('addTeamToGroup', { gid: 'nope', names: [] })).rejects.toThrow(/not in/)
  })
  it('lists my group chats, and makes or finds the project chat with the task team', async () => {
    const a = await run('groupForProject', { project: 'Preston', names: ['Daniel Sette', 'Jamie Baldwin'] })
    expect(a.existing).toBe(false)
    expect((await run('myGroups', {}, daniel)).groups.map((g: any) => g.n)).toEqual(['Preston'])
    const b = await run('groupForProject', { project: 'preston', names: ['Daniel Sette', 'Lewis Jin'] })
    expect(b.existing).toBe(true); expect(b.gid).toBe(a.gid); expect(b.added).toEqual(['Lewis Jin'])
    await expect(run('groupForProject', { project: 'Caloundra', names: [] })).rejects.toThrow(/team member/)
    await expect(run('groupForProject', { project: '', names: ['Daniel Sette'] })).rejects.toThrow(/project/)
  })
})

describe('tasks reach Workflow and the meeting', () => {
  it('a task is a message, a Workflow task under its owner, and an agenda item', async () => {
    const { gid } = await run('newGroup', { name: 'Belmont', ids: ['ds'] })
    const { msg } = await run('send', { gid, body: 'Please do this', task: { title: 'Three staging options', own: 'ds', due: '2026-11-02', pri: 'High', proj: 'Belmont Estate', wf: 1, ag: 1 } })
    expect(msg.task.wfId).toBeTruthy()
    const w = F.db.workflow.actions[0]
    expect(w.owner).toBe('Daniel Sette'); expect(w.dept).toBe('7even'); expect(w.priority).toBe('High'); expect(w.createdBy).toBe('Jamie Baldwin (chat)')
    expect(F.db.board.meetings[0].items[0].title).toBe('Three staging options')
  })
  it('ticking it done in chat ticks Workflow', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    const { msg } = await run('send', { gid, task: { title: 'Do it', own: 'ds', wf: 1, ag: 0 } })
    const r = await run('taskDone', { mid: msg.id, done: true }, daniel)
    expect(r.task.done).toBe(true); expect(F.db.workflow.actions[0].status).toBe('done')
    await run('taskDone', { mid: msg.id, done: false }, daniel); expect(F.db.workflow.actions[0].status).toBe('todo')
    await expect(run('taskDone', { mid: msg.id, done: true }, lewis)).rejects.toThrow(/not in that chat/)
  })
  it('a task without Workflow stays in the chat only, and a bad owner is refused', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    const { msg } = await run('send', { gid, task: { title: 'Just here', own: 'ds', wf: 0, ag: 0 } })
    expect(msg.task.wfId).toBeUndefined(); expect(F.db.workflow.actions.length).toBe(0)
    await expect(run('send', { gid, task: { title: 'x', own: 'nobody' } })).rejects.toThrow(/owner/)
    await expect(run('send', { gid, task: { title: '', own: 'ds' } })).rejects.toThrow(/title/)
  })
})

describe('files', () => {
  it('uploads are signed per chat, and only that chat can attach them', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    const up = await run('signUpload', { gid, name: 'Site plan (v2).pdf', type: 'application/pdf', size: 1000 })
    expect(up.path.startsWith(gid + '/')).toBe(true); expect(up.path).not.toMatch(/[()]/)
    await expect(run('signUpload', { gid, name: 'big', size: 60 * 1024 * 1024 })).rejects.toThrow(/50 MB/)
    await expect(run('signUpload', { gid, name: 'x', size: 10 }, lewis)).rejects.toThrow(/not in that chat/)
    await expect(run('send', { gid, body: 'x', files: [{ name: 'a', path: 'othergroup/a.pdf' }] })).rejects.toThrow(/does not belong/)
    await run('send', { gid, body: 'plan', files: [{ name: 'Site plan.pdf', type: 'application/pdf', size: 1000, path: up.path }] })
    const s = await run('init', {}, daniel)
    expect(s.msgs[0].files[0].url).toBe('https://dl/' + up.path)
  })
})

describe('alert test', () => {
  it('says what each device answered, forgets a gone one, and does nothing without the key', async () => {
    const subs = [{ endpoint: 'ok', p256dh: 'k', auth: 'a', ua: 'Mozilla iPhone' }, { endpoint: 'gone', p256dh: 'k', auth: 'a', ua: 'Macintosh' }, { endpoint: 'bad', p256dh: 'k', auth: 'a', ua: 'Windows' }]
    const removed: string[] = []
    const store = { async pushSubsFor() { return subs }, async deletePush(e: string) { removed.push(e) } }
    const wp = { async send(s: any) { if (s.endpoint === 'gone') throw Object.assign(new Error('x'), { statusCode: 410 }); if (s.endpoint === 'bad') throw Object.assign(new Error('x'), { statusCode: 403, body: 'VapidPkHashMismatch' }) } }
    const r = await C.run('pushTest', {}, jamie, { store, files: {}, kv: null, wp })
    expect(r.devices).toBe(3); expect(r.results.find((x: any) => x.device === 'iPhone').ok).toBe(true)
    expect(r.results.find((x: any) => x.device === 'Windows PC').why).toMatch(/VapidPkHash/); expect(removed).toEqual(['gone'])
    expect((await C.run('pushTest', {}, jamie, { store, files: {}, kv: null, wp: null })).enabled).toBe(false)
  })
})

describe('reactions, chat icons and wallpapers', () => {
  it('a reaction is a row that travels with the stream; turning it off is another row', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    const { msg } = await run('send', { gid, body: 'Good news' })
    const first = await run('init', {}, daniel)
    await run('react', { mid: msg.id, emoji: '👍' }, daniel)
    await run('react', { mid: msg.id, emoji: '😂' }, jamie)
    const p = await run('poll', { since: first.cursor }, jamie)
    expect(p.msgs.map((m: any) => [m.k, m.re, m.e, m.on, m.u])).toEqual([['react', msg.id, '👍', true, 'ds'], ['react', msg.id, '😂', true, 'jb']])
    expect(p.msgs[0].x).toBeUndefined()
    await run('react', { mid: msg.id, emoji: '👍', on: false }, daniel)
    const q = await run('poll', { since: p.cursor }, jamie)
    expect(q.msgs[0]).toMatchObject({ k: 'react', e: '👍', on: false })
  })
  it('only people in the chat react, only to real messages, only with an emoji', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    const { msg } = await run('send', { gid, body: 'hi' })
    await expect(run('react', { mid: msg.id, emoji: '👍' }, lewis)).rejects.toThrow(/not in that chat/)
    await expect(run('react', { mid: msg.id, emoji: 'hello' }, daniel)).rejects.toThrow(/not an emoji/)
    await expect(run('react', { mid: msg.id, emoji: '' }, daniel)).rejects.toThrow(/not an emoji/)
    await expect(run('react', { mid: 9999, emoji: '👍' }, daniel)).rejects.toThrow(/No such message/)
    const r = await run('react', { mid: msg.id, emoji: '🇦🇺' }, daniel); expect(r.ok).toBe(true)
    await expect(run('react', { mid: r.id, emoji: '👍' }, daniel)).rejects.toThrow(/No such message/)
  })
  it('the icon belongs to the chat: everyone sees the newest one, direct messages have none', async () => {
    const { gid } = await run('newGroup', { name: 'Hotels', ids: ['ds'] })
    await run('setIcon', { gid, icon: { id: 'hotels', tile: 'graphite' } })
    await run('setIcon', { gid, icon: { id: 'p7', tile: 'silver' } }, daniel)
    expect((await run('init', {}, jamie)).style.icons[gid]).toEqual({ id: 'p7', tile: 'silver' })
    expect((await run('init', {}, daniel)).style.icons[gid]).toEqual({ id: 'p7', tile: 'silver' })
    expect((await run('init', {}, jamie)).msgs.some((m: any) => m.k === 'icon')).toBe(false)   // not part of the first-load history
    const img = 'data:image/jpeg;base64,/9j/4AAQ'
    expect((await run('setIcon', { gid, icon: { img } })).icon).toEqual({ img })
    await expect(run('setIcon', { gid, icon: { img: 'data:image/jpeg;base64,' + 'A'.repeat(30000) } })).rejects.toThrow(/too large/)
    await expect(run('setIcon', { gid, icon: { img: 'https://evil/x.png' } })).rejects.toThrow(/too large|not one of/)
    await expect(run('setIcon', { gid, icon: { id: 'nope', tile: 'gold' } })).rejects.toThrow(/not one of/)
    await expect(run('setIcon', { gid, icon: { id: 'hotels', tile: 'pink' } })).rejects.toThrow(/not one of/)
    await expect(run('setIcon', { gid, icon: { id: 'hotels', tile: 'gold' } }, lewis)).rejects.toThrow(/not in that chat/)
    const dm = await run('newGroup', { ids: ['ds'] })
    await expect(run('setIcon', { gid: dm.gid, icon: { id: 'hotels', tile: 'gold' } })).rejects.toThrow(/direct message/)
  })
  it('plain pastel colours keep their brightness: darker or lighter, within limits', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    await run('setWall', { gid, wall: { id: 'color', color: '#f4d9de', dark: false, dim: 0, blur: 0, lite: 30 } })
    expect((await run('init', {}, jamie)).style.walls[gid]).toEqual({ id: 'color', color: '#f4d9de', dark: false, dim: 0, blur: 0, lite: 30 })
    await run('setWall', { gid, wall: { id: 'color', color: '#f4d9de', dark: false, lite: 999, dim: 999 } })
    expect((await run('init', {}, jamie)).style.walls[gid]).toEqual({ id: 'color', color: '#f4d9de', dark: false, dim: 80, lite: 60 })
    await run('setWall', { gid, wall: { id: 'atrg', lite: 'bright' } })
    expect((await run('init', {}, jamie)).style.walls[gid]).toEqual({ id: 'atrg' })
  })
  it('a wallpaper is one person\'s own: it follows them, and nobody else ever receives it', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    await run('send', { gid, body: 'first' })
    await run('setWall', { gid, wall: { id: 'hori', dim: 20, blur: 99, acc: 'gold', junk: 1 } })
    await run('setWall', { gid, wall: { id: 'color', color: '#2d4a3a', dark: true } })
    await run('setWall', { gid, wall: { id: 'custom', img: 'data:big', dark: false } })
    const mine = await run('init', {}, jamie)
    expect(mine.style.walls[gid]).toEqual({ id: 'custom', dark: false })
    expect((await run('init', {}, daniel)).style.walls[gid]).toBeUndefined()
    await run('setWall', { gid, wall: { id: 'hori', dim: 20, blur: 99, acc: 'gold' } })
    expect((await run('init', {}, jamie)).style.walls[gid]).toEqual({ id: 'hori', dim: 20, blur: 14, acc: 'gold' })
    const first = await run('init', {}, daniel)
    await run('setWall', { gid, wall: { id: 'ent' } })
    expect((await run('poll', { since: first.cursor }, daniel)).msgs.some((m: any) => m.k === 'wall')).toBe(false)
    expect((await run('poll', { since: first.cursor }, jamie)).msgs.some((m: any) => m.k === 'wall')).toBe(true)
    await expect(run('setWall', { gid, wall: { id: 'color', color: 'red' } })).rejects.toThrow(/colour/)
    await expect(run('setWall', { gid, wall: { id: 'moon' } })).rejects.toThrow(/not one of/)
    await expect(run('setWall', { gid, wall: { id: 'hori' } }, lewis)).rejects.toThrow(/not in that chat/)
  })
  it('shows who has read up to where, for Seen', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    const { msg } = await run('send', { gid, body: 'hello' })
    await run('read', { gid, upto: msg.id }, daniel)
    expect((await run('init', {}, jamie)).groups[0].rd).toEqual({ jb: msg.id, ds: msg.id })
  })
})

describe('a screen from before reactions existed', () => {
  it('is never sent rows it cannot read', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    const { msg } = await run('send', { gid, body: 'hello' })
    await run('react', { mid: msg.id, emoji: '👍' }, daniel)
    await run('setIcon', { gid, icon: { id: 'hotels', tile: 'gold' } })
    const old = await C.run('poll', { since: 0 }, jamie, F.deps)
    expect(old.msgs.every((m: any) => !m.k)).toBe(true); expect(old.msgs.length).toBe(1)
    const now = await C.run('poll', { since: 0, v: 2 }, jamie, F.deps)
    expect(now.msgs.some((m: any) => m.k === 'react')).toBe(true)
  })
})

describe('the HAAVN BLACK icons and wallpapers', () => {
  it('are accepted, and the old ones still are', async () => {
    const { gid } = await run('newGroup', { name: 'BLACK', ids: ['ds'] })
    expect((await run('setIcon', { gid, icon: { id: 'blk', tile: 'glass' } })).icon).toEqual({ id: 'blk', tile: 'glass' })
    expect((await run('setIcon', { gid, icon: { id: 'blkw', tile: 'frost' } })).icon).toEqual({ id: 'blkw', tile: 'frost' })
    for (const id of ['blkg', 'blkw', 'blks', 'blkn', 'hori', 'p7', 'atrg', 'atrl']) expect((await run('setWall', { gid, wall: { id } })).wall).toEqual({ id })
  })
})

describe('people\'s pictures and the new bubble colours', () => {
  it('a picture is uploaded to my own path, set, announced to my chats, and signed for everyone', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    await run('send', { gid, body: 'hello' })
    const first = await run('init', {}, daniel)
    const up = await run('signAvatar', {})
    expect(up.path).toMatch(/^avatars\/jb-\d+\.jpg$/); expect(up.uploadUrl).toContain(up.path)
    await expect(run('setAvatar', { path: up.path })).rejects.toThrow(/did not arrive/)
    await expect(run('setAvatar', { path: 'avatars/ds-1.jpg' })).rejects.toThrow(/not yours/)
    await expect(run('setAvatar', { path: '../x.jpg' })).rejects.toThrow(/not yours/)
    F.objs.push({ name: up.path.slice(8), metadata: { size: 20000 } })
    expect((await run('setAvatar', { path: up.path })).ok).toBe(true)
    expect((await run('init', {}, daniel)).avatars).toEqual({ jb: 'https://dl/' + up.path })
    const p = await run('poll', { since: first.cursor }, daniel)
    expect(p.msgs.map((m: any) => [m.k, m.u])).toEqual([['avatar', 'jb']])
    expect(gid).toBeTruthy()
  })
  it('a newer picture replaces the older one, a huge one is refused, and removing clears it', async () => {
    await run('newGroup', { name: 'G', ids: ['ds'] })
    F.objs.push({ name: 'jb-100.jpg', metadata: { size: 1000 } })
    F.objs.push({ name: 'jb-200.jpg', metadata: { size: 1000 } })
    await run('setAvatar', { path: 'avatars/jb-200.jpg' })
    expect(F.objs.map((o: any) => o.name)).toEqual(['jb-200.jpg'])
    F.objs.push({ name: 'jb-300.jpg', metadata: { size: 5 * 1024 * 1024 } })
    await expect(run('setAvatar', { path: 'avatars/jb-300.jpg' })).rejects.toThrow(/too large/)
    expect(F.objs.map((o: any) => o.name)).toEqual(['jb-200.jpg'])
    await run('clearAvatar', {})
    expect(F.objs.length).toBe(0)
    expect((await run('avatars', {})).avatars).toEqual({})
  })
  it('accepts the new bubble colours and rejects anything else', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds'] })
    for (const acc of ['black', 'crystal', 'blue', 'sage', 'sagedeep', 'grey', 'graphite']) expect((await run('setWall', { gid, wall: { id: 'dvmist', acc } })).wall).toEqual({ id: 'dvmist', acc })
    expect((await run('setWall', { gid, wall: { id: 'dvcoral', acc: 'blue', tacc: 'crystal' } })).wall).toEqual({ id: 'dvcoral', acc: 'blue', tacc: 'crystal' })
    expect((await run('setWall', { gid, wall: { id: 'hori', acc: 'hotpink', tacc: 'neon' } })).wall).toEqual({ id: 'hori' })
    expect((await run('setIcon', { gid, icon: { id: 'haavnw', tile: 'crystal' } })).icon).toEqual({ id: 'haavnw', tile: 'crystal' })
    expect((await run('setIcon', { gid, icon: { id: 'blk', tile: 'bluegl' } })).icon).toEqual({ id: 'blk', tile: 'bluegl' })
    expect((await run('setIcon', { gid, icon: { id: 'blk', tile: 'sagegl' } })).icon).toEqual({ id: 'blk', tile: 'sagegl' })
  })
})

describe('polls and icon shapes', () => {
  const mk = async () => { const { gid } = await run('newGroup', { name: 'G', ids: ['ds', 'lj'] }); return gid }
  it('a poll is a message with its answers, and needs a question and two answers', async () => {
    const gid = await mk()
    await expect(run('createPoll', { gid, question: '', options: ['Yes', 'No'] })).rejects.toThrow(/question/)
    await expect(run('createPoll', { gid, question: 'Monday?', options: ['Yes'] })).rejects.toThrow(/two answers/)
    await expect(run('createPoll', { gid, question: 'Monday?', options: ['Yes', 'No'] }, me('zz', 'Outsider'))).rejects.toThrow(/not in that chat/)
    const { msg } = await run('createPoll', { gid, question: ' Who is coming Monday? ', options: ['Yes', ' No ', '', 'Maybe'], multi: false })
    expect(msg).toMatchObject({ x: 'Who is coming Monday?', poll: { opts: ['Yes', 'No', 'Maybe'], multi: false } }); expect(msg.task).toBeUndefined()
    const s = await run('init', {}, daniel)
    expect(s.msgs.find((m: any) => m.id === msg.id).poll.opts.length).toBe(3)
  })
  it('votes: one answer for a single poll, several for a multiple poll, the newest wins, empty takes it back', async () => {
    const gid = await mk()
    const one = (await run('createPoll', { gid, question: 'Q', options: ['A', 'B', 'C'] })).msg
    const many = (await run('createPoll', { gid, question: 'Q2', options: ['A', 'B', 'C'], multi: true })).msg
    const first = await run('init', {}, lewis)
    await expect(run('vote', { mid: one.id, choices: [0, 1] }, daniel)).rejects.toThrow(/one answer/)
    await run('vote', { mid: one.id, choices: [1, 9, -1] }, daniel)
    await run('vote', { mid: many.id, choices: [2, 0, 0] }, daniel)
    await run('vote', { mid: one.id, choices: [] }, daniel)
    const p = await run('poll', { since: first.cursor }, lewis)
    expect(p.msgs.map((m: any) => [m.k, m.pm, m.c, m.u])).toEqual([['vote', one.id, [1], 'ds'], ['vote', many.id, [0, 2], 'ds'], ['vote', one.id, [], 'ds']])
    await expect(run('vote', { mid: one.id, choices: [0] }, me('zz', 'Outsider'))).rejects.toThrow(/not in that chat/)
    const t = (await run('send', { gid, body: 'plain' })).msg
    await expect(run('vote', { mid: t.id, choices: [0] }, daniel)).rejects.toThrow(/No such poll/)
  })
  it('only the person who asked edits it: reword, add answers, change several or one, close and reopen; answers are never removed', async () => {
    const gid = await mk()
    const { msg } = await run('createPoll', { gid, question: 'Venue?', options: ['Office', 'Cafe'] })
    await expect(run('editPoll', { mid: msg.id, question: 'Hijack' }, daniel)).rejects.toThrow(/Only the person who asked/)
    const e = await run('editPoll', { mid: msg.id, question: 'Venue for Monday?', options: ['Office', 'Cafe', 'Site'], multi: true })
    expect(e.def).toEqual({ q: 'Venue for Monday?', opts: ['Office', 'Cafe', 'Site'], multi: true, closed: false, theme: null })
    await expect(run('editPoll', { mid: msg.id, options: ['Office', 'Cafe'] })).rejects.toThrow(/not removed/)
    await run('vote', { mid: msg.id, choices: [2, 0] }, daniel)
    await run('editPoll', { mid: msg.id, closed: true })
    await expect(run('vote', { mid: msg.id, choices: [1] }, daniel)).rejects.toThrow(/closed/)
    expect((await run('editPoll', { mid: msg.id, closed: false })).def.closed).toBe(false)
    expect((await run('vote', { mid: msg.id, choices: [1] }, daniel)).ok).toBe(true)
    const p = await run('poll', { since: 0 }, lewis)
    expect(p.msgs.filter((m: any) => m.k === 'pollup').length).toBe(3)
  })
  it('a screen from before polls sees the question as a message and never the vote rows', async () => {
    const gid = await mk()
    const { msg } = await run('createPoll', { gid, question: 'Q', options: ['A', 'B'] })
    await run('vote', { mid: msg.id, choices: [0] }, daniel)
    const old = await C.run('init', {}, lewis, F.deps)
    expect(old.msgs.map((m: any) => m.x)).toEqual(['Q']); expect(old.msgs.every((m: any) => !m.k)).toBe(true)
  })
  it('icons keep their shape: round, soft square or wide, and nothing else', async () => {
    const gid = await mk()
    for (const shape of ['round', 'square', 'wide']) expect((await run('setIcon', { gid, icon: { id: 'wm7', tile: 'black', shape } })).icon).toEqual({ id: 'wm7', tile: 'black', shape })
    expect((await run('setIcon', { gid, icon: { id: 'wm7', tile: 'black', shape: 'triangle' } })).icon).toEqual({ id: 'wm7', tile: 'black' })
    expect((await run('setIcon', { gid, icon: { img: 'data:image/jpeg;base64,/9j/4AAQ', shape: 'round' } })).icon).toEqual({ img: 'data:image/jpeg;base64,/9j/4AAQ', shape: 'round' })
  })

  it('a chat can carry your own text as its icon, like JB or St Village', async () => {
    const gid = await mk()
    expect((await run('setIcon', { gid, icon: { txt: 'JB', tile: 'gold' } })).icon).toEqual({ txt: 'JB', tile: 'gold' })
    expect((await run('setIcon', { gid, icon: { txt: '  St   Village ', tile: 'graphite', shape: 'wide' } })).icon).toEqual({ txt: 'St Village', tile: 'graphite', shape: 'wide' })
    expect((await run('setIcon', { gid, icon: { txt: 'St Village', tile: 'graphite', shape: 'triangle' } })).icon).toEqual({ txt: 'St Village', tile: 'graphite' })
    expect((await run('setIcon', { gid, icon: { txt: 'Hi\n\tthere', tile: 'sage' } })).icon).toEqual({ txt: 'Hi there', tile: 'sage' })
    expect((await run('setIcon', { gid, icon: { txt: 'A'.repeat(14), tile: 'lime' } })).icon.txt).toHaveLength(14)
    await expect(run('setIcon', { gid, icon: { txt: 'A'.repeat(15), tile: 'lime' } })).rejects.toThrow(/1 to 14/)
    await expect(run('setIcon', { gid, icon: { txt: '   ', tile: 'lime' } })).rejects.toThrow(/1 to 14/)
    await expect(run('setIcon', { gid, icon: { txt: 'JB', tile: 'pink' } })).rejects.toThrow(/not one of/)
    expect((await run('init', {}, jamie)).style.icons[gid]).toEqual({ txt: 'A'.repeat(14), tile: 'lime' })
  })
})

describe('direct messages without a group', () => {
  it('starting one shows it to me at once and to them only when there is a message', async () => {
    const { gid } = await run('newGroup', { ids: ['ds'] })
    expect((await run('init', {}, jamie)).groups.map((g: any) => g.id)).toEqual([gid])
    expect((await run('init', {}, daniel)).groups).toEqual([])
    await run('send', { gid, body: 'Quick one, Daniel' })
    const d = await run('init', {}, daniel)
    expect(d.groups.map((g: any) => [g.id, g.dm, g.m.sort()])).toEqual([[gid, true, ['ds', 'jb']]])
    expect(d.msgs.map((m: any) => m.x)).toEqual(['Quick one, Daniel'])
  })
  it('starting it again opens the same one, and brings back a conversation they took off their list', async () => {
    const a = await run('newGroup', { ids: ['ds'] })
    await run('send', { gid: a.gid, body: 'hi' })
    await run('setMine', { gid: a.gid, hidden: true }, daniel)
    expect((await run('init', {}, daniel)).groups).toEqual([])
    const b = await run('newGroup', { ids: ['jb'] }, daniel)
    expect(b).toEqual({ gid: a.gid, existing: true })
    expect((await run('init', {}, daniel)).groups.length).toBe(1)
    await run('setMine', { gid: a.gid, hidden: true }, daniel)
    await run('send', { gid: a.gid, body: 'are you there' })
    expect((await run('init', {}, daniel)).groups.length).toBe(1)
  })
  it('a poll in a direct message also puts it in front of the other person', async () => {
    const { gid } = await run('newGroup', { ids: ['lj'] })
    await run('createPoll', { gid, question: 'Lunch?', options: ['Yes', 'No'] })
    expect((await run('init', {}, lewis)).groups.length).toBe(1)
  })
  it('a group is never hidden from the people in it', async () => {
    const { gid } = await run('newGroup', { name: 'G', ids: ['ds', 'lj'] })
    expect((await run('init', {}, daniel)).groups.map((g: any) => g.id)).toEqual([gid])
  })
})

describe('poll backgrounds', () => {
  const mk = async () => (await run('newGroup', { name: 'G', ids: ['ds'] })).gid
  it('a poll can carry PARTY, CHILL or ROCK, and anything else is a normal poll', async () => {
    const gid = await mk()
    for (const theme of ['party', 'chill', 'rock']) expect((await run('createPoll', { gid, question: 'Q', options: ['A', 'B'], theme })).msg.poll).toEqual({ opts: ['A', 'B'], multi: false, theme })
    expect((await run('createPoll', { gid, question: 'Q', options: ['A', 'B'], theme: 'neon' })).msg.poll).toEqual({ opts: ['A', 'B'], multi: false })
    expect((await run('createPoll', { gid, question: 'Q', options: ['A', 'B'] })).msg.poll.theme).toBeUndefined()
  })
  it('only the person who asked changes or removes the background, with or without other edits', async () => {
    const gid = await mk()
    const { msg } = await run('createPoll', { gid, question: 'Q', options: ['A', 'B'], theme: 'party' })
    await expect(run('editPoll', { mid: msg.id, theme: 'rock' }, daniel)).rejects.toThrow(/Only the person who asked/)
    expect((await run('editPoll', { mid: msg.id, theme: 'rock' })).def.theme).toBe('rock')
    expect((await run('editPoll', { mid: msg.id, question: 'Q2' })).def).toMatchObject({ q: 'Q2', theme: 'rock' })
    expect((await run('editPoll', { mid: msg.id, theme: null })).def.theme).toBeNull()
    expect((await run('editPoll', { mid: msg.id, theme: 'nope' })).def.theme).toBeNull()
    const p = await run('poll', { since: 0 }, daniel)
    expect(p.msgs.filter((m: any) => m.k === 'pollup').map((m: any) => m.def.theme)).toEqual(['rock', 'rock', null, null])
  })
})

describe('my calendar', () => {
  it('shows the person\'s own Outlook, trying the other company address when the first is not found', async () => {
    F.cal.missing.add('jamie@7even.au')
    const r = await run('myCalendar', { days: 14 })
    expect(r.mailbox).toBe('jamie@haavn.au'); expect(r.events[0]).toMatchObject({ subject: 'Weekly meeting', joinUrl: 'https://teams.example/j' })
    expect(F.cal.asked).toEqual(['jamie@7even.au', 'jamie@haavn.au'])
    F.cal.asked.length = 0
    expect((await run('myCalendar', {})).mailbox).toBe('jamie@haavn.au'); expect(F.cal.asked).toEqual(['jamie@haavn.au'])   // remembered
  })
  it('only ever reads the caller\'s own mailbox, and says plainly when it cannot', async () => {
    await run('myCalendar', {}, daniel)
    expect(F.cal.asked.every((a: string) => a.startsWith('daniel@'))).toBe(true)
    F.cal.forbid = true
    await expect(run('myCalendar', {}, lewis)).rejects.toThrow(/not allowed to use your calendar/)
    F.cal.forbid = false; F.cal.configured = false
    await expect(run('myCalendar', {}, lewis)).rejects.toThrow(/not connected/)
  })
  it('adds a meeting to their own calendar with a Teams link and the invited people', async () => {
    const r = await run('createCalEvent', { title: '  Belmont   catch up ', date: '2026-10-29', time: '14:30', durationMin: 45, attendees: ['dan@example.com', 'bad', 'DAN@example.com', 'lewis@7even.au'], note: 'Staging options' }, daniel)
    expect(r).toMatchObject({ ok: true, id: 'new1', joinUrl: 'https://teams.example/new', people: 2 })
    const m = F.cal.made[0]; expect(m.mb).toMatch(/^daniel@/); expect(m.m).toMatchObject({ title: 'Belmont catch up', date: '2026-10-29', time: '14:30' })
    expect(m.o).toMatchObject({ minutes: 45, emails: ['dan@example.com', 'lewis@7even.au'], teams: true })
    await run('createCalEvent', { title: 'No Teams', date: '2026-10-29', teams: false }, daniel); expect(F.cal.made[1].o.teams).toBe(false)
    await expect(run('createCalEvent', { title: '', date: '2026-10-29' })).rejects.toThrow(/title/)
    await expect(run('createCalEvent', { title: 'x', date: 'soon' })).rejects.toThrow(/date/)
    expect((await run('createCalEvent', { title: 'x', date: '2026-10-29', durationMin: 99999 })).ok).toBe(true); expect(F.cal.made[2].o.minutes).toBe(480)
  })
})

describe('voice typing from the phone\'s microphone', () => {
  it('hands a signed-in person a short-lived speech token, and says plainly when it cannot', async () => {
    expect(await run('speechToken', {})).toEqual({ token: 'tok123', region: 'australiaeast' })
    F.speech.fail = true
    await expect(run('speechToken', {})).rejects.toThrow(/could not start/)
    F.speech.fail = 401
    await expect(run('speechToken', {})).rejects.toThrow(/key renewed/)
    F.speech.fail = false; F.speech.configured = false
    await expect(run('speechToken', {})).rejects.toThrow(/not set up/)
  })
})

describe('outside people', () => {
  const boss = { sub: 'jb', name: 'Jamie Baldwin', role: 'admin', emails: ['jamie@7even.au'] }
  const addOutside = (name = 'Pat Planner', email = 'pat@consult.com.au') => run('outsideAdd', { name, email }, boss)
  const asOutside = () => { const p = O.list()[0]; return { sub: p.id, name: p.name, role: 'external', emails: [p.email] } }

  it('a director adds them, they can be put in a chat, and they see only that chat and the people in it', async () => {
    const r = await addOutside(); expect(r.people).toHaveLength(1)
    const pat = asOutside()
    const { gid } = await run('newGroup', { name: 'Fit-out', ids: [pat.sub, 'ds'] }, boss)
    await run('newGroup', { name: 'Directors only', ids: ['ds', 'lj'] }, boss)
    const s = await run('init', {}, pat)
    expect(s.groups.map((g: any) => g.n)).toEqual(['Fit-out'])
    expect(s.people.map((p: any) => p.id).sort()).toEqual([pat.sub, 'ds', 'jb'].sort())
    await run('send', { gid, body: 'Plans attached' }, pat)
  })

  it('only a director adds or removes, and a removed person is locked out at once', async () => {
    await expect(run('outsideAdd', { name: 'X', email: 'x@y.com' }, jamie)).rejects.toThrow(/director/)
    await addOutside(); const pat = asOutside()
    await expect(run('outsideList', {}, pat)).rejects.toThrow(/not available|director/)
    await run('outsideRemove', { email: 'pat@consult.com.au' }, boss)
    await expect(run('init', {}, pat)).rejects.toThrow(/signin/)
  })

  it('a removed person fails the session check everywhere, a director and the team always pass', async () => {
    await addOutside(); const pat = asOutside()
    expect(await O.stillAllowed({ sub: pat.sub }, F.deps.kv)).toBe(true)
    await run('outsideRemove', { email: 'pat@consult.com.au' }, boss)
    expect(await O.stillAllowed({ sub: pat.sub }, F.deps.kv)).toBe(false)
    expect(await O.stillAllowed({ sub: 'jb' }, F.deps.kv)).toBe(true)
  })

  it('cannot reach tasks, meetings or the rest of the team, and cannot invite by email', async () => {
    await addOutside(); const pat = asOutside()
    const { gid } = await run('newGroup', { name: 'Fit-out', ids: [pat.sub, 'ds'] }, boss)
    await expect(run('send', { gid, body: 'x', task: { title: 't', own: 'ds' } }, pat)).rejects.toThrow(/not available/)
    await expect(run('createMeeting', { gid }, pat)).rejects.toThrow(/not available/)
    await expect(run('addTeamToGroup', { gid }, pat)).rejects.toThrow(/not available/)
    const r = await run('addMembers', { gid, ids: ['lj'], ext: ['someone@else.com'] }, pat)
    expect(r.added).toEqual([])
  })

  it('email invites made earlier move onto the person when they are added', async () => {
    const { gid } = await run('newGroup', { name: 'Fit-out', ids: ['ds'], ext: ['pat@consult.com.au'] }, boss)
    const r = await addOutside()
    expect(r.moved).toBe(1)
    expect(F.t.members.some((m: any) => m.group_id === gid && m.member === 'x:pat@consult.com.au')).toBe(false)
    expect(F.t.members.some((m: any) => m.group_id === gid && m.member === O.list()[0].id)).toBe(true)
  })

  it('refuses a team address and a bad email', async () => {
    await expect(run('outsideAdd', { name: 'Dan', email: 'daniel@7even.au' }, boss)).rejects.toThrow(/already/)
    await expect(run('outsideAdd', { name: 'Dan', email: 'nope' }, boss)).rejects.toThrow(/email/)
  })
})

describe('My Tasks, quick add and search', () => {
  it('quick add with no project lands in a private My tasks group that is not in the chat list, and My Tasks reads it back', async () => {
    const r = await run('taskAdd', { title: 'Call the surveyor', own: 'jb', due: '2026-11-02', pri: 'High' })
    expect(r.task.title).toBe('Call the surveyor'); expect(r.task.wf).toBe(1)
    expect(F.db.workflow.actions).toHaveLength(1)
    const s = await run('init', {}); expect(s.groups).toHaveLength(0)
    const t = (await run('myTasks', {})).tasks
    expect(t).toHaveLength(1); expect(t[0]).toMatchObject({ title: 'Call the surveyor', own: 'jb', by: 'jb', due: '2026-11-02', pri: 'High', done: false, wf: true, g: 'My tasks' })
  })

  it('a task for someone else with a project is filed to the project chat, and shows for both people', async () => {
    const { gid } = await run('newGroup', { name: 'Belmont', ids: ['ds'], proj: 'Belmont Estate', priv: true })
    const r = await run('taskAdd', { title: 'Send the survey', own: 'ds', proj: 'Belmont Estate' })
    expect(r.gid).toBe(gid)
    expect((await run('myTasks', {})).tasks.map((x: any) => x.title)).toEqual(['Send the survey'])
    expect((await run('myTasks', {}, daniel)).tasks.map((x: any) => x.own)).toEqual(['ds'])
    await run('taskDone', { mid: r.msg.id, done: true }, daniel)
    expect((await run('myTasks', {})).tasks).toHaveLength(0)
    expect((await run('myTasks', { include: 'all' })).tasks[0].done).toBe(true)
  })

  it('a project with no chat yet gets a private one; no project for another person lands in your direct message', async () => {
    const r = await run('taskAdd', { title: 'Draft term sheet', own: 'lj', proj: 'Corio Quarter' })
    const s = await run('init', {}); expect(s.groups.map((g: any) => g.n)).toEqual(['Corio Quarter'])
    expect(r.task.proj).toBe('Corio Quarter')
    const d = await run('taskAdd', { title: 'Ring me', own: 'ds' })
    expect((await run('init', {})).groups.some((g: any) => g.dm && g.id === d.gid)).toBe(true)
  })

  it('searches messages, task titles, file names, notes and meetings, only in my own chats, newest first and in pages', async () => {
    const { gid } = await run('newGroup', { name: 'Belmont', ids: ['ds'] })
    const other = await run('newGroup', { name: 'Directors', ids: ['lj'] }, daniel)
    await run('send', { gid, body: 'The car park layout needs a decision' })
    await run('send', { gid: other.gid, body: 'car park secret' }, daniel)
    await run('taskAdd', { title: 'Check car park levels', own: 'jb', proj: 'Belmont' })
    await run('send', { gid, body: 'plans', files: [{ name: 'Car park plan.pdf', type: 'application/pdf', size: 10, path: gid + '/a.pdf' }] })
    await run('noteSave', { title: 'Car park thoughts', body: 'x' })
    const r = await run('search', { q: 'car park' })
    expect(r.results.map((x: any) => x.kind).sort()).toEqual(['file', 'message', 'note', 'task'].sort())
    expect(r.results.every((x: any) => x.g !== 'Directors')).toBe(true)
    expect(r.results.find((x: any) => x.kind === 'file').url).toMatch(/^https:\/\/dl\//)
    expect((await run('search', { q: 'car park', limit: 2 })).next).toBe(2)
    expect((await run('search', { q: 'x' })).results).toEqual([])
  })
})
