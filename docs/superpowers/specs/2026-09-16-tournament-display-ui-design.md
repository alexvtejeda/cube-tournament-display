# Tournament Display — UI Design

**Date:** 2026-09-16
**Status:** In progress — written screen by screen. **ATTRACT**, **STANDBY**, **ARMED**, **RUNNING**, **PENDING** and **RESULTS** are approved; the other four screens are not yet designed
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
| 5 PENDING | ✅ Approved | **`pending-16-final.html`**, with the screen changes in `pending-13-attract-final.html`, `pending-09-best.html` and `standby-11-board-fill.html` (§2.7) |
| 6 RESULTS | ✅ Approved | **`results-05-paws.html`** (the sequence, stage C) and **`results-04-kitty-above.html`** (the still) |
| 7–10 | Not yet designed | — |

PENDING's design also changed the shared system (§2.2 motion, §2.5 maze, §2.7 screen changes) and
STANDBY's standings (§4.9). §9 lists what that means for the two implementation plans already
written.

RESULTS added a mascot asset (§2.4), a *results* layout family and four screen changes (§2.7), and one
more screen with a live maze (§2.5). It needs no amendment to either plan (§9).

The screens are §3 to §8, and §9 stays where it is because both plans cite it by number. The next
screen, **NO SIGNAL** (screen 7), starts at §10. It follows the motion signature (§2.2), the
screen-change rule (§2.7), and one requirement RESULTS set for it (§8.9).

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
| Leader row, and RESULTS' winning time | `--gold-text #ffea95` | site token |
| Mascot glow (the band's kitty and RESULTS') | `--red #EE2737` at 30% | site token |
| RUNNING's clock and status line past the cutoff, and PENDING's review of such a time | `--red #EE2737` | site token |
| Empty standings slot: dashed divider and rank number | `rgba(171,166,247,.45)` | `--violet` at 45% |
| Plate fill | `#f7f7f7` | site literal (`--grad-lavender`, `sections.css`) |
| Standings names | `#e8e6ff` | site literal (`sections.css`) |
| Primary text | `#fff` | — |
| Logo glow | `rgba(124,92,255,…)` (`#7c5cff`) | the site maze's wall colour |
| **Mat go light only** | `--go #2ee6a0` | **the one new value** |

- **`--go` is reserved for the mat's green light.** No idle or status element may use it. The
  STANDBY draft used it for a "CRONÓMETRO LISTO" label; that label was removed. ARMED is the only
  screen so far that uses it, and only while the light is green (§5.2). RUNNING never does (§6.1).
- **`--red #EE2737` has one text role: a time past the cutoff**, on RUNNING (§6.1) and in PENDING's
  review of it (§7.1). It was offered and declined for ARMED's +2 and DNF (§5.2), which stay words
  only, and PENDING's verdicts never use it (§7.2).
- **PENDING gives `#fff` and `--violet` a meaning on the clock:** white is official, violet is
  provisional (§7.1). A stopped time is violet until the operator's key makes it official.
- **The empty-slot colour is `--violet` at 45%**, not a new hue. It draws the dashed divider of an
  empty standings slot and that slot's rank number (§4.2), and nothing else.
- **`--gold #d4aa06` has no role.** It was declined for ARMED's +2, and again for a warning step
  before RUNNING's cutoff (§6.1).
- The only colours outside this palette are the cube preview's sticker colours, which come from
  csTimer (§4.5).
- Contrast on `--bg-deep`: `--violet` 9.41:1 · `#e8e6ff` 16.99:1 · `--gold-text` 17.24:1 · `--go`
  12.79:1 · `--red` 4.92:1, above AA's 4.5:1 even for body-size text. `--violet-deep` is **1.44:1**
  and must never carry text. The empty-slot colour is **2.56:1**. It carries only the rank number of
  an empty slot, a placeholder with nothing to read, so it is exempt the way disabled text is.

### 2.2 Tokens

```css
--radius:    1.26cqw;  /* plates and the leader-row highlight */
--fs-label:  1.05cqw;  /* spaced uppercase labels */
--fs-body:   1.38cqw;  /* header, standings rows, names, sub-lines */
--fs-lead:   2.2cqw;   /* ATTRACT tagline, scramble */
--fs-hero:   4.4cqw;   /* big figures: attempt number, best time (2 × lead) */
--fs-clock:  13.6cqw;  /* the clock and the inspection countdown */

--ease:      cubic-bezier(.33, 1, .68, 1);  /* the one curve, an ease-out (easeOutCubic) */
--t-short:   200ms;    /* colour changes; a tag entering or leaving */
--t-step:    400ms;    /* the step between +2 ticks; quick fades */
--t-long:    800ms;    /* the redo rewind; every screen change (§2.7) */
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
- **Motion signature** (decided with PENDING, 2026-09-19): **one curve and three durations**, the
  tokens above. Everything that moves or fades uses `--ease`. Durations are `--t-short`,
  `--t-step` or `--t-long`, and nothing else. The only other motion is the maze and ATTRACT's
  logo pulse, which keep their own timing (§2.5, §3.2).
  - **Instant:** anything the mat drives. ARMED's green matches the physical light, RUNNING's red
    matches the moment the clock passes the cutoff, and the stop freezes the digits (§5.2, §6.1).
    Digits and words that change in place are also instant: the +2 ticks and every status-line
    swap.
  - **`--t-short`:** the clock's colour changes in PENDING, and the verdict's tag entering and
    leaving (§7.2).
  - **`--t-step`:** the gap between the +2 ticks, the wait before the standings update, and
    ATTRACT's plates fading out (§2.7, §7.2). On the way to RESULTS: ATTRACT's face, tagline and
    footer fading out, RESULTS' times fading in, and the kitty's paws coming over the edge (§8.5).
  - **`--t-long`:** the redo rewind (§7.2), every screen change and standings update (§2.7), and
    RESULTS' kitty climbing up from behind the winner's plate (§8.5).
  - **`prefers-reduced-motion: reduce`** turns all of it into cuts. Screen changes and standings
    updates happen at once, a verdict shows its landed frame straight away (§7.2), and RESULTS
    arrives with its times and kitty already in place (§8.5).

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
- **`assets/rootkitty-from-above.png`** (added 2026-09-19, for RESULTS §8.4) is RootKitty peeking
  over an edge with its paws hanging over it: **1200 × 683**, RGBA. The head's flat bottom is row
  **618**, and the paws reach row 681, so **9.52%** of the image, `(683 − 618) / 683`, is below the
  edge. It is dark, with a black outline and no light border, so it needs the band kitty's red glow
  on this ground. At 515 KB it is loaded from disk, so its size costs nothing at the venue.

### 2.5 Maze

`vendor/hero-maze3d.js` renders into a full-bleed canvas at the bottom of the stack. It runs live on
ATTRACT, STANDBY, ARMED and RESULTS, and is frozen from the moment the solve starts (locked decision 8) until
the screen leaves PENDING. On ARMED that was a choice: it keeps moving through inspection and freezes
the moment the solve starts. It stays frozen through PENDING's review and its verdict, and resumes
with the screen change to Mezcla or Resultado (§7.1), so nothing moves behind the verdict. The rule
is **frozen while `phase` is RUNNING or PENDING, or while a verdict is on screen**. Only one maze can
run per page (it looks up `#hero-canvas` by id) until the `createMaze({canvas})` refactor lands.

### 2.6 Wording

Spanish throughout.

- **DNF** is the audience word for a single attempt with no valid time (ARMED §5.2, PENDING §7.2).
  RESULTS shows no single attempts, so it never uses it.
- PENDING's status-line wording is in §7.3. It was chosen to be easy to change later, so each
  string lives in one place in the view code.
