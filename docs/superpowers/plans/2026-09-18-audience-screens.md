# Audience Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `subagent-driven-development` (recommended) or
> `executing-plans` to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Replace the audience window's plain-text debug view with the three designed screens
(ATTRACT, STANDBY with its Resultado and Mezcla states, and ARMED), drawn over the live maze, which
freezes while a solve runs.

**Architecture:** `js/ui/audience-screens.js` turns a snapshot into HTML. It is pure, so every screen
rule runs under `node --test`. `js/ui/audience.js` puts that HTML on the page. Snapshots arrive about
ten times a second, so it rewrites an element only when that element's HTML changes. The maze
becomes `createMaze({ canvas })` with `pause` and `resume`. RUNNING and PENDING keep the engine's
debug view until screens 4 and 5 are designed. A browser script renders every designed state from
snapshots built by the real core, and checks the UI spec's invariants.

**Tech Stack:** as in the engine plan: plain ES modules with no build step, and Node 24.2 or newer.
Sizes in CSS container units (`cqw`). three.js, through the vendored maze. roc-grotesk, from the
Adobe Fonts kit. Headless Chrome over the DevTools protocol for the browser scripts, with SwiftShader
for WebGL.

**Specs:**
- `docs/superpowers/specs/2026-09-16-tournament-display-ui-design.md`: §2 (the shared system), §3
  ATTRACT, §4 STANDBY and §5 ARMED. The core parts of §4 and §5 (standings, snapshot, inspection)
  were built by the engine plan.
- `docs/superpowers/specs/2026-09-15-tournament-display-system-design.md`: decision 7 (the maze is
  frozen during RUNNING) and the constraints in §13.

**This plan runs after the engine plan.** Every task here builds on files that
`docs/superpowers/plans/2026-09-18-tournament-engine.md` creates. Before starting, that plan must be
finished: `npm test` shows `ℹ pass 122`, and `npm run smoke` ends with `smoke: all checks passed`.

---

## Scope

This is the first of two screens plans. It covers roadmap Phase 2 row **6** for the three screens
designed so far (1 ATTRACT, 2 STANDBY, 3 ARMED), and row **7**, the maze.

**Not in this plan:**
- screens 4–10 (RUNNING, PENDING, RESULTS, NO SIGNAL, SIGNAL CHECK, SETUP, OPERATOR PANEL). They get a
  plan once they are designed;
- the motion signature (UI spec §2.2);
- authorising the Typekit production domain;
- hardware validation (roadmap row 10).

The operator window is not touched.

## Decisions this plan makes

The first three were decided with the owner on 2026-09-18, and the UI spec records them. The rest are
the smallest choices consistent with the specs. Flag any you disagree with before execution starts.

| # | Decision | Why |
|---|---|---|
| 1 | ATTRACT keeps its approved face crop, restored from `1bbe2b4` as `assets/rootkitty-face-attract.svg`. The band mascot on STANDBY and ARMED keeps the new `assets/rootkitty-face.svg` | A re-tune against the new asset was tried at two widths, and the owner preferred the approved look. The values in UI spec §3.2 then apply unchanged (UI spec §2.4, §3.4) |
| 2 | ATTRACT's plates follow the roster in `config/event.json`, so UCSD comes before UCE | One order, the same as the turns (UI spec §3.3) |
| 3 | RUNNING and PENDING show the engine's debug view over the frozen maze | Neither screen is designed yet, and the debug view invents no design |
| 4 | A lost signal changes nothing on these three screens | NO SIGNAL is screen 7 (UI spec §4.7, §5.7). Snapshots follow the mat's packets, so a lost signal leaves the last screen up |
| 5 | Before the first snapshot arrives, the audience window shows the maze under ATTRACT's vignette, with nothing on it | The audience holds no state (system design §4), and ATTRACT's plates come from the snapshot |
| 6 | The stage is the largest 16:9 box the window holds, on `--bg-deep` | Every size is in `cqw` of a 16:9 canvas (UI spec §1). A 16:10 projector gets thin bars instead of a stretched layout |
| 7 | `js/scrambler.js` adds a `viewBox` to csTimer's preview SVG | The SVG has a size but no `viewBox`, so CSS cannot scale it into the 8.7cqw slot. The engine's debug view clips it for the same reason. The drawing itself is unchanged (UI spec §4.5) |
| 8 | `createMaze` returns `{ pause, resume }`, without the `destroy` that `vendor/PROVENANCE.md` planned | The audience window keeps one maze for as long as it is open |
| 9 | A resize while the maze is paused draws the held frame again | Resizing a canvas clears it. Dragging the audience window to the projector mid-solve (system design §4) would otherwise blank the maze until the solve ends |
| 10 | Participant names are shown in capitals, through CSS `text-transform` | The mockups typed them in capitals. `config/participants.local.json` holds them as written |
| 11 | A featured university that leads keeps the leader style | UI spec §4.7. The mockup's CSS happened to let the featured bold win |
| 12 | Both browser scripts share `test/browser/harness.js`, which also turns on SwiftShader | `npm run screens` needs the same Chrome plumbing as the smoke test. With `--disable-gpu`, WebGL needs `--enable-unsafe-swiftshader` |

## Files

```
assets/rootkitty-face-attract.svg   restored: ATTRACT's approved face crop, from 1bbe2b4
vendor/hero-maze3d.js               modified: createMaze({ canvas }) → { pause, resume }
vendor/PROVENANCE.md                modified: the maze no longer tracks upstream
js/scrambler.js                     modified: the preview gets a viewBox
js/ui/audience-screens.js           new: snapshot → HTML for ATTRACT, STANDBY and ARMED; pure
js/ui/audience.js                   replaced: puts the screens on the page; pauses the maze
audience.html                       replaced: the stage
css/tokens.css                      new: UI spec §2.1–§2.2
css/audience.css                    new: the screens
test/vendor/maze.test.js            new
test/ui/audience-screens.test.js    new
test/scrambler.test.js              modified
test/browser/harness.js             new: the server, headless Chrome and the checks
test/browser/smoke.js               modified: uses the harness; the audience checks read the screens
test/browser/screens.js             new: npm run screens
package.json, .gitignore            modified: the screens script, and its output folder
README.md, ROADMAP.md               modified
```

`js/ui/audience-debug-view.js` stays, and draws RUNNING and PENDING. `css/debug.css` stays, for the
operator window.

## Conventions

- Everything in the engine plan's Conventions still applies. Use Node 24.2 or newer. Copy the code
  exactly: all of it was run, and passed, before this plan was written. Never edit
  `vendor/stackmat.js`. Stage files by name, and **never run `git add -A` or `git add .`** End every
  commit message with the trailer lines your session's instructions give.
- `npm run smoke` and `npm run screens` need Chrome: `google-chrome` on the `PATH`, or `CHROME` set to
  a Chrome binary. `npm run screens` also needs internet access, for the Adobe Fonts kit. If either
  is missing, stop and ask the user.
- The approved mockups are in `.superpowers/brainstorm/tournament-display/content/`. That folder is
  gitignored and exists only on the owner's machine. Task 7 compares the screens against them.
- The expected test counts assume `../ctf-interuniversitario/init.sql` exists, as in the engine plan.

---

### Task 1: The approved ATTRACT face

**Files:**
- Create: `assets/rootkitty-face-attract.svg`
- Modify: `README.md` (the artwork list)

- [ ] **Step 1: Restore the approved crop from git history**

Run: `git show 1bbe2b4:assets/rootkitty-face.svg > assets/rootkitty-face-attract.svg`

- [ ] **Step 2: Check that it is the approved crop**

Run: `wc -c < assets/rootkitty-face-attract.svg && grep -o 'viewBox="[^"]*"' assets/rootkitty-face-attract.svg`
Expected: `38017`, then `viewBox="958 390 680 480"`.

- [ ] **Step 3: List it with the mascot artwork.** In `README.md`, replace

```markdown
- `assets/rootkitty.svg`, `assets/rootkitty-face.svg`, `assets/rootkitty-costume.webp` — the
  RootKitty mascot
```

with

```markdown
- `assets/rootkitty.svg`, `assets/rootkitty-face.svg`, `assets/rootkitty-face-attract.svg`,
  `assets/rootkitty-costume.webp` — the RootKitty mascot
```

- [ ] **Step 4: Commit**

```bash
git add assets/rootkitty-face-attract.svg README.md
git commit -m "Restore the approved face crop for ATTRACT"
```

---

### Task 2: A cube preview that scales

Decision 7. csTimer's SVG is 396 × 296 with no `viewBox`. Adding one leaves the drawing unchanged and
lets CSS size it.

**Files:**
- Modify: `js/scrambler.js` (the `image` function)
- Test: `test/scrambler.test.js`

- [ ] **Step 1: Write the failing test.** Append to `test/scrambler.test.js`:

```js
test('the preview has a viewBox the size of its drawing, so CSS can scale it', async () => {
  const { svg } = await scrambler.image("R U R'");
  assert.match(svg, /^<svg viewBox="0 0 396 296" width="396" height="296" /);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/scrambler.test.js`
Expected: `ℹ pass 3`, `ℹ fail 1`. The new test's `actual` starts with `<svg width="396" height="296"`.

- [ ] **Step 3: Add the viewBox.** In `js/scrambler.js`, replace

```js
  // The preview of a given scramble: { scramble, svg }.
  async function image(scramble) {
    return { scramble, svg: await call('image', [scramble, '333']) };
  }
```

with

```js
  // The preview of a given scramble: { scramble, svg }. csTimer's SVG has a size but no viewBox, so
  // CSS could not scale it; one the size of the drawing is added.
  async function image(scramble) {
    const svg = await call('image', [scramble, '333']);
    return { scramble, svg: svg.replace(/^<svg width="(\d+)" height="(\d+)"/, '<svg viewBox="0 0 $1 $2" width="$1" height="$2"') };
  }
```

- [ ] **Step 4: Run the test**

