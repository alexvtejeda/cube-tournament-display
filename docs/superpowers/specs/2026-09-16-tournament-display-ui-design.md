# Tournament Display — UI Design

**Date:** 2026-09-16
**Status:** In progress — written screen by screen. **ATTRACT**, **STANDBY**, **ARMED** and **RUNNING** are approved; the other six screens are not yet designed
**Scope:** Audience-window screens: layout, copy, visual values, and the data each screen needs from the core
**Companion spec:** [`2026-09-15-tournament-display-system-design.md`](2026-09-15-tournament-display-system-design.md) (architecture, run loop, scoring, persistence). This is the `tournament-display-ui-design` spec its §13 defers to.

---

## 1. How to read this spec

Every screen is designed in the visual companion and approved there. The mockups live in
`.superpowers/brainstorm/tournament-display/content/`, which is **gitignored by choice**, so this
document transcribes every value a screen depends on. The mockup files are the visual reference.
If this spec and a mockup disagree, **this spec wins**.

All sizes are in `cqw`, where 1cqw is 1% of the audience window's width. At 1920×1080 the canvas is
**100 × 56.25cqw**, and everything scales with the projector's resolution. The only pixel values
left are deliberate: 1px divider lines, and ATTRACT's logo glow, which was approved in px. A `1rem`
radius introduced during STANDBY was converted to `cqw` for this reason (§2.2).

| Screen | Status | Mockup (visual reference) |
|---|---|---|
| 1 ATTRACT | ✅ Approved | `attract-DECIDED.html` |
| 2 STANDBY | ✅ Approved | **`standby-09-final.html`** (v9) |
| 3 ARMED | ✅ Approved | **`armed-04-final.html`** (clock size superseded, §5.9) |
| 4 RUNNING | ✅ Approved | **`running-06-final.html`** |
| 5–10 | Not yet designed | — |

---

## 2. Shared system

These values are shared by every audience screen designed so far. New screens reuse them before
adding anything.

### 2.1 Colour

The palette is the CTF Interuniversitario site's own (`../ctf-interuniversitario/public/assets/css/`),
plus exactly one new value (locked decision 10).

| Role | Value | Source |
|---|---|---|
| Ground | `--bg-deep #02010c` | site token |
| Dividers, plate border | `--violet-deep #231f66` | site token |
| Labels, secondary text, rank numbers, ARMED's waiting countdown | `--violet #aba6f7` | site token |
| Leader row | `--gold-text #ffea95` | site token |
| Mascot glow | `--red #EE2737` at 30% | site token |
| RUNNING's clock and status line past the cutoff | `--red #EE2737` | site token |
| Plate fill | `#f7f7f7` | site literal (`--grad-lavender`, `sections.css`) |
| Standings names | `#e8e6ff` | site literal (`sections.css`) |
| Primary text | `#fff` | — |
| Logo glow | `rgba(124,92,255,…)` (`#7c5cff`) | the site maze's wall colour |
| **Mat go light only** | `--go #2ee6a0` | **the one new value** |

- **`--go` is reserved for the mat's green light.** No idle or status element may use it. The
  STANDBY draft used it for a "CRONÓMETRO LISTO" label; that label was removed. ARMED is the only
  screen so far that uses it, and only while the light is green (§5.2). RUNNING never does (§6.1).
- **`--red #EE2737` has one text role: RUNNING past the cutoff** (§6.1). It was offered and declined
  for ARMED's +2 and DNF (§5.2), which stay words only.
- **`--gold #d4aa06` has no role.** It was declined for ARMED's +2, and again for a warning step
  before RUNNING's cutoff (§6.1).
- The only colours outside this palette are the cube preview's sticker colours, which come from
  csTimer (§4.5).
- Contrast on `--bg-deep`: `--violet` 9.41:1 · `#e8e6ff` 16.99:1 · `--gold-text` 17.24:1 · `--go`
  12.79:1 · `--red` 4.92:1, above AA's 4.5:1 even for body-size text. `--violet-deep` is **1.44:1**
  and must never carry text.

### 2.2 Tokens

```css
--radius:    1.26cqw;  /* plates and the leader-row highlight */
--fs-label:  1.05cqw;  /* spaced uppercase labels */
--fs-body:   1.38cqw;  /* header, standings rows, names, sub-lines */
--fs-lead:   2.2cqw;   /* ATTRACT tagline, scramble */
--fs-hero:   4.4cqw;   /* big figures: attempt number, best time (2 × lead) */
--fs-clock:  13.6cqw;  /* the clock and the inspection countdown */
```

- **Radius.** It was set as `1rem` during design, then converted: `1rem` is a fixed 16px, which is
  1.26cqw at the mockup's width but 0.83cqw at 1920px, so the projector would have shown noticeably
  sharper corners than the approved mockup. `1.26cqw` scales with the screen. One radius, used
  everywhere a radius appears.
- **Type.** Five sizes. `1.38` and `2.2` come from ATTRACT's own scale (~1.6× per step), and `4.4`
  is 2 × `2.2`. `13.6` was set by eye at full screen while RUNNING was designed (2026-09-19). It
  replaced `17.6` (4 × `4.4`), which was bigger than the clock needed, and it follows no ratio on
  purpose. The STANDBY draft's 1.25 / 1.45 / 1.5 all collapsed into `--fs-body`.
- **Weights:** 500 for body text and the scramble · 700 for rank numbers and the ATTRACT tagline ·
  800 for big figures, the clock, the leader row and the featured standings row. Spaced uppercase
  labels and ARMED's status line use the regular weight.
- **Letter-spacing:** `.24em` labels and ARMED's status line · `.14em` uppercase body text ·
  `.28em` / `.2em` ATTRACT tagline / footer · `-.01em` big figures · `-.02em` the clock.
