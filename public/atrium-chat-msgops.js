/* ATRIUM Chat: message operations. Quote reply, edit, delete for everyone, forward, pin and remind me, in the message menu, plus the composer bar for replying and editing and the
   pinned bar under the chat's header. The messages themselves (the edited tag, the quote block, "Forwarded from", the deleted line, the pin mark) are drawn by the page.
   Server calls (ATRIUM item 5): editMessage { mid, body }, deleteMessage { mid }, pinMessage { mid, pinned }, pins { gid }, forwardMessage { mid, gids }, remindMe { mid, when | cancel },
   myReminders, and send with reply_to. Until the database update is run, those calls answer 503 with a plain message, which is shown as it is.
   On practice data every operation works on the practice chats in memory. Needs window.AtriumChat (see atrium-chat-tasks.js). window.AtriumMsgOps is what the page's send() calls. */
(function(){
'use strict';
var D=document, C=window.AtriumChat;
if(!C||!D.getElementById('msgs')) return;
function $(s,r){ return (r||D).querySelector(s) }
function $$(s,r){ return Array.prototype.slice.call((r||D).querySelectorAll(s)) }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
function first(id){ var p=C.person(id); return p&&p.n?p.n.split(' ')[0]:'Someone' }
function clip(s,n){ s=String(s||'').replace(/\s+/g,' ').trim(); return s.length>n?s.slice(0,n-1)+'...':s }
function fail(er){ C.flash((er&&er.message)||'That could not be done. Try again.') }
var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function when(ms){ var d=new Date(ms), n=new Date(), same=d.toDateString()===n.toDateString(), h=d.getHours()%12||12, m=String(d.getMinutes()).padStart(2,'0'), ap=d.getHours()<12?'am':'pm';
  return (same?'Today':DOW[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()])+', '+h+':'+m+' '+ap }

/* ---------- the composer bar: Replying to, or Editing ---------- */
var thread=$('#thread'), comp=$('#comp'), bar=D.createElement('div'); bar.id='nxMsgBar'; bar.innerHTML='<small></small><span></span><button type="button" aria-label="Cancel">&times;</button>'; comp.parentNode.insertBefore(bar,comp);
var reply=null, edit=null;
/* Switched on only once the server knows these operations. A server that does not answers 404, and then the menu stays as it was (Reply puts @name in the box).
   Any other answer, a 503 before the database update included, counts as known. Practice data always has it. */
var SUP=null, supAt=0, supBusy=false;
function on(){ return !C.real()||SUP===true }
function probe(){ if(!C.real()||SUP===true||supBusy||Date.now()-supAt<60000) return; supBusy=true; supAt=Date.now();
  C.api('myReminders').then(function(){ SUP=true }).catch(function(er){ var s=er&&er.status; if(s===404) SUP=false; else if(s&&s!==401&&s!==403) SUP=true }).then(function(){ supBusy=false; if(SUP===true){ pinsGid=''; loadPins(); drawPins() } }) }
function barDraw(){ var on=reply||edit; bar.classList.toggle('on',!!on); if(!on) return; $('small',bar).textContent=edit?'Editing':'Replying to '+first(reply.rq.u); $('span',bar).textContent=clip(edit?edit.orig:reply.rq.x,120) }
function clearAll(){ reply=null; edit=null; barDraw() }
$('button',bar).addEventListener('click',function(){ if(edit){ var i=$('#inp'); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})) } clearAll() });
D.addEventListener('keydown',function(e){ if(e.key==='Escape'&&(reply||edit)&&!$('.ov.on')){ $('button',bar).click() } });
function startReply(m){ edit=null; reply={gid:m.g,mid:m.id,rq:{u:m.u,x:clip(m.x||(m.files&&m.files.length?'Photo or file':''),140)}}; barDraw(); var i=$('#inp'); i.focus() }
function startEdit(m){ reply=null; edit={gid:m.g,mid:m.id,orig:m.x||''}; barDraw(); var i=$('#inp'); i.value=edit.orig; i.dispatchEvent(new Event('input',{bubbles:true})); i.focus(); try{ i.setSelectionRange(i.value.length,i.value.length) }catch(e){} }
new MutationObserver(function(){ if((reply&&reply.gid!==C.cur())||(edit&&edit.gid!==C.cur())) clearAll() }).observe($('#hTitle'),{childList:true,subtree:true});

