// assets/js/landing.js
// Landing orchestration: brand marks, ambient environment, hero replay, story strip, capability tabs,
// availability panel and the docking transition into the demo. All content comes from the demo's modules.

import { h, icon, symbol, wordmark, reducedMotion } from '../../demo/js/ui/dom.js';
import { timelineChart, barChart } from '../../demo/js/ui/charts.js';
import { stateChip, qualityBadge, multiplierLine, evidenceRow, findingCardLite } from '../../demo/js/ui/components.js';
import { allFindingStats, getRange, evidenceFor, formatInt, formatMultiplier } from '../../demo/js/data/derive.js';
import { videos, findings } from '../../demo/js/data/fixtures.js';
import { scriptModel } from '../../demo/js/data/script-model.js';
import { openEvidence } from '../../demo/js/views/evidence.js';
import { dialog } from '../../demo/js/ui/overlay.js';
import { initMotionPreference, motionToggle } from '../../demo/js/ui/motion.js';
import { mountAmbient, liveWhenVisible } from './ambient.js';
import { mountReplay } from './replay.js';

initMotionPreference();

const logos = {
  lockup: () => [symbol(30), wordmark(20)],
  'lockup-small': () => h('span', { class: 'logo' }, symbol(24), wordmark(16)),
  'symbol-lg': () => symbol(72, false),
};
document.querySelectorAll('[data-logo]').forEach((el) => { const mk = logos[el.dataset.logo]; if (mk) { el.classList.add('logo'); el.replaceChildren(...[].concat(mk())); } });
document.getElementById('motion-toggle').append(motionToggle());
document.getElementById('motion-toggle-foot').append(motionToggle());

mountAmbient();
mountReplay(document.getElementById('replay'));

const range = getRange('all');
const stats = allFindingStats(range);
const F1 = stats.find((s) => s.finding.id === 'F1');
const width = (el) => Math.max(260, el.clientWidth);

// Story strip: what changed → evidence → next action, for one finding.
function story(host) {
  const ev = evidenceFor(F1).slice(-2).reverse();
  host.replaceChildren(
    h('article', { class: 'story-card' },
      h('span', { class: 'story-n num' }, '1'), h('h3', null, 'What changed'),
      h('div', { class: 'chips' }, stateChip(F1.state), qualityBadge(F1.quality)),
      h('p', { class: 'story-big' }, F1.finding.name, ' ', multiplierLine(F1)),
      h('p', { class: 'muted' }, `${F1.n} uploads that open on a route map averaged ${formatInt(F1.groupViews)} views in their first week. The channel’s baseline is ${formatInt(F1.baselineViews)}.`)),
    h('article', { class: 'story-card fx-host source-focus' },
      h('span', { class: 'story-n num' }, '2'), h('h3', null, 'The evidence'),
      h('p', { class: 'muted' }, 'Open a source to see the exact moment.'),
      h('div', { class: 'ev-list' }, ev.map((e) => evidenceRow(e, () => openEvidence({ ...e, findingId: 'F1', findingName: F1.finding.name }))))),
    h('article', { class: 'story-card' },
      h('span', { class: 'story-n num' }, '3'), h('h3', null, 'A possible next step'),
      h('p', { class: 'story-big small' }, F1.finding.action),
      h('p', { class: 'muted' }, 'An association, not a cause. Track the change and Merlark records later readings separately.'),
      h('a', { class: 'text-link demo-cta', href: 'demo/#/findings/F1' }, 'Plan it in the demo')));
}

