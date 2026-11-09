import { describe, it, expect, beforeEach } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// The shared core of the phone sales pages (public/atrium-sales-core.js): what each customer needs next, who sees it, the money amounts and the message words.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const H = require('../../../public/atrium-sales-core.js')

const DAY = 864e5, HOUR = 36e5
const NOW = Date.UTC(2026, 10, 6, 0, 0, 0)

function lead(over: any = {}) {
  return { id: 'L' + Math.random().toString(36).slice(2, 7), first: 'Tom', last: 'Reilly', email: 'tom@example.com', mobile: '0412 000 111', state: 'VIC', product: 'plus', clad: '', pal: '', join: '', owner: 'mf', stage: 0,
    status: 'open', concept: false, gate: null, paid: false, ret: null, act: [], created: NOW - 2 * HOUR, lastTouch: NOW - 2 * HOUR, gateAt: NOW - 2 * HOUR, source: 'Facebook', ...over }
}
function setMe(me: any) { H.S.me = { id: 'mf', name: 'Mike Furniss', kind: 'internal', admin: false, gates: [], roles: [], ...me } }

beforeEach(() => {
  H.now = () => NOW
  H.S.settings = { prices: { studio: 145000, plus: 185000, max: 215000 }, preorder: 2000, approvers: { con: ['ar'], fin: ['ab', 'dm'] }, team: ['jb', 'mf'] }
  H.S.leads = []; H.S.team = [{ id: 'jb', name: 'Jamie Baldwin' }, { id: 'mf', name: 'Mike Furniss' }]; H.S.staff = []; H.S.agents = []
  setMe({})
})

describe('the money, as the pipeline states it', () => {
  it('pre-order is the setting, the 10% deposit is 10% less the pre-order, the final is the 90% balance', () => {
    const l = lead({ product: 'plus' })
    expect(H.pre()).toBe(2000)
    expect(H.price(l)).toBe(185000)
    expect(H.depBal(l)).toBe(18500 - 2000)
    expect(H.finalAmt(l)).toBe(185000 - 18500)
    expect(H.gateAmt(l, 'pre')).toBe(2000)
    expect(H.gateAmt(l, 'dep')).toBe(16500)
    expect(H.gateAmt(l, 'invoice')).toBe(16500)
    expect(H.gateAmt(l, 'final')).toBe(166500)
  })
  it('an OCTA concept has no price', () => { expect(H.price(lead({ product: 'octa', concept: true }))).toBe(0) })
})

