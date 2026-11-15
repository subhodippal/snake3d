// ───────────────────────────────────────────────────────────
//  Map generation: terrain heights, rivers, bridges, roads,
//  obstacle placement and the walkable grid the snake uses.
// ───────────────────────────────────────────────────────────

export const FREE = 0, OBST = 1, WATER = 2, BRIDGE = 3, ROAD = 4;
export const WATER_Y = -0.35;
export const walkable = t => t !== OBST && t !== WATER;

// footprint of each obstacle kind: [width along x, depth along z, keep-clear spacing]
export const FOOTPRINT = {
  tree: [1, 1, 0], bush: [1, 1, 0], rock: [1, 1, 0], log: [2, 1, 0], flowerBush: [1, 1, 0],
  jungleTree: [1, 1, 1], bamboo: [1, 1, 0], palm: [1, 1, 0], cactus: [1, 1, 0], sandcastle: [1, 1, 0],
  umbrella: [1, 1, 0], boulder: [2, 2, 0], pine: [1, 1, 0], stump: [1, 1, 0], hay: [1, 1, 0],
  snowPine: [1, 1, 0], snowman: [1, 1, 1], iceRock: [1, 1, 0], house: [3, 3, 1], car: [2, 1, 1],
  cone: [1, 1, 0], mailbox: [1, 1, 0], swing: [3, 1, 1], slide: [3, 1, 1], seesaw: [3, 1, 1],
  carousel: [2, 2, 1], bench: [2, 1, 0], ball: [1, 1, 0], stalagmite: [1, 1, 0], crystal: [1, 1, 0],
  torch: [1, 1, 1], barrel: [1, 1, 0], pillar: [1, 1, 0], ruinWall: [2, 1, 0], statue: [1, 1, 1], lamp: [1, 1, 0],
};

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Value noise ─────────────────────────────────────────────
function hash2(ix, iz, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function vnoise(x, z, seed) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed), c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
export function fbm(x, z, seed, oct = 4) {
  let s = 0, amp = .5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += vnoise(x * f, z * f, seed + i * 17) * amp; n += amp; amp *= .5; f *= 2.03; }
  return s / n;
}
export const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ── Main generator ──────────────────────────────────────────
export function generateMap(T, N, seed = 1) {
  const rng = mulberry32(seed * 7919 + 13);
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const half = N / 2, off = half - .5;
  const margin = 28, E = half + margin, step = .5;
  const S = Math.round((2 * E) / step) + 1;

  // rivers
  const rivers = (T.rivers || []).map(r => ({ ...r, c: (r.pos - .5) * N, ph: rng() * 6.28, ph2: rng() * 6.28 }));
  const rCenter = (r, u) => r.c + r.amp * Math.sin(u * r.freq + r.ph) + r.amp * .35 * Math.sin(u * r.freq * 2.3 + r.ph2);
  const rDeriv = (r, u) => r.amp * r.freq * Math.cos(u * r.freq + r.ph) + r.amp * .35 * r.freq * 2.3 * Math.cos(u * r.freq * 2.3 + r.ph2);
  const riverDist = (r, wx, wz) => {
    const u = r.axis === 'x' ? wx : wz, v = r.axis === 'x' ? wz : wx;
    return Math.abs(v - rCenter(r, u)) / Math.sqrt(1 + rDeriv(r, u) ** 2) - r.width / 2;
  };
  const riverSigned = (wx, wz) => { let m = 99; for (const r of rivers) m = Math.min(m, riverDist(r, wx, wz)); return m; };

  // roads
  const roads = (T.roads || []).map(r => {
    const ci = Math.round(r.pos * N);
    const lo = ci - Math.floor(r.width / 2);
    return { ...r, lo, hi: lo + r.width - 1, c: lo + (r.width - 1) / 2 - off };
  });
  const roadSigned = (wx, wz) => {
    let m = 99;
    for (const r of roads) {
      const v = r.axis === 'z' ? wx : wz, u = r.axis === 'z' ? wz : wx;
      if (Math.abs(u) > half + .5) continue;
      m = Math.min(m, Math.abs(v - r.c) - r.width / 2);
    }
    return m;
  };

  // raw terrain height (no bridges)
  const amp = T.hills?.amp ?? 1, freq = T.hills?.freq ?? .07, rise = T.rise ?? 5;
  const rawH = (wx, wz) => {
    const n = fbm(wx * freq + 100, wz * freq - 50, seed);
    let h = amp * smoothstep(.34, .82, n) + .05 + .08 * fbm(wx * .45, wz * .45, seed + 9, 2);
    const rd = roadSigned(wx, wz);
    if (rd < 1.6) h += ((h * .12 + .06) - h) * smoothstep(1.6, -.2, rd);
    const d = Math.max(Math.abs(wx), Math.abs(wz)) - half;
    if (d > 0) h += rise * smoothstep(.4, 10, d) * (.5 + .9 * fbm(wx * .09 + 31, wz * .09 - 17, seed + 3, 3));
    for (const r of rivers) {
      const s = riverDist(r, wx, wz);
      if (s < 3) h = Math.min(h, Math.max(WATER_Y + (s + .1) * 1.0, -1.15));
    }
    return h;
  };

  // sampled height field (fast bilinear lookups for animation)
  const hf = new Float32Array(S * S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) hf[j * S + i] = rawH(-E + i * step, -E + j * step);
  const heightAt = (wx, wz) => {
    const fx = Math.max(0, Math.min(S - 1.001, (wx + E) / step)), fz = Math.max(0, Math.min(S - 1.001, (wz + E) / step));
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const a = hf[j * S + i], b = hf[j * S + i + 1], c = hf[(j + 1) * S + i], d = hf[(j + 1) * S + i + 1];
    return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
  };

  // ── cell grid ─────────────────────────────────────────────
  const cell = new Uint8Array(N * N);
  const bridgeOf = new Int16Array(N * N).fill(-1);
  const reserved = new Uint8Array(N * N);
  const inside = (x, z) => x >= 0 && z >= 0 && x < N && z < N;
  const idx = (x, z) => z * N + x;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const wx = x - off, wz = z - off;
    if (riverSigned(wx, wz) < 0) cell[idx(x, z)] = WATER;
    else if (roadSigned(wx, wz) < 0) cell[idx(x, z)] = ROAD;
  }

  // ── bridges ───────────────────────────────────────────────
  const bridges = [];
  rivers.forEach((r, ri_) => {
    // bridge "columns" run along the river's flow axis (u); the deck spans across it (v)
    let spots = [];
    if (r.bridges === 'roads') {
      roads.filter(rd => rd.axis !== r.axis).forEach(rd => spots.push({ p0: rd.lo, w: rd.width, style: 'stone' }));
    } else {
      const k = r.bridges || 2;
      for (let i = 0; i < k; i++) {
        let p = Math.round(N * (i + 1) / (k + 1)) + ri(-2, 2) - 1;
        // keep away from perpendicular rivers
        for (const o of rivers) {
          if (o === r || o.axis === r.axis) continue;
          const oc = Math.round(o.c + off);
          if (Math.abs(p - oc) < o.width + o.amp + 3) p = p < oc ? oc - (o.width + o.amp + 4) : oc + (o.width + o.amp + 3);
        }
        p = Math.max(3, Math.min(N - 5, p));
        spots.push({ p0: p, w: 2, style: T.dark ? 'dark' : (T.key === 'snow' ? 'snow' : 'wood') });
      }
    }
    for (const sp of spots) {
      const cols = [];
      for (let c = sp.p0; c < sp.p0 + sp.w; c++) if (c >= 0 && c < N) cols.push(c);
      if (!cols.length) continue;
      const cu = (cols[0] + cols[cols.length - 1]) / 2 - off;
      const center = rCenter(r, cu) + off;
      let jmin = N, jmax = -1;
      for (const c of cols) for (let j = 0; j < N; j++) {
        if (Math.abs(j - center) > r.width / 2 + r.amp * .5 + 4) continue;
        const x = r.axis === 'x' ? c : j, z = r.axis === 'x' ? j : c;
        const wx = x - off, wz = z - off;
        if (riverDist(r, wx, wz) < 1.3) { jmin = Math.min(jmin, j); jmax = Math.max(jmax, j); }
      }
      if (jmax < 0) continue;
      const deckBase = WATER_Y + .55;
      const endH = j => Math.min(...cols.map(c => { const x = r.axis === 'x' ? c : j, z = r.axis === 'x' ? j : c; return rawH(x - off, z - off); }));
      for (let k = 0; k < 3 && jmin > 0 && endH(jmin) < deckBase; k++) jmin--;
      for (let k = 0; k < 3 && jmax < N - 1 && endH(jmax) < deckBase; k++) jmax++;
      const id = bridges.length;
      const b = {
        id, riverAxis: r.axis, style: sp.style, width: cols.length,
        u0: cols[0] - off - .5, u1: cols[cols.length - 1] - off + .5,
        v0: jmin - off - .5, v1: jmax - off + .5, deckBase, arch: .28 + (jmax - jmin) * .015,
        cells: [],
      };
      for (const c of cols) for (let j = jmin; j <= jmax; j++) {
        const x = r.axis === 'x' ? c : j, z = r.axis === 'x' ? j : c;
        const i = idx(x, z);
        cell[i] = BRIDGE; bridgeOf[i] = id; b.cells.push(i);
      }
      // keep the approaches clear
      for (const c of cols) for (const j of [jmin - 1, jmin - 2, jmax + 1, jmax + 2]) {
        const x = r.axis === 'x' ? c : j, z = r.axis === 'x' ? j : c;
        if (inside(x, z)) reserved[idx(x, z)] = 1;
      }
      bridges.push(b);
    }
  });

  const deckY = (b, wx, wz) => {
    const v = b.riverAxis === 'x' ? wz : wx;
    const t = ((v - b.v0) / (b.v1 - b.v0)) * 2 - 1;
    return b.deckBase + b.arch * (1 - t * t);
  };
  const groundAt = (wx, wz) => {
    const h = heightAt(wx, wz);
    const x = Math.round(wx + off), z = Math.round(wz + off);
    if (!inside(x, z)) return h;
    const bi = bridgeOf[idx(x, z)];
    if (bi < 0) return h;
    return Math.max(h, deckY(bridges[bi], wx, wz));
  };

  // ── sand pits (playground) ─────────────────────────────────
  const sandpits = [];
  for (let k = 0; k < (T.sandpits || 0); k++) {
    const w = ri(4, 6), d = ri(3, 5), x0 = ri(3, N - w - 3), z0 = ri(3, N - d - 3);
    sandpits.push({ x0: x0 - off - .5, z0: z0 - off - .5, x1: x0 + w - off - .5, z1: z0 + d - off - .5 });
  }
  const inSand = (wx, wz) => sandpits.some(s => wx > s.x0 && wx < s.x1 && wz > s.z0 && wz < s.z1);

  // ── start position ────────────────────────────────────────
  const x0 = 5;
  let best = null;
  for (let z = 3; z < N - 3; z++) {
    let ok = true, minS = 99;
    for (let x = x0 - 3; x <= x0 + 9 && ok; x++) for (let dz = -1; dz <= 1; dz++) {
      const t = cell[idx(x, z + dz)];
      if (t === WATER || t === BRIDGE) { ok = false; break; }
      minS = Math.min(minS, riverSigned(x - off, z + dz - off));
    }
    if (!ok) continue;
    const score = Math.min(minS, 6) * 2 - Math.abs(z - N / 2) * .15;
    if (!best || score > best.score) best = { z, score };
  }
  const start = { x: x0, z: best ? best.z : Math.floor(N / 4) };
  for (let x = start.x - 3; x <= start.x + 9; x++) for (let dz = -2; dz <= 2; dz++) if (inside(x, start.z + dz)) reserved[idx(x, start.z + dz)] = 1;

  // ── obstacles ─────────────────────────────────────────────
  const obstacles = [];
  const owner = new Int32Array(N * N).fill(-1);
  const canUse = (x, z, sp) => {
    for (let dz = -sp; dz <= sp; dz++) for (let dx = -sp; dx <= sp; dx++) {
      const xx = x + dx, zz = z + dz;
      if (!inside(xx, zz)) { if (dx === 0 && dz === 0) return false; continue; }
      const i = idx(xx, zz);
      if (dx === 0 && dz === 0) { if (cell[i] !== FREE || reserved[i]) return false; }
      else if (cell[i] === OBST || cell[i] === BRIDGE) return false;
    }
    return true;
  };
  const place = (kind, x, z, rot) => {
    const [fw, fd, sp] = FOOTPRINT[kind] || [1, 1, 0];
    const w = rot ? fd : fw, d = rot ? fw : fd;
    const cells = [];
    for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
      if (!canUse(x + dx, z + dz, sp)) return false;
      cells.push(idx(x + dx, z + dz));
    }
    if (inSand(x - off, z - off) && kind !== 'swing' && kind !== 'slide') return false;
    const o = { id: obstacles.length, kind, cells, cx: x + (w - 1) / 2 - off, cz: z + (d - 1) / 2 - off, rot: rot ? Math.PI / 2 : 0, alive: true };
    if (w === d && fw === 1) o.rot = rng() * Math.PI * 2;
    else if (rng() < .5) o.rot += Math.PI;
    cells.forEach(i => { cell[i] = OBST; owner[i] = o.id; });
    obstacles.push(o);
    return true;
  };
  for (const [kind, count] of (T.obstacles || [])) {
    const n = Math.round(count * (N * N) / (44 * 44));
    let placed = 0;
    for (let tries = 0; tries < n * 30 && placed < n; tries++) {
      const rot = rng() < .5 ? 1 : 0;
      if (place(kind, ri(1, N - 2), ri(1, N - 2), rot)) placed++;
    }
  }
  // street lamps along roads
  if (T.lamps) {
    for (const r of roads) {
      for (let u = 2; u < N - 2; u += 7) {
        const side = ((u / 7) | 0) % 2 ? r.lo - 1 : r.hi + 1;
        const x = r.axis === 'z' ? side : u, z = r.axis === 'z' ? u : side;
        if (inside(x, z) && cell[idx(x, z)] === FREE && !reserved[idx(x, z)]) place('lamp', x, z, 0);
      }
    }
  }

  // ── connectivity: make sure no pocket is sealed off ───────
  const bfs = () => {
    const seen = new Uint8Array(N * N), q = [idx(start.x, start.z)];
    seen[q[0]] = 1;
    while (q.length) {
      const i = q.pop(), x = i % N, z = (i / N) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, zz = z + dz;
        if (!inside(xx, zz)) continue;
        const j = idx(xx, zz);
        if (!seen[j] && walkable(cell[j])) { seen[j] = 1; q.push(j); }
      }
    }
    return seen;
  };
  let reach = bfs();
  for (let pass = 0; pass < 6; pass++) {
    let removed = 0;
    for (const o of obstacles) {
      if (!o.alive) continue;
      let touchIn = false, touchOut = false;
      for (const i of o.cells) {
        const x = i % N, z = (i / N) | 0;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, zz = z + dz;
          if (!inside(xx, zz)) continue;
          const j = idx(xx, zz);
          if (!walkable(cell[j])) continue;
          if (reach[j]) touchIn = true; else touchOut = true;
        }
      }
      if (touchIn && touchOut) {
        o.alive = false; removed++;
        o.cells.forEach(i => { cell[i] = FREE; owner[i] = -1; });
      }
    }
    if (!removed) break;
    reach = bfs();
  }
  const live = obstacles.filter(o => o.alive);
  live.forEach((o, k) => { o.id = k; o.cells.forEach(i => owner[i] = k); });

  return {
    N, off, E, step, S, hf, cell, bridgeOf, owner, bridges, roads, rivers, sandpits, obstacles: live, start, dir: 'right',
    heightAt, groundAt, riverSigned, roadSigned, inSand, deckY, rawH, seed,
  };
}
