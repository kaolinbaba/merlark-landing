// demo/js/views/monitoring.js
// Monitoring status and history (category 5) next to the backfill (category 4), with the
// connection boundary drawn as a visible element, not a footnote.

import { h, icon } from '../ui/dom.js';
import { toast } from '../ui/overlay.js';
import { timelineChart } from '../ui/charts.js';
import { sectionHead, emptyState, chartWidth } from '../ui/components.js';
import { monitoringLog, LAST_CHECK, formatDate, formatShort, getRange, TODAY, videoById, addDays } from '../data/derive.js';
import { videos, CONNECTED_AT, BACKFILL_LABEL, HISTORY_START } from '../data/fixtures.js';
import { getState, setState } from '../state.js';

const TYPES = { all: 'All events', upload: 'New uploads', reading: '7-day readings', finding: 'Finding changes', error: 'Problems', connect: 'Connection', backfill: 'Backfill', scope: 'Permissions', manual: 'Manual checks' };
let logFilter = 'all';
let checking = false;

function runCheck(rerender) {
  if (checking) return;
  checking = true; rerender();
  setTimeout(() => {
    checking = false;
    const st = getState();
    if (st.simulateError) {
      setState({ manualChecks: [{ date: TODAY, time: '09:0' + (st.manualChecks.length % 10), type: 'error', text: 'Manual check failed: the YouTube API did not respond (simulated). Nothing was changed.' }, ...st.manualChecks] });
      toast('Check failed (simulated). See the error panel.', 'error');
    } else {
      setState({ manualChecks: [{ date: TODAY, time: '09:0' + (st.manualChecks.length % 10), type: 'manual', text: 'Manual check (simulated): no new uploads, findings unchanged.' }, ...st.manualChecks] });
      toast('Check complete: no new uploads.');
    }
  }, 1400);
}

export function render(_r, ctx) {
  const { state, rerender } = ctx;
  if (!state.connected) return emptyState('Monitoring is off', 'No channel is connected in this demo session.', h('a', { class: 'btn btn-primary', href: '#/onboarding' }, 'Reconnect (simulated)'));
  const all = [...state.manualChecks, ...monitoringLog()];
  const log = all.filter((e) => logFilter === 'all' || e.type === logFilter);
  const histCount = videos.filter((v) => v.date < CONNECTED_AT).length;
  const obsCount = videos.filter((v) => v.date >= CONNECTED_AT).length;
  const fullRange = getRange('all');
  const status = state.simulateError ? 'err' : state.monitoringPaused ? 'paused' : 'on';

  return h('div', { class: 'view' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, 'Observe'), h('h1', null, 'Monitoring & backfill'))),

    state.simulateError ? h('div', { class: 'error-state inline', role: 'alert' },
      h('div', null, h('strong', null, 'The last check could not reach the YouTube API'), h('p', { class: 'muted' }, 'Simulated error. Readings shown below are from the last successful check; nothing was lost. Turn the simulation off in Settings → Demo.')),
      h('button', { class: 'btn btn-primary btn-sm', onclick: () => runCheck(rerender) }, checking ? 'Retrying…' : 'Retry')) : null,

    h('section', { class: `card status-panel s-${status}` },
      h('div', { class: 'radar', 'aria-hidden': 'true' }, h('i', { class: 'sweep' }), h('i', { class: 'ring r1' }), h('i', { class: 'ring r2' }), h('b', { class: 'blip' })),
      h('div', { class: 'status-text' },
        h('span', { class: 'eyebrow' }, status === 'on' ? 'Monitoring active' : status === 'paused' ? 'Monitoring paused' : 'Check failed'),
        h('h2', null, `Last check: ${formatDate(LAST_CHECK.date)}, ${LAST_CHECK.time}`),
        h('p', { class: 'muted' }, `Connected ${formatDate(CONNECTED_AT)} with read-only access. ${obsCount} uploads observed since then.`),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn btn-primary btn-sm', disabled: checking || state.monitoringPaused, onclick: () => runCheck(rerender) }, checking ? h('span', { class: 'spinner', 'aria-hidden': 'true' }) : icon('reset', 14), checking ? 'Checking…' : 'Run check now (simulated)'),
          h('button', { class: 'btn btn-ghost btn-sm', onclick: () => { setState({ monitoringPaused: !state.monitoringPaused }); toast(state.monitoringPaused ? 'Monitoring resumed (simulated).' : 'Monitoring paused (simulated).'); } }, state.monitoringPaused ? 'Resume monitoring' : 'Pause monitoring')))),

    h('section', { class: 'card' },
      sectionHead('Backfill and connection boundary', 'Two kinds of history, never mixed'),
      h('div', { class: 'boundary-cards' },
        h('div', { class: 'bc hist' }, h('span', { class: 'chip prov prov-historical' }, 'Historical estimate'),
          h('b', { class: 'num' }, String(histCount)), h('span', null, `videos, ${formatShort(HISTORY_START)} – ${formatShort(addDays(CONNECTED_AT, -1))}`),
          h('p', { class: 'backfill-label' }, icon('info', 14), BACKFILL_LABEL)),
        h('div', { class: 'bc-line', 'aria-hidden': 'true' }, h('span', null, 'Connected'), h('i'), h('span', { class: 'num' }, formatShort(CONNECTED_AT))),
        h('div', { class: 'bc obs' }, h('span', { class: 'chip prov prov-observed' }, 'Observed by Merlark'),
          h('b', { class: 'num' }, String(obsCount)), h('span', null, `videos, ${formatShort(CONNECTED_AT)} – ${formatShort(TODAY)}`),
          h('p', { class: 'muted' }, 'Recorded while the channel was connected: upload detection and 7-day readings.'))),
      timelineChart({ videos: videos.filter((v) => v.format === 'long'), range: fullRange, width: chartWidth(), onSelect: (v) => ctx.navigate(`#/videos/${v.id}`) }),
      h('p', { class: 'fine dim' }, 'Backfill reconstructs history from what is still accessible, so it tends to look better than reality: removed videos are often the weakest ones.')),

    h('section', { class: 'card' },
      sectionHead('Monitoring history', `${all.length} events since connection`,
        h('label', { class: 'range' }, h('span', { class: 'sr-only' }, 'Event type'),
          h('select', { onchange: (e) => { logFilter = e.target.value; rerender(); } }, Object.entries(TYPES).map(([k, v]) => h('option', { value: k, selected: k === logFilter }, v))))),
      log.length ? h('ol', { class: 'log' }, log.map((e) => {
        const v = e.videoId && videoById(e.videoId);
        return h('li', { class: `log-item t-${e.type}` },
          h('span', { class: 'log-when num' }, `${formatShort(e.date)} ${e.time}`),
          h('i', { class: 'log-dot', 'aria-hidden': 'true' }),
          h('span', { class: 'log-text' }, e.text, v ? [' ', h('a', { href: `#/videos/${v.id}` }, 'Open video')] : null));
      })) : emptyState('No events of this type', 'Choose another event type to see more of the history.', h('button', { class: 'btn btn-ghost', onclick: () => { logFilter = 'all'; rerender(); } }, 'Show all events'))));
}
