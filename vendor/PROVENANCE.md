# Vendored code — provenance

Everything here came from somewhere else. This file records where, when, and whether it was
changed, so that upstream drift is always checkable with a diff.

Recorded **2026-09-15**.

| File | Source | Upstream ref | Modified |
|---|---|---|---|
| `stackmat.js` | [csTimer](https://github.com/cs0x7f/cstimer) `src/js/hardware/stackmat.js` | `2547d82` | **No — never edit** |
| `three.module.js` | [three.js](https://github.com/mrdoob/three.js), via `ctf-interuniversitario/public/assets/vendor/` | — | No |
| `hero-maze3d.js` | `ctf-interuniversitario/public/assets/js/hero-maze3d.js` | — | **Pending** — see below |

## `stackmat.js` — do not edit

This file is kept byte-for-byte identical to upstream. Everything it expects from its environment
(`execMain`, `$.now`, `$.noop`, `kernel.getProp`, `DEBUG`) is supplied from outside by
`js/drivers/shim.js`.

The reason is diagnostic, not ceremonial: if the decoder ever misbehaves against real hardware, an
unmodified file can be diffed against upstream to prove the fault is not ours. A locally "improved"
decoder would make every audio bug ambiguous.

To update it:

```sh
git -C ../cstimer cat-file -p <ref>:src/js/hardware/stackmat.js > vendor/stackmat.js
```

Then update the ref in the table above.

## `hero-maze3d.js` — pending refactor

Taken unmodified, but it does not yet fit this project. Upstream it self-initialises at import time
against hardcoded `#hero-canvas` and `#inicio` elements, and adds a `hero--maze` class to the hero
section.

Planned change: wrap it as `createMaze({ canvas })` returning `{ pause, resume, destroy }`, so the
display can freeze the maze while a solve is running. The rendering, maze generation, BFS
pathfinding and its existing guards (`prefers-reduced-motion`, tab-visibility pause,
IntersectionObserver pause, pixel-ratio cap, WebGL fallback) are kept as they are — they are good.

Once refactored, this row stops tracking upstream and the file becomes ours to maintain.

## Not vendored here

- **`cstimer_module`** — installed from npm (`cstimer_module@0.1.5`), not copied into the tree.
- **`docs/reference/cstimer-timer-stackmat.js`** — csTimer's timer-side adapter, kept as a written
  reference for the run state machine. Never loaded, never executed.

## Licences

`stackmat.js` is GPL-3.0 and makes this project a derivative work. `three.module.js` is MIT.
The maze, the mascot and the wordmark are Pentraze brand assets and are **not** GPL — see the
README.
