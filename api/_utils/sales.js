// HAAVN BLACK sales pipeline: the rules. Who may see what, how an enquiry email becomes a lead, who it goes to, and who is told.
// The app is public/atrium-sales.html; it only ever talks to /api/sales (api/sales.js), which signs people in with the same Microsoft session as Chat.
// Database: api/_utils/salesDb.js (supabase/2026-11-04_hb_sales.sql). Tests: src/lib/__tests__/sales.test.ts.
const A = require('./atriumAuth')
const B = require('./blaze')
const O = require('./outside')

class SalesError extends Error { constructor(m, status = 400) { super(m); this.status = status } }

const STATES = { NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland', SA: 'South Australia', WA: 'Western Australia', TAS: 'Tasmania', ACT: 'Australian Capital Territory', NT: 'Northern Territory' }
const SOURCES = ['Facebook', 'Instagram', 'LinkedIn', 'Google search', 'Website direct', 'Agent referral', 'Other']
const PRODUCTS = ['studio', 'plus', 'max', 'octa', 'octaplus', 'octamax', 'none']
const CONCEPT = ['octa', 'octaplus', 'octamax']
const CLAD = ['Ivory', 'Char', 'Amber', 'Urbanite'], PAL = ['Burgundy', 'Sage', 'Tide', 'Vine'], JOIN = ['Dark Oak', 'Raw Walnut']
const SETTING = ['City', 'Coast', 'Country', 'Not sure yet'], PAY = ['No preference', 'Cash', 'Finance', 'Undecided'], DELIV = ['No preference', 'Supply', 'Delivered', 'Installed']
const STAGE_NAMES = ['New enquiry', 'Contacted', 'Qualified', 'EOI received', 'Contract sent', 'Contract signed', 'Deposit 10% paid', 'Order confirmed']
const INTERNAL_ROLES = ['admin', 'staff', 'blacksales']
const PROJECTS_MAIL = 'projects@haavn.au'
const CHANNEL_KEY = 'hbsales'

const DEFAULTS = {
  rules: { QLD: 'mf', VIC: 'jb', other: 'jb' },
  agentKeep: true,
  prices: { studio: 0, plus: 0, max: 0 },
  spend: { Facebook: 0, Instagram: 0, LinkedIn: 0, 'Google search': 0, Other: 0 },
  notify: { chat: true, push: true, task: true },
  team: ['jb', 'mf'],
}

const lower = (v) => String(v == null ? '' : v).trim().toLowerCase()
const clean = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n)
const digits = (v) => String(v || '').replace(/\D/g, '')
const isMail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '')) && String(v).length <= 120
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const newId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const personName = (id) => { const p = A.PEOPLE.find((x) => x.id === id); return p ? p.name : '' }

// ---------- reading an enquiry ----------
const stateFrom = (v) => {
  const s = lower(v).replace(/\./g, '')
  if (!s) return ''
  for (const k of Object.keys(STATES)) if (s === lower(k) || s === lower(STATES[k])) return k
  for (const k of Object.keys(STATES)) if (s.includes(lower(STATES[k]))) return k
  if (/^(queensland|qld)/.test(s)) return 'QLD'
  if (/^(victoria|vic)/.test(s)) return 'VIC'
  return ''
}
const htmlToText = (h) => String(h || '').replace(/<(br|\/p|\/div|\/tr|\/li|\/h\d)\s*\/?>/gi, '\n').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
const ownMail = /(^|[.@])(haavnblack\.au|haavn\.au|7even\.au)$|no-?reply|noreply|mailer-daemon|postmaster/i

