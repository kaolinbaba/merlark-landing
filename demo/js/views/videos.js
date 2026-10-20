// demo/js/views/videos.js
// Video library (filters, search, sort, select-to-compare) and the video detail page.

import { h, icon } from '../ui/dom.js';
import { toast } from '../ui/overlay.js';
import { thumb, provChip, sectionHead, emptyState, stateChip } from '../ui/components.js';
import { provenanceOf, hasReading, inRange, formatDate, formatShort, formatInt, formatTime, TODAY, videoById, allFindingStats, readingDate } from '../data/derive.js';
import { videos, findings, patternWatch, BACKFILL_LABEL } from '../data/fixtures.js';
import { setState } from '../state.js';
import { videoPreview } from './evidence.js';

const PATTERNS = [
  { id: 'all', label: 'Any pattern' },
  ...findings.map((f) => ({ id: f.id, label: f.name, test: (v) => (f.scope === 'short' ? v.format === 'short' : v.format === 'long') && f.match(v) })),
  { id: 'P1', label: patternWatch.name, test: patternWatch.match },
];
let selected = new Set();

export function render({ params, query }, ctx) {
  if (params[0]) return detail(params[0], Number(query.get('t')) || 0, ctx);
  const { state, range } = ctx;
  const fl = state.videoFilters;
  const setF = (patch) => setState({ videoFilters: { ...fl, ...patch } });
  const pat = PATTERNS.find((p) => p.id === fl.pattern) || PATTERNS[0];
  let list = videos.filter((v) => inRange(v, range))
    .filter((v) => fl.prov === 'all' || provenanceOf(v) === fl.prov)
    .filter((v) => fl.format === 'all' || v.format === fl.format)
    .filter((v) => !pat.test || pat.test(v))
    .filter((v) => !fl.q || v.title.toLowerCase().includes(fl.q.toLowerCase()));
  const [key, dir] = fl.sort.split('-');
  list = list.sort((a, b) => {
    const av = key === 'views' ? (hasReading(a, TODAY) ? a.views7 : -1) : a.date;
    const bv = key === 'views' ? (hasReading(b, TODAY) ? b.views7 : -1) : b.date;
    return (av > bv ? 1 : av < bv ? -1 : 0) * (dir === 'asc' ? 1 : -1);
  });
  selected = new Set([...selected].filter((id) => videoById(id)));
  const compareBtn = h('button', { class: 'btn btn-primary btn-sm', disabled: selected.size < 2,
    onclick: () => { setState((st) => ({ compare: { ...st.compare, mode: 'videos', ids: [...selected].slice(0, 4) } })); ctx.navigate('#/compare'); } },
  icon('compare', 14), `Compare selected (${selected.size})`);
  const toggle = (id, cb) => {
    if (selected.has(id)) selected.delete(id);
    else if (selected.size >= 4) { cb.checked = false; toast('Compare up to 4 videos at a time.', 'error'); return; } else selected.add(id);
    compareBtn.disabled = selected.size < 2;
    compareBtn.lastChild.textContent = `Compare selected (${selected.size})`;
  };

  let searchTimer;
  return h('div', { class: 'view' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, `Video library · ${range.label}`), h('h1', null, `${list.length} video${list.length === 1 ? '' : 's'}`)),
      compareBtn),
    h('div', { class: 'toolbar' },
      h('label', { class: 'search' }, icon('search', 16), h('span', { class: 'sr-only' }, 'Search titles'),
        h('input', { type: 'search', placeholder: 'Search titles', value: fl.q, oninput: (e) => { clearTimeout(searchTimer); const val = e.target.value; searchTimer = setTimeout(() => { setF({ q: val }); const el = document.querySelector('.search input'); if (el) { el.focus(); el.setSelectionRange(val.length, val.length); } }, 250); } })),
      sel('Provenance', fl.prov, [['all', 'All provenance'], ['historical', 'Historical estimate'], ['observed', 'Observed by Merlark']], (v) => setF({ prov: v })),
      sel('Format', fl.format, [['all', 'All formats'], ['long', 'Long-form'], ['short', 'Shorts']], (v) => setF({ format: v })),
      sel('Pattern', fl.pattern, PATTERNS.map((p) => [p.id, p.label]), (v) => setF({ pattern: v })),
      sel('Sort', fl.sort, [['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['views-desc', 'Most 7-day views'], ['views-asc', 'Fewest 7-day views']], (v) => setF({ sort: v }))),
    list.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'vtable' },
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, 'Select')), h('th', { scope: 'col' }, 'Video'), h('th', { scope: 'col' }, 'Published'), h('th', { scope: 'col', class: 'r' }, '7-day views'), h('th', { scope: 'col', class: 'r hide-sm' }, 'Avg. viewed'), h('th', { scope: 'col', class: 'hide-sm' }, 'Provenance'))),
      h('tbody', null, list.map((v) => {
        const cb = h('input', { type: 'checkbox', checked: selected.has(v.id), 'aria-label': `Select ${v.title} for comparison` });
        cb.addEventListener('change', () => toggle(v.id, cb));
        const read = hasReading(v, TODAY);
        return h('tr', null,
          h('td', null, cb),
          h('td', null, h('a', { class: 'vcell', href: `#/videos/${v.id}` }, thumb(v, 96), h('span', null, h('strong', null, v.title), h('small', { class: 'dim' }, `${v.format === 'short' ? 'Short' : 'Long-form'} · ${formatTime(v.dur)}`)))),
          h('td', { class: 'num' }, formatShort(v.date)),
          h('td', { class: 'num r' }, read ? formatInt(v.views7) : h('span', { class: 'pending' }, 'pending')),
          h('td', { class: 'num r hide-sm' }, read ? `${v.avgPct}%` : '—'),
          h('td', { class: 'hide-sm' }, provChip(v)));
      })))) : emptyState('No videos match', 'Clear the filters or widen the date range.',
      h('button', { class: 'btn btn-ghost', onclick: () => setState({ videoFilters: { prov: 'all', format: 'all', pattern: 'all', q: '', sort: 'date-desc' } }) }, 'Clear filters')));
}

