// ───────────────────────────────────────────────────────────
//  Data: special fruits, world themes (environments) and levels
// ───────────────────────────────────────────────────────────

// Spells and gems (the old "potions"): each is a different item with a good or bad effect.
export const FRUITS = {
  fast:      { name: 'Speed Spell',   emoji: '⚡', color: 0xffd400, duration: 7, kind: 'spell', desc: 'Run faster for a while.' },
  slow:      { name: 'Slow Spell',    emoji: '🐢', color: 0x3aa0ff, duration: 7, kind: 'spell', desc: 'Run slower: easier to steer.' },
  invisible: { name: 'Invisible Spell', emoji: '👻', color: 0xbfefff, duration: 8, kind: 'spell', desc: 'Your body vanishes, only your head stays visible. Enemies can’t hurt you.' },
  reverse:   { name: 'Reverse Spell', emoji: '🔄', color: 0xa14bff, duration: 0, kind: 'spell', desc: 'Your tail becomes your head and your head becomes your tail!' },
  heal:      { name: 'Live Spell',    emoji: '💖', color: 0xff4f8a, duration: 0, kind: 'spell', desc: 'Restores 40 health.' },
  sword:     { name: 'Sword Spell',   emoji: '⚔️', color: 0xc8d0e0, duration: 0, kind: 'spell', desc: 'Careful! Half your health, half your length and half your points.' },
  mushroom:  { name: 'Mushroom',      emoji: '🍄', color: 0xff6fb5, duration: 0, kind: 'gem', desc: 'Damages your health.', damage: 20 },
  devil:     { name: 'Devil Eye',     emoji: '👁️', color: 0xff2a1a, duration: 14, kind: 'gem', desc: 'Devil mode: flames burn on your face and normal food turns poisonous. It hurts, but gives double growth and points.' },
  burn:      { name: 'Fire Stone',    emoji: '🔥', color: 0xff7a1a, duration: 10, kind: 'gem', desc: 'You burn and slowly lose health. Eat food to cool down: every bite takes 2.5 s off.' },
  magnet:    { name: 'Magnet',        emoji: '🧲', color: 0xff3030, duration: 9, kind: 'gem', desc: 'Normal food you pass nearby is eaten automatically.' },
};
// which 3D item each spell / gem uses
export const POTION_MODEL = {
  fast: 'flask', slow: 'flask', invisible: 'flask', reverse: 'flask', heal: 'flask', sword: 'sword',
  mushroom: 'mushroom', devil: 'devileye', burn: 'firestone', magnet: 'magnet',
};
export const ALL_FRUITS = Object.keys(FRUITS);

// Normal food (normal points, normal growth) · special food (rare, big points, maximum growth) · small animals that run around.
export const FOODS = {
  fruit: {
    apple:   { name: 'Apple',   emoji: '🍎', pts: 10, grow: 1, color: 0xff2d3a, w: 3 },
    litchi:  { name: 'Litchi',  emoji: '🍒', pts: 12, grow: 1, color: 0xd8283a, w: 2 },
    pumpkin: { name: 'Pumpkin', emoji: '🎃', pts: 14, grow: 1, color: 0xf08a1c, w: 2 },
    orange:  { name: 'Orange',  emoji: '🍊', pts: 12, grow: 1, color: 0xff9a1a, w: 2 },
  },
  special: {
    pizza:  { name: 'Pizza',  emoji: '🍕', pts: 70, grow: 14, color: 0xf2c14a, desc: 'big points, maximum growth' },
    cake:   { name: 'Cake',   emoji: '🎂', pts: 65, grow: 12, color: 0xff9ab8, desc: 'big points, maximum growth' },
    burger: { name: 'Burger', emoji: '🍔', pts: 80, grow: 16, color: 0xd8913a, desc: 'big points, maximum growth' },
    donut:  { name: 'Donut',  emoji: '🍩', pts: 60, grow: 12, color: 0xff7ab8, desc: 'big points, maximum growth' },
  },
  mover: {
    mouse: { name: 'Mouse', emoji: '🐭', pts: 40, grow: 8, color: 0xb8b8c4, speed: 0.40, heal: 12 },
    frog:  { name: 'Frog',  emoji: '🐸', pts: 45, grow: 9, color: 0x4ccf4c, speed: 0.50, heal: 15 },
    bug:   { name: 'Bug',   emoji: '🐞', pts: 30, grow: 6, color: 0xd8281e, speed: 0.45, heal: 8 },
    crab:  { name: 'Crab',  emoji: '🦀', pts: 50, grow: 9, color: 0xe8281e, speed: 0.38, bite: 10, flee: false },
  },
};

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
    animals: [['turtle', 7], ['seagull', 8], ['fish', 4]],
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
    sky: 0x9fd8ff, fog: 0xc4e8ff, fogNear: 28, fogFar: 75,
    hemi: 1.0, hemiSky: 0xdff2ff, hemiGround: 0x4b6a38, sun: 2.6, sunColor: 0xfff4dc,
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

