// demo/js/views/findings.js
// Findings list with state filter, finding detail (observation vs interpretation, baseline, evidence),
// and the separate Pattern watch panel (structural resemblance, no score).

import { h, icon } from '../ui/dom.js';
import { barChart, timelineChart, highlightTimeline } from '../ui/charts.js';
import { stateChip, qualityBadge, multiplierLine, obsInterp, evidenceRow, sectionHead, emptyState, insufficientPanel, chartWidth, previewChip } from '../ui/components.js';
import { allFindingStats, evidenceFor, patternWatchStats, STATE_LABEL, STATE_RULES, QUALITY_HELP, formatInt, formatShort, formatTime, formatDate } from '../data/derive.js';
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
    if (!s) return emptyState('Finding not found', 'This finding does not exist in the sample data.', h('a', { class: 'btn btn-primary', href: '#/findings' }, 'All findings'));
    return detail(s, ctx);
  }
  const shown = stats.filter((s) => state.findingFilter === 'all' || s.state === state.findingFilter);
  const pw = patternWatchStats(range);
  return h('div', { class: 'view' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, `Findings · ${range.label}`), h('h1', null, 'What the channel’s patterns show')),
      h('button', { class: 'btn btn-quiet btn-sm', onclick: rulesDialog }, icon('info', 14), 'How states are assigned')),
    h('div', { class: 'filter-bar', role: 'group', 'aria-label': 'Filter by finding state' },
      FILTERS.map((f) => h('button', { class: `chip filter ${state.findingFilter === f ? 'on' : ''} ${f !== 'all' ? 'state-' + f : ''}`, 'aria-pressed': state.findingFilter === f, onclick: () => setState({ findingFilter: f }) },
        f === 'all' ? `All (${stats.length})` : `${STATE_LABEL[f]} (${stats.filter((s) => s.state === f).length})`))),
    shown.length
      ? h('div', { class: 'finding-grid' }, shown.map((s) => findingCard(s)))
      : emptyState('No findings in this state', `Nothing is ${STATE_LABEL[state.findingFilter].toLowerCase()} in “${range.label}”. Try another range or state.`,
        h('button', { class: 'btn btn-ghost', onclick: () => setState({ findingFilter: 'all' }) }, 'Show all findings')),
    h('section', { class: 'card pattern-watch' },
      sectionHead('Pattern watch · separate from performance', patternWatch.name, h('a', { class: 'btn btn-ghost btn-sm', href: '#/findings/P1' }, 'Inspect', icon('arrow', 14))),
      h('p', null, pw.n ? patternWatch.observation(pw.n) : 'No uploads in this range share the series template.'),
      h('p', { class: 'fine dim' }, patternWatch.disclaimer)));
}

export function findingCard(s) {
  return h('a', { class: `finding-card state-${s.state}`, href: `#/findings/${s.finding.id}` },
    h('div', { class: 'fc-top' }, stateChip(s.state), h('span', { class: 'dim num' }, s.finding.id)),
    h('h3', null, s.finding.name),
    h('p', { class: 'muted' }, s.finding.observation(s)),
    h('div', { class: 'fc-foot' }, multiplierLine(s), qualityBadge(s.quality)));
}

