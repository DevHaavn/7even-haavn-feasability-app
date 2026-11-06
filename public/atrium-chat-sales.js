/* ATRIUM Chat: HAAVN BLACK Sales on your phone.
   For Jamie and Mike only (the two people who run the HAAVN BLACK sales pipeline from Chat). Signed in as either of them, on a phone, Chat gets:
     - a Sales tab in the bottom bar, with a red badge for how many customers need you, and
     - an "Open in Sales" button on each new-lead message in the HAAVN BLACK Sales channel, which opens that customer.
   (There is no card at the top of the chat list: the bottom bar button is the one way in.)
   Each opens the phone sales app (atrium-sales-mobile.html) as a page of its own, not in a frame: in the iPhone home-screen Chat the frame came up black, so Sales is opened
   the plain way and its back arrow (or the Chat tab inside it) returns to Chat.
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
var on=false, loading=false, lastLoad=0, counts={need:0,late:0,waiting:0}, tab=null;

var css=D.createElement('style');
css.textContent=
 '#salesTab .badge{top:0;right:calc(50% - 24px)}'+
 '#msgs .sysm.hbl{display:flex;flex-direction:column;align-items:flex-start;gap:8px;text-align:left;border-radius:16px;padding:10px 14px;border:1px solid rgba(127,211,255,.35);max-width:92%}'+
 '#msgs .sysm.hbl .hbo{min-height:36px;padding:0 14px;border-radius:99px;border:0;background:#d6b36a;color:#1a1408;font:inherit;font-size:13px;font-weight:500;cursor:pointer}'+
 '@media(min-width:761px){#salesTab{display:none!important}}';
D.head.appendChild(css);

function scheme(){ try{ return window.AtriumScheme?AtriumScheme.get():'dark' }catch(e){ return 'dark' } }
function draw(){
  if(!on) return;
  var n=counts.need;
  if(tab){ var b=$('.badge',tab); if(b){ b.textContent=n>99?'99+':String(n); b.hidden=!n } }
}
function build(){
  if(tab) return;
  tab=D.createElement('button'); tab.id='salesTab'; tab.type='button'; tab.setAttribute('data-sales','open');
  tab.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5v14M10 5v10M16 5v14M21 5v8"/></svg><span class="tl">Sales</span><span class="badge" hidden></span>';
  var me=$('#meBtn2'), bar=$('#tabbar'); if(me) bar.insertBefore(tab,me); else bar.appendChild(tab);
}
function load(){
  if(!on||loading||!window.HBS) return; loading=true;
  window.HBS.load().then(function(ok){ loading=false; lastLoad=Date.now(); if(!ok){ off(); return } var c=window.HBS.counts(); counts={need:c.need,late:c.late,waiting:c.waiting}; draw() }).catch(function(){ loading=false });
}
function off(){ on=false; if(tab){ tab.remove(); tab=null } }
/* Sales opens as a page of its own: a fresh load every time, so what you see is what the server holds right now.
   arg: nothing (Today), a lead id, or { find: 'Harper Webb', contact: 'their mobile or email' } to open that customer. */
function open(arg){
  if(!on) return;
  var q='';
  if(typeof arg==='string'&&arg) q='&lead='+encodeURIComponent(arg);
  else if(arg&&arg.find) q='&find='+encodeURIComponent(arg.find)+(arg.contact?'&contact='+encodeURIComponent(arg.contact):'');
  location.href='/atrium-sales-mobile.html?embed=chat&sch='+scheme()+'&t='+Date.now()+q;
}

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
D.addEventListener('click',function(e){ if(on&&e.target.closest&&e.target.closest('[data-sales]')){ e.preventDefault(); open() } },true);

/* start once Chat knows who is signed in. Only Jamie and Mike ever get past this line. */
function start(){
  if(on||!C.real()||USERS.indexOf(C.me())<0) return false;
  on=true; build(); watch();
  var s=D.createElement('script'); s.src='/atrium-sales-core.js?v=2'; s.onload=load; D.head.appendChild(s);
  return true;
}
setTimeout(function(){ if(start()) return; var n=0, iv=setInterval(function(){ n++; if(start()||n>40) clearInterval(iv) },750) },1800);
setInterval(function(){ if(on&&D.visibilityState==='visible'&&Date.now()-lastLoad>120000) load() },30000);
D.addEventListener('visibilitychange',function(){ if(on&&D.visibilityState==='visible'&&Date.now()-lastLoad>45000) load() });
/* coming back from Sales by the back arrow can restore Chat as it was, so the badge is refreshed then too */
window.addEventListener('pageshow',function(e){ if(e.persisted&&on) load() });
})();
