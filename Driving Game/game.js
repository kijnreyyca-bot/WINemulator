// ============================================================================
//  3D Driving Simulator - world, physics, damage, AI, weather, HUD, menus
//  Loaded after three.min.js, textures.js and car.js.
// ============================================================================

// ---------- seeded RNG ----------
function makeRng(seed){ let s=seed>>>0; return function(){ s=(s+0x6D2B79F5)>>>0; let t=s; t=Math.imul(t^t>>>15, t|1); t^=t+Math.imul(t^t>>>7, t|61); return ((t^t>>>14)>>>0)/4294967296; }; }

// ---------- noise ----------
function hash2(x,z,seed){ const r=makeRng((x*73856093)^(z*19349663)^seed); return r(); }
function smoothstep(t){ return t*t*(3-2*t); }
function valueNoise(x,z,seed){
  const xi=Math.floor(x), zi=Math.floor(z);
  const xf=x-xi, zf=z-zi;
  const a=hash2(xi,zi,seed), b=hash2(xi+1,zi,seed), c=hash2(xi,zi+1,seed), d=hash2(xi+1,zi+1,seed);
  const u=smoothstep(xf), v=smoothstep(zf);
  return a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+d*u*v;
}
function fbm(x,z,seed,oct=4){
  let v=0,amp=1,freq=1,sum=0;
  for(let i=0;i<oct;i++){ v+=valueNoise(x*freq,z*freq,seed+i*1000)*amp; sum+=amp; amp*=0.5; freq*=2; }
  return v/sum;
}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

// ---------- world constants ----------
const CHUNK_SIZE = 120;
const LOAD_RADIUS = 2;
const ROAD_SPACING = 180;
const ROAD_WIDTH = 9;
const ROAD_STEP = 3;          // terrain sampling step along a road, in metres
const DAY_LENGTH = 240;       // seconds for a full day/night cycle

let seed = 12345;

// ---------- persistent settings ----------
const DEFAULT_SETTINGS = {
  units: 'metric',      // 'metric' (km/h, m/km) | 'imperial' (mph, ft/mi)
  hud: true,
  minimap: true,
  fps: false,
  camera: 0,
  damage: 100,          // % of normal collision damage (0 = invulnerable)
  traffic: 10,
  weatherAuto: true,
  weather: 'clear',
  timeFreeze: false,
  time: 0.32
};
let settings = Object.assign({}, DEFAULT_SETTINGS);
try {
  const rawSettings = localStorage.getItem('driving.settings');
  if (rawSettings) settings = Object.assign(settings, JSON.parse(rawSettings));
} catch (e) { /* ignore corrupt settings */ }
function saveSettings(){
  try { localStorage.setItem('driving.settings', JSON.stringify(settings)); } catch (e) {}
}

// ---------- renderer / scene ----------
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9ecae9, 110, 340);

const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 900);
camera.position.set(24, 18, 34);

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
} catch (e) {
  renderer = null;
}
if (!renderer || !renderer.getContext()) {
  const msg = document.createElement('div');
  msg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0b1a2a;color:#fff;font:16px Tahoma;padding:24px;text-align:center;z-index:999;';
  msg.innerHTML = '<div><h2>WebGL not available</h2><p>Your browser/GPU could not create a WebGL context.</p></div>';
  document.body.appendChild(msg);
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.cssText = 'position:fixed;left:0;top:0;z-index:0;display:block;';
document.body.appendChild(renderer.domElement);

// keep the 2D overlays above the 3D canvas without touching the stylesheet
['hud','minimap','seedinfo'].forEach(function(id){
  const el = document.getElementById(id);
  if (el) el.style.zIndex = '2';
});

// ---------- lighting ----------
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(60, 90, 40);
sun.castShadow = true;
sun.shadow.mapSize.width = 1024;
sun.shadow.mapSize.height = 1024;
sun.shadow.camera.left = -75;
sun.shadow.camera.right = 75;
sun.shadow.camera.top = 75;
sun.shadow.camera.bottom = -75;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 320;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.035;
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun);
scene.add(sun.target);

const ambient = new THREE.AmbientLight(0x99aabb, 0.55);
scene.add(ambient);

const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide, fog: false });
const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), skyMat);
scene.add(sky);

// ---------- textures & materials ----------
const TEX = (typeof GameTextures !== 'undefined') ? GameTextures : {};

const grassMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: TEX.grass || null });

if (TEX.road) { TEX.road.repeat.set(1, 1); TEX.road.needsUpdate = true; }
const asphaltMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: TEX.road || null, side: THREE.DoubleSide });
const lineMat = new THREE.MeshLambertMaterial({ color: 0xdedede, side: THREE.DoubleSide });

const trunkMat  = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
const leafMat   = new THREE.MeshLambertMaterial({ color: 0x2d6a2d });
const trimMat   = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
const buildingMats = [
  new THREE.MeshLambertMaterial({ color: 0xffffff, map: TEX.building || null }),
  new THREE.MeshLambertMaterial({ color: 0xd9c9b6, map: TEX.building || null }),
  new THREE.MeshLambertMaterial({ color: 0xc2c2b2, map: TEX.building || null })
];

function terrainHeight(x,z){
  return fbm(x*0.005, z*0.005, seed, 5)*6 + fbm(x*0.02, z*0.02, seed+1, 3)*1.5;
}

// ---------- road network ----------
const roadSegments = [];
const roadNodes = new Map();
const nodeCache = new Map();

function nodePos(i,j){
  const key = i+','+j;
  if (nodeCache.has(key)) return nodeCache.get(key);
  const r = makeRng(seed ^ (i*7919 + j*104729));
  const p = { x: i*ROAD_SPACING + (r()-0.5)*90, z: j*ROAD_SPACING + (r()-0.5)*90 };
  nodeCache.set(key, p);
  return p;
}

function buildRoads(){
  roadSegments.length = 0;
  roadNodes.clear();
  const range = 6;
  for (let i=-range; i<range; i++){
    for (let j=-range; j<range; j++){
      const a = nodePos(i,j), b = nodePos(i+1,j), c = nodePos(i,j+1);
      roadSegments.push({ x1:a.x, z1:a.z, x2:b.x, z2:b.z, type:'asphalt', width:ROAD_WIDTH });
      roadSegments.push({ x1:a.x, z1:a.z, x2:c.x, z2:c.z, type:'asphalt', width:ROAD_WIDTH });
    }
  }
  const keyOf = (x,z) => Math.round(x*10)+','+Math.round(z*10);
  for (const seg of roadSegments){
    [{x:seg.x1,z:seg.z1,end:'a'},{x:seg.x2,z:seg.z2,end:'b'}].forEach(function(pt){
      const k = keyOf(pt.x, pt.z);
      let list = roadNodes.get(k);
      if (!list) { list = []; roadNodes.set(k, list); }
      list.push({ seg: seg, end: pt.end });
    });
  }
}

function isOnRoad(x,z){
  for (const seg of roadSegments){
    const dx = seg.x2-seg.x1, dz = seg.z2-seg.z1;
    const len2 = dx*dx + dz*dz;
    if (len2 === 0) continue;
    let t = ((x-seg.x1)*dx + (z-seg.z1)*dz) / len2;
    t = clamp(t, 0, 1);
    const px = seg.x1 + t*dx, pz = seg.z1 + t*dz;
    if (Math.hypot(x-px, z-pz) < seg.width/2 + 2) return true;
  }
  return false;
}

buildRoads();

// ---------- vehicles available in the garage ----------
const VEHICLES = [
  { name:'Compact',      cls:'Compact',   maxSpeed:42, accel:17, handling:1.10, brake:24, color:0x4cc9f0, dmgResist:1.15 },
  { name:'Sedan',        cls:'Sedan',     maxSpeed:50, accel:16, handling:1.00, brake:23, color:0xe63946, dmgResist:1.00 },
  { name:'Sports Car',   cls:'Sports',    maxSpeed:62, accel:22, handling:1.25, brake:29, color:0xff6b35, dmgResist:0.88 },
  { name:'Supercar',     cls:'Supercar',  maxSpeed:76, accel:27, handling:1.35, brake:33, color:0xf72585, dmgResist:0.80 },
  { name:'Hypercar',     cls:'Hypercar',  maxSpeed:92, accel:33, handling:1.45, brake:37, color:0x7209b7, dmgResist:0.72 },
  { name:'Muscle Car',   cls:'Muscle',    maxSpeed:56, accel:24, handling:0.88, brake:21, color:0xffb703, dmgResist:1.10 },
  { name:'SUV',          cls:'SUV',       maxSpeed:46, accel:14, handling:0.96, brake:22, color:0x2a9d8f, dmgResist:1.25 },
  { name:'Pickup Truck', cls:'Truck',     maxSpeed:44, accel:13, handling:0.92, brake:21, color:0x8d99ae, dmgResist:1.35 },
  { name:'Van',          cls:'Van',       maxSpeed:40, accel:12, handling:0.88, brake:20, color:0xf1f1f1, dmgResist:1.20 },
  { name:'Heavy Truck',  cls:'Heavy',     maxSpeed:32, accel:9,  handling:0.74, brake:19, color:0x495057, dmgResist:1.60 }
];

let selectedVehicle = parseInt(localStorage.getItem('driving.vehicle') || '1', 10);
if (!Number.isFinite(selectedVehicle) || selectedVehicle < 0 || selectedVehicle >= VEHICLES.length) selectedVehicle = 1;

let customCarColor = parseInt(localStorage.getItem('driving.color') || '0', 10);
if (!Number.isFinite(customCarColor) || customCarColor === 0) customCarColor = VEHICLES[selectedVehicle].color;

// ---------- geometry helpers ----------
function pushQuad(P, UV, I, a, b, c, d, uv){
  const base = P.length / 3;
  P.push(a[0],a[1],a[2], b[0],b[1],b[2], c[0],c[1],c[2], d[0],d[1],d[2]);
  UV.push(uv[0],uv[1], uv[2],uv[3], uv[4],uv[5], uv[6],uv[7]);
  I.push(base, base+1, base+2, base, base+2, base+3);
}