Run: `node --test test/scrambler.test.js`
Expected: `ℹ pass 4`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/scrambler.js test/scrambler.test.js
git commit -m "Give the cube preview a viewBox so it can scale"
```

---

### Task 3: The maze as `createMaze({ canvas })`

UI spec §2.5 and roadmap row 7. Upstream, the maze starts itself at import time on `#hero-canvas`.
After this task it exports `createMaze({ canvas })`, which returns `{ pause, resume }` (decisions 8
and 9). The rendering and every existing guard stay as they are. The Node test below proves that
importing the maze has no side effects. Task 7 checks the freeze in a real browser.

**Files:**
- Modify: `vendor/hero-maze3d.js`, `vendor/PROVENANCE.md`
- Test: `test/vendor/maze.test.js`

- [ ] **Step 1: Write the failing test**, `test/vendor/maze.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('importing the maze starts nothing; without a canvas it draws nothing and its controls are no-ops', async () => {
  const { createMaze } = await import('../../vendor/hero-maze3d.js');
  const maze = createMaze({ canvas: null });
  assert.deepEqual(Object.keys(maze), ['pause', 'resume']);
  maze.pause();
  maze.resume();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/vendor/maze.test.js`
Expected: FAIL with `ReferenceError: document is not defined`, because upstream looks up
`#hero-canvas` the moment it is imported.

- [ ] **Step 3: Update the header comment.** In `vendor/hero-maze3d.js`, replace

```js
 * GPU. Renders into #hero-canvas a procedurally generated "perfect" maze laid
```

with

```js
 * GPU. Renders into a given canvas a procedurally generated "perfect" maze laid
```

and replace

```js
 *   • Pause the loop when document.hidden OR #hero-canvas is off-screen (IO).
```

with

```js
 *   • Pause the loop when document.hidden OR the canvas is off-screen (IO).
```

- [ ] **Step 4: Export `createMaze` instead of starting at import.** Replace

```js
 * Fallbacks (swap the <script> src in index.html to revert):
 *   • hero-maze.js — the original 2D-canvas maze.
 *   • hero3d.js    — the synthwave perspective grid.
 */

import * as THREE from '../vendor/three.module.js';

const canvas = document.getElementById('hero-canvas');
const hero = document.getElementById('inicio');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Detect WebGL availability up front; bail gracefully to CSS ambiance. */
function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) { return false; }
}

if (canvas && webglOK()) {
  init();
}

function init() {
  /* Mark the hero so CSS can hide the static .hero__grid while the maze runs. */
  if (hero) hero.classList.add('hero--maze');

  /* ── Brand palette ── */
```

with

```js
 * Refactored for the tournament display (vendor/PROVENANCE.md): instead of
 * starting itself on #hero-canvas at import, it exports createMaze({ canvas }),
 * whose { pause, resume } let the audience window freeze it during a solve.
 */

import * as THREE from './three.module.js';

/* Detect WebGL availability up front; bail gracefully to CSS ambiance. */
function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) { return false; }
}

// Draws the maze into `canvas` and returns { pause, resume }. Without a canvas or WebGL there is no
// maze, and both do nothing.
export function createMaze({ canvas }) {
  if (!canvas || !webglOK()) return { pause() {}, resume() {} };
  return init(canvas);
}

function init(canvas) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Brand palette ── */
```

- [ ] **Step 5: Redraw the held frame after a resize** (decision 9). Replace

```js
      if (GRID_C !== prevC || GRID_R !== prevR || portrait !== prevPortrait) buildWorld();
    }, 180);
```

with

```js
      if (GRID_C !== prevC || GRID_R !== prevR || portrait !== prevPortrait) buildWorld();
      // A resize clears the canvas. While the loop is stopped, draw the held frame again.
      if (!running) {
        if (reducedMotion) renderStatic();
        else renderer.render(scene, camera);
      }
    }, 180);
```

- [ ] **Step 6: Let a pause stop the loop.** Replace

```js
  /* Combine visibility + on-screen: render only when both true. */
  let onScreen = true;
  function syncLoop() {
    if (onScreen && !document.hidden) start();
    else stop();
  }
```

with

```js
  /* Combine visibility + on-screen + not paused: render only when all hold. */
  let onScreen = true;
  let paused = false;
  function syncLoop() {
    if (onScreen && !document.hidden && !paused) start();
    else stop();
  }
```

- [ ] **Step 7: Return the controls.** The file ends with the wiring block. Replace its last lines,

```js
      io.observe(canvas);
    }
    syncLoop();
  }
}
```

with

```js
      io.observe(canvas);
    }
    syncLoop();
  }

  // pause() stops the loop, and the canvas keeps showing the last frame drawn; resume() starts it
  // again. With reduced motion there is no loop, so both leave the one static frame alone.
  return {
    pause() {
      paused = true;
      if (!reducedMotion) syncLoop();
    },
    resume() {
      paused = false;
      if (!reducedMotion) syncLoop();
    },
  };
}
```

- [ ] **Step 8: Run the test**

Run: `node --test test/vendor/maze.test.js`
Expected: `ℹ pass 1`, `ℹ fail 0`.

- [ ] **Step 9: Record the change.** In `vendor/PROVENANCE.md`, replace

```markdown
| `hero-maze3d.js` | `ctf-interuniversitario/public/assets/js/hero-maze3d.js` | — | **Pending** — see below |
```

with

```markdown
| `hero-maze3d.js` | `ctf-interuniversitario/public/assets/js/hero-maze3d.js` | — | **Yes** — see below |
```

and replace the whole `## \`hero-maze3d.js\` — pending refactor` section, from its heading down to
and including `Once refactored, this row stops tracking upstream and the file becomes ours to
maintain.`, with

```markdown
## `hero-maze3d.js` — refactored

Upstream it self-initialises at import time against hardcoded `#hero-canvas` and `#inicio`
elements, and adds a `hero--maze` class to the hero section. Here it exports
`createMaze({ canvas })`, which returns `{ pause, resume }`, so the audience window can freeze the
maze while a solve is running. `pause()` stops the render loop and the canvas keeps its last
frame; a resize while paused draws that frame again, because resizing a canvas clears it. It also
imports three.js from its own folder.

The rendering, maze generation, BFS pathfinding and the existing guards (`prefers-reduced-motion`,
tab-visibility pause, IntersectionObserver pause, pixel-ratio cap, WebGL fallback) are unchanged.
The planned `destroy` was left out: the audience window keeps one maze for as long as it is open.

This file no longer tracks upstream; it is ours to maintain.
```

- [ ] **Step 10: Run the suite**

Run: `npm test`
Expected: `ℹ pass 124`, `ℹ fail 0`.

- [ ] **Step 11: Commit**

```bash
git add vendor/hero-maze3d.js vendor/PROVENANCE.md test/vendor/maze.test.js
git commit -m "Refactor the maze into createMaze({ canvas }) with pause and resume"
```

---

### Task 4: The screens, as HTML

UI spec §3–§5. Every rule that decides what a screen says lives here, as pure functions from snapshot
data to HTML: which screen a phase shows (§4.1), the Resultado and Mezcla figures, the standings
slice with its leader and featured rows (§4.2–§4.3), and ARMED's four colour and text rules (§5.2).
The tests build their snapshots with the real core, so they also check the snapshot fields the
screens depend on.

Names come from a local file, so every piece of text is escaped. The scramble preview is inserted as
it is: it comes from the project's own worker.

**Files:**
- Create: `js/ui/audience-screens.js`
- Test: `test/ui/audience-screens.test.js`

- [ ] **Step 1: Write the failing test**, `test/ui/audience-screens.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduce } from '../../js/core/run-state.js';
import { buildSnapshot } from '../../js/core/snapshot.js';
import { packet } from '../../js/drivers/scenarios.js';
import {
  armedDisplay, armedWhoHtml, attractHtml, countHtml, escapeHtml, scrambleHtml, screenFor, standbyHtml,
} from '../../js/ui/audience-screens.js';
import { attempt, dnf, makeConfig } from '../helpers/fixtures.js';
import { apply, cmd, mat } from '../helpers/actions.js';

const config = makeConfig(); // alfa, beta, gamma, delta · 3 attempts
config.teams[1].participant = 'Ana <Pérez>';
const done = (id, bestMs) => [1, 2, 3].map((n) => attempt(id, n, bestMs + (n - 1) * 1000));
const withScramble = (state) => reduce(state, { type: 'scramble', seq: state.scrambleSeq, scramble: "R U R' <b>", svg: '<svg/>' });

const snapshotOf = (state) => buildSnapshot(state, 0);
const resultado = (attempts) => snapshotOf(createState(config, attempts));
const mezcla = (attempts = []) => snapshotOf(withScramble(reduce(createState(config, attempts), cmd('next'))));
const armed = (attempts = []) => apply(withScramble(reduce(createState(config, attempts), cmd('next'))), mat(packet('I', 0)));

test('screenFor picks the screen from the phase and the result (UI spec §4.1)', () => {
  assert.equal(screenFor(resultado([])), 'attract');
  assert.equal(screenFor(resultado(done('alfa', 20000))), 'resultado');
  assert.equal(screenFor(mezcla()), 'mezcla');
  assert.equal(screenFor(snapshotOf(armed())), 'armed');
  assert.equal(screenFor(snapshotOf(apply(armed(), mat(packet(' ', 100, true))))), 'debug');
  assert.equal(screenFor(snapshotOf(apply(armed(), mat(packet(' ', 100, true)), mat(packet('S', 900))))), 'debug');
});

test('armedDisplay follows the four rules, in the eight moments of UI spec §5.2', () => {
  const moments = [
    [null, 'up', '15', 'waiting', 'INSPECCIÓN', 'plain'],
    [6000, 'up', '9', 'plain', 'INSPECCIÓN', 'plain'],
    [9000, 'down', '6', 'plain', 'MANOS EN POSICIÓN', 'plain'],
    [10000, 'ready', '5', 'go', 'LISTO', 'go'],
    [16000, 'up', '+2', 'plain', 'INSPECCIÓN', 'plain'],
    [16000, 'ready', '+2', 'plain', 'LISTO', 'go'],
    [18000, 'up', 'DNF', 'plain', 'INSPECCIÓN EXCEDIDA', 'plain'],
    [null, 'ready', '15', 'go', 'LISTO', 'go'],
  ];
  for (const [inspectionMs, hands, clock, clockTone, status, statusTone] of moments) {
    assert.deepEqual(armedDisplay({ inspectionMs, hands }), { clock, clockTone, status, statusTone }, `${inspectionMs} ${hands}`);
  }
});

