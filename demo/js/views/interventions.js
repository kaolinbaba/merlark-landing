// demo/js/views/interventions.js
// Experiments (category 6 — interventions) and "how it went" (category 7 — outcomes). Outcomes are either seen
// later in YouTube data or reported by the creator — never Merlark's own finding restated.

import { h, icon } from '../ui/dom.js';
import { dialog, toast } from '../ui/overlay.js';
import { barChart } from '../ui/charts.js';
import { emptyState, chartWidth, previewChip, thumb } from '../ui/components.js';
import { allFindingStats, findingStats, getRange, videoById, formatDate, formatInt, formatShort, hasReading, TODAY } from '../data/derive.js';
import { findings } from '../data/fixtures.js';
import { getState, setState } from '../state.js';
import { captureRects, playFlip } from '../ui/motion.js';

const CARD_SEL = '.iv-card[data-key]';
let justChanged = null; // the card that just moved, so it can show its new state

const COLS = [
  { id: 'planned', label: 'Planned' },
  { id: 'active', label: 'Trying it' },
  { id: 'outcome', label: 'Results added' },
];

export function planIntervention(findingId) {
  const f = findings.find((x) => x.id === findingId);
  let title = f.action.replace(/\.$/, '');
  let target = 3;
  dialog({
    label: f.name,
    title: 'Start an experiment',
    body: h('div', { class: 'form' },
      h('label', null, h('span', null, 'Your idea'),
        h('input', { type: 'text', value: title, maxlength: 90, 'data-autofocus': '', oninput: (e) => { title = e.target.value; } })),
      h('label', null, h('span', null, 'Follow it over your next'),
        h('select', { onchange: (e) => { target = Number(e.target.value); } }, [2, 3, 4, 5].map((n) => h('option', { value: n, selected: n === 3 }, `${n} videos`)))),
      h('p', { class: 'fine' }, 'Merlark lists the videos you publish after you start, with their first-week views next to your usual. Other changes can affect the result too.')),
    actions: [
      { label: 'Cancel' },
      { label: 'Save', variant: 'btn-primary', onClick: () => {
        const st = getState();
        const id = `I${st.interventions.length + 1}${Date.now().toString(36).slice(-3)}`;
        justChanged = id;
        setState({ interventions: [...st.interventions, { id, findingId, title: title.trim() || f.action, status: 'planned', created: TODAY, started: null, ended: null, appliedTo: [], target, outcome: null, creatorNote: '' }] });
        toast('Saved.');
      } },
    ],
  });
}

