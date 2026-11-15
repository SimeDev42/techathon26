(function() {
const { THREE, PLYLoader, OrbitControls } = window.THREE_CAD;

const CHAPTERS = [
  {
    tag: 'WELCOME DESK',
    title: 'Pick up your handheld',
    subtitle: 'Empty 12×12 stud plate · Ready to explore',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="3"/><rect x="9" y="5" width="6" height="6" rx="1"/><circle cx="10" cy="15" r="1"/><circle cx="14" cy="15" r="1"/></svg>',
    body: 'At the museum entrance, visitors receive a navy handheld with an empty 12×12 stud plate, ready to collect picture tiles at each exhibition station.',
    duration: 5500,
    camPos: [145, -170, 295],
    camTarget: [0, 8, 14]
  },
  {
    tag: 'BLE BEACON',
    title: 'Follow the signal',
    subtitle: 'OLED bars & buzzer speed up as you get closer',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="19.5" r="1"/></svg>',
    body: 'As you walk through the exhibition, the nRF54L15 listens for the next station’s BLE beacon. The 0.96″ OLED fills from FAR to CLOSE and the buzzer beeps faster.',
    duration: 5500,
    camPos: [55, -135, 250],
    camTarget: [22, -48, 22]
  },
  {
    tag: 'NFC SCAN',
    title: 'Tap the station tile',
    subtitle: 'Hold the physical tile over the NFC pad',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M9 15V9l6 6V9"/></svg>',
    body: 'Once in the CLOSE zone, pick up the station’s picture tile and hold it over the recessed NFC pad. The handheld validates the station and unlocks the question.',
    duration: 5500,
    camPos: [-15, -130, 235],
    camTarget: [0, -45, 26]
  },
  {
    tag: 'QUIZ & FEEDBACK',
    title: 'Answer on the handheld',
    subtitle: '“Around what year was King Harald Bluetooth born?”',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
    body: 'Read the station question (“Around what year was King Harald Bluetooth born?”) and press B (Around 910 AD) on the tactile A–D buttons. Wrong answers allow retries; a correct answer validates the tile.',
    duration: 5500,
    camPos: [-45, -115, 225],
    camTarget: [-12, -55, 24]
  },
  {
    tag: 'BUILD THE PICTURE',
    title: 'Snap the tile onto the plate',
    subtitle: 'Complete all 9 tiles of the Jelling Stone',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
    body: 'Snap the validated picture tile onto the bare cream studs of the 12×12 plate. Repeat at each station until the full Jelling Stone artwork is complete.',
    duration: 6000,
    camPos: [35, -80, 265],
    camTarget: [0, 28, 30]
  },
  {
    tag: 'RETURN & INSIDE LOOK',
    title: 'Return & inspect inside',
    subtitle: 'nRF54L15 DK · Grove SSD1315 · Buzzer · 1:1 CAD',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 12l10 5 10-5"/><path d="M2 17l10 5 10-5"/></svg>',
    body: 'Bring the completed handheld back to the museum desk to claim your prize. The exploded 1:1 CAD view reveals the nRF54L15 DK, OLED stack, switches, and buzzer inside.',
    duration: 7000,
    camPos: [225, -245, 270],
    camTarget: [0, 0, 42]
  }
];

const stage = document.querySelector('.stage-card');
const loadingEl = document.getElementById('story-loading');
const badgeTextEl = document.getElementById('stage-badge-text');
const stepEl = document.getElementById('chapter-step');
const tagEl = document.getElementById('chapter-tag');
const titleEl = document.getElementById('chapter-title');
const bodyEl = document.getElementById('chapter-body');
const progressEl = document.getElementById('chapter-progress');
const listEl = document.getElementById('chapter-list');
const playBtn = document.getElementById('play-toggle');
const prevBtn = document.getElementById('prev-chapter');
const nextBtn = document.getElementById('next-chapter');

// Build chapter list
CHAPTERS.forEach((ch, idx) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chapter-item';
  btn.innerHTML = `
    <span class="chapter-num">${ch.icon}</span>
    <div>
      <strong>${ch.title}</strong>
      <span>${ch.subtitle}</span>
    </div>
  `;
  btn.onclick = () => goToChapter(idx);
  listEl.append(btn);
});

// Three.js Setup
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 1, 2000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 140;
controls.maxDistance = 650;

let userInteracting = false;
controls.addEventListener('start', () => { userInteracting = true; });
controls.addEventListener('end', () => { userInteracting = false; });

// Studio 3-point lighting
scene.add(new THREE.HemisphereLight(0xf6f4ee, 0x3b424d, 0.95));
const keyLight = new THREE.DirectionalLight(0xfffaf0, 1.85);
keyLight.position.set(-180, 160, 320);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 50;
keyLight.shadow.camera.far = 700;
keyLight.shadow.camera.left = -140;
keyLight.shadow.camera.right = 140;
keyLight.shadow.camera.top = 140;
keyLight.shadow.camera.bottom = -140;
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xdce8f8, 0.85);
fillLight.position.set(220, -60, 220);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.95);
rimLight.position.set(-60, 240, -180);
scene.add(rimLight);