- **`—` with SIN TIEMPO VÁLIDO** is for a university with no valid time at all (§4.2, locked
  decision 4). RESULTS shows the `—` alone, where the time goes (§8.6).
- **NO PARTICIPÓ** is for a university that never competed, and appears only on RESULTS (§8.6). It
  is not `—`, which always means "competed, no valid time".

### 2.7 Screen changes

Decided with PENDING (2026-09-19). Mockups: `pending-06-morph.html` (Mezcla ⇄ ARMED and the verdict →
Mezcla, where 800 ms was chosen over 400 ms), `pending-08-all-transitions.html` (every change),
`pending-13-attract-final.html` (ATTRACT → Mezcla), `pending-09-best.html` (the verdict → Resultado)
and `standby-11-board-fill.html` (the standings update).

**The rule: anything with the same identity on both screens moves to its new place and size over
`--t-long`, and everything else fades.** Identity means *the same thing*, not the same kind of
thing. A different university's plate is a different element, so when Resultado hands over to the
next university's Mezcla, the two plates crossfade in place instead of one moving.

**When a change runs.** The audience screens fall into three layout families:

| Family | Screens |
|---|---|
| attract | ATTRACT, including its bridge to RESULTS (§8.2) |
| standby | Resultado, Mezcla |
| solo | ARMED, RUNNING, PENDING (the review and the verdict) |
| results | RESULTS |

A screen change runs when the family changes, or, within *standby*, when the screen (Resultado or
Mezcla) or the featured university changes. Within *solo* it never runs. The mat drives those
changes, and they stay instant (§2.2): ARMED → RUNNING → PENDING, and a mat reset during a verdict,
which goes straight to ARMED.

**Identities.** Each is a `view-transition-name`, unique on the page:

