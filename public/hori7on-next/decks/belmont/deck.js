/* Belmont Estate deck engine: 1920 x 1080 stage scaled to fit, keys, click, swipe, hash, ?print. */
(function(){
  var print=/[?&]print\b/.test(location.search);
  if(print)document.documentElement.classList.add('print');
  var stage=document.getElementById('stage'),S=[].slice.call(document.querySelectorAll('.slide')),N=S.length,cur=-1;
  function pad(n){return n<10?'0'+n:''+n}
  function fit(){if(print)return;stage.style.setProperty('--sc',Math.min(innerWidth/1920,innerHeight/1080))}
  function rails(){
    S.forEach(function(sl,i){
      var sec=sl.getAttribute('data-sec')||'';
      var t=document.createElement('div');t.className='rail top';
      t.innerHTML='<span class="l"><img src="a/7even.png" alt="7EVEN"><i></i>Project presentation</span><span class="r">Belmont Estate</span>';
      var b=document.createElement('div');b.className='rail bot';
      b.innerHTML='<span>7even.au · '+sec+'</span><span>'+pad(i+1)+' / '+pad(N)+'</span>';
      sl.appendChild(t);sl.appendChild(b);
    });
  }
  function go(n,quiet){
    n=Math.max(0,Math.min(N-1,n));if(n===cur)return;
    S.forEach(function(s,i){s.classList.toggle('on',i===n)});
    cur=n;var tt=S[n].getAttribute('data-title')||'Belmont Estate';document.title=tt==='Belmont Estate'?'Belmont Estate · Project presentation':tt+' · Belmont Estate';
    if(!quiet&&history.replaceState)history.replaceState(null,'','#'+(n+1));
  }
  function next(){go(cur+1)}function prev(){go(cur-1)}
  rails();fit();window.addEventListener('resize',fit);
  if(print){S.forEach(function(s){s.classList.add('on')});return}
  var h=parseInt((location.hash||'').replace('#',''),10);go(isNaN(h)?0:h-1,true);
  document.addEventListener('keydown',function(e){
    var k=e.key;
    if(k==='ArrowRight'||k==='ArrowDown'||k==='PageDown'||k===' '||k==='Enter'){e.preventDefault();next()}
    else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'||k==='Backspace'){e.preventDefault();prev()}
    else if(k==='Home'){go(0)}else if(k==='End'){go(N-1)}
    else if(k==='f'||k==='F'){var d=document.documentElement;if(document.fullscreenElement)document.exitFullscreen();else if(d.requestFullscreen)d.requestFullscreen()}
  });
  document.addEventListener('click',function(e){if(e.target.closest('a'))return;if(e.clientX<innerWidth*.22)prev();else next()});
  var x0=null;
  document.addEventListener('touchstart',function(e){x0=e.touches[0].clientX},{passive:true});
  document.addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>50){dx<0?next():prev()}x0=null},{passive:true});
  window.addEventListener('hashchange',function(){var n=parseInt((location.hash||'').replace('#',''),10);if(!isNaN(n))go(n-1,true)});
  window.focus();
})();
