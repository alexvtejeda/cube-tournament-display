# RESULTS and NO SIGNAL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `subagent-driven-development` (recommended) or
> `executing-plans` to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Build the last two audience screens. **RESULTS** (screen 6) is the closing board: `F` sends
the room through ATTRACT and then lands all thirteen universities in their finishing places, with
RootKitty climbing up over the winner's plate. **NO SIGNAL** (screen 7) is the takeover that says the
mat has stopped answering, over ARMED and RUNNING only. With these, Phase 1's audience window is
complete.

**Architecture:** The same shape as the audience-screens plan. The rules stay pure and live in
`js/ui/audience-screens.js`, so `node --test` can check them; `js/ui/audience.js` puts them on the
page and runs the View Transitions API. RESULTS adds a real phase to the core — a command, a key, a
constant and two snapshot fields — because ending the event is event state. NO SIGNAL adds no core
state at all: it is one boolean on the snapshot, computed in the operator window from the packet
clock SIGNAL CHECK already defines, so the laptop and the projector cannot disagree about whether
the mat is alive.

**Tech Stack:** as in the engine plan: plain ES modules with no build step, and Node 24.2 or newer.
Sizes in CSS container units (`cqw`). The View Transitions API, in Chrome or Edge 111+. Headless
Chrome over the DevTools protocol for the browser scripts, with SwiftShader for WebGL.

**Specs:**
- `docs/superpowers/specs/2026-09-16-tournament-display-ui-design.md`: **§8 RESULTS** and
  **§10 NO SIGNAL** in full, plus §2.7 (the two new families and their changes), §2.4 (the mascot
  asset), §2.5 (the maze) and §4.3 (the standings table).
- `docs/superpowers/specs/2026-09-19-tournament-display-operator-ui-design.md`: §3.2 for
  `THRESHOLDS`, which NO SIGNAL reuses rather than redefining.
- `docs/superpowers/specs/2026-09-15-tournament-display-system-design.md`: §7 (only accepted results
  are persisted, so the RESULTS phase is not).

---

## Scope

**In:** the RESULTS phase and its key; `finalStandings`, `resultsIntro` and `matSilent` on the
snapshot; `matDelivering`; one `packetTimes` for the whole operator window; the RESULTS and NO SIGNAL
screens, their stylesheets and their four screen changes; the 1080p checks; the documentation.

**Out:** screen 10 (OPERATOR PANEL), which is undesigned. UI spec §8.9 lists three things RESULTS
asks of it — listing `F`, saying how many universities have not competed, and keeping the export
within reach — and none of them is built here. The operator window keeps its debug view.

### This plan runs third, and cannot start before three others are done

| Plan | What this plan needs from it |
|---|---|
| `2026-09-18-tournament-engine.md` | `run-state.js`, `snapshot.js`, `keymap.js`, `scoring.js`, `channel.js`, `js/ui/operator.js` |
| `2026-09-18-audience-screens.md` | `js/ui/audience-screens.js`, `js/ui/audience.js`, `css/tokens.css`, `css/audience.css`, the browser harness |
| `2026-09-19-signal-check.md` | `js/core/signal-health.js`, which owns `THRESHOLDS`. **NO SIGNAL cannot be built before it exists** |

The signal-check dependency is the one that is easy to miss, and UI spec §9 now records it. Task 1
checks all three before a line is written.

---

## Conventions

- Everything in the engine plan's Conventions still applies. Use Node 24.2 or newer. Never edit
  `vendor/stackmat.js`. Stage files by name, and **never run `git add -A` or `git add .`** End every
  commit message with the trailer lines your session's instructions give.
- ⚠ **Half of this plan's code has been run, and half has not.** Know which half you are in.
  - **Run, and passing:** every pure function and its tests — Tasks 4, 6, 7 and 8. They were lifted
    into a standalone module with the engine's helpers stubbed (`formatMs`, `plate`, `vt`, `RULE`,
    `soloWhoHtml`) and all **27** of their tests passed on 2026-09-19 before this plan was written.
    Copy that code exactly; if a test fails, you have mistyped something.
  - **Not run:** Tasks 2, 3, 5, 9, 10, 11 and 12, which edit files that do not exist yet. Those
    snippets are careful transcriptions of what the three earlier plans specify, not recordings of
    something that ran.
  - Either way, treat a mismatch between this plan and the code you actually find as a fact about
    the code, not a licence to improvise: stop, read the anchor, and adjust the smallest thing that
    makes it true.
- **Line numbers are deliberately absent for the files this plan modifies.** Three plans will have
  edited `js/ui/operator.js`, `js/ui/audience.js` and `js/ui/audience-screens.js` before this one
  runs, so every modification here names an **anchor**: a verbatim snippet to find, and what to
  replace it with. If an anchor is not found exactly, stop.
- **Test counts are given as deltas** ("this task adds 6 tests"), not as totals, for the same reason:
  the totals depend on how the three earlier plans finished. Record the total you see after Task 1
  and check each delta against it.
- `npm run smoke` and `npm run screens` need Chrome: `google-chrome` on the `PATH`, or `CHROME` set
  to a Chrome binary. `npm run screens` also needs internet access, for the Adobe Fonts kit.
- Each browser script drives its own Chrome on a fixed debug port, so never run two copies of the
  same script at once.
- The approved mockups are in `.superpowers/brainstorm/tournament-display/content/`. That folder is
  gitignored and exists only on the owner's machine. RESULTS is `results-05-paws.html` (the sequence)
  and `results-04-kitty-above.html` (the still); NO SIGNAL is `nosignal-06-identity.html` (the change)
  and `nosignal-01-regime.html` stage C (the still). **Every value they carry is transcribed into the
  spec**, so a missing folder blocks only the visual comparison, not the build.

---

## Files

```
js/core/signal-health.js       modified: + matDelivering()
js/core/snapshot.js            modified: + RESULTS_INTRO_MS, finalStandings, resultsIntro, matSilent
js/core/run-state.js           modified: + the RESULTS phase, the results command, resultsAt
js/core/keymap.js              modified: + f → results
js/ui/operator.js              modified: one packetTimes for the window, the bridge's timer,
                                         the silence ticker, RESULTS in the check's guard
js/ui/audience-screens.js      modified: + resultsHtml, noSignalHtml, attractFooter; screenFor,
                                         familyOf, sceneOf and attractHtml widened
js/ui/audience.js              modified: the bridge's plates, arriving, and the NO SIGNAL body
css/audience.css               modified: + the RESULTS and NO SIGNAL screens, and their motion
test/core/signal-health.test.js    modified
test/core/snapshot.test.js         modified
test/core/run-state.test.js        modified
test/core/keymap.test.js           modified
test/ui/audience-screens.test.js   modified
test/browser/screens.js            modified: RESULTS and NO SIGNAL at 1080p
README.md, ROADMAP.md              modified
```

No file is created. Every one of these already exists when this plan starts, which is why Task 1
exists.

---

## Task 1: Confirm the ground this plan stands on

No code changes. This task fails loudly rather than letting a later task discover a missing
dependency halfway through an edit.

**Files:** none modified.

- [ ] **Step 1: Check the three plans have run**

```bash
node --version                 # must be v24.2.0 or newer
npm test 2>&1 | tail -8        # record `ℹ pass N` — every later delta is measured from this N
npm run smoke 2>&1 | tail -3   # must end: smoke: all checks passed
```

Expected: a green suite and a passing smoke test. If either fails, **stop** — this plan cannot start.

- [ ] **Step 2: Check every symbol this plan builds on exists**

```bash
node --input-type=module -e "
import { THRESHOLDS } from './js/core/signal-health.js';
import { buildSnapshot, VERDICT_MS, STANDINGS_UPDATE_MS } from './js/core/snapshot.js';
import { createState, reduce } from './js/core/run-state.js';
import { commandForKey } from './js/core/keymap.js';
import { standings, audienceStandings } from './js/core/scoring.js';
import { screenFor, familyOf, sceneOf, changeBetween, attractHtml, FRAME_HTML } from './js/ui/audience-screens.js';
console.log('THRESHOLDS', JSON.stringify(THRESHOLDS));
console.log('VERDICT_MS', VERDICT_MS, 'STANDINGS_UPDATE_MS', STANDINGS_UPDATE_MS);
console.log('familyOf(mezcla)', familyOf('mezcla'));
"
```

Expected, exactly:

```
THRESHOLDS {"soundFloorDb":-39,"packetsPerSecond":8,"noiseMax":0.25,"windowMs":2000,"measuringMs":1000}
VERDICT_MS 3000 STANDINGS_UPDATE_MS 4200
familyOf(mezcla) standby
```

`packetsPerSecond: 8` and `windowMs: 2000` are the two numbers NO SIGNAL inherits (UI spec §10.2). If
they have been retuned after the hardware session, that is fine and expected — **record the values
you see** and use them when you reason about Task 4's boundary test, which is written against the
constant and not against `8`.

- [ ] **Step 3: Check the four anchors this plan edits by hand**

```bash
node --input-type=module -e "
import { readFile } from 'node:fs/promises';
const anchors = [
  ['js/core/run-state.js', \"const IDLE_PHASES = ['STANDBY', 'SCRAMBLE', 'ARMED'];\"],
  ['js/ui/operator.js', 'driver.onState((matState) => {'],
  ['js/ui/operator.js', 'const snapshot = buildSnapshot(state, now);'],
  ['js/ui/audience.js', 'function nameCalledPlate(teamId) {'],
];
for (const [file, anchor] of anchors) {
  const text = await readFile(file, 'utf8');
  const n = text.split(anchor).length - 1;
  console.log(n === 1 ? 'ok  ' : 'FAIL', n, file, '::', anchor);
}
"
```

Expected: four lines beginning `ok   1`. Any `FAIL` means an earlier plan left that file in a shape
this one does not expect — **stop and read the file** before editing anything.

Note the second anchor is the signal-check plan's replacement, not the engine plan's original
one-liner. If you find `driver.onState((matState) => dispatch(` instead, the signal-check plan has
not run, and Task 4 has nothing to lift.

- [ ] **Step 4: Check the mascot asset the climb is measured against**

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const d = readFileSync('assets/rootkitty-from-above.png');
const w = d.readUInt32BE(16), h = d.readUInt32BE(20);
console.log(w, h, 'paws below edge:', (((h - 618) / h) * 100).toFixed(2) + '%');
"
```

Expected, exactly: `1200 683 paws below edge: 9.52%`

The `9.52%` in UI spec §8.5's `clip-path` comes from this image and nothing else. A different asset
means new numbers, and §2.4 must be re-measured first.

- [ ] **Step 5: No commit**

This task changes nothing. Record the `pass N` from Step 1 and the `THRESHOLDS` from Step 2 where the
next tasks can see them.

---

## Task 2: The RESULTS phase, `resultsAt`, and `F`

**Files:**
- Modify: `js/core/run-state.js`
- Modify: `js/core/keymap.js`
- Test: `test/core/run-state.test.js`, `test/core/keymap.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `test/core/run-state.test.js`. The helper is named `resultsConfig` on purpose: the file
already has its own fixtures, and a second `config` would be a redeclaration.

