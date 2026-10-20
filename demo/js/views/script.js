// demo/js/views/script.js
// Evidence-grounded script workspace (§5.10). Drafts are assembled from prepared text by fixed rules —
// no AI model is called in the demo. Every evidence-backed block names the finding it comes from;
// structure blocks and insufficient-evidence ideas are labelled as not evidence-backed.

import { h, icon } from '../ui/dom.js';
import { drawer, toast } from '../ui/overlay.js';
import { stateChip, qualityBadge, evidenceRow, previewChip } from '../ui/components.js';
import { allFindingStats, getRange, evidenceFor, patternWatchStats, formatTime } from '../data/derive.js';
import { findings, patternWatch, scriptTopics, scriptBlocks, scaffoldBlocks } from '../data/fixtures.js';
import { setState } from '../state.js';
import { openEvidence } from './evidence.js';

const SOURCE_BLOCK = { F1: 'map', F2: 'archive', F3: 'series', F4: 'recap', F5: 'shorts', P1: 'variety' };
const CANON = ['map', 'archive', 'variety', 's1', 's2', 'recap', 's3', 's4', 'series', 'shorts'];
const RULES = [
  'Openings come first: route map, then any archival beat, then the episode-specific line.',
  'The recap sits between chapters 2 and 3, near the midpoint.',
  'Structure blocks are always included and are marked as not evidence-backed.',
  'Packaging notes go after the close.',
  'Findings with insufficient evidence can be added, but only as labelled ungrounded suggestions.',
];

function grounding(src, statsById) {
  if (src === 'P1') return { kind: 'grounded', label: 'From Pattern watch evidence' };
  const s = statsById[src];
  if (s.state === 'insufficient') return { kind: 'ungrounded', label: 'Ungrounded suggestion · insufficient evidence' };
  if (s.state === 'emerging') return { kind: 'grounded', label: 'Evidence-backed · emerging, limited evidence' };
  if (s.state === 'neutral') return { kind: 'grounded', label: 'Evidence-backed · no difference found' };
  return { kind: 'grounded', label: `Evidence-backed · ${s.state}` };
}

export function assemble(script, statsById) {
  const topic = scriptTopics.find((t) => t.id === script.topic) || scriptTopics[0];
  const present = [];
  for (const id of CANON) {
    if (script.removed.includes(id)) continue;
    const scaffold = scaffoldBlocks.find((b) => b.id === id);
    if (scaffold) { present.push({ id, ...scaffold, text: scaffold.text(topic), source: null, ground: { kind: 'structure', label: 'Structure · not evidence-backed' } }); continue; }
    const src = Object.keys(SOURCE_BLOCK).find((k) => SOURCE_BLOCK[k] === id);
    if (!script.selected.includes(src)) continue;
    const b = scriptBlocks[id];
    present.push({ id, section: b.section, label: b.label, text: b.text(topic), source: src, ground: grounding(src, statsById) });
  }
  if (!script.order) return { topic, blocks: present };
  const ordered = script.order.map((id) => present.find((b) => b.id === id)).filter(Boolean);
  for (const b of present) {
    if (ordered.includes(b)) continue;
    const ci = CANON.indexOf(b.id);
    const at = ordered.findIndex((x) => CANON.indexOf(x.id) > ci);
    ordered.splice(at < 0 ? ordered.length : at, 0, b);
  }
  return { topic, blocks: ordered };
}

export function draftText({ topic, blocks }, statsById) {
  const lines = [`# ${topic.title}`, '', 'Script outline assembled in the Merlark interactive demo from sample findings. No AI model was called.', ''];
  let section = null;
  blocks.forEach((b) => {
    if (b.section !== section) { section = b.section; lines.push(`## ${section}`); }
    const tag = b.source ? ` [${b.source}]` : '';
    const flag = b.ground.kind === 'ungrounded' ? ' (ungrounded suggestion)' : b.ground.kind === 'structure' ? ' (structure)' : '';
    lines.push(`- ${b.text}${tag}${flag}`);
  });
  const used = [...new Set(blocks.map((b) => b.source).filter(Boolean))];
  if (used.length) {
    lines.push('', '## Sources');
    used.forEach((src) => {
      if (src === 'P1') { lines.push(`[P1] ${patternWatch.name}: ${patternWatchStats(getRange('all')).n} uploads share one template (Pattern watch, no score).`); return; }
      const s = statsById[src];
      const ev = evidenceFor(s).slice(-3).map((e) => `${e.video.title} ${formatTime(e.segment.start)}–${formatTime(e.segment.end)}`).join('; ');
      lines.push(`[${src}] ${s.finding.name}: ${s.state}, evidence ${s.quality.toLowerCase()}, ${s.groupAll.length} videos. ${ev ? 'Examples: ' + ev + '.' : ''}`);
    });
  }
  return lines.join('\n');
}

