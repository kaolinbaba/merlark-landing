// demo/js/data/script-model.js
// Pure, period-aware model of the evidence-grounded script draft (§5.10).
// Labels, source counts, citations and the exported text are all computed from the SAME date range the
// rest of the demo uses, so the draft can never cite stronger evidence than the Findings screen shows.

import { allFindingStats, evidenceFor, patternWatchStats, formatTime, formatMultiplier, formatDate, STATE_LABEL } from './derive.js';
import { patternWatch, scriptTopics, scriptBlocks, scaffoldBlocks } from './fixtures.js';

export const SOURCE_BLOCK = { F1: 'map', F2: 'archive', F3: 'series', F4: 'recap', F5: 'shorts', P1: 'variety' };
export const CANON = ['map', 'archive', 'variety', 's1', 's2', 'recap', 's3', 's4', 'series', 'shorts'];

export function grounding(src, statsById, pw) {
  if (src === 'P1') {
    return pw.n ? { kind: 'grounded', label: 'From Pattern watch' }
      : { kind: 'ungrounded', label: 'An idea to explore' };
  }
  const s = statsById[src];
  if (s.state === 'insufficient') return { kind: 'ungrounded', label: 'An idea to explore' };
  if (s.state === 'emerging') return { kind: 'grounded', label: 'From your videos · one to watch' };
  if (s.state === 'neutral') return { kind: 'grounded', label: 'From your videos · about usual' };
  return { kind: 'grounded', label: `From your videos · ${STATE_LABEL[s.state].toLowerCase()}` };
}

export function assemble(script, statsById, pw) {
  const topic = scriptTopics.find((t) => t.id === script.topic) || scriptTopics[0];
  const present = [];
  for (const id of CANON) {
    if (script.removed.includes(id)) continue;
    const scaffold = scaffoldBlocks.find((b) => b.id === id);
    if (scaffold) { present.push({ id, section: scaffold.section, label: scaffold.label, text: scaffold.text(topic), source: null, ground: { kind: 'structure', label: 'Structure · not from your videos' } }); continue; }
    const src = Object.keys(SOURCE_BLOCK).find((k) => SOURCE_BLOCK[k] === id);
    if (!script.selected.includes(src)) continue;
    const b = scriptBlocks[id];
    present.push({ id, section: b.section, label: b.label, text: b.text(topic), source: src, ground: grounding(src, statsById, pw) });
  }
  // The creator's own ordering is preserved; blocks that newly appear slot in at their rule position.
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

export function sourceLine(src, statsById, pw) {
  if (src === 'P1') {
    return pw.n ? `[P1] ${patternWatch.name}: ${pw.n} videos in this period share one template (Pattern watch, no score).`
      : `[P1] ${patternWatch.name}: no videos in this period share the template. Not used as evidence.`;
  }
  const s = statsById[src];
  const name = s.finding.name;
  if (s.state === 'insufficient') {
    return `[${src}] ${name}: not enough data in this period (${s.n} matching ${s.n === 1 ? 'video has' : 'videos have'} a week-one reading, ${s.nBaseline} others; 3 of each needed). Not used as evidence.`;
  }
  const ev = evidenceFor(s).slice(-3).map((e) => `${e.video.title} ${formatTime(e.segment.start)}–${formatTime(e.segment.end)}`).join('; ');
  return `[${src}] ${name}: ${STATE_LABEL[s.state].toLowerCase()}, ${formatMultiplier(s.multiplier)} your usual, evidence ${s.quality.toLowerCase()}, ${s.n} videos with week-one readings. Examples: ${ev}.`;
}

export function draftText({ topic, blocks }, statsById, pw, range) {
  const lines = [
    `# ${topic.title}`, '',
    'Script outline put together in the Merlark demo from sample findings. No AI model was called.',
    `Data period: ${range.label} (${formatDate(range.start)} – ${formatDate(range.end)}).`, '',
  ];
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
    used.forEach((src) => lines.push(sourceLine(src, statsById, pw)));
  }
  return lines.join('\n');
}

// One call gives a view everything it needs for a script state and a period.
export function scriptModel(script, range) {
  const stats = allFindingStats(range);
  const statsById = Object.fromEntries(stats.map((s) => [s.finding.id, s]));
  const pw = patternWatchStats(range);
  const draft = assemble(script, statsById, pw);
  return { range, stats, statsById, pw, draft, text: draftText(draft, statsById, pw, range) };
}
