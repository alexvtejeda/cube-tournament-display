# Execution chain — five plans, one subagent each

**Scratch tracker only.** The plans live in `docs/superpowers/plans/` and the specs in
`docs/superpowers/specs/`. Nothing here is a plan or a spec; this file only records *which plan runs
next, where, and how to dispatch it.*

**This session orchestrates.** It dispatches one subagent per plan, waits for its report, checks the
branch itself, then dispatches the next. It does not execute plan tasks itself.

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
| Suite | `npm test` → **pass 139, fail 0, skipped 0**; `npm run smoke` → **23/23, exit 0** |
| Last commit | `8af86af` Document running the engine and record what it built |
| Required symlink | `.worktrees/ctf-interuniversitario` → `/home/noob_master/ctf-interuniversitario` — **present**; without it the engine's `config/event.json` test silently *skips* instead of failing |
| `main` merged in | yes, 2026-09-19 — the branch now has the SETUP, NO SIGNAL and RESULTS specs and plans |

---

## The chain

Run in this order. Each row's dependencies are satisfied by every row above it.

- [x] **1 · Engine** — `docs/superpowers/plans/2026-09-18-tournament-engine.md` — **DONE 2026-09-19.**
  All 18 tasks committed, one commit each. Verified by the orchestrator, not just claimed:
  `npm test` → pass 139 / fail 0 / skipped 0, and `npm run smoke` → all 23 checks, exit 0.
- [ ] **2 · Signal check** — `docs/superpowers/plans/2026-09-19-signal-check.md` (needs 1)
  - Creates `js/core/signal-health.js` with `THRESHOLDS`, which plans 3 and 5 both read.
  - ⚠ Its Conventions carry a bullet saying the `waiting`-state amendment was **not** run. Expect
    its tests to need a real first execution: 17 tests in one file, 34 in the suite it names.
- [ ] **3 · Audience screens** — `docs/superpowers/plans/2026-09-18-audience-screens.md` (needs 1)
  - 10 tasks, screens 1–5. Creates `js/ui/audience-screens.js`, `js/ui/audience.js`,
    `css/tokens.css`, `css/audience.css` and the browser harness that plan 5 extends.
  - Needs Chrome for `npm run smoke` and `npm run screens`, and internet for the Adobe Fonts kit.
- [ ] **4 · SETUP** — `docs/superpowers/plans/2026-09-19-setup.md` (needs 1 and 2)
  - 7 tasks, screen 9. Its Task 1 verifies the engine and signal-check groundwork before touching
    anything.
- [ ] **5 · RESULTS and NO SIGNAL** — `docs/superpowers/plans/2026-09-19-results-and-no-signal.md`
  (needs 1, 2 and 3)
  - 13 tasks, screens 6 and 7. Its Task 1 refuses to start unless all three are finished.
  - Tasks 4, 6, 7 and 8 carry code that was **run and passed** (27 tests) before the plan was
    written; Tasks 2, 3, 5 and 9–12 are transcriptions. The plan says which is which.
- [ ] **6 · Finish the branch** — `finishing-a-development-branch`, merging `engine` into `main`.

**Two plans edit `ROADMAP.md`:** engine Task 18 and results Task 13. Whichever runs second must read
the file rather than assume it. The results plan already carries that warning.

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
