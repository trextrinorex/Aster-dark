import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

/* ============================================================
   AFTER DARK — Cinematic Earth + Interactive Observation
   ============================================================ */

const canvas = document.querySelector('#space');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 0.15, 4.85);

const earthGroup = new THREE.Group();
scene.add(earthGroup);

const loader = new THREE.TextureLoader();
loader.setCrossOrigin('anonymous');

/* Reliable public textures */
const TEX = {
  day: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
  night: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg',
  topo: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
  clouds: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-water.png'
};

const dayMap = loader.load(TEX.day);
dayMap.colorSpace = THREE.SRGBColorSpace;
const nightMap = loader.load(TEX.night);
nightMap.colorSpace = THREE.SRGBColorSpace;
const topoMap = loader.load(TEX.topo);
const cloudMap = loader.load(TEX.clouds);

/* ---------- Dense starfield ---------- */
function makeStars(count, size, color, opacity) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 30 + Math.random() * 40;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    pos[i * 3 + 2] = r * Math.cos(p);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity,
      sizeAttenuation: true,
      depthWrite: false
    })
  );
}

const starCount = matchMedia('(max-width:800px)').matches ? 1800 : 4200;
const stars = makeStars(starCount, 0.03, 0xd0d8d4, 0.85);
scene.add(stars);

const restoreStars = makeStars(starCount, 0.045, 0xe8f0ff, 0);
scene.add(restoreStars);

/* ---------- EARTH (strong day/night blend) ---------- */
const R = 1.58;

const earthUniforms = {
  dayTexture: { value: dayMap },
  nightTexture: { value: nightMap },
  topoTexture: { value: topoMap },
  sunDirection: { value: new THREE.Vector3(-0.6, 0.2, 0.75).normalize() },
  nightIntensity: { value: 1.8 },
  time: { value: 0 }
};

const earthMat = new THREE.ShaderMaterial({
  uniforms: earthUniforms,
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform sampler2D topoTexture;
    uniform vec3 sunDirection;
    uniform float nightIntensity;
    uniform float time;

    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      vec3 dayCol = texture2D(dayTexture, vUv).rgb;
      vec3 nightCol = texture2D(nightTexture, vUv).rgb;
      float elev = texture2D(topoTexture, vUv).r;

      // Cinematic day grading
      dayCol *= vec3(0.9, 0.95, 1.05);
      dayCol = pow(dayCol, vec3(0.95));

      // Strong night lights
      nightCol = pow(nightCol, vec3(0.85));
      nightCol *= nightIntensity * 2.2;

      vec3 N = normalize(vNormal);
      float ndl = dot(N, sunDirection);

      // Soft but clear terminator
      float dayF = smoothstep(-0.08, 0.35, ndl);

      vec3 color = mix(nightCol, dayCol, dayF);

      // Topography
      color *= 0.85 + elev * 0.28;

      // Atmosphere rim (day)
      float rim = pow(1.0 - max(dot(N, vec3(0.0, 0.0, 1.0)), 0.0), 2.8);
      color += dayF * rim * vec3(0.35, 0.55, 0.75) * 0.35;

      // City light bloom on night side
      float city = length(nightCol) * (1.0 - dayF);
      color += vec3(1.0, 0.65, 0.25) * city * 0.35;

      // Subtle pulse on brightest lights
      float pulse = 0.97 + 0.03 * sin(time * 2.0 + vUv.x * 20.0);
      color = mix(color, color * pulse, (1.0 - dayF) * 0.4);

      gl_FragColor = vec4(color, 1.0);
    }
  `
});

const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 128), earthMat);
earthGroup.add(earth);

/* Atmosphere */
const atmos = new THREE.Mesh(
  new THREE.SphereGeometry(R * 1.085, 64, 64),
  new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(0x5a9bb0) },
      uPower: { value: 0.32 }
    },
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor; uniform float uPower;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float r = pow(1.0 - max(dot(vN, vV), 0.0), 3.4);
        gl_FragColor = vec4(uColor, r * uPower);
      }
    `
  })
);
earthGroup.add(atmos);

