// demo/js/data/fixtures.js
// Deterministic synthetic dataset for the Merlark interactive demo.
// One fictional channel. Every screen derives its numbers from these records (see derive.js),
// so dates, totals, charts and findings always agree. Nothing here is real channel data.

export const DEMO_NOW = '2026-10-19T09:00:00Z'; // Monday morning, the latest weekly brief is fresh
export const CONNECTED_AT = '2026-08-24';       // left of this line = historical estimate, right = observed
export const HISTORY_START = '2026-03-01';

export const BACKFILL_LABEL =
  'Historical estimate based on currently accessible content. Deleted, private, or unavailable videos may not be represented.';

export const channel = {
  name: 'Lanternfish Histories',
  handle: '@lanternfish.histories',
  niche: 'Maritime and exploration history explainers',
  subscribersLabel: '84K subscribers',
  language: 'English',
  fictional: true,
};

// opening: 'map' (animated route map in the first seconds) | 'archive' (archival montage before the core question) | 'question' (cold-open question)
// introSec: seconds before the core question is stated.
// template: shares the series title card, music bed and outro script (pattern watch).
// views7: views in the first 7 days. avgPct: average percentage viewed. ret30: % of viewers still watching at 0:30.
const V = (id, date, title, o) => ({ id, date, title, format: 'long', recap: false, template: false, partTitle: false, cutdownOf: null, ...o });

