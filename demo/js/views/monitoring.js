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

const TYPES = { all: 'Everything', upload: 'New uploads', reading: 'Week-one readings', finding: 'Finding changes', error: 'Problems', connect: 'Connection', backfill: 'History rebuild', scope: 'Permissions', manual: 'Manual checks' };
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
      toast('Check failed (pretend). See the note at the top.', 'error');
    } else {
      setState({ manualChecks: [{ date: TODAY, time: '09:0' + (st.manualChecks.length % 10), type: 'manual', text: 'Manual check (pretend): no new uploads, findings unchanged.' }, ...st.manualChecks] });
      toast('All checked. No new uploads.');
    }
  }, 1400);
}

export function render(_r, ctx) {
  const { state, rerender } = ctx;
  if (!state.connected) return emptyState('Not watching anything', 'No channel is connected in this demo.', h('a', { class: 'btn btn-primary', href: '#/onboarding' }, 'Connect again (pretend)'));
  const all = [...state.manualChecks, ...monitoringLog()];
  const log = all.filter((e) => logFilter === 'all' || e.type === logFilter);
  const histCount = videos.filter((v) => v.date < CONNECTED_AT).length;
  const obsCount = videos.filter((v) => v.date >= CONNECTED_AT).length;
  const fullRange = getRange('all');
  const status = state.simulateError ? 'err' : state.monitoringPaused ? 'paused' : 'on';

  return h('div', { class: 'view' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, 'Monitoring'), h('h1', null, 'What we rebuilt, and what we’ve watched'))),

    state.simulateError ? h('div', { class: 'error-state inline', role: 'alert' },
      h('div', null, h('strong', null, 'The last check couldn’t reach YouTube'), h('p', { class: 'muted' }, 'A pretend error. The readings below are from the last good check, so nothing is lost. Switch it off in Settings → Demo.')),
      h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => runCheck(rerender) }, checking ? 'Trying again…' : 'Try again')) : null,

    h('section', { class: `card status-panel s-${status}` },
      h('div', { class: 'status-row' },
        h('i', { class: `watch-lamp big ${status === 'on' ? '' : 'off'}`, 'aria-hidden': 'true' }),
        h('div', { class: 'status-text' },
          h('span', { class: 'eyebrow' }, status === 'on' ? 'Watching' : status === 'paused' ? 'Paused' : 'Check failed'),
          h('h2', null, `Last check: ${formatDate(LAST_CHECK.date)}, ${LAST_CHECK.time}`),
          h('p', { class: 'muted' }, `Connected ${formatDate(CONNECTED_AT)} with read-only access. ${obsCount} uploads seen since then.`)),
        h('button', { class: `switch ${state.monitoringPaused ? '' : 'on'}`, type: 'button', role: 'switch', 'aria-checked': String(!state.monitoringPaused), 'aria-label': 'Watching', onclick: () => { setState({ monitoringPaused: !state.monitoringPaused }); toast(state.monitoringPaused ? 'Watching again (pretend).' : 'Paused (pretend).'); } }, h('i'))),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-primary btn-sm', type: 'button', disabled: checking || state.monitoringPaused, onclick: () => runCheck(rerender) }, checking ? h('span', { class: 'spinner', 'aria-hidden': 'true' }) : icon('reset', 14), checking ? 'Checking…' : 'Check now (pretend)'))),

    h('section', { class: 'card' },
      sectionHead('Two kinds of history', 'Rebuilt vs. watched, never mixed'),
      h('div', { class: 'boundary-cards' },
        h('div', { class: 'bc hist' }, h('span', { class: 'chip prov prov-historical' }, 'Historical estimate'),
          h('b', { class: 'num' }, String(histCount)), h('span', null, `videos, ${formatShort(HISTORY_START)} – ${formatShort(addDays(CONNECTED_AT, -1))}`),
          h('p', { class: 'backfill-label' }, icon('info', 14), BACKFILL_LABEL)),
        h('div', { class: 'bc-line', 'aria-hidden': 'true' }, h('span', null, 'You connected here'), h('i'), h('span', { class: 'num' }, formatShort(CONNECTED_AT))),
        h('div', { class: 'bc obs' }, h('span', { class: 'chip prov prov-observed' }, 'Observed by Merlark'),
          h('b', { class: 'num' }, String(obsCount)), h('span', null, `videos, ${formatShort(CONNECTED_AT)} – ${formatShort(TODAY)}`),
          h('p', { class: 'muted' }, 'Recorded after you connected: new uploads and their week-one readings.'))),
      timelineChart({ key: 'monitor', videos: videos.filter((v) => v.format === 'long'), range: fullRange, width: chartWidth(), onSelect: (v) => ctx.navigate(`#/videos/${v.id}`) }),
      h('p', { class: 'fine' }, 'Rebuilt history only sees what’s still online, so it tends to look a bit rosier than reality: removed videos are often the weakest ones.')),

    h('section', { class: 'card' },
      sectionHead('Log', `${all.length} events since you connected`,
        h('label', { class: 'range' }, h('span', { class: 'sr-only' }, 'Event type'),
          h('select', { onchange: (e) => { logFilter = e.target.value; rerender(); } }, Object.entries(TYPES).map(([k, v]) => h('option', { value: k, selected: k === logFilter }, v))))),
      log.length ? h('ol', { class: 'log' }, log.map((e) => {
        const v = e.videoId && videoById(e.videoId);
        return h('li', { class: `log-item t-${e.type}` },
          h('span', { class: 'log-when num' }, `${formatShort(e.date)} ${e.time}`),
          h('i', { class: 'log-dot', 'aria-hidden': 'true' }),
          h('span', { class: 'log-text' }, e.text, v ? [' ', h('a', { href: `#/videos/${v.id}` }, 'Open video')] : null));
      })) : emptyState('No events of this kind', 'Pick another kind to see more of the log.', h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { logFilter = 'all'; rerender(); } }, 'Show everything'))));
}