describe('what each customer needs next', () => {
  it('the first three stages are the salesperson\'s calls, in order', () => {
    expect(H.itemOf(lead({ stage: 0 })).txt).toBe('Call the customer')
    expect(H.itemOf(lead({ stage: 1 })).txt).toBe('Qualify: site, finance and timing')
    expect(H.itemOf(lead({ stage: 2 })).txt).toBe('Send the pre-order')
    expect(H.itemOf(lead({ stage: 0 })).k).toBe('call')
  })
  it('a new enquiry is late after 24 hours', () => {
    expect(H.itemOf(lead({ stage: 0, created: NOW - 3 * HOUR, lastTouch: NOW - 3 * HOUR })).over).toBe(false)
    expect(H.itemOf(lead({ stage: 0, created: NOW - 23 * HOUR, lastTouch: NOW - 23 * HOUR })).over).toBe(false)
    expect(H.itemOf(lead({ stage: 0, created: NOW - 25 * HOUR, lastTouch: NOW - 25 * HOUR })).over).toBe(true)
  })
  it('a money step is chased until the payment is recorded, then it is Finance\'s to approve', () => {
    const waiting = H.itemOf(lead({ stage: 3, gate: 'pre', paid: false }))
    expect(waiting.k).toBe('chase'); expect(waiting.txt).toBe('Awaiting the pre-order deposit'); expect(waiting.amt).toBe(2000)
    const paid = H.itemOf(lead({ stage: 3, gate: 'pre', paid: true }))
    expect(paid.k).toBe('approve'); expect(paid.role).toBe('fin')
  })
  it('a contract out for signature is waiting on the customer, never an approval', () => {
    const it = H.itemOf(lead({ stage: 4, gate: 'out' })); expect(it.k).toBe('chase'); expect(it.role).toBe('con')
  })
  it('a returned customer goes back to the salesperson with the reason', () => {
    const it = H.itemOf(lead({ stage: 3, gate: 'pre', paid: true, ret: { name: 'Amy Baldwin', why: 'Wrong amount', at: NOW - HOUR } }))
    expect(it.k).toBe('ret'); expect(it.role).toBe('sales'); expect(it.txt).toBe('Returned by Amy: Wrong amount')
  })
  it('a confirmed order needs the handover, then a fortnightly update', () => {
    const ho = H.itemOf(lead({ stage: 7, order: { step: 0, lastUpdate: NOW - DAY } })); expect(ho.k).toBe('handover')
    const quiet = H.itemOf(lead({ stage: 7, order: { step: 1, handoverAt: NOW - DAY, lastUpdate: NOW - DAY } })); expect(quiet).toBeNull()
    const upd = H.itemOf(lead({ stage: 7, order: { step: 1, handoverAt: NOW - 20 * DAY, lastUpdate: NOW - 15 * DAY } })); expect(upd.k).toBe('update')
  })
  it('a home leaving port within five days with the final payment unpaid is urgent and sorts first', () => {
    const urgent = lead({ id: 'U', stage: 8, gate: 'final', paid: false, order: { step: 5, depart: NOW + 3 * DAY } })
    const calm = lead({ id: 'C', stage: 0 })
    H.S.leads = [calm, urgent]
    const items = H.ITEMS()
    expect(items[0].l.id).toBe('U'); expect(items[0].urgent).toBe(true)
  })
  it('lost, delivered and concept customers need nothing', () => {
    expect(H.itemOf(lead({ status: 'lost' }))).toBeNull()
    expect(H.itemOf(lead({ stage: 9 }))).toBeNull()
    expect(H.itemOf(lead({ product: 'octa', concept: true }))).toBeNull()
  })
})

describe('who sees what on Today', () => {
  it('a salesperson sees their own calls, and their customers that are with the office on their own list', () => {
    setMe({ id: 'mf' })
    const mine = lead({ id: 'a', owner: 'mf', stage: 0 }), notMine = lead({ id: 'b', owner: 'jb', stage: 0 })
    const atOffice = lead({ id: 'c', owner: 'mf', stage: 4, gate: 'issue' })
    H.S.leads = [mine, notMine, atOffice]
    const t = H.today()
    expect(t.todo.map((i: any) => i.l.id)).toEqual(['a'])
    expect(t.appr).toHaveLength(0)
    expect(t.wait.map((i: any) => i.l.id)).toEqual(['c'])
  })
  it('"need you" counts what I can act on, not what is with the office', () => {
    setMe({ id: 'mf' })
    H.S.leads = [lead({ id: 'a', owner: 'mf', stage: 0 }), lead({ id: 'c', owner: 'mf', stage: 4, gate: 'issue' })]
    const c = H.counts()
    expect(c.need).toBe(1); expect(c.waiting).toBe(1)
  })
  it('Finance sees the approvals only they can give, split from the follow-ups', () => {
    setMe({ id: 'ab', kind: 'internal', gates: ['pre', 'invoice', 'dep', 'final'], roles: ['fin'] })
    H.S.leads = [lead({ id: 'p', owner: 'jb', stage: 3, gate: 'pre', paid: true }), lead({ id: 'i', owner: 'jb', stage: 4, gate: 'issue' }), lead({ id: 'q', owner: 'jb', stage: 3, gate: 'pre', paid: false })]
    const t = H.today()
    expect(t.appr.map((i: any) => i.l.id)).toEqual(['p'])
    expect(t.todo.map((i: any) => i.l.id)).toEqual(['q'])   // the unpaid pre-order is theirs to chase and record
    expect(H.canGate('pre')).toBe(true); expect(H.canGate('issue')).toBe(false)
    expect(H.hasApprovals()).toBe(true)
  })
  it('a salesperson with no approval rights has no Approvals tab', () => { setMe({ id: 'mf', gates: [], admin: false }); expect(H.hasApprovals()).toBe(false) })
  it('a director sees every approval', () => {
    setMe({ id: 'jb', admin: true, gates: ['pre', 'issue', 'signed', 'invoice', 'dep', 'confirm', 'final'] })
    H.S.leads = [lead({ id: 'x', owner: 'mf', stage: 4, gate: 'issue' })]
    expect(H.today().appr).toHaveLength(1)
  })
  it('test leads never show', () => {
    H.S.leads = [lead({ id: 't', status: 'lost', lostWhy: 'Test lead' }), lead({ id: 'r', status: 'lost', lostWhy: 'Price' })]
    expect(H.visible().map((l: any) => l.id)).toEqual(['r'])
  })
})