// ── Extra places (variants of the base themes above) ───────────────────────────
const base = key => THEMES.find(t => t.key === key);
THEMES.push(
  { ...base('hills'), key: 'farm', name: 'Sunny Farm', emoji: '🚜', card: ['#f3d56a', '#8aa84a'],
    ground: { a: '#9ccc58', b: '#c7c455', high: '#d4cf62', bank: '#c9b27a', bed: '#5a6b4a', cliff: '#7aa24a', rock: '#8a8a80' },
    hills: { amp: 1.1, freq: 0.06 }, rivers: [{ axis: 'z', pos: 0.62, amp: 2.5, freq: 0.1, width: 2, bridges: 2 }],
    obstacles: [['hay', 22], ['tree', 12], ['house', 3], ['bush', 14], ['log', 6], ['flowerBush', 8], ['bench', 3]],
    decor: { tufts: ['#8cb84a', '#b4c458', '#7aa83e'], tuftCount: 1800, flowers: 300, pebbles: 60, reeds: true },
    outside: ['hay', 'tree', 'house', 'bush'], outsideCount: 220,
    animals: [['sheep', 10], ['dog', 3], ['bird', 6], ['butterfly', 8], ['duck', 3], ['fish', 2]] },
  { ...base('hills'), key: 'village', name: 'Hilltop Village', emoji: '🏘️', card: ['#ffb877', '#7a8ab0'],
    hills: { amp: 3.2, freq: 0.055 }, rise: 8, rivers: [{ axis: 'x', pos: 0.58, amp: 4, freq: 0.09, width: 3, bridges: 2 }],
    roads: [{ axis: 'z', pos: 0.28, width: 3 }], lamps: true,
    obstacles: [['house', 14], ['tree', 14], ['bench', 8], ['mailbox', 8], ['bush', 14], ['flowerBush', 10], ['rock', 8]],
    decor: { tufts: ['#7cc24a', '#98d860'], tuftCount: 1600, flowers: 420, pebbles: 100, reeds: true },
    outside: ['tree', 'pine', 'house', 'bush'], outsideCount: 240,
    animals: [['cat', 4], ['dog', 4], ['pigeon', 8], ['bird', 5], ['butterfly', 6], ['duck', 3], ['fish', 2]] },
  { ...base('rocky'), key: 'canyon', name: 'Red Canyon', emoji: '🏜️', card: ['#e0905a', '#7a3a28'],
    ground: { a: '#c98a55', b: '#bb7a4a', high: '#dca070', bank: '#a8603a', bed: '#6a3a28', cliff: '#a4553a', rock: '#8a5a48' },
    hills: { amp: 2.4, freq: 0.07 }, rise: 10, water: { color: 0x3a98b8, opacity: 0.85 },
    rivers: [{ axis: 'x', pos: 0.5, amp: 5, freq: 0.1, width: 3, bridges: 2 }],
    obstacles: [['rock', 34], ['boulder', 16], ['cactus', 16], ['stump', 6], ['bush', 6]],
    decor: { tufts: ['#b8a050', '#a89040'], tuftCount: 500, pebbles: 700, reeds: true },
    outside: ['boulder', 'rock', 'cactus', 'rock'], outsideCount: 260,
    animals: [['lizard', 8], ['eagle', 3], ['goat', 3], ['rabbit', 3], ['fish', 1]] },
  { ...base('meadow'), key: 'autumn', name: 'Autumn Forest', emoji: '🍂', card: ['#e8a040', '#7a3a1a'],
    ground: { a: '#b89040', b: '#a87c34', high: '#c8a050', bank: '#a8885a', bed: '#5a4a38', cliff: '#8a6a30', rock: '#8a8478' },
    water: { color: 0x4a8ab0, opacity: 0.85 },
    rivers: [{ axis: 'z', pos: 0.45, amp: 5, freq: 0.12, width: 3, bridges: 2 }],
    obstacles: [['autumnTree', 32], ['pine', 10], ['stump', 10], ['log', 10], ['autumnBush', 18], ['rock', 8]],
    decor: { tufts: ['#c89a3a', '#b8842c', '#d8a848'], tuftCount: 1800, flowers: 160, pebbles: 100, reeds: true },
    outside: ['autumnTree', 'autumnTree', 'pine', 'autumnBush'], outsideCount: 300,
    animals: [['deer', 4], ['squirrel', 6], ['rabbit', 4], ['bird', 6], ['duck', 3], ['fish', 2]] },
  { ...base('road'), key: 'city', name: 'City Streets', emoji: '🏙️', card: ['#8a9ab8', '#2a3048'],
    ground: { a: '#8a9486', b: '#7e887c', high: '#98a294', bank: '#9a9a8a', bed: '#4a5048', cliff: '#6a7468', rock: '#8a8a8a' },
    hills: { amp: 0.25, freq: 0.06 }, rise: 3, rivers: [],
    roads: [{ axis: 'z', pos: 0.26, width: 4 }, { axis: 'z', pos: 0.72, width: 4 }, { axis: 'x', pos: 0.3, width: 4 }, { axis: 'x', pos: 0.74, width: 4 }],
    traffic: 5, lamps: true,
    obstacles: [['house', 24], ['car', 10], ['cone', 18], ['bench', 8], ['mailbox', 8], ['tree', 10]],
    decor: { tufts: ['#7a9a5a', '#8aaa68'], tuftCount: 500, flowers: 60, pebbles: 100 },
    outside: ['house', 'house', 'tree', 'house'], outsideCount: 260,
    animals: [['cat', 5], ['dog', 3], ['pigeon', 12], ['bird', 4]] },
  { ...base('jungle'), key: 'swamp', name: 'Misty Swamp', emoji: '🐸', card: ['#7a9a4a', '#2a3a22'],
    ground: { a: '#5a7a3a', b: '#4e6e32', high: '#6a8a42', bank: '#6a6a3a', bed: '#2a3a28', cliff: '#3a5a2a', rock: '#6a7060' },
    hills: { amp: 0.5, freq: 0.07 }, rise: 5, water: { color: 0x4a7a4a, opacity: 0.9 },
    rivers: [{ axis: 'x', pos: 0.38, amp: 5, freq: 0.13, width: 4, bridges: 2 }, { axis: 'z', pos: 0.68, amp: 4, freq: 0.12, width: 3, bridges: 2 }],
    obstacles: [['jungleTree', 22], ['log', 14], ['bamboo', 12], ['rock', 8], ['bush', 16], ['stump', 8]],
    decor: { tufts: ['#4a6a30', '#5a7a38'], tuftCount: 1600, ferns: 300, flowers: 60, mushrooms: 120, lily: true, reeds: true },
    outside: ['jungleTree', 'bamboo', 'jungleTree', 'rock'], outsideCount: 300,
    animals: [['frog', 10], ['turtle', 4], ['bird', 4], ['butterfly', 5], ['duck', 4], ['fish', 4]] },
  { ...base('road'), key: 'highway', name: 'Busy Highway', emoji: '🚗', card: ['#9ab0c8', '#3a3a48'],
    hills: { amp: 0.6, freq: 0.06 }, rivers: [{ axis: 'x', pos: 0.62, amp: 2, freq: 0.1, width: 3, bridges: 'roads' }],
    roads: [{ axis: 'z', pos: 0.28, width: 5 }, { axis: 'z', pos: 0.7, width: 5 }, { axis: 'x', pos: 0.2, width: 4 }],
    traffic: 7, lamps: true,
    obstacles: [['car', 6], ['cone', 20], ['tree', 14], ['bush', 12], ['house', 3], ['mailbox', 4]],
    outside: ['tree', 'house', 'tree', 'bush'], outsideCount: 200,
    animals: [['dog', 3], ['pigeon', 8], ['bird', 5], ['duck', 3], ['fish', 2]] },
  { ...base('snow'), key: 'alps', name: 'Alpine Lake', emoji: '🏔️', card: ['#cfe6f6', '#3a5a78'],
    ground: { a: '#e8f0f6', b: '#d8e4ee', high: '#ffffff', bank: '#a8b8a0', bed: '#5a7088', cliff: '#c0d0dc', rock: '#7a8898' },
    hills: { amp: 3.0, freq: 0.06 }, rise: 11,
    rivers: [{ axis: 'z', pos: 0.5, amp: 6, freq: 0.1, width: 4, bridges: 2 }],
    obstacles: [['snowPine', 26], ['pine', 14], ['iceRock', 12], ['rock', 14], ['boulder', 6]],
    outside: ['snowPine', 'pine', 'boulder', 'snowPine'], outsideCount: 300,
    animals: [['goat', 6], ['eagle', 3], ['whiteRabbit', 4], ['bird', 3], ['fish', 2]], snowfall: 0 },
  { ...base('shore'), key: 'island', name: 'Tropical Island', emoji: '🏝️', card: ['#ffd36a', '#1fa0c8'],
    hills: { amp: 1.0, freq: 0.07 }, rise: 6,
    rivers: [{ axis: 'x', pos: 0.4, amp: 5, freq: 0.1, width: 4, bridges: 2 }, { axis: 'z', pos: 0.7, amp: 4, freq: 0.11, width: 3, bridges: 2 }],
    obstacles: [['palm', 30], ['umbrella', 8], ['sandcastle', 6], ['rock', 12], ['cactus', 4]],
    decor: { tufts: ['#8cc060', '#a8c870'], tuftCount: 700, flowers: 160, shells: 300, pebbles: 160, reeds: true },
    outside: ['palm', 'palm', 'rock'], outsideCount: 260,
    animals: [['turtle', 6], ['seagull', 8], ['parrot', 4], ['fish', 4]] },
);
// cave and temple carry their own lighting
base('cave').fixedMood = true;
base('temple').fixedMood = true;

