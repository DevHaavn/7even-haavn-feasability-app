/* per-project IM export, ported unchanged from hori7on-studio.html (old look; to be moved to the Deep look) */
function imCSS(){return "\
:root{--gold:#d6b36a;--gold2:#e8d296;--ink:#F4F2EC;--ink2:#B9B6AD;--ink3:#7C7A72;--bg:#0A0A0B;--line:rgba(255,255,255,.12);--fd:'Cormorant Garamond',Georgia,serif;--fb:'Inter',system-ui,sans-serif}\
*{margin:0;padding:0;box-sizing:border-box}\
body{background:#040405;font-family:var(--fb);color:var(--ink);-webkit-font-smoothing:antialiased}\
.inb{height:.82em;width:auto;display:inline-block;vertical-align:-.04em;margin:0 .1em}\
.pvbar{position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;gap:18px;padding:10px clamp(16px,3vw,40px);background:rgba(4,5,6,.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}\
.pvbar .t{font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:#9aa0a6}\
.pvbar .t b{color:var(--gold);font-weight:500}\
.pvbar .sp{flex:1}\
.pvbar button{font-family:var(--fb);font-size:10px;letter-spacing:.22em;text-transform:uppercase;background:transparent;border:1px solid var(--gold);border-radius:2px;color:var(--gold);padding:8px 14px;cursor:pointer;transition:.3s}\
.pvbar button:hover{background:var(--gold);color:#0a0a0b}\
.stage{padding:76px 0 80px;display:flex;flex-direction:column;align-items:center;gap:34px}\
.page{width:min(880px,94vw);aspect-ratio:210/297;background:var(--bg);position:relative;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.09),0 40px 90px -40px rgba(0,0,0,.9)}\
.pad{position:absolute;inset:0;padding:7% 8%}\
.eyebrow{font-size:9px;letter-spacing:.4em;text-transform:uppercase;color:var(--gold);font-weight:500}\
.pfoot{position:absolute;left:8%;right:8%;bottom:4.2%;display:flex;justify-content:space-between;align-items:center;font-size:8px;letter-spacing:.24em;text-transform:uppercase;color:var(--ink3);border-top:1px solid var(--line);padding-top:10px}\
.pfoot .wing{height:11px;width:auto;opacity:.8}\
.cov .bgimg{position:absolute;inset:0;background-position:center;background-size:cover;filter:grayscale(1) brightness(.55)}\
.cov .scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,4,5,.75),rgba(4,4,5,.25) 40%,rgba(4,4,5,.9) 88%)}\
.cov .top{position:absolute;top:6%;left:8%;right:8%;display:flex;justify-content:space-between;align-items:center}\
.cov .hor{height:15px;width:auto}\
.cov .conf{font-size:8px;letter-spacing:.3em;text-transform:uppercase;color:var(--ink2);border:1px solid rgba(255,255,255,.3);padding:5px 10px}\
.cov .mid{position:absolute;left:8%;right:8%;top:36%;text-align:center}\
.cov .brand{height:92px;width:auto;filter:drop-shadow(0 4px 20px rgba(0,0,0,.6))}\
.cov .dev{height:110px;width:auto;filter:drop-shadow(0 4px 20px rgba(0,0,0,.6))}\
.cov .nameserif{font-family:var(--fd);font-weight:300;font-size:52px;color:#fff;letter-spacing:.02em}\
.cov .partners{display:flex;justify-content:center;gap:26px;margin-top:22px}\
.cov .partners img{height:17px;width:auto;opacity:.95}\
.cov .imtag{margin-top:30px;font-size:11px;letter-spacing:.5em;text-transform:uppercase;color:var(--gold)}\
.cov .rule{width:70px;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);margin:18px auto 0}\
.cov .bot{position:absolute;left:8%;right:8%;bottom:6%;text-align:center}\
.cov .pn{font-family:var(--fd);font-weight:400;font-size:34px;color:#fff}\
.cov .pl{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink2);margin-top:8px}\
.cov .devline{font-size:8.5px;letter-spacing:.3em;text-transform:uppercase;color:var(--ink3);margin-top:16px}\
.h2{font-family:var(--fd);font-weight:400;font-size:26px;line-height:1.18;margin-top:12px;color:var(--ink)}\
.h2 .inb{height:.8em}\
.body{font-size:9.6px;line-height:1.72;color:var(--ink2);font-weight:300;margin-top:14px}\
.cols2{display:grid;grid-template-columns:1fr 1fr;gap:6%}\
.statg{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line);margin-top:16px}\
.statg .c{padding:10px 14px;border-bottom:1px solid var(--line)}\
.statg .c:nth-child(odd){border-right:1px solid var(--line)}\
.statg .c:nth-last-child(-n+2){border-bottom:none}\
.statg .l{font-size:7px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink3)}\
.statg .v{font-family:var(--fd);font-size:18px;color:var(--gold);margin-top:4px}\
.statg .s{font-size:7.5px;color:var(--ink3);margin-top:2px;letter-spacing:.03em}\
.img{background:#111 center/cover no-repeat;border:1px solid var(--line)}\
.cap{font-size:8px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink3);margin-top:8px}\
.pt{margin-top:12px;display:flex;gap:12px}\
.pt .n{font-family:var(--fd);font-size:13px;color:var(--gold);flex:none;width:20px}\
.pt .tt{font-size:10px;font-weight:600;color:var(--ink)}\
.pt .dd{font-size:9px;line-height:1.55;color:var(--ink2);font-weight:300;margin-top:3px}\
.why{border:1px solid rgba(214,179,106,.4);background:rgba(214,179,106,.05);padding:16px 18px;margin-top:18px}\
.why li{font-size:9px;line-height:1.65;color:var(--ink2);margin-left:14px;margin-bottom:6px}\
.why li::marker{color:var(--gold)}\
.blk{font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin-top:22px}\
.disc{font-size:7.5px;line-height:1.7;color:var(--ink3);margin-top:14px;font-weight:300}\
@media print{.pvbar{display:none}body{background:#0A0A0B}.stage{padding:0;gap:0;display:block}.page{width:210mm;height:297mm;aspect-ratio:auto;box-shadow:none;page-break-after:always;margin:0}@page{size:A4 portrait;margin:0}}";}

