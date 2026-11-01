/* ATRIUM Chat: the Today card.
   One card sits at the top of the chat list all day, fresh each morning: the tasks set to you that are due today or overdue, today's meetings, reminders set for today, and the chats
   with something unread. Each is a tile with a number; tap a tile to open its list under it, tap again to close. Tap a task to open its details sheet (status, checklist, due date, priority,
   reminder) and update it without leaving Chat; the circle ticks it done. The arrow at the top folds the whole card to one line for the rest of the day.
   It is built on the screen from calls that already exist (myCalendar, myTasks, myReminders) and follows live changes as tasks are ticked or chats are read; a call that fails, or that your
   login is not allowed to make, just leaves that part out. Workflow tasks that are yours and have no chat of their own are listed too (read only: shown with a dashed circle, opened for details, updated in Workflow). On practice data it shows the practice calendar and tasks. Tasks are the ones in Chat (including those sent on to Workflow).
   Needs window.AtriumChat (see atrium-chat-tasks.js) and, for the details sheet, atrium-chat-taskfields.js. window.AtriumMorning.show(true) re-draws it, for testing. */
(function(){
'use strict';
var D=document, C=window.AtriumChat;
if(!C||!D.getElementById('groups')) return;
if(/[?&]embed=1/.test(location.search)) return;
function $(s,r){ return (r||D).querySelector(s) }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
function first(id){ var p=C.person(id); return p&&p.n?p.n.split(' ')[0]:'' }
var DOW=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
function mel(){ var p=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Melbourne',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).reduce(function(a,x){ a[x.type]=x.value; return a },{});
  return {day:p.year+'-'+p.month+'-'+p.day, hour:+p.hour, stamp:p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute+':00'} }
function t12(s){ var h=+String(s).slice(11,13), m=String(s).slice(14,16); return (h%12||12)+(m==='00'?'':':'+m)+(h<12?'am':'pm') }
function dayName(ymd){ var d=new Date(ymd+'T12:00:00'); return DOW[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()] }
var KEY='atrium-chat-today-v1', memFold='';
function folded(){ var t=mel().day; try{ var v=JSON.parse(localStorage.getItem(KEY)||'null'); return !!(v&&v.d===t&&v.f) }catch(e){ return memFold===t } }
function setFold(f){ var t=mel().day; memFold=f?t:''; try{ localStorage.setItem(KEY,JSON.stringify({d:t,f:f?1:0})) }catch(e){} }
function plural(n,w){ return n+' '+w+(n===1?'':'s') }
function dlabel(s){ var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||''); if(!m) return ''; var d=new Date(+m[1],+m[2]-1,+m[3]); return DOW[d.getDay()].slice(0,3)+' '+d.getDate()+' '+MON[d.getMonth()].slice(0,3) }

var st={visible:false,loaded:false,meetings:[],tk:[],rems:[],un:{unread:0,chats:0,list:[]},open:'',expand:false}, html='', lastSig='';
var CHEV='<svg class="nx-tc" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5"/></svg>';
var PRIW={High:0,Medium:1,Normal:2,Low:3};
/* my open tasks that are due today or earlier, overdue first, then by priority */
function dueSplit(){ var me=C.me(), today=mel().day;
  var all=st.tk.filter(function(t){ return t.own===me&&t.due&&t.due<=today&&(!t.done||t.fresh) });
  function srt(a,b){ return (PRIW[a.pri||'Normal']-PRIW[b.pri||'Normal'])||((b.t||0)-(a.t||0)) }
  var late=all.filter(function(t){ return t.due<today }).sort(function(a,b){ return a.due<b.due?-1:a.due>b.due?1:srt(a,b) }), now=all.filter(function(t){ return t.due===today }).sort(srt);
  return {late:late,now:now,n:all.filter(function(t){ return !t.done }).length,nLate:late.filter(function(t){ return !t.done }).length,nNow:now.filter(function(t){ return !t.done }).length} }

function tile(s,label,n,sub,warn){ return '<button type="button" class="nx-tile'+(st.open===s?' on':'')+(n?'':' z')+'" data-mc="tile" data-s="'+s+'" aria-expanded="'+(st.open===s)+'"><span class="nx-tl mono">'+label+'</span><span class="nx-tn">'+n+'</span><span class="nx-ts'+(warn?' rd':'')+'">'+esc(sub||' ')+'</span>'+CHEV+'</button>' }
function taskRow(t,late){ var wfo=t.src==='wf', bits=[wfo?'Workflow'+(t.proj&&t.proj!=='No project'?' \u00b7 '+t.proj:''):(t.g||(t.proj&&t.proj!=='No project'?t.proj:''))]; if(t.pri&&t.pri!=='Normal') bits.push(t.pri); var m=C.msg(t.mid), s=(m&&m.task&&m.task.st)||t.st; if(s==='doing') bits.push('Doing'); else if(s==='blocked') bits.push('Blocked');
  return '<div class="nx-tk'+(t.done?' done':'')+'">'+(wfo?'<span class="chk wfo" aria-hidden="true"></span>':'<button type="button" class="chk'+(t.done?' done':'')+'" data-mc="tick" data-m="'+esc(t.mid)+'" aria-label="'+(t.done?'Mark not done':'Mark done')+'"></button>')+'<button type="button" class="nx-tkb" data-mc="task" data-m="'+esc(t.mid)+'" data-g="'+esc(t.gid||'')+'"><span class="nx-tkt">'+esc(t.title)+'</span><span class="nx-tks">'+esc(bits.filter(Boolean).join(' · '))+'</span></button><span class="nx-tkd'+(late?' rd':'')+'">'+(late?esc(dlabel(t.due)):'Today')+'</span></div>' }
function section(){ var o=st.open, h='';
  if(o==='tasks'){ var d=dueSplit();
    if(!d.late.length&&!d.now.length) h='<div class="nx-mn">Nothing due. A clear list.</div>';
    else { var cap=8, n=0; function take(list){ var r=list.slice(0,Math.max(0,cap-n)); n+=r.length; return r }
      var L=take(d.late), N=take(d.now), more=d.late.length+d.now.length-n;
      if(L.length) h+='<div class="nx-mh mono rd">Overdue</div>'+L.map(function(t){ return taskRow(t,true) }).join('');
      if(N.length) h+='<div class="nx-mh mono">Due today</div>'+N.map(function(t){ return taskRow(t,false) }).join('');
      h+='<button type="button" class="nx-mr nx-more" data-mc="tasks">'+(more>0?'+ '+plural(more,'more task')+' · ':'')+'All my tasks</button>' } }
  else if(o==='meet'){ h=st.meetings.slice(0,6).map(function(e){ return '<button type="button" class="nx-mr" data-mc="cal"><span class="nx-mt">'+(e.allDay?'All day':t12(e.start))+'</span><span class="nx-mx">'+esc(e.subject)+'</span></button>' }).join('')+'<button type="button" class="nx-mr nx-more" data-mc="cal">Open my calendar</button>' }
  else if(o==='rem'){ h=st.rems.slice(0,6).map(function(r){ return '<button type="button" class="nx-mr" data-mc="rem" data-g="'+esc(r.gid)+'" data-m="'+esc(r.mid)+'"><span class="nx-mt">'+esc(r.time)+'</span><span class="nx-mx">'+esc(r.text)+'</span></button>' }).join('') }
  else if(o==='unread'){ var u=st.un, lst=st.expand?u.list:u.list.slice(0,4);
    h=lst.map(function(g){ return '<button type="button" class="nx-mr nx-un" data-mc="chat" data-g="'+esc(g.id)+'"><span class="nx-ub'+(g.men?' men':'')+'">'+g.n+'</span><span class="nx-uc"><span class="nx-un1">'+esc(g.name)+(g.men?'<i>Mentioned you</i>':'')+'</span><span class="nx-un2">'+esc(g.who?g.who+': ':'')+esc(g.text)+'</span></span></button>' }).join('')
      +(u.list.length>4?'<button type="button" class="nx-mr nx-more" data-mc="unmore">'+(st.expand?'Show fewer':'+ '+plural(u.list.length-4,'more chat'))+'</button>':'') }
  return h?'<div class="nx-sec">'+h+'</div>':'' }
function summary(){ var d=dueSplit(), b=[]; if(d.n) b.push(plural(d.n,'task')+' due'); if(st.meetings.length) b.push(plural(st.meetings.length,'meeting')); if(st.rems.length) b.push(plural(st.rems.length,'reminder')); if(st.un.unread) b.push(st.un.unread+' unread'); return b.length?b.join(' · '):'A clear day' }
function build(){ var m=mel(), me=C.me(), nm=first(me), hello=m.hour<12?'Good morning':m.hour<17?'Good afternoon':'Good evening', fold=folded(), d=dueSplit();
  var head='<button type="button" class="nx-hd" data-mc="fold" aria-expanded="'+(!fold)+'" aria-label="'+(fold?'Open today':'Fold today')+'"><span><b>'+esc(hello+(nm?', '+nm:''))+'</b><span class="nx-d">'+esc(fold?summary():dayName(m.day))+'</span></span>'+CHEV+'</button>';
  if(fold) return '<div class="nx-morn nx-today fold">'+head+'</div>';
  var nxt=st.meetings[0], tiles=[], tsub=d.nLate&&d.nNow?plural(d.nLate,'overdue'):d.nLate?'overdue':d.nNow?'today':'';
  tiles.push(tile('tasks','Tasks due',d.n,d.nLate?(d.nNow?d.nNow+' today · '+d.nLate+' late':d.nLate+' overdue'):(d.nNow?'due today':'all clear'),d.nLate>0));
  tiles.push(tile('meet','Meetings',st.meetings.length,nxt?'Next '+(nxt.allDay?'all day':t12(nxt.start)):'none today',false));
  tiles.push(tile('unread','Unread',st.un.unread,st.un.unread?'in '+plural(st.un.chats,'chat'):'all read',false));
  if(st.rems.length) tiles.push(tile('rem','Reminders',st.rems.length,st.rems[0].time,false));
  return '<div class="nx-morn nx-today">'+head+'<div class="nx-tiles" style="--nt:'+tiles.length+'">'+tiles.join('')+'</div>'+section()+'</div>' }
function place(){ var g=$('#groups'); if(!g) return; var old=$('.nx-morn',g);
  var q=($('#search')||{}).value||''; var ok=st.visible&&st.loaded&&q.trim().length<2&&!D.body.classList.contains('nx-search')&&!D.body.classList.contains('nx-tasks')&&!$('#list.calmode');
  if(!ok){ if(old) old.remove(); return }
  if(old) return; var w=D.createElement('div'); w.innerHTML=html; var el=w.firstChild; var head=$('.lh',g); if(head&&head.nextSibling) g.insertBefore(el,head.nextSibling); else g.insertBefore(el,g.firstChild) }
function sigOf(){ var d=dueSplit(), u=st.un; return [folded(),st.open,st.expand,mel().hour<12?'a':mel().hour<17?'b':'c',st.meetings.length,st.rems.length,u.unread,u.list.map(function(g){ return g.id+':'+g.n+(g.men?'m':'')+g.text }).join(','),d.late.concat(d.now).map(function(t){ return t.mid+(t.done?'d':'')+t.due+(t.pri||'')+t.title+((C.msg(t.mid)&&C.msg(t.mid).task&&C.msg(t.mid).task.st)||'') }).join(',')].join('|') }
function refreshHtml(){ html=build(); lastSig=sigOf(); var old=$('#groups .nx-morn'); if(old) old.remove(); place() }

function melYmd(){ return mel().day }
async function gather(){ var today=melYmd(), me=C.me(), now=mel().stamp, real=C.real();
  var out={meetings:[],tk:[],rems:[]};
  var calP=(async function(){ try{ if(real){ var j=await C.api('myCalendar',{days:2}); return j.events||[] } var c=C.cal(); for(var i=0;i<12&&!c.events;i++){ await new Promise(function(r){ setTimeout(r,150) }) } return c.events||[] }catch(e){ return [] } })();
  var taskP=(async function(){ try{ var rows=real?((await C.api('myTasks',{wf:true})).tasks||[]):C.localTasks(); return rows.filter(function(t){ return t.own===me&&!t.done }) }catch(e){ return null } })();
  var remP=(async function(){ try{ if(!real) return []; return (await C.api('myReminders')).reminders||[] }catch(e){ return [] } })();
  var r=await Promise.all([calP,taskP,remP]);
  out.meetings=r[0].filter(function(e){ return (e.start||'').slice(0,10)===today&&(e.allDay||(e.end||e.start)>=now) }).sort(function(a,b){ return String(a.start).localeCompare(String(b.start)) });
  out.tk=r[1]; /* null when the call failed: keep what we had */
  out.rems=r[2].filter(function(x){ var at=new Date(x.at); var ds=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Melbourne'}).format(at); return ds===today&&x.at>Date.now()-3600000 }).sort(function(a,b){ return a.at-b.at }).map(function(x){ var msg=C.msg(x.mid); var ts=new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Melbourne',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(x.at)).replace(' ','').toLowerCase(); return {gid:x.gid,mid:x.mid,time:ts,text:(msg&&(msg.x||(msg.task&&msg.task.title)))?String(msg.x||msg.task.title).replace(/\s+/g,' ').slice(0,60):'A message you asked to be reminded about'} });
  return out }