// text: the email's body (plain). meta: { from, subject }. Never throws; `complete` says whether there is enough to make a lead.
function parseEnquiry(text, meta = {}) {
  const f = {}
  String(text || '').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Za-z][A-Za-z _/-]{1,28}?)\s*[:=]\s*(.+?)\s*$/)
    if (m) f[m[1].toLowerCase().replace(/[^a-z]/g, '')] = m[2]
  })
  const g = (...ks) => { for (const k of ks) if (f[k]) return f[k]; return '' }
  const all = String(text || '')
  let first = clean(g('firstname', 'first'), 60), last = clean(g('lastname', 'last', 'surname'), 60)
  if (!first && g('name', 'fullname')) { const p = clean(g('name', 'fullname'), 120).split(' '); first = p.shift(); last = p.join(' ') }
  if (!first && meta.subject) { const m = String(meta.subject).match(/:\s*([^:]+)$/); if (m && !/enquiry|haavn/i.test(m[1])) { const p = clean(m[1], 120).split(' '); first = p.shift(); last = last || p.join(' ') } }
  let from = String(meta.from || '')
  if (!first && from) { const m = from.match(/^\s*"?([^"<]+?)"?\s*</); if (m && !/website|haavn|no-?reply/i.test(m[1])) { const p = clean(m[1], 120).split(' '); first = p.shift(); last = last || p.join(' ') } }
  let email = lower(g('email', 'emailaddress'))
  if (!isMail(email)) { email = ''; const found = (all.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).map(lower).find((e) => !ownMail.test(e)); if (found) email = found }
  if (!email && from) { const m = from.match(/<([^>]+)>/) || [null, from]; const e = lower(m[1]); if (isMail(e) && !ownMail.test(e)) email = e }
  let mobile = clean(g('phone', 'mobile', 'mobilenumber', 'phonenumber'), 30)
  if (!mobile) { const m = all.match(/(?:\+?61|0)[\s-]?[2-478](?:[\s-]?\d){8}/); if (m) mobile = m[0].trim() }
  const state = stateFrom(g('state', 'territory', 'stateterritory'))
  const model = lower(g('model', 'home', 'product', 'homechoice') + ' ' + (/octa/i.test(all) ? 'octa' : ''))
  let product = 'none'
  if (/octa/.test(model)) product = /max/.test(model) ? 'octamax' : /plus/.test(model) ? 'octaplus' : 'octa'
  else if (/studio/.test(model)) product = 'studio'; else if (/plus/.test(model)) product = 'plus'; else if (/max/.test(model)) product = 'max'
  const pickOf = (val, list) => list.find((k) => lower(val).includes(lower(k))) || ''
  const utm = lower(g('utmsource', 'source', 'utmmedium', 'leadsource', 'campaignsource'))
  let source = 'Website direct', otherSource = ''
  if (/face|meta|fb/.test(utm)) source = 'Facebook'; else if (/insta|^ig/.test(utm)) source = 'Instagram'; else if (/linked/.test(utm)) source = 'LinkedIn'
  else if (/google|search|cpc|ppc/.test(utm)) source = 'Google search'; else if (/agent|referral/.test(utm)) source = 'Agent referral'
  else if (utm && !/^(website|web|direct|organic|none|\(direct\))$/.test(utm)) { source = 'Other'; otherSource = clean(utm, 60) }
  const payv = g('preferredpayment', 'payment'), dv = g('delivery')
  const out = { first, last, email, mobile, state, setting: SETTING.find((x) => lower(x) === lower(g('setting'))) || '', product,
    clad: pickOf(g('cladding', 'externalfinish', 'exterior'), CLAD), pal: pickOf(g('palette', 'interior', 'internalfinish'), PAL), join: pickOf(g('joinery'), JOIN),
    pay: PAY.find((x) => lower(x) === lower(payv)) || 'No preference', deliv: DELIV.find((x) => lower(x) === lower(dv)) || 'No preference',
    msg: clean(g('message', 'comments', 'enquiry', 'notes'), 1500), source, otherSource, utm }
  out.complete = !!(out.first && (out.email || out.mobile))
  // a filled-in contact form has labelled name and contact lines; a plain email from someone does not and gets a human look first
  out.formLike = !!((f.firstname || f.name || f.fullname) && (f.email || f.phone || f.mobile || f.emailaddress))
  return out
}

// ---------- settings, routing, who is who ----------
async function getSettings(db) {
  let s = null
  try { s = await db.settings.get('sales') } catch { /* before the SQL has been run */ }
  return { ...DEFAULTS, ...(s || {}), rules: { ...DEFAULTS.rules, ...((s && s.rules) || {}) }, prices: { ...DEFAULTS.prices, ...((s && s.prices) || {}) }, spend: { ...DEFAULTS.spend, ...((s && s.spend) || {}) }, notify: { ...DEFAULTS.notify, ...((s && s.notify) || {}) } }
}
const routeOwner = (settings, state) => settings.rules[state] || settings.rules.other || 'jb'

