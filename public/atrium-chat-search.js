/* ATRIUM Chat: Search.
   One screen that searches everything you can see: messages, tasks, files, notes and meetings. Opens from the magnifier in the chat list header, from Ctrl or Cmd K, from "/" when
   you are not typing, and from the "Search everything" row that appears under the chat list search once you type two letters. Newest first, grouped by day, with the match marked.
   Signed in, it uses ATRIUM's search { q, offset, limit } -> { results, next, total }. On practice data it searches the practice chats in memory.
   Needs the bridge in atrium-chat.html (see atrium-chat-tasks.js). Notes results open through window.openAtriumNotes(meetingId, noteId). */
(function(){
'use strict';
var D=document, B=D.body, C=window.AtriumChat;
if(!C||!D.getElementById('list')) return;
function $(s,r){ return (r||D).querySelector(s) }
function $$(s,r){ return Array.prototype.slice.call((r||D).querySelectorAll(s)) }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
function PHONE(){ return innerWidth<=760 }
function first(id){ var p=C.person(id); return p&&p.n?p.n.split(' ')[0]:'Someone' }
var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function clock(d){ var h=d.getHours()%12||12; return h+':'+String(d.getMinutes()).padStart(2,'0')+' '+(d.getHours()<12?'am':'pm') }
function when(ms){ if(!ms) return ''; var d=new Date(ms), n=new Date(), day=DOW[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()]+(d.getFullYear()!==n.getFullYear()?' '+d.getFullYear():'');
  return d.toDateString()===n.toDateString()?'Today, '+clock(d):day+', '+clock(d) }
function dayLabel(ms){ if(!ms) return 'Undated'; var n=new Date(), a=new Date(n.getFullYear(),n.getMonth(),n.getDate()), d=new Date(ms), b=new Date(d.getFullYear(),d.getMonth(),d.getDate()), k=Math.round((a-b)/86400000);
  if(k<=0) return k<0?'Upcoming':'Today'; if(k===1) return 'Yesterday'; if(k<=6) return 'This week'; if(d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()) return 'Earlier this month'; return MON[d.getMonth()]+' '+d.getFullYear() }
function hl(text,q){ text=String(text==null?'':text); if(!q) return esc(text); var lt=text.toLowerCase(), lq=q.toLowerCase(), out='', i=0, k;
  while((k=lt.indexOf(lq,i))>-1){ out+=esc(text.slice(i,k))+'<mark>'+esc(text.slice(k,k+q.length))+'</mark>'; i=k+q.length } return out+esc(text.slice(i)) }
function snip(text,q){ text=String(text||'').replace(/\s+/g,' ').trim(); var k=text.toLowerCase().indexOf(q.toLowerCase()); if(text.length<=140||k<0) return text.slice(0,140);
  var a=Math.max(0,k-50); return (a?'...':'')+text.slice(a,a+140)+(a+140<text.length?'...':'') }

var KINDS=[['all','All'],['message','Messages'],['task','Tasks'],['file','Files'],['note','Notes'],['meeting','Meetings']];
var NAME={message:'Message',task:'Task',file:'File',note:'Note',meeting:'Meeting'};
function ic(d){ return '<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>' }
var ICON={ message:ic('<path d="M5 6h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-7l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/>'),
  task:ic('<circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'),
  file:ic('<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v4h4"/>'),
  note:ic('<path d="M5 4h14v16H5zM8.5 9h7M8.5 13h7M8.5 17h4"/>'),
  meeting:ic('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>') };
var LENS=ic('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>');

var Q='', F='all', INCHAT=false, rows=[], next=null, total=0, LOADING=false, MORE=false, ERR='', open=false, seq=0, timer=0, sel=-1, shown=[];
var RKEY='atrium-chat-recent-search-v1';
function recent(){ try{ var r=JSON.parse(localStorage.getItem(RKEY)||'[]'); return Array.isArray(r)?r.filter(function(x){ return typeof x==='string' }).slice(0,8):[] }catch(e){ return [] } }
function remember(q){ q=String(q||'').trim(); if(q.length<2) return; try{ var r=recent().filter(function(x){ return x.toLowerCase()!==q.toLowerCase() }); r.unshift(q); localStorage.setItem(RKEY,JSON.stringify(r.slice(0,8))) }catch(e){} }
function forget(q){ try{ localStorage.setItem(RKEY,JSON.stringify(recent().filter(function(x){ return x!==q }))) }catch(e){} }
function forgetAll(){ try{ localStorage.removeItem(RKEY) }catch(e){} }

/* ---------- the screen, inside the chat list ---------- */
var panel=D.createElement('div'); panel.className='nx-panel'; panel.id='nxSearch';
panel.innerHTML='<div class="nx-sbar"><div class="nx-sq">'+LENS+'<input id="nxSIn" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search messages, files, notes and meetings" aria-label="Search everything"><button type="button" class="nx-sx" id="nxSX" aria-label="Clear" hidden>&times;</button><button type="button" class="nx-sc" id="nxSC">Close</button></div><div class="nx-chips" id="nxSF"></div></div><div id="nxSR"></div>';
$('#list').appendChild(panel);
var inp=$('#nxSIn'), chips=$('#nxSF'), res=$('#nxSR');

function setTitle(t){ var lw=$('#listT .lw'); if(lw) lw.textContent=t }
function show(q){
  if(B.classList.contains('nx-tasks')){ var cb=$('#rail [data-v="chat"]'); if(cb) cb.click() }
  if(PHONE()&&B.classList.contains('in-thread')){ var bb=$('#backBtn'); if(bb) bb.click() }
  open=true; B.classList.add('nx-search'); setTitle('Search');
  if(typeof q==='string'&&q!==Q){ Q=q; inp.value=q; F='all'; run(true) }
  syncX(); draw(); try{ inp.focus(); inp.select() }catch(e){} }
function hide(){ if(!open) return; open=false; B.classList.remove('nx-search'); setTitle('Chat') }
function syncX(){ $('#nxSX').hidden=!inp.value }

/* ---------- ways in ---------- */
var hb=D.createElement('button'); hb.type='button'; hb.className='ib'; hb.id='nxSrchBtn'; hb.title='Search everything'; hb.setAttribute('aria-label','Search everything'); hb.innerHTML=LENS;
var snd=$('#sndBtn'); if(snd&&snd.parentNode) snd.parentNode.insertBefore(hb,snd); else $('#list header').appendChild(hb);
hb.addEventListener('click',function(){ open?hide():show() });
D.addEventListener('keydown',function(e){
  var k=e.key, t=e.target, typing=t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable);
  if((e.metaKey||e.ctrlKey)&&(k==='k'||k==='K')&&!e.shiftKey&&!e.altKey){ e.preventDefault(); show(); return }
  if(k==='/'&&!typing&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!D.querySelector('.ov.on')){ e.preventDefault(); show() } });
/* under the chat list search: once two letters are typed, a row that carries the words to everything else */
var glist=$('#groups'), srcIn=$('#search');
function offer(){ if(open||!srcIn||!glist) return; var q=srcIn.value.trim(), old=$('.nx-se',glist);
  if(q.length<2){ if(old) old.remove(); return } var label='Search everything for “'+esc(q)+'”';
  if(old){ if(old.getAttribute('data-q')===q) return; old.remove() }
  var b=D.createElement('button'); b.type='button'; b.className='g nx-se'; b.setAttribute('data-q',q);
  b.innerHTML='<span class="nx-si">'+LENS+'</span><span class="gt"><span class="n"><b>'+label+'</b></span><span class="p">Messages, tasks, files, notes and meetings</span></span>';
  glist.insertBefore(b,glist.firstChild) }
if(glist) new MutationObserver(offer).observe(glist,{childList:true});
if(srcIn) srcIn.addEventListener('input',function(){ setTimeout(offer,0) });
D.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('.nx-se'); if(!b) return; e.stopPropagation(); e.preventDefault(); var q=b.getAttribute('data-q'); srcIn.value=''; srcIn.dispatchEvent(new Event('input',{bubbles:true})); show(q) },true);
/* the rail and the phone tab bar close it; Tasks and the others do their own job */
D.addEventListener('click',function(e){ var t=e.target.closest&&e.target.closest('#rail .rb,#tabbar button'); if(!t) return; if(t.id==='rfBtn'||t.id==='schRail') return; hide() },true);