function lastIn(gid){ var me=C.me(), ms=C.msgsIn(gid).filter(function(m){ return m.u!==me }).sort(function(a,b){ return (a.t||0)-(b.t||0) }), l=ms[ms.length-1]; if(!l) return {who:'',text:'New message',t:0};
  var text=l.task?'Task: '+l.task.title:l.poll?'Poll: '+l.x:(l.x&&String(l.x).trim())?String(l.x):(l.files&&l.files.length)?(l.files.length===1?'Sent a file':'Sent '+l.files.length+' files'):'New message';
  return {who:(C.person(l.u).n||'').split(' ')[0],text:text.replace(/\s+/g,' ').slice(0,90),t:l.t||0} }
function waiting(){ var gs=C.activeGroups(), un=0, chats=0, list=[]; gs.forEach(function(g){ var u=C.unread(g.id); if(!u) return; var mn=C.mentioned(g.id); if(C.muted&&C.muted(g.id)&&!mn) return; un+=u; chats++; var l=lastIn(g.id); list.push({id:g.id,name:C.gname(g),n:u,men:mn,who:l.who,text:l.text,t:l.t}) });
  list.sort(function(a,b){ return (b.men-a.men)||(b.t-a.t) }); return {unread:un,chats:chats,list:list} }
/* tasks follow the messages in the page: a tick, an edit from the details sheet, or a new task for me arriving live */
function mergeLocal(){ var me=C.me(), loc=C.localTasks().filter(function(t){ return t.own===me }), by={}; loc.forEach(function(t){ by[String(t.mid)]=t });
  st.tk.forEach(function(t){ var l=by[String(t.mid)]; if(l&&!t.fresh){ t.done=l.done; t.due=l.due; t.pri=l.pri; t.title=l.title } var m=C.msg(t.mid); if(m&&m.task) t.st=m.task.st });
  loc.forEach(function(l){ if(!l.done&&!st.tk.some(function(t){ return String(t.mid)===String(l.mid) })) st.tk.push(l) });
  st.tk=st.tk.filter(function(t){ return !t.done||t.fresh }) }
