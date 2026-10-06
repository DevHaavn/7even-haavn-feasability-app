import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const wrap=document.querySelector('#viewport');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
const PHONE=matchMedia('(max-width:900px)').matches||(navigator.maxTouchPoints>1&&Math.min(screen.width,screen.height)<=900);
renderer.setPixelRatio(Math.min(devicePixelRatio,PHONE?1.5:2));renderer.setSize(wrap.clientWidth,wrap.clientHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;renderer.localClippingEnabled=true;
wrap.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#e8ece2');
const camera=new THREE.OrthographicCamera(-9,9,6,-6,.1,100);camera.position.set(-5,13,-13);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(6.7,.45,1.5);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;controls.minZoom=.6;controls.maxZoom=5;
const env=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(),.04).texture;scene.environment=env;scene.environmentIntensity=.52;
scene.add(new THREE.HemisphereLight(0xffffff,0x9d9c82,.8));
const sun=new THREE.DirectionalLight(0xfff6df,1.8);sun.position.set(-1,14,-9);sun.target.position.set(6,0,1);sun.castShadow=true;sun.shadow.mapSize.set(PHONE?2048:4096,PHONE?2048:4096);Object.assign(sun.shadow.camera,{left:-13,right:13,top:9,bottom:-9,near:.1,far:45});sun.shadow.normalBias=.018;sun.shadow.bias=-.00015;scene.add(sun,sun.target);
const fill=new THREE.DirectionalLight(0xdae6fb,.8);fill.position.set(15,8,9);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({color:0xe6e7dc,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(6.7,-.30,1.6);ground.receiveShadow=true;scene.add(ground);
const clip=new THREE.Plane(new THREE.Vector3(0,-1,0),1.14);let model,mode='cutaway';
const cutCaps=new THREE.Group();scene.add(cutCaps);
const capMaterial=new THREE.MeshStandardMaterial({color:0xdddacd,roughness:.9});
for(const [x,z,w,d] of [[0,0,.95,.25],[2.75,0,1.975,.25],[8.675,0,2.075,.25],[12.55,0,.85,.25],[0,.25,.25,4.0],[13.15,.25,.25,4.0],[0,4.25,3.475,.25],[4.475,4.25,2.905,.25],[8.13,4.25,5.27,.25],[8.13,1.36,.10,2.89],[10.05,1.30,.10,2.95],[9.08,1.26,.97,.10]]){const cap=new THREE.Mesh(new THREE.BoxGeometry(w,.012,d),capMaterial);cap.position.set(13.4-x-w/2,1.139,z+d/2);cap.receiveShadow=true;cutCaps.add(cap);}
const originalMats=new Map();const labels=[];
function fit(){const a=wrap.clientWidth/wrap.clientHeight,half=Math.max(5.4,9/a);camera.left=-half*a;camera.right=half*a;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(wrap.clientWidth,wrap.clientHeight);}
function applyCut(){if(!model)return;const full=document.querySelector('#full-walls').checked;const showRoof=document.querySelector('#roof').checked;cutCaps.visible=!full;
model.traverse(o=>{if(!o.isMesh)return;const role=o.name.split('|')[0];o.visible=role!=='roof'||showRoof;
if(role==='ceiling-fixture')o.visible=full||showRoof;
const cut=!full&&(role.startsWith('wall-')||['partition','window','door','curtain'].includes(role));
o.material.clippingPlanes=cut?[clip]:[];o.material.clipShadows=true;
if(role==='awning')o.visible=full;
});}
function setView(v){mode=v;const data={
cutaway:{pos:[-5,13,-13],target:[6.7,.3,1.1],title:'The spaces within.',sub:'ROOF REMOVED / PROPOSED WINDOWS',full:false,roof:false,zoom:1},
plan:{pos:[6.7,23,1.48],target:[6.7,0,1.5],title:'A familiar plan, refined.',sub:'13,400 x 4,500 mm / ROOM ARRANGEMENT RETAINED',full:false,roof:false,zoom:1.12},
front:{pos:[6.7,3.5,-18],target:[6.7,1.55,1.8],title:'Three considered openings.',sub:'LIVING / WALK-OUT / BEDROOM',full:true,roof:true,zoom:1.08},
rear:{pos:[6.7,4.5,23],target:[6.7,1.5,2.2],title:'Light where it is needed.',sub:'SHOWER HIGH WINDOW / REAR ENTRY RETAINED',full:true,roof:true,zoom:1.02},
bedroom:{pos:[-10,5.2,-4],target:[1.7,1.6,2.2],title:'The bedroom end.',sub:'W03 / 2,000 x 400 mm PROPOSED',full:true,roof:true,zoom:1.35}
}[v];camera.position.set(...data.pos);controls.target.set(...data.target);camera.zoom=data.zoom;camera.up.set(0,1,0);camera.updateProjectionMatrix();document.querySelector('#full-walls').checked=data.full;document.querySelector('#roof').checked=data.roof;document.querySelector('#view-title').textContent=data.title;document.querySelector('#view-subtitle').textContent=data.sub;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));applyCut();controls.update();}
function updateLabels(){
const enabled=document.querySelector('#labels').checked,full=document.querySelector('#full-walls').checked;
labels.forEach(({el,w})=>{const isHigh=w.sill>0;let pos=w.wall==='right'?new THREE.Vector3(13.6,(w.sill+w.height/2)/1000,(w.start+w.width/2)/1000):new THREE.Vector3((w.start+w.width/2)/1000,full?(w.sill+w.height)/1000+.28:.34,w.wall==='front'?-.1:4.65);pos.x=13.4-pos.x;pos.project(camera);const faceShown=mode==='front'?w.wall==='front':mode==='rear'?w.wall==='rear':mode==='bedroom'?w.wall==='right':true;const vis=enabled&&faceShown&&(!isHigh||full)&&pos.z<1&&pos.x>-1&&pos.x<1&&pos.y>-1&&pos.y<1;el.style.display=vis?'block':'none';el.style.left=((pos.x*.5+.5)*wrap.clientWidth)+'px';el.style.top=((-pos.y*.5+.5)*wrap.clientHeight)+'px';});
}
try{
const design=await(await fetch('./design.json')).json();
model=(await new GLTFLoader().loadAsync('./solum-revised.glb',e=>{if(e.total)document.querySelector('#load-progress').textContent='Loading model · '+Math.round(e.loaded/e.total*100)+'%';})).scene;
model.traverse(o=>{if(!o.isMesh)return;o.material=o.material.clone();originalMats.set(o,{map:o.material.map,color:o.material.color.clone(),rough:o.material.roughness});o.castShadow=!o.material.transparent;o.receiveShadow=true;o.material.side=THREE.DoubleSide;if(o.material.name==='Charcoal metal'){o.material.metalness=0;o.material.roughness=.88;}if(o.material.transparent)o.material.depthWrite=false;if(o.material.map)o.material.map.anisotropy=renderer.capabilities.getMaxAnisotropy();});
scene.add(model);design.windows.forEach(w=>{const el=document.createElement('div');el.className='window-label';el.textContent=w.id;document.querySelector('#labels-layer').append(el);labels.push({el,w});});
fit();setView('cutaway');document.querySelector('#loader').classList.add('hidden');document.body.dataset.modelReady='true';
}catch(err){document.querySelector('#load-progress').textContent='The model could not load. Please refresh.';console.error(err);}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
document.querySelector('#full-walls').onchange=applyCut;document.querySelector('#roof').onchange=applyCut;
document.querySelector('#tile').onchange=e=>{const colours={sage:'#3d5b4c',blue:'#597080',burgundy:'#702f34',wheat:'#a28b44'};model.traverse(o=>{if(o.isMesh&&o.material.name==='Sage glaze')o.material.color.set(colours[e.target.value]);});};
document.querySelector('#timber').onchange=e=>{let darkTex;model.traverse(o=>{if(o.isMesh&&o.material.name==='Charred timber')darkTex=originalMats.get(o).map;});model.traverse(o=>{if(o.isMesh&&o.material.name==='Walnut veneer'){o.material.map=e.target.value==='dark'?darkTex:originalMats.get(o).map;o.material.color.set(e.target.value==='dark'?'#686b67':'#ffffff');o.material.needsUpdate=true;}});};
document.querySelector('#cladding').onchange=e=>{model.traverse(o=>{if(o.isMesh&&o.material.name==='Charred timber'){const orig=originalMats.get(o);o.material.map=e.target.value==='concrete'?null:orig.map;o.material.color.copy(e.target.value==='concrete'?new THREE.Color('#babdb2'):orig.color);o.material.needsUpdate=true;}});};
document.querySelector('#export').onclick=()=>{
const width=3840,height=2160,aspect=width/height,old={left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom,pixel:renderer.getPixelRatio()};
const half=Math.max(5.4,9/aspect);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setPixelRatio(1);renderer.setSize(width,height,false);renderer.render(scene,camera);
const a=document.createElement('a');a.href=renderer.domElement.toDataURL('image/png');a.download=mode==='cutaway'?'SOLUM 3D Cutaway.png':'SOLUM 3D '+mode+'.png';a.click();
Object.assign(camera,{left:old.left,right:old.right,top:old.top,bottom:old.bottom});camera.updateProjectionMatrix();renderer.setPixelRatio(old.pixel);fit();document.querySelector('#export-status').textContent='4K model view saved · 3840 x 2160 px';};
new ResizeObserver(fit).observe(wrap);
function frame(){requestAnimationFrame(frame);controls.update();updateLabels();renderer.render(scene,camera);}frame();