// Centered CAD root
const deviceRoot = new THREE.Group();
deviceRoot.position.set(-70, -96, -14);
scene.add(deviceRoot);

const baseGroup = new THREE.Group();
const hardwareGroup = new THREE.Group();
const lidGroup = new THREE.Group();
const plateGroup = new THREE.Group();
deviceRoot.add(baseGroup, hardwareGroup, lidGroup, plateGroup);

// Materials
const matBase = new THREE.MeshStandardMaterial({ color: 0x28364d, roughness: 0.32, metalness: 0.05 });
const matLid = new THREE.MeshStandardMaterial({ color: 0x35445b, roughness: 0.30, metalness: 0.05 });
const matPlate = new THREE.MeshStandardMaterial({ color: 0xd7c9ae, roughness: 0.28, metalness: 0.02 });
const matNrfPcb = new THREE.MeshStandardMaterial({ color: 0x277a99, roughness: 0.42, metalness: 0.12 });
const matOledPcb = new THREE.MeshStandardMaterial({ color: 0x208064, roughness: 0.42, metalness: 0.12 });
const matOledGlass = new THREE.MeshStandardMaterial({ color: 0x0c1b24, roughness: 0.10, metalness: 0.15 });
const matSwitch = new THREE.MeshStandardMaterial({ color: 0xa9abb0, roughness: 0.30, metalness: 0.55 });
const matBuzzer = new THREE.MeshStandardMaterial({ color: 0xc38b42, roughness: 0.40, metalness: 0.35, side: THREE.DoubleSide });

// Live 128x64 OLED Canvas
const oledCanvas = document.createElement('canvas');
oledCanvas.width = 128;
oledCanvas.height = 64;
const oledCtx = oledCanvas.getContext('2d');
const oledTexture = new THREE.CanvasTexture(oledCanvas);
oledTexture.minFilter = THREE.NearestFilter;
oledTexture.magFilter = THREE.NearestFilter;
oledTexture.colorSpace = THREE.SRGBColorSpace;
oledTexture.generateMipmaps = false;

const oledScreen = new THREE.Mesh(
  new THREE.PlaneGeometry(21.74, 10.86),
  new THREE.MeshBasicMaterial({ map: oledTexture })
);
oledScreen.position.set(109.35, 37.00, 25.95);
hardwareGroup.add(oledScreen);

// NFC Pad inside lid recess (63, 43)
const nfcCanvas = document.createElement('canvas');
nfcCanvas.width = 256;
nfcCanvas.height = 286;
const nfcCtx = nfcCanvas.getContext('2d');
const nfcTexture = new THREE.CanvasTexture(nfcCanvas);
nfcTexture.colorSpace = THREE.SRGBColorSpace;
const nfcMat = new THREE.MeshStandardMaterial({ map: nfcTexture, roughness: 0.35, transparent: true });
const nfcMesh = new THREE.Mesh(new THREE.PlaneGeometry(21.0, 24.0), nfcMat);
nfcMesh.position.set(63.0, 43.0, 26.75);
lidGroup.add(nfcMesh);