export const videos = [
  V('v01', '2026-03-04', 'The Lighthouse That Went Dark Overnight', { opening: 'question', introSec: 12, dur: 860, views7: 19400, avgPct: 47, ret30: 63 }),
  V('v02', '2026-03-11', 'Why Sailors Feared the Doldrums', { opening: 'archive', introSec: 52, dur: 965, views7: 15800, avgPct: 41, ret30: 55 }),
  V('v03', '2026-03-18', 'The Ship Found Sailing With No Crew', { opening: 'question', introSec: 10, dur: 820, views7: 21900, avgPct: 48, ret30: 64 }),
  V('v04', '2026-03-25', 'The Last Voyage of the Erebus, Part 1', { opening: 'question', introSec: 21, dur: 1040, views7: 21400, avgPct: 46, ret30: 62, template: true, partTitle: true }),
  V('v05', '2026-04-01', 'The Last Voyage of the Erebus, Part 2', { opening: 'question', introSec: 21, dur: 1010, views7: 20900, avgPct: 45, ret30: 61, template: true, partTitle: true }),
  V('v06', '2026-04-08', 'The Last Voyage of the Erebus, Part 3', { opening: 'question', introSec: 21, dur: 1095, views7: 22300, avgPct: 46, ret30: 62, template: true, partTitle: true }),
  V('v07', '2026-04-15', 'How a Single Map Error Sank a Fleet', { opening: 'map', introSec: 9, dur: 905, views7: 27400, avgPct: 52, ret30: 70 }),
  V('v08', '2026-04-22', 'The Island That Vanished From the Charts', { opening: 'archive', introSec: 48, dur: 930, views7: 16300, avgPct: 42, ret30: 56 }),
  V('v09', '2026-04-29', 'Inside the Great Tea Clipper Races', { opening: 'question', introSec: 11, dur: 875, views7: 22300, avgPct: 47, ret30: 63 }),
  V('v10', '2026-05-06', 'The Mutiny Nobody Reported', { opening: 'question', introSec: 13, dur: 790, views7: 18800, avgPct: 46, ret30: 61 }),
  V('v11', '2026-05-13', 'The Four-Second Rogue Wave', { format: 'short', opening: 'question', introSec: 2, dur: 48, views7: 41000, avgPct: 78, ret30: null }),
  V('v12', '2026-05-20', 'Across the Northwest Passage by Sledge', { opening: 'map', introSec: 8, dur: 1120, views7: 28100, avgPct: 53, ret30: 71 }),
  V('v13', '2026-05-27', 'The Salt Road: Trade Before Refrigeration', { opening: 'archive', introSec: 44, dur: 980, views7: 17100, avgPct: 43, ret30: 57 }),
  V('v14', '2026-06-03', 'The Harbor Fire of 1866', { opening: 'question', introSec: 12, dur: 845, views7: 21000, avgPct: 47, ret30: 63 }),
  V('v15', '2026-06-10', 'The Lost Whalers of the Arctic, Part 1', { opening: 'question', introSec: 21, dur: 1065, views7: 22400, avgPct: 45, ret30: 61, template: true, partTitle: true }),
  V('v16', '2026-06-17', 'The Lost Whalers of the Arctic, Part 2', { opening: 'question', introSec: 21, dur: 1030, views7: 22600, avgPct: 46, ret30: 62, template: true, partTitle: true }),
  V('v17', '2026-06-24', 'Following the Spice Route Mile by Mile', { opening: 'map', introSec: 7, dur: 1150, views7: 29200, avgPct: 54, ret30: 72 }),
  V('v18', '2026-07-01', 'Why Old Ships Were Painted With Eyes', { opening: 'question', introSec: 10, dur: 760, views7: 20400, avgPct: 46, ret30: 62 }),
  V('v19', '2026-07-15', 'The Shipwreck Coast, Explained', { opening: 'map', introSec: 8, dur: 990, views7: 28600, avgPct: 53, ret30: 71 }),
  V('v20', '2026-07-29', 'The Pearl Divers of the Gulf', { opening: 'archive', introSec: 56, dur: 1005, views7: 15200, avgPct: 40, ret30: 54 }),
  V('v21', '2026-08-12', 'The Clockmaker Who Solved Longitude', { opening: 'question', introSec: 11, dur: 935, views7: 22800, avgPct: 48, ret30: 64 }),
  V('v22', '2026-08-19', 'Why Portholes Are Round', { format: 'short', opening: 'question', introSec: 2, dur: 41, views7: 38000, avgPct: 81, ret30: null }),
  // ---- connection: 2026-08-24 ----
  V('v23', '2026-08-26', 'The Convoy That Sailed Into Fog', { opening: 'map', introSec: 9, dur: 1010, views7: 29900, avgPct: 55, ret30: 72 }),
  V('v24', '2026-09-02', 'Ghost Lights of the Skeleton Coast', { opening: 'archive', introSec: 61, dur: 1045, views7: 14100, avgPct: 39, ret30: 52 }),
  V('v25', '2026-09-09', 'The Lost Whalers of the Arctic, Part 3', { opening: 'question', introSec: 21, dur: 1080, views7: 22900, avgPct: 45, ret30: 61, template: true, partTitle: true }),
  V('v26', '2026-09-16', 'Charting the Great Barrier Reef by Hand', { opening: 'map', introSec: 8, dur: 1100, views7: 30400, avgPct: 55, ret30: 73 }),
  V('v27', '2026-09-23', 'The Iceberg Patrol', { opening: 'map', introSec: 7, dur: 1130, views7: 31800, avgPct: 57, ret30: 74, recap: true }),
  V('v28', '2026-09-30', "Smugglers' Tunnels Under the Docks", { opening: 'question', introSec: 12, dur: 960, views7: 25600, avgPct: 51, ret30: 66, recap: true }),
  V('v32', '2026-10-02', "Smugglers' Tunnels in 45 Seconds", { format: 'short', opening: 'question', introSec: 2, dur: 45, views7: 33800, avgPct: 76, ret30: null, cutdownOf: 'v28' }),
  V('v29', '2026-10-07', 'The Ship That Was Built to Sink', { opening: 'question', introSec: 14, dur: 1015, views7: 24900, avgPct: 50, ret30: 65, recap: true }),
  V('v30', '2026-10-10', 'Racing the Monsoon', { opening: 'map', introSec: 8, dur: 1060, views7: 30200, avgPct: 56, ret30: 73 }),
  V('v31', '2026-10-16', 'The Iceberg Patrol in 50 Seconds', { format: 'short', opening: 'question', introSec: 2, dur: 50, views7: null, avgPct: null, ret30: null, cutdownOf: 'v27' }),
];
// v31 is younger than 7 days on DEMO_NOW, so it has no 7-day reading yet (shown as "pending").

