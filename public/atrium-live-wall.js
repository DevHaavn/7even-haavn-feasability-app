/* ATRIUM Chat: the live ground, and the labels on the side bar.
   The live ground is a moving wallpaper for the standard ATRIUM ground, drawn in code (no pictures, no data). It shows behind any chat that is on the standard ground; a chat with a
   wallpaper of its own keeps it. One choice per device, in the wallpaper sheet. Six grounds, all in one family: a dark (or, in the light scheme, pearl) field, one fine device,
   one moving light. Nothing here runs when ATRIUM is not on screen, when the device asks for reduced motion, or when "Still wallpapers only" is on.
   API: AtriumLive.get() -> id or '', .on() -> true when a live ground is showing, .set(id), .still(bool). Hooks in atrium-chat.html: AtriumChatRepaint, applyWall's film test. */
(function(){
'use strict';
var D=document, B=D.body;
function $(s,r){ return (r||D).querySelector(s) }
function $$(s,r){ return Array.prototype.slice.call((r||D).querySelectorAll(s)) }
function get(k){ try{ return localStorage.getItem(k) }catch(e){ return null } }
function put(k,v){ try{ localStorage.setItem(k,v) }catch(e){} }
var EMB=B.classList.contains('embed')||/[?&]embed=1/.test(location.search);
var KEY='atrium-chat-live', KSTILL='atrium-chat-live-still';

/* ---------- the side bar: a word under each icon ---------- */
var LABELS={chat:'Chat',tasks:'Tasks',railCal:'Calendar',railNotes:'Notes',railFiles:'Files'};
$$('#rail .rb').forEach(function(b){ var lab=LABELS[b.getAttribute('data-v')||b.id]; if(!lab||$('.lb',b)) return; var s=D.createElement('span'); s.className='lb'; s.textContent=lab; b.appendChild(s) });

if(EMB){ window.AtriumLive={get:function(){return ''},on:function(){return false},set:function(){},still:function(){}}; return }

/* ---------- the grounds ---------- */
var LIVE=[
 {id:'ring',n:'ATRIUM ring',d:'One gold arc travelling the ring'},
 {id:'a',n:'ATRIUM A',d:'A light climbing the open A'},
 {id:'x',n:'7X',d:'A light tracing the X'},
 {id:'survey',n:'Survey',d:'Contour rings, breathing slowly'},
 {id:'haavn',n:'HAAVN diamond',d:'Lime light spreading through the tile'},
 {id:'city',n:'Night lights',d:'Soft lights drifting upward'}];
var PAL={
 dark:{b0:'#08090a',b1:'#111315',ink:'243,242,238',gold:'214,179,106',lime:'168,188,16'},
 light:{b0:'#efeeea',b1:'#dddcd7',ink:'21,21,21',gold:'163,120,42',lime:'118,134,8'}};
var K=1.7; /* the page's scrim and dim layers sit over the ground, so strokes are lifted: dark 1.7, light 1.25 */
function rgba(c,a){ a=Math.min(1,a*K); return 'rgba('+c+','+a.toFixed(3)+')' }
function ground(c,w,h,P){ var g=c.createLinearGradient(0,0,0,h); g.addColorStop(0,P.b0); g.addColorStop(1,P.b1); c.fillStyle=g; c.fillRect(0,0,w,h) }
/* a light travelling along a line of points: a soft trail, then a bright head */
function trail(c,pts,head,len,col,lw,closed){
  var seg=[],tot=0,i,n=pts.length,m=closed?n:n-1; for(i=0;i<m;i++){ var a=pts[i],b=pts[(i+1)%n],d=Math.hypot(b[0]-a[0],b[1]-a[1]); seg.push(d); tot+=d }
  function at(s){ s=((s%tot)+tot)%tot; for(var j=0;j<m;j++){ if(s<=seg[j]){ var a2=pts[j],b2=pts[(j+1)%n],u=seg[j]?s/seg[j]:0; return [a2[0]+(b2[0]-a2[0])*u,a2[1]+(b2[1]-a2[1])*u] } s-=seg[j] } return pts[0] }
  var steps=22,prev=at(head-len); c.lineCap='round'; c.lineWidth=lw;
  for(i=1;i<=steps;i++){ var p=at(head-len+len*i/steps), f=i/steps; c.beginPath(); c.moveTo(prev[0],prev[1]); c.lineTo(p[0],p[1]); c.strokeStyle=rgba(col,f*f*.95); c.stroke(); prev=p }
  var hd=at(head); c.beginPath(); c.arc(hd[0],hd[1],lw*1.25,0,6.283); c.fillStyle=rgba(col,1); c.fill() }
function plen(pts,closed){ var t=0,n=pts.length,m=closed?n:n-1; for(var i=0;i<m;i++){ var a=pts[i],b=pts[(i+1)%n]; t+=Math.hypot(b[0]-a[0],b[1]-a[1]) } return t }
function poly(c,pts,closed){ c.beginPath(); c.moveTo(pts[0][0],pts[0][1]); for(var i=1;i<pts.length;i++) c.lineTo(pts[i][0],pts[i][1]); if(closed) c.closePath() }
var CITY=null;
var DRAW={
 ring:function(c,w,h,t,P){ ground(c,w,h,P); var cx=w/2, cy=h*(w<h?.4:.45), R=Math.min(w,h)*(w<h?.3:.27);
   for(var k=0;k<3;k++){ var ph=((t*.00012)+k/3)%1; c.beginPath(); c.arc(cx,cy,R*(1+ph*1.9),0,6.283); c.strokeStyle=rgba(P.ink,(1-ph)*.12); c.lineWidth=1; c.stroke() }
   c.beginPath(); c.arc(cx,cy,R,0,6.283); c.strokeStyle=rgba(P.ink,.3); c.lineWidth=Math.max(2,R*.045); c.stroke();
   var a0=t*.0006; c.beginPath(); c.arc(cx,cy,R,a0,a0+1); c.strokeStyle=rgba(P.gold,1); c.lineWidth=Math.max(2.5,R*.05); c.lineCap='round'; c.stroke();
   c.beginPath(); c.moveTo(cx-R*.3,cy+R*.4); c.lineTo(cx,cy-R*.38); c.lineTo(cx+R*.3,cy+R*.4); c.strokeStyle=rgba(P.ink,.5); c.lineWidth=Math.max(2,R*.034); c.lineJoin='round'; c.lineCap='butt'; c.stroke() },
 a:function(c,w,h,t,P){ ground(c,w,h,P); var cx=w/2, cy=h*(w<h?.44:.5), H=Math.min(w,h)*(w<h?.34:.4), hw=H*.5;
   function A(s){ return [[cx-hw*s,cy+H*s*.9],[cx,cy-H*s*.95],[cx+hw*s,cy+H*s*.9]] }
   for(var k=3;k>=1;k--){ var s=1+k*.24*(1+.12*Math.sin(t*.0004-k)); poly(c,A(s),false); c.strokeStyle=rgba(P.ink,.14/k); c.lineWidth=1; c.lineJoin='round'; c.stroke() }
   var m=A(1); poly(c,m,false); c.strokeStyle=rgba(P.ink,.34); c.lineWidth=Math.max(2,H*.028); c.lineJoin='round'; c.lineCap='butt'; c.stroke();
   var L=plen(m,false); trail(c,m,((t*.00016)%1.3)*L,L*.28,P.gold,Math.max(2.5,H*.034),false) },
 x:function(c,w,h,t,P){ ground(c,w,h,P); var cx=w/2, cy=h*(w<h?.42:.48), R=Math.min(w,h)*(w<h?.34:.4), s=R/102;
   var V=[[64.49,20.57],[109.63,120],[130.37,120],[175.51,19.96],[119.39,112.68]];
   function map(p){ return [cx+(p[0]-120)*s*.85*1.2, cy+(p[1]-120)*s*.85*1.2] }
   var top=V.map(function(p){ return map([p[0],p[1]+4]) }), bot=V.map(function(p){ return map([p[0],(240-p[1])-4]) });
   for(var k=2;k>=1;k--){ var e=1+k*.2*(1+.1*Math.sin(t*.0004-k)); [top,bot].forEach(function(pp){ poly(c,pp.map(function(p){ return [cx+(p[0]-cx)*e,cy+(p[1]-cy)*e] }),true); c.strokeStyle=rgba(P.ink,.12/k); c.lineWidth=1; c.stroke() }) }
   [top,bot].forEach(function(pp){ poly(c,pp,true); c.strokeStyle=rgba(P.ink,.36); c.lineWidth=Math.max(1.6,R*.014); c.lineJoin='miter'; c.stroke() });
   var L=plen(top,true), ph=(t*.00014)%1; trail(c,top,ph*L,L*.22,P.gold,Math.max(2.4,R*.02),true); trail(c,bot,((ph+.5)%1)*L,L*.22,P.gold,Math.max(2.4,R*.02),true) },
 survey:function(c,w,h,t,P){ ground(c,w,h,P); var cx=w*.5, cy=h*.46, Rm=Math.hypot(w,h)*.52, n=18;
   for(var k=1;k<=n;k++){ var r0=Rm*Math.pow(k/n,1.05); c.beginPath();
     for(var th=0;th<=6.2832;th+=.06){ var r=r0*(1+.045*Math.sin(3*th+t*.00022+k*.5)+.03*Math.sin(5*th-t*.00017+k*.8)+.015*Math.sin(8*th+t*.0003)); var x=cx+Math.cos(th)*r, y=cy+Math.sin(th)*r*.82; th?c.lineTo(x,y):c.moveTo(x,y) }
     c.closePath(); var gold=k%6===0; c.strokeStyle=gold?rgba(P.gold,.6):rgba(P.ink,.1+(k%5===0?.1:0)); c.lineWidth=gold?1.5:1; c.stroke() }
   c.beginPath(); c.arc(cx,cy,3.5,0,6.283); c.fillStyle=rgba(P.gold,1); c.fill() },
 haavn:function(c,w,h,t,P,dark){ ground(c,w,h,dark?{b0:'#0a0c0b',b1:'#131614'}:P); var cx=w/2, cy=h*(w<h?.42:.46), u=Math.min(w,h)*.085;
   for(var k=0;k<6;k++){ var ph=((t*.00016)+k/6)%1, s=.5+ph*5.4, a=u*2*s, b=u*s; c.beginPath(); c.moveTo(cx,cy-b); c.lineTo(cx+a,cy); c.lineTo(cx,cy+b); c.lineTo(cx-a,cy); c.closePath(); c.strokeStyle=rgba(P.lime,Math.pow(1-ph,1.6)*.85); c.lineWidth=1.5; c.stroke(); c.strokeStyle=rgba(P.ink,(1-ph)*.1); c.lineWidth=1; c.stroke() }
   var g=c.createRadialGradient(cx,cy,0,cx,cy,u*2.4); g.addColorStop(0,rgba(P.lime,.35)); g.addColorStop(1,rgba(P.lime,0)); c.fillStyle=g; c.fillRect(cx-u*3,cy-u*3,u*6,u*6);
   c.beginPath(); c.moveTo(cx,cy-u*.5); c.lineTo(cx+u,cy); c.lineTo(cx,cy+u*.5); c.lineTo(cx-u,cy); c.closePath(); c.fillStyle=rgba(P.lime,.95); c.fill() },
 city:function(c,w,h,t,P){ if(!CITY){ CITY=[]; for(var i=0;i<46;i++) CITY.push({x:Math.random(),y:Math.random(),r:8+Math.random()*40,v:.4+Math.random(),c:i%4,a:.08+Math.random()*.2}) }
   ground(c,w,h,P); var cols=[P.gold,'122,184,255',P.ink,P.gold]; if(P.ink==='21,21,21') cols=[P.gold,'90,130,190','90,90,90',P.gold];
   CITY.forEach(function(p){ var y=(((p.y-(t*.000012*p.v*(p.r/20)))%1)+1)%1, x=p.x+Math.sin(t*.0002*p.v+p.y*9)*.012, px=x*w, py=y*h, rg=c.createRadialGradient(px,py,0,px,py,p.r), a=p.a*(P.ink==='21,21,21'?.8:1);
     rg.addColorStop(0,rgba(cols[p.c],a)); rg.addColorStop(1,rgba(cols[p.c],0)); c.fillStyle=rg; c.beginPath(); c.arc(px,py,p.r,0,6.283); c.fill() }) }
};

/* ---------- the engine ---------- */
var gEl=null, cv=null, cx=null, raf=0, last=0, id=get(KEY)||'', still=get(KSTILL)==='1', T0=performance.now(), vw=0, vh=0, scheme='dark';
var reduced=false; try{ reduced=matchMedia('(prefers-reduced-motion: reduce)').matches }catch(e){}
function curScheme(){ return (window.AtriumScheme&&AtriumScheme.get())==='light'?'light':'dark' }
function build(){ if(gEl) return; gEl=D.createElement('div'); gEl.id='lvGround'; gEl.setAttribute('aria-hidden','true'); cv=D.createElement('canvas'); gEl.appendChild(cv); B.insertBefore(gEl,B.firstChild); cx=cv.getContext('2d') }
function fit(){ if(!cv) return; var d=Math.min(innerWidth<=760?1.25:1.5,window.devicePixelRatio||1); vw=innerWidth; vh=innerHeight; cv.width=Math.round(vw*d); cv.height=Math.round(vh*d); cx.setTransform(d,0,0,d,0,0) }
function draw(now){ var f=DRAW[id]; if(!f||!cx) return; scheme=curScheme(); K=scheme==='light'?1.25:1.7; f(cx,vw,vh,(still||reduced)?4000:now-T0,PAL[scheme],scheme==='dark') }
function frame(now){ raf=0; if(!id||!DRAW[id]) return; if(!still&&!reduced&&!D.hidden){ if(now-last>=33){ last=now; draw(now) } raf=requestAnimationFrame(frame) } }
function kick(){ if(!id||!DRAW[id]) return; if(still||reduced||D.hidden){ draw(performance.now()); return } if(!raf) raf=requestAnimationFrame(frame) }
function repaint(){ if(window.AtriumChatRepaint) try{ AtriumChatRepaint() }catch(e){} }
function set(next){ id=(next&&DRAW[next])?next:''; put(KEY,id); B.classList.toggle('lv-on',!!id); if(id){ build(); fit(); kick() } else if(raf){ cancelAnimationFrame(raf); raf=0 } paint(); repaint() }
function setStill(v){ still=!!v; put(KSTILL,still?'1':'0'); kick(); paintStill() }
addEventListener('resize',function(){ if(id){ fit(); kick() } }); D.addEventListener('visibilitychange',function(){ if(id) kick() });
if(window.AtriumScheme&&AtriumScheme.onChange) AtriumScheme.onChange(function(){ if(id) kick() });
window.AtriumLive={get:function(){return id},on:function(){return !!id},set:set,still:setStill,list:LIVE};

/* ---------- the choice, in the wallpaper sheet ---------- */
function paint(){ $$('#lvSec [data-lv]').forEach(function(b){ b.classList.toggle('on',b.getAttribute('data-lv')===id) }) }
function paintStill(){ var t=$('#lvStill'); if(t){ t.classList.toggle('on',still); t.setAttribute('aria-checked',still?'true':'false') } }
function inject(){ var sh=$('#ovWall .sheet'); if(!sh||$('#lvSec',sh)) return; var lead=$('.lead',sh); if(!lead) return;
  var s=D.createElement('div'); s.id='lvSec';
  s.innerHTML='<div class="mono gl" style="margin-top:14px">Live grounds</div>'
   +'<div class="lead" style="margin-top:6px">Moves behind any chat on the ATRIUM ground. A chat with a wallpaper of its own keeps it.</div>'
   +'<div class="lvg"><button type="button" data-lv="" class="on"><b>ATRIUM film</b><small>The default</small></button>'+LIVE.map(function(l){ return '<button type="button" data-lv="'+l.id+'"><b>'+l.n+'</b><small>'+l.d+'</small></button>' }).join('')+'</div>'
   +'<div class="sw" style="margin-top:12px"><div class="l"><b>Still wallpapers only</b><span>Stops all movement. It also stops by itself when ATRIUM is not on screen or the device asks for reduced motion</span></div><button class="tg" id="lvStill" type="button" role="switch" aria-checked="false" aria-label="Still wallpapers only"></button></div>';
  lead.parentNode.insertBefore(s,lead.nextSibling);
  s.addEventListener('click',function(e){ var b=e.target.closest('[data-lv]'); if(b){ set(b.getAttribute('data-lv')); return } if(e.target.closest('#lvStill')) setStill(!still) });
  paint(); paintStill() }
var ov=$('#ovWall'); if(ov){ inject(); new MutationObserver(function(){ if(ov.classList.contains('on')) inject() }).observe(ov,{attributes:true,attributeFilter:['class']}) }
if(id&&DRAW[id]){ B.classList.add('lv-on'); build(); fit(); kick() } else id='';
})();
