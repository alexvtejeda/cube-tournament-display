# Tournament Display — Operator UI Design

**Date:** 2026-09-19
**Status:** In progress — written screen by screen. **SIGNAL CHECK** (screen 8) is approved; SETUP (9) and OPERATOR PANEL (10) are not yet designed
**Scope:** Operator-window screens: layout, copy, visual values, and the data each screen needs from the core
**Companion specs:** [`2026-09-15-tournament-display-system-design.md`](2026-09-15-tournament-display-system-design.md) (architecture, run loop, drivers, failure modes) and [`2026-09-16-tournament-display-ui-design.md`](2026-09-16-tournament-display-ui-design.md), the **audience** UI spec. This document is its counterpart for the other window.

---

## 1. How to read this spec

The two windows are designed apart on purpose. The audience window is a projector at a fixed
aspect, measured in `cqw` and read from across a room; the operator window is a laptop window read
at arm's length, and its text must not shrink when the window does. So this spec has its own shared
system (§2), and it **reuses the audience palette without adding a colour**.

Screens are designed in the visual companion and approved there. The mockups live in
`.superpowers/brainstorm/tournament-display/content/`, which is **gitignored by choice**, so this
document transcribes every value a screen depends on. If this spec and a mockup disagree, **this
spec wins** — see §2.2, where the mockup's ad-hoc type sizes were normalised into six.

| Screen | Status | Mockups (visual reference) |
|---|---|---|
| 8 SIGNAL CHECK | ✅ Approved | **`signal-04-final.html`**; decided in `signal-01-look.html` (look), `signal-02-layout.html` (layout), `signal-03-wave.html` (the waveform) |
| 9 SETUP | Not yet designed | — |
| 10 OPERATOR PANEL | Not yet designed | — |

SIGNAL CHECK asks for four changes to the engine plan, one of which is a bug that plan would
otherwise ship. They are in §4.

---

## 2. The operator's shared system

Every operator screen reuses these before adding anything of its own.

### 2.1 Colour

The palette is the audience spec's (§2.1 there), unchanged — **no new value**. What is new is what
some of those colours mean in this window.

| Role | Value | Note |
|---|---|---|
| Ground | `--bg-deep #02010c` | the whole window; no maze, no vignette |
| Dividers | `--violet-deep #231f66` | 1px; also the outline of a pill or an unlit indicator |
| Labels, secondary text, details | `--violet #aba6f7` | |
| Primary text, and a **good** reading | `#fff` | "done" needs no colour of its own |
| A **problem** | `--red #EE2737` | the operator window's second text role for red |
| **Unknown**, not measured yet | `rgba(171,166,247,.45)` | dashed; the audience's empty-slot colour |
| The mat's green light | `--go #2ee6a0` | still reserved: nothing else on any operator screen may use it |

- **`--red` gains one role here:** a broken link and the verdict line that names it. On the audience
  screens red means only a time past the cutoff (audience §2.1). The two windows never share a
  screen, so the meanings cannot collide, and "something is wrong" is the only thing red says here.
- **There is no warning colour.** `--gold` keeps having no role. An intermittent signal is a
  problem with its own sentence, not a third colour — see §3.3.
- **Nothing on an operator screen is green except the mat's light.** A green tick for "OK" was
  offered in `signal-01-look.html` (look C) and declined for exactly this reason.
- Contrast on `--bg-deep`: `--violet` 9.41:1 · `--red` 4.92:1 · `--go` 12.79:1. The unknown colour
  is 2.56:1 and carries only readings that are explicitly not available, the way disabled text does.

### 2.2 Type and tokens

```css
--o-fs-label:   13px;  /* spaced uppercase labels */
--o-fs-body:    16px;  /* header, detail lines, the state line */
--o-fs-lead:    20px;  /* checklist items, the verdict's sentence, the picker, raw bytes */
--o-fs-num:     26px;  /* a chain link's reading */
--o-fs-verdict: 40px;  /* the verdict line */
--o-fs-clock:   88px;  /* the mat's clock */

--o-radius:     16px;  /* one radius: pills and buttons. Dots and ticks are circles */
--o-gutter:     32px;  /* the page's left and right edge, and every section's */
```

