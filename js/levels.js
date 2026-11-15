// ───────────────────────────────────────────────────────────
//  Data: special fruits, map themes, levels and map layouts
// ───────────────────────────────────────────────────────────

export const FRUITS = {
  fast:      { name: 'Speed Rush',        emoji: '⚡', color: 0xffd400, duration: 6, desc: 'Zoom! You move much faster for a while.' },
  slow:      { name: 'Slow Mo',           emoji: '🐢', color: 0x3aa0ff, duration: 6, desc: 'Slows you down – great for tight spots.' },
  reverse:   { name: 'Reverse',           emoji: '🔄', color: 0xa14bff, duration: 7, desc: 'Controls flip! Up is down, left is right.' },
  invisible: { name: 'Invisible',         emoji: '👻', color: 0xbfefff, duration: 8, desc: 'Fade out: pass through your own tail, enemies can’t hurt you.' },
  fire:      { name: 'Ghost Raider Fire', emoji: '🔥', color: 0xff5a00, duration: 7, desc: 'Destroys every enemy and lets you burn through obstacles.' },
  shrink:    { name: 'Shrink',            emoji: '✂️', color: 0xff6fb5, duration: 0, desc: 'Cuts your length in half.' },
  magnet:    { name: 'Magnet',            emoji: '🧲', color: 0xff3030, duration: 8, desc: 'Pulls nearby fruit straight to your mouth.' },
  poison:    { name: 'Poison',            emoji: '☠️', color: 0x55ff2a, duration: 0, desc: 'Avoid it! It damages your health.', damage: 20 },
  color:     { name: 'Color Swap',        emoji: '🎨', color: 0xffffff, duration: 0, desc: 'Gives you a new skin and bonus points.' },
};
export const ALL_FRUITS = Object.keys(FRUITS);

