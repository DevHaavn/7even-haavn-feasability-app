import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const B = require('../../../api/_utils/blaze.js')

const ws = () => ({
  seq: 1,
  actions: [
    { id: 'n1-aaaa', title: 'Send SOLUM brochure', owner: 'Mike Furniss', due: '2026-10-10', status: 'todo', done: false, dept: 'haavnblack', priority: 'High' },
    { id: 'n2-bbbb', title: 'Old thing', owner: 'Jamie Baldwin', due: '2026-09-01', status: 'done', done: true, dept: 'company', priority: 'Low' },
    { id: 'n3-cccc', title: 'Review programme', owner: 'John Dimattina', due: '2026-10-05', status: 'doing', done: false, dept: 'haavnmgmt', priority: 'Medium' },
  ],
  buyers: [{ id: 'keep-me' }],
})

describe('owners', () => {
  it('resolves names and refuses unknown or ambiguous ones', () => {
    expect(B.resolveOwner('mike')).toBe('Mike Furniss')
    expect(B.resolveOwner('Jamie Baldwin')).toBe('Jamie Baldwin')
    expect(() => B.resolveOwner('Nobody')).toThrow(/Unknown owner/)
    expect(() => B.resolveOwner('callum')).toThrow(/more than one/)
  })
})

describe('tasks', () => {
  it('lists open tasks soonest first, hides done unless asked', () => {
    const r = B.listTasks(ws(), {})
    expect(r.tasks.map((t: any) => t.id)).toEqual(['n3-cccc', 'n1-aaaa'])
    expect(B.listTasks(ws(), { include_done: true }).total).toBe(3)
    expect(B.listTasks(ws(), { owner: 'mike' }).tasks).toHaveLength(1)
    expect(B.listTasks(ws(), { due_before: '2026-10-08' }).tasks.map((t: any) => t.id)).toEqual(['n3-cccc'])
    expect(B.listTasks(ws(), { status: 'done' }).tasks).toHaveLength(1)
  })
  it('adds one task, stamped, without touching anything else', () => {
    const before = ws()
    const { next, result } = B.addTask(before, { title: 'Call Corio', owner: 'daniel', due: '2026-10-12', dept: 'company', priority: 'High', notes: 'n' })
    expect(next.actions).toHaveLength(4)
    const t = next.actions[3]
    expect(t).toMatchObject({ title: 'Call Corio', owner: 'Daniel Sette', status: 'todo', done: false, createdBy: 'Blaze' })
    expect(typeof t.created).toBe('string')
    expect(result.id).toBe(t.id)
    expect(next.buyers).toEqual(before.buyers)
    expect(before.actions).toHaveLength(3) // input not mutated
  })
  it('validates input', () => {
    expect(() => B.addTask(ws(), { title: '', owner: 'mike' })).toThrow(/title/)
    expect(() => B.addTask(ws(), { title: 'x', owner: 'mike', due: '12/10/2026' })).toThrow(/YYYY-MM-DD/)
    expect(() => B.addTask(ws(), { title: 'x', owner: 'mike', priority: 'Urgent' })).toThrow(/priority/)
    expect(() => B.addTask(ws(), { title: 'x', owner: 'mike', dept: 'nope' })).toThrow(/dept/)
  })
  it('updates a single task and sets done state like the app does', () => {
    const { next, result } = B.updateTask(ws(), { id: 'n1-aaaa', status: 'done' })
    const t = next.actions.find((x: any) => x.id === 'n1-aaaa')
    expect(t.done).toBe(true); expect(t.completedAt).toBeTruthy(); expect(t.updatedBy).toBe('Blaze')
    expect(result.changed).toEqual(['status'])
    expect(next.actions.find((x: any) => x.id === 'n3-cccc')).toEqual(ws().actions[2])
    const back = B.updateTask(next, { id: 'n1-aaaa', status: 'doing' }).next.actions[0]
    expect(back.done).toBe(false); expect(back.completedAt).toBeNull()
  })
  it('refuses empty or unknown updates', () => {
    expect(() => B.updateTask(ws(), { id: 'zzz', status: 'done' })).toThrow(/No task/)
    expect(() => B.updateTask(ws(), { id: 'n1-aaaa' })).toThrow(/Nothing to change/)
    expect(() => B.updateTask(ws(), { id: 'n1-aaaa', status: 'finished' })).toThrow(/status/)
  })
})

describe('the feed', () => {
  it('reports tasks created, completed or edited since a time', () => {
    const w: any = ws(); w.actions[0].created = '2026-10-08T01:00:00.000Z'; w.actions[2].completedAt = '2026-10-07T01:00:00.000Z'
    const r = B.whatsNew(w, { since: '2026-10-08T00:00:00Z' })
    expect(r.tasks.map((t: any) => t.id)).toEqual(['n1-aaaa'])
    expect(r.tasks[0].events).toEqual(['created'])
    const edited = B.updateTask(w, { id: 'n3-cccc', notes: 'x' }).next
    expect(B.whatsNew(edited, { since: new Date(Date.now() - 60000).toISOString() }).tasks[0].events[0]).toMatch(/updated by Blaze/)
    expect(() => B.whatsNew(w, { since: 'garbage' })).toThrow(/since/)
  })
})

