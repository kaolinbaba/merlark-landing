// demo/js/views/settings.js
// Channel settings, permissions, simulated plan management and demo controls.
// Every action here is simulated: no Google permission, payment, refund or deletion happens.

import { h, icon } from '../ui/dom.js';
import { dialog, toast } from '../ui/overlay.js';
import { previewChip } from '../ui/components.js';
import { formatDate, addDays, TODAY } from '../data/derive.js';
import { channel, CONNECTED_AT } from '../data/fixtures.js';
import { setState, resetState } from '../state.js';

const TABS = [['channel', 'Channel'], ['monitoring', 'Monitoring & brief'], ['plan', 'Plan'], ['demo', 'Demo controls']];
const TRIAL_START = addDays(TODAY, -2);
const TRIAL_END = addDays(TRIAL_START, 7);

export function render({ query }, ctx) {
  const tab = TABS.some(([id]) => id === query.get('tab')) ? query.get('tab') : 'channel';
  const s = ctx.state;
  const body = { channel: channelTab, monitoring: monitoringTab, plan: planTab, demo: demoTab }[tab](s, ctx);
  return h('div', { class: 'view settings' },
    h('div', { class: 'view-head' }, h('div', null, h('span', { class: 'eyebrow' }, 'Channel'), h('h1', null, 'Settings & plan'))),
    h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Settings sections' },
      TABS.map(([id, label]) => h('a', { role: 'tab', href: `#/settings?tab=${id}`, 'aria-selected': id === tab, class: id === tab ? 'on' : '' }, label))),
    body);
}

const row = (title, desc, control) => h('div', { class: 'set-row' }, h('div', null, h('strong', null, title), desc ? h('p', { class: 'muted' }, desc) : null), control);
const toggle = (on, label, onChange) => h('button', { class: `switch ${on ? 'on' : ''}`, role: 'switch', 'aria-checked': on, 'aria-label': label, onclick: () => onChange(!on) }, h('i'));

function channelTab(s) {
  if (!s.connected) {
    return h('section', { class: 'card' }, row('No channel connected', 'The sample channel was disconnected in this demo session.', h('a', { class: 'btn btn-primary', href: '#/onboarding' }, 'Reconnect (simulated)')));
  }
  const scopes = [
    { name: 'youtube.readonly', why: 'Read your channel and video details.', when: `Granted ${formatDate(CONNECTED_AT)} at connection`, on: true },
    { name: 'yt-analytics.readonly', why: 'Retention, average viewed and 7-day views.', when: `Granted ${formatDate(CONNECTED_AT)} when retention views were turned on`, on: true },
    { name: 'yt-analytics-monetary.readonly', why: 'Revenue views (not part of this demo).', when: s.monetaryScope ? 'Granted in this demo session (simulated)' : 'Not requested. Asked only if you turn on a revenue feature.', on: s.monetaryScope },
  ];
  return h('div', null,
    h('section', { class: 'card' },
      row(channel.name, `${channel.handle} · ${channel.niche} · fictional sample channel`, h('span', { class: 'chip prov prov-observed' }, 'Connected')),
      row('Connected since', formatDate(CONNECTED_AT), null)),
    h('section', { class: 'card' },
      h('h2', { class: 'sub' }, 'Google permissions'),
      h('p', { class: 'muted' }, 'Merlark asks for one permission at a time, only when a feature that needs it is turned on.'),
      h('ul', { class: 'scopes' }, scopes.map((sc) => h('li', { class: sc.on ? 'on' : '' },
        h('i', { class: 'lamp', 'aria-hidden': 'true' }),
        h('div', null, h('code', null, sc.name), h('p', null, sc.why), h('small', { class: 'dim' }, sc.when)),
        !sc.on ? h('button', { class: 'btn btn-ghost btn-sm', onclick: () => dialog({
          label: 'Incremental permission (simulated)', title: 'Turn on revenue views?',
          body: h('div', { class: 'prose' }, h('p', null, 'In the product, this opens Google’s own consent screen asking for read-only revenue access. Nothing else changes.'),
            h('p', null, h('strong', null, 'In this demo: '), 'no Google screen opens and no permission is requested. The revenue feature itself is not part of the demo.')),
          actions: [{ label: 'Cancel' }, { label: 'Simulate grant', variant: 'btn-primary', onClick: () => { setState({ monetaryScope: true }); toast('Permission marked as granted (simulated). Nothing was sent to Google.'); } }],
        }) }, 'Turn on') : null)))),
    h('section', { class: 'card danger-zone' },
      row('Disconnect channel', 'In the product, disconnecting revokes access and deletes the stored YouTube data for this channel.',
        h('button', { class: 'btn btn-danger btn-sm', onclick: () => dialog({
          label: 'Disconnect (simulated)', title: `Disconnect ${channel.name}?`,
          body: h('div', { class: 'prose' },
            h('p', null, h('strong', null, 'In the product: '), 'Merlark revokes its Google access and deletes the stored YouTube data for this channel. This cannot be undone.'),
            h('p', null, h('strong', null, 'In this demo: '), 'nothing is revoked or deleted. The sample channel is hidden until you reconnect it or reset the demo.')),
          actions: [{ label: 'Keep connected' }, { label: 'Disconnect (simulated)', variant: 'btn-danger', onClick: () => { setState({ connected: false }); toast('Disconnected (simulated). No data was deleted.'); } }],
        }) }, 'Disconnect'))));
}

