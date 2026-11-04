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
const STAGE_NAMES = ['Enquiry', 'Contacted', 'Qualified', 'Pre-order deposit', 'Contract out', 'Contract signed', '10% deposit paid', 'Order confirmed', 'Final payment', 'Delivered']
const LAST_STAGE = STAGE_NAMES.length - 1
const INTERNAL_ROLES = ['admin', 'staff', 'blacksales']
const PROJECTS_MAIL = 'projects@haavn.au'
const CHANNEL_KEY = 'hbsales'
const CONTRACT_KEY = 'hbcontract'

// The approvals. A gate is a step that needs a person's yes before the customer moves on. Contract admin (Alessia) and Finance (Amy, Dominika)
// are named in settings.approvers; a director may approve any gate. The money gates (pre, dep, final) first need the payment recorded as arrived.
//   pre      the pre-order deposit is in (Finance)          issue   issue the contract to the customer and the agent (Contract admin)
//   out      out for signature, waiting on the customer     signed  the signed contract is back, file it (Contract admin)
//   invoice  raise the 10% deposit invoice (Finance)        dep     the 10% deposit, less the pre-order deposit, is in (Finance)
//   confirm  confirm the order, hand over to projects (Contract admin)    final  the final 90% balance is in, before the home is delivered (Finance)
const GATES = {
  pre: { stage: 3, role: 'fin', money: true },
  issue: { stage: 4, role: 'con' },
  out: { stage: 4, role: 'con', wait: true },
  signed: { stage: 4, role: 'con' },
  invoice: { stage: 5, role: 'fin' },
  dep: { stage: 5, role: 'fin', money: true },
  confirm: { stage: 6, role: 'con' },
  final: { stage: 8, role: 'fin', money: true },
}
const GATE_BY_STAGE = { 3: 'pre', 4: 'out', 5: 'invoice', 6: 'confirm', 8: 'final' }   // a lead saved before approvals existed has no gate: it is where its stage puts it
const GATE_DONE = { pre: 'Pre-order deposit confirmed.', issue: 'Contract issued to the customer, copy to the agent.', signed: 'Signed contract filed. The pre-order deposit is now not refundable.', invoice: '10% deposit invoice raised.', dep: '10% order deposit confirmed.', confirm: 'Order confirmed.', final: 'Final payment confirmed. The home is released for delivery.' }
const ROLE_NAME = { fin: 'Finance (Amy or Dominika)', con: 'Alessia' }

const DEFAULTS = {
  rules: { QLD: 'mf', VIC: 'jb', other: 'jb' },
  agentKeep: true,
  prices: { studio: 145000, plus: 185000, max: 215000 },
  preorder: 2000,
  approvers: { con: ['ar'], fin: ['ab', 'dm'] },
  spend: { Facebook: 0, Instagram: 0, LinkedIn: 0, 'Google search': 0, Other: 0 },
  notify: { chat: true, push: true, task: true },
  team: ['jb', 'mf'],
  contractTeam: ['ar', 'ab', 'dm'],   // the HAAVN contract team: Alessia, Amy, Dominika. The first one owns the tasks, the rest are watchers and are told in their Chat group
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
  const SPACED = /^\s*(email|phone|mobile|state|setting|model|cladding|interior|palette|joinery|delivery|payment|message)\s+(.+?)\s*$/i
  String(text || '').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Za-z][A-Za-z _/-]{1,28}?)\s*[:=]\s*(.+?)\s*$/)
    if (m) f[m[1].toLowerCase().replace(/[^a-z]/g, '')] = m[2]
    else { const sp = line.match(SPACED); if (sp && !f[sp[1].toLowerCase()]) f[sp[1].toLowerCase()] = sp[2] }   // the website's own email: "Email name@example.com", "State Victoria"
  })
  const g = (...ks) => { for (const k of ks) if (f[k]) return f[k]; return '' }
  const all = String(text || '')
  let first = clean(g('firstname', 'first'), 60), last = clean(g('lastname', 'last', 'surname'), 60)
  if (!first && g('name', 'fullname')) { const p = clean(g('name', 'fullname'), 120).split(' '); first = p.shift(); last = p.join(' ') }
  if (!first && /^\s*new registration/im.test(all)) {
    const ls = all.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
    const at = ls.findIndex((x) => /^new registration/i.test(x))
    const cand = ls[at + 1]
    if (cand && !/^(contact|their solum)$/i.test(cand) && !/[@:]/.test(cand)) { const p = clean(cand, 120).split(' '); first = p.shift(); last = p.join(' ') }
  }
  if (!first && meta.subject && /^\s*registration\s*:/i.test(meta.subject)) { const m = String(meta.subject).match(/^\s*registration\s*:\s*([^·|]+)/i); if (m) { const p = clean(m[1], 120).split(' '); first = p.shift(); last = p.join(' ') } }
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
    clad: pickOf(g('cladding', 'externalfinish', 'exterior'), CLAD), pal: pickOf(g('palette', 'interior', 'internalfinish', 'interiorpalette'), PAL), join: pickOf(g('joinery'), JOIN),
    pay: PAY.find((x) => lower(x) === lower(payv)) || 'No preference', deliv: DELIV.find((x) => lower(x) === lower(dv)) || 'No preference',
    msg: clean(g('message', 'comments', 'enquiry', 'notes'), 1500), source, otherSource, utm }
  out.complete = !!(out.first && (out.email || out.mobile))
  // a filled-in contact form has labelled name and contact lines; a plain email from someone does not and gets a human look first
  out.formLike = !!((f.firstname || f.name || f.fullname) && (f.email || f.phone || f.mobile || f.emailaddress)) || (/^\s*new registration/im.test(all) && out.complete)
  return out
}

