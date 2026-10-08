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
    var g=groupOf(on);if(!g)return;
    var c=getComputedStyle(g).getPropertyValue('--gc').trim();
    if(c&&document.body.style.getPropertyValue('--acc')!==c)document.body.style.setProperty('--acc',c)}
  var q=0;
  function start(){
    set();
    try{new MutationObserver(function(){if(q)return;q=requestAnimationFrame(function(){q=0;set()})})
      .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
