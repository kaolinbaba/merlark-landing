// demo/js/ui/charts.js
// Hand-built SVG charts sized to their container, so labels stay legible on phones.

import { h, reducedMotion } from './dom.js';

// Last drawn positions per chart key, so a re-render (e.g. a date-range change) animates from old to new values.
const memo = new Map();
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'; // settle curve, no overshoot
// Values glide from where they were, settling without overshoot.
function slideFrom(el, key, x, y) {
  const prev = memo.get(key);
  memo.set(key, { x, y });
  if (!prev || reducedMotion() || (Math.abs(prev.x - x) < 0.5 && Math.abs(prev.y - y) < 0.5)) return false;
  const dx = prev.x - x; const dy = prev.y - y; const bend = Math.min(18, Math.hypot(dx, dy) * 0.18);
  el.animate([
    { transform: `translate(${dx}px, ${dy}px)` },
    { transform: `translate(${dx * 0.42}px, ${dy * 0.42 - bend}px)`, offset: 0.45 },
    { transform: 'none' },
  ], { duration: 720, easing: EASE });
  return true;
}
import { toMs, formatShort, formatInt, formatTime, provenanceOf, formatDate } from '../data/derive.js';
import { CONNECTED_AT } from '../data/fixtures.js';

const niceMax = (v) => { const p = 10 ** Math.floor(Math.log10(v)); return Math.ceil(v / p) * p; };

function tooltipLayer(wrap) {
  const tip = h('div', { class: 'chart-tip', role: 'status', hidden: true });
  wrap.appendChild(tip);
  return {
    show(x, y, lines) {
      tip.replaceChildren(...lines.map((l, i) => h(i ? 'span' : 'strong', null, l)));
      tip.hidden = false;
      const w = wrap.clientWidth;
      tip.style.left = `${Math.min(Math.max(x, 80), w - 80)}px`;
      tip.style.top = `${y}px`;
    },
    hide() { tip.hidden = true; },
  };
}

