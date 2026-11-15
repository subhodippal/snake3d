// ───────────────────────────────────────────────────────────
//  Ambient wildlife – harmless animals that roam, fly, swim
//  and scurry away from the snake. Purely decorative.
// ───────────────────────────────────────────────────────────
import * as THREE from 'three';
import { WATER_Y, walkable } from './mapgen.js';

const PI = Math.PI;
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const matCache = {};
function mat(color, opts) {
  const key = color + (opts ? JSON.stringify(opts) : '');
  if (!matCache[key]) { matCache[key] = new THREE.MeshStandardMaterial({ color, roughness: .7, ...opts }); matCache[key].userData.shared = true; }
  return matCache[key];
}
const geoCache = {};
function geo(key, make) { if (!geoCache[key]) { geoCache[key] = make(); geoCache[key].userData.shared = true; } return geoCache[key]; }
const sph = (r, w = 10, h = 8) => geo(`s${r}_${w}_${h}`, () => new THREE.SphereGeometry(r, w, h));
const cyl = (a, b, h, s = 6) => geo(`c${a}_${b}_${h}_${s}`, () => new THREE.CylinderGeometry(a, b, h, s));
const cone = (r, h, s = 6) => geo(`k${r}_${h}_${s}`, () => new THREE.ConeGeometry(r, h, s));
const box = (x, y, z) => geo(`b${x}_${y}_${z}`, () => new THREE.BoxGeometry(x, y, z));

function add(parent, g, color, pos = [0, 0, 0], scl = [1, 1, 1], rot = [0, 0, 0], shadow = true) {
  const m = new THREE.Mesh(g, typeof color === 'number' ? mat(color) : color);
  m.position.set(...pos); m.scale.set(...scl); m.rotation.set(...rot);
  m.castShadow = shadow;
  parent.add(m);
  return m;
}
/** A leg that swings from its top (hip). */
function leg(parent, x, y, z, len, r, color) {
  const pivot = new THREE.Group(); pivot.position.set(x, y, z); parent.add(pivot);
  add(pivot, cyl(r, r * .8, len), color, [0, -len / 2, 0]);
  return pivot;
}
function eyes(parent, x, y, z, r = .025) {
  for (const s of [-1, 1]) add(parent, sph(r, 6, 4), 0x111111, [s * x, y, z], [1, 1, 1], [0, 0, 0], false);
}

// ── Builders ────────────────────────────────────────────────
function quad(o) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const legs = [];
  add(body, sph(.5, 12, 8), o.color, [0, o.h, 0], o.bodyScale);
  if (o.belly) add(body, sph(.5, 10, 6), o.belly, [0, o.h - o.bodyScale[1] * .25, 0], [o.bodyScale[0] * .8, o.bodyScale[1] * .6, o.bodyScale[2] * .85]);
  const head = new THREE.Group(); head.position.set(0, o.h + o.headUp, o.bodyScale[2] * .5 + o.headR * .4); body.add(head);
  add(head, sph(o.headR, 10, 8), o.headColor ?? o.color, [0, 0, 0], [1, .95, 1.1]);
  if (o.snout) add(head, sph(o.headR * .55, 8, 6), o.snout, [0, -o.headR * .25, o.headR * .85], [1, .8, 1.1]);
  eyes(head, o.headR * .45, o.headR * .25, o.headR * .85, o.headR * .16);
  const ears = [];
  for (const s of [-1, 1]) {
    if (o.ears === 'long') ears.push(add(head, sph(.06, 6, 4), o.earColor ?? o.color, [s * o.headR * .4, o.headR * 1.6, -.02], [.55, 2.4, .3], [0, 0, s * -.12]));
    else if (o.ears === 'point') ears.push(add(head, cone(o.headR * .35, o.headR * .7, 4), o.earColor ?? o.color, [s * o.headR * .5, o.headR * .95, 0], [1, 1, .5], [0, 0, s * -.3]));
    else if (o.ears === 'flop') ears.push(add(head, sph(o.headR * .35, 6, 4), o.earColor ?? o.color, [s * o.headR * .85, o.headR * .1, -.02], [.4, 1.2, .7], [0, 0, s * .3]));
    else if (o.ears === 'round') ears.push(add(head, sph(o.headR * .32, 6, 4), o.earColor ?? o.color, [s * o.headR * .95, o.headR * .3, 0], [.5, 1, 1]));
  }
  if (o.horns) for (const s of [-1, 1]) add(head, cone(.03, .22, 5), o.horns, [s * o.headR * .4, o.headR * 1.1, -o.headR * .3], [1, 1, 1], [-.6, 0, s * .2]);
  if (o.antlers) for (const s of [-1, 1]) {
    add(head, cyl(.015, .02, .3, 4), o.antlers, [s * .07, o.headR + .12, -.03], [1, 1, 1], [0, 0, s * .35]);
    add(head, cyl(.012, .015, .15, 4), o.antlers, [s * .14, o.headR + .22, .03], [1, 1, 1], [.5, 0, s * .9]);
  }
  const lx = o.bodyScale[0] * .32, lz = o.bodyScale[2] * .3;
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) legs.push(leg(body, sx * lx, o.h - o.bodyScale[1] * .2, sz * lz, o.legLen, o.legR, o.legColor ?? o.color));
  let tail = null;
  if (o.tail) {
    tail = new THREE.Group(); tail.position.set(0, o.h + .02, -o.bodyScale[2] * .5); body.add(tail);
    add(tail, o.tail.geo, o.tail.color ?? o.color, o.tail.pos, o.tail.scale, o.tail.rot);
  }
  return { group: g, body, head, legs, ears, tail };
}