/* ---------- searching ---------- */
function practice(q){ var lq=q.toLowerCase(), out=[];
  C.activeGroups().forEach(function(g){ C.msgsIn(g.id).forEach(function(m){ if(m.del) return; var t=m.task, gn=C.gname(g);
    if(t&&String(t.title||'').toLowerCase().indexOf(lq)>-1) out.push({kind:'task',gid:g.id,g:gn,mid:m.id,title:t.title,snip:snip(t.title,q),u:m.u,t:m.t});
    else if(m.x&&String(m.x).toLowerCase().indexOf(lq)>-1) out.push({kind:'message',gid:g.id,g:gn,mid:m.id,title:'',snip:snip(m.x,q),u:m.u,t:m.t});
    (m.files||[]).forEach(function(f){ if(f&&String(f.name||'').toLowerCase().indexOf(lq)>-1) out.push({kind:'file',gid:g.id,g:gn,mid:m.id,title:f.name,snip:f.name,u:m.u,t:m.t}) }) }) });
  out.sort(function(a,b){ return (b.t||0)-(a.t||0) }); return {results:out.slice(0,60),next:null,total:out.length} }
function sorted(a){ return a.map(function(r,i){ return [r,i] }).sort(function(x,y){ return (y[0].t||0)-(x[0].t||0)||x[1]-y[1] }).map(function(x){ return x[0] }) }
async function fetchPage(q,offset){ if(C.real()) return C.api('search',offset?{q:q,offset:offset,limit:30}:{q:q,limit:30}); return practice(q) }
function run(now){ clearTimeout(timer); var q=Q.trim(); sel=-1;
  if(q.length<2){ seq++; rows=[]; next=null; total=0; LOADING=false; ERR=''; draw(); return }
  LOADING=true; ERR=''; draw();
  timer=setTimeout(async function(){ var my=++seq;
    try{ var j=await fetchPage(q,0); if(my!==seq) return; rows=sorted((j&&j.results)||[]); next=(j&&j.next)==null?null:j.next; total=(j&&j.total)||rows.length; ERR='' }
    catch(er){ if(my!==seq) return; rows=[]; next=null; total=0; ERR=(er&&er.status===401)?'Sign in to search.':((er&&er.message)||'Search could not run.') }
    LOADING=false; draw() },now?0:260) }
