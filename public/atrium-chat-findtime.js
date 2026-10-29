/* ATRIUM Chat: find a time.
   A Find a time button in the "Meeting from this chat" sheet. It looks at when the people coming are free (busy or free only, never what anyone's meetings are) and lists the half hours
   when everyone it could read is free, Monday to Friday, 8am to 6pm Melbourne time. Tap one and the meeting's date, time and length are filled in.
   Server call (ATRIUM wave three): findTime { gid, ids?, from?, to?, durationMin? } -> { range, people:[{ id, n, ok, busy }], slots:[{ s, e }], partial }.
   People without a company calendar cannot be read, and the sheet says so. The button is hidden until the server knows findTime. Needs window.AtriumChat. */
(function(){
'use strict';
var D=document, C=window.AtriumChat;
if(!C||!D.getElementById('ovMeet')) return;
function $(s,r){ return (r||D).querySelector(s) }
function $$(s,r){ return Array.prototype.slice.call((r||D).querySelectorAll(s)) }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
var DAYS=[7,14], DURS=[[30,'30 min'],[45,'45 min'],[60,'1 hour'],[90,'1.5 hours'],[120,'2 hours']];
var FMT_DAY=new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Melbourne',weekday:'short',day:'numeric',month:'short'});
var FMT_TIME=new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Melbourne',hour:'numeric',minute:'2-digit',hour12:true});
var FMT_PARTS=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Melbourne',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function parts(ms){ var o={}; FMT_PARTS.formatToParts(new Date(ms)).forEach(function(p){ o[p.type]=p.value }); return o }
function tt(ms){ return FMT_TIME.format(new Date(ms)).replace(' ','').toLowerCase() }

/* shown only once the server knows findTime (a 404 "Unknown action." means not yet) */
var SUP=null, supAt=0, supBusy=false;
function on(){ return C.real()&&SUP===true }
function probe(){ if(!C.real()||SUP===true||supBusy||Date.now()-supAt<60000) return; supBusy=true; supAt=Date.now();
  C.api('findTime',{gid:'__probe'}).then(function(){ SUP=true }).catch(function(er){ var s=er&&er.status; if(s===404&&/unknown action/i.test(er.message||'')) SUP=false; else if(s&&s!==401) SUP=true }).then(function(){ supBusy=false; inject() }) }

var ov=D.createElement('div'); ov.className='ov nx'; ov.id='nxFT';
ov.innerHTML='<div class="sheet wide"><h3>Find a time</h3><div class="lead" id="nxFtL"></div><div class="nx-chips" id="nxFtD"></div><div id="nxFtB"></div><div class="row" style="margin-top:14px"><button type="button" class="cb" data-x>Close</button></div></div>';
D.body.appendChild(ov); ov.addEventListener('click',function(e){ if(e.target===ov||e.target.closest('[data-x]')) ov.classList.remove('on') });
var dur=60, days=7, seq=0, last=null;
function idsFromSheet(){ var names=$$('#mWho input:checked').map(function(i){ return String(i.value).toLowerCase() }), me=C.me(), ids=[me];
  C.people().forEach(function(p){ if(p&&p.id&&p.id!==me&&names.indexOf(String(p.n||'').toLowerCase())>-1) ids.push(p.id) }); return ids }
function draw(){ $('#nxFtD').innerHTML=DURS.map(function(d){ return '<button type="button" class="chip'+(dur===d[0]?' on':'')+'" data-dur="'+d[0]+'">'+d[1]+'</button>' }).join('')+DAYS.map(function(n){ return '<button type="button" class="chip'+(days===n?' on':'')+'" data-days="'+n+'">Next '+n+' days</button>' }).join('') }
async function run(){ var my=++seq, gid=C.cur(); $('#nxFtB').innerHTML='<div class="nx-empty">Looking at calendars...</div>'; draw();
  try{ var j=await C.api('findTime',{gid:gid,ids:idsFromSheet(),from:Date.now(),to:Date.now()+days*86400000,durationMin:dur}); if(my!==seq) return; last=j; show(j) }
  catch(er){ if(my!==seq) return; $('#nxFtB').innerHTML='<div class="nx-empty">'+esc((er&&er.message)||'Could not look at calendars.')+'</div>' } }
function show(j){ var people=j.people||[], read=people.filter(function(p){ return p.ok }), skipped=people.filter(function(p){ return !p.ok }), slots=j.slots||[], h='';
  $('#nxFtL').textContent='Free or busy only. No one’s meeting details are ever shown. Times are Monday to Friday, 8am to 6pm, Melbourne.';
  if(!read.length) h+='<div class="nx-empty">No one’s calendar could be read, so no times can be suggested. Only people on a HAAVN or 7EVEN calendar can be looked at.</div>';
  else if(!slots.length) h+='<div class="nx-empty">No time when everyone is free in the next '+days+' days. Try a shorter meeting or a longer range.</div>';
  else { var lastDay=''; slots.forEach(function(s){ var d=FMT_DAY.format(new Date(s.s)); if(d!==lastDay){ lastDay=d; h+='<div class="mono nx-tkh">'+esc(d)+'</div>' } h+='<button type="button" class="nx-ftslot" data-s="'+s.s+'" data-e="'+s.e+'">'+esc(tt(s.s))+' to '+esc(tt(s.e))+'</button>' }) }
  if(skipped.length&&read.length) h+='<div class="lead" style="margin-top:12px">Not included, because their calendar could not be read: '+skipped.map(function(p){ return esc(p.n) }).join(', ')+'.</div>';
  else if(read.length) h+='<div class="lead" style="margin-top:12px">Calendars read: '+read.map(function(p){ return esc(p.n) }).join(', ')+'.</div>';
  $('#nxFtB').innerHTML=h }
ov.addEventListener('click',function(e){ var d=e.target.closest('[data-dur]'); if(d){ dur=+d.getAttribute('data-dur'); run(); return }
  var n=e.target.closest('[data-days]'); if(n){ days=+n.getAttribute('data-days'); run(); return }
  var s=e.target.closest('[data-s]'); if(!s) return; var p=parts(+s.getAttribute('data-s'));
  $('#mDate').value=p.year+'-'+p.month+'-'+p.day; $('#mTime').value=p.hour+':'+p.minute; if($('#mDur')){ var opt=$$('#mDur option').some(function(o){ return +o.value===dur }); if(opt) $('#mDur').value=String(dur) }
  ov.classList.remove('on'); C.flash('Set to '+FMT_DAY.format(new Date(+s.getAttribute('data-s')))+', '+tt(+s.getAttribute('data-s'))+'.') });
function openFT(){ if($('#mDur')) dur=+$('#mDur').value||60; ov.classList.add('on'); run() }

/* the button, in the empty cell beside Length */
function inject(){ var sheet=$('#ovMeet'); if(!sheet||$('.nx-ft',sheet)||!on()) return; var dd=$('#mDur'); if(!dd) return; var row=dd.closest('.row'); var cell=row&&row.children[1]; if(!cell) return;
  var b=D.createElement('button'); b.type='button'; b.className='chip nx-ft nx-ro'; b.textContent='Find a time'; cell.appendChild(b); b.addEventListener('click',openFT) }
new MutationObserver(function(){ var o=$('#ovMeet'); if(o&&o.classList.contains('on')){ if(C.real()&&SUP===null) probe(); inject() } }).observe($('#ovMeet'),{attributes:true,attributeFilter:['class']});
setTimeout(probe,2500);
window.AtriumFindTime={ open:openFT };
})();
