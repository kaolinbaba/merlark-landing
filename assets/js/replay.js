// assets/js/replay.js
// Hero "Demo replay" as a continuous analytical ecosystem. Every visual property is a pure function of
// the replay clock `t` (seconds), so pausing, hiding the tab or resizing never restarts or jumps anything,
// and one cycle flows into the next without clearing the scene.
//
// Overlapping movements in each 28 s cycle (p = t mod 28):
//   arrival (first cycle only) · related videos gather into a pattern (4.5 → 9) · the channel baseline
//   gains emphasis (8 → 12) · the finding comes into focus (11 → 14) · evidence settles (13.5 → 17)
//   · everything recedes to a calm, readable result (20 → 26). Floors never drop to zero after cycle one.
// All numbers shown come from the shared fixtures through derive.js.

import { h, icon, reducedMotion } from '../../demo/js/ui/dom.js';
import { stateChip, qualityBadge, provChip } from '../../demo/js/ui/components.js';
import { findingStats, getRange, evidenceFor, toMs, formatInt, formatMultiplier, formatTime, provenanceOf } from '../../demo/js/data/derive.js';
import { videos, findings, CONNECTED_AT } from '../../demo/js/data/fixtures.js';
import { openEvidence } from '../../demo/js/views/evidence.js';
import { Clock, seeded, noise3, smooth, ramp, swell, bump, clamp01 } from '../../demo/js/ui/flow.js';

const CYCLE = 28;
const PHASES = [
  [0, 'Observing uploads'], [4.5, 'Related videos gather into a pattern'], [8, 'Comparing with the channel’s own baseline'],
  [11, 'The finding comes into focus'], [13.5, 'Evidence settles around it'], [20, 'Result'],
];
const STEADY = CYCLE + 18; // the reduced-motion still: second cycle, everything settled