// ── trees of every size, big animals, crocodiles and crabs ─────────────────────
for (const T of THEMES) {
  const o = (T.obstacles || []).map(e => [...e]);
  const n = k => (o.find(e => e[0] === k) || [0, 0])[1];
  if (n('tree')) o.push(['bigTree', Math.max(3, Math.round(n('tree') * .22))], ['smallTree', Math.round(n('tree') * .5)]);
  if (n('autumnTree')) o.push(['bigAutumnTree', Math.max(3, Math.round(n('autumnTree') * .22))], ['smallTree', Math.round(n('autumnTree') * .4)]);
  if (n('jungleTree')) o.push(['bigTree', 5], ['smallTree', 6]);
  if (n('pine') || n('snowPine')) o.push(['bigPine', 4]);
  if (o.length) T.obstacles = o;
}
const BIG_ANIMALS = {
  meadow: [['elephant', 1]], jungle: [['elephant', 2], ['giraffe', 1]], hills: [['bear', 1]], rocky: [['bear', 1]], canyon: [['giraffe', 1], ['elephant', 1]],
  farm: [['elephant', 1]], island: [['elephant', 1]], temple: [['elephant', 1]], alps: [['bear', 1]], autumn: [['bear', 1]], swamp: [['elephant', 1]], shore: [['elephant', 1]],
};
const CROCS = { jungle: 2, swamp: 3, island: 2, meadow: 1, farm: 1, autumn: 1, shore: 1, canyon: 1, village: 1, hills: 1 };
const CRABS = {};      // crabs are now small animals you can eat (they bite if you pass close)
for (const T of THEMES) {
  if (BIG_ANIMALS[T.key]) T.animals = [...(T.animals || []), ...BIG_ANIMALS[T.key]];
  T.crocs = CROCS[T.key] || 0;      // bite when you get close to the water
  T.crabs = CRABS[T.key] || 0;      // red crabs on the sand
}

