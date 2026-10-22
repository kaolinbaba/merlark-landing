// demo/js/views/findings.js
// Patterns: tiles with a readout, a state filter, the pattern detail ("The numbers" apart from
// "One possible explanation", the comparison, the videos behind it) and the separate Pattern watch panel.

import { h, icon } from '../ui/dom.js';
import { barChart, timelineChart, highlightTimeline } from '../ui/charts.js';
import { stateChip, qualityBadge, obsInterp, evidenceRow, sectionHead, emptyState, insufficientPanel, chartWidth, previewChip, calcLines } from '../ui/components.js';
import { allFindingStats, evidenceFor, patternWatchStats, provenanceOf, STATE_LABEL, STATE_RULES, QUALITY_HELP, QUALITY_LABEL, formatInt, formatShort, formatTime, formatDate, formatMultiplier } from '../data/derive.js';
import { patternWatch, findings, videos, BACKFILL_LABEL } from '../data/fixtures.js';
import { setState } from '../state.js';
import { openEvidence } from './evidence.js';
import { planIntervention } from './interventions.js';
import { dialog } from '../ui/overlay.js';

const FILTERS = ['all', 'working', 'slipping', 'neutral', 'emerging', 'insufficient'];

export function render({ params }, ctx) {
  const { range, state } = ctx;
  const stats = allFindingStats(range);
  if (params[0] === 'P1') return patternWatchView(range);
  if (params[0]) {
    const s = stats.find((x) => x.finding.id === params[0]);
    if (!s) return emptyState('Nothing here yet.', 'That pattern isn’t in the sample data.', h('a', { class: 'btn btn-primary', href: '#/patterns' }, 'All patterns'));
    return detail(s, ctx);
  }
  const shown = stats.filter((s) => state.findingFilter === 'all' || s.state === state.findingFilter);
  const pw = patternWatchStats(range);
  return h('div', { class: 'view' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, range.label), h('h1', null, 'What’s showing up?'), h('p', { class: 'desc' }, 'Follow a pattern, then take a closer look.')),
      h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: rulesDialog }, icon('info', 16), 'How labels are chosen')),
    h('div', { class: 'filter-bar', role: 'group', 'aria-label': 'Filter by status' },
      FILTERS.map((f) => h('button', { class: `chip filter ${state.findingFilter === f ? 'on' : ''} ${f !== 'all' ? 'state-' + f : ''}`, 'aria-pressed': String(state.findingFilter === f), onclick: () => setState({ findingFilter: f }) },
        f === 'all' ? `All (${stats.length})` : `${STATE_LABEL[f]} (${stats.filter((s) => s.state === f).length})`))),
    shown.length
      ? h('div', { class: 'finding-grid' }, shown.map((s) => findingCard(s)))
      : emptyState('Nothing here yet.', 'Try a wider date range or choose another label.',
        h('button', { class: 'btn btn-ghost', onclick: () => setState({ findingFilter: 'all' }) }, 'Show all patterns')),
    h('section', { class: 'pattern-watch' },
      sectionHead('Pattern watch · kept apart from performance', patternWatch.name, h('a', { class: 'btn btn-ghost btn-sm', href: '#/patterns/P1' }, 'Take a closer look', icon('arrow', 16))),
      h('p', null, pw.n ? patternWatch.observation(pw.n) : 'No videos in these dates share the series template.'),
      h('p', { class: 'fine' }, patternWatch.disclaimer)));
}

export function findingCard(s) {
  return h('a', { class: `tile finding-tile state-${s.state}`, href: `#/patterns/${s.finding.id}` },
    h('div', { class: 'tile-top' }, stateChip(s.state), qualityBadge(s.quality)),
    h('h3', null, s.finding.name),
    s.multiplier == null ? h('p', { class: 'readout sm none' }, 'No comparison yet')
      : h('p', { class: 'readout sm' }, h('b', { class: 'num' }, formatMultiplier(s.multiplier)), h('span', null, 'your usual')),
    h('p', { class: 'tile-sub' }, s.finding.observation(s)),
    h('span', { class: 'tile-go' }, 'Explore this pattern', icon('arrow', 16)));
}