function imDoc(p){
  var imgs=p.imgs||[], caps=p.imgcaps||[], plans=p.plans||[];
  var cover=(typeof p.cardidx==='number'&&imgs[p.cardidx])?p.cardidx:0;
  var rest=[]; for(var i=0;i<imgs.length;i++){if(i!==cover)rest.push(i);}
  var g1=rest[0], g2=rest[1], g3=rest[2];
  var footL=p.n+' · Investment Memorandum';
  function foot(n){return '<div class="pfoot"><span>'+footL+'</span><img class="wing" src="/winged-device-white.png" alt=""><span>0'+n+'</span></div>';}
  var brandBlock=(p.devimg?'<div><img class="dev" src="'+p.devimg+'" alt=""></div>':'')
    +(p.brandimg?'<img class="brand" src="'+p.brandimg+'" alt="'+p.n+'">'
      :(!p.devimg?'<div class="nameserif">'+p.n+'</div>':''))
    +(p.partners?'<div class="partners">'+p.partners.map(function(x){return '<img src="'+x+'" alt="">';}).join('')+'</div>':'');
  var stats8=(p.stats||[]).map(function(st){return '<div class="c"><div class="l">'+st[0]+'</div><div class="v">'+st[1]+'</div><div class="s">'+(st[2]||'')+'</div></div>';}).join('');
  var pts=(p.points||[]).slice(0,5).map(function(pt,i){return '<div class="pt"><div class="n">0'+(i+1)+'</div><div><div class="tt">'+pt[0]+'</div><div class="dd">'+pt[1]+'</div></div></div>';}).join('');
  var whys=(p.why||[]).map(function(w){return '<li>'+w+'</li>';}).join('');
  var caseImg = plans.length?('<div class="img" style="background-image:url('+plans[0].src+');aspect-ratio:16/10;margin-top:18px;background-color:#fff"></div><div class="cap">'+(plans[0].cap||'Plan')+(p.arch?' · '+p.arch:'')+'</div>')
    :(rest[3]!=null?('<div class="img" style="background-image:url('+imgs[rest[3]]+');aspect-ratio:16/10;margin-top:18px"></div><div class="cap">'+(caps[rest[3]]||'')+'</div>'):'');
  function bg(u){return 'background-image:url('+u+')';}
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  +'<title>HORI7ON IM · '+p.n+'</title>'
  +'<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">'
  +'<style>'+imCSS()+'</style></head><body>'
  +'<div class="pvbar"><span class="t">HORI7ON · Investment Memorandum — <b>'+p.n+'</b></span><span class="sp"></span>'
  +'<button onclick="window.print()">⤓ Save as PDF</button></div>'
  +'<div class="stage">'
  +'<div class="page cov"><div class="bgimg" style="'+(imgs[cover]?bg(imgs[cover]):'')+'"></div><div class="scrim"></div>'
  +'<div class="top"><img class="hor" src="/hori7on-gold.png" alt="HORI7ON"><span class="conf">Confidential</span></div>'
  +'<div class="mid">'+brandBlock+'<div class="imtag">Investment Memorandum</div><div class="rule"></div></div>'
  +'<div class="bot"><div class="pn">'+p.n+'</div><div class="pl">'+p.addr+' · '+p.city+'</div>'
  +'<div class="devline">7EVEN Developments &nbsp;·&nbsp; The HORI7ON Portfolio &nbsp;·&nbsp; 2026</div></div></div>'
  +'<div class="page"><div class="pad"><div class="eyebrow">01 · The Opportunity</div>'
  +'<div class="h2">'+(p.tag||'')+'</div>'
  +'<div class="cols2" style="margin-top:6px"><div class="body">'+(p.overview||'')+'</div>'
  +'<div><div class="statg">'+stats8+'</div>'
  +(p.arch?'<div class="cap" style="margin-top:12px">Architecture — '+p.arch+'</div>':'')
  +'</div></div></div>'+foot(2)+'</div>'
  +'<div class="page"><div class="pad"><div class="eyebrow">02 · The Project</div>'
  +(g1!=null?'<div class="img" style="'+bg(imgs[g1])+';aspect-ratio:21/10;margin-top:16px"></div><div class="cap">'+(caps[g1]||'')+'</div>':'')
  +'<div class="cols2" style="margin-top:18px">'
  +(g2!=null?'<div><div class="img" style="'+bg(imgs[g2])+';aspect-ratio:16/10"></div><div class="cap">'+(caps[g2]||'')+'</div></div>':'<div></div>')
  +(g3!=null?'<div><div class="img" style="'+bg(imgs[g3])+';aspect-ratio:16/10"></div><div class="cap">'+(caps[g3]||'')+'</div></div>':'<div></div>')
  +'</div>'
  +'<div class="body" style="margin-top:16px">'+(p.status||'')+(p.complete?' · Target completion '+p.complete:'')+' · '+p.addr+', '+p.city+'.</div>'
  +'</div>'+foot(3)+'</div>'
  +'<div class="page"><div class="pad"><div class="eyebrow">03 · The Case for Investment</div>'
  +'<div class="cols2" style="margin-top:6px"><div><div class="blk" style="margin-top:14px">Key selling points</div>'+pts+'</div>'
  +'<div><div class="blk" style="margin-top:14px">Why invest</div><div class="why"><ul>'+whys+'</ul></div>'+caseImg+'</div></div>'
  +'</div>'+foot(4)+'</div>'
  +'<div class="page"><div class="pad" style="display:flex;flex-direction:column">'
  +'<div style="text-align:center;margin-top:16%"><img src="/winged-device-white.png" style="height:40px;width:auto;opacity:.95" alt="7EVEN Capital">'
  +'<div style="margin-top:22px"><img src="/seven-mark-white-hd.png" style="height:26px;width:auto" alt="7EVEN"></div>'
  +'<div class="eyebrow" style="margin-top:20px;letter-spacing:.5em">The HORI7ON Portfolio</div>'
  +'<div style="width:70px;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);margin:22px auto 0"></div>'
  +'<div class="body" style="max-width:60%;margin:22px auto 0;text-align:center">Developments shaping Australia’s next chapter — presented for our banking, institutional and government partners.</div>'
  +'<div style="margin-top:30px;font-size:10px;letter-spacing:.2em;color:var(--ink2);text-transform:uppercase">7EVEN.AU &nbsp;·&nbsp; ENQUIRIES@7EVEN.AU</div></div>'
  +'<div style="margin-top:auto"><div class="blk">Confidentiality &amp; Disclaimer</div>'
  +'<div class="disc">This Investment Memorandum is confidential and is provided for the exclusive use of the intended recipient. It may not be reproduced or distributed without the written consent of 7EVEN Developments. Figures are indicative, subject to due diligence, planning and statutory approvals, and do not constitute an offer or financial advice. Schemes illustrated are possible development solutions prepared for preliminary feasibility purposes only and are subject to council approval. Recipients must rely on their own enquiries.</div></div>'
  +'</div><div class="pfoot"><span>7EVEN Developments · HORI7ON</span><img class="wing" src="/winged-device-white.png" alt=""><span>05</span></div></div>'
  +'</div></body></html>';
}
function exportIM(id){
  var p=proj(id); if(!p) return;
  var w=window.open('','_blank'); if(!w){alert('Allow pop-ups to export the IM');return;}
  w.document.write(imDoc(p)); w.document.close();
}

