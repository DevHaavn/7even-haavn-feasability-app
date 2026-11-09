/* ATRIUM Chat: HAAVN BLACK Sales.
   For Jamie and Mike only (the two people who run the HAAVN BLACK sales pipeline from Chat). Signed in as either of them, Chat gets:
     - on a phone: a Sales button in the bottom bar, with a red badge for how many customers are overdue (past their window to be called, qualified, chased or approved), so it is 0 when nothing is late;
     - on a computer: a Sales button in the left bar, under Files (it opens the full pipeline);
     - an "Open in Sales" button on each new-lead message in the HAAVN BLACK Sales channel, which opens that customer.
   Each opens Sales as a full panel over Chat, the same way Notes opens. The phone panel is atrium-sales-mobile.html (its back arrow closes it);
   the computer panel is the desktop pipeline, atrium-sales.html, with a Close button of its own.
   Chat's own address (atrium-chat-7x.vercel.app) only serves the Chat files and sends everything else back to Chat (vercel.json). Sales is allowed
   through there by name: atrium-sales-mobile.html, atrium-sales.html, atrium-sales-core.js, the wordmark and /api/sales. Without that, the panel
   loaded Chat inside itself and came up black.
   Anyone else signed in sees nothing: the entry is never drawn, and the sales page itself refuses to open in Chat for anyone but these two.
   The numbers come from the same core the sales app uses (atrium-sales-core.js), so the badge always agrees with the Today screen.
   Needs the bridge in atrium-chat.html: window.AtriumChat = { real, me, ... }. */