// Liang-Barsky: clip a 2D segment against an axis-aligned rectangle.
function clipSegmentRect(x1,z1,x2,z2,xmin,zmin,xmax,zmax){
  let t0 = 0, t1 = 1;
  const dx = x2-x1, dz = z2-z1;
  const p = [-dx, dx, -dz, dz];
  const q = [x1-xmin, xmax-x1, z1-zmin, zmax-z1];
  for (let i=0; i<4; i++){
    if (Math.abs(p[i]) < 1e-9){ if (q[i] < 0) return null; }
    else {
      const r = q[i] / p[i];
      if (p[i] < 0){ if (r > t1) return null; if (r > t0) t0 = r; }
      else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
  }
  return (t1 - t0 > 0.001) ? [t0, t1] : null;
}

// Builds terrain-hugging asphalt strips + dashed centre line for ONE chunk only,
// clipped to the chunk footprint (keeps roads out of each other's chunks).
function buildChunkRoads(cx, cz, group){
  const baseX = cx*CHUNK_SIZE, baseZ = cz*CHUNK_SIZE;
  const xmin = baseX - CHUNK_SIZE/2, xmax = baseX + CHUNK_SIZE/2;
  const zmin = baseZ - CHUNK_SIZE/2, zmax = baseZ + CHUNK_SIZE/2;

  const P=[], UV=[], I=[];
  const LP=[], LUV=[], LI=[];

  for (const seg of roadSegments){
    const clip = clipSegmentRect(seg.x1, seg.z1, seg.x2, seg.z2, xmin, zmin, xmax, zmax);
    if (!clip) continue;
    const dx = seg.x2-seg.x1, dz = seg.z2-seg.z1;
    const L = Math.hypot(dx, dz);
    if (L < 0.5) continue;
    const ux = dx/L, uz = dz/L;          // along
    const nx = -uz, nz = ux;             // across
    const half = seg.width/2;
    const dStart = clip[0]*L, dEnd = clip[1]*L;

    const steps = Math.max(1, Math.ceil((dEnd-dStart)/ROAD_STEP));
    for (let s=0; s<steps; s++){
      const d0 = dStart + (dEnd-dStart)*s/steps;
      const d1 = dStart + (dEnd-dStart)*(s+1)/steps;
      const p0x = seg.x1 + ux*d0, p0z = seg.z1 + uz*d0;
      const p1x = seg.x1 + ux*d1, p1z = seg.z1 + uz*d1;

      const a0 = [p0x + nx*half, terrainHeight(p0x + nx*half, p0z + nz*half) + 0.10, p0z + nz*half];
      const b0 = [p0x - nx*half, terrainHeight(p0x - nx*half, p0z - nz*half) + 0.10, p0z - nz*half];
      const a1 = [p1x + nx*half, terrainHeight(p1x + nx*half, p1z + nz*half) + 0.10, p1z + nz*half];
      const b1 = [p1x - nx*half, terrainHeight(p1x - nx*half, p1z - nz*half) + 0.10, p1z - nz*half];

      pushQuad(P, UV, I, a0, b0, b1, a1, [0, d0/9, 1, d0/9, 1, d1/9, 0, d1/9]);
    }

    // dashed centre line (4 m dash / 5 m gap), only inside this chunk's slice
    for (let d=0; d<L; d+=9){
      const dA = Math.max(d, dStart), dB = Math.min(d+4, dEnd);
      if (dB - dA < 0.4) continue;
      const e0x = seg.x1 + ux*dA, e0z = seg.z1 + uz*dA;
      const e1x = seg.x1 + ux*dB, e1z = seg.z1 + uz*dB;
      const w = 0.11;
      pushQuad(LP, LUV, LI,
        [e0x + nx*w, terrainHeight(e0x + nx*w, e0z + nz*w) + 0.16, e0z + nz*w],
        [e0x - nx*w, terrainHeight(e0x - nx*w, e0z - nz*w) + 0.16, e0z - nz*w],
        [e1x - nx*w, terrainHeight(e1x - nx*w, e1z - nz*w) + 0.16, e1z - nz*w],
        [e1x + nx*w, terrainHeight(e1x + nx*w, e1z + nz*w) + 0.16, e1z + nz*w],
        [0,0, 1,0, 1,1, 0,1]);
    }
  }

  if (I.length){
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    g.setIndex(I);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, asphaltMat);
    m.receiveShadow = true;
    group.add(m);
  }
  if (LI.length){
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(LP, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(LUV, 2));
    g.setIndex(LI);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, lineMat);
    group.add(m);
  }
}

// ---------- chunks ----------
const chunks = new Map();
const chunkColliders = new Map();
function chunkKey(cx,cz){ return cx+','+cz; }

function createChunk(cx,cz){
  const group = new THREE.Group();
  const baseX = cx*CHUNK_SIZE;
  const baseZ = cz*CHUNK_SIZE;
  const rng = makeRng(seed ^ (cx*92821 + cz*68917));
  const colliders = [];

  // terrain
  const tgeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 20, 20);
  const tpos = tgeo.attributes.position;
  for (let i=0;i<tpos.count;i++){
    const wx = tpos.getX(i) + baseX;
    const wz = -tpos.getY(i) + baseZ;
    tpos.setZ(i, terrainHeight(wx, wz));
  }
  tgeo.computeVertexNormals();
  const terrain = new THREE.Mesh(tgeo, grassMat);
  terrain.rotation.x = -Math.PI/2;
  terrain.position.set(baseX, 0, baseZ);
  terrain.receiveShadow = true;
  group.add(terrain);

  // roads (clipped, terrain-following)
  buildChunkRoads(cx, cz, group);

  // trees
  const treePositions = [];
  for (let t=0; t<15; t++){
    const lx = (rng()-0.5)*CHUNK_SIZE, lz = (rng()-0.5)*CHUNK_SIZE;
    const wx = baseX + lx, wz = baseZ + lz;
    if (isOnRoad(wx, wz)) continue;
    if (Math.hypot(wx, wz) < 9) continue;          // keep the spawn point clear
    const h = terrainHeight(wx, wz);
    treePositions.push({ x:wx, y:h, z:wz, s:0.8 + rng()*0.7 });
    colliders.push({
      min: new THREE.Vector3(wx-0.6, h, wz-0.6),
      max: new THREE.Vector3(wx+0.6, h+5, wz+0.6),
      type: 'tree'
    });
  }
  if (treePositions.length){
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2.5, 6);
    const leafGeo  = new THREE.SphereGeometry(1.8, 8, 6);
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
    const leafInst  = new THREE.InstancedMesh(leafGeo, leafMat, treePositions.length);
    const dummy = new THREE.Object3D();
    treePositions.forEach(function(p,i){
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(p.x, p.y+1.25*p.s, p.z);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);
      dummy.position.set(p.x, p.y+4.0*p.s, p.z);
      dummy.updateMatrix();
      leafInst.setMatrixAt(i, dummy.matrix);
    });
    trunkInst.instanceMatrix.needsUpdate = true;
    leafInst.instanceMatrix.needsUpdate = true;
    trunkInst.castShadow = true;
    leafInst.castShadow = true;
    group.add(trunkInst, leafInst);
  }

  // buildings
  if (rng() < 0.4){
    const numB = 1 + Math.floor(rng()*3);
    for (let b=0; b<numB; b++){
      const bx = baseX + (rng()-0.5)*70;
      const bz = baseZ + (rng()-0.5)*70;
      if (isOnRoad(bx, bz)) continue;
      if (Math.hypot(bx, bz) < 16) continue;       // keep the spawn point clear
      const h = 6 + rng()*14;
      const w = 5 + rng()*6;
      const d = 5 + rng()*6;
      const by = terrainHeight(bx, bz) + h/2;
      const mat = buildingMats[Math.floor(rng()*buildingMats.length)];

      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      bMesh.position.set(bx, by, bz);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      group.add(bMesh);

      const cornice = new THREE.Mesh(new THREE.BoxGeometry(w+0.4, 0.4, d+0.4), trimMat);
      cornice.position.set(bx, by + h/2 + 0.2, bz);
      cornice.castShadow = true;
      group.add(cornice);

      const awning = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 1.2), trimMat);
      awning.position.set(bx, by - h/2 + 1.5, bz + d/2 + 0.5);
      group.add(awning);

      colliders.push({
        min: new THREE.Vector3(bx-w/2, by-h/2, bz-d/2),
        max: new THREE.Vector3(bx+w/2, by+h/2, bz+d/2),
        type: 'building'
      });
    }
  }

  scene.add(group);
  chunks.set(chunkKey(cx,cz), group);
  chunkColliders.set(chunkKey(cx,cz), colliders);
  return group;
}

function removeChunk(cx,cz){
  const key = chunkKey(cx,cz);
  const g = chunks.get(key);
  if (!g) return;
  scene.remove(g);
  g.traverse(function(o){
    if (o.isMesh || o.isInstancedMesh){
      if (o.geometry) o.geometry.dispose();
    }
  });
  chunks.delete(key);
  chunkColliders.delete(key);
}

const activeColliders = [];
function rebuildColliders(){
  activeColliders.length = 0;
  for (const list of chunkColliders.values()) activeColliders.push.apply(activeColliders, list);
}

let lastChunkCx = null, lastChunkCz = null;
function updateChunks(px, pz, force){
  const cx = Math.floor(px/CHUNK_SIZE);
  const cz = Math.floor(pz/CHUNK_SIZE);
  if (!force && cx === lastChunkCx && cz === lastChunkCz) return;
  lastChunkCx = cx; lastChunkCz = cz;

  const needed = new Set();
  for (let dx=-LOAD_RADIUS; dx<=LOAD_RADIUS; dx++)
    for (let dz=-LOAD_RADIUS; dz<=LOAD_RADIUS; dz++)
      needed.add(chunkKey(cx+dx, cz+dz));

  for (const key of needed){
    if (!chunks.has(key)){
      const parts = key.split(',');
      createChunk(Number(parts[0]), Number(parts[1]));
    }
  }
  for (const key of Array.from(chunks.keys())){
    if (!needed.has(key)){
      const parts = key.split(',');
      removeChunk(Number(parts[0]), Number(parts[1]));
    }
  }
  rebuildColliders();
}

