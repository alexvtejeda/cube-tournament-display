# Tournament Display — System Design

**Date:** 2026-09-15
**Status:** Approved
**Scope:** System architecture, run loop, data model, scoring, persistence, failure handling, testing
**Companion spec:** UI and visual design are deliberately **out of scope here**. They belong to a
separate `tournament-display-ui-design` spec, to be written screen by screen (see §13).

---

## 1. Context

Pentraze is hosting an inter-university CTF in October 2026 with **13 participating universities**.
Alongside the CTF, each university designates **one participant** for a 3x3x3 Rubik's cube
challenge. A commercial tournament display costs ~$100 and does more than is needed; this project
builds the display on top of csTimer's existing StackMat decoder.

A physical StackMat timer is available. Development happens on a machine with **no microphone
access** (WSL2 exposes a WSLg `RDPSource` that delivers zero samples), so the hardware path is
validated separately — see §10.

### Competitors

The roster is authoritative in the CTF project's database
(`ctf-interuniversitario/init.sql`, `valid_university` CHECK constraint):

> LOYOLA · INTEC · ITLA · PUCMM · UAPA · UCSD · UCE · UNAPEC · UNIBE · UNICARIBE · UNICDA · UNPHU · UTESA

`config/event.json` is **generated from that list**, not hand-typed, so spelling cannot drift.

---

## 2. Decisions locked

| # | Decision | Rationale |
|---|---|---|
| 1 | **Dedicated operator** runs the event | 39 timed attempts each need a human deciding whether the time counts. A bumped mat must be one keypress to undo, not an argument in front of an audience |
| 2 | **Two windows**: audience + operator | Clean projector view; operator controls never shown to the room |
| 3 | **Back-to-back attempts, fresh scramble each** | Each competitor does all 3 attempts in one trip to the mat. Scramble generated on demand at reset |
| 4 | **Best of 3** | Fastest successful attempt scores. Kindest to non-cubers, instantly legible to a non-cubing audience |
| 5 | **Hard cutoff ≈5:00, configurable** | Display warns; it does **not** auto-stop. The rule is visible so cutting someone off is the rule's doing, not the operator's |
| 6 | **Approach: standalone app, vendor only the decoder** | See §3 |
| 7 | **Maze reused, frozen during RUNNING** | Brand stays on screen; motion stops competing with the clock |

### Rejected approaches

- **Fork csTimer and strip it.** `kernel.js` is 39 KB of settings/session/dialog engine that every
  module reaches into, `style.css` is 59 KB, and the whole app models *one person practising*, not
  a multi-competitor tournament. Also requires Java + the closure compiler to build.
- **Write our own audio decoder.** AGC, Schmitt trigger with hysteresis, 1200-baud bit slicing,
  packet framing and checksums — tuned against real hardware over years. Rewriting it while unable
  to test against a StackMat is the wrong risk to take.

---

## 3. Architecture

Plain ES modules. **No build step** — no Java, no closure compiler, no bundler. Served over
`http://localhost`, which is a secure context, so `getUserMedia` works without certificates.

```
cube-tournament-display/        # standalone repo, own git history, GPL-3.0
  index.html            operator window
  audience.html         audience window
  serve.js              static server (secure context for getUserMedia)
  config/event.json     roster, cutoff, event name
  vendor/
    stackmat.js         from csTimer — BYTE-FOR-BYTE UNMODIFIED
    cstimer_module.js   from npm (cstimer_module@0.1.5)
    three.module.js     from ctf-interuniversitario
    hero-maze3d.js      from ctf-interuniversitario — pending createMaze() refactor
  assets/               rootkitty.svg · rootkitty-costume.webp · logo-ctf.svg
  js/
    drivers/  shim.js · real.js · mock.js
    core/     run-state.js · event-model.js · scoring.js · store.js · channel.js
    ui/       operator.js · audience.js · signal-check.js
  css/        tokens.css · operator.css · audience.css
  test/       core tests — no browser required
```

### Layering

```
RealDriver ──┐
             ├──▶ StackmatState ──▶ core (pure) ──▶ UI ──▶ BroadcastChannel ──▶ audience
MockDriver ──┘
```

**Three invariants:**

1. **`vendor/stackmat.js` is never edited.** Everything it needs (`execMain`, `$.now`, `$.noop`,
   `kernel.getProp`, `DEBUG`) is supplied by `drivers/shim.js` from outside. If it misbehaves
   against hardware, it can be diffed against upstream to prove the bug isn't ours.
2. **Exactly one `getUserMedia` call exists**, in the operator window. Two windows contending for
   the mat would be a miserable bug to diagnose live.
3. **`core/` is pure** — no DOM, no audio, no timers. The entire competitive logic of the event
   runs under `node --test`.

### Scrambles

`cstimer_module@0.1.5` (npm, prebuilt, same author as csTimer) runs in a **WebWorker**:

- `getScramble('333')` → random-state WCA-legal scramble
- `getImage(scr, '333')` → SVG of the scrambled cube

This replaces hand-wiring `min2phase.js` (39 KB) + `mathlib.js` (38 KB) + `utillib.js` (17 KB) +
`scramble.js` (28 KB) + `image.js` (31 KB) in exact load order.

---

## 4. Interfaces

### Driver

```js
{ start(deviceId?) -> Promise, stop(), onState(cb), getSample(seconds, cb) }
```

`real.js` wraps the vendored decoder; `mock.js` replays scripted sequences. The core cannot tell
them apart — this is what makes the system buildable without a microphone.

### StackmatState (emitted ~10 Hz by the decoder)

```js
{ on, running, time_milli, unit, greenLight, leftHand, rightHand, signalHeader, noise, power }
```

`signalHeader` ∈ `' SILRCA'`:

| Header | Meaning |
|---|---|
| `I` | idle |
| `S` | stopped / reset |
| `L` / `R` | one hand down |
| `C` | both hands down, not yet ready |
| `A` | both hands down **+ green light** — ready to start |
| `' '` | running |

`unit` is `10` for 9-byte packets (centisecond precision) or `1` for 10-byte (millisecond).

### Snapshot (operator → audience, broadcast on every change)

```js
{ phase, competitor, attemptNo, displayMs, scramble, scrambleSvg, standings, signal }
```

The audience window renders this and holds nothing else — it can be closed, reopened, or dragged
to the projector mid-event and simply catches up.

---

## 5. Run state machine

```
STANDBY ──select──▶ SCRAMBLE ──mat reset to 0.00──▶ ARMED ──green, hands off──▶ RUNNING
                        ▲                                                          │
                        │                                              both hands back down
                        │                                                          ▼
                        └────── accept / DNF, attempts remaining ◀────────────── PENDING
                                                                                   │
                        STANDBY ◀────────── accept / DNF, 3 of 3 done ─────────────┘
```

Transitions driven by the mat (no keypress):

| Transition | Condition |
|---|---|
| SCRAMBLE → ARMED | `time_milli === 0` with an idle/stopped header |
| ARMED → RUNNING | `running` becomes true |
| RUNNING → PENDING | `lastState.running && !state.running && state.time_milli !== 0` |

The RUNNING → PENDING condition is taken **verbatim** from `src/js/timer/stackmat.js`. Its non-zero
guard is what makes a mid-solve reset *not* register as a finish.

Transitions driven by the operator: `Space` accept · `D` DNF · `2` +2 · `R` redo · `N` next
university · `←`/`→` roster · `U` undo last accepted result · `S` signal check.

**PENDING is an unconditional gate.** Every exit from RUNNING lands there and waits. Nothing
reaches the standings without a keypress.

**Auto-arming:** after a time is accepted the next scramble appears immediately, and the system
waits for the *mat* to be reset rather than for the operator. This matters because the operator is
also the scrambler and their hands are on a cube — one keypress per attempt, not three.

---

## 6. Data model

```jsonc
// config/event.json
{
  "eventName": "CTF Interuniversitario 2026 — Reto del Cubo",
  "cutoffMs": 300000,
  "attemptsPerCompetitor": 3,
  "teams": [ { "id": "intec", "university": "INTEC", "participant": "…" } ]
}
```

```jsonc
// one attempt
{ "attempt": 2, "ms": 154320, "penalty": null, "status": "OK",
  "scramble": "R U R' U' F2 L D2 B' R F", "at": 1760000000000 }
```

`status` ∈ `OK` | `DNF`. `penalty` ∈ `null` | `"+2"`. Storing the scramble on the record costs
nothing and settles any dispute about what a competitor was handed.

### Scoring — best of 3

- Effective time = `ms + (penalty === '+2' ? 2000 : 0)`
- Score = **minimum effective time across attempts with `status === 'OK'`**
- `DNF` attempts are skipped — they never poison the score
- Zero successful attempts → **unranked, displayed with an em dash, not hidden**
- Ties break on second-best time, then roster order

Display format: `12.47` under a minute, `2:14.30` over.

---

## 7. Persistence and recovery

- **Every accepted result writes to `localStorage` immediately** — not at the end
- On load, an existing event offers **Resume** or **Start fresh**, explicitly. Never silent.
  Silently resuming practice data into a live tournament, or silently wiping 30 recorded solves,
  are both unrecoverable in front of an audience
- **Export to JSON and CSV at any point**, so standings can be pulled mid-event for the CTF
  scoreboard

---

## 8. Failure modes