test('armedDisplay: hands down past 17 s still says MANOS EN POSICIÓN', () => {
  assert.equal(armedDisplay({ inspectionMs: 18000, hands: 'down' }).status, 'MANOS EN POSICIÓN');
});

test('ATTRACT shows one plate per university, in roster order', () => {
  const html = attractHtml(config.teams);
  const ids = [...html.matchAll(/universidades\/(\w+)\.png/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['alfa', 'beta', 'gamma', 'delta']);
  assert.match(html, /rootkitty-face-attract\.svg/);
});

test('the header counts started universities out of the roster', () => {
  assert.equal(countHtml(mezcla(done('alfa', 20000))), 'UNIVERSIDAD <b>2</b> / 4');
});

test('the band says a scramble is coming in Resultado, and shows it, escaped, otherwise', () => {
  assert.match(scrambleHtml(resultado(done('alfa', 20000))), /class="scr wait">Se genera al llamar a la siguiente universidad</);
  assert.match(scrambleHtml(mezcla()), /class="scr">R U R&#39; &lt;b&gt;</);
});

test('Resultado: best time, position and name of the university that just finished', () => {
  const html = standbyHtml(resultado([...done('alfa', 20000), ...done('beta', 30000)]));
  assert.match(html, /RESULTADO/);
  assert.match(html, /universidades\/beta\.png/);
  assert.match(html, /MEJOR TIEMPO<\/div><div class="big time">30\.00</);
  assert.match(html, /PUESTO <b>2<\/b>/);
  assert.match(html, /class="name">Ana &lt;Pérez&gt;</);
});

test('Resultado, all DNF: a dash and SIN TIEMPO VÁLIDO, and no position', () => {
  const html = standbyHtml(resultado([dnf('alfa', 1), dnf('alfa', 2), dnf('alfa', 3)]));
  assert.match(html, /<div class="big">—<\/div><div class="sub">SIN TIEMPO VÁLIDO</);
  assert.doesNotMatch(html, /PUESTO/);
});

test('Mezcla: the next university and its attempt, with the name left out when there is none', () => {
  const html = standbyHtml(mezcla());
  assert.match(html, /A CONTINUACIÓN/);
  assert.match(html, /universidades\/alfa\.png/);
  assert.match(html, /INTENTO<\/div><div class="big">1<small>DE 3<\/small>/);
  assert.doesNotMatch(html, /class="name"/);
});

test('standings: nothing ranked yet', () => {
  assert.match(standbyHtml(mezcla()), /<div class="empty">Aún no hay tiempos<\/div>/);
});

test('standings: the leader row, and the featured university in bold when it is in the slice', () => {
  const html = standbyHtml(resultado([...done('alfa', 20000), ...done('beta', 30000)]));
  assert.match(html, /<div class="row lead"><span class="r">1<\/span><span class="u">ALFA<\/span><span class="t">20\.00<\/span><\/div>/);
  assert.match(html, /<div class="row now"><span class="r">2<\/span><span class="u">BETA<\/span>/);
});

test('standings: a featured university outside the slice is not added', () => {
  const html = standbyHtml(mezcla([dnf('alfa', 1)]));
  assert.doesNotMatch(html, /class="row/);
});

test('ARMED names the attempt, and the participant when there is one', () => {
  const alfa = armedWhoHtml(snapshotOf(armed([attempt('alfa', 1, 20000)])));
  assert.match(alfa, /INTENTO <b>2<\/b> DE 3/);
  assert.doesNotMatch(alfa, /class="name"/);
  const beta = armedWhoHtml(snapshotOf(armed(done('alfa', 20000))));
  assert.match(beta, /universidades\/beta\.png/);
  assert.match(beta, /class="name">Ana &lt;Pérez&gt;</);
});

test('escapeHtml escapes the five special characters', () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/ui/audience-screens.test.js`
Expected: FAIL with `Cannot find module` for `js/ui/audience-screens.js`.

- [ ] **Step 3: Write `js/ui/audience-screens.js`**

```js
// The audience screens designed so far (UI spec §3–§5): ATTRACT, STANDBY's Resultado and Mezcla, and
// ARMED. Pure: every function takes snapshot data and returns HTML, so the rules run under
// node --test. js/ui/audience.js puts the HTML on the page.
import { formatMs } from '../core/format.js';
import { INSPECTION_DNF_MS, inspectionDisplay } from '../core/inspection.js';

// Which screen a snapshot shows (UI spec §4.1). RUNNING and PENDING are not designed yet, so they get
// the engine's debug view until screens 4 and 5 are.
export function screenFor({ phase, result }) {
  if (phase === 'STANDBY') return result === null ? 'attract' : 'resultado';
  if (phase === 'SCRAMBLE') return 'mezcla';
  if (phase === 'ARMED') return 'armed';
  return 'debug';
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);

// The university plate (§2.3). Each logo already carries the university's name.
const plate = (team) =>
  `<div class="plate"><img src="assets/universidades/${escapeHtml(team.id)}.png" alt="${escapeHtml(team.university)}"></div>`;

// Left out when the roster has no name for the university (§4.2, §5.3).
const nameLine = (team) => (team.participant ? `<div class="name">${escapeHtml(team.participant)}</div>` : '');

// ATTRACT (§3). The plates follow the roster, the same order as the turns.
export function attractHtml(teams) {
  return `<div class="attract">
  <div class="hero">
    <div class="eyes"><img class="face" src="assets/rootkitty-face-attract.svg" alt=""></div>
    <div class="title">
      <img class="logo" src="assets/logo-ctf.svg" alt="CTF Interuniversitario 2026">
      <div class="tag">RETO DEL CUBO</div>
    </div>
  </div>
  <div class="unis">${teams.map(plate).join('')}</div>
  <div class="soon">Comenzamos en breve</div>
</div>`;
}

// The frame Resultado, Mezcla and ARMED share (§4.2, §5.3). Only its slots change, so resetting the
// mat swaps the body and leaves the header and the band as they are.
export const FRAME_HTML = `<div class="frame">
  <header class="hdr"><img src="assets/logo-ctf.svg" alt="CTF Interuniversitario 2026"><span data-slot="count"></span></header>
  <div class="body" data-slot="body"></div>
  <footer class="band">
    <div class="net" data-slot="net"></div>
    <div><div class="label">MEZCLA</div><div data-slot="scramble"></div></div>
    <img class="kitty" src="assets/rootkitty-face.svg" alt="">
  </footer>
</div>`;

export const countHtml = ({ startedCount, teams }) => `UNIVERSIDAD <b>${startedCount}</b> / ${teams.length}`;

export function scrambleHtml({ phase, scramble }) {
  if (phase === 'STANDBY') return '<div class="scr wait">Se genera al llamar a la siguiente universidad</div>';
  return `<div class="scr">${escapeHtml(scramble ?? '')}</div>`;
}

// STANDBY's body (§4.2): Resultado for the university that just finished, Mezcla for the next one.
export function standbyHtml(snapshot) {
  const resultado = snapshot.phase === 'STANDBY';
  const team = resultado ? snapshot.teams.find((t) => t.id === snapshot.result.teamId) : snapshot.competitor;
  return `<div class="standby">
  <div class="main">
    <div class="label">${resultado ? 'RESULTADO' : 'A CONTINUACIÓN'}</div>
    <div class="who">${plate(team)}<div class="figure">${resultado ? resultFigure(snapshot.result) : attemptFigure(snapshot)}</div></div>
    ${nameLine(team)}
  </div>
  <div class="side">
    <div class="label">CLASIFICACIÓN · MEJOR DE ${snapshot.attemptsPerCompetitor}</div>
    ${standingsHtml(snapshot, team.id)}
  </div>
</div>`;
}

function resultFigure({ bestMs, position }) {
  if (bestMs === null) return '<div class="label">MEJOR TIEMPO</div><div class="big">—</div><div class="sub">SIN TIEMPO VÁLIDO</div>';
  return `<div class="label">MEJOR TIEMPO</div><div class="big time">${formatMs(bestMs)}</div><div class="sub">PUESTO <b>${position}</b></div>`;
}

const attemptFigure = ({ attemptNo, attemptsPerCompetitor }) =>
  `<div class="label">INTENTO</div><div class="big">${attemptNo}<small>DE ${attemptsPerCompetitor}</small></div>`;

// The audience slice of the standings (§4.3): ranked universities only, at most 8. The featured
// university is in bold when it is in the slice, and never added when it is not.
function standingsHtml({ standings, teams }, featuredId) {
  if (standings.length === 0) return '<div class="empty">Aún no hay tiempos</div>';
  return standings.map((row) => {
    const team = teams.find((t) => t.id === row.teamId);
    const classes = ['row', row.position === 1 && 'lead', row.teamId === featuredId && 'now'].filter(Boolean).join(' ');
    return `<div class="${classes}"><span class="r">${row.position}</span><span class="u">${escapeHtml(team.university)}</span><span class="t">${formatMs(row.bestMs)}</span></div>`;
  }).join('');
}

// ARMED's body (§5.3). The who line changes once per attempt and the clock once a second, so each
// has its own slot.
export const ARMED_HTML = '<div class="solo"><div class="who" data-slot="who"></div><div data-slot="clock"></div><div data-slot="status"></div></div>';

export const armedWhoHtml = ({ competitor, attemptNo, attemptsPerCompetitor }) =>
  `${plate(competitor)}<div class="txt"><div>INTENTO <b>${attemptNo}</b> DE ${attemptsPerCompetitor}</div>${nameLine(competitor)}</div>`;

// The clock and the status line (§5.2). Four rules; in each, the first match wins.
export function armedDisplay({ inspectionMs, hands }) {
  const clock = inspectionMs === null ? '15' : inspectionDisplay(inspectionMs);
  const penalty = clock === '+2' || clock === 'DNF';
  let clockTone = 'plain';
  if (hands === 'ready' && !penalty) clockTone = 'go';
  else if (inspectionMs === null) clockTone = 'waiting';
  let status = 'INSPECCIÓN';
  if (hands === 'ready') status = 'LISTO';
  else if (hands === 'down') status = 'MANOS EN POSICIÓN';
  else if (inspectionMs > INSPECTION_DNF_MS) status = 'INSPECCIÓN EXCEDIDA';
  return { clock, clockTone, status, statusTone: hands === 'ready' ? 'go' : 'plain' };
}

export function armedClockHtml(snapshot) {
  const { clock, clockTone } = armedDisplay(snapshot);
  return `<div class="clock ${clockTone}">${clock}</div>`;
}

export function armedStatusHtml(snapshot) {
  const { status, statusTone } = armedDisplay(snapshot);
  return `<div class="status ${statusTone}">${status}</div>`;
}
```

- [ ] **Step 4: Run the test**

Run: `node --test test/ui/audience-screens.test.js`
Expected: `ℹ pass 14`, `ℹ fail 0`.

- [ ] **Step 5: Run the suite**

Run: `npm test`
Expected: `ℹ pass 138`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add js/ui/audience-screens.js test/ui/audience-screens.test.js
git commit -m "Add the audience screens as pure HTML: ATTRACT, STANDBY and ARMED"
```

---

### Task 5: A shared browser harness

Decision 12. This moves the smoke test's server, Chrome and check plumbing into
`test/browser/harness.js`, so Task 7's script can use it too. The smoke test's checks do not change
in this task. The harness adds two things: `--enable-unsafe-swiftshader`, so WebGL works without a
GPU, and `awaitPromise` in `evaluate`, so a check can wait on a promise.

**Files:**
- Create: `test/browser/harness.js`
- Modify: `test/browser/smoke.js` (replaced whole)

- [ ] **Step 1: Write `test/browser/harness.js`**

```js
// Shared by the browser scripts in this folder: serves the app, drives headless Chrome over the
// DevTools protocol, and counts checks. No dependencies beyond Chrome and Node 24.
// CHROME=/path/to/chrome overrides the binary.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStaticServer } from '../../serve.js';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function startHarness(debugPort) {
  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const profile = mkdtempSync(join(tmpdir(), 'ctd-chrome-'));
  // Without a GPU, WebGL (the maze) needs Chrome's software renderer, SwiftShader.
  const chrome = spawn(process.env.CHROME ?? 'google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });
  process.on('exit', () => chrome.kill()); // also when a check throws

  for (let i = 0; i < 50; i += 1) {
    try {
      await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      break;
    } catch {
      await sleep(200);
    }
  }

  let failures = 0;
  return {
    base: `http://localhost:${server.address().port}`,
    openTab: (url) => openTab(debugPort, url),
    check(label, ok, detail = '') {
      if (!ok) failures += 1;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
    },
    // Prints the summary, stops Chrome and the server, and exits 0 only if every check passed.
    async finish(name) {
      console.log(failures === 0 ? `\n${name}: all checks passed` : `\n${name}: ${failures} failed`);
      server.close();
      chrome.kill();
      await once(chrome, 'exit');
      rmSync(profile, { recursive: true, force: true });
      process.exit(failures === 0 ? 0 : 1);
    },
  };
}

const KEYS = { ' ': ['Space', 32], n: ['KeyN', 78], d: ['KeyD', 68], u: ['KeyU', 85], r: ['KeyR', 82] };

async function openTab(debugPort, url) {
  const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?${url}`, { method: 'PUT' })).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  let lastId = 0;
  const waiting = new Map();
  const errors = [];
  socket.addEventListener('message', (e) => {
    const message = JSON.parse(e.data);
    waiting.get(message.id)?.(message);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description);
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    lastId += 1;
    waiting.set(lastId, resolve);
    socket.send(JSON.stringify({ id: lastId, method, params }));
  });
  await send('Runtime.enable');
  return {
    send,
    errors,
    close: () => socket.close(),
    closeTab: () => fetch(`http://127.0.0.1:${debugPort}/json/close/${target.id}`),
    evaluate: async (expression) =>
      (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value,
    async press(key) {
      const [code, keyCode] = KEYS[key];
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, text: key, windowsVirtualKeyCode: keyCode });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
    },
    // The viewport as a PNG.
    async screenshot() {
      return Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64');
    },
  };
}
```

- [ ] **Step 2: Replace `test/browser/smoke.js`** with

```js
// Browser smoke test: drives the operator window on the mock mat, with the audience window open,
// through headless Chrome.
//   npm run smoke            (CHROME=/path/to/chrome to override the binary)
import { sleep, startHarness } from './harness.js';

