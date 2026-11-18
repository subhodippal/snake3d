// ───────────────────────────────────────────────────────────
//  World builder: terrain, water, bridges, bamboo fence, roads,
//  props, decor, torches (with a pooled set of real lights),
//  weather and wildlife.
// ───────────────────────────────────────────────────────────
import * as THREE from 'three';
import * as M from './models.js';
import { WATER_Y, BRIDGE, WATER, OBST, ROAD, FREE, mulberry32, fbm, smoothstep } from './mapgen.js';
import { Wildlife } from './animals.js';

const MAX_LIGHTS = 8;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), _v = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0), XA = new THREE.Vector3(1, 0, 0);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/** Groups items with x/z into ~16×16 spatial buckets. */
function chunked(items, size = 16) {
  const b = new Map();
  for (const it of items) {
    const key = Math.floor(it.x / size) + ',' + Math.floor(it.z / size);
    if (!b.has(key)) b.set(key, []);
    b.get(key).push(it);
  }
  return [...b.values()];
}

export class World {
  constructor(scene, particles) {
    this.scene = scene; this.particles = particles;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.pool = [];
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const l = new THREE.PointLight(0xff9a40, 0, 11, 2);
      l.visible = false;
      scene.add(l);
      this.pool.push(l);
    }
    this.headLight = new THREE.PointLight(0xffd0a0, 0, 8, 2);
    this.headLight.visible = false;
    scene.add(this.headLight);
    this.sources = [];
  }

  dispose() {
    this.group.traverse(o => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        if (m.userData.shared) return;
        if (m.map && !m.map.userData?.shared) m.map.dispose();
        m.dispose();
      });
    });
    this.group.clear();
  }

  build(T, map, quality = 'high') {
    this.dispose();
    this.T = T; this.map = map; this.quality = quality;
    this.rnd = mulberry32(map.seed * 31 + 7);
    this.sources = [];
    this.obsInst = [];
    this.destroying = [];
    this.props = {};
    this.buildTerrain();
    this.buildWater();
    this.buildRoads();
    this.buildTraffic();
    this.buildBridges();
    this.buildFence();
    this.buildProps();
    this.buildDecor();
    this.buildLights();
    this.buildWeather();
    this.wildlife = new Wildlife(this.group, map, this.particles);
    const k = (map.N * map.N) / (44 * 44);
    this.wildlife.spawnAll((T.animals || []).map(([kind, n]) => [kind, Math.max(1, Math.round(n * Math.sqrt(k)))]));
  }

  // ── Terrain ───────────────────────────────────────────────
  buildTerrain() {
    const { map, T } = this, { S, E, hf, N } = map, half = N / 2;
    const geo = new THREE.PlaneGeometry(2 * E, 2 * E, S - 1, S - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, hf[i]);
    geo.computeVertexNormals();
    const G = {}; for (const k in T.ground) G[k] = new THREE.Color(T.ground[k]);
    const dirt = new THREE.Color(T.ground.bank).lerp(new THREE.Color(T.ground.a), .35);
    const col = new Float32Array(pos.count * 3), nrm = geo.attributes.normal;
    const amp = T.hills?.amp ?? 1, snow = T.key === 'snow', seed = map.seed;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = pos.getY(i), ny = nrm.getY(i);
      _c.copy(G.a).lerp(G.b, smoothstep(.35, .65, fbm(x * .16, z * .16, seed + 5, 3)));
      _c.lerp(G.high, smoothstep(amp * .45, amp * 1.0, h) * .8);
      const n2 = fbm(x * .22 + 7, z * .22 - 3, seed + 11, 3);
      if (!snow && n2 > .6) _c.lerp(dirt, Math.min(.6, (n2 - .6) * 3));
      const s = map.riverSigned(x, z);
      if (s < 1.6) _c.lerp(G.bank, smoothstep(1.6, .1, s) * .9);
      if (h < WATER_Y + .05) _c.lerp(G.bed, smoothstep(WATER_Y + .05, WATER_Y - .45, h));
      const d = Math.max(Math.abs(x), Math.abs(z)) - half;
      if (d > 0) _c.lerp(G.cliff, smoothstep(.5, 7, d) * .85);
      if (ny < .82) _c.lerp(G.rock, smoothstep(.82, .55, ny));
      if (G.sand && map.inSand(x, z)) _c.copy(G.sand);
      if (map.roads.length && map.roadSigned(x, z) < .6) _c.lerp(dirt, .5);
      if (T.groundDim) _c.multiplyScalar(T.groundDim);
      col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const tex = M.noiseTexture(128, snow ? .9 : .8);
    tex.repeat.set(E / 2.5, E / 2.5);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex, roughness: T.rain ? .55 : (snow ? .8 : .95) }));
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.terrain = mesh;

    // sand pit frames
    if (map.sandpits.length) {
      const parts = [];
      for (const sp of map.sandpits) {
        const cx = (sp.x0 + sp.x1) / 2, cz = (sp.z0 + sp.z1) / 2, w = sp.x1 - sp.x0, d = sp.z1 - sp.z0;
        const y = map.heightAt(cx, cz) + .06;
        parts.push(M.P(M.Box(w, .12, .12), 0xc88a4a, [cx, y, sp.z0]), M.P(M.Box(w, .12, .12), 0xc88a4a, [cx, y, sp.z1]));
        parts.push(M.P(M.Box(.12, .12, d), 0xc88a4a, [sp.x0, y, cz]), M.P(M.Box(.12, .12, d), 0xc88a4a, [sp.x1, y, cz]));
      }
      const m = new THREE.Mesh(M.merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 }));
      m.receiveShadow = true;
      this.group.add(m);
    }
  }

  buildWater() {
    const { map, T } = this;
    if (!map.rivers.length) { this.water = null; return; }
    const tex = M.waterTexture();
    tex.repeat.set(map.E / 4, map.E / 4);
    const W = T.water || {};
    const mat = new THREE.MeshStandardMaterial({
      color: W.color ?? 0x3aa6e0, map: tex, transparent: true, opacity: W.opacity ?? .82, roughness: .08, metalness: .15,
      emissive: W.glow ?? 0x000000, emissiveIntensity: W.glow ? .8 : 0, depthWrite: false,
    });
    const g = new THREE.PlaneGeometry(2 * map.E, 2 * map.E);
    g.rotateX(-Math.PI / 2);
    const w = new THREE.Mesh(g, mat);
    w.position.y = WATER_Y;
    w.receiveShadow = true;
    w.renderOrder = 1;
    this.group.add(w);
    this.water = w;
    // the flow direction of the first river
    this.flow = map.rivers[0].axis === 'x' ? [1, 0] : [0, 1];
  }

  buildRoads() {
    const { map } = this, half = map.N / 2;
    if (!map.roads.length) return;
    const pos = [], dashes = [], edges = [];
    const toW = (r, u, v) => r.axis === 'z' ? [v, u] : [u, v];
    map.roads.forEach((r, ri) => {
      const v0 = r.c - r.width / 2, v1 = r.c + r.width / 2;
      for (let u = -half - .5; u < half + .5; u += .5) {
        const u2 = u + .5, [mx, mz] = toW(r, u + .25, r.c);
        if (map.riverSigned(mx, mz) < .7) continue;
        const q = [[u, v0], [u2, v0], [u2, v1], [u, v1]].map(([a, b]) => { const [x, z] = toW(r, a, b); return [x, map.heightAt(x, z) + .03 + ri * .004, z]; });
        pos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
        if (Math.round(u * 2) % 3 === 0) dashes.push([mx, map.heightAt(mx, mz) + .045 + ri * .004, mz, r.axis]);
        for (const ev of [v0 + .18, v1 - .18]) { const [x, z] = toW(r, u + .25, ev); edges.push([x, map.heightAt(x, z) + .045 + ri * .004, z, r.axis]); }
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const tex = M.noiseTexture(64, .75, false); tex.repeat.set(1, 1);
    const road = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x4a4a52, map: tex, roughness: .92, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
    road.receiveShadow = true;
    this.group.add(road);
    const mk = (list, geo, color) => {
      const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, roughness: .6 }), list.length);
      list.forEach(([x, y, z, ax], i) => { _m.compose(_p.set(x, y, z), _q.setFromAxisAngle(UP, ax === 'z' ? 0 : Math.PI / 2), _s.set(1, 1, 1)); im.setMatrixAt(i, _m); });
      im.receiveShadow = true;
      this.group.add(im);
    };
    mk(dashes, new THREE.BoxGeometry(.14, .02, .75), 0xffd84a);
    mk(edges, new THREE.BoxGeometry(.1, .02, .51), 0xf4f4f4);
  }

  // ── Traffic: cars driving up and down the roads ───────────
  buildTraffic() {
    const { map, T } = this, half = map.N / 2, off = map.off, rnd = this.rnd;
    this.cars = []; this.carMesh = null; this.frozen = false;
    if (!T.traffic || !map.roads.length) return;
    const span = map.N + 10, n = Math.max(2, Math.round(T.traffic * map.N / 44));
    map.roads.forEach((r, ri) => {
      [[r.lo, -1], [r.hi, 1]].forEach(([row, dir]) => {
        const speed = 3.2 + rnd() * 3.2, gap = span / n, phase = rnd() * gap;
        for (let k = 0; k < n; k++) this.cars.push({ axis: r.axis, row: row - off, dir, speed, u: -half - 5 + phase + k * gap + (rnd() - .5) * gap * .35, span, half, x: 0, z: 0, hidden: false });
      });
    });
    const tint = new THREE.Color();
    this.carMesh = new THREE.InstancedMesh(M.obstacleGeometry('car'), M.obstacleMaterial('car'), this.cars.length);
    this.cars.forEach((c, i) => this.carMesh.setColorAt(i, M.tintFor('car', rnd, tint)));
    this.carMesh.frustumCulled = false; this.carMesh.castShadow = true; this.carMesh.receiveShadow = true;
    this.group.add(this.carMesh);
    this.moveCars(0);
  }

  moveCars(dt) {
    const { map } = this, N = map.N, off = map.off;
    this.cars.forEach((c, i) => {
      if (!this.frozen) { c.u += c.dir * c.speed * dt; if (c.u > c.half + 5) c.u -= c.span; else if (c.u < -c.half - 5) c.u += c.span; }
      c.x = c.axis === 'z' ? c.row : c.u; c.z = c.axis === 'z' ? c.u : c.row;
      const cx = Math.round(c.x + off), cz = Math.round(c.z + off);
      c.hidden = cx < 0 || cz < 0 || cx >= N || cz >= N ? false : map.cell[cz * N + cx] === WATER;
      const y = map.groundAt(c.x, c.z);
      const rot = c.axis === 'x' ? (c.dir > 0 ? 0 : Math.PI) : (c.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
      _m.compose(_p.set(c.x, y, c.z), _q.setFromAxisAngle(UP, rot), c.hidden ? _s.set(0, 0, 0) : _s.set(1, 1, 1));
      this.carMesh.setMatrixAt(i, _m);
    });
    this.carMesh.instanceMatrix.needsUpdate = true;
  }

  buildBridges() {
    const { map, T } = this;
    for (const b of map.bridges) {
      const m = new THREE.Mesh(M.bridgeGeometry(b), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 }));
      m.castShadow = true; m.receiveShadow = true;
      this.group.add(m);
      if (T.bridgeTorches) {
        for (const u of [b.u0 - .22, b.u1 + .22]) for (const v of [b.v0 + .1, b.v1 - .1]) {
          const x = b.riverAxis === 'x' ? u : v, z = b.riverAxis === 'x' ? v : u;
          const y = Math.max(map.heightAt(x, z), b.deckBase) - .05;
          this.addProp('fenceTorch', x, y, z, 0, [.7, .7, .7]);
        }
      }
    }
  }

  // ── Bamboo fence ──────────────────────────────────────────
  buildFence() {
    const { map, T } = this, half = map.N / 2, F = half + .32, rnd = this.rnd;
    const poles = [], posts = [], rails = [];
    const sides = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [sx, sz] of sides) {
      const at = t => sx === 0 ? [t, sz * F] : [sx * F, t];
      let prev = null;
      for (let t = -F; t <= F + .01; t += .26) {
        const [x, z] = at(t), h = map.heightAt(x, z);
        if (h < WATER_Y + .12) continue;
        poles.push([x, h - .05, z, .95 + rnd() * .35, rnd()]);
      }
      for (let t = -F; t <= F + .01; t += 1.3) {
        const [x, z] = at(t), h = map.heightAt(x, z);
        if (h < WATER_Y + .12) { prev = null; continue; }
        posts.push([x, h - .05, z, 1.5, 0]);
        const cur = [x, h, z];
        if (prev) for (const y of [.38, .85]) rails.push([prev, cur, y]);
        prev = cur;
      }
      if (T.fenceTorches) {
        for (let t = -F + 2; t < F - 1; t += T.fenceTorches) {
          const [x, z] = at(t), h = map.heightAt(x, z);
          if (h < WATER_Y + .12) continue;
          const o = .35;
          this.addProp('fenceTorch', x + sx * o, map.heightAt(x + sx * o, z + sz * o) - .05, z + sz * o, 0, [1, 1, 1]);
        }
      }
    }
    const poleGeo = M.bambooPoleGeometry(), mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .55 });
    const pm = new THREE.InstancedMesh(poleGeo, mat, poles.length + posts.length);
    let k = 0;
    for (const [x, y, z, h, r] of poles) {
      _m.compose(_p.set(x, y, z), _q.setFromAxisAngle(XA, (r - .5) * .06), _s.set(1, h, 1)); pm.setMatrixAt(k, _m);
      pm.setColorAt(k++, _c.setRGB(.85 + r * .25, .85 + r * .25, .8 + r * .2));
    }
    for (const [x, y, z] of posts) { _m.compose(_p.set(x, y, z), _q.identity(), _s.set(1.5, 1.45, 1.5)); pm.setMatrixAt(k, _m); pm.setColorAt(k++, _c.setRGB(.8, .75, .65)); }
    pm.castShadow = true; pm.receiveShadow = true;
    this.group.add(pm);
    const rm = new THREE.InstancedMesh(M.bambooRailGeometry(), mat, rails.length);
    rails.forEach(([a, b, y], i) => {
      const A = _p.set(a[0], a[1] + y, a[2]), Bv = _v.set(b[0], b[1] + y, b[2]);
      const len = A.distanceTo(Bv);
      _q.setFromUnitVectors(XA, Bv.clone().sub(A).normalize());
      _m.compose(A.clone().add(Bv).multiplyScalar(.5), _q, _s.set(len, 1, 1));
      rm.setMatrixAt(i, _m);
    });
    rm.castShadow = true;
    this.group.add(rm);
  }

  // ── Obstacles + outside scenery (instanced per kind) ──────
  addProp(kind, x, y, z, rotY, scl, tint, oid) {
    (this.props[kind] ||= []).push({ x, y, z, rotY, scl, tint: tint ? tint.clone() : null, oid });
    const off = M.LIGHT_OFFSET[kind];
    if (off) {
      _v.set(off[0] * scl[0], off[1] * scl[1], off[2] * scl[2]).applyAxisAngle(UP, rotY);
      this.sources.push({ pos: new THREE.Vector3(x + _v.x, y + _v.y, z + _v.z), flame: kind !== 'lamp', oid, alive: true });
    }
  }

  buildProps() {
    const { map, T, rnd } = this, half = map.N / 2;
    // obstacles inside the arena
    for (const o of map.obstacles) {
      let y = Infinity;
      for (const i of o.cells) y = Math.min(y, map.groundAt((i % map.N) - map.off, ((i / map.N) | 0) - map.off));
      const scl = M.scaleFor(o.kind, rnd);
      this.addProp(o.kind, o.cx, y - .03, o.cz, o.rot, scl, M.tintFor(o.kind, rnd, _c), o.id);
    }
    // scenery outside the fence
    const kinds = T.outside || [];
    const count = Math.round((T.outsideCount || 0) * (map.N / 44) * (this.quality === 'low' ? .6 : 1));
    const big = ['house', 'boulder', 'windmill'];
    for (let n = 0, tries = 0; n < count && tries < count * 8; tries++) {
      const kind = kinds[(rnd() * kinds.length) | 0];
      const side = (rnd() * 4) | 0, d = half + 1.6 + Math.pow(rnd(), 1.4) * (map.E - half - 5);
      if (big.includes(kind) && d < half + 3.5) continue;
      const u = (rnd() * 2 - 1) * (half + d * .9);
      const x = side < 2 ? u : (side === 2 ? -d : d), z = side < 2 ? (side ? d : -d) : u;
      if (Math.abs(x) > map.E - 2 || Math.abs(z) > map.E - 2) continue;
      if (map.riverSigned(x, z) < 1 || map.heightAt(x, z) < WATER_Y + .3) continue;
      const s = (kind === 'house' ? 1 : 1.05 + rnd() * .6);
      this.addProp(kind, x, map.heightAt(x, z) - .05, z, rnd() * Math.PI * 2, [s, s * (.9 + rnd() * .25), s], M.tintFor(kind, rnd, _c));
      n++;
    }
    if (T.key === 'hills') for (const [x, z] of [[-half - 9, half * .4], [half + 10, -half * .3]]) this.addProp('windmill', x, map.heightAt(x, z) - .1, z, rnd() * 6, [1.3, 1.3, 1.3]);

    for (const kind in this.props) {
      const mat = M.obstacleMaterial(kind);
      // split into spatial chunks so off-screen scenery is frustum-culled
      for (const list of chunked(this.props[kind])) {
        const im = new THREE.InstancedMesh(M.obstacleGeometry(kind), mat, list.length);
        list.forEach((p, k) => {
          const pos = new THREE.Vector3(p.x, p.y, p.z), quat = new THREE.Quaternion().setFromAxisAngle(UP, p.rotY), scl = new THREE.Vector3(...p.scl);
          _m.compose(pos, quat, scl);
          im.setMatrixAt(k, _m);
          im.setColorAt(k, p.tint || _c.set(0xffffff));
          if (p.oid !== undefined) this.obsInst[p.oid] = { mesh: im, k, pos, quat, scl, t: -1 };
        });
        im.computeBoundingSphere();
        im.castShadow = true; im.receiveShadow = true;
        this.group.add(im);
      }
    }
    this.props = null;
  }

  destroyObstacle(oid) {
    const o = this.obsInst[oid];
    if (!o || o.t >= 0) return;
    o.t = 0;
    this.destroying.push(o);
    this.sources.forEach(s => { if (s.oid === oid) s.alive = false; });
  }

  // ── Decor (grass, flowers, pebbles …) ─────────────────────
  buildDecor() {
    const { map, T, rnd } = this, D = T.decor || {}, half = map.N / 2;
    const q = this.quality === 'low' ? .45 : 1, area = (map.N * map.N) / (44 * 44);
    const okLand = (x, z, outside = 3) => {
      if (Math.max(Math.abs(x), Math.abs(z)) > half + outside) return false;
      if (Math.abs(x) < half && Math.abs(z) < half) {
        const t = map.cell[Math.round(z + map.off) * map.N + Math.round(x + map.off)];
        if (t === WATER || t === BRIDGE || t === ROAD || t === OBST) return false;
      }
      return map.riverSigned(x, z) > .15 && map.heightAt(x, z) > WATER_Y + .05;
    };
    const scatter = (kind, n, colors, test, opts = {}) => {
      n = Math.round(n * q * area);
      if (n <= 0) return;
      const mat = opts.mat || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, side: opts.side || THREE.FrontSide });
      const items = [];
      for (let t = 0; t < n * 6 && items.length < n; t++) {
        const x = (rnd() * 2 - 1) * (half + (opts.out ?? 3)), z = (rnd() * 2 - 1) * (half + (opts.out ?? 3));
        if (!test(x, z)) continue;
        const s = (opts.s0 ?? .8) + rnd() * (opts.s1 ?? .6);
        const y = opts.y !== undefined ? opts.y : map.groundAt(x, z) - .02;
        items.push({ x, y, z, s, r: rnd() * 6.3, c: new THREE.Color(colors[(rnd() * colors.length) | 0]).multiplyScalar(.85 + rnd() * .3) });
      }
      for (const list of chunked(items)) {
        const im = new THREE.InstancedMesh(M.decorGeometry(kind), mat, list.length);
        list.forEach((it, k) => {
          _m.compose(_p.set(it.x, it.y, it.z), _q.setFromAxisAngle(UP, it.r), _s.set(it.s, it.s, it.s));
          im.setMatrixAt(k, _m);
          im.setColorAt(k, it.c);
        });
        im.computeBoundingSphere();
        im.receiveShadow = !opts.noShadow;
        this.group.add(im);
      }
    };
    const land = (x, z) => okLand(x, z);
    if (D.tufts) scatter('tuft', D.tuftCount || 1000, D.tufts, land, { s0: .7, s1: .8 });
    if (D.flowers) scatter('flower', D.flowers, ['#ff6a9a', '#ffe14a', '#ffffff', '#b07aff', '#ff8a3a'], land);
    if (D.pebbles) scatter('pebble', D.pebbles, [T.ground.rock, '#b0aaa0', '#8a8478'], land, { s0: .6, s1: 1.4 });
    if (D.ferns) scatter('fern', D.ferns, ['#ffffff'], land, { s0: .7, s1: .6 });
    if (D.shells) scatter('shell', D.shells, ['#ffe0e8', '#fff4e0', '#ffb0a0', '#f0d0ff'], land);
    if (D.snowClumps) scatter('snowClump', D.snowClumps, ['#ffffff', '#eef6ff'], land, { s0: .6, s1: 1.2 });
    if (D.mushrooms) scatter('mushroom', D.mushrooms, ['#40f0ff', '#b060ff', '#60ff90', '#ff60c0'], land, { mat: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), noShadow: true });
    if (map.rivers.length) {
      const water = (x, z) => map.riverSigned(x, z) < -.45 && !this.underBridge(x, z) && Math.max(Math.abs(x), Math.abs(z)) < half + 6;
      if (D.lily) scatter('lily', 70, ['#ffffff'], water, { y: WATER_Y + .01, out: 6, noShadow: true });
      if (D.reeds) scatter('reed', 260, ['#ffffff'], (x, z) => { const s = map.riverSigned(x, z); return s > -.25 && s < .5 && !this.underBridge(x, z, 1.2); }, { out: 6 });
    }
  }

  underBridge(x, z, pad = .3) {
    return this.map.bridges.some(b => {
      const u = b.riverAxis === 'x' ? x : z, v = b.riverAxis === 'x' ? z : x;
      return u > b.u0 - pad && u < b.u1 + pad && v > b.v0 - pad && v < b.v1 + pad;
    });
  }

  // ── Torches, flames and the light pool ────────────────────
  buildLights() {
    const T = this.T, srcs = this.sources;
    const flames = srcs.filter(s => s.flame);
    this.flameOuter = this.flameInner = this.glow = this.bulbs = null;
    if (flames.length) {
      const mk = (inner, color) => {
        const im = new THREE.InstancedMesh(M.flameGeometry(inner), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: inner ? .95 : .8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), flames.length);
        im.frustumCulled = false;
        this.group.add(im);
        return im;
      };
      this.flameOuter = mk(false, 0xff6a10);
      this.flameInner = mk(true, 0xffd860);
      this.flames = flames;
    } else this.flames = [];
    const bulbs = srcs.filter(s => !s.flame);
    if (bulbs.length) {
      const im = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff0c0, toneMapped: false }), bulbs.length);
      bulbs.forEach((s, i) => { _m.makeTranslation(s.pos.x, s.pos.y + .04, s.pos.z); im.setMatrixAt(i, _m); });
      this.group.add(im);
    }
    if (srcs.length) {
      const g = new THREE.BufferGeometry(), n = srcs.length;
      const p = new Float32Array(n * 3), c = new Float32Array(n * 3);
      srcs.forEach((s, i) => { p[i * 3] = s.pos.x; p[i * 3 + 1] = s.pos.y + (s.flame ? .15 : 0); p[i * 3 + 2] = s.pos.z; });
      g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      const tex = M.glowTexture(); tex.userData.shared = true;
      this.glow = new THREE.Points(g, new THREE.PointsMaterial({ size: T.dark ? 3.2 : 2.2, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      this.glow.frustumCulled = false;
      this.group.add(this.glow);
    }
    const on = !!(T.dark || T.lamps) && srcs.length > 0;
    this.pool.forEach(l => { l.visible = on; l.intensity = 0; l.color.set(T.lamps && !T.dark ? 0xffd8a0 : 0xff8a30); });
    this.headLight.visible = !!T.dark;
    this.headLight.intensity = T.dark ? 5 : 0;
    this.poolT = 0;
    this.assigned = [];
  }

  // ── Weather & sky ─────────────────────────────────────────
  buildWeather() {
    const T = this.T, tex = M.glowTexture();
    this.snow = this.fireflies = this.rain = null;
    const pts = (n, size, color, additive) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
      const m = new THREE.PointsMaterial({ size, map: tex, color, vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: !additive });
      const p = new THREE.Points(g, m); p.frustumCulled = false;
      this.group.add(p);
      return p;
    };
    if (T.snowfall) {
      const n = Math.round(T.snowfall * (this.quality === 'low' ? .5 : 1));
      this.snow = pts(n, .22, 0xffffff, false);
      this.snowData = Array.from({ length: n }, () => ({ x: Math.random() * 44 - 22, y: Math.random() * 12, z: Math.random() * 44 - 22, v: .7 + Math.random() * .9, p: Math.random() * 6 }));
    }
    if (T.rain) {
      const n = Math.round(T.rain * (this.quality === 'low' ? .5 : 1));
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
      this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xcfe2f4, transparent: true, opacity: .5, depthWrite: false }));
      this.rain.frustumCulled = false;
      this.group.add(this.rain);
      this.rainData = Array.from({ length: n }, () => ({ x: Math.random() * 50 - 25, y: Math.random() * 16, z: Math.random() * 50 - 25, v: 15 + Math.random() * 9 }));
    }
    if (T.fireflies) {
      const n = T.fireflies;
      this.fireflies = pts(n, .45, 0xd8ff6a, true);
      this.flyData = Array.from({ length: n }, () => ({ x: Math.random() * 44 - 22, z: Math.random() * 44 - 22, h: .3 + Math.random() * 1.6, p: Math.random() * 20, s: .6 + Math.random() }));
    }
    if (T.stars || T.dark) {
      const n = 700, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const th = Math.random() * Math.PI * 2, ph = Math.random() * 1.2, R = 80 + Math.random() * 30;
        pos[i * 3] = Math.sin(ph) * Math.cos(th) * R; pos[i * 3 + 1] = Math.cos(ph) * R * .6 + 10; pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * R;
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const p = new THREE.Points(g, new THREE.PointsMaterial({ color: T.key === 'cave' ? 0xffa060 : 0xffffff, size: .5, fog: false, transparent: true, opacity: T.key === 'cave' ? .35 : .9 }));
      this.group.add(p);
    }
  }

  // ── Per-frame ─────────────────────────────────────────────
  update(dt, T, focus, head) {
    if (this.water) {
      const tm = this.water.material.map;
      tm.offset.x = (tm.offset.x + dt * .03 * this.flow[0] + dt * .004) % 1;
      tm.offset.y = (tm.offset.y + dt * .03 * this.flow[1] + dt * .003) % 1;
    }
    // flames
    if (this.flames.length) {
      this.flames.forEach((s, i) => {
        const on = s.alive ? 1 : 0;
        const f = 1 + Math.sin(T * 13 + i * 1.7) * .12 + Math.sin(T * 23.3 + i * 3.1) * .08;
        _q.setFromAxisAngle(UP, T * 1.5 + i);
        _m.compose(_p.copy(s.pos), _q, _s.set(f * .95 * on, (f + Math.sin(T * 9 + i) * .15) * 1.1 * on, f * .95 * on));
        this.flameOuter.setMatrixAt(i, _m);
        _m.compose(_p.copy(s.pos), _q, _s.set(f * on, f * 1.05 * on, f * on));
        this.flameInner.setMatrixAt(i, _m);
      });
      this.flameOuter.instanceMatrix.needsUpdate = true;
      this.flameInner.instanceMatrix.needsUpdate = true;
    }
    if (this.glow) {
      const c = this.glow.geometry.attributes.color;
      this.sources.forEach((s, i) => {
        const f = s.alive ? (s.flame ? .7 + Math.sin(T * 11 + i * 2.3) * .15 + Math.sin(T * 27 + i) * .08 : .85) : 0;
        if (s.flame) c.setXYZ(i, f, f * .55, f * .2); else c.setXYZ(i, f, f * .9, f * .7);
      });
      c.needsUpdate = true;
    }
    // assign the nearest light sources to the real lights
    if (this.pool[0].visible) {
      this.poolT -= dt;
      if (this.poolT <= 0) {
        this.poolT = .25;
        this.assigned = this.sources.filter(s => s.alive)
          .map(s => [s, (s.pos.x - focus.x) ** 2 + (s.pos.z - focus.z) ** 2])
          .sort((a, b) => a[1] - b[1]).slice(0, MAX_LIGHTS).map(a => a[0]);
      }
      this.pool.forEach((l, i) => {
        const s = this.assigned[i];
        if (!s) { l.intensity = 0; return; }
        l.position.set(s.pos.x, s.pos.y + .25, s.pos.z);
        const base = this.T.dark ? 16 : 9;
        l.intensity = s.flame ? base * (.85 + Math.sin(T * 12 + i * 2) * .1 + Math.sin(T * 29 + i * 5) * .06) : base;
        if (s.flame && this.T.embers && Math.random() < dt * 2.5) {
          this.particles.emit(s.pos.x, s.pos.y + .25, s.pos.z, 1, { colors: [0xffa040, 0xffd080, 0xff6020], speed: .25, up: 1.1, gravity: .6, life: 1.3, size: .45, floor: -50, drag: .99 });
        }
      });
    }
    if (this.headLight.visible && head) this.headLight.position.set(head.x, head.y + 1.6, head.z);

    // destroyed obstacles shrink away
    for (let i = this.destroying.length - 1; i >= 0; i--) {
      const o = this.destroying[i];
      o.t += dt * 3;
      if (o.t >= 1) { o.mesh.setMatrixAt(o.k, ZERO); this.destroying.splice(i, 1); }
      else { _m.compose(o.pos, o.quat, _s.copy(o.scl).multiplyScalar(1 - o.t)); o.mesh.setMatrixAt(o.k, _m); }
      o.mesh.instanceMatrix.needsUpdate = true;
    }

    // snow
    if (this.snow) {
      const p = this.snow.geometry.attributes.position, gy = this.map.heightAt(focus.x, focus.z);
      this.snowData.forEach((s, i) => {
        s.y -= s.v * dt;
        if (s.y < -1) { s.y = 12; s.x = Math.random() * 44 - 22; s.z = Math.random() * 44 - 22; }
        p.setXYZ(i, focus.x + s.x + Math.sin(T * .8 + s.p) * .6, gy + s.y, focus.z + s.z + Math.cos(T * .6 + s.p) * .4);
      });
      p.needsUpdate = true;
    }
    if (this.rain) {
      const p = this.rain.geometry.attributes.position, gy = this.map.heightAt(focus.x, focus.z), w = this.T.wind ? 5 : 1.6;
      this.rainData.forEach((d, i) => {
        d.y -= d.v * dt;
        if (d.y < -.5) { d.y = 16; d.x = Math.random() * 50 - 25; d.z = Math.random() * 50 - 25; }
        const x = focus.x + d.x, y = gy + d.y, z = focus.z + d.z;
        p.setXYZ(i * 2, x, y, z); p.setXYZ(i * 2 + 1, x - w * .045, y + .75, z - w * .02);
      });
      p.needsUpdate = true;
    }
    if (this.cars?.length) this.moveCars(dt);
    if (this.fireflies) {
      const p = this.fireflies.geometry.attributes.position, c = this.fireflies.geometry.attributes.color;
      this.flyData.forEach((f, i) => {
        let x = f.x + Math.sin(T * .3 * f.s + f.p) * 2, z = f.z + Math.cos(T * .25 * f.s + f.p * 1.3) * 2;
        // wrap around the focus so fireflies always surround the player
        const wx = focus.x + (((x - focus.x) % 44 + 66) % 44 - 22), wz = focus.z + (((z - focus.z) % 44 + 66) % 44 - 22);
        p.setXYZ(i, wx, this.map.groundAt(wx, wz) + f.h + Math.sin(T * 1.3 + f.p) * .3, wz);
        const b = Math.max(0, Math.sin(T * 1.7 * f.s + f.p)) ** 3;
        c.setXYZ(i, b, b, b);
      });
      p.needsUpdate = true; c.needsUpdate = true;
    }
    this.wildlife.update(dt, T, head, focus);
  }
}