| Failure | Detection | Behaviour |
|---|---|---|
| Mic permission denied | `getUserMedia` rejects | Blocking setup screen. `AudioContext` starts suspended, so audio requires a click — this is a step, not a surprise |
| Wrong input device | Operator picks from `updateInputDevices()` | The most common real failure: the mat is on line-in, the browser defaults to the built-in mic. Picker on setup **and** in the operator panel |
| Signal lost mid-event | Decoder emits `on: false` after ~100 idle bits | NO SIGNAL state, clock freezes, nothing recorded, self-clears when packets resume |
| Noisy / weak signal | `noise` (0–1) and `power` on every state | Live health meter in the operator panel — the difference between *warned* and *failed* |
| Garbled packets | Decoder validates checksum, drops silently | Surface packets/sec so silent dropping is visible, not mysterious |
| Competitor resets mid-solve | `running → false` with `time_milli === 0` | **Not a finish.** Guaranteed by the non-zero guard in §5 |
| Mat bump / false start | Any exit from RUNNING | Lands in PENDING; `R` voids it |
| Over cutoff | `time_milli > cutoffMs` | Display red, keeps counting, operator decides |
| Browser crash / sleep / tab close | — | Results already on disk; reload offers Resume or Start fresh |
| Audience window closed | — | Stateless; reopen and it catches up |
| Operator window closed | `beforeunload` while event live | Browser confirmation + snapshot on disk |
| Two operator windows | BroadcastChannel claim on startup | Second window refuses to take the mic. Two windows both holding `getUserMedia` and both writing results is the worst available bug |

---

## 9. Testing

**Pure core, `node --test`, no browser:**

- `scoring.js` — best-of-3, `+2`, DNF, all-DNF unranked, tie-break
- `event-model.js` — turn order across 13 × 3, roster boundaries
- `run-state.js` — transition table: given phase X and signal Y, assert phase Z

**Mock driver scenario replays**, each a timestamped array of `StackmatState`:
clean solve · false start · mat bump · reset mid-solve · cutoff overrun · signal loss during a run ·
signal loss during standby. A regression becomes a diff, not a re-enactment.

---

## 10. Hardware validation

Tests cannot prove the decoder hears *this* mat on *that* laptop. The **signal check screen** (`S`)
exists for exactly that: live waveform via `getSample()`, decoded packets/sec, noise bar, power
reading, input-device picker, last raw packet bytes.

One session on a machine with a working microphone. Either packets appear, or the screen names
which of the four things is wrong.

---

## 11. Vendored assets

Recorded in `vendor/PROVENANCE.md`.

| File | Source | Modified? |
|---|---|---|
| `stackmat.js` | csTimer `src/js/hardware/` | **Never** |
| `cstimer_module.js` | npm `cstimer_module@0.1.5` | No |
| `three.module.js` (1.27 MB) | ctf-interuniversitario | No |
| `hero-maze3d.js` (37 KB) | ctf-interuniversitario | Pending `createMaze({canvas})` refactor |
| `rootkitty.svg`, `logo-ctf.svg`, `rootkitty-costume.webp` | ctf-interuniversitario | No |

csTimer's timer-side adapter is kept at `docs/reference/cstimer-timer-stackmat.js` as **reference only** — its transition logic is reimplemented in
`core/run-state.js`, not imported.

### Mascot assets not used

`rootkitty-face.svg` (its `viewBox` crops into the artwork; carries 99 unused text-glyph defs),
`rootkitty-costume.png` and `Disfraz RootKitty.png` (byte-identical duplicates at 10× the webp
weight), `RootKitty_Disfraz.jpg` (print resolution).

---

## 12. Constraints and risks

| Item | Note |
|---|---|
| **Secure context** | `getUserMedia` requires HTTPS or `http://localhost`. Opening `index.html` as `file://` fails silently on the mic |
| **Extended display** | Two windows work best with the projector set to *extended*. Degrades gracefully to mirrored — the audience window holds no state, so nothing breaks |
| **Fonts** | `roc-grotesk-variable` (Adobe Fonts, kit `use.typekit.net/frw4sme.css`) **is used** — the venue has internet, and the owner accepted the dependency. Verified loading on `localhost`. Two consequences: the kit is domain-restricted, so the production host must be authorised in the Typekit account before the day; and the clock must be checked for tabular figures — if `roc-grotesk` lacks them, the timer falls back to a self-hosted mono, since digits that change width while counting are not acceptable. `logo-ctf.svg` carries its letterforms as paths and needs no font either way |
| **Licence** | csTimer is GPL-3.0. Vendoring `stackmat.js` makes this a derivative work, inheriting GPL-3.0. Accepted by the project owner |
| **`three.module.js` weight** | 1.27 MB of the 1.5 MB vendor total. Read from disk locally, not downloaded |

---

## 13. Deferred to the UI spec

Settled here only as constraints the UI must honour: two windows; the phases in §5; the timer as
hero; state must be conveyed by text as well as colour.

Everything else is open and will be worked screen by screen:

- ATTRACT, STANDBY, ARMED, RUNNING, PENDING, RESULTS, NO SIGNAL, SIGNAL CHECK, SETUP
- Operator panel layout
- Colour tokens, type scale, motion signature
- Standings: 8-row window vs all 13 at smaller type
- Maze treatment per screen
- Language (currently Spanish throughout)