/* Clouds */
const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(R * 1.015, 80, 80),
  new THREE.MeshBasicMaterial({
    map: cloudMap,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
);
earthGroup.add(clouds);

/* City markers with pulse */
const cityData = [
  ['Delhi', 28.6139, 77.209, 'IND-DEL', 86],
  ['Mumbai', 19.076, 72.8777, 'IND-MUM', 82],
  ['London', 51.5072, -0.1276, 'GBR-LON', 79],
  ['Paris', 48.8566, 2.3522, 'FRA-PAR', 81],
  ['New York', 40.7128, -74.006, 'USA-NYC', 91],
  ['Los Angeles', 34.0522, -118.2437, 'USA-LAX', 88],
  ['Tokyo', 35.6762, 139.6503, 'JPN-TYO', 94],
  ['Shanghai', 31.2304, 121.4737, 'CHN-SHA', 96],
  ['São Paulo', -23.5505, -46.6333, 'BRA-SAO', 84],
  ['Sydney', -33.8688, 151.2093, 'AUS-SYD', 74],
  ['Cairo', 30.0444, 31.2357, 'EGY-CAI', 71],
  ['Lagos', 6.5244, 3.3792, 'NGA-LAG', 68],
  ['Seoul', 37.5665, 126.978, 'KOR-SEL', 90],
  ['Mexico City', 19.4326, -99.1332, 'MEX-MEX', 80]
];

function latLon(lat, lon, r = R * 1.02) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

const cityPoints = [];
const cityGlows = [];
cityData.forEach(([name, lat, lon, code, index]) => {
  const size = 0.016 + index / 7000;
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffc266,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 12), mat);
  mesh.position.copy(latLon(lat, lon));
  mesh.userData = { name, lat, lon, code, index };
  earthGroup.add(mesh);
  cityPoints.push(mesh);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(size * 3.2, 10, 10),
    new THREE.MeshBasicMaterial({
      color: 0xff9933,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  glow.position.copy(mesh.position);
  earthGroup.add(glow);
  cityGlows.push(glow);
});

/* Lights */
scene.add(new THREE.DirectionalLight(0xf0f4f4, 1.9));
scene.add(new THREE.AmbientLight(0x152028, 0.28));

/* ---------- Interaction (faster drag / touch) ---------- */
let rx = 0.14, ry = -0.9, trx = rx, tryy = ry, scale = 1, ts = 1;
let drag = false, lx = 0, ly = 0;
let autoRotate = true;
let pointerType = 'mouse';

// Higher sensitivity for touch/fingers; still snappy for mouse
function dragSensitivity() {
  return pointerType === 'touch' ? 0.018 : 0.011;
}

canvas.style.touchAction = 'none'; // prevent page scroll while dragging Earth

canvas.addEventListener('pointerdown', e => {
  drag = true;
  autoRotate = false;
  pointerType = e.pointerType || 'mouse';
  lx = e.clientX;
  ly = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointerup', () => { drag = false; });
canvas.addEventListener('pointercancel', () => { drag = false; });

canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  const sens = dragSensitivity();
  tryy += (e.clientX - lx) * sens;
  trx += (e.clientY - ly) * sens * 0.75;
  trx = Math.max(-0.85, Math.min(0.85, trx));
  lx = e.clientX;
  ly = e.clientY;
});

canvas.addEventListener('wheel', e => {
  ts = Math.max(0.7, Math.min(1.5, ts - e.deltaY * 0.0005));
}, { passive: true });

let scrollTarget = 0, scrollProgress = 0;
addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  scrollTarget = max ? scrollY / max : 0;
}, { passive: true });

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  earthUniforms.time.value = t;

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (autoRotate && !drag) tryy += 0.0012;

    // Snappier follow so drag feels immediate
    const follow = drag ? 0.22 : 0.1;
    rx += (trx - rx) * follow;
    ry += (tryy - ry) * follow;
    scale += (ts - scale) * 0.1;
    scrollProgress += (scrollTarget - scrollProgress) * 0.04;

    earthGroup.rotation.x = rx + scrollProgress * 0.06;
    earthGroup.rotation.y = ry + scrollProgress * 0.55;
    clouds.rotation.y += 0.00022;
    stars.rotation.y += 0.00004;

    // Gentle city pulse
    const pulse = 0.75 + 0.25 * Math.sin(t * 2.4);
    cityGlows.forEach((g, i) => {
      g.material.opacity = 0.12 + 0.14 * pulse * (0.7 + 0.3 * Math.sin(t + i));
    });
  }

  earthGroup.scale.setScalar(scale);
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

/* Resume auto-rotate after idle */
let idleTimer;
function resetIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!drag) autoRotate = true; }, 6000);
}
canvas.addEventListener('pointerup', resetIdle);
canvas.addEventListener('wheel', resetIdle);

/* ============================================================
   Data UI
   ============================================================ */

