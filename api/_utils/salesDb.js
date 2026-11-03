// The HAAVN BLACK sales pipeline's database: Supabase REST with the service key. Server only.
// Tables come from supabase/2026-11-04_hb_sales.sql. A lead is one row: the columns the server filters on, and everything else in `data`.
function supa(env = process.env, fetchImpl = fetch) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw Object.assign(new Error('SUPABASE_SERVICE_ROLE_KEY is not set'), { status: 503 })
  const root = env.SUPABASE_URL || 'https://vgvavmnqrdgcnledztyk.supabase.co'
  const H = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }
  async function rest(method, path, body, prefer) {
    const r = await fetchImpl(`${root}/rest/v1/${path}`, { method, headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
    const text = await r.text()
    if (!r.ok) { let code = ''; try { code = JSON.parse(text).code } catch { /* not json */ } throw Object.assign(new Error(`db ${r.status} ${code}`), { status: r.status, code }) }
    return text ? JSON.parse(text) : null
  }
  const q = (v) => encodeURIComponent(v)
  const upsert = (table, row) => rest('POST', `${table}?on_conflict=id`, row, 'resolution=merge-duplicates,return=representation').then((r) => r[0])
  return {
    leads: {
      all: () => rest('GET', 'hb_leads?select=*&order=created_at.desc&limit=3000'),
      since: (iso) => rest('GET', `hb_leads?select=*&updated_at=gt.${q(iso)}&order=updated_at.asc&limit=1000`),
      get: async (id) => (await rest('GET', `hb_leads?id=eq.${q(id)}&select=*`))[0] || null,
      upsert: (row) => upsert('hb_leads', row),
      findByContact: async (email, mobileDigits) => {
        const out = []
        if (email) out.push(...(await rest('GET', `hb_leads?select=*&data-%3E%3EemailLower=eq.${q(String(email).toLowerCase())}&limit=5`)))
        if (mobileDigits) out.push(...(await rest('GET', `hb_leads?select=*&data-%3E%3EmobileDigits=eq.${q(mobileDigits)}&limit=5`)))
        return out
      },
    },
    companies: { all: () => rest('GET', 'hb_companies?select=*&order=name.asc&limit=500'), get: async (id) => (await rest('GET', `hb_companies?id=eq.${q(id)}&select=*`))[0] || null, upsert: (row) => upsert('hb_companies', row) },
    agents: {
      all: () => rest('GET', 'hb_agents?select=*&order=name.asc&limit=1000'),
      get: async (id) => (await rest('GET', `hb_agents?id=eq.${q(id)}&select=*`))[0] || null,
      byEmails: async (emails) => { const l = emails.map((e) => String(e).toLowerCase()); if (!l.length) return []; return rest('GET', `hb_agents?select=*&email=in.(${l.map(q).join(',')})`) },
      upsert: (row) => upsert('hb_agents', row),
    },
    inbox: {
      list: (limit = 60) => rest('GET', `hb_inbox?select=*&order=received_at.desc&limit=${Number(limit)}`),
      byMessage: async (mid) => (await rest('GET', `hb_inbox?message_id=eq.${q(mid)}&select=*`))[0] || null,
      get: async (id) => (await rest('GET', `hb_inbox?id=eq.${q(id)}&select=*`))[0] || null,
      upsert: (row) => upsert('hb_inbox', row),
    },
    settings: {
      get: async (k) => { const r = (await rest('GET', `hb_settings?key=eq.${q(k)}&select=value`))[0]; return r ? r.value : null },
      set: (k, v) => rest('POST', 'hb_settings?on_conflict=key', { key: k, value: v, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates,return=minimal'),
    },
  }
}
module.exports = { supa }
