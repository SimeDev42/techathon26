(function() {
const { THREE, PLYLoader, OrbitControls } = window.THREE_CAD;

const SLIDES = [
  {
    kicker: 'THE SPARK · OUR PROCESS',
    title: 'Where the idea <em>started.</em>',
    lead: 'Yesterday’s museum visit and the LEGO presentation showed us what makes an exhibition unforgettable: tactile play without screen fatigue.',
    bullets: [
      ['Museum Visit', 'Visitors walk past static displays when they are glued to a phone screen. We wanted curiosity to stay in the room.'],
      ['The LEGO Talk', 'Inspired us to use real studs and bricks so learning feels like building something tangible with your hands.'],
      ['Our Process', 'Combine low-power BLE guidance, NFC validation, and a physical puzzle into one simple handheld.']
    ],
    camPos: [175, -185, 290],
    camTarget: [0, 0, 14],
    mode: 'inspiration'
  },
  {
    kicker: 'PROJECT INTRODUCTION',
    title: 'The Jelling <em>Journey.</em>',
    lead: 'A tactile, screen-light museum handheld that turns a Viking exhibition into a physical picture puzzle.',
    bullets: [
      ['Hardware', 'Nordic nRF54L15 DK, 0.96″ SSD1315 OLED, piezo buzzer, and 4 tactile A–D buttons.'],
      ['Physical Puzzle', '12×12 stud plate that starts empty. Visitors collect and snap picture tiles at each station.'],
      ['1:1 CAD Enclosure', 'Custom 140 × 192 mm navy shell engineered directly from manufacturer PCB geometry.']
    ],
    camPos: [175, -185, 290],
    camTarget: [0, 0, 14],
    mode: 'intro'
  },
  {
    kicker: 'STEP 1 · WELCOME DESK',
    title: 'Pick up your <em>handheld.</em>',
    lead: 'Visitors start at the museum desk with an empty 12×12 stud plate, ready to collect picture tiles.',
    bullets: [
      ['Empty 12×12 Plate', 'Bare cream studs invite visitors to explore the gallery and earn each piece.'],
      ['Guided Route', 'The OLED immediately points toward Station 1 without needing a phone app.']
    ],
    camPos: [140, -155, 285],
    camTarget: [0, 12, 16],
    mode: 'pickup'
  },
  {
    kicker: 'STEP 2 · BLE PROXIMITY',
    title: 'Follow the <em>beacon.</em>',
    lead: 'As visitors walk through the gallery, Bluetooth Low Energy guides them toward the active station.',
    bullets: [
      ['Live OLED Meter', 'The 128×64 display steps smoothly from SEARCHING → FAR → NEAR → CLOSE.'],
      ['Audio Guidance', 'Beeps speed up as you approach, with no phone app or map screen required.']
    ],
    camPos: [55, -135, 245],
    camTarget: [22, -48, 22],
    mode: 'ble'
  },
  {
    kicker: 'STEP 3 · NFC SCAN',
    title: 'Tap the <em>station tile.</em>',
    lead: 'Inside the CLOSE zone, visitors pick up the station’s physical tile and hold it over the recessed NFC pad.',
    bullets: [
      ['Target Locked', 'Only the current station’s tile unlocks the question, preventing out-of-order skips.'],
      ['Instant Feedback', 'The OLED switches immediately to TILE ACCEPTED · CHOOSE A B C D.']
    ],
    camPos: [-15, -125, 235],
    camTarget: [0, -45, 26],
    mode: 'nfc'
  },
  {
    kicker: 'STEP 4 · QUESTION & FEEDBACK',
    title: 'Answer on the <em>device.</em>',
    lead: '“Around what year was King Harald Bluetooth born?” Visitors read the exhibit and press A, B, C, or D.',
    bullets: [
      ['Tactile Plungers', 'Custom 6.8 mm buttons actuate the onboard nRF54L15 DK switches with 0.35 mm travel.'],
      ['Forgiving Retries', 'Wrong answers let visitors try again; pressing B (Around 910 AD) validates the tile.']
    ],
    camPos: [-52, -98, 135],
    camTarget: [-34, -58, 17],
    mode: 'answer'
  },
  {
    kicker: 'STEP 5 · BUILD THE PICTURE',
    title: 'Snap onto the <em>stud plate.</em>',
    lead: 'Each validated tile snaps onto the 12×12 plate, physically building the complete Jelling Stone.',
    bullets: [
      ['4×4 Stud Grid', 'Each 31.2 mm tile locks onto a 4×4 stud section on the 95.8 mm cream plate.'],
      ['Tangible Progress', 'Visitors leave the gallery with a completed 3×3 picture ready for staff check.']
    ],
    camPos: [30, -75, 265],
    camTarget: [0, 28, 30],
    mode: 'snap'
  },
  {
    kicker: 'STEP 6 · RETURN & REWARD',
    title: 'Return at the <em>desk.</em>',
    lead: 'Visitors bring the completed handheld back to the museum team to verify their picture and claim a prize.',
    bullets: [
      ['Completed 9 / 9 Plate', 'All nine Jelling Stone tiles are snapped onto the 12×12 stud grid.'],
      ['Staff Verification', 'OLED confirms 2 / 2 TILES · RETURN TO STAFF before prize redemption.']
    ],
    camPos: [145, -165, 285],
    camTarget: [0, 8, 14],
    mode: 'return'
  },
  {
    kicker: 'BEYOND FLAT TILES',
    title: 'Build a <em>3D sculpture.</em>',
    lead: 'Because the handheld uses a real 12×12 stud plate, museums can hand out 3D bricks instead of flat tiles.',
    bullets: [
      ['Tactile 3D Building', 'Visitors stack bricks at each station to construct a miniature monument on the device.'],
      ['Creative Keepsake', 'Works with standard bricks, turning a quiz route into a hands-on sculpture challenge.']
    ],
    camPos: [145, -165, 250],
    camTarget: [0, 24, 34],
    mode: 'bricks'
  },
  {
    kicker: 'CUSTOMIZABLE BY THE MUSEUM',
    title: 'Modular for <em>any exhibition.</em>',
    lead: 'The entire system is designed to be adapted by museum staff for different spaces, themes, and visitors.',
    bullets: [
      ['Indoor & Outdoor', 'Adjust BLE beacon range and enclosure seals for indoor galleries or outdoor monument trails.'],
      ['Any Age Group', 'Swap NFC station cards and questions for young kids, families, or adult history tours.'],
      ['Zero Re-Engineering', 'Reconfigure routes, tile sets, and themes between exhibitions in minutes.']
    ],
    camPos: [175, -185, 285],
    camTarget: [0, 0, 14],
    mode: 'modular'
  },
  {
    kicker: 'HARDWARE ARCHITECTURE',
    title: 'Inside the <em>1:1 CAD.</em>',
    lead: 'An exploded X-ray view of the real enclosure and manufacturer-sourced electronics stack.',
    bullets: [
      ['Exploded Stack', '12×12 stud plate (+90 mm), lid & buttons (+60 mm), and PCB/OLED stack (+22 mm).'],
      ['Internal Layout', 'nRF54L15 DK, 0.96″ OLED display, tactile switches, and buzzer mounted on custom internal supports.']
    ],
    camPos: [220, -240, 270],
    camTarget: [0, 0, 42],
    mode: 'exploded'
  },
  {
    kicker: 'THE TEAM',
    title: 'Built by <em>our team.</em>',
    lead: 'Thank you for listening! We’d love to show you the live hardware and web simulator.',
    bullets: [],
    team: [
      { initials: 'AG', name: 'Alexandru Gutu', role: 'Mechatronics Engineering' },
      { initials: 'FF', name: 'Franciszek Florjanczyk', role: 'Electrical Engineering' },
      { initials: 'PB', name: 'Peter Andras Ban', role: 'Software Engineering' },
      { initials: 'SG', name: 'Simeone Gentile', role: 'Software Engineering' }
    ],
    camPos: [175, -185, 290],
    camTarget: [0, 0, 14],
    mode: 'team'
  }
];

const kickerEl = document.getElementById('slide-kicker');
const titleEl = document.getElementById('slide-title');
const leadEl = document.getElementById('slide-lead');
const bulletsEl = document.getElementById('slide-bullets');
const teamGridEl = document.getElementById('team-grid');
const counterEl = document.getElementById('slide-counter');
const dotsEl = document.getElementById('slide-dots');
const prevBtn = document.getElementById('prev-slide');
const nextBtn = document.getElementById('next-slide');
const fsBtn = document.getElementById('fullscreen-btn');
const visualEl = document.querySelector('.slide-visual');
const loadingEl = document.getElementById('deck-loading');

SLIDES.forEach((s, i) => {
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.className = 'dot-btn';
  dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
  dot.onclick = () => goToSlide(i);
  dotsEl.append(dot);
});

// Three.js Setup
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
visualEl.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 1, 2000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 70;
controls.maxDistance = 650;

let userInteracting = false;
controls.addEventListener('start', () => { userInteracting = true; });
controls.addEventListener('end', () => { userInteracting = false; });

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

const turntableGroup = new THREE.Group();
scene.add(turntableGroup);

const deviceRoot = new THREE.Group();
deviceRoot.position.set(-70, -96, -14);
turntableGroup.add(deviceRoot);

const baseGroup = new THREE.Group();
const hardwareGroup = new THREE.Group();
const lidGroup = new THREE.Group();
const plateGroup = new THREE.Group();
deviceRoot.add(baseGroup, hardwareGroup, lidGroup, plateGroup);

const matBase = new THREE.MeshStandardMaterial({ color: 0x28364d, roughness: 0.32, metalness: 0.05 });
const matLid = new THREE.MeshStandardMaterial({ color: 0x35445b, roughness: 0.30, metalness: 0.05 });
const matPlate = new THREE.MeshStandardMaterial({ color: 0xd7c9ae, roughness: 0.28, metalness: 0.02 });
const matNrfPcb = new THREE.MeshStandardMaterial({ color: 0x277a99, roughness: 0.42, metalness: 0.12 });
const matOledPcb = new THREE.MeshStandardMaterial({ color: 0x208064, roughness: 0.42, metalness: 0.12 });
const matOledGlass = new THREE.MeshStandardMaterial({ color: 0x0c1b24, roughness: 0.10, metalness: 0.15 });
const matSwitch = new THREE.MeshStandardMaterial({ color: 0xa9abb0, roughness: 0.30, metalness: 0.55 });
const matBuzzer = new THREE.MeshStandardMaterial({ color: 0xc38b42, roughness: 0.40, metalness: 0.35, side: THREE.DoubleSide });

// Live 128x64 OLED
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

// NFC Pad
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

// BLE signal waves
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

// 3x3 Tiles
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

const flyingTile = createTileMesh(4);
flyingTile.visible = false;
deviceRoot.add(flyingTile);

const flyingTile2 = createTileMesh(7);
flyingTile2.visible = false;
deviceRoot.add(flyingTile2);

// 3D LEGO-style brick sculpture for Slide 9 ('bricks' mode)
const sculptureGroup = new THREE.Group();
sculptureGroup.visible = false;
plateGroup.add(sculptureGroup);

const brickPalette = [0x8c929a, 0x767c84, 0x006db7, 0xffcf00, 0x5c8a3c];
const brickSpecs = [
  // [cx, cy, zBase, w, h, d, colorIdx] — aligned to the 8 mm stud grid with zero overlap
  [70, 124, 31.45, 64, 64, 9.6, 4],   // 8x8 green base (X 38..102, Y 92..156)
  [70, 124, 41.05, 32, 32, 9.6, 0],   // 4x4 stone tier 1 (X 54..86, Y 108..140)
  [46, 100, 41.05, 16, 16, 9.6, 2],   // 2x2 blue accent brick (X 38..54, Y 92..108)
  [94, 148, 41.05, 16, 16, 9.6, 3],   // 2x2 yellow accent brick (X 86..102, Y 140..156)
  [70, 124, 50.65, 32, 16, 9.6, 1],   // 4x2 stone tier 2
  [70, 124, 60.25, 16, 16, 9.6, 0]    // 2x2 stone peak
];
const sculptureBricks = brickSpecs.map(([cx, cy, zBase, w, h, d, cIdx]) => {
  const grp = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: brickPalette[cIdx], roughness: 0.28, metalness: 0.04 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, h - 0.3, d), mat);
  body.castShadow = true;
  body.receiveShadow = true;
  grp.add(body);
  // Add studs on top of each brick (8 mm pitch)
  const cols = Math.floor(w / 8);
  const rows = Math.floor(h / 8);
  const studGeom = new THREE.CylinderGeometry(2.4, 2.4, 1.8, 16);
  studGeom.rotateX(Math.PI / 2);
  for (let ix = 0; ix < cols; ix++) {
    for (let iy = 0; iy < rows; iy++) {
      const stud = new THREE.Mesh(studGeom, mat);
      stud.position.set(
        (ix - (cols - 1) / 2) * 8,
        (iy - (rows - 1) / 2) * 8,
        d / 2 + 0.9
      );
      grp.add(stud);
    }
  }
  grp.userData = { cx, cy, targetZ: zBase + d / 2 };
  grp.position.set(cx, cy, zBase + d / 2);
  sculptureGroup.add(grp);
  return grp;
});

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