// Finding definitions. The STATE is never stored: derive.js assigns it from the data with fixed, documented rules.
export const findings = [
  {
    id: 'F1',
    name: 'Map-first openings',
    kind: 'performance',
    scope: 'long',
    match: (v) => v.opening === 'map',
    observation: (s) => `${s.n} long videos open with an animated route map in the first 10 seconds.`,
    interpretation: 'Showing the route first may help viewers get their bearings faster. That’s our guess from the numbers, not a proven cause.',
    evidenceSegment: (v) => ({ start: 0, end: v.introSec + 1, label: 'Animated route map before narration' }),
    action: 'Try a map in the first 10 seconds of your next travel episode.',
    scriptKey: 'map',
  },
  {
    id: 'F2',
    name: 'Long archival intros',
    kind: 'performance',
    scope: 'long',
    match: (v) => v.opening === 'archive',
    observation: (s) => `${s.n} long videos play 40 seconds or more of archive footage before asking the main question.`,
    interpretation: 'A long wait for the question might lose early viewers. Other differences between these videos could explain it too.',
    evidenceSegment: (v) => ({ start: 0, end: v.introSec, label: 'Archive footage before the main question' }),
    action: 'Keep archive footage under 20 seconds and ask the question first.',
    scriptKey: 'archive',
  },
  {
    id: 'F3',
    name: '"Part N" series titles',
    kind: 'performance',
    scope: 'long',
    match: (v) => v.partTitle,
    observation: (s) => `${s.n} videos use a "Part N" series title.`,
    interpretation: 'So far, series titles do about as well as your usual.',
    evidenceSegment: () => ({ start: 0, end: 4, label: 'Series title card' }),
    action: 'Nothing to change. Merlark keeps an eye on it as more episodes come out.',
    scriptKey: 'series',
  },
  {
    id: 'F4',
    name: 'Mid-video recap',
    kind: 'performance',
    scope: 'long',
    match: (v) => v.recap,
    observation: (s) => `${s.n} recent videos have a short recap near the middle.`,
    interpretation: 'A recap might help viewers who drift off mid-video. It’s new, and one of these videos also opens with a map, so the two overlap.',
    evidenceSegment: (v) => { const t = Math.round(v.dur * 0.52); return { start: t, end: t + 35, label: 'Recap' }; },
    action: 'Keep the recap in your next two videos so there’s enough data to tell.',
    scriptKey: 'recap',
  },
  {
    id: 'F5',
    name: 'Shorts cut from long videos',
    kind: 'performance',
    scope: 'short',
    match: (v) => v.format === 'short' && !!v.cutdownOf,
    baselineMatch: (v) => v.format === 'short' && !v.cutdownOf,
    observation: (s) => `${s.n} Shorts are cut from one of your long videos.`,
    interpretation: 'There aren’t enough similar Shorts to say anything yet.',
    evidenceSegment: () => ({ start: 0, end: 6, label: 'Start of the cut-down' }),
    action: 'Nothing to try yet. Merlark keeps collecting similar Shorts.',
    scriptKey: 'shorts',
  },
];

// Pattern watch: structural observations shown next to (never inside) the performance findings.
// No score, category or monetization statement — the observation, its evidence, and the published policy context.
export const patternWatch = {
  id: 'P1',
  name: 'Shared series template',
  match: (v) => v.template,
  observation: (n) => `${n} videos share the same title card, music, narration order and closing lines.`,
  segments: (v) => [
    { start: 0, end: 21, label: 'Same title card and music' },
    { start: v.dur - 40, end: v.dur, label: 'Same closing lines' },
  ],
  policyContext:
    "YouTube's published monetization policies describe \"inauthentic content\" as mass-produced or repetitive content, for example videos made from a template with little variation. This is our summary, not YouTube's wording.",
  policyUrl: 'https://support.google.com/youtube/answer/1311392',
  disclaimer: 'Merlark only shows what looks alike, and where. It doesn’t estimate monetization status or predict any YouTube decision.',
};

