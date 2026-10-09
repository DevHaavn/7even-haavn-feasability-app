/* Cunningham Place Geelong partnership memorandum: the copy pass and the grounds, run after the deck builds. */
(function(){
  /* the magazine furniture goes: no "Issue N° 04" */
  function strip(){
    document.querySelectorAll('.rail.top b').forEach(function(b){
      if(/Issue N/i.test(b.textContent)){
        var p=b.parentNode; b.remove();
        p.innerHTML=p.innerHTML.replace(/\s*[·]\s*$/,'');
      }
    });
  }
  if(document.readyState!=='loading') strip(); else document.addEventListener('DOMContentLoaded',strip);
  setTimeout(strip,600);

  /* the writing: headlines are sentences. No tilde shorthand. */
  function words(){
    document.querySelectorAll('.mast').forEach(function(h){
      var w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT),n;
      while((n=w.nextNode())){
        var t=n.nodeValue;
        t=t.replace(/\s*\(incl\. GST\)/,' including GST');
        t=t.replace(/~\$/g,'about $');
        if(/^\s*about /.test(t)) t=t.replace(/^(\s*)about /,'$1About ');
        n.nodeValue=t;
      }
    });
  }
  /* one gold number per slide: the first big figure */
  function accent(){
    document.querySelectorAll('.slide').forEach(function(sl){
      if(sl.querySelector('.num.ac')) return;
      var n=sl.querySelector('.num.xl')||sl.querySelector('.num.l')||sl.querySelector('.num');
      if(n) n.classList.add('ac');
    });
  }
  function run(){ words(); accent(); }
  if(document.readyState!=='loading') run(); else document.addEventListener('DOMContentLoaded',run);
  setTimeout(run,600);

  /* which kind of ground each slide gets (1-based):
     photo  the render in colour under the wash      bw    the render in black and white, faded
     grad   the render fading up out of the ground    flat  nothing behind the figures
     still  (everything else) the ATRIUM ground held deep under the type */
  var PHOTO=[7,8,10,19,41], BW=[4,13,15], GRAD=[39],
      FLAT=[14,16,27,28,29,30,31,32,36];
  function grounds(){
    document.querySelectorAll('.slide').forEach(function(sl,i){
      var n=i+1,k='still';
      if(PHOTO.indexOf(n)>=0) k='photo'; else if(GRAD.indexOf(n)>=0) k='grad'; else if(BW.indexOf(n)>=0) k='bw'; else if(FLAT.indexOf(n)>=0) k='flat';
      sl.setAttribute('data-bg',k);
    });
    var sl=document.querySelectorAll('.slide');
    sl[0].setAttribute('data-cover','');
    sl[sl.length-1].setAttribute('data-close','');
  }
  grounds();

  /* the cover shows the render whole: work out where the picture starts from its own shape */
  function cover(){
    var sl=document.querySelectorAll('.slide')[0],im=sl.querySelector('.bleed img'),b=sl.querySelector('.bleed');
    if(!im||!b) return;
    function set(){ if(im.naturalWidth){ b.style.setProperty('--mx',Math.max(0,(1-0.5625*im.naturalWidth/im.naturalHeight)*100).toFixed(1)+'%'); } }
    if(im.complete) set(); else im.addEventListener('load',set);
  }
  cover();

  /* the HAAVN page uses the SOLUM night render, in colour */
  var h=document.querySelectorAll('.slide')[7]&&document.querySelectorAll('.slide')[7].querySelector('.bleed img');
  if(h){ h.setAttribute('src','assets/solum-night.jpg'); document.querySelectorAll('.slide')[7].setAttribute('data-solum','1'); }

  /* the very big 7 is the brand's blade 7 from the wordmark artwork, never a typeset numeral */
  var SEVEN='<svg class="dev7" viewBox="0 0 94 89" aria-label="7" role="img"><polygon points="0,0 94,0 87.31,8.5 0,8.5"/><polygon points="74.6,14.5 59.1,14.5 16,89"/></svg>';
  function sevens(){
    document.querySelectorAll('.slide div').forEach(function(d){
      if(d.children.length||d.textContent.trim()!=='7') return;
      if(parseFloat(getComputedStyle(d).fontSize)<400) return;
      d.innerHTML=SEVEN; d.classList.add('big7');
    });
  }
  sevens(); setTimeout(sevens,600);
})();
