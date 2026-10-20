// assets/js/replay.js
// Hero "Demo replay": a deterministic, repeating sequence of prepared sample events built from the demo's
// shared fixtures. Nothing here is live: the label says so, and every number comes from derive.js.
//
// Sequence (seconds):  observe 0–4 · match 4–6.8 · compare 6.8–9.4 · resolve 9.4–11.2 · inspect 11.2–20 · rest

import { h, icon, reducedMotion } from '../../demo/js/ui/dom.js';
import { stateChip, qualityBadge, provChip } from '../../demo/js/ui/components.js';
import { findingStats, getRange, evidenceFor, toMs, formatInt, formatMultiplier, formatTime, formatShort, provenanceOf } from '../../demo/js/data/derive.js';
import { videos, findings, CONNECTED_AT } from '../../demo/js/data/fixtures.js';
import { openEvidence } from '../../demo/js/views/evidence.js';

const STEPS = [
  { id: 'observe', at: 0, label: 'Observing uploads' },
  { id: 'match', at: 4, label: 'Matching a pattern' },
  { id: 'compare', at: 6.8, label: 'Comparing with the channel baseline' },
  { id: 'resolve', at: 9.4, label: 'Finding resolved' },
  { id: 'inspect', at: 11.2, label: 'Evidence ready to inspect' },
];
const CYCLE = 21.5;
const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