// Monitoring log (category 5 — what Merlark recorded while connected). Generated deterministically from the videos above.
export const extraEvents = [
  { date: '2026-08-24', time: '14:02', type: 'connect', text: 'Channel connected with read-only access (youtube.readonly).' },
  { date: '2026-08-24', time: '14:09', type: 'backfill', text: 'History rebuilt: 22 earlier videos added as historical estimates.' },
  { date: '2026-08-24', time: '14:11', type: 'scope', text: 'Retention view turned on: you granted yt-analytics.readonly.' },
  { date: '2026-10-03', time: '06:00', type: 'error', text: 'A check couldn’t reach YouTube (quota window). It worked on retry at 08:10.' },
  { date: '2026-10-14', time: '18:30', type: 'finding', text: 'Mid-video recap now has three first-week readings, so it shows up as emerging.' },
];

// Interventions (category 6) and outcomes (category 7). Outcomes are independently observed or creator-reported,
// never Merlark's own finding re-stated.
export const seedInterventions = [
  {
    id: 'I1', findingId: 'F1', title: 'Open travel episodes on a route map',
    status: 'outcome', created: '2026-08-28', started: '2026-09-01', ended: '2026-09-30',
    appliedTo: ['v26', 'v27'],
    outcome: { kind: 'observed', note: 'Both videos opened on a route map. Their first-week views sit next to your usual below.' },
    creatorNote: 'Your note: the map adds about an hour of editing per video.',
  },
  {
    id: 'I2', findingId: 'F2', title: 'Keep archive footage under 20 seconds',
    status: 'active', created: '2026-09-30', started: '2026-10-01', ended: null,
    appliedTo: ['v29', 'v30'], target: 3,
    outcome: null, creatorNote: '',
  },
];

// Script workspace: prepared topics and blocks. Evidence-backed blocks name the finding they come from;
// structure blocks are labelled as scaffolding, not evidence.
export const scriptTopics = [
  { id: 't1', title: 'The Lighthouse Keepers Who Vanished', place: 'a remote island lighthouse', route: 'the supply boat route from the mainland to the island', question: 'Where did three keepers go in a single winter week?' },
  { id: 't2', title: "The Cartographer's Forgery", place: 'a mapmaker’s workshop in a busy port', route: 'the trade route the forged chart claimed was safe', question: 'Why did captains trust a chart that was wrong on purpose?' },
  { id: 't3', title: 'One Winter on the Ice Patrol', place: 'a patrol ship in the North Atlantic', route: 'the shipping lane the patrol was guarding', question: 'How do you find an iceberg in fog before it finds you?' },
];

export const scriptBlocks = {
  map: { section: 'Opening', label: 'Route map open', text: (t) => `[0:00–0:10] Animated map: trace ${t.route}. No narration for the first beat, then: "${t.question}"` },
  archive: { section: 'Opening', label: 'Short archive beat', text: (t) => `[0:10–0:25] Archive stills of ${t.place}, under 20 seconds. The question is already asked.` },
  recap: { section: 'Middle', label: 'Midpoint recap', text: () => '[Midpoint] 30-second recap: the three facts so far, and the one that doesn’t fit.' },
  series: { section: 'Packaging', label: 'Title note', text: () => 'Series or standalone title: no difference on this channel so far. Pick the clearer one.' },
  shorts: { section: 'Packaging', label: 'Shorts idea', text: (t) => `Cut a 45-second Short from the opening map sequence of "${t.title}".` },
  variety: { section: 'Opening', label: 'Fresh opening line', text: (t) => `Write an opening line just for ${t.place}. Don’t reuse the series title card or closing lines.` },
};

export const scaffoldBlocks = [
  { id: 's1', section: 'Middle', label: 'Chapter 1: the setting', text: (t) => `Chapter 1: life at ${t.place} before it happened.` },
  { id: 's2', section: 'Middle', label: 'Chapter 2: the record', text: () => 'Chapter 2: what the records say, and what they leave out.' },
  { id: 's3', section: 'Middle', label: 'Chapter 3: the theories', text: () => 'Chapter 3: three explanations, checked against the facts.' },
  { id: 's4', section: 'Close', label: 'Close', text: (t) => `Close: come back to the opening question: "${t.question}"` },
];
