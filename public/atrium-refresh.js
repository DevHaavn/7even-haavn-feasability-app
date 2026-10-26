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
  /* ATRIUM Chat (hidden preview): a chat circle beside the refresh circle, only inside the app and only where the preview is on. */
  var CHAT='<svg viewBox="0 0 240 240" aria-hidden="true"><path class="rb-ring" d="M21.1 168.2 A110 110 0 1 1 82.4 223.4 L18.3 233.0 Z"/><path class="rb-ink" d="M76.0 176.2 L120.0 63.8 L164.0 176.2"/></svg><i class="rb-badge" hidden></i>';
  var chatCount=0;
  function chatOn(){try{var f=localStorage.getItem('atrium_chat_preview');return window.parent!==window&&(f==='1'||(f!=='0'&&(localStorage.getItem('atrium_chat_ms')==='1'||localStorage.getItem('7even_role')==='admin')))}catch(e){return false}}
  function paintChat(){var l=document.querySelectorAll('[data-chat-btn] .rb-badge');for(var i=0;i<l.length;i++){l[i].hidden=!chatCount;l[i].textContent=chatCount}}
  function addChat(){
    if(!chatOn())return;
    var list=document.querySelectorAll('[data-refresh]');
    for(var i=0;i<list.length;i++){var r=list[i];
      if(r.previousElementSibling&&r.previousElementSibling.hasAttribute('data-chat-btn'))continue;
      var b=document.createElement('button');b.type='button';b.className='rb';b.setAttribute('data-chat-btn','');b.setAttribute('data-tip','Chat');b.setAttribute('aria-label','ATRIUM Chat');b.innerHTML=CHAT;
      r.parentNode.insertBefore(b,r);}
    paintChat();
  }
  if(chatOn()){
    document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-chat-btn]');if(b){e.preventDefault();try{window.parent.postMessage({atriumChat:'toggle'},'*')}catch(x){}}},true);
    window.addEventListener('message',function(e){var d=e.data;if(d&&d.atriumChat==='count'){chatCount=d.n||0;paintChat()}});
    try{window.parent.postMessage({atriumChat:'hello'},'*')}catch(e){}
  }
  async function go(b){
    if(b.dataset.busy)return;b.dataset.busy='1';b.classList.add('go');
    try{if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();}catch(e){}
    await new Promise(function(r){setTimeout(r,900);});
    try{if(window.caches){var ks=await caches.keys();await Promise.all(ks.map(function(k){return caches.delete(k);}));}}catch(e){}
    try{if(navigator.serviceWorker){var rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.filter(function(r){return !(((r.active||r.waiting||r.installing||{}).scriptURL)||'').includes('atrium-push-sw');}).map(function(r){return r.unregister();}));}}catch(e){}
    var T=window;try{if(window.top&&window.top.location.origin===location.origin)T=window.top;}catch(e){}
    try{var u=new URL(T.location.href);u.searchParams.set('u',Date.now());T.location.replace(u.toString());}
    catch(e){try{T.location.reload();}catch(e2){location.reload();}}
  }
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-refresh]');if(b){e.preventDefault();go(b);}},true);
  function start(){fill();addChat();var q=0;try{new MutationObserver(function(){if(q)return;q=requestAnimationFrame(function(){q=0;fill();addChat();});}).observe(document.documentElement,{childList:true,subtree:true});}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
