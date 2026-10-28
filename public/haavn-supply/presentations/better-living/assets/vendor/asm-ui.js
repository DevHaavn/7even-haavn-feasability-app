/* HAAVN, Better Living Hotel Project: the build animation player. Mounts the 3D scene (asm-scene.js) into a host element and draws the captions,
   phase timeline, play / scrub controls, the pin and lock detail and the final render cross-fade. Plays while its slide is showing. */
(function(){
'use strict';
function ease(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function pad(n){return n<10?'0'+n:''+n}
function mm(t){var s=Math.floor(t);return '00:'+pad(s)}

var PIN='<svg viewBox="0 0 150 130" aria-hidden="true"><g class="s">'+
  '<rect x="64" y="108" width="22" height="22" fill="#6d7471"/><path d="M60 114h30M60 121h30M60 128h30" stroke="#9aa19d" stroke-width="2"/>'+
  '<rect x="38" y="100" width="74" height="8" fill="#868d89"/></g>'+
  '<g class="pin"><rect x="22" y="58" width="106" height="20" fill="#c9c3b6"/><rect x="22" y="78" width="106" height="22" fill="#6e7a73"/><rect x="22" y="78" width="106" height="4" fill="#8a948d"/><rect x="67" y="78" width="16" height="22" fill="#2b2d2b"/></g>'+
  '<g class="up"><rect x="71" y="84" width="8" height="16" fill="#A8BC10"/><path d="M71 84l2-5h4l2 5z" fill="#A8BC10"/></g>'+
  '<path d="M133 40v36" stroke="#6a7a00" stroke-width="2"/><path d="M128 70l5 8 5-8z" fill="#6a7a00"/></svg>';
var LOCK='<svg viewBox="0 0 150 130" aria-hidden="true"><rect x="14" y="62" width="58" height="46" fill="#6e7a73"/><rect x="78" y="62" width="58" height="46" fill="#6e7a73"/>'+
  '<rect x="14" y="62" width="58" height="5" fill="#8a948d"/><rect x="78" y="62" width="58" height="5" fill="#8a948d"/>'+
  '<g class="lk"><rect x="52" y="46" width="46" height="13" fill="#c39f55"/><rect x="69" y="36" width="12" height="12" fill="#ead3a2"/></g></svg>';

function mount(host){
  var wmw=host.getAttribute('data-wmw')||'',fin=host.getAttribute('data-fin')||'',poster=host.getAttribute('data-poster')||'';
  host.innerHTML='<canvas class="asm-cv"></canvas><img class="asm-poster" alt="" src="'+poster+'"><img class="asm-fin" alt="The finished building, Urban Earth" src="'+fin+'">'+
    '<div class="asm-meta"><span class="m1"></span><span class="m2"></span></div>'+
    '<div class="asm-cap"><b class="n"></b><span class="t"></span><p class="x"></p></div>'+
    '<div class="asm-ins"><div><em>Upward pin / pile baseplate</em>'+PIN+'</div><div><em>Top-corner lock</em>'+LOCK+'</div></div>'+
    '<div class="asm-bar"><button class="pl" aria-label="Play or pause"></button><div class="tr"><i class="fl"></i><span class="ph"></span></div><span class="tm"></span></div>';
  var cv=host.querySelector('canvas'),capN=host.querySelector('.n'),capT=host.querySelector('.t'),capX=host.querySelector('.x'),m1=host.querySelector('.m1'),m2=host.querySelector('.m2'),
      finImg=host.querySelector('.asm-fin'),tr=host.querySelector('.tr'),fl=host.querySelector('.fl'),tm=host.querySelector('.tm'),btn=host.querySelector('.pl'),
      pinG=host.querySelector('.pin'),lkG=host.querySelector('.lk');
  var S=null,t=0,playing=false,last=0,raf=0,bad=false,sized='',PH=null,marks=[];
  function init(){
    if(S||bad)return;
    try{S=AsmScene.create(cv,{wordmark:wmw,maxDpr:1.6,shadow:2048});}catch(e){bad=true;host.classList.add('nogl');return}
    var te=S.info.tEnd;PH=[
      {n:'01',a:0,t:'Screw piles set',x:'Screw piles and their baseplates, each with an upward locating pin, are set out first. A mobile crane and the delivery trucks arrive on site.'},
      {n:'02',a:4.2,t:'Glass portal first',x:'The glass-roof portal is craned in first. It connects both corridor wings.'},
      {n:'03',a:9.2,t:'Ten paired bays',x:'Every module arrives from the factory with its facade already fitted. It is craned straight down and lifted onto the baseplates on its screw piles. An upward locating pin on each baseplate locates it, then it locks at the top corners. Module A carries the 2 m corridor; module B sits opposite.'},
      {n:'04',a:te+.2,t:'Roof cappings and landscaping',x:'Flashings and cappings are fitted to the roof connections. Terraces and landscaping follow, and the crane leaves site. Plant and equipment are installed on site too, not shown here.'},
      {n:'05',a:48.4,t:'The finished building',x:'Urban Earth. A concept render of the finished building, not an exact model of this ten bay demonstration.'}];
    var ph=host.querySelector('.ph');PH.forEach(function(p,i){var nx=i<PH.length-1?PH[i+1].a:S.info.duration;var s=document.createElement('span');s.style.left=(p.a/S.info.duration*100)+'%';s.style.width=((nx-p.a)/S.info.duration*100)+'%';s.innerHTML='<b>'+p.n+'</b><span class="tx">'+p.t+'</span>';s.setAttribute('data-i',i);ph.appendChild(s)});marks=[].slice.call(ph.children);
    fit();narrow();
  }
  function narrow(){if(!S)return;var w=tr.getBoundingClientRect().width,D=S.info.duration;marks.forEach(function(m,i){var nx=i<PH.length-1?PH[i+1].a:D;m.classList.toggle('sm',(nx-PH[i].a)/D*w<175)})}
  function fit(){
    if(!S)return;var r=cv.getBoundingClientRect(),k=r.width+'x'+r.height;if(k===sized||r.width<10)return;sized=k;S.resize(r.width,r.height);S.render(t);narrow();
  }
  function ui(){
    if(!S)return;var D=S.info.duration;
    var pi=0;PH.forEach(function(p,i){if(t>=p.a)pi=i});var p=PH[pi];capN.textContent=p.n;capT.textContent=p.t;capX.textContent=p.x;
    marks.forEach(function(m,i){m.classList.toggle('on',i===pi)});fl.style.width=(t/D*100)+'%';tm.textContent=mm(t)+' / '+mm(D);
    var L=S.info.landings,c=0;L.forEach(function(x){if(x<=t)c++});
    m1.textContent=(t>=9.2&&t<S.info.tEnd+.2)?'Module '+pad(Math.min(20,c+(t<S.info.tEnd?1:0)))+' / 20':(t<4.2?'Site set-up':(t<9.2?'Portal':((t>=S.info.capT0&&t<S.info.capT0+4.6)?'Roof flashings and cappings':'')));
    m2.textContent=(t>14.9&&t<S.info.tEnd)?'Time-lapse':'';m2.style.display=m2.textContent?'inline-block':'none';m1.style.display=m1.textContent?'inline-block':'none';
    // pin + lock detail
    var nl=null,pl=-9;L.forEach(function(x){if(x>=t-.02&&nl===null)nl=x;if(x<=t)pl=x});
    var pp=0;if(nl!==null&&nl-t<.8)pp=ease(1-(nl-t)/.8);if(t-pl<.7&&t>=pl)pp=1;if(t>=9.2&&t<S.info.tEnd+.3&&nl===null)pp=1;
    pinG.style.transform='translateY('+(-26*(1-pp))+'px)';
    var lp=ease(clamp((t-pl-.05)/.45,0,1));if(t<9.2)lp=0;lkG.style.transform='translateY('+(-10*(1-lp))+'px)';lkG.style.opacity=lp;
    finImg.style.opacity=ease(clamp((t-48.4)/2.2,0,1));
    host.classList.toggle('endcard',t>=48.4);
  }
  function frame(now){
    raf=requestAnimationFrame(frame);
    if(!S){init();if(!S)return}
    fit();var dt=last?Math.min(.1,(now-last)/1000):0;last=now;
    if(playing){t+=dt;if(t>=S.info.duration+1.2)t=0}
    S.render(Math.min(t,S.info.duration));ui();
  }
  function start(){if(raf)return;last=0;playing=true;btn.classList.add('on');raf=requestAnimationFrame(frame)}
  function stop(){if(raf){cancelAnimationFrame(raf);raf=0}last=0}
  function setT(v){t=clamp(v,0,S?S.info.duration:54);if(S){S.render(t);ui()}}
  function pointT(e){var r=tr.getBoundingClientRect();return clamp((e.clientX-r.left)/r.width,0,1)*(S?S.info.duration:54)}
  var drag=false;
  tr.addEventListener('pointerdown',function(e){e.stopPropagation();drag=true;try{tr.setPointerCapture(e.pointerId)}catch(x){}setT(pointT(e))});
  tr.addEventListener('pointermove',function(e){if(drag)setT(pointT(e))});
  tr.addEventListener('pointerup',function(e){drag=false});
  btn.addEventListener('click',function(e){e.stopPropagation();playing=!playing;btn.classList.toggle('on',playing)});
  host.addEventListener('click',function(e){e.stopPropagation()});
  window.addEventListener('resize',function(){sized=''});
  var api={start:start,stop:stop,setT:setT,get t(){return t},restart:function(){t=0;playing=true;btn.classList.add('on')},isBad:function(){return bad}};host.__ctl=api;return api;
}
window.AsmUI={mount:mount};
})();
