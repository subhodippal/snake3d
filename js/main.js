// ───────────────────────────────────────────────────────────
//  App bootstrap + UI (menus, HUD, saving)
// ───────────────────────────────────────────────────────────
import { Game } from './game.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { LEVELS, FRUITS, FOODS, themeFor } from './levels.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const hex = n => '#' + n.toString(16).padStart(6, '0');
const coarse = matchMedia('(pointer: coarse)').matches;

// ── Save data ───────────────────────────────────────────────
const SAVE_KEY = 'slither3d.save.v1';
const DEFAULT_SAVE = { orient: 'auto', unlocked: 1, stars: Array(LEVELS.length).fill(0), levelBest: Array(LEVELS.length).fill(0), best: { endless: 0, time: 0 }, control: 'swipe', sound: true, quality: 'high' };
function loadSave() {
  try { return { ...DEFAULT_SAVE, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; }
  catch (_) { return { ...DEFAULT_SAVE }; }
}
const save = loadSave();
for (const k of ['stars', 'levelBest']) { save[k] = [...(save[k] || [])]; while (save[k].length < LEVELS.length) save[k].push(0); }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} };

// ── Core objects ────────────────────────────────────────────
const sfx = new Sfx();
sfx.on = save.sound;
const input = new Input($('#game'));
input.bindDpad($('#dpad'));

let inGame = false;
let currentCfg = null;
let selectMode = 'adventure';

const ui = {
  toast(text, color = '#fff') {
    const el = $('#toast');
    el.textContent = text; el.style.setProperty('--c', color);
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  },
  popup(text, x, y, color = '#fff') {
    const el = document.createElement('div');
    el.className = 'popup'; el.textContent = text; el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.color = color;
    $('#popups').appendChild(el);
    setTimeout(() => el.remove(), 950);
  },
  flash(color) {
    const el = $('#flash');
    el.style.background = color; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  },
  countdown(v) {
    const el = $('#countdown');
    el.textContent = v; el.classList.remove('anim'); void el.offsetWidth; el.classList.add('anim');
    if (v === 'GO!') $('#intro').classList.add('hidden');
  },
  atmos(mood) {
    const el = $('#atmos');
    if (el) el.dataset.mood = mood || 'noon';
  },
  blind(on) { document.body.classList.toggle('blind', !!on); },
  onEnd(res) { showResult(res); },
};

let game;
try {
  game = new Game($('#game'), input, sfx, ui);
} catch (err) {
  $('#loading').innerHTML = '<div class="panel"><h2>WebGL not available 😢</h2><p>Your browser or device does not support WebGL, which this game needs.</p></div>';
  throw err;
}
game.setQuality(save.quality);
window.slither = game; // handy for debugging in the console
game.load({ mode: 'demo', level: (Math.random() * LEVELS.length) | 0 });

// ── Screens ─────────────────────────────────────────────────
function show(id) {
  $$('.screen').forEach(s => s.classList.toggle('show', s.id === id));
}
function setInGame(on) {
  inGame = on;
  $('#hud').classList.toggle('hidden', !on);
  const pad = on && save.control === 'buttons';
  $('#dpad').classList.toggle('hidden', !pad);
  document.body.classList.toggle('dpad-on', pad);
  input.enabled = on;
  if (typeof syncEye === 'function') syncEye();
  if (!on) { input.releaseAll(); input.clear(); }
}

function goMenu() {
  setInGame(false);
  $('#intro').classList.add('hidden');
  game.load({ mode: 'demo', level: (Math.random() * LEVELS.length) | 0 });
  show('menu');
}

function startGame(cfg) {
  currentCfg = cfg;
  if (coarse && save.orient !== 'auto' && typeof applyOrientation === 'function') applyOrientation(true);
  show(null);
  setInGame(true);
  game.load(cfg);
  hudCache = {};
  showIntro(cfg);
}

