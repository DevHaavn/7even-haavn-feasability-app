/* ATRIUM Dark / Light scheme, shared by the Chat and Notes pages.
   Sets html[data-scheme="dark"|"light"] before the page paints, remembers the choice on this device, and tells the page when it changes.
   - The Chat on its own (browser tab or the installed Chat app): the person's choice, saved under 'atrium-chat-scheme' as dark, light or auto (match the device). Default is dark, as before.
   - The Chat inside ATRIUM's drawer (?embed=1) is the same: it has its own switch in the drawer's rail and shares this device's saved choice. It does NOT follow ATRIUM's 'atrium_theme' (ATRIUM's hub is dark whatever that says).
   - Notes opened inside the Chat: the Chat hands over its scheme (?sch=) and posts every change ({atriumScheme}). A Notes page opened on its own resolves like the Chat.
   API: AtriumScheme.get() -> 'dark'|'light' (what is showing), .pref() -> 'dark'|'light'|'auto', .set(p), .toggle(), .onChange(fn), .follows() -> true when this page does not own the choice. */
(function(){
'use strict';
var root=document.documentElement, KEY='atrium-chat-scheme', forced=(location.search.match(/[?&]sch=(light|dark)/)||[])[1]||null;
var mq=null; try{ mq=window.matchMedia('(prefers-color-scheme: light)') }catch(e){}
var cur='dark', subs=[];
function store(k){ try{ return localStorage.getItem(k) }catch(e){ return null } }
function put(k,v){ try{ localStorage.setItem(k,v) }catch(e){} }
function pref(){ var v=store(KEY); return v==='light'||v==='dark'||v==='auto'?v:'dark' }
/* Notes inside the Chat follows the Chat (the Chat hands over its scheme); every other page owns its choice */
function hosted(){ return !!forced }
function resolve(){
  if(hosted()) return cur;
  var p=pref(); if(p==='auto') return mq&&mq.matches?'light':'dark'; return p }
function paint(s){
  cur=s; root.setAttribute('data-scheme',s); root.style.colorScheme=s;
  var m=document.querySelector('meta[name=theme-color]'); if(m) m.setAttribute('content',s==='light'?'#e6e5e1':'#1b1c1f');
  for(var i=0;i<subs.length;i++){ try{ subs[i](s) }catch(e){} } }
function refresh(){ var s=resolve(); if(s!==cur) paint(s) }
cur=forced||resolve(); root.setAttribute('data-scheme',cur); root.style.colorScheme=cur;
/* other windows, the ATRIUM shell and the device setting can all change it */
window.addEventListener('storage',function(e){ if(e.key===KEY) refresh() });
if(mq){ var h=function(){ if(!hosted()&&pref()==='auto') refresh() }; if(mq.addEventListener) mq.addEventListener('change',h); else if(mq.addListener) mq.addListener(h) }
window.addEventListener('message',function(e){ var d=e.data; if(d&&d.atriumScheme&&(d.atriumScheme==='light'||d.atriumScheme==='dark')&&e.source===window.parent&&hosted()) paint(d.atriumScheme) });
window.AtriumScheme={
  get:function(){ return cur },
  pref:function(){ return pref() },
  follows:function(){ return hosted() },
  set:function(p){ if(p!=='light'&&p!=='dark'&&p!=='auto') return; if(hosted()) return; put(KEY,p); refresh() },
  toggle:function(){ var next=cur==='dark'?'light':'dark'; if(hosted()) return cur; put(KEY,next); refresh(); return next },
  onChange:function(fn){ subs.push(fn) }
};
})();