- **Fixed px, never `cqw`.** The operator window can be any size, and a reading that shrinks with
  the window is the opposite of what this window is for. The audience's reason for `cqw` — one fixed
  canvas at a known aspect — does not apply here.
- **Six sizes.** The approved mockups also used 14, 17, 18, 22, 32 and 34px in places; those were
  drawing values, and they collapse into the six above: the header's notice and keys to
  `--o-fs-body`, the verdict's sentence, the picker and the bytes to `--o-fs-lead`, a link's reading
  to `--o-fs-num`, and the verdict line to `--o-fs-verdict`.
- **Weights:** 400 for spaced uppercase labels · 500 for body and list items · 800 for a link's
  reading, the verdict line and the clock. This follows the audience spec's rule for labels.
- **Letter-spacing:** `.24em` on labels and on the state line · `.14em` on the header's title ·
  `-.01em` on the verdict · `-.02em` on the clock.
- **Font:** `roc-grotesk-variable`, the fallback stack `"roc-grotesk", system-ui, sans-serif`
  (locked decision 9). Every number sets `font-variant-numeric: tabular-nums`.
- **Layout assumes at least 1280 × 800**, and was drawn at 1440 × 900. Below that the page scrolls;
  nothing shrinks.

### 2.3 Motion

**There is none.** Every change on an operator screen is either the mat's or a measurement's, and
the audience spec's motion signature already makes anything the mat drives instant (audience §2.2).
Moving a diagnostic reading would only delay reading it.

- Opening and closing an operator screen is a **cut**. No `startViewTransition`: the two screens
  share no element, so the rule in audience §2.7 has nothing to move.
- `prefers-reduced-motion` changes nothing here, and in particular **the waveform keeps redrawing**
  (§3.6). It is a reading, not an animation.

### 2.4 Language

Spanish, like the audience window (audience §2.6). Every string this spec fixes lives in one place
in the view code, so wording can change without touching a rule.

One exception is not ours: device labels come from the browser, and before permission is granted
the vendored decoder invents `microphone 1`, `microphone 2`… Those are rewritten to `Micrófono N`,
and any real label is shown exactly as the browser gives it — renaming a real device would hide
which one it is.

---

## 3. Screen 8 — SIGNAL CHECK

The screen system design §10 asks for: live waveform, decoded packets per second, noise, power,
input-device picker, last raw packet bytes, and — when packets do not appear — a screen that names
which link is broken. It is **operator-only**: the audience window never draws it and never learns
it is open. The competitor is at the mat and does not see this screen either, which is why it can
say "no se oye el cronómetro" in as many words.

### 3.1 What it is, and when it opens

**It is a bench, not a view.** `S` takes the whole operator window. While it is open, the mat's
states go **only** to the check: they do not reach the reducer, the snapshot or the audience window.
The event holds where it was, the room keeps the screen it had, and nothing done at the mat —
resetting it, hands, a whole test solve, pulling the cable — reaches the event or the room. `S` or
`Esc` closes it, and the event carries on from where it stopped.

| Phase | `S` |
|---|---|
| STANDBY | opens |
| SCRAMBLE (Mezcla) | opens |
| ARMED, inspection not started | opens, **and the event drops back to SCRAMBLE** |
| ARMED, inspection running | ignored — `Esc` cancels inspection first |
| RUNNING, PENDING | ignored |
| RESULTS, once that phase exists | opens |

**Why ARMED drops back to SCRAMBLE.** ARMED is the one held screen that draws live mat data: the
hands, the green light and the inspection countdown (audience §5.2). Frozen on the projector those
become a lie — a green light that is not lit, a countdown stopped at 9. So opening the check from
ARMED dispatches `disarm` (§4): the phase returns to SCRAMBLE, inspection is cleared, and **the
scramble is kept**, because the competitor has not solved yet and must not be handed a new one. The
room sees Mezcla, which is true. On closing, a mat still at 0.00 re-arms on its next packet, about a
tenth of a second later.

