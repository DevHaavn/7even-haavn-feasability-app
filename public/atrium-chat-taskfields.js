/* ATRIUM Chat: task fields.
   A task gets a details sheet: status (To do, Doing, Blocked, Done), a checklist, due date, priority, a reminder time, and a nudge to the person it is for.
   Opens from "Task details" in the message menu, and from the Details link on a row in My Tasks. Task bubbles show their status and checklist progress.
   Server calls (ATRIUM wave two): taskUpdate { mid, st?, cl?, rem?, due?, pri? } -> { ok, task }, taskNudge { mid } -> { ok, sent, at }. A change reaches everyone as a live
   mop of op 'task' (the page applies it). Stays out of the way (no menu item, no chips) until the server knows taskUpdate. On practice data it works in memory.
   Needs window.AtriumChat (see atrium-chat-tasks.js). */
(function(){
'use strict';
var D=document, C=window.AtriumChat;
if(!C||!D.getElementById('msgs')) return;
function $(s,r){ return (r||D).querySelector(s) }
function $$(s,r){ return Array.prototype.slice.call((r||D).querySelectorAll(s)) }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
function first(id){ var p=C.person(id); return p&&p.n?p.n.split(' ')[0]:'Someone' }
var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function when(ms){ var d=new Date(ms), n=new Date(), h=d.getHours()%12||12, mm=String(d.getMinutes()).padStart(2,'0');
  return (d.toDateString()===n.toDateString()?'Today':DOW[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()])+', '+h+':'+mm+' '+(d.getHours()<12?'am':'pm') }
var STATUS=[['todo','To do'],['doing','Doing'],['blocked','Blocked'],['done','Done']], PRI=['Low','Normal','Medium','High'];
function stOf(t){ return t.st||(t.done?'done':'todo') }

/* switched on only once the server knows taskUpdate (404 "Unknown action." means not yet) */
var SUP=null, supAt=0, supBusy=false;
function on(){ return !C.real()||SUP===true }
function probe(){ if(!C.real()||SUP===true||supBusy||Date.now()-supAt<60000) return; supBusy=true; supAt=Date.now();
  C.api('taskUpdate',{mid:0}).then(function(){ SUP=true }).catch(function(er){ var s=er&&er.status; if(s===404&&/unknown action/i.test(er.message||'')) SUP=false; else if(s&&s!==401&&s!==403) SUP=true }).then(function(){ supBusy=false; if(SUP===true) decorate() }) }

function canEdit(m){ var t=m.task, me=C.me(); return !!t&&(t.own===me||m.u===me||C.role()==='admin') }
function progress(t){ var cl=t.cl||[]; if(!cl.length) return ''; return cl.filter(function(c){ return c.d }).length+'/'+cl.length }

/* ---------- the sheet ---------- */
var ov=D.createElement('div'); ov.className='ov nx'; ov.id='nxTk'; ov.innerHTML='<div class="sheet"><h3 id="nxTkT"></h3><div class="lead" id="nxTkL"></div><div id="nxTkB"></div><div class="row" style="margin-top:14px"><button type="button" class="cb" data-x>Close</button></div></div>'; D.body.appendChild(ov);
ov.addEventListener('click',function(e){ if(e.target===ov||e.target.closest('[data-x]')) ov.classList.remove('on') });
var curMid=null;
function remOptions(){ var n=new Date(), a=new Date(n.getTime()+3600000), t9=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,9,0), mon=new Date(n.getFullYear(),n.getMonth(),n.getDate()+((8-n.getDay())%7||7),9,0);
  return [['In an hour',a.getTime()],['Tomorrow 9am',t9.getTime()],['Monday 9am',mon.getTime()]] }
function draw(){ var m=C.msg(curMid); if(!m||!m.task){ ov.classList.remove('on'); return } var t=m.task, ed=canEdit(m), cl=t.cl||[], me=C.me();
  $('#nxTkT').textContent=t.title||'Task';
  $('#nxTkL').innerHTML='Set by '+esc(first(m.u))+' for '+esc(first(t.own))+(t.proj&&t.proj!=='No project'?' · '+esc(t.proj):'');
  var h='<div class="seg2 nx-st4">'+STATUS.map(function(s){ return '<button type="button" data-st="'+s[0]+'" class="'+(stOf(t)===s[0]?'on':'')+'"'+(ed?'':' disabled')+'>'+s[1]+'</button>' }).join('')+'</div>';
  h+='<div class="row"><div class="f"><label class="mono" for="nxTkD">Due</label><input type="date" id="nxTkD" value="'+esc(t.due||'')+'"'+(ed?'':' disabled')+'></div><div class="f"><label class="mono" for="nxTkP">Priority</label><select id="nxTkP"'+(ed?'':' disabled')+'>'+PRI.map(function(p){ return '<option'+((t.pri||'Normal')===p?' selected':'')+'>'+p+'</option>' }).join('')+'</select></div></div>';
  h+='<div class="mono nx-tkh">Checklist'+(cl.length?' · '+progress(t):'')+'</div><div id="nxTkC">'+cl.map(function(c){ return '<div class="nx-ck'+(c.d?' done':'')+'" data-c="'+esc(c.id)+'"><button type="button" class="chk'+(c.d?' done':'')+'" data-cc="'+esc(c.id)+'" aria-label="Tick"'+(ed?'':' disabled')+'></button><span>'+esc(c.t)+'</span>'+(ed?'<button type="button" class="nx-rx" data-cx="'+esc(c.id)+'" aria-label="Remove">&times;</button>':'')+'</div>' }).join('')+'</div>';
  if(ed&&cl.length<30) h+='<div class="nx-ckadd"><input id="nxTkA" type="text" placeholder="Add a step" autocomplete="off" enterkeyhint="done"></div>';
  h+='<div class="mono nx-tkh">Reminder</div><div class="lead" style="margin:0 0 8px">'+(t.rem&&!t.done?'Set for '+esc(when(t.rem))+' for '+esc(first(t.own)):'No reminder set')+'</div>';
  if(ed&&!t.done) h+='<div class="nx-remrow">'+remOptions().map(function(o){ return '<button type="button" class="chip nx-ro" data-rem="'+o[1]+'">'+o[0]+'</button>' }).join('')+'<input type="datetime-local" id="nxTkR" aria-label="Pick a time">'+(t.rem?'<button type="button" class="chip nx-ro" data-rem="0">Clear</button>':'')+'</div>';
  if(m.u===me&&t.own!==me&&!t.done) h+='<div class="row" style="margin-top:10px"><button type="button" class="cb" id="nxTkN">Nudge '+esc(first(t.own))+'</button></div>'+(t.nudged?'<div class="lead" style="margin-top:6px">Last nudged '+esc(when(t.nudged))+'</div>':'');
  $('#nxTkB').innerHTML=h }
function openSheet(mid){ var m=C.msg(mid); if(!m||!m.task) return; curMid=m.id; draw(); $$('.ov.nx.on').forEach(function(x){ x.classList.remove('on') }); ov.classList.add('on') }
async function send(patch){ var m=C.msg(curMid); if(!m) return; var args=Object.assign({mid:m.id},patch);
  try{ var task;
    if(C.real()){ var j=await C.api('taskUpdate',args); task=(j&&j.task)||null }
    if(!task){ task=Object.assign({},m.task); if(patch.st!==undefined){ task.st=patch.st; task.done=patch.st==='done' } if(patch.cl) task.cl=patch.cl; if(patch.rem!==undefined) task.rem=patch.rem||0; if(patch.due!==undefined) task.due=patch.due; if(patch.pri!==undefined) task.pri=patch.pri }
    C.mop({op:'task',mid:m.id,tk:task}); C.repaint(); draw(); decorate()
  }catch(er){ C.flash((er&&er.message)||'That could not be saved.'); draw() } }
function newId(){ return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6) }
$('#nxTkB').addEventListener('click',function(e){ var m=C.msg(curMid); if(!m||!m.task) return; var t=m.task, cl=(t.cl||[]).map(function(c){ return {id:c.id,t:c.t,d:!!c.d} });
  var st=e.target.closest('[data-st]'); if(st&&!st.disabled) return send({st:st.getAttribute('data-st')});
  var cc=e.target.closest('[data-cc]'); if(cc&&!cc.disabled){ cl.forEach(function(c){ if(c.id===cc.getAttribute('data-cc')) c.d=!c.d }); return send({cl:cl}) }
  var cx=e.target.closest('[data-cx]'); if(cx) return send({cl:cl.filter(function(c){ return c.id!==cx.getAttribute('data-cx') })});
  var rm=e.target.closest('[data-rem]'); if(rm) return send({rem:Number(rm.getAttribute('data-rem'))});
  if(e.target.closest('#nxTkN')){ var b=e.target.closest('#nxTkN'); b.disabled=true;
    (C.real()?C.api('taskNudge',{mid:m.id}):Promise.resolve({ok:true,sent:1,at:Date.now()})).then(function(j){ if(j&&j.sent===0) C.flash(first(t.own)+' has alerts switched off, so nothing was sent.'); else C.flash('Nudge sent to '+first(t.own)+'.'); if(j&&j.at){ C.mop({op:'task',mid:m.id,tk:Object.assign({},t,{nudged:j.at})}); C.repaint(); draw() } }).catch(function(er){ C.flash((er&&er.message)||'Could not nudge.'); b.disabled=false }) } });