const { base, openTab, check, finish } = await startHarness(9333);

const text = (tab, id) => tab.evaluate(`document.getElementById('${id}')?.textContent ?? document.body.innerText`);
const phase = async (tab) => (await text(tab, 'status')).match(/phase\s+(\w+)/)?.[1];
const play = (tab, name) => tab.evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent === '${name}').click()`);
const snapshot = async (tab) => JSON.parse(await text(tab, 'snapshot'));

// Real mode first, alone: it must load cleanly and offer the connect control. It never touches the
// microphone until that button is clicked.
const real = await openTab(`${base}/`);
await sleep(1500);
check('real mode loads and offers "Connect mat"', await real.evaluate("[...document.querySelectorAll('button')].some((b) => b.textContent === 'Connect mat')"));
check('real mode has no uncaught errors', real.errors.length === 0, real.errors.join(' | '));
await real.closeTab();
await sleep(500); // closing the tab releases its operator lock

// A hidden tab's timers are throttled, which would stall the mock mat, so the operator stays in
// front. The audience only reacts to messages and works from behind.
const operator = await openTab(`${base}/?driver=mock`);
await sleep(1500);
const audience = await openTab(`${base}/audience.html`);
await operator.send('Page.bringToFront');
await sleep(800);

check('operator starts in STANDBY', (await phase(operator)) === 'STANDBY');
check('an audience window opened late catches up', (await snapshot(audience)).phase === 'STANDBY');

await operator.press('n');
await sleep(2000);
const scramble = await text(operator, 'scramble');
check('N calls the first university, with a scramble', (await phase(operator)) === 'SCRAMBLE' && scramble.length > 20, scramble);
check('the audience gets the cube preview', await audience.evaluate("!!document.querySelector('#cube svg')"));

await play(operator, 'reset');
await sleep(400);
check('mat at 0.00 → ARMED', (await phase(operator)) === 'ARMED');
check('the audience clock waits at 15', (await text(audience, 'clock')) === '15');

await operator.press(' ');
await sleep(1300);
const countdown = await text(audience, 'clock');
check('Space starts the countdown on the audience', ['14', '13'].includes(countdown), countdown);

await play(operator, 'cleanSolve');
await sleep(2500);
check('the solve starts → RUNNING', (await phase(operator)) === 'RUNNING');
await sleep(8500);
check('the timer stops → PENDING at 8.00', (await phase(operator)) === 'PENDING' && (await text(operator, 'status')).includes('8.00'));
check('the audience clock shows 8.00', (await text(audience, 'clock')) === '8.00');

await operator.press(' ');
await sleep(1500);
check('Space accepts → attempt 2', (await text(operator, 'status')).includes('attempt 2 of 3'));
await operator.press('u');
await sleep(300);
check('U reopens PENDING', (await phase(operator)) === 'PENDING');
await operator.press('d');
await sleep(300);
check('D records a DNF', (await text(operator, 'table')).includes('DNF'));

const mockLog = await operator.evaluate("localStorage.getItem('cube-tournament-display:attempts:v1:mock')");
check('the attempt is saved under the mock key', JSON.parse(mockLog).attempts.length === 1);
check('the real event key is untouched', (await operator.evaluate("localStorage.getItem('cube-tournament-display:attempts:v1')")) === null);

const second = await openTab(`${base}/?driver=mock`);
await sleep(1200);
check('a second operator window refuses', (await second.evaluate('document.body.innerText')).includes('Another operator window'));
second.close();

await operator.send('Page.bringToFront');
await operator.send('Page.reload');
await sleep(1500);
check('a reload asks: resume or start fresh', (await operator.evaluate('document.body.innerText')).includes('1 recorded attempts'));
await operator.press('r');
await sleep(800);
check('R resumes with the recorded attempt', (await text(operator, 'table')).includes('DNF'));

check('no uncaught errors in either window', operator.errors.length + audience.errors.length === 0,
  [...operator.errors, ...audience.errors].join(' | '));

operator.close();
audience.close();
await finish('smoke');
```

- [ ] **Step 3: Run it**

Run: `npm run smoke`
Expected: the same 21 `PASS` lines as the engine plan's Task 17, then `smoke: all checks passed`.
Nothing about the windows has changed yet.

- [ ] **Step 4: Commit**

```bash
git add test/browser/harness.js test/browser/smoke.js
git commit -m "Move the browser test plumbing into a shared harness"
```

---

### Task 6: The audience window

The designed screens replace the debug view. Four smoke checks read the audience window, and they
change first so that they fail against the debug view. `css/tokens.css` holds UI spec §2.1–§2.2.
`css/audience.css` transcribes §2.3 and §3–§5, with the reset the approved mockups were drawn under.
`js/ui/audience.js` rewrites an element only when its HTML changes. It keeps one frame (header, body
and band) across Resultado, Mezcla and ARMED, so a mat reset swaps only the body (UI spec §5.3).

**Files:**
- Modify: `test/browser/smoke.js`
- Create: `css/tokens.css`, `css/audience.css`
- Modify: `audience.html`, `js/ui/audience.js` (both replaced whole)

