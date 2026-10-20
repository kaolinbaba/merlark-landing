// demo/js/ui/overlay.js
// Dialogs, side drawer and toasts. Dialogs trap focus, close on Escape and restore focus on close.

import { h, icon } from './dom.js';

let openStack = [];

function trapFocus(panel, e) {
  if (e.key !== 'Tab') return;
  const f = [...panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0]; const last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function openLayer({ kind, title, body, actions = [], label, onClose, wide }) {
  const prevFocus = document.activeElement;
  const titleId = `ov-${Math.random().toString(36).slice(2, 8)}`;
  const close = () => {
    root.classList.add('closing');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => root.remove(), kind === 'drawer' ? 260 : 180);
    openStack = openStack.filter((x) => x !== close);
    if (!openStack.length) document.body.classList.remove('has-overlay');
    if (prevFocus && prevFocus.isConnected && prevFocus.focus) prevFocus.focus();
    else { const m = document.getElementById('main'); m && m.focus({ preventScroll: true }); }
    onClose && onClose();
  };
  const panel = h('div', { class: `${kind}-panel ${wide ? 'wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h('header', { class: `${kind}-head` },
      label ? h('span', { class: 'eyebrow' }, label) : null,
      h('h2', { id: titleId }, title),
      h('button', { class: 'btn btn-quiet icon-btn', 'aria-label': 'Close', onclick: close }, icon('close'))),
    h('div', { class: `${kind}-body` }, typeof body === 'function' ? body(close) : body),
    actions.length ? h('footer', { class: `${kind}-foot` }, actions.map((a) =>
      h('button', { class: `btn ${a.variant || 'btn-ghost'}`, onclick: () => { const keep = a.onClick && a.onClick(close); if (keep !== true) close(); } }, a.label))) : null);
  const root = h('div', { class: `${kind}-root` }, h('div', { class: 'scrim', onclick: close }), panel);
  const onKey = (e) => {
    if (openStack[openStack.length - 1] !== close) return;
    if (e.key === 'Escape') close();
    trapFocus(panel, e);
  };
  document.addEventListener('keydown', onKey);
  document.body.appendChild(root);
  document.body.classList.add('has-overlay');
  openStack.push(close);
  requestAnimationFrame(() => {
    root.classList.add('open');
    const target = panel.querySelector('[data-autofocus]') || panel.querySelector('.' + kind + '-foot .btn, .' + kind + '-head .btn');
    target && target.focus();
  });
  return close;
}

export const dialog = (opts) => openLayer({ ...opts, kind: 'dialog' });
export const drawer = (opts) => openLayer({ ...opts, kind: 'drawer' });
export const closeAll = () => [...openStack].reverse().forEach((c) => c());

let toastHost;
export function toast(text, tone = 'ok') {
  if (!toastHost) { toastHost = h('div', { class: 'toast-host', 'aria-live': 'polite' }); document.body.appendChild(toastHost); }
  const t = h('div', { class: `toast ${tone}` }, icon(tone === 'error' ? 'info' : 'check', 16), h('span', null, text));
  toastHost.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3800);
}