| Element | Name | Where it appears |
|---|---|---|
| CTF logo | `logo` | ATTRACT's hero (30cqw wide), every header (3.2cqw tall), including RESULTS' |
| A university's plate | `plate-<teamId>` | ATTRACT's grid (**only the called university's**, see below), Resultado and Mezcla (22cqw), solo (13cqw), RESULTS (22, 15 or 12.7cqw) |
| Participant name | `name-<teamId>` | Resultado's and Mezcla's name line, solo's second who line |
| Divider | `rule` | the left edge of Resultado's and Mezcla's figure block, and of solo's text block |
| Section label | `label` | RESULTADO / A CONTINUACIÓN |
| INTENTO | `attempt-word` | Mezcla's label above the figure, and solo's who line |
| The attempt number | `attempt-n` | Mezcla's `--fs-hero` figure, and solo's who line (bold) |
| DE {n} | `attempt-of` | Mezcla's small suffix, and solo's who line |
| The clock, as the best time | `time` | PENDING's clock and Resultado's MEJOR TIEMPO figure, **only when the decided attempt set the best time** (§7.2) |
| Band | `band` | every screen except ATTRACT |
| A standings row | `standing-name-<teamId>`, `standing-time-<teamId>` | the standings column |
| ATTRACT's plates and footer | `attract-plates`, `attract-footer` | ATTRACT, when it leaves, and when the bridge to RESULTS arrives (§8.2) |
| ATTRACT's face and tagline | `attract-face`, `attract-tag` | ATTRACT's bridge, when it leaves for RESULTS |

On ATTRACT, only the plate of the university being called carries `plate-<teamId>`. The other
twelve stay unnamed inside `attract-plates`, so they move with the grid. A named plate would be
pulled out of the grid and fade on its own.

**The bridge to RESULTS is the one exception** (§8.2). On the way in, the rule above holds: only the
plate that was on screen before `F` is named, the one on Resultado or Mezcla. On the way out, every
plate carries its own `plate-<teamId>` and `attract-plates` is not used, so each plate moves to its
own place on RESULTS. The names are set on ATTRACT's DOM just before that change starts, because the
old screen is captured when it starts. That is still the rule: each plate is the same element on
both screens.

**Markup this needs.** A named element must be one box, so each is an element of its own, and
inline pieces are `inline-block`:
- the divider is a 1px element in `--violet-deep`, positioned along the block's left edge, instead of
  a `border-left`, so it can stretch between the figure block's height and the text block's;
- solo's who line holds `INTENTO`, the number and `DE {n}` as three elements, and the name as one;
- PENDING's digits are one element, apart from the verdict's tag (§7.2).

**Entering and leaving.** By default an element that exists only on the old screen fades out, and
one that exists only on the new screen fades in, over `--t-long`. Two exceptions, both made for
ATTRACT → Mezcla:
- **The band rises** from the stage's bottom edge: `translateY(100%)` → `0` over `--t-long`, with no
  fade, clipped to its own box (`overflow: clip` on its group and image pair). It enters this way
  only when it has no old counterpart, `::view-transition-new(band):only-child`, which is also true
  of RESULTS → Mezcla and RESULTS → PENDING, since RESULTS has no band. When it has an old
  counterpart, it stays put.
- **The plates and the footer are pushed up** by the band's height as it rises: they move
  `10.95cqw` up over `--t-long`, and fade out over the first `--t-step`:
  `@keyframes { 50% { opacity: 0 } to { opacity: 0; transform: translateY(calc(-.1095 * var(--stage-w))) } }`.
  View-transition pseudo-elements have no container, so `cqw` cannot reach them. `--stage-w` is
  the stage's own width expression, `min(100vw, calc(100vh * 16 / 9))`, set on `:root`.

The bridge to RESULTS runs both of these in reverse on its way in, and fades on its way out (§8.2):
- **The band sinks** to the stage's bottom edge: `translateY(0)` → `100%` over `--t-long`, with no
  fade and clipped to its own box, `::view-transition-old(band):only-child`.
- **The plates and the footer come down** by the band's height as it sinks: from `10.95cqw` up to
  their place over `--t-long`, fading in over the last `--t-step`:
  `@keyframes { from { opacity: 0; transform: translateY(calc(-.1095 * var(--stage-w))) } 50% { opacity: 0 } }`,
  on `::view-transition-new(attract-plates):only-child` and `::view-transition-new(attract-footer):only-child`.
- **On the way out, ATTRACT's face, tagline and footer fade** over `--t-step`, on
  `::view-transition-old(attract-face)`, `(attract-tag)` and `(attract-footer):only-child`, while the
  plates move over `--t-long`.

**The changes, one by one:**

| Change | Trigger | What moves |
|---|---|---|
| ATTRACT → Mezcla | the first N | the logo shrinks into the header, and the called plate leaves the grid for Mezcla's; the band rises and the grid and footer are pushed up |
| Mezcla ⇄ ARMED | a mat reset; N or ←/→ before a solve | plate, divider, `INTENTO · n · DE {n}`, name. After N it's a different university, so its plate and name crossfade |
| ARMED → RUNNING → PENDING | the mat | nothing (same family, instant) |
| The verdict → Mezcla | the verdict ends, attempts 1 and 2 | plate, divider, `INTENTO · n · DE {n}`, name. The number crossfades from the decided attempt to the next on the way |
| The verdict → Resultado | the verdict ends, attempt 3 | plate, divider and name. The clock shrinks into MEJOR TIEMPO when it holds the best time, and fades otherwise |
| Resultado → Mezcla | N | the divider and the label, whose words crossfade in place; the next university's plate and name crossfade in |
| Mezcla → Mezcla | ←/→ | as Resultado → Mezcla |
| Mezcla or Resultado → PENDING | U | the same moves, in reverse. The maze freezes (§2.5) |
| The verdict → ARMED | a mat reset during the verdict | nothing (same family, instant) |
| Resultado or Mezcla → ATTRACT, the bridge | F (§8.2) | ATTRACT → Mezcla in reverse: the logo grows back into the hero, the plate on screen returns to its grid slot, the band sinks, and the grid and footer come down with it |
| ATTRACT → RESULTS | the bridge ends, `RESULTS_INTRO_MS` after F | every plate moves to its place at once; the logo shrinks into the header; the face, tagline and footer fade over `--t-step` |
| RESULTS → Mezcla | N or ←/→, while a university has attempts left | the called university's plate moves to Mezcla's and the band rises; the rest fades |
| RESULTS → PENDING | U | the last attempt's plate moves to solo's and the band rises; the rest fades. The maze freezes (§2.5) |

**Standings updates.** When the standings change while a *standby* screen is up, the update runs as
its own transition over `--t-long`. Each university's name and time move to their new slot by
identity. **Rank numbers and slot dividers belong to the slots**, so they never move. A slot that
fills changes its divider from dashed to solid in place (§4.2). A university entering the board fades
into its slot, one pushed below 8th fades out of slot 8, and an improved time crossfades while it
moves up. After a verdict, the board first arrives **as it was before the decision**
(`standingsBefore`, §7.5), and updates `--t-step` after the screen change ends. A decision that
changes nothing (a DNF, a slower time, a redo) moves nothing.

**Implementation.** The browser's View Transitions API (`document.startViewTransition`), in Chrome
or Edge 111+. The audience window runs its DOM update inside it when the rules above call for a
transition, and patches in place otherwise, as before. A change that arrives while a transition is
running ends that transition early, which the browser does on its own. With no API support, or with
`prefers-reduced-motion: reduce`, every change is a cut (§2.2).

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
4. **Leaving ATTRACT is animated** (decided 2026-09-19 with PENDING, §2.7). On the first N, the logo
   shrinks into Mezcla's header, the called university's plate leaves the grid for Mezcla's, and the
   band rises from the bottom edge. The other plates and the footer are pushed up by the band's
   height and fade out over `--t-step`. ATTRACT itself looks the same.

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
- Accepting or DNF-ing attempt 3 shows **Resultado**, after PENDING's 3 s verdict (§7.2). It stays
  up until the operator presses `N`. There is **no timeout**.
- `N` shows **Mezcla**, attempt 1, with a fresh scramble.
- Accepting attempt 1 or 2 shows **Mezcla** for the next attempt with a new scramble (the existing
  auto-arm), after the verdict. A redo shows Mezcla for the same attempt.
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
  has `margin-bottom 1cqw`, followed by **8 slots, always** (changed 2026-09-19, §4.9). The
  ranked universities in `snapshot.standings` (§4.3) fill them from the top, and the rest are
  empty slots.
  - **Row:** grid `2.2cqw 1fr auto`, `gap .85cqw`, `align-items: baseline`, `padding .38cqw 0`,
    `--fs-body`, `border-bottom 1px rgba(35,31,102,.5)`. The row pitch is 2.91cqw, and the column
    fits 11 rows, so 8 always fit.
  - **Cells:** rank in `--violet` 700; name in `#e8e6ff` with ellipsis overflow (UNICARIBE, the
    longest, fits); time with `tabular-nums` 500.
  - **Leader (row 1):** all three cells in `--gold-text` 800, on `rgba(171,166,247,.1)`, with
    `margin 0 -.8cqw`, `padding-inline .8cqw` and `border-radius var(--radius)`. Only once slot 1
    holds a university; an empty slot 1 is an ordinary empty slot.
  - **Featured university** (`result.teamId` in Resultado, the selected team in Mezcla): name in
    `#fff` 800 **when it is in the slice**. It is never pinned or added when it is not.
  - **Empty slot:** the row's grid and pitch with its rank number, no name and no time. Its rank
    number and its divider are in the empty-slot colour, `rgba(171,166,247,.45)` (§2.1), and the
    divider is **dashed**:
    `border-bottom-color: transparent; background: repeating-linear-gradient(90deg, rgba(171,166,247,.45) 0 .55cqw, transparent .55cqw .95cqw) left bottom / 100% 1px no-repeat`.
    A slot that fills keeps its place, and its divider turns solid.
  - **Nobody ranked:** eight empty slots. The "Aún no hay tiempos" line is gone.
  - The dashes are lines, never the `—` character, which keeps its one meaning (§2.6, §4.3).

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
| First university, Mezcla, nobody ranked | Side column shows eight empty slots |
| Fewer than 8 ranked | They fill slots 1 to k, and slots k+1 to 8 are empty |
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
`standby-09-final.html`, and the empty and part-filled standings against
`standby-10-placeholder-rows.html` (option B). Then check the invariants:
- the band is the same height in both states;
- a 21-move scramble stays on one line;
- the mascot's cut sits inside the band;
- no `--go` anywhere on the screen;
- the standings column always holds 8 slots, and an empty slot is as tall as a filled one;
- no `—` character appears in the standings column.

### 4.9 Changes since STANDBY was approved

Decided on 2026-09-19, while PENDING was designed. Mockups: `standby-10-placeholder-rows.html`
(options A, B and C; **B** was chosen) and `standby-11-board-fill.html` (the update).

1. **The standings column always holds 8 slots** (§4.2). Empty slots show their rank number and a
   dashed divider in the empty-slot colour, so the board is visibly waiting to be filled. This
   replaces the "Aún no hay tiempos" line and the list that grew row by row. Fill-in lines under the
   name and the time (A) and dashed outlines (C) were the alternatives.
2. **The standings update where the room can see it** (§2.7). After a verdict, the board arrives as
   it was before the decision, then universities move to their new slots.
3. **Screen changes move shared elements** (§2.7): N from ATTRACT, N from Resultado, ←/→, and the
   mat reset into ARMED. The figure block's divider is drawn as its own element for this.

`audienceStandings` (§4.3) is unchanged. It still returns at most 8 ranked universities, and the view
draws the empty slots.

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
   `inspectionMs`. Whether the audience sees the suggestion is PENDING's own question. **Resolved in
   §7.1:** it does not. The room sees only the verdict.
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
2. **Screen changes into and out of ARMED move shared elements** (§2.7, decided 2026-09-19 with
   PENDING). The plate, the divider, `INTENTO · n · DE {n}` and the name travel between Mezcla's
   places and ARMED's. For that, the text block's divider is its own element, and the who line holds
   its pieces as separate elements. ARMED itself looks the same.

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
   **Resolved in §7.1:** the suggestion reaches only the operator, and the red holds through the
   review.
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

## 7. Screen 5 — PENDING

**Purpose:** the mat has stopped on a time, and the operator decides whether it counts. PENDING is an
unconditional gate (system design §5). The screen covers the **review**, until the operator's key,
and the **verdict** the room sees for 3 s after it.
**Mockup:** **`pending-16-final.html`**. The top shows the four keys live, each from RUNNING through
the verdict, the screen change and the standings update. The bottom shows the stills the loop
doesn't reach. The history runs through `pending-01-waiting.html` (the review, option C),
`pending-02-verdict.html` (replace or annotate: the clock became the result, and the tag was kept),
`pending-03-plus2.html` (how the +2 is added, option C), `pending-04-beat.html` (the whole verdict),
`pending-05-redo.html` (the rewind, option B) and `pending-07-cutoff.html` (past the cutoff, option
A), plus the screen-change mockups in §2.7. They load the same mockup-only files as STANDBY (§4),
and the live ones need the View Transitions API.

### 7.1 The review

While `phase === 'PENDING'`:

| Condition | Clock | Status line |
|---|---|---|
| `displayMs ≤ cutoffMs` | `formatMs(displayMs)` in `--violet` | **EN REVISIÓN**, `--violet` |
| `displayMs > cutoffMs` | `formatMs(displayMs)` in `--red` | **LÍMITE EXCEDIDO · EN REVISIÓN**, `--red` |

- **Layout:** RUNNING's, unchanged (§6.2), so the room's eyes don't move when the mat stops.
- **White is official, violet is provisional.** The digits freeze the instant the mat stops, since
  the mat drives the stop. The colour then goes from `#fff` to `--violet` over `--t-short`.
- **Past the cutoff, the red holds** from RUNNING. It is still true, and it is the likely reason for a
  DNF. Red means "past the cutoff", the more specific state, the way ARMED's green outranks white.
- **The room never sees the suggested inspection penalty** (§5.6). A penalty is shown only once the
  operator applies it, in the verdict. ARMED's countdown has already shown `+2` or `DNF` when the
  start was late. The operator sees the suggestion (§7.7).
- **The maze stays frozen** (§2.5).

### 7.2 The verdict

The operator's key records the decision, and the phase moves on at once: SCRAMBLE with the next
scramble, or STANDBY after attempt 3 (system design §5). The audience keeps PENDING's layout and
shows the **verdict** for `VERDICT_MS` (3000 ms) from the key, then changes screen (§2.7).

**The grammar:** the clock becomes the result, and white means official. A penalty is announced by a
tag beside the time, then applied to the clock. `--go`, `--gold` and `--red` never appear in a
verdict.

| Key | At the key | +300 ms | +700 ms | Landed | Status line |
|---|---|---|---|---|---|
| Space | the colour change starts | — | — | the time, `#fff` (after `--t-short`) | TIEMPO VÁLIDO |
| 2 | the `+2` tag enters | the seconds step +1 | the seconds step +1 again; lands | `formatMs(ms + 2000)`, `#fff` | PENALIZACIÓN +2 |
| D | the `DNF` tag enters | — | `DNF` replaces the time; lands | `DNF`, `#fff` | per §7.3 |
| R | — | the rewind starts | … | `0.00`, `--violet`, at +1100 ms | ANULADO · SE REPITE |

- **Two schedule points** belong to the verdict: **+300 ms**, when the tag has entered
  (`--t-short`) and had a moment to be read, and **+700 ms**, one `--t-step` later, when the +2 and
  the DNF land. They are offsets, not durations, so the motion signature still has three durations.
- **The status line** changes to the verdict's words at the key. It is `--violet`, and the change is
  instant.
- **The clock's colour until it lands** is `--violet`. A time past the cutoff turns from `--red` to
  `--violet` at the key, over `--t-short`, because the review is over. It turns `#fff` when it lands,
  over `--t-short`. A redo never lands as official, so its clock stays `--violet`.
- **The tag** (`+2` or `DNF`): `--fs-hero`, 800, `#fff`, `letter-spacing -.01em`, positioned outside
  the flow at the clock's right edge (`position: absolute; left: 100%; top: .06em; margin-left:
  .12em`), so the clock never re-centres because of it. It enters with `opacity 0 → 1` and
  `translateY(.25em) → 0` over `--t-short`. When the verdict lands it leaves with `opacity → 0` and
  `translateX(-.35em)` over `--t-short`, sliding into the clock.
- **The +2 ticks** are two instant text swaps, `formatMs(ms + 1000)` at +300 ms and
  `formatMs(ms + 2000)` at +700 ms. The hundredths never change. If the +2 carries the time past
  `10.00` or `1:00.00`, the clock gains characters and re-centres, as on RUNNING (§6.2).
- **The redo rewind** starts at +300 ms and runs over `--t-long` with `--ease`, drawn every frame:
  `formatMs(round10(ms × (1 − ease(p))))`. It re-centres as it loses characters, and lands on `0.00`,
  which is what the mat will show once it is reset for the repeat.
- **Who line:** the decided attempt's number (`verdict.attempt`), not the next one.
- **Band:** from the key it shows the snapshot's scramble, which is the next attempt's (auto-arming,
  system design §5). After attempt 3 there is none, so it shows Resultado's wait line and the empty
  cube slot (§4.2).
- **After the verdict:** the screen changes to Mezcla (attempts left, including after a redo) or to
  Resultado (after attempt 3), per §2.7. On the way to Resultado, the clock carries `time` and shrinks
  into MEJOR TIEMPO **when the decided attempt set the university's best time**: the kind is `OK` or
  `+2`, and its effective time equals `result.bestMs`. A tie counts, because the number is the same.
  Otherwise the clock fades and MEJOR TIEMPO fades in.
- **A window that did not see the review** renders the landed frame without animating: an audience
  window opened mid-verdict, or one whose previous screen was not this attempt's review. Under
  `prefers-reduced-motion`, every verdict shows its landed frame at once, with no tag.

### 7.3 Wording

| When | Status line |
|---|---|
| Review | **EN REVISIÓN** |
| Review, past the cutoff | **LÍMITE EXCEDIDO · EN REVISIÓN** |
| Space | **TIEMPO VÁLIDO** |
| 2 | **PENALIZACIÓN +2** |
| D | **INTENTO INVÁLIDO** |
| D, the time past the cutoff | **LÍMITE EXCEDIDO** |
| D, inspection past 17 s | **INSPECCIÓN EXCEDIDA**, ARMED's own words (§5.2) |
| R | **ANULADO · SE REPITE** |

- A DNF past both the cutoff and 17 s of inspection reads LÍMITE EXCEDIDO, because the room watched
  the red.
- The status line keeps RUNNING's type: `--fs-body`, `.24em`, regular weight. The longest string,
  LÍMITE EXCEDIDO · EN REVISIÓN, fits easily.
- Each string is defined once in the view code, so the wording can change without touching the rules
  (§2.6).

### 7.4 Layout

**RUNNING's, unchanged** (§6.2), which is ARMED's (§5.3): the background, header, who line, clock,
status line and band keep their places and sizes. PENDING adds only the tag element (§7.2). With the
widest clock the cutoff allows, the tag ends well inside the stage: `4:59.99` spans 25.6–74.4cqw, and
a `DNF` tag adds about 9cqw.

### 7.5 Core

Pure, in `js/core/`, tested with `node --test`.

**Constants.** `VERDICT_MS = 3000`, from the key to the screen change.
`STANDINGS_UPDATE_MS = VERDICT_MS + 800 + 400`: the screen change (`--t-long`), then the pause
(`--t-step`). The two numbers mirror the motion tokens (§2.2), and a comment should tie them
together.

**Run state** gains `lastDecision`, which is not persisted:

```js
lastDecision: {
  kind,    // 'OK' | '+2' | 'DNF' | 'REDO'
  teamId, attempt,
  ms,      // pendingMs, the stopped time, without the penalty
  reason,  // DNF only: 'CUTOFF' | 'INSPECTION' | null. Otherwise null
  at,      // the key's timestamp
} | null
```

- `accept`, `plus2`, `dnf` and `redo` in PENDING set it.
- It is cleared by the commands that act after it (N, ←/→ and U), and by SCRAMBLE → ARMED. So the
  last attempt in the log is always the decided one while it is set. `Space` and `Esc` act only in
  ARMED, where it is already clear, so a second `Space` pressed by accident after accepting leaves
  the verdict alone (settled when the engine plan was amended, its decision 13).
- `reason`, for a DNF: `'CUTOFF'` when `ms > cutoffMs`, otherwise `'INSPECTION'` when
  `suggestedPenalty(inspectionMs) === 'DNF'`, otherwise `null`.

**Derived** from state and `now` by `buildSnapshot`:

- `verdict`: `{ kind, teamId, attempt, ms, reason }` while `now - at < VERDICT_MS`, otherwise `null`.
- `standingsBefore`: `audienceStandings(standings(undoLast(event).event), 8)` while
  `now - at < STANDINGS_UPDATE_MS` and `kind !== 'REDO'`, otherwise `null`. A redo records nothing,
  so the board has nothing to update.

**Timing without the mat.** Snapshots follow the mat's packets, but the verdict's end must not wait
for one. The operator window also re-publishes at `at + VERDICT_MS` and at
`at + STANDINGS_UPDATE_MS`.

### 7.6 Snapshot changes

This extends §5.5. The audience window still holds no state of its own.

```js
{
  phase, competitor, attemptNo, displayMs, cutoffMs, scramble, scrambleSvg, signal, standings, result,
  inspectionMs, hands,
  verdict,          // NEW: { kind, teamId, attempt, ms, reason } for VERDICT_MS after a decision, or null
  standingsBefore,  // NEW: the audience standings without the last recorded attempt, or null
}
```

- `screenFor` shows PENDING's layout for `phase === 'PENDING'`, and for SCRAMBLE or STANDBY while
  `verdict !== null`.
- A verdict finds its university by `verdict.teamId` in `snapshot.teams`, because `competitor` is
  `null` in STANDBY.
- The standings column draws `standingsBefore ?? standings`.

### 7.7 Requirements for other screens

These came up while designing PENDING. The screens themselves are not designed here.

1. **OPERATOR PANEL (screen 10):** in PENDING, the stopped time, whether it is past the cutoff,
   `inspectionMs` and `suggestedPenalty` (§5.6), and the four keys: `Space` accept, `2` +2, `D` DNF,
   `R` redo. During the verdict, the panel should show what the room is seeing, and that the next
   scramble is ready. A mat reset during the verdict ends it (§7.8).
2. **RESULTS (screen 6):** follows §2.7. Whether RESULTS reuses the idea that the time moves into
   its place is its own question. **Resolved in §8.2:** the plates move into their places instead,
   by identity, through ATTRACT, and the times fade in once the plates have landed.
3. **NO SIGNAL (screen 7):** it takes over during the review or the verdict like anywhere else. The
   verdict's 3 s keep running in the core, so when the signal returns, whatever is current is shown.

### 7.8 Edge cases

| Case | Behaviour |
|---|---|
| Mat reset during the verdict | ARMED at once. `lastDecision` is cleared. Same family, so no screen change runs (§2.7) |
| N or ←/→ during the verdict (after attempt 1 or 2) | `lastDecision` is cleared, and Mezcla for the chosen university follows §2.7 |
| A second `Space`, or an `Esc`, during the verdict | Nothing changes: both act only in ARMED (§7.5) |
| U during or after the verdict | PENDING reopens under EN REVISIÓN with the same time. The maze freezes, and the change from Mezcla or Resultado runs in reverse (§2.7) |
| Attempt 3 decided | At the key the band shows the wait line. After 3 s, Resultado |
| +2 carries the time past 1:00.00 (`58.50`) | The second tick reads `1:00.50`, and the clock re-centres |
| +2 on a time past the cutoff | Red in review, violet from the key, the ticks, lands `#fff` under PENALIZACIÓN +2 |
| Accepting a time past the cutoff | Lands `#fff` under TIEMPO VÁLIDO. The cutoff warns, it doesn't decide (system design decision 5) |
| DNF past both the cutoff and 17 s | LÍMITE EXCEDIDO |
| Attempt 3 ties the best | The clock moves into MEJOR TIEMPO |
| Attempt 3 is a DNF, an earlier attempt is OK | The clock fades, and MEJOR TIEMPO fades in |
| All three DNF | Resultado with `—` and SIN TIEMPO VÁLIDO (§4.2). The clock fades |
| Audience window opened mid-verdict | The landed frame, with no animation (§7.2) |
| Operator window reloaded mid-verdict | `lastDecision` isn't persisted, so there is no verdict. The attempt is on disk, and the screen is Mezcla or Resultado |
| Roster has no participant name | Name line omitted, as on ARMED |
| `prefers-reduced-motion: reduce` | Landed frames at once, and every screen change is a cut |
| Signal lost | NO SIGNAL (screen 7) takes over |

### 7.9 Testing

**Core (`node --test`):**

- **`lastDecision`:**
  - `accept`, `plus2`, `dnf` and `redo` set it, with the attempt number, the stopped time (no
    penalty) and the key's timestamp;
  - N, ←/→, U and SCRAMBLE → ARMED clear it; a `Space` or an `Esc` during the verdict does not.
- **`reason`:** a DNF at `cutoffMs + 10` → `CUTOFF` · at exactly `cutoffMs` → not `CUTOFF` · with
  `inspectionMs` 17001 → `INSPECTION` · both → `CUTOFF` · `OK`, `+2` and `REDO` → `null`.
- **`buildSnapshot`:**
  - `verdict` is present at `at + 2999` and `null` at `at + 3000`;
  - `standingsBefore` is present at `at + 4199` and `null` at `at + 4200`, is `null` after a redo,
    and equals the audience standings without the last attempt.

**Audience view (pure, `node --test`):**

- the review's colour and words, under and past the cutoff;
- each verdict's landed frame and words, including both DNF reasons;
- the `time` identity is set for `OK` or `+2` equal to `result.bestMs` (a tie too), and absent for a
  DNF or a slower time;
- `screenFor` gives PENDING's layout for SCRAMBLE or STANDBY with a verdict;
- the standings column draws 8 slots, and prefers `standingsBefore`.

**Mock driver scenarios:** a clean solve then each of `Space`, `2`, `D` and `R` · a cutoff overrun
then `D` · a start past 17 s of inspection then `D`.

**Visual:** render the review, each landed verdict and the stills at 1920×1080, and compare them
against `pending-16-final.html`. Then check the invariants:
- the header, who line, band and the clock's position are identical to RUNNING's;
- the tag never moves the clock;
- there is no `--go` and no `--gold`, and `--red` appears only in the review of a time past the
  cutoff;
- the maze does not advance during the review and the verdict: two frames a second apart are
  identical;
- the screen changes 3 s after the key, and under `prefers-reduced-motion` it is a cut.

**Screen changes (browser):** a view transition runs on each change in §2.7's table, none runs
within the *solo* family, and every name §2.7 lists for a change exists on both sides of it.

---

## 8. Screen 6 — RESULTS

**Purpose:** the final standings, once the event is over. Each participant's prize is a CTF flag
that the organiser sends them privately, and **the flag depends on the place**. So RESULTS has no
prize-giving to accompany: it is a **closing board** that goes up on the operator's `F` and stays
until they act again, and every place on it counts. It never shows a flag.
**Mockups:** **`results-05-paws.html`** (the whole sequence, live; stage C is the decision) and
**`results-04-kitty-above.html`** (the still, section 1). The history runs through
`results-01-layout.html` (three layouts, C chosen), `results-02-attract-to-results.html` (the
sequence; A, every plate at once, chosen), `results-03-mascot.html` (where the mascot goes: over the
winner, with a new asset) and `results-04-kitty-above.html` (the asset; the climb preferred). They
load the same mockup-only files as STANDBY (§4), plus `rootkitty-from-above.png`, a copy of the
asset. The live ones need the View Transitions API. The layouts in `results-01` to `results-03`
have 13.4cqw grid plates, superseded by 12.7cqw (§8.3); this spec wins (§1).

### 8.1 Decisions

Settled in words before any mockup:

1. **A closing board, not a reveal.** It arrives in one sequence and stays up. STANDBY shows the
   standings all evening, so by the end the order is no secret. A reveal paced by the operator's
   keys, and a timed one, were declined.
2. **Every place counts.** The flag depends on the place, so all thirteen are first-class and must
   read from the back of the room.
3. **Best time only.** One time per university, as on STANDBY's standings. Showing all three
   attempts, which would let each participant check the tie-break, was declined in favour of a calmer
   screen with larger type. The export keeps every attempt (system design §7).
4. **`F`, a key of its own.** An absent university must not stop the event from ending, and `N`
   can't end it: once the others are done it keeps coming back to the absent one (engine plan
   decision 5). `N` from the last Resultado, and RESULTS appearing on its own after the last verdict,
   were declined. `F` also answers "start fresh" on the operator window's resume prompt (engine plan
   Task 17). That prompt runs before the event and takes no other key, so the two never meet.

