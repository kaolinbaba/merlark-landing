// demo/js/ui/components.js
// Reusable pieces shared by the demo views and the landing page preview.

import { h, icon } from './dom.js';
import { STATE_LABEL, QUALITY_HELP, formatMultiplier, formatInt, formatShort, formatTime, provenanceOf } from '../data/derive.js';
import { BACKFILL_LABEL } from '../data/fixtures.js';
import { thumb } from './thumbs.js';

export { thumb };

export const stateChip = (state) =>
  h('span', { class: `chip state state-${state}` }, h('i', { class: 'lamp', 'aria-hidden': 'true' }), STATE_LABEL[state]);

export const qualityBadge = (q) =>
  h('span', { class: `quality q-${q.toLowerCase()}`, title: QUALITY_HELP[q] },
    h('span', { class: 'bars', 'aria-hidden': 'true' }, [1, 2, 3].map((i) => h('i', { class: i <= { Strong: 3, Moderate: 2, Limited: 1, Insufficient: 0 }[q] ? 'on' : '' }))),
    `Evidence: ${q}`);

export const provChip = (v) => {
  const p = provenanceOf(v);
  return h('span', { class: `chip prov prov-${p}`, title: p === 'historical' ? BACKFILL_LABEL : 'Recorded by Merlark while the channel was connected.' },
    p === 'historical' ? 'Historical estimate' : 'Observed by Merlark');
};

export const previewChip = (text = 'Feature preview') => h('span', { class: 'chip preview', title: 'Shown with sample data. Not available in the product yet.' }, text);

export function multiplierLine(s) {
  if (s.multiplier == null) return h('span', { class: 'mult none' }, 'No comparison yet');
  return h('span', { class: `mult ${s.multiplier >= 1 ? 'up' : 'down'}` }, h('b', { class: 'num' }, formatMultiplier(s.multiplier)), ' channel baseline');
}

// Observation and interpretation are always shown as two separate, labelled blocks (§5.9).
export function obsInterp(s, { compact } = {}) {
  const f = s.finding;
  const observed = s.multiplier == null
    ? `${f.observation(s)} ${s.n < 3 ? `Only ${s.n} ${s.n === 1 ? 'has' : 'have'} a 7-day reading in this range; at least 3 are needed.` : `Only ${s.nBaseline} comparable baseline ${s.nBaseline === 1 ? 'video has' : 'videos have'} a reading; at least 3 are needed.`}`
    : `${f.observation(s)} In this range they averaged ${formatInt(s.groupViews)} views in their first 7 days; the channel baseline (median of ${s.nBaseline} other ${f.scope === 'short' ? 'Shorts' : 'long-form uploads'}) is ${formatInt(s.baselineViews)}.${s.retGroup != null ? ` ${s.retGroup}% of viewers were still watching at 0:30, against ${s.retBase}% for the baseline.` : ''}`;
  return h('div', { class: `oi ${compact ? 'compact' : ''}` },
    h('div', { class: 'oi-block obs' }, h('span', { class: 'oi-tag' }, icon('eye', 14), 'Observation · measured'), h('p', null, observed)),
    h('div', { class: 'oi-block interp' }, h('span', { class: 'oi-tag' }, icon('info', 14), 'Interpretation · not a cause'), h('p', null, f.interpretation)));
}

export function evidenceRow({ video, segment }, onOpen) {
  return h('button', { class: 'ev-row', onclick: onOpen, 'aria-label': `Open evidence: ${video.title} at ${formatTime(segment.start)}` },
    thumb(video, 88),
    h('span', { class: 'ev-main' },
      h('span', { class: 'ev-title' }, video.title),
      h('span', { class: 'ev-meta' },
        h('span', { class: 'ts num' }, `${formatTime(segment.start)}–${formatTime(segment.end)}`),
        h('span', null, segment.label)),
      h('span', { class: 'ev-meta' }, provChip(video), h('span', { class: 'dim' }, formatShort(video.date)),
        h('span', { class: 'dim num' }, video.views7 != null ? `${formatInt(video.views7)} views / 7d` : '7-day reading pending'))),
    h('span', { class: 'ev-go', 'aria-hidden': 'true' }, icon('arrow', 16)));
}

export function emptyState(title, text, action) {
  return h('div', { class: 'empty' },
    h('div', { class: 'empty-radar', 'aria-hidden': 'true' }, h('i'), h('i'), h('b')),
    h('h3', null, title), h('p', { class: 'muted' }, text), action || null);
}

export function insufficientPanel(s) {
  return h('div', { class: 'insufficient' },
    h('div', { class: 'ins-gauge', 'aria-hidden': 'true' }, [0, 1, 2].map((i) => h('i', { class: i < s.n ? 'on' : '' }))),
    h('div', null,
      h('strong', null, 'Insufficient evidence'),
      h('p', { class: 'muted' }, `${s.n} of the 3 matching videos needed${s.pending.length ? ` (${s.pending.length} waiting for a 7-day reading)` : ''}, and ${Math.min(s.nBaseline, 3)} of the 3 comparable baseline videos. Merlark shows no comparison until both are met.`)));
}

export function skeleton(lines = 3) {
  return h('div', { class: 'skeleton', 'aria-busy': 'true', 'aria-label': 'Loading' },
    h('div', { class: 'focus-ring', 'aria-hidden': 'true' }),
    Array.from({ length: lines }, (_, i) => h('i', { style: { width: `${90 - i * 18}%` } })));
}

export const sectionHead = (eyebrow, title, extra) =>
  h('div', { class: 'section-head' }, h('div', null, h('span', { class: 'eyebrow' }, eyebrow), h('h2', null, title)), extra || null);

// Width available inside a card in the main column (charts are drawn at real pixel size).
export function chartWidth(fraction = 1) {
  const vw = window.innerWidth;
  const main = Math.min(vw - (vw >= 1024 ? 264 : 0), 1180);
  const pad = vw < 640 ? 32 + 34 : 64 + 50;
  return Math.max(260, Math.floor((main - pad) * fraction));
}

// Compact finding card for previews outside the app shell (landing page).
export function findingCardLite(s, href = `demo/#/findings/${s.finding.id}`) {
  return h('a', { class: `finding-card state-${s.state}`, href },
    h('div', { class: 'fc-top' }, stateChip(s.state), h('span', { class: 'dim num' }, s.finding.id)),
    h('h3', null, s.finding.name),
    h('div', { class: 'fc-foot' }, multiplierLine(s), qualityBadge(s.quality)));
}
