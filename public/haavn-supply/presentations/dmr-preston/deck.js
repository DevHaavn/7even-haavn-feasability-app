/* HAAVN · Detailed Modular Review deck engine.
   1920 x 1080 stage scaled to fit. Build steps (the arrow keys step through a slide, then move on), animated counters, bars and
   drawn lines, plan layers that light one design principle at a time, and presenter tools: laser, pen, spotlight, zoom, notes with
   a timer, overview, section menu, blackout, full screen. ?print lays every slide out finished for PDF. #12 or #12.3 opens slide 12 (at step 3). */
(function () {
  'use strict';
  var D = document, root = D.documentElement;
  var q = location.search, print = /[?&]print\b/.test(q), still = /[?&]still\b/.test(q);
  var framed = false; try { framed = window.parent !== window; } catch (e) { framed = true; }
  var fromHub = /\/haavn-supply\/presentations\//.test(location.pathname);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var presenter = /[?&]presenter\b/.test(q), applying = false, pw = null;
  if (presenter) root.classList.add('presenter');
  if (print) root.classList.add('print');
  if (still || print) { var st0 = D.createElement('style'); st0.textContent = '*{transition:none!important;animation:none!important}'; D.head.appendChild(st0); }
  if (framed || fromHub) root.classList.add('canclose');
  var $ = function (s, r) { return (r || D).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || D).querySelectorAll(s)); };
  var stage = $('#stage'), S = $$('.slide'), N = S.length, cur = -1, step = 0, SM = [], WM = stage.getAttribute('data-wm'), BACK = stage.getAttribute('data-back') || '../../index.html#/presentations';
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  var fmt = {}; function nf(d) { return fmt[d] || (fmt[d] = new Intl.NumberFormat('en-AU', { minimumFractionDigits: d, maximumFractionDigits: d })); }

  /* ── rails ── */
  function rails() {
    S.forEach(function (sl, i) {
      var sec = sl.getAttribute('data-sec') || '', cover = sl.classList.contains('cover');
      var t = D.createElement('div'); t.className = 'rail top';
      t.innerHTML = cover ? '<span></span><span><span class="x" data-x role="button" tabindex="0">&#10005;&nbsp; Close</span></span>'
        : '<span class="l"><img class="wm" src="' + WM + '" alt="HAAVN"><i class="bar"></i><span>Detailed Modular Review</span></span><span>1&ndash;3 Newman Street, Preston<span class="x" data-x role="button" tabindex="0" style="margin-left:26px">&#10005;&nbsp; Close</span></span>';
      if (cover) { t.style.borderBottom = '0'; t.style.top = '40px'; }
      sl.appendChild(t);
      var b = D.createElement('div'); b.className = 'rail bot';
      b.innerHTML = '<span>Prepared for 7EVEN Capital &middot; October 2026</span><span class="ln"><i></i></span><span>' + (sec ? sec + ' &nbsp; ' : '') + '<b>' + pad(i + 1) + '</b> / ' + pad(N) + '</span>';
      sl.appendChild(b);
    });
  }
  /* ── steps ── */
  S.forEach(function (s, i) { var m = 0; $$('[data-s]', s).forEach(function (e) { m = Math.max(m, +e.getAttribute('data-s')); }); var d = s.getAttribute('data-steps'); SM[i] = d ? +d : m; });
  function visible(el, sl) { for (var p = el; p && p !== sl; p = p.parentElement) { if ((p.classList.contains('st') || p.classList.contains('stl')) && !p.classList.contains('seen')) return false; } return true; }
  function setStep(s, quiet) {
    step = Math.max(0, Math.min(SM[cur], s)); var sl = S[cur];
    $$('[data-s]', sl).forEach(function (e) { e.classList.toggle('seen', +e.getAttribute('data-s') <= step); });
    $$('[data-is]', sl).forEach(function (e) { e.classList.toggle('is', e.getAttribute('data-is').split(',').indexOf('' + step) >= 0); });
    plans(sl); refresh(sl);
    var h = HK[sl.getAttribute('data-hook')]; if (h && h.step) h.step(sl, step);
    var ln = $('.rail.bot .ln i', sl); if (ln) ln.style.width = Math.round(((cur + (SM[cur] ? step / SM[cur] : 1)) / N) * 100) + '%';
    notes(); broadcast(); nextPreview();
    if (!quiet && history.replaceState) history.replaceState(null, '', '#' + (cur + 1) + (step ? '.' + step : ''));
  }
  /* ── reveal: counters, bars, drawn lines ── */
  function refresh(sl) {
    $$('[data-anim]', sl).forEach(function (e) {
      var v = visible(e, sl);
      if (v && !e.classList.contains('rev')) { e.classList.add('rev'); onRev(e); }
    });
  }
  function onRev(e) {
    if (e.hasAttribute('data-count')) count(e);
    if (e.hasAttribute('data-draw')) { e.style.strokeDashoffset = 0; }
  }
  function count(e) {
    var to = parseFloat(e.getAttribute('data-count')), dec = +(e.getAttribute('data-dec') || 0), pre = e.getAttribute('data-pre') || '', suf = e.getAttribute('data-suf') || '', neg = e.getAttribute('data-sign');
    var fin = function (v) { e.textContent = (neg && v > 0 ? neg : '') + pre + nf(dec).format(v) + suf; };
    if (still || print || reduce) { fin(to); return; }
    var t0 = performance.now(), dur = +(e.getAttribute('data-dur') || 1500);
    (function f(now) { var k = Math.min(1, (now - t0) / dur); k = 1 - Math.pow(1 - k, 3); fin(to * k); if (k < 1) requestAnimationFrame(f); else fin(to); })(t0);
  }
  function resetAnims(sl) {
    $$('[data-anim]', sl).forEach(function (e) {
      e.classList.remove('rev');
      if (e.hasAttribute('data-count')) { var dec = +(e.getAttribute('data-dec') || 0); e.textContent = (e.getAttribute('data-pre') || '') + nf(dec).format(0) + (e.getAttribute('data-suf') || ''); }
      if (e.hasAttribute('data-draw')) { var L = e.getTotalLength ? e.getTotalLength() : 0; e.style.strokeDasharray = L; e.style.strokeDashoffset = L; }
    });
  }
  function finishAll(sl) { $$('[data-anim]', sl).forEach(function (e) { e.classList.add('rev'); if (e.hasAttribute('data-count')) { var dec = +(e.getAttribute('data-dec') || 0); e.textContent = (e.getAttribute('data-pre') || '') + nf(dec).format(parseFloat(e.getAttribute('data-count'))) + (e.getAttribute('data-suf') || ''); } if (e.hasAttribute('data-draw')) { e.style.strokeDasharray = 'none'; e.style.strokeDashoffset = 0; } }); }
  /* ── plans: the lit principle shows in colour, the rest of the plan goes quiet ── */
  function plans(sl) {
    var act = $('.is[data-lit],.is[data-show]', sl), lit = act && act.getAttribute('data-lit') ? act.getAttribute('data-lit').split(',') : null, show = act && act.getAttribute('data-show');
    $$('.plan', sl).forEach(function (p) {
      var id = p.getAttribute('data-plan'), on = show ? id === show : p.hasAttribute('data-default');
      p.classList.toggle('on', on); p.classList.toggle('all', !lit);
      $$('.lay', p).forEach(function (l) { var k = l.getAttribute('data-k'); l.classList.toggle('lit', !!lit && lit.indexOf(k) >= 0); l.classList.toggle('dim', !!lit && lit.indexOf(k) < 0); });
    });
    $$('.lg', sl).forEach(function (l) { var k = l.getAttribute('data-k'); l.classList.toggle('lit', !!lit && lit.indexOf(k) >= 0); l.classList.toggle('dim', !!lit && lit.indexOf(k) < 0); });
  }
  /* ── slide change ── */
  var HK = {};
  function cmd(c, n) { try { if (window.opener) window.opener.postMessage({ t: 'cmd', c: c, n: n }, '*'); } catch (e) {} }
  function broadcast() { try { if (pw && !pw.closed) pw.postMessage({ t: 'state', cur: cur, step: step }, '*'); } catch (e) {} }
  function openPresenter() {
    if (pw && !pw.closed) { pw.focus(); return; }
    pw = window.open(location.href.split('#')[0].replace(/\?.*$/, '') + '?presenter', 'dmr-presenter', 'width=1500,height=860');
    setTimeout(broadcast, 900);
  }
  function go(n, at, quiet) {
    n = Math.max(0, Math.min(N - 1, n)); if (n === cur) return;
    if (presenter && window.opener && !applying) { cmd('go', n); return; }
    var old = cur >= 0 ? S[cur] : null;
    if (old) { var hk = HK[old.getAttribute('data-hook')]; if (hk && hk.leave) hk.leave(old); unzoom(old); }
    S.forEach(function (s, i) { s.classList.toggle('on', i === n); });
    cur = n; var sl = S[n];
    $$('[data-s]', sl).forEach(function (e) { e.classList.remove('seen'); });
    resetAnims(sl);
    var h = HK[sl.getAttribute('data-hook')]; if (h && h.enter) h.enter(sl);
    setStep(at === 'end' ? SM[n] : (at || 0), quiet);
    document.title = (sl.getAttribute('data-title') || 'Detailed Modular Review') + ' · HAAVN';
    if (still || print) finishAll(sl);
    sections();
  }
  function next() { if (presenter && window.opener && !applying) { cmd('next'); return; } if (step < SM[cur]) setStep(step + 1); else go(cur + 1); }
  function prev() { if (presenter && window.opener && !applying) { cmd('prev'); return; } if (step > 0) setStep(step - 1); else go(cur - 1, 'end'); }
  function closeMe() { if (framed) { try { window.parent.postMessage('haavn-ds-close', '*'); } catch (e) {} } else if (fromHub) location.href = BACK; }
  function fit() { if (print) return; if (presenter) { stage.style.setProperty('--sc', Math.min(innerWidth * .6 / 1920, (innerHeight - 20) / 1080)); nextPreview(); return; } stage.style.setProperty('--sc', Math.min(innerWidth / 1920, innerHeight / 1080)); }
  function sc() { return parseFloat(getComputedStyle(stage).getPropertyValue('--sc')) || 1; }
  function sp(e) { var r = stage.getBoundingClientRect(), k = sc(); return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; }

  /* ── tools ── */
  var tools = {};
  function flag(n, on) { root.classList.toggle('t-' + n, on); var b = $('#toolbar [data-t="' + n + '"]'); if (b) b.classList.toggle('on', on); tools[n] = on; }
  function toggle(n) {
    var ex = { laser: 1, spot: 1, pen: 1 }, ov = { ov: 1, sec: 1, help: 1 };
    var on = !tools[n];
    if (ex[n] && on) Object.keys(ex).forEach(function (k) { flag(k, false); });
    if (ov[n] && on) Object.keys(ov).forEach(function (k) { flag(k, false); });
    flag(n, on);
    if (n === 'ov' && on) overview(); if (n === 'sec' && on) sections(); if (n === 'notes' && on) { startTimer(); notes(); }
    if (n === 'black') root.classList.toggle('t-black', on);
  }
  var timer = { t0: 0, run: false };
  function startTimer(reset) { if (reset || !timer.run) { timer.t0 = Date.now(); timer.run = true; } }
  setInterval(function () { var e = $('#tm'); if (e && timer.run) { var s = Math.floor((Date.now() - timer.t0) / 1000); e.textContent = pad(Math.floor(s / 60)) + ':' + pad(s % 60); } }, 500);
  function notes() {
    var n1 = $('#nt'), nx = $('#nx'); if (!n1 || cur < 0) return;
    var sl = S[cur], nn = $('.notes', sl);
    n1.innerHTML = nn ? nn.innerHTML : '<ul><li>No notes for this slide.</li></ul>';
    $('#ns').textContent = 'Slide ' + (cur + 1) + ' of ' + N + (SM[cur] ? ' · step ' + step + ' of ' + SM[cur] : '');
    nx.textContent = cur + 1 < N ? S[cur + 1].getAttribute('data-title') : 'End';
  }
  function nextPreview() {
    var box = $('#nxt'); if (!box || !presenter) return;
    box.innerHTML = '';
    if (cur + 1 >= N) { box.textContent = 'End of the deck'; return; }
    var h = D.createElement('div'); h.className = 'in'; var cl = S[cur + 1].cloneNode(true); $$('canvas', cl).forEach(function (c) { c.remove(); }); cl.classList.add('on'); h.appendChild(cl); box.appendChild(h);
    h.style.transform = 'scale(' + (box.clientWidth / 1920) + ')';
  }
  function sections() {
    var box = $('#sections'); if (!box) return;
    var list = [], last = null;
    S.forEach(function (s, i) { var n = s.getAttribute('data-sec') || ''; if (n !== last) { list.push({ n: n || 'Opening', i: i, c: 0 }); last = n; } list[list.length - 1].c++; });
    box.innerHTML = '<h5>Jump to a section</h5>' + list.map(function (e, k) { var on = cur >= e.i && (k + 1 >= list.length || cur < list[k + 1].i); return '<a data-go="' + e.i + '" class="' + (on ? 'cur' : '') + '">' + e.n + '<span>' + pad(e.i + 1) + (e.c > 1 ? ' &ndash; ' + pad(e.i + e.c) : '') + '</span></a>'; }).join('');
  }
  var ovBuilt = false;
  function overview() {
    var box = $('#ov'); if (!ovBuilt) { ovBuilt = true; }
    var html = '', last = null;
    S.forEach(function (s, i) { var n = s.getAttribute('data-sec') || 'Opening'; if (n !== last) { html += (last !== null ? '</div>' : '') + '<h5>' + n + '</h5><div class="g">'; last = n; } html += '<div class="ovt' + (i === cur ? ' cur' : '') + '" data-go="' + i + '"><div class="in" data-i="' + i + '"></div><em>' + pad(i + 1) + '</em></div>'; });
    box.innerHTML = html + '</div>';
    $$('.ovt .in', box).forEach(function (h) { var i = +h.getAttribute('data-i'), cl = S[i].cloneNode(true); $$('canvas', cl).forEach(function (c) { c.remove(); }); cl.classList.add('on'); h.appendChild(cl); var w = h.parentElement.clientWidth; h.style.transform = 'scale(' + (w / 1920) + ')'; });
    var c = $('.ovt.cur', box); if (c) c.scrollIntoView({ block: 'center' });
  }
  /* pen */
  var penCol = 0, PC = ['#C6DC2A', '#ffffff', '#ff5b4d'], drawing = false, lp = null;
  function penCanvas() { var sl = S[cur], c = $('.pencv', sl); if (!c) { c = D.createElement('canvas'); c.className = 'pencv'; c.width = 1920; c.height = 1080; c.style.cssText = 'position:absolute;inset:0;width:1920px;height:1080px;z-index:55;pointer-events:none'; sl.appendChild(c); } return c; }
  function penDraw(e) {
    var p = sp(e), c = penCanvas(), x = c.getContext('2d'); x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = 6; x.strokeStyle = PC[penCol]; x.shadowColor = PC[penCol]; x.shadowBlur = 10;
    x.beginPath(); x.moveTo(lp.x, lp.y); x.lineTo(p.x, p.y); x.stroke(); lp = p;
  }
  function clearPen() { var c = $('.pencv', S[cur]); if (c) c.getContext('2d').clearRect(0, 0, 1920, 1080); }
  /* zoom: click a plan to look closer, move to pan, click or Esc to return */
  function unzoom(sl) { $$('.planbox.zoomed', sl || D).forEach(function (b) { b.classList.remove('zoomed'); var z = $('.zi', b); z.style.transform = ''; }); }
  D.addEventListener('mousemove', function (e) {
    var b = e.target.closest && e.target.closest('.planbox.zoomed');
    if (b) { var r = b.getBoundingClientRect(), z = $('.zi', b); z.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%'; }
    var p = sp(e), L = $('#laser'), sl = $('#spot');
    if (L) { L.style.left = p.x + 'px'; L.style.top = p.y + 'px'; }
    if (sl) { sl.style.setProperty('--mx', p.x + 'px'); sl.style.setProperty('--my', p.y + 'px'); }
    if (drawing && tools.pen) penDraw(e);
    tbShow();
  });
  D.addEventListener('mousedown', function (e) { if (tools.pen && !e.target.closest('#toolbar')) { drawing = true; lp = sp(e); penDraw(e); e.preventDefault(); } });
  D.addEventListener('mouseup', function () { drawing = false; });
  var tbT = 0; function tbShow() { var t = $('#toolbar'); if (!t) return; t.classList.remove('hide'); clearTimeout(tbT); tbT = setTimeout(function () { if (!tools.notes && !tools.ov) t.classList.add('hide'); }, 2600); }

  /* ── components ── */
  var field = { cv: null, on: false, t: 0, dark: false };
  function fieldDraw(c, dark, t) {
    var x = c.getContext('2d'), W = c.width, H = c.height; x.clearRect(0, 0, W, H);
    x.lineWidth = 1; var rows = 64;
    for (var f = 0; f < 2; f++) {
      var a = f ? 0.52 : -0.5;                        // two families of lines crossing at a shallow angle
      x.beginPath();
      for (var i = -rows; i < rows * 2; i++) {
        var off = i * (H / rows) * (f ? 1.25 : 1);
        x.moveTo(-40, off + Math.sin(t * .0003 + i * .12 + f) * 14);
        for (var px = 0; px <= W + 40; px += 40) {
          var wave = Math.sin(px * .0042 + t * .00035 + i * .05 + f * 2) * 26 + Math.sin(px * .0013 - t * .00022 + f) * 44;
          x.lineTo(px, off + px * a + wave);
        }
      }
      x.strokeStyle = dark ? (f ? 'rgba(198,220,42,.10)' : 'rgba(198,220,42,.18)') : (f ? 'rgba(98,102,88,.10)' : 'rgba(98,102,88,.17)');
      x.stroke();
    }
  }
  var fieldRaf = 0;
  function fieldRun(sl) {
    var c = $('canvas.fieldc', sl); if (!c) return; var dark = sl.classList.contains('dk');
    c.width = 960; c.height = 540; cancelAnimationFrame(fieldRaf);
    if (reduce || print) { fieldDraw(c, dark, 4000); return; }
    (function f(now) { fieldDraw(c, dark, now); fieldRaf = requestAnimationFrame(f); })(performance.now());
  }
  HK.field = { enter: fieldRun, leave: function () { cancelAnimationFrame(fieldRaf); } };
  /* the build approach: a traditional base, then the modules stack level by level */
  var bt = [];
  HK.build = {
    enter: function (sl) { $$('.bsvg .lv', sl).forEach(function (e) { if (+e.getAttribute('data-k') !== 0) e.classList.remove('in'); }); },
    leave: function () { bt.forEach(clearTimeout); bt = []; },
    step: function (sl, s) {
      bt.forEach(clearTimeout); bt = [];
      var lv = $$('.bsvg .lv', sl);
      lv.forEach(function (e) {
        var k = +e.getAttribute('data-k'); if (k === 0) { e.classList.add('in'); return; }
        if (s < 1) { e.classList.remove('in'); return; }
        var at = k === 99 ? 160 + 15 * 130 : 160 + k * 130;
        if (still || print || s > 1) e.classList.add('in'); else { e.classList.remove('in'); bt.push(setTimeout(function () { e.classList.add('in'); }, at)); }
      });
    }
  };
  /* the ship: a vessel moves stop to stop along the route as each stage lights */
  HK.ship = {
    step: function (sl, s) {
      var v = $('#vessel', sl); if (!v) return;
      var x = s < 1 ? 70 : 216 + (s - 1) * 432;
      v.style.transform = 'translate(' + x + 'px,56px)';
    }
  };
  /* 400 apartments as a field of dots, filled one product type at a time */
  HK.dots = {
    enter: function (sl) {
      var d = $('#dots', sl); if (!d.children.length) { for (var i = 0; i < 400; i++) d.appendChild(D.createElement('i')); }
      $$('i', d).forEach(function (e) { e.style.background = ''; });
    },
    step: function (sl, s) {
      var d = $('#dots', sl), mix = d.getAttribute('data-mix').split(',').map(Number), cols = d.getAttribute('data-cols').split(','), dots = $$('i', d), n = 0;
      mix.forEach(function (m, k) { for (var j = 0; j < m; j++) { var e = dots[n++]; if (!e) continue; var on = s >= k + 1; e.style.transitionDelay = (j * 6) + 'ms'; e.style.background = on ? cols[k] : ''; } });
    }
  };
  /* tabs and thumbs (gallery slides) */
  D.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]'); if (!b) return;
    var sl = b.closest('.slide'), g = b.getAttribute('data-tab'), id = b.getAttribute('data-id');
    $$('[data-tab="' + g + '"]', sl).forEach(function (x) { x.classList.toggle('on', x === b); });
    $$('[data-pane="' + g + '"]', sl).forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-id') === id); });
    e.stopPropagation();
  });

  /* ── events ── */
  var jmp = '';
  D.addEventListener('keydown', function (e) {
    var k = e.key;
    if ((k === 'Enter' || k === ' ') && e.target.closest && e.target.closest('[data-x]')) { e.preventDefault(); closeMe(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[0-9]$/.test(k)) { jmp += k; flag('jump', true); $('#jump').textContent = jmp; return; }
    if (tools.jump && k === 'Enter') { var n = parseInt(jmp, 10); jmp = ''; flag('jump', false); if (!isNaN(n)) go(n - 1); return; }
    if (tools.jump && k === 'Escape') { jmp = ''; flag('jump', false); return; }
    var kl = k.length === 1 ? k.toLowerCase() : k;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter') { e.preventDefault(); if (tools.ov) { toggle('ov'); return; } next(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0); else if (k === 'End') go(N - 1, 'end');
    else if (kl === 'f') { if (D.fullscreenElement) D.exitFullscreen(); else if (root.requestFullscreen) root.requestFullscreen(); }
    else if (kl === 'l') toggle('laser'); else if (kl === 'd') toggle('pen'); else if (kl === 's') toggle('spot');
    else if (kl === 'p') openPresenter();
    else if (kl === 'n') toggle('notes'); else if (kl === 'g') toggle('ov'); else if (kl === 'm') toggle('sec');
    else if (kl === 'b' || kl === '.') toggle('black'); else if (k === '?' || kl === 'h') toggle('help');
    else if (kl === 't') { startTimer(true); }
    else if (kl === 'c' && tools.pen) { penCol = (penCol + 1) % PC.length; }
    else if (kl === 'x' && tools.pen) clearPen();
    else if (k === 'Escape') {
      if (tools.black) toggle('black'); else if (tools.help) toggle('help'); else if (tools.ov) toggle('ov'); else if (tools.sec) toggle('sec');
      else if ($('.planbox.zoomed', S[cur])) unzoom(S[cur]); else if (tools.laser || tools.pen || tools.spot) { flag('laser', false); flag('pen', false); flag('spot', false); }
      else if (!D.fullscreenElement && (framed || fromHub)) closeMe();
    }
  });
  D.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-home]')) { location.href = BACK; return; }
    if (t.closest('[data-x]')) { closeMe(); return; }
    var go1 = t.closest('[data-go]'); if (go1) { var i = +go1.getAttribute('data-go'); flag('ov', false); flag('sec', false); go(i); return; }
    var tb = t.closest('#toolbar button'); if (tb) { var a = tb.getAttribute('data-t'); if (a === 'pres') openPresenter(); else if (a === 'full') { if (D.fullscreenElement) D.exitFullscreen(); else root.requestFullscreen && root.requestFullscreen(); } else toggle(a); tb.blur(); return; }
    if (t.closest('#panel,#ov,#sections,#help,#black')) { if (t.closest('#black')) toggle('black'); if (t.closest('#help')) toggle('help'); return; }
    var pb = t.closest('.planbox');
    if (pb && !tools.pen) { var z = $('.zi', pb), on = !pb.classList.contains('zoomed'); pb.classList.toggle('zoomed', on); if (on) { var r = pb.getBoundingClientRect(); z.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%'; z.style.transform = 'scale(2.6)'; } else z.style.transform = ''; return; }
    if (t.closest('a,button,.tabs,.thumbs') || tools.pen) return;
    if (e.clientX < innerWidth * .16) prev(); else next();
  });
  var x0 = null;
  D.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  D.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 60) { dx < 0 ? next() : prev(); } x0 = null; }, { passive: true });
  addEventListener('resize', fit);
  addEventListener('message', function (e) {
    var m = e.data; if (!m || typeof m !== 'object') return;
    if (m.t === 'state' && presenter) { applying = true; if (m.cur !== cur) go(m.cur, m.step, true); else setStep(m.step, true); applying = false; }
    else if (m.t === 'cmd' && !presenter) { if (m.c === 'next') next(); else if (m.c === 'prev') prev(); else if (m.c === 'go') go(m.n); }
    else if (m.t === 'ready' && !presenter) broadcast();
  });
  addEventListener('hashchange', function () { var m = (location.hash || '').match(/#(\d+)(?:\.(\d+))?/); if (m) { var n = +m[1] - 1, s = +(m[2] || 0); if (n === cur) setStep(s, true); else go(n, s, true); } });

  /* ── start ── */
  rails(); fit();
  if (!framed && fromHub) { $$('.rail.top .l').forEach(function (l) { l.setAttribute('data-home', '1'); l.title = 'Back to HAAVN presentations'; l.style.pointerEvents = 'auto'; l.style.cursor = 'pointer'; }); }
  if (print) { S.forEach(function (s) { s.classList.add('on'); $$('[data-s]', s).forEach(function (e) { e.classList.add('seen'); }); finishAll(s); }); $$('.plan[data-default]').forEach(function (p) { p.classList.add('on', 'all'); }); $$('.bsvg .lv').forEach(function (e) { e.classList.add('in'); }); return; }
  var m = (location.hash || '').match(/#(\d+)(?:\.(\d+))?/);
  applying = true; go(m ? +m[1] - 1 : 0, m ? +(m[2] || 0) : 0, true); applying = false;
  tbShow(); window.focus();
  if (presenter) { try { if (window.opener) window.opener.postMessage({ t: 'ready' }, '*'); } catch (e) {} flag('notes', true); startTimer(); notes(); nextPreview(); }
  window.DMR = { go: go, next: next, prev: prev, setStep: setStep, get cur() { return cur; }, get step() { return step; }, N: N, SM: SM };
})();
