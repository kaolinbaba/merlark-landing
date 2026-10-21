// demo/js/ui/thumbs.js
// Video covers for the made-up channel: flat pastel SVG cards — one colour block, one simple shape and a
// short title. The shape follows how the video opens, so patterns are visible at a glance:
// map pin = route-map opening, scroll = archival intro, star = question cold open, wave = shared series template.

import { h } from './dom.js';
import { formatTime } from '../data/derive.js';

const SHORT = {
  v01: 'Lighthouse dark', v02: 'The doldrums', v03: 'No crew aboard', v04: 'Erebus · 1', v05: 'Erebus · 2', v06: 'Erebus · 3',
  v07: 'One map error', v08: 'Vanished island', v09: 'Tea clippers', v10: 'Silent mutiny', v11: 'Rogue wave', v12: 'Northwest Passage',
  v13: 'The salt road', v14: 'Harbor fire', v15: 'Lost whalers · 1', v16: 'Lost whalers · 2', v17: 'Spice route', v18: 'Painted eyes',
  v19: 'Shipwreck coast', v20: 'Pearl divers', v21: 'Longitude', v22: 'Round portholes', v23: 'Into the fog', v24: 'Ghost lights',
  v25: 'Lost whalers · 3', v26: 'Reef by hand', v27: 'Iceberg patrol', v28: "Smugglers' tunnels", v29: 'Built to sink', v30: 'Racing the monsoon',
  v31: 'Iceberg in 50s', v32: 'Tunnels in 45s',
};

const kindOf = (v) => (v.template ? 'wave' : v.opening === 'map' ? 'pin' : v.opening === 'archive' ? 'scroll' : 'star');
const FILL = { pin: '#BFEBD6', scroll: '#DCD2FF', star: '#C6E4FF', wave: '#FFE8A3' };
const INK = '#1F1C2C';

function shape(kind) {
  const s = { fill: '#fff', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
  if (kind === 'pin') return h('g', { transform: 'translate(124 30)' }, h('path', { ...s, d: 'M0 -20a14 14 0 0 1 14 14c0 11-14 26-14 26s-14-15-14-26a14 14 0 0 1 14-14z' }), h('circle', { cx: 0, cy: -6, r: 5, fill: INK }));
  if (kind === 'scroll') return h('g', { transform: 'translate(124 30)' }, h('rect', { ...s, x: -16, y: -18, width: 32, height: 40, rx: 6 }), h('path', { d: 'M-8 -6h16M-8 2h16M-8 10h10', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }));
  if (kind === 'wave') return h('g', { transform: 'translate(124 30)' }, h('path', { d: 'M-22 -6q5.5-10 11 0t11 0 11 0 11 0M-22 8q5.5-10 11 0t11 0 11 0 11 0', fill: 'none', stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }));
  return h('g', { transform: 'translate(124 30)' }, h('path', { ...s, d: 'M0 -20l6 12 13 2-9.5 9 2.5 13L0 10l-12 6 2.5-13-9.5-9 13-2z' }));
}

function cover(v) {
  const kind = kindOf(v);
  const short = v.format === 'short';
  const words = (SHORT[v.id] || v.title).split(' ');
  // Two lines at most, balanced by length.
  let l1 = words.join(' '); let l2 = '';
  if (l1.length > 12 && words.length > 1) {
    let best = 1; let diff = Infinity;
    for (let i = 1; i < words.length; i++) { const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length); if (d < diff) { diff = d; best = i; } }
    l1 = words.slice(0, best).join(' '); l2 = words.slice(best).join(' ');
  }
  return h('svg', { viewBox: '0 0 160 90', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' },
    h('rect', { width: 160, height: 90, fill: short ? '#FFCDB8' : FILL[kind] }),
    shape(kind),
    h('text', { x: 12, y: l2 ? 62 : 76, class: 'cover-title', fill: INK }, l1),
    l2 ? h('text', { x: 12, y: 79, class: 'cover-title', fill: INK }, l2) : null);
}

// Cover with its duration, like the platform shows it. Decorative: titles are always given next to it.
export function thumb(v, w = 112, { duration = true } = {}) {
  return h('span', { class: `thumb thumb-${kindOf(v)}`, style: { width: `${w}px` }, 'data-video': v.id },
    cover(v),
    v.format === 'short' ? h('span', { class: 'thumb-tag' }, 'Short') : null,
    duration && w >= 64 ? h('span', { class: 'thumb-dur num' }, formatTime(v.dur)) : null);
}
