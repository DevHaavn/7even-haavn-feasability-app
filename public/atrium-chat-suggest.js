/* ATRIUM Chat: "looks like a task".
   When what you are typing reads like an instruction to someone in the chat ("Daniel to send the cash flow by Friday"), a slim bar above the message box offers to make it a task for them,
   with the due date read from the words. One tap opens the task sheet filled in; nothing is created until you press the sheet's own button. The cross hides it for that sentence.
   Nothing here talks to the server. Needs window.AtriumChat (see atrium-chat-tasks.js). */
(function(){
'use strict';
var D=document, C=window.AtriumChat;
if(!C||!D.getElementById('inp')) return;
function $(s,r){ return (r||D).querySelector(s) }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var DAYN={sun:0,sunday:0,mon:1,monday:1,tue:2,tues:2,tuesday:2,wed:3,weds:3,wednesday:3,thu:4,thur:4,thurs:4,thursday:4,fri:5,friday:5,sat:6,saturday:6};
function ymd(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0') }
function parseDue(w){ w=String(w||'').toLowerCase(); var t=new Date(); t.setHours(12,0,0,0);
  if(w==='today'||w==='eod') return t; if(w==='tomorrow'||w==='tmrw') { t.setDate(t.getDate()+1); return t }
  if(DAYN[w]!=null){ var k=(DAYN[w]-t.getDay()+7)%7; t.setDate(t.getDate()+k); return t }
  var m=/^(\d{1,2})[\/-](\d{1,2})$/.exec(w); if(m){ var d=new Date(t.getFullYear(),+m[2]-1,+m[1],12); if(d<t) d.setFullYear(d.getFullYear()+1); return d }
  return null }
function members(){ var g=C.group(C.cur()), me=C.me(); return g?(g.m||[]).filter(function(id){ return id!==me }).map(function(id){ return C.person(id) }).filter(function(p){ return p&&p.n }):[] }
function detect(v){ if(!v||v.length<14||v.charAt(0)==='/') return null; var m=/^@?([A-Za-z][A-Za-z'-]+)\s+(?:to|will|can you|could you|please)\s+(.{6,}?)\s*$/i.exec(v); if(!m) return null;
  var who=members().filter(function(p){ return p.n.split(' ')[0].toLowerCase()===m[1].toLowerCase() })[0]; if(!who) return null;
  var rest=m[2], due=null, d=/\s+(?:(?:by|on|before)\s+)?(today|tomorrow|tmrw|eod|\w+day|mon|tues?|weds?|thu(?:rs?)?|fri|sat|sun|\d{1,2}[\/-]\d{1,2})\.?$/i.exec(rest);
  if(d){ due=parseDue(d[1]); if(due) rest=rest.slice(0,d.index) }
  rest=rest.replace(/[.!?]+$/,'').trim(); if(rest.length<4) return null;
  return {who:who,title:rest.charAt(0).toUpperCase()+rest.slice(1),due:due} }

var bar=D.createElement('div'); bar.id='nxSug'; var comp=$('#comp'); comp.parentNode.insertBefore(bar,comp);
var inp=$('#inp'), cur=null, hidden='', stash='';
function draw(){ var v=inp.value, s=detect(v); if(!s||v===hidden){ bar.classList.remove('on'); cur=null; return } cur=s;
  bar.innerHTML='<span>Make this a task for <b>'+esc(s.who.n.split(' ')[0])+'</b>'+(s.due?', due '+DOW[s.due.getDay()]+' '+s.due.getDate()+' '+MON[s.due.getMonth()]:'')+'?</span><button type="button" class="chip nx-ro" data-mk>Make task</button><button type="button" class="nx-rx" data-no aria-label="Not now">&times;</button>'; bar.classList.add('on') }
inp.addEventListener('input',draw);
new MutationObserver(function(){ draw() }).observe($('#hTitle'),{childList:true,subtree:true});
bar.addEventListener('click',function(e){
  if(e.target.closest('[data-no]')){ hidden=inp.value; draw(); return }
  if(!e.target.closest('[data-mk]')||!cur) return; var s=cur; stash=inp.value;
  C.taskDialog(s.title); var o=$('#tOwner'); if(o) o.value=s.who.id; var d=$('#tDue'); if(d&&s.due) d.value=ymd(s.due);
  inp.value=''; inp.dispatchEvent(new Event('input',{bubbles:true})) });
/* leaving the task sheet without making it brings the words back */
var cancel=$('#tCancel'); if(cancel) cancel.addEventListener('click',function(){ if(stash&&!inp.value){ inp.value=stash; inp.dispatchEvent(new Event('input',{bubbles:true})) } stash='' });
var make=$('#tSave')||$('#tMake')||$('#tGo'); if(make) make.addEventListener('click',function(){ stash='' });
window.AtriumSuggest={ detect:detect };
})();
