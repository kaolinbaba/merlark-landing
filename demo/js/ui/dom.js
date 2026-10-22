// demo/js/ui/dom.js
// Tiny DOM helpers, the brand marks, the icon set and the sliding segmented control.
// Text is always set through textContent, never parsed as HTML.

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'text', 'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'title', 'tspan', 'pattern']);

export function h(tag, attrs, ...children) {
  const isSvg = SVG_TAGS.has(tag);
  const el = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; }
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

// Motion is off when the OS asks for reduced motion OR the visitor turned it off with the site's motion toggle.
export const reducedMotion = () =>
  document.documentElement.classList.contains('motion-off') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- Brand marks (single geometry source; sites/landing-tests/build-brand.mjs writes the SVG files from it)
// Symbol: a small wing of three rounded feathers, each a rounded bar with one soft leading corner.
// `small` is the two-feather cut drawn at 24px and below, so the favicon stays a clear silhouette.
// A feather is [x, y, width, height, leading-corner radius, corner radius].
export const SYMBOL = {
  large: { transform: 'translate(32 32) rotate(-20) scale(0.9) translate(-32 -32)', feathers: [[6, 7.5, 52, 19, 14, 5], [16, 30.5, 40, 13, 8.5, 4.5], [26, 47.5, 26, 9, 5, 4]] },
  small: { transform: 'translate(32 32) rotate(-20) scale(0.94) translate(-32 -32)', feathers: [[5, 11, 54, 22, 16, 6], [17, 38, 40, 15, 10, 5]] },
};
export const featherPath = ([x, y, w, ht, R, r]) =>
  `M${x + r} ${y}H${x + w - R}A${R} ${R} 0 0 1 ${x + w} ${y + R}V${y + ht - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + ht}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + ht - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
export function symbol(size = 28, small = size <= 24) {
  const g = small ? SYMBOL.small : SYMBOL.large;
  return h('svg', { class: 'sym', width: size, height: size, viewBox: '0 0 64 64', 'aria-hidden': 'true' },
    h('g', { transform: g.transform }, g.feathers.map((f, i) => h('path', { class: `sym-f sym-f${i + 1}`, d: featherPath(f), fill: 'currentColor' }))));
}
// Wordmark: lowercase "merlark" in Fredoka SemiBold (OFL) with +3 units of tracking, drawn as outlines so it
// renders identically without the web font. Ink box starts at 0,0; the baseline sits at y = 72.
export const WORDMARK = { w: 367.7, h: 73.8, d: 'M7.4 72.9L7.4 72.9Q3.8 72.9 2.2 71.8Q0.6 70.7 0.3 69Q0 67.3 0 65.3L0 65.3L0 30.3Q0 28.3 0.4 26.6Q0.7 25 2.3 23.9Q3.9 22.9 7.6 22.9Q11.3 22.9 13 24.3L13 24.3Q14.5 25.6 14.7 28.4L14.7 28.4Q15.7 27.2 17.2 26L17.2 26Q18.8 24.7 21.0 23.8Q23.1 22.8 25.6 22.8L25.6 22.8Q28.9 22.8 31.6 23.8Q34.2 24.7 36.4 26.5Q38.5 28.4 40.1 31.2L40.1 31.2Q41.5 29.2 43.5 27.3Q45.5 25.4 48.3 24.1Q51 22.8 54.4 22.8L54.4 22.8Q60.2 22.8 64.3 25.8Q68.3 28.7 70.4 34.2Q72.5 39.7 72.5 47.5L72.5 47.5L72.5 65.4Q72.5 67.3 72.2 69.0Q71.8 70.8 70.2 71.8Q68.6 72.9 64.9 72.9Q61.2 72.9 59.7 71.8Q58.1 70.7 57.8 69.0Q57.4 67.2 57.4 65.3L57.4 65.3L57.4 47.4Q57.4 44.3 56.7 42.2Q56 40.1 54.6 38.9Q53.1 37.8 50.9 37.8L50.9 37.8Q48.6 37.8 47 38.9Q45.4 39.9 44.6 42.0Q43.8 44.2 43.8 47.5L43.8 47.5L43.8 65.4Q43.8 67.4 43.3 69.2Q42.8 70.9 41.2 72.0Q39.5 73 35.9 72.9Q32.3 72.8 30.8 71.7Q29.3 70.6 29 68.8Q28.7 67.1 28.7 65.3L28.7 65.3L28.7 47.4Q28.7 44.3 28 42.1Q27.3 40 25.9 38.9Q24.5 37.8 22.2 37.8L22.2 37.8Q19.7 37.8 18.1 39.1Q16.5 40.4 15.8 42.5Q15 44.7 15 47.4L15 47.4L15 65.4Q15 67.4 14.7 69.1Q14.3 70.8 12.7 71.8Q11.1 72.9 7.4 72.9ZM108.2 73.8L108.2 73.8Q101.2 73.8 96.2 71.5Q91.1 69.2 87.9 65.5Q84.7 61.7 83.1 57.1Q81.6 52.5 81.6 47.9L81.6 47.9Q81.6 40.4 85 34.6Q88.4 28.8 94.4 25.4Q100.4 22.1 108.2 22.1L108.2 22.1Q114 22.1 118.3 23.9Q122.5 25.8 125.3 28.8Q128 31.7 129.3 35.1Q130.7 38.5 130.7 41.6L130.7 41.6Q130.7 47.1 128.1 49.8Q125.4 52.4 121.3 52.4L121.3 52.4L97.5 52.4Q97.7 55 99.3 56.8Q101 58.6 103.5 59.6Q106 60.6 108.8 60.6L108.8 60.6Q111.2 60.6 113 60.4Q114.8 60.1 116.1 59.6Q117.4 59.2 118.5 58.8Q119.6 58.3 120.5 58Q121.3 57.7 122.1 57.6L122.1 57.6Q123.6 57.5 124.8 58.5Q126.1 59.4 127.1 61.3L127.1 61.3Q127.8 62.4 128.1 63.4Q128.3 64.4 128.3 65.4L128.3 65.4Q128.3 67.8 125.8 69.7Q123.4 71.6 119.0 72.7Q114.5 73.8 108.2 73.8ZM97.5 44.2L97.5 44.2L113.3 44.2Q114.9 44.2 115.7 43.6Q116.4 43.1 116.4 41.5L116.4 41.5Q116.4 39.7 115.3 38.4Q114.2 37 112.3 36.3Q110.5 35.5 108.1 35.5L108.1 35.5Q105 35.5 102.6 36.7Q100.2 37.9 98.8 39.9Q97.5 41.9 97.5 44.2ZM147.6 72.9L147.6 72.9Q143.9 72.9 142.3 71.8Q140.8 70.8 140.4 69Q140.1 67.2 140.1 65.3L140.1 65.3L140.1 30.4Q140.1 28.4 140.5 26.7Q140.9 25 142.4 23.9Q144 22.9 147.7 22.9L147.7 22.9Q151.2 22.9 152.8 23.8Q154.3 24.8 154.7 26L154.7 26Q154.9 26.7 155 27.3L155 27.3Q155.9 26.3 157.3 25.1L157.3 25.1Q158.8 24 160.9 23.2Q163.1 22.4 165.9 22.4L165.9 22.4Q167 22.4 168.3 22.5Q169.7 22.7 171.2 23.1Q172.6 23.6 173.8 24.3Q175 25.1 175.8 26.2Q176.5 27.3 176.5 28.9L176.5 28.9Q176.5 33 174.6 35.9Q172.7 38.7 169.8 38.7L169.8 38.7Q168.1 38.7 167.4 38.4Q166.7 38.1 166.3 37.8Q165.8 37.5 165.2 37.3Q164.6 37 163 37L163 37Q161.5 37 160.2 37.4Q158.8 37.8 157.7 38.6Q156.5 39.5 155.8 40.8Q155.2 42 155.2 43.5L155.2 43.5L155.2 65.5Q155.2 67.4 154.8 69.2Q154.5 70.9 152.9 71.9Q151.3 72.9 147.6 72.9ZM204.6 72.9L204.6 72.9Q200.5 72.9 197.4 72.5Q194.2 72 192.0 70.8Q189.7 69.6 188.3 67.5Q186.9 65.4 186.3 62.0Q185.6 58.7 185.6 53.8L185.6 53.8L185.6 7.6Q185.6 5.6 186.0 3.9Q186.3 2.2 187.9 1.1Q189.5 0 193.1 0L193.1 0Q196.7 0 198.3 1.1Q199.8 2.2 200.2 3.9Q200.6 5.6 200.6 7.6L200.6 7.6L200.6 53.1Q200.6 54.7 200.8 55.8Q200.9 56.8 201.4 57.4Q201.8 58 202.6 58.2Q203.4 58.4 204.7 58.4L204.7 58.4Q205.9 58.4 207.2 58.7Q208.4 59 209.3 60.5Q210.2 62 210.2 65.5L210.2 65.5Q210.2 69.1 209.3 70.7Q208.4 72.3 207.2 72.6Q205.9 72.9 204.6 72.9ZM259.3 72.8L259.3 72.8Q255.6 72.8 253.9 71.5Q252.1 70.2 252.1 68.3L252.1 68.3L253.1 66.6Q252.5 67.6 250.8 69.0Q249.1 70.5 246.4 71.7Q243.7 72.8 239.7 72.8L239.7 72.8Q235.1 72.8 231.0 70.8Q226.8 68.8 223.6 65.3Q220.4 61.7 218.6 57.2Q216.7 52.7 216.7 47.7L216.7 47.7Q216.7 42.8 218.6 38.4Q220.4 33.9 223.7 30.4Q226.9 27 231 25Q235.1 23 239.7 23L239.7 23Q243.4 23 246 24.0Q248.6 25.1 250.4 26.5Q252.1 27.9 253 29.2L253 29.2L252.2 27.8Q252.1 25.4 253.9 24.1Q255.6 22.9 259.4 22.9L259.4 22.9Q263 22.9 264.6 24Q266.1 25.1 266.4 26.9Q266.8 28.7 266.8 30.7L266.8 30.7L266.8 65.2Q266.8 67.1 266.4 68.9Q266.1 70.7 264.6 71.8Q263 72.8 259.3 72.8ZM241.9 57.9L241.9 57.9Q244.5 57.9 246.7 56.5Q248.8 55.2 250.1 52.9Q251.3 50.6 251.3 47.8L251.3 47.8Q251.3 44.9 250 42.6Q248.7 40.4 246.5 39.0Q244.3 37.7 241.7 37.7L241.7 37.7Q238.8 37.7 236.6 39.1Q234.3 40.5 233.0 42.8Q231.6 45.1 231.6 48L231.6 48Q231.6 50.7 233.0 53.0Q234.3 55.2 236.7 56.5Q239 57.9 241.9 57.9ZM285.3 72.9L285.3 72.9Q281.6 72.9 280.1 71.8Q278.5 70.8 278.1 69Q277.8 67.2 277.8 65.3L277.8 65.3L277.8 30.4Q277.8 28.4 278.2 26.7Q278.6 25 280.1 23.9Q281.7 22.9 285.4 22.9L285.4 22.9Q288.9 22.9 290.4 23.8Q292 24.8 292.4 26L292.4 26Q292.6 26.7 292.7 27.3L292.7 27.3Q293.6 26.3 295 25.1L295 25.1Q296.5 24 298.6 23.2Q300.8 22.4 303.6 22.4L303.6 22.4Q304.7 22.4 306.1 22.5Q307.4 22.7 308.8 23.1Q310.3 23.6 311.5 24.3Q312.7 25.1 313.4 26.2Q314.2 27.3 314.2 28.9L314.2 28.9Q314.2 33 312.3 35.9Q310.4 38.7 307.5 38.7L307.5 38.7Q305.8 38.7 305.1 38.4Q304.4 38.1 303.9 37.8Q303.5 37.5 302.9 37.3Q302.3 37 300.7 37L300.7 37Q299.2 37 297.8 37.4Q296.5 37.8 295.3 38.6Q294.2 39.5 293.6 40.8Q292.9 42 292.9 43.5L292.9 43.5L292.9 65.5Q292.9 67.4 292.6 69.2Q292.2 70.9 290.6 71.9Q289 72.9 285.3 72.9ZM349.6 47.7L364.4 59.3Q367.5 62 367.7 64.5Q367.9 66.9 365 70.1L365 70.1Q362.8 72.4 361.1 73.1Q359.5 73.8 357.9 73.2Q356.3 72.5 354.2 70.6L354.2 70.6L338.4 56.8L338.4 65.4Q338.4 67.4 338.1 69.1Q337.7 70.8 336.1 71.8Q334.6 72.9 330.9 72.9L330.9 72.9Q327.3 72.9 325.7 71.8Q324.1 70.8 323.8 69.0Q323.4 67.3 323.4 65.3L323.4 65.3L323.4 7.6Q323.4 5.6 323.8 3.9Q324.2 2.2 325.8 1.1Q327.4 0.1 331 0.1L331 0.1Q334.6 0.1 336.1 1.1Q337.7 2.2 338.1 4.0Q338.4 5.7 338.4 7.7L338.4 7.7L338.4 37.9L349.6 27.1Q351.6 25.2 353.4 24.5Q355.1 23.8 356.8 24.4Q358.5 25 360.4 27.1L360.4 27.1Q363.6 30.6 363.5 32.8Q363.4 34.9 360.4 37.9L360.4 37.9L349.6 47.7Z' };
export function wordmark(height = 20) {
  return h('svg', { class: 'wm', height, width: Math.round((height * WORDMARK.w) / WORDMARK.h), viewBox: `0 0 ${WORDMARK.w} ${WORDMARK.h}`, 'aria-hidden': 'true' },
    h('path', { d: WORDMARK.d, fill: 'currentColor' }));
}
export const lockup = (size = 28) => h('span', { class: 'logo-inner', style: { display: 'inline-flex', alignItems: 'center', gap: `${Math.round(size * 0.3)}px` } }, symbol(size), wordmark(Math.round(size * 0.66)));

// ---- Icon set: 24px grid, 2px stroke, round caps and joins, simple silhouettes.
const ICONS = {
  overview: 'M4 5h7v6H4zM13 5h7v3h-7zM13 10h7v9h-7zM4 13h7v6H4z',
  patterns: 'M4 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0M10 8a2 2 0 1 0 4 0a2 2 0 1 0-4 0M16 15a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7 15.3l4-5.6M13.6 9.6l3.3 3.8',
  history: 'M12 7v5l3 2M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4',
  videos: 'M4 6h16v12H4zM10.5 9.5v5l4-2.5z',
  compare: 'M8 4v16M16 4v16M4 9h8M12 15h8',
  recap: 'M6 4h12v16H6zM9 8h6M9 12h6M9 16h3',
  experiments: 'M10 4v6l-5 8a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2l-5-8V4M8.5 4h7M7.5 15h9',
  drafts: 'M4 20l4-1 11-11-3-3L5 16zM14 7l3 3',
  settings: 'M5 7h9M18 7h1M5 17h1M10 17h9M16 5v4M8 15v4',
  close: 'M6 6l12 12M18 6L6 18',
  play: 'M8 5.5v13l10-6.5z',
  pause: 'M8 6v12M16 6v12',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  reset: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4',
  info: 'M12 11v5M12 8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  drag: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  eye: 'M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  calendar: 'M5 6h14v14H5zM5 10h14M9 4v4M15 4v4',
  link: 'M10 14l4-4M8 11l-2 2a3 3 0 0 0 4 4l2-2M16 13l2-2a3 3 0 0 0-4-4l-2 2',
  sparkle: 'M12 4l1.8 4.6L18 10l-4.2 1.4L12 16l-1.8-4.6L6 10l4.2-1.4zM18 16l.7 1.6L20 18l-1.3.5L18 20l-.7-1.5L16 18l1.3-.4z',
  trend_up: 'M4 16l5-5 3 3 7-7M14 7h5v5',
  trend_down: 'M4 8l5 5 3-3 7 7M14 17h5v-5',
  level: 'M5 10h14M5 14h14',
  sprout: 'M12 20v-8M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z',
  dots: 'M6 12h.01M12 12h.01M18 12h.01',
  hand: 'M8 13V6.5a1.5 1.5 0 0 1 3 0V11M11 10V5.5a1.5 1.5 0 0 1 3 0V11M14 10.5V7a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7 6 6 0 0 1-5-3l-2-3.5a1.5 1.5 0 0 1 2.6-1.5L8 14',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  pin: 'M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21zM12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
};
export function icon(name, size = 18) {
  return h('svg', { class: `icon i-${name}`, width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
    h('path', { d: ICONS[name] || ICONS.info, stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
}

// ---- Segmented control with a marker that slides to the selected option.
// options: [[value, label]], onSelect(value). Arrow keys move between options.
export function segmented(options, value, onSelect, { label, className = '', size } = {}) {
  const mark = h('span', { class: 'seg-mark', 'aria-hidden': 'true' });
  const root = h('div', { class: `seg ${className}`, role: 'group', 'aria-label': label });
  const buttons = options.map(([v, text]) => h('button', { type: 'button', 'aria-pressed': String(v === value), 'data-value': v, class: size || null,
    onclick: () => { place(v); onSelect(v); } }, text));
  function place(v, instant) {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === v)));
    const b = buttons.find((x) => x.dataset.value === v);
    if (!b) return;
    if (instant) mark.style.transition = 'none';
    mark.style.width = `${b.offsetWidth}px`;
    mark.style.transform = `translateX(${b.offsetLeft}px)`;
    if (instant) requestAnimationFrame(() => { mark.style.transition = ''; });
  }
  root.addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!d) return;
    const i = buttons.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = buttons[(i + d + buttons.length) % buttons.length];
    next.focus(); next.click();
  });
  root.append(mark, ...buttons);
  // Position once the control is laid out, and again when fonts arrive or the control resizes.
  const sync = () => { const cur = buttons.find((b) => b.getAttribute('aria-pressed') === 'true'); if (cur && cur.offsetWidth) place(cur.dataset.value, true); };
  requestAnimationFrame(sync);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
  if ('ResizeObserver' in window) new ResizeObserver(sync).observe(root);
  root.setValue = (v) => place(v);
  return root;
}