// ---------- player car ----------
let carObj = buildCar(customCarColor);
let car = carObj.group;
let wheels = carObj.wheels;
if (wheels[0]) wheels[0].rotation.order = 'YXZ';
if (wheels[1]) wheels[1].rotation.order = 'YXZ';
scene.add(car);

// headlights (L toggles, and they are forced on after dark)
const headlightGroup = new THREE.Group();
const spotLightL = new THREE.SpotLight(0xfff3d0, 2.2, 55, Math.PI/5.5, 0.45, 1.2);
const spotLightR = new THREE.SpotLight(0xfff3d0, 2.2, 55, Math.PI/5.5, 0.45, 1.2);
spotLightL.position.set(0.7, 0.75, 2.1);
spotLightR.position.set(-0.7, 0.75, 2.1);
spotLightL.target.position.set(0.7, -0.4, 18);
spotLightR.target.position.set(-0.7, -0.4, 18);
headlightGroup.add(spotLightL, spotLightR, spotLightL.target, spotLightR.target);
headlightGroup.visible = false;
car.add(headlightGroup);
let headlightsOn = false;

// ---------- game state ----------
const state = {
  x: 0, z: 0, yaw: 0, driftAngle: 0, speed: 0, steer: 0,
  gear: 1, rpm: 0.2, handbrake: false, cameraMode: 0,
  damage: 0, distance: 0, destroyed: false, destroying: false, destroyTimer: 0,
  nitro: 100, nitroCooldown: 0, nitroBoost: 0,
  collisionGrace: 0, time: 0, wetGrip: 1
};

// ---------- traffic ----------
const traffic = [];
const TRAFFIC_MAX = 24;
const trafficColors = [0x4cc9f0, 0xffb703, 0x2a9d8f, 0x7209b7, 0xf72585, 0x8d99ae, 0xe63946];

function buildTrafficCar(color){
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.7, 4.0),
    new THREE.MeshLambertMaterial({ color: color })
  );
  body.position.y = 0.6;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.6, 1.9),
    new THREE.MeshLambertMaterial({ color: 0x1b2430 })
  );
  cabin.position.set(0, 1.18, -0.1);
  cabin.castShadow = true;
  group.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.24, 10);
  wheelGeo.rotateZ(Math.PI/2);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheels = [];
  [[-0.98,1.35],[0.98,1.35],[-0.98,-1.35],[0.98,-1.35]].forEach(function(pos){
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(pos[0], 0.35, pos[1]);
    group.add(w);
    wheels.push(w);
  });

  return { group: group, wheels: wheels };
}

function orientedPath(seg, atStart){
  if (atStart) return { x1:seg.x1, z1:seg.z1, x2:seg.x2, z2:seg.z2 };
  return { x1:seg.x2, z1:seg.z2, x2:seg.x1, z2:seg.z1 };
}

function spawnTraffic(){
  for (const tr of traffic) scene.remove(tr.group);
  traffic.length = 0;
  if (!roadSegments.length) return;

  const rng = makeRng(seed + 999);
  const wanted = clamp(Math.round(settings.traffic), 0, TRAFFIC_MAX);
  let guard = 0;
  while (traffic.length < wanted && guard++ < 400){
    const seg = roadSegments[Math.floor(rng()*roadSegments.length)];
    const t = 0.15 + rng()*0.7;
    const x = seg.x1 + (seg.x2-seg.x1)*t;
    const z = seg.z1 + (seg.z2-seg.z1)*t;
    if (Math.hypot(x, z) < 40) continue;          // never spawn on top of the player

    const color = trafficColors[Math.floor(rng()*trafficColors.length)];
    const obj = buildTrafficCar(color);
    const path = orientedPath(seg, rng() < 0.5);
    obj.group.position.set(x, terrainHeight(x,z) + 0.05, z);
    obj.group.rotation.y = Math.atan2(path.x2-path.x1, path.z2-path.z1);
    scene.add(obj.group);

    const kind = rng();
    const cruise = kind < 0.3 ? 11 : kind < 0.75 ? 17 : 24;
    traffic.push({
      group: obj.group, wheels: obj.wheels, path: path,
      t: t, cruise: cruise, speed: cruise,
      hitAt: -99
    });
  }
}

function nextTrafficPath(path){
  const key = Math.round(path.x2*10) + ',' + Math.round(path.z2*10);
  const list = roadNodes.get(key) || [];
  const options = [];
  for (const node of list){
    if (node.seg.x1 === path.x1 && node.seg.z1 === path.z1 &&
        node.seg.x2 === path.x2 && node.seg.z2 === path.z2) continue;
    let p;
    if (node.end === 'a') p = { x1:node.seg.x1, z1:node.seg.z1, x2:node.seg.x2, z2:node.seg.z2 };
    else p = { x1:node.seg.x2, z1:node.seg.z2, x2:node.seg.x1, z2:node.seg.z1 };
    options.push(p);
  }
  if (!options.length) return null;
  // prefer going straight-ish
  const hx = path.x2-path.x1, hz = path.z2-path.z1;
  let best = null, bestDot = -2;
  for (const p of options){
    const dx = p.x2-p.x1, dz = p.z2-p.z1;
    const l = Math.hypot(dx,dz) || 1;
    const dot = (dx/l)*(hx/(Math.hypot(hx,hz)||1)) + (dz/l)*(hz/(Math.hypot(hx,hz)||1));
    if (dot > bestDot){ bestDot = dot; best = p; }
  }
  if (bestDot < -0.5 && Math.random() < 0.7) return options[Math.floor(Math.random()*options.length)];
  return best;
}

function updateTraffic(dt){
  for (const tr of traffic){
    const p = tr.path;
    const dx = p.x2-p.x1, dz = p.z2-p.z1;
    const len = Math.hypot(dx, dz);
    if (len < 1) continue;

    // brake for the player and for cars directly ahead
    let target = tr.cruise;
    const px = car.position.x - tr.group.position.x;
    const pz = car.position.z - tr.group.position.z;
    const pdist = Math.hypot(px, pz);
    if (pdist < 20){
      const fx = dx/len, fz = dz/len;
      if (px*fx + pz*fz > 0) target = Math.min(target, pdist < 9 ? 2 : 8);
    }
    for (const other of traffic){
      if (other === tr) continue;
      const ox = other.group.position.x - tr.group.position.x;
      const oz = other.group.position.z - tr.group.position.z;
      const od = Math.hypot(ox, oz);
      if (od < 11){
        const fx = dx/len, fz = dz/len;
        if (ox*fx + oz*fz > 0) target = Math.min(target, other.speed*0.7);
      }
    }

    tr.speed += (target - tr.speed) * Math.min(1, dt*2.2);
    tr.t += (tr.speed*dt) / len;
    if (tr.t >= 1){
      const next = nextTrafficPath(p);
      if (next){ tr.path = next; tr.t = 0; continue; }
      tr.t = 0;
    }

    const x = p.x1 + dx*tr.t;
    const z = p.z1 + dz*tr.t;
    tr.group.position.set(x, terrainHeight(x,z) + 0.05, z);
    tr.group.rotation.y = Math.atan2(dx, dz);
    for (const w of tr.wheels) w.rotation.x += tr.speed*dt*2;
  }
}

// ---------- particles ----------
const smokeParticles = [];
const smokeGeo = new THREE.SphereGeometry(0.35, 6, 6);   // shared, never disposed
const SMOKE_MAX = 220;

function spawnSmoke(pos, intensity){
  if (smokeParticles.length >= SMOKE_MAX) return;
  const count = Math.max(1, Math.ceil((intensity || 1) * 2));
  for (let i=0; i<count; i++){
    if (smokeParticles.length >= SMOKE_MAX) break;
    const mat = new THREE.MeshBasicMaterial({
      color: 0x9a9a9a, transparent: true,
      opacity: 0.45 * clamp(intensity || 1, 0.3, 1.4)
    });
    const mesh = new THREE.Mesh(smokeGeo, mat);
    mesh.position.copy(pos);
    mesh.position.x += (Math.random()-0.5)*0.8;
    mesh.position.y += (Math.random()-0.5)*0.4;
    mesh.position.z += (Math.random()-0.5)*0.8;
    scene.add(mesh);
    smokeParticles.push({
      mesh: mesh,
      vel: new THREE.Vector3((Math.random()-0.5)*1.1, 1.4 + Math.random()*1.3, (Math.random()-0.5)*1.1),
      life: 0, maxLife: 1.1 + Math.random()*0.8, baseOpacity: mat.opacity
    });
  }
}

function updateSmoke(dt){
  for (let i=smokeParticles.length-1; i>=0; i--){
    const p = smokeParticles[i];
    p.life += dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.vel.y += 0.9*dt;
    p.vel.multiplyScalar(0.985);
    const t = p.life / p.maxLife;
    p.mesh.material.opacity = p.baseOpacity * (1 - t);
    p.mesh.scale.setScalar(1 + t*2.4);
    if (p.life >= p.maxLife){
      scene.remove(p.mesh);
      p.mesh.material.dispose();
      smokeParticles.splice(i, 1);
    }
  }
}

const explosionParticles = [];
const expGeo = new THREE.SphereGeometry(0.45, 6, 6);

function spawnExplosion(pos){
  for (let i=0; i<46; i++){
    const mat = new THREE.MeshBasicMaterial({
      color: Math.random() < 0.5 ? 0xff6a00 : 0xffc400,
      transparent: true, opacity: 1
    });
    const mesh = new THREE.Mesh(expGeo, mat);
    mesh.position.copy(pos);
    mesh.position.y += 0.8;
    scene.add(mesh);
    explosionParticles.push({
      mesh: mesh,
      vel: new THREE.Vector3((Math.random()-0.5)*11, Math.random()*7+3, (Math.random()-0.5)*11),
      life: 0, maxLife: 0.9 + Math.random()*0.7
    });
  }
  spawnSmoke(pos, 3);
}

