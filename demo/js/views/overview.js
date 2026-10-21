// demo/js/views/overview.js
// Overview as an analysis canvas: the main finding on the left, its video evidence arranged around it on the
// right, then the comparison, two sources and the next useful step. Details open on demand.

import { h, icon, reducedMotion } from '../ui/dom.js';
import { tweenText } from '../ui/motion.js';
import { Clock, noise3, seeded } from '../ui/flow.js';
import { timelineChart, highlightTimeline } from '../ui/charts.js';
import { stateChip, qualityBadge, obsInterp, sectionHead, emptyState, chartWidth, thumb } from '../ui/components.js';
import { videoById, allFindingStats, mainFinding, evidenceFor, channelTotals, patternWatchStats, weeks, briefFor, formatDate, formatShort, formatInt, formatTime, formatMultiplier, STATE_LABEL } from '../data/derive.js';
import { videos } from '../data/fixtures.js';
import { openEvidence } from './evidence.js';
import { planIntervention } from './interventions.js';

let field = null; // the running evidence field, disposed before every re-render

export function render(_route, ctx) {
  if (field) { field.dispose(); field = null; }
  const { range, state, navigate } = ctx;
  if (!state.connected) {
    return emptyState('No channel connected', 'The sample channel was disconnected in this demo. Reconnect it to see its findings again.',
      h('a', { class: 'btn btn-primary', href: '#/onboarding' }, 'Reconnect (simulated)'));
  }
  const stats = allFindingStats(range);
  const main = mainFinding(stats);
  const totals = channelTotals(range);
  const pw = patternWatchStats(range);
  const counts = Object.fromEntries(Object.keys(STATE_LABEL).map((k) => [k, stats.filter((s) => s.state === k).length]));
  const active = state.interventions.filter((i) => i.status === 'active').length;
  const latest = briefFor(weeks()[0]);
  const ev = evidenceFor(main);
  const open = (e) => openEvidence({ ...e, findingId: main.finding.id, findingName: main.finding.name });
  const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const count = (n) => words[n] || String(n);

  const canvas = h('div', { class: 'ov-field', role: 'group', 'aria-label': `${ev.length} supporting videos` });
  field = mountField(canvas, ev.slice(-8), main, open);

  const compare = main.multiplier == null
    ? h('p', { class: 'muted' }, 'Not enough comparable videos in this range to compare yet.')
    : h('div', { class: 'ov-bars' },
      bar('Channel baseline', `median of ${main.nBaseline}`, main.baselineViews, Math.max(main.baselineViews, main.groupViews), 'base'),
      bar(main.finding.name, `average of ${main.n}`, main.groupViews, Math.max(main.baselineViews, main.groupViews), 'group'));

  return h('div', { class: 'view overview' },
    h('header', { class: 'ov-head' },
      h('div', null, h('span', { class: 'eyebrow' }, `Your channel, observed · ${range.label}`), h('h1', { class: 'serif' }, 'What changed in your channel?')),
      h('p', { class: 'dim' }, `${formatDate(range.start)} – ${formatDate(range.end)} · ${totals.uploads} uploads in range`)),

    h('section', { class: 'ov-stage', 'aria-labelledby': 'mf-title' },
      h('div', { class: 'ov-finding' },
        h('div', { class: 'ov-tags' }, stateChip(main.state), qualityBadge(main.quality)),
        h('h2', { id: 'mf-title', class: 'serif' }, main.finding.name),
        h('p', { class: 'ov-sub' }, `A recurring pattern across ${count(main.groupAll.length)} ${main.finding.scope === 'short' ? 'Shorts' : 'videos'}.`),
        main.multiplier == null ? h('p', { class: 'ov-mult none' }, 'No comparison yet')
          : h('p', { class: 'ov-mult' }, h('b', { class: 'num serif' }, formatMultiplier(main.multiplier)), h('span', null, 'your channel baseline')),
        h('details', { class: 'ov-details' }, h('summary', null, 'How this was measured'), obsInterp(main, { compact: true })),
        h('div', { class: 'btn-row' },
          h('a', { class: 'btn btn-ghost', href: `#/findings/${main.finding.id}` }, 'Explore the evidence', icon('arrow', 16)))),
      h('div', { class: 'ov-right' }, canvas, h('p', { class: 'ov-caption dim' }, `${ev.length} supporting videos · select one to open its moment`))),

    h('section', { class: 'ov-lower' },
      h('div', { class: 'ov-col' },
        h('h3', { class: 'serif' }, 'The comparison'), h('p', { class: 'dim' }, 'Views in the first 7 days per video'), compare),
      h('div', { class: 'ov-col' },
        h('h3', { class: 'serif' }, 'Evidence'), h('p', { class: 'dim' }, `Examples from the ${count(ev.length)} supporting videos`),
        h('ul', { class: 'ov-ev' }, ev.slice(-2).reverse().map((e) => h('li', null, h('button', { type: 'button', onclick: () => open(e) },
          thumb(e.video, 104), h('span', null, h('strong', null, e.video.title),
            h('small', { class: 'dim' }, h('span', { class: 'ts num' }, `${formatTime(e.segment.start)}–${formatTime(e.segment.end)}`), ' ', e.video.views7 != null ? `${formatInt(e.video.views7)} views in 7 days` : '7-day reading pending', ' · ', formatShort(e.video.date))))))),
        h('a', { class: 'text-link small', href: `#/findings/${main.finding.id}` }, `View all ${ev.length} videos`, icon('arrow', 14))),
      h('div', { class: 'ov-col' },
        h('h3', { class: 'serif' }, 'A useful next step'),
        h('div', { class: 'ov-next' }, h('span', { class: 'ov-flask', 'aria-hidden': 'true' }, flask()), h('p', null, main.finding.action)),
        h('button', { class: 'text-link small', type: 'button', onclick: () => planIntervention(main.finding.id) }, 'Plan an experiment', icon('arrow', 14)))),

    h('section', { class: 'ov-more' },
      h('div', { class: 'instruments' },
        instrument('Uploads in range', totals.uploads, `${totals.long} long-form · ${totals.shorts} Shorts`),
        instrument('Reconstructed / observed', `${totals.historical} / ${totals.observed}`, 'historical estimate / since connection'),
        instrument('Findings', stats.length, `${counts.working} working · ${counts.slipping} slipping · ${counts.emerging} emerging`),
        instrument('Active interventions', active, h('a', { href: '#/interventions' }, 'Open tracker'))),
      h('div', { class: 'card' },
        sectionHead('Upload timeline', '7-day views per long-form upload',
          h('span', { class: 'legend' }, h('i', { class: 'lg hist' }), 'Historical estimate', h('i', { class: 'lg obs' }), 'Observed', h('i', { class: 'lg hi' }), main.finding.name)),
        timelineChart({ key: 'bridge', videos: videos.filter((v) => v.format === 'long' && v.date >= range.start && v.date <= range.end), range, highlight: main.finding.match, baseline: main.baselineViews, width: chartWidth(), onSelect: (v) => navigate(`#/videos/${v.id}`) }),
        h('p', { class: 'fine dim' }, 'Select a dot to open the video. Left of the line is reconstructed after connection and may miss deleted, private or unavailable videos.')),
      h('div', { class: 'two-col' },
        h('div', { class: 'card' },
          sectionHead('All findings', 'Pattern readings', h('a', { class: 'btn btn-quiet btn-sm', href: '#/findings' }, 'View all', icon('arrow', 14))),
          h('ul', { class: 'mini-findings' }, stats.map((s) => {
            // Hovering or focusing a finding lights up its videos on the timeline above.
            const light = () => highlightTimeline(document.querySelector('.overview .chart-timeline'), (id) => s.groupAll.some((v) => v.id === id));
            const reset = () => highlightTimeline(document.querySelector('.overview .chart-timeline'), (id) => main.finding.match(videoById(id)));
            return h('li', null, h('a', { href: `#/findings/${s.finding.id}`, onpointerenter: light, onfocus: light, onpointerleave: reset, onblur: reset },
              h('span', null, s.finding.name), stateChip(s.state)));
          }))),
        h('div', { class: 'card' },
          sectionHead('Weekly brief', `${formatShort(latest.week.start)} – ${formatShort(latest.week.end)}`, h('a', { class: 'btn btn-quiet btn-sm', href: '#/brief' }, 'Read', icon('arrow', 14))),
          h('ul', { class: 'brief-teaser' },
            h('li', null, `${latest.uploads.length} upload${latest.uploads.length === 1 ? '' : 's'} published, 7-day readings for ${latest.readings.length} video${latest.readings.length === 1 ? '' : 's'}`),
            latest.changes.length ? latest.changes.map((c) => h('li', null, `${c.s.finding.name}: ${STATE_LABEL[c.from]} → ${STATE_LABEL[c.s.state]}`)) : h('li', null, 'No finding changed state'),
            h('li', null, `Pattern watch: ${pw.n} uploads share one series template in this range`))))));
}

