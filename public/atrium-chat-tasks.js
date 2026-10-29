/* ATRIUM Chat: My Tasks.
   The Tasks tab in the side bar (and on a phone) opens one list of everything set to you, across every chat, grouped by when it is due, with a quick add that reads plain
   English ("Daniel to send the Belmont cash flow by Friday #Belmont !high"). The tasks in the open chat are still in the chat's own side panel.
   Signed in, it uses ATRIUM's myTasks, taskAdd and taskDone. On practice data it reads the practice chats' tasks and adds in memory.
   Needs the bridge in atrium-chat.html: window.AtriumChat = { api, flash, open, real, me, role, people, person, projects, hasGroup, localTasks, tick }. */
(function(){
'use strict';
var D=document, B=D.body, C=window.AtriumChat;
if(!C||!D.getElementById('list')) return;
function $(s,r){ return (r||D).querySelector(s) }
function $$(s,r){ return Array.prototype.slice.call((r||D).querySelectorAll(s)) }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
function PHONE(){ return innerWidth<=760 }
var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function today(){ var d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()) }
function addDays(n){ var d=today(); d.setDate(d.getDate()+n); return d }
function parseDue(s){ var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||''); return m?new Date(+m[1],+m[2]-1,+m[3]):null }
function ymd(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0') }
function fmt(d){ return d?DOW[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()]:'' }
function diff(d){ return Math.round((d-today())/86400000) }
function bucket(t){ var d=parseDue(t.due); if(!d) return 'No date'; var n=diff(d); return n<0?'Overdue':n===0?'Today':n<=6?'This week':'Later' }
function first(id){ var p=C.person(id); return p&&p.n?p.n.split(' ')[0]:'Someone' }

var panel=D.createElement('div'); panel.className='nx-panel'; panel.id='nxTasks'; $('#list').appendChild(panel);
var rows=[], TAB='mine', PF='All', SHOWDONE=false, LOADING=false, ERR='', extra=[], open=false, seq=0;

function setTitle(t){ var lw=$('#listT .lw'); if(lw) lw.textContent=t }
function railActive(on){ $$('#rail .rb,#tabbar button').forEach(function(b){ b.classList.remove('on') }); $$(on?'#rail [data-v="tasks"],#tabbar [data-v="tasks"]':'#rail [data-v="chat"],#tabbar [data-v="chat"]').forEach(function(b){ b.classList.add('on') }) }
function show(){ if(PHONE()&&B.classList.contains('in-thread')){ var bb=$('#backBtn'); if(bb) bb.click() } open=true; B.classList.add('nx-tasks'); setTitle('Tasks'); railActive(true); load() }
function hide(){ if(!open) return; open=false; B.classList.remove('nx-tasks'); setTitle('Chat') }

/* the rail and the phone tab bar: Tasks opens this list. Every other button closes it and does its own job. */
D.addEventListener('click',function(e){
  var t=e.target.closest&&e.target.closest('#rail .rb,#tabbar button'); if(!t) return;
  if(t.getAttribute('data-v')==='tasks'){ e.stopPropagation(); e.preventDefault(); if(open){ hide(); railActive(false) } else show(); return }
  if(t.id==='rfBtn'||t.id==='schRail') return;
  hide() },true);

async function load(){
  var my=++seq; ERR=''; LOADING=true; draw();
  try{
    if(C.real()){ var j=await C.api('myTasks',SHOWDONE?{include:'all'}:{}); if(my!==seq) return; rows=(j&&j.tasks)||[] }
    else rows=C.localTasks()
  }catch(er){ if(my!==seq) return; ERR=(er&&er.status===401)?'Sign in to see your tasks.':'Could not load your tasks.'; rows=[] }
  LOADING=false; draw() }

function view(){
  var me=C.me(), all=rows.concat(extra);
  var mine=all.filter(function(t){ return TAB==='mine'?t.own===me:(t.by===me&&t.own!==me) });
  var shown=mine.filter(function(t){ return (PF==='All'||t.proj===PF)&&(SHOWDONE||!t.done) });
  return {mine:mine,shown:shown} }
function draw(){
  var v=view(), me=C.me(), ext=C.role()==='external';
  var projs=['All'].concat(v.mine.map(function(t){ return t.proj||'No project' }).filter(function(x,i,a){ return a.indexOf(x)===i }));
  var h='<div class="seg2" id="nxTab"><button type="button" data-t="mine" class="'+(TAB==='mine'?'on':'')+'">Set to me</button><button type="button" data-t="others" class="'+(TAB==='others'?'on':'')+'">Waiting on others</button></div>';
  h+='<div class="nx-chips">'+projs.map(function(p){ return '<button type="button" class="chip'+(PF===p?' on':'')+'" data-p="'+esc(p)+'">'+esc(p)+'</button>' }).join('')+'<button type="button" class="chip'+(SHOWDONE?' on':'')+'" data-done-toggle>Show done</button></div>';
  if(!ext) h+='<div class="nx-q"><input id="nxIn" type="text" placeholder="Add a task in plain words" autocomplete="off" enterkeyhint="done" aria-label="Add a task"><div class="nx-pv" id="nxPv"></div></div>';
  if(LOADING&&!rows.length) h+='<div class="nx-empty">Loading your tasks...</div>';
  else if(ERR) h+='<div class="nx-empty">'+esc(ERR)+' <button type="button" class="chip" data-retry>Try again</button></div>';
  else {
    var any=false;
    ['Overdue','Today','This week','Later','No date'].forEach(function(b){
      var list=v.shown.filter(function(t){ return bucket(t)===b }).sort(function(a,c){ var x=parseDue(a.due),y=parseDue(c.due); return (x?x.getTime():9e15)-(y?y.getTime():9e15)||(c.t||0)-(a.t||0) }); if(!list.length) return; any=true;
      h+='<div class="nx-gh'+(b==='Overdue'?' rd':'')+'"><span class="mono">'+b+'</span><span class="mono">'+list.length+'</span></div>'+list.map(function(t){ var d=parseDue(t.due), cls=b==='Overdue'?'rd':b==='Today'?'gd':'', who=TAB==='others'?' · '+esc(first(t.own)):'';
        return '<div class="nx-tr'+(t.done?' done':'')+'" data-k="'+esc(t.mid)+'"><button type="button" class="chk'+(t.done?' done':'')+'" data-ck="'+esc(t.mid)+'" aria-label="'+(t.done?'Mark not done':'Mark done')+'"></button><div class="tx">'+esc(t.title)+'<small>'+esc(t.g||t.proj||'')+who+(t.pri&&t.pri!=='Normal'?' · '+esc(t.pri):'')+'</small></div><span class="due '+cls+'">'+esc(fmt(d))+'</span></div>' }).join('') });
    if(!any) h+='<div class="nx-empty">Nothing here. A clear list.</div> '
  }
  var keep=$('#nxIn')?$('#nxIn').value:''; panel.innerHTML=h; var inp=$('#nxIn'); if(inp&&keep){ inp.value=keep } pv() }

/* ticking */
async function tick(mid,done){
  var t=rows.concat(extra).filter(function(x){ return String(x.mid)===String(mid) })[0]; if(!t) return; var was=t.done; t.done=done; draw();
  try{ await C.tick(mid,done) }catch(er){ t.done=was; draw(); C.flash((er&&er.message)||'That could not be saved.') } }
/* a task from the hidden My tasks group has no chat to open, so it opens here */
var sheet=D.createElement('div'); sheet.className='ov nx'; sheet.id='nxTaskSheet'; sheet.innerHTML='<div class="sheet"><h3 id="nxSt"></h3><div class="lead" id="nxSl"></div><div class="row" style="margin-top:14px"><button type="button" class="cb" data-x>Close</button><button type="button" class="cb go" id="nxSd"></button></div></div>'; D.body.appendChild(sheet);
sheet.addEventListener('click',function(e){ if(e.target===sheet||e.target.closest('[data-x]')) sheet.classList.remove('on') });
var cur=null;
$('#nxSd',sheet).addEventListener('click',function(){ if(cur){ tick(cur.mid,!cur.done); sheet.classList.remove('on') } });
function inline(t){ cur=t; $('#nxSt',sheet).textContent=t.title; $('#nxSl',sheet).innerHTML=[ 'Set to '+esc(first(t.own))+(t.by&&t.by!==t.own?' by '+esc(first(t.by)):''), t.due?'Due '+esc(fmt(parseDue(t.due))):'No due date', esc(t.proj||'No project'), t.pri&&t.pri!=='Normal'?esc(t.pri)+' priority':'', t.wf?'In Workflow':'', t.ag?'On the Monday agenda':'' ].filter(Boolean).join('<br>'); $('#nxSd',sheet).textContent=t.done?'Mark not done':'Mark done'; sheet.classList.add('on') }

panel.addEventListener('click',function(e){
  var c=e.target.closest('[data-ck]'); if(c){ e.stopPropagation(); var t=rows.concat(extra).filter(function(x){ return String(x.mid)===c.getAttribute('data-ck') })[0]; if(t) tick(t.mid,!t.done); return }
  var tb=e.target.closest('#nxTab [data-t]'); if(tb){ TAB=tb.getAttribute('data-t'); PF='All'; draw(); return }
  if(e.target.closest('[data-done-toggle]')){ SHOWDONE=!SHOWDONE; load(); return }
  if(e.target.closest('[data-retry]')){ load(); return }
  var p=e.target.closest('.nx-chips [data-p]'); if(p){ PF=p.getAttribute('data-p'); draw(); return }
  var r=e.target.closest('.nx-tr'); if(r){ var t2=rows.concat(extra).filter(function(x){ return String(x.mid)===r.getAttribute('data-k') })[0]; if(!t2) return; if(t2.gid&&C.hasGroup(t2.gid)){ C.open(t2.gid) } else inline(t2) } });

/* quick add: a name first, a due word, #project, !high */
function parse(s){ var own=C.me(), due=null, proj='', pri='Normal', t=' '+s+' ', m;
  var ppl=C.people().filter(function(p){ return p.n&&!p.ext });
  function byFirst(w){ w=w.toLowerCase(); return ppl.filter(function(p){ return p.n.split(' ')[0].toLowerCase()===w })[0] }
  m=/^\s*([A-Za-z]+)\s+to\s+/.exec(t); if(m&&byFirst(m[1])){ own=byFirst(m[1]).id; t=' '+t.slice(m[0].length) }
  m=/\s@([A-Za-z]+)\b/.exec(t); if(m&&byFirst(m[1])){ own=byFirst(m[1]).id; t=t.replace(m[0],' ') }
  m=/\s#([A-Za-z0-9]+)/.exec(t); if(m){ var q=m[1].toLowerCase(), pj=C.projects().filter(function(p){ return p.toLowerCase().replace(/[^a-z0-9]/g,'').indexOf(q)===0 })[0]; if(pj) proj=pj; t=t.replace(m[0],' ') }
  m=/\s!(high|low|urgent|medium)\b/i.exec(t); if(m){ var w=m[1].toLowerCase(); pri=w==='low'?'Low':w==='medium'?'Medium':'High'; t=t.replace(m[0],' ') }
  m=/\s(?:by\s+)?(today|tomorrow|next week|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i.exec(t);
  if(m){ var wd=m[1].toLowerCase(); if(wd==='today') due=addDays(0); else if(wd==='tomorrow') due=addDays(1); else if(wd==='next week') due=addDays(7); else { var idx=['sun','mon','tue','wed','thu','fri','sat'].indexOf(wd.slice(0,3)), n=(idx-today().getDay()+7)%7; if(n===0) n=7; due=addDays(n) } t=t.replace(m[0],' ') }
  t=t.replace(/\s+/g,' ').trim().replace(/^(to|send)\s+(?=\w)/i,function(a){ return /^send/i.test(a)?'Send ':'' }); t=t?t.charAt(0).toUpperCase()+t.slice(1):'';
  return {title:t,own:own,due:due,proj:proj,pri:pri} }
function pv(){ var i=$('#nxIn'); if(!i) return null; var v=i.value.trim(), box=$('#nxPv'); if(!v){ box.innerHTML='<span>A name first, a due word, #project, !high</span>'; return null }
  var p=parse(v); box.innerHTML='<span class="chip">'+esc(first(p.own))+'</span>'+(p.due?'<span class="chip gd">'+esc(fmt(p.due))+'</span>':'<span class="chip">No date</span>')+(p.proj?'<span class="chip gd">'+esc(p.proj)+'</span>':'<span class="chip">No project</span>')+(p.pri!=='Normal'?'<span class="chip r">'+esc(p.pri)+'</span>':'')+'<span>Enter to add</span>'; return p }
panel.addEventListener('input',function(e){ if(e.target.id==='nxIn') pv() });
panel.addEventListener('keydown',async function(e){
  if(e.target.id!=='nxIn'||e.key!=='Enter') return; var p=pv(); if(!p||!p.title) return; var inp=e.target; inp.disabled=true;
  try{
    if(C.real()){ var arg={title:p.title,own:p.own,pri:p.pri}; if(p.due) arg.due=ymd(p.due); if(p.proj) arg.proj=p.proj; var j=await C.api('taskAdd',arg); C.flash('Task set'+(j&&j.task&&j.task.g?' in '+j.task.g:'')); inp.value=''; await load() }
    else { extra.push({mid:'x'+Date.now(),gid:'',g:'Practice data',title:p.title,own:p.own,by:C.me(),due:p.due?ymd(p.due):'',pri:p.pri,proj:p.proj||'No project',done:false,wf:true,ag:false,t:Date.now()}); TAB=p.own===C.me()?'mine':'others'; PF='All'; inp.value=''; draw(); C.flash('Practice data: this task is not saved.') }
  }catch(er){ C.flash((er&&er.message)||'That task could not be added.') }
  var n=$('#nxIn'); if(n){ n.disabled=false; n.focus() } });
})();