async function whoAmI(session, db) {
  if (!session) throw new SalesError('signin', 401)
  if (INTERNAL_ROLES.includes(session.role)) return { kind: 'internal', id: session.sub, name: session.name, admin: session.role === 'admin', emails: session.emails || [] }
  const rows = await db.agents.byEmails((session.emails || []).map(lower).filter(Boolean))
  const row = rows.find((r) => (r.data || {}).active !== false)
  if (!row) throw new SalesError('You do not have access to the HAAVN BLACK sales pipeline yet. Ask Jamie or Mike to add you as an agent.', 403)
  const role = (row.data || {}).role || 'Salesperson'
  return { kind: 'agent', id: row.id, name: row.name, companyId: row.company_id, manager: ['Manager', 'Principal'].includes(role), emails: [row.email].filter(Boolean) }
}
const canSee = (w, lead) => w.kind === 'internal' || lead.owner === w.id || (w.manager && !!lead.companyId && lead.companyId === w.companyId)

// ---------- a lead, as the screen sees it ----------
const DATA_KEYS = ['first', 'last', 'email', 'mobile', 'setting', 'product', 'clad', 'pal', 'join', 'pay', 'deliv', 'msg', 'otherSource', 'utm', 'eng', 'cstage', 'lostWhy', 'chk', 'order', 'act', 'dates', 'maxStage', 'lastTouch', 'wfTaskId', 'site']
function leadOut(row) {
  const d = row.data || {}
  return { ...d, id: row.id, owner: row.owner || '', state: row.state || '', stage: row.stage || 0, status: row.status || 'open', source: row.source || 'Other', concept: !!row.concept,
    companyId: row.company_id || '', created: Date.parse(row.created_at) || 0, updated: Date.parse(row.updated_at) || 0 }
}
function leadRow(l, base) {
  const data = { ...((base && base.data) || {}) }
  for (const k of DATA_KEYS) if (l[k] !== undefined) data[k] = l[k]
  data.emailLower = lower(data.email); data.mobileDigits = digits(data.mobile)
  return { id: l.id, owner: l.owner || null, state: l.state || null, stage: Math.max(0, Math.min(7, Number(l.stage) || 0)), status: l.status === 'lost' ? 'lost' : 'open', source: l.source || 'Other', concept: !!l.concept,
    company_id: l.companyId || null, created_at: base ? base.created_at : new Date().toISOString(), updated_at: new Date().toISOString(), data }
}
const mergeAct = (a, b) => { const seen = new Set(); return [...(a || []), ...(b || [])].filter((x) => { const k = x.t + '|' + x.x; if (seen.has(k)) return false; seen.add(k); return true }).sort((x, y) => y.t - x.t).slice(0, 200) }
const wrapText = (v) => String(v || '').slice(0, 4000)