// ---------- settings, routing, who is who ----------
async function getSettings(db) {
  let s = null
  try { s = await db.settings.get('sales') } catch { /* before the SQL has been run */ }
  const sv = s || {}
  const price = (k) => Number(sv.prices && sv.prices[k]) || DEFAULTS.prices[k]   // a price never saved (or saved as 0) is the price we sell at
  const ap = (r) => (Array.isArray(sv.approvers && sv.approvers[r]) && sv.approvers[r].length ? sv.approvers[r] : DEFAULTS.approvers[r])
  return { ...DEFAULTS, ...sv, rules: { ...DEFAULTS.rules, ...(sv.rules || {}) }, prices: { studio: price('studio'), plus: price('plus'), max: price('max') }, preorder: Number(sv.preorder) || DEFAULTS.preorder, approvers: { con: ap('con'), fin: ap('fin') }, spend: { ...DEFAULTS.spend, ...(sv.spend || {}) }, notify: { ...DEFAULTS.notify, ...(sv.notify || {}) } }
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
const DATA_KEYS = ['first', 'last', 'email', 'mobile', 'setting', 'product', 'clad', 'pal', 'join', 'pay', 'deliv', 'msg', 'otherSource', 'utm', 'eng', 'cstage', 'lostWhy', 'chk', 'order', 'act', 'dates', 'maxStage', 'lastTouch', 'wfTaskId', 'adminTasks', 'site', 'gate', 'paid', 'gateAt', 'appr', 'ret', 'chased']
const SERVER_KEYS = ['act', 'wfTaskId', 'adminTasks', 'gate', 'paid', 'gateAt', 'appr', 'ret']   // a screen can never write these: only the rules below do
function leadOut(row) {
  const d = row.data || {}
  const stage = row.stage || 0
  const gate = d.gate === undefined ? (GATE_BY_STAGE[stage] || null) : (d.gate || null)
  return { ...d, id: row.id, owner: row.owner || '', state: row.state || '', stage, status: row.status || 'open', source: row.source || 'Other', concept: !!row.concept,
    companyId: row.company_id || '', created: Date.parse(row.created_at) || 0, updated: Date.parse(row.updated_at) || 0,
    gate: row.concept ? null : gate, paid: !!d.paid, gateAt: d.gateAt || (d.dates && d.dates[stage]) || d.lastTouch || Date.parse(row.created_at) || 0, appr: d.appr || [], ret: d.ret || null, chased: d.chased || 0 }
}
function leadRow(l, base) {
  const data = { ...((base && base.data) || {}) }
  for (const k of DATA_KEYS) if (l[k] !== undefined) data[k] = l[k]
  data.emailLower = lower(data.email); data.mobileDigits = digits(data.mobile)
  return { id: l.id, owner: l.owner || null, state: l.state || null, stage: Math.max(0, Math.min(LAST_STAGE, Number(l.stage) || 0)), status: l.status === 'lost' ? 'lost' : 'open', source: l.source || 'Other', concept: !!l.concept,
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
  const seen = await db.inbox.byMessage(messageId)
  if (seen && seen.status !== 'review') return { skipped: 'already seen' }
  const body = m.html && !m.body ? htmlToText(m.html) : String(m.body || '')
  const text = /<[a-z][\s\S]*>/i.test(body) ? htmlToText(body) : body
  const parsed = parseEnquiry(text, { from: m.from, subject: m.subject })
  const row = { id: seen ? seen.id : newId('M'), message_id: messageId, received_at: m.receivedAt ? new Date(m.receivedAt).toISOString() : new Date().toISOString(), from_addr: clean(m.from, 200), subject: clean(m.subject, 250), body: text.slice(0, 20000), status: 'review', lead_id: null, note: '' }
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

// ---------- the gates: moving a customer on, and telling the right person ----------
const money = (n) => '$' + Math.round(n).toLocaleString('en-AU')
const priceOf = (st, l) => (['studio', 'plus', 'max'].includes(l.product) ? (st.prices[l.product] || 0) : 0)
const tenPct = (st, l) => Math.round(priceOf(st, l) * 0.1)
const depBal = (st, l) => Math.max(0, tenPct(st, l) - st.preorder)        // the 10% deposit less the pre-order deposit already paid
const finalAmt = (st, l) => Math.max(0, priceOf(st, l) - tenPct(st, l))   // the full 90% balance, paid before the home is delivered
const gateAmount = (st, l, g) => (g === 'pre' ? st.preorder : g === 'invoice' || g === 'dep' ? depBal(st, l) : g === 'final' ? finalAmt(st, l) : 0)
const roleOf = (g) => GATES[g].role
const canApproveGate = (w, st, g) => !!GATES[g] && !GATES[g].wait && w.kind === 'internal' && (w.admin || (st.approvers[roleOf(g)] || []).includes(w.id))
const gatesFor = (w, st) => (w.kind === 'internal' ? Object.keys(GATES).filter((g) => canApproveGate(w, st, g)) : [])
const rolesFor = (w, st) => (w.kind === 'internal' ? ['con', 'fin'].filter((r) => w.admin || (st.approvers[r] || []).includes(w.id)) : [])

// put a lead at a stage (and the gate that stage opens with), and write down when it got there
function enterStage(l, stage, gate, at) {
  const dates = (l.dates || [l.created]).slice()
  for (let s = (l.maxStage || 0) + 1; s <= stage; s++) dates[s] = at
  l.stage = stage; l.gate = gate; l.paid = false; l.gateAt = at; l.ret = null; l.chased = 0; l.dates = dates; l.maxStage = Math.max(l.maxStage || 0, stage); l.lastTouch = at
  if (stage >= 7 && !l.order) l.order = { step: 0, eta: at + 77 * 864e5, site: '', lastUpdate: at, log: [{ t: at, x: 'Order confirmed.' }] }
}
// what happens when each gate is approved
const THEN = {
  pre: (l, at) => enterStage(l, 4, 'issue', at),
  issue: (l, at) => { l.gate = 'out'; l.gateAt = at; l.paid = false; l.chased = 0 },
  signed: (l, at) => enterStage(l, 5, 'invoice', at),
  invoice: (l, at) => { l.gate = 'dep'; l.paid = false; l.gateAt = at; l.chased = 0 },
  dep: (l, at) => enterStage(l, 6, 'confirm', at),
  confirm: (l, at) => enterStage(l, 7, null, at),
  final: (l, at) => enterStage(l, 9, null, at),
}
// the task a gate gives its approvers, made once per customer
const GATE_TASKS = {
  pre: (nm, l, st) => ({ title: `Confirm the ${money(st.preorder)} pre-order deposit: ${nm}`, days: 1, note: 'The pre-order was requested. When the deposit is in the bank, record it and approve it in Sales, Approvals.' }),
  issue: (nm) => ({ title: `Issue the contract: ${nm}`, days: 1, note: 'The pre-order deposit is confirmed. Check the home, finishes, price and port, then issue the contract to the customer with a copy to the sales agent.' }),
  signed: (nm) => ({ title: `File the signed contract: ${nm}`, days: 1, note: 'The customer has signed. Check every buyer signed, file it, and approve it in Sales, Approvals. The pre-order deposit is then not refundable.' }),
  invoice: (nm, l, st) => ({ title: `Raise the 10% deposit invoice: ${nm}${depBal(st, l) ? ' (' + money(depBal(st, l)) + ')' : ''}`, days: 1, note: 'Contract signed. The invoice is the 10% deposit less the pre-order deposit already paid.' }),
  confirm: (nm) => ({ title: `Confirm the order and hand over to projects: ${nm}`, days: 1, note: 'The 10% deposit is in. Confirm the order to the customer and the agent, approve it in Sales, Approvals, then send the handover to projects@haavn.au from the lead.' }),
  final: (nm, l, st) => ({ title: `Confirm the final payment: ${nm}${finalAmt(st, l) ? ' (' + money(finalAmt(st, l)) + ')' : ''}`, days: 3, note: 'The home is at the port. The full 90% balance is due before it is delivered. Record the payment when it arrives, then approve it in Sales, Approvals.' }),
}
// Tell the HAAVN contract team in their own Chat group (made the first time), with a phone alert to each of them.
async function tellContractTeam(deps, settings, text, tag) {
  const { chat, wp } = deps
  if (!chat || !settings.notify.chat) return
  try {
    let group = await chat.findDm(CONTRACT_KEY)
    const want = [...new Set([...settings.contractTeam, ...settings.team])]
    if (!group) {
      group = await chat.insertGroup({ name: 'HAAVN Contract Team', is_dm: false, is_private: true, owner: settings.team[0] || 'jb', project: 'HAAVN BLACK', dm_key: CONTRACT_KEY })
      await chat.insertMembers(want.map((m) => ({ group_id: group.id, member: m, is_outside: false, hidden: false, added_by: settings.team[0] || 'jb' })))
    } else {
      const have = new Set((await chat.membersByGroups([group.id])).map((r) => r.member))
      const add = want.filter((m) => !have.has(m))
      if (add.length) await chat.insertMembers(add.map((m) => ({ group_id: group.id, member: m, is_outside: false, hidden: false, added_by: settings.team[0] || 'jb' })))
    }
    await chat.insertMessage({ group_id: group.id, sender: settings.team[0] || 'jb', kind: 'system', body: text, task: null, files: [] })
    if (settings.notify.push && wp && chat.pushSubsFor) {
      const subs = await chat.pushSubsFor(want)
      const data = JSON.stringify({ title: 'HAAVN Contract Team', body: text.slice(0, 140), tag: 'hbcontract-' + tag, url: '/?chatopen=' + encodeURIComponent(group.id) })
      await Promise.allSettled(subs.map(async (s) => { try { await wp.send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data) } catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) { try { await chat.deletePush(s.endpoint) } catch { /* ignore */ } } } }))
    }
  } catch { /* the stage change stands without the note */ }
}