function showIntro(cfg) {
  const el = $('#intro');
  let html;
  if (cfg.mode === 'adventure') {
    const L = LEVELS[cfg.level], T = themeFor(L);
    const prev = cfg.level > 0 ? LEVELS[cfg.level - 1].fruits : [];
    const fresh = L.fruits.filter(f => !prev.includes(f));
    html = `<h3>Level ${cfg.level + 1} · ${T.emoji} ${T.name}</h3>
      <p>${goalText(L.goals)}</p>
      <p class="tip">Then find the hidden 🚪 door to escape!</p>
      <p class="mood">${T.moodLabel}</p>
      <p class="tip">${themeTip(T)}</p>
      ${L.enemies ? `<p>👾 Watch out for ${L.enemies} slime${L.enemies > 1 ? 's' : ''}!</p>` : ''}
      ${dangers(game) ? `<p class="tip">⚠️ ${dangers(game)}</p>` : ''}
      ${fresh.length ? `<div class="new">New: ${fresh.map(f => `${FRUITS[f].emoji} ${FRUITS[f].name}`).join(' · ')}</div>` : ''}`;
  } else {
    const T = themeFor(LEVELS[cfg.map]);
    html = cfg.mode === 'endless'
      ? `<h3>∞ Endless · ${T.emoji} ${T.name}</h3><p class="mood">${T.moodLabel}</p><p>Grow as long as you can. It gets faster!</p><p class="tip">${themeTip(T)}</p>`
      : `<h3>⏱ Time Attack · ${T.emoji} ${T.name}</h3><p class="mood">${T.moodLabel}</p><p>Score as much as you can in 90 seconds. Apples add +1.5s.</p><p class="tip">${themeTip(T)}</p>`;
  }
  const hint = coarse
    ? (save.control === 'buttons' ? 'D-pad to turn · hold a button or 💨 to sprint' : 'Swipe to turn · tap & hold to sprint')
    : 'Arrows / WASD to turn · hold direction or Space to sprint';
  el.innerHTML = html + `<div class="hint">${hint}</div>`;
  el.classList.remove('hidden');
}

/** The biting animals and burning/poisonous ground of the level that was just loaded. */
const dangers = g => g.dangerSummary().join(' · ');