export function enter() { if (field) { field.dispose(); field = null; } }

const instrument = (label, value, sub) => h('div', { class: 'instrument' },
  h('span', { class: 'dim' }, label),
  typeof value === 'number' ? tweenText(h('b', { class: 'num' }), `inst:${label}`, value) : h('b', { class: 'num' }, String(value)),
  h('small', { class: 'muted' }, sub));

function bar(label, sub, value, max, tone) {
  return h('div', { class: `ov-bar ${tone}` },
    h('span', { class: 'ov-bar-label' }, label, h('small', { class: 'dim' }, ` · ${sub}`)),
    h('span', { class: 'ov-bar-track' }, h('i', { style: { '--w': `${((value / max) * 100).toFixed(1)}%` } })),
    h('b', { class: 'num' }, formatInt(value)));
}

const flask = () => h('svg', { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none' },
  h('path', { d: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7.5 15h9', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));

// ---- The evidence field: supporting videos placed organically around the finding, joined by fine curves.
const SLOTS = [[0.2, 0.17], [0.5, 0.08], [0.83, 0.15], [0.09, 0.5], [0.91, 0.5], [0.2, 0.84], [0.52, 0.9], [0.84, 0.83]];
function mountField(host, ev, main, open) {
  const rnd = seeded(31);
  const FOCAL = { x: 0.55, y: 0.48 };
  const svg = h('svg', { class: 'ov-links', 'aria-hidden': 'true' });
  const nodes = ev.map((e, i) => {
    const [sx, sy] = SLOTS[i % SLOTS.length];
    const btn = h('button', { type: 'button', class: 'ov-node', onclick: () => open(e),
      'aria-label': `${e.video.title}, ${formatTime(e.segment.start)} to ${formatTime(e.segment.end)}: ${e.segment.label}`,
      style: { '--d': `${i * 90}ms` } }, thumb(e.video, 172));
    const path = h('path', { class: 'ov-link' }); const sig = h('circle', { class: 'ov-sig', r: 2.4 });
    svg.append(path, sig);
    return { e, btn, path, sig, x: sx + (rnd() - 0.5) * 0.05, y: sy + (rnd() - 0.5) * 0.05, ph: rnd(), sp: 0.06 + rnd() * 0.05, bend: (rnd() - 0.5) * 0.5, i };
  });
  const focal = h('div', { class: 'ov-focal', 'aria-hidden': 'true' }, h('i'), h('span', null, 'Pattern', h('br'), 'identified'));
  host.append(svg, ...nodes.map((n) => n.btn), focal);
  let W = 0; let H = 0;
  const measure = () => { W = host.clientWidth; H = host.clientHeight; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); };
  const frame = (t) => {
    if (!host.isConnected) { api.dispose(); return; }
    if (!W) measure();
    const still = reducedMotion();
    const fx = FOCAL.x * W; const fy = FOCAL.y * H;
    focal.style.transform = `translate3d(${fx}px, ${fy}px, 0)`;
    for (const n of nodes) {
      const dx = still ? 0 : noise3(n.i * 0.9, t * 0.08, 2) * 7; const dy = still ? 0 : noise3(n.i * 0.9 + 30, t * 0.07, 4) * 6;
      const hw = n.btn.offsetWidth / 2 + 4; const hh = (n.btn.offsetWidth * 9) / 32 + 4;
      const x = Math.min(W - hw, Math.max(hw, n.x * W)) + dx; const y = Math.min(H - hh, Math.max(hh, n.y * H)) + dy;
      n.btn.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      const vx = fx - x; const vy = fy - y; const d = Math.hypot(vx, vy) || 1; const px = -vy / d; const py = vx / d;
      const b = (n.bend + (still ? 0 : noise3(n.i, t * 0.05, 7) * 0.12)) * d;
      const c1x = x + vx * 0.35 + px * b; const c1y = y + vy * 0.35 + py * b; const c2x = x + vx * 0.75 + px * b * 0.4; const c2y = y + vy * 0.75 + py * b * 0.4;
      n.path.setAttribute('d', `M${x.toFixed(1)} ${y.toFixed(1)}C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${fx.toFixed(1)} ${fy.toFixed(1)}`);
      if (still) { n.sig.style.opacity = 0; continue; }
      const u = (t * n.sp + n.ph) % 1; const v = 1 - u;
      n.sig.setAttribute('cx', (v * v * v * x + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u * fx).toFixed(1));
      n.sig.setAttribute('cy', (v * v * v * y + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * fy).toFixed(1));
      n.sig.style.opacity = Math.sin(Math.PI * u).toFixed(3);
    }
  };
  const clock = new Clock(frame);
  const ro = new ResizeObserver(() => { measure(); clock.set(clock.t); });
  const sync = () => { if (reducedMotion()) { clock.pause(); clock.set(clock.t); } else clock.play(); };
  ro.observe(host);
  document.addEventListener('merlark:motion', sync);
  requestAnimationFrame(() => { measure(); clock.set(6); sync(); });
  const api = { dispose() { clock.dispose(); ro.disconnect(); document.removeEventListener('merlark:motion', sync); } };
  return api;
}