const B = {
  rabbit: (white) => quad({
    color: white ? 0xf4f4f4 : 0xb08a68, belly: 0xf0e8e0, h: .2, bodyScale: [.3, .28, .42], headR: .12, headUp: .12, ears: 'long', earColor: white ? 0xffe0e8 : 0xa07a58,
    legLen: .1, legR: .035, tail: { geo: sph(.06, 6, 4), color: 0xffffff, pos: [0, .02, -.02], scale: [1, 1, 1] },
  }),
  deer: () => quad({
    color: 0xb0703a, belly: 0xf0e0c8, h: .72, bodyScale: [.36, .38, .8], headR: .12, headUp: .32, ears: 'point', snout: 0x3a2a1a,
    legLen: .62, legR: .032, antlers: Math.random() < .5 ? 0xd8c8a0 : null, tail: { geo: sph(.05, 6, 4), color: 0xffffff, pos: [0, .05, 0], scale: [1, 1.4, 1] },
  }),
  sheep: () => {
    const a = quad({ color: 0xf6f4ee, h: .42, bodyScale: [.5, .44, .62], headR: .12, headUp: .06, headColor: 0x2a2a2a, ears: 'flop', earColor: 0x2a2a2a, legLen: .3, legR: .035, legColor: 0x2a2a2a });
    for (let k = 0; k < 6; k++) add(a.body, sph(.14, 7, 5), 0xffffff, [Math.cos(k) * .14, .58 + (k % 2) * .06, Math.sin(k * 1.7) * .2]);
    return a;
  },
  goat: () => quad({
    color: 0xd8d0c4, h: .45, bodyScale: [.3, .32, .58], headR: .1, headUp: .22, ears: 'flop', horns: 0x6a5a4a, snout: 0xc8b8a8,
    legLen: .38, legR: .03, legColor: 0x8a7a6a, tail: { geo: cone(.04, .12, 4), pos: [0, .06, 0], scale: [1, 1, 1], rot: [-.8, 0, 0] },
  }),
  dog: () => quad({
    color: [0xc8884a, 0x3a3a3a, 0xf0e0c0, 0x8a5a3a][(Math.random() * 4) | 0], belly: 0xf4ecdc, h: .36, bodyScale: [.3, .3, .62], headR: .13, headUp: .2,
    ears: 'flop', earColor: 0x5a3a22, snout: 0xe8d8c0, legLen: .3, legR: .035,
    tail: { geo: cyl(.025, .02, .3, 5), pos: [0, .1, -.05], scale: [1, 1, 1], rot: [-.7, 0, 0] },
  }),
  cat: () => quad({
    color: [0xff9a40, 0x5a5a5a, 0xf4f4f4, 0x2a2a2a][(Math.random() * 4) | 0], h: .26, bodyScale: [.22, .22, .48], headR: .11, headUp: .13, ears: 'point',
    legLen: .22, legR: .025, tail: { geo: cyl(.02, .018, .4, 5), pos: [0, .18, -.08], scale: [1, 1, 1], rot: [-.35, 0, 0] },
  }),
  squirrel: () => quad({
    color: 0xb0602a, belly: 0xf0d8b0, h: .14, bodyScale: [.16, .16, .26], headR: .08, headUp: .1, ears: 'point', legLen: .08, legR: .022,
    tail: { geo: sph(.1, 8, 6), color: 0xc0703a, pos: [0, .14, -.05], scale: [.9, 1.8, .9], rot: [-.4, 0, 0] },
  }),
  monkey: () => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const fur = 0x7a4a2a, face = 0xe0b890;
    add(body, sph(.2, 10, 8), fur, [0, .42, 0], [.9, 1.1, .8]);
    add(body, sph(.13, 8, 6), face, [0, .4, .1], [.9, 1, .5]);
    const head = new THREE.Group(); head.position.set(0, .72, .04); body.add(head);
    add(head, sph(.15, 10, 8), fur);
    add(head, sph(.11, 8, 6), face, [0, -.02, .09], [1, .85, .6]);
    eyes(head, .05, .03, .15, .022);
    const ears = [add(head, sph(.055, 6, 4), face, [-.15, .02, 0], [.5, 1, 1]), add(head, sph(.055, 6, 4), face, [.15, .02, 0], [.5, 1, 1])];
    const legs = [
      leg(body, -.16, .56, .02, .36, .035, fur), leg(body, .16, .56, .02, .36, .035, fur), // arms
      leg(body, -.09, .26, 0, .26, .04, fur), leg(body, .09, .26, 0, .26, .04, fur),
    ];
    const tail = new THREE.Group(); tail.position.set(0, .3, -.14); body.add(tail);
    add(tail, geo('mtail', () => new THREE.TorusGeometry(.18, .022, 5, 12, PI * 1.3)), fur, [0, .12, -.1], [1, 1, 1], [0, PI / 2, 0]);
    return { group: g, body, head, legs, ears, tail, upright: true };
  },
  frog: () => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const c = [0x4ab83a, 0x3a9a5a, 0x8ac83a][(Math.random() * 3) | 0];
    add(body, sph(.14, 10, 8), c, [0, .1, 0], [1.1, .62, 1.15]);
    add(body, sph(.1, 8, 6), 0xd8f0a0, [0, .07, .05], [1, .4, 1]);
    for (const s of [-1, 1]) {
      add(body, sph(.045, 6, 4), 0xffffff, [s * .07, .2, .08]); add(body, sph(.025, 6, 4), 0x111111, [s * .075, .21, .115], [1, 1, 1], [0, 0, 0], false);
      add(body, sph(.07, 6, 4), c, [s * .12, .05, -.06], [.6, .5, 1.3]);
    }
    return { group: g, body, legs: [], ears: [] };
  },
  turtle: () => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    add(body, geo('shell', () => new THREE.SphereGeometry(.3, 12, 7, 0, PI * 2, 0, PI / 2)), 0x5a7a3a, [0, .06, 0], [1, .65, 1.2]);
    for (let k = 0; k < 5; k++) add(body, sph(.08, 6, 4), 0x3a5a2a, [Math.cos(k * 1.26) * .13, .22, Math.sin(k * 1.26) * .16], [1, .3, 1]);
    add(body, sph(.1, 6, 4), 0x3a5a2a, [0, .26, 0], [1, .3, 1]);
    add(body, cyl(.3, .3, .05, 12), 0xd8c88a, [0, .06, 0], [1, 1, 1.2]);
    const head = new THREE.Group(); head.position.set(0, .1, .38); body.add(head);
    add(head, sph(.08, 8, 6), 0x8aa85a, [0, 0, 0], [.9, .8, 1.2]); eyes(head, .04, .03, .07, .015);
    const legs = [];
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const p = new THREE.Group(); p.position.set(sx * .24, .06, sz * .22); body.add(p);
      add(p, sph(.07, 6, 4), 0x8aa85a, [sx * .05, 0, 0], [1, .4, .7]);
      legs.push(p);
    }
    return { group: g, body, head, legs, ears: [], paddle: true };
  },
  crab: () => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const c = 0xe8502a;
    add(body, sph(.14, 10, 6), c, [0, .14, 0], [1.4, .5, 1]);
    for (const s of [-1, 1]) {
      add(body, cyl(.012, .012, .1, 4), c, [s * .06, .22, .08]); add(body, sph(.025, 6, 4), 0x111111, [s * .06, .28, .08]);
      add(body, sph(.07, 6, 4), c, [s * .22, .16, .12], [1, .6, .8]);
    }
    const legs = [];
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
      const p = new THREE.Group(); p.position.set(s * .17, .12, -.06 + k * .07); body.add(p);
      add(p, cyl(.012, .01, .18, 4), c, [s * .07, -.05, 0], [1, 1, 1], [0, 0, s * 1.0]);
      legs.push(p);
    }
    return { group: g, body, legs, ears: [], sideways: true };
  },
  penguin: () => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    add(body, sph(.2, 10, 8), 0x1a1a24, [0, .32, 0], [.9, 1.45, .85]);
    add(body, sph(.18, 10, 8), 0xffffff, [0, .3, .06], [.8, 1.3, .75]);
    const head = new THREE.Group(); head.position.set(0, .66, 0); body.add(head);
    add(head, sph(.13, 10, 8), 0x1a1a24);
    add(head, sph(.09, 8, 6), 0xffffff, [0, -.01, .07], [1, .9, .7]);
    add(head, cone(.035, .12, 5), 0xffa020, [0, -.02, .16], [1, 1, 1], [PI / 2, 0, 0]);
    eyes(head, .05, .03, .11, .018);
    const legs = [];
    for (const s of [-1, 1]) {
      const f = new THREE.Group(); f.position.set(s * .17, .42, 0); body.add(f);
      add(f, box(.03, .26, .1), 0x1a1a24, [s * .02, -.1, 0], [1, 1, 1], [0, 0, s * .15]);
      legs.push(f);
      add(body, box(.08, .02, .12), 0xffa020, [s * .07, .01, .05]);
    }
    return { group: g, body, head, legs, ears: [], waddle: true, flippers: true };
  },
  lizard: () => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const c = [0x6aa83a, 0xa88a4a][(Math.random() * 2) | 0];
    add(body, sph(.1, 8, 6), c, [0, .06, 0], [.7, .4, 1.6]);
    add(body, sph(.06, 8, 6), c, [0, .07, .17], [.9, .6, 1.3]);
    add(body, cone(.04, .35, 5), c, [0, .05, -.3], [1, .6, 1], [-PI / 2, 0, 0]);
    eyes(body, .035, .09, .2, .012);
    const legs = [];
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const p = new THREE.Group(); p.position.set(sx * .07, .05, sz * .08); body.add(p);
      add(p, cyl(.015, .012, .08, 4), c, [sx * .04, -.02, 0], [1, 1, 1], [0, 0, sx * 1.1]);
      legs.push(p);
    }
    return { group: g, body, legs, ears: [] };
  },
  pigeon: () => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    add(body, sph(.12, 10, 8), 0x8a8a9a, [0, .16, 0], [.85, .85, 1.25]);
    add(body, box(.12, .02, .14), 0x5a5a6a, [0, .17, -.17], [1, 1, 1], [.3, 0, 0]);
    const head = new THREE.Group(); head.position.set(0, .28, .1); body.add(head);
    add(head, sph(.065, 8, 6), 0x6a6a7a); add(head, sph(.05, 6, 4), 0x5a9a7a, [0, -.05, -.02], [1.2, .8, 1]);
    add(head, cone(.018, .06, 4), 0xd8b090, [0, -.01, .07], [1, 1, 1], [PI / 2, 0, 0]); eyes(head, .035, .02, .04, .012);
    const legs = [leg(body, -.04, .08, 0, .08, .01, 0xd86a6a), leg(body, .04, .08, 0, .08, .01, 0xd86a6a)];
    return { group: g, body, head, legs, ears: [], peck: true };
  },
  duck: () => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const male = Math.random() < .5;
    add(body, sph(.17, 10, 8), male ? 0xd8d0c0 : 0xa8804a, [0, .06, 0], [.9, .7, 1.3]);
    add(body, cone(.06, .14, 5), male ? 0x2a2a2a : 0x8a6a3a, [0, .12, -.22], [1, .5, 1], [-1.9, 0, 0]);
    const head = new THREE.Group(); head.position.set(0, .22, .15); body.add(head);
    add(head, sph(.08, 8, 6), male ? 0x1a7a3a : 0x9a7040);
    add(head, box(.06, .02, .09), 0xffa020, [0, -.02, .09]); eyes(head, .045, .02, .04, .013);
    return { group: g, body, head, legs: [], ears: [] };
  },
  fish: () => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const c = [0xff8a2a, 0xc8d0d8, 0xffc12a][(Math.random() * 3) | 0];
    add(body, sph(.1, 8, 6), c, [0, 0, 0], [.45, .7, 1.4]);
    add(body, cone(.08, .14, 4), c, [0, 0, -.18], [.3, 1, 1], [-PI / 2, 0, 0]);
    eyes(body, .03, .02, .09, .012);
    return { group: g, body, legs: [], ears: [] };
  },
  // fliers
  bird: (kind = 'bird') => {
    const C = {
      bird: [0x3a6ad0, 0x2a4a9a, 0xff9a40], parrot: [[0xe83a2a, 0x2ab04a, 0x2a7ae8, 0xffc12a][(Math.random() * 4) | 0], 0x2ab04a, 0x3a3a3a],
      seagull: [0xf8f8f8, 0x9aa0a8, 0xffc12a], eagle: [0x6a4a2a, 0x4a3420, 0xffc12a], bat: [0x2a2228, 0x1a1418, 0x2a2228],
    }[kind];
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const bat = kind === 'bat';
    add(body, sph(.1, 8, 6), C[0], [0, 0, 0], [.8, .75, bat ? 1.1 : 1.6]);
    const head = new THREE.Group(); head.position.set(0, .04, bat ? .1 : .15); body.add(head);
    add(head, sph(.07, 8, 6), kind === 'eagle' ? 0xf4f4f4 : C[0]);
    if (bat) { for (const s of [-1, 1]) add(head, cone(.025, .07, 4), C[1], [s * .04, .07, 0]); }
    else add(head, cone(.025, .09, 4), C[2], [0, -.01, .08], [1, 1, 1], [PI / 2, 0, 0]);
    eyes(head, .035, .02, .05, .012);
    if (!bat) add(body, box(.12, .015, .14), C[1], [0, .01, -.2]);
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(s * .06, .03, 0); body.add(w);
      add(w, box(.34, .015, bat ? .22 : .16), C[1], [s * .17, 0, 0], [1, 1, 1], [0, s * (bat ? .2 : .15), 0]);
      add(w, box(.16, .012, .12), C[0], [s * .38, 0, -.03], [1, 1, 1], [0, s * .4, 0]);
      wings.push(w);
    }
    return { group: g, body, head, wings, legs: [], ears: [] };
  },
  butterfly: () => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const c = [0xff6ad0, 0xffc12a, 0x6ac8ff, 0xff7a2a, 0xb07aff][(Math.random() * 5) | 0];
    const m = new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: .6 }); m.userData.shared = false;
    add(body, cyl(.012, .012, .12, 4), 0x2a2a2a, [0, 0, 0], [1, 1, 1], [PI / 2, 0, 0], false);
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); body.add(w);
      const a = new THREE.Mesh(geo('bwing', () => new THREE.CircleGeometry(.09, 8)), m); a.position.set(s * .08, 0, .03); a.rotation.x = -PI / 2; w.add(a);
      const b = new THREE.Mesh(geo('bwing2', () => new THREE.CircleGeometry(.065, 8)), m); b.position.set(s * .06, 0, -.06); b.rotation.x = -PI / 2; w.add(b);
      wings.push(w);
    }
    return { group: g, body, wings, legs: [], ears: [] };
  },
};

