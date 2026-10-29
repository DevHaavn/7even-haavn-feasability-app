// The chat's database and file store: Supabase REST and Storage, with the service key. Server only.
const BUCKET = 'chat-files'

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
  const inList = (ids) => '(' + ids.map((i) => encodeURIComponent(i)).join(',') + ')'
  const store = {
    memberRowsFor: (member) => rest('GET', `chat_members?member=eq.${encodeURIComponent(member)}&select=*`),
    groupsByIds: (ids) => rest('GET', `chat_groups?id=in.${inList(ids)}&select=*`),
    membersByGroups: (ids) => rest('GET', `chat_members?group_id=in.${inList(ids)}&select=*`),
    async messagesFor(ids, { after = 0, limit = 500 } = {}) {
      if (after) return rest('GET', `chat_messages?group_id=in.${inList(ids)}&id=gt.${Number(after)}&order=id.asc&limit=${limit}&select=*`)
      // first load: messages and reactions; icons and wallpapers come from latestStyle, so they never crowd the history out
      return (await rest('GET', `chat_messages?group_id=in.${inList(ids)}&kind=not.in.(icon,wall,avatar,mop)&order=id.desc&limit=${limit}&select=*`)).reverse()
    },
    latestStyle: (ids) => rest('GET', `chat_messages?group_id=in.${inList(ids)}&kind=in.(icon,wall)&order=id.desc&limit=600&select=id,group_id,sender,kind,task`),
    // My Tasks and search
    tasksIn: (ids) => rest('GET', `chat_messages?group_id=in.${inList(ids)}&kind=eq.task&order=id.desc&limit=800&select=*`),
    searchMessages: (ids, q, limit) => rest('GET', `chat_messages?group_id=in.${inList(ids)}&kind=in.(text,task,wfupdate,meeting)&or=(body.ilike.${encodeURIComponent('*' + q + '*')},task-%3E%3Etitle.ilike.${encodeURIComponent('*' + q + '*')})&order=id.desc&limit=${limit}&select=*`),
    recentWithFiles: (ids, limit) => rest('GET', `chat_messages?group_id=in.${inList(ids)}&files=neq.%5B%5D&kind=in.(text,task,wfupdate)&order=id.desc&limit=${limit}&select=*`),
    // message operations (columns from supabase/2026-10-29_chat_message_ops.sql) and reminders
    getMessages: (ids) => ids.length ? rest('GET', `chat_messages?id=in.${inList(ids)}&select=id,group_id,sender,body,kind`) : [],
    pinsFor: (gid) => rest('GET', `chat_messages?group_id=eq.${gid}&pinned_at=not.is.null&order=pinned_at.desc&limit=50&select=*`),
    addReminder: (row) => rest('POST', 'chat_reminders', row, 'return=minimal'),
    cancelReminder: (person, mid) => rest('DELETE', `chat_reminders?person_id=eq.${encodeURIComponent(person)}&message_id=eq.${Number(mid)}&sent_at=is.null`),
    remindersFor: (person) => rest('GET', `chat_reminders?person_id=eq.${encodeURIComponent(person)}&sent_at=is.null&order=remind_at.asc&limit=200&select=*`),
    dueReminders: (nowIso) => rest('GET', `chat_reminders?sent_at=is.null&remind_at=lte.${encodeURIComponent(nowIso)}&order=remind_at.asc&limit=200&select=*`),
    markReminderSent: (id) => rest('PATCH', `chat_reminders?id=eq.${Number(id)}`, { sent_at: new Date().toISOString() }, 'return=minimal'),
    updateGroup: (id, patch) => rest('PATCH', `chat_groups?id=eq.${id}`, patch, 'return=minimal'),
    async latestPollUp(mid) { return (await rest('GET', `chat_messages?kind=eq.pollup&task->>poll=eq.${Number(mid)}&order=id.desc&limit=1&select=*`))[0] || null },
    async insertGroup(g) { return (await rest('POST', 'chat_groups', g, 'return=representation'))[0] },
    insertMembers: (rows) => rest('POST', 'chat_members?on_conflict=group_id,member', rows, 'resolution=ignore-duplicates,return=minimal'),
    updateMember: (gid, member, patch) => rest('PATCH', `chat_members?group_id=eq.${gid}&member=eq.${encodeURIComponent(member)}`, patch, 'return=minimal'),
    deleteMember: (gid, member) => rest('DELETE', `chat_members?group_id=eq.${gid}&member=eq.${encodeURIComponent(member)}`),
    async insertMessage(m) { return (await rest('POST', 'chat_messages', m, 'return=representation'))[0] },
    async getMessage(id) { return (await rest('GET', `chat_messages?id=eq.${Number(id)}&select=*`))[0] || null },
    updateMessage: (id, patch) => rest('PATCH', `chat_messages?id=eq.${Number(id)}`, patch, 'return=minimal'),
    deleteGroup: (id) => rest('DELETE', `chat_groups?id=eq.${id}`),
    deleteMessage: (id) => rest('DELETE', `chat_messages?id=eq.${Number(id)}`),
    async findDm(key) { return (await rest('GET', `chat_groups?dm_key=eq.${encodeURIComponent(key)}&select=*`))[0] || null },
    unhideOthers: (gid, me) => rest('PATCH', `chat_members?group_id=eq.${gid}&member=neq.${encodeURIComponent(me)}&hidden=eq.true`, { hidden: false }, 'return=minimal'),
    unarchiveOthers: (gid, me) => rest('PATCH', `chat_members?group_id=eq.${gid}&member=neq.${encodeURIComponent(me)}&archived=eq.true`, { archived: false }, 'return=minimal'),
    async pushSubsFor(ids) { return ids.length ? rest('GET', `chat_push?person_id=in.${inList(ids)}&select=*`) : [] },
    savePush: (row) => rest('POST', 'chat_push?on_conflict=endpoint', row, 'resolution=merge-duplicates,return=minimal'),
    deletePush: (endpoint) => rest('DELETE', `chat_push?endpoint=eq.${encodeURIComponent(endpoint)}`),
    // for the email nudge
    recentMessages: (sinceIso) => rest('GET', `chat_messages?kind=not.in.(system,react,icon,wall,avatar,vote,pollup,mop)&created_at=gte.${encodeURIComponent(sinceIso)}&order=id.asc&limit=1000&select=id,group_id,sender,body,task,files,created_at`),
    allGroups: (ids) => ids.length ? rest('GET', `chat_groups?id=in.${inList(ids)}&select=*`) : [],
    markEmailed: (gid, member, upto) => rest('PATCH', `chat_members?group_id=eq.${gid}&member=eq.${encodeURIComponent(member)}`, { last_emailed: upto }, 'return=minimal'),
    async filePaths(gid) { const ms = await rest('GET', `chat_messages?group_id=eq.${gid}&kind=neq.system&select=files`); return ms.flatMap((m) => (m.files || []).map((f) => f.path).filter(Boolean)) },
  }
  async function storage(method, path, body) {
    const r = await fetchImpl(`${root}/storage/v1/${path}`, { method, headers: H, body: body === undefined ? undefined : JSON.stringify(body) })
    const text = await r.text()
    return { ok: r.ok, status: r.status, json: text ? (() => { try { return JSON.parse(text) } catch { return null } })() : null }
  }
  let ensured = false
  const files = {
    async ensureBucket() {
      if (ensured) return
      const r = await storage('POST', 'bucket', { id: BUCKET, name: BUCKET, public: false, file_size_limit: 50 * 1024 * 1024 })
      if (!r.ok && !/exist|duplicate/i.test(JSON.stringify(r.json))) throw new Error('Could not create the file store (' + r.status + ')')
      ensured = true
    },
    async signUpload(path) {
      await this.ensureBucket()
      const r = await storage('POST', `object/upload/sign/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`, {})
      if (!r.ok || !r.json || !r.json.url) throw new Error('Could not prepare the upload (' + r.status + ')')
      return { uploadUrl: root + '/storage/v1' + r.json.url }
    },
    async signDownloads(paths) {
      await this.ensureBucket()
      const r = await storage('POST', `object/sign/${BUCKET}`, { expiresIn: 3600, paths })
      const out = {}
      if (r.ok && Array.isArray(r.json)) r.json.forEach((x) => { if (x && x.signedURL && x.path) out[x.path] = root + '/storage/v1' + x.signedURL })
      return out
    },
    async list(prefix) {
      await this.ensureBucket()
      const r = await storage('POST', `object/list/${BUCKET}`, { prefix, limit: 1000, sortBy: { column: 'name', order: 'asc' } })
      return r.ok && Array.isArray(r.json) ? r.json : []
    },
    async remove(paths) { await storage('DELETE', `object/${BUCKET}`, { prefixes: paths }) },
  }
  return { store, files }
}
module.exports = { supa, BUCKET }
