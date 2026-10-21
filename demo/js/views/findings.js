// demo/js/views/findings.js
// Findings: tiles with a big readout, a state filter, the finding detail ("What we saw" vs "What it might mean",
// your usual, the receipts) and the separate Pattern watch panel (looks-alike only, no score).

import { h, icon } from '../ui/dom.js';
import { barChart, timelineChart, highlightTimeline } from '../ui/charts.js';
import { stateChip, qualityBadge, obsInterp, evidenceRow, sectionHead, emptyState, insufficientPanel, chartWidth, previewChip } from '../ui/components.js';
import { allFindingStats, evidenceFor, patternWatchStats, STATE_LABEL, STATE_RULES, QUALITY_HELP, formatInt, formatShort, formatTime, formatDate, formatMultiplier } from '../data/derive.js';
import { patternWatch, findings, videos } from '../data/fixtures.js';
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
    if (!s) return emptyState('Finding not found', 'That finding isn’t in the sample data.', h('a', { class: 'btn btn-primary', href: '#/findings' }, 'All findings'));
    return detail(s, ctx);
  }
  const shown = stats.filter((s) => state.findingFilter === 'all' || s.state === state.findingFilter);
  const pw = patternWatchStats(range);
  return h('div', { class: 'view' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, `Findings · ${range.label}`), h('h1', null, 'Your patterns, sorted')),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: rulesDialog }, icon('info', 14), 'How we sort them')),
    h('div', { class: 'filter-bar', role: 'group', 'aria-label': 'Filter by finding state' },
      FILTERS.map((f) => h('button', { class: `chip filter ${state.findingFilter === f ? 'on' : ''} ${f !== 'all' ? 'state-' + f : ''}`, 'aria-pressed': state.findingFilter === f, onclick: () => setState({ findingFilter: f }) },
        f === 'all' ? `All (${stats.length})` : `${STATE_LABEL[f]} (${stats.filter((s) => s.state === f).length})`))),
    shown.length
      ? h('div', { class: 'finding-grid' }, shown.map((s) => findingCard(s)))
      : emptyState('Nothing here', `No finding is “${STATE_LABEL[state.findingFilter].toLowerCase()}” in “${range.label}”. Try another range or filter.`,
        h('button', { class: 'btn btn-ghost', onclick: () => setState({ findingFilter: 'all' }) }, 'Show all findings')),
    h('section', { class: 'card pattern-watch' },
      sectionHead('Pattern watch · kept apart from performance', patternWatch.name, h('a', { class: 'btn btn-ghost btn-sm', href: '#/findings/P1' }, 'Look closer', icon('arrow', 14))),
      h('p', null, pw.n ? patternWatch.observation(pw.n) : 'No videos in this range share the series template.'),
      h('p', { class: 'fine' }, patternWatch.disclaimer)));
}

export function findingCard(s) {
  return h('a', { class: `tile finding-tile state-${s.state}`, href: `#/findings/${s.finding.id}` },
    h('div', { class: 'tile-top' }, stateChip(s.state), qualityBadge(s.quality)),
    h('h3', null, s.finding.name),
    s.multiplier == null ? h('p', { class: 'readout sm none' }, 'No comparison yet')
      : h('p', { class: 'readout sm' }, h('b', { class: 'num' }, formatMultiplier(s.multiplier)), h('span', null, 'your usual')),
    h('p', { class: 'tile-sub' }, s.finding.observation(s)));
}

function rulesDialog() {
  dialog({
    label: 'How it works',
    title: 'How findings get their colour',
    body: h('div', { class: 'prose' },
      h('p', null, 'The colour shows how a pattern is doing on this channel, compared with your own usual. It’s a link, not a cause, and it’s kept apart from Pattern watch.'),
      h('ul', { class: 'rules' }, STATE_RULES.map((r) => h('li', null, h('span', { class: `chip state state-${r.state}` }, h('i', { class: 'lamp' }), STATE_LABEL[r.state]), h('span', null, r.rule)))),
      h('p', null, '“Your usual” is the middle value of first-week views across your other videos of the same kind in the chosen range. Rules are checked top to bottom.'),
      h('h3', null, 'How strong the evidence is'),
      h('ul', null, Object.entries(QUALITY_HELP).map(([k, v]) => h('li', null, h('strong', null, `${k}: `), v)))),
    actions: [{ label: 'Got it', variant: 'btn-primary' }],
  });
}

