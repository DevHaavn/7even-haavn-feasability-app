/* ATRIUM footer refresh button, behaviour for the static pages.
   Any <button data-refresh> gets the circling arrow drawn into it and, on
   click, one full turn, then the page the viewer is really on (the top
   window when this page sits inside the app) reloads cache-busted. Saved
   work is given time to flush first, caches and service workers are cleared
   so iOS cannot hand back the old page. Same logic as UpdateButton.tsx. */
(function(){
  var SVG='<svg viewBox="0 0 32 32" aria-hidden="true"><circle class="rb-ring" cx="16" cy="16" r="15"/><g class="rb-arc"><path class="rb-ink" d="M20.98 11.82 A6.5 6.5 0 1 1 12.75 10.37"/><path class="rb-ink" transform="translate(12.75 10.37) rotate(-30)" d="M-2.5 -2.5 L0 0 L-2.5 2.5"/></g></svg>';
  function fill(root){
    var list=(root||document).querySelectorAll('[data-refresh]');
    for(var i=0;i<list.length;i++){var b=list[i];
      if(!b.firstElementChild){b.innerHTML=SVG;}
      if(!b.getAttribute('aria-label'))b.setAttribute('aria-label','Get the latest version');
      if(!b.getAttribute('data-tip'))b.setAttribute('data-tip','Latest version');
      b.removeAttribute('title');
      if(!b.classList.contains('rb'))b.classList.add('rb');}
  }
  async function go(b){
    if(b.dataset.busy)return;b.dataset.busy='1';b.classList.add('go');
    try{if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();}catch(e){}
    await new Promise(function(r){setTimeout(r,900);});
    try{if(window.caches){var ks=await caches.keys();await Promise.all(ks.map(function(k){return caches.delete(k);}));}}catch(e){}
    try{if(navigator.serviceWorker){var rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(function(r){return r.unregister();}));}}catch(e){}
    var T=window;try{if(window.top&&window.top.location.origin===location.origin)T=window.top;}catch(e){}
    try{var u=new URL(T.location.href);u.searchParams.set('u',Date.now());T.location.replace(u.toString());}
    catch(e){try{T.location.reload();}catch(e2){location.reload();}}
  }
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-refresh]');if(b){e.preventDefault();go(b);}},true);
  function start(){fill();var q=0;try{new MutationObserver(function(){if(q)return;q=requestAnimationFrame(function(){q=0;fill();});}).observe(document.documentElement,{childList:true,subtree:true});}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
