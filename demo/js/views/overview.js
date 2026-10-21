// demo/js/views/overview.js
// Overview as a control panel: the main finding as a big tile, its evidence as a strip of play-chips,
// the comparison as two bars, and one "Try next" card. Everything else sits in smaller panels below.

import { h, icon } from '../ui/dom.js';
import { countUp } from '../ui/motion.js';
import { timelineChart, highlightTimeline } from '../ui/charts.js';
import { stateChip, qualityBadge, obsInterp, sectionHead, emptyState, chartWidth, thumb, barPair, playChip } from '../ui/components.js';
import { videoById, allFindingStats, mainFinding, evidenceFor, channelTotals, patternWatchStats, weeks, briefFor, formatShort, formatMultiplier, STATE_LABEL } from '../data/derive.js';
import { videos, BACKFILL_LABEL } from '../data/fixtures.js';
import { openEvidence } from './evidence.js';
import { planIntervention } from './interventions.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n) => WORDS[n] || String(n);

export function render(_route, ctx) {
  const { range, state, navigate } = ctx;
  if (!state.connected) {
    return emptyState('No channel connected', 'You disconnected the sample channel. Connect it again to see its findings.',
      h('a', { class: 'btn btn-primary', href: '#/onboarding' }, 'Connect again (pretend)'));
  }
  const stats = allFindingStats(range);
  const main = mainFinding(stats);
  const totals = channelTotals(range);
  const pw = patternWatchStats(range);
  const counts = Object.fromEntries(Object.keys(STATE_LABEL).map((k) => [k, stats.filter((s) => s.state === k).length]));
  const active = state.interventions.filter((i) => i.status === 'active').length;
  const latest = briefFor(weeks()[0]);
  const ev = evidenceFor(main);
  const open = (e) => openEvidence({ ...e, findingId: main.finding.id, findingName: main.finding.name });
  const other = main.finding.scope === 'short' ? 'Shorts' : 'videos';

  return h('div', { class: 'view overview' },
    h('header', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, range.label), h('h1', null, 'Here’s what stands out')),
      h('p', { class: 'dim' }, `${totals.uploads} uploads in this range`)),

    h('section', { class: 'ov-grid' },
      // 1 · the hero finding tile
      h('a', { class: `tile hero-tile state-${main.state}`, href: `#/findings/${main.finding.id}`, 'aria-labelledby': 'mf-title' },
        h('div', { class: 'tile-top' }, stateChip(main.state), qualityBadge(main.quality)),
        h('h2', { id: 'mf-title' }, main.finding.name),
        main.multiplier == null ? h('p', { class: 'readout none' }, 'No comparison yet')
          : h('p', { class: 'readout' }, countUp(h('b', { class: 'num' }), `ov:${main.finding.id}:${range.id}`, main.multiplier, formatMultiplier, 1), h('span', null, 'your usual')),
        h('p', { class: 'tile-sub' }, `Shared by ${count(main.groupAll.length)} of your ${other}:`),
        h('div', { class: 'tile-covers', 'aria-hidden': 'true' }, main.groupAll.slice(-8).map((v) => thumb(v, 72, { duration: false }))),
        h('span', { class: 'tile-go' }, 'See the receipts', icon('arrow', 16))),

      // 2 · the comparison
      h('div', { class: 'panel ov-compare' },
        h('span', { class: 'eyebrow' }, 'Compared with your usual'),
        h('h3', null, 'Views in week one'),
        main.multiplier == null ? h('p', { class: 'muted' }, 'Not enough similar videos in this range to compare yet.')
          : barPair({ group: main.groupViews, groupLabel: `${main.finding.name} · avg of ${main.n}`, base: main.baselineViews, baseLabel: `Your usual · ${main.nBaseline} others` }),
        h('p', { class: 'fine' }, 'A link, not proof of cause. These videos may differ in other ways too.')),

      // 3 · try next
      h('div', { class: 'panel try-card' },
        h('span', { class: 'eyebrow' }, 'Try next'),
        h('p', { class: 'try-text' }, main.finding.action),
        h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => planIntervention(main.finding.id) }, icon('plus', 16), 'Plan an experiment'))),

    // 4 · evidence strip
    h('section', { class: 'panel ev-strip-panel' },
      sectionHead('The receipts', `${ev.length} videos, each with the exact seconds`, h('a', { class: 'btn btn-quiet btn-sm', href: `#/findings/${main.finding.id}` }, 'All of them', icon('arrow', 14))),
      h('div', { class: 'ev-strip' }, ev.slice().reverse().map((e) => h('button', { type: 'button', class: 'ev-card', onclick: () => open(e), 'aria-label': `${e.video.title}, ${e.segment.label}` },
        thumb(e.video, 168), h('span', { class: 'ev-card-title' }, e.video.title), playChip(e.segment))))),

    h('details', { class: 'panel ov-details' }, h('summary', null, 'How we got this number'), obsInterp(main, { compact: true })),

    h('section', { class: 'readouts' },
      readout('Uploads', totals.uploads, `${totals.long} long · ${totals.shorts} Shorts`, 'sky'),
      readout('Rebuilt from history', totals.historical, 'historical estimate', 'lilac'),
      readout('Seen since you connected', totals.observed, 'observed by Merlark', 'sky'),
      readout('Experiments running', active, h('a', { href: '#/experiments' }, 'Open'), 'butter')),

    h('section', { class: 'panel' },
      sectionHead('Every long video', 'Views in week one', h('span', { class: 'legend' }, h('i', { class: 'lg hist' }), 'Historical estimate', h('i', { class: 'lg obs' }), 'Observed', h('i', { class: 'lg hi' }), main.finding.name)),
      timelineChart({ key: 'bridge', videos: videos.filter((v) => v.format === 'long' && v.date >= range.start && v.date <= range.end), range, highlight: main.finding.match, baseline: main.baselineViews, width: chartWidth(), onSelect: (v) => navigate(`#/videos/${v.id}`) }),
      h('p', { class: 'backfill-label' }, icon('info', 14), BACKFILL_LABEL),
      h('p', { class: 'fine' }, 'Tap a dot to open the video. Left of the dashed line is the historical estimate; right of it is what Merlark observed after you connected.')),

    h('div', { class: 'two-col' },
      h('section', { class: 'panel' },
        sectionHead('All findings', `${counts.working} working · ${counts.slipping} slipping · ${counts.emerging} emerging`, h('a', { class: 'btn btn-quiet btn-sm', href: '#/findings' }, 'Open', icon('arrow', 14))),
        h('ul', { class: 'mini-findings' }, stats.map((s) => {
          // Pointing at a finding lights up its videos on the timeline above.
          const tl = () => document.querySelector('.overview .chart-timeline');
          const light = () => highlightTimeline(tl(), (id) => s.groupAll.some((v) => v.id === id));
          const reset = () => highlightTimeline(tl(), (id) => main.finding.match(videoById(id)));
          return h('li', null, h('a', { href: `#/findings/${s.finding.id}`, onpointerenter: light, onfocus: light, onpointerleave: reset, onblur: reset },
            h('span', null, s.finding.name), stateChip(s.state)));
        }))),
      h('section', { class: 'panel' },
        sectionHead('Weekly brief', `${formatShort(latest.week.start)} – ${formatShort(latest.week.end)}`, h('a', { class: 'btn btn-quiet btn-sm', href: '#/brief' }, 'Read', icon('arrow', 14))),
        h('ul', { class: 'brief-teaser' },
          h('li', null, `${latest.uploads.length} new upload${latest.uploads.length === 1 ? '' : 's'}, ${latest.readings.length} first-week reading${latest.readings.length === 1 ? '' : 's'}`),
          latest.changes.length ? latest.changes.map((c) => h('li', null, `${c.s.finding.name}: ${STATE_LABEL[c.from]} → ${STATE_LABEL[c.s.state]}`)) : h('li', null, 'No finding changed this week'),
          h('li', null, `Pattern watch: ${pw.n} videos share one series template`)))));
}

const readout = (label, value, sub, tone) => h('div', { class: `readout-tile t-${tone}` },
  h('span', { class: 'rt-label' }, label),
  countUp(h('b', { class: 'num' }), `ro:${label}`, value),
  h('small', null, sub));

