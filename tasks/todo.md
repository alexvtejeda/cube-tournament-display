# Execution chain — five plans, one subagent each

**Scratch tracker only.** The plans live in `docs/superpowers/plans/` and the specs in
`docs/superpowers/specs/`. Nothing here is a plan or a spec; this file only records *which plan runs
next, where, and how to dispatch it.*

**This session orchestrates.** It dispatches one subagent per plan, waits for its report, checks the
branch itself, then dispatches the next. It does not execute plan tasks itself.

---

## ⚠ READ THIS FIRST — is a dispatch already in flight?

**⚠ PLAN 4 (SETUP) WAS DISPATCHED 2026-09-19 22:50 AND IS RUNNING NOW.** Do not dispatch anything
onto `.worktrees/engine` until you have proven it is finished — use the check below. Plan 3 is
finished and verified; plan 4's commits start after `1994bee` and are **unchecked** until the
orchestrator runs the checklist on them.

The runbook below stays because this has now bitten twice, and the next dispatch can hit it again.

**Never dispatch onto `.worktrees/engine` until you have proven no agent is running there.** A
`/clear` does not stop a running subagent. Twice today a session was cleared while its agent was
alive: the agent kept committing, and the resumed session found the tracker several commits stale.
The first time, that is how Task 10 was lost.

**How to tell, before doing anything else.** Poll for about two minutes:

```sh
cd /home/noob_master/cube-tournament-display
for i in 1 2 3 4 5 6; do git -C .worktrees/engine log -1 --format=%h; \
  git -C .worktrees/engine status --porcelain | wc -l; sleep 20; done
```

- HEAD advancing, or untracked files accumulating → **a live agent. Wait for it.**
- HEAD frozen *and* files left untracked → an orphan died mid-task. Read those files against the
  plan's literal code before deleting anything; last time they were byte-identical and only needed
  committing.
- HEAD frozen, tree clean → it finished. Run the **Orchestrator's checklist** below.

**⚠ The worktree poll alone is ambiguous, and on 2026-09-19 22:27 it nearly produced the wrong
call.** A live agent goes quiet for minutes at a time — between commits it thinks, and it blocks on
slow commands (`npm run smoke` launches Chrome; waiting for port 9333 to close takes up to 90 s). A
frozen HEAD and a byte-identical tree for three minutes looked exactly like an orphan. It was not.

**The decisive test — do this first, it is instant and unambiguous.** A running subagent writes its
own transcript, and that transcript is re-parented into the *resumed* session after a `/clear`:

```sh
find ~/.claude/projects/-home-noob-master-cube-tournament-display \
  -path '*/subagents/*.jsonl' -mmin -3 -printf '%TH:%TM  %s  %p\n' | sort
```

- A subagent file written **in the last 2–3 minutes and growing** → **alive. Wait.** Read its tail to
  see the task it is on.
- Nothing recent, and the newest such file ends in `cost-state` → that agent exited; now use the
  worktree poll above to tell *finished* from *orphaned*.

Two traps that cost ~10 tool calls to see through:
- **The session's own `*.jsonl` is not the agent's.** A resumed session writes a *new* top-level
  transcript, and it fills with your own tool output — mistaking it for the agent's is self-confirming.
  The agent is always one level down, under `<session-id>/subagents/`.
- **`ps` cannot see a subagent.** It runs in-process inside the parent `claude`; there is no separate
  pid and no process whose `cwd` is the worktree. An empty `ps` proves nothing.

**Its report may still arrive** as a subagent hand-back in the fresh window, from an agent that
window never dispatched. That is expected — hand-backs survive a clear. Treat it as a claim and
check the branch anyway.

**Last commit verified by the orchestrator: `1994bee`.** Plans 1, 2 and 3 are all verified and
committed; nothing on the branch is unchecked.

**Next, in order:** dispatch **plan 4 (SETUP)** → dispatch **plan 5**, carrying its authorized port
deviation → `finishing-a-development-branch`. Plan 4 no longer needs a `canConnect` instruction: the
plan already threads it from the Web Lock claim itself (its decision row 6, and Task 5 Step 3's
`mat.canConnect = () => holdsOperator()`), which closes plan 2's dead-wiring defect.

