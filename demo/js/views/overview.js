// demo/js/views/overview.js
// The Bridge: main finding first, then its evidence and the next useful action, then the instruments.

import { h, icon } from '../ui/dom.js';
import { tweenText } from '../ui/motion.js';
import { timelineChart, highlightTimeline } from '../ui/charts.js';
import { stateChip, qualityBadge, multiplierLine, obsInterp, evidenceRow, sectionHead, emptyState, chartWidth } from '../ui/components.js';
import { videoById, allFindingStats, mainFinding, evidenceFor, channelTotals, patternWatchStats, weeks, briefFor, formatDate, formatShort, STATE_LABEL } from '../data/derive.js';
import { videos, channel } from '../data/fixtures.js';
import { openEvidence } from './evidence.js';
import { planIntervention } from './interventions.js';

export function render(_route, ctx) {
  const { range, state, navigate } = ctx;
  if (!state.connected) {
    return emptyState('No channel connected', 'The sample channel was disconnected in this demo. Reconnect it to bring the instruments back online.',
      h('a', { class: 'btn btn-primary', href: '#/onboarding' }, 'Reconnect (simulated)'));
  }
  const stats = allFindingStats(range);
  const main = mainFinding(stats);
  const totals = channelTotals(range);
  const pw = patternWatchStats(range);
  const counts = Object.fromEntries(Object.keys(STATE_LABEL).map((k) => [k, stats.filter((s) => s.state === k).length]));
  const active = state.interventions.filter((i) => i.status === 'active').length;
  const latest = briefFor(weeks()[0]);
  const ev = evidenceFor(main).slice(-3).reverse();
  const width = chartWidth();

  return h('div', { class: 'view overview' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, `Bridge · ${range.label}`), h('h1', null, channel.name)),
      h('p', { class: 'muted' }, `${formatDate(range.start)} – ${formatDate(range.end)} · ${totals.uploads} uploads in range`)),

    h('section', { class: 'hero-finding card glow-edge', 'aria-labelledby': 'mf-title' },
      h('div', { class: 'hf-top' },
        h('span', { class: 'eyebrow' }, 'Main finding'),
        stateChip(main.state), qualityBadge(main.quality)),
      h('h2', { id: 'mf-title' }, main.finding.name, ' ', multiplierLine(main)),
      obsInterp(main),
      h('div', { class: 'hf-ev' },
        h('div', { class: 'hf-ev-head' }, h('strong', null, 'Supporting evidence'), h('span', { class: 'dim' }, `${main.groupAll.length} videos · latest 3 shown`)),
        ev.map((e) => evidenceRow(e, () => openEvidence({ ...e, findingId: main.finding.id, findingName: main.finding.name })))),
      h('div', { class: 'hf-action' },
        h('div', null, h('span', { class: 'eyebrow amber' }, 'Next useful action'), h('p', null, main.finding.action)),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn btn-primary', onclick: () => planIntervention(main.finding.id) }, icon('plus', 16), 'Plan intervention'),
          h('a', { class: 'btn btn-ghost', href: `#/findings/${main.finding.id}` }, 'Open finding'),
          h('a', { class: 'btn btn-quiet', href: '#/script' }, 'Use in script')))),

    h('section', { class: 'instruments' },
      instrument('Uploads in range', totals.uploads, `${totals.long} long-form · ${totals.shorts} Shorts`),
      instrument('Reconstructed / observed', `${totals.historical} / ${totals.observed}`, 'historical estimate / since connection'),
      instrument('Findings', stats.length, `${counts.working} working · ${counts.slipping} slipping · ${counts.emerging} emerging`),
      instrument('Active interventions', active, h('a', { href: '#/interventions' }, 'Open tracker'))),

    h('section', { class: 'card' },
      sectionHead('Upload timeline', '7-day views per long-form upload',
        h('span', { class: 'legend' }, h('i', { class: 'lg hist' }), 'Historical estimate', h('i', { class: 'lg obs' }), 'Observed', h('i', { class: 'lg hi' }), main.finding.name)),
      timelineChart({ key: 'bridge', videos: videos.filter((v) => v.format === 'long' && v.date >= range.start && v.date <= range.end), range, highlight: main.finding.match, baseline: main.baselineViews, width, onSelect: (v) => navigate(`#/videos/${v.id}`) }),
      h('p', { class: 'fine dim' }, 'Select a dot to open the video. Left of the line is reconstructed after connection and may miss deleted, private or unavailable videos.')),

    h('div', { class: 'two-col' },
      h('section', { class: 'card' },
        sectionHead('All findings', 'Pattern readings', h('a', { class: 'btn btn-quiet btn-sm', href: '#/findings' }, 'View all', icon('arrow', 14))),
        h('ul', { class: 'mini-findings' }, stats.map((s) => {
          // Hovering or focusing a finding lights up its videos on the timeline above.
          const light = () => highlightTimeline(document.querySelector('.overview .chart-timeline'), (id) => s.groupAll.some((v) => v.id === id));
          const reset = () => highlightTimeline(document.querySelector('.overview .chart-timeline'), (id) => main.finding.match(videoById(id)));
          return h('li', null, h('a', { href: `#/findings/${s.finding.id}`, onpointerenter: light, onfocus: light, onpointerleave: reset, onblur: reset },
            h('span', null, s.finding.name), stateChip(s.state)));
        }))),
      h('section', { class: 'card' },
        sectionHead('Weekly brief', `${formatShort(latest.week.start)} – ${formatShort(latest.week.end)}`, h('a', { class: 'btn btn-quiet btn-sm', href: '#/brief' }, 'Read', icon('arrow', 14))),
        h('ul', { class: 'brief-teaser' },
          h('li', null, `${latest.uploads.length} upload${latest.uploads.length === 1 ? '' : 's'} published, 7-day readings for ${latest.readings.length} video${latest.readings.length === 1 ? '' : 's'}`),
          latest.changes.length ? latest.changes.map((c) => h('li', null, `${c.s.finding.name}: ${STATE_LABEL[c.from]} → ${STATE_LABEL[c.s.state]}`)) : h('li', null, 'No finding changed state'),
          h('li', null, `Pattern watch: ${pw.n} uploads share one series template in this range`)))));
}

// Numeric readouts count from their previous value when the date range changes.
const instrument = (label, value, sub) => h('div', { class: 'instrument' },
  h('span', { class: 'dim' }, label),
  typeof value === 'number' ? tweenText(h('b', { class: 'num' }), `inst:${label}`, value) : h('b', { class: 'num' }, String(value)),
  h('small', { class: 'muted' }, sub));