const yearSlider = document.querySelector('#yearSlider');
const yearReadout = document.querySelector('#yearReadout');
const timelineYear = document.querySelector('#timelineYear');
const indexReadout = document.querySelector('#indexReadout');
const statNumber = document.querySelector('#statNumber');
const observationLabel = document.querySelector('#observationLabel');
const observationYear = document.querySelector('#observationYear');
const yearCaption = document.querySelector('#yearCaption');
const sourceStatus = document.querySelector('#sourceStatus');

const history = {
  1992: [28, 1, 'DMSP-OLS / HISTORICAL', 'EARLY GLOBAL SATELLITE RECORD'],
  2000: [35.5, 1.32, 'DMSP-OLS / HISTORICAL', 'URBAN CORRIDORS EXPAND'],
  2010: [46.7, 1.72, 'DMSP-OLS / HISTORICAL', 'METROPOLITAN FOOTPRINTS CONNECT'],
  2012: [51.2, 1.89, 'VIIRS / BLACK MARBLE', 'VIIRS ERA BEGINS'],
  2016: [60.8, 2.2, 'VIIRS / BLACK MARBLE', 'LUMINOUS NETWORKS INTENSIFY'],
  2020: [68.6, 2.53, 'VIIRS / BLACK MARBLE', 'A BRIGHTER PLANETARY NIGHT'],
  2026: [74.8, 2.86, 'VIIRS / BLACK MARBLE*', 'CURRENT SCENARIO VIEW']
};

function nearest(y) {
  return Object.keys(history).map(Number).reduce((a, b) =>
    Math.abs(b - y) < Math.abs(a - y) ? b : a
  );
}

function yearUpdate() {
  const y = +yearSlider.value;
  const k = nearest(y);
  const d = history[k];
  const t = (y - 1992) / 34;

  yearReadout.textContent = y;
  timelineYear.textContent = y;
  yearCaption.textContent = y === k ? d[3] : `INTERPOLATED · NEAREST REFERENCE ${k}`;
  indexReadout.textContent = d[0].toFixed(1);
  statNumber.textContent = d[1].toFixed(1) + '×';
  observationLabel.textContent = d[2];
  observationYear.textContent = y;
  sourceStatus.textContent = k >= 2012 ? 'VIIRS / BLACK MARBLE' : 'DMSP-OLS / HISTORICAL';

  earthUniforms.nightIntensity.value = 0.7 + t * 1.6;
  cityPoints.forEach(p => { p.material.opacity = 0.35 + t * 0.6; });
}
yearSlider.addEventListener('input', yearUpdate);
yearUpdate();

/* Regions */
const regionData = {
  GLOBAL: ['74.8', '+214%', 'GLB-00', 'Global composite view of artificial illumination.'],
  INDIA: ['82.1', '+268%', 'IND-91', 'A dense network of urban illumination across the subcontinent.'],
  EUROPE: ['78.4', '+161%', 'EUR-44', 'Dense urban corridors create a connected luminous footprint.'],
  'NORTH AMERICA': ['76.9', '+184%', 'NAM-07', 'Metropolitan clusters and road networks form broad signatures.'],
  'EAST ASIA': ['89.2', '+301%', 'EAS-52', 'Some of the most intense urban illumination is concentrated here.'],
  AFRICA: ['42.6', '+126%', 'AFR-18', 'Lower aggregate illumination masks rapidly growing urban centers.']
};

const rTitle = document.querySelector('#regionTitle');
const rIndex = document.querySelector('#regionIndex');
const rChange = document.querySelector('#regionChange');
const rCode = document.querySelector('#regionCode');
const rCopy = document.querySelector('#regionCopy');
const rRead = document.querySelector('#regionReadout');

function focusRegion(n) {
  const d = regionData[n];
  rTitle.textContent = n;
  rRead.textContent = n;
  rIndex.textContent = d[0];
  rChange.textContent = d[1];
  rCode.textContent = d[2];
  rCopy.textContent = d[3];

  const f = {
    INDIA: [0.18, -0.85],
    EUROPE: [0.48, -0.12],
    'NORTH AMERICA': [0.22, 1.12],
    'EAST ASIA': [0.2, -2.28],
    AFRICA: [-0.1, -0.42],
    GLOBAL: [0.12, -0.82]
  }[n];

  trx = f[0];
  tryy = f[1];
  ts = n === 'GLOBAL' ? 1 : 1.2;
  autoRotate = false;
  resetIdle();
  document.querySelector('#selectedRegion').textContent = n;
}