**It never blocks.** The check can be left with two of six items ticked; nothing is enforced, here
or anywhere else. Whether SETUP requires a complete test before the event is SETUP's question.

**It works on the mock driver** (`?driver=mock`), so the whole screen can be rehearsed on a machine
with no microphone (system design §10, and the risk "No mic on this dev machine").

### 3.2 The chain

The verdict is a picture before it is a sentence: five links, left to right, each with one reading.

| # | Link | Reading (`--o-fs-num`) | Detail (`--o-fs-body`) |
|---|---|---|---|
| 1 | MICRÓFONO | `Permitido` · `Sin permiso` · `Sin conectar` | the device's label, or `—` |
| 2 | SONIDO | `−21 dB` | `entra señal` · `nada` |
| 3 | PAQUETES | `10 / s` | `del cronómetro` · `hace 14 s el último` · `ninguno todavía` · `midiendo` |
| 4 | SEÑAL | `Limpia` · `Con ruido` | `ruido 3 %` |
| 5 | PRUEBA | `3 de 6` | `faltan 3` · `completa` |

**Three states, and only three:** good (white, `✓` in a white dot), broken (`--red`, `✕` in a red
dot), and unknown (the unknown violet, a dashed empty dot).

**The first broken link turns red, and everything after it is unknown.** A signal cannot be judged
clean when no packets arrive, so PAQUETES failing puts SEÑAL and PRUEBA in the dashed state. A link
that goes unknown this way loses its reading, which no longer means anything — except PRUEBA, which
keeps its count and reads `en pausa`, because how much of the mat has been proved is a fact about
the mat, not about the signal. PRUEBA is never red: it is a count, not a fault.

**How each reading is measured**, from the driver's `StackmatState` (system design §4):

| Link | Source | Good when |
|---|---|---|
| MICRÓFONO | the driver started, and `navigator.permissions` for `microphone` is not `denied` | both hold |
| SONIDO | `10 · log10(power)`, rounded, clamped at −40 dB | above **−39 dB** |
| PAQUETES | **fresh** states (§4) counted over the last 2 s, reported per second | **≥ 8 / s** |
| SEÑAL | `noise`, 0–1, from the most recent packet, shown as a percentage | **≤ 25 %** |
| PRUEBA | §3.4 | 6 of 6 |

- **Every threshold above is provisional until the hardware session** (roadmap row 10). They are
  constants at the top of one module (§3.10) so that session can retune them in one edit.
- **PAQUETES is the trustworthy link.** SONIDO is the weakest: the decoder's gain control floors
  `power` at 0.0001, so −40 dB is both "silence" and "a very quiet room", and the two cannot be
  told apart. It is kept because a level *well* above the floor with no packets is the single most
  common real failure — the mat on line-in, the browser listening to the built-in microphone.
- **For the first second after the check opens or the device changes**, PAQUETES has no window to
  measure and reads `midiendo` in the unknown state, with its own verdict (§3.3). Without this the
  screen would flash red every time it opened.
- `noise` is pinned to 1 by the decoder whenever the line has been idle for more than 100 bits, so
  SEÑAL reads `Con ruido` on a dead line. That is harmless: PAQUETES breaks first and SEÑAL is
  already unknown.

### 3.3 The verdict

One line (`--o-fs-verdict`) and one sentence (`--o-fs-lead`), under the chain, chosen by the first
broken link. The line is `--red` whenever a link is broken, `#fff` otherwise.

| First broken link | Line | Sentence |
|---|---|---|
| MICRÓFONO, denied | **SIN MICRÓFONO** | El navegador no permite el micrófono. Permítelo y vuelve a abrir esta pantalla. |
| MICRÓFONO, not connected | **CRONÓMETRO SIN CONECTAR** | Pulsa Conectar para empezar a escuchar. |
| SONIDO | **NO ENTRA SONIDO** | No entra nada por esta entrada. Revisa el cable o elige otra entrada. |
| PAQUETES, none | **NO SE OYE EL CRONÓMETRO** | Entra sonido, pero no trae paquetes. ¿Está encendido el cronómetro? ¿Es la entrada de línea? |
| PAQUETES, some | **SE PIERDEN PAQUETES** | Llegan {n} de cada 10. Suele ser el cable o el volumen de entrada. |
| SEÑAL | **SEÑAL CON RUIDO** | Los paquetes llegan sucios. Prueba con menos volumen de entrada, u otro cable. |
| — (still measuring) | **MIDIENDO LA ENTRADA** | Un momento: escuchando el cronómetro. |
| — (test unfinished) | **SEÑAL LIMPIA** | Falta probar: {the missing items, in the order of §3.4}. |
| — (6 of 6) | **TODO LISTO** | El cronómetro se oye y responde. |