- [ ] **Step 1: Point the smoke checks at the designed screens.** In `test/browser/smoke.js`, replace

```js
const snapshot = async (tab) => JSON.parse(await text(tab, 'snapshot'));
```

with

```js
const screen = (tab) => tab.evaluate("document.getElementById('stage').dataset.screen");
const armedClock = (tab) => tab.evaluate("document.querySelector('.solo .clock')?.textContent");
```

replace

```js
check('an audience window opened late catches up', (await snapshot(audience)).phase === 'STANDBY');
```

with

```js
check('an audience window opened late catches up: ATTRACT', (await screen(audience)) === 'attract');
```

replace

```js
check('the audience gets the cube preview', await audience.evaluate("!!document.querySelector('#cube svg')"));
```

with

```js
check('the audience shows Mezcla with the cube preview', (await screen(audience)) === 'mezcla'
  && await audience.evaluate("!!document.querySelector('.net svg')"));
```

replace

```js
check('the audience clock waits at 15', (await text(audience, 'clock')) === '15');
```

with

```js
check('the audience clock waits at 15', (await armedClock(audience)) === '15');
```

and replace

```js
const countdown = await text(audience, 'clock');
```

with

```js
const countdown = await armedClock(audience);
```

The PENDING check, `the audience clock shows 8.00`, stays as it is: PENDING still shows the debug
view, whose clock has the id `clock`.

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run smoke`
Expected: exactly these four fail, then `smoke: 4 failed`:

```
FAIL  an audience window opened late catches up: ATTRACT
FAIL  the audience shows Mezcla with the cube preview
FAIL  the audience clock waits at 15
FAIL  Space starts the countdown on the audience
```

- [ ] **Step 3: Write `css/tokens.css`**

```css
/* Shared design tokens (UI spec §2.1–§2.2). The palette is the CTF site's own, plus --go. Sizes are
   in cqw of the audience stage, so they scale with the projector. */
:root {
  --bg-deep: #02010c;
  --violet-deep: #231f66; /* dividers and plate borders only: 1.44:1 on --bg-deep, never text */
  --violet: #aba6f7;
  --gold-text: #ffea95;
  --go: #2ee6a0;          /* the mat's green light, and nothing else */
  --plate: #f7f7f7;
  --name: #e8e6ff;

  --radius: 1.26cqw;
  --fs-label: 1.05cqw;
  --fs-body: 1.38cqw;
  --fs-lead: 2.2cqw;
  --fs-hero: 4.4cqw;
  --fs-clock: 17.6cqw;

  --font: "roc-grotesk-variable", "roc-grotesk", system-ui, sans-serif;
}
```

- [ ] **Step 4: Write `css/audience.css`**

```css
/* Audience window (UI spec §2–§5). Values are the spec's; the mockups it names are the visual
   reference. The mockups were drawn under this reset, so it stays. */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body { height: 100%; }
body { display: grid; place-items: center; overflow: hidden; background: var(--bg-deep); }
img { display: block; }

/* The 16:9 stage, as large as the window allows. */
.stage {
  position: relative;
  width: min(100vw, calc(100vh * 16 / 9));
  aspect-ratio: 16 / 9;
  container-type: size;
  overflow: hidden;
  background: var(--bg-deep);
  color: #fff;
  font-family: var(--font);
}
.maze { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; }
.shade {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: radial-gradient(120% 92% at 50% 106%, rgba(2,1,12,0) 0%, rgba(2,1,12,.70) 60%, rgba(2,1,12,.95) 100%);
}
.stage[data-screen="attract"] .shade,
.stage[data-screen="waiting"] .shade {
  background:
    radial-gradient(58% 46% at 50% 38%, rgba(5,4,20,.60) 0%, rgba(5,4,20,.30) 45%, transparent 72%),
    radial-gradient(80% 65% at 50% 50%, transparent 38%, rgba(5,4,20,.65) 100%);
}
.screen { position: relative; z-index: 3; height: 100%; }
.stage[data-screen="debug"] .screen,
.stage:not([data-screen="debug"]) .debug { display: none; }

/* Shared pieces (§2.3) */
.plate {
  display: flex; align-items: center; justify-content: center;
  background: var(--plate); border: 1px solid var(--violet-deep); border-radius: var(--radius);
}
.plate img { width: 100%; height: auto; }
.label { font-size: var(--fs-label); letter-spacing: .24em; color: var(--violet); }
.name { font-size: var(--fs-body); letter-spacing: .14em; color: var(--violet); text-transform: uppercase; }