$('#nxTkB').addEventListener('change',function(e){ var t=e.target;
  if(t.id==='nxTkD') send({due:t.value||''}); else if(t.id==='nxTkP') send({pri:t.value}); else if(t.id==='nxTkR'&&t.value){ var ms=new Date(t.value).getTime(); if(ms<Date.now()+30000){ C.flash('Pick a time at least a minute from now.'); return } send({rem:ms}) } });
$('#nxTkB').addEventListener('keydown',function(e){ if(e.target.id!=='nxTkA'||e.key!=='Enter') return; e.preventDefault(); var v=e.target.value.trim(); if(!v) return; var m=C.msg(curMid); if(!m) return; var cl=(m.task.cl||[]).map(function(c){ return {id:c.id,t:c.t,d:!!c.d} }); cl.push({id:newId(),t:v.slice(0,160),d:false}); e.target.value=''; send({cl:cl}) });

/* ---------- the message menu: Task details ---------- */
var am=$('#amenu');
new MutationObserver(function(){ if(!am.classList.contains('on')) return; var bar=$('.abar',am); if(!bar||bar.getAttribute('data-nxt')) return; bar.setAttribute('data-nxt','1'); if(!on()){ probe(); return }
  var row=$('.mr.sel'); if(!row) return; var m=C.msg(row.getAttribute('data-m')); if(!m||!m.task) return;
  var b=D.createElement('button'); b.type='button'; b.setAttribute('data-nxd',m.id); b.innerHTML='<svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h9"/></svg>Task details'; bar.insertBefore(b,bar.firstChild.nextSibling||null) }).observe(am,{attributes:true,attributeFilter:['class']});
