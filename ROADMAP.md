# Roadmap

Where this project stands, what is settled, and what is left. Written **2026-09-15** as a
handoff so a fresh session can pick up without re-deriving anything; updated **2026-09-16**, when
STANDBY and then ARMED were decided, **2026-09-18**, when the engine plan and the first screens
plan were written, and **2026-09-19**, when RUNNING and then PENDING were decided and both plans
were amended for them, then RESULTS, and then SIGNAL CHECK, the first operator screen, which
opened a second UI spec for that window.

Target event: **CTF Interuniversitario 2026**, October. 13 universities, one participant each.

---

## Where things live

| What | Path |
|---|---|
| System design (approved) | `docs/superpowers/specs/2026-09-15-tournament-display-system-design.md` |
| UI design spec | `docs/superpowers/specs/2026-09-16-tournament-display-ui-design.md` — ATTRACT, STANDBY, ARMED, RUNNING, PENDING and RESULTS written; the rest are added screen by screen, from §10 on. §9 lists the amendments PENDING required of both plans, made on 2026-09-19, and why RESULTS needs none |
| Operator UI spec | `docs/superpowers/specs/2026-09-19-tournament-display-operator-ui-design.md` — the other window: §2 the operator's shared system, §3 SIGNAL CHECK. SETUP and the OPERATOR PANEL are added to it. §4 lists the amendments it requires of the engine plan |
| Implementation plans | `docs/superpowers/plans/` — the **engine** plan, `2026-09-18-tournament-engine.md` (Phase 2 rows 0–4 and 8, and row 5's key loop), and the first **screens** plan, `2026-09-18-audience-screens.md` (row 6 for screens 1–5, ATTRACT to PENDING, with their screen changes, and row 7; it runs after the engine plan), are written, and amended for PENDING. The next screens plan covers RESULTS, core work included, and NO SIGNAL once it is designed, and the **signal check** plan, `2026-09-19-signal-check.md` (row 9: screen 8, after the engine plan), is written. Screens 9–10 get theirs once they are designed |
| Vendored code + provenance | `vendor/` |
| Brand assets + university logos | `assets/`, `assets/universidades/` |
| csTimer reference (never executed) | `docs/reference/cstimer-timer-stackmat.js` |
| Design mockups | `.superpowers/brainstorm/tournament-display/content/` ⚠ **gitignored** |
| Upstream csTimer clone | `../cstimer` (blobless partial clone, kept for re-pulling `stackmat.js`) |

⚠ **The mockup HTML is not versioned** — a deliberate choice. Every *asset* those mockups use is
now committed under `assets/`, and the UI spec transcribes every value a decided screen depends
on (ATTRACT, STANDBY, ARMED, RUNNING, PENDING and RESULTS so far). Keep doing that for each new screen, so that directory can
be lost without losing a decision.

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
| 7 | **NO SIGNAL** | Mat stopped transmitting | draft exists | wording; whether the audience sees it at all; it must not cover RESULTS (UI spec §8.9) |
| 8 | **SIGNAL CHECK** | Pre-event and mid-event mat diagnostic (`S`) | ✅ **Decided** — `signal-04-final.html` | none — a five-link chain naming the broken link, a six-item mat test, a triggered waveform, and the bench rule (operator spec §3) |
| 9 | **SETUP** | Mic permission, device picker, resume/fresh | ✅ **Decided** — `setup-01-layout.html`, `setup-02-firstrun.html` | none — a fresh event is gated on a live signal and 6 of 6, a resume on nothing; a fourth link state, `waiting`, keeps red for real faults (operator spec §4) |
| 10 | **OPERATOR PANEL** | The control surface | not started | layout, roster navigation, and a signal-health meter that is SIGNAL CHECK's chain in one row (operator spec §3.12); must carry the full standings, the mat instruction and a large scramble (UI spec §4.6), and the inspection state with `Space`/`Esc` (§5.6); in PENDING, the suggestion, the four keys and the verdict the room is seeing (§7.7); `F`, how many universities have not competed, and the export within reach on RESULTS (§8.9) |

The settled values for ATTRACT, STANDBY, ARMED, RUNNING, PENDING and RESULTS, and the shared tokens (radius, five type sizes,
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
| 6 | **Audience screens** | All ten screens | 4, UI spec | every phase renders correctly at 1080p |
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

---

## Risks to clear before October

| Risk | Why it matters | Action |
|---|---|---|
| **Typekit domain restriction** | Kits are domain-locked. It authorises `localhost` today | Add the production host to the Typekit account **before** the day |
| ~~**Tabular figures**~~ | ✅ **Closed 2026-09-16.** roc-grotesk's default figures are tabular: all ten digits measured equal at weights 500 and 800 | None — no mono fallback needed (UI spec §2.2) |
| **Microphone device** | The single most common real failure — the mat is on line-in, the browser defaults to the built-in mic | Device picker on SETUP *and* in the operator panel, and on SIGNAL CHECK, whose chain names this failure in words |
| **Secure context** | `getUserMedia` fails silently on `file://` | Always serve via `serve.js` |
| **Extended vs mirrored display** | Two windows want an extended desktop | Degrades gracefully; confirm at the venue |
| **Mockup HTML unversioned** | The decided mockups are gitignored. Their **assets are in `assets/`** | ATTRACT, STANDBY, ARMED, RUNNING, PENDING and RESULTS values are transcribed into the UI spec; do the same for every new screen |
| **No mic on this dev machine** | WSLg's `RDPSource` delivers zero samples | Mock driver covers all logic; one real session covers the rest |
| **View Transitions API** | Screen changes and standings updates use `document.startViewTransition` (UI spec §2.7), Chrome and Edge 111+ | Run the audience window in Chrome. Without the API every change is a cut, so nothing breaks |

---

## Immediate next step

SIGNAL CHECK is designed (operator spec §3) and planned (`plans/2026-09-19-signal-check.md`), and
the engine plan was amended on 2026-09-19 for the four things it needs — `fresh` on driver states,
`disarm`, `s` in the keymap, and the mock mat's synthesised audio sample. Two threads are left
before the whole of Phase 1 is designed:

1. **Brainstorm screen 7 (NO SIGNAL)** in the visual companion — the last audience screen, starting
   at UI spec §10. It follows the motion signature and the screen-change rule (UI spec §2.2, §2.7),
   and two screens have set requirements for it: it must not cover RESULTS (§8.9), and it is what
   the room holds while the operator is inside SIGNAL CHECK, so it should be calm (operator spec
   §3.12).
2. **Write the screens plan for RESULTS and NO SIGNAL**, carrying RESULTS' core work (UI spec §9).

Screen 10 is still undesigned, and it is the last of Phase 1.

Start the companion with:

```sh
~/.claude/skills/visual-companion/scripts/start-server.sh \
  --project-dir /home/noob_master/cube-tournament-display --session tournament-display
```

Existing screens are preserved. For the audience, `results-05-paws.html`, `pending-16-final.html`,
`running-06-final.html` and `standby-09-final.html` are the closest references for house style, and
UI spec §2 holds the shared tokens; `armed-04-final.html` still shows the old 17.6cqw clock (UI spec
§5.9), and `standby-09-final.html` the old standings (§4.9). For the operator window,
`signal-04-final.html` is the reference, and it runs its whole scenario live.

**Then execute the plans** with subagents in a worktree, the engine plan first and then the screens
plans, while the operator's screens (9–10) are brainstormed in the main session. The engine plan and
the first screens plan were amended for PENDING on 2026-09-19 and are ready to run. Every step's code
was replayed from the plans' text and passed.
