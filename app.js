import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

/* ============================================================
   AFTER DARK — Enhanced Earth + Observation System
   ============================================================ */

const canvas = document.querySelector('#space');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.85));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 5.15);

const earthGroup = new THREE.Group();
scene.add(earthGroup);

const loader = new THREE.TextureLoader();
loader.setCrossOrigin('anonymous');

/* ---------- High-quality textures (CORS-friendly) ---------- */
const dayMap = loader.load(
  'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
  undefined,
  undefined,
  () => console.warn('Day texture failed to load')
);
dayMap.colorSpace = THREE.SRGBColorSpace;

const nightMap = loader.load(
  'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg',
  undefined,
  undefined,
  () => console.warn('Night texture failed to load')
);
nightMap.colorSpace = THREE.SRGBColorSpace;

const topoMap = loader.load(
  'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png'
);

/* ---------- Stars ---------- */
const starGeo = new THREE.BufferGeometry();
const starCount = matchMedia('(max-width:800px)').matches ? 1400 : 3200;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 28 + Math.random() * 22;
  const t = Math.random() * Math.PI * 2;
  const p = Math.acos(2 * Math.random() - 1);
  starPos[i * 3] = r * Math.sin(p) * Math.cos(t);
  starPos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
  starPos[i * 3 + 2] = r * Math.cos(p);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

const stars = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({
    color: 0xc8d2cf,
    size: 0.026,
    transparent: true,
    opacity: 0.78,
    sizeAttenuation: true,
    depthWrite: false
  })
);
scene.add(stars);

const restoreStars = new THREE.Points(
  starGeo.clone(),
  new THREE.PointsMaterial({
    color: 0xdce8ff,
    size: 0.038,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
    depthWrite: false
  })
);
scene.add(restoreStars);

/* ---------- Earth core with day/night blend shader ---------- */
const EARTH_RADIUS = 1.64;

const earthUniforms = {
  dayTexture: { value: dayMap },
  nightTexture: { value: nightMap },
  topoTexture: { value: topoMap },
  sunDirection: { value: new THREE.Vector3(-0.55, 0.25, 0.8).normalize() },
  nightIntensity: { value: 1.15 },
  atmosphereColor: { value: new THREE.Color(0x6ba3b8) }
};

const earthMaterial = new THREE.ShaderMaterial({
  uniforms: earthUniforms,
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform sampler2D topoTexture;
    uniform vec3 sunDirection;
    uniform float nightIntensity;
    uniform vec3 atmosphereColor;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    void main() {
      vec3 dayColor = texture2D(dayTexture, vUv).rgb;
      vec3 nightColor = texture2D(nightTexture, vUv).rgb;
      float elevation = texture2D(topoTexture, vUv).r;

      // Soften day colors slightly for cinematic look
      dayColor = mix(dayColor, dayColor * vec3(0.92, 0.95, 1.0), 0.25);

      // Boost night city lights
      nightColor *= nightIntensity * 1.55;

      // Lighting term (day/night transition)
      vec3 normal = normalize(vNormal);
      float NdotL = dot(normal, sunDirection);

      // Smooth terminator
      float dayFactor = smoothstep(-0.12, 0.28, NdotL);

      // Mix day and night
      vec3 color = mix(nightColor, dayColor, dayFactor);

      // Subtle topographic shading
      color *= 0.88 + elevation * 0.22;

      // Rim / atmosphere contribution on the day side
      float rim = 1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0);
      color += dayFactor * pow(rim, 3.2) * atmosphereColor * 0.18;

      // Soft glow on night side cities
      float nightGlow = (1.0 - dayFactor) * length(nightColor) * 0.15;
      color += vec3(1.0, 0.72, 0.35) * nightGlow;

      gl_FragColor = vec4(color, 1.0);
    }
  `
});

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS, 96, 96),
  earthMaterial
);
earthGroup.add(earth);

/* ---------- Atmosphere (fresnel) ---------- */
const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS * 1.075, 80, 80),
  new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(0x6d9eaa) },
      uIntensity: { value: 0.28 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mvPos.xyz);
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 3.6);
        gl_FragColor = vec4(uColor, rim * uIntensity);
      }
    `
  })
);
earthGroup.add(atmosphere);

