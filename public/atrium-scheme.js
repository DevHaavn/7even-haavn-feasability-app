/* ATRIUM Dark / Light scheme, shared by the Chat and Notes pages.
   Sets html[data-scheme="dark"|"light"] before the page paints, remembers the choice on this device, and tells the page when it changes.
   - The Chat on its own (browser tab or the installed Chat app): the person's choice, saved under 'atrium-chat-scheme' as dark, light or auto (match the device). Default is dark, as before.
   - The Chat inside ATRIUM's drawer (?embed=1): follows ATRIUM's own light / dark switch ('atrium_theme'), so there is one switch in ATRIUM.
   - Notes opened inside the Chat: the Chat hands over its scheme (?sch=) and posts every change ({atriumScheme}). A Notes page opened on its own resolves like the Chat.
   API: AtriumScheme.get() -> 'dark'|'light' (what is showing), .pref() -> 'dark'|'light'|'auto', .set(p), .toggle(), .onChange(fn), .follows() -> true when this page does not own the choice. */
(function(){
'use strict';
var root=document.documentElement, KEY='atrium-chat-scheme', EMB=/[?&]embed=1/.test(location.search), forced=(location.search.match(/[?&]sch=(light|dark)/)||[])[1]||null;
var mq=null; try{ mq=window.matchMedia('(prefers-color-scheme: light)') }catch(e){}
var cur='dark', subs=[];
function store(k){ try{ return localStorage.getItem(k) }catch(e){ return null } }
function put(k,v){ try{ localStorage.setItem(k,v) }catch(e){} }
function pref(){ var v=store(KEY); return v==='light'||v==='dark'||v==='auto'?v:'dark' }
/* inside ATRIUM's drawer (embed, no Notes hand-over) the page follows ATRIUM; Notes inside the Chat follows the Chat */
function hosted(){ return !!forced }
function followsAtrium(){ return EMB&&!forced }
function resolve(){
  if(hosted()) return cur;
  if(followsAtrium()) return store('atrium_theme')==='light'?'light':'dark';
  var p=pref(); if(p==='auto') return mq&&mq.matches?'light':'dark'; return p }
function paint(s){
  cur=s; root.setAttribute('data-scheme',s); root.style.colorScheme=s;
  var m=document.querySelector('meta[name=theme-color]'); if(m) m.setAttribute('content',s==='light'?'#e6e5e1':'#1b1c1f');
  for(var i=0;i<subs.length;i++){ try{ subs[i](s) }catch(e){} } }
function refresh(){ var s=resolve(); if(s!==cur) paint(s) }
cur=forced||resolve(); root.setAttribute('data-scheme',cur); root.style.colorScheme=cur;
/* other windows, the ATRIUM shell and the device setting can all change it */
window.addEventListener('storage',function(e){ if(e.key===KEY||e.key==='atrium_theme') refresh() });
if(mq){ var h=function(){ if(!hosted()&&!followsAtrium()&&pref()==='auto') refresh() }; if(mq.addEventListener) mq.addEventListener('change',h); else if(mq.addListener) mq.addListener(h) }
window.addEventListener('message',function(e){ var d=e.data; if(d&&d.atriumScheme&&(d.atriumScheme==='light'||d.atriumScheme==='dark')&&e.source===window.parent&&hosted()) paint(d.atriumScheme) });
window.AtriumScheme={
  get:function(){ return cur },
  pref:function(){ return pref() },
  follows:function(){ return hosted()||followsAtrium() },
  set:function(p){ if(p!=='light'&&p!=='dark'&&p!=='auto') return; if(hosted()||followsAtrium()) return; put(KEY,p); refresh() },
  toggle:function(){ var next=cur==='dark'?'light':'dark'; if(hosted()||followsAtrium()) return cur; put(KEY,next); refresh(); return next },
  onChange:function(fn){ subs.push(fn) }
};
})();