function monitoringTab(s) {
  return h('section', { class: 'card' },
    row('Monitoring', s.monitoringPaused ? 'Paused. No new readings will be recorded.' : 'Active. New uploads and 7-day readings are recorded.', toggle(!s.monitoringPaused, 'Monitoring', (on) => { setState({ monitoringPaused: !on }); toast(on ? 'Monitoring resumed (simulated).' : 'Monitoring paused (simulated).'); })),
    row('Weekly brief day', 'The brief covers Monday to Sunday and is prepared after the week ends.',
      h('label', { class: 'range' }, h('span', { class: 'sr-only' }, 'Brief day'), h('select', { onchange: (e) => { setState({ briefDay: e.target.value }); toast(`Brief day set to ${e.target.value}.`); } },
        ['Monday', 'Tuesday', 'Friday'].map((d) => h('option', { value: d, selected: d === s.briefDay }, d))))),
    row('Email me the brief', 'Simulated. The demo sends no email.', toggle(s.briefEmail, 'Email brief', (on) => { setState({ briefEmail: on }); toast(on ? 'Brief email turned on (simulated, nothing is sent).' : 'Brief email turned off.'); })));
}

function planTab(s) {
  const cancelled = s.subscription === 'cancelled';
  return h('div', null,
    h('section', { class: 'card plan-card' },
      h('div', { class: 'plan-head' }, h('div', null, h('span', { class: 'eyebrow' }, 'Plan'), h('h2', null, 'Early Access')), previewChip('Simulated billing')),
      h('dl', { class: 'facts' },
        h('dt', null, 'Status'), h('dd', null, cancelled ? `Cancelled (simulated). Access continues until ${formatDate(TRIAL_END)}.` : `Trial (simulated), day 3 of 7. Ends ${formatDate(TRIAL_END)}.`),
        h('dt', null, 'Price'), h('dd', null, 'Not set yet. Early Access pricing will be decided with the first testers.'),
        h('dt', null, 'Card on file'), h('dd', null, 'None. The demo never asks for payment details.'),
        h('dt', null, 'Before any charge'), h('dd', null, 'An email reminder is sent before a renewal charge.')),
      h('div', { class: 'btn-row' },
        cancelled
          ? h('button', { class: 'btn btn-primary', onclick: () => { setState({ subscription: 'trial' }); toast('Subscription resumed (simulated).'); } }, 'Resume (simulated)')
          : h('button', { class: 'btn btn-danger', onclick: () => dialog({
            label: 'One-click cancellation (simulated)', title: 'Cancel your plan?',
            body: h('div', { class: 'prose' },
              h('p', null, h('strong', null, 'What happens in the product: '), 'renewal stops immediately and you keep access until the end of the current period. Refunds follow Merlark’s Terms and your statutory rights.'),
              h('p', null, h('strong', null, 'What happens in this demo: '), 'nothing is charged, cancelled or refunded. The plan is only marked as cancelled in your browser.')),
            actions: [{ label: 'Keep plan' }, { label: 'Cancel plan (simulated)', variant: 'btn-danger', onClick: () => { setState({ subscription: 'cancelled' }); toast('Plan cancelled (simulated). No payment system was contacted.'); } }],
          }) }, 'Cancel plan'))),
    h('section', { class: 'card' }, h('h2', { class: 'sub' }, 'Invoices'), h('p', { class: 'muted' }, 'No invoices. The demo has no billing.')));
}

function demoTab(s, ctx) {
  return h('section', { class: 'card' },
    row('Simulate a failed check', 'Shows how Merlark reports a YouTube API problem on the Monitoring screen.', toggle(s.simulateError, 'Simulate failed check', (on) => { setState({ simulateError: on }); toast(on ? 'Failed check simulated. Open Monitoring to see it.' : 'Simulation off.'); })),
    row('Replay onboarding', 'Walk through connecting the sample channel again.', h('a', { class: 'btn btn-ghost btn-sm', href: '#/onboarding' }, 'Replay')),
    row('Reset demo', 'Restores the sample data, interventions, script draft and settings.',
      h('button', { class: 'btn btn-ghost btn-sm', onclick: () => { resetState(); setState({ onboarded: true }); toast('Demo restored to its starting point.'); ctx.navigate('#/overview'); } }, icon('reset', 14), 'Reset demo')),
    row('Stored in this browser', 'Your demo choices are kept in local storage so a refresh keeps your place. Nothing is sent anywhere.', null));
}
