// demo/js/ui/components.js
// Reusable pieces shared by the demo views and the landing page.

import { h, icon } from './dom.js';
import { STATE_LABEL, STATE_ICON, QUALITY_LABEL, QUALITY_HELP, formatMultiplier, formatInt, formatShort, formatTime, provenanceOf } from '../data/derive.js';
import { BACKFILL_LABEL } from '../data/fixtures.js';
import { thumb } from './thumbs.js';

export { thumb };

// Performance-trend state: colour, icon and words carry the same meaning.
export const stateChip = (state) =>
  h('span', { class: `chip state state-${state}` }, icon(STATE_ICON[state], 13), STATE_LABEL[state]);

// Evidence strength: a separate question from the state, shown as three small bars plus words.
const QLEVEL = { Strong: 3, Moderate: 2, Limited: 1, Insufficient: 0 };
export const qualityBadge = (q) =>
  h('span', { class: `quality q-${q.toLowerCase()}`, title: QUALITY_HELP[q] },
    h('span', { class: 'bars', 'aria-hidden': 'true' }, [1, 2, 3].map((i) => h('i', { class: i <= QLEVEL[q] ? 'on' : '' }))),
    QUALITY_LABEL[q]);

// Provenance (§6.7 categories 4 and 5): "Earlier history" is reconstructed, "Since connection" was recorded.
export const provChip = (v) => {
  const p = provenanceOf(v);
  return h('span', { class: `chip prov prov-${p}`, title: p === 'historical' ? BACKFILL_LABEL : 'Recorded after the channel connected.' },
    icon(p === 'historical' ? 'history' : 'eye', 13), p === 'historical' ? 'Earlier history' : 'Since connection');
};

export const previewChip = (text = 'Preview') => h('span', { class: 'chip preview', title: 'Shown with sample data. Not in the product yet.' }, text);

export function multiplierLine(s) {
  if (s.multiplier == null) return h('span', { class: 'mult none' }, 'No comparison yet');
  return h('span', { class: `mult ${s.multiplier >= 1 ? 'up' : 'down'}` }, h('b', { class: 'num' }, formatMultiplier(s.multiplier)), ' your usual');
}

// The exact calculation behind "This group" and "Your usual" (§5.9: group = average, usual = median).
export function calcLines(s) {
  const other = s.finding.scope === 'short' ? 'Shorts' : 'long videos';
  return {
    group: `Average first-week views of the ${s.n} ${s.n === 1 ? 'video' : 'videos'} with this pattern`,
    base: `Median first-week views of your ${s.nBaseline} other ${other}`,
  };
}

// "The numbers" (measured) and "One possible explanation" (interpretation) always sit apart (§5.9).
export function obsInterp(s, { compact } = {}) {
  const f = s.finding;
  const other = f.scope === 'short' ? 'Shorts' : 'long videos';
  const observed = s.multiplier == null
    ? `${f.observation(s)} ${s.n < 3 ? `Only ${s.n} ${s.n === 1 ? 'has' : 'have'} a first-week reading in these dates. We need at least 3.` : `Only ${s.nBaseline} of your other ${other} ${s.nBaseline === 1 ? 'has' : 'have'} a reading. We need at least 3.`}`
    : `${f.observation(s)} In their first week they averaged ${formatInt(s.groupViews)} views. The median for your other ${s.nBaseline} ${other} is ${formatInt(s.baselineViews)}.${s.retGroup != null ? ` At 0:30, ${s.retGroup}% of viewers were still watching, against ${s.retBase}% usually.` : ''}`;
  return h('div', { class: `oi ${compact ? 'compact' : ''}` },
    h('div', { class: 'oi-block obs' }, h('span', { class: 'oi-tag' }, icon('eye', 14), 'The numbers'), h('p', null, observed)),
    h('div', { class: 'oi-block interp' }, h('span', { class: 'oi-tag' }, icon('bulb', 14), 'One possible explanation'), h('p', null, f.interpretation),
      h('p', { class: 'fine' }, 'These happened together. That doesn’t show one caused the other.')));
}