// Capability tabs: real demo components, one per tab.
function capabilities(host) {
  const tabs = [
    { id: 'monitor', label: 'Monitoring & backfill', link: 'demo/#/monitoring', fx: 'sweep-overlay',
      text: 'A visible line separates history Merlark reconstructed after connection from what it has observed since.',
      body: () => timelineChart({ videos: videos.filter((v) => v.format === 'long'), range, width: width(panelBody) - 8, height: 220 }) },
    { id: 'findings', label: 'Findings', link: 'demo/#/findings',
      text: 'Each pattern gets a state, an evidence quality, and a plain statement of what was measured.',
      body: () => h('div', { class: 'cap-findings' }, stats.slice(0, 4).map((s) => findingCardLite(s))) },
    { id: 'compare', label: 'Compare', link: 'demo/#/compare', fx: 'trace-overlay',
      text: 'Groups are compared with the same channel’s baseline. Insufficient evidence is shown as such.',
      body: () => barChart({ width: width(panelBody) - 8, rows: stats.filter((s) => s.multiplier != null).map((s, i) => ({ id: s.finding.id, label: s.finding.name, note: `${s.n} videos · ${formatMultiplier(s.multiplier)}`, value: s.groupViews, display: formatInt(s.groupViews), tone: ['accent', 'amber', 'base', 'violet'][i % 4] })).concat([{ label: 'Channel baseline', note: `median of ${F1.nBaseline}`, value: F1.baselineViews, display: formatInt(F1.baselineViews), tone: 'base' }]) }) },
    { id: 'script', label: 'Script workspace', link: 'demo/#/script',
      text: 'Drafts cite the findings they come from. Weak evidence turns into a labelled suggestion.',
      body: () => { const m = scriptModel({ topic: 't1', selected: ['F1', 'F2', 'F4', 'P1'], order: null, removed: [] }, range);
        return h('ol', { class: 'blocks mini' }, m.draft.blocks.slice(0, 5).map((b) => h('li', { class: `block g-${b.ground.kind}` }, h('span'),
          h('div', { class: 'block-main' }, h('div', { class: 'block-meta' }, h('span', { class: 'sec' }, b.section), h('span', { class: `gl ${b.ground.kind}` }, b.ground.label), b.source ? h('span', { class: 'cite' }, b.source) : null), h('strong', null, b.label)), h('span')))); } },
  ];
  let active = tabs[0].id;
  const tabList = h('div', { class: 'cap-tabs', role: 'tablist', 'aria-label': 'Demo screens' });
  const panelText = h('p', { class: 'muted cap-text' });
  const panelLink = h('a', { class: 'btn btn-ghost btn-sm demo-cta' });
  const panelBody = h('div', { class: 'cap-body' });
  const panel = h('div', { class: 'cap-panel card fx-host', role: 'tabpanel', id: 'cap-panel' }, h('div', { class: 'cap-head' }, panelText, panelLink), panelBody);
  function draw(focus) {
    const t = tabs.find((x) => x.id === active);
    tabList.replaceChildren(...tabs.map((x) => h('button', { role: 'tab', type: 'button', id: `tab-${x.id}`, 'aria-controls': 'cap-panel', 'aria-selected': x.id === active, tabindex: x.id === active ? 0 : -1, class: x.id === active ? 'on' : '',
      onclick: () => { active = x.id; draw(true); },
      onkeydown: (e) => { const i = tabs.indexOf(x); const n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (n) { active = tabs[(i + n + tabs.length) % tabs.length].id; draw(true); } } }, x.label)));
    panel.setAttribute('aria-labelledby', `tab-${active}`);
    panel.dataset.fx = t.fx || '';
    panelText.textContent = t.text;
    panelLink.href = t.link; panelLink.replaceChildren('Open in demo', icon('arrow', 14));
    panelBody.replaceChildren(t.body());
    panelBody.classList.remove('swap'); void panelBody.offsetWidth; panelBody.classList.add('swap');
    if (focus) tabList.querySelector('[aria-selected="true"]').focus();
  }
  host.replaceChildren(tabList, panel);
  draw(false);
  let lw = window.innerWidth;
  window.addEventListener('resize', () => { clearTimeout(window.__cr); window.__cr = setTimeout(() => { if (Math.abs(window.innerWidth - lw) > 40) { lw = window.innerWidth; draw(false); } }, 200); });
}

function availabilityDetails() {
  dialog({
    label: 'Availability', title: 'What the demo can and cannot show',
    body: h('div', { class: 'prose' },
      h('p', null, 'The demo runs on a fictional channel with fixed sample data. The replay on this page is the same sample data, played back on a loop. No real channel, live monitoring or AI model is behind either.'),
      h('h3', null, 'Working in private testing'),
      h('p', null, 'Read-only Google sign-in, reading channel and video data through the official YouTube APIs, automatic deletion of stored YouTube statistics within 30 days, and deleting stored data when a channel disconnects.'),
      h('h3', null, 'Previews'),
      h('p', null, 'Findings, states, baselines and comparisons are derived metrics. YouTube’s developer policies allow them only after an API audit, which Merlark has not received yet, and today Merlark keeps YouTube statistics for no more than 30 days. The months of history in the demo illustrate the design.'),
      h('h3', null, 'Never'),
      h('p', null, 'Merlark does not estimate monetization status, predict YouTube decisions, or score a channel’s risk.')),
    actions: [{ label: 'Close', variant: 'btn-primary' }],
  });
}

story(document.getElementById('story'));
capabilities(document.getElementById('cap'));
document.getElementById('av-details').addEventListener('click', availabilityDetails);
liveWhenVisible('.fx-host');

// Reveal on scroll (content is visible by default; motion only adds an entrance).
if ('IntersectionObserver' in window && !reducedMotion()) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.story-card, .how-steps li, .av-col, .cap-panel').forEach((el) => { el.classList.add('reveal'); io.observe(el); });
}

// Docking transition into the demo: brief, and skipped entirely when motion is off.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a.demo-cta');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || reducedMotion()) return;
  e.preventDefault();
  document.body.classList.add('docking');
  setTimeout(() => { location.href = a.getAttribute('href'); }, 380);
});
window.addEventListener('pageshow', () => document.body.classList.remove('docking'));
