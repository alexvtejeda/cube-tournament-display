# Audience Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `subagent-driven-development` (recommended) or
> `executing-plans` to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Replace the audience window's plain-text debug view with the five designed screens
(ATTRACT, STANDBY with its Resultado and Mezcla states, ARMED, RUNNING and PENDING), drawn over the
live maze, which freezes from the solve until the verdict ends. Every screen change moves the
elements the two screens share.

**Architecture:** Two pure modules hold the rules, so every one of them runs under `node --test`.
`js/ui/audience-screens.js` turns a snapshot into HTML, and decides which screen shows and whether a
change between two snapshots animates. `js/ui/clock-display.js` decides what the clock and the
status line under it say on ARMED, RUNNING and PENDING, down to each frame of PENDING's verdict.
`js/ui/audience.js` puts the result on the page. Snapshots arrive about ten times a second, so it
rewrites an element only when that element's HTML changes, and it runs screen changes through the
browser's View Transitions API. The maze becomes `createMaze({ canvas })` with `pause` and `resume`.
A browser script renders every designed state from snapshots built by the real core, checks the UI
spec's invariants, and checks what each screen change moves.

**Tech Stack:** as in the engine plan: plain ES modules with no build step, and Node 24.2 or newer.
Sizes in CSS container units (`cqw`). The View Transitions API, in Chrome or Edge 111+. three.js,
through the vendored maze. roc-grotesk, from the Adobe Fonts kit. Headless Chrome over the DevTools
protocol for the browser scripts, with SwiftShader for WebGL.

**Specs:**
- `docs/superpowers/specs/2026-09-16-tournament-display-ui-design.md`: §2 (the shared system, with
  the motion signature and the screen changes), §3 ATTRACT, §4 STANDBY, §5 ARMED, §6 RUNNING and §7
  PENDING. The core parts of §4–§7 (standings, snapshot, inspection, the cutoff's format, the
  verdict) are built by the engine plan.
- `docs/superpowers/specs/2026-09-15-tournament-display-system-design.md`: decision 7 (the maze is
  frozen during RUNNING) and the constraints in §13.

**Amended on 2026-09-19**, after PENDING was designed (UI spec §9). RUNNING and PENDING joined the
plan (decision 3). The standings column always draws 8 slots. The who line and the dividers became
elements of their own, and every element a screen change moves carries a `view-transition-name`
(Task 4). The solo clock's rules have a module of their own (Task 5). Screen changes, standings
updates and the verdict's motion arrive in Task 9.

**This plan runs after the engine plan.** Every task here builds on files that
`docs/superpowers/plans/2026-09-18-tournament-engine.md` creates. Before starting, that plan must be
finished: `npm test` shows `ℹ pass 135`, and `npm run smoke` ends with `smoke: all checks passed`.

---

## Scope

This is the first screens plan. It covers roadmap Phase 2 row **6** for the five screens designed so
far (1 ATTRACT, 2 STANDBY, 3 ARMED, 4 RUNNING, 5 PENDING), and row **7**, the maze.

**Not in this plan:**
- screens 6–10 (RESULTS, NO SIGNAL, SIGNAL CHECK, SETUP, OPERATOR PANEL). They get a plan once they
  are designed;
- authorising the Typekit production domain;
- hardware validation (roadmap row 10).

The operator window is not touched.

## Decisions this plan makes

Decisions 1 and 2 were made with the owner on 2026-09-18, and the UI spec records them. Decision 3
answers the question UI spec §9 left to this plan. The rest are the smallest choices consistent with
the specs. Flag any you disagree with before execution starts.

| # | Decision | Why |
|---|---|---|
| 1 | ATTRACT keeps its approved face crop, restored from `1bbe2b4` as `assets/rootkitty-face-attract.svg`. The band mascot on the other screens keeps the new `assets/rootkitty-face.svg` | A re-tune against the new asset was tried at two widths, and the owner preferred the approved look. The values in UI spec §3.2 then apply unchanged (UI spec §2.4, §3.4) |
| 2 | ATTRACT's plates follow the roster in `config/event.json`, so UCSD comes before UCE | One order, the same as the turns (UI spec §3.3) |
| 3 | RUNNING and PENDING are in this plan, and the audience window's debug view goes | Both were designed on 2026-09-19 (UI spec §6–§7). PENDING's verdict ends in a screen change into STANDBY's screens (§2.7), so building the two apart would first mean building a stopgap between the designed screens and the debug view |
| 4 | A lost signal changes nothing on these five screens | NO SIGNAL is screen 7 (UI spec §4.7, §5.7, §6.7, §7.8). Snapshots follow the mat's packets, so a lost signal leaves the last screen up |
| 5 | Before the first snapshot arrives, the audience window shows the maze under ATTRACT's vignette, with nothing on it | The audience holds no state (system design §4), and ATTRACT's plates come from the snapshot |
| 6 | The stage is the largest 16:9 box the window holds, on `--bg-deep` | Every size is in `cqw` of a 16:9 canvas (UI spec §1). A 16:10 projector gets thin bars instead of a stretched layout |
| 7 | `js/scrambler.js` adds a `viewBox` to csTimer's preview SVG | The SVG has a size but no `viewBox`, so CSS cannot scale it into the 8.7cqw slot. The engine's debug view clips it for the same reason. The drawing itself is unchanged (UI spec §4.5) |
| 8 | `createMaze` returns `{ pause, resume }`, without the `destroy` that `vendor/PROVENANCE.md` planned | The audience window keeps one maze for as long as it is open |
| 9 | A resize while the maze is paused draws the held frame again | Resizing a canvas clears it. Dragging the audience window to the projector mid-solve (system design §4) would otherwise blank the maze until the verdict ends |
| 10 | Participant names are shown in capitals, through CSS `text-transform` | The mockups typed them in capitals. `config/participants.local.json` holds them as written |
| 11 | A featured university that leads keeps the leader style | UI spec §4.7. The mockup's CSS happened to let the featured bold win |
| 12 | Both browser scripts share `test/browser/harness.js`, which also turns on SwiftShader | `npm run screens` needs the same Chrome plumbing as the smoke test. With `--disable-gpu`, WebGL needs `--enable-unsafe-swiftshader` |
| 13 | What the clock and the status line say on ARMED, RUNNING and PENDING comes from `js/ui/clock-display.js`, which takes the time since the operator's key and returns the verdict's frame for that moment | Every rule, down to the +2's ticks and the redo's rewind, then runs under `node --test`. The page only paints what it is given |
| 14 | Between snapshots, the audience window keeps two things: the scene on screen, and when the verdict on screen began | UI spec §2.7 animates only some changes, and §7.2 plays a verdict only in a window that saw its review. Neither is event state: a reloaded window shows the current snapshot, landed |
| 15 | The solo clock and its status line are painted in place, never rebuilt | PENDING's colour changes and the verdict's tag are CSS transitions, which need the same element before and after |
| 16 | A label whose words change crossfades in place: its view-transition images keep their own size | UI spec §2.7 says the label's words crossfade in place. By default a view transition scales both images to the size in between, which would stretch RESULTADO into A CONTINUACIÓN |
| 17 | `npm run screens` records every view transition the page starts, and waits for each one to finish | It can then check what each change in UI spec §2.7's table moves, and no check or screenshot lands halfway through a change. Frames are slow under SwiftShader, so a fixed wait is not enough |

## Files

```
assets/rootkitty-face-attract.svg   restored: ATTRACT's approved face crop, from 1bbe2b4
vendor/hero-maze3d.js               modified: createMaze({ canvas }) → { pause, resume }
vendor/PROVENANCE.md                modified: the maze no longer tracks upstream
js/scrambler.js                     modified: the preview gets a viewBox
js/ui/audience-screens.js           new: snapshot → HTML for the five screens, and which changes animate; pure
js/ui/clock-display.js              new: the solo clock and status line, and the verdict's frames; pure
js/ui/audience.js                   replaced: puts the screens on the page; the maze, screen changes, the verdict
js/ui/audience-debug-view.js        deleted
audience.html                       replaced: the stage
css/tokens.css                      new: UI spec §2.1–§2.2
css/audience.css                    new: the screens, and their motion
test/vendor/maze.test.js            new
test/ui/audience-screens.test.js    new
test/ui/clock-display.test.js       new
test/scrambler.test.js              modified
test/browser/harness.js             new: the server, headless Chrome and the checks
test/browser/smoke.js               modified: uses the harness; the audience checks read the screens
test/browser/screens.js             new: npm run screens
package.json, .gitignore            modified: the screens script, and its output folder
README.md, ROADMAP.md               modified
```

`css/debug.css` stays, for the operator window.

## Conventions

- Everything in the engine plan's Conventions still applies. Use Node 24.2 or newer. Copy the code
  exactly: all of it was run, and passed, before this plan was written. Never edit
  `vendor/stackmat.js`. Stage files by name, and **never run `git add -A` or `git add .`** End every
  commit message with the trailer lines your session's instructions give.
- `npm run smoke` and `npm run screens` need Chrome: `google-chrome` on the `PATH`, or `CHROME` set to
  a Chrome binary. `npm run screens` also needs internet access, for the Adobe Fonts kit. If either
  is missing, stop and ask the user.
- Each browser script drives its own Chrome on a fixed debug port (9333 for the smoke test, 9334 for
  the screens), so never run two copies of the same script at once: they would share one Chrome and
  hang. `npm run screens` takes about two minutes, because SwiftShader draws the maze slowly.
- The approved mockups are in `.superpowers/brainstorm/tournament-display/content/`. That folder is
  gitignored and exists only on the owner's machine. Tasks 8 and 9 compare the screens against them.
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
importing the maze has no side effects. Task 8 checks the freeze in a real browser.

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
Expected: `ℹ pass 137`, `ℹ fail 0`.

- [ ] **Step 11: Commit**

```bash
git add vendor/hero-maze3d.js vendor/PROVENANCE.md test/vendor/maze.test.js
git commit -m "Refactor the maze into createMaze({ canvas }) with pause and resume"
```

---

### Task 4: The screens, as HTML

UI spec §2.5, §2.7 and §3–§7. Every rule that decides what a screen shows lives here, as pure
functions from snapshot data:
- which screen a snapshot shows, including PENDING's layout while its verdict is up, after the phase
  has already moved on (§4.1, §7.6);
- the Resultado and Mezcla figures;
- the standings column: always 8 slots, drawn as they were before the last decision until they
  update (§4.2–§4.3, §7.6);
- the solo layout's who line, which during a verdict names the attempt just decided (§7.2);
- the layout families, and whether going from one scene to the next is a screen change, a standings
  update or neither (§2.7);
- when the maze is frozen (§2.5).

Every element with an identity in §2.7 carries its `view-transition-name`. The dividers are elements
of their own, and each piece of text that moves is one box. Task 9 makes the changes move; until
then the names do nothing.

The tests build their snapshots with the real core, so they also check the snapshot fields the
screens depend on. Names come from a local file, so every piece of text is escaped. The scramble
preview is inserted as it is: it comes from the project's own worker.

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
  FRAME_HTML, attractHtml, changeBetween, countHtml, escapeHtml, mazeFrozen, sceneOf, scrambleHtml, screenFor,
  soloWhoHtml, standbyHtml,
} from '../../js/ui/audience-screens.js';
import { attempt, dnf, makeConfig } from '../helpers/fixtures.js';
import { apply, cmd, mat } from '../helpers/actions.js';

const config = makeConfig(); // alfa, beta, gamma, delta · 3 attempts
config.teams[1].participant = 'Ana <Pérez>';
const done = (id, bestMs) => [1, 2, 3].map((n) => attempt(id, n, bestMs + (n - 1) * 1000));
const withScramble = (state) => reduce(state, { type: 'scramble', seq: state.scrambleSeq, scramble: "R U R' <b>", svg: '<svg/>' });

const snapshotOf = (state, now = 0) => buildSnapshot(state, now);
const resultado = (attempts) => snapshotOf(createState(config, attempts));
const mezcla = (attempts = []) => snapshotOf(withScramble(reduce(createState(config, attempts), cmd('next'))));
const armed = (attempts = []) => apply(withScramble(reduce(createState(config, attempts), cmd('next'))), mat(packet('I', 0)));
const running = (attempts = []) => apply(armed(attempts), mat(packet(' ', 100, true)));
const pending = (attempts = [], ms = 12470) => apply(running(attempts), mat(packet('S', ms)));
// The name each element carries, in page order.
const names = (html) => [...html.matchAll(/view-transition-name:([\w-]+)/g)].map((m) => m[1]);

test('screenFor picks the screen from the phase, the result and the verdict (UI spec §4.1, §7.6)', () => {
  assert.equal(screenFor(resultado([])), 'attract');
  assert.equal(screenFor(resultado(done('alfa', 20000))), 'resultado');
  assert.equal(screenFor(mezcla()), 'mezcla');
  assert.equal(screenFor(snapshotOf(armed())), 'armed');
  assert.equal(screenFor(snapshotOf(running())), 'running');
  assert.equal(screenFor(snapshotOf(pending())), 'pending');
  const accepted = reduce(pending(), cmd('accept', 0));
  assert.equal(accepted.phase, 'SCRAMBLE');
  assert.equal(screenFor(snapshotOf(accepted, 2999)), 'pending');
  assert.equal(screenFor(snapshotOf(accepted, 3000)), 'mezcla');
  const last = reduce(pending([attempt('alfa', 1, 20000), attempt('alfa', 2, 21000)]), cmd('accept', 0));
  assert.equal(last.phase, 'STANDBY');
  assert.equal(screenFor(snapshotOf(last, 2999)), 'pending');
  assert.equal(screenFor(snapshotOf(last, 3000)), 'resultado');
});

