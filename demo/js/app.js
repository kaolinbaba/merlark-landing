// demo/js/app.js
// Shell, navigation and hash router for the Merlark interactive demo.
// Hash routes (#/patterns/F1) keep every screen refresh-safe on static hosting.

import { h, icon, symbol, mount, reducedMotion, segmented } from './ui/dom.js';
import { closeAll, dialog } from './ui/overlay.js';
import { initMotionPreference, motionToggle } from './ui/motion.js';
import { getState, setState, subscribe } from './state.js';
import { RANGES, getRange } from './data/derive.js';
import { channel } from './data/fixtures.js';
import * as overview from './views/overview.js';
import * as findingsView from './views/findings.js';
import * as monitoring from './views/monitoring.js';
import * as videosView from './views/videos.js';
import * as compare from './views/compare.js';
import * as brief from './views/brief.js';
import * as interventions from './views/interventions.js';
import * as script from './views/script.js';
import * as settings from './views/settings.js';
import * as onboarding from './views/onboarding.js';

export const DISCLOSURE = 'This demo uses fictional data. It doesn’t connect to Google, take payments or call an AI model. Your demo changes stay in this browser.';
export const AFFILIATION = 'Merlark is an independent project and isn’t affiliated with YouTube or Google.';

const NAV = [
  { id: 'overview', label: 'Overview', icon: 'overview', view: overview },
  { id: 'patterns', label: 'Patterns', icon: 'patterns', view: findingsView },
  { id: 'history', label: 'Channel history', icon: 'history', view: monitoring },
  { id: 'videos', label: 'Videos', icon: 'videos', view: videosView },
  { id: 'compare', label: 'Compare', icon: 'compare', view: compare },
  { id: 'recap', label: 'Weekly recap', icon: 'recap', view: brief },
  { id: 'experiments', label: 'Experiments', icon: 'experiments', view: interventions },
  { id: 'drafts', label: 'Drafts', icon: 'drafts', view: script },
  { id: 'settings', label: 'Settings', icon: 'settings', view: settings },
];
const ROUTES = Object.fromEntries(NAV.map((i) => [i.id, i]));
ROUTES.onboarding = { id: 'onboarding', label: 'Welcome', view: onboarding, bare: true };
// Older links keep working.
const ALIASES = { findings: 'patterns', monitoring: 'history', brief: 'recap', script: 'drafts', interventions: 'experiments' };
const SHORT_RANGE = { all: 'All history', '6m': '6 months', '90d': '90 days', since: 'Since connection' };

initMotionPreference();
const app = document.getElementById('app');
let current = { key: null };
let lastRange = null;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  let [route = 'overview', ...rest] = path.split('/').filter(Boolean);
  route = ALIASES[route] || route;
  return { route: ROUTES[route] ? route : 'overview', params: rest, query: new URLSearchParams(query), known: !route || !!ROUTES[route] };
}

export const navigate = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

export function aboutDemo() {
  dialog({
    label: 'About this demo',
    title: 'What’s real, what’s sample',
    body: h('div', { class: 'prose' },
      h('p', null, DISCLOSURE),
      h('p', null, `${channel.name} is a made-up channel. Its videos, numbers and patterns agree across every screen.`),
      h('h3', null, 'In private testing'),
      h('p', null, 'Google connection with read-only access, and basic channel and video data from the official YouTube APIs. Stored YouTube statistics are deleted within 30 days, and disconnecting deletes the channel’s stored data.'),
      h('h3', null, 'Not available yet'),
      h('p', null, 'Patterns, comparisons and history count as derived metrics under YouTube’s developer policies, which need an API audit first. Merlark hasn’t received that approval. The months of history here show the idea; the connected product keeps statistics for 30 days at most.'),
      h('p', { class: 'dim' }, AFFILIATION)),
    actions: [{ label: 'Got it', variant: 'btn-primary' }],
  });
}

