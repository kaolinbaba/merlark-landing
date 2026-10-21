// demo/js/ui/ribbons.js
// The atmosphere behind landing and demo: the generated light-field image, slow refracted light ribbons
// that flow from lower left to upper right (Canvas 2D), and a few travelling signals. Decorative only.
// Pauses with the tab (Clock), draws one still frame when motion is off, follows the pointer slightly.

import { h, reducedMotion } from './dom.js';
import { Clock, noise3, seeded } from './flow.js';

const SEA = [143, 196, 180]; const IVORY = [243, 235, 220]; const AMBER = [217, 165, 101];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

// intensity: 1 on the landing, lower behind the demo's working surfaces.
export function mountAtmosphere({ intensity = 1, image = true } = {}) {
  const root = h('div', { class: 'atmos', 'aria-hidden': 'true' },
    image ? h('div', { class: 'atmos-img' }) : null, h('canvas', { class: 'atmos-canvas' }), h('div', { class: 'atmos-grain' }));
  document.body.prepend(root);
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const rnd = seeded(1021);
  let W = 0; let H = 0; let dpr = 1;
  const focus = { x: 0.72, y: 0.48, tx: 0.72, ty: 0.48, glow: 1, tglow: 1 };
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };

  // Ribbons: a centre line across the screen, a width that swells along it, and many fine strands inside.
  const ribbons = Array.from({ length: 5 }, (_, i) => ({
    y0: 0.62 + i * 0.1 + rnd() * 0.06, y1: 0.02 + i * 0.13 + rnd() * 0.05,
    amp: 0.05 + rnd() * 0.05, width: 0.05 + rnd() * 0.07, strands: 9 + Math.round(rnd() * 7),
    speed: 0.07 + rnd() * 0.05, phase: rnd() * 10, alpha: (0.065 + rnd() * 0.04) * intensity, seed: i * 17 + 3,
    signals: Array.from({ length: 1 + (i % 2) }, () => ({ u: rnd(), v: 0.04 + rnd() * 0.035, strand: rnd() })),
  }));

  function resize() {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
  }

  // Centre line and half-width of ribbon r at position u (0..1 along its length), time t.
  function centre(r, u, t) {
    const x = -0.12 + u * 1.24;
    const base = r.y0 + (r.y1 - r.y0) * u;
    const y = base + Math.sin(u * 3.1 + r.phase + t * r.speed * 2.2) * r.amp + noise3(u * 2.2, t * r.speed, r.seed) * r.amp * 0.8;
    const half = r.width * (0.45 + 0.55 * Math.sin(Math.PI * u)) * (0.75 + 0.25 * noise3(u * 3, t * 0.04, r.seed + 5));
    return [x, y, half];
  }

  function frame(t) {
    const k = 0.06;
    focus.x += (focus.tx - focus.x) * k; focus.y += (focus.ty - focus.y) * k; focus.glow += (focus.tglow - focus.glow) * k;
    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
    root.style.setProperty('--px', ptr.x.toFixed(3)); root.style.setProperty('--py', ptr.y.toFixed(3));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.translate(ptr.x * -14, ptr.y * -10);
    ctx.globalCompositeOperation = 'lighter';
    const seg = W < 700 ? 32 : 56;
    for (const r of ribbons) {
      for (let s = 0; s < r.strands; s++) {
        const off = (s / (r.strands - 1)) * 2 - 1;
        const wobble = s * 0.37;
        ctx.beginPath();
        for (let j = 0; j <= seg; j++) {
          const u = j / seg;
          const [x, y, half] = centre(r, u, t + wobble * 0.6);
          const yy = y + off * half + Math.sin(u * 9 + wobble + t * 0.35) * half * 0.12;
          if (j) ctx.lineTo(x * W, yy * H); else ctx.moveTo(x * W, yy * H);
        }
        const edge = 1 - Math.abs(off) * 0.7;
        const g = ctx.createLinearGradient(0, 0, W, 0);
        const fx = Math.max(0.05, Math.min(0.95, focus.x));
        const a = r.alpha * edge;
        g.addColorStop(0, `rgba(${SEA},${a * 0.5})`);
        g.addColorStop(Math.max(0, fx - 0.3), `rgba(${mix(SEA, IVORY, 0.4)},${a})`);
        g.addColorStop(fx, `rgba(${AMBER},${a * (1 + focus.glow * 1.4)})`);
        g.addColorStop(Math.min(1, fx + 0.28), `rgba(${mix(IVORY, SEA, 0.3)},${a * 0.9})`);
        g.addColorStop(1, `rgba(${SEA},${a * 0.4})`);
        ctx.strokeStyle = g; ctx.lineWidth = s % 4 === 0 ? 1.4 : 0.8;
        ctx.stroke();
      }
      // Travelling signals ride the ribbon toward the upper right.
      for (const sg of r.signals) {
        const u = (sg.u + t * sg.v) % 1;
        const off = sg.strand * 2 - 1;
        const pts = [0, 0.012, 0.024, 0.036].map((d) => { const uu = Math.max(0, u - d); const [x, y, half] = centre(r, uu, t); return [x * W, (y + off * half * 0.6) * H]; });
        const fade = Math.sin(Math.PI * u);
        ctx.strokeStyle = `rgba(${AMBER},${0.5 * fade * intensity})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        const [hx, hy] = pts[0];
        const rg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 14);
        rg.addColorStop(0, `rgba(${mix(AMBER, IVORY, 0.4)},${0.85 * fade * intensity})`); rg.addColorStop(1, `rgba(${AMBER},0)`);
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(hx, hy, 14, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Soft refracted pool of warm light at the current focal point.
    const fx = focus.x * W; const fy = focus.y * H; const R = Math.max(W, H) * 0.28;
    const pool = ctx.createRadialGradient(fx, fy, 0, fx, fy, R);
    pool.addColorStop(0, `rgba(${AMBER},${0.09 * focus.glow * intensity})`); pool.addColorStop(0.45, `rgba(${AMBER},${0.03 * focus.glow * intensity})`); pool.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = pool; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.globalCompositeOperation = 'source-over';
  }

  const clock = new Clock((t) => frame(t));
  const sync = () => { if (reducedMotion()) { clock.pause(); clock.set(clock.t || 18); } else clock.play(); };
  const onResize = () => { resize(); if (!clock.running) clock.set(clock.t); };
  const onPointer = (e) => { if (e.pointerType === 'touch') return; ptr.tx = (e.clientX / W) * 2 - 1; ptr.ty = (e.clientY / H) * 2 - 1; };
  resize(); clock.set(18); sync();
  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('merlark:motion', sync);
  return {
    // Scene hook: move the warm pool and the ribbons' amber band toward the current point of discovery.
    setFocus(x, y, glow = 1) { focus.tx = x; focus.ty = y; focus.tglow = glow; if (!clock.running) { focus.x = x; focus.y = y; focus.glow = glow; clock.set(clock.t); } },
    dispose() { clock.dispose(); window.removeEventListener('resize', onResize); window.removeEventListener('pointermove', onPointer); document.removeEventListener('merlark:motion', sync); root.remove(); },
  };
}
