// demo/js/ui/dom.js
// Tiny DOM helpers. Text is always set through textContent, never parsed as HTML.

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'text', 'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'title', 'tspan', 'pattern']);

export function h(tag, attrs, ...children) {
  const isSvg = SVG_TAGS.has(tag);
  const el = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k === 'value' && !isSvg) el.value = v;
      else if (k === 'checked' && !isSvg) el.checked = !!v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const mount = (el, ...children) => { clear(el); append(el, children); return el; };
export const qs = (sel, root = document) => root.querySelector(sel);

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Merlark symbol, inline so it inherits colour from CSS.
export function symbol(size = 28, small = size <= 28) {
  const w = small ? [6.5, 7.5, 5.6] : [4.5, 5, 4.2];
  return h('svg', { class: 'sym', width: size, height: size, viewBox: '0 0 64 64', fill: 'none', 'aria-hidden': 'true' },
    h('path', { class: 'orbit', d: 'M54.07 20.26A25 25 0 1 1 39.73 8.22', stroke: 'currentColor', 'stroke-width': w[0], 'stroke-linecap': 'round' }),
    h('path', { class: 'wings', d: 'M13.5 40C16.5 32.5 19.8 25 23.5 24.5C27.2 24 29.6 29.5 32 34.5C34.4 29.5 36.8 24 40.5 24.5C44.2 25 47.5 32.5 50.5 40', stroke: 'currentColor', 'stroke-width': w[1], 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    h('circle', { class: 'body', cx: 48.07, cy: 12.85, r: w[2], fill: 'currentColor' }));
}
export function wordmark(height = 20) {
  return h('svg', { class: 'wm', height, viewBox: '-1 0 169 44', width: Math.round((height * 169) / 44), fill: 'none', 'aria-hidden': 'true' },
    h('path', { d: 'M2 40V16M2 22A6 6 0 0 1 14 22V40M14 22A6 6 0 0 1 26 22V40 M35 28H59A12 12 0 1 0 55.5 36.5 M68 40V16M68 27A11 11 0 0 1 79 16 M88 4V40 M121 16V40M121 28A12 12 0 1 0 97 28A12 12 0 1 0 121 28 M130 40V16M130 27A11 11 0 0 1 141 16 M150 4V40M164 16L150 30M155.5 25L165 40', stroke: 'currentColor', 'stroke-width': height < 24 ? 5.4 : 4.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
}

// Minimal line icon set (24 grid, 1.75 stroke).
const ICONS = {
  bridge: 'M4 13a8 8 0 0 1 16 0M12 13l4-4M3 17h18',
  findings: 'M5 4h10l4 4v12H5zM14 4v5h5M8 13h8M8 17h5',
  monitor: 'M3 12h4l3-7 4 14 3-7h4',
  videos: 'M3 6h18v12H3zM10 9.5v5l4.5-2.5z',
  compare: 'M7 4v16M17 4v16M3 9h8M13 15h8',
  brief: 'M6 3h12v18l-6-4-6 4z',
  interventions: 'M4 12h6l2-6 2 12 2-6h4',
  script: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 1-2-2V4h-4v2L9 7 7 6l-2 4 2 1v2l-2 1 2 4 2-1 2 1v2h4v-2l2-1 2 1 2-4-2-1z',
  close: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  play: 'M7 5v14l11-7z',
  pause: 'M7 5h3v14H7zM14 5h3v14h-3z',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  copy: 'M8 8h11v11H8zM5 16V5h11',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  reset: 'M4 12a8 8 0 1 0 3-6.2M4 4v5h5',
  info: 'M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  check: 'M5 12l5 5 9-10',
  drag: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
};
export function icon(name, size = 18) {
  return h('svg', { class: 'icon', width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
    h('path', { d: ICONS[name] || ICONS.info, stroke: 'currentColor', 'stroke-width': 1.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
}
