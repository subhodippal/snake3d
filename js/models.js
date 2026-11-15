// ───────────────────────────────────────────────────────────
//  Procedural 3D models (no external assets)
// ───────────────────────────────────────────────────────────
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FRUITS } from './levels.js';

const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _c = new THREE.Color();
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

/** Transformed, vertex-colored, non-indexed geometry part. */
export function P(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  _m.compose(V(pos), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2])), V(scl));
  g.applyMatrix4(_m);
  _c.set(color);
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
export const merge = parts => { const g = mergeGeometries(parts.filter(Boolean)); parts.forEach(p => p && p.dispose()); return g; };

export const Cyl = (a, b, h, s = 10) => new THREE.CylinderGeometry(a, b, h, s);
export const Sph = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
export const Ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
export const Box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
export const Cone = (r, h, s = 10) => new THREE.ConeGeometry(r, h, s);
const Dod = (r, d = 0) => new THREE.DodecahedronGeometry(r, d);
const Oct = r => new THREE.OctahedronGeometry(r);
const Tor = (r, t, rs = 6, ts = 16, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const PI = Math.PI;

// ── Obstacles & props ───────────────────────────────────────
// All geometries sit on y = 0; multi-cell props are laid out along +x.
const BUILD = {
  tree: () => merge([
    P(Cyl(.1, .16, 1.0, 8), 0x7a4b2a, [0, .5, 0]),
    P(Ico(.55, 1), 0x3f9a3a, [0, 1.35, 0]), P(Ico(.42, 1), 0x52b348, [.26, 1.62, .1]), P(Ico(.38, 1), 0x3a8e34, [-.22, 1.55, -.16]),
  ]),
  bush: () => merge([
    P(Ico(.42), 0x3f9e3a, [0, .32, 0], [0, 0, 0], [1, .8, 1]),
    P(Ico(.3), 0x56b84a, [.22, .45, .12]), P(Ico(.26), 0x4aa83f, [-.2, .4, -.15]),
  ]),
  flowerBush: () => {
    const parts = [P(Ico(.4), 0x3f9e3a, [0, .3, 0], [0, 0, 0], [1, .8, 1]), P(Ico(.28), 0x4fae42, [.2, .44, .1])];
    const cols = [0xff5a8a, 0xffe14a, 0xffffff, 0xff8a3a];
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, r = .25 + (i % 3) * .06;
      parts.push(P(Sph(.06, 6, 4), cols[i % 4], [Math.cos(a) * r, .45 + (i % 2) * .15, Math.sin(a) * r]));
    }
    return merge(parts);
  },
  rock: () => merge([
    P(Dod(.38), 0x8e8e8a, [0, .2, 0], [.3, .5, 0], [1.15, .7, 1]),
    P(Dod(.18), 0x7a7a76, [.32, .08, .22], [0, 1, 0]),
  ]),
  boulder: () => merge([
    P(Dod(.82), 0x8a8a84, [0, .5, 0], [.2, .4, .1], [1.25, .75, 1.05]),
    P(Dod(.45), 0x7a7a74, [.7, .25, .45], [0, .8, 0]),
    P(Dod(.38), 0x9a9a92, [-.7, .2, -.35], [.5, 0, 0]),
    P(Ico(.25, 0), 0x5a8a3a, [-.1, 1.02, .1], [0, 0, 0], [1.4, .3, 1.2]),
  ]),
  log: () => merge([
    P(Cyl(.22, .22, 1.9, 10), 0x7a4b2a, [0, .22, 0], [0, 0, PI / 2]),
    P(Cyl(.2, .2, .03, 10), 0xc8a070, [.96, .22, 0], [0, 0, PI / 2]),
    P(Cyl(.2, .2, .03, 10), 0xc8a070, [-.96, .22, 0], [0, 0, PI / 2]),
    P(Sph(.06, 6, 4), 0xe85a4a, [.3, .45, .05]), P(Ico(.12, 0), 0x4a9a3a, [-.4, .4, .1], [0, 0, 0], [1.5, .5, 1]),
  ]),
  jungleTree: () => merge([
    P(Cyl(.13, .2, 2.3, 8), 0x5a3a22, [0, 1.15, 0]),
    P(Cone(.13, .55, 5), 0x5a3a22, [.18, .22, 0], [0, 0, -.6]), P(Cone(.13, .55, 5), 0x5a3a22, [-.12, .22, .15], [.5, 0, .5]),
    P(Cone(.13, .55, 5), 0x5a3a22, [-.05, .22, -.18], [-.6, 0, 0]),
    P(Ico(.85, 1), 0x2a7a2a, [0, 2.45, 0], [0, 0, 0], [1, .55, 1]),
    P(Ico(.6, 1), 0x3a9234, [.5, 2.7, .25], [0, 0, 0], [1, .6, 1]),
    P(Ico(.55, 1), 0x226a24, [-.45, 2.6, -.3], [0, 0, 0], [1, .6, 1]),
    P(Cyl(.018, .018, 1.1, 4), 0x3a8a2a, [.55, 1.85, .32]), P(Cyl(.018, .018, .9, 4), 0x3a8a2a, [-.5, 1.95, -.25]),
    P(Cyl(.018, .018, .7, 4), 0x3a8a2a, [.1, 2.0, -.6]),
  ]),
  bamboo: () => {
    const parts = [];
    const spots = [[0, 0, 2.2], [.22, .1, 1.8], [-.18, .16, 2.5], [.05, -.22, 1.6], [-.2, -.12, 2.0]];
    for (const [x, z, h] of spots) {
      parts.push(P(Cyl(.05, .06, h, 7), 0x8ab84a, [x, h / 2, z]));
      for (let y = .35; y < h; y += .42) parts.push(P(Cyl(.064, .064, .035, 7), 0x6a9a34, [x, y, z]));
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1 + x * 9;
        parts.push(P(Sph(.2, 6, 4), 0x5aa83a, [x + Math.cos(a) * .18, h - .05 - k * .2, z + Math.sin(a) * .18], [0, -a, .5], [1, .08, .3]));
      }
    }
    return merge(parts);
  },
  palm: () => {
    const parts = [
      P(Cyl(.09, .14, 1.9, 8), 0xa8783f, [.08, .95, 0], [0, 0, -.08]),
      P(Sph(.1, 8, 6), 0x6b4423, [.2, 1.82, .07]), P(Sph(.1, 8, 6), 0x6b4423, [.06, 1.82, -.09]),
    ];
    for (let y = .3; y < 1.8; y += .3) parts.push(P(Cyl(.15, .12, .05, 8), 0x8a6232, [.08 + y * .04, y, 0]));
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * PI * 2;
      parts.push(P(Sph(.6, 10, 6), k % 2 ? 0x2fa84a : 0x3cbc58, [Math.cos(a) * .5 + .15, 1.86, -Math.sin(a) * .5], [0, a, -.4], [1, .07, .28]));
    }
    return merge(parts);
  },
  cactus: () => merge([
    P(Cyl(.2, .24, 1.3, 10), 0x3c9a4a, [0, .65, 0]), P(Sph(.2), 0x3c9a4a, [0, 1.3, 0]),
    P(Cyl(.09, .09, .35, 8), 0x46a854, [.26, .6, 0], [0, 0, PI / 2]),
    P(Cyl(.1, .1, .45, 8), 0x46a854, [.42, .8, 0]), P(Sph(.1), 0x46a854, [.42, 1.03, 0]),
    P(Cyl(.09, .09, .3, 8), 0x46a854, [-.25, .45, 0], [0, 0, PI / 2]),
    P(Cyl(.09, .09, .35, 8), 0x46a854, [-.38, .6, 0]), P(Sph(.09), 0x46a854, [-.38, .78, 0]),
    P(Sph(.09), 0xff5ca8, [0, 1.5, 0]),
  ]),
  sandcastle: () => {
    const s = 0xe8c87a, d = 0xd4b064;
    const parts = [P(Box(.8, .3, .8), s, [0, .15, 0]), P(Cyl(.16, .2, .6, 8), d, [0, .6, 0]), P(Cone(.18, .25, 8), s, [0, 1.02, 0]),
      P(Cyl(.008, .008, .3, 3), 0x666666, [0, 1.25, 0]), P(Box(.14, .08, .01), 0xff3a3a, [.07, 1.35, 0])];
    for (const [x, z] of [[.32, .32], [-.32, .32], [.32, -.32], [-.32, -.32]]) parts.push(P(Cyl(.1, .12, .45, 8), d, [x, .3, z]), P(Cone(.12, .18, 8), s, [x, .62, z]));
    return merge(parts);
  },
  umbrella: () => merge([
    P(Cyl(.025, .025, 1.6, 6), 0xeeeeee, [0, .8, 0]),
    P(Cone(.85, .35, 10), 0xffffff, [0, 1.68, 0]), P(Sph(.05, 6, 4), 0xffffff, [0, 1.88, 0]),
    P(Box(.5, .02, .9), 0xffffff, [.4, .01, .2], [0, .3, 0]),
  ]),
  pine: () => merge([
    P(Cyl(.1, .14, .6, 8), 0x6b4423, [0, .3, 0]),
    P(Cone(.62, 1.0, 9), 0x2e6b3a, [0, .95, 0]), P(Cone(.48, .85, 9), 0x357a42, [0, 1.45, 0]), P(Cone(.3, .6, 9), 0x3e8a4a, [0, 1.9, 0]),
  ]),
  snowPine: () => merge([
    P(Cyl(.1, .14, .6, 8), 0x6b4423, [0, .3, 0]),
    P(Cone(.62, 1.0, 9), 0x2e5e4a, [0, .95, 0]), P(Cone(.5, .35, 9), 0xf4faff, [0, 1.2, 0]),
    P(Cone(.48, .85, 9), 0x356a52, [0, 1.45, 0]), P(Cone(.38, .3, 9), 0xf4faff, [0, 1.67, 0]),
    P(Cone(.3, .6, 9), 0x3e7a5a, [0, 1.9, 0]), P(Cone(.18, .3, 9), 0xffffff, [0, 2.08, 0]),
  ]),
  stump: () => merge([
    P(Cyl(.26, .32, .38, 10), 0x6b4423, [0, .19, 0]), P(Cyl(.25, .25, .02, 10), 0xc8a070, [0, .385, 0]),
    P(Cyl(.02, .03, .1, 5), 0xf0e0c0, [.2, .45, .1]), P(Sph(.06, 8, 5), 0xe83a3a, [.2, .5, .1], [0, 0, 0], [1, .5, 1]),
  ]),
  hay: () => merge([
    P(Cyl(.38, .38, .75, 14), 0xe6c45a, [0, .38, 0], [0, 0, PI / 2]),
    P(Cyl(.39, .39, .05, 14), 0xc8a040, [.2, .38, 0], [0, 0, PI / 2]), P(Cyl(.39, .39, .05, 14), 0xc8a040, [-.2, .38, 0], [0, 0, PI / 2]),
    P(Cyl(.3, .3, .01, 14), 0xd4b04a, [.38, .38, 0], [0, 0, PI / 2]),
  ]),
  snowman: () => merge([
    P(Sph(.38, 14, 10), 0xffffff, [0, .36, 0]), P(Sph(.28, 14, 10), 0xffffff, [0, .86, 0]), P(Sph(.2, 12, 8), 0xffffff, [0, 1.26, 0]),
    P(Cone(.045, .22, 6), 0xff7a1a, [0, 1.25, .28], [PI / 2, 0, 0]),
    P(Sph(.03, 6, 4), 0x111111, [.07, 1.33, .17]), P(Sph(.03, 6, 4), 0x111111, [-.07, 1.33, .17]),
    P(Sph(.03, 6, 4), 0x111111, [0, .95, .27]), P(Sph(.03, 6, 4), 0x111111, [0, .82, .28]),
    P(Cyl(.15, .15, .24, 10), 0x222222, [0, 1.55, 0]), P(Cyl(.23, .23, .03, 12), 0x222222, [0, 1.43, 0]),
    P(Tor(.2, .05, 6, 14), 0xe83a3a, [0, 1.07, 0], [PI / 2, 0, 0]),
    P(Cyl(.02, .015, .5, 4), 0x6b4423, [.38, .95, 0], [0, 0, -1.0]), P(Cyl(.02, .015, .5, 4), 0x6b4423, [-.38, .95, 0], [0, 0, 1.0]),
  ]),
  iceRock: () => merge([
    P(Oct(.33), 0xa8dcff, [0, .55, 0], [0, 0, 0], [1, 1.7, 1]),
    P(Oct(.22), 0xd8f2ff, [.25, .32, .1], [0, 0, .5], [1, 1.6, 1]),
    P(Oct(.2), 0x88c8f0, [-.22, .28, -.1], [0, 0, -.6], [1, 1.5, 1]),
    P(Sph(.32, 8, 6), 0xffffff, [0, .02, 0], [0, 0, 0], [1.3, .25, 1.3]),
  ]),
  house: () => merge([
    P(Box(2.3, 1.4, 2.1), 0xffffff, [0, .7, 0]),
    P(Cone(1.85, 1.05, 4), 0xc85a4a, [0, 1.92, 0], [0, PI / 4, 0], [1.08, 1, 1]),
    P(Box(.5, .85, .06), 0x7a4b2a, [0, .43, 1.06]), P(Sph(.03, 6, 4), 0xffd24a, [.15, .45, 1.1]),
    P(Box(.45, .42, .05), 0x8ad0ff, [-.7, .9, 1.06]), P(Box(.45, .42, .05), 0x8ad0ff, [.7, .9, 1.06]),
    P(Box(.05, .42, .45), 0x8ad0ff, [1.16, .9, 0]), P(Box(.05, .42, .45), 0x8ad0ff, [-1.16, .9, 0]),
    P(Box(.26, .6, .26), 0x8a6a5a, [.6, 2.2, -.35]),
    P(Box(2.4, .08, 2.2), 0xd8d0c0, [0, .04, 0]),
  ]),
  car: () => merge([
    P(Box(1.7, .42, .82), 0xffffff, [0, .4, 0]),
    P(Box(.95, .36, .74), 0xffffff, [-.1, .78, 0]),
    P(Box(.84, .24, .76), 0x2a3a5a, [-.1, .8, 0]), P(Box(.97, .24, .62), 0x2a3a5a, [-.1, .8, 0]),
    ...[[.55, .4], [-.55, .4], [.55, -.4], [-.55, -.4]].map(([x, z]) => P(Cyl(.19, .19, .14, 12), 0x1a1a1a, [x, .19, z], [PI / 2, 0, 0])),
    P(Box(.04, .1, .16), 0xfff2a0, [.86, .45, .26]), P(Box(.04, .1, .16), 0xfff2a0, [.86, .45, -.26]),
    P(Box(.04, .1, .16), 0xff3a3a, [-.86, .45, .26]), P(Box(.04, .1, .16), 0xff3a3a, [-.86, .45, -.26]),
  ]),
  cone: () => merge([
    P(Cone(.17, .55, 10), 0xff6a1a, [0, .32, 0]), P(Cyl(.105, .125, .08, 10), 0xffffff, [0, .36, 0]),
    P(Box(.4, .05, .4), 0xe0501a, [0, .025, 0]),
  ]),
  mailbox: () => merge([
    P(Box(.08, .8, .08), 0x7a4b2a, [0, .4, 0]),
    P(Box(.28, .24, .42), 0x3a6ad0, [0, .9, 0]), P(Cyl(.14, .14, .42, 10, 1), 0x3a6ad0, [0, 1.02, 0], [PI / 2, 0, 0]),
    P(Box(.02, .2, .06), 0xff3a3a, [.16, 1.05, -.1]),
  ]),
  swing: () => {
    const parts = [];
    for (const x of [-1.3, 1.3]) for (const s of [-1, 1]) parts.push(P(Cyl(.05, .05, 2.05, 6), 0xe84a4a, [x, 1.0, s * .26], [s * .26, 0, 0]));
    parts.push(P(Cyl(.055, .055, 2.75, 8), 0x3a6ad0, [0, 1.98, 0], [0, 0, PI / 2]));
    for (const x of [-.55, .55]) {
      parts.push(P(Box(.42, .05, .24), 0xffd24a, [x, .5, 0]));
      parts.push(P(Cyl(.012, .012, 1.48, 4), 0x9a9a9a, [x - .18, 1.24, 0]), P(Cyl(.012, .012, 1.48, 4), 0x9a9a9a, [x + .18, 1.24, 0]));
    }
    return merge(parts);
  },
  slide: () => {
    const parts = [];
    for (const z of [-.25, .25]) parts.push(P(Cyl(.035, .035, 1.6, 6), 0x3a6ad0, [-1.2, .8, z]));
    for (let y = .3; y < 1.5; y += .3) parts.push(P(Cyl(.02, .02, .5, 4), 0xdddddd, [-1.2, y, 0], [PI / 2, 0, 0]));
    parts.push(P(Box(.5, .06, .6), 0x3a6ad0, [-.98, 1.52, 0]));
    parts.push(P(Box(2.1, .05, .56), 0xffc12a, [.18, .84, 0], [0, 0, -.66]));
    for (const z of [-.29, .29]) parts.push(P(Box(2.1, .14, .04), 0xff5a3a, [.18, .9, z], [0, 0, -.66]));
    parts.push(P(Cyl(.035, .035, 1.5, 6), 0x3a6ad0, [-.75, .75, .25]), P(Cyl(.035, .035, 1.5, 6), 0x3a6ad0, [-.75, .75, -.25]));
    return merge(parts);
  },
  seesaw: () => merge([
    P(Cyl(.18, .26, .42, 3), 0xe84a4a, [0, .21, 0], [0, 0, 0], [1, 1, .9]),
    P(Box(2.8, .08, .3), 0xffc12a, [0, .48, 0], [0, 0, .14]),
    P(Cyl(.025, .025, .3, 4), 0x3a6ad0, [1.05, .78, 0], [PI / 2, 0, 0]), P(Cyl(.025, .025, .3, 4), 0x3a6ad0, [-1.05, .46, 0], [PI / 2, 0, 0]),
    P(Cyl(.02, .02, .25, 4), 0x3a6ad0, [1.05, .66, 0]), P(Cyl(.02, .02, .25, 4), 0x3a6ad0, [-1.05, .34, 0]),
  ]),
  carousel: () => {
    const parts = [P(Cyl(.95, .95, .12, 20), 0xffffff, [0, .2, 0]), P(Cyl(.98, .98, .05, 20), 0xffc12a, [0, .28, 0]),
      P(Cyl(.08, .08, 1.3, 8), 0xdddddd, [0, .85, 0]), P(Cone(.9, .4, 12), 0xffffff, [0, 1.55, 0]),
      P(Cyl(.2, .2, .14, 10), 0x666666, [0, .07, 0])];
    for (let k = 0; k < 4; k++) {
      const a = k * PI / 2;
      parts.push(P(Cyl(.025, .025, 1.15, 5), 0xe84a4a, [Math.cos(a) * .72, .85, Math.sin(a) * .72]));
    }
    return merge(parts);
  },
  bench: () => merge([
    P(Box(1.6, .06, .42), 0xb07a42, [0, .45, .02]), P(Box(1.6, .3, .05), 0xb07a42, [0, .72, -.2], [-.1, 0, 0]),
    P(Box(.07, .45, .42), 0x3a3a3a, [.7, .22, 0]), P(Box(.07, .45, .42), 0x3a3a3a, [-.7, .22, 0]),
    P(Box(.07, .35, .05), 0x3a3a3a, [.7, .6, -.2]), P(Box(.07, .35, .05), 0x3a3a3a, [-.7, .6, -.2]),
  ]),
  ball: () => merge([P(Sph(.3, 16, 12), 0xffffff, [0, .3, 0]), P(Tor(.3, .035, 6, 20), 0xf0f0f0, [0, .3, 0], [.4, 0, .2])]),
  stalagmite: () => merge([
    P(Cone(.32, 1.5, 7), 0x6a5a4a, [0, .75, 0]), P(Cone(.2, .85, 6), 0x7a6a58, [.26, .42, .15], [0, 0, -.15]),
    P(Cone(.15, .6, 6), 0x5a4c3e, [-.22, .3, -.18], [.15, 0, .1]), P(Dod(.2), 0x4a4038, [.05, .05, .3]),
  ]),
  crystal: () => merge([
    P(Oct(.33), 0x9f7bff, [0, .72, 0], [0, 0, 0], [1, 2.2, 1]),
    P(Oct(.22), 0x5fe0ff, [.25, .42, .1], [0, 0, .5], [1, 2, 1]),
    P(Oct(.2), 0xe07bff, [-.22, .36, -.1], [0, 0, -.6], [1, 1.8, 1]),
    P(Dod(.25), 0x3a3040, [0, .05, 0], [0, 0, 0], [1.3, .4, 1.3]),
  ]),
  torch: () => merge([
    P(Cyl(.05, .07, 1.25, 7), 0x4a3020, [0, .62, 0]),
    P(Cyl(.075, .075, .06, 7), 0x8a6a3a, [0, .95, 0]), P(Cyl(.075, .075, .06, 7), 0x8a6a3a, [0, .45, 0]),
    P(Cyl(.17, .07, .2, 10), 0x2a2a2e, [0, 1.3, 0]), P(Tor(.16, .02, 4, 12), 0x5a5a60, [0, 1.4, 0], [PI / 2, 0, 0]),
    P(Dod(.14), 0x5a5048, [.12, .06, .06]), P(Dod(.12), 0x4a4038, [-.1, .05, -.08]), P(Dod(.11), 0x5a5048, [-.04, .05, .14]),
  ]),
  barrel: () => merge([
    P(Cyl(.28, .26, .66, 12), 0x8a5a30, [0, .33, 0]), P(Cyl(.285, .285, .04, 12), 0x3a3a3a, [0, .14, 0]),
    P(Cyl(.29, .29, .04, 12), 0x3a3a3a, [0, .52, 0]), P(Cyl(.25, .25, .02, 12), 0x6a4020, [0, .665, 0]),
  ]),
  pillar: () => merge([
    P(Box(.78, .2, .78), 0x8a8a90, [0, .1, 0]), P(Cyl(.27, .3, 1.8, 10), 0xa0a0a6, [0, 1.1, 0]),
    P(Box(.72, .16, .72), 0x8a8a90, [0, 2.07, 0]), P(Ico(.2, 0), 0x3a6a32, [.2, .25, .25], [0, 0, 0], [1.5, .5, 1]),
    P(Ico(.15, 0), 0x3a6a32, [-.1, 2.18, -.1], [0, 0, 0], [1.6, .4, 1.4]),
  ]),
  ruinWall: () => {
    const parts = [];
    for (let row = 0; row < 3; row++) for (let k = 0; k < 3; k++) {
      if ((row === 2 && k === 2) || (row === 1 && k === 0 && Math.random() < .5)) continue;
      parts.push(P(Box(.58, .34, .44), row % 2 ? 0x96969c : 0x8a8a90, [-.62 + k * .62 + (row % 2) * .15, .17 + row * .35, 0], [0, (k - 1) * .05, 0]));
    }
    parts.push(P(Ico(.18, 0), 0x3a6a32, [.1, 1.05, 0], [0, 0, 0], [2, .4, 1.4]));
    return merge(parts);
  },
  statue: () => merge([
    P(Box(.72, .42, .72), 0x7a7a80, [0, .21, 0]), P(Box(.6, .08, .6), 0x8a8a90, [0, .46, 0]),
    P(Cyl(.18, .26, .9, 8), 0x9a9aa0, [0, .95, 0]), P(Sph(.18, 10, 8), 0x9a9aa0, [0, 1.55, 0]),
    P(Cyl(.06, .05, .55, 6), 0x9a9aa0, [.25, 1.15, .05], [0, 0, .5]), P(Cyl(.06, .05, .55, 6), 0x9a9aa0, [-.25, 1.15, .05], [0, 0, -.5]),
    P(Cone(.12, .25, 4), 0xc8a84a, [0, 1.78, 0]), P(Ico(.18, 0), 0x3a6a32, [.2, .45, .2], [0, 0, 0], [1.4, .4, 1.4]),
  ]),
  lamp: () => merge([
    P(Cyl(.08, .1, .18, 8), 0x2a2a30, [0, .09, 0]),
    P(Cyl(.045, .055, 2.4, 7), 0x3a3a42, [0, 1.2, 0]),
    P(Box(.5, .04, .04), 0x3a3a42, [.22, 2.36, 0]),
    P(Cone(.16, .14, 8), 0x2a2a30, [.44, 2.3, 0]),
  ]),
  // non-obstacle props
  fenceTorch: () => merge([
    P(Cyl(.06, .075, 1.75, 7), 0xb8a050, [0, .87, 0]),
    P(Cyl(.08, .08, .04, 7), 0x8a7a38, [0, .5, 0]), P(Cyl(.08, .08, .04, 7), 0x8a7a38, [0, 1.1, 0]),
    P(Cyl(.17, .07, .2, 10), 0x2a2a2e, [0, 1.8, 0]),
  ]),
  windmill: () => {
    const parts = [P(Cyl(.5, .9, 4, 8), 0xf0e8d8, [0, 2, 0]), P(Cone(.7, .9, 8), 0xa84a3a, [0, 4.4, 0])];
    for (let k = 0; k < 4; k++) parts.push(P(Box(.3, 2.4, .05), 0xd8c8a8, [Math.cos(k * PI / 2) * 1.2, 3.6 + Math.sin(k * PI / 2) * 1.2, .85], [0, 0, k * PI / 2 + PI / 2]));
    return merge(parts);
  },
};

