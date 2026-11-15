// ───────────────────────────────────────────────────────────
//  Data: special fruits, world themes (environments) and levels
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

// Each theme is a full environment: terrain, water, obstacles, decor, animals and lighting.
//  rivers: axis = direction the river flows ('x' runs left→right, 'z' runs top→bottom)
//          pos = 0..1 across the map, amp/freq = meander, width in cells, bridges = count
//  obstacles: [kind, count]   (kinds are in models.js → OBSTACLES)
//  animals:   [kind, count]   (kinds are in animals.js)
export const THEMES = [
  {
    key: 'meadow', name: 'Green Meadow', emoji: '🌿', card: ['#8fd86a', '#2f7d3a'],
    sky: 0x9fd8ff, fog: 0xc4e8ff, fogNear: 30, fogFar: 75,
    hemi: 1.05, hemiSky: 0xdff2ff, hemiGround: 0x4b7a32, sun: 2.7, sunColor: 0xfff4dc,
    ground: { a: '#7fcd52', b: '#6ab944', high: '#93d465', bank: '#c9b27a', bed: '#5a6b4a', cliff: '#4f8a3a', rock: '#8a8f86' },
    hills: { amp: 0.9, freq: 0.07 }, rise: 5,
    water: { color: 0x3aa6e0, opacity: 0.82 },
    rivers: [{ axis: 'x', pos: 0.56, amp: 3, freq: 0.11, width: 3, bridges: 3 }],
    obstacles: [['tree', 26], ['bush', 30], ['rock', 14], ['log', 6], ['flowerBush', 12]],
    decor: { tufts: ['#5daa3c', '#78c24f', '#4e9c34'], tuftCount: 1800, flowers: 380, pebbles: 120, lily: true, reeds: true },
    outside: ['tree', 'tree', 'bush', 'pine'], outsideCount: 260,
    animals: [['rabbit', 5], ['deer', 3], ['bird', 7], ['butterfly', 9], ['duck', 4], ['frog', 3], ['fish', 3]],
  },
  {
    key: 'jungle', name: 'Wild Jungle', emoji: '🌴', card: ['#3fae5a', '#124d2a'],
    sky: 0x9ee0c8, fog: 0xa9d9b8, fogNear: 22, fogFar: 62,
    hemi: 0.95, hemiSky: 0xd8ffe8, hemiGround: 0x2d5a24, sun: 2.3, sunColor: 0xfff0c8,
    ground: { a: '#4f9a35', b: '#3f862b', high: '#5aa83c', bank: '#7a6a3c', bed: '#3a4a30', cliff: '#2f6a2a', rock: '#6a7060' },
    hills: { amp: 1.0, freq: 0.08 }, rise: 7,
    water: { color: 0x3c9a8a, opacity: 0.85 },
    rivers: [{ axis: 'x', pos: 0.5, amp: 4, freq: 0.09, width: 3, bridges: 3 }],
    obstacles: [['jungleTree', 34], ['bamboo', 18], ['palm', 10], ['rock', 10], ['bush', 20], ['log', 6]],
    decor: { tufts: ['#3d8a2a', '#59a83a', '#2f7a22'], tuftCount: 2000, ferns: 340, flowers: 160, lily: true, reeds: true },
    outside: ['jungleTree', 'jungleTree', 'bamboo', 'palm'], outsideCount: 320,
    animals: [['monkey', 8], ['parrot', 7], ['butterfly', 10], ['frog', 5], ['turtle', 2], ['fish', 3]],
  },
  {
    key: 'shore', name: 'Sandy Shores', emoji: '🏖️', card: ['#ffe1a0', '#2b9bd0'],
    sky: 0x7fd6ff, fog: 0xb6ecff, fogNear: 32, fogFar: 80,
    hemi: 1.1, hemiSky: 0xffffff, hemiGround: 0x9a8a60, sun: 2.9, sunColor: 0xfff2d8,
    ground: { a: '#f4dc9c', b: '#ecd08a', high: '#f8e4ae', bank: '#d9bd7a', bed: '#b8a070', cliff: '#d0a868', rock: '#b0a090' },
    hills: { amp: 0.7, freq: 0.06 }, rise: 4,
    water: { color: 0x22b0d8, opacity: 0.8 },
    rivers: [{ axis: 'z', pos: 0.55, amp: 3, freq: 0.1, width: 4, bridges: 3 }],
    obstacles: [['palm', 26], ['rock', 14], ['cactus', 6], ['sandcastle', 6], ['umbrella', 8]],
    decor: { tufts: ['#c8b46a', '#a8a050'], tuftCount: 400, shells: 300, pebbles: 160 },
    outside: ['palm', 'palm', 'rock'], outsideCount: 200,
    animals: [['turtle', 7], ['crab', 7], ['seagull', 8], ['fish', 4]],
  },
  {
    key: 'rocky', name: 'Rocky Valley', emoji: '🪨', card: ['#a9a296', '#4f5a52'],
    sky: 0xb4d4ee, fog: 0xccdbe6, fogNear: 28, fogFar: 72,
    hemi: 1.0, hemiSky: 0xeef4ff, hemiGround: 0x5a5a4a, sun: 2.6, sunColor: 0xfff0dc,
    ground: { a: '#9aa070', b: '#8a905e', high: '#a8a28c', bank: '#8a8070', bed: '#5a5850', cliff: '#7a756a', rock: '#8e8a82' },
    hills: { amp: 1.3, freq: 0.08 }, rise: 8,
    water: { color: 0x4aa0c8, opacity: 0.85 },
    rivers: [{ axis: 'x', pos: 0.45, amp: 3, freq: 0.13, width: 3, bridges: 3 }],
    obstacles: [['rock', 40], ['boulder', 12], ['pine', 10], ['stump', 8], ['bush', 10]],
    decor: { tufts: ['#8a9a5a', '#7a8a4a'], tuftCount: 900, pebbles: 600, flowers: 80, reeds: true },
    outside: ['boulder', 'rock', 'pine', 'rock'], outsideCount: 260,
    animals: [['goat', 5], ['eagle', 3], ['rabbit', 4], ['butterfly', 4], ['fish', 2], ['lizard', 5]],
  },
  {
    key: 'hills', name: 'Rolling Hills', emoji: '⛰️', card: ['#b4e27a', '#4d8a3a'],
    sky: 0xa8dcff, fog: 0xd2ecff, fogNear: 30, fogFar: 78,
    hemi: 1.05, hemiSky: 0xffffff, hemiGround: 0x5a7a3a, sun: 2.7, sunColor: 0xfff2d0,
    ground: { a: '#9ad65e', b: '#86c650', high: '#b8e078', bank: '#b0a070', bed: '#5a6a4a', cliff: '#6a9a48', rock: '#8a8a80' },
    hills: { amp: 2.6, freq: 0.06 }, rise: 7,
    water: { color: 0x3fa8e0, opacity: 0.82 },
    rivers: [{ axis: 'x', pos: 0.6, amp: 4, freq: 0.08, width: 3, bridges: 2 }, { axis: 'z', pos: 0.4, amp: 3, freq: 0.1, width: 2, bridges: 2 }],
    obstacles: [['tree', 20], ['hay', 14], ['bush', 16], ['rock', 12], ['flowerBush', 14]],
    decor: { tufts: ['#7cc24a', '#98d860', '#6ab03e'], tuftCount: 1800, flowers: 500, pebbles: 80, reeds: true },
    outside: ['tree', 'pine', 'hay', 'bush'], outsideCount: 240,
    animals: [['sheep', 9], ['rabbit', 4], ['bird', 7], ['butterfly', 8], ['duck', 3], ['fish', 2]],
  },
  {
    key: 'snow', name: 'Snowy Peaks', emoji: '❄️', card: ['#f0f8ff', '#6a9cc8'],
    sky: 0xc8e2f8, fog: 0xe8f2fc, fogNear: 22, fogFar: 64,
    hemi: 1.0, hemiSky: 0xffffff, hemiGround: 0x9ab0c8, sun: 2.2, sunColor: 0xfff8f0,
    ground: { a: '#f4f9ff', b: '#e6f0fa', high: '#ffffff', bank: '#c8d8e8', bed: '#7a90a8', cliff: '#d8e6f4', rock: '#8a98a8' },
    hills: { amp: 1.6, freq: 0.07 }, rise: 9,
    water: { color: 0x6ac0e8, opacity: 0.8 },
    rivers: [{ axis: 'z', pos: 0.5, amp: 3, freq: 0.1, width: 3, bridges: 3 }],
    obstacles: [['snowPine', 34], ['snowman', 8], ['iceRock', 14], ['rock', 8]],
    decor: { tufts: ['#e8f0f8', '#d8e4f0'], tuftCount: 500, pebbles: 120, snowClumps: 500 },
    outside: ['snowPine', 'snowPine', 'iceRock'], outsideCount: 280,
    animals: [['penguin', 8], ['whiteRabbit', 5], ['bird', 5], ['fish', 2]],
    snowfall: 900,
  },
  {
    key: 'road', name: 'Country Road', emoji: '🛣️', card: ['#ffb070', '#4a4a5a'],
    sky: 0xffb48a, fog: 0xffc8a0, fogNear: 28, fogFar: 75,
    hemi: 0.75, hemiSky: 0xffd8c0, hemiGround: 0x4a4038, sun: 2.0, sunColor: 0xffb070, sunLow: true,
    ground: { a: '#8ab85a', b: '#7aa84c', high: '#98c264', bank: '#a89068', bed: '#4a5040', cliff: '#6a8a46', rock: '#8a8478' },
    hills: { amp: 0.5, freq: 0.06 }, rise: 5,
    water: { color: 0x4a90c0, opacity: 0.85 },
    rivers: [{ axis: 'x', pos: 0.55, amp: 2, freq: 0.1, width: 3, bridges: 'roads' }],
    roads: [{ axis: 'z', pos: 0.3, width: 3 }, { axis: 'z', pos: 0.74, width: 3 }, { axis: 'x', pos: 0.2, width: 3 }],
    obstacles: [['house', 8], ['car', 10], ['cone', 14], ['tree', 18], ['bush', 14], ['mailbox', 6]],
    lamps: true,
    decor: { tufts: ['#6a9a40', '#86b450'], tuftCount: 1100, flowers: 140, pebbles: 100, reeds: true },
    outside: ['tree', 'house', 'tree', 'bush'], outsideCount: 200,
    animals: [['dog', 4], ['cat', 3], ['pigeon', 7], ['bird', 5], ['duck', 3], ['fish', 2]],
  },
  {
    key: 'playground', name: 'Fun Playground', emoji: '🛝', card: ['#ffd84a', '#ff6a8a'],
    sky: 0x8cd6ff, fog: 0xc0eaff, fogNear: 30, fogFar: 78,
    hemi: 1.1, hemiSky: 0xffffff, hemiGround: 0x5a8a3a, sun: 2.8, sunColor: 0xfff6e0,
    ground: { a: '#7ed05a', b: '#6cc04a', high: '#8ad866', bank: '#d8c088', bed: '#5a6a4a', cliff: '#5a9a40', rock: '#9a9a90', sand: '#f2d898' },
    hills: { amp: 0.45, freq: 0.06 }, rise: 4,
    water: { color: 0x40b8e8, opacity: 0.82 },
    rivers: [{ axis: 'z', pos: 0.62, amp: 2, freq: 0.12, width: 2, bridges: 3 }],
    sandpits: 5,
    obstacles: [['swing', 5], ['slide', 5], ['seesaw', 5], ['carousel', 3], ['bench', 10], ['tree', 14], ['ball', 8], ['bush', 10]],
    decor: { tufts: ['#5fae45', '#7cc85a'], tuftCount: 1200, flowers: 260, pebbles: 60, lily: true },
    outside: ['tree', 'tree', 'house', 'bush'], outsideCount: 200,
    animals: [['dog', 5], ['squirrel', 5], ['pigeon', 7], ['butterfly', 8], ['duck', 3], ['fish', 2]],
  },
  {
    key: 'cave', name: 'Torch Cave', emoji: '🔥', card: ['#5a4a3a', '#1a1210'],
    sky: 0x050404, fog: 0x0a0807, fogNear: 10, fogFar: 36,
    hemi: 0.22, hemiSky: 0x6a5a8a, hemiGround: 0x1a1210, sun: 0.35, sunColor: 0x7a8aff,
    ground: { a: '#5a4c40', b: '#4e4238', high: '#665648', bank: '#4a4038', bed: '#1a2a2a', cliff: '#3a302a', rock: '#5a5048' },
    hills: { amp: 0.9, freq: 0.09 }, rise: 12,
    water: { color: 0x1a6a70, opacity: 0.88, glow: 0x0a4a50 },
    rivers: [{ axis: 'x', pos: 0.5, amp: 3, freq: 0.12, width: 3, bridges: 3 }],
    obstacles: [['stalagmite', 34], ['crystal', 14], ['rock', 18], ['torch', 22], ['barrel', 8]],
    decor: { pebbles: 700, mushrooms: 220, tufts: ['#3a4a2a'], tuftCount: 120 },
    outside: ['stalagmite', 'rock', 'boulder', 'crystal'], outsideCount: 300,
    animals: [['bat', 10], ['fish', 2], ['frog', 3]],
    dark: true, fenceTorches: 6, bridgeTorches: true, embers: true,
  },
  {
    key: 'temple', name: 'Temple Night', emoji: '🏛️', card: ['#3a4a8a', '#0e1030'],
    sky: 0x0a1030, fog: 0x101838, fogNear: 14, fogFar: 46,
    hemi: 0.35, hemiSky: 0x6a7ad0, hemiGround: 0x101020, sun: 0.6, sunColor: 0x9aaaff, moon: true,
    ground: { a: '#3a5a32', b: '#324e2c', high: '#46643a', bank: '#4a4a3a', bed: '#1a2a30', cliff: '#2a3a28', rock: '#6a6a72' },
    hills: { amp: 1.0, freq: 0.08 }, rise: 7,
    water: { color: 0x2a5a8a, opacity: 0.85, glow: 0x081830 },
    rivers: [{ axis: 'x', pos: 0.38, amp: 3, freq: 0.1, width: 3, bridges: 2 }, { axis: 'z', pos: 0.66, amp: 3, freq: 0.1, width: 3, bridges: 2 }],
    obstacles: [['pillar', 22], ['ruinWall', 10], ['jungleTree', 18], ['torch', 20], ['rock', 10], ['statue', 4]],
    decor: { tufts: ['#2f5a2a', '#3a6a30'], tuftCount: 1300, ferns: 200, pebbles: 200, mushrooms: 80, lily: true },
    outside: ['jungleTree', 'pillar', 'jungleTree', 'rock'], outsideCount: 260,
    animals: [['bat', 6], ['monkey', 4], ['frog', 5], ['fish', 2]],
    dark: true, fenceTorches: 7, bridgeTorches: true, fireflies: 160, embers: true, stars: true,
  },
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
  { map: 0, size: 40, target: 8,  special: 1, interval: 0.165, enemies: 0, fruits: F1 },
  { map: 1, size: 42, target: 10, special: 1, interval: 0.160, enemies: 0, fruits: F2 },
  { map: 2, size: 44, target: 12, special: 2, interval: 0.156, enemies: 1, fruits: F3 },
  { map: 3, size: 44, target: 14, special: 2, interval: 0.152, enemies: 1, fruits: F4 },
  { map: 4, size: 46, target: 16, special: 2, interval: 0.148, enemies: 2, fruits: F5 },
  { map: 5, size: 46, target: 18, special: 3, interval: 0.144, enemies: 2, fruits: F6 },
  { map: 6, size: 48, target: 20, special: 3, interval: 0.140, enemies: 3, fruits: F7 },
  { map: 7, size: 48, target: 22, special: 3, interval: 0.134, enemies: 3, fruits: F8 },
  { map: 8, size: 50, target: 25, special: 4, interval: 0.128, enemies: 3, fruits: F8 },
  { map: 9, size: 52, target: 30, special: 4, interval: 0.122, enemies: 4, fruits: F8 },
];
