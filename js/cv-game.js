/* CV interactivo en 3D (Three.js).
   Un pequeño robot recorre un mundo de "centro de datos". Cada estación es una
   sección del CV; los orbes son tecnologías que se pueden recoger. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const ACCENT = 0x4ade80;
const CYAN = 0x22d3ee;
const BG = 0x070b12;
const STEP = 16;              // distancia entre estaciones
const NEAR = 4.2;             // radio para activar una estación

export function createGame(root, opts) {
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('nowebgl');

  let { stations, orbs, ui } = opts;
  const N = stations.length;

  /* ================= HUD (HTML sobre el canvas) ================= */
  root.innerHTML = `
    <div class="g-canvas"></div>
    <div class="g-hud">
      <div class="g-top">
        <div class="g-stat"><span data-ui="sections"></span><strong class="g-sec">0/${N}</strong><i class="g-bar"><b class="g-secbar"></b></i></div>
        <div class="g-stat"><span data-ui="orbs"></span><strong class="g-orb">0/${orbs.length}</strong></div>
        <button class="g-btn g-exit" type="button" data-act="exit">✕ <span data-ui="exit"></span></button>
      </div>
      <p class="g-hint" data-ui="hint"></p>
      <aside class="g-panel" aria-live="polite"></aside>
      <div class="g-nav">
        <button class="g-btn" type="button" data-act="prev">◀ <span data-ui="prev"></span></button>
        <button class="g-btn g-btn--primary" type="button" data-act="next"><span data-ui="next"></span> ▶</button>
      </div>
      <div class="g-joy" aria-hidden="true"><span></span></div>
      <div class="g-toast" role="status"></div>
      <div class="g-overlay g-intro">
        <div class="g-card">
          <div class="g-card__icon">🎮</div>
          <h2 data-ui="intro_title"></h2>
          <p data-ui="intro_text"></p>
          <ul class="g-keys">
            <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> <span data-ui="intro_keys"></span></li>
            <li>🕹️ <span data-ui="intro_touch"></span></li>
            <li>▶ <span data-ui="intro_auto"></span></li>
          </ul>
          <button class="g-btn g-btn--primary g-btn--big" type="button" data-act="start" data-ui="start"></button>
        </div>
      </div>
      <div class="g-overlay g-end" hidden>
        <div class="g-card">
          <div class="g-card__icon">🏆</div>
          <h2 data-ui="end_title"></h2>
          <p data-ui="end_text"></p>
          <p class="g-end__stats"></p>
          <div class="g-end__btns">
            <button class="g-btn g-btn--primary" type="button" data-act="contact" data-ui="end_contact"></button>
            <button class="g-btn" type="button" data-act="text" data-ui="end_text_btn"></button>
            <button class="g-btn" type="button" data-act="replay" data-ui="end_replay"></button>
          </div>
        </div>
      </div>
    </div>`;
  const q = s => root.querySelector(s);
  const host = q('.g-canvas');
  const panel = q('.g-panel');
  const applyUi = () => root.querySelectorAll('[data-ui]').forEach(el => { el.textContent = ui[el.dataset.ui] ?? ''; });
  applyUi();

  /* ================= Escena ================= */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 26, 78);

  const camera = new THREE.PerspectiveCamera(55, host.clientWidth / host.clientHeight, 0.1, 220);

  scene.add(new THREE.HemisphereLight(0xa5dcff, 0x0a0f18, 1.3));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
  scene.add(sun, sun.target);

  // Suelo + rejilla
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(500, 200, 0x1b4040, 0x111c29);
  grid.position.y = 0.01;
  scene.add(grid);

  // Ruta
  const pts = stations.map((_, i) => new THREE.Vector3(Math.sin(i * 1.3) * 9, 0, -i * STEP));
  const startPos = new THREE.Vector3(pts[0].x, 0, 11);
  const curve = new THREE.CatmullRomCurve3([startPos.clone(), ...pts, pts[N - 1].clone().add(new THREE.Vector3(0, 0, -10))]);
  const curveLen = curve.getLength();
  const zMin = pts[N - 1].z - 24, zMax = startPos.z + 8;

  {
    const count = Math.floor(curveLen / 1.15);
    const tiles = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.7, 0.06, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x0f2a2a, emissive: CYAN, emissiveIntensity: 0.45 }),
      count);
    const m = new THREE.Matrix4(), qt = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    for (let k = 0; k < count; k++) {
      const u = k / (count - 1), p = curve.getPointAt(u), tan = curve.getTangentAt(u);
      qt.setFromAxisAngle(up, Math.atan2(tan.x, tan.z));
      m.compose(p.setY(0.035), qt, one);
      tiles.setMatrixAt(k, m);
    }
    tiles.receiveShadow = true;
    scene.add(tiles);
  }
  const samples = curve.getSpacedPoints(160);
  const distToPath = (x, z) => samples.reduce((min, p) => Math.min(min, Math.hypot(p.x - x, p.z - z)), Infinity);

  /* ---------- Texturas generadas ---------- */
  function labelTexture(text, { size = 44, color = '#e7ecf3', border = '#4ade80' } = {}) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    ctx.font = `600 ${size}px system-ui, "Segoe UI", sans-serif`;
    const w = Math.ceil(ctx.measureText(text).width) + 64, h = size + 40;
    c.width = w; c.height = h;
    ctx.font = `600 ${size}px system-ui, "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(7,11,18,0.82)';
    ctx.strokeStyle = border; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 4, h / 2 - 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return { tex, aspect: w / h };
  }
  function makeLabel(text, height, opts2) {
    const { tex, aspect } = labelTexture(text, opts2);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.scale.set(height * aspect, height, 1);
    s.renderOrder = 10;
    return s;
  }
  function setLabel(sprite, text, height, opts2) {
    const { tex, aspect } = labelTexture(text, opts2);
    sprite.material.map.dispose();
    sprite.material.map = tex;
    sprite.scale.set(height * aspect, height, 1);
  }
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
  })();

  /* ---------- Estaciones ---------- */
  const stationLabel = (s, i) => `${String(i + 1).padStart(2, '0')} · ${s.label}`;
  const stationObjs = stations.map((s, i) => {
    const color = new THREE.Color(i % 2 ? CYAN : ACCENT);
    const g = new THREE.Group();
    g.position.copy(pts[i]);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.3, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0x121b2b, metalness: 0.5, roughness: 0.45 }));
    base.position.y = 0.2; base.castShadow = base.receiveShadow = true;
    const ringMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.08, 8, 64), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.44;
    const holo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, wireframe: true }));
    holo.position.y = 2.6;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 1.6 }));
    core.position.y = 2.6; core.castShadow = true;
    const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.7, 16, 24, 1, true), beamMat);
    beam.position.y = 8;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(4, 4, 1); glow.position.y = 2.6;
    const label = makeLabel(stationLabel(s, i), 1.05, { border: '#' + color.getHexString() });
    label.position.y = 4.5;

    g.add(base, ring, holo, core, beam, glow, label);
    scene.add(g);
    return { g, ring, ringMat, holo, core, beamMat, label, pos: pts[i], visited: false, index: i };
  });

  /* ---------- Racks de servidores (decoración instanciada) ---------- */
  const leds = [];
  {
    const rackSpots = [];
    let guard = 0;
    while (rackSpots.length < 70 && guard++ < 2000) {
      const x = (Math.random() * 2 - 1) * 42;
      const z = zMax - Math.random() * (zMax - zMin + 10);
      if (distToPath(x, z) < 6.5) continue;
      if (rackSpots.some(p => Math.hypot(p.x - x, p.z - z) < 2.6)) continue;
      rackSpots.push({ x, z, rot: Math.round(Math.random() * 3) * Math.PI / 2, h: 2 + Math.random() * 1.6 });
    }
    const rackGeo = new THREE.BoxGeometry(1.3, 1, 1.2);
    const racks = new THREE.InstancedMesh(rackGeo, new THREE.MeshStandardMaterial({ color: 0x172235, metalness: 0.6, roughness: 0.4 }), rackSpots.length);
    racks.castShadow = racks.receiveShadow = true;
    const ledGeo = new THREE.PlaneGeometry(0.9, 0.06);
    const ledColors = [ACCENT, CYAN, 0x60a5fa];
    const ledMats = ledColors.map(c => new THREE.MeshBasicMaterial({ color: c }));
    const perMat = ledMats.map(() => []);
    const parent = new THREE.Object3D(), child = new THREE.Object3D();
    parent.add(child);
    rackSpots.forEach((r, i) => {
      parent.position.set(r.x, r.h / 2, r.z); parent.rotation.set(0, r.rot, 0); parent.scale.set(1, r.h, 1);
      parent.updateMatrixWorld(true);
      racks.setMatrixAt(i, parent.matrixWorld);
      const rows = Math.floor(r.h / 0.32);
      for (let k = 0; k < rows; k++) {
        parent.scale.set(1, 1, 1); parent.position.y = 0;
        child.position.set(0, 0.3 + k * 0.3, 0.61);
        parent.updateMatrixWorld(true);
        perMat[(i + k) % 3].push(child.matrixWorld.clone());
      }
    });
    scene.add(racks);
    perMat.forEach((mats, j) => {
      const inst = new THREE.InstancedMesh(ledGeo, ledMats[j], mats.length);
      mats.forEach((m, k) => inst.setMatrixAt(k, m));
      scene.add(inst);
      leds.push(ledMats[j]);
    });
  }

  // Estrellas
  {
    const n = 1400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 90 + Math.random() * 60, th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.45;
      pos[i * 3] = Math.cos(th) * Math.sin(ph) * r;
      pos[i * 3 + 1] = 12 + Math.cos(ph) * r * 0.6;
      pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * r - 60;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xbfe8ff, size: 0.55, transparent: true, opacity: 0.75, fog: false })));
  }

  /* ---------- Orbes de tecnologías ---------- */
  const orbObjs = orbs.map((name, k) => {
    const u = 0.04 + (k + 0.5) / orbs.length * 0.9;
    const p = curve.getPointAt(u), tan = curve.getTangentAt(u);
    const side = k % 3 === 0 ? 0 : (k % 2 ? 1 : -1) * 2.8;   // algunos sobre la ruta, otros a los lados
    const color = k % 2 ? CYAN : ACCENT;
    const g = new THREE.Group();
    g.position.set(p.x + tan.z * side, 1.25, p.z - tan.x * side);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 1.1, roughness: 0.2, metalness: 0.1, transparent: true }));
    mesh.castShadow = true;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.set(2.3, 2.3, 1);
    const label = makeLabel(name, 0.62, { size: 40, border: '#' + new THREE.Color(color).getHexString() });
    label.position.y = 1;
    g.add(mesh, halo, label);
    scene.add(g);
    return { g, mesh, halo, label, name, taken: false, t: 0, phase: Math.random() * 6, baseY: 1.25 };
  });

  /* ---------- Robot ---------- */
  const player = new THREE.Group();
  const robot = new THREE.Group();
  player.add(robot);
  const white = new THREE.MeshStandardMaterial({ color: 0xe8edf5, metalness: 0.25, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b1220, metalness: 0.4, roughness: 0.3 });
  const neon = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 1 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 2 });
  const add = (geo, mat, x, y, z, parent = robot) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };

  add(new THREE.CapsuleGeometry(0.46, 0.55, 6, 16), white, 0, 1.12, 0);
  const belt = add(new THREE.TorusGeometry(0.47, 0.05, 8, 32), neon, 0, 1.0, 0); belt.rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.3, 0.18, 0.05), neon, 0, 1.25, 0.45);           // "logo" del pecho
  const head = new THREE.Group(); head.position.y = 2.02; robot.add(head);
  add(new THREE.BoxGeometry(0.92, 0.66, 0.74), white, 0, 0, 0, head);
  add(new THREE.BoxGeometry(0.76, 0.34, 0.04), dark, 0, 0.02, 0.38, head);
  const eyeL = add(new THREE.BoxGeometry(0.13, 0.1, 0.02), eyeMat, -0.17, 0.03, 0.41, head);
  const eyeR = add(new THREE.BoxGeometry(0.13, 0.1, 0.02), eyeMat, 0.17, 0.03, 0.41, head);
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.32), dark, 0, 0.48, 0, head);
  const antenna = add(new THREE.SphereGeometry(0.08, 12, 8), neon, 0, 0.68, 0, head);
  const limb = (x, y, w, h) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0); robot.add(pivot);
    add(new THREE.BoxGeometry(w, h, w * 1.1), white, 0, -h / 2, 0, pivot);
    add(new THREE.BoxGeometry(w * 1.05, 0.06, w * 1.15), neon, 0, -h + 0.05, 0, pivot);
    return pivot;
  };
  const legL = limb(-0.2, 0.62, 0.24, 0.6), legR = limb(0.2, 0.62, 0.24, 0.6);
  const armL = limb(-0.62, 1.48, 0.18, 0.62), armR = limb(0.62, 1.48, 0.18, 0.62);
  const shadowGlow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ map: glowTex, color: ACCENT, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  shadowGlow.rotation.x = -Math.PI / 2; shadowGlow.position.y = 0.05;
  player.add(shadowGlow);
  player.position.copy(startPos);
  player.rotation.y = Math.PI;
  scene.add(player);

  /* ---------- Partículas (ráfagas) ---------- */
  const bursts = [];
  function burst(at, { count = 70, colors = [ACCENT, CYAN], speed = 6, life = 1.2, y = 2.6 } = {}) {
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), vel = [];
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      pos.set([at.x, y, at.z], i * 3);
      c.set(colors[i % colors.length]); col.set([c.r, c.g, c.b], i * 3);
      const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI;
      const s = speed * (0.4 + Math.random() * 0.8);
      vel.push(new THREE.Vector3(Math.cos(th) * Math.sin(ph) * s, Math.abs(Math.cos(ph)) * s + 2, Math.sin(th) * Math.sin(ph) * s));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts3 = new THREE.Points(geo, mat);
    scene.add(pts3);
    bursts.push({ pts: pts3, vel, t: 0, life });
  }

  /* ================= Entrada ================= */
  const keys = new Set();
  const joy = { x: 0, z: 0 };
  let enabled = false;
  let autopilot = null;
  const onKey = e => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(k)) {
      e.preventDefault();
      if (e.type === 'keydown') { keys.add(k); autopilot = null; } else keys.delete(k);
    }
    if (e.type === 'keydown' && k === 'enter' && !enabled) start();
    if (e.type === 'keydown' && k === 'escape') opts.onExit?.();
  };
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);
  const onBlur = () => keys.clear();
  addEventListener('blur', onBlur);

  // Joystick táctil
  const joyEl = q('.g-joy'), knob = joyEl.firstElementChild;
  let joyId = null;
  const joyMove = e => {
    const r = joyEl.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 18, len = Math.hypot(dx, dy);
    if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    joy.x = dx / max; joy.z = dy / max;
  };
  joyEl.addEventListener('pointerdown', e => { joyId = e.pointerId; joyEl.setPointerCapture(joyId); autopilot = null; joyMove(e); });
  joyEl.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
  const joyEnd = e => { if (e.pointerId !== joyId) return; joyId = null; joy.x = joy.z = 0; knob.style.transform = ''; };
  joyEl.addEventListener('pointerup', joyEnd);
  joyEl.addEventListener('pointercancel', joyEnd);

  // Botones
  root.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'start') start();
    if (act === 'next') goTo(nextIndex(1));
    if (act === 'prev') goTo(nextIndex(-1));
    if (act === 'exit' || act === 'text') opts.onExit?.();
    if (act === 'contact') opts.onContact?.();
    if (act === 'replay') replay();
  });

  function start() {
    enabled = true;
    q('.g-intro').hidden = true;
    root.classList.add('is-playing');
    renderer.domElement.focus?.();
  }

  /* ================= Lógica ================= */
  let current = null;           // estación activa
  let cursor = -1;              // última estación visitada (para Siguiente/Anterior)
  let collected = 0;
  let finished = false;
  const startTime = performance.now();

  const nextIndex = dir => Math.max(0, Math.min(N - 1, (current ? current.index : cursor) + dir));
  function goTo(i) {
    if (!enabled) start();
    const p = stationObjs[i].pos;
    autopilot = new THREE.Vector3(p.x, 0, p.z + 3.3);
  }

  function updateHud() {
    const visited = stationObjs.filter(s => s.visited).length;
    q('.g-sec').textContent = `${visited}/${N}`;
    q('.g-secbar').style.width = `${visited / N * 100}%`;
    q('.g-orb').textContent = `${collected}/${orbs.length}`;
    root.classList.toggle('has-visited', visited > 0);
  }

  function showPanel(s) {
    if (!s) { panel.classList.remove('is-open'); return; }
    const d = stations[s.index];
    panel.innerHTML = `
      <span class="g-panel__num">${String(s.index + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}</span>
      <h3>${d.title}</h3>
      ${d.sub ? `<p class="g-panel__sub">${d.sub}</p>` : ''}
      <div class="g-panel__body">${d.html}</div>`;
    panel.classList.remove('is-open');
    void panel.offsetWidth;
    panel.classList.add('is-open');
  }

  let toastTm;
  function toast(msg) {
    const el = q('.g-toast');
    el.textContent = msg;
    el.classList.add('is-shown');
    clearTimeout(toastTm);
    toastTm = setTimeout(() => el.classList.remove('is-shown'), 1600);
  }

  function finish() {
    if (finished) return;
    finished = true;
    const last = stationObjs[N - 1].pos;
    const confetti = [0xf472b6, 0xfacc15, ACCENT, CYAN, 0x818cf8];
    [0, 350, 700].forEach(ms => setTimeout(() => burst(last, { count: 160, colors: confetti, speed: 9, life: 2, y: 3 }), ms));
    setTimeout(() => {
      const secs = Math.round((performance.now() - startTime) / 1000);
      q('.g-end__stats').textContent = `${ui.sections}: ${N}/${N} · ${ui.orbs}: ${collected}/${orbs.length} · ${secs}s`;
      q('.g-end').hidden = false;
    }, 2200);
  }

  function replay() {
    q('.g-end').hidden = true;
    stationObjs.forEach(s => { s.visited = false; });
    orbObjs.forEach(o => {
      o.taken = false; o.t = 0; o.g.visible = true; o.g.scale.setScalar(1);
      o.mesh.material.opacity = 1; o.halo.material.opacity = 0.7; o.label.material.opacity = 1;
    });
    collected = 0; cursor = -1; current = null; finished = false; autopilot = null;
    player.position.copy(startPos); player.rotation.y = Math.PI;
    showPanel(null); updateHud();
  }

  /* ================= Bucle ================= */
  const clock = new THREE.Clock();
  const vel = new THREE.Vector3(), dir = new THREE.Vector3();
  const camPos = new THREE.Vector3(startPos.x, 10, startPos.z + 14), look = new THREE.Vector3().copy(startPos);
  camera.position.copy(camPos);
  let time = 0, walk = 0, raf = 0, paused = false;
  const lerpAngle = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

  function tick() {
    raf = requestAnimationFrame(tick);
    if (paused) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;

    // --- movimiento ---
    dir.set(0, 0, 0);
    if (enabled) {
      dir.x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0) + joy.x;
      dir.z = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0) + joy.z;
      if (dir.lengthSq() < 0.01 && autopilot) {
        dir.set(autopilot.x - player.position.x, 0, autopilot.z - player.position.z);
        if (dir.length() < 0.35) { autopilot = null; dir.set(0, 0, 0); }
        else dir.normalize();
      }
      if (dir.lengthSq() > 1) dir.normalize();
    }
    const speed = autopilot ? 11 : 8.5;
    vel.lerp(dir.multiplyScalar(speed), 1 - Math.exp(-9 * dt));
    player.position.addScaledVector(vel, dt);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -46, 46);
    player.position.z = THREE.MathUtils.clamp(player.position.z, zMin, zMax);

    const sp = vel.length();
    if (sp > 0.3) player.rotation.y = lerpAngle(player.rotation.y, Math.atan2(vel.x, vel.z), 1 - Math.exp(-12 * dt));
    walk += dt * sp * 1.5;
    const amp = Math.min(sp / 8, 1);
    legL.rotation.x = Math.sin(walk) * 0.7 * amp;
    legR.rotation.x = -Math.sin(walk) * 0.7 * amp;
    armL.rotation.x = -Math.sin(walk) * 0.6 * amp;
    armR.rotation.x = Math.sin(walk) * 0.6 * amp;
    robot.position.y = Math.abs(Math.sin(walk)) * 0.08 * amp + Math.sin(time * 2) * 0.03 * (1 - amp);
    head.rotation.z = Math.sin(time * 1.3) * 0.04 * (1 - amp);
    antenna.material.emissiveIntensity = 0.8 + Math.sin(time * 5) * 0.6;
    const blink = (time % 3.6) < 0.12 ? 0.15 : 1;
    eyeL.scale.y = eyeR.scale.y = blink;

    // --- cámara ---
    // En vertical (móvil) el panel ocupa la parte baja: el robot se encuadra más arriba
    const portrait = camera.aspect < 1;
    camPos.set(player.position.x * (portrait ? 0.85 : 0.55), portrait ? 10 : 8, player.position.z + (portrait ? 12 : 11.5));
    camera.position.lerp(camPos, 1 - Math.exp(-3.5 * dt));
    look.lerp(new THREE.Vector3(player.position.x * (portrait ? 0.95 : 0.8), 1.2, player.position.z + (portrait ? 4.5 : -4)), 1 - Math.exp(-5 * dt));
    camera.lookAt(look);
    sun.position.set(player.position.x + 10, 26, player.position.z + 12);
    sun.target.position.copy(player.position);

    // --- estaciones ---
    let active = null, best = Infinity;
    stationObjs.forEach((s, i) => {
      s.holo.rotation.y += dt * 0.8; s.holo.rotation.x += dt * 0.3;
      s.core.rotation.y -= dt * 1.6;
      const bob = Math.sin(time * 1.6 + i) * 0.15;
      s.holo.position.y = s.core.position.y = 2.6 + bob;
      s.ring.rotation.z += dt * 0.5;
      const d = Math.hypot(player.position.x - s.pos.x, player.position.z - s.pos.z);
      if (d < NEAR && d < best) { best = d; active = s; }
    });
    stationObjs.forEach(s => {
      const target = s === active ? 2.6 : s.visited ? 1.2 : 0.5;
      s.ringMat.emissiveIntensity += (target - s.ringMat.emissiveIntensity) * Math.min(1, dt * 6);
      s.beamMat.opacity += ((s === active ? 0.16 : s.visited ? 0.09 : 0.05) - s.beamMat.opacity) * Math.min(1, dt * 4);
    });
    if (active !== current) {
      current = active;
      showPanel(active);
      if (active) {
        cursor = active.index;
        if (!active.visited) {
          active.visited = true;
          burst(active.pos);
          updateHud();
          if (stationObjs.every(s => s.visited) || active.index === N - 1) finish();
        }
      }
    }

    // --- orbes ---
    orbObjs.forEach(o => {
      if (o.taken) {
        if (!o.g.visible) return;
        o.t += dt;
        o.g.scale.setScalar(1 + o.t * 2.5);
        o.g.position.y += dt * 5;
        const op = Math.max(0, 1 - o.t / 0.45);
        o.mesh.material.opacity = op; o.halo.material.opacity = op * 0.7; o.label.material.opacity = op;
        if (o.t > 0.45) o.g.visible = false;
        return;
      }
      o.g.position.y = o.baseY + Math.sin(time * 2 + o.phase) * 0.2;
      o.mesh.rotation.y += dt;
      if (Math.hypot(player.position.x - o.g.position.x, player.position.z - o.g.position.z) < 1.5) {
        o.taken = true; collected++;
        burst(o.g.position, { count: 40, speed: 4, life: 0.8, y: o.g.position.y });
        toast(`✦ ${ui.got}: ${o.name}`);
        updateHud();
      }
    });

    // --- partículas ---
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.t += dt;
      const arr = b.pts.geometry.attributes.position.array;
      b.vel.forEach((v, k) => {
        v.y -= 9 * dt;
        arr[k * 3] += v.x * dt; arr[k * 3 + 1] = Math.max(0.05, arr[k * 3 + 1] + v.y * dt); arr[k * 3 + 2] += v.z * dt;
      });
      b.pts.geometry.attributes.position.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, 1 - b.t / b.life);
      if (b.t > b.life) { scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(i, 1); }
    }

    // --- LEDs ---
    leds.forEach((m, j) => { m.color.setScalar(0.35 + 0.65 * (Math.sin(time * (1.5 + j) + j * 2) > -0.2 ? 1 : 0.2)); m.color.multiply(new THREE.Color([ACCENT, CYAN, 0x60a5fa][j])); });

    renderer.render(scene, camera);
  }
  tick();

  // Tamaño y visibilidad
  const ro = new ResizeObserver(() => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w < h ? 68 : 55;
    camera.updateProjectionMatrix();
  });
  ro.observe(host);
  const onVis = () => { paused = document.hidden; clock.getDelta(); };
  document.addEventListener('visibilitychange', onVis);

  return {
    /** Cambia los textos (idioma) sin reiniciar la partida. */
    setContent(newStations, newOrbs, newUi) {
      stations = newStations; ui = newUi;
      applyUi();
      stationObjs.forEach((s, i) => setLabel(s.label, stationLabel(stations[i], i), 1.05, { border: '#' + s.ringMat.color.getHexString() }));
      if (current) showPanel(current);
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener('keydown', onKey);
      removeEventListener('keyup', onKey);
      removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
      scene.traverse(o => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach(m => { m.map?.dispose?.(); m.dispose(); });
      });
      renderer.dispose();
      root.innerHTML = '';
      root.classList.remove('is-playing', 'has-visited');
    }
  };
}
