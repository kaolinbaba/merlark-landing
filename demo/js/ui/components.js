// demo/js/ui/components.js
// Reusable pieces shared by the demo views and the landing page.

import { h, icon } from './dom.js';
import { STATE_LABEL, QUALITY_HELP, formatMultiplier, formatInt, formatShort, formatTime, provenanceOf } from '../data/derive.js';
import { BACKFILL_LABEL } from '../data/fixtures.js';
import { thumb } from './thumbs.js';

export { thumb };

export const stateChip = (state) =>
  h('span', { class: `chip state state-${state}` }, h('i', { class: 'lamp', 'aria-hidden': 'true' }), STATE_LABEL[state]);

const QLEVEL = { Strong: 3, Moderate: 2, Limited: 1, Insufficient: 0 };
export const qualityBadge = (q) =>
  h('span', { class: `quality q-${q.toLowerCase()}`, title: QUALITY_HELP[q] },
    h('span', { class: 'bars', 'aria-hidden': 'true' }, [1, 2, 3].map((i) => h('i', { class: i <= QLEVEL[q] ? 'on' : '' }))),
    q === 'Insufficient' ? 'Evidence: too little' : `Evidence: ${q.toLowerCase()}`);

export const provChip = (v) => {
  const p = provenanceOf(v);
  return h('span', { class: `chip prov prov-${p}`, title: p === 'historical' ? BACKFILL_LABEL : 'Recorded by Merlark after you connected.' },
    p === 'historical' ? 'Historical estimate' : 'Observed by Merlark');
};

export const previewChip = (text = 'Preview') => h('span', { class: 'chip preview', title: 'Shown with sample data. Not in the product yet.' }, text);

export function multiplierLine(s) {
  if (s.multiplier == null) return h('span', { class: 'mult none' }, 'No comparison yet');
  return h('span', { class: `mult ${s.multiplier >= 1 ? 'up' : 'down'}` }, h('b', { class: 'num' }, formatMultiplier(s.multiplier)), ' your usual');
}

// "What we saw" (measured) and "What it might mean" (a guess) always sit in two separate boxes (§5.9).
export function obsInterp(s, { compact } = {}) {
  const f = s.finding;
  const other = f.scope === 'short' ? 'Shorts' : 'long videos';
  const observed = s.multiplier == null
    ? `${f.observation(s)} ${s.n < 3 ? `Only ${s.n} ${s.n === 1 ? 'has' : 'have'} a first-week reading in this range. We need at least 3.` : `Only ${s.nBaseline} of your other ${other} ${s.nBaseline === 1 ? 'has' : 'have'} a reading. We need at least 3.`}`
    : `${f.observation(s)} In their first week they averaged ${formatInt(s.groupViews)} views. Your other ${s.nBaseline} ${other} usually get ${formatInt(s.baselineViews)}.${s.retGroup != null ? ` At 0:30, ${s.retGroup}% of viewers were still watching, against ${s.retBase}% usually.` : ''}`;
  return h('div', { class: `oi ${compact ? 'compact' : ''}` },
    h('div', { class: 'oi-block obs' }, h('span', { class: 'oi-tag' }, icon('eye', 14), 'What we saw'), h('p', null, observed)),
    h('div', { class: 'oi-block interp' }, h('span', { class: 'oi-tag' }, icon('info', 14), 'What it might mean'), h('p', null, f.interpretation)));
}

export function evidenceRow({ video, segment }, onOpen) {
  return h('button', { class: 'ev-row', type: 'button', onclick: onOpen, 'aria-label': `Open evidence: ${video.title} at ${formatTime(segment.start)}` },
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

export function emptyState(title, text, action) {
  return h('div', { class: 'empty' },
    h('span', { class: 'empty-dot', 'aria-hidden': 'true' }, icon('search', 22)),
    h('h3', null, title), h('p', { class: 'muted' }, text), action || null);
}

export function insufficientPanel(s) {
  return h('div', { class: 'insufficient' },
    h('div', { class: 'ins-gauge', 'aria-hidden': 'true' }, [0, 1, 2].map((i) => h('i', { class: i < s.n ? 'on' : '' }))),
    h('div', null,
      h('strong', null, 'Not enough data yet'),
      h('p', { class: 'muted' }, `${Math.min(s.n, 3)} of the 3 matching videos we need${s.pending.length ? ` (${s.pending.length} still in their first week)` : ''}, and ${Math.min(s.nBaseline, 3)} of the 3 other videos to compare with. No comparison until both are there.`)));
}

export function skeleton(lines = 3) {
  return h('div', { class: 'skeleton', 'aria-busy': 'true', 'aria-label': 'Loading' },
    Array.from({ length: lines }, (_, i) => h('i', { style: { width: `${90 - i * 18}%` } })));
}

export const sectionHead = (eyebrow, title, extra) =>
  h('div', { class: 'section-head' }, h('div', null, h('span', { class: 'eyebrow' }, eyebrow), h('h2', null, title)), extra || null);

// Width available inside a panel in the main column (charts are drawn at real pixel size).
export function chartWidth(fraction = 1) {
  const vw = window.innerWidth;
  const main = Math.min(vw - (vw >= 1024 ? 112 : 0), 1180);
  const pad = vw < 640 ? 32 + 36 : 64 + 52;
  return Math.max(260, Math.floor((main - pad) * fraction));
}

// Two bars side by side: a group against the creator's usual. Shared by the landing page and the demo.
export function barPair({ group, groupLabel, base, baseLabel }) {
  const max = Math.max(group, base) || 1;
  const row = (label, value, tone) => h('div', { class: `pair-row ${tone}` },
    h('span', { class: 'pair-label' }, label),
    h('span', { class: 'pair-track' }, h('i', { style: { '--w': `${((value / max) * 100).toFixed(1)}%` } })),
    h('b', { class: 'num' }, formatInt(value)));
  return h('div', { class: 'pair' }, row(groupLabel, group, 'group'), row(baseLabel, base, 'base'));
}