async function more(){ if(MORE||next==null) return; MORE=true; draw(); var q=Q.trim(), my=seq;
  try{ var j=await fetchPage(q,next); if(my!==seq) return; rows=sorted(rows.concat((j&&j.results)||[])); next=(j&&j.next)==null?null:j.next }catch(er){ C.flash((er&&er.message)||'Could not load more.') }
  MORE=false; draw() }

/* ---------- drawing ---------- */
function view(){ return rows.filter(function(r){ if(F!=='all'&&r.kind!==F) return false; if(INCHAT&&C.cur()&&r.gid!==C.cur()) return false; return true }) }
function drawChips(){ var cur=C.cur(), g=cur&&C.group(cur), counts={all:0}; rows.forEach(function(r){ if(INCHAT&&cur&&r.gid!==cur) return; counts.all++; counts[r.kind]=(counts[r.kind]||0)+1 });
  var h=KINDS.filter(function(k){ return k[0]==='all'||counts[k[0]]||F===k[0] }).map(function(k){ return '<button type="button" class="chip'+(F===k[0]?' on':'')+'" data-f="'+k[0]+'">'+k[1]+(rows.length?' '+(counts[k[0]]||0):'')+'</button>' }).join('');
  if(g&&Q.trim().length>=2) h+='<button type="button" class="chip'+(INCHAT?' on':'')+'" data-inchat>In '+esc(C.gname(g))+'</button>';
  chips.innerHTML=h; chips.hidden=Q.trim().length<2 }