function updateExplosion(dt){
  for (let i=explosionParticles.length-1; i>=0; i--){
    const p = explosionParticles[i];
    p.life += dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.vel.y -= 9*dt;
    p.vel.multiplyScalar(0.97);
    const t = p.life / p.maxLife;
    p.mesh.material.opacity = 1 - t;
    p.mesh.scale.setScalar(1 + t*3);
    if (p.life >= p.maxLife){
      scene.remove(p.mesh);
      p.mesh.material.dispose();
      explosionParticles.splice(i, 1);
    }
  }
}

function clearParticles(){
  for (const p of smokeParticles){ scene.remove(p.mesh); p.mesh.material.dispose(); }
  smokeParticles.length = 0;
  for (const p of explosionParticles){ scene.remove(p.mesh); p.mesh.material.dispose(); }
  explosionParticles.length = 0;
}

// ---------- input ----------
const keys = {};
let paused = false;

const ACTIONS = [
  { id:'throttle',   label:'Accelerate',      alt:'Arrow up' },
  { id:'brake',      label:'Brake / Reverse', alt:'Arrow down' },
  { id:'left',       label:'Steer left',      alt:'Arrow left' },
  { id:'right',      label:'Steer right',     alt:'Arrow right' },
  { id:'handbrake',  label:'Handbrake',       alt:'' },
  { id:'nitro',      label:'Nitro',           alt:'' },
  { id:'reset',      label:'Reset car',       alt:'' },
  { id:'camera',     label:'Change camera',   alt:'' },
  { id:'weather',    label:'Cycle weather',   alt:'' },
  { id:'headlights', label:'Headlights',      alt:'' },
  { id:'pause',      label:'Pause',           alt:'Esc always works' }
];

const DEFAULT_BINDS = {
  throttle:'w', brake:'s', left:'a', right:'d', handbrake:'space',
  nitro:'n', reset:'r', camera:'c', weather:'v', headlights:'l', pause:'p'
};

const KEY_ALTS = { throttle:'arrowup', brake:'arrowdown', left:'arrowleft', right:'arrowright' };
const KEY_NAMES = {
  space:'Space', escape:'Esc', arrowup:'↑', arrowdown:'↓', arrowleft:'←', arrowright:'→',
  control:'Ctrl', shift:'Shift', alt:'Alt', tab:'Tab', enter:'Enter', backspace:'Backspace'
};

let binds = Object.assign({}, DEFAULT_BINDS);
try {
  const rawBinds = localStorage.getItem('driving.binds');
  if (rawBinds) binds = Object.assign(binds, JSON.parse(rawBinds));
} catch (e) { /* ignore corrupt binds */ }
function saveBinds(){
  try { localStorage.setItem('driving.binds', JSON.stringify(binds)); } catch (e) {}
}

let rebinding = null;

function normKey(k){
  if (k === ' ' || k === 'Spacebar') return 'space';
  return String(k).toLowerCase();
}
function keyLabel(k){
  if (KEY_NAMES[k]) return KEY_NAMES[k];
  return k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1);
}
function keyDown(action){
  if (keys[binds[action]]) return true;
  const alt = KEY_ALTS[action];
  return alt ? !!keys[alt] : false;
}
function assignBind(action, key){
  for (const other in binds){
    if (other !== action && binds[other] === key) binds[other] = binds[action];
  }
  binds[action] = key;
  saveBinds();
}

window.addEventListener('keydown', function(e){
  const k = normKey(e.key);
  const tag = e.target && e.target.tagName;
  const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';

  if (rebinding){
    e.preventDefault();
    if (k !== 'escape') assignBind(rebinding, k);
    rebinding = null;
    refreshPauseUI();
    return;
  }

  if (running && !typing && (k === 'escape' || k === binds.pause)){
    e.preventDefault();
    togglePause();
    return;
  }
  if (running && k === 'escape' && typing){
    e.preventDefault();
    togglePause();
    return;
  }

  if (paused || !running || typing) return;

  keys[k] = true;
  if (k === binds.handbrake) e.preventDefault();

  if (k === binds.reset) resetCar();
  if (k === binds.camera){
    state.cameraMode = (state.cameraMode + 1) % 4;
    settings.camera = state.cameraMode;
    saveSettings();
  }
  if (k === binds.headlights) headlightsOn = !headlightsOn;
  if (k === binds.weather){
    settings.weatherAuto = false;
    settings.weather = nextWeather(weather);
    saveSettings();
    setWeather(settings.weather);
  }
  if (k === binds.nitro && state.nitro >= 12 && state.nitroCooldown <= 0 && !state.destroyed){
    state.nitroBoost = 2.0;
    state.nitroCooldown = 3.5;
    state.nitro = Math.max(0, state.nitro - 12);
  }
});

window.addEventListener('keyup', function(e){
  keys[normKey(e.key)] = false;
});

window.addEventListener('blur', function(){
  for (const k in keys) keys[k] = false;
  state.handbrake = false;
});

// ---------- damage helpers ----------
function damageLabel(d){
  if (d < 10) return 'Pristine';
  if (d < 25) return 'Light';
  if (d < 50) return 'Moderate';
  if (d < 70) return 'Heavy';
  if (d < 90) return 'Critical';
  if (d < 100) return 'Near destruction';
  return 'Destroyed';
}

function smokeLabel(d){
  if (d < 25) return 'None';
  if (d < 50) return 'Occasional';
  if (d < 70) return 'Continuous';
  if (d < 90) return 'Thick';
  return 'Dense';
}

function enginePosition(){
  const off = new THREE.Vector3(0, 1.15, 1.45).applyAxisAngle(new THREE.Vector3(0,1,0), state.yaw);
  return car.position.clone().add(off);
}

function applyDamage(impactSpeed, multiplier){
  const v = VEHICLES[selectedVehicle];
  let base;
  if (impactSpeed < 8)       base = 2 + Math.random()*4;      // 2 - 5
  else if (impactSpeed < 18) base = 6 + Math.random()*7;      // 6 - 12
  else if (impactSpeed < 30) base = 13 + Math.random()*13;    // 13 - 25
  else                       base = 26 + Math.random()*15;    // 26 - 40

  const scale = (settings.damage / 100) * (multiplier || 1);
  if (scale <= 0) return;

  const dmg = Math.max(1, Math.round(base * scale / v.dmgResist));
  state.damage = Math.min(100, state.damage + dmg);
  spawnSmoke(enginePosition(), clamp(state.damage/70, 0.6, 2));

  if (state.damage >= 100) triggerDestroyed();
}

function triggerDestroyed(){
  if (state.destroying || state.destroyed) return;
  state.destroying = true;
  state.destroyed = true;
  state.speed = 0;
  state.driftAngle = state.yaw;
  spawnExplosion(car.position.clone());
  const overlay = document.getElementById('destroyed');
  if (overlay) overlay.style.display = 'flex';
  car.visible = false;
  state.destroyTimer = 3;
}

// ---------- physics ----------
function updatePhysics(dt){
  if (state.destroying || state.destroyed) return;

  const v = VEHICLES[selectedVehicle];
  const dmgFactor = 1 - (state.damage/100)*0.55;
  const maxSpeed = Math.max(8, v.maxSpeed * dmgFactor);
  const accel = v.accel * dmgFactor;

  const throttle = keyDown('throttle') ? 1 : 0;
  const brakeInput = keyDown('brake') ? 1 : 0;
  const steerInput = (keyDown('left') ? 1 : 0) - (keyDown('right') ? 1 : 0);
  state.handbrake = keyDown('handbrake');

  state.wetGrip = (weather === 'rain' || weather === 'storm') ? 0.72 : 1.0;

  // nitro
  if (state.nitroBoost > 0){
    state.nitroBoost = Math.max(0, state.nitroBoost - dt);
    state.nitro = Math.max(0, state.nitro - 26*dt);
  } else if (state.nitroCooldown <= 0){
    state.nitro = Math.min(100, state.nitro + 7*dt);
  }
  state.nitroCooldown = Math.max(0, state.nitroCooldown - dt);
  const boost = state.nitroBoost > 0 ? 2.1 : 1.0;

  // steering with speed sensitive feel
  const speedRatio = clamp(Math.abs(state.speed) / Math.max(1, maxSpeed), 0, 1);
  const steerTarget = steerInput * v.handling * 3.0;
  state.steer += (steerTarget - state.steer) * Math.min(1, dt*9);

  if (throttle){
    if (state.speed >= 0) state.speed += accel * boost * dt * (1 - speedRatio*0.85);
    else state.speed += v.brake * dt;
  }
  if (brakeInput){
    if (state.speed > 0.2) state.speed -= v.brake * dt;
    else state.speed -= accel * 0.6 * dt * (1 - Math.abs(state.speed)/14);
  }
  if (!throttle && !brakeInput){
    const roll = state.handbrake ? 13 : 3.4;
    state.speed -= Math.sign(state.speed) * roll * dt;
    if (Math.abs(state.speed) < 0.35) state.speed = 0;
  }
  if (state.speed > maxSpeed) state.speed = Math.max(maxSpeed, state.speed - 12*dt);
  if (state.speed < -14) state.speed = -14;

  // heading + drift
  const grip = state.wetGrip;
  const yawRate = state.steer * (0.25 + speedRatio*2.1) * grip * (state.speed >= 0 ? 1 : -1);
  state.yaw += yawRate * dt;

  const slideSpeed = state.handbrake ? 2.2 : 9.0 - (1-grip)*3.5;
  state.driftAngle += (state.yaw - state.driftAngle) * Math.min(1, dt*slideSpeed);

  const fwd = new THREE.Vector3(Math.sin(state.driftAngle), 0, Math.cos(state.driftAngle));
  const nx = car.position.x + fwd.x * state.speed * dt;
  const nz = car.position.z + fwd.z * state.speed * dt;

  state.collisionGrace = Math.max(0, state.collisionGrace - dt);
  state.time += dt;

  // oriented-ish bounding box for the collision test
  const s = Math.abs(Math.sin(state.yaw)), c = Math.abs(Math.cos(state.yaw));
  const ex = 1.05*c + 2.15*s;
  const ez = 1.05*s + 2.15*c;
  let collided = false;

  for (const col of activeColliders){
    if (nx-ex < col.max.x && nx+ex > col.min.x && nz-ez < col.max.z && nz+ez > col.min.z){
      collided = true;
      // per-object memory: the same object cannot damage the car twice within 2 s
      if (state.collisionGrace <= 0 && (col._hitAt === undefined || state.time - col._hitAt > 2)){
        col._hitAt = state.time;
        applyDamage(Math.abs(state.speed), 1);
      }
      break;
    }
  }

  // traffic collisions
  if (!collided){
    for (const tr of traffic){
      const dx = tr.group.position.x - nx, dz = tr.group.position.z - nz;
      const d = Math.hypot(dx, dz);
      if (d < 2.7){
        const rel = Math.abs(state.speed) + tr.speed*0.3;
        if (rel > 5 && (tr.hitAt < 0 || state.time - tr.hitAt > 2)){
          tr.hitAt = state.time;
          applyDamage(rel, 0.6);
        }
        collided = true;
        break;
      }
    }
  }

  if (collided){
    state.speed *= -0.28;
    state.collisionGrace = 0.45;
  } else {
    car.position.x = nx;
    car.position.z = nz;
  }

  car.position.y = terrainHeight(car.position.x, car.position.z) + 0.03;
  car.rotation.y = state.yaw;
  car.rotation.z = -state.steer * 0.07 * (0.3 + speedRatio);
  car.rotation.x = (throttle ? -0.012 : 0) + (brakeInput && state.speed > 1 ? 0.02 : 0);

  if (wheels[0]) wheels[0].rotation.y = state.steer * 0.42;
  if (wheels[1]) wheels[1].rotation.y = state.steer * 0.42;
  for (const w of wheels) w.rotation.x += state.speed * dt * 2.4;

  state.rpm = clamp(0.14 + speedRatio*0.78 + (throttle ? 0.08 : 0), 0.1, 1);
  state.gear = clamp(Math.floor(speedRatio*6) + 1, 1, 6);
  state.distance += Math.abs(state.speed) * dt;

  // continuous damage smoke
  if (state.damage >= 25 && Math.random() < (0.06 + state.damage/100*0.28)){
    spawnSmoke(enginePosition(), clamp(state.damage/80, 0.5, 1.6));
  }
  // handbrake tyre smoke
  if (state.handbrake && Math.abs(state.speed) > 9 && Math.random() < 0.5){
    spawnSmoke(new THREE.Vector3(car.position.x, car.position.y + 0.2, car.position.z), 0.8);
  }
}

