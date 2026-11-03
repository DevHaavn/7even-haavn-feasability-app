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
    inbox: { list: async () => [...t.inbox].reverse(), byMessage: async (m: string) => t.inbox.find((x: any) => x.message_id === m) || null, get: async (id: string) => t.inbox.find((x: any) => x.id === id) || null, upsert: async (row: any) => up(t.inbox, row) },
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
    expect(S.parseEnquiry(FORM().replace(/utm_source:.*/, '')).source).toBe('Website direct')
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
  it('moves along, keeps the history safe, and confirming the order creates the order record', async () => {
    const l = (await S.ingestEmail(F.deps, { messageId: 'x', body: FORM() })).lead
    let r = (await run('saveLead', { lead: { id: l.id, stage: 3, act: [{ t: 5, x: 'Called', k: 'note' }] } })).lead
    expect(r).toMatchObject({ stage: 3, maxStage: 3 }); expect(r.act.map((x: any) => x.x)).toContain('Called')
    r = (await run('saveLead', { lead: { id: l.id, stage: 7 } })).lead
    expect(r.stage).toBe(7); expect(r.order).toMatchObject({ step: 0 }); expect(r.maxStage).toBe(7)
    r = (await run('saveLead', { lead: { id: l.id, stage: 2 } })).lead
    expect(r).toMatchObject({ stage: 2, maxStage: 7 })
  })
  it('an agent can update their customer and the site but not the delivery step, and cannot reassign to a stranger', async () => {
    const c = (await run('companySave', { company: { name: 'Co' } })).company
    const ag = (await run('agentSave', { agent: { name: 'Pat', companyId: c.id, email: 'pat@example.com' } })).agent
    const l = (await run('newLead', { lead: { first: 'Z', mobile: '0400 123 123', state: 'QLD', owner: ag.id } })).lead
    F.t.leads[0].company_id = c.id; F.t.leads[0].owner = ag.id
    await run('saveLead', { lead: { id: l.id, stage: 7 } })
    const me = agentSession('pat@example.com')
    const r = (await run('saveLead', { lead: { id: l.id, order: { step: 6, site: '9 Gum Rd' }, owner: 'jb' } }, me)).lead
    expect(r.order).toMatchObject({ step: 0, site: '9 Gum Rd' }); expect(r.owner).toBe(ag.id)
  })
  it('the handover goes to projects@haavn.au and a customer email goes to the customer, both copied to the sender, only when asked', async () => {
    const l = (await S.ingestEmail(F.deps, { messageId: 'h', body: FORM() })).lead
    await run('saveLead', { lead: { id: l.id, stage: 7, order: { step: 0, site: '12 Wattle Rd', eta: 1, lastUpdate: 1, log: [] } } })
    expect(F.sent).toHaveLength(0)
    await run('handover', { id: l.id }, mike)
    expect(F.sent[0]).toMatchObject({ to: ['projects@haavn.au'], replyTo: 'mike@haavn.au', bcc: 'mike@haavn.au' }); expect(F.sent[0].subject).toContain('Mia Brennan'); expect(F.sent[0].html).toContain('12 Wattle Rd')
    await run('emailCustomer', { id: l.id, subject: 'Your update', body: 'Hi Mia' }, mike)
    expect(F.sent[1]).toMatchObject({ to: ['mia.brennan@example.com'] })
    await expect(run('emailCustomer', { id: l.id, body: '' }, mike)).rejects.toThrow(/Write the message/)
    F.mail.configured = false
    await expect(run('handover', { id: l.id }, mike)).rejects.toThrow(/not set up/)
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

describe('the HAAVN contract team: Alessia, Amy and Dominika', () => {
  const mkAt = async (stage: number) => { const l = (await S.ingestEmail(F.deps, { messageId: 'ca' + Math.random(), body: FORM() })).lead; return (await run('saveLead', { lead: { id: l.id, stage } })).lead }
  const actions = () => (F.t.doc[B.KEYS.workflow] ? F.t.doc[B.KEYS.workflow].actions.filter((x: any) => x.project === 'HAAVN BLACK Sales' && !/^Call /.test(x.title)) : [])
  const contractGroup = () => F.t.groups.find((g: any) => g.dm_key === 'hbcontract')
  it('EOI, contract signed and deposit paid each make one task for Alessia, Amy and Dominika watch, and the team is told in their Chat group', async () => {
    await run('settingsSave', { settings: { prices: { plus: 200000 } } })
    const l = await mkAt(3)
    expect(actions().map((t: any) => t.title)).toEqual(['Prepare and send the contract: Mia Brennan'])
    expect(actions()[0]).toMatchObject({ owner: 'Alessia Bresciano', watchers: ['Amy Baldwin', 'Dominika Ma'], dept: 'haavnblack' })
    await run('saveLead', { lead: { id: l.id, stage: 2 } }); await run('saveLead', { lead: { id: l.id, stage: 3 } })
    expect(actions()).toHaveLength(1)
    await run('saveLead', { lead: { id: l.id, stage: 5 } })
    expect(actions()[1].title).toBe('Raise the 10% deposit invoice: Mia Brennan ($20,000)')
    await run('saveLead', { lead: { id: l.id, stage: 6 } })
    expect(actions()[2].title).toContain('Confirm the order and hand over to projects')
    expect(S.leadOut(F.t.leads[0]).adminTasks).toMatchObject({ 3: expect.any(String), 5: expect.any(String), 6: expect.any(String) })
    expect(contractGroup()).toMatchObject({ name: 'HAAVN Contract Team', is_private: true })
    expect(F.t.members.filter((m: any) => m.group_id === contractGroup().id).map((m: any) => m.member).sort()).toEqual(['ab', 'ar', 'dm', 'jb', 'mf'])
    const notes = F.t.msgs.filter((m: any) => m.group_id === contractGroup().id).map((m: any) => m.body)
    expect(notes).toHaveLength(3); expect(notes[1]).toContain('Raise the 10% deposit invoice')
    expect(F.t.push.filter((p: any) => p.title === 'HAAVN Contract Team').map((p: any) => p.to).sort()).toEqual(['e-ab', 'e-ar', 'e-dm', 'e-jb', 'e-mf', 'e-ab', 'e-ar', 'e-dm', 'e-jb', 'e-mf', 'e-ab', 'e-ar', 'e-dm', 'e-jb', 'e-mf'].sort())
  })
  it('a client cannot write the task record, nobody is tasked when it is switched off, and only a director changes the team', async () => {
    await run('settingsSave', { settings: { notify: { task: false } } })
    const l = await mkAt(3)
    expect(actions()).toHaveLength(0)
    await run('settingsSave', { settings: { notify: { task: true }, contractTeam: [] } })
    await run('saveLead', { lead: { id: l.id, stage: 5, adminTasks: { 5: 'x' } } })
    expect(actions()).toHaveLength(0)
    await expect(run('settingsSave', { settings: { contractTeam: ['ar'] } }, mike)).rejects.toThrow(/director/)
    expect((await run('settingsSave', { settings: { contractTeam: ['ar', 'ab', 'dm', 'zz'] } })).settings.contractTeam).toEqual(['ar', 'ab', 'dm'])
    expect((await run('init', {}, mike)).staff.map((p: any) => p.name)).toEqual(expect.arrayContaining(['Alessia Bresciano', 'Amy Baldwin', 'Dominika Ma']))
  })
  it('all three sign in as the HAAVN team and see every lead', async () => {
    const l = (await S.ingestEmail(F.deps, { messageId: 'rec', body: FORM() })).lead
    for (const w of [{ sub: 'ar', name: 'Alessia Bresciano', emails: ['reception@haavn.au'] }, { sub: 'ab', name: 'Amy Baldwin', emails: ['accounts@7even.au'] }, { sub: 'dm', name: 'Dominika Ma', emails: ['accounts@haavn.au'] }])
      expect((await run('init', {}, { ...w, role: 'staff' })).leads.map((x: any) => x.id)).toEqual([l.id])
  })
})

describe('the website\'s own registration email', () => {
  const REG = `New registration · haavnblack.au\r\nLen Example\r\nContact\r\nEmail len.example@example.com \r\nState Victoria\r\nSetting Country\r\nTheir SOLUM\r\nModel SOLUM Plus\r\nCladding Urbanite\r\nInterior Tide\r\nJoinery Dark Oak\r\nDelivery Delivered\r\nPayment Cash\r\nReply to this email to answer Len directly.\r\nReceived Tuesday, 3 November 2026 at 10:33 pm.`
  const SHORT = `New registration · haavnblack.au\r\nTEST TEST RUN\r\nContact\r\nEmail test@example.com \r\nPhone 0416922911 \r\nState Victoria\r\nSetting City\r\nReply to this email to answer TEST directly.`
  it('reads the name, contact, state, home and every finish from the real layout', () => {
    expect(S.parseEnquiry(REG, { from: 'Haavn Sales <sales@haavn.au>', subject: 'Registration: Len Example · SOLUM Plus · VIC' })).toMatchObject({ first: 'Len', last: 'Example', email: 'len.example@example.com', state: 'VIC', setting: 'Country', product: 'plus', clad: 'Urbanite', pal: 'Tide', join: 'Dark Oak', deliv: 'Delivered', pay: 'Cash', source: 'Website direct', complete: true, formLike: true })
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