function sel(label, value, opts, onChange) {
  return h('label', { class: 'range' }, h('span', { class: 'sr-only' }, label),
    h('select', { onchange: (e) => onChange(e.target.value) }, opts.map(([v, l]) => h('option', { value: v, selected: v === value }, l))));
}

function detail(id, t, ctx) {
  const v = videoById(id);
  if (!v) return emptyState('Video not found', 'This video is not part of the sample channel.', h('a', { class: 'btn btn-primary', href: '#/videos' }, 'Video library'));
  const prov = provenanceOf(v);
  const read = hasReading(v, TODAY);
  const related = allFindingStats(ctx.range).filter((s) => s.groupAll.includes(v));
  const idx = videos.indexOf(v);
  return h('div', { class: 'view video-detail' },
    h('a', { class: 'back', href: '#/videos' }, icon('back', 14), 'Video library'),
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, `${v.format === 'short' ? 'Short' : 'Long-form'} · ${formatDate(v.date)}`), h('h1', null, v.title)),
      provChip(v)),
    prov === 'historical' ? h('p', { class: 'backfill-label' }, icon('info', 14), BACKFILL_LABEL) : null,
    h('div', { class: 'two-col wide-left' },
      h('section', { class: 'card' }, sectionHead('Timeline preview', 'Evidence windows on the video'), videoPreview(v, { at: t })),
      h('section', { class: 'card' },
        sectionHead('Readings', read ? `First 7 days · ${formatShort(v.date)} – ${formatShort(readingDate(v))}` : 'First 7 days in progress'),
        h('dl', { class: 'facts big' },
          h('dt', null, '7-day views'), h('dd', { class: 'num' }, read ? formatInt(v.views7) : 'Pending'),
          h('dt', null, 'Average viewed'), h('dd', { class: 'num' }, read ? `${v.avgPct}%` : '—'),
          v.ret30 != null ? [h('dt', null, 'Still watching at 0:30'), h('dd', { class: 'num' }, read ? `${v.ret30}%` : '—')] : null,
          h('dt', null, 'Duration'), h('dd', { class: 'num' }, formatTime(v.dur)),
          h('dt', null, 'Source'), h('dd', null, prov === 'historical' ? 'Backfill reconstruction' : 'Merlark monitoring snapshot')),
        h('h3', { class: 'sub' }, 'Part of these findings'),
        related.length ? h('ul', { class: 'mini-findings' }, related.map((s) => h('li', null, h('a', { href: `#/findings/${s.finding.id}` }, h('span', null, s.finding.name), stateChip(s.state)))))
          : h('p', { class: 'muted' }, 'This video is not part of a finding in the selected range.'),
        patternWatch.match(v) ? h('p', { class: 'fine' }, h('a', { href: '#/findings/P1' }, 'Also in Pattern watch: shared series template')) : null,
        h('div', { class: 'btn-row' },
          h('a', { class: 'btn btn-ghost btn-sm', href: '#/compare', onclick: () => setState((st) => ({ compare: { ...st.compare, mode: 'videos', ids: [v.id, ...st.compare.ids.filter((x) => x !== v.id)].slice(0, 4) } })) }, icon('compare', 14), 'Add to comparison')))),
    h('nav', { class: 'pager' },
      idx > 0 ? h('a', { class: 'btn btn-quiet btn-sm', href: `#/videos/${videos[idx - 1].id}` }, icon('back', 14), 'Older') : h('span'),
      idx < videos.length - 1 ? h('a', { class: 'btn btn-quiet btn-sm', href: `#/videos/${videos[idx + 1].id}` }, 'Newer', icon('arrow', 14)) : h('span')));
}