**⚠ Two by-eye checks in plan 3 were deliberately not performed** — Task 8 Step 5 and Task 9 Step 7,
the mockup and motion comparisons through the visual companion. They need the owner and a visible
browser, and the mockups live in `.superpowers/brainstorm/…` in the *main* checkout, not this
worktree. **These are the owner's to run and are still open.** Everything measurable about those
screens is covered by `npm run screens` (125 checks).

---

## The decision that shaped this file

The first engine dispatch used **`subagent-driven-development`**: a fresh subagent per task plus two
reviewers, with the orchestrator polling for each. It worked — Tasks 1–10 are committed and green —
but of its ~74 turns roughly 40 were the single word *"Waiting."*

**Every dispatch from here uses `executing-plans` instead**, which runs the tasks inline in one
agent with checkpoints. Owner's call, 2026-09-19: it saves both wall-clock time and tokens.

---

## State as of 2026-09-19

| | |
|---|---|
| Worktree | `/home/noob_master/cube-tournament-display/.worktrees/engine` |
| Branch | `engine` — **carries all five plans**, merged back to `main` only at the very end |
| Node | v24.11.1 (plans need ≥ 24.2) |
| Suite | `npm test` → **pass 205, fail 0, skipped 0**; `npm run smoke` → **35/35, six runs out of six**; `npm run screens` → **125/125** |
| Last commit | `1994bee` Let the smoke test's polls see a window that has not loaded yet |
| Required symlink | `.worktrees/ctf-interuniversitario` → `/home/noob_master/ctf-interuniversitario` — **present**; without it the engine's `config/event.json` test silently *skips* instead of failing |
| `main` merged in | yes, 2026-09-19 — the branch now has the SETUP, NO SIGNAL and RESULTS specs and plans |

---

## The chain

Run in this order. Each row's dependencies are satisfied by every row above it.

- [x] **1 · Engine** — `docs/superpowers/plans/2026-09-18-tournament-engine.md` — **DONE 2026-09-19.**
  All 18 tasks committed, one commit each. Verified by the orchestrator, not just claimed:
  `npm test` → pass 139 / fail 0 / skipped 0, and `npm run smoke` → all 23 checks, exit 0.
- [x] **2 · Signal check** — `docs/superpowers/plans/2026-09-19-signal-check.md` — **DONE 2026-09-19.**
  All 8 tasks committed, `ccf3b33`..`4ac4795`. `npm test` → 173 / 0 / 0, exactly the count the
  amended Conventions derived; `signal-health.test.js` is 17. The unrun `waiting` amendment executed
  correctly on its first run with no edits. Smoke reaches 34/34 — but see **Blocker** below.
- [x] **3 · Audience screens** — `docs/superpowers/plans/2026-09-18-audience-screens.md` — **DONE
  2026-09-19.** All 10 tasks committed plus one self-caught fix, `314614c`..`1994bee`. Verified by
  the orchestrator: `npm test` → 205 / 0 / 0, `npm run smoke` → 35/35 exit 0 on **six** serial runs,
  tree clean, all 11 commits carry both trailers, `vendor/stackmat.js` byte-identical.
  **Two by-eye checks remain open for the owner** — see the header.
- [ ] **4 · SETUP** — `docs/superpowers/plans/2026-09-19-setup.md` (needs 1 and 2)
  - 7 tasks, screen 9. Its Task 1 verifies the engine and signal-check groundwork before touching
    anything.
- [ ] **5 · RESULTS and NO SIGNAL** — `docs/superpowers/plans/2026-09-19-results-and-no-signal.md`
  (needs 1, 2 and 3)
  - **AUTHORIZED DEVIATION, owner's call 2026-09-19: fix the hardcoded debug port.** Plan 5 extends
    the browser harness, so it is the last dispatch that can. Replace `DEBUG_PORT = 9333` with a port
    chosen at launch, and make the readiness loop prove the browser answering is *ours* rather than
    accepting any answer on the port. Chrome writes the port it actually bound to
    `<user-data-dir>/DevToolsActivePort` (first line), so launch with `--remote-debugging-port=0` and
    read it back. See **the port collision** below for why this is not cosmetic.
  - Plan 3 already made this easy: it extracted `test/browser/harness.js`, and the port is a
    **parameter** — `startHarness(9333)` at `test/browser/smoke.js:6`, used at `harness.js:31`.
    The change is `startHarness(0)` plus the `DevToolsActivePort` read inside the harness, so both
    `smoke` and `screens` inherit it.
  - 13 tasks, screens 6 and 7. Its Task 1 refuses to start unless all three are finished.
  - Tasks 4, 6, 7 and 8 carry code that was **run and passed** (27 tests) before the plan was
    written; Tasks 2, 3, 5 and 9–12 are transcriptions. The plan says which is which.