- **Font:** `roc-grotesk-variable` from Adobe Fonts kit `use.typekit.net/frw4sme.css`, with the
  fallback stack `"roc-grotesk", system-ui, sans-serif` (locked decision 9).
- **Tabular figures: verified on 2026-09-16, risk closed.** With the kit loaded in Chrome, all ten
  digits have the same advance width at weight 500 (120.81px at 200px) and at weight 800
  (127.02px), **with and without** `tabular-nums`. roc-grotesk's default figures are already
  tabular, so a running clock cannot jitter and no mono fallback is needed. Every time still sets
  `font-variant-numeric: tabular-nums`, which costs nothing and covers the fallback stack.
- **Motion:** no project-wide motion signature yet. It will be decided on a screen that needs one,
  most likely PENDING. Screens so far use only the maze and ATTRACT's logo pulse. ARMED and RUNNING
  add none: their changes are instant, because ARMED's green must match the physical light and
  RUNNING's red must match the moment the clock passes the cutoff.

### 2.3 University plate

One component, used by ATTRACT, STANDBY and ARMED.

```css
.plate { display:flex; align-items:center; justify-content:center;
         background:#f7f7f7; border:1px solid #231f66; border-radius:var(--radius); }
.plate img { width:100%; height:auto; display:block; }
```

- Logos are `assets/universidades/<id>.png`, all **611 × 229** (2.67:1), and every one already
  contains its university's name. **Never put a plate next to a text acronym;** it would say the
  same thing twice.
- Padding scales with the plate: `.75cqw 1.1cqw` on ATTRACT (12.7cqw wide) and ARMED (13cqw wide),
  and `1.3cqw 1.9cqw` on STANDBY (22cqw wide, ×1.73).

### 2.4 Mascot asset

`assets/rootkitty-face.svg` was **replaced on 2026-09-16** with a new peeking crop of RootKitty's
face: viewBox `68.14 × 61.83`, cut flat just below the nose, clean (7.6 KB). The **flat cut sits
13.6% of the image height above the bottom** of the viewBox, which is empty. To seat the cut on an
edge, offset by `0.136 × 61.83/68.14 = 0.1234 × width`.

- **ATTRACT keeps the previous crop** (viewBox `958 390 680 480`, 99 unused glyph defs), restored
  from `1bbe2b4` as `assets/rootkitty-face-attract.svg` (decided 2026-09-18, §3.4). The new crop is
  the band mascot on STANDBY and ARMED.
- This supersedes system design §11, which lists `rootkitty-face.svg` as unused.

### 2.5 Maze

`vendor/hero-maze3d.js` renders into a full-bleed canvas at the bottom of the stack. It runs live on
ATTRACT, STANDBY and ARMED, and is frozen only during RUNNING (locked decision 8). On ARMED that was
a choice: it keeps moving through inspection and freezes the moment the solve starts. Only one maze
can run per page (it looks up `#hero-canvas` by id) until the `createMaze({canvas})` refactor lands.

### 2.6 Wording

Spanish throughout.

- **DNF** is the audience word for a single attempt with no valid time (ARMED §5.2, and PENDING and
  RESULTS when they are designed).
- **`—` with SIN TIEMPO VÁLIDO** is for a university with no valid time at all (§4.2, locked
  decision 4).

---

## 3. Screen 1 — ATTRACT

**Purpose:** before the event, while the room fills. It is also what STANDBY shows before any
university has finished (§4.1).
**Mockup:** `attract-DECIDED.html`

### 3.1 Stack

| Layer | Value |
|---|---|
| Stage | 16:9, `--bg-deep` |
| Maze | full bleed, live |
| Vignette | `radial-gradient(58% 46% at 50% 38%, rgba(5,4,20,.60) 0%, rgba(5,4,20,.30) 45%, transparent 72%), radial-gradient(80% 65% at 50% 50%, transparent 38%, rgba(5,4,20,.65) 100%)` |
| Content | flex column, padding `2.4cqw 3cqw 2.2cqw` |

### 3.2 Hero (vertically centred, `--face-w: 34cqw`, `--logo-w: 30cqw`)

- **Face.** `assets/rootkitty-face-attract.svg` (§2.4) at `width: var(--face-w)`; wrapper margins
  `calc(var(--face-w) * -0.19)` top and `calc(var(--face-w) * -0.20)` bottom.
  `top: calc(var(--logo-w) * -0.1)` centres the nose on the "T"; there is no `left` offset. Mask,
  intersected:

  ```css
  mask-image:
    radial-gradient(ellipse 66% 78% at 50% 48%, #000 40%, transparent 80%),
    linear-gradient(to bottom, transparent 0%, transparent 16%, rgba(0,0,0,.42) 34%, #000 52%);
  mask-composite: intersect;           /* -webkit-mask-composite: source-in */
  ```

  The vertical fade dissolves the crown. Without it, the fur (luminance 29–30) reads as a grey panel
  against a ground of 4. The mask is opaque by 52% down the face, and the eyes sit at about 58%.
- **Logo.** `assets/logo-ctf.svg` at `var(--logo-w)`, with glow
  `drop-shadow(0 0 18px rgba(124,92,255,.55)) drop-shadow(0 0 44px rgba(124,92,255,.35))`. Under
  `prefers-reduced-motion: no-preference` it pulses over 4s `ease-in-out` infinite, from
  `16px/.45 + 38px/.28` to `22px/.65 + 54px/.42` at 50%.
- **Tagline** "RETO DEL CUBO": `--fs-lead`, 700, `letter-spacing` and `text-indent` `.28em`,
  `#fff`, `margin-top 1.4cqw`, `text-shadow 0 0 1.6cqw rgba(2,1,12,.9)`.

### 3.3 Plates and footer

