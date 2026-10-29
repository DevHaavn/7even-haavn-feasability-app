/* ATRIUM Chat: the live meeting room.
   A meeting card in a chat gets an Open room button. The room shows the agenda and everything typed into the meeting as it runs: decisions, actions (with an owner and a due
   date), questions and notes. The chair (or a director) ends the meeting: actions become real tasks, decisions go to the meeting's decisions log and the minutes are posted to the meeting chat.
   Server calls (ATRIUM wave two): meetingRoom { meetingId }, meetingItemAdd { meetingId, kind, text, own?, due? }, meetingItemEdit { id, text?, kind?, own?, due? },
   meetingItemRemove { id }, endMeeting { meetingId, email?, close? }. Needs the database update supabase/2026-10-30_chat_meeting_room.sql; before it, the server says so and the message is shown as written.
   Stays out of the way (no button) until the server knows meetingRoom. On practice data the room works in memory and nothing is filed. Needs window.AtriumChat. */
(function(){
'use strict';
var D=document, C=window.AtriumChat;
if(!C||!D.getElementById('msgs')) return;
function $(s,r){ return (r||D).querySelector(s) }
function $$(s,r){ return Array.prototype.slice.call((r||D).querySelectorAll(s)) }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
function first(id){ var p=C.person(id); return p&&p.n&&p.n!=='Someone'?p.n.split(' ')[0]:(typeof id==='string'&&id.indexOf(' ')>-1?id.split(' ')[0]:'Someone') }
var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function clock(ms){ var d=new Date(ms), h=d.getHours()%12||12; return h+':'+String(d.getMinutes()).padStart(2,'0')+' '+(d.getHours()<12?'am':'pm') }
function dayOf(s){ var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||''); return m?new Date(+m[1],+m[2]-1,+m[3]):null }
function dueText(s){ var d=dayOf(s); return d?DOW[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()]:'' }
var KINDS=[['decision','Decision'],['action','Action'],['question','Question'],['note','Note']];
function kindName(k){ return KINDS.filter(function(x){ return x[0]===k })[0][1] }

/* switched on only once the server knows meetingRoom ("Unknown action." means not yet) */
var SUP=null, supAt=0, supBusy=false;
function on(){ return !C.real()||SUP===true }
function probe(){ if(!C.real()||SUP===true||supBusy||Date.now()-supAt<60000) return; supBusy=true; supAt=Date.now();
  C.api('meetingRoom',{meetingId:'__probe'}).then(function(){ SUP=true }).catch(function(er){ var s=er&&er.status; if(s===404&&/unknown action/i.test(er.message||'')) SUP=false; else if(s&&s!==401) SUP=true }).then(function(){ supBusy=false; if(SUP===true) decorate() }) }

/* ---------- the room, a full sheet ---------- */
var ov=D.createElement('div'); ov.className='ov nx'; ov.id='nxRoom';
ov.innerHTML='<div class="sheet nx-roomsheet"><div class="nx-rh"><div><h3 id="nxRT"></h3><div class="lead" id="nxRL"></div></div><button type="button" class="nx-rx" data-x aria-label="Close">&times;</button></div><div class="nx-rb" id="nxRB"></div><div class="nx-radd" id="nxRA"></div></div>';
D.body.appendChild(ov); ov.addEventListener('click',function(e){ if(e.target===ov||e.target.closest('[data-x]')) close() });
var mid=null, data=null, kind='decision', LOCAL={}, timer=0, busy=false, editing=null, ending=false, fromGid='';
function close(){ ov.classList.remove('on'); clearInterval(timer); timer=0; mid=null; data=null; editing=null; ending=false }
function practiceRoom(card){ var items=LOCAL[mid]||(LOCAL[mid]=[]); return {meeting:{id:mid,title:card.t||'Meeting',date:card.d||'',time:card.tm||'',closed:false,gid:'',chair:C.me(),attendees:[],canEnd:true},agenda:[],items:items} }
async function load(card){ if(busy) return; busy=true;
  try{ var j=C.real()?await C.api('meetingRoom',{meetingId:mid}):practiceRoom(card||{}); data=j; draw() }
  catch(er){ if(!data) { $('#nxRB').innerHTML='<div class="nx-empty">'+esc((er&&er.message)||'The room could not open.')+'</div>'; $('#nxRA').innerHTML='' } }
  busy=false }
function openRoom(meetingId,card,gid){ mid=String(meetingId); fromGid=gid||C.cur()||''; data=null; editing=null; ending=false; kind='decision'; $('#nxRT').textContent=(card&&card.t)||'Meeting'; $('#nxRL').textContent='Opening the room...'; $('#nxRB').innerHTML=''; $('#nxRA').innerHTML='';
  $$('.ov.nx.on').forEach(function(x){ x.classList.remove('on') }); ov.classList.add('on'); load(card); clearInterval(timer); timer=setInterval(function(){ var a=D.activeElement; if(ov.classList.contains('on')&&!ending&&!editing&&!(a&&ov.contains(a)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))) load(card) },5000) }