function update(id, patch) {
  const before = captureRects(CARD_SEL);
  justChanged = id;
  setState((st) => ({ interventions: st.interventions.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  playFlip(before, CARD_SEL); // the card travels to its new column
}

function recordOutcome(iv) {
  // "Observed" needs at least one tracked upload whose 7-day reading exists — the same rule the outcome panel uses.
  const readable = iv.appliedTo.map(videoById).filter((v) => v && hasReading(v, TODAY));
  let kind = readable.length ? 'observed' : 'creator';
  let note = '';
  dialog({
    label: 'Add results',
    title: iv.title,
    body: h('div', { class: 'form' },
      h('fieldset', null, h('legend', null, 'Where do the results come from?'),
        h('label', { class: 'radio' }, h('input', { type: 'radio', name: 'k', value: 'observed', checked: kind === 'observed', disabled: !readable.length, onchange: () => { kind = 'observed'; } }),
          h('span', null, h('strong', null, 'From YouTube numbers'), readable.length ? ` · first-week views of ${readable.length} video${readable.length > 1 ? 's' : ''} after you started` : ' · no video has a first-week reading yet')),
        h('label', { class: 'radio' }, h('input', { type: 'radio', name: 'k', value: 'creator', checked: kind === 'creator', onchange: () => { kind = 'creator'; } }),
          h('span', null, h('strong', null, 'From you'), ' · what you noticed yourself'))),
      h('label', null, h('span', null, 'Note (optional)'), h('textarea', { rows: 3, maxlength: 280, placeholder: 'e.g. Editing took longer. Comments mentioned the map.', oninput: (e) => { note = e.target.value; } }))),
    actions: [
      { label: 'Cancel' },
      { label: 'Save', variant: 'btn-primary', onClick: () => {
        update(iv.id, { status: 'outcome', ended: TODAY, outcome: { kind, note: kind === 'observed' ? 'First-week views of the videos after you started, next to your usual.' : 'Reported by you.' }, creatorNote: note.trim() ? `Your note: ${note.trim()}` : iv.creatorNote });
        toast('Saved.');
      } },
    ],
  });
}

function outcomePanel(iv) {
  const stats = findingStats(findings.find((f) => f.id === iv.findingId), getRange('all'));
  const applied = iv.appliedTo.map(videoById).filter((v) => v && hasReading(v, TODAY));
  if (!applied.length) return h('p', { class: 'muted' }, iv.outcome && iv.outcome.kind === 'creator' ? 'Only your own note so far. No YouTube numbers yet.' : 'No video after the start has a first-week reading yet.');
  return h('div', null,
    barChart({ width: chartWidth(window.innerWidth >= 1180 ? 0.3 : 0.85), rows: [
      ...applied.map((v) => ({ label: v.title, note: formatShort(v.date), value: v.views7, display: formatInt(v.views7), tone: 'accent' })),
      { label: 'Your usual', note: 'all history', value: stats.baselineViews || 0, display: formatInt(stats.baselineViews), tone: 'base' },
    ] }),
    h('p', { class: 'fine' }, 'Seen after the change. Other changes can affect the result too.'));
}

function card(iv) {
  const f = findings.find((x) => x.id === iv.findingId);
  const progress = iv.target ? Math.min(iv.appliedTo.length, iv.target) : iv.appliedTo.length;
  const order = COLS.map((c) => c.id); const at = order.indexOf(iv.status);
  const advanced = justChanged === iv.id;
  if (advanced) justChanged = null;
  return h('article', { class: `iv-card iv-${iv.status} ${advanced ? 'advanced' : ''}`, 'data-key': iv.id },
    h('header', null, h('a', { href: `#/patterns/${f.id}`, class: 'chip' }, icon('patterns', 13), f.name)),
    h('ol', { class: 'iv-track', 'aria-label': `Status: ${COLS[at].label}` }, COLS.map((c, i) => h('li', { class: i < at ? 'done' : i === at ? 'now' : '' }, h('i', { 'aria-hidden': 'true' }), c.label))),
    h('h3', null, iv.title),
    h('dl', { class: 'facts' },
      h('dt', null, 'Planned'), h('dd', null, formatDate(iv.created)),
      iv.started ? [h('dt', null, 'Started'), h('dd', null, formatDate(iv.started))] : null,
      iv.ended ? [h('dt', null, 'Results added'), h('dd', null, formatDate(iv.ended))] : null),
    iv.status !== 'planned' ? h('div', { class: 'iv-applied' },
      h('span', { class: 'dim' }, iv.target ? `Videos so far: ${progress} of ${iv.target}` : `Videos so far: ${iv.appliedTo.length}`),
      iv.target ? h('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': iv.target, 'aria-valuenow': progress }, h('i', { style: { width: `${(progress / iv.target) * 100}%` } })) : null,
      h('div', { class: 'iv-thumbs' }, iv.appliedTo.map(videoById).filter(Boolean).map((v) => h('a', { href: `#/videos/${v.id}`, title: v.title }, thumb(v, 64))))) : null,
    iv.status === 'outcome' ? h('div', { class: 'iv-outcome' },
      h('span', { class: 'eyebrow' }, iv.outcome && iv.outcome.kind === 'creator' ? 'Results · from you' : 'Results · from YouTube numbers'),
      outcomePanel(iv), iv.creatorNote ? h('p', { class: 'creator-note' }, iv.creatorNote) : null) : null,
    h('footer', { class: 'btn-row' },
      iv.status === 'planned' ? h('button', { class: 'btn btn-primary btn-sm', onclick: () => { update(iv.id, { status: 'active', started: TODAY }); toast('Saved.'); } }, 'Start trying it') : null,
      iv.status === 'active' ? h('button', { class: 'btn btn-primary btn-sm', onclick: () => recordOutcome(iv) }, 'Add results') : null,
      iv.status !== 'outcome' ? h('button', { class: 'btn btn-quiet btn-sm', onclick: () => { setState((st) => ({ interventions: st.interventions.filter((x) => x.id !== iv.id) })); toast('Saved.'); } }, 'Remove') : null));
}

export function render(_r, ctx) {
  const list = ctx.state.interventions;
  const start = () => {
    const stats = allFindingStats(ctx.range).filter((x) => !['insufficient', 'neutral'].includes(x.state));
    planIntervention((stats[0] || { finding: findings[0] }).finding.id);
  };
  return h('div', { class: 'view' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, 'Experiments'), h('h1', null, 'Try one small change.'), h('p', { class: 'desc' }, 'Write down an idea. Come back to see what happened.')),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: start }, icon('plus', 18), 'Start an experiment')),
    h('p', { class: 'notice' }, icon('info', 16), h('span', null, 'Other changes can affect the result too. Results are saved apart from the pattern, from later YouTube numbers or your own notes.')),
    list.length ? h('div', { class: 'board' }, COLS.map((c) => {
      const items = list.filter((i) => i.status === c.id);
      return h('section', { class: `board-col col-${c.id}`, 'aria-label': c.label },
        h('h2', null, c.label, h('span', { class: 'count num' }, String(items.length))),
        items.length ? items.map(card) : h('p', { class: 'col-empty dim' }, 'Nothing here yet.'));
    })) : emptyState('Nothing here yet.', 'Open a pattern and start an experiment from it.', h('a', { class: 'btn btn-primary', href: '#/patterns' }, 'See patterns')));
}
