# Tournament Display — Operator UI Design

**Date:** 2026-09-19
**Status:** In progress — written screen by screen. **SIGNAL CHECK** (screen 8) and **SETUP** (screen 9) are approved; OPERATOR PANEL (10) is not yet designed
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
| 9 SETUP | ✅ Approved | **`setup-01-layout.html`** (layout A, the lean launchpad); `setup-02-firstrun.html` (opening state C, the fourth link state and the announced step) |
| 10 OPERATOR PANEL | Not yet designed | — |

SIGNAL CHECK asks for four changes to the engine plan, one of which is a bug that plan would
otherwise ship. They are in §5.

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
| SETUP, before the event exists | opens, and `S` / `Esc` return **to SETUP** — the only case with no phase to restore (§4.14) |

**Why ARMED drops back to SCRAMBLE.** ARMED is the one held screen that draws live mat data: the
hands, the green light and the inspection countdown (audience §5.2). Frozen on the projector those
become a lie — a green light that is not lit, a countdown stopped at 9. So opening the check from
ARMED dispatches `disarm` (§5): the phase returns to SCRAMBLE, inspection is cleared, and **the
scramble is kept**, because the competitor has not solved yet and must not be handed a new one. The
room sees Mezcla, which is true. On closing, a mat still at 0.00 re-arms on its next packet, about a
tenth of a second later.

**It never blocks.** The check can be left with two of six items ticked; nothing is enforced *on
this screen*. SETUP answered the question it was left: a **fresh** event is gated on a live signal
and 6 of 6, a **resume** is gated on nothing (§4.2). Mid-event — which is when this screen is open —
nothing is ever enforced.

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

