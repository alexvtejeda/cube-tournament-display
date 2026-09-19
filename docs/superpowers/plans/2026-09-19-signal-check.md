# SIGNAL CHECK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `subagent-driven-development` (recommended) or
> `executing-plans` to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Build screen 8, SIGNAL CHECK: the operator's mat diagnostic, which either shows packets
arriving or names the link that is broken, ticks off a six-item test of the mat, and — while it is
open — keeps the mat away from the event and the audience.

**Architecture:** Three pure modules decide everything and draw nothing: `mat-test.js` folds mat
states into the six-item test, `signal-health.js` turns the driver's readings into five links and a
verdict, and `sample.js` reads the decoder's audio sample. `js/ui/signal-check.js` owns one DOM
subtree and a canvas, and asks the driver for a fresh 200 ms sample about five times a second.
`js/ui/operator.js` gains one flag: while the check is open, driver states go to it instead of into
the reducer, so no snapshot is published and the audience window holds the screen it had.

**Tech Stack:** plain ES modules, no build step (system design §3). Node 24.2 or newer for
`node --test`. Canvas 2D for the waveform. Headless Chrome for the smoke test.

**Specs:**
- `docs/superpowers/specs/2026-09-19-tournament-display-operator-ui-design.md` — §2 (the operator's
  shared system) and §3 (the screen). This plan implements all of it.
- `docs/superpowers/specs/2026-09-15-tournament-display-system-design.md` §4, §8, §10.

**Runs after the engine plan** (`2026-09-18-tournament-engine.md`), **which must carry its 2026-09-19
amendments** — `fresh` on driver states, the `disarm` command, `s` in the keymap and the mock
driver's synthesised sample (operator spec §4). Without them this plan's Task 6 has nothing to call.
It is independent of the audience screens plans and touches none of their files.

---

## Scope

**In:** screen 8, end to end. The three pure modules and their tests, the operator window's
stylesheet (operator spec §2), the screen itself, the routing seam in the operator window, and the
smoke checks that prove the mat is really cut off from the event.

**Not in this plan:**
- **SETUP (screen 9) and the OPERATOR PANEL (screen 10)** — not designed yet. They reuse this
  screen's chain, picker and remembered device (operator spec §3.12), so this plan writes those
  pieces as modules they can import, and nothing else for them.
- **The debug views.** They stay exactly as the engine plan leaves them; `index.html` gains one
  element and one stylesheet link, and that is all.
- **Hardware validation** (roadmap row 10). Every threshold here is provisional, and that session
  retunes `THRESHOLDS` in one edit.
- **NO SIGNAL (screen 7)**, which is an audience screen.

## Decisions this plan makes

The spec leaves these open. Each is the smallest choice consistent with it. Flag any you disagree
with before execution starts.

| # | Decision | Why |
|---|---|---|
| 1 | The driver is asked for **200 ms** of audio, although only 100 ms is drawn | At ten packets a second, 200 ms always holds one whole packet with idle on both sides, so the trigger can find it. Drawing stays one packet wide (spec §3.6) |
| 2 | The sample's rate is derived as `raw.length / 0.2 / 1200` samples per bit | The decoder collects `duration × sampleRate` samples and never reports the rate. This needs no new driver surface |
| 3 | A third pure module, **`js/core/sample.js`**, holds the trigger and the raw-packet reader | Both are array arithmetic over the sample the driver returns, and both are worth testing without a browser. Spec §3.10 named two modules; this is the third |
| 4 | `tickTest` **ignores any state with `on: false`** | The decoder re-emits its last packet's values when the signal drops. Ticking an item off a re-emission would claim the mat proved something it did not |
| 5 | The last raw bytes come from the **sample's `bytes`**, not from re-encoding the driver's state | System design §10 asks for the last raw packet. Re-encoding would show what we believe, not what the decoder read |
| 6 | The chain is **built once and updated in place** | It is redrawn five times a second. Rebuilding it would destroy the Conectar button between a mousedown and its mouseup, and the click would never land |
| 7 | The device choice is stored under `cube-tournament-display:deviceId` | It sits beside the store's own key (engine plan Task 14), and SETUP reads the same one |
| 8 | While the check is open, **no key reaches the event** except `S` and `Esc` | The gate in spec §3.1 is about the mat; the keyboard needs the same rule, or a stray `D` would record a DNF nobody saw |
| 9 | The check renders on a 200 ms ticker as well as on packets | `hace 14 s el último` has to count up, and the measuring window has to expire, with no packets arriving at all |

## Files

```
js/core/mat-test.js          the six-item mat test: tickTest, missingItems, TEST_ITEMS
js/core/signal-health.js     diagnose(): five links + the verdict; matLine(); THRESHOLDS
js/core/sample.js            windowFor()/findPacketStart(); lastPacketBytes()/byteText()
js/ui/signal-check.js        the screen: its DOM, the canvas, the picker, the sampling loop
css/operator.css             the operator window's tokens (spec §2) and this screen's layout
index.html                   + the stylesheet link and the screen's container
js/ui/operator.js            + the routing seam, the S key and the mat façade
test/core/mat-test.test.js
test/core/signal-health.test.js
test/core/sample.test.js
test/browser/smoke.js        + the checks that the mat is cut off from the event
```

## Conventions

- Use Node **24.2 or newer** (`node --version`).
- **The code in Tasks 1–3 was run before this plan was written**: `node --test` on those three files
  reported `pass 31`, `fail 0`. Copy it exactly. Tasks 4–6 draw and wire, and could not be run here,
  because the engine plan's files do not exist in this checkout yet — treat their code as the design
  and let the smoke test in Task 7 settle it.
- ⚠ **The SETUP amendment of 2026-09-19 is the exception, and was NOT run.** Operator spec §5.1 added
  a fourth link state to `diagnose` (`waiting`), a `canConnect` argument, the `refused` verdict, the
  `waiting` dot in Task 4's stylesheet, and the unmarked verdict line in Task 5. That raises the
  expected total to **`pass 34`**, from three new cases in `signal-health.test.js`. Those counts are
  derived, not measured. **If the suite disagrees, trust the suite and fix the code** — but read the
  test named *"a mat that is never connected keeps reading CRONÓMETRO SIN CONECTAR"* before changing
  anything in `diagnose`: it pins down the one regression this amendment can cause.
- Run one file with `node --test <file>`, the suite with `npm test`, the browser check with
  `npm run smoke`.
- Stage files by name. **Never run `git add -A` or `git add .`**
- End every commit message with the co-author trailer lines your session's instructions give.
- **Never edit `vendor/stackmat.js`** (roadmap locked decision 7).

---

### Task 1: The six-item mat test

The test on the right of the screen (operator spec §3.4). It is pure: mat states in, a record of
what the mat has proved out. Item 5 borrows the run state's own condition, so what this screen
proves is what the event depends on.

**Files:**
- Create: `js/core/mat-test.js`
- Test: `test/core/mat-test.test.js`

- [ ] **Step 1: Write the failing test**, `test/core/mat-test.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doneCount, emptyTest, missingItems, tickTest } from '../../js/core/mat-test.js';
import { offline, packet } from '../../js/drivers/scenarios.js';

const fold = (states) => states.reduce(tickTest, emptyTest());

test('each item ticks from the packet that proves it', () => {
  const done = fold([
    packet('I', 0), packet('L', 0), packet('R', 0), packet('C', 0), packet('A', 0),
    packet(' ', 1230, true), packet(' ', 4560, true), packet('S', 6440), packet('I', 0),
  ]);
  assert.deepEqual(
    { ...done, wasRunning: undefined },
    { left: true, right: true, green: true, start: true, stop: true, reset: true, wasRunning: undefined },
  );
  assert.equal(doneCount(done), 6);
  assert.deepEqual(missingItems(done), []);
});

test('one hand alone ticks only its own item', () => {
  const left = fold([packet('L', 0)]);
  assert.equal(left.left, true);
  assert.equal(left.right, false);
  assert.equal(left.green, false);
  const right = fold([packet('R', 0)]);
  assert.equal(right.right, true);
  assert.equal(right.left, false);
});

test('a reset mid-solve does not tick Para, and 0.00 still ticks the reset', () => {
  const done = fold([packet(' ', 1230, true), packet('I', 0)]);
  assert.equal(done.start, true);
  assert.equal(done.stop, false, 'the non-zero guard: a reset is not a stop');
  assert.equal(done.reset, true);
});

test('the reset only counts after a start or a stop', () => {
  const done = fold([packet('I', 0), packet('S', 0)]);
  assert.equal(done.reset, false);
});

test('a state with on false proves nothing', () => {
  const started = fold([packet(' ', 1230, true)]);
  const lost = tickTest(started, offline(packet('S', 6440)));
  assert.equal(lost, started, 'the same object: nothing changed');
  assert.equal(lost.stop, false);
});

test('a repeated packet returns the same object', () => {
  const once = fold([packet('A', 0)]);
  assert.equal(tickTest(once, packet('A', 0)), once);
});

test('missingItems reads in the order of the screen', () => {
  const done = fold([packet('L', 0)]);
  assert.deepEqual(missingItems(done), ['mano derecha', 'luz verde', 'arranca', 'para', 'vuelve a 0.00']);
  assert.equal(doneCount(done), 1);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/core/mat-test.test.js`