describe('the home is locked as the server locks it', () => {
  it('free before the contract, a director only once it is out, fixed after the 10% deposit', () => {
    setMe({ admin: false })
    expect(H.homeLock(lead({ stage: 2 }))).toBe('')
    expect(H.homeLock(lead({ stage: 4 }))).toMatch(/only a director/)
    setMe({ admin: true })
    expect(H.homeLock(lead({ stage: 4 }))).toBe('')
    expect(H.homeLock(lead({ stage: 6 }))).toMatch(/home is fixed/)
    expect(H.homeLock(lead({ stage: 2, cfix: true }))).toMatch(/home is fixed/)
  })
})

describe('the words', () => {
  it('suggested messages use the customer, the home, the finishes and the money', () => {
    setMe({ name: 'Mike Furniss' })
    const l = lead({ stage: 2, product: 'plus', clad: 'Char', pal: 'Tide', join: 'Dark Oak' })
    const t = H.tpl(l, null)
    expect(t).toContain('Hi Tom'); expect(t).toContain('SOLUM Plus'); expect(t).toContain('Char, Tide, Dark Oak'); expect(t).toContain('$2,000'); expect(t.endsWith('Mike')).toBe(true)
    expect(H.tpl(lead({ stage: 3, gate: 'dep', product: 'max' }), 'dep')).toContain('$19,500')
    expect(H.tpl(lead({ stage: 8, gate: 'final', product: 'studio', state: 'QLD' }), 'final')).toContain('Port of Brisbane')
  })
  it('a chase uses the template for its step', () => {
    expect(H.chaseKey(lead({ gate: 'out' }))).toBe('out'); expect(H.chaseKey(lead({ gate: 'pre' }))).toBe('pre'); expect(H.chaseKey(lead({ gate: 'dep' }))).toBe('dep'); expect(H.chaseKey(lead({ gate: 'final' }))).toBe('final'); expect(H.chaseKey(lead({ gate: 'invoice' }))).toBeNull()
  })
  it('the fortnightly update names the delivery step', () => {
    setMe({ name: 'Mike Furniss' })
    expect(H.updateText(lead({ stage: 7, order: { step: 2, eta: NOW + 60 * DAY } }))).toContain('Status: In production.')
  })
  it('what approving does is written out for each step', () => {
    expect(H.effects(lead({ first: 'Tom' }), 'pre')[0]).toContain('moves Tom to Contract out')
    expect(H.effects(lead({}), 'nope')).toEqual([])
  })
})

describe('the status under a customer', () => {
  it('shows how long they have waited, or where the home is', () => {
    expect(H.status(lead({ stage: 0, created: NOW - 30 * HOUR, lastTouch: NOW - 30 * HOUR })).c).toBe('over')
    expect(H.status(lead({ stage: 7, order: { step: 2 } })).sh).toBe('Building')
    expect(H.status(lead({ stage: 8, paid: false, order: { depart: NOW + 3 * DAY } })).t).toBe('Leaves port in 3d')
    expect(H.status(lead({ stage: 8, paid: false, order: { depart: NOW + 3 * DAY } })).c).toBe('over')
  })
})

