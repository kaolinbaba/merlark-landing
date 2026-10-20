// demo/js/views/interventions.js
// Intervention (category 6) and outcome (category 7) tracking. Outcomes are either observed later
// from YouTube data or reported by the creator — never Merlark's own finding restated.

import { h, icon } from '../ui/dom.js';
import { dialog, toast } from '../ui/overlay.js';
import { barChart } from '../ui/charts.js';
import { emptyState, chartWidth, previewChip, thumb } from '../ui/components.js';
import { findingStats, getRange, videoById, formatDate, formatInt, formatShort, hasReading, TODAY } from '../data/derive.js';
import { findings } from '../data/fixtures.js';
import { getState, setState } from '../state.js';
import { captureRects, playFlip } from '../ui/motion.js';

const CARD_SEL = '.iv-card[data-key]';
let justChanged = null; // the card that just moved, so it can show its new state

const COLS = [
  { id: 'planned', label: 'Planned' },
  { id: 'active', label: 'Active' },
  { id: 'outcome', label: 'Outcome recorded' },
];

export function planIntervention(findingId) {
  const f = findings.find((x) => x.id === findingId);
  let title = f.action.replace(/\.$/, '');
  let target = 3;
  dialog({
    label: `Plan intervention · ${f.name}`,
    title: 'Plan a change to try',
    body: h('div', { class: 'form' },
      h('label', null, h('span', null, 'What will you change?'),
        h('input', { type: 'text', value: title, maxlength: 90, 'data-autofocus': '', oninput: (e) => { title = e.target.value; } })),
      h('label', null, h('span', null, 'Track it across the next'),
        h('select', { onchange: (e) => { target = Number(e.target.value); } }, [2, 3, 4, 5].map((n) => h('option', { value: n, selected: n === 3 }, `${n} uploads`)))),
      h('p', { class: 'fine dim' }, 'Merlark will list the uploads published after you start, and their 7-day readings next to the channel baseline. It will not claim the change caused any difference.')),
    actions: [
      { label: 'Cancel' },
      { label: 'Add to tracker', variant: 'btn-primary', onClick: () => {
        const st = getState();
        const id = `I${st.interventions.length + 1}${Date.now().toString(36).slice(-3)}`;
        justChanged = id;
        setState({ interventions: [...st.interventions, { id, findingId, title: title.trim() || f.action, status: 'planned', created: TODAY, started: null, ended: null, appliedTo: [], target, outcome: null, creatorNote: '' }] });
        toast('Intervention planned. Find it under Act → Interventions.');
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
    label: 'Record outcome',
    title: iv.title,
    body: h('div', { class: 'form' },
      h('fieldset', null, h('legend', null, 'Where does this outcome come from?'),
        h('label', { class: 'radio' }, h('input', { type: 'radio', name: 'k', value: 'observed', checked: kind === 'observed', disabled: !readable.length, onchange: () => { kind = 'observed'; } }),
          h('span', null, h('strong', null, 'Observed'), readable.length ? ` — the 7-day readings of ${readable.length} upload${readable.length > 1 ? 's' : ''} after the start date` : ' — no tracked upload has a 7-day reading yet')),
        h('label', { class: 'radio' }, h('input', { type: 'radio', name: 'k', value: 'creator', checked: kind === 'creator', onchange: () => { kind = 'creator'; } }),
          h('span', null, h('strong', null, 'Creator-reported'), ' — what you noticed yourself'))),
      h('label', null, h('span', null, 'Note (optional)'), h('textarea', { rows: 3, maxlength: 280, placeholder: 'e.g. Editing took longer; comments mentioned the map.', oninput: (e) => { note = e.target.value; } }))),
    actions: [
      { label: 'Cancel' },
      { label: 'Save outcome', variant: 'btn-primary', onClick: () => {
        update(iv.id, { status: 'outcome', ended: TODAY, outcome: { kind, note: kind === 'observed' ? 'Readings of the uploads after the start date are shown next to the channel baseline.' : 'Creator-reported outcome.' }, creatorNote: note.trim() ? `Creator-reported: ${note.trim()}` : iv.creatorNote });
        toast('Outcome recorded.');
      } },
    ],
  });
}

function outcomePanel(iv) {
  const stats = findingStats(findings.find((f) => f.id === iv.findingId), getRange('all'));
  const applied = iv.appliedTo.map(videoById).filter((v) => v && hasReading(v, TODAY));
  if (!applied.length) return h('p', { class: 'muted' }, iv.outcome && iv.outcome.kind === 'creator' ? 'Creator-reported outcome only. No observed readings yet.' : 'No uploads with a 7-day reading after the start date yet.');
  return h('div', null,
    barChart({ width: chartWidth(window.innerWidth >= 1180 ? 0.3 : 0.85), rows: [
      ...applied.map((v) => ({ label: v.title, note: formatShort(v.date), value: v.views7, display: formatInt(v.views7), tone: 'accent' })),
      { label: 'Channel baseline', note: 'all history', value: stats.baselineViews || 0, display: formatInt(stats.baselineViews), tone: 'base' },
    ] }),
    h('p', { class: 'fine dim' }, 'Observed after the change. A difference here is an association, not proof that the change caused it.'));
}

function card(iv) {
  const f = findings.find((x) => x.id === iv.findingId);
  const progress = iv.target ? Math.min(iv.appliedTo.length, iv.target) : iv.appliedTo.length;
  const order = COLS.map((c) => c.id); const at = order.indexOf(iv.status);
  const advanced = justChanged === iv.id;
  if (advanced) justChanged = null;
  return h('article', { class: `iv-card iv-${iv.status} ${advanced ? 'advanced' : ''}`, 'data-key': iv.id },
    h('header', null, h('span', { class: 'dim num' }, iv.id.slice(0, 4)), h('a', { href: `#/findings/${f.id}`, class: 'chip' }, f.name)),
    h('ol', { class: 'iv-track', 'aria-label': `Status: ${COLS[at].label}` }, COLS.map((c, i) => h('li', { class: i < at ? 'done' : i === at ? 'now' : '' }, h('i', { 'aria-hidden': 'true' }), c.label))),
    h('h3', null, iv.title),
    h('dl', { class: 'facts' },
      h('dt', null, 'Planned'), h('dd', null, formatDate(iv.created)),
      iv.started ? [h('dt', null, 'Started'), h('dd', null, formatDate(iv.started))] : null,
      iv.ended ? [h('dt', null, 'Outcome recorded'), h('dd', null, formatDate(iv.ended))] : null),
    iv.status !== 'planned' ? h('div', { class: 'iv-applied' },
      h('span', { class: 'dim' }, iv.target ? `Uploads tracked: ${progress} of ${iv.target}` : `Uploads tracked: ${iv.appliedTo.length}`),
      iv.target ? h('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': iv.target, 'aria-valuenow': progress }, h('i', { style: { width: `${(progress / iv.target) * 100}%` } })) : null,
      h('div', { class: 'iv-thumbs' }, iv.appliedTo.map(videoById).filter(Boolean).map((v) => h('a', { href: `#/videos/${v.id}`, title: v.title }, thumb(v, 64))))) : null,
    iv.status === 'outcome' ? h('div', { class: 'iv-outcome' },
      h('span', { class: 'eyebrow' }, iv.outcome && iv.outcome.kind === 'creator' ? 'Outcome · creator-reported' : 'Outcome · observed'),
      outcomePanel(iv), iv.creatorNote ? h('p', { class: 'creator-note' }, iv.creatorNote) : null) : null,
    h('footer', { class: 'btn-row' },
      iv.status === 'planned' ? h('button', { class: 'btn btn-primary btn-sm', onclick: () => { update(iv.id, { status: 'active', started: TODAY }); toast('Started. Uploads published from today will be tracked.'); } }, 'Start') : null,
      iv.status === 'active' ? h('button', { class: 'btn btn-primary btn-sm', onclick: () => recordOutcome(iv) }, 'Record outcome') : null,
      iv.status !== 'outcome' ? h('button', { class: 'btn btn-quiet btn-sm', onclick: () => { setState((st) => ({ interventions: st.interventions.filter((x) => x.id !== iv.id) })); toast('Intervention removed.'); } }, 'Remove') : null));
}

export function render(_r, ctx) {
  const list = ctx.state.interventions;
  return h('div', { class: 'view' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, 'Act'), h('h1', null, 'Interventions and outcomes')),
      previewChip()),
    h('p', { class: 'muted lede' }, 'An intervention is something you chose to change after a finding. Its outcome is recorded separately, from later YouTube readings or from your own notes, so Merlark never grades its own advice with its own signal.'),
    list.length ? h('div', { class: 'board' }, COLS.map((c) => {
      const items = list.filter((i) => i.status === c.id);
      return h('section', { class: 'board-col', 'aria-label': c.label },
        h('h2', null, c.label, h('span', { class: 'count num' }, String(items.length))),
        items.length ? items.map(card) : h('p', { class: 'col-empty dim' }, c.id === 'planned' ? 'Plan one from any finding with a clear reading.' : 'Nothing here yet.'));
    })) : emptyState('No interventions yet', 'Open a finding and choose “Plan intervention” to start tracking a change.', h('a', { class: 'btn btn-primary', href: '#/findings' }, 'Open findings')));
}