export const THEMES = [
  { name: 'Green Meadow', emoji: '🌿', sky: 0x8fd3ff, fog: 0xbfe6ff, groundA: '#86d45e', groundB: '#79c752', line: 'rgba(0,0,0,.06)',
    outside: 0x5fae45, wall: 0x3d8b37, wallTop: 0x6cc85a, obstacle: 'bush', decor: 'tree', enemy: 0x9b4dff, sun: 2.6, hemi: 1.1, hemiGround: 0x4b7a32 },
  { name: 'Desert Dunes', emoji: '🏜️', sky: 0xffcf8a, fog: 0xffdca8, groundA: '#f2d28c', groundB: '#e8c47c', line: 'rgba(120,70,0,.08)',
    outside: 0xe3b770, wall: 0xb9804a, wallTop: 0xe0a466, obstacle: 'cactus', decor: 'cactus', enemy: 0xe0452b, sun: 2.9, sunColor: 0xfff0d0, hemi: 1.1, hemiGround: 0x9a7040 },
  { name: 'Frozen Lake', emoji: '❄️', sky: 0xbfe3ff, fog: 0xe6f4ff, groundA: '#eef7ff', groundB: '#dcecfa', line: 'rgba(40,90,160,.08)',
    outside: 0xf4faff, wall: 0x8fc3e6, wallTop: 0xe0f4ff, obstacle: 'ice', decor: 'pine', enemy: 0x2f6bff, sun: 2.2, hemi: 1.0, hemiGround: 0x9ab8d0 },
  { name: 'Autumn Forest', emoji: '🍂', sky: 0xffb98a, fog: 0xf0b080, groundA: '#b8913f', groundB: '#a98436', line: 'rgba(0,0,0,.07)',
    outside: 0x8f6c2c, wall: 0x6b4523, wallTop: 0x9a6634, obstacle: 'autumn', decor: 'autumn', enemy: 0x6a1b9a, sun: 2.5, sunColor: 0xffd2a0, hemi: 1.0, hemiGround: 0x6a4a20 },
  { name: 'Sunny Beach', emoji: '🏖️', sky: 0x6fd0ff, fog: 0xa8e6ff, groundA: '#ffe7a8', groundB: '#f6da93', line: 'rgba(120,80,0,.07)',
    outside: 0x1e9bd7, water: true, wall: 0xd6ad66, wallTop: 0xf6d690, obstacle: 'palm', decor: 'palm', enemy: 0xff3d7f, sun: 2.8, hemi: 1.1, hemiGround: 0x6aa0b0 },
  { name: 'Lava Caverns', emoji: '🌋', sky: 0x1c0603, fog: 0x2c0a05, groundA: '#4a3434', groundB: '#3f2c2c', line: 'rgba(255,90,0,.10)',
    outside: 0xff4a00, lava: true, wall: 0x2a1a1a, wallTop: 0xff6a00, obstacle: 'obsidian', decor: 'obsidian', enemy: 0xffd000, sun: 1.6, sunColor: 0xffa070, hemi: .7, hemiSky: 0xff9a70, hemiGround: 0x401010 },
  { name: 'Candy Land', emoji: '🍭', sky: 0xffc8ea, fog: 0xffd8f0, groundA: '#fff0f7', groundB: '#ffe0ef', line: 'rgba(255,80,160,.10)',
    outside: 0xb8ecff, wall: 0xff6fb5, wallTop: 0xffffff, obstacle: 'lollipop', decor: 'lollipop', enemy: 0x00b3a4, sun: 2.4, hemi: 1.15, hemiGround: 0xd090c0 },
  { name: 'Neon City', emoji: '🌃', sky: 0x0b0822, fog: 0x150c38, groundA: '#1d1a3c', groundB: '#221e46', line: 'rgba(0,229,255,.22)',
    outside: 0x0d0b22, neon: true, wall: 0x00c8ff, wallTop: 0xff2bd6, obstacle: 'building', decor: 'building', enemy: 0xff2bd6, sun: 1.2, sunColor: 0xb0a0ff, hemi: .8, hemiSky: 0x8080ff, hemiGround: 0x201040 },
  { name: 'Crystal Cave', emoji: '💎', sky: 0x150d2c, fog: 0x22163f, groundA: '#3b2f5e', groundB: '#342954', line: 'rgba(170,140,255,.12)',
    outside: 0x251b42, wall: 0x5b42a8, wallTop: 0xb59cff, obstacle: 'crystal', decor: 'crystal', enemy: 0x00e0a0, sun: 1.5, sunColor: 0xd0c0ff, hemi: .9, hemiSky: 0xa090ff, hemiGround: 0x201040 },
  { name: 'Cosmic Void', emoji: '🌌', sky: 0x03020c, fog: 0x060420, groundA: '#1c1645', groundB: '#16123c', line: 'rgba(124,77,255,.22)',
    space: true, outside: 0x000000, wall: 0x7c4dff, wallTop: 0x00e5ff, obstacle: 'asteroid', decor: 'asteroid', enemy: 0xff6e40, sun: 1.8, hemi: .9, hemiSky: 0x9090ff, hemiGround: 0x100830 },
];

// fruits are introduced gradually, level by level
const F1 = ['fast', 'color'];
const F2 = [...F1, 'slow'];
const F3 = [...F2, 'shrink'];
const F4 = [...F3, 'poison'];
const F5 = [...F4, 'reverse'];
const F6 = [...F5, 'magnet'];
const F7 = [...F6, 'invisible'];
const F8 = [...F7, 'fire'];

