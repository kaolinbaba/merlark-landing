// demo/js/views/script.js
// Evidence-grounded script workspace (§5.10). Drafts are assembled from prepared text by fixed rules —
// no AI model is called in the demo. Every evidence-backed block names the finding it comes from;
// structure blocks and insufficient-evidence ideas are labelled as not evidence-backed.

import { h, icon } from '../ui/dom.js';
import { drawer, toast } from '../ui/overlay.js';
import { stateChip, qualityBadge, evidenceRow, previewChip, insufficientPanel } from '../ui/components.js';
import { evidenceFor, formatDate } from '../data/derive.js';
import { findings, patternWatch, scriptTopics } from '../data/fixtures.js';
import { scriptModel } from '../data/script-model.js';
import { setState } from '../state.js';
import { captureRects, playFlip } from '../ui/motion.js';
import { openEvidence } from './evidence.js';

const RULES = [
  'Openings come first: route map, then any archive beat, then the fresh opening line.',
  'The recap goes between chapters 2 and 3, near the middle.',
  'Structure blocks are always in, and marked as not based on your data.',
  'Title and Shorts notes go after the close.',
  'Findings without enough data in this period become clearly labelled guesses.',
];
const BLOCK_SEL = '.blocks li[data-key]';

function copyText(text) {
  const fallback = () => {
    const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = text; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove(); toast(ok ? 'Draft copied.' : 'Copy didn’t work. Select the text and copy it by hand.', ok ? 'ok' : 'error');
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => toast('Draft copied.'), fallback);
  else fallback();
}
function download(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
  const a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Exported ${name}.`);
}

function inspect(src, model) {
  const { statsById, pw, range } = model;
  const period = h('p', { class: 'fine' }, `Period: ${range.label}, ${formatDate(range.start)} – ${formatDate(range.end)}`);
  if (src === 'P1') {
    drawer({ label: 'Source · Pattern watch', title: patternWatch.name, body: h('div', { class: 'ev-list' }, period,
      h('p', { class: 'muted' }, pw.n ? patternWatch.observation(pw.n) : 'No videos in this period share the series template.'),
      pw.videos.map((v) => { const seg = patternWatch.segments(v)[0]; return evidenceRow({ video: v, segment: seg }, () => openEvidence({ video: v, segment: seg, findingId: 'P1', findingName: patternWatch.name })); })) });
    return;
  }
  const s = statsById[src];
  drawer({ label: `Source · ${src}`, title: s.finding.name, body: h('div', { class: 'ev-list' }, period,
    h('div', { class: 'chips' }, stateChip(s.state), qualityBadge(s.quality)),
    s.state === 'insufficient' ? insufficientPanel(s) : h('p', { class: 'muted' }, s.finding.observation(s)),
    evidenceFor(s).slice().reverse().map((e) => evidenceRow(e, () => openEvidence({ ...e, findingId: src, findingName: s.finding.name })))) });
}

export function render(_r, ctx) {
  const sc = ctx.state.script;
  const model = scriptModel(sc, ctx.range);
  const { statsById, draft, text, range } = model;
  // Re-renders replace the DOM; FLIP keeps reordered blocks visibly sliding into place.
  const set = (patch) => { const before = captureRects(BLOCK_SEL); setState({ script: { ...sc, ...patch } }); playFlip(before, BLOCK_SEL); };
  const move = (i, d) => {
    const ids = draft.blocks.map((b) => b.id); const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]]; set({ order: ids });
    requestAnimationFrame(() => { const el = document.querySelector(`${BLOCK_SEL.replace('[data-key]', `[data-key="${ids[j]}"]`)} .block-ctl button:not([disabled])`); el && el.focus({ preventScroll: true }); });
  };
  let dragFrom = null;
  const weakened = draft.blocks.filter((b) => b.source && b.ground.kind === 'ungrounded');

  const sources = [...findings.map((f) => ({ id: f.id, name: f.name, s: statsById[f.id] })), { id: 'P1', name: patternWatch.name, s: null }];
  return h('div', { class: 'view script' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, 'Script workspace'), h('h1', null, 'Drafts built on your findings')),
      h('div', { class: 'chips' }, previewChip(), h('label', { class: 'range' }, h('span', { class: 'sr-only' }, 'Episode topic'),
        h('select', { onchange: (e) => set({ topic: e.target.value }) }, scriptTopics.map((t) => h('option', { value: t.id, selected: t.id === sc.topic }, t.title)))))),
    h('p', { class: 'muted lede' }, 'Pick the findings to build from. Every line that comes from your data keeps a link to the videos and seconds behind it. The demo snaps together prepared text — no AI model is called.'),
    h('p', { class: `period-note ${weakened.length ? 'warn' : ''}`, role: 'status' },
      icon('info', 14), h('span', null, `Data period: ${range.label} (${formatDate(range.start)} – ${formatDate(range.end)}). Labels, sources and the export follow the date range at the top.`,
        weakened.length ? ` In this period ${weakened.map((b) => b.source).join(', ')} ${weakened.length === 1 ? 'has' : 'have'} too little data, so ${weakened.length === 1 ? 'its line is' : 'their lines are'} marked as guesses.` : '')),
    h('div', { class: 'script-grid' },
      h('section', { class: 'card sources', 'aria-label': 'Findings to build from' },
        h('h2', { class: 'sub' }, '1 · Pick findings'),
        sources.map((src) => {
          const on = sc.selected.includes(src.id);
          return h('div', { class: `src ${on ? 'on' : ''}` },
            h('label', null, h('input', { type: 'checkbox', checked: on, onchange: () => set({ selected: on ? sc.selected.filter((x) => x !== src.id) : [...sc.selected, src.id] }) }),
              h('span', null, h('strong', null, src.name), src.s ? stateChip(src.s.state) : h('span', { class: 'chip' }, model.pw.n ? `Pattern watch · ${model.pw.n} videos` : 'Pattern watch · none here'))),
            h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: () => inspect(src.id, model) }, icon('eye', 14), 'Sources'));
        }),
        h('details', { class: 'rules-box' }, h('summary', null, 'How the draft is put together'), h('ol', null, RULES.map((r) => h('li', null, r))))),
      h('section', { class: 'card draft', 'aria-label': 'Draft blocks' },
        h('div', { class: 'draft-head' }, h('h2', { class: 'sub' }, '2 · Arrange'),
          h('div', { class: 'btn-row' },
            sc.order ? h('button', { class: 'btn btn-quiet btn-sm', onclick: () => set({ order: null }) }, 'Reset order') : null,
            sc.removed.length ? h('button', { class: 'btn btn-quiet btn-sm', onclick: () => set({ removed: [] }) }, `Bring back (${sc.removed.length})`) : null)),
        h('ol', { class: 'blocks' }, draft.blocks.map((b, i) => {
          const li = h('li', { class: `block g-${b.ground.kind}`, draggable: 'true', 'data-key': b.id },
            h('span', { class: 'drag', 'aria-hidden': 'true' }, icon('drag', 16)),
            h('div', { class: 'block-main' },
              h('div', { class: 'block-meta' }, h('span', { class: 'sec' }, b.section), h('span', { class: `gl ${b.ground.kind}` }, b.ground.label),
                b.source ? h('button', { class: 'cite', onclick: () => inspect(b.source, model) }, b.source) : null),
              h('strong', null, b.label), h('p', null, b.text)),
            h('div', { class: 'block-ctl' },
              h('button', { class: 'btn btn-quiet icon-btn', 'aria-label': `Move ${b.label} up`, disabled: i === 0, onclick: () => move(i, -1) }, icon('up', 16)),
              h('button', { class: 'btn btn-quiet icon-btn', 'aria-label': `Move ${b.label} down`, disabled: i === draft.blocks.length - 1, onclick: () => move(i, 1) }, icon('down', 16)),
              h('button', { class: 'btn btn-quiet icon-btn', 'aria-label': `Remove ${b.label}`, onclick: () => set({ removed: [...sc.removed, b.id] }) }, icon('close', 16))));
          li.addEventListener('dragstart', (e) => { dragFrom = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', b.id); li.classList.add('dragging'); });
          li.addEventListener('dragend', () => li.classList.remove('dragging'));
          li.addEventListener('dragover', (e) => { e.preventDefault(); li.classList.add('over'); });
          li.addEventListener('dragleave', () => li.classList.remove('over'));
          li.addEventListener('drop', (e) => {
            e.preventDefault(); li.classList.remove('over');
            if (dragFrom == null || dragFrom === i) return;
            const ids = draft.blocks.map((x) => x.id); const [m] = ids.splice(dragFrom, 1); ids.splice(i, 0, m); set({ order: ids });
          });
          return li;
        }))),
      h('section', { class: 'card output', 'aria-label': 'Result' },
        h('div', { class: 'draft-head' }, h('h2', { class: 'sub' }, '3 · Your draft'),
          h('div', { class: 'btn-row' },
            h('button', { class: 'btn btn-ghost btn-sm', onclick: () => copyText(text) }, icon('copy', 14), 'Copy'),
            h('button', { class: 'btn btn-primary btn-sm', onclick: () => download(text, `merlark-draft-${draft.topic.id}.md`) }, icon('download', 14), 'Export .md'))),
        h('pre', { class: 'draft-out', tabindex: 0 }, text))));
}