function resetCar(){
  state.x = 0; state.z = 0; state.yaw = 0; state.driftAngle = 0;
  state.speed = 0; state.steer = 0; state.gear = 1; state.rpm = 0.2;
  state.handbrake = false; state.damage = 0; state.distance = 0;
  state.destroyed = false; state.destroying = false; state.destroyTimer = 0;
  state.nitro = 100; state.nitroCooldown = 0; state.nitroBoost = 0;
  state.collisionGrace = 0;

  car.position.set(0, terrainHeight(0,0) + 0.03, 0);
  car.rotation.set(0, 0, 0);
  car.visible = true;
  headlightsOn = false;

  clearParticles();
  const overlay = document.getElementById('destroyed');
  if (overlay) overlay.style.display = 'none';

  updateChunks(0, 0, true);
  snapCamera();
}

// ---------- weather / day-night ----------
let weather = 'clear';
let weatherTimer = 45;
let timeOfDay = 0.32;
let flashTimer = 0;

const WEATHERS = ['clear','clear','rain','fog','storm'];
const WEATHER_NAMES = { clear:'Clear', rain:'Rain', fog:'Fog', storm:'Storm' };
const skyDay = new THREE.Color(0x86c9ea);
const skyNight = new THREE.Color(0x070f22);
const skyDusk = new THREE.Color(0xd77a48);
const fogTint = new THREE.Color(0xb8c3cb);
const flashTint = new THREE.Color(0xffffff);
const skyNow = new THREE.Color();

function nextWeather(current){
  let w = current;
  for (let i=0; i<8 && w === current; i++) w = WEATHERS[Math.floor(Math.random()*WEATHERS.length)];
  return w;
}

function setWeather(w){
  weather = w;
  const el = document.querySelector('.weather');
  if (el) el.textContent = WEATHER_NAMES[w] || w;
}

// rain particles (positions are local to the car)
const RAIN_COUNT = 1500;
const rainGeo = new THREE.BufferGeometry();
const rainPositions = new Float32Array(RAIN_COUNT*3);
for (let i=0; i<RAIN_COUNT; i++){
  rainPositions[i*3]   = (Math.random()-0.5)*180;
  rainPositions[i*3+1] = Math.random()*55;
  rainPositions[i*3+2] = (Math.random()-0.5)*180;
}
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
const rainMat = new THREE.PointsMaterial({ color: 0xaecbe8, size: 0.22, transparent: true, opacity: 0.6, depthWrite: false });
const rain = new THREE.Points(rainGeo, rainMat);
rain.frustumCulled = false;
rain.visible = false;
scene.add(rain);

function updateWeather(dt){
  if (settings.weatherAuto){
    weatherTimer -= dt;
    if (weatherTimer <= 0){
      setWeather(nextWeather(weather));
      weatherTimer = 45 + Math.random()*45;
    }
  } else if (weather !== settings.weather){
    setWeather(settings.weather);
  }

  if (!settings.timeFreeze) timeOfDay = (timeOfDay + dt/DAY_LENGTH) % 1;
  const ang = (timeOfDay - 0.25) * Math.PI * 2;
  const elev = Math.sin(ang);
  const dayF = clamp((elev + 0.12)/0.45, 0, 1);

  skyNow.copy(skyNight).lerp(skyDay, dayF);
  if (elev > -0.3 && elev < 0.32){
    const dusk = 1 - Math.min(1, Math.abs(elev - 0.02)/0.24);
    skyNow.lerp(skyDusk, dusk*0.55);
  }
  if (weather === 'storm') skyNow.multiplyScalar(0.62);
  else if (weather === 'rain') skyNow.multiplyScalar(0.82);
  else if (weather === 'fog') skyNow.lerp(fogTint, 0.55);

  if (flashTimer > 0){
    flashTimer -= dt;
    sun.intensity = 2.4;
    skyNow.lerp(flashTint, 0.55);
  } else {
    sun.intensity = 0.06 + Math.max(0, elev)*1.0;
    if (weather === 'storm' && Math.random() < dt*0.12) flashTimer = 0.14;
  }

  skyMat.color.copy(skyNow);
  scene.fog.color.copy(skyNow);

  const target = weather === 'fog' ? [25,110] :
                 weather === 'storm' ? [50,175] :
                 weather === 'rain' ? [70,225] : [100,290];
  const k = Math.min(1, dt*1.5);
  scene.fog.near += (target[0] - scene.fog.near)*k;
  scene.fog.far  += (target[1] - scene.fog.far )*k;

  ambient.intensity = 0.22 + dayF*0.42;

  sun.position.set(
    car.position.x + Math.cos(ang)*95,
    car.position.y + Math.max(8, elev*130),
    car.position.z + 55
  );
  sun.target.position.copy(car.position);
  sun.target.updateMatrixWorld();

  headlightGroup.visible = headlightsOn || elev < -0.02;

  const wet = (weather === 'rain' || weather === 'storm');
  rain.visible = wet;
  if (wet){
    const fall = (weather === 'storm' ? 55 : 42) * dt;
    for (let i=0; i<RAIN_COUNT; i++){
      rainPositions[i*3+1] -= fall;
      if (rainPositions[i*3+1] < 0){
        rainPositions[i*3+1] = 45 + Math.random()*15;
        rainPositions[i*3]   = (Math.random()-0.5)*180;
        rainPositions[i*3+2] = (Math.random()-0.5)*180;
      }
    }
    rainGeo.attributes.position.needsUpdate = true;
    rain.position.copy(car.position);
  }
}

function clockString(){
  const total = timeOfDay*24*60;
  const h = Math.floor(total/60) % 24;
  const m = Math.floor(total % 60);
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

// ---------- camera ----------
let orbitAngle = 0;

function cameraPose(mode, speedRatio){
  const fwd = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));

  if (mode === 2){                       // bonnet / first person
    const pos = car.position.clone().addScaledVector(fwd, 0.25).add(new THREE.Vector3(0, 1.72, 0));
    const look = pos.clone().addScaledVector(fwd, 25).add(new THREE.Vector3(0, -0.55, 0));
    return { pos: pos, look: look, snap: true };
  }
  if (mode === 3){                       // orbit
    const pos = car.position.clone().add(new THREE.Vector3(Math.sin(orbitAngle)*16, 9, Math.cos(orbitAngle)*16));
    const look = car.position.clone().add(new THREE.Vector3(0, 1.1, 0));
    return { pos: pos, look: look, snap: false };
  }
  const chase = mode === 0;
  const dist = chase ? 9.5 + speedRatio*4.0 : 6.4 + speedRatio*2.0;
  const height = chase ? 4.2 + speedRatio*0.8 : 2.9;
  const pos = car.position.clone().addScaledVector(fwd, -dist).add(new THREE.Vector3(0, height, 0));
  const look = car.position.clone().addScaledVector(fwd, 3.0).add(new THREE.Vector3(0, 1.15, 0));
  return { pos: pos, look: look, snap: false };
}

function snapCamera(){
  const pose = cameraPose(state.cameraMode, 0);
  camera.position.copy(pose.pos);
  camera.lookAt(pose.look);
}

function updateCamera(dt){
  orbitAngle += dt*0.25;
  const v = VEHICLES[selectedVehicle];
  const speedRatio = clamp(Math.abs(state.speed) / Math.max(1, v.maxSpeed), 0, 1);
  const pose = cameraPose(state.cameraMode, speedRatio);

  camera.position.lerp(pose.pos, 1 - Math.exp(-dt * (pose.snap ? 24 : 7)));
  const groundY = terrainHeight(camera.position.x, camera.position.z) + 0.9;
  if (camera.position.y < groundY) camera.position.y = groundY;
  camera.lookAt(pose.look);
}

