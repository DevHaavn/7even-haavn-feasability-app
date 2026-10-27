/* HAAVN, Better Living Hotel Project: the modular build, as a live 3D scene.
   Screw piles with baseplates and upward locating pins, glass portal first, ten paired bays craned straight down onto the baseplates by a mobile crane,
   top-corner locks, roof flashings and cappings, finishes. Plant and equipment are installed on site too but are left out to keep it simple.
   Concept animation only: piles, pins, locks, slings, cappings and connections are schematic. Plan coordinates: x across the building (west -12 to east +10),
   y along it (0 to 44), z up; three.js axes: X = x, Z = y, Y up. Deterministic: AsmScene.render(t) draws any second of the sequence. */
(function(){
'use strict';
var T=THREE, DUR=54;
var L_MAX=40, PIVOT_Y=3.4, SLING=3.4, TOPREL=3.94, LANE_X=-16.3, CRANE_X=-23.5;
var C={lime:0xA8BC10,char:0x292929,bronze:0x9c6a3b,gold:0xc39f55};

/* ---------- helpers ---------- */
function ease(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
function ease2(x){x=Math.max(0,Math.min(1,x));return x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2}
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function lerp(a,b,u){return a+(b-a)*u}
function cnv(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
function rnd(a,b){return a+Math.random()*(b-a)}
function seeded(seed){var s=seed;return function(){s=(s*16807)%2147483647;return (s-1)/2147483646}}
function tex(c,rx,ry){var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rx||1,ry||1);t.anisotropy=8;return t}
function mesh(g,m,cast,recv){var o=new T.Mesh(g,m);o.castShadow=cast!==false;o.receiveShadow=recv!==false;return o}
function box(w,h,d,m,x,y,z,par){var o=mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x||0,y||0,z||0);if(par)par.add(o);return o}
function cyl(r,h,m,x,y,z,par,seg,rx,rz){var o=mesh(new T.CylinderGeometry(r,r,h,seg||20),m);o.position.set(x||0,y||0,z||0);if(rx)o.rotation.x=rx;if(rz)o.rotation.z=rz;if(par)par.add(o);return o}
function mat(col,r,m,extra){var o=new T.MeshStandardMaterial({color:col,roughness:r==null?.8:r,metalness:m||0});if(extra)for(var k in extra){if(k==='emissive')o.emissive.setHex(extra[k]);else o[k]=extra[k]}return o}

/* ---------- procedural textures ---------- */
function timberCanvas(){var c=cnv(256,256),g=c.getContext('2d'),R=seeded(7);g.fillStyle='#3a3028';g.fillRect(0,0,256,256);
  for(var x=0;x<256;x+=16){g.fillStyle='rgba(255,236,214,.07)';g.fillRect(x,0,2,256);g.fillStyle='rgba(0,0,0,.32)';g.fillRect(x+14,0,2,256)}
  for(var i=0;i<1600;i++){g.fillStyle='rgba(255,232,205,'+(R()*.06)+')';g.fillRect(R()*256,R()*256,1,R()*34+4)}return c}
function concreteCanvas(){var c=cnv(256,256),g=c.getContext('2d'),R=seeded(11);g.fillStyle='#a49c8f';g.fillRect(0,0,256,256);
  for(var i=0;i<2600;i++){var v=R()>.5?255:0;g.fillStyle='rgba('+v+','+v+','+v+','+(R()*.07)+')';g.fillRect(R()*256,R()*256,R()*5+1,R()*5+1)}
  g.fillStyle='rgba(60,55,48,.22)';for(var y=0;y<256;y+=64)g.fillRect(0,y,256,2);
  g.fillStyle='rgba(50,46,40,.25)';for(var y2=32;y2<256;y2+=64)for(var x2=48;x2<256;x2+=96){g.beginPath();g.arc(x2,y2,3,0,7);g.fill()}return c}
function groundCanvas(){var c=cnv(512,512),g=c.getContext('2d'),R=seeded(3);g.fillStyle='#7d7360';g.fillRect(0,0,512,512);
  var cols=['#6f6553','#8b806c','#625a4b','#968b75','#776d5b'];for(var i=0;i<9000;i++){g.fillStyle=cols[(R()*5)|0];g.globalAlpha=.25+R()*.35;g.fillRect(R()*512,R()*512,R()*4+1,R()*3+1)}
  g.globalAlpha=1;return c}
function padCanvas(){var c=cnv(512,512),g=c.getContext('2d'),R=seeded(5);g.fillStyle='#968d7d';g.fillRect(0,0,512,512);
  var cols=['#a49a86','#847a69','#ada38e','#7e7463'];for(var i=0;i<11000;i++){g.fillStyle=cols[(R()*4)|0];g.globalAlpha=.3+R()*.4;g.fillRect(R()*512,R()*512,R()*3+1,R()*3+1)}g.globalAlpha=1;return c}
function asphaltCanvas(){var c=cnv(512,256),g=c.getContext('2d'),R=seeded(9);g.fillStyle='#3d3f40';g.fillRect(0,0,512,256);
  for(var i=0;i<7000;i++){var v=R()>.5?200:0;g.fillStyle='rgba('+v+','+v+','+v+','+(R()*.09)+')';g.fillRect(R()*512,R()*256,R()*3+1,R()*3+1)}return c}

function facadeExtCanvas(){ // glazed end wall: black timber frame, big glass, warm interior, linen curtains, bronze mullion
  var w=400,h=320,c=cnv(w,h),g=c.getContext('2d'),R=seeded(21);g.drawImage(timberCanvas(),0,0,w,h);
  var x0=34,y0=26,x1=w-34,y1=h-18;var gr=g.createLinearGradient(0,y0,0,y1);gr.addColorStop(0,'#a6c4cd');gr.addColorStop(.5,'#6f939f');gr.addColorStop(1,'#4a6670');g.fillStyle=gr;g.fillRect(x0,y0,x1-x0,y1-y0);
  var rg=g.createRadialGradient(w/2,y1-30,10,w/2,y1-30,170);rg.addColorStop(0,'rgba(255,204,130,.62)');rg.addColorStop(1,'rgba(255,190,110,0)');g.fillStyle=rg;g.fillRect(x0,y0,x1-x0,y1-y0);
  g.fillStyle='rgba(226,214,190,.82)';g.fillRect(x0,y0,58,y1-y0);g.fillRect(x1-58,y0,58,y1-y0);
  for(var i=0;i<14;i++){g.fillStyle='rgba(120,104,80,'+(.14+R()*.1)+')';g.fillRect(x0+i*4+1,y0,2,y1-y0);g.fillRect(x1-58+i*4+1,y0,2,y1-y0)}
  g.fillStyle='rgba(255,255,255,.07)';g.beginPath();g.moveTo(x0+70,y0);g.lineTo(x0+150,y0);g.lineTo(x0+40,y1);g.lineTo(x0-10,y1);g.fill();
  g.fillStyle='#8a5d33';g.fillRect(w/2-2,y0,4,y1-y0);g.strokeStyle='#8a5d33';g.lineWidth=3;g.strokeRect(x0,y0,x1-x0,y1-y0);
  return c}
function facadeEntryCanvas(){ // hallway end: timber, burgundy door, sidelight
  var w=400,h=320,c=cnv(w,h),g=c.getContext('2d');g.drawImage(timberCanvas(),0,0,w,h);
  g.fillStyle='#7a2c30';g.fillRect(54,60,104,250);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(54,60,104,6);
  g.fillStyle='#b58a52';g.fillRect(140,190,5,34);g.fillStyle='#e6d6a8';g.fillRect(96,38,20,12);
  var gr=g.createLinearGradient(0,70,0,300);gr.addColorStop(0,'#9ab9c2');gr.addColorStop(1,'#46606a');g.fillStyle=gr;g.fillRect(210,70,120,200);
  var rg=g.createRadialGradient(270,250,6,270,250,100);rg.addColorStop(0,'rgba(255,204,130,.55)');rg.addColorStop(1,'rgba(255,190,110,0)');g.fillStyle=rg;g.fillRect(210,70,120,200);
  g.strokeStyle='#8a5d33';g.lineWidth=3;g.strokeRect(210,70,120,200);return c}

/* ---------- the scene ---------- */
function create(canvas,opts){
  opts=opts||{};
  var W=canvas.clientWidth||1280,H=canvas.clientHeight||540;
  var renderer=new T.WebGLRenderer({canvas:canvas,antialias:true,preserveDrawingBuffer:!!opts.preserve,alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,opts.maxDpr||2));renderer.setSize(W,H,false);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputEncoding=T.LinearEncoding;renderer.toneMapping=T.NoToneMapping;
  var scene=new T.Scene();var HOR=new T.Color(0xdfe4e0);scene.background=HOR.clone();scene.fog=new T.Fog(HOR.getHex(),170,520);
  (function(){var R=700,sg=new T.SphereGeometry(R,28,18),pp=sg.attributes.position,cols=[],top=new T.Color(0x6f9ac0),mid=new T.Color(0xb4cde0);
    for(var i=0;i<pp.count;i++){var u=clamp(pp.getY(i)/R,0,1),c=HOR.clone().lerp(mid,clamp(u*3.2,0,1)).lerp(top,Math.pow(u,.7));cols.push(c.r,c.g,c.b)}
    sg.setAttribute('color',new T.Float32BufferAttribute(cols,3));var sk=new T.Mesh(sg,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide,fog:false,depthWrite:false}));sk.renderOrder=-1;scene.add(sk)})();
  var camera=new T.PerspectiveCamera(36,W/H,.5,900);

  /* light */
  scene.add(new T.HemisphereLight(0xd9e8f4,0x8a806b,.82));
  var sun=new T.DirectionalLight(0xfff2de,.98);sun.position.set(78,70,-38);sun.castShadow=true;
  sun.shadow.mapSize.set(opts.shadow||2048,opts.shadow||2048);var sc=sun.shadow.camera;sc.left=-62;sc.right=62;sc.top=62;sc.bottom=-62;sc.near=10;sc.far=240;sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;
  sun.target.position.set(-2,0,22);scene.add(sun,sun.target);

  /* ground, site pad, street */
  var gt=tex(groundCanvas(),60,60);var ground=mesh(new T.PlaneGeometry(900,900),mat(0xffffff,1,0,{map:gt}),false,true);ground.rotation.x=-Math.PI/2;scene.add(ground);
  var pt=tex(padCanvas(),9,14);var pad=mesh(new T.PlaneGeometry(52,70),mat(0xffffff,1,0,{map:pt}),false,true);pad.rotation.x=-Math.PI/2;pad.position.set(-9,.02,22);scene.add(pad);
  var at=tex(asphaltCanvas(),2,40);var road=mesh(new T.PlaneGeometry(11,400),mat(0xffffff,.95,0,{map:at}),false,true);road.rotation.x=-Math.PI/2;road.position.set(46,.03,22);scene.add(road);
  for(var di=-20;di<20;di++){var dash=mesh(new T.PlaneGeometry(.18,2.6),mat(0xe8e6dc,.9),false,true);dash.rotation.x=-Math.PI/2;dash.position.set(46,.045,22+di*8);scene.add(dash)}
  var kerb=mesh(new T.BoxGeometry(.3,.18,400),mat(0xb5b1a6,.9),false,true);kerb.position.set(40.4,.09,22);scene.add(kerb);
  var walk=mesh(new T.PlaneGeometry(3,400),mat(0xb7b2a5,.95),false,true);walk.rotation.x=-Math.PI/2;walk.position.set(38.6,.025,22);scene.add(walk);

  /* shared materials */
  var timberT=tex(timberCanvas(),2,1),concT=tex(concreteCanvas(),3,2);
  var mTimber=mat(0xffffff,.82,0,{map:timberT}),mConc=mat(0xffffff,.92,0,{map:concT});
  var mSteel=mat(0x77807c,.55,.4),mDark=mat(0x3f4543,.65,.3),mRoof=mat(0x5d605c,.9),mTimberRoof=mat(0xa4764a,.7),mBronze=mat(C.bronze,.4,.8),mGold=mat(C.gold,.35,.8);
  var mLime=mat(C.lime,.5,.2),mPin=mat(C.lime,.4,.4,{emissive:0x5d6b00,emissiveIntensity:.35});
  var mGlassClear=new T.MeshStandardMaterial({color:0xc4e0e6,roughness:.08,metalness:.2,transparent:true,opacity:.38,side:T.DoubleSide});
  var extTex=tex(facadeExtCanvas()),entTex=tex(facadeEntryCanvas());
  var mExt=mat(0xffffff,.55,0,{map:extTex,emissive:0xffb45a,emissiveMap:extTex,emissiveIntensity:.06}),mEnt=mat(0xffffff,.7,0,{map:entTex});

  /* screw piles: shaft + baseplate + upward locating pin, instanced. The module is lifted onto the baseplate and the pin enters its underside. */
  var BAYY=[];for(var j=0;j<10;j++)BAYY.push(j<5?j*4:24+(j-5)*4);
  var pilePts=[];BAYY.forEach(function(y0){[-11.9,-7,-2.1,.1,5,9.9].forEach(function(x){[.35,3.65].forEach(function(dy){pilePts.push([x,y0+dy])})})});
  [-11.9,-6,-1,4,9.9].forEach(function(x){[20.1,23.9].forEach(function(y){pilePts.push([x,y])})});
  var shaftG=new T.CylinderGeometry(.085,.085,2.35,10),capG=new T.BoxGeometry(.32,.05,.32),recG=new T.CylinderGeometry(.032,.05,.2,12);
  var shafts=new T.InstancedMesh(shaftG,mat(0x6d7471,.6,.5),pilePts.length),caps=new T.InstancedMesh(capG,mat(0x868d89,.55,.55),pilePts.length),recs=new T.InstancedMesh(recG,mPin,pilePts.length);
  shafts.castShadow=caps.castShadow=true;shafts.receiveShadow=caps.receiveShadow=true;var dm=new T.Object3D();
  pilePts.forEach(function(p,i){dm.position.set(p[0],-.575,p[1]);dm.updateMatrix();shafts.setMatrixAt(i,dm.matrix);dm.position.set(p[0],.625,p[1]);dm.updateMatrix();caps.setMatrixAt(i,dm.matrix);dm.position.set(p[0],.75,p[1]);dm.updateMatrix();recs.setMatrixAt(i,dm.matrix)});
  scene.add(shafts,caps,recs);

  /* a module (apartment bay): A carries the 2 m corridor, B has none */
  var sideA=[mExt,mEnt,mRoof,mSteel,mTimber,mTimber],sideB=[mEnt,mExt,mRoof,mSteel,mTimber,mTimber];
  function makeModule(isA){
    var g=new T.Group();
    box(9.96,.32,3.96,mSteel,0,.16,0,g);
    var body=mesh(new T.BoxGeometry(9.96,3.4,3.96),isA?sideA:sideB);body.position.set(0,.32+1.7,0);g.add(body);
    box(10.12,.22,4.1,mRoof,0,3.83,0,g);
    // the pins are on the pile baseplates now (they enter sockets in the chassis underside); top-corner locks are hidden until seated
    g.userData.pins=[];
    g.userData.locks=[];[[-4.95,-1.95],[-4.95,1.95],[4.95,-1.95],[4.95,1.95]].forEach(function(p){var k=box(.5,.16,.14,mGold,p[0],3.99,p[1],g);k.scale.set(.001,.001,.001);g.userData.locks.push(k)});
    if(isA){ // factory-attached 2 m corridor: floor, posts, timber-soffit roof
      box(2,.3,3.96,mSteel,-6,.15,0,g);
      [[-6.95,-1.9],[-6.95,1.9],[-5.05,-1.9],[-5.05,1.9]].forEach(function(p){box(.12,3.3,.12,mBronze,p[0],1.95,p[1],g)});
      box(2.1,.14,4.1,mTimberRoof,-6,3.62,0,g);box(2.1,.1,4.2,mRoof,-6,3.74,0,g);
    }
    g.userData.isA=isA;return g;
  }

  /* glass portal: two halves, each a glazed frame with a glass roof */
  function makePortal(len){
    var g=new T.Group();box(len,.3,4,mSteel,0,.15,0,g);
    for(var i=0;i<=Math.round(len/3.67);i++){var x=-len/2+i*(len/Math.round(len/3.67));[-1.95,1.95].forEach(function(z){box(.16,3.5,.16,mDark,x,2.05,z,g)});box(.16,.16,4,mDark,x,3.78,0,g)}
    box(len,.16,.16,mDark,0,3.78,-1.95,g);box(len,.16,.16,mDark,0,3.78,1.95,g);
    var roof=mesh(new T.BoxGeometry(len-.2,.06,3.9),mGlassClear,false,true);roof.position.set(0,3.8,0);g.add(roof);
    [-1.97,1.97].forEach(function(z){var w=mesh(new T.BoxGeometry(len-.2,3.3,.04),mGlassClear,false,true);w.position.set(0,2.1,z);g.add(w)});
    return g;
  }

  /* the HAAVN crane: charcoal carrier, lime telescopic boom, hook block, slings */
  var crane=new T.Group();scene.add(crane);var cr={};
  (function(){
    var mCh=mat(0x50555a,.55,.3),mLimeBoom=mat(0xc6d813,.45,.2),mWhite=mat(0xf3f2ee,.5,.1),mGl=mat(0x39464b,.2,.5),mTyre=mat(0x262626,.9,0);
    box(2.9,.9,13.4,mCh,0,1.15,-1.2,crane);box(2.5,.25,13.1,mDark,0,.62,-1.2,crane);
    var cab=box(2.7,2.3,2.5,mWhite,0,2.5,5.8,crane);box(2.72,.9,.1,mGl,0,2.9,7.08,crane);box(.12,.9,1.7,mGl,1.36,2.9,5.85,crane);box(.12,.9,1.7,mGl,-1.36,2.9,5.85,crane);
    box(2.8,.22,.12,mLime,0,2.0,7.06,crane);[-1,1].forEach(function(sx){box(.06,.26,13.0,mLime,sx*1.46,1.2,-1.2,crane)});
    [5.2,2.4,-.4,-3.2,-6.0].forEach(function(z,i){[-1.35,1.35].forEach(function(x){var w=cyl(.62,.5,mTyre,x,.62,z,crane,22,0,Math.PI/2);cyl(.3,.52,mSteel,x,.62,z,crane,12,0,Math.PI/2)})});
    // outriggers: beams that run out, jacks and pads
    cr.outr=[];[[-1,2.6],[1,2.6],[-1,-4.4],[1,-4.4]].forEach(function(o){var gg=new T.Group();gg.position.set(o[0]*1.3,.95,o[1]);var beam=box(1,.4,.5,mDark,.5*o[0],0,0,gg);var jack=cyl(.13,1.1,mLime,o[0]*.95,-.4,0,gg,10);var pad=box(.95,.12,.95,mDark,o[0]*.95,-.98,0,gg);gg.userData={b:beam,j:jack,p:pad,s:o[0]};crane.add(gg);cr.outr.push(gg)});
    // turret
    var tur=new T.Group();tur.position.set(0,1.75,-.9);crane.add(tur);cr.tur=tur;
    cyl(1.6,.5,mDark,0,.05,0,tur,28);box(3.2,2.0,5.0,mCh,0,1.2,-.4,tur);box(3.24,.34,5.04,mLime,0,.7,-.4,tur);
    box(2.2,1.9,2.0,mWhite,-1.2,1.1,1.8,tur);box(1.5,.9,.1,mGl,-1.2,1.4,2.82,tur);
    box(3.0,1.5,2.0,mCh,0,1.0,-3.7,tur);box(3.04,.3,2.04,mLime,0,1.55,-3.7,tur);
    // boom: five nested sections
    var boom=new T.Group();boom.position.set(0,PIVOT_Y-1.75,.3);boom.rotation.order='YXZ';tur.add(boom);cr.boom=boom;cr.sec=[];
    var wd=[1.1,.96,.84,.72,.6];for(var s=0;s<5;s++){var sec=mesh(new T.BoxGeometry(wd[s],wd[s]*.95,1),s===0?mCh:mLimeBoom);boom.add(sec);cr.sec.push(sec)}
    cr.tip=new T.Group();boom.add(cr.tip);box(.5,.9,.7,mDark,0,-.25,0,cr.tip);cyl(.28,.5,mSteel,0,-.25,.1,cr.tip,14,0,Math.PI/2);
    // HAAVN sign on the boom
    var wmImg=new Image();wmImg.onload=function(){var c=cnv(1024,128),g=c.getContext('2d');g.fillStyle='#232522';g.fillRect(0,0,1024,128);g.drawImage(wmImg,40,22,944,Math.round(944*wmImg.height/wmImg.width));var t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;
      [1,-1].forEach(function(s){var pl=new T.Mesh(new T.PlaneGeometry(1,.16),new T.MeshBasicMaterial({map:t}));pl.userData.sgn=s;cr.signs=cr.signs||[];cr.signs.push(pl);boom.add(pl)})};var wmSrc=opts.wordmark||((opts.base||'')+'assets/haavn-wordmark-white.png');if(!(location.protocol==='file:'&&wmSrc.indexOf('data:')!==0))wmImg.src=wmSrc;
    // hoist: cable, hook block, slings
    var hk=new T.Group();scene.add(hk);cr.hook=hk;box(.8,1.1,.6,mCh,0,0,0,hk);box(.82,.2,.62,mLime,0,.35,0,hk);cyl(.09,.9,mSteel,0,-.9,0,hk,8);
    var lg=new T.BufferGeometry();lg.setAttribute('position',new T.BufferAttribute(new Float32Array(6*6),3));cr.cable=new T.LineSegments(lg,new T.LineBasicMaterial({color:0x1d1d1d}));cr.cable.frustumCulled=false;scene.add(cr.cable);
    cr.slingN=4;
  })();

  /* delivery truck: tractor + flat deck */
  function makeTruck(){
    var g=new T.Group(),mCab=mat(0xf0efea,.5,.1),mT=mat(0x262626,.9,0);
    box(2.6,.32,14.6,mSteel,0,1.25,-1.3,g);box(2.6,.5,.4,mDark,0,.95,-7.9,g);
    box(2.55,2.5,2.4,mCab,0,2.1,6.6,g);box(2.57,.8,.1,mat(0x39464b,.2,.5),0,2.55,7.82,g);box(2.6,.25,2.3,mLime,0,1.35,6.6,g);box(2.3,.5,3.4,mDark,0,1.0,5.5,g);
    [6.4,-6.0,-7.2].forEach(function(z){[-1.15,1.15].forEach(function(x){cyl(.55,.4,mT,x,.55,z,g,20,0,Math.PI/2)})});[5.0,3.8].forEach(function(z){[-1.15,1.15].forEach(function(x){cyl(.55,.4,mT,x,.55,z,g,20,0,Math.PI/2)})});
    return g}

  /* modules and trucks */
  var mods=[],trucks=[];var pairOrder=[4,5,3,2,1,0,6,7,8,9];var stops=[[22,4],[12,2],[4,2],[32,2],[40,2]];
  // portal halves
  var portalHalf=[makePortal(11),makePortal(11)];portalHalf.forEach(function(p){scene.add(p)});
  var sched=[],cranes=[],t=4.2;
  function pushOp(o){sched.push(o)}
  var stopIdx=0,pairsInStop=0,curStop=stops[0][0];
  // portal ops at stop y=22
  [[-6.5,2.4],[4.5,2.4]].forEach(function(p,i){pushOp({kind:'portal',i:i,t0:4.2+i*2.5,d:2.5,stop:22,tgt:{x:p[0],y:.65,z:22},obj:portalHalf[i],topRel:4.0})});
  t=4.2+5.0+.4;
  var k=0;pairOrder.forEach(function(j,pi){
    var stopY=stops[Math.floor(Math.max(0,pairOrder.indexOf(j))/2)]?stops[Math.floor(pi/2)][0]:22,y0=BAYY[j];
    if(pi===0)stopY=22;if(pi===1)stopY=22;
    stopY=[22,22,12,12,4,4,32,32,40,40][pi];
    if(sched.length&&sched[sched.length-1].stop!==stopY){t+=[0,0,1.1,0,1.1,0,1.8,0,1.1,0][pi]||1.1}
    [true,false].forEach(function(isA){var d=pi===0?2.6:.95;var m=makeModule(isA);scene.add(m);m.visible=false;
      pushOp({kind:'mod',m:m,isA:isA,pair:j,t0:t,d:d,stop:stopY,tgt:{x:isA?5:-7,y:.65,z:y0+2},topRel:TOPREL});t+=d});
  });
  var tEnd=t; // last landing
  // pick points and hook keyframes
  var hkKeys=[],cranePath=[];
  var stowHook=function(zc){return {x:CRANE_X,y:9,z:zc+9}};
  var prev=stowHook(22),prevStop=22,prevEnd=0;
  cranePath.push({t:0,z:22,out:1});
  sched.forEach(function(s,idx){
    var d=s.d,t0=s.t0,pickZ=s.stop+(s.kind==='portal'?(s.i?1.5:-1.5):(s.isA?-1.2:1.2));s.pick={x:LANE_X,z:pickZ};
    var topPick=1.25+s.topRel; s.hookPickY=topPick+SLING;
    var tgtTop=s.tgt.y+s.topRel; s.hookSeatY=tgtTop+SLING; var trav=11;
    if(s.stop!==prevStop){ // relocate: stow, drive, set up
      var r0=prevEnd+.12,r1=s.t0-.15;cranePath.push({t:r0-.3,z:prevStop,out:1});cranePath.push({t:r0,z:prevStop,out:0});cranePath.push({t:r1-.2,z:s.stop,out:0});cranePath.push({t:r1,z:s.stop,out:1});
      var st0=stowHook(prevStop),st1=stowHook(s.stop);hkKeys.push({t:r0-.3,x:prev.x,y:Math.max(prev.y,trav),z:prev.z});hkKeys.push({t:r0,x:st0.x,y:st0.y,z:st0.z});hkKeys.push({t:r1-.2,x:st1.x,y:st1.y,z:st1.z});prev=st1;
    }
    var a={t:t0,x:prev.x,y:prev.y,z:prev.z};
    hkKeys.push(a);
    hkKeys.push({t:t0+.12*d,x:prev.x,y:Math.max(trav,prev.y),z:prev.z});
    hkKeys.push({t:t0+.38*d,x:LANE_X,y:s.hookPickY+1.6,z:pickZ});
    hkKeys.push({t:t0+.47*d,x:LANE_X,y:s.hookPickY,z:pickZ});
    hkKeys.push({t:t0+.60*d,x:LANE_X,y:trav,z:pickZ});
    hkKeys.push({t:t0+.84*d,x:s.tgt.x,y:trav,z:s.tgt.z});
    hkKeys.push({t:t0+d,x:s.tgt.x,y:s.hookSeatY,z:s.tgt.z});
    prev={x:s.tgt.x,y:s.hookSeatY,z:s.tgt.z};prevStop=s.stop;prevEnd=t0+d;
  });
  // drive away at the end
  cranePath.push({t:tEnd+.3,z:prevStop,out:1});cranePath.push({t:tEnd+.6,z:prevStop,out:0});cranePath.push({t:tEnd+3.4,z:120,out:0});
  hkKeys.push({t:tEnd+.5,x:prev.x,y:13,z:prev.z});hkKeys.push({t:tEnd+.6,x:CRANE_X,y:8,z:prevStop+9});hkKeys.push({t:tEnd+3.4,x:CRANE_X,y:8,z:129});
  hkKeys.sort(function(a,b){return a.t-b.t});
  function sampleKeys(keys,t,f){if(t<=keys[0].t)return f(keys[0],keys[0],0);for(var i=1;i<keys.length;i++){if(t<=keys[i].t){var u=(t-keys[i-1].t)/Math.max(1e-6,keys[i].t-keys[i-1].t);return f(keys[i-1],keys[i],ease(u))}}var l=keys[keys.length-1];return f(l,l,0)}
  function hookAt(t){return sampleKeys(hkKeys,t,function(a,b,u){return {x:lerp(a.x,b.x,u),y:lerp(a.y,b.y,u),z:lerp(a.z,b.z,u)}})}
  function craneAt(t){return sampleKeys(cranePath,t,function(a,b,u){return {z:lerp(a.z,b.z,u),out:lerp(a.out,b.out,u)}})}

  /* trucks, one per op, drive in and out */
  sched.forEach(function(s){var tr=makeTruck();tr.visible=false;scene.add(tr);s.truck=tr;var ta=Math.min(1.0,s.d*.9);s.arr0=s.t0-ta;s.arr1=s.t0;s.dep0=s.t0+.5*s.d;s.dep1=s.dep0+Math.min(1.0,s.d*.9)+.4;
    if(s.kind==='portal'){s.ride=new T.Group();s.ride.visible=false}});
  /* the finishing touches: terraces, fascia, trees, planters */
  var fin=new T.Group();scene.add(fin);var finItems=[];
  var mDeck=mat(0x9b6c3f,.75);
  BAYY.forEach(function(y0){[-1,1].forEach(function(sd){var x=sd<0?-12.75:10.75;var dk=box(1.5,.12,3.9,mDeck,x,.62,y0+2,fin);finItems.push({o:dk,s:[1,1,1],t:0,from:sd<0?'w':'e'})})});
  var bounds=[];BAYY.forEach(function(y0){bounds.push(y0)});bounds.push(20,24,44);
  [-12.18,10.18].forEach(function(x){bounds.forEach(function(y){var pr=box(.46,4.0,.62,mConc,x,2.25,y,fin);finItems.push({o:pr,s:[1,1,1],t:1})});var fa=box(.5,.46,44.6,mConc,x,4.28,22,fin);finItems.push({o:fa,s:[1,1,1],t:2})});
  var R=seeded(42),mLeaf=mat(0x66794a,.95,0,{flatShading:true}),mLeaf2=mat(0x56693f,.95,0,{flatShading:true}),mLeaf3=mat(0x748656,.95,0,{flatShading:true}),mTrunk=mat(0x8a7f6c,.95);
  function tree(x,z,sc){var g=new T.Group();var lean=(R()-.5)*.18;var trunk=cyl(.26*sc,6.4*sc,mTrunk,0,3.1*sc,0,g,7);trunk.rotation.z=lean;
    var n=9;for(var i=0;i<n;i++){var s=(1.3+R()*1.5)*sc,m=i%3===0?mLeaf3:(i%2?mLeaf:mLeaf2);var bl=mesh(new T.IcosahedronGeometry(s,0),m);var a=R()*6.28,rd=R()*2.6*sc;bl.position.set(Math.cos(a)*rd+lean*8,(5.2+R()*4.4)*sc,Math.sin(a)*rd);bl.scale.set(1,.72,1);bl.rotation.set(R()*3,R()*3,R()*3);g.add(bl)}
    g.position.set(x,0,z);return g}
  var trees=[];[[-31,60,1.2],[-8,74,1.25],[8,90,1.2],[-58,70,1.3],[-64,-4,1.25],[-40,92,1.2],[22,96,1.3],[60,-48,1.3]].forEach(function(p){var tr=tree(p[0],p[1],p[2]);scene.add(tr);trees.push(tr)});
  // a distant tree line gives the horizon some depth
  var ringG=new T.IcosahedronGeometry(14,0),ringM=mat(0x6e8059,1,0,{flatShading:true});var ring=new T.InstancedMesh(ringG,ringM,70),rm=new T.Object3D();
  for(var ri=0;ri<70;ri++){var an=ri/70*6.2832+R()*.08,rr2=300+R()*60;rm.position.set(Math.cos(an)*rr2,6+R()*8,22+Math.sin(an)*rr2);rm.scale.set(1+R()*1.1,.7+R()*.5,1+R()*1.1);rm.rotation.y=R()*3;rm.updateMatrix();ring.setMatrixAt(ri,rm.matrix)}scene.add(ring);
  var shrubs=[];BAYY.forEach(function(y0,j){[-1,1].forEach(function(sd){for(var q=0;q<2;q++){var b=mesh(new T.IcosahedronGeometry(.55+R()*.4,1),R()>.5?mLeaf:mLeaf2);b.scale.y=.6;b.position.set((sd<0?-14.6:12.6)+(R()-.5)*.8,.3,y0+.9+q*2.2);fin.add(b);shrubs.push(b)}})});
  fin.visible=false;
  /* roof flashings and cappings: a capping over every roof joint between modules (and the portal), step flashings along both sides of the 2 m corridor roof */
  var caps2=new T.Group();scene.add(caps2);var capItems=[];var mCap=mat(0xdadcd8,.45,.12),mFlash=mat(0xb9bdb9,.5,.12);
  function capStrip(w,h,d,m,x,y,z,t0,dur,axis){var o=box(w,h,d,m,x,y,z,caps2);o.castShadow=false;o.scale.set(.001,1,.001);capItems.push({o:o,t0:t0,dur:dur,axis:axis});return o}
  var capT0=tEnd+1.2,joints=[4,8,12,16,20,24,28,32,36,40];
  joints.forEach(function(y,i){var a0=capT0+i*.24;capStrip(10.04,.05,.36,mCap,-7,4.625,y,a0,.9,'x');capStrip(2.1,.05,.36,mCap,-1,4.465,y,a0+.06,.5,'x');capStrip(10.04,.05,.36,mCap,5,4.625,y,a0+.12,.9,'x')});
  [[-1.8,0,20],[-1.8,24,44],[-.2,0,20],[-.2,24,44]].forEach(function(f,i){var L=f[2]-f[1];capStrip(.24,.05,L,mFlash,f[0],4.465,f[1]+L/2,capT0+.3+i*.15,2.4,'z')});
  caps2.visible=false;
  /* the glass portal gets its own entry canopy line: nothing extra, stays honest */

  /* ---------- camera keys ---------- */
  var camKeys=[
    {t:0,p:[-62,30,-44],g:[-4,3,18],f:36},{t:5,p:[-50,23,-24],g:[-6,3,22],f:34},{t:9.5,p:[-44,20,-8],g:[-5,3,18],f:34},
    {t:16,p:[-40,19,-18],g:[-4,3,14],f:34},{t:26,p:[-36,26,-46],g:[-3,3,26],f:36},{t:34,p:[-14,29,-58],g:[-1,3,28],f:36},
    {t:39.5,p:[36,24,-50],g:[0,3,24],f:34},{t:43,p:[62,9,-12],g:[0,3,23],f:32},{t:46.5,p:[54,3.3,22],g:[0,2.6,22],f:30},{t:54,p:[54,3.3,22],g:[0,2.6,22],f:30}];
  function camAt(t){var n=camKeys.length,i=0;while(i<n-2&&t>camKeys[i+1].t)i++;var a=camKeys[i],b=camKeys[i+1],u=clamp((t-a.t)/(b.t-a.t),0,1);
    var p0=camKeys[Math.max(0,i-1)],p3=camKeys[Math.min(n-1,i+2)];function cr(k,get){var v0=get(p0),v1=get(a),v2=get(b),v3=get(p3);var m1=(v2-v0)*.5*(b.t-a.t)/Math.max(1e-6,(b.t-p0.t)||1)*1,m2=(v3-v1)*.5*(b.t-a.t)/Math.max(1e-6,(p3.t-a.t)||1)*1;var u2=u*u,u3=u2*u;return (2*u3-3*u2+1)*v1+(u3-2*u2+u)*m1+(-2*u3+3*u2)*v2+(u3-u2)*m2}
    return {p:[0,1,2].map(function(k){return cr(k,function(o){return o.p[k]})}),g:[0,1,2].map(function(k){return cr(k,function(o){return o.g[k]})}),f:cr(0,function(o){return o.f})}}

  /* ---------- the frame ---------- */
  var slingPts=[[-4.9,-1.9],[4.9,-1.9],[-4.9,1.9],[4.9,1.9]];
  var tmpV=new T.Vector3();
  function placeOp(s,t,hook){
    var m=s.kind==='portal'?s.obj:s.m,topRel=s.topRel;
    var u=(t-s.t0)/s.d;
    // module position: on the truck, in the hook, or seated
    var attachT=s.t0+.47*s.d;
    if(t<s.arr0){m.visible=false;s.truck.visible=false;return {load:false}}
    var yawFinal=0,yawTruck=Math.PI/2;
    if(t<attachT){ // waiting on the truck
      var ta=s.arr1-s.arr0,ua=ease((t-s.arr0)/ta);var z0=s.pick.z-46,z1=s.pick.z;var zt=lerp(z0,z1,ua);
      s.truck.visible=true;s.truck.position.set(LANE_X,0,zt-0);m.visible=true;
      m.position.set(LANE_X,1.25,zt+0.0+(s.kind==='portal'?0:0));m.rotation.y=s.kind==='portal'?Math.PI/2:yawTruck;
      return {load:false};
    }
    // truck leaves
    if(t<s.dep1){var ud=ease((t-s.dep0)/(s.dep1-s.dep0));s.truck.visible=t>=s.dep0?(ud<1):true;s.truck.position.set(LANE_X,0,s.pick.z+ud*60)}else s.truck.visible=false;
    if(t<s.t0+s.d){ // in the hook
      m.visible=true;var swing=ease2((u-.56)/.30);
      m.position.set(hook.x,hook.y-SLING-topRel,hook.z);m.rotation.y=lerp(s.kind==='portal'?Math.PI/2:yawTruck,yawFinal,swing);
      return {load:true,s:s,top:topRel};
    }
    m.visible=true;m.position.set(s.tgt.x,s.tgt.y,s.tgt.z);m.rotation.y=0;return {load:false};
  }
  function render(t){
    t=clamp(t,0,DUR);
    var hook=hookAt(t),cz=craneAt(t);
    // crane carrier
    crane.position.set(CRANE_X,0,cz.z);var rest=Math.abs(cz.z-hook.z)>1;
    cr.outr.forEach(function(g){var e=cz.out;g.userData.b.scale.x=.2+e*2.6;g.userData.b.position.x=g.userData.s*(.1+e*1.3);g.userData.j.position.x=g.userData.s*(.25+e*2.6);g.userData.p.position.x=g.userData.s*(.25+e*2.6)});
    crane.visible=cz.z<110;cr.hook.visible=crane.visible;cr.cable.visible=crane.visible;
    // boom aims at the hook
    var dx=hook.x-CRANE_X,dz=hook.z-cz.z,r=Math.sqrt(dx*dx+dz*dz);var yaw=Math.atan2(dx,dz);
    var Lb=clamp(r/.74,14,L_MAX);var rr=Math.min(r,Lb*.985);var pitch=Math.acos(rr/Lb);
    cr.tur.rotation.y=yaw;cr.boom.rotation.x=-pitch;
    var e=[.5,.68,.84,.95,1];for(var s=0;s<5;s++){var st=s===0?0:e[s-1]*Lb-.2*Lb,en=e[s]*Lb;cr.sec[s].scale.z=en-st;cr.sec[s].position.z=st+(en-st)/2}
    cr.tip.position.z=Lb;
    if(cr.signs)cr.signs.forEach(function(p){var s=p.userData.sgn;p.scale.set(Lb*.3,1,1);p.position.set(s*(.58),0,Lb*.3);p.rotation.y=s*Math.PI/2});
    // hook and cable
    crane.updateMatrixWorld(true);var tipW=new T.Vector3(0,0,Lb);cr.boom.localToWorld(tipW);
    cr.hook.position.set(hook.x,hook.y,hook.z);
    // ops: modules, trucks, portal
    var load=null;sched.forEach(function(s){var res=placeOp(s,t,hook);if(res.load)load=res});
    // lock + pin settle on landing
    sched.forEach(function(s){if(s.kind!=='mod')return;var m=s.m;var seated=clamp((t-(s.t0+s.d))/.5,0,1);var land=clamp((t-(s.t0+.9*s.d))/(.1*s.d),0,1);
      m.userData.locks.forEach(function(k){var v=ease(clamp((t-(s.t0+s.d)-.05)/.4,0,1));k.scale.set(v||.001,v||.001,v||.001)});
      m.userData.pins.forEach(function(p){p.visible=true})});
    // cable + slings
    var pos=cr.cable.geometry.attributes.position.array;var h=hook;
    var segs=[[tipW.x,tipW.y-.5,tipW.z,h.x,h.y+.55,h.z]];
    if(load){var s=load.s,m=s.kind==='portal'?s.obj:s.m;var ca=Math.cos(m.rotation.y),sa=Math.sin(m.rotation.y);var tz=load.top;
      var hx=s.kind==='portal'?5.2:4.9;slingPts.forEach(function(p){var px=p[0]*(hx/4.9),pz=p[1];var wx=m.position.x+px*ca+pz*sa,wz=m.position.z-px*sa+pz*ca;segs.push([h.x,h.y-.1,h.z,wx,m.position.y+tz,wz])})}
    else{segs.push([h.x,h.y-.9,h.z,h.x,h.y-.9,h.z])}
    var arr=new Float32Array(Math.max(segs.length,5)*6);segs.forEach(function(sg,i){arr.set(sg,i*6)});for(var q=segs.length;q<5;q++)arr.set(segs[0],q*6);
    cr.cable.geometry.setAttribute('position',new T.BufferAttribute(arr,3));cr.cable.geometry.attributes.position.needsUpdate=true;
    // finishes
    var tf=tEnd+.5,fu=clamp((t-tf)/3.2,0,1);fin.visible=fu>0;
    finItems.forEach(function(f,i){var u=ease(clamp((fu*1.4)-(i%10)*.04,0,1));f.o.scale.set(u||.001,1,u||.001)});
    shrubs.forEach(function(b,i){var u=ease(clamp(fu*1.5-(i%12)*.03,0,1));b.scale.setScalar(Math.max(.001,u))});
    // flashings and cappings
    caps2.visible=t>capT0;capItems.forEach(function(c){var u=ease(clamp((t-c.t0)/c.dur,0,1));if(c.axis==='x')c.o.scale.set(u||.001,1,1);else c.o.scale.set(1,1,u||.001)});
    mExt.emissiveIntensity=.06+.2*ease(clamp((t-tEnd)/6,0,1));
    // camera
    var c=camAt(t);camera.position.set(c.p[0],c.p[1],c.p[2]);camera.lookAt(c.g[0],c.g[1],c.g[2]);if(Math.abs(camera.fov-c.f)>.01){camera.fov=c.f;camera.updateProjectionMatrix()}
    renderer.render(scene,camera);
  }
  function resize(w,h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
  var landings=sched.filter(function(s){return s.kind==='mod'}).map(function(s){return s.t0+s.d});
  var info={duration:DUR,tEnd:tEnd,capT0:capT0,landings:landings,sched:sched.map(function(s){return {kind:s.kind,t0:s.t0,d:s.d,pair:s.pair,isA:s.isA}}),pairOrder:pairOrder};
  resize(W,H);
  return {render:render,resize:resize,renderer:renderer,scene:scene,camera:camera,info:info};
}
window.AsmScene={create:create,DUR:DUR};
})();