### 8.2 The sequence

`F` in STANDBY or SCRAMBLE (Resultado, or Mezcla, or ATTRACT before anyone has finished) moves the
phase to **RESULTS**. The audience sees this, timed from the key:

| From `F` | Screen | What happens |
|---|---|---|
| 0 | → ATTRACT, the **bridge** | ATTRACT → Mezcla in reverse (§2.7): the logo grows back into the hero, the plate on screen returns to its slot in the grid, the band sinks, and the grid and footer come down with it. The footer reads **Resultados finales** |
| 800 ms | ATTRACT holds | Nothing moves but the maze and the logo's pulse (§3.2) |
| 2400 ms | → RESULTS | Every plate moves from the grid to its place at once, over `--t-long`. The logo shrinks into the header. The face, tagline and footer fade over `--t-step` |
| 3200 ms (the change + 800) | RESULTS | The plates have landed. The labels, places and times fade in over `--t-step`, and the kitty climbs up from behind the winner's plate over `--t-long` (§8.5) |
| 4000 ms (the change + 1600) | RESULTS | The kitty's paws come over the plate's edge, over `--t-step` |
| 4400 ms (the change + 2000) | RESULTS | Everything is in place |

- **Why the bridge.** The event opens on thirteen plates in roster order and closes on the same
  thirteen in finishing order, and the room watches one become the other.
