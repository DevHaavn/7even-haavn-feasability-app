/* ATRIUM Chat: HAAVN BLACK Sales on your phone.
   For Jamie and Mike only (the two people who run the HAAVN BLACK sales pipeline from Chat). Signed in as either of them, on a phone, Chat gets:
     - a Sales tab in the bottom bar, with a red badge for how many customers need you, and
     - a "HAAVN BLACK Sales" card at the top of the chat list ("7 need action, 4 waiting on others").
   Either one opens the phone sales app (atrium-sales-mobile.html) as a full panel over Chat, the same way Notes opens, and the Chat tab inside it comes straight back.
   Anyone else signed in sees nothing: the entry is never drawn, and the sales page itself refuses to open in Chat for anyone but these two.
   The numbers come from the same core the sales app uses (atrium-sales-core.js), so the badge always agrees with the Today screen.
   Needs the bridge in atrium-chat.html: window.AtriumChat = { real, me, ... }. */
(function(){
'use strict';
var D=document, C=window.AtriumChat;
if(!C||!D.getElementById('tabbar')||!D.getElementById('groups')) return;
var USERS=['jb','mf'];
function $(s,r){ return (r||D).querySelector(s) }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
var on=false, loading=false, lastLoad=0, counts={need:0,late:0,waiting:0}, tab=null, card=null, ov=null, fr=null, frReady=false;

var css=D.createElement('style');
css.textContent=
 '#salesTab .badge{top:0;right:calc(50% - 24px)}'+
 '#salesCard{display:none;align-items:center;gap:12px;margin:4px 14px 10px;padding:11px 14px 11px 11px;border-radius:18px;border:1px solid rgba(127,211,255,.42);background:rgba(127,211,255,.08);color:var(--bone);text-align:left;width:calc(100% - 28px);font:inherit;cursor:pointer}'+
 '#salesCard.on{display:flex}'+
 '#salesCard .sv{width:42px;height:42px;border-radius:12px;background:#000;display:grid;place-items:center;flex:none}'+
 '#salesCard .sv i{width:22px;height:18px;background:#fff;-webkit-mask:url(/atrium-hb/hvn-blk-device.svg) center/contain no-repeat;mask:url(/atrium-hb/hvn-blk-device.svg) center/contain no-repeat;display:block}'+
 '#salesCard .tx{flex:1;min-width:0}'+
 '#salesCard .tx b{display:block;font-weight:500;font-size:15.5px;line-height:1.25}'+
 '#salesCard .tx small{display:block;font-size:12.5px;color:var(--faint);margin-top:2px}'+
 '#salesCard .tx small .rd{color:#ff8f8f}'+
 '#salesCard .go{color:#7fd3ff;flex:none}'+
 '#salesCard .go svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}'+
 'body.nx-tasks #salesCard,body.in-thread #salesCard{display:none!important}'+
 '#salesOv{position:fixed;inset:0;z-index:210;background:#050607}#salesOv[hidden]{display:none}'+
 '#salesOv iframe{width:100%;height:100%;border:0;display:block;background:#050607}'+
 '@media(min-width:761px){#salesTab,#salesCard{display:none!important}}';
D.head.appendChild(css);

function scheme(){ try{ return window.AtriumScheme?AtriumScheme.get():'dark' }catch(e){ return 'dark' } }
function draw(){
  if(!on) return;
  var n=counts.need;
  if(tab){ var b=$('.badge',tab); if(b){ b.textContent=n>99?'99+':String(n); b.hidden=!n } }
  if(card){ var s=$('.tx small',card); s.innerHTML=(n?esc(n+' need action'):'Nothing waiting on you')+(counts.late?' · <span class="rd">'+esc(counts.late+' late')+'</span>':'')+(counts.waiting?' · '+esc(counts.waiting+' waiting on others'):'') }
}
function build(){
  if(tab) return;
  tab=D.createElement('button'); tab.id='salesTab'; tab.type='button'; tab.setAttribute('data-sales','open');
  tab.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5v14M10 5v10M16 5v14M21 5v8"/></svg><span class="tl">Sales</span><span class="badge" hidden></span>';
  var me=$('#meBtn2'), bar=$('#tabbar'); if(me) bar.insertBefore(tab,me); else bar.appendChild(tab);
  card=D.createElement('button'); card.id='salesCard'; card.type='button'; card.setAttribute('data-sales','open'); card.classList.add('on');
  card.innerHTML='<span class="sv"><i></i></span><span class="tx"><b>HAAVN BLACK Sales</b><small>Opening your sales...</small></span><span class="go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>';
  var list=$('#list'), groups=$('#groups'); if(list&&groups) list.insertBefore(card,groups);
  ov=D.createElement('div'); ov.id='salesOv'; ov.hidden=true; ov.innerHTML='<iframe id="salesFr" title="HAAVN BLACK Sales" allow="microphone" loading="lazy"></iframe>'; D.body.appendChild(ov); fr=$('#salesFr',ov);
}
function load(){
  if(!on||loading||!window.HBS) return; loading=true;
  window.HBS.load().then(function(ok){ loading=false; lastLoad=Date.now(); if(!ok){ off(); return } var c=window.HBS.counts(); counts={need:c.need,late:c.late,waiting:c.waiting}; draw() }).catch(function(){ loading=false });
}
function off(){ on=false; if(tab){ tab.remove(); tab=null } if(card){ card.remove(); card=null } }
/* every open is a fresh load, so what you see is what the server holds right now */
function open(leadId){
  if(!on||!fr) return; ov.hidden=false; frReady=false;
  fr.src='/atrium-sales-mobile.html?embed=chat&sch='+scheme()+'&t='+Date.now()+(leadId?'&lead='+encodeURIComponent(leadId):'');
  fr.onload=function(){ frReady=true };
}
function close(){ if(ov) ov.hidden=true; if(fr){ try{ fr.src='about:blank' }catch(e){} } setTimeout(load,400) }
window.openAtriumSales=open;
D.addEventListener('click',function(e){ if(on&&e.target.closest&&e.target.closest('[data-sales]')){ e.preventDefault(); open() } },true);
window.addEventListener('message',function(e){ var d=e.data; if(!d||!fr||e.source!==fr.contentWindow) return;
  if(d.atriumSales==='close') close();
  else if(d.atriumSales==='counts'){ counts={need:+d.need||0,late:+d.late||0,waiting:+d.waiting||0}; draw() } });
try{ if(window.AtriumScheme) AtriumScheme.onChange(function(s){ if(fr&&fr.contentWindow&&frReady) fr.contentWindow.postMessage({atriumScheme:s},'*') }) }catch(e){}

/* start once Chat knows who is signed in. Only Jamie and Mike ever get past this line. */
function start(){
  if(on||!C.real()||USERS.indexOf(C.me())<0) return false;
  on=true; build();
  var s=D.createElement('script'); s.src='/atrium-sales-core.js?v=1'; s.onload=load; D.head.appendChild(s);
  return true;
}
setTimeout(function(){ if(start()) return; var n=0, iv=setInterval(function(){ n++; if(start()||n>40) clearInterval(iv) },750) },1800);
setInterval(function(){ if(on&&D.visibilityState==='visible'&&ov&&ov.hidden&&Date.now()-lastLoad>120000) load() },30000);
D.addEventListener('visibilitychange',function(){ if(on&&D.visibilityState==='visible'&&ov&&ov.hidden&&Date.now()-lastLoad>45000) load() });
})();
