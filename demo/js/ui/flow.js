// demo/js/ui/flow.js
// Shared motion system: seeded smooth noise, envelopes, a pause/hidden-aware clock, and the
// "orbital flow" Canvas 2D field used behind the landing and the demo.
// Decorative only: nothing here reads or changes analytical data.

import { reducedMotion } from './dom.js';

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

// ---------- orbital flow field ----------
const TEAL = [54, 226, 208]; const VIOLET = [168, 155, 255]; const AMBER = [255, 181, 71];

export function mountFlowField({ density = 1, calmSelector = '[data-calm]' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'flow-field'; canvas.setAttribute('aria-hidden', 'true');
  const starfield = document.querySelector('.starfield');
  (starfield ? starfield.after(canvas) : document.body.prepend(canvas));
  const ctx = canvas.getContext('2d', { alpha: true });
  let W = 0; let H = 0; let dpr = 1; let particles = []; let calmRects = []; let calm = 1; let calmTarget = 1;
  const ripples = [];
  const rnd = seeded(20261021);

  const lights = [
    { c: TEAL, a: 0.11, fx: 0.72, fy: 0.18, r: 0.55, p: [47, 29], pb: 11.3, ph: 0.3 },
    { c: VIOLET, a: 0.09, fx: 0.15, fy: 0.55, r: 0.5, p: [58, 33], pb: 13.7, ph: 2.1 },
    { c: TEAL, a: 0.06, fx: 0.45, fy: 0.95, r: 0.6, p: [39, 23], pb: 9.1, ph: 4.4 },
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    const n = Math.round((W < 700 ? 16 : W < 1100 ? 34 : 52) * density);
    particles = Array.from({ length: n }, (_, i) => spawn(i, true));
    measureCalm();
  }
  function spawn(i, anywhere) {
    const z = 0.35 + rnd() * 0.65;
    const p = { i, z, x: rnd() * W, y: rnd() * H, trail: [], hue: rnd() < 0.78 ? TEAL : rnd() < 0.7 ? VIOLET : AMBER };
    if (!anywhere) { const e = Math.floor(rnd() * 4); if (e === 0) p.x = -10; else if (e === 1) p.x = W + 10; else if (e === 2) p.y = -10; else p.y = H + 10; }
    return p;
  }
  function measureCalm() {
    calmRects = [...document.querySelectorAll(calmSelector)].map((el) => el.getBoundingClientRect()).filter((r) => r.width && r.bottom > 0 && r.top < H);
  }
  const inCalm = (x, y) => calmRects.some((r) => x > r.left - 24 && x < r.right + 24 && y > r.top - 24 && y < r.bottom + 24);

  function frame(t, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // The background settles when a panel or dialog is the focus of attention.
    calmTarget = document.body.classList.contains('has-overlay') ? 0.35 : 1;
    calm += (calmTarget - calm) * Math.min(1, dt * 1.6);
    const small = W < 700; const amp = small ? 0.05 : 0.09;
    // 1. Broad light fields: positions drift on 23–58 s periods, radius breathes on 9–14 s.
    for (const L of lights) {
      const x = (L.fx + amp * drift(t, L.p, L.ph)) * W;
      const y = (L.fy + amp * drift(t + 13, [L.p[1], L.p[0]], L.ph + 1)) * H;
      const r = L.r * Math.max(W, H) * (1 + 0.07 * Math.sin((t / L.pb) * Math.PI * 2 + L.ph));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${L.c}, ${L.a * (0.75 + 0.25 * calm)})`); g.addColorStop(1, `rgba(${L.c}, 0)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // 2. Particles follow one slowly evolving flow field with a faint orbital bias around the upper right.
    const cx = W * 0.68; const cy = H * 0.32; const scale = 0.0016;
    for (let k = 0; k < particles.length; k++) {
      let p = particles[k];
      const ang = noise3(p.x * scale, p.y * scale, t * 0.018, 11) * Math.PI * 1.6;
      const ox = -(p.y - cy); const oy = p.x - cx; const ol = Math.hypot(ox, oy) || 1;
      const speed = (small ? 7 : 11) * p.z;
      p.x += (Math.cos(ang) * 0.82 + (ox / ol) * 0.35) * speed * dt;
      p.y += (Math.sin(ang) * 0.82 + (oy / ol) * 0.35) * speed * dt;
      p.trail.push(p.x, p.y); if (p.trail.length > 44) p.trail.splice(0, 2);
      if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) { particles[k] = p = spawn(p.i, false); continue; }
      const quiet = inCalm(p.x, p.y) ? 0.25 : 1;
      const base = (0.22 + 0.42 * p.z) * quiet * calm * (0.85 + 0.15 * Math.sin(t * 0.21 + k));
      // Trail: fades toward its tail.
      for (let j = 2; j < p.trail.length; j += 2) {
        const a = (j / p.trail.length) * base * 0.8;
        ctx.strokeStyle = `rgba(${p.hue}, ${a})`; ctx.lineWidth = 0.7 + p.z * 0.8;
        ctx.beginPath(); ctx.moveTo(p.trail[j - 2], p.trail[j - 1]); ctx.lineTo(p.trail[j], p.trail[j + 1]); ctx.stroke();
      }
      ctx.fillStyle = `rgba(${p.hue}, ${base})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 0.9 + p.z * 1.3, 0, Math.PI * 2); ctx.fill();
    }
    // 3. Ripples where a meaningful sample event happened: soft expansion, gradual fade.
    for (let k = ripples.length - 1; k >= 0; k--) {
      const r = ripples[k]; const age = (r.age += dt) / 1.8;
      if (age >= 1) { ripples.splice(k, 1); continue; }
      const e = 1 - (1 - age) ** 3; const a = (1 - age) ** 2;
      const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 30 + 110 * e);
      g.addColorStop(0, `rgba(${r.c}, ${0.10 * a})`); g.addColorStop(1, `rgba(${r.c}, 0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(r.x, r.y, 30 + 110 * e, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(${r.c}, ${0.28 * a})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, 10 + 70 * e, 0, Math.PI * 2); ctx.stroke();
    }
  }

  const clock = new Clock(frame, { maxStep: 1 / 20 });
  function sync() {
    if (reducedMotion()) { clock.pause(); clock.set(clock.t || 17); } else clock.play();
  }
  resize(); sync();
  let rz;
  const onResize = () => { clearTimeout(rz); rz = setTimeout(() => { resize(); if (reducedMotion()) clock.set(clock.t); }, 200); };
  const onScroll = () => measureCalm();
  const onObserve = (e) => {
    if (reducedMotion() || document.hidden) return;
    ripples.push({ x: e.detail.x, y: e.detail.y, age: 0, c: e.detail.amber ? AMBER : TEAL });
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('merlark:motion', sync);
  document.addEventListener('merlark:observe', onObserve);
  // Calm zones move with layout; re-measure occasionally, but never while the tab is hidden or motion is off.
  const calmTimer = setInterval(() => { if (!document.hidden && clock.running) measureCalm(); }, 1500);
  // Teardown for completeness (the field is mounted once per page).
  return {
    clock,
    dispose() {
      clock.dispose(); clearInterval(calmTimer); clearTimeout(rz);
      window.removeEventListener('resize', onResize); window.removeEventListener('scroll', onScroll);
      document.removeEventListener('merlark:motion', sync); document.removeEventListener('merlark:observe', onObserve);
      canvas.remove();
    },
  };
}