- **The hold, 1600 ms, is two `--t-long`.** With the change into ATTRACT, the bridge lasts
  `RESULTS_INTRO_MS` = 2400 ms (§8.7).
- **All thirteen move together.** Places 4–13 first and the podium after, and a cascade from 13th up
  to 1st, were compared live and declined (`results-02`).
- **The times, the kitty and the paws animate only when RESULTS arrives from the bridge by a screen
  change.** An audience window that did not see the bridge shows the finished frame, as a verdict
  does (§7.2). Under `prefers-reduced-motion`, each change is a cut, the timing stays, and RESULTS
  arrives finished.

**Leaving RESULTS.** RESULTS stays up until the operator acts. There is no timeout.
- **`U`** takes back the last attempt and reopens its PENDING, as everywhere (engine plan decision
  3). The change is RESULTS → PENDING (§2.7).
- **`N`**, **`←`/`→`** call a university that still has attempts, such as a latecomer, and show its
  Mezcla (RESULTS → Mezcla, §2.7). When every university is done they do nothing, as today.
- **The mat is ignored**, since there is no competitor to arm. **`F` again** does nothing: the
  sequence doesn't replay.

### 8.3 Layout

```
┌──────────────────────────────────────────────────────────────┐  header, as STANDBY
│ [CTF logo]                              RESULTADOS FINALES   │
├──────────────────────────────────────────────────────────────┤
│                           (kitty)                            │
│                ┌───────┐ ┌─────────┐ ┌───────┐               │
│                │  2nd  │ │   1st   │ │  3rd  │               │  podium: 2nd, 1st, 3rd
│                └───────┘ │         │ └───────┘               │
│             SEGUNDO LUGAR└─────────┘TERCER LUGAR             │
│                1:44.18  PRIMER LUGAR 1:55.88                 │
│                           1:24.02                            │
│        ──────────────────────────────────────────────        │
│        [plate] [plate] [plate] [plate] [plate]               │  grid: places 4–13
│        4  2:07.31  5  2:19.04  …                             │
│        [plate] [plate] [plate] [plate] [plate]               │
│        9  3:40.10  …                      12  4:58.66     —  │
└──────────────────────────────────────────────────────────────┘
```

