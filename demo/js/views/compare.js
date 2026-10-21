// demo/js/views/compare.js
// Simple comparisons against the creator's own channel: up to four videos, or one finding's group vs. your usual.

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
      h('div', null, h('span', { class: 'eyebrow' }, 'Compare'), h('h1', null, 'Side by side')),
      h('div', { class: 'seg-toggle', role: 'group', 'aria-label': 'Comparison mode' },
        [['videos', 'Pick videos'], ['group', 'A group vs. your usual']].map(([id, label]) =>
          h('button', { type: 'button', 'aria-pressed': String(cmp.mode === id), class: cmp.mode === id ? 'on' : '', onclick: () => setCmp({ mode: id }) }, label)))),
    h('p', { class: 'notice' }, 'This shows how your own videos differ. It can’t tell you why.'),
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
      sectionHead('Picked', `${ids.length} of 4 videos`),
      h('div', { class: 'cmp-picks' }, chosen.map((v, i) => h('div', { class: `cmp-pick t-${TONES[i]}` }, thumb(v, 72),
        h('span', null, h('strong', null, v.title), h('small', { class: 'dim' }, formatShort(v.date)), provChip(v)),
        h('button', { class: 'btn btn-quiet icon-btn', 'aria-label': `Remove ${v.title}`, onclick: () => setCmp({ ids: ids.filter((x) => x !== v.id) }) }, icon('close', 16)))),
      ids.length < 4 ? h('label', { class: 'range add-pick' }, h('span', { class: 'sr-only' }, 'Add a video'),
        h('select', { onchange: (e) => e.target.value && setCmp({ ids: [...ids, e.target.value] }) },
          h('option', { value: '' }, '+ Add a video'), avail.map((v) => h('option', { value: v.id }, `${formatShort(v.date)} · ${v.title}`)))) : null)),
    !sameFormat ? h('p', { class: 'notice warn' }, 'Heads up: you’re comparing a Short with long videos. Their numbers don’t line up, so try one format at a time.') : null,
    read.length < 2 ? emptyState('Pick two videos with numbers', chosen.length && read.length < chosen.length ? 'One of them is still in its first week, so it has no reading yet.' : 'Add videos from the menu above, or from Videos.')
      : h('div', { class: 'two-col' },
        h('section', { class: 'card' }, sectionHead('Week-one views', 'First 7 days after publishing'),
          barChart({ key: 'cmp-v-views', width: w, rows: read.map((v) => ({ id: v.id, label: v.title, note: formatShort(v.date), value: v.views7, display: formatInt(v.views7), tone: TONES[chosen.indexOf(v)] })) })),
        h('section', { class: 'card' }, sectionHead('Average watched', 'How much of each video people saw'),
          barChart({ key: 'cmp-v-avg', width: w, max: 100, rows: read.map((v) => ({ id: v.id, label: v.title, note: v.ret30 != null ? `${v.ret30}% still there at 0:30` : 'Short', value: v.avgPct, display: `${v.avgPct}%`, tone: TONES[chosen.indexOf(v)] })) }))),
    read.length >= 2 && sameFormat ? h('section', { class: 'card' }, sectionHead('Who kept watching', 'Made-up curves, stretched to each video’s length'),
      h('div', { class: 'legend' }, read.map((v) => h('span', { class: `lgk t-${TONES[chosen.indexOf(v)]}` }, h('i'), v.title))),
      retentionChart({ width: chartWidth(), height: 220, duration: 100, curves: read.map((v) => ({ pts: retentionCurve(v).map((p) => ({ t: (p.t / v.dur) * 100, r: p.r })) })) }),
      h('p', { class: 'fine' }, 'Left to right is how far into each video, so different lengths line up.')) : null);
}

function groupMode(cmp, range, setCmp) {
  const f = findings.find((x) => x.id === cmp.group) || findings[0];
  const s = findingStats(f, range);
  const w = chartWidth(window.innerWidth >= 1180 ? 0.5 : 1);
  return h('div', null,
    h('div', { class: 'filter-bar' }, findings.map((x) => h('button', { class: `chip filter ${x.id === f.id ? 'on' : ''}`, 'aria-pressed': x.id === f.id, onclick: () => setCmp({ group: x.id }) }, x.name))),
    h('section', { class: 'card' },
      sectionHead(`${f.name} · ${range.label}`, s.multiplier == null ? 'Not enough data yet' : `${formatMultiplier(s.multiplier)} your usual`, stateChip(s.state)),
      s.multiplier == null ? emptyState('Not enough data yet', `${s.n} matching and ${s.nBaseline} other videos have a week-one reading in this range. We need 3 of each. Try “All history”.`)
        : h('div', { class: 'two-col' },
          barChart({ key: 'cmp-g-views', width: w, rows: [
            { id: 'group', label: f.name, note: `mean of ${s.n}`, value: s.groupViews, display: formatInt(s.groupViews), tone: 'accent' },
            { id: 'baseline', label: 'Your usual', note: `${s.nBaseline} other videos`, value: s.baselineViews, display: formatInt(s.baselineViews), tone: 'base' }] }),
          barChart({ key: 'cmp-g-avg', width: w, max: 100, rows: [
            { id: 'group', label: 'Average watched', note: f.name, value: s.avgGroup, display: `${s.avgGroup}%`, tone: 'accent' },
            { id: 'baseline', label: 'Average watched', note: 'your usual', value: s.avgBase, display: `${s.avgBase}%`, tone: 'base' }] })),
      h('div', { class: 'cmp-lists' },
        list('In the group', s.group), list('Your other videos', s.baseline))));
}

function list(title, vs) {
  return h('div', null, h('h3', { class: 'sub' }, `${title} (${vs.length})`),
    h('ul', { class: 'plain-list' }, vs.map((v) => h('li', null, h('a', { href: `#/videos/${v.id}` }, v.title), h('span', { class: 'dim num' }, ` ${formatInt(v.views7)}`)))));
}