// ---------- telling people ----------
// A new lead: a Workflow task for the owner, a note in the HAAVN BLACK Sales channel in Chat, and a phone alert to the owner and the channel. Best effort: never loses the lead.
async function notifyNewLead(deps, lead, settings) {
  const out = { task: false, chat: false, push: 0 }
  const { chat, kv, wp } = deps
  const ownerName = personName(lead.owner)
  const nm = `${lead.first} ${lead.last}`.trim() || 'New enquiry'
  const homeName = { studio: 'SOLUM Studio', plus: 'SOLUM Plus', max: 'SOLUM Max', octa: 'OCTA', octaplus: 'OCTA Plus', octamax: 'OCTA Max', none: 'no home chosen' }[lead.product] || ''
  const fins = [lead.clad, lead.pal, lead.join].filter(Boolean).join(', ')
  const line = `${nm}, ${homeName}${fins ? ' in ' + fins : ''}. ${lead.state || 'State unknown'}. ${lead.mobile || lead.email || 'no contact details'}. Source: ${lead.source === 'Other' && lead.otherSource ? 'Other (' + lead.otherSource + ')' : lead.source}.`
  if (settings.notify.task && ownerName && kv && kv.update) {
    try {
      const made = await kv.update(B.KEYS.workflow, (ws) => B.addTask(ws, { title: lead.concept ? `Welcome ${nm} (OCTA concept enquiry)` : `Call ${nm} within 1 hour (HAAVN BLACK lead)`, owner: ownerName, due: new Date().toISOString().slice(0, 10), priority: 'High', dept: 'haavnblack', project: 'HAAVN BLACK Sales', notes: line }, 'HAAVN BLACK sales'))
      out.task = true; out.taskId = made && made.id
    } catch { /* the lead stands without a task */ }
  }
  if (!chat) return out
  let group = null, members = []
  try {
    group = await chat.findDm(CHANNEL_KEY)
    if (!group) {
      group = await chat.insertGroup({ name: 'HAAVN BLACK Sales', is_dm: false, is_private: true, owner: 'jb', project: 'HAAVN BLACK', dm_key: CHANNEL_KEY })
      await chat.insertMembers(settings.team.map((m) => ({ group_id: group.id, member: m, is_outside: false, hidden: false, added_by: 'jb' })))
    }
    members = (await chat.membersByGroups([group.id])).map((r) => r.member)
  } catch { group = null }
  if (settings.notify.chat && group) {
    try {
      await chat.insertMessage({ group_id: group.id, sender: settings.team[0] || 'jb', kind: 'system', body: `New HAAVN BLACK lead for ${ownerName || 'an agent'}: ${line}`, task: null, files: [] })
      out.chat = true
    } catch { /* ignore */ }
  }
  if (settings.notify.push && wp && chat.pushSubsFor) {
    try {
      const ids = [...new Set([lead.owner, ...members].filter(Boolean))]
      const subs = await chat.pushSubsFor(ids)
      const data = JSON.stringify({ title: `New HAAVN BLACK lead${lead.state ? ' (' + lead.state + ')' : ''}`, body: `${nm}, ${homeName}. ${ownerName ? 'For ' + ownerName + '.' : ''}`.slice(0, 140), tag: 'hbsales-' + lead.id, url: '/atrium-sales.html' })
      await Promise.allSettled(subs.map(async (s) => {
        try { await wp.send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data); out.push++ }
        catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) { try { await chat.deletePush(s.endpoint) } catch { /* ignore */ } } }
      }))
    } catch { /* ignore */ }
  }
  return out
}

// ---------- making a lead ----------
async function createLead(deps, p, opts = {}) {
  const { db } = deps
  const settings = opts.settings || await getSettings(db)
  const found = await db.leads.findByContact(p.email ? lower(p.email) : '', digits(p.mobile).length >= 8 ? digits(p.mobile) : '')
  if (found.length) {
    const row = found[0], l = leadOut(row)
    const note = { t: Date.now(), x: `Enquired again from ${p.source}${p.msg ? ': ' + p.msg.slice(0, 200) : '.'}`, k: 'note' }
    const saved = await db.leads.upsert(leadRow({ ...l, act: mergeAct(l.act, [note]), lastTouch: Date.now() }, row))
    return { lead: leadOut(saved), dup: true }
  }
  const concept = CONCEPT.includes(p.product)
  const state = STATES[p.state] ? p.state : ''
  const owner = opts.owner || routeOwner(settings, state)
  const now = Date.now()
  const lead = { id: newId('L'), first: p.first, last: p.last, email: p.email || '', mobile: p.mobile || '', state, setting: p.setting || 'Not sure yet', product: PRODUCTS.includes(p.product) ? p.product : 'none',
    clad: p.clad || '', pal: p.pal || '', join: p.join || '', pay: p.pay || 'No preference', deliv: p.deliv || 'No preference', msg: p.msg || '', source: SOURCES.includes(p.source) ? p.source : 'Other', otherSource: p.otherSource || '',
    utm: p.utm || '', owner, companyId: opts.companyId || '', stage: 0, maxStage: 0, dates: [now], lastTouch: now, status: 'open', lostWhy: '', concept, cstage: 0, eng: 20, chk: {},
    act: [{ t: now, x: `Enquiry received from ${p.source === 'Other' && p.otherSource ? 'Other (' + p.otherSource + ')' : p.source}${opts.how ? ' ' + opts.how : ''}.`, k: 'sys' }] }
  if (p.msg) lead.act.unshift({ t: now + 1, x: 'Their message: ' + p.msg.slice(0, 300), k: 'note' })
  let saved = await db.leads.upsert(leadRow(lead, null))
  let out = leadOut(saved)
  if (opts.notify !== false) {
    const n = await notifyNewLead(deps, out, settings)
    if (n.taskId) { out = leadOut(await db.leads.upsert(leadRow({ ...out, wfTaskId: n.taskId }, saved))) }
    out.notified = n
  }
  return { lead: out, dup: false }
}

