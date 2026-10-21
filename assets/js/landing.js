// assets/js/landing.js
// Landing: brand marks, copy bound to the demo dataset, the live mini control panel, the four-button
// "How it works" panel and small micro-interactions. Every number is re-derived from the demo's data,
// so the page and the demo always agree. The HTML carries the same values for no-JS readers.

import { h, icon, symbol, wordmark, reducedMotion } from '../../demo/js/ui/dom.js';
import { allFindingStats, getRange, formatInt, formatMultiplier, formatTime, STATE_LABEL } from '../../demo/js/data/derive.js';
import { initMotionPreference, motionToggle, countUp, stopCount } from '../../demo/js/ui/motion.js';
import { thumb, barPair, playChip } from '../../demo/js/ui/components.js';
import { videos } from '../../demo/js/data/fixtures.js';

initMotionPreference();

// ---- brand marks
const logos = {
  lockup: () => [symbol(32), wordmark(24)],
  'lockup-small': () => h('span', { class: 'logo' }, symbol(24), wordmark(18)),
  'symbol-lg': () => symbol(64, false),
};
document.querySelectorAll('[data-logo]').forEach((el) => { const mk = logos[el.dataset.logo]; if (mk) { el.classList.add('logo'); el.replaceChildren(...[].concat(mk())); } });
document.getElementById('motion-toggle-foot').append(motionToggle());
document.querySelectorAll('[data-icon]').forEach((el) => el.append(icon(el.dataset.icon, 22)));

// ---- copy bound to the dataset
const stats = allFindingStats(getRange('all'));
const byId = Object.fromEntries(stats.map((s) => [s.finding.id, s]));
const F1 = byId.F1;
const SOURCE = F1.groupAll.find((v) => v.id === 'v23') || F1.groupAll[0];
const seg = F1.finding.evidenceSegment(SOURCE);
const bind = {
  n: String(F1.n), quality: F1.quality, mult: formatMultiplier(F1.multiplier), groupViews: formatInt(F1.groupViews),
  baselineViews: formatInt(F1.baselineViews), nBaseline: String(F1.nBaseline), action: F1.finding.action,
};
document.querySelectorAll('[data-f1]').forEach((el) => { el.textContent = bind[el.dataset.f1]; });
const evBind = { title: SOURCE.title, ts: `${formatTime(seg.start)}–${formatTime(seg.end)}` };
document.querySelectorAll('[data-ev]').forEach((el) => { el.textContent = evBind[el.dataset.ev]; });

// ---- mini control panel: a switch, a finding tile and buttons to flip between findings
const tile = document.getElementById('mini-tile');
const lamp = document.getElementById('mini-lamp');
const lampState = document.getElementById('mini-state');
const sw = document.getElementById('mini-switch');
const slot = (k) => tile.querySelector(`[data-mini="${k}"]`);
const PICKS = ['F1', 'F2', 'F4', 'F5'].map((id) => byId[id]);

