// HAAVN BLACK sales pipeline: the rules. Who may see what, how an enquiry email becomes a lead, who it goes to, and who is told.
// The app is public/atrium-sales.html; it only ever talks to /api/sales (api/sales.js), which signs people in with the same Microsoft session as Chat.
// Database: api/_utils/salesDb.js (supabase/2026-11-04_hb_sales.sql). Tests: src/lib/__tests__/sales.test.ts.
const A = require('./atriumAuth')
const B = require('./blaze')
const O = require('./outside')
const PREORDER = require('./preorderEmail')

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
const SALES_FROM = 'sales@haavn.au'   // the pre-order email goes out as this mailbox
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

const PRICES_V = 2   // a price list the code owns: until a director saves in Setup after this version, the prices below win over whatever was saved before. A save then records PRICES_V, so later edits stick. Bump it only to reset prices again.
const DEFAULTS = {
  rules: { QLD: 'mf', VIC: 'jb', other: 'jb' },
  agentKeep: true,
  prices: { studio: 145000, plus: 185000, max: 215000 },
  preorder: 2000,
  payLink: 'https://buy.stripe.com/3cIaEYdty4Nh9uM0qu1oI00',   // the Stripe page where the customer pays the pre-order deposit. The pre-order email's button opens it.
  approvers: { con: ['ar'], fin: ['ab', 'dm'] },
  spend: { Facebook: 0, Instagram: 0, LinkedIn: 0, 'Google search': 0, Other: 0 },
  spendFrom: '2026-11-01',
  notify: { chat: true, push: true, task: true },
  team: ['jb', 'mf'],
  commission: { rates: { int: { studio: 3000, plus: 4000, max: 5000 }, ext: { studio: 5000, plus: 6500, max: 8000 } }, off: [] },   // half when the 10% deposit is confirmed, half on delivery. off = people switched off
  inboxKeep: 0,   // days after which handled emails (turned into a lead, or dismissed) are cleared from the Inbox on their own; 0 = never
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
  let source = 'Facebook', otherSource = ''
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
  const reset = sv.pricesV !== PRICES_V
  const price = (k) => (reset ? 0 : Number(sv.prices && sv.prices[k])) || DEFAULTS.prices[k]   // a price never saved (or saved as 0, or saved before PRICES_V) is the price we sell at
  const ap = (r) => (Array.isArray(sv.approvers && sv.approvers[r]) && sv.approvers[r].length ? sv.approvers[r] : DEFAULTS.approvers[r])
  const cm = sv.commission || {}
  const cmRate = (kind, k) => { const v = Math.round(Number(cm.rates && cm.rates[kind] && cm.rates[kind][k])); return v > 0 ? v : DEFAULTS.commission.rates[kind][k] }
  const commission = { rates: { int: { studio: cmRate('int', 'studio'), plus: cmRate('int', 'plus'), max: cmRate('int', 'max') }, ext: { studio: cmRate('ext', 'studio'), plus: cmRate('ext', 'plus'), max: cmRate('ext', 'max') } }, off: Array.isArray(cm.off) ? cm.off.map(String).slice(0, 300) : [] }
  return { ...DEFAULTS, ...sv, commission, rules: { ...DEFAULTS.rules, ...(sv.rules || {}) }, prices: { studio: price('studio'), plus: price('plus'), max: price('max') }, preorder: Number(sv.preorder) || DEFAULTS.preorder, approvers: { con: ap('con'), fin: ap('fin') }, spend: { ...DEFAULTS.spend, ...(sv.spend || {}) }, notify: { ...DEFAULTS.notify, ...(sv.notify || {}) } }
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
const DATA_KEYS = ['first', 'last', 'email', 'mobile', 'setting', 'product', 'clad', 'pal', 'join', 'pay', 'deliv', 'msg', 'otherSource', 'utm', 'eng', 'cstage', 'lostWhy', 'chk', 'order', 'act', 'dates', 'maxStage', 'lastTouch', 'wfTaskId', 'adminTasks', 'site', 'gate', 'paid', 'gateAt', 'appr', 'ret', 'chased', 'srcMail', 'cpaid', 'chold', 'cnotes', 'clog', 'cfix', 'qual', 'asked', 'preMail']
const SERVER_KEYS = ['preMail', 'cpaid', 'chold', 'cnotes', 'clog', 'cfix', 'srcMail', 'act', 'wfTaskId', 'adminTasks', 'gate', 'paid', 'gateAt', 'appr', 'ret', 'asked']   // a screen can never write these: only the rules below do
function leadOut(row) {
  const { srcMail, cpaid, chold, cnotes, clog, cfix, ...d } = row.data || {}   // saved emails and commission never reach a screen with the customer
  const stage = row.stage || 0
  const gate = d.gate === undefined ? (GATE_BY_STAGE[stage] || null) : (d.gate || null)
  return { ...d, id: row.id, owner: row.owner || '', state: row.state || '', stage, status: row.status || 'open', source: row.source || 'Other', concept: !!row.concept,
    companyId: row.company_id || '', created: Date.parse(row.created_at) || 0, updated: Date.parse(row.updated_at) || 0,
    gate: row.concept ? null : gate, paid: !!d.paid, gateAt: d.gateAt || (d.dates && d.dates[stage]) || d.lastTouch || Date.parse(row.created_at) || 0, appr: d.appr || [], ret: d.ret || null, chased: d.chased || 0, hasMail: !!(Array.isArray(srcMail) && srcMail.length) }
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
// The email a lead came from is kept on the customer (newest first, a few at most), so the Inbox can be cleared without losing it.
const keepMail = (list, m) => [{ subject: clean(m.subject, 250), from: clean(m.from, 200), at: m.at || Date.now(), body: String(m.body || '').slice(0, 6000) }, ...(Array.isArray(list) ? list : [])].slice(0, 5)
async function createLead(deps, p, opts = {}) {
  const { db } = deps
  const settings = opts.settings || await getSettings(db)
  const found = await db.leads.findByContact(p.email ? lower(p.email) : '', digits(p.mobile).length >= 8 ? digits(p.mobile) : '')
  if (found.length) {
    const row = found[0], l = leadOut(row)
    const note = { t: Date.now(), x: `Enquired again from ${p.source}${p.msg ? ': ' + p.msg.slice(0, 200) : '.'}`, k: 'note' }
    const saved = await db.leads.upsert(leadRow({ ...l, act: mergeAct(l.act, [note]), lastTouch: Date.now(), ...(opts.mail ? { srcMail: keepMail(row.data && row.data.srcMail, opts.mail) } : {}) }, row))
    return { lead: leadOut(saved), dup: true }
  }
  const concept = CONCEPT.includes(p.product)
  const state = STATES[p.state] ? p.state : ''
  const owner = opts.owner || routeOwner(settings, state)
  const now = Date.now()
  const lead = { id: newId('L'), first: p.first, last: p.last, email: p.email || '', mobile: p.mobile || '', state, setting: p.setting || 'Not sure yet', product: PRODUCTS.includes(p.product) ? p.product : 'none',
    clad: p.clad || '', pal: p.pal || '', join: p.join || '', asked: { product: PRODUCTS.includes(p.product) ? p.product : 'none', clad: p.clad || '', pal: p.pal || '', join: p.join || '' }, pay: p.pay || 'No preference', deliv: p.deliv || 'No preference', msg: p.msg || '', source: SOURCES.includes(p.source) ? p.source : 'Other', otherSource: p.otherSource || '',
    utm: p.utm || '', owner, companyId: opts.companyId || '', stage: 0, maxStage: 0, dates: [now], lastTouch: now, status: 'open', lostWhy: '', concept, cstage: 0, eng: 20, chk: {},
    act: [{ t: now, x: `Enquiry received from ${p.source === 'Other' && p.otherSource ? 'Other (' + p.otherSource + ')' : p.source}${opts.how ? ' ' + opts.how : ''}.`, k: 'sys' }] }
  if (p.msg) lead.act.unshift({ t: now + 1, x: 'Their message: ' + p.msg.slice(0, 300), k: 'note' })
  if (opts.mail) lead.srcMail = keepMail([], opts.mail)
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
  const r = await createLead(deps, parsed, { how: 'by email', mail: { subject: row.subject, from: row.from_addr, at: Date.parse(row.received_at) || Date.now(), body: row.body } })
  row.status = 'lead'; row.lead_id = r.lead.id; row.note = r.dup ? 'This customer already existed, a note was added.' : ''
  await db.inbox.upsert(row)
  return { lead: r.lead, dup: r.dup }
}

// ---------- clearing the Inbox ----------
// A cleared email leaves a small marker (no text) for a few days, because the mailbox reader looks back three days and would otherwise read it in again.
const MARKER_DAYS = 5
const handled = (r) => r.status === 'lead' || r.status === 'dismissed'
async function clearInboxRow(db, row) {
  if (Date.now() - (Date.parse(row.received_at) || 0) > MARKER_DAYS * 864e5) await db.inbox.remove(row.id)
  else await db.inbox.upsert({ id: row.id, message_id: row.message_id, received_at: row.received_at, status: 'cleared', lead_id: row.lead_id || null, from_addr: '', subject: '', body: '', note: '' })
}
// every handled email older than `days` (0 = all of them now); returns how many were cleared
async function clearHandled(db, days) {
  const cut = Date.now() - Math.max(0, Number(days) || 0) * 864e5
  const rows = (await db.inbox.list(500)).filter((r) => handled(r) && (Date.parse(r.received_at) || 0) <= cut)
  for (const r of rows) await clearInboxRow(db, r)
  return rows.length
}
// run with every mailbox check: the automatic clear-out, and the old markers going for good
async function tidyInbox(deps) {
  const { db } = deps
  const out = { cleared: 0 }
  try {
    const st = await getSettings(db)
    if (st.inboxKeep > 0) out.cleared = await clearHandled(db, st.inboxKeep)
    await db.inbox.purgeMarkers(new Date(Date.now() - MARKER_DAYS * 864e5).toISOString())
  } catch { /* never stops the mailbox check */ }
  return out
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

// ---------- commission ----------
// Internal sales and external agents are paid commission on each SOLUM sale in two halves: the first when the 10% deposit is confirmed (the contract is unconditional),
// the second when the home is delivered. An external agent, or anyone who brings in their own lead (source Agent referral), earns the external rate.
// Directors and the admin team see everyone; Finance and directors mark payments; each agent sees only their own. Commission never rides on the customer sent to a screen
// (see leadOut): it only leaves this file through the `commission` action, filtered by who is asking.
const HOME_KEYS = ['studio', 'plus', 'max']
const isFinance = (w, st) => w.kind === 'internal' && (w.admin || st.approvers.fin.includes(w.id))
const isOffice = (w, st) => w.kind === 'internal' && (w.admin || st.approvers.fin.includes(w.id) || st.approvers.con.includes(w.id) || (st.contractTeam || []).includes(w.id))
const commissionRole = (w, st) => (isOffice(w, st) ? 'office' : w.kind === 'agent' || st.team.includes(w.id) ? 'agent' : 'none')
// the rate is fixed when the first half falls due, so changing a rate later never alters what is already owed
function lockCommissionRate(l, st) {
  if (l.cfix || !HOME_KEYS.includes(l.product)) return
  const ext = !st.team.includes(l.owner) || l.source === 'Agent referral'
  l.cfix = { rate: st.commission.rates[ext ? 'ext' : 'int'][l.product], ext, at: Date.now() }
}
// one customer's commission, from the raw row. null when none is earned (no pre-order yet, not SOLUM, lost, or the owner is switched off) unless something was already paid.
function commissionLine(row, st) {
  const raw = row.data || {}, l = leadOut(row), pd = raw.cpaid || {}
  if (l.concept || !HOME_KEYS.includes(l.product)) return null
  const anyPaid = !!(pd.h1 || pd.h2)
  if (!anyPaid && ((l.maxStage || 0) < 3 || l.status === 'lost' || st.commission.off.includes(l.owner))) return null
  const kind = st.team.includes(l.owner) ? 'internal' : 'external'
  const own = l.source === 'Agent referral', fix = raw.cfix
  const ext = fix ? !!fix.ext : (kind === 'external' || own)
  const rate = fix ? fix.rate : st.commission.rates[ext ? 'ext' : 'int'][l.product]
  const a1 = Math.round(rate / 2), a2 = rate - a1, o = l.order || {}
  const reach1 = (l.maxStage || 0) >= 6, reach2 = (Number(o.step) || 0) >= 6
  const at1 = reach1 ? ((l.dates && l.dates[6]) || l.lastTouch || 0) : 0
  const at2 = reach2 ? (o.deliveredAt || (l.dates && l.dates[9]) || l.lastTouch || 0) : 0
  const half = (n, amt, reach, at) => { const r = pd['h' + n]; return { n, amt, st: !reach ? 'later' : r ? 'paid' : raw.chold ? 'hold' : 'due', at, paidAt: r ? r.at : 0, by: r ? r.by : '', byName: r ? r.name : '', ref: r ? (r.ref || '') : '' } }
  return { id: l.id, owner: l.owner, kind, own, ext, rate, locked: !!fix, first: l.first, last: l.last, home: l.product, state: l.state, stage: l.stage, status: l.status, hold: !!raw.chold, h: [half(1, a1, reach1, at1), half(2, a2, reach2, at2)],
    notes: raw.cnotes || [], log: raw.clog || [] }
}
// what an agent may see of their own deal: the halves and when they were paid, notes shared with them, no staff names, no office notes, no history of undos or holds
function agentView(c) {
  return { ...c, h: c.h.map((x) => ({ n: x.n, amt: x.amt, st: x.st, at: x.at, paidAt: x.paidAt })), notes: c.notes.filter((n) => n.shared).map((n) => ({ at: n.at, x: n.x })),
    log: c.h.filter((x) => x.st === 'paid').map((x) => ({ at: x.paidAt, x: (x.n === 1 ? 'First half' : 'Final payment') + ' paid' })) }
}
async function commissionContext(db, st) {
  const [agents, companies] = await Promise.all([db.agents.all(), db.companies.all()])
  const coName = (id) => { const c = companies.find((x) => x.id === id); return c ? c.name : 'Selling agents' }
  const agent = (id) => agents.find((x) => x.id === id)
  const nameOf = (id) => personName(id) || (agent(id) && agent(id).name) || 'Unknown'
  const groupOf = (id) => (st.team.includes(id) ? 'HAAVN BLACK Direct' : agent(id) ? coName(agent(id).company_id) : 'Selling agents')
  return { agents, nameOf, groupOf, coName }
}
async function commissionPayload(w, st, db) {
  const role = commissionRole(w, st)
  if (role === 'none') throw new SalesError('Commission is for the team and the selling agents.', 403)
  const ctx = await commissionContext(db, st), rows = await db.leads.all(), office = role === 'office'
  let lines = rows.map((r) => commissionLine(r, st)).filter(Boolean)
  if (!office) lines = lines.filter((c) => c.owner === w.id)
  lines = lines.map((c) => ({ ...(office ? c : agentView(c)), ownerName: ctx.nameOf(c.owner), group: ctx.groupOf(c.owner) }))
  const ext = !office && w.kind === 'agent'
  const out = { role, canPay: isFinance(w, st), canEdit: !!w.admin, rates: ext ? { ext: st.commission.rates.ext } : st.commission.rates, lines }
  if (office) out.earners = [...st.team.map((id) => ({ id, name: personName(id) || id, kind: 'internal', group: 'HAAVN BLACK Direct', on: !st.commission.off.includes(id), active: true })),
    ...ctx.agents.map((a) => ({ id: a.id, name: a.name, kind: 'external', group: ctx.coName(a.company_id), on: !st.commission.off.includes(a.id), active: (a.data || {}).active !== false }))]
  return out
}
// change one deal's commission record (payments, hold, notes, history) and save it
async function dealWrite(db, row, mutate) {
  const raw = row.data || {}
  const next = { ...leadOut(row), cpaid: { ...(raw.cpaid || {}) }, chold: !!raw.chold, cnotes: [...(raw.cnotes || [])], clog: [...(raw.clog || [])], cfix: raw.cfix }
  mutate(next)
  next.clog = next.clog.slice(0, 200); next.cnotes = next.cnotes.slice(0, 100)
  return db.leads.upsert(leadRow(next, row))
}
async function commissionDeal(db, st, id) {
  const row = await db.leads.get(String(id || ''))
  const line = row && commissionLine(row, st)
  if (!line) throw new SalesError('There is no commission on that customer.', 404)
  return { row, line }
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
      return { me: { id: w.id, name: w.name, kind: w.kind, admin: !!w.admin, manager: !!w.manager, companyId: w.companyId || '', gates: gatesFor(w, settings), roles: rolesFor(w, settings), commission: commissionRole(w, settings) }, leads, ...co,
        settings: internal ? (({ commission, ...rest }) => rest)(settings) : { rules: {}, prices: settings.prices, preorder: settings.preorder, approvers: settings.approvers, spend: {}, notify: {}, team: settings.team }, inbox, mail, now: Date.now(),
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
      // The home and its finishes are the website's own choices. The home follows the price, so it is fixed once the contract is out
      // (a director can still change it until the 10% deposit is paid) and every change is written to the customer's log.
      {
        const tNow = Date.now(), changes = [], settingsNow = await getSettings(db)
        const HOME_NAME = { studio: 'SOLUM Studio', plus: 'SOLUM Plus', max: 'SOLUM Max', octa: 'OCTA concept', octaplus: 'OCTA Plus concept', octamax: 'OCTA Max concept', none: 'no home chosen' }
        if (incoming.product !== undefined && incoming.product !== cur.product) {
          if (!PRODUCTS.includes(incoming.product)) throw new SalesError('That is not a home we sell.')
          if (!cur.concept && (cur.stage >= 6 || cur.cfix)) throw new SalesError('The 10% deposit has been paid, so the home is fixed. A change now needs a new contract.', 409)
          if (!cur.concept && cur.stage >= 4 && !(internal && w.admin)) throw new SalesError('The contract is out, so only a director can change the home.', 403)
          next.product = incoming.product; next.concept = CONCEPT.includes(incoming.product)
          const pr = priceOf(settingsNow, next)
          changes.push({ t: tNow, x: `Home changed from ${HOME_NAME[cur.product] || cur.product} to ${HOME_NAME[next.product]} by ${w.name}.${pr ? ' The price is now ' + money(pr) + '.' : ''}`, k: 'sys' })
        } else next.product = cur.product
        for (const [k, list, label] of [['clad', CLAD, 'Cladding'], ['pal', PAL, 'Interior palette'], ['join', JOIN, 'Joinery']]) {
          if (incoming[k] === undefined) { next[k] = cur[k]; continue }
          const v = incoming[k] === '' ? '' : list.includes(incoming[k]) ? incoming[k] : (cur[k] || '')   // anything that is not the website's own choice is ignored
          if (v !== (cur[k] || '')) {
            if (cur.stage >= 7 && !internal) throw new SalesError('The order is confirmed, so the projects team holds the finishes. Ask them to change it.', 403)
            changes.push({ t: tNow, x: v ? `${label} ${cur[k] ? 'changed from ' + cur[k] + ' to ' + v : 'set to ' + v} by ${w.name}.` : `${label} cleared by ${w.name}.`, k: 'sys' })
          }
          next[k] = v
        }
        if (changes.length) {
          if (!cur.asked) next.asked = { product: cur.product, clad: cur.clad || '', pal: cur.pal || '', join: cur.join || '' }
          next.act = mergeAct(next.act, changes); next.lastTouch = tNow
        }
      }
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
      if (next.order && cur.order && cur.order.deliveredAt) next.order = { ...next.order, deliveredAt: cur.order.deliveredAt }
      else if (!internal && next.order && next.order.deliveredAt) { const { deliveredAt, ...rest } = next.order; next.order = rest }
      if (next.order && cur.stage >= 7 && (Number(next.order.step) || 0) >= 6 && !next.order.deliveredAt) next.order = { ...next.order, deliveredAt: at }
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
        if (g === 'dep') lockCommissionRate(next, settings)
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
    case 'commission': return commissionPayload(w, await getSettings(db), db)
    case 'commissionPay': case 'commissionUndo': case 'commissionHold': case 'commissionNote': {
      const st = await getSettings(db)
      if (!isFinance(w, st)) throw new SalesError('Finance and directors manage commission payments.', 403)
      const { row, line } = await commissionDeal(db, st, a.id), at = Date.now(), n = Number(a.half), nm = n === 1 ? 'First half' : 'Final payment'
      const owner = line.owner, hh = line.h[n - 1]
      let saved
      if (action === 'commissionPay') {
        if (![1, 2].includes(n)) throw new SalesError('Choose the first half or the final payment.')
        if (line.hold) throw new SalesError('This commission is on hold. Release the hold first.', 409)
        if (hh.st === 'paid') throw new SalesError('That is already marked paid.', 409)
        if (hh.st === 'later') throw new SalesError(n === 1 ? 'The first half falls due when the 10% deposit is confirmed.' : 'The final payment falls due when the home is delivered.', 409)
        if (n === 2 && line.h[0].st !== 'paid') throw new SalesError('Pay the first half before the final payment.', 409)
        const ref = clean(a.ref, 80)
        saved = await dealWrite(db, row, (x) => { if (!x.cfix) x.cfix = { rate: line.rate, ext: line.ext, at }; x.cpaid['h' + n] = { at, by: w.id, name: w.name, ref }; x.clog.unshift({ at, by: w.id, name: w.name, x: `${nm} of ${money(hh.amt)} marked paid${ref ? ', ref ' + ref : ''}` }) })
      } else if (action === 'commissionUndo') {
        if (![1, 2].includes(n)) throw new SalesError('Choose the first half or the final payment.')
        const reason = clean(a.reason, 200); if (!reason) throw new SalesError('Say why it is being undone.')
        if (hh.st !== 'paid') throw new SalesError('That payment is not marked paid.', 409)
        if (n === 1 && line.h[1].st === 'paid') throw new SalesError('Undo the final payment first.', 409)
        saved = await dealWrite(db, row, (x) => { delete x.cpaid['h' + n]; x.clog.unshift({ at, by: w.id, name: w.name, x: `${nm} payment undone: ${reason}` }) })
      } else if (action === 'commissionHold') {
        const hold = !!a.hold, reason = clean(a.reason, 200)
        if (hold && !reason) throw new SalesError('Say why it is being held.')
        if (hold && line.h.every((x) => x.st === 'paid')) throw new SalesError('Both halves are already paid.', 409)
        if (hold === line.hold) throw new SalesError(hold ? 'It is already on hold.' : 'It is not on hold.', 409)
        saved = await dealWrite(db, row, (x) => { x.chold = hold; x.clog.unshift({ at, by: w.id, name: w.name, x: hold ? `Commission put on hold: ${reason}` : `Hold released${reason ? ': ' + reason : ''}` }) })
      } else {
        const text = clean(a.text, 600); if (!text) throw new SalesError('Write the note first.')
        saved = await dealWrite(db, row, (x) => { x.cnotes.unshift({ at, by: w.id, name: w.name, x: text, shared: !!a.shared }) })
      }
      const ctx = await commissionContext(db, st), fresh = commissionLine(saved, st)
      return { line: { ...fresh, ownerName: ctx.nameOf(owner), group: ctx.groupOf(owner) } }
    }
    case 'commissionSettings': {
      if (!w.admin) throw new SalesError('Only a director changes commission.', 403)
      const cur = await getSettings(db), s = a.commission || {}
      const rates = JSON.parse(JSON.stringify(cur.commission.rates))
      for (const kind of ['int', 'ext']) for (const k of HOME_KEYS) if (s.rates && s.rates[kind] && s.rates[kind][k] !== undefined) {
        const v = Math.round(Number(String(s.rates[kind][k]).replace(/[^0-9.]/g, '')))
        if (!(v > 0 && v <= 100000)) throw new SalesError('A commission rate has to be between $1 and $100,000.')
        rates[kind][k] = v
      }
      let off = cur.commission.off
      if (Array.isArray(s.off)) { const known = new Set([...cur.team, ...(await db.agents.all()).map((x) => x.id)]); off = [...new Set(s.off.map(String).filter((id) => known.has(id)))] }
      await db.settings.set('sales', { ...cur, pricesV: PRICES_V, commission: { rates, off } })
      return { rates, off }
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
      const inboxKeep = s.inboxKeep !== undefined && [0, 7, 14, 30, 60].includes(Number(s.inboxKeep)) ? Number(s.inboxKeep) : cur.inboxKeep
      const spendFrom = /^\d{4}-\d{2}-\d{2}$/.test(String(s.spendFrom || '')) ? String(s.spendFrom) : cur.spendFrom
      const payLink = s.payLink !== undefined ? (/^https:\/\/[^\s]{4,290}$/.test(String(s.payLink).trim()) ? String(s.payLink).trim() : cur.payLink) : cur.payLink
      const next = { pricesV: PRICES_V, commission: cur.commission, inboxKeep, spendFrom, payLink, rules, agentKeep: s.agentKeep !== undefined ? !!s.agentKeep : cur.agentKeep, prices, preorder, approvers, spend, notify, team: cur.team, contractTeam }
      await db.settings.set('sales', next)
      return { settings: next }
    }
    case 'inboxCreate': {
      if (!internal) throw new SalesError('Only the HAAVN BLACK team can use the inbox.', 403)
      const row = await db.inbox.get(a.id)
      if (!row) throw new SalesError('No such email.', 404)
      const p = a.parsed ? { ...parseEnquiry(row.body, { from: row.from_addr, subject: row.subject }), ...a.parsed } : parseEnquiry(row.body, { from: row.from_addr, subject: row.subject })
      if (!clean(p.first, 60) || !(p.email || p.mobile)) throw new SalesError('Add a name and an email or mobile first.')
      const r = await createLead(deps, p, { how: 'by email, added by ' + w.name, mail: { subject: row.subject, from: row.from_addr, at: Date.parse(row.received_at) || Date.now(), body: row.body } })
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
    case 'inboxClear': {
      if (!internal) throw new SalesError('Only the HAAVN BLACK team can use the inbox.', 403)
      const row = await db.inbox.get(a.id)
      if (!row) throw new SalesError('No such email.', 404)
      await clearInboxRow(db, row)
      return { ok: true }
    }
    case 'inboxClearHandled': {
      if (!internal) throw new SalesError('Only the HAAVN BLACK team can use the inbox.', 403)
      return { cleared: await clearHandled(db, a.days) }
    }
    case 'leadMail': {
      if (!internal) throw new SalesError('Only the HAAVN BLACK team can read the original emails.', 403)
      const row = await db.leads.get(a.id)
      if (!row) throw new SalesError('No such customer.', 404)
      return { mail: (row.data && Array.isArray(row.data.srcMail)) ? row.data.srcMail : [] }
    }
    case 'preorderEmail': {
      // The pre-order email, from sales@haavn.au, with the customer's home and finishes filled in and the Stripe payment link on the button.
      // mode: 'preview' (nothing sent), 'test' (sent to the person asking), 'send' (sent to the customer, noted on the lead, copy to the agent).
      const row = await db.leads.get(a.id)
      if (!row) throw new SalesError('No such lead.', 404)
      const l = leadOut(row)
      if (!canSee(w, l)) throw new SalesError('That lead is not yours.', 403)
      const mode = ['preview', 'test', 'send'].includes(a.mode) ? a.mode : 'preview'
      const settings = await getSettings(db)
      const mail = deps.mail
      const built = PREORDER.build(l, settings, { base: deps.base })
      if (!built.ok) throw new SalesError(built.why, 409)
      const from = process.env.SALES_SEND_FROM || SALES_FROM
      const me0 = (w.emails || [])[0]
      const meta = { subject: built.subject, from, to: l.email || '', fields: built.fields, missing: built.missing, sent: l.preMail || null, configured: !!(mail && mail.configured) }
      if (mode === 'preview') return { ...meta, html: built.html }
      if (!mail || !mail.configured) throw new SalesError('Email is not set up yet.', 503)
      if (mode === 'test') {
        if (!isMail(me0)) throw new SalesError('Your sign-in has no email address to send the test to.')
        try { await mail.send({ from, to: [me0], subject: '[TEST] ' + built.subject, html: built.html }) } catch (e) { throw new SalesError(String((e && e.message) || e).slice(0, 160), 502) }
        return { ok: true, sentTo: me0 }
      }
      if (!isMail(l.email)) throw new SalesError('This customer has no email address.')
      try { await mail.send({ from, to: [l.email], subject: built.subject, html: built.html, replyTo: isMail(me0) ? me0 : from, replyName: isMail(me0) ? w.name : undefined, bcc: isMail(me0) ? me0 : undefined }) } catch (e) { throw new SalesError(String((e && e.message) || e).slice(0, 160), 502) }
      const at = Date.now()
      const note = { t: at, x: `${l.preMail ? 'Pre-order email sent again' : 'Pre-order email sent'} to ${l.email} from ${from} by ${w.name}, with the ${money(settings.preorder)} payment link. ${built.fields.model}, ${built.fields.exterior} exterior, ${built.fields.interior} interior, ${built.fields.joinery} joinery.`, k: 'note' }
      const next = { ...l, preMail: { at, by: w.name, to: l.email, n: ((l.preMail && l.preMail.n) || 0) + 1 }, act: mergeAct(l.act, [note]), lastTouch: at }
      const saved = await db.leads.upsert(leadRow(next, row))
      return { ok: true, lead: leadOut(saved) }
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

module.exports = { commissionLine, commissionRole, isFinance, tidyInbox, clearHandled, run, SalesError, GATES, GATE_BY_STAGE, gateAmount, canApproveGate, enterStage, LAST_STAGE, parseEnquiry, ingestEmail, createLead, notifyNewLead, getSettings, routeOwner, whoAmI, canSee, leadOut, leadRow, htmlToText, stateFrom, checkAbn, STATES, SOURCES, STAGE_NAMES, DEFAULTS, mergeAct, CHANNEL_KEY, PROJECTS_MAIL }
