import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const canvas = document.querySelector('#space');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030404);
const camera = new THREE.PerspectiveCamera(35, innerWidth/innerHeight, .1, 100);
camera.position.set(0,0,5.4);

const group = new THREE.Group();
scene.add(group);
const earthGroup = new THREE.Group();
group.add(earthGroup);

const starsGeo = new THREE.BufferGeometry();
const starCount = 1800;
const starPositions = new Float32Array(starCount*3);
for(let i=0;i<starCount;i++){
  const r=28, theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
  starPositions[i*3]=r*Math.sin(phi)*Math.cos(theta);
  starPositions[i*3+1]=r*Math.sin(phi)*Math.sin(theta);
  starPositions[i*3+2]=r*Math.cos(phi);
}
starsGeo.setAttribute('position',new THREE.BufferAttribute(starPositions,3));
scene.add(new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0x9da6a2,size:.035,sizeAttenuation:true,transparent:true,opacity:.72})));

const earth = new THREE.Mesh(new THREE.SphereGeometry(1.65,96,96),new THREE.MeshStandardMaterial({color:0x283d48,roughness:1,metalness:0}));
earthGroup.add(earth);

// Stylized continental land masses: generated from many geographic-ish blobs.
const land = new THREE.Group(); earthGroup.add(land);
const cityPoints=[];
const regions=[
  [28,77,1.0],[19,73,.85],[13,77,.62],[22,88,.72],[23,72,.58],[30,78,.5],
  [51,0,.95],[48,16,.9],[41,29,.72],[40,-74,1.0],[34,-118,.9],[35,139,.95],[31,121,.95],[22,114,.75],
  [-23,-46,.95],[-34,18,.55],[-1,37,.52],[6,3,.62],[-33,151,.6],[37,-122,.7]
];
function latLon(lat,lon,r=1.67){
 const phi=(90-lat)*Math.PI/180, theta=(lon+180)*Math.PI/180;
 return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta));
}
regions.forEach(([lat,lon,s])=>{
 const p=latLon(lat,lon,1.68);
 const dot=new THREE.Mesh(new THREE.SphereGeometry(.035+s*.012,10,10),new THREE.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.35}));
 dot.position.copy(p); dot.lookAt(0,0,0); earthGroup.add(dot); cityPoints.push(dot);
});

// Atmosphere shell.
const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.72,64,64),new THREE.MeshBasicMaterial({color:0x78a7b5,transparent:true,opacity:.075,side:THREE.BackSide,blending:THREE.AdditiveBlending}));
earthGroup.add(atmosphere);

// Night-light particles projected around the globe.
const lightGeo=new THREE.BufferGeometry();
const lp=[]; const colors=[];
for(let i=0;i<850;i++){
 const lat=(Math.random()*140)-70, lon=Math.random()*360-180;
 const p=latLon(lat,lon,1.695); lp.push(p.x,p.y,p.z); colors.push(1,.55+.35*Math.random(),.18);
}
lightGeo.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));
lightGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
const lightMat=new THREE.PointsMaterial({size:.018,vertexColors:true,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,sizeAttenuation:true});
const lights=new THREE.Points(lightGeo,lightMat); earthGroup.add(lights);

const sun=new THREE.DirectionalLight(0xdde9e8,2.2); sun.position.set(-4,2,5); scene.add(sun);
scene.add(new THREE.AmbientLight(0x233137,.32));

let targetRotX=.16,targetRotY=-.75,rotX=.16,rotY=-.75,scale=1;
let dragging=false,lastX=0,lastY=0;
canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointerup',()=>dragging=false);
canvas.addEventListener('pointermove',e=>{if(!dragging)return;targetRotY+=(e.clientX-lastX)*.006;targetRotX+=(e.clientY-lastY)*.004;targetRotX=Math.max(-.8,Math.min(.8,targetRotX));lastX=e.clientX;lastY=e.clientY});
canvas.addEventListener('wheel',e=>{scale=Math.max(.78,Math.min(1.25,scale-e.deltaY*.0005))},{passive:true});

function animate(){requestAnimationFrame(animate);rotX+=(targetRotX-rotX)*.06;rotY+=(targetRotY-rotY)*.06;earthGroup.rotation.x=rotX;earthGroup.rotation.y=rotY;group.scale.setScalar(scale);lights.rotation.y+=.0007;renderer.render(scene,camera)}
animate();

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.8))});