- [ ] **4.5 · Maze full-bleed** — no plan file; the scoped task below. **Runs after plan 4, before
  plan 5.** Owner's call 2026-09-19.
- [ ] **6 · Finish the branch** — `finishing-a-development-branch`, merging `engine` into `main`.

### 4.5 · The maze must fill the window, while the stage stays 16:9

**Reported by the owner 2026-09-19:** the three.js scene does not cover the width of the body. **It
is not a regression** — `css/tokens.css:28` sets `--stage-w: min(100vw, calc(100vh * 16 / 9))` and
the canvas lives *inside* `.stage` (`audience.html:17`), so on any window wider than 16:9 the stage
pillarboxes and the maze stops at the bars. UI spec line 347 (`| Stage | 16:9, --bg-deep |`) makes
the 16:9 stage the approved design. `npm run screens` renders at exactly 1080p, where stage ==
viewport, which is why all 125 checks pass and never see it.

**Decision (owner, 2026-09-19): the maze becomes a full-viewport backdrop; the content stage stays
16:9.** The ambient scene fills the window; every designed screen, its `cqw` layout and the band
motion keep their approved geometry.

**⚠ The one-line "fix" that must not be made.** Do **not** widen `--stage-w` to `100vw`. It is
load-bearing for *motion*: UI spec §2.7 uses `translateY(calc(-.1095 * var(--stage-w)))` in the
RESULTS band keyframes precisely because view-transition pseudo-elements have no container and
`cqw` cannot reach them. Widening it silently corrupts that geometry and rescales every `cqw`
measurement in the spec. **The canvas moves; the token does not change.**

Constraints the implementer must respect:

- **`position: fixed` will not escape the stage.** `.stage` has `container-type: size`, which implies
  layout containment and so makes it the containing block for *fixed* descendants too. The canvas has
  to move in the DOM, to a body-level backdrop before `.stage`.
- **`.stage` is `background: var(--bg-deep)`** (`css/audience.css:16`). Left opaque over a backdrop
  maze, it hides the scene entirely. It has to go transparent, with `body` keeping `--bg-deep`.
- **`.shade` is stage-relative and screen-keyed.** Its ATTRACT/waiting variants select
  `.stage[data-screen="attract"] .shade`. If the vignette travels with the maze (it should — a
  vignette that stops at the stage edge leaves a visible seam), those selectors need a reachable
  `data-screen`, mirrored onto the backdrop or `body` wherever `js/ui/audience.js` sets it today.
- **`screens.js` reads `.shade`** — `mazeLit()` hides the screen and its shade to sample the maze
  alone. The selectors survive a move, but this must be re-run and not assumed.
- **Verify at a non-16:9 window**, not at 1080p. At 1080p the bug is invisible by construction, so a
  green `npm run screens` proves nothing about it. The check is: canvas client width == `innerWidth`
  on a window wider than 16:9, while `.stage` stays 16:9.

**Ordering: before plan 5, and confirmed safe.** Plan 5 touches the maze only through the API —
`maze.pause()` / `maze.resume()` and `mazeFrozen(snapshot)` (its lines 1032, 1669, 1694) — never by
querying the canvas's position, and it does not edit `audience.html` at all. It *does* use
`var(--stage-w)` at its line 1513, in the band keyframe. That is the token this task must leave
alone, so the two are compatible in this order and only in this order: retrofitting after plan 5
would mean re-verifying its motion checks.

**Three plans edit `ROADMAP.md`:** engine Task 18, audience-screens Task 10 (done — it appended a
paragraph after the Phase-1 summary) and results Task 13, which runs last. **Task 13 must read the
file rather than assume it**; the results plan carries that warning, and there is now one more
edit in place than when it was written.

---