export const LEVELS = [
  { map: 0, size: 16, target: 8,  special: 1, interval: 0.170, enemies: 0, fruits: F1 },
  { map: 1, size: 18, target: 10, special: 1, interval: 0.165, enemies: 0, fruits: F2 },
  { map: 2, size: 18, target: 12, special: 2, interval: 0.160, enemies: 1, fruits: F3 },
  { map: 3, size: 20, target: 14, special: 2, interval: 0.155, enemies: 1, fruits: F4 },
  { map: 4, size: 20, target: 16, special: 2, interval: 0.150, enemies: 2, fruits: F5 },
  { map: 5, size: 22, target: 18, special: 3, interval: 0.145, enemies: 2, fruits: F6 },
  { map: 6, size: 22, target: 20, special: 3, interval: 0.140, enemies: 3, fruits: F7 },
  { map: 7, size: 24, target: 22, special: 3, interval: 0.132, enemies: 3, fruits: F8 },
  { map: 8, size: 24, target: 25, special: 4, interval: 0.126, enemies: 4, fruits: F8 },
  { map: 9, size: 26, target: 30, special: 4, interval: 0.120, enemies: 5, fruits: F8 },
];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Builds the obstacle grid for a map. 0 = free, 1 = obstacle. */
export function makeLayout(mapIndex, N) {
  const grid = new Uint8Array(N * N);
  const inside = (x, z) => x >= 0 && z >= 0 && x < N && z < N;
  const set = (x, z) => { if (inside(x, z)) grid[z * N + x] = 1; };
  const clr = (x, z) => { if (inside(x, z)) grid[z * N + x] = 0; };
  const rect = (x0, z0, w, h, f = set) => { for (let z = z0; z < z0 + h; z++) for (let x = x0; x < x0 + w; x++) f(x, z); };
  const rng = mulberry32(1234 + mapIndex * 977);
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const mid = Math.floor(N / 2);
  const q = Math.floor(N / 4);
  let start = { x: 4, z: mid };

  switch (mapIndex) {
    case 0: // Meadow – open field with a few bushes
      [[q, q], [N - q - 1, q], [q, N - q - 1], [N - q - 1, N - q - 1]].forEach(([x, z]) => set(x, z));
      break;
    case 1: // Desert – scattered cacti
      for (let i = 0; i < Math.round(N * 0.9); i++) set(ri(1, N - 2), ri(1, N - 2));
      break;
    case 2: // Frozen – ice blocks
      [[q - 1, q - 1], [N - q - 1, q - 1], [q - 1, N - q - 1], [N - q - 1, N - q - 1], [mid - 1, mid - 1]].forEach(([x, z]) => rect(x, z, 2, 2));
      rect(mid - 1, 1, 2, 2); rect(mid - 1, N - 3, 2, 2);
      break;
    case 3: // Forest – tree clusters
      for (let i = 0; i < 13; i++) {
        const cx = ri(2, N - 3), cz = ri(2, N - 3);
        set(cx, cz);
        if (rng() < .7) set(cx + 1, cz);
        if (rng() < .5) set(cx, cz + 1);
        if (rng() < .3) set(cx + 1, cz + 1);
      }
      break;
    case 4: // Beach – plus-shaped palm rows with gaps
      for (let i = 3; i < N - 3; i++) {
        if (Math.abs(i - mid) > 1) { set(mid, i); set(i, mid); }
      }
      start = { x: 4, z: q };
      break;
    case 5: // Lava – grid of obsidian pillars
      for (let z = 2; z < N - 3; z += 4) for (let x = 2; x < N - 3; x += 4) rect(x, z, 2, 2);
      break;
    case 6: // Candy – four rooms with doors
      for (let i = 0; i < N; i++) { set(mid, i); set(i, mid); }
      [q - 1, q, N - q - 1, N - q].forEach(i => { clr(mid, i); clr(i, mid); });
      start = { x: 4, z: q };
      break;
    case 7: // Neon City – city blocks and streets
      for (let bz = 2; bz + 3 <= N - 2; bz += 5) for (let bx = 2; bx + 3 <= N - 2; bx += 5) rect(bx, bz, 3, 3);
      start = { x: 4, z: 11 };
      break;
    case 8: { // Crystal Cave – concentric rings with gaps
      const ring = (a, gaps) => {
        for (let i = a; i <= N - 1 - a; i++) { set(i, a); set(i, N - 1 - a); set(a, i); set(N - 1 - a, i); }
        gaps.forEach(g => { clr(g, a); clr(g, N - 1 - a); clr(a, g); clr(N - 1 - a, g); });
      };
      ring(3, [mid - 1, mid]);
      ring(7, [8, 9, N - 10, N - 9]);
      rect(mid - 1, mid - 1, 2, 2);
      break;
    }
    case 9: { // Cosmic – zig-zag walls + asteroids
      const rows = [4, 9, N - 10, N - 5];
      rows.forEach((z, k) => {
        for (let x = 0; x < N; x++) {
          const gapLeft = k % 2 === 0;
          if (gapLeft ? x > 3 : x < N - 4) set(x, z);
        }
      });
      for (let i = 0; i < 10; i++) {
        const x = ri(2, N - 3), z = ri(1, N - 2);
        if (!rows.includes(z) && !rows.includes(z - 1) && !rows.includes(z + 1)) set(x, z);
      }
      break;
    }
  }

  // Keep a safe runway around the start position
  rect(start.x - 3, start.z - 1, 10, 3, clr);
  return { grid, start, dir: 'right' };
}