function statusLine(m){ if(m.closed) return 'Closed'; var d=dayOf(m.date), n=new Date(), same=d&&d.toDateString()===n.toDateString(); return (same?'Today':(d?DOW[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()]:'No date'))+(m.time?', '+m.time:'')+' · '+(m.attendees||[]).length+' people'+(m.chair?' · Chair '+esc(first(m.chair)):'') }
/* before it starts: what is open in the chat, and what the last meeting decided */
function packHtml(m){ var gid=m.gid||fromGid; if(m.closed||!gid||!C.hasGroup(gid)) return ''; var ms=C.msgsIn(gid).filter(function(x){ return !x.del });
  var tasks=ms.filter(function(x){ return x.task&&!x.task.done&&x.task.title }).slice(-5).reverse(), mins=ms.filter(function(x){ return x.x&&/^Minutes: /.test(x.x) }).pop();
  if(!tasks.length&&!mins) return '';
  var h='<div class="mono nx-tkh">Before you start</div>';
  if(mins){ var lines=String(mins.x).split('\n').map(function(l){ return l.trim() }).filter(Boolean); h+='<div class="nx-pk"><b>Last minutes</b><span>'+esc(lines[0].replace(/^Minutes:\s*/,''))+'</span>'+lines.slice(1,4).filter(function(l){ return l!=='Decisions' }).map(function(l){ return '<small>'+esc(l)+'</small>' }).join('')+'</div>' }
  if(tasks.length) h+='<div class="nx-pk"><b>Open tasks in this chat</b>'+tasks.map(function(t){ return '<span>'+esc(t.task.title)+'<small>'+esc(first(t.task.own))+(t.task.due?' \u00b7 due '+esc(dueText(t.task.due)):'')+'</small></span>' }).join('')+'</div>';
  return h }
function itemHtml(it){ var me=C.me(), mine=it.by===me||(data&&data.meeting&&data.meeting.canEnd), ed=editing===it.id&&!it.filed;
  var who=it.k==='action'?'<span class="nx-ri">'+(it.own?esc(first(it.own)):'No owner')+(it.due?' · due '+esc(dueText(it.due)):'')+'</span>':'';
  var body=ed?'<div class="nx-ckadd"><input id="nxRE" type="text" value="'+esc(it.x)+'" maxlength="500"></div><div class="nx-rowbtns"><button type="button" class="chip nx-ro" data-esave="'+it.id+'">Save</button><button type="button" class="chip nx-ro" data-ecancel>Cancel</button></div>':'<div class="nx-rt">'+esc(it.x)+'</div>';
  return '<div class="nx-it k-'+esc(it.k)+(it.filed?' filed':'')+'" data-i="'+it.id+'"><div class="nx-ih"><span class="nx-kd">'+esc(kindName(it.k))+'</span>'+who+(it.filed?'<span class="nx-ri">Filed'+(it.tm?' as a task':'')+'</span>':'')+'</div>'+body+'<div class="nx-im"><span>'+esc(first(it.by))+' · '+esc(clock(it.t))+'</span>'+(mine&&!it.filed&&!ed&&!data.meeting.closed?'<span><button type="button" class="nx-lnk" data-edit="'+it.id+'">Edit</button> <button type="button" class="nx-lnk" data-rm="'+it.id+'">Remove</button></span>':'')+'</div></div>' }
function ownerOptions(){ var att=(data.meeting.attendees||[]).map(function(n){ return String(n).toLowerCase() }), me=C.me(), seen={}, out=[];
  C.people().forEach(function(p){ if(!p||!p.id||seen[p.id]||p.ext) return; if(att.length&&att.indexOf(String(p.n||'').toLowerCase())<0&&p.id!==me) return; seen[p.id]=1; out.push(p) });
  return out.map(function(p){ return '<option value="'+esc(p.id)+'"'+(p.id===me?' selected':'')+'>'+esc(p.n)+'</option>' }).join('') }
