/* ATRIUM Chat: the morning card.
   The first time you open Chat each day, one card sits at the top of the chat list: today's meetings, tasks due today or overdue, reminders set for today, and what is waiting for you
   (unread, and chats where you are mentioned). Each line opens the thing it is about. The cross closes it for the day. It is built on the screen from calls that already exist
   (myCalendar, myTasks, myReminders); a call that fails, or that your login is not allowed to make, just leaves that part out. On practice data it shows the practice calendar and tasks.
   Needs window.AtriumChat (see atrium-chat-tasks.js). window.AtriumMorning.show(true) shows it again, for testing. */
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
var KEY='atrium-chat-morning-v1', memDone='';
function doneToday(){ var t=mel().day; try{ return localStorage.getItem(KEY)===t }catch(e){ return memDone===t } }
function markDone(){ var t=mel().day; memDone=t; try{ localStorage.setItem(KEY,t) }catch(e){} }

var st={visible:false,loaded:false,meetings:[],tasks:[],overdue:0,due:0,rems:[],unread:0,chats:0,mentions:[]}, html='';
function build(){ var m=mel(), me=C.me(), nm=first(me), hello=m.hour<12?'Good morning':m.hour<17?'Good afternoon':'Good evening', rows='';
  if(st.meetings.length){ rows+='<div class="nx-mh mono">Today</div>'+st.meetings.slice(0,3).map(function(e){ return '<button type="button" class="nx-mr" data-mc="cal"><span class="nx-mt">'+(e.allDay?'All day':t12(e.start))+'</span><span class="nx-mx">'+esc(e.subject)+'</span></button>' }).join('')+(st.meetings.length>3?'<button type="button" class="nx-mr nx-more" data-mc="cal">+ '+(st.meetings.length-3)+' more</button>':'') }
  if(st.tasks.length||st.overdue){ var bits=[]; if(st.overdue) bits.push(st.overdue+' overdue'); if(st.due) bits.push(st.due+' due today');
    rows+='<div class="nx-mh mono">Tasks</div><button type="button" class="nx-mr" data-mc="tasks"><span class="nx-mt">'+esc(bits.join(' · '))+'</span></button>'+st.tasks.slice(0,3).map(function(t){ return '<button type="button" class="nx-mr" data-mc="task" data-g="'+esc(t.gid)+'" data-m="'+esc(t.mid)+'"><span class="nx-mx">'+esc(t.title)+'</span></button>' }).join('') }
  if(st.rems.length){ rows+='<div class="nx-mh mono">Reminders</div>'+st.rems.slice(0,3).map(function(r){ return '<button type="button" class="nx-mr" data-mc="rem" data-g="'+esc(r.gid)+'" data-m="'+esc(r.mid)+'"><span class="nx-mt">'+esc(r.time)+'</span><span class="nx-mx">'+esc(r.text)+'</span></button>' }).join('') }
  if(st.unread){ rows+='<div class="nx-mh mono">Waiting</div><button type="button" class="nx-mr" data-mc="unread"><span class="nx-mx">'+st.unread+' unread in '+st.chats+' chat'+(st.chats===1?'':'s')+'</span></button>'+st.mentions.slice(0,2).map(function(g){ return '<button type="button" class="nx-mr" data-mc="chat" data-g="'+esc(g.id)+'"><span class="nx-mt">Mentioned</span><span class="nx-mx">'+esc(g.name)+'</span></button>' }).join('') }
  if(!rows) rows='<div class="nx-mn">Nothing booked, nothing due. A clear day.</div>';
  return '<div class="nx-morn"><div class="nx-mhd"><div><b>'+esc(hello+(nm?', '+nm:''))+'</b><span>'+esc(dayName(m.day))+'</span></div><button type="button" class="nx-rx" data-mc="close" aria-label="Close for today">&times;</button></div>'+rows+'</div>' }
function place(){ var g=$('#groups'); if(!g) return; var old=$('.nx-morn',g);
  var q=($('#search')||{}).value||''; var ok=st.visible&&st.loaded&&q.trim().length<2&&!D.body.classList.contains('nx-search')&&!D.body.classList.contains('nx-tasks')&&!$('#list.calmode');
  if(!ok){ if(old) old.remove(); return }
  if(old) return; var w=D.createElement('div'); w.innerHTML=html; var el=w.firstChild; var head=$('.lh',g); if(head&&head.nextSibling) g.insertBefore(el,head.nextSibling); else g.insertBefore(el,g.firstChild) }
function refreshHtml(){ html=build(); var old=$('#groups .nx-morn'); if(old) old.remove(); place() }