function rulesDialog() {
  dialog({
    label: 'Method',
    title: 'How finding states are assigned',
    body: h('div', { class: 'prose' },
      h('p', null, 'States describe a performance trend on this channel only. They are association, not cause, and they are separate from Pattern watch.'),
      h('ul', { class: 'rules' }, STATE_RULES.map((r) => h('li', null, h('span', { class: `chip state state-${r.state}` }, h('i', { class: 'lamp' }), STATE_LABEL[r.state]), h('span', null, r.rule)))),
      h('p', null, 'The channel baseline is the median 7-day views of the channel’s other uploads of the same format in the selected range. Rules are checked top to bottom.'),
      h('h3', null, 'Evidence quality'),
      h('ul', null, Object.entries(QUALITY_HELP).map(([k, v]) => h('li', null, h('strong', null, `${k}: `), v)))),
    actions: [{ label: 'Close', variant: 'btn-primary' }],
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
    s.state === 'insufficient' ? insufficientPanel(s) : null,
    obsInterp(s),
    h('div', { class: 'two-col' },
      h('section', { class: 'card' },
        sectionHead('Comparable baseline · same channel', s.multiplier == null ? 'No comparison yet' : h('span', null, multiplierLine(s))),
        s.multiplier == null
          ? h('p', { class: 'muted' }, 'Merlark draws no comparison until there are at least 3 matching and 3 baseline videos with a 7-day reading.')
          : [barChart({ key: `fd-${f.id}-views`, width: w, rows: [
            { id: 'group', label: f.name, note: `n = ${s.n}`, value: s.groupViews, display: formatInt(s.groupViews), tone: 'accent' },
            { id: 'baseline', label: 'Channel baseline', note: `median of ${s.nBaseline}`, value: s.baselineViews, display: formatInt(s.baselineViews), tone: 'base' },
          ] }),
          s.retGroup != null ? barChart({ key: `fd-${f.id}-ret`, width: w, max: 100, rows: [
            { id: 'group', label: 'Still watching at 0:30', note: f.name, value: s.retGroup, display: `${s.retGroup}%`, tone: 'accent' },
            { id: 'baseline', label: 'Still watching at 0:30', note: 'baseline', value: s.retBase, display: `${s.retBase}%`, tone: 'base' },
          ] }) : null,
          h('p', { class: 'fine dim' }, '7-day views (mean of the group, median of the baseline). Association only: these videos may differ in other ways too.')]),
      h('section', { class: 'card next-action' },
        sectionHead('Next useful action', 'What you could try'),
        h('p', { class: 'lead' }, f.action),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn btn-primary', onclick: () => planIntervention(f.id), disabled: s.state === 'insufficient' || s.state === 'neutral' }, icon('plus', 16), 'Plan intervention'),
          h('a', { class: 'btn btn-ghost', href: `#/compare?group=${f.id}`, onclick: () => setState((st) => ({ compare: { ...st.compare, mode: 'group', group: f.id } })) }, 'Compare group'),
          h('a', { class: 'btn btn-quiet', href: '#/script' }, 'Use in script')),
        s.state === 'insufficient' || s.state === 'neutral' ? h('p', { class: 'fine dim' }, 'Interventions are offered only for findings with a clear reading.') : null,
        h('dl', { class: 'facts' },
          h('dt', null, 'First seen'), h('dd', null, formatDate(s.firstSeen)),
          h('dt', null, 'Videos with this pattern'), h('dd', null, `${s.groupAll.length} in range${s.pending.length ? `, ${s.pending.length} awaiting a reading` : ''}`),
          h('dt', null, 'Relevant period'), h('dd', null, `${formatShort(ctx.range.start)} – ${formatShort(ctx.range.end)}, first 7 days of each upload`)))),
    h('section', { class: 'card evidence-card' },
      sectionHead('Evidence', `${ev.length} videos with timestamps`),
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
        : emptyState('No evidence in this range', 'No uploads in the selected range show this pattern.')),
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
      previewChip('No score · no category')),
    h('div', { class: 'oi' },
      h('div', { class: 'oi-block obs' }, h('span', { class: 'oi-tag' }, icon('eye', 14), 'Merlark observation'), h('p', null, pw.n ? patternWatch.observation(pw.n) : 'No uploads in this range share the series template.')),
      h('div', { class: 'oi-block policy' }, h('span', { class: 'oi-tag' }, icon('info', 14), 'Published policy context · paraphrase'),
        h('p', null, patternWatch.policyContext, ' ', h('a', { href: patternWatch.policyUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Read YouTube’s policy')))),
    h('p', { class: 'notice' }, patternWatch.disclaimer),
    h('section', { class: 'card' },
      sectionHead('Evidence', `${pw.n} videos · shared segments`),
      pw.n ? h('div', { class: 'ev-list' }, pw.videos.flatMap((v) => patternWatch.segments(v).map((seg) =>
        evidenceRow({ video: v, segment: seg }, () => openEvidence({ video: v, segment: seg, findingId: 'P1', findingName: patternWatch.name })))))
        : emptyState('Nothing to inspect', 'Choose a wider date range to see the series uploads.')),
    h('p', { class: 'fine dim' }, `Timestamps such as ${formatTime(0)}–${formatTime(21)} mark where the shared title card and music bed appear.`));
}
