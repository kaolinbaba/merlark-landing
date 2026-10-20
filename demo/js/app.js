// demo/js/app.js
// Shell, navigation and hash router for the Merlark interactive demo.
// Hash routes (#/findings/F1) keep every screen refresh-safe on static hosting.

import { h, icon, symbol, wordmark, mount, reducedMotion } from './ui/dom.js';
import { closeAll, dialog } from './ui/overlay.js';
import { initMotionPreference, motionToggle } from './ui/motion.js';
import { getState, setState, subscribe } from './state.js';
import { RANGES, getRange, LAST_CHECK, formatDate } from './data/derive.js';
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

const NAV = [
  { group: 'Observe', items: [
    { id: 'overview', label: 'Bridge', icon: 'bridge', view: overview },
    { id: 'findings', label: 'Findings', icon: 'findings', view: findingsView },
    { id: 'monitoring', label: 'Monitoring & backfill', icon: 'monitor', view: monitoring },
    { id: 'videos', label: 'Video library', icon: 'videos', view: videosView },
  ] },
  { group: 'Decide', items: [
    { id: 'compare', label: 'Compare', icon: 'compare', view: compare },
    { id: 'brief', label: 'Weekly brief', icon: 'brief', view: brief },
  ] },
  { group: 'Act', items: [
    { id: 'interventions', label: 'Interventions', icon: 'interventions', view: interventions },
    { id: 'script', label: 'Script workspace', icon: 'script', view: script },
  ] },
  { group: 'Channel', items: [
    { id: 'settings', label: 'Settings & plan', icon: 'settings', view: settings },
  ] },
];
const ROUTES = Object.fromEntries(NAV.flatMap((g) => g.items).map((i) => [i.id, i]));
ROUTES.onboarding = { id: 'onboarding', label: 'Onboarding', view: onboarding, bare: true };

initMotionPreference();
const app = document.getElementById('app');
let current = { key: null };

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const [route = 'overview', ...rest] = path.split('/').filter(Boolean);
  return { route: ROUTES[route] ? route : 'overview', params: rest, query: new URLSearchParams(query), known: !route || !!ROUTES[route] };
}

export const navigate = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

function aboutDemo() {
  dialog({
    label: 'About this demo',
    title: 'Interactive demo · Sample data',
    body: h('div', { class: 'prose' },
      h('p', null, `Everything here belongs to a fictional channel, ${channel.name}. The videos, numbers and findings are synthetic and consistent across every screen.`),
      h('p', null, 'Nothing you do here contacts Google or YouTube, charges a card, deletes data or calls an AI model. Your clicks are remembered only in this browser so a refresh keeps your place.'),
      h('h3', null, 'What is real today'),
      h('p', null, 'Merlark is in private testing. Google sign-in with read-only YouTube access, reading channel data through the official YouTube APIs, automatic deletion of stored YouTube statistics within 30 days, and disconnect-deletes-data are built. The findings, brief, comparisons, interventions, script workspace and billing screens are feature previews.'),
      h('h3', null, 'What depends on approval'),
      h('p', null, 'Long-horizon baselines, finding states and comparisons are derived metrics. YouTube’s developer policies allow them only after an API audit. Merlark has not received that approval, and today it keeps YouTube statistics for no more than 30 days. The months of history shown here illustrate the design, not current capability.'),
      h('p', { class: 'dim' }, 'Merlark is not affiliated with or endorsed by YouTube or Google. It does not estimate monetization status or predict YouTube decisions.')),
    actions: [{ label: 'Got it', variant: 'btn-primary' }],
  });
}

function rangeSelect(state) {
  return h('label', { class: 'range' }, h('span', { class: 'sr-only' }, 'Date range'),
    h('select', { onchange: (e) => setState({ range: e.target.value }) },
      RANGES.map((r) => h('option', { value: r.id, selected: r.id === state.range }, r.label))));
}

function statusLight(state) {
  const s = !state.connected ? ['off', 'Not connected'] : state.simulateError ? ['err', 'Check failed'] : state.monitoringPaused ? ['paused', 'Monitoring paused'] : ['on', 'Monitoring'];
  return h('a', { class: `status-light ${s[0]}`, href: '#/monitoring', title: `Last check ${formatDate(LAST_CHECK.date)} ${LAST_CHECK.time}` },
    h('i', { 'aria-hidden': 'true' }), h('span', null, s[1]));
}

