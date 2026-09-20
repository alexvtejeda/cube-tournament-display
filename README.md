# cube-tournament-display

A live tournament display for speedcubing events, driven by a **StackMat Gen 3/4 timer** over the
microphone input. Big timer, current scramble, and a running leaderboard on a projector, with a
separate operator console on the laptop.

Built because a commercial tournament display costs around $100 and does rather more than a small
event needs.

> **Status:** the engine runs, and the audience window shows the designed ATTRACT, STANDBY, ARMED,
> RUNNING and PENDING screens over the live maze, moving what they share from one screen to the
> next. The operator window still uses a plain-text debug view until its screen is designed.
> See [`docs/superpowers/specs/`](docs/superpowers/specs/) for the designs.

---

## What it does

- Decodes the StackMat's audio signal in the browser — no drivers, no dongle, just the 3.5 mm cable
- Runs a fixed competition format: **N teams × 3 attempts, best of 3**, with a configurable cutoff
- Generates WCA-legal random-state 3x3x3 scrambles and a cube preview per attempt
- Shows a clean audience view on a projector and keeps the controls on a second window
- Diagnoses the mat before the event, and mid-event, on the operator's screen alone: it either
  shows packets arriving or names the link that is broken, and ticks off a six-item test of the mat
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

## Running it

You need Node 24.2 or newer, and Chrome.

```sh
npm install          # cstimer_module, the scramble generator
npm test             # the core, the drivers and the server; no browser needed
npm run smoke        # both windows in headless Chrome, on the mock mat
npm run screens      # the designed screens at 1080p, checked and saved to test/browser/out/
npm start            # serves http://localhost:8080
```

`npm run screens` also needs internet access, for the Adobe Fonts kit. The audience window's screen
changes need Chrome or Edge 111 or newer; other browsers cut between screens.

Open the operator window at `http://localhost:8080/` and the audience window at
`http://localhost:8080/audience.html`, then drag the audience window to the projector. To rehearse
without a mat, add `?driver=mock` to the operator URL. The mock keeps its own saved results.

`config/event.json` is generated from the CTF database with `npm run gen-event`. Participant names go
in `config/participants.local.json`, as `{ "uce": "José Martínez" }`. Git ignores that file.

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

- `assets/rootkitty.svg`, `assets/rootkitty-face.svg`, `assets/rootkitty-face-attract.svg`,
  `assets/rootkitty-costume.webp`, `assets/rootkitty-from-above.png` — the RootKitty mascot
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