function goalText(g) {
  const parts = [];
  if (g.fruit) parts.push(`Eat <b>🍎 ${g.fruit}</b> normal food`);
  if (g.special) parts.push(`eat <b>★ ${g.special}</b> special food${g.special > 1 ? 's' : ''} (pizza, cake, burger, donut)`);
  if (g.mover) parts.push(`catch <b>🐭 ${g.mover}</b> small animal${g.mover > 1 ? 's' : ''}`);
  const t = parts.join(', ');
  return t.charAt(0) === 'e' ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

function themeTip(T) {
  const tips = [];
  if (T.rivers && T.rivers.length) tips.push('🌉 Cross rivers on bridges');
  if (T.traffic) tips.push('🚗 Watch out for traffic on the roads!');
  else if (T.roads) tips.push('🛣️ Roads are safe');
  if (T.hills && T.hills.amp >= 2.4) tips.push('⛰️ Hills and slopes ahead');
  if (T.lightning) tips.push('⚡ Lightning storm');
  tips.push('💥 Every bump costs health');
  return tips.slice(0, 3).join(' · ');
}

// ── Level select ────────────────────────────────────────────
function renderLevels(mode) {
  selectMode = mode;
  $('#levels-title').textContent = mode === 'adventure' ? 'Select Level' : 'Choose a Map';
  $('#levels-sub').textContent = mode === 'adventure'
    ? 'Clear a level to unlock the next one.'
    : mode === 'endless' ? `Best: ${save.best.endless}` : `Best: ${save.best.time}`;
  const grid = $('#level-grid');
  grid.innerHTML = '';
  LEVELS.forEach((L, i) => {
    const T = themeFor(L);
    const locked = mode === 'adventure' && i >= save.unlocked;
    const b = document.createElement('button');
    b.className = 'lvl' + (locked ? ' locked' : '');
    b.style.background = `linear-gradient(rgba(0,0,0,.12), rgba(0,0,0,.42)), linear-gradient(160deg, ${T.card[0]}, ${T.card[1]})`;
    const stars = save.stars[i] || 0;
    b.innerHTML = `<span class="num">${mode === 'adventure' ? 'Level ' + (i + 1) : 'Map ' + (i + 1)}</span>
      <span class="emo">${T.emoji}</span><span class="nm">${T.name}</span><span class="mood">${T.moodLabel}</span>
      ${mode === 'adventure' ? `<span class="st">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span><span class="goal">${L.goals.fruit ? '🍎' + L.goals.fruit + ' ' : ''}${L.goals.special ? '★' + L.goals.special + ' ' : ''}${L.goals.mover ? '🐭' + L.goals.mover : ''}</span>` : ''}`;
    b.addEventListener('click', () => {
      if (locked) { sfx.hurt(); return; }
      sfx.click();
      startGame(mode === 'adventure' ? { mode, level: i } : { mode, map: i });
    });
    grid.appendChild(b);
  });
  show('levels');
}

// ── How to play ─────────────────────────────────────────────
$('#special-list').innerHTML = Object.values(FOODS.special).map(f =>
  `<div class="fruit" style="--c:${hex(f.color)}"><span class="e">${f.emoji}</span><div><b>${f.name}</b><span>Special food · ${f.desc}</span></div></div>`
).join('');
$('#fruit-list').innerHTML = Object.values(FRUITS).map(f =>
  `<div class="fruit" style="--c:${f.color === 0xffffff ? '#ff6bf0' : hex(f.color)}"><span class="e">${f.emoji}</span><div><b>${f.name}</b><span>${f.desc}</span></div></div>`
).join('');

// ── Screen orientation (phones): portrait, landscape or auto ─────────────────
const isPortrait = () => innerHeight > innerWidth;
function updateRotateHint() {
  const want = save.orient, mismatch = coarse && want !== 'auto' && (want === 'portrait') !== isPortrait();
  $('#rotate').classList.toggle('hidden', !mismatch);
  if (mismatch) $('#rotate-text').textContent = want === 'landscape' ? 'Rotate your phone sideways' : 'Hold your phone upright';
}
async function applyOrientation(userGesture = false) {
  const o = screen.orientation;
  try {
    if (save.orient === 'auto') o?.unlock?.();
    else if (o?.lock && userGesture) {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.().catch(() => {});
      await o.lock(save.orient).catch(() => {});
    }
  } catch (_) { /* not supported: the rotate hint covers it */ }
  updateRotateHint();
}
function setOrient(v) { save.orient = v; persist(); syncSettings(); applyOrientation(true); }
$$('#menu-orient button').forEach(b => b.addEventListener('click', () => { sfx.click(); setOrient(b.dataset.val); }));
$$('#set-orient button').forEach(b => b.addEventListener('click', () => { sfx.click(); setOrient(b.dataset.val); }));
addEventListener('resize', updateRotateHint);
addEventListener('orientationchange', () => setTimeout(updateRotateHint, 150));

// ── Settings ────────────────────────────────────────────────
function syncSettings() {
  $$('#set-control button').forEach(b => b.classList.toggle('on', b.dataset.val === save.control));
  $$('#set-orient button, #menu-orient button').forEach(b => b.classList.toggle('on', b.dataset.val === save.orient));
  $$('#set-sound button').forEach(b => b.classList.toggle('on', (b.dataset.val === 'on') === save.sound));
  $$('#set-quality button').forEach(b => b.classList.toggle('on', b.dataset.val === save.quality));
}
$$('#set-control button').forEach(b => b.addEventListener('click', () => { save.control = b.dataset.val; persist(); syncSettings(); sfx.click(); }));
$$('#set-sound button').forEach(b => b.addEventListener('click', () => { save.sound = b.dataset.val === 'on'; sfx.on = save.sound; persist(); syncSettings(); sfx.click(); }));
$$('#set-quality button').forEach(b => b.addEventListener('click', () => { save.quality = b.dataset.val; game.setQuality(save.quality); persist(); syncSettings(); sfx.click(); }));
syncSettings();

// ── Results ─────────────────────────────────────────────────
function showResult(res) {
  setInGame(false);
  $('#intro').classList.add('hidden');
  let title, isBest = false;
  const next = $('#btn-next');
  next.classList.add('hidden');

  if (res.mode === 'adventure') {
    if (res.kind === 'won') {
      save.stars[res.level] = Math.max(save.stars[res.level] || 0, res.stars);
      save.unlocked = Math.min(LEVELS.length, Math.max(save.unlocked, res.level + 2));
      isBest = res.score > (save.levelBest[res.level] || 0);
      save.levelBest[res.level] = Math.max(save.levelBest[res.level] || 0, res.score);
      title = res.level === LEVELS.length - 1 ? '🏆 You beat every level!' : 'Level Complete!';
      if (res.level < LEVELS.length - 1) next.classList.remove('hidden');
    } else title = 'Game Over';
  } else {
    const key = res.mode;
    isBest = res.score > save.best[key];
    save.best[key] = Math.max(save.best[key], res.score);
    title = res.kind === 'over' ? "⏱ Time's up!" : 'Game Over';
  }
  persist();

  $('#result-title').textContent = title;
  const st = $('#result-stars');
  if (res.mode === 'adventure' && res.kind === 'won') {
    st.innerHTML = [0, 1, 2].map(i => `<span class="${i < res.stars ? '' : 'off'}" style="animation-delay:${.15 + i * .18}s">★</span>`).join('');
  } else st.innerHTML = res.kind === 'dead' ? '<span>💀</span>' : '';
  const best = res.mode === 'adventure' ? save.levelBest[res.level] : save.best[res.mode];
  $('#result-stats').innerHTML = `
    <div><b>${res.score}</b><span>Score${isBest ? ' · NEW BEST!' : ''}</span></div>
    <div><b>${best}</b><span>Best</span></div>
    <div><b>${res.food}</b><span>Apples eaten</span></div>
    <div><b>${res.length}</b><span>Length</span></div>`;
  show('result');
}

// ── Button actions ──────────────────────────────────────────
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  sfx.unlock();
  sfx.click();
  const act = b.dataset.act;
  switch (act) {
    case 'adventure': case 'endless': case 'time': renderLevels(act); break;
    case 'howto': show('howto'); break;
    case 'settings': syncSettings(); show('settings'); break;
    case 'back': show(inGame ? 'pause' : 'menu'); break;
    case 'resume': show(null); game.resume(); break;
    case 'restart': startGame(currentCfg); break;
    case 'menu': goMenu(); break;
    case 'next': startGame({ mode: 'adventure', level: Math.min(LEVELS.length - 1, currentCfg.level + 1) }); break;
    case 'fullscreen': {
      const d = document.documentElement;
      if (!document.fullscreenElement) (d.requestFullscreen || d.webkitRequestFullscreen)?.call(d);
      else document.exitFullscreen?.();
      break;
    }
    case 'install': installApp(); break;
    case 'reset-progress':
      if (confirm('Reset all level progress and best scores?')) {
        Object.assign(save, { unlocked: 1, stars: Array(LEVELS.length).fill(0), levelBest: Array(LEVELS.length).fill(0), best: { endless: 0, time: 0 } });
        persist();
      }
      break;
  }
});