var tmr=null;
function recompute(){ if(!st.visible||!st.loaded) return; mergeLocal(); st.un=waiting(); if(sigOf()!==lastSig) refreshHtml(); else place() }
function soon(){ clearTimeout(tmr); tmr=setTimeout(recompute,120) }

var running=false, lastLoad=0;
async function show(force){ if(running) return; running=true;
  try{ var g=await gather(); if(g.tk) st.tk=g.tk; st.meetings=g.meetings; st.rems=g.rems; st.un=waiting(); st.visible=true; st.loaded=true; lastLoad=Date.now(); mergeLocal(); refreshHtml() }catch(e){} running=false }

/* tap handling: tiles open and close their list, a task opens its sheet, the circle ticks */
function openTask(mid,gid){
  var w=st.tk.filter(function(x){ return String(x.mid)===String(mid) })[0];
  if(w&&w.src==='wf'&&window.AtriumTasks){ window.AtriumTasks.inline(w); return }
  if(window.AtriumTaskFields&&C.msg(mid)){ window.AtriumTaskFields.open(mid); return }
  if(gid&&C.hasGroup(gid)){ C.open(gid); setTimeout(function(){ var row=$('.mr[data-m="'+mid+'"]'); if(row){ row.scrollIntoView({block:'center',behavior:'smooth'}); row.classList.remove('nx-hl'); void row.offsetWidth; row.classList.add('nx-hl'); setTimeout(function(){ row.classList.remove('nx-hl') },1600) } },500); return }
  var tb=$('#rail [data-v="tasks"]')||$('#tabbar [data-v="tasks"]'); if(tb) tb.click() }