am.addEventListener('click',function(e){ var b=e.target.closest('[data-nxd]'); if(!b) return; e.stopPropagation(); e.preventDefault(); am.classList.remove('on'); $$('.mr.sel').forEach(function(x){ x.classList.remove('sel') }); openSheet(b.getAttribute('data-nxd')) },true);

/* ---------- chips: a task's status and checklist progress, on its bubble and in My Tasks ---------- */
function chipHtml(t){ var s=stOf(t), p=progress(t), bits=[]; if(s!=='todo') bits.push(STATUS.filter(function(x){ return x[0]===s })[0][1]); if(p) bits.push('Checklist '+p); if(t.rem&&!t.done) bits.push('Reminder '+when(t.rem)); return bits.length?bits.map(function(b){ return '<span class="nx-tkc'+(s==='blocked'&&b==='Blocked'?' bl':'')+'">'+esc(b)+'</span>' }).join(''):'' }
function decorate(){ if(!on()) return;
  $$('#msgs .mr[data-m]').forEach(function(r){ var m=C.msg(r.getAttribute('data-m')); var old=$('.nx-tkr',r); var h=m&&m.task&&!m.del?chipHtml(m.task):''; if(!h){ if(old) old.remove(); return }
    if(old){ if(old.innerHTML!==h) old.innerHTML=h; return } var bub=$('.bub',r); if(bub){ var d=D.createElement('div'); d.className='nx-tkr'; d.innerHTML=h; bub.appendChild(d) } });
  $$('#nxTasks .nx-tr[data-k]').forEach(function(r){ var m=C.msg(r.getAttribute('data-k')); var old=$('.nx-dt',r); if(!m||!m.task){ if(old) old.remove(); return } var tx=$('.tx',r), h=chipHtml(m.task);
    if(!old&&tx){ var b=D.createElement('button'); b.type='button'; b.className='nx-lnk nx-dt'; b.setAttribute('data-nxd',m.id); b.textContent='Details'+(h?' · '+$$('span',D.createElement('div')).length:''); b.textContent='Details'; tx.appendChild(b) }
    var sm=$('.nx-tkr',r); if(h){ if(!sm&&tx){ sm=D.createElement('div'); sm.className='nx-tkr'; tx.appendChild(sm) } if(sm) sm.innerHTML=h } else if(sm) sm.remove() }) }
new MutationObserver(function(){ clearTimeout(decorate.t); decorate.t=setTimeout(decorate,60) }).observe($('#msgs'),{childList:true});
var tp=$('#nxTasks'); if(tp) new MutationObserver(function(){ clearTimeout(decorate.t2); decorate.t2=setTimeout(decorate,60) }).observe(tp,{childList:true});
D.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('#nxTasks [data-nxd]'); if(!b) return; e.stopPropagation(); e.preventDefault(); openSheet(b.getAttribute('data-nxd')) },true);
/* a live change from anyone redraws the open sheet (never while someone is typing in it) and the chips */
D.addEventListener('atrium-mop',function(){ var a=D.activeElement; if(ov.classList.contains('on')&&!(a&&ov.contains(a)&&/^(INPUT|SELECT)$/.test(a.tagName))) draw(); clearTimeout(decorate.t3); decorate.t3=setTimeout(decorate,60) });
setTimeout(probe,1800); setTimeout(decorate,500);
window.AtriumTaskFields={ open:openSheet };
})();