/* ---------- Subtle cloud layer ---------- */
const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_RADIUS * 1.012, 72, 72),
  new THREE.MeshBasicMaterial({
    map: loader.load('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-water.png'),
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
);
earthGroup.add(clouds);

/* ---------- City markers ---------- */
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
  ['Sydney', -33.8688, 151.2093, 'AUS-SYD', 74]
];

function latLon(lat, lon, r = EARTH_RADIUS * 1.018) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

const cityPoints = [];
cityData.forEach(([name, lat, lon, code, index]) => {
  const size = 0.018 + index / 6000;
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.82,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 10), mat);
  mesh.position.copy(latLon(lat, lon));
  mesh.userData = { name, lat, lon, code, index };
  earthGroup.add(mesh);
  cityPoints.push(mesh);

  // Soft glow halo
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(size * 2.4, 8, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  glow.position.copy(mesh.position);
  earthGroup.add(glow);
});

/* ---------- Lighting ---------- */
scene.add(new THREE.DirectionalLight(0xe8f0f0, 1.65));
scene.add(new THREE.AmbientLight(0x1c282c, 0.22));

/* ---------- Interaction ---------- */
let rx = 0.12, ry = -0.82, trx = rx, tryy = ry, scale = 1, ts = 1;
let drag = false, lx = 0, ly = 0;

canvas.addEventListener('pointerdown', e => {
  drag = true;
  lx = e.clientX;
  ly = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointerup', () => (drag = false));
canvas.addEventListener('pointercancel', () => (drag = false));
canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  tryy += (e.clientX - lx) * 0.005;
  trx += (e.clientY - ly) * 0.0035;
  trx = Math.max(-0.75, Math.min(0.75, trx));
  lx = e.clientX;
  ly = e.clientY;
});
canvas.addEventListener(
  'wheel',
  e => {
    ts = Math.max(0.72, Math.min(1.42, ts - e.deltaY * 0.00045));
  },
  { passive: true }
);

let scrollTarget = 0, scrollProgress = 0;
addEventListener(
  'scroll',
  () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollTarget = max ? scrollY / max : 0;
  },
  { passive: true }
);

function animate() {
  requestAnimationFrame(animate);

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    rx += (trx - rx) * 0.055;
    ry += (tryy - ry) * 0.055;
    scale += (ts - scale) * 0.055;
    scrollProgress += (scrollTarget - scrollProgress) * 0.035;

    earthGroup.rotation.x = rx + scrollProgress * 0.08;
    earthGroup.rotation.y = ry + scrollProgress * 0.65;
    clouds.rotation.y += 0.00018;
    stars.rotation.y += 0.00005;
  }

  earthGroup.scale.setScalar(scale);
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.85));
});

