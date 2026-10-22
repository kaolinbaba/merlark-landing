// demo/js/views/overview.js
// Overview as a small control panel: one clear pattern, the comparison behind it, the videos that produced it,
// and one thing to try. Everything below is supporting detail.

import { h, icon, reducedMotion } from '../ui/dom.js';
import { countUp } from '../ui/motion.js';
import { timelineChart, highlightTimeline } from '../ui/charts.js';
import { stateChip, qualityBadge, obsInterp, sectionHead, emptyState, chartWidth, thumb, barPair, playChip, calcLines, insufficientPanel } from '../ui/components.js';
import { videoById, allFindingStats, mainFinding, evidenceFor, weeks, briefFor, formatShort, formatMultiplier, STATE_LABEL } from '../data/derive.js';
import { videos, BACKFILL_LABEL } from '../data/fixtures.js';
import { openEvidence } from './evidence.js';
import { planIntervention } from './interventions.js';

export function render(_route, ctx) {
  const { range, state, navigate } = ctx;
  if (!state.connected) {
    return emptyState('Nothing here yet.', 'The sample channel is disconnected. Connect it again to see its patterns.',
      h('a', { class: 'btn btn-primary', href: '#/onboarding' }, 'Connect again (pretend)'));
  }
  const stats = allFindingStats(range);
  const main = mainFinding(stats);
  const ev = evidenceFor(main);
  const latest = briefFor(weeks()[0]);
  const open = (e) => openEvidence({ ...e, findingId: main.finding.id, findingName: main.finding.name });
  const calc = calcLines(main);

  const strip = h('div', { class: 'ev-strip', id: 'ov-videos' }, ev.slice().reverse().map((e) => h('button', { type: 'button', class: 'ev-card', 'data-video': e.video.id, onclick: () => open(e), 'aria-label': `${e.video.title}, ${e.segment.label}` },
    thumb(e.video, 168), h('span', { class: 'ev-card-title' }, e.video.title), playChip(e.segment))));
  const explain = h('div', { class: 'ov-explain', id: 'ov-explain', hidden: true },
    obsInterp(main),
    main.multiplier != null ? h('dl', { class: 'facts' },
      h('dt', null, 'This group'), h('dd', null, calc.group),
      h('dt', null, 'Your usual'), h('dd', null, calc.base),
      h('dt', null, 'Dates'), h('dd', null, `${formatShort(range.start)} – ${formatShort(range.end)}, first week of each upload`)) : null);
  const explainBtn = h('button', { class: 'btn btn-quiet btn-sm', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'ov-explain',
    onclick: () => { const on = explain.hidden; explain.hidden = !on; explainBtn.setAttribute('aria-expanded', String(on)); } }, icon('info', 16), 'How did we get this?');
  const showVideos = () => {
    strip.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
    strip.classList.remove('lit'); if (!reducedMotion()) { void strip.offsetWidth; strip.classList.add('lit'); }
  };

  return h('div', { class: 'view overview' },
    h('header', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, icon('calendar', 14), `${range.label} · ${formatShort(range.start)} – ${formatShort(range.end)}`),
        h('h1', null, 'A few things worth noticing.'), h('p', { class: 'desc' }, 'Here’s what stands out in the selected dates.'))),

    h('section', { class: 'ov-focus', 'aria-labelledby': 'mf-title' },
      h('div', { class: `tile hero-tile state-${main.state}` },
        h('div', { class: 'tile-top' }, stateChip(main.state), qualityBadge(main.quality)),
        h('h2', { id: 'mf-title' }, main.finding.name),
        main.multiplier == null ? insufficientPanel(main)
          : h('p', { class: 'readout' }, countUp(h('b', { class: 'num' }), `ov:${main.finding.id}:${range.id}`, main.multiplier, formatMultiplier, 1), h('span', null, 'your usual')),
        h('p', { class: 'tile-sub' }, main.finding.observation(main)),
        h('div', { class: 'tile-covers', 'aria-hidden': 'true' }, main.groupAll.slice(-8).map((v) => thumb(v, 54, { duration: false }))),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn btn-primary', type: 'button', onclick: showVideos }, icon('videos', 18), 'Show me the videos'),
          explainBtn)),
      h('div', { class: 'ov-side' },
        h('div', { class: 'ov-compare' },
          h('span', { class: 'label' }, icon('compare', 18), 'The numbers'),
          main.multiplier == null ? h('p', { class: 'muted' }, 'There isn’t enough to make a useful comparison yet.')
            : barPair({ group: main.groupViews, groupCalc: calc.group, base: main.baselineViews, baseCalc: calc.base }),
          h('p', { class: 'fine' }, 'First-week views. These happened together; that doesn’t show one caused the other.')),
        h('div', { class: 'try-note' },
          h('span', { class: 'label' }, icon('bulb', 18), 'Something to try'),
          h('p', { class: 'try-text' }, main.finding.action),
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => planIntervention(main.finding.id), disabled: ['insufficient', 'neutral'].includes(main.state) }, icon('plus', 16), 'Start an experiment')))),
    explain,

    h('section', { class: 'ov-videos', 'aria-label': 'The videos behind it' },
      sectionHead(null, 'The videos behind it', h('a', { class: 'btn btn-quiet btn-sm', href: `#/patterns/${main.finding.id}` }, 'Explore this pattern', icon('arrow', 16))),
      ev.length ? strip : emptyState()),

    h('section', { class: 'ov-timeline' },
      sectionHead(null, 'Every long video', h('span', { class: 'legend' }, h('i', { class: 'lg hist' }), 'Earlier history', h('i', { class: 'lg obs' }), 'Since connection', h('i', { class: 'lg hi' }), main.finding.name)),
      timelineChart({ key: 'bridge', videos: videos.filter((v) => v.format === 'long' && v.date >= range.start && v.date <= range.end), range, highlight: main.finding.match, baseline: main.baselineViews, width: chartWidth(), onSelect: (v) => navigate(`#/videos/${v.id}`) }),
      h('p', { class: 'backfill-label' }, icon('info', 14), BACKFILL_LABEL)),

    h('div', { class: 'two-col' },
      h('section', null,
        sectionHead(null, 'Other patterns', h('a', { class: 'btn btn-quiet btn-sm', href: '#/patterns' }, 'See all', icon('arrow', 16))),
        h('ul', { class: 'mini-findings' }, stats.map((s) => {
          // Pointing at a pattern lights up its videos on the timeline and in the strip.
          const tl = () => document.querySelector('.overview .chart-timeline');
          const ids = new Set(s.groupAll.map((v) => v.id));
          const light = () => { highlightTimeline(tl(), (id) => ids.has(id)); strip.querySelectorAll('.ev-card').forEach((c) => c.classList.toggle('dim-card', !ids.has(c.dataset.video))); };
          const reset = () => { highlightTimeline(tl(), (id) => main.finding.match(videoById(id))); strip.querySelectorAll('.ev-card').forEach((c) => c.classList.remove('dim-card')); };
          return h('li', null, h('a', { href: `#/patterns/${s.finding.id}`, onpointerenter: light, onfocus: light, onpointerleave: reset, onblur: reset },
            h('span', null, s.finding.name), stateChip(s.state)));
        }))),
      h('section', null,
        sectionHead(null, 'Weekly recap', h('a', { class: 'btn btn-quiet btn-sm', href: '#/recap' }, 'Read', icon('arrow', 16))),
        h('ul', { class: 'recap-teaser' },
          h('li', null, h('b', null, `${formatShort(latest.week.start)} – ${formatShort(latest.week.end)}`)),
          h('li', null, `${latest.uploads.length} new upload${latest.uploads.length === 1 ? '' : 's'}, ${latest.readings.length} first-week reading${latest.readings.length === 1 ? '' : 's'}`),
          latest.changes.length ? latest.changes.map((c) => h('li', null, `${c.s.finding.name}: ${STATE_LABEL[c.from]} → ${STATE_LABEL[c.s.state]}`)) : h('li', null, 'No pattern changed this week')))));
}