// material tweaks per kind
const KIND_MAT = {
  crystal: { emissive: 0x6a3ad0, emissiveIntensity: .55, roughness: .2, metalness: .1 },
  iceRock: { roughness: .15, metalness: .05, transparent: true, opacity: .92 },
  car: { roughness: .35, metalness: .25 },
  ball: { roughness: .4 },
};
const geoCache = {};
export function obstacleGeometry(kind) {
  if (!geoCache[kind]) { geoCache[kind] = (BUILD[kind] || BUILD.rock)(); geoCache[kind].userData.shared = true; }
  return geoCache[kind];
}
export function obstacleMaterial(kind) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .75, ...(KIND_MAT[kind] || {}) });
  return m;
}
// local light-source offsets for props with flames / bulbs
export const LIGHT_OFFSET = { torch: [0, 1.48, 0], lamp: [.44, 2.18, 0], fenceTorch: [0, 1.98, 0] };

// per-instance tint
const VIVID = [0xff4a5a, 0x3a8aff, 0xffc12a, 0x3ac46a, 0xff7a2a, 0xb05aff, 0x2ad0d0, 0xffffff];
const PASTEL = [0xfff0e0, 0xffe0e8, 0xe0f0ff, 0xf0ffe0, 0xfff8d0, 0xf0e8ff];
export function tintFor(kind, rnd, out) {
  if (kind === 'car' || kind === 'ball' || kind === 'umbrella' || kind === 'carousel') return out.set(VIVID[(rnd() * VIVID.length) | 0]);
  if (kind === 'house') return out.set(PASTEL[(rnd() * PASTEL.length) | 0]);
  const v = .86 + rnd() * .24;
  return out.setRGB(v, v, v);
}
export function scaleFor(kind, rnd) {
  const fixed = ['house', 'car', 'swing', 'slide', 'seesaw', 'carousel', 'bench', 'torch', 'lamp', 'mailbox', 'ruinWall', 'statue', 'cone'];
  if (fixed.includes(kind)) return [1, 1, 1];
  if (kind === 'pillar') { const h = rnd() < .35 ? .45 + rnd() * .35 : .95 + rnd() * .2; return [1, h, 1]; }
  const s = kind === 'jungleTree' ? .9 + rnd() * .4 : .82 + rnd() * .36;
  return [s, s * (.9 + rnd() * .2), s];
}