// The shell is built once and kept, so the rail and the date control can animate between screens.
let frame = null;
function ensureShell(state) {
  if (frame && frame.root.isConnected) return frame;
  const railEl = h('nav', { class: 'rail', 'aria-label': 'Demo sections' },
    h('a', { class: 'rail-logo', href: '../', 'aria-label': 'Back to merlark.com' }, symbol(30)),
    h('div', { class: 'rail-items' }, NAV.map((i) => h('a', { href: `#/${i.id}`, class: 'rail-btn', 'data-route': i.id },
      h('span', { class: 'rail-ico' }, icon(i.icon, 20)), h('span', { class: 'rail-label' }, i.label)))));
  const chanState = h('small', null);
  const seg = segmented(RANGES.map((r) => [r.id, SHORT_RANGE[r.id]]), state.range, (v) => setState({ range: v }), { label: 'Dates', className: 'range-seg' });
  const top = h('header', { class: 'topbar' },
    h('a', { class: 'top-logo', href: '../', 'aria-label': 'Back to merlark.com' }, symbol(26)),
    h('div', { class: 'chan' }, h('span', { class: 'chan-dot', 'aria-hidden': 'true' }, 'LH'), h('span', null, h('b', null, channel.name), chanState)),
    h('div', { class: 'top-range' }, h('span', { class: 'top-range-ico', 'aria-hidden': 'true' }, icon('calendar', 16)), seg),
    h('div', { class: 'top-right' },
      h('button', { class: 'btn btn-quiet btn-sm about-btn', type: 'button', onclick: aboutDemo }, icon('info', 16), h('span', null, 'Sample data'))));
  const main = h('main', { id: 'main', class: 'main', tabindex: -1 });
  const root = h('div', { class: 'shell' }, railEl,
    h('div', { class: 'main-col' }, top, main,
      h('footer', { class: 'demo-foot' }, h('p', null, DISCLOSURE), h('p', null, AFFILIATION), motionToggle())));
  mount(app, root);
  frame = { root, railEl, seg, chanState, main };
  return frame;
}

function paintShell(f, route, state) {
  f.railEl.querySelectorAll('.rail-btn').forEach((a) => {
    const on = a.dataset.route === route;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  f.seg.setValue(state.range);
  f.chanState.textContent = state.connected ? 'Sample channel' : 'Not connected';
}

function ctx(state) {
  return { state, range: getRange(state.range), navigate, rerender: render };
}

export function errorState(retry) {
  return h('div', { class: 'error-state', role: 'alert' }, h('h2', null, 'That didn’t load. Let’s try again.'),
    h('button', { class: 'btn btn-primary', type: 'button', onclick: retry }, icon('reset', 16), 'Try again'));
}

function render() {
  const { route, params, query, known } = parseHash();
  const state = getState();
  const key = `${route}/${params.join('/')}`;
  const routeChanged = key !== current.key;
  current = { key, route };
  const def = ROUTES[route];
  if (routeChanged) { closeAll(); if (def.view.enter) def.view.enter(); }
  let content;
  try {
    content = def.view.render({ params, query }, ctx(state));
    if (!known) content = h('div', null, h('div', { class: 'notice' }, 'That page isn’t in the demo, so here’s the Overview.'), content);
  } catch (err) {
    console.error(err);
    content = errorState(render);
  }
  if (def.bare) {
    frame = null;
    mount(app, content);
    if (routeChanged) { const m = app.querySelector('#main'); if (m) m.focus({ preventScroll: true }); window.scrollTo(0, 0); }
    document.title = `${def.label} · Merlark demo`;
    return;
  }
  const scrollY = routeChanged ? 0 : window.scrollY;
  const f = ensureShell(state);
  paintShell(f, route, state);
  mount(f.main, content);
  const rangeChanged = lastRange != null && lastRange !== state.range;
  lastRange = state.range;
  f.main.classList.remove('enter', 'refresh');
  if (!reducedMotion() && (routeChanged || rangeChanged)) { void f.main.offsetWidth; f.main.classList.add(routeChanged ? 'enter' : 'refresh'); }
  if (routeChanged) {
    const on = f.railEl.querySelector('.rail-btn.on'); if (on && on.scrollIntoView && window.innerWidth < 1024) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    f.main.focus({ preventScroll: true });
  }
  window.scrollTo(0, scrollY);
  document.title = `${def.label} · Merlark demo`;
}

function welcome() {
  dialog({
    label: 'Welcome',
    title: 'Make yourself at home.',
    body: h('div', { class: 'welcome' }, h('div', { class: 'welcome-mark', 'aria-hidden': 'true' }, symbol(44)),
      h('p', null, 'Meet Lanternfish Histories, our sample channel. Take the quick tour or explore on your own.'),
      h('p', { class: 'fine' }, DISCLOSURE)),
    actions: [
      { label: 'I’ll explore', onClick: () => setState({ onboarded: true }) },
      { label: 'Show me around', variant: 'btn-primary', onClick: () => { setState({ onboarded: true }); navigate('#/onboarding'); } },
    ],
  });
}

let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  clearTimeout(window.__rz);
  window.__rz = setTimeout(() => { if (Math.abs(window.innerWidth - lastWidth) > 40) { lastWidth = window.innerWidth; render(); } }, 200);
});
window.addEventListener('hashchange', render);
document.addEventListener('click', (e) => { if (e.target.closest('[data-close-overlay]')) closeAll(); });
subscribe(() => render());

render();
// ?skipwelcome opens the demo without the welcome card (used for direct links and screenshots).
if (!getState().onboarded && parseHash().route !== 'onboarding' && !new URLSearchParams(location.search).has('skipwelcome')) welcome();
document.documentElement.classList.add('ready');