/* ============================================================
   Data UI — year, regions, cities, pollution, restore
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
  return Object.keys(history)
    .map(Number)
    .reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a));
}

function yearUpdate() {
  const y = +yearSlider.value;
  const k = nearest(y);
  const d = history[k];
  const t = (y - 1992) / 34;

  yearReadout.textContent = y;
  timelineYear.textContent = y;
  yearCaption.textContent =
    y === k ? d[3] : `INTERPOLATED · NEAREST REFERENCE ${k}`;
  indexReadout.textContent = d[0].toFixed(1);
  statNumber.textContent = d[1].toFixed(1) + '×';
  observationLabel.textContent = d[2];
  observationYear.textContent = y;
  sourceStatus.textContent =
    k >= 2012 ? 'VIIRS / BLACK MARBLE' : 'DMSP-OLS / HISTORICAL';

  // Drive night-light intensity from the historical index
  earthUniforms.nightIntensity.value = 0.45 + t * 1.15;
  cityPoints.forEach(p => {
    p.material.opacity = 0.3 + t * 0.6;
  });
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
  ts = n === 'GLOBAL' ? 1 : 1.18;
  document.querySelector('#selectedRegion').textContent = n;
}

document.querySelectorAll('#regionList button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#regionList button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    focusRegion(b.dataset.region);
  });
});

/* Cities */
const cityList = document.querySelector('#cityList');
cityData.forEach(([name, lat, lon, code, index]) => {
  const b = document.createElement('button');
  b.innerHTML = `<span>${name.toUpperCase()}</span><small>${code} · ${index}</small>`;
  b.addEventListener('click', () => {
    trx = Math.max(-0.65, Math.min(0.65, (lat / 90) * 0.45));
    tryy = -((lon + 180) / 180) * Math.PI + Math.PI;
    ts = 1.36;
    document.querySelector('#cityName').textContent = name.toUpperCase();
    document.querySelector('#cityCoords').textContent =
      `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} / ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
    document.querySelector('#cityIndex').textContent = index;
    document.querySelector('#cityCode').textContent = code;
  });
  cityList.appendChild(b);
});

/* Pollution slider */
const pollutionSlider = document.querySelector('#pollutionSlider');
const pollutionValue = document.querySelector('#pollutionValue');

function pollutionUpdate() {
  const v = +pollutionSlider.value;
  const n = 1 - v / 100;
  pollutionValue.textContent = v + '%';
  stars.material.opacity = 0.15 + n * 0.72;
  restoreStars.material.opacity = n * 0.32;
  document.querySelector('#skyMode').textContent =
    v < 20 ? 'NATURAL NIGHT' : v < 65 ? 'SUBURBAN SKY' : 'CITY SKY';
}
pollutionSlider.addEventListener('input', pollutionUpdate);
pollutionUpdate();

/* Restore the Night */
const citySlider = document.querySelector('#citySlider');
const cityValue = document.querySelector('#cityValue');
const cityLights = document.querySelector('.city-lights');
const starsReturn = document.querySelector('.stars-return');

function cityUpdate() {
  const v = +citySlider.value;
  cityValue.textContent = v + '%';
  cityLights.style.opacity = v / 100;
  starsReturn.style.opacity = (100 - v) / 100;
  restoreStars.material.opacity = ((100 - v) / 100) * 0.6;

  // Dim the night lights on the globe
  earthUniforms.nightIntensity.value = 0.25 + (v / 100) * 1.2;

  document.querySelector('#restoreState').textContent =
    v === 0 ? 'NATURAL NIGHT' : v < 40 ? 'REDUCED LIGHTING' : 'ARTIFICIAL LIGHT';
}
citySlider.addEventListener('input', cityUpdate);
cityUpdate();

document.querySelector('#restoreBtn').addEventListener('click', () => {
  citySlider.value = citySlider.value > 0 ? 0 : 100;
  cityUpdate();
});

/* Navigation helpers */
document.querySelector('#enterBtn').addEventListener('click', () => {
  document.querySelector('#earth').scrollIntoView({ behavior: 'smooth' });
});

document.querySelector('#menuBtn').addEventListener('click', () => {
  const y = scrollY + innerHeight * 0.55;
  const next = [...document.querySelectorAll('.scene')].find(s => s.offsetTop > y);
  (next || document.querySelector('.scene')).scrollIntoView({ behavior: 'smooth' });
});

/* Scene progress */
const sceneLabel = document.querySelector('#sceneLabel');
const progressBar = document.querySelector('#progressBar');
const io = new IntersectionObserver(
  entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const n = e.target.dataset.scene;
        sceneLabel.textContent = n + ' / 08';
        progressBar.style.width = (+n / 8) * 100 + '%';
        e.target.classList.add('scene-visible');
      }
    });
  },
  { threshold: 0.32 }
);
document.querySelectorAll('.scene').forEach(s => io.observe(s));

/* Ambience toggle */
const soundToggle = document.querySelector('#soundToggle');
soundToggle.addEventListener('click', () => {
  const s = soundToggle.querySelector('span');
  const on = s.textContent === 'OFF';
  s.textContent = on ? 'ON' : 'OFF';
  document.body.classList.toggle('ambience-on', on);
});
