/* HAAVN Hotels: the construction sequence player. Mounts the 3D scene (hotel-scene.js) into a host element and draws the captions, phase timeline,
   play / scrub controls, the two connection details (two podium pins; one pin and a locking collar) and the cross-fade to the finished tower render.
   Plays while its slide is showing. */
(function(){
'use strict';
function ease(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function pad(n){return n<10?'0'+n:''+n}
function mm(t){var s=Math.floor(t);return '00:'+pad(s)}

/* four locating pins per room box: plan of one 3.5 x 10 m box, a pin at each corner */
var PINS2='<svg viewBox="0 0 150 130" aria-hidden="true"><rect x="53" y="8" width="44" height="114" fill="#d8d5cb" stroke="#8d9086" stroke-width="2"/>'+
  '<path d="M75 20v90" stroke="#bdb9ac" stroke-width="1" stroke-dasharray="3 4"/>'+
  '<g fill="#A8BC10" stroke="#4d5a00" stroke-width="1.5"><circle cx="60" cy="16" r="5.5"/><circle cx="90" cy="16" r="5.5"/><circle cx="60" cy="114" r="5.5"/><circle cx="90" cy="114" r="5.5"/></g>'+
  '<text x="75" y="66" text-anchor="middle" font-family="Oxanium,sans-serif" font-size="13" font-weight="600" fill="#4b4d46">4 PINS</text></svg>';
/* the same four pins at every level, with a locking collar at each joint: an elevation of a stack of boxes */
var PIN1='<svg viewBox="0 0 150 130" aria-hidden="true">'+
  '<rect x="28" y="92" width="94" height="30" fill="#8d9086"/><rect x="28" y="62" width="94" height="30" fill="#9a9d92"/>'+
  '<g class="bx"><rect x="28" y="32" width="94" height="30" fill="#8d9086"/><rect x="28" y="60" width="94" height="3" fill="#55585a"/></g>'+
  '<g fill="#A8BC10" stroke="#4d5a00" stroke-width="1"><rect x="31" y="84" width="7" height="16"/><rect x="112" y="84" width="7" height="16"/><rect x="31" y="54" width="7" height="16"/><rect x="112" y="54" width="7" height="16"/></g>'+
  '<g class="co" fill="none" stroke="#d1ae63" stroke-width="3.5"><ellipse cx="34.5" cy="92" rx="7" ry="2.6"/><ellipse cx="115.5" cy="92" rx="7" ry="2.6"/><ellipse cx="34.5" cy="62" rx="7" ry="2.6"/><ellipse cx="115.5" cy="62" rx="7" ry="2.6"/></g>'+
  '<path d="M138 22v34" stroke="#6a7a00" stroke-width="2"/><path d="M133 50l5 8 5-8z" fill="#6a7a00"/></svg>';

function mount(host){
  var wmw=host.getAttribute('data-wmw')||'',fin=host.getAttribute('data-fin')||'',poster=host.getAttribute('data-poster')||'';
  host.innerHTML='<canvas class="asm-cv"></canvas><img class="asm-poster" alt="" src="'+poster+'"><img class="asm-fin" alt="The completed HAAVN Hotels tower" src="'+fin+'">'+
    '<div class="asm-meta"><span class="m1"></span><span class="m2"></span></div>'+
    '<div class="asm-cap"><b class="n"></b><span class="t"></span><p class="x"></p></div>'+
    '<div class="asm-ins"><div><em>Four pins per box</em>'+PINS2+'</div><div><em>Every level, all the way up</em>'+PIN1+'</div></div>'+
    '<div class="asm-bar"><button class="pl" aria-label="Play or pause"></button><div class="tr"><i class="fl"></i><span class="ph"></span></div><span class="tm"></span></div>';
  var cv=host.querySelector('canvas'),capN=host.querySelector('.n'),capT=host.querySelector('.t'),capX=host.querySelector('.x'),m1=host.querySelector('.m1'),m2=host.querySelector('.m2'),
      finImg=host.querySelector('.asm-fin'),tr=host.querySelector('.tr'),fl=host.querySelector('.fl'),tm=host.querySelector('.tm'),btn=host.querySelector('.pl'),
      ins=host.querySelector('.asm-ins'),bx=host.querySelectorAll('.bx'),co=host.querySelector('.co');
  var S=null,t=0,playing=false,last=0,raf=0,bad=false,sized='',PH=null,marks=[];
  var PHASES=[
    {n:'01',a:0,t:'Concrete podium',x:'Concrete columns, beams and transfer slabs establish the two podium levels. The HAAVN tower crane is already on site.'},
    {n:'02',a:14,t:'One central core',x:'A single compact concrete lift core, 7 \u00d7 10 m, rises through the middle of the tower. Rooms, corridor and service modules wrap around it.'},
    {n:'03',a:24,t:'Modules by truck',x:'Factory-completed room boxes queue beside the tower crane.'},
    {n:'04',a:31,t:'The first lift',x:'The crane lowers the first room box onto the podium slab. Four locating pins, one at each corner, receive it.'},
    {n:'05',a:44,t:'Box to box',x:'The next box lowers onto the four corner pins of the box below, and a locking collar secures each joint. It repeats at every level.'},
    {n:'06',a:54,t:'28 guest levels',x:'Room pods and separate 2 m corridor cassettes stack through 28 guest levels, four corner pins per box at every level. The crane climbs with the building.'},
    {n:'07',a:70,t:'Facade and podium',x:'Bronze fins, glazing and the podium envelope complete the tower, and the crane stands down.'},
    {n:'08',a:76,t:'The completed tower',x:'A concept render of the completed HAAVN Hotels tower. Illustrative.'}];
  function init(){
    if(S||bad)return;
    try{S=HotelScene.create(cv,{wordmark:wmw,maxDpr:1.6,shadow:2048});}catch(e){bad=true;host.classList.add('nogl');return}
    PH=PHASES;var D=S.info.duration;
    var ph=host.querySelector('.ph');PH.forEach(function(p,i){var nx=i<PH.length-1?PH[i+1].a:D;var s=document.createElement('span');s.style.left=(p.a/D*100)+'%';s.style.width=((nx-p.a)/D*100)+'%';s.innerHTML='<b>'+p.n+'</b><span class="tx">'+p.t+'</span>';ph.appendChild(s)});marks=[].slice.call(ph.children);
    fit();narrow();
  }
  function narrow(){if(!S)return;var w=tr.getBoundingClientRect().width,D=S.info.duration;marks.forEach(function(m,i){var nx=i<PH.length-1?PH[i+1].a:D;m.classList.toggle('sm',(nx-PH[i].a)/D*w<165)})}
  function fit(){
    if(!S)return;var r=cv.getBoundingClientRect(),k=r.width+'x'+r.height;if(k===sized||r.width<10)return;sized=k;S.resize(r.width,r.height);S.render(t);narrow();
  }
  function ui(){
    if(!S)return;var D=S.info.duration;
    var pi=0;PH.forEach(function(p,i){if(t>=p.a)pi=i});var p=PH[pi];capN.textContent=p.n;capT.textContent=p.t;capX.textContent=p.x;
    marks.forEach(function(m,i){m.classList.toggle('on',i===pi)});fl.style.width=(t/D*100)+'%';tm.textContent=mm(t)+' / '+mm(D);
    var n=S.info.placedAt(t),inStack=t>=54&&t<70;
    if(inStack){var lvl=Math.min(28,Math.floor(n/S.info.perFloor)+1);m1.textContent='Level '+pad(lvl+2)+' / 30';m1.style.display='inline-block'}
    else if(t>=70){m1.textContent='30 storeys';m1.style.display='inline-block'}
    else{m1.textContent='';m1.style.display='none'}
    m2.textContent=inStack?'Time-lapse':'';m2.style.display=inStack?'inline-block':'none';
    // connection details: two pins while the first box lands, one pin and collar for the next
    var show=t>=33&&t<56;ins.style.opacity=show?1:0;
    var a=ease(clamp((t-33)/7,0,1)),b=ease(clamp((t-45)/7,0,1));
    if(bx.length){bx[0].style.transform='translateY('+(-30*(1-b)).toFixed(1)+'px)'}
    co.style.opacity=ease(clamp((t-51.5)/1.5,0,1));
    finImg.style.opacity=ease(clamp((t-76)/4,0,1));
    host.classList.toggle('endcard',t>=76);
  }
  function frame(now){
    raf=requestAnimationFrame(frame);
    if(!S){init();if(!S)return}
    fit();var dt=last?Math.min(.1,(now-last)/1000):0;last=now;
    if(playing){t+=dt;if(t>=S.info.duration+1.5)t=0}
    S.render(Math.min(t,S.info.duration));ui();
  }
  function start(){if(raf)return;last=0;playing=true;btn.classList.add('on');raf=requestAnimationFrame(frame)}
  function stop(){if(raf){cancelAnimationFrame(raf);raf=0}last=0}
  function setT(v){t=clamp(v,0,S?S.info.duration:82);if(S){S.render(t);ui()}}
  function pointT(e){var r=tr.getBoundingClientRect();return clamp((e.clientX-r.left)/r.width,0,1)*(S?S.info.duration:82)}
  var drag=false;
  tr.addEventListener('pointerdown',function(e){e.stopPropagation();drag=true;try{tr.setPointerCapture(e.pointerId)}catch(x){}setT(pointT(e))});
  tr.addEventListener('pointermove',function(e){if(drag)setT(pointT(e))});
  tr.addEventListener('pointerup',function(e){drag=false});
  btn.addEventListener('click',function(e){e.stopPropagation();playing=!playing;btn.classList.toggle('on',playing)});
  host.addEventListener('click',function(e){e.stopPropagation()});
  window.addEventListener('resize',function(){sized=''});
  var api={start:start,stop:stop,setT:setT,get t(){return t},restart:function(){t=0;playing=true;btn.classList.add('on')},isBad:function(){return bad}};host.__ctl=api;return api;
}
window.HotelUI={mount:mount};
})();
