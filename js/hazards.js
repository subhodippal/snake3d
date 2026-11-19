// ───────────────────────────────────────────────────────────
//  Hazard ground: poison pools, camp fires, lava and animal dens.
//  Each zone is a soft-edged blob painted onto the terrain plus a few props.
//  Poison, fire and lava drain health while the snake stands in them.
// ───────────────────────────────────────────────────────────
import * as THREE from 'three';
import { glowTexture } from './models.js';

const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const HAZ = {
  poison: { id: 1, dmg: 4, r: 2.7, name: 'Poison pool', emoji: '☠️', flash: 'rgba(120,255,60,.22)', warn: '☠️ Poison! Get out of the green!', color: [.2, .62, .1], hot: [.55, 1, .25] },
  fire: { id: 2, dmg: 7, r: 2.0, name: 'Camp fire', emoji: '🔥', flash: 'rgba(255,110,20,.28)', warn: '🔥 Fire! Do not stand in the flames!', color: [.16, .08, .04], hot: [1, .48, .1] },
  lava: { id: 3, dmg: 10, r: 2.6, name: 'Lava', emoji: '🌋', flash: 'rgba(255,60,10,.3)', warn: '🌋 Lava! Get out fast!', color: [.5, .1, .02], hot: [1, .6, .12] },
  den: { id: 0, dmg: 0, r: 3.0, name: 'Animal den', emoji: '🐾', color: [.3, .21, .12], hot: [.4, .29, .17] },
};
export const HAZ_BY_ID = [null, HAZ.poison, HAZ.fire, HAZ.lava];

/** Irregular blob: returns < 1 inside the zone, > 1 outside (cell coordinates). */
export function makeShape(kind, cx, cz) {
  const R = HAZ[kind].r, p1 = rand(6.28), p2 = rand(6.28);
  return (x, z) => {
    const dx = x - cx, dz = z - cz, a = Math.atan2(dz, dx);
    return Math.hypot(dx, dz) / (R * (1 + .2 * Math.sin(a * 3 + p1) + .1 * Math.sin(a * 5 + p2)));
  };
}

const basic = (color, opacity = 1, additive = false) => new THREE.MeshBasicMaterial({
  color, transparent: opacity < 1 || additive, opacity, depthWrite: false, toneMapped: false,
  blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
});
const lit = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .9, ...o });

/**
 * Builds the visuals of one zone. `cellOk(x, z)` says whether the ground at a cell can show the effect,
 * `groundAt(wx, wz)` is the terrain height. Returns { group, update(dt, T) }.
 */
