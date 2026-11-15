// ───────────────────────────────────────────────────────────
//  Input: keyboard, swipe (touch / mouse drag), on-screen D-pad
//  Hold a direction (or the screen) to sprint.
// ───────────────────────────────────────────────────────────

export const DIRS = { up: { x: 0, z: -1 }, down: { x: 0, z: 1 }, left: { x: -1, z: 0 }, right: { x: 1, z: 0 } };
export const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};

const HOLD_KEY_MS = 170;   // hold a direction key this long -> sprint
const HOLD_TOUCH_MS = 240; // hold finger on screen this long -> sprint
const SWIPE_PX = 22;

export class Input {
  constructor(surface) {
    this.queue = [];
    this.reverse = false;
    this.enabled = false;
    this.heldKeys = new Map();
    this.boostKey = false;
    this.pointer = null;
    this.heldButton = null;
    this.boostButton = false;
    this.onPause = null;

    addEventListener('keydown', e => {
      const name = KEYMAP[e.code];
      if (name) {
        e.preventDefault();
        if (!e.repeat) { this.push(name); this.heldKeys.set(name, performance.now()); }
      } else if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault(); this.boostKey = true;
      } else if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
        this.onPause && this.onPause();
      }
    });
    addEventListener('keyup', e => {
      const name = KEYMAP[e.code];
      if (name) this.heldKeys.delete(name);
      if (e.code === 'Space' || e.code.startsWith('Shift')) this.boostKey = false;
    });
    addEventListener('blur', () => this.releaseAll());

    // Swipe + hold on the game surface (works with touch and mouse)
    surface.addEventListener('pointerdown', e => {
      if (this.pointer) return;
      this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, t0: performance.now() };
      try { surface.setPointerCapture(e.pointerId); } catch (_) {}
    });
    surface.addEventListener('pointermove', e => {
      const p = this.pointer;
      if (!p || p.id !== e.pointerId) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > SWIPE_PX) {
        this.push(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        p.x = e.clientX; p.y = e.clientY; p.t0 = performance.now();
      }
    });
    const up = e => { if (this.pointer && this.pointer.id === e.pointerId) this.pointer = null; };
    surface.addEventListener('pointerup', up);
    surface.addEventListener('pointercancel', up);
  }

  /** Wire up the on-screen D-pad buttons. */
  bindDpad(root) {
    root.querySelectorAll('[data-dir]').forEach(btn => {
      const name = btn.dataset.dir;
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        this.push(name);
        this.heldButton = { name, t0: performance.now() };
        btn.classList.add('active');
        try { btn.setPointerCapture(e.pointerId); } catch (_) {}
      });
      const rel = () => { btn.classList.remove('active'); if (this.heldButton && this.heldButton.name === name) this.heldButton = null; };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => btn.addEventListener(ev, rel));
    });
    const boost = root.querySelector('[data-boost]');
    if (boost) {
      boost.addEventListener('pointerdown', e => { e.preventDefault(); this.boostButton = true; boost.classList.add('active'); try { boost.setPointerCapture(e.pointerId); } catch (_) {} });
      const rel = () => { this.boostButton = false; boost.classList.remove('active'); };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => boost.addEventListener(ev, rel));
    }
  }

  map(name) { return this.reverse ? OPP[name] : name; }

  push(name) {
    if (!this.enabled) return;
    const d = this.map(name);
    const last = this.queue[this.queue.length - 1];
    if (last === d || this.queue.length >= 3) return;
    this.queue.push(d);
  }

  /** Next valid direction for the snake (never a 180° turn). */
  next(current) {
    while (this.queue.length) {
      const d = this.queue.shift();
      if (d !== current && d !== OPP[current]) return d;
    }
    return null;
  }

  isSprinting(current, now) {
    if (!this.enabled) return false;
    if (this.boostKey || this.boostButton) return true;
    for (const [name, t] of this.heldKeys) if (this.map(name) === current && now - t > HOLD_KEY_MS) return true;
    const b = this.heldButton;
    if (b && this.map(b.name) === current && now - b.t0 > HOLD_KEY_MS) return true;
    if (this.pointer && now - this.pointer.t0 > HOLD_TOUCH_MS) return true;
    return false;
  }

  clear() { this.queue.length = 0; }
  releaseAll() { this.heldKeys.clear(); this.boostKey = false; this.pointer = null; this.heldButton = null; this.boostButton = false; }
}
