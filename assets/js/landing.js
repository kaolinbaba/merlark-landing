// assets/js/landing.js
// Landing orchestration: brand marks, the atmosphere, the scroll scene and the availability panel.
// Every number in the copy is re-derived from the demo's dataset, so the page and the demo always agree.

import { h, symbol, wordmark, reducedMotion } from '../../demo/js/ui/dom.js';
import { allFindingStats, getRange, formatInt, formatMultiplier, formatDate, provenanceOf } from '../../demo/js/data/derive.js';
import { dialog } from '../../demo/js/ui/overlay.js';
import { initMotionPreference, motionToggle } from '../../demo/js/ui/motion.js';
import { mountAtmosphere } from '../../demo/js/ui/ribbons.js';
import { mountScene } from './scene.js';
import { SOURCE_ID } from './scene-layout.js';

initMotionPreference();

const logos = {
  lockup: () => [symbol(30), wordmark(22)],
  'lockup-small': () => h('span', { class: 'logo' }, symbol(24), wordmark(17)),
  'symbol-lg': () => symbol(56, false),
};
document.querySelectorAll('[data-logo]').forEach((el) => { const mk = logos[el.dataset.logo]; if (mk) { el.classList.add('logo'); el.replaceChildren(...[].concat(mk())); } });
document.getElementById('motion-toggle').append(motionToggle());
document.getElementById('motion-toggle-foot').append(motionToggle());

// ---- copy bound to the dataset
const range = getRange('all');
const F1 = allFindingStats(range).find((s) => s.finding.id === 'F1');
const source = F1.groupAll.find((v) => v.id === SOURCE_ID);
const seg = F1.finding.evidenceSegment(source);
const time = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const bind = {
  n: String(F1.n), quality: F1.quality, mult: formatMultiplier(F1.multiplier), groupViews: formatInt(F1.groupViews),
  baselineViews: formatInt(F1.baselineViews), nBaseline: String(F1.nBaseline), action: F1.finding.action,
};
document.querySelectorAll('[data-f1]').forEach((el) => { el.textContent = bind[el.dataset.f1]; });
const evBind = { title: source.title, ts: `${time(seg.start)}–${time(seg.end)}`, label: seg.label, date: formatDate(source.date) };
document.querySelectorAll('[data-ev]').forEach((el) => { el.textContent = evBind[el.dataset.ev]; });

// ---- atmosphere + scene
const atmos = mountAtmosphere({ intensity: 1 });
const group = (v) => (F1.finding.match(v) ? 'map' : v.opening === 'archive' ? 'archive' : v.template ? 'series' : 'other');
const items = [...F1.groupAll, ...F1.baseline].map((v) => ({ id: v.id, v, group: group(v), prov: provenanceOf(v) }));
mountScene(document.querySelector('.scene'), { items, finding: F1, atmos, reduced: reducedMotion });

// ---- availability details
document.getElementById('av-details').addEventListener('click', () => dialog({
  label: 'Availability', title: 'What the demo can and cannot show',
  body: h('div', { class: 'prose' },
    h('p', null, 'The demo runs on a fictional channel with fixed sample data. The story on this page uses the same sample data. No real channel, live monitoring or AI model is behind either.'),
    h('h3', null, 'Working in private testing'),
    h('p', null, 'Read-only Google sign-in, reading channel and video data through the official YouTube APIs, automatic deletion of stored YouTube statistics within 30 days, and deleting stored data when a channel disconnects.'),
    h('h3', null, 'Previews'),
    h('p', null, 'Findings, states, baselines and comparisons are derived metrics. YouTube’s developer policies allow them only after an API audit, which Merlark has not received yet, and today Merlark keeps YouTube statistics for no more than 30 days. The months of history in the demo illustrate the design.'),
    h('h3', null, 'Never'),
    h('p', null, 'Merlark does not estimate monetization status, predict YouTube decisions, or score a channel’s risk.')),
  actions: [{ label: 'Close', variant: 'btn-primary' }],
}));

// ---- sections below the scene settle in as they arrive (content is visible without JS or motion)
if ('IntersectionObserver' in window && !reducedMotion()) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.beta-intro, .beta-shot, .screens li, .status-cols > div, .closing-inner').forEach((el, i) => { el.classList.add('reveal'); el.style.setProperty('--d', `${(i % 4) * 70}ms`); io.observe(el); });
}

// Into the demo: the page dims toward ink first (skipped when motion is off).
document.addEventListener('click', (e) => {
  const a = e.target.closest('a.demo-cta');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || reducedMotion()) return;
  e.preventDefault();
  document.body.classList.add('leaving');
  setTimeout(() => { location.href = a.getAttribute('href'); }, 320);
});
window.addEventListener('pageshow', () => document.body.classList.remove('leaving'));
