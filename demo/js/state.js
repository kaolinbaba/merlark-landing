// demo/js/state.js
// Demo state. Persists only in this browser (localStorage, wrapped in try/catch) so a refresh keeps
// the visitor's place; "Reset demo" restores the initial fixtures. Nothing is ever sent anywhere.

import { seedInterventions } from './data/fixtures.js';

const KEY = 'merlark-demo-v1';

export const initialState = () => ({
  onboarded: false,
  range: 'all',
  connected: true,
  monitoringPaused: false,
  simulateError: false,
  briefDay: 'Monday',
  briefEmail: true,
  subscription: 'trial',          // 'trial' | 'cancelled'
  monetaryScope: false,
  interventions: structuredClone(seedInterventions),
  manualChecks: [],
  findingFilter: 'all',
  videoFilters: { prov: 'all', format: 'all', pattern: 'all', q: '', sort: 'date-desc' },
  compare: { mode: 'videos', ids: ['v27', 'v24'], group: 'F1' },
  script: { topic: 't1', selected: ['F1', 'F2', 'F4', 'P1'], order: null, removed: [] },
});

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initialState(), ...JSON.parse(raw) };
  } catch { /* storage unavailable: fall back to defaults */ }
  return initialState();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export const getState = () => state;
export function setState(patch) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  save();
  listeners.forEach((fn) => fn(state));
}
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export function resetState() {
  state = initialState();
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  save();
  listeners.forEach((fn) => fn(state));
}