// behaviour config
const KINDS = {
  rabbit: { build: () => B.rabbit(false), move: 'hop', speed: 2.6, hop: .32, rate: 7 },
  whiteRabbit: { build: () => B.rabbit(true), move: 'hop', speed: 2.6, hop: .32, rate: 7 },
  deer: { build: B.deer, move: 'walk', speed: 1.6, rate: 6, flee: 4 },
  sheep: { build: B.sheep, move: 'walk', speed: .8, rate: 7, idle: [2, 6] },
  goat: { build: B.goat, move: 'walk', speed: 1.2, rate: 7 },
  dog: { build: B.dog, move: 'walk', speed: 2.4, rate: 11 },
  cat: { build: B.cat, move: 'walk', speed: 1.4, rate: 8 },
  squirrel: { build: B.squirrel, move: 'hop', speed: 3.2, hop: .2, rate: 11 },
  monkey: { build: B.monkey, move: 'hop', speed: 2.4, hop: .38, rate: 6, idle: [1.5, 5] },
  frog: { build: B.frog, move: 'hop', speed: 1.8, hop: .3, rate: 5, idle: [1.5, 5] },
  turtle: { build: B.turtle, move: 'walk', speed: .42, rate: 3, flee: 1.6, idle: [2, 6] },
  crab: { build: B.crab, move: 'walk', speed: 1.3, rate: 16 },
  penguin: { build: B.penguin, move: 'walk', speed: .85, rate: 8 },
  lizard: { build: B.lizard, move: 'walk', speed: 2.8, rate: 18, idle: [.6, 2.5] },
  pigeon: { build: B.pigeon, move: 'walk', speed: .9, rate: 9, idle: [1, 3] },
  duck: { build: B.duck, move: 'swim', speed: .7 },
  fish: { build: B.fish, move: 'jump' },
  bird: { build: () => B.bird('bird'), move: 'fly', h: [3.5, 6], r: [4, 8], w: .6 },
  parrot: { build: () => B.bird('parrot'), move: 'fly', h: [3, 5], r: [3, 7], w: .7 },
  seagull: { build: () => B.bird('seagull'), move: 'fly', h: [4, 7], r: [5, 10], w: .45 },
  eagle: { build: () => B.bird('eagle'), move: 'fly', h: [7, 9], r: [8, 12], w: .25, scale: 2.2, glide: true },
  bat: { build: () => B.bird('bat'), move: 'fly', h: [1.8, 3.5], r: [2, 5], w: 1.3, erratic: true },
  butterfly: { build: B.butterfly, move: 'flutter', speed: .9 },
};

