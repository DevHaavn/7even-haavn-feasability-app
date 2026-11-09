import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const B = require('../../../api/_utils/blaze.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AC = require('../../../api/_utils/agentChat.js')

// Chats: g1 a group Daniel is in, g2 a direct message Daniel/Jamie, g3 a chat Daniel removed from his list, g4 Jamie + Mike only (Daniel is not in it).
const members = [
  { group_id: 'g1', member: 'ds' }, { group_id: 'g1', member: 'jb' }, { group_id: 'g1', member: 'mf' },
  { group_id: 'g2', member: 'ds' }, { group_id: 'g2', member: 'jb' },
  { group_id: 'g3', member: 'ds', hidden: true }, { group_id: 'g3', member: 'jb' },
  { group_id: 'g4', member: 'jb' }, { group_id: 'g4', member: 'mf' },
]
const groups = [
  { id: 'g1', name: 'Belmont Estate', is_dm: false, project: 'Belmont' }, { id: 'g2', name: 'dm', is_dm: true },
  { id: 'g3', name: 'Old chat', is_dm: false }, { id: 'g4', name: 'Sales only', is_dm: false },
]
const T = (n: number) => new Date(Date.UTC(2026, 10, 6, 0, n)).toISOString()
const messages = [
  { id: 1, group_id: 'g1', sender: 'jb', kind: 'text', body: 'Church package is the problem.', created_at: T(1), files: [] },
  { id: 2, group_id: 'g1', sender: 'ds', kind: 'text', body: 'Staging options draft attached.', created_at: T(2), files: [{ name: 'staging.pdf', type: 'application/pdf', size: 822000, path: 'g1/a/staging.pdf' }] },
  { id: 3, group_id: 'g1', sender: 'jb', kind: 'react', body: '👍', created_at: T(3), task: { re: 2, on: true }, files: [] },
  { id: 4, group_id: 'g1', sender: 'jb', kind: 'task', body: '', created_at: T(4), task: { title: 'Three staging options on one page', owner: 'Daniel Sette', due: '2026-11-10', priority: 'High', done: false }, files: [] },
  { id: 5, group_id: 'g1', sender: 'mf', kind: 'text', body: 'Said something I deleted.', created_at: T(5), deleted_at: T(6), files: [] },
  { id: 6, group_id: 'g2', sender: 'jb', kind: 'text', body: 'Call me after lunch.', created_at: T(7), files: [] },
  { id: 7, group_id: 'g3', sender: 'jb', kind: 'text', body: 'Hidden chat message.', created_at: T(8), files: [] },
  { id: 8, group_id: 'g4', sender: 'mf', kind: 'text', body: 'Private sales chat Daniel is not in.', created_at: T(9), files: [] },
]

// A chat store that only knows how to READ. Anything else (a write, a mark-as-read) throws, so the tests prove nothing is changed.
function fake() {
  const calls: string[] = []
  const base: any = {
    memberRowsFor: async (m: string) => { calls.push('memberRowsFor'); return members.filter((r) => r.member === m).map((r) => ({ hidden: false, archived: false, muted: false, ...r })) },
    groupsByIds: async (ids: string[]) => { calls.push('groupsByIds'); return groups.filter((g) => ids.includes(g.id)) },
    membersByGroups: async (ids: string[]) => { calls.push('membersByGroups'); return members.filter((r) => ids.includes(r.group_id)) },
    messagesFor: async (ids: string[], o: any = {}) => {
      calls.push('messagesFor')
      let rows = messages.filter((m) => ids.includes(m.group_id))
      if (o.after) return rows.filter((m) => m.id > o.after).slice(0, o.limit || 500)
      rows = rows.slice(-(o.limit || 500)); return rows
    },
  }
  const store = new Proxy(base, { get: (t, k: string) => { if (k in t) return t[k]; return () => { throw new Error('WRITE ATTEMPT: ' + k) } } })
  const files = { signDownloads: async (paths: string[]) => Object.fromEntries(paths.map((p) => [p, 'https://files.example/' + p + '?sig=1'])) }
  return { chat: { store, files }, calls }
}
const kvStub = () => ({ read: async () => null, update: async (_k: string, fn: any) => fn(null).result })
const call = (agent: string, name: string, args: any, chat: any) =>
  B.handleRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, kvStub, { agent, agents: ['Blaze', 'Julio'], chat })
const body = (r: any) => JSON.parse(r.result.content[0].text)