function shell(route, content, state) {
  const nav = h('nav', { class: 'side', 'aria-label': 'Demo sections' },
    h('a', { class: 'logo side-logo', href: '../', 'aria-label': 'Merlark home' }, symbol(26), wordmark(18)),
    h('div', { class: 'chan' }, h('span', { class: 'chan-dot', 'aria-hidden': 'true' }, 'LH'),
      h('span', null, h('strong', null, channel.name), h('small', { class: 'dim' }, `${channel.handle} · fictional`))),
    NAV.map((g) => h('div', { class: 'nav-group' }, h('span', { class: 'nav-label' }, g.group),
      g.items.map((i) => h('a', { href: `#/${i.id}`, class: `nav-item ${route === i.id ? 'active' : ''}`, 'aria-current': route === i.id ? 'page' : null, onclick: () => document.body.classList.remove('nav-open') }, icon(i.icon), h('span', null, i.label))))),
    h('div', { class: 'side-foot' },
      motionToggle(),
      h('a', { class: 'btn btn-ghost btn-sm', href: '#/onboarding' }, 'Replay onboarding'),
      h('a', { class: 'btn btn-quiet btn-sm', href: '../' }, icon('back', 14), 'Back to merlark.com')));
  const top = h('header', { class: 'topbar' },
    h('button', { class: 'btn btn-quiet icon-btn menu-btn', 'aria-label': 'Open navigation', onclick: () => document.body.classList.toggle('nav-open') }, icon('menu')),
    h('a', { class: 'logo top-logo', href: '#/overview', 'aria-label': 'Bridge' }, symbol(24)),
    h('button', { class: 'demo-pill', onclick: aboutDemo, 'aria-label': 'Interactive demo, sample data. About this demo' }, h('i', { 'aria-hidden': 'true' }), 'Interactive demo · Sample data'),
    h('div', { class: 'top-right' }, statusLight(state), rangeSelect(state)));
  return h('div', { class: 'shell' }, nav, h('div', { class: 'nav-scrim', onclick: () => document.body.classList.remove('nav-open') }),
    h('div', { class: 'main-col' }, top, h('main', { id: 'main', class: 'main', tabindex: -1 }, content)));
}

function ctx(state) {
  return { state, range: getRange(state.range), navigate, rerender: render };
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
    if (!known) content = h('div', null, h('div', { class: 'notice' }, 'That page does not exist in the demo, so you are on the Bridge.'), content);
  } catch (err) {
    console.error(err);
    content = h('div', { class: 'error-state' }, h('h2', null, 'This panel failed to load'), h('p', { class: 'muted' }, 'Something went wrong while drawing sample data.'),
      h('button', { class: 'btn btn-primary', onclick: render }, 'Try again'));
  }
  if (def.bare) { mount(app, content); return; }
  const scrollY = routeChanged ? 0 : window.scrollY;
  // Navigation is immediate; the dock-in entrance plays on the new content without delaying it.
  mount(app, shell(route, content, state));
  if (routeChanged) {
    if (!reducedMotion()) app.querySelector('.main').classList.add('enter');
    app.querySelector('#main').focus({ preventScroll: true });
  }
  window.scrollTo(0, scrollY);
  document.title = `${def.label} · Merlark demo`;
}

function welcome() {
  dialog({
    label: 'Welcome aboard',
    title: 'Initialize your observatory',
    body: h('div', { class: 'welcome' }, h('div', { class: 'welcome-orbit', 'aria-hidden': 'true' }, symbol(64, false)),
      h('p', null, `This is Merlark with sample data from a fictional channel, ${channel.name}. Run the one-minute onboarding to see how a channel is connected and its history reconstructed, or go straight to the bridge.`),
      h('p', { class: 'dim' }, 'Nothing here contacts Google, charges anything or calls an AI model.')),
    actions: [
      { label: 'Skip to the bridge', onClick: () => setState({ onboarded: true }) },
      { label: 'Start onboarding', variant: 'btn-primary', onClick: () => { setState({ onboarded: true }); navigate('#/onboarding'); } },
    ],
  });
}

let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  clearTimeout(window.__rz);
  window.__rz = setTimeout(() => { if (Math.abs(window.innerWidth - lastWidth) > 40) { lastWidth = window.innerWidth; current.key = current.key + ''; render(); } }, 200);
});
window.addEventListener('hashchange', render);
document.addEventListener('click', (e) => { if (e.target.closest('[data-close-overlay]')) closeAll(); });
subscribe(() => render());

render();
if (!getState().onboarded && parseHash().route !== 'onboarding') welcome();
document.documentElement.classList.add('ready');