/* what the page's send() calls */
window.AtriumMsgOps={
  editing:function(){ return !!edit },
  takeReply:function(gid){ if(!reply||reply.gid!==gid) return null; var r=reply; reply=null; barDraw(); return r },
  commitEdit:async function(v){ if(!edit) return; var e=edit, m=C.msg(e.mid); if(!m){ clearAll(); return } if(v===e.orig){ $('button',bar).click(); return } if(!v){ C.flash('A message cannot be empty. Delete it instead.'); return }
    try{
      if(C.real()) await C.api('editMessage',{mid:e.mid,body:v});
      C.mop({op:'edit',mid:e.mid,x:v,ed:Date.now()}); var i=$('#inp'); i.value=''; i.style.height='auto'; i.dispatchEvent(new Event('input',{bubbles:true})); clearAll(); C.repaint()
    }catch(er){ fail(er) } } };

/* ---------- sheets, on the page's own .ov and .sheet ---------- */
function sheet(id,html){ var o=D.createElement('div'); o.className='ov nx'; o.id=id; o.innerHTML='<div class="sheet">'+html+'</div>'; D.body.appendChild(o); o.addEventListener('click',function(e){ if(e.target===o||e.target.closest('[data-x]')) o.classList.remove('on') }); return o }
function openSheet(o){ $$('.ov.nx.on').forEach(function(x){ x.classList.remove('on') }); o.classList.add('on') }
var delS=sheet('nxDel','<h3>Delete for everyone?</h3><div class="lead">It removes the words, and any files in this chat, for everybody. People see "This message was deleted".</div><div class="row" style="margin-top:14px"><button type="button" class="cb" data-x>Cancel</button><button type="button" class="cb nx-danger" id="nxDelGo">Delete</button></div>');
var fwdS=sheet('nxFwd','<h3>Forward to</h3><div class="lead" id="nxFwdL"></div><div class="nx-opts" id="nxFwdO"></div><div class="row" style="margin-top:14px"><button type="button" class="cb" data-x>Cancel</button><button type="button" class="cb go" id="nxFwdGo">Forward</button></div>');
var remS=sheet('nxRem','<h3>Remind me</h3><div class="lead" id="nxRemL"></div><div class="nx-opts" id="nxRemO"></div><div class="f" style="margin-top:12px"><label class="mono" for="nxRemT">Or pick a time</label><input type="datetime-local" id="nxRemT"></div><div class="row" style="margin-top:14px"><button type="button" class="cb" data-x>Cancel</button><button type="button" class="cb" id="nxRemX" hidden>Remove reminder</button><button type="button" class="cb go" id="nxRemGo">Set reminder</button></div>');
var pinS=sheet('nxPinS','<h3>Pinned</h3><div class="lead" id="nxPinL"></div><div class="nx-opts" id="nxPinO"></div><div class="row" style="margin-top:14px"><button type="button" class="cb" data-x>Close</button></div>');

/* delete */
var delFor=null;
function askDelete(m){ delFor=m; openSheet(delS) }
$('#nxDelGo').addEventListener('click',async function(){ var m=delFor; if(!m) return; var b=this; b.disabled=true;
  try{ if(C.real()) await C.api('deleteMessage',{mid:m.id}); C.mop({op:'del',mid:m.id,u:C.me(),t:Date.now()}); delS.classList.remove('on'); C.repaint(); drawPins() }catch(er){ fail(er) } b.disabled=false });

/* forward: up to ten chats */
var fwdFor=null, fwdSel={};
function askForward(m){ fwdFor=m; fwdSel={}; var gs=C.activeGroups().filter(function(g){ return g.id!==m.g });
  $('#nxFwdL').textContent=clip(m.x||'Photo or file',100); $('#nxFwdO').innerHTML=gs.length?gs.map(function(g){ return '<button type="button" class="nx-opt" data-g="'+esc(g.id)+'"><span class="nx-ck"></span><span>'+esc(C.gname(g))+'</span></button>' }).join(''):'<div class="nx-none">You are not in any other chat.</div>'; syncFwd(); openSheet(fwdS) }