Expected: FAIL with `Cannot find module` for `js/core/mat-test.js`.

- [ ] **Step 3: Write `js/core/mat-test.js`**

```js
// The six-item mat test on SIGNAL CHECK (operator spec §3.4). Pure: it folds mat states into a
// record of what the mat has proved it can do. A state with on === false proves nothing, because
// the decoder re-emits its last packet's values when the signal drops.

export const TEST_ITEMS = [
  { key: 'left', label: 'Mano izquierda' },
  { key: 'right', label: 'Mano derecha' },
  { key: 'green', label: 'Luz verde' },
  { key: 'start', label: 'Arranca' },
  { key: 'stop', label: 'Para' },
  { key: 'reset', label: 'Vuelve a 0.00' },
];

export function emptyTest() {
  return { left: false, right: false, green: false, start: false, stop: false, reset: false, wasRunning: false };
}

export function tickTest(test, mat) {
  if (!mat?.on) return test;
  const idle = mat.signalHeader === 'I' || mat.signalHeader === 'S';
  // Item 5 is the run state's own condition, the one taken verbatim from csTimer: the non-zero
  // guard is what keeps a reset mid-solve from counting as a stop.
  const stopped = test.wasRunning && !mat.running && mat.time_milli !== 0;
  const next = {
    left: test.left || mat.leftHand,
    right: test.right || mat.rightHand,
    green: test.green || mat.greenLight,
    start: test.start || (!test.wasRunning && mat.running),
    stop: test.stop || stopped,
    reset: test.reset || ((test.start || test.stop || stopped) && mat.time_milli === 0 && idle),
    wasRunning: mat.running,
  };
  return TEST_ITEMS.every(({ key }) => next[key] === test[key]) && next.wasRunning === test.wasRunning
    ? test
    : next;
}

export function doneCount(test) {
  return TEST_ITEMS.filter(({ key }) => test[key]).length;
}

// The labels still untested, in the order above, for the verdict's sentence (spec §3.3).
export function missingItems(test) {
  return TEST_ITEMS.filter(({ key }) => !test[key]).map(({ label }) => label.toLowerCase());
}
```

- [ ] **Step 4: Run the test**

Run: `node --test test/core/mat-test.test.js`
Expected: `ℹ pass 7`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/core/mat-test.js test/core/mat-test.test.js
git commit -m "Add the six-item mat test for SIGNAL CHECK"
```

---

### Task 2: The diagnosis

The five links and the verdict (operator spec §3.2, §3.3, §3.5). Everything this screen *says* is
decided here, so all of it is testable without a browser, a microphone or a mat. The thresholds are
one object at the top, because the hardware session (roadmap row 10) will retune them.

**Files:**
- Create: `js/core/signal-health.js`
- Test: `test/core/signal-health.test.js`

- [ ] **Step 1: Write the failing test**, `test/core/signal-health.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnose, levelDb, matLine, THRESHOLDS } from '../../js/core/signal-health.js';
import { emptyTest, tickTest } from '../../js/core/mat-test.js';
import { packet } from '../../js/drivers/scenarios.js';

const NOW = 10_000;
const OPENED = NOW - 5_000; // long enough that the check is no longer measuring
const steady = (count = 20, from = NOW - 2_000) =>
  Array.from({ length: count }, (_, i) => from + i * 100);

// A healthy check: connected, permitted, 10 packets a second, a clean idle mat.
const healthy = (over = {}) => ({
  permission: 'granted', connected: true, deviceLabel: 'Entrada de línea',
  packetTimes: steady(), lastState: packet('I', 0), test: emptyTest(),
  openedAt: OPENED, now: NOW, ...over,
});
const link = (d, key) => d.links.find((l) => l.key === key);
const statuses = (d) => d.links.map((l) => l.status);

test('levelDb rounds and floors at the decoder\'s silence', () => {
  assert.equal(levelDb(1), 0);
  assert.equal(levelDb(0.0001), -40);
  assert.equal(levelDb(0), -40, 'no sample yet must not read as -Infinity');
  assert.equal(levelDb(0.008), -21);
});

test('a clean signal with the test unfinished asks for what is missing', () => {
  const d = diagnose(healthy());
  assert.deepEqual(statuses(d), ['ok', 'ok', 'ok', 'ok', 'unknown']);
  assert.equal(d.bad, false);
  assert.equal(d.verdict.line, 'SEÑAL LIMPIA');
  assert.equal(d.verdict.sentence,
    'Falta probar: mano izquierda, mano derecha, luz verde, arranca, para, vuelve a 0.00.');
  assert.equal(link(d, 'packets').value, '10 / s');
  assert.equal(link(d, 'test').value, '0 de 6');
});

test('a finished test reads TODO LISTO', () => {
  const done = [packet('A', 0), packet(' ', 1230, true), packet('S', 6440), packet('I', 0)]
    .reduce(tickTest, emptyTest());
  const d = diagnose(healthy({ test: done }));
  assert.deepEqual(statuses(d), ['ok', 'ok', 'ok', 'ok', 'ok']);
  assert.equal(d.verdict.line, 'TODO LISTO');
  assert.equal(link(d, 'test').detail, 'completa');
});

test('the first second after opening measures instead of judging', () => {
  const d = diagnose(healthy({ openedAt: NOW - 500, packetTimes: [NOW - 100] }));
  assert.equal(link(d, 'packets').status, 'unknown');
  assert.equal(link(d, 'packets').detail, 'midiendo');
  assert.equal(d.verdict.line, 'MIDIENDO LA ENTRADA');
  assert.equal(d.measuring, true);
  assert.equal(d.bad, false);
});

test('before any packet is heard, nothing is judged', () => {
  const d = diagnose(healthy({ lastState: null, packetTimes: [], openedAt: NOW - 200 }));
  assert.equal(d.verdict.line, 'MIDIENDO LA ENTRADA');
  assert.deepEqual(statuses(d), ['ok', 'unknown', 'unknown', 'unknown', 'unknown']);
});

test('no microphone: denied, and not connected', () => {
  const denied = diagnose(healthy({ permission: 'denied' }));
  assert.equal(denied.verdict.line, 'SIN MICRÓFONO');
  assert.deepEqual(statuses(denied), ['bad', 'unknown', 'unknown', 'unknown', 'unknown']);

  const off = diagnose(healthy({ connected: false, lastState: null, packetTimes: [] }));
  assert.equal(off.verdict.line, 'CRONÓMETRO SIN CONECTAR');
  assert.equal(off.verdict.sentence, 'Pulsa Conectar para empezar a escuchar.');
});

test('not connected is waiting, not broken', () => {
  const off = diagnose(healthy({ connected: false, lastState: null, packetTimes: [] }));
  assert.deepEqual(statuses(off), ['waiting', 'unknown', 'unknown', 'unknown', 'unknown']);
  assert.equal(off.bad, false, 'an unpressed button is not a fault');
  assert.equal(off.waiting, true);
  assert.equal(link(off, 'mic').value, 'Sin conectar');
});

test('a mat that is never connected keeps reading CRONÓMETRO SIN CONECTAR', () => {
  // The regression `waiting` introduces if it does not stop the chain: MICRÓFONO stops being
  // broken, so PAQUETES becomes the first break as soon as its window opens empty, and the screen
  // reads NO SE OYE EL CRONÓMETRO — in red — with nothing connected at all.
  const d = diagnose(healthy({
    connected: false, lastState: null, packetTimes: [], openedAt: NOW - 60_000,
  }));
  assert.equal(d.verdict.line, 'CRONÓMETRO SIN CONECTAR');
  assert.equal(d.bad, false);
  assert.equal(link(d, 'packets').status, 'unknown', 'nothing after MICRÓFONO has been judged');
});

test('a second operator window is refused, and that IS broken', () => {
  // Connecting there is impossible rather than pending, so it keeps the red (operator spec §4.13).
  const d = diagnose(healthy({
    connected: false, canConnect: false, lastState: null, packetTimes: [],
  }));
  assert.equal(d.verdict.line, 'OTRA VENTANA TIENE EL MANDO');
  assert.deepEqual(statuses(d), ['bad', 'unknown', 'unknown', 'unknown', 'unknown']);
  assert.equal(d.bad, true);
  assert.equal(d.waiting, false);
});