export class Wildlife {
  constructor(parent, map, particles) {
    this.map = map; this.particles = particles;
    this.group = new THREE.Group();
    parent.add(this.group);
    this.list = [];
  }

  spawnAll(spec) {
    for (const [kind, count] of spec) for (let i = 0; i < count; i++) this.spawn(kind);
  }

  // where can a land animal stand?
  canStand(a, x, z) {
    const m = this.map, half = m.N / 2;
    const inGrid = Math.abs(x) < half - .05 && Math.abs(z) < half - .05;
    if (a.zone === 'in') {
      if (!inGrid) return false;
      const cx = Math.round(x + m.off), cz = Math.round(z + m.off);
      return walkable(m.cell[cz * m.N + cx]);
    }
    if (Math.max(Math.abs(x), Math.abs(z)) < half + .9 || Math.max(Math.abs(x), Math.abs(z)) > half + 10) return false;
    return m.heightAt(x, z) > WATER_Y + .15;
  }
  canSwim(x, z) {
    const m = this.map;
    return Math.max(Math.abs(x), Math.abs(z)) < m.N / 2 + 8 && m.riverSigned(x, z) < -.35;
  }

  randomSpot(a, near, radius) {
    const m = this.map, half = m.N / 2;
    for (let t = 0; t < 40; t++) {
      let x, z;
      if (near) { x = near.x + rand(-radius, radius); z = near.z + rand(-radius, radius); }
      else if (a.zone === 'out') {
        const side = (Math.random() * 4) | 0, d = half + rand(1.2, 8), u = rand(-half - 6, half + 6);
        x = side < 2 ? (side ? d : -d) : u; z = side < 2 ? u : (side === 2 ? d : -d);
      } else { x = rand(-half + 1, half - 1); z = rand(-half + 1, half - 1); }
      if (a.cfg.move === 'swim' ? this.canSwim(x, z) : this.canStand(a, x, z)) return new THREE.Vector3(x, 0, z);
    }
    return null;
  }

