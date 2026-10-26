// The only door to capital_kv once the table is locked: /api/kv. Holds the service key, reads the signed session,
// and applies one rule table. Not wired to any page yet: pages migrate one at a time (docs/CAPITAL_KV_LOCKDOWN_PLAN.md, phase 4).
const MAX_BYTES = 6 * 1024 * 1024

// First match wins. read / write are the roles allowed. Anything not listed is admin only.
//   admin: directors + head of HAAVN Management   staff: the team   blacksales: HAAVN BLACK sales login   external: consultants and designers
const RULES = [
  { re: /^(capital_admin_v3|atrium-accounts-v1|haavn_homes_crm|atrium_crm_v2.*|atrium_zeroed[:_].*)$/, read: ['admin'], write: ['admin'] },
  { re: /^blaze_audit$/, read: ['admin'], write: ['admin'] },
  { re: /^haavn_black_series$/, read: ['admin', 'staff', 'blacksales'], write: ['admin', 'staff'] },
  { re: /^haavn_black_atrium_feas$/, read: ['admin', 'staff'], write: ['admin', 'staff'] },
  { re: /^(nav_workspace|haavn_boardroom|atrium_notifications|atrium_file_.*)$/, read: ['admin', 'staff', 'blacksales'], write: ['admin', 'staff', 'blacksales'] },
  { re: /^(atrium_meetings_v\d+|atrium_mgmt_v\d+|atrium_workflow|haavn_dm_programme|haavn_path_to_market)$/, read: ['admin', 'staff'], write: ['admin', 'staff'] },
  { re: /^.*_preview$/, read: ['admin', 'staff'], write: ['admin', 'staff'] },
  // TV pairing codes are read by a TV that has no one signed in. They move to their own small public endpoint, not through this one.
  { re: /^hb_display_room_.*$/, read: [], write: [], note: 'public room codes: own endpoint' },
]
function rule(key) { return RULES.find((r) => r.re.test(key)) || { read: ['admin'], write: ['admin'] } }
function access(role, key, op) { const r = rule(key); return (op === 'write' ? r.write : r.read).includes(role) }
const validKey = (k) => typeof k === 'string' && /^[\w:.\-]{1,120}$/.test(k)

function makeStore(env = process.env, fetchImpl = fetch) {
  const sk = env.SUPABASE_SERVICE_ROLE_KEY
  if (!sk) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  const base = (env.SUPABASE_URL || 'https://vgvavmnqrdgcnledztyk.supabase.co') + '/rest/v1/capital_kv'
  const H = { apikey: sk, Authorization: 'Bearer ' + sk, 'Content-Type': 'application/json' }
  return {
    async read(k) {
      const r = await fetchImpl(`${base}?key=eq.${encodeURIComponent(k)}&select=key,value,updated_at`, { headers: H })
      if (!r.ok) throw new Error('read ' + r.status)
      const rows = await r.json(); return rows[0] || null
    },
    // Writes only if updated_at has not moved since `expect` (when given). Returns { ok, updated_at } or { conflict: currentRow }.
    async write(k, value, expect) {
      const stamp = new Date().toISOString()
      if (expect === undefined) { // same as the pages do today: take the value as is
        const r = await fetchImpl(base + '?on_conflict=key', { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ key: k, value, updated_at: stamp }]) })
        if (!r.ok) throw new Error('write ' + r.status)
        return { ok: true, updated_at: stamp }
      }
      const cur = await this.read(k)
      if (!cur) {
        if (expect !== null) return { conflict: null }
        const r = await fetchImpl(base, { method: 'POST', headers: { ...H, Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify([{ key: k, value, updated_at: stamp }]) })
        const out = r.ok ? await r.json() : []
        return out.length ? { ok: true, updated_at: stamp } : { conflict: await this.read(k) }
      }
      const r = await fetchImpl(`${base}?key=eq.${encodeURIComponent(k)}&updated_at=${cur.updated_at ? 'eq.' + encodeURIComponent(cur.updated_at) : 'is.null'}`,
        { method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ value, updated_at: stamp }) })
      if (!r.ok) throw new Error('write ' + r.status)
      const out = await r.json()
      return out.length ? { ok: true, updated_at: stamp } : { conflict: await this.read(k) }
    },
  }
}

// req: { method, query, body, session }  ->  { status, json }
async function handleKv(req, store) {
  const s = req.session
  if (!s) return { status: 401, json: { error: 'Sign in first.' } }
  const k = req.query && req.query.key
  if (req.method === 'GET') {
    if (!validKey(k)) return { status: 400, json: { error: 'key is required' } }
    if (!access(s.role, k, 'read')) return { status: 403, json: { error: 'Not for you.' } }
    const row = await store.read(k)
    return { status: 200, json: row ? { key: k, value: row.value, updated_at: row.updated_at } : { key: k, value: null, updated_at: null } }
  }
  if (req.method === 'POST' || req.method === 'PUT') {
    const b = req.body && typeof req.body === 'object' ? req.body : null
    if (!b || !validKey(b.key) || !('value' in b)) return { status: 400, json: { error: 'key and value are required' } }
    if (!access(s.role, b.key, 'write')) return { status: 403, json: { error: 'Not for you.' } }
    if (JSON.stringify(b.value).length > MAX_BYTES) return { status: 413, json: { error: 'Too large for one write.' } }
    const out = await store.write(b.key, b.value, 'expect_updated_at' in b ? b.expect_updated_at : undefined)
    if (out.conflict !== undefined) return { status: 409, json: { error: 'Someone else changed this first.', current: out.conflict } }
    return { status: 200, json: { ok: true, updated_at: out.updated_at, by: s.sub } }
  }
  return { status: 405, json: { error: 'GET or POST only' } }
}

module.exports = { RULES, access, validKey, makeStore, handleKv, MAX_BYTES }