// ── Bamboo fence ────────────────────────────────────────────
export function bambooPoleGeometry() {
  return merge([
    P(Cyl(.055, .062, 1, 7), 0xc8b060, [0, .5, 0]),
    P(Cyl(.066, .066, .035, 7), 0x9a8a40, [0, .3, 0]), P(Cyl(.066, .066, .035, 7), 0x9a8a40, [0, .68, 0]),
    P(Cyl(.05, .05, .02, 7), 0xe0d090, [0, 1.0, 0]),
  ]);
}
export function bambooRailGeometry() {
  return merge([
    P(Cyl(.042, .042, 1, 6), 0xb8a050, [0, 0, 0], [0, 0, PI / 2]),
    P(Cyl(.05, .05, .03, 6), 0x8a7a38, [.45, 0, 0], [0, 0, PI / 2]),
  ]);
}

// ── Decor (walk-through) ────────────────────────────────────
const DECOR = {
  tuft: () => merge([
    P(Cone(.035, .34, 4), 0xffffff, [0, .16, 0], [0, 0, .12]), P(Cone(.03, .28, 4), 0xeeeeee, [.06, .13, .03], [.1, 0, -.35]),
    P(Cone(.03, .3, 4), 0xdddddd, [-.05, .14, -.03], [-.2, 0, .4]), P(Cone(.03, .24, 4), 0xe8e8e8, [0, .11, .07], [.4, 0, 0]),
  ]),
  flower: () => merge([P(Cyl(.008, .008, .22, 3), 0x3a8a2a, [0, .11, 0]), P(Sph(.055, 6, 4), 0xffffff, [0, .23, 0], [0, 0, 0], [1, .5, 1]), P(Sph(.022, 5, 3), 0xffd23a, [0, .255, 0])]),
  pebble: () => P(Dod(.08), 0xffffff, [0, .03, 0], [0, 0, 0], [1, .55, 1]),
  fern: () => {
    const parts = [];
    for (let k = 0; k < 6; k++) { const a = k * PI / 3; parts.push(P(Sph(.38, 6, 4), k % 2 ? 0x3a8a2a : 0x4a9a34, [Math.cos(a) * .25, .18, Math.sin(a) * .25], [0, -a, .55], [1, .05, .22])); }
    return merge(parts);
  },
  shell: () => merge([P(Cone(.07, .06, 7), 0xffe0e8, [0, .02, 0], [PI / 2.2, 0, 0], [1, 1, .5])]),
  snowClump: () => P(Sph(.2, 7, 5), 0xffffff, [0, 0, 0], [0, 0, 0], [1, .4, 1]),
  mushroom: () => merge([P(Cyl(.025, .035, .16, 5), 0xd0e0e0, [0, .08, 0]), P(new THREE.SphereGeometry(.09, 8, 5, 0, PI * 2, 0, PI / 2), 0xffffff, [0, .15, 0], [0, 0, 0], [1, .7, 1]),
    P(Cyl(.02, .025, .1, 5), 0xd0e0e0, [.1, .05, .05]), P(new THREE.SphereGeometry(.06, 8, 5, 0, PI * 2, 0, PI / 2), 0xffffff, [.1, .09, .05], [0, 0, 0], [1, .7, 1])]),
  lily: () => merge([P(Cyl(.24, .24, .02, 10), 0x3a9a3a, [0, 0, 0]), P(Sph(.05, 6, 4), 0xff9ad0, [.08, .04, .05])]),
  reed: () => merge([
    P(Cyl(.012, .015, .9, 3), 0x5a8a3a, [0, .45, 0], [0, 0, .06]), P(Cyl(.035, .035, .16, 5), 0x6a4a2a, [.03, .82, 0]),
    P(Cyl(.012, .015, .75, 3), 0x6a9a3a, [.08, .37, .04], [.1, 0, -.1]), P(Cyl(.012, .015, .7, 3), 0x5a8a3a, [-.07, .35, -.03], [-.1, 0, .15]),
  ]),
};
const decorCache = {};
export function decorGeometry(kind) {
  if (!decorCache[kind]) { decorCache[kind] = DECOR[kind](); decorCache[kind].userData.shared = true; }
  return decorCache[kind];
}