  spawn(kind) {
    const cfg = KINDS[kind];
    if (!cfg) return;
    const parts = cfg.build();
    const a = { kind, cfg, ...parts, pos: new THREE.Vector3(), heading: rand(PI * 2), state: 'idle', timer: rand(0, 3), phase: rand(10), speedMul: 1 };
    a.group.scale.setScalar(cfg.scale ?? 1);
    if (cfg.move === 'fly') {
      const half = this.map.N / 2;
      a.center = new THREE.Vector3(rand(-half, half), 0, rand(-half, half));
      a.centerTarget = a.center.clone();
      a.radius = rand(...cfg.r); a.height = rand(...cfg.h); a.ang = rand(PI * 2); a.dir = Math.random() < .5 ? 1 : -1;
    } else if (cfg.move === 'flutter') {
      const half = this.map.N / 2;
      a.pos.set(rand(-half + 2, half - 2), 0, rand(-half + 2, half - 2));
      a.target = a.pos.clone(); a.height = rand(.5, 1.3);
    } else if (cfg.move === 'jump') {
      a.group.visible = false; a.timer = rand(2, 8);
    } else {
      a.zone = cfg.move === 'swim' ? 'water' : (Math.random() < .72 ? 'in' : 'out');
      const p = this.randomSpot(a);
      if (!p) return;
      a.pos.copy(p);
    }
    this.group.add(a.group);
    this.list.push(a);
  }