const yearSlider=document.querySelector('#yearSlider');
const yearReadout=document.querySelector('#yearReadout');
const timelineYear=document.querySelector('#timelineYear');
const indexReadout=document.querySelector('#indexReadout');
const statNumber=document.querySelector('#statNumber');
function yearUpdate(){const y=+yearSlider.value;const t=(y-1992)/(2026-1992);yearReadout.textContent=y;timelineYear.textContent=y;const idx=(31.8+43*t).toFixed(1);indexReadout.textContent=idx;statNumber.textContent=(1+2.2*t).toFixed(1)+'×';lights.material.opacity=.12+.72*t;cityPoints.forEach((p,i)=>p.material.opacity=.18+.5*t)}
yearSlider.addEventListener('input',yearUpdate);yearUpdate();

const regionData={GLOBAL:['74.8','+214%','GLB-00','A global view of artificial illumination. Select a region to move from planetary scale to local patterns.'],INDIA:['82.1','+268%','IND-91','A dense network of urban illumination across one of the fastest-growing observation regions.'],EUROPE:['78.4','+161%','EUR-44','Dense urban corridors create a continuous luminous footprint across much of the continent.'],'NORTH AMERICA':['76.9','+184%','NAM-07','Large metropolitan clusters and connected road networks form broad night-light signatures.'],'EAST ASIA':['89.2','+301%','EAS-52','Some of the most intense and extensive urban illumination patterns are concentrated here.'],AFRICA:['42.6','+126%','AFR-18','Lower aggregate illumination masks rapidly growing urban centers and local changes.']};
const regionTitle=document.querySelector('#regionTitle'),regionIndex=document.querySelector('#regionIndex'),regionChange=document.querySelector('#regionChange'),regionCode=document.querySelector('#regionCode'),regionCopy=document.querySelector('#regionCopy'),regionReadout=document.querySelector('#regionReadout');
document.querySelectorAll('#regionList button').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('#regionList button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const d=regionData[btn.dataset.region];regionTitle.textContent=btn.dataset.region;regionReadout.textContent=btn.dataset.region;regionIndex.textContent=d[0];regionChange.textContent=d[1];regionCode.textContent=d[2];regionCopy.textContent=d[3]}));

const pollutionSlider=document.querySelector('#pollutionSlider'),pollutionValue=document.querySelector('#pollutionValue');
pollutionSlider.addEventListener('input',()=>{const v=+pollutionSlider.value;pollutionValue.textContent=v+'%';const opacity=Math.max(.05,1-v/120);scene.children.filter(x=>x.type==='Points').forEach(x=>x.material.opacity=.15+opacity*.7);document.querySelector('.sky-copy p').style.opacity=1-v*.004});

const citySlider=document.querySelector('#citySlider'),cityValue=document.querySelector('#cityValue'),cityLights=document.querySelector('.city-lights'),starsReturn=document.querySelector('.stars-return');
function cityUpdate(){const v=+citySlider.value;cityValue.textContent=v+'%';cityLights.style.opacity=v/100;starsReturn.style.opacity=(100-v)/100}
citySlider.addEventListener('input',cityUpdate);cityUpdate();
document.querySelector('#restoreBtn').addEventListener('click',()=>{citySlider.value=0;cityUpdate()});

document.querySelector('#enterBtn').addEventListener('click',()=>document.querySelector('#earth').scrollIntoView({behavior:'smooth'}));
document.querySelector('#menuBtn').addEventListener('click',()=>{const scenes=[...document.querySelectorAll('.scene')];const y=scrollY+innerHeight*.55;const next=scenes.find(s=>s.offsetTop>y);(next||scenes[0]).scrollIntoView({behavior:'smooth'})});

const sceneLabel=document.querySelector('#sceneLabel'),progressBar=document.querySelector('#progressBar');
const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){const n=e.target.dataset.scene;sceneLabel.textContent=n+' / 08';progressBar.style.width=(+n/8*100)+'%'}}),{threshold:.35});
document.querySelectorAll('.scene').forEach(s=>io.observe(s));

const soundToggle=document.querySelector('#soundToggle');soundToggle.addEventListener('click',()=>{const span=soundToggle.querySelector('span');span.textContent=span.textContent==='OFF'?'ON':'OFF'});
