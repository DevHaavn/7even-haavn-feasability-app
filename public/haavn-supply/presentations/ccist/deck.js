/* ═══════════════════════════════════════════════════════════════════════════
   HAAVN · PRESENTATION TO CCIST — ENGINE
   No editing needed here. Content lives in data.js.
   ══════════════════════════════════════════════════════════════════════════ */
const $  = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s);
const p2 = n => String(n).padStart(2, '0');

let SLIDES = [], idx = 0, notesOpen = false;

/* the SOLUM mini brochure, one slide per page */
const BROCHURE_PAGES = 14;
function brochureSlides(){
  return Array.from({length: BROCHURE_PAGES}, (_, i) => ({
    type:'broch', section:'HAAVN BLACK', title:'SOLUM ' + p2(i+1), theme:'dark',
    pg:i,
    label:'HAAVN BLACK · SOLUM',
    n:p2(i+1)
  }));
}

function buildSlides(){
  const out = [];
  DECK.forEach(s => {
    out.push(s);
    if (s.section === 'HAAVN BLACK' && s.type === 'divider'){
      const pages = brochureSlides();
      out.push(pages[0], LAUNCH, ...pages.slice(1));   // launch film after the first brand page
    }
  });
  return out.map(s => Object.assign({}, s));
}

/* ── renderers ─────────────────────────────────────────────────────────── */
const R = {};
const markup = m => m ? `<div class="mark"><i>//</i>${esc(m)}</div>` : '';

R.cover = s => `<section class="slide bleed emb cover-emb" data-t="cover">
    <iframe src="cover.html" title="HAAVN" allow="autoplay"></iframe>
  </section>`;

R.contents = s => {
  const seen = {}, items = [];
  SLIDES.forEach((sl, i) => {
    if (sl.type === 'cover' || sl.type === 'contents') return;
    const k = sl.section || sl.title;
    if (seen[k] === undefined){ seen[k] = items.length; items.push({ sl, i, k, n:1 }); }
    else items[seen[k]].n++;
  });
  return `<section class="slide cont" data-t="${s.theme || 'light'}">
    <div class="cont__side rv">
      ${markup('Contents')}
      <h2 class="h1" style="margin-top:24px">In this<br>deck.</h2>
      <p class="body" style="margin-top:26px;max-width:320px">HAAVN for ${esc(MEETING.audience)}, ${esc(MEETING.date)}.</p>
    </div>
    <div class="cont__list rv">
      ${items.map((x, k) => `<div class="ci" data-go="${x.i}">
        <span class="ci__n">${p2(k+1)}</span>
        <span><span class="ci__l">${esc(x.k)}</span>
        <span class="ci__s">${x.n > 1 ? x.n + ' slides' : esc(x.sl.title || '')}</span></span>
      </div>`).join('')}
    </div>
  </section>`;
};

R.statement = s => `<section class="slide stmt" data-t="${s.theme}">
    <div class="rv">${markup(s.mark)}</div>
    <div class="stmt__g rv">
      <h2 class="stmt__h">${s.h}</h2>
      <div class="col">
        ${(s.body||[]).map(b => `<p class="body">${b}</p>`).join('')}
        ${s.tag ? `<p class="out" style="margin-top:30px">${esc(s.tag)}</p>` : ''}
      </div>
    </div>
  </section>`;

R.pillars = s => `<section class="slide pills" data-t="${s.theme}">
    <div class="rv">${markup(s.mark)}<h2 class="h2" style="margin-top:22px">${s.h}</h2></div>
    <div class="pills__g rv">
      ${s.cards.map(c => `<div class="pcard">
        <div class="pcard__n">${esc(c.n)}</div>
        <div>
          <div class="pcard__t">${esc(c.t)}</div>
          <div class="pcard__v">${esc(c.v)}</div>
          <div class="pcard__b">${esc(c.b)}</div>
        </div>
      </div>`).join('')}
    </div>
  </section>`;