function drawNfcPad(ready) {
  nfcCtx.clearRect(0, 0, 256, 286);
  nfcCtx.fillStyle = ready ? '#1b4332' : '#263349';
  nfcCtx.strokeStyle = ready ? '#52b788' : '#778295';
  nfcCtx.lineWidth = 6;
  nfcCtx.beginPath();
  nfcCtx.roundRect(8, 8, 240, 270, 26);
  nfcCtx.fill();
  nfcCtx.stroke();
  nfcCtx.strokeStyle = ready ? '#d8f3dc' : '#aeb7be';
  nfcCtx.lineWidth = 8;
  nfcCtx.lineCap = 'round';
  nfcCtx.beginPath();
  nfcCtx.moveTo(96, 178); nfcCtx.lineTo(96, 94); nfcCtx.lineTo(160, 178); nfcCtx.lineTo(160, 94);
  nfcCtx.stroke();
  nfcCtx.beginPath(); nfcCtx.arc(104, 136, 46, Math.PI * 0.72, Math.PI * 1.28); nfcCtx.stroke();
  nfcCtx.beginPath(); nfcCtx.arc(152, 136, 46, -Math.PI * 0.28, Math.PI * 0.28); nfcCtx.stroke();
  nfcCtx.fillStyle = ready ? '#d8f3dc' : '#aeb7be';
  nfcCtx.font = 'bold 28px Arial, sans-serif';
  nfcCtx.textAlign = 'center';
  nfcCtx.fillText('NFC', 128, 236);
  nfcTexture.needsUpdate = true;
}
drawNfcPad(false);

// BLE signal waves + Buzzer pulse ring
const bleWaves = [];
for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(18 + i * 12, 20 + i * 12, 48),
    new THREE.MeshBasicMaterial({ color: 0x006db7, transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  ring.position.set(109.35, 37.0, 28.0);
  lidGroup.add(ring);
  bleWaves.push(ring);
}

// 4 Buttons in reading order A B / C D
const buttonPositions = {
  A: [18.5580, 41.0824],
  B: [28.0576, 41.0824],
  C: [18.5580, 30.8208],
  D: [28.0576, 30.8208]
};
const buttonGroups = {};
const buttonMaterials = {};
for (const letter of ['A', 'B', 'C', 'D']) {
  const grp = new THREE.Group();
  lidGroup.add(grp);
  buttonGroups[letter] = grp;

  const capCanvas = document.createElement('canvas');
  capCanvas.width = 128;
  capCanvas.height = 128;
  const cctx = capCanvas.getContext('2d');
  cctx.fillStyle = '#28364d';
  cctx.font = 'bold 74px Arial, sans-serif';
  cctx.textAlign = 'center';
  cctx.textBaseline = 'middle';
  cctx.fillText(letter, 64, 68);
  const capTex = new THREE.CanvasTexture(capCanvas);
  capTex.colorSpace = THREE.SRGBColorSpace;
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 5.6),
    new THREE.MeshBasicMaterial({ map: capTex, transparent: true })
  );
  decal.position.set(buttonPositions[letter][0], buttonPositions[letter][1], 31.14);
  grp.add(decal);
}