export function buildZone(kind, cx, cz, shape, { N, cellOk, groundAt, particles }) {
  const def = HAZ[kind], off = N / 2 - .5, R = def.r * 1.4, step = .5;
  const x0 = Math.floor(cx - R), z0 = Math.floor(cz - R), n = Math.round((Math.ceil(cx + R) - x0) / step) + 1, m = Math.round((Math.ceil(cz + R) - z0) / step) + 1;
  const pos = new Float32Array(n * m * 3), col = new Float32Array(n * m * 4), alive = new Uint8Array(n * m);
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    const x = x0 + i * step, z = z0 + j * step, k = j * n + i, u = shape(x, z);
    const ok = cellOk(Math.round(x), Math.round(z));
    const a = ok ? clamp((1 - u) / .3, 0, 1) : 0, core = clamp(1 - u, 0, 1), mix = core * .9 * (.75 + .25 * Math.sin(x * 2.1 + z * 1.7));
    alive[k] = a > 0 ? 1 : 0;
    pos[k * 3] = x - off; pos[k * 3 + 2] = z - off; pos[k * 3 + 1] = groundAt(x - off, z - off) + .07;
    col[k * 4] = def.color[0] + (def.hot[0] - def.color[0]) * mix;
    col[k * 4 + 1] = def.color[1] + (def.hot[1] - def.color[1]) * mix;
    col[k * 4 + 2] = def.color[2] + (def.hot[2] - def.color[2]) * mix;
    col[k * 4 + 3] = a * (kind === 'den' ? .8 : .93);
  }
  const idx = [];
  for (let j = 0; j < m - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    if (!(alive[a] || alive[b] || alive[c] || alive[d])) continue;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  geo.setIndex(idx);
  const floorMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const floor = new THREE.Mesh(geo, floorMat);
  floor.renderOrder = 1; floor.frustumCulled = false;

  const group = new THREE.Group();
  group.add(floor);
  const wx = cx - off, wz = cz - off, gy = groundAt(wx, wz);
  const prop = new THREE.Group(); prop.position.set(wx, gy, wz); group.add(prop);
  const glow = (color, size, opacity) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    s.scale.set(size, size, 1); s.renderOrder = 2; return s;
  };
  const anim = [];            // per-frame callbacks (T) → void

  if (kind === 'fire') {
    const wood = lit(0x5a3a1c);
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(.09, .1, 1.2, 6), wood);
      log.position.y = .14; log.rotation.set(Math.PI / 2, 0, i * Math.PI / 4 + .2); log.castShadow = true; prop.add(log);
    }
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2, st = new THREE.Mesh(new THREE.DodecahedronGeometry(.2 + rand(.08)), lit(0x8a8a84));
      st.position.set(Math.cos(a) * 1.55, .1, Math.sin(a) * 1.55); st.castShadow = true; prop.add(st);
    }
    const flames = [];
    for (const [r, h, c, o, ox, oz] of [[.36, 1.25, 0xff6a10, .75, 0, 0], [.26, 1.7, 0xffa020, .7, .18, -.1], [.22, .95, 0xff5a10, .75, -.2, .15], [.16, 1.05, 0xfff2a0, .85, 0, 0]]) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), basic(c, o, true));
      f.position.set(ox, h / 2 + .1, oz); f.userData = { h, ph: rand(6.28) }; prop.add(f); flames.push(f);
    }
    const g = glow(0xff7a20, 6.5, .55); g.position.y = .8; prop.add(g);
    anim.push((T, dt) => {
      flames.forEach((f, i) => { const k = 1 + Math.sin(T * 13 + f.userData.ph) * .16 + Math.sin(T * 27 + i) * .1; f.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k)); f.rotation.y = T * 2 + i; f.position.y = f.userData.h * k / 2 + .1; });
      g.material.opacity = .5 + Math.sin(T * 11) * .1;
      if (Math.random() < dt * 9) particles.emit(wx + rand(-.4, .4), gy + 1, wz + rand(-.4, .4), 1, { colors: [0xffa040, 0xffd080, 0xff6020], speed: .3, up: 1.8, gravity: .4, life: 1.2, size: .55, floor: -50, drag: .99 });
    });
  } else if (kind === 'lava') {
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + rand(.3), r = def.r * rand(.85, 1.05), rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(.22, .45)), lit(0x2a2220, { emissive: 0x401006, emissiveIntensity: .5 }));
      rock.position.set(Math.cos(a) * r, .12, Math.sin(a) * r); rock.scale.y = .7; rock.castShadow = true; prop.add(rock);
    }
    const g = glow(0xff6a1a, 8, .5); g.position.y = .6; prop.add(g);
    const bubbles = [];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), basic(0xffc050, .9));
      b.userData = { ph: rand(6.28), sp: rand(.8, 1.6), x: rand(-1.4, 1.4), z: rand(-1.4, 1.4) }; b.position.set(b.userData.x, .1, b.userData.z); prop.add(b); bubbles.push(b);
    }
    anim.push((T, dt) => {
      floorMat.color.setScalar(.82 + Math.sin(T * 2.4) * .12 + Math.sin(T * 5.3) * .06);
      g.material.opacity = .45 + Math.sin(T * 3) * .1;
      bubbles.forEach(b => { const p = (T * b.userData.sp + b.userData.ph) % 3, s = p < 1 ? p : p < 1.25 ? 1 + (p - 1) * 1.2 : 0; b.scale.setScalar(Math.max(.001, s)); b.position.y = .12 + s * .05; });
      if (Math.random() < dt * 5) particles.emit(wx + rand(-1.8, 1.8), gy + .3, wz + rand(-1.8, 1.8), 1, { colors: [0xff7a1a, 0xffc030], speed: .5, up: 2.4, gravity: -3, life: .9, size: .6, floor: gy });
    });
  } else if (kind === 'poison') {
    const g = glow(0x6aff30, 6, .3); g.position.y = .4; prop.add(g);
    const bubbles = [];
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6), basic(0xb8ff70, .55, true));
      b.userData = { ph: rand(6.28), sp: rand(.5, 1.1), x: rand(-1.8, 1.8), z: rand(-1.8, 1.8) }; prop.add(b); bubbles.push(b);
    }
    for (let i = 0; i < 4; i++) {
      const a = rand(6.28), r = def.r * rand(.7, 1), sk = new THREE.Mesh(new THREE.SphereGeometry(.14, 8, 6), lit(0xe8e4d0));
      sk.position.set(Math.cos(a) * r, .12, Math.sin(a) * r); sk.scale.set(1, .85, 1.1); prop.add(sk);          // old bones half sunk in the goo
    }
    anim.push((T, dt) => {
      floorMat.color.setScalar(.85 + Math.sin(T * 1.7) * .1);
      bubbles.forEach(b => { const p = (T * b.userData.sp + b.userData.ph) % 2; b.position.set(b.userData.x + Math.sin(T + b.userData.ph) * .1, .1 + p * .5, b.userData.z); b.scale.setScalar(Math.max(.001, p < 1.6 ? .4 + p * .5 : (2 - p) * 2.6)); });
      if (Math.random() < dt * 4) particles.emit(wx + rand(-1.8, 1.8), gy + .2, wz + rand(-1.8, 1.8), 1, { colors: [0x9aff4a, 0xd8ff90], speed: .2, up: 1.2, gravity: -1, life: 1.1, size: .5, floor: gy });
    });
  } else {                    // animal den: a dark burrow ringed by stones, with some bones
    const hole = new THREE.Mesh(new THREE.CircleGeometry(.6, 18), new THREE.MeshBasicMaterial({ color: 0x0a0604, toneMapped: false }));
    hole.rotation.x = -Math.PI / 2; hole.position.y = .1; hole.scale.set(1.2, 1, 1); prop.add(hole);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, st = new THREE.Mesh(new THREE.DodecahedronGeometry(.16 + rand(.1)), lit(0x7a7468));
      st.position.set(Math.cos(a) * 1.1, .09, Math.sin(a) * .9); st.castShadow = true; prop.add(st);
    }
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .4, 5), lit(0xf0ead8));
      b.position.set(rand(-1.6, 1.6), .08, rand(-1.4, 1.4)); b.rotation.set(Math.PI / 2, 0, rand(3)); prop.add(b);
    }
  }
  return { group, update: (dt, T) => anim.forEach(f => f(T, dt)) };
}
