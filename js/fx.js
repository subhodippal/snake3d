import * as THREE from 'three';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/** Pooled GPU-instanced particle system. */
export class Particles {
  constructor(scene, max = 600) {
    this.max = max;
    const geo = new THREE.IcosahedronGeometry(0.09, 0);
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.p = [];
    for (let i = 0; i < max; i++) {
      this.p.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, s: 1, alive: false, spin: 0 });
      this.mesh.setMatrixAt(i, ZERO);
      this.mesh.setColorAt(i, _c.set(0xffffff));
    }
    this.i = 0;
    scene.add(this.mesh);
  }

  emit(x, y, z, n, o = {}) {
    const sp = o.speed ?? 3, up = o.up ?? 2, jit = o.jitter ?? 0.1;
    for (let k = 0; k < n; k++) {
      const idx = this.i, p = this.p[idx];
      this.i = (this.i + 1) % this.max;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1);
      const r = sp * (0.35 + Math.random() * 0.65);
      p.vx = Math.sin(ph) * Math.cos(th) * r;
      p.vz = Math.sin(ph) * Math.sin(th) * r;
      p.vy = Math.abs(Math.cos(ph)) * r * 0.6 + up * (0.5 + Math.random() * 0.5);
      p.x = x + (Math.random() - 0.5) * jit; p.y = y + (Math.random() - 0.5) * jit; p.z = z + (Math.random() - 0.5) * jit;
      p.g = o.gravity ?? -9;
      p.life = p.max = (o.life ?? 0.8) * (0.6 + Math.random() * 0.6);
      p.s = (o.size ?? 1) * (0.6 + Math.random() * 0.8);
      p.drag = o.drag ?? 0.98;
      p.floor = o.floor ?? (y - 0.5);
      p.alive = true;
      const col = o.colors ? o.colors[(Math.random() * o.colors.length) | 0] : (o.color ?? 0xffffff);
      this.mesh.setColorAt(idx, _c.set(col));
    }
    this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      const p = this.p[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; this.mesh.setMatrixAt(i, ZERO); continue; }
      p.vy += p.g * dt;
      p.vx *= p.drag; p.vz *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < p.floor) { p.y = p.floor; p.vy *= -0.4; p.vx *= 0.7; p.vz *= 0.7; }
      const s = p.s * Math.min(1, (p.life / p.max) * 1.6);
      _m.compose(_p.set(p.x, p.y, p.z), _q, _s.set(s, s, s));
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
