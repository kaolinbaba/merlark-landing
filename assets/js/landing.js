// assets/js/landing.js
// Landing: brand marks, copy bound to the demo dataset, the hero "peek" control panel, the benefits that the
// peek's pieces settle into, and the tabbed preview built from real demo components.
// Every number is derived from the demo's data for the selected dates, so the page and the demo always agree.
// The HTML carries the all-history values for readers without JavaScript.

import { h, icon, symbol, wordmark, reducedMotion, segmented } from '../../demo/js/ui/dom.js';
import { findingStats, allFindingStats, getRange, formatInt, formatMultiplier, STATE_LABEL, STATE_ICON, videoById, inRange } from '../../demo/js/data/derive.js';
import { initMotionPreference, motionToggle, countUp } from '../../demo/js/ui/motion.js';
import { thumb, stateChip, calcLines } from '../../demo/js/ui/components.js';
import { videos, findings, seedInterventions, BACKFILL_LABEL, CONNECTED_AT } from '../../demo/js/data/fixtures.js';
import { findingCard } from '../../demo/js/views/findings.js';
import { videoPreview } from '../../demo/js/views/evidence.js';
import { scriptModel } from '../../demo/js/data/script-model.js';

initMotionPreference();
const $ = (sel, root = document) => root.querySelector(sel);

// ---- brand marks
const logos = {
  lockup: () => [symbol(30), wordmark(21)],
  'lockup-small': () => h('span', { class: 'logo' }, symbol(24), wordmark(17)),
  'symbol-lg': () => symbol(48),
};
document.querySelectorAll('[data-logo]').forEach((el) => { const mk = logos[el.dataset.logo]; if (mk) { el.classList.add('logo'); el.replaceChildren(...[].concat(mk())); } });
$('#motion-toggle-foot').append(motionToggle());
const head = $('.site-head');
const onScroll = () => head.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

// ---- the peek: one pattern, its videos, a comparison and one thing to try, for the selected dates
const F1 = findings[0];
const PEEK_RANGES = [['all', 'All history'], ['6m', '6 months'], ['90d', '90 days']];
const peek = $('.peek');
const slot = (k) => $(`[data-peek="${k}"]`, peek);
const wires = slot('wires');
const vidHost = slot('videos');
let peekRange = 'all';

function statsFor(rangeId) { return findingStats(F1, getRange(rangeId)); }

function paintPeek(rangeId, animate) {
  const range = getRange(rangeId);
  const s = statsFor(rangeId);
  const recent = videos.filter((v) => v.format === 'long' && inRange(v, range)).slice(-6);
  vidHost.replaceChildren(...recent.map((v) => { const t = thumb(v, 80, { duration: false }); t.classList.add(F1.match(v) ? 'hit' : 'miss'); return t; }));
  const chip = slot('chip');
  chip.className = `chip state state-${s.state}`;
  chip.replaceChildren(icon(STATE_ICON[s.state], 13), STATE_LABEL[s.state]);
  peek.querySelectorAll('[data-f1="n"]').forEach((el) => { el.textContent = String(s.groupAll.length); });
  const mult = $('[data-f1="mult"]', peek);
  if (s.multiplier == null) mult.textContent = '—';
  else countUp(mult, `peek:${rangeId}`, s.multiplier, formatMultiplier, 1);
  const max = Math.max(s.groupViews || 0, s.baselineViews || 0) || 1;
  const bars = peek.querySelectorAll('.peek-bar');
  [[s.groupViews, 'groupViews'], [s.baselineViews, 'baselineViews']].forEach(([val, key], i) => {
    bars[i].querySelector('i').style.setProperty('--w', `${((val || 0) / max) * 100}%`);
    $(`[data-f1="${key}"]`, peek).textContent = formatInt(val);
  });
  const calc = calcLines(s);
  bars[0].title = calc.group; bars[1].title = calc.base;
  // Every range here starts before the connection date, so reconstructed history is in view: keep the label visible.
  $('.peek-note.backfill', peek).hidden = range.start >= CONNECTED_AT;
  if (animate && !reducedMotion()) [vidHost, slot('pattern'), $('.peek-compare', peek)].forEach((el) => { el.classList.remove('changing'); void el.offsetWidth; el.classList.add('changing'); });
  requestAnimationFrame(() => drawWires(animate));
}

// Connectors from each matching video to the pattern card.
function drawWires(animate) {
  const box = peek.getBoundingClientRect();
  const target = slot('pattern').getBoundingClientRect();
  const tx = target.left - box.left + target.width / 2; const ty = target.top - box.top;
  wires.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  wires.replaceChildren(...[...vidHost.querySelectorAll('.thumb.hit')].map((t, i) => {
    const r = t.getBoundingClientRect();
    const x = r.left - box.left + r.width / 2; const y = r.bottom - box.top;
    const p = h('path', { d: `M${x.toFixed(1)} ${y.toFixed(1)} C${x.toFixed(1)} ${(y + 22).toFixed(1)} ${tx.toFixed(1)} ${(ty - 22).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`, 'data-i': i });
    return p;
  }));
  wires.querySelectorAll('path').forEach((p, i) => {
    const len = p.getTotalLength ? p.getTotalLength() : 200;
    p.style.strokeDasharray = `${len}`; p.style.setProperty('--len', `${len}`);
    if (animate && !reducedMotion()) { p.style.animationDelay = `${i * 70}ms`; p.classList.add('draw'); }
  });
}