// ── Times of day and weather ───────────────────────────────────────────────────
//  sky colours feed the sky dome (skyTop → skyMid → skyHor); everything else tweaks lights / fog / effects.
export const MOODS = {
  noon: { label: '☀️ Bright noon' },
  morning: {
    label: '🌅 Sunny morning', sky: 0x7fc4ff, skyTop: 0x4a9ae8, skyHor: 0xffe2b0, fog: 0xffe6c4, fogNear: 26, fogFar: 72,
    hemi: 1.1, hemiSky: 0xfff0d4, hemiGround: 0x5a7a40, sun: 3.0, sunColor: 0xffdca0, sunLow: true, sunDisc: 0xfff0c0,
  },
  sunset: {
    label: '🌇 Golden sunset', sky: 0xff9a60, skyTop: 0x2c3a86, skyMid: 0xd9607a, skyHor: 0xffa040, fog: 0xff9a6a, fogNear: 24, fogFar: 74,
    hemi: 0.8, hemiSky: 0xffb48a, hemiGround: 0x4a3a40, sun: 2.4, sunColor: 0xff8a3c, sunLow: true, sunDisc: 0xffb060, sunBig: true,
  },
  night: {
    label: '🌙 Starry night', sky: 0x070c26, skyTop: 0x02051a, skyHor: 0x1c2c60, fog: 0x0e1838, fogNear: 12, fogFar: 50,
    hemi: 0.4, hemiSky: 0x6a7ad0, hemiGround: 0x101828, sun: 0.7, sunColor: 0x9aaaff, dark: true, stars: true, moon: true, sunDisc: 0xdfe8ff,
    fireflies: 150, fenceTorches: 7, bridgeTorches: true, embers: true,
  },
  rain: {
    label: '🌧️ Heavy rain', sky: 0x6a7682, skyTop: 0x48525e, skyHor: 0x98a5b0, fog: 0x98a5b0, fogNear: 10, fogFar: 46,
    hemi: 0.85, hemiSky: 0xb8c4d0, hemiGround: 0x3a4a40, sun: 0.9, sunColor: 0xd0dae6, rain: 1600, groundDim: 0.8, sunLow: false,
  },
  storm: {
    label: '⛈️ Thunderstorm', sky: 0x363e48, skyTop: 0x1a2028, skyHor: 0x56616d, fog: 0x56616d, fogNear: 8, fogFar: 40,
    hemi: 0.6, hemiSky: 0x8a98a8, hemiGround: 0x2a3a30, sun: 0.5, sunColor: 0xb0c0d8, rain: 2800, wind: 1, lightning: true, groundDim: 0.7, sunLow: false,
  },
};

