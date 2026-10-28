/* Deck engine: 1920 x 1080 stage scaled to fit; keys, click, swipe, hash, ?print. */
(function(){
  var print=/[?&]print\b/.test(location.search),framed=false;
  try{framed=window.parent!==window}catch(e){framed=true}
  var root=document.documentElement;
  if(print)root.classList.add('print');
  var fromHub=/\/presentations\/better-living\//.test(location.pathname);
  if(framed)root.classList.add('framed');
  if(framed||fromHub)root.classList.add('canclose');
  var stage=document.getElementById('stage'),S=[].slice.call(document.querySelectorAll('.slide')),N=S.length,cur=-1,prog=[];
  function pad(n){return n<10?'0'+n:''+n}
  function fit(){if(print)return;stage.style.setProperty('--sc',Math.min(innerWidth/1920,innerHeight/1080))}
  function rails(){
    S.forEach(function(sl,i){
      var sec=sl.getAttribute('data-sec')||'';
      if(!sl.classList.contains('cover')){
        var t=document.createElement('div');t.className='rail top';
        t.innerHTML='<span class="l"><span>Quest by Better Living Group</span></span><span></span>';
        sl.appendChild(t);
      } else {
        var t2=document.createElement('div');t2.className='rail top';
        t2.innerHTML='<span></span><span></span>';sl.appendChild(t2);
      }
      var b=document.createElement('div');b.className='rail bot';
      b.innerHTML='<span>Quest by Better Living Group // '+sec+'</span><span class="prog"><i></i></span><span>'+pad(i+1)+' / '+pad(N)+'</span>';
      sl.appendChild(b);prog.push(b.querySelector('.prog i'));
    });
  }
  /* the 3D build animation plays while its slide is showing */
  var asmEl=document.getElementById('asm3d'),asmSlide=asmEl&&asmEl.closest('.slide'),asmCtl=null;
  if(asmEl&&window.AsmUI)asmCtl=window.AsmUI.mount(asmEl);
  function go(n,quiet){
    n=Math.max(0,Math.min(N-1,n));if(n===cur)return;
    S.forEach(function(s,i){s.classList.toggle('on',i===n)});
    cur=n;prog.forEach(function(p,i){if(i===n)p.style.width=Math.round((n+1)/N*100)+'%'});
    document.title=(S[n].getAttribute('data-title')||'Quest by Better Living Group');
    if(asmCtl&&!print){if(S[n]===asmSlide){asmCtl.restart();asmCtl.start()}else asmCtl.stop()}
    if(!quiet&&history.replaceState)history.replaceState(null,'','#'+(n+1));
  }
  function next(){go(cur+1)}function prev(){go(cur-1)}
  function closeMe(){}
  rails();fit();window.addEventListener('resize',fit);
  if(print){S.forEach(function(s){s.classList.add('on')});return}
  var h=parseInt((location.hash||'').replace('#',''),10);go(isNaN(h)?0:h-1,true);
  document.addEventListener('keydown',function(e){
    var k=e.key;
    if((k==='Enter'||k===' ')&&e.target.closest&&e.target.closest('[data-x]')){e.preventDefault();closeMe();return}
    if(k==='ArrowRight'||k==='ArrowDown'||k==='PageDown'||k===' '||k==='Enter'){e.preventDefault();next()}
    else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'||k==='Backspace'){e.preventDefault();prev()}
    else if(k==='Home')go(0);else if(k==='End')go(N-1);
    else if(k==='f'||k==='F'){var d=document.documentElement;if(document.fullscreenElement)document.exitFullscreen();else if(d.requestFullscreen)d.requestFullscreen()}
    else if(k==='Escape'&&!document.fullscreenElement&&(framed||fromHub))closeMe();
  });
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-home]')){location.href='../../index.html#/presentations';return}
    if(e.target.closest('[data-x]')){closeMe();return}
    if(e.target.closest('a,button,.asmx'))return;
    if(e.clientX<innerWidth*.22)prev();else next();
  });
  var x0=null;
  document.addEventListener('touchstart',function(e){x0=e.touches[0].clientX},{passive:true});
  document.addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>50){dx<0?next():prev()}x0=null},{passive:true});
  window.addEventListener('hashchange',function(){var n=parseInt((location.hash||'').replace('#',''),10);if(!isNaN(n))go(n-1,true)});
  window.focus();
})();