function rulesDialog() {
  dialog({
    label: 'How it works',
    title: 'How labels are chosen',
    body: h('div', { class: 'prose' },
      h('p', null, 'The label shows how a pattern is doing on this channel, compared with its own usual. It describes things that happened together, not a cause.'),
      h('ul', { class: 'rules' }, STATE_RULES.map((r) => h('li', null, stateChip(r.state), h('span', null, r.rule)))),
      h('p', null, '“Your usual” is the median first-week views of your other videos of the same kind in the selected dates. “This group” is the average for the videos with the pattern. Rules are checked top to bottom.'),
      h('h3', null, 'How well the videos back it up'),
      h('p', null, 'Support is a separate question from the label.'),
      h('ul', null, Object.entries(QUALITY_HELP).map(([k, v]) => h('li', null, h('strong', null, `${QUALITY_LABEL[k]}: `), v)))),
    actions: [{ label: 'Got it', variant: 'btn-primary' }],
  });
}

function detail(s, ctx) {
  const f = s.finding;
  const ev = evidenceFor(s);
  const w = chartWidth(window.innerWidth >= 1180 ? 0.5 : 1);
  const calc = calcLines(s);
  return h('div', { class: 'view finding-detail' },
    h('a', { class: 'back', href: '#/patterns' }, icon('back', 16), 'All patterns'),
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, `${ctx.range.label} · ${formatShort(ctx.range.start)} – ${formatShort(ctx.range.end)}`), h('h1', null, f.name)),
      h('div', { class: 'chips' }, stateChip(s.state), qualityBadge(s.quality))),
    s.multiplier != null ? h('p', { class: `readout big-readout state-${s.state}` }, h('b', { class: 'num' }, formatMultiplier(s.multiplier)), h('span', null, 'your usual')) : null,
    s.state === 'insufficient' ? insufficientPanel(s) : null,
    obsInterp(s),
    h('div', { class: 'two-col' },
      h('section', null,
        sectionHead(null, 'The numbers'),
        s.multiplier == null
          ? h('p', { class: 'muted' }, 'There isn’t enough to make a useful comparison yet. Merlark waits for 3 videos with the pattern and 3 others, each with a first-week reading.')
          : [barChart({ key: `fd-${f.id}-views`, width: w, rows: [
            { id: 'group', label: 'This group', note: `average of ${s.n} videos`, value: s.groupViews, display: formatInt(s.groupViews), tone: 'accent' },
            { id: 'baseline', label: 'Your usual', note: `median of ${s.nBaseline} other videos`, value: s.baselineViews, display: formatInt(s.baselineViews), tone: 'base' },
          ] }),
          s.retGroup != null ? barChart({ key: `fd-${f.id}-ret`, width: w, max: 100, rows: [
            { id: 'group', label: 'This group', note: 'still watching at 0:30', value: s.retGroup, display: `${s.retGroup}%`, tone: 'accent' },
            { id: 'baseline', label: 'Your usual', note: 'still watching at 0:30', value: s.retBase, display: `${s.retBase}%`, tone: 'base' },
          ] }) : null,
          h('dl', { class: 'facts' }, h('dt', null, 'This group'), h('dd', null, calc.group), h('dt', null, 'Your usual'), h('dd', null, calc.base)),
          h('p', { class: 'fine' }, 'These happened together. That doesn’t show one caused the other; these videos may differ in other ways too.')]),
      h('section', { class: 'try-note' },
        h('span', { class: 'label' }, icon('bulb', 18), 'Something to try'),
        h('p', { class: 'try-text' }, f.action),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => planIntervention(f.id), disabled: s.state === 'insufficient' || s.state === 'neutral' }, icon('plus', 16), 'Start an experiment'),
          h('a', { class: 'btn btn-ghost btn-sm', href: `#/compare?group=${f.id}`, onclick: () => setState((st) => ({ compare: { ...st.compare, mode: 'group', group: f.id } })) }, 'Compare'),
          h('a', { class: 'btn btn-quiet btn-sm', href: '#/drafts' }, 'Use in a draft')),
        s.state === 'insufficient' || s.state === 'neutral' ? h('p', { class: 'fine' }, 'Experiments open up once a pattern has a clear label.') : null,
        h('dl', { class: 'facts' },
          h('dt', null, 'First spotted'), h('dd', null, formatDate(s.firstSeen)),
          h('dt', null, 'Videos with it'), h('dd', null, `${s.groupAll.length} in these dates${s.pending.length ? `, ${s.pending.length} still in week one` : ''}`)))),
    h('section', { class: 'evidence-card' },
      sectionHead(null, 'The videos behind it', h('span', { class: 'dim small' }, `${ev.length} videos, each with the exact moment`)),
      ev.length ? timelineChart({ key: `fd-${f.id}-tl`, height: 170, width: chartWidth(), range: ctx.range,
        videos: videos.filter((v) => (f.scope === 'short' ? v.format === 'short' : v.format === 'long') && v.date >= ctx.range.start && v.date <= ctx.range.end),
        highlight: (v) => s.groupAll.includes(v), baseline: s.baselineViews || null,
        onSelect: (v) => { const e = ev.find((x) => x.video.id === v.id); if (e) openEvidence({ ...e, findingId: f.id, findingName: f.name }); else ctx.navigate(`#/videos/${v.id}`); } }) : null,
      ev.some((e) => provenanceOf(e.video) === 'historical') ? h('p', { class: 'backfill-label' }, icon('info', 14), BACKFILL_LABEL) : null,
      ev.length ? h('div', { class: 'ev-list' }, ev.slice().reverse().map((e) => {
        // Pointing at a video isolates its dot on the timeline.
        const row = evidenceRow(e, () => openEvidence({ ...e, findingId: f.id, findingName: f.name }));
        const tl = () => document.querySelector('.evidence-card .chart-timeline');
        const on = () => highlightTimeline(tl(), (id) => s.groupAll.some((v) => v.id === id), e.video.id);
        const off = () => highlightTimeline(tl(), (id) => s.groupAll.some((v) => v.id === id));
        row.addEventListener('pointerenter', on); row.addEventListener('focus', on);
        row.addEventListener('pointerleave', off); row.addEventListener('blur', off);
        return row;
      })) : emptyState()),
    otherFindings(f.id));
}

