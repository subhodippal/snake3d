// Tiny synthesized sound effects (WebAudio) – no audio files needed.
export class Sfx {
  constructor() { this.ctx = null; this.on = true; }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(f, d = 0.12, type = 'sine', v = 0.25, f2 = null, delay = 0) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + d + 0.05);
  }

  noise(d = 0.3, v = 0.3, freq = 1000, delay = 0) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const len = Math.floor(c.sampleRate * d);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = c.createGain(); g.gain.value = v;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  click()  { this.tone(720, 0.05, 'triangle', 0.12); }
  eat()    { this.tone(520, 0.09, 'square', 0.12, 1040); }
  special(){ [660, 880, 1320].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.18, null, i * 0.06)); }
  poison() { this.tone(320, 0.45, 'sawtooth', 0.18, 70); }
  hurt()   { this.tone(240, 0.18, 'square', 0.18, 110); }
  crash()  { this.noise(0.35, 0.5, 900); this.tone(160, 0.3, 'square', 0.18, 40); }
  bonk()   { this.tone(210, 0.14, 'sine', 0.22, 90); this.noise(0.1, 0.18, 500); }
  honk()   { this.tone(330, 0.28, 'sawtooth', 0.12); this.tone(415, 0.28, 'sawtooth', 0.1); }
  thunder(delay = 0) { this.noise(1.6, 0.7, 380, delay); this.tone(70, 1.1, 'sawtooth', 0.12, 28, delay); }
  potion() { [440, 660, 990, 1480].forEach((f, i) => this.tone(f, 0.16, 'sine', 0.14, null, i * 0.05)); }
  fire()   { this.noise(0.7, 0.55, 1600); this.tone(110, 0.7, 'sawtooth', 0.25, 40); }
  kill()   { this.tone(380, 0.16, 'square', 0.14, 1400); }
  shrink() { this.tone(900, 0.25, 'sine', 0.2, 300); }
  tick()   { this.tone(660, 0.08, 'sine', 0.18); }
  go()     { this.tone(1320, 0.25, 'sine', 0.22); }
  win()    { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.2, null, i * 0.11)); }
  lose()   { [440, 370, 311, 220].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.14, null, i * 0.18)); }
}