(function(){
'use strict';
var D=document, C=window.AtriumChat;
if(!C||!D.getElementById('tabbar')||!D.getElementById('groups')) return;
var USERS=['jb','mf'];
function $(s,r){ return (r||D).querySelector(s) }
var on=false, loading=false, lastLoad=0, counts={need:0,late:0,waiting:0}, tab=null, rail=null, ov=null, fr=null, frReady=false, alive=false, waitT=0, diagT=0, desk=false;

var css=D.createElement('style');
css.textContent=
 '#salesTab .badge{top:0;right:calc(50% - 24px)}'+
 '#railSales{position:relative}#railSales .badge{position:absolute;top:2px;right:6px}'+
 '#msgs .sysm.hbl{display:flex;flex-direction:column;align-items:flex-start;gap:8px;text-align:left;border-radius:16px;padding:10px 14px;border:1px solid rgba(127,211,255,.35);max-width:92%}'+
 '#msgs .sysm.hbl .hbo{min-height:36px;padding:0 14px;border-radius:99px;border:0;background:#d6b36a;color:#1a1408;font:inherit;font-size:13px;font-weight:500;cursor:pointer}'+
 '#salesOv{position:fixed;inset:0;z-index:210;background:#050607}#salesOv[hidden]{display:none}'+
 '#salesOv iframe{width:100%;height:100%;border:0;display:block;background:#050607}'+
 '#salesX{position:absolute;top:14px;right:18px;z-index:2;display:none;min-height:40px;padding:0 18px;border-radius:99px;border:1px solid rgba(255,255,255,.28);background:rgba(5,6,7,.82);color:#f2f2ef;font:inherit;font-size:14px;cursor:pointer}'+
 '#salesOv.desk #salesX{display:block}'+
 '#salesWait{position:absolute;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));display:none;flex-direction:column;align-items:stretch;gap:10px;padding:18px 16px 16px;text-align:center;background:#101214;border:1px solid rgba(255,255,255,.14);border-radius:20px;color:#f2f2ef;font:inherit;box-shadow:0 20px 60px rgba(0,0,0,.6)}#salesWait.on{display:flex}'+
 '#salesWait b{font-weight:400;font-size:18px;line-height:1.3}#salesWait p{margin:0;color:#9a9da3;font-size:13.5px}'+
 '#salesWait button{min-height:50px;padding:0 18px;border-radius:99px;border:1px solid rgba(255,255,255,.25);background:none;color:#f2f2ef;font:inherit;font-size:15px;cursor:pointer}'+
 '#salesWait button.go{background:#d6b36a;border-color:transparent;color:#1a1408;font-weight:500}'+
 '#salesWait code{display:block;font:11px/1.45 ui-monospace,Menlo,monospace;color:#9a9da3;text-align:left;word-break:break-word;user-select:text;-webkit-user-select:text;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.05)}'+
 '@media(min-width:761px){#salesTab{display:none!important}}'+
 '@media(max-width:760px){#railSales{display:none!important}}';
D.head.appendChild(css);

function scheme(){ try{ return window.AtriumScheme?AtriumScheme.get():'dark' }catch(e){ return 'dark' } }
function draw(){
  if(!on) return;
  var n=counts.late, t=n>99?'99+':String(n);   /* only what is overdue: a customer who is simply waiting their turn does not light the badge */
  [tab,rail].forEach(function(el){ if(!el) return; var b=$('.badge',el); if(b){ b.textContent=t; b.hidden=!n } });
}
function build(){
  if(tab) return;
  var bars='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5v14M10 5v10M16 5v14M21 5v8"/></svg>';
  tab=D.createElement('button'); tab.id='salesTab'; tab.type='button'; tab.setAttribute('data-sales','open');
  tab.innerHTML=bars+'<span class="tl">Sales</span><span class="badge" hidden></span>';
  var me=$('#meBtn2'), bar=$('#tabbar'); if(me) bar.insertBefore(tab,me); else bar.appendChild(tab);
  var rl=$('#rail'), files=$('#railFiles');
  if(rl){
    rail=D.createElement('button'); rail.className='rb'; rail.id='railSales'; rail.type='button'; rail.setAttribute('data-sales','open'); rail.title='Sales'; rail.setAttribute('aria-label','Sales');
    rail.innerHTML=bars+'<span class="lb">Sales</span><span class="badge" hidden></span>';
    if(files&&files.parentNode===rl) rl.insertBefore(rail,files.nextSibling); else rl.appendChild(rail);
  }
  ov=D.createElement('div'); ov.id='salesOv'; ov.hidden=true;
  ov.innerHTML='<iframe id="salesFr" title="HAAVN BLACK Sales" allow="microphone"></iframe><button type="button" id="salesX" data-sw="back">Close Sales</button>'+
    '<div id="salesWait"><b>Sales is taking longer than it should to open.</b><p>Check your signal, then try again. If it keeps happening, send Jess a screenshot of this.</p><code id="salesDiag"></code><button type="button" class="go" data-sw="retry">Try again</button><button type="button" data-sw="own">Open Sales on its own page</button><button type="button" data-sw="back">Back to Chat</button></div>';
  D.body.appendChild(ov); fr=$('#salesFr',ov);
}
function load(){
  if(!on||loading||!window.HBS) return; loading=true;
  window.HBS.load().then(function(ok){ loading=false; lastLoad=Date.now(); if(!ok){ off(); return } var c=window.HBS.counts(); counts={need:c.need,late:c.late,waiting:c.waiting}; draw() }).catch(function(){ loading=false });
}
function off(){ on=false; if(tab){ tab.remove(); tab=null } if(rail){ rail.remove(); rail=null } }

/* Every open is a fresh load, so what you see is what the server holds right now.
   arg: nothing (Today on a phone, the pipeline on a computer), a lead id, or { find: 'Harper Webb', contact: 'their mobile or email' } to open that customer
   (the phone page does that, so it is used for those even on a computer). */
function address(arg){
  var wide=!!(window.matchMedia&&matchMedia('(min-width:761px)').matches), q='';
  if(typeof arg==='string'&&arg) q='&lead='+encodeURIComponent(arg);
  else if(arg&&arg.find) q='&find='+encodeURIComponent(arg.find)+(arg.contact?'&contact='+encodeURIComponent(arg.contact):'');
  desk=wide&&!q;
  return desk?'/atrium-sales.html?embed=1&sch='+scheme()+'&t='+Date.now():'/atrium-sales-mobile.html?embed=chat&sch='+scheme()+'&t='+Date.now()+q;
}
function open(arg){
  if(!on||!fr) return; ov.hidden=false; frReady=false;
  fr.src=address(arg); ov.classList.toggle('desk',desk);
  fr.onload=function(){ frReady=true; if(desk){ alive=true; clearTimeout(waitT); showWait(false) } };
  /* the phone page tells us it is alive as soon as it has drawn anything. If that never comes, say so, with a way out, rather than leave a black panel. */
  alive=desk; clearTimeout(waitT); showWait(false); if(!desk) waitT=setTimeout(function(){ if(!alive&&ov&&!ov.hidden) showWait(true) },7000);
}
/* what the page inside is doing, read straight from it (same origin), so a stuck panel says why */
function diag(){
  try{ var w=fr.contentWindow, d=fr.contentDocument, b=d&&d.getElementById('body'), t=b?(b.innerText||'').replace(/\s+/g,' ').trim().slice(0,70):'';
    return ['frame '+(frReady?'loaded':'not loaded'),'page '+(d?d.readyState:'none'),'core '+(w.HBS?'yes':'no'),'drawn '+(w.__hbsDrawn?'yes':'no'),w.__hbsErr?'error: '+w.__hbsErr:'', t?'shows: '+t:''].filter(Boolean).join(' | ') }
  catch(e){ return 'cannot read the page: '+(e&&e.message) } }
function updWait(){
  try{ var w=fr&&fr.contentWindow; if(w&&w.__hbsDrawn){ alive=true; clearTimeout(waitT); showWait(false); return } }catch(e){}
  var d=D.getElementById('salesDiag'); if(d) d.textContent=diag() }
function showWait(show){ var w=D.getElementById('salesWait'); if(w) w.classList.toggle('on',!!show); clearInterval(diagT); if(show){ updWait(); diagT=setInterval(updWait,1500) } }
function close(){ clearTimeout(waitT); showWait(false); if(ov) ov.hidden=true; if(fr){ try{ fr.src='about:blank' }catch(e){} } setTimeout(load,400) }

/* "Open in Sales" on the new-lead messages in the HAAVN BLACK Sales channel. The server writes them as plain text
   ("New HAAVN BLACK lead for Mike: Harper Webb, SOLUM Plus in Char. QLD. 0412 884 031. Source: Facebook."), so the customer is found again by name and
   their mobile or email, which also works for the messages already in the channel. Chat redraws the whole thread on every change, so this watches it. */
var LEADMSG=/^New HAAVN BLACK lead for (.+?): (.+)$/;
function annotate(){
  if(!on) return;
  var els=D.querySelectorAll('#msgs .sysm:not([data-hbl])');
  for(var i=0;i<els.length;i++){
    var el=els[i], m=LEADMSG.exec(el.textContent||''); el.setAttribute('data-hbl','1'); if(!m) continue;
    var rest=m[2], name=rest.split(',')[0].trim(), em=rest.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/), ph=rest.match(/(?:\+?61|0)[\d\s-]{8,}/);
    if(!name) continue;
    el.classList.add('hbl'); el.setAttribute('data-n',name); el.setAttribute('data-c',em?em[0]:ph?ph[0].trim():'');
    var b=D.createElement('button'); b.type='button'; b.className='hbo'; b.textContent='Open in Sales'; el.appendChild(b);
  }
}
function watch(){ var box=D.getElementById('msgs'); if(!box||watch.done) return; watch.done=true; new MutationObserver(annotate).observe(box,{childList:true}); annotate() }
D.addEventListener('click',function(e){ var b=on&&e.target.closest&&e.target.closest('.hbo'); if(!b) return; var el=b.closest('.sysm'); e.preventDefault(); e.stopPropagation(); open({find:el.getAttribute('data-n'),contact:el.getAttribute('data-c')}) },true);
window.openAtriumSales=open;
D.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-sw]'); if(!b||!ov||!ov.contains(b)) return; e.preventDefault(); e.stopPropagation(); var k=b.getAttribute('data-sw'); if(k==='retry') open(); else if(k==='own'){ location.href=desk?'/atrium-sales.html':'/atrium-sales-mobile.html?embed=chat' } else close() },true);
D.addEventListener('click',function(e){ if(on&&e.target.closest&&e.target.closest('[data-sales]')){ e.preventDefault(); open() } },true);
window.addEventListener('message',function(e){ var d=e.data; if(!d||!fr||e.source!==fr.contentWindow) return;
  if(d.atriumSales==='close') close();
  else if(d.atriumSales==='scheme'){ try{ if(window.AtriumScheme&&!AtriumScheme.follows()) AtriumScheme.set(d.v==='light'?'light':'dark') }catch(er){} }  /* the Dark / Light button inside Sales changes the whole of Chat with it */
  else if(d.atriumSales==='ready'){ alive=true; clearTimeout(waitT); showWait(false) }
  else if(d.atriumSales==='counts'){ counts={need:+d.need||0,late:+d.late||0,waiting:+d.waiting||0}; draw() } });
try{ if(window.AtriumScheme) AtriumScheme.onChange(function(s){ if(fr&&fr.contentWindow&&frReady) fr.contentWindow.postMessage({atriumScheme:s},'*') }) }catch(e){}

/* start once Chat knows who is signed in. Only Jamie and Mike ever get past this line. */
function start(){
  if(on||!C.real()||USERS.indexOf(C.me())<0) return false;
  on=true; build(); watch();
  var s=D.createElement('script'); s.src='/atrium-sales-core.js?v=3'; s.onload=load; D.head.appendChild(s);
  return true;
}
setTimeout(function(){ if(start()) return; var n=0, iv=setInterval(function(){ n++; if(start()||n>40) clearInterval(iv) },750) },1800);
setInterval(function(){ if(on&&D.visibilityState==='visible'&&ov&&ov.hidden&&Date.now()-lastLoad>120000) load() },30000);
D.addEventListener('visibilitychange',function(){ if(on&&D.visibilityState==='visible'&&ov&&ov.hidden&&Date.now()-lastLoad>45000) load() });
})();
