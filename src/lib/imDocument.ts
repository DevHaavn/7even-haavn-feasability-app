// ── HORI7ON | 7EVEN Investment Memorandum ─────────────────────────────────────
// Builds the editorial IM for any project: the 7even.au issue design (black
// field, dissolving plates, Monoton figures, vertical serif captions) carrying
// LIVE numbers straight from the feasibility engine — cost stack, cashflow-
// plotted finance waterfall, scenario valuation. No figure is typed twice.

import * as db from '../db'
import { calculateCostStack } from '../engine/costStack'
import { IM_CONTENT, fallbackContent, type ImContent, type ImPlate } from './imContent'

// ── formatting ────────────────────────────────────────────────────────────────
const dollars = (n: number) => `$${Math.round(n).toLocaleString('en-AU')}`
const M = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1_000_000_000) return `$${(n / 1e9).toFixed(2)}B`
  if (a >= 1_000_000) return `$${(n / 1e6).toFixed(1)}M`
  if (a >= 1000) return `$${Math.round(n / 1000)}K`
  return `$${Math.round(n)}`
}
const pc = (n: number, dp = 1) => `${(n * 100).toFixed(dp)}%`
const sqm = (n: number) => `${Math.round(n).toLocaleString('en-AU')} m²`
const esc = (s: string) => String(s ?? '')

/** Everything the document needs, read once from the engine. */
export function collectImData(projectId: string) {
  const project = db.getProject(projectId)
  const site = db.getSiteDesign(projectId)
  const land = db.getLandTerms(projectId)
  const landAcq = db.getLandAcquisition(projectId)
  const cs = db.getCostStack(projectId)
  const proj = db.getProjectTDC(projectId)          // gdv · land · costExFinance · financeCost · tdc · wf
  const metrics = db.getProfitMetrics(projectId)    // profit · margins · IRR · equity multiple
  const rows = db.getScenarioTable(projectId)
  const best = rows.find(r => r.isBest) ?? rows[0] ?? null
  const inKindLineItem = land.isInKind && land.inKindGFA > 0
    ? { label: land.inKindLabel, gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote }
    : undefined
  const r = calculateCostStack({ ...cs, gba: site.resiGBA, inKindLineItem, landCost: land.landCost })
  const wf = proj.wf
  const equityDrawn = wf.months.reduce((s, m) => s + m.equityDraw, 0)
  return { project, site, land, landAcq, cs, proj, metrics, rows, best, r, wf, equityDrawn }
}

type D = ReturnType<typeof collectImData>

// ── page furniture ────────────────────────────────────────────────────────────
const plate = (p: ImPlate, style: string) =>
  p.src ? `<div class="plate" style="${style}"><img src="${p.src}" alt=""></div>` : `<div style="${style}"></div>`
const mcaps = (l: string, r = '') => `<div class="mcaps"><span>${l}</span><span>${r}</span></div>`
const stat = (v: string, l: string, size = 21) =>
  `<div><div class="sv" style="font-size:${size}px">${v}</div><div class="sl">${l}</div></div>`
const head = (l: string, m: string, r: string) =>
  `<div class="pg-head"><span>${l}</span><span class="mid7">${m}</span><span>${r}</span></div>`
const folio = (n: string, m: string) =>
  `<div class="pg-folio"><span>${n}</span><span class="mid7">${m}</span><span>7EVEN.AU</span></div>`

