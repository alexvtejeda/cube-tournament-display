// Operator keys (system design §5, UI spec §5.1). These are the defaults; screen 10 (OPERATOR
// PANEL) owns the final keymap. The reducer ignores a command outside the phases it applies to.
const KEYS = {
  Escape: 'cancelInspection',
  d: 'dnf',
  '2': 'plus2',
  r: 'redo',
  n: 'next',
  ArrowLeft: 'prevTeam',
  ArrowRight: 'nextTeam',
  u: 'undo',
  // Not a reducer command: the operator window opens and closes SIGNAL CHECK itself, and decides
  // which phases allow it (operator spec §3.1). The reducer ignores it.
  s: 'signalCheck',
};

// `key` is a KeyboardEvent.key. Space starts inspection in ARMED and accepts in PENDING.
export function commandForKey(key, phase) {
  if (key === ' ') return phase === 'PENDING' ? 'accept' : 'startInspection';
  return KEYS[key.length === 1 ? key.toLowerCase() : key] ?? null;
}
