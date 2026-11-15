// ───────────────────────────────────────────────────────────
//  Core game: world building, grid logic, effects, rendering
// ───────────────────────────────────────────────────────────
import * as THREE from 'three';
import { LEVELS, THEMES, FRUITS, ALL_FRUITS, makeLayout } from './levels.js';
import * as M from './models.js';
import { Particles } from './fx.js';
import { DIRS, OPP } from './input.js';

const DIR_NAMES = ['up', 'down', 'left', 'right'];
const MAX_SEG = 700;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color(), _v = new THREE.Vector3();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
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

    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
    this.baseFov = 50;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x445544, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.4);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18; sc.near = 1; sc.far = 80;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.particles = new Particles(this.scene, 700);

    // Snake visuals
    this.head = M.makeHead();
    this.scene.add(this.head.group);
    this.bodyMat = new THREE.MeshStandardMaterial({ roughness: .32, metalness: .08 });
    this.bodyMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.42, 18, 14), this.bodyMat, MAX_SEG * 2);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.frustumCulled = false;
    this.bodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < MAX_SEG * 2; i++) this.bodyMesh.setColorAt(i, _c.set(0xffffff));
    this.scene.add(this.bodyMesh);

    this.apple = M.makeApple();
    this.scene.add(this.apple);
    this.magnetRing = M.makeMagnetRing();
    this.scene.add(this.magnetRing);

    this.shocks = [];
    this.pts = [];
    this.camPos = new THREE.Vector3(0, 20, 20);
    this.camLook = new THREE.Vector3();
    this.camTarget = new THREE.Vector3();
    this.camDesired = new THREE.Vector3();
    this.time = 0;
    this.state = 'idle';
    this.shake = 0;
    this.t = 1;

    this.setQuality('high');
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  setQuality(q) {
    this.quality = q;
    const coarse = matchMedia('(pointer: coarse)').matches;
    this.renderer.setPixelRatio(q === 'low' ? 1 : Math.min(devicePixelRatio, coarse ? 1.75 : 2));
    this.renderer.shadowMap.enabled = q !== 'low';
    const s = coarse ? 1024 : 2048;
    this.sun.shadow.mapSize.set(s, s);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.scene.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); } });
    this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.baseFov = aspect < 1 ? clamp(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(19)) / aspect) * 180 / Math.PI, 50, 70) : 50;
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
      L = { ...base, target: Infinity, special: 0, fruits: ALL_FRUITS, enemies: cfg.mode === 'time' ? 2 : 1, interval: .15 };
      this.levelIndex = cfg.map;
    }
    this.L = L;
    this.theme = THEMES[L.map];
    this.N = L.size;
    const lay = makeLayout(L.map, L.size);
    this.grid = lay.grid;
    this.start = lay.start;
    this.startDir = lay.dir;
    this.reachable = this.bfsReachable();
    this.buildWorld();
    this.reset();
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
        if (!seen[j] && !this.grid[j]) { seen[j] = 1; q.push(j); }
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
    this.disposeTree(this.world);
    this.world.clear();
    const T = this.theme, N = this.N, off = N / 2 - .5;

    this.scene.background = new THREE.Color(T.sky);
    this.scene.fog = new THREE.Fog(T.fog, 32, T.space ? 140 : 80);
    this.hemi.color.set(T.hemiSky ?? 0xffffff);
    this.hemi.groundColor.set(T.hemiGround ?? 0x555555);
    this.hemi.intensity = T.hemi ?? 1;
    this.sun.color.set(T.sunColor ?? 0xffffff);
    this.sun.intensity = T.sun ?? 2.4;

    // arena floor
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(N, N),
      new THREE.MeshStandardMaterial({ map: M.groundTexture(N, T.groundA, T.groundB, T.line), roughness: .95 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    this.world.add(ground);

    // base slab under arena
    const slab = new THREE.Mesh(new THREE.BoxGeometry(N + 2.4, 1.2, N + 2.4), new THREE.MeshStandardMaterial({ color: T.wall, roughness: .8 }));
    slab.position.y = -.601; slab.receiveShadow = true;
    this.world.add(slab);

    // outside ground / water / lava
    this.outside = null;
    if (!T.space) {
      const mat = new THREE.MeshStandardMaterial({
        color: T.outside, roughness: T.water ? .2 : 1, metalness: T.water ? .1 : 0,
        emissive: T.lava ? T.outside : 0x000000, emissiveIntensity: T.lava ? .9 : 0,
      });
      const o = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat);
      o.rotation.x = -Math.PI / 2;
      o.position.y = (T.water || T.lava) ? -.4 : -.03;
      o.receiveShadow = true;
      this.world.add(o);
      this.outside = o;
    }

    // border walls
    const wallGeo = M.wallGeometry(T.wall, T.wallTop);
    const wallMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7, emissive: T.neon ? T.wall : 0x000000, emissiveIntensity: T.neon ? .35 : 0 });
    const cells = [];
    for (let x = -1; x <= N; x++) { cells.push([x, -1], [x, N]); }
    for (let z = 0; z < N; z++) { cells.push([-1, z], [N, z]); }
    const walls = new THREE.InstancedMesh(wallGeo, wallMat, cells.length);
    cells.forEach(([x, z], i) => { _m.makeTranslation(x - off, 0, z - off); walls.setMatrixAt(i, _m); });
    walls.castShadow = true; walls.receiveShadow = true;
    this.world.add(walls);

    // obstacles
    const obs = [];
    for (let i = 0; i < N * N; i++) if (this.grid[i]) obs.push(i);
    const oGeo = M.obstacleGeometry(T.obstacle);
    const oMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .55, transparent: T.obstacle === 'ice', opacity: T.obstacle === 'ice' ? .88 : 1 });
    const om = new THREE.InstancedMesh(oGeo, oMat, Math.max(1, obs.length));
    om.count = obs.length;
    this.obstacleIndex = new Map();
    this.obstacleData = [];
    obs.forEach((idx, k) => {
      const x = idx % N, z = (idx / N) | 0;
      const rotY = T.obstacle === 'building' ? 0 : rand(Math.PI * 2);
      const sy = T.obstacle === 'building' ? rand(1, 2.8) : rand(.85, 1.15);
      const sxz = T.obstacle === 'building' ? 1 : rand(.85, 1.1);
      const pos = new THREE.Vector3(x - off, 0, z - off), quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), scl = new THREE.Vector3(sxz, sy, sxz);
      _m.compose(pos, quat, scl);
      om.setMatrixAt(k, _m);
      om.setColorAt(k, this.tintFor(T.obstacle));
      this.obstacleIndex.set(idx, k);
      this.obstacleData[k] = { pos, quat, scl, t: -1 };
    });
    om.castShadow = true; om.receiveShadow = true;
    this.world.add(om);
    this.obstacles = om;
    this.destroying = [];

    // decor outside the arena
    const dGeo = T.decor === T.obstacle ? oGeo : M.obstacleGeometry(T.decor);
    const dMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 });
    const DN = 80;
    const dm = new THREE.InstancedMesh(dGeo, dMat, DN);
    for (let i = 0; i < DN; i++) {
      const a = rand(Math.PI * 2), rr = N / 2 + rand(2.5, 16);
      const s = rand(1.2, 2.4);
      const y = T.space ? rand(-3, 2) : 0;
      _m.compose(_p.set(Math.cos(a) * rr, y, Math.sin(a) * rr),
        _q.setFromEuler(new THREE.Euler(T.space ? rand(3) : 0, rand(6.3), T.space ? rand(3) : 0)),
        _s.set(s, T.decor === 'building' ? s * rand(1, 3) : s, s));
      dm.setMatrixAt(i, _m);
      dm.setColorAt(i, this.tintFor(T.decor));
    }
    this.world.add(dm);
    this.decor = dm;

    // stars for space-like themes
    if (T.space || T.neon || T.lava || T.obstacle === 'crystal') {
      const n = T.space ? 1800 : 500;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const th = rand(Math.PI * 2), ph = rand(.05, T.space ? Math.PI : 1.2), R = rand(60, 110);
        pos[i * 3] = Math.sin(ph) * Math.cos(th) * R;
        pos[i * 3 + 1] = Math.cos(ph) * R * (T.space ? 1 : .6) + (T.space ? 0 : 6);
        pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * R;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const col = T.lava ? 0xff8a40 : T.neon ? 0xff6bf0 : T.space ? 0xffffff : 0xb59cff;
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size: T.space ? .45 : .6, fog: false, transparent: true, opacity: .9 }));
      this.world.add(pts);
      this.stars = pts;
    } else this.stars = null;
  }

  tintFor(kind) {
    if (kind === 'lollipop') return _c.setHSL(rand(), .8, .72);
    if (kind === 'building') return _c.setHSL(rand(.6, .8), .3, rand(.75, 1));
    const v = rand(.85, 1.1);
    return _c.setRGB(v, v, v);
  }

  // ── State reset ───────────────────────────────────────────
  reset() {
    const s = this.start;
    this.dirName = this.startDir;
    this.body = [];
    for (let i = 0; i < 3; i++) this.body.push({ x: s.x - i, z: s.z });
    this.prev = this.body.map(p => ({ ...p }));
    this.grow = 0;
    this.health = 100;
    this.score = 0;
    this.foodEaten = 0;
    this.specialEaten = 0;
    this.effects = {};
    this.invuln = 0;
    this.acc = 0;
    this.t = 1;
    this.skinIndex = 0;
    this.bulges = [];
    this.eatPulse = 0;
    this.headAngle = angleOf(this.dirName);
    this.tongueT = 1; this.flick = -1; this.blinkT = 2; this.blink = -1;
    this.specials = [];
    this.enemies = [];
    this.specialTimer = this.demo ? 1 : 4;
    this.timeLeft = this.cfg.mode === 'time' ? 90 : null;
    this.elapsed = 0;
    this.endT = 0; this.endKind = null; this.reported = false;
    this.goalHint = false;
    this.sprinting = false;
    this.food = null;
    this.spawnFood();
    this.apple.position.copy(this.cellPos(this.food.x, this.food.z));
    for (let i = 0; i < this.L.enemies; i++) this.spawnEnemy();
    this.state = this.demo ? 'demo' : 'countdown';
    this.countdown = 3;
    this.lastCount = null;
    this.input.clear();
    this.input.reverse = false;
    this.shocks.forEach(s => { this.scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
    this.shocks = [];
    this.applyVisualEffects();
    this.snapCamera = true;
  }

  // ── Helpers ───────────────────────────────────────────────
  cellPos(x, z, y = 0) { const off = this.N / 2 - .5; return _v.set(x - off, y, z - off); }
  inBounds(x, z) { return x >= 0 && z >= 0 && x < this.N && z < this.N; }

  occupied() {
    const N = this.N, s = new Set();
    this.body.forEach(p => s.add(p.z * N + p.x));
    this.specials.forEach(p => s.add(p.z * N + p.x));
    this.enemies.forEach(e => { if (e.alive) s.add(e.z * N + e.x); });
    if (this.food) s.add(this.food.z * N + this.food.x);
    return s;
  }

  randomFreeCell(minDist = 0) {
    const N = this.N, occ = this.occupied(), h = this.body[0], list = [];
    for (let i = 0; i < N * N; i++) {
      if (!this.reachable[i] || this.grid[i] || occ.has(i)) continue;
      const x = i % N, z = (i / N) | 0;
      if (Math.abs(x - h.x) + Math.abs(z - h.z) >= minDist) list.push(i);
    }
    return list.length ? list[(Math.random() * list.length) | 0] : null;
  }

  currentInterval() {
    let iv = this.L.interval;
    if (this.cfg.mode === 'endless') iv = Math.max(.085, iv - this.foodEaten * .0015);
    if (this.effects.fast) iv *= .6;
    if (this.effects.slow) iv *= 1.7;
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
  spawnFood() {
    const idx = this.randomFreeCell(2) ?? this.randomFreeCell(0);
    if (idx == null) { this.food = null; this.apple.visible = false; return; }
    this.food = { x: idx % this.N, z: (idx / this.N) | 0, t: 0 };
    this.apple.visible = true;
  }

  spawnSpecial() {
    const pool = this.L.fruits;
    const weights = pool.map(k => (k === 'poison' ? .55 : k === 'fire' ? .7 : 1));
    let r = rand(weights.reduce((a, b) => a + b, 0)), key = pool[0];
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { key = pool[i]; break; } }
    const idx = this.randomFreeCell(3);
    if (idx == null) return;
    const mesh = M.makeSpecial(key);
    const sp = { key, x: idx % this.N, z: (idx / this.N) | 0, life: 11, t: 0, mesh };
    mesh.position.copy(this.cellPos(sp.x, sp.z));
    this.world.add(mesh);
    this.specials.push(sp);
    if (!this.demo) this.sfx.tone(990, .1, 'sine', .08);
  }

  removeSpecial(sp, poof = true) {
    if (poof) { const p = sp.mesh.position; this.particles.emit(p.x, .5, p.z, 14, { color: FRUITS[sp.key].color, speed: 2.5, life: .6 }); }
    this.world.remove(sp.mesh);
    this.disposeTree(sp.mesh);
    this.specials.splice(this.specials.indexOf(sp), 1);
  }

  spawnEnemy() {
    const idx = this.randomFreeCell(8) ?? this.randomFreeCell(4);
    if (idx == null) return;
    const mesh = M.makeSlime(this.theme.enemy);
    this.world.add(mesh);
    const x = idx % this.N, z = (idx / this.N) | 0;
    const e = { x, z, px: x, pz: z, mt: 1, timer: rand(.5, 1.2), interval: Math.max(.32, .6 - this.levelIndex * .025), mesh, alive: true, face: rand(6.3), spawnT: 0, respawnT: 0, phase: rand(6.3) };
    mesh.position.copy(this.cellPos(x, z));
    this.enemies.push(e);
  }

  reviveEnemy(e) {
    const idx = this.randomFreeCell(8) ?? this.randomFreeCell(4);
    if (idx == null) { e.respawnT = 2; return; }
    e.x = e.px = idx % this.N; e.z = e.pz = (idx / this.N) | 0;
    e.alive = true; e.spawnT = 0; e.mt = 1; e.mesh.visible = true;
    const p = this.cellPos(e.x, e.z);
    this.particles.emit(p.x, .4, p.z, 16, { color: this.theme.enemy, speed: 2, life: .6 });
  }

  killEnemy(e, scoreIt = true) {
    if (!e.alive) return;
    e.alive = false; e.mesh.visible = false; e.respawnT = 8;
    const p = e.mesh.position;
    this.particles.emit(p.x, .5, p.z, 30, { colors: [this.theme.enemy, 0xff7a1a, 0xffd400], speed: 5, up: 3, life: .9 });
    if (scoreIt) { this.score += 50; this.popup('+50', e.x, e.z, '#ffb347'); }
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

    if (st !== 'paused') this.animate(st === 'paused' ? 0 : dt);
    this.renderer.render(this.scene, this.camera);
  }

  tickPlay(dt) {
    let changed = false;
    for (const k in this.effects) {
      this.effects[k] -= dt;
      if (this.effects[k] <= 0) { delete this.effects[k]; changed = true; }
    }
    if (changed) this.applyVisualEffects();
    if (this.invuln > 0) this.invuln -= dt;
    this.input.reverse = !!this.effects.reverse;

    this.elapsed += dt;
    if (this.timeLeft !== null) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.timeLeft = 0; this.finish('over'); return; }
    }

    this.specialTimer -= dt;
    if (this.specialTimer <= 0) {
      this.specialTimer = rand(5, 9) * (this.demo ? .5 : 1);
      if (this.specials.length < 2) this.spawnSpecial();
    }
    for (const sp of [...this.specials]) {
      sp.life -= dt; sp.t += dt;
      if (sp.life <= 0) this.removeSpecial(sp);
    }

    this.updateEnemies(dt);
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
    if (this.effects.fire && Math.random() < .9) {
      const n = this.body.length, i = (Math.random() * n) | 0;
      const p = this.pts[i] || hp;
      this.particles.emit(p.x, .6, p.z, 1, { colors: [0xff3d00, 0xff9100, 0xffd400], speed: .6, up: 3, gravity: 2, life: .5, size: 1.3 });
    }
    if (this.effects.reverse && Math.random() < .4) this.particles.emit(hp.x, 1, hp.z, 1, { color: 0xa14bff, speed: 1.5, up: 1, gravity: 0, life: .5 });
    if (this.effects.slow && Math.random() < .25) this.particles.emit(hp.x, .9, hp.z, 1, { color: 0x7fd0ff, speed: .5, up: .8, gravity: 0, life: .9 });
    if (this.effects.fast && Math.random() < .5) {
      const tail = this.pts[this.body.length - 1] || hp;
      this.particles.emit(tail.x, .3, tail.z, 1, { color: 0xffd400, speed: 1, up: .5, life: .4 });
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

    if (!this.inBounds(nx, nz)) return this.crash();
    const idx = nz * N + nx;
    if (this.grid[idx]) {
      if (fire) this.destroyObstacle(idx);
      else return this.crash();
    }
    if (!ghost) {
      const len = this.body.length - (this.grow > 0 ? 0 : 1);
      for (let i = 1; i < len; i++) if (this.body[i].x === nx && this.body[i].z === nz) return this.crash();
    }

    const old = this.body;
    const nb = [{ x: nx, z: nz }, ...old];
    const np = old.map(p => ({ x: p.x, z: p.z }));
    if (this.grow > 0 && old.length < MAX_SEG) { this.grow--; np.push({ ...old[old.length - 1] }); }
    else { nb.pop(); if (this.grow > 0) this.grow--; }
    this.body = nb; this.prev = np;

    if (this.sprinting && Math.random() < .7) {
      const p = this.cellPos(head.x, head.z);
      this.particles.emit(p.x, .1, p.z, 2, { color: 0xffffff, speed: 1.2, up: .8, life: .35, size: .8 });
    }

    if (this.effects.magnet) this.magnetPull();
    this.checkPickups();
  }

  checkPickups() {
    const h = this.body[0];
    if (this.food && h.x === this.food.x && h.z === this.food.z) this.eatFood();
    for (const sp of [...this.specials]) {
      if (sp.x === h.x && sp.z === h.z) { this.eatSpecial(sp); if (this.state !== 'playing' && this.state !== 'demo') return; }
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
        if (!this.inBounds(x, z) || this.grid[i] || occ.has(i)) continue;
        o.x = x; o.z = z; return;
      }
    };
    if (this.food) pull(this.food);
    this.specials.forEach(s => { if (s.key !== 'poison') pull(s); });
  }

  eatFood() {
    const f = this.food;
    const pts = Math.round((10 + this.levelIndex * 2) * (this.sprinting ? 2 : 1));
    this.score += pts;
    this.foodEaten++;
    this.grow += this.cfg.mode === 'endless' ? 2 : 1;
    if (this.timeLeft !== null) this.timeLeft = Math.min(99, this.timeLeft + 1.5);
    this.bulges.push({ pos: 0 });
    this.eatPulse = 1;
    const p = this.cellPos(f.x, f.z);
    this.particles.emit(p.x, .5, p.z, 18, { colors: [0xff2d3a, 0xffffff, 0x3ec64a], speed: 3.5, up: 2.5, life: .7 });
    this.popup(this.sprinting ? `+${pts} SPRINT!` : `+${pts}`, f.x, f.z, '#fff');
    if (!this.demo) this.sfx.eat();
    this.spawnFood();
    this.checkWin();
  }

  eatSpecial(sp) {
    const F = FRUITS[sp.key], k = sp.key;
    const p = this.cellPos(sp.x, sp.z), px = p.x, pz = p.z;
    this.removeSpecial(sp, false);
    this.particles.emit(px, .6, pz, 26, { colors: [F.color, 0xffffff], speed: 4, up: 3, life: .8 });
    this.shockwave(px, pz, F.color === 0xffffff ? 0xff6bf0 : F.color, 6);
    if (k !== 'poison') { this.specialEaten++; this.score += 25; this.popup(`${F.emoji} +25`, sp.x, sp.z, '#ffe27a'); }
    if (!this.demo) (k === 'poison' ? this.sfx.poison() : this.sfx.special());

    switch (k) {
      case 'fast': delete this.effects.slow; this.effects.fast = F.duration; break;
      case 'slow': delete this.effects.fast; this.effects.slow = F.duration; break;
      case 'reverse': this.effects.reverse = F.duration; this.input.clear(); break;
      case 'invisible': this.effects.invisible = F.duration; break;
      case 'magnet': this.effects.magnet = F.duration; break;
      case 'fire': {
        this.effects.fire = F.duration;
        this.enemies.forEach(e => this.killEnemy(e));
        this.shockwave(px, pz, 0xff5a00, 30, 1.4);
        this.shake = .6;
        if (!this.demo) this.sfx.fire();
        break;
      }
      case 'shrink': {
        const len = this.body.length, nl = Math.max(3, Math.ceil(len / 2));
        for (let i = nl; i < len; i++) {
          const q = this.cellPos(this.body[i].x, this.body[i].z);
          this.particles.emit(q.x, .4, q.z, 3, { color: this.skinColor(i * 2), speed: 2, life: .6 });
        }
        this.body.length = nl; this.prev.length = nl; this.grow = 0;
        if (!this.demo) this.sfx.shrink();
        break;
      }
      case 'poison': {
        this.say('flash', 'rgba(80,255,40,.35)');
        this.popup(`☠️ -${F.damage}`, sp.x, sp.z, '#7dff5a');
        this.damage(F.damage);
        break;
      }
      case 'color': {
        this.skinIndex = (this.skinIndex + 1) % M.SKINS.length;
        this.score += 50;
        this.particles.emit(px, .6, pz, 30, { colors: [0xff3b5c, 0xffd400, 0x43c463, 0x2f7bff, 0xd040fb], speed: 5, up: 4, life: 1 });
        break;
      }
    }
    if (k !== 'poison') this.say('toast', `${F.emoji} ${F.name}`, '#' + new THREE.Color(F.color).getHexString());
    this.applyVisualEffects();
    this.checkWin();
  }

  checkWin() {
    if (this.cfg.mode !== 'adventure' || this.state !== 'playing') return;
    const fd = this.foodEaten >= this.L.target, sd = this.specialEaten >= this.L.special;
    if (fd && sd) this.finish('won');
    else if (fd && !sd && !this.goalHint) { this.goalHint = true; this.say('toast', '★ Eat special fruits to finish!', '#ffe27a'); }
  }

  destroyObstacle(idx) {
    this.grid[idx] = 0;
    this.reachable[idx] = 1;
    const k = this.obstacleIndex.get(idx);
    if (k !== undefined) { this.obstacleData[k].t = 0; this.destroying.push(k); }
    const x = idx % this.N, z = (idx / this.N) | 0, p = this.cellPos(x, z);
    this.particles.emit(p.x, .6, p.z, 22, { colors: [0xff3d00, 0xff9100, 0x555555], speed: 4, up: 3, life: .8 });
    this.score += 5;
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

  crash() {
    this.prev = this.body.map(p => ({ ...p }));
    this.t = 1;
    const h = this.body[0], p = this.cellPos(h.x, h.z);
    this.particles.emit(p.x, .5, p.z, 30, { colors: [0xffffff, 0xffd400, this.skinColor(0)], speed: 5, up: 3, life: .8 });
    this.shake = .7;
    if (this.demo) { this.respawn(true); return; }
    this.sfx.crash();
    this.popup('💥 -30', h.x, h.z, '#ff6b6b');
    if (this.damage(30)) { this.state = 'respawn'; this.respawnT = .9; }
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
    this.particles.emit(p.x, .5, p.z, 24, { color: 0xffffff, speed: 3, up: 3, life: .7 });
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
      this.particles.emit(h.x + rand(-4, 4), rand(2, 5), h.z + rand(-4, 4), 20, {
        colors: [0xff3b5c, 0xffd400, 0x43c463, 0x2f7bff, 0xd040fb, 0xffffff], speed: 5, up: 1, gravity: -4, life: 1.1,
      });
    }
    if (this.endKind === 'dead') {
      const target = Math.floor(this.endT * 28);
      while (this.deathIdx < Math.min(target, this.body.length)) {
        const s = this.body[this.deathIdx], p = this.cellPos(s.x, s.z);
        this.particles.emit(p.x, .4, p.z, 5, { colors: [this.skinColor(this.deathIdx * 2), 0xffffff], speed: 3, up: 3, life: .8 });
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
      e.timer -= dt;
      if (e.timer <= 0) { e.timer = e.interval * rand(.8, 1.3); this.moveEnemy(e); }
      e.mt = Math.min(1, e.mt + dt / (e.interval * .7));
      if (e.x === h.x && e.z === h.z) this.onEnemyContact(e);
      if (this.state !== 'playing' && this.state !== 'demo') return;
    }
  }

  moveEnemy(e) {
    const N = this.N, h = this.body[0];
    const names = DIR_NAMES.slice().sort(() => Math.random() - .5);
    const chase = !this.effects.invisible && !this.effects.fire && Math.random() < .25 + this.levelIndex * .035;
    if (chase) names.sort((a, b) => (Math.abs(e.x + DIRS[a].x - h.x) + Math.abs(e.z + DIRS[a].z - h.z)) - (Math.abs(e.x + DIRS[b].x - h.x) + Math.abs(e.z + DIRS[b].z - h.z)));
    if (this.effects.fire) names.sort((a, b) => (Math.abs(e.x + DIRS[b].x - h.x) + Math.abs(e.z + DIRS[b].z - h.z)) - (Math.abs(e.x + DIRS[a].x - h.x) + Math.abs(e.z + DIRS[a].z - h.z)));
    const bodySet = new Set(this.body.slice(1).map(p => p.z * N + p.x));
    for (const n of names) {
      const x = e.x + DIRS[n].x, z = e.z + DIRS[n].z, i = z * N + x;
      if (!this.inBounds(x, z) || this.grid[i] || bodySet.has(i)) continue;
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
    for (let i = 0; i < N * N; i++) blocked[i] = this.grid[i];
    for (let i = 0; i < this.body.length - 1; i++) blocked[this.body[i].z * N + this.body[i].x] = 1;
    const target = this.specials.find(s => s.key !== 'poison') || this.food;
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
    return (k % 4 < 2) ? sk.a : sk.b;
  }

  applyVisualEffects() {
    const inv = !!this.effects.invisible;
    for (const m of [this.bodyMat, this.head.mat]) {
      if (m.transparent !== inv) { m.transparent = inv; m.needsUpdate = true; }
      m.opacity = inv ? .25 : 1;
      m.depthWrite = !inv;
    }
    if (!this.effects.fire) { this.bodyMat.emissive.set(0x000000); this.head.mat.emissive.set(0x000000); }
    this.head.crown.visible = !!this.effects.fire;
    this.magnetRing.visible = !!this.effects.magnet;
  }

  shockwave(x, z, color, size = 6, dur = .7) {
    const mesh = M.makeShock(color);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, .08, z);
    this.scene.add(mesh);
    this.shocks.push({ mesh, t: 0, size, dur });
  }

  animate(dt) {
    const T = this.time;
    this.particles.update(dt);
    this.renderSnake(dt);

    // food
    if (this.food) {
      const tp = this.cellPos(this.food.x, this.food.z);
      this.apple.position.x += (tp.x - this.apple.position.x) * Math.min(1, dt * 16);
      this.apple.position.z += (tp.z - this.apple.position.z) * Math.min(1, dt * 16);
      this.food.t = Math.min(1, this.food.t + dt * 3);
      const u = this.apple.userData;
      u.inner.position.y = Math.sin(T * 3) * .08;
      u.inner.rotation.y = T * 1.5;
      const s = easeOutBack(this.food.t);
      u.inner.scale.setScalar(Math.max(.01, s));
      u.ring.scale.setScalar(1 + Math.sin(T * 4) * .12);
      u.ring.material.opacity = .3 + Math.sin(T * 4) * .15;
    }

    // specials
    for (const sp of this.specials) {
      const u = sp.mesh.userData;
      const tp = this.cellPos(sp.x, sp.z);
      sp.mesh.position.x += (tp.x - sp.mesh.position.x) * Math.min(1, dt * 16);
      sp.mesh.position.z += (tp.z - sp.mesh.position.z) * Math.min(1, dt * 16);
      const s = Math.max(.01, easeOutBack(Math.min(1, sp.t * 2.5)));
      sp.mesh.scale.setScalar(s);
      const bob = Math.sin(T * 3 + sp.x) * .1;
      u.core.position.y = .55 + bob; u.shell.position.y = .55 + bob; u.sprite.position.y = 1.35 + bob;
      u.shell.rotation.x = T * 1.3; u.shell.rotation.y = T * 1.7;
      u.core.scale.setScalar(1 + Math.sin(T * 6) * .08);
      u.ring.scale.setScalar(1 + Math.sin(T * 5) * .15);
      if (sp.key === 'color') {
        const c = _c.setHSL((T * .4) % 1, .9, .6);
        u.core.material.color.copy(c); u.core.material.emissive.copy(c); u.shell.material.color.copy(c); u.ring.material.color.copy(c);
      }
      sp.mesh.visible = sp.life > 3 || Math.sin(T * 22) > -.2;
    }

    // enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const a = this.cellPos(e.px, e.pz).clone(), b = this.cellPos(e.x, e.z);
      const mt = e.mt, k = mt * mt * (3 - 2 * mt);
      const u = e.mesh.userData;
      e.mesh.position.set(a.x + (b.x - a.x) * k, 0, a.z + (b.z - a.z) * k);
      const hop = Math.sin(mt * Math.PI);
      u.pivot.position.y = hop * .45;
      const breathe = Math.sin(T * 5 + e.phase) * .06;
      const sy = mt < 1 ? 1 + hop * .25 - (1 - hop) * .2 : 1 + breathe;
      const sxz = 1 / Math.sqrt(Math.max(.3, sy));
      const sp = easeOutBack(e.spawnT);
      u.pivot.scale.set(sxz * sp, sy * sp, sxz * sp);
      e.mesh.rotation.y = lerpAngle(e.mesh.rotation.y, e.face, Math.min(1, dt * 10));
      u.body.material.emissiveIntensity = this.effects.fire ? .5 + Math.sin(T * 20) * .3 : .18;
    }

    // destroyed obstacles shrink away
    if (this.destroying.length) {
      for (let i = this.destroying.length - 1; i >= 0; i--) {
        const k = this.destroying[i], o = this.obstacleData[k];
        o.t += dt * 3;
        if (o.t >= 1) { this.obstacles.setMatrixAt(k, ZERO); this.destroying.splice(i, 1); }
        else { _m.compose(o.pos, o.quat, _s.copy(o.scl).multiplyScalar(1 - o.t)); this.obstacles.setMatrixAt(k, _m); }
      }
      this.obstacles.instanceMatrix.needsUpdate = true;
    }

    // shockwaves
    for (let i = this.shocks.length - 1; i >= 0; i--) {
      const s = this.shocks[i];
      s.t += dt / s.dur;
      if (s.t >= 1) { this.scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); this.shocks.splice(i, 1); continue; }
      s.mesh.scale.setScalar(.5 + s.t * s.size);
      s.mesh.material.opacity = (1 - s.t) * .9;
    }

    // environment
    if (this.outside && (this.theme.water || this.theme.lava)) {
      this.outside.position.y = -.4 + Math.sin(T * 1.2) * .06;
      if (this.theme.lava) this.outside.material.emissiveIntensity = .75 + Math.sin(T * 2) * .2;
    }
    if (this.stars) this.stars.rotation.y = T * .01;

    this.updateCamera(dt);
  }

  renderSnake(dt) {
    const n = this.body.length, T = this.time;
    const pts = this.pts;
    while (pts.length < n) pts.push(new THREE.Vector3());
    const tt = (this.state === 'playing' || this.state === 'demo') ? this.t : 1;
    const off = this.N / 2 - .5;
    for (let i = 0; i < n; i++) {
      const p = this.prev[i] || this.body[i], c = this.body[i];
      pts[i].set(p.x + (c.x - p.x) * tt - off, 0, p.z + (c.z - p.z) * tt - off);
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
    let hx = pts[0].x, hz = pts[0].z;
    if (this.state === 'respawn') { hx += rand(-.08, .08); hz += rand(-.08, .08); }
    hg.position.set(hx, .45 + bob + (this.state === 'won' ? Math.abs(Math.sin(T * 8)) * .5 : 0), hz);
    hg.rotation.y = this.headAngle + (this.state === 'won' ? T * 6 : 0);
    hg.rotation.z = Math.sin(T * 6) * .05;
    hg.scale.setScalar(1 + this.eatPulse * .25);

    const sk = M.SKINS[this.skinIndex];
    this.head.mat.color.set(sk.rainbow ? this.skinColor(0) : sk.a);
    if (this.effects.fire) {
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
        const near = this.food && Math.abs(this.food.x - this.body[0].x) + Math.abs(this.food.z - this.body[0].z) < 4;
        this.tongueT = near ? .25 : rand(.8, 2);
      }
    }
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 0; this.blinkT = rand(2, 4.5); }
    let ey = 1;
    if (this.blink >= 0) { this.blink += dt / .16; ey = Math.max(.1, Math.abs(1 - this.blink * 2)); if (this.blink >= 1) this.blink = -1; }
    if (dead || this.state === 'respawn') ey = .15;
    this.head.eyes.forEach(e => e.scale.y = ey);

    // body (segment + midpoint spheres for a smooth tube)
    for (const b of this.bulges) b.pos += dt * 16;
    this.bulges = this.bulges.filter(b => b.pos < n * 2 + 2);
    const total = 2 * n - 1;
    const amp = this.sprinting ? .11 : .07;
    let k = 0;
    if (!blinkOn) {
      for (let i = 0; i < n; i++) {
        for (let h = 0; h < 2; h++) {
          if (h === 1 && i === n - 1) break;
          if (i === 0 && h === 0) continue;
          if (i < deathIdx) continue;
          const a = pts[i], b = h ? pts[i + 1] : a;
          let x = h ? (a.x + b.x) / 2 : a.x, z = h ? (a.z + b.z) / 2 : a.z;
          const u = 2 * i + h, f = u / total;
          let s = 1 - f * .55;
          for (const bg of this.bulges) s *= 1 + .38 * Math.exp(-((u - bg.pos) ** 2) * .4);
          const ia = Math.max(0, i - 1), ib = Math.min(n - 1, i + 1);
          const tx = pts[ia].x - pts[ib].x, tz = pts[ia].z - pts[ib].z, len = Math.hypot(tx, tz);
          if (len > .01) {
            const w = Math.sin(T * 9 - u * .55) * amp * Math.min(1, u / 4);
            x += (-tz / len) * w; z += (tx / len) * w;
          }
          _m.compose(_p.set(x, .38 * s + .03, z), _q.identity(), _s.set(s, s * .92, s));
          this.bodyMesh.setMatrixAt(k, _m);
          this.bodyMesh.setColorAt(k, _c.set(this.skinColor(u)));
          k++;
        }
      }
    }
    this.bodyMesh.count = k;
    this.bodyMesh.instanceMatrix.needsUpdate = true;
    if (this.bodyMesh.instanceColor) this.bodyMesh.instanceColor.needsUpdate = true;

    // magnet ring
    if (this.magnetRing.visible) {
      this.magnetRing.position.set(hg.position.x, .15, hg.position.z);
      this.magnetRing.scale.setScalar(1 + Math.sin(T * 8) * .15);
      this.magnetRing.rotation.z = T * 3;
    }
  }

  updateCamera(dt) {
    const N = this.N, aspect = innerWidth / innerHeight;
    const look = this.camTarget;
    if (this.state === 'demo') {
      const a = this.time * .12, r = N * .75;
      this.camDesired.set(Math.sin(a) * r, N * .72, Math.cos(a) * r);
      look.set(0, 0, 0);
    } else {
      const hp = this.head.group.position;
      const lim = Math.max(0, N / 2 - (aspect < 1 ? 4 : 6));
      look.set(clamp(hp.x, -lim, lim), 0, clamp(hp.z, -lim, lim));
      const dist = (aspect < 1 ? 17 : 16) + Math.max(0, N - 18) * .25;
      this.camDesired.set(look.x, dist, look.z + dist * .62);
    }
    if (this.snapCamera) {
      this.camPos.copy(this.camDesired); this.camLook.copy(look); this.snapCamera = false;
    } else {
      this.camPos.lerp(this.camDesired, 1 - Math.exp(-dt * 3.5));
      this.camLook.lerp(look, 1 - Math.exp(-dt * 5));
    }
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.camera.position.x += rand(-1, 1) * this.shake * .5;
      this.camera.position.y += rand(-1, 1) * this.shake * .5;
      this.shake = Math.max(0, this.shake - dt * 2);
    }
    this.camera.lookAt(this.camLook);
    const fov = this.baseFov + (this.sprinting || this.effects.fast ? 5 : 0);
    if (Math.abs(this.camera.fov - fov) > .05) {
      this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 6);
      this.camera.updateProjectionMatrix();
    }
    this.sun.position.set(this.camLook.x + 10, 26, this.camLook.z + 8);
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
      food: this.foodEaten, target: this.L.target,
      special: this.specialEaten, specialTarget: this.L.special,
      timeLeft: this.timeLeft, length: this.body.length,
      sprint: this.sprinting,
      effects: Object.keys(this.effects).map(k => ({ key: k, left: this.effects[k], dur: FRUITS[k].duration })),
    };
  }
}
