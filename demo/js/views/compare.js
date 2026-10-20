// demo/js/views/compare.js
// Simple, channel-relative comparisons: up to four videos, or one finding's group against the baseline.

import { h, icon } from '../ui/dom.js';
import { barChart, retentionChart } from '../ui/charts.js';
import { sectionHead, emptyState, chartWidth, provChip, thumb, stateChip } from '../ui/components.js';
import { videoById, hasReading, TODAY, formatInt, formatShort, retentionCurve, findingStats, formatMultiplier } from '../data/derive.js';
import { videos, findings } from '../data/fixtures.js';
import { setState } from '../state.js';

const TONES = ['accent', 'violet', 'amber', 'base'];

export function render({ query }, ctx) {
  const { state, range } = ctx;
  const qGroup = query.get('group');
  const cmp = qGroup && findings.some((f) => f.id === qGroup) ? { ...state.compare, mode: 'group', group: qGroup } : state.compare;
  const setCmp = (patch) => { if (qGroup) history.replaceState(null, '', '#/compare'); setState({ compare: { ...cmp, ...patch } }); };
  return h('div', { class: 'view' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, 'Decide'), h('h1', null, 'Compare')),
      h('div', { class: 'seg-toggle', role: 'tablist', 'aria-label': 'Comparison mode' },
        [['videos', 'Videos'], ['group', 'Finding group vs baseline']].map(([id, label]) =>
          h('button', { role: 'tab', 'aria-selected': cmp.mode === id, class: cmp.mode === id ? 'on' : '', onclick: () => setCmp({ mode: id }) }, label)))),
    h('p', { class: 'notice' }, 'Comparisons describe differences between uploads on this channel. They do not show why a difference exists.'),
    cmp.mode === 'group' ? groupMode(cmp, range, setCmp) : videoMode(cmp, setCmp));
}

function videoMode(cmp, setCmp) {
  const ids = cmp.ids.filter((id) => videoById(id));
  const chosen = ids.map(videoById);
  const avail = videos.filter((v) => !ids.includes(v.id));
  const w = chartWidth(window.innerWidth >= 1180 ? 0.5 : 1);
  const read = chosen.filter((v) => hasReading(v, TODAY));
  const sameFormat = new Set(chosen.map((v) => v.format)).size <= 1;
  return h('div', null,
    h('section', { class: 'card' },
      sectionHead('Selection', `${ids.length} of 4 videos`),
      h('div', { class: 'cmp-picks' }, chosen.map((v, i) => h('div', { class: `cmp-pick t-${TONES[i]}` }, thumb(v, 72),
        h('span', null, h('strong', null, v.title), h('small', { class: 'dim' }, formatShort(v.date)), provChip(v)),
        h('button', { class: 'btn btn-quiet icon-btn', 'aria-label': `Remove ${v.title}`, onclick: () => setCmp({ ids: ids.filter((x) => x !== v.id) }) }, icon('close', 16)))),
      ids.length < 4 ? h('label', { class: 'range add-pick' }, h('span', { class: 'sr-only' }, 'Add a video'),
        h('select', { onchange: (e) => e.target.value && setCmp({ ids: [...ids, e.target.value] }) },
          h('option', { value: '' }, '+ Add a video'), avail.map((v) => h('option', { value: v.id }, `${formatShort(v.date)} · ${v.title}`)))) : null)),
    !sameFormat ? h('p', { class: 'notice warn' }, 'You are comparing a Short with long-form videos. Their numbers are not comparable; consider comparing within one format.') : null,
    read.length < 2 ? emptyState('Pick at least two videos with readings', chosen.length && read.length < chosen.length ? 'One selected video is still in its first 7 days, so it has no reading yet.' : 'Add videos from the menu above or from the video library.')
      : h('div', { class: 'two-col' },
        h('section', { class: 'card' }, sectionHead('7-day views', 'First week after publishing'),
          barChart({ width: w, rows: read.map((v) => ({ label: v.title, note: formatShort(v.date), value: v.views7, display: formatInt(v.views7), tone: TONES[chosen.indexOf(v)] })) })),
        h('section', { class: 'card' }, sectionHead('Average viewed', 'Share of each video watched'),
          barChart({ width: w, max: 100, rows: read.map((v) => ({ label: v.title, note: v.ret30 != null ? `${v.ret30}% still watching at 0:30` : 'Short', value: v.avgPct, display: `${v.avgPct}%`, tone: TONES[chosen.indexOf(v)] })) }))),
    read.length >= 2 && sameFormat ? h('section', { class: 'card' }, sectionHead('Retention shape', 'Synthetic curves, scaled to each video’s length'),
      h('div', { class: 'legend' }, read.map((v) => h('span', { class: `lgk t-${TONES[chosen.indexOf(v)]}` }, h('i'), v.title))),
      retentionChart({ width: chartWidth(), height: 220, duration: 100, curves: read.map((v) => ({ pts: retentionCurve(v).map((p) => ({ t: (p.t / v.dur) * 100, r: p.r })) })) }),
      h('p', { class: 'fine dim' }, 'The horizontal axis is the share of each video, so different lengths line up.')) : null);
}

function groupMode(cmp, range, setCmp) {
  const f = findings.find((x) => x.id === cmp.group) || findings[0];
  const s = findingStats(f, range);
  const w = chartWidth(window.innerWidth >= 1180 ? 0.5 : 1);
  return h('div', null,
    h('div', { class: 'filter-bar' }, findings.map((x) => h('button', { class: `chip filter ${x.id === f.id ? 'on' : ''}`, 'aria-pressed': x.id === f.id, onclick: () => setCmp({ group: x.id }) }, x.name))),
    h('section', { class: 'card' },
      sectionHead(`${f.name} · ${range.label}`, s.multiplier == null ? 'Not enough videos to compare' : `Group is ${formatMultiplier(s.multiplier)} the channel baseline`, stateChip(s.state)),
      s.multiplier == null ? emptyState('Insufficient evidence', `${s.n} matching and ${s.nBaseline} baseline videos have a 7-day reading in this range; at least 3 of each are needed. Try “All history”.`)
        : h('div', { class: 'two-col' },
          barChart({ width: w, rows: [
            { label: f.name, note: `mean of ${s.n}`, value: s.groupViews, display: formatInt(s.groupViews), tone: 'accent' },
            { label: 'Channel baseline', note: `median of ${s.nBaseline}`, value: s.baselineViews, display: formatInt(s.baselineViews), tone: 'base' }] }),
          barChart({ width: w, max: 100, rows: [
            { label: 'Average viewed', note: f.name, value: s.avgGroup, display: `${s.avgGroup}%`, tone: 'accent' },
            { label: 'Average viewed', note: 'baseline', value: s.avgBase, display: `${s.avgBase}%`, tone: 'base' }] })),
      h('div', { class: 'cmp-lists' },
        list('In the group', s.group), list('Baseline', s.baseline))));
}

function list(title, vs) {
  return h('div', null, h('h3', { class: 'sub' }, `${title} (${vs.length})`),
    h('ul', { class: 'plain-list' }, vs.map((v) => h('li', null, h('a', { href: `#/videos/${v.id}` }, v.title), h('span', { class: 'dim num' }, ` ${formatInt(v.views7)}`)))));
}