export function mountReplay(host) {
  const range = getRange('all');
  const f = findings[0];
  const s = findingStats(f, range);
  const long = videos.filter((v) => v.format === 'long' && v.views7 != null);
  const evidence = evidenceFor(s).slice(-3).reverse();

  // ---- static shell ----
  const stepList = h('ol', { class: 'rp-steps' }, STEPS.map((st, i) => h('li', { 'data-step': st.id }, h('span', { class: 'num' }, String(i + 1)), h('span', { class: 'rp-step-label' }, st.label))));
  const status = h('span', { class: 'rp-status' }, 'Preparing replay');
  const pauseBtn = h('button', { class: 'btn btn-ghost btn-sm', type: 'button' });
  const replayBtn = h('button', { class: 'btn btn-quiet btn-sm', type: 'button' }, icon('reset', 14), 'Replay');
  const stageHost = h('div', { class: 'rp-stage' });
  const meters = h('div', { class: 'rp-meters' });
  const card = h('div', { class: 'rp-card', 'aria-live': 'off' });
  const frame = h('div', { class: 'rp-frame' },
    h('div', { class: 'rp-bar' },
      h('span', { class: 'rp-lights', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
      h('span', { class: 'rp-chan' }, 'Lanternfish Histories', h('small', null, ' · fictional channel')),
      h('span', { class: 'demo-pill' }, h('i', { 'aria-hidden': 'true' }), 'Sample data · Demo replay')),
    stageHost, meters, card,
    h('div', { class: 'rp-foot' }, stepList,
      h('div', { class: 'rp-ctl' }, status, pauseBtn, replayBtn)));
  host.replaceChildren(frame,
    h('p', { class: 'sr-only' }, `Demo replay with sample data: Merlark observes ${long.length} long-form uploads, matches ${s.n} that open on a route map, compares them with the channel baseline of ${formatInt(s.baselineViews)} views in 7 days, and resolves the finding "${f.name}" at ${formatMultiplier(s.multiplier)} the baseline, with supporting videos and timestamps.`));

  let W = 0; let H = 0; let svg; let parts = {};
  let elapsed = 0; let last = 0; let playing = true; let fired = 0; let raf = 0; let anims = [];
  let events = [];
  let gen = 0; // bumps on every restart so a superseded tick loop stops instead of running twice

  function build() {
    W = Math.max(280, stageHost.clientWidth); H = W < 480 ? 200 : 236;
    const m = { l: 40, r: 16, t: 34, b: 24 };
    const iw = W - m.l - m.r; const ih = H - m.t - m.b;
    const t0 = toMs(range.start); const t1 = toMs(range.end);
    const x = (iso) => m.l + ((toMs(iso) - t0) / (t1 - t0)) * iw;
    const y = (val) => m.t + ih - (val / 40000) * ih;
    svg = h('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'rp-svg', 'aria-hidden': 'true' });
    const bx = x(CONNECTED_AT);
    svg.append(
      h('rect', { x: m.l, y: m.t, width: bx - m.l, height: ih, class: 'zone-hist' }),
      h('rect', { x: bx, y: m.t, width: W - m.r - bx, height: ih, class: 'zone-obs' }),
      h('line', { x1: bx, x2: bx, y1: m.t - 8, y2: m.t + ih, class: 'boundary' }),
      h('text', { x: bx - 6, y: m.t + ih - 6, 'text-anchor': 'end', class: 'rp-tiny hist' }, 'historical estimate'),
      h('text', { x: bx + 6, y: m.t + ih - 6, class: 'rp-tiny obs' }, 'observed'));
    [0, 20000, 40000].forEach((val) => svg.append(
      h('line', { x1: m.l, x2: W - m.r, y1: y(val), y2: y(val), class: 'grid' }),
      h('text', { x: m.l - 8, y: y(val) + 4, 'text-anchor': 'end', class: 'axis' }, val ? `${val / 1000}K` : '0')));
    const sweep = h('line', { x1: m.l, x2: m.l, y1: m.t - 4, y2: m.t + ih, class: 'rp-sweep' });
    const baseLine = h('line', { x1: m.l, x2: W - m.r, y1: y(s.baselineViews), y2: y(s.baselineViews), class: 'rp-base', pathLength: 1 });
    const meanLine = h('line', { x1: m.l, x2: W - m.r, y1: y(s.groupViews), y2: y(s.groupViews), class: 'rp-mean', pathLength: 1 });
    const bxr = W - m.r - 6;
    const bracket = h('g', { class: 'rp-bracket' },
      h('path', { d: `M${bxr - 6} ${y(s.groupViews)} H${bxr} V${y(s.baselineViews)} H${bxr - 6}` }),
      h('text', { x: bxr - 10, y: (y(s.groupViews) + y(s.baselineViews)) / 2 + 4, 'text-anchor': 'end', class: 'rp-mult' }, formatMultiplier(s.multiplier)));
    const baseLabel = h('text', { x: m.l + 6, y: y(s.baselineViews) + 14, class: 'rp-tiny base' }, `channel baseline ${formatInt(s.baselineViews)}`);
    const meanLabel = h('text', { x: m.l + 6, y: y(s.groupViews) - 6, class: 'rp-tiny mean' }, `map-first average ${formatInt(s.groupViews)}`);
    svg.append(baseLine, meanLine, baseLabel, meanLabel, bracket, sweep);
    const nx = m.l + iw * 0.36; const ny = m.t - 18;
    const node = h('g', { class: 'rp-node', transform: `translate(${nx} ${ny})` },
      h('rect', { x: -78, y: -11, width: 156, height: 22, rx: 11 }),
      h('text', { x: 0, y: 4, 'text-anchor': 'middle' }, `${f.name} · ${s.n}`));
    const dots = long.map((v) => {
      const g = h('g', { class: `rp-dot ${provenanceOf(v)} ${f.match(v) ? 'match' : ''}`, 'data-id': v.id },
        h('line', { x1: x(v.date), x2: x(v.date), y1: y(0), y2: y(v.views7), class: 'stem' }),
        h('circle', { cx: x(v.date), cy: y(v.views7), r: 4 }));
      svg.append(g);
      return { v, g, cx: x(v.date), cy: y(v.views7) };
    });
    const newest = dots[dots.length - 1];
    const newTag = h('g', { class: 'rp-new', transform: `translate(${newest.cx} ${newest.cy})` },
      h('circle', { r: 10 }), h('text', { x: -14, y: -14, 'text-anchor': 'end' }, 'new 7-day reading'));
    svg.append(newTag, node);
    parts = { sweep, baseLine, meanLine, bracket, baseLabel, meanLabel, node, dots, newTag, nx, ny, m, iw };
    stageHost.replaceChildren(svg);
  }

  function setMeters(observed, matches, compared) {
    meters.replaceChildren(
      meter('Uploads observed', observed == null ? '—' : String(observed)),
      meter('Pattern matches', matches == null ? '—' : String(matches)),
      meter('Channel baseline', compared ? formatInt(s.baselineViews) : '—'),
      meter('Pattern average', compared ? formatInt(s.groupViews) : '—'));
  }
  const meter = (k, v) => h('div', { class: 'rp-meter' }, h('span', null, k), h('b', { class: 'num' }, v));

  function cardWaiting(text) {
    card.className = 'rp-card waiting';
    card.replaceChildren(h('span', { class: 'rp-scan', 'aria-hidden': 'true' }), h('span', { class: 'muted' }, text));
  }
  function cardResolved(withEvidence) {
    card.className = `rp-card resolved ${withEvidence ? 'with-ev' : ''}`;
    card.replaceChildren(
      h('div', { class: 'rp-card-top' }, h('span', { class: 'eyebrow' }, 'Finding'), stateChip(s.state), qualityBadge(s.quality)),
      h('h3', null, f.name, ' ', h('span', { class: 'mult up' }, h('b', { class: 'num' }, formatMultiplier(s.multiplier)), ' channel baseline')),
      h('p', { class: 'rp-measure' }, `${s.n} uploads · ${s.retGroup}% still watching at 0:30 (baseline ${s.retBase}%)`),
      withEvidence ? h('div', { class: 'rp-ev' },
        h('span', { class: 'dim' }, 'Supporting evidence'),
        evidence.map((e, i) => h('button', { class: 'rp-ev-chip', type: 'button', style: { '--i': i },
          onclick: () => { setPlaying(false); openEvidence({ ...e, findingId: f.id, findingName: f.name }); } },
        h('span', { class: 'ts num' }, `${formatTime(e.segment.start)}–${formatTime(e.segment.end)}`),
        h('span', { class: 'rp-ev-title' }, e.video.title), provChip(e.video)))) : null,
      withEvidence ? h('details', { class: 'rp-more' }, h('summary', null, 'How this was measured'),
        h('p', null, f.observation(s), ` They averaged ${formatInt(s.groupViews)} views in their first 7 days; the median of the channel's other ${s.nBaseline} long-form uploads is ${formatInt(s.baselineViews)}.`),
        h('p', { class: 'muted' }, 'Interpretation: ', f.interpretation),
        h('a', { href: 'demo/#/findings/F1', class: 'text-link demo-cta' }, 'Open this finding in the demo')) : null);
  }

  function setStep(id) {
    const idx = STEPS.findIndex((x) => x.id === id);
    stepList.querySelectorAll('li').forEach((li, i) => { li.className = i < idx ? 'done' : i === idx ? 'now' : ''; li.toggleAttribute('aria-current', i === idx); });
    status.textContent = STEPS[idx].label;
    frame.dataset.step = id;
  }

  function pulseAt(el) {
    const r = el.getBoundingClientRect();
    document.dispatchEvent(new CustomEvent('merlark:observe', { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }));
  }

  const anim = (el, kf, opts) => { const a = el.animate(kf, { fill: 'both', easing: ease, ...opts }); anims.push(a); if (!playing || document.hidden) a.pause(); return a; };
  // Resume only what is paused: play() on a finished animation would rewind it out of step with the clock.
  const resumeAnims = () => anims.forEach((a) => { if (a.playState === 'paused') a.play(); });
  const pauseAnims = () => anims.forEach((a) => { if (a.playState === 'running') a.pause(); });

  function schedule() {
    const { dots, sweep, baseLine, meanLine, bracket, baseLabel, meanLabel, node, newTag, nx, ny, m, iw } = parts;
    const ev = [];
    ev.push({ at: 0, run: () => { setStep('observe'); setMeters(0, null, false); cardWaiting('Watching new uploads…');
      anim(sweep, [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${iw}px)`, opacity: 1 }, { transform: `translateX(${iw}px)`, opacity: 0 }], { duration: 3800, easing: 'linear' }); } });
    dots.forEach((d, i) => {
      const at = 0.15 + ((d.cx - m.l) / iw) * 3.6;
      ev.push({ at, run: () => { d.g.classList.add('on'); setMeters(i + 1, null, false); if (i % 6 === 5 && window.innerWidth > 640) pulseAt(d.g.querySelector('circle')); } });
    });
    ev.push({ at: 3.85, run: () => { newTag.classList.add('on'); } });
    ev.push({ at: 4, run: () => { setStep('match'); cardWaiting('Looking for patterns across uploads…'); newTag.classList.remove('on'); } });
    const matches = dots.filter((d) => d.g.classList.contains('match'));
    matches.forEach((d, i) => ev.push({ at: 4.2 + i * 0.22, run: () => {
      d.g.classList.add('hi');
      const p = h('circle', { r: 3, class: 'rp-particle', cx: 0, cy: 0 });
      svg.append(p);
      const cxm = (d.cx + nx) / 2; const cym = Math.min(d.cy, ny) - 30;
      const kf = Array.from({ length: 13 }, (_, k) => { const t = k / 12; const px = (1 - t) ** 2 * d.cx + 2 * (1 - t) * t * cxm + t * t * nx; const py = (1 - t) ** 2 * d.cy + 2 * (1 - t) * t * cym + t * t * ny; return { transform: `translate(${px}px, ${py}px)`, opacity: t > 0.9 ? 0 : 1 }; });
      anim(p, kf, { duration: 1100, easing: 'cubic-bezier(0.45,0,0.2,1)' });
      setMeters(dots.length, i + 1, false);
    } }));
    ev.push({ at: 5.6, run: () => { node.classList.add('on'); if (window.innerWidth > 640) pulseAt(node); } });
    ev.push({ at: 6.8, run: () => { setStep('compare'); cardWaiting('Comparing with the channel’s own history…');
      anim(baseLine, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 900 });
      baseLabel.classList.add('on'); setMeters(dots.length, matches.length, true); } });
    ev.push({ at: 7.6, run: () => { anim(meanLine, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 900 }); meanLabel.classList.add('on'); } });
    ev.push({ at: 8.5, run: () => { bracket.classList.add('on'); } });
    ev.push({ at: 9.4, run: () => { setStep('resolve'); cardResolved(false); dots.forEach((d) => d.g.classList.toggle('lo', !d.g.classList.contains('match'))); } });
    ev.push({ at: 11.2, run: () => { setStep('inspect'); cardResolved(true); } });
    ev.push({ at: 20, run: () => { frame.classList.add('rp-fading'); } });
    ev.push({ at: CYCLE, run: () => restart() });
    events = ev.sort((a, b) => a.at - b.at);
  }

  function tick(now) {
    const g = gen;
    if (playing && !document.hidden) elapsed += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (g === gen && fired < events.length && events[fired].at <= elapsed) events[fired++].run();
    if (g !== gen) return; // an event restarted the replay; the new loop owns the frame
    raf = requestAnimationFrame(tick);
  }

  function restart() {
    gen += 1;
    cancelAnimationFrame(raf);
    anims.forEach((a) => a.cancel()); anims = [];
    frame.classList.remove('rp-fading');
    build(); schedule();
    elapsed = 0; fired = 0;
    if (reducedMotion()) { staticResult(); return; }
    while (fired < events.length && events[fired].at <= 0) events[fired++].run(); // first frame renders immediately
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  // Reduced motion: an intentional static presentation of the final state.
  function staticResult() {
    const { dots, baseLine, meanLine, bracket, baseLabel, meanLabel, node } = parts;
    dots.forEach((d) => { d.g.classList.add('on'); if (d.g.classList.contains('match')) d.g.classList.add('hi'); else d.g.classList.add('lo'); });
    [baseLine, meanLine].forEach((l) => { l.style.strokeDashoffset = 0; });
    [bracket, baseLabel, meanLabel, node].forEach((el) => el.classList.add('on'));
    setStep('inspect'); setMeters(dots.length, s.n, true); cardResolved(true);
    status.textContent = 'Motion is off · showing the replay’s result';
    frame.classList.add('static');
  }

  function setPlaying(p) {
    playing = p;
    if (p && !document.hidden) resumeAnims(); else pauseAnims();
    frame.classList.toggle('paused', !p);
    paintControls();
  }
  function paintControls() {
    const still = reducedMotion();
    pauseBtn.hidden = still; replayBtn.hidden = still;
    pauseBtn.replaceChildren(icon(playing ? 'pause' : 'play', 14), playing ? 'Pause' : 'Resume');
    pauseBtn.setAttribute('aria-label', playing ? 'Pause demo replay' : 'Resume demo replay');
  }
  pauseBtn.addEventListener('click', () => setPlaying(!playing));
  // A hidden tab freezes the clock; pause running animations too, and resume them only if the visitor had not paused.
  document.addEventListener('visibilitychange', () => (document.hidden || !playing ? pauseAnims() : resumeAnims()));
  replayBtn.addEventListener('click', () => { playing = true; paintControls(); restart(); });
  document.addEventListener('merlark:motion', () => { frame.classList.remove('static'); playing = true; paintControls(); restart(); });

  let lw = 0;
  const ro = new ResizeObserver(() => { const w = stageHost.clientWidth; if (Math.abs(w - lw) > 24) { lw = w; restart(); } });
  ro.observe(stageHost);
  paintControls();
}