/** Final environment of a level: base place + per-level overrides + time-of-day / weather. */
export function themeFor(L) {
  const T = THEMES[L.map];
  const mood = T.fixedMood ? null : (L.mood || 'noon');
  return {
    ...T, ...(L.over || {}), ...(mood ? MOODS[mood] : {}),
    mood: mood || (T.key === 'cave' ? 'cave' : 'night'),
    moodLabel: mood ? MOODS[mood].label : (T.key === 'cave' ? '🔥 Torch-lit cave' : '🌙 Starry night'),
  };
}

// ── Potions ────────────────────────────────────────────────────────────────────
// ordered by when they are introduced (two in level 1, one more with each level)
const ORDER = ['fast', 'heal', 'slow', 'magnet', 'invisible', 'mushroom', 'reverse', 'sword', 'burn', 'devil'];
const fruitsFor = i => ORDER.slice(0, Math.min(ORDER.length, 2 + i));

// what each level asks for: any mix of fruit, special foods and runaway critters (all must be done)
// every level needs a pile of normal food, plus an extra target (special foods, animals or both)
const GOALS = [
  { fruit: 12, special: 1 }, { fruit: 14, mover: 2 }, { fruit: 15, special: 2 }, { fruit: 16, mover: 3 }, { fruit: 17, special: 2, mover: 2 },
  { fruit: 18, mover: 3 }, { fruit: 19, special: 3 }, { fruit: 20, mover: 4 }, { fruit: 21, special: 3, mover: 3 }, { fruit: 22, special: 4 },
  { fruit: 23, mover: 4 }, { fruit: 24, special: 4, mover: 3 }, { fruit: 25, special: 5 }, { fruit: 26, mover: 5 }, { fruit: 27, special: 4, mover: 4 },
  { fruit: 28, special: 5, mover: 3 }, { fruit: 29, special: 5, mover: 5 }, { fruit: 30, special: 6, mover: 4 }, { fruit: 32, special: 6, mover: 5 }, { fruit: 35, special: 7, mover: 6 },
];