test('a change moves shared elements between families, and within standby on a new screen or university (§2.7)', () => {
  const scene = (screen, featured = 'alfa', rows = '') => ({ screen, featured, rows: ['resultado', 'mezcla'].includes(screen) ? rows : null });
  assert.equal(changeBetween(null, scene('mezcla')), null);
  assert.equal(changeBetween(scene('attract', null), scene('mezcla')), 'screen');
  assert.equal(changeBetween(scene('mezcla'), scene('armed')), 'screen');
  assert.equal(changeBetween(scene('pending'), scene('resultado')), 'screen');
  assert.equal(changeBetween(scene('resultado'), scene('mezcla', 'beta')), 'screen');
  assert.equal(changeBetween(scene('mezcla'), scene('mezcla', 'beta')), 'screen');
  assert.equal(changeBetween(scene('mezcla', 'alfa', 'a'), scene('mezcla', 'alfa', 'b')), 'standings');
  assert.equal(changeBetween(scene('mezcla'), scene('mezcla')), null);
  assert.equal(changeBetween(scene('armed'), scene('running')), null);
  assert.equal(changeBetween(scene('running'), scene('pending')), null);
  assert.equal(changeBetween(scene('pending'), scene('armed')), null);
});

test('sceneOf features the university on screen and the standings the column draws', () => {
  assert.deepEqual(sceneOf(resultado(done('alfa', 20000))), { screen: 'resultado', featured: 'alfa', rows: 'alfa 20000' });
  assert.deepEqual(sceneOf(mezcla()), { screen: 'mezcla', featured: 'alfa', rows: '' });
  assert.deepEqual(sceneOf(snapshotOf(armed())), { screen: 'armed', featured: 'alfa', rows: null });
});

test('the maze is frozen from the solve until the verdict ends (§2.5)', () => {
  assert.equal(mazeFrozen(snapshotOf(armed())), false);
  assert.equal(mazeFrozen(snapshotOf(running())), true);
  assert.equal(mazeFrozen(snapshotOf(pending())), true);
  const accepted = reduce(pending(), cmd('accept', 0));
  assert.equal(mazeFrozen(snapshotOf(accepted, 2999)), true);
  assert.equal(mazeFrozen(snapshotOf(accepted, 3000)), false);
});