// Upload timeline: one dot per long-form upload (7-day views), split at the connection boundary.
export function timelineChart({ videos, range, highlight, baseline, width, height = 240, onSelect, selectedId, key = 'timeline' }) {
  const W = Math.max(300, width); const H = height;
  const m = { l: 46, r: 14, t: 42, b: 30 };
  const iw = W - m.l - m.r; const ih = H - m.t - m.b;
  const t0 = toMs(range.start); const t1 = toMs(range.end);
  const x = (iso) => m.l + ((toMs(iso) - t0) / (t1 - t0)) * iw;
  const vmax = niceMax(Math.max(...videos.map((v) => v.views7 || 0), 10000) * 1.08);
  const y = (val) => m.t + ih - (val / vmax) * ih;
  const wrap = h('div', { class: 'chart chart-timeline' });
  const svg = h('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Upload timeline: first-week views per long video, split at the day the channel connected into earlier history (a historical estimate) and updates since connection.' });
  svg.append(h('defs', null, h('pattern', { id: 'hatch', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, h('rect', { width: 8, height: 8, fill: '#EEEBE3' }), h('line', { x1: 0, y1: 0, x2: 0, y2: 8, stroke: 'rgba(41,45,52,0.10)', 'stroke-width': 3 }))));
  const bx = toMs(CONNECTED_AT) >= t0 ? x(CONNECTED_AT) : null;

  if (bx != null) {
    svg.append(
      h('rect', { x: m.l, y: m.t, width: bx - m.l, height: ih, class: 'zone-hist' }),
      h('rect', { x: bx, y: m.t, width: W - m.r - bx, height: ih, class: 'zone-obs' }),
      h('line', { x1: bx, x2: bx, y1: m.t - 22, y2: m.t + ih, class: 'boundary' }),
      h('text', { x: bx, y: m.t - 26, 'text-anchor': bx > W - 90 ? 'end' : bx < m.l + 90 ? 'start' : 'middle', class: 'boundary-label' }, 'Channel connected'),
      bx - m.l > 150 ? h('text', { x: m.l + 8, y: m.t + 16, class: 'zone-label hist' }, 'Earlier history') : null, // only when the zone has room
      W - m.r - bx > 140 ? h('text', { x: W - m.r - 8, y: m.t + 16, 'text-anchor': 'end', class: 'zone-label obs' }, 'Since connection') : null,
    );
  } else {
    svg.append(h('rect', { x: m.l, y: m.t, width: iw, height: ih, class: 'zone-obs' }),
      h('text', { x: m.l + 8, y: m.t + 16, class: 'zone-label obs' }, 'Since connection'));
  }
  for (let i = 0; i <= 4; i++) {
    const val = (vmax / 4) * i; const yy = y(val);
    svg.append(h('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, class: 'grid' }),
      h('text', { x: m.l - 8, y: yy + 4, 'text-anchor': 'end', class: 'axis' }, val >= 1000 ? `${Math.round(val / 1000)}K` : '0'));
  }
  // month ticks
  const d = new Date(t0); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1);
  const months = [];
  while (d.getTime() <= t1) { months.push(d.toISOString().slice(0, 10)); d.setUTCMonth(d.getUTCMonth() + 1); }
  const step = iw < 420 && months.length > 4 ? 2 : 1;
  months.forEach((iso, i) => {
    if (i % step) return;
    svg.append(h('text', { x: x(iso), y: H - 8, 'text-anchor': 'middle', class: 'axis' }, new Date(toMs(iso)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })));
  });
  if (baseline) {
    const yy = y(baseline);
    const bl = h('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, class: 'baseline-line' });
    slideFrom(bl, `${key}:baseline`, 0, yy);
    svg.append(bl,
      h('text', { x: m.l + 6, y: yy + 14, class: 'axis baseline-label' }, `your usual (median) ${formatInt(baseline)}`));
  }
  const tip = tooltipLayer(wrap);
  videos.forEach((v, i) => {
    if (v.views7 == null) return;
    const cx = x(v.date); const cy = y(v.views7);
    const hi = highlight ? highlight(v) : false;
    const prov = provenanceOf(v);
    const g = h('g', {
      class: `dot ${prov} ${hi ? 'hi' : ''} ${highlight && !hi ? 'lo' : ''} ${selectedId === v.id ? 'sel' : ''}`,
      tabindex: 0, role: 'button', style: { '--i': i },
      'aria-label': `${v.title}, ${formatDate(v.date)}, ${formatInt(v.views7)} views in 7 days, ${prov === 'historical' ? 'earlier history, a historical estimate' : 'since connection'}`,
    },
    h('line', { x1: cx, x2: cx, y1: y(0), y2: cy, class: 'stem' }),
    h('circle', { cx, cy, r: hi ? 6 : 4.5 }));
    g.dataset.id = v.id;
    if (slideFrom(g, `${key}:${v.id}`, cx, cy)) g.classList.add('moved');
    const show = () => tip.show(cx, cy - 14, [v.title, `${formatShort(v.date)} · ${formatInt(v.views7)} views in week one`, prov === 'historical' ? 'Earlier history · historical estimate' : 'Since connection']);
    g.addEventListener('pointerenter', show); g.addEventListener('focus', show);
    g.addEventListener('pointerleave', tip.hide); g.addEventListener('blur', tip.hide);
    if (onSelect) {
      g.addEventListener('click', () => onSelect(v));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(v); } });
    }
    svg.append(g);
  });
  wrap.prepend(svg);
  return wrap;
}