The line carries a `✓` before it when nothing is broken and a `✕` when something is, so the verdict
is not colour alone (system design §13: state is conveyed by text as well as colour). **MIDIENDO LA
ENTRADA carries neither**: nothing has been judged yet, and a tick there would claim otherwise.

### 3.4 The mat test

Six items, in this order, each ticking the first time the mat sends it, in any order:

| # | Item | Ticks on |
|---|---|---|
| 1 | Mano izquierda | `leftHand` — header `L`, `C` or `A` |
| 2 | Mano derecha | `rightHand` — header `R`, `C` or `A` |
| 3 | Luz verde | `greenLight` — header `A` |
| 4 | Arranca | `running` becomes true |
| 5 | Para | `was running && !running && time_milli !== 0` |
| 6 | Vuelve a 0.00 | `time_milli === 0` with header `I` or `S`, after item 4 or 5 |

- **Item 5 uses the run state's exact condition**, the one taken verbatim from csTimer (system
  design §5). What the test proves is then what the event depends on, and a reset mid-solve does not
  tick it — the same non-zero guard that keeps a reset from counting as a finish.
- **One hand alone ticks its own item.** This is deliberately unlike the audience screens, where a
  single hand reads as `up` (audience §5.7): here the point is to prove each hand's sensor works.
- **Ticks reset whenever the check opens**, and whenever the input device changes. There is no key
  to clear them: reopening is the way.
- A tick is `✓` in a white filled circle; an untested item is a dashed circle and its label is in
  the unknown violet.

### 3.5 The mat readout

What the mat is saying right now, beside the test.

- **Clock**, `--o-fs-clock`: `formatMs(time_milli)` — `0.00`, `12.47`, `2:14.30` (system design §6).
  `—`, in the unknown violet, when the driver reports `on: false`.
- **State line**, `--o-fs-body`, `.24em`, `--violet`. First match wins:

| Condition | Line |
|---|---|
| `!on` | SIN SEÑAL |
| `running` | CORRIENDO |
| header `A` | LISTO PARA ARRANCAR |
| header `C` | MANOS EN POSICIÓN |
| header `L` or `R` | UNA MANO |
| header `S` | PARADO |
| header `I` | EN ESPERA |

- **Hands and light:** `IZQ` and `DER` pills, filled white with the ground's colour when that hand
  is down, outlined in `--violet-deep` otherwise; between them a circle that fills `--go` with a
  glow while the light is green. This is the only green on any operator screen.
- The loss of signal is the driver's own (`on: false` after about 100 idle bits, ~83 ms), never a
  timer of ours.

### 3.6 The waveform

**Triggered, like an oscilloscope**, decided in `signal-03-wave.html` over free-running snapshots
and a scrolling history: it is the only one where a good signal looks calm, so anything wrong stands
out against the stillness.

- **A 100 ms window**, which is one packet and the idle that follows it at 1200 baud, redrawn **5
  times a second**. Each redraw asks the driver for a fresh sample and only asks again after that
  one arrives.
- **Alignment:** find the start of the last whole packet — an idle run of at least 10 bit-times at
  a constant level, followed by an edge — and draw from 8 bit-times before it. One bit is
  `sampleRate / 1200` samples, and `getSample`'s `bin` (the decoder's binarised signal) is what the
  search reads. **With no packet found, draw the window as delivered**, which is what makes noise
  and hiss look like themselves.
- **Only `raw` is drawn**, in `--violet`, over a 1px centre line in `--violet-deep`, at ±36 % of the
  box's height. `bin` is used for alignment and never drawn.