R.pillar = s => `<section class="slide pd" data-t="${s.theme}">
    <div class="rv">${markup(s.mark)}<h2 class="h2" style="margin-top:22px">${s.h}</h2></div>
    <div class="pd__g rv">
      <div>
        ${(s.body||[]).map(b => `<p class="body">${b}</p>`).join('')}
        ${s.out ? `<p class="out">${esc(s.out)}</p>` : ''}
      </div>
      <div>
        ${s.services ? `<ul class="svc">${s.services.map(([a,b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('')}</ul>` : ''}
        ${s.four ? `<div class="four">${s.four.map(([a,b]) => `<div><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div>` : ''}
      </div>
    </div>
  </section>`;

R.process = s => `<section class="slide proc" data-t="${s.theme}">
    <div class="rv">${markup(s.mark)}<h2 class="h2" style="margin-top:22px">${s.h}</h2></div>
    <div class="proc__g rv">
      ${s.steps.map(([t,b,tag], i) => `<div class="st">
        ${tag ? `<div class="st__tag">${esc(tag)}</div>` : ''}
        <div class="st__n">${p2(i+1)}</div>
        <div class="st__t">${esc(t)}</div>
        <div class="st__b">${esc(b)}</div>
      </div>`).join('')}
    </div>
  </section>`;

R.marquee = s => {
  const grp = ([role, names]) => `<span class="pg"><b>${esc(role)}</b>${names.map(n =>
    `<span>${esc(n)}</span>`).join('<i>·</i>')}</span>`;
  const lines = s.rows.map((row, k) => {
    const one = Array(3).fill(grp(row)).join('');
    const dur = 58 + ((k * 17) % 5) * 11;
    const delay = -(dur * ((k * 0.382) % 1)).toFixed(1);
    return `<div class="pline"><div class="ptrack" style="--dur:${dur}s;--delay:${delay}s">${one}${one}</div></div>`;
  }).join('');
  return `<section class="slide mq" data-t="${s.theme}">
    <div class="rv" style="padding-right:120px">${markup(s.mark)}<h2 class="h2" style="margin-top:22px">${s.h}</h2></div>
    <div class="mq__lines rv">${lines}</div>
  </section>`;
};

R.metrics = s => `<section class="slide met" data-t="${s.theme}">
    <div class="rv">${markup(s.mark)}<h2 class="h2" style="margin-top:22px">${s.h}</h2></div>
    <div class="met__g rv">
      ${s.stats.map(m => `<div class="m">
        <div class="m__v" data-count="${esc(m.v)}">${esc(m.v)}${m.u ? `<s>${esc(m.u)}</s>` : ''}</div>
        <div class="m__l">${esc(m.l)}</div>
        ${m.n ? `<div class="m__n">${esc(m.n)}</div>` : ''}
      </div>`).join('')}
    </div>
  </section>`;

R.table = s => {
  const max = Math.max(...PIPELINE.map(r => r[3]));
  const tv = PIPELINE.reduce((a, r) => a + r[3], 0);
  const tm = PIPELINE.reduce((a, r) => a + r[4], 0);
  return `<section class="slide tbl" data-t="${s.theme}">
    <div class="rv">${markup(s.mark)}<h2 class="h2" style="margin-top:22px">${s.h}</h2></div>
    <table class="rv">
      <thead><tr>
        <th>Project</th><th>Type</th><th>Client</th>
        <th class="r">State</th><th class="r">Modules</th><th class="r">Storeys</th><th class="r">Stage</th><th class="r">Order value</th>
      </tr></thead>
      <tbody>
        ${PIPELINE.map(([a,t,c,v,m,st,stage,state], i) => `<tr>
          <td>${esc(a)}</td><td>${esc(t)}</td><td>${esc(c || '·')}</td>
          <td class="r">${esc(state)}</td><td class="r">${m.toLocaleString()}</td><td class="r">${st}</td><td class="r">${esc(stage)}</td>
          <td class="r"><span class="bar" style="width:${Math.round(v / max * 110)}px;animation-delay:${(i*.05).toFixed(2)}s"></span>$${v.toFixed(1)}m</td>
        </tr>`).join('')}
        <tr class="tot">
          <td>Total</td><td></td><td></td><td></td>
          <td class="r">${tm.toLocaleString()}</td><td class="r"></td><td class="r">${PIPELINE.length} projects</td>
          <td class="r">$${tv.toFixed(1)}m</td>
        </tr>
      </tbody>
    </table>
    <p class="note rv">Module order value as recorded in the HAAVN projects pipeline. Stage is the current position with CCIST, not a contracted commitment. Latest figures from Callum and James, 18 September 2026.</p>
  </section>`;
};

/* ── MIP slide types ───────────────────────────────────────────────────── */
R.mipdiv = s => `<section class="slide md" data-t="${s.theme}">
    <div class="rv">${markup(s.mark)}</div>
    <div class="md__mid">
      <div class="md__letters">
        ${s.letters.map(([k, t, v, b], i) => `<div class="md__l" style="--i:${i}">
          <b>${esc(k)}</b><span>${esc(t)}</span><em>${esc(v)}</em><p>${esc(b)}</p>
        </div>`).join('')}
      </div>
    </div>
    <div class="md__foot"><p class="md__s">${esc(s.s)}</p><span>HAAVN</span><i></i><span>×</span><i></i><span>CCIST</span></div>
  </section>`;

R.flow = s => `<section class="slide fl" data-t="${s.theme}">
    <div class="rv">${markup(s.mark)}<h2 class="h2" style="margin-top:22px">${s.h}</h2></div>
    <div class="fl__track">
      <div class="fl__line"><i class="fl__fill"></i><i class="fl__pulse"></i></div>
      ${s.nodes.map((n, i) => `<div class="fl__node${n.k.length > 1 ? ' fl__node--x' : ''}" style="--i:${i}">
        <div class="fl__dot">${esc(n.k)}</div>
        <div class="fl__t">${esc(n.t)}</div>
        <div class="fl__v">${esc(n.v)}</div>
        <div class="fl__b">${esc(n.b)}</div>
      </div>`).join('')}
    </div>
  </section>`;

R.mip = s => `<section class="slide mp" data-t="${s.theme}">
    <div class="mp__letter" aria-hidden="true">${esc(s.letter)}</div>
    <div class="mp__head rv">
      <div class="mark"><i>//</i>${esc(s.word)} · ${esc(s.kicker)}</div>
      <h2 class="mp__h">${esc(s.h[0])}<br><em>${esc(s.h[1])}</em></h2>
    </div>
    <div class="mp__body rv">
      <p class="lede">${esc(s.sub)}</p>
      <p class="mp__st">${esc(s.statement)}</p>
    </div>
    <div class="mp__stats">
      ${s.stats.map(([pre, to, suf, l], i) => `<div class="mp__s" style="--i:${i}">
        <div class="mp__v">${pre ? `<s>${esc(pre)}</s>` : ''}<span data-to="${to}">0</span>${suf ? `<s>${esc(suf)}</s>` : ''}</div>
        <div class="mp__l">${esc(l)}</div>
      </div>`).join('')}
    </div>
  </section>`;

R.lifecycle = s => `<section class="slide lc" data-t="${s.theme}">
    <div class="rv">${markup(s.mark)}<h2 class="h2" style="margin-top:22px">${s.h}</h2></div>
    <div class="lc__chain" style="--n:${s.stages.length}">
      <div class="lc__ccist" style="grid-column:${s.line[0] + 1} / span ${s.line.length}"><span>CCIST sits here</span></div>
      ${s.stages.map((t, i) => `<div class="lc__st${s.line.includes(i) ? ' is-line' : ''}" style="--i:${i}">
        <b>${p2(i + 1)}</b><span>${esc(t)}</span></div>`).join('')}
    </div>
    <div class="lc__feat">
      ${s.features.map(([n, h, m, p], i) => `<div class="lc__f" style="--i:${i}">
        <b>${esc(n)}</b><h4>${esc(h)}</h4><i>${esc(m)}</i><p>${esc(p)}</p></div>`).join('')}
    </div>
  </section>`;

R.program = s => {
  const track = (label, bars, cls) => `<div class="pg__row ${cls}">
      <div class="pg__lab">${label}</div>
      <div class="pg__lane">
        ${bars.map(([t, x, w, kind], i) => `<div class="pg__bar ${kind ? 'pg__bar--' + kind : ''}" style="--x:${x};--w:${w};--i:${i};${kind === 'line' ? 'top:50%' : kind === 'site' ? 'top:0' : ''}"><span>${esc(t)}</span></div>`).join('')}
      </div>
    </div>`;
  return `<section class="slide pgm" data-t="${s.theme}">
    <div class="rv">${markup(s.mark)}<h2 class="h2" style="margin-top:22px">${s.h}</h2></div>
    <div class="pg__chart">
      ${track('Traditional', s.trad, 'pg--trad')}
      ${track('MIP · HAAVN × CCIST', s.mip, 'pg--mip')}
      <div class="pg__axis"><span>Start</span><span>Illustrative sequence, not to scale</span><span>Handover</span></div>
    </div>
    <div class="pg__out">
      ${s.outcomes.map(([a, b], i) => `<div style="--i:${i}"><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}
    </div>
  </section>`;
};

R.sectorsgrid = s => `<section class="slide sg" data-t="${s.theme}">
    <div class="rv">${markup(s.mark)}<h2 class="h2" style="margin-top:22px">${s.h}</h2></div>
    <div class="sg__g">
      ${s.items.map(([k, t, b], i) => `<div class="sg__c" style="--i:${i}">
        <img src="assets/icons/${esc(k)}.png" alt="">
        <h4>${esc(t)}</h4><p>${esc(b)}</p></div>`).join('')}
    </div>
  </section>`;

R.together = s => `<section class="slide tg" data-t="${s.theme}">
    <div class="rv">${markup(s.mark)}</div>
    <div class="tg__g">
      <div class="tg__col tg__col--l">
        <div class="tg__t">${esc(s.left.t)}</div>
        ${s.left.rows.map(([k, t, b], i) => `<div class="tg__r" style="--i:${i}"><em>${esc(k)}</em><div><b>${esc(t)}</b><span>${esc(b)}</span></div></div>`).join('')}
      </div>
      <div class="tg__mid">
        <div class="tg__x">${s.h.replace('×', '<i>×</i>')}</div>
      </div>
      <div class="tg__col tg__col--r">
        <div class="tg__t">${esc(s.right.t)}</div>
        ${s.right.rows.map(([k, t, b], i) => `<div class="tg__r" style="--i:${i + 3}"><em>${esc(k)}</em><div><b>${esc(t)}</b><span>${esc(b)}</span></div></div>`).join('')}
      </div>
    </div>
    <p class="tg__out">${esc(s.out)}</p>
  </section>`;

/* numbers on MIP pages roll up on arrival */
function runCount(slide){
  slide.querySelectorAll('[data-to]').forEach((el, i) => {
    const to = +el.dataset.to; el.textContent = '0';
    setTimeout(() => {
      const t0 = performance.now(), dur = 1300;
      const tick = now => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        el.textContent = Math.round(to * e).toLocaleString('en-AU');
        if (k < 1) requestAnimationFrame(tick); else el.textContent = to.toLocaleString('en-AU');
      };
      requestAnimationFrame(tick);
    }, 700 + i * 180);
  });
}

R.score = s => `<section class="slide sb" data-t="${s.theme || 'dark'}">
    <div class="sb__top">${markup(s.mark)}</div>
    <div class="sb__hero">
      <div class="sb__big"><s>${esc(s.hero.pre || '')}</s><span data-to="${s.hero.to}">0</span><s>${esc(s.hero.suf || '')}</s></div>
      <div class="sb__hl"><b>${esc(s.hero.l)}</b><i>${esc(s.hero.n || '')}</i></div>
    </div>
    <div class="sb__row">
      ${s.stats.map((m, k) => `<div class="sb__cell" style="--k:${k}">
        <div class="sb__num"><span data-to="${m.to}">0</span>${m.suf ? `<s>${esc(m.suf)}</s>` : ''}</div>
        <div class="sb__lab">${esc(m.l)}</div>
        ${m.chips ? `<div class="sb__chips">${m.chips.map((c, j) => `<em style="--j:${j}">${esc(c)}</em>`).join('')}</div>` : ''}
        <i class="sb__rule"></i>
      </div>`).join('')}
    </div>
  </section>`;

R.crm = s => {
  const max = Math.max(1, ...CRM.bySector.map(x => x[2]));
  const total = CRM.bySector.reduce((a, x) => a + x[2], 0) + CRM.toAssign;
  return `<section class="slide crm" data-t="${s.theme}">
    <div class="rv">${markup(s.mark)}<h2 class="h2" style="margin-top:22px">${s.h}</h2></div>
    <div class="crm__g">
      <div class="crm__t" style="--i:0">
        <b>Active leads</b>
        <div class="crm__n"><span data-to="${CRM.active}">0</span></div>
        <p>Partners in live conversation. Stage: contacted.</p>
      </div>
      <div class="crm__t" style="--i:1">
        <b>Potential leads</b>
        <div class="crm__n"><span data-to="${CRM.potential}">0</span></div>
        <p>Developers identified and queued for approach.</p>
      </div>
      <div class="crm__t crm__t--sec" style="--i:2">
        <b>Leads by sector</b>
        <div class="crm__sec">
          ${CRM.bySector.map(([k, t, n], i) => `<div class="crm__row${n ? '' : ' is-zero'}" style="--j:${i}">
            <img src="assets/icons/${esc(k)}.png" alt="">
            <span>${esc(t)}</span>
            <i class="crm__bar"><i style="--w:${n / max * 100}%"></i></i>
            <em>${n}</em>
          </div>`).join('')}
        </div>
        ${CRM.toAssign ? `<p class="crm__todo">${CRM.toAssign} of ${total} leads still to be tagged with a sector</p>` : ''}
      </div>
    </div>
  </section>`;
};

R.dash = s => {
  const bars = (rows, tot) => rows.map(([k, v]) => `<div class="drow">
      <span>${esc(k)}</span>
      <span class="tr"><i style="width:${Math.round(v / tot * 100)}%"></i></span>
      <em>${v}</em>
    </div>`).join('');
  return `<section class="slide dash" data-t="${s.theme}">
    <div class="rv">${markup(s.mark)}<h2 class="h2" style="margin-top:22px">${s.h}</h2></div>
    <div class="dash__g rv">
      <div class="dcard">
        <b>By partner type</b>
        <div class="dbig">${CRM.total}</div>
        <p class="body" style="font-size:16px;margin-bottom:26px">Trade and channel partners on the book.</p>
        ${bars(CRM.byType, CRM.total)}
      </div>
      <div class="dcard"><b>By source</b>${bars(CRM.bySource, CRM.total)}</div>
      <div class="dcard">
        <b>By stage</b>${bars(CRM.byStage, CRM.total)}
        <p class="body" style="font-size:16px;margin-top:26px">
          Twenty six former client relationships are yet to be approached. That is the funnel sitting behind the current order book.
        </p>
      </div>
    </div>
  </section>`;
};

R.divider = s => `<section class="slide div" data-t="${s.theme}">
    <div class="rv">${markup(s.mark)}</div>
    <div class="div__mid rv">
      <div class="div__n">${esc(s.n)}</div>
      <h2 class="div__h">${s.h}</h2>
      ${s.s ? `<p class="div__s">${esc(s.s)}</p>` : ''}
    </div>
    <div class="div__m rv">${(s.m||[]).map(x => `<span>${esc(x)}</span>`).join('')}</div>
  </section>`;

R.embed = s => `<section class="slide bleed emb" data-t="dark">
    <iframe src="${esc(s.src)}" title="${esc(s.title)}" allow="autoplay"></iframe>
    <div class="emb__cap">
      ${markup(s.mark)}
      <h3 class="h3">${esc(s.h)}</h3>
      <p>${esc(s.p)}</p>
    </div>
  </section>`;

R.editorial = s => `<section class="slide ed" data-t="dark">
    <div class="ed__down" aria-hidden="true"><span>${esc(s.down)}</span><span>${esc(s.down)}</span></div>
    <div class="ed__across" aria-hidden="true"><span>${esc(s.across)}</span><span>${esc(s.across)}</span></div>
    <div class="ed__top rv">
      <img class="ed__wm" src="assets/brand/haavn-wordmark-black.png" alt="HAAVN">
      <div class="mark"><i>//</i>${esc(s.mark)}</div>
    </div>
    <div class="ed__main rv">
      <h2 class="ed__h">${s.h}</h2>
      <div class="ed__col">
        <p class="ed__lede">${esc(s.lede)}</p>
        <div class="ed__sig"><span>${esc(s.sig[0])}</span><span>${esc(s.sig[1])}</span></div>
      </div>
    </div>
  </section>`;

R.thanks = s => `<section class="slide bleed emb cover-emb" data-t="cover">
    <iframe src="cover.html?m=thanks" title="Thank you" allow="autoplay"></iframe>
  </section>`;

R.video = s => `<section class="slide bleed vid${s.cinema ? ' cinema' : ''}" data-t="dark">
    <video src="${esc(s.src)}" ${s.poster ? `poster="${esc(s.poster)}"` : ''} playsinline
           ${s.loop !== false ? 'loop' : ''} ${s.muted !== false ? 'muted' : ''} preload="auto"></video>
    ${s.score ? `<iframe class="score" data-src="assets/landing/score.html" title="Score" allow="autoplay"></iframe>` : ''}
    ${s.cinema ? '' : `<div class="vid__sc"></div>
    <div class="vid__tx">
      ${markup(s.mark)}
      <h3 class="h3">${esc(s.h)}</h3>
      ${s.p ? `<p>${esc(s.p)}</p>` : ''}
    </div>
    <div class="vid__ctl">
      <button class="vbtn" data-act="play">Play film</button>
      <button class="vbtn" data-act="restart">From the start</button>
    </div>`}
  </section>`;

R.live = s => `<section class="slide bleed live" data-t="dark">
    <iframe data-src="${esc(s.src)}" title="${esc(s.title)}" allow="autoplay; fullscreen"></iframe>
  </section>`;

R.broch = s => `<section class="slide bleed broch" data-t="dark" data-pg="${esc(s.pg)}">
  </section>`;

/* The brochure is shown from its own HTML rather than a flattened image: the
   PDF was printed by Chrome and its photographs do not survive rasterising on
   macOS. One iframe is shared and moved to whichever page is on screen. */
const brochFrame = () => document.getElementById('brochFrame');
function showBrochure(page){
  const f = brochFrame();
  f.classList.add('on');
  f.dataset.page = page;
  paintBrochure(page);
}
function hideBrochure(){ const f = brochFrame(); if (f) f.classList.remove('on'); }
function paintBrochure(page){
  const f = brochFrame(), d = f && f.contentDocument;
  if (!d) return;
  const pages = d.querySelectorAll('.pg');
  if (!pages.length) return;                      // not loaded yet; the load handler retries
  if (!d.body.dataset.fitted){
    const st = d.createElement('style');
    st.textContent = 'html,body{margin:0;padding:0;overflow:hidden;background:#0c0c0c}' +
      '.pg{display:none!important}' +
      '.pg.show{display:block!important;position:fixed;left:50%;top:50%;' +
      'transform:translate(-50%,-50%) scale(var(--fit,1));transform-origin:center center;margin:0}';
    d.head.appendChild(st);
    d.body.dataset.fitted = '1';
  }
  pages.forEach((pg, i) => pg.classList.toggle('show', i === page));
  const cur = pages[page];
  if (!cur) return;
  cur.style.setProperty('--fit', 1);
  requestAnimationFrame(() => {
    const r = cur.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const f2 = Math.min(d.documentElement.clientWidth / (r.width || 1),
                        d.documentElement.clientHeight / (r.height || 1));
    cur.style.setProperty('--fit', f2);
  });
}

/* ── render + navigate ─────────────────────────────────────────────────── */
function render(keep){
  $('#deck').innerHTML = SLIDES.map(s =>
    R[s.type] ? R[s.type](s) : `<section class="slide" data-t="light"><p class="body">Unknown slide: ${esc(s.type)}</p></section>`
  ).join('');
  $('#ft').textContent = p2(SLIDES.length);
  $('#deck').querySelectorAll('[data-go]').forEach(n =>
    n.addEventListener('click', e => { e.stopPropagation(); go(+n.dataset.go); }));
  buildThumbs();
  go(keep || 0, true);
  SLIDES.forEach(s => [s.src, s.image].filter(Boolean).forEach(u => {
    if (/\.(jpg|png|webp)$/i.test(u)) { const i = new Image(); i.src = u; }
  }));
}

function go(n, silent){
  const els = document.querySelectorAll('#deck .slide');
  if (!els.length) return;
  idx = Math.max(0, Math.min(n, els.length - 1));
  els.forEach((e, i) => e.classList.toggle('on', i === idx));

  const cur = SLIDES[idx], t = els[idx].dataset.t || 'light';
  $('#stage').setAttribute('data-t', t);
  $('#stage').classList.toggle('is-live', cur.type === 'live' || cur.type === 'thanks' || cur.type === 'editorial' || !!cur.cinema);
  $('#fn').textContent = p2(idx + 1);
  $('#run').textContent = [MEETING.title + ' · ' + MEETING.audience, cur.section].filter(Boolean).join('  //  ');
  $('#prog').style.width = (idx / Math.max(1, els.length - 1) * 100) + '%';
  $('#notesBody').textContent = cur.notes || 'No notes for this slide.';
  document.querySelectorAll('.th').forEach((x, i) => x.classList.toggle('cur', i === idx));
  countUp(els[idx]);
  if (cur.type === 'score') runScore(els[idx]);
  if (cur.type === 'mip' || cur.type === 'crm') runCount(els[idx]);
  document.querySelectorAll('#deck video').forEach(v => v.pause());
  cur.type === 'broch' ? showBrochure(cur.pg) : hideBrochure();
  document.querySelectorAll('#deck iframe[data-src]').forEach(f => {
    const here = f.closest('.slide') === els[idx];
    if (here && f.getAttribute('src') !== f.dataset.src){
      f.onload = () => { forwardKeys(f); startLiveSound(f); };
      f.src = f.dataset.src;
    } else if (!here && f.getAttribute('src') && f.getAttribute('src') !== 'about:blank'){
      f.src = 'about:blank';
    }
  });

  if (cur.type === 'video') wireVideo(els[idx], cur);
  if (!silent) history.replaceState(null, '', '#' + (idx + 1));
}

function startLiveSound(f){
  try { const hb = f.contentWindow && f.contentWindow.__hbSound; if (hb) hb.start(); } catch(e){}
}
/* keys pressed inside a same-origin frame still drive the deck */
function forwardKeys(f){
  try {
    const w = f.contentWindow;
    if (!w || w.__deckKeys) return;
    w.__deckKeys = true;
    w.addEventListener('keydown', onKey);
  } catch(e){}
}

function wireVideo(el, cur){
  const v = el.querySelector('video'); if (!v) return;
  const play = el.querySelector('[data-act="play"]'), again = el.querySelector('[data-act="restart"]');
  const sync = () => { if (play) play.textContent = v.paused ? 'Play film' : 'Pause film'; };
  if (play) play.onclick = e => { e.stopPropagation(); v.paused ? v.play() : v.pause(); };
  if (again) again.onclick = e => { e.stopPropagation(); v.currentTime = 0; v.play(); };
  v.onplay = sync; v.onpause = sync; sync();
  if (cur.autoplay) v.play().catch(()=>{});
}

/* the scoreboard: each number rolls up like a stadium board, then kicks */
function runScore(slide){
  slide.querySelectorAll('[data-to]').forEach((el, i) => {
    const to = +el.dataset.to, isHero = !!el.closest('.sb__big');
    const delay = isHero ? 250 : 900 + i * 260, dur = isHero ? 2200 : 1500;
    el.textContent = '0';
    const box = el.closest('.sb__big, .sb__cell');
    box && box.classList.remove('kick');
    setTimeout(() => {
      const t0 = performance.now();
      const tick = now => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        el.textContent = Math.round(to * e).toLocaleString('en-AU');
        if (k < 1) requestAnimationFrame(tick);
        else { el.textContent = to.toLocaleString('en-AU'); box && box.classList.add('kick'); }
      };
      requestAnimationFrame(tick);
    }, delay);
  });
}

/* metrics animate up on arrival */
function countUp(slide){
  slide.querySelectorAll('[data-count]').forEach(el => {
    const raw = el.dataset.count, target = parseFloat(raw.replace(/,/g, ''));
    if (isNaN(target)) return;
    const unit = el.querySelector('s'), dec = (raw.split('.')[1] || '').length;
    const t0 = performance.now(), dur = 900;
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      const val = (target * e).toFixed(dec);
      el.firstChild.nodeValue = Number(val).toLocaleString(undefined, {minimumFractionDigits: dec});
      if (k < 1) requestAnimationFrame(tick);
      else el.firstChild.nodeValue = raw;
    };
    if (unit) requestAnimationFrame(tick);
  });
}

const next = () => go(idx + 1);
const prev = () => go(idx - 1);

function buildThumbs(){
  $('#thumbs').innerHTML = SLIDES.map((s, i) => `<div class="th" data-i="${i}">
      <b>${p2(i + 1)}</b>
      <span>${esc(s.title || (s.type === 'cover' ? MEETING.title : s.type))}</span>
      <i>${esc(s.section || s.type)}</i>
    </div>`).join('');
  $('#thumbs').querySelectorAll('.th').forEach(t =>
    t.addEventListener('click', () => { go(+t.dataset.i); closeOv(); }));
}
const closeOv = () => { $('#ovGrid').classList.remove('on'); $('#ovHelp').classList.remove('on'); };
const toggleOv = id => { const o = $(id), was = o.classList.contains('on'); closeOv(); if (!was) o.classList.add('on'); };

function fit(){
  document.documentElement.style.setProperty('--s',
    Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
}
window.addEventListener('resize', fit); fit();

function onKey(e){
  const k = e.key;
  if (k === 'Escape'){ closeOv(); $('#black').classList.remove('on'); return; }
  if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'ArrowDown'){ e.preventDefault(); next(); }
  else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp'){ e.preventDefault(); prev(); }
  else if (k === 'Home') go(0);
  else if (k === 'End') go(SLIDES.length - 1);
  else if (k === 'g' || k === 'G' || k === 'c' || k === 'C') toggleOv('#ovGrid');
  else if (k === '?' || k === '/') toggleOv('#ovHelp');
  else if (k === 'n' || k === 'N'){ notesOpen = !notesOpen; $('#notes').classList.toggle('on', notesOpen); }
  else if (k === 'b' || k === 'B') $('#black').classList.toggle('on');
  else if (k === 'v' || k === 'V'){
    const v = document.querySelector('#deck .slide.on video');
    if (v) v.paused ? v.play() : v.pause();
  }
  else if (k === 'f' || k === 'F'){
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(()=>{});
  }
}
document.addEventListener('keydown', onKey);
$('#bNext').addEventListener('click', e => { e.stopPropagation(); next(); });
$('#bPrev').addEventListener('click', e => { e.stopPropagation(); prev(); });
$('#bGrid').addEventListener('click', e => { e.stopPropagation(); toggleOv('#ovGrid'); });

document.addEventListener('click', e => {
  if (e.target.closest('.ov') || e.target.closest('.cright') || e.target.closest('.nav') ||
      e.target.closest('.notes') || e.target.closest('[data-go]') || e.target.closest('iframe') ||
      e.target.closest('.mq__lines') || e.target.closest('.vid__ctl') || e.target.closest('.live__snd') || e.target.closest('video')) return;
  if ($('#ovGrid').classList.contains('on') || $('#ovHelp').classList.contains('on')) return;
  next();
});

let tx = 0;
document.addEventListener('touchstart', e => tx = e.changedTouches[0].clientX, {passive:true});
document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - tx;
  if (Math.abs(dx) > 60) dx < 0 ? next() : prev();
}, {passive:true});

(function boot(){
  const bf = document.getElementById('brochFrame');
  bf.addEventListener('load', () => { forwardKeys(bf); paintBrochure(+bf.dataset.page || 0); });
  bf.src = 'assets/brochure-html/index.html';
  SLIDES = buildSlides();
  render();
  document.querySelectorAll('#deck .cover-emb iframe').forEach(f => f.addEventListener('load', () => forwardKeys(f)));
  const start = parseInt(location.hash.replace('#', ''), 10);
  if (start > 1) go(start - 1);
  setTimeout(() => $('#toast').classList.add('gone'), 5200);
})();