**Frame.** The live maze (§2.5) under STANDBY's veil (§4.2), and STANDBY's header with the logo on
the left and **RESULTADOS FINALES** on the right, in `--violet`, `.14em`. **There is no band.**
Thirteen places don't fit above it (the body is 39.02cqw with the band and 49.97cqw without), and
RESULTS has no scramble for it to hold.

**Body.** A flex column, centred on both axes, padding `.9cqw 3cqw 1.9cqw`:

1. **The podium.** A flex row in podium order, **2nd, 1st, 3rd**, `align-items: flex-end`,
   `gap 4.4cqw`. Each step is a column, centred:
   - the **plate** (§2.3): **22cqw** for 1st, with STANDBY's padding `1.3cqw 1.9cqw`, and **15cqw**
     for 2nd and 3rd, with `.9cqw 1.3cqw`;
   - the **label**, `--fs-label`, `.24em`, `--violet`, `margin-top 1.1cqw`: PRIMER LUGAR,
     SEGUNDO LUGAR or TERCER LUGAR (§8.6);
   - the **time**, 800, `line-height 1`, `-.01em`, tabular, `margin-top .4cqw`: `--fs-hero` in
     `--gold-text` for 1st, and `--fs-lead` in `#fff` for 2nd and 3rd.

   The 1st step also has `padding-top: calc(11cqw * 618 / 1200)` (5.67cqw), the kitty's height
   above the plate's edge (§8.4). Its plate is `position: relative; z-index: 1`.
2. **The grid**, places 4 to 13: `grid-template-columns: repeat(5, 12.7cqw)`, `gap 1.2cqw 2.2cqw`,
   `margin-top 2.2cqw`, `padding-top 1.6cqw`, `border-top 1px --violet-deep`. **12.7cqw is ATTRACT's
   own plate width** (§3.3), so these ten plates change place but not size on the way in. Each cell
   holds:
   - the plate, at `width 100%`, with ATTRACT's padding `.75cqw 1.1cqw`;
   - under it, `margin-top .55cqw`, one `--fs-lead` line, `justify-content: space-between`,
     `align-items: baseline`: the **place** in `--violet` 700 on the left, and the **time** in `#fff`
     500, tabular, on the right.

**Order.** `finalStandings` (§8.8) in its own order: ranked by position, then all-DNF, then never
competed (§4.3). Rows 1–3 are the podium and rows 4–13 the grid. **The layout is built for thirteen**,
as ATTRACT's grid is (§3.3).

