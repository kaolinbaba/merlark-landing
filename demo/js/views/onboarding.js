// demo/js/views/onboarding.js
// Getting started: a pretend connection, history rebuild and boundary walkthrough.
// No OAuth window opens and nothing is sent to Google.

import { h, icon, symbol, wordmark, reducedMotion } from '../ui/dom.js';
import { timelineChart } from '../ui/charts.js';
import { stateChip, thumb } from '../ui/components.js';
import { allFindingStats, getRange, formatShort, formatDate } from '../data/derive.js';
import { channel, videos, CONNECTED_AT, BACKFILL_LABEL } from '../data/fixtures.js';
import { setState } from '../state.js';

const STEPS = ['Connect', 'Earlier history', 'The line', 'First patterns'];
let step = 0;
let consentShown = false;
let progress = 0;
let timer = null;

export function enter() { clearInterval(timer); step = 0; consentShown = false; progress = 0; }

export function render(_r, ctx) {
  const go = (n) => { step = n; ctx.rerender(); };
  const panel = [identify, calibrate, boundary, readings][step](go, ctx);
  return h('div', { class: 'onboard' },
    h('header', { class: 'onboard-top' },
      h('a', { class: 'logo', href: '../', 'aria-label': 'Merlark home' }, symbol(28), wordmark(20)),
      h('span', { class: 'chip preview' }, 'Sample channel'),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => { clearInterval(timer); location.hash = '#/overview'; setState({ onboarded: true }); } }, 'I’ll explore')),
    h('ol', { class: 'steps', 'aria-label': 'Onboarding progress' }, STEPS.map((s, i) =>
      h('li', { class: i === step ? 'now' : i < step ? 'done' : '', 'aria-current': i === step ? 'step' : null }, h('span', { class: 'num' }, String(i + 1)), s))),
    h('main', { class: 'onboard-main', id: 'main', tabindex: -1 }, panel));
}

function identify(go) {
  return h('section', { class: 'ob-card' },
    h('span', { class: 'eyebrow' }, 'Step 1 of 4'),
    h('h1', null, 'Make yourself at home.'),
    h('p', { class: 'muted' }, 'Meet Lanternfish Histories, our sample channel. First, a pretend connection.'),
    h('div', { class: 'chan-card' }, h('span', { class: 'chan-dot big', 'aria-hidden': 'true' }, 'LH'),
      h('div', null, h('strong', null, channel.name), h('p', { class: 'muted' }, `${channel.handle} · ${channel.subscribersLabel} · ${channel.niche}`))),
    consentShown
      ? h('div', { class: 'consent-sim', role: 'status' },
        h('strong', null, 'Pretend sign-in. No Google window opened.'),
        h('p', null, 'In the product, Google’s own screen asks for one read-only permission: ', h('code', null, 'youtube.readonly'), '. Analytics permissions come later, only when you turn on a feature that needs them. Merlark never sees your Google password.'),
        h('button', { class: 'btn btn-primary', type: 'button', 'data-autofocus': '', onclick: () => { progress = 0; go(1); } }, 'Next: earlier history', icon('arrow', 18)))
      : h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => { consentShown = true; go(0); } }, 'Connect with Google (pretend)'),
    h('p', { class: 'fine' }, 'No account is created. Your demo changes stay in this browser.'));
}

function calibrate(go) {
  const hist = videos.filter((v) => v.date < CONNECTED_AT);
  const list = h('ul', { class: 'calib-list' });
  const bar = h('i');
  const meter = h('div', { class: 'meter big', role: 'progressbar', 'aria-label': 'History rebuild progress', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': progress }, bar);
  const label = h('span', { class: 'num' });
  const done = h('button', { class: 'btn btn-primary', type: 'button', disabled: true, onclick: () => go(2) }, 'Next: the line', icon('arrow', 18));
  const paint = () => {
    const n = Math.round((progress / 100) * hist.length);
    bar.style.width = `${progress}%`;
    meter.setAttribute('aria-valuenow', String(progress));
    label.textContent = `${n} of ${hist.length} earlier videos`;
    list.replaceChildren(...hist.slice(Math.max(0, n - 5), n).reverse().map((v) => h('li', null, thumb(v, 56), h('span', null, v.title), h('small', { class: 'dim num' }, formatShort(v.date)))));
    done.disabled = progress < 100;
  };
  clearInterval(timer);
  if (reducedMotion()) progress = 100;
  if (progress < 100) {
    timer = setInterval(() => {
      if (!list.isConnected && progress > 0) { clearInterval(timer); return; }
      progress = Math.min(100, progress + 4); paint();
      if (progress >= 100) { clearInterval(timer); done.focus(); }
    }, 90);
  }
  requestAnimationFrame(paint);
  return h('section', { class: 'ob-card' },
    h('span', { class: 'eyebrow' }, 'Step 2 of 4'),
    h('h1', null, 'Earlier history'),
    h('div', { class: 'calib' },
      h('div', null,
        h('p', { class: 'muted' }, 'Rebuilt from the videos available when the channel connected. It stays separate from everything recorded later.'),
        meter, label, list)),
    h('div', { class: 'btn-row' }, done));
}

function boundary(go) {
  const w = Math.min(860, window.innerWidth - 64);
  return h('section', { class: 'ob-card wide' },
    h('span', { class: 'eyebrow' }, 'Step 3 of 4'),
    h('h1', null, 'One line, two kinds of history'),
    h('p', { class: 'muted' }, `Before ${formatDate(CONNECTED_AT)}: earlier history. After it: updates recorded since connection. The dashed line stays on every timeline.`),
    timelineChart({ videos: videos.filter((v) => v.format === 'long'), range: getRange('all'), width: w }),
    h('p', { class: 'backfill-label' }, icon('info', 14), BACKFILL_LABEL),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => go(3) }, 'Next: first patterns', icon('arrow', 18))));
}

function readings(go, ctx) {
  const stats = allFindingStats(getRange('all'));
  return h('section', { class: 'ob-card' },
    h('span', { class: 'eyebrow' }, 'Step 4 of 4'),
    h('h1', null, 'A few things worth noticing'),
    h('p', { class: 'muted' }, 'Each pattern compares the channel with its own usual and links to the videos behind it.'),
    h('ul', { class: 'mini-findings big' }, stats.map((s) => h('li', null, h('span', null, s.finding.name), stateChip(s.state)))),
    h('div', { class: 'consent-sim' }, h('strong', null, 'All pretend'), h('p', null, 'No Google account was contacted and nothing was stored outside this browser.')),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-primary btn-lg', type: 'button', 'data-autofocus': '', onclick: () => {
      step = 0; consentShown = false; progress = 0;
      location.hash = '#/overview';
      setState({ onboarded: true, connected: true });
    } }, 'Open the overview', icon('arrow', 18))));
}