function copyText(text) {
  const fallback = () => {
    const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = text; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove(); toast(ok ? 'Draft copied.' : 'Copy failed. Select the text and copy it manually.', ok ? 'ok' : 'error');
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

function inspect(src, statsById) {
  if (src === 'P1') {
    const pw = patternWatchStats(getRange('all'));
    drawer({ label: 'Source · Pattern watch', title: patternWatch.name, body: h('div', { class: 'ev-list' },
      h('p', { class: 'muted' }, patternWatch.observation(pw.n)),
      pw.videos.map((v) => { const seg = patternWatch.segments(v)[0]; return evidenceRow({ video: v, segment: seg }, () => openEvidence({ video: v, segment: seg, findingId: 'P1', findingName: patternWatch.name })); })) });
    return;
  }
  const s = statsById[src];
  drawer({ label: `Source · ${src}`, title: s.finding.name, body: h('div', { class: 'ev-list' },
    h('div', { class: 'chips' }, stateChip(s.state), qualityBadge(s.quality)),
    h('p', { class: 'muted' }, s.finding.observation(s)),
    evidenceFor(s).slice().reverse().map((e) => evidenceRow(e, () => openEvidence({ ...e, findingId: src, findingName: s.finding.name })))) });
}

export function render(_r, ctx) {
  const sc = ctx.state.script;
  const stats = allFindingStats(getRange('all'));
  const statsById = Object.fromEntries(stats.map((s) => [s.finding.id, s]));
  const draft = assemble(sc, statsById);
  const text = draftText(draft, statsById);
  const set = (patch) => setState({ script: { ...sc, ...patch } });
  const move = (i, d) => {
    const ids = draft.blocks.map((b) => b.id); const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]]; set({ order: ids });
  };
  let dragFrom = null;

  const sources = [...findings.map((f) => ({ id: f.id, name: f.name, s: statsById[f.id] })), { id: 'P1', name: patternWatch.name, s: null }];
  return h('div', { class: 'view script' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, 'Act · Evidence-grounded'), h('h1', null, 'Script workspace')),
      h('div', { class: 'chips' }, previewChip(), h('label', { class: 'range' }, h('span', { class: 'sr-only' }, 'Episode topic'),
        h('select', { onchange: (e) => set({ topic: e.target.value }) }, scriptTopics.map((t) => h('option', { value: t.id, selected: t.id === sc.topic }, t.title)))))),
    h('p', { class: 'muted lede' }, 'Pick the findings to build from. Each evidence-backed line keeps a link to the videos and timestamps behind it. The demo assembles prepared text; no AI model is called.'),
    h('div', { class: 'script-grid' },
      h('section', { class: 'card sources', 'aria-label': 'Findings to build from' },
        h('h2', { class: 'sub' }, '1 · Findings'),
        sources.map((src) => {
          const on = sc.selected.includes(src.id);
          return h('div', { class: `src ${on ? 'on' : ''}` },
            h('label', null, h('input', { type: 'checkbox', checked: on, onchange: () => set({ selected: on ? sc.selected.filter((x) => x !== src.id) : [...sc.selected, src.id] }) }),
              h('span', null, h('strong', null, src.name), src.s ? stateChip(src.s.state) : h('span', { class: 'chip' }, 'Pattern watch'))),
            h('button', { class: 'btn btn-quiet btn-sm', onclick: () => inspect(src.id, statsById) }, icon('eye', 14), 'Inspect sources'));
        }),
        h('details', { class: 'rules-box' }, h('summary', null, 'Assembly rules'), h('ol', null, RULES.map((r) => h('li', null, r))))),
      h('section', { class: 'card draft', 'aria-label': 'Draft blocks' },
        h('div', { class: 'draft-head' }, h('h2', { class: 'sub' }, '2 · Draft'),
          h('div', { class: 'btn-row' },
            sc.order ? h('button', { class: 'btn btn-quiet btn-sm', onclick: () => set({ order: null }) }, 'Reset order') : null,
            sc.removed.length ? h('button', { class: 'btn btn-quiet btn-sm', onclick: () => set({ removed: [] }) }, `Restore removed (${sc.removed.length})`) : null)),
        h('ol', { class: 'blocks' }, draft.blocks.map((b, i) => {
          const li = h('li', { class: `block g-${b.ground.kind}`, draggable: 'true' },
            h('span', { class: 'drag', 'aria-hidden': 'true' }, icon('drag', 16)),
            h('div', { class: 'block-main' },
              h('div', { class: 'block-meta' }, h('span', { class: 'sec' }, b.section), h('span', { class: `gl ${b.ground.kind}` }, b.ground.label),
                b.source ? h('button', { class: 'cite', onclick: () => inspect(b.source, statsById) }, b.source) : null),
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
        h('div', { class: 'draft-head' }, h('h2', { class: 'sub' }, '3 · Result'),
          h('div', { class: 'btn-row' },
            h('button', { class: 'btn btn-ghost btn-sm', onclick: () => copyText(text) }, icon('copy', 14), 'Copy'),
            h('button', { class: 'btn btn-primary btn-sm', onclick: () => download(text, `merlark-draft-${draft.topic.id}.md`) }, icon('download', 14), 'Export .md'))),
        h('pre', { class: 'draft-out', tabindex: 0 }, text))));
}