## Carry-forward from the engine dispatch (2026-09-19)

Reported by the executing agent and kept here because it does not live in any plan. The ⚠ item
will bite three of the four remaining plans.

**⚠ `test/browser/smoke.js` asserts against the *debug views*.** It reads `#clock` (`'15'`,
`'14'`/`'13'`, `'8.00'`), `#cube svg`, `#snapshot` JSON, `#status`, `#table`, `#scramble`; it needs a
button whose `textContent` is exactly `'Connect mat'`; it matches the body text
`'1 recorded attempts'` before pressing `r`. **Any plan that replaces a debug view must update
`test/browser/smoke.js` in the same plan**, or `npm run smoke` goes red through no fault of the new
code. It also hardcodes `DEBUG_PORT = 9333`, and its `Page.bringToFront` calls are load-bearing —
Chrome throttles hidden tabs and the mock mat stops ticking without them.

**For plan 2 · signal check**
- `s` → `'signalCheck'` is already in `js/core/keymap.js` and the reducer deliberately ignores it,
  but `js/ui/operator.js` forwards *every* non-null command into the reducer, so `s` is currently
  swallowed. **The plan must add the interception in the operator window.**
- The driver seam has **one** listener slot: `driver.onState(cb)` replaces the previous callback.
  The bench rule can be built on it, but the operator window must restore its own listener on close
  or the event goes deaf.
- `getSample(seconds, cb)` is live on both drivers. The mock synthesises `{ raw, bin, bits, bytes }`
  at 48 kHz (`raw` ±1, `bin` 0/1, both `round(seconds * 48000)` long); the real driver passes through
  to the vendored decoder.
- `fresh` is on every state; `offline(state)` sets `fresh: false`. When a mock scenario ends the mock
  repeats its last packet at 10 Hz still `fresh: true` — correct, not a bug: an idle real mat does
  send fresh packets, and `fresh: false` means *signal lost*.
- `packetBytes(state)` / `packetBits(state)` are exported from `js/drivers/scenarios.js` for the byte
  view; `mat.noise` is already in the operator debug view.
- `createRealDriver({ decoder, permissions })` is fully injectable, and
  `test/helpers/stackmat-signal.js` runs the unmodified decoder in a Node `vm` against a synthesized
  1200-baud signal — reuse it instead of mocking the decoder.

**For plan 3 · audience screens**
- The snapshot contract is frozen in `js/core/snapshot.js`: `phase, teams, competitor, attemptNo,
  attemptsPerCompetitor, startedCount, displayMs, cutoffMs, scramble, scrambleSvg, signal{on},
  standings, result, inspectionMs, hands, verdict, standingsBefore`.