describe('an order record that is not what the server writes today', () => {
  it('never breaks the screen: a missing, empty, stray or out of range step still gives a real delivery step', () => {
    for (const order of [undefined, null, {}, { step: undefined }, { step: 'x' }, { step: -3 }, { step: 99 }, { step: 2.7 }]) {
      const l = lead({ stage: 7, order })
      const s = H.status(l)
      expect(typeof s.t).toBe('string'); expect(s.t.length).toBeGreaterThan(0)
      expect(H.step(l)).toBeGreaterThanOrEqual(0); expect(H.step(l)).toBeLessThan(H.DELIVERY.length)
      expect(() => H.updateText(l)).not.toThrow()
    }
    expect(H.step(lead({ order: { step: 99 } }))).toBe(H.DELIVERY.length - 1)
    expect(H.step(lead({ order: { step: 2 } }))).toBe(2)
    expect(H.step(lead({ order: {} }))).toBe(0)
  })
  it('a customer with no home, no state, no activity list and no dates still has a status, an item and a price', () => {
    const bare: any = { id: 'B', first: 'Bare', last: 'Row', owner: null, state: '', stage: 5, status: 'open', source: null, concept: false, product: 'none', act: null, dates: null, chk: null, appr: null, order: null, created: NOW - HOUR }
    for (let st = 0; st <= 9; st++) {
      const l = { ...bare, stage: st }
      expect(() => { H.status(l); H.itemOf(l); H.price(l); H.home(l); H.sinceOf(l) }).not.toThrow()
    }
  })
})

describe('the shared file is safe to load anywhere', () => {
  it('exports the same object in a browser and in node, and never fetches on load', () => { expect(typeof H.api).toBe('function'); expect(H.ST).toHaveLength(10); expect(Object.keys(H.G)).toEqual(H.ORDER) })
})

describe('an order of several homes on the phone', () => {
  const order = (over: any = {}) => lead({ homes: [{ id: 'a', product: 'plus', qty: 3, clad: 'Char', pal: 'Sage', join: '' }, { id: 'b', product: 'max', qty: 4, clad: 'Ivory', pal: '', join: 'Dark Oak' }], ...over })
  it('values every dwelling, so the money on the phone is the whole order', () => {
    const l = order()
    expect(H.units(l)).toBe(7)
    expect(H.price(l)).toBe(3 * 185000 + 4 * 215000)
    expect(H.depBal(l)).toBe(141500 - 2000)
    expect(H.finalAmt(l)).toBe(1415000 - 141500)
    expect(H.gateAmt(l, 'final')).toBe(1273500)
  })
  it('words the order, and knows when finishes differ between homes', () => {
    const l = order()
    expect(H.home(l)).toBe('3 × SOLUM Plus and 4 × SOLUM Max')
    expect(H.multi(l)).toBe(true)
    expect(H.fin(l)).toBe('your own finishes for each home')
    expect(H.fin(order({ homes: [{ product: 'plus', qty: 6, clad: 'Char', pal: 'Sage', join: '' }] }))).toBe('Char, Sage')
  })
  it('a customer with one home, or no list, reads exactly as before', () => {
    const l = lead({ product: 'plus', clad: 'Char' })
    expect(H.multi(l)).toBe(false); expect(H.home(l)).toBe('SOLUM Plus'); expect(H.price(l)).toBe(185000); expect(H.isSolum(l)).toBe(true); expect(H.fin(l)).toBe('Char')
    expect(H.isSolum(lead({ product: 'octa', concept: true }))).toBe(false)
  })
})