export function mountReplay(host) {
  const range = getRange('all');
  const f = findings[0];
  const s = findingStats(f, range);
  const long = videos.filter((v) => v.format === 'long' && v.views7 != null);
  const evidence = evidenceFor(s).slice(-3).reverse();
  const jit = seeded(41);
  const arrive = long.map((_, i) => 0.3 + i * 0.15 + jit() * 0.28); // slightly varied spacing

  // ---- shell: the readable result is present from the first frame ----
  const caption = h('span', { class: 'rp-caption' });
  const progress = h('i', { class: 'rp-progress-fill' });
  const pauseBtn = h('button', { class: 'btn btn-ghost btn-sm', type: 'button' });
  const replayBtn = h('button', { class: 'btn btn-quiet btn-sm', type: 'button' }, icon('reset', 14), 'Replay');
  const stageHost = h('div', { class: 'rp-stage' });
  const observed = h('b', { class: 'num' }, String(long.length));
  const meters = h('div', { class: 'rp-meters' },
    meter('Uploads observed', observed), meter('Pattern matches', h('b', { class: 'num' }, String(s.n))),
    meter('Channel baseline', h('b', { class: 'num' }, formatInt(s.baselineViews))), meter('Pattern average', h('b', { class: 'num' }, formatInt(s.groupViews))));
  const chips = evidence.map((e) => h('button', { class: 'rp-ev-chip', type: 'button',
    onclick: () => { setPlaying(false); openEvidence({ ...e, findingId: f.id, findingName: f.name }); } },
  h('span', { class: 'ts num' }, `${formatTime(e.segment.start)}–${formatTime(e.segment.end)}`),
  h('span', { class: 'rp-ev-title' }, e.video.title), provChip(e.video)));
  const card = h('div', { class: 'rp-card' },
    h('div', { class: 'rp-card-top' }, h('span', { class: 'eyebrow' }, 'Finding'), stateChip(s.state), qualityBadge(s.quality)),
    h('h3', null, f.name, ' ', h('span', { class: 'mult up' }, h('b', { class: 'num' }, formatMultiplier(s.multiplier)), ' channel baseline')),
    h('p', { class: 'rp-measure' }, `${s.n} uploads · ${s.retGroup}% still watching at 0:30 (baseline ${s.retBase}%)`),
    h('div', { class: 'rp-ev' }, h('span', { class: 'dim' }, 'Supporting evidence'), chips),
    h('details', { class: 'rp-more' }, h('summary', null, 'How this was measured'),
      h('p', null, f.observation(s), ` They averaged ${formatInt(s.groupViews)} views in their first 7 days; the median of the channel's other ${s.nBaseline} long-form uploads is ${formatInt(s.baselineViews)}.`),
      h('p', { class: 'muted' }, 'Interpretation: ', f.interpretation),
      h('a', { href: 'demo/#/findings/F1', class: 'text-link demo-cta' }, 'Open this finding in the demo')));
  const frame = h('div', { class: 'rp-frame', 'data-calm': '' },
    h('div', { class: 'rp-bar' },
      h('span', { class: 'rp-lights', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
      h('span', { class: 'rp-chan' }, 'Lanternfish Histories', h('small', null, ' · fictional channel')),
      h('span', { class: 'demo-pill' }, h('i', { 'aria-hidden': 'true' }), 'Sample data · Demo replay')),
    stageHost, meters, card,
    h('div', { class: 'rp-foot' },
      h('div', { class: 'rp-phase', 'aria-hidden': 'true' }, caption, h('span', { class: 'rp-progress' }, progress)),
      h('div', { class: 'rp-ctl' }, pauseBtn, replayBtn)));
  host.replaceChildren(frame,
    h('p', { class: 'sr-only' }, `Demo replay with sample data. Merlark observes ${long.length} long-form uploads, groups the ${s.n} that open on a route map, compares them with the channel baseline of ${formatInt(s.baselineViews)} views in 7 days, and shows the finding "${f.name}" at ${formatMultiplier(s.multiplier)} the baseline, with supporting videos and timestamps.`));

  let P = null; // scene parts
  let lastCaption = ''; let rippledCycle = -1; let firedArrivals = 0;

  function build() {
    const rnd = seeded(97); // geometry jitter is seeded, so rebuilding on resize keeps the same paths
    const W = Math.max(280, stageHost.clientWidth); const H = W < 480 ? 200 : 236;
    const m = { l: 40, r: 16, t: 34, b: 24 };
    const iw = W - m.l - m.r; const ih = H - m.t - m.b;
    const t0 = toMs(range.start); const t1 = toMs(range.end);
    const x = (iso) => m.l + ((toMs(iso) - t0) / (t1 - t0)) * iw;
    const y = (val) => m.t + ih - (val / 40000) * ih;
    const svg = h('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'rp-svg', 'aria-hidden': 'true' });
    const defs = h('defs', null, h('linearGradient', { id: 'rpBand', x1: 0, y1: 0, x2: 0, y2: 1 },
      h('stop', { offset: 0, 'stop-color': '#36e2d0', 'stop-opacity': 0.16 }), h('stop', { offset: 1, 'stop-color': '#36e2d0', 'stop-opacity': 0 })));
    const bx = x(CONNECTED_AT);
    svg.append(defs,
      h('rect', { x: m.l, y: m.t, width: bx - m.l, height: ih, class: 'zone-hist' }),
      h('rect', { x: bx, y: m.t, width: W - m.r - bx, height: ih, class: 'zone-obs' }),
      h('line', { x1: bx, x2: bx, y1: m.t - 8, y2: m.t + ih, class: 'boundary' }),
      h('text', { x: bx - 6, y: m.t + ih - 6, 'text-anchor': 'end', class: 'rp-tiny hist' }, 'historical estimate'),
      h('text', { x: bx + 6, y: m.t + ih - 6, class: 'rp-tiny obs' }, 'observed'));
    [0, 20000, 40000].forEach((val) => svg.append(
      h('line', { x1: m.l, x2: W - m.r, y1: y(val), y2: y(val), class: 'grid' }),
      h('text', { x: m.l - 8, y: y(val) + 4, 'text-anchor': 'end', class: 'axis' }, val ? `${val / 1000}K` : '0')));
    const yb = y(s.baselineViews); const ym = y(s.groupViews);
    const band = h('rect', { x: m.l, y: ym, width: iw, height: yb - ym, fill: 'url(#rpBand)', class: 'rp-band' });
    const baseLine = h('line', { x1: m.l, x2: W - m.r, y1: yb, y2: yb, class: 'rp-base' });
    const meanLine = h('line', { x1: m.l, x2: W - m.r, y1: ym, y2: ym, class: 'rp-mean' });
    const baseLabel = h('text', { x: m.l + 6, y: yb + 14, class: 'rp-tiny base' }, `channel baseline ${formatInt(s.baselineViews)}`);
    const meanLabel = h('text', { x: m.l + 6, y: ym - 6, class: 'rp-tiny mean' }, `map-first average ${formatInt(s.groupViews)}`);
    const bxr = W - m.r - 6;
    const bracket = h('g', { class: 'rp-bracket' }, h('path', { d: `M${bxr - 6} ${ym} H${bxr} V${yb} H${bxr - 6}` }),
      h('text', { x: bxr - 10, y: (ym + yb) / 2 + 4, 'text-anchor': 'end', class: 'rp-mult' }, formatMultiplier(s.multiplier)));
    svg.append(band, baseLine, meanLine, baseLabel, meanLabel, bracket);
    const nx = m.l + iw * 0.36; const ny = m.t - 18;
    const dots = long.map((v, i) => {
      const match = f.match(v);
      const cx = x(v.date); const cy = y(v.views7);
      const stem = h('line', { x1: cx, x2: cx, y1: y(0), y2: cy, class: 'stem' });
      const core = h('circle', { r: 4, class: 'core' });
      const halo = match ? h('circle', { r: 9, class: 'halo' }) : null;
      const g = h('g', { class: `rp-dot ${provenanceOf(v)} ${match ? 'match' : ''}` }, stem, halo, core);
      svg.append(g);
      // Curved arrival path: from below-left, bending into place.
      const sx = cx - 40 - rnd() * 50; const sy = H + 10 + rnd() * 20;
      return { v, i, g, stem, core, halo, match, cx, cy, sx, sy, kx: (sx + cx) / 2 - 10, ky: cy - 26 - rnd() * 20, y0: y(0) };
    });
    const matches = dots.filter((d) => d.match);
    // Constellation through the matching videos (smooth curve), drawn as the pattern gathers.
    const cpath = matches.map((d, i, a) => {
      if (!i) return `M${d.cx} ${d.cy}`;
      const pr = a[i - 1]; const mx = (pr.cx + d.cx) / 2;
      return `C${mx} ${pr.cy}, ${mx} ${d.cy}, ${d.cx} ${d.cy}`;
    }).join(' ');
    const constellation = h('path', { d: cpath, class: 'rp-constellation', pathLength: 1 });
    svg.insertBefore(constellation, dots[0].g);
    const node = h('g', { class: 'rp-node', transform: `translate(${nx} ${ny})` },
      h('rect', { x: -78, y: -11, width: 156, height: 22, rx: 11 }), h('text', { x: 0, y: 4, 'text-anchor': 'middle' }, `${f.name} · ${s.n}`));
    const motes = matches.map(() => h('circle', { r: 2.4, class: 'rp-mote' }));
    svg.append(node, ...motes);
    stageHost.replaceChildren(svg);
    P = { W, svg, dots, matches, band, baseLine, meanLine, baseLabel, meanLabel, bracket, node, motes, constellation, nx, ny };
  }

  function render(t) {
    if (!P) return;
    const cyc = Math.floor(t / CYCLE); const p = t - cyc * CYCLE; const first = cyc === 0;
    // Envelopes with floors: after the first cycle nothing returns to zero, so cycles blend.
    const M = first ? swell(p, 4.5, 9, 20, 26, 0) + ramp(p, 20, 26) * 0.45 : swell(p, 4.5, 9, 20, 26, 0.45);
    const B = swell(p, 8, 12, 21, 26.5, 0.4);
    const F = swell(p, 11, 14, 22, 27.5, 0.55);
    const draw = first ? ramp(p, 5, 9.5) : 1;
    let arrived = 0;
    for (const d of P.dots) {
      // First cycle: observations arrive along curved paths. Later cycles: a soft light wave passes instead.
      const a = first ? smooth((t - arrive[d.i]) / 1.5) : 1;
      if (a >= 1) arrived += 1;
      const bx = (1 - a) ** 2 * d.sx + 2 * (1 - a) * a * d.kx + a * a * d.cx;
      const by = (1 - a) ** 2 * d.sy + 2 * (1 - a) * a * d.ky + a * a * d.cy;
      d.core.setAttribute('cx', bx.toFixed(1)); d.core.setAttribute('cy', by.toFixed(1));
      d.stem.setAttribute('y2', (d.y0 + (d.cy - d.y0) * a).toFixed(1)); d.stem.style.opacity = a;
      const wave = first ? 0 : bump(p, 1.2 + (d.cx / P.W) * 3.2, 0.55) * 0.6;
      if (d.match) {
        const k = clamp01(M * 1.05);
        d.halo.setAttribute('cx', bx.toFixed(1)); d.halo.setAttribute('cy', by.toFixed(1));
        d.halo.style.opacity = ((k * 0.55 + wave * 0.4) * a).toFixed(3);
        d.core.style.setProperty('--m', k.toFixed(3));
        d.g.style.opacity = Math.min(1, a * 1.4).toFixed(3);
      } else {
        d.g.style.opacity = Math.min(1, Math.min(1, a * 1.4) * (1 - 0.55 * M) + wave * 0.25).toFixed(3);
      }
      d.core.setAttribute('r', (4 + wave * 2.2).toFixed(2));
      if (first && a >= 1 && d.i >= firedArrivals) { firedArrivals = d.i + 1; if (d.i % 7 === 6) pulse(d.core); }
    }
    observed.textContent = String(first ? arrived : P.dots.length);
    P.constellation.style.strokeDashoffset = (1 - draw).toFixed(3);
    P.constellation.style.opacity = (0.15 + 0.7 * M).toFixed(3);
    P.node.style.opacity = clamp01(M * 1.3).toFixed(3);
    // Motes drift from each matching video toward the pattern label, each cycle on a slightly different curve.
    P.motes.forEach((mo, k) => {
      const d = P.matches[k]; const st = 5 + k * 0.42; const u = smooth((p - st) / 2.4);
      const vis = Math.sin(Math.PI * clamp01((p - st) / 2.4));
      const bend = 30 + 18 * noise3(cyc * 0.7, k * 0.5, 0.3, 5);
      const kx = (d.cx + P.nx) / 2 + 14 * noise3(k, cyc, 1, 9); const ky = Math.min(d.cy, P.ny) - bend;
      mo.setAttribute('cx', ((1 - u) ** 2 * d.cx + 2 * (1 - u) * u * kx + u * u * P.nx).toFixed(1));
      mo.setAttribute('cy', ((1 - u) ** 2 * d.cy + 2 * (1 - u) * u * ky + u * u * P.ny).toFixed(1));
      mo.style.opacity = (vis * 0.85).toFixed(3);
    });
    P.band.style.opacity = (B * M * 0.9).toFixed(3);
    P.baseLine.style.opacity = (0.35 + 0.65 * B).toFixed(3);
    P.baseLine.style.strokeWidth = (1.2 + 1.1 * B).toFixed(2);
    P.baseLabel.style.opacity = (0.45 + 0.55 * B).toFixed(3);
    const mean = Math.min(M, B + 0.3);
    P.meanLine.style.opacity = (0.2 + 0.8 * mean).toFixed(3);
    P.meanLabel.style.opacity = (0.3 + 0.7 * mean).toFixed(3);
    P.bracket.style.opacity = clamp01(B * M * 1.2).toFixed(3);
    // The finding and its evidence: always readable; focus blooms and recedes softly.
    card.style.setProperty('--f', F.toFixed(3));
    chips.forEach((c, k) => c.style.setProperty('--e', Math.min(1, 0.25 * F + bump(p, 14 + k * 1.15, 0.9)).toFixed(3)));
    if (p > 12.5 && rippledCycle !== cyc) { rippledCycle = cyc; pulse(card, true); }
    const label = PHASES.filter(([at]) => p >= at).pop()[1];
    if (label !== lastCaption) { lastCaption = label; caption.classList.remove('in'); void caption.offsetWidth; caption.textContent = label; caption.classList.add('in'); }
    progress.style.transform = `scaleX(${(p / CYCLE).toFixed(4)})`;
  }

  function pulse(el, amber) {
    if (window.innerWidth < 640) return;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    document.dispatchEvent(new CustomEvent('merlark:observe', { detail: { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 60), amber } }));
  }

  const clock = new Clock((t) => render(t));
  let playing = false;
  function setPlaying(p) {
    playing = p && !reducedMotion();
    if (playing) clock.play(); else clock.pause();
    frame.classList.toggle('paused', !playing && !reducedMotion());
    paint();
  }
  function paint() {
    const still = reducedMotion();
    frame.classList.toggle('static', still);
    pauseBtn.hidden = still; replayBtn.hidden = still;
    pauseBtn.replaceChildren(icon(playing ? 'pause' : 'play', 14), playing ? 'Pause' : 'Resume');
    pauseBtn.setAttribute('aria-label', playing ? 'Pause demo replay' : 'Resume demo replay');
    if (still) { lastCaption = ''; clock.set(STEADY); caption.textContent = 'Motion is off · showing the result'; }
  }
  pauseBtn.addEventListener('click', () => setPlaying(!playing));
  replayBtn.addEventListener('click', () => { firedArrivals = 0; rippledCycle = -1; clock.set(0); setPlaying(true); });
  document.addEventListener('merlark:motion', () => { if (!reducedMotion() && clock.t >= STEADY && !playing) clock.set(STEADY); setPlaying(true); });

  let lw = 0;
  new ResizeObserver(() => { const w = stageHost.clientWidth; if (Math.abs(w - lw) > 24) { lw = w; build(); render(clock.t); } }).observe(stageHost);
  build();
  render(0);
  setPlaying(true);
  // Expose the clock read-only for verification tooling (no effect on data).
  host.dataset.replay = 'ready';
  Object.defineProperty(host, 'replayTime', { get: () => clock.t });
}

function meter(k, valueEl) { return h('div', { class: 'rp-meter' }, h('span', null, k), valueEl); }
