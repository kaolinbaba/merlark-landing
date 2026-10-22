// demo/js/views/brief.js
// Weekly recap: your week in a few useful notes. Each week is computed as of that week's end, so older
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
  const note = (n, title, ...body) => h('section', { class: 'recap-note' }, h('span', { class: 'recap-num num', 'aria-hidden': 'true' }, String(n)), h('div', null, h('h2', null, title), ...body));
  return h('div', { class: 'view brief' },
    h('div', { class: 'view-head' },
      h('div', null, h('span', { class: 'eyebrow' }, `${formatShort(wk.start)} – ${formatDate(wk.end)} · ready ${ctx.state.briefDay}`), h('h1', null, 'Your week, in a few useful notes.'), h('p', { class: 'desc' }, 'New videos and changes worth a look.')),
      h('div', { class: 'chips' }, previewChip(),
        h('label', { class: 'range' }, h('span', { class: 'sr-only' }, 'Choose week'),
          h('select', { onchange: (e) => ctx.navigate(`#/recap/${e.target.value}`) }, all.map((w) => h('option', { value: w.id, selected: w.id === wk.id }, `${formatShort(w.start)} – ${formatShort(w.end)}`)))))),
    h('p', { class: 'period-note' }, icon('calendar', 16), h('span', null, 'Based on what was known at the end of this week.')),
    h('article', { class: 'recap' },
      note(1, b.uploads.length ? `${b.uploads.length} new upload${b.uploads.length > 1 ? 's' : ''}` : 'No new uploads',
        h('p', { class: 'muted' }, `${b.readings.length} first-week reading${b.readings.length === 1 ? '' : 's'} came in.`),
        b.uploads.length || b.readings.length ? h('ul', { class: 'brief-videos' },
          b.uploads.map((v) => h('li', null, thumb(v, 72), h('span', null, h('a', { href: `#/videos/${v.id}` }, v.title), h('small', { class: 'dim' }, `Published ${formatShort(v.date)}`)))),
          b.readings.map((v) => h('li', null, thumb(v, 72), h('span', null, h('a', { href: `#/videos/${v.id}` }, v.title), h('small', { class: 'dim num' }, `First week: ${formatInt(v.views7)} views`))))) : null),
      note(2, b.main.finding.name,
        h('div', { class: 'chips' }, stateChip(b.main.state), multiplierLine(b.main)),
        h('p', null, h('b', null, 'The numbers: '), b.main.finding.observation(b.main)),
        h('p', { class: 'interp-line' }, h('b', null, 'One possible explanation: '), b.main.finding.interpretation),
        h('a', { class: 'btn btn-ghost btn-sm', href: `#/patterns/${b.main.finding.id}` }, 'Explore this pattern', icon('arrow', 16))),
      note(3, 'What changed',
        b.changes.length ? h('ul', { class: 'plain-list' }, b.changes.map((c) => h('li', { class: 'chips' }, h('span', null, `${c.s.finding.name}:`), stateChip(c.from), icon('arrow', 14), stateChip(c.s.state))))
          : h('p', { class: 'muted' }, 'No pattern changed this week.')),
      note(4, 'Every pattern, end of week',
        h('ul', { class: 'mini-findings' }, b.stats.map((s) => h('li', null, h('a', { href: `#/patterns/${s.finding.id}` }, h('span', null, s.finding.name), stateChip(s.state)))))),
      note(5, 'Experiments',
        active.length ? h('ul', { class: 'plain-list' }, active.map((a) => h('li', null, h('a', { href: '#/experiments' }, a.title), ` · ${a.appliedTo.filter((id) => videoById(id) && videoById(id).date <= wk.end).length}${a.target ? ` of ${a.target}` : ''} videos so far`)))
          : h('p', { class: 'muted' }, 'Nothing being tried this week.')),
      note(6, 'Pattern watch',
        h('p', null, `${patternWatch.name}: kept apart from performance. `, h('a', { href: '#/patterns/P1' }, 'Take a closer look')),
        h('p', { class: 'fine' }, patternWatch.disclaimer)),
      h('p', { class: 'fine' }, `“${STATE_LABEL.insufficient}” means fewer than 3 similar videos. We say so plainly and never round it up.`)),
    h('nav', { class: 'pager' },
      i < all.length - 1 ? h('a', { class: 'btn btn-quiet btn-sm', href: `#/recap/${all[i + 1].id}` }, icon('back', 16), 'Previous week') : h('span'),
      i > 0 ? h('a', { class: 'btn btn-quiet btn-sm', href: `#/recap/${all[i - 1].id}` }, 'Next week', icon('arrow', 16)) : h('span')));
}
