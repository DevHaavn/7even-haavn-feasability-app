// The pre-order email: the approved HAAVN BLACK reply email, filled in for one customer.
// It is built from the customer's own enquiry (home, exterior, interior palette, joinery, setting, state), the price from Sales Setup, and the Stripe payment link from Sales Setup.
// Sent from sales@haavn.au through api/_utils/mailer.js. Nothing here writes to the database.
const TEMPLATE = require('./preorderTemplate')

const STATES = { NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland', SA: 'South Australia', WA: 'Western Australia', TAS: 'Tasmania', ACT: 'Australian Capital Territory', NT: 'Northern Territory' }
const MODELS = { studio: ['SOLUM Studio', '42 m&sup2;'], plus: ['SOLUM Plus', '55 m&sup2;'], max: ['SOLUM Max', '60 m&sup2;'] }
// the website's own swatch colours
const CLAD = { Ivory: '#e4dbc6', Char: '#b3aca6', Amber: '#e39a55', Urbanite: '#aeab80' }
const PAL = { Burgundy: '#c2747a', Sage: '#96b483', Tide: '#7cb5c0', Vine: '#d9a54f' }
const JOIN = { 'Dark Oak': '#77726d', 'Raw Walnut': '#d6b48c' }
const PORTS = { VIC: ['the Port of Melbourne', 'Victorian'], QLD: ['the Port of Brisbane', 'Queensland'] }
const TBC = '#3a3f44'

const DEFAULT_BASE = 'https://7even-haavn-feasability-app-redux.vercel.app'
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const money = (n) => '$' + Math.round(n).toLocaleString('en-AU')

// The Stripe link, with the customer's email and our lead number added so Finance can match the payment. Only a https link is ever used.
function payUrl(link, lead) {
  let u
  try { u = new URL(String(link || '').trim()) } catch { return '' }
  if (u.protocol !== 'https:') return ''
  if (lead && lead.email) u.searchParams.set('prefilled_email', lead.email)
  if (lead && lead.id) u.searchParams.set('client_reference_id', String(lead.id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100))
  return u.toString()
}

// lead: the lead as the screen sees it (leadOut). settings: getSettings(). env.base: where the pictures are hosted.
// Returns { ok:false, why } when the email cannot be built yet, else { ok:true, subject, html, fields, missing }.
function build(lead, settings, env = {}) {
  const m = MODELS[lead.product]
  if (!m) return { ok: false, why: 'Choose their SOLUM (Studio, Plus or Max) on this customer first. OCTA is concept only.' }
  const price = Number(settings && settings.prices && settings.prices[lead.product]) || 0
  if (!price) return { ok: false, why: 'Set the SOLUM prices in Setup first.' }
  const link = payUrl(settings && settings.payLink, lead)
  if (!link) return { ok: false, why: 'The pre-order payment link in Setup is missing or is not a https link.' }
  const missing = []
  const pick = (v, tbl, label) => { if (v && tbl[v]) return [v, tbl[v]]; missing.push(label); return ['To be chosen', TBC] }
  const ext = pick(lead.clad, CLAD, 'exterior'), int = pick(lead.pal, PAL, 'interior'), joi = pick(lead.join, JOIN, 'joinery')
  const where = [lead.setting && lead.setting !== 'Not sure yet' ? lead.setting : '', STATES[lead.state]].filter(Boolean).join(', ') || 'To be confirmed'
  const port = PORTS[lead.state] || ['your nearest port, confirmed by our team', 'delivery']
  const vals = {
    img: (env.base || DEFAULT_BASE).replace(/\/+$/, '') + '/email', first_name: esc(lead.first || 'there'), model: esc(m[0]), area: m[1], setting: esc(where), price: money(price),
    port: esc(port[0]), port_state: esc(port[1]), exterior: esc(ext[0]), exterior_hex: ext[1], interior: esc(int[0]), interior_hex: int[1], joinery: esc(joi[0]), joinery_hex: joi[1], pay_link: esc(link),
  }
  const html = TEMPLATE.replace(/{{(\w+)}}/g, (all, k) => (k in vals ? vals[k] : all))
  return { ok: true, subject: `Your ${m[0]}, next steps | HAAVN BLACK`, html, missing, fields: { model: m[0], area: m[1].replace('&sup2;', '²'), exterior: ext[0], interior: int[0], joinery: joi[0], setting: where, price: money(price), port: port[0] } }
}

module.exports = { build, payUrl }