export function evidenceRow({ video, segment }, onOpen) {
  return h('button', { class: 'ev-row', type: 'button', onclick: onOpen, 'data-video': video.id, 'aria-label': `Open ${video.title} at ${formatTime(segment.start)}` },
    thumb(video, 96),
    h('span', { class: 'ev-main' },
      h('span', { class: 'ev-title' }, video.title),
      h('span', { class: 'ev-meta' }, playChip(segment), h('span', null, segment.label)),
      h('span', { class: 'ev-meta' }, provChip(video), h('span', { class: 'dim' }, formatShort(video.date)),
        h('span', { class: 'dim num' }, video.views7 != null ? `${formatInt(video.views7)} views in week one` : 'First week still running'))),
    h('span', { class: 'ev-go', 'aria-hidden': 'true' }, icon('arrow', 16)));
}

// A timestamp as a little play chip: ▶ 0:00–0:10
export const playChip = (segment) => h('span', { class: 'play-chip num' }, icon('play', 12), `${formatTime(segment.start)}–${formatTime(segment.end)}`);

export function emptyState(title = 'Nothing here yet.', text = 'Try a wider date range or choose another video.', action) {
  return h('div', { class: 'empty' },
    h('span', { class: 'empty-dot', 'aria-hidden': 'true' }, icon('search', 22)),
    h('h3', null, title), h('p', { class: 'muted' }, text), action || null);
}

export function insufficientPanel(s) {
  return h('div', { class: 'insufficient' },
    h('div', { class: 'ins-gauge', 'aria-hidden': 'true' }, [0, 1, 2].map((i) => h('i', { class: i < s.n ? 'on' : '' }))),
    h('div', null,
      h('strong', null, 'We need a few more videos.'),
      h('p', null, 'There isn’t enough to make a useful comparison yet.'),
      h('p', { class: 'fine' }, `${Math.min(s.n, 3)} of 3 matching videos${s.pending.length ? ` (${s.pending.length} still in their first week)` : ''} and ${Math.min(s.nBaseline, 3)} of 3 others have a first-week reading.`)));
}

export function skeleton(lines = 3) {
  return h('div', { class: 'skeleton', 'aria-busy': 'true', 'aria-label': 'Getting things ready…' },
    Array.from({ length: lines }, (_, i) => h('i', { style: { width: `${90 - i * 18}%` } })));
}

export const sectionHead = (eyebrow, title, extra) =>
  h('div', { class: 'section-head' }, h('div', null, eyebrow ? h('span', { class: 'eyebrow' }, eyebrow) : null, title ? h('h2', null, title) : null), extra || null);

// Width available inside a panel in the main column (charts are drawn at real pixel size).
export function chartWidth(fraction = 1) {
  const vw = window.innerWidth;
  const main = Math.min(vw - (vw >= 1024 ? 96 : 0), 1160);
  const pad = vw < 640 ? 32 + 34 : 64 + 50;
  return Math.max(260, Math.floor((main - pad) * fraction));
}

// Two bars: "This group" against "Your usual", with the exact calculation under each label.
export function barPair({ group, groupLabel = 'This group', groupCalc, base, baseLabel = 'Your usual', baseCalc }) {
  const max = Math.max(group, base) || 1;
  const row = (label, calc, value, tone) => h('div', { class: `pair-row ${tone}` },
    h('span', { class: 'pair-label' }, h('b', null, label), calc ? h('small', null, calc) : null),
    h('span', { class: 'pair-track' }, h('i', { style: { '--w': `${((value / max) * 100).toFixed(1)}%` } })),
    h('b', { class: 'pair-value num' }, formatInt(value)));
  return h('div', { class: 'pair' }, row(groupLabel, groupCalc, group, 'group'), row(baseLabel, baseCalc, base, 'base'));
}