function melYmd(){ return mel().day }
async function gather(){ var today=melYmd(), me=C.me(), now=mel().stamp, real=C.real();
  var out={meetings:[],tasks:[],overdue:0,due:0,rems:[]};
  var calP=(async function(){ try{ if(real){ var j=await C.api('myCalendar',{days:2}); return j.events||[] } var c=C.cal(); for(var i=0;i<12&&!c.events;i++){ await new Promise(function(r){ setTimeout(r,150) }) } return c.events||[] }catch(e){ return [] } })();
  var taskP=(async function(){ try{ var rows=real?((await C.api('myTasks',{})).tasks||[]):C.localTasks(); return rows.filter(function(t){ return t.own===me&&!t.done }) }catch(e){ return [] } })();
  var remP=(async function(){ try{ if(!real) return []; return (await C.api('myReminders')).reminders||[] }catch(e){ return [] } })();
  var r=await Promise.all([calP,taskP,remP]);
  out.meetings=r[0].filter(function(e){ return (e.start||'').slice(0,10)===today&&(e.allDay||(e.end||e.start)>=now) }).sort(function(a,b){ return String(a.start).localeCompare(String(b.start)) });
  var due=r[1].filter(function(t){ return t.due&&t.due<=today }).sort(function(a,b){ return String(a.due).localeCompare(String(b.due)) });
  out.tasks=due; out.overdue=due.filter(function(t){ return t.due<today }).length; out.due=due.length-out.overdue;
  out.rems=r[2].filter(function(x){ var at=new Date(x.at); var ds=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Melbourne'}).format(at); return ds===today&&x.at>Date.now()-3600000 }).sort(function(a,b){ return a.at-b.at }).map(function(x){ var msg=C.msg(x.mid); var ts=new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Melbourne',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(x.at)).replace(' ','').toLowerCase(); return {gid:x.gid,mid:x.mid,time:ts,text:(msg&&(msg.x||(msg.task&&msg.task.title)))?String(msg.x||msg.task.title).replace(/\s+/g,' ').slice(0,60):'A message you asked to be reminded about'} });
  return out }
function waiting(){ var gs=C.activeGroups(), un=0, chats=0, men=[]; gs.forEach(function(g){ var u=C.unread(g.id); if(u){ un+=u; chats++; if(C.mentioned(g.id)) men.push({id:g.id,name:C.gname(g)}) } }); return {unread:un,chats:chats,mentions:men} }

var running=false;
async function show(force){ if(running) return; if(!force&&doneToday()) return; running=true;
  try{ var g=await gather(), w=waiting(); st=Object.assign(st,g,w,{visible:true,loaded:true}); refreshHtml() }catch(e){} running=false }

/* open what a line is about */
D.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('.nx-morn [data-mc]'); if(!b) return; e.stopPropagation(); e.preventDefault(); var a=b.getAttribute('data-mc'), g=b.getAttribute('data-g'), m=b.getAttribute('data-m');
  if(a==='close'){ markDone(); st.visible=false; place(); return }
  markDone();
  if(a==='cal'){ var cb=$('#groups [data-cal="open"]')||$('#tabbar [data-v="meet"]'); if(cb) cb.click(); return }
  if(a==='tasks'){ var tb=$('#rail [data-v="tasks"]')||$('#tabbar [data-v="tasks"]'); if(tb) tb.click(); return }
  if((a==='task'||a==='rem')&&g&&C.hasGroup(g)){ C.open(g); setTimeout(function(){ var row=$('.mr[data-m="'+m+'"]'); if(row){ row.scrollIntoView({block:'center',behavior:'smooth'}); row.classList.remove('nx-hl'); void row.offsetWidth; row.classList.add('nx-hl'); setTimeout(function(){ row.classList.remove('nx-hl') },1600) } },500); return }
  if(a==='chat'&&g&&C.hasGroup(g)){ C.open(g); return }
  if(a==='unread'){ var first=$('#groups .g.unread'); if(first) first.click() } },true);

var gl=$('#groups'); new MutationObserver(function(){ place() }).observe(gl,{childList:true});
var sr=$('#search'); if(sr) sr.addEventListener('input',function(){ setTimeout(place,0) });
D.addEventListener('visibilitychange',function(){ if(D.visibilityState==='visible'&&!doneToday()&&!st.visible) show(false) });
/* the first open of the day, once the chats have arrived */
setTimeout(function(){ show(/[?&]morning=1/.test(location.search)) },2200);
window.AtriumMorning={ show:show };
})();