//        place      mood       size apples special slimes speed  over
const SPEC = [
  ['meadow',     'morning', 56,  8, 1, 0, .165, { rivers: [{ axis: 'x', pos: 0.56, amp: 1.5, freq: 0.08, width: 3, bridges: 3 }] }],
  ['jungle',     'noon',    58,  9, 1, 0, .160, { rivers: [{ axis: 'x', pos: 0.5, amp: 6.5, freq: 0.15, width: 3, bridges: 2 }], name: 'Curvy Jungle River' }],
  ['shore',      'morning', 60, 10, 1, 1, .156, {}],
  ['hills',      'sunset',  60, 11, 2, 1, .152, { rivers: [], hills: { amp: 3.6, freq: 0.05 }, rise: 9, name: 'Sunset Hills' }],
  ['road',       'noon',    62, 12, 2, 1, .148, { traffic: 4 }],
  ['rocky',      'rain',    64, 13, 2, 2, .146, { rivers: [{ axis: 'x', pos: 0.45, amp: 5, freq: 0.14, width: 3, bridges: 1 }] }],
  ['playground', 'noon',    60, 14, 2, 2, .144, { rivers: [] }],
  ['village',    'sunset',  66, 15, 2, 2, .142, {}],
  ['snow',       'noon',    66, 16, 3, 2, .140, {}],
  ['cave',       null,      68, 17, 3, 3, .138, {}],
  ['farm',       'morning', 68, 18, 3, 3, .136, {}],
  ['canyon',     'sunset',  72, 20, 3, 3, .134, {}],
  ['autumn',     'rain',    72, 21, 3, 3, .132, {}],
  ['city',       'night',   74, 22, 4, 3, .130, {}],
  ['swamp',      'storm',   76, 24, 4, 4, .128, {}],
  ['highway',    'noon',    78, 25, 4, 4, .126, {}],
  ['temple',     null,      80, 26, 4, 4, .124, {}],
  ['alps',       'storm',   84, 28, 5, 4, .122, {}],
  ['island',     'sunset',  88, 30, 5, 5, .120, {}],
  ['meadow',     'storm',   96, 35, 5, 5, .118, {
    name: 'Grand Valley', emoji: '🏞️', card: ['#9ad65e', '#2a3a58'], hills: { amp: 2.8, freq: 0.055 }, rise: 9,
    rivers: [{ axis: 'x', pos: 0.62, amp: 6, freq: 0.1, width: 4, bridges: 'roads' }, { axis: 'z', pos: 0.3, amp: 5, freq: 0.1, width: 3, bridges: 2 }],
    roads: [{ axis: 'z', pos: 0.7, width: 4 }, { axis: 'x', pos: 0.3, width: 4 }], traffic: 5, lamps: true,
    obstacles: [['tree', 24], ['bigTree', 8], ['smallTree', 14], ['house', 6], ['car', 6], ['cone', 10], ['bush', 20], ['rock', 14], ['hay', 8]],
    outside: ['tree', 'house', 'pine', 'bush'] }],
];
export const LEVELS = SPEC.map(([key, mood, size, , , enemies, , over], i) => ({
  map: THEMES.findIndex(t => t.key === key), mood, over, size, enemies, fruits: fruitsFor(i),
  interval: i < 10 ? .25 - i * .002 : .23 - (i - 10) * .005,       // seconds per step: levels 1-10 stay calm, then it speeds up a little
  goals: GOALS[i], target: GOALS[i].fruit || 0, special: GOALS[i].special || 0, mover: GOALS[i].mover || 0,
}));
