(function() {
const { THREE, PLYLoader, OrbitControls } = window.THREE_CAD;

const viewport = document.querySelector('.device-viewport');
const oledCanvas = document.getElementById('oled');

if (!viewport || !oledCanvas) {
  console.warn('CAD viewer: missing .device-viewport or #oled');
} else {
  initCADViewer(viewport, oledCanvas);
}

function initCADViewer(viewport, oledCanvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    console.warn('WebGL unavailable, keeping 2D fallback:', err);
    return;
  }

  document.body.classList.add('cad-active');

  // Build 3D container & toolbar inside .device-viewport
  const wrap = document.createElement('div');
  wrap.className = 'cad-wrap';

  const statusEl = document.createElement('div');
  statusEl.className = 'cad-loading';
  statusEl.textContent = 'Loading 1:1 CAD assembly…';

  const toolbar = document.createElement('div');
  toolbar.className = 'cad-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', '3D CAD camera and assembly views');
  toolbar.innerHTML = `
    <button type="button" class="cad-btn active" data-view="front">Front</button>
    <button type="button" class="cad-btn" data-view="hero">3/4 Hero</button>
    <button type="button" class="cad-btn" data-view="exploded">Exploded</button>
    <button type="button" class="cad-btn" data-view="xray">X-Ray</button>
  `;

  wrap.append(renderer.domElement, statusEl, toolbar);
  viewport.prepend(wrap);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(32, 1, 1, 2000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 140;
  controls.maxDistance = 650;

  // Studio 3-point lighting matching render_studio.py
  const hemi = new THREE.HemisphereLight(0xf6f4ee, 0x3b424d, 0.95);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xfffaf0, 1.85);
  keyLight.position.set(-180, 160, 320);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 50;
  keyLight.shadow.camera.far = 700;
  const d = 140;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xdce8f8, 0.85);
  fillLight.position.set(220, -60, 220);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.95);
  rimLight.position.set(-60, 240, -180);
  scene.add(rimLight);

  // Root centered at CAD enclosure midpoint (70, 96, 14)
  const deviceRoot = new THREE.Group();
  deviceRoot.position.set(-70, -96, -14);
  scene.add(deviceRoot);

  // Sub-groups for exploded animation
  const baseGroup = new THREE.Group();
  const hardwareGroup = new THREE.Group();
  const lidGroup = new THREE.Group();
  const plateGroup = new THREE.Group();
  deviceRoot.add(baseGroup, hardwareGroup, lidGroup, plateGroup);

  // Materials matching cad/jelling-handheld/render_studio.py
  const matBase = new THREE.MeshStandardMaterial({ color: 0x28364d, roughness: 0.32, metalness: 0.05 });
  const matLid = new THREE.MeshStandardMaterial({ color: 0x35445b, roughness: 0.30, metalness: 0.05 });
  const matPlate = new THREE.MeshStandardMaterial({ color: 0xd7c9ae, roughness: 0.28, metalness: 0.02 });
  const matNrfPcb = new THREE.MeshStandardMaterial({ color: 0x277a99, roughness: 0.42, metalness: 0.12 });
  const matOledPcb = new THREE.MeshStandardMaterial({ color: 0x208064, roughness: 0.42, metalness: 0.12 });
  const matOledGlass = new THREE.MeshStandardMaterial({ color: 0x0c1b24, roughness: 0.10, metalness: 0.15 });
  const matSwitch = new THREE.MeshStandardMaterial({ color: 0xa9abb0, roughness: 0.30, metalness: 0.55 });
  const matBuzzer = new THREE.MeshStandardMaterial({ color: 0xc38b42, roughness: 0.40, metalness: 0.35, side: THREE.DoubleSide });

  const buttonMaterials = {};
  const buttonMeshes = {};
  const buttonBaseZ = {};
  const buttonPressTarget = { A: 0, B: 0, C: 0, D: 0 };
  const buttonPressCurrent = { A: 0, B: 0, C: 0, D: 0 };

  // Live OLED texture from #oled canvas
  const oledTexture = new THREE.CanvasTexture(oledCanvas);
  oledTexture.minFilter = THREE.NearestFilter;
  oledTexture.magFilter = THREE.NearestFilter;
  oledTexture.colorSpace = THREE.SRGBColorSpace;
  oledTexture.generateMipmaps = false;

  const oledScreenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(21.74, 10.86),
    new THREE.MeshBasicMaterial({ map: oledTexture })
  );
  // Active area on reference_oled_panel.ply (center 109.35, 37.00, front glass z = 25.90)
  oledScreenMesh.position.set(109.35, 37.00, 25.95);
  hardwareGroup.add(oledScreenMesh);

  // Interactive NFC scan pad inside lid recess [63, 43, 25, 28] at z = 26.65
  const nfcCanvas = document.createElement('canvas');
  nfcCanvas.width = 256;
  nfcCanvas.height = 286;
  const nfcCtx = nfcCanvas.getContext('2d');
  drawNfcPad(nfcCtx, false);
  const nfcTexture = new THREE.CanvasTexture(nfcCanvas);
  nfcTexture.colorSpace = THREE.SRGBColorSpace;
  const nfcMat = new THREE.MeshStandardMaterial({
    map: nfcTexture,
    roughness: 0.35,
    metalness: 0.05,
    transparent: true,
    emissive: new THREE.Color(0x000000)
  });
  const nfcMesh = new THREE.Mesh(new THREE.PlaneGeometry(21.0, 24.0), nfcMat);
  nfcMesh.position.set(63.0, 43.0, 26.75);
  nfcMesh.userData = { action: 'scan' };
  lidGroup.add(nfcMesh);

  // 4 Button cap decals (A, B, C, D) in standard reading order:
  // Top row: A (left), B (right); Bottom row: C (left), D (right)
  const buttonPositions = {
    A: [18.5580, 41.0824],
    B: [28.0576, 41.0824],
    C: [18.5580, 30.8208],
    D: [28.0576, 30.8208]
  };
  const buttonGroups = {};
  for (const letter of ['A', 'B', 'C', 'D']) {
    const grp = new THREE.Group();
    lidGroup.add(grp);
    buttonGroups[letter] = grp;

    const capCanvas = document.createElement('canvas');
    capCanvas.width = 128;
    capCanvas.height = 128;
    const cctx = capCanvas.getContext('2d');
    cctx.clearRect(0, 0, 128, 128);
    cctx.fillStyle = '#28364d';
    cctx.font = 'bold 74px Arial, sans-serif';
    cctx.textAlign = 'center';
    cctx.textBaseline = 'middle';
    cctx.fillText(letter, 64, 68);
    const capTex = new THREE.CanvasTexture(capCanvas);
    capTex.colorSpace = THREE.SRGBColorSpace;
    const capDecal = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 5.6),
      new THREE.MeshBasicMaterial({ map: capTex, transparent: true })
    );
    const [bx, by] = buttonPositions[letter];
    capDecal.position.set(bx, by, 31.14);
    capDecal.userData = { action: 'answer', letter };
    grp.add(capDecal);
  }

  // 3x3 Picture Tiles on the 12x12 stud plate (center 70, 124, stud top z = 31.45)
  const tileMeshes = [];
  const slotFrames = [];
  const tileImg = new Image();
  let stoneTexture = null;
  tileImg.onload = () => {
    const stoneCanvas = document.createElement('canvas');
    stoneCanvas.width = 1024;
    stoneCanvas.height = 1024;
    const sctx = stoneCanvas.getContext('2d');
    sctx.drawImage(tileImg, 0, 0, 1024, 1024);
    stoneTexture = new THREE.CanvasTexture(stoneCanvas);
    stoneTexture.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < 9; i++) {
      tileMeshes[i].material[4].map = stoneTexture;
      tileMeshes[i].material[4].color.setHex(0xffffff);
      tileMeshes[i].material[4].needsUpdate = true;
    }
  };
  tileImg.src = window.JELLING_STONE_SVG || 'assets/stone.svg';

  const sideTileMat = new THREE.MeshStandardMaterial({ color: 0xd7c9ae, roughness: 0.3, metalness: 0.02 });
  for (let i = 0; i < 9; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = 70 + (col - 1) * 32.0;
    const cy = 124 + (1 - row) * 32.0;

    const geom = new THREE.BoxGeometry(31.2, 31.2, 1.8);
    // Slice UV on the +Z front face (face index 4 in BoxGeometry: +x, -x, +y, -y, +z, -z)
    const uvAttr = geom.attributes.uv;
    const u0 = col / 3;
    const u1 = (col + 1) / 3;
    const v1 = 1 - row / 3;
    const v0 = 1 - (row + 1) / 3;
    // +Z face vertices are indices 16..19
    uvAttr.setXY(16, u0, v1);
    uvAttr.setXY(17, u1, v1);
    uvAttr.setXY(18, u0, v0);
    uvAttr.setXY(19, u1, v0);
    uvAttr.needsUpdate = true;

    const topMat = new THREE.MeshStandardMaterial({ color: 0xded4be, roughness: 0.28, metalness: 0.02 });
    const mats = [sideTileMat, sideTileMat, sideTileMat, sideTileMat, topMat, sideTileMat];
    const tile = new THREE.Mesh(geom, mats);
    tile.position.set(cx, cy, 32.35);
    tile.castShadow = true;
    tile.receiveShadow = true;
    plateGroup.add(tile);
    tileMeshes.push(tile);

    // Interactive slot frame when empty/attachable
    const frameMat = new THREE.MeshBasicMaterial({
      color: 0xffcf00,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(31.2, 31.2), frameMat);
    frame.position.set(cx, cy, 31.52);
    frame.userData = { action: 'attach', slotIndex: i };
    plateGroup.add(frame);
    slotFrames.push(frame);
  }

  // Load actual PLY CAD meshes
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
    partSpecs.push({
      file: meshFile,
      group: buttonGroups[letter],
      mat: bmat,
      offset,
      castShadow: true,
      receiveShadow: true,
      buttonLetter: letter
    });
  }

  let scanReady = false;
  let loadedCount = 0;
  function attachPart(spec, geom) {
    if (!geom.attributes.normal) geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, spec.mat);
    if (spec.offset) mesh.position.set(...spec.offset);
    if (spec.castShadow) mesh.castShadow = true;
    if (spec.receiveShadow) mesh.receiveShadow = true;
    if (spec.buttonLetter) {
      mesh.userData = { action: 'answer', letter: spec.buttonLetter };
      buttonMeshes[spec.buttonLetter] = mesh;
      buttonBaseZ[spec.buttonLetter] = 0;
    }
    spec.group.add(mesh);
    loadedCount++;
    if (loadedCount === partSpecs.length) {
      statusEl.classList.add('done');
      syncFromDOM();
    }
  }
  for (const spec of partSpecs) {
    const buf = window.decodeCADMesh?.(spec.file);
    if (buf) {
      attachPart(spec, loader.parse(buf));
    } else {
      loader.load(
        `assets/cad/${spec.file}`,
        geom => attachPart(spec, geom),
        undefined,
        err => console.error(`Failed to load CAD mesh ${spec.file}:`, err)
      );
    }
  }

  // Camera & assembly view presets
  const views = {
    front: { pos: new THREE.Vector3(-8, -36, 430), target: new THREE.Vector3(0, -8, 12), explode: 0, xray: false },
    hero: { pos: new THREE.Vector3(185, -195, 275), target: new THREE.Vector3(0, 0, 14), explode: 0, xray: false },
    exploded: { pos: new THREE.Vector3(230, -260, 285), target: new THREE.Vector3(0, 0, 42), explode: 1, xray: false },
    xray: { pos: new THREE.Vector3(155, -160, 260), target: new THREE.Vector3(0, 0, 12), explode: 0, xray: true }
  };

  let explodeTarget = 0;
  let explodeCurrent = 0;
  let xrayActive = false;
  let cameraAnim = null;

  function applyView(name) {
    const v = views[name];
    if (!v) return;
    explodeTarget = v.explode;
    xrayActive = v.xray;
    matBase.transparent = xrayActive;
    matBase.opacity = xrayActive ? 0.22 : 1.0;
    matBase.depthWrite = !xrayActive;
    matLid.transparent = xrayActive;
    matLid.opacity = xrayActive ? 0.22 : 1.0;
    matLid.depthWrite = !xrayActive;

    cameraAnim = {
      fromPos: camera.position.clone(),
      toPos: v.pos.clone(),
      fromTarget: controls.target.clone(),
      toTarget: v.target.clone(),
      t: 0
    };

    toolbar.querySelectorAll('.cad-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === name);
    });
  }

  // Set initial front view immediately
  camera.position.copy(views.front.pos);
  controls.target.copy(views.front.target);
  controls.update();

  toolbar.addEventListener('click', event => {
    const btn = event.target.closest('[data-view]');
    if (btn) applyView(btn.dataset.view);
  });

  // Resize observer to keep WebGL sharp at any viewport size
  function resize() {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(wrap);
  resize();

  // Raycasting for 3D buttons, NFC pad, and attachable tiles
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerDownPos = null;

  function getInteractiveObjects() {
    const objs = [nfcMesh];
    for (const letter of ['A', 'B', 'C', 'D']) {
      if (buttonMeshes[letter]) objs.push(buttonMeshes[letter]);
    }
    for (const frame of slotFrames) {
      if (frame.userData.attachable) objs.push(frame);
    }
    return objs;
  }

  function hitTest(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(getInteractiveObjects(), false);
    return hits[0]?.object || null;
  }

  renderer.domElement.addEventListener('pointerdown', e => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  });

  renderer.domElement.addEventListener('pointermove', e => {
    const hit = hitTest(e.clientX, e.clientY);
    let clickable = false;
    if (hit?.userData?.action === 'answer') {
      const btn = document.querySelector(`.answer[data-answer="${hit.userData.letter}"]`);
      clickable = Boolean(btn && !btn.disabled);
    } else if (hit?.userData?.action === 'scan') {
      const pad = document.getElementById('scan-pad');
      clickable = pad?.getAttribute('aria-disabled') === 'false';
    } else if (hit?.userData?.action === 'attach') {
      clickable = Boolean(hit.userData.attachable);
    }
    renderer.domElement.style.cursor = clickable ? 'pointer' : 'grab';
  });

  renderer.domElement.addEventListener('pointerup', e => {
    if (!pointerDownPos) return;
    const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
    pointerDownPos = null;
    if (moved > 6) return; // Was an orbit drag, not a click

    const hit = hitTest(e.clientX, e.clientY);
    if (!hit) return;
    const { action, letter, slotIndex } = hit.userData;
    if (action === 'answer') {
      const btn = document.querySelector(`.answer[data-answer="${letter}"]`);
      if (btn && !btn.disabled) btn.click();
    } else if (action === 'scan') {
      document.getElementById('scan-pad')?.click();
    } else if (action === 'attach' && hit.userData.attachable) {
      hit.userData.domTile?.click();
    }
  });

  // Sync 3D model state from the DOM / app.js
  function syncFromDOM() {
    oledTexture.needsUpdate = true;

    // Sync 3x3 tiles from #plate DOM
    const domTiles = document.querySelectorAll('#plate .tile');
    domTiles.forEach((domTile, i) => {
      if (!tileMeshes[i]) return;
      const isEmpty = domTile.classList.contains('empty');
      const isAttachable = domTile.classList.contains('attachable');
      tileMeshes[i].visible = !isEmpty;
      slotFrames[i].visible = isEmpty;
      slotFrames[i].userData.attachable = isAttachable;
      slotFrames[i].userData.domTile = isAttachable ? domTile : null;
      slotFrames[i].material.color.setHex(isAttachable ? 0xffcf00 : 0x202b3e);
      slotFrames[i].material.opacity = isAttachable ? 0.35 : 0.08;
    });

    // Sync A-D button states & press animations
    for (const letter of ['A', 'B', 'C', 'D']) {
      const btn = document.querySelector(`.answer[data-answer="${letter}"]`);
      const pressed = btn?.classList.contains('pressed');
      buttonPressTarget[letter] = pressed ? -0.45 : 0;
      if (buttonMaterials[letter]) {
        const enabled = btn && !btn.disabled;
        buttonMaterials[letter].emissive.setHex(enabled ? 0x1c170b : 0x000000);
      }
    }

    // Sync NFC scan pad state
    const pad = document.getElementById('scan-pad');
    const ready = pad?.getAttribute('aria-disabled') === 'false';
    if (ready !== scanReady) {
      scanReady = ready;
      drawNfcPad(nfcCtx, ready);
      nfcTexture.needsUpdate = true;
    }
  }

  window.jellingCAD = { sync: syncFromDOM, setView: applyView };
  syncFromDOM();

  // Animation loop
  let lastTime = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // Smooth camera preset transitions
    if (cameraAnim) {
      cameraAnim.t = Math.min(cameraAnim.t + dt * 3.2, 1);
      const ease = 1 - Math.pow(1 - cameraAnim.t, 3);
      camera.position.lerpVectors(cameraAnim.fromPos, cameraAnim.toPos, ease);
      controls.target.lerpVectors(cameraAnim.fromTarget, cameraAnim.toTarget, ease);
      if (cameraAnim.t >= 1) cameraAnim = null;
    }

    // Smooth exploded view interpolation (matching render-info.json distances)
    explodeCurrent += (explodeTarget - explodeCurrent) * Math.min(1, dt * 8);
    hardwareGroup.position.z = explodeCurrent * 22;
    lidGroup.position.z = explodeCurrent * 60;
    plateGroup.position.z = explodeCurrent * 90;

    // Smooth physical button travel (-0.45 mm along Z)
    for (const letter of ['A', 'B', 'C', 'D']) {
      buttonPressCurrent[letter] += (buttonPressTarget[letter] - buttonPressCurrent[letter]) * Math.min(1, dt * 24);
      buttonGroups[letter].position.z = buttonPressCurrent[letter];
    }

    // Subtle pulse on attachable slots and ready NFC pad
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);
    for (const frame of slotFrames) {
      if (frame.userData.attachable) {
        frame.material.opacity = 0.22 + pulse * 0.28;
      }
    }
    if (scanReady) {
      nfcMat.emissive.setRGB(0.05 + pulse * 0.10, 0.14 + pulse * 0.18, 0.08 + pulse * 0.10);
    } else {
      nfcMat.emissive.setRGB(0, 0, 0);
    }

    controls.update();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

function drawNfcPad(ctx, ready) {
  ctx.clearRect(0, 0, 256, 286);
  ctx.fillStyle = ready ? '#1b4332' : '#263349';
  ctx.strokeStyle = ready ? '#52b788' : '#778295';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 270, 26);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = ready ? '#d8f3dc' : '#aeb7be';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // N glyph + waves
  ctx.beginPath();
  ctx.moveTo(96, 178);
  ctx.lineTo(96, 94);
  ctx.lineTo(160, 178);
  ctx.lineTo(160, 94);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(104, 136, 46, Math.PI * 0.72, Math.PI * 1.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(152, 136, 46, -Math.PI * 0.28, Math.PI * 0.28);
  ctx.stroke();

  ctx.fillStyle = ready ? '#d8f3dc' : '#aeb7be';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NFC', 128, 236);
}
})();
