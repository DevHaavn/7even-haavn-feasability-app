/* the copy pass, run after the deck builds. */
(function(){
  /* the magazine furniture goes: no "Issue N° 03" */
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

  /* the writing: headlines are sentences. No tilde shorthand, no brackets. */
  function words(){
    document.querySelectorAll('.mast').forEach(function(h){
      var w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT),n,first=true;
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

  /* which kind of ground each slide gets (1-based slide numbers) */
  var PHOTO=[1,7,8,10,17,22,25,45], BW=[4,14,19,31,44], GRAD=[39],
      FLAT=[29,33,34,35,36,37,38,40,41,42];
  function grounds(){
    document.querySelectorAll('.slide').forEach(function(sl,i){
      var n=i+1, k='still';
      if(PHOTO.indexOf(n)>=0) k='photo'; else if(GRAD.indexOf(n)>=0) k='grad'; else if(BW.indexOf(n)>=0) k='bw'; else if(FLAT.indexOf(n)>=0) k='flat';
      sl.setAttribute('data-bg',k);
    });
  }
  grounds();
  /* photo slides whose image runs black and white (1-based) */
  var MONO=[];
  function mono(){ document.querySelectorAll('.slide').forEach(function(sl,i){ if(MONO.indexOf(i+1)>=0) sl.setAttribute('data-mono','1'); }); }
  mono();
  /* the two renders Jamie chose: the golden hour render is the cover, the autumn render fades up behind the share table */
  function renders(){
    var sl=document.querySelectorAll('.slide');
    var a=sl[0]&&sl[0].querySelector('.bleed img'); if(a) a.setAttribute('src','assets/hero-render.jpg');
    var b=sl[38]&&sl[38].querySelector('.bleed img'); if(b) b.setAttribute('src','assets/render-autumn-grad.jpg');
    var h=sl[7]&&sl[7].querySelector('.bleed img'); if(h){ h.setAttribute('src','assets/solum-night.jpg'); sl[7].setAttribute('data-solum','1'); }  /* page 8 (HAAVN): the SOLUM night render, in colour (data-solum) */
    var c=sl[44]&&sl[44].querySelector('.bleed img'); if(c){ c.setAttribute('src','a/r-corner.jpg'); c.style.objectPosition='48% 60%'; }  /* the park corner render closes the deck */
  }
  renders();

  /* the very big 7 is the brand's 7, the blade from the 7EVEN wordmark (same two polygons as the site), never a typeset numeral.
     Only oversized 7s: the medium numerals (slide 5 and the figures) stay as they are. */
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