// ── Bridges ─────────────────────────────────────────────────
// Built in local space: deck spans along z (v), width along x (u).
export function bridgeGeometry(b) {
  const span = b.v1 - b.v0, vc = (b.v0 + b.v1) / 2, w = b.u1 - b.u0;
  const deck = v => b.deckBase + b.arch * (1 - ((v - b.v0) / span * 2 - 1) ** 2);
  const parts = [];
  const stone = b.style === 'stone';
  const wood = b.style === 'dark' ? [0x4a3422, 0x5a4028] : b.style === 'snow' ? [0x7a5a3a, 0x8a6a48] : [0x9a6a3a, 0x8a5c30];
  const step = stone ? .5 : .34;
  for (let v = b.v0 + step / 2; v < b.v1; v += step) {
    const y = deck(v), slope = Math.atan2(deck(v + .05) - deck(v - .05), .1);
    const lv = v - vc;
    if (stone) parts.push(P(Box(w + .3, .2, step + .02), (Math.round(v * 2) % 2) ? 0x8a8a8e : 0x7e7e84, [0, y - .1, lv], [-slope, 0, 0]));
    else {
      parts.push(P(Box(w + .25, .07, step - .05), wood[(Math.round(v * 3) & 1)], [0, y - .035, lv], [-slope, 0, 0]));
      if (b.style === 'snow') parts.push(P(Box(w * .6, .03, step - .1), 0xf4faff, [(Math.random() - .5) * .4, y + .005, lv], [-slope, 0, 0]));
    }
  }
  if (stone) {
    for (let v = b.v0 + .25; v < b.v1; v += .5) {
      const y = deck(v), slope = Math.atan2(deck(v + .05) - deck(v - .05), .1);
      for (const s of [-1, 1]) parts.push(P(Box(.18, .5, .52), 0x9a9aa0, [s * (w / 2 + .1), y + .2, v - vc], [-slope, 0, 0]));
    }
    // arches into the water
    for (const t of [.3, .7]) {
      const v = b.v0 + span * t;
      parts.push(P(Box(w + .2, 1.4, .5), 0x7a7a80, [0, deck(v) - .85, v - vc]));
    }
  } else {
    const rail = b.style === 'dark' ? 0x3a2a1a : 0x7a5228;
    const posts = Math.max(2, Math.round(span / 1.1));
    let prev = null;
    for (let k = 0; k <= posts; k++) {
      const v = b.v0 + .15 + (span - .3) * k / posts, y = deck(v);
      for (const s of [-1, 1]) {
        parts.push(P(Cyl(.055, .065, .75, 6), rail, [s * (w / 2 + .1), y + .3, v - vc]));
        if (k === 0 || k === posts) parts.push(P(Sph(.075, 6, 4), rail, [s * (w / 2 + .1), y + .7, v - vc]));
      }
      if (prev) {
        const len = Math.hypot(v - prev.v, y - prev.y), ang = Math.atan2(y - prev.y, v - prev.v), mv = (v + prev.v) / 2 - vc, my = (y + prev.y) / 2;
        for (const s of [-1, 1]) {
          parts.push(P(Box(.06, .06, len), 0xc8a060, [s * (w / 2 + .1), my + .62, mv], [-ang, 0, 0]));
          parts.push(P(Box(.04, .04, len), 0xb89050, [s * (w / 2 + .1), my + .32, mv], [-ang, 0, 0]));
        }
      }
      prev = { v, y };
    }
    // support stilts
    for (const t of [.28, .5, .72]) {
      const v = b.v0 + span * t;
      for (const s of [-1, 1]) parts.push(P(Cyl(.07, .09, 1.6, 6), rail, [s * (w / 2 - .05), deck(v) - .85, v - vc]));
      parts.push(P(Box(w + .2, .1, .12), rail, [0, deck(v) - .16, v - vc]));
    }
  }
  const g = merge(parts);
  const uc = (b.u0 + b.u1) / 2;
  if (b.riverAxis === 'x') g.translate(uc, 0, vc);
  else { g.rotateY(PI / 2); g.translate(vc, 0, uc); }
  return g;
}

