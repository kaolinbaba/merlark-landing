// demo/js/ui/flow.js
// Shared motion system: seeded smooth noise, envelopes and a pause/hidden-aware clock
// (used by the atmosphere in ribbons.js, the landing scene and the demo overview).
// Decorative only: nothing here reads or changes analytical data.

// ---------- seeded smooth noise ----------
function hash3(x, y, z, seed) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 144665) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;
// 3D value noise in [-1, 1]; continuous in every axis, so motion evolves instead of switching direction.
export function noise3(x, y, z, seed = 7) {
  const xi = Math.floor(x); const yi = Math.floor(y); const zi = Math.floor(z);
  const xf = fade(x - xi); const yf = fade(y - yi); const zf = fade(z - zi);
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz, seed);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), xf); const x10 = lerp(c(0, 1, 0), c(1, 1, 0), xf);
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), xf); const x11 = lerp(c(0, 1, 1), c(1, 1, 1), xf);
  return lerp(lerp(x00, x10, yf), lerp(x01, x11, yf), zf) * 2 - 1;
}
// Deterministic pseudo-random sequence (for spawn positions, jitter).
export function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- envelopes ----------
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smooth = (v) => { const t = clamp01(v); return t * t * t * (t * (t * 6 - 15) + 10); }; // smootherstep, zero velocity at both ends
export const ramp = (t, a, b) => smooth((t - a) / (b - a));
// Rise from `lo` to 1 between a→b, hold, then settle back to `lo` between c→d. Continuous, no snaps.
export const swell = (t, a, b, c, d, lo = 0) => lo + (1 - lo) * (ramp(t, a, b) - ramp(t, c, d));
export const bump = (t, center, width) => Math.exp(-(((t - center) / width) ** 2));
// Sum of slow sines with unrelated periods: drifts without an obvious repeat.
export const drift = (t, periods, phase = 0) => periods.reduce((s, p, i) => s + Math.sin((t / p) * Math.PI * 2 + phase * (i + 1.7)) / (i + 1), 0) / periods.reduce((s, _p, i) => s + 1 / (i + 1), 0);

// Durations (ms) and easing shared by JS and CSS (see tokens.css): press · panel · emphasis.
export const DUR = { press: 150, panel: 480, emphasis: 1000 };
export const EASE_SETTLE = 'cubic-bezier(0.16, 1, 0.3, 1)'; // critically damped feel, no overshoot
export const EASE_FLOW = 'cubic-bezier(0.45, 0, 0.2, 1)';

// ---------- clock ----------
// Advances only while running and visible; each frame's step is capped, so resuming never jumps ahead.
export class Clock {
  constructor(onFrame, { maxStep = 1 / 15 } = {}) {
    this.t = 0; this.running = false; this.onFrame = onFrame; this.maxStep = maxStep; this.raf = 0; this.last = 0; this.loop = this.loop.bind(this);
    this.onVisibility = () => { if (document.hidden) this.stopLoop(); else if (this.running) this.startLoop(); };
    document.addEventListener('visibilitychange', this.onVisibility);
  }
  dispose() { this.pause(); document.removeEventListener('visibilitychange', this.onVisibility); }
  loop(now) {
    const dt = Math.min(this.maxStep, Math.max(0, (now - this.last) / 1000));
    this.last = now; this.t += dt;
    this.onFrame(this.t, dt);
    this.raf = requestAnimationFrame(this.loop);
  }
  startLoop() { cancelAnimationFrame(this.raf); this.last = performance.now(); this.raf = requestAnimationFrame(this.loop); }
  stopLoop() { cancelAnimationFrame(this.raf); this.raf = 0; }
  play() { this.running = true; if (!document.hidden) this.startLoop(); }
  pause() { this.running = false; this.stopLoop(); }
  set(t) { this.t = t; this.onFrame(t, 0); }
}