// Horizontal bars: rows = [{ label, value, display, tone, note }]
// rows = [{ id?, label, value, display, tone, note }]. Pass a chart `key` (unique per chart) to animate value changes;
// rows are matched by `id` (or label), never by position.
export function barChart({ rows, max, width, key = null }) {
  const W = Math.max(260, width); const rowH = 46; const labelW = Math.min(170, W * 0.38);
  const H = rows.length * rowH + 6;
  const maxChars = Math.max(8, Math.floor((labelW - 10) / 7));
  const mx = max || Math.max(...rows.map((r) => r.value || 0)) * 1.1 || 1;
  const svg = h('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'chart chart-bars', role: 'img', 'aria-label': rows.map((r) => `${r.label}: ${r.display}`).join('; ') });
  rows.forEach((r, i) => {
    const yy = i * rowH + 6; const bw = Math.max(2, ((r.value || 0) / mx) * (W - labelW - 70));
    svg.append(
      h('text', { x: 0, y: yy + 15, class: 'bar-label' }, h('title', null, r.label), r.label.length > maxChars ? r.label.slice(0, maxChars - 1).trimEnd() + '…' : r.label),
      r.note ? h('text', { x: 0, y: yy + 31, class: 'bar-note' }, r.note) : null,
      h('rect', { x: labelW, y: yy + 4, width: W - labelW - 70, height: 16, rx: 9, class: 'bar-track' }),
      barRect(key ? `${key}:${r.id ?? r.label}` : null, labelW, yy + 4, bw, r.tone, i),
      h('text', { x: labelW + bw + 8, y: yy + 17, class: 'bar-value num' }, r.display),
    );
  });
  return svg;
}

function barRect(k, x, y, w, tone, i) {
  const prev = k ? memo.get(k) : null;
  if (k) memo.set(k, { w });
  const rect = h('rect', { x, y, width: w, height: 18, rx: 9, class: `bar ${tone || ''} ${prev ? 'moved' : ''}`, style: { '--i': i } });
  // From the previous value to the new one, so a comparison change reads as a change.
  if (prev && !reducedMotion() && Math.abs(prev.w - w) > 0.5) rect.animate([{ transform: `scaleX(${prev.w / w})` }, { transform: 'none' }], { duration: 640, easing: EASE });
  return rect;
}

// Retention curves with optional segment markers and a playhead.
export function retentionChart({ curves, duration, markers = [], playhead = null, width, height = 200, onSeek }) {
  const W = Math.max(280, width); const H = height;
  const m = { l: 40, r: 12, t: 14, b: 26 };
  const iw = W - m.l - m.r; const ih = H - m.t - m.b;
  const x = (t) => m.l + (t / duration) * iw;
  const y = (r) => m.t + ih - (r / 100) * ih;
  const svg = h('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'chart chart-retention', role: 'img', 'aria-label': 'How many viewers kept watching, made-up sample data' });
  [0, 25, 50, 75, 100].forEach((r) => svg.append(
    h('line', { x1: m.l, x2: W - m.r, y1: y(r), y2: y(r), class: 'grid' }),
    h('text', { x: m.l - 8, y: y(r) + 4, 'text-anchor': 'end', class: 'axis' }, `${r}%`)));
  markers.forEach((mk) => svg.append(
    h('rect', { x: x(mk.start), y: m.t, width: Math.max(3, x(mk.end) - x(mk.start)), height: ih, class: `seg ${mk.tone || ''}` })));
  curves.forEach((c, i) => {
    const d = c.pts.map((p, j) => `${j ? 'L' : 'M'}${x(Math.min(p.t, duration)).toFixed(1)} ${y(p.r).toFixed(1)}`).join(' ');
    svg.append(h('path', { d, class: `curve c${i}`, pathLength: 1 }));
  });
  [0, 0.25, 0.5, 0.75, 1].forEach((f) => svg.append(h('text', { x: x(duration * f), y: H - 6, 'text-anchor': f === 0 ? 'start' : f === 1 ? 'end' : 'middle', class: 'axis' }, formatTime(duration * f))));
  if (playhead != null) {
    svg.append(h('line', { x1: x(playhead), x2: x(playhead), y1: m.t - 4, y2: m.t + ih, class: 'playhead' }),
      h('circle', { cx: x(playhead), cy: m.t - 4, r: 4, class: 'playhead-dot' }));
  }
  if (onSeek) {
    const hit = h('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent', style: { cursor: 'crosshair' } });
    hit.addEventListener('click', (e) => {
      const rect = svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      onSeek(Math.max(0, Math.min(duration, ((px - m.l) / iw) * duration)));
    });
    svg.append(hit);
  }
  return svg;
}

export function sparkline(values, { width = 120, height = 32, tone = 'accent' } = {}) {
  const max = Math.max(...values); const min = Math.min(...values);
  const x = (i) => (i / (values.length - 1)) * (width - 4) + 2;
  const y = (v) => height - 3 - ((v - min) / (max - min || 1)) * (height - 6);
  return h('svg', { width, height, viewBox: `0 0 ${width} ${height}`, class: `spark ${tone}`, 'aria-hidden': 'true' },
    h('path', { d: values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ') }));
}

// Re-highlight an already drawn timeline without re-rendering it (hovering a finding lights its videos).
export function highlightTimeline(chartEl, predicate, focusId = null) {
  if (!chartEl) return;
  chartEl.querySelectorAll('.dot').forEach((g) => {
    const on = predicate ? predicate(g.dataset.id) : false;
    g.classList.toggle('hi', on);
    g.classList.toggle('lo', !!predicate && !on);
    g.classList.toggle('focus', g.dataset.id === focusId);
  });
}