// Slide State & Navigation
let currentSlide = 0;
let slideTime = 0;
let camFromPos = new THREE.Vector3(...SLIDES[0].camPos);
let camFromTarget = new THREE.Vector3(...SLIDES[0].camTarget);
let camLerpT = 1;

camera.position.copy(camFromPos);
controls.target.copy(camFromTarget);
controls.update();

function goToSlide(index) {
  const clamped = Math.max(0, Math.min(SLIDES.length - 1, index));
  if (clamped === currentSlide && slideTime > 0) return;
  currentSlide = clamped;
  slideTime = 0;
  camFromPos.copy(camera.position);
  camFromTarget.copy(controls.target);
  camLerpT = 0;

  const s = SLIDES[currentSlide];
  kickerEl.textContent = s.kicker;
  titleEl.innerHTML = s.title;
  leadEl.textContent = s.lead;
  bulletsEl.hidden = s.bullets.length === 0;
  bulletsEl.innerHTML = s.bullets
    .map(([label, text]) => `<li><b>${label}</b><span>${text}</span></li>`)
    .join('');
  if (s.team) {
    teamGridEl.hidden = false;
    teamGridEl.innerHTML = s.team
      .map(m => `<div class="team-card"><div class="team-avatar">${m.initials}</div><div><strong>${m.name}</strong>${m.role ? `<span>${m.role}</span>` : ''}</div></div>`)
      .join('');
  } else {
    teamGridEl.hidden = true;
    teamGridEl.innerHTML = '';
  }
  counterEl.textContent = `${currentSlide + 1} / ${SLIDES.length}`;

  prevBtn.disabled = currentSlide === 0;
  nextBtn.disabled = currentSlide === SLIDES.length - 1;

  dotsEl.querySelectorAll('.dot-btn').forEach((d, i) => {
    d.classList.toggle('active', i === currentSlide);
  });
}