function syncFwd(){ var n=Object.keys(fwdSel).length; var b=$('#nxFwdGo'); b.disabled=!n; b.textContent=n?'Forward to '+n+(n===1?' chat':' chats'):'Forward' }
$('#nxFwdO').addEventListener('click',function(e){ var o=e.target.closest('[data-g]'); if(!o) return; var g=o.getAttribute('data-g'); if(fwdSel[g]){ delete fwdSel[g]; o.classList.remove('on') } else { if(Object.keys(fwdSel).length>=10){ C.flash('You can forward to ten chats at a time.'); return } fwdSel[g]=1; o.classList.add('on') } syncFwd() });
$('#nxFwdGo').addEventListener('click',async function(){ var m=fwdFor, gids=Object.keys(fwdSel); if(!m||!gids.length) return; var b=this; b.disabled=true;
  try{
    if(C.real()){ var j=await C.api('forwardMessage',{mid:m.id,gids:gids}); var ok=(j.done||[]).length; fwdS.classList.remove('on'); C.flash(ok?'Forwarded to '+ok+(ok===1?' chat':' chats')+'.':'Nothing was forwarded.'); (j.skipped||[]).slice(0,2).forEach(function(s){ C.flash('Skipped one chat: '+(s.why||'not allowed')) }) }
    else { var src=C.group(m.g); gids.forEach(function(g){ C.addLocal({g:g,u:C.me(),x:m.x||'',files:m.files,fw:{g:m.g,gn:src?C.gname(src):'a chat',u:m.u,mid:m.id}}) }); fwdS.classList.remove('on'); C.repaint(); C.flash('Forwarded to '+gids.length+(gids.length===1?' chat':' chats')+'.') }
  }catch(er){ fail(er) } syncFwd() });

/* remind me */
var remFor=null, remAt=null, remHave=null;
function ts(d){ return d.getTime() }
function remOptions(){ var n=new Date(), o=[]; var h1=new Date(n.getTime()+3600000); o.push(['In an hour',h1]);
  var eve=new Date(n.getFullYear(),n.getMonth(),n.getDate(),18,0); if(eve>n) o.push(['This evening, 6:00 pm',eve]);
  var tom=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,9,0); o.push(['Tomorrow, 9:00 am',tom]);
  var mon=new Date(n.getFullYear(),n.getMonth(),n.getDate()+((8-n.getDay())%7||7),9,0); o.push(['Monday, 9:00 am',mon]); return o }
function askRemind(m){ remFor=m; remAt=null; remHave=null; $('#nxRemT').value=''; $('#nxRemL').textContent=clip(m.x||'Photo or file',100); $('#nxRemX').hidden=true;
  $('#nxRemO').innerHTML=remOptions().map(function(o,i){ return '<button type="button" class="nx-opt" data-i="'+i+'"><span class="nx-ck"></span><span>'+esc(o[0])+'</span></button>' }).join(''); remOpts=remOptions(); syncRem(); openSheet(remS);
  if(C.real()) C.api('myReminders').then(function(j){ var r=((j&&j.reminders)||[]).filter(function(x){ return x.mid==m.id })[0]; if(r&&remFor&&remFor.id===m.id){ remHave=r.at; $('#nxRemL').innerHTML=esc(clip(m.x||'Photo or file',100))+'<br>Reminder set for '+esc(when(r.at)); $('#nxRemX').hidden=false } }).catch(function(){}) }