- `VERDICT_MS = 3000` and `STANDINGS_UPDATE_MS = 4200` are exported, and the operator re-publishes at
  exactly those two moments after a decision (the `setTimeout` pair in `operator.js`'s `dispatch`),
  **so the audience needs no timers of its own** for the verdict ending or the standings updating.
- The swap seam is clean: `js/ui/audience.js` is five lines around `createAudienceView(root)` with a
  single `render(snapshot)`.

**For plan 4 · SETUP**
- The resume/fresh prompt is `chooseStart()` in `js/ui/operator.js` — plain text into `#operator`,
  listening for R/F. The device picker and Connect button are the real-mode branch of
  `js/ui/operator-debug-view.js`.
- `store.archive(Date.now())` is "start fresh". Mock runs use key `${STORAGE_KEY}:mock` and are
  provably isolated from the real key (smoke asserts both). `claimOperator()` gates everything; the
  refusal text begins `'Another operator window is already open'`.

**For plan 5 · RESULTS and NO SIGNAL**
- Two gaps to plan around: `snapshot.signal` is only `{ on }`, and `displayMs` is `null` outside
  RUNNING/PENDING while `hands` is forced to `'up'` whenever the signal is off — so "a time that
  survives NO SIGNAL" will need the snapshot extended.
- There is **no `f` key in the keymap yet** (`Escape, d, 2, r, n, ArrowLeft, ArrowRight, u, s`, plus
  Space); adding `f` for RESULTS is that plan's work.
- `latestResult(event, table)` and `audienceStandings(table, 8)` are ready in `js/core/scoring.js`.

## Carry-forward from the audience-screens dispatch (2026-09-19)

Reported by plan 3's agent and verified against the branch. **The first item breaks any plan that
still reads the audience debug view.**

- **⚠ The audience debug view is gone.** `js/ui/audience-debug-view.js` is deleted; `#snapshot`,
  `#clock` and `#cube` no longer exist. Read the audience through `#stage`'s `data-screen`
  (`waiting|attract|resultado|mezcla|armed|running|pending`), `.solo .digits`, `.solo .status`,
  `.side .row:not(.empty)`, `.net svg`, `.scr`. **The operator window keeps its debug view**, so the
  *Carry-forward* note above about `smoke.js` asserting on debug views now applies to the operator
  side only.
- **`test/browser/harness.js` is the shared seam**, exporting `sleep`, `waitFor` and
  `startHarness(debugPort)`. `startHarness` returns `{ base, openTab, check, finish }`; `openTab`
  returns `{ send, errors, close, closeTab, evaluate, press, screenshot }`. `evaluate` sets
  `awaitPromise: true`, so a check can await a promise. **Use `waitFor`, not fixed sleeps, for
  readiness** — but a predicate must never *throw* on a not-yet-loaded window. That bug cost plan 3
  an extra commit (`1994bee`): `text()` returned `undefined` before `document.body` existed and the
  predicate threw instead of returning false. `text()` in `smoke.js` is the null-safe pattern to copy.
- **`KEYS` in the harness holds `' ' n d u r s Escape`.** Any new named key — plan 5's `f`, and the
  arrows — **needs its entry added there**, and named keys must not be sent with `text`.
- **Ports: smoke 9333, screens 9334.** Give any new script its own port, never run two copies of one
  script at once, and sweep `/tmp/ctd-chrome-*` (a run that throws before `finish()` leaves its
  profile behind). Plan 5's authorized deviation replaces this with a port chosen at launch.
- **The swap seam for new screens** is `screenFor()` in `js/ui/audience-screens.js`, plus `FAMILY` /
  `familyOf` for whether a change animates; `changeBetween(from, to)` returns `'screen' |
  'standings' | null`. NO SIGNAL is screen 7 and needs a **new branch**, not an edit to screens 1–5.
- **`css/tokens.css` is new and shared**, separate from `css/audience.css`. `--stage-w` exists
  because view-transition pseudo-elements have no container, so `cqw` cannot reach them — a new
  pseudo-element keyframe needs `--stage-w`, not `cqw`.
- **Motion contract:** every element with an identity carries an inline `view-transition-name`;
  `screens.js` records `window.changes` / `window.transitions` and `show()` awaits each transition,
  so a new screen's checks can assert what moves. `moves()` and `cuts()` helpers exist.
- **`js/ui/audience.js` keeps exactly two pieces of non-event state** (its decision 14): the scene on
  screen, and when the verdict began. Do not add more — a reloaded window must show the current
  snapshot, landed.
- `package.json` gained `screens`; `.gitignore` gained `test/browser/out/`.
- **Plan-count drift to expect:** plan 3's absolute test counts were stale by +38 (they assumed the
  engine baseline before plan 2 added 38 tests) while every *delta* was exact. **Plans 4 and 5 will
  have the same offset** — trust their deltas, derive the absolute from 205.

---

## ✅ Resolved — the smoke gate was flaky since plan 2; fixed in `905a38a`

**Found and fixed by the orchestrator on 2026-09-19, between plans 2 and 3.** Not a defect in plan
2's logic; its tests and its screen are sound. This was about the gate the whole chain is verified
with. Kept here because the two hazards it exposed are permanent, and the second one is unfixed.

**Symptom.** `npm run smoke` fails intermittently, most often on its *first* check,
`real mode loads and offers "Connect mat"`. Measured on this machine: **1 clean run in 6**, with the
port confirmed free and Chrome fully exited between runs. Different checks fail on different runs,
which is what made it look like noise.