- **`raw` is the signal after the decoder's gain control**, so its height is normalised and says
  nothing about level. SONIDO is the reading for level; the trace is for shape. A pulled cable draws
  amplified hiss, not a flat line, and that is correct.
- Label: `ONDA · 100 MS`.

### 3.7 The last packet

The last packet's nine or ten bytes as characters, `--o-fs-lead`, spaced: `A 0 0 0 0 0 @ \n \r`.
The running header, a space, is drawn `␣`, and `\n` and `\r` are written out.

Under it, its age: `ahora` below half a second, `hace {n} s` after that. **Once it is stale the
whole block goes to the unknown violet**, so a screen full of old bytes cannot be mistaken for a
live one.

### 3.8 The input picker

The most common real failure is the wrong device (system design §8), so the picker is on this screen
as well as on SETUP.

- Lists `driver.listDevices()` → `[[deviceId, label], …]`, with the `Micrófono N` rewrite from §2.4.
- **Choosing one restarts the mat on that device**, and resets the chain's measurement window and
  the whole test — the readings belong to the device that produced them.
- The choice is **remembered** in the app's storage, so SETUP and the next session start with it.
- The list refreshes on `navigator.mediaDevices.devicechange`.
- **When the mat is not connected at all**, the MICRÓFONO link carries a **Conectar** button instead
  of a reading. The browser will not open audio without a gesture; a click or `Enter` is one. This
  is the same button the engine plan's debug view has, in its designed place.

### 3.9 Layout

Drawn at 1440 × 900 (§2.2). All four rows are full-bleed and separated by 1px `--violet-deep`.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ OPERADOR · COMPROBAR SEÑAL   Evento en espera: …        [S][Esc] volver…  │  header
├───────────────────────────────────────────────────────────────────────────┤
│  (✓)───────(✓)───────(✕)- - - - -( )- - - - -( )                          │
│  MICRÓFONO  SONIDO    PAQUETES    SEÑAL       PRUEBA                      │  the chain
│  Permitido  −33 dB    0 / s       —           3 de 6                      │
│  Entrada…   entra algo  hace 14 s…                en pausa                │
│                                                                           │
│  ✕ NO SE OYE EL CRONÓMETRO                                                │  the verdict
│  Entra sonido, pero no trae paquetes. ¿Está encendido el cronómetro? …     │
├──────────────────────────────────────────────┬────────────────────────────┤
│  ONDA · 100 MS                               │  LO QUE DICE EL CRONÓMETRO │
│  ╷ ╷╷ ╷╷╷╷ ╷╷ ╷╷╷ ╷╷╷╷╷ ╷╷ ╷╷╷╷              │          0.00              │
│  ╵ ╵╵ ╵╵╵╵ ╵╵ ╵╵╵ ╵╵╵╵╵ ╵╵ ╵╵╵╵              │    LISTO PARA ARRANCAR     │
│                                              │     [IZQ]  ( )  [DER]      │
│                                              │                            │
│  ENTRADA              ÚLTIMO PAQUETE         │  PRUEBA DEL CRONÓMETRO     │
│  [Entrada de línea ▾]  A 0 0 0 0 0 @ \n \r   │  ✓ Mano izq.  ✓ Mano der.  │
│                        hace 14 s             │  ✓ Luz verde  ○ Arranca    │
│                                              │  ○ Para       ○ Vuelve a … │
└──────────────────────────────────────────────┴────────────────────────────┘
```

| Element | Value |
|---|---|
| Header | 18px above and below, `--o-gutter` at the sides; title · notice · keys, the notice taking the slack |
| Key pills | `--o-radius`, 1px `--violet-deep`, `--o-fs-body` at weight 700 |
| Chain | five equal columns; a 34px dot per link, joined to the next by a 1px line at the dot's centre (white when the link is good, `--violet-deep` otherwise); the label 14px under the dot, then the reading, then the detail, in the sizes of §2.2 |
| Verdict | the line, then the sentence; 24px under the chain |
| Lower half | two columns, **1.25 : 1**, divided by 1px |
| Waveform | fills the left column's height above its footer |
| Left footer | the picker and the last packet, baseline-aligned |
| Readout | centred in the right column: clock, state line, then the hands row, 22px apart |
| Test | bottom-aligned, **two columns**, reading across: items 1–2, 3–4, 5–6; a 30px circle per item |

### 3.10 Core

Three pure modules, all under `node --test`, none touching the DOM, audio or timers (system
design §3, invariant 3).

```js
// js/core/signal-health.js
diagnose({ permission, connected, deviceLabel, packetTimes, lastState, test, openedAt, now })
  → { links: [{ key, label, status, value, detail }], bad, measuring, verdict: { key, line, sentence } }
