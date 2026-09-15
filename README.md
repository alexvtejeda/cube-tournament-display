# cube-tournament-display

A live tournament display for speedcubing events, driven by a **StackMat Gen 3/4 timer** over the
microphone input. Big timer, current scramble, and a running leaderboard on a projector, with a
separate operator console on the laptop.

Built because a commercial tournament display costs around $100 and does rather more than a small
event needs.

> **Status:** design complete, implementation not started.
> See [`docs/superpowers/specs/`](docs/superpowers/specs/) for the system design.

---

## What it does

- Decodes the StackMat's audio signal in the browser — no drivers, no dongle, just the 3.5 mm cable
- Runs a fixed competition format: **N teams × 3 attempts, best of 3**, with a configurable cutoff
- Generates WCA-legal random-state 3x3x3 scrambles and a cube preview per attempt
- Shows a clean audience view on a projector and keeps the controls on a second window
- Survives a browser crash mid-event — every accepted result is written to disk as it happens

## Why it exists

Built for the **CTF Interuniversitario 2026**, an inter-university cybersecurity competition where
thirteen universities each send one participant to solve a 3x3x3 cube. The participants are CTF
players, not speedcubers, so the format and the failure handling are tuned for people who may take
several minutes — or not finish at all — rather than for sub-20-second solves.

## Hardware

- A StackMat Gen 3 or Gen 4 timer
- A 3.5 mm cable from the timer's data port to the computer's **line-in or microphone** input
- A laptop, ideally with a second display for the audience view

Because `getUserMedia` requires a secure context, the display must be served over `http://localhost`
or HTTPS. Opening the HTML as a `file://` URL will fail silently on the microphone.

---

## Licence

**GPL-3.0.** See [`LICENSE`](LICENSE).

This project includes `vendor/stackmat.js`, taken **unmodified** from
[csTimer](https://github.com/cs0x7f/cstimer) by cs0x7f, which is GPL-3.0. That makes this project a
derivative work, and it inherits the same licence.

Decoding a StackMat reliably means automatic gain control, a Schmitt trigger with hysteresis,
1200-baud bit slicing, and packet framing with checksums — all tuned against real hardware over
many years. Reimplementing it would have been both wasteful and worse. Credit where it is due.

`docs/reference/cstimer-timer-stackmat.js` is also from csTimer and is present **for reference
only** — it is never loaded. The run state machine is reimplemented from it.

### Artwork is not covered by the GPL

The GPL-3.0 applies to the **code**. It does not license the artwork, and some of the artwork is
not ours to license in the first place.

**Pentraze property, all rights reserved:**

- `assets/rootkitty.svg`, `assets/rootkitty-face.svg`, `assets/rootkitty-costume.webp` — the
  RootKitty mascot
- `assets/logo-ctf.svg` — the CTF Interuniversitario wordmark
- `vendor/hero-maze3d.js` — the maze background, from the CTF Interuniversitario site

**Third-party trademarks, used to identify the participating institutions:**

- `assets/universidades/*.png` — the logos of INTEC, ITLA, Loyola, PUCMM, UAPA, UCE, UCSD, UNAPEC,
  UNIBE, UNICARIBE, UNICDA, UNPHU and UTESA. Each belongs to the university it names. They appear
  here solely to identify the teams competing in this event, and no endorsement is implied.

If you fork this to run your own event, **replace all of the above with your own branding.** The
software is yours to use under the GPL; the mascot and the university marks are not.

`vendor/three.module.js` is [three.js](https://github.com/mrdoob/three.js), MIT licensed.

## Credits

- **[csTimer](https://github.com/cs0x7f/cstimer)** by cs0x7f — the StackMat decoder and the
  `cstimer_module` scramble generator. The hard parts.
- **[three.js](https://threejs.org/)** — the maze background renderer.
