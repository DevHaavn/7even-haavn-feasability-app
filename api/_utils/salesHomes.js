// The homes in one HAAVN BLACK order. A customer can buy several dwellings at once (6 SOLUM Plus, or 3 Plus and 4 Max), each line with its own number and finishes.
// Stored on the lead as `homes: [{ id, product, qty, clad, pal, join }]`. A customer saved before this existed has no `homes`: their one home is read from
// product / clad / pal / join, so nothing has to be migrated. Everything that counts money (order value, the 10% deposit, the final payment, commission) and the emails
// read the order through homesOf(), so a single home and a multiple order go through the same rules.
const HOME_KEYS = ['studio', 'plus', 'max']
const NAMES = { studio: 'SOLUM Studio', plus: 'SOLUM Plus', max: 'SOLUM Max' }
const AREAS = { studio: 42, plus: 55, max: 60 }
const CLAD = ['Ivory', 'Char', 'Amber', 'Urbanite'], PAL = ['Burgundy', 'Sage', 'Tide', 'Vine'], JOIN = ['Dark Oak', 'Raw Walnut']
const MAX_LINES = 12, MAX_QTY = 50

const pick = (v, list) => (list.includes(v) ? v : '')
const lineId = (i) => 'h' + Date.now().toString(36) + i + Math.random().toString(36).slice(2, 5)

// One line, cleaned. null when it is not a SOLUM home we sell. A quantity is a whole number from 1 to MAX_QTY.
function cleanLine(h, i) {
  if (!h || !HOME_KEYS.includes(h.product)) return null
  const qty = Math.max(1, Math.min(MAX_QTY, Math.floor(Number(h.qty)) || 1))
  return { id: typeof h.id === 'string' && /^[\w-]{1,24}$/.test(h.id) ? h.id : lineId(i), product: h.product, qty, clad: pick(h.clad, CLAD), pal: pick(h.pal, PAL), join: pick(h.join, JOIN) }
}
// A list of lines from a screen, a form or an email: the good ones, at most MAX_LINES.
function normalise(raw) {
  return (Array.isArray(raw) ? raw : []).slice(0, MAX_LINES).map(cleanLine).filter(Boolean)
}
// The lines of an order: the saved ones, else the one home the customer has always had.
function homesOf(l) {
  if (l && Array.isArray(l.homes) && l.homes.length) { const n = normalise(l.homes); if (n.length) return n }
  if (l && HOME_KEYS.includes(l.product)) return [{ id: 'h0', product: l.product, qty: 1, clad: l.clad || '', pal: l.pal || '', join: l.join || '' }]
  return []
}
const unitsOf = (l) => homesOf(l).reduce((n, h) => n + h.qty, 0)
// Order value at a price list ({ studio, plus, max }).
const valueOf = (prices, l) => homesOf(l).reduce((s, h) => s + h.qty * (Number(prices && prices[h.product]) || 0), 0)
// How many of each model: { plus: 7 }. Used to tell a change to the order from a change of finishes.
function countsOf(l) {
  const c = {}
  homesOf(l).forEach((h) => { c[h.product] = (c[h.product] || 0) + h.qty })
  return c
}
const sameCounts = (a, b) => HOME_KEYS.every((k) => (countsOf(a)[k] || 0) === (countsOf(b)[k] || 0))
const sameLines = (a, b) => JSON.stringify(homesOf(a).map((h) => [h.product, h.qty, h.clad, h.pal, h.join])) === JSON.stringify(homesOf(b).map((h) => [h.product, h.qty, h.clad, h.pal, h.join]))

const lineName = (h) => (h.qty > 1 ? `${h.qty} × ${NAMES[h.product]}` : NAMES[h.product])
function listWords(parts) { return parts.length < 2 ? parts.join('') : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] }
// "SOLUM Plus", "6 × SOLUM Plus", "3 × SOLUM Plus and 4 × SOLUM Max". Empty when there is no SOLUM home.
const summary = (l) => listWords(homesOf(l).map(lineName))
// The short form for a list: "Plus", "6 × Plus", "3 Plus + 4 Max".
function short(l) {
  const hs = homesOf(l)
  if (hs.length === 1) return (hs[0].qty > 1 ? hs[0].qty + ' × ' : '') + NAMES[hs[0].product].replace('SOLUM ', '')
  return hs.map((h) => h.qty + ' ' + NAMES[h.product].replace('SOLUM ', '')).join(' + ')
}

// Lines for a new customer from a form: a list of lines, or one model with a quantity. undefined when there is nothing to store (a single home needs no `homes`).
function fromRequest(p) {
  if (Array.isArray(p.homes) && p.homes.length) { const n = normalise(p.homes); return n.length ? n : undefined }
  const qty = Math.floor(Number(p.qty))
  if (HOME_KEYS.includes(p.product) && qty > 1) return normalise([{ product: p.product, qty, clad: p.clad, pal: p.pal, join: p.join }])
  return undefined
}
// The old single-home fields, kept equal to the first line so anything that still reads them shows something true.
const mirror = (lines) => (lines[0] ? { product: lines[0].product, clad: lines[0].clad, pal: lines[0].pal, join: lines[0].join } : {})

module.exports = { HOME_KEYS, NAMES, AREAS, CLAD, PAL, JOIN, MAX_LINES, MAX_QTY, normalise, homesOf, unitsOf, valueOf, countsOf, sameCounts, sameLines, lineName, summary, short, fromRequest, mirror, listWords }
