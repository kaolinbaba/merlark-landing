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
  icon('compare', 16), `Compare (${selected.size})`);
  const toggle = (id, cb) => {
    if (selected.has(id)) selected.delete(id);
    else if (selected.size >= 4) { cb.checked = false; toast('Up to 4 videos at once.', 'error'); return; } else selected.add(id);
    compareBtn.disabled = selected.size < 2;
    compareBtn.lastChild.textContent = `Compare (${selected.size})`;
  };

  let searchTimer;
  return h('div', { class: 'view' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, `${range.label} · ${list.length} video${list.length === 1 ? '' : 's'}`), h('h1', null, 'Your videos, all together.'), h('p', { class: 'desc' }, 'Pick a video to see its place in the bigger picture.')),
      compareBtn),
    h('div', { class: 'toolbar' },
      h('label', { class: 'search' }, icon('search', 16), h('span', { class: 'sr-only' }, 'Search titles'),
        h('input', { type: 'search', placeholder: 'Search titles', value: fl.q, oninput: (e) => { clearTimeout(searchTimer); const val = e.target.value; searchTimer = setTimeout(() => { setF({ q: val }); const el = document.querySelector('.search input'); if (el) { el.focus(); el.setSelectionRange(val.length, val.length); } }, 250); } })),
      sel('Source', fl.prov, [['all', 'All history'], ['historical', 'Earlier history'], ['observed', 'Since connection']], (v) => setF({ prov: v })),
      sel('Format', fl.format, [['all', 'Long + Shorts'], ['long', 'Long videos'], ['short', 'Shorts']], (v) => setF({ format: v })),
      sel('Pattern', fl.pattern, PATTERNS.map((p) => [p.id, p.label]), (v) => setF({ pattern: v })),
      sel('Sort', fl.sort, [['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['views-desc', 'Most week-one views'], ['views-asc', 'Fewest week-one views']], (v) => setF({ sort: v }))),
    list.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'vtable' },
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, 'Select')), h('th', { scope: 'col' }, 'Video'), h('th', { scope: 'col' }, 'Published'), h('th', { scope: 'col', class: 'r' }, 'First-week views'), h('th', { scope: 'col', class: 'r hide-sm' }, 'Avg. watched'), h('th', { scope: 'col', class: 'hide-sm' }, 'History'))),
      h('tbody', null, list.map((v) => {
        const cb = h('input', { type: 'checkbox', checked: selected.has(v.id), 'aria-label': `Select ${v.title} for comparison` });
        cb.addEventListener('change', () => toggle(v.id, cb));
        const read = hasReading(v, TODAY);
        return h('tr', null,
          h('td', null, cb),
          h('td', null, h('a', { class: 'vcell', href: `#/videos/${v.id}` }, thumb(v, 96), h('span', null, h('strong', null, v.title), h('small', { class: 'dim' }, `${v.format === 'short' ? 'Short' : 'Long video'} · ${formatTime(v.dur)}`)))),
          h('td', { class: 'num' }, formatShort(v.date)),
          h('td', { class: 'num r' }, read ? formatInt(v.views7) : h('span', { class: 'pending' }, 'first week running')),
          h('td', { class: 'num r hide-sm' }, read ? `${v.avgPct}%` : '—'),
          h('td', { class: 'hide-sm' }, provChip(v)));
      })))) : emptyState('Nothing here yet.', 'Try a wider date range or choose another video.',
      h('button', { class: 'btn btn-ghost', onclick: () => setState({ videoFilters: { prov: 'all', format: 'all', pattern: 'all', q: '', sort: 'date-desc' } }) }, 'Clear filters')));
}

function sel(label, value, opts, onChange) {
  return h('label', { class: 'range' }, h('span', { class: 'sr-only' }, label),
    h('select', { onchange: (e) => onChange(e.target.value) }, opts.map(([v, l]) => h('option', { value: v, selected: v === value }, l))));
}

function detail(id, t, ctx) {
  const v = videoById(id);
  if (!v) return emptyState('Nothing here yet.', 'That video isn’t on the sample channel.', h('a', { class: 'btn btn-primary', href: '#/videos' }, 'All videos'));
  const prov = provenanceOf(v);
  const read = hasReading(v, TODAY);
  const related = allFindingStats(ctx.range).filter((s) => s.groupAll.includes(v));
  const idx = videos.indexOf(v);
  return h('div', { class: 'view video-detail' },
    h('a', { class: 'back', href: '#/videos' }, icon('back', 16), 'All videos'),
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, `${v.format === 'short' ? 'Short' : 'Long video'} · ${formatDate(v.date)}`), h('h1', null, v.title)),
      provChip(v)),
    prov === 'historical' ? h('p', { class: 'backfill-label' }, icon('info', 14), BACKFILL_LABEL) : null,
    h('div', { class: 'two-col wide-left' },
      h('section', null, sectionHead(null, 'Moments to revisit'), videoPreview(v, { at: t })),
      h('section', null,
        sectionHead(read ? `${formatShort(v.date)} – ${formatShort(readingDate(v))}` : 'Still running', 'The first week'),
        h('dl', { class: 'facts big' },
          h('dt', null, 'Views'), h('dd', { class: 'num' }, read ? formatInt(v.views7) : 'Not yet'),
          h('dt', null, 'Average watched'), h('dd', { class: 'num' }, read ? `${v.avgPct}%` : '—'),
          v.ret30 != null ? [h('dt', null, 'Still watching at 0:30'), h('dd', { class: 'num' }, read ? `${v.ret30}%` : '—')] : null,
          h('dt', null, 'Duration'), h('dd', { class: 'num' }, formatTime(v.dur)),
          h('dt', null, 'History'), h('dd', null, prov === 'historical' ? 'Earlier history' : 'Since connection')),
        h('h2', { class: 'sub' }, 'Connected patterns'),
        related.length ? h('ul', { class: 'mini-findings' }, related.map((s) => h('li', null, h('a', { href: `#/patterns/${s.finding.id}` }, h('span', null, s.finding.name), stateChip(s.state)))))
          : h('p', { class: 'muted' }, 'This video isn’t part of a pattern in these dates.'),
        patternWatch.match(v) ? h('p', { class: 'fine' }, h('a', { href: '#/patterns/P1' }, 'Also in Pattern watch: shared series template')) : null,
        h('div', { class: 'btn-row' },
          h('a', { class: 'btn btn-ghost btn-sm', href: '#/compare', onclick: () => setState((st) => ({ compare: { ...st.compare, mode: 'videos', ids: [v.id, ...st.compare.ids.filter((x) => x !== v.id)].slice(0, 4) } })) }, icon('compare', 16), 'Add to Compare')))),
    h('nav', { class: 'pager' },
      idx > 0 ? h('a', { class: 'btn btn-quiet btn-sm', href: `#/videos/${videos[idx - 1].id}` }, icon('back', 14), 'Older') : h('span'),
      idx < videos.length - 1 ? h('a', { class: 'btn btn-quiet btn-sm', href: `#/videos/${videos[idx + 1].id}` }, 'Newer', icon('arrow', 14)) : h('span')));
}
