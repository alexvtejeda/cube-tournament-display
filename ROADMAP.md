# Roadmap

Where this project stands, what is settled, and what is left. Written **2026-09-15** as a
handoff so a fresh session can pick up without re-deriving anything; updated **2026-09-16**, when
STANDBY and then ARMED were decided, **2026-09-18**, when the engine plan and the first screens
plan were written, and **2026-09-19**, when RUNNING and then PENDING were decided and both plans
were amended for them, then RESULTS, and then SIGNAL CHECK, the first operator screen, which
opened a second UI spec for that window, and **2026-09-20**, when RESULTS and NO SIGNAL were built,
finishing Phase 1's audience window.

Target event: **CTF Interuniversitario 2026**, October. 13 universities, one participant each.

---

## Where things live

| What | Path |
|---|---|
| System design (approved) | `docs/superpowers/specs/2026-09-15-tournament-display-system-design.md` |
| UI design spec | `docs/superpowers/specs/2026-09-16-tournament-display-ui-design.md` — every audience screen is written: ATTRACT, STANDBY, ARMED, RUNNING, PENDING, RESULTS (§8) and NO SIGNAL (§10). §9 lists the amendments PENDING required of both plans, made on 2026-09-19, why RESULTS needs none, and NO SIGNAL's dependency on the signal check |
| Operator UI spec | `docs/superpowers/specs/2026-09-19-tournament-display-operator-ui-design.md` — the other window: §2 the operator's shared system, §3 SIGNAL CHECK. SETUP and the OPERATOR PANEL are added to it. §4 lists the amendments it requires of the engine plan |
| Implementation plans | `docs/superpowers/plans/` — the **engine** plan, `2026-09-18-tournament-engine.md` (Phase 2 rows 0–4 and 8, and row 5's key loop), and the first **screens** plan, `2026-09-18-audience-screens.md` (row 6 for screens 1–5, ATTRACT to PENDING, with their screen changes, and row 7; it runs after the engine plan), are written, and amended for PENDING. The second **screens** plan, `2026-09-19-results-and-no-signal.md` (row 6 for screens 6–7, RESULTS' core work included; it runs after the signal check), and the **signal check** plan, `2026-09-19-signal-check.md` (row 9: screen 8, after the engine plan), are written and run. Screen 10 gets its own once it is designed |
| Vendored code + provenance | `vendor/` |
| Brand assets + university logos | `assets/`, `assets/universidades/` |
| csTimer reference (never executed) | `docs/reference/cstimer-timer-stackmat.js` |
| Design mockups | `.superpowers/brainstorm/tournament-display/content/` ⚠ **gitignored** |
| Upstream csTimer clone | `../cstimer` (blobless partial clone, kept for re-pulling `stackmat.js`) |

⚠ **The mockup HTML is not versioned** — a deliberate choice. Every *asset* those mockups use is
now committed under `assets/`, and the UI spec transcribes every value a decided screen depends
on (ATTRACT, STANDBY, ARMED, RUNNING, PENDING, RESULTS and NO SIGNAL — every audience screen). Keep
doing that for each new screen, so that directory can be lost without losing a decision.

---

## Locked decisions

Do not relitigate these; they were settled deliberately.

1. **Dedicated operator** runs the event — every attempt needs a human deciding whether it counts
2. **Two windows** — clean audience view on the projector, controls on the laptop
3. **Back-to-back attempts**, fresh random scramble per attempt
4. **Best of 3**; DNFs skipped, never poison the score; zero successes = unranked, shown with a dash
5. **Hard cutoff ≈5:00**, configurable. Display warns; it does **not** auto-stop
6. **Standalone app**, vendoring only csTimer's decoder. No build step, plain ES modules
7. **`vendor/stackmat.js` is never edited** — so an audio bug can be diffed against upstream
8. **Maze reused**, frozen (not hidden) while a solve is running
9. **`roc-grotesk` from Adobe Fonts** — venue has internet, dependency accepted
10. **Brand palette** — the CTF site's own tokens, plus exactly one new value, `--go #2ee6a0`
11. **15-second inspection, shown on the projector** — started by the operator's key; +2 past 15 s and
    DNF past 17 s are *suggested* in PENDING, never applied, and nothing auto-stops (UI spec §5.1)