// ── the document ──────────────────────────────────────────────────────────────
export function buildImHtml(projectId: string): string {
  const d = collectImData(projectId)
  const name = d.project?.name ?? 'Project'
  const c: ImContent = IM_CONTENT[projectId] ?? fallbackContent(name, d.project?.address ?? '', d.project?.type)
  const { site, cs, proj, metrics, best, r, wf } = d

  const units = best?.units ?? 0
  const strategy = best?.strategy ?? '—'
  // No revenue scenario entered yet — the IM must not print a fabricated deal.
  // Revenue-dependent figures read "—" and the document says why.
  const noRevenue = !best || proj.gdv <= 0
  const rv = (v: string) => (noRevenue ? '—' : v)
  const efficiency = site.resiGFA > 0 ? site.resiNSA / site.resiGFA : 0
  const perSqm = site.resiGBA > 0 ? proj.tdc / site.resiGBA : 0
  const mgmt = (cs.projectManagementFixed || 0) + (cs.marketingFixed || 0) + (cs.amenityFitoutFixed || 0)
  const hardCosts = r.construction + r.contingency + r.prelims
  const peakDebtCover = wf.peakDebt > 0 ? proj.gdv / wf.peakDebt : 0

  // ── cover ───────────────────────────────────────────────────────────────────
  const coverMark = c.brandimg
    ? `<img src="${c.brandimg}" alt="${esc(name)}" style="height:58px;width:auto;margin:0 auto">`
    : ''
  const partners = c.partners?.length
    ? `<div style="display:flex;justify-content:center;gap:26px;margin-top:14px">${c.partners.map(p => `<img src="${p}" alt="" style="height:15px;width:auto;opacity:.95">`).join('')}</div>`
    : ''

  const p1 = `
<div class="page"><div class="pgpad">
  ${head('7EVEN — INVESTMENT MEMORANDUM', 'THE HORI7ON PORTFOLIO', `ISSUE ${c.issue}`)}
  <div style="display:flex;justify-content:center;margin-top:3.2%"><img src="/hori7on-gold.png" alt="HORI7ON" style="height:15px;width:auto"></div>
  ${plate(c.cover, 'margin-top:3.4%;height:47%')}
  ${mcaps(c.cover.cap, `${esc(c.city).toUpperCase()}`)}
  <div style="margin-top:4%">
    ${coverMark}${partners}
    <div class="mast" style="font-size:${c.brandimg ? 44 : 74}px;${c.brandimg ? 'text-align:center;margin-top:16px' : ''}">${esc(c.name)} ${c.nameItalic ? `<i>${esc(c.nameItalic)}</i>` : ''}</div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:16px">
      <div class="meta">
        <div><b>Engine</b>${esc(c.engineLine)}</div>
        <div><b>Strategy</b>${esc(c.strategyLine)}</div>
        <div><b>Status</b>${esc(c.statusLine)}</div>
      </div>
      <div style="text-align:right">
        <div class="sv" style="font-size:27px">${rv(M(proj.gdv))}</div>
        <div class="sl">Gross development value</div>
      </div>
    </div>
  </div>
  ${folio('01', 'CONFIDENTIAL — BY INVITATION')}
</div></div>`

  // ── contents / editor's note ────────────────────────────────────────────────
  const toc = [
    ['01', 'The vision', c.vision.mast + ' ' + c.vision.mastItalic],
    ['02', 'The life', 'What the project gives back.'],
    ['03', 'The scheme', "The architect's numbers."],
    ['04', 'The feasibility', 'Every dollar, accounted.'],
    ['05', 'The capital', 'How the money works.'],
  ].map(([n, t, s]) =>
    `<div><span class="sv" style="font-size:17px">${n}</span><div style="font-family:var(--f-d);font-size:17px;color:var(--ink);margin-top:4px">${t}</div><div style="font-size:9.4px;color:var(--ink3)">${esc(s)}</div></div>`).join('')

  const p2 = `
<div class="page"><div class="pgpad">
  ${head(`${esc(name).toUpperCase()} — THE DEAL`, `${units ? units.toLocaleString() + ' ' : ''}${esc(c.strategyLine).toUpperCase()}`, `ISSUE ${c.issue}`)}
  <div class="mast" style="font-size:78px;margin-top:4%">The <i>deal.</i></div>
  <div style="display:grid;grid-template-columns:auto 1fr 1.15fr;gap:6%;margin-top:4%">
    <div style="display:flex;flex-direction:column;gap:22px">
      ${stat(rv(M(proj.gdv)), 'Gross development value', 25)}
      ${stat(units ? units.toLocaleString() : '—', strategy === 'Hotel' ? 'Hotel keys' : 'Residences', 25)}
      ${stat(rv(M(metrics.profit)), 'Development profit', 25)}
      ${stat(rv(`${metrics.equityMultiple.toFixed(2)}<span style="font-family:var(--f-m);font-size:15px">×</span>`), 'Equity multiple', 25)}
    </div>
    <div style="border-left:1px solid rgba(255,255,255,.14);padding-left:9%">
      <div style="display:flex;flex-direction:column;gap:17px">${toc}</div>
    </div>
    <div>
      <div class="eyebrow" style="font-size:8px">Editor's note</div>
      <div style="font-family:var(--f-d);font-size:20px;line-height:1.3;color:var(--ink);margin-top:10px">${esc(c.headline)} ${esc(c.headlineItalic)}</div>
      <div class="just" style="margin-top:12px;columns:2;column-gap:18px">${esc(c.lede)}</div>
    </div>
  </div>
  ${plate(c.contentsPlate, 'height:26%;margin-top:3%')}
  ${mcaps(c.contentsPlate.cap, 'PRECISION MANUFACTURED · FINISHED TO LANDMARK QUALITY')}
  ${folio('02', 'THE DEAL')}
</div></div>`

  // ── the vision ──────────────────────────────────────────────────────────────
  const p3 = `
<div class="page"><div class="pgpad">
  ${head('N° 01 — THE VISION', esc(c.headline).toUpperCase() + ' ' + esc(c.headlineItalic).toUpperCase(), '7EVEN.AU')}
  <div style="display:grid;grid-template-columns:1.02fr .98fr;gap:6%;margin-top:4.5%;flex:1;min-height:0">
    <div>
      <div class="mast" style="font-size:56px">${esc(c.vision.mast)}<span class="it" style="text-align:right;padding-right:14%">${esc(c.vision.mastItalic)}</span></div>
      <div class="lead" style="margin-top:18px">${esc(c.vision.lead)}</div>
      <div class="meta" style="flex-direction:column;display:flex;gap:13px;margin-top:22px;max-width:290px">
        ${c.vision.meta.map(([k, v]) => `<div><b>${esc(k)}</b>${esc(v)}</div>`).join('')}
      </div>
      <div style="margin-top:22px" class="chips">${c.vision.chips.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>
    </div>
    <div style="display:flex;flex-direction:column">
      ${plate(c.visionPlate, 'flex:1;min-height:0')}
      <div class="figcap">${c.visionPlate.cap}</div>
    </div>
  </div>
  ${folio('03', 'THE VISION')}
</div></div>`

  // ── the life ────────────────────────────────────────────────────────────────
  const p4 = `
<div class="page"><div class="pgpad">
  ${head('N° 02 — THE LIFE', 'WHAT THE PROJECT GIVES BACK', '7EVEN.AU')}
  <div style="display:grid;grid-template-columns:auto 1fr;gap:4.5%;margin-top:4%;flex:1;min-height:0">
    <div class="vert">${esc(c.life.vert)} <i>${esc(c.life.vertItalic)}</i></div>
    <div style="display:flex;flex-direction:column;min-width:0">
      <div style="display:grid;grid-template-columns:1.35fr 1fr;grid-template-rows:1fr 1fr;gap:12px;height:54%;min-height:0">
        ${plate(c.lifePlates[0], 'grid-row:1/3')}
        ${plate(c.lifePlates[1], '')}
        ${plate(c.lifePlates[2], '')}
      </div>
      ${mcaps(c.lifePlates[0].cap, `${c.lifePlates[1].cap} · ${c.lifePlates[2].cap}`)}
      <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:5%;margin-top:4%;align-items:start">
        <div style="display:grid;gap:14px">${c.life.stats.map(([v, l]) => stat(v, l, 19)).join('')}</div>
        <p class="just">${c.life.copyA}</p>
        <p class="just">${c.life.copyB}</p>
      </div>
    </div>
  </div>
  ${folio('04', 'THE LIFE')}
</div></div>`

  // ── the scheme (live area schedule) ─────────────────────────────────────────
  const areaRows: [string, string][] = [
    ['Residential NSA', sqm(site.resiNSA)],
    ['Residential GFA', sqm(site.resiGFA)],
    ['Residential GBA (cost basis)', sqm(site.resiGBA)],
    ['Balconies', sqm(site.balcony)],
    ['Basement', sqm(site.basementTotal)],
    ['Car spaces', String(site.carSpaces ?? 0)],
  ].filter(([, v]) => v !== '0 m²' && v !== '0')
  const extraAreas: [string, string][] = ([
    ['Childcare GFA', site.childcareGFA], ['Church / vendor GFA', site.churchGFA], ['Other GFA', site.otherGFA],
  ] as [string, number][]).filter(([, v]) => (v || 0) > 0).map(([k, v]) => [k, sqm(v)])

  const p5 = `
<div class="page"><div class="pgpad">
  ${head('N° 03 — THE SCHEME', 'BUILT TO THE MILLIMETRE', '7EVEN.AU')}
  <div style="display:grid;grid-template-columns:auto 1fr;gap:4.5%;margin-top:4%;flex:1;min-height:0">
    <div class="vert">${esc(c.scheme.vert)} <i>${esc(c.scheme.vertItalic)}</i></div>
    <div style="display:flex;flex-direction:column;min-width:0">
      ${plate(c.schemePlate, 'height:44%')}
      ${mcaps(c.schemePlate.cap, c.arch ? esc(c.arch).toUpperCase() : '')}
      <div style="display:grid;grid-template-columns:1.1fr 1fr;gap:6%;margin-top:4%">
        <table class="lt">
          <tr><td class="sec" colspan="2">Area schedule — as modelled</td></tr>
          ${[...areaRows, ...extraAreas].map(([k, v]) => `<tr><td>${k}</td><td class="n">${v}</td></tr>`).join('')}
          ${efficiency > 0 ? `<tr class="sub"><td>NSA / GFA efficiency</td><td class="n" style="color:#57c08a">${pc(efficiency)}</td></tr>` : ''}
        </table>
        <div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px 12px">
            ${stat(units ? units.toLocaleString() : '—', strategy === 'Hotel' ? 'Hotel keys' : 'Residences')}
            ${stat(strategy, 'Best-value strategy')}
            ${site.resiGBA > 0 ? stat(sqm(site.resiGBA).replace(' m²', ' M²'), 'GBA · cost basis') : ''}
            ${efficiency > 0 ? stat(`${(efficiency * 100).toFixed(0)}<span style="font-family:var(--f-m);font-size:13px">%</span>`, 'NSA / GFA efficiency') : ''}
          </div>
          <p class="just" style="margin-top:16px;font-size:9.6px">${esc(c.scheme.note)}</p>
        </div>
      </div>
    </div>
  </div>
  ${folio('05', 'THE SCHEME')}
</div></div>`

  // ── the feasibility (live ledger) ───────────────────────────────────────────
  const costRows: [string, number][] = [
    ['Land — incl. duty & acquisition', proj.land],
    ['Construction — hard costs', hardCosts],
    ['Professional fees', r.professionalFees],
    ['Statutory & council', cs.statutoryFixed || 0],
    ['Project management + marketing', mgmt],
    ['Finance — monthly waterfall, incl. fees', proj.financeCost],
  ].filter(([, v]) => v > 0)
  if (r.inKindCost > 0) costRows.push(['In-kind delivery cost', r.inKindCost])

  const valRows: [string, string][] = [
    ...(best?.noi ? ([['Net operating income — stabilised', dollars(best.noi)]] as [string, string][]) : []),
    [strategy === 'BTS' ? 'Gross realisation — sales revenue' : 'Gross asset value — yield basis', dollars(proj.gdv)],
    ...(best?.rlv ? ([['Residual land value', dollars(best.rlv)]] as [string, string][]) : []),
    ...(perSqm > 0 ? ([['All-in rate per GBA m²', `${dollars(perSqm)} /m²`]] as [string, string][]) : []),
  ]

  const p6 = `
<div class="page"><div class="pgpad">
  ${head('N° 04 — THE FEASIBILITY', 'LIVE OUTPUTS · 7EVEN ATRIUM ENGINE', '7EVEN.AU')}
  <div class="mast" style="font-size:46px;margin-top:3.5%">Every dollar, <i>accounted.</i></div>
  <div style="display:grid;grid-template-columns:1.12fr 1fr;gap:6%;margin-top:3.5%;flex:1;min-height:0">
    <div>
      <table class="lt">
        <tr><td class="sec" colspan="2">Total development cost</td></tr>
        ${costRows.map(([k, v]) => `<tr><td>${k}</td><td class="n">${dollars(v)}</td></tr>`).join('')}
        <tr class="tot"><td>TOTAL DEVELOPMENT COST</td><td class="n">${dollars(proj.tdc)}</td></tr>
      </table>
      ${noRevenue ? `<div style="border:1px solid rgba(214,179,106,.4);background:rgba(214,179,106,.06);padding:14px 16px;margin-top:14px">
        <div class="eyebrow" style="font-size:8px">Revenue model pending</div>
        <div class="just" style="margin-top:7px;font-size:9.2px">No revenue scenario has been entered for this project in the feasibility model, so valuation, profit and return figures are not shown. The development cost above is live and complete. Enter the Product Mix scenario to populate the full memorandum.</div>
      </div>` : `<table class="lt" style="margin-top:14px">
        <tr><td class="sec" colspan="2">Valuation — ${strategy === 'BTR' ? 'conservative basis' : 'best-value scenario'}</td></tr>
        ${valRows.map(([k, v]) => `<tr><td>${k}</td><td class="n">${v}</td></tr>`).join('')}
      </table>`}
      <p class="just" style="margin-top:14px;font-size:9px;color:var(--ink3)">Figures are live outputs of the 7EVEN ATRIUM feasibility engine — cost stack, cashflow-plotted finance waterfall and ${strategy === 'BTR' ? 'conservative-basis' : 'best-value'} valuation — as at ${new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}.</p>
    </div>
    <div style="display:flex;flex-direction:column">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px 14px">
        ${stat(rv(M(metrics.profit)), 'Development profit', 26)}
        ${stat(rv(`${(metrics.marginOnCost * 100).toFixed(1)}<span style="font-family:var(--f-m);font-size:15px">%</span>`), 'Margin on cost', 26)}
        ${stat(noRevenue || metrics.irr == null ? '—' : `${(metrics.irr * 100).toFixed(1)}<span style="font-family:var(--f-m);font-size:15px">%</span>`, 'Project IRR', 26)}
        ${stat(rv(`${metrics.equityMultiple.toFixed(2)}<span style="font-family:var(--f-m);font-size:15px">×</span>`), 'Equity multiple', 26)}
      </div>
      <div class="rule" style="margin:18px 0"></div>
      ${plate(c.feasPlate, 'flex:1;min-height:0')}
      ${mcaps(c.feasPlate.cap)}
    </div>
  </div>
  ${folio('06', 'THE FEASIBILITY')}
</div></div>`

  // ── the capital (live waterfall) ────────────────────────────────────────────
  const trancheRows = wf.tranches
    .filter(t => t.facility > 0)
    .map(t => `<tr><td>${esc(t.label)}</td><td class="n">${M(t.facility)}</td><td class="n" style="color:var(--ink3)">${pc(t.rate)}</td></tr>`)
    .join('')

  const p7 = `
<div class="page"><div class="pgpad">
  ${head('N° 05 — THE CAPITAL', 'CAPITAL WITH CLARITY', '7EVEN.AU')}
  <div class="mast" style="font-size:46px;margin-top:3.5%">Capital <i>with clarity.</i></div>
  <div style="display:grid;grid-template-columns:1.15fr 1fr;gap:6%;margin-top:3.5%;flex:1;min-height:0">
    <div>
      <table class="lt">
        <tr><td class="sec" colspan="3">Capital stack — monthly debt waterfall</td></tr>
        ${trancheRows}
        <tr class="sub"><td>Equity drawn through delivery</td><td class="n">${M(d.equityDrawn)}</td><td></td></tr>
        <tr class="tot"><td>BASE TDC FUNDED</td><td class="n">${M(wf.baseTDC)}</td><td></td></tr>
      </table>
      <div style="display:grid;grid-template-columns:repeat(3,auto);gap:26px;justify-content:start;margin-top:18px">
        ${stat(M(wf.peakDebt), 'Peak debt', 19)}
        ${stat(M(proj.financeCost), 'Finance cost incl. fees', 19)}
        ${stat(rv(`${peakDebtCover.toFixed(2)}<span style="font-family:var(--f-m);font-size:12px">×</span>`), 'GDV cover on peak debt', 19)}
      </div>
      <p class="just" style="margin-top:16px;font-size:9.6px"><b>The funding rule.</b> Equity draws first; facilities fund in priority — land, senior, mezzanine, preferred — each capped at facility, interest accruing monthly on drawn balances and clearing at practical completion. Establishment, line and exit fees are charged as configured. Timing follows the project cashflow, month by month.</p>
    </div>
    <div style="display:flex;flex-direction:column">
      ${plate(c.capitalPlate, 'height:46%')}
      ${mcaps(c.capitalPlate.cap)}
      ${noRevenue ? '' : `<p class="pq" style="margin-top:7%">&ldquo;${M(d.equityDrawn)} of equity through delivery returns capital plus ${M(metrics.profit)} of development profit at completion — a ${metrics.equityMultiple.toFixed(2)}× multiple${metrics.irr == null ? '' : ` at a ${pc(metrics.irr)} project IRR`}.&rdquo;</p>`}
      <div class="chips" style="margin-top:6%"><span class="chip">Asset-backed</span><span class="chip">Income-generating</span><span class="chip">Disciplined</span></div>
    </div>
  </div>
  ${folio('07', 'THE CAPITAL')}
</div></div>`

  // ── the case ────────────────────────────────────────────────────────────────
  const p8 = c.case.points.length ? `
<div class="page"><div class="pgpad">
  ${head('N° 06 — THE CASE', 'WHY THIS DEAL, NOW', '7EVEN.AU')}
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6%;margin-top:4%;flex:1;min-height:0">
    <div>
      <div class="mast" style="font-size:46px">Why this deal, <i>now.</i></div>
      <div style="display:flex;flex-direction:column;gap:14px;margin-top:7%">
        ${c.case.points.map(([t, s], i) => `<div style="display:flex;gap:14px"><span class="sv" style="font-size:15px;flex:none">0${i + 1}</span><div><div style="font-family:var(--f-d);font-size:14.5px;color:var(--ink)">${esc(t)}</div><div class="just" style="font-size:8.8px;margin-top:2px">${esc(s)}</div></div></div>`).join('')}
      </div>
    </div>
    <div style="display:flex;flex-direction:column">
      ${plate(c.casePlates[0], 'flex:1;min-height:0')}
      ${mcaps(c.casePlates[0].cap)}
      ${plate(c.casePlates[1], 'height:28%;margin-top:12px')}
      ${mcaps(c.casePlates[1].cap)}
    </div>
  </div>
  ${folio('08', 'THE CASE')}
</div></div>` : ''

  // ── back cover ──────────────────────────────────────────────────────────────
  const p9 = `
<div class="page"><div class="pgpad">
  ${head('7EVEN — PARTNER WITH US', 'CAPITAL · ENTERPRISE · PROJECT 7', `ISSUE ${c.issue}`)}
  <div style="text-align:center;margin-top:11%">
    <div class="mast" style="font-size:30px">Capital with clarity. Development with purpose.<br><i>Philanthropy with grit.</i></div>
    <div class="eyebrow" style="font-size:8.5px;margin-top:16px">This is how ambition turns into outcome.</div>
  </div>
  <div style="text-align:center;margin-top:8%">
    <img src="/winged-device-white.png" style="height:36px;width:auto;opacity:.95;display:inline-block" alt="7EVEN">
    <div class="eyebrow" style="margin-top:16px">Partner with 7EVEN</div>
    <div class="mast" style="font-size:38px;margin-top:10px">Let's build the next one <i>together.</i></div>
    <div style="font-size:11px;color:var(--ink2);margin-top:12px">Investment enquiries, development partnerships, or Project 7 — start the conversation.</div>
    <div style="font-family:var(--f-m);font-size:10.5px;letter-spacing:.22em;color:var(--gold);margin-top:22px;text-transform:uppercase">reception@7even.au &nbsp;·&nbsp; 03 9962 2877</div>
    <div style="font-family:var(--f-m);font-size:8.5px;letter-spacing:.24em;color:var(--ink2);margin-top:10px;text-transform:uppercase">Level 1, Suite 2, 20–30 Mollison Street · Abbotsford VIC 3067</div>
    <div class="hairline" style="max-width:340px;margin:18px auto 0"></div>
    <div style="margin-top:14px"><img src="/seven-mark-white-hd.png" style="height:18px;width:auto;display:inline-block" alt="7EVEN"> <img src="/hori7on-gold.png" style="height:10px;width:auto;display:inline-block;margin-left:16px" alt="HORI7ON"></div>
  </div>
  <div style="margin-top:auto">
    <div class="eyebrow" style="font-size:8px">Confidentiality &amp; Disclaimer</div>
    <div style="font-size:7.2px;line-height:1.75;color:var(--ink3);margin-top:8px;font-weight:300">This Investment Memorandum is confidential and provided for the exclusive use of the intended recipient. It may not be reproduced or distributed without the written consent of 7EVEN PTY LTD. All figures are indicative outputs of the 7EVEN ATRIUM feasibility model as at the date of issue, are subject to due diligence, planning and statutory approvals, financing and market conditions, and do not constitute an offer, invitation or financial product advice. Imagery is indicative of design intent and subject to change. Recipients must rely on their own enquiries and professional advice.</div>
  </div>
  <div class="pg-folio"><span>© ${new Date().getFullYear()} 7EVEN PTY LTD · 7EVEN.AU</span><span class="mid7">CAPITAL · ENTERPRISE · PROJECT 7</span><span>${p8 ? '09' : '08'}</span></div>
</div></div>`

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HORI7ON | 7EVEN IM · ${esc(name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Monoton&display=swap" rel="stylesheet">
<style>${IM_CSS}</style></head><body>
<div class="pvbar">
<button class="back" onclick="imBack()">← Back to feasibility</button>
<span class="t">HORI7ON | 7EVEN · Investment Memorandum — <b>${esc(name)}</b> · live feasibility data</span>
<span class="sp"></span><button onclick="window.print()">⤓ Save as PDF</button></div>
<script>
function imBack(){
  // Opened as a tab/pop-up from the app → just close it.
  try{ if(window.opener && !window.opener.closed){ window.close(); return } }catch(e){}
  // Installed PWA / same-window navigation → step back to the studio.
  if(history.length > 1){ history.back(); return }
  try{ window.close() }catch(e){}
  // Last resort: go to the app root.
  location.href = '/'
}
<\/script>
<div class="stage">${p1}${p2}${p3}${p4}${p5}${p6}${p7}${p8}${p9}</div>
</body></html>`
}

/** Open the IM in a new tab (optionally straight to the print dialog).
 *  `win` is a window opened synchronously in the click handler — browsers block
 *  a window.open that happens after an await, so the caller opens it first and
 *  hands it here. Falls back to a blob URL if no window was passed / it failed. */
export function openImDocument(projectId: string, print = false, win?: Window | null) {
  const html = buildImHtml(projectId)
  const w = win ?? window.open('', '_blank')
  if (w) {
    w.document.open()
    w.document.write(html)
    w.document.close()
    if (print) setTimeout(() => { try { w.focus(); w.print() } catch { /* user can print manually */ } }, 800)
    return
  }
  // Pop-up blocked — hand the document over as a blob the browser will open.
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  const a = document.createElement('a')
  a.href = url; a.target = '_blank'; a.rel = 'noopener'
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// ── the issue stylesheet (7even.au language) ──────────────────────────────────
const IM_CSS = `
:root{--line:rgba(255,255,255,.10);--ink:#FFFFFF;--ink2:#E3E1DA;--ink3:#A6A39B;
  --gold:#d6b36a;--gold2:#e8d296;--goldd:#b8933f;
  --f-d:'Cormorant Garamond',Georgia,serif;--f-b:'Inter',system-ui,sans-serif;--f-m:'JetBrains Mono',ui-monospace,monospace}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--f-b);background:#040405;color:var(--ink);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%}
::selection{background:var(--gold);color:#0a0a0b}
.pvbar{position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;gap:18px;
  padding:10px clamp(16px,3vw,40px);background:rgba(4,5,6,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.pvbar .t{font-family:var(--f-m);font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:#9aa0a6}
.pvbar .t b{color:var(--gold);font-weight:500}
.pvbar .sp{flex:1}
.pvbar button{font-family:var(--f-m);font-size:10px;letter-spacing:.22em;text-transform:uppercase;
  background:transparent;border:1px solid var(--gold);border-radius:2px;color:var(--gold);padding:8px 14px;cursor:pointer}
.pvbar button:hover{background:var(--gold);color:#0a0a0b}
.pvbar button.back{border-color:rgba(255,255,255,.3);color:#c9cdd2}
.pvbar button.back:hover{background:transparent;border-color:#fff;color:#fff}
.stage{padding:76px 0 80px;display:flex;flex-direction:column;align-items:center;gap:36px}
.page{width:min(920px,94vw);aspect-ratio:210/297;position:relative;overflow:hidden;color:var(--ink);
  background:radial-gradient(120% 90% at 50% 42%, transparent 55%, rgba(0,0,0,.3) 100%),
    url('/im-field-dark.jpg') center / cover no-repeat #060607;
  box-shadow:0 0 0 1px rgba(255,255,255,.08),0 40px 90px -40px rgba(0,0,0,.9)}
.pgpad{position:absolute;inset:0;padding:5.4% 6.4%;display:flex;flex-direction:column}
.pg-head{display:flex;justify-content:space-between;gap:18px;align-items:baseline;
  font-family:var(--f-m);font-size:8.5px;letter-spacing:.3em;text-transform:uppercase;color:#AFB3B6}
.pg-folio{display:flex;justify-content:space-between;font-family:var(--f-m);font-size:8.5px;letter-spacing:.28em;
  text-transform:uppercase;color:#9a9e9a;margin-top:auto;padding-top:14px}
.mid7{opacity:.75}
.eyebrow{font-family:var(--f-m);font-size:9.5px;letter-spacing:.34em;text-transform:uppercase;color:var(--gold);font-weight:500}
.mast{font-family:var(--f-d);font-weight:500;line-height:.92;letter-spacing:-.015em;color:var(--ink)}
.mast i{font-style:italic;font-weight:300;color:var(--gold)}
.mast .it{display:block;font-style:italic;font-weight:300;color:var(--gold)}
.lead{font-family:var(--f-d);font-size:14.5px;line-height:1.55;color:#F2F0EA}
.just{font-size:10.6px;line-height:1.78;color:var(--ink2);text-align:justify}
.just b{color:var(--ink);font-weight:600}
.figcap{margin-top:9px;font-size:9px;line-height:1.6;color:#C9C6BE}
.figcap b{color:var(--ink);font-weight:600}
.mcaps{display:flex;justify-content:space-between;gap:18px;margin-top:9px;
  font-family:var(--f-m);font-size:7.6px;letter-spacing:.2em;text-transform:uppercase;color:#9CA09A}
.sv{font-family:'Monoton',var(--f-d);font-weight:400;line-height:1.15;letter-spacing:.04em;color:var(--gold)}
.sl{font-family:var(--f-m);font-size:7.6px;letter-spacing:.22em;text-transform:uppercase;color:#BCB9B1;margin-top:6px}
.plate{overflow:hidden}
.plate img{width:100%;height:100%;object-fit:cover;display:block;
  -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 15px,#000 calc(100% - 15px),transparent 100%),
    linear-gradient(180deg,transparent 0,#000 15px,#000 calc(100% - 15px),transparent 100%);
  mask-image:linear-gradient(90deg,transparent 0,#000 15px,#000 calc(100% - 15px),transparent 100%),
    linear-gradient(180deg,transparent 0,#000 15px,#000 calc(100% - 15px),transparent 100%);
  -webkit-mask-composite:source-in;mask-composite:intersect}
.vert{writing-mode:vertical-rl;transform:rotate(180deg);
  font-family:var(--f-d);font-weight:500;font-size:34px;line-height:1;letter-spacing:.01em;color:var(--ink);
  border-left:1px solid rgba(255,255,255,.2);padding-left:16px}
.vert i{font-style:italic;font-weight:300;color:var(--gold)}
.meta{display:flex;gap:34px}
.meta div{border-left:1px solid rgba(255,255,255,.4);padding-left:12px;font-size:9.6px;color:#DBD9D2}
.meta b{display:block;font-family:var(--f-m);font-size:7.6px;letter-spacing:.26em;text-transform:uppercase;color:var(--ink);font-weight:600;margin-bottom:4px}
.pq{border-left:2px solid var(--gold);padding-left:16px;font-family:var(--f-d);font-style:italic;font-size:14.5px;line-height:1.6;color:#F2F0EA}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{font-family:var(--f-m);font-size:7.8px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink2);
  border:1px solid rgba(255,255,255,.28);padding:7px 11px;white-space:nowrap}
table{width:100%;border-collapse:collapse}
.lt td{padding:6px 2px;border-bottom:1px solid var(--line);font-size:9.4px;color:var(--ink2)}
.lt td.n{font-family:var(--f-m);text-align:right;color:#fff;font-size:9.2px;white-space:nowrap}
.lt tr.sub td{font-weight:600;color:var(--ink)}
.lt tr.tot td{border-top:2px solid var(--gold);border-bottom:3px double var(--gold);font-weight:600;color:var(--gold);padding:8px 2px}
.lt .sec{font-family:var(--f-m);font-size:7.4px;letter-spacing:.24em;text-transform:uppercase;color:#BCB9B1;padding-top:12px}
.rule{width:64px;height:1px;background:linear-gradient(90deg,var(--gold),transparent)}
.hairline{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.16) 12%,rgba(255,255,255,.16) 88%,transparent)}
@media print{
  .pvbar{display:none}
  body{background:#0A0A0B}
  .stage{padding:0;gap:0;display:block}
  .page{width:210mm;height:297mm;aspect-ratio:auto;box-shadow:none;page-break-after:always;margin:0}
  @page{size:A4 portrait;margin:0}
  .page,.plate img{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`
