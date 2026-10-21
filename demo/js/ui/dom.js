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

// Merlark symbol: a geometric lark built from four primitives — round body, beak, wedge wing (cut out in paper)
// and a coral eye that doubles as the "watching" lamp. `small` is the cut drawn for 24px and below.
export const SYMBOL = {
  large: { body: { cx: 29, cy: 37, r: 22 }, beak: 'M45 23.5L62 30.5L45 37.5Z', wing: 'M44 42Q30 28 10 30Q15 48 44 42Z', eye: { cx: 38.5, cy: 28, r: 3.8 } },
  small: { body: { cx: 28, cy: 37, r: 23 }, beak: 'M43 21L63 30L43 39Z', wing: 'M43 43Q28 27 7 30Q13 51 43 43Z', eye: { cx: 36.5, cy: 27.5, r: 5.4 } },
};
export function symbol(size = 28, small = size <= 24) {
  const g = small ? SYMBOL.small : SYMBOL.large;
  return h('svg', { class: 'sym', width: size, height: size, viewBox: '0 0 64 64', fill: 'none', 'aria-hidden': 'true' },
    h('circle', { class: 'sym-body', cx: g.body.cx, cy: g.body.cy, r: g.body.r, fill: 'currentColor' }),
    h('path', { class: 'sym-beak', d: g.beak, fill: 'currentColor' }),
    h('path', { class: 'sym-wing', d: g.wing, fill: '#fbf7f0' }),
    h('circle', { class: 'sym-eye', cx: g.eye.cx, cy: g.eye.cy, r: g.eye.r, fill: '#ff6a4d' }));
}
// Wordmark: "merlark" in Fredoka Bold (OFL), drawn as outlines so it renders identically without the web font.
export const WORDMARK = { viewBox: '0 -74 354 77', w: 354, h: 77, d: 'M9 0.9L9 0.9Q4.5 0.9 2.6-0.5Q0.7-1.8 0.4-3.9Q0-6 0-8.2L0-8.2L0-40.9Q0-43.2 0.4-45.3Q0.8-47.3 2.7-48.6Q4.6-49.9 9.2-49.9L9.2-49.9Q13.7-49.9 15.8-48.2L15.8-48.2Q17.1-47 17.6-44.9L17.6-44.9Q18.2-45.7 19.1-46.5L19.1-46.5Q20.5-47.9 22.6-49.0Q24.7-50 27.4-50L27.4-50Q30.5-50 33.1-49.2Q35.7-48.4 37.9-46.8Q40.0-45.1 41.6-42.7L41.6-42.7Q42.7-44 44.6-45.7Q46.5-47.4 49.2-48.7Q51.8-50 55.1-50L55.1-50Q61.0-50 65.2-47Q69.3-44 71.5-38.3Q73.6-32.6 73.6-24.5L73.6-24.5L73.6-8.2Q73.6-6 73.2-3.9Q72.8-1.8 70.9-0.5Q69 0.9 64.4 0.9L64.4 0.9Q59.9 0.9 58.0-0.5Q56.1-1.9 55.8-4Q55.4-6.1 55.4-8.3L55.4-8.3L55.4-24.6Q55.4-27 54.9-28.6Q54.3-30.1 53.3-30.9Q52.2-31.7 50.6-31.7L50.6-31.7Q48.9-31.7 47.9-31Q46.8-30.3 46.4-28.8Q45.9-27.2 45.9-24.5L45.9-24.5L45.9-8.2Q45.9-6 45.5-3.9Q45.1-1.8 43.2-0.5Q41.3 0.9 36.7 0.9L36.7 0.9Q32.2 0.9 30.3-0.5Q28.4-1.9 28.1-4Q27.7-6.1 27.7-8.3L27.7-8.3L27.7-24.6Q27.7-27 27.2-28.6Q26.7-30.2 25.7-31.0Q24.6-31.7 22.9-31.7L22.9-31.7Q20.9-31.7 19.9-30.7Q18.9-29.7 18.6-28.1Q18.2-26.5 18.2-24.6L18.2-24.6L18.2-8.1Q18.2-5.9 17.8-3.8Q17.4-1.7 15.5-0.4Q13.6 0.9 9 0.9ZM105.1 2L105.1 2Q97.6 2 92.4-0.5Q87.2-2.9 84.0-6.9Q80.8-10.8 79.3-15.4Q77.8-20 77.8-24.3L77.8-24.3Q77.8-32.2 81.3-38.2Q84.8-44.2 91.0-47.6Q97.2-51 105.2-51L105.2-51Q111.4-51 115.8-49Q120.2-47 123.0-43.9Q125.7-40.8 127.0-37.3Q128.3-33.8 128.3-30.8L128.3-30.8Q128.3-25.1 125.5-22.1Q122.7-19.1 118.3-19.1L118.3-19.1L97.0-19.1Q97.4-17.5 98.7-16.4Q99.9-15.2 101.8-14.6Q103.7-13.9 105.9-13.9L105.9-13.9Q108.1-13.9 109.8-14.2Q111.5-14.4 112.8-14.8Q114.0-15.2 115.1-15.6Q116.1-16 117.0-16.3Q117.8-16.5 118.6-16.5L118.6-16.5Q120.4-16.5 121.9-15.3Q123.4-14.1 124.6-11.7L124.6-11.7Q125.3-10.4 125.6-9.3Q125.9-8.1 125.9-7.1L125.9-7.1Q125.9-4.1 123.5-2.1Q121.0-0.1 116.4 1.0Q111.8 2 105.1 2ZM97.0-28.5L97.0-28.5L108.2-28.5Q109.6-28.5 110.3-29.1Q110.9-29.7 110.9-30.9L110.9-30.9Q110.9-32.2 110.2-33.1Q109.4-34 108.1-34.5Q106.8-34.9 105.0-34.9L105.0-34.9Q102.6-34.9 100.8-34.0Q99.0-33 98.1-31.6Q97.1-30.1 97.0-28.5ZM141.8 0.9L141.8 0.9Q137.3 0.9 135.4-0.5Q133.5-1.8 133.2-4.0Q132.8-6.1 132.8-8.3L132.8-8.3L132.8-40.9Q132.8-43.2 133.2-45.3Q133.6-47.3 135.5-48.6Q137.4-49.9 141.9-49.9L141.9-49.9Q146.3-49.9 148.2-48.7Q150-47.5 150.4-46.1L150.4-46.1Q150.4-45.9 150.5-45.8L150.5-45.8Q151.2-46.5 152.4-47.4L152.4-47.4Q153.9-48.6 156.1-49.5Q158.2-50.4 160.9-50.4L160.9-50.4Q161.8-50.4 163.2-50.3Q164.5-50.1 166.1-49.7Q167.6-49.3 169.0-48.5Q170.3-47.7 171.2-46.4Q172-45.1 172-43.2L172-43.2Q172-38.2 169.9-34.7Q167.7-31.2 164.2-31.2L164.2-31.2Q162.3-31.2 161.5-31.5Q160.7-31.7 160.4-32.0Q160-32.2 159.6-32.5Q159.1-32.7 157.9-32.7L157.9-32.7Q156.4-32.7 155.2-32.4Q153.9-32 153.0-31.3Q152-30.6 151.5-29.7Q151-28.7 151-27.6L151-27.6L151-8.1Q151-5.9 150.6-3.8Q150.2-1.7 148.3-0.4Q146.4 0.9 141.8 0.9ZM197.2 0.9L197.2 0.9Q192.6 0.9 189.2 0.5Q185.7 0.1 183.3-1.1Q180.9-2.3 179.4-4.5Q177.9-6.8 177.2-10.5Q176.5-14.1 176.5-19.6L176.5-19.6L176.5-63.9Q176.5-66.2 176.9-68.3Q177.3-70.3 179.2-71.7Q181.1-73 185.6-73L185.6-73Q190.1-73 191.9-71.7Q193.8-70.3 194.2-68.2Q194.6-66.1 194.6-63.8L194.6-63.8L194.6-20.7Q194.6-19.2 194.7-18.4Q194.7-17.5 194.9-17.1Q195.2-16.7 195.8-16.7Q196.3-16.6 197.3-16.6L197.3-16.6Q198.6-16.6 200.1-16.3Q201.5-15.9 202.6-14.2Q203.6-12.4 203.6-8.1L203.6-8.1Q203.6-3.6 202.6-1.7Q201.5 0.2 200 0.6Q198.5 0.9 197.2 0.9ZM247.7 0.7L247.7 0.7Q243.2 0.7 241.1-0.8L241.1-0.8Q239.6-1.8 239.2-3L239.2-3Q238.9-2.7 238.5-2.4L238.5-2.4Q237-1.2 234.6-0.3Q232.2 0.7 228.7 0.7L228.7 0.7Q224.2 0.7 220.0-1.4Q215.9-3.4 212.7-7Q209.4-10.6 207.5-15.2Q205.6-19.7 205.6-24.7L205.6-24.7Q205.6-29.6 207.5-34.1Q209.4-38.6 212.7-42.2Q216-45.7 220.1-47.8Q224.2-49.8 228.7-49.8L228.7-49.8Q232.1-49.8 234.4-48.8Q236.8-47.8 238.3-46.6L238.3-46.6Q238.8-46.2 239.2-45.8L239.2-45.8Q239.5-47.4 241.2-48.5L241.2-48.5Q243.3-49.9 247.8-49.9Q252.3-49.9 254.2-48.6Q256-47.2 256.4-45.1Q256.8-43 256.8-40.8L256.8-40.8L256.8-8.3Q256.8-6.1 256.4-4Q256-1.9 254.2-0.6Q252.3 0.7 247.7 0.7ZM231.2-17.4L231.2-17.4Q233.1-17.4 234.7-18.4Q236.2-19.4 237.2-21.1Q238.1-22.7 238.1-24.6L238.1-24.6Q238.1-26.6 237.2-28.2Q236.2-29.8 234.6-30.8Q233-31.8 231-31.8Q229-31.8 227.3-30.8Q225.7-29.8 224.7-28.2Q223.7-26.5 223.7-24.5L223.7-24.5Q223.7-22.6 224.8-21Q225.8-19.4 227.5-18.4Q229.2-17.4 231.2-17.4ZM271.8 0.9L271.8 0.9Q267.3 0.9 265.4-0.5Q263.5-1.8 263.2-4.0Q262.8-6.1 262.8-8.3L262.8-8.3L262.8-40.9Q262.8-43.2 263.2-45.3Q263.6-47.3 265.5-48.6Q267.4-49.9 271.9-49.9L271.9-49.9Q276.3-49.9 278.2-48.7Q280-47.5 280.4-46.1L280.4-46.1Q280.4-45.9 280.5-45.8L280.5-45.8Q281.2-46.5 282.4-47.4L282.4-47.4Q283.9-48.6 286.1-49.5Q288.2-50.4 290.9-50.4L290.9-50.4Q291.8-50.4 293.2-50.3Q294.5-50.1 296.1-49.7Q297.6-49.3 299.0-48.5Q300.3-47.7 301.2-46.4Q302-45.1 302-43.2L302-43.2Q302-38.2 299.9-34.7Q297.7-31.2 294.2-31.2L294.2-31.2Q292.3-31.2 291.5-31.5Q290.7-31.7 290.4-32.0Q290-32.2 289.6-32.5Q289.1-32.7 287.9-32.7L287.9-32.7Q286.4-32.7 285.2-32.4Q283.9-32 282.9-31.3Q282-30.6 281.5-29.7Q281-28.7 281-27.6L281-27.6L281-8.1Q281-5.9 280.6-3.8Q280.2-1.7 278.3-0.4Q276.4 0.9 271.8 0.9ZM338-24.4L349.3-15.6Q353-12.3 353.3-9.3Q353.5-6.4 349.9-2.6L349.9-2.6Q347.2 0.2 345.3 1.1Q343.3 1.9 341.4 1.1Q339.5 0.2 336.9-2.1L336.9-2.1L324.6-13.6L324.6-8.1Q324.6-5.9 324.2-3.8Q323.8-1.7 321.9-0.4Q320.1 0.9 315.5 0.9L315.5 0.9Q311 0.9 309.1-0.5Q307.2-1.8 306.9-3.9Q306.5-6 306.5-8.2L306.5-8.2L306.5-63.9Q306.5-66.2 306.9-68.3Q307.3-70.3 309.2-71.7Q311.1-73 315.6-73L315.6-73Q320.1-73 321.9-71.7Q323.8-70.3 324.2-68.2Q324.6-66.1 324.6-63.8L324.6-63.8L324.6-36.2L333.1-44.5Q335.5-46.8 337.6-47.7Q339.7-48.5 341.8-47.8Q343.8-47 346.1-44.5L346.1-44.5Q350-40.3 349.9-37.7Q349.7-35.1 346.1-31.5L346.1-31.5L338-24.4Z' };
export function wordmark(height = 20) {
  return h('svg', { class: 'wm', height, width: Math.round((height * WORDMARK.w) / WORDMARK.h), viewBox: WORDMARK.viewBox, 'aria-hidden': 'true' },
    h('path', { d: WORDMARK.d, fill: 'currentColor' }));
}

// Rounded line icon set (24 grid, 2px stroke).
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
    h('path', { d: ICONS[name] || ICONS.info, stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
}