// ---------- HUD ----------
function unitSpeedLabel(){ return settings.units === 'imperial' ? 'mph' : 'km/h'; }
function formatSpeed(mps){ return settings.units === 'imperial' ? Math.round(mps*2.236936) : Math.round(mps*3.6); }
function formatDistance(m){
  if (settings.units === 'imperial'){
    return m >= 1609.344 ? (m/1609.344).toFixed(2) + ' mi' : Math.round(m*3.28084) + ' ft';
  }
  return m >= 1000 ? (m/1000).toFixed(2) + ' km' : Math.round(m) + ' m';
}

function updateHUD(){
  const v = VEHICLES[selectedVehicle];

  const elSpeed = document.querySelector('.speed');
  if (elSpeed) elSpeed.textContent = formatSpeed(Math.abs(state.speed)) + ' ' + unitSpeedLabel();

  const fill = document.querySelector('.speedfill');
  if (fill) fill.style.width = clamp(Math.abs(state.speed)/Math.max(1, v.maxSpeed)*100, 0, 100) + '%';

  const rpm = document.querySelector('.rpm > div');
  if (rpm) rpm.style.width = (state.rpm*100).toFixed(0) + '%';

  const gear = document.querySelector('.gear');
  if (gear) gear.textContent = 'Gear: ' + state.gear + (state.handbrake ? '  [HB]' : '');

  const dmg = document.querySelector('.dmg');
  if (dmg) dmg.textContent = Math.round(state.damage) + '%';

  const dmgBar = document.querySelector('.dmgbar');
  if (dmgBar) dmgBar.style.width = clamp(state.damage, 0, 100) + '%';

  const cond = document.querySelector('.cond');
  if (cond) cond.textContent = damageLabel(state.damage);

  const smoke = document.querySelector('.smoke');
  if (smoke) smoke.textContent = smokeLabel(state.damage);

  const nitro = document.querySelector('.nitro');
  if (nitro) nitro.textContent = Math.round(state.nitro) + '%';

  const nitroFill = document.querySelector('.nitrofill');
  if (nitroFill) nitroFill.style.width = clamp(state.nitro, 0, 100) + '%';

  const dist = document.querySelector('.dist');
  if (dist) dist.textContent = formatDistance(state.distance);

  const weatherEl = document.querySelector('.weather');
  if (weatherEl) weatherEl.textContent = WEATHER_NAMES[weather] || weather;

  const info = document.getElementById('seedinfo');
  if (info){
    info.textContent = 'Seed: ' + seed + '   |   Chunks: ' + chunks.size +
      '   |   Traffic: ' + traffic.length + '   |   ' + clockString() + '   ' +
      (WEATHER_NAMES[weather] || weather) + (settings.fps ? '   |   ' + fpsValue + ' fps' : '');
  }
}

function updateControlsHint(){
  const ctrl = document.querySelector('.controls');
  if (!ctrl) return;
  ctrl.textContent =
    keyLabel(binds.throttle) + '/' + keyLabel(binds.brake) + ' accel/brake  ' +
    keyLabel(binds.left) + '/' + keyLabel(binds.right) + ' steer  ' +
    keyLabel(binds.handbrake) + ' handbrake  ' +
    keyLabel(binds.nitro) + ' nitro  ' +
    keyLabel(binds.reset) + ' reset  ' +
    keyLabel(binds.camera) + ' camera  ' +
    keyLabel(binds.weather) + ' weather  ' +
    keyLabel(binds.headlights) + ' lights  ' +
    keyLabel(binds.pause) + '/Esc pause';
}

// ---------- minimap ----------
function drawMinimap(){
  const mc = document.getElementById('minimap');
  if (!mc || !mc.getContext) return;
  const ctx = mc.getContext('2d');
  const W = mc.width, H = mc.height, cx = W/2, cy = H/2, scale = 0.15;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(8,18,30,0.86)';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  for (let i=0; i<=W; i+=30){
    ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(W,i); ctx.stroke();
  }

  const px = car.position.x, pz = car.position.z;

  ctx.strokeStyle = 'rgba(210,220,230,0.6)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (const s of roadSegments){
    if (Math.abs(s.x1-px) > 640 || Math.abs(s.z1-pz) > 640) continue;
    ctx.moveTo(cx + (s.x1-px)*scale, cy + (s.z1-pz)*scale);
    ctx.lineTo(cx + (s.x2-px)*scale, cy + (s.z2-pz)*scale);
  }
  ctx.stroke();

  ctx.fillStyle = '#ffb703';
  for (const tr of traffic){
    const mx = cx + (tr.group.position.x-px)*scale;
    const my = cy + (tr.group.position.z-pz)*scale;
    ctx.beginPath(); ctx.arc(mx, my, 2.2, 0, Math.PI*2); ctx.fill();
  }

  const fx = Math.sin(state.yaw), fz = Math.cos(state.yaw);
  const rx = Math.cos(state.yaw), rz = -Math.sin(state.yaw);
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.moveTo(cx + fx*8, cy + fz*8);
  ctx.lineTo(cx - fx*5 + rx*4.5, cy - fz*5 + rz*4.5);
  ctx.lineTo(cx - fx*5 - rx*4.5, cy - fz*5 - rz*4.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '10px Tahoma';
  ctx.fillText('N', 6, 14);
}

// ---------- garage ----------
function barPct(val, max){ return clamp(val/max*100, 4, 100); }

function applyCarColor(){
  car.traverse(function(o){
    if (o.isMesh && (o.userData.isBody || o.userData.isCabin) && o.material && o.material.color){
      o.material.color.setHex(customCarColor);
    }
  });
}

function selectVehicle(i){
  if (i < 0 || i >= VEHICLES.length) return;
  selectedVehicle = i;
  customCarColor = VEHICLES[i].color;
  try {
    localStorage.setItem('driving.vehicle', String(i));
    localStorage.setItem('driving.color', String(customCarColor));
  } catch (e) { /* storage may be blocked */ }
  applyCarColor();
  buildGarage();
}

function buildGarage(){
  const grid = document.getElementById('vehgrid');
  if (!grid) return;
  grid.innerHTML = '';
  VEHICLES.forEach(function(v, i){
    const card = document.createElement('div');
    card.className = 'veh-card' + (i === selectedVehicle ? ' sel' : '');
    card.innerHTML =
      '<h3>' + v.name + '</h3>' +
      '<div class="cls">' + v.cls + '</div>' +
      '<div class="stat"><span>Top speed</span><span>' + formatSpeed(v.maxSpeed) + ' ' + unitSpeedLabel() + '</span></div>' +
      '<div class="statbar"><div style="width:' + barPct(v.maxSpeed, 95) + '%"></div></div>' +
      '<div class="stat"><span>Acceleration</span><span>' + v.accel + '</span></div>' +
      '<div class="statbar"><div style="width:' + barPct(v.accel, 34) + '%"></div></div>' +
      '<div class="stat"><span>Handling</span><span>' + v.handling.toFixed(2) + '</span></div>' +
      '<div class="statbar"><div style="width:' + barPct(v.handling, 1.5) + '%"></div></div>' +
      '<div class="stat"><span>Braking</span><span>' + v.brake + '</span></div>' +
      '<div class="statbar"><div style="width:' + barPct(v.brake, 38) + '%"></div></div>' +
      '<div class="stat"><span>Armour</span><span>x' + v.dmgResist.toFixed(2) + '</span></div>';
    card.addEventListener('click', function(){ selectVehicle(i); });
    grid.appendChild(card);
  });
}

// ---------- menus ----------
function showGarage(show){
  const menu = document.getElementById('menu');
  const garage = document.getElementById('garage');
  if (!menu || !garage) return;
  Array.prototype.forEach.call(menu.children, function(el){
    if (el.id === 'garage') return;
    el.style.display = show ? 'none' : '';
  });
  garage.style.display = show ? 'flex' : 'none';
}

function startGame(){
  const input = document.getElementById('seed');
  const parsed = parseInt(input ? input.value : '12345', 10);
  seed = Number.isFinite(parsed) ? parsed : 12345;

  nodeCache.clear();
  buildRoads();

  for (const key of Array.from(chunks.keys())){
    const parts = key.split(',');
    removeChunk(Number(parts[0]), Number(parts[1]));
  }
  lastChunkCx = null;
  lastChunkCz = null;

  clearParticles();
  applyCarColor();
  timeOfDay = clamp(settings.time, 0, 0.999);
  state.cameraMode = clamp(settings.camera | 0, 0, 3);
  resetCar();
  spawnTraffic();
  updateChunks(0, 0, true);
  setWeather(settings.weatherAuto ? 'clear' : settings.weather);
  weatherTimer = 45 + Math.random()*30;

  const menu = document.getElementById('menu');
  if (menu) menu.style.display = 'none';
  applyHudVisibility();

  paused = false;
  rebinding = null;
  const pauseEl = document.getElementById('pause');
  if (pauseEl) pauseEl.style.display = 'none';
  updateControlsHint();

  running = true;
  lastTime = performance.now();
  updateHUD();
  drawMinimap();
}

document.getElementById('play').addEventListener('click', startGame);
document.getElementById('garagebtn').addEventListener('click', function(){ showGarage(true); });
document.getElementById('backmenu').addEventListener('click', function(){ showGarage(false); });
document.getElementById('quit').addEventListener('click', function(){
  if (window.parent && window.parent !== window) window.parent.postMessage('close', '*');
});

