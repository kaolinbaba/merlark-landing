// demo/js/data/derive.js
// Pure functions that turn fixtures into everything the screens show.
// Finding states and evidence quality are assigned by the fixed rules in STATE_RULES — never hand-set.

import {
  videos, findings, patternWatch, extraEvents, CONNECTED_AT, HISTORY_START, DEMO_NOW,
} from './fixtures.js';

const DAY = 86400000;
export const toMs = (iso) => Date.parse(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
export const addDays = (iso, n) => new Date(toMs(iso) + n * DAY).toISOString().slice(0, 10);
export const TODAY = DEMO_NOW.slice(0, 10);
export const LAST_COMPLETE_DAY = addDays(TODAY, -1);

const fmtDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const fmtShort = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const formatDate = (iso) => fmtDate.format(toMs(iso));
export const formatShort = (iso) => fmtShort.format(toMs(iso));
export const formatInt = (n) => (n == null ? '—' : Math.round(n).toLocaleString('en-US'));
export const formatTime = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
// §5.8: the only decimal allowed in user-facing copy is a measured performance multiplier, one decimal.
export const formatMultiplier = (m) => (m == null ? '—' : `${m.toFixed(1)}×`);

export const RANGES = [
  { id: 'all', label: 'All history', start: HISTORY_START },
  { id: '6m', label: 'Last 6 months', start: addDays(LAST_COMPLETE_DAY, -182) },
  { id: '90d', label: 'Last 90 days', start: addDays(LAST_COMPLETE_DAY, -90) },
  { id: 'since', label: 'Since connection', start: CONNECTED_AT },
];
export const getRange = (id, end = LAST_COMPLETE_DAY) => {
  const r = RANGES.find((x) => x.id === id) || RANGES[0];
  return { ...r, end };
};

export const provenanceOf = (v) => (v.date < CONNECTED_AT ? 'historical' : 'observed');
export const videoById = (id) => videos.find((v) => v.id === id);
export const inRange = (v, range) => v.date >= range.start && v.date <= range.end;
// A 7-day reading exists only once seven full days have passed by the range end.
export const hasReading = (v, end) => v.views7 != null && addDays(v.date, 7) <= end;
export const readingDate = (v) => addDays(v.date, 7);

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export const STATE_RULES = [
  { state: 'insufficient', rule: 'Fewer than 3 matching videos, or fewer than 3 of your other videos, with a first-week reading.' },
  { state: 'emerging', rule: 'First spotted in the last 35 days, and at least 1.1× your usual.' },
  { state: 'working', rule: 'At least 1.2× your usual.' },
  { state: 'slipping', rule: '0.9× your usual or less.' },
  { state: 'neutral', rule: 'Between 0.9× and 1.2× your usual.' },
];
export const STATE_LABEL = {
  working: 'Working', slipping: 'Slipping', neutral: 'Neutral', emerging: 'Emerging', insufficient: 'Not enough data yet',
};
export const QUALITY_HELP = {
  Strong: '6+ matching videos, and at least 80% of them land on the same side of your usual.',
  Moderate: '4+ matching videos, and at least 60% land on the same side of your usual.',
  Limited: '3 matching videos, or results that point different ways.',
  Insufficient: 'Not enough similar videos to read this pattern yet.',
};

const firstSeen = (f) => videos.filter(f.match).map((v) => v.date).sort()[0];

// Core computation for one finding over one date range.
export function findingStats(f, range) {
  const pool = videos.filter((v) => inRange(v, range));
  const scoped = pool.filter((v) => (f.scope === 'short' ? v.format === 'short' : v.format === 'long'));
  const groupAll = scoped.filter(f.match);
  const group = groupAll.filter((v) => hasReading(v, range.end));
  const pending = groupAll.filter((v) => !hasReading(v, range.end));
  const baseline = scoped.filter((v) => (f.baselineMatch ? f.baselineMatch(v) : !f.match(v))).filter((v) => hasReading(v, range.end));
  const n = group.length;
  const out = { finding: f, range, n, nBaseline: baseline.length, group, groupAll, pending, baseline, firstSeen: firstSeen(f) };
  if (n < 3 || baseline.length < 3) {
    return { ...out, state: 'insufficient', quality: 'Insufficient', multiplier: null };
  }
  const baseMed = median(baseline.map((v) => v.views7));
  const grpMean = mean(group.map((v) => v.views7));
  const multiplier = grpMean / baseMed;
  const above = group.filter((v) => v.views7 >= baseMed).length;
  const consistency = multiplier >= 1 ? above / n : (n - above) / n;
  const retGroup = f.scope === 'long' ? Math.round(mean(group.map((v) => v.ret30))) : null;
  const retBase = f.scope === 'long' ? Math.round(mean(baseline.map((v) => v.ret30))) : null;
  const avgGroup = Math.round(mean(group.map((v) => v.avgPct)));
  const avgBase = Math.round(mean(baseline.map((v) => v.avgPct)));
  let quality = 'Limited';
  if (n >= 6 && consistency >= 0.8) quality = 'Strong';
  else if (n >= 4 && consistency >= 0.6) quality = 'Moderate';
  const recent = out.firstSeen >= addDays(range.end, -35);
  // Rules use the multiplier exactly as displayed (one decimal), so the label and the number never disagree.
  const shown = Math.round(multiplier * 10) / 10;
  let state = 'neutral';
  if (recent && shown >= 1.1) state = 'emerging';
  else if (shown >= 1.2) state = 'working';
  else if (shown <= 0.9) state = 'slipping';
  return {
    ...out, state, quality, multiplier, consistency,
    groupViews: Math.round(grpMean), baselineViews: Math.round(baseMed),
    retGroup, retBase, avgGroup, avgBase,
  };
}

export const allFindingStats = (range) => findings.map((f) => findingStats(f, range));

export function patternWatchStats(range) {
  const vids = videos.filter((v) => inRange(v, range) && patternWatch.match(v));
  return { n: vids.length, videos: vids };
}

// The "main finding" is the strongest-evidence finding that is not neutral or insufficient.
export function mainFinding(stats) {
  const order = { Strong: 3, Moderate: 2, Limited: 1, Insufficient: 0 };
  const pick = stats.filter((s) => !['neutral', 'insufficient'].includes(s.state))
    .sort((a, b) => order[b.quality] - order[a.quality] || Math.abs(Math.log(b.multiplier)) - Math.abs(Math.log(a.multiplier)));
  return pick[0] || stats[0];
}

export const evidenceFor = (s) => s.groupAll.map((v) => ({ video: v, segment: s.finding.evidenceSegment(v) }));

// Monitoring log (category 5). Built from the videos so dates always agree.
export function monitoringLog() {
  const ev = [...extraEvents];
  for (const v of videos) {
    if (v.date < CONNECTED_AT) continue;
    ev.push({ date: v.date, time: '18:20', type: 'upload', videoId: v.id, text: `New upload spotted: "${v.title}".` });
    if (hasReading(v, TODAY)) {
      ev.push({ date: readingDate(v), time: '18:25', type: 'reading', videoId: v.id, text: `First-week reading saved for "${v.title}": ${formatInt(v.views7)} views.` });
    }
  }
  return ev.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}
export const LAST_CHECK = { date: LAST_COMPLETE_DAY, time: '21:40' };

// Weekly briefs: Monday-to-Sunday weeks after connection, each computed as of that week's end.
export function weeks() {
  const out = [];
  for (let start = CONNECTED_AT; addDays(start, 6) <= LAST_COMPLETE_DAY; start = addDays(start, 7)) {
    out.push({ start, end: addDays(start, 6), id: start });
  }
  return out.reverse();
}
export function briefFor(week) {
  const range = { id: 'brief', label: 'As of week end', start: HISTORY_START, end: week.end };
  const prevRange = { ...range, end: addDays(week.start, -1) };
  const stats = allFindingStats(range);
  const prev = allFindingStats(prevRange);
  const uploads = videos.filter((v) => v.date >= week.start && v.date <= week.end);
  const readings = videos.filter((v) => hasReading(v, week.end) && readingDate(v) >= week.start && readingDate(v) <= week.end);
  const changes = stats.map((s, i) => ({ s, from: prev[i].state })).filter((c) => c.s.state !== c.from);
  const log = monitoringLog().filter((e) => e.date >= week.start && e.date <= week.end);
  return { week, range, stats, uploads, readings, changes, log, main: mainFinding(stats) };
}

// Synthetic audience-retention curve (percent of viewers remaining) used by the timeline preview.
export function retentionCurve(v) {
  if (v.avgPct == null) return null;
  const pts = [];
  const steps = 60;
  const start = v.format === 'short' ? 100 : 100;
  const at30 = v.format === 'short' ? null : v.ret30;
  const endVal = Math.max(8, Math.min(95, v.format === 'short' ? 2 * v.avgPct - 100 : 2 * v.avgPct - v.ret30));
  const recapAt = v.recap ? v.dur * 0.52 : null;
  for (let i = 0; i <= steps; i++) {
    const t = (v.dur * i) / steps;
    let r;
    if (at30 != null && t <= 30) r = start - ((start - at30) * t) / 30;
    else if (at30 != null) r = at30 - ((at30 - endVal) * (t - 30)) / (v.dur - 30);
    else r = start - ((start - endVal) * t) / v.dur;
    if (recapAt && t > recapAt) r += Math.min(4, (t - recapAt) / 30);
    // small deterministic texture so curves do not look ruled
    r += Math.sin(i * 1.7 + v.dur) * 0.8;
    pts.push({ t, r: Math.max(0, Math.min(100, r)) });
  }
  return pts;
}

export const channelTotals = (range) => {
  const vs = videos.filter((v) => inRange(v, range));
  return {
    uploads: vs.length,
    long: vs.filter((v) => v.format === 'long').length,
    shorts: vs.filter((v) => v.format === 'short').length,
    historical: vs.filter((v) => provenanceOf(v) === 'historical').length,
    observed: vs.filter((v) => provenanceOf(v) === 'observed').length,
    pendingReadings: vs.filter((v) => !hasReading(v, range.end)).length,
  };
};