describe('follow-ups: 24 hours by default, or the date and time the salesperson sets', () => {
  it('with no follow-up set, a customer is due 24 hours after their last contact (a new enquiry: after it arrived)', () => {
    expect(H.dueOf(lead({ stage: 0, created: NOW - 5 * HOUR, lastTouch: NOW - 5 * HOUR }))).toBe(NOW - 5 * HOUR + DAY)
    expect(H.dueOf(lead({ stage: 1, lastTouch: NOW - 6 * HOUR }))).toBe(NOW - 6 * HOUR + DAY)
  })
  it('is not red inside the 24 hours, and red once past it', () => {
    setMe({ id: 'mf', admin: false })
    H.S.leads = [lead({ id: 'a', owner: 'mf', stage: 0, created: NOW - 20 * HOUR, lastTouch: NOW - 20 * HOUR })]
    expect(H.counts().overdue).toBe(0)
    H.S.leads = [lead({ id: 'a', owner: 'mf', stage: 0, created: NOW - 26 * HOUR, lastTouch: NOW - 26 * HOUR })]
    expect(H.counts().overdue).toBe(1)
  })
  it('a follow-up the salesperson set rules: red only once that date and time has passed, however old the last contact', () => {
    setMe({ id: 'jb', admin: false })
    const l = (fu: number) => lead({ id: 'c', owner: 'jb', stage: 1, lastTouch: NOW - 3 * DAY, fu })
    H.S.leads = [l(NOW + 2 * HOUR)]; expect(H.counts().overdue).toBe(0); expect(H.itemOf(H.S.leads[0]).over).toBe(false)
    H.S.leads = [l(NOW + 3 * DAY)]; expect(H.counts().overdue).toBe(0)
    H.S.leads = [l(NOW - 1 * HOUR)]; expect(H.counts().overdue).toBe(1); expect(H.itemOf(H.S.leads[0]).over).toBe(true)
  })
  it('once they have been contacted after the follow-up time, the old date is spent and 24 hours from that contact applies', () => {
    const spent = lead({ stage: 1, fu: NOW - 5 * HOUR, lastTouch: NOW - 1 * HOUR })
    expect(H.dueOf(spent)).toBe(NOW - 1 * HOUR + DAY)
    setMe({ id: 'jb', admin: false }); H.S.leads = [{ ...spent, owner: 'jb' }]
    expect(H.counts().overdue).toBe(0)
  })
  it('the follow-up only applies while they are Enquiry, Contacted or Qualified', () => {
    expect(H.followed(lead({ stage: 1 }))).toBe(true)
    expect(H.followed(lead({ stage: 3, gate: 'pre' }))).toBe(false)
    expect(H.followed(lead({ stage: 1, status: 'lost' }))).toBe(false)
    expect(H.followed(lead({ stage: 1, concept: true }))).toBe(false)
  })
  it('the words and quick choices for the picker', () => {
    expect(H.fuQuick().map((q: any) => q[0])).toEqual(['In 2 hours', 'Tomorrow, 9am', 'In 2 days, 9am', 'Next Monday, 9am'])
    expect(H.fuQuick().every((q: any) => q[1] > NOW)).toBe(true)
    expect(H.whenText(NOW + 2 * HOUR)).toMatch(/^(Today|Tomorrow) \d{1,2}:\d{2}(am|pm)$/)
    expect(H.toLocalInput(NOW)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })
})

describe('the badge is your own overdue customers: you 0, Mike 1', () => {
  const pipeline = () => [
    lead({ id: 'robert', owner: 'mf', stage: 0, created: NOW - 30 * HOUR, lastTouch: NOW - 30 * HOUR }),     // Mike's new enquiry, over 24 hours: overdue
    lead({ id: 'jess', owner: 'jb', stage: 1, lastTouch: NOW - 3 * DAY, fu: NOW + 1 * DAY }),                 // Jamie's, follow-up set for tomorrow: on time
    lead({ id: 'kerrie', owner: 'jb', stage: 1, lastTouch: NOW - 5 * HOUR }),                                 // Jamie's, contacted this morning: on time
    lead({ id: 'charli', owner: 'jb', stage: 2, lastTouch: NOW - 2 * DAY, fu: NOW + 2 * DAY }),
    lead({ id: 'len', owner: 'jb', stage: 1, lastTouch: NOW - 10 * HOUR }),
  ]
  it('a director sees only their own: 0, even though Mike has one overdue', () => {
    setMe({ id: 'jb', name: 'Jamie Baldwin', admin: true, gates: [], roles: [] })
    H.S.leads = pipeline()
    expect(H.counts().overdue).toBe(0)
  })
  it('Mike sees his own one', () => {
    setMe({ id: 'mf', admin: false })
    H.S.leads = pipeline()
    expect(H.counts().overdue).toBe(1)
  })
  it('turns red for the owner only when the follow-up is missed, and clears as soon as they act', () => {
    setMe({ id: 'jb', admin: true })
    H.S.leads = pipeline().map((l: any) => (l.id === 'jess' ? { ...l, fu: NOW - 1 * HOUR } : l))               // the follow-up time passed
    expect(H.counts().overdue).toBe(1)
    H.S.leads = pipeline().map((l: any) => (l.id === 'jess' ? { ...l, fu: NOW + DAY, lastTouch: NOW } : l))    // followed up, next one set
    expect(H.counts().overdue).toBe(0)
  })
  it('the need-you list is still everything waiting, but only overdue lights the badge', () => {
    setMe({ id: 'jb', admin: true })
    H.S.leads = pipeline()
    expect(H.counts().need).toBeGreaterThan(H.counts().overdue)
  })
})
