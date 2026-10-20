// assets/js/landing.js
// Landing page: inline brand marks, the interactive hero preview and product sections.
// Everything is rendered with the demo's own modules and sample data, so the landing shows the real interfaces.

import { h, symbol, wordmark, reducedMotion } from '../../demo/js/ui/dom.js';
import { timelineChart } from '../../demo/js/ui/charts.js';
import { stateChip, qualityBadge, multiplierLine, obsInterp, evidenceRow } from '../../demo/js/ui/components.js';
import { allFindingStats, getRange, evidenceFor, formatInt } from '../../demo/js/data/derive.js';
import { videos, channel } from '../../demo/js/data/fixtures.js';
import { openEvidence } from '../../demo/js/views/evidence.js';
import { assemble } from '../../demo/js/views/script.js';

// Brand marks
const logos = {
  lockup: () => [symbol(30), wordmark(20)],
  'lockup-small': () => h('span', { class: 'logo' }, symbol(24), wordmark(16)),
  symbol: () => symbol(96, false),
  'symbol-lg': () => symbol(72, false),
};
document.querySelectorAll('[data-logo]').forEach((el) => {
  const mk = logos[el.dataset.logo];
  if (!mk) return;
  el.classList.add('logo');
  const nodes = [].concat(mk());
  el.replaceChildren(...nodes);
});

const range = getRange('all');
const stats = allFindingStats(range);
const width = (el) => Math.max(260, el.clientWidth - 2);

// Hero preview: a working slice of the Bridge.
function heroPreview(host) {
  let active = 'F1';
  const panel = h('div', { class: 'hp-panel' });
  const tabs = h('div', { class: 'hp-tabs', role: 'tablist', 'aria-label': 'Sample findings' });
  const chartHost = h('div', { class: 'hp-chart' });
  function draw() {
    const s = stats.find((x) => x.finding.id === active);
    tabs.replaceChildren(...stats.map((x) => h('button', {
      role: 'tab', 'aria-selected': x.finding.id === active, class: `hp-tab ${x.finding.id === active ? 'on' : ''}`,
      onclick: () => { active = x.finding.id; draw(); },
    }, stateChip(x.state), h('span', null, x.finding.name))));
    const ev = evidenceFor(s).slice(-2).reverse();
    panel.replaceChildren(
      h('div', { class: 'hp-title' }, h('h3', null, s.finding.name, ' ', multiplierLine(s)), qualityBadge(s.quality)),
      obsInterp(s, { compact: true }),
      ev.length ? h('div', { class: 'ev-list' }, ev.map((e) => evidenceRow(e, () => openEvidence({ ...e, findingId: s.finding.id, findingName: s.finding.name })))) : null);
    chartHost.replaceChildren(timelineChart({
      videos: videos.filter((v) => v.format === 'long'), range, height: 170, width: width(chartHost),
      highlight: s.finding.scope === 'long' ? s.finding.match : null, baseline: s.baselineViews || null,
    }));
  }
  host.append(
    h('div', { class: 'hp-frame' },
      h('div', { class: 'hp-bar' }, h('span', { class: 'hp-lights', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
        h('span', { class: 'hp-chan' }, channel.name), h('span', { class: 'demo-pill static' }, h('i', { 'aria-hidden': 'true' }), 'Sample data')),
      h('div', { class: 'hp-radar radar', 'aria-hidden': 'true' }, h('i', { class: 'sweep' }), h('i', { class: 'ring r1' }), h('i', { class: 'ring r2' }), h('b', { class: 'blip' })),
      tabs, chartHost, panel,
      h('a', { class: 'btn btn-primary hp-cta demo-cta', href: 'demo/' }, 'Open the full demo')));
  draw();
  return draw;
}

function boundaryVisual(host) {
  const draw = () => host.replaceChildren(
    timelineChart({ videos: videos.filter((v) => v.format === 'long'), range, width: width(host) - 40, height: 220 }),
    h('p', { class: 'fine dim' }, 'Sample data. 7-day views per long-form upload.'));
  draw();
  return draw;
}

function evidenceVisual(host) {
  const s = stats.find((x) => x.finding.id === 'F2');
  const ins = stats.find((x) => x.state === 'insufficient');
  host.replaceChildren(
    h('div', { class: 'chips' }, stateChip(s.state), qualityBadge(s.quality), h('strong', null, s.finding.name)),
    obsInterp(s, { compact: true }),
    h('div', { class: 'ev-list' }, evidenceFor(s).slice(-2).reverse().map((e) => evidenceRow(e, () => openEvidence({ ...e, findingId: s.finding.id, findingName: s.finding.name })))),
    ins ? h('p', { class: 'ins-note' }, stateChip('insufficient'), ` ${ins.finding.name}: ${ins.n} comparable reading so far. No comparison is shown until there are 3.`) : null);
}

function scriptVisual(host) {
  const byId = Object.fromEntries(stats.map((s) => [s.finding.id, s]));
  const draft = assemble({ topic: 't1', selected: ['F1', 'F2', 'F4', 'P1'], order: null, removed: [] }, byId);
  host.replaceChildren(
    h('p', { class: 'eyebrow' }, draft.topic.title),
    h('ol', { class: 'blocks mini' }, draft.blocks.slice(0, 5).map((b) => h('li', { class: `block g-${b.ground.kind}` },
      h('span'), h('div', { class: 'block-main' },
        h('div', { class: 'block-meta' }, h('span', { class: 'sec' }, b.section), h('span', { class: `gl ${b.ground.kind}` }, b.ground.label), b.source ? h('span', { class: 'cite' }, b.source) : null),
        h('strong', null, b.label)), h('span')))),
    h('p', { class: 'fine dim' }, `Assembled from prepared text and ${formatInt(draft.blocks.filter((b) => b.source).length)} cited findings. No AI model is called in the demo.`));
}

const redraws = [];
const hp = document.getElementById('hero-preview');
if (hp) redraws.push(heroPreview(hp));
const bv = document.getElementById('boundary-visual');
if (bv) redraws.push(boundaryVisual(bv));
const evv = document.getElementById('evidence-visual');
if (evv) evidenceVisual(evv);
const sv = document.getElementById('script-visual');
if (sv) scriptVisual(sv);

let lastW = window.innerWidth;
window.addEventListener('resize', () => {
  clearTimeout(window.__lr);
  window.__lr = setTimeout(() => { if (Math.abs(window.innerWidth - lastW) > 40) { lastW = window.innerWidth; redraws.forEach((f) => f()); } }, 200);
});

// Reveal on scroll
const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -10% 0px' }) : null;
document.querySelectorAll('.feature, .journey-steps li, .status-grid .card, .principles li').forEach((el) => {
  if (io && !reducedMotion()) { el.classList.add('reveal'); io.observe(el); }
});

// Docking transition into the demo
document.addEventListener('click', (e) => {
  const a = e.target.closest('a.demo-cta');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || reducedMotion()) return;
  e.preventDefault();
  document.body.classList.add('docking');
  setTimeout(() => { location.href = a.getAttribute('href'); }, 650);
});
window.addEventListener('pageshow', () => document.body.classList.remove('docking'));
