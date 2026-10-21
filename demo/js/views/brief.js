// demo/js/views/brief.js
// Weekly brief: your week in one quick read. Each week is computed as of that week's end, so older
// briefs show what was known then, not what is known now.

import { h, icon } from '../ui/dom.js';
import { stateChip, sectionHead, previewChip, thumb, multiplierLine } from '../ui/components.js';
import { weeks, briefFor, formatShort, formatDate, formatInt, STATE_LABEL, videoById } from '../data/derive.js';
import { patternWatch } from '../data/fixtures.js';

export function render({ params }, ctx) {
  const all = weeks();
  const wk = all.find((w) => w.id === params[0]) || all[0];
  const b = briefFor(wk);
  const i = all.indexOf(wk);
  const active = ctx.state.interventions.filter((x) => x.started && x.started <= wk.end && (!x.ended || x.ended > wk.end));
  return h('div', { class: 'view brief' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, `Weekly brief · arrives ${ctx.state.briefDay}`), h('h1', null, `Your week: ${formatShort(wk.start)} – ${formatDate(wk.end)}`)),
      h('div', { class: 'chips' }, previewChip(),
        h('label', { class: 'range' }, h('span', { class: 'sr-only' }, 'Choose week'),
          h('select', { onchange: (e) => ctx.navigate(`#/brief/${e.target.value}`) }, all.map((w) => h('option', { value: w.id, selected: w.id === wk.id }, `${formatShort(w.start)} – ${formatShort(w.end)}`)))))),
    h('article', { class: 'brief-paper card' },
      h('section', null,
        h('span', { class: 'eyebrow' }, '1 · On your channel'),
        h('p', { class: 'lead' }, `${b.uploads.length ? `${b.uploads.length} new upload${b.uploads.length > 1 ? 's' : ''}` : 'No new uploads'}, ${b.readings.length} week-one reading${b.readings.length === 1 ? '' : 's'}, ${b.log.length} log event${b.log.length === 1 ? '' : 's'}.`),
        b.uploads.length || b.readings.length ? h('ul', { class: 'brief-videos' },
          b.uploads.map((v) => h('li', null, thumb(v, 72), h('span', null, h('a', { href: `#/videos/${v.id}` }, v.title), h('small', { class: 'dim' }, `Published ${formatShort(v.date)}`)))),
          b.readings.map((v) => h('li', null, thumb(v, 72), h('span', null, h('a', { href: `#/videos/${v.id}` }, v.title), h('small', { class: 'dim num' }, `Week one: ${formatInt(v.views7)} views`))))) : null),
      h('section', null,
        h('span', { class: 'eyebrow' }, '2 · The big one'),
        h('h2', null, b.main.finding.name, ' ', stateChip(b.main.state)),
        h('p', null, b.main.finding.observation(b.main), ' ', multiplierLine(b.main)),
        h('p', { class: 'interp-line' }, h('strong', null, 'What it might mean: '), b.main.finding.interpretation),
        h('a', { class: 'btn btn-ghost btn-sm', href: `#/findings/${b.main.finding.id}` }, 'See the receipts', icon('arrow', 14))),
      h('section', null,
        h('span', { class: 'eyebrow' }, '3 · What changed'),
        b.changes.length ? h('ul', null, b.changes.map((c) => h('li', null, `${c.s.finding.name}: `, stateChip(c.from), ' → ', stateChip(c.s.state))))
          : h('p', { class: 'muted' }, 'No finding changed this week.')),
      h('section', null,
        h('span', { class: 'eyebrow' }, '4 · Every finding, end of week'),
        h('ul', { class: 'mini-findings' }, b.stats.map((s) => h('li', null, h('a', { href: `#/findings/${s.finding.id}` }, h('span', null, s.finding.name), stateChip(s.state)))))),
      h('section', null,
        h('span', { class: 'eyebrow' }, '5 · Experiments running'),
        active.length ? h('ul', null, active.map((a) => h('li', null, h('a', { href: '#/experiments' }, a.title), ` — ${a.appliedTo.filter((id) => videoById(id) && videoById(id).date <= wk.end).length}${a.target ? ` of ${a.target}` : ''} videos tracked so far`)))
          : h('p', { class: 'muted' }, 'No experiments running.')),
      h('section', null,
        h('span', { class: 'eyebrow' }, '6 · Pattern watch'),
        h('p', null, `${patternWatch.name}: kept apart from performance. `, h('a', { href: '#/findings/P1' }, 'Look closer')),
        h('p', { class: 'fine' }, patternWatch.disclaimer)),
      h('footer', { class: 'fine' }, `“${STATE_LABEL.insufficient}” means fewer than 3 similar videos. We say so plainly and never round it up.`)),
    h('nav', { class: 'pager' },
      i < all.length - 1 ? h('a', { class: 'btn btn-quiet btn-sm', href: `#/brief/${all[i + 1].id}` }, icon('back', 14), 'Previous week') : h('span'),
      i > 0 ? h('a', { class: 'btn btn-quiet btn-sm', href: `#/brief/${all[i - 1].id}` }, 'Next week', icon('arrow', 14)) : h('span')));
}
