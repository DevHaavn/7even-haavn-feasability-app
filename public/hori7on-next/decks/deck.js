/* the copy pass for the project decks, run after the deck builds */
(function(){
  /* one gold number per slide: the first big figure */
  function accent(){
    document.querySelectorAll('.slide').forEach(function(sl){
      if(sl.querySelector('.num.ac')) return;
      var n=sl.querySelector('.num.xl')||sl.querySelector('.num.l')||sl.querySelector('.num');
      if(n) n.classList.add('ac');
    });
  }
  /* any slide with no ground set gets the ATRIUM still */
  function grounds(){ document.querySelectorAll('.slide').forEach(function(sl){ if(!sl.getAttribute('data-bg')) sl.setAttribute('data-bg','still'); }); }
  /* the very big 7 is the brand's blade 7 from the wordmark artwork, never a typeset numeral */
  var SEVEN='<svg class="dev7" viewBox="0 0 94 89" aria-label="7" role="img"><polygon points="0,0 94,0 87.31,8.5 0,8.5"/><polygon points="74.6,14.5 59.1,14.5 16,89"/></svg>';
  function sevens(){
    document.querySelectorAll('.slide div').forEach(function(d){
      if(d.children.length||d.textContent.trim()!=='7') return;
      if(parseFloat(getComputedStyle(d).fontSize)<400) return;
      d.innerHTML=SEVEN; d.classList.add('big7');
    });
  }
  function run(){ accent(); grounds(); sevens(); }
  if(document.readyState!=='loading') run(); else document.addEventListener('DOMContentLoaded',run);
  setTimeout(run,600);
})();
