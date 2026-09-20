// js/core/setup-gate.js
//
// SETUP's two questions as data (operator spec §4.2, §4.5): which event, and may a new one start.
// Pure — no DOM, no storage, no clock. The view supplies the diagnosis and the saved event.

import { TEST_ITEMS } from './mat-test.js';
import { startedCount } from './event-model.js';

// The links that must be good before a FRESH event may start.
//
// SEÑAL is deliberately absent. Noise is a warning with its own sentence, not a stop, and §2.1
// leaves this window no warning colour to escalate it with.
//
// PAQUETES is here even though six of six nearly implies it: the ticks reset whenever the device
// changes, so a full test proves packets flowed *recently*, not that they are flowing now. A cable
// pulled between the test and the button is exactly what this catches.
const REQUIRED_LINKS = ['mic', 'sound', 'packets'];

// `loaded` is the store's own answer (engine plan Task 14):
//   { status: 'none' } · { status: 'ok', attempts } · { status: 'corrupt' }
//
// Three results, and the third matters most. `none` and `ok`-with-no-attempts are the same thing
// to an operator and collapse to null. `corrupt` must NOT: results exist but cannot be parsed, and
// reporting that as an empty slate would invite starting fresh over an event nobody can see.
export function savedSummary(loaded) {
  if (!loaded || loaded.status === 'none') return null;
  if (loaded.status === 'corrupt') return { corrupt: true };
  if (loaded.attempts.length === 0) return null;

  const { attempts } = loaded;
  const last = attempts[attempts.length - 1];
  return {
    // startedCount reads only `.attempts`, so the log alone is a sufficient event here. The config
    // is not stored (the store's own note) and nothing on SETUP needs it.
    started: startedCount({ attempts }, null),
    attempts: attempts.length,
    lastTeamId: last.teamId,
    lastAt: last.at,
  };
}

export function setupGate({ diagnosis, test, saved, mock = false, canConnect = true }) {
  const statusOf = (key) => diagnosis.links.find((link) => link.key === key)?.status;
  const signalReady = REQUIRED_LINKS.every((key) => statusOf(key) === 'ok');

  const done = TEST_ITEMS.filter(({ key }) => test[key]).length;
  const tested = done === TEST_ITEMS.length;

  const freshEnabled = canConnect && signalReady && tested;

  const corrupt = saved?.corrupt === true;
  const resumable = saved !== null && !corrupt;

  // The reason is only ever shown under a gated button, so the enabled case has none.
  const why = !canConnect ? 'Ya hay una ventana de operador abierta'
    : freshEnabled ? null
      : !signalReady ? 'Primero hay que conectar y probar el cronómetro'
        : `Falta completar la prueba del cronómetro (${done} de ${TEST_ITEMS.length})`;

  return {
    // Not drawn at all when there is nothing to resume — not drawn and disabled. There would be
    // nothing to explain (spec §4.5).
    resume: {
      shown: resumable,
      enabled: resumable && canConnect,
    },
    fresh: {
      shown: true,
      enabled: freshEnabled,
      why,
      // A rehearsal saves under its own storage key and can never touch a real event's results
      // (engine plan decision 11), so it clears on one press. That is what keeps the typed confirm
      // rare enough to still be read when it does appear (spec §4.6).
      confirm: resumable && !mock ? 'typed' : 'none',
      count: resumable ? saved.attempts : 0,
      // Real events are archived by store.archive(now) — silent, listed nowhere. Rehearsals are
      // not, or many test events would grow localStorage for no possible benefit. A corrupt log is
      // archived either way: it is the one case where the bytes might still be recovered by hand.
      archive: corrupt || (resumable && !mock),
    },
  };
}