12. **One motion signature, and screen changes that move shared elements** — one ease-out curve and
    200 / 400 / 800 ms; anything with the same identity on both screens moves there over 800 ms, the
    rest fades; anything the mat drives stays instant (UI spec §2.2, §2.7)
13. **The operator window is its own design system** — the same palette, but fixed px instead of
    `cqw`, no motion, and red for a problem. SIGNAL CHECK is a **bench**: while it is open the mat
    reaches neither the event nor the room (operator spec §2, §3.1)
14. **The prize is a CTF flag, sent to each participant privately, and it depends on the place** — so
    no screen ever shows a flag, and every place on RESULTS counts, not only the podium (UI spec §8)

---

## Phase 1 — UI design, screen by screen

Each screen gets brainstormed in the visual companion, then written into the UI spec. Constraints
inherited from the system design: two windows, the phases below, timer as hero, state conveyed by
text as well as colour.

| # | Screen | Purpose | Status | Still open |
|---|---|---|---|---|
| 1 | **ATTRACT** | Pre-event; room filling; also STANDBY before anyone finishes | ✅ **Decided** — `attract-DECIDED.html` | none — keeps its approved face crop, and the plates follow the roster (UI spec §3.4) |
| 2 | **STANDBY** | Between competitors; you scramble the cube | ✅ **Decided** — `standby-09-final.html` | none — since PENDING, the standings always hold 8 slots with dashed empty ones, and update where the room can see it (UI spec §4.9) |
| 3 | **ARMED** | Mat at 0.00; inspection, hands, green light | ✅ **Decided** — `armed-04-final.html` | none |
| 4 | **RUNNING** | Live solve, clock is the hero | ✅ **Decided** — `running-06-final.html` | none — red past the cutoff, clock at 13.6cqw (ARMED's too), hundredths on every mat packet (UI spec §6) |
| 5 | **PENDING** | Time frozen, awaiting operator | ✅ **Decided** — `pending-16-final.html` | none — violet under EN REVISIÓN (red past the cutoff); a 3 s verdict with the +2 and DNF tags and the redo rewind; the motion signature and the screen-change rule (UI spec §7, §2.2, §2.7) |
| 6 | **RESULTS** | Podium + all thirteen | ✅ **Decided** — `results-05-paws.html` | none — a closing board on `F`, reached through ATTRACT, whose plates move to their places; the podium over a grid of plates, best time only; RootKitty climbs up over the winner's plate (UI spec §8) |
| 7 | **NO SIGNAL** | Mat stopped transmitting | ❌ **Removed 2026-10-06** — was `nosignal-06-identity.html` | none — on the real mat the packet rate dips while it idles, and the takeover flickered SIN SEÑAL over INSPECCIÓN. The projector no longer judges the signal; SIGNAL CHECK does. UI spec §10 is historical |
| 8 | **SIGNAL CHECK** | Pre-event and mid-event mat diagnostic (`S`) | ✅ **Decided** — `signal-04-final.html` | none — a five-link chain naming the broken link, a six-item mat test, a triggered waveform, and the bench rule (operator spec §3) |
| 9 | **SETUP** | Mic permission, device picker, resume/fresh | ✅ **Decided** — `setup-01-layout.html`, `setup-02-firstrun.html` | none — a fresh event is gated on a live signal and 6 of 6, a resume on nothing; a fourth link state, `waiting`, keeps red for real faults (operator spec §4) |
| 10 | **OPERATOR PANEL** | The control surface | not started | layout, roster navigation, and a signal-health meter that is SIGNAL CHECK's chain in one row (operator spec §3.12); must carry the full standings, the mat instruction and a large scramble (UI spec §4.6), and the inspection state with `Space`/`Esc` (§5.6); in PENDING, the suggestion, the four keys and the verdict the room is seeing (§7.7); `F`, how many universities have not competed, and the export within reach on RESULTS (§8.9) |

The settled values for every audience screen — ATTRACT, STANDBY, ARMED, RUNNING, PENDING, RESULTS
and NO SIGNAL — and the shared tokens (radius, five type sizes,
palette, motion, wording), are in the UI spec. New screens reuse those tokens before adding any of their own.

---

## Phase 2 — Wiring

Nothing here starts until the UI spec exists for the screens it renders. Phases 0–5 are
independent of UI design and could begin immediately.

| # | Phase | Delivers | Depends on | Done when |
|---|---|---|---|---|
| 0 | **Scaffold** | Repo layout, `serve.js`, `config/event.json` generated from `../ctf-interuniversitario/init.sql` | — | `node serve.js` serves over `http://localhost` |
| 1 | **Driver seam** | `shim.js`, `real.js`, `mock.js` + scripted scenarios | 0 | mock replays a full solve; core cannot tell the drivers apart |
| 2 | **Pure core** | `run-state`, `event-model`, `scoring`, `store` | 1 | `node --test` green, including the transition table, scoring edge cases and inspection limits |
| 3 | **Scrambler** | `cstimer_module` WebWorker wrapper | 0 | `getScramble('333')` and `getImage()` return in the browser |
| 4 | **Sync** | `channel.js` + audience window shell | 2 | audience mirrors operator; close and reopen catches up |
| 5 | **Operator panel** | Roster, keymap, PENDING gate, undo, health meter | 2, 4 | a full 13 × 3 event runs end to end on the mock driver |
| 6 | **Audience screens** | All ten screens | 4, UI spec | every phase renders correctly at 1080p — ✅ **done for the audience window** (screens 1–7); screen 10 is the operator's, and undesigned |
| 7 | **Maze** | `createMaze({canvas})` refactor; freeze on RUNNING and PENDING | 6 | runs on idle screens, holds its last frame during a solve |
| 8 | **Persistence** | Per-result `localStorage`, resume/fresh prompt, JSON + CSV export | 2 | kill the tab mid-event, reload, standings intact |
| 9 | **Signal check** | The screen in operator spec §3: the chain, the mat test, the waveform, the picker | 1, operator spec | screen decodes a live mat |
| 10 | **Hardware validation** | One session on a machine with a working microphone | 9 | a real StackMat drives a complete attempt |
| 11 | **Dry run** | Full rehearsal | all | 39 attempts with no operator hesitation |

**Built by the engine plan** (`docs/superpowers/plans/2026-09-18-tournament-engine.md`): rows 0–4 and
8, and row 5's key loop without its panel layout. Plain-text debug views stand in for screens 1–10.
`npm test` covers the core and the drivers; `npm run smoke` covers both windows on the mock mat.

**Built by the first screens plan** (`docs/superpowers/plans/2026-09-18-audience-screens.md`): row 6
for screens 1–5 (ATTRACT, STANDBY, ARMED, RUNNING and PENDING), with the screen changes of UI spec
§2.7, and row 7. `npm run screens` renders every designed state at 1080p, checks the UI spec's
invariants and what each screen change moves, and saves a PNG of each state.

**Built by the second screens plan** (`docs/superpowers/plans/2026-09-19-results-and-no-signal.md`):
the rest of row 6 — screens 6 (RESULTS) and 7 (NO SIGNAL), with the four screen changes of UI spec
§2.7 they add. RESULTS brought core work with it: a phase of its own, the `F` key, `resultsAt`, and
`finalStandings` and `resultsIntro` on the snapshot. NO SIGNAL added no core state at all, only
`matSilent`, computed in the operator window from `matDelivering` and SIGNAL CHECK's own
`THRESHOLDS`. With these the audience window is complete.

---

## Risks to clear before October

| Risk | Why it matters | Action |
|---|---|---|
| **Typekit domain restriction** | Kits are domain-locked. It authorises `localhost` today | Add the production host to the Typekit account **before** the day |
| ~~**Tabular figures**~~ | ✅ **Closed 2026-09-16.** roc-grotesk's default figures are tabular: all ten digits measured equal at weights 500 and 800 | None — no mono fallback needed (UI spec §2.2) |
| **Microphone device** | The single most common real failure — the mat is on line-in, the browser defaults to the built-in mic | Device picker on SETUP *and* in the operator panel, and on SIGNAL CHECK, whose chain names this failure in words |
| **Secure context** | `getUserMedia` fails silently on `file://` | Always serve via `serve.js` |
| **Extended vs mirrored display** | Two windows want an extended desktop | Degrades gracefully; confirm at the venue |
| **Mockup HTML unversioned** | The decided mockups are gitignored. Their **assets are in `assets/`** | Every audience screen's values — ATTRACT, STANDBY, ARMED, RUNNING, PENDING, RESULTS and NO SIGNAL — are transcribed into the UI spec; do the same for every new screen |
| **No mic on this dev machine** | WSLg's `RDPSource` delivers zero samples | Mock driver covers all logic; one real session covers the rest |
| **View Transitions API** | Screen changes and standings updates use `document.startViewTransition` (UI spec §2.7), Chrome and Edge 111+ | Run the audience window in Chrome. Without the API every change is a cut, so nothing breaks |

---

## Immediate next step

Phase 1's **audience** window is finished: screens 1–7 are designed, written into the UI spec, and
built. Screen 10, the **OPERATOR PANEL**, is the last undesigned screen and the only thread left in
Phase 1. Four screens have already set requirements for it, and each is recorded where it belongs:
the full standings, the mat instruction and a large scramble (UI spec §4.6); the inspection state
with `Space`/`Esc` (§5.6); in PENDING the suggestion, the four keys and the verdict the room is
seeing (§7.7); and on RESULTS `F`, how many universities have not competed, and the export within
reach (§8.9). SIGNAL CHECK's chain also wants a one-row health meter on it (operator spec §3.12).

Two things are deliberately **not** built, and neither is an oversight:

1. **UI spec §10.8's `Esc` remedy** — a competitor who loses the countdown can be returned to a
   suggestion they never saw. Nothing in code enforces it, and nothing should: a suggestion is never
   applied on its own (§5.1). It is the operator's key, and screen 10 lists it.
2. **`canConnect` / OTRA VENTANA TIENE EL MANDO** — threaded through SIGNAL CHECK but unreachable,
   because a refused window returns early in `main()`. That amendment belongs with the signal check.

In Phase 2, rows 10 (**hardware validation**) and 11 (**dry run**) are the last unstarted rows, and
row 10 is the one that retunes `THRESHOLDS`, which only SIGNAL CHECK reads now: the first hardware
session removed NO SIGNAL (row 7 of the screens table).

Brainstorm screen 10 in the visual companion, starting from operator spec §3.12 and §4.

Start the companion with:

```sh
~/.claude/skills/visual-companion/scripts/start-server.sh \
  --project-dir /home/noob_master/cube-tournament-display --session tournament-display
```

Existing screens are preserved. For the audience, `results-05-paws.html`, `pending-16-final.html`,
`running-06-final.html` and `standby-09-final.html` are the closest references for house style, and
UI spec §2 holds the shared tokens; `armed-04-final.html` still shows the old 17.6cqw clock (UI spec
§5.9), and `standby-09-final.html` the old standings (§4.9). For the operator window,
`signal-04-final.html` and `setup-01-layout.html` are the references, and the first runs its whole
scenario live.

**All four written plans have been executed** — the engine, the first screens plan, the signal
check, SETUP, and this one — each in a worktree, task by task, with `npm test`, `npm run smoke` and
`npm run screens` green at every commit. Screen 10 needs a plan of its own once it is designed.
