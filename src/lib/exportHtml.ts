/**
 * ATRIUM Feasibility export — document renderer.
 *
 * The target design (docs/design/atrium-feasibility-export-redesign.html) is an
 * HTML print document: `.sheet` blocks that `page-break-after: always`. Earlier
 * attempts re-inked the jsPDF hand-drawn output to chase it and never matched,
 * because the two renderers have nothing in common. This builds the design's
 * own markup from live data instead, so the export IS the design rather than an
 * approximation of it. Print-to-PDF from here is pixel-exact.
 *
 * Every figure comes from buildExportSections() — this file only lays out.
 */
import type { Section, Block, KVBlock, TableBlock, BarsBlock, NoteBlock } from './exportData'

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/** Kicker above each section title, matching the target document. */
const KICKER: Record<string, string> = {
  summary: 'Executive Summary',
  site: 'Site & Design',
  land: 'Acquisition',
  mix: 'Product Mix',
  'cost-summary': 'Cost Stack',
  'cost-hard': 'Cost Stack — Detail',
  'cost-consultants': 'Cost Stack — Detail',
  'cost-statutory': 'Cost Stack — Detail',
  'cost-marketing': 'Cost Stack — Detail',
  finance: 'Capital Structure',
  timeline: 'Programme',
  btr: 'Rental Yield',
  bts: 'Sell-down',
  hotel: 'Operator Basis',
  compare: 'Scenario Comparison',
  dashboard: 'Dashboard',
}

/** One-line standfirst under the section title. */
const LEAD: Record<string, string> = {
  summary: 'Consolidated outcome across all tested strategies.',
  site: 'GBA, GFA, NSA and ancillary areas from the architect’s schedule.',
  land: 'Purchase price, duty and acquisition terms.',
  mix: 'Unit typology, target split and pricing assumptions.',
  'cost-summary': 'Construction rate on GBA plus all soft costs — trade-by-trade behind each line.',
  finance: 'Debt, equity and the drawdown profile.',
  timeline: 'Programme phases and durations.',
  btr: 'Build-to-rent yield on completed value.',
  bts: 'Build-to-sell revenue and sell-down profile.',
  hotel: 'Operator-basis valuation on income and cap rate.',
  compare: 'Every tested strategy, ranked by residual land value.',
  dashboard: 'Best-strategy read across the tested scenarios.',
}


/** The document's own section titles, from the target design. These differ from
 *  the app's tab names: the tab is "Executive Summary", the section is
 *  "Feasibility position" under an EXECUTIVE SUMMARY kicker. */
const TITLE: Record<string, string> = {
  summary: 'Feasibility position',
  site: 'Area schedule',
  land: 'Acquisition',
  mix: 'Unit schedule',
  'cost-summary': 'Development cost',
  'cost-hard': 'Itemised trades',
  'cost-consultants': 'Itemised trades',
  'cost-statutory': 'Itemised trades',
  'cost-marketing': 'Itemised trades',
  finance: 'Capital structure',
  timeline: 'Programme',
  btr: 'Rental yield',
  bts: 'Sell-down',
  hotel: 'Operator basis',
  dashboard: 'Feasibility command',
  compare: 'Strategy outcomes',
}

// ── blocks ────────────────────────────────────────────────────────────────────

