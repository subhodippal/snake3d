// ───────────────────────────────────────────────────────────
//  Procedural 3D models (no external assets)
// ───────────────────────────────────────────────────────────
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FRUITS } from './levels.js';

const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _c = new THREE.Color();
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

/** Transformed, vertex-colored, non-indexed geometry part. */
function P(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  _m.compose(V(pos), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2])), V(scl));
  g.applyMatrix4(_m);
  _c.set(color);
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
const merge = parts => { const g = mergeGeometries(parts); parts.forEach(p => p.dispose()); return g; };

const Cyl = (a, b, h, s = 10) => new THREE.CylinderGeometry(a, b, h, s);
const Sph = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
const Ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
const Box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const Cone = (r, h, s = 10) => new THREE.ConeGeometry(r, h, s);

export function obstacleGeometry(kind) {
  switch (kind) {
    case 'bush': return merge([
      P(Ico(.42), 0x3f9e3a, [0, .36, 0], [0, 0, 0], [1, .85, 1]),
      P(Ico(.3), 0x56b84a, [.22, .5, .12]), P(Ico(.26), 0x4aa83f, [-.2, .45, -.15]),
      P(Sph(.07), 0xff5a7a, [.12, .74, .22]), P(Sph(.06), 0xffe14a, [-.2, .66, .2]),
    ]);
    case 'tree': return merge([
      P(Cyl(.1, .14, .7, 8), 0x7a4b2a, [0, .35, 0]),
      P(Cone(.5, 1, 10), 0x2f8f3a, [0, 1.05, 0]), P(Cone(.37, .75, 10), 0x3aa846, [0, 1.5, 0]),
    ]);
    case 'cactus': return merge([
      P(Cyl(.2, .24, 1.3, 10), 0x3c9a4a, [0, .65, 0]), P(Sph(.2), 0x3c9a4a, [0, 1.3, 0]),
      P(Cyl(.09, .09, .35, 8), 0x46a854, [.26, .6, 0], [0, 0, Math.PI / 2]),
      P(Cyl(.1, .1, .45, 8), 0x46a854, [.42, .8, 0]), P(Sph(.1), 0x46a854, [.42, 1.03, 0]),
      P(Cyl(.09, .09, .3, 8), 0x46a854, [-.25, .45, 0], [0, 0, Math.PI / 2]),
      P(Cyl(.09, .09, .35, 8), 0x46a854, [-.38, .6, 0]), P(Sph(.09), 0x46a854, [-.38, .78, 0]),
      P(Sph(.09), 0xff5ca8, [0, 1.5, 0]),
    ]);
    case 'ice': return merge([
      P(Box(.92, .8, .92), 0x9fd8ff, [0, .4, 0]),
      P(Box(.6, .35, .6), 0xe2f6ff, [.08, .97, -.05], [0, .4, 0]),
    ]);
    case 'pine': return merge([
      P(Cyl(.1, .13, .5, 8), 0x6b4423, [0, .25, 0]),
      P(Cone(.55, .9, 10), 0x2e6b4a, [0, .85, 0]), P(Cone(.42, .7, 10), 0x2e6b4a, [0, 1.3, 0]),
      P(Cone(.25, .4, 10), 0xffffff, [0, 1.7, 0]),
    ]);
    case 'autumn': return merge([
      P(Cyl(.1, .15, .8, 8), 0x6b4423, [0, .4, 0]),
      P(Ico(.45), 0xe8742a, [0, 1.05, 0]), P(Ico(.32), 0xd94b2b, [.24, 1.25, .1]), P(Ico(.3), 0xf2b33d, [-.2, 1.2, -.12]),
    ]);
    case 'palm': {
      const parts = [
        P(Cyl(.08, .13, 1.4, 8), 0xa8783f, [.04, .7, 0], [0, 0, -.06]),
        P(Sph(.09), 0x6b4423, [.14, 1.33, .06]), P(Sph(.09), 0x6b4423, [0, 1.33, -.08]),
      ];
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        parts.push(P(Sph(.42, 10, 6), k % 2 ? 0x2fa84a : 0x3cbc58, [Math.cos(a) * .36 + .06, 1.38, -Math.sin(a) * .36], [0, a, -.35], [1, .08, .3]));
      }
      return merge(parts);
    }
    case 'obsidian': return merge([
      P(new THREE.DodecahedronGeometry(.45), 0x2a2228, [0, .42, 0], [0, 0, 0], [1, 1.25, 1]),
      P(Ico(.16, 0), 0xff7a1a, [0, .98, 0]),
      P(new THREE.DodecahedronGeometry(.2), 0x3a2a30, [.32, .15, .25]),
    ]);
    case 'lollipop': return merge([
      P(Sph(.38, 14, 8), 0xffffff, [0, 0, 0], [0, 0, 0], [1, .75, 1]),
      P(Cyl(.045, .045, 1, 6), 0xffffff, [0, .6, 0]),
      P(Cyl(.38, .38, .12, 24), 0xffffff, [0, 1.15, 0], [Math.PI / 2, 0, 0]),
      P(new THREE.TorusGeometry(.2, .05, 8, 24), 0xcccccc, [0, 1.15, .07]),
    ]);
    case 'building': return merge([
      P(Box(.9, 1, .9), 0x2a2550, [0, .5, 0]),
      P(Box(.93, .06, .93), 0x00e5ff, [0, .98, 0]),
      P(Box(.93, .04, .93), 0xff2bd6, [0, .55, 0]),
      P(Box(.5, .5, .93), 0x3a3570, [0, .3, 0]),
    ]);
    case 'crystal': return merge([
      P(new THREE.OctahedronGeometry(.33), 0x8f6bff, [0, .72, 0], [0, 0, 0], [1, 2.2, 1]),
      P(new THREE.OctahedronGeometry(.22), 0x4fe0ff, [.25, .42, .1], [0, 0, .5], [1, 2, 1]),
      P(new THREE.OctahedronGeometry(.2), 0xd07bff, [-.22, .36, -.1], [0, 0, -.6], [1, 1.8, 1]),
    ]);
    case 'asteroid': return merge([
      P(new THREE.DodecahedronGeometry(.46), 0x6d6380, [0, .45, 0], [0, 0, 0], [1, .9, 1.1]),
      P(Sph(.12, 8, 6), 0x4a4258, [.3, .62, .18]), P(Sph(.1, 8, 6), 0x4a4258, [-.25, .5, .3]),
      P(Sph(.09, 8, 6), 0x4a4258, [.05, .85, -.2]),
    ]);
  }
  return P(Box(.9, .9, .9), 0x888888, [0, .45, 0]);
}

export function wallGeometry(wall, top) {
  return merge([P(Box(1, .7, 1), wall, [0, .35, 0]), P(Box(1.02, .12, 1.02), top, [0, .74, 0])]);
}

export function groundTexture(N, a, b, line) {
  const px = 32, c = document.createElement('canvas');
  c.width = c.height = N * px;
  const g = c.getContext('2d');
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    g.fillStyle = (x + z) % 2 ? a : b;
    g.fillRect(x * px, z * px, px, px);
  }
  // speckles for texture
  for (let i = 0; i < N * N * 3; i++) {
    g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)';
    g.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2);
  }
  g.strokeStyle = line; g.lineWidth = 2;
  for (let i = 0; i <= N; i++) {
    g.beginPath(); g.moveTo(i * px, 0); g.lineTo(i * px, c.height); g.stroke();
    g.beginPath(); g.moveTo(0, i * px); g.lineTo(c.width, i * px); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
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