- **Plates.** A 28-track grid, `gap .85cqw`, `margin-top 1.5cqw`. Each plate spans 4 tracks: 7 in
  the first row, 6 in the second, and the second row starts at track 3 (`.plate:nth-child(8)
  { grid-column: 3 / span 4 }`). The plates follow the roster in `config/event.json`, which is also
  the turn order (§3.4): Loyola, INTEC, ITLA, PUCMM, UAPA, UCSD, UCE, UNAPEC, UNIBE, UNICARIBE,
  UNICDA, UNPHU, UTESA.
- **Footer** "Comenzamos en breve": `--fs-body`, 500, `letter-spacing` and `text-indent` `.2em`,
  `#fff`, `margin-top 1.4cqw`,
  `text-shadow 0 0 .9cqw rgba(2,1,12,.95), 0 .12cqw .45cqw rgba(2,1,12,.9)`. It is white with a
  dark halo because `--violet` over the violet maze was camouflaged.

### 3.4 Changes since ATTRACT was approved

1. **Plate radius** `4px` → `var(--radius)`, so the plate is one component with one radius.
2. **Face asset replaced** (§2.4). The mask and offsets in §3.2 were tuned against the **previous**
   crop, which had a different aspect ratio (1.42 vs 1.10). A re-tune against the new asset was
   tried on 2026-09-18, at the approved 34cqw and at 40cqw, and **declined**: ATTRACT keeps the
   previous crop as `assets/rootkitty-face-attract.svg`, so the values in §3.2 stand unchanged.
3. **Plate order** follows the roster (decided 2026-09-18). The approved mockup put UCE before UCSD.
   `config/event.json`, generated from the CTF database, has UCSD first, and it also sets the turns.

---

## 4. Screen 2 — STANDBY