function doPause() {
  if (!inGame) return;
  if (game.state === 'paused') { show(null); game.resume(); return; }
  if (game.pause()) show('pause');
}
$('#btn-pause').addEventListener('click', () => { sfx.click(); doPause(); });

// Three views: classic 3D · tilted 3D · snake-eye (first person, works in portrait and landscape)
const VIEW_ORDER = ['3d', 'tilt', 'fps'];
const VIEW_LABEL = { '3d': ['🎥', '3D'], tilt: ['📐', 'TILT'], fps: ['👁️', 'FPS'] };
function syncEye() { $('#fps-eye').classList.toggle('on', inGame && game.fps); }
function syncViewBtn() {
  syncEye();
  const [ico, txt] = VIEW_LABEL[game.viewMode] || VIEW_LABEL['3d'];
  $('#view-ico').textContent = ico;
  $('#view-txt').textContent = txt;
}
function toggleView() {
  const order = VIEW_ORDER;
  game.setView(order[(Math.max(0, order.indexOf(game.viewMode)) + 1) % order.length]);
  save.view = game.viewMode; persist(); syncViewBtn(); sfx.click();
  if (game.viewMode === 'fps') ui.toast('👁️ Snake-eye view · ◀ ▶ turn left / right', '#bfe8ff');
  else if (game.viewMode === 'tilt') ui.toast('📐 Tilted 3D view', '#bfe8ff');
  else ui.toast('🎥 Classic 3D view', '#bfe8ff');
}
$('#btn-view').addEventListener('click', toggleView);
$('#btn-rescue').addEventListener('click', () => game.rescue());
addEventListener('keydown', e => { if (e.code === 'KeyR' && inGame && !e.repeat) game.rescue(); });
addEventListener('keydown', e => { if (e.code === 'KeyV' && inGame && !e.repeat) toggleView(); });
game.setView(save.view); syncViewBtn();
input.onPause = doPause;
document.addEventListener('visibilitychange', () => { if (document.hidden && inGame && game.state !== 'paused') { if (game.pause()) show('pause'); } });
addEventListener('pointerdown', () => sfx.unlock(), { passive: true });
addEventListener('keydown', () => sfx.unlock());
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());

// ── PWA: service worker + install button ────────────────────
const isStandalone = () => matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let installPrompt = null;

if ('serviceWorker' in navigator && window.isSecureContext) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Service worker failed:', err)));
}
if (isStandalone()) {
  $('#btn-fullscreen').classList.add('hidden'); // already full-screen as an app
} else if (isIOS) {
  $('#btn-install').classList.remove('hidden'); // iOS has no install prompt – we show instructions
}
addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPrompt = e;
  $('#btn-install').classList.remove('hidden');
});
addEventListener('appinstalled', () => {
  installPrompt = null;
  $('#btn-install').classList.add('hidden');
  $('#install-hint').classList.add('hidden');
});

