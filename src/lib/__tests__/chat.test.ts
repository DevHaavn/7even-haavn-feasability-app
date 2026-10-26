import { describe, it, expect, beforeEach } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const C = require('../../../api/_utils/chat.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const B = require('../../../api/_utils/blaze.js')

const me = (sub: string, name: string) => ({ sub, name, role: 'staff', emails: [sub + '@x'] })
const jamie = me('jb', 'Jamie Baldwin'), daniel = me('ds', 'Daniel Sette'), lewis = me('lj', 'Lewis Jin')

function fake() {
  const t = { groups: [] as any[], members: [] as any[], msgs: [] as any[], seq: 0, gseq: 0 }
  const store = {
    async memberRowsFor(m: string) { return t.members.filter((r) => r.member === m).map((r) => ({ last_read: 0, muted: false, archived: false, hidden: false, ...r })) },
    async groupsByIds(ids: string[]) { return t.groups.filter((g) => ids.includes(g.id)) },
    async membersByGroups(ids: string[]) { return t.members.filter((r) => ids.includes(r.group_id)).map((r) => ({ last_read: 0, muted: false, archived: false, hidden: false, ...r })) },
    async messagesFor(ids: string[], o: any) { return t.msgs.filter((m) => ids.includes(m.group_id) && m.id > (o.after || 0)) },
    async insertGroup(g: any) { const r = { id: 'g' + ++t.gseq, ...g }; t.groups.push(r); return r },
    async insertMembers(rows: any[]) { rows.forEach((r) => { if (!t.members.some((x) => x.group_id === r.group_id && x.member === r.member)) t.members.push({ last_read: 0, muted: false, archived: false, hidden: false, ...r }) }) },
    async updateMember(g: string, m: string, p: any) { Object.assign(t.members.find((x) => x.group_id === g && x.member === m), p) },
    async deleteMember(g: string, m: string) { t.members = t.members.filter((x) => !(x.group_id === g && x.member === m)) },
    async insertMessage(m: any) { const r = { id: ++t.seq, created_at: new Date().toISOString(), ...m }; t.msgs.push(r); return r },
    async getMessage(id: number) { return t.msgs.find((m) => m.id === Number(id)) || null },
    async updateMessage(id: number, p: any) { Object.assign(t.msgs.find((m) => m.id === Number(id)), p) },
    async deleteGroup(id: string) { t.groups = t.groups.filter((g) => g.id !== id); t.members = t.members.filter((m) => m.group_id !== id); t.msgs = t.msgs.filter((m) => m.group_id !== id) },
    async findDm(key: string) { return t.groups.find((g) => g.dm_key === key) || null },
    async unarchiveOthers(g: string, me: string) { t.members.filter((r) => r.group_id === g && r.member !== me).forEach((r) => { r.archived = false }) },
    async filePaths(g: string) { return t.msgs.filter((m) => m.group_id === g).flatMap((m) => (m.files || []).map((f: any) => f.path)) },
  }
  const files = { async signUpload(p: string) { return { uploadUrl: 'https://up/' + p } }, async signDownloads(ps: string[]) { return Object.fromEntries(ps.map((p) => [p, 'https://dl/' + p])) }, async remove() {} }
  const db: any = { workflow: { seq: 1, actions: [] }, board: { meetings: [{ id: 1, kind: 'weekly', date: '2099-01-01', closed: false, items: [], attendees: [] }] } }
  const kv = { async update(k: string, fn: any) { const key = k === B.KEYS.workflow ? 'workflow' : 'board'; const { next, result } = fn(db[key]); db[key] = next; return result } }
  return { t, deps: { store, files, kv }, db }
}
let F: ReturnType<typeof fake>
const run = (a: string, args: any, who = jamie) => C.run(a, args, who, F.deps)
beforeEach(() => { F = fake() })

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