async function tickTask(mid){ var t=st.tk.filter(function(x){ return String(x.mid)===String(mid) })[0]; if(!t||t.src==='wf') return; var was=t.done; t.done=!was; t.fresh=t.done?Date.now():0; refreshHtml();
  try{ await C.tick(t.mid,t.done); if(t.done) C.flash('Task done.') }catch(er){ t.done=was; t.fresh=0; refreshHtml(); C.flash((er&&er.message)||'That could not be saved.'); return }
  if(t.done) setTimeout(function(){ t.fresh=0; recompute() },1300) }
D.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('.nx-morn [data-mc]'); if(!b) return; e.stopPropagation(); e.preventDefault(); var a=b.getAttribute('data-mc'), g=b.getAttribute('data-g'), m=b.getAttribute('data-m');
  if(a==='fold'){ setFold(!folded()); refreshHtml(); return }
  if(a==='tile'){ var s=b.getAttribute('data-s'); st.open=st.open===s?'':s; refreshHtml(); return }
  if(a==='unmore'){ st.expand=!st.expand; refreshHtml(); return }
  if(a==='tick'){ tickTask(m); return }
  if(a==='task'){ openTask(m,g); return }
  if(a==='cal'){ var cb=$('#groups [data-cal="open"]')||$('#tabbar [data-v="meet"]'); if(cb) cb.click(); return }
  if(a==='tasks'){ var tb=$('#rail [data-v="tasks"]')||$('#tabbar [data-v="tasks"]'); if(tb) tb.click(); return }
  if(a==='rem'&&g&&C.hasGroup(g)){ C.open(g); setTimeout(function(){ var row=$('.mr[data-m="'+m+'"]'); if(row){ row.scrollIntoView({block:'center',behavior:'smooth'}); row.classList.remove('nx-hl'); void row.offsetWidth; row.classList.add('nx-hl'); setTimeout(function(){ row.classList.remove('nx-hl') },1600) } },500); return }
  if(a==='chat'&&g&&C.hasGroup(g)){ C.open(g); return } },true);

var gl=$('#groups'); new MutationObserver(function(){ soon() }).observe(gl,{childList:true});
D.addEventListener('atrium-mop',soon);
var sr=$('#search'); if(sr) sr.addEventListener('input',function(){ setTimeout(place,0) });
/* coming back to the tab: a new day starts the card fresh, otherwise refresh the lists from the server every couple of minutes */
D.addEventListener('visibilitychange',function(){ if(D.visibilityState!=='visible') return; if(st.loaded&&Date.now()-lastLoad>120000) show(false); else soon() });
setInterval(function(){ if(D.visibilityState==='visible'&&st.loaded&&Date.now()-lastLoad>300000) show(false) },60000);
/* the first draw, once the chats have arrived */
setTimeout(function(){ show(false) },2200);
window.AtriumMorning={ show:show };
})();