function paintTile(s, animate) {
  tile.className = `tile mini-tile state-${s.state}`;
  tile.href = `demo/?skipwelcome#/findings/${s.finding.id}`;
  slot('chip').className = `chip state state-${s.state}`;
  slot('chip').replaceChildren(h('i', { class: 'lamp', 'aria-hidden': 'true' }), STATE_LABEL[s.state]);
  slot('count').textContent = `${s.groupAll.length} ${s.finding.scope === 'short' ? 'Shorts' : 'videos'}`;
  slot('name').textContent = s.finding.name;
  const mult = slot('mult');
  const readout = mult.parentElement;
  readout.classList.toggle('none', s.multiplier == null);
  if (s.multiplier == null) { stopCount(mult); mult.textContent = 'Not enough data yet'; readout.lastElementChild.hidden = true; }
  else { readout.lastElementChild.hidden = false; countUp(mult, `mini:${s.finding.id}:${Date.now()}`, s.multiplier, formatMultiplier, 1); }
  const pair = s.multiplier == null
    ? h('p', { class: 'small', 'data-mini': 'pair' }, `Only ${s.n} with a week-one reading. We need 3 before comparing.`)
    : barPair({ group: s.groupViews, groupLabel: `These ${s.n}, week one`, base: s.baselineViews, baseLabel: 'Your usual' });
  pair.dataset.mini = 'pair';
  slot('pair').replaceWith(pair);
  const ev = s.groupAll.length ? { v: s.groupAll.find((v) => v.id === SOURCE.id) || s.groupAll[s.groupAll.length - 1] } : null;
  const chip = ev ? playChip(s.finding.evidenceSegment(ev.v)) : h('span');
  if (ev) chip.append(` · ${ev.v.title}`);
  chip.dataset.mini = 'ev';
  slot('ev').replaceWith(chip);
  if (animate && !reducedMotion()) tile.animate([{ transform: 'scale(0.97)', opacity: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 280, easing: 'cubic-bezier(0.34,1.4,0.64,1)' });
}
const pick = tile.parentElement.querySelector('.mini-pick');
PICKS.forEach((s, i) => {
  const b = h('button', { type: 'button', class: `pick state-${s.state}`, 'aria-pressed': String(i === 0), onclick: () => {
    pick.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    paintTile(s, true);
  } }, h('span', { class: 'pick-dot', 'aria-hidden': 'true' }), h('span', null, s.finding.name), h('small', null, STATE_LABEL[s.state]));
  pick.append(b);
});
paintTile(F1, false);
sw.addEventListener('click', () => {
  const on = sw.getAttribute('aria-checked') !== 'true';
  sw.setAttribute('aria-checked', String(on)); sw.classList.toggle('on', on);
  lamp.classList.toggle('off', !on); lampState.textContent = on ? 'Watching' : 'Paused';
});

// ---- how it works: four hardware-style tabs (arrow keys move between them)
const tabs = [...document.querySelectorAll('.how-tabs [role="tab"]')];
const select = (t, focus) => {
  tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute('aria-controls')).hidden = !on; });
  if (focus) t.focus();
};
tabs.forEach((t, i) => {
  t.addEventListener('click', () => select(t));
  t.addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
    else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
    else if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
  });
});

// Tab visuals, drawn from the same data.
const vis = (k) => document.querySelector(`[data-visual="${k}"]`);
const longs = videos.filter((v) => v.format === 'long').slice(-16);
vis('spot').append(...longs.map((v) => { const t = thumb(v, 96, { duration: false }); t.classList.add(F1.finding.match(v) ? 'hit' : 'miss'); return t; }));
vis('prove').append(h('ul', { class: 'prove-list' }, F1.groupAll.slice(-3).reverse().map((v) => {
  const sg = F1.finding.evidenceSegment(v);
  return h('li', null, h('a', { href: `demo/?skipwelcome#/videos/${v.id}?t=${sg.start}` }, thumb(v, 88, { duration: false }), h('span', null, h('b', null, v.title), playChip(sg))));
})));
vis('compare').append(barPair({ group: F1.groupViews, groupLabel: `These ${F1.n}, week one`, base: F1.baselineViews, baseLabel: `Your usual · ${F1.nBaseline} others` }));
const trySw = document.querySelector('[data-try]');
trySw.addEventListener('click', () => {
  const on = trySw.getAttribute('aria-checked') !== 'true';
  trySw.setAttribute('aria-checked', String(on)); trySw.classList.toggle('on', on);
  document.querySelector('[data-try-note]').textContent = on ? 'Planned (sample). Next week, how it went shows up next to your usual.' : 'How it went is saved apart from the finding.';
});

// ---- panels pop in once as they arrive (content is visible without JS or motion)
if ('IntersectionObserver' in window && !reducedMotion()) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.howpanel, .screens li, .real-cols > .panel, .closing-panel').forEach((el, i) => { el.classList.add('pop'); el.style.setProperty('--d', `${(i % 4) * 60}ms`); io.observe(el); });
}