**Four states, and only four:** good (white, `✓` in a white dot), broken (`--red`, `✕` in a red
dot), unknown (the unknown violet, a dashed empty dot), and **waiting** (an empty dot with a solid
1.5px white ring, matching the dashed ring's weight) — *this is where you are*. Only MICRÓFONO
produces `waiting`, and only when the
driver has not been started and permission is not `denied`; it was added by SETUP, and §4.3 gives
the reasoning.

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
| PAQUETES | **fresh** states (§5) counted over the last 2 s, reported per second | **≥ 8 / s** |
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
| MICRÓFONO, not connected *(waiting, not broken)* | **CRONÓMETRO SIN CONECTAR** | Pulsa Conectar para empezar a escuchar. On SETUP a second sentence follows in the unknown violet (§4.4) |
| MICRÓFONO, refused — another window holds the mic | **OTRA VENTANA TIENE EL MANDO** | Ya hay una ventana de operador abierta. Cierra esta y vuelve a la otra. |
| SONIDO | **NO ENTRA SONIDO** | No entra nada por esta entrada. Revisa el cable o elige otra entrada. |
| PAQUETES, none | **NO SE OYE EL CRONÓMETRO** | Entra sonido, pero no trae paquetes. ¿Está encendido el cronómetro? ¿Es la entrada de línea? |
| PAQUETES, some | **SE PIERDEN PAQUETES** | Llegan {n} de cada 10. Suele ser el cable o el volumen de entrada. |
| SEÑAL | **SEÑAL CON RUIDO** | Los paquetes llegan sucios. Prueba con menos volumen de entrada, u otro cable. |
| — (still measuring) | **MIDIENDO LA ENTRADA** | Un momento: escuchando el cronómetro. |
| — (test unfinished) | **SEÑAL LIMPIA** | Falta probar: {the missing items, in the order of §3.4}. |
| — (6 of 6) | **TODO LISTO** | El cronómetro se oye y responde. |

The line carries a `✓` before it when nothing is broken and a `✕` when something is, so the verdict
is not colour alone (system design §13: state is conveyed by text as well as colour). **MIDIENDO LA
ENTRADA and CRONÓMETRO SIN CONECTAR carry neither**: nothing has been judged yet, and a tick there
would claim otherwise. `CRONÓMETRO SIN CONECTAR` is therefore **not red** — its link is `waiting`,
not broken (§3.2, §4.3). `OTRA VENTANA TIENE EL MANDO` is red and carries a `✕`, because there the
microphone is genuinely unavailable rather than merely unstarted.

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
it is open (§5).

### 3.11 The snapshot

**Unchanged. Nothing about this screen ever reaches the audience window.** No mat state reaches the
reducer while the check is open, so no snapshot follows from the mat and the audience holds the one
it had — which is exactly the design in §3.1.

The one exception is deliberate: a decision made just before the check opened has already scheduled
two re-publishes, when its verdict ends and when the standings update (UI spec §7.5). Those are
timers, not mat packets, so they still fire, and a verdict on the projector finishes on time instead
of freezing mid-way.

### 3.12 Requirements for other screens

1. **NO SIGNAL (screen 7, audience spec §10):** ✅ **answered there, and narrowed.** NO SIGNAL
   exists over **ARMED and RUNNING only**, so it is usually *not* what the room holds while the
   operator diagnoses: a pre-event check, or one between competitors, leaves ATTRACT or STANDBY on
   the projector unchanged, with no marker of any kind. When the signal did die mid-attempt it can
   sit there for a minute or more, which is why it is calm — no red words, and no repair steps,
   since the person who can act on them is reading this screen instead. It cannot take over RESULTS
   (audience §8.9) because it cannot appear there at all.
2. **SETUP (screen 9):** ✅ **answered in §4.** It reuses the chain (§3.2), the verdict (§3.3), the
   picker (§3.8) and the remembered device. Its own question — permission, resume or fresh, and
   whether a complete mat test is required before an event starts — is settled there: a fresh event
   is gated on a live signal and 6 of 6, a resume is gated on nothing (§4.2). It also adds a fourth
   link state and splits one verdict row, both of which land back in this screen (§4.13).
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
| Mock mode | Works. MICRÓFONO reads `Mock mat`, and the waveform draws the synthesised trace (§5) |
| A second operator window | It never takes the microphone (engine plan decision 8), so its check reads **OTRA VENTANA TIENE EL MANDO**, red (§3.3). Connecting there is refused, as everywhere else — which is why this case is red and an unstarted mat is not (§4.3) |
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

## 4. Screen 9 — SETUP

The first screen of the day, and the last one before the event exists. The roadmap calls it the
place "where most real failures surface", and system design §8 asks for a blocking setup screen when
the microphone is denied. It reuses the chain (§3.2), the verdict (§3.3) and the picker (§3.8), and
adds the only two questions that are its own: **which event**, and **is the mat proved**.

### 4.1 What it is, and when it opens

**It opens on every load, and it is one-way.** There is no key back to it. Once the operator leaves
— by resuming or by starting fresh — the device picker lives in the operator panel (§4.14) and `S`
opens SIGNAL CHECK. Nothing on SETUP is needed again that those two do not carry.

**One screen, not a wizard.** Chain, picker, test and both actions are on it from the first frame,
all measuring. The gate is a state the operator can see, not a refusal they collide with: the action
that is not available is drawn as unavailable, and the verdict sentence already names what is
missing. Nothing is sequenced, which matches §2.3 — this window has no motion and no steps.

**It is not a bench.** SIGNAL CHECK holds the event where it was and returns to it (§3.1). SETUP
precedes the event: there is nothing to hold, and nothing to return to.

### 4.2 The gate

Asymmetric, and deliberately so.

| Action | Available when |
|---|---|
| **Reanudar evento** | a saved event with at least one recorded attempt exists, **and this window holds the operator lock**. Nothing else |
| **Empezar evento nuevo** | MICRÓFONO, SONIDO and PAQUETES are all good **and** the test is 6 of 6 |

**Why fresh is gated.** Before the event there is time, and an untested mat is the one failure that
cannot be recovered from with thirteen universities watching. Proving it costs about fifteen seconds
at the mat (§4.8).

**Why resume is not.** A resume happens after a crash, a closed tab or a sleeping laptop — often
*because* something went wrong. A door that demands a clean signal would lock the operator out at
the exact moment they most need in, and they would be doing a test solve in front of the room.

**Why resume asks for no hardware at all, not even a microphone.** Recorded results are already on disk,
and the only way to reach them — to read standings or to export (system design §7) — is through the
event. Making that depend on working hardware means a dead mat can strand results that are sitting
in `localStorage`. This is looser than "a resume needs a working mic": the looser rule is the right
one, because the failure it prevents is worse than the one it allows.

**SEÑAL does not gate.** Noise is a warning with its own sentence, not a stop. A mat that is sending
clean packets through a noisy line still runs an event, and §2.1 is explicit that there is no
warning colour to escalate it with.

**PAQUETES gates even though 6 of 6 implies it.** The ticks reset whenever the device changes
(§3.4), so a full test does prove packets flowed recently — but not that they are flowing *now*. A
cable pulled between the test and the button is exactly the case this catches.

### 4.3 The chain, and a fourth state

SETUP draws the chain of §3.2 unchanged, with one addition that §3.2 must also learn.

**`waiting` — a solid white ring, empty, neither filled nor dashed.** It means *this is where you
are*: the link is not good, not broken, and not unmeasured — it is waiting for the operator. Only
MICRÓFONO produces it, and only when the driver has not been started yet and permission is not
`denied`.

**Why this is not simply red.** Read literally, §3.3 makes an unstarted microphone the first broken
link, so the first screen of the day would be a red fault that means "press the button". Red is the
only colour in this window that says something is wrong (§2.1), and spending it on "you have not
started" teaches the operator, on their very first screen, that red is not urgent. The fourth state
costs one rule; the alternative costs red its meaning.

**Red is kept for the two cases that have earned it:** permission actually `denied`, and a second
operator window, where connecting is refused rather than pending (§4.13).

The other four links are `unknown` until the mat is connected, exactly as §3.2 already specifies for
everything after a break. PRUEBA reads `0 de 6`.

### 4.4 The verdict

The table of §3.3 applies unchanged, with one row re-pointed and one row added (§4.13). On SETUP the
common opening verdict is:

| Condition | Line | Sentence |
|---|---|---|
| Not connected, connectable | **CRONÓMETRO SIN CONECTAR** | Pulsa Conectar para empezar a escuchar. *El navegador te pedirá permiso para usar el micrófono.* |

- The line carries **no `✕` and is not red**, because nothing is broken — this is the `waiting`
  state of §4.3. It also carries no `✓`: nothing has been judged. This matches how §3.3 already
  treats **MIDIENDO LA ENTRADA**.
- The second sentence is in the unknown violet, and it exists because system design §8 asks that the
  gesture audio requires be **"a step, not a surprise"**. The browser's own permission prompt is the
  most surprising thing that happens on this screen; announcing it is the cheapest possible fix.

Once connected, the verdict is §3.3's, unmodified: **SEÑAL LIMPIA** with the missing items while the
test is incomplete, **TODO LISTO** at 6 of 6, and the red rows whenever a link actually breaks.

### 4.5 The event block

Top of the left column. It answers "which event" before the operator is asked to choose.

The store answers with one of three statuses — `none`, `ok` or `corrupt` (engine plan, Task 14) —
and the block has a state for each.

| Store says | Reading (`--o-fs-num`) | Detail (`--o-fs-body`, `--violet`) |
|---|---|---|
| `ok` | `7 de 13 universidades` | `19 intentos registrados · la última, UNAPEC, hace 14 min` |
| `none`, or `ok` with zero attempts | `No hay nada guardado` | `Este será el primero` |
| `corrupt` | `Hay un evento guardado` | `No se puede leer. Empezar uno nuevo lo archiva sin borrarlo.` |
| Mock (`?driver=mock`) | as above | prefixed `Ensayo · ` |

- All of it comes from code the engine plan already writes: the attempt log's length,
  `startedCount`, and `at` on the last attempt. **No engine amendment is needed.**
- With nothing saved, the block is drawn in the unknown violet with a **dashed** 1px border, and the
  Reanudar button is not drawn at all — not drawn-and-disabled. There is nothing to explain.
- **`corrupt` is drawn in `--red`**, and it is the one state where the block itself reports a
  problem. It must never be shown as "nothing saved": results exist, and telling the operator
  otherwise invites them to start fresh over an event they cannot see. **Reanudar is not drawn**
  (there is nothing parseable to resume), and **Empezar evento nuevo archives rather than clears,
  even in mock mode** — an unreadable log is the one case where the bytes might still be recovered
  by hand.

### 4.6 Starting fresh

`Empezar evento nuevo` ends the saved event. **A real event is archived; a rehearsal is not.**

The engine's store already writes the outgoing log to a timestamped key — `store.archive(now)`,
whose own comment reads *"starting fresh never destroys anything"*. That is kept for real events:
it is invisible, costs a few kilobytes, and no screen ever lists it, so it is not the junkyard that
a "previous event" slot in the interface would have been.

**Mock mode clears instead of archiving.** This project runs many rehearsals, and archiving each
one would grow `localStorage` without bound for no possible benefit — a rehearsal's results can
never be wanted back. `?driver=mock` therefore removes its key outright. This is the same
distinction the typed confirm makes, and for the same reason.

**A real event requires the count typed.** The button's second state names what is about to be lost
and asks for the number of recorded attempts — `19` — before it arms. A number that changes every
time forces the sentence to be read; a fixed word becomes muscle memory.

**Mock mode is exempt.** `?driver=mock` saves under its own storage key and can never touch a real
event's results (engine plan decision 11). A rehearsal clears on a single press, with no typing.
This is what keeps the typed confirm worth having: it is performed two or three times in the life of
the project rather than twenty, so it is still read when it appears.

Cancelling is clicking anywhere else. There is no modal.

### 4.7 The picker and the remembered device

§3.8 unchanged, including the `Micrófono N` rewrite (§2.4), the restart-on-choice, and the
`devicechange` refresh. Two things are SETUP's own:

- **Before connecting**, the picker is drawn dashed in the unknown violet and reads `Elige una
  entrada al conectar`. The browser does not give real device labels until permission is granted
  (§2.4), so a list of invented names before the prompt would be worse than no list.
- **The remembered device is applied on connect**, not offered. If the stored device is gone, the
  browser's default is used and the picker shows what was actually opened.

### 4.8 The mat test on SETUP

The six items of §3.4, unchanged, with the same reset-on-device-change rule.

**It is satisfiable alone.** Both hands down, green light, lift, slap, reset — about fifteen seconds
at the mat, with no competitor and no cube. This matters because it gates starting: a gate that
needed a second person would be a gate that gets worked around.

**One title, not two.** The list is always `PRUEBA DEL CRONÓMETRO`. While it is incomplete it
carries the line `Se marcan solos mientras usas el cronómetro.` in `--o-fs-body`, which is what
keeps six dashed circles from reading as six failures. *This normalises the approved mockup, which
retitled the list to "Lo que hay que probar" before anything was ticked; a label that changes under
the operator is worse than the problem it solves, and §1 gives this spec the last word.*

### 4.9 Layout

Drawn at 1440 × 900 (§2.2). Header, chain and verdict are §3.9's, unchanged.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ OPERADOR · PREPARAR   Nada de esto llega a la sala todavía   [S] señal…   │  header
├───────────────────────────────────────────────────────────────────────────┤
│  ( )───────( )- - - - -( )- - - - -( )- - - - -( )                        │
│  MICRÓFONO  SONIDO     PAQUETES    SEÑAL       PRUEBA                     │  the chain
│  Sin conectar  —        —           —          0 de 6                     │
│  [Conectar]                                                               │
│                                                                           │
│  CRONÓMETRO SIN CONECTAR                                                  │  the verdict
│  Pulsa Conectar para empezar a escuchar. El navegador te pedirá permiso…   │
├──────────────────────────────────────────────┬────────────────────────────┤
│  ┌────────────────────────────────────────┐  │  LO QUE DICE EL CRONÓMETRO │
│  │ EVENTO                                 │  │            —               │
│  │ No hay nada guardado                   │  │        SIN SEÑAL           │
│  │ Este será el primero                   │  │    [IZQ]  ( )  [DER]       │
│  └────────────────────────────────────────┘  │                            │
│  ENTRADA                                     │  PRUEBA DEL CRONÓMETRO     │
│  [Elige una entrada al conectar ▾]           │  ○ Mano izq.  ○ Mano der.  │
│                                              │  ○ Luz verde  ○ Arranca    │
│  ┌ Empezar evento nuevo ─────────────────┐   │  ○ Para       ○ Vuelve a … │
│  └ Primero hay que conectar y probar ────┘   │  Se marcan solos mientras… │
└──────────────────────────────────────────────┴────────────────────────────┘
```

| Element | Value |
|---|---|
| Lower half | two columns, **1.25 : 1**, divided by 1px `--violet-deep`; 24px and `--o-gutter` padding |
| Left column | the event block, then the picker, then the actions **pinned to the bottom** |
| Right column | the readout centred (clock, state line, hands row, 22px apart), the test **bottom-aligned**, two columns reading across |
| Event block | 1px `--violet-deep`, `--o-radius`, 18px 20px. Dashed in the unknown violet when nothing is saved |
| Buttons | full width, 16px 18px, `--o-radius`, `--o-fs-lead`, weight 800. Primary: `#fff` fill, `--bg-deep` text |
| A gated button | transparent, unknown violet, **1.5px dashed** — the same vocabulary as an untested item |
| The reason line | unknown violet, 14px, centred, 8px under the gated button |
| Conectar | on the MICRÓFONO link where its reading would be: 9px 18px, `--o-fs-body`, `#fff` fill |

### 4.10 Keys

| Key | Does |
|---|---|
| `Enter` | presses **Conectar** while nothing is connected — the only action on the screen at that point |
| `S` | opens SIGNAL CHECK, which returns to SETUP rather than to an event (§4.13) |
| `Esc` | nothing **on SETUP itself** — there is nothing to cancel and nowhere to go back to. Inside SIGNAL CHECK opened from here, `Esc` still closes it and returns to SETUP (§3.1) |

### 4.11 Core

One new pure module. Everything else is §3.10's, reused.

```js
// js/core/setup-gate.js
setupGate({ diagnosis, test, saved, mock, canConnect })
  → { resume: { shown, enabled },
      fresh:  { shown, enabled, why, confirm, count, archive } }
      // confirm ∈ 'none' | 'typed'        archive: keep the outgoing log, or drop it (§4.6)
savedSummary(loaded) → null | { corrupt: true } | { started, attempts, lastTeamId, lastAt }
```

`loaded` is the store's own answer, `{ status: 'none' | 'ok' | 'corrupt', attempts? }` — SETUP does
not reach past it into `localStorage`. `savedSummary` returns `null` for `none` **and** for `ok`
with no attempts, which is what collapses those two into one case (§4.5), and `{ corrupt: true }`
for a log that exists but cannot be parsed, which must stay distinguishable from both.

`setupGate` reads `diagnosis.links` and re-measures nothing.

### 4.12 The snapshot

**Nothing on SETUP reaches the audience window**, for the same reason as §3.11: there is no event
yet to describe. The audience holds ATTRACT (audience §3), which is the correct pre-event screen and
is what the room should be looking at while the operator is at the mat.

The first snapshot of the session is published by the action taken: **Reanudar** publishes the
resumed standings so a reopened audience window catches up, and **Empezar evento nuevo** publishes
an empty event.

### 4.13 What this changes in SIGNAL CHECK

Two amendments to an approved screen, both small and both improvements to it:

1. **§3.2 gains the `waiting` state** (§4.3). SIGNAL CHECK reaches it in one case — opened before
   the mat has ever been connected — where it currently shows red for something nobody has attempted
   yet.
2. **§3.3's "MICRÓFONO, not connected" row splits in two.** `CRONÓMETRO SIN CONECTAR` keeps the
   connectable case and loses its red and its `✕`. The refused case — a second operator window,
   which never takes the microphone (engine plan decision 8) — gets its own red row, because there
   connecting is not pending, it is impossible:

| First broken link | Line | Sentence |
|---|---|---|
| MICRÓFONO, refused | **OTRA VENTANA TIENE EL MANDO** | Ya hay una ventana de operador abierta. Cierra esta y vuelve a la otra. |

   §3.13's row for a second operator window points here instead of at `CRONÓMETRO SIN CONECTAR`.

### 4.14 Requirements for other screens

1. **OPERATOR PANEL (screen 10):** it carries the device picker, because SETUP is one-way (§4.1).
   This is the same requirement the roadmap's microphone risk already records and that §3.12.3
   restates; SETUP is now the reason it is not optional.
2. **SIGNAL CHECK (screen 8):** opened from SETUP, `S` and `Esc` return to SETUP, not to an event.
   This is a third entry in §3.1's table, and it is the only one where there is no phase to restore.

### 4.15 Edge cases

| Case | Behaviour |
|---|---|
| Permission denied | MICRÓFONO **red**, `SIN MICRÓFONO` (§3.3). A real fault: the fourth state does not apply |
| A second operator window | MICRÓFONO red, `OTRA VENTANA TIENE EL MANDO` (§4.13). Both actions are gated |
| Saved event with zero attempts | Counts as nothing saved: no Reanudar button, no typed confirm (§4.5) |
| **Saved log unreadable** (`corrupt`) | The block turns red and says so. No Reanudar. `Empezar evento nuevo` **archives**, in mock mode too, and needs no typed count — there is no count to type (§4.5, §4.6) |
| Starting fresh on a real event | The outgoing log is archived to a timestamped key by `store.archive(now)` — silent, listed nowhere (§4.6) |
| Starting fresh in mock mode | The key is removed outright. Rehearsals never accumulate (§4.6) |
| Device changed at 5 of 6 | The ticks reset (§3.4) and the fresh gate closes again. Correct: the test belongs to the device that produced it |
| Cable pulled after 6 of 6 | PAQUETES breaks, the fresh gate closes, the ticks **stay**. Reconnect and it reopens without retesting |
| Mock mode | Fresh needs no typed confirm; the event block is prefixed `Ensayo ·`; the test and the chain work exactly as on a real mat (§3.1) |
| Stored device is gone | The browser's default is opened and the picker shows what was actually opened (§4.7) |
| Window smaller than 1280 × 800 | The page scrolls. Nothing shrinks (§2.2) |
| `prefers-reduced-motion` | No change. There is no motion on this screen (§2.3) |

### 4.16 Testing

**Pure, `node --test`:**

- `setupGate`: resume enabled on any event with ≥ 1 attempt and disabled on zero; fresh gated until
  MICRÓFONO, SONIDO and PAQUETES are good **and** the test is 6 of 6; fresh's `confirm` is `'typed'`
  on a real driver and `'none'` on the mock; `count` equals the saved attempt count.
- `savedSummary`: `null` for zero attempts; `started` matches `startedCount(event, null)`.
- `diagnose`: MICRÓFONO is `waiting` when not started and permission is not denied; `bad` when
  denied; `bad` with the refused verdict when another window holds the lock.

**Browser smoke** (`npm run smoke`): SETUP is the first screen on load; `Enter` presses Conectar;
with the mock driver the chain reaches all-good and the test reaches 6 of 6, at which point
`Empezar evento nuevo` becomes available and clears without a typed confirm; `S` opens SIGNAL CHECK
and returns to SETUP.

---

## 5. Changes to the implementation plans

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
independent of the audience screens plans. The OPERATOR PANEL gets its own plan once it is designed.

### 5.1 What SETUP (§4) adds, written 2026-09-19

**The signal-check plan** (`plans/2026-09-19-signal-check.md`) is amended, because SETUP and SIGNAL
CHECK share `diagnose` and neither can hold a private copy of it:

1. **Task 2 (the diagnosis): a fourth status, `waiting`.** MICRÓFONO returns it when the driver has
   never been started and permission is not `denied` (§4.3). It is not `bad`, so it does not break
   the chain and everything after it stays `unknown` for the ordinary reason rather than the
   first-broken-link reason.
2. **Task 2: `diagnose` learns whether connecting is possible.** A second operator window cannot
   take the microphone, so its MICRÓFONO is `bad` with the new verdict **OTRA VENTANA TIENE EL
   MANDO** (§4.13), not `waiting`. This is the one distinction that keeps red meaning "wrong"
   rather than "not yet".
3. **Task 5 (the screen): the `waiting` dot** — an empty dot with a solid 1.5px white ring, beside
   the existing filled, red and dashed ones.

**The operator screens plan (screens 9–10)**, not yet written, carries SETUP itself: one new pure
module `js/core/setup-gate.js` (§4.11), the view, and the routing that makes SETUP the first screen
on load and one-way out of (§4.1).

**The engine plan needs no amendment for the event block.** `savedSummary` (§4.11) reads
`event.attempts.length`, `startedCount(event, null)` and `at` on the last attempt — all three are
already written by that plan (Tasks 5 and 14).

**Two things to confirm against the engine as built**, rather than assumed:

- **Task 13 (the real driver): "never started" must be distinguishable from "started and failed."**
  The `waiting` state depends on it. Engine decision 12 already has the driver checking
  `navigator.permissions` *after* it starts, which covers the failed case but says nothing about the
  unstarted one.
- **Task 15 (window sync): whether this window holds the operator lock must be readable by the UI.**
  The **OTRA VENTANA TIENE EL MANDO** verdict needs it. Decision 8 establishes the Web Lock; what is
  unconfirmed is whether its outcome is exposed rather than only enforced.

If either is missing, it is a small addition to the engine plan of the same kind as the four SIGNAL
CHECK asked for above — not a redesign of this screen.