// A tiny PostgREST stand-in: conditional PATCH on updated_at, so the safe write can be exercised.
function fakeSupabase(rows: Record<string, { value: any; updated_at: string }>, hooks: { beforePatch?: () => void } = {}) {
  let clock = 0
  return async (url: string, init: any = {}) => {
    const u = new URL(url)
    const key = (u.searchParams.get('key') || '').replace('eq.', '')
    const json = (o: any, status = 200) => ({ ok: status < 300, status, json: async () => o })
    if (!init.method || init.method === 'GET') return json(rows[key] ? [rows[key]] : [])
    const body = JSON.parse(init.body)
    if (init.method === 'PATCH') {
      hooks.beforePatch?.(); hooks.beforePatch = undefined
      const cond = (u.searchParams.get('updated_at') || '').replace('eq.', '')
      if (!rows[key] || rows[key].updated_at !== cond) return json([])
      rows[key] = { value: body.value, updated_at: body.updated_at + (++clock) }
      return json([rows[key]])
    }
    if (init.method === 'POST') {
      const b = body[0]; if (rows[b.key]) return json([])
      rows[b.key] = { value: b.value, updated_at: b.updated_at }; return json([rows[b.key]])
    }
    return json([], 400)
  }
}
const env = { SUPABASE_SERVICE_ROLE_KEY: 'k', SUPABASE_URL: 'https://x.test' }

describe('safe read-modify-write', () => {
  it('writes the change when nothing moved', async () => {
    const rows = { nav_workspace: { value: ws(), updated_at: 't0' } }
    const store = B.kv(env, fakeSupabase(rows))
    const r = await store.update('nav_workspace', (v: any) => B.addTask(v, { title: 'T', owner: 'mike' }))
    expect(r.title).toBe('T'); expect(rows.nav_workspace.value.actions).toHaveLength(4)
  })
  it('re-reads and retries once when someone wrote in between, keeping their change', async () => {
    const rows: any = { nav_workspace: { value: ws(), updated_at: 't0' } }
    const sneaky = () => { rows.nav_workspace = { value: { ...ws(), actions: [...ws().actions, { id: 'theirs', title: 'Theirs', owner: 'Jamie Baldwin', status: 'todo' }] }, updated_at: 't1' } }
    const store = B.kv(env, fakeSupabase(rows, { beforePatch: sneaky }))
    await store.update('nav_workspace', (v: any) => B.addTask(v, { title: 'Mine', owner: 'mike' }))
    const titles = rows.nav_workspace.value.actions.map((a: any) => a.title)
    expect(titles).toContain('Theirs'); expect(titles).toContain('Mine')
  })
  it('a staff edit to a buyer at the same moment as a Blaze task change is not lost, and neither is Blaze\'s', async () => {
    const rows: any = { nav_workspace: { value: ws(), updated_at: 't0' } }
    const staffEdit = () => { rows.nav_workspace = { value: { ...ws(), buyers: [{ id: 'keep-me', stage: 'Contract' }] }, updated_at: 't1' } }
    const store = B.kv(env, fakeSupabase(rows, { beforePatch: staffEdit }))
    await store.update('nav_workspace', (v: any) => B.updateTask(v, { id: 'n1-aaaa', status: 'doing' }))
    const v = rows.nav_workspace.value
    expect(v.buyers[0].stage).toBe('Contract')                                   // staff's edit kept
    expect(v.actions.find((a: any) => a.id === 'n1-aaaa').status).toBe('doing')  // Blaze's change applied on top
  })
  it('retries up to three times, then stops with nothing written', async () => {
    const rows: any = { nav_workspace: { value: ws(), updated_at: 't0' } }
    let patches = 0
    const f = fakeSupabase(rows)
    const racing = async (url: string, init: any = {}) => { if (init.method === 'PATCH') { patches++; rows.nav_workspace = { value: rows.nav_workspace.value, updated_at: 'r' + patches } } return f(url, init) }
    await expect(B.kv(env, racing).update('nav_workspace', (v: any) => B.addTask(v, { title: 'Mine', owner: 'mike' }))).rejects.toThrow(/Nothing was written/)
    expect(patches).toBe(4)  // first try + 3 retries
    expect(rows.nav_workspace.value.actions).toHaveLength(3)
  })
  it('gives up with nothing written after repeated lost races', async () => {
    const rows: any = { nav_workspace: { value: ws(), updated_at: 't0' } }
    let n = 0
    const f = fakeSupabase(rows); 
    const racing = async (url: string, init: any = {}) => { if (init.method === 'PATCH') { rows.nav_workspace = { value: rows.nav_workspace.value, updated_at: 'r' + (++n) } } return f(url, init) }
    const store = B.kv(env, racing)
    await expect(store.update('nav_workspace', (v: any) => B.addTask(v, { title: 'Mine', owner: 'mike' }))).rejects.toThrow(/same moment/)
    expect(rows.nav_workspace.value.actions).toHaveLength(3)
  })
})