// status ∈ 'ok' | 'bad' | 'unknown'; key ∈ 'mic' | 'sound' | 'packets' | 'signal' | 'test'
matLine(lastState)             → the words in §3.5
```

```js
// js/core/mat-test.js
emptyTest()                    → { left, right, green, start, stop, reset, wasRunning }
tickTest(test, matState)       → the next test
missingItems(test)             → the labels still untested, in §3.4's order
```

```js
// js/core/sample.js — reading what getSample() hands back
windowFor(bin, samplesPerBit)  → { start, length, triggered }   the window to draw (§3.6)
lastPacketBytes(bytes)         → the last whole packet's characters, or null (§3.7)
byteText(bytes)                → how they are written on screen
```

`packetTimes` is the timestamps of fresh states inside the window; the view keeps that array and
trims it. `js/ui/signal-check.js` draws, and `js/ui/operator.js` routes the mat to the check while
it is open (§4).

### 3.11 The snapshot

**Unchanged. Nothing about this screen ever reaches the audience window.** No mat state reaches the
reducer while the check is open, so no snapshot follows from the mat and the audience holds the one
it had — which is exactly the design in §3.1.

The one exception is deliberate: a decision made just before the check opened has already scheduled
two re-publishes, when its verdict ends and when the standings update (UI spec §7.5). Those are
timers, not mat packets, so they still fire, and a verdict on the projector finishes on time instead
of freezing mid-way.

### 3.12 Requirements for other screens

1. **NO SIGNAL (screen 7, audience spec §10):** it is what the room holds while the operator
   diagnoses. If the signal was already lost when the check opened, NO SIGNAL can sit on the
   projector for a minute or more. That is a reason for it to be calm rather than alarming, and it
   joins the requirement RESULTS already set (audience §8.9): it must not take over RESULTS.
2. **SETUP (screen 9):** reuses the chain (§3.2), the verdict (§3.3), the picker (§3.8) and the
   remembered device. Its own question is the first-run flow: permission, resume or fresh, and
   whether a complete mat test is required before an event starts.
3. **OPERATOR PANEL (screen 10):** its signal-health meter (system design §8) is this chain
   compressed to one row — the same `diagnose` call, PAQUETES and SEÑAL live during the event — and
   it lists `S` as the way to the full check. This joins the requirements already recorded in
   audience §4.6, §5.6, §7.7 and §8.9.

### 3.13 Edge cases

| Case | Behaviour |
|---|---|
| `S` during inspection, RUNNING or PENDING | Ignored. `Esc` cancels inspection first (§3.1) |
| Opened from ARMED | `disarm`: back to SCRAMBLE, inspection cleared, same scramble (§3.1) |
| A test solve left running when the check closes | Nothing arms: arming needs 0.00 with an idle or stopped header. The next reset arms it |
| Signal lost while the check is open | PAQUETES breaks, the readout reads SIN SEÑAL with `—`, the ticks already earned stay |
| Device unplugged | `devicechange` refreshes the list. The decoder keeps its stream, so MICRÓFONO stays `Permitido` and SONIDO falls to the floor — the sentence points at the cable and the input, which is the right advice either way |
| Permission revoked mid-session | MICRÓFONO breaks with SIN MICRÓFONO, everything after it unknown |
| Mock mode | Works. MICRÓFONO reads `Mock mat`, and the waveform draws the synthesised trace (§4) |
| A second operator window | It never takes the microphone (engine plan decision 8), so its check reads CRONÓMETRO SIN CONECTAR. Connecting there is refused, as everywhere else |
| Window smaller than 1280 × 800 | The page scrolls. Nothing shrinks (§2.2) |
| `prefers-reduced-motion` | No change. The waveform is a reading, not an animation (§2.3) |

### 3.14 Testing

**Pure, `node --test`:**

- `diagnose`: one case per row of §3.3, including `midiendo` inside the first second; the
  first-broken-link order; unknown propagation after a break; PRUEBA never red.
- `mat-test`: each item ticking from the right packet; one hand ticking only its own item; a reset
  mid-solve **not** ticking Para; `Vuelve a 0.00` needing a start or a stop first; `missingItems`
  ordering.
- `run-state`: `disarm` from ARMED returns to SCRAMBLE, clears inspection and **keeps the scramble**
  (`scrambleSeq` unchanged); it is ignored in every other phase.
- `real.js`: `fresh` is true on each decoded packet and **false on the state the decoder re-emits**
  when the signal drops. This extends the existing test against the vendored decoder.
- `keymap`: `s` maps to `signalCheck`.

**Browser smoke** (`npm run smoke`): `S` opens the check; while it is open the audience snapshot
does not change although the mock keeps playing; `Esc` returns to the event in the phase it left.

---

## 4. Changes to the implementation plans

The engine plan (`plans/2026-09-18-tournament-engine.md`) deferred "the signal-check screen and its
`S` key (screen 8)" to a later plan, and that still holds — the screen itself, its two core modules
and its view belong to the **operator screens plan** (screens 8–10), which is roadmap Phase 2 row 9
plus row 5's panel. But four things this screen needs live in code the engine plan already writes,
so that plan is amended, as it was for PENDING (audience §9).

**Engine plan:**

1. **Task 13 (the real driver): `fresh` on every state — a bug, not a feature.** When the line goes
   idle or the signal drops, the decoder **re-emits its last state object, mutated**
   (`vendor/stackmat.js` lines 202–213; the Moyu path at 322–332 does the same). `real.js` copies
   every state, which erases the
   one thing that distinguishes a re-emission from a packet: its identity. Counting callbacks would
   report about 2 packets a second from a mat unplugged a minute ago. The driver compares the object
   against the previous one *before* copying and sets `fresh`, and PAQUETES counts only fresh states.
2. **Tasks 8–9 (the run state): a `disarm` command.** ARMED → SCRAMBLE, `inspectionStartedAt` and
   `inspectionMs` cleared, `scramble`, `scrambleSeq`, `attemptNo` and `teamIndex` untouched. Ignored
   in every other phase. Nothing else dispatches it today (§3.1).
3. **Task 10 (the keymap): `s` → `signalCheck`.** It is not a reducer command: the operator shell
   opens and closes the check, and dispatches `disarm` first when the phase is ARMED. The keymap
   returns it in every phase; the shell applies §3.1's table.
4. **Task 12 (the mock driver): `getSample` synthesises a trace** instead of returning empty arrays,
   and each scripted packet is `fresh`. Without this the check cannot be rehearsed on this machine
   at all. The encoder it needs — a packet's bytes and those bytes as 1200-baud bits — joins
   `js/drivers/scenarios.js`, beside the packet shape it already owns. It is deliberately **not**
   shared with `test/helpers/stackmat-signal.js`: that helper is what feeds the real decoder in its
   test, and if both sides of that test came from one encoder, the test would prove nothing.
Task 17 needs no amendment: the routing seam — one flag in `js/ui/operator.js`, and the mat going
to the check instead of to `dispatch` — belongs to the screen's own plan, which is the first thing
that can use it. The debug view is unaffected either way, and stays until screen 10 replaces it.

**The screen's plan, `plans/2026-09-19-signal-check.md`** (written 2026-09-19): the three core
modules, `css/operator.css` with §2's tokens, `js/ui/signal-check.js`, the seam in the operator
window, and the browser checks that prove the bench. It runs after the engine plan and is
independent of the audience screens plans. SETUP and the OPERATOR PANEL get their own plan once they
are designed.