**Purpose:** between competitors, and between one competitor's attempts, while the operator
scrambles.
**Mockup:** **`standby-09-final.html` (v9)**. It shows the Resultado state, the all-DNF variant and
the Mezcla state. The files it loads are mockup-only: `maze-frame.jpg` (a still of the maze, so
several stages can share one page), `cube-net.js` (a stand-in for csTimer's `getImage`, §4.5) and
`rootkitty-face-full.svg` (a copy of the new asset). The history of the design runs from
`standby-01-draft-ported.html` to v9.

### 4.1 States

The screen has two visual states, chosen by `snapshot.phase` and `snapshot.result`:

| Phase | Condition | Renders |
|---|---|---|
| STANDBY | `result === null` (no university has finished) | **ATTRACT** (§3) |
| STANDBY | `result !== null` | **Resultado** for `result.teamId` |
| SCRAMBLE | — | **Mezcla** for the selected university, attempt `attemptNo` |

Transitions (system design §5):
- Accepting or DNF-ing attempt 3 shows **Resultado**, which stays up until the operator presses
  `N`. There is **no timeout**.
- `N` shows **Mezcla**, attempt 1, with a fresh scramble.
- Accepting attempt 1 or 2 shows **Mezcla** for the next attempt with a new scramble (the existing
  auto-arm).
- Resetting the mat to 0.00 leaves for ARMED (§5).

At event start the operator's first `N` goes straight from ATTRACT to Mezcla, so ATTRACT needs no
key of its own.

### 4.2 Layout

```
┌──────────────────────────────────────────────────────────────┐  header 6.28cqw
│ [CTF logo]                              UNIVERSIDAD 11 / 13  │
├─────────────────────────────────────┬────────────────────────┤
│ RESULTADO | A CONTINUACIÓN          │ CLASIFICACIÓN · MEJOR  │
│ ┌──────────┐ │ MEJOR TIEMPO         │ 1 INTEC       1:24.02  │  body 39.02cqw
│ │  plate   │ │ 3:55.10  or  2 DE 3  │ 2 ITLA        1:55.88  │  62% | 38%
│ └──────────┘ │ PUESTO 9             │ …  up to 8 rows        │
│ PARTICIPANT NAME                    │                        │
├─────────────────────────────────────┴────────────────────────┤
│ [net]  MEZCLA                                         (^.^)  │  band 10.95cqw
│        R' U2 B' L' F D' R2 B U' L F2 U2 R2 D B2 …            │
└──────────────────────────────────────────────────────────────┘
```

**Background.** The live maze (§2.5) under a veil:
`radial-gradient(120% 92% at 50% 106%, rgba(2,1,12,0) 0%, rgba(2,1,12,.70) 60%, rgba(2,1,12,.95) 100%)`.

**Header.** Padding `1.5cqw 2.2cqw`, `border-bottom 1px --violet-deep`, `--fs-body`, `.14em`,
`--violet`. The logo `assets/logo-ctf.svg` is on the left, `height 3.2cqw`. On the right is
**"UNIVERSIDAD {n} / {total}"** with `{n}` in `#fff` bold. `{n}` counts the universities that have
started, including the one on screen: in Mezcla that is completed + 1, and in Resultado it is the
number completed. This stays correct when the operator skips around the roster with `←`/`→`.
**The header has no centre element.**

**Body.** A grid of `62% 38%` with a `1px --violet-deep` divider.

- **Main column.** Padding `2.1cqw 2.3cqw`, flex column, **vertically centred**. From top to
  bottom:
  1. **Label** (`--fs-label`, `.24em`, `--violet`): `RESULTADO` or `A CONTINUACIÓN`.
  2. **Who row.** Flex, `gap 2.2cqw`, `margin-top 1.1cqw`, `align-items: stretch`:
     - the **plate** (§2.3) at `width 22cqw` (9.52cqw tall);
     - the **figure block**: `padding-left 2.2cqw`, `border-left 1px --violet-deep`, contents
       vertically centred:

       | State | Label | Figure (`--fs-hero`, 800, `line-height 1`, `margin-top .5cqw`, `-.01em`) | Sub-line (`--fs-body`, 500, `.14em`, `--violet`, `margin-top .9cqw`) |
       |---|---|---|---|
       | Resultado | `MEJOR TIEMPO` | best effective time, tabular | `PUESTO {position}`, with the number in `#fff` 800 |
       | Resultado, all DNF | `MEJOR TIEMPO` | `—` | `SIN TIEMPO VÁLIDO` |
       | Mezcla | `INTENTO` | `{attemptNo}` followed inline by `DE {attemptsPerCompetitor}` in `--fs-body` 500 `--violet`, `.14em`, `margin-left .6cqw` | — |

  3. **Participant name.** `--fs-body`, `.14em`, `--violet`, `margin-top 1.1cqw`. **Omitted** when
     the roster has no participant name.

- **Side column.** Padding `1.9cqw`. The label `CLASIFICACIÓN · MEJOR DE {attemptsPerCompetitor}`
  has `margin-bottom 1cqw`, followed by up to 8 rows from `snapshot.standings` (§4.3).
  - **Row:** grid `2.2cqw 1fr auto`, `gap .85cqw`, `align-items: baseline`, `padding .38cqw 0`,
    `--fs-body`, `border-bottom 1px rgba(35,31,102,.5)`. The row pitch is 2.91cqw, and the column
    fits 11 rows, so 8 always fit.
  - **Cells:** rank in `--violet` 700; name in `#e8e6ff` with ellipsis overflow (UNICARIBE, the
    longest, fits); time with `tabular-nums` 500.
  - **Leader (row 1):** all three cells in `--gold-text` 800, on `rgba(171,166,247,.1)`, with
    `margin 0 -.8cqw`, `padding-inline .8cqw` and `border-radius var(--radius)`.
  - **Featured university** (`result.teamId` in Resultado, the selected team in Mezcla): name in
    `#fff` 800 **when it is in the slice**. It is never pinned or added when it is not.
  - **Empty slice:** a single line, **"Aún no hay tiempos"**, in `--fs-body` `--violet`.
  - **Fewer than 8 ranked:** the list is simply shorter, with no filler rows.

**Band.** Full width, flex, `align-items: center`, `gap 2.2cqw`, **`padding 2.2cqw`**,
`border-top 1px --violet-deep`, background `rgba(2,1,12,.72)`. Its height is **10.95cqw in both
states**.

1. **Cube slot:** `width 8.7cqw`, `aspect-ratio 137/102`. In Mezcla it holds `snapshot.scrambleSvg`
   at `width 100%`. In Resultado it stays **present but empty**, so the band cannot change height
   when `N` is pressed.
2. **Text block:**
   - the label `MEZCLA`;
   - under it, a line in `--fs-lead`, 500, no letter-spacing, `line-height 1.2`,
     `margin-top .5cqw`, **`white-space: nowrap`**:
     - Mezcla: the scramble in `#fff`;
     - Resultado: **"Se genera al llamar a la siguiente universidad"** in `--violet`.
   - **It never wraps.** A 21-move scramble (the longest random-state 3×3 scrambles get) measures
     24.9em, which is 54.7cqw. The text starts at 13.1cqw and the mascot at 86.8cqw, so 73.7cqw is
     available.
3. **Mascot:** `assets/rootkitty-face.svg`, positioned inside the band:

   ```css
   .kitty { --kw: 11cqw; position:absolute; z-index:2; right:2.2cqw; width:var(--kw);
            bottom:calc(var(--kw) * 0.02); opacity:.9;
            filter:drop-shadow(0 0 2.4cqw rgba(238,39,55,.3)); }
   ```

   The flat cut sits 1.58cqw above the band's bottom edge, and the ears 0.75cqw below its top line.
   Set `bottom` **only in this rule**, never in an inline style, which would override it. The draft
   used a full-body RootKitty in the corner; that is superseded.

### 4.3 Standings rule

**Core** (pure, in `core/`, tested with `node --test`):

- `standings(event)` returns the **full table**, one row per team:
  `{ teamId, group, position, bestMs }`. Rows are ordered in three groups:
  1. **`ranked`:** at least one attempt with `status === 'OK'`. Ordered by best effective time
     (`ms + 2000` for `+2`), then second-best, then roster order (system design §6). `position` runs
     1…k.
  2. **`unranked`:** at least one attempt, none OK. Roster order, `position: null`.
  3. **`pending`:** no attempts yet. Roster order, `position: null`.
- `audienceStandings(table, 8)` returns `table.filter(r => r.group === 'ranked').slice(0, 8)`.

**Audience rule:** the room sees **ranked universities only, capped at 8**. Unranked and pending
teams never appear on STANDBY. A dash on the audience screen always means "attempted, no valid
time" (locked decision 4), which is shown on Resultado and RESULTS, so it is never also used for
"hasn't competed yet". A featured university below 8th learns its place from `PUESTO {n}` on
Resultado.

### 4.4 Snapshot changes

This extends system design §4. The audience window still holds nothing of its own.

```js
{
  phase, competitor, attemptNo, displayMs, scramble, scrambleSvg, signal,
  standings,   // CHANGED: audienceStandings(standings(event), 8), not the full table
  result,      // NEW: { teamId, bestMs, position } | null
}
```

- `result` is `null` until a university completes all its attempts. After that it describes the
  **most recently completed** university.
- `bestMs: null` together with `position: null` means all attempts were DNF.
- `result` is **derived from event state on every broadcast**, never stored separately, so an undo
  (`U`) or a later competitor can never leave a stale result on screen. `PUESTO` is provisional by
  nature and is shown only during Resultado.

### 4.5 Scramble and cube preview

- **The scramble is for the audience's benefit only:** it shows the scramble is fair. The operator
  reads the scramble on the **operator panel** (§4.6), so on the audience screen it stays one
  line in `--fs-lead`.
- **The preview is `getImage(scramble, '333')` from `cstimer_module`, used as-is.** Its sticker
  colours are csTimer's, the only colours outside the palette. The mockup's `cube-net.js` is a
  stand-in that simulates the scramble to draw a correct net in the same U / L F R B / D layout.
  It is not production code.

### 4.6 Requirements for screen 10 (OPERATOR PANEL)

These came up while designing STANDBY. Screen 10 is not designed here.

1. **Full standings:** all teams from `standings(event)` with position, group and best time;
   `pending` teams are visibly marked. This is how the operator answers "where does X stand?"
2. **The mat instruction** ("reset the mat to 0.00 to begin"). The STANDBY draft had it on the
   audience screen, where the room can do nothing with it.
3. **The scramble in type large enough to scramble from**, because the operator reads it on the
   laptop while scrambling.

### 4.7 Edge cases

| Case | Behaviour |
|---|---|
| First university, Mezcla, nobody ranked | Side column shows "Aún no hay tiempos" |
| Featured university ranked 9th or lower | Not in the list. Resultado says `PUESTO {n}` |
| Featured university in the top 8 | Its row is bold `#fff`. If it leads, the leader style applies |
| All three attempts DNF | Resultado shows `—` and `SIN TIEMPO VÁLIDO`. The university is absent from the list |
| Attempt 1 DNF, now on attempt 2 | Mezcla, `INTENTO 2 DE 3`. The university is absent from the list until it has an OK time |
| Operator undoes the third attempt | Whatever phase the core's undo leads to, `result` is re-derived from event state, so no stale result can show |
| Roster has no participant name | Name line omitted |
| Signal lost | NO SIGNAL (screen 7) takes over. Not handled here |

### 4.8 Testing

**Core (`node --test`):**

- **`standings`:**
  - best-time order, with `+2` applied;
  - the second-best tie-break, then the roster-order tie-break;
  - all-DNF lands in `unranked`; no attempts lands in `pending`;
  - positions only on `ranked` rows.
- **`audienceStandings`:**
  - excludes `unranked` and `pending`;
  - stops at 8, returns fewer when fewer are ranked, and is empty when none are;
  - includes a competitor mid-turn who has one OK time.
- **`result`:**
  - `null` before any completion;
  - its position matches the full table;
  - it is re-derived after an undo;
  - all-DNF gives `bestMs` and `position` of `null`.

**Visual:** render Resultado, the all-DNF variant and Mezcla at 1920×1080 and compare them against
`standby-09-final.html`. Then check the four invariants:
- the band is the same height in both states;
- a 21-move scramble stays on one line;
- the mascot's cut sits inside the band;
- no `--go` anywhere on the screen.

---

## 5. Screen 3 — ARMED

**Purpose:** the mat reads 0.00 and the competitor is at the table. ARMED covers the 15-second
inspection, the hands going down and the green light, and ends when the solve starts.
**Mockup:** **`armed-04-final.html`**. It shows eight moments with every decision applied. The
history runs through `armed-01-frame.html` (layout), `armed-02-golight.html` (green light) and
`armed-03-overtime.html` (past 15 s). It loads the same mockup-only files as STANDBY (§4).

### 5.1 Inspection (new rule)

Competitors get competition-style **15-second inspection, shown on the projector**. The system
design did not have inspection; this adds it (roadmap locked decision 11).

- The operator presses **`Space`** on lifting the cover, and the countdown starts.
- A solve that starts after 15 s and up to 17 s suggests **+2**. After 17 s it suggests **DNF**.
- **Nothing stops automatically**, the same as with the cutoff (system design decision 5). The
  suggestion goes to PENDING and the operator's key decides. A suggestion is never applied on its
  own.
- **`Esc`** in ARMED cancels an inspection that has started and returns to the waiting state, for
  a key pressed too early.
- If inspection is never started, the solve still starts normally and nothing is suggested.
- `Space` and `Esc` are defaults (csTimer uses the same pair). Screen 10 owns the full keymap.

### 5.2 States

ARMED renders from two new snapshot fields (§5.5), `inspectionMs` and `hands`, by four rules. In
each, the first match wins.

- **Clock text:** `15` when `inspectionMs === null`, otherwise `inspectionDisplay(inspectionMs)`
  (§5.4).
- **Clock colour:** `--go` when `hands === 'ready'` and the text is a number · `--violet` when
  `inspectionMs === null` · otherwise `#fff`.
- **Status text:** **LISTO** when `hands === 'ready'` · **MANOS EN POSICIÓN** when
  `hands === 'down'` · **INSPECCIÓN EXCEDIDA** when `inspectionMs > 17000` · otherwise
  **INSPECCIÓN**.
- **Status colour:** `--go` when `hands === 'ready'`, otherwise `--violet`.

The eight moments in the mockup, in the order they can happen:

| # | Moment | Clock | Status line |
|---|---|---|---|
| 1 | Mat reset, key not pressed yet | `15`, `--violet` | INSPECCIÓN |
| 2 | Inspecting | `15` … `1`, `#fff` | INSPECCIÓN |
| 3 | Both hands down, not green (header `C`, about ½ s) | countdown, `#fff` | MANOS EN POSICIÓN |
| 4 | Green light (header `A`) | countdown, `--go` | LISTO, `--go` |
| 5 | 15–17 s elapsed | `+2`, `#fff` | INSPECCIÓN |
| 6 | 15–17 s elapsed, green light | `+2`, `#fff` | LISTO, `--go` |
| 7 | Past 17 s | `DNF`, `#fff` | INSPECCIÓN EXCEDIDA |
| 8 | Inspection never started, green light | `15`, `--go` | LISTO, `--go` |

- **Green tints the status line always, and the digits unless they read +2 or DNF.** When a start
  would be penalised, that is the news.
- **+2 and DNF are words only.** Coloured versions (`--gold`, `--red`) were offered and declined
  (§2.1). The only colours on ARMED are `--violet`, `#fff` and `--go`.
- **One hand down** (`L` or `R`) counts as `up`: the audience sees no change.
- Every change is **instant** (§2.2, motion).

### 5.3 Layout

```
┌──────────────────────────────────────────────────────────────┐  header, as STANDBY
│ [CTF logo]                              UNIVERSIDAD 12 / 13  │
├──────────────────────────────────────────────────────────────┤
│                 ┌───────┐ │ INTENTO 2 DE 3                   │
│                 │ plate │ │ JOSÉ MARTÍNEZ                    │  body 39.02cqw
│                 └───────┘                                    │
│                            9                                 │  clock --fs-clock
│                        INSPECCIÓN                            │
├──────────────────────────────────────────────────────────────┤
│ [net]  MEZCLA                                         (^.^)  │  band, as STANDBY
│        R' U2 B' L' F D' R2 B U' L F2 U2 R2 D B2 D' F2 L2 …   │
└──────────────────────────────────────────────────────────────┘
```

**Background, header and band** are exactly STANDBY's (§4.2), in its Mezcla form: the veil, the
header with `UNIVERSIDAD {n} / {total}`, and the band with the cube preview, the scramble and the
mascot. Resetting the mat swaps only the body, and the band keeps its 10.95cqw height. The maze is
live throughout ARMED (§2.5).

**Body.** A single flex column, centred on both axes, over a darkening:
`radial-gradient(52% 58% at 50% 55%, rgba(2,1,12,.72) 0%, rgba(2,1,12,.4) 55%, transparent 80%)`.
From top to bottom:

1. **Who line.** Flex, `align-items: center`, `gap 1.6cqw`:
   - the plate (§2.3) at ATTRACT's size: `width 13cqw`, padding `.75cqw 1.1cqw`;
   - a text block with `padding-left 1.6cqw` and `border-left 1px --violet-deep`, holding two
     lines in `--fs-body`, `.14em`, `--violet`, `line-height 1.5`:
     `INTENTO {attemptNo} DE {attemptsPerCompetitor}`, with the attempt number in `#fff` 800, and
     below it the participant name. **The name line is omitted** when the roster has none.
2. **Clock.** `--fs-clock`, 800, `line-height .9`, `letter-spacing -.02em`, `tabular-nums`,
   `margin-top 1.5cqw`.
3. **Status line.** `--fs-body`, `.24em`, regular weight, `margin-top 1.2cqw`, coloured per §5.2.

**Fit.** The widest text this clock will hold is RUNNING's `4:59.99`, which measures **48.9cqw** at
`--fs-clock` (13.6cqw) with roc-grotesk loaded. The column's content is about 23cqw tall in a
39.02cqw body.

**RUNNING keeps this layout.** It was chosen together with RUNNING's, so that when the solve starts
only the clock's text and colour change and the room's eyes don't move. The rest of RUNNING is in
§6.

### 5.4 Core

Pure, in `core/`, tested with `node --test`. Two constants, which are competition rules and not
event config: `INSPECTION_MS = 15000` and `INSPECTION_DNF_MS = 17000`.

- `inspectionDisplay(elapsedMs)`:
  - `elapsedMs ≤ 15000` → `String(Math.max(1, Math.ceil((15000 - elapsedMs) / 1000)))`, so it
    shows `15` at 0 and never shows `0`;
  - `elapsedMs ≤ 17000` → `'+2'`;
  - otherwise → `'DNF'`.
- `suggestedPenalty(inspectionMs)`:
  - `null` when `inspectionMs` is `null` or `≤ 15000`;
  - `'+2'` when `≤ 17000`;
  - `'DNF'` otherwise.

  It uses the same limits as the display, so the countdown reads `+2` exactly when a start would
  earn one.
- `handsFromHeader(signalHeader)` → `'down'` for `C`, `'ready'` for `A`, `'up'` for anything else.

**Run state.** ARMED carries `inspectionStartedAt: number | null`.

- `Space` in ARMED sets it, if it is `null`. Any other `Space` in ARMED is ignored.
- `Esc` in ARMED sets it back to `null`.
- Leaving ARMED without starting a solve (`N`, `←`/`→`) drops it.
- ARMED → RUNNING writes `inspectionMs = at - inspectionStartedAt`, or `null`, onto the attempt in
  progress.

**Timestamps arrive with the events.** The operator window stamps each key event and each mat state
with `Date.now()` before passing it to the core, so the core has no clock of its own. The mat
reports at about 10 Hz, so the 15 s and 17 s limits are judged to within about 100 ms. That is
acceptable, because the result is only a suggestion.

**Attempt record** (extends system design §6):

```jsonc
{ "attempt": 2, "ms": 154320, "penalty": null, "status": "OK",
  "scramble": "R U R' U' F2 L D2 B' R F", "inspectionMs": 12840, "at": 1760000000000 }
```

`inspectionMs` is `null` when inspection was not started. Like the scramble, it is kept so any
dispute can be settled.

### 5.5 Snapshot changes

This extends §4.4. The audience window still holds no state of its own.

```js
{
  phase, competitor, attemptNo, displayMs, scramble, scrambleSvg, signal, standings, result,
  inspectionMs,   // NEW: now - inspectionStartedAt, or null. Non-null only in ARMED
  hands,          // NEW: handsFromHeader(state.signalHeader) → 'up' | 'down' | 'ready'
}
```

- `inspectionMs` is computed each time a snapshot is sent. Snapshots follow the mat's ~10 Hz
  packets, so the countdown advances without the audience window running a timer. If packets
  stop, NO SIGNAL takes over anyway.
- The audience window calls `inspectionDisplay` itself. It is a pure import, not state.

### 5.6 Requirements for other screens

These came up while designing ARMED. The screens themselves are not designed here.

1. **PENDING (screen 5):** the operator sees the attempt's `suggestedPenalty` together with its
   `inspectionMs`. Whether the audience sees the suggestion is PENDING's own question.
2. **RUNNING (screen 4):** keeps ARMED's layout (§5.3). `--gold` and `--red` were declined for ARMED,
   so the cutoff colours near and past 5:00 were an open decision, not an inherited one. **Resolved
   in §6.1:** red past the cutoff, with no warning step.
3. **OPERATOR PANEL (screen 10):** shows whether inspection is running and how long it has run, and
   lists `Space` and `Esc`.

### 5.7 Edge cases

| Case | Behaviour |
|---|---|
| Inspection never started | Moment 1 stays up. Hands and the green light still show (moment 8). The attempt gets `inspectionMs: null` and no suggestion |
| `Space` pressed too early | `Esc` returns to moment 1 |
| Hands lifted before the light turns green | `hands` returns to `up`, and the status line reads INSPECCIÓN again |
| One hand down | Shown as `up` |
| Solve starts during +2 or past 17 s | A normal RUNNING. PENDING suggests `+2` or `DNF` |
| Competitor keeps waiting past 17 s | `DNF` / INSPECCIÓN EXCEDIDA stays up. Nothing stops; the solve goes ahead when they start, and PENDING suggests DNF |
| Mat reset again during ARMED | No change |
| Signal lost | NO SIGNAL (screen 7) takes over. `inspectionStartedAt` is kept, so when the signal returns ARMED shows the real elapsed time |
| Operator window reloaded during ARMED | Only accepted results are persisted (system design §7), so inspection is lost and ARMED returns to moment 1 |
| Roster has no participant name | Name line omitted; the text block holds only the attempt line |

### 5.8 Testing

**Core (`node --test`):**

- **`inspectionDisplay`:** `0`→`15`, `999`→`15`, `1000`→`14`, `14001`→`1`, `15000`→`1`,
  `15001`→`+2`, `17000`→`+2`, `17001`→`DNF`.
- **`suggestedPenalty`:** `null`→`null`, `15000`→`null`, `15001`→`+2`, `17000`→`+2`,
  `17001`→`DNF`.
- **`handsFromHeader`:** `C`→`down`, `A`→`ready`, and `L`, `R`, `I`, `S` and `' '`→`up`.
- **Run state:**
  - `Space` starts inspection only in ARMED, and only once;
  - `Esc` clears it;
  - `N` and `←`/`→` drop it;
  - ARMED → RUNNING records `inspectionMs`, or `null` when inspection never started.

**Mock driver scenarios** (in addition to system design §9): a start inside 15 s · a start in the
+2 window · a start past 17 s · a start with no inspection · hands down and lifted before green.

**Visual:** render the eight moments at 1920×1080 and compare them against `armed-04-final.html`.
Then check the invariants:
- the header and band are identical to STANDBY's Mezcla state;
- `4:59.99` fits at `--fs-clock`;
- `--go` appears only when `hands === 'ready'`;
- `+2` and `DNF` are always `#fff`;
- there is no `--gold`, and no `--red` except the mascot's glow.

### 5.9 Changes since ARMED was approved

1. **Clock size** `17.6cqw` → `13.6cqw` (§2.2), decided on 2026-09-19 while RUNNING was viewed at
   full screen. ARMED's countdown and RUNNING's clock share `--fs-clock`, so the digits keep their
   size when the solve starts (§5.3). `armed-04-final.html` still shows 17.6; this spec wins (§1).

---

## 6. Screen 4 — RUNNING

**Purpose:** the solve, from the moment the competitor's hands leave the mat until the mat stops.
**Mockup:** **`running-06-final.html`**. It shows six moments with every decision applied. The
history runs through `running-01-cutoff.html` (three cutoff treatments), `running-02-fullscreen-b.html`
and `running-03-fullscreen-b-136.html` (the chosen treatment at full screen, then at 13.6cqw),
`running-04-armed-to-running.html` (one attempt from ARMED into RUNNING in real time) and
`running-05-update-rate.html` (three ways to update the clock). They load the same mockup-only files
as STANDBY (§4). `running-04` also loads `maze.js`, the live maze, and freezes it by holding back its
`requestAnimationFrame` callbacks, a mockup stand-in for `createMaze().pause()` (§2.5).

### 6.1 Rules

RUNNING renders from two snapshot fields, `displayMs` and `cutoffMs` (§6.5), by these rules:

- **Clock text:** `formatMs(displayMs)`, in the format from system design §6: `42.18` under a
  minute, `2:14.30` over.
- **Over the cutoff:** `displayMs > cutoffMs`. Strictly greater, as in system design §8, so `5:00.00`
  is not over.
- **Colour:** the clock `#fff` and the status line `--violet`, or both `--red` when over the cutoff.
- **Status text:** `LÍMITE {formatCutoff(cutoffMs)}` (§6.4), or **LÍMITE EXCEDIDO** when over the
  cutoff.

The six moments in the mockup:

| # | Moment | Clock | Status line |
|---|---|---|---|
| 1 | Solve under way | `7.83`, `#fff` | LÍMITE 5:00, `--violet` |
| 2 | Under a minute | `42.18`, `#fff` | LÍMITE 5:00, `--violet` |
| 3 | Over a minute | `2:14.30`, `#fff` | LÍMITE 5:00, `--violet` |
| 4 | Exactly at the cutoff | `5:00.00`, `#fff` | LÍMITE 5:00, `--violet` |
| 5 | Past the cutoff | `5:08.52`, `--red` | LÍMITE EXCEDIDO, `--red` |
| 6 | Roster has no participant name | `3:12.07`, `#fff` | LÍMITE 5:00, `--violet`; the name line is omitted |

- **The rule is on screen from the first second.** LÍMITE 5:00 is there so that cutting a
  competitor off is the rule's doing, not the operator's (system design decision 5).
- **One colour step, at the cutoff.** Three treatments were compared in `running-01-cutoff.html`:
  words only (A), red past the cutoff (B), and a `--gold` warning from 4:30 followed by red (C).
  **B was chosen.** With A the room had to read a small line to learn that time was up. C added a
  second threshold, and a gold that is not the leader's gold.
- **Red takes the clock and the status line together**, the way ARMED's green does (§5.2).
- **Nothing stops, and no key acts during RUNNING.** The engine's run state ignores every command in
  RUNNING. The operator calls time, the mat is stopped by hand, and the decision is made in PENDING.
- **No inspection penalty is shown.** A start in the +2 window or past 17 s produces a suggestion
  that first appears in PENDING (§5.6). Until the operator confirms it, it is not a penalty.
- **`--go` never appears.** The mat's light is off once the solve starts.
- Every change is **instant** (§2.2, motion).

### 6.2 Layout

**ARMED's, unchanged** (§5.3): the background, header, band, who line, clock and status line keep
their places and sizes. When the solve starts, only the clock's text and colour and the status
line's text change, so the room's eyes don't move. The maze freezes on the frame it was showing at
that moment (§2.5).

**Width.** The clock is centred, so it re-centres whenever the time gains a character: at `10.00`,
and at `1:00.00`, when it gains the minutes digit and the colon. That is the system design's format,
kept on purpose. At `--fs-clock`, `7.83` measures 28.6cqw, `42.18` 37.0cqw and `4:59.99` 48.9cqw.

### 6.3 Clock updates

**The clock draws `displayMs` as the snapshot carries it:** the mat's `time_milli` from its latest
packet. Packets arrive about 10–13 times a second, so the hundredths change in jumps of about 8 and
read as motion rather than as a digit.

Three options were compared live in `running-05-update-rate.html`: hundredths on every packet (A),
tenths while running with the hundredth added at the stop (B), and hundredths filled in between
packets at 60 fps (C). **A was chosen:**

- every value on screen is a real reading, and the stop lands exactly on the final time;
- the figures are tabular (§2.2), so the width changes only when the time gains a character (§6.2),
  never from one packet to the next and never at the stop;
- the audience window runs no timer of its own. C would have needed one, and it could overshoot the
  final time by up to one packet and then step back.

### 6.4 Core

One addition: a pure function in `js/core/format.js`, next to `formatMs`, tested with `node --test`.

- `formatCutoff(ms)` returns `M:SS`. The cutoff is configured in whole seconds, so there are no
  hundredths; any remainder is truncated, as `formatMs` does.

The over-the-cutoff test is `displayMs > cutoffMs`, made by the audience view. It needs no core
function.

### 6.5 Snapshot

**No new fields.** RUNNING reads `displayMs`, which is the mat's `time_milli` while
`phase === 'RUNNING'`, and `cutoffMs`. The engine plan's `buildSnapshot` already sends both.
`cutoffMs` was missing from the field lists in §4.4 and §5.5; it is part of the snapshot.

### 6.6 Requirements for other screens

These came up while designing RUNNING. The screens themselves are not designed here.

1. **PENDING (screen 5):** it is where the suggested inspection penalty first appears (§5.6). It also
   receives stopped times past the cutoff, and decides whether RUNNING's red carries over.
2. **OPERATOR PANEL (screen 10):** no key acts during RUNNING. A mat reset to 0.00 mid-solve leaves
   RUNNING up at 0.00 until the mat runs and stops again (§6.7), so the panel should make that state
   recognisable. Whether the operator needs a way out of RUNNING is a core question for then.

### 6.7 Edge cases

| Case | Behaviour |
|---|---|
| Exactly `5:00.00` | Not over: `#fff`, LÍMITE 5:00 |
| Competitor keeps solving past the cutoff | `--red`, LÍMITE EXCEDIDO, still counting. Nothing stops; the operator decides in PENDING |
| Solve started in the +2 window or past 17 s | A normal RUNNING with nothing shown. PENDING suggests `+2` or `DNF` |
| Mat reset to 0.00 mid-solve | Not a finish (system design §5). The clock shows `0.00`, and RUNNING stays up until the mat runs and stops again |
| Signal lost | NO SIGNAL (screen 7) takes over. The core stays in RUNNING, and the solve finishes normally when packets resume |
| Roster has no participant name | Name line omitted, as on ARMED |
| A different cutoff in `config/event.json` | The status line follows it: `cutoffMs: 240000` reads LÍMITE 4:00, and red starts after `4:00.00` |

### 6.8 Testing

**Core (`node --test`):**

- **`formatCutoff`:** `300000`→`5:00`, `240000`→`4:00`, `90000`→`1:30`, `45000`→`0:45`,
  `300999`→`5:00`.

**Mock driver:** the existing cutoff-overrun scenario, rendered just past 5:00, shows the red and
LÍMITE EXCEDIDO.

**Visual:** render the six moments at 1920×1080 and compare them against `running-06-final.html`.
Then check the invariants:
- the header, who line, band and the clock's position are identical to ARMED's;
- `displayMs` 300000 renders `#fff` and 300010 renders `--red`;
- `4:59.99` fits at `--fs-clock` (48.9cqw);
- there is no `--go` and no `--gold`;
- the maze does not advance during RUNNING: two frames a second apart are identical.

---

## 7. Open across screens

- **Motion signature:** decide on the first screen that needs one (§2.2), most likely PENDING.
- **Screens 5–10**, in roadmap order. Next up: **PENDING**, which receives RUNNING's stopped time,
  the suggested inspection penalty (§5.6) and any over-cutoff time (§6.6).