async function installApp() {
  const hint = $('#install-hint');
  if (installPrompt) {
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') $('#btn-install').classList.add('hidden');
    installPrompt = null;
    return;
  }
  hint.textContent = isIOS
    ? 'In Safari, tap the Share button ⬆️ then “Add to Home Screen” ➕'
    : 'Use your browser menu ⋮ and choose “Install app” or “Add to Home screen”.';
  hint.classList.toggle('hidden');
}

// ── HUD ─────────────────────────────────────────────────────
let hudCache = {};
let effectsT = 0;
function setText(id, txt) { if (hudCache[id] !== txt) { hudCache[id] = txt; $(id).textContent = txt; } }

function updateHud(dt) {
  const s = game.getStats();
  const T = s.theme;
  setText('#hud-level', s.mode === 'adventure' ? `Lv ${s.level + 1} · ${T.emoji} ${T.name}` : `${s.mode === 'endless' ? '∞ Endless' : '⏱ Time'} · ${T.emoji} ${T.name}`);
  setText('#hud-score', String(s.score));
  if (hudCache.health !== s.health) {
    hudCache.health = s.health;
    const fill = $('#hud-health');
    fill.style.width = s.health + '%';
    fill.style.backgroundPosition = `${100 - s.health}% 0`;
    $('#hud-health-text').textContent = Math.ceil(s.health);
  }
  $('#btn-rescue').classList.toggle('hidden', !s.canRescue);
  $('#hud-combo').classList.toggle('hidden', !(s.combo >= 2));
  if (s.combo >= 2) setText('#hud-combo', `🔥 ×${s.comboMul}`);
  const prog = $('#hud-prog'), G = s.goals;
  prog.classList.toggle('hidden', !G);
  const goalLine = !G ? '' : s.doorOpen ? '🚪 Reach the gate!' : '🎯 ' + goalText(G).replace(/<\/?b>/g, '').replace(/ \(pizza.*?\)/, '');
  if (hudCache.goalLine !== goalLine) { hudCache.goalLine = goalLine; setText('#hud-goal', goalLine); }
  $('#hud-goal').classList.toggle('go', !!s.doorOpen);
  if (G) {
    const have = { fruit: s.food, special: s.special, mover: s.mover };
    let need = 0, got = 0;
    for (const k in G) { need += G[k]; got += Math.min(have[k], G[k]); }
    const pct = need ? got / need : 1;
    if (hudCache.prog !== pct) { hudCache.prog = pct; $('#hud-prog-fill').style.width = pct * 100 + '%'; $('#hud-prog-head').style.left = pct * 100 + '%'; }
    const pill = (id, icon, k) => {
      const el = $(id);
      el.classList.toggle('hidden', !G[k]);
      if (G[k]) { setText(id, `${icon} ${Math.min(have[k], G[k])}/${G[k]}`); el.classList.toggle('done', have[k] >= G[k]); }
    };
    pill('#hud-food', '🍎', 'fruit'); pill('#hud-special', '★', 'special'); pill('#hud-mover', '🐭', 'mover');
  } else {
    $('#hud-mover').classList.add('hidden');
    $('#hud-food').classList.remove('hidden', 'done'); $('#hud-special').classList.remove('hidden', 'done');
    setText('#hud-food', `🍎 ${s.food}`);
    setText('#hud-special', `📏 ${s.length}`);
  }
  const timer = $('#hud-timer');
  timer.classList.toggle('hidden', s.timeLeft === null);
  if (s.timeLeft !== null) setText('#hud-timer', `⏱ ${Math.ceil(s.timeLeft)}`);
  $('#sprint-badge').classList.toggle('on', !!s.sprint);

  effectsT -= dt;
  if (effectsT <= 0) {
    effectsT = .1;
    $('#hud-effects').innerHTML = s.effects.map(e => {
      const F = FRUITS[e.key];
      return `<div class="chip" style="--c:${hex(F.color)}"><span class="e">${F.emoji}</span>${F.name}<i style="width:${Math.max(0, e.left / e.dur * 100)}%"></i></div>`;
    }).join('');
  }
}

// ── Loop ────────────────────────────────────────────────────
let last = performance.now();
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000);
  last = now;
  game.update(dt);
  if (inGame) updateHud(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// reveal
const ld = $('#loading');
ld.classList.add('gone');
setTimeout(() => ld.classList.remove('show'), 500);
show('menu');

updateRotateHint();   // after everything above is initialised
