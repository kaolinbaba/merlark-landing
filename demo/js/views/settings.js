// demo/js/views/settings.js
// Channel settings, permissions, simulated plan management and demo controls.
// Every action here is simulated: no Google permission, payment, refund or deletion happens.

import { h, icon, segmented } from '../ui/dom.js';
import { dialog, toast } from '../ui/overlay.js';
import { previewChip } from '../ui/components.js';
import { formatDate, addDays, TODAY } from '../data/derive.js';
import { channel, CONNECTED_AT } from '../data/fixtures.js';
import { setState, resetState } from '../state.js';
import { motionToggle } from '../ui/motion.js';

const TABS = [['channel', 'Connections'], ['plan', 'Your plan'], ['motion', 'Motion and appearance'], ['demo', 'Demo settings']];
const TRIAL_START = addDays(TODAY, -2);
const TRIAL_END = addDays(TRIAL_START, 7);

export function render({ query }, ctx) {
  const asked = query.get('tab') === 'monitoring' ? 'channel' : query.get('tab');
  const tab = TABS.some(([id]) => id === asked) ? asked : 'channel';
  const s = ctx.state;
  const body = { channel: (st) => h('div', { class: 'set-stack' }, channelTab(st), monitoringTab(st)), plan: planTab, motion: motionTab, demo: demoTab }[tab](s, ctx);
  return h('div', { class: 'view settings' },
    h('div', { class: 'view-head' }, h('div', null, h('span', { class: 'eyebrow' }, 'Settings'), h('h1', null, 'Make it yours.'), h('p', { class: 'desc' }, 'Your channel, preferences and account controls.'))),
    h('div', { class: 'set-tabs' }, segmented(TABS, tab, (id) => setTimeout(() => ctx.navigate(`#/settings?tab=${id}`), 200), { label: 'Settings groups' })),
    body);
}

const row = (title, desc, control) => h('div', { class: 'set-row' }, h('div', null, h('strong', null, title), desc ? h('p', { class: 'muted' }, desc) : null), control);
const toggle = (on, label, onChange) => h('button', { class: `switch ${on ? 'on' : ''}`, type: 'button', role: 'switch', 'aria-checked': String(on), 'aria-label': label, onclick: () => onChange(!on) }, h('i'));

function channelTab(s) {
  if (!s.connected) {
    return h('section', { class: 'card' }, row('Nothing here yet.', 'You disconnected the sample channel in this demo.', h('a', { class: 'btn btn-primary', href: '#/onboarding' }, 'Connect again (pretend)')));
  }
  const scopes = [
    { name: 'youtube.readonly', why: 'Read your channel and video details.', when: `Granted ${formatDate(CONNECTED_AT)} when you connected`, on: true },
    { name: 'yt-analytics.readonly', why: 'Watch curves, average watched and first-week views.', when: `Granted ${formatDate(CONNECTED_AT)} when you turned on watch curves`, on: true },
    { name: 'yt-analytics-monetary.readonly', why: 'Revenue views (not in this demo).', when: s.monetaryScope ? 'Granted in this demo (pretend)' : 'Not asked for. Only asked if you turn on a revenue feature.', on: s.monetaryScope },
  ];
  return h('div', null,
    h('section', { class: 'card' },
      row(channel.name, `${channel.handle} · ${channel.niche} · made-up sample channel`, h('span', { class: 'chip prov prov-observed' }, 'Connected')),
      row('Connected since', formatDate(CONNECTED_AT), null)),
    h('section', { class: 'card' },
      h('h2', { class: 'sub' }, 'Google permissions (pretend)'),
      h('p', { class: 'muted' }, 'Merlark asks for one permission at a time, and only when you turn on a feature that needs it.'),
      h('ul', { class: 'scopes' }, scopes.map((sc) => h('li', { class: sc.on ? 'on' : '' },
        h('i', { class: 'lamp', 'aria-hidden': 'true' }),
        h('div', null, h('code', null, sc.name), h('p', null, sc.why), h('small', { class: 'dim' }, sc.when)),
        !sc.on ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => dialog({
          label: 'One more permission (pretend)', title: 'Turn on revenue views?',
          body: h('div', { class: 'prose' }, h('p', null, 'In the product, this opens Google’s own screen asking for read-only revenue access. Nothing else changes.'),
            h('p', null, h('strong', null, 'In this demo: '), 'no Google screen opens and nothing is asked for. The revenue feature isn’t in the demo.')),
          actions: [{ label: 'Cancel' }, { label: 'Pretend to allow', variant: 'btn-primary', onClick: () => { setState({ monetaryScope: true }); toast('Saved.'); } }],
        }) }, 'Turn on') : null)))),
    h('section', { class: 'card danger-zone' },
      row('Disconnect channel', 'In the product, disconnecting removes Merlark’s access and deletes the stored YouTube data for this channel.',
        h('button', { class: 'btn btn-danger btn-sm', type: 'button', onclick: () => dialog({
          label: 'Disconnect (pretend)', title: `Disconnect ${channel.name}?`,
          body: h('div', { class: 'prose' },
            h('p', null, h('strong', null, 'In the product: '), 'Merlark removes its Google access and deletes the stored YouTube data for this channel. You can’t undo it.'),
            h('p', null, h('strong', null, 'In this demo: '), 'nothing is removed or deleted. The sample channel just hides until you connect it again or reset the demo.')),
          actions: [{ label: 'Keep connected' }, { label: 'Disconnect (pretend)', variant: 'btn-danger', onClick: () => { setState({ connected: false }); toast('Saved.'); } }],
        }) }, 'Disconnect'))));
}

