import { describe, it, expect, beforeEach } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const S = require('../../../api/_utils/sales.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const O = require('../../../api/_utils/outside.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const B = require('../../../api/_utils/blaze.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MAIL = require('../../../api/sales-mail.js')

const jamie = { sub: 'jb', name: 'Jamie Baldwin', role: 'admin', emails: ['jamie@7even.au'] }
const mike = { sub: 'mf', name: 'Mike Furniss', role: 'staff', emails: ['mike@haavn.au'] }
const agentSession = (email: string) => ({ sub: 'o_' + email.length, name: 'x', role: 'external', emails: [email] })

function fake() {
  const t: any = { leads: [], companies: [], agents: [], inbox: [], settings: {}, groups: [], members: [], msgs: [], seq: 0, push: [] as any[], doc: {} as any }
  const up = (list: any[], row: any) => { const i = list.findIndex((x) => x.id === row.id); if (i >= 0) list[i] = { ...list[i], ...row }; else list.push({ ...row }); return list.find((x) => x.id === row.id) }
  const db = {
    leads: {
      all: async () => [...t.leads].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      since: async (iso: string) => t.leads.filter((l: any) => l.updated_at > iso),
      get: async (id: string) => t.leads.find((l: any) => l.id === id) || null,
      upsert: async (row: any) => up(t.leads, row),
      findByContact: async (email: string, mob: string) => t.leads.filter((l: any) => (email && l.data.emailLower === email) || (mob && l.data.mobileDigits === mob)),
    },
    companies: { all: async () => t.companies, get: async (id: string) => t.companies.find((c: any) => c.id === id) || null, upsert: async (row: any) => up(t.companies, row) },
    agents: { all: async () => t.agents, get: async (id: string) => t.agents.find((c: any) => c.id === id) || null, byEmails: async (e: string[]) => t.agents.filter((a: any) => e.includes(String(a.email).toLowerCase())), upsert: async (row: any) => up(t.agents, row) },
    inbox: { list: async () => t.inbox.filter((x: any) => x.status !== 'cleared').reverse(), remove: async (id: string) => { t.inbox = t.inbox.filter((x: any) => x.id !== id) }, purgeMarkers: async (iso: string) => { t.inbox = t.inbox.filter((x: any) => !(x.status === 'cleared' && x.received_at < iso)) }, byMessage: async (m: string) => t.inbox.find((x: any) => x.message_id === m) || null, get: async (id: string) => t.inbox.find((x: any) => x.id === id) || null, upsert: async (row: any) => up(t.inbox, row) },
    settings: { get: async (k: string) => t.settings[k] || null, set: async (k: string, v: any) => { t.settings[k] = v } },
  }
  const chat = {
    findDm: async (k: string) => t.groups.find((g: any) => g.dm_key === k) || null,
    insertGroup: async (g: any) => { const r = { id: 'g' + ++t.seq, ...g }; t.groups.push(r); return r },
    insertMembers: async (rows: any[]) => { t.members.push(...rows) },
    membersByGroups: async (ids: string[]) => t.members.filter((m: any) => ids.includes(m.group_id)),
    insertMessage: async (m: any) => { const r = { id: ++t.seq, ...m }; t.msgs.push(r); return r },
    pushSubsFor: async (ids: string[]) => ids.map((i) => ({ endpoint: 'e-' + i, p256dh: 'p', auth: 'a' })),
    deletePush: async () => {},
  }
  const kv = { async read(k: string) { return t.doc[k] ? { value: t.doc[k] } : null }, async update(k: string, fn: any) { const { next, result } = fn(t.doc[k] || null); t.doc[k] = next; return result } }
  const wp = { send: async (sub: any, data: string) => { t.push.push({ to: sub.endpoint, ...JSON.parse(data) }) } }
  const sent: any[] = []
  const mail: any = { configured: true, sent, fail: false, async send(m: any) { if (mail.fail) throw new Error('Email refused'); sent.push(m) } }
  return { t, deps: { db, chat, kv, wp, mail }, sent, mail }
}
let F: ReturnType<typeof fake>
const run = (a: string, args: any, who: any = jamie) => S.run(a, args, who, F.deps)
const alessia = { sub: 'ar', name: 'Alessia Bresciano', role: 'staff', emails: ['reception@haavn.au'] }
const amy = { sub: 'ab', name: 'Amy Baldwin', role: 'staff', emails: ['accounts@7even.au'] }
const dominika = { sub: 'dm', name: 'Dominika Ma', role: 'staff', emails: ['accounts@haavn.au'] }
const get = async (id: string) => (await run('init', {})).leads.find((x: any) => x.id === id)
// walk a customer to a stage the way the office does: early stages by hand, then each money or contract gate approved by a director
async function through(id: string, stage: number) {
  let l = await get(id)
  for (let guard = 0; guard < 40 && l.stage < stage; guard++) {
    if (!l.gate && l.stage < 3) l = (await run('saveLead', { lead: { id, stage: l.stage + 1 } })).lead
    else if (!l.gate && l.stage === 7) l = (await run('saveLead', { lead: { id, order: { ...l.order, step: 5 } } })).lead
    else if (l.gate === 'out') l = (await run('gate', { id, op: 'signed' })).lead
    else { if (S.GATES[l.gate].money && !l.paid) await run('gate', { id, op: 'arrived' }); l = (await run('gate', { id, op: 'approve' })).lead }
  }
  return l
}
const mkLead = async (n = Math.random()) => (await S.ingestEmail(F.deps, { messageId: 'm' + n, body: FORM() })).lead
beforeEach(() => { F = fake(); O.reset() })

const FORM = (o: any = {}) => `New SOLUM enquiry\n\nFirst name: ${o.first || 'Mia'}\nLast name: ${o.last || 'Brennan'}\nEmail: ${o.email || 'mia.brennan@example.com'}\nPhone: ${o.phone || '0400 000 901'}\nSetting: Coast\nState: ${o.state || 'Queensland'}\nModel: ${o.model || 'SOLUM Plus'}\nCladding: Char\nPalette: Sage\nJoinery: Raw Walnut\nPreferred payment: Finance\nDelivery: Delivered\nMessage: Guest studio at the back of our block.\nutm_source: ${o.utm || 'facebook'}`

describe('reading an enquiry email', () => {
  it('reads the contact form: customer, mobile, state, home, every finish, source', () => {
    const p = S.parseEnquiry(FORM())
    expect(p).toMatchObject({ first: 'Mia', last: 'Brennan', email: 'mia.brennan@example.com', mobile: '0400 000 901', state: 'QLD', setting: 'Coast', product: 'plus', clad: 'Char', pal: 'Sage', join: 'Raw Walnut', pay: 'Finance', deliv: 'Delivered', source: 'Facebook', complete: true })
    expect(p.msg).toContain('Guest studio')
  })
  it('knows every state and territory, by name or short form', () => {
    const want: any = { 'New South Wales': 'NSW', Victoria: 'VIC', Queensland: 'QLD', 'South Australia': 'SA', 'Western Australia': 'WA', Tasmania: 'TAS', 'Australian Capital Territory': 'ACT', 'Northern Territory': 'NT', NT: 'NT', act: 'ACT', Wa: 'WA' }
    for (const k of Object.keys(want)) expect(S.parseEnquiry(FORM({ state: k })).state).toBe(want[k])
    expect(Object.keys(S.STATES)).toEqual(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'])
    expect(S.parseEnquiry(FORM({ state: 'Mars' })).state).toBe('')
  })
  it('reads where it came from, with Other for anything else, and OCTA as concept', () => {
    const src = (u: string) => S.parseEnquiry(FORM({ utm: u }))
    expect(src('instagram').source).toBe('Instagram'); expect(src('linkedin').source).toBe('LinkedIn'); expect(src('google').source).toBe('Google search')
    expect(src('tiktok')).toMatchObject({ source: 'Other', otherSource: 'tiktok' })
    expect(S.parseEnquiry(FORM().replace(/utm_source:.*/, '')).source).toBe('Facebook')
    expect(S.parseEnquiry(FORM({ model: 'OCTA Max' })).product).toBe('octamax')
  })
  it('copes with a plain email from a customer: name from the sender, contact from the text', () => {
    const p = S.parseEnquiry('Hi, I would like a SOLUM Studio for my block. Call me on 0412 345 678.', { from: 'Tom Walker <tom.walker@gmail.com>', subject: 'Enquiry' })
    expect(p).toMatchObject({ first: 'Tom', last: 'Walker', email: 'tom.walker@gmail.com', mobile: '0412 345 678', complete: true })
    expect(S.parseEnquiry('Hello there', { from: 'HAAVN BLACK website <no-reply@haavnblack.au>' }).complete).toBe(false)
  })
  it('turns an html email into text before reading it', () => {
    const html = '<div>First name: <b>Ava</b><br>Last name: Lee<br>Email: ava.lee@example.com<br>State: Tasmania</div>'
    expect(S.parseEnquiry(S.htmlToText(html))).toMatchObject({ first: 'Ava', last: 'Lee', state: 'TAS', complete: true })
  })
})

describe('an enquiry becomes a lead and the right people are told', () => {
  it('Queensland goes to Mike, with a task, a note in the sales channel and a phone alert to Mike and Jamie', async () => {
    const r = await S.ingestEmail(F.deps, { messageId: 'm1', from: 'HAAVN BLACK website <no-reply@haavnblack.au>', subject: 'New enquiry from haavnblack.au: Mia Brennan', body: FORM() })
    expect(r.lead).toMatchObject({ first: 'Mia', owner: 'mf', state: 'QLD', stage: 0, product: 'plus', clad: 'Char', source: 'Facebook' })
    expect(F.t.inbox[0]).toMatchObject({ status: 'lead', lead_id: r.lead.id })
    expect(F.t.doc[B.KEYS.workflow].actions[0]).toMatchObject({ owner: 'Mike Furniss', dept: 'haavnblack', priority: 'High' })
    expect(F.t.doc[B.KEYS.workflow].actions[0].title).toContain('Call Mia Brennan within 1 hour')
    expect(F.t.groups[0]).toMatchObject({ name: 'HAAVN BLACK Sales', dm_key: 'hbsales', is_private: true })
    expect(F.t.members.map((m: any) => m.member).sort()).toEqual(['jb', 'mf'])
    expect(F.t.msgs[0].body).toContain('New HAAVN BLACK lead for Mike Furniss'); expect(F.t.msgs[0].body).toContain('SOLUM Plus in Char, Sage, Raw Walnut')
    expect(F.t.push.map((p: any) => p.to).sort()).toEqual(['e-jb', 'e-mf']); expect(F.t.push[0].title).toBe('New HAAVN BLACK lead (QLD)')
  })
  it('Victoria goes to Jamie, other states to the default owner, and the rules can be changed per state', async () => {
    expect((await S.ingestEmail(F.deps, { messageId: 'v', body: FORM({ email: 'v@example.com', phone: '0400 000 111', state: 'Victoria' }) })).lead.owner).toBe('jb')
    expect((await S.ingestEmail(F.deps, { messageId: 'w', body: FORM({ email: 'w@example.com', phone: '0400 000 222', state: 'Western Australia' }) })).lead.owner).toBe('jb')
    await run('settingsSave', { settings: { rules: { WA: 'mf' } } })
    expect((await S.ingestEmail(F.deps, { messageId: 'w2', body: FORM({ email: 'w2@example.com', phone: '0400 000 333', state: 'WA' }) })).lead.owner).toBe('mf')
  })
  it('one email never makes two leads, and the same customer enquiring again adds a note instead', async () => {
    const e = { messageId: 'same', from: 'x', subject: 's', body: FORM() }
    await S.ingestEmail(F.deps, e)
    expect((await S.ingestEmail(F.deps, e)).skipped).toBe('already seen')
    const again = await S.ingestEmail(F.deps, { ...e, messageId: 'other-mail', body: FORM({ phone: '0400 000 999' }) })
    expect(again.dup).toBe(true); expect(F.t.leads).toHaveLength(1); expect(F.t.msgs).toHaveLength(1)
    expect(S.leadOut(F.t.leads[0]).act.some((x: any) => x.x.includes('Enquired again'))).toBe(true)
  })
  it('an email with no customer in it goes to review, never makes a lead', async () => {
    const r = await S.ingestEmail(F.deps, { messageId: 'r', from: 'Spam <noreply@spam.com>', subject: 'Hi', body: 'Hello there' })
    expect(r.review).toBe(true); expect(F.t.leads).toHaveLength(0); expect(F.t.inbox[0].status).toBe('review')
    const made = await run('inboxCreate', { id: F.t.inbox[0].id, parsed: { first: 'Sam', mobile: '0400 111 222', state: 'NT' } })
    expect(made.lead).toMatchObject({ first: 'Sam', state: 'NT', owner: 'jb' }); expect(F.t.inbox[0].status).toBe('lead')
    await expect(run('inboxCreate', { id: 'nope' })).rejects.toThrow(/No such email/)
  })
  it('a plain email from a customer is held for a look instead of becoming a lead on its own', async () => {
    const r = await S.ingestEmail(F.deps, { messageId: 'plain', from: 'Tom Walker <tom.walker@gmail.com>', subject: 'Question', body: 'Do you deliver to Darwin? Call 0412 345 678' })
    expect(r.review).toBe(true); expect(F.t.leads).toHaveLength(0); expect(F.t.inbox[0].note).toMatch(/plain email/)
    const made = await run('inboxCreate', { id: F.t.inbox[0].id })
    expect(made.lead).toMatchObject({ first: 'Tom', last: 'Walker', mobile: '0412 345 678' })
  })
  it('a failure telling people never loses the lead', async () => {
    F.deps.chat.insertMessage = async () => { throw new Error('chat down') }
    F.deps.wp.send = async () => { throw new Error('push down') }
    const r = await S.ingestEmail(F.deps, { messageId: 'ok', body: FORM() })
    expect(r.lead.first).toBe('Mia'); expect(F.t.leads).toHaveLength(1)
  })
})

describe('companies, agents and who sees what', () => {
  const company = { name: 'Barry Plant Whittlesea', legalName: 'Barry Plant Whittlesea Pty Ltd', idNumber: '51 824 753 556', address: { street: '1 High St', suburb: 'Mernda', state: 'VIC', postcode: '3754' }, landline: '03 9000 0000', mobile: '0425 709 479', email: 'office@example.com', licenceNo: '012345L', licenceState: 'VIC', principal: 'Spiro Drabbos', states: ['VIC', 'QLD'] }
  async function setup() {
    const c = (await run('companySave', { company })).company
    const o = (await run('companySave', { company: { name: 'The Agency', idNumber: '123456789', states: ['VIC'] } })).company
    const mgr = (await run('agentSave', { agent: { name: 'Spiro Drabbos', companyId: c.id, role: 'Manager', email: 'spiro@example.com', mobile: '0425 709 479', licenceNo: 'L1', states: ['VIC'] } })).agent
    const rep = (await run('agentSave', { agent: { name: 'Pat Rep', companyId: c.id, role: 'Salesperson', email: 'pat@example.com', mobile: '0400 000 000' } })).agent
    const other = (await run('agentSave', { agent: { name: 'Steven Chen', companyId: o.id, email: 'stevenchen@theagency.com.au', mobile: '0412 959 959' } })).agent
    return { c, o, mgr, rep, other }
  }
  it('keeps the full company details: ABN or ACN, address, landline, mobile and licence number', async () => {
    const { c, o } = await setup()
    expect(c).toMatchObject({ name: 'Barry Plant Whittlesea', idType: 'ABN', idNumber: '51824753556', idChecked: 'ABN', licenceNo: '012345L', licenceState: 'VIC', landline: '03 9000 0000', mobile: '0425 709 479', principal: 'Spiro Drabbos' })
    expect(c.address).toEqual({ street: '1 High St', suburb: 'Mernda', state: 'VIC', postcode: '3754' })
    expect(o).toMatchObject({ idType: 'ACN', idNumber: '123456789' })
    await expect(run('companySave', { company: { name: '' } })).rejects.toThrow(/name/)
    await expect(run('companySave', { company }, agentSession('spiro@example.com'))).rejects.toThrow(/HAAVN BLACK team/)
  })
  it('holds many agents under one company, each with a mobile, email and licence, and each can sign in', async () => {
    const { c, mgr, rep } = await setup()
    expect(mgr).toMatchObject({ companyId: c.id, role: 'Manager', licenceNo: 'L1', mobile: '0425 709 479' }); expect(rep.role).toBe('Salesperson')
    expect((await run('init', {})).agents.filter((a: any) => a.companyId === c.id)).toHaveLength(2)
    expect(O.list().map((p: any) => p.email).sort()).toEqual(['pat@example.com', 'spiro@example.com', 'stevenchen@theagency.com.au'])
    await expect(run('agentSave', { agent: { name: 'Dup', companyId: c.id, email: 'pat@example.com' } })).rejects.toThrow(/already an agent/)
    await expect(run('agentSave', { agent: { name: 'No Mail', companyId: c.id } })).rejects.toThrow(/email address is needed/)
  })
  it('a manager adds salespeople to their own company only; a salesperson cannot add anyone', async () => {
    const { c, o } = await setup()
    const spiro = agentSession('spiro@example.com')
    const made = await run('agentSave', { agent: { name: 'New Rep', companyId: c.id, email: 'new@example.com' } }, spiro)
    expect(made.agent.companyId).toBe(c.id)
    await expect(run('agentSave', { agent: { name: 'Sneak', companyId: o.id, email: 's@example.com' } }, spiro)).rejects.toThrow(/own company/)
    await expect(run('agentSave', { agent: { name: 'Nope', companyId: c.id, email: 'n@example.com' } }, agentSession('pat@example.com'))).rejects.toThrow(/Only a manager/)
  })
  it('an agent sees only their own leads, a manager sees the company, the team sees everything, strangers see nothing', async () => {
    const { c, mgr, rep, other } = await setup()
    const mk = async (first: string, owner: string, companyId: string) => (await run('newLead', { lead: { first, last: 'T', mobile: '0400 000 ' + (100 + F.t.leads.length), state: 'VIC', owner } })).lead
    const a = await mk('A', 'jb', ''), b = await mk('B', rep.id, c.id), d = await mk('D', other.id, other.companyId)
    for (const l of [b, d]) { const row = F.t.leads.find((x: any) => x.id === l.id); row.owner = l.owner; row.company_id = l.id === b.id ? c.id : other.companyId }
    const names = async (who: any) => (await run('init', {}, who)).leads.map((l: any) => l.first).sort()
    expect(await names(jamie)).toEqual(['A', 'B', 'D']); expect(await names(mike)).toEqual(['A', 'B', 'D'])
    expect(await names(agentSession('pat@example.com'))).toEqual(['B']); expect(await names(agentSession('spiro@example.com'))).toEqual(['B'])
    expect(await names(agentSession('stevenchen@theagency.com.au'))).toEqual(['D'])
    await expect(run('init', {}, agentSession('stranger@example.com'))).rejects.toThrow(/do not have access/)
    await expect(run('saveLead', { lead: { id: a.id, first: 'Hacked' } }, agentSession('pat@example.com'))).rejects.toThrow(/not yours/)
    const inbox = await run('init', {}, agentSession('pat@example.com')); expect(inbox.inbox).toEqual([]); expect(inbox.companies).toHaveLength(1)
    await expect(run('inboxDismiss', { id: 'x' }, agentSession('pat@example.com'))).rejects.toThrow(/HAAVN BLACK team/)
    await expect(run('settingsSave', { settings: { prices: { studio: 1 } } }, mike)).rejects.toThrow(/director/)
    expect(mgr.id).toBeTruthy()
  })
  it('a deactivated agent loses access at once', async () => {
    const { c, rep } = await setup()
    await run('agentSave', { agent: { id: rep.id, name: rep.name, companyId: c.id, email: rep.email, active: false } })
    await expect(run('init', {}, agentSession('pat@example.com'))).rejects.toThrow(/do not have access/)
  })
})

describe('working a lead through the stages', () => {
  it('moves through the early stages by hand, then waits at the pre-order deposit', async () => {
    const l = (await S.ingestEmail(F.deps, { messageId: 'x', body: FORM() })).lead
    let r = (await run('saveLead', { lead: { id: l.id, stage: 1, act: [{ t: 5, x: 'Called', k: 'note' }] } })).lead
    expect(r).toMatchObject({ stage: 1, maxStage: 1, gate: null }); expect(r.act.map((x: any) => x.x)).toContain('Called')
    r = (await run('saveLead', { lead: { id: l.id, stage: 2 } })).lead
    r = (await run('saveLead', { lead: { id: l.id, stage: 3 } })).lead
    expect(r).toMatchObject({ stage: 3, maxStage: 3, gate: 'pre', paid: false })
    await expect(run('saveLead', { lead: { id: l.id, stage: 4 } })).rejects.toThrow(/approval/)
    await expect(run('saveLead', { lead: { id: l.id, stage: 7 } })).rejects.toThrow(/approval/)
    expect((await get(l.id)).stage).toBe(3)
  })
  it('a customer cannot skip a stage, and only a director steps one back, keeping how far it got', async () => {
    const l = await mkLead()
    await expect(run('saveLead', { lead: { id: l.id, stage: 2 } })).rejects.toThrow(/one stage at a time/)
    const at7 = await through(l.id, 7)
    expect(at7).toMatchObject({ stage: 7, maxStage: 7, gate: null }); expect(at7.order).toMatchObject({ step: 0 })
    await expect(run('saveLead', { lead: { id: l.id, stage: 5 } }, mike)).rejects.toThrow(/director/)
    const back = (await run('saveLead', { lead: { id: l.id, stage: 5 } })).lead
    expect(back).toMatchObject({ stage: 5, maxStage: 7, gate: 'invoice', paid: false })
    expect(back.act.map((x: any) => x.x).join(' ')).toContain('Stepped back to Contract signed by Jamie Baldwin')
  })
  it('an agent can update their customer and the site but not the delivery step, and cannot reassign to a stranger', async () => {
    const c = (await run('companySave', { company: { name: 'Co' } })).company
    const ag = (await run('agentSave', { agent: { name: 'Pat', companyId: c.id, email: 'pat@example.com' } })).agent
    const l = (await run('newLead', { lead: { first: 'Z', mobile: '0400 123 123', state: 'QLD', owner: ag.id } })).lead
    F.t.leads[0].company_id = c.id; F.t.leads[0].owner = ag.id
    await through(l.id, 7)
    const me = agentSession('pat@example.com')
    const r = (await run('saveLead', { lead: { id: l.id, order: { step: 6, site: '9 Gum Rd' }, owner: 'jb' } }, me)).lead
    expect(r.order).toMatchObject({ step: 0, site: '9 Gum Rd' }); expect(r.owner).toBe(ag.id)
  })
  it('the handover goes to projects@haavn.au and a customer email goes to the customer, both copied to the sender, only when asked', async () => {
    const l = (await S.ingestEmail(F.deps, { messageId: 'h', body: FORM() })).lead
    await through(l.id, 7); await run('saveLead', { lead: { id: l.id, order: { step: 0, site: '12 Wattle Rd', eta: 1, lastUpdate: 1, log: [] } } })
    expect(F.sent).toHaveLength(0)
    await run('handover', { id: l.id }, mike)
    expect(F.sent[0]).toMatchObject({ to: ['projects@haavn.au'], replyTo: 'mike@haavn.au', bcc: 'mike@haavn.au' }); expect(F.sent[0].subject).toContain('Mia Brennan'); expect(F.sent[0].html).toContain('12 Wattle Rd')
    await run('emailCustomer', { id: l.id, subject: 'Your update', body: 'Hi Mia' }, mike)
    expect(F.sent[1]).toMatchObject({ to: ['mia.brennan@example.com'] })
    await expect(run('emailCustomer', { id: l.id, body: '' }, mike)).rejects.toThrow(/Write the message/)
    F.mail.configured = false
    await expect(run('handover', { id: l.id }, mike)).rejects.toThrow(/not set up/)
  })
  it('keeps the spend start date and ignores a bad one', async () => {
    const r = await run('settingsSave', { settings: { spendFrom: '2026-11-01' } })
    expect(r.settings.spendFrom).toBe('2026-11-01')
    const r2 = await run('settingsSave', { settings: { spendFrom: 'soon' } })
    expect(r2.settings.spendFrom).toBe('2026-11-01')
  })

  it('only a director changes prices, spend and routing', async () => {
    const r = await run('settingsSave', { settings: { prices: { studio: '189,000' }, spend: { Facebook: 2400 }, rules: { NT: 'mf' }, notify: { push: false } } })
    expect(r.settings.prices.studio).toBe(189000); expect(r.settings.spend.Facebook).toBe(2400); expect(r.settings.rules.NT).toBe('mf'); expect(r.settings.notify.push).toBe(false)
    expect((await run('init', {}, mike)).settings.prices.studio).toBe(189000)
  })
})

describe('reading the sales@haavnblack.au mailbox', () => {
  const env = { MS_TENANT_ID: 't', MS_CLIENT_ID: 'c', MS_CLIENT_SECRET: 's' }
  const fetcher = (mailStatus: number, msgs: any[]) => async (url: string) => {
    if (String(url).includes('oauth2')) return { ok: true, json: async () => ({ access_token: 'tok' }) }
    return { ok: mailStatus === 200, status: mailStatus, json: async () => ({ value: msgs }) }
  }
  it('turns new mail into leads, oldest first, once each', async () => {
    const msgs = [
      { id: 'b', internetMessageId: '<b>', subject: 'New enquiry: Lee', from: { emailAddress: { name: 'Web', address: 'no-reply@haavnblack.au' } }, receivedDateTime: '2026-11-04T01:00:00Z', body: { contentType: 'text', content: FORM({ email: 'lee@example.com', phone: '0400 555 111', first: 'Lee' }) } },
      { id: 'a', internetMessageId: '<a>', subject: 'New enquiry: Mia', from: { emailAddress: { name: 'Web', address: 'no-reply@haavnblack.au' } }, receivedDateTime: '2026-11-04T00:00:00Z', body: { contentType: 'text', content: FORM() } },
    ]
    const r = await MAIL.poll(env, F.deps, fetcher(200, msgs))
    expect(r).toMatchObject({ ok: true, processed: 2, leads: 2 }); expect(F.t.leads).toHaveLength(2)
    expect((await MAIL.poll(env, F.deps, fetcher(200, msgs))).processed).toBe(0)
    expect(F.t.settings.mail).toMatchObject({ ok: true, mailbox: 'sales@haavn.au' })
  })
  it('says so plainly when Microsoft will not let ATRIUM read the mailbox, or it is not set up', async () => {
    const r = await MAIL.poll(env, F.deps, fetcher(403, []))
    expect(r.ok).toBe(false); expect(r.error).toMatch(/Mail\.Read/); expect(F.t.settings.mail.error).toMatch(/Mail\.Read/)
    expect((await MAIL.poll({}, F.deps, fetcher(200, []))).error).toMatch(/not set up/)
  })
})

describe('approvals: Alessia for the contract, Amy and Dominika for the money', () => {
  const tasks = () => (F.t.doc[B.KEYS.workflow] ? F.t.doc[B.KEYS.workflow].actions.filter((x: any) => x.project === 'HAAVN BLACK Sales' && !/^Call /.test(x.title)) : [])
  const contractGroup = () => F.t.groups.find((g: any) => g.dm_key === 'hbcontract')
  it('each gate makes one task for the right person, the others watch, and the team is told in their Chat group', async () => {
    const l = await mkLead()
    await through(l.id, 3)
    expect(tasks().map((t: any) => t.title)).toEqual(['Confirm the $2,000 pre-order deposit: Mia Brennan'])
    expect(tasks()[0]).toMatchObject({ owner: 'Amy Baldwin', watchers: expect.arrayContaining(['Alessia Bresciano', 'Dominika Ma']), dept: 'haavnblack' })
    await through(l.id, 4)
    expect(tasks().map((t: any) => t.title)).toEqual(['Confirm the $2,000 pre-order deposit: Mia Brennan', 'Issue the contract: Mia Brennan'])
    expect(tasks()[1].owner).toBe('Alessia Bresciano')
    await through(l.id, 5)
    expect(tasks().map((t: any) => t.title).slice(2)).toEqual(['File the signed contract: Mia Brennan', 'Raise the 10% deposit invoice: Mia Brennan ($16,500)'])
    expect(tasks()[3].owner).toBe('Amy Baldwin')
    await through(l.id, 6)
    expect(tasks()[4].title).toBe('Confirm the order and hand over to projects: Mia Brennan'); expect(tasks()[4].owner).toBe('Alessia Bresciano')
    await through(l.id, 8)
    expect(tasks()[5].title).toBe('Confirm the final payment: Mia Brennan ($166,500)')
    expect(tasks()).toHaveLength(6)
    expect(contractGroup()).toMatchObject({ name: 'HAAVN Contract Team', is_private: true })
    expect(F.t.members.filter((m: any) => m.group_id === contractGroup().id).map((m: any) => m.member).sort()).toEqual(['ab', 'ar', 'dm', 'jb', 'mf'])
    expect(F.t.msgs.filter((m: any) => m.group_id === contractGroup().id)).toHaveLength(6)
    expect(Object.keys(S.leadOut(F.t.leads[0]).adminTasks).sort()).toEqual(['confirm', 'final', 'invoice', 'issue', 'pre', 'signed'])
  })
  it('the deposits are the website\'s numbers: $2,000 pre-order, then 10% less that, then the full 90% balance before delivery', async () => {
    const st = await S.getSettings(F.deps.db)
    expect(st.prices).toEqual({ studio: 145000, plus: 185000, max: 215000 }); expect(st.preorder).toBe(2000)
    const l = await mkLead()
    expect(S.gateAmount(st, l, 'pre')).toBe(2000)
    expect(S.gateAmount(st, { product: 'studio' }, 'dep')).toBe(12500); expect(S.gateAmount(st, { product: 'plus' }, 'dep')).toBe(16500); expect(S.gateAmount(st, { product: 'max' }, 'dep')).toBe(19500)
    expect(S.gateAmount(st, { product: 'studio' }, 'final')).toBe(130500); expect(S.gateAmount(st, { product: 'plus' }, 'final')).toBe(166500); expect(S.gateAmount(st, { product: 'max' }, 'final')).toBe(193500)
    await run('settingsSave', { settings: { prices: { plus: 0 } } })
    expect((await S.getSettings(F.deps.db)).prices.plus).toBe(185000)
  })
  it('prices saved before the code price list win once: the code prices apply, then a director\'s own edit sticks', async () => {
    F.t.settings.sales = { prices: { studio: 145000, plus: 187000, max: 210000 }, preorder: 2000, inboxKeep: 14 }
    expect((await S.getSettings(F.deps.db)).prices).toEqual({ studio: 145000, plus: 185000, max: 215000 })
    expect((await run('init', {}, mike)).settings.prices).toEqual({ studio: 145000, plus: 185000, max: 215000 })
    await run('settingsSave', { settings: { notify: { task: false } } })   // saving something else does not bring the old prices back
    expect(F.t.settings.sales.prices).toEqual({ studio: 145000, plus: 185000, max: 215000 }); expect(F.t.settings.sales.inboxKeep).toBe(14)
    await run('settingsSave', { settings: { prices: { plus: 190000 } } })
    const st2 = await S.getSettings(F.deps.db); expect(st2.prices.plus).toBe(190000)
    expect(S.gateAmount(st2, { product: 'plus' }, 'dep')).toBe(17000); expect(S.gateAmount(st2, { product: 'plus' }, 'final')).toBe(171000)   // the deposit and the final payment follow the price a director sets
    await expect(run('settingsSave', { settings: { prices: { plus: 1 } } }, mike)).rejects.toThrow(/director/)
    await run('settingsSave', { settings: { inboxKeep: 7 } })
    await run('commissionSettings', { commission: { rates: { int: { plus: 4100 } } } })
    expect((await S.getSettings(F.deps.db)).prices).toEqual({ studio: 145000, plus: 190000, max: 215000 })
  })
  it('only the right person approves: Alessia the contract, Amy or Dominika the money, a director anything, Mike nothing', async () => {
    const l = await mkLead()
    await through(l.id, 3)
    await run('gate', { id: l.id, op: 'arrived' }, amy)
    await expect(run('gate', { id: l.id, op: 'approve' }, alessia)).rejects.toThrow(/Finance/)
    await expect(run('gate', { id: l.id, op: 'approve' }, mike)).rejects.toThrow(/Finance/)
    let r = (await run('gate', { id: l.id, op: 'approve', note: 'Matched to the statement' }, dominika)).lead
    expect(r).toMatchObject({ stage: 4, gate: 'issue' }); expect(r.appr[0]).toMatchObject({ g: 'pre', by: 'dm', name: 'Dominika Ma', note: 'Matched to the statement' })
    await expect(run('gate', { id: l.id, op: 'approve' }, amy)).rejects.toThrow(/Alessia/)
    r = (await run('gate', { id: l.id, op: 'approve' }, alessia)).lead
    expect(r).toMatchObject({ stage: 4, gate: 'out' })
    await expect(run('gate', { id: l.id, op: 'approve' }, alessia)).rejects.toThrow(/Waiting for the customer/)
    r = (await run('gate', { id: l.id, op: 'signed' }, alessia)).lead
    expect(r.gate).toBe('signed')
    r = (await run('gate', { id: l.id, op: 'approve' })).lead
    expect(r).toMatchObject({ stage: 5, gate: 'invoice', maxStage: 5 })
    expect(r.appr.map((x: any) => x.g)).toEqual(['signed', 'issue', 'pre'])
    const me = await run('init', {}, alessia)
    expect(me.me.gates.sort()).toEqual(['confirm', 'issue', 'signed']); expect(me.me.roles).toEqual(['con'])
    expect((await run('init', {}, amy)).me.gates.sort()).toEqual(['dep', 'final', 'invoice', 'pre']); expect((await run('init', {}, mike)).me.gates).toEqual([])
  })
  it('a money gate needs the payment recorded as arrived before it can be approved, and a sales agent cannot say a payment arrived', async () => {
    const c = (await run('companySave', { company: { name: 'Co' } })).company
    const ag = (await run('agentSave', { agent: { name: 'Pat', companyId: c.id, email: 'pat@example.com' } })).agent
    const l = (await run('newLead', { lead: { first: 'Z', mobile: '0400 123 123', state: 'QLD', owner: ag.id } })).lead
    F.t.leads[0].company_id = c.id; F.t.leads[0].owner = ag.id
    await through(l.id, 3)
    await expect(run('gate', { id: l.id, op: 'approve' })).rejects.toThrow(/payment has arrived/)
    const me = agentSession('pat@example.com')
    await expect(run('gate', { id: l.id, op: 'arrived' }, me)).rejects.toThrow()
    await expect(run('gate', { id: l.id, op: 'approve' }, me)).rejects.toThrow()
    expect((await run('gate', { id: l.id, op: 'arrived' }, amy)).lead).toMatchObject({ paid: true, stage: 3 })
    expect((await run('gate', { id: l.id, op: 'approve' }, amy)).lead).toMatchObject({ stage: 4 })
  })
  it('returning a customer holds it until the agent resubmits it, and says why', async () => {
    const l = await mkLead()
    await through(l.id, 3); await run('gate', { id: l.id, op: 'arrived' }, amy)
    await expect(run('gate', { id: l.id, op: 'return', why: '' }, amy)).rejects.toThrow(/why/)
    let r = (await run('gate', { id: l.id, op: 'return', why: 'Wrong amount' }, amy)).lead
    expect(r.ret).toMatchObject({ by: 'ab', why: 'Wrong amount' })
    await expect(run('gate', { id: l.id, op: 'approve' }, amy)).rejects.toThrow(/resubmitted/)
    r = (await run('gate', { id: l.id, op: 'resubmit' }, mike)).lead
    expect(r.ret).toBeNull()
    expect((await run('gate', { id: l.id, op: 'approve' }, amy)).lead.stage).toBe(4)
  })
  it('a screen cannot forge a gate, a payment or an approval', async () => {
    const l = await mkLead()
    const r = (await run('saveLead', { lead: { id: l.id, gate: 'dep', paid: true, appr: [{ g: 'pre', by: 'jb' }], adminTasks: { pre: 'x' } } })).lead
    expect(r).toMatchObject({ gate: null, paid: false, appr: [] }); expect(r.adminTasks).toBeUndefined()
    await through(l.id, 3)
    const r2 = (await run('saveLead', { lead: { id: l.id, paid: true, gate: 'issue' } })).lead
    expect(r2).toMatchObject({ gate: 'pre', paid: false })
  })
  it('the home reaching the port opens the final payment, and it is not delivered until that is approved', async () => {
    const l = await mkLead()
    const at7 = await through(l.id, 7)
    await expect(run('saveLead', { lead: { id: l.id, order: { ...at7.order, step: 6 } } })).rejects.toThrow(/final payment/)
    let r = (await run('saveLead', { lead: { id: l.id, order: { ...at7.order, step: 4 } } })).lead
    expect(r.stage).toBe(7)
    r = (await run('saveLead', { lead: { id: l.id, order: { ...r.order, step: 5 } } })).lead
    expect(r).toMatchObject({ stage: 8, gate: 'final', paid: false }); expect(r.act.map((x: any) => x.x).join(' ')).toContain('final payment is due before it is delivered')
    await expect(run('saveLead', { lead: { id: l.id, order: { ...r.order, step: 6 } } })).rejects.toThrow(/final payment/)
    await expect(run('gate', { id: l.id, op: 'approve' }, amy)).rejects.toThrow(/payment has arrived/)
    await run('gate', { id: l.id, op: 'arrived' }, amy)
    r = (await run('gate', { id: l.id, op: 'approve' }, dominika)).lead
    expect(r).toMatchObject({ stage: 9, gate: null, maxStage: 9 })
    r = (await run('saveLead', { lead: { id: l.id, order: { ...r.order, step: 6 } } })).lead
    expect(r.order.step).toBe(6)
  })
  it('a lead from before approvals existed takes the gate its stage puts it at', async () => {
    const l = await mkLead()
    const old = { ...F.t.leads[0].data, maxStage: 5 }; for (const k of ['gate', 'paid', 'gateAt', 'appr', 'ret', 'chased']) delete old[k]   // saved before approvals existed: none of these fields
    F.t.leads[0].stage = 5; F.t.leads[0].data = old
    expect(S.leadOut(F.t.leads[0])).toMatchObject({ stage: 5, gate: 'invoice', paid: false, appr: [], ret: null })
    F.t.leads[0].stage = 6; expect(S.leadOut(F.t.leads[0]).gate).toBe('confirm')
    F.t.leads[0].stage = 4; expect(S.leadOut(F.t.leads[0]).gate).toBe('out')
    F.t.leads[0].stage = 7; expect(S.leadOut(F.t.leads[0]).gate).toBeNull()
  })
  it('nobody is tasked when it is switched off, and only a director changes who approves', async () => {
    await run('settingsSave', { settings: { notify: { task: false } } })
    const l = await mkLead(); await through(l.id, 4)
    expect(tasks()).toHaveLength(0)
    await expect(run('settingsSave', { settings: { approvers: { fin: ['ab'] } } }, mike)).rejects.toThrow(/director/)
    const r = await run('settingsSave', { settings: { approvers: { con: ['ar', 'zz'], fin: ['dm'] } } })
    expect(r.settings.approvers).toEqual({ con: ['ar'], fin: ['dm'] })
    await expect(run('settingsSave', { settings: { approvers: { con: [], fin: ['dm'] } } })).rejects.toThrow(/at least one/)
    expect((await run('settingsSave', { settings: { contractTeam: ['ar', 'ab', 'dm', 'zz'] } })).settings.contractTeam).toEqual(['ar', 'ab', 'dm'])
    expect((await run('init', {}, mike)).staff.map((p: any) => p.name)).toEqual(expect.arrayContaining(['Alessia Bresciano', 'Amy Baldwin', 'Dominika Ma']))
  })
  it('all three sign in as the HAAVN team and see every lead', async () => {
    const l = (await S.ingestEmail(F.deps, { messageId: 'rec', body: FORM() })).lead
    for (const w of [alessia, amy, dominika]) expect((await run('init', {}, w)).leads.map((x: any) => x.id)).toEqual([l.id])
  })
})

describe('the website\'s own registration email', () => {
  const REG = `New registration · haavnblack.au\r\nLen Example\r\nContact\r\nEmail len.example@example.com \r\nState Victoria\r\nSetting Country\r\nTheir SOLUM\r\nModel SOLUM Plus\r\nCladding Urbanite\r\nInterior Tide\r\nJoinery Dark Oak\r\nDelivery Delivered\r\nPayment Cash\r\nReply to this email to answer Len directly.\r\nReceived Tuesday, 3 November 2026 at 10:33 pm.`
  const SHORT = `New registration · haavnblack.au\r\nTEST TEST RUN\r\nContact\r\nEmail test@example.com \r\nPhone 0416922911 \r\nState Victoria\r\nSetting City\r\nReply to this email to answer TEST directly.`
  it('reads the name, contact, state, home and every finish from the real layout', () => {
    expect(S.parseEnquiry(REG, { from: 'Haavn Sales <sales@haavn.au>', subject: 'Registration: Len Example · SOLUM Plus · VIC' })).toMatchObject({ first: 'Len', last: 'Example', email: 'len.example@example.com', state: 'VIC', setting: 'Country', product: 'plus', clad: 'Urbanite', pal: 'Tide', join: 'Dark Oak', deliv: 'Delivered', pay: 'Cash', source: 'Facebook', complete: true, formLike: true })
    expect(S.parseEnquiry(SHORT, { subject: 'Registration: TEST TEST RUN · VIC' })).toMatchObject({ first: 'TEST', last: 'TEST RUN', mobile: '0416922911', state: 'VIC', product: 'none', formLike: true })
  })
  it('becomes a lead, and an email held earlier is read again and made a lead once the reader understands it', async () => {
    F.t.inbox.push({ id: 'Mold', message_id: 'old1', received_at: '2026-11-03T11:33:00Z', from_addr: 'Haavn Sales <sales@haavn.au>', subject: 'Registration: Len Example · SOLUM Plus · VIC', body: REG, status: 'review', lead_id: null, note: 'A plain email' })
    const r = await S.ingestEmail(F.deps, { messageId: 'old1', from: 'Haavn Sales <sales@haavn.au>', subject: 'Registration: Len Example · SOLUM Plus · VIC', body: REG })
    expect(r.lead).toMatchObject({ first: 'Len', state: 'VIC', owner: 'jb', product: 'plus', pal: 'Tide' })
    expect(F.t.inbox).toHaveLength(1); expect(F.t.inbox[0]).toMatchObject({ id: 'Mold', status: 'lead', lead_id: r.lead.id })
    expect((await S.ingestEmail(F.deps, { messageId: 'old1', body: REG })).skipped).toBe('already seen')
    expect(F.t.msgs[0].body).toContain('New HAAVN BLACK lead for Jamie Baldwin')
  })
  it('an ordinary newsletter is still held for a look and stays one row', async () => {
    const e = { messageId: 'news', from: 'Instagram Business <business-noreply@mail.instagram.com>', subject: 'How business chats work', body: 'Hello! Learn how chats work.' }
    expect((await S.ingestEmail(F.deps, e)).review).toBe(true); expect((await S.ingestEmail(F.deps, e)).review).toBe(true)
    expect(F.t.inbox).toHaveLength(1); expect(F.t.leads).toHaveLength(0)
  })
})

describe('clearing the Inbox', () => {
  const day = 864e5
  const FORM2 = () => `New registration · haavnblack.au\r\nZoe Clear\r\nContact\r\nEmail zoe.clear@example.com \r\nPhone 0411 222 333 \r\nState Victoria\r\nSetting City\r\nModel SOLUM Plus`
  const mk = async (id: string, receivedAt: number, body = FORM2()) => S.ingestEmail(F.deps, { messageId: id, from: 'Haavn Sales <sales@haavn.au>', subject: 'Registration: Zoe Clear · SOLUM Plus · VIC', body, receivedAt })

  it('the original email is kept on the customer, shown only to the team, and survives clearing the Inbox', async () => {
    const r = await mk('c1', Date.now() - 10 * day)
    expect(r.lead.hasMail).toBe(true); expect(r.lead.srcMail).toBeUndefined()
    await run('inboxClear', { id: F.t.inbox[0].id })
    expect(F.t.inbox).toHaveLength(0)
    const m = await run('leadMail', { id: r.lead.id })
    expect(m.mail).toHaveLength(1); expect(m.mail[0].body).toContain('zoe.clear@example.com'); expect(m.mail[0].subject).toContain('Zoe Clear')
    await run('saveLead', { lead: { id: r.lead.id, msg: 'changed' } })
    expect((await run('leadMail', { id: r.lead.id })).mail).toHaveLength(1)
  })
  it('a second email from the same customer is added to the same customer, newest first', async () => {
    await mk('c1', Date.now() - 2 * day); const r = await mk('c2', Date.now() - day, FORM2() + '\r\nMessage Is the Plus available in March?')
    expect(r.dup).toBe(true)
    expect((await run('leadMail', { id: r.lead.id })).mail).toHaveLength(2)
  })
  it('a recent email leaves a marker with no text so it is never read in again; an old one goes completely', async () => {
    await mk('recent', Date.now() - 1 * day); const row = F.t.inbox[0]
    await run('inboxClear', { id: row.id })
    expect(F.t.inbox[0]).toMatchObject({ status: 'cleared', message_id: 'recent', body: '', subject: '' })
    expect((await run('init', {})).inbox).toEqual([])
    expect((await mk('recent', Date.now() - 1 * day)).skipped).toBe('already seen'); expect(F.t.leads).toHaveLength(1)
    await S.tidyInbox(F.deps); expect(F.t.inbox).toHaveLength(1)
    F.t.inbox[0].received_at = new Date(Date.now() - 8 * day).toISOString(); await S.tidyInbox(F.deps); expect(F.t.inbox).toHaveLength(0)
  })
  it('Clear handled only takes emails that became a lead or were dismissed, never one that still needs a look', async () => {
    await mk('h1', Date.now() - 20 * day)
    await S.ingestEmail(F.deps, { messageId: 'news', from: 'Instagram Business <x@mail.instagram.com>', subject: 'How business chats work', body: 'Hello! Learn how chats work.' })
    await S.ingestEmail(F.deps, { messageId: 'news2', from: 'Other <y@example.com>', subject: 'Offer', body: 'Buy now.' })
    const review = F.t.inbox.filter((x: any) => x.status === 'review'); expect(review).toHaveLength(2)
    await run('inboxDismiss', { id: review[1].id })
    expect((await run('inboxClearHandled', { days: 0 })).cleared).toBe(2)
    expect((await run('init', {})).inbox.map((x: any) => x.message_id)).toEqual(['news'])
  })
  it('the automatic clear-out follows the setting, and only a director can change it', async () => {
    await mk('a1', Date.now() - 20 * day); await mk('a2', Date.now() - 3 * day); await S.ingestEmail(F.deps, { messageId: 'a3', from: 'Haavn Sales <sales@haavn.au>', subject: 'Registration: Ben New · VIC', body: FORM2().replace('Zoe Clear', 'Ben New').replace('zoe.clear', 'ben.new').replace('0411 222 333', '0411 999 888'), receivedAt: Date.now() - 3 * day })
    expect((await S.getSettings(F.deps.db)).inboxKeep).toBe(0); expect((await S.tidyInbox(F.deps)).cleared).toBe(0)
    expect((await run('settingsSave', { settings: { inboxKeep: 14 } })).settings.inboxKeep).toBe(14)
    await run('settingsSave', { settings: { inboxKeep: 5 } }); expect((await S.getSettings(F.deps.db)).inboxKeep).toBe(14)
    expect((await S.tidyInbox(F.deps)).cleared).toBe(1)
    expect(F.t.inbox.filter((x: any) => x.status !== 'cleared').map((x: any) => x.message_id).sort()).toEqual(['a2', 'a3'])
  })
  it('outside agents cannot clear, read or list the inbox', async () => {
    const r = await mk('o1', Date.now()); const c = (await run('companySave', { company: { name: 'Barry Plant' } })).company
    await run('agentSave', { agent: { name: 'Pat Rep', companyId: c.id, role: 'Salesperson', email: 'pat@example.com', mobile: '0400 000 000' } }); const ag = agentSession('pat@example.com')
    await expect(run('inboxClear', { id: F.t.inbox[0].id }, ag)).rejects.toThrow(/HAAVN BLACK team/)
    await expect(run('inboxClearHandled', {}, ag)).rejects.toThrow(/HAAVN BLACK team/)
    await expect(run('leadMail', { id: r.lead.id }, ag)).rejects.toThrow(/HAAVN BLACK team/)
  })
})

describe('commission: half when the 10% deposit is confirmed, half on delivery', () => {
  const comm = (who: any = jamie) => run('commission', {}, who)
  const lineOf = async (id: string, who: any = jamie) => (await comm(who)).lines.find((x: any) => x.id === id)
  const company = async () => (await run('companySave', { company: { name: 'Harbour Realty' } })).company
  const agentOf = async (co: any) => (await run('agentSave', { agent: { name: 'Pat Reynolds', companyId: co.id, email: 'pat@example.com' } })).agent
  // a SOLUM customer; owner (a team id or an agent row) and source decide the rate
  let seq = 0
  const mk = async (o: any = {}) => {
    seq++   // each customer has their own email and mobile, or the system rightly reads them as one customer enquiring again
    const l = (await S.ingestEmail(F.deps, { messageId: 'k' + seq, body: FORM({ model: o.model || 'SOLUM Plus', state: o.state || 'Queensland', utm: o.utm || '', email: `cust${seq}@example.com`, phone: `04${String(10000000 + seq * 7919).slice(0, 8)}`, first: 'Cust' + seq, last: 'Test' }) })).lead
    if (o.owner) { const row = F.t.leads.find((x: any) => x.id === l.id); row.owner = o.owner.id; row.company_id = o.owner.company_id || null }
    return l
  }
  const deliver = async (id: string) => { const l = await get(id); await run('saveLead', { lead: { id, order: { ...l.order, step: 6 } } }) }
  const paidAll = async (id: string) => { for (const n of [1, 2]) await run('commissionPay', { id, half: n }, amy) }
  const secretSession = { sub: 'xx', name: 'Someone Else', role: 'staff', emails: [] }

  it('pays the rates Jamie set: internal 3,000 / 4,000 / 5,000, and 5,000 / 6,500 / 8,000 for an external agent or an own lead', async () => {
    const co = await company(), ag = await agentOf(co), got: any = {}
    for (const [model, key] of [['SOLUM Studio', 'studio'], ['SOLUM Plus', 'plus'], ['SOLUM Max', 'max']]) {
      const house = await mk({ model }), own = await mk({ model, utm: 'agent referral' }), ext = await mk({ model, owner: ag })
      for (const l of [house, own, ext]) await through(l.id, 3)
      const r = await comm()
      got[key] = [house, own, ext].map((l: any) => r.lines.find((x: any) => x.id === l.id).rate)
    }
    expect(got).toEqual({ studio: [3000, 5000, 5000], plus: [4000, 6500, 6500], max: [5000, 8000, 8000] })
    const c = await lineOf((await comm()).lines[0].id)
    expect(c.h[0].amt + c.h[1].amt).toBe(c.rate)
  })
  it('the first half falls due when the 10% deposit is confirmed, the final half when the home is delivered, not before', async () => {
    const l = await mk(), seen: string[][] = []
    const st = async () => (await lineOf(l.id)).h.map((x: any) => x.st)
    await run('saveLead', { lead: { id: l.id, stage: 1 } }); expect(await lineOf(l.id)).toBeUndefined()     // nothing before the pre-order
    await through(l.id, 3); seen.push(await st())
    await through(l.id, 5); seen.push(await st())
    await through(l.id, 6); seen.push(await st())
    await through(l.id, 9); seen.push(await st())     // the final payment is approved, the home is not delivered yet
    await deliver(l.id); seen.push(await st())
    expect(seen).toEqual([['later', 'later'], ['later', 'later'], ['due', 'later'], ['due', 'later'], ['due', 'due']])
    expect((await get(l.id)).order.deliveredAt).toBeGreaterThan(0)
  })
  it('nothing is owed on a concept home, a lost customer, or someone switched off, unless something was already paid', async () => {
    const a = await mk({ model: 'OCTA Max' }), b = await mk(), c = await mk()
    await through(b.id, 6); await through(c.id, 6)
    await run('saveLead', { lead: { id: b.id, status: 'lost', lostWhy: 'Price' } })
    expect(await lineOf(a.id)).toBeUndefined(); expect(await lineOf(b.id)).toBeUndefined(); expect(await lineOf(c.id)).toBeTruthy()
    await run('commissionSettings', { commission: { off: ['jb', 'mf'] } }); expect(await lineOf(c.id)).toBeUndefined()
    await run('commissionSettings', { commission: { off: [] } }); await run('commissionPay', { id: c.id, half: 1 }, amy)
    await run('commissionSettings', { commission: { off: ['jb', 'mf'] } }); expect((await lineOf(c.id)).h[0].st).toBe('paid')   // what was paid stays on the books
  })
  it('Finance and directors pay in order: the first half, then the final payment, never early and never twice', async () => {
    const l = await mk(); await through(l.id, 6)
    await expect(run('commissionPay', { id: l.id, half: 2 }, amy)).rejects.toThrow(/falls due when the home is delivered/)
    await expect(run('commissionPay', { id: l.id, half: 3 }, amy)).rejects.toThrow()
    let r = (await run('commissionPay', { id: l.id, half: 1, ref: 'BANK 7731' }, amy)).line
    expect(r.h[0]).toMatchObject({ st: 'paid', by: 'ab', byName: 'Amy Baldwin', ref: 'BANK 7731' }); expect(r.log[0].x).toContain('First half of $2,000 marked paid, ref BANK 7731')
    await expect(run('commissionPay', { id: l.id, half: 1 }, dominika)).rejects.toThrow(/already/)
    await through(l.id, 9); await deliver(l.id)
    r = (await run('commissionPay', { id: l.id, half: 2 }, dominika)).line
    expect(r.h.map((x: any) => x.st)).toEqual(['paid', 'paid'])
    const l2 = await mk(); await through(l2.id, 9); await deliver(l2.id)
    await expect(run('commissionPay', { id: l2.id, half: 2 }, amy)).rejects.toThrow(/first half before/)
  })
  it('only Finance and directors can pay, undo, hold or add notes: Alessia sees everything and changes nothing', async () => {
    await agentOf(await company())
    const l = await mk(); await through(l.id, 6)
    for (const who of [alessia, mike, secretSession, agentSession('pat@example.com')]) {
      await expect(run('commissionPay', { id: l.id, half: 1 }, who)).rejects.toThrow(/Finance and directors/)
      await expect(run('commissionUndo', { id: l.id, half: 1, reason: 'x' }, who)).rejects.toThrow(/Finance and directors/)
      await expect(run('commissionHold', { id: l.id, hold: true, reason: 'x' }, who)).rejects.toThrow(/Finance and directors/)
      await expect(run('commissionNote', { id: l.id, text: 'x' }, who)).rejects.toThrow(/Finance and directors/)
    }
    const r = await comm(alessia); expect(r).toMatchObject({ role: 'office', canPay: false, canEdit: false }); expect(r.lines.length).toBeGreaterThan(0)
    expect(await comm(amy)).toMatchObject({ role: 'office', canPay: true, canEdit: false }); expect(await comm(jamie)).toMatchObject({ canPay: true, canEdit: true })
    expect((await get(l.id)).hasMail !== undefined).toBe(true)
  })
  it('undo needs a reason and is logged, the first half cannot be undone while the final is paid, and a hold stops payment until released', async () => {
    const l = await mk(); await through(l.id, 9); await deliver(l.id); await paidAll(l.id)
    await expect(run('commissionUndo', { id: l.id, half: 2, reason: '' }, amy)).rejects.toThrow(/why/)
    await expect(run('commissionUndo', { id: l.id, half: 1, reason: 'Wrong account' }, amy)).rejects.toThrow(/final payment first/)
    let r = (await run('commissionUndo', { id: l.id, half: 2, reason: 'Reversed by the bank' }, amy)).line
    expect(r.h.map((x: any) => x.st)).toEqual(['paid', 'due']); expect(r.log[0].x).toBe('Final payment payment undone: Reversed by the bank')
    r = (await run('commissionUndo', { id: l.id, half: 1, reason: 'Paid to the wrong account' }, amy)).line
    expect(r.h.map((x: any) => x.st)).toEqual(['due', 'due'])
    await expect(run('commissionHold', { id: l.id, hold: true, reason: '' }, amy)).rejects.toThrow(/why/)
    r = (await run('commissionHold', { id: l.id, hold: true, reason: 'Customer disputing delivery' }, amy)).line
    expect(r.hold).toBe(true); expect(r.h.map((x: any) => x.st)).toEqual(['hold', 'hold'])
    await expect(run('commissionPay', { id: l.id, half: 1 }, amy)).rejects.toThrow(/on hold/)
    r = (await run('commissionHold', { id: l.id, hold: false }, amy)).line
    expect(r.h.map((x: any) => x.st)).toEqual(['due', 'due'])
    await paidAll(l.id); await expect(run('commissionHold', { id: l.id, hold: true, reason: 'x' }, amy)).rejects.toThrow(/already paid/)
  })
  it('an agent sees only their own commission: no staff names, no office notes, no history of undos or holds', async () => {
    const co = await company(), ag = await agentOf(co), me = agentSession('pat@example.com')
    const mine = await mk({ owner: ag }), theirs = await mk({ state: 'Victoria' })
    for (const l of [mine, theirs]) await through(l.id, 6)
    await run('commissionPay', { id: mine.id, half: 1, ref: 'SECRETREF' }, amy)
    await run('commissionNote', { id: mine.id, text: 'SECRETSTAFFNOTE do not share', shared: false }, amy)
    await run('commissionNote', { id: mine.id, text: 'Paid in the Friday run', shared: true }, dominika)
    await run('commissionUndo', { id: mine.id, half: 1, reason: 'SECRETUNDO' }, amy); await run('commissionPay', { id: mine.id, half: 1 }, dominika)
    const r = await comm(me), json = JSON.stringify(r)
    expect(r).toMatchObject({ role: 'agent', canPay: false, canEdit: false }); expect(r.lines.map((x: any) => x.id)).toEqual([mine.id])
    expect(r.rates).toEqual({ ext: { studio: 5000, plus: 6500, max: 8000 } }); expect(r.earners).toBeUndefined()
    expect(json).not.toMatch(/SECRET|Amy|Dominika|Alessia|Baldwin|"by"|"byName"|"ref"/)
    expect(r.lines[0].notes).toEqual([{ at: expect.any(Number), x: 'Paid in the Friday run' }]); expect(r.lines[0].log.map((x: any) => x.x)).toEqual(['First half paid'])
    expect(r.lines[0].h[0]).toMatchObject({ st: 'paid' })
    // Mike (internal) sees only his own too, with both rates because an own lead earns the external one
    const mk2 = await mk({ state: 'Queensland' }); await through(mk2.id, 6)
    const m = await comm(mike); expect(m.role).toBe('agent'); expect(m.lines.every((x: any) => x.owner === 'mf')).toBe(true); expect(m.rates.int.plus).toBe(4000); expect(m.rates.ext.plus).toBe(6500)
    await expect(comm(secretSession)).rejects.toThrow(/team and the selling agents/)
  })
  it('the general settings sent to a screen never include commission rates or who is switched off', async () => {
    for (const who of [jamie, amy, alessia, mike]) expect((await run('init', {}, who)).settings.commission).toBeUndefined()
    expect((await run('init', {}, jamie)).settings.prices.plus).toBe(185000)
  })
  it('commission never rides on a customer sent to a screen, for anyone', async () => {
    const l = await mk(); await through(l.id, 6); await run('commissionPay', { id: l.id, half: 1 }, amy); await run('commissionNote', { id: l.id, text: 'SECRETSTAFFNOTE', shared: false }, amy)
    for (const who of [jamie, amy, alessia, mike]) {
      const j = JSON.stringify([(await run('init', {}, who)).leads, (await run('poll', { since: 0 }, who)).leads])
      expect(j).not.toMatch(/cpaid|cnotes|clog|cfix|chold|SECRETSTAFFNOTE/)
    }
    const r = (await run('saveLead', { lead: { id: l.id, cpaid: { h2: { at: 1, by: 'jb' } }, chold: true, cnotes: [{ x: 'forged' }], cfix: { rate: 1 } } })).lead
    expect((await lineOf(l.id)).h[1].st).toBe('later'); expect((await lineOf(l.id)).hold).toBe(false); expect((await lineOf(l.id)).rate).toBe(4000)
    expect(JSON.stringify(r)).not.toMatch(/forged/)
  })
  it('the rate is fixed once the first half falls due, so changing a rate later changes only deals not yet due', async () => {
    const early = await mk(), due = await mk(); await through(early.id, 5); await through(due.id, 6)
    await expect(run('commissionSettings', { commission: { rates: { int: { plus: 4500 } } } }, mike)).rejects.toThrow(/director/)
    await expect(run('commissionSettings', { commission: { rates: { int: { plus: 0 } } } })).rejects.toThrow(/between/)
    const r = await run('commissionSettings', { commission: { rates: { int: { plus: '4,500' } } } })
    expect(r.rates.int.plus).toBe(4500)
    expect((await lineOf(early.id)).rate).toBe(4500); expect((await lineOf(due.id)).rate).toBe(4000)
    await through(early.id, 6); await run('commissionSettings', { commission: { rates: { int: { plus: 6000 } } } })
    expect((await lineOf(early.id)).rate).toBe(4500)
    expect((await run('settingsSave', { settings: { prices: { plus: 190000 } } })).settings.commission.rates.int.plus).toBe(6000)   // saving other settings keeps commission
  })
  it('only a director sets who earns, an outside agent cannot set the delivery date, and what is owed totals up exactly', async () => {
    const co = await company(), ag = await agentOf(co), me = agentSession('pat@example.com')
    await expect(run('commissionSettings', { commission: { off: ['mf'] } }, amy)).rejects.toThrow(/director/)
    const r = await run('commissionSettings', { commission: { off: ['mf', 'nobody', ag.id] } }); expect(r.off.sort()).toEqual([ag.id, 'mf'].sort())
    await run('commissionSettings', { commission: { off: [] } })
    const l = await mk({ owner: ag }); await through(l.id, 8)
    await run('saveLead', { lead: { id: l.id, order: { ...(await get(l.id)).order, deliveredAt: 5 } } }, me)
    expect((await get(l.id)).order.deliveredAt).toBeUndefined()
    const lines = (await comm()).lines, total = lines.reduce((s: number, c: any) => s + c.h[0].amt + c.h[1].amt, 0)
    expect(total).toBe(lines.reduce((s: number, c: any) => s + c.rate, 0))
    expect((await comm()).earners.map((e: any) => e.id)).toEqual(expect.arrayContaining(['jb', 'mf', ag.id]))
  })
})

describe('the pre-order email', () => {
  const STRIPE = 'https://buy.stripe.com/3cIaEYdty4Nh9uM0qu1oI00'
  it('fills the customer\'s home and finishes, and puts the Stripe link on the button', async () => {
    const l = await mkLead()   // SOLUM Plus, Char, Sage, Raw Walnut, Coast, Queensland
    const r = await run('preorderEmail', { id: l.id, mode: 'preview' })
    expect(r.subject).toBe('Your SOLUM Plus, next steps | HAAVN BLACK')
    expect(r.from).toBe('sales@haavn.au')
    expect(r.fields).toMatchObject({ model: 'SOLUM Plus', exterior: 'Char', interior: 'Sage', joinery: 'Raw Walnut', setting: 'Coast, Queensland', price: '$185,000', port: 'the Port of Brisbane' })
    expect(r.html).toContain('href="' + STRIPE + '?prefilled_email=mia.brennan%40example.com&amp;client_reference_id=' + l.id.replace(/[^A-Za-z0-9_-]/g, '') + '"')
    expect(r.html).toContain('bgcolor="#b3aca6"'); expect(r.html).toContain('bgcolor="#96b483"'); expect(r.html).toContain('bgcolor="#d6b48c"')
    expect(r.html).toContain('Hello Mia,')
    expect(r.html).not.toMatch(/{{|mailto:reception|data:image/)
    expect(r.html).toContain('sales@haavn.au')
    expect(F.sent.length).toBe(0)   // a preview sends nothing
  })
  it('shows "To be chosen" for a finish they have not picked, and says so', async () => {
    const l = await mkLead()
    await run('saveLead', { lead: { id: l.id, clad: '', join: '' } })
    const r = await run('preorderEmail', { id: l.id, mode: 'preview' })
    expect(r.missing).toEqual(['exterior', 'joinery']); expect(r.html).toContain('To be chosen')
  })
  it('will not build for OCTA or a customer with no home, or with a bad payment link', async () => {
    const l = await mkLead()
    await run('saveLead', { lead: { id: l.id, product: 'none' } })
    await expect(run('preorderEmail', { id: l.id, mode: 'preview' })).rejects.toThrow(/Choose their SOLUM/)
    await run('saveLead', { lead: { id: l.id, product: 'plus' } })
    await run('settingsSave', { settings: { payLink: 'http://nope.example.com/x' } })
    expect((await run('preorderEmail', { id: l.id, mode: 'preview' })).html).toContain(STRIPE)   // a link that is not https is ignored, the saved one stays
    await run('settingsSave', { settings: { payLink: 'https://buy.stripe.com/test_other' } })
    expect((await run('preorderEmail', { id: l.id, mode: 'preview' })).html).toContain('https://buy.stripe.com/test_other')
  })
  it('sends from sales@haavn.au to the customer, copies the agent, and writes it on the customer', async () => {
    const l = await mkLead()
    const r = await run('preorderEmail', { id: l.id, mode: 'send' })
    expect(F.sent.length).toBe(1)
    expect(F.sent[0]).toMatchObject({ from: 'sales@haavn.au', to: ['mia.brennan@example.com'], bcc: 'jamie@7even.au', replyTo: 'jamie@7even.au', subject: 'Your SOLUM Plus, next steps | HAAVN BLACK' })
    expect(r.lead.preMail).toMatchObject({ by: 'Jamie Baldwin', to: 'mia.brennan@example.com', n: 1 })
    expect(r.lead.act.some((e: any) => /^Pre-order email sent to mia\.brennan@example\.com from sales@haavn\.au by Jamie Baldwin/.test(e.x))).toBe(true)
    await run('preorderEmail', { id: l.id, mode: 'send' })
    expect((await get(l.id)).preMail.n).toBe(2)
  })
  it('a test goes only to the person asking, and is not written on the customer', async () => {
    const l = await mkLead()
    const r = await run('preorderEmail', { id: l.id, mode: 'test' })
    expect(r.sentTo).toBe('jamie@7even.au')
    expect(F.sent[0]).toMatchObject({ to: ['jamie@7even.au'], subject: '[TEST] Your SOLUM Plus, next steps | HAAVN BLACK' })
    expect((await get(l.id)).preMail).toBeUndefined()
  })
  it('a screen cannot write the sent record, and mail that fails leaves nothing written', async () => {
    const l = await mkLead()
    const r = await run('saveLead', { lead: { id: l.id, preMail: { at: 1, by: 'x', to: 'y', n: 9 } } })
    expect(r.lead.preMail).toBeUndefined()
    F.mail.fail = true
    await expect(run('preorderEmail', { id: l.id, mode: 'send' })).rejects.toThrow(/Email refused/)
    expect((await get(l.id)).preMail).toBeUndefined()
  })
  it('only the person whose customer it is can send it', async () => {
    const l = await mkLead()
    await expect(S.run('preorderEmail', { id: l.id, mode: 'send' }, agentSession('x@y.com'), F.deps)).rejects.toThrow()
  })
})

describe('several dwellings in one order', () => {
  const PRICES = { studio: 145000, plus: 185000, max: 215000 }
  const H = S.H
  const fresh = async () => (await run('init', {})).settings
  // a customer, then their order set to 3 SOLUM Plus and 4 SOLUM Max
  const orderOf = async (lines: any[], l?: any) => {
    const lead = l || await mkLead()
    const r = await run('saveLead', { lead: { id: lead.id, homes: lines } })
    return r.lead
  }
  const THREE_FOUR = [{ product: 'plus', qty: 3, clad: 'Char', pal: 'Sage', join: 'Raw Walnut' }, { product: 'max', qty: 4, clad: 'Ivory', pal: 'Tide', join: 'Dark Oak' }]

  it('reads the order: saved lines, else the one home a customer always had; cleans what it is given', () => {
    expect(H.homesOf({ product: 'plus', clad: 'Char' })).toMatchObject([{ product: 'plus', qty: 1, clad: 'Char' }])
    expect(H.homesOf({ product: 'octa' })).toEqual([])
    expect(H.homesOf({ product: 'none' })).toEqual([])
    const n = H.normalise([{ product: 'plus', qty: '6', clad: 'Pink' }, { product: 'octa', qty: 2 }, { product: 'max', qty: 999 }, { product: 'studio', qty: 0 }, null])
    expect(n.map((x: any) => [x.product, x.qty, x.clad])).toEqual([['plus', 6, ''], ['max', 50, ''], ['studio', 1, '']])   // anything not a SOLUM we sell is dropped; a quantity is 1 to 50; a finish that is not ours is blank
    expect(H.normalise(new Array(40).fill({ product: 'plus', qty: 1 })).length).toBe(12)
  })
  it('values an order at the price list and words it', () => {
    const l = { homes: THREE_FOUR }
    expect(H.valueOf(PRICES, l)).toBe(3 * 185000 + 4 * 215000)
    expect(H.unitsOf(l)).toBe(7)
    expect(H.summary(l)).toBe('3 × SOLUM Plus and 4 × SOLUM Max')
    expect(H.short(l)).toBe('3 Plus + 4 Max')
    expect(H.summary({ product: 'plus' })).toBe('SOLUM Plus')
    expect(H.summary({ homes: [{ product: 'plus', qty: 6 }] })).toBe('6 × SOLUM Plus')
  })
  it('a customer with a quantity on the form starts with that many homes', async () => {
    const l = (await run('newLead', { lead: { first: 'Bulk', last: 'Buyer', email: 'bulk@example.com', state: 'VIC', product: 'plus', qty: 6, clad: 'Char' } })).lead
    expect(l.homes).toMatchObject([{ product: 'plus', qty: 6, clad: 'Char' }])
    expect(l.product).toBe('plus'); expect(l.clad).toBe('Char')   // the old single-home fields follow the first line
    expect(S.priceOf({ prices: PRICES }, l)).toBe(6 * 185000)
    const one = (await run('newLead', { lead: { first: 'Solo', last: 'Buyer', email: 'solo@example.com', state: 'VIC', product: 'plus' } })).lead
    expect(one.homes).toBeUndefined()   // a single home keeps the old shape, nothing is migrated
  })
  it('reads a quantity from the enquiry email', () => {
    expect(S.parseEnquiry(FORM() + '\nQuantity: 4').qty).toBe(4)
    expect(S.parseEnquiry(FORM()).qty).toBe(1)
  })
  it('saves an order of 3 Plus and 4 Max: the value is the sum, and the customer\'s log says what changed', async () => {
    const l = await orderOf(THREE_FOUR)
    expect(l.homes.map((h: any) => [h.product, h.qty])).toEqual([['plus', 3], ['max', 4]])
    expect(l.product).toBe('plus')
    const st = await fresh()
    expect(S.priceOf(st, l)).toBe(1415000)
    const note = l.act.find((a: any) => /Order changed/.test(a.x))
    expect(note.x).toMatch(/from SOLUM Plus to 3 × SOLUM Plus and 4 × SOLUM Max/)
    expect(note.x).toContain('$1,415,000')
    expect(l.asked).toMatchObject({ product: 'plus' })   // what the customer first asked for is kept
  })
  it('the 10% deposit and the final payment follow the whole order, less the one pre-order deposit', async () => {
    const l = await orderOf(THREE_FOUR), st = await fresh()
    expect(S.depBal(st, l)).toBe(141500 - 2000)
    expect(S.finalAmt(st, l)).toBe(1415000 - 141500)
    expect(S.gateAmount(st, l, 'pre')).toBe(2000)
    expect(S.gateAmount(st, l, 'dep')).toBe(139500)
    expect(S.gateAmount(st, l, 'final')).toBe(1273500)
  })
  it('the Finance task for the invoice carries the whole order\'s amount', async () => {
    const l = await orderOf(THREE_FOUR)
    await through(l.id, 4)
    const ws = F.t.doc[B.KEYS.workflow]
    expect(JSON.stringify(ws)).toContain('Confirm the $2,000 pre-order deposit')
    await through(l.id, 5)
    expect(JSON.stringify(F.t.doc[B.KEYS.workflow])).toContain('(' + '$139,500' + ')')
  })
  it('refuses a list with no SOLUM home, and an OCTA concept cannot take a list', async () => {
    const l = await mkLead()
    await expect(run('saveLead', { lead: { id: l.id, homes: [] } })).rejects.toThrow(/at least one/)
    await expect(run('saveLead', { lead: { id: l.id, homes: [{ product: 'octa', qty: 2 }] } })).rejects.toThrow(/at least one/)
    const c = (await run('newLead', { lead: { first: 'Con', last: 'Cept', email: 'con@example.com', state: 'VIC', product: 'octa' } })).lead
    await expect(run('saveLead', { lead: { id: c.id, homes: [{ product: 'plus', qty: 1 }] } })).rejects.toThrow(/concept/i)
  })
  it('the old single-home fields cannot change an order that has its own list', async () => {
    const l = await orderOf(THREE_FOUR)
    await expect(run('saveLead', { lead: { id: l.id, product: 'studio' } })).rejects.toThrow(/own list of homes/)
    const same = (await run('saveLead', { lead: { id: l.id, clad: 'Amber', first: 'Mia' } })).lead
    expect(same.homes[0].clad).toBe('Char')   // a stray finish on the old field changes nothing in the list
  })
  it('which homes and how many is locked like the home always was; finishes alone stay open', async () => {
    const l = await orderOf(THREE_FOUR)
    await through(l.id, 4)   // the contract is out
    const bigger = THREE_FOUR.map((h) => ({ ...h, qty: h.qty + 1 }))
    await expect(run('saveLead', { lead: { id: l.id, homes: bigger } }, mike)).rejects.toThrow(/only a director/)
    const lines = (await get(l.id)).homes
    const ok = (await run('saveLead', { lead: { id: l.id, homes: bigger.map((h, i) => ({ ...h, id: lines[i].id })) } })).lead   // a director may
    expect(H.unitsOf(ok)).toBe(9)
    await through(l.id, 6)   // the 10% deposit is in: fixed
    await expect(run('saveLead', { lead: { id: l.id, homes: THREE_FOUR } })).rejects.toThrow(/homes are fixed/)
    const re = (await get(l.id)).homes.map((h: any) => ({ ...h, pal: 'Vine' }))
    const fin = (await run('saveLead', { lead: { id: l.id, homes: re } })).lead   // the finishes can still be set before the order is confirmed
    expect(fin.homes.every((h: any) => h.pal === 'Vine')).toBe(true)
    expect(fin.act.some((a: any) => /Finishes updated/.test(a.x))).toBe(true)
  })
  it('commission is per dwelling: 3 Plus and 4 Max pay 3 x the Plus rate and 4 x the Max rate, split in halves', async () => {
    const l = await orderOf(THREE_FOUR)
    await through(l.id, 6)
    const c = (await run('commission', {})).lines.find((x: any) => x.id === l.id)
    expect(c.rate).toBe(3 * 4000 + 4 * 5000)   // internal rates, Jamie's lead
    expect(c.h[0].amt + c.h[1].amt).toBe(32000)
    expect(c.units).toBe(7); expect(c.homes).toEqual([{ product: 'plus', qty: 3 }, { product: 'max', qty: 4 }])
    expect(c.value).toBe(1415000)
    const own = (await run('newLead', { lead: { first: 'Own', last: 'Lead', email: 'own.lead@example.com', state: 'VIC', product: 'plus', source: 'Agent referral' } })).lead   // an own lead earns the external rate
    const ext = await orderOf(THREE_FOUR, own)
    await through(ext.id, 6)
    const e = (await run('commission', {})).lines.find((x: any) => x.id === ext.id)
    expect(e.rate).toBe(3 * 6500 + 4 * 8000)
  })
  it('the commission rate is fixed when the first half falls due, so a later price or rate change never alters it', async () => {
    const l = await orderOf([{ product: 'plus', qty: 2 }])
    await through(l.id, 6)
    await run('commissionSettings', { commission: { rates: { int: { plus: 9999 } } } })
    const c = (await run('commission', {})).lines.find((x: any) => x.id === l.id)
    expect(c.rate).toBe(8000); expect(c.locked).toBe(true)
  })
  it('a single home still earns exactly what it did', async () => {
    const l = await mkLead()
    await through(l.id, 6)
    const c = (await run('commission', {})).lines.find((x: any) => x.id === l.id)
    expect(c.rate).toBe(4000); expect(c.units).toBe(1)
  })
  it('the pre-order email lists every home with its own finishes and the total', async () => {
    const l = await orderOf(THREE_FOUR)
    const r = await run('preorderEmail', { id: l.id, mode: 'preview' })
    expect(r.subject).toBe('Your 7 SOLUM homes, next steps | HAAVN BLACK')
    expect(r.fields).toMatchObject({ multi: true, units: 7, price: '$1,415,000', model: '3 × SOLUM Plus and 4 × SOLUM Max' })
    expect(r.fields.lines.map((x: any) => [x.qty, x.subtotal])).toEqual([[3, '$555,000'], [4, '$860,000']])
    expect(r.html).toContain('3 × SOLUM Plus'); expect(r.html).toContain('4 × SOLUM Max')
    expect(r.html).toContain('3 &times; $185,000 + 4 &times; $215,000')
    expect(r.html).toContain('$1,415,000')
    for (const hex of ['#b3aca6', '#96b483', '#d6b48c', '#e4dbc6', '#7cb5c0', '#77726d']) expect(r.html).toContain('bgcolor="' + hex + '"')   // both homes' finishes
    expect(r.html).toContain('Home 1'); expect(r.html).toContain('Home 2')
    expect(r.html).not.toMatch(/{{/)
    expect(r.missing).toEqual([])
  })
  it('six of one home is one block of finishes and a total of six', async () => {
    const l = await orderOf([{ product: 'plus', qty: 6, clad: 'Char', pal: 'Sage', join: 'Raw Walnut' }])
    const r = await run('preorderEmail', { id: l.id, mode: 'preview' })
    expect(r.subject).toBe('Your 6 SOLUM Plus homes, next steps | HAAVN BLACK')
    expect(r.fields.price).toBe('$1,110,000')
    expect(r.html).toContain('6 × SOLUM Plus'); expect(r.html).not.toContain('Home 1')
    expect(r.html).toContain('6 &times; $185,000')
  })
  it('a single home\'s email is exactly as before', async () => {
    const l = await mkLead()
    const r = await run('preorderEmail', { id: l.id, mode: 'preview' })
    expect(r.fields.multi).toBe(false)
    expect(r.html).not.toContain('Indicative total'); expect(r.html).toContain('Indicative price')
  })
  it('sending the email writes the whole order on the customer', async () => {
    const l = await orderOf(THREE_FOUR)
    const r = await run('preorderEmail', { id: l.id, mode: 'send' })
    const note = r.lead.act.find((a: any) => /Pre-order email sent/.test(a.x))
    expect(note.x).toContain('7 dwellings, $1,415,000 in all')
    expect(note.x).toContain('4 × SOLUM Max: Ivory exterior')
  })
  it('the handover to projects lists every home and the order value', async () => {
    const l = await orderOf(THREE_FOUR)
    await through(l.id, 7)
    await run('handover', { id: l.id })
    const m = F.sent[F.sent.length - 1]
    expect(m.to).toEqual(['projects@haavn.au'])
    expect(m.html).toContain('Homes: 3 × SOLUM Plus and 4 × SOLUM Max (7 dwellings)')
    expect(m.html).toContain('1. 3 × SOLUM Plus: cladding Char'); expect(m.html).toContain('2. 4 × SOLUM Max: cladding Ivory')
    expect(m.html).toContain('Order value: $1,415,000')
  })
  it('the new-lead alert names the whole order', async () => {
    await run('newLead', { lead: { first: 'Bulk', last: 'Buyer', email: 'bulk2@example.com', state: 'VIC', product: 'max', qty: 3 } })
    expect(F.t.msgs.some((m: any) => /3 × SOLUM Max/.test(m.body))).toBe(true)
  })
})