test('ATTRACT shows one plate per university, in roster order, none of them named', () => {
  const html = attractHtml(config.teams);
  const ids = [...html.matchAll(/universidades\/(\w+)\.png/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['alfa', 'beta', 'gamma', 'delta']);
  assert.match(html, /rootkitty-face-attract\.svg/);
  assert.deepEqual(names(html), ['logo', 'attract-plates', 'attract-footer']);
});

test('the frame names the logo and the band', () => {
  assert.deepEqual(names(FRAME_HTML), ['logo', 'band']);
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
  assert.match(html, />RESULTADO</);
  assert.match(html, /universidades\/beta\.png/);
  assert.match(html, /MEJOR TIEMPO<\/div><div class="big time"><span class="piece" style="view-transition-name:time">30\.00</);
  assert.match(html, /PUESTO <b>2<\/b>/);
  assert.match(html, /view-transition-name:name-beta">Ana &lt;Pérez&gt;</);
  assert.deepEqual(names(html).slice(0, 5), ['label', 'plate-beta', 'rule', 'time', 'name-beta']);
});

test('Resultado, all DNF: a dash and SIN TIEMPO VÁLIDO, no position, and no time to move into', () => {
  const html = standbyHtml(resultado([dnf('alfa', 1), dnf('alfa', 2), dnf('alfa', 3)]));
  assert.match(html, /<div class="big">—<\/div><div class="sub">SIN TIEMPO VÁLIDO</);
  assert.doesNotMatch(html, /PUESTO/);
  assert.ok(!names(html).includes('time'));
});

test('Mezcla: the next university and its attempt, with the name left out when there is none', () => {
  const html = standbyHtml(mezcla());
  assert.match(html, />A CONTINUACIÓN</);
  assert.match(html, /universidades\/alfa\.png/);
  assert.match(html, /INTENTO<\/span><\/div><div class="big"><span class="piece" style="view-transition-name:attempt-n">1<\/span><small class="piece" style="view-transition-name:attempt-of">DE 3<\/small>/);
  assert.doesNotMatch(html, /class="name"/);
  assert.deepEqual(names(html), ['label', 'plate-alfa', 'rule', 'attempt-word', 'attempt-n', 'attempt-of']);
});

test('standings: always 8 slots; with nothing ranked yet, all 8 are empty', () => {
  const html = standbyHtml(mezcla());
  assert.equal(html.match(/class="row empty"/g).length, 8);
  assert.match(html, /<div class="row empty"><span class="r">1<\/span><\/div>/);
  assert.match(html, /<div class="row empty"><span class="r">8<\/span><\/div>/);
  assert.doesNotMatch(html, /—|Aún no hay tiempos/);
});

test('standings: ranked universities fill the first slots, and the rest stay empty', () => {
  const html = standbyHtml(mezcla([...done('alfa', 20000), ...done('beta', 30000)]));
  assert.equal(html.match(/class="row( lead| now)*"/g).length, 2);
  assert.equal(html.match(/class="row empty"/g).length, 6);
  assert.match(html, /<div class="row empty"><span class="r">3<\/span><\/div>/);
});

test('standings: the leader row, and the featured university in bold when it is in the slice', () => {
  const html = standbyHtml(resultado([...done('alfa', 20000), ...done('beta', 30000)]));
  assert.match(html, /<div class="row lead"><span class="r">1<\/span><span class="u" style="view-transition-name:standing-name-alfa">ALFA<\/span><span class="t" style="view-transition-name:standing-time-alfa">20\.00<\/span><\/div>/);
  assert.match(html, /<div class="row now"><span class="r">2<\/span><span class="u" style="view-transition-name:standing-name-beta">BETA<\/span>/);
});

test('standings: a featured university outside the slice is not added', () => {
  const html = standbyHtml(mezcla([dnf('alfa', 1)]));
  assert.equal(html.match(/class="row empty"/g).length, 8);
});

test('standings: until they update after a verdict, the column draws them as they were before it', () => {
  const before = [...done('alfa', 20000), attempt('beta', 1, 30000), attempt('beta', 2, 31000)];
  const decided = reduce(pending(before, 10000), cmd('accept', 0));
  const waiting = standbyHtml(snapshotOf(decided, 3000));
  assert.match(waiting, /standing-name-alfa">ALFA<\/span><span class="t" style="view-transition-name:standing-time-alfa">20\.00/);
  assert.match(waiting, /standing-time-beta">30\.00/);
  const updated = standbyHtml(snapshotOf(decided, 4200));
  assert.match(updated, /<div class="row lead now"><span class="r">1<\/span><span class="u" style="view-transition-name:standing-name-beta">/);
  assert.match(updated, /standing-time-beta">10\.00/);
});

test('the solo who line names the attempt, and the participant when there is one', () => {
  const alfa = soloWhoHtml(snapshotOf(armed([attempt('alfa', 1, 20000)])));
  assert.match(alfa, /INTENTO<\/span> <b class="piece" style="view-transition-name:attempt-n">2<\/b> <span class="piece" style="view-transition-name:attempt-of">DE 3</);
  assert.doesNotMatch(alfa, /class="name"/);
  assert.deepEqual(names(alfa), ['plate-alfa', 'rule', 'attempt-word', 'attempt-n', 'attempt-of']);
  const beta = soloWhoHtml(snapshotOf(armed(done('alfa', 20000))));
  assert.match(beta, /universidades\/beta\.png/);
  assert.match(beta, /class="name"><span class="piece" style="view-transition-name:name-beta">Ana &lt;Pérez&gt;</);
});

test('during a verdict the who line shows the attempt just decided, even after the university is done', () => {
  const second = reduce(pending([attempt('alfa', 1, 20000)]), cmd('accept', 0));
  assert.equal(second.attemptNo, 3);
  assert.match(soloWhoHtml(snapshotOf(second)), /attempt-n">2</);
  const last = reduce(pending([attempt('alfa', 1, 20000), attempt('alfa', 2, 21000)]), cmd('dnf', 0));
  assert.equal(snapshotOf(last).competitor, null);
  assert.match(soloWhoHtml(snapshotOf(last)), /universidades\/alfa\.png[\s\S]*attempt-n">3</);
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
// The audience screens (UI spec §3–§7): ATTRACT, STANDBY's Resultado and Mezcla, and the solo layout
// that ARMED, RUNNING and PENDING share. Pure: every function takes snapshot data and returns HTML or
// plain values, so the rules run under node --test. js/ui/audience.js puts the HTML on the page, and
// js/ui/clock-display.js decides what the solo clock says.
import { formatMs } from '../core/format.js';

// Which screen a snapshot shows (UI spec §4.1, §7.6). PENDING's layout stays up for its verdict,
// after the phase has already moved on to SCRAMBLE or STANDBY.
export function screenFor({ phase, result, verdict }) {
  if (verdict !== null || phase === 'PENDING') return 'pending';
  if (phase === 'STANDBY') return result === null ? 'attract' : 'resultado';
  if (phase === 'SCRAMBLE') return 'mezcla';
  return phase === 'ARMED' ? 'armed' : 'running';
}

// The layout families of UI spec §2.7. A screen change moves shared elements when the family
// changes, or within standby when the screen or the featured university changes.
const FAMILY = { attract: 'attract', resultado: 'standby', mezcla: 'standby', armed: 'solo', running: 'solo', pending: 'solo' };
export const familyOf = (screen) => FAMILY[screen];

// The standings the column draws: as they were before the last decision until they update (§2.7).
const board = ({ standingsBefore, standings }) => standingsBefore ?? standings;

// What decides whether a change is animated: the screen, the university it features, and the
// standings the column shows.
export function sceneOf(snapshot) {
  const screen = screenFor(snapshot);
  const featured = screen === 'resultado' ? snapshot.result.teamId : snapshot.competitor?.id ?? null;
  const rows = familyOf(screen) === 'standby' ? board(snapshot).map((r) => `${r.teamId} ${r.bestMs}`).join(',') : null;
  return { screen, featured, rows };
}

// 'screen' for a screen change, 'standings' for a standings update on the same standby screen, or
// null when the page is patched in place (UI spec §2.7). The mat's changes within solo are instant.
export function changeBetween(from, to) {
  if (from === null) return null;
  const family = familyOf(to.screen);
  if (familyOf(from.screen) !== family) return 'screen';
  if (family !== 'standby') return null;
  if (from.screen !== to.screen || from.featured !== to.featured) return 'screen';
  return from.rows === to.rows ? null : 'standings';
}

// The maze stops when the solve starts and moves again with the change to Mezcla or Resultado,
// so nothing moves behind the verdict (UI spec §2.5).
export const mazeFrozen = ({ phase, verdict }) => phase === 'RUNNING' || phase === 'PENDING' || verdict !== null;

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);

// An element that keeps its identity across a screen change, and moves there (UI spec §2.7).
const vt = (name) => ` style="view-transition-name:${escapeHtml(name)}"`;

// The university plate (§2.3). Each logo already carries the university's name.
const plate = (team, named = true) =>
  `<div class="plate"${named ? vt(`plate-${team.id}`) : ''} data-team="${escapeHtml(team.id)}">`
  + `<img src="assets/universidades/${escapeHtml(team.id)}.png" alt="${escapeHtml(team.university)}"></div>`;

// The divider at the left edge of a text block. It is an element of its own, so it can move.
const RULE = `<i class="rule"${vt('rule')}></i>`;

// Left out when the roster has no name for the university (§4.2, §5.3).
const nameLine = (team) =>
  (team.participant ? `<div class="name"><span class="piece"${vt(`name-${team.id}`)}>${escapeHtml(team.participant)}</span></div>` : '');

// ATTRACT (§3). The plates follow the roster, the same order as the turns. None of them is named:
// js/ui/audience.js names the called university's plate just before ATTRACT leaves (§2.7).
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

// The frame every other screen shares (§4.2, §5.3). Only its slots change, so a screen change that
// stays inside it keeps the header and the band.
export const FRAME_HTML = `<div class="frame">
  <header class="hdr"><img src="assets/logo-ctf.svg" alt="CTF Interuniversitario 2026"${vt('logo')}><span data-slot="count"></span></header>
  <div class="body" data-slot="body"></div>
  <footer class="band"${vt('band')}>
    <div class="net" data-slot="net"></div>
    <div><div class="label">MEZCLA</div><div data-slot="scramble"></div></div>
    <img class="kitty" src="assets/rootkitty-face.svg" alt="">
  </footer>
</div>`;

export const countHtml = ({ startedCount, teams }) => `UNIVERSIDAD <b>${startedCount}</b> / ${teams.length}`;

// After a university's last attempt there is no next scramble yet (§4.2, §7.2).
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
    <div class="label"><span class="piece"${vt('label')}>${resultado ? 'RESULTADO' : 'A CONTINUACIÓN'}</span></div>
    <div class="who">${plate(team)}<div class="figure">${RULE}${resultado ? resultFigure(snapshot.result) : attemptFigure(snapshot)}</div></div>
    ${nameLine(team)}
  </div>
  <div class="side">
    <div class="label">CLASIFICACIÓN · MEJOR DE ${snapshot.attemptsPerCompetitor}</div>
    ${standingsHtml(snapshot, team.id)}
  </div>
</div>`;
}

// MEJOR TIEMPO carries the `time` identity, so PENDING's clock can move into it (§7.2).
function resultFigure({ bestMs, position }) {
  if (bestMs === null) return '<div class="label">MEJOR TIEMPO</div><div class="big">—</div><div class="sub">SIN TIEMPO VÁLIDO</div>';
  return `<div class="label">MEJOR TIEMPO</div><div class="big time"><span class="piece"${vt('time')}>${formatMs(bestMs)}</span></div>`
    + `<div class="sub">PUESTO <b>${position}</b></div>`;
}

const attemptFigure = ({ attemptNo, attemptsPerCompetitor }) =>
  `<div class="label"><span class="piece"${vt('attempt-word')}>INTENTO</span></div>`
  + `<div class="big"><span class="piece"${vt('attempt-n')}>${attemptNo}</span><small class="piece"${vt('attempt-of')}>DE ${attemptsPerCompetitor}</small></div>`;

// The standings column (§4.2–§4.3): always 8 slots. Ranked universities fill them from the top, at
// most 8 (the core's audience slice), and the rest are empty slots. The featured university is in
// bold when it is in the slice, and never added when it is not. A university's name and time are
// named, so they move to their new slot when the standings update; the rank and the divider belong to
// the slot and stay (§2.7).
const SLOTS = 8;
function standingsHtml(snapshot, featuredId) {
  const rows = board(snapshot);
  return Array.from({ length: SLOTS }, (_, i) => {
    const row = rows[i];
    if (row === undefined) return `<div class="row empty"><span class="r">${i + 1}</span></div>`;
    const team = snapshot.teams.find((t) => t.id === row.teamId);
    const classes = ['row', row.position === 1 && 'lead', row.teamId === featuredId && 'now'].filter(Boolean).join(' ');
    return `<div class="${classes}"><span class="r">${row.position}</span>`
      + `<span class="u"${vt(`standing-name-${team.id}`)}>${escapeHtml(team.university)}</span>`
      + `<span class="t"${vt(`standing-time-${team.id}`)}>${formatMs(row.bestMs)}</span></div>`;
  }).join('');
}

// The solo body: ARMED, RUNNING and PENDING (§5.3, §6.2, §7.4). The who line changes once per
// attempt, and js/ui/audience.js paints the clock and the status line in place, so that PENDING's
// colour changes and the verdict's tag can run as transitions.
export const SOLO_HTML = `<div class="solo">
  <div class="who" data-slot="who"></div>
  <div class="clock"><span class="digits"></span><span class="penalty"></span></div>
  <div class="status"></div>
</div>`;

// During a verdict the who line shows the attempt just decided, not the next one (§7.2). After a
// university's last attempt `competitor` is null, so the verdict names its university.
export function soloWhoHtml({ competitor, attemptNo, attemptsPerCompetitor, teams, verdict }) {
  const team = verdict ? teams.find((t) => t.id === verdict.teamId) : competitor;
  const attempt = verdict ? verdict.attempt : attemptNo;
  return `${plate(team)}<div class="txt">${RULE}`
    + `<div><span class="piece"${vt('attempt-word')}>INTENTO</span> <b class="piece"${vt('attempt-n')}>${attempt}</b>`
    + ` <span class="piece"${vt('attempt-of')}>DE ${attemptsPerCompetitor}</span></div>`
    + `${nameLine(team)}</div>`;
}
```

- [ ] **Step 4: Run the test**

Run: `node --test test/ui/audience-screens.test.js`
Expected: `ℹ pass 19`, `ℹ fail 0`.

- [ ] **Step 5: Run the suite**

Run: `npm test`
Expected: `ℹ pass 156`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add js/ui/audience-screens.js test/ui/audience-screens.test.js
git commit -m "Add the audience screens as pure HTML: ATTRACT, STANDBY and the solo layout"
```

---

### Task 5: The solo clock: ARMED, RUNNING and PENDING

UI spec §5.2, §6.1 and §7.1–§7.3. On the solo screens only the clock and the status line under it
change. `soloDisplay(snapshot, sinceKey)` returns what they say, and in which colour.

On PENDING's verdict it also takes the time since the operator's key, so each frame of the verdict
is a pure function of that time: the +2's tag and its two ticks, the DNF, and the redo's rewind
(§7.2). Given no time, it returns the landed frame, which a window that did not see the review shows
at once. The wording lives in one table (§7.3). `clockIsBest` decides whether the clock carries the
`time` identity into Resultado's MEJOR TIEMPO.

ARMED's four rules (§5.2) are here too, so the three screens' clocks share one shape.

**Files:**
- Create: `js/ui/clock-display.js`
- Test: `test/ui/clock-display.test.js`

- [ ] **Step 1: Write the failing test**, `test/ui/clock-display.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduce } from '../../js/core/run-state.js';
import { buildSnapshot } from '../../js/core/snapshot.js';
import { packet } from '../../js/drivers/scenarios.js';
import {
  VERDICT_LANDS_MS, armedDisplay, clockIsBest, reviewDisplay, runningDisplay, soloDisplay, verdictDisplay,
} from '../../js/ui/clock-display.js';
import { attempt, makeConfig } from '../helpers/fixtures.js';
import { apply, cmd, mat } from '../helpers/actions.js';

const config = makeConfig(); // alfa, beta, gamma, delta · 3 attempts · cutoff 5:00
const pending = (attempts = [], ms = 12470) => apply(
  createState(config, attempts), cmd('next'), mat(packet('I', 0)), mat(packet(' ', 100, true)), mat(packet('S', ms)));
const verdict = (kind, ms = 102180, reason = null) => ({ kind, teamId: 'alfa', attempt: 1, ms, reason });
const frame = (display) => [display.clock, display.clockTone, display.penalty?.text ?? null, display.penalty?.state ?? null];

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

test('RUNNING: the six moments of UI spec §6.1, red only strictly past the cutoff', () => {
  const moments = [
    [7830, '7.83', 'plain', 'LÍMITE 5:00'],
    [42180, '42.18', 'plain', 'LÍMITE 5:00'],
    [134300, '2:14.30', 'plain', 'LÍMITE 5:00'],
    [300000, '5:00.00', 'plain', 'LÍMITE 5:00'],
    [308520, '5:08.52', 'over', 'LÍMITE EXCEDIDO'],
    [192070, '3:12.07', 'plain', 'LÍMITE 5:00'],
  ];
  for (const [displayMs, clock, tone, status] of moments) {
    assert.deepEqual(runningDisplay({ displayMs, cutoffMs: 300000 }), { clock, clockTone: tone, status, statusTone: tone }, clock);
  }
  assert.equal(runningDisplay({ displayMs: 300010, cutoffMs: 300000 }).clockTone, 'over');
  assert.equal(runningDisplay({ displayMs: 1000, cutoffMs: 240000 }).status, 'LÍMITE 4:00');
});

test('the review: violet and EN REVISIÓN, or red past the cutoff (§7.1)', () => {
  assert.deepEqual(reviewDisplay({ displayMs: 102180, cutoffMs: 300000 }),
    { clock: '1:42.18', clockTone: 'provisional', status: 'EN REVISIÓN', statusTone: 'plain' });
  assert.deepEqual(reviewDisplay({ displayMs: 308520, cutoffMs: 300000 }),
    { clock: '5:08.52', clockTone: 'over', status: 'LÍMITE EXCEDIDO · EN REVISIÓN', statusTone: 'over' });
});

test('Space: the time turns official at the key', () => {
  for (const k of [0, 500, Infinity]) assert.deepEqual(frame(verdictDisplay(verdict('OK'), k)), ['1:42.18', 'plain', null, null]);
  assert.equal(verdictDisplay(verdict('OK')).status, 'TIEMPO VÁLIDO');
});

test('2: the tag enters, the seconds tick at +300 and +700 ms, and the time lands white (§7.2)', () => {
  const at = (k) => frame(verdictDisplay(verdict('+2'), k));
  assert.deepEqual(at(0), ['1:42.18', 'provisional', '+2', 'in']);
  assert.deepEqual(at(299), ['1:42.18', 'provisional', '+2', 'in']);
  assert.deepEqual(at(300), ['1:43.18', 'provisional', '+2', 'in']);
  assert.deepEqual(at(699), ['1:43.18', 'provisional', '+2', 'in']);
  assert.deepEqual(at(700), ['1:44.18', 'plain', '+2', 'out']);
  assert.deepEqual(at(Infinity), ['1:44.18', 'plain', '+2', 'out']);
  assert.equal(verdictDisplay(verdict('+2')).status, 'PENALIZACIÓN +2');
});

test('2 across a minute: the second tick gains the minutes, and the hundredths never change', () => {
  assert.equal(verdictDisplay(verdict('+2', 58500), 300).clock, '59.50');
  assert.equal(verdictDisplay(verdict('+2', 58500), 700).clock, '1:00.50');
});

test('D: the tag enters, and DNF replaces the time at +700 ms, with its reason (§7.2, §7.3)', () => {
  const at = (k) => frame(verdictDisplay(verdict('DNF'), k));
  assert.deepEqual(at(0), ['1:42.18', 'provisional', 'DNF', 'in']);
  assert.deepEqual(at(699), ['1:42.18', 'provisional', 'DNF', 'in']);
  assert.deepEqual(at(700), ['DNF', 'plain', 'DNF', 'out']);
  assert.equal(verdictDisplay(verdict('DNF')).status, 'INTENTO INVÁLIDO');
  assert.equal(verdictDisplay(verdict('DNF', 308520, 'CUTOFF')).status, 'LÍMITE EXCEDIDO');
  assert.equal(verdictDisplay(verdict('DNF', 9000, 'INSPECTION')).status, 'INSPECCIÓN EXCEDIDA');
});

test('R: the clock rewinds from +300 ms over 800 ms to 0.00, and stays violet', () => {
  const at = (k) => frame(verdictDisplay(verdict('REDO'), k));
  assert.deepEqual(at(0), ['1:42.18', 'provisional', null, null]);
  assert.deepEqual(at(300), ['1:42.18', 'provisional', null, null]);
  assert.deepEqual(at(700), ['12.77', 'provisional', null, null]);
  assert.deepEqual(at(1100), ['0.00', 'provisional', null, null]);
  assert.deepEqual(at(Infinity), ['0.00', 'provisional', null, null]);
  assert.equal(verdictDisplay(verdict('REDO')).status, 'ANULADO · SE REPITE');
  assert.equal(VERDICT_LANDS_MS, 1100);
});

test('soloDisplay: ARMED, RUNNING, the review, and the verdict once the phase has moved on', () => {
  const state = pending([], 12470);
  assert.equal(soloDisplay(buildSnapshot(apply(createState(config), cmd('next'), mat(packet('I', 0))), 0)).clock, '15');
  assert.equal(soloDisplay(buildSnapshot(apply(createState(config), cmd('next'), mat(packet('I', 0)), mat(packet(' ', 4200, true))), 0)).clock, '4.20');
  assert.deepEqual(frame(soloDisplay(buildSnapshot(state, 0))), ['12.47', 'provisional', null, null]);
  const decided = buildSnapshot(reduce(state, cmd('plus2', 0)), 100);
  assert.equal(decided.phase, 'SCRAMBLE');
  assert.deepEqual(frame(soloDisplay(decided, 0)), ['12.47', 'provisional', '+2', 'in']);
  assert.deepEqual(frame(soloDisplay(decided)), ['14.47', 'plain', '+2', 'out']);
});

test('the clock holds the best time when attempt 3 sets it, or ties it, with Space or 2 (§7.2)', () => {
  const two = [attempt('alfa', 1, 20000), attempt('alfa', 2, 25000)];
  const decide = (command, ms) => buildSnapshot(reduce(pending(two, ms), cmd(command, 0)), 0);
  assert.equal(clockIsBest(decide('accept', 18000)), true);
  assert.equal(clockIsBest(decide('accept', 20000)), true, 'a tie');
  assert.equal(clockIsBest(decide('plus2', 17000)), true);
  assert.equal(clockIsBest(decide('plus2', 19000)), false, '21.00 with the penalty');
  assert.equal(clockIsBest(decide('accept', 22000)), false);
  assert.equal(clockIsBest(decide('dnf', 18000)), false);
  assert.equal(clockIsBest(buildSnapshot(reduce(pending([], 18000), cmd('accept', 0)), 0)), false, 'attempt 1: no Resultado');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/ui/clock-display.test.js`
Expected: FAIL with `Cannot find module` for `js/ui/clock-display.js`.

- [ ] **Step 3: Write `js/ui/clock-display.js`**

```js
// What the solo screens' clock and status line say, and in which colour: ARMED's inspection (UI spec
// §5.2), RUNNING's solve (§6.1), and PENDING's review and verdict (§7.1–§7.3). Pure, so every rule
// runs under node --test; js/ui/audience.js paints the result.
//
// A display is { clock, clockTone, status, statusTone, penalty }:
//   clockTone   'plain' #fff · 'waiting' and 'provisional' --violet · 'go' --go · 'over' --red
//   statusTone  'plain' --violet · 'go' --go · 'over' --red
//   penalty     the verdict's tag: null, or { text: '+2' | 'DNF', state: 'in' | 'out' }
import { formatCutoff, formatMs } from '../core/format.js';
import { INSPECTION_DNF_MS, inspectionDisplay } from '../core/inspection.js';

// Every word these lines show, in one place, so the wording can change without touching the rules
// (UI spec §2.6, §7.3).
export const WORDS = {
  inspection: 'INSPECCIÓN',
  handsDown: 'MANOS EN POSICIÓN',
  ready: 'LISTO',
  inspectionOver: 'INSPECCIÓN EXCEDIDA',
  cutoff: (ms) => `LÍMITE ${formatCutoff(ms)}`,
  cutoffOver: 'LÍMITE EXCEDIDO',
  review: 'EN REVISIÓN',
  reviewOver: 'LÍMITE EXCEDIDO · EN REVISIÓN',
  OK: 'TIEMPO VÁLIDO',
  '+2': 'PENALIZACIÓN +2',
  DNF: 'INTENTO INVÁLIDO',
  REDO: 'ANULADO · SE REPITE',
};

// ARMED (§5.2). Four rules; in each, the first match wins.
export function armedDisplay({ inspectionMs, hands }) {
  const clock = inspectionMs === null ? '15' : inspectionDisplay(inspectionMs);
  const penalty = clock === '+2' || clock === 'DNF';
  let clockTone = 'plain';
  if (hands === 'ready' && !penalty) clockTone = 'go';
  else if (inspectionMs === null) clockTone = 'waiting';
  let status = WORDS.inspection;
  if (hands === 'ready') status = WORDS.ready;
  else if (hands === 'down') status = WORDS.handsDown;
  else if (inspectionMs > INSPECTION_DNF_MS) status = WORDS.inspectionOver;
  return { clock, clockTone, status, statusTone: hands === 'ready' ? 'go' : 'plain' };
}

// RUNNING (§6.1). Past the cutoff, strictly, the clock and the status line turn red together.
export function runningDisplay({ displayMs, cutoffMs }) {
  const over = displayMs > cutoffMs;
  return {
    clock: formatMs(displayMs),
    clockTone: over ? 'over' : 'plain',
    status: over ? WORDS.cutoffOver : WORDS.cutoff(cutoffMs),
    statusTone: over ? 'over' : 'plain',
  };
}

// PENDING's review (§7.1): the stopped time is provisional, so --violet, unless it is past the
// cutoff, where RUNNING's red holds.
export function reviewDisplay({ displayMs, cutoffMs }) {
  const over = displayMs > cutoffMs;
  return {
    clock: formatMs(displayMs),
    clockTone: over ? 'over' : 'provisional',
    status: over ? WORDS.reviewOver : WORDS.review,
    statusTone: over ? 'over' : 'plain',
  };
}

// The verdict's two schedule points (§7.2): the tag has entered and been read by TICK_MS, and the
// +2 and the DNF land at LAND_MS, one --t-step later. The redo rewinds over --t-long from TICK_MS.
const TICK_MS = 300;
const LAND_MS = 700;
const REWIND_MS = 800;
// --ease is cubic-bezier(.33, 1, .68, 1), the usual CSS stand-in for this curve.
const easeOutCubic = (p) => 1 - (1 - p) ** 3;

// A DNF names its reason when the room saw it coming (§7.3).
const DNF_WORDS = { CUTOFF: WORDS.cutoffOver, INSPECTION: WORDS.inspectionOver };

// The verdict `sinceKey` ms after the operator's key (§7.2). The clock becomes the result, and
// turns white when it lands; a redo never lands, and rewinds to the 0.00 the mat will show.
// sinceKey = Infinity gives the landed frame, which a window that did not see the review shows at
// once, as does every window under prefers-reduced-motion.
export function verdictDisplay({ kind, ms, reason }, sinceKey = Infinity) {
  const status = kind === 'DNF' ? DNF_WORDS[reason] ?? WORDS.DNF : WORDS[kind];
  const frame = (clock, landed, penalty = null) =>
    ({ clock, clockTone: landed ? 'plain' : 'provisional', status, statusTone: 'plain', penalty });
  switch (kind) {
    case 'OK':
      return frame(formatMs(ms), true);
    case '+2':
      if (sinceKey < TICK_MS) return frame(formatMs(ms), false, { text: '+2', state: 'in' });
      if (sinceKey < LAND_MS) return frame(formatMs(ms + 1000), false, { text: '+2', state: 'in' });
      return frame(formatMs(ms + 2000), true, { text: '+2', state: 'out' });
    case 'DNF':
      if (sinceKey < LAND_MS) return frame(formatMs(ms), false, { text: 'DNF', state: 'in' });
      return frame('DNF', true, { text: 'DNF', state: 'out' });
    default: { // 'REDO'
      const p = Math.min(1, Math.max(0, (sinceKey - TICK_MS) / REWIND_MS));
      return frame(formatMs(Math.round((ms * (1 - easeOutCubic(p))) / 10) * 10), false);
    }
  }
}

// How long a verdict takes to land, after which its frame no longer changes.
export const VERDICT_LANDS_MS = TICK_MS + REWIND_MS;

// Any solo screen. `sinceKey` matters only while a verdict is on screen.
export function soloDisplay(snapshot, sinceKey = Infinity) {
  if (snapshot.verdict !== null) return verdictDisplay(snapshot.verdict, sinceKey);
  if (snapshot.phase === 'ARMED') return { ...armedDisplay(snapshot), penalty: null };
  if (snapshot.phase === 'RUNNING') return { ...runningDisplay(snapshot), penalty: null };
  return { ...reviewDisplay(snapshot), penalty: null };
}

// Whether PENDING's clock holds the university's new best time, and so moves into Resultado's MEJOR
// TIEMPO when the verdict ends (§7.2). A tie counts: the number is the same.
export function clockIsBest({ verdict, result }) {
  if (verdict === null || result === null || result.teamId !== verdict.teamId) return false;
  if (verdict.kind !== 'OK' && verdict.kind !== '+2') return false;
  return verdict.ms + (verdict.kind === '+2' ? 2000 : 0) === result.bestMs;
}
```

- [ ] **Step 4: Run the test**

Run: `node --test test/ui/clock-display.test.js`
Expected: `ℹ pass 11`, `ℹ fail 0`.

- [ ] **Step 5: Run the suite**

Run: `npm test`
Expected: `ℹ pass 167`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add js/ui/clock-display.js test/ui/clock-display.test.js
git commit -m "Add the solo clock's rules: ARMED, RUNNING and PENDING's verdict"
```

---

### Task 6: A shared browser harness

Decision 12. This moves the smoke test's server, Chrome and check plumbing into
`test/browser/harness.js`, so Task 8's script can use it too. The smoke test's checks do not change
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
check('the audience is shown the verdict', (await snapshot(audience)).verdict?.kind === 'OK');
await sleep(2000);
const after = await snapshot(audience);
check('the verdict ends after 3 s, and the standings wait to update', after.verdict === null
  && after.standingsBefore?.length === 0 && after.standings.length === 1);
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
Expected: the same 23 `PASS` lines as the engine plan's Task 17, then `smoke: all checks passed`.
Nothing about the windows has changed yet.

- [ ] **Step 4: Commit**

```bash
git add test/browser/harness.js test/browser/smoke.js
git commit -m "Move the browser test plumbing into a shared harness"
```

---

### Task 7: The audience window

The designed screens replace the debug view, on all five screens. Every change is still a cut, and a
verdict shows its landed frame; Task 9 adds the motion. Eight smoke checks read the audience window,
and they change first so that they fail against the debug view.

- `css/tokens.css` holds UI spec §2.1–§2.2, the motion tokens included.
- `css/audience.css` transcribes §2.3 and §3–§7, with the reset the approved mockups were drawn
  under.
- `js/ui/audience.js` rewrites an element only when its HTML changes, and paints the solo clock in
  place (decision 15). It keeps one frame (header, body and band) across every screen but ATTRACT, so
  a mat reset swaps only the body (UI spec §5.3). The maze is frozen from the solve until the verdict
  ends (UI spec §2.5).
- The debug view it used to draw is deleted.

**Files:**
- Modify: `test/browser/smoke.js`
- Create: `css/tokens.css`, `css/audience.css`
- Modify: `audience.html`, `js/ui/audience.js` (both replaced whole)
- Delete: `js/ui/audience-debug-view.js`

- [ ] **Step 1: Point the smoke checks at the designed screens.** In `test/browser/smoke.js`, replace

```js
const snapshot = async (tab) => JSON.parse(await text(tab, 'snapshot'));
```

with

```js
const screen = (tab) => tab.evaluate("document.getElementById('stage').dataset.screen");
// The audience window loads the maze before it listens, so it can take a moment to draw at all.
const firstScreen = async (tab) => {
  for (let i = 0; i < 25 && (await screen(tab)) === 'waiting'; i += 1) await sleep(200);
  return screen(tab);
};
const soloClock = (tab) => tab.evaluate("document.querySelector('.solo .digits')?.textContent");
const soloStatus = (tab) => tab.evaluate("document.querySelector('.solo .status')?.textContent");
const filledSlots = (tab) => tab.evaluate("document.querySelectorAll('.side .row:not(.empty)').length");
```

replace

```js
check('an audience window opened late catches up', (await snapshot(audience)).phase === 'STANDBY');
```

with

```js
check('an audience window opened late catches up: ATTRACT', (await firstScreen(audience)) === 'attract');
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
check('the audience clock waits at 15', (await soloClock(audience)) === '15');
```

replace

```js
const countdown = await text(audience, 'clock');
```

with

```js
const countdown = await soloClock(audience);
```

replace

```js
check('the audience clock shows 8.00', (await text(audience, 'clock')) === '8.00');
```

with

```js
check('the audience shows PENDING at 8.00', (await screen(audience)) === 'pending' && (await soloClock(audience)) === '8.00');
```

and replace

```js
check('the audience is shown the verdict', (await snapshot(audience)).verdict?.kind === 'OK');
await sleep(2000);
const after = await snapshot(audience);
check('the verdict ends after 3 s, and the standings wait to update', after.verdict === null
  && after.standingsBefore?.length === 0 && after.standings.length === 1);
```

with

```js
check('the audience is shown the verdict', (await screen(audience)) === 'pending' && (await soloStatus(audience)) === 'TIEMPO VÁLIDO');
await sleep(2000);
check('the verdict ends after 3 s, and the standings wait to update', (await screen(audience)) === 'mezcla'
  && (await filledSlots(audience)) === 0);
await sleep(1000);
check('the standings update after the screen change', (await filledSlots(audience)) === 1);
```

The last check is new: the smoke test now has 24.

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run smoke`
Expected: exactly these eight fail, then `smoke: 8 failed`:

```
FAIL  an audience window opened late catches up: ATTRACT
FAIL  the audience shows Mezcla with the cube preview
FAIL  the audience clock waits at 15
FAIL  Space starts the countdown on the audience
FAIL  the audience shows PENDING at 8.00
FAIL  the audience is shown the verdict
FAIL  the verdict ends after 3 s, and the standings wait to update
FAIL  the standings update after the screen change
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
  --red: #ee2737;         /* a time past the cutoff: RUNNING, and PENDING's review of it */
  --go: #2ee6a0;          /* the mat's green light, and nothing else */
  --plate: #f7f7f7;
  --name: #e8e6ff;
  --empty-slot: rgba(171, 166, 247, .45); /* --violet at 45%: an empty standings slot, and nothing else */

  --radius: 1.26cqw;
  --fs-label: 1.05cqw;
  --fs-body: 1.38cqw;
  --fs-lead: 2.2cqw;
  --fs-hero: 4.4cqw;
  --fs-clock: 13.6cqw;

  /* The motion signature: one curve and three durations, and nothing else. */
  --ease: cubic-bezier(.33, 1, .68, 1);
  --t-short: 200ms; /* colour changes; the verdict's tag entering and leaving */
  --t-step: 400ms;  /* quick fades */
  --t-long: 800ms;  /* every screen change and standings update */

  /* The stage's width. View-transition pseudo-elements have no container, so cqw cannot reach them. */
  --stage-w: min(100vw, calc(100vh * 16 / 9));

  --font: "roc-grotesk-variable", "roc-grotesk", system-ui, sans-serif;
}
```

- [ ] **Step 4: Write `css/audience.css`**

```css
/* Audience window (UI spec §2–§7). Values are the spec's; the mockups it names are the visual
   reference. The mockups were drawn under this reset, so it stays. */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body { height: 100%; }
body { display: grid; place-items: center; overflow: hidden; background: var(--bg-deep); }
img { display: block; }

/* The 16:9 stage, as large as the window allows. */
.stage {
  position: relative;
  width: var(--stage-w);
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

/* Shared pieces (§2.3, §2.7) */
.plate {
  display: flex; align-items: center; justify-content: center;
  background: var(--plate); border: 1px solid var(--violet-deep); border-radius: var(--radius);
}
.plate img { width: 100%; height: auto; }
.label { font-size: var(--fs-label); letter-spacing: .24em; color: var(--violet); }
.name { font-size: var(--fs-body); letter-spacing: .14em; color: var(--violet); text-transform: uppercase; }
/* A piece of text with an identity of its own is one box, so it can move on a screen change. */
.piece { display: inline-block; }
/* The divider at a text block's left edge, drawn as an element so it can move. */
.rule { position: absolute; left: 0; top: 0; bottom: 0; width: 1px; background: var(--violet-deep); }

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
.standby .figure { position: relative; display: flex; flex-direction: column; justify-content: center; padding-left: 2.2cqw; }
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
/* An empty slot waits to be filled: its rank and a dashed divider, in the empty-slot colour. */
.row.empty {
  border-bottom-color: transparent;
  background: repeating-linear-gradient(90deg, var(--empty-slot) 0 .55cqw, transparent .55cqw .95cqw) left bottom / 100% 1px no-repeat;
}
.row.empty .r { color: var(--empty-slot); }

/* ARMED, RUNNING and PENDING (§5.3, §6.2, §7.4) */
.solo {
  height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: radial-gradient(52% 58% at 50% 55%, rgba(2,1,12,.72) 0%, rgba(2,1,12,.4) 55%, transparent 80%);
}
.solo .who { display: flex; align-items: center; gap: 1.6cqw; }
.solo .plate { width: 13cqw; padding: .75cqw 1.1cqw; }
.solo .txt {
  position: relative; padding-left: 1.6cqw;
  font-size: var(--fs-body); letter-spacing: .14em; color: var(--violet); line-height: 1.5;
}
.solo .txt b { color: #fff; font-weight: 800; }
.solo .clock {
  position: relative; margin-top: 1.5cqw; color: #fff;
  font-size: var(--fs-clock); font-weight: 800; line-height: .9; letter-spacing: -.02em;
  font-variant-numeric: tabular-nums;
}
.solo .digits { display: inline-block; }
.solo .status { margin-top: 1.2cqw; font-size: var(--fs-body); letter-spacing: .24em; color: var(--violet); }
.solo .clock.waiting, .solo .clock.provisional { color: var(--violet); }
.solo .clock.go, .solo .status.go { color: var(--go); }
.solo .clock.over, .solo .status.over { color: var(--red); }
/* The verdict's tag (§7.2): outside the flow at the clock's right edge, so the clock never
   re-centres because of it. Hidden until it enters; it leaves by sliding into the clock. */
.solo .penalty {
  position: absolute; left: 100%; top: .06em; margin-left: .12em;
  font-size: var(--fs-hero); letter-spacing: -.01em; color: #fff;
  opacity: 0; transform: translateY(.25em);
}
.solo .clock.penalty-in .penalty { opacity: 1; transform: none; }
.solo .clock.penalty-out .penalty { opacity: 0; transform: translateX(-.35em); }
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
    </main>
    <script type="module" src="js/ui/audience.js"></script>
  </body>
</html>
```

- [ ] **Step 6: Replace `js/ui/audience.js`** with

```js
// Audience window: renders the operator's latest snapshot and holds no state of its own. The maze runs
// under every screen and holds its last frame from the solve until the verdict ends (UI spec §2.5).
// Every change is a cut, and a verdict shows its landed frame.
import { createMaze } from '../../vendor/hero-maze3d.js';
import { createSubscriber } from '../core/channel.js';
import {
  FRAME_HTML, SOLO_HTML, attractHtml, countHtml, familyOf, mazeFrozen, scrambleHtml, screenFor, soloWhoHtml,
  standbyHtml,
} from './audience-screens.js';
import { soloDisplay } from './clock-display.js';

const stage = document.getElementById('stage');
const screen = document.getElementById('screen');
const maze = createMaze({ canvas: document.getElementById('maze') });

// Snapshots arrive about ten times a second. An element is rewritten only when its HTML changes,
// so nothing is rebuilt between changes and the images never flicker.
const written = new WeakMap();
function patch(element, html) {
  if (written.get(element) === html) return;
  element.innerHTML = html;
  written.set(element, html);
}
const slot = (key) => screen.querySelector(`[data-slot="${key}"]`);

function render(snapshot) {
  if (mazeFrozen(snapshot)) maze.pause();
  else maze.resume();
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

// The clock and the status line are painted in place, never rebuilt.
function paintClock(snapshot) {
  const display = soloDisplay(snapshot);
  const clock = screen.querySelector('.solo .clock');
  clock.className = `clock ${display.clockTone}${display.penalty ? ` penalty-${display.penalty.state}` : ''}`;
  const digits = clock.querySelector('.digits');
  if (digits.textContent !== display.clock) digits.textContent = display.clock;
  if (display.penalty) clock.querySelector('.penalty').textContent = display.penalty.text;
  const status = screen.querySelector('.solo .status');
  status.className = `status ${display.statusTone}`;
  if (status.textContent !== display.status) status.textContent = display.status;
}

createSubscriber(render);
```

- [ ] **Step 7: Delete the audience's debug view,** which nothing uses any more

Run: `git rm js/ui/audience-debug-view.js`

- [ ] **Step 8: Run the smoke test**

Run: `npm run smoke`
Expected: 24 `PASS` lines, then `smoke: all checks passed`. The eight from Step 2 now read:

```
PASS  an audience window opened late catches up: ATTRACT
PASS  the audience shows Mezcla with the cube preview
PASS  the audience clock waits at 15
PASS  Space starts the countdown on the audience  (14)
PASS  the audience shows PENDING at 8.00
PASS  the audience is shown the verdict
PASS  the verdict ends after 3 s, and the standings wait to update
PASS  the standings update after the screen change
```

- [ ] **Step 9: Run the suite**

Run: `npm test`
Expected: `ℹ pass 167`, `ℹ fail 0`.

- [ ] **Step 10: Commit** (Step 7 already staged the deletion)

```bash
git add test/browser/smoke.js css/tokens.css css/audience.css audience.html js/ui/audience.js
git commit -m "Draw the five designed screens in the audience window, over the maze"
```

---

### Task 8: Check the screens at 1080p

UI spec §4.8, §5.8, §6.8 and §7.9 ask for every designed state to be rendered at 1920×1080,
compared with its mockup, and checked against a list of invariants. This script does that. It builds
each state's snapshot with the real core, draws the cube preview with the real `cstimer_module`, and
posts the snapshot to the audience window over its BroadcastChannel, the way the operator window
does. It then checks the invariants and saves a PNG of each state. It also checks the maze (UI spec
§2.5): it moves on ARMED, holds its frame from the solve until the verdict ends, redraws that frame
after a resize, and moves again with the change to Mezcla.

The page cannot read pixels from its own WebGL canvas, so the maze checks compare screenshots. To
measure whether the maze is drawn, the page hides the screen for a moment and decodes a screenshot
of itself. The script also records every view transition the page starts (decision 17). Until Task
9 there are none, so for now that only makes `show` wait for nothing.

**Files:**
- Create: `test/browser/screens.js`
- Modify: `package.json` (add the `screens` script), `.gitignore`

- [ ] **Step 1: Write `test/browser/screens.js`**

```js
// Renders every designed audience state at 1920×1080 and checks the UI spec's invariants (§2.5,
// §4.8, §5.8, §6.8, §7.9). The snapshots come from the real core and the cube preview from the real
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

// The mockups' event: the real roster, three participant names, and the longest scramble a
// random-state 3×3 gets (21 moves).
const roster = JSON.parse(readFileSync(new URL('../../config/event.json', import.meta.url), 'utf8'));
const NAMES = { loyola: 'Ana Rodríguez', pucmm: 'Carla Fernández', uce: 'José Martínez' };
const config = { ...roster, teams: roster.teams.map((team) => ({ ...team, participant: NAMES[team.id] ?? '' })) };
// The same event with no names, for the moments where the roster has none.
const unnamed = { ...roster, teams: roster.teams.map((team) => ({ ...team, participant: '' })) };
const SCRAMBLE = "R' U2 B' L' F D' R2 B U' L F2 U2 R2 D B2 D' F2 L2 D2 F2 U";
// The next attempt's scramble, which the band shows from the operator's key (UI spec §7.2).
const NEXT = "F2 D' L2 U R2 B2 U' F2 L2 D R' B L' F D2 R U' B2 L F'";

const thread = new Worker(new URL('../helpers/cstimer-worker.cjs', import.meta.url));
const scrambler = createScrambler({
  postMessage: (message) => thread.postMessage(message),
  set onmessage(handler) { thread.on('message', (data) => handler({ data })); },
});
const { svg } = await scrambler.image(SCRAMBLE);
const { svg: nextSvg } = await scrambler.image(NEXT);
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
const next = (state) => withScramble(reduce(state, cmd('next')));

const resultado = createState(config, [...earlier, ...three('pucmm', 235100)]);
const resultadoDnf = createState(config, [...earlier, ...allDnf('pucmm')]);
const mezcla = next(resultado); // UCE, attempt 1
// standby-10-placeholder-rows.html: Loyola first, with nobody ranked; PUCMM fourth, with three ranked.
const mezclaEmpty = next(createState(config));
const mezclaPart = next(createState(config, [...three('loyola', 220100), ...three('intec', 84020), ...three('itla', 115880)]));
// UCE's first attempt was a DNF, so it is on attempt 2 and not in the standings (armed-04-final.html).
const uceFirst = [...earlier, ...three('pucmm', 235100), dnf('uce', 1)];
const armedIn = (cfg) => apply(next(createState(cfg, uceFirst)), mat(packet('I', 0)));
const armed = armedIn(config);
const inspecting = reduce(armed, cmd('startInspection', 0));

const at = (state, now) => buildSnapshot(state, now);
const hands = (header) => mat(packet(header, 0));
const VIOLET = 'rgb(171, 166, 247)';
const WHITE = 'rgb(255, 255, 255)';
const GO = 'rgb(46, 230, 160)';
const RED = 'rgb(238, 39, 55)';
const GOLD = 'rgb(212, 170, 6)';
// [name, snapshot, clock, clock colour, status, status colour] for the eight moments of UI spec §5.2.
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
// The six moments of UI spec §6.1, on UCE's attempt 2 (running-06-final.html).
const runningAt = (ms, state = armed) => at(apply(state, mat(packet(' ', ms, true))), 0);
const RUNNING = [
  ['running-1', runningAt(7830), '7.83', WHITE, 'LÍMITE 5:00', VIOLET],
  ['running-2', runningAt(42180), '42.18', WHITE, 'LÍMITE 5:00', VIOLET],
  ['running-3', runningAt(134300), '2:14.30', WHITE, 'LÍMITE 5:00', VIOLET],
  ['running-4', runningAt(300000), '5:00.00', WHITE, 'LÍMITE 5:00', VIOLET],
  ['running-5', runningAt(308520), '5:08.52', RED, 'LÍMITE EXCEDIDO', RED],
  ['running-6', runningAt(192070, armedIn(unnamed)), '3:12.07', WHITE, 'LÍMITE 5:00', VIOLET],
];
// PENDING (§7.1–§7.3), on the same attempt: the review, and each verdict's landed frame.
const stopAt = (ms, state = armed) => apply(state, mat(packet(' ', 100, true)), mat(packet('S', ms)));
const review = stopAt(102180);
const reviewOver = stopAt(308520);
const lateStart = apply(inspecting, mat(packet(' ', 100, true), 18000), mat(packet('S', 102180), 20000));
// A decision at 0, with the next scramble arrived; shown before VERDICT_MS has passed.
const decide = (state, command) => {
  const after = reduce(state, cmd(command, 0));
  return reduce(after, { type: 'scramble', seq: after.scrambleSeq, scramble: NEXT, svg: nextSvg });
};
const decided = (state, command) => at(decide(state, command), 0);
const PENDING = [
  ['pending-review', at(review, 0), '1:42.18', VIOLET, 'EN REVISIÓN', VIOLET],
  ['pending-review-over', at(reviewOver, 0), '5:08.52', RED, 'LÍMITE EXCEDIDO · EN REVISIÓN', RED],
  ['verdict-space', decided(review, 'accept'), '1:42.18', WHITE, 'TIEMPO VÁLIDO', VIOLET],
  ['verdict-2', decided(review, 'plus2'), '1:44.18', WHITE, 'PENALIZACIÓN +2', VIOLET],
  ['verdict-d', decided(review, 'dnf'), 'DNF', WHITE, 'INTENTO INVÁLIDO', VIOLET],
  ['verdict-d-cutoff', decided(reviewOver, 'dnf'), 'DNF', WHITE, 'LÍMITE EXCEDIDO', VIOLET],
  ['verdict-d-inspection', decided(lateStart, 'dnf'), 'DNF', WHITE, 'INSPECCIÓN EXCEDIDA', VIOLET],
  ['verdict-r', decided(review, 'redo'), '0.00', VIOLET, 'ANULADO · SE REPITE', VIOLET],
  ['pending-no-name', at(stopAt(102180, armedIn(unnamed)), 0), '1:42.18', VIOLET, 'EN REVISIÓN', VIOLET],
];

const { base, openTab, check, finish } = await startHarness(9334);
const tab = await openTab(`${base}/audience.html`);
await tab.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await sleep(1500);

const js = (expression) => tab.evaluate(expression);
// Every screen change the audience animates is recorded: the names on the page before it and after
// it, and the animations it runs (UI spec §2.7). `show` also waits for it to finish, so that no check
// or screenshot catches a change halfway.
await js(`(() => {
  window.changes = [];
  window.transitions = [];
  const start = document.startViewTransition?.bind(document);
  if (!start) return;
  const names = () => [...document.querySelectorAll('*')].map((el) => getComputedStyle(el).viewTransitionName).filter((n) => n !== 'none');
  document.startViewTransition = (update) => {
    const change = { before: names() };
    const transition = start(update);
    window.changes.push(change);
    window.transitions.push(transition);
    transition.ready.then(() => {
      change.after = names();
      change.animations = document.getAnimations().filter((a) => a.effect?.pseudoElement).map((a) => a.effect.pseudoElement + ' ' + a.animationName);
    }, () => {});
    return transition;
  };
})()`);
// Posts a snapshot the way the operator window does.
const post = (snapshot) => js(`(() => {
  const channel = new BroadcastChannel(${JSON.stringify(CHANNEL)});
  channel.postMessage(${JSON.stringify({ type: 'snapshot', snapshot })});
  channel.close();
})()`);
// Posts a snapshot, then waits for the audience to draw it, and for any screen change it animates to
// finish.
const show = async (snapshot, wait = 400) => {
  const started = await js('window.transitions.length');
  await post(snapshot);
  await sleep(wait);
  await js(`Promise.all(window.transitions.slice(${started}).map((t) => t.finished.catch(() => {})))`);
};
const save = async (name) => writeFileSync(new URL(`${name}.png`, OUT), await tab.screenshot());
const textOf = (selector) => js(`document.querySelector(${JSON.stringify(selector)})?.textContent`);
const colorOf = (selector) => js(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).color`);
// Every colour used for text, fills and borders on the visible screen.
const colorsUsed = () => js(`[...document.querySelectorAll('.screen *')].flatMap((el) => {
  const s = getComputedStyle(el);
  return [s.color, s.backgroundColor, s.borderTopColor, s.borderBottomColor, s.borderLeftColor, s.borderRightColor];
})`);
const bandHeight = () => js("document.querySelector('.band').getBoundingClientRect().height");
// Where the solo screens' shared pieces sit: the clock by its top edge and its centre.
const soloLayout = () => js(`(() => {
  const box = (selector) => { const r = document.querySelector(selector).getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); };
  const clock = document.querySelector('.solo .clock').getBoundingClientRect();
  return JSON.stringify({ hdr: box('.hdr'), who: box('.solo .who'), band: box('.band'), clock: [Math.round(clock.top), Math.round(clock.left + clock.width / 2)] });
})()`);
const slots = () => js("[...document.querySelectorAll('.side .row')].map((row) => row.classList.contains('empty') ? 'empty' : 'filled')");

check('WebGL is available, so the maze runs', await js("!!document.createElement('canvas').getContext('webgl')"));
check('roc-grotesk loads from Adobe Fonts', await js("document.fonts.load('800 20px roc-grotesk-variable').then(() => document.fonts.check('800 20px roc-grotesk-variable'))"));

// The audience window listens once its scripts have loaded, and a snapshot posted before then is
// lost, so the first one is posted until it is drawn.
for (let i = 0; i < 50 && (await js("document.getElementById('stage').dataset.screen")) === 'waiting'; i += 1) {
  await post(at(createState(config), 0));
  await sleep(200);
}

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
check('Resultado: ranked universities only, capped at 8', JSON.stringify(await slots()) === JSON.stringify(Array(8).fill('filled')));
check('Resultado: the leader row is --gold-text', (await colorOf('.row.lead .u')) === 'rgb(255, 234, 149)');
const resultadoBand = await bandHeight();
check('the band is 10.95cqw tall', Math.abs(resultadoBand / 19.2 - 10.95) < 0.05, `${(resultadoBand / 19.2).toFixed(2)}cqw`);

await show(at(resultadoDnf, 0), 1000);
await save('standby-all-dnf');
check('Resultado, all DNF: a dash and SIN TIEMPO VÁLIDO', (await textOf('.big')) === '—' && (await textOf('.sub')) === 'SIN TIEMPO VÁLIDO');
check('no — in the standings column', !(await textOf('.side')).includes('—'));

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

// The standings column always holds 8 slots, filled from the top (§4.2).
await show(at(mezclaEmpty, 0), 1000);
await save('standby-empty');
check('nobody ranked: 8 empty slots', JSON.stringify(await slots()) === JSON.stringify(Array(8).fill('empty')));
await show(at(mezclaPart, 0), 1000);
await save('standby-part');
check('three ranked: 3 filled slots, then 5 empty', JSON.stringify(await slots()) === JSON.stringify([...Array(3).fill('filled'), ...Array(5).fill('empty')]));
const rowHeights = await js("[...document.querySelectorAll('.side .row')].map((row) => row.getBoundingClientRect().height)");
check('an empty slot is as tall as a filled one', rowHeights[1] === rowHeights[3], `${rowHeights[1]}px and ${rowHeights[3]}px`);
check('an empty slot draws its rank in the empty-slot colour', (await colorOf('.row.empty .r')) === 'rgba(171, 166, 247, 0.45)');

// ARMED (§5). Resetting the mat swaps only the body: the header and band are the same elements.
await show(at(mezcla, 0), 1000);
await js("document.querySelector('.band').dataset.kept = 'yes'; document.querySelector('.hdr').dataset.kept = 'yes'");
await show(MOMENTS[0][1], 1000);
check('ARMED keeps the header and band of Mezcla', (await js("document.querySelector('.band').dataset.kept + document.querySelector('.hdr').dataset.kept")) === 'yesyes'
  && (await bandHeight()) === resultadoBand);
const soloMoment = async ([name, snapshot, clock, clockColor, status, statusColor], wait) => {
  await show(snapshot, wait);
  await save(name);
  const shown = [await textOf('.solo .digits'), await colorOf('.solo .clock'), await textOf('.solo .status'), await colorOf('.solo .status')];
  check(`${name}: ${clock} · ${status}`, JSON.stringify(shown) === JSON.stringify([clock, clockColor, status, statusColor]), shown.join(' · '));
  return colorsUsed();
};
for (const moment of MOMENTS) {
  const colors = await soloMoment(moment);
  check(`${moment[0]}: --go only on the green light`, colors.includes(GO) === (moment[1].hands === 'ready'));
  check(`${moment[0]}: no --gold, and no --red`, !colors.includes(GOLD) && !colors.includes(RED));
}
const armedLayout = await soloLayout();
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

// RUNNING (§6): ARMED's layout, with only the clock's text and colour and the status line changing.
for (const moment of RUNNING) {
  const colors = await soloMoment(moment);
  check(`${moment[0]}: no --go and no --gold`, !colors.includes(GO) && !colors.includes(GOLD));
  if (moment[0] !== 'running-6') check(`${moment[0]}: header, who line, band and clock where ARMED has them`, (await soloLayout()) === armedLayout);
}
await show(runningAt(300010));
check('RUNNING: 5:00.00 is white and 5:00.01 is red', (await colorOf('.solo .clock')) === RED);

// PENDING (§7): RUNNING's layout again, the review, and each verdict's landed frame.
for (const moment of PENDING) {
  const colors = await soloMoment(moment, 1500);
  const redAllowed = moment[0] === 'pending-review-over';
  check(`${moment[0]}: no --go and no --gold${redAllowed ? '' : ', and no --red'}`, !colors.includes(GO) && !colors.includes(GOLD) && (redAllowed || !colors.includes(RED)));
  if (moment[0] !== 'pending-no-name') check(`${moment[0]}: header, who line, band and clock where RUNNING has them`, (await soloLayout()) === armedLayout);
}
await show(decided(review, 'accept'));
check('the verdict shows the attempt it decided, and the next scramble', (await textOf('.solo .who b')) === '2' && (await textOf('.scr')) === NEXT);

// The maze (§2.5): live on ARMED; frozen from the solve until the verdict ends; live again after.
const mazeMoves = async () => {
  const before = await tab.screenshot();
  await sleep(700);
  return !before.equals(await tab.screenshot());
};
// The share of lit pixels in the bottom-right quarter of the maze, with the screen and its shade
// hidden for the moment so that only the maze is drawn. The page cannot read its own WebGL canvas, so
// it decodes a screenshot instead.
const mazeLit = async () => {
  await js("for (const el of document.querySelectorAll('.shade, .screen')) el.style.visibility = 'hidden'");
  const shot = await tab.screenshot();
  await js("for (const el of document.querySelectorAll('.shade, .screen')) el.style.visibility = ''");
  return js(`new Promise((resolve) => {
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
  image.src = 'data:image/png;base64,${shot.toString('base64')}';
})`);
};
await show(MOMENTS[1][1], 1000);
check('the maze moves on ARMED', await mazeMoves());
await show(RUNNING[0][1]);
check('the maze holds its frame while the solve runs', !(await mazeMoves()));
const litBefore = await mazeLit();
await tab.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
await sleep(600);
const litAfter = await mazeLit();
check('a resize during the solve redraws the held frame', litBefore > 0.1 && litAfter > litBefore / 2,
  `lit ${litBefore.toFixed(2)} before, ${litAfter.toFixed(2)} after`);
await tab.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await show(at(review, 0), 1000);
check('the maze holds its frame through the review', !(await mazeMoves()));
await show(decided(review, 'plus2'), 1500);
check('the maze holds its frame through the verdict', !(await mazeMoves()));
await show(at(decide(review, 'plus2'), 3000), 1000);
check('the maze moves again with the change to Mezcla', (await textOf('.figure .big')) === '3DE 3' && await mazeMoves());

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
PASS  no — in the standings column
PASS  Mezcla: UCE, attempt 1 of 3, with the name
PASS  the band is the same height in Resultado and Mezcla
PASS  a 21-move scramble stays on one line, clear of the mascot  (ends at 1303px, mascot at 1667px)
PASS  the mascot sits inside the band
PASS  no --go anywhere on STANDBY
PASS  nobody ranked: 8 empty slots
PASS  three ranked: 3 filled slots, then 5 empty
PASS  an empty slot is as tall as a filled one  (44.5625px and 44.5625px)
PASS  an empty slot draws its rank in the empty-slot colour
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
PASS  4:59.99 fits at --fs-clock  (48.9cqw)
PASS  running-1: 7.83 · LÍMITE 5:00  (7.83 · rgb(255, 255, 255) · LÍMITE 5:00 · rgb(171, 166, 247))
PASS  running-1: no --go and no --gold
PASS  running-1: header, who line, band and clock where ARMED has them
PASS  running-2: 42.18 · LÍMITE 5:00  (42.18 · rgb(255, 255, 255) · LÍMITE 5:00 · rgb(171, 166, 247))
PASS  running-2: no --go and no --gold
PASS  running-2: header, who line, band and clock where ARMED has them
PASS  running-3: 2:14.30 · LÍMITE 5:00  (2:14.30 · rgb(255, 255, 255) · LÍMITE 5:00 · rgb(171, 166, 247))
PASS  running-3: no --go and no --gold
PASS  running-3: header, who line, band and clock where ARMED has them
PASS  running-4: 5:00.00 · LÍMITE 5:00  (5:00.00 · rgb(255, 255, 255) · LÍMITE 5:00 · rgb(171, 166, 247))
PASS  running-4: no --go and no --gold
PASS  running-4: header, who line, band and clock where ARMED has them
PASS  running-5: 5:08.52 · LÍMITE EXCEDIDO  (5:08.52 · rgb(238, 39, 55) · LÍMITE EXCEDIDO · rgb(238, 39, 55))
PASS  running-5: no --go and no --gold
PASS  running-5: header, who line, band and clock where ARMED has them
PASS  running-6: 3:12.07 · LÍMITE 5:00  (3:12.07 · rgb(255, 255, 255) · LÍMITE 5:00 · rgb(171, 166, 247))
PASS  running-6: no --go and no --gold
PASS  RUNNING: 5:00.00 is white and 5:00.01 is red
PASS  pending-review: 1:42.18 · EN REVISIÓN  (1:42.18 · rgb(171, 166, 247) · EN REVISIÓN · rgb(171, 166, 247))
PASS  pending-review: no --go and no --gold, and no --red
PASS  pending-review: header, who line, band and clock where RUNNING has them
PASS  pending-review-over: 5:08.52 · LÍMITE EXCEDIDO · EN REVISIÓN  (5:08.52 · rgb(238, 39, 55) · LÍMITE EXCEDIDO · EN REVISIÓN · rgb(238, 39, 55))
PASS  pending-review-over: no --go and no --gold
PASS  pending-review-over: header, who line, band and clock where RUNNING has them
PASS  verdict-space: 1:42.18 · TIEMPO VÁLIDO  (1:42.18 · rgb(255, 255, 255) · TIEMPO VÁLIDO · rgb(171, 166, 247))
PASS  verdict-space: no --go and no --gold, and no --red
PASS  verdict-space: header, who line, band and clock where RUNNING has them
PASS  verdict-2: 1:44.18 · PENALIZACIÓN +2  (1:44.18 · rgb(255, 255, 255) · PENALIZACIÓN +2 · rgb(171, 166, 247))
PASS  verdict-2: no --go and no --gold, and no --red
PASS  verdict-2: header, who line, band and clock where RUNNING has them
PASS  verdict-d: DNF · INTENTO INVÁLIDO  (DNF · rgb(255, 255, 255) · INTENTO INVÁLIDO · rgb(171, 166, 247))
PASS  verdict-d: no --go and no --gold, and no --red
PASS  verdict-d: header, who line, band and clock where RUNNING has them
PASS  verdict-d-cutoff: DNF · LÍMITE EXCEDIDO  (DNF · rgb(255, 255, 255) · LÍMITE EXCEDIDO · rgb(171, 166, 247))
PASS  verdict-d-cutoff: no --go and no --gold, and no --red
PASS  verdict-d-cutoff: header, who line, band and clock where RUNNING has them
PASS  verdict-d-inspection: DNF · INSPECCIÓN EXCEDIDA  (DNF · rgb(255, 255, 255) · INSPECCIÓN EXCEDIDA · rgb(171, 166, 247))
PASS  verdict-d-inspection: no --go and no --gold, and no --red
PASS  verdict-d-inspection: header, who line, band and clock where RUNNING has them
PASS  verdict-r: 0.00 · ANULADO · SE REPITE  (0.00 · rgb(171, 166, 247) · ANULADO · SE REPITE · rgb(171, 166, 247))
PASS  verdict-r: no --go and no --gold, and no --red
PASS  verdict-r: header, who line, band and clock where RUNNING has them
PASS  pending-no-name: 1:42.18 · EN REVISIÓN  (1:42.18 · rgb(171, 166, 247) · EN REVISIÓN · rgb(171, 166, 247))
PASS  pending-no-name: no --go and no --gold, and no --red
PASS  the verdict shows the attempt it decided, and the next scramble
PASS  the maze moves on ARMED
PASS  the maze holds its frame while the solve runs
PASS  a resize during the solve redraws the held frame  (lit 0.50 before, 0.50 after)
PASS  the maze holds its frame through the review
PASS  the maze holds its frame through the verdict
PASS  the maze moves again with the change to Mezcla
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
| `standby-empty.png`, `standby-part.png` | `standby-10-placeholder-rows.html`, option B |
| `armed-1.png` … `armed-8.png` | `armed-04-final.html`, moments 1–8 |
| `running-1.png` … `running-6.png` | `running-06-final.html`, moments 1–6 |
| `pending-review.png`, `verdict-space.png`, `verdict-2.png`, `verdict-d.png`, `verdict-r.png` | `pending-16-final.html`, the four keys' landed frames |
| `pending-review-over.png`, `verdict-d-cutoff.png`, `verdict-d-inspection.png`, `pending-no-name.png` | `pending-16-final.html`, the stills |

Every text, plate, divider and size should match. These differences are expected:
- the maze is live, where the mockups use a still frame;
- the cube preview is csTimer's own drawing, not the mockup's stand-in;
- ATTRACT's plates put UCSD before UCE (decision 2);
- ARMED's clock is 13.6cqw, where `armed-04-final.html` still shows 17.6cqw (UI spec §5.9);
- the university, the attempt and the times can differ from a mockup's, where the fixtures follow
  another mockup's event.

Anything else that differs is a bug in Task 7: fix it there, not by changing a check here.

- [ ] **Step 6: Check that git ignores the screenshots**

Run: `git status --short test/browser/`
Expected: `?? test/browser/screens.js` and nothing else.

- [ ] **Step 7: Commit**

```bash
git add test/browser/screens.js package.json .gitignore
git commit -m "Add npm run screens: every designed state at 1080p, checked against the UI spec"
```

---

### Task 9: Motion: screen changes and the verdict

UI spec §2.2, §2.7 and §7.1–§7.2. This task makes the screen changes move, and the verdict play.

- **Screen changes.** Anything with the same identity on both screens moves to its new place and
  size over `--t-long`, and the rest fades.
- **When they run.** A change runs when the layout family changes, or within STANDBY's two screens
  when the screen or its university changes. The mat's changes within the solo screens stay instant.
  A standings update runs the same way.
- **Leaving ATTRACT.** The band rises from the bottom edge, and pushes the plates and the footer up.
- **PENDING.** The clock's colour changes and the verdict's tag become transitions, and a verdict
  plays its frames in the window that saw its review.
- **Cuts.** With reduced motion, without the View Transitions API, or while the window is hidden,
  all of it stays a cut. The smoke test's audience window sits behind the operator's, so it sees cuts.

The checks come first. `npm run screens` gains a section that plays the changes in §2.7's table, in
order, and checks what each one moves. It also samples the verdict's clock as the frames play.

**Files:**
- Modify: `test/browser/screens.js` (a section before its last check)
- Modify: `css/audience.css` (a section at the end)
- Modify: `js/ui/audience.js` (replaced whole)

- [ ] **Step 1: Write the motion checks.** In `test/browser/screens.js`, directly above the line

```js
check('no uncaught errors', tab.errors.length === 0, tab.errors.join(' | '));
```

add

```js
// Motion (UI spec §2.2, §2.7, §7.2).
const changeCount = () => js('window.changes.length');
// Shows `snapshot` and checks that exactly one screen change ran, and that every name in `names` was on
// both sides of it. Returns the change.
async function moves(label, snapshot, names) {
  const count = await changeCount();
  await show(snapshot);
  const ran = (await changeCount()) === count + 1;
  const change = ran ? await js('window.changes.at(-1)') : { before: [], after: [], animations: [] };
  const missing = names.filter((name) => !change.before.includes(name) || !change.after?.includes(name));
  check(label, ran && missing.length === 0, ran ? (missing.length ? `not on both sides: ${missing.join(', ')}` : '') : 'no screen change ran');
  return change;
}
async function cuts(label, snapshot, wait) {
  const before = await changeCount();
  await show(snapshot, wait);
  check(label, (await changeCount()) === before);
}
const clockNow = () => js("(() => { const clock = document.querySelector('.solo .clock'); return [clock.querySelector('.digits').textContent, getComputedStyle(clock).color, clock.className]; })()");
const digitsBox = () => js("JSON.stringify(document.querySelector('.solo .digits').getBoundingClientRect())");
const WHO = ['plate-uce', 'rule', 'attempt-word', 'attempt-n', 'attempt-of', 'name-uce', 'band', 'logo'];

await show(at(createState(config), 0), 1000);
const leaving = await moves('ATTRACT → Mezcla: the logo and the called plate move', at(mezclaEmpty, 0), ['logo', 'plate-loyola']);
check('ATTRACT → Mezcla: the band rises, and pushes the plates and the footer up', !leaving.before.includes('band')
  && ['::view-transition-new(band) band-rise', '::view-transition-old(attract-plates) attract-push', '::view-transition-old(attract-footer) attract-push']
    .every((animation) => leaving.animations.includes(animation)));
check("ATTRACT → Mezcla: only the called university's plate leaves the grid", leaving.before.filter((name) => name.startsWith('plate-')).length === 1);

await show(at(resultado, 0), 1000);
const called = await moves('Resultado → Mezcla (N): the label and the divider stay', at(mezcla, 0), ['label', 'rule', 'band', 'logo']);
check("Resultado → Mezcla: the next university's plate crossfades in", called.before.includes('plate-pucmm') && !called.after.includes('plate-pucmm')
  && called.after.includes('plate-uce') && !called.before.includes('plate-uce'));
await show(at(next(createState(config, uceFirst)), 0));
await moves('Mezcla → ARMED (the mat reset): the plate, the divider, INTENTO · n · DE 3 and the name move', at(armed, 0), WHO);
await cuts('ARMED → RUNNING: no screen change, the mat drives it', runningAt(4200));
await cuts('RUNNING → PENDING: no screen change', at(review, 0));
const stop = await js("(() => { const s = getComputedStyle(document.querySelector('.solo .clock')); return s.transitionProperty + ' ' + s.transitionDuration; })()");
check('PENDING: the stopped time turns violet over --t-short', stop === 'color 0.2s', stop);

// The verdict plays in the window that saw the review (§7.2).
const reviewBox = await digitsBox();
let before = await changeCount();
await post(decided(review, 'plus2'));
await sleep(150);
const entering = await clockNow();
const taggedBox = await digitsBox();
await sleep(350);
const ticked = await clockNow();
await sleep(600);
const landed = await clockNow();
check('2: the tag enters, and the time is still violet', entering[0] === '1:42.18' && entering[1] === VIOLET && entering[2].includes('penalty-in'), entering.join(' · '));
check('2: the tag never moves the clock', taggedBox === reviewBox);
check('2: the seconds tick', ticked[0] === '1:43.18', ticked[0]);
check('2: the time lands white, +2 applied, and the tag slides away', landed[0] === '1:44.18' && landed[1] === WHITE && landed[2].includes('penalty-out'), landed.join(' · '));
check('the verdict is no screen change', (await changeCount()) === before);
await moves('the verdict → Mezcla: the plate, the divider, INTENTO · n · DE 3 and the name move', at(decide(review, 'plus2'), 3000), WHO);
const update = await moves('the standings update: the universities move to their new slots', at(decide(review, 'plus2'), 4200),
  ['standing-name-intec', 'standing-time-intec', 'standing-name-itla', 'standing-time-itla']);
check('the standings update: UCE enters the board, and UNPHU leaves it', update.after.includes('standing-name-uce') && !update.before.includes('standing-name-uce')
  && update.before.includes('standing-name-unphu') && !update.after.includes('standing-name-unphu'));
const skipped = reduce(decide(review, 'plus2'), cmd('nextTeam'));
await moves('Mezcla → Mezcla (→): the label, the divider and INTENTO · n · DE 3 stay', at(withScramble(skipped), 4200),
  ['label', 'rule', 'attempt-word', 'attempt-n', 'attempt-of', 'band', 'logo']);
await moves('Mezcla → PENDING (U): the same moves, in reverse', at(reduce(skipped, cmd('undo')), 0), ['rule', 'attempt-word', 'attempt-n', 'attempt-of', 'band', 'logo']);

await post(decided(review, 'dnf'));
await sleep(400);
const dnfEntering = await clockNow();
await sleep(600);
const dnfLanded = await clockNow();
check('D: the tag enters over the time, and DNF replaces it', dnfEntering[0] === '1:42.18' && dnfEntering[2].includes('penalty-in')
  && dnfLanded[0] === 'DNF' && dnfLanded[1] === WHITE, `${dnfEntering[0]} → ${dnfLanded[0]}`);
await show(at(review, 0));
await post(decided(review, 'redo'));
await sleep(700);
const rewinding = await clockNow();
await sleep(600);
const rewound = await clockNow();
check('R: the clock rewinds to 0.00, and stays violet', !['1:42.18', '0.00'].includes(rewinding[0]) && rewound[0] === '0.00' && rewound[1] === VIOLET,
  `${rewinding[0]} → ${rewound[0]}`);
await cuts('the verdict → ARMED (a mat reset during it): no screen change', at(apply(decide(review, 'redo'), mat(packet('I', 0))), 0));

// Attempt 3: the clock moves into MEJOR TIEMPO only when it is the university's best time (§7.2).
const third = (ms) => stopAt(ms, apply(next(createState(config, [...uceFirst, attempt('uce', 2, 110000)])), mat(packet('I', 0))));
await show(at(third(102180), 0));
await show(decided(third(102180), 'accept'), 1500);
await moves('the verdict → Resultado: the best time moves into MEJOR TIEMPO', at(decide(third(102180), 'accept'), 3000), ['plate-uce', 'rule', 'name-uce', 'time', 'band', 'logo']);
await show(at(third(120000), 0));
await show(decided(third(120000), 'accept'), 1500);
const slower = await moves('the verdict → Resultado, not the best: the plate, the divider and the name move', at(decide(third(120000), 'accept'), 3000), ['plate-uce', 'rule', 'name-uce']);
check('not the best: the clock fades, and MEJOR TIEMPO fades in', !slower.before.includes('time') && slower.after.includes('time'));

// A window that did not see the review shows the landed frame at once (§7.2).
await show(at(armed, 0));
await show(decided(review, 'plus2'), 100);
check('a verdict this window did not see decided shows its landed frame at once', (await clockNow())[0] === '1:44.18');

// With reduced motion every change is a cut, and a verdict lands at once (§2.2).
await tab.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await show(at(review, 0));
await show(decided(review, 'plus2'), 100);
check('reduced motion: the verdict shows its landed frame at once', (await clockNow())[0] === '1:44.18');
await cuts('reduced motion: every screen change is a cut', at(decide(review, 'plus2'), 3000));
await tab.send('Emulation.setEmulatedMedia', { features: [] });

```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run screens`
Expected: every check from Task 8 still passes, then the new section reads as below, and the run ends
with `screens: 19 failed`. The nine new checks that pass are true of a window without motion too.

```
FAIL  ATTRACT → Mezcla: the logo and the called plate move  (no screen change ran)
FAIL  ATTRACT → Mezcla: the band rises, and pushes the plates and the footer up
FAIL  ATTRACT → Mezcla: only the called university's plate leaves the grid
FAIL  Resultado → Mezcla (N): the label and the divider stay  (no screen change ran)
FAIL  Resultado → Mezcla: the next university's plate crossfades in
FAIL  Mezcla → ARMED (the mat reset): the plate, the divider, INTENTO · n · DE 3 and the name move  (no screen change ran)
PASS  ARMED → RUNNING: no screen change, the mat drives it
PASS  RUNNING → PENDING: no screen change
FAIL  PENDING: the stopped time turns violet over --t-short  (all 0s)
FAIL  2: the tag enters, and the time is still violet  (1:44.18 · rgb(255, 255, 255) · clock plain penalty-out)
PASS  2: the tag never moves the clock
FAIL  2: the seconds tick  (1:44.18)
PASS  2: the time lands white, +2 applied, and the tag slides away  (1:44.18 · rgb(255, 255, 255) · clock plain penalty-out)
PASS  the verdict is no screen change
FAIL  the verdict → Mezcla: the plate, the divider, INTENTO · n · DE 3 and the name move  (no screen change ran)
FAIL  the standings update: the universities move to their new slots  (no screen change ran)
FAIL  the standings update: UCE enters the board, and UNPHU leaves it
FAIL  Mezcla → Mezcla (→): the label, the divider and INTENTO · n · DE 3 stay  (no screen change ran)
FAIL  Mezcla → PENDING (U): the same moves, in reverse  (no screen change ran)
FAIL  D: the tag enters over the time, and DNF replaces it  (DNF → DNF)
FAIL  R: the clock rewinds to 0.00, and stays violet  (0.00 → 0.00)
PASS  the verdict → ARMED (a mat reset during it): no screen change
FAIL  the verdict → Resultado: the best time moves into MEJOR TIEMPO  (no screen change ran)
FAIL  the verdict → Resultado, not the best: the plate, the divider and the name move  (no screen change ran)
FAIL  not the best: the clock fades, and MEJOR TIEMPO fades in
PASS  a verdict this window did not see decided shows its landed frame at once
PASS  reduced motion: the verdict shows its landed frame at once
PASS  reduced motion: every screen change is a cut
PASS  no uncaught errors

Screenshots in <repo>/test/browser/out/

screens: 19 failed
```

- [ ] **Step 3: Add the motion to the stylesheet.** Append to `css/audience.css`:

```css

/* Motion (§2.2, §2.7). With reduced motion none of it runs: js/ui/audience.js starts no view
   transition, and a verdict shows its landed frame at once. */
@media (prefers-reduced-motion: no-preference) {
  /* PENDING: the clock's colour changes, and the verdict's tag entering and leaving (§7.1–§7.2). */
  .solo.pending .clock { transition: color var(--t-short) var(--ease); }
  .solo.pending .penalty { transition: opacity var(--t-short) var(--ease), transform var(--t-short) var(--ease); }
}
/* A screen change: what has the same identity on both screens moves there, and the rest fades. */
::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) {
  animation-duration: var(--t-long);
  animation-timing-function: var(--ease);
}
/* A label whose words change crossfades in place instead of stretching. */
::view-transition-old(label), ::view-transition-new(label) { inline-size: auto; }
/* Leaving ATTRACT, the band rises from the stage's bottom edge... */
::view-transition-group(band), ::view-transition-image-pair(band) { overflow: clip; }
::view-transition-new(band):only-child { animation-name: band-rise; }
@keyframes band-rise { from { transform: translateY(100%); } }
/* ...and pushes the plates and the footer up by its height, fading them out over the first --t-step. */
::view-transition-old(attract-plates), ::view-transition-old(attract-footer) { animation-name: attract-push; }
@keyframes attract-push {
  50% { opacity: 0; }
  to { opacity: 0; transform: translateY(calc(-.1095 * var(--stage-w))); }
}
```

- [ ] **Step 4: Replace `js/ui/audience.js`** with

```js
// Audience window: renders the operator's latest snapshot. It holds no state of the event, only what
// it needs to animate from one snapshot to the next: the scene on screen, and when a verdict began
// (UI spec §2.7, §7.2). The maze runs under every screen and holds its last frame from the solve
// until the verdict ends (§2.5).
import { createMaze } from '../../vendor/hero-maze3d.js';
import { createSubscriber } from '../core/channel.js';
import {
  FRAME_HTML, SOLO_HTML, attractHtml, changeBetween, countHtml, familyOf, mazeFrozen, sceneOf, scrambleHtml,
  screenFor, soloWhoHtml, standbyHtml,
} from './audience-screens.js';
import { VERDICT_LANDS_MS, clockIsBest, soloDisplay } from './clock-display.js';

const stage = document.getElementById('stage');
const screen = document.getElementById('screen');
const maze = createMaze({ canvas: document.getElementById('maze') });
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Screen changes move shared elements with the View Transitions API. Without it, with reduced
// motion, or while the window is hidden, every change is a cut.
const canAnimate = () => typeof document.startViewTransition === 'function' && !reducedMotion.matches && !document.hidden;

// Snapshots arrive about ten times a second. An element is rewritten only when its HTML changes,
// so nothing is rebuilt between changes and the images never flicker.
const written = new WeakMap();
function patch(element, html) {
  if (written.get(element) === html) return;
  element.innerHTML = html;
  written.set(element, html);
}
const slot = (key) => screen.querySelector(`[data-slot="${key}"]`);

let latest = null;          // the newest snapshot
let shown = null;           // the scene on screen, from sceneOf()
let changePending = false;  // a view transition has captured the old screen and not yet drawn the new

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

// ATTRACT names only the called university's plate, just before it leaves, so that plate moves into
// Mezcla's while the other twelve go with the grid (UI spec §2.7).
function nameCalledPlate(teamId) {
  const plate = screen.querySelector(`.attract .plate[data-team="${teamId}"]`);
  if (plate) plate.style.viewTransitionName = `plate-${teamId}`;
}

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

// A verdict plays from the moment it arrives if this window saw the review it decides. Otherwise it
// shows its landed frame at once, as it does under reduced motion (UI spec §7.2).
let review = null;  // the review on screen: `${teamId} ${attempt}`
let played = null;  // the verdict on screen: when it began, or -Infinity for its landed frame
function followVerdict({ phase, competitor, attemptNo, verdict }) {
  if (phase === 'PENDING') {
    review = `${competitor.id} ${attemptNo}`;
    played = null;
  } else if (verdict === null) {
    review = null;
    played = null;
  } else if (played === null) {
    const animate = review === `${verdict.teamId} ${verdict.attempt}` && canAnimate();
    played = animate ? performance.now() : -Infinity;
    review = null;
    if (animate) requestAnimationFrame(playVerdict);
  }
}

// Between snapshots the verdict is repainted every frame until it lands, so the rewind runs smoothly.
function playVerdict() {
  if (played === null || changePending || familyOf(screenFor(latest)) !== 'solo') return;
  paintClock(latest);
  if (performance.now() - played < VERDICT_LANDS_MS) requestAnimationFrame(playVerdict);
}

// The clock and the status line are painted in place, never rebuilt, so that PENDING's colour
// changes and the verdict's tag run as CSS transitions (UI spec §7.1–§7.2).
function paintClock(snapshot) {
  const display = soloDisplay(snapshot, played === null ? Infinity : performance.now() - played);
  const solo = screen.querySelector('.solo');
  solo.classList.toggle('pending', snapshot.phase === 'PENDING' || snapshot.verdict !== null);
  const clock = solo.querySelector('.clock');
  clock.className = `clock ${display.clockTone}${display.penalty ? ` penalty-${display.penalty.state}` : ''}`;
  const digits = clock.querySelector('.digits');
  if (digits.textContent !== display.clock) digits.textContent = display.clock;
  // PENDING's clock moves into Resultado's MEJOR TIEMPO when it holds the best time (§7.2).
  digits.style.viewTransitionName = clockIsBest(snapshot) ? 'time' : '';
  if (display.penalty) clock.querySelector('.penalty').textContent = display.penalty.text;
  const status = solo.querySelector('.status');
  status.className = `status ${display.statusTone}`;
  if (status.textContent !== display.status) status.textContent = display.status;
}

createSubscriber(render);
```

- [ ] **Step 5: Run the screens check**

Run: `npm run screens`
Expected: every check passes, and the run ends with `screens: all checks passed`. The new section
reads as below. The rewind's middle figure differs from run to run.

```
PASS  ATTRACT → Mezcla: the logo and the called plate move
PASS  ATTRACT → Mezcla: the band rises, and pushes the plates and the footer up
PASS  ATTRACT → Mezcla: only the called university's plate leaves the grid
PASS  Resultado → Mezcla (N): the label and the divider stay
PASS  Resultado → Mezcla: the next university's plate crossfades in
PASS  Mezcla → ARMED (the mat reset): the plate, the divider, INTENTO · n · DE 3 and the name move
PASS  ARMED → RUNNING: no screen change, the mat drives it
PASS  RUNNING → PENDING: no screen change
PASS  PENDING: the stopped time turns violet over --t-short  (color 0.2s)
PASS  2: the tag enters, and the time is still violet  (1:42.18 · rgb(171, 166, 247) · clock provisional penalty-in)
PASS  2: the tag never moves the clock
PASS  2: the seconds tick  (1:43.18)
PASS  2: the time lands white, +2 applied, and the tag slides away  (1:44.18 · rgb(255, 255, 255) · clock plain penalty-out)
PASS  the verdict is no screen change
PASS  the verdict → Mezcla: the plate, the divider, INTENTO · n · DE 3 and the name move
PASS  the standings update: the universities move to their new slots
PASS  the standings update: UCE enters the board, and UNPHU leaves it
PASS  Mezcla → Mezcla (→): the label, the divider and INTENTO · n · DE 3 stay
PASS  Mezcla → PENDING (U): the same moves, in reverse
PASS  D: the tag enters over the time, and DNF replaces it  (1:42.18 → DNF)
PASS  R: the clock rewinds to 0.00, and stays violet  (12.72 → 0.00)
PASS  the verdict → ARMED (a mat reset during it): no screen change
PASS  the verdict → Resultado: the best time moves into MEJOR TIEMPO
PASS  the verdict → Resultado, not the best: the plate, the divider and the name move
PASS  not the best: the clock fades, and MEJOR TIEMPO fades in
PASS  a verdict this window did not see decided shows its landed frame at once
PASS  reduced motion: the verdict shows its landed frame at once
PASS  reduced motion: every screen change is a cut
PASS  no uncaught errors

Screenshots in <repo>/test/browser/out/

screens: all checks passed
```

- [ ] **Step 6: Run the smoke test and the suite**

Run: `npm run smoke`
Expected: the same 24 `PASS` lines as Task 7, then `smoke: all checks passed`.

Run: `npm test`
Expected: `ℹ pass 167`, `ℹ fail 0`.

- [ ] **Step 7: Compare the motion with the approved mockups.** Motion was decided from live,
looping mockups, so compare it the same way. Start the visual companion (Task 8, Step 5) and
`npm start`. Open `http://localhost:8080/?driver=mock` and `http://localhost:8080/audience.html` in
two windows, both visible, the audience one in Chrome or Edge, and play an attempt:

| Do this | Compare with |
|---|---|
| `N` on ATTRACT | `pending-13-attract-final.html` |
| `reset`, `Space`, `cleanSolve`, then `2` | `pending-16-final.html`, the `2` stage: the review, the tag, the ticks, the move to Mezcla |
| wait 1.2 s after Mezcla appears | `standby-11-board-fill.html`: the standings update |
| the rest of the university's attempts, the last with `Space` | `pending-09-best.html`: the time moves into MEJOR TIEMPO |
| `N`, then `←`/`→` | `pending-08-all-transitions.html` |

The motion should match: the same elements move, over the same times, on the same curve. Anything
else is a bug in this task.

- [ ] **Step 8: Commit**

```bash
git add test/browser/screens.js css/audience.css js/ui/audience.js
git commit -m "Move shared elements across screen changes, and play PENDING's verdict"
```

---

### Task 10: Documentation

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
> **Status:** the engine runs, and the audience window shows the designed ATTRACT, STANDBY, ARMED,
> RUNNING and PENDING screens over the live maze, moving what they share from one screen to the
> next. The operator window still uses a plain-text debug view until its screen is designed.
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

`npm run screens` also needs internet access, for the Adobe Fonts kit. The audience window's screen
changes need Chrome or Edge 111 or newer; other browsers cut between screens.
````

- [ ] **Step 3: Record what was built.** In `ROADMAP.md`, directly after the paragraph that starts
`**Built by the engine plan**`, add a blank line and then:

```markdown
**Built by the first screens plan** (`docs/superpowers/plans/2026-09-18-audience-screens.md`): row 6
for screens 1–5 (ATTRACT, STANDBY, ARMED, RUNNING and PENDING), with the screen changes of UI spec
§2.7, and row 7. `npm run screens` renders every designed state at 1080p, checks the UI spec's
invariants and what each screen change moves, and saves a PNG of each state.
```

- [ ] **Step 4: Commit**

```bash
git add README.md ROADMAP.md
git commit -m "Document the audience screens and npm run screens"
```

---

## Running it

After Task 10:

```sh
npm test             # ℹ pass 167
npm run smoke        # smoke: all checks passed
npm run screens      # screens: all checks passed
npm start
```

To see it live, open `http://localhost:8080/?driver=mock` and `http://localhost:8080/audience.html`
in two windows, both visible. The audience shows ATTRACT. Press `N` in the operator window: the logo
shrinks into the header, the called university's plate moves into Mezcla, and the band rises with the
scramble. Click `reset`: the plate and the attempt move into ARMED, at a violet 15. Press `Space` and
the countdown starts. Click `cleanSolve`: the digits turn `--go` on the green light, then RUNNING's
clock counts while the maze freezes. When the timer stops, the time turns violet under EN REVISIÓN.
Press `2`: the `+2` tag appears, the seconds tick twice, and the time lands white. Three seconds
after the key, the attempt moves into Mezcla for attempt 2, and a moment later the university enters
the standings. The maze moves again.

## Spec coverage

| Requirement | Where |
|---|---|
| Tokens: palette, `--go` reserved, one radius, five type sizes, weights, the font (UI spec §2.1–§2.2) | Task 7 (`css/tokens.css`, `css/audience.css`); Task 8 checks `--go`, `--gold` and `--red` |
| The motion signature: one curve, three durations; the mat's changes instant; reduced motion gives cuts (§2.2) | Task 7 (tokens); Task 9; checked in Task 9 |
| University plate, one component (§2.3) | Tasks 4, 7 |
| Mascot assets (§2.4) | Task 1 (ATTRACT's crop); Task 7 (the band mascot) |
| Maze: live on the idle screens; frozen from the solve until the verdict ends; `createMaze({ canvas })` (§2.5, system design decision 7) | Tasks 3, 4 (`mazeFrozen`), 7; checked in Task 8 |
| Wording (§2.6, §7.3) | Tasks 4, 5 (`WORDS`) |
| Screen changes: identities, families, leaving ATTRACT, standings updates (§2.7) | Task 4 (the names, `changeBetween`); Task 9; checked in Task 9 |
| ATTRACT: stack, hero, plates, footer (§3) | Tasks 1, 4, 7 |
| STANDBY: which state shows when (§4.1) | Task 4 (`screenFor`) |
| STANDBY layout: header, main column, the 8-slot standings, band, mascot (§4.2, §4.9) | Tasks 4, 7; checked in Task 8 |
| Standings rule: ranked only, at most 8, leader, featured (§4.3) | Task 4, on top of the engine's `audienceStandings` |
| Snapshot `result` (§4.4) | Engine plan; rendered in Task 4 |
| Scramble and cube preview, as csTimer draws it (§4.5) | Tasks 2, 7 |
| STANDBY edge cases (§4.7) | Task 4 (tests); Task 8 |
| STANDBY visual checks: band height, one-line scramble, mascot in the band, no `--go`, 8 slots, empty slots as tall as filled ones, no `—` in the column (§4.8) | Task 8 |
| ARMED states: the four rules, the eight moments (§5.2) | Task 5 (`armedDisplay`); Task 8 |
| ARMED layout; the header and band kept from Mezcla (§5.3) | Tasks 4, 7; checked in Task 8 |
| `inspectionMs` and `hands` in the snapshot (§5.4–§5.5) | Engine plan; rendered in Task 5 |
| ARMED edge cases (§5.7) | Tasks 4, 5 (tests); decision 4 for a lost signal |
| ARMED visual checks (§5.8) | Task 8 |
| RUNNING: the rules, the six moments, the layout, the clock drawn as the snapshot carries it (§6.1–§6.3) | Task 5 (`runningDisplay`); Task 7; checked in Task 8 |
| RUNNING's cutoff, `formatCutoff` (§6.4) | Engine plan; used in Task 5 |
| RUNNING edge cases and visual checks (§6.7–§6.8) | Tasks 5, 8 |
| PENDING's review: violet, or red past the cutoff (§7.1) | Task 5 (`reviewDisplay`); checked in Task 8; its colour change in Task 9 |
| PENDING's verdict: the tag, the ticks, the DNF, the rewind, the who line, the band, the `time` identity, the landed frame (§7.2) | Task 5 (`verdictDisplay`, `clockIsBest`); Tasks 4, 7, 9; checked in Tasks 8, 9 |
| PENDING's layout (§7.4) | Task 7; checked in Task 8 |
| `verdict` and `standingsBefore` in the view (§7.6) | Engine plan; used in Task 4 |
| PENDING edge cases (§7.8) | Tasks 4, 5 (tests); Task 9 |
| PENDING's visual and screen-change checks (§7.9) | Tasks 8, 9 |
| Two windows; the audience holds no event state; text as well as colour (system design §13) | Task 7; decision 14 |

**Deferred, with reasons** (see Scope): screens 6–10 and their states, including the signal state
(decision 4); the operator panel's layout, which UI spec §4.6, §5.6, §6.6 and §7.7 list requirements
for.