describe('read-only Chat for Julio', () => {
  it('only Julio is a chat reader, and he reads Daniel’s chats', () => {
    expect(AC.READERS).toEqual({ Julio: 'ds' })
    expect(AC.canRead('Julio')).toBe(true)
    expect(AC.canRead('Blaze')).toBe(false)
    expect(AC.canRead(undefined)).toBe(false)
  })

  it('shows the chat tools to Julio and to nobody else', async () => {
    const names = async (agent?: string) => (await B.handleRpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, kvStub, { agent })).result.tools.map((t: any) => t.name)
    expect(await names('Julio')).toEqual(expect.arrayContaining(['list_chats', 'read_chat']))
    expect(await names('Blaze')).not.toContain('list_chats')
    expect(await names('Blaze')).not.toContain('read_chat')
    expect(await names(undefined)).not.toContain('read_chat')
  })

  it('has no tool that sends, edits, reacts, deletes or marks read', async () => {
    const t = (await B.handleRpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, kvStub, { agent: 'Julio' })).result.tools.map((x: any) => x.name)
    expect(t.filter((n: string) => /chat/.test(n)).sort()).toEqual(['list_chats', 'read_chat'])
  })

  it('refuses Blaze (and anyone else) who calls the chat tools anyway', async () => {
    const f = fake()
    const r = await call('Blaze', 'read_chat', { chat: 'Belmont' }, f.chat)
    expect(r.result.isError).toBe(true)
    expect(f.calls).toEqual([])   // never even touched the chat store
  })

  it('lists only the chats on Daniel’s list, not hidden ones and not ones he is not in', async () => {
    const f = fake()
    const out = body(await call('Julio', 'list_chats', {}, f.chat))
    expect(out.person).toBe('Daniel Sette')
    expect(out.chats.map((c: any) => c.name).sort()).toEqual(['Belmont Estate', 'Jamie Baldwin'])
    const dm = out.chats.find((c: any) => c.type === 'direct')
    expect(dm.name).toBe('Jamie Baldwin')   // a direct message is named for the other person
    const grp = out.chats.find((c: any) => c.id === 'g1')
    expect(grp).toMatchObject({ type: 'group', project: 'Belmont', recent_messages: 3 })   // the reaction is not counted as a message
    expect(grp.members).toEqual(['Daniel Sette', 'Jamie Baldwin', 'Mike Furniss'])
    expect(JSON.stringify(out)).not.toMatch(/Hidden chat|Private sales/)
  })

  it('reads a chat by name or id: messages, tasks, attachment links, and leaves out reactions', async () => {
    const f = fake()
    const out = body(await call('Julio', 'read_chat', { chat: 'belmont' }, f.chat))
    expect(out.chat).toMatchObject({ id: 'g1', name: 'Belmont Estate', type: 'group' })
    expect(out.messages.map((m: any) => m.id)).toEqual([1, 2, 4, 5])   // reaction (3) is not a message
    expect(out.messages[0]).toMatchObject({ from: 'Jamie Baldwin', text: 'Church package is the problem.' })
    expect(out.messages[1].files[0]).toMatchObject({ name: 'staging.pdf', url: 'https://files.example/g1/a/staging.pdf?sig=1' })
    expect(out.messages[1].files[0].path).toBeUndefined()   // the storage path stays on the server
    expect(out.messages[2].task).toMatchObject({ title: 'Three staging options on one page', owner: 'Daniel Sette', done: false })
    expect(out.messages[3]).toEqual({ id: 5, at: T(5), from: 'Mike Furniss', deleted: true })   // a deleted message shows no words
    const byId = body(await call('Julio', 'read_chat', { chat: 'g2' }, f.chat))
    expect(byId.messages[0].text).toBe('Call me after lunch.')
  })

  it('cannot read a chat Daniel is not in, or one he removed from his list', async () => {
    const f = fake()
    for (const chat of ['g4', 'Sales only', 'g3', 'Old chat']) {
      const r = await call('Julio', 'read_chat', { chat }, f.chat)
      expect(r.result.isError).toBe(true)
      expect(r.result.content[0].text).toMatch(/No chat on Daniel Sette/)
    }
  })

  it('pages with after_id and limit, and can start from a date', async () => {
    const f = fake()
    const first = body(await call('Julio', 'read_chat', { chat: 'g1', limit: 2 }, f.chat))
    expect(first.messages.map((m: any) => m.id)).toEqual([4, 5])   // the latest two
    expect(first.next_after_id).toBe(5)
    const gap = body(await call('Julio', 'read_chat', { chat: 'g1', after_id: 2, limit: 1 }, f.chat))
    expect(gap.messages).toEqual([])   // the next row was a reaction: nothing to show, but the cursor still moves on
    expect(gap.next_after_id).toBe(3)
    const next = body(await call('Julio', 'read_chat', { chat: 'g1', after_id: gap.next_after_id, limit: 1 }, f.chat))
    expect(next.messages.map((m: any) => m.id)).toEqual([4])
    expect(next.next_after_id).toBe(4)
    const since = body(await call('Julio', 'read_chat', { chat: 'g1', since: T(3) }, f.chat))
    expect(since.messages.map((m: any) => m.id)).toEqual([4, 5])
    const bad = await call('Julio', 'read_chat', { chat: 'g1', since: 'not a date' }, f.chat)
    expect(bad.result.isError).toBe(true)
  })

  it('asks which chat when the name matches several, and when none is given', async () => {
    const f = fake()
    expect((await call('Julio', 'read_chat', {}, f.chat)).result.isError).toBe(true)
    expect((await call('Julio', 'read_chat', { chat: 'zzz' }, f.chat)).result.content[0].text).toMatch(/No chat/)
  })

  it('never writes: every call above ran against a store that throws on any write', async () => {
    const f = fake()
    await call('Julio', 'list_chats', {}, f.chat)
    await call('Julio', 'read_chat', { chat: 'g1' }, f.chat)
    await call('Julio', 'read_chat', { chat: 'g2', files: false }, f.chat)
    expect(new Set(f.calls)).toEqual(new Set(['memberRowsFor', 'groupsByIds', 'membersByGroups', 'messagesFor']))
  })
})
