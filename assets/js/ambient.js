// assets/js/ambient.js
// The landing's environment: a faint observation grid (CSS) and the shared "orbital flow" field (Canvas 2D,
// demo/js/ui/flow.js). Section effects run only while visible so one focal point moves at a time.

import { h } from '../../demo/js/ui/dom.js';
import { mountFlowField } from '../../demo/js/ui/flow.js';

export function mountAmbient() {
  document.body.prepend(h('div', { class: 'ambient', 'aria-hidden': 'true' }));
  return mountFlowField({ density: 1 });
}

export function liveWhenVisible(selector) {
  const els = document.querySelectorAll(selector);
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('live')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => en.target.classList.toggle('live', en.isIntersecting)), { threshold: 0.35 });
  els.forEach((el) => io.observe(el));
}