function detail(s, ctx) {
  const f = s.finding;
  const ev = evidenceFor(s);
  const w = chartWidth(window.innerWidth >= 1180 ? 0.5 : 1);
  return h('div', { class: 'view finding-detail' },
    h('a', { class: 'back', href: '#/findings' }, icon('back', 14), 'All findings'),
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, `${f.id} · ${ctx.range.label}`), h('h1', null, f.name)),
      h('div', { class: 'chips' }, stateChip(s.state), qualityBadge(s.quality))),
    s.multiplier != null ? h('p', { class: `readout big-readout state-${s.state}` }, h('b', { class: 'num' }, formatMultiplier(s.multiplier)), h('span', null, 'your usual')) : null,
    s.state === 'insufficient' ? insufficientPanel(s) : null,
    obsInterp(s),
    h('div', { class: 'two-col' },
      h('section', { class: 'card' },
        sectionHead('Compared with your usual', s.multiplier == null ? 'No comparison yet' : 'Views in week one'),
        s.multiplier == null
          ? h('p', { class: 'muted' }, 'Merlark waits until there are at least 3 matching videos and 3 others with a first-week reading.')
          : [barChart({ key: `fd-${f.id}-views`, width: w, rows: [
            { id: 'group', label: f.name, note: `${s.n} videos`, value: s.groupViews, display: formatInt(s.groupViews), tone: 'accent' },
            { id: 'baseline', label: 'Your usual', note: `${s.nBaseline} other videos`, value: s.baselineViews, display: formatInt(s.baselineViews), tone: 'base' },
          ] }),
          s.retGroup != null ? barChart({ key: `fd-${f.id}-ret`, width: w, max: 100, rows: [
            { id: 'group', label: 'Still watching at 0:30', note: f.name, value: s.retGroup, display: `${s.retGroup}%`, tone: 'accent' },
            { id: 'baseline', label: 'Still watching at 0:30', note: 'your usual', value: s.retBase, display: `${s.retBase}%`, tone: 'base' },
          ] }) : null,
          h('p', { class: 'fine' }, 'Week-one views: the group’s average against your usual. A link, not proof of cause. These videos may differ in other ways too.')]),
      h('section', { class: 'card next-action' },
        sectionHead('Try next', 'One small experiment'),
        h('p', { class: 'lead' }, f.action),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn btn-primary', type: 'button', onclick: () => planIntervention(f.id), disabled: s.state === 'insufficient' || s.state === 'neutral' }, icon('plus', 16), 'Plan an experiment'),
          h('a', { class: 'btn btn-ghost', href: `#/compare?group=${f.id}`, onclick: () => setState((st) => ({ compare: { ...st.compare, mode: 'group', group: f.id } })) }, 'Compare'),
          h('a', { class: 'btn btn-quiet', href: '#/script' }, 'Use in a script')),
        s.state === 'insufficient' || s.state === 'neutral' ? h('p', { class: 'fine' }, 'Experiments open up once a finding has a clear reading.') : null,
        h('dl', { class: 'facts' },
          h('dt', null, 'First spotted'), h('dd', null, formatDate(s.firstSeen)),
          h('dt', null, 'Videos with it'), h('dd', null, `${s.groupAll.length} in range${s.pending.length ? `, ${s.pending.length} still in week one` : ''}`),
          h('dt', null, 'Period'), h('dd', null, `${formatShort(ctx.range.start)} – ${formatShort(ctx.range.end)}, first week of each upload`)))),
    h('section', { class: 'card evidence-card' },
      sectionHead('The receipts', `${ev.length} videos, each with the exact seconds`),
      ev.length ? timelineChart({ key: `fd-${f.id}-tl`, height: 170, width: chartWidth(), range: ctx.range,
        videos: videos.filter((v) => (f.scope === 'short' ? v.format === 'short' : v.format === 'long') && v.date >= ctx.range.start && v.date <= ctx.range.end),
        highlight: (v) => s.groupAll.includes(v), baseline: s.baselineViews || null,
        onSelect: (v) => { const e = ev.find((x) => x.video.id === v.id); if (e) openEvidence({ ...e, findingId: f.id, findingName: f.name }); else ctx.navigate(`#/videos/${v.id}`); } }) : null,
      ev.length ? h('div', { class: 'ev-list illuminate' }, ev.slice().reverse().map((e, i) => {
        // Pointing at a source isolates its dot on the timeline.
        const row = evidenceRow(e, () => openEvidence({ ...e, findingId: f.id, findingName: f.name }));
        row.style.setProperty('--i', i);
        const tl = () => document.querySelector('.evidence-card .chart-timeline');
        const on = () => highlightTimeline(tl(), (id) => s.groupAll.some((v) => v.id === id), e.video.id);
        const off = () => highlightTimeline(tl(), (id) => s.groupAll.some((v) => v.id === id));
        row.addEventListener('pointerenter', on); row.addEventListener('focus', on);
        row.addEventListener('pointerleave', off); row.addEventListener('blur', off);
        return row;
      }))
        : emptyState('No receipts in this range', 'No videos in this range show this pattern.')),
    otherFindings(f.id));
}

function otherFindings(id) {
  return h('nav', { class: 'pager', 'aria-label': 'Other findings' },
    findings.filter((f) => f.id !== id).map((f) => h('a', { class: 'chip', href: `#/findings/${f.id}` }, f.name)),
    h('a', { class: 'chip', href: '#/findings/P1' }, 'Pattern watch'));
}

function patternWatchView(range) {
  const pw = patternWatchStats(range);
  return h('div', { class: 'view' },
    h('a', { class: 'back', href: '#/findings' }, icon('back', 14), 'All findings'),
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, `Pattern watch · ${range.label}`), h('h1', null, patternWatch.name)),
      previewChip('No score, no rating')),
    h('div', { class: 'oi' },
      h('div', { class: 'oi-block obs' }, h('span', { class: 'oi-tag' }, icon('eye', 14), 'What we saw'), h('p', null, pw.n ? patternWatch.observation(pw.n) : 'No videos in this range share the series template.')),
      h('div', { class: 'oi-block policy' }, h('span', { class: 'oi-tag' }, icon('info', 14), 'What YouTube’s policy says · our summary'),
        h('p', null, patternWatch.policyContext, ' ', h('a', { href: patternWatch.policyUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Read YouTube’s policy')))),
    h('p', { class: 'notice' }, patternWatch.disclaimer),
    h('section', { class: 'card' },
      sectionHead('The receipts', `${pw.n} videos · the parts that match`),
      pw.n ? h('div', { class: 'ev-list' }, pw.videos.flatMap((v) => patternWatch.segments(v).map((seg) =>
        evidenceRow({ video: v, segment: seg }, () => openEvidence({ video: v, segment: seg, findingId: 'P1', findingName: patternWatch.name })))))
        : emptyState('Nothing to look at', 'Pick a wider date range to see the series videos.')),
    h('p', { class: 'fine' }, `Timestamps like ${formatTime(0)}–${formatTime(21)} mark where the shared title card and music play.`));
}