var remOpts=[];
function syncRem(){ $('#nxRemGo').disabled=!remAt }
$('#nxRemO').addEventListener('click',function(e){ var o=e.target.closest('[data-i]'); if(!o) return; $$('#nxRemO .nx-opt').forEach(function(x){ x.classList.toggle('on',x===o) }); remAt=ts(remOpts[+o.getAttribute('data-i')][1]); $('#nxRemT').value=''; syncRem() });
$('#nxRemT').addEventListener('input',function(){ var v=this.value; if(!v){ return } var d=new Date(v); if(!isNaN(d)){ remAt=ts(d); $$('#nxRemO .nx-opt').forEach(function(x){ x.classList.remove('on') }); syncRem() } });
$('#nxRemGo').addEventListener('click',async function(){ if(!remFor||!remAt) return; if(remAt<Date.now()+30000){ C.flash('Pick a time at least a minute from now.'); return } var b=this; b.disabled=true;
  try{ if(C.real()) await C.api('remindMe',{mid:remFor.id,when:remAt}); remS.classList.remove('on'); C.flash('Reminder set for '+when(remAt)+'.') }catch(er){ fail(er) } b.disabled=false });
$('#nxRemX').addEventListener('click',async function(){ if(!remFor) return; try{ if(C.real()) await C.api('remindMe',{mid:remFor.id,cancel:true}); remS.classList.remove('on'); C.flash('Reminder removed.') }catch(er){ fail(er) } });

/* ---------- pins: the bar under the header, and the list ---------- */
var pinBar=D.createElement('div'); pinBar.id='nxPinBar'; pinBar.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4z"/></svg><span class="nxt"></span><b class="nxn"></b>'; var th=$('#thead'); th.parentNode.insertBefore(pinBar,th.nextSibling);
var PINS={}, pinsGid='';
function pinsFor(gid){ var seen={}, out=[]; C.msgsIn(gid).filter(function(m){ return m.pin&&!m.del }).concat(PINS[gid]||[]).forEach(function(m){ if(seen[m.id]) return; seen[m.id]=1; var cur=C.msg(m.id); if(cur&&!cur.pin) return; out.push(cur||m) }); return out.sort(function(a,b){ return (b.pin||0)-(a.pin||0) }) }
function drawPins(){ var gid=C.cur(), list=gid?pinsFor(gid):[]; document.body.classList.toggle('nx-pin',!!list.length); pinBar.classList.toggle('on',!!list.length); if(!list.length) return;
  var m=list[0]; $('.nxt',pinBar).textContent=first(m.u)+': '+clip(m.x||(m.files&&m.files.length?'Photo or file':''),90); $('.nxn',pinBar).textContent=list.length>1?list.length+' pinned':'Pinned' }
function loadPins(){ var gid=C.cur(); if(!gid||gid===pinsGid) return; if(!on()){ probe(); return } pinsGid=gid; if(!C.real()) return; C.api('pins',{gid:gid}).then(function(j){ PINS[gid]=(j&&j.pins)||[]; drawPins() }).catch(function(){ pinsGid='' }) }
new MutationObserver(function(){ loadPins(); drawPins() }).observe($('#msgs'),{childList:true});
new MutationObserver(function(){ drawPins() }).observe($('#hTitle'),{childList:true,subtree:true});
function jumpTo(mid){ var row=$('.mr[data-m="'+mid+'"]'); if(!row){ C.flash('That message is further back in the chat.'); return } row.scrollIntoView({block:'center',behavior:'smooth'}); row.classList.add('nx-hl'); setTimeout(function(){ row.classList.remove('nx-hl') },1400) }
pinBar.addEventListener('click',function(){ var gid=C.cur(), list=pinsFor(gid); if(list.length<=1){ if(list[0]) jumpTo(list[0].id); return }
  $('#nxPinL').textContent=list.length+' pinned messages, newest first.'; $('#nxPinO').innerHTML=list.map(function(m){ return '<div class="nx-pinrow" data-m="'+m.id+'"><div class="nxtx"><b>'+esc(first(m.u))+'</b>'+esc(clip(m.x||'Photo or file',110))+'<small>Pinned '+esc(when(m.pin))+(m.pb?' by '+esc(first(m.pb)):'')+'</small></div><button type="button" class="cb" data-unpin="'+m.id+'">Unpin</button></div>' }).join(''); openSheet(pinS) });