```js
// --- RESULTS (UI spec §8.7) ---

function resultsConfig() {
  return {
    teams: [
      { id: 'intec', university: 'INTEC', participant: 'José Martínez' },
      { id: 'itla', university: 'ITLA', participant: 'Ana Pérez' },
      { id: 'pucmm', university: 'PUCMM', participant: null },
    ],
    attemptsPerCompetitor: 3,
    cutoffMs: 300000,
  };
}

const command = (state, name, at = 1000) => reduce(state, { type: 'command', command: name, at });

test('results ends the event from STANDBY and stamps resultsAt', () => {
  const state = command(createState(resultsConfig()), 'results', 7000);
  assert.equal(state.phase, 'RESULTS');
  assert.equal(state.resultsAt, 7000);
});

test('results drops the attempt in progress but keeps the roster position', () => {
  const scrambling = command(createState(resultsConfig()), 'next');
  assert.equal(scrambling.phase, 'SCRAMBLE');
  const state = command(scrambling, 'results', 7000);
  assert.equal(state.phase, 'RESULTS');
  assert.equal(state.attemptNo, null);
  assert.equal(state.scramble, null);
  assert.equal(state.scrambleSvg, null);
  assert.equal(state.teamIndex, scrambling.teamIndex);
});

test('results is ignored outside STANDBY and SCRAMBLE', () => {
  const armed = { ...createState(resultsConfig()), phase: 'ARMED' };
  for (const phase of ['ARMED', 'RUNNING', 'PENDING', 'RESULTS']) {
    const state = command({ ...armed, phase }, 'results', 7000);
    assert.equal(state.phase, phase, `${phase} must ignore results`);
  }
});

test('results clears the verdict, so F during one ends it at once', () => {
  const state = command({ ...createState(resultsConfig()), lastDecision: { kind: 'OK', at: 10 } }, 'results', 7000);
  assert.equal(state.lastDecision, null);
});

test('N from RESULTS calls the university at teamIndex, as from STANDBY', () => {
  const results = command(createState(resultsConfig()), 'results', 7000);
  const state = command(results, 'next');
  assert.equal(state.phase, 'SCRAMBLE');
  assert.equal(state.teamIndex, 0);
  assert.equal(state.resultsAt, null);
});

test('undo from RESULTS reopens the last attempt and clears resultsAt', () => {
  const attempts = [
    { teamId: 'intec', attempt: 1, ms: 84020, penalty: null, status: 'OK', scramble: 'R U', inspectionMs: null, at: 5 },
  ];
  const results = command(createState(resultsConfig(), attempts), 'results', 7000);
  const state = command(results, 'undo');
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.pendingMs, 84020);
  assert.equal(state.resultsAt, null);
});

test('RESULTS ignores the mat and every decision key', () => {
  const results = command(createState(resultsConfig()), 'results', 7000);
  for (const name of ['accept', 'plus2', 'dnf', 'redo', 'startInspection', 'cancelInspection']) {
    assert.equal(command(results, name).phase, 'RESULTS', `${name} must not move RESULTS`);
  }
  const mat = reduce(results, { type: 'mat', state: { on: true, running: false, time_milli: 0, signalHeader: 'I' }, at: 8000 });
  assert.equal(mat.phase, 'RESULTS');
  assert.equal(mat.resultsAt, 7000);
});
```

Append to `test/core/keymap.test.js`:

```js
test('f and F end the event', () => {
  assert.equal(commandForKey('f', 'STANDBY'), 'results');
  assert.equal(commandForKey('F', 'STANDBY'), 'results');
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test test/core/run-state.test.js test/core/keymap.test.js`
Expected: FAIL. The keymap test reports `null !== 'results'`; the run-state tests report
`'STANDBY' !== 'RESULTS'` and `undefined !== 7000`.

- [ ] **Step 3: Bind the key**

In `js/core/keymap.js`, find:

```js
  u: 'undo',
```

and replace with:

```js
  u: 'undo',
  // Ends the event and puts the closing board up (UI spec §8.1). A key of its own, because N can
  // never end an event with an absent university in it.
  f: 'results',
```

- [ ] **Step 4: Add the phase to the run state**

Four edits in `js/core/run-state.js`, in file order.

**4a.** Find:

```js
// Where the operator may move around the roster. RUNNING is live and PENDING is a gate.
const IDLE_PHASES = ['STANDBY', 'SCRAMBLE', 'ARMED'];
```

Replace with:

```js
// Where the operator may move around the roster. RUNNING is live and PENDING is a gate. RESULTS is
// here so a latecomer can still be called after the board is up (UI spec §8.7).
const IDLE_PHASES = ['STANDBY', 'SCRAMBLE', 'ARMED', 'RESULTS'];
```

**4b.** In `createState`, find:

```js
    lastDecision: null,
  };
}
```

Replace with:

```js
    lastDecision: null,
    // When F ended the event, for the audience's bridge through ATTRACT (UI spec §8.7). Like
    // lastDecision it is not persisted, so a reload lands back on Resultado.
    resultsAt: null,
  };
}
```

**4c.** Find:

```js
const cleared = () => ({ inspectionStartedAt: null, inspectionMs: null, pendingMs: null, lastDecision: null });
```

Replace with:

```js
const cleared = () => ({ inspectionStartedAt: null, inspectionMs: null, pendingMs: null, lastDecision: null, resultsAt: null });
```

This is why `next`, `←`, `→` and a decision all leave RESULTS cleanly: every one of them goes through
`cleared()`.

**4d.** In `onCommand`, find:

```js
    case 'next':
      // From STANDBY, N may continue the university at teamIndex if it has attempts left (the start
      // of the event, or a resume). Anywhere else it moves on.
      return IDLE_PHASES.includes(phase)
        ? selectTeam(state, findTeam(state.event, state.teamIndex + (phase === 'STANDBY' ? 0 : 1), 1))
        : state;
```

Replace with:

```js
    case 'next':
      // From STANDBY, N may continue the university at teamIndex if it has attempts left (the start
      // of the event, or a resume). From RESULTS it behaves the same way, for a latecomer (UI spec
      // §8.7). Anywhere else it moves on.
      return IDLE_PHASES.includes(phase)
        ? selectTeam(state, findTeam(state.event, state.teamIndex + (phase === 'STANDBY' || phase === 'RESULTS' ? 0 : 1), 1))
        : state;
    case 'results':
      // F ends the event from any settled screen. The attempt in progress is dropped, exactly as
      // when a university completes, so the bridge starts from a screen that is not mid-attempt.
      // teamIndex is kept, so N can still call a latecomer afterwards (UI spec §8.7).
      return phase === 'STANDBY' || phase === 'SCRAMBLE'
        ? { ...state, ...cleared(), phase: 'RESULTS', resultsAt: at, attemptNo: null, scramble: null, scrambleSvg: null }
        : state;
```

**4e.** In `undo`, find:

```js
    inspectionStartedAt: null,
    lastDecision: null,
```

Replace with:

```js
    inspectionStartedAt: null,
    lastDecision: null,
    resultsAt: null,
```

`undo` builds its own object rather than spreading `cleared()`, so it needs this line of its own.

- [ ] **Step 5: Run the tests**

Run: `node --test test/core/run-state.test.js test/core/keymap.test.js`
Expected: PASS. This task adds **8 tests**.

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: green, `pass N + 8` against Task 1's N. If anything else fails, it is almost certainly a
test that asserts the exact shape of `createState` or of `cleared()` — both gained a field. Update
that assertion; do not remove the field.

- [ ] **Step 7: Commit**

```bash
git add js/core/run-state.js js/core/keymap.js test/core/run-state.test.js test/core/keymap.test.js
git commit -m "Add the RESULTS phase and the key that ends the event"
```

---

## Task 3: The snapshot: `finalStandings`, `resultsIntro` and `matSilent`

**Files:**
- Modify: `js/core/snapshot.js`
- Test: `test/core/snapshot.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `test/core/snapshot.test.js`. `RESULTS_INTRO_MS` joins the existing import from
`../../js/core/snapshot.js` at the top of the file.

```js
// --- RESULTS and NO SIGNAL (UI spec §8.8, §10.6) ---

function boardConfig() {
  return {
    teams: [
      { id: 'intec', university: 'INTEC', participant: 'José Martínez' },
      { id: 'itla', university: 'ITLA', participant: 'Ana Pérez' },
      { id: 'pucmm', university: 'PUCMM', participant: null },
    ],
    attemptsPerCompetitor: 3,
    cutoffMs: 300000,
  };
}

const finished = () => [
  { teamId: 'intec', attempt: 1, ms: 84020, penalty: null, status: 'OK', scramble: 'R U', inspectionMs: null, at: 10 },
  { teamId: 'itla', attempt: 1, ms: 115880, penalty: null, status: 'OK', scramble: 'R U', inspectionMs: null, at: 20 },
];

const board = (extra = {}) => ({ ...createState(boardConfig(), finished()), phase: 'RESULTS', resultsAt: 7000, ...extra });

test('finalStandings holds every university in RESULTS, and is null elsewhere', () => {
  const snapshot = buildSnapshot(board(), 20000);
  assert.equal(snapshot.finalStandings.length, 3);
  assert.deepEqual(snapshot.finalStandings.map((r) => r.teamId), ['intec', 'itla', 'pucmm']);
  assert.deepEqual(snapshot.finalStandings.map((r) => r.group), ['ranked', 'ranked', 'pending']);
  assert.equal(buildSnapshot(createState(boardConfig(), finished()), 20000).finalStandings, null);
});

test('the capped standings are unchanged by RESULTS', () => {
  const snapshot = buildSnapshot(board(), 20000);
  assert.deepEqual(snapshot.standings.map((r) => r.teamId), ['intec', 'itla']);
});

test('competitor is null in RESULTS', () => {
  assert.equal(buildSnapshot(board({ teamIndex: 1 }), 20000).competitor, null);
  assert.equal(buildSnapshot(board({ teamIndex: 1 }), 20000).attemptNo, null);
  assert.equal(buildSnapshot(board({ teamIndex: 1 }), 20000).scramble, null);
});

test('resultsIntro is true until RESULTS_INTRO_MS has passed, and false after', () => {
  assert.equal(buildSnapshot(board(), 7000 + RESULTS_INTRO_MS - 1).resultsIntro, true);
  assert.equal(buildSnapshot(board(), 7000 + RESULTS_INTRO_MS).resultsIntro, false);
  assert.equal(RESULTS_INTRO_MS, 2400);
});

test('resultsIntro is false in every other phase', () => {
  assert.equal(buildSnapshot(createState(boardConfig(), finished()), 20000).resultsIntro, false);
});

test('matSilent defaults to false and is carried through when given', () => {
  assert.equal(buildSnapshot(board(), 20000).matSilent, false);
  assert.equal(buildSnapshot(board(), 20000, { matSilent: true }).matSilent, true);
});