/* ATTRACT (§3) */
.attract { height: 100%; display: flex; flex-direction: column; padding: 2.4cqw 3cqw 2.2cqw; }
.attract .hero {
  --face-w: 34cqw; --logo-w: 30cqw;
  flex: 1; min-height: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.attract .eyes {
  display: flex; align-items: center; justify-content: center;
  margin-top: calc(var(--face-w) * -0.19); margin-bottom: calc(var(--face-w) * -0.20);
}
.attract .face {
  position: relative; top: calc(var(--logo-w) * -0.1);
  width: var(--face-w); height: auto;
  -webkit-mask-image:
    radial-gradient(ellipse 66% 78% at 50% 48%, #000 40%, transparent 80%),
    linear-gradient(to bottom, transparent 0%, transparent 16%, rgba(0,0,0,.42) 34%, #000 52%);
  -webkit-mask-composite: source-in;
  mask-image:
    radial-gradient(ellipse 66% 78% at 50% 48%, #000 40%, transparent 80%),
    linear-gradient(to bottom, transparent 0%, transparent 16%, rgba(0,0,0,.42) 34%, #000 52%);
  mask-composite: intersect;
}
.attract .title { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; }
.attract .logo {
  width: var(--logo-w); height: auto;
  filter: drop-shadow(0 0 18px rgba(124,92,255,.55)) drop-shadow(0 0 44px rgba(124,92,255,.35));
}
@media (prefers-reduced-motion: no-preference) {
  .attract .logo { animation: logo-glow-pulse 4s ease-in-out infinite; }
}
@keyframes logo-glow-pulse {
  0%, 100% { filter: drop-shadow(0 0 16px rgba(124,92,255,.45)) drop-shadow(0 0 38px rgba(124,92,255,.28)); }
  50% { filter: drop-shadow(0 0 22px rgba(124,92,255,.65)) drop-shadow(0 0 54px rgba(124,92,255,.42)); }
}
.attract .tag {
  margin-top: 1.4cqw;
  font-size: var(--fs-lead); font-weight: 700; letter-spacing: .28em; text-indent: .28em;
  text-shadow: 0 0 1.6cqw rgba(2,1,12,.9);
}
.attract .unis { display: grid; grid-template-columns: repeat(28, minmax(0, 1fr)); gap: .85cqw; margin-top: 1.5cqw; }
.attract .plate { grid-column: span 4; padding: .75cqw 1.1cqw; }
.attract .plate:nth-child(8) { grid-column: 3 / span 4; }
.attract .soon {
  margin-top: 1.4cqw; text-align: center;
  font-size: var(--fs-body); font-weight: 500; letter-spacing: .2em; text-indent: .2em;
  text-shadow: 0 0 .9cqw rgba(2,1,12,.95), 0 .12cqw .45cqw rgba(2,1,12,.9);
}

/* The frame: header, body, band (§4.2, §5.3) */
.frame { height: 100%; display: flex; flex-direction: column; }
.hdr {
  display: flex; align-items: center; justify-content: space-between; gap: 2cqw;
  padding: 1.5cqw 2.2cqw; border-bottom: 1px solid var(--violet-deep);
  font-size: var(--fs-body); letter-spacing: .14em; color: var(--violet);
}
.hdr img { height: 3.2cqw; }
.hdr b { color: #fff; }
.body { flex: 1; min-height: 0; }
.band {
  position: relative; z-index: 3;
  display: flex; align-items: center; gap: 2.2cqw;
  padding: 2.2cqw; border-top: 1px solid var(--violet-deep); background: rgba(2,1,12,.72);
}
.net { width: 8.7cqw; aspect-ratio: 137 / 102; }
.net svg { display: block; width: 100%; height: 100%; }
.scr { margin-top: .5cqw; font-size: var(--fs-lead); font-weight: 500; line-height: 1.2; white-space: nowrap; }
.scr.wait { color: var(--violet); }
.kitty {
  --kw: 11cqw;
  position: absolute; z-index: 2; right: 2.2cqw; bottom: calc(var(--kw) * 0.02);
  width: var(--kw); opacity: .9;
  filter: drop-shadow(0 0 2.4cqw rgba(238,39,55,.3));
}

/* STANDBY: Resultado and Mezcla (§4.2) */
.standby { height: 100%; display: grid; grid-template-columns: 62% 38%; }
.standby .main {
  display: flex; flex-direction: column; justify-content: center; min-height: 0;
  padding: 2.1cqw 2.3cqw; border-right: 1px solid var(--violet-deep);
}
.standby .who { display: flex; align-items: stretch; gap: 2.2cqw; margin-top: 1.1cqw; }
.standby .plate { width: 22cqw; padding: 1.3cqw 1.9cqw; }
.standby .figure {
  display: flex; flex-direction: column; justify-content: center;
  padding-left: 2.2cqw; border-left: 1px solid var(--violet-deep);
}
.standby .big { margin-top: .5cqw; font-size: var(--fs-hero); font-weight: 800; line-height: 1; letter-spacing: -.01em; }
.standby .big.time { font-variant-numeric: tabular-nums; }
.standby .big small { margin-left: .6cqw; font-size: var(--fs-body); font-weight: 500; letter-spacing: .14em; color: var(--violet); }
.standby .sub { margin-top: .9cqw; font-size: var(--fs-body); font-weight: 500; letter-spacing: .14em; color: var(--violet); }
.standby .sub b { color: #fff; font-weight: 800; }
.standby .main .name { margin-top: 1.1cqw; }
.standby .side { display: flex; flex-direction: column; min-height: 0; padding: 1.9cqw; }
.standby .side > .label { margin-bottom: 1cqw; }
.row {
  display: grid; grid-template-columns: 2.2cqw 1fr auto; gap: .85cqw; align-items: baseline;
  padding: .38cqw 0; border-bottom: 1px solid rgba(35,31,102,.5); font-size: var(--fs-body);
}
.row .r { color: var(--violet); font-weight: 700; }
.row .u { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--name); }
.row .t { font-variant-numeric: tabular-nums; font-weight: 500; }
.row.now:not(.lead) .u { color: #fff; font-weight: 800; }
.row.lead {
  margin: 0 -.8cqw; padding-left: .8cqw; padding-right: .8cqw;
  border-radius: var(--radius); background: rgba(171,166,247,.1);
}
.row.lead .r, .row.lead .u, .row.lead .t { color: var(--gold-text); font-weight: 800; }
.empty { font-size: var(--fs-body); color: var(--violet); }

/* ARMED (§5.2–§5.3) */
.solo {
  height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: radial-gradient(52% 58% at 50% 55%, rgba(2,1,12,.72) 0%, rgba(2,1,12,.4) 55%, transparent 80%);
}
.solo .who { display: flex; align-items: center; gap: 1.6cqw; }
.solo .plate { width: 13cqw; padding: .75cqw 1.1cqw; }
.solo .txt {
  padding-left: 1.6cqw; border-left: 1px solid var(--violet-deep);
  font-size: var(--fs-body); letter-spacing: .14em; color: var(--violet); line-height: 1.5;
}
.solo .txt b { color: #fff; font-weight: 800; }
.solo .clock {
  margin-top: 1.5cqw;
  font-size: var(--fs-clock); font-weight: 800; line-height: .9; letter-spacing: -.02em;
  font-variant-numeric: tabular-nums;
}
.solo .clock.waiting { color: var(--violet); }
.solo .status { margin-top: 1.2cqw; font-size: var(--fs-body); letter-spacing: .24em; color: var(--violet); }
.solo .go { color: var(--go); }

/* The engine's debug view, shown for RUNNING and PENDING until screens 4 and 5 are designed. */
.debug {
  position: absolute; z-index: 4; top: 2cqw; left: 2cqw; width: 44cqw; max-height: calc(100% - 4cqw);
  overflow: hidden; padding: 1.2cqw 1.6cqw; background: rgba(2,1,12,.85); color: var(--name);
  font: .8cqw/1.5 ui-monospace, monospace;
}
.debug .clock { font: 800 6cqw/1.1 var(--font); font-variant-numeric: tabular-nums; color: #fff; }
.debug pre { white-space: pre-wrap; }
.debug .cube svg { width: 10cqw; height: auto; }
```

- [ ] **Step 5: Replace `audience.html`** with

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Reto del Cubo</title>
    <link rel="stylesheet" href="https://use.typekit.net/frw4sme.css">
    <link rel="stylesheet" href="css/tokens.css">
    <link rel="stylesheet" href="css/audience.css">
  </head>
  <body>
    <main class="stage" id="stage" data-screen="waiting">
      <canvas class="maze" id="maze"></canvas>
      <div class="shade"></div>
      <div class="screen" id="screen"></div>
      <div class="debug" id="debug"></div>
    </main>
    <script type="module" src="js/ui/audience.js"></script>
  </body>
</html>
```

- [ ] **Step 6: Replace `js/ui/audience.js`** with

```js
// Audience window: renders the operator's latest snapshot and holds no state of its own. The maze
// runs under every screen and holds its last frame while a solve is running (UI spec §2.5).
import { createMaze } from '../../vendor/hero-maze3d.js';
import { createSubscriber } from '../core/channel.js';
import { createAudienceView } from './audience-debug-view.js';
import {
  ARMED_HTML, FRAME_HTML, armedClockHtml, armedStatusHtml, armedWhoHtml, attractHtml, countHtml,
  scrambleHtml, screenFor, standbyHtml,
} from './audience-screens.js';

const stage = document.getElementById('stage');
const screen = document.getElementById('screen');
const maze = createMaze({ canvas: document.getElementById('maze') });
const debugView = createAudienceView(document.getElementById('debug'));

// Snapshots arrive about ten times a second. An element is rewritten only when its HTML changes,
// so nothing is rebuilt between changes and the images never flicker.
const written = new WeakMap();
function patch(element, html) {
  if (written.get(element) === html) return;
  element.innerHTML = html;
  written.set(element, html);
}

function render(snapshot) {
  const name = screenFor(snapshot);
  stage.dataset.screen = name;
  if (snapshot.phase === 'RUNNING') maze.pause();
  else maze.resume();
  if (name === 'debug') {
    debugView.render(snapshot);
    return;
  }
  if (name === 'attract') {
    patch(screen, attractHtml(snapshot.teams));
    return;
  }
  patch(screen, FRAME_HTML);
  const slot = (key) => screen.querySelector(`[data-slot="${key}"]`);
  patch(slot('count'), countHtml(snapshot));
  patch(slot('net'), snapshot.scrambleSvg ?? ''); // SVG from our own scramble worker
  patch(slot('scramble'), scrambleHtml(snapshot));
  if (name === 'armed') {
    patch(slot('body'), ARMED_HTML);
    patch(slot('who'), armedWhoHtml(snapshot));
    patch(slot('clock'), armedClockHtml(snapshot));
    patch(slot('status'), armedStatusHtml(snapshot));
  } else {
    patch(slot('body'), standbyHtml(snapshot));
  }
}

createSubscriber(render);
```

- [ ] **Step 7: Run the smoke test**

Run: `npm run smoke`
Expected: 21 `PASS` lines, then `smoke: all checks passed`. The four from Step 2 now read:

```
PASS  an audience window opened late catches up: ATTRACT
PASS  the audience shows Mezcla with the cube preview
PASS  the audience clock waits at 15
PASS  Space starts the countdown on the audience  (14)
```

- [ ] **Step 8: Run the suite**

Run: `npm test`
Expected: `ℹ pass 138`, `ℹ fail 0`.

- [ ] **Step 9: Commit**

```bash
git add test/browser/smoke.js css/tokens.css css/audience.css audience.html js/ui/audience.js
git commit -m "Draw ATTRACT, STANDBY and ARMED in the audience window, over the maze"
```

---

### Task 7: Check the screens at 1080p

UI spec §4.8 and §5.8 ask for every designed state to be rendered at 1920×1080, compared with its
mockup, and checked against a list of invariants. This script does that. It builds each state's
snapshot with the real core, draws the cube preview with the real `cstimer_module`, and posts the
snapshot to the audience window over its BroadcastChannel, the way the operator window does. It then
checks the invariants and saves a PNG of each state. It also checks the maze (UI spec §2.5): it moves
on ARMED, holds its frame while a solve runs, redraws that frame after a resize, and moves again
afterwards.

The page cannot read pixels from its own WebGL canvas, so the maze checks compare screenshots. To
measure whether the maze is drawn, the page decodes a screenshot of itself.

**Files:**
- Create: `test/browser/screens.js`
- Modify: `package.json` (add the `screens` script), `.gitignore`

- [ ] **Step 1: Write `test/browser/screens.js`**

```js
// Renders every designed audience state at 1920×1080 and checks the UI spec's invariants (§2.5,
// §4.8, §5.8). The snapshots come from the real core and the cube preview from the real
// cstimer_module; they reach the audience window over its BroadcastChannel, as the operator's do.
// Each state is also saved to test/browser/out/ to compare with the approved mockups by eye.
//   npm run screens          (CHROME=/path/to/chrome to override the binary)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import { CHANNEL } from '../../js/core/channel.js';
import { createState, reduce } from '../../js/core/run-state.js';
import { buildSnapshot } from '../../js/core/snapshot.js';
import { packet } from '../../js/drivers/scenarios.js';
import { createScrambler } from '../../js/scrambler.js';
import { attempt, dnf } from '../helpers/fixtures.js';
import { apply, cmd, mat } from '../helpers/actions.js';
import { sleep, startHarness } from './harness.js';

const OUT = new URL('./out/', import.meta.url);
mkdirSync(OUT, { recursive: true });

// The mockups' event: the real roster, two participant names, and the longest scramble a
// random-state 3×3 gets (21 moves).
const config = JSON.parse(readFileSync(new URL('../../config/event.json', import.meta.url), 'utf8'));
const NAMES = { pucmm: 'Carla Fernández', uce: 'José Martínez' };
config.teams = config.teams.map((team) => ({ ...team, participant: NAMES[team.id] ?? '' }));
const SCRAMBLE = "R' U2 B' L' F D' R2 B U' L F2 U2 R2 D B2 D' F2 L2 D2 F2 U";

const thread = new Worker(new URL('../helpers/cstimer-worker.cjs', import.meta.url));
const { svg } = await createScrambler({
  postMessage: (message) => thread.postMessage(message),
  set onmessage(handler) { thread.on('message', (data) => handler({ data })); },
}).image(SCRAMBLE);
await thread.terminate();

// Ten universities have finished and PUCMM, 9th, is the latest: standby-09-final.html's standings.
const three = (id, bestMs) => [bestMs, bestMs + 9000, bestMs + 17000].map((ms, i) => attempt(id, i + 1, ms));
const allDnf = (id) => [1, 2, 3].map((n) => dnf(id, n));
const earlier = [
  ...three('intec', 84020), ...three('itla', 115880), ...three('unapec', 127310), ...three('unibe', 139040),
  ...three('utesa', 161770), ...three('ucsd', 182150), ...three('uapa', 201400), ...three('unphu', 228600),
  ...three('loyola', 242500), ...allDnf('unicda'),
];
const withScramble = (state) => reduce(state, { type: 'scramble', seq: state.scrambleSeq, scramble: SCRAMBLE, svg });

const resultado = createState(config, [...earlier, ...three('pucmm', 235100)]);
const resultadoDnf = createState(config, [...earlier, ...allDnf('pucmm')]);
const mezcla = withScramble(reduce(resultado, cmd('next'))); // UCE, attempt 1
// UCE's first attempt was a DNF, so it is on attempt 2 and not in the standings (armed-04-final.html).
const armed = apply(withScramble(reduce(createState(config, [...earlier, ...three('pucmm', 235100), dnf('uce', 1)]), cmd('next'))), mat(packet('I', 0)));
const inspecting = reduce(armed, cmd('startInspection', 0));

const at = (state, now) => buildSnapshot(state, now);
const hands = (header) => mat(packet(header, 0));
// [name, snapshot, clock, clock colour, status, status colour] for the eight moments of UI spec §5.2.
const VIOLET = 'rgb(171, 166, 247)';
const WHITE = 'rgb(255, 255, 255)';
const GO = 'rgb(46, 230, 160)';
const MOMENTS = [
  ['armed-1', at(armed, 0), '15', VIOLET, 'INSPECCIÓN', VIOLET],
  ['armed-2', at(inspecting, 6000), '9', WHITE, 'INSPECCIÓN', VIOLET],
  ['armed-3', at(apply(inspecting, hands('C')), 9000), '6', WHITE, 'MANOS EN POSICIÓN', VIOLET],
  ['armed-4', at(apply(inspecting, hands('A')), 10000), '5', GO, 'LISTO', GO],
  ['armed-5', at(inspecting, 16000), '+2', WHITE, 'INSPECCIÓN', VIOLET],
  ['armed-6', at(apply(inspecting, hands('A')), 16000), '+2', WHITE, 'LISTO', GO],
  ['armed-7', at(inspecting, 18000), 'DNF', WHITE, 'INSPECCIÓN EXCEDIDA', VIOLET],
  ['armed-8', at(apply(armed, hands('A')), 0), '15', GO, 'LISTO', GO],
];
const running = at(apply(armed, mat(packet(' ', 4200, true))), 0);

const { base, openTab, check, finish } = await startHarness(9334);
const tab = await openTab(`${base}/audience.html`);
await tab.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await sleep(1500);

const show = async (snapshot, wait = 400) => {
  await tab.evaluate(`(() => {
    const channel = new BroadcastChannel(${JSON.stringify(CHANNEL)});
    channel.postMessage(${JSON.stringify({ type: 'snapshot', snapshot })});
    channel.close();
  })()`);
  await sleep(wait);
};
const save = async (name) => writeFileSync(new URL(`${name}.png`, OUT), await tab.screenshot());
const js = (expression) => tab.evaluate(expression);
const textOf = (selector) => js(`document.querySelector(${JSON.stringify(selector)})?.textContent`);
const colorOf = (selector) => js(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).color`);
// Every colour used for text, fills and borders on the visible screen.
const colorsUsed = () => js(`[...document.querySelectorAll('.screen *')].flatMap((el) => {
  const s = getComputedStyle(el);
  return [s.color, s.backgroundColor, s.borderTopColor, s.borderBottomColor, s.borderLeftColor, s.borderRightColor];
})`);
const bandHeight = () => js("document.querySelector('.band').getBoundingClientRect().height");

check('WebGL is available, so the maze runs', await js("!!document.createElement('canvas').getContext('webgl')"));
check('roc-grotesk loads from Adobe Fonts', await js("document.fonts.load('800 20px roc-grotesk-variable').then(() => document.fonts.check('800 20px roc-grotesk-variable'))"));

// ATTRACT (§3)
await show(at(createState(config), 0), 1500);
await save('attract');
const plates = await js("[...document.querySelectorAll('.attract .plate img')].map((img) => img.getAttribute('src'))");
check('ATTRACT: 13 plates in roster order', JSON.stringify(plates) === JSON.stringify(config.teams.map((t) => `assets/universidades/${t.id}.png`)));

// STANDBY, Resultado (§4)
await show(at(resultado, 0), 1000);
await save('standby-resultado');
check('Resultado: the header counts 11 of 13', (await textOf('.hdr span')) === 'UNIVERSIDAD 11 / 13');
check('Resultado: best time and position', (await textOf('.big')) === '3:55.10' && (await textOf('.sub')) === 'PUESTO 9');
check('Resultado: ranked universities only, capped at 8', (await js("document.querySelectorAll('.row').length")) === 8);
check('Resultado: the leader row is --gold-text', (await colorOf('.row.lead .u')) === 'rgb(255, 234, 149)');
const resultadoBand = await bandHeight();
check('the band is 10.95cqw tall', Math.abs(resultadoBand / 19.2 - 10.95) < 0.05, `${(resultadoBand / 19.2).toFixed(2)}cqw`);

await show(at(resultadoDnf, 0));
await save('standby-all-dnf');
check('Resultado, all DNF: a dash and SIN TIEMPO VÁLIDO', (await textOf('.big')) === '—' && (await textOf('.sub')) === 'SIN TIEMPO VÁLIDO');

// STANDBY, Mezcla (§4)
await show(at(mezcla, 0), 1000);
await save('standby-mezcla');
check('Mezcla: UCE, attempt 1 of 3, with the name', (await textOf('.figure .big')) === '1DE 3' && (await textOf('.main .name')) === 'José Martínez');
check('the band is the same height in Resultado and Mezcla', (await bandHeight()) === resultadoBand);
const scrambleLine = await js(`(() => {
  const range = document.createRange();
  range.selectNodeContents(document.querySelector('.scr'));
  return { lines: range.getClientRects().length, right: range.getBoundingClientRect().right,
    kitty: document.querySelector('.kitty').getBoundingClientRect().left };
})()`);
check('a 21-move scramble stays on one line, clear of the mascot', scrambleLine.lines === 1 && scrambleLine.right < scrambleLine.kitty,
  `ends at ${Math.round(scrambleLine.right)}px, mascot at ${Math.round(scrambleLine.kitty)}px`);
const kittyInBand = await js(`(() => {
  const band = document.querySelector('.band').getBoundingClientRect();
  const kitty = document.querySelector('.kitty').getBoundingClientRect();
  return kitty.top >= band.top && kitty.bottom <= band.bottom && kitty.right <= band.right;
})()`);
check('the mascot sits inside the band', kittyInBand);
check('no --go anywhere on STANDBY', !(await colorsUsed()).includes(GO));

// ARMED (§5). Resetting the mat swaps only the body: the header and band are the same elements.
await js("document.querySelector('.band').dataset.kept = 'yes'; document.querySelector('.hdr').dataset.kept = 'yes'");
await show(MOMENTS[0][1], 1000);
check('ARMED keeps the header and band of Mezcla', (await js("document.querySelector('.band').dataset.kept + document.querySelector('.hdr').dataset.kept")) === 'yesyes'
  && (await bandHeight()) === resultadoBand);
for (const [name, snapshot, clock, clockColor, status, statusColor] of MOMENTS) {
  await show(snapshot);
  await save(name);
  const shown = [await textOf('.solo .clock'), await colorOf('.solo .clock'), await textOf('.solo .status'), await colorOf('.solo .status')];
  check(`${name}: ${clock} · ${status}`, JSON.stringify(shown) === JSON.stringify([clock, clockColor, status, statusColor]), shown.join(' · '));
  const colors = await colorsUsed();
  check(`${name}: --go only on the green light`, colors.includes(GO) === (snapshot.hands === 'ready'));
  check(`${name}: no --gold, and no --red`, !colors.includes('rgb(212, 170, 6)') && !colors.includes('rgb(238, 39, 55)'));
}
const clockFit = await js(`(() => {
  const clock = document.querySelector('.solo .clock');
  const probe = clock.cloneNode();
  probe.textContent = '4:59.99';
  probe.style.position = 'absolute';
  clock.parentNode.append(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width / 19.2;
})()`);
check('4:59.99 fits at --fs-clock', clockFit < 70, `${clockFit.toFixed(1)}cqw`);

// The maze (§2.5): live on ARMED, frozen while a solve is running, live again after.
const mazeMoves = async () => {
  const before = await tab.screenshot();
  await sleep(700);
  return !before.equals(await tab.screenshot());
};
// The share of lit pixels in the bottom-right quarter of the screen, where only the maze is drawn.
// The page cannot read its own WebGL canvas, so it decodes a screenshot instead.
const mazeLit = async () => js(`new Promise((resolve) => {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(image.width / 2, image.height * 0.6, image.width / 2, image.height * 0.4);
    let lit = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] > 90) lit += 1;
    resolve(lit / (data.length / 4));
  };
  image.src = 'data:image/png;base64,${(await tab.screenshot()).toString('base64')}';
})`);
await show(MOMENTS[1][1]);
check('the maze moves on ARMED', await mazeMoves());
await show(running);
check('RUNNING shows the debug view, for now', (await js("document.getElementById('stage').dataset.screen")) === 'debug'
  && (await textOf('#clock')) === '4.20');
check('the maze holds its frame while the solve runs', !(await mazeMoves()));
const litBefore = await mazeLit();
await tab.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
await sleep(600);
const litAfter = await mazeLit();
check('a resize during the solve redraws the held frame', litBefore > 0.1 && litAfter > litBefore / 2,
  `lit ${litBefore.toFixed(2)} before, ${litAfter.toFixed(2)} after`);
await tab.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await show(MOMENTS[1][1], 800);
check('the maze moves again once the solve is over', await mazeMoves());

check('no uncaught errors', tab.errors.length === 0, tab.errors.join(' | '));
console.log(`\nScreenshots in ${OUT.pathname}`);
tab.close();
await finish('screens');
```

- [ ] **Step 2: Add the script** to `package.json`, directly after the `"smoke"` line:

```json
    "screens": "node test/browser/screens.js",
```

- [ ] **Step 3: Keep the screenshots out of git.** In `.gitignore`, replace

```
# Local event data / exports
*.local.json
exports/
```

with

```
# Local event data / exports
*.local.json
exports/

# Screenshots from npm run screens
test/browser/out/
```

- [ ] **Step 4: Run it**

Run: `npm run screens`
Expected, in this order, then exit code 0. The pixel positions and the `lit` figures can differ
slightly from run to run.

```
PASS  WebGL is available, so the maze runs
PASS  roc-grotesk loads from Adobe Fonts
PASS  ATTRACT: 13 plates in roster order
PASS  Resultado: the header counts 11 of 13
PASS  Resultado: best time and position
PASS  Resultado: ranked universities only, capped at 8
PASS  Resultado: the leader row is --gold-text
PASS  the band is 10.95cqw tall  (10.93cqw)
PASS  Resultado, all DNF: a dash and SIN TIEMPO VÁLIDO
PASS  Mezcla: UCE, attempt 1 of 3, with the name
PASS  the band is the same height in Resultado and Mezcla
PASS  a 21-move scramble stays on one line, clear of the mascot  (ends at 1303px, mascot at 1667px)
PASS  the mascot sits inside the band
PASS  no --go anywhere on STANDBY
PASS  ARMED keeps the header and band of Mezcla
PASS  armed-1: 15 · INSPECCIÓN  (15 · rgb(171, 166, 247) · INSPECCIÓN · rgb(171, 166, 247))
PASS  armed-1: --go only on the green light
PASS  armed-1: no --gold, and no --red
PASS  armed-2: 9 · INSPECCIÓN  (9 · rgb(255, 255, 255) · INSPECCIÓN · rgb(171, 166, 247))
PASS  armed-2: --go only on the green light
PASS  armed-2: no --gold, and no --red
PASS  armed-3: 6 · MANOS EN POSICIÓN  (6 · rgb(255, 255, 255) · MANOS EN POSICIÓN · rgb(171, 166, 247))
PASS  armed-3: --go only on the green light
PASS  armed-3: no --gold, and no --red
PASS  armed-4: 5 · LISTO  (5 · rgb(46, 230, 160) · LISTO · rgb(46, 230, 160))
PASS  armed-4: --go only on the green light
PASS  armed-4: no --gold, and no --red
PASS  armed-5: +2 · INSPECCIÓN  (+2 · rgb(255, 255, 255) · INSPECCIÓN · rgb(171, 166, 247))
PASS  armed-5: --go only on the green light
PASS  armed-5: no --gold, and no --red
PASS  armed-6: +2 · LISTO  (+2 · rgb(255, 255, 255) · LISTO · rgb(46, 230, 160))
PASS  armed-6: --go only on the green light
PASS  armed-6: no --gold, and no --red
PASS  armed-7: DNF · INSPECCIÓN EXCEDIDA  (DNF · rgb(255, 255, 255) · INSPECCIÓN EXCEDIDA · rgb(171, 166, 247))
PASS  armed-7: --go only on the green light
PASS  armed-7: no --gold, and no --red
PASS  armed-8: 15 · LISTO  (15 · rgb(46, 230, 160) · LISTO · rgb(46, 230, 160))
PASS  armed-8: --go only on the green light
PASS  armed-8: no --gold, and no --red
PASS  4:59.99 fits at --fs-clock  (63.3cqw)
PASS  the maze moves on ARMED
PASS  RUNNING shows the debug view, for now
PASS  the maze holds its frame while the solve runs
PASS  a resize during the solve redraws the held frame  (lit 0.17 before, 0.16 after)
PASS  the maze moves again once the solve is over
PASS  no uncaught errors

Screenshots in <repo>/test/browser/out/

screens: all checks passed
```

If `WebGL is available` fails, the Chrome binary has no software renderer: stop and ask the user.
If `roc-grotesk loads` fails, there is no internet access, or the Typekit kit refused
`localhost`: stop and ask the user. Every size check depends on the real font.

- [ ] **Step 5: Compare the PNGs with the approved mockups.** Start the visual companion so that
the mockups can be viewed:

```sh
~/.claude/skills/visual-companion/scripts/start-server.sh \
  --project-dir /home/noob_master/cube-tournament-display --session tournament-display
```

Open each PNG in `test/browser/out/` next to its mockup:

| PNG | Mockup |
|---|---|
| `attract.png` | `attract-DECIDED.html` |
| `standby-resultado.png` | `standby-09-final.html`, state 1 |
| `standby-all-dnf.png` | `standby-09-final.html`, the all-DNF variant |
| `standby-mezcla.png` | `standby-09-final.html`, state 2 |
| `armed-1.png` … `armed-8.png` | `armed-04-final.html`, moments 1–8 |

Every text, plate, divider and size should match. Three differences are expected:
- the maze is live, where the mockups use a still frame;
- the cube preview is csTimer's own drawing, not the mockup's stand-in;
- ATTRACT's plates put UCSD before UCE (decision 2).

Anything else that differs is a bug in Task 6: fix it there, not by changing a check here.

- [ ] **Step 6: Check that git ignores the screenshots**

Run: `git status --short test/browser/`
Expected: `?? test/browser/screens.js` and nothing else.

- [ ] **Step 7: Commit**

```bash
git add test/browser/screens.js package.json .gitignore
git commit -m "Add npm run screens: every designed state at 1080p, checked against the UI spec"
```

---

### Task 8: Documentation

**Files:**
- Modify: `README.md`, `ROADMAP.md`

- [ ] **Step 1: Update the README status.** Replace

```markdown
> **Status:** the engine runs: run loop, scoring, both StackMat drivers, persistence and window
> sync, with plain-text debug views. The designed screens come next.
> See [`docs/superpowers/specs/`](docs/superpowers/specs/) for the designs.
```

with

```markdown
> **Status:** the engine runs, and the audience window shows the designed ATTRACT, STANDBY and ARMED
> screens over the live maze. RUNNING, PENDING and the operator window still use plain-text debug
> views until their screens are designed.
> See [`docs/superpowers/specs/`](docs/superpowers/specs/) for the designs.
```

- [ ] **Step 2: Add the screens script to "Running it".** In `README.md`, replace

````markdown
npm run smoke        # both windows in headless Chrome, on the mock mat
npm start            # serves http://localhost:8080
```
````

with

````markdown
npm run smoke        # both windows in headless Chrome, on the mock mat
npm run screens      # the designed screens at 1080p, checked and saved to test/browser/out/
npm start            # serves http://localhost:8080
```

`npm run screens` also needs internet access, for the Adobe Fonts kit.
````

- [ ] **Step 3: Record what was built.** In `ROADMAP.md`, directly after the paragraph that starts
`**Built by the engine plan**`, add a blank line and then:

```markdown
**Built by the first screens plan** (`docs/superpowers/plans/2026-09-18-audience-screens.md`): row 6
for screens 1–3 (ATTRACT, STANDBY and ARMED) and row 7. RUNNING and PENDING show the debug view over
the frozen maze until screens 4 and 5 are designed. `npm run screens` renders every designed state
at 1080p, checks the UI spec's invariants and saves a PNG of each.
```

- [ ] **Step 4: Commit**

```bash
git add README.md ROADMAP.md
git commit -m "Document the audience screens and npm run screens"
```

---

## Running it

After Task 8:

```sh
npm test             # ℹ pass 138
npm run smoke        # smoke: all checks passed
npm run screens      # screens: all checks passed
npm start
```

To see it live, open `http://localhost:8080/?driver=mock` and `http://localhost:8080/audience.html`
in two windows. The audience shows ATTRACT. Press `N` in the operator window: the audience shows
Mezcla with the scramble. Click `reset`: ARMED, at a violet 15. Press `Space` and the countdown
starts. Click `cleanSolve`: the digits turn `--go` on the green light, then the debug view takes over
for RUNNING while the maze freezes. When the timer stops, press `Space` to accept. Mezcla returns for
attempt 2, and the maze moves again.

## Spec coverage

| Requirement | Where |
|---|---|
| Tokens: palette, `--go` reserved, one radius, five type sizes, weights, the font (UI spec §2.1–§2.2) | Task 6 (`css/tokens.css`, `css/audience.css`); Task 7 checks `--go`, `--gold` and `--red` |
| University plate, one component (§2.3) | Tasks 4, 6 |
| Mascot assets (§2.4) | Task 1 (ATTRACT's crop); Task 6 (the band mascot) |
| Maze: live on ATTRACT, STANDBY and ARMED; frozen during RUNNING; `createMaze({ canvas })` (§2.5, system design decision 7) | Tasks 3, 6; checked in Task 7 |
| Wording (§2.6) | Task 4 |
| ATTRACT: stack, hero, plates, footer (§3) | Tasks 1, 4, 6 |
| STANDBY: which state shows when (§4.1) | Task 4 (`screenFor`) |
| STANDBY layout: header, main column, standings, band, mascot (§4.2) | Tasks 4, 6 |
| Standings rule: ranked only, at most 8, leader, featured (§4.3) | Task 4, on top of the engine's `audienceStandings` |
| Snapshot `result` (§4.4) | Engine plan; rendered in Task 4 |
| Scramble and cube preview, as csTimer draws it (§4.5) | Tasks 2, 6 |
| STANDBY edge cases (§4.7) | Task 4 (tests); Task 7 |
| STANDBY visual checks: band height, one-line scramble, mascot in the band, no `--go` (§4.8) | Task 7 |
| ARMED states: the four rules, the eight moments (§5.2) | Task 4 (`armedDisplay`); Task 7 |
| ARMED layout; the header and band kept from Mezcla (§5.3) | Tasks 4, 6; checked in Task 7 |
| `inspectionMs` and `hands` in the snapshot (§5.4–§5.5) | Engine plan; rendered in Task 4 |
| ARMED edge cases (§5.7) | Task 4 (tests); decision 4 for a lost signal |
| ARMED visual checks: header and band as Mezcla, `4:59.99` fits, `--go` only on ready, `+2`/`DNF` white, no `--gold` or `--red` (§5.8) | Task 7 |
| Two windows; the audience holds no state; text as well as colour (system design §13) | Task 6 |

**Deferred, with reasons** (see Scope): screens 4–10 and their states, including the signal state
(decision 4); the motion signature; the operator panel's layout, which UI spec §4.6 and §5.6 list
requirements for.