  update(dt, T, snake, focus) {
    const m = this.map;
    for (const a of this.list) {
      const c = a.cfg;
      a.phase += dt;
      if (c.move === 'fly') this.fly(a, dt, T);
      else if (c.move === 'flutter') this.flutter(a, dt, T, snake);
      else if (c.move === 'jump') this.jump(a, dt, focus);
      else this.walk(a, dt, T, snake);
      if (c.move !== 'fly' && c.move !== 'jump' && c.move !== 'flutter') {
        const y = c.move === 'swim' ? WATER_Y + Math.sin(T * 2 + a.phase) * .02 : m.groundAt(a.pos.x, a.pos.z);
        a.group.position.set(a.pos.x, y + (a.hopY || 0), a.pos.z);
        a.group.rotation.y = a.heading + (c.sideways ? PI / 2 : 0);
      }
    }
  }

  walk(a, dt, T, snake) {
    const c = a.cfg;
    // flee from the snake
    if (snake) {
      const dx = a.pos.x - snake.x, dz = a.pos.z - snake.z, d = Math.hypot(dx, dz);
      if (d < (c.flee ?? 2.8) && !(a.fleeT > 0)) {
        const away = new THREE.Vector3(dx / (d || 1), 0, dz / (d || 1));
        const tgt = a.pos.clone().addScaledVector(away, 4).add(new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1)));
        if (c.move === 'swim' ? this.canSwim(tgt.x, tgt.z) : this.canStand(a, tgt.x, tgt.z)) { a.target = tgt; a.state = 'move'; a.speedMul = 2.2; a.fleeT = 1.4; }
      }
    }
    if (a.fleeT > 0) a.fleeT -= dt;
    let moving = false;
    if (a.state === 'idle') {
      a.timer -= dt;
      if (a.timer <= 0) {
        const t = this.randomSpot(a, a.pos, c.move === 'swim' ? 5 : 6);
        if (t) { a.target = t; a.state = 'move'; a.speedMul = 1; } else a.timer = 1;
      }
    } else {
      const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z, d = Math.hypot(dx, dz);
      if (d < .15) { a.state = 'idle'; a.timer = rand(...(c.idle || [.8, 3])); }
      else {
        const want = Math.atan2(dx, dz);
        let diff = want - a.heading; while (diff > PI) diff -= PI * 2; while (diff < -PI) diff += PI * 2;
        a.heading += diff * Math.min(1, dt * 8);
        const sp = c.speed * a.speedMul * dt;
        const nx = a.pos.x + dx / d * sp, nz = a.pos.z + dz / d * sp;
        const ok = c.move === 'swim' ? this.canSwim(nx, nz) : this.canStand(a, nx, nz);
        if (ok) { a.pos.x = nx; a.pos.z = nz; moving = true; }
        else { a.state = 'idle'; a.timer = rand(.3, 1); }
      }
    }
    // animation
    const rate = c.rate || 7;
    a.walkT = (a.walkT || 0) + dt * (moving ? rate * Math.min(2, a.speedMul) : 0);
    const s = Math.sin(a.walkT);
    if (c.move === 'hop') {
      a.hopY = moving ? Math.abs(Math.sin(a.walkT * .5)) * c.hop : 0;
      if (a.body) a.body.rotation.x = moving ? -Math.cos(a.walkT * .5) * .18 : 0;
      a.legs.forEach((l, i) => l.rotation.x = moving ? Math.cos(a.walkT * .5) * .6 * (i < 2 && a.upright ? -1.4 : 1) : 0);
      if (a.upright && !moving) { // monkey idle: scratch / wave
        const w = Math.sin(T * 3 + a.phase);
        a.legs[1].rotation.x = w > .6 ? -2.4 : 0;
        if (a.head) a.head.rotation.y = Math.sin(T * .8 + a.phase) * .6;
      }
    } else if (c.move === 'walk') {
      a.hopY = moving ? Math.abs(s) * .025 : 0;
      if (a.paddle) a.legs.forEach((l, i) => l.rotation.y = moving ? Math.sin(a.walkT + i * 1.6) * .5 : 0);
      else if (a.flippers) { a.legs.forEach((l, i) => l.rotation.z = (i ? 1 : -1) * (.2 + (moving ? Math.abs(s) * .3 : 0))); }
      else a.legs.forEach((l, i) => l.rotation.x = moving ? s * .55 * ((i === 0 || i === 3) ? 1 : -1) : 0);
      if (a.waddle && a.body) a.body.rotation.z = moving ? s * .16 : 0;
      if (a.peck && a.head) a.head.position.z = .1 + (moving ? Math.sin(a.walkT * 2) * .03 : (Math.sin(T * 4 + a.phase) > .7 ? .05 : 0));
      if (a.peck && a.head) a.head.rotation.x = !moving && Math.sin(T * 4 + a.phase) > .7 ? .9 : 0;
      if (a.tail) a.tail.rotation.y = Math.sin(T * (a.kind === 'dog' ? 14 : 3) + a.phase) * .4;
      if (a.head && !a.peck) a.head.rotation.y = !moving ? Math.sin(T * .7 + a.phase) * .4 : 0;
    } else if (c.move === 'swim') {
      a.hopY = 0;
      if (a.body) a.body.rotation.z = Math.sin(T * 2 + a.phase) * .05;
      if (a.head) a.head.rotation.x = Math.sin(T * 1.5 + a.phase) > .9 ? .8 : 0;
      if (moving && Math.random() < dt * 4) this.particles.emit(a.pos.x, WATER_Y + .02, a.pos.z, 1, { color: 0xffffff, speed: .3, up: .2, gravity: 0, life: .7, size: .6, floor: WATER_Y - 1 });
    }
    if (a.ears) a.ears.forEach((e, i) => e.rotation.x = Math.sin(T * 2 + a.phase + i) * .1);
  }

  fly(a, dt, T) {
    const c = a.cfg, half = this.map.N / 2;
    if (a.center.distanceTo(a.centerTarget) < .5) a.centerTarget.set(rand(-half, half), 0, rand(-half, half));
    a.center.lerp(a.centerTarget, dt * .05);
    let w = c.w;
    if (c.erratic) { w *= 1 + Math.sin(T * 1.3 + a.phase * 3) * .6; a.radius += Math.sin(T * 2 + a.phase) * dt * 2; a.radius = Math.max(1.5, Math.min(6, a.radius)); }
    a.ang += w * a.dir * dt;
    const x = a.center.x + Math.cos(a.ang) * a.radius, z = a.center.z + Math.sin(a.ang) * a.radius;
    const ground = Math.max(this.map.heightAt(x, z), WATER_Y);
    const y = ground + a.height + Math.sin(T * (c.erratic ? 3 : .8) + a.phase) * (c.erratic ? .5 : .4);
    a.group.position.set(x, y, z);
    a.group.rotation.set(0, -a.ang + (a.dir > 0 ? PI : 0), -a.dir * .35);
    const glide = c.glide || Math.sin(T * .5 + a.phase) > .55;
    const flap = glide ? Math.sin(T * 2 + a.phase) * .08 + .05 : Math.sin(T * (c.erratic ? 22 : 13) + a.phase) * .7;
    a.wings[0].rotation.z = flap; a.wings[1].rotation.z = -flap;
  }

  flutter(a, dt, T, snake) {
    const half = this.map.N / 2;
    if (a.pos.distanceTo(a.target) < .3 || Math.random() < dt * .15) {
      a.target.set(Math.max(-half, Math.min(half, a.pos.x + rand(-4, 4))), 0, Math.max(-half, Math.min(half, a.pos.z + rand(-4, 4))));
    }
    if (snake && Math.hypot(a.pos.x - snake.x, a.pos.z - snake.z) < 1.8) a.target.set(a.pos.x + (a.pos.x - snake.x) * 2, 0, a.pos.z + (a.pos.z - snake.z) * 2);
    const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z, d = Math.hypot(dx, dz) || 1;
    a.pos.x += dx / d * a.cfg.speed * dt; a.pos.z += dz / d * a.cfg.speed * dt;
    const y = this.map.groundAt(a.pos.x, a.pos.z) + a.height + Math.sin(T * 3 + a.phase) * .25;
    a.group.position.set(a.pos.x, y, a.pos.z);
    a.group.rotation.y = Math.atan2(dx, dz);
    const f = Math.sin(T * 26 + a.phase) * 1.1;
    a.wings[0].rotation.z = f; a.wings[1].rotation.z = -f;
  }

  jump(a, dt, focus) {
    if (!a.jumping) {
      a.timer -= dt;
      if (a.timer > 0) return;
      for (let t = 0; t < 20; t++) {
        const x = focus.x + rand(-12, 12), z = focus.z + rand(-10, 10);
        if (this.map.riverSigned(x, z) < -.7) {
          a.jumping = true; a.jt = 0; a.from = new THREE.Vector3(x, 0, z);
          const ang = rand(PI * 2); a.dirv = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
          a.group.visible = true;
          this.particles.emit(x, WATER_Y + .05, z, 8, { color: 0xdff4ff, speed: 1.2, up: 1.5, life: .5, size: .7, floor: WATER_Y - 1 });
          break;
        }
      }
      if (!a.jumping) a.timer = 1;
      return;
    }
    a.jt += dt / .85;
    const t = Math.min(1, a.jt);
    const x = a.from.x + a.dirv.x * 1.4 * t, z = a.from.z + a.dirv.z * 1.4 * t;
    a.group.position.set(x, WATER_Y + Math.sin(t * PI) * .9, z);
    a.group.rotation.set(-(Math.cos(t * PI)) * 1.1, Math.atan2(a.dirv.x, a.dirv.z), 0, 'YXZ');
    if (t >= 1) {
      a.jumping = false; a.group.visible = false; a.timer = rand(3, 9);
      this.particles.emit(x, WATER_Y + .05, z, 10, { color: 0xdff4ff, speed: 1.4, up: 1.6, life: .5, size: .7, floor: WATER_Y - 1 });
    }
  }
}