function otherFindings(id) {
  return h('nav', { class: 'chips', 'aria-label': 'Other patterns' },
    findings.filter((f) => f.id !== id).map((f) => h('a', { class: 'chip', href: `#/patterns/${f.id}` }, f.name)),
    h('a', { class: 'chip', href: '#/patterns/P1' }, 'Pattern watch'));
}

function patternWatchView(range) {
  const pw = patternWatchStats(range);
  return h('div', { class: 'view' },
    h('a', { class: 'back', href: '#/patterns' }, icon('back', 16), 'All patterns'),
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, `Pattern watch · ${range.label}`), h('h1', null, patternWatch.name)),
      previewChip('No score, no rating')),
    h('div', { class: 'oi' },
      h('div', { class: 'oi-block obs' }, h('span', { class: 'oi-tag' }, icon('eye', 14), 'The numbers'), h('p', null, pw.n ? patternWatch.observation(pw.n) : 'No videos in these dates share the series template.')),
      h('div', { class: 'oi-block policy' }, h('span', { class: 'oi-tag' }, icon('info', 14), 'What YouTube’s policy says · our summary'),
        h('p', null, patternWatch.policyContext, ' ', h('a', { href: patternWatch.policyUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Read YouTube’s policy')))),
    h('p', { class: 'notice' }, icon('info', 16), h('span', null, patternWatch.disclaimer)),
    h('section', null,
      sectionHead(null, 'The videos behind it', h('span', { class: 'dim small' }, `${pw.n} videos · the parts that match`)),
      pw.videos.some((v) => provenanceOf(v) === 'historical') ? h('p', { class: 'backfill-label' }, icon('info', 14), BACKFILL_LABEL) : null,
      pw.n ? h('div', { class: 'ev-list' }, pw.videos.flatMap((v) => patternWatch.segments(v).map((seg) =>
        evidenceRow({ video: v, segment: seg }, () => openEvidence({ video: v, segment: seg, findingId: 'P1', findingName: patternWatch.name })))))
        : emptyState()),
    h('p', { class: 'fine' }, `Timestamps like ${formatTime(0)}–${formatTime(21)} mark where the shared title card and music play.`));
}
