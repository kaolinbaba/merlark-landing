// assets/js/scene-layout.js
// Where every video sits at each of the five scroll stages, in viewport fractions (x, y), with a scale
// relative to the base thumbnail width and an opacity. Pure functions of the data and the viewport, so the
// engine can interpolate between any two stages in either scroll direction.

import { seeded } from '../../demo/js/ui/flow.js';

export const STAGES = ['opening', 'discovery', 'evidence', 'comparison', 'next'];
export const SOURCE_ID = 'v23'; // the source shown up close (observed after connection)
const SECOND_ID = 'v26';

export const isNarrow = (vw, vh) => vw < 900 || vw / vh < 1.1;
export function baseWidth(vw, vh) {
  return isNarrow(vw, vh) ? Math.max(92, Math.min(128, vw * 0.27)) : Math.max(140, Math.min(214, vw * 0.125, vh * 0.23));
}

// items: [{ id, v (video), group: 'map' | 'archive' | 'series' | 'other' }]; chart: { min, max } in 7-day views.
export function buildLayouts(items, vw, vh, chart) {
  const narrow = isNarrow(vw, vh);
  const W = baseWidth(vw, vh);
  const rnd = seeded(4242);
  const map = items.filter((it) => it.group === 'map');
  const L = STAGES.map(() => new Array(items.length));
  const focal = narrow
    ? [{ x: 0.5, y: 0.74 }, { x: 0.5, y: 0.73 }, { x: 0.5, y: 0.7 }, { x: 0.5, y: 0.66 }, { x: 0.5, y: 0.665 }]
    : [{ x: 0.71, y: 0.5 }, { x: 0.7, y: 0.5 }, { x: 0.66, y: 0.44 }, { x: 0.7, y: 0.45 }, { x: 0.7, y: 0.5 }];

  // ---- 0 · Opening: an organised field, skewed along the light's direction; the map videos sit among the rest.
  const cols = narrow ? 5 : 7; const rows = Math.ceil(items.length / cols);
  const mapSlots = narrow ? [11, 13, 16, 18, 21, 22, 24, 26] : [4, 9, 11, 13, 17, 19, 24, 26];
  let free = 0; const slotOf = new Map();
  map.forEach((it, k) => slotOf.set(it.id, mapSlots[k]));
  const taken = new Set(mapSlots);
  items.forEach((it) => { if (!slotOf.has(it.id)) { while (taken.has(free)) free++; slotOf.set(it.id, free); taken.add(free); } });
  items.forEach((it, i) => {
    const slot = slotOf.get(it.id); const c = slot % cols; const r = Math.floor(slot / cols);
    const x = narrow ? -0.06 + c * 0.28 + r * 0.03 + (rnd() - 0.5) * 0.04 : 0.27 + c * 0.122 + r * 0.024 + (rnd() - 0.5) * 0.02;
    const y = narrow ? 0.1 + r * 0.155 - c * 0.02 + (rnd() - 0.5) * 0.03 : 0.22 + r * (0.68 / Math.max(1, rows - 1)) - c * 0.022 + (rnd() - 0.5) * 0.03;
    const underText = narrow ? y < 0.5 : x < 0.46;
    L[0][i] = { x, y, s: narrow ? 0.7 : 0.62, o: underText ? 0.16 : it.group === 'map' ? 0.95 : 0.6 };
  });

  // ---- 1 · Discovery: the eight gather around the finding; the rest settle into their own faint clusters.
  const ring = (k, n, f, rx, ry, rot = -1.9) => { const a = rot + (k / n) * Math.PI * 2; return { x: f.x + Math.cos(a) * rx, y: f.y + Math.sin(a) * ry }; };
  const clusterAt = { archive: narrow ? { x: 0.12, y: 0.12 } : { x: 0.38, y: 0.84 }, series: narrow ? { x: 0.9, y: 0.1 } : { x: 0.93, y: 0.14 }, other: narrow ? { x: 0.9, y: 0.4 } : { x: 0.95, y: 0.86 } };
  const seen = { archive: 0, series: 0, other: 0 };
  items.forEach((it, i) => {
    if (it.group === 'map') {
      const k = map.indexOf(it);
      const p = ring(k, map.length, focal[1], narrow ? 0.36 : 0.19, narrow ? 0.15 : 0.3);
      L[1][i] = { ...p, s: narrow ? 0.62 : 0.72, o: 1 };
    } else {
      const c = clusterAt[it.group]; const k = seen[it.group]++;
      const a = k * 2.39996; const rr = (narrow ? 0.05 : 0.035) * Math.sqrt(k + 1);
      L[1][i] = { x: c.x + Math.cos(a) * rr * (narrow ? 1 : 1.3), y: c.y + Math.sin(a) * rr * 1.4, s: 0.4, o: narrow ? 0.14 : 0.3 };
    }
  });

  // ---- 2 · Evidence: one source comes close; the group steps back into an arc, everything else recedes.
  const bigW = narrow ? vw * 0.86 : Math.min(vw * 0.4, 580);
  items.forEach((it, i) => {
    if (it.id === SOURCE_ID) { L[2][i] = { x: focal[2].x, y: narrow ? 0.66 : focal[2].y, s: bigW / W, o: 1 }; return; }
    if (it.group === 'map') {
      const k = map.filter((m) => m.id !== SOURCE_ID).indexOf(it);
      L[2][i] = narrow ? { x: 0.08 + k * 0.14, y: 0.42 + (k % 2) * 0.035, s: 0.42, o: 0.6 } : { x: 0.94 - Math.sin((k / 6) * Math.PI) * 0.03, y: 0.16 + k * 0.12, s: 0.42, o: 0.6 };
      return;
    }
    const p = L[1][i]; L[2][i] = { x: p.x + (p.x - 0.5) * 0.15, y: p.y + (p.y - 0.5) * 0.1, s: 0.34, o: 0.07 };
  });

  // ---- 3 · Comparison: each video becomes a tile on a strip chart of first-week views, in two lanes.
  const x0 = narrow ? 0.07 : 0.45; const x1 = narrow ? 0.93 : 0.95;
  const lanes = narrow ? { map: 0.55, base: 0.75 } : { map: 0.31, base: 0.6 };
  const sx = (val) => x0 + ((val - chart.min) / (chart.max - chart.min)) * (x1 - x0);
  const tileS = narrow ? 0.3 : 0.25;
  const tileW = (W * tileS) / vw; const tileH = (W * tileS * 9) / 16 / vh;
  const placeLane = (list, laneY) => {
    const placed = [];
    [...list].sort((a, b) => a.it.v.views7 - b.it.v.views7).forEach(({ it, i }) => {
      const x = sx(it.v.views7);
      let lvl = 0;
      const offsets = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5];
      for (const o of offsets) { if (!placed.some((p) => Math.abs(p.x - x) < tileW * 1.04 && p.o === o)) { lvl = o; break; } }
      placed.push({ x, o: lvl });
      L[3][i] = { x, y: laneY + lvl * tileH * 1.08, s: tileS, o: 1 };
    });
  };
  const withIndex = items.map((it, i) => ({ it, i }));
  placeLane(withIndex.filter((p) => p.it.group === 'map'), lanes.map);
  placeLane(withIndex.filter((p) => p.it.group !== 'map'), lanes.base);

  // ---- 4 · Next step: the finding, its two clearest sources on the left, the group on an arc, an open slot.
  const arc = narrow ? null : [-75, -45, -15, 15, 45, 75].map((d) => (d * Math.PI) / 180);
  items.forEach((it, i) => {
    if (it.id === SOURCE_ID || it.id === SECOND_ID) {
      const first = it.id === SOURCE_ID;
      L[4][i] = narrow ? { x: first ? 0.26 : 0.74, y: 0.54, s: 0.92, o: 1 } : { x: 0.545, y: first ? 0.27 : 0.73, s: 0.86, o: 1 };
      return;
    }
    if (it.group === 'map') {
      const k = map.filter((m) => m.id !== SOURCE_ID && m.id !== SECOND_ID).indexOf(it);
      const p = narrow ? { x: 0.1 + k * 0.16, y: 0.78 + (k % 2) * 0.03 } : { x: focal[4].x + Math.cos(arc[k]) * 0.135, y: focal[4].y + Math.sin(arc[k]) * 0.31 };
      L[4][i] = { ...p, s: narrow ? 0.38 : 0.5, o: 0.88 };
      return;
    }
    const p = L[0][i]; L[4][i] = { x: p.x, y: p.y, s: p.s * 0.85, o: narrow ? 0.05 : 0.08 };
  });

  const future = narrow ? { x: 0.5, y: 0.905 } : { x: 0.93, y: 0.5 };
  return { L, focal, W, narrow, lanes, sx, x0, x1, future, bigW };
}