function draw(){ if(!data) return; var m=data.meeting; $('#nxRT').textContent=m.title; $('#nxRL').innerHTML=statusLine(m);
  var h='';
  if(data.agenda&&data.agenda.length) h+='<div class="mono nx-tkh">Agenda</div>'+data.agenda.map(function(a){ return '<div class="nx-ag'+(a.d?' done':'')+'"><span>'+esc(a.t)+'</span>'+(a.o?'<small>'+esc(first(a.o))+'</small>':'')+'</div>' }).join('');
  h+=packHtml(m);
  var items=data.items||[]; h+='<div class="mono nx-tkh">In the room'+(items.length?' · '+items.length:'')+'</div>';
  h+=items.length?items.map(itemHtml).join(''):'<div class="nx-empty">Nothing yet. Decisions, actions, questions and notes you type here are filed when the meeting ends.</div>';
  if(ending) h+=endHtml(items);
  var keep=$('#nxRB').scrollTop; $('#nxRB').innerHTML=h; $('#nxRB').scrollTop=keep;
  var a='';
  if(m.closed) a='<div class="lead" style="margin:0">This meeting is closed. Everything was filed.</div>';
  else { a='<div class="seg2 nx-st4">'+KINDS.map(function(k){ return '<button type="button" data-k="'+k[0]+'" class="'+(kind===k[0]?'on':'')+'">'+k[1]+'</button>' }).join('')+'</div>'
    +'<div class="nx-addrow"><input id="nxRI" type="text" maxlength="500" autocomplete="off" enterkeyhint="send" placeholder="'+({decision:'What was decided',action:'What needs doing',question:'The open question',note:'A note for the minutes'})[kind]+'"><button type="button" class="cb go" id="nxRGo">Add</button></div>'
    +(kind==='action'?'<div class="row" style="margin-top:8px"><div class="f"><label class="mono" for="nxRO">Owner</label><select id="nxRO">'+ownerOptions()+'</select></div><div class="f"><label class="mono" for="nxRD">Due</label><input type="date" id="nxRD"></div></div>':'')
    +(m.canEnd&&!ending?'<div class="row" style="margin-top:10px"><button type="button" class="cb" id="nxREnd">End meeting</button></div>':''); }
  var typed=$('#nxRI')?$('#nxRI').value:''; $('#nxRA').innerHTML=a; if(typed&&$('#nxRI')) $('#nxRI').value=typed }
function endHtml(items){ var todo=items.filter(function(i){ return !i.filed }), ac=todo.filter(function(i){ return i.k==='action' }).length, dc=todo.filter(function(i){ return i.k==='decision' }).length;
  return '<div class="nx-end"><h4>End the meeting?</h4><div class="lead">'+ac+' action'+(ac===1?'':'s')+' become tasks for their owners, '+dc+' decision'+(dc===1?' goes':'s go')+' to the decisions log, and the minutes are posted to the meeting chat.</div>'
   +'<label class="nx-chk"><input type="checkbox" id="nxEMail"> Email the minutes to everyone on the meeting</label><label class="nx-chk"><input type="checkbox" id="nxEClose" checked> Close the meeting after filing</label>'
   +'<div class="row" style="margin-top:12px"><button type="button" class="cb" data-eback>Not yet</button><button type="button" class="cb go" id="nxEGo">End and file</button></div></div>' }

/* ---------- actions ---------- */
async function add(){ var t=$('#nxRI'); if(!t) return; var text=t.value.trim(); if(!text){ C.flash('Type what was said.'); return }
  var args={meetingId:mid,kind:kind,text:text}; if(kind==='action'){ args.own=$('#nxRO')?$('#nxRO').value:undefined; var d=$('#nxRD'); if(d&&d.value) args.due=d.value }
  var b=$('#nxRGo'); if(b) b.disabled=true;
  try{ var item; if(C.real()){ var j=await C.api('meetingItemAdd',args); item=j.item } else { item={id:Date.now(),k:kind,x:text,own:args.own||C.me(),due:args.due||'',by:C.me(),t:Date.now()}; (LOCAL[mid]=LOCAL[mid]||[]).push(item) }
    if(C.real()) data.items=(data.items||[]).concat([item]); else data.items=LOCAL[mid]; t.value=''; draw(); var bb=$('#nxRB'); bb.scrollTop=bb.scrollHeight; var ni=$('#nxRI'); if(ni) ni.focus()
  }catch(er){ C.flash((er&&er.message)||'That could not be added.'); if(b) b.disabled=false } }