function monitoringTab(s) {
  return h('section', { class: 'card' },
    row('Follow new uploads', s.monitoringPaused ? 'Paused. No new readings are saved.' : 'On. New uploads and their first-week readings are saved.', toggle(!s.monitoringPaused, 'Follow new uploads', (on) => { setState({ monitoringPaused: !on }); toast('Saved.'); })),
    row('Weekly recap day', 'Your recap covers Monday to Sunday and is ready once the week ends.',
      h('label', { class: 'range' }, h('span', { class: 'sr-only' }, 'Weekly recap day'), h('select', { onchange: (e) => { setState({ briefDay: e.target.value }); toast('Saved.'); } },
        ['Monday', 'Tuesday', 'Friday'].map((d) => h('option', { value: d, selected: d === s.briefDay }, d))))),
    row('Email me the recap', 'Pretend. The demo sends no email.', toggle(s.briefEmail, 'Email me the recap', (on) => { setState({ briefEmail: on }); toast('Saved.'); })));
}

function planTab(s) {
  const cancelled = s.subscription === 'cancelled';
  return h('div', null,
    h('section', { class: 'card plan-card' },
      h('div', { class: 'plan-head' }, h('div', null, h('span', { class: 'eyebrow' }, 'Plan'), h('h2', null, 'Early Access')), previewChip('Pretend billing')),
      h('dl', { class: 'facts' },
        h('dt', null, 'Status'), h('dd', null, cancelled ? `Cancelled (pretend). You keep access until ${formatDate(TRIAL_END)}.` : `Trial (pretend), day 3 of 7. Ends ${formatDate(TRIAL_END)}.`),
        h('dt', null, 'Price'), h('dd', null, 'Not set yet. Early Access pricing will be decided with the first testers.'),
        h('dt', null, 'Card on file'), h('dd', null, 'None. The demo never asks for payment details.'),
        h('dt', null, 'Before any charge'), h('dd', null, 'You get an email reminder before a renewal charge.')),
      h('div', { class: 'btn-row' },
        cancelled
          ? h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { setState({ subscription: 'trial' }); toast('Saved.'); } }, 'Resume (pretend)')
          : h('button', { class: 'btn btn-danger', type: 'button', onclick: () => dialog({
            label: 'One-click cancel (pretend)', title: 'Cancel your plan?',
            body: h('div', { class: 'prose' },
              h('p', null, h('strong', null, 'In the product: '), 'renewal stops right away and you keep access until the end of the current period. Refunds follow Merlark’s Terms and your statutory rights.'),
              h('p', null, h('strong', null, 'In this demo: '), 'nothing is charged, cancelled or refunded. The plan is only marked as cancelled in your browser.')),
            actions: [{ label: 'Keep plan' }, { label: 'Cancel plan (pretend)', variant: 'btn-danger', onClick: () => { setState({ subscription: 'cancelled' }); toast('Saved.'); } }],
          }) }, 'Cancel plan'))),
    h('section', { class: 'card' }, h('h2', { class: 'sub' }, 'Invoices'), h('p', { class: 'muted' }, 'No invoices. The demo has no billing.')));
}

function motionTab() {
  return h('section', { class: 'card' },
    row('Motion', 'Small movements when you press, switch or change dates. Your system’s reduced-motion setting always wins.', motionToggle()),
    row('Colours', 'Labels and icons always carry the same meaning as colour.', null));
}

function resetDialog(ctx) {
  dialog({
    label: 'Demo settings',
    title: 'Start fresh?',
    body: h('p', null, 'This clears your demo changes and restores the sample channel.'),
    actions: [
      { label: 'Keep my changes' },
      { label: 'Reset demo', variant: 'btn-danger', onClick: () => { resetState(); setState({ onboarded: true }); toast('Saved.'); ctx.navigate('#/overview'); } },
    ],
  });
}

function demoTab(s, ctx) {
  return h('section', { class: 'card' },
    row('Pretend a check failed', 'See what happens when YouTube doesn’t answer.', toggle(s.simulateError, 'Pretend a check failed', (on) => { setState({ simulateError: on }); toast('Saved.'); })),
    row('Show me around again', 'Replay the quick tour of the sample channel.', h('a', { class: 'btn btn-ghost btn-sm', href: '#/onboarding' }, 'Replay')),
    row('Reset demo', 'Puts back the sample data, experiments, drafts and settings.',
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => resetDialog(ctx) }, icon('reset', 16), 'Reset demo')),
    row('Saved in this browser', 'Your demo changes stay in this browser so a refresh keeps your place. Nothing is sent anywhere.', null));
}