function emptyHtml(){ var r=recent();
  var h='<div class="nx-hint">Type two or more letters. This looks for exactly what you type, in every chat you are in, your tasks, files, notes and meetings.</div>';
  if(r.length) h+='<div class="nx-gh"><span class="mono">Recent</span><button type="button" class="nx-lnk" data-rall>Clear</button></div>'+r.map(function(x){ return '<div class="nx-rc" data-rq="'+esc(x)+'" role="button" tabindex="0">'+LENS+'<span>'+esc(x)+'</span><button type="button" class="nx-rx" data-rx="'+esc(x)+'" aria-label="Remove">&times;</button></div>' }).join('');
  return h }
function rowHtml(r,i,q){ var k=r.kind, title, body, meta;
  var who=r.u?first(r.u):'';
  if(k==='message'){ title=esc(r.g||'Chat'); body=hl(r.snip,q); meta=[who,when(r.t)].filter(Boolean).join(' · ') }
  else if(k==='task'){ title=hl(r.title||r.snip,q); body=''; meta=['Task',r.g,who,when(r.t)].filter(Boolean).map(esc).join(' · ') }
  else if(k==='file'){ title=hl(r.title||r.snip,q); body=''; meta=[r.g,who,when(r.t)].filter(Boolean).map(esc).join(' · ') }
  else if(k==='note'){ title=hl(r.title||'Untitled',q); body=hl(r.snip&&r.snip!==r.title?r.snip:'',q); meta='Note · '+esc(when(r.t)) }
  else { title=hl(r.title||'Meeting',q); body=''; meta=esc(r.snip||when(r.t)) }
  if(k==='message') meta=esc(meta);
  return '<div class="nx-sr'+(i===sel?' sel':'')+'" role="button" tabindex="0" data-i="'+i+'"><span class="nx-si '+k+'">'+ICON[k]+'</span><div class="nx-st"><div class="nx-sh">'+title+'</div>'+(body?'<div class="nx-ss">'+body+'</div>':'')+'<div class="nx-sm">'+meta+(k==='file'&&r.url?' <span class="nx-sa">Open file</span>':'')+(k==='file'&&r.gid?' <button type="button" class="nx-lnk" data-go="'+i+'">Go to message</button>':'')+'</div></div></div>' }
function draw(){ drawChips(); var q=Q.trim();
  if(q.length<2){ res.innerHTML=emptyHtml(); shown=[]; return }
  if(LOADING&&!rows.length){ res.innerHTML='<div class="nx-empty">Searching...</div>'; shown=[]; return }
  if(ERR){ res.innerHTML='<div class="nx-empty">'+esc(ERR)+' <button type="button" class="chip" data-retry>Try again</button></div>'; shown=[]; return }
  shown=view();
  if(!shown.length){ res.innerHTML='<div class="nx-empty">Nothing found for “'+esc(q)+'”'+(F!=='all'||INCHAT?' here. <button type="button" class="chip" data-all>Search everything</button>':'. This looks for exactly those letters, so a shorter word may find more.')+'</div>'; return }
  var h='', last='';
  shown.forEach(function(r,i){ var d=dayLabel(r.t); if(d!==last){ last=d; h+='<div class="nx-gh"><span class="mono">'+esc(d)+'</span></div>' } h+=rowHtml(r,i,q) });
  if(next!=null) h+='<div class="nx-more"><span class="mono">Newest '+rows.length+' of '+total+'</span><button type="button" class="chip" data-more'+(MORE?' disabled':'')+'>'+(MORE?'Loading...':'Show more')+'</button></div>';
  else if(rows.length>=30) h+='<div class="nx-more"><span class="mono">'+rows.length+' results</span></div>';
  res.innerHTML=h }

/* ---------- opening a result ---------- */
function flashRow(row){ row.scrollIntoView({block:'center',behavior:'smooth'}); row.classList.remove('nx-hl'); void row.offsetWidth; row.classList.add('nx-hl'); setTimeout(function(){ row.classList.remove('nx-hl') },1600) }
function openMsg(gid,mid){
  if(!gid||!C.hasGroup(gid)){ C.flash('That chat is not on this screen.'); return }
  if(PHONE()) hide(); C.open(gid); var tries=0;
  (function seek(){ var row=mid?$('.mr[data-m="'+mid+'"]'):null; if(row){ flashRow(row); return } if(!mid) return;
    if(++tries<14) setTimeout(seek,120); else C.flash('That message is older than what Chat has loaded. The chat is open at its latest.') })() }
