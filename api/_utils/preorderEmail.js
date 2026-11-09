// The pre-order email: the approved HAAVN BLACK reply email, filled in for one customer.
// It is built from the customer's own enquiry (home, exterior, interior palette, joinery, setting, state), the price from Sales Setup, and the Stripe payment link from Sales Setup.
// Sent from sales@haavn.au through api/_utils/mailer.js. Nothing here writes to the database.
const TEMPLATE = require('./preorderTemplate')
const H = require('./salesHomes')

const STATES = { NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland', SA: 'South Australia', WA: 'Western Australia', TAS: 'Tasmania', ACT: 'Australian Capital Territory', NT: 'Northern Territory' }
const MODELS = { studio: ['SOLUM Studio', '42 m&sup2;'], plus: ['SOLUM Plus', '55 m&sup2;'], max: ['SOLUM Max', '60 m&sup2;'] }
const FONT = "Inter,'Helvetica Neue',Helvetica,Arial,sans-serif"
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

// The card in the email lists the order as rows: Model, Exterior, Interior, Joinery, Setting, Indicative price. An order of several homes repeats the finishes
// for each line, so the rows are cut out of the template here and put back together. A single home is left exactly as the template has it.
function cutRows(t) {
  const at = (label) => { const k = t.indexOf('>' + label + '</td>'); return k < 0 ? -1 : t.lastIndexOf('<tr>', k) }
  const sM = at('Model'), sE = at('Exterior'), sI = at('Interior'), sJ = at('Joinery'), sS = at('Setting'), sP = at('Indicative price')
  const endP = sP < 0 ? -1 : t.indexOf('</td></tr></table>', sP)
  if ([sM, sE, sI, sJ, sS, sP, endP].some((n) => n < 0) || !(sM < sE && sE < sI && sI < sJ && sJ < sS && sS < sP)) return null
  const eP = endP + '</td></tr>'.length
  return { sM, eP, model: t.slice(sM, sE), ext: t.slice(sE, sI), int: t.slice(sI, sJ), join: t.slice(sJ, sS), setting: t.slice(sS, sP), price: t.slice(sP, eP) }
}
const MODEL_VALUE = '{{model}} <span style="color:#7d8891;">&nbsp;&middot;&nbsp; {{area}}</span>'
const textCell = (html) => `<div style="font-family:${FONT};font-size:15px;line-height:22px;font-weight:300;color:#eaf1f6;">${html}</div>`
// the template's Exterior row with its swatch cell swapped for plain words: the heading of one home in a list
const headingRow = (row, label, html) => row.replace('>Exterior</td>', `>${label}</td>`).replace(/(<td valign="middle"[^>]*>)<table[\s\S]*<\/table>(<\/td><\/tr>)$/, (m, a, b) => a + textCell(html) + b)
const money0 = (n) => '$' + Math.round(n).toLocaleString('en-AU')

// lead: the lead as the screen sees it (leadOut). settings: getSettings(). env.base: where the pictures are hosted.
// Returns { ok:false, why } when the email cannot be built yet, else { ok:true, subject, html, fields, missing }.
function build(lead, settings, env = {}) {
  const lines = H.homesOf(lead)
  if (!lines.length) return { ok: false, why: 'Choose their SOLUM (Studio, Plus or Max) on this customer first. OCTA is concept only.' }
  const prices = (settings && settings.prices) || {}
  if (lines.some((h) => !Number(prices[h.product]))) return { ok: false, why: 'Set the SOLUM prices in Setup first.' }
  const link = payUrl(settings && settings.payLink, lead)
  if (!link) return { ok: false, why: 'The pre-order payment link in Setup is missing or is not a https link.' }
  const units = H.unitsOf(lead), total = H.valueOf(prices, lead), multi = lines.length > 1 || lines[0].qty > 1
  const missing = []
  const pick = (v, tbl, label) => { if (v && tbl[v]) return [v, tbl[v]]; missing.push(label); return ['To be chosen', TBC] }
  const where = [lead.setting && lead.setting !== 'Not sure yet' ? lead.setting : '', STATES[lead.state]].filter(Boolean).join(', ') || 'To be confirmed'
  const port = PORTS[lead.state] || ['your nearest port, confirmed by our team', 'delivery']
  const one = lines[0], m = MODELS[one.product]
  const modelText = !multi ? m[0] : lines.length === 1 ? `${one.qty} ${m[0]} homes` : `${units} SOLUM homes`
  const fin = lines.map((h, i) => {
    const tag = lines.length > 1 ? `home ${i + 1} ` : ''
    return { h, ext: pick(h.clad, CLAD, tag + 'exterior'), int: pick(h.pal, PAL, tag + 'interior'), joi: pick(h.join, JOIN, tag + 'joinery') }
  })
  const vals = {
    img: (env.base || DEFAULT_BASE).replace(/\/+$/, '') + '/email', first_name: esc(lead.first || 'there'), model: esc(modelText), area: m[1], setting: esc(where), price: money0(total),
    port: esc(port[0]), port_state: esc(port[1]), exterior: esc(fin[0].ext[0]), exterior_hex: fin[0].ext[1], interior: esc(fin[0].int[0]), interior_hex: fin[0].int[1], joinery: esc(fin[0].joi[0]), joinery_hex: fin[0].joi[1], pay_link: esc(link),
  }
  let tpl = TEMPLATE
  if (multi) {
    const r = cutRows(TEMPLATE)
    if (!r || !r.model.includes(MODEL_VALUE)) return { ok: false, why: 'The pre-order email template could not be read for an order of several homes.' }
    const homesList = lines.map((h) => `${esc(H.lineName(h))} <span style="color:#7d8891;">&nbsp;&middot;&nbsp; ${MODELS[h.product][1]}</span>`).join('<br>')
    const homesRow = r.model.replace('>Model</td>', '>Homes</td>').replace(MODEL_VALUE, () => homesList)
    const blocks = fin.map((f, i) => {
      const swap = (row, tok, v, hex) => row.split('{{' + tok + '_hex}}').join(hex).split('{{' + tok + '}}').join(esc(v))
      const head = lines.length > 1 ? headingRow(r.ext, 'Home ' + (i + 1), `${esc(H.lineName(f.h))} <span style="color:#7d8891;">&nbsp;&middot;&nbsp; ${MODELS[f.h.product][1]}</span>`) : ''
      return head + swap(r.ext, 'exterior', f.ext[0], f.ext[1]) + swap(r.int, 'interior', f.int[0], f.int[1]) + swap(r.join, 'joinery', f.joi[0], f.joi[1])
    }).join('')
    const sum = lines.map((h) => `${h.qty} &times; ${money0(prices[h.product])}`).join(' + ')
    const priceRow = r.price.replace('>Indicative price</td>', `>Indicative total, ${units} home${units === 1 ? '' : 's'}</td>`).replace('{{price}}</div>', () => `{{price}}</div><div style="font-family:${FONT};font-size:12px;line-height:20px;font-weight:300;color:#7d8891;padding-top:6px;">${sum}</div>`)
    tpl = TEMPLATE.slice(0, r.sM) + homesRow + blocks + r.setting + priceRow + TEMPLATE.slice(r.eP)
  }
  const html = tpl.replace(/{{(\w+)}}/g, (all, k) => (k in vals ? vals[k] : all))
  const note = lines.map((h, i) => `${H.lineName(h)}: ${fin[i].ext[0]} exterior, ${fin[i].int[0]} interior, ${fin[i].joi[0]} joinery`).join('; ')
  return { ok: true, subject: `Your ${modelText}, next steps | HAAVN BLACK`, html, missing, fields: { model: H.summary(lead), area: multi ? '' : m[1].replace('&sup2;', '\u00b2'), exterior: fin[0].ext[0], interior: fin[0].int[0], joinery: fin[0].joi[0], setting: where, price: money0(total), port: port[0],
    units, multi, note, lines: fin.map((f) => ({ name: H.lineName(f.h), qty: f.h.qty, area: MODELS[f.h.product][1].replace('&sup2;', '\u00b2'), exterior: f.ext[0], interior: f.int[0], joinery: f.joi[0], each: money0(prices[f.h.product]), subtotal: money0(f.h.qty * prices[f.h.product]) })) } }
}

module.exports = { build, payUrl }
