// assets/js/scene.js
// The landing's main scene: one set of video thumbnails that the visitor's native scrolling carries through
// five compositions (opening → discovery → evidence → comparison → next step). Positions come from
// scene-layout.js; this file interpolates them along curved paths with per-video phase offsets, keeps the
// field drifting while idle, draws the connections and their travelling signals, and fades the copy.
// Scrolling back reverses everything because every frame is a function of scroll position and time.

import { h } from '../../demo/js/ui/dom.js';
import { Clock, noise3, seeded, smooth, clamp01 } from '../../demo/js/ui/flow.js';
import { thumb } from '../../demo/js/ui/thumbs.js';
import { formatInt, formatTime } from '../../demo/js/data/derive.js';
import { buildLayouts, STAGES, SOURCE_ID } from './scene-layout.js';

const lerp = (a, b, t) => a + (b - a) * t;
const N = STAGES.length - 1;
const CONN = [0.3, 0.92, 0.16, 0, 0.72];   // map-group connection strength per stage
const DRIFT = [1, 0.55, 0.3, 0.12, 0.5];    // idle drift amplitude per stage

export function mountScene(root, { items, finding, atmos, reduced }) {
  const pin = root.querySelector('.scene-pin');
  const copies = [...root.querySelectorAll('.stage-copy')];
  const navButtons = [...root.querySelectorAll('.scene-nav button')];
  root.classList.add('is-live');

  // ---- build the field
  const rnd = seeded(77);
  const els = items.map((it, i) => {
    const el = h('figure', { class: `sc-t g-${it.group} ${it.prov}`, 'data-id': it.id }, thumb(it.v, 200));
    return { ...it, el, i, delay: it.group === 'map' ? 0.15 + rnd() * 0.5 : rnd(), bend: (rnd() - 0.5) * 0.7, z: 0.5 + rnd() * 0.8, sp: 0.07 + rnd() * 0.06, ph: rnd(), pos: { x: 0, y: 0, s: 1, o: 0 } };
  });
  const svg = h('svg', { class: 'sc-links', 'aria-hidden': 'true' });
  const futureLink = h('path', { class: 'lk lk-future' });
  svg.append(futureLink);
  const links = els.map((e) => {
    const path = h('path', { class: e.group === 'map' ? 'lk lk-map' : 'lk lk-cluster' });
    const sig = e.group === 'map' ? h('circle', { class: 'sig', r: 2.6 }) : null;
    svg.append(path); if (sig) svg.append(sig);
    return { path, sig };
  });
  const S = finding;
  const ev = S.groupAll.find((v) => v.id === SOURCE_ID);
  const seg = S.finding.evidenceSegment(ev);
  const focalEl = h('div', { class: 'sc-focal', 'aria-hidden': 'true' }, h('i', { class: 'sc-point' }),
    h('div', { class: 'sc-flabel' }, h('em', null, S.finding.name), h('small', null, `Working · ${S.n} uploads · ${S.multiplier.toFixed(1)}× channel baseline`)));
  const head = h('i', { class: 'sc-head' });
  const evEl = h('div', { class: 'sc-ev', 'aria-hidden': 'true' },
    h('div', { class: 'sc-ev-row' }, h('b', { class: 'sc-ts num' }, `${formatTime(seg.start)} – ${formatTime(seg.end)}`), h('span', null, seg.label)),
    h('div', { class: 'sc-track' }, h('i', { class: 'sc-seg', style: { width: `${((seg.end - seg.start) / 60) * 100}%`, left: `${(seg.start / 60) * 100}%` } }), head),
    h('div', { class: 'sc-scale num' }, h('span', null, '0:00'), h('span', null, 'first minute'), h('span', null, '1:00')));
  const chartEl = h('div', { class: 'sc-chart', 'aria-hidden': 'true' });
  const futureEl = h('div', { class: 'sc-future', 'aria-hidden': 'true' }, h('span', null, 'Next upload'), h('small', null, 'route map in the first 10 seconds'));
  const reticle = h('div', { class: 'sc-reticle', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'));
  const field = h('div', { class: 'sc-field', 'aria-hidden': 'true' }, svg, chartEl, futureEl, ...els.map((e) => e.el), reticle, focalEl, evEl);
  pin.prepend(field);

  let lay; let vw = 0; let vh = 0;
  const chartRange = { min: 12000, max: 34000 };
  function layout() {
    vw = pin.clientWidth; vh = pin.clientHeight;
    lay = buildLayouts(els, vw, vh, chartRange);
    root.classList.toggle('narrow', lay.narrow);
    // Each figure is laid out at its largest size and only ever scaled down, so enlarged frames stay sharp.
    els.forEach((e) => { e.maxS = Math.max(...lay.L.map((st) => st[e.i].s)); e.el.style.width = `${lay.W * e.maxS}px`; });
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`); svg.setAttribute('width', vw); svg.setAttribute('height', vh);
    drawChart();
    futureEl.style.width = `${lay.W * (lay.narrow ? 1.25 : 0.86)}px`;
    futureEl.style.left = `${lay.future.x * vw}px`; futureEl.style.top = `${lay.future.y * vh}px`;
  }
  function drawChart() {
    const y0 = (lay.lanes.map - (lay.narrow ? 0.07 : 0.11)) * vh; const y1 = (lay.lanes.base + (lay.narrow ? 0.07 : 0.12)) * vh;
    const X = (v) => lay.sx(v) * vw;
    const ticks = [15000, 20000, 25000, 30000].map((t) => h('span', { class: 'tick num', style: { left: `${X(t)}px`, top: `${y1 + 6}px` } }, `${t / 1000}k`));
    const vline = (v, cls, label, sub) => h('div', { class: `vline ${cls}`, style: { left: `${X(v)}px`, top: `${y0}px`, height: `${y1 - y0}px` } },
      h('span', { class: 'vl-label' }, h('b', { class: 'num' }, formatInt(v)), label, h('small', null, sub)));
    // Lane labels sit just above the highest tile of their lane.
    const laneLabel = (lane, text) => {
      const ys = els.filter((e) => (lane === 'map') === (e.group === 'map')).map((e) => lay.L[3][e.i].y * vh);
      const top = Math.min(...ys) - (lay.W * lay.L[3][0].s * 9) / 32 - 26;
      return h('span', { class: 'lane', style: { left: `${lay.x0 * vw}px`, top: `${top}px` } }, text);
    };
    chartEl.replaceChildren(...[
      h('div', { class: 'axis', style: { left: `${lay.x0 * vw}px`, width: `${(lay.x1 - lay.x0) * vw}px`, top: `${y1}px` } }),
      ...ticks,
      lay.narrow ? null : laneLabel('map', `Map-first · ${S.n} uploads`),
      lay.narrow ? null : laneLabel('base', `Rest of the channel · ${S.nBaseline} long-form uploads`),
      vline(S.baselineViews, 'base', 'channel baseline', `median of ${S.nBaseline}`),
      vline(S.groupViews, 'group', 'map-first', `average of ${S.n}`),
      lay.narrow ? null : h('span', { class: 'axis-title', style: { left: `${lay.x1 * vw}px`, top: `${y1 + 24}px` } }, 'Views in the first 7 days'),
      h('span', { class: 'legend-row', style: { left: `${lay.x0 * vw}px`, top: `${y1 + (lay.narrow ? 26 : 44)}px` } },
        h('span', null, h('i', { class: 'h' }), 'Historical estimate'), h('span', null, h('i', { class: 'o' }), 'Observed by Merlark')),
    ].filter(Boolean));
  }

  // ---- progress: native scroll → stage float with a resting plateau at every stage
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  let ps = 0; let target = 0;
  function rawProgress() {
    const r = root.getBoundingClientRect();
    const total = root.offsetHeight - window.innerHeight;
    return clamp01(-r.top / Math.max(1, total)) * N;
  }
  function plateau(r) { const a = Math.min(N - 1, Math.floor(r)); const f = r - a; return a + clamp01((f - 0.14) / 0.72); }

  function frame(t, dt) {
    const still = reduced();
    target = still ? Math.round(rawProgress()) : plateau(rawProgress());
    ps = still || dt === 0 ? target : ps + (target - ps) * (1 - Math.exp(-dt * 6.5));
    if (Math.abs(target - ps) < 0.0005) ps = target;
    ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06;
    const a = Math.min(N - 1, Math.floor(ps)); const f = ps - a; const sf = smooth(f);
    const fa = lay.focal[a]; const fb = lay.focal[a + 1];
    const focal = { x: lerp(fa.x, fb.x, sf) * vw, y: lerp(fa.y, fb.y, sf) * vh };
    const weight = (s) => smooth(clamp01(1 - Math.abs(ps - s)));
    const amp = lerp(DRIFT[a], DRIFT[a + 1], sf) * (still ? 0 : 1);

    for (const e of els) {
      const A = lay.L[a][e.i]; const B = lay.L[a + 1][e.i];
      const ti = smooth((f - e.delay * 0.35) / 0.65);
      const ax = A.x * vw; const ay = A.y * vh; const bx = B.x * vw; const by = B.y * vh;
      const dx = bx - ax; const dy = by - ay; const dist = Math.hypot(dx, dy) || 1;
      const cx = (ax + bx) / 2 - (dy / dist) * e.bend * dist * 0.5; const cy = (ay + by) / 2 + (dx / dist) * e.bend * dist * 0.5;
      const u = 1 - ti;
      let x = u * u * ax + 2 * u * ti * cx + ti * ti * bx; let y = u * u * ay + 2 * u * ti * cy + ti * ti * by;
      const big = e.id === SOURCE_ID ? 1 - weight(2) * 0.85 : 1;
      x += noise3(e.i * 0.71, t * 0.085, 3) * amp * lay.W * 0.16 * big - ptr.x * e.z * 9;
      y += noise3(e.i * 0.71 + 40, t * 0.075, 5) * amp * lay.W * 0.12 * big - ptr.y * e.z * 6;
      const s = lerp(A.s, B.s, ti); const o = lerp(A.o, B.o, ti);
      e.pos = { x, y, s, o };
      e.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(s / e.maxS).toFixed(4)})`;
      e.el.style.opacity = o.toFixed(3);
      e.el.style.zIndex = e.id === SOURCE_ID ? 6 : e.group === 'map' ? 4 : 2;
    }

    // Connections: map videos → the finding; cluster members → their cluster (discovery only).
    const clusterCentre = {};
    for (const e of els) if (e.group !== 'map') { const c = clusterCentre[e.group] || (clusterCentre[e.group] = { x: 0, y: 0, n: 0 }); c.x += e.pos.x; c.y += e.pos.y; c.n++; }
    els.forEach((e, k) => {
      const { path, sig } = links[k];
      let strength; let to;
      if (e.group === 'map') {
        const sv = (s) => (s === 2 ? (e.id === SOURCE_ID ? 0.95 : 0.12) : CONN[s]);
        strength = lerp(sv(a), sv(a + 1), sf) * Math.min(1, e.pos.o * 1.3); to = focal;
      } else {
        const c = clusterCentre[e.group]; strength = weight(1) * 0.32; to = { x: c.x / c.n, y: c.y / c.n };
      }
      if (strength < 0.01) { path.style.opacity = 0; if (sig) sig.style.opacity = 0; return; }
      const fx = e.pos.x; const fy = e.pos.y; const dx = to.x - fx; const dy = to.y - fy; const d = Math.hypot(dx, dy) || 1;
      const px = -dy / d; const py = dx / d;
      const b1 = (noise3(e.i, t * 0.05, 9) * 0.16 + e.bend * 0.2) * d * (still ? 0.4 : 1); const b2 = (noise3(e.i + 9, t * 0.045, 11) * 0.12 - e.bend * 0.1) * d;
      const c1x = fx + dx * 0.32 + px * b1; const c1y = fy + dy * 0.32 + py * b1;
      const c2x = fx + dx * 0.74 + px * b2; const c2y = fy + dy * 0.74 + py * b2;
      path.setAttribute('d', `M${fx.toFixed(1)} ${fy.toFixed(1)}C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`);
      path.style.opacity = strength.toFixed(3);
      if (sig) {
        if (still) { sig.style.opacity = 0; return; }
        const uu = (t * e.sp + e.ph) % 1; const v = 1 - uu;
        const sx = v * v * v * fx + 3 * v * v * uu * c1x + 3 * v * uu * uu * c2x + uu * uu * uu * to.x;
        const sy = v * v * v * fy + 3 * v * v * uu * c1y + 3 * v * uu * uu * c2y + uu * uu * uu * to.y;
        sig.setAttribute('cx', sx.toFixed(1)); sig.setAttribute('cy', sy.toFixed(1));
        sig.style.opacity = (strength * Math.sin(Math.PI * uu)).toFixed(3);
      }
    });

    // Overlays follow the composition.
    const w0 = weight(0); const w1 = weight(1); const w2 = weight(2); const w3 = weight(3); const w4 = weight(4);
    focalEl.style.transform = `translate3d(${focal.x.toFixed(1)}px, ${focal.y.toFixed(1)}px, 0)`;
    focalEl.style.opacity = Math.max(w0, w1, w4 * 0.95).toFixed(3);
    focalEl.classList.toggle('label-left', lay.narrow ? false : ps > 3.5);
    const src = els.find((e) => e.id === SOURCE_ID);
    src.el.classList.toggle('is-big', w2 > 0.25);
    const sw = lay.W * src.pos.s; const sh = (sw * 9) / 16;
    evEl.style.width = `${Math.max(240, sw)}px`;
    evEl.style.transform = `translate3d(${(src.pos.x - Math.max(240, sw) / 2).toFixed(1)}px, ${(src.pos.y + sh / 2 + 14).toFixed(1)}px, 0)`;
    evEl.style.opacity = smooth(clamp01((w2 - 0.35) / 0.65)).toFixed(3);
    head.style.left = `${(((seg.start + ((t * 2.2) % (seg.end - seg.start))) / 60) * 100).toFixed(2)}%`;
    reticle.style.width = `${sw + 18}px`; reticle.style.height = `${sh + 18}px`;
    reticle.style.transform = `translate3d(${(src.pos.x - sw / 2 - 9).toFixed(1)}px, ${(src.pos.y - sh / 2 - 9).toFixed(1)}px, 0)`;
    reticle.style.opacity = smooth(clamp01((w2 - 0.5) / 0.5)).toFixed(3);
    chartEl.style.opacity = smooth(clamp01((w3 - 0.3) / 0.7)).toFixed(3);
    futureEl.style.opacity = smooth(clamp01((w4 - 0.4) / 0.6)).toFixed(3);
    const fx2 = lay.future.x * vw; const fy2 = lay.future.y * vh; const midx = (focal.x + fx2) / 2;
    futureLink.setAttribute('d', `M${focal.x.toFixed(1)} ${focal.y.toFixed(1)}C${midx.toFixed(1)} ${(focal.y - 40).toFixed(1)} ${midx.toFixed(1)} ${(fy2 + 30).toFixed(1)} ${(fx2 - (lay.narrow ? 0 : lay.W * 0.43)).toFixed(1)} ${(fy2 - (lay.narrow ? lay.W * 0.17 : 0)).toFixed(1)}`);
    futureLink.style.opacity = smooth(clamp01((w4 - 0.4) / 0.6)).toFixed(3);
    pin.style.setProperty('--cmp', w3.toFixed(3));

    copies.forEach((c, s) => {
      const d = ps - s; const o = still ? (Math.round(ps) === s ? 1 : 0) : smooth(clamp01(1 - Math.abs(d) * 2.1));
      c.style.opacity = o.toFixed(3);
      c.style.transform = `translate3d(0, ${(still ? 0 : -d * 28).toFixed(1)}px, 0)`;
      c.classList.toggle('is-active', o > 0.6);
    });
    const active = Math.round(ps);
    navButtons.forEach((b, s) => b.setAttribute('aria-current', s === active ? 'step' : 'false'));
    if (atmos) atmos.setFocus(focal.x / vw, focal.y / vh, 0.6 + Math.max(w1, w4) * 0.6 + w2 * 0.2);
  }

  const clock = new Clock(frame);
  let visible = true;
  const sync = () => { if (reduced() || !visible) { clock.pause(); clock.set(clock.t); } else clock.play(); };
  const onScroll = () => { if (!clock.running) clock.set(clock.t); };
  const onPointer = (e) => { if (e.pointerType === 'touch') return; ptr.tx = (e.clientX / window.innerWidth) * 2 - 1; ptr.ty = (e.clientY / window.innerHeight) * 2 - 1; };
  const ro = new ResizeObserver(() => { layout(); clock.set(clock.t); });
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; sync(); }, { rootMargin: '10% 0px' });

  navButtons.forEach((b, s) => b.addEventListener('click', () => {
    const total = root.offsetHeight - window.innerHeight;
    window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY + (total * s) / N, behavior: reduced() ? 'auto' : 'smooth' });
  }));

  layout();
  ps = target = plateau(rawProgress());
  clock.set(4);
  ro.observe(pin); io.observe(root);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('merlark:motion', sync);
  sync();
  return { dispose() { clock.dispose(); ro.disconnect(); io.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('pointermove', onPointer); document.removeEventListener('merlark:motion', sync); } };
}
