// demo/js/views/onboarding.js
// "Initialize your observatory": a simulated connection, backfill and boundary walkthrough.
// No OAuth window opens and nothing is sent to Google.

import { h, icon, symbol, wordmark, reducedMotion } from '../ui/dom.js';
import { timelineChart } from '../ui/charts.js';
import { stateChip, thumb } from '../ui/components.js';
import { allFindingStats, getRange, formatShort, formatDate } from '../data/derive.js';
import { channel, videos, CONNECTED_AT, BACKFILL_LABEL } from '../data/fixtures.js';
import { setState } from '../state.js';

const STEPS = ['Identify channel', 'Calibrate history', 'Set the boundary', 'First readings'];
let step = 0;
let consentShown = false;
let progress = 0;
let timer = null;

export function enter() { clearInterval(timer); step = 0; consentShown = false; progress = 0; }

export function render(_r, ctx) {
  const go = (n) => { step = n; ctx.rerender(); };
  const panel = [identify, calibrate, boundary, readings][step](go, ctx);
  return h('div', { class: 'onboard' },
    h('div', { class: 'onboard-bg', 'aria-hidden': 'true' }, h('i', { class: 'orb o1' }), h('i', { class: 'orb o2' }), h('i', { class: 'orb o3' })),
    h('header', { class: 'onboard-top' },
      h('a', { class: 'logo', href: '../', 'aria-label': 'Merlark home' }, symbol(26), wordmark(18)),
      h('span', { class: 'demo-pill static' }, h('i', { 'aria-hidden': 'true' }), 'Interactive demo · Sample data'),
      h('button', { class: 'btn btn-quiet btn-sm', onclick: () => { clearInterval(timer); location.hash = '#/overview'; setState({ onboarded: true }); } }, 'Skip')),
    h('ol', { class: 'steps', 'aria-label': 'Onboarding progress' }, STEPS.map((s, i) =>
      h('li', { class: i === step ? 'now' : i < step ? 'done' : '', 'aria-current': i === step ? 'step' : null }, h('span', { class: 'num' }, String(i + 1)), s))),
    h('main', { class: 'onboard-main', id: 'main', tabindex: -1 }, panel));
}

function identify(go) {
  return h('section', { class: 'ob-card' },
    h('span', { class: 'eyebrow' }, 'Step 1'),
    h('h1', null, 'Initialize your observatory'),
    h('p', { class: 'muted' }, 'Merlark watches one channel at a time. In the demo, that is a fictional history channel.'),
    h('div', { class: 'chan-card' }, h('span', { class: 'chan-dot big', 'aria-hidden': 'true' }, 'LH'),
      h('div', null, h('strong', null, channel.name), h('p', { class: 'muted' }, `${channel.handle} · ${channel.subscribersLabel} · ${channel.niche}`))),
    consentShown
      ? h('div', { class: 'consent-sim', role: 'status' },
        h('strong', null, 'Simulated sign-in. No Google window opened.'),
        h('p', null, 'In the product, Google’s consent screen asks for one read-only permission: ', h('code', null, 'youtube.readonly'), '. Analytics permissions are requested later, only when you turn on a feature that needs them. Merlark never sees your Google password.'),
        h('button', { class: 'btn btn-primary', 'data-autofocus': '', onclick: () => { progress = 0; go(1); } }, 'Begin calibration', icon('arrow', 16)))
      : h('button', { class: 'btn btn-primary btn-lg', onclick: () => { consentShown = true; go(0); } }, 'Connect with Google (simulated)'),
    h('p', { class: 'fine dim' }, 'Demo outcome: no account is created and nothing leaves your browser.'));
}

function calibrate(go) {
  const hist = videos.filter((v) => v.date < CONNECTED_AT);
  const list = h('ul', { class: 'calib-list' });
  const bar = h('i');
  const label = h('span', { class: 'num' });
  const done = h('button', { class: 'btn btn-primary', disabled: true, onclick: () => go(2) }, 'Set the boundary', icon('arrow', 16));
  const paint = () => {
    const n = Math.round((progress / 100) * hist.length);
    bar.style.width = `${progress}%`;
    label.textContent = `${n} of ${hist.length} earlier videos reconstructed`;
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
    h('span', { class: 'eyebrow' }, 'Step 2'),
    h('h1', null, 'Calibrating from history'),
    h('div', { class: 'calib' },
      h('div', { class: 'radar big', 'aria-hidden': 'true' }, h('i', { class: 'sweep' }), h('i', { class: 'ring r1' }), h('i', { class: 'ring r2' }), h('b', { class: 'blip' })),
      h('div', null,
        h('p', { class: 'muted' }, 'Merlark rebuilds the channel’s past from what is still accessible. This becomes a historical estimate, never mixed with what it observes later.'),
        h('div', { class: 'meter big', role: 'progressbar', 'aria-label': 'Backfill progress' }, bar), label, list)),
    h('div', { class: 'btn-row' }, done));
}

function boundary(go) {
  const w = Math.min(860, window.innerWidth - 64);
  return h('section', { class: 'ob-card wide' },
    h('span', { class: 'eyebrow' }, 'Step 3'),
    h('h1', null, 'The boundary is set'),
    h('p', { class: 'muted' }, `Everything before ${formatDate(CONNECTED_AT)} is a historical estimate. Everything after is observed by Merlark. The line stays visible on every timeline.`),
    timelineChart({ videos: videos.filter((v) => v.format === 'long'), range: getRange('all'), width: w }),
    h('p', { class: 'backfill-label' }, icon('info', 14), BACKFILL_LABEL),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-primary', onclick: () => go(3) }, 'Take first readings', icon('arrow', 16))));
}

function readings(go, ctx) {
  const stats = allFindingStats(getRange('all'));
  return h('section', { class: 'ob-card' },
    h('span', { class: 'eyebrow' }, 'Step 4'),
    h('h1', null, 'First readings'),
    h('p', { class: 'muted' }, 'Each reading compares the channel with its own history and links to the videos behind it.'),
    h('ul', { class: 'mini-findings big' }, stats.map((s) => h('li', null, h('span', null, s.finding.name), stateChip(s.state)))),
    h('div', { class: 'consent-sim' }, h('strong', null, 'Demo outcome'), h('p', null, 'No Google account was contacted, no permission was granted and nothing was stored outside this browser.')),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-primary btn-lg', 'data-autofocus': '', onclick: () => {
      step = 0; consentShown = false; progress = 0;
      location.hash = '#/overview';
      setState({ onboarded: true, connected: true });
    } }, 'Enter the bridge', icon('arrow', 16))));
}