async function save(id){ var v=($('#nxRE')||{}).value; v=(v||'').trim(); if(!v){ C.flash('Type what was said.'); return }
  try{ if(C.real()){ var j=await C.api('meetingItemEdit',{id:id,text:v}); data.items=data.items.map(function(x){ return x.id===id?j.item:x }) } else data.items.forEach(function(x){ if(x.id===id) x.x=v }); editing=null; draw() }catch(er){ C.flash((er&&er.message)||'That could not be saved.') } }
async function remove(id){ try{ if(C.real()) await C.api('meetingItemRemove',{id:id}); data.items=data.items.filter(function(x){ return x.id!==id }); if(!C.real()) LOCAL[mid]=data.items; draw() }catch(er){ C.flash((er&&er.message)||'That could not be removed.') } }
async function endIt(){ var b=$('#nxEGo'); if(b) b.disabled=true; var email=!!($('#nxEMail')||{}).checked, closeIt=!!($('#nxEClose')||{}).checked;
  try{ if(!C.real()){ C.flash('Practice data: nothing was filed.'); ending=false; draw(); return }
    var j=await C.api('endMeeting',{meetingId:mid,email:email||undefined,close:closeIt||undefined}); ending=false; await load();
    var bits=[(j.tasks||0)+' task'+((j.tasks||0)===1?'':'s')+' created',(j.decisions||0)+' decision'+((j.decisions||0)===1?'':'s')+' logged']; C.flash('Meeting filed: '+bits.join(', ')+'. Minutes posted to the chat.'+(j.emailed?' Emailed to '+j.emailed+'.':''));
    (j.skipped||[]).slice(0,2).forEach(function(s){ C.flash('Skipped: '+(s.why||s)) }); if(j.closed) setTimeout(close,1200)
  }catch(er){ C.flash((er&&er.message)||'The meeting could not be ended.'); if(b) b.disabled=false } }
ov.addEventListener('click',function(e){
  var k=e.target.closest('[data-k]'); if(k){ kind=k.getAttribute('data-k'); draw(); var i=$('#nxRI'); if(i) i.focus(); return }
  if(e.target.closest('#nxRGo')) return add();
  var ed=e.target.closest('[data-edit]'); if(ed){ editing=+ed.getAttribute('data-edit'); draw(); var x=$('#nxRE'); if(x){ x.focus(); x.select() } return }
  if(e.target.closest('[data-ecancel]')){ editing=null; draw(); return }
  var sv=e.target.closest('[data-esave]'); if(sv) return save(+sv.getAttribute('data-esave'));
  var rm=e.target.closest('[data-rm]'); if(rm) return remove(+rm.getAttribute('data-rm'));
  if(e.target.closest('#nxREnd')){ ending=true; draw(); var en=$('.nx-end'); if(en) en.scrollIntoView({block:'center'}); return }
  if(e.target.closest('[data-eback]')){ ending=false; draw(); return }
  if(e.target.closest('#nxEGo')) return endIt() });
ov.addEventListener('keydown',function(e){ if(e.key==='Enter'&&e.target.id==='nxRI'){ e.preventDefault(); add() } else if(e.key==='Enter'&&e.target.id==='nxRE'){ e.preventDefault(); save(editing) } else if(e.key==='Escape'){ if(editing){ editing=null; draw() } else close() } });

/* ---------- the Open room button on a meeting card ---------- */
function decorate(){ if(!on()) return;
  $$('#msgs .mr[data-m]').forEach(function(r){ var card=$('.mtcard',r); if(!card||$('.nx-room',card)) return; var m=C.msg(r.getAttribute('data-m')); if(!m||!m.mt||m.del) return;
    var b=D.createElement('button'); b.type='button'; b.className='chip nx-room'; b.setAttribute('data-room',m.mt.id); b.textContent='Open room'; card.appendChild(b) }) }
new MutationObserver(function(){ clearTimeout(decorate.t); decorate.t=setTimeout(decorate,60) }).observe($('#msgs'),{childList:true});
D.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-room]'); if(!b) return; e.stopPropagation(); e.preventDefault(); var row=b.closest('.mr'), m=row&&C.msg(row.getAttribute('data-m')); openRoom(b.getAttribute('data-room'),m&&m.mt,m&&m.g) },true);
setTimeout(probe,2000); setTimeout(decorate,600);
window.AtriumRoom={ open:openRoom, current:function(){ return data?{id:mid,meeting:data.meeting}:null } };
})();