window.addEventListener('resize', function(){
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- main loop ----------
let running = false;
let lastTime = performance.now();
let hudAcc = 0, mapAcc = 0;
let fpsValue = 0, fpsFrames = 0, fpsAcc = 0;

function animate(){
  requestAnimationFrame(animate);

  const now = performance.now();
  let dt = (now - lastTime)/1000;
  lastTime = now;
  if (!Number.isFinite(dt) || dt <= 0) dt = 0.016;
  if (dt > 0.1) dt = 0.1;

  fpsFrames++;
  fpsAcc += dt;
  if (fpsAcc >= 0.5){
    fpsValue = Math.round(fpsFrames/fpsAcc);
    fpsFrames = 0;
    fpsAcc = 0;
  }

  if (running && !paused){
    if (state.destroying){
      state.destroyTimer -= dt;
      updateSmoke(dt);
      updateExplosion(dt);
      updateTraffic(dt);
      updateWeather(dt);
      if (state.destroyTimer <= 0) resetCar();
    } else {
      updatePhysics(dt);
      updateTraffic(dt);
      updateWeather(dt);
      updateChunks(car.position.x, car.position.z);
      updateSmoke(dt);
      updateExplosion(dt);
    }

    updateCamera(dt);

    hudAcc += dt;
    if (hudAcc > 0.08){ updateHUD(); hudAcc = 0; }

    mapAcc += dt;
    if (mapAcc > 0.12){ drawMinimap(); mapAcc = 0; }
  }

  renderer.render(scene, camera);
}

// ---------- pause menu ----------
const PAUSE_CSS = `
#pause{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(4,10,18,.72);z-index:30;font-family:Tahoma,Verdana,sans-serif;color:#fff;}
.pause-panel{width:min(920px,94vw);max-height:90vh;display:flex;flex-direction:column;background:linear-gradient(180deg,rgba(17,30,47,.98),rgba(9,17,29,.98));border:1px solid rgba(255,255,255,.14);border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.65);overflow:hidden;}
.pause-head{display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.1);}
.pause-head h2{margin:0;font-size:21px;letter-spacing:3px;}
.pause-head .sub{opacity:.6;font-size:12px;margin-left:auto;margin-right:4px;text-align:right;}
.pause-tabs{display:flex;gap:6px;padding:9px 16px;border-bottom:1px solid rgba(255,255,255,.08);flex-wrap:wrap;}
.pause-tabs button{background:rgba(255,255,255,.06);border:1px solid transparent;color:#cfd8e3;padding:7px 14px;border-radius:7px;cursor:pointer;font-size:13px;font-family:inherit;}
.pause-tabs button:hover{background:rgba(255,255,255,.12);}
.pause-tabs button.on{background:rgba(230,57,70,.24);border-color:rgba(230,57,70,.65);color:#fff;}
.pause-body{padding:12px 20px 18px;overflow:auto;}
.pause-body section[hidden]{display:none !important;}
.p-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px;}
.p-row:last-child{border-bottom:0;}
.p-row .lbl{display:flex;flex-direction:column;gap:2px;}
.p-row .lbl small{opacity:.5;font-size:11px;}
.p-hint{font-size:12px;opacity:.6;padding:6px 0 10px;line-height:1.5;}
.seg{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;align-items:center;}
.seg button{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#dbe4ee;border-radius:6px;padding:5px 11px;font-size:12px;cursor:pointer;font-family:inherit;}
.seg button:hover{background:rgba(255,255,255,.16);}
.seg button.on{background:#e63946;border-color:#e63946;color:#fff;}
.p-btn{background:#e63946;border:0;color:#fff;border-radius:7px;padding:8px 16px;font-size:13px;cursor:pointer;font-family:inherit;}
.p-btn:hover{background:#ff4d5a;}
.p-btn.ghost{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);}
.p-btn.ghost:hover{background:rgba(255,255,255,.16);}
.p-key{min-width:124px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);color:#fff;border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer;font-family:inherit;}
.p-key:hover{background:rgba(255,255,255,.14);}
.p-key.waiting{border-color:#ffd166;color:#ffd166;}
.p-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(172px,1fr));gap:8px;padding:4px 0 12px;}
.p-car{background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.12);border-radius:8px;padding:9px;cursor:pointer;font-size:11px;line-height:1.55;color:#dfe7ef;}
.p-car:hover{background:rgba(255,255,255,.11);}
.p-car.on{border-color:#e63946;background:rgba(230,57,70,.16);}
.p-car b{display:block;font-size:13px;color:#fff;margin-bottom:1px;}
.p-car em{display:block;font-style:normal;opacity:.6;text-transform:uppercase;letter-spacing:1px;font-size:10px;margin:-1px 0 4px;}
input[type=range]{width:190px;accent-color:#e63946;}
.p-sw{width:44px;height:23px;border-radius:12px;background:rgba(255,255,255,.18);position:relative;cursor:pointer;border:0;flex:none;}
.p-sw::after{content:'';position:absolute;top:2.5px;left:2.5px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .15s;}
.p-sw.on{background:#2a9d4a;}
.p-sw.on::after{left:23px;}
select.p-sel{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:6px;padding:6px 10px;font-family:inherit;font-size:12px;}
select.p-sel option{background:#12202f;}
.p-foot{display:flex;gap:8px;justify-content:space-between;align-items:center;padding:11px 20px;border-top:1px solid rgba(255,255,255,.1);font-size:11px;opacity:.8;}
.p-num{min-width:46px;text-align:right;opacity:.85;}
`;

function mkEl(tag, cls, text){
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function pauseRow(label, hint){
  const row = mkEl('div', 'p-row');
  const lbl = mkEl('div', 'lbl');
  lbl.appendChild(mkEl('span', null, label));
  if (hint) lbl.appendChild(mkEl('small', null, hint));
  row.appendChild(lbl);
  return row;
}

function segControl(options, current, onPick){
  const wrap = mkEl('div', 'seg');
  options.forEach(function(opt){
    const b = mkEl('button', opt.id === current ? 'on' : '', opt.label);
    b.type = 'button';
    b.addEventListener('click', function(){ onPick(opt.id); });
    wrap.appendChild(b);
  });
  return wrap;
}

function switchRow(label, hint, checked, onChange){
  const row = pauseRow(label, hint);
  const sw = mkEl('button', 'p-sw' + (checked ? ' on' : ''));
  sw.type = 'button';
  sw.setAttribute('aria-label', label);
  sw.addEventListener('click', function(){ onChange(!checked); });
  row.appendChild(sw);
  return row;
}

function initPauseMenu(){
  if (document.getElementById('pause')) return;

  const style = document.createElement('style');
  style.textContent = PAUSE_CSS;
  document.head.appendChild(style);

  const root = mkEl('div');
  root.id = 'pause';
  root.innerHTML =
    '<div class="pause-panel">' +
      '<div class="pause-head">' +
        '<h2>PAUSED</h2>' +
        '<span class="sub" id="p-sub"></span>' +
        '<button class="p-btn" type="button" data-resume="1">Resume</button>' +
      '</div>' +
      '<div class="pause-tabs">' +
        '<button type="button" data-tab="car" class="on">Vehicle</button>' +
        '<button type="button" data-tab="controls">Controls</button>' +
        '<button type="button" data-tab="display">Display</button>' +
        '<button type="button" data-tab="gameplay">Gameplay</button>' +
      '</div>' +
      '<div class="pause-body">' +
        '<section data-panel="car"></section>' +
        '<section data-panel="controls" hidden></section>' +
        '<section data-panel="display" hidden></section>' +
        '<section data-panel="gameplay" hidden></section>' +
      '</div>' +
      '<div class="p-foot"><span id="p-foot">Esc to resume</span><span>Settings save automatically</span></div>' +
    '</div>';
  document.body.appendChild(root);

  root.addEventListener('click', function(ev){
    const tabBtn = ev.target.closest ? ev.target.closest('[data-tab]') : null;
    if (tabBtn){ selectPauseTab(tabBtn.getAttribute('data-tab')); return; }
    if (ev.target.closest && ev.target.closest('[data-resume]')){ setPaused(false); return; }
  });

  selectPauseTab('car');
}

let pauseTab = 'car';

function pauseRoot(){ return document.getElementById('pause'); }

function applyHudVisibility(){
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = settings.hud ? 'block' : 'none';
  const map = document.getElementById('minimap');
  if (map) map.style.display = settings.minimap ? 'block' : 'none';
}

function setPaused(on){
  if (!running) return;
  paused = !!on;
  const root = pauseRoot();
  if (root) root.style.display = paused ? 'flex' : 'none';
  if (paused){
    for (const k in keys) keys[k] = false;
    state.handbrake = false;
    applyHudVisibility();
    refreshPauseUI();
  } else {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    lastTime = performance.now();
  }
}

function togglePause(){ setPaused(!paused); }

function quitToMenu(){
  paused = false;
  running = false;
  rebinding = null;
  const root = pauseRoot();
  if (root) root.style.display = 'none';
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';
  const destroyed = document.getElementById('destroyed');
  if (destroyed) destroyed.style.display = 'none';
  const menu = document.getElementById('menu');
  if (menu) menu.style.display = '';
  showGarage(false);
  clearParticles();
  resetCar();
  updateHUD();
  lastTime = performance.now();
}

function selectPauseTab(tab){
  pauseTab = tab;
  const root = pauseRoot();
  if (!root) return;
  root.querySelectorAll('[data-tab]').forEach(function(b){
    b.classList.toggle('on', b.getAttribute('data-tab') === tab);
  });
  root.querySelectorAll('[data-panel]').forEach(function(sec){
    sec.hidden = sec.getAttribute('data-panel') !== tab;
  });
  refreshPauseUI();
}

function refreshPauseUI(){
  const root = pauseRoot();
  if (!root) return;

  const v = VEHICLES[selectedVehicle];
  const sub = document.getElementById('p-sub');
  if (sub){
    sub.textContent = v.name + '  ·  ' + formatSpeed(v.maxSpeed) + ' ' + unitSpeedLabel() +
      '  ·  ' + Math.round(state.damage) + '% damage';
  }
  const foot = document.getElementById('p-foot');
  if (foot){
    foot.textContent = keyLabel(binds.pause) + ' or Esc to resume   ·   ' +
      keyLabel(binds.reset) + ' resets the car';
  }

  const panel = root.querySelector('[data-panel="' + pauseTab + '"]');
  if (!panel) return;
  panel.innerHTML = '';
  if (pauseTab === 'car') renderCarPanel(panel);
  else if (pauseTab === 'controls') renderControlsPanel(panel);
  else if (pauseTab === 'display') renderDisplayPanel(panel);
  else renderGameplayPanel(panel);
}

function renderCarPanel(panel){
  panel.appendChild(mkEl('div', 'p-hint',
    'Pick a vehicle — it swaps in instantly, even mid-drive. Top speed, acceleration, grip and armour all change.'));

  const grid = mkEl('div', 'p-grid');
  VEHICLES.forEach(function(v, i){
    const card = mkEl('button', 'p-car' + (i === selectedVehicle ? ' on' : ''));
    card.type = 'button';
    card.innerHTML =
      '<b>' + v.name + '</b><em>' + v.cls + '</em>' +
      'Top ' + formatSpeed(v.maxSpeed) + ' ' + unitSpeedLabel() + '<br>' +
      'Accel ' + v.accel + '  ·  Grip ' + v.handling.toFixed(2) + '<br>' +
      'Armour ×' + v.dmgResist.toFixed(2);
    card.addEventListener('click', function(){
      selectVehicle(i);
      updateHUD();
      refreshPauseUI();
    });
    grid.appendChild(card);
  });
  panel.appendChild(grid);

  const paintRow = pauseRow('Paint', 'Choosing another car resets this to its factory colour.');
  const paintWrap = mkEl('div', 'seg');
  const colours = [0xe63946, 0x4cc9f0, 0xffb703, 0xff6b35, 0x2a9d8f, 0xf72585, 0x7209b7,
                   0x8d99ae, 0xf1f1f1, 0x495057, 0x1b2430];
  colours.forEach(function(hex){
    const sw = mkEl('button');
    sw.type = 'button';
    const hexText = '#' + ('00000' + hex.toString(16)).slice(-6);
    sw.title = hexText;
    sw.style.cssText =
      'width:24px;height:24px;border-radius:50%;padding:0;cursor:pointer;' +
      'background:' + hexText + ';border:2px solid ' +
      (hex === customCarColor ? '#ffffff' : 'rgba(255,255,255,.25)') + ';';
    sw.addEventListener('click', function(){
      customCarColor = hex;
      try { localStorage.setItem('driving.color', String(hex)); } catch (e) {}
      applyCarColor();
      refreshPauseUI();
    });
    paintWrap.appendChild(sw);
  });
  paintRow.appendChild(paintWrap);
  panel.appendChild(paintRow);
}

function renderControlsPanel(panel){
  panel.appendChild(mkEl('div', 'p-hint',
    'Click a key, then press the new one. Esc cancels. Arrow keys always stay available for driving as a second binding, and binding a key that is already used swaps the two actions.'));

  ACTIONS.forEach(function(a){
    const hint = KEY_ALTS[a.id] ? 'Also ' + keyLabel(KEY_ALTS[a.id]) : a.alt;
    const row = pauseRow(a.label, hint);
    const waiting = rebinding === a.id;
    const btn = mkEl('button', 'p-key' + (waiting ? ' waiting' : ''),
      waiting ? 'Press a key…' : keyLabel(binds[a.id]));
    btn.type = 'button';
    btn.addEventListener('click', function(){
      rebinding = a.id;
      refreshPauseUI();
    });
    row.appendChild(btn);
    panel.appendChild(row);
  });

  const wrap = mkEl('div', 'seg');
  wrap.style.cssText = 'padding-top:14px;justify-content:flex-start;';
  const defaults = mkEl('button', 'p-btn ghost', 'Restore default keys');
  defaults.type = 'button';
  defaults.addEventListener('click', function(){
    binds = Object.assign({}, DEFAULT_BINDS);
    saveBinds();
    rebinding = null;
    updateControlsHint();
    refreshPauseUI();
  });
  wrap.appendChild(defaults);
  panel.appendChild(wrap);
}

function renderDisplayPanel(panel){
  panel.appendChild(mkEl('div', 'p-hint',
    'Units change the speedometer, distance readout and garage stats instantly.'));

  const unitRow = pauseRow('Measurement system',
    settings.units === 'imperial' ? 'mph  ·  feet / miles' : 'km/h  ·  metres / kilometres');
  unitRow.appendChild(segControl([
    { id: 'metric',   label: 'km/h · m/km' },
    { id: 'imperial', label: 'mph · ft/mi' }
  ], settings.units, function(id){
    settings.units = id;
    saveSettings();
    updateHUD();
    buildGarage();
    refreshPauseUI();
  }));
  panel.appendChild(unitRow);

  panel.appendChild(switchRow('Show HUD', 'Speed, damage, nitro, gear and distance overlays.',
    settings.hud, function(v){
      settings.hud = v;
      saveSettings();
      applyHudVisibility();
      refreshPauseUI();
    }));

  panel.appendChild(switchRow('Show minimap', 'Road network, traffic dots and your heading.',
    settings.minimap, function(v){
      settings.minimap = v;
      saveSettings();
      applyHudVisibility();
      drawMinimap();
      refreshPauseUI();
    }));

  panel.appendChild(switchRow('Show FPS', 'Adds a frame-rate counter to the top-left readout.',
    settings.fps, function(v){
      settings.fps = v;
      saveSettings();
      updateHUD();
      refreshPauseUI();
    }));

  const camRow = pauseRow('Camera', keyLabel(binds.camera) + ' cycles through these while driving.');
  camRow.appendChild(segControl([
    { id: 0, label: 'Chase' },
    { id: 1, label: 'Near' },
    { id: 2, label: 'Hood' },
    { id: 3, label: 'Orbit' }
  ], state.cameraMode, function(id){
    state.cameraMode = Number(id);
    settings.camera = state.cameraMode;
    saveSettings();
    snapCamera();
    refreshPauseUI();
  }));
  panel.appendChild(camRow);
}

function sliderRow(label, hint, min, max, step, value, fmt, onInput, onChange){
  const row = pauseRow(label, hint);
  const wrap = mkEl('div', 'seg');
  const range = mkEl('input');
  range.type = 'range';
  range.min = String(min);
  range.max = String(max);
  range.step = String(step);
  range.value = String(value);
  const out = mkEl('span', 'p-num', fmt(value));
  range.addEventListener('input', function(){
    const v = Number(range.value);
    out.textContent = fmt(v);
    if (onInput) onInput(v);
  });
  if (onChange) range.addEventListener('change', function(){ onChange(Number(range.value)); });
  wrap.appendChild(range);
  wrap.appendChild(out);
  row.appendChild(wrap);
  return row;
}

function minutesLabel(v){
  const h = Math.floor(v / 60) % 24;
  const m = Math.floor(v % 60);
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

function renderGameplayPanel(panel){
  panel.appendChild(mkEl('div', 'p-hint',
    'Difficulty and world settings. Every change applies immediately and is saved for next time.'));

  panel.appendChild(sliderRow('Collision damage',
    '0% = indestructible, 100% = normal, 200% = double damage from trees, buildings and traffic.',
    0, 200, 5, settings.damage,
    function(v){ return v + '%'; },
    function(v){ settings.damage = v; saveSettings(); },
    null));

  panel.appendChild(sliderRow('Traffic density',
    'Traffic is rebuilt across the road network when you release the slider.',
    0, TRAFFIC_MAX, 1, settings.traffic,
    function(v){ return v + (v === 1 ? ' car' : ' cars'); },
    null,
    function(v){
      settings.traffic = v;
      saveSettings();
      if (running) spawnTraffic();
      updateHUD();
      refreshPauseUI();
    }));

  const weatherRow = pauseRow('Weather',
    settings.weatherAuto ? 'Changes on its own every 45–90 s.' : 'Locked to your choice.');
  const sel = mkEl('select', 'p-sel');
  [['auto', 'Auto'], ['clear', 'Clear'], ['rain', 'Rain'], ['fog', 'Fog'], ['storm', 'Storm']]
    .forEach(function(o){
      const op = document.createElement('option');
      op.value = o[0];
      op.textContent = o[1];
      sel.appendChild(op);
    });
  sel.value = settings.weatherAuto ? 'auto' : settings.weather;
  sel.addEventListener('change', function(){
    if (sel.value === 'auto'){
      settings.weatherAuto = true;
      weatherTimer = 45 + Math.random() * 30;
    } else {
      settings.weatherAuto = false;
      settings.weather = sel.value;
      setWeather(sel.value);
    }
    saveSettings();
    updateWeather(0);
    updateHUD();
    refreshPauseUI();
  });
  weatherRow.appendChild(sel);
  panel.appendChild(weatherRow);

  panel.appendChild(switchRow('Freeze time of day',
    'Keeps the sun and sky where they are instead of running the day/night cycle.',
    settings.timeFreeze, function(v){
      settings.timeFreeze = v;
      settings.time = timeOfDay;
      saveSettings();
      refreshPauseUI();
    }));

  panel.appendChild(sliderRow('Time of day', 'Drag to set the clock; the sky updates immediately.',
    0, 1439, 15, Math.round(timeOfDay * 1440),
    function(v){ return minutesLabel(v); },
    function(v){
      timeOfDay = v / 1440;
      settings.time = timeOfDay;
      saveSettings();
      updateWeather(0);
      updateHUD();
    },
    null));

  const actions = mkEl('div', 'seg');
  actions.style.cssText = 'padding-top:16px;justify-content:flex-start;';
  const restart = mkEl('button', 'p-btn', 'Restart run');
  restart.type = 'button';
  restart.addEventListener('click', function(){
    setPaused(false);
    resetCar();
    spawnTraffic();
    updateHUD();
    drawMinimap();
  });
  const quit = mkEl('button', 'p-btn ghost', 'Quit to menu');
  quit.type = 'button';
  quit.addEventListener('click', quitToMenu);
  const resetAll = mkEl('button', 'p-btn ghost', 'Reset all settings');
  resetAll.type = 'button';
  resetAll.addEventListener('click', function(){
    settings = Object.assign({}, DEFAULT_SETTINGS);
    saveSettings();
    binds = Object.assign({}, DEFAULT_BINDS);
    saveBinds();
    rebinding = null;
    state.cameraMode = settings.camera;
    snapCamera();
    timeOfDay = settings.time;
    weatherTimer = 45 + Math.random() * 30;
    setWeather(settings.weather);
    if (running) spawnTraffic();
    applyHudVisibility();
    updateControlsHint();
    updateWeather(0);
    updateHUD();
    drawMinimap();
    refreshPauseUI();
  });
  actions.appendChild(restart);
  actions.appendChild(quit);
  actions.appendChild(resetAll);
  panel.appendChild(actions);
}

// ---------- boot ----------
initPauseMenu();
buildGarage();
setWeather('clear');
snapCamera();
animate();