// 3x3 Picture Tiles on the 12x12 Stud Plate
const tileMeshes = [];
const sideTileMat = new THREE.MeshStandardMaterial({ color: 0xd7c9ae, roughness: 0.3, metalness: 0.02 });
function createTileMesh(slotIndex) {
  const col = slotIndex % 3;
  const row = Math.floor(slotIndex / 3);
  const geom = new THREE.BoxGeometry(31.2, 31.2, 1.8);
  const uv = geom.attributes.uv;
  const u0 = col / 3, u1 = (col + 1) / 3;
  const v1 = 1 - row / 3, v0 = 1 - (row + 1) / 3;
  uv.setXY(16, u0, v1); uv.setXY(17, u1, v1);
  uv.setXY(18, u0, v0); uv.setXY(19, u1, v0);
  uv.needsUpdate = true;
  const topMat = new THREE.MeshStandardMaterial({ color: 0xded4be, roughness: 0.28, metalness: 0.02 });
  const mesh = new THREE.Mesh(geom, [sideTileMat, sideTileMat, sideTileMat, sideTileMat, topMat, sideTileMat]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

for (let i = 0; i < 9; i++) {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const mesh = createTileMesh(i);
  mesh.position.set(70 + (col - 1) * 32.0, 124 + (1 - row) * 32.0, 32.35);
  plateGroup.add(mesh);
  tileMeshes.push(mesh);
}

// Floating animated tile for NFC Scan (Ch 3) & Tile Snap (Ch 5)
const flyingTile = createTileMesh(4);
flyingTile.visible = false;
deviceRoot.add(flyingTile);

const flyingTile2 = createTileMesh(7);
flyingTile2.visible = false;
deviceRoot.add(flyingTile2);

// Load stone.svg texture for all tiles
const tileImg = new Image();
tileImg.onload = () => {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  c.getContext('2d').drawImage(tileImg, 0, 0, 1024, 1024);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  for (const m of [...tileMeshes, flyingTile, flyingTile2]) {
    m.material[4].map = tex;
    m.material[4].color.setHex(0xffffff);
    m.material[4].needsUpdate = true;
  }
};
tileImg.src = window.JELLING_STONE_SVG || 'assets/stone.svg';

// Load all 15 actual CAD PLY meshes
const loader = new PLYLoader();
const partSpecs = [
  { file: '01_base_DRAFT.ply', group: baseGroup, mat: matBase, castShadow: true, receiveShadow: true },
  { file: '02_lid_DRAFT.ply', group: lidGroup, mat: matLid, castShadow: true, receiveShadow: true },
  { file: '03_LEGO_12x12_plate_DRAFT.ply', group: plateGroup, mat: matPlate, castShadow: true, receiveShadow: true },
  { file: 'reference_nrf_PCB.ply', group: hardwareGroup, mat: matNrfPcb },
  { file: 'reference_oled_PCB.ply', group: hardwareGroup, mat: matOledPcb },
  { file: 'reference_oled_panel.ply', group: hardwareGroup, mat: matOledGlass },
  { file: 'reference_switch_8.ply', group: hardwareGroup, mat: matSwitch },
  { file: 'reference_switch_9.ply', group: hardwareGroup, mat: matSwitch },
  { file: 'reference_switch_10.ply', group: hardwareGroup, mat: matSwitch },
  { file: 'reference_switch_11.ply', group: hardwareGroup, mat: matSwitch },
  { file: 'reference_buzzer_footprint.ply', group: hardwareGroup, mat: matBuzzer }
];

for (const [letter, meshFile, offset] of [
  ['A', 'button_A_SW2_DRAFT.ply', [-9.4996, 0, 0]],
  ['B', 'button_B_SW3_DRAFT.ply', [0, 10.2616, 0]],
  ['C', 'button_C_SW5_DRAFT.ply', [0, -10.2616, 0]],
  ['D', 'button_D_SW6_DRAFT.ply', [9.4996, 0, 0]]
]) {
  const bmat = new THREE.MeshStandardMaterial({ color: 0xdfd4be, roughness: 0.25, metalness: 0.03 });
  buttonMaterials[letter] = bmat;
  partSpecs.push({ file: meshFile, group: buttonGroups[letter], mat: bmat, offset, castShadow: true, receiveShadow: true });
}

let loaded = 0;
function attachPart(spec, geom) {
  if (!geom.attributes.normal) geom.computeVertexNormals();
  const mesh = new THREE.Mesh(geom, spec.mat);
  if (spec.offset) mesh.position.set(...spec.offset);
  if (spec.castShadow) mesh.castShadow = true;
  if (spec.receiveShadow) mesh.receiveShadow = true;
  spec.group.add(mesh);
  loaded++;
  if (loaded === partSpecs.length) {
    loadingEl.classList.add('done');
  }
}
for (const spec of partSpecs) {
  const buf = window.decodeCADMesh?.(spec.file);
  if (buf) {
    attachPart(spec, loader.parse(buf));
  } else {
    loader.load(`assets/cad/${spec.file}`, geom => attachPart(spec, geom));
  }
}

// Story playback state
let currentChapter = 0;
let chapterElapsed = 0;
let isPlaying = true;
let camFromPos = new THREE.Vector3(...CHAPTERS[0].camPos);
let camFromTarget = new THREE.Vector3(...CHAPTERS[0].camTarget);
let camLerpT = 1;

camera.position.copy(camFromPos);
controls.target.copy(camFromTarget);
controls.update();

function updateUI() {
  const ch = CHAPTERS[currentChapter];
  badgeTextEl.textContent = `Step ${currentChapter + 1} of ${CHAPTERS.length}`;
  stepEl.textContent = `STEP ${currentChapter + 1} OF ${CHAPTERS.length}`;
  tagEl.textContent = ch.tag;
  titleEl.textContent = ch.title;
  bodyEl.textContent = ch.body;
  listEl.querySelectorAll('.chapter-item').forEach((el, i) => {
    el.classList.toggle('active', i === currentChapter);
  });
  playBtn.textContent = isPlaying ? 'Pause story' : 'Play story';
}

function goToChapter(index) {
  currentChapter = (index + CHAPTERS.length) % CHAPTERS.length;
  chapterElapsed = 0;
  camFromPos.copy(camera.position);
  camFromTarget.copy(controls.target);
  camLerpT = 0;
  updateUI();
}

playBtn.onclick = () => {
  isPlaying = !isPlaying;
  updateUI();
};
prevBtn.onclick = () => goToChapter(currentChapter - 1);
nextBtn.onclick = () => goToChapter(currentChapter + 1);

updateUI();

// OLED Drawing helper
function drawOLED(mode, param = 0) {
  oledCtx.fillStyle = '#071219';
  oledCtx.fillRect(0, 0, 128, 64);
  oledCtx.fillStyle = '#f6cf70';
  oledCtx.textBaseline = 'top';

  if (mode === 'searching') {
    oledCtx.font = '8px monospace';
    oledCtx.fillText('STATION 01', 6, 5);
    oledCtx.font = '12px monospace';
    oledCtx.fillText('SEARCHING', 6, 21);
    for (let i = 0; i < 10; i++) {
      oledCtx.fillStyle = i < 1 ? '#f6cf70' : '#2c332f';
      oledCtx.fillRect(6 + i * 12, 43, 8, 12);
    }
  } else if (mode === 'proximity') {
    const pct = Math.min(100, Math.round(param * 100));
    const band = pct < 35 ? 'FAR' : pct < 75 ? 'NEAR' : 'CLOSE';
    oledCtx.font = '8px monospace';
    oledCtx.fillText('STATION 01', 6, 5);
    oledCtx.font = '12px monospace';
    oledCtx.fillText(band, 6, 21);
    const bars = Math.ceil(pct / 10);
    for (let i = 0; i < 10; i++) {
      oledCtx.fillStyle = i < bars ? '#f6cf70' : '#2c332f';
      oledCtx.fillRect(6 + i * 12, 43, 8, 12);
    }
  } else if (mode === 'question') {
    oledCtx.font = '8px monospace';
    oledCtx.fillText('TILE ACCEPTED', 6, 5);
    oledCtx.font = '12px monospace';
    oledCtx.fillText('CHOOSE', 6, 21);
    oledCtx.font = '13px monospace';
    oledCtx.fillText('A  B  C  D', 6, 43);
  } else if (mode === 'correct') {
    oledCtx.font = '10px monospace';
    oledCtx.fillText('CORRECT!', 31, 6);
    oledCtx.strokeStyle = '#f6cf70';
    oledCtx.lineWidth = 3;
    oledCtx.beginPath();
    oledCtx.moveTo(48, 37);
    oledCtx.lineTo(59, 47);
    oledCtx.lineTo(81, 24);
    oledCtx.stroke();
  } else if (mode === 'complete') {
    oledCtx.font = '13px monospace';
    oledCtx.fillText('COMPLETE!', 7, 7);
    oledCtx.font = '10px monospace';
    oledCtx.fillText('2 / 2 TILES', 7, 29);
    oledCtx.font = '8px monospace';
    oledCtx.fillText('RETURN TO STAFF', 7, 49);
  }
  oledTexture.needsUpdate = true;
}

// Resize handling
function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
new ResizeObserver(resize).observe(stage);
resize();

// Animation loop
let lastTime = performance.now();
let explodeCurrent = 0;
let lastNfcState = false;

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  const ch = CHAPTERS[currentChapter];
  if (isPlaying) {
    chapterElapsed += dt * 1000;
    if (chapterElapsed >= ch.duration) {
      goToChapter(currentChapter + 1);
    }
  }
  const p = Math.min(1, chapterElapsed / ch.duration);
  progressEl.style.width = `${p * 100}%`;

  // Smooth camera choreography unless user is dragging
  if (!userInteracting && camLerpT < 1) {
    camLerpT = Math.min(1, camLerpT + dt * 1.4);
    const ease = 1 - Math.pow(1 - camLerpT, 3);
    camera.position.lerpVectors(camFromPos, new THREE.Vector3(...ch.camPos), ease);
    controls.target.lerpVectors(camFromTarget, new THREE.Vector3(...ch.camTarget), ease);
  }

  // Gentle idle breathing orbit in Ch 0
  if (!userInteracting && currentChapter === 0 && camLerpT >= 1) {
    const angle = Math.sin(now * 0.0007) * 0.28;
    const basePos = new THREE.Vector3(...ch.camPos);
    camera.position.x = basePos.x * Math.cos(angle) - basePos.z * Math.sin(angle) * 0.15;
  }

  // Reset per-frame animated states
  let explodeTarget = 0;
  let xray = false;
  let nfcReady = false;
  let btnBPress = 0;
  flyingTile.visible = false;
  flyingTile2.visible = false;
  for (const w of bleWaves) w.material.opacity = 0;

  // Visitors start with 0 tiles attached; completed picture shows after Chapter 5
  const completed = currentChapter > 4;
  for (let i = 0; i < 9; i++) {
    tileMeshes[i].visible = completed;
  }

  // Chapter-specific 3D choreography
  if (currentChapter === 0) {
    drawOLED('searching');
  } else if (currentChapter === 1) {
    const prox = Math.min(1, p * 1.25);
    drawOLED('proximity', prox);
    bleWaves.forEach((ring, idx) => {
      const wavePhase = ((now * 0.0012 + idx * 0.33) % 1);
      const scale = 0.6 + wavePhase * 1.4;
      ring.scale.set(scale, scale, 1);
      ring.material.opacity = (1 - wavePhase) * 0.45;
    });
  } else if (currentChapter === 2) {
    nfcReady = true;
    // Hover and lower NFC tile onto pad (63, 43, 27.7)
    const tap = p < 0.55 ? Math.sin((p / 0.55) * Math.PI * 0.5) : 1;
    const lift = p < 0.65 ? (1 - tap) * 28 : (p - 0.65) * 40;
    flyingTile.visible = true;
    flyingTile.position.set(63, 43, 28.0 + lift);
    flyingTile.rotation.set(0, 0, (1 - tap) * 0.25);
    drawOLED(p > 0.48 ? 'question' : 'proximity', 1);
  } else if (currentChapter === 3) {
    // Press button B cleanly around p = 0.32..0.55
    const pressing = p > 0.30 && p < 0.52;
    btnBPress = pressing ? -0.45 : 0;
    if (buttonMaterials.B) {
      buttonMaterials.B.emissive.setHex(pressing ? 0x3b2f10 : 0x151107);
    }
    drawOLED(p > 0.40 ? 'correct' : 'question');
  } else if (currentChapter === 4) {
    drawOLED('correct');
    // Arc tile 4 into slot 4 (70, 124, 32.35) then tile 7 into slot 7 (70, 92, 32.35)
    if (p < 0.5) {
      const t = Math.min(1, p / 0.42);
      const ease = 1 - Math.pow(1 - t, 3);
      flyingTile.visible = true;
      flyingTile.position.set(
        THREE.MathUtils.lerp(63, 70, ease),
        THREE.MathUtils.lerp(43, 124, ease),
        THREE.MathUtils.lerp(45, 32.35, ease) + Math.sin(ease * Math.PI) * 24
      );
      flyingTile.rotation.set(0, 0, (1 - ease) * 0.3);
      if (t >= 1) tileMeshes[4].visible = true;
    } else {
      tileMeshes[4].visible = true;
      const t = Math.min(1, (p - 0.5) / 0.42);
      const ease = 1 - Math.pow(1 - t, 3);
      flyingTile2.visible = true;
      flyingTile2.position.set(
        THREE.MathUtils.lerp(110, 70, ease),
        THREE.MathUtils.lerp(43, 92, ease),
        THREE.MathUtils.lerp(45, 32.35, ease) + Math.sin(ease * Math.PI) * 24
      );
      flyingTile2.rotation.set(0, 0, (1 - ease) * -0.3);
      if (t >= 1) tileMeshes[7].visible = true;
    }
  } else if (currentChapter === 5) {
    drawOLED('complete');
    explodeTarget = 1;
    xray = p > 0.45;
  }

  // Apply smooth transitions
  explodeCurrent += (explodeTarget - explodeCurrent) * Math.min(1, dt * 4.5);
  hardwareGroup.position.z = explodeCurrent * 22;
  lidGroup.position.z = explodeCurrent * 60;
  plateGroup.position.z = explodeCurrent * 90;

  matBase.transparent = xray;
  matBase.opacity = xray ? 0.24 : 1.0;
  matBase.depthWrite = !xray;
  matLid.transparent = xray;
  matLid.opacity = xray ? 0.24 : 1.0;
  matLid.depthWrite = !xray;

  buttonGroups.B.position.z += (btnBPress - buttonGroups.B.position.z) * Math.min(1, dt * 20);

  if (nfcReady !== lastNfcState) {
    lastNfcState = nfcReady;
    drawNfcPad(nfcReady);
  }

  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
})();
