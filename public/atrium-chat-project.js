/* ATRIUM Chat: the project room strip.
   In a private project chat, a director sees one slim strip under the chat header with the project's four numbers: total development cost, expected sales value, profit and margin.
   Tap it for the figures in full, where they come from, and (for a director) to link the chat to a feasibility project. Nobody else ever gets the strip, and the numbers are never sent
   to anyone else: the server checks the person is a director and the chat is a private project chat before it reads a single figure.
   Server calls (ATRIUM wave three): projectRoom { gid } -> { room:{ proj, source:{id,name}, tdc, gdv, profit, margin, marginGdv, asAt } } or { room:null, why }, projectLinks,
   projectLinkSet { proj, projectId|null }. Stays hidden until the server knows projectRoom. On practice data it shows clearly labelled sample numbers.
   Needs window.AtriumChat (see atrium-chat-tasks.js). */
(function(){
'use strict';
var D=document, B=D.body, C=window.AtriumChat;
if(!C||!D.getElementById('msgs')||!D.getElementById('thead')) return;
function $(s,r){ return (r||D).querySelector(s) }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function money(v){ var a=Math.abs(v), s=a>=1e6?(a/1e6).toFixed(a>=1e8?0:1).replace(/\.0$/,'')+'m':a>=1e3?Math.round(a/1e3)+'k':String(Math.round(a)); return (v<0?'-':'')+'$'+s }
function full(v){ return (v<0?'-':'')+'$'+Math.round(Math.abs(v)).toLocaleString('en-AU') }
function pct(v){ return (Math.round(v*1000)/10).toFixed(1)+'%' }
function asAt(ms){ if(!ms) return ''; var d=new Date(ms); return DOW[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()] }

var strip=D.createElement('div'); strip.id='nxProj'; var th=$('#thead'); th.parentNode.insertBefore(strip,th.nextSibling);
var CACHE={}, SUP=null, NODIR=false, cur='', busy={};
function eligible(gid){ var g=gid&&C.group(gid); return !!(g&&!g.dm&&g.priv&&g.proj&&g.proj!=='No project') }
var SAMPLE={ tdc:52400000, gdv:64000000, profit:11600000, margin:.221, marginGdv:.181, asAt:0, sample:true };
function setOn(on){ strip.classList.toggle('on',!!on); B.classList.toggle('nx-proj',!!on) }
function draw(){ var gid=C.cur(), c=gid&&CACHE[gid]; if(!eligible(gid)||!c||(C.real()&&(SUP===false||NODIR))){ setOn(false); return }
  var g=C.group(gid);
  if(c.room){ var r=c.room; strip.innerHTML='<span class="nxk">'+esc(g.proj)+(r.sample?' · sample':'')+'</span><span class="nxv"><small>Cost</small>'+money(r.tdc)+'</span><span class="nxv"><small>Sales</small>'+money(r.gdv)+'</span><span class="nxv"><small>Profit</small>'+money(r.profit)+'</span><span class="nxv"><small>Margin</small>'+pct(r.margin)+'</span>'; setOn(true); return }
  if(c.why==='not linked'){ strip.innerHTML='<span class="nxk">'+esc(g.proj)+'</span><span class="nxv"><button type="button" class="nx-lnk" data-link>Link to a feasibility project</button></span>'; setOn(true); return }
  if(c.why==='no feasibility'){ strip.innerHTML='<span class="nxk">'+esc(g.proj)+'</span><span class="nxv"><small>No sales value in the feasibility yet</small></span>'; setOn(true); return }
  setOn(false) }
async function load(gid,force){ if(!eligible(gid)) return;
  if(!C.real()){ CACHE[gid]={t:Date.now(),room:Object.assign({},SAMPLE)}; draw(); return }
  if(C.role()!=='admin'||NODIR||SUP===false) return;
  var c=CACHE[gid]; if(!force&&c&&Date.now()-c.t<120000) return; if(busy[gid]) return; busy[gid]=1;
  try{ var j=await C.api('projectRoom',{gid:gid}); SUP=true; CACHE[gid]={t:Date.now(),room:j.room||null,why:j.why||''} }
  catch(er){ var s=er&&er.status; if(s===404&&/unknown action/i.test(er.message||'')) SUP=false; else if(s===403) NODIR=true; else CACHE[gid]={t:Date.now(),room:null,why:'unavailable'} }
  busy[gid]=0; if(C.cur()===gid) draw() }
function refresh(){ var gid=C.cur(); cur=gid; if(!gid||!eligible(gid)){ setOn(false); return } if(CACHE[gid]) draw(); load(gid,false) }
new MutationObserver(function(){ if(C.cur()!==cur) refresh() }).observe($('#hTitle'),{childList:true,subtree:true});
setInterval(function(){ var gid=C.cur(); if(gid&&eligible(gid)&&C.real()&&D.visibilityState==='visible') load(gid,false) },60000);

/* ---------- the sheet ---------- */
var ov=D.createElement('div'); ov.className='ov nx'; ov.id='nxProjS'; ov.innerHTML='<div class="sheet"><h3 id="nxPjT"></h3><div class="lead" id="nxPjL"></div><div id="nxPjB"></div><div class="row" style="margin-top:14px"><button type="button" class="cb" data-x>Close</button></div></div>'; D.body.appendChild(ov);
ov.addEventListener('click',function(e){ if(e.target===ov||e.target.closest('[data-x]')) ov.classList.remove('on') });
function openSheet(){ var gid=C.cur(), c=CACHE[gid], g=gid&&C.group(gid); if(!g||!c) return; $('#nxPjT').textContent=g.proj; var h='';
  if(c.room){ var r=c.room; $('#nxPjL').textContent=r.sample?'Sample numbers, so you can see how this looks. Real numbers come from the feasibility once you are signed in.':'From the feasibility'+(r.source?' project “'+r.source.name+'”':'')+(r.asAt?', last changed '+asAt(r.asAt):'')+'.';
    h='<div class="nx-pjgrid"><div><small>Total development cost</small><b>'+full(r.tdc)+'</b></div><div><small>Expected sales value</small><b>'+full(r.gdv)+'</b></div><div><small>Profit</small><b>'+full(r.profit)+'</b></div><div><small>Margin on cost</small><b>'+pct(r.margin)+'</b><small>On sales '+pct(r.marginGdv||0)+'</small></div></div><div class="lead" style="margin-top:12px">Only directors see this, and only in a private project chat.</div>'+(!r.sample?'<div class="row" style="margin-top:10px"><button type="button" class="cb" data-link>Change the linked project</button></div>':'') }
  else { $('#nxPjL').textContent=c.why==='no feasibility'?'The linked feasibility project has no sales value yet, so there is nothing to show.':'This chat is not linked to a feasibility project yet.'; h='<div class="row" style="margin-top:10px"><button type="button" class="cb go" data-link>Link to a feasibility project</button></div>' }
  $('#nxPjB').innerHTML=h; D.querySelectorAll('.ov.nx.on').forEach(function(x){ x.classList.remove('on') }); ov.classList.add('on') }
async function openLink(){ var gid=C.cur(), g=gid&&C.group(gid); if(!g) return; $('#nxPjB').innerHTML='<div class="nx-empty">Loading projects...</div>'; $('#nxPjL').textContent='Pick the feasibility project this chat is about.'; ov.classList.add('on');
  try{ var j=await C.api('projectLinks'), cur0=(j.links||{})[g.proj]||'';
    $('#nxPjB').innerHTML='<div class="f"><label class="mono" for="nxPjS">Feasibility project</label><select id="nxPjS"><option value="">Match by name ('+esc(g.proj)+')</option>'+(j.projects||[]).map(function(p){ return '<option value="'+esc(p.id)+'"'+(p.id===cur0?' selected':'')+'>'+esc(p.name)+'</option>' }).join('')+'</select></div><div class="row" style="margin-top:12px"><button type="button" class="cb go" id="nxPjSave">Save link</button></div>' }
  catch(er){ $('#nxPjB').innerHTML='<div class="nx-empty">'+esc((er&&er.message)||'Could not load the projects.')+'</div>' } }
ov.addEventListener('click',async function(e){ if(e.target.closest('[data-link]')){ openLink(); return }
  var sv=e.target.closest('#nxPjSave'); if(!sv) return; var gid=C.cur(), g=C.group(gid); sv.disabled=true;
  try{ await C.api('projectLinkSet',{proj:g.proj,projectId:$('#nxPjS').value||null}); delete CACHE[gid]; ov.classList.remove('on'); await load(gid,true); C.flash('Link saved.') }catch(er){ C.flash((er&&er.message)||'That could not be saved.'); sv.disabled=false } });
strip.addEventListener('click',function(e){ if(e.target.closest('[data-link]')){ e.stopPropagation(); openLink(); return } openSheet() });
setTimeout(refresh,1500);
window.AtriumProject={ refresh:refresh };
})();
