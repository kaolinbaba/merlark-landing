// demo/js/ui/motion.js
// Shared motion helpers: FLIP transitions for re-rendered lists, the visitor-controlled motion toggle,
// and pausing ambient animation while the tab is hidden. Transforms and opacity only.

import { h, icon, reducedMotion } from './dom.js';

const KEY = 'merlark-motion';

// FLIP: capture positions before a re-render, then animate each keyed element from its old place.
export function captureRects(selector, attr = 'data-key') {
  const map = new Map();
  document.querySelectorAll(selector).forEach((el) => map.set(el.getAttribute(attr), el.getBoundingClientRect()));
  return map;
}
export function playFlip(before, selector, attr = 'data-key') {
  if (!before || reducedMotion()) return;
  document.querySelectorAll(selector).forEach((el) => {
    const prev = before.get(el.getAttribute(attr));
    if (!prev) { el.animate([{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(0.22,1,0.36,1)' }); return; }
    const now = el.getBoundingClientRect();
    const dx = prev.left - now.left; const dy = prev.top - now.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 340, easing: 'cubic-bezier(0.22,1,0.36,1)' });
  });
}

// Visitor motion toggle (persists per browser). The OS reduced-motion setting always wins.
export function initMotionPreference() {
  let off = false;
  try { off = localStorage.getItem(KEY) === 'off'; } catch { /* ignore */ }
  document.documentElement.classList.toggle('motion-off', off);
  document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('tab-hidden', document.hidden));
}
export function motionToggle(onChange) {
  const btn = h('button', { class: 'btn btn-quiet btn-sm motion-toggle', type: 'button' });
  const paint = () => {
    const off = document.documentElement.classList.contains('motion-off');
    btn.setAttribute('aria-pressed', String(!off));
    btn.replaceChildren(icon(off ? 'pause' : 'play', 14), off ? 'Motion off' : 'Motion on');
    btn.title = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Your system asks for reduced motion, so animation stays minimal.' : 'Turn site animation on or off';
  };
  btn.addEventListener('click', () => {
    const off = !document.documentElement.classList.contains('motion-off');
    document.documentElement.classList.toggle('motion-off', off);
    try { localStorage.setItem(KEY, off ? 'off' : 'on'); } catch { /* ignore */ }
    paint();
    onChange && onChange(off);
    document.dispatchEvent(new CustomEvent('merlark:motion', { detail: { off } }));
  });
  document.addEventListener('merlark:motion', paint);
  paint();
  return btn;
}

// Numbers that change between renders count from their previous value (instrument readouts).
const lastValues = new Map();
export function tweenText(el, key, value, format = (n) => String(Math.round(n))) {
  const prev = lastValues.get(key);
  lastValues.set(key, value);
  el.textContent = format(value);
  if (prev == null || prev === value || reducedMotion()) return el;
  const t0 = performance.now(); const dur = 520;
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur); const e = 1 - (1 - k) ** 3;
    if (!el.isConnected && k > 0.05) return;
    el.textContent = format(prev + (value - prev) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  el.textContent = format(prev);
  requestAnimationFrame(step);
  return el;
}
