# Roadmap

Where this project stands, what is settled, and what is left. Written **2026-09-15** as a
handoff so a fresh session can pick up without re-deriving anything; updated **2026-09-16**, when
STANDBY and then ARMED were decided, and **2026-09-18**, when the engine plan was written.

Target event: **CTF Interuniversitario 2026**, October. 13 universities, one participant each.

---

## Where things live

| What | Path |
|---|---|
| System design (approved) | `docs/superpowers/specs/2026-09-15-tournament-display-system-design.md` |
| UI design spec | `docs/superpowers/specs/2026-09-16-tournament-display-ui-design.md` — ATTRACT, STANDBY and ARMED written; the rest are added screen by screen |
| Implementation plans | `docs/superpowers/plans/` — the **engine** plan, `2026-09-18-tournament-engine.md` (Phase 2 rows 0–4 and 8, and row 5's key loop), is written; a second plan, for the screens, follows the last screen design |
| Vendored code + provenance | `vendor/` |
| Brand assets + university logos | `assets/`, `assets/universidades/` |
| csTimer reference (never executed) | `docs/reference/cstimer-timer-stackmat.js` |
| Design mockups | `.superpowers/brainstorm/tournament-display/content/` ⚠ **gitignored** |
| Upstream csTimer clone | `../cstimer` (blobless partial clone, kept for re-pulling `stackmat.js`) |

⚠ **The mockup HTML is not versioned** — a deliberate choice. Every *asset* those mockups use is
now committed under `assets/`, and the UI spec transcribes every value a decided screen depends
on (ATTRACT, STANDBY and ARMED so far). Keep doing that for each new screen, so that directory can
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

---

## Phase 1 — UI design, screen by screen

Each screen gets brainstormed in the visual companion, then written into the UI spec. Constraints
inherited from the system design: two windows, the phases below, timer as hero, state conveyed by
text as well as colour.

| # | Screen | Purpose | Status | Still open |
|---|---|---|---|---|
| 1 | **ATTRACT** | Pre-event; room filling; also STANDBY before anyone finishes | ✅ **Decided** — `attract-DECIDED.html` | re-tune the face mask against the new `rootkitty-face.svg` (UI spec §3.4) |
| 2 | **STANDBY** | Between competitors; you scramble the cube | ✅ **Decided** — `standby-09-final.html` | none |
| 3 | **ARMED** | Mat at 0.00; inspection, hands, green light | ✅ **Decided** — `armed-04-final.html` | none |
| 4 | **RUNNING** | Live solve, clock is the hero | not started | inherits ARMED's layout (UI spec §5.3); cutoff colour steps — `--gold`/`--red` were declined on ARMED, so decide fresh |
| 5 | **PENDING** | Time frozen, awaiting operator | not started | how visible "awaiting decision" should be to the audience; how the suggested inspection penalty is shown (UI spec §5.6) |
| 6 | **RESULTS** | Podium + all thirteen | draft exists | podium treatment, whether all three attempts are shown |
| 7 | **NO SIGNAL** | Mat stopped transmitting | draft exists | wording; whether the audience sees it at all |
| 8 | **SIGNAL CHECK** | Pre-event mic diagnostic (`S`) | not started | waveform rendering, operator-only |
| 9 | **SETUP** | Mic permission, device picker, resume/fresh | not started | first-run flow; this is where most real failures surface |
| 10 | **OPERATOR PANEL** | The control surface | not started | layout, roster navigation, signal-health meter; must carry the full standings, the mat instruction and a large scramble (UI spec §4.6), and the inspection state with `Space`/`Esc` (§5.6) |

The settled values for ATTRACT, STANDBY and ARMED, and the shared tokens (radius, five type sizes,
palette, wording), are in the UI spec. New screens reuse those tokens before adding any of their own.

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
| 7 | **Maze** | `createMaze({canvas})` refactor; freeze on RUNNING | 6 | runs on idle screens, holds its last frame during a solve |
| 8 | **Persistence** | Per-result `localStorage`, resume/fresh prompt, JSON + CSV export | 2 | kill the tab mid-event, reload, standings intact |
| 9 | **Signal check** | Waveform, packets/sec, noise, power, device picker | 1 | screen decodes a live mat |
| 10 | **Hardware validation** | One session on a machine with a working microphone | 9 | a real StackMat drives a complete attempt |
| 11 | **Dry run** | Full rehearsal | all | 39 attempts with no operator hesitation |

---

## Risks to clear before October

| Risk | Why it matters | Action |
|---|---|---|
| **Typekit domain restriction** | Kits are domain-locked. It authorises `localhost` today | Add the production host to the Typekit account **before** the day |
| ~~**Tabular figures**~~ | ✅ **Closed 2026-09-16.** roc-grotesk's default figures are tabular: all ten digits measured equal at weights 500 and 800 | None — no mono fallback needed (UI spec §2.2) |
| **Microphone device** | The single most common real failure — the mat is on line-in, the browser defaults to the built-in mic | Device picker on SETUP *and* in the operator panel |
| **Secure context** | `getUserMedia` fails silently on `file://` | Always serve via `serve.js` |
| **Extended vs mirrored display** | Two windows want an extended desktop | Degrades gracefully; confirm at the venue |
| **Mockup HTML unversioned** | The decided mockups are gitignored. Their **assets are in `assets/`** | ATTRACT, STANDBY and ARMED values are transcribed into the UI spec; do the same for every new screen |
| **No mic on this dev machine** | WSLg's `RDPSource` delivers zero samples | Mock driver covers all logic; one real session covers the rest |

---

## Immediate next step

Brainstorm screen 4 (**RUNNING**) in the visual companion, then continue down the table. RUNNING
starts from ARMED's layout (UI spec §5.3), so `armed-04-final.html` is its starting point. The engine
plan touches no screen design, so it can be executed alongside these brainstorms. Start the
companion with:

```sh
~/.claude/skills/visual-companion/scripts/start-server.sh \
  --project-dir /home/noob_master/cube-tournament-display --session tournament-display
```

Existing screens are preserved. `armed-04-final.html` and `standby-09-final.html` are the closest
references for house style, and the UI spec's §2 holds the shared tokens.