$('#nxPinO').addEventListener('click',function(e){ var u=e.target.closest('[data-unpin]'); if(u){ e.stopPropagation(); togglePin(C.msg(u.getAttribute('data-unpin')),false); pinS.classList.remove('on'); return } var r=e.target.closest('[data-m]'); if(r){ pinS.classList.remove('on'); jumpTo(r.getAttribute('data-m')) } });
async function togglePin(m,on){ if(!m) return; try{ if(C.real()) await C.api('pinMessage',{mid:m.id,pinned:on}); C.mop({op:on?'pin':'unpin',mid:m.id,u:C.me(),t:Date.now()}); C.repaint(); drawPins(); C.flash(on?'Pinned to the top of this chat.':'Unpinned.') }catch(er){ fail(er) } }
/* a tap on a quote jumps to what it quotes */
$('#msgs').addEventListener('click',function(e){ var q=e.target.closest('.nx-rq'); if(q&&q.getAttribute('data-rt')){ e.stopPropagation(); jumpTo(q.getAttribute('data-rt')) } },true);

/* ---------- the message menu: Quote reply replaces the old Reply, and the rest joins it ---------- */
var am=$('#amenu');
function icon(d){ return '<svg viewBox="0 0 24 24"><path d="'+d+'"/></svg>' }
function caps(m){ var g=C.group(m.g), me=C.me(), owner=g&&(g.owner||(g.m&&g.m[0]))===me, dir=C.role()==='admin', mine=m.u===me, special=m.task||m.poll||m.mt||m.wf, hasFiles=m.files&&m.files.length;
  return { edit:mine&&!special&&!hasFiles&&!!m.x, del:(mine||owner||dir)&&!special, fwd:!special&&(!!m.x||hasFiles) } }
new MutationObserver(function(){ if(!am.classList.contains('on')) return; var bar2=$('.abar',am); if(!bar2||bar2.getAttribute('data-nxm')) return; bar2.setAttribute('data-nxm','1'); if(!on()){ probe(); return }
  var row=$('.mr.sel'); if(!row) return; var m=C.msg(row.getAttribute('data-m')); if(!m) return; var c=caps(m), items=[];
  if(c.edit) items.push(['edit','Edit','M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4']);
  if(c.fwd) items.push(['fwd','Forward','M13 5l7 7-7 7M4 12h16']);
  items.push(m.pin?['unpin','Unpin','M12 17v5M8 3h8l-1 6 3 4H6l3-4zM4 4l16 16']:['pin','Pin to top','M12 17v5M8 3h8l-1 6 3 4H6l3-4z']);
  items.push(['rem','Remind me','M12 8v5l3 2M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM5 3 2 6M19 3l3 3']);
  if(c.del) items.push(['del','Delete for everyone','M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3']);
  items.forEach(function(it){ var b=D.createElement('button'); b.type='button'; b.setAttribute('data-nxa',it[0]); if(it[0]==='del') b.className='nx-danger-item'; b.innerHTML=icon(it[2])+it[1]; bar2.appendChild(b) });
  var over=am.getBoundingClientRect().bottom-(innerHeight-8); if(over>0) am.style.top=Math.max(8,parseFloat(am.style.top)-over)+'px' }).observe(am,{attributes:true,attributeFilter:['class']});
am.addEventListener('click',function(e){ if(!on()) return; var b=e.target.closest('[data-nxa]'), rp=e.target.closest('[data-a="reply"]'); if(!b&&!rp) return; var row=$('.mr.sel'); var m=row&&C.msg(row.getAttribute('data-m')); if(!m) return;
  e.stopPropagation(); e.preventDefault(); am.classList.remove('on'); $$('.mr.sel').forEach(function(x){ x.classList.remove('sel') });
  if(rp) return startReply(m); var a=b.getAttribute('data-nxa');
  if(a==='edit') startEdit(m); else if(a==='fwd') askForward(m); else if(a==='pin') togglePin(m,true); else if(a==='unpin') togglePin(m,false); else if(a==='rem') askRemind(m); else if(a==='del') askDelete(m) },true);
drawPins();
setTimeout(probe,1500);
})();
