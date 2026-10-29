/* ATRIUM Chat: status rings and message look.
   Status rings: a thin gold ring on a chat's icon in the list when it has unread messages, and a brighter ring when you are mentioned or a task is set to you in it. Muted chats stay quiet.
   Message look: in the Wallpaper and colours sheet, a Messages section with Density (Comfortable or Compact) and Bubble shape (Rounded, Square or Quiet). Saved on this device.
   Nothing here talks to the server. Needs window.AtriumChat (see atrium-chat-tasks.js). */
(function(){
'use strict';
var D=document, B=D.body, C=window.AtriumChat;
if(!C||!D.getElementById('groups')) return;
function $(s,r){ return (r||D).querySelector(s) }
function $$(s,r){ return Array.prototype.slice.call((r||D).querySelectorAll(s)) }
var KEY='atrium-chat-look-v1', look={den:'comfy',shape:'round'};
try{ var s=JSON.parse(localStorage.getItem(KEY)||'{}'); if(s.den==='compact') look.den='compact'; if(s.shape==='square'||s.shape==='quiet') look.shape=s.shape }catch(e){}
function apply(){ B.classList.toggle('nx-compact',look.den==='compact'); B.classList.toggle('nx-sq',look.shape==='square'); B.classList.toggle('nx-quiet',look.shape==='quiet') }
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(look)) }catch(e){} }
apply();

/* ---------- status rings ---------- */
var gl=$('#groups');
function rings(){ $$('.g[data-g]',gl).forEach(function(b){ var id=b.getAttribute('data-g'); var men=false; try{ men=C.mentioned(id) }catch(e){} b.classList.toggle('nx-men',!!men&&b.classList.contains('unread')) }) }
new MutationObserver(function(){ clearTimeout(rings.t); rings.t=setTimeout(rings,30) }).observe(gl,{childList:true});
rings();

/* ---------- the Messages section in the wallpaper sheet ---------- */
function section(){ var sh=$('#ovWall .sheet'); if(!sh||$('#nxLook',sh)) return; var after=$('#lvSec',sh)||$('.lead',sh); if(!after) return;
  var s=D.createElement('div'); s.id='nxLook';
  s.innerHTML='<div class="mono nx-lkh">Messages</div><div class="nx-lkl">Density</div><div class="seg2 nx-lk" data-k="den"><button type="button" data-v="comfy">Comfortable</button><button type="button" data-v="compact">Compact</button></div><div class="nx-lkl">Bubble shape</div><div class="seg2 nx-lk" data-k="shape"><button type="button" data-v="round">Rounded</button><button type="button" data-v="square">Square</button><button type="button" data-v="quiet">Quiet</button></div>';
  after.parentNode.insertBefore(s,after.nextSibling); paint();
  s.addEventListener('click',function(e){ var b=e.target.closest('[data-v]'); if(!b) return; var k=b.parentNode.getAttribute('data-k'); look[k]=b.getAttribute('data-v'); apply(); save(); paint() }) }
function paint(){ $$('#nxLook .nx-lk').forEach(function(g){ var k=g.getAttribute('data-k'); $$('button',g).forEach(function(b){ b.classList.toggle('on',b.getAttribute('data-v')===look[k]) }) }) }
var wall=$('#ovWall'); if(wall){ new MutationObserver(function(){ if(wall.classList.contains('on')) setTimeout(section,40) }).observe(wall,{attributes:true,attributeFilter:['class']}); section() }
window.AtriumLook={ get:function(){ return Object.assign({},look) } };
})();