prevBtn.onclick = () => goToSlide(currentSlide - 1);
nextBtn.onclick = () => goToSlide(currentSlide + 1);

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}
fsBtn.onclick = toggleFullscreen;

document.addEventListener('keydown', e => {
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
    e.preventDefault();
    goToSlide(currentSlide + 1);
  } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
    e.preventDefault();
    goToSlide(currentSlide - 1);
  } else if (e.key.toLowerCase() === 'f') {
    toggleFullscreen();
  }
});

goToSlide(0);

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

function resize() {
  const w = visualEl.clientWidth;
  const h = visualEl.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
new ResizeObserver(resize).observe(visualEl);
resize();

let lastTime = performance.now();
let explodeCurrent = 0;
let lastNfcState = false;

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  slideTime += dt;

  const s = SLIDES[currentSlide];
  const loop = (slideTime % 5.0) / 5.0; // smooth 5s loop per slide

  if (!userInteracting && camLerpT < 1) {
    camLerpT = Math.min(1, camLerpT + dt * 1.6);
    const ease = 1 - Math.pow(1 - camLerpT, 3);
    camera.position.lerpVectors(camFromPos, new THREE.Vector3(...s.camPos), ease);
    controls.target.lerpVectors(camFromTarget, new THREE.Vector3(...s.camTarget), ease);
  }

  // Continuous 360° turntable rotation on intro, inspiration, exploded, modular, and team slides
  if (['inspiration', 'intro', 'exploded', 'modular', 'team'].includes(s.mode)) {
    turntableGroup.rotation.y += dt * 0.55;
  } else {
    // Wrap angle to [-PI, PI] so it always takes the shortest smooth path to 0
    turntableGroup.rotation.y = Math.atan2(
      Math.sin(turntableGroup.rotation.y),
      Math.cos(turntableGroup.rotation.y)
    );
    turntableGroup.rotation.y += (0 - turntableGroup.rotation.y) * Math.min(1, dt * 4.0);
  }

  let explodeTarget = 0;
  let xray = false;
  let nfcReady = false;
  let btnBPress = 0;
  flyingTile.visible = false;
  flyingTile2.visible = false;
  for (const w of bleWaves) w.material.opacity = 0;

  // Visitors start with 0 tiles attached; tiles appear as they are snapped/completed
  const completed = ['return', 'exploded', 'modular', 'team'].includes(s.mode);
  for (let i = 0; i < 9; i++) {
    tileMeshes[i].visible = completed;
  }
  sculptureGroup.visible = s.mode === 'bricks';

  if (s.mode === 'inspiration' || s.mode === 'intro' || s.mode === 'pickup') {
    drawOLED('searching');
  } else if (s.mode === 'ble') {
    drawOLED('proximity', Math.min(1, loop * 1.25));
    bleWaves.forEach((ring, idx) => {
      const wavePhase = ((now * 0.0012 + idx * 0.33) % 1);
      const scale = 0.6 + wavePhase * 1.4;
      ring.scale.set(scale, scale, 1);
      ring.material.opacity = (1 - wavePhase) * 0.45;
    });
  } else if (s.mode === 'nfc') {
    nfcReady = true;
    const tap = loop < 0.55 ? Math.sin((loop / 0.55) * Math.PI * 0.5) : 1;
    const lift = loop < 0.65 ? (1 - tap) * 28 : (loop - 0.65) * 40;
    flyingTile.visible = true;
    flyingTile.position.set(63, 43, 28.0 + lift);
    flyingTile.rotation.set(0, 0, (1 - tap) * 0.25);
    drawOLED(loop > 0.48 ? 'question' : 'proximity', 1);
  } else if (s.mode === 'answer') {
    const pressing = loop > 0.28 && loop < 0.52;
    btnBPress = pressing ? -0.45 : 0;
    if (buttonMaterials.B) {
      buttonMaterials.B.emissive.setHex(pressing ? 0x3b2f10 : 0x151107);
    }
    drawOLED(loop > 0.38 ? 'correct' : 'question');
  } else if (s.mode === 'snap') {
    drawOLED('correct');
    if (loop < 0.5) {
      const t = Math.min(1, loop / 0.42);
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
      const t = Math.min(1, (loop - 0.5) / 0.42);
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
  } else if (s.mode === 'return' || s.mode === 'team') {
    drawOLED('complete');
  } else if (s.mode === 'exploded') {
    drawOLED('complete');
    explodeTarget = 1;
    xray = loop > 0.35;
  } else if (s.mode === 'bricks') {
    drawOLED('complete');
    // Staggered brick drop animation building the 3D sculpture
    sculptureBricks.forEach((brick, idx) => {
      const start = idx * 0.11;
      const t = Math.max(0, Math.min(1, (loop - start) / 0.22));
      const ease = 1 - Math.pow(1 - t, 3);
      brick.visible = loop >= start;
      brick.position.z = brick.userData.targetZ + (1 - ease) * 45;
    });
  } else if (s.mode === 'modular') {
    drawOLED('searching');
    bleWaves.forEach((ring, idx) => {
      const wavePhase = ((now * 0.001 + idx * 0.33) % 1);
      const scale = 0.6 + wavePhase * 1.3;
      ring.scale.set(scale, scale, 1);
      ring.material.opacity = (1 - wavePhase) * 0.35;
    });
  }

  explodeCurrent += (explodeTarget - explodeCurrent) * Math.min(1, dt * 4.5);
  // Shift rotation pivot to the center of the exploded stack (z = +42) when exploded
  turntableGroup.position.z = explodeCurrent * 42;
  deviceRoot.position.z = -14 - explodeCurrent * 42;
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