test('a RESULTS snapshot still survives structuredClone', () => {
  const snapshot = buildSnapshot(board(), 20000, { matSilent: true });
  assert.deepEqual(structuredClone(snapshot), snapshot);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test test/core/snapshot.test.js`
Expected: FAIL. `RESULTS_INTRO_MS` is not exported, so the file fails to import — the first error is
`SyntaxError: The requested module ... does not provide an export named 'RESULTS_INTRO_MS'`.

- [ ] **Step 3: Add the constant**

In `js/core/snapshot.js`, find:

```js
// When the standings update after a verdict: once the screen change (--t-long, 800 ms) and a pause
// (--t-step, 400 ms) have run. The two numbers are the motion tokens of UI spec §2.2.
export const STANDINGS_UPDATE_MS = VERDICT_MS + 800 + 400;
```

Replace with:

```js
// When the standings update after a verdict: once the screen change (--t-long, 800 ms) and a pause
// (--t-step, 400 ms) have run. The two numbers are the motion tokens of UI spec §2.2.
export const STANDINGS_UPDATE_MS = VERDICT_MS + 800 + 400;
// The bridge through ATTRACT after F: the screen change into it (--t-long, 800 ms) and the hold
// (two --t-long, 1600 ms), UI spec §8.2. The same motion tokens again.
export const RESULTS_INTRO_MS = 800 + 1600;
```

- [ ] **Step 4: Widen `buildSnapshot`**

Find:

```js
export function buildSnapshot(state, now) {
  const { event, phase } = state;
  const { config } = event;
  const table = standings(event);
  const competitor = phase === 'STANDBY' ? null : config.teams[state.teamIndex];
```

Replace with:

```js
// `matSilent` comes from the operator window, which owns the microphone and the packet clock: the
// core has neither (UI spec §10.6). It defaults to false so every existing caller and test is
// unaffected, and so a window that never measures shows no takeover rather than a permanent one.
export function buildSnapshot(state, now, { matSilent = false } = {}) {
  const { event, phase } = state;
  const { config } = event;
  const table = standings(event);
  // RESULTS has no competitor, for the same reason STANDBY has none: nobody is up (UI spec §8.8).
  const competitor = phase === 'STANDBY' || phase === 'RESULTS' ? null : config.teams[state.teamIndex];
```

Then find:

```js
    standingsBefore: standingsBefore(state, now),
  };
}
```

Replace with:

```js
    standingsBefore: standingsBefore(state, now),
    // The full table — ranked, then all-DNF, then never competed — for the closing board. The
    // capped `standings` above is unchanged (UI spec §4.3, §8.8).
    finalStandings: phase === 'RESULTS' ? table : null,
    // The bridge through ATTRACT, from F to the board (UI spec §8.2).
    resultsIntro: phase === 'RESULTS' && now - state.resultsAt < RESULTS_INTRO_MS,
    matSilent,
  };
}
```

- [ ] **Step 5: Run the tests**

Run: `node --test test/core/snapshot.test.js`
Expected: PASS. This task adds **7 tests**.

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: green, `pass N + 15` against Task 1's N.

- [ ] **Step 7: Commit**

```bash
git add js/core/snapshot.js test/core/snapshot.test.js
git commit -m "Carry the closing board and a silent mat on the snapshot"
```

---

## Task 4: `matDelivering`

One pure function, beside the thresholds it reads. It is the whole of NO SIGNAL's rule.

**Files:**
- Modify: `js/core/signal-health.js`
- Test: `test/core/signal-health.test.js`

- [ ] **Step 1: Write the failing test**

Append to `test/core/signal-health.test.js`. `matDelivering` joins the existing import from
`../../js/core/signal-health.js`.

**Every assertion is written against `THRESHOLDS`, never against `8` or `2000`**, because the
hardware session (roadmap row 10) is expected to retune both and must not break this file.

```js
// --- matDelivering (UI spec §10.2, §10.6) ---

// `n` packets spread across the window, newest last, all inside it.
const spread = (n, now) => Array.from({ length: n }, (_, i) => now - THRESHOLDS.windowMs + 1 + i);

test('a mat that has sent nothing is not delivering', () => {
  assert.equal(matDelivering([], 100000), false);
});

test('a healthy mat at ten packets a second is delivering', () => {
  const now = 100000;
  const steady = Array.from({ length: 20 }, (_, i) => now - 1900 + i * 100);
  assert.equal(matDelivering(steady, now), true);
});

test('the boundary is the rate across the window, not a count', () => {
  const now = 100000;
  const need = THRESHOLDS.packetsPerSecond * (THRESHOLDS.windowMs / 1000);
  assert.equal(matDelivering(spread(need, now), now), true, 'exactly the threshold is delivering');
  assert.equal(matDelivering(spread(need - 1, now), now), false, 'one below is not');
});

test('packets older than the window are not counted', () => {
  const now = 100000;
  const stale = Array.from({ length: 200 }, (_, i) => now - THRESHOLDS.windowMs - 1 - i);
  assert.equal(matDelivering(stale, now), false);
});