function openResult(r){ remember(Q); var k=r.kind;
  if(k==='message'||k==='task') return openMsg(r.gid,r.mid);
  if(k==='file'){ if(r.url){ window.open(r.url,'_blank','noopener'); return } return openMsg(r.gid,r.mid) }
  if(k==='note'){ if(PHONE()) hide(); if(window.openAtriumNotes) window.openAtriumNotes(null,r.id); else C.flash('Notes are not available here.'); return }
  if(k==='meeting'){ var hit=null; C.activeGroups().some(function(g){ return C.msgsIn(g.id).some(function(m){ if(m.mt&&String(m.mt.id)===String(r.id)){ hit={gid:g.id,mid:m.id}; return true } }) });
    if(hit) return openMsg(hit.gid,hit.mid); var cal=$('#groups [data-cal="open"]'); hide(); if(cal){ cal.click(); C.flash('This meeting is in your calendar.') } else C.flash('Open this meeting from your calendar.') } }

/* ---------- wiring ---------- */
inp.addEventListener('input',function(){ Q=inp.value; syncX(); run(false) });
inp.addEventListener('keydown',function(e){ var k=e.key;
  if(k==='Escape'){ e.preventDefault(); if(inp.value){ inp.value=''; Q=''; syncX(); run(true) } else hide(); return }
  if(k==='ArrowDown'||k==='ArrowUp'){ if(!shown.length) return; e.preventDefault(); sel=k==='ArrowDown'?Math.min(shown.length-1,sel+1):Math.max(0,sel-1); $$('.nx-sr',res).forEach(function(x,i){ x.classList.toggle('sel',i===sel) }); var s=$('.nx-sr.sel',res); if(s) s.scrollIntoView({block:'nearest'}); return }
  if(k==='Enter'){ e.preventDefault(); if(shown.length) openResult(shown[sel>=0?sel:0]); else remember(Q) } });
$('#nxSX').addEventListener('click',function(){ inp.value=''; Q=''; syncX(); run(true); inp.focus() });
$('#nxSC').addEventListener('click',hide);
chips.addEventListener('click',function(e){ var f=e.target.closest('[data-f]'), c=e.target.closest('[data-inchat]'); if(f){ F=f.getAttribute('data-f'); sel=-1; draw() } else if(c){ INCHAT=!INCHAT; sel=-1; draw() } });
res.addEventListener('click',function(e){
  var g=e.target.closest('[data-go]'); if(g){ e.stopPropagation(); var r0=shown[+g.getAttribute('data-go')]; if(r0){ remember(Q); openMsg(r0.gid,r0.mid) } return }
  if(e.target.closest('[data-more]')){ more(); return } if(e.target.closest('[data-retry]')){ run(true); return }
  if(e.target.closest('[data-all]')){ F='all'; INCHAT=false; draw(); return }
  if(e.target.closest('[data-rall]')){ forgetAll(); draw(); return }
  var x=e.target.closest('[data-rx]'); if(x){ e.stopPropagation(); forget(x.getAttribute('data-rx')); draw(); return }
  var rc=e.target.closest('[data-rq]'); if(rc){ var q=rc.getAttribute('data-rq'); Q=q; inp.value=q; syncX(); run(true); return }
  var row=e.target.closest('.nx-sr'); if(row){ var r=shown[+row.getAttribute('data-i')]; if(r) openResult(r) } });
res.addEventListener('keydown',function(e){ if(e.key!=='Enter'&&e.key!==' ') return; var row=e.target.closest&&e.target.closest('.nx-sr'); if(row){ e.preventDefault(); row.click() } });
/* a chat that opens or closes changes what "In this chat" means */
new MutationObserver(function(){ if(open) draw() }).observe($('#hTitle')||panel,{childList:true,subtree:true});
window.AtriumSearch={ open:show, close:hide };
})();
