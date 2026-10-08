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

const bd = () => ({ meetings: [
  { id: 'm0', title: 'Old', date: '2026-09-28', closed: true, kind: 'weekly', items: [{ id: 1, title: 'x' }] },
  { id: 'm1', title: 'Weekly Company Meeting', date: '2099-01-05', closed: false, kind: 'weekly', items: [{ id: 1, title: 'A', status: 'action', owner: 'Jamie Baldwin', dept: 'company' }, { id: 4, title: 'B', status: 'trouble', owner: 'Daniel Sette' }] },
] })

describe('boardroom', () => {
  it('lists items on open meetings only', () => {
    const r = B.listBoardroomItems(bd(), {})
    expect(r.total).toBe(2); expect(r.items[0].meeting).toBe('Weekly Company Meeting')
    expect(B.listBoardroomItems(bd(), { status: 'trouble' }).items).toHaveLength(1)
  })
  it('adds an item to the next open weekly meeting with the next numeric id', () => {
    const { next, result } = B.addBoardroomItem(bd(), { title: 'Mike QLD update', assignee: 'mike' })
    const m = next.meetings.find((x: any) => x.id === 'm1')
    expect(m.items).toHaveLength(3)
    expect(m.items[2]).toMatchObject({ id: 5, title: 'Mike QLD update', owner: 'Mike Furniss', status: 'action', createdBy: 'Blaze' })
    expect(result.title).toBe('Mike QLD update')
    expect(next.meetings[0].items).toHaveLength(1)
  })
  it('does not invent a meeting', () => {
    expect(() => B.addBoardroomItem({ meetings: [] }, { title: 'x' })).toThrow(/no open weekly meeting/)
    expect(() => B.addBoardroomItem({ meetings: [{ id: 'c', closed: true, items: [] }] }, { title: 'x' })).toThrow(/no open weekly meeting/)
  })
})

describe('boardroom updates and the feed', () => {
  it('updates one meeting item and stamps it', () => {
    const { next, result } = B.updateBoardroomItem(bd(), { id: 4, status: 'complete', discussed: true, assignee: 'daniel' })
    const it = next.meetings[1].items[1]
    expect(it).toMatchObject({ status: 'complete', discussed: true, owner: 'Daniel Sette', updatedBy: 'Blaze' })
    expect(result.changed).toEqual(['status', 'owner', 'discussed'])
    expect(next.meetings[1].items[0]).toEqual(bd().meetings[1].items[0])
  })
  it('refuses unknown, ambiguous or empty updates and never touches closed meetings', () => {
    expect(() => B.updateBoardroomItem(bd(), { id: 99, status: 'complete' })).toThrow(/No open meeting item/)
    expect(() => B.updateBoardroomItem(bd(), { id: 1, status: 'complete' })).not.toThrow() // id 1 only exists on the open meeting
    expect(() => B.updateBoardroomItem(bd(), { id: 4 })).toThrow(/Nothing to change/)
    const two = bd(); two.meetings.push({ id: 'm2', date: '2099-01-12', closed: false, kind: 'weekly', items: [{ id: 1, title: 'C' }] })
    expect(() => B.updateBoardroomItem(two, { id: 1, status: 'complete' })).toThrow(/more than one/)
    expect(B.updateBoardroomItem(two, { id: 1, status: 'complete', meeting_date: '2099-01-12' }).next.meetings[2].items[0].status).toBe('complete')
  })
  it('reports what changed since a time', () => {
    const w: any = ws(); w.actions[0].created = '2026-10-08T01:00:00.000Z'; w.actions[2].completedAt = '2026-10-07T01:00:00.000Z'
    const r = B.whatsNew(w, bd(), { since: '2026-10-08T00:00:00Z' })
    expect(r.tasks.map((t: any) => t.id)).toEqual(['n1-aaaa'])
    expect(r.tasks[0].events).toEqual(['created'])
    const { next } = B.addBoardroomItem(bd(), { title: 'Fresh' })
    expect(B.whatsNew(w, next, { since: new Date(Date.now() - 60000).toISOString() }).meetingItems[0].events[0]).toMatch(/added by Blaze/)
    expect(() => B.whatsNew(w, bd(), { since: 'garbage' })).toThrow(/since/)
  })
})

describe('meetings', () => {
  it('returns upcoming meetings and recent record actions', () => {
    const data = { bundles: [
      { meeting: { id: 'a', title: 'Future', startsAt: '2099-01-01T00:00:00Z', durationMin: 30, status: 'scheduled' }, attendees: [{ displayName: 'X' }], agenda: [{ title: 'Item' }], record: null },
      { meeting: { id: 'b', title: 'Done', startsAt: '2026-01-01T00:00:00Z', status: 'sent' }, record: { decisions: ['Go'], actions: [{ text: 'Do it', dueLabel: 'Fri' }] } },
    ] }
    const r = B.listMeetings(data, {})
    expect(r.upcoming).toHaveLength(1); expect(r.upcoming[0].agenda).toEqual(['Item'])
    expect(r.recent[0]).toMatchObject({ meeting: 'Done', decisions: ['Go'] })
    expect(B.listMeetings(null, {})).toEqual({ upcoming: [], recent: [] })
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
  it('gives up with nothing written after two lost races', async () => {
    const rows: any = { nav_workspace: { value: ws(), updated_at: 't0' } }
    let n = 0
    const f = fakeSupabase(rows); 
    const racing = async (url: string, init: any = {}) => { if (init.method === 'PATCH') { rows.nav_workspace = { value: rows.nav_workspace.value, updated_at: 'r' + (++n) } } return f(url, init) }
    const store = B.kv(env, racing)
    await expect(store.update('nav_workspace', (v: any) => B.addTask(v, { title: 'Mine', owner: 'mike' }))).rejects.toThrow(/same moment/)
    expect(rows.nav_workspace.value.actions).toHaveLength(3)
  })
})

describe('MCP protocol', () => {
  const rows = () => ({ nav_workspace: { value: ws(), updated_at: 't0' }, haavn_boardroom: { value: bd(), updated_at: 't0' } })
  it('handles initialize, tools/list, tools/call and notifications', async () => {
    const r = rows(); const store = () => B.kv(env, fakeSupabase(r))
    const init = await B.handleRpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } }, store)
    expect(init.result.serverInfo.name).toBe('ATRIUM')
    expect(await B.handleRpc({ jsonrpc: '2.0', method: 'notifications/initialized' }, store)).toBeNull()
    const list = await B.handleRpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, store)
    expect(list.result.tools.map((t: any) => t.name).sort()).toEqual(['add_boardroom_item', 'add_task', 'list_boardroom_items', 'list_meetings', 'list_tasks', 'update_boardroom_item', 'update_task', 'whats_new'])
    expect(list.result.tools.find((t: any) => /delete/.test(t.name))).toBeUndefined()
    const call = await B.handleRpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_tasks', arguments: { owner: 'mike' } } }, store)
    expect(JSON.parse(call.result.content[0].text).tasks[0].id).toBe('n1-aaaa')
    const bad = await B.handleRpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'add_task', arguments: { title: 'x', owner: 'zzz' } } }, store)
    expect(bad.result.isError).toBe(true)
    expect((await B.handleRpc({ jsonrpc: '2.0', id: 5, method: 'nope' }, store)).error.code).toBe(-32601)
  })
})