/** Value colouring follows the app: green positive, red negative, silver total. */
function vClass(raw: string): string {
  const t = raw.trim()
  if (/^-|^−|^\(\$/.test(t)) return ' r'
  if (/^\$|%$/.test(t) && !/^-|^−/.test(t)) return ''
  return ''
}

function kvRows(rows: [string, string][], featFirst = false): string {
  return rows.map(([l, v], i) => {
    const last = i === rows.length - 1
    const isTotal = /total|residual|net /i.test(l)
    const cls = ['rw', featFirst && i === 0 ? 'feat' : '', isTotal && last ? 'tot' : ''].filter(Boolean).join(' ')
    return `<div class="${cls}"><span class="l">${esc(l)}</span><span class="v${vClass(String(v))}">${esc(v)}</span></div>`
  }).join('')
}

function card(title: string | undefined, inner: string): string {
  return `<div class="card">${title ? `<div class="ctitle">${esc(title)}</div>` : ''}${inner}</div>`
}

function kvCard(b: KVBlock, title?: string, featFirst = false): string {
  return card(title ?? b.title, `<div class="rows">${kvRows(b.rows, featFirst)}</div>`)
}

/**
 * The summary block arrives as one flat list, but the document presents it as
 * two cards side by side — the position on the left, the winning strategy on
 * the right with its row on a silver plate. Split at "Best outcome"; the rows
 * and their values are untouched.
 */
function splitSummary(b: KVBlock): string | null {
  const at = b.rows.findIndex(([l]) => /^best outcome/i.test(l))
  if (at < 1) return null
  const left = b.rows.slice(0, at), right = b.rows.slice(at)
  return `<div class="two"><div>${card('Summary · incl. land', `<div class="rows">${kvRows(left)}</div>`)}</div>`
    + `<div>${card('Best outcome', `<div class="rows">${kvRows(right, true)}</div>`)}</div></div>`
}

function tableCard(b: TableBlock): string {
  const head = `<thead><tr>${b.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>`
  const body = `<tbody>${b.rows.map(r => {
    const isTot = /^total|^tdc|^grand/i.test(String(r[0] ?? ''))
    return `<tr${isTot ? ' class="tot"' : ''}>${r.map(c => {
      const s = String(c ?? '')
      return `<td class="${vClass(s).trim()}">${esc(s)}</td>`
    }).join('')}</tr>`
  }).join('')}</tbody>`
  return `<div class="card">${b.title ? `<div class="ctitle">${esc(b.title)}</div>` : ''}<table class="dt">${head}${body}</table></div>`
}

function barsCard(b: BarsBlock): string {
  const max = Math.max(...b.items.map(i => Math.abs(i.value)), 1)
  const rows = b.items.map(i => {
    const pct = (Math.abs(i.value) / max) * 100
    const colour = i.value < 0 ? 'var(--red)' : (i.color || 'var(--silver)')
    const val = i.value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
    return `<div class="brow"><span class="bl">${esc(i.label)}</span>`
      + `<div class="bt"><div class="bf" style="width:${pct.toFixed(1)}%;background:${colour}"></div></div>`
      + `<span class="bv${i.value < 0 ? ' r' : ''}">${esc(val)}</span></div>`
  }).join('')
  return `<div class="card">${b.title ? `<div class="ctitle">${esc(b.title)}</div>` : ''}<div class="bars">${rows}</div></div>`
}

const noteBlock = (b: NoteBlock) => `<div class="note">${esc(b.text)}</div>`

function renderBlock(b: Block): string {
  switch (b.type) {
    case 'kv': return kvCard(b)
    case 'table': return tableCard(b)
    case 'bars': return barsCard(b)
    case 'note': return noteBlock(b)
    default: return ''
  }
}

/** Two KV cards side by side where they fit, matching the target's `.two` grid. */
function renderBlocks(blocks: Block[]): string {
  const out: string[] = []
  for (let i = 0; i < blocks.length; i++) {
    const a = blocks[i], b = blocks[i + 1]
    const pairable = (x?: Block) => x && x.type === 'kv' && x.rows.length <= 10
    if (a && a.type === 'kv') {
      const split = splitSummary(a as KVBlock)
      if (split) { out.push(split); continue }
    }
    if (pairable(a) && pairable(b)) {
      out.push(`<div class="two"><div>${kvCard(a as KVBlock)}</div><div>${kvCard(b as KVBlock)}</div></div>`)
      i++
    } else {
      out.push(renderBlock(a))
    }
  }
  return out.join('')
}

function renderSection(s: Section): string {
  const kick = KICKER[s.id] ?? 'Feasibility'
  const lead = LEAD[s.id]
  const title = TITLE[s.id] ?? s.title
  return `<div class="sec"><div class="kick">${esc(kick)}</div><h2>${esc(title)}</h2>`
    + (lead ? `<div class="lead">${esc(lead)}</div>` : '')
    + `</div>${renderBlocks(s.blocks)}`
}

// ── pagination ────────────────────────────────────────────────────────────────

/** Rough rendered height so sections land on sheets the way the target does. */
function heightOf(s: Section): number {
  let h = 112                                    // kicker + title + lead
  // Paired KV cards sit side by side, so a pair costs the taller one, not both.
  const kvs = s.blocks.filter(b => b.type === 'kv') as KVBlock[]
  const paired = Math.floor(kvs.length / 2)
  let seen = 0
  for (const b of s.blocks) {
    if (b.type === 'kv') {
      seen++
      // second of a pair adds nothing — it shares the row
      if (seen <= paired * 2 && seen % 2 === 0) continue
      h += 46 + b.rows.length * 37
    } else if (b.type === 'table') h += 46 + 26 + b.rows.length * 34
    else if (b.type === 'bars') h += 46 + b.items.length * 29
    else if (b.type === 'note') h += 78
    else h += 190
  }
  return h + 34                                  // .sec bottom margin
}

const SHEET_CONTENT = 980   // 1180 sheet − running header − padding − footer

function paginate(sections: Section[]): Section[][] {
  const pages: Section[][] = []
  let cur: Section[] = [], used = 0
  for (const s of sections) {
    const h = heightOf(s)
    if (cur.length && used + h > SHEET_CONTENT) { pages.push(cur); cur = []; used = 0 }
    cur.push(s); used += h
  }
  if (cur.length) pages.push(cur)
  return pages
}

// ── document ──────────────────────────────────────────────────────────────────

export interface DocMeta {
  projectName: string
  address: string
  status?: string
  type?: string
  best?: string
}

const CSS = `
:root{--mono:'JetBrains Mono',monospace;--sans:'Inter',system-ui,sans-serif;--serif:'Cormorant Garamond',Georgia,serif;
--chrome:#0d1420;--chrome-2:#0a1017;--chrome-txt:#eef2f5;--chrome-dim:#93a0ad;--chrome-faint:#5f6c79;--chrome-line:rgba(255,255,255,.1);
--bg:#e9edf3;--card:#ffffff;--card-2:#f6f8fb;--ink:#232c37;--ink-2:#5b6672;--ink-3:#8592a0;--faint:#a7b2bd;
--line:rgba(30,41,56,.09);--line-2:rgba(30,41,56,.14);--row:rgba(30,41,56,.018);
--green:#2f9e6b;--green-soft:rgba(47,158,107,.12);--red:#cf5942;--red-soft:rgba(207,89,66,.1);--amber:#c67d33;
--blue:#647fa8;--blue-2:#8ba0c1;--slate:#8391a0;--silver:#8a97a6;--silver-hi:#4a5a6e;--silver-soft:rgba(110,124,142,.1);--silver-line:rgba(110,124,142,.34);
--shadow:0 30px 70px -40px rgba(20,30,45,.5);}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--sans);color:var(--ink);-webkit-font-smoothing:antialiased;background:var(--bg)}
.bg{position:fixed;inset:0;z-index:-1;background:var(--bg)}
.bgphoto{position:absolute;inset:0;background-image:var(--photo);background-size:cover;background-position:center;opacity:.4;filter:brightness(1.28) saturate(.5)}
.bgscrim{position:absolute;inset:0;background:radial-gradient(120% 90% at 15% -8%,rgba(210,222,236,.4),transparent 55%),linear-gradient(180deg,rgba(233,238,244,.82),rgba(222,229,238,.9))}
.pnote{position:fixed;top:0;left:0;right:0;z-index:90;display:flex;align-items:center;gap:12px;padding:9px 22px;background:var(--chrome);border-bottom:1px solid var(--chrome-line);font-size:10.5px;letter-spacing:.06em;color:var(--chrome-dim)}
.pnote b{color:var(--chrome-txt)}
.pbtn{margin-left:auto;font-size:10px;letter-spacing:.16em;color:var(--chrome-txt);border:1px solid var(--chrome-line);padding:7px 14px;border-radius:16px;cursor:pointer;background:rgba(255,255,255,.05);font-family:inherit}
.wrap{max-width:940px;margin:0 auto;padding:58px 20px 64px}
.sheet{background:var(--card);border:1px solid var(--line);border-radius:10px;box-shadow:var(--shadow);margin-bottom:26px;position:relative;min-height:1180px;overflow:hidden}
.pad{padding:44px 50px 104px}
.rh{display:flex;align-items:center;gap:14px;padding:16px 50px;border-bottom:1px solid var(--line);background:var(--card-2)}
.rh .lk{height:26px;width:auto}
.rh .dv{width:1px;height:26px;background:var(--line-2)}
.rh .pj{font-family:var(--serif);font-size:16px;font-weight:600;color:var(--ink);display:flex;align-items:center;gap:8px}
.rh .dot{width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block}
.rh .ad{font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin-top:3px}
.rh .rt{margin-left:auto;text-align:right}
.rh .wm{font-family:var(--serif);font-size:16px;letter-spacing:.34em;color:var(--ink);font-weight:600;padding-left:.34em}
.rh .st{font-size:8.5px;letter-spacing:.2em;color:var(--ink-3);text-transform:uppercase;margin-top:3px}
.rf{position:absolute;left:50px;right:50px;bottom:26px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:13px;font-size:9px;letter-spacing:.11em;color:var(--faint);text-transform:uppercase}
.rf .own b{color:var(--silver-hi);font-weight:600}
.kick{font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:var(--ink-3);font-weight:600}
.sec{margin:0 0 34px}
.sec>.kick{margin-bottom:9px}
.sec h2{font-family:var(--serif);font-size:33px;font-weight:600;line-height:1.04;letter-spacing:.01em;color:var(--ink)}
.sec .lead{font-size:12.5px;color:var(--ink-2);margin-top:8px;max-width:620px;line-height:1.5}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 24px;box-shadow:0 1px 0 var(--line)}
.card+.card{margin-top:16px}
.card,.kc,.two{break-inside:avoid;page-break-inside:avoid}
.sec{break-after:avoid;page-break-after:avoid}
.two>div>.card{margin-top:0}
.ctitle{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3);font-weight:600;margin-bottom:14px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.rows{width:100%}
.rw{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:12px 0;border-top:1px solid var(--line)}
.rw:first-child{border-top:none}
.rw .l{font-size:12.5px;color:var(--ink-2)}
.rw .v{font-family:var(--mono);font-size:13px;color:var(--ink);font-weight:500;white-space:nowrap}
.rw .v.g{color:var(--green)}.rw .v.r{color:var(--red)}.rw .v.s{color:var(--silver-hi)}
.rw.feat{background:var(--silver-soft);margin:0 -24px;padding-left:24px;padding-right:24px;border-radius:8px}
.rw.feat .v{color:var(--silver-hi);font-weight:600}
.rw.tot{border-top:1.5px solid var(--line-2);margin-top:2px}
.rw.tot .l{color:var(--ink);font-weight:600}.rw.tot .v{color:var(--silver-hi);font-weight:600;font-size:14px}
.dt{width:100%;border-collapse:collapse;font-size:11.5px}
.dt th{font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);text-align:right;padding:0 12px 10px;font-weight:600;border-bottom:1px solid var(--line-2);white-space:nowrap}
.dt th:first-child{text-align:left}
.dt td{padding:10px 12px;border-top:1px solid var(--line);text-align:right;font-family:var(--mono);color:var(--ink-2);white-space:nowrap}
.dt td:first-child{text-align:left;font-family:var(--sans);color:var(--ink)}
.dt tr.tot td{border-top:1.5px solid var(--line-2);color:var(--ink);font-weight:600}
.g{color:var(--green)!important}.r{color:var(--red)!important}.s{color:var(--silver-hi)!important}
.kpis{display:grid;gap:12px;margin-bottom:16px}.k6{grid-template-columns:repeat(3,1fr)}.k4{grid-template-columns:repeat(4,1fr)}
.kc{background:var(--card);border:1px solid var(--line);border-radius:13px;padding:17px 18px}
.kc .l{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);font-weight:600}
.kc .v{font-family:var(--mono);font-size:22px;margin-top:10px;letter-spacing:-.01em}
.kc .sub{font-size:9.5px;color:var(--faint);margin-top:7px}
.bars{margin-top:4px}
.brow{display:grid;grid-template-columns:210px 1fr 132px;align-items:center;gap:14px;padding:7px 0}
.brow .bl{font-size:11px;color:var(--ink-2)}
.brow .bt{height:15px;border-radius:4px;background:var(--row);position:relative;overflow:hidden}
.brow .bf{height:100%;border-radius:4px}
.brow .bv{font-family:var(--mono);font-size:11px;text-align:right;color:var(--ink)}
.pill{font-size:8px;letter-spacing:.1em;padding:4px 9px;border-radius:11px;text-transform:uppercase;font-weight:600;white-space:nowrap}
.pill.g{color:var(--green);background:var(--green-soft)}.pill.s{color:var(--silver-hi);background:var(--silver-soft)}
.note{font-size:10.5px;line-height:1.7;color:var(--ink-3);font-style:italic;margin-top:14px;padding:14px 17px;border:1px solid var(--line);border-radius:12px;background:var(--row)}
.sheet.cover,.sheet.closing{background:linear-gradient(180deg,#0c1219,#0a0e14);border-color:rgba(255,255,255,.08);color:#eef2f5;display:flex;flex-direction:column;min-height:1180px}
.cphoto{position:absolute;inset:0;background-image:var(--photo);background-size:cover;background-position:center;opacity:.32;filter:saturate(.85)}
.cscrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,14,20,.5),rgba(10,14,20,.88))}
.cover>*,.closing>*{position:relative;z-index:2}
.cvpad{padding:50px 54px;display:flex;flex-direction:column;flex:1}
.cvtop{display:flex;justify-content:space-between;align-items:flex-start}
.cvwings{width:96px;display:block;margin:0 auto;opacity:.96}
.cvcap{font-family:var(--serif);letter-spacing:.42em;font-size:14px;color:#cdd8e2;font-weight:600;margin-top:11px;text-align:center;padding-left:.42em}
.cvkick{text-align:right;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#93a0ad;line-height:1.7;padding-top:6px}
.cvmid{margin-top:auto;margin-bottom:auto}
.cvtitle{font-family:var(--serif);font-size:54px;font-weight:600;line-height:1.01;color:#f3f6f9}
.cvsub{font-size:13px;color:#9fabb6;margin-top:13px;letter-spacing:.01em}
.cvchips{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}
.chip{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#cdd8e2;border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:8px 14px}
.chip.own{border-color:rgba(154,168,182,.5);background:rgba(154,168,182,.12)}.chip.own b{color:#fff}
.cvfoot{display:flex;justify-content:space-between;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:#5f6c79;border-top:1px solid rgba(255,255,255,.1);padding-top:16px;margin-top:30px}
.closing{align-items:center;text-align:center;justify-content:center;padding:54px}
.clwings{width:120px;margin:auto auto 0;display:block}
.clcap{font-family:var(--serif);letter-spacing:.42em;font-size:14px;color:#cdd8e2;font-weight:600;margin-top:11px;padding-left:.42em;text-align:center}
.closing h1{font-weight:300;letter-spacing:.4em;font-size:25px;color:#eef2f5;margin-top:30px;padding-left:.4em}
.closing .ty{font-size:15px;color:#9fabb6;margin-top:12px}
.closing .rule{width:210px;height:1px;background:rgba(255,255,255,.18);margin:26px auto}
.closing .conf{max-width:580px;font-size:10px;line-height:1.75;color:#8290a0}
.closing .addr{margin-top:auto;font-size:11px;color:#9fabb6;line-height:1.9;letter-spacing:.04em}
.closing .addr b{color:#cdd8e2;letter-spacing:.2em}
.closing .cc{font-size:9px;color:#5a6674;margin-top:16px;letter-spacing:.08em}
@page{size:A4;margin:0}
@media print{.pnote{display:none}.wrap{padding:0;max-width:none}
.sheet{box-shadow:none;margin:0;border-radius:0;page-break-after:always;break-after:page;border:none;min-height:auto;height:auto}
.cover,.closing{height:297mm;min-height:297mm}
.rf{position:static;margin:26px 50px 0;left:auto;right:auto;bottom:auto}
.pad{padding-bottom:34px}
.bg{display:none}body{background:#fff}
.cover,.closing{-webkit-print-color-adjust:exact;print-color-adjust:exact}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`

const WINGS = '/winged-device-white.png'
const LOCKUP = '/brand-logo.png'
const PHOTO = "url('/renders/atrium-surface-1.jpg')"

/** Break the cover title near its middle, so "575 Derrimut Road Tarneit" sets
 *  as "575 Derrimut / Road Tarneit" rather than orphaning the street number. */
function coverTitle(name: string): string {
  const w = name.trim().split(/\s+/)
  if (w.length < 3) return esc(name)
  let best = 1, diff = Infinity
  for (let i = 1; i < w.length; i++) {
    const d = Math.abs(w.slice(0, i).join(' ').length - w.slice(i).join(' ').length)
    if (d < diff) { diff = d; best = i }
  }
  return `${esc(w.slice(0, best).join(' '))}<br>${esc(w.slice(best).join(' '))}`
}

function coverSheet(m: DocMeta, dateStr: string): string {
  const title = coverTitle(m.projectName)
  const chips = [
    m.status && `<span class="chip">Status · ${esc(m.status)}</span>`,
    m.type && `<span class="chip">Type · ${esc(m.type)}</span>`,
    m.best && `<span class="chip">Best · ${esc(m.best)}</span>`,
    `<span class="chip own"><b>Developer &amp; data owner · 7EVEN Capital</b></span>`,
  ].filter(Boolean).join('')
  return `<div class="sheet cover"><div class="cphoto"></div><div class="cscrim"></div><div class="cvpad">
<div class="cvtop"><div class="cvlogo"><img class="cvwings" src="${WINGS}" alt="7EVEN Capital"><div class="cvcap">CAPITAL</div></div>
<div class="cvkick">Development<br>Feasibility Studio</div></div>
<div class="cvmid"><div class="cvtitle">${title}</div>
<div class="cvsub">${esc(m.address)}${m.address ? ' · ' : ''}Feasibility export · ${esc(dateStr)}</div>
<div class="cvchips">${chips}</div></div>
<div class="cvfoot"><span>ATRIUM</span><span>Confidential</span><span>7even.au</span></div>
</div></div>`
}

function contentSheet(m: DocMeta, sections: Section[], page: number, total: number): string {
  return `<div class="sheet">
<div class="rh"><img class="lk" src="${LOCKUP}" alt="7EVEN | HAAVN"><span class="dv"></span>
<div><div class="pj"><span class="dot"></span>${esc(m.projectName)}</div><div class="ad">${esc(m.address)}${m.type ? ' · ' + esc(m.type) : ''}</div></div>
<div class="rt"><div class="wm">ATRIUM</div><div class="st">Development Feasibility Studio</div></div></div>
<div class="pad">${sections.map(renderSection).join('')}</div>
<div class="rf"><span class="own">Developer &amp; data owner · <b>7EVEN Capital</b></span><span>Confidential</span><span>${page} / ${total}</span></div>
</div>`
}

function closingSheet(): string {
  return `<div class="sheet closing"><div class="cphoto"></div><div class="cscrim"></div>
<img class="clwings" src="${WINGS}" alt="7EVEN Capital"><div class="clcap">CAPITAL</div>
<h1>PRECISION CAPITAL DEPLOYED</h1><div class="ty">Thank you.</div><div class="rule"></div>
<div class="conf">CONFIDENTIAL — This document and the information within it are strictly private and confidential, prepared solely for the intended recipient. 7EVEN Capital is the developer and sole owner of this data. It must not be reproduced, distributed or disclosed, in whole or in part, without the prior written consent of 7EVEN Capital. Figures are estimates prepared for feasibility purposes only and do not constitute financial advice or an offer of securities.</div>
<div class="addr"><b>7EVEN CAPITAL</b><br>Level 1, Suite 2, 20–30 Mollison Street, Abbotsford VIC 3067<br>Office 03 9982 2877 · 7even.au</div>
<div class="cc">© ${new Date().getFullYear()} 7EVEN Capital. All rights reserved. · ATRIUM Development Feasibility Studio</div>
</div>`
}

/** Full standalone document. `preview` adds the top bar with a Print button. */
export function buildExportDocument(meta: DocMeta, sections: Section[], preview = false): string {
  const dateStr = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const pages = paginate(sections)
  const total = pages.length + 2
  const sheets = pages.map((p, i) => contentSheet(meta, p, i + 2, total)).join('')
  return `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(meta.projectName)} — Feasibility export</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>:root{--photo:${PHOTO}}${CSS}</style></head>
<body><div class="bg"><div class="bgphoto"></div><div class="bgscrim"></div></div>
${preview ? `<div class="pnote">◆ PREVIEW · <b>ATRIUM Feasibility Export</b> — ${esc(meta.projectName)} · ${pages.length + 2} pages<button class="pbtn" onclick="window.print()">⎙ SAVE AS PDF</button></div>` : ''}
<div class="wrap">${coverSheet(meta, dateStr)}${sheets}${closingSheet()}</div></body></html>`
}

/**
 * Render into an iframe rather than a new tab.
 *
 * window.open() after an `await` loses the user-activation the browser needs to
 * allow it, so the export was silently pop-up blocked in production. An iframe
 * needs no gesture and no permission, so this cannot be blocked.
 */
function frameWith(html: string, hidden: boolean): HTMLIFrameElement {
  const f = document.createElement('iframe')
  f.setAttribute('aria-label', 'Feasibility export')
  f.style.cssText = hidden
    ? 'position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0;pointer-events:none'
    : 'width:100%;height:100%;border:0;display:block;background:#e9edf3'
  f.srcdoc = html
  return f
}

/** Wait for the frame to load and its webfonts to settle before printing. */
function whenReady(f: HTMLIFrameElement): Promise<void> {
  return new Promise(resolve => {
    f.addEventListener('load', () => {
      const d = f.contentDocument
      const fonts = d && (d as Document & { fonts?: FontFaceSet }).fonts
      const done = () => setTimeout(resolve, 120)
      if (fonts && fonts.ready) fonts.ready.then(done, done)
      else done()
    }, { once: true })
  })
}

/** Full-screen preview with its own Save-as-PDF control inside the document. */
export async function previewExportDocument(meta: DocMeta, sections: Section[]) {
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#e9edf3;display:flex;flex-direction:column'
  const bar = document.createElement('div')
  bar.style.cssText = 'flex:none;display:flex;justify-content:flex-end;padding:8px 14px;background:#0d1420;border-bottom:1px solid rgba(255,255,255,.1)'
  const close = document.createElement('button')
  close.textContent = '\u2715  CLOSE PREVIEW'
  close.style.cssText = 'font:700 10px/1 Inter,system-ui,sans-serif;letter-spacing:.18em;color:#eef2f5;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:9px 16px;cursor:pointer'
  const shut = () => { host.remove(); document.removeEventListener('keydown', onKey) }
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') shut() }
  close.onclick = shut
  document.addEventListener('keydown', onKey)
  bar.appendChild(close)
  const f = frameWith(buildExportDocument(meta, sections, true), false)
  host.append(bar, f)
  document.body.appendChild(host)
  await whenReady(f)
}

/** Straight to the print dialog, from an offscreen frame. */
export async function printExportDocument(meta: DocMeta, sections: Section[]) {
  const f = frameWith(buildExportDocument(meta, sections, false), true)
  document.body.appendChild(f)
  await whenReady(f)
  const w = f.contentWindow
  if (!w) { f.remove(); throw new Error('Could not prepare the document for printing.') }
  w.focus()
  w.print()
  // Leave the frame in place until the dialog closes, or printing is cancelled.
  setTimeout(() => f.remove(), 60_000)
}