test('silence on the input breaks SONIDO before anything else', () => {
  const d = diagnose(healthy({ lastState: { ...packet('I', 0), power: 0.0001, noise: 1 }, packetTimes: [] }));
  assert.equal(d.verdict.line, 'NO ENTRA SONIDO');
  assert.equal(link(d, 'sound').value, '−40 dB');
  assert.equal(link(d, 'sound').detail, 'nada');
  assert.deepEqual(statuses(d), ['ok', 'bad', 'unknown', 'unknown', 'unknown']);
  assert.equal(link(d, 'packets').value, '—', 'nothing after the break has been judged');
  assert.equal(link(d, 'test').value, '0 de 6', 'except the test, which is a fact about the mat');
  assert.equal(link(d, 'test').detail, 'en pausa');
});

test('sound with no packets is the wrong input, and names the age of the last one', () => {
  const d = diagnose(healthy({
    lastState: { ...packet('I', 0), power: 0.0005, noise: 1 },
    packetTimes: [NOW - 14_000],
  }));
  assert.equal(d.verdict.line, 'NO SE OYE EL CRONÓMETRO');
  assert.equal(link(d, 'packets').value, '0 / s');
  assert.equal(link(d, 'packets').detail, 'hace 14 s el último');
  assert.equal(link(d, 'sound').detail, 'entra algo');
});

test('a mat that has never been heard says so', () => {
  const d = diagnose(healthy({ lastState: { ...packet('I', 0), power: 0.0005 }, packetTimes: [] }));
  assert.equal(link(d, 'packets').detail, 'ninguno todavía');
});

test('packets arriving but dropping counts them in the sentence', () => {
  const d = diagnose(healthy({ packetTimes: steady(8) }));
  assert.equal(d.verdict.line, 'SE PIERDEN PAQUETES');
  assert.equal(d.verdict.sentence, 'Llegan 4 de cada 10. Suele ser el cable o el volumen de entrada.');
  assert.equal(link(d, 'packets').value, '4 / s');
});

test('a noisy signal breaks only the last measured link', () => {
  const d = diagnose(healthy({ lastState: { ...packet('I', 0), noise: 0.62 } }));
  assert.equal(d.verdict.line, 'SEÑAL CON RUIDO');
  assert.deepEqual(statuses(d), ['ok', 'ok', 'ok', 'bad', 'unknown']);
  assert.equal(link(d, 'signal').detail, 'ruido 62 %');
});

test('PRUEBA is never red, however broken the signal is', () => {
  for (const over of [{ permission: 'denied' }, { packetTimes: [] }, { lastState: { ...packet('I', 0), noise: 1 } }]) {
    assert.notEqual(diagnose(healthy(over)).links.at(-1).status, 'bad');
  }
});

test('the thresholds are the ones the hardware session will retune', () => {
  assert.deepEqual(THRESHOLDS,
    { soundFloorDb: -39, packetsPerSecond: 8, noiseMax: 0.25, windowMs: 2000, measuringMs: 1000 });
});