**Root cause, confirmed by probe.** Plan 2's Task 6 added
`<link rel="stylesheet" href="https://use.typekit.net/frw4sme.css">` to `index.html`, in `<head>`
**above** the classic `<script>` tags. A pending stylesheet blocks execution of the scripts after it,
so the operator window's boot is gated on an external CDN. The `Connect mat` button appeared after
**1284 ms, 4394 ms and 2028 ms** in three consecutive probes — and the smoke check asserts at a
hardcoded `await sleep(1500)`. The window straddles the timeout. At plan 1 (`8af86af`) `<head>` had
no external stylesheet and smoke ran 23/23 cleanly, twice.

Two consequences, one of which is not about tests:

1. **The gate is unreliable**, so any agent running plan 3, 4 or 5 will see red that its own work did
   not cause — and may "fix" it by weakening an assertion.
2. **The operator window cannot start until a font CDN answers.** For a tournament that may run on a
   bad venue connection or none, that is a product question, not a test question. The font itself is
   deliberate (plan 3 asserts roc-grotesk loads, and adds the same link to `audience.html`).

**The fix, owner's call on 2026-09-19: unblock the boot *and* poll.** Both halves:

1. **Done, `905a38a`.** `index.html` now uses `<link rel="preload" as="style" … onload>` with a
   `<noscript>` fallback, so the font is fetched without gating the scripts. The button appears at
   **761–764 ms across four probes** (was 1284 / 4394 / 2028), and `npm run smoke` went from **1
   clean run in 6 to 6 in 6**, with `npm test` still 173 / 0 / 0. The typeface is unaffected: the
   link swaps to `rel="stylesheet"`, the sheet lands in `document.styleSheets`, and
   `document.fonts.check('800 20px roc-grotesk-variable')` is still true — so plan 3's
   `roc-grotesk loads from Adobe Fonts` check still holds.
2. **Carried into plan 3's dispatch as an authorized deviation**, because plan 3 **replaces
   `test/browser/smoke.js` whole** (its Task at line 1281) with the same `await sleep(1500)` pattern,
   so a patch to that file now would simply be overwritten. Plan 3's agent was told to write
   `audience.html`'s font link in the non-blocking form, and to add `waitFor(predicate)` to the
   `test/browser/harness.js` it creates, replacing the **five readiness sleeps** (plan lines ~1299,
   ~1308, ~1340, ~1365, ~2025) — while **leaving the `VERDICT_MS` / `STANDINGS_UPDATE_MS` waits
   alone, because those sleeps are the assertion.** Plans 4 and 5 should use `waitFor` too.

**⚠ A second hazard the same investigation turned up, still unfixed.** `smoke.js` hardcodes
`DEBUG_PORT = 9333` and its readiness loop breaks as soon as *anything* answers `/json/version`. Two
runs started back to back make the second drive the first's **dying** Chrome while its profile is
being deleted, producing bizarre failures in unrelated checks. **Never run two smoke runs
concurrently; wait for port 9333 to close between them.** This cost an hour of false leads before it
was spotted. No plan fixes it — it is a candidate for the parked list.

**The standard of proof this chain now uses for the browser gate: three serial runs, identical.**
One green run proved nothing here — the very first investigation had a run pass 34/34 between two
that failed.

**"Identical" means the check list, not the bytes.** One PASS label embeds the randomly generated
scramble (`N calls the first university, with a scramble (…)`), so it differs every run by design.
Compare the PASS/FAIL *names* and counts; an md5 of the raw output will never match and will send
you hunting a flake that is not there. It did exactly that on 2026-09-19.

**The port collision is wider than this repo.** `~/.claude/skills/design-recon/scripts/
launch-cobrowse.sh` defaulted to **the same port 9333**, and before starting it runs
`pgrep -f "remote-debugging-port=<port>"` and **kills whatever it finds**. The root cause: the
launcher never read `COBROWSE_PORT`. `~/.claude/settings.json` sets it to `9444` and `cobrowse.mjs`
honours it, but the launcher took `$1` only and fell back to 9333. **Fixed 2026-09-19** — it now
honours `COBROWSE_PORT`, falling back to `9222`, never 9333. That file is machine-local config and
is not part of this repo, so the fix is not in this history. So a co-browse session
started while `npm run smoke` is running kills the smoke test's Chrome mid-run; a smoke run started
while co-browse holds 9333 attaches to the *visible* browser and drives it. Neither tool would
report anything sensible. Fixing it here is plan 5's authorized deviation, above.

---

## Dispatch recipe

