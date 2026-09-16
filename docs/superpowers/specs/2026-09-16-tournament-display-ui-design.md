# Tournament Display — UI Design

**Date:** 2026-09-16
**Status:** In progress — written screen by screen. **ATTRACT** and **STANDBY** are approved; the other eight screens are not yet designed
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
| 3–10 | Not yet designed | — |

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
| Labels, secondary text, rank numbers | `--violet #aba6f7` | site token |
| Leader row | `--gold-text #ffea95` | site token |
| Mascot glow | `--red #EE2737` at 30% | site token |
| Plate fill | `#f7f7f7` | site literal (`--grad-lavender`, `sections.css`) |
| Standings names | `#e8e6ff` | site literal (`sections.css`) |
| Primary text | `#fff` | — |
| Logo glow | `rgba(124,92,255,…)` (`#7c5cff`) | the site maze's wall colour |
| **Mat go light only** | `--go #2ee6a0` | **the one new value** |

- **`--go` is reserved for the mat's green light.** No idle or status element may use it. The
  STANDBY draft used it for a "CRONÓMETRO LISTO" label; that label was removed.
- The only colours outside this palette are the cube preview's sticker colours, which come from
  csTimer (§4.5).
- Contrast on `--bg-deep`: `--violet` 9.41:1 · `#e8e6ff` 16.99:1 · `--gold-text` 17.24:1. `--violet-deep`
  is **1.44:1** and must never carry text.

### 2.2 Tokens

```css
--radius:    1.26cqw;  /* plates and the leader-row highlight */
--fs-label:  1.05cqw;  /* spaced uppercase labels */
--fs-body:   1.38cqw;  /* header, standings rows, names, sub-lines */
--fs-lead:   2.2cqw;   /* ATTRACT tagline, scramble */
--fs-hero:   4.4cqw;   /* big figures: attempt number, best time (2 × lead) */
```

- **Radius.** It was set as `1rem` during design, then converted: `1rem` is a fixed 16px, which is
  1.26cqw at the mockup's width but 0.83cqw at 1920px, so the projector would have shown noticeably
  sharper corners than the approved mockup. `1.26cqw` scales with the screen. One radius, used
  everywhere a radius appears.
- **Type.** Four sizes. `1.38` and `2.2` come from ATTRACT's own scale (~1.6× per step), and
  `4.4` is 2 × `2.2`. The STANDBY draft's 1.25 / 1.45 / 1.5 all collapsed into `--fs-body`.
- **Weights:** 500 for body text and the scramble · 700 for rank numbers and the ATTRACT tagline ·
  800 for big figures, the leader row and the featured standings row.
- **Letter-spacing:** `.24em` labels · `.14em` uppercase body text · `.28em` / `.2em` ATTRACT
  tagline / footer · `-.01em` big figures.
- **Font:** `roc-grotesk-variable` from Adobe Fonts kit `use.typekit.net/frw4sme.css`, with the
  fallback stack `"roc-grotesk", system-ui, sans-serif` (locked decision 9). **Open risk:** every
  time uses `font-variant-numeric: tabular-nums`, and roc-grotesk's support for tabular figures is
  still unverified. That check belongs to RUNNING (roadmap risk table).
- **Motion:** no project-wide motion signature yet. It will be decided on a screen that needs one,
  most likely RUNNING or PENDING. Screens so far use only the maze and ATTRACT's logo pulse.

### 2.3 University plate

One component, used by ATTRACT and STANDBY.

```css
.plate { display:flex; align-items:center; justify-content:center;
         background:#f7f7f7; border:1px solid #231f66; border-radius:var(--radius); }
.plate img { width:100%; height:auto; display:block; }
```

- Logos are `assets/universidades/<id>.png`, all **611 × 229** (2.67:1), and every one already
  contains its university's name. **Never put a plate next to a text acronym;** it would say the
  same thing twice.
- Padding scales with the plate: `.75cqw 1.1cqw` on ATTRACT (12.7cqw wide) and `1.3cqw 1.9cqw` on
  STANDBY (22cqw wide, ×1.73).

### 2.4 Mascot asset

`assets/rootkitty-face.svg` was **replaced on 2026-09-16** with a new peeking crop of RootKitty's
face: viewBox `68.14 × 61.83`, cut flat just below the nose, clean (7.6 KB). The **flat cut sits
13.6% of the image height above the bottom** of the viewBox, which is empty. To seat the cut on an
edge, offset by `0.136 × 61.83/68.14 = 0.1234 × width`.

- The previous crop (viewBox `958 390 680 480`, 99 unused glyph defs) is in git history at
  `1bbe2b4`, and a copy is kept at `.superpowers/brainstorm/tournament-display/content/rootkitty-face.svg`.
- This supersedes system design §11, which lists `rootkitty-face.svg` as unused.

### 2.5 Maze

`vendor/hero-maze3d.js` renders into a full-bleed canvas at the bottom of the stack. It runs live on
ATTRACT and STANDBY, and is frozen only during RUNNING (locked decision 8). Only one maze can run per
page (it looks up `#hero-canvas` by id) until the `createMaze({canvas})` refactor lands.

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

- **Face.** `width: var(--face-w)`; wrapper margins `calc(var(--face-w) * -0.19)` top and
  `calc(var(--face-w) * -0.20)` bottom. `top: calc(var(--logo-w) * -0.1)` centres the nose on the
  "T"; there is no `left` offset. Mask, intersected:

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
  { grid-column: 3 / span 4 }`). Roster order: Loyola, INTEC, ITLA, PUCMM, UAPA, UCE, UCSD, UNAPEC,
  UNIBE, UNICARIBE, UNICDA, UNPHU, UTESA.
- **Footer** "Comenzamos en breve": `--fs-body`, 500, `letter-spacing` and `text-indent` `.2em`,
  `#fff`, `margin-top 1.4cqw`,
  `text-shadow 0 0 .9cqw rgba(2,1,12,.95), 0 .12cqw .45cqw rgba(2,1,12,.9)`. It is white with a
  dark halo because `--violet` over the violet maze was camouflaged.

### 3.4 Changes since ATTRACT was approved

1. **Plate radius** `4px` → `var(--radius)`, so the plate is one component with one radius.
2. **Face asset replaced** (§2.4). The mask and offsets in §3.2 were tuned against the **previous**
   crop, which had a different aspect ratio (1.42 vs 1.10). **Re-tune `--face-w`, the two margins
   and the mask stops against the new asset before building ATTRACT.** The goals stay the same: the
   crown dissolves, the eyes are untouched, and the nose is centred on the "T".

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
- Resetting the mat to 0.00 leaves for ARMED (screen 3).

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

## 5. Open across screens

- **Tabular figures** in roc-grotesk: verify on RUNNING (§2.2).
- **Motion signature:** decide on the first screen that needs one (§2.2).
- **ATTRACT face re-tune** against the new asset (§3.4).
- **Screens 3–10**, in roadmap order. Next up: **ARMED**.