test('the mat\'s state line reads the header, and the lost signal first', () => {
  assert.equal(matLine(null), 'SIN SEÑAL');
  assert.equal(matLine({ ...packet('S', 6440), on: false }), 'SIN SEÑAL');
  assert.equal(matLine(packet(' ', 1230, true)), 'CORRIENDO');
  assert.equal(matLine(packet('A', 0)), 'LISTO PARA ARRANCAR');
  assert.equal(matLine(packet('C', 0)), 'MANOS EN POSICIÓN');
  assert.equal(matLine(packet('L', 0)), 'UNA MANO');
  assert.equal(matLine(packet('R', 0)), 'UNA MANO');
  assert.equal(matLine(packet('S', 6440)), 'PARADO');
  assert.equal(matLine(packet('I', 0)), 'EN ESPERA');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/core/signal-health.test.js`
Expected: FAIL with `Cannot find module` for `js/core/signal-health.js`.

- [ ] **Step 3: Write `js/core/signal-health.js`**

```js
// SIGNAL CHECK's diagnosis (operator spec §3.2, §3.3): five links, the first broken one red and
// everything after it unknown, plus the verdict that names what to do. Pure: no DOM, no audio, no
// timers. Every threshold is in THRESHOLDS, to be retuned in one edit after the hardware session
// (roadmap row 10).

import { doneCount, missingItems, TEST_ITEMS } from './mat-test.js';

export const THRESHOLDS = {
  soundFloorDb: -39, // above this, something is coming in. The decoder floors `power` at -40 dB
  packetsPerSecond: 8, // a healthy mat sends about 10
  noiseMax: 0.25, // `noise` is 0–1, and the decoder pins it to 1 on a dead line
  windowMs: 2000, // how far back packets are counted
  measuringMs: 1000, // before this much has passed, PAQUETES has no window to measure
};

// The decoder's `power` is a mean square, floored at 0.0001, so -40 dB is its silence.
export function levelDb(power) {
  return Math.max(-40, Math.round(10 * Math.log10(power || 0)));
}

const dbText = (db) => `${db < 0 ? '−' : ''}${Math.abs(db)} dB`;
const secondsAgo = (ms) => Math.max(1, Math.round(ms / 1000));

const VERDICTS = {
  denied: ['SIN MICRÓFONO', 'El navegador no permite el micrófono. Permítelo y vuelve a abrir esta pantalla.'],
  disconnected: ['CRONÓMETRO SIN CONECTAR', 'Pulsa Conectar para empezar a escuchar.'],
  refused: ['OTRA VENTANA TIENE EL MANDO', 'Ya hay una ventana de operador abierta. Cierra esta y vuelve a la otra.'],
  sound: ['NO ENTRA SONIDO', 'No entra nada por esta entrada. Revisa el cable o elige otra entrada.'],
  silent: ['NO SE OYE EL CRONÓMETRO', 'Entra sonido, pero no trae paquetes. ¿Está encendido el cronómetro? ¿Es la entrada de línea?'],
  lossy: ['SE PIERDEN PAQUETES', 'Llegan {n} de cada 10. Suele ser el cable o el volumen de entrada.'],
  noisy: ['SEÑAL CON RUIDO', 'Los paquetes llegan sucios. Prueba con menos volumen de entrada, u otro cable.'],
  measuring: ['MIDIENDO LA ENTRADA', 'Un momento: escuchando el cronómetro.'],
  clean: ['SEÑAL LIMPIA', 'Falta probar: {missing}.'],
  ready: ['TODO LISTO', 'El cronómetro se oye y responde.'],
};

// packetTimes holds the timestamps of fresh packets (driver states with fresh && on). The caller
// keeps that array and trims it; only the last THRESHOLDS.windowMs are counted here.
// `canConnect` is false only when another operator window holds the microphone (engine plan
// decision 8). Not connected *and* connectable is `waiting`, not broken: nothing is wrong, the
// operator simply has not pressed Conectar. Not connected and refused IS broken — connecting
// there is impossible, not pending. Operator spec §3.2, §4.3.
export function diagnose({
  permission = null, connected = false, deviceLabel = null, canConnect = true,
  packetTimes = [], lastState = null, test, openedAt, now,
}) {
  const since = now - openedAt;
  const measuring = since < THRESHOLDS.measuringMs;
  const elapsedMs = Math.min(THRESHOLDS.windowMs, Math.max(since, 1));
  const recent = packetTimes.filter((t) => t > now - elapsedMs).length;
  const pps = Math.round(recent / (elapsedMs / 1000));
  const lastPacketAt = packetTimes.length > 0 ? packetTimes[packetTimes.length - 1] : null;
  const heard = lastState !== null;

  const mic = !connected
    ? canConnect
      ? { status: 'waiting', value: 'Sin conectar', detail: '—', verdict: 'disconnected' }
      : { status: 'bad', value: 'Sin conectar', detail: '—', verdict: 'refused' }
    : permission === 'denied'
      ? { status: 'bad', value: 'Sin permiso', detail: deviceLabel ?? '—', verdict: 'denied' }
      : { status: 'ok', value: 'Permitido', detail: deviceLabel ?? '—' };

  const db = heard ? levelDb(lastState.power) : null;
  const sound = !heard
    ? { status: 'unknown', value: '—', detail: 'midiendo' }
    : db > THRESHOLDS.soundFloorDb
      ? { status: 'ok', value: dbText(db), detail: pps > 0 ? 'entra señal' : 'entra algo' }
      : { status: 'bad', value: dbText(db), detail: 'nada', verdict: 'sound' };

  const packets = measuring
    ? { status: 'unknown', value: '—', detail: 'midiendo' }
    : pps >= THRESHOLDS.packetsPerSecond
      ? { status: 'ok', value: `${pps} / s`, detail: 'del cronómetro' }
      : {
        status: 'bad',
        value: `${pps} / s`,
        detail: lastPacketAt === null ? 'ninguno todavía' : `hace ${secondsAgo(now - lastPacketAt)} s el último`,
        verdict: pps === 0 ? 'silent' : 'lossy',
      };

  const noisePct = heard ? Math.round(lastState.noise * 100) : 0;
  const signal = !heard
    ? { status: 'unknown', value: '—', detail: 'midiendo' }
    : lastState.noise <= THRESHOLDS.noiseMax
      ? { status: 'ok', value: 'Limpia', detail: `ruido ${noisePct} %` }
      : { status: 'bad', value: 'Con ruido', detail: `ruido ${noisePct} %`, verdict: 'noisy' };

  const done = doneCount(test);
  const prueba = {
    status: done === TEST_ITEMS.length ? 'ok' : 'unknown',
    value: `${done} de ${TEST_ITEMS.length}`,
    detail: done === TEST_ITEMS.length ? 'completa' : `faltan ${TEST_ITEMS.length - done}`,
  };

  const links = [
    { key: 'mic', label: 'Micrófono', ...mic },
    { key: 'sound', label: 'Sonido', ...sound },
    { key: 'packets', label: 'Paquetes', ...packets },
    { key: 'signal', label: 'Señal', ...signal },
    { key: 'test', label: 'Prueba', ...prueba },
  ];

  // The chain stops at the first link that is broken OR waiting; nothing after it has been judged.
  // PRUEBA keeps its count, which is a fact about the mat, not about the signal.
  //
  // `waiting` has to stop the chain even though it is not a fault. Without this, an unconnected mat
  // would leave MICRÓFONO un-broken, PAQUETES would go bad a second later when its window opened
  // empty, and the screen would read NO SE OYE EL CRONÓMETRO, in red, with nothing connected at all.
  const stop = links.findIndex((link) => link.status === 'bad' || link.status === 'waiting');
  if (stop !== -1) {
    for (let i = stop + 1; i < links.length; i++) {
      links[i] = links[i].key === 'test'
        ? { ...links[i], status: 'unknown', detail: 'en pausa' }
        : { ...links[i], status: 'unknown', value: '—', detail: '' };
    }
  }

  // Computed after the propagation above, so a chain stopped by `waiting` reports nothing broken.
  const broken = links.findIndex((link) => link.status === 'bad');

  const key = stop !== -1 ? links[stop].verdict
    : measuring || !heard ? 'measuring'
      : done === TEST_ITEMS.length ? 'ready' : 'clean';
  const [line, template] = VERDICTS[key];
  const sentence = template
    .replace('{n}', String(pps))
    .replace('{missing}', missingItems(test).join(', '));

  return {
    links,
    bad: broken !== -1,
    waiting: stop !== -1 && broken === -1,
    measuring: key === 'measuring',
    verdict: { key, line, sentence },
  };
}

// What the mat is saying right now, in words (operator spec §3.5). First match wins.
export function matLine(lastState) {
  if (!lastState?.on) return 'SIN SEÑAL';
  if (lastState.running) return 'CORRIENDO';
  switch (lastState.signalHeader) {
    case 'A': return 'LISTO PARA ARRANCAR';
    case 'C': return 'MANOS EN POSICIÓN';
    case 'L': case 'R': return 'UNA MANO';
    case 'S': return 'PARADO';
    default: return 'EN ESPERA';
  }
}
```

- [ ] **Step 4: Run the test**

Run: `node --test test/core/signal-health.test.js`
Expected: `ℹ pass 17`, `ℹ fail 0`. *(14 before the SETUP amendment of 2026-09-19 added three — see
Conventions: those three, and the `diagnose` changes they cover, were not run when written.)*

- [ ] **Step 5: Commit**

```bash
git add js/core/signal-health.js test/core/signal-health.test.js
git commit -m "Add SIGNAL CHECK's diagnosis: five links and a verdict"
```

---

### Task 3: Reading the decoder's sample

`getSample(seconds, cb)` hands back `{ raw, bin, bits, bytes }`: the signal after the decoder's gain
control, its binarised copy, and the bits and bytes read while collecting. Two questions are asked
of it, and both are array arithmetic, so both are tested here: where a packet starts (the trigger,
spec §3.6) and what the last whole packet's bytes are (spec §3.7).

**Files:**
- Create: `js/core/sample.js`
- Test: `test/core/sample.test.js`

- [ ] **Step 1: Write the failing test**, `test/core/sample.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byteText, findPacketStart, IDLE_BITS, lastPacketBytes, LEAD_BITS, windowFor, WINDOW_BITS } from '../../js/core/sample.js';

const SPB = 40; // samples per bit at 48 kHz and 1200 baud

// A binarised line: `idleBits` of idle, then a packet's bits, then idle to the end.
function line({ idleBits, packetBits, tailBits }) {
  const bits = [
    ...Array(idleBits).fill(1),
    ...Array.from({ length: packetBits }, (_, i) => (i % 3 === 0 ? 0 : 1)),
    ...Array(tailBits).fill(1),
  ];
  return bits.flatMap((b) => Array(SPB).fill(b));
}

test('the trigger sits a fixed lead before the first edge after an idle run', () => {
  const bin = line({ idleBits: 30, packetBits: 90, tailBits: 60 });
  assert.equal(findPacketStart(bin, SPB), (30 - LEAD_BITS) * SPB);
});

test('a run shorter than the decoder\'s idle does not trigger', () => {
  const bin = line({ idleBits: IDLE_BITS - 1, packetBits: 90, tailBits: 200 });
  assert.equal(findPacketStart(bin, SPB), null);
});

test('with two packets in the sample, the later one wins if its window fits', () => {
  const first = line({ idleBits: 30, packetBits: 90, tailBits: 0 });
  const second = line({ idleBits: 30, packetBits: 90, tailBits: 120 });
  const bin = [...first, ...second];
  const expected = (120 + 30 - LEAD_BITS) * SPB;
  assert.equal(findPacketStart(bin, SPB), expected);
  assert.ok(expected + WINDOW_BITS * SPB <= bin.length, 'a whole window fits after it');
});

test('windowFor reports a triggered window of one packet and the gap after it', () => {
  const bin = line({ idleBits: 30, packetBits: 90, tailBits: 120 });
  const w = windowFor(bin, SPB);
  assert.equal(w.triggered, true);
  assert.equal(w.start, (30 - LEAD_BITS) * SPB);
  assert.equal(w.length, WINDOW_BITS * SPB);
});

test('with nothing to lock onto, it draws the newest samples as they are', () => {
  const noise = Array.from({ length: WINDOW_BITS * SPB * 2 }, (_, i) => i % 2);
  const w = windowFor(noise, SPB);
  assert.equal(w.triggered, false);
  assert.equal(w.start, noise.length - WINDOW_BITS * SPB);
  assert.equal(w.length, WINDOW_BITS * SPB);
});

test('a sample shorter than the window is drawn whole', () => {
  const noise = Array.from({ length: 500 }, (_, i) => i % 2);
  const w = windowFor(noise, SPB);
  assert.equal(w.start, 0);
  assert.equal(w.length, 500);
});

// ── the last whole packet in a sample (spec §3.7) ────────────────────────────

const bytesOf = (header, digits) => {
  const sum = String.fromCharCode(64 + [...digits].reduce((a, d) => a + +d, 0));
  return [header, ...digits, sum, '\n', '\r'];
};

test('a nine-byte packet is read back whole', () => {
  const bytes = bytesOf('A', '00000');
  assert.deepEqual(lastPacketBytes(bytes), bytes);
  assert.equal(byteText(bytes), 'A 0 0 0 0 0 @ \\n \\r');
});

test('a ten-byte packet is preferred over its last nine bytes', () => {
  const bytes = bytesOf(' ', '012345');
  assert.equal(bytes.length, 10);
  assert.deepEqual(lastPacketBytes(bytes), bytes);
  assert.equal(byteText(bytes).slice(0, 3), '␣ 0');
});

test('with two packets in the sample, the last one is read', () => {
  const first = bytesOf('I', '00000');
  const second = bytesOf('S', '00644');
  assert.deepEqual(lastPacketBytes([...first, ...second]), second);
});

test('a sample that caught no whole packet reads as none', () => {
  assert.equal(lastPacketBytes([]), null);
  assert.equal(lastPacketBytes(['0', '0', '@', '\n', '\r']), null, 'too short to be a packet');
  assert.equal(lastPacketBytes(bytesOf('A', '00000').slice(0, -1)), null, 'no terminator yet');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/core/sample.test.js`
Expected: FAIL with `Cannot find module` for `js/core/sample.js`.

- [ ] **Step 3: Write `js/core/sample.js`**

```js
// Reading what the decoder's getSample() hands back (operator spec §3.6, §3.7): where to start
// drawing the waveform, and the last whole packet inside the sample. A sample is
// { raw, bin, bits, bytes }: the signal after the decoder's gain control, its binarised copy, and
// the bits and bytes it read while collecting.
//
// Pure array arithmetic, so it runs under node --test with no audio.

export const IDLE_BITS = 10; // the decoder itself calls a run this long idle
export const LEAD_BITS = 8; // drawn before the packet's first edge
export const WINDOW_BITS = 120; // 100 ms at 1200 baud: one packet and the gap after it

// Returns the index of the first sample of the last packet that fits a whole window, or null when
// no idle run is found. `bin` is the decoder's binarised signal, one entry per sample.
export function findPacketStart(bin, samplesPerBit, windowBits = WINDOW_BITS) {
  const idle = Math.round(IDLE_BITS * samplesPerBit);
  const lead = Math.round(LEAD_BITS * samplesPerBit);
  const window = Math.round(windowBits * samplesPerBit);
  let run = 1;
  let best = null;
  for (let i = 1; i < bin.length; i++) {
    if (bin[i] === bin[i - 1]) { run++; continue; }
    if (run >= idle) {
      const start = i - lead;
      if (start >= 0 && start + window <= bin.length) best = start;
      else if (best === null && start >= 0) best = start; // the last one, even if the window runs short
    }
    run = 1;
  }
  return best;
}

// The window to draw: the trigger when there is one, otherwise the newest samples, so noise and
// hiss are drawn as they are.
export function windowFor(bin, samplesPerBit, windowBits = WINDOW_BITS) {
  const window = Math.min(bin.length, Math.round(windowBits * samplesPerBit));
  const start = findPacketStart(bin, samplesPerBit, windowBits);
  return start === null
    ? { start: bin.length - window, length: window, triggered: false }
    : { start, length: Math.min(window, bin.length - start), triggered: true };
}

// ── the last whole packet in a sample (spec §3.7) ────────────────────────────

const HEADERS = ' SILRCA'; // system design §4; every packet begins with one of these

// A packet is 9 or 10 bytes ending in \n \r. Returns the characters of the last complete one, or
// null when the sample caught none.
export function lastPacketBytes(bytes) {
  for (let end = bytes.length; end >= 9; end--) {
    if (bytes[end - 1] !== '\r' || bytes[end - 2] !== '\n') continue;
    // 10 first: in a 10-byte packet the byte 9 back is a digit, never a header.
    for (const size of [10, 9]) {
      const start = end - size;
      if (start >= 0 && HEADERS.includes(bytes[start])) return bytes.slice(start, end);
    }
  }
  return null;
}

// How those bytes are written on screen: the running header is a space, and the terminators are
// spelled out rather than drawn as gaps.
export function byteText(bytes) {
  return bytes
    .map((byte) => (byte === ' ' ? '␣' : byte === '\n' ? '\\n' : byte === '\r' ? '\\r' : byte))
    .join(' ');
}
```

- [ ] **Step 4: Run the test**

Run: `node --test test/core/sample.test.js`
Expected: `ℹ pass 10`, `ℹ fail 0`.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: the engine plan's tests plus these, `ℹ fail 0`. The three new files add 31.

- [ ] **Step 6: Commit**

```bash
git add js/core/sample.js test/core/sample.test.js
git commit -m "Add the reader for the decoder's audio sample: the trigger and the last packet"
```

---

### Task 4: The operator window's stylesheet

The first operator screen brings the operator window's shared system with it (operator spec §2):
the audience palette with no new colour, six fixed-px sizes, one radius, one gutter, and no motion
at all. SETUP and the panel will reuse the tokens at the top of this file.

**Files:**
- Create: `css/operator.css`

- [ ] **Step 1: Write `css/operator.css`**

```css
/* The operator window (operator spec §2). Sizes are fixed px, never cqw: this is a laptop window
   read at arm's length, and a reading that shrinks with the window is the opposite of what this
   window is for. The palette is the audience's (audience spec §2.1) with no new value; what is new
   is that --o-red means "a problem" here. */

:root {
  --o-bg: #02010c;
  --o-divider: #231f66;
  --o-violet: #aba6f7;
  --o-unknown: rgba(171, 166, 247, 0.45);
  --o-red: #ee2737;
  --o-go: #2ee6a0;

  --o-fs-label: 13px;
  --o-fs-body: 16px;
  --o-fs-lead: 20px;
  --o-fs-num: 26px;
  --o-fs-verdict: 40px;
  --o-fs-clock: 88px;

  --o-radius: 16px;
  --o-gutter: 32px;
}

/* ── the screen ─────────────────────────────────────────────────────────── */

.sc {
  position: fixed;
  inset: 0;
  z-index: 10;
  overflow: auto;
  background: var(--o-bg);
  color: #fff;
  font: 500 var(--o-fs-body) / 1.35 "roc-grotesk-variable", "roc-grotesk", system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
}
.sc[hidden] { display: none; }
.sc * { box-sizing: border-box; }
.sc p, .sc ul, .sc ol { margin: 0; padding: 0; list-style: none; }

/* Below 1280 × 800 the page scrolls; nothing shrinks (spec §2.2). */
.sc-page {
  display: flex;
  flex-direction: column;
  min-width: 1240px;
  min-height: 780px;
  height: 100%;
}

.sc-label {
  font-size: var(--o-fs-label);
  font-weight: 400;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--o-violet);
}

/* ── header ─────────────────────────────────────────────────────────────── */

.sc-hdr {
  display: flex;
  align-items: center;
  gap: 28px;
  flex: none;
  padding: 18px var(--o-gutter);
  border-bottom: 1px solid var(--o-divider);
}
.sc-title { letter-spacing: 0.14em; color: var(--o-violet); }
.sc-title b { color: #fff; }
.sc-hold { flex: 1; color: var(--o-violet); }
.sc-keys { color: var(--o-violet); }
.sc kbd {
  display: inline-block;
  min-width: 26px;
  margin-right: 4px;
  padding: 2px 7px;
  border: 1px solid var(--o-divider);
  border-radius: var(--o-radius);
  color: #fff;
  font: inherit;
  font-weight: 700;
  text-align: center;
}

/* ── the chain ──────────────────────────────────────────────────────────── */

.sc-chain {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  flex: none;
  padding: 26px var(--o-gutter) 20px;
}
.sc-link { position: relative; padding-right: 18px; }
.sc-link::after {
  content: "";
  position: absolute;
  left: 34px;
  right: 0;
  top: 17px;
  height: 1px;
  background: var(--o-divider);
}
.sc-link:last-child::after { display: none; }
.sc-link-dot {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--o-bg);
  font-size: 18px;
  font-weight: 800;
}
.sc-link-label {
  display: block;
  margin: 14px 0 4px;
  font-size: var(--o-fs-label);
  font-weight: 400;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--o-violet);
}
.sc-link-value { display: block; font-size: var(--o-fs-num); font-weight: 800; }
.sc-link-detail {
  display: block;
  min-height: 1.35em;
  color: var(--o-violet);
}
.sc-link.ok .sc-link-dot { background: #fff; color: var(--o-bg); }
.sc-link.ok::after { background: #fff; }
.sc-link.bad .sc-link-dot { background: var(--o-red); color: #fff; }
.sc-link.bad .sc-link-value { color: var(--o-red); }
.sc-link.unknown .sc-link-dot { border: 1.5px dashed var(--o-unknown); }
.sc-link.unknown .sc-link-label,
.sc-link.unknown .sc-link-value { color: var(--o-unknown); }
/* `waiting`: a solid ring, not a dash — "this is where you are", not "not measured".
   Its label and value stay white: the link is live, it is just not started (spec §3.2, §4.3). */
.sc-link.waiting .sc-link-dot { border: 1.5px solid #fff; }
.sc-connect {
  padding: 6px 16px;
  border: 1px solid var(--o-divider);
  border-radius: var(--o-radius);
  background: transparent;
  color: #fff;
  font: inherit;
  font-size: var(--o-fs-lead);
  cursor: pointer;
}
.sc-connect[hidden] { display: none; }

/* ── the verdict ────────────────────────────────────────────────────────── */

.sc-verdict {
  flex: none;
  padding: 0 var(--o-gutter) 24px;
  border-bottom: 1px solid var(--o-divider);
}
.sc-line { font-size: var(--o-fs-verdict); font-weight: 800; letter-spacing: -0.01em; }
.sc-verdict.bad .sc-line { color: var(--o-red); }
.sc-sentence { margin-top: 6px; font-size: var(--o-fs-lead); color: var(--o-violet); }

/* ── the lower half ─────────────────────────────────────────────────────── */

.sc-lower {
  flex: 1;
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  min-height: 0;
}
.sc-evidence, .sc-mat {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 24px var(--o-gutter);
}
.sc-mat { border-left: 1px solid var(--o-divider); justify-content: space-between; }
.sc-wave { flex: 1; min-height: 120px; width: 100%; display: block; margin: 12px 0 20px; }
.sc-foot { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
.sc-devices {
  margin-top: 12px;
  min-width: 330px;
  padding: 10px 14px;
  border: 1px solid var(--o-divider);
  border-radius: var(--o-radius);
  background: var(--o-bg);
  color: #fff;
  font: inherit;
  font-size: var(--o-fs-lead);
}
.sc-bytes { margin-top: 12px; font-size: var(--o-fs-lead); letter-spacing: 0.08em; white-space: nowrap; }
.sc-age { font-size: var(--o-fs-label); letter-spacing: 0.14em; color: var(--o-violet); }
.sc-packet.stale .sc-bytes, .sc-packet.stale .sc-age { color: var(--o-unknown); }

/* ── what the mat is saying ─────────────────────────────────────────────── */

.sc-clock {
  font-size: var(--o-fs-clock);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
  text-align: center;
}
.sc-clock.off { color: var(--o-unknown); }
.sc-state {
  margin: 12px 0 18px;
  letter-spacing: 0.24em;
  text-align: center;
  color: var(--o-violet);
}
.sc-hands { display: flex; align-items: center; justify-content: center; gap: 22px; }
.sc-hand {
  width: 112px;
  padding: 14px 0;
  border: 1px solid var(--o-divider);
  border-radius: var(--o-radius);
  color: var(--o-violet);
  font-size: var(--o-fs-label);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-align: center;
}
.sc-hand.on { background: #fff; border-color: #fff; color: var(--o-bg); }
/* The only green on any operator screen is the mat's own light (spec §2.1). */
.sc-light { width: 46px; height: 46px; border: 1px solid var(--o-divider); border-radius: 50%; }
.sc-light.on {
  background: var(--o-go);
  border-color: var(--o-go);
  box-shadow: 0 0 22px rgba(46, 230, 160, 0.55);
}

/* ── the six-item test ──────────────────────────────────────────────────── */

.sc-items {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 18px;
  margin-top: 12px;
}
.sc-items li { display: flex; align-items: center; gap: 12px; font-size: var(--o-fs-lead); }
.sc-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 17px;
  font-weight: 800;
}
.sc-items .done .sc-mark { background: #fff; color: var(--o-bg); }
.sc-items .todo { color: var(--o-unknown); }
.sc-items .todo .sc-mark { border: 1.5px dashed var(--o-unknown); }

/* prefers-reduced-motion needs no rule here: this screen has no motion, and the waveform keeps
   redrawing because it is a reading, not an animation (spec §2.3). */
```

- [ ] **Step 2: Check the tokens are all there**

Run:

```bash
node -e "const css = require('node:fs').readFileSync('css/operator.css', 'utf8');
const need = ['--o-fs-label','--o-fs-body','--o-fs-lead','--o-fs-num','--o-fs-verdict','--o-fs-clock','--o-radius','--o-gutter','--o-red','--o-go','--o-unknown'];
const missing = need.filter((t) => !css.includes(t));
if (missing.length) { console.error('missing', missing); process.exit(1); }
console.log('tokens ok');"
```

Expected: `tokens ok`.

- [ ] **Step 3: Commit**

```bash
git add css/operator.css
git commit -m "Add the operator window's stylesheet: its tokens and SIGNAL CHECK's layout"
```

---

### Task 5: The screen

One module owning one DOM subtree, a canvas and a sampling loop. It decides nothing: `diagnose`
says what the chain and the verdict read, `tickTest` says what is ticked, `sample.js` says where the
trace starts and what the last packet was.

**Files:**
- Create: `js/ui/signal-check.js`

- [ ] **Step 1: Write `js/ui/signal-check.js`**

```js
// Screen 8, SIGNAL CHECK (operator spec §3). While it is open, the operator window routes the mat
// here instead of into the reducer (§3.1), so nothing that happens at the mat reaches the event or
// the audience. This file draws; every rule it draws lives in js/core/.
import { emptyTest, TEST_ITEMS, tickTest } from '../core/mat-test.js';
import { byteText, lastPacketBytes, windowFor } from '../core/sample.js';
import { diagnose, matLine, THRESHOLDS } from '../core/signal-health.js';
import { formatMs } from '../core/format.js';

const BAUD = 1200;
const SAMPLE_SECONDS = 0.2; // two packets, so a whole 100 ms window always fits (decision 1)
const TICK_MS = 200; // the screen's own beat: ages count up with no packets arriving (decision 9)
const FRESH_MS = 500; // older than this and the last packet is stale, and dims (spec §3.7)
const LINKS = ['mic', 'sound', 'packets', 'signal', 'test'];

// The decoder invents `microphone 1`, `microphone 2`… before permission is granted (spec §2.4).
const deviceName = (label) => label.replace(/^microphone (\d+)$/i, 'Micrófono $1');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// `mat` is the operator window's façade over the driver:
//   connected() · deviceId() · deviceLabel() · listDevices() · connect(id) · permission() · sample(s)
export function createSignalCheck({ root, mat }) {
  root.className = 'sc';
  root.hidden = true;
  root.innerHTML = `
    <div class="sc-page">
      <header class="sc-hdr">
        <p class="sc-title">OPERADOR · <b>COMPROBAR SEÑAL</b></p>
        <p class="sc-hold">Evento en espera: el cronómetro no llega al evento ni a la sala</p>
        <p class="sc-keys"><kbd>S</kbd><kbd>Esc</kbd> volver al evento</p>
      </header>
      <ol class="sc-chain" id="sc-chain"></ol>
      <div class="sc-verdict" id="sc-verdict">
        <p class="sc-line" id="sc-line"></p>
        <p class="sc-sentence" id="sc-sentence"></p>
      </div>
      <div class="sc-lower">
        <section class="sc-evidence">
          <p class="sc-label">Onda · 100 ms</p>
          <canvas class="sc-wave" id="sc-wave"></canvas>
          <div class="sc-foot">
            <div>
              <p class="sc-label">Entrada</p>
              <select class="sc-devices" id="sc-devices"></select>
            </div>
            <div class="sc-packet" id="sc-packet">
              <p class="sc-label">Último paquete</p>
              <p class="sc-bytes" id="sc-bytes">—</p>
              <p class="sc-age" id="sc-age"></p>
            </div>
          </div>
        </section>
        <section class="sc-mat">
          <p class="sc-label">Lo que dice el cronómetro</p>
          <div class="sc-readout">
            <p class="sc-clock" id="sc-clock">—</p>
            <p class="sc-state" id="sc-state"></p>
            <div class="sc-hands">
              <span class="sc-hand" id="sc-left">IZQ</span>
              <span class="sc-light" id="sc-light"></span>
              <span class="sc-hand" id="sc-right">DER</span>
            </div>
          </div>
          <div class="sc-test">
            <p class="sc-label">Prueba del cronómetro</p>
            <ul class="sc-items" id="sc-items"></ul>
          </div>
        </section>
      </div>
    </div>`;

  const byId = (id) => root.querySelector(`#${id}`);
  const canvas = byId('sc-wave');
  const devices = byId('sc-devices');

  // The Conectar button is built once and moved nowhere: rebuilding the chain five times a second
  // would destroy it between a mousedown and its mouseup, and the click would never land.
  const connect = document.createElement('button');
  connect.type = 'button';
  connect.className = 'sc-connect';
  connect.textContent = 'Conectar';

  const links = new Map(LINKS.map((key) => {
    const li = document.createElement('li');
    li.className = 'sc-link';
    const parts = { li, text: document.createTextNode('') };
    for (const name of ['dot', 'label', 'value', 'detail']) {
      parts[name] = document.createElement('span');
      parts[name].className = `sc-link-${name}`;
      li.append(parts[name]);
    }
    parts.value.append(parts.text);
    if (key === 'mic') parts.value.append(connect);
    byId('sc-chain').append(li);
    return [key, parts];
  }));

  const items = new Map(TEST_ITEMS.map(({ key, label }) => {
    const li = document.createElement('li');
    const mark = document.createElement('span');
    mark.className = 'sc-mark';
    const text = document.createElement('span');
    text.textContent = label;
    li.append(mark, text);
    byId('sc-items').append(li);
    return [key, { li, mark }];
  }));

  let showing = false;
  let test = emptyTest();
  let packetTimes = [];
  let lastState = null;
  let lastBytes = null;
  let openedAt = 0;
  let permission = null;
  let ticker = null;

  connect.addEventListener('click', () => connectTo(devices.value || undefined));
  devices.addEventListener('change', () => connectTo(devices.value || undefined));

  async function connectTo(deviceId) {
    try {
      await mat.connect(deviceId);
    } catch {
      // Nothing to say here: the chain reads the permission below and the verdict explains it.
    }
    permission = await mat.permission();
    restart();
    await refreshDevices();
    render();
  }

  // A new device's readings have nothing to do with the old one's (spec §3.8), and the test starts
  // again every time the check opens (spec §3.4).
  function restart() {
    test = emptyTest();
    packetTimes = [];
    lastState = null;
    lastBytes = null;
    openedAt = Date.now();
  }

  // The list changes when something is plugged in or pulled out (spec §3.8).
  const onDeviceChange = () => { void refreshDevices(); };

  async function refreshDevices() {
    const list = await mat.listDevices();
    const chosen = mat.deviceId();
    devices.replaceChildren(...list.map(([id, label]) => new Option(deviceName(label), id)));
    if (chosen && list.some(([id]) => id === chosen)) devices.value = chosen;
  }

  async function pump() {
    while (showing) {
      if (!mat.connected()) {
        await sleep(TICK_MS); // asking a decoder that never started for audio would throw
        continue;
      }
      // The real driver takes the whole 200 ms to fill a sample and the mock returns at once; the
      // sleep paces both to about five redraws a second.
      const [sample] = await Promise.all([mat.sample(SAMPLE_SECONDS), sleep(SAMPLE_SECONDS * 1000)]);
      if (!showing) return;
      drawWave(sample);
      const bytes = lastPacketBytes(sample.bytes ?? []);
      if (bytes !== null) lastBytes = bytes;
      render();
    }
  }

  function drawWave(sample) {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    const styles = getComputedStyle(canvas);
    const g = canvas.getContext('2d');
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.clearRect(0, 0, width, height);
    g.lineWidth = 1;
    g.strokeStyle = styles.getPropertyValue('--o-divider').trim();
    g.beginPath();
    g.moveTo(0, height / 2 + 0.5);
    g.lineTo(width, height / 2 + 0.5);
    g.stroke();

    const raw = sample.raw ?? [];
    if (raw.length < 2) return;
    const samplesPerBit = raw.length / SAMPLE_SECONDS / BAUD; // the decoder never reports its rate
    const { start, length } = windowFor(sample.bin ?? raw, samplesPerBit);
    g.lineWidth = 1.6;
    g.lineJoin = 'round';
    g.strokeStyle = styles.getPropertyValue('--o-violet').trim();
    g.beginPath();
    for (let i = 0; i < length; i++) {
      const x = (i / (length - 1)) * width;
      // This is the signal after the decoder's gain control, so ±1 is full scale, whatever the
      // input level is (spec §3.6).
      const y = height / 2 - raw[start + i] * height * 0.36;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }

  function render() {
    const now = Date.now();
    const health = diagnose({
      permission,
      connected: mat.connected(),
      deviceLabel: mat.deviceLabel(),
      packetTimes,
      lastState,
      test,
      openedAt,
      now,
    });

    for (const link of health.links) {
      const parts = links.get(link.key);
      parts.li.className = `sc-link ${link.status}`;
      parts.dot.textContent = link.status === 'ok' ? '✓' : link.status === 'bad' ? '✕' : '';
      parts.label.textContent = link.label;
      parts.detail.textContent = link.detail;
      parts.text.nodeValue = link.key === 'mic' && !mat.connected() ? '' : link.value;
    }
    connect.hidden = mat.connected();

    byId('sc-verdict').classList.toggle('bad', health.bad);
    // MIDIENDO LA ENTRADA and CRONÓMETRO SIN CONECTAR carry neither mark: nothing has been judged
    // yet, and a tick would claim otherwise (spec §3.3). A tick here would also be the screen's
    // only "all good" signal while the mat is not even connected.
    const mark = health.bad ? '✕ ' : health.measuring || health.waiting ? '' : '✓ ';
    byId('sc-line').textContent = `${mark}${health.verdict.line}`;
    byId('sc-sentence').textContent = health.verdict.sentence;

    const on = Boolean(lastState?.on);
    byId('sc-clock').textContent = on ? formatMs(lastState.time_milli) : '—';
    byId('sc-clock').classList.toggle('off', !on);
    byId('sc-state').textContent = matLine(lastState);
    byId('sc-left').classList.toggle('on', on && lastState.leftHand);
    byId('sc-right').classList.toggle('on', on && lastState.rightHand);
    byId('sc-light').classList.toggle('on', on && lastState.greenLight);

    const age = packetTimes.length > 0 ? now - packetTimes[packetTimes.length - 1] : null;
    const stale = age === null || age >= FRESH_MS;
    byId('sc-bytes').textContent = lastBytes === null ? '—' : byteText(lastBytes);
    byId('sc-age').textContent = age === null ? '' : stale ? `hace ${Math.max(1, Math.round(age / 1000))} s` : 'ahora';
    byId('sc-packet').classList.toggle('stale', stale);

    for (const { key } of TEST_ITEMS) {
      const { li, mark } = items.get(key);
      li.className = test[key] ? 'done' : 'todo';
      mark.textContent = test[key] ? '✓' : '';
    }
  }

  return {
    async open() {
      if (showing) return;
      showing = true;
      restart();
      root.hidden = false;
      permission = await mat.permission();
      await refreshDevices();
      navigator.mediaDevices?.addEventListener('devicechange', onDeviceChange);
      render();
      ticker = setInterval(render, TICK_MS);
      void pump();
    },
    close() {
      showing = false;
      clearInterval(ticker);
      ticker = null;
      navigator.mediaDevices?.removeEventListener('devicechange', onDeviceChange);
      root.hidden = true;
    },
    // Every mat state while the check is open (spec §3.1). It goes nowhere else.
    onMat(state, now = Date.now()) {
      if (!showing) return;
      lastState = state;
      if (state.fresh && state.on) packetTimes.push(now);
      while (packetTimes.length > 0 && packetTimes[0] < now - THRESHOLDS.windowMs) packetTimes.shift();
      test = tickTest(test, state);
      render();
    },
  };
}
```

- [ ] **Step 2: Check it parses**

Run: `node --check js/ui/signal-check.js`
Expected: no output. (It imports browser APIs, so it cannot be *run* outside a browser; Task 7 is
what exercises it.)

- [ ] **Step 3: Commit**

```bash
git add js/ui/signal-check.js
git commit -m "Add SIGNAL CHECK's screen: the chain, the readout, the test and the waveform"
```

---

### Task 6: Wiring it into the operator window

The seam from operator spec §3.1: one flag, one façade over the driver, and the `S` key. This is
where the check becomes a bench — the mat stops reaching the reducer, so no snapshot is published
and the audience window holds the screen it had.

**Files:**
- Modify: `index.html`
- Modify: `js/ui/operator.js`

- [ ] **Step 1: Add the stylesheet, the font and the container to `index.html`**

Replace the `<head>` and the opening of `<body>` with:

```html
  <head>
    <meta charset="utf-8">
    <title>Operador · Reto del Cubo</title>
    <link rel="stylesheet" href="https://use.typekit.net/frw4sme.css">
    <link rel="stylesheet" href="css/debug.css">
    <link rel="stylesheet" href="css/operator.css">
  </head>
  <body>
    <main id="operator"></main>
    <div id="signal-check" hidden></div>
```

The rest of the file — the three script tags — is unchanged.

- [ ] **Step 2: Import the screen in `js/ui/operator.js`**

After `import { createOperatorView } from './operator-debug-view.js';` add:

```js
import { createSignalCheck } from './signal-check.js';
```

- [ ] **Step 3: Add the container and the storage key**

After `const root = document.getElementById('operator');` add:

```js
const checkRoot = document.getElementById('signal-check');
// Where the chosen input is remembered, beside the store's own key. SETUP (screen 9) reads it too.
const DEVICE_KEY = 'cube-tournament-display:deviceId';
```

- [ ] **Step 4: Build the mat façade and the check**

Inside `run(config, attempts)`, directly after
`const driver = mock ? createMockDriver() : createRealDriver();` add:

```js
  // One connection, shared by the debug view's button and the check's picker: the driver itself
  // does not track whether it started, and the check has to say so (operator spec §3.2).
  let connected = mock;
  let deviceId = localStorage.getItem(DEVICE_KEY) ?? '';
  let deviceLabel = mock ? 'Mock mat' : null;
  const matFacade = {
    connected: () => connected,
    deviceId: () => deviceId,
    deviceLabel: () => deviceLabel,
    listDevices: () => driver.listDevices(),
    async connect(id) {
      await driver.start(id);
      connected = true;
      deviceId = id ?? '';
      if (deviceId) localStorage.setItem(DEVICE_KEY, deviceId);
      const devices = await driver.listDevices();
      deviceLabel = devices.find(([value]) => value === deviceId)?.[1] ?? devices[0]?.[1] ?? null;
    },
    permission: async () =>
      (await navigator.permissions?.query({ name: 'microphone' }).catch(() => null))?.state ?? null,
    sample: (seconds) => new Promise((resolve) => driver.getSample(seconds, resolve)),
  };
  const signalCheck = createSignalCheck({ root: checkRoot, mat: matFacade });
  let checkOpen = false;
```

- [ ] **Step 5: Hand the view the same connection**

In the `createOperatorView(root, { … })` call, replace:

```js
    onConnect: (deviceId) => driver.start(deviceId),
```

with:

```js
    onConnect: (id) => matFacade.connect(id),
```

- [ ] **Step 6: Route the mat**

Replace:

```js
  driver.onState((matState) => dispatch({ type: 'mat', state: matState, at: Date.now() }));
```

with:

```js
  // The check is a bench, not a view (operator spec §3.1): while it is open the mat reaches
  // neither the reducer nor, therefore, the audience window.
  driver.onState((matState) => {
    if (checkOpen) {
      signalCheck.onMat(matState);
      return;
    }
    dispatch({ type: 'mat', state: matState, at: Date.now() });
  });

  function openCheck() {
    // ARMED is the one held screen that draws live mat data — the hands, the light, the inspection
    // countdown — so it steps back to SCRAMBLE, keeping the scramble, rather than freezing into a
    // lie on the projector. RESULTS joins this list when that phase exists.
    const armedAndWaiting = state.phase === 'ARMED' && state.inspectionStartedAt === null;
    if (!['STANDBY', 'SCRAMBLE'].includes(state.phase) && !armedAndWaiting) return;
    if (armedAndWaiting) dispatch({ type: 'command', command: 'disarm', at: Date.now() });
    checkOpen = true;
    root.hidden = true;
    signalCheck.open();
  }

  function closeCheck() {
    checkOpen = false;
    signalCheck.close();
    root.hidden = false;
  }
```

- [ ] **Step 7: Give `S` and `Esc` the keyboard while the check is open**

Replace the whole `window.addEventListener('keydown', …)` block with:

```js
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const command = commandForKey(e.key, state.phase);
    // While the check is open no key reaches the event: a stray D would record a DNF nobody saw.
    if (checkOpen) {
      if (command === 'signalCheck' || e.key === 'Escape') {
        e.preventDefault();
        closeCheck();
      }
      return;
    }
    if (command === null) return;
    e.preventDefault();
    if (command === 'signalCheck') {
      openCheck();
      return;
    }
    dispatch({ type: 'command', command, at: Date.now() });
  });
```

- [ ] **Step 8: Run the suite and the existing smoke test**

Run: `npm test && npm run smoke`
Expected: `ℹ fail 0`, then `smoke: all checks passed` — the engine plan's checks still pass, and
nothing new is checked yet.

- [ ] **Step 9: Commit**

```bash
git add index.html js/ui/operator.js
git commit -m "Open SIGNAL CHECK with S, and cut the mat off from the event while it is open"
```

---

### Task 7: Proving the bench

The one thing tests cannot infer from the pure modules: that a whole solve at the mat, with the
check open, changes nothing the room can see.

**Files:**
- Modify: `test/browser/smoke.js`

- [ ] **Step 1: Teach the smoke test the two keys**

In `openTab`, replace:

```js
  const KEYS = { ' ': ['Space', 32], n: ['KeyN', 78], d: ['KeyD', 68], u: ['KeyU', 85], r: ['KeyR', 82] };
```

with:

```js
  const KEYS = {
    ' ': ['Space', 32], n: ['KeyN', 78], d: ['KeyD', 68], u: ['KeyU', 85], r: ['KeyR', 82],
    s: ['KeyS', 83], Escape: ['Escape', 27],
  };
```

- [ ] **Step 2: Add the checks**

Insert this block immediately **before** the final
`check('no uncaught errors in either window', …)` line:

```js
// ── SIGNAL CHECK (operator spec §3.1) ────────────────────────────────────────────────────────
const hidden = () => operator.evaluate("document.getElementById('signal-check').hidden");
await operator.press('n');
await sleep(2000);
check('a university is up again', (await phase(operator)) === 'SCRAMBLE');
const scrambleBefore = await text(operator, 'scramble');
const audienceBefore = (await snapshot(audience)).phase;

await operator.press('s');
await sleep(700);
check('S opens the check', (await hidden()) === false);
check('the check names the mat it is listening to', (await text(operator, 'sc-chain')).includes('Mock mat'));

await play(operator, 'cleanSolve');
await sleep(4000);
check('a whole solve at the mat reaches neither the event nor the room',
  (await phase(operator)) === 'SCRAMBLE' && (await snapshot(audience)).phase === audienceBefore);
check('but the check hears it', (await text(operator, 'sc-clock')) !== '—');
check('and its test ticks', !(await text(operator, 'sc-chain')).includes('0 de 6'));

await operator.press('s');
await sleep(500);
check('S returns to the event where it left it', (await hidden()) === true && (await phase(operator)) === 'SCRAMBLE');
check('with the same scramble', (await text(operator, 'scramble')) === scrambleBefore);

await play(operator, 'reset');
await sleep(500);
check('the mat arms again once the check is closed', (await phase(operator)) === 'ARMED');

await operator.press('s');
await sleep(600);
check('opening the check from ARMED steps back to Mezcla, keeping the scramble',
  (await phase(operator)) === 'SCRAMBLE' && (await text(operator, 'scramble')) === scrambleBefore);
await operator.press('Escape');
await sleep(400);
check('Esc closes it too', (await hidden()) === true);
```

- [ ] **Step 3: Run it**

Run: `npm run smoke`
Expected: `smoke: all checks passed`, with the ten new `PASS` lines among them.

- [ ] **Step 4: Commit**

```bash
git add test/browser/smoke.js
git commit -m "Check in the browser that the mat is cut off while SIGNAL CHECK is open"
```

---

### Task 8: Documentation, and the whole thing once through

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add the screen to the README's feature list**

In `## What it does`, after the line beginning `- Shows a clean audience view`, add:

```markdown
- Diagnoses the mat before the event, and mid-event, on the operator's screen alone: it either
  shows packets arriving or names the link that is broken, and ticks off a six-item test of the mat
```

- [ ] **Step 2: Run everything**

Run: `npm test && npm run smoke`
Expected: `ℹ fail 0` and `smoke: all checks passed`.

- [ ] **Step 3: Confirm the decoder is untouched**

Run: `git status --short vendor/`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "Note the signal check in the README"
```

---

## Running it

```sh
npm start                       # then open http://localhost:8080/
npm start -- --port 3000        # a different port
```

Press `S` from STANDBY or Mezcla. With `?driver=mock` the whole screen runs off the scripted mat, so
it can be rehearsed on a machine with no microphone: open the check, press a scenario button in the
debug view behind it, and watch the chain and the test move.

## Spec coverage

| Operator spec | Where |
|---|---|
| §2.1 colour, §2.2 tokens and sizes, §2.3 no motion | Task 4 |
| §2.4 language, and the `Micrófono N` rewrite | Tasks 2 and 5 |
| §3.1 the bench, the phase table, ARMED → SCRAMBLE | Task 6, proved in Task 7 |
| §3.2 the chain, its readings and thresholds | Task 2 |
| §3.3 the verdict table | Task 2 |
| §3.4 the six-item test | Task 1 |
| §3.5 the readout and its state line | Tasks 2 (`matLine`) and 5 |
| §3.6 the triggered waveform | Tasks 3 and 5 |
| §3.7 the last raw packet and its age | Tasks 3 and 5 |
| §3.8 the input picker, the remembered device, Conectar | Tasks 5 and 6 |
| §3.9 the layout | Task 4 |
| §3.10 the core modules | Tasks 1–3 |
| §3.11 the snapshot is untouched | Task 6: no publish happens, because nothing is dispatched |
| §3.13 edge cases | Tasks 2 (every reading), 6 (the phases), 7 (the bench) |
| §3.14 testing | Tasks 1–3 and 7 |

**Deferred, with reasons** (see Scope): SETUP (screen 9) and the OPERATOR PANEL (screen 10), which
are not designed; hardware validation (roadmap row 10), which retunes `THRESHOLDS`; and §3.12's
requirements, which belong to those screens.

**What the engine plan must already carry** (operator spec §4): `fresh` on driver states, the
`disarm` command, `s` → `signalCheck` in the keymap, and the mock driver's synthesised sample.
Without the first, PAQUETES counts re-emissions as packets; without the second, Task 6's
`openCheck` dispatches a command the reducer ignores, and ARMED would freeze on the projector.

