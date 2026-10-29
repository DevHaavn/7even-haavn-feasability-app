/* ATRIUM Chat: the command bar and the slash menu.
   Ctrl or Cmd K opens one box: type a chat or a person's name to go there, or an action (set a task, start a poll, new meeting, my calendar, notes, settings, switch Dark or Light), or
   search everything. In the message box, typing / at the start shows the same short list for the open chat: /task, /poll, /meeting, /find, /notes. Everything uses what the page already
   does; nothing here talks to the server. Needs window.AtriumChat (see atrium-chat-tasks.js). */
(function(){
'use strict';
var D=document, C=window.AtriumChat;
if(!C||!D.getElementById('inp')) return;
function $(s,r){ return (r||D).querySelector(s) }
function $$(s,r){ return Array.prototype.slice.call((r||D).querySelectorAll(s)) }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
function click(sel){ var b=$(sel); if(b){ b.click(); return true } return false }
function hasChat(){ return !!(C.cur()&&C.group(C.cur())) }
function ic(d){ return '<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>' }
var I={ chat:ic('<path d="M5 6h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-7l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/>'), task:ic('<circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'), poll:ic('<path d="M5 20V10M12 20V4M19 20v-7"/>'),
  meet:ic('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'), note:ic('<path d="M5 4h14v16H5zM8.5 9h7M8.5 13h7M8.5 17h4"/>'), find:ic('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
  gear:ic('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>'), moon:ic('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'), sun:ic('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>'), plus:ic('<path d="M12 5v14M5 12h14"/>') };
function scheme(){ return window.AtriumScheme?AtriumScheme.get():'dark' }
/* name, words that find it, whether it needs an open chat, what it does */
var CMDS=[
 {k:'task',n:'Set a task',w:'task todo assign',chat:1,i:I.task,run:function(t){ C.taskDialog(t||'') }},
 {k:'poll',n:'Start a poll',w:'poll vote ask',chat:1,i:I.poll,run:function(){ click('#attach [data-at="poll"]') }},
 {k:'meeting',n:'New meeting from this chat',w:'meeting meet invite schedule calendar',chat:1,i:I.meet,run:function(){ C.meetSheet() }},
 {k:'chat',n:'New chat or group',w:'new chat group message',i:I.plus,run:function(){ click('#newBtn') }},
 {k:'tasks',n:'My tasks',w:'tasks todo due overdue',i:I.task,run:function(){ click('#rail [data-v="tasks"]')||click('#tabbar [data-v="tasks"]') }},
 {k:'calendar',n:'My calendar',w:'calendar meetings outlook agenda',i:I.meet,run:function(){ click('#groups [data-cal="open"]')||click('#tabbar [data-v="meet"]') }},
 {k:'notes',n:'Notes',w:'notes dictate minutes',i:I.note,run:function(){ if(window.openAtriumNotes) window.openAtriumNotes(); else click('[data-notes]') }},
 {k:'find',n:'Search everything',w:'search find messages files',i:I.find,run:function(t){ if(window.AtriumSearch) AtriumSearch.open(t||'') }},
 {k:'today',n:'Show my day',w:'morning card today day summary',i:I.meet,run:function(){ if(window.AtriumMorning) AtriumMorning.show(true) }},
 {k:'theme',n:function(){ return scheme()==='light'?'Switch to Dark':'Switch to Light' },w:'dark light theme mode',i:function(){ return scheme()==='light'?I.moon:I.sun },run:function(){ if(window.AtriumScheme) AtriumScheme.set(scheme()==='light'?'dark':'light') }},
 {k:'settings',n:'Settings',w:'settings sound alerts account',i:I.gear,run:function(){ click('#setBtn') }} ];
function nameOf(c){ return typeof c.n==='function'?c.n():c.n }
function iconOf(c){ return typeof c.i==='function'?c.i():c.i }

/* ---------- the command bar ---------- */
var ov=D.createElement('div'); ov.className='ov nx nx-palov'; ov.id='nxPal';
ov.innerHTML='<div class="sheet nx-pal"><div class="nx-palq"><input id="nxPalIn" type="text" autocomplete="off" spellcheck="false" placeholder="Go to a chat or person, or do something" aria-label="Command bar"></div><div id="nxPalR" class="nx-palr"></div><div class="nx-palh mono">Enter to choose &middot; Esc to close</div></div>';
D.body.appendChild(ov);
var inp=$('#nxPalIn'), list=$('#nxPalR'), items=[], sel=0;
function close(){ ov.classList.remove('on') }
function match(hay,q){ return hay.toLowerCase().indexOf(q)>-1 }
function build(q){ q=q.trim().toLowerCase(); var out=[];
  var gs=C.activeGroups().filter(function(g){ return !q||match(C.gname(g),q) }); if(!q) gs=$$('#groups .g[data-g]').slice(0,5).map(function(b){ return C.group(b.getAttribute('data-g')) }).filter(Boolean);
  gs.slice(0,6).forEach(function(g){ out.push({sec:q?'Chats':'Recent chats',t:C.gname(g),h:g.dm?'Direct message':(g.priv?'Private group':'Group'),i:I.chat,run:function(){ C.open(g.id) }}) });
  if(q){ var me=C.me(), have={}; C.activeGroups().forEach(function(g){ if(g.dm) (g.m||[]).forEach(function(id){ have[id]=1 }) });
    C.people().filter(function(p){ return p&&p.id!==me&&!p.ext&&!have[p.id]&&match(p.n||'',q) }).slice(0,4).forEach(function(p){ out.push({sec:'People',t:p.n,h:'Message',i:I.chat,run:function(){ var s=$('#search'); s.value=p.n; s.dispatchEvent(new Event('input',{bubbles:true})); setTimeout(function(){ var r=$('#groups [data-dmp="'+p.id+'"]'); if(r) r.click() },80) }}) }) }
  CMDS.filter(function(c){ return (!c.chat||hasChat())&&(!q||match(nameOf(c),q)||match(c.w,q)) }).slice(0,q?5:11).forEach(function(c){ out.push({sec:'Do',t:nameOf(c),h:'',i:iconOf(c),run:function(){ c.run('') }}) });
  if(q.length>=2) out.push({sec:'Search',t:'Search everything for “'+inp.value.trim()+'”',h:'Messages, tasks, files, notes, meetings',i:I.find,run:function(){ if(window.AtriumSearch) AtriumSearch.open(inp.value.trim()) }});
  return out }
function draw(){ items=build(inp.value); if(sel>=items.length) sel=Math.max(0,items.length-1); var last='', h='';
  items.forEach(function(it,i){ if(it.sec!==last){ last=it.sec; h+='<div class="mono nx-palsec">'+esc(it.sec)+'</div>' } h+='<div class="nx-palrow'+(i===sel?' sel':'')+'" role="button" tabindex="-1" data-i="'+i+'"><span class="nx-palic">'+it.i+'</span><span class="nx-palt">'+esc(it.t)+'</span>'+(it.h?'<small>'+esc(it.h)+'</small>':'')+'</div>' });
  list.innerHTML=h||'<div class="nx-empty">Nothing matches.</div>' }
function choose(i){ var it=items[i]; if(!it) return; close(); setTimeout(function(){ it.run() },30) }
function openPal(){ $$('.ov.nx.on').forEach(function(x){ if(x!==ov) x.classList.remove('on') }); inp.value=''; sel=0; draw(); ov.classList.add('on'); setTimeout(function(){ inp.focus() },30) }
ov.addEventListener('click',function(e){ if(e.target===ov){ close(); return } var r=e.target.closest('[data-i]'); if(r) choose(+r.getAttribute('data-i')) });
inp.addEventListener('input',function(){ sel=0; draw() });
inp.addEventListener('keydown',function(e){ var k=e.key;
  if(k==='Escape'){ e.preventDefault(); close(); return }
  if(k==='ArrowDown'||k==='ArrowUp'){ e.preventDefault(); if(!items.length) return; sel=k==='ArrowDown'?(sel+1)%items.length:(sel-1+items.length)%items.length; $$('.nx-palrow',list).forEach(function(r,i){ r.classList.toggle('sel',+r.getAttribute('data-i')===sel) }); var s=$('.nx-palrow.sel',list); if(s) s.scrollIntoView({block:'nearest'}); return }
  if(k==='Enter'){ e.preventDefault(); choose(sel) } });
D.addEventListener('keydown',function(e){ if((e.metaKey||e.ctrlKey)&&(e.key==='k'||e.key==='K')&&!e.shiftKey&&!e.altKey){ e.preventDefault(); ov.classList.contains('on')?close():openPal() } });
window.AtriumPalette={ open:openPal };

/* ---------- the slash menu in the message box ---------- */
var SL=[ {c:'/task',k:'task',h:'Set a task. Add the words: /task send the cash flow'},{c:'/poll',k:'poll',h:'Start a poll'},{c:'/meeting',k:'meeting',h:'New meeting from this chat'},{c:'/find',k:'find',h:'Search everything. Add the words: /find staging'},{c:'/notes',k:'notes',h:'Open Notes'} ];
var menu=D.createElement('div'); menu.id='nxSlash'; var comp=$('#comp'); comp.parentNode.insertBefore(menu,comp); var inpM=$('#inp'), ssel=0, sitems=[];
function slashParts(){ var v=inpM.value; var m=/^\/(\w*)(?:\s+([\s\S]*))?$/.exec(v); return m?{cmd:m[1].toLowerCase(),rest:(m[2]||'')}:null }
function slashDraw(){ var p=slashParts(); if(!p||!hasChat()){ menu.classList.remove('on'); sitems=[]; return }
  sitems=SL.filter(function(s){ return s.c.indexOf('/'+p.cmd)===0 }); if(p.rest) sitems=sitems.filter(function(s){ return s.c==='/'+p.cmd });
  if(!sitems.length){ menu.classList.remove('on'); return } if(ssel>=sitems.length) ssel=0;
  menu.innerHTML=sitems.map(function(s,i){ return '<div class="nx-slrow'+(i===ssel?' sel':'')+'" data-s="'+i+'"><b>'+s.c+'</b><span>'+esc(s.h)+'</span></div>' }).join(''); menu.classList.add('on') }
function slashRun(s){ var p=slashParts(), rest=p?p.rest.trim():''; inpM.value=''; inpM.dispatchEvent(new Event('input',{bubbles:true})); menu.classList.remove('on'); var c=CMDS.filter(function(x){ return x.k===s.k })[0]; if(c) c.run(rest) }
inpM.addEventListener('input',function(){ ssel=0; slashDraw() });
inpM.addEventListener('keydown',function(e){ if(!menu.classList.contains('on')||!sitems.length) return; var k=e.key;
  if(k==='ArrowDown'||k==='ArrowUp'){ e.preventDefault(); e.stopImmediatePropagation(); ssel=k==='ArrowDown'?(ssel+1)%sitems.length:(ssel-1+sitems.length)%sitems.length; slashDraw(); return }
  if(k==='Escape'){ e.stopImmediatePropagation(); menu.classList.remove('on'); return }
  if(k==='Enter'||k==='Tab'){ var p=slashParts(); if(k==='Tab'&&p&&!p.rest){ e.preventDefault(); e.stopImmediatePropagation(); inpM.value=sitems[ssel].c+' '; inpM.dispatchEvent(new Event('input',{bubbles:true})); return } if(k==='Enter'&&!e.shiftKey){ e.preventDefault(); e.stopImmediatePropagation(); slashRun(sitems[ssel]) } } },true);
menu.addEventListener('mousedown',function(e){ var r=e.target.closest('[data-s]'); if(!r) return; e.preventDefault(); slashRun(sitems[+r.getAttribute('data-s')]) });
})();