async function gateTasksFor(deps, settings, lead, gate) {
  const { kv } = deps
  const def = GATE_TASKS[gate]
  if (!def) return lead.adminTasks
  const done = { ...(lead.adminTasks || {}) }
  if (done[gate]) return done
  const owners = (settings.approvers[roleOf(gate)] || []).map(personName).filter(Boolean)
  if (!owners.length) return done
  const nm = `${lead.first} ${lead.last}`.trim()
  const t = def(nm, lead, settings)
  const due = new Date(Date.now() + t.days * 864e5).toISOString().slice(0, 10)
  const watchers = [...new Set([...(settings.contractTeam || []), ...(settings.approvers.con || []), ...(settings.approvers.fin || [])].map(personName).filter((n) => n && n !== owners[0]))]
  done[gate] = true
  if (settings.notify.task && kv && kv.update) {
    try {
      const made = await kv.update(B.KEYS.workflow, (ws) => {
        const r = B.addTask(ws, { title: t.title, owner: owners[0], due, priority: 'Medium', dept: 'haavnblack', project: 'HAAVN BLACK Sales', notes: t.note }, 'HAAVN BLACK sales')
        const task = r.next.actions.find((x) => x.id === r.result.id); if (task) task.watchers = watchers
        return { next: r.next, result: r.result }
      })
      done[gate] = (made && made.id) || true
    } catch { /* the stage change stands without the task */ }
  }
  await tellContractTeam(deps, settings, `${t.title}. ${t.note}`, lead.id + '-' + gate)
  return done
}
// a lead has just landed on a gate (a stage change, an approval, the home reaching the port): give the new gate its task
async function landedOn(deps, settings, lead) {
  return lead.gate ? gateTasksFor(deps, settings, lead, lead.gate) : lead.adminTasks
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
      return { me: { id: w.id, name: w.name, kind: w.kind, admin: !!w.admin, manager: !!w.manager, companyId: w.companyId || '', gates: gatesFor(w, settings), roles: rolesFor(w, settings) }, leads, ...co,
        settings: internal ? settings : { rules: {}, prices: settings.prices, preorder: settings.preorder, approvers: settings.approvers, spend: {}, notify: {}, team: settings.team }, inbox, mail, now: Date.now(),
        team: settings.team.map((id) => ({ id, name: personName(id) })), staff: internal ? A.PEOPLE.filter((p) => INTERNAL_ROLES.includes(p.role)).map((p) => ({ id: p.id, name: p.name })) : [], states: STATES }
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
      for (const k of DATA_KEYS) if (incoming[k] !== undefined && !SERVER_KEYS.includes(k)) next[k] = incoming[k]
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
      const to = Math.max(0, Math.min(LAST_STAGE, Number(next.stage) || 0)), at = Date.now()
      next.stage = cur.stage; next.gate = cur.gate; next.paid = cur.paid; next.gateAt = cur.gateAt; next.appr = cur.appr; next.ret = cur.ret
      let landed = false
      if (to !== cur.stage) {
        // A customer moves on by itself only through the early stages. Money and contract steps move on when the right person approves them.
        if (to < cur.stage) {
          if (!(internal && w.admin)) throw new SalesError('Only a director steps a customer back.', 403)
          next.stage = to; next.gate = GATE_BY_STAGE[to] || null; next.paid = false; next.gateAt = at; next.ret = null; next.chased = 0
          next.act = mergeAct(next.act, [{ t: at, x: `Stepped back to ${STAGE_NAMES[to]} by ${w.name}.`, k: 'sys' }])
        } else if (to === cur.stage + 1 && !cur.gate && !cur.concept && to <= 3) {
          enterStage(next, to, to === 3 ? 'pre' : null, at); landed = to === 3
        } else throw new SalesError(cur.gate ? 'That step needs an approval first. Use Approvals.' : 'A customer moves one stage at a time.', 409)
      }
      next.maxStage = Math.max(cur.maxStage || 0, next.stage)
      // the home reaching the port opens the final payment, and it is not delivered until that is approved
      if (next.order && cur.stage >= 7) {
        const step = Number(next.order.step) || 0
        if (step >= 6 && next.stage < 9) throw new SalesError('The final payment has to be confirmed before the home is delivered.', 409)
        if (step >= 5 && next.stage === 7) {
          enterStage(next, 8, 'final', at); landed = true
          next.act = mergeAct(next.act, [{ t: at, x: 'The home is at the port. The final payment is due before it is delivered.', k: 'sys' }])
        }
      }
      if (next.stage >= 7 && !next.order) next.order = { step: 0, eta: at + 77 * 864e5, site: '', lastUpdate: at, log: [{ t: at, x: 'Order confirmed.' }] }
      if (landed) next.adminTasks = await landedOn(deps, await getSettings(db), next)
      const saved = await db.leads.upsert(leadRow(next, row))
      return { lead: leadOut(saved) }
    }
    case 'gate': {
      // approve, return, resubmit, record that a payment arrived, record that the contract was signed
      const row = await db.leads.get(a.id)
      if (!row) throw new SalesError('No such lead.', 404)
      const cur = leadOut(row)
      if (!canSee(w, cur)) throw new SalesError('That lead is not yours.', 403)
      const settings = await getSettings(db)
      const at = Date.now(), g = cur.gate, op = String(a.op || '')
      const next = { ...cur }
      const nm = `${cur.first} ${cur.last}`.trim()
      const say = (x) => { next.act = mergeAct(cur.act, [{ t: at, x, k: 'sys' }]); next.lastTouch = at }
      const needGate = () => { if (!g || cur.concept || cur.status === 'lost') throw new SalesError('There is nothing waiting on this customer.', 409) }
      const needApprover = () => { if (!canApproveGate(w, settings, g)) throw new SalesError(`That one is for ${ROLE_NAME[roleOf(g)]} to ${op === 'approve' ? 'approve' : 'do'}.`, 403) }
      let landed = false
      if (op === 'approve') {
        needGate(); if (GATES[g].wait) throw new SalesError('Waiting for the customer. There is nothing to approve yet.', 409)
        needApprover()
        if (cur.ret) throw new SalesError('This customer was returned to the agent. It needs to be resubmitted first.', 409)
        if (GATES[g].money && !cur.paid) throw new SalesError('Record that the payment has arrived first.', 409)
        const note = clean(a.note, 300)
        next.appr = [{ g, by: w.id, name: w.name, at, note }, ...(cur.appr || [])].slice(0, 60)
        THEN[g](next, at)
        say(`${GATE_DONE[g]} Approved by ${w.name}.${note ? ' "' + note + '"' : ''}`)
        landed = true
      } else if (op === 'return') {
        needGate(); needApprover()
        const why = clean(a.why, 200); if (!why) throw new SalesError('Say why it is going back.')
        next.ret = { by: w.id, name: w.name, why, at }
        say(`Returned to ${personName(cur.owner) || 'the agent'} by ${w.name}: ${why}.`)
      } else if (op === 'resubmit') {
        if (!cur.ret) throw new SalesError('Nothing was returned.', 409)
        next.ret = null; next.gateAt = at
        say(`Resubmitted by ${w.name}.`)
      } else if (op === 'arrived') {
        needGate(); if (!GATES[g].money) throw new SalesError('No payment is expected at this step.', 409)
        needApprover()
        next.paid = true; next.gateAt = at
        say(`Payment recorded as arrived by ${w.name}. Waiting for approval.`)
      } else if (op === 'signed') {
        needGate(); if (g !== 'out') throw new SalesError('This customer is not out for signature.', 409)
        if (!internal) throw new SalesError('Only the HAAVN BLACK team records a signed contract.', 403)
        next.gate = 'signed'; next.gateAt = at; next.chased = 0
        say(`Signed contract received from ${nm}, recorded by ${w.name}.`)
        landed = true
      } else throw new SalesError('Unknown approval step.', 404)
      next.maxStage = Math.max(cur.maxStage || 0, next.stage)
      if (landed) next.adminTasks = await landedOn(deps, settings, next)
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
      const contractTeam = Array.isArray(s.contractTeam) ? [...new Set(s.contractTeam.filter((id) => A.PEOPLE.some((p) => p.id === id && INTERNAL_ROLES.includes(p.role))))] : cur.contractTeam
      const staffIds = (list) => [...new Set((Array.isArray(list) ? list : []).filter((id) => A.PEOPLE.some((p) => p.id === id && INTERNAL_ROLES.includes(p.role))))]
      const approvers = { con: s.approvers && s.approvers.con ? staffIds(s.approvers.con) : cur.approvers.con, fin: s.approvers && s.approvers.fin ? staffIds(s.approvers.fin) : cur.approvers.fin }
      if (!approvers.con.length || !approvers.fin.length) throw new SalesError('Choose at least one person for Contract admin and one for Finance.')
      const preorder = s.preorder !== undefined ? (num(s.preorder) || cur.preorder) : cur.preorder
      const next = { rules, agentKeep: s.agentKeep !== undefined ? !!s.agentKeep : cur.agentKeep, prices, preorder, approvers, spend, notify, team: cur.team, contractTeam }
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

module.exports = { run, SalesError, GATES, GATE_BY_STAGE, gateAmount, canApproveGate, enterStage, LAST_STAGE, parseEnquiry, ingestEmail, createLead, notifyNewLead, getSettings, routeOwner, whoAmI, canSee, leadOut, leadRow, htmlToText, stateFrom, checkAbn, STATES, SOURCES, STAGE_NAMES, DEFAULTS, mergeAct, CHANNEL_KEY, PROJECTS_MAIL }