// ── Torch flames ────────────────────────────────────────────
export function flameGeometry(inner) {
  return inner
    ? merge([P(Cone(.07, .26, 7), 0xffffff, [0, .12, 0]), P(Sph(.07, 7, 5), 0xffffff, [0, 0, 0])])
    : merge([P(Cone(.13, .48, 8), 0xffffff, [0, .2, 0]), P(Sph(.13, 8, 6), 0xffffff, [0, 0, 0]), P(Cone(.06, .25, 5), 0xffffff, [.06, .3, .03], [0, 0, -.3])]);
}

let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

export function noiseTexture(size = 128, lo = .82, spots = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = (lo + Math.random() * (1 - lo)) * 255;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  if (spots) for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},.06)`;
    g.beginPath(); g.arc(Math.random() * size, Math.random() * size, 2 + Math.random() * 8, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function waterTexture() {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = '#c8d8e8'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 140; i++) {
    const x = Math.random() * s, y = Math.random() * s, w = 10 + Math.random() * 40;
    g.strokeStyle = `rgba(255,255,255,${.25 + Math.random() * .4})`; g.lineWidth = 1 + Math.random() * 2;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 3, x + w, y); g.stroke();
    // wrap
    g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x - s + w / 2, y - 3, x - s + w, y); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ── Snake head ──────────────────────────────────────────────
export function makeHead() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x43c463, roughness: .3, metalness: .08 });
  const skull = new THREE.Mesh(Sph(.5, 28, 20), mat);
  skull.scale.set(1, .78, 1.15); skull.castShadow = true;
  const snout = new THREE.Mesh(Sph(.38, 24, 16), mat);
  snout.position.set(0, -.06, .36); snout.scale.set(1, .62, 1); snout.castShadow = true;
  group.add(skull, snout);

  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .2 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .1 });
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * .24, .24, .2);
    const ball = new THREE.Mesh(Sph(.155, 16, 12), white);
    const pupil = new THREE.Mesh(Sph(.085, 12, 10), black);
    pupil.position.set(s * .02, .02, .1);
    const glint = new THREE.Mesh(Sph(.03, 8, 6), white);
    glint.position.set(s * .0 + .03, .07, .17);
    eye.add(ball, pupil, glint);
    group.add(eye); eyes.push(eye);
  }
  // nostrils
  for (const s of [-1, 1]) {
    const n = new THREE.Mesh(Sph(.03, 6, 4), black);
    n.position.set(s * .1, .05, .72); group.add(n);
  }
  // forked tongue
  const tMat = new THREE.MeshStandardMaterial({ color: 0xff2a55, roughness: .4 });
  const tongue = new THREE.Group();
  tongue.position.set(0, -.12, .62);
  const t1 = new THREE.Mesh(Box(.06, .02, .38), tMat); t1.position.z = .19;
  const fl = new THREE.Mesh(Box(.035, .02, .16), tMat); fl.position.set(-.04, 0, .43); fl.rotation.y = .45;
  const fr = new THREE.Mesh(Box(.035, .02, .16), tMat); fr.position.set(.04, 0, .43); fr.rotation.y = -.45;
  tongue.add(t1, fl, fr);
  tongue.scale.z = 0.01;
  group.add(tongue);

  // fire crown (only shown with Ghost Raider Fire)
  const crown = new THREE.Group();
  const fMat = new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: .85, toneMapped: false });
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(Cone(.12, .45, 6), fMat);
    const a = (i / 6) * Math.PI * 2;
    f.position.set(Math.cos(a) * .25, .5, Math.sin(a) * .25 - .05);
    crown.add(f);
  }
  crown.visible = false;
  group.add(crown);

  return { group, mat, eyes, tongue, crown, fireMat: fMat };
}

// ── Food ────────────────────────────────────────────────────
export function makeApple() {
  const g = new THREE.Group();
  const inner = new THREE.Group(); g.add(inner);
  const body = new THREE.Mesh(Sph(.34, 24, 18), new THREE.MeshStandardMaterial({ color: 0xff2d3a, roughness: .25, emissive: 0x400000 }));
  body.position.y = .42; body.scale.set(1, .92, 1); body.castShadow = true;
  const stem = new THREE.Mesh(Cyl(.03, .03, .2, 6), new THREE.MeshStandardMaterial({ color: 0x5a3a1a }));
  stem.position.y = .8;
  const leaf = new THREE.Mesh(Sph(.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0x3ec64a, roughness: .5 }));
  leaf.position.set(.11, .82, 0); leaf.scale.set(1, .25, .5); leaf.rotation.z = -.5;
  inner.add(body, stem, leaf);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.4, .5, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .45, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .03;
  g.add(ring);
  g.userData = { inner, ring };
  return g;
}

const emojiCache = {};
function emojiMaterial(emoji) {
  if (emojiCache[emoji]) return emojiCache[emoji];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '92px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  g.fillText(emoji, 64, 70);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true });
  m.userData.shared = true;
  return (emojiCache[emoji] = m);
}

const shared = {};
function sharedGeo(key, make) {
  if (!shared[key]) { shared[key] = make(); shared[key].userData.shared = true; }
  return shared[key];
}

export function makeSpecial(key) {
  const f = FRUITS[key];
  const g = new THREE.Group();
  const core = new THREE.Mesh(sharedGeo('core', () => Sph(.3, 20, 16)),
    new THREE.MeshStandardMaterial({ color: f.color, emissive: f.color, emissiveIntensity: .55, roughness: .2 }));
  core.position.y = .55; core.castShadow = true;
  const shell = new THREE.Mesh(sharedGeo('shell', () => Ico(.5, 0)),
    new THREE.MeshBasicMaterial({ color: f.color, wireframe: true, transparent: true, opacity: .6, toneMapped: false }));
  shell.position.y = .55;
  const sprite = new THREE.Sprite(emojiMaterial(f.emoji));
  sprite.position.y = 1.35; sprite.scale.set(.8, .8, .8);
  const ring = new THREE.Mesh(sharedGeo('ring', () => new THREE.RingGeometry(.45, .58, 32)),
    new THREE.MeshBasicMaterial({ color: f.color, transparent: true, opacity: .6, side: THREE.DoubleSide, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .03;
  g.add(core, shell, sprite, ring);
  g.userData = { core, shell, sprite, ring };
  return g;
}

// ── Enemy slime ─────────────────────────────────────────────
export function makeSlime(color) {
  const g = new THREE.Group();
  const pivot = new THREE.Group(); g.add(pivot);
  const body = new THREE.Mesh(sharedGeo('slime', () => Sph(.42, 22, 16)),
    new THREE.MeshStandardMaterial({ color, roughness: .15, emissive: color, emissiveIntensity: .18 }));
  body.position.y = .34; body.scale.set(1, .85, 1); body.castShadow = true;
  pivot.add(body);
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .2 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(sharedGeo('eyeW', () => Sph(.12, 12, 10)), white);
    e.position.set(s * .15, .46, .3);
    const p = new THREE.Mesh(sharedGeo('eyeB', () => Sph(.06, 10, 8)), black);
    p.position.set(s * .15, .45, .4);
    const brow = new THREE.Mesh(sharedGeo('brow', () => Box(.17, .045, .045)), black);
    brow.position.set(s * .15, .6, .35); brow.rotation.z = s * -.4;
    pivot.add(e, p, brow);
  }
  const mouth = new THREE.Mesh(sharedGeo('mouth', () => new THREE.TorusGeometry(.08, .02, 6, 12, Math.PI)), black);
  mouth.position.set(0, .28, .4); mouth.rotation.z = 0;
  pivot.add(mouth);
  g.userData = { pivot, body };
  return g;
}

export function makeMagnetRing() {
  const m = new THREE.Mesh(new THREE.TorusGeometry(.8, .05, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: .75, toneMapped: false }));
  m.rotation.x = Math.PI / 2; m.visible = false;
  return m;
}

export function makeShock(color) {
  return new THREE.Mesh(new THREE.RingGeometry(.85, 1, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
}

export const SKINS = [
  { a: 0x43c463, b: 0xa6e35a },
  { a: 0x2f7bff, b: 0x7fd0ff },
  { a: 0xff7a1a, b: 0xffd23f },
  { a: 0xd040fb, b: 0xff9ae6 },
  { a: 0xff3b5c, b: 0xffc1a8 },
  { a: 0x14c9b4, b: 0xfff275 },
  { a: 0x222233, b: 0xffd400 },
  { rainbow: true },
];