One `Agent` call per plan, `subagent_type: "general-purpose"`. Fill in the two bracketed parts.

> You are executing a complete, pre-verified implementation plan, start to finish, on your own.
>
> **REQUIRED SKILL: invoke `executing-plans` with the Skill tool before you write any code, and
> follow it.** Do **not** use `subagent-driven-development`, and do **not** spawn subagents — you do
> the work yourself, in batches with checkpoints. That is the whole point of this dispatch.
>
> **Workspace:** `cd /home/noob_master/cube-tournament-display/.worktrees/engine` and stay there. It
> is a git worktree on branch `engine`. Never `cd` to the repository root; never touch `main`.
>
> **The plan:** `[PLAN PATH]`. Read it in full first. `[START AT: Task N / the beginning]`.
>
> **Rules that are not negotiable:**
> - The code in each step is final — copy it exactly. Where a plan marks a snippet as *not run*,
>   it is a transcription: if it does not fit the code you find, stop and read the file rather than
>   improvising.
> - **Never run `git add -A` or `git add .`** Stage files by name, every time.
> - **Never edit `vendor/stackmat.js`.**
> - End every commit message with these two lines:
>   `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
>   `Claude-Session: https://claude.ai/code/session_01CTqSteqPGGFwQ8w7n2shNB`
> - Commit once per task, as the plan says.
> - Do not edit any file under `docs/superpowers/` unless the plan tells you to.
>
> **If you get stuck:** do not guess and do not skip a task. Stop, commit whatever is already green,
> and report where you stopped and why.
>
> **Report back, in this shape and nothing longer:**
> 1. Tasks completed, by number.
> 2. The verbatim tail of `npm test` — the `pass / fail / skipped` lines.
> 3. The result of `npm run smoke`, if the plan has one.
> 4. `git log --oneline` for the commits you made.
> 5. Every deviation from the plan, and why.
> 6. Every defect you found *in the plan itself* — wrong signature, missing step, stale reference.
> 7. Anything the next plan in the chain needs to know.

---

## Orchestrator's checklist, between dispatches

Do all five. The subagent's report is a claim; the branch is the fact.

1. `git -C .worktrees/engine log --oneline | head -20` — the commits exist, one per task.
2. `git -C .worktrees/engine status --porcelain` — **empty**. Anything untracked is unfinished work.
3. `cd .worktrees/engine && npm test` — read `pass / fail / skipped` yourself. **`skipped` must be
   0**; a skip usually means the `ctf-interuniversitario` symlink is gone.
4. `npm run smoke` where the plan has one.
5. Tick the row above, record the new commit and test count in **State**, and commit this file.

**Never dispatch two agents onto this branch at once.** That is how Task 10 ended up written but
uncommitted: two agents, one worktree.

---

## Parked — not part of the chain, do not lose

- [ ] **A local, non-GitHub git remote on the owner's Fedora machine.** Asked for on 2026-09-19; the
  machine was off at the time. When it is on: `mkdir -p ~/repos && git init --bare
  ~/repos/cube-tournament-display.git` there, then `git remote add fedora
  <user>@<tailscale-host>:repos/cube-tournament-display.git` here and `git push fedora main engine`.
  Tailscale addresses are in the 100.64.0.0/10 range. `git bundle` is the offline fallback.
  Why it matters: **this machine has no working microphone** (WSLg's `RDPSource` delivers zero
  samples), so the mat can only ever be tested somewhere else.
- [ ] **Roadmap Phase 2 row 10, hardware validation.** One session on a machine with a real
  microphone and a real StackMat, which also retunes `THRESHOLDS` in `js/core/signal-health.js` —
  one edit that moves both SIGNAL CHECK's chain and NO SIGNAL's takeover. Needs Node ≥ 24.2 and
  Chrome on that machine. Record it in `ROADMAP.md` **after** the engine branch merges, because
  engine Task 18 owns that file.
- [ ] **Screen 10, OPERATOR PANEL** — the last undesigned screen, and the only part of Phase 1 left.
  Requirements for it are already recorded in UI spec §4.6, §5.6, §7.7, §8.9 and operator spec §3.12.

---

## Review

_Filled in as each plan lands._