**Colour.** `--gold-text` only for 1st, the leader's colour as on STANDBY. There is no silver and no
bronze: the palette has neither, and the podium stands out by size, weight and position alone. No
`--go`, no `--red` (except the kitty's glow), no new value.

**Fit**, measured in Chrome with roc-grotesk loaded:
- the header ends at 6.26cqw and the podium starts at 7.63cqw;
- the grid ends at 53.96cqw, 2.29cqw from the stage's bottom edge;
- the longest grid line, `12  4:58.66`, leaves 2.24cqw between the place and the time. An accepted
  time past ten minutes still fits: `10:02.15` and `59:59.99` leave 0.91cqw.

### 8.4 The kitty

`assets/rootkitty-from-above.png` (§2.4) looks over the top of the winner's plate, with its paws
hanging over the front of it.

```css
.kit     { position:absolute; top:0; left:50%; width:11cqw; transform:translateX(-50%); z-index:2;
           filter:drop-shadow(0 0 2.4cqw rgba(238,39,55,.3)); }
.kit img { width:100%; height:auto; aspect-ratio:1200/683; display:block; opacity:.9; }
```

- **11cqw is the band kitty's width** (§4.2), so there is no new mascot size. Its opacity and glow
  are the band kitty's too.
- **The head's flat bottom sits on the plate's top edge:** the 1st step's padding-top is exactly
  `11cqw × 618 / 1200`. The kitty is 6.26cqw tall, 5.67cqw of it above the edge, and centred on the
  22cqw plate (44.5–55.5cqw across a plate at 39–61cqw), so the paws land on the plate's flat top,
  inside its rounded corners. Measured in Chrome, the head's bottom is 0.01cqw from the edge.
- **In front of the plate**, `z-index: 2` over the plate's 1. The climb is drawn with a clip, not
  by putting the kitty behind the plate (§8.5).
- **The glow is on the wrapper**, so it follows whatever the clip leaves visible. A glow on the image
  would be cut off at its box.
- **`aspect-ratio: 1200/683` is required.** Without it, the box is 0 tall until the image has
  loaded, and so is the climb's `100%`: on a slow first load the kitty would have nothing to climb
  from. Browser testing found this.

### 8.5 The kitty's arrival

The kitty arrives only after the winner's plate has landed. If it came with the screen change, it
would sit over an empty spot while the plate was still moving. Two rules on the image:

```css
.arriving .kit img {
  animation: climb var(--t-long) var(--ease) 800ms both,
             paws  var(--t-step) var(--ease) 1600ms forwards;
}
@keyframes climb { from { translate:0 100%; clip-path:inset(0 0 109.52% 0) }
                   to   { translate:0 0;    clip-path:inset(0 0 9.52% 0) } }
@keyframes paws  { from { clip-path:inset(0 0 9.52% 0) } to { clip-path:inset(0) } }
```

- **The climb** (+800 to +1600 ms from the change): the kitty rises its own height, from just below
  the plate's edge to its place. The clip hides everything below the edge, so it looks as if it's
  climbing out from behind the plate. While the image is `y%` of its height below its place, the
  edge is `(9.52 + y)%` of its height up from its bottom. The translate and the clip therefore change
  together, in one keyframe rule on one curve, and the clip line stays on the edge. Measured with the
  animation paused at five points, the visible bottom was 0.000cqw from the edge each time.
- **The paws** (+1600 to +2000 ms): the clip opens past the edge, and the paws come over the front of
  the plate, 0.6cqw down. Over `--t-step` it read as more natural than over `--t-short`, which was
  compared live.
- **9.52%** comes from the image (§2.4). It changes only if the asset does.
- **The times**, the podium's labels and the grid's places fade in over `--t-step` from +800 ms:
  `animation: fade-in var(--t-step) var(--ease) 800ms both`, from `opacity: 0`.
- **`arriving`** is set by the audience view only when RESULTS comes from the bridge by a screen
  change (§8.2). The 800 ms and 1600 ms are offsets from the change, one and two `--t-long`. Like
  the verdict's +300 ms and +700 ms (§7.2), they are not durations, so the motion signature keeps
  its three.
- The fade was the alternative (`results-04`, `results-05` stage A), and the simpler one. The climb
  was chosen once the paws could have their own move without a second asset.

### 8.6 Wording

| Where | Text |
|---|---|
| Header, right | **RESULTADOS FINALES** |
| The bridge's footer, in place of *Comenzamos en breve* | **Resultados finales** |
| Podium labels | **PRIMER LUGAR** · **SEGUNDO LUGAR** · **TERCER LUGAR** |
| A university with no valid time (all DNF) | no place, and **`—`** where the time goes (§2.6, locked decision 4) |
| A university that never competed | no place, and **NO PARTICIPÓ** where the time goes, in label style: `--fs-label`, `.24em`, `--violet`, regular weight. It measures 10.21cqw in a 12.7cqw cell |

- **Participant names are not shown.** RESULTS is plates only, like the standings.
- Each string is defined once in the view code, as PENDING's are (§7.3).

### 8.7 Core

Pure, in `js/core/`, tested with `node --test`.

**Keymap.** `f` → the command `results`, next to `n`, `u` and the arrows. (The resume prompt's own
`F` is handled apart from the keymap, §8.1.)

**Run state** gains the phase **RESULTS** and `resultsAt: number | null`, which is not persisted:

- **`results`** in STANDBY or SCRAMBLE → `phase: 'RESULTS'`, `resultsAt: at`, `lastDecision: null`,
  and the attempt in progress dropped: `attemptNo`, `scramble` and `scrambleSvg` become `null`, as when
  a university completes. `teamIndex` is kept. Anywhere else, including RESULTS, it is ignored.
- **In RESULTS:** `N`, `←`/`→` and `U` act as they do in STANDBY, so RESULTS joins `IDLE_PHASES`
  (engine plan Tasks 8 and 9), which only those three commands read. `N` takes the university at
  `teamIndex` if it still has attempts, as from STANDBY, and otherwise moves on. Each of them clears
  `resultsAt`. `Space`, `Esc`, the four decision keys and the mat are ignored.
- **`U`** from RESULTS is the ordinary undo: it takes back the most recent attempt and reopens its
  PENDING gate.

**Constant.** `RESULTS_INTRO_MS = 800 + 1600`: the change into ATTRACT (`--t-long`) and the hold (two
`--t-long`). A comment should tie it to the motion tokens, as with `STANDINGS_UPDATE_MS` (§7.5).

**Timing without the mat.** The operator window re-publishes at `resultsAt + RESULTS_INTRO_MS`, as it
does at the verdict's end (§7.5).

**Audience view:**
- `screenFor`: `phase === 'RESULTS'` → `'attract'` while `resultsIntro`, then `'results'`.
- `familyOf('results')` is `'results'` (§2.7).
- ATTRACT's footer reads *Resultados finales* while the phase is RESULTS (§8.6).
- On the change into the bridge, the plate that was on screen before `F` carries its name: the
  previous snapshot's `result.teamId` on Resultado, or `competitor.id` on Mezcla. On the change out,
  every plate does (§2.7).
- The maze runs (§2.5). `mazeFrozen` needs no change.

### 8.8 Snapshot changes

This extends §7.6. The audience window still holds no state of its own.

```js
{
  phase,            // CHANGED: may be 'RESULTS'
  competitor, attemptNo, displayMs, cutoffMs, scramble, scrambleSvg, signal, standings, result,
  inspectionMs, hands, verdict, standingsBefore, teams,
  finalStandings,   // NEW: standings(event), all rows, while phase is RESULTS; otherwise null
  resultsIntro,     // NEW: phase === 'RESULTS' && now - resultsAt < RESULTS_INTRO_MS
}
```

- `competitor` is `null` in RESULTS, as in STANDBY.
- `finalStandings` is the full table from §4.3, `{ teamId, group, position, bestMs }` per row: ranked,
  then unranked, then pending. The capped `standings` is unchanged.

### 8.9 Requirements for other screens

These came up while designing RESULTS. The screens themselves are not designed here.

1. **NO SIGNAL (screen 7):** it must **not** take over RESULTS. By then the mat plays no part, and it
   is likely to be unplugged as the event packs up, which would cover the final standings.
2. **OPERATOR PANEL (screen 10):**
   - list `F`;
   - before and after `F`, say how many universities have not competed;
   - keep the JSON and CSV export (system design §7) within reach while RESULTS is up, because the
     export is how each flag gets matched to its place.

### 8.10 Edge cases

| Case | Behaviour |
|---|---|
| `F` from Mezcla | The same sequence. Mezcla's plate returns to its slot, and the band sinks with its scramble |
| `F` during the last verdict | `lastDecision` is cleared, so the verdict ends at once, and the sequence starts from Resultado's layout |
| `F` while universities have not competed | Allowed, so an absent university cannot block the end. Each shows NO PARTICIPÓ, after the all-DNF ones |
| `F` on ATTRACT, before anyone has finished | The footer's words change in place, and after the hold every university shows NO PARTICIPÓ. Harmless, and the operator panel warns (§8.9) |
| Fewer than three universities ranked | The podium still holds rows 1–3. A podium row with no valid time shows no label, no gold, and `—` or NO PARTICIPÓ where the time goes, as in the grid |
| A tie | Positions are always distinct: ties break on the second-best time, then roster order (system design §6) |
| `U` on RESULTS | PENDING reopens for the last attempt, and `resultsAt` is cleared. `F` again replays the whole sequence |
| `N` with a latecomer still to compete | Mezcla for that university. The band rises (§2.7) |
| `N` when every university is done | Nothing |
| A mat reset on RESULTS | Ignored |
| Operator window reloaded on RESULTS | The phase isn't persisted (system design §7), so Resume lands on Resultado. `F` again |
| Audience window opened during the bridge | ATTRACT with *Resultados finales*, then the change to RESULTS as usual |
| Audience window opened after the bridge | RESULTS finished, with no animation (§8.2) |
| An accepted time of ten minutes or more | Fits: `59:59.99` leaves 0.91cqw in a grid cell (§8.3) |
| `prefers-reduced-motion: reduce` | Cuts on the same timing, and RESULTS arrives finished |
| Signal lost | RESULTS stays up (§8.9) |

### 8.11 Testing

**Core (`node --test`):**

- **Keymap:** `f` and `F` → `results`.
- **Run state:**
  - `results` acts in STANDBY and SCRAMBLE, and is ignored in ARMED, RUNNING, PENDING and RESULTS;
  - it sets `resultsAt`, clears `lastDecision`, and drops the attempt in progress;
  - in RESULTS, the mat, `Space`, `Esc`, `2`, `D` and `R` change nothing;
  - `U` in RESULTS reopens PENDING for the last attempt and clears `resultsAt`;
  - `N` in RESULTS calls a university with attempts left, or does nothing when all are done.
- **`buildSnapshot`:**
  - `resultsIntro` is true at `resultsAt + 2399` and false at `+ 2400`;
  - `finalStandings` has one row per team in RESULTS, and is `null` in every other phase;
  - `competitor` is `null` in RESULTS.

**Audience view (pure, `node --test`):**

- `screenFor` gives `attract` during the intro and `results` after it; `familyOf('results')` is
  `results`;
- the podium holds rows 1–3 in the order 2nd, 1st, 3rd, and the grid rows 4–13;
- `—` for an unranked row and NO PARTICIPÓ for a pending one, neither with a place;
- gold only on a ranked 1st;
- ATTRACT's footer reads *Resultados finales* in RESULTS and *Comenzamos en breve* otherwise;
- `arriving` is set only for a change from the bridge.

**Mock driver scenario:** a full event with one university absent, then `F` from its Mezcla.

**Visual:** render RESULTS at 1920×1080 and compare it against `results-04-kitty-above.html`
(section 1), and the sequence against `results-05-paws.html` (stage C). Then check the invariants:
- all thirteen plates appear exactly once, and the grid's plates are 12.7cqw;
- the kitty's head bottom is on the winner's plate's top edge;
- no `--go`, no `--red` except the kitty's glow, and gold only on 1st;
- the maze runs on the bridge and on RESULTS.

**Screen changes (browser):**
- a view transition runs on each of §2.7's four new changes;
- on ATTRACT → RESULTS, every `plate-<teamId>` exists on both sides;
- paused at points through the climb, the kitty's visible bottom stays on the plate's edge.

---

## 9. Changes to the implementation plans

The engine plan (`plans/2026-09-18-tournament-engine.md`) and the first screens plan
(`plans/2026-09-18-audience-screens.md`) were written before PENDING was designed, and neither has
been executed. **Both were amended on 2026-09-19**, in the plan phase that followed this spec, as
listed below. The screens plan took RUNNING and PENDING in (item 1), so it now builds screens 1–5.
Planning also found two gaps, now closed in the engine plan: `formatCutoff` (§6.4) had no task, and
joined Task 3; and the roster generator could not write `config/event.json` in a fresh checkout,
which has no `config/` folder.

**Engine plan:**

1. **Task 9** (the run state, decisions): `lastDecision` (§7.5). It starts as `null` in
   `createState`, is set in `decide` and in `redo` (which must keep `pendingMs` for it before
   clearing), and is cleared by every other command and by SCRAMBLE → ARMED. Also its `reason`, from
   `suggestedPenalty` and `cutoffMs`, and the tests in §7.9.
2. **Task 11** (the snapshot): `verdict` and `standingsBefore` in `buildSnapshot`, with
   `VERDICT_MS` and `STANDINGS_UPDATE_MS`, and their tests.
3. **Task 12** (the mock driver): the scenarios in §7.9.
4. **Task 17** (the two windows): the operator window re-publishes at `at + VERDICT_MS` and at
   `at + STANDINGS_UPDATE_MS` (§7.5). The debug view keeps drawing PENDING until the screens replace
   it, and can ignore `verdict`.

**Screens plan:**

1. **Scope.** RUNNING and PENDING are now designed. Either this plan grows to include them, or they
   go to the plan for screens 4–10, as the roadmap has it. That is decided in the plan phase. Either
   way, the changes below alter what this plan builds for ATTRACT, STANDBY and ARMED.
2. **Task 4** (the screens, as HTML):
   - the standings column draws 8 slots with empty slots (§4.2), and the "Aún no hay tiempos" test and
     code go;
   - ARMED's who line is split into elements, and the dividers become their own elements;
   - the identities in §2.7 carry their `view-transition-name`.
3. **Task 6** (the audience window):
   - `css/tokens.css` gains the motion tokens (§2.2) and `--stage-w` (§2.7);
   - `audience.js` runs screen changes and standings updates inside `document.startViewTransition`,
     by §2.7's families, with the band's rise and the plates' push on leaving ATTRACT;
   - the maze pauses for RUNNING and PENDING, and while a verdict is on screen (§2.5), not only for
     RUNNING.
4. **Task 7** (the 1080p check): STANDBY's new invariants (§4.8), and the empty and part-filled
   standings against `standby-10-placeholder-rows.html`.
5. **Spec coverage**, at the end: rows for §2.2's motion signature, §2.7 and §4.9.

**RESULTS (§8, 2026-09-19) needs no amendment to either plan.** The engine plan leaves a RESULTS
phase out by name ("Not in this plan"), and nothing either plan builds contradicts §8. The next
screens plan, for RESULTS and NO SIGNAL, takes in all of RESULTS' work, the core included:
- the `results` command and its key, the RESULTS phase, `resultsAt`, RESULTS in `IDLE_PHASES`, and
  `RESULTS_INTRO_MS`, with the operator window's re-publish (§8.7);
- `finalStandings` and `resultsIntro` in `buildSnapshot` (§8.8);
- the view: RESULTS, the bridge's footer, the *results* family and the four new changes (§2.7), the
  kitty (§8.4, §8.5), and `assets/rootkitty-from-above.png` in the audience window.

Where that plan changes a file the first two plans create, such as `run-state.js`, `keymap.js`,
`snapshot.js`, `audience-screens.js` or `audience.js`, it builds on them as written.
