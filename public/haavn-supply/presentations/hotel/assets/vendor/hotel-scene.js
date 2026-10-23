/* HAAVN Hotels: the construction sequence as a live 3D scene.
   Concrete podium (two levels), ONE central concrete core, a HAAVN tower crane that climbs with the work, room pods and 2 m corridor cassettes delivered by truck
   and craned into place: the first box onto two pins in the podium slab, the second onto a single pin with a locking collar, then a time-lapse through 28 guest levels,
   facade and podium envelope, and the completed tower. Concept animation only: connector geometry, crane selection and site logistics are schematic.
   Plan coordinates (metres): x along the building 0 to 42, y across it 0 to 22, z up. three.js axes: X = x, Z = y, Y = z. render(t) draws any second 0 to 82. */
(function(){
'use strict';
var T=THREE, DUR=82;
var PODTOP=8.9, LVL=3.2, NL=28, TOPZ=PODTOP+NL*LVL;          // 98.5 m top of the 28 guest levels
var CORE={x:17.5,w:7,y:0,d:10,top:TOPZ+3};                   // ONE compact central lift core, 7 x 10 m (the north side of bays 5 and 6)
var CRX=-16,CRY=8, JIB=64, CJIB=20, SEC=2.4, MAXSEC=47;      // tower crane base and sizes
var LANE={x:-12,y:-26};                                      // delivery lane
var SLING=4.2;
var BAYS=[0,1,2,3,4,7,8,9,10,11];                            // bays 5 and 6 are the core
var C={lime:0xA8BC10,limeD:0x8a9c08,char:0x2d2f2c,bronze:0x9c6a3b};
function ease(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
function ease2(x){x=Math.max(0,Math.min(1,x));return x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2}
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function lerp(a,b,u){return a+(b-a)*u}
function cnv(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
function seeded(seed){var s=seed;return function(){s=(s*16807)%2147483647;return (s-1)/2147483646}}
function tex(c,rx,ry){var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rx||1,ry||1);t.anisotropy=8;return t}
function mesh(g,m,cast,recv){var o=new T.Mesh(g,m);o.castShadow=cast!==false;o.receiveShadow=recv!==false;return o}
function box(w,h,d,m,x,y,z,par){var o=mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x||0,y||0,z||0);if(par)par.add(o);return o}
function cyl(r,h,m,x,y,z,par,seg){var o=mesh(new T.CylinderGeometry(r,r,h,seg||20),m);o.position.set(x||0,y||0,z||0);if(par)par.add(o);return o}
function mat(col,r,m,extra){var o=new T.MeshStandardMaterial({color:col,roughness:r==null?.8:r,metalness:m||0});if(extra)for(var k in extra){if(k==='emissive')o.emissive.setHex(extra[k]);else o[k]=extra[k]}return o}

/* ---------- procedural textures ---------- */
function concreteCanvas(){var c=cnv(256,256),g=c.getContext('2d'),R=seeded(11);g.fillStyle='#b4b0a6';g.fillRect(0,0,256,256);
  for(var i=0;i<2600;i++){var v=R()>.5?255:0;g.fillStyle='rgba('+v+','+v+','+v+','+(R()*.07)+')';g.fillRect(R()*256,R()*256,R()*5+1,R()*5+1)}
  g.fillStyle='rgba(60,55,48,.2)';for(var y=0;y<256;y+=64)g.fillRect(0,y,256,2);return c}
function groundCanvas(){var c=cnv(512,512),g=c.getContext('2d'),R=seeded(3);g.fillStyle='#8b8168';g.fillRect(0,0,512,512);
  var cols=['#7d7360','#988c74','#6f6653','#a39880','#867b66'];for(var i=0;i<9000;i++){g.fillStyle=cols[(R()*5)|0];g.globalAlpha=.25+R()*.35;g.fillRect(R()*512,R()*512,R()*4+1,R()*3+1)}g.globalAlpha=1;return c}
function grassCanvas(){var c=cnv(512,512),g=c.getContext('2d'),R=seeded(8);g.fillStyle='#8a8f55';g.fillRect(0,0,512,512);
  var cols=['#7c8348','#98995a','#6f7840','#a29d5f'];for(var i=0;i<12000;i++){g.fillStyle=cols[(R()*4)|0];g.globalAlpha=.3+R()*.4;g.fillRect(R()*512,R()*512,R()*3+1,R()*5+1)}g.globalAlpha=1;return c}
function asphaltCanvas(){var c=cnv(512,256),g=c.getContext('2d'),R=seeded(9);g.fillStyle='#46484a';g.fillRect(0,0,512,256);
  for(var i=0;i<7000;i++){var v=R()>.5?200:0;g.fillStyle='rgba('+v+','+v+','+v+','+(R()*.09)+')';g.fillRect(R()*512,R()*256,R()*3+1,R()*3+1)}return c}
function glassCanvas(){ // a room pod's glazed face: bronze frame, sky-reflective glass over a warm interior
  var w=350,h=320,c=cnv(w,h),g=c.getContext('2d');g.fillStyle='#3b3128';g.fillRect(0,0,w,h);
  var x0=14,y0=16,x1=w-14,y1=h-14,gr=g.createLinearGradient(0,y0,0,y1);gr.addColorStop(0,'#9db9c2');gr.addColorStop(.55,'#6f8d97');gr.addColorStop(1,'#4d6872');g.fillStyle=gr;g.fillRect(x0,y0,x1-x0,y1-y0);
  var rg=g.createRadialGradient(w/2,y1-26,6,w/2,y1-26,150);rg.addColorStop(0,'rgba(255,200,128,.7)');rg.addColorStop(1,'rgba(255,190,110,0)');g.fillStyle=rg;g.fillRect(x0,y0,x1-x0,y1-y0);
  g.fillStyle='rgba(226,214,190,.8)';g.fillRect(x0,y0,40,y1-y0);g.fillRect(x1-40,y0,40,y1-y0);
  g.fillStyle='#8a5d33';g.fillRect(w/2-2,y0,4,y1-y0);g.fillRect(x0,y0+(y1-y0)*.62,x1-x0,3);return c}
function timberCanvas(){var c=cnv(128,128),g=c.getContext('2d'),R=seeded(7);g.fillStyle='#8b6a47';g.fillRect(0,0,128,128);
  for(var x=0;x<128;x+=16){g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x+14,0,2,128)}for(var i=0;i<700;i++){g.fillStyle='rgba(255,232,205,'+(R()*.08)+')';g.fillRect(R()*128,R()*128,1,R()*20+3)}return c}

function create(canvas,opts){
  opts=opts||{};
  var W=canvas.clientWidth||1280,H=canvas.clientHeight||540;
  var renderer=new T.WebGLRenderer({canvas:canvas,antialias:true,preserveDrawingBuffer:!!opts.preserve,alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,opts.maxDpr||2));renderer.setSize(W,H,false);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputEncoding=T.LinearEncoding;renderer.toneMapping=T.NoToneMapping;
  var scene=new T.Scene();var HOR=new T.Color(0xe3dfd2);scene.background=HOR.clone();scene.fog=new T.Fog(HOR.getHex(),260,820);
  (function(){var R=1100,sg=new T.SphereGeometry(R,28,18),pp=sg.attributes.position,cols=[],top=new T.Color(0x6f9ac0),mid=new T.Color(0xc4d2da);
    for(var i=0;i<pp.count;i++){var u=clamp(pp.getY(i)/R,0,1),c=HOR.clone().lerp(mid,clamp(u*3.2,0,1)).lerp(top,Math.pow(u,.7));cols.push(c.r,c.g,c.b)}
    sg.setAttribute('color',new T.Float32BufferAttribute(cols,3));var sk=new T.Mesh(sg,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide,fog:false,depthWrite:false}));sk.renderOrder=-1;scene.add(sk)})();
  var camera=new T.PerspectiveCamera(34,W/H,1,1600);
  scene.add(new T.HemisphereLight(0xdde8f2,0x8d836c,.8));
  var sun=new T.DirectionalLight(0xffe6c4,1.0);sun.position.set(130,150,-80);sun.castShadow=true;
  var SS=opts.shadow||2048;sun.shadow.mapSize.set(SS,SS);var sc=sun.shadow.camera;sc.left=-120;sc.right=120;sc.top=120;sc.bottom=-120;sc.near=20;sc.far=520;sun.shadow.bias=-.0004;sun.shadow.normalBias=.06;
  sun.target.position.set(18,30,8);scene.add(sun,sun.target);

  /* ground and street */
  var gt=tex(groundCanvas(),90,90);var ground=mesh(new T.PlaneGeometry(1500,1500),mat(0xffffff,1,0,{map:gt}),false,true);ground.rotation.x=-Math.PI/2;scene.add(ground);
  var grt=tex(grassCanvas(),22,22);var park=mesh(new T.PlaneGeometry(700,420),mat(0xffffff,1,0,{map:grt}),false,true);park.rotation.x=-Math.PI/2;park.position.set(20,.02,170);scene.add(park);
  var sitet=tex(groundCanvas(),8,8);var site=mesh(new T.PlaneGeometry(150,100),mat(0xcfc7b3,1,0,{map:sitet}),false,true);site.rotation.x=-Math.PI/2;site.position.set(5,.04,-8);scene.add(site);
  var at=tex(asphaltCanvas(),2,70);var road=mesh(new T.PlaneGeometry(14,700),mat(0xffffff,.95,0,{map:at}),false,true);road.rotation.x=-Math.PI/2;road.position.set(-30,.06,-60);road.rotation.z=Math.PI/2;scene.add(road);
  for(var di=-30;di<30;di++){var dash=mesh(new T.PlaneGeometry(3.2,.2),mat(0xe8e6dc,.9),false,true);dash.rotation.x=-Math.PI/2;dash.position.set(di*9,.08,-60);scene.add(dash)}

  var concT=tex(concreteCanvas(),4,4),mConc=mat(0xffffff,.92,0,{map:concT}),mConcD=mat(0x8d8b84,.95);
  var mLime=mat(C.lime,.5,.2),mLimeD=mat(0x93a60e,.5,.2),mChar=mat(0x3a3d3a,.6,.3),mWhite=mat(0xf0efea,.5,.1),mGl=mat(0x39464b,.2,.5),mSteel=mat(0x6c726e,.55,.5),mBronze=mat(C.bronze,.4,.8),mGold=mat(0xd1ae63,.4,.5);
  var mGlassClear=new T.MeshStandardMaterial({color:0xb7d2d6,roughness:.08,metalness:.25,transparent:true,opacity:.42,side:T.DoubleSide});

  /* ---------- podium ---------- */
  var pod=new T.Group();scene.add(pod);
  var slab0=box(48,.6,28,mConc,21,.3,11,pod);                         // foundation slab
  var colsPer=[];var cg=new T.BoxGeometry(.64,1,.64);var colsM=new T.InstancedMesh(cg,mConc,42);colsM.castShadow=true;colsM.receiveShadow=true;pod.add(colsM);
  var colPts=[];for(var l=0;l<2;l++)for(var cx=0;cx<=42;cx+=7)for(var cy=0;cy<=22;cy+=11)colPts.push([cx,cy,l]);
  var slabA=box(48,.5,28,mConc,21,4.45,11,pod),slabB=box(48,.5,28,mConc,21,8.65,11,pod);
  var dmy=new T.Object3D();
  function podium(t){
    var q0=ease((t-2)/4.5),s0=ease((t-6.5)/1.8),q1=ease((t-8.3)/3),s1=ease((t-11.3)/2);
    slabA.visible=s0>.02;slabA.scale.y=Math.max(.01,s0);slabA.position.y=4.2+.25*s0;slabA.position.y=4.2+.25*Math.max(.01,s0);
    slabB.visible=s1>.02;slabB.scale.y=Math.max(.01,s1);slabB.position.y=8.4+.25*Math.max(.01,s1);
    colPts.forEach(function(p,i){var q=p[2]?q1:q0,h=Math.max(.001,3.6*q+(p[2]?.2:0)*q),base=p[2]?4.7:.6;dmy.position.set(p[0],base+h/2,p[1]);dmy.scale.set(1,h,1);dmy.updateMatrix();colsM.setMatrixAt(i,dmy.matrix)});colsM.instanceMatrix.needsUpdate=true;
  }
  /* podium shows its two guest-slab socket pairs (the pins the first box lands on) */
  var socketM=mat(0x4f5550,.6,.4),pinM=mat(C.lime,.4,.4,{emissive:0x4d5a00});

  /* ---------- the ONE central core, with its climbing formwork ---------- */
  var coreM=box(CORE.w,1,CORE.d,mConc,CORE.x+CORE.w/2,.5,CORE.y+CORE.d/2,scene);
  var collar=box(CORE.w+.7,1.4,CORE.d+.7,mGold,CORE.x+CORE.w/2,2,CORE.y+CORE.d/2,scene);
  var coreCrown=box(CORE.w+.3,.7,CORE.d+.3,mConcD,CORE.x+CORE.w/2,2,CORE.y+CORE.d/2,scene);
  function core(t){var p=ease((t-14)/10),h=Math.max(.01,(CORE.top-.6)*p);coreM.scale.y=h;coreM.position.y=.6+h/2;coreM.visible=p>.001;
    collar.visible=p>.001&&p<.999;collar.position.y=.6+h+.2;collar.scale.set(1,1,1);coreCrown.visible=p>=.999;coreCrown.position.y=CORE.top+.35}

  /* ---------- room pods, corridor cassettes ---------- */
  var glT=tex(glassCanvas(),1,1),mPodGlass=mat(0xffffff,.45,.1,{map:glT}),mPodSide=mat(0x8d9086,.7,.2),mPodRoof=mat(0x7a7d78,.8,.1),mPodUnder=mat(0x55585a,.8,.3),mPodIn=mat(0xcbb28d,.85,0,{map:tex(timberCanvas(),2,2)});
  var matsN=[mPodSide,mPodSide,mPodRoof,mPodUnder,mPodIn,mPodGlass];   // +z inward (corridor side), -z outward glazed
  var matsS=[mPodSide,mPodSide,mPodRoof,mPodUnder,mPodGlass,mPodIn];   // +z outward glazed
  var mCassTop=mat(0x8a8d86,.8,.1),mCassSide=mat(0xb59b74,.85,0,{map:tex(timberCanvas(),1,1)}),mCassEnd=mat(0x6d726b,.7,.3);
  var matsC=[mCassEnd,mCassEnd,mCassTop,mPodUnder,mCassSide,mCassSide];
  var roomG=new T.BoxGeometry(3.5,LVL,10),cassG=new T.BoxGeometry(3.5,LVL,2);
  var iN=new T.InstancedMesh(roomG,matsN,NL*12),iS=new T.InstancedMesh(roomG,matsS,NL*12),iC=new T.InstancedMesh(cassG,matsC,NL*12);
  [iN,iS,iC].forEach(function(m){m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;scene.add(m)});
  // 28 floors x (10 north rooms, 12 south modules, 12 corridor cassettes) = 952 pieces
  var items=[];for(var f=0;f<NL;f++)for(var b=0;b<12;b++){if(b!==5&&b!==6)items.push({f:f,b:b,t:'N'});items.push({f:f,b:b,t:'S'});items.push({f:f,b:b,t:'C'})}   // the core takes the north side of bays 5 and 6; the south side holds service modules and the corridor runs through
  var TOTAL=items.length;
  function pose(it){var x=it.b*3.5+1.75,z=PODTOP+it.f*LVL+LVL/2;var y=it.t==='N'?5:it.t==='S'?17:11;return {x:x,y:y,z:z}}
  // order: the two slow lifts first (floor 0 and floor 1 of bay 0, north), then floor by floor
  function key(f,b,t){return f+'|'+b+'|'+t}
  var first=[key(0,0,'N'),key(1,0,'N')],order=[];first.forEach(function(k){items.forEach(function(it){if(key(it.f,it.b,it.t)===k)order.push(it)})});
  items.forEach(function(it){if(first.indexOf(key(it.f,it.b,it.t))<0)order.push(it)});
  var idxN=[],idxS=[],idxC=[];items.forEach(function(it){(it.t==='N'?idxN:it.t==='S'?idxS:idxC).push(it)});
  order.forEach(function(it,i){it.order=i});
  var lastN=-1;
  function placePieces(n){
    if(n===lastN)return;lastN=n;
    [[iN,idxN],[iS,idxS],[iC,idxC]].forEach(function(p){var m=p[0],list=p[1];list.forEach(function(it,j){var ps=pose(it);
      if(it.order<n){dmy.position.set(ps.x,ps.z,ps.y);dmy.scale.set(1,1,1)}else{dmy.position.set(ps.x,ps.z,ps.y);dmy.scale.set(.0001,.0001,.0001)}
      dmy.rotation.set(0,0,0);dmy.updateMatrix();m.setMatrixAt(j,dmy.matrix)});m.instanceMatrix.needsUpdate=true});
    podItemsArr.forEach(function(it,j){var ps=pose(it),on=it.order<n;CORN.forEach(function(c,k){var idx=j*4+k;
      dmy.position.set(ps.x+c[0]*PX,ps.z-LVL/2,ps.y+c[1]*PY);dmy.rotation.set(0,0,0);dmy.scale.setScalar(on?1:.0001);dmy.updateMatrix();iPin.setMatrixAt(idx,dmy.matrix);
      dmy.rotation.set(Math.PI/2,0,0);dmy.scale.setScalar(on&&it.f>=1?1:.0001);dmy.updateMatrix();iCol.setMatrixAt(idx,dmy.matrix)})});
    iPin.instanceMatrix.needsUpdate=true;iCol.instanceMatrix.needsUpdate=true;
  }
  function placedAt(t){if(t<40)return 0;if(t<52)return 1;if(t<54)return 2;if(t<70)return Math.floor(2+(TOTAL-2)*ease((t-54)/16));return TOTAL}
  // the carried piece
  var carried=mesh(roomG,matsN,true,true);scene.add(carried);carried.visible=false;
  var mPinCar=mat(C.lime,.4,.4,{emissive:0x4d5a00});[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(c){var pn=cyl(.27,1.1,mPinCar,c[0]*1.45,-LVL/2-.2,c[1]*5,carried,10);pn.castShadow=false});
  var carriedC=mesh(cassG,matsC,true,true);scene.add(carriedC);carriedC.visible=false;

  /* ---------- four locating pins per room box, one at each corner, at every level ---------- */
  var mPinC=mat(C.lime,.4,.4,{emissive:0x4d5a00}),mSock=mat(0x4f5550,.6,.4);
  var PX=1.45,PY=5;                                  // pin offsets from a box centre (x across, y along the 10 m depth)
  var CORN=[[-1,-1],[1,-1],[-1,1],[1,1]];
  var podItemsArr=items.filter(function(it){return it.t!=='C'});
  var iPin=new T.InstancedMesh(new T.CylinderGeometry(.27,.27,1.1,10),mPinC,podItemsArr.length*4),iCol=new T.InstancedMesh(new T.TorusGeometry(.4,.1,6,14),mGold,podItemsArr.length*4);
  [iPin,iCol].forEach(function(m){m.castShadow=false;m.receiveShadow=false;m.frustumCulled=false;scene.add(m)});
  // the first lifts show their pins standing ready: four on the podium slab, then four on the roof of the first box
  var readyPins=new T.Group();scene.add(readyPins);var rp=[],rs=[];
  for(var q=0;q<4;q++){rs.push(box(.8,.1,.8,mSock,0,0,0,readyPins));rp.push(cyl(.27,1.1,mPinC,0,0,0,readyPins,10))}
  function setReadyPins(ps,zBase,on){readyPins.visible=on;if(!on)return;CORN.forEach(function(c,i){rs[i].position.set(ps.x+c[0]*PX,zBase+.05,ps.y+c[1]*PY);rp[i].position.set(ps.x+c[0]*PX,zBase+.6,ps.y+c[1]*PY)})}
  /* ---------- the HAAVN tower crane ---------- */
  var crane=new T.Group();crane.position.set(CRX,0,CRY);scene.add(crane);
  var mastChords=new T.InstancedMesh(new T.BoxGeometry(.2,SEC,.2),mLime,MAXSEC*4),mastDiag=new T.InstancedMesh(new T.BoxGeometry(.1,Math.sqrt(2*2+SEC*SEC),.1),mChar,MAXSEC*4);
  [mastChords,mastDiag].forEach(function(m){m.castShadow=true;m.receiveShadow=false;m.frustumCulled=false;crane.add(m)});
  for(var s=0;s<MAXSEC;s++){var z0=s*SEC+SEC/2;[[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(c,i){dmy.position.set(c[0]*1.0,z0,c[1]*1.0);dmy.rotation.set(0,0,0);dmy.scale.set(1,1,1);dmy.updateMatrix();mastChords.setMatrixAt(s*4+i,dmy.matrix)});
    // one diagonal on each face, alternating
    var faces=[[0,-1,0],[1,0,Math.PI/2],[0,1,Math.PI],[-1,0,-Math.PI/2]];faces.forEach(function(fc,i){var ang=Math.atan2(2,SEC)*(s%2?-1:1);
      dmy.position.set(fc[0]*1.0,z0,fc[1]*1.0);dmy.rotation.set(0,fc[2],0);dmy.rotateZ(ang);dmy.scale.set(1,1,1);dmy.updateMatrix();mastDiag.setMatrixAt(s*4+i,dmy.matrix)})}
  mastChords.instanceMatrix.needsUpdate=true;mastDiag.instanceMatrix.needsUpdate=true;
  var top=new T.Group();crane.add(top);var arm=new T.Group();top.add(arm);   // top follows the mast height; arm slews
  // slewing unit
  cyl(1.7,.7,mChar,0,.35,0,arm,24);box(3.6,.35,2.6,mChar,0,.85,0,arm);
  box(1.7,2.0,1.6,mWhite,-.2,2.0,1.55,arm);box(.05,.9,1.3,mGl,.66,2.2,1.55,arm);box(1.65,.9,.05,mGl,-.2,2.2,2.35,arm);   // cab
  box(3.2,1.5,2.2,mChar,-4.0,1.3,0,arm);box(3.24,.22,2.24,mLime,-4.0,1.9,0,arm);                                      // machinery house
  // jib: triangular lattice
  var jibG=new T.Group();arm.add(jibG);
  function lattice(x0,x1,par,top,bot,half,step){var Lg=[];box(x1-x0,.16,.16,mLime,(x0+x1)/2,top,0,par);box(x1-x0,.16,.16,mLime,(x0+x1)/2,bot,half,par);box(x1-x0,.16,.16,mLime,(x0+x1)/2,bot,-half,par);
    var n=Math.floor((x1-x0)/step),dg=new T.BoxGeometry(.09,1,.09),im=new T.InstancedMesh(dg,mChar,n*4);im.castShadow=true;im.frustumCulled=false;par.add(im);var k=0;
    for(var i=0;i<n;i++){var xa=x0+i*step,xb=xa+step,dirs=i%2?1:-1;
      [half,-half].forEach(function(zz){var dx=step,dy=top-bot,len=Math.sqrt(dx*dx+dy*dy+half*half);
        // slanted brace from bottom chord at xa to top chord at xb (and back)
        var a=new T.Vector3(xa,bot,zz),b=new T.Vector3(xb,top,0);if(dirs>0){a=new T.Vector3(xa,top,0);b=new T.Vector3(xb,bot,zz)}
        var mid=a.clone().add(b).multiplyScalar(.5),dir=b.clone().sub(a),L=dir.length();dmy.position.copy(mid);dmy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());dmy.scale.set(1,L,1);dmy.updateMatrix();im.setMatrixAt(k++,dmy.matrix)});
      [[xa,xa],[xb,xb]].forEach(function(c){ // cross frame
        var a=new T.Vector3(c[0],bot,half),b=new T.Vector3(c[0],bot,-half);var mid=a.clone().add(b).multiplyScalar(.5),dir=b.clone().sub(a),L=dir.length();dmy.position.copy(mid);dmy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());dmy.scale.set(1,L,1);dmy.updateMatrix();if(k<n*4)im.setMatrixAt(k++,dmy.matrix)})}
    im.count=k;im.instanceMatrix.needsUpdate=true}
  lattice(.5,JIB,jibG,3.0,.9,.9,3);
  var cjG=new T.Group();arm.add(cjG);lattice(-CJIB,-.5,cjG,3.0,.9,.9,3);
  // counterweights
  for(var cwI=0;cwI<5;cwI++)box(1.5,1.8,2.2,mConcD,-CJIB+1.2+cwI*1.6,0,0,cjG).position.y=-.4;
  // cat head (A-frame) and pendants
  var apexY=11.5;box(.35,apexY,.35,mChar,0,apexY/2+1,0,arm).scale.set(1,1,1);
  var pend=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0x222222}));pend.frustumCulled=false;arm.add(pend);
  (function(){var pts=[[0,apexY+1,0],[JIB*.42,3.0,0],[0,apexY+1,0],[JIB*.88,3.0,0],[0,apexY+1,0],[-CJIB*.55,3.0,0],[0,apexY+1,0],[-CJIB+.6,3.0,0]],a=new Float32Array(pts.length*3);pts.forEach(function(p,i){a[i*3]=p[0];a[i*3+1]=p[1];a[i*3+2]=p[2]});pend.geometry.setAttribute('position',new T.BufferAttribute(a,3))})();
  var beacon=mesh(new T.SphereGeometry(.28,10,8),new T.MeshBasicMaterial({color:0xc6d813}),false,false);beacon.position.set(0,apexY+1.3,0);arm.add(beacon);
  // HAAVN wordmark panels on both sides of the jib
  var signs=[];(function(){var wm=opts.wordmark;if(!wm)return;var im=new Image();im.onload=function(){var cv=cnv(2048,240),g=cv.getContext('2d');g.fillStyle='#222421';g.fillRect(0,0,2048,240);g.drawImage(im,70,50,1908,Math.round(1908*im.height/im.width));var tx=new T.CanvasTexture(cv);tx.anisotropy=8;
    [1,-1].forEach(function(sd){var pl=new T.Mesh(new T.PlaneGeometry(26,3.05),new T.MeshBasicMaterial({map:tx}));pl.position.set(20,2.0,sd*1.02);if(sd<0)pl.rotation.y=Math.PI;jibG.add(pl);signs.push(pl)})};im.src=wm})();
  // trolley, hoist cable and hook block
  var trolley=new T.Group();jibG.add(trolley);box(1.6,.6,1.5,mChar,0,.5,0,trolley);box(1.62,.14,1.52,mLime,0,.82,0,trolley);
  var hook=new T.Group();scene.add(hook);box(.9,1.1,.7,mChar,0,0,0,hook);box(.92,.18,.72,mLime,0,.4,0,hook);cyl(.1,.8,mSteel,0,-.9,0,hook,8);
  var cable=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0x1d1d1d}));cable.frustumCulled=false;scene.add(cable);

  /* ---------- delivery trucks ---------- */
  function makeTruck(){var g=new T.Group(),mCab=mat(0xf0efea,.5,.1),mT=mat(0x262626,.9,0);
    box(17,.32,3.1,mSteel,0,1.25,0,g);box(1,.5,2.6,mChar,-8.4,.95,0,g);
    box(2.4,2.5,2.6,mCab,9.6,2.1,0,g);box(.1,.8,2.57,mGl,10.82,2.55,0,g);box(2.3,.25,2.6,mLime,9.6,1.35,0,g);box(3.4,.5,2.3,mChar,8.5,1.0,0,g);
    [9.5,7.1,6.0,-6.0,-7.2].forEach(function(x){[-1.15,1.15].forEach(function(z){var w=cyl(.55,.4,mT,x,.55,z,g,20);w.rotation.x=Math.PI/2})});return g}
  var trucks=[];[0,-22,-44,-66].forEach(function(ox,i){var tr=makeTruck(),mod=mesh(roomG,matsN,true,true);mod.rotation.y=Math.PI/2;mod.position.set(-1.5,1.41+1.6,0);tr.add(mod);tr.userData.mod=mod;tr.userData.ox=ox;scene.add(tr);trucks.push(tr)});
  function truckAt(t){trucks.forEach(function(tr,i){
    var arr0=24+i*1.1,arr1=arr0+3.2,dep0=i===0?41:55,dep1=dep0+4;var tx=LANE.x+tr.userData.ox;
    tr.visible=t>arr0&&t<dep1;if(!tr.visible)return;
    var xA=tx-70,xB=tx,xC=tx+90,x=t<arr1?lerp(xA,xB,ease((t-arr0)/(arr1-arr0))):t<dep0?xB:lerp(xB,xC,ease((t-dep0)/(dep1-dep0)));
    tr.position.set(x,0,LANE.y);tr.rotation.y=0;
    tr.userData.mod.visible=!(i===0&&t>=33.4);   // the first box has been lifted off
  })}

  /* ---------- finishes ---------- */
  var fin=new T.Group();scene.add(fin);
  var podGlass=mesh(new T.BoxGeometry(47.4,7.4,27.4),mGlassClear,false,true);podGlass.position.set(21,4.6,11);fin.add(podGlass);
  var podFrame=box(48,.5,28,mBronze,21,8.95,11,fin);
  var fins=[];[-.12,22.12].forEach(function(yy){for(var b=0;b<=12;b++){var fn=box(.14,1,.42,mBronze,b*3.5,PODTOP,yy,fin);fins.push(fn)}});
  var cap=box(42.8,.45,22.8,mBronze,21,TOPZ+.22,11,fin);
  fin.visible=false;

  /* ---------- trees around the park ---------- */
  var R=seeded(42),tcols=[0xb4642f,0x9b3d2a,0xc4973a,0x77836a,0xa5612d,0xc47f33];
  function tree(x,z,s){var g=new T.Group();cyl(.3*s,6*s,mat(0x7b6a55,.95),0,3*s,0,g,7);for(var i=0;i<8;i++){var r=(1.5+R()*1.6)*s,b=mesh(new T.IcosahedronGeometry(r,0),mat(tcols[(R()*tcols.length)|0],.95,0,{flatShading:true}));var a=R()*6.28,rd=R()*2.8*s;b.position.set(Math.cos(a)*rd,(5.2+R()*4.6)*s,Math.sin(a)*rd);b.scale.y=.75;g.add(b)}g.position.set(x,0,z);return g}
  [[-60,40],[-90,10],[-80,70],[-40,90],[0,100],[50,104],[90,90],[100,40],[88,-20],[110,10],[60,80],[-20,70],[130,60],[-120,40],[-50,-70],[-100,-30],[30,-90],[80,-70],[120,-50],[-70,110],[10,130],[70,130]].forEach(function(p){scene.add(tree(p[0],p[1],1.1+R()*.7))});

  /* ---------- hook paths, crane, camera ---------- */
  var TRAV=17;
  var PICKZ=1.41+LVL+SLING;         // hook height when slung onto a box on the truck deck
  var pickPt={x:LANE.x-1.5,y:LANE.y};
  function lift(t0,t1,item){var ps=pose(item);return {t0:t0,t1:t1,item:item,tgt:{x:ps.x,y:ps.y,zc:ps.z}}}
  var lifts=[lift(31,40,order[0]),lift(44,52,order[1])];
  function pieceTop(zc){return zc+LVL/2}
  function seatOf(L){return pieceTop(L.tgt.zc)+SLING}
  var CYC=16/17;                    // 17 time-lapse hook cycles between 54 s and 70 s
  function craneHeight(t){return 30+82*ease((t-12)/12)}
  function arc(t,t0,t1,from,to){var s=ease((t-t0)/(t1-t0));return {x:lerp(from.x,to.x,s),y:lerp(from.y,to.y,s),z:lerp(from.z,to.z,s)+9*Math.sin(Math.PI*s),carry:null}}
  function hookState(t){
    var rest;
    if(t<31){
      if(t<14)return {x:14+6*Math.sin(t*.4),y:5+3*Math.cos(t*.5),z:18+4*Math.sin(t*.6),carry:null};
      if(t<24){var cz=.6+(CORE.top-.6)*ease((t-14)/10);return {x:CORE.x+3.5,y:11+8*Math.sin(t*.7),z:cz+9,carry:null}}
      var u=ease((t-24)/7),c0={x:CORE.x+3.5,y:11+8*Math.sin(24*.7),z:CORE.top+9};return {x:lerp(c0.x,pickPt.x,u),y:lerp(c0.y,pickPt.y,u),z:lerp(c0.z,PICKZ+4,u),carry:null}}
    for(var i=0;i<lifts.length;i++){var L=lifts[i];
      if(t>=L.t0&&t<=L.t1){var u2=(t-L.t0)/(L.t1-L.t0),tgtTop=pieceTop(L.tgt.zc),seat=seatOf(L),high=tgtTop+TRAV*.6;
        if(u2<.16)return {x:pickPt.x,y:pickPt.y,z:lerp(PICKZ+4,PICKZ,ease(u2/.16)),carry:null};
        var sg=(u2-.16)/.84,px,py,pz,rot;
        if(sg<.28){px=pickPt.x;py=pickPt.y;pz=lerp(PICKZ,high,ease(sg/.28));rot=Math.PI/2}
        else if(sg<.66){var w=ease((sg-.28)/.38);px=lerp(pickPt.x,L.tgt.x,w);py=lerp(pickPt.y,L.tgt.y,w);pz=high;rot=lerp(Math.PI/2,0,ease2((sg-.34)/.26))}
        else{var w2=ease((sg-.66)/.34);px=L.tgt.x;py=L.tgt.y;pz=lerp(high,seat,w2);rot=0}
        return {x:px,y:py,z:pz,carry:{item:L.item,rot:rot}}}}
    if(t>=40&&t<44){var L1=lifts[0];return arc(t,40,44,{x:L1.tgt.x,y:L1.tgt.y,z:seatOf(L1)},{x:pickPt.x,y:pickPt.y,z:PICKZ+4})}
    if(t>52&&t<54){var L2=lifts[1];return arc(t,52,54,{x:L2.tgt.x,y:L2.tgt.y,z:seatOf(L2)},{x:pickPt.x,y:pickPt.y,z:PICKZ})}
    if(t>=54&&t<=70){var n=placedAt(t),ci=order[Math.min(TOTAL-1,n)],ps=pose(ci),cyc=((t-54)/CYC)%1,seat2=pieceTop(ps.z)+SLING,high2=Math.max(seat2+9,TRAV+8),px2,py2,pz2,rot2;
      if(t>=70-.001){cyc=1}
      if(cyc<.25){px2=pickPt.x;py2=pickPt.y;pz2=lerp(PICKZ,high2,ease(cyc/.25));rot2=Math.PI/2}
      else if(cyc<.7){var w3=ease((cyc-.25)/.45);px2=lerp(pickPt.x,ps.x,w3);py2=lerp(pickPt.y,ps.y,w3);pz2=high2;rot2=lerp(Math.PI/2,0,w3)}
      else{var w4=ease((cyc-.7)/.3);px2=ps.x;py2=ps.y;pz2=lerp(high2,seat2,w4);rot2=0}
      return {x:px2,y:py2,z:pz2,carry:{item:ci,rot:rot2}}}
    // after the time-lapse the hook rises and rests over the finished tower
    var lastp=pose(order[TOTAL-1]),from={x:lastp.x,y:lastp.y,z:pieceTop(lastp.z)+SLING},to={x:CORE.x+3.5,y:11,z:TOPZ+8};
    var u3=ease((t-70)/3);return {x:lerp(from.x,to.x,u3),y:lerp(from.y,to.y,u3),z:lerp(from.z,to.z,u3),carry:null}
  }
  /* camera */
  var camKeys=[
    {t:0,p:[-150,62,-140],g:[16,12,11],f:34},{t:8,p:[-120,46,-120],g:[18,8,11],f:34},{t:14,p:[-130,66,-150],g:[19,22,11],f:34},
    {t:22,p:[-150,92,-175],g:[20,52,11],f:36},{t:28,p:[-75,34,-90],g:[-4,12,-8],f:34},{t:32,p:[-30,30,-44],g:[-7,18,-6],f:34},
    {t:39,p:[-9,17,-9],g:[1.75,10,3],f:28},{t:43,p:[-30,34,-46],g:[0,16,5],f:34},{t:48,p:[-8,22,-14],g:[1.75,14,4],f:28},
    {t:54,p:[-155,70,-170],g:[20,42,11],f:36},{t:58,p:[-72,58,-92],g:[14,34,6],f:32},{t:64,p:[-6,54,-66],g:[21,42,3],f:32},{t:69,p:[-170,88,-232],g:[20,52,11],f:36},
    {t:75,p:[60,46,-190],g:[21,50,11],f:34},{t:82,p:[40,44,-170],g:[21,50,11],f:34}];
  function camAt(t){var n=camKeys.length,i=0;while(i<n-2&&t>camKeys[i+1].t)i++;var a=camKeys[i],b=camKeys[i+1],u=clamp((t-a.t)/(b.t-a.t),0,1),p0=camKeys[Math.max(0,i-1)],p3=camKeys[Math.min(n-1,i+2)];
    function cr(get){var v0=get(p0),v1=get(a),v2=get(b),v3=get(p3);var m1=(v2-v0)*.5*(b.t-a.t)/Math.max(1e-6,(b.t-p0.t)||1),m2=(v3-v1)*.5*(b.t-a.t)/Math.max(1e-6,(p3.t-a.t)||1);var u2=u*u,u3=u2*u;return (2*u3-3*u2+1)*v1+(u3-2*u2+u)*m1+(-2*u3+3*u2)*v2+(u3-u2)*m2}
    return {p:[0,1,2].map(function(k){return cr(function(o){return o.p[k]})}),g:[0,1,2].map(function(k){return cr(function(o){return o.g[k]})}),f:cr(function(o){return o.f})}}

  var slingGeo=new T.BufferGeometry();var slings=new T.LineSegments(slingGeo,new T.LineBasicMaterial({color:0x2a2a2a}));slings.frustumCulled=false;scene.add(slings);
  var lastPins=false;
  function render(t){
    t=clamp(t,0,DUR);
    podium(t);core(t);truckAt(t);
    var n=placedAt(t);placePieces(n);
    // facade finishes
    var fu=ease((t-70)/3.5);fin.visible=fu>0.001;
    if(fin.visible){podGlass.scale.y=Math.max(.01,fu);podGlass.position.y=.9+3.7*Math.max(.01,fu);podFrame.visible=fu>.9;
      fins.forEach(function(fn,i){var v=ease(fu*1.4-(i%13)*.03),h=Math.max(.01,(TOPZ-PODTOP)*v);fn.scale.y=h;fn.position.y=PODTOP+h/2});cap.visible=fu>.7}
    // crane: height, slew, trolley, hook
    var Hm=craneHeight(t),nSec=Math.min(MAXSEC,Math.max(12,Math.ceil(Hm/SEC)));mastChords.count=nSec*4;mastDiag.count=nSec*4;top.position.y=nSec*SEC;
    var hs=hookState(t),dx=hs.x-CRX,dz=hs.y-CRY,rad=Math.sqrt(dx*dx+dz*dz);
    arm.rotation.y=Math.atan2(-dz,dx);                                    // three: rotation about +Y; jib points along +X in arm space
    var tr=clamp(rad,5,JIB-2);trolley.position.set(tr,0,0);
    hook.position.set(CRX+dx*(tr/Math.max(rad,.001)),hs.z,CRY+dz*(tr/Math.max(rad,.001)));
    if(rad>JIB-2){hs.x=CRX+dx/rad*(JIB-2);hs.y=CRY+dz/rad*(JIB-2);hook.position.set(hs.x,hs.z,hs.y)}else hook.position.set(hs.x,hs.z,hs.y);
    // cable from the trolley to the hook
    crane.updateMatrixWorld(true);var tw=new T.Vector3(0,.2,0);trolley.localToWorld(tw);
    var ca=new Float32Array([tw.x,tw.y,tw.z,hook.position.x,hook.position.y+.6,hook.position.z]);cable.geometry.setAttribute('position',new T.BufferAttribute(ca,3));
    // carried piece and slings
    carried.visible=false;carriedC.visible=false;var sl=[];
    if(hs.carry){var it=hs.carry.item,ps=pose(it),cm=it.t==='C'?carriedC:carried;cm.visible=true;if(it.t!=='C')cm.material=(it.t==='S')?matsS:matsN;
      cm.position.set(hs.x,hs.z-SLING-LVL/2,hs.y);cm.rotation.y=hs.carry.rot;
      var half=it.t==='C'?[1.75,1]:[1.75,5],ca2=Math.cos(hs.carry.rot),sa2=Math.sin(hs.carry.rot);
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(c){var lx=c[0]*half[0],lz=c[1]*half[1];var wx=cm.position.x+lx*ca2+lz*sa2,wz=cm.position.z-lx*sa2+lz*ca2;sl.push(hook.position.x,hook.position.y-.3,hook.position.z,wx,cm.position.y+LVL/2,wz)})}
    slings.geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(sl.length?sl:[0,0,0,0,0,0]),3));
    // the first two lifts show their four corner pins standing ready: on the podium slab, then on the roof of the first box
    if(t>=30&&t<40)setReadyPins(pose(order[0]),PODTOP,true);else if(t>=40&&t<52)setReadyPins(pose(order[1]),PODTOP+LVL,true);else setReadyPins(null,0,false);
    carried.children.forEach(function(ch){ch.visible=carried.visible});
    // camera
    var c=camAt(t);camera.position.set(c.p[0],c.p[1],c.p[2]);camera.lookAt(c.g[0],c.g[1],c.g[2]);if(Math.abs(camera.fov-c.f)>.01){camera.fov=c.f;camera.updateProjectionMatrix()}
    renderer.render(scene,camera);
  }
  function resize(w,h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
  resize(W,H);placePieces(0);
  return {render:render,resize:resize,renderer:renderer,scene:scene,camera:camera,info:{duration:DUR,placedAt:placedAt,total:TOTAL,perFloor:Math.round(TOTAL/NL),lifts:[lifts[0].t1,lifts[1].t1]}};
}
window.HotelScene={create:create,DUR:DUR};
})();
