// demo/js/ui/charts.js
// Hand-built SVG charts sized to their container, so labels stay legible on phones.

import { h } from './dom.js';
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
export function timelineChart({ videos, range, highlight, baseline, width, height = 240, onSelect, selectedId }) {
  const W = Math.max(300, width); const H = height;
  const m = { l: 46, r: 14, t: 34, b: 30 };
  const iw = W - m.l - m.r; const ih = H - m.t - m.b;
  const t0 = toMs(range.start); const t1 = toMs(range.end);
  const x = (iso) => m.l + ((toMs(iso) - t0) / (t1 - t0)) * iw;
  const vmax = niceMax(Math.max(...videos.map((v) => v.views7 || 0), 10000) * 1.08);
  const y = (val) => m.t + ih - (val / vmax) * ih;
  const wrap = h('div', { class: 'chart chart-timeline' });
  const svg = h('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Upload timeline: 7-day views per long-form upload, split into historical estimate and observed by Merlark.' });
  const bx = toMs(CONNECTED_AT) >= t0 ? x(CONNECTED_AT) : null;

  if (bx != null) {
    svg.append(
      h('rect', { x: m.l, y: m.t, width: bx - m.l, height: ih, class: 'zone-hist' }),
      h('rect', { x: bx, y: m.t, width: W - m.r - bx, height: ih, class: 'zone-obs' }),
      h('line', { x1: bx, x2: bx, y1: m.t - 18, y2: m.t + ih, class: 'boundary' }),
      h('text', { x: bx - 8, y: m.t - 8, 'text-anchor': 'end', class: 'zone-label hist' }, '◂ Historical estimate'),
      h('text', { x: bx + 8, y: m.t - 8, class: 'zone-label obs' }, 'Observed by Merlark ▸'),
    );
  } else {
    svg.append(h('rect', { x: m.l, y: m.t, width: iw, height: ih, class: 'zone-obs' }),
      h('text', { x: m.l + 6, y: m.t - 8, class: 'zone-label obs' }, 'Observed by Merlark'));
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
    svg.append(h('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, class: 'baseline-line' }),
      h('text', { x: m.l + 6, y: yy + 14, class: 'axis baseline-label' }, `baseline ${formatInt(baseline)}`));
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
      'aria-label': `${v.title}, ${formatDate(v.date)}, ${formatInt(v.views7)} views in 7 days, ${prov === 'historical' ? 'historical estimate' : 'observed by Merlark'}`,
    },
    h('line', { x1: cx, x2: cx, y1: y(0), y2: cy, class: 'stem' }),
    h('circle', { cx, cy, r: hi ? 6 : 4.5 }));
    const show = () => tip.show(cx, cy - 14, [v.title, `${formatShort(v.date)} · ${formatInt(v.views7)} views in 7 days`, prov === 'historical' ? 'Historical estimate' : 'Observed by Merlark']);
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
export function barChart({ rows, max, width }) {
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
      h('rect', { x: labelW, y: yy + 4, width: W - labelW - 70, height: 16, rx: 8, class: 'bar-track' }),
      h('rect', { x: labelW, y: yy + 4, width: bw, height: 16, rx: 8, class: `bar ${r.tone || ''}`, style: { '--i': i } }),
      h('text', { x: labelW + bw + 8, y: yy + 17, class: 'bar-value num' }, r.display),
    );
  });
  return svg;
}

// Retention curves with optional segment markers and a playhead.
export function retentionChart({ curves, duration, markers = [], playhead = null, width, height = 200, onSeek }) {
  const W = Math.max(280, width); const H = height;
  const m = { l: 40, r: 12, t: 14, b: 26 };
  const iw = W - m.l - m.r; const ih = H - m.t - m.b;
  const x = (t) => m.l + (t / duration) * iw;
  const y = (r) => m.t + ih - (r / 100) * ih;
  const svg = h('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'chart chart-retention', role: 'img', 'aria-label': 'Audience retention curve, synthetic sample data' });
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
