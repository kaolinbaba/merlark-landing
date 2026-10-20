// assets/js/ambient.js
// Quiet analytical environment behind the landing: observation grid, slowly flowing signal paths,
// occasional traces between video-like nodes, chart fragments and localized light when a sample event
// is processed. Purely decorative (aria-hidden). Pauses while the tab is hidden; static when motion is off.

import { h, reducedMotion } from '../../demo/js/ui/dom.js';

// Deterministic layout (no randomness): node positions as fractions of the viewport.
const NODES = [[0.06, 0.22], [0.14, 0.62], [0.27, 0.88], [0.44, 0.12], [0.58, 0.9], [0.72, 0.18], [0.86, 0.55], [0.94, 0.3], [0.9, 0.86], [0.03, 0.9]];
const PAIRS = [[0, 1], [3, 5], [6, 7], [1, 2], [5, 6], [4, 8], [9, 2], [0, 3]];

export function mountAmbient() {
  const root = h('div', { class: 'ambient', 'aria-hidden': 'true' });
  const svg = h('svg', { class: 'ambient-svg' });
  const glow = h('div', { class: 'ambient-glows' });
  root.append(svg, glow);
  document.body.prepend(root);

  let W = 0; let H = 0; let nodes = [];
  function draw() {
    W = window.innerWidth; H = window.innerHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    const small = W < 700;
    const paths = [
      `M-40 ${H * 0.3} C ${W * 0.25} ${H * 0.18}, ${W * 0.45} ${H * 0.52}, ${W + 40} ${H * 0.34}`,
      `M-40 ${H * 0.76} C ${W * 0.3} ${H * 0.92}, ${W * 0.62} ${H * 0.58}, ${W + 40} ${H * 0.8}`,
      `M${W * 0.18} -40 C ${W * 0.12} ${H * 0.4}, ${W * 0.36} ${H * 0.6}, ${W * 0.3} ${H + 40}`,
    ].slice(0, small ? 2 : 3);
    nodes = NODES.slice(0, small ? 5 : NODES.length).map(([fx, fy]) => [fx * W, fy * H]);
    const wave = (x0, y0, w) => Array.from({ length: 24 }, (_, i) => `${i ? 'L' : 'M'}${(x0 + (i / 23) * w).toFixed(1)} ${(y0 + Math.sin(i * 0.9) * 6 + Math.sin(i * 0.35) * 4).toFixed(1)}`).join(' ');
    svg.replaceChildren(
      ...paths.map((d, i) => h('path', { d, class: `amb-path p${i}`, pathLength: 100 })),
      ...nodes.map(([x, y], i) => h('rect', { x: x - 7, y: y - 4.5, width: 14, height: 9, rx: 2, class: `amb-node n${i % 3}` })),
      small ? null : h('path', { d: wave(W * 0.66, H * 0.68, 130), class: 'amb-wave' }),
      small ? null : h('path', { d: wave(W * 0.08, H * 0.44, 100), class: 'amb-wave w2' }),
    );
  }
  draw();
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(draw, 200); });

  // Occasional analytical event: a trace between two video nodes (deterministic order).
  let k = 0;
  setInterval(() => {
    if (document.hidden || reducedMotion() || window.innerWidth < 700) return;
    const [a, b] = PAIRS[k++ % PAIRS.length];
    if (!nodes[a] || !nodes[b]) return;
    const [x1, y1] = nodes[a]; const [x2, y2] = nodes[b];
    const t = h('path', { d: `M${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - 60} ${x2} ${y2}`, class: 'amb-trace', pathLength: 100 });
    svg.append(t);
    setTimeout(() => t.remove(), 3200);
  }, 5200);

  // Localized light when a sample observation is processed (dispatched by the replay).
  document.addEventListener('merlark:observe', (e) => {
    if (reducedMotion() || document.hidden) return;
    const g = h('i', { class: 'amb-glow', style: { left: `${e.detail.x}px`, top: `${e.detail.y}px` } });
    glow.append(g);
    setTimeout(() => g.remove(), 1600);
  });
}

// Section effects become "live" only while visible, so one focal point animates at a time.
export function liveWhenVisible(selector) {
  const els = document.querySelectorAll(selector);
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('live')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => en.target.classList.toggle('live', en.isIntersecting)), { threshold: 0.35 });
  els.forEach((el) => io.observe(el));
}
