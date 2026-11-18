// ───────────────────────────────────────────────────────────
//  Core game: grid logic on an open 3D world, effects, camera
// ───────────────────────────────────────────────────────────
import * as THREE from 'three';
import { LEVELS, FRUITS, FOODS, ALL_FRUITS, themeFor } from './levels.js';
import { generateMap, FREE, OBST, WATER, BRIDGE, ROAD, WATER_Y, walkable } from './mapgen.js';
import * as M from './models.js';
import { Particles } from './fx.js';
import { World } from './world.js';
import { DIRS, OPP } from './input.js';

const DIR_NAMES = ['up', 'down', 'left', 'right'];
const MAX_SEG = 700;
const MAX_FOOD = 4;                   // fruit + critters + special foods on the map at once
const TUBE_R = 14, TUBE_SPC = 4;      // vertices per ring, rings per grid cell
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color(), _v = new THREE.Vector3();
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angleOf = n => Math.atan2(DIRS[n].x, DIRS[n].z);
const easeOutBack = t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export class Game {
  constructor(canvas, input, sfx, ui) {
    this.canvas = canvas; this.input = input; this.sfx = sfx; this.ui = ui;
    input.heading = () => this.dirName;
    input.isRelative = () => this.fps;

    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 260);
    this.baseFov = 50;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x445544, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.4);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 90;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.particles = new Particles(this.scene, 900);
    this.world = new World(this.scene, this.particles);
    this.actors = new THREE.Group();
    this.scene.add(this.actors);

    // Snake visuals
    this.head = M.makeHead();
    this.scene.add(this.head.group);
    this.bodyMat = new THREE.MeshStandardMaterial({ roughness: .36, metalness: .06, vertexColors: true });
    this.initTube();
    this.initSky();
    this.scene.add(this.camera);                 // the first-person tongue is attached to the camera
    this.fpsTongue = M.makeTongue();
    this.camera.add(this.fpsTongue.group);
    this.scene.add(this.bodyMesh);

    this.foods = []; this.door = null;
    this.magnetRing = M.makeMagnetRing();
    this.scene.add(this.magnetRing);
    this.dizzy = M.makeDizzy();
    this.scene.add(this.dizzy);

    // arrow that points at the next apple when it is far away
    const sh = new THREE.Shape();
    sh.moveTo(0, .42); sh.lineTo(.3, -.05); sh.lineTo(.11, -.02); sh.lineTo(.11, -.32); sh.lineTo(-.11, -.32); sh.lineTo(-.11, -.02); sh.lineTo(-.3, -.05); sh.closePath();
    const ag = new THREE.ShapeGeometry(sh); ag.rotateX(-Math.PI / 2); ag.rotateY(Math.PI);
    this.arrow = new THREE.Mesh(ag, new THREE.MeshBasicMaterial({ color: 0xff3a4a, transparent: true, opacity: .85, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    this.arrow.renderOrder = 3;
    this.scene.add(this.arrow);

    this.shocks = [];
    this.pts = [];
    this.camPos = new THREE.Vector3(0, 20, 20);
    this.camLook = new THREE.Vector3();
    this.camTarget = new THREE.Vector3();
    this.camDesired = new THREE.Vector3();
    this.lookAhead = new THREE.Vector3();
    this.time = 0;
    this.state = 'idle';
    this.viewMode = '3d';
    this.shake = 0;
    this.t = 1;

    this.setQuality('high');
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  initSky() {
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uFlash: { value: 0 } },
      vertexShader: `varying float vh;
        void main() { vh = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform float uFlash; varying float vh;
        void main() {
          float t = clamp(vh, 0.0, 1.0);
          vec3 c = t < 0.3 ? mix(uHor, uMid, t / 0.3) : mix(uMid, uTop, (t - 0.3) / 0.7);
          c = mix(c, vec3(1.0), uFlash * 0.45);
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(200, 24, 14), this.skyMat);
    this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: M.glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false, transparent: true }));
    this.sunDisc.renderOrder = -9; this.sunDisc.visible = false;
    this.scene.add(this.sunDisc);
    this.sunDir = new THREE.Vector3(0, 1, 0);
  }

  /** Pre-allocates the snake's body: a skinned tube (rings of vertices along the path) with a scale pattern. */
  initTube() {
    const maxS = MAX_SEG * TUBE_SPC + 4, nv = maxS * TUBE_R;
    this.tubePos = new Float32Array(nv * 3); this.tubeNor = new Float32Array(nv * 3); this.tubeCol = new Float32Array(nv * 3);
    const idx = new Uint32Array((maxS - 1) * TUBE_R * 6);
    let q = 0;
    for (let k = 0; k < maxS - 1; k++) for (let j = 0; j < TUBE_R; j++) {
      const a = k * TUBE_R + j, b = k * TUBE_R + (j + 1) % TUBE_R, c = (k + 1) * TUBE_R + j, d = (k + 1) * TUBE_R + (j + 1) % TUBE_R;
      idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.tubePos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(this.tubeNor, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.tubeCol, 3).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setDrawRange(0, 0);
    this.bodyMesh = new THREE.Mesh(g, this.bodyMat);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.frustumCulled = false;
    this.ringCos = Array.from({ length: TUBE_R }, (_, j) => Math.cos(j / TUBE_R * Math.PI * 2));
    this.ringSin = Array.from({ length: TUBE_R }, (_, j) => Math.sin(j / TUBE_R * Math.PI * 2));
  }

  /** 'top' = 2D map view, '3d' = classic chase cam, 'tilt' = low, tilted 3D, 'fps' = through the snake's eyes. */
  setView(mode) {
    const m = ['top', '3d', 'tilt', 'fps'].includes(mode) ? mode : '3d';
    if ((m === 'fps') !== (this.viewMode === 'fps')) this.snapCamera = true;
    this.viewMode = m;
    this.input.clear();
  }
  /** First person needs a wide screen: desktop or a phone held sideways. */
  static fpsAllowed() { return !(matchMedia('(pointer: coarse)').matches && innerHeight > innerWidth); }
  get fps() { return this.viewMode === 'fps' && this.state !== 'demo' && Game.fpsAllowed(); }

  setQuality(q) {
    const changed = this.quality && this.quality !== q;
    this.quality = q;
    const coarse = matchMedia('(pointer: coarse)').matches;
    this.renderer.setPixelRatio(q === 'low' ? 1 : Math.min(devicePixelRatio, coarse ? 1.75 : 2));
    this.renderer.shadowMap.enabled = q !== 'low';
    const s = coarse ? 1024 : 2048;
    this.sun.shadow.mapSize.set(s, s);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.scene.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); } });
    if (changed && this.map) this.world.build(this.theme, this.map, q);
    this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.baseFov = aspect < 1 ? clamp(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(21)) / aspect) * 180 / Math.PI, 50, 72) : 50;
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  // ── Loading ───────────────────────────────────────────────
  load(cfg) {
    this.cfg = cfg;
    this.demo = cfg.mode === 'demo';
    let L;
    if (cfg.mode === 'adventure' || this.demo) {
      L = { ...LEVELS[cfg.level] };
      this.levelIndex = cfg.level;
      if (this.demo) { L.enemies = Math.min(L.enemies, 2); L.interval = .13; L.fruits = ALL_FRUITS.filter(f => f !== 'reverse'); }
    } else {
      const base = LEVELS[cfg.map];
      L = { ...base, target: Infinity, special: 0, fruits: ALL_FRUITS, enemies: cfg.mode === 'time' ? 2 : 1, interval: .21 };
      this.levelIndex = cfg.map;
    }
    this.L = L;
    this.theme = themeFor(L);
    this.N = L.size;
    this.map = generateMap(this.theme, L.size, this.levelIndex + 1);
    this.grid = this.map.cell;
    this.start = this.map.start;
    this.startDir = this.map.dir;
    this.reachable = this.bfsReachable();
    this.computeShore();
    {
      const T = this.theme;
      L.crocs = this.shoreCells.length && this.levelIndex >= 2 && T.crocs ? Math.min(4, T.crocs + Math.floor(this.levelIndex / 9)) : 0;
      L.crabs = this.levelIndex >= 2 ? Math.round((T.crabs || 0) * (L.size / 60)) : 0;
      if (this.demo) { L.crocs = Math.min(L.crocs, 1); L.crabs = Math.min(L.crabs, 1); }
    }
    this.buildWorld();
    this.reset();
  }

  /** Cells beside water (crocodile territory). */
  computeShore() {
    const N = this.N;
    this.nearWater = new Uint8Array(N * N); this.shoreCells = [];
    for (let i = 0; i < N * N; i++) {
      if (this.grid[i] !== FREE || !this.reachable[i]) continue;
      const x = i % N, z = (i / N) | 0;
      let hit = false;
      for (let dz = -2; dz <= 2 && !hit; dz++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, zz = z + dz;
        if (xx >= 0 && zz >= 0 && xx < N && zz < N && this.grid[zz * N + xx] === WATER) { hit = true; break; }
      }
      if (hit) { this.nearWater[i] = 1; this.shoreCells.push(i); }
    }
  }

  bfsReachable() {
    const N = this.N, seen = new Uint8Array(N * N), s = this.start.z * N + this.start.x;
    const q = [s]; seen[s] = 1;
    while (q.length) {
      const i = q.pop(), x = i % N, z = (i / N) | 0;
      for (const n of DIR_NAMES) {
        const nx = x + DIRS[n].x, nz = z + DIRS[n].z;
        if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
        const j = nz * N + nx;
        if (!seen[j] && walkable(this.grid[j])) { seen[j] = 1; q.push(j); }
      }
    }
    return seen;
  }

  disposeTree(obj) {
    obj.traverse(o => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
          if (m.userData.shared) return;
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
  }

  buildWorld() {
    const T = this.theme;
    this.scene.background = new THREE.Color(T.sky);
    this.scene.fog = new THREE.Fog(T.fog, T.fogNear ?? 30, T.fogFar ?? 75);
    this.fogNear0 = T.fogNear ?? 30; this.fogFar0 = T.fogFar ?? 75;
    this.hemi.color.set(T.hemiSky ?? 0xffffff);
    this.hemi.groundColor.set(T.hemiGround ?? 0x555555);
    this.hemi.intensity = T.hemi ?? 1;
    this.sun.color.set(T.sunColor ?? 0xffffff);
    this.sun.intensity = T.sun ?? 2.4;
    {
      const u = this.skyMat.uniforms;
      u.uTop.value.set(T.skyTop ?? T.sky); u.uHor.value.set(T.skyHor ?? T.fog);
      if (T.skyMid !== undefined) u.uMid.value.set(T.skyMid); else u.uMid.value.copy(u.uTop.value).lerp(u.uHor.value, .5);
    }
    this.baseHemi = this.hemi.intensity; this.baseSun = this.sun.intensity;
    this.bgColor = new THREE.Color(T.sky);
    this.lightT = 3 + Math.random() * 4; this.flashT = 0;
    if (this.ui.atmos) this.ui.atmos(T.mood);
    this.sunDisc.visible = !!T.sunDisc;
    if (T.sunDisc) { this.sunDisc.material.color.set(T.sunDisc); this.sunDisc.scale.setScalar(T.sunBig ? 90 : 55); }
    this.sunOffset = T.sunBig ? new THREE.Vector3(-20, 7, 7) : T.sunLow ? new THREE.Vector3(-18, 11, 6) : T.dark ? new THREE.Vector3(-8, 26, -6) : new THREE.Vector3(10, 26, 8);
    this.renderer.toneMappingExposure = T.dark ? 1.15 : 1.05;
    this.world.build(T, this.map, this.quality);
    this.buildMinimap();
  }

  buildMinimap() {
    const N = this.N, T = this.theme, c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d'), img = g.createImageData(N, N);
    const ga = new THREE.Color(T.ground.a), wc = new THREE.Color(T.water?.color ?? 0x3aa6e0);
    const col = {
      [FREE]: ga, [ROAD]: new THREE.Color(0x55555e), [WATER]: wc.clone().lerp(new THREE.Color(0x2a6aff), .3),
      [BRIDGE]: new THREE.Color(0xc08a4a), [OBST]: ga.clone().multiplyScalar(.45),
    };
    for (let i = 0; i < N * N; i++) {
      const cc = col[this.grid[i]] || ga;
      const x = i % N, z = (i / N) | 0, hgt = this.map.heightAt(x - this.map.off, z - this.map.off);
      const shade = this.grid[i] === FREE ? clamp(.85 + hgt * .12, .7, 1.25) : 1;
      img.data[i * 4] = Math.min(255, cc.r * 255 * shade); img.data[i * 4 + 1] = Math.min(255, cc.g * 255 * shade); img.data[i * 4 + 2] = Math.min(255, cc.b * 255 * shade); img.data[i * 4 + 3] = 255;
    }
    if (T.dark) for (let i = 0; i < N * N; i++) for (let k = 0; k < 3; k++) img.data[i * 4 + k] = Math.min(255, img.data[i * 4 + k] * 1.6 + 20);
    g.putImageData(img, 0, 0);
    this.minimapBase = c;
  }

  /** Draws the minimap into a 2D context. */
  drawMinimap(ctx, size) {
    if (!this.minimapBase || !this.body) return;
    const N = this.N, k = size / N;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(this.minimapBase, 0, 0, size, size);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, size, size);
    ctx.drawImage(this.minimapBase, 0, 0, size, size);
    // view area
    const h = this.body[0];
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    ctx.strokeRect((h.x - 11) * k, (h.z - 8) * k, 22 * k, 16 * k);
    // snake
    ctx.fillStyle = '#' + _c.set(M.SKINS[this.skinIndex].a ?? 0x43c463).getHexString();
    for (let i = 1; i < this.body.length; i++) ctx.fillRect(this.body[i].x * k, this.body[i].z * k, Math.max(2, k), Math.max(2, k));
    const blink = Math.sin(this.time * 8) > 0;
    const dot = (x, z, r, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc((x + .5) * k, (z + .5) * k, r, 0, 7); ctx.fill(); };
    for (const e of this.enemies) if (e.alive) dot(e.x, e.z, 2.5, '#c050ff');
    if (this.doorOpen && this.door) { const bx = (this.door.cx + .5) * k, bz = (this.door.cz + .5) * k, r = blink ? 6 : 4.5; ctx.fillStyle = '#6affb4'; ctx.fillRect(bx - r, bz - r, r * 2, r * 2); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(bx - r, bz - r, r * 2, r * 2); }
    dot(h.x, h.z, 3.5, '#ffffff');
  }

  // ── State reset ───────────────────────────────────────────
  reset() {
    const s = this.start;
    this.dirName = this.startDir;
    this.body = [];
    for (let i = 0; i < 3; i++) this.body.push({ x: s.x - i, z: s.z });
    this.prev = this.body.map(p => ({ ...p }));
    this.grow = 0;
    this.saveCheckpoint();
    this.sinceMove = 0;
    this.health = 100;
    this.score = 0;
    this.foodEaten = 0;
    this.moverEaten = 0;
    this.specialEaten = 0;
    this.goals = this.cfg.mode === 'adventure' ? this.L.goals : null;
    this.doorOpen = false;
    this.foodSpawnT = .3;
    this.effects = {};
    this.invuln = 0;
    this.acc = 0;
    this.t = 1;
    this.skinIndex = this.levelIndex % M.SKINS.length;     // every level has its own snake colours
    this.combo = 0; this.comboT = 0; this.wavePhase = 0;
    this.bulges = [];
    this.eatPulse = 0;
    this.headAngle = angleOf(this.dirName);
    this.tongueT = 1; this.flick = -1; this.blinkT = 2; this.blink = -1;
    (this.specials || []).forEach(sp => { this.actors.remove(sp.mesh); this.disposeTree(sp.mesh); });
    (this.enemies || []).forEach(e => { this.actors.remove(e.mesh); this.disposeTree(e.mesh); });
    this.specials = [];
    this.enemies = [];
    (this.foods || []).forEach(f => { this.actors.remove(f.mesh); this.disposeTree(f.mesh); });
    this.foods = [];
    if (this.door) { this.scene.remove(this.door.group); this.disposeTree(this.door.group); this.door = null; }
    this.timeLeft = this.cfg.mode === 'time' ? 90 : null;
    this.elapsed = 0;
    this.endT = 0; this.endKind = null; this.reported = false;
    this.goalHint = false; this.waterHint = false;
    this.bumpT = 0; this.bumpCool = 0; this.stuck = 0;
    this.dizzy.visible = false;
    this.sprinting = false;
    if (this.goals) this.placeDoor();
    for (let i = 0; i < 2; i++) this.spawnFoodItem('fruit', this.pickKind('fruit'));
    this.spawnAnimals();
    for (let i = 0; i < this.L.enemies; i++) this.spawnEnemy('slime');
    for (let i = 0; i < (this.L.crocs || 0); i++) this.spawnEnemy('croc');
    for (let i = 0; i < (this.L.crabs || 0); i++) this.spawnEnemy('crab');
    this.state = this.demo ? 'demo' : 'countdown';
    this.countdown = 3;
    this.lastCount = null;
    this.input.clear();
    this.input.reverse = false;
    this.shocks.forEach(s => { this.scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
    this.shocks = [];
    this.applyVisualEffects();
    this.lookAhead.set(0, 0, 0);
    this.snapCamera = true;
  }

  // ── Helpers ───────────────────────────────────────────────
  ground(wx, wz) { return this.map.groundAt(wx, wz); }
  /** ground height for the snake: it skims the water surface while Water Walk is active */
  sGround(wx, wz) { const h = this.map.groundAt(wx, wz); return this.effects.swim ? Math.max(h, WATER_Y + .04) : h; }
  addScore(n) { const v = Math.round(n * (this.effects.double ? 2 : 1) * this.comboMul()); this.score += v; return v; }
  bodyOnWater() { const N = this.N; return this.body.some(p => this.grid[p.z * N + p.x] === WATER); }
  cellPos(x, z, y = 0) { const off = this.N / 2 - .5; return _v.set(x - off, this.map.groundAt(x - off, z - off) + y, z - off); }
  inBounds(x, z) { return x >= 0 && z >= 0 && x < this.N && z < this.N; }
  isBlocked(i) { const t = this.grid[i]; return t === OBST || t === WATER; }

  occupied() {
    const N = this.N, s = new Set();
    this.body.forEach(p => s.add(p.z * N + p.x));
    this.specials.forEach(p => s.add(p.z * N + p.x));
    this.enemies.forEach(e => { if (e.alive) s.add(e.z * N + e.x); });
    this.foods.forEach(f => s.add(f.z * N + f.x));
    if (this.door) s.add(this.door.cz * N + this.door.cx);
    return s;
  }

  /** Random free, reachable cell between minDist and maxDist (Manhattan) from the head. */
  randomFreeCell(minDist = 0, maxDist = Infinity) {
    const N = this.N, occ = this.occupied(), h = this.body[0], list = [];
    for (let i = 0; i < N * N; i++) {
      const t = this.grid[i];
      if (!this.reachable[i] || (t !== FREE && t !== ROAD) || occ.has(i)) continue;
      const x = i % N, z = (i / N) | 0, d = Math.abs(x - h.x) + Math.abs(z - h.z);
      if (d >= minDist && d <= maxDist) list.push(i);
    }
    return list.length ? list[(Math.random() * list.length) | 0] : null;
  }

  currentInterval() {
    let iv = this.L.interval;
    if (this.cfg.mode === 'endless') iv = Math.max(.125, iv - this.foodEaten * .001);
    if (this.effects.fast) iv *= .6;
    if (this.effects.slow) iv *= 1.7;
    if (this.fps) iv *= 1.9;               // first person feels much faster, so slow it down a lot
    if (this.sprinting) iv *= .55;
    return iv;
  }

  say(fn, ...args) { if (!this.demo && this.ui[fn]) this.ui[fn](...args); }

  popup(text, x, z, color = '#fff') {
    if (this.demo) return;
    const v = this.cellPos(x, z, 1.2).project(this.camera);
    this.ui.popup(text, (v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, color);
  }

  // ── Spawning ──────────────────────────────────────────────
  // ── Food: fruit, runaway critters and special foods. Each one has a countdown; when it runs out it vanishes
  //    and something new appears somewhere else. At most MAX_FOOD items exist at once. ──
  spawnFoodItem(type, kind) {
    const far = Math.max(14, Math.round(this.N * .45));
    const idx = this.randomFreeCell(4, far) ?? this.randomFreeCell(2) ?? this.randomFreeCell(0);
    if (idx == null) return null;
    const def = FOODS[type][kind], mesh = type === 'special' ? M.makeSpecialFood(kind, def.color) : M.makeFood(kind);
    this.actors.add(mesh);
    if (type === 'mover') mesh.userData.ring.visible = false;      // animals do not run out of time
    if (kind === 'bug') mesh.userData.inner.scale.setScalar(1.8);  // the little red-black bug is tiny: make it easy to see
    const x = idx % this.N, z = (idx / this.N) | 0, max = type === 'mover' ? Infinity : type === 'special' ? 16 : 20 + rand(0, 6);
    const f = { type, kind, def, x, z, px: x, pz: z, mt: 1, t: 0, life: max, max, mesh, timer: rand(.3, .8), face: rand(6.3), phase: rand(6.3) };
    mesh.position.copy(this.cellPos(x, z));
    this.foods.push(f);
    if (type === 'fruit' && this.effects && this.effects.devil) this.tintFoods();
    return f;
  }

  pickKind(type) {
    const tbl = FOODS[type], keys = Object.keys(tbl);
    if (type === 'mover') return keys[(Math.random() * keys.length) | 0];
    let r = rand(keys.reduce((t, k) => t + (tbl[k].w ?? 1), 0));
    for (const k of keys) { r -= tbl[k].w ?? 1; if (r <= 0) return k; }
    return keys[0];
  }

  removeFood(f, poof = true) {
    if (poof) { const p = f.mesh.position; this.particles.emit(p.x, p.y + .4, p.z, 10, { color: f.def.color, speed: 1.8, life: .5 }); }
    this.actors.remove(f.mesh); this.disposeTree(f.mesh);
    this.foods.splice(this.foods.indexOf(f), 1);
  }

  /** What to spawn next (never animals: those only appear when the level starts). */
  spawnRandomFood() {
    const G = this.goals, free = !G;
    const cnt = t => this.foods.filter(f => f.type === t).length;
    const nF = cnt('fruit'), nSF = cnt('special'), nP = this.specials.length;
    let wF = free || (G.fruit && this.foodEaten < G.fruit) ? 3 : 1.2;
    let wSF = free ? .5 : (G.special && this.specialEaten < G.special ? 1.4 : .25);     // special food is rare
    let wP = this.L.fruits.length ? .7 : 0;
    if (nSF >= 1) wSF = 0;
    if (nP >= 2) wP = 0;
    if (!nF) wF += 5;
    let r = rand(wF + wSF + wP);
    if ((r -= wF) < 0) return this.spawnFoodItem('fruit', this.pickKind('fruit'));
    if ((r -= wSF) < 0) return this.spawnFoodItem('special', this.pickKind('special'));
    return this.spawnSpecial();
  }

  /** Small animals: spawned once, at the start of the level (3-8 of them), and never again. */
  spawnAnimals() {
    const G = this.goals;
    const n = this.demo ? 3 : G ? Math.min(8, Math.max(3, (G.mover || 0) + 2)) : 5;
    const kinds = ['mouse', 'frog', 'bug', 'crab', 'bug', 'mouse', 'frog'];
    for (let i = 0; i < n; i++) this.spawnFoodItem('mover', kinds[(Math.random() * kinds.length) | 0]);
  }

  manageFood(dt) {
    for (const sp of [...this.specials]) {
      sp.life -= dt; sp.t += dt;
      if (sp.life <= 0) { this.removeSpecial(sp); this.foodSpawnT = Math.min(this.foodSpawnT, .5); }
    }
    const frozen = !!this.effects.freeze;
    for (const f of [...this.foods]) {
      f.life -= dt; f.t = Math.min(1, f.t + dt * 3);
      if (f.life <= 0) { this.removeFood(f); this.foodSpawnT = Math.min(this.foodSpawnT, .5); continue; }
      if (f.type === 'mover') {
        f.biteCool = (f.biteCool || 0) - dt;
        if (f.def.bite && f.biteCool <= 0 && !this.demo && this.invuln <= 0 && !this.effects.invisible) {
          const h = this.body[0];
          if (Math.max(Math.abs(f.x - h.x), Math.abs(f.z - h.z)) <= 1) {
            f.biteCool = 1.6; this.invuln = .8;
            this.popup('🦀 -' + f.def.bite, f.x, f.z, '#ff6b6b');
            this.say('flash', 'rgba(255,60,40,.3)');
            this.damage(f.def.bite);
          }
        }
        if (!frozen) { f.timer -= dt; if (f.timer <= 0) { f.timer = f.def.speed * rand(.85, 1.3); this.moveCritter(f); } }
        f.mt = Math.min(1, f.mt + dt / (f.def.speed * .7));
      }
    }
    this.foodSpawnT -= dt;
    const nonAnimals = this.foods.filter(f => f.type !== 'mover').length;
    if (!nonAnimals && this.foodSpawnT > .25) this.foodSpawnT = .25;
    if (this.foodSpawnT <= 0) {
      if (nonAnimals + this.specials.length < MAX_FOOD) { this.spawnRandomFood(); this.foodSpawnT = rand(1.2, 2.8) * (this.demo ? .6 : 1); }
      else this.foodSpawnT = .8;
    }
  }

  /** Critters run away from the snake when it gets close. */
  moveCritter(f) {
    const N = this.N, h = this.body[0];
    const names = DIR_NAMES.slice().sort(() => Math.random() - .5);
    if (f.def.flee !== false && Math.abs(f.x - h.x) + Math.abs(f.z - h.z) < 9 && Math.random() < .85) {
      names.sort((a, b) => (Math.abs(f.x + DIRS[b].x - h.x) + Math.abs(f.z + DIRS[b].z - h.z)) - (Math.abs(f.x + DIRS[a].x - h.x) + Math.abs(f.z + DIRS[a].z - h.z)));
    }
    const bodySet = new Set(this.body.map(p => p.z * N + p.x));
    for (const n of names) {
      const x = f.x + DIRS[n].x, z = f.z + DIRS[n].z;
      if (!this.inBounds(x, z)) continue;
      const i = z * N + x;
      if (!walkable(this.grid[i]) || bodySet.has(i)) continue;
      if (this.foods.some(o => o !== f && o.x === x && o.z === z) || this.specials.some(o => o.x === x && o.z === z)) continue;
      if (this.door && x === this.door.cx && z === this.door.cz) continue;
      f.px = f.x; f.pz = f.z; f.x = x; f.z = z; f.mt = 0; f.face = Math.atan2(DIRS[n].x, DIRS[n].z);
      return;
    }
  }

  nearestFood() {
    const h = this.body[0];
    let best = null, bd = Infinity;
    for (const f of this.foods) { const d = Math.abs(f.x - h.x) + Math.abs(f.z - h.z); if (d < bd) { bd = d; best = f; } }
    return best;
  }

  /** The arrow only shows once the exit is open: you have to find the food yourself. */
  arrowTarget() { return null; }

  // ── The exit door: hidden in the fence until every goal is done ──
  placeDoor() {
    const N = this.N, st = this.start, hole = this.levelIndex % 3 === 2;     // every third level hides the exit in the ground
    const cand = minD => {
      const out = [];
      for (let i = 0; i < N * N; i++) {
        const x = i % N, z = (i / N) | 0;
        if (!hole && x && z && x < N - 1 && z < N - 1) continue;
        if (!this.reachable[i] || (this.grid[i] !== FREE && this.grid[i] !== ROAD)) continue;
        if (Math.abs(x - st.x) + Math.abs(z - st.z) < minD) continue;
        out.push(i);
      }
      return out;
    };
    let list = cand(N * .6);
    if (!list.length) list = cand(N * .3);
    if (!list.length) list = cand(0);
    if (!list.length) return;
    const i = list[(Math.random() * list.length) | 0], x = i % N, z = (i / N) | 0;
    const nrm = x === 0 ? [-1, 0] : x === N - 1 ? [1, 0] : z === 0 ? [0, -1] : [0, 1];
    const group = hole ? M.makeHole() : M.makeDoor(), p = this.cellPos(x, z);
    if (hole) group.position.set(p.x, p.y, p.z);
    else { group.position.set(p.x + nrm[0] * .55, p.y, p.z + nrm[1] * .55); group.rotation.y = Math.atan2(-nrm[0], -nrm[1]); }
    group.visible = false;
    this.scene.add(group);
    this.door = { cx: x, cz: z, group, t: 0, open: false, kind: hole ? 'hole' : 'gate' };
  }

  openDoor() {
    if (!this.door) return;
    this.doorOpen = true; this.door.open = true; this.door.t = 0; this.door.group.visible = true;
    const p = this.door.group.position;
    this.shockwave(p.x, p.z, 0x9affc8, 14, 1.2);
    this.particles.emit(p.x, p.y + 1, p.z, 40, { colors: [0x9affc8, 0xffffff, 0xffe27a], speed: 4, up: 5, life: 1.2 });
    if (!this.demo) this.sfx.special();
    this.say('toast', this.door.kind === 'hole' ? '🕳️ Goals complete! A burrow opened somewhere in the ground. Find it and dive in!' : '🚪 Goals complete! A door opened somewhere on the fence. Find it and enter!', '#9affc8');
    this.say('flash', 'rgba(154,255,200,.3)');
  }

  spawnSpecial() {
    const pool = this.L.fruits;
    const weights = pool.map(k => (['mushroom', 'sword', 'burn'].includes(k) ? .6 : k === 'devil' ? .7 : 1));
    let r = rand(weights.reduce((a, b) => a + b, 0)), key = pool[0];
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { key = pool[i]; break; } }
    const idx = this.randomFreeCell(3, 14) ?? this.randomFreeCell(3);
    if (idx == null) return;
    const mesh = M.makeSpecial(key);
    const sp = { key, x: idx % this.N, z: (idx / this.N) | 0, life: 14, t: 0, mesh };
    mesh.position.copy(this.cellPos(sp.x, sp.z));
    this.actors.add(mesh);
    this.specials.push(sp);
    if (!this.demo) this.sfx.tone(990, .1, 'sine', .08);
  }

  removeSpecial(sp, poof = true) {
    if (poof) { const p = sp.mesh.position; this.particles.emit(p.x, p.y + .5, p.z, 14, { color: FRUITS[sp.key].color, speed: 2.5, life: .6 }); }
    this.actors.remove(sp.mesh);
    this.disposeTree(sp.mesh);
    this.specials.splice(this.specials.indexOf(sp), 1);
  }

  enemyCell(kind) {
    if (kind === 'croc') {
      const occ = this.occupied(), h = this.body[0], N = this.N, c = [];
      for (const i of this.shoreCells) { if (occ.has(i)) continue; if (Math.abs(i % N - h.x) + Math.abs(((i / N) | 0) - h.z) >= 8) c.push(i); }
      return c.length ? c[(Math.random() * c.length) | 0] : null;
    }
    return this.randomFreeCell(8, 22) ?? this.randomFreeCell(4);
  }

  /** Hazards: purple slimes, crocodiles that lurk by the water and red crabs on the sand. */
  spawnEnemy(kind = 'slime') {
    const idx = this.enemyCell(kind);
    if (idx == null) return;
    const mesh = kind === 'croc' ? M.makeCroc() : kind === 'crab' ? M.makeCrab() : M.makeSlime(this.theme.enemy ?? 0x9b4dff);
    this.actors.add(mesh);
    const x = idx % this.N, z = (idx / this.N) | 0;
    const interval = kind === 'croc' ? .8 : kind === 'crab' ? .3 : Math.max(.32, .6 - this.levelIndex * .025);
    const e = { kind, x, z, px: x, pz: z, mt: 1, timer: rand(.5, 1.2), interval, mesh, alive: true, face: rand(6.3), spawnT: 0, respawnT: 0, phase: rand(6.3), stun: 0 };
    mesh.position.copy(this.cellPos(x, z));
    this.enemies.push(e);
  }

  enemyCanEnter(e, i) {
    const t = this.grid[i];
    if (e.kind === 'croc') return t === WATER || ((t === FREE || t === ROAD) && this.nearWater[i] === 1);
    return t !== OBST && t !== WATER;
  }

  reviveEnemy(e) {
    const idx = this.enemyCell(e.kind);
    if (idx == null) { e.respawnT = 2; return; }
    e.x = e.px = idx % this.N; e.z = e.pz = (idx / this.N) | 0;
    e.alive = true; e.spawnT = 0; e.mt = 1; e.stun = 0; e.mesh.visible = true;
    const p = this.cellPos(e.x, e.z);
    this.particles.emit(p.x, p.y + .4, p.z, 16, { color: e.kind === 'crab' ? 0xe8281e : e.kind === 'croc' ? 0x4a7a3a : 0x9b4dff, speed: 2, life: .6 });
  }

  killEnemy(e, scoreIt = true) {
    if (!e.alive) return;
    e.alive = false; e.mesh.visible = false; e.respawnT = e.kind === 'croc' ? 10 : 8;
    const p = e.mesh.position;
    this.particles.emit(p.x, p.y + .5, p.z, 30, { colors: e.kind === 'crab' ? [0xe8281e, 0xffffff, 0xffd400] : e.kind === 'croc' ? [0x4a7a3a, 0xc8d89a, 0xffd400] : [0x9b4dff, 0xff7a1a, 0xffd400], speed: 5, up: 3, life: .9 });
    if (scoreIt) { this.addScore(50); this.popup('+50', e.x, e.z, '#ffb347'); }
    this.sfx.kill();
  }

  // ── Main update ───────────────────────────────────────────
  update(dt) {
    dt = Math.min(dt, .05);
    this.time += dt;
    const st = this.state;

    if (st === 'countdown') {
      this.countdown -= dt;
      const n = Math.ceil(this.countdown);
      if (n !== this.lastCount) {
        this.lastCount = n;
        if (n > 0) { this.ui.countdown(n); this.sfx.tick(); }
      }
      if (this.countdown <= 0) {
        this.state = 'playing';
        this.ui.countdown('GO!');
        this.sfx.go();
        this.input.clear();
      }
    } else if (st === 'playing' || st === 'demo') {
      this.tickPlay(dt);
    } else if (st === 'respawn') {
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.respawn();
    } else if (st === 'won' || st === 'dead' || st === 'over') {
      this.endT += dt;
      this.tickEnd(dt);
    }

    if (st !== 'paused') this.animate(dt);
    this.renderer.render(this.scene, this.camera);
  }

  tickPlay(dt) {
    let changed = false;
    for (const k in this.effects) {
      this.effects[k] -= dt;
      if (this.effects[k] <= 0) {
        if (k === 'swim' && this.bodyOnWater()) { this.effects[k] = .3; continue; }   // never drop the snake into the river
        delete this.effects[k]; changed = true;
      }
    }
    if (this.effects.burn && !this.demo) {
      this.health = Math.max(0, this.health - 3 * dt);
      this.burnFlash = (this.burnFlash || 0) - dt;
      if (this.burnFlash <= 0) { this.burnFlash = 1.2; this.say('flash', 'rgba(255,90,0,.16)'); }
      if (this.health <= 0) { this.finish('dead'); return; }
    }
    this.world.frozen = !!this.effects.freeze;
    this.bumpCool -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (!this.demo) this.sinceMove += dt;
    if (changed) this.applyVisualEffects();
    if (this.invuln > 0) this.invuln -= dt;
    this.input.reverse = !!this.effects.reverse;

    this.elapsed += dt;
    if (this.timeLeft !== null) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.timeLeft = 0; this.finish('over'); return; }
    }

    this.manageFood(dt);

    this.updateEnemies(dt);
    if (this.state !== 'playing' && this.state !== 'demo') return;
    this.checkTraffic();
    if (this.state !== 'playing' && this.state !== 'demo') return;

    this.sprinting = !this.demo && this.input.isSprinting(this.dirName, performance.now());
    const iv = this.currentInterval();
    this.acc += dt;
    let guard = 0;
    while (this.acc >= iv && guard++ < 3) {
      this.acc -= iv;
      this.step();
      if (this.state !== 'playing' && this.state !== 'demo') { this.acc = 0; break; }
    }
    if (this.acc > iv) this.acc = iv;
    this.t = clamp(this.acc / iv, 0, 1);

    // ambient effect particles
    const hp = this.head.group.position;
    if ((this.effects.devil || this.effects.burn) && Math.random() < .9) {
      const n = this.body.length, i = (Math.random() * n) | 0;
      const p = this.pts[i] || hp;
      this.particles.emit(p.x, p.y + .6, p.z, 1, { colors: [0xff3d00, 0xff9100, 0xffd400], speed: .6, up: 3, gravity: 2, life: .5, size: 1.3 });
    }
    if (this.effects.reverse && Math.random() < .4) this.particles.emit(hp.x, hp.y + .6, hp.z, 1, { color: 0xa14bff, speed: 1.5, up: 1, gravity: 0, life: .5 });
    if (this.effects.slow && Math.random() < .25) this.particles.emit(hp.x, hp.y + .5, hp.z, 1, { color: 0x7fd0ff, speed: .5, up: .8, gravity: 0, life: .9 });
    if (this.effects.fast && Math.random() < .5) {
      const tail = this.pts[this.body.length - 1] || hp;
      this.particles.emit(tail.x, tail.y + .3, tail.z, 1, { color: 0xffd400, speed: 1, up: .5, life: .4 });
    }
  }

  // ── Grid step ─────────────────────────────────────────────
  step() {
    const nd = this.demo ? this.aiDir() : this.input.next(this.dirName);
    if (nd && nd !== OPP[this.dirName]) this.dirName = nd;
    const d = DIRS[this.dirName], N = this.N;
    const head = this.body[0];
    const nx = head.x + d.x, nz = head.z + d.z;
    const fire = !!this.effects.fire;
    const ghost = fire || !!this.effects.invisible || this.invuln > 0;

    if (!this.inBounds(nx, nz)) return this.crash('fence');
    const idx = nz * N + nx;
    if (this.grid[idx] === WATER && !this.effects.swim) return this.crash('water', nx, nz);
    if (this.grid[idx] === OBST) {
      if (fire) this.destroyObstacle(idx);
      else return this.crash();
    }
    if (!ghost) {
      const len = this.body.length - (this.grow > 0 ? 0 : 1);
      for (let i = 1; i < len; i++) if (this.body[i].x === nx && this.body[i].z === nz) return this.demo ? this.crash() : this.selfBite(i, nx, nz);
    }

    const old = this.body;
    const nb = [{ x: nx, z: nz }, ...old];
    const np = old.map(p => ({ x: p.x, z: p.z }));
    if (this.grow > 0 && old.length < MAX_SEG) { this.grow--; np.push({ ...old[old.length - 1] }); }
    else { nb.pop(); if (this.grow > 0) this.grow--; }
    this.body = nb; this.prev = np;
    this.stuck = 0; this.sinceMove = 0;
    if (this.grid[idx] === WATER && !this.demo) { const w = this.cellPos(nx, nz); this.particles.emit(w.x, WATER_Y, w.z, 4, { colors: [0xffffff, 0xbfe8ff], speed: 1.6, up: 2, life: .5, floor: WATER_Y - .1 }); }

    if (this.sprinting && Math.random() < .7) {
      const p = this.cellPos(head.x, head.z);
      this.particles.emit(p.x, p.y + .1, p.z, 2, { color: 0xffffff, speed: 1.2, up: .8, life: .35, size: .8 });
    }
    if (this.grid[idx] === BRIDGE && !this.demo && Math.random() < .5) this.sfx.tone(180 + Math.random() * 40, .05, 'triangle', .05);

    if (this.effects.magnet) this.magnetEat();
    this.checkPickups();
  }

  /** The snake bites its own body: it hurts, loses the bitten part of its tail and some points. */
  selfBite(i, nx, nz) {
    const old = this.body;
    let nb = [{ x: nx, z: nz }, ...old.slice(0, i)];
    if (nb.length < 3) nb = [{ x: nx, z: nz }, ...old.slice(0, 2)];
    for (let k = nb.length - 1; k < old.length; k++) { const q = this.cellPos(old[k].x, old[k].z); this.particles.emit(q.x, q.y + .4, q.z, 6, { colors: [this.skinColor(k * 2), 0xff4a4a, 0xffffff], speed: 3, up: 3, life: .7 }); }
    this.prev = nb.map((q, k) => ({ ...(old[Math.min(k, old.length - 1)]) }));
    this.body = nb; this.grow = 0;
    this.stuck = 0; this.sinceMove = 0; this.combo = 0;
    const lost = Math.min(this.score, 30); this.score -= lost;
    this.popup('🐍 Ouch! -15  -' + lost, nx, nz, '#ff6b6b');
    this.say('flash', 'rgba(255,40,60,.35)');
    this.shake = Math.max(this.shake, .5);
    this.damage(15);
    this.invuln = Math.max(this.invuln, .8);
  }

  checkPickups() {
    const h = this.body[0];
    // harmless critters (bug, mouse, frog) are caught when the head is on or right next to them
    for (const f of [...this.foods]) if ((f.x === h.x && f.z === h.z) || (f.type === 'mover' && !f.def.bite && Math.abs(f.x - h.x) + Math.abs(f.z - h.z) <= 1)) { this.eatFoodItem(f); if (this.state !== 'playing' && this.state !== 'demo') return; }
    if (this.doorOpen && this.door && h.x === this.door.cx && h.z === this.door.cz) { this.finish('won'); return; }
    for (const sp of [...this.specials]) {
      if (sp.x === h.x && sp.z === h.z) { this.eatSpecial(sp); if (this.state !== 'playing' && this.state !== 'demo') return; }
    }
  }

  /** Magnet gem: normal food within two cells is eaten as you pass. */
  magnetEat() {
    const h = this.body[0];
    for (const f of [...this.foods]) {
      if (f.type === 'fruit' && Math.max(Math.abs(f.x - h.x), Math.abs(f.z - h.z)) <= 2) {
        this.eatFoodItem(f);
        if (this.state !== 'playing' && this.state !== 'demo') return;
      }
    }
  }

  magnetPull() {
    const h = this.body[0], N = this.N;
    const occ = new Set(this.body.slice(1).map(p => p.z * N + p.x));
    const pull = o => {
      const dx = h.x - o.x, dz = h.z - o.z;
      if (Math.max(Math.abs(dx), Math.abs(dz)) > 7 || (dx === 0 && dz === 0)) return;
      const tries = Math.abs(dx) >= Math.abs(dz)
        ? [[Math.sign(dx), 0], [0, Math.sign(dz)]] : [[0, Math.sign(dz)], [Math.sign(dx), 0]];
      for (const [sx, sz] of tries) {
        if (!sx && !sz) continue;
        const x = o.x + sx, z = o.z + sz, i = z * N + x;
        if (!this.inBounds(x, z) || this.isBlocked(i) || occ.has(i)) continue;
        o.x = x; o.z = z; return;
      }
    };
    this.foods.forEach(f => { if (f.type !== 'mover') pull(f); });
    this.specials.forEach(s => { if (s.key !== 'poison' && s.key !== 'penalty') pull(s); });
  }

  eatFoodItem(f) {
    const d = f.def, mover = f.type === 'mover', special = f.type === 'special';
    this.bumpCombo();
    const devil = !!this.effects.devil && f.type === 'fruit';     // devil mode: normal food is poisonous, but worth double
    const pts = this.addScore(Math.round((d.pts + this.levelIndex * 2) * (this.sprinting ? 2 : 1) * (devil ? 2 : 1)));
    if (mover) this.moverEaten++; else if (special) this.specialEaten++; else this.foodEaten++;
    this.grow += d.grow * (devil ? 2 : 1) + (this.cfg.mode === 'endless' ? 1 : 0);
    if (this.effects.burn) this.effects.burn = Math.max(.01, this.effects.burn - 2.5);      // eating cools the fire stone
    if (mover && d.heal) { this.health = Math.min(100, this.health + d.heal); this.popup('❤ +' + d.heal, f.x, f.z, '#ff8ab8'); }
    if (devil && !this.demo) { this.popup('☠️ -8', f.x, f.z, '#7dff5a'); this.say('flash', 'rgba(80,255,40,.3)'); this.damage(8); }
    if (this.timeLeft !== null) this.timeLeft = Math.min(99, this.timeLeft + (mover ? 3 : 1.5));
    for (let i = 0; i < Math.min(d.grow, 4); i++) this.bulges.push({ pos: -i * 6 });
    this.eatPulse = 1;
    const p = this.cellPos(f.x, f.z);
    this.particles.emit(p.x, p.y + .5, p.z, mover || special ? 26 : 18, { colors: [d.color, 0xffffff, 0xffd400], speed: 3.5, up: 2.5, life: .7 });
    this.popup(`${d.emoji} +${pts}${this.sprinting ? ' SPRINT!' : ''}`, f.x, f.z, mover || special ? '#ffd98a' : '#fff');
    if (!this.demo) (mover || special ? this.sfx.special() : this.sfx.eat());
    if (special) {
      this.shockwave(p.x, p.z, d.color, 7, .8);
      this.say('toast', `${d.emoji} ${d.name}! ${d.desc}`, '#ffe27a');
      this.applyVisualEffects();
    }
    this.saveCheckpoint();
    this.removeFood(f, false);
    this.foodSpawnT = Math.min(this.foodSpawnT, .6);
    this.checkWin();
  }

  /** Eating quickly keeps a combo going: every step adds +25% points (up to ×2). */
  bumpCombo() {
    this.combo = this.comboT > 0 ? this.combo + 1 : 1;
    this.comboT = 5;
    if (this.combo >= 3 && !this.demo) {
      this.sfx.tone(520 + this.combo * 70, .12, 'triangle', .16);
      const h = this.body[0];
      this.popup(`🔥 COMBO ×${this.combo}`, h.x, h.z, '#ffb347');
    }
  }
  comboMul() { return 1 + Math.min(Math.max(this.combo - 1, 0), 4) * .25; }

  /** Spells (speed, slow, invisible, reverse, live, sword) and gems (mushroom, devil eye, fire stone, magnet). */
  eatSpecial(sp) {
    const F = FRUITS[sp.key], k = sp.key;
    const p = this.cellPos(sp.x, sp.z), px = p.x, py = p.y, pz = p.z;
    this.removeSpecial(sp, false);
    this.particles.emit(px, py + .6, pz, 26, { colors: [F.color, 0xffffff], speed: 4, up: 3, life: .8 });
    this.shockwave(px, pz, F.color, 6);
    const bad = k === 'mushroom' || k === 'sword' || k === 'burn' || k === 'devil';
    if (!bad) { this.addScore(15); this.popup(`${F.emoji} +15`, sp.x, sp.z, '#ffe27a'); }
    if (!this.demo) (bad ? this.sfx.poison() : this.sfx.special());

    switch (k) {
      case 'fast': delete this.effects.slow; this.effects.fast = F.duration; break;
      case 'slow': delete this.effects.fast; this.effects.slow = F.duration; break;
      case 'invisible': this.effects.invisible = F.duration; break;
      case 'magnet': this.effects.magnet = F.duration; break;
      case 'heal':
        this.health = Math.min(100, this.health + 40);
        this.say('flash', 'rgba(255,90,160,.3)'); this.popup('💖 +40', sp.x, sp.z, '#ff8ab8');
        this.particles.emit(px, py + .8, pz, 20, { colors: [0xff4f8a, 0xffffff], speed: 2, up: 4, gravity: -2, life: 1 });
        break;
      case 'reverse': {       // the tail becomes the head and the head becomes the tail
        const b = this.body;
        if (b.length >= 2) {
          b.reverse();
          this.prev = b.map(q => ({ ...q }));
          const dx = Math.sign(b[0].x - b[1].x), dz = Math.sign(b[0].z - b[1].z);
          const nd = dx > 0 ? 'right' : dx < 0 ? 'left' : dz > 0 ? 'down' : dz < 0 ? 'up' : this.dirName;
          this.dirName = nd; this.headAngle = angleOf(nd);
          this.input.clear(); this.t = 1; this.acc = 0; this.sinceMove = 0;
          const q = this.cellPos(b[0].x, b[0].z);
          this.shockwave(q.x, q.z, 0xa14bff, 8, .8);
        }
        break;
      }
      case 'sword': {         // half health, half length, half points
        this.health = Math.max(1, Math.ceil(this.health / 2));
        this.score = Math.floor(this.score / 2);
        const len = this.body.length, nl = Math.max(3, Math.ceil(len / 2));
        for (let i = nl; i < len; i++) { const q = this.cellPos(this.body[i].x, this.body[i].z); this.particles.emit(q.x, q.y + .4, q.z, 3, { color: this.skinColor(i * 2), speed: 2, life: .6 }); }
        this.body.length = nl; this.prev.length = nl; this.grow = 0;
        this.say('flash', 'rgba(200,210,230,.4)'); this.shake = .5;
        this.popup('⚔️ ½', sp.x, sp.z, '#d8e0f0');
        break;
      }
      case 'mushroom':
        this.say('flash', 'rgba(255,120,200,.35)');
        this.popup(`🍄 -${F.damage}`, sp.x, sp.z, '#ff8ac8');
        this.damage(F.damage);
        break;
      case 'devil':
        this.effects.devil = F.duration;
        this.say('flash', 'rgba(255,40,20,.35)'); this.shake = .5;
        this.shockwave(px, pz, 0xff2a1a, 14, 1);
        break;
      case 'burn':
        this.effects.burn = F.duration; this.burnFlash = 0;
        this.say('flash', 'rgba(255,120,20,.35)');
        break;
    }
    this.say('toast', `${F.emoji} ${F.name}`, '#' + new THREE.Color(F.color).getHexString());
    this.applyVisualEffects();
    this.checkWin();
  }

  /** Remember where the snake was when it last ate: the rescue button brings it back here. */
  saveCheckpoint() { this.cp = { body: this.body.map(p => ({ ...p })), dir: this.dirName }; }

  /** Stuck for 5+ seconds? Then the rescue button is offered. */
  get canRescue() { return this.state === 'playing' && !this.demo && this.sinceMove > 5; }

  rescue() {
    if (!this.canRescue || !this.cp) return false;
    this.body = this.cp.body.map(p => ({ ...p }));
    this.prev = this.body.map(p => ({ ...p }));
    this.dirName = this.cp.dir; this.headAngle = angleOf(this.dirName);
    this.grow = 0; this.invuln = 2.5; this.acc = 0; this.t = 1;
    this.sinceMove = 0; this.bumpT = 0; this.stuck = 0;
    this.input.clear();
    const h = this.body[0], p = this.cellPos(h.x, h.z);
    this.particles.emit(p.x, p.y + .6, p.z, 36, { colors: [0xffffff, 0x7fe8ff, 0xffd400], speed: 4, up: 4, life: .9 });
    this.shockwave(p.x, p.z, 0x7fe8ff, 10, .8);
    this.sfx.special();
    this.say('toast', '🛟 Back at your last apple!', '#7fe8ff');
    this.snapCamera = false;
    return true;
  }

  boom() {
    const h = this.body[0], N = this.N, R = 3, p = this.cellPos(h.x, h.z);
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      const x = h.x + dx, z = h.z + dz;
      if (this.inBounds(x, z) && this.grid[z * N + x] === OBST) this.destroyObstacle(z * N + x);
    }
    this.enemies.forEach(e => { if (e.alive && Math.abs(e.x - h.x) <= 5 && Math.abs(e.z - h.z) <= 5) this.killEnemy(e); });
    this.shockwave(p.x, p.z, 0xff8a3a, 22, 1);
    this.particles.emit(p.x, p.y + .6, p.z, 40, { colors: [0xff5a00, 0xffd400, 0x555555], speed: 6, up: 4, life: 1 });
    this.shake = .7;
    if (!this.demo) this.sfx.fire();
  }

  goalsMet() {
    const g = this.goals;
    return !!g && (!g.fruit || this.foodEaten >= g.fruit) && (!g.special || this.specialEaten >= g.special) && (!g.mover || this.moverEaten >= g.mover);
  }

  /** Every goal done → the hidden door opens; the level is won when the snake slithers through it. */
  checkWin() {
    if (this.cfg.mode !== 'adventure' || this.state !== 'playing' || this.doorOpen) return;
    if (this.goalsMet()) this.openDoor();
  }

  destroyObstacle(idx) {
    const oid = this.map.owner[idx];
    const cells = oid >= 0 ? this.map.obstacles[oid].cells : [idx];
    for (const i of cells) { this.grid[i] = FREE; this.reachable[i] = 1; this.map.owner[i] = -1; }
    if (oid >= 0) this.world.destroyObstacle(oid);
    const x = idx % this.N, z = (idx / this.N) | 0, p = this.cellPos(x, z);
    this.particles.emit(p.x, p.y + .6, p.z, 22, { colors: [0xff3d00, 0xff9100, 0x555555], speed: 4, up: 3, life: .8 });
    this.addScore(5);
    this.shake = Math.max(this.shake, .25);
    if (!this.demo) this.sfx.noise(.2, .3, 700);
  }

  damage(n) {
    if (this.demo) return true;
    this.health = Math.max(0, this.health - n);
    this.say('flash', 'rgba(255,40,60,.35)');
    this.sfx.hurt();
    this.shake = Math.max(this.shake, .4);
    if (this.health <= 0) { this.finish('dead'); return false; }
    return true;
  }

  /** Walls, trees, rocks, the river and your own tail only stop the snake. It bumps, gets dizzy and waits for a new direction. */
  crash(kind, wx, wz) {
    this.prev = this.body.map(p => ({ ...p }));
    this.t = 1;
    this.bumpT = 1;
    const h = this.body[0], p = this.cellPos(h.x, h.z);
    if (this.demo) { if (++this.stuck > 5) this.respawn(true); return; }
    if (this.bumpCool > 0) return;
    this.bumpCool = .55;
    const d = DIRS[this.dirName];
    if (kind === 'water') {
      const w = this.cellPos(wx, wz);
      this.particles.emit(w.x, WATER_Y, w.z, 16, { colors: [0xffffff, 0xbfe8ff, 0x6ac8ff], speed: 2, up: 3, life: .7, floor: WATER_Y - .1 });
      this.sfx.tone(300, .2, 'sine', .12, 120);
      if (!this.waterHint) { this.waterHint = true; this.say('toast', '🌉 Use a bridge to cross!', '#8fd8ff'); }
    } else {
      this.particles.emit(p.x + d.x * .6, p.y + .5, p.z + d.z * .6, 14, { colors: [0xffffff, 0xffd400, this.skinColor(0)], speed: 2.5, up: 2, life: .6 });
      this.sfx.bonk();
      this.particles.emit(p.x - d.x * .1, p.y + .15, p.z - d.z * .1, 8, { colors: [0xd8c8a0, 0xffffff], speed: 1.4, up: .8, life: .5, size: .9 });
    }
    this.shake = Math.max(this.shake, .22);
  }

  checkTraffic() {
    const cars = this.world.cars;
    if (!cars || !cars.length || this.invuln > 0 || this.demo || this.effects.invisible || this.effects.fire) return;
    const off = this.N / 2 - .5, h = this.body[0], hx = h.x - off, hz = h.z - off;
    for (const c of cars) {
      if (c.hidden) continue;
      const along = c.axis === 'z' ? Math.abs(c.z - hz) : Math.abs(c.x - hx);
      const across = c.axis === 'z' ? Math.abs(c.x - hx) : Math.abs(c.z - hz);
      if (along < 1.15 && across < .6) { this.hitByCar(h); return; }
    }
  }

  hitByCar(h) {
    this.popup('🚗 -25', h.x, h.z, '#ff6b6b');
    this.invuln = 1.8;
    this.sfx.honk();
    const p = this.cellPos(h.x, h.z);
    this.particles.emit(p.x, p.y + .5, p.z, 24, { colors: [0xffffff, 0xffd400, 0xff4a4a], speed: 5, up: 3, life: .7 });
    this.damage(25);
  }

  respawn(short = false) {
    const s = this.start, len = short ? 3 : this.body.length;
    this.body = [];
    for (let i = 0; i < len; i++) this.body.push({ x: s.x - Math.min(i, 2), z: s.z });
    this.prev = this.body.map(p => ({ ...p }));
    this.dirName = this.startDir;
    this.headAngle = angleOf(this.dirName);
    this.invuln = short ? 1 : 2.5;
    this.acc = 0;
    this.input.clear();
    this.state = this.demo ? 'demo' : 'playing';
    const p = this.cellPos(s.x, s.z);
    this.particles.emit(p.x, p.y + .5, p.z, 24, { color: 0xffffff, speed: 3, up: 3, life: .7 });
  }

  finish(kind) {
    if (this.demo) return;
    this.state = kind;
    this.endKind = kind;
    this.endT = 0;
    this.deathIdx = 0;
    this.input.releaseAll();
    if (kind === 'won') this.sfx.win();
    else this.sfx.lose();
  }

  tickEnd(dt) {
    if (this.endKind === 'won' && Math.random() < .25) {
      const h = this.head.group.position;
      this.particles.emit(h.x + rand(-4, 4), h.y + rand(2, 5), h.z + rand(-4, 4), 20, {
        colors: [0xff3b5c, 0xffd400, 0x43c463, 0x2f7bff, 0xd040fb, 0xffffff], speed: 5, up: 1, gravity: -4, life: 1.1, floor: h.y - 2,
      });
    }
    if (this.endKind === 'dead') {
      const target = Math.floor(this.endT * 28);
      while (this.deathIdx < Math.min(target, this.body.length)) {
        const s = this.body[this.deathIdx], p = this.cellPos(s.x, s.z);
        this.particles.emit(p.x, p.y + .4, p.z, 5, { colors: [this.skinColor(this.deathIdx * 2), 0xffffff], speed: 3, up: 3, life: .8 });
        this.deathIdx++;
      }
    }
    if (!this.reported && this.endT > 1.7) {
      this.reported = true;
      const stars = this.endKind === 'won' ? (this.health >= 70 ? 3 : this.health >= 40 ? 2 : 1) : 0;
      this.ui.onEnd({ kind: this.endKind, mode: this.cfg.mode, level: this.levelIndex, score: this.score, stars, food: this.foodEaten, length: this.body.length, time: this.elapsed });
    }
  }

  // ── Enemies ───────────────────────────────────────────────
  updateEnemies(dt) {
    const h = this.body[0];
    for (const e of this.enemies) {
      if (!e.alive) {
        e.respawnT -= dt;
        if (e.respawnT <= 0 && !this.effects.fire) this.reviveEnemy(e);
        continue;
      }
      e.spawnT = Math.min(1, e.spawnT + dt * 2.5);
      if (e.stun > 0) e.stun -= dt;
      if (!this.effects.freeze && !(e.stun > 0)) {
        e.timer -= dt;
        if (e.timer <= 0) { e.timer = e.interval * rand(.8, 1.3); this.moveEnemy(e); }
      }
      e.mt = Math.min(1, e.mt + dt / (e.interval * .7));
      if (e.x === h.x && e.z === h.z) this.onEnemyContact(e);
      if (this.state !== 'playing' && this.state !== 'demo') return;
    }
  }

  moveEnemy(e) {
    const N = this.N, h = this.body[0];
    const names = DIR_NAMES.slice().sort(() => Math.random() - .5);
    const near = Math.abs(e.x - h.x) + Math.abs(e.z - h.z) < 14;
    const chase = near && !this.effects.invisible && !this.effects.fire && Math.random() < (e.kind === 'croc' ? .55 : e.kind === 'crab' ? .2 : .25 + this.levelIndex * .035);
    if (chase) names.sort((a, b) => (Math.abs(e.x + DIRS[a].x - h.x) + Math.abs(e.z + DIRS[a].z - h.z)) - (Math.abs(e.x + DIRS[b].x - h.x) + Math.abs(e.z + DIRS[b].z - h.z)));
    if (this.effects.fire) names.sort((a, b) => (Math.abs(e.x + DIRS[b].x - h.x) + Math.abs(e.z + DIRS[b].z - h.z)) - (Math.abs(e.x + DIRS[a].x - h.x) + Math.abs(e.z + DIRS[a].z - h.z)));
    const bodySet = new Set(this.body.slice(1).map(p => p.z * N + p.x));
    for (const n of names) {
      const x = e.x + DIRS[n].x, z = e.z + DIRS[n].z, i = z * N + x;
      if (!this.inBounds(x, z) || !this.enemyCanEnter(e, i) || bodySet.has(i)) continue;
      if (this.enemies.some(o => o !== e && o.alive && o.x === x && o.z === z)) continue;
      e.px = e.x; e.pz = e.z; e.x = x; e.z = z; e.mt = 0;
      e.face = Math.atan2(DIRS[n].x, DIRS[n].z);
      return;
    }
  }

  onEnemyContact(e) {
    if (this.effects.fire) { this.killEnemy(e); return; }
    if (this.effects.invisible || this.invuln > 0) return;
    if (this.demo) { this.killEnemy(e, false); e.respawnT = 3; return; }
    if (e.kind === 'croc') {            // chomp! then it needs a moment to recover
      this.popup('🐊 CHOMP -25', e.x, e.z, '#ff6b6b');
      this.invuln = 1.6; e.stun = 2.5;
      this.say('flash', 'rgba(255,60,40,.35)');
      this.damage(25);
      return;
    }
    if (e.kind === 'crab') {            // a red crab's pinch (or eating it) hurts
      this.popup('🦀 -15', e.x, e.z, '#ff6b6b');
      this.invuln = 1.2;
      this.killEnemy(e, false); e.respawnT = 7;
      this.damage(15);
      return;
    }
    this.popup('👾 -20', e.x, e.z, '#ff6b6b');
    this.invuln = 1.5;
    this.killEnemy(e, false);
    e.respawnT = 4;
    this.damage(20);
  }

  // ── Demo autopilot (menu background) ─────────────────────
  aiDir() {
    const N = this.N, h = this.body[0];
    const blocked = new Uint8Array(N * N);
    for (let i = 0; i < N * N; i++) blocked[i] = this.isBlocked(i) ? 1 : 0;
    for (let i = 0; i < this.body.length - 1; i++) blocked[this.body[i].z * N + this.body[i].x] = 1;
    const target = this.specials.find(s => !['mushroom', 'sword', 'burn', 'devil'].includes(s.key)) || this.nearestFood();
    if (target) {
      const first = new Int8Array(N * N).fill(-1);
      const seen = new Uint8Array(N * N);
      const s = h.z * N + h.x, q = [s]; seen[s] = 1;
      let qi = 0;
      while (qi < q.length) {
        const c = q[qi++], cx = c % N, cz = (c / N) | 0;
        for (let k = 0; k < 4; k++) {
          const n = DIR_NAMES[k], x = cx + DIRS[n].x, z = cz + DIRS[n].z;
          if (!this.inBounds(x, z)) continue;
          const j = z * N + x;
          if (seen[j] || blocked[j]) continue;
          if (c === s && n === OPP[this.dirName]) continue;
          seen[j] = 1;
          first[j] = c === s ? k : first[c];
          if (x === target.x && z === target.z) return DIR_NAMES[first[j]];
          q.push(j);
        }
      }
    }
    const opts = DIR_NAMES.filter(n => n !== OPP[this.dirName]).filter(n => {
      const x = h.x + DIRS[n].x, z = h.z + DIRS[n].z;
      return this.inBounds(x, z) && !blocked[z * N + x];
    });
    return opts.includes(this.dirName) ? this.dirName : opts[0] || null;
  }

  // ── Visuals ───────────────────────────────────────────────
  skinColor(k) {
    const sk = M.SKINS[this.skinIndex];
    if (sk.rainbow) return _c.setHSL(((k * .03 + this.time * .25) % 1), .85, .55).getHex();
    const e = Math.abs(((k % 12) / 12) - .5);          // dark saddle with a light outline, like a real snake
    if (e < .16) return _c.set(sk.a).multiplyScalar(.5).getHex();
    return e < .22 ? sk.b : sk.a;
  }

  applyVisualEffects() {
    const inv = !!this.effects.invisible;
    this.bodyMesh.visible = !inv;                 // invisible: body and head vanish completely, only the tongue stays
    if (!(this.effects.devil || this.effects.burn)) { this.bodyMat.emissive.set(0x000000); this.head.mat.emissive.set(0x000000); }
    this.head.crown.visible = !!this.effects.devil;
    this.magnetRing.visible = !!this.effects.magnet;
    this.tintFoods();
  }

  /** Devil mode makes normal food glow poisonous green. */
  tintFoods() {
    const dev = !!this.effects.devil;
    for (const f of this.foods) {
      if (f.type !== 'fruit') continue;
      f.mesh.userData.inner.traverse(o => {
        const mt = o.material;
        if (!mt || !mt.emissive) return;
        o.userData.em0 ??= mt.emissive.getHex(); o.userData.ei0 ??= mt.emissiveIntensity;
        if (dev) { mt.emissive.set(0x30d030); mt.emissiveIntensity = .9; } else { mt.emissive.setHex(o.userData.em0); mt.emissiveIntensity = o.userData.ei0; }
      });
    }
  }

  shockwave(x, z, color, size = 6, dur = .7, y) {
    const mesh = M.makeShock(color);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, (y ?? this.ground(x, z)) + .08, z);
    this.scene.add(mesh);
    this.shocks.push({ mesh, t: 0, size, dur });
  }

  animate(dt) {
    const T = this.time;
    this.particles.update(dt);
    this.bumpT = Math.max(0, this.bumpT - dt * 2.2);
    this.updateWeather(dt);
    this.renderSnake(dt);
    const g = (x, z) => this.ground(x, z);

    // foods: pop in, bob, critters hop, the countdown ring shrinks and blinks near the end
    for (const f of this.foods) {
      const u = f.mesh.userData, mover = f.type === 'mover', b = this.cellPos(f.x, f.z);
      if (mover) {
        const a = this.cellPos(f.px, f.pz), k = f.mt * f.mt * (3 - 2 * f.mt);
        f.mesh.position.x = a.x + (b.x - a.x) * k; f.mesh.position.z = a.z + (b.z - a.z) * k;
      } else {
        f.mesh.position.x += (b.x - f.mesh.position.x) * Math.min(1, dt * 16);
        f.mesh.position.z += (b.z - f.mesh.position.z) * Math.min(1, dt * 16);
      }
      f.mesh.position.y = g(f.mesh.position.x, f.mesh.position.z);
      f.mesh.scale.setScalar(Math.max(.01, easeOutBack(f.t)));
      u.inner.position.y = mover ? Math.sin(f.mt * Math.PI) * .35 : Math.sin(T * 3 + f.phase) * .07;
      u.inner.rotation.y = mover ? f.face + (f.kind === 'crab' ? Math.PI / 2 : 0) : T * 1.5 + f.phase;
      const ratio = f.max === Infinity ? 1 : f.life / f.max;
      u.ring.scale.setScalar(.25 + .75 * ratio);
      u.ring.material.color.set(ratio < .25 ? 0xff4a4a : ratio < .5 ? 0xffd24a : 0xffffff);
      if (u.aura) { u.aura.scale.setScalar(1 + Math.sin(T * 5 + f.phase) * .08); u.stars.rotation.y = T * 2.2; u.stars.position.y = Math.sin(T * 3 + f.phase) * .07; }
      f.mesh.visible = f.life > 3.5 || Math.sin(T * 22) > -.2;
    }

    // pointer arrow toward the apple
    const hp = this.head.group.position;
    let showArrow = false;
    const tgt = this.arrowTarget();
    if (tgt && !this.demo && (this.state === 'playing' || this.state === 'countdown')) {
      const dx = tgt.x - hp.x, dz = tgt.z - hp.z, d = Math.hypot(dx, dz);
      this.arrow.material.color.set(this.doorOpen ? 0x6affb4 : 0xff3a4a);
      if (d > 4.5) {
        showArrow = true;
        const r = 1.7, ax = hp.x + dx / d * r, az = hp.z + dz / d * r;
        this.arrow.position.set(ax, g(ax, az) + .25 + Math.sin(T * 6) * .05, az);
        this.arrow.rotation.y = Math.atan2(dx, dz);
        this.arrow.material.opacity = .55 + Math.sin(T * 6) * .25;
        this.arrow.scale.setScalar(clamp(d / 10, .8, 1.25));
      }
    }
    this.arrow.visible = showArrow;

    // specials
    for (const sp of this.specials) {
      const u = sp.mesh.userData;
      const tp = this.cellPos(sp.x, sp.z);
      sp.mesh.position.x += (tp.x - sp.mesh.position.x) * Math.min(1, dt * 16);
      sp.mesh.position.z += (tp.z - sp.mesh.position.z) * Math.min(1, dt * 16);
      sp.mesh.position.y = g(sp.mesh.position.x, sp.mesh.position.z);
      const s = Math.max(.01, easeOutBack(Math.min(1, sp.t * 2.5)));
      sp.mesh.scale.setScalar(s);
      const bob = Math.sin(T * 3 + sp.x) * .1;
      u.core.position.y = bob; u.core.rotation.y = T * 1.5;
      u.shell.position.y = .5 + bob; u.shell.scale.setScalar(1 + Math.sin(T * 5) * .08);
      u.stars.rotation.y = T * 2.2; u.stars.position.y = bob;
      u.sprite.position.y = 1.5 + bob;
      u.ring.scale.setScalar(.25 + .75 * Math.max(0, sp.life / 14));
      if (sp.key === 'color') {
        const c = _c.setHSL((T * .4) % 1, .9, .6);
        u.shell.material.color.copy(c); u.ring.material.color.copy(c);
      }
      sp.mesh.visible = sp.life > 3 || Math.sin(T * 22) > -.2;
    }

    // enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const a = this.cellPos(e.px, e.pz).clone(), b = this.cellPos(e.x, e.z);
      const mt = e.mt, k = mt * mt * (3 - 2 * mt);
      const u = e.mesh.userData;
      const ex = a.x + (b.x - a.x) * k, ez = a.z + (b.z - a.z) * k;
      const slime = e.kind === 'slime';
      e.mesh.position.set(ex, e.kind === 'croc' ? Math.max(g(ex, ez), WATER_Y - .05) : g(ex, ez), ez);
      const hop = Math.sin(mt * Math.PI);
      u.pivot.position.y = hop * (slime ? .45 : .06);
      const breathe = Math.sin(T * 5 + e.phase) * .06;
      const sy = !slime ? 1 + Math.sin(T * 6 + e.phase) * .03 : mt < 1 ? 1 + hop * .25 - (1 - hop) * .2 : 1 + breathe;
      const sxz = 1 / Math.sqrt(Math.max(.3, sy));
      const sp = easeOutBack(e.spawnT);
      u.pivot.scale.set(sxz * sp, sy * sp, sxz * sp);
      e.mesh.rotation.y = lerpAngle(e.mesh.rotation.y, e.face + (e.kind === 'crab' ? Math.PI / 2 : 0), Math.min(1, dt * 10));
      u.body.material.emissiveIntensity = this.effects.fire ? .5 + Math.sin(T * 20) * .3 : (this.theme.dark ? .6 : .18);
    }

    // the exit door rises, glows and shines a beam once it opens
    if (this.door && this.door.open) {
      const dr = this.door, u = dr.group.userData;
      dr.t = Math.min(1, dr.t + dt * 1.6);
      const ds = Math.max(.01, easeOutBack(dr.t));
      if (dr.kind === 'hole') dr.group.scale.set(ds, 1, ds); else dr.group.scale.set(1, ds, 1);
      u.portal.material.opacity = .55 + Math.sin(T * 5) * .2;
      u.beam.rotation.y = T * .8; u.beam.material.opacity = .18 + Math.sin(T * 3) * .05;
    }

    // shockwaves
    for (let i = this.shocks.length - 1; i >= 0; i--) {
      const s = this.shocks[i];
      s.t += dt / s.dur;
      if (s.t >= 1) { this.scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); this.shocks.splice(i, 1); continue; }
      s.mesh.scale.setScalar(.5 + s.t * s.size);
      s.mesh.material.opacity = (1 - s.t) * .9;
    }

    this.updateCamera(dt);
    const headPos = { x: hp.x, y: hp.y, z: hp.z };
    this.world.update(dt, T, this.camLook, headPos);
  }

  /** Writes the snake's body: Catmull-Rom path → rings of vertices → colours (saddles, flanks, pale belly). */
  buildTube(pts, n, T, amp, deathIdx) {
    const P = this.tubePos, N = this.tubeNor, C = this.tubeCol, R = TUBE_R, cs = this.ringCos, sn = this.ringSin;
    const sk = M.SKINS[this.skinIndex];
    const cA = new THREE.Color(sk.a ?? 0x43c463), cB = new THREE.Color(sk.b ?? 0xa6e35a);
    const cD = cA.clone().multiplyScalar(.42), cBelly = cB.clone().lerp(new THREE.Color(0xffffff), .45);
    const total = Math.max(1, (n - 1) * TUBE_SPC);
    let ring = 0, ptx = 0, ptz = 1;
    const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const emit = (x, z, tx, tz, u) => {
      const f = u / total;
      let r = .36 * (1 - f * .3);
      if (f < .04) r *= .85 + f * 3.75;                                // slim neck right behind the head
      if (f > .7) r *= .08 + .92 * Math.pow((1 - f) / .3, .8);         // long pointed tail
      for (const bg of this.bulges) r *= 1 + .34 * Math.exp(-((u - bg.pos) ** 2) * .1);
      r *= 1 + .025 * Math.sin(this.wavePhase * .5 - u * .5);
      const tl = Math.hypot(tx, tz);
      if (tl > 1e-4) { ptx = tx / tl; ptz = tz / tl; }
      const sx = -ptz, sz = ptx;                                          // sideways vector
      const w = Math.sin(this.wavePhase - u * .34) * amp * (.35 + f * 1.1) * Math.min(1, u / 8);
      x += sx * w; z += sz * w;
      const cy = this.sGround(x, z) + r * .88 + .02;
      const ph = (u / TUBE_SPC / 2.6) % 1, e = Math.abs(ph - .5);        // saddle pattern repeats every 2.6 cells
      const band = (u % 2) ? .95 : 1;
      for (let j = 0; j < R; j++) {
        const o = (ring * R + j) * 3, c = cs[j], s2 = sn[j], flat = s2 < 0 ? .62 : 1;
        P[o] = x + sx * c * r; P[o + 1] = cy + s2 * flat * r; P[o + 2] = z + sz * c * r;
        const nx = sx * c, ny = s2, nz = sz * c, nl = Math.hypot(nx, ny, nz) || 1;
        N[o] = nx / nl; N[o + 1] = ny / nl; N[o + 2] = nz / nl;
        let cr, cg, cb;
        if (sk.rainbow) { _c.setHSL(((u / TUBE_SPC) * .06 + T * .25) % 1, .85, .55); cr = _c.r; cg = _c.g; cb = _c.b; }
        else {
          cr = cA.r; cg = cA.g; cb = cA.b;
          const belly = sm(.0, -.55, s2);                                 // pale underside
          cr += (cBelly.r - cr) * belly; cg += (cBelly.g - cg) * belly; cb += (cBelly.b - cb) * belly;
          if (s2 > .12) {                                                 // dorsal saddles with a light outline
            const wd = .2 * sm(.1, .85, s2);
            const k = 1 - sm(wd - .05, wd, e);
            const edge = sm(wd + .06, wd, e) * (1 - k);
            cr += (cD.r - cr) * k; cg += (cD.g - cg) * k; cb += (cD.b - cb) * k;
            cr += (cB.r - cr) * edge * .7; cg += (cB.g - cg) * edge * .7; cb += (cB.b - cb) * edge * .7;
          } else if (s2 > -.35 && e > .42) {                              // little dark spots down the flanks
            cr += (cD.r - cr) * .55; cg += (cD.g - cg) * .55; cb += (cD.b - cb) * .55;
          }
        }
        C[o] = cr * band; C[o + 1] = cg * band; C[o + 2] = cb * band;
      }
      ring++;
    };
    const first = Math.max(0, deathIdx);
    for (let i = first; i < n; i++) {
      const p1 = pts[i], p2 = pts[Math.min(n - 1, i + 1)], p0 = pts[Math.max(0, i - 1)], p3 = pts[Math.min(n - 1, i + 2)];
      const steps = i === n - 1 ? 1 : TUBE_SPC;
      for (let h = 0; h < steps; h++) {
        const t = h / TUBE_SPC, t2 = t * t, t3 = t2 * t;
        const x = .5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
        const z = .5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);
        let tx = .5 * ((-p0.x + p2.x) + 2 * (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t + 3 * (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t2);
        let tz = .5 * ((-p0.z + p2.z) + 2 * (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t + 3 * (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t2);
        if (i === n - 1) { tx = p1.x - p0.x; tz = p1.z - p0.z; }
        emit(x, z, tx, tz, i * TUBE_SPC + h);
      }
    }
    const g = this.bodyMesh.geometry;
    g.setDrawRange(0, Math.max(0, ring - 1) * R * 6);
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; g.attributes.color.needsUpdate = true;
  }

  /** Thunderstorm: random lightning that lights the whole scene for a moment, then thunder. */
  updateWeather(dt) {
    if (!this.theme.lightning) return;
    this.lightT -= dt;
    if (this.lightT <= 0) {
      this.lightT = rand(3.5, 9);
      this.flashT = 1;
      if (Math.random() < .5) setTimeout(() => { this.flashT = Math.max(this.flashT, .8); }, 140);
      if (!this.demo) { if (this.ui.flash) this.ui.flash('rgba(235,240,255,.5)'); this.sfx.thunder(rand(.2, 1)); }
    }
    this.flashT = Math.max(0, this.flashT - dt * 4.5);
    this.skyMat.uniforms.uFlash.value = this.flashT;
    this.hemi.intensity = this.baseHemi + this.flashT * 2.4;
    this.sun.intensity = this.baseSun + this.flashT * 3.2;
    this.scene.background.copy(this.bgColor).lerp(_c.set(0xffffff), this.flashT * .45);
    this.scene.fog.color.copy(this.scene.background);
  }

  renderSnake(dt) {
    const n = this.body.length, T = this.time;
    const pts = this.pts;
    while (pts.length < n) pts.push(new THREE.Vector3());
    const tt = (this.state === 'playing' || this.state === 'demo') ? this.t : 1;
    const off = this.N / 2 - .5;
    for (let i = 0; i < n; i++) {
      const p = this.prev[i] || this.body[i], c = this.body[i];
      const x = p.x + (c.x - p.x) * tt - off, z = p.z + (c.z - p.z) * tt - off;
      pts[i].set(x, this.sGround(x, z), z);
    }

    const blinkOn = this.invuln > 0 && this.state !== 'respawn' && Math.floor(T * 12) % 2 === 0;
    const dead = this.state === 'dead';
    const deathIdx = dead ? this.deathIdx : 0;

    // head
    const hg = this.head.group;
    hg.visible = !blinkOn && !(dead && deathIdx > 0);
    const target = angleOf(this.dirName);
    this.headAngle = lerpAngle(this.headAngle, target, Math.min(1, dt * 18));
    this.eatPulse = Math.max(0, this.eatPulse - dt * 4);
    const bob = Math.sin(T * (this.sprinting ? 20 : 11)) * .035;
    this.wavePhase += dt * ((this.sinceMove < .5 || this.state === 'won') ? (this.sprinting ? 14 : 9.5) : 2.4);
    let hx = pts[0].x, hz = pts[0].z;
    if (this.state === 'playing' || this.state === 'demo') {
      const sw = Math.sin(this.wavePhase + .5) * (this.sprinting ? .08 : .055);
      hx += Math.cos(this.headAngle) * sw; hz -= Math.sin(this.headAngle) * sw;
    }
    if (this.state === 'respawn') { hx += rand(-.08, .08); hz += rand(-.08, .08); }
    const fx = Math.sin(this.headAngle) * .45, fz = Math.cos(this.headAngle) * .45;
    const pitch = Math.atan2(this.ground(hx + fx, hz + fz) - this.ground(hx - fx, hz - fz), .9);
    hg.position.set(hx, this.sGround(hx, hz) + .38 + bob + (this.state === 'won' ? Math.abs(Math.sin(T * 8)) * .5 : 0), hz);
    hg.rotation.set(-pitch * .8, this.headAngle + (this.state === 'won' ? T * 6 : Math.cos(this.wavePhase + .5) * .09), Math.sin(T * 6) * .05, 'YXZ');
    hg.scale.setScalar(.76 + this.eatPulse * .18);     // head is only a little wider than the body
    if (this.bumpT > 0) {                      // bonk: squash, spring back with a little overshoot, nod, shiver and see stars
      const bt = this.bumpT, kk = 1 - bt, sp = Math.exp(-5 * kk) * Math.cos(16 * kk), d = DIRS[this.dirName];
      const back = .34 * (1 - sp) * bt;
      hg.position.x -= d.x * back; hg.position.z -= d.z * back;
      hg.rotation.z += Math.sin(T * 34) * .2 * bt;
      hg.rotation.x += -.25 * Math.max(0, sp);
      hg.scale.z *= 1 - .24 * Math.max(0, sp); hg.scale.x *= 1 + .12 * Math.max(0, sp);
      if (Math.random() < dt * 18) { const an = T * 7 + Math.random() * 6; this.particles.emit(hg.position.x + Math.cos(an) * .5, hg.position.y + .8, hg.position.z + Math.sin(an) * .5, 1, { colors: [0xffe27a, 0xffffff], speed: .2, up: .3, gravity: 0, life: .4, size: 1.1 }); }
    }
    this.dizzy.visible = this.bumpT > .08 && !blinkOn;
    if (this.dizzy.visible) {
      this.dizzy.position.set(hg.position.x + Math.cos(T * 7) * .35, hg.position.y + .95, hg.position.z + Math.sin(T * 7) * .35);
      this.dizzy.material.rotation = T * 5;
      this.dizzy.material.opacity = Math.min(1, this.bumpT * 3);
    }

    const fpsOn = this.fps;
    const ghostly = !!this.effects.invisible;
    this.head.parts.forEach(p => { p.visible = !fpsOn && !ghostly; });
    this.head.tongue.visible = !fpsOn;
    {                                              // first person: a fixed, realistic forked tongue that flicks out twice
      const tg = this.fpsTongue;
      const act = this.flick >= 0 ? Math.min(1, this.flick) : 0;
      const ext = fpsOn && this.flick >= 0 ? Math.pow(Math.abs(Math.sin(act * Math.PI * 2)), .8) : 0;
      tg.group.visible = ext > .02;
      if (tg.group.visible) {
        const L = .95 * ext;
        tg.stem.scale.z = Math.max(.001, L); tg.tip.position.z = -L;
        const spread = .18 + .5 * ext;
        tg.prongL.rotation.y = spread; tg.prongR.rotation.y = -spread;
        tg.group.rotation.y = Math.sin(T * 30) * .1 * ext;
        tg.group.rotation.x = -.16 + Math.sin(T * 24) * .04 * ext;
      }
    }
    if (fpsOn) this.dizzy.visible = false;
    this.head.crown.visible = !!this.effects.devil && !fpsOn && !ghostly;
    {
      const dev = !!this.effects.devil, em = this.head.eyeMat;     // devil eyes burn orange-red
      em.color.set(dev ? 0xff7a2a : 0xffffff); em.emissive.set(dev ? 0xff2a00 : 0x000000); em.emissiveIntensity = dev ? .8 + Math.sin(T * 18) * .2 : 0;
      if (dev && !this.demo && Math.random() < dt * 25) this.particles.emit(hg.position.x, hg.position.y + .45, hg.position.z, 1, { colors: [0xff5a00, 0xffd400], speed: .5, up: 2.5, gravity: 1, life: .5, size: 1.2 });
    }
    const sk = M.SKINS[this.skinIndex];
    this.head.mat.color.set(sk.rainbow ? this.skinColor(0) : sk.a);
    this.head.markMat.color.copy(this.head.mat.color).multiplyScalar(.5);
    if (this.effects.devil || this.effects.burn) {
      const f = .6 + Math.sin(T * 20) * .3;
      this.bodyMat.emissive.set(0xff4400); this.bodyMat.emissiveIntensity = f;
      this.head.mat.emissive.set(0xff4400); this.head.mat.emissiveIntensity = f;
      this.head.crown.rotation.y = T * 4;
      this.head.crown.children.forEach((c, i) => { c.scale.y = .7 + Math.sin(T * 18 + i) * .35; });
    }

    // tongue + blink
    this.tongueT -= dt;
    if (this.tongueT <= 0 && this.flick < 0) { this.flick = 0; }
    if (this.flick >= 0) {
      this.flick += dt / .35;
      const f = Math.sin(Math.min(1, this.flick) * Math.PI);
      this.head.tongue.scale.z = Math.max(.01, f);
      this.head.tongue.rotation.x = Math.sin(this.flick * 30) * .15 * f;
      if (this.flick >= 1) {
        this.flick = -1;
        const near = this.foods.some(f => Math.abs(f.x - this.body[0].x) + Math.abs(f.z - this.body[0].z) < 4);
        this.tongueT = near ? .25 : this.fps ? rand(.9, 1.8) : rand(.8, 2);
      }
    }
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 0; this.blinkT = rand(2, 4.5); }
    let ey = 1;
    if (this.blink >= 0) { this.blink += dt / .16; ey = Math.max(.1, Math.abs(1 - this.blink * 2)); if (this.blink >= 1) this.blink = -1; }
    if (dead || this.state === 'respawn') ey = .15;
    if (this.bumpT > .25) ey = Math.min(ey, .35);
    this.head.eyes.forEach(e => e.scale.y = ey);

    for (const b of this.bulges) b.pos += dt * 8 * TUBE_SPC;
    this.bulges = this.bulges.filter(b => b.pos < n * TUBE_SPC + 6);
    const amp = (this.sprinting ? .11 : .07) + this.bumpT * .12;
    this.bodyMesh.visible = !blinkOn && !this.effects.invisible;
    this.buildTube(pts, n, T, amp, deathIdx);

    // magnet ring
    if (this.magnetRing.visible) {
      this.magnetRing.position.set(hg.position.x, this.ground(hg.position.x, hg.position.z) + .15, hg.position.z);
      this.magnetRing.scale.setScalar(1 + Math.sin(T * 8) * .15);
      this.magnetRing.rotation.z = T * 3;
    }
  }

  updateCamera(dt) {
    const aspect = innerWidth / innerHeight;
    const look = this.camTarget;
    const hp = this.head.group.position;
    const half = this.N / 2;
    if (this.state === 'demo') {
      // slow cinematic orbit around the demo snake
      const a = this.time * .1, r = 15;
      look.set(clamp(hp.x, -half + 4, half - 4), hp.y - .3, clamp(hp.z, -half + 4, half - 4));
      this.camDesired.set(look.x + Math.sin(a) * r, look.y + 11, look.z + Math.cos(a) * r);
    } else {
      const d = DIRS[this.dirName];
      const alive = this.state === 'playing' || this.state === 'countdown';
      const la = this.viewMode === 'top' ? 3.6 : this.viewMode === 'tilt' ? 3.2 : 2.2;
      this.lookAhead.lerp(_v.set(alive ? d.x * la : 0, 0, alive ? d.z * la : 0), 1 - Math.exp(-dt * 2));
      const lim = half - (aspect < 1 ? 3 : 5);
      look.set(clamp(hp.x + this.lookAhead.x, -lim, lim), 0, clamp(hp.z + this.lookAhead.z, -lim, lim));
      look.y = this.ground(look.x, look.z) * .7 + hp.y * .3 - .3;
      const dist = aspect < 1 ? 15.5 : 13.5;
      if (this.viewMode === 'top') {
        const h = aspect < 1 ? 31 : 26;
        look.y = this.ground(look.x, look.z) * .5;
        this.camDesired.set(look.x, look.y + h, look.z + .02);
      } else if (this.viewMode === 'tilt') {
        const td = aspect < 1 ? 19 : 16;
        this.camDesired.set(look.x, look.y + td * .5, look.z + td);
      } else if (this.viewMode === 'fps') {
        // through the snake's eyes: yaw follows the head, a gentle slither sway, only the tongue is visible
        this.fpsYaw = lerpAngle(this.fpsYaw ?? this.headAngle, this.headAngle, 1 - Math.exp(-dt * 8));
        const fx = Math.sin(this.fpsYaw), fz = Math.cos(this.fpsYaw);
        const slope = this.ground(hp.x + fx * 3, hp.z + fz * 3) - this.ground(hp.x, hp.z);
        const sway = Math.sin(this.wavePhase + .5) * .3;
        this.camDesired.set(hp.x - fx * .08, hp.y + .5, hp.z - fz * .08);
        look.set(hp.x + fx * 6 + Math.cos(this.fpsYaw) * sway, hp.y + .5 - 1.4 + slope * .6, hp.z + fz * 6 - Math.sin(this.fpsYaw) * sway);
        this.snapCamera = true;
      } else this.camDesired.set(look.x, look.y + dist * .86, look.z + dist * .58);
    }
    if (this.snapCamera) {
      this.camPos.copy(this.camDesired); this.camLook.copy(look); this.snapCamera = false;
    } else {
      this.camPos.lerp(this.camDesired, 1 - Math.exp(-dt * 3.2));
      this.camLook.lerp(look, 1 - Math.exp(-dt * 4.5));
    }
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.camera.position.x += rand(-1, 1) * this.shake * .5;
      this.camera.position.y += rand(-1, 1) * this.shake * .5;
      this.shake = Math.max(0, this.shake - dt * 2);
    }
    // blend the camera's 'up' so the straight-down view keeps north at the top of the screen
    const hgt = this.camPos.y - this.camLook.y, kUp = clamp((hgt - 14) / 8, 0, 1);
    this.camera.up.set(0, 1 - kUp, -kUp).normalize();
    this.camera.lookAt(this.camLook);
    if (this.scene.fog) {                                  // keep the ground clear of fog when seen from higher up
      const extra = Math.max(0, this.camPos.distanceTo(this.camLook) - 14);
      this.scene.fog.near = this.fogNear0 + extra; this.scene.fog.far = this.fogFar0 + extra;
    }
    const fov = (this.fps ? 84 : this.baseFov) + (this.sprinting || this.effects.fast ? 5 : 0);
    if (Math.abs(this.camera.fov - fov) > .05) {
      this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 6);
      this.camera.updateProjectionMatrix();
    }
    this.sun.position.copy(this.camLook).add(this.sunOffset);
    this.sunDir.copy(this.sunOffset).normalize();
    this.sky.position.copy(this.camera.position);
    this.sunDisc.position.copy(this.camera.position).addScaledVector(this.sunDir, 180);
    this.sun.target.position.copy(this.camLook);
  }

  // ── Pause / stats ─────────────────────────────────────────
  pause() {
    if (this.state === 'playing' || this.state === 'countdown' || this.state === 'respawn') {
      this.pausedFrom = this.state; this.state = 'paused'; this.input.releaseAll(); return true;
    }
    return false;
  }
  resume() {
    if (this.state === 'paused') { this.state = this.pausedFrom; this.input.clear(); if (this.state === 'countdown') this.lastCount = null; }
  }

  getStats() {
    return {
      mode: this.cfg.mode, level: this.levelIndex, theme: this.theme,
      score: this.score, health: this.health,
      food: this.foodEaten, mover: this.moverEaten, special: this.specialEaten, goals: this.goals, doorOpen: this.doorOpen,
      timeLeft: this.timeLeft, length: this.body.length,
      sprint: this.sprinting, canRescue: this.canRescue, combo: this.combo, comboMul: this.comboMul(), comboT: this.comboT,
      effects: Object.keys(this.effects).map(k => ({ key: k, left: this.effects[k], dur: FRUITS[k].duration })),
    };
  }
}