test('a healthy mat stops delivering about four hundred milliseconds after it goes quiet', () => {
  // A steady stream that stopped `gap` ago. At ten a second, the window empties past the threshold
  // once a fifth of it has gone by — the ~400 ms of UI spec §10.2.
  const at = (gap) => {
    const now = 100000;
    const last = now - gap;
    return matDelivering(Array.from({ length: 40 }, (_, i) => last - i * 100).filter((t) => t > 0), now);
  };
  assert.equal(at(300), true, 'a 300 ms gap is not a lost signal');
  assert.equal(at(600), false, 'a 600 ms gap is');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/core/signal-health.test.js`
Expected: FAIL — `does not provide an export named 'matDelivering'`.

- [ ] **Step 3: Write it**

In `js/core/signal-health.js`, find:

```js
// The decoder's `power` is a mean square, floored at 0.0001, so -40 dB is its silence.
export function levelDb(power) {
```

Replace with:

```js
// Whether the mat is delivering, by the same rule SIGNAL CHECK's PAQUETES link uses: the *rate*
// across the window, not a raw count. NO SIGNAL reads this (UI spec §10.2, §10.6), so the
// projector and the laptop can never disagree about a dead mat, and one edit after the hardware
// session retunes both. From a healthy ten a second it turns over at about 400 ms of silence.
export function matDelivering(packetTimes, now) {
  const recent = packetTimes.filter((t) => t > now - THRESHOLDS.windowMs).length;
  return recent / (THRESHOLDS.windowMs / 1000) >= THRESHOLDS.packetsPerSecond;
}

// The decoder's `power` is a mean square, floored at 0.0001, so -40 dB is its silence.
export function levelDb(power) {
```

- [ ] **Step 4: Run the test**

Run: `node --test test/core/signal-health.test.js`
Expected: PASS. This task adds **5 tests**.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: green, `pass N + 20`.

- [ ] **Step 6: Commit**

```bash
git add js/core/signal-health.js test/core/signal-health.test.js
git commit -m "Say when the mat has stopped delivering, by SIGNAL CHECK's own rule"
```

---

## Task 5: The operator window: a packet clock, the bridge's timer, and RESULTS in the check's guard

Browser wiring, so the tests for it are the browser scripts in Task 12. What this task must not break
is the existing suite and the existing smoke test.

**Files:**
- Modify: `js/ui/operator.js`

**Why the window keeps its own `packetTimes`.** SIGNAL CHECK has an array of the same name, but it is
reset when the check opens and measured from `openedAt`, because the check is a bench that starts
fresh each time. NO SIGNAL needs the opposite: one continuous record for as long as the window is
open. Sharing one array would force one of them to adopt the other's lifecycle. What has to agree
between them is `THRESHOLDS`, and it does — both read the same constant, which is the whole point of
UI spec §10.2.

- [ ] **Step 1: Widen the imports**

Find:

```js
import { STANDINGS_UPDATE_MS, VERDICT_MS, buildSnapshot } from '../core/snapshot.js';
```

Replace with:

```js
import { THRESHOLDS, matDelivering } from '../core/signal-health.js';
import { RESULTS_INTRO_MS, STANDINGS_UPDATE_MS, VERDICT_MS, buildSnapshot } from '../core/snapshot.js';
```

Keep the import list in the file's existing alphabetical order by path: `../core/signal-health.js`
sorts before `../core/snapshot.js`.

- [ ] **Step 2: Keep the packet clock**

Find:

```js
  let state = createState(config, attempts);
  let requestedSeq = state.scrambleSeq;
```

Replace with:

```js
  let state = createState(config, attempts);
  let requestedSeq = state.scrambleSeq;
  // When the mat's packets arrived, for NO SIGNAL (UI spec §10.6). SIGNAL CHECK keeps an array of
  // its own: that one restarts with the check, this one runs for as long as the window is open.
  const packetTimes = [];
  let matSilent = false;
  const trimPackets = (now) => {
    while (packetTimes.length > 0 && packetTimes[0] < now - THRESHOLDS.windowMs) packetTimes.shift();
  };
```

- [ ] **Step 3: Publish it, and end the bridge on time**

Find:

```js
    const decision = state.lastDecision;
    if (decision !== null && decision !== previous.lastDecision) {
      for (const delay of [VERDICT_MS, STANDINGS_UPDATE_MS]) setTimeout(() => dispatch({ type: 'render' }), decision.at + delay - now);
    }
    const snapshot = buildSnapshot(state, now);
```

Replace with:

```js
    const decision = state.lastDecision;
    if (decision !== null && decision !== previous.lastDecision) {
      for (const delay of [VERDICT_MS, STANDINGS_UPDATE_MS]) setTimeout(() => dispatch({ type: 'render' }), decision.at + delay - now);
    }
    // The bridge through ATTRACT ends on time too, and the mat plays no part in it (UI spec §8.2).
    if (state.resultsAt !== null && state.resultsAt !== previous.resultsAt) {
      setTimeout(() => dispatch({ type: 'render' }), state.resultsAt + RESULTS_INTRO_MS - now);
    }
    trimPackets(now);
    matSilent = !matDelivering(packetTimes, now);
    const snapshot = buildSnapshot(state, now, { matSilent });
```

- [ ] **Step 4: Record every packet, before the routing seam**

Find:

```js
  driver.onState((matState) => {
    if (checkOpen) {
      signalCheck.onMat(matState);
      return;
    }
    dispatch({ type: 'mat', state: matState, at: Date.now() });
  });
```

Replace with:

```js
  driver.onState((matState) => {
    const now = Date.now();
    // Recorded before the seam, so the window's idea of a live mat survives the check being open.
    // The check is a bench and swallows the packets; whether the mat is alive is not the bench's
    // business (UI spec §10.6).
    if (matState.fresh && matState.on) packetTimes.push(now);
    trimPackets(now);
    if (checkOpen) {
      signalCheck.onMat(matState);
      return;
    }
    dispatch({ type: 'mat', state: matState, at: now });
  });

  // A mat that has gone quiet sends nothing, so nothing arrives to trigger a render. A ticker
  // notices, and re-publishes once, at the moment the answer changes (UI spec §10.6).
  setInterval(() => {
    const now = Date.now();
    trimPackets(now);
    if (!matDelivering(packetTimes, now) !== matSilent) dispatch({ type: 'render' });
  }, 200);
```

- [ ] **Step 5: Let the check open from RESULTS**

The signal-check plan left a note for this exact moment. Find:

```js
    // ARMED is the one held screen that draws live mat data — the hands, the light, the inspection
    // countdown — so it steps back to SCRAMBLE, keeping the scramble, rather than freezing into a
    // lie on the projector. RESULTS joins this list when that phase exists.
    const armedAndWaiting = state.phase === 'ARMED' && state.inspectionStartedAt === null;
    if (!['STANDBY', 'SCRAMBLE'].includes(state.phase) && !armedAndWaiting) return;
```

Replace with:

```js
    // ARMED is the one held screen that draws live mat data — the hands, the light, the inspection
    // countdown — so it steps back to SCRAMBLE, keeping the scramble, rather than freezing into a
    // lie on the projector. RESULTS is settled and the mat plays no part in it, so it is safe.
    const armedAndWaiting = state.phase === 'ARMED' && state.inspectionStartedAt === null;
    if (!['STANDBY', 'SCRAMBLE', 'RESULTS'].includes(state.phase) && !armedAndWaiting) return;
```

- [ ] **Step 6: Check it parses, and that nothing regressed**

```bash
node --check js/ui/operator.js
npm test 2>&1 | tail -6
npm run smoke 2>&1 | tail -3
```

Expected: `node --check` prints nothing and exits 0 (the project sets `"type": "module"`, so it is
parsed as a module); the suite is still `pass N + 20`; the smoke test still ends
`smoke: all checks passed`. This task adds no tests — its behaviour is checked in Task 12.

- [ ] **Step 7: Commit**

```bash
git add js/ui/operator.js
git commit -m "Give the operator window a packet clock and the bridge's timer"
```

---

## Task 6: The rules: which screen, which family, and ATTRACT's two footers

Pure, so all of it runs under `node --test`.

**Files:**
- Modify: `js/ui/audience-screens.js`
- Test: `test/ui/audience-screens.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `test/ui/audience-screens.test.js`. `attractFooter` joins the existing import from
`../../js/ui/audience-screens.js`.

```js
// --- RESULTS and NO SIGNAL (UI spec §8.2, §10.1) ---

// Only the fields these rules read. A real snapshot has many more.
const view = (extra = {}) => ({
  phase: 'ARMED', result: null, verdict: null, resultsIntro: false, matSilent: false, ...extra,
});

test('RESULTS shows the bridge first and the board after', () => {
  assert.equal(screenFor(view({ phase: 'RESULTS', resultsIntro: true })), 'attract');
  assert.equal(screenFor(view({ phase: 'RESULTS', resultsIntro: false })), 'results');
});

test('a silent mat takes over ARMED and RUNNING', () => {
  assert.equal(screenFor(view({ phase: 'ARMED', matSilent: true })), 'nosignal');
  assert.equal(screenFor(view({ phase: 'RUNNING', matSilent: true })), 'nosignal');
});

test('a silent mat changes nothing anywhere else', () => {
  assert.equal(screenFor(view({ phase: 'PENDING', matSilent: true })), 'pending');
  assert.equal(screenFor(view({ phase: 'STANDBY', matSilent: true })), 'attract');
  assert.equal(screenFor(view({ phase: 'STANDBY', matSilent: true, result: { teamId: 'intec' } })), 'resultado');
  assert.equal(screenFor(view({ phase: 'SCRAMBLE', matSilent: true })), 'mezcla');
  assert.equal(screenFor(view({ phase: 'RESULTS', matSilent: true })), 'results');
});

test('a verdict outlasts a silent mat, so PENDING is never covered', () => {
  const verdict = { kind: 'OK', teamId: 'intec', attempt: 2, ms: 84020, reason: null };
  assert.equal(screenFor(view({ phase: 'SCRAMBLE', matSilent: true, verdict })), 'pending');
});

test('the two new families', () => {
  assert.equal(familyOf('results'), 'results');
  assert.equal(familyOf('nosignal'), 'signal');
});

test('a change runs into and out of NO SIGNAL, but never inside it', () => {
  const solo = { screen: 'running', featured: 'intec', rows: null };
  const gone = { screen: 'nosignal', featured: 'intec', rows: null };
  assert.equal(changeBetween(solo, gone), 'screen');
  assert.equal(changeBetween(gone, solo), 'screen');
  assert.equal(changeBetween(gone, { ...gone }), null);
});

test('a change runs from the bridge to the board', () => {
  assert.equal(changeBetween({ screen: 'attract', featured: null, rows: null }, { screen: 'results', featured: null, rows: null }), 'screen');
});

test("ATTRACT's footer names what the room is waiting for", () => {
  assert.equal(attractFooter({ phase: 'STANDBY' }), 'Comenzamos en breve');
  assert.equal(attractFooter({ phase: 'RESULTS' }), 'Resultados finales');
});

test('ATTRACT names its face and tagline, for the bridge out', () => {
  const html = attractHtml([{ id: 'intec', university: 'INTEC', participant: null }]);
  assert.ok(html.includes('view-transition-name:attract-face'));
  assert.ok(html.includes('view-transition-name:attract-tag'));
  assert.ok(html.includes('data-slot="footer"'), 'the footer is a slot, so its words change in place');
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test test/ui/audience-screens.test.js`
Expected: FAIL — `does not provide an export named 'attractFooter'`.

- [ ] **Step 3: Widen `screenFor` and the families**

In `js/ui/audience-screens.js`, find:

```js
// Which screen a snapshot shows (UI spec §4.1, §7.6). PENDING's layout stays up for its verdict,
// after the phase has already moved on to SCRAMBLE or STANDBY.
export function screenFor({ phase, result, verdict }) {
  if (verdict !== null || phase === 'PENDING') return 'pending';
  if (phase === 'STANDBY') return result === null ? 'attract' : 'resultado';
  if (phase === 'SCRAMBLE') return 'mezcla';
  return phase === 'ARMED' ? 'armed' : 'running';
}
```

Replace with:

```js
// Which screen a snapshot shows (UI spec §4.1, §7.6, §8.2, §10.1). PENDING's layout stays up for its
// verdict, after the phase has already moved on to SCRAMBLE or STANDBY.
export function screenFor({ phase, result, verdict, resultsIntro, matSilent }) {
  // The verdict comes first, which is also what exempts PENDING from NO SIGNAL: the mat plays no
  // part while the operator decides, and covering a verdict would destroy it (§10.1.1).
  if (verdict !== null || phase === 'PENDING') return 'pending';
  // The closing board arrives through ATTRACT, which is the bridge (§8.2).
  if (phase === 'RESULTS') return resultsIntro ? 'attract' : 'results';
  if (phase === 'STANDBY') return result === null ? 'attract' : 'resultado';
  if (phase === 'SCRAMBLE') return 'mezcla';
  // Only here: the mat's silence is news exactly where the room is waiting on the mat (§10.1).
  if (matSilent) return 'nosignal';
  return phase === 'ARMED' ? 'armed' : 'running';
}
```

Then find:

```js
const FAMILY = { attract: 'attract', resultado: 'standby', mezcla: 'standby', armed: 'solo', running: 'solo', pending: 'solo' };
```

Replace with:

```js
const FAMILY = {
  attract: 'attract', resultado: 'standby', mezcla: 'standby',
  armed: 'solo', running: 'solo', pending: 'solo',
  results: 'results', nosignal: 'signal',
};
```

`sceneOf` and `changeBetween` need no change. `results` and `nosignal` are neither `standby` nor each
other's family, so a change runs into and out of both and never inside one — which is what §2.7 asks
for, and why NO SIGNAL does not re-animate on every packet while it is up.

`mazeFrozen` needs no change either: NO SIGNAL over RUNNING still has `phase === 'RUNNING'`, so the
maze stays frozen, and RESULTS is neither, so it runs (§2.5, §8.7).

- [ ] **Step 4: Give ATTRACT its two footers, and name its face and tagline**

Find:

```js
export function attractHtml(teams) {
  return `<div class="attract">
  <div class="hero">
    <div class="eyes"><img class="face" src="assets/rootkitty-face-attract.svg" alt=""></div>
    <div class="title">
      <img class="logo" src="assets/logo-ctf.svg" alt="CTF Interuniversitario 2026"${vt('logo')}>
      <div class="tag">RETO DEL CUBO</div>
    </div>
  </div>
  <div class="unis"${vt('attract-plates')}>${teams.map((team) => plate(team, false)).join('')}</div>
  <div class="soon"${vt('attract-footer')}>Comenzamos en breve</div>
</div>`;
}
```

Replace with:

```js
// What ATTRACT is waiting for: the start of the event, or the board that ends it (§8.6). Each
// string lives in one place, as PENDING's do (§2.6, §7.3).
export const attractFooter = ({ phase }) => (phase === 'RESULTS' ? 'Resultados finales' : 'Comenzamos en breve');

// The face and the tagline are named so they can fade on their own over --t-step on the way to
// RESULTS, while the plates move over --t-long (§2.7, §8.2). The footer is a slot, so changing its
// words does not rewrite the grid and re-request thirteen logos (§8.10).
export function attractHtml(teams) {
  return `<div class="attract">
  <div class="hero">
    <div class="eyes"${vt('attract-face')}><img class="face" src="assets/rootkitty-face-attract.svg" alt=""></div>
    <div class="title">
      <img class="logo" src="assets/logo-ctf.svg" alt="CTF Interuniversitario 2026"${vt('logo')}>
      <div class="tag"${vt('attract-tag')}>RETO DEL CUBO</div>
    </div>
  </div>
  <div class="unis"${vt('attract-plates')}>${teams.map((team) => plate(team, false)).join('')}</div>
  <div class="soon" data-slot="footer"${vt('attract-footer')}></div>
</div>`;
}
```

The name goes on `.eyes`, not on the image: §3.2 masks the face, and a view transition captures the
box it is given, so naming the wrapper captures the masked result whichever element carries the mask.

- [ ] **Step 5: Run the tests**

Run: `node --test test/ui/audience-screens.test.js`
Expected: PASS, except any existing test that asserts ATTRACT's footer text from `attractHtml`. That
text now arrives through the slot. Change such a test to assert `attractFooter(...)` instead of
deleting it. This task adds **9 tests**.

- [ ] **Step 6: Commit**

```bash
git add js/ui/audience-screens.js test/ui/audience-screens.test.js
git commit -m "Choose the closing board and the takeover, and give ATTRACT two footers"
```

---

## Task 7: RESULTS, as HTML

**Files:**
- Modify: `js/ui/audience-screens.js`
- Test: `test/ui/audience-screens.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `test/ui/audience-screens.test.js`. `RESULTS_FRAME_HTML` and `resultsHtml` join the import.

```js
// --- The closing board (UI spec §8.3, §8.6) ---

const TEAMS = [
  { id: 'intec', university: 'INTEC', participant: 'José Martínez' },
  { id: 'itla', university: 'ITLA', participant: 'Ana Pérez' },
  { id: 'pucmm', university: 'PUCMM', participant: null },
  { id: 'uapa', university: 'UAPA', participant: null },
  { id: 'unibe', university: 'UNIBE', participant: null },
];

const row = (teamId, group, position, bestMs) => ({ teamId, group, position, bestMs });

const finalBoard = () => ({
  teams: TEAMS,
  finalStandings: [
    row('intec', 'ranked', 1, 84020),
    row('itla', 'ranked', 2, 104180),
    row('pucmm', 'ranked', 3, 115880),
    row('uapa', 'unranked', null, null),
    row('unibe', 'pending', null, null),
  ],
});

test('the podium reads 2nd, 1st, 3rd, and the rest go to the grid', () => {
  const html = resultsHtml(finalBoard());
  const podium = html.slice(html.indexOf('class="podium"'), html.indexOf('class="grid"'));
  assert.deepEqual([...podium.matchAll(/data-team="([a-z]+)"/g)].map((m) => m[1]), ['itla', 'intec', 'pucmm']);
  const grid = html.slice(html.indexOf('class="grid"'));
  assert.deepEqual([...grid.matchAll(/data-team="([a-z]+)"/g)].map((m) => m[1]), ['uapa', 'unibe']);
});

test('every university appears exactly once, and every plate is named', () => {
  const html = resultsHtml(finalBoard());
  for (const team of TEAMS) {
    assert.equal(html.split(`data-team="${team.id}"`).length - 1, 1, `${team.id} appears once`);
    assert.ok(html.includes(`view-transition-name:plate-${team.id}`), `${team.id}'s plate is named`);
  }
});

test('the podium labels the three places, and only a ranked one', () => {
  const html = resultsHtml(finalBoard());
  assert.ok(html.includes('PRIMER LUGAR'));
  assert.ok(html.includes('SEGUNDO LUGAR'));
  assert.ok(html.includes('TERCER LUGAR'));
});

test('an unranked podium row shows no label and no place', () => {
  const board = finalBoard();
  board.finalStandings = [
    row('intec', 'unranked', null, null),
    row('itla', 'pending', null, null),
    row('pucmm', 'pending', null, null),
    row('uapa', 'pending', null, null),
    row('unibe', 'pending', null, null),
  ];
  const html = resultsHtml(board);
  assert.ok(!html.includes('PRIMER LUGAR'));
  assert.ok(html.includes('—'), 'competed, no valid time');
  assert.ok(html.includes('NO PARTICIPÓ'), 'never competed');
});

test('a dash means competed with no valid time, and NO PARTICIPÓ means never competed', () => {
  const html = resultsHtml(finalBoard());
  const cell = (id) => {
    const start = html.indexOf(`data-team="${id}"`);
    return html.slice(start, html.indexOf('</div></div>', start));
  };
  assert.ok(cell('uapa').includes('—'));
  assert.ok(!cell('uapa').includes('NO PARTICIPÓ'));
  assert.ok(cell('unibe').includes('NO PARTICIPÓ'));
});

test('the winner carries the kitty, and nobody else does', () => {
  const html = resultsHtml(finalBoard());
  assert.equal(html.split('class="kit"').length - 1, 1);
  assert.ok(html.indexOf('class="kit"') < html.indexOf('data-team="intec"'), 'inside the first step');
  assert.ok(html.includes('rootkitty-from-above.png'));
});

test('RESULTS has no band, which is what lets the band rise again on the way out', () => {
  assert.ok(!RESULTS_FRAME_HTML.includes('class="band"'));
  assert.ok(RESULTS_FRAME_HTML.includes('RESULTADOS FINALES'));
  assert.ok(RESULTS_FRAME_HTML.includes('view-transition-name:logo'));
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test test/ui/audience-screens.test.js`
Expected: FAIL — `does not provide an export named 'resultsHtml'`.

- [ ] **Step 3: Write it**

Append to `js/ui/audience-screens.js`, after `soloWhoHtml`:

```js
// RESULTS (§8.3). There is no band: thirteen places do not fit above one, and the event has no next
// scramble. Its absence is also what makes the band rise again on the way to Mezcla or PENDING
// (§2.7).
export const RESULTS_FRAME_HTML = `<div class="frame noband">
  <header class="hdr"><img src="assets/logo-ctf.svg" alt="CTF Interuniversitario 2026"${vt('logo')}><span>RESULTADOS FINALES</span></header>
  <div class="body" data-slot="body"></div>
</div>`;

const LUGAR = ['PRIMER LUGAR', 'SEGUNDO LUGAR', 'TERCER LUGAR'];

// What goes where the time goes (§8.6). A dash always means "competed, no valid time", so a
// university that never competed gets words instead (§2.6, locked decision 4).
const boardTime = (row) => (row.group === 'pending' ? 'NO PARTICIPÓ' : row.bestMs === null ? '—' : formatMs(row.bestMs));

// A podium step. An unranked winner gets no label and no gold, and the time reads as in the grid
// (§8.10). The kitty rides the first step, in front of the plate and clipped to it (§8.4).
function podiumStep(row, team, place) {
  const kit = place === 1
    ? '<div class="kit"><img src="assets/rootkitty-from-above.png" alt=""></div>'
    : '';
  const label = row.group === 'ranked' ? `<div class="label">${LUGAR[place - 1]}</div>` : '';
  return `<div class="step p${place}">${kit}${plate(team)}${label}<div class="time">${boardTime(row)}</div></div>`;
}

// A grid cell, places 4 to 13. No place number for a university that is not ranked (§8.6).
const gridCell = (row, team) =>
  `<div class="cell">${plate(team)}<div class="line">`
  + `<span class="place">${row.position ?? ''}</span>`
  + `<span class="time${row.group === 'pending' ? ' never' : ''}">${boardTime(row)}</span>`
  + `</div></div>`;

// The board (§8.3). finalStandings is already in its order: ranked, then all-DNF, then never
// competed (§4.3). Rows 1–3 are the podium and the rest is the grid; the layout is built for
// thirteen, as ATTRACT's is.
export function resultsHtml({ finalStandings, teams }) {
  const of = (id) => teams.find((t) => t.id === id);
  const [first, second, third] = finalStandings;
  return `<div class="results">
  <div class="podium">${podiumStep(second, of(second.teamId), 2)}${podiumStep(first, of(first.teamId), 1)}${podiumStep(third, of(third.teamId), 3)}</div>
  <div class="grid">${finalStandings.slice(3).map((r) => gridCell(r, of(r.teamId))).join('')}</div>
</div>`;
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/ui/audience-screens.test.js`
Expected: PASS. This task adds **7 tests**.

- [ ] **Step 5: Commit**

```bash
git add js/ui/audience-screens.js test/ui/audience-screens.test.js
git commit -m "Draw the closing board: the podium, the ten places, and the kitty"
```

---

## Task 8: NO SIGNAL, as HTML

**Files:**
- Modify: `js/ui/audience-screens.js`
- Test: `test/ui/audience-screens.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `test/ui/audience-screens.test.js`. `noSignalHtml` and `signalMarkHtml` join the import.

```js
// --- The takeover (UI spec §10.3, §10.4) ---

const silent = (extra = {}) => ({
  phase: 'RUNNING', displayMs: 84020, cutoffMs: 300000, attemptNo: 2, attemptsPerCompetitor: 3,
  competitor: TEAMS[0], teams: TEAMS, verdict: null, ...extra,
});

test('over RUNNING the frozen time is shown, and carries the clock identity', () => {
  const html = noSignalHtml(silent());
  assert.ok(html.includes('CRONÓMETRO EN PAUSA'));
  assert.ok(html.includes('no se ha perdido'));
  assert.ok(html.includes('TIEMPO CONGELADO'));
  assert.ok(html.includes('1:24.02'));
  assert.ok(html.includes('view-transition-name:time'), 'the clock shrinks into it (§10.5)');
});

test('over ARMED there is nothing to freeze, and nothing carries', () => {
  const html = noSignalHtml(silent({ phase: 'ARMED', displayMs: null }));
  assert.ok(html.includes('CRONÓMETRO EN PAUSA'));
  assert.ok(html.includes('aún no ha comenzado'));
  assert.ok(!html.includes('TIEMPO CONGELADO'));
  assert.ok(!html.includes('view-transition-name:time'));
});

test('the who line is unchanged, so the plate and the name hold their places', () => {
  const html = noSignalHtml(silent());
  assert.ok(html.includes('view-transition-name:plate-intec'));
  assert.ok(html.includes('view-transition-name:name-intec'));
  assert.ok(html.includes('view-transition-name:attempt-n'));
});

test('a frozen time past the cutoff keeps its red, because it is still true', () => {
  assert.ok(noSignalHtml(silent({ displayMs: 320000 })).includes('frozen over'));
  assert.ok(!noSignalHtml(silent()).includes('frozen over'));
});

test('the header marker appears on NO SIGNAL and nowhere else', () => {
  assert.ok(signalMarkHtml('nosignal').includes('SIN SEÑAL'));
  assert.ok(signalMarkHtml('nosignal').includes('class="dot"'));
  for (const screen of ['armed', 'running', 'pending', 'mezcla', 'resultado', 'results']) {
    assert.equal(signalMarkHtml(screen), '', `${screen} has no marker`);
  }
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test test/ui/audience-screens.test.js`
Expected: FAIL — `does not provide an export named 'noSignalHtml'`.

- [ ] **Step 3: Write it**

Append to `js/ui/audience-screens.js`, after `resultsHtml`:

```js
// NO SIGNAL's words (§10.4). Each lives in one place, as PENDING's do (§2.6). They hold markup, so
// they are written out as they are: they are the view's own strings, never anything from a roster.
const SIN_SENAL = {
  mark: 'SIN SEÑAL',
  headline: 'CRONÓMETRO EN PAUSA',
  frozen: 'TIEMPO CONGELADO',
  running: 'El tiempo <b>no se ha perdido</b>. Continúa al volver la señal.',
  armed: 'El intento <b>aún no ha comenzado</b>. Continúa al volver la señal.',
};

// The header's centre, which is empty on every other screen (§4.2, §10.3). The word is --violet and
// only the dot is --red, so red keeps its single text role (§2.1).
export const signalMarkHtml = (screen) => (screen === 'nosignal' ? `<i class="dot"></i>${SIN_SENAL.mark}` : '');

// NO SIGNAL (§10.3): ARMED's body with the clock block replaced. The who line is untouched, so the
// plate, the divider, INTENTO and the name hold their places across the change, and the header and
// the band are the frame's own (§10.5).
export function noSignalHtml(snapshot) {
  const running = snapshot.phase === 'RUNNING';
  // The frozen time keeps RUNNING's red past the cutoff: it is still true (§7.1, §10.3).
  const over = running && snapshot.displayMs > snapshot.cutoffMs ? ' over' : '';
  const frozen = running
    ? `<div class="label">${SIN_SENAL.frozen}</div>`
      + `<div class="frozen${over}"><span class="piece"${vt('time')}>${formatMs(snapshot.displayMs)}</span></div>`
    : '';
  // `solo` as well as `nosignal`: the who line is the same element in the same place, so it must
  // also be the same CSS. Only the clock block below it differs.
  return `<div class="solo nosignal">
  <div class="who">${soloWhoHtml(snapshot)}</div>
  <div class="headline">${SIN_SENAL.headline}</div>
  <div class="sentence">${running ? SIN_SENAL.running : SIN_SENAL.armed}</div>
  ${frozen}
</div>`;
}
```

- [ ] **Step 4: Give the shared frame a slot for the marker**

The header is `justify-content: space-between` with two children. The marker is a third, taken out
of the flow by CSS (Task 10), so it centres exactly and the other two do not move. It is empty on
every screen but NO SIGNAL, which is how §4.2's "the header has no centre element" stays true.

Find:

```js
  <header class="hdr"><img src="assets/logo-ctf.svg" alt="CTF Interuniversitario 2026"${vt('logo')}><span data-slot="count"></span></header>
```

Replace with:

```js
  <header class="hdr"><img src="assets/logo-ctf.svg" alt="CTF Interuniversitario 2026"${vt('logo')}><span class="sig" data-slot="signal"></span><span data-slot="count"></span></header>
```

Add to the Step 1 tests:

```js
test('the shared frame carries an empty slot for the marker', () => {
  assert.ok(FRAME_HTML.includes('data-slot="signal"'));
});
```

- [ ] **Step 5: Run the tests**

Run: `node --test test/ui/audience-screens.test.js`
Expected: PASS. This task adds **6 tests**.

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: green, `pass N + 42`.

- [ ] **Step 7: Commit**

```bash
git add js/ui/audience-screens.js test/ui/audience-screens.test.js
git commit -m "Draw the takeover, with the frozen time it protects"
```

---

## Task 9: RESULTS' stylesheet, and the bridge's motion

Every value below is transcribed from UI spec §8.3–§8.5 and §2.7. None of it is invented, and none
of it introduces a token: the sizes are `--fs-label`, `--fs-lead` and `--fs-hero`, the only colour
beyond the palette's own is `--gold-text` on the winner, and the motion is `--t-step`, `--t-long`
and `--ease`.

**Files:**
- Modify: `css/audience.css`

- [ ] **Step 1: Append the board**

Append to `css/audience.css`:

```css
/* ── RESULTS (UI spec §8.3) ─────────────────────────────────────────────────────────────────── */
/* No band, so the body keeps the band's 10.95cqw as well as its own 39.02cqw. `.body` is already
   `flex: 1` inside `.frame`, so this needs no height of its own; Task 12 measures it. */
.results { display: flex; flex-direction: column; align-items: center; justify-content: center;
           height: 100%; padding: .9cqw 3cqw 1.9cqw; box-sizing: border-box; }

/* The podium, in podium order: 2nd, 1st, 3rd. */
.results .podium { display: flex; align-items: flex-end; gap: 4.4cqw; }
.results .step { display: flex; flex-direction: column; align-items: center; }
.results .step .plate { width: 15cqw; padding: .9cqw 1.3cqw; }
.results .step.p1 { position: relative; padding-top: calc(11cqw * 618 / 1200); }
.results .step.p1 .plate { width: 22cqw; padding: 1.3cqw 1.9cqw; position: relative; z-index: 1; }
.results .step .label { font-size: var(--fs-label); letter-spacing: .24em; color: var(--violet);
                        margin-top: 1.1cqw; }
.results .step .time { font-size: var(--fs-lead); font-weight: 800; line-height: 1;
                       letter-spacing: -.01em; font-variant-numeric: tabular-nums; color: #fff;
                       margin-top: .4cqw; }
/* Gold is the leader's colour, as on STANDBY, and there is no silver and no bronze: the podium
   stands out by size, weight and position alone (§8.3). */
.results .step.p1 .time { font-size: var(--fs-hero); color: var(--gold-text); }

/* Places 4 to 13. 12.7cqw is ATTRACT's own plate width (§3.3), so these ten change place on the
   way in but not size. */
.results .grid { display: grid; grid-template-columns: repeat(5, 12.7cqw); gap: 1.2cqw 2.2cqw;
                 margin-top: 2.2cqw; padding-top: 1.6cqw; border-top: 1px solid var(--violet-deep); }
.results .cell .plate { width: 100%; padding: .75cqw 1.1cqw; }
.results .cell .line { display: flex; justify-content: space-between; align-items: baseline;
                       margin-top: .55cqw; font-size: var(--fs-lead); }
.results .cell .place { color: var(--violet); font-weight: 700; }
.results .cell .time { color: #fff; font-weight: 500; font-variant-numeric: tabular-nums; }
/* A university that never competed gets words, in label style, where the time would be (§8.6). */
.results .cell .time.never { font-size: var(--fs-label); letter-spacing: .24em; font-weight: 400;
                             color: var(--violet); }

/* RootKitty over the winner's plate (§8.4). 11cqw is the band kitty's width, and its opacity and
   glow are the band kitty's too, so there is no new mascot size and no new colour. The glow is on
   the wrapper, so it follows whatever the clip leaves visible. */
.results .kit { position: absolute; top: 0; left: 50%; width: 11cqw; transform: translateX(-50%);
                z-index: 2; filter: drop-shadow(0 0 2.4cqw rgba(238, 39, 55, .3)); }
/* aspect-ratio is required: without it the box is 0 tall until the image loads, and so is the
   climb's 100% — on a slow first load the kitty would have nothing to climb from (§8.4). */
.results .kit img { width: 100%; height: auto; aspect-ratio: 1200/683; display: block; opacity: .9; }
```

- [ ] **Step 2: Append the arrival**

`arriving` is set by `js/ui/audience.js` (Task 11) only when RESULTS comes from the bridge by a
screen change. It is a class on the stage, not on the board's HTML, so a later snapshot cannot
restart the climb by rewriting the markup.

```css
/* RESULTS arriving from the bridge (§8.5). The offsets are one and two --t-long from the change,
   as the verdict's +300 ms and +700 ms are offsets (§7.2), so the motion signature keeps its three
   durations. Nothing here runs when the board was not animated in. */
@media (prefers-reduced-motion: no-preference) {
  .arriving .results .step .time,
  .arriving .results .step .label,
  .arriving .results .cell .line { animation: fade-in var(--t-step) var(--ease) 800ms both; }
  @keyframes fade-in { from { opacity: 0; } }

  /* The climb: the kitty rises its own height from just below the plate's edge. While the image is
     y% of its height below its place, the edge is (9.52 + y)% of its height up from its bottom, so
     the translate and the clip change together, on one curve, and the clip line stays on the edge.
     9.52% comes from the asset (§2.4) and changes only if the asset does. */
  .arriving .results .kit img {
    animation: climb var(--t-long) var(--ease) 800ms both,
               paws  var(--t-step) var(--ease) 1600ms forwards;
  }
  @keyframes climb { from { translate: 0 100%; clip-path: inset(0 0 109.52% 0); }
                     to   { translate: 0 0;    clip-path: inset(0 0 9.52% 0); } }
  @keyframes paws  { from { clip-path: inset(0 0 9.52% 0); } to { clip-path: inset(0); } }
}
```

- [ ] **Step 3: Append the bridge's motion**

```css
/* ── The bridge (UI spec §2.7, §8.2) ────────────────────────────────────────────────────────── */
/* On the way in, ATTRACT → Mezcla runs in reverse: the band sinks to the stage's bottom edge, and
   the plates and the footer come down by its height. Both are clipped to the band's own box, which
   `::view-transition-group(band)` already has from the audience-screens plan. */
::view-transition-old(band):only-child { animation-name: band-sink; }
@keyframes band-sink { to { transform: translateY(100%); } }

::view-transition-new(attract-plates):only-child,
::view-transition-new(attract-footer):only-child { animation-name: attract-drop; }
@keyframes attract-drop {
  from { opacity: 0; transform: translateY(calc(-.1095 * var(--stage-w))); }
  50% { opacity: 0; }
}

/* On the way out to RESULTS, the plates move over --t-long and everything else about ATTRACT fades
   over --t-step. `to-results` is set on the document element for exactly this change, because
   attract-push — ATTRACT's ordinary exit to Mezcla — must not fire here. */
.to-results::view-transition-old(attract-face),
.to-results::view-transition-old(attract-tag),
.to-results::view-transition-old(attract-footer) {
  animation-name: fade-out;
  animation-duration: var(--t-step);
}
@keyframes fade-out { to { opacity: 0; } }
```

- [ ] **Step 4: Check it parses**

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const css = readFileSync('css/audience.css', 'utf8');
const open = (css.match(/{/g) ?? []).length, close = (css.match(/}/g) ?? []).length;
console.log('braces', open, close, open === close ? 'balanced' : 'UNBALANCED');
for (const name of ['band-sink', 'attract-drop', 'fade-out', 'fade-in', 'climb', 'paws']) {
  console.log(name, css.includes('@keyframes ' + name) ? 'ok' : 'MISSING');
}
"
```

Expected: `braces <n> <n> balanced`, then six `ok` lines.

- [ ] **Step 5: Commit**

```bash
git add css/audience.css
git commit -m "Style the closing board, the kitty's climb and the bridge"
```

---

## Task 10: NO SIGNAL's stylesheet

**Files:**
- Modify: `css/audience.css`

- [ ] **Step 1: Append the screen**

```css
/* ── NO SIGNAL (UI spec §10.3) ──────────────────────────────────────────────────────────────── */
/* ARMED's body with the clock block replaced. `.solo` carries the who line's own layout, which is
   unchanged, so only what sits below it is written here. */
.nosignal .headline { font-size: var(--fs-hero); font-weight: 800; letter-spacing: -.01em;
                      color: #fff; margin-top: 1.5cqw; }
.nosignal .sentence { font-size: var(--fs-body); font-weight: 500; color: var(--violet);
                      line-height: 1.7; margin-top: 1.6cqw; }
.nosignal .sentence b { color: #fff; font-weight: 800; }
.nosignal .label { font-size: var(--fs-label); letter-spacing: .24em; color: var(--violet);
                   margin-top: 2.4cqw; }
.nosignal .frozen { font-size: var(--fs-hero); font-weight: 800; letter-spacing: -.01em;
                    font-variant-numeric: tabular-nums; color: var(--violet); margin-top: .6cqw; }
/* Past the cutoff the frozen time keeps RUNNING's red, because it is still true (§7.1). */
.nosignal .frozen.over { color: var(--red); }

/* The header's centre, empty on every other screen (§4.2). Absolute, so the logo and the counter
   do not move when it appears. The word is --violet and only the dot is --red: red keeps its one
   text role, a time past the cutoff (§2.1). */
.hdr { position: relative; }
.hdr .sig { position: absolute; left: 50%; transform: translateX(-50%);
            display: flex; align-items: center; gap: .7cqw; color: var(--violet); }
.hdr .sig:empty { display: none; }
.hdr .sig .dot { width: .78cqw; height: .78cqw; border-radius: 50%; background: var(--red);
                 display: block; }
```

Nothing is needed for the change itself. NO SIGNAL is a family (Task 6), so the audience-screens
plan's `::view-transition-group(*)` rule already gives it `--t-long` and `--ease` in both directions,
and §2.7's identity rule does the rest: the header, the band and the who line hold their places, the
clock carries `time` into TIEMPO CONGELADO, and everything else fades. The band has a counterpart on
both sides, so `band-sink` and `band-rise` cannot fire here.

- [ ] **Step 2: Check it parses**

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const css = readFileSync('css/audience.css', 'utf8');
const open = (css.match(/{/g) ?? []).length, close = (css.match(/}/g) ?? []).length;
console.log('braces', open, close, open === close ? 'balanced' : 'UNBALANCED');
console.log('marker', css.includes('.hdr .sig') ? 'ok' : 'MISSING');
"
```

Expected: `balanced`, then `marker ok`.

- [ ] **Step 3: Commit**

```bash
git add css/audience.css
git commit -m "Style the takeover and the header's one centre element"
```

---

## Task 11: The audience window: the bridge, every plate, and the arrival

**Files:**
- Modify: `js/ui/audience.js`

- [ ] **Step 1: Widen the import**

Find:

```js
import {
  FRAME_HTML, SOLO_HTML, attractHtml, changeBetween, countHtml, familyOf, mazeFrozen, sceneOf, scrambleHtml,
  screenFor, soloWhoHtml, standbyHtml,
} from './audience-screens.js';
```

Replace with:

```js
import {
  FRAME_HTML, RESULTS_FRAME_HTML, SOLO_HTML, attractFooter, attractHtml, changeBetween, countHtml,
  familyOf, mazeFrozen, noSignalHtml, resultsHtml, sceneOf, scrambleHtml, screenFor, signalMarkHtml,
  soloWhoHtml, standbyHtml,
} from './audience-screens.js';
```

- [ ] **Step 2: Hold the arrival flag**

Find:

```js
let latest = null;          // the newest snapshot
let shown = null;           // the scene on screen, from sceneOf()
let changePending = false;  // a view transition has captured the old screen and not yet drawn the new
```

Replace with:

```js
let latest = null;          // the newest snapshot
let shown = null;           // the scene on screen, from sceneOf()
let changePending = false;  // a view transition has captured the old screen and not yet drawn the new
let arriving = false;       // RESULTS came from the bridge, so its times and its kitty animate (§8.5)
```

- [ ] **Step 3: Replace `render`**

Find the whole of `render`:

```js
function render(snapshot) {
  latest = snapshot;
  if (mazeFrozen(snapshot)) maze.pause();
  else maze.resume();
  followVerdict(snapshot);
  const scene = sceneOf(snapshot);
  if (changeBetween(shown, scene) !== null && canAnimate()) {
    if (shown.screen === 'attract') nameCalledPlate(scene.featured);
    changePending = true;
    const change = document.startViewTransition(() => {
      changePending = false;
      draw(latest);
    });
    change.ready.catch(() => {}); // skipped, when another change arrives first
  } else if (!changePending) {
    // Until the pending change draws, the old screen must stay as it was captured.
    draw(snapshot);
  }
  shown = scene;
}
```

Replace with:

```js
function render(snapshot) {
  latest = snapshot;
  if (mazeFrozen(snapshot)) maze.pause();
  else maze.resume();
  followVerdict(snapshot);
  const scene = sceneOf(snapshot);
  const changing = changeBetween(shown, scene) !== null && canAnimate();
  // RESULTS animates its times and its kitty only when it arrives from the bridge by a screen
  // change (§8.5). The flag is then held for as long as the board is up, so a later snapshot can
  // neither restart the climb nor cut it off half-way. A window that opened after the bridge, or
  // one under reduced motion, never sets it and shows the finished board (§8.2).
  if (scene.screen !== 'results') arriving = false;
  else if (changing && shown.screen === 'attract') arriving = true;
  if (changing) {
    if (shown.screen === 'attract') nameLeavingPlates(scene);
    // ATTRACT's ordinary exit to Mezcla must not fire on the way to RESULTS (§8.2).
    if (arriving) document.documentElement.classList.add('to-results');
    changePending = true;
    const change = document.startViewTransition(() => {
      changePending = false;
      draw(latest);
    });
    change.ready.catch(() => {}); // skipped, when another change arrives first
    change.finished.finally(() => document.documentElement.classList.remove('to-results'));
  } else if (!changePending) {
    // Until the pending change draws, the old screen must stay as it was captured.
    draw(snapshot);
  }
  shown = scene;
}
```

- [ ] **Step 4: Replace `nameCalledPlate`**

Find:

```js
// ATTRACT names only the called university's plate, just before it leaves, so that plate moves into
// Mezcla's while the other twelve go with the grid (UI spec §2.7).
function nameCalledPlate(teamId) {
  const plate = screen.querySelector(`.attract .plate[data-team="${teamId}"]`);
  if (plate) plate.style.viewTransitionName = `plate-${teamId}`;
}
```

Replace with:

```js
// ATTRACT names only the called university's plate, just before it leaves, so that plate moves into
// Mezcla's while the other twelve go with the grid (UI spec §2.7). Leaving for RESULTS is the one
// exception: every plate moves to its own place, so each is named and the grid itself is not.
function nameLeavingPlates(scene) {
  if (scene.screen !== 'results') {
    const called = screen.querySelector(`.attract .plate[data-team="${scene.featured}"]`);
    if (called) called.style.viewTransitionName = `plate-${scene.featured}`;
    return;
  }
  const unis = screen.querySelector('.attract .unis');
  if (unis) unis.style.viewTransitionName = 'none';
  for (const plate of screen.querySelectorAll('.attract .plate')) {
    plate.style.viewTransitionName = `plate-${plate.dataset.team}`;
  }
}
```

- [ ] **Step 5: Replace `draw`**

Find the whole of `draw`:

```js
function draw(snapshot) {
  const name = screenFor(snapshot);
  stage.dataset.screen = name;
  if (name === 'attract') {
    patch(screen, attractHtml(snapshot.teams));
    return;
  }
  patch(screen, FRAME_HTML);
  patch(slot('count'), countHtml(snapshot));
  patch(slot('net'), snapshot.scrambleSvg ?? ''); // SVG from our own scramble worker
  patch(slot('scramble'), scrambleHtml(snapshot));
  if (familyOf(name) === 'standby') {
    patch(slot('body'), standbyHtml(snapshot));
    return;
  }
  patch(slot('body'), SOLO_HTML);
  patch(slot('who'), soloWhoHtml(snapshot));
  paintClock(snapshot);
}
```

Replace with:

```js
function draw(snapshot) {
  const name = screenFor(snapshot);
  stage.dataset.screen = name;
  stage.classList.toggle('arriving', arriving);
  if (name === 'attract') {
    patch(screen, attractHtml(snapshot.teams));
    // A slot of its own, so ending the event changes the words without rewriting the grid (§8.10).
    patch(slot('footer'), attractFooter(snapshot));
    nameReturningPlate();
    return;
  }
  if (name === 'results') {
    // RESULTS has a frame of its own, because it has no band (§8.3).
    patch(screen, RESULTS_FRAME_HTML);
    patch(slot('body'), resultsHtml(snapshot));
    return;
  }
  patch(screen, FRAME_HTML);
  patch(slot('count'), countHtml(snapshot));
  patch(slot('signal'), signalMarkHtml(name));
  patch(slot('net'), snapshot.scrambleSvg ?? ''); // SVG from our own scramble worker
  patch(slot('scramble'), scrambleHtml(snapshot));
  if (familyOf(name) === 'standby') {
    patch(slot('body'), standbyHtml(snapshot));
    return;
  }
  if (name === 'nosignal') {
    // The header and the band above and below it are the frame's own, unchanged (§10.3).
    patch(slot('body'), noSignalHtml(snapshot));
    return;
  }
  patch(slot('body'), SOLO_HTML);
  patch(slot('who'), soloWhoHtml(snapshot));
  paintClock(snapshot);
}
```

- [ ] **Step 6: Name the plate that comes back to the grid**

The bridge runs ATTRACT → Mezcla in reverse, so the plate that was on screen **returns to its slot**
(§8.2). Naming it on the way out is not enough: it is the *incoming* ATTRACT that must carry the
same name, and ATTRACT draws its plates unnamed. Without this the plate simply fades and the move
§8.2 describes never happens.

Add this function beside `nameLeavingPlates`:

```js
// The bridge in: the plate that was on Resultado or Mezcla returns to its slot in ATTRACT's grid
// (§8.2), so the incoming ATTRACT names it. `shown` is still the screen being left, because
// render() updates it after the change is started.
//
// It also clears whatever the last change left behind. `vt()` writes these names as inline styles,
// so an imperative one overwrites them and has to put them back by name, not by emptying them.
function nameReturningPlate() {
  const unis = screen.querySelector('.attract .unis');
  if (unis) unis.style.viewTransitionName = 'attract-plates';
  for (const plate of screen.querySelectorAll('.attract .plate')) plate.style.viewTransitionName = '';
  if (shown === null || familyOf(shown.screen) !== 'standby' || shown.featured === null) return;
  const back = screen.querySelector(`.attract .plate[data-team="${shown.featured}"]`);
  if (back) back.style.viewTransitionName = `plate-${shown.featured}`;
}
```

- [ ] **Step 7: Let RUNNING's clock keep its identity**

In `paintClock`, find:

```js
  // PENDING's clock moves into Resultado's MEJOR TIEMPO when it holds the best time (§7.2).
  digits.style.viewTransitionName = clockIsBest(snapshot) ? 'time' : '';
```

Replace with:

```js
  // The clock keeps its identity wherever the next screen holds the same time: PENDING's, moving
  // into Resultado's MEJOR TIEMPO when it is the best (§7.2), and RUNNING's, shrinking into NO
  // SIGNAL's TIEMPO CONGELADO (§10.5). Only one screen is ever rendered, so the two cannot collide.
  digits.style.viewTransitionName = snapshot.phase === 'RUNNING' || clockIsBest(snapshot) ? 'time' : '';
```

- [ ] **Step 8: Check it parses, and that nothing regressed**

```bash
node --check js/ui/audience.js
npm test 2>&1 | tail -6
npm run smoke 2>&1 | tail -3
```

Expected: `node --check` exits 0; the suite is `pass N + 42`; the smoke test ends
`smoke: all checks passed`. If the smoke test fails on ATTRACT's footer, it is reading the text out
of `attractHtml`: the words now arrive through the slot, so the check must read the rendered DOM.

- [ ] **Step 9: Commit**

```bash
git add js/ui/audience.js
git commit -m "Run the bridge, the board's arrival and the takeover in the audience window"
```

---

## Task 12: Check both screens at 1080p

The rules are covered by `node --test`. What only a browser can check is the geometry, the identities
and the climb. This task extends the screens script the audience-screens plan created.

**Files:**
- Modify: `test/browser/screens.js`

- [ ] **Step 1: Read what is already there**

```bash
sed -n '1,60p' test/browser/screens.js
```

`test/browser/harness.js` owns the server, headless Chrome and the check helpers. **Match the call
shape you find** — the checks below are written as the DOM expressions to evaluate and the values
they must produce, because the harness's helper names are that plan's to choose, not this one's.

- [ ] **Step 2: Add the RESULTS states**

Render two snapshots built by the real core, both at 1920×1080:

1. **the finished board** — a full 13-university event, one of them absent, `phase: 'RESULTS'`, with
   `resultsIntro: false`;
2. **the bridge** — the same snapshot with `resultsIntro: true`, which must render ATTRACT with the
   footer *Resultados finales*.

Check, on the finished board:

| What | Expression | Must be |
|---|---|---|
| every university once | `document.querySelectorAll('#screen .plate').length` | `13` |
| the grid's plates are ATTRACT's width | `getComputedStyle(document.querySelector('.cell .plate')).width` | `12.7cqw` of the stage |
| the podium reads 2nd, 1st, 3rd | `[...document.querySelectorAll('.podium .plate')].map((p) => p.dataset.team)` | 2nd, 1st, 3rd in that order |
| gold only on the winner | elements whose colour is `--gold-text` | exactly one, `.step.p1 .time` |
| no `--go`, and no `--red` outside the kitty's glow | every computed `color` on the screen | neither value appears |
| the kitty sits on the plate's edge | `kit.getBoundingClientRect().bottom - plate.getBoundingClientRect().top` | within 0.1cqw of `11cqw × 65/1200`, the paws' overhang |
| the header ends and the podium starts | their `getBoundingClientRect()` in cqw | `6.26` and `7.63`, ±0.1 |
| the grid ends clear of the edge | the grid's `bottom` in cqw | `53.96`, ±0.1, in a 56.25cqw stage |
| the longest line fits | `12  4:58.66`'s place and time | at least 2cqw apart |

And on the bridge: the footer reads `Resultados finales`, all thirteen plates are in ATTRACT's grid,
and **the plate that was on screen before `F` carries `plate-<teamId>` on ATTRACT's side**, so it
returns to its slot rather than fading (§8.2). The other twelve are unnamed and move with
`attract-plates`.

- [ ] **Step 3: Add the NO SIGNAL states**

Render three, at 1920×1080, all with `matSilent: true`:

1. **over RUNNING** — `phase: 'RUNNING'`, `displayMs: 84020`;
2. **over RUNNING, past the cutoff** — `displayMs: 320000` with `cutoffMs: 300000`;
3. **over ARMED** — `phase: 'ARMED'`, `inspectionMs: 8000`.

| What | Expression | Must be |
|---|---|---|
| the header's marker | `document.querySelector('.hdr .sig').textContent` | `SIN SEÑAL` |
| the marker is centred | its box centre vs the header's | within 0.5cqw |
| the word is not red | `getComputedStyle(document.querySelector('.hdr .sig')).color` | `--violet`, not `--red` |
| the dot is red | the dot's `background-color` | `--red` |
| the band is untouched | `.band` exists, and its scramble matches the snapshot's | identical to RUNNING's |
| the who line is untouched | `.who` holds the plate, INTENTO and the name | identical to RUNNING's |
| the frozen time | `.frozen` text | `1:24.02` |
| past the cutoff | `.frozen` colour | `--red` |
| over ARMED | `document.querySelector('.frozen')` | `null`, and no `TIEMPO CONGELADO` |
| the countdown is gone | `document.querySelector('.clock')` | `null` |

And on the four exempt screens — ATTRACT, Mezcla, Resultado and PENDING — rendered with
`matSilent: true`: `document.querySelector('.hdr .sig').textContent` is empty and the screen is byte
for byte what it is with `matSilent: false`.

- [ ] **Step 4: Add the four screen changes**

For each of §2.7's four new rows, run the change and check that every name it lists exists on **both**
sides before the transition starts:

| Change | Names that must exist on both sides |
|---|---|
| Resultado or Mezcla → ATTRACT (the bridge) | `logo`, the featured `plate-<teamId>` |
| ATTRACT → RESULTS | `logo`, and **all thirteen** `plate-<teamId>` |
| ARMED or RUNNING → NO SIGNAL | `logo`, `band`, `rule`, `attempt-word`, `attempt-n`, `attempt-of`, `plate-<teamId>`, `name-<teamId>`; and from RUNNING, `time` |
| NO SIGNAL → ARMED or RUNNING | the same, in reverse |

Also check that on ATTRACT → RESULTS the grid itself is **not** named
(`document.querySelector('.attract .unis').style.viewTransitionName === 'none'`), or every plate
would be pulled out of a grid that is also moving.

- [ ] **Step 5: Add the climb**

Paused at five points through the climb, the kitty's visible bottom must stay on the plate's top
edge — the same check §8.5 records as measuring 0.000cqw each time. Drive it by setting
`animation-play-state: paused` and stepping `animation-delay`, as the audience-screens plan pauses
the verdict.

- [ ] **Step 6: Run it**

```bash
npm run screens 2>&1 | tail -20
```

Expected: every check passes, and the run takes about two minutes because SwiftShader draws the maze
slowly. Compare the two stills by eye against `results-04-kitty-above.html` (section 1) and
`nosignal-01-regime.html` (stage C), and the sequence against `results-05-paws.html` (stage C) and
`nosignal-06-identity.html` (stage B). If that folder is missing, the automated checks above still
stand on their own.

- [ ] **Step 7: Commit**

```bash
git add test/browser/screens.js
git commit -m "Check the closing board and the takeover at 1080p"
```

---

## Task 13: Documentation

**Files:**
- Modify: `ROADMAP.md`, `README.md`

- [ ] **Step 1: Close the roadmap's Phase 1 rows**

In `ROADMAP.md`'s Phase 1 table, replace the row for screen 7 with:

```
| 7 | **NO SIGNAL** | Mat stopped transmitting | ✅ **Decided** — `nosignal-06-identity.html` | none — a takeover on ARMED and RUNNING only, calm, with the clock shrinking into TIEMPO CONGELADO; PENDING and RESULTS are exempt (UI spec §10) |
```

and mark row 6's status as built once this plan is done.

In Phase 2, mark row 6 (**Audience screens**) done when Task 12 passes, and add NO SIGNAL's
dependency to row 9's line: the screens plan for RESULTS and NO SIGNAL runs **after** the signal
check, because `matDelivering` lives beside `THRESHOLDS`.

Update **Immediate next step** to name what is actually left: screen 10 (OPERATOR PANEL) is the last
undesigned screen, and Phase 2 rows 10 (hardware validation) and 11 (dry run) are the last
unstarted ones.

⚠ **Check for a conflict first.** The engine plan's Task 18 also edits `ROADMAP.md`. If that branch
has not merged, write this row and nothing else, and leave the Phase 2 table to whichever lands
second.

- [ ] **Step 2: Note the two screens in the README**

Add RESULTS and NO SIGNAL to the README's list of screens, and one line for `F`.

- [ ] **Step 3: Run everything one last time**

```bash
npm test 2>&1 | tail -6
npm run smoke 2>&1 | tail -3
npm run screens 2>&1 | tail -5
```

Expected: `pass N + 42`, `smoke: all checks passed`, and the screens script green.

- [ ] **Step 4: Commit**

```bash
git add ROADMAP.md README.md
git commit -m "Record RESULTS and NO SIGNAL as built"
```

---

## Running it

```bash
npm test                      # the rules
npm run smoke                 # the two windows talk to each other
npm run screens               # every designed state at 1080p, about two minutes
node serve.js                 # then open http://localhost:8000/?driver=mock
```

To see both screens by hand, with the mock driver: run a university through a full attempt, press
`F`, and watch the bridge. For NO SIGNAL, start a solve and then stop the mock driver's scenario
part-way; the takeover arrives about 400 ms later and lifts when the packets resume.

## Spec coverage

| Spec | Where it is built |
|---|---|
| §8.1 decisions 1–4 | Task 2 (`F` as a key of its own), Task 7 (best time only, every place counts) |
| §8.2 the sequence | Tasks 3, 5 (`RESULTS_INTRO_MS` and the re-publish), 6 (`screenFor`), 9, 11 |
| §8.3 layout | Tasks 7, 9, checked in 12 |
| §8.4 the kitty | Tasks 7, 9, checked in 12 |
| §8.5 the arrival | Tasks 9, 11, checked in 12 |
| §8.6 wording | Tasks 6 (`attractFooter`), 7 (`boardTime`, `LUGAR`) |
| §8.7 core | Tasks 2, 3, 5, 6 |
| §8.8 snapshot | Task 3 |
| §8.9 requirements for other screens | **Not here.** Item 1 is satisfied by §10.1; item 2 belongs to screen 10 |
| §8.10 edge cases | Tasks 2 (F anywhere, U, N), 7 (an unranked podium row), 11 (a window that missed the bridge) |
| §8.11 testing | Tasks 2, 3, 6, 7, 12 |
| §10.1 where it is, and is not | Task 6 (`screenFor`), checked in 12 |
| §10.1.1 PENDING exempt | Task 6 — the verdict is tested before `matSilent` is read |
| §10.2 when it comes | Task 4 (`matDelivering`), Task 5 (the packet clock and the ticker) |
| §10.3 layout | Tasks 8, 10, checked in 12 |
| §10.4 wording | Task 8 (`SIN_SENAL`) |
| §10.5 the change | Tasks 6 (the family), 8 (`time` on the frozen figure), 11 (`time` on RUNNING's clock) |
| §10.6 the snapshot | Tasks 3, 4, 5 |
| §10.7 requirements for other screens | None, by §10.7 |
| §10.8 edge cases | Tasks 4 (a short gap), 6 (the exempt screens), 8 (past the cutoff, ARMED), 11 (reduced motion) |
| §10.9 testing | Tasks 3, 4, 6, 8, 12 |
| §2.7 the two families and four changes | Tasks 6, 9, 10, 11, checked in 12 |

**Three things in §8 and §10 are deliberately not built here**, and each is recorded where it
belongs rather than left implicit:

1. **§8.9 item 2, the operator panel's three duties** — listing `F`, saying how many universities
   have not competed, and keeping the export within reach. Screen 10 is undesigned.
2. **§10.8's `Esc` remedy** — a competitor who loses the countdown can return to a suggestion they
   never saw. Nothing in code enforces it, and nothing should: a suggestion is never applied on its
   own (§5.1). It is the operator's key, and screen 10 will list it.
3. **The `signal` flag already on the snapshot** is *not* what drives this screen. `signal.on` is the
   decoder's own raw flag, which flips after about 100 idle bits — roughly 83 ms — and it stays as
   it is, for `hands` and for the operator's debug view. NO SIGNAL reads `matSilent`, which is the
   packet **rate** across SIGNAL CHECK's window (§10.2). They are different on purpose. Do not
   "simplify" one into the other: `signal.on` would flash the takeover on a single glitched packet,
   in the middle of a solve, on a projector.
