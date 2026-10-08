/* ATRIUM Workflow and Meeting Management: set the accent colour from the active
   menu item. The colour is the --gc of the menu group the item sits under, so the
   page title, the section headings and the table header all carry the colour of
   the part of the business you are in. Used with atrium-workflow-look.css. */
(function(){
  function active(){return document.querySelector('.rail-item.on,.rail .tab.on')}
  function groupOf(el){
    var g=el.previousElementSibling;
    while(g&&!(g.classList&&g.classList.contains('rail-group')))g=g.previousElementSibling;
    if(!g&&el.parentElement){g=el.parentElement.previousElementSibling;
      while(g&&!(g.classList&&g.classList.contains('rail-group')))g=g.previousElementSibling}
    return g}
  function set(){
    var on=active();if(!on||!document.body)return;
    var c=on.getAttribute('data-acc');          // an item can carry its own colour (Team & lists)
    if(!c){var g=groupOf(on);if(!g)return;c=getComputedStyle(g).getPropertyValue('--gc').trim()}
    if(c&&document.body.style.getPropertyValue('--acc')!==c)document.body.style.setProperty('--acc',c)}
  var q=0;
  function start(){
    set();
    try{new MutationObserver(function(){if(q)return;q=requestAnimationFrame(function(){q=0;set()})})
      .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();

/* The Workflow | Meetings switch in the menu. Only inside the HAAVN Management
   shell (?shell=hm), which owns pillar switching; the shell maps "workflow" to
   the right variant for the signed in user. */
(function(){
  if(/[?&]shell=hm\b/.test(location.search)&&window.parent!==window)document.documentElement.classList.add('in-app');
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-switch]');if(!b)return;
    try{window.parent.postMessage({type:'haavn-switch-pillar',to:b.getAttribute('data-switch')},'*')}catch(x){}});
})();