document.querySelectorAll('#regionList button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#regionList button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    focusRegion(b.dataset.region);
  });
});

/* Cities list */
const cityList = document.querySelector('#cityList');
cityData.forEach(([name, lat, lon, code, index]) => {
  const b = document.createElement('button');
  b.innerHTML = `<span>${name.toUpperCase()}</span><small>${code} · ${index}</small>`;
  b.addEventListener('click', () => {
    trx = Math.max(-0.65, Math.min(0.65, (lat / 90) * 0.5));
    tryy = -((lon + 180) / 180) * Math.PI + Math.PI;
    ts = 1.38;
    autoRotate = false;
    resetIdle();
    document.querySelector('#cityName').textContent = name.toUpperCase();
    document.querySelector('#cityCoords').textContent =
      `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} / ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
    document.querySelector('#cityIndex').textContent = index;
    document.querySelector('#cityCode').textContent = code;
  });
  cityList.appendChild(b);
});

/* Pollution */
const pollutionSlider = document.querySelector('#pollutionSlider');
const pollutionValue = document.querySelector('#pollutionValue');

function pollutionUpdate() {
  const v = +pollutionSlider.value;
  const n = 1 - v / 100;
  pollutionValue.textContent = v + '%';
  stars.material.opacity = 0.12 + n * 0.78;
  restoreStars.material.opacity = n * 0.4;
  document.querySelector('#skyMode').textContent =
    v < 20 ? 'NATURAL NIGHT' : v < 65 ? 'SUBURBAN SKY' : 'CITY SKY';
}
pollutionSlider.addEventListener('input', pollutionUpdate);
pollutionUpdate();

/* Restore */
const citySlider = document.querySelector('#citySlider');
const cityValue = document.querySelector('#cityValue');
const cityLightsEl = document.querySelector('.city-lights');
const starsReturn = document.querySelector('.stars-return');

function cityUpdate() {
  const v = +citySlider.value;
  cityValue.textContent = v + '%';
  cityLightsEl.style.opacity = v / 100;
  starsReturn.style.opacity = (100 - v) / 100;
  restoreStars.material.opacity = ((100 - v) / 100) * 0.65;
  earthUniforms.nightIntensity.value = 0.35 + (v / 100) * 1.7;
  document.querySelector('#restoreState').textContent =
    v === 0 ? 'NATURAL NIGHT' : v < 40 ? 'REDUCED LIGHTING' : 'ARTIFICIAL LIGHT';
}
citySlider.addEventListener('input', cityUpdate);
cityUpdate();

document.querySelector('#restoreBtn').addEventListener('click', () => {
  citySlider.value = citySlider.value > 0 ? 0 : 100;
  cityUpdate();
});

/* Nav */
document.querySelector('#enterBtn').addEventListener('click', () => {
  document.querySelector('#earth').scrollIntoView({ behavior: 'smooth' });
});

document.querySelector('#menuBtn').addEventListener('click', () => {
  const y = scrollY + innerHeight * 0.55;
  const next = [...document.querySelectorAll('.scene')].find(s => s.offsetTop > y);
  (next || document.querySelector('.scene')).scrollIntoView({ behavior: 'smooth' });
});

/* Progress */
const sceneLabel = document.querySelector('#sceneLabel');
const progressBar = document.querySelector('#progressBar');
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const n = e.target.dataset.scene;
      sceneLabel.textContent = n + ' / 08';
      progressBar.style.width = (+n / 8) * 100 + '%';
      e.target.classList.add('scene-visible');
    }
  });
}, { threshold: 0.28 });
document.querySelectorAll('.scene').forEach(s => io.observe(s));

/* Sound toggle */
const soundToggle = document.querySelector('#soundToggle');
soundToggle.addEventListener('click', () => {
  const s = soundToggle.querySelector('span');
  const on = s.textContent === 'OFF';
  s.textContent = on ? 'ON' : 'OFF';
  document.body.classList.toggle('ambience-on', on);
});

/* Keyboard shortcuts */
addEventListener('keydown', e => {
  if (e.target.matches('input, textarea')) return;
  if (e.key === 'r' || e.key === 'R') {
    autoRotate = !autoRotate;
  }
  if (e.key === 'ArrowRight') {
    yearSlider.value = Math.min(2026, +yearSlider.value + 2);
    yearUpdate();
  }
  if (e.key === 'ArrowLeft') {
    yearSlider.value = Math.max(1992, +yearSlider.value - 2);
    yearUpdate();
  }
});