- **2026-09-19 — Audience screens, Tasks 1–10. Plan 3 complete.** Verified here, not just claimed:
  205 / 0 / 0, `npm run smoke` 35/35 exit 0 on six serial runs, tree clean, eleven commits each with
  both trailers, `vendor/stackmat.js` byte-identical by SHA, nothing under `docs/superpowers/`
  touched. The `vendor/hero-maze3d.js` edits are Task 3's declared work, not a violation of the
  never-edit-vendor rule, which names `stackmat.js` only.
  **Eleven commits for ten tasks, and the extra one is the good news:** running its own three-run
  proof, the agent's smoke run 2 failed, and it diagnosed the cause as a bug *it* had introduced —
  its new `waitFor` poll fired earlier than the fixed sleep it replaced, so `text()` returned
  `undefined` and the predicate threw. It fixed the root cause rather than the assertion. It also
  refused to paste Task 6's `smoke.js` verbatim because that transcription predates plan 2 and would
  have **silently deleted plan 2's eleven SIGNAL CHECK browser checks** — the single most valuable
  catch of this dispatch, and the clearest evidence that "the code in each step is final" needs the
  escape hatch the dispatch recipe gives it.
  Four plan defects reported, all confirmed plausible: the stale `smoke.js` block, two SIGNAL CHECK
  uses of a `snapshot` helper Task 7 deletes, stale absolute test counts, and a drifted README
  anchor. **Two Steps were deliberately not done** — the by-eye mockup and motion comparisons, which
  need the owner and a visible browser; they are open, in the header.
  One orchestration note: this agent survived a `/clear` and was found alive only by checking its own
  transcript under `<session-id>/subagents/`; the worktree poll alone read as an orphan for three
  minutes while it sat waiting on a debug port.
- **2026-09-19 — Signal check, Tasks 1–8. Plan 2 complete.** Verified here: 173 / 0 / 0, tree clean,
  eight commits each with both trailers, `vendor/` and `docs/` untouched. The agent made **one
  deviation and it was correct**: the plan's Task 7 adds `Escape` to the smoke harness's `KEYS` table
  but the existing `press()` helper sent `text: key` on every keydown, and Chrome silently drops a
  named key's keydown when it carries text. It fixed `press()` at the root rather than weakening the
  check, and proved the mechanism with a CDP probe. It reported four plan defects; the one that
  matters is **(a) `canConnect` is dead wiring** — `diagnose` accepts it and the `refused` verdict is
  tested, but no caller passes it, so `OTRA VENTANA TIENE EL MANDO` can never appear. It is also
  unreachable by construction in this plan's scope, because a second operator window bails at
  `claimOperator()` before the check is built. **Plan 4 (SETUP) must supply `canConnect` from the
  lock state, or write its own call site.** Also flagged: a latent `open()`/`close()` race in
  SIGNAL CHECK that leaks a 200 ms interval and a `devicechange` listener if Esc lands inside the
  permission round-trip (real operator can hit it; the smoke test cannot). Separately, the
  orchestrator found the smoke flake recorded under **Blocker** above.
- **2026-09-19 — Engine, Tasks 11–18. Plan 1 complete.** One `executing-plans` agent ran all eight
  inline and committed one per task, `872137b`..`8af86af`. The orchestrator re-ran the checks rather
  than trusting the report: 139 pass / 0 fail / 0 skipped, `npm run smoke` 23/23 exit 0, tree clean,
  all eight commits carry both trailers, and `vendor/stackmat.js` is byte-identical (the only vendor
  change is the `PROVENANCE.md` line Task 18 directed). The agent reported **no defects in the plan**
  — every count it predicted came out exactly right on first run. Its handoff notes are in
  *Carry-forward* above. One process note: this agent was dispatched before a `/clear` and kept
  working afterwards; the resumed session found Tasks 11–15 already committed and correctly waited
  for it to finish instead of dispatching a second agent onto the same worktree.
- **2026-09-19 — Engine, Tasks 1–10.** Committed and green at 88 tests, 0 skipped. Tasks 1–9 ran
  under `subagent-driven-development` with two reviewers each and passed byte-identical
  transcription checks. Task 10's implementer wrote both files verbatim and was killed before it
  could commit; the code was checked against the plan character for character, its three tests pass,
  and it was committed by hand as `e4f262e`.
