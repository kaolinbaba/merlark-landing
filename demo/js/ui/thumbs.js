// demo/js/ui/thumbs.js
// Video artwork for the fictional channel. 24 thumbnails were generated for this demo (GPT Image, via Codex);
// the rest use a procedural cover in the same palette. Cut-down Shorts reuse their source episode's art.

import { h } from './dom.js';
import { formatTime } from '../data/derive.js';

const ART = new Set(['v01', 'v02', 'v03', 'v04', 'v05', 'v06', 'v07', 'v08', 'v09', 'v10', 'v12', 'v13', 'v14', 'v15', 'v16', 'v17', 'v19', 'v20', 'v23', 'v24', 'v25', 'v26', 'v27', 'v30']);
const CUT = { v31: 'v27', v32: 'v28' };

export function thumbSrc(v) {
  const id = CUT[v.id] || v.id;
  return ART.has(id) ? new URL(`../../../assets/img/thumbs/${id}.webp`, import.meta.url).href : null;
}

// A night chart plate: petrol wash, a low warm moon, ivory contour lines and one amber route (no text, no faces).
function cover(v) {
  const seed = [...v.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const r = (n) => ((seed >>> (n * 3)) % 97) / 97;
  const id = `cv${v.id}`;
  const contours = Array.from({ length: 7 }, (_, i) => h('path', {
    d: `M-10 ${22 + i * 9 + r(i) * 6} C 40 ${12 + i * 10 + r(i + 1) * 16}, 110 ${34 + i * 8 - r(i + 2) * 16}, 170 ${18 + i * 10 + r(i + 3) * 8}`,
    stroke: '#f3ebdc', 'stroke-opacity': 0.1 + (i % 3) * 0.06, 'stroke-width': 0.6, fill: 'none' }));
  return h('svg', { viewBox: '0 0 160 90', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' },
    h('defs', null, h('linearGradient', { id, x1: 0, y1: 0, x2: 0.4, y2: 1 }, h('stop', { offset: 0, 'stop-color': '#1d4048' }), h('stop', { offset: 1, 'stop-color': '#0a1517' })),
      h('radialGradient', { id: `${id}m` }, h('stop', { offset: 0, 'stop-color': '#ecc08a', 'stop-opacity': 0.75 }), h('stop', { offset: 1, 'stop-color': '#d9a565', 'stop-opacity': 0 }))),
    h('rect', { width: 160, height: 90, fill: `url(#${id})` }),
    h('circle', { cx: 30 + r(4) * 100, cy: 30 + r(5) * 12, r: 26, fill: `url(#${id}m)` }),
    contours,
    h('path', { d: `M12 ${70 - r(6) * 20} C 50 ${40 + r(7) * 20}, 90 ${60 - r(8) * 25}, 150 ${26 + r(9) * 20}`, stroke: '#d9a565', 'stroke-width': 1.3, 'stroke-dasharray': '3 3', fill: 'none' }),
    h('path', { d: `M0 ${70 + r(6) * 8} Q 60 ${62 + r(7) * 10} 100 ${70 + r(8) * 6} T 160 ${66 + r(9) * 8} V90 H0Z`, fill: '#080c0d', opacity: 0.8 }));
}

// Thumbnail with its duration, like the platform shows it. Decorative: titles are always given next to it.
export function thumb(v, w = 112, { duration = true } = {}) {
  const src = thumbSrc(v);
  return h('span', { class: `thumb ${src ? '' : 'thumb-cover'}`, style: { width: `${w}px` }, 'data-video': v.id },
    src ? h('img', { src, alt: '', loading: 'lazy', decoding: 'async', width: 640, height: 360 }) : cover(v),
    v.format === 'short' ? h('span', { class: 'thumb-tag' }, 'Short') : null,
    duration && w >= 64 ? h('span', { class: 'thumb-dur num' }, formatTime(v.dur)) : null);
}