// An email that arrived at sales@haavnblack.au (from the mailbox reader or from a forwarding rule). One email never makes two leads.
async function ingestEmail(deps, m) {
  const { db } = deps
  const messageId = clean(m.messageId, 300) || 'h' + require('crypto').createHash('sha1').update(String(m.from) + String(m.subject) + String(m.body)).digest('hex').slice(0, 24)
  if (await db.inbox.byMessage(messageId)) return { skipped: 'already seen' }
  const body = m.html && !m.body ? htmlToText(m.html) : String(m.body || '')
  const text = /<[a-z][\s\S]*>/i.test(body) ? htmlToText(body) : body
  const parsed = parseEnquiry(text, { from: m.from, subject: m.subject })
  const row = { id: newId('M'), message_id: messageId, received_at: m.receivedAt ? new Date(m.receivedAt).toISOString() : new Date().toISOString(), from_addr: clean(m.from, 200), subject: clean(m.subject, 250), body: text.slice(0, 20000), status: 'review', lead_id: null, note: '' }
  if (!parsed.complete || !parsed.formLike) { row.note = parsed.complete ? 'A plain email, not the website form. Check it and create the lead if it is a customer.' : 'Not enough to make a lead (needs a name and an email or mobile).'; await db.inbox.upsert(row); return { review: true } }
  const r = await createLead(deps, parsed, { how: 'by email' })
  row.status = 'lead'; row.lead_id = r.lead.id; row.note = r.dup ? 'This customer already existed, a note was added.' : ''
  await db.inbox.upsert(row)
  return { lead: r.lead, dup: r.dup }
}

// ---------- the actions ----------
async function companyOut(db, w) {
  const [cs, ag] = await Promise.all([db.companies.all(), db.agents.all()])
  const companies = cs.filter((c) => w.kind === 'internal' || c.id === w.companyId).map((c) => ({ id: c.id, name: c.name, ...(c.data || {}) }))
  const agents = ag.filter((a) => w.kind === 'internal' || a.company_id === w.companyId).map((a) => ({ id: a.id, companyId: a.company_id || '', name: a.name, email: a.email || '', ...(a.data || {}) }))
  return { companies, agents }
}
const validState = (s) => !!STATES[s]
function checkAbn(v) {
  const d = digits(v)
  if (d.length === 9) return 'ACN'
  if (d.length !== 11) return ''
  const w = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]; const n = d.split('').map(Number); n[0] -= 1
  return n.reduce((s, x, i) => s + x * w[i], 0) % 89 === 0 ? 'ABN' : ''
}

