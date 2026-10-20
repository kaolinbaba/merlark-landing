// demo/js/views/evidence.js
// Evidence drawer: "focusing the instrument" on one video at one timestamp.
// Also exports the video timeline preview reused by the video detail page.

import { h, icon, reducedMotion } from '../ui/dom.js';
import { drawer } from '../ui/overlay.js';
import { retentionChart } from '../ui/charts.js';
import { provChip, thumb } from '../ui/components.js';
import { formatTime, formatDate, formatInt, retentionCurve, provenanceOf, readingDate, hasReading, TODAY } from '../data/derive.js';
import { BACKFILL_LABEL, findings, patternWatch } from '../data/fixtures.js';

// Segments for a video: every finding/pattern that matches it contributes its evidence window.
export function segmentsFor(v) {
  const segs = [];
  for (const f of findings) {
    const scopeOk = f.scope === 'short' ? v.format === 'short' : v.format === 'long';
    if (scopeOk && f.match(v)) segs.push({ ...f.evidenceSegment(v), source: f.id, name: f.name });
  }
  if (patternWatch.match(v)) patternWatch.segments(v).forEach((s) => segs.push({ ...s, source: patternWatch.id, name: patternWatch.name }));
  return segs.sort((a, b) => a.start - b.start);
}

export function videoPreview(v, { at = 0, focusSource } = {}) {
  let playhead = at;
  let playing = false; let timer = null;
  const segs = segmentsFor(v);
  const curve = retentionCurve(v);
  const root = h('div', { class: 'vp' });
  const screen = h('div', { class: 'vp-screen' });
  const readout = h('span', { class: 'num vp-time' });
  const chartHost = h('div', { class: 'vp-chart' });
  const scrub = h('input', { type: 'range', min: 0, max: v.dur, step: 1, value: at, class: 'vp-scrub', 'aria-label': 'Playhead position' });
  const playBtn = h('button', { class: 'btn btn-ghost btn-sm', 'aria-label': 'Play sample timeline' });
  const caption = h('p', { class: 'vp-caption', 'aria-live': 'polite' });

  const activeSeg = () => segs.find((s) => playhead >= s.start && playhead <= s.end);
  const jumps = segs.map((s) => h('button', { class: `chip jump ${s.source === focusSource ? 'focus' : ''}`, type: 'button', onclick: () => { playhead = s.start; draw(); } },
    h('span', { class: 'num' }, formatTime(s.start)), ` ${s.label}`));
  function draw() {
    readout.textContent = `${formatTime(playhead)} / ${formatTime(v.dur)}`;
    scrub.value = playhead;
    const seg = activeSeg();
    caption.textContent = seg ? `${seg.label} · ${seg.name}` : 'No evidence window at this point.';
    screen.classList.toggle('in-seg', !!seg);
    // The sample moment being played lights up its jump chip and evidence window.
    jumps.forEach((j, i) => j.classList.toggle('active', segs[i] === seg));
    playBtn.replaceChildren(icon(playing ? 'pause' : 'play', 16), playing ? 'Pause' : 'Play');
    const w = chartHost.clientWidth || 520;
    chartHost.replaceChildren(curve
      ? retentionChart({ curves: [{ pts: curve }], duration: v.dur, width: w, height: 170, playhead,
        markers: segs.map((s) => ({ ...s, tone: s.source === focusSource ? 'focus' : s.source === 'P1' ? 'pattern' : '' })),
        onSeek: (t) => { playhead = Math.round(t); draw(); } })
      : h('p', { class: 'muted pad' }, 'Retention appears once the first 7-day reading is recorded.'));
  }
  scrub.addEventListener('input', () => { playhead = Number(scrub.value); draw(); });
  playBtn.addEventListener('click', () => {
    playing = !playing;
    clearInterval(timer);
    if (playing) timer = setInterval(() => { playhead = Math.min(v.dur, playhead + Math.max(1, Math.round(v.dur / 120))); if (playhead >= v.dur) { playing = false; clearInterval(timer); } if (!root.isConnected) clearInterval(timer); draw(); }, 120);
    draw();
  });
  screen.append(thumb(v, 480), h('div', { class: 'vp-reticle', 'aria-hidden': 'true' }, h('i'), h('i')),
    h('span', { class: 'vp-sample' }, 'Sample frame · no real video'));
  root.append(screen,
    h('div', { class: 'vp-controls' }, playBtn, scrub, readout),
    caption,
    h('div', { class: 'vp-jumps' }, jumps),
    chartHost,
    h('p', { class: 'fine dim' }, curve ? 'Retention curve is synthetic sample data. In the product it needs the yt-analytics.readonly permission, requested only when this view is turned on.' : ''));
  requestAnimationFrame(draw);
  return root;
}

export function openEvidence({ video, segment, findingId, findingName }) {
  const base = document.getElementById('app') ? '' : 'demo/'; // links work from the landing page too
  const prov = provenanceOf(video);
  drawer({
    label: findingName ? `Evidence · ${findingName}` : 'Evidence',
    title: video.title,
    wide: true,
    body: h('div', { class: `ev-drawer ${reducedMotion() ? '' : 'focusing'}` },
      h('div', { class: 'ev-facts' },
        fact('Source', prov === 'historical' ? 'Backfill (reconstructed after connection)' : 'Merlark monitoring snapshot'),
        fact('Published', formatDate(video.date)),
        fact('Relevant period', hasReading(video, TODAY) ? `${formatDate(video.date)} – ${formatDate(readingDate(video))} (first 7 days)` : 'First 7 days, still in progress'),
        fact('Timestamp', `${formatTime(segment.start)}–${formatTime(segment.end)} · ${segment.label}`),
        fact('7-day views', video.views7 != null && hasReading(video, TODAY) ? formatInt(video.views7) : 'Pending'),
        h('div', { class: 'fact' }, h('span', { class: 'dim' }, 'Provenance'), provChip(video))),
      prov === 'historical' ? h('p', { class: 'backfill-label' }, icon('info', 14), BACKFILL_LABEL) : null,
      videoPreview(video, { at: segment.start, focusSource: findingId }),
      h('div', { class: 'ev-links' },
        h('a', { class: 'btn btn-ghost btn-sm', href: `${base}#/videos/${video.id}?t=${segment.start}`, 'data-close-overlay': '' }, 'Open video page', icon('arrow', 14)),
        findingId && findingId.startsWith('F') ? h('a', { class: 'btn btn-quiet btn-sm', href: `${base}#/findings/${findingId}`, 'data-close-overlay': '' }, base ? 'Open finding in demo' : 'Back to finding') : null)),
  });
}

const fact = (k, v) => h('div', { class: 'fact' }, h('span', { class: 'dim' }, k), h('span', null, v));
