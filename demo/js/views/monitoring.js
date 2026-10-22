// demo/js/views/monitoring.js
// Channel history: the reconstructed earlier history (category 4) beside the updates recorded since connection
// (category 5), with the connection boundary drawn as a visible element, not a footnote.

import { h, icon } from '../ui/dom.js';
import { toast } from '../ui/overlay.js';
import { timelineChart } from '../ui/charts.js';
import { sectionHead, emptyState, chartWidth } from '../ui/components.js';
import { monitoringLog, LAST_CHECK, formatDate, formatShort, getRange, TODAY, videoById, addDays } from '../data/derive.js';
import { videos, CONNECTED_AT, BACKFILL_LABEL, HISTORY_START } from '../data/fixtures.js';
import { getState, setState } from '../state.js';

const TYPES = { all: 'Everything', upload: 'New uploads', reading: 'First-week readings', finding: 'Label changes', error: 'Problems', connect: 'Connection', backfill: 'History rebuild', scope: 'Permissions', manual: 'Manual checks' };
let logFilter = 'all';
let checking = false;

function runCheck(rerender) {
  if (checking) return;
  checking = true; rerender();
  setTimeout(() => {
    checking = false;
    const st = getState();
    if (st.simulateError) {
      setState({ manualChecks: [{ date: TODAY, time: '09:0' + (st.manualChecks.length % 10), type: 'error', text: 'Manual check failed: YouTube didn’t answer (pretend). Nothing changed.' }, ...st.manualChecks] });
      toast('That didn’t load. Let’s try again.', 'error');
    } else {
      setState({ manualChecks: [{ date: TODAY, time: '09:0' + (st.manualChecks.length % 10), type: 'manual', text: 'Manual check (pretend): no new uploads, labels unchanged.' }, ...st.manualChecks] });
      toast('Saved.');
    }
  }, 1200);
}

export function render(_r, ctx) {
  const { state, rerender } = ctx;
  if (!state.connected) return emptyState('Nothing here yet.', 'No channel is connected in this demo.', h('a', { class: 'btn btn-primary', href: '#/onboarding' }, 'Connect again (pretend)'));
  const all = [...state.manualChecks, ...monitoringLog()];
  const log = all.filter((e) => logFilter === 'all' || e.type === logFilter);
  const histCount = videos.filter((v) => v.date < CONNECTED_AT).length;
  const obsCount = videos.filter((v) => v.date >= CONNECTED_AT).length;
  const fullRange = getRange('all');
  const status = state.simulateError ? 'err' : state.monitoringPaused ? 'paused' : 'on';

  return h('div', { class: 'view' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, 'All dates'), h('h1', null, 'The story so far.'), h('p', { class: 'desc' }, 'See earlier videos and what we’ve followed since the channel connected.'))),

    state.simulateError ? h('div', { class: 'error-state inline', role: 'alert' },
      h('div', null, h('h2', null, 'That didn’t load. Let’s try again.'), h('p', null, 'A pretend error. The readings below are from the last good check. Switch it off in Settings → Demo settings.')),
      h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => runCheck(rerender) }, checking ? 'Trying…' : 'Try again')) : null,

    h('section', { class: 'boundary-cards' },
      h('div', { class: 'bc hist' },
        h('span', { class: 'label' }, icon('history', 18), 'Earlier history'),
        h('b', { class: 'num' }, String(histCount)), h('span', null, `videos, ${formatShort(HISTORY_START)} – ${formatShort(addDays(CONNECTED_AT, -1))}`),
        h('p', null, 'Rebuilt from the videos available when the channel connected.'),
        h('p', { class: 'backfill-label' }, icon('info', 14), BACKFILL_LABEL)),
      h('div', { class: 'bc-line', 'aria-hidden': 'true' }, h('span', null, 'Connected'), h('i'), h('span', { class: 'num' }, formatShort(CONNECTED_AT))),
      h('div', { class: 'bc obs' },
        h('span', { class: 'label' }, icon('eye', 18), 'Since connection'),
        h('b', { class: 'num' }, String(obsCount)), h('span', null, `videos, ${formatShort(CONNECTED_AT)} – ${formatShort(TODAY)}`),
        h('p', null, 'Updates recorded after the channel connected.'))),

    h('section', null,
      timelineChart({ key: 'monitor', videos: videos.filter((v) => v.format === 'long'), range: fullRange, width: chartWidth(), onSelect: (v) => ctx.navigate(`#/videos/${v.id}`) }),
      h('p', { class: 'fine' }, 'Earlier history only sees what was still online, so it can look a little rosier than it was: removed videos are often the weakest ones.')),

    h('section', { class: `status-panel s-${status}` },
      h('div', { class: 'status-row' },
        h('div', { class: 'status-text' },
          h('span', { class: 'label' }, icon('eye', 18), status === 'on' ? 'Following new uploads' : status === 'paused' ? 'Paused' : 'Last check didn’t load'),
          h('p', { class: 'muted' }, `Last check ${formatDate(LAST_CHECK.date)}, ${LAST_CHECK.time}. Connected ${formatDate(CONNECTED_AT)} with read-only access.`)),
        h('button', { class: `switch ${state.monitoringPaused ? '' : 'on'}`, type: 'button', role: 'switch', 'aria-checked': String(!state.monitoringPaused), 'aria-label': 'Follow new uploads', onclick: () => { setState({ monitoringPaused: !state.monitoringPaused }); toast('Saved.'); } }, h('i')),
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', disabled: checking || state.monitoringPaused, onclick: () => runCheck(rerender) }, checking ? h('span', { class: 'spinner', 'aria-hidden': 'true' }) : icon('reset', 16), checking ? 'Getting things ready…' : 'Check now (pretend)'))),

    h('section', null,
      sectionHead(null, 'Since connection, step by step',
        h('label', { class: 'range' }, h('span', { class: 'sr-only' }, 'Show'),
          h('select', { onchange: (e) => { logFilter = e.target.value; rerender(); } }, Object.entries(TYPES).map(([k, v]) => h('option', { value: k, selected: k === logFilter }, v))))),
      log.length ? h('ol', { class: 'log' }, log.map((e) => {
        const v = e.videoId && videoById(e.videoId);
        return h('li', { class: `log-item t-${e.type}` },
          h('span', { class: 'log-when num' }, `${formatShort(e.date)} ${e.time}`),
          h('i', { class: 'log-dot', 'aria-hidden': 'true' }),
          h('span', { class: 'log-text' }, e.text, v ? [' ', h('a', { href: `#/videos/${v.id}` }, 'Open video')] : null));
      })) : emptyState('Nothing here yet.', 'Pick another kind to see more.', h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { logFilter = 'all'; rerender(); } }, 'Show everything'))));
}