const rangeCtl = segmented(PEEK_RANGES, peekRange, (v) => { peekRange = v; paintPeek(v, true); }, { label: 'Dates' });
slot('range').append(rangeCtl);
paintPeek('all', true);
window.addEventListener('resize', () => { clearTimeout(window.__pw); window.__pw = setTimeout(() => drawWires(false), 120); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawWires(false));

// Hovering or focusing the pattern lifts its supporting videos.
const pat = slot('pattern');
['pointerenter', 'focus'].forEach((e) => pat.addEventListener(e, () => peek.classList.add('lit')));
['pointerleave', 'blur'].forEach((e) => pat.addEventListener(e, () => peek.classList.remove('lit')));
slot('try').querySelector('.peek-try-ico').append(icon('bulb', 16));

// At rest: a matching video joins the group, its connector redraws, and the insight settles in. Varied pauses.
const PAUSES = [2600, 3400, 2900, 4200];
let beat = 0; let restTimer = 0;
function rest() {
  clearTimeout(restTimer);
  restTimer = setTimeout(() => {
    if (!reducedMotion() && !document.hidden && peekVisible) {
      const hits = [...vidHost.querySelectorAll('.thumb.hit')];
      const paths = [...wires.querySelectorAll('path')];
      if (hits.length) {
        const i = beat % hits.length;
        hits[i].classList.add('join');
        const p = paths[i];
        if (p) { p.classList.remove('draw'); void p.getBoundingClientRect(); p.style.animationDelay = '0ms'; p.classList.add('draw'); }
        setTimeout(() => hits[i] && hits[i].classList.remove('join'), 900);
        if (beat % 3 === 2) { const t = slot('try'); t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); }
      }
      beat++;
    }
    rest();
  }, PAUSES[beat % PAUSES.length]);
}
let peekVisible = true;
if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { peekVisible = e.isIntersecting; }).observe(peek);
rest();