async function run(action, a, session, deps) {
  const { db } = deps
  const w = await whoAmI(session, db)
  const internal = w.kind === 'internal'
  switch (action) {
    case 'init': {
      const settings = await getSettings(db)
      const rows = await db.leads.all()
      const leads = rows.map(leadOut).filter((l) => canSee(w, l))
      const co = await companyOut(db, w)
      let inbox = [], mail = null
      if (internal) { try { inbox = await db.inbox.list(60) } catch { /* ignore */ } try { mail = await db.settings.get('mail') } catch { /* ignore */ } }
      return { me: { id: w.id, name: w.name, kind: w.kind, admin: !!w.admin, manager: !!w.manager, companyId: w.companyId || '' }, leads, ...co,
        settings: internal ? settings : { rules: {}, prices: settings.prices, spend: {}, notify: {}, team: settings.team }, inbox, mail, now: Date.now(),
        team: settings.team.map((id) => ({ id, name: personName(id) })), states: STATES }
    }
    case 'poll': {
      const since = Number(a.since) || 0
      const rows = await db.leads.since(new Date(Math.max(0, since - 2000)).toISOString())
      let inbox = [], mail = null
      if (internal) { try { inbox = await db.inbox.list(60) } catch { /* ignore */ } try { mail = await db.settings.get('mail') } catch { /* ignore */ } }
      return { leads: rows.map(leadOut).filter((l) => canSee(w, l)), inbox, mail, now: Date.now() }
    }
    case 'parse': return { parsed: parseEnquiry(String(a.text || '').slice(0, 20000), { from: a.from, subject: a.subject }) }
    case 'newLead': {
      const p = a.lead || {}
      const first = clean(p.first, 60)
      if (!first) throw new SalesError('Add a first name.')
      const state = STATES[p.state] ? p.state : ''
      const src = SOURCES.includes(p.source) ? p.source : (internal ? 'Other' : 'Agent referral')
      const base = { first, last: clean(p.last, 60), email: isMail(lower(p.email)) ? lower(p.email) : '', mobile: clean(p.mobile, 30), state, setting: SETTING.includes(p.setting) ? p.setting : '', product: PRODUCTS.includes(p.product) ? p.product : 'none',
        clad: CLAD.includes(p.clad) ? p.clad : '', pal: PAL.includes(p.pal) ? p.pal : '', join: JOIN.includes(p.join) ? p.join : '', pay: PAY.includes(p.pay) ? p.pay : 'No preference', deliv: DELIV.includes(p.deliv) ? p.deliv : 'No preference', msg: clean(p.msg, 1500), source: src, otherSource: clean(p.otherSource, 60), utm: '' }
      const r = await createLead(deps, base, internal ? { owner: clean(p.owner, 40) || undefined, how: 'added by ' + w.name } : { owner: w.id, companyId: w.companyId, how: 'added by ' + w.name })
      return { lead: r.lead, dup: r.dup }
    }
    case 'saveLead': {
      const incoming = a.lead || {}
      const row = await db.leads.get(incoming.id)
      if (!row) throw new SalesError('No such lead.', 404)
      const cur = leadOut(row)
      if (!canSee(w, cur)) throw new SalesError('That lead is not yours.', 403)
      const next = { ...cur }
      for (const k of DATA_KEYS) if (incoming[k] !== undefined && k !== 'act' && k !== 'wfTaskId') next[k] = incoming[k]
      next.act = mergeAct(cur.act, incoming.act)
      for (const k of ['state', 'stage', 'status', 'concept']) if (incoming[k] !== undefined) next[k] = incoming[k]
      if (!STATES[next.state]) next.state = cur.state
      if (!SOURCES.includes(next.source)) next.source = cur.source
      if (incoming.source !== undefined && internal && SOURCES.includes(incoming.source)) next.source = incoming.source
      if (incoming.owner !== undefined && incoming.owner !== cur.owner) {
        if (internal) { next.owner = incoming.owner; next.companyId = incoming.companyId !== undefined ? incoming.companyId : '' }
        else if (w.manager) { const ag = await db.agents.get(incoming.owner); if (ag && ag.company_id === w.companyId) { next.owner = ag.id; next.companyId = ag.company_id } }
      }
      if (!internal && cur.order && incoming.order) next.order = { ...incoming.order, step: cur.order.step, site: incoming.order.site !== undefined ? incoming.order.site : cur.order.site }
      next.maxStage = Math.max(cur.maxStage || 0, Math.min(7, Number(next.stage) || 0))
      next.stage = Math.max(0, Math.min(7, Number(next.stage) || 0))
      if (next.stage >= 7 && !next.order) next.order = { step: 0, eta: Date.now() + 77 * 864e5, site: '', lastUpdate: Date.now(), log: [{ t: Date.now(), x: 'Order confirmed.' }] }
      const saved = await db.leads.upsert(leadRow(next, row))
      return { lead: leadOut(saved) }
    }
    case 'companySave': {
      const c = a.company || {}
      if (!(internal)) throw new SalesError('Only the HAAVN BLACK team can add or change a company.', 403)
      const name = clean(c.name, 120)
      if (!name) throw new SalesError('Give the company a name.')
      const existing = c.id ? await db.companies.get(c.id) : null
      const idNo = digits(c.idNumber)
      const data = { tradingName: clean(c.tradingName, 120), legalName: clean(c.legalName, 160), idType: idNo.length === 9 ? 'ACN' : 'ABN', idNumber: idNo, idChecked: checkAbn(idNo), address: { street: clean(c.address && c.address.street, 160), suburb: clean(c.address && c.address.suburb, 80), state: STATES[c.address && c.address.state] ? c.address.state : '', postcode: digits(c.address && c.address.postcode).slice(0, 4) },
        landline: clean(c.landline, 30), mobile: clean(c.mobile, 30), email: isMail(lower(c.email)) ? lower(c.email) : '', website: clean(c.website, 120), licenceNo: clean(c.licenceNo, 40), licenceState: STATES[c.licenceState] ? c.licenceState : '', principal: clean(c.principal, 80),
        states: (Array.isArray(c.states) ? c.states : []).filter(validState), kind: c.kind === 'Internal team' ? 'Internal team' : 'Selling group', notes: clean(c.notes, 1000) }
      const row = await db.companies.upsert({ id: existing ? existing.id : newId('C'), name, created_at: existing ? existing.created_at : new Date().toISOString(), updated_at: new Date().toISOString(), data })
      return { company: { id: row.id, name: row.name, ...row.data } }
    }
    case 'agentSave': {
      const g = a.agent || {}
      const name = clean(g.name, 100)
      if (!name) throw new SalesError('Add the person\'s name.')
      const existing = g.id ? await db.agents.get(g.id) : null
      const companyId = clean(g.companyId, 60)
      if (!internal) {
        if (!w.manager) throw new SalesError('Only a manager can add salespeople to the company.', 403)
        if (companyId !== w.companyId) throw new SalesError('You can only add people to your own company.', 403)
        if (existing && existing.company_id !== w.companyId) throw new SalesError('That person is not in your company.', 403)
      }
      const email = lower(g.email)
      if (email && !isMail(email)) throw new SalesError('That email address does not look right.')
      if (!email) throw new SalesError('An email address is needed so they can sign in with Microsoft.')
      const dup = (await db.agents.byEmails([email])).find((r) => !existing || r.id !== existing.id)
      if (dup) throw new SalesError('Someone with that email is already an agent.')
      const data = { role: ['Principal', 'Manager', 'Salesperson'].includes(g.role) ? g.role : 'Salesperson', mobile: clean(g.mobile, 30), landline: clean(g.landline, 30), licenceNo: clean(g.licenceNo, 40), licenceState: STATES[g.licenceState] ? g.licenceState : '',
        states: (Array.isArray(g.states) ? g.states : []).filter(validState), active: g.active !== false, notes: clean(g.notes, 500), signIn: (existing && existing.data && existing.data.signIn) || 'pending' }
      const row = await db.agents.upsert({ id: existing ? existing.id : newId('a_'), company_id: companyId || null, email, name, created_at: existing ? existing.created_at : new Date().toISOString(), updated_at: new Date().toISOString(), data })
      // Microsoft sign in: an outside person can sign in once a director has added them. Best effort; the Agents screen shows whether it worked.
      let outside = ''
      try {
        if (deps.kv && data.active && internal && w.admin) { await O.add(deps.kv, null, { name: w.name }, { name, email }); outside = 'added' }
        else if (data.active) outside = 'needs a director'
      } catch (e) { outside = /already/i.test(String(e.message)) ? 'already' : 'failed' }
      return { agent: { id: row.id, companyId: row.company_id || '', name: row.name, email: row.email, ...row.data }, signIn: outside }
    }
    case 'settingsSave': {
      if (!w.admin) throw new SalesError('Only a director can change the sales settings.', 403)
      const s = a.settings || {}
      const cur = await getSettings(db)
      const rules = { ...cur.rules }
      for (const k of [...Object.keys(STATES), 'other']) if (s.rules && s.rules[k]) rules[k] = String(s.rules[k]).slice(0, 40)
      const num = (v) => Math.max(0, Math.min(1e8, Math.round(Number(String(v).replace(/[^0-9.]/g, '')) || 0)))
      const prices = { ...cur.prices }; for (const k of ['studio', 'plus', 'max']) if (s.prices && s.prices[k] !== undefined) prices[k] = num(s.prices[k])
      const spend = { ...cur.spend }; for (const k of Object.keys(cur.spend)) if (s.spend && s.spend[k] !== undefined) spend[k] = num(s.spend[k])
      const notify = { ...cur.notify }; for (const k of ['chat', 'push', 'task']) if (s.notify && s.notify[k] !== undefined) notify[k] = !!s.notify[k]
      const next = { rules, agentKeep: s.agentKeep !== undefined ? !!s.agentKeep : cur.agentKeep, prices, spend, notify, team: cur.team }
      await db.settings.set('sales', next)
      return { settings: next }
    }
    case 'inboxCreate': {
      if (!internal) throw new SalesError('Only the HAAVN BLACK team can use the inbox.', 403)
      const row = await db.inbox.get(a.id)
      if (!row) throw new SalesError('No such email.', 404)
      const p = a.parsed ? { ...parseEnquiry(row.body, { from: row.from_addr, subject: row.subject }), ...a.parsed } : parseEnquiry(row.body, { from: row.from_addr, subject: row.subject })
      if (!clean(p.first, 60) || !(p.email || p.mobile)) throw new SalesError('Add a name and an email or mobile first.')
      const r = await createLead(deps, p, { how: 'by email, added by ' + w.name })
      await db.inbox.upsert({ ...row, status: 'lead', lead_id: r.lead.id, note: r.dup ? 'This customer already existed, a note was added.' : '' })
      return { lead: r.lead, dup: r.dup }
    }
    case 'inboxDismiss': {
      if (!internal) throw new SalesError('Only the HAAVN BLACK team can use the inbox.', 403)
      const row = await db.inbox.get(a.id)
      if (!row) throw new SalesError('No such email.', 404)
      await db.inbox.upsert({ ...row, status: 'dismissed' })
      return { ok: true }
    }
    case 'emailCustomer': case 'handover': {
      const row = await db.leads.get(a.id)
      if (!row) throw new SalesError('No such lead.', 404)
      const l = leadOut(row)
      if (!canSee(w, l)) throw new SalesError('That lead is not yours.', 403)
      const mail = deps.mail
      if (!mail || !mail.configured) throw new SalesError('Email is not set up yet.', 503)
      const me0 = (w.emails || [])[0]
      let to, subject, text
      if (action === 'handover') {
        to = [PROJECTS_MAIL]; subject = `New HAAVN BLACK order: ${l.first} ${l.last}`
        const prod = { studio: 'SOLUM Studio', plus: 'SOLUM Plus', max: 'SOLUM Max' }[l.product] || l.product
        text = [`Order confirmed. Handover to the projects team.`, '', `Customer: ${l.first} ${l.last}`, `Mobile: ${l.mobile || '-'}`, `Email: ${l.email || '-'}`, `State: ${l.state || '-'}`, `Site: ${(l.order && l.order.site) || 'to be confirmed'}`,
          `Home: ${prod}`, `Cladding: ${l.clad || '-'}`, `Interior palette: ${l.pal || '-'}`, `Joinery: ${l.join || '-'}`, `Delivery: ${l.deliv}`, `Payment: ${l.pay}`, `Sales owner: ${personName(l.owner) || w.name}`, '', `Please confirm the production slot and send the customer an update every two weeks.`].join('\n')
      } else {
        if (!isMail(l.email)) throw new SalesError('This customer has no email address.')
        to = [l.email]; subject = clean(a.subject, 200) || 'Your HAAVN BLACK home'; text = String(a.body || '').slice(0, 5000)
        if (!text.trim()) throw new SalesError('Write the message first.')
      }
      const html = `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.55;color:#111"><div style="white-space:pre-wrap">${esc(text)}</div><p style="color:#888;font-size:12px;margin-top:24px">HAAVN BLACK. Sent by ${esc(w.name)}.</p></div>`
      try { await mail.send({ to, subject, html, replyTo: me0, replyName: w.name, bcc: me0 }) } catch (e) { throw new SalesError(String((e && e.message) || e).slice(0, 160), 502) }
      const note = { t: Date.now(), x: action === 'handover' ? `Handover sent to ${PROJECTS_MAIL}.` : `Emailed the customer: ${subject}.`, k: 'note' }
      const next = { ...l, act: mergeAct(l.act, [note]), lastTouch: Date.now() }
      if (action === 'handover') next.order = { ...(l.order || { step: 0, eta: Date.now() + 77 * 864e5, site: '', lastUpdate: Date.now(), log: [] }), handoverAt: Date.now() }
      const saved = await db.leads.upsert(leadRow(next, row))
      return { ok: true, lead: leadOut(saved) }
    }
    default: throw new SalesError('Unknown action.', 404)
  }
}

module.exports = { run, SalesError, parseEnquiry, ingestEmail, createLead, notifyNewLead, getSettings, routeOwner, whoAmI, canSee, leadOut, leadRow, htmlToText, stateFrom, checkAbn, STATES, SOURCES, STAGE_NAMES, DEFAULTS, mergeAct, CHANNEL_KEY, PROJECTS_MAIL }