describe('notes append and before/after', () => {
  it('appends notes with a Blaze prefix and never replaces them', () => {
    const w: any = ws(); w.actions[0].notes = 'Original note'
    const r = B.updateTask(w, { id: 'n1-aaaa', notes: 'Chased on Friday' })
    const n = r.next.actions[0].notes
    expect(n.startsWith('Original note\n\nBlaze, ')).toBe(true)
    expect(n).toMatch(/Blaze, \d{4}-\d{2}-\d{2}: Chased on Friday$/)
    expect(r.audit.before.notes).toBe('Original note')   // enough to put it back
    const again = B.updateTask(r.next, { id: 'n1-aaaa', notes: 'Second' }).next.actions[0].notes
    expect(again).toContain('Chased on Friday'); expect(again).toContain('Second')
    expect(() => B.updateTask(w, { id: 'n1-aaaa', notes: '   ' })).toThrow(/empty/)
    expect(B.updateTask(ws(), { id: 'n1-aaaa', notes: 'First' }).next.actions[0].notes).toMatch(/^Blaze, .*First$/)
  })
  it('records only the fields that changed, before and after', () => {
    const r = B.updateTask(ws(), { id: 'n1-aaaa', status: 'done', owner: 'daniel' })
    expect(r.audit.before).toMatchObject({ status: 'todo', done: false, owner: 'Mike Furniss' })
    expect(r.audit.after).toMatchObject({ status: 'done', done: true, owner: 'Daniel Sette' })
    expect(r.audit.before.due).toBeUndefined()
    expect(B.addTask(ws(), { title: 'T', owner: 'mike' }).audit.before).toBeNull()
  })
})

describe('audit log', () => {
  it('records every call, reads and writes, successes and refusals', async () => {
    const r: any = { nav_workspace: { value: ws(), updated_at: 't0' } }
    const store = () => B.kv(env, fakeSupabase(r))
    const call = (id: number, name: string, args: any) => B.handleRpc({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }, store)
    await call(1, 'list_tasks', {})
    await call(2, 'add_task', { title: 'Book flights', owner: 'jamie' })
    await call(3, 'update_task', { id: 'n1-aaaa', status: 'done' })
    await call(4, 'add_task', { title: 'x', owner: 'nobody' })
    const e = r.blaze_audit.value.entries
    expect(e.map((x: any) => [x.tool, x.ok])).toEqual([['list_tasks', true], ['add_task', true], ['update_task', true], ['add_task', false]])
    expect(e[1].note).toBe('added: Book flights'); expect(e[2].taskId).toBe('n1-aaaa'); expect(e[2].note).toBe('changed: status')
    expect(e.every((x: any) => typeof x.at === 'string')).toBe(true)
    expect(Object.keys(r).sort()).toEqual(['blaze_audit', 'nav_workspace']) // nothing else touched
    expect(e[1].before).toBeNull(); expect(e[1].after.title).toBe('Book flights')
    expect(e[2].before).toMatchObject({ status: 'todo', done: false }); expect(e[2].after).toMatchObject({ status: 'done', done: true })
    expect(e[0].before).toBeUndefined()
  })
  it('keeps the log capped', async () => {
    const entries = Array.from({ length: 1000 }, (_, i) => ({ at: 'x', tool: 'list_tasks', ok: true, taskId: '', note: String(i) }))
    const r: any = { nav_workspace: { value: ws(), updated_at: 't0' }, blaze_audit: { value: { entries }, updated_at: 't0' } }
    await B.handleRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'list_tasks', arguments: {} } }, () => B.kv(env, fakeSupabase(r)))
    expect(r.blaze_audit.value.entries).toHaveLength(1000); expect(r.blaze_audit.value.entries[0].note).toBe('1')
  })
})

describe('MCP protocol', () => {
  const rows = () => ({ nav_workspace: { value: ws(), updated_at: 't0' }, })
  it('handles initialize, tools/list, tools/call and notifications', async () => {
    const r = rows(); const store = () => B.kv(env, fakeSupabase(r))
    const init = await B.handleRpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } }, store)
    expect(init.result.serverInfo.name).toBe('ATRIUM')
    expect(await B.handleRpc({ jsonrpc: '2.0', method: 'notifications/initialized' }, store)).toBeNull()
    const list = await B.handleRpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, store)
    expect(list.result.tools.map((t: any) => t.name).sort()).toEqual(['add_task', 'list_tasks', 'update_task', 'whats_new'])
    expect(list.result.tools.find((t: any) => /delete|meeting|boardroom/.test(t.name))).toBeUndefined()
    const call = await B.handleRpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_tasks', arguments: { owner: 'mike' } } }, store)
    expect(JSON.parse(call.result.content[0].text).tasks[0].id).toBe('n1-aaaa')
    const bad = await B.handleRpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'add_task', arguments: { title: 'x', owner: 'zzz' } } }, store)
    expect(bad.result.isError).toBe(true)
    expect((await B.handleRpc({ jsonrpc: '2.0', id: 5, method: 'nope' }, store)).error.code).toBe(-32601)
  })
})