// ---- benefits: the peek's pieces settle into the three clues as they arrive
const arts = [...document.querySelectorAll('.b-art')];
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    if (reducedMotion()) return;
    arts.forEach((art, i) => {
      const src = slot(art.dataset.from);
      const a = art.getBoundingClientRect(); const b = src.getBoundingClientRect();
      art.classList.add('arrive');
      if (b.bottom < -600) return; // the peek is far away: just a gentle arrival
      const dx = (b.left + b.width / 2) - (a.left + a.width / 2); const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
      const sc = Math.min(1.2, Math.max(0.4, b.width / a.width));
      art.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sc})`, opacity: 0.2 }, { transform: 'none', opacity: 1 }], { duration: 760 + i * 90, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' });
    });
  }, { threshold: 0.3 });
  io.observe($('.benefits'));
}

// ---- product preview: four tabs built from the demo's own components
const tabs = [...document.querySelectorAll('.look-tabs [role="tab"]')];
const mark = $('.look-mark');
const built = new Set();
let lookRange = 'all';
const panes = {
  spot(el) {
    const grid = h('div', { class: 'finding-grid' });
    const paint = () => grid.replaceChildren(...allFindingStats(getRange(lookRange)).filter((s) => s.finding.id !== 'F5').map((s) => {
      const c = findingCard(s); c.href = `demo/?skipwelcome#/patterns/${s.finding.id}`; return c;
    }));
    paint();
    const label = h('p', { class: 'backfill-label' }, icon('info', 14), BACKFILL_LABEL);
    const paintLabel = () => { label.hidden = getRange(lookRange).start >= CONNECTED_AT; };
    paintLabel();
    el.append(h('div', { class: 'pane-head' }, h('h3', null, 'What’s showing up?'),
      segmented([['all', 'All history'], ['6m', '6 months'], ['90d', '90 days'], ['since', 'Since connection']], lookRange, (v) => { lookRange = v; paint(); paintLabel(); if (!reducedMotion()) { grid.classList.remove('changing'); void grid.offsetWidth; grid.classList.add('changing'); } }, { label: 'Dates' })), grid, label);
  },
  check(el) {
    const v = videoById('v23');
    const s = findingStats(F1, getRange('all'));
    el.append(h('div', { class: 'pane-head' }, h('h3', null, v.title), stateChip(s.state)),
      h('div', { class: 'check-grid' },
        h('div', null, videoPreview(v, { at: 0, focusSource: 'F1' })),
        h('div', { class: 'check-side' },
          h('span', { class: 'label' }, icon('calendar', 18), 'The first week'),
          h('dl', { class: 'facts big' }, h('dt', null, 'Views'), h('dd', { class: 'num' }, formatInt(v.views7)), h('dt', null, 'Average watched'), h('dd', { class: 'num' }, `${v.avgPct}%`), h('dt', null, 'Still watching at 0:30'), h('dd', { class: 'num' }, `${v.ret30}%`)),
          h('span', { class: 'label' }, icon('patterns', 18), 'Connected patterns'),
          h('a', { class: 'chip', href: 'demo/?skipwelcome#/patterns/F1' }, F1.name),
          h('a', { class: 'btn btn-ghost btn-sm', href: `demo/?skipwelcome#/videos/${v.id}` }, 'Open this video', icon('arrow', 16)))));
  },
  shape(el) {
    const m = scriptModel({ topic: 't1', selected: ['F1', 'F2', 'F5'], order: null, removed: [] }, getRange('since'));
    const blocks = m.draft.blocks.filter((b) => b.source || b.id === 's1').slice(0, 4);
    el.append(h('div', { class: 'pane-head' }, h('h3', null, 'Give your next idea a shape.'), h('span', { class: 'chip preview' }, 'Since connection')),
      h('ol', { class: 'blocks' }, blocks.map((b) => h('li', { class: `block g-${b.ground.kind}` },
        h('span', { class: 'drag', 'aria-hidden': 'true' }, icon('drag', 16)),
        h('div', { class: 'block-main' }, h('div', { class: 'block-meta' }, h('span', { class: 'sec' }, b.section), h('span', { class: 'gl' }, b.ground.label), b.source ? h('span', { class: 'cite' }, icon('link', 12), b.source) : null),
          h('strong', null, b.label), h('p', null, b.text),
          b.ground.kind === 'ungrounded' ? h('p', { class: 'fine' }, 'There isn’t enough evidence to support this suggestion yet.') : null),
        h('span')))));
  },
  try(el) {
    const iv = seedInterventions[1];
    const f = findings.find((x) => x.id === iv.findingId);
    let state = 'planned';
    const track = h('ol', { class: 'iv-track', 'aria-label': 'Status' });
    const sw = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': 'false', 'aria-label': 'Trying it' }, h('i'));
    const paint = () => {
      const at = state === 'planned' ? 0 : 1;
      track.replaceChildren(...['Planned', 'Trying it', 'Results added'].map((l, i) => h('li', { class: i < at ? 'done' : i === at ? 'now' : '' }, h('i', { 'aria-hidden': 'true' }), l)));
      sw.setAttribute('aria-checked', String(state === 'trying')); sw.classList.toggle('on', state === 'trying');
    };
    sw.addEventListener('click', () => { state = state === 'planned' ? 'trying' : 'planned'; paint(); });
    paint();
    el.append(h('div', { class: 'pane-head' }, h('h3', null, 'Try one small change.'), h('span', { class: 'chip' }, icon('patterns', 13), f.name)),
      h('div', { class: 'try-board' },
        h('div', { class: 'try-card' }, track, h('h3', null, iv.title),
          h('p', { class: 'muted' }, 'Write down an idea. Come back to see what happened.'),
          h('div', { class: 'try-row' }, h('span', null, 'Trying it'), sw)),
        h('div', { class: 'try-note' }, h('span', { class: 'label' }, icon('info', 18), 'Good to know'),
          h('p', null, 'Other changes can affect the result too. Results are kept apart from the pattern that inspired them.'),
          h('a', { class: 'btn btn-ghost btn-sm', href: 'demo/?skipwelcome#/experiments' }, 'See experiments', icon('arrow', 16)))));
  },
};
function placeMark(t, instant) {
  if (!t.offsetWidth) return;
  if (instant) mark.style.transition = 'none';
  mark.style.width = `${t.offsetWidth}px`; mark.style.transform = `translateX(${t.offsetLeft}px)`;
  if (instant) requestAnimationFrame(() => { mark.style.transition = ''; });
}
function select(t, focus) {
  tabs.forEach((x) => {
    const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
    const pane = document.getElementById(x.getAttribute('aria-controls'));
    pane.hidden = !on;
    if (on) {
      const key = pane.id.replace('pane-', '');
      if (!built.has(key)) { built.add(key); pane.replaceChildren(); panes[key](pane); }
      pane.classList.remove('enter'); if (!reducedMotion()) { void pane.offsetWidth; pane.classList.add('enter'); }
    }
  });
  placeMark(t);
  if (focus) t.focus();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => select(t));
  t.addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
    else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
    else if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
  });
});
select(tabs[0]);
const syncMark = () => placeMark(tabs.find((x) => x.getAttribute('aria-selected') === 'true'), true);
if ('ResizeObserver' in window) new ResizeObserver(syncMark).observe($('.look-tabs'));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncMark);

// ---- sections arrive once (content stays visible without JS or motion)
if ('IntersectionObserver' in window && !reducedMotion()) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.look-stage, .beta-steps .bs, .closing').forEach((el, i) => { el.classList.add('pop'); el.style.setProperty('--d', `${(i % 3) * 70}ms`); io.observe(el); });
}
