/* HAAVN BLACK Sales, the shared core for the phone pages (atrium-sales-mobile.html and the Sales tab in ATRIUM Chat).
   It holds the stages, the approval gates, "what does this customer need next" and the one call to /api/sales, so the phone and the desktop pipeline
   (public/atrium-sales.html) always give the same answer. It never decides anything the server decides: moving a customer, approving, emailing and the
   prices all stay in api/_utils/sales.js. Tests: src/lib/__tests__/salesMobile.test.ts. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else root.HBS = factory()
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict'
  var DAY = 864e5, HOUR = 36e5
  var C = { DAY: DAY, HOUR: HOUR, now: function () { return Date.now() } }

  /* ---------- what HAAVN BLACK sells, as on haavnblack.au ---------- */
  C.PRODUCTS = { studio: { n: 'SOLUM Studio', s: 'Studio', m2: 42 }, plus: { n: 'SOLUM Plus', s: 'Plus', m2: 55 }, max: { n: 'SOLUM Max', s: 'Max', m2: 60 },
    octa: { n: 'OCTA', s: 'OCTA', concept: 1 }, octaplus: { n: 'OCTA Plus', s: 'OCTA Plus', concept: 1 }, octamax: { n: 'OCTA Max', s: 'OCTA Max', concept: 1 }, none: { n: 'No preference', s: 'No home yet' } }
  C.SOLUM = ['studio', 'plus', 'max']
  C.CLAD = { Ivory: '#e4dbc6', Char: '#b3aca6', Amber: '#e39a55', Urbanite: '#aeab80' }
  C.PAL = { Burgundy: '#c2747a', Sage: '#96b483', Tide: '#7cb5c0', Vine: '#d9a54f' }
  C.JOIN = { 'Dark Oak': '#77726d', 'Raw Walnut': '#d6b48c' }
  C.SOURCES = ['Facebook', 'Instagram', 'LinkedIn', 'Google search', 'Website direct', 'Agent referral', 'Other']
  C.SETTING = ['City', 'Coast', 'Country', 'Not sure yet']
  C.PAY = ['No preference', 'Cash', 'Finance', 'Undecided']
  C.DELIV = ['No preference', 'Supply', 'Delivered', 'Installed']
  C.STATES = { VIC: 'Victoria', NSW: 'New South Wales', QLD: 'Queensland', SA: 'South Australia', WA: 'Western Australia', TAS: 'Tasmania', ACT: 'Australian Capital Territory', NT: 'Northern Territory' }
  C.PORTS = { VIC: 'Port of Melbourne', QLD: 'Port of Brisbane' }
  C.QLAND = ['Owns the land', 'Buying land', 'Looking for land', 'No site yet']
  C.QFIN = ['Cash ready', 'Pre-approved finance', 'Needs finance', 'Not sure yet']
  C.QTIME = ['Within 3 months', '3 to 6 months', '6 to 12 months', 'Over 12 months']
  C.QNEXT = [['preorder', 'Send the pre-order'], ['display', 'Show them the Display suite'], ['info', 'Send more information first']]
  C.LOST = ['No site yet', 'Price', 'Timing', 'Bought elsewhere', 'Could not reach them', 'Not a fit for the land']
  C.RET = ['Details do not match the pre-order', 'Payment not received, or the wrong amount', 'A document is missing', 'Needs a director to look']

  /* four chapters of the journey, each one of the website's own colours */
  C.PH = { discover: { n: 'Discover', c: '#7cb5c0' }, commit: { n: 'Commit', c: '#d9a54f' }, secure: { n: 'Secure', c: '#96b483' }, deliver: { n: 'Deliver', c: '#c2747a' } }
  C.ST = [
    { n: 'Enquiry', ph: 'discover', note: 'Call within 1 hour', sla: 1 / 24 },
    { n: 'Contacted', ph: 'discover', note: 'Qualify within 2 days', sla: 2 },
    { n: 'Qualified', ph: 'discover', note: 'Send the pre-order within 2 days', sla: 2 },
    { n: 'Pre-order deposit', ph: 'commit', note: 'Finance confirms the deposit', money: 1 },
    { n: 'Contract out', ph: 'commit', note: 'Alessia issues and files' },
    { n: 'Contract signed', ph: 'commit', note: '10% invoice, then payment', money: 1 },
    { n: '10% deposit paid', ph: 'secure', note: 'Alessia confirms the order' },
    { n: 'Order confirmed', ph: 'secure', note: 'In production with projects' },
    { n: 'Final payment', ph: 'deliver', note: 'The 90% balance, before delivery', money: 1 },
    { n: 'Delivered', ph: 'deliver', note: 'On site and handed over' }
  ]
  C.SHORT = ['Enquiry', 'Contacted', 'Qualified', 'Pre-order', 'Contract', 'Signed', 'Deposit', 'Ordered', 'Final pay', 'Delivered']
  C.DELIVERY = [{ n: 'Order confirmed', where: 'Order confirmed, with the projects team' }, { n: 'Factory slot booked', where: 'Waiting for the factory slot' }, { n: 'In production', where: 'In the factory' }, { n: 'Quality check', where: 'In the factory, final checks' }, { n: 'On the water', where: 'Shipping to Australia' }, { n: 'Arrived in Australia', where: 'In port. The final payment is due before it is delivered' }, { n: 'Delivered and installed', where: 'On site' }, { n: 'Handover', where: 'Handed over to the customer' }]
  C.SHORTPROD = ['Ordered', 'Slot booked', 'Building', 'QC check', 'On water', 'In port', 'On site', 'Handed over']
  /* every gate: who approves it, how long we aim for, and what to check before saying yes */
  C.G = {
    pre: { role: 'fin', ask: 'Confirm the pre-order deposit', chase: 'Awaiting the pre-order deposit', short: 'Pre-order deposit', sla: 1, csla: 3, money: 1 },
    issue: { role: 'con', ask: 'Issue the contract to the customer and the agent', short: 'Issue the contract', sla: 2 },
    out: { role: 'con', ask: 'Contract out for signature', short: 'Out for signature', sla: 3, wait: 1 },
    signed: { role: 'con', ask: 'Confirm the signed contract and file it', short: 'Signed contract to file', sla: 1 },
    invoice: { role: 'fin', ask: 'Raise the 10% deposit invoice', short: 'Raise the 10% invoice', sla: 1 },
    dep: { role: 'fin', ask: 'Confirm the 10% order deposit', chase: 'Awaiting the 10% order deposit', short: '10% order deposit', sla: 1, csla: 5, money: 1 },
    confirm: { role: 'con', ask: 'Confirm the order and hand over to projects', short: 'Confirm the order', sla: 1 },
    final: { role: 'fin', ask: 'Confirm the final payment and release the home', chase: 'Awaiting the final payment', short: 'Final payment', sla: 1, csla: 3, money: 1 }
  }
  C.ORDER = ['pre', 'issue', 'out', 'signed', 'invoice', 'dep', 'confirm', 'final']
  C.CHK = {
    pre: ['The pre-order deposit is in the bank', 'The payment reference matches the customer', 'Refund terms were sent: refundable until the contract is signed'],
    issue: ['Home, finishes and price match the pre-order', 'Port and delivery option confirmed', 'The contract is copied to the sales agent'],
    signed: ['Signed by every buyer', 'Signed copy filed against the customer', 'Customer told the pre-order deposit is no longer refundable'],
    invoice: ['Amount is the 10% less the pre-order deposit already paid', 'Payment details and due date are on the invoice', 'Invoice copied to the sales agent'],
    dep: ['The deposit is in the bank, not just remitted', 'Payment reference matches the invoice', 'Amount equals the 10% less the pre-order deposit'],
    confirm: ['Order confirmation ready for the customer and the agent', 'Home, finishes and site address are complete', 'Ready to hand over to projects'],
    final: ['The final payment has cleared in the bank', 'Amount is the full 90% balance', 'The home can be released for delivery']
  }
  C.roleName = function (r) { return r === 'fin' ? 'Finance' : r === 'con' ? 'Contract admin' : r === 'cus' ? 'Customer' : 'Sales' }
  C.roleWho = function (r) { return r === 'fin' ? 'Amy or Dominka' : r === 'con' ? 'Alessia' : 'the customer' }

  /* ---------- small helpers ---------- */
  C.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  C.money = function (n) { return n ? '$' + Math.round(n).toLocaleString('en-AU') : '-' }
  C.fmtAge = function (d) { return d < 1 / 24 ? Math.max(1, Math.round(d * 1440)) + 'm' : d < 1 ? Math.round(d * 24) + 'h' : Math.floor(d) + 'd' }
  C.ago = function (t) { var m = Math.round((C.now() - t) / 6e4); if (m < 2) return 'just now'; if (m < 60) return m + ' min ago'; var h = Math.round(m / 60); if (h < 36) return h + (h === 1 ? ' hour' : ' hours') + ' ago'; return Math.round(h / 24) + ' days ago' }
  C.dur = function (ms) { var m = Math.max(1, Math.round(Math.abs(ms) / 6e4)); if (m < 90) return m + ' min'; var h = Math.round(m / 60); if (h < 48) return h + 'h'; return Math.round(h / 24) + 'd' }
  C.ini = function (n) { return String(n || '?').split(/\s+/).map(function (w) { return w[0] }).slice(0, 2).join('').toUpperCase() }

  /* ---------- state ---------- */
  var S = C.S = { me: null, leads: [], companies: [], agents: [], settings: { rules: {}, prices: {}, spend: {}, notify: {}, team: [], approvers: { con: [], fin: [] }, preorder: 2000 }, inbox: [], team: [], staff: [], ready: false, error: '', setup: '', denied: '', now: 0 }

  C.api = function (a, body) {
    return fetch('/api/sales', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ a: a }, body || {})) }).then(function (r) {
      return r.json().catch(function () { return {} }).then(function (j) {
        if (r.status === 401) { S.error = 'signin'; var e = new Error('signin'); e.status = 401; throw e }
        if (r.status === 403 && a === 'init') { S.denied = j.error || 'You do not have access to the HAAVN BLACK sales pipeline.'; var e3 = new Error(S.denied); e3.status = 403; throw e3 }
        if (!r.ok) { var e2 = new Error(j.error || j.message || 'That did not work.'); e2.status = r.status; throw e2 }
        if (j.setup === false) { S.setup = j.message; throw new Error(j.message) }
        return j
      })
    })
  }
  /* a failed fetch (no signal) has no status; a server answer always has one */
  C.isOffline = function (e) { return !!e && !e.status && e.message !== 'signin' }

  C.load = function () {
    return C.api('init').then(function (j) {
      S.me = j.me; S.leads = j.leads; S.companies = j.companies || []; S.agents = j.agents || []; S.settings = j.settings; S.inbox = j.inbox || []; S.team = j.team || []; S.staff = j.staff || []; S.now = j.now; S.ready = true; S.error = ''; S.setup = ''; S.denied = ''
      return true
    }).catch(function (e) { S.ready = true; if (!S.error && !S.setup && !S.denied) S.error = e.message; return false })
  }
  /* true when something changed. A lead we hold newer than the server's copy is kept (it is waiting to be saved). */
  C.poll = function (keep) {
    if (!S.me) return Promise.resolve(false)
    return C.api('poll', { since: S.now }).then(function (j) {
      var changed = false
      j.leads.forEach(function (l) {
        if (keep && keep[l.id]) return
        var i = S.leads.findIndex(function (x) { return x.id === l.id })
        if (i < 0) { S.leads.unshift(l); changed = true } else if (l.updated > (S.leads[i].updated || 0)) { S.leads[i] = l; changed = true }
      })
      S.now = j.now
      return changed
    })
  }

  /* ---------- people, leads, money ---------- */
  C.lead = function (id) { return S.leads.find(function (l) { return l.id === id }) }
  C.agentById = function (id) { return S.agents.find(function (a) { return a.id === id }) }
  C.teamById = function (id) { return S.team.find(function (t) { return t.id === id }) }
  C.staffById = function (id) { return S.staff.find(function (t) { return t.id === id }) }
  C.ownerName = function (id) { var t = C.teamById(id) || C.staffById(id); if (t) return t.name; var a = C.agentById(id); return a ? a.name : (id ? 'Unknown' : 'Unassigned') }
  C.firstName = function (id) { return String(C.ownerName(id)).split(' ')[0] }
  C.full = function (l) { return (l.first + ' ' + (l.last || '')).trim() }
  /* where the home is in delivery, always a real step: an order record from an older build, or a half-saved one, can have no step or a stray one */
  C.step = function (l) { var s = l && l.order ? Math.floor(Number(l.order.step)) : 0; return s > 0 ? Math.min(s, C.DELIVERY.length - 1) : 0 }
  /* the order: a customer can buy several dwellings, each line with its own model, number and finishes. A customer with no list has the one home they always had (same rule as api/_utils/salesHomes.js). */
  C.lines = function (l) { if (l.homes && l.homes.length) return l.homes; return C.SOLUM.indexOf(l.product) >= 0 ? [{ id: 'h0', product: l.product, qty: 1, clad: l.clad || '', pal: l.pal || '', join: l.join || '' }] : [] }
  C.units = function (l) { return C.lines(l).reduce(function (n, h) { return n + h.qty }, 0) }
  C.multi = function (l) { var ls = C.lines(l); return ls.length > 1 || (ls.length === 1 && ls[0].qty > 1) }
  C.lineName = function (h) { return (h.qty > 1 ? h.qty + ' \u00d7 ' : '') + C.PRODUCTS[h.product].n }
  C.words = function (a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] }
  C.home = function (l) { var ls = C.lines(l); return ls.length ? C.words(ls.map(C.lineName)) : (C.PRODUCTS[l.product] ? C.PRODUCTS[l.product].n : 'No preference') }
  C.homeShort = function (l) { var ls = C.lines(l); if (!ls.length) return (C.PRODUCTS[l.product] || C.PRODUCTS.none).s; if (ls.length === 1) return (ls[0].qty > 1 ? ls[0].qty + ' \u00d7 ' : '') + C.PRODUCTS[ls[0].product].s; return ls.map(function (h) { return h.qty + ' ' + C.PRODUCTS[h.product].s }).join(' + ') }
  C.isSolum = function (l) { return C.lines(l).length > 0 }
  C.price = function (l) { return C.lines(l).reduce(function (s, h) { return s + h.qty * ((S.settings.prices || {})[h.product] || 0) }, 0) }
  C.pre = function () { return S.settings.preorder || 2000 }
  C.depBal = function (l) { return Math.max(0, Math.round(C.price(l) * 0.1) - C.pre()) }
  C.finalAmt = function (l) { return Math.max(0, C.price(l) - Math.round(C.price(l) * 0.1)) }
  C.gateAmt = function (l, g) { return g === 'pre' ? C.pre() : (g === 'invoice' || g === 'dep') ? C.depBal(l) : g === 'final' ? C.finalAmt(l) : C.price(l) }
  C.finOf = function (h) { return [h.clad, h.pal, h.join].filter(Boolean).join(', ') }
  C.fin = function (l) {
    var ls = C.lines(l)
    if (ls.length > 1) { var d = {}; ls.forEach(function (h) { d[C.finOf(h) || '-'] = 1 }); if (Object.keys(d).length > 1) return 'your own finishes for each home' }
    return C.finOf(ls[0] || l) || 'finishes to be chosen'
  }
  C.isInternal = function () { return !!(S.me && S.me.kind === 'internal') }
  C.isAdmin = function () { return !!(S.me && S.me.admin) }
  C.canGate = function (g) { return !!(S.me && S.me.gates && S.me.gates.indexOf(g) >= 0) }
  C.hasApprovals = function () { return !!(S.me && ((S.me.gates && S.me.gates.length) || S.me.admin)) }
  C.portOf = function (l) { return C.PORTS[l.state] || '' }
  C.isTest = function (l) { return l.status === 'lost' && l.lostWhy === 'Test lead' }
  C.visible = function () { return S.leads.filter(function (l) { return !C.isTest(l) }) }
  C.homeLock = function (l) {
    if (l.concept) return ''
    if (l.stage >= 6 || l.cfix) return 'The 10% deposit is paid, so the home is fixed. A change now needs a new contract.'
    if (l.stage >= 4 && !C.isAdmin()) return 'The contract is out, so only a director can change the home.'
    return ''
  }

  /* ---------- what a customer is waiting on, and for how long ---------- */
  C.sinceOf = function (l) { return l.stage === 0 ? l.created : (l.stage <= 2 ? (l.lastTouch || (l.dates && l.dates[l.stage]) || l.created) : (l.gateAt || l.lastTouch || l.created)) }
  C.slaOf = function (l) {
    if (l.stage <= 2) return C.ST[l.stage].sla
    if (l.gate) { var g = C.G[l.gate]; return (g.money && !l.paid && g.csla) ? g.csla : g.sla }
    return null
  }
  C.itemOf = function (l) {
    if (l.concept || l.status !== 'open' || l.stage >= 9) return null
    var now = C.now()
    var it = { l: l, k: '', role: '', gate: l.gate, sla: null, age: (now - C.sinceOf(l)) / DAY, txt: '', amt: 0, over: false, urgent: false }
    if (l.ret) { it.k = 'ret'; it.role = 'sales'; it.txt = 'Returned by ' + (l.ret.name || 'the office').split(' ')[0] + ': ' + l.ret.why; it.age = (now - l.ret.at) / DAY; it.sla = 1; it.amt = C.price(l) }
    else if (l.gate) {
      var g = C.G[l.gate]; it.role = g.role; it.amt = C.gateAmt(l, l.gate)
      if (g.wait) { it.k = 'chase'; it.txt = g.ask; it.sla = g.sla }
      else if (g.money && !l.paid) { it.k = 'chase'; it.txt = g.chase; it.sla = g.csla || g.sla }
      else { it.k = 'approve'; it.txt = g.ask; it.sla = g.sla }
    } else if (l.stage <= 2) { it.k = 'call'; it.role = 'sales'; it.txt = ['Call the customer', 'Qualify: site, finance and timing', 'Send the pre-order'][l.stage]; it.sla = C.ST[l.stage].sla; it.amt = C.price(l) }
    else if (l.stage === 7 && l.order) {
      var o = l.order
      if (!o.handoverAt) { it.k = 'handover'; it.role = 'con'; it.txt = 'Send the handover to projects'; it.sla = 1; it.amt = C.price(l); it.age = (now - (l.gateAt || l.lastTouch || l.created)) / DAY }
      else if (now - o.lastUpdate >= 14 * DAY) { it.k = 'update'; it.role = 'sales'; it.txt = 'Send the fortnightly update'; it.sla = 14; it.age = (now - o.lastUpdate) / DAY; it.amt = C.price(l) }
      else return null
    } else return null
    it.over = it.sla != null && it.age > it.sla
    if (l.gate === 'final' && l.order && l.order.depart) { it.dep = (l.order.depart - now) / DAY; it.urgent = !l.paid && it.dep <= 5 }
    it.pri = (it.urgent ? 1000 : 0) + (it.over ? 100 + Math.min(50, (it.age - it.sla) * 5) : 0) + Math.min(40, it.age)
    return it
  }
  C.ITEMS = function () { var o = []; C.visible().forEach(function (l) { var i = C.itemOf(l); if (i) o.push(i) }); return o.sort(function (a, b) { return b.pri - a.pri }) }
  C.mine = function (it) {
    var me = S.me, l = it.l; if (!me) return false
    if (it.role === 'sales') return l.owner === me.id
    if (me.admin) return true
    if ((me.roles || []).indexOf(it.role) >= 0) return true
    return l.owner === me.id
  }
  /* what I do next, split the way the desktop Desk splits it, plus the leads of mine that are with the office */
  C.today = function () {
    var all = C.ITEMS().filter(C.mine)
    var appr = all.filter(function (i) { return i.k === 'approve' && C.canGate(i.gate) })
    var todo = all.filter(function (i) { return !(i.k === 'approve' && C.canGate(i.gate)) && !(i.k === 'approve') })
    var wait = C.ITEMS().filter(function (i) { return i.k === 'approve' && !C.canGate(i.gate) && S.me && i.l.owner === S.me.id })
    return { all: all, appr: appr, todo: todo, wait: wait }
  }
  /* the badge in Chat: customers past their window to be called, qualified, chased or approved. A director sees every overdue customer in the pipeline; everyone else sees their own. */
  C.overdue = function () { return C.ITEMS().filter(function (i) { return (i.over || i.urgent) && (C.isAdmin() || C.mine(i)) }).length }
  C.counts = function () {
    /* "need you" is what I can act on: approvals I give and the follow-ups. What is with the office is counted on its own. */
    var t = C.today(), act = t.appr.concat(t.todo), late = act.filter(function (i) { return i.over || i.urgent }).length
    var inPlay = C.visible().filter(function (l) { return l.status === 'open' && !l.concept && l.stage === 3 }).length
    var mineOpen = C.visible().filter(function (l) { return l.status === 'open' && !l.concept && l.stage < 9 && S.me && l.owner === S.me.id })
    return { need: act.length, late: late, overdue: C.overdue(), waiting: t.wait.length, approvals: t.appr.length, preorders: inPlay, mineOpen: mineOpen.length }
  }
  /* the status chip under a customer: how long they have waited, or where the home is */
  C.status = function (l) {
    var now = C.now(), age = (now - C.sinceOf(l)) / DAY
    if (l.stage === 7) { var st = C.step(l); return { t: C.DELIVERY[st].n, c: '', sh: C.SHORTPROD[st] } }
    if (l.stage === 8) {
      var d = l.order && l.order.depart ? Math.max(0, Math.ceil((l.order.depart - now) / DAY)) : null
      var c = (!l.paid && ((d != null && d <= 5) || age > 3)) ? 'over' : (!l.paid && ((d != null && d <= 9) || age > 2)) ? 'warn' : ''
      return { t: d != null ? 'Leaves port in ' + d + 'd' : 'In port ' + C.fmtAge(age), c: c, sh: d != null ? 'Port ' + d + 'd' : 'In port' }
    }
    if (l.stage === 9) { var dd = (now - ((l.dates && l.dates[9]) || l.lastTouch || l.created)) / DAY; return { t: 'Delivered ' + C.fmtAge(dd) + ' ago', c: 'ok', sh: C.fmtAge(dd) + ' ago' } }
    var sla = C.slaOf(l), c2 = sla != null && age > sla ? 'over' : (sla != null && age > sla * 0.6 ? 'warn' : '')
    return { t: C.fmtAge(age), c: c2, sh: C.fmtAge(age) }
  }
  /* what saying yes will do, written for the person pressing the button */
  C.effects = function (l, g) {
    var a = C.firstName(l.owner), first = l.first
    return {
      pre: ['Records the deposit as received and moves ' + first + ' to Contract out', 'Alessia gets a task to issue the contract', 'The HAAVN Contract Team is told in Chat'],
      issue: ['Records that the contract was issued to ' + first + ' and ' + a, 'Alessia then watches for the signature, and can chase it'],
      signed: ['Moves ' + first + ' to Contract signed', 'The pre-order deposit is recorded as no longer refundable', 'Finance gets a task to raise the 10% deposit invoice' + (C.price(l) ? ', ' + C.money(C.depBal(l)) : '')],
      invoice: ['Records that the invoice' + (C.price(l) ? ' for ' + C.money(C.depBal(l)) : '') + ' was raised', 'Finance then watches for the payment, and can chase it'],
      dep: ['Records the 10% deposit as received and moves ' + first + ' to 10% deposit paid', 'Alessia gets a task to confirm the order and hand over to projects'],
      confirm: ['Moves ' + first + ' to Order confirmed, in production', 'The handover to projects@haavn.au is sent from the customer next'],
      final: ['Records the final payment and moves ' + first + ' to Delivered', 'The home is released: projects can take it to Delivered and installed']
    }[g] || []
  }

  /* ---------- the messages: the same words the desktop pipeline suggests ---------- */
  C.tpl = function (l, key) {
    var T = {
      s0: 'Hi {first}, thanks for your interest in the {home}. I am {me} at HAAVN BLACK. I can see you chose {fin}. Do you have a few minutes today for a quick call to talk through delivery to {state} and what is included? Kind regards, {me}',
      s1: 'Hi {first}, great speaking with you. To get your {home} priced properly I need three things: your site address (or the area you are looking at), whether you plan to pay cash or finance, and when you want the home on site. Reply here or call me. {me}',
      s2: 'Hi {first}, as discussed, here is how to secure your {home} in {fin}. A pre-order deposit of {pre} holds your place, and it is refundable until you sign your contract. Once it is in I will send your contract. {me}',
      pre: 'Hi {first}, a quick note on your pre-order for the {home}. The {pre} pre-order deposit holds your place and is refundable until you sign your contract. Payment details are on the invoice. Let me know if anything is unclear. {me}',
      issue: 'Hi {first}, thank you for your pre-order. Your contract for the {home} is attached. Please read it through and call me with any questions. It can be signed electronically. {me}',
      out: 'Hi {first}, just checking in on the contract for your {home}. Is there anything you would like to go through before signing? I am free for a call any time today. {me}',
      signed: 'Hi {first}, thank you for signing. Your contract is filed. The next step is the 10% deposit, less your {pre} pre-order deposit: {dep}. Payment details will be on the invoice. {me}',
      invoice: 'Hi {first}, your deposit invoice for the {home} is on its way: {dep}, which is the 10% deposit less your {pre} pre-order deposit. {me}',
      dep: 'Hi {first}, a reminder that the 10% deposit of {dep} for your {home} is due. Payment details are on the invoice. As soon as it lands we confirm your order. {me}',
      confirm: 'Hi {first}, your deposit has arrived, thank you. Your order for the {home} is confirmed. From here the projects team looks after build, delivery and installation, and you will hear from us every two weeks. {me}',
      s7: 'Hi {first}, I have introduced you to our projects team (projects@haavn.au). They will confirm your production slot and keep you updated every two weeks. {me}',
      final: 'Hi {first}, your {home} has arrived at the {port}. Before it can be delivered to your site, the final payment of {final} is due. Payment details are on the invoice. {me}',
      s9: 'Hi {first}, your {home} has been delivered. Thank you for choosing HAAVN BLACK. {me}'
    }
    var t = T[key] || T[l.gate] || T['s' + l.stage] || T.s1
    var me = String((S.me && S.me.name) || '').split(' ')[0]
    return t.replace(/{first}/g, l.first).replace(/{home}/g, C.home(l)).replace(/{fin}/g, C.fin(l)).replace(/{me}/g, me).replace(/{state}/g, C.STATES[l.state] || 'your state').replace(/{pre}/g, C.money(C.pre()))
      .replace(/{dep}/g, C.price(l) ? C.money(C.depBal(l)) : 'the 10% deposit less your pre-order deposit').replace(/{final}/g, C.price(l) ? C.money(C.finalAmt(l)) : 'the 90% balance').replace(/{port}/g, C.portOf(l) || 'port')
  }
  /* which template a chase uses, as the desktop does */
  C.chaseKey = function (l) { return l.gate === 'out' ? 'out' : l.gate === 'pre' ? 'pre' : l.gate === 'dep' ? 'dep' : l.gate === 'final' ? 'final' : null }
  C.updateText = function (l) {
    var o = l.order || { step: 0 }, d = C.DELIVERY[C.step(l)], me = String((S.me && S.me.name) || '').split(' ')[0]
    var eta = o.eta ? new Date(o.eta).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : 'to be confirmed'
    return 'Hi ' + l.first + ', here is your fortnightly update on your ' + C.home(l) + '.\n\nStatus: ' + d.n + '.\nWhere it is: ' + d.where + '.\nEstimated on site: ' + eta + '.\n\nNothing is needed from you right now. If anything changes on your site or your plans, tell me and I will pass it to the projects team. ' + me
  }
  return C
})
