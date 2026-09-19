# Tournament Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `subagent-driven-development` (recommended) or
> `executing-plans` to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Build every part of the tournament display that does not depend on a screen's visual
design: the pure core (run loop, inspection, scoring, standings, snapshot), both StackMat drivers,
persistence and export, window sync, the scramble worker, and two bare windows that can run a whole
event on the mock mat.

**Architecture:** One pure reducer, `js/core/run-state.js`, takes three kinds of action: mat states
from a driver, operator commands, and scramble arrivals. It runs under `node --test` with no
browser. The operator window wires it to the browser: it stamps every event with `Date.now()`, saves
the attempt log, asks the worker for scrambles, and broadcasts a snapshot that the audience window
renders. Both windows draw plain-text debug views until the designed screens replace them.

**Tech Stack:** plain ES modules with no build step (system design §3). Node 24.2 or newer, for
`node --test` and the static server. `cstimer_module@0.1.5` from npm, for scrambles. The unmodified
`vendor/stackmat.js`, for the real mat. Headless Chrome, driven over the DevTools protocol, for one
browser smoke test.

**Specs:**
- `docs/superpowers/specs/2026-09-15-tournament-display-system-design.md` (approved).
- `docs/superpowers/specs/2026-09-16-tournament-display-ui-design.md`. This plan implements
  §4.3–§4.4, §5.1–§5.8, §6.4 and §7.5–§7.6, which are the parts that belong to the core.

**Amended on 2026-09-19** after PENDING was designed (UI spec §9): the operator's last decision and
its reason (Task 9), the verdict and the standings before it in the snapshot (Task 11), their
scenarios (Task 12), and the operator window publishing again when the verdict ends and when the
standings update (Task 17). `formatCutoff` (UI spec §6.4, RUNNING) joins Task 3. Task 2's generator
now creates `config/`, which a fresh checkout does not have.

**Amended again on 2026-09-19** for SIGNAL CHECK, the first operator screen (operator spec §4). The
screen itself is built by `plans/2026-09-19-signal-check.md`; what it needs from this plan is a
packet's bytes and bits, and `fresh` on every scripted state (Task 7), the `disarm` command
(Task 9), `s` in the keymap (Task 10), a synthesised audio sample from the mock mat (Task 12), and
`fresh` on the real driver's states (Task 13). That last one is a bug this plan would otherwise
ship: the decoder re-emits its last state object when the line idles, and copying every state
erases the only clue that a callback was not a new packet. Task 17 needs no change — the check's
routing seam belongs to the screen's own plan.

---

## Scope

This is the first plan. It covers roadmap Phase 2 rows **0 Scaffold**, **1 Driver seam**,
**2 Pure core**, **3 Scrambler**, **4 Sync** and **8 Persistence**, plus the operator's key loop
from row 5. The roadmap marks these rows as independent of the UI design, and every value they need
is already fixed in the two specs.

**Not in this plan.** These belong to the screens plans: the first,
`docs/superpowers/plans/2026-09-18-audience-screens.md`, for screens 1–5 and the maze, and later
ones for the rest as they are designed:
- the designed audience screens: tokens, ATTRACT, STANDBY, ARMED, RUNNING, PENDING, and screens 6–9;
- the operator panel's layout (screen 10);
- SETUP's first-run flow (screen 9), beyond a "Connect mat" button;
- NO SIGNAL's rendering (screen 7);
- a RESULTS phase (screen 6);
- the signal-check screen and its `S` key (screen 8);
- the `createMaze({ canvas })` refactor;
- hardware validation (roadmap row 10);
- authorising the Typekit production domain.

The two windows built here draw **debug views**: plain text showing every value the designed
screens will need. They are scaffolding, and screens 1–10 replace them. The controllers around them
(`js/ui/operator.js` and `js/ui/audience.js`) stay.

## Decisions this plan makes

The specs leave these open. Each one is the smallest choice consistent with the specs. Flag any you
disagree with before execution starts.

| # | Decision | Why |
|---|---|---|
| 1 | The roster order is `init.sql`'s: … UAPA, **UCSD, UCE**, UNAPEC … That order sets both turn order and the final tie-break | System design §1 makes `init.sql` authoritative. UI spec §3.3 lists ATTRACT's plates with UCE before UCSD. That is a display order, and it gets settled when ATTRACT is built |
| 2 | Participant names live in `config/participants.local.json` (`{ "uce": "José Martínez" }`) and are merged over `config/event.json` at load | The names are not in the CTF database, and they are personal data. `.gitignore` already ignores `*.local.json`. With no file there are no names, and the screens leave the name line out |
| 3 | **U** takes back the most recent recorded attempt and reopens its PENDING gate with the same time | A wrong key (Space where D was meant) is fixed by deciding again. A mat bump accepted by mistake is fixed with U, then R |
| 4 | A reset mid-solve (the timer stopping at 0.00) **stays in RUNNING** | System design §5 says every exit from RUNNING lands in PENDING, and §8 says a reset is not a finish. Staying in RUNNING satisfies both. The next start and stop finish normally |
| 5 | **N** continues the event and **←/→** skip around the roster. From STANDBY, N resumes the current university if it still has attempts (the start of the event, or a resume). Anywhere else, N moves on. Finished universities are skipped, the roster wraps round, and once everyone is done N does nothing | This handles an absent competitor, a case UI spec §4.2 already assumes. RESULTS will add its own transition |
| 6 | **R** draws a new scramble for the repeated attempt | System design decision 3: a fresh scramble for every attempt |
| 7 | RUNNING ignores every key. PENDING accepts only Space, D, 2 and R. N, ←/→ and U work in STANDBY, SCRAMBLE and ARMED | PENDING is an unconditional gate (system design §5) |
| 8 | Only one operator window can run, enforced with a **Web Lock** instead of a BroadcastChannel handshake | It cannot race, and the browser releases the lock when the window closes. The behaviour is the same as system design §8 |
| 9 | `cstimer_module` is served from `node_modules/`, not copied into `vendor/` | This follows `vendor/PROVENANCE.md` ("installed from npm, not copied into the tree"). The folder tree in system design §3 predates that note |
| 10 | Each attempt record carries `teamId`, and all attempts form one flat log | Undo becomes "remove the last entry", and UI spec §4.4's `result` becomes "the last entry that completed a university" |
| 11 | The mock mode (`?driver=mock`) saves under its own storage key and never asks before closing | A rehearsal can never touch a real event's results |
| 12 | The real driver checks `navigator.permissions` after it starts | The vendored decoder logs and swallows a `getUserMedia` failure. Without this check, a denied microphone would fail silently |
| 13 | The verdict (UI spec §7.5) ends on the commands that act: N, ←/→ and U, and on the mat's reset into ARMED. A command that changes nothing leaves it alone | `Space` and `Esc` act only in ARMED, where there is no verdict, and a second `Space` pressed by accident after accepting must not cut the room's verdict short. UI spec §7.5 was first written with `Space` and `Esc` on the list, and was corrected to match |

## Files

```
package.json, package-lock.json   scripts start · test · smoke · gen-event; one dependency
serve.js                          static server on 127.0.0.1 (a secure context for getUserMedia)
tools/gen-event.js                writes config/event.json from ../ctf-interuniversitario/init.sql
config/event.json                 generated: 13 universities, cutoff, attempts per competitor
index.html · audience.html        the two windows
css/debug.css                     styling for the debug views only
js/config.js                      loads event.json and merges participants.local.json
js/scrambler.js                   client for the cstimer_module worker
js/core/                          pure; no DOM, no audio, no timers
  format.js                       12.47 · 2:14.30
  inspection.js                   15 s inspection: countdown text, suggested penalty, hands
  event-model.js                  roster + attempt log; roster navigation; startedCount
  scoring.js                      effective time, standings, audience slice, latest result
  run-state.js                    the reducer
  keymap.js                       key → command
  snapshot.js                     the operator → audience payload
  store.js                        localStorage persistence
  export.js                       JSON and CSV
  channel.js                      BroadcastChannel sync and the one-operator Web Lock (both exist in Node too)
js/drivers/
  scenarios.js                    StackMat packet builders and named scenarios
  mock.js                         replays scenarios at 10 Hz
  shim.js                         the globals vendor/stackmat.js expects (a classic script)
  real.js                         wraps vendor/stackmat.js
js/ui/
  operator.js · operator-debug-view.js · audience.js · audience-debug-view.js
test/                             node --test "test/**/*.test.js"; test/browser/smoke.js runs via npm run smoke
```

## Conventions

- Use Node **24.2 or newer** (check with `node --version`). The tests rely on its `import.meta.main`,
  `BroadcastChannel`, `navigator.locks` and `WebSocket`.
- The code in every step is final. Copy it exactly: all of it was run, and passed, before this plan
  was written.
- **Never edit `vendor/stackmat.js`** (roadmap locked decision 7).
- Stage files by name. **Never run `git add -A` or `git add .`**
- End every commit message with the co-author trailer lines your session's instructions give.
- Run one test file with `node --test <file>`, and the whole suite with `npm test`.
- The expected counts assume this checkout, where `../ctf-interuniversitario/init.sql` exists.
  Without that file, one test in `test/tools/gen-event.test.js` reports **skipped** instead of
  passing.

---

### Task 1: Scaffold: package and static server

**Files:**
- Create: `package.json`
- Create: `serve.js`
- Test: `test/serve.test.js`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "cube-tournament-display",
  "version": "0.1.0",
  "private": true,
  "description": "Live tournament display for a StackMat-timed Rubik's cube event",
  "license": "GPL-3.0",
  "type": "module",
  "engines": {
    "node": ">=24.2"
  },
  "scripts": {
    "start": "node serve.js",
    "test": "node --test \"test/**/*.test.js\"",
    "gen-event": "node tools/gen-event.js"
  },
  "dependencies": {
    "cstimer_module": "0.1.5"
  }
}
```

- [ ] **Step 2: Install the scramble module**

Run: `npm install`
Expected: `added 1 package`. `package-lock.json` and `node_modules/cstimer_module/` now exist.
`node_modules/` is already gitignored.

- [ ] **Step 3: Write the failing test**, `test/serve.test.js`

```js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStaticServer } from '../serve.js';

let server;
let port;

before(async () => {
  const root = mkdtempSync(join(tmpdir(), 'ctd-serve-'));
  writeFileSync(join(root, 'index.html'), '<p>operator</p>');
  writeFileSync(join(root, 'app.js'), 'export {};');
  writeFileSync(join(root, '.secret'), 'hidden');
  mkdirSync(join(root, 'sub'));
  server = createStaticServer(root);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});

after(() => server.close());

// http.request sends the path as written; fetch would normalise the traversal attempts away.
function get(path) {
  return new Promise((resolve, reject) => {
    request({ host: '127.0.0.1', port, path }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body }));
    }).on('error', reject).end();
  });
}

test('serves index.html at the root', async () => {
  const res = await get('/');
  assert.equal(res.status, 200);
  assert.equal(res.type, 'text/html; charset=utf-8');
  assert.equal(res.body, '<p>operator</p>');
});

test('serves JavaScript with a JavaScript type, so modules and workers load', async () => {
  const res = await get('/app.js');
  assert.equal(res.status, 200);
  assert.equal(res.type, 'text/javascript; charset=utf-8');
});

test('refuses paths that climb out of the root', async () => {
  assert.equal((await get('/..%2f..%2fetc%2fpasswd')).status, 404);
  assert.equal((await get('/sub/..%2f..%2fapp.js')).status, 404);
});

test('refuses dotfiles', async () => {
  assert.equal((await get('/.secret')).status, 404);
});

test('answers 404 for missing files and directories', async () => {
  assert.equal((await get('/missing.js')).status, 404);
  assert.equal((await get('/sub')).status, 404);
});

test('answers 400 for a malformed path', async () => {
  assert.equal((await get('/%E0%A4%A')).status, 400);
});
```

- [ ] **Step 4: Run it and watch it fail**

Run: `node --test test/serve.test.js`
Expected: FAIL with `Cannot find module` for `serve.js`.

- [ ] **Step 5: Write `serve.js`**

```js
// Static server for the two windows. getUserMedia needs a secure context and http://localhost is
// one, which is why the app is never opened as file:// (system design §12).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
};

export function createStaticServer(root = fileURLToPath(new URL('.', import.meta.url))) {
  const base = resolve(root);
  return createServer(async (req, res) => {
    let path;
    try {
      path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const relative = path === '/' ? 'index.html' : path.slice(1);
    const file = resolve(base, relative);
    // Nothing outside the project, and no dotfiles: .git and .superpowers stay private.
    const hidden = relative.split('/').some((part) => part.startsWith('.'));
    if (hidden || !file.startsWith(base + sep)) {
      res.writeHead(404).end();
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 8080);
  createStaticServer().listen(port, '127.0.0.1', () => {
    console.log(`Operator  http://localhost:${port}/   (mock mat: http://localhost:${port}/?driver=mock)`);
    console.log(`Audience  http://localhost:${port}/audience.html`);
  });
}
```

- [ ] **Step 6: Run the test**

Run: `node --test test/serve.test.js`
Expected: `ℹ pass 6`, `ℹ fail 0`.

- [ ] **Step 7: Check that it serves this repo**

Run: `npm start`. It prints the operator and audience URLs on port 8080.
In a second terminal, run `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/vendor/stackmat.js`.
Expected: `200`. Then stop the server with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json serve.js test/serve.test.js
git commit -m "Add the package scaffold and the static server"
```

---

### Task 2: The roster, generated from the CTF database

**Files:**
- Create: `tools/gen-event.js`
- Create (generated): `config/event.json`
- Create: `js/config.js`
- Test: `test/tools/gen-event.test.js`, `test/config.test.js`

- [ ] **Step 1: Write the failing test**, `test/tools/gen-event.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildEvent, parseUniversities } from '../../tools/gen-event.js';

const INIT_SQL = new URL('../../../ctf-interuniversitario/init.sql', import.meta.url);
const EVENT_JSON = new URL('../../config/event.json', import.meta.url);

test('parseUniversities reads the CHECK constraint in order', () => {
  const sql = `CREATE TABLE users (
    university VARCHAR(20) NOT NULL,
    CONSTRAINT valid_university CHECK (university IN ('LOYOLA', 'INTEC', 'ITLA')),
    CONSTRAINT other CHECK (x IN ('NOPE'))
  );`;
  assert.deepEqual(parseUniversities(sql), ['LOYOLA', 'INTEC', 'ITLA']);
});

test('parseUniversities fails loudly when the constraint is missing', () => {
  assert.throws(() => parseUniversities('CREATE TABLE t (a int);'), /valid_university/);
});

test('buildEvent derives ids from the university and leaves names empty', () => {
  const event = buildEvent(['LOYOLA', 'UNICARIBE']);
  assert.equal(event.cutoffMs, 300000);
  assert.equal(event.attemptsPerCompetitor, 3);
  assert.deepEqual(event.teams, [
    { id: 'loyola', university: 'LOYOLA', participant: '' },
    { id: 'unicaribe', university: 'UNICARIBE', participant: '' },
  ]);
});

test('config/event.json has 13 teams, each with a logo', () => {
  const event = JSON.parse(readFileSync(EVENT_JSON, 'utf8'));
  assert.equal(event.teams.length, 13);
  for (const team of event.teams) {
    assert.ok(existsSync(new URL(`../../assets/universidades/${team.id}.png`, import.meta.url)), `logo for ${team.id}`);
  }
});

test('config/event.json matches the CTF database', { skip: !existsSync(INIT_SQL) && 'init.sql not checked out' }, () => {
  const expected = buildEvent(parseUniversities(readFileSync(INIT_SQL, 'utf8')));
  assert.deepEqual(JSON.parse(readFileSync(EVENT_JSON, 'utf8')), expected);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/tools/gen-event.test.js`
Expected: FAIL with `Cannot find module` for `tools/gen-event.js`.

- [ ] **Step 3: Write `tools/gen-event.js`**

```js
// Writes config/event.json from the CTF database's roster. The valid_university CHECK constraint
// in ctf-interuniversitario/init.sql is the source of truth (system design §1), so a university's
// spelling can never drift from the CTF's. Participant names are not in the database: see
// js/config.js.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export function parseUniversities(sql) {
  const match = sql.match(/CONSTRAINT\s+valid_university\s+CHECK\s*\(\s*university\s+IN\s*\(([^)]*)\)/i);
  if (!match) throw new Error('valid_university constraint not found in init.sql');
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

export function buildEvent(universities) {
  return {
    eventName: 'CTF Interuniversitario 2026 — Reto del Cubo',
    cutoffMs: 300000,
    attemptsPerCompetitor: 3,
    teams: universities.map((university) => ({ id: university.toLowerCase(), university, participant: '' })),
  };
}

if (import.meta.main) {
  const source = process.argv[2] ?? new URL('../../ctf-interuniversitario/init.sql', import.meta.url);
  const event = buildEvent(parseUniversities(readFileSync(source, 'utf8')));
  mkdirSync(new URL('../config/', import.meta.url), { recursive: true }); // a fresh checkout has none
  writeFileSync(new URL('../config/event.json', import.meta.url), `${JSON.stringify(event, null, 2)}\n`);
  console.log(`Wrote ${event.teams.length} teams to config/event.json`);
}
```

- [ ] **Step 4: Generate the roster**

Run: `npm run gen-event`
Expected: `Wrote 13 teams to config/event.json`. The file must read exactly:

```json
{
  "eventName": "CTF Interuniversitario 2026 — Reto del Cubo",
  "cutoffMs": 300000,
  "attemptsPerCompetitor": 3,
  "teams": [
    {
      "id": "loyola",
      "university": "LOYOLA",
      "participant": ""
    },
    {
      "id": "intec",
      "university": "INTEC",
      "participant": ""
    },
    {
      "id": "itla",
      "university": "ITLA",
      "participant": ""
    },
    {
      "id": "pucmm",
      "university": "PUCMM",
      "participant": ""
    },
    {
      "id": "uapa",
      "university": "UAPA",
      "participant": ""
    },
    {
      "id": "ucsd",
      "university": "UCSD",
      "participant": ""
    },
    {
      "id": "uce",
      "university": "UCE",
      "participant": ""
    },
    {
      "id": "unapec",
      "university": "UNAPEC",
      "participant": ""
    },
    {
      "id": "unibe",
      "university": "UNIBE",
      "participant": ""
    },
    {
      "id": "unicaribe",
      "university": "UNICARIBE",
      "participant": ""
    },
    {
      "id": "unicda",
      "university": "UNICDA",
      "participant": ""
    },
    {
      "id": "unphu",
      "university": "UNPHU",
      "participant": ""
    },
    {
      "id": "utesa",
      "university": "UTESA",
      "participant": ""
    }
  ]
}
```

- [ ] **Step 5: Run the test**

Run: `node --test test/tools/gen-event.test.js`
Expected: `ℹ pass 5`, `ℹ fail 0`.

- [ ] **Step 6: Write the failing test for the loader**, `test/config.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../js/config.js';

const EVENT = {
  eventName: 'Test',
  cutoffMs: 300000,
  attemptsPerCompetitor: 3,
  teams: [
    { id: 'intec', university: 'INTEC', participant: '' },
    { id: 'uce', university: 'UCE', participant: '' },
  ],
};

function fakeFetch(files) {
  return async (path) => ({ ok: path in files, json: async () => files[path] });
}

test('without a names file, participants stay empty', async () => {
  const config = await loadConfig(fakeFetch({ 'config/event.json': EVENT }));
  assert.deepEqual(config.teams.map((t) => t.participant), ['', '']);
});

test('names from participants.local.json are merged by team id', async () => {
  const config = await loadConfig(fakeFetch({
    'config/event.json': EVENT,
    'config/participants.local.json': { uce: 'José Martínez' },
  }));
  assert.deepEqual(config.teams.map((t) => t.participant), ['', 'José Martínez']);
  assert.equal(config.cutoffMs, 300000);
});
```

- [ ] **Step 7: Run it and watch it fail**

Run: `node --test test/config.test.js`
Expected: FAIL with `Cannot find module` for `js/config.js`.

- [ ] **Step 8: Write `js/config.js`**

```js
// Loads config/event.json. Participant names are personal data and are not in the CTF database,
// so they live in config/participants.local.json, { "<teamId>": "<name>" }, which git ignores.
// Without that file every name is empty, and the screens leave the name line out.
export async function loadConfig(fetchFile = (path) => fetch(path)) {
  const config = await (await fetchFile('config/event.json')).json();
  const response = await fetchFile('config/participants.local.json');
  const names = response.ok ? await response.json() : {};
  return {
    ...config,
    teams: config.teams.map((team) => ({ ...team, participant: names[team.id] ?? team.participant })),
  };
}
```

- [ ] **Step 9: Run the suite**

Run: `npm test`
Expected: `ℹ pass 13`, `ℹ fail 0`.

- [ ] **Step 10: Commit**

```bash
git add tools/gen-event.js config/event.json js/config.js test/tools/gen-event.test.js test/config.test.js
git commit -m "Generate the roster from the CTF database and load participant names locally"
```

---

### Task 3: Time format

The clock's format (system design §6), and the cutoff's for RUNNING's status line (UI spec §6.4).

**Files:**
- Create: `js/core/format.js`
- Test: `test/core/format.test.js`

- [ ] **Step 1: Write the failing test**, `test/core/format.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCutoff, formatMs } from '../../js/core/format.js';

test('under a minute: seconds and hundredths', () => {
  assert.equal(formatMs(0), '0.00');
  assert.equal(formatMs(9050), '9.05');
  assert.equal(formatMs(12470), '12.47');
  assert.equal(formatMs(59990), '59.99');
});

test('a minute or more: minutes, padded seconds, hundredths', () => {
  assert.equal(formatMs(60000), '1:00.00');
  assert.equal(formatMs(134300), '2:14.30');
  assert.equal(formatMs(299990), '4:59.99');
});

test('millisecond precision is truncated, never rounded up', () => {
  assert.equal(formatMs(154329), '2:34.32');
  assert.equal(formatMs(59999), '59.99');
});

test('the cutoff reads M:SS, with any remainder truncated', () => {
  assert.equal(formatCutoff(300000), '5:00');
  assert.equal(formatCutoff(240000), '4:00');
  assert.equal(formatCutoff(90000), '1:30');
  assert.equal(formatCutoff(45000), '0:45');
  assert.equal(formatCutoff(300999), '5:00');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/core/format.test.js`
Expected: FAIL with `Cannot find module` for `js/core/format.js`.

- [ ] **Step 3: Write `js/core/format.js`**

```js
// Time display (system design §6): `12.47` under a minute, `2:14.30` over. Truncates to
// hundredths, as the StackMat's own display does.
export function formatMs(ms) {
  const hundredths = Math.floor(ms / 10);
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor((hundredths % 6000) / 100);
  const fraction = String(hundredths % 100).padStart(2, '0');
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}.${fraction}` : `${seconds}.${fraction}`;
}

// RUNNING's status line, LÍMITE 5:00 (UI spec §6.4): M:SS. The cutoff is set in whole seconds, so
// there are no hundredths; a remainder is truncated, as formatMs does.
export function formatCutoff(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
```

- [ ] **Step 4: Run the test**

Run: `node --test test/core/format.test.js`
Expected: `ℹ pass 4`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/core/format.js test/core/format.test.js
git commit -m "Add the time and cutoff formats"
```

---

### Task 4: Inspection rules

UI spec §5.4. The boundary values in the test are copied from UI spec §5.8.

**Files:**
- Create: `js/core/inspection.js`
- Test: `test/core/inspection.test.js`

- [ ] **Step 1: Write the failing test**, `test/core/inspection.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handsFromHeader, inspectionDisplay, suggestedPenalty } from '../../js/core/inspection.js';

test('inspectionDisplay counts 15 down to 1, then +2, then DNF (UI spec §5.8)', () => {
  const cases = [[0, '15'], [999, '15'], [1000, '14'], [14001, '1'], [15000, '1'],
    [15001, '+2'], [17000, '+2'], [17001, 'DNF'], [60000, 'DNF']];
  for (const [elapsed, shown] of cases) assert.equal(inspectionDisplay(elapsed), shown, `at ${elapsed} ms`);
});

test('suggestedPenalty uses the same limits', () => {
  const cases = [[null, null], [0, null], [15000, null], [15001, '+2'], [17000, '+2'], [17001, 'DNF']];
  for (const [ms, penalty] of cases) assert.equal(suggestedPenalty(ms), penalty, `at ${ms} ms`);
});

test('handsFromHeader: C is down, A is ready, everything else is up', () => {
  assert.equal(handsFromHeader('C'), 'down');
  assert.equal(handsFromHeader('A'), 'ready');
  for (const header of ['L', 'R', 'I', 'S', ' ', undefined]) assert.equal(handsFromHeader(header), 'up');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/core/inspection.test.js`
Expected: FAIL with `Cannot find module` for `js/core/inspection.js`.

- [ ] **Step 3: Write `js/core/inspection.js`**

```js
// 15-second inspection (UI spec §5.1, §5.4). The limits are competition rules, not event config.
export const INSPECTION_MS = 15000;
export const INSPECTION_DNF_MS = 17000;

// What the countdown reads after `elapsedMs`: 15 down to 1 (never 0), then +2, then DNF.
export function inspectionDisplay(elapsedMs) {
  if (elapsedMs <= INSPECTION_MS) return String(Math.max(1, Math.ceil((INSPECTION_MS - elapsedMs) / 1000)));
  if (elapsedMs <= INSPECTION_DNF_MS) return '+2';
  return 'DNF';
}

// The penalty PENDING suggests for a solve started after `inspectionMs`. Same limits as the
// display, so the countdown reads +2 exactly when a start would earn one. Never applied here.
export function suggestedPenalty(inspectionMs) {
  if (inspectionMs === null || inspectionMs <= INSPECTION_MS) return null;
  return inspectionMs <= INSPECTION_DNF_MS ? '+2' : 'DNF';
}

// The mat's header byte as the audience sees it. One hand down reads as 'up'.
export function handsFromHeader(signalHeader) {
  if (signalHeader === 'C') return 'down';
  if (signalHeader === 'A') return 'ready';
  return 'up';
}
```

- [ ] **Step 4: Run the test**

Run: `node --test test/core/inspection.test.js`
Expected: `ℹ pass 3`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/core/inspection.js test/core/inspection.test.js
git commit -m "Add the inspection rules: countdown text, suggested penalty, hands"
```

---

### Task 5: The event model

This is the roster plus the flat attempt log (decision 10), roster navigation (decision 5), and the
header's `{n}` (UI spec §4.2).

**Files:**
- Create: `test/helpers/fixtures.js`
- Create: `js/core/event-model.js`
- Test: `test/core/event-model.test.js`

- [ ] **Step 1: Write the shared test fixtures**, `test/helpers/fixtures.js`

```js
// Small builders shared by the core tests.
export function makeConfig(ids = ['alfa', 'beta', 'gamma', 'delta'], overrides = {}) {
  return {
    eventName: 'Test event',
    cutoffMs: 300000,
    attemptsPerCompetitor: 3,
    teams: ids.map((id) => ({ id, university: id.toUpperCase(), participant: '' })),
    ...overrides,
  };
}

export function attempt(teamId, n, ms, extra = {}) {
  return { teamId, attempt: n, ms, penalty: null, status: 'OK', scramble: "R U R'", inspectionMs: null, at: 0, ...extra };
}

export const dnf = (teamId, n, ms = 60000) => attempt(teamId, n, ms, { status: 'DNF' });
export const plus2 = (teamId, n, ms) => attempt(teamId, n, ms, { penalty: '+2' });
```

- [ ] **Step 2: Write the failing test**, `test/core/event-model.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attemptsFor, createEvent, findTeam, isComplete, nextAttemptNo, recordAttempt, startedCount, undoLast,
} from '../../js/core/event-model.js';
import { attempt, makeConfig } from '../helpers/fixtures.js';

const config = makeConfig(); // alfa, beta, gamma, delta · 3 attempts each

test('attemptsFor keeps one university in recorded order', () => {
  const event = createEvent(config, [attempt('alfa', 1, 10000), attempt('beta', 1, 20000), attempt('alfa', 2, 9000)]);
  assert.deepEqual(attemptsFor(event, 'alfa').map((a) => a.ms), [10000, 9000]);
  assert.deepEqual(attemptsFor(event, 'gamma'), []);
});

test('nextAttemptNo and isComplete follow the attempts recorded', () => {
  let event = createEvent(config);
  assert.equal(nextAttemptNo(event, 'alfa'), 1);
  event = recordAttempt(event, attempt('alfa', 1, 10000));
  event = recordAttempt(event, attempt('alfa', 2, 10000));
  assert.equal(nextAttemptNo(event, 'alfa'), 3);
  assert.equal(isComplete(event, 'alfa'), false);
  event = recordAttempt(event, attempt('alfa', 3, 10000));
  assert.equal(isComplete(event, 'alfa'), true);
});

test('recordAttempt leaves the original event untouched', () => {
  const event = createEvent(config);
  const next = recordAttempt(event, attempt('alfa', 1, 10000));
  assert.equal(event.attempts.length, 0);
  assert.equal(next.attempts.length, 1);
});

test('undoLast takes back the most recent attempt of any university', () => {
  const event = createEvent(config, [attempt('alfa', 1, 10000), attempt('beta', 1, 20000)]);
  const { event: after, attempt: undone } = undoLast(event);
  assert.equal(undone.teamId, 'beta');
  assert.deepEqual(after.attempts.map((a) => a.teamId), ['alfa']);
  assert.equal(undoLast(createEvent(config)), null);
});

test('findTeam walks the roster, skipping finished universities and wrapping', () => {
  const done = (id) => [1, 2, 3].map((n) => attempt(id, n, 10000));
  const event = createEvent(config, [...done('alfa'), ...done('gamma')]);
  assert.equal(findTeam(event, 0, 1), 1);   // alfa is done → beta
  assert.equal(findTeam(event, 2, 1), 3);   // gamma is done → delta
  assert.equal(findTeam(event, 4, 1), 1);   // past the end wraps to the start
  assert.equal(findTeam(event, -1, -1), 3); // ← from the first university wraps to the last
  assert.equal(findTeam(event, 2, -1), 1);
});

test('findTeam returns -1 when every university is done', () => {
  const all = config.teams.flatMap((t) => [1, 2, 3].map((n) => attempt(t.id, n, 10000)));
  assert.equal(findTeam(createEvent(config, all), 0, 1), -1);
});

test('startedCount counts universities with attempts plus the one on screen', () => {
  const empty = createEvent(config);
  assert.equal(startedCount(empty, null), 0);
  assert.equal(startedCount(empty, 'alfa'), 1);
  const event = createEvent(config, [attempt('alfa', 1, 10000), attempt('beta', 1, 10000)]);
  assert.equal(startedCount(event, 'alfa'), 2);
  assert.equal(startedCount(event, 'gamma'), 3);
  assert.equal(startedCount(event, null), 2);
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `node --test test/core/event-model.test.js`
Expected: FAIL with `Cannot find module` for `js/core/event-model.js`.

- [ ] **Step 4: Write `js/core/event-model.js`**

```js
// The event: the roster from config/event.json plus the log of recorded attempts, oldest first.
// Only the log is persisted (system design §7). Every function is pure and returns new objects.
//
// An attempt: { teamId, attempt, ms, penalty: null | '+2', status: 'OK' | 'DNF', scramble,
//               inspectionMs, at }   (system design §6, UI spec §5.4)

export function createEvent(config, attempts = []) {
  return { config, attempts };
}

export function attemptsFor(event, teamId) {
  return event.attempts.filter((a) => a.teamId === teamId);
}

export function nextAttemptNo(event, teamId) {
  return attemptsFor(event, teamId).length + 1;
}

export function isComplete(event, teamId) {
  return attemptsFor(event, teamId).length >= event.config.attemptsPerCompetitor;
}

export function recordAttempt(event, attempt) {
  return { ...event, attempts: [...event.attempts, attempt] };
}

// Takes back the most recent attempt, whichever university it belongs to. null when there is none.
export function undoLast(event) {
  if (event.attempts.length === 0) return null;
  return { event: { ...event, attempts: event.attempts.slice(0, -1) }, attempt: event.attempts.at(-1) };
}

// Roster navigation for N and ←/→: the first university at `from` or beyond, moving by `step`
// (1 or -1) and wrapping around, that still has attempts left. -1 when every university is done.
export function findTeam(event, from, step) {
  const { teams } = event.config;
  for (let i = 0; i < teams.length; i += 1) {
    const index = (((from + step * i) % teams.length) + teams.length) % teams.length;
    if (!isComplete(event, teams[index].id)) return index;
  }
  return -1;
}

// The header's UNIVERSIDAD {n} (UI spec §4.2): universities that have started, counting the one on
// screen even before its first attempt is recorded. `onScreenTeamId` is null when none is.
export function startedCount(event, onScreenTeamId) {
  const started = new Set(event.attempts.map((a) => a.teamId));
  if (onScreenTeamId !== null) started.add(onScreenTeamId);
  return started.size;
}
```

- [ ] **Step 5: Run the test**

Run: `node --test test/core/event-model.test.js`
Expected: `ℹ pass 7`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add test/helpers/fixtures.js js/core/event-model.js test/core/event-model.test.js
git commit -m "Add the event model: roster, attempt log and roster navigation"
```

---

### Task 6: Scoring and standings

System design §6 and UI spec §4.3–§4.4. The tests cover every case listed in UI spec §4.8.

**Files:**
- Create: `js/core/scoring.js`
- Test: `test/core/scoring.test.js`

- [ ] **Step 1: Write the failing test**, `test/core/scoring.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEvent, undoLast } from '../../js/core/event-model.js';
import { audienceStandings, effectiveMs, latestResult, standings } from '../../js/core/scoring.js';
import { attempt, dnf, makeConfig, plus2 } from '../helpers/fixtures.js';

const config = makeConfig(); // alfa, beta, gamma, delta
const ids = (rows) => rows.map((r) => r.teamId);

test('effectiveMs adds two seconds for +2', () => {
  assert.equal(effectiveMs(attempt('alfa', 1, 10000)), 10000);
  assert.equal(effectiveMs(plus2('alfa', 1, 10000)), 12000);
});

test('ranked by best effective time, with +2 applied', () => {
  const event = createEvent(config, [
    attempt('alfa', 1, 30000),
    plus2('beta', 1, 19000),   // 21.00 effective
    attempt('gamma', 1, 20000),
  ]);
  const table = standings(event);
  assert.deepEqual(ids(table), ['gamma', 'beta', 'alfa', 'delta']);
  assert.deepEqual(table.map((r) => r.position), [1, 2, 3, null]);
  assert.deepEqual(table.map((r) => r.bestMs), [20000, 21000, 30000, null]);
});

test('a tie on best time breaks on second best, then on roster order', () => {
  const event = createEvent(config, [
    attempt('alfa', 1, 20000), attempt('alfa', 2, 40000),
    attempt('beta', 1, 20000), attempt('beta', 2, 30000),
    attempt('gamma', 1, 20000),                            // no second time
    attempt('delta', 1, 20000),                            // no second time either
  ]);
  assert.deepEqual(ids(standings(event)), ['beta', 'alfa', 'gamma', 'delta']);
});

test('DNFs are skipped, never poison the score', () => {
  const event = createEvent(config, [dnf('alfa', 1), attempt('alfa', 2, 25000), dnf('alfa', 3)]);
  assert.deepEqual(standings(event)[0], { teamId: 'alfa', group: 'ranked', position: 1, bestMs: 25000 });
});

test('all-DNF is unranked, no attempts is pending, and neither has a position', () => {
  const event = createEvent(config, [dnf('beta', 1), dnf('beta', 2), attempt('delta', 1, 50000)]);
  const table = standings(event);
  assert.deepEqual(table.map((r) => [r.teamId, r.group, r.position]), [
    ['delta', 'ranked', 1],
    ['beta', 'unranked', null],
    ['alfa', 'pending', null],
    ['gamma', 'pending', null],
  ]);
});

test('audienceStandings keeps ranked rows only, at most eight', () => {
  const many = makeConfig(Array.from({ length: 12 }, (_, i) => `t${i}`));
  const event = createEvent(many, [
    ...Array.from({ length: 10 }, (_, i) => attempt(`t${i}`, 1, 10000 + i)),
    dnf('t10', 1),
  ]);
  const rows = audienceStandings(standings(event), 8);
  assert.equal(rows.length, 8);
  assert.ok(rows.every((r) => r.group === 'ranked'));
  assert.deepEqual(audienceStandings(standings(createEvent(many)), 8), []);
});

test('audienceStandings includes a university mid-turn once it has an OK time', () => {
  const event = createEvent(config, [attempt('alfa', 1, 30000)]);
  assert.deepEqual(ids(audienceStandings(standings(event))), ['alfa']);
});

test('latestResult is null until a university completes its attempts', () => {
  const event = createEvent(config, [attempt('alfa', 1, 30000), attempt('alfa', 2, 20000)]);
  assert.equal(latestResult(event), null);
});

test('latestResult describes the last completion, with its position from the full table', () => {
  const event = createEvent(config, [
    attempt('alfa', 1, 30000), attempt('alfa', 2, 20000), attempt('alfa', 3, 25000),
    attempt('beta', 1, 10000), attempt('beta', 2, 50000), attempt('beta', 3, 50000),
  ]);
  assert.deepEqual(latestResult(event), { teamId: 'beta', bestMs: 10000, position: 1 });
});

test('latestResult is re-derived after an undo', () => {
  const event = createEvent(config, [
    attempt('alfa', 1, 30000), attempt('alfa', 2, 20000), attempt('alfa', 3, 25000),
    attempt('beta', 1, 10000), attempt('beta', 2, 50000), attempt('beta', 3, 50000),
  ]);
  assert.deepEqual(latestResult(undoLast(event).event), { teamId: 'alfa', bestMs: 20000, position: 2 });
});

test('latestResult for an all-DNF university has no time and no position', () => {
  const event = createEvent(config, [dnf('gamma', 1), dnf('gamma', 2), dnf('gamma', 3)]);
  assert.deepEqual(latestResult(event), { teamId: 'gamma', bestMs: null, position: null });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/core/scoring.test.js`
Expected: FAIL with `Cannot find module` for `js/core/scoring.js`.

- [ ] **Step 3: Write `js/core/scoring.js`**

```js
// Best-of-N scoring and the standings table (system design §6, UI spec §4.3).
import { attemptsFor } from './event-model.js';

export function effectiveMs(attempt) {
  return attempt.ms + (attempt.penalty === '+2' ? 2000 : 0);
}

const GROUP_ORDER = { ranked: 0, unranked: 1, pending: 2 };

// The full table, one row per university: { teamId, group, position, bestMs }.
//   ranked    at least one OK attempt; by best effective time, then second best, then roster order
//   unranked  attempts, none OK (all DNF); roster order, no position
//   pending   no attempts yet; roster order, no position
export function standings(event) {
  const rows = event.config.teams.map((team, rosterIndex) => {
    const attempts = attemptsFor(event, team.id);
    const times = attempts.filter((a) => a.status === 'OK').map(effectiveMs).sort((a, b) => a - b);
    const group = times.length > 0 ? 'ranked' : attempts.length > 0 ? 'unranked' : 'pending';
    return { teamId: team.id, group, bestMs: times[0] ?? null, secondMs: times[1] ?? Infinity, rosterIndex };
  });
  rows.sort((a, b) =>
    GROUP_ORDER[a.group] - GROUP_ORDER[b.group] ||
    (a.group === 'ranked' ? a.bestMs - b.bestMs || a.secondMs - b.secondMs : 0) ||
    a.rosterIndex - b.rosterIndex);
  let position = 0;
  return rows.map(({ teamId, group, bestMs }) => {
    if (group === 'ranked') position += 1;
    return { teamId, group, position: group === 'ranked' ? position : null, bestMs };
  });
}

// What the room sees (UI spec §4.3): ranked universities only, at most `limit`.
export function audienceStandings(table, limit = 8) {
  return table.filter((row) => row.group === 'ranked').slice(0, limit);
}

// The university that most recently completed its attempts (UI spec §4.4): { teamId, bestMs,
// position }, or null before any has. Derived from the log every time, so an undo can never leave
// a stale result on screen.
export function latestResult(event, table = standings(event)) {
  const last = event.attempts.findLast((a) => a.attempt === event.config.attemptsPerCompetitor);
  if (!last) return null;
  const row = table.find((r) => r.teamId === last.teamId);
  return { teamId: last.teamId, bestMs: row.bestMs, position: row.position };
}
```

- [ ] **Step 4: Run the test**

Run: `node --test test/core/scoring.test.js`
Expected: `ℹ pass 11`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/core/scoring.js test/core/scoring.test.js
git commit -m "Add best-of-3 scoring, the standings table and the latest result"
```

---

### Task 7: StackMat packets and scenarios

These are the scripted signals from system design §9. They come before the reducer because its tests
are written in packets. Each state has the shape `vendor/stackmat.js` emits: `packet()` derives the
hands and the green light from the header byte in the same way the decoder does (`vendor/stackmat.js`
lines 281–283).

**Files:**
- Create: `js/drivers/scenarios.js`
- Test: `test/drivers/scenarios.test.js`

- [ ] **Step 1: Write the failing test**, `test/drivers/scenarios.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HANDS_MS, SCENARIOS, handsDown, packet, packetBits, packetBytes, sequence, startAfter, timing,
} from '../../js/drivers/scenarios.js';

test('packet derives hands and green light from the header, as the decoder does', () => {
  assert.deepEqual([packet('L', 0).leftHand, packet('L', 0).rightHand], [true, false]);
  assert.deepEqual([packet('R', 0).leftHand, packet('R', 0).rightHand], [false, true]);
  assert.deepEqual([packet('C', 0).leftHand, packet('C', 0).rightHand, packet('C', 0).greenLight], [true, true, false]);
  assert.equal(packet('A', 0).greenLight, true);
  assert.deepEqual([packet(' ', 10, true).leftHand, packet(' ', 10, true).running], [false, true]);
});

test('sequence plays parts back to back, one packet per 100 ms', () => {
  const steps = sequence(timing(0, 300), timing(300, 500));
  assert.deepEqual(steps.map((s) => s.t), [0, 100, 200, 300, 400]);
  assert.deepEqual(steps.map((s) => s.state.time_milli), [0, 100, 200, 300, 400]);
});

test('handsDown lasts HANDS_MS and ends on the green light', () => {
  const steps = handsDown();
  assert.equal(steps.length * 100, HANDS_MS);
  assert.equal(steps.at(-1).state.signalHeader, 'A');
});

test('startAfter starts the timer exactly `ms` in', () => {
  const firstRunning = startAfter(10000).find((s) => s.state.running);
  assert.equal(firstRunning.t, 10000);
});

test('a packet is nine bytes: the header, five digits, a checksum, then \\n \\r', () => {
  assert.deepEqual(packetBytes(packet('A', 0)), ['A', '0', '0', '0', '0', '0', '@', '\n', '\r']);
  assert.deepEqual(packetBytes(packet('S', 6440)).slice(0, 6), ['S', '0', '0', '6', '4', '4']);
});

test('its bits frame every byte with a start and a stop bit', () => {
  const bits = packetBits(packet('A', 0));
  assert.equal(bits.length, packetBytes(packet('A', 0)).length * 10);
  // 'A' is 0x41: a start bit, then 1 0 0 0 0 0 1 0 least significant first, then a stop bit.
  assert.deepEqual(bits.slice(0, 10), [0, 1, 0, 0, 0, 0, 0, 1, 0, 1]);
});

test('every named scenario is sorted by time and ends with the mat on', () => {
  for (const [name, build] of Object.entries(SCENARIOS)) {
    const steps = build();
    assert.ok(steps.every((s, i) => i === 0 || s.t > steps[i - 1].t), `${name} is sorted`);
    assert.equal(steps.at(-1).state.on, true, `${name} ends on`);
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/drivers/scenarios.test.js`
Expected: FAIL with `Cannot find module` for `js/drivers/scenarios.js`.

- [ ] **Step 3: Write `js/drivers/scenarios.js`**

```js
// Scripted StackMat signals (system design §9) for the mock driver and the replay tests. A scenario
// is an array of { t, state } steps: t is ms from the scenario's start, one packet every 100 ms like
// a real mat, and every state has the shape the csTimer decoder emits.

export const PACKET_MS = 100;

export function packet(signalHeader, time_milli, running = false) {
  return {
    on: true,
    // A packet the decoder has just read. The real driver marks re-emissions of its last state
    // false, which is how SIGNAL CHECK counts packets per second (operator spec §3.2).
    fresh: true,
    running,
    time_milli,
    unit: 10,
    signalHeader,
    greenLight: signalHeader === 'A',
    leftHand: 'LAC'.includes(signalHeader),
    rightHand: 'RAC'.includes(signalHeader),
    noise: 0.05,
    power: 1,
  };
}

// The decoder reports a lost signal by re-emitting its last state with on = false. Nothing new was
// read, so it is not fresh.
export const offline = (state) => ({ ...state, on: false, fresh: false });

// The bytes a StackMat sends for a state (system design §4): the header, the time as five digits,
// a checksum, then \n \r. SIGNAL CHECK shows the last of them (operator spec §3.7), and the mock
// driver turns them into the audio sample it draws.
export function packetBytes({ signalHeader, time_milli }) {
  const minutes = Math.floor(time_milli / 60000);
  const seconds = String(Math.floor(time_milli / 1000) % 60).padStart(2, '0');
  const centis = String(Math.floor(time_milli / 10) % 100).padStart(2, '0');
  const digits = `${minutes}${seconds}${centis}`;
  const checksum = String.fromCharCode(64 + [...digits].reduce((sum, digit) => sum + Number(digit), 0));
  return [signalHeader, ...digits, checksum, '\n', '\r'];
}

// Those bytes at 1200 baud: a start bit, eight data bits least significant first, then a stop bit.
// 1 is the idle level, the way the decoder's binarised sample holds it.
export function packetBits(state) {
  const bits = [];
  for (const byte of packetBytes(state)) {
    const code = byte.charCodeAt(0);
    bits.push(0);
    for (let i = 0; i < 8; i += 1) bits.push((code >> i) & 1);
    bits.push(1);
  }
  return bits;
}

export function hold(state, ms) {
  return Array.from({ length: Math.round(ms / PACKET_MS) }, (_, i) => ({ t: i * PACKET_MS, state }));
}

// The timer counting from `fromMs` up to (not including) `toMs`.
export function timing(fromMs, toMs) {
  return Array.from({ length: Math.round((toMs - fromMs) / PACKET_MS) }, (_, i) => ({
    t: i * PACKET_MS,
    state: packet(' ', fromMs + i * PACKET_MS, true),
  }));
}

// Plays parts back to back.
export function sequence(...parts) {
  const steps = [];
  let offset = 0;
  for (const part of parts) {
    for (const step of part) steps.push({ t: offset + step.t, state: step.state });
    offset += part.length * PACKET_MS;
  }
  return steps;
}

export const HANDS_MS = 1200;
export const reset = (ms = 300) => hold(packet('I', 0), ms);
export const handsDown = () => sequence(hold(packet('L', 0), 200), hold(packet('C', 0), 500), hold(packet('A', 0), 500));
export const stopAt = (ms) => hold(packet('S', ms), 1000);
export const solve = (ms) => sequence(timing(0, ms), stopAt(ms));

// A solve whose timer starts `ms` after the scenario begins: mat at 0.00, hands down, green, go.
export const startAfter = (ms, solveMs = 5000) => sequence(reset(ms - HANDS_MS), handsDown(), solve(solveMs));

// Named scenarios, played from ARMED unless the name says otherwise. The mock driver's debug view
// offers each one as a button.
export const SCENARIOS = {
  reset: () => reset(),
  cleanSolve: () => sequence(handsDown(), solve(8000)),
  falseStart: () => sequence(handsDown(), solve(300)),
  matBump: () => solve(1500),
  resetMidSolve: () => sequence(handsDown(), timing(0, 3000), reset(), handsDown(), solve(6000)),
  cutoffOverrun: () => sequence(handsDown(), solve(301000)),
  signalLossDuringRun: () => sequence(
    handsDown(), timing(0, 2000), hold(offline(packet(' ', 1900, true)), 1500), timing(3500, 8000), stopAt(8000)),
  signalLossDuringStandby: () => sequence(hold(offline(packet('I', 0)), 1500), reset()),
  handsLiftedBeforeGreen: () => sequence(hold(packet('C', 0), 300), reset()),
};
```

- [ ] **Step 4: Run the test**

Run: `node --test test/drivers/scenarios.test.js`
Expected: `ℹ pass 7`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/drivers/scenarios.js test/drivers/scenarios.test.js
git commit -m "Add StackMat packet builders and the named scenarios"
```

---

### Task 8: The run state, part 1: the mat, N, and inspection

This task covers the transitions driven by the mat (system design §5), and the inspection rules in UI
spec §5.4. Task 9 adds the operator's decisions.

**Files:**
- Create: `test/helpers/actions.js`
- Create: `js/core/run-state.js`
- Test: `test/core/run-state.test.js`

- [ ] **Step 1: Write the test helpers**, `test/helpers/actions.js`

```js
// Action builders and a replay helper for the run-state tests.
import { reduce } from '../../js/core/run-state.js';

export const cmd = (command, at = 0) => ({ type: 'command', command, at });
export const mat = (state, at = 0) => ({ type: 'mat', state, at });

export function apply(state, ...actions) {
  return actions.reduce(reduce, state);
}

// Feeds a scenario's mat steps and timed operator commands through the reducer in time order,
// each stamped with `start + t`. At equal times the mat step goes first.
export function replay(state, { steps = [], commands = [] }, start = 0) {
  const timeline = [
    ...steps.map(({ t, state: m }) => ({ t, action: { type: 'mat', state: m } })),
    ...commands.map(({ t, command }) => ({ t, action: { type: 'command', command } })),
  ].sort((a, b) => a.t - b.t);
  return timeline.reduce((s, { t, action }) => reduce(s, { ...action, at: start + t }), state);
}
```

- [ ] **Step 2: Write the failing test**, `test/core/run-state.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduce } from '../../js/core/run-state.js';
import { packet } from '../../js/drivers/scenarios.js';
import { attempt, makeConfig } from '../helpers/fixtures.js';
import { apply, cmd, mat } from '../helpers/actions.js';

const config = makeConfig(); // alfa, beta, gamma, delta · 3 attempts

const armed = () => apply(createState(config), cmd('next'), mat(packet('I', 0)));

test('a new event starts in STANDBY with nothing selected yet', () => {
  const state = createState(config);
  assert.equal(state.phase, 'STANDBY');
  assert.equal(state.attemptNo, null);
  assert.equal(state.signalOn, false);
});

test('N from STANDBY calls the first university to attempt 1 and asks for a scramble', () => {
  const state = reduce(createState(config), cmd('next'));
  assert.equal(state.phase, 'SCRAMBLE');
  assert.equal(state.teamIndex, 0);
  assert.equal(state.attemptNo, 1);
  assert.equal(state.scramble, null);
  assert.equal(state.scrambleSeq, 1);
});

test('a scramble is taken only for the request that is current', () => {
  const state = reduce(createState(config), cmd('next'));
  const stale = reduce(state, { type: 'scramble', seq: 0, scramble: 'U', svg: '<svg/>' });
  assert.equal(stale.scramble, null);
  const fresh = reduce(state, { type: 'scramble', seq: 1, scramble: "R U R'", svg: '<svg/>' });
  assert.equal(fresh.scramble, "R U R'");
  assert.equal(fresh.scrambleSvg, '<svg/>');
});

test('SCRAMBLE → ARMED when the mat reads 0.00 with an idle or stopped header', () => {
  const scramble = reduce(createState(config), cmd('next'));
  assert.equal(reduce(scramble, mat(packet('I', 0))).phase, 'ARMED');
  assert.equal(reduce(scramble, mat(packet('S', 0))).phase, 'ARMED');
});

test('SCRAMBLE waits while the mat still shows the last time, or hands are on it', () => {
  const scramble = reduce(createState(config), cmd('next'));
  assert.equal(reduce(scramble, mat(packet('S', 12470))).phase, 'SCRAMBLE');
  assert.equal(reduce(scramble, mat(packet('C', 0))).phase, 'SCRAMBLE');
});

test('ARMED → RUNNING when the timer starts', () => {
  const state = reduce(armed(), mat(packet(' ', 10, true)));
  assert.equal(state.phase, 'RUNNING');
});

test('RUNNING → PENDING when the timer stops on a non-zero time', () => {
  const running = reduce(armed(), mat(packet(' ', 8000, true)));
  const pending = reduce(running, mat(packet('S', 8120)));
  assert.equal(pending.phase, 'PENDING');
  assert.equal(pending.pendingMs, 8120);
});

test('a reset mid-solve is not a finish: RUNNING stays RUNNING at 0.00', () => {
  const running = reduce(armed(), mat(packet(' ', 3000, true)));
  const reset = reduce(running, mat(packet('I', 0)));
  assert.equal(reset.phase, 'RUNNING');
  assert.equal(reset.pendingMs, null);
});

test('a lost signal only clears the flag; the phase and the last packet survive', () => {
  const running = reduce(armed(), mat(packet(' ', 2000, true)));
  const lost = reduce(running, mat({ ...packet(' ', 2000, true), on: false }));
  assert.equal(lost.phase, 'RUNNING');
  assert.equal(lost.signalOn, false);
  assert.equal(lost.mat.time_milli, 2000);
  const back = reduce(lost, mat(packet('S', 8000)));
  assert.equal(back.phase, 'PENDING');
  assert.equal(back.signalOn, true);
});

test('mat states change nothing in STANDBY or PENDING', () => {
  const standby = reduce(createState(config), mat(packet(' ', 500, true)));
  assert.equal(standby.phase, 'STANDBY');
  const pending = apply(armed(), mat(packet(' ', 800, true)), mat(packet('S', 900)));
  assert.equal(reduce(pending, mat(packet('I', 0))).phase, 'PENDING');
});

test('Space in ARMED starts inspection once; a second Space is ignored', () => {
  const started = reduce(armed(), cmd('startInspection', 1000));
  assert.equal(started.inspectionStartedAt, 1000);
  assert.equal(reduce(started, cmd('startInspection', 5000)).inspectionStartedAt, 1000);
});

test('Space outside ARMED does not start inspection', () => {
  const scramble = reduce(createState(config), cmd('next'));
  assert.equal(reduce(scramble, cmd('startInspection', 1000)).inspectionStartedAt, null);
});

test('Esc in ARMED cancels inspection', () => {
  const state = apply(armed(), cmd('startInspection', 1000), cmd('cancelInspection', 2000));
  assert.equal(state.inspectionStartedAt, null);
});

test('ARMED → RUNNING records how long inspection ran', () => {
  const state = apply(armed(), cmd('startInspection', 1000), mat(packet(' ', 10, true), 13840));
  assert.equal(state.inspectionMs, 12840);
  assert.equal(state.inspectionStartedAt, null);
});

test('ARMED → RUNNING without inspection records null', () => {
  assert.equal(reduce(armed(), mat(packet(' ', 10, true), 5000)).inspectionMs, null);
});

test('N from ARMED moves on and drops the inspection', () => {
  const state = apply(armed(), cmd('startInspection', 1000), cmd('next'));
  assert.equal(state.phase, 'SCRAMBLE');
  assert.equal(state.teamIndex, 1);
  assert.equal(state.inspectionStartedAt, null);
});

test('a resumed event continues with the university of the last recorded attempt', () => {
  const state = createState(config, [attempt('alfa', 1, 10000), attempt('beta', 1, 20000)]);
  assert.equal(state.teamIndex, 1);
  const next = reduce(state, cmd('next'));
  assert.equal(next.teamIndex, 1);
  assert.equal(next.attemptNo, 2);
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `node --test test/core/run-state.test.js`
Expected: FAIL with `Cannot find module` for `js/core/run-state.js`.

- [ ] **Step 4: Write `js/core/run-state.js`**

```js
// The run loop (system design §5, UI spec §5.4) as one pure reducer. Actions:
//   { type: 'mat', state, at }                  a StackmatState from a driver
//   { type: 'command', command, at }            an operator command (js/core/keymap.js)
//   { type: 'scramble', seq, scramble, svg }    the worker's answer to scramble request `seq`
// The core has no clock: `at` is the Date.now() the operator window stamped on the event.
import { createEvent, findTeam, nextAttemptNo } from './event-model.js';

// Where the operator may move around the roster. RUNNING is live and PENDING is a gate.
const IDLE_PHASES = ['STANDBY', 'SCRAMBLE', 'ARMED'];

export function createState(config, attempts = []) {
  const last = attempts.at(-1);
  return {
    event: createEvent(config, attempts),
    phase: 'STANDBY',
    // N continues from here. On a resume, that is the university of the last recorded attempt.
    teamIndex: last ? Math.max(0, config.teams.findIndex((t) => t.id === last.teamId)) : 0,
    attemptNo: null,
    // scrambleSeq changes whenever the scramble on screen must change. The operator window then asks
    // the worker for a new one (scramble === null) or for the preview of this one.
    scramble: null,
    scrambleSvg: null,
    scrambleSeq: 0,
    inspectionStartedAt: null,
    inspectionMs: null,
    pendingMs: null,
    mat: null, // the last StackmatState heard with on === true
    signalOn: false,
  };
}

export function reduce(state, action) {
  switch (action.type) {
    case 'mat':
      return onMat(state, action.state, action.at);
    case 'command':
      return onCommand(state, action.command, action.at);
    case 'scramble':
      return action.seq === state.scrambleSeq ? { ...state, scramble: action.scramble, scrambleSvg: action.svg } : state;
    default:
      return state;
  }
}

function onMat(state, mat, at) {
  // A lost signal changes only the flag. The phase, the inspection start and the last packet all
  // survive, so the run carries on when packets resume (system design §8).
  if (!mat.on) return { ...state, signalOn: false };
  const next = { ...state, mat, signalOn: true };
  switch (state.phase) {
    case 'SCRAMBLE':
      return mat.time_milli === 0 && (mat.signalHeader === 'I' || mat.signalHeader === 'S')
        ? { ...next, phase: 'ARMED' }
        : next;
    case 'ARMED':
      if (!mat.running) return next;
      return {
        ...next,
        phase: 'RUNNING',
        inspectionMs: state.inspectionStartedAt === null ? null : at - state.inspectionStartedAt,
        inspectionStartedAt: null,
      };
    case 'RUNNING':
      // Verbatim from csTimer: the non-zero guard keeps a reset mid-solve from counting as a finish.
      return state.mat.running && !mat.running && mat.time_milli !== 0
        ? { ...next, phase: 'PENDING', pendingMs: mat.time_milli }
        : next;
    default:
      return next;
  }
}

function onCommand(state, command, at) {
  const { phase } = state;
  switch (command) {
    case 'next':
      // From STANDBY, N may continue the university at teamIndex if it has attempts left (the start
      // of the event, or a resume). Anywhere else it moves on.
      return IDLE_PHASES.includes(phase)
        ? selectTeam(state, findTeam(state.event, state.teamIndex + (phase === 'STANDBY' ? 0 : 1), 1))
        : state;
    case 'startInspection':
      return phase === 'ARMED' && state.inspectionStartedAt === null ? { ...state, inspectionStartedAt: at } : state;
    case 'cancelInspection':
      return phase === 'ARMED' ? { ...state, inspectionStartedAt: null } : state;
    default:
      return state;
  }
}

const freshScramble = (state) => ({ scramble: null, scrambleSvg: null, scrambleSeq: state.scrambleSeq + 1 });
const cleared = () => ({ inspectionStartedAt: null, inspectionMs: null, pendingMs: null });

function selectTeam(state, index) {
  if (index === -1) return state;
  const team = state.event.config.teams[index];
  return {
    ...state,
    ...cleared(),
    ...freshScramble(state),
    phase: 'SCRAMBLE',
    teamIndex: index,
    attemptNo: nextAttemptNo(state.event, team.id),
  };
}
```

- [ ] **Step 5: Run the test**

Run: `node --test test/core/run-state.test.js`
Expected: `ℹ pass 17`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add test/helpers/actions.js js/core/run-state.js test/core/run-state.test.js
git commit -m "Add the run-state reducer: mat transitions, N and inspection"
```

---

### Task 9: The run state, part 2: decisions, roster, undo

This task adds the PENDING gate and auto-arming (system design §5), roster navigation (decision 5),
redo (decision 6) and undo (decision 3). Each decision also leaves `lastDecision`, the verdict the
room is shown, with the reason for a DNF (UI spec §7.5). The commands that act end it (decision 13).

**Files:**
- Modify: `js/core/run-state.js` (the imports, `createState`, `onMat`'s SCRAMBLE case, `cleared`,
  `onCommand`, and three new functions at the end)
- Test: `test/core/run-state-decisions.test.js`

- [ ] **Step 1: Write the failing test**, `test/core/run-state-decisions.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduce } from '../../js/core/run-state.js';
import { packet } from '../../js/drivers/scenarios.js';
import { attempt, makeConfig } from '../helpers/fixtures.js';
import { apply, cmd, mat } from '../helpers/actions.js';

const config = makeConfig(); // alfa, beta, gamma, delta · 3 attempts

// Drives the current university from SCRAMBLE to PENDING with the given time.
const solveTo = (state, ms, at = 0) => apply(
  state,
  { type: 'scramble', seq: state.scrambleSeq, scramble: "R U R'", svg: '<svg/>' },
  mat(packet('I', 0), at),
  mat(packet(' ', 100, true), at),
  mat(packet('S', ms), at),
);

const pending = (ms = 12470) => solveTo(reduce(createState(config), cmd('next')), ms);

// PENDING on `ms`, after `inspectionMs` of inspection.
const inspected = (ms, inspectionMs) => apply(
  createState(config),
  cmd('next'),
  { type: 'scramble', seq: 1, scramble: "R U R'", svg: '<svg/>' },
  mat(packet('I', 0)),
  cmd('startInspection', 0),
  mat(packet(' ', 100, true), inspectionMs),
  mat(packet('S', ms)),
);

test('Space in PENDING records the attempt as OK and calls the next one', () => {
  const state = reduce(pending(12470), cmd('accept', 99));
  assert.deepEqual(state.event.attempts, [{
    teamId: 'alfa', attempt: 1, ms: 12470, penalty: null, status: 'OK',
    scramble: "R U R'", inspectionMs: null, at: 99,
  }]);
  assert.equal(state.phase, 'SCRAMBLE');
  assert.equal(state.attemptNo, 2);
  assert.equal(state.scramble, null);
  assert.equal(state.pendingMs, null);
});

test('D records a DNF and keeps the time for the record', () => {
  const [recorded] = reduce(pending(12470), cmd('dnf')).event.attempts;
  assert.equal(recorded.status, 'DNF');
  assert.equal(recorded.ms, 12470);
  assert.equal(recorded.penalty, null);
});

test('2 records the time with a +2 penalty', () => {
  const [recorded] = reduce(pending(12470), cmd('plus2')).event.attempts;
  assert.equal(recorded.status, 'OK');
  assert.equal(recorded.penalty, '+2');
});

test('the inspection time is written onto the recorded attempt', () => {
  const armed = apply(createState(config), cmd('next'), mat(packet('I', 0)), cmd('startInspection', 1000));
  const state = apply(armed, mat(packet(' ', 100, true), 16500), mat(packet('S', 9000), 25000), cmd('accept'));
  assert.equal(state.event.attempts[0].inspectionMs, 15500);
});

test('R voids the time: same attempt again, new scramble, nothing recorded', () => {
  const before = pending();
  const state = reduce(before, cmd('redo'));
  assert.equal(state.phase, 'SCRAMBLE');
  assert.equal(state.attemptNo, 1);
  assert.equal(state.event.attempts.length, 0);
  assert.equal(state.scramble, null);
  assert.equal(state.scrambleSeq, before.scrambleSeq + 1);
});

test('the last attempt of a university ends in STANDBY', () => {
  let state = reduce(createState(config), cmd('next'));
  for (let n = 1; n <= 3; n += 1) state = reduce(solveTo(state, 10000 * n), cmd('accept'));
  assert.equal(state.phase, 'STANDBY');
  assert.equal(state.event.attempts.length, 3);
  assert.equal(state.attemptNo, null);
});

test('N from STANDBY after a completion calls the next university', () => {
  let state = reduce(createState(config), cmd('next'));
  for (let n = 1; n <= 3; n += 1) state = reduce(solveTo(state, 10000), cmd('accept'));
  state = reduce(state, cmd('next'));
  assert.equal(state.teamIndex, 1);
  assert.equal(state.attemptNo, 1);
});

test('PENDING is a gate: N, arrows and undo are ignored until a decision', () => {
  const state = pending();
  for (const command of ['next', 'nextTeam', 'prevTeam', 'undo', 'startInspection']) {
    assert.equal(reduce(state, cmd(command)), state, command);
  }
});

test('RUNNING ignores every command', () => {
  const running = apply(createState(config), cmd('next'), mat(packet('I', 0)), mat(packet(' ', 100, true)));
  for (const command of ['next', 'nextTeam', 'prevTeam', 'undo', 'accept', 'dnf', 'plus2', 'redo']) {
    assert.equal(reduce(running, cmd(command)), running, command);
  }
});

test('← and → skip around the roster and wrap', () => {
  const scramble = reduce(createState(config), cmd('next')); // alfa
  assert.equal(reduce(scramble, cmd('nextTeam')).teamIndex, 1);
  assert.equal(reduce(scramble, cmd('prevTeam')).teamIndex, 3);
});

test('→ from the start of the event skips the first university; N does not', () => {
  const start = createState(config);
  assert.equal(reduce(start, cmd('nextTeam')).teamIndex, 1);
  assert.equal(reduce(start, cmd('next')).teamIndex, 0);
});

test('a skipped university keeps its place: calling it again resumes at its next attempt', () => {
  const state = apply(createState(config, [attempt('alfa', 1, 10000)]), cmd('nextTeam'), cmd('prevTeam'));
  assert.equal(state.teamIndex, 0);
  assert.equal(state.attemptNo, 2);
});

test('finished universities are skipped, and N does nothing once all are done', () => {
  const done = config.teams.slice(0, 3).flatMap((t) => [1, 2, 3].map((n) => attempt(t.id, n, 10000)));
  const state = reduce(createState(config, done), cmd('next'));
  assert.equal(state.teamIndex, 3);
  const all = createState(config, config.teams.flatMap((t) => [1, 2, 3].map((n) => attempt(t.id, n, 10000))));
  assert.equal(reduce(all, cmd('next')), all);
});

test('U reopens the last recorded attempt in PENDING with its time and scramble', () => {
  const accepted = reduce(pending(12470), cmd('accept'));
  const state = reduce(accepted, cmd('undo'));
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.event.attempts.length, 0);
  assert.equal(state.pendingMs, 12470);
  assert.equal(state.attemptNo, 1);
  assert.equal(state.scramble, "R U R'");
  assert.equal(state.scrambleSeq, accepted.scrambleSeq + 1);
  const corrected = reduce(state, cmd('dnf'));
  assert.equal(corrected.event.attempts[0].status, 'DNF');
});

test('U after a completion reopens that university from STANDBY', () => {
  let state = reduce(createState(config), cmd('next'));
  for (let n = 1; n <= 3; n += 1) state = reduce(solveTo(state, 10000), cmd('accept'));
  state = reduce(state, cmd('undo'));
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.attemptNo, 3);
  assert.equal(state.teamIndex, 0);
});

test('U with nothing recorded does nothing', () => {
  const state = reduce(createState(config), cmd('next'));
  assert.equal(reduce(state, cmd('undo')), state);
});

test('each decision leaves a verdict: its kind, the attempt, the stopped time and the key time', () => {
  assert.equal(createState(config).lastDecision, null);
  for (const [command, kind] of [['accept', 'OK'], ['plus2', '+2'], ['dnf', 'DNF'], ['redo', 'REDO']]) {
    assert.deepEqual(reduce(pending(12470), cmd(command, 99)).lastDecision,
      { kind, teamId: 'alfa', attempt: 1, ms: 12470, reason: null, at: 99 }, command);
  }
});

test('a DNF past the cutoff names the cutoff; one exactly on it names nothing', () => {
  assert.equal(reduce(pending(300010), cmd('dnf')).lastDecision.reason, 'CUTOFF');
  assert.equal(reduce(pending(300000), cmd('dnf')).lastDecision.reason, null);
});

test('a DNF after more than 17 s of inspection names inspection; when both apply, the cutoff', () => {
  assert.equal(reduce(inspected(9000, 17001), cmd('dnf')).lastDecision.reason, 'INSPECTION');
  assert.equal(reduce(inspected(9000, 17000), cmd('dnf')).lastDecision.reason, null);
  assert.equal(reduce(inspected(300010, 17001), cmd('dnf')).lastDecision.reason, 'CUTOFF');
});

test('only a DNF has a reason', () => {
  for (const command of ['accept', 'plus2', 'redo']) {
    assert.equal(reduce(inspected(300010, 17001), cmd(command)).lastDecision.reason, null, command);
  }
});

test('N, ←, →, U and the mat reset into ARMED end the verdict; the mat still showing the time does not', () => {
  const decided = reduce(pending(), cmd('accept'));
  for (const command of ['next', 'nextTeam', 'prevTeam', 'undo']) {
    assert.equal(reduce(decided, cmd(command)).lastDecision, null, command);
  }
  assert.equal(reduce(decided, mat(packet('I', 0))).lastDecision, null);
  assert.notEqual(reduce(decided, mat(packet('S', 12470))).lastDecision, null);
});

test('a second Space or an Esc during the verdict changes nothing', () => {
  const decided = reduce(pending(), cmd('accept'));
  assert.equal(reduce(decided, cmd('startInspection')), decided);
  assert.equal(reduce(decided, cmd('cancelInspection')), decided);
});

test('disarm steps ARMED back to its own scramble, and does nothing anywhere else', () => {
  const armed = apply(
    createState(config),
    cmd('next'),
    { type: 'scramble', seq: 1, scramble: "R U R'", svg: '<svg/>' },
    mat(packet('I', 0)),
    cmd('startInspection', 0),
  );
  assert.equal(armed.phase, 'ARMED');
  const back = reduce(armed, cmd('disarm'));
  assert.equal(back.phase, 'SCRAMBLE');
  assert.equal(back.inspectionStartedAt, null);
  assert.equal(back.scramble, "R U R'", 'the competitor has not solved yet: the scramble stands');
  assert.equal(back.scrambleSeq, armed.scrambleSeq);
  assert.equal(back.attemptNo, armed.attemptNo);
  const standby = createState(config);
  assert.equal(reduce(standby, cmd('disarm')), standby);
  assert.equal(reduce(back, cmd('disarm')), back);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/core/run-state-decisions.test.js`
Expected: FAIL. Among the failures is `Space in PENDING records the attempt as OK…`, because
`accept` is still ignored.

- [ ] **Step 3: Widen the imports** in `js/core/run-state.js`. Replace

```js
import { createEvent, findTeam, nextAttemptNo } from './event-model.js';
```

with

```js
import { createEvent, findTeam, isComplete, nextAttemptNo, recordAttempt, undoLast } from './event-model.js';
import { suggestedPenalty } from './inspection.js';
```

- [ ] **Step 4: Give the state its last decision.** In `createState`, replace

```js
    mat: null, // the last StackmatState heard with on === true
    signalOn: false,
  };
```

with

```js
    mat: null, // the last StackmatState heard with on === true
    signalOn: false,
    // The operator's last decision, shown to the room as a verdict (UI spec §7.5). Only the attempt
    // log is persisted, so a reload drops it.
    lastDecision: null,
  };
```

- [ ] **Step 5: End the verdict when the mat is reset for the next attempt.** In `onMat`, replace

```js
        ? { ...next, phase: 'ARMED' }
```

with

```js
        ? { ...next, phase: 'ARMED', lastDecision: null }
```

- [ ] **Step 6: End it too when N or ←/→ set up another attempt.** Replace

```js
const cleared = () => ({ inspectionStartedAt: null, inspectionMs: null, pendingMs: null });
```

with

```js
// Nothing carries over from one attempt to the next, not even the verdict on screen.
const cleared = () => ({ inspectionStartedAt: null, inspectionMs: null, pendingMs: null, lastDecision: null });
```

- [ ] **Step 7: Replace the whole `onCommand` function** with

```js
function onCommand(state, command, at) {
  const { phase } = state;
  switch (command) {
    case 'next':
      // From STANDBY, N may continue the university at teamIndex if it has attempts left (the start
      // of the event, or a resume). Anywhere else it moves on.
      return IDLE_PHASES.includes(phase)
        ? selectTeam(state, findTeam(state.event, state.teamIndex + (phase === 'STANDBY' ? 0 : 1), 1))
        : state;
    case 'nextTeam':
      return IDLE_PHASES.includes(phase) ? selectTeam(state, findTeam(state.event, state.teamIndex + 1, 1)) : state;
    case 'prevTeam':
      return IDLE_PHASES.includes(phase) ? selectTeam(state, findTeam(state.event, state.teamIndex - 1, -1)) : state;
    case 'startInspection':
      return phase === 'ARMED' && state.inspectionStartedAt === null ? { ...state, inspectionStartedAt: at } : state;
    case 'cancelInspection':
      return phase === 'ARMED' ? { ...state, inspectionStartedAt: null } : state;
    case 'accept':
      return phase === 'PENDING' ? decide(state, 'OK', at) : state;
    case 'plus2':
      return phase === 'PENDING' ? decide(state, '+2', at) : state;
    case 'dnf':
      return phase === 'PENDING' ? decide(state, 'DNF', at) : state;
    case 'redo':
      // The time is voided and the same attempt is solved again, on a new scramble.
      return phase === 'PENDING'
        ? { ...state, ...cleared(), ...freshScramble(state), phase: 'SCRAMBLE', lastDecision: decision(state, 'REDO', at) }
        : state;
    case 'undo':
      return IDLE_PHASES.includes(phase) ? undo(state) : state;
    case 'disarm':
      // SIGNAL CHECK opening from ARMED (operator spec §3.1). ARMED is the one held screen that
      // draws live mat data, so it steps back to the scramble already on screen rather than
      // freezing into a lie on the projector. freshScramble is deliberately not used: the
      // competitor has not solved yet and must not be handed a new scramble.
      return phase === 'ARMED' ? { ...state, ...cleared(), phase: 'SCRAMBLE' } : state;
    default:
      return state;
  }
}
```

- [ ] **Step 8: Append `decision`, `decide` and `undo`** at the end of `js/core/run-state.js`,
after `selectTeam`:

```js
// The verdict the room is shown after a decision (UI spec §7.5): `kind` is 'OK', '+2', 'DNF' or
// 'REDO', and `ms` the stopped time without the penalty. A DNF names its reason when the room saw it
// coming: the time past the cutoff, which wins, or more than 17 s of inspection.
function decision(state, kind, at) {
  const { teams, cutoffMs } = state.event.config;
  let reason = null;
  if (kind === 'DNF' && state.pendingMs > cutoffMs) reason = 'CUTOFF';
  else if (kind === 'DNF' && suggestedPenalty(state.inspectionMs) === 'DNF') reason = 'INSPECTION';
  return { kind, teamId: teams[state.teamIndex].id, attempt: state.attemptNo, ms: state.pendingMs, reason, at };
}

// The PENDING gate's decision. With attempts left, the next scramble appears at once and the system
// waits for the mat to be reset (auto-arming, system design §5). With none left, STANDBY shows this
// university's Resultado until N.
function decide(state, kind, at) {
  const team = state.event.config.teams[state.teamIndex];
  const event = recordAttempt(state.event, {
    teamId: team.id,
    attempt: state.attemptNo,
    ms: state.pendingMs,
    penalty: kind === '+2' ? '+2' : null,
    status: kind === 'DNF' ? 'DNF' : 'OK',
    scramble: state.scramble,
    inspectionMs: state.inspectionMs,
    at,
  });
  const next = { ...state, ...cleared(), event, lastDecision: decision(state, kind, at) };
  if (isComplete(event, team.id)) return { ...next, phase: 'STANDBY', attemptNo: null, scramble: null, scrambleSvg: null };
  return { ...next, ...freshScramble(state), phase: 'SCRAMBLE', attemptNo: nextAttemptNo(event, team.id) };
}

// U takes back the most recent recorded attempt and reopens its PENDING gate with the same time,
// so a wrong key (Space where D was meant, say) is corrected by deciding again.
function undo(state) {
  const undone = undoLast(state.event);
  if (undone === null) return state;
  const { event, attempt } = undone;
  return {
    ...state,
    event,
    phase: 'PENDING',
    teamIndex: event.config.teams.findIndex((t) => t.id === attempt.teamId),
    attemptNo: attempt.attempt,
    pendingMs: attempt.ms,
    inspectionMs: attempt.inspectionMs,
    inspectionStartedAt: null,
    lastDecision: null,
    // The same scramble, under a new seq so the operator window redraws its preview.
    scramble: attempt.scramble,
    scrambleSvg: null,
    scrambleSeq: state.scrambleSeq + 1,
  };
}
```

- [ ] **Step 9: Run both run-state tests**

Run: `node --test test/core/run-state.test.js test/core/run-state-decisions.test.js`
Expected: `ℹ pass 40`, `ℹ fail 0`.

- [ ] **Step 10: Commit**

```bash
git add js/core/run-state.js test/core/run-state-decisions.test.js
git commit -m "Add decisions and their verdicts, roster navigation, redo and undo to the run state"
```

---

### Task 10: The keymap

**Files:**
- Create: `js/core/keymap.js`
- Test: `test/core/keymap.test.js`

- [ ] **Step 1: Write the failing test**, `test/core/keymap.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commandForKey } from '../../js/core/keymap.js';

test('Space accepts in PENDING and starts inspection anywhere else', () => {
  assert.equal(commandForKey(' ', 'PENDING'), 'accept');
  assert.equal(commandForKey(' ', 'ARMED'), 'startInspection');
});

test('the system design keys map to their commands, in either case', () => {
  const cases = [['Escape', 'cancelInspection'], ['d', 'dnf'], ['D', 'dnf'], ['2', 'plus2'], ['r', 'redo'],
    ['n', 'next'], ['N', 'next'], ['ArrowLeft', 'prevTeam'], ['ArrowRight', 'nextTeam'], ['u', 'undo'],
    ['s', 'signalCheck'], ['S', 'signalCheck']];
  for (const [key, command] of cases) assert.equal(commandForKey(key, 'ARMED'), command, key);
});

test('other keys map to nothing', () => {
  for (const key of ['x', 'Enter', 'Tab', 'F5', 'Shift']) assert.equal(commandForKey(key, 'ARMED'), null, key);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/core/keymap.test.js`
Expected: FAIL with `Cannot find module` for `js/core/keymap.js`.

- [ ] **Step 3: Write `js/core/keymap.js`**

```js
// Operator keys (system design §5, UI spec §5.1). These are the defaults; screen 10 (OPERATOR
// PANEL) owns the final keymap. The reducer ignores a command outside the phases it applies to.
const KEYS = {
  Escape: 'cancelInspection',
  d: 'dnf',
  '2': 'plus2',
  r: 'redo',
  n: 'next',
  ArrowLeft: 'prevTeam',
  ArrowRight: 'nextTeam',
  u: 'undo',
  // Not a reducer command: the operator window opens and closes SIGNAL CHECK itself, and decides
  // which phases allow it (operator spec §3.1). The reducer ignores it.
  s: 'signalCheck',
};

// `key` is a KeyboardEvent.key. Space starts inspection in ARMED and accepts in PENDING.
export function commandForKey(key, phase) {
  if (key === ' ') return phase === 'PENDING' ? 'accept' : 'startInspection';
  return KEYS[key.length === 1 ? key.toLowerCase() : key] ?? null;
}
```

- [ ] **Step 4: Run the test**

Run: `node --test test/core/keymap.test.js`
Expected: `ℹ pass 3`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/core/keymap.js test/core/keymap.test.js
git commit -m "Add the default operator keymap"
```

---

### Task 11: The snapshot

This is system design §4, extended by UI spec §4.4, §5.5 and §7.6. It adds `teams` (ATTRACT's
plates, and the names in the standings) and `startedCount` (the header's `{n}`). It also adds
`verdict`, the last decision for 3 s after the key, and `standingsBefore`, the standings as they were
before that decision until they update 1.2 s after the verdict ends (UI spec §7.5). The audience
window can then render every designed screen without holding any state of its own.

**Files:**
- Create: `js/core/snapshot.js`
- Test: `test/core/snapshot.test.js`

- [ ] **Step 1: Write the failing test**, `test/core/snapshot.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduce } from '../../js/core/run-state.js';
import { STANDINGS_UPDATE_MS, VERDICT_MS, buildSnapshot } from '../../js/core/snapshot.js';
import { packet } from '../../js/drivers/scenarios.js';
import { attempt, dnf, makeConfig } from '../helpers/fixtures.js';
import { apply, cmd, mat } from '../helpers/actions.js';

const config = makeConfig();
const armed = () => apply(createState(config), cmd('next'), mat(packet('I', 0)));
// PENDING on `ms` for the university N calls next.
const pending = (state, ms) => apply(reduce(state, cmd('next')), mat(packet('I', 0)), mat(packet(' ', 100, true)), mat(packet('S', ms)));

test('STANDBY at the start: no competitor, no result, nothing started', () => {
  const snapshot = buildSnapshot(createState(config), 0);
  assert.equal(snapshot.phase, 'STANDBY');
  assert.equal(snapshot.competitor, null);
  assert.equal(snapshot.result, null);
  assert.equal(snapshot.startedCount, 0);
  assert.deepEqual(snapshot.standings, []);
  assert.equal(snapshot.teams.length, 4);
  assert.deepEqual(snapshot.signal, { on: false });
  assert.equal(snapshot.verdict, null);
  assert.equal(snapshot.standingsBefore, null);
});

test('SCRAMBLE carries the competitor, the attempt and the scramble', () => {
  const state = apply(createState(config), cmd('next'), { type: 'scramble', seq: 1, scramble: "R U R'", svg: '<svg/>' });
  const snapshot = buildSnapshot(state, 0);
  assert.equal(snapshot.competitor.id, 'alfa');
  assert.equal(snapshot.attemptNo, 1);
  assert.equal(snapshot.startedCount, 1);
  assert.equal(snapshot.scramble, "R U R'");
  assert.equal(snapshot.scrambleSvg, '<svg/>');
  assert.equal(snapshot.displayMs, null);
});

test('ARMED: inspectionMs is measured from the key press to now', () => {
  assert.equal(buildSnapshot(armed(), 5000).inspectionMs, null);
  const state = apply(armed(), cmd('startInspection', 1000));
  assert.equal(buildSnapshot(state, 7200).inspectionMs, 6200);
});

test('hands follow the header, and read up when the signal is lost', () => {
  assert.equal(buildSnapshot(apply(armed(), mat(packet('C', 0))), 0).hands, 'down');
  assert.equal(buildSnapshot(apply(armed(), mat(packet('A', 0))), 0).hands, 'ready');
  assert.equal(buildSnapshot(apply(armed(), mat(packet('L', 0))), 0).hands, 'up');
  const lost = apply(armed(), mat(packet('A', 0)), mat({ ...packet('A', 0), on: false }));
  assert.equal(buildSnapshot(lost, 0).hands, 'up');
});

test('RUNNING shows the mat time; PENDING shows the stopped time', () => {
  const running = apply(armed(), mat(packet(' ', 4200, true)));
  assert.equal(buildSnapshot(running, 0).displayMs, 4200);
  assert.equal(buildSnapshot(running, 0).inspectionMs, null);
  const pending = apply(running, mat(packet('S', 8120)));
  assert.equal(buildSnapshot(pending, 0).displayMs, 8120);
});

test('standings are the audience slice; result is the latest completion', () => {
  const state = createState(config, [
    attempt('alfa', 1, 30000), attempt('alfa', 2, 20000), attempt('alfa', 3, 25000),
    dnf('beta', 1),
  ]);
  const snapshot = buildSnapshot(state, 0);
  assert.deepEqual(snapshot.standings, [{ teamId: 'alfa', group: 'ranked', position: 1, bestMs: 20000 }]);
  assert.deepEqual(snapshot.result, { teamId: 'alfa', bestMs: 20000, position: 1 });
  assert.equal(snapshot.startedCount, 2);
});

test('a snapshot survives structured cloning, as BroadcastChannel requires', () => {
  const snapshot = buildSnapshot(apply(armed(), cmd('startInspection', 0)), 3000);
  assert.deepEqual(structuredClone(snapshot), snapshot);
});

test('the verdict shows from the key until VERDICT_MS later', () => {
  const decided = reduce(pending(createState(config), 12470), cmd('plus2', 1000));
  assert.deepEqual(buildSnapshot(decided, 1000 + 2999).verdict, { kind: '+2', teamId: 'alfa', attempt: 1, ms: 12470, reason: null });
  assert.equal(buildSnapshot(decided, 1000 + 3000).verdict, null);
  assert.equal(VERDICT_MS, 3000);
});

test('until STANDINGS_UPDATE_MS, standingsBefore is the board without the decided attempt', () => {
  const before = createState(config, [attempt('alfa', 1, 20000), attempt('alfa', 2, 21000), attempt('alfa', 3, 22000)]);
  const decided = reduce(pending(before, 10000), cmd('accept', 1000));
  const waiting = buildSnapshot(decided, 1000 + 4199);
  assert.deepEqual(waiting.standingsBefore, buildSnapshot(before, 0).standings);
  assert.deepEqual(waiting.standings.map((row) => row.teamId), ['beta', 'alfa']);
  assert.equal(buildSnapshot(decided, 1000 + 4200).standingsBefore, null);
  assert.equal(STANDINGS_UPDATE_MS, 4200);
});

test('a redo shows a verdict but has no standings to update', () => {
  const redone = reduce(pending(createState(config), 12470), cmd('redo', 1000));
  assert.equal(buildSnapshot(redone, 1000).verdict.kind, 'REDO');
  assert.equal(buildSnapshot(redone, 1000).standingsBefore, null);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/core/snapshot.test.js`
Expected: FAIL with `Cannot find module` for `js/core/snapshot.js`.

- [ ] **Step 3: Write `js/core/snapshot.js`**

```js
// The snapshot the operator window broadcasts to the audience (system design §4, UI spec §4.4, §5.5
// and §7.6). The audience renders it and holds nothing else. Pure: `now` is passed in.
import { startedCount, undoLast } from './event-model.js';
import { handsFromHeader } from './inspection.js';
import { audienceStandings, latestResult, standings } from './scoring.js';

// How long the room sees a verdict, from the operator's key to the screen change (UI spec §7.2).
export const VERDICT_MS = 3000;
// When the standings update after a verdict: once the screen change (--t-long, 800 ms) and a pause
// (--t-step, 400 ms) have run. The two numbers are the motion tokens of UI spec §2.2.
export const STANDINGS_UPDATE_MS = VERDICT_MS + 800 + 400;

export function buildSnapshot(state, now) {
  const { event, phase } = state;
  const { config } = event;
  const table = standings(event);
  const competitor = phase === 'STANDBY' ? null : config.teams[state.teamIndex];
  return {
    phase,
    teams: config.teams, // the roster in order, for ATTRACT's plates and the standings names
    competitor,
    attemptNo: competitor ? state.attemptNo : null,
    attemptsPerCompetitor: config.attemptsPerCompetitor,
    startedCount: startedCount(event, competitor?.id ?? null),
    displayMs: phase === 'RUNNING' ? state.mat.time_milli : phase === 'PENDING' ? state.pendingMs : null,
    cutoffMs: config.cutoffMs,
    scramble: competitor ? state.scramble : null,
    scrambleSvg: competitor ? state.scrambleSvg : null,
    signal: { on: state.signalOn },
    standings: audienceStandings(table, 8),
    result: latestResult(event, table),
    // Counted from the latest packet, so the countdown moves at the mat's ~10 Hz.
    inspectionMs: phase === 'ARMED' && state.inspectionStartedAt !== null ? now - state.inspectionStartedAt : null,
    hands: state.signalOn ? handsFromHeader(state.mat?.signalHeader) : 'up',
    verdict: verdictAt(state.lastDecision, now),
    standingsBefore: standingsBefore(state, now),
  };
}

// The last decision, while the room is shown it (UI spec §7.5).
function verdictAt(decision, now) {
  if (decision === null || now - decision.at >= VERDICT_MS) return null;
  const { kind, teamId, attempt, ms, reason } = decision;
  return { kind, teamId, attempt, ms, reason };
}

// The audience standings as they were before the decision, until they update (UI spec §2.7). A redo
// records nothing, so there is nothing to update.
function standingsBefore({ lastDecision, event }, now) {
  if (lastDecision === null || lastDecision.kind === 'REDO' || now - lastDecision.at >= STANDINGS_UPDATE_MS) return null;
  return audienceStandings(standings(undoLast(event).event), 8);
}
```

- [ ] **Step 4: Run the test**

Run: `node --test test/core/snapshot.test.js`
Expected: `ℹ pass 10`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/core/snapshot.js test/core/snapshot.test.js
git commit -m "Add the operator-to-audience snapshot"
```

---

### Task 12: The mock driver, the scenario replays, and a full event

This covers roadmap row 1's "mock replays a full solve", every scenario in system design §9 and UI
spec §5.8 and §7.9, and a 13 × 3 event on the real roster.

**Files:**
- Create: `js/drivers/mock.js`
- Test: `test/drivers/mock.test.js`, `test/drivers/replay.test.js`, `test/core/full-event.test.js`

- [ ] **Step 1: Write the failing test**, `test/drivers/mock.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockDriver } from '../../js/drivers/mock.js';
import { packet } from '../../js/drivers/scenarios.js';

function started(t) {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const driver = createMockDriver();
  const seen = [];
  driver.onState((state) => seen.push(state));
  driver.start();
  return { driver, seen, tick: (ms) => t.mock.timers.tick(ms) };
}

test('sends nothing until a scenario plays', (t) => {
  const { seen, tick } = started(t);
  tick(500);
  assert.equal(seen.length, 0);
});

test('plays a scenario one packet per 100 ms, then repeats the last state', (t) => {
  const { driver, seen, tick } = started(t);
  driver.play([{ t: 0, state: packet('I', 0) }, { t: 100, state: packet('C', 0) }]);
  tick(400);
  assert.deepEqual(seen.map((s) => s.signalHeader), ['I', 'C', 'C', 'C']);
});

test('a new scenario replaces the one playing', (t) => {
  const { driver, seen, tick } = started(t);
  driver.play([{ t: 0, state: packet('I', 0) }, { t: 1000, state: packet('C', 0) }]);
  tick(200);
  driver.play([{ t: 0, state: packet('A', 0) }]);
  tick(200);
  assert.deepEqual(seen.map((s) => s.signalHeader), ['I', 'I', 'A', 'A']);
});

test('emits copies, so a listener cannot change what comes next', (t) => {
  const { driver, seen, tick } = started(t);
  driver.play([{ t: 0, state: packet('I', 0) }]);
  tick(100);
  seen[0].on = false;
  tick(100);
  assert.equal(seen[1].on, true);
});

test('getSample draws the packet playing now, for the signal check', (t) => {
  const { driver, tick } = started(t);
  driver.play([{ t: 0, state: packet('A', 0) }]);
  tick(100);
  let sample = null;
  driver.getSample(0.2, (result) => { sample = result; });
  assert.equal(sample.raw.length, 9600);
  assert.equal(sample.bin.length, 9600);
  assert.deepEqual(sample.bytes, ['A', '0', '0', '0', '0', '0', '@', '\n', '\r']);
  assert.ok(sample.raw.some((value) => value === -1), 'the packet is in the trace, not just idle');
});

test('stop halts the packets', (t) => {
  const { driver, seen, tick } = started(t);
  driver.play([{ t: 0, state: packet('I', 0) }]);
  tick(200);
  driver.stop();
  tick(500);
  assert.equal(seen.length, 2);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/drivers/mock.test.js`
Expected: FAIL with `Cannot find module` for `js/drivers/mock.js`.

- [ ] **Step 3: Write `js/drivers/mock.js`**

```js
// Mock StackMat driver (system design §4): replays scenarios from ./scenarios.js behind the same
// interface as the real driver, so the core cannot tell them apart. Like a real mat it sends a
// packet every 100 ms, and it keeps repeating its last state once a scenario ends.
import { PACKET_MS, packetBits, packetBytes } from './scenarios.js';

export function createMockDriver() {
  let listener = () => {};
  let timer = null;
  let queue = [];
  let current = null;
  let elapsed = 0;

  function tick() {
    while (queue.length > 0 && queue[0].t <= elapsed) current = queue.shift().state;
    if (current !== null) listener({ ...current });
    elapsed += PACKET_MS;
  }

  return {
    async start() {
      if (timer === null) timer = setInterval(tick, PACKET_MS);
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
    onState(callback) {
      listener = callback;
    },
    // A synthesised trace of the packet playing now, so SIGNAL CHECK (operator spec §3.6) can be
    // rehearsed on a machine with no microphone. 48 kHz is what a browser's AudioContext usually
    // runs at; the screen derives the rate from the sample's own length, so the exact figure only
    // has to be plausible.
    getSample(seconds, callback) {
      const rate = 48000;
      const perBit = Math.round(rate / 1200);
      const bits = current === null ? [] : packetBits(current);
      const bytes = current === null ? [] : packetBytes(current);
      const raw = [];
      const bin = [];
      for (let i = 0; i < Math.round(seconds * rate); i += 1) {
        // The packet's bits, then idle for the rest of the 100 ms it shares with the next packet.
        const index = Math.floor(i / perBit) % 120;
        const bit = index < bits.length ? bits[index] : 1;
        bin.push(bit);
        raw.push(bit ? 1 : -1);
      }
      callback({ raw, bin, bits, bytes });
    },
    async listDevices() {
      return [['mock', 'Mock mat']];
    },
    // Plays a scenario from the next packet on, replacing whatever was playing.
    play(steps) {
      queue = [...steps];
      elapsed = 0;
    },
  };
}
```

- [ ] **Step 4: Run the test**

Run: `node --test test/drivers/mock.test.js`
Expected: `ℹ pass 6`, `ℹ fail 0`.

- [ ] **Step 5: Write the scenario replays**, `test/drivers/replay.test.js`

```js
// The scripted scenarios of system design §9 and UI spec §5.8 and §7.9, replayed through the reducer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduce } from '../../js/core/run-state.js';
import { buildSnapshot } from '../../js/core/snapshot.js';
import { suggestedPenalty } from '../../js/core/inspection.js';
import { SCENARIOS, handsDown, packet, sequence, solve, startAfter } from '../../js/drivers/scenarios.js';
import { makeConfig } from '../helpers/fixtures.js';
import { apply, cmd, mat, replay } from '../helpers/actions.js';

const config = makeConfig();
const armed = () => apply(createState(config), cmd('next'), mat(packet('I', 0)));
const upTo = (steps, t) => steps.filter((s) => s.t < t);

test('clean solve: PENDING on the stopped time, recorded on Space', () => {
  const state = replay(armed(), { steps: SCENARIOS.cleanSolve() });
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.pendingMs, 8000);
  assert.equal(reduce(state, cmd('accept')).event.attempts[0].ms, 8000);
});

test('false start: lands in PENDING, and R voids it', () => {
  const state = replay(armed(), { steps: SCENARIOS.falseStart() });
  assert.equal(state.pendingMs, 300);
  const redone = reduce(state, cmd('redo'));
  assert.equal(redone.phase, 'SCRAMBLE');
  assert.equal(redone.event.attempts.length, 0);
});

test('mat bump: a start with no hands still lands in PENDING, never in the standings', () => {
  const state = replay(armed(), { steps: SCENARIOS.matBump() });
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.event.attempts.length, 0);
});

test('reset mid-solve: not a finish; the solve that follows is the one that counts', () => {
  const steps = SCENARIOS.resetMidSolve();
  const firstReset = steps.find((s) => s.state.signalHeader === 'I').t;
  const afterReset = replay(armed(), { steps: upTo(steps, firstReset + 100) });
  assert.equal(afterReset.phase, 'RUNNING');
  const state = replay(armed(), { steps });
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.pendingMs, 6000);
});

test('cutoff overrun: nothing stops at 5:00; the operator decides once the timer stops', () => {
  const steps = SCENARIOS.cutoffOverrun();
  const stop = steps.find((s) => s.state.signalHeader === 'S').t;
  const late = replay(armed(), { steps: upTo(steps, stop) });
  assert.equal(late.phase, 'RUNNING');
  assert.ok(buildSnapshot(late, 0).displayMs > config.cutoffMs);
  const state = replay(armed(), { steps });
  assert.equal(state.pendingMs, 301000);
  assert.equal(reduce(state, cmd('dnf')).event.attempts[0].status, 'DNF');
});

test('signal loss during a run: the clock freezes, then the solve finishes normally', () => {
  const steps = SCENARIOS.signalLossDuringRun();
  const lostAt = steps.find((s) => !s.state.on).t;
  const during = replay(armed(), { steps: upTo(steps, lostAt + 500) });
  assert.equal(during.phase, 'RUNNING');
  assert.equal(during.signalOn, false);
  assert.equal(buildSnapshot(during, 0).displayMs, 1900);
  const state = replay(armed(), { steps });
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.pendingMs, 8000);
});

test('signal loss while waiting: nothing is recorded and nothing moves', () => {
  const start = createState(config);
  const steps = SCENARIOS.signalLossDuringStandby();
  const during = replay(start, { steps: upTo(steps, 1000) });
  assert.equal(during.signalOn, false);
  const state = replay(start, { steps });
  assert.equal(state.phase, 'STANDBY');
  assert.equal(state.signalOn, true);
  assert.equal(state.event.attempts.length, 0);
});

test('inspection: a start inside 15 s suggests nothing', () => {
  const state = replay(armed(), { steps: startAfter(10000), commands: [{ t: 0, command: 'startInspection' }] });
  assert.equal(state.inspectionMs, 10000);
  assert.equal(suggestedPenalty(state.inspectionMs), null);
});

test('inspection: a start between 15 and 17 s suggests +2', () => {
  const state = replay(armed(), { steps: startAfter(16000), commands: [{ t: 0, command: 'startInspection' }] });
  assert.equal(suggestedPenalty(state.inspectionMs), '+2');
});

test('inspection: a start after 17 s suggests DNF, and nothing stopped the competitor', () => {
  const state = replay(armed(), { steps: startAfter(18000), commands: [{ t: 0, command: 'startInspection' }] });
  assert.equal(state.phase, 'PENDING');
  assert.equal(suggestedPenalty(state.inspectionMs), 'DNF');
});

test('inspection never started: the solve runs and nothing is suggested', () => {
  const state = replay(armed(), { steps: sequence(handsDown(), solve(5000)) });
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.inspectionMs, null);
});

test('hands down, then lifted before green: ARMED throughout, hands back to up', () => {
  const steps = SCENARIOS.handsLiftedBeforeGreen();
  const down = replay(armed(), { steps: upTo(steps, 100) });
  assert.equal(buildSnapshot(down, 0).hands, 'down');
  const state = replay(armed(), { steps });
  assert.equal(state.phase, 'ARMED');
  assert.equal(buildSnapshot(state, 0).hands, 'up');
});

test('clean solve, then each key: the verdict the room is shown', () => {
  const state = replay(armed(), { steps: SCENARIOS.cleanSolve() });
  for (const [command, kind] of [['accept', 'OK'], ['plus2', '+2'], ['dnf', 'DNF'], ['redo', 'REDO']]) {
    const decided = reduce(state, cmd(command, 60000));
    assert.deepEqual(buildSnapshot(decided, 60000).verdict, { kind, teamId: 'alfa', attempt: 1, ms: 8000, reason: null }, command);
  }
});

test('cutoff overrun, then D: the verdict names the cutoff', () => {
  const state = reduce(replay(armed(), { steps: SCENARIOS.cutoffOverrun() }), cmd('dnf', 400000));
  assert.equal(buildSnapshot(state, 400000).verdict.reason, 'CUTOFF');
});

test('a start past 17 s of inspection, then D: the verdict names the inspection', () => {
  const state = replay(armed(), { steps: startAfter(18000), commands: [{ t: 0, command: 'startInspection' }] });
  assert.equal(buildSnapshot(reduce(state, cmd('dnf', 60000)), 60000).verdict.reason, 'INSPECTION');
});
```

- [ ] **Step 6: Write the full event**, `test/core/full-event.test.js`

```js
// A whole event on the real roster (config/event.json): 13 universities × 3 attempts, driven the
// way the operator window drives it, with the mat's packets from the mock scenarios.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createState, reduce } from '../../js/core/run-state.js';
import { buildSnapshot } from '../../js/core/snapshot.js';
import { SCENARIOS, packet } from '../../js/drivers/scenarios.js';
import { cmd, mat, replay } from '../helpers/actions.js';

const config = JSON.parse(readFileSync(new URL('../../config/event.json', import.meta.url), 'utf8'));

test('13 × 3 attempts run end to end, in roster order, and land in the standings', () => {
  let state = createState(config);
  const order = [];
  for (let u = 0; u < config.teams.length; u += 1) {
    state = reduce(state, cmd('next'));
    for (let n = 1; n <= config.attemptsPerCompetitor; n += 1) {
      assert.equal(state.phase, 'SCRAMBLE');
      assert.equal(state.attemptNo, n);
      state = reduce(state, mat(packet('I', 0)));
      state = replay(state, { steps: SCENARIOS.cleanSolve() });
      assert.equal(state.phase, 'PENDING');
      order.push(config.teams[state.teamIndex].id);
      // Every third university DNFs its last attempt, so the mix is realistic.
      state = reduce(state, cmd(u % 3 === 0 && n === 3 ? 'dnf' : 'accept'));
    }
    assert.equal(state.phase, 'STANDBY');
    assert.equal(buildSnapshot(state, 0).result.teamId, config.teams[u].id);
    assert.equal(buildSnapshot(state, 0).startedCount, u + 1);
  }
  assert.deepEqual(order, config.teams.flatMap((t) => [t.id, t.id, t.id]));
  assert.equal(state.event.attempts.length, 39);
  assert.equal(reduce(state, cmd('next')), state, 'N does nothing once everyone is done');
  assert.equal(buildSnapshot(state, 0).standings.length, 8);
});
```

- [ ] **Step 7: Run both**

Run: `node --test test/drivers/replay.test.js test/core/full-event.test.js`
Expected: `ℹ pass 16`, `ℹ fail 0`. These pass immediately, because they replay behaviour built in
Tasks 5–11. If one fails, the bug is in those tasks: fix it there, not in the test.

- [ ] **Step 8: Commit**

```bash
git add js/drivers/mock.js test/drivers/mock.test.js test/drivers/replay.test.js test/core/full-event.test.js
git commit -m "Add the mock driver, the scenario replays and a full 13 x 3 event"
```

---

### Task 13: The real driver, tested against the vendored decoder

`vendor/stackmat.js` is a classic script. It expects csTimer globals (`execMain`, `$.now`, `$.noop`,
`kernel.getProp` and `DEBUG`), which `js/drivers/shim.js` supplies. The test helper runs both files,
unmodified, inside a Node `vm` with a fake audio graph, and feeds them a synthesized 1200-baud
StackMat signal. This machine has no microphone, and this is how the decoder gets exercised anyway.
Two facts this test protects:

- **The decoder mutates its last state object when the signal drops** (`stackmat_state.on = false`,
  then it emits that object again, `vendor/stackmat.js` lines 202–206). The driver therefore copies
  every state.
- **`kernel.getProp('stkHead')` must be true.** Otherwise every header byte reads `S`, and the hands
  and the green light disappear.

**Files:**
- Create: `js/drivers/shim.js`
- Create: `js/drivers/real.js`
- Create: `test/helpers/stackmat-signal.js`
- Test: `test/drivers/real.test.js`

- [ ] **Step 1: Write the signal helper**, `test/helpers/stackmat-signal.js`

```js
// Runs the unmodified vendor/stackmat.js, with js/drivers/shim.js, inside a Node vm whose fake
// audio graph lets a test feed it a synthesized StackMat signal. This is the only way to exercise
// the decoder on a machine without a microphone.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const SAMPLE_RATE = 48000;
const SAMPLES_PER_BIT = SAMPLE_RATE / 1200; // the StackMat sends 1200 baud

export async function loadDecoder() {
  let processor = null;
  class FakeAudioContext {
    constructor() {
      this.sampleRate = SAMPLE_RATE;
      this.state = 'running';
      this.destination = {};
    }
    createMediaStreamSource() {
      return { connect() {}, disconnect() {} };
    }
    createScriptProcessor() {
      processor = { connect() {}, disconnect() {} };
      return processor;
    }
  }
  const context = vm.createContext({
    console,
    AudioContext: FakeAudioContext,
    navigator: { mediaDevices: { getUserMedia: async () => ({}) } },
  });
  context.window = context;
  for (const file of ['../../js/drivers/shim.js', '../../vendor/stackmat.js']) {
    vm.runInContext(readFileSync(new URL(file, import.meta.url), 'utf8'), context);
  }
  return {
    decoder: context.stackmat,
    // Plays a list of line levels (1 = idle/mark, 0 = space) into the decoder, one bit each.
    feed(bits) {
      const samples = new Float32Array(bits.length * SAMPLES_PER_BIT);
      bits.forEach((bit, i) => samples.fill(bit ? 1 : -1, i * SAMPLES_PER_BIT, (i + 1) * SAMPLES_PER_BIT));
      for (let i = 0; i < samples.length; i += 1024) {
        const chunk = new Float32Array(1024);
        chunk.set(samples.subarray(i, i + 1024));
        processor.onaudioprocess({ inputBuffer: { getChannelData: () => chunk } });
      }
    },
  };
}

// One 9-byte StackMat packet as line levels: header, five digits (m ss hh), checksum (64 + digit
// sum), CR, LF; each byte a UART frame (start 0, eight data bits LSB first, stop 1), after idle.
export function packetBits(header, ms) {
  const hundredths = Math.floor(ms / 10);
  const digits = [
    Math.floor(hundredths / 6000),
    Math.floor((hundredths % 6000) / 1000),
    Math.floor((hundredths % 1000) / 100),
    Math.floor((hundredths % 100) / 10),
    hundredths % 10,
  ];
  const checksum = String.fromCharCode(64 + digits.reduce((a, b) => a + b, 0));
  const bits = Array(20).fill(1);
  for (const char of [header, ...digits.map(String), checksum, '\n', '\r']) {
    const code = char.charCodeAt(0);
    bits.push(0);
    for (let i = 0; i < 8; i += 1) bits.push((code >> i) & 1);
    bits.push(1);
  }
  return bits;
}

export const silence = (bits) => Array(bits).fill(1);
```

- [ ] **Step 2: Write the failing test**, `test/drivers/real.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRealDriver } from '../../js/drivers/real.js';
import { loadDecoder, packetBits, silence } from '../helpers/stackmat-signal.js';

function fakeDecoder() {
  const calls = [];
  return {
    calls,
    callback: null,
    setCallBack(fn) { this.callback = fn; },
    stop() { calls.push(['stop']); },
    async init(...args) { calls.push(['init', ...args]); },
    getSample(seconds, cb) { calls.push(['getSample', seconds]); cb('sample'); },
    async updateInputDevices() { return [['dev1', 'Line in']]; },
  };
}

test('start re-initialises the decoder for StackMat on the chosen device', async () => {
  const decoder = fakeDecoder();
  await createRealDriver({ decoder, permissions: undefined }).start('dev1');
  assert.deepEqual(decoder.calls, [['stop'], ['init', 's', 'dev1', true]]);
});

test('start rejects when microphone permission is denied', async () => {
  const permissions = { query: async () => ({ state: 'denied' }) };
  const driver = createRealDriver({ decoder: fakeDecoder(), permissions });
  await assert.rejects(driver.start(), /permission denied/);
});

test('each state is copied, so the decoder mutating it later changes nothing', () => {
  const decoder = fakeDecoder();
  const driver = createRealDriver({ decoder, permissions: undefined });
  const seen = [];
  driver.onState((state) => seen.push(state));
  const state = { on: true, signalHeader: 'A' };
  decoder.callback(state);
  state.on = false;
  decoder.callback(state);
  assert.deepEqual(seen.map((s) => s.on), [true, false]);
  // The second call is the same object again: a re-emission, not a packet.
  assert.deepEqual(seen.map((s) => s.fresh), [true, false]);
  decoder.callback({ on: true, signalHeader: 'C' });
  assert.equal(seen.at(-1).fresh, true);
});

test('listDevices and getSample pass through to the decoder', async () => {
  const decoder = fakeDecoder();
  const driver = createRealDriver({ decoder, permissions: undefined });
  assert.deepEqual(await driver.listDevices(), [['dev1', 'Line in']]);
  driver.getSample(0.5, (sample) => assert.equal(sample, 'sample'));
  assert.deepEqual(decoder.calls.at(-1), ['getSample', 0.5]);
});

test('the vendored decoder, behind the shim, turns a StackMat signal into states', async () => {
  const { decoder, feed } = await loadDecoder();
  const driver = createRealDriver({ decoder, permissions: undefined });
  const seen = [];
  driver.onState((state) => seen.push(state));
  await driver.start();
  feed(packetBits('I', 0)); // the first packet only synchronises the decoder
  feed(packetBits('I', 0));
  feed(packetBits('A', 0));
  feed(packetBits(' ', 1230));
  feed(packetBits(' ', 1330));
  feed(packetBits('S', 1330));
  feed(silence(200)); // no packets for 200 bits: the decoder reports the signal lost
  assert.deepEqual(
    seen.map((s) => [s.on, s.signalHeader, s.time_milli, s.running]),
    [
      [true, 'I', 0, false],
      [true, 'A', 0, false],
      [true, ' ', 1230, true],
      [true, ' ', 1330, true],
      [true, 'S', 1330, false],
      [false, 'S', 1330, false],
    ],
  );
  assert.equal(seen[1].greenLight, true);
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `node --test test/drivers/real.test.js`
Expected: FAIL with `Cannot find module` for `js/drivers/real.js`.

- [ ] **Step 4: Write `js/drivers/shim.js`**

```js
// Supplies what vendor/stackmat.js expects from csTimer's kernel, so the decoder stays
// byte-for-byte unmodified (vendor/PROVENANCE.md). A classic script: load it before the decoder.
window.DEBUG = false;
window.execMain = function (main, args) {
  return main.apply(null, args || []);
};
window.$ = {
  now: function () {
    return Date.now();
  },
  noop: function () {},
};
window.kernel = {
  // stkHead: trust the packet's header byte (hands, green light). Without it every header is 'S'.
  getProp: function (key) {
    return key === 'stkHead';
  },
};
```

- [ ] **Step 5: Write `js/drivers/real.js`**

```js
// Real StackMat driver (system design §4). Wraps csTimer's decoder, vendor/stackmat.js: a classic
// script that defines a global `stackmat`, loaded after js/drivers/shim.js.
export function createRealDriver({
  decoder = globalThis.stackmat,
  permissions = globalThis.navigator?.permissions,
} = {}) {
  let listener = () => {};
  let lastRaw = null;
  // When the line idles or the signal drops, the decoder emits the object it emitted last, mutated
  // (vendor/stackmat.js lines 202–213). Copying each state keeps an earlier one from changing under
  // the core — and erases the only clue that a callback was not a new packet, so identity is
  // compared first. SIGNAL CHECK counts packets per second from `fresh` (operator spec §3.2, §4).
  decoder.setCallBack((state) => {
    const fresh = state !== lastRaw;
    lastRaw = state;
    listener({ ...state, fresh });
  });

  return {
    // Call from a click: the decoder creates its AudioContext inside init(), and a context created
    // outside a user gesture starts suspended.
    async start(deviceId) {
      decoder.stop();
      await decoder.init('s', deviceId, true);
      // init() logs and swallows a getUserMedia failure, so ask the browser directly.
      const status = await permissions?.query({ name: 'microphone' }).catch(() => null);
      if (status?.state === 'denied') throw new Error('Microphone permission denied');
    },
    stop() {
      decoder.stop();
    },
    onState(callback) {
      listener = callback;
    },
    getSample(seconds, callback) {
      decoder.getSample(seconds, callback);
    },
    // [[deviceId, label], …]. Labels are blank until microphone permission is granted.
    listDevices() {
      return decoder.updateInputDevices();
    },
  };
}
```

- [ ] **Step 6: Run the test**

Run: `node --test test/drivers/real.test.js`
Expected: `ℹ pass 5`, `ℹ fail 0`.

- [ ] **Step 7: Confirm the decoder is untouched**

Run: `git status --short vendor/`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add js/drivers/shim.js js/drivers/real.js test/helpers/stackmat-signal.js test/drivers/real.test.js
git commit -m "Add the real StackMat driver, tested against the vendored decoder"
```

---

### Task 14: Persistence and export

This is system design §7. The attempt log is written after every change. An unreadable save is never
treated as empty. Starting fresh archives the old log instead of deleting it.

**Files:**
- Create: `js/core/store.js`
- Create: `js/core/export.js`
- Test: `test/core/store.test.js`, `test/core/export.test.js`

- [ ] **Step 1: Write the failing test**, `test/core/store.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, createStore } from '../../js/core/store.js';
import { attempt } from '../helpers/fixtures.js';

function fakeStorage() {
  const items = new Map();
  return {
    items,
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
  };
}

test('nothing saved reads as none', () => {
  assert.deepEqual(createStore(fakeStorage()).load(), { status: 'none' });
});

test('saved attempts load back', () => {
  const store = createStore(fakeStorage());
  const attempts = [attempt('alfa', 1, 12470), attempt('alfa', 2, 11000)];
  store.save(attempts);
  assert.deepEqual(store.load(), { status: 'ok', attempts });
});

test('unreadable or unknown data reads as corrupt, never as empty', () => {
  const storage = fakeStorage();
  const store = createStore(storage);
  storage.setItem(STORAGE_KEY, '{not json');
  assert.deepEqual(store.load(), { status: 'corrupt' });
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 9, attempts: [] }));
  assert.deepEqual(store.load(), { status: 'corrupt' });
});

test('archive keeps the old data under a timestamped key and clears the live one', () => {
  const storage = fakeStorage();
  const store = createStore(storage);
  store.save([attempt('alfa', 1, 12470)]);
  const saved = storage.getItem(STORAGE_KEY);
  store.archive(1760000000000);
  assert.equal(storage.getItem(`${STORAGE_KEY}:archived:1760000000000`), saved);
  assert.deepEqual(store.load(), { status: 'none' });
});

test('a store with its own key never touches another', () => {
  const storage = fakeStorage();
  createStore(storage, `${STORAGE_KEY}:mock`).save([attempt('alfa', 1, 1)]);
  assert.deepEqual(createStore(storage).load(), { status: 'none' });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/core/store.test.js`
Expected: FAIL with `Cannot find module` for `js/core/store.js`.

- [ ] **Step 3: Write `js/core/store.js`**

```js
// Persistence (system design §7): the attempt log is written after every change. The config is not
// stored; config/event.json is its source. `storage` is localStorage in the browser, a fake in tests.
export const STORAGE_KEY = 'cube-tournament-display:attempts:v1';

export function createStore(storage, key = STORAGE_KEY) {
  return {
    save(attempts) {
      storage.setItem(key, JSON.stringify({ version: 1, attempts }));
    },
    // { status: 'none' } · { status: 'ok', attempts } · { status: 'corrupt' }
    load() {
      const raw = storage.getItem(key);
      if (raw === null) return { status: 'none' };
      try {
        const data = JSON.parse(raw);
        if (data?.version === 1 && Array.isArray(data.attempts)) return { status: 'ok', attempts: data.attempts };
      } catch {
        // unreadable JSON falls through to corrupt
      }
      return { status: 'corrupt' };
    },
    // Starting fresh never destroys anything: the old log moves to a timestamped key.
    archive(now) {
      const raw = storage.getItem(key);
      if (raw !== null) storage.setItem(`${key}:archived:${now}`, raw);
      storage.removeItem(key);
    },
  };
}
```

- [ ] **Step 4: Run the test**

Run: `node --test test/core/store.test.js`
Expected: `ℹ pass 5`, `ℹ fail 0`.

- [ ] **Step 5: Write the failing test**, `test/core/export.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEvent } from '../../js/core/event-model.js';
import { toCSV, toJSON } from '../../js/core/export.js';
import { attempt, dnf, makeConfig, plus2 } from '../helpers/fixtures.js';

const config = makeConfig(['alfa', 'beta', 'gamma']);

test('toJSON carries the config and every attempt', () => {
  const event = createEvent(config, [attempt('alfa', 1, 12470)]);
  const data = JSON.parse(toJSON(event, Date.UTC(2026, 9, 10)));
  assert.equal(data.exportedAt, '2026-10-10T00:00:00.000Z');
  assert.deepEqual(data.config, config);
  assert.deepEqual(data.attempts, event.attempts);
});

test('toCSV has one row per university in standings order', () => {
  const event = createEvent(config, [
    attempt('beta', 1, 25000), plus2('beta', 2, 19000), dnf('beta', 3),
    dnf('gamma', 1), dnf('gamma', 2), dnf('gamma', 3),
  ]);
  assert.equal(toCSV(event), [
    'position,university,participant,best,attempt 1,attempt 2,attempt 3',
    '1,BETA,,21.00,25.00,21.00 (+2),DNF',
    ',GAMMA,,DNF,DNF,DNF,DNF',
    ',ALFA,,,,,',
    '',
  ].join('\n'));
});

test('toCSV quotes a cell that holds a comma or a quote', () => {
  const named = makeConfig(['alfa']);
  named.teams[0].participant = 'Pérez, "Pepe"';
  const csv = toCSV(createEvent(named, [attempt('alfa', 1, 10000)]));
  assert.match(csv, /,"Pérez, ""Pepe""",/);
});
```

- [ ] **Step 6: Run it and watch it fail**

Run: `node --test test/core/export.test.js`
Expected: FAIL with `Cannot find module` for `js/core/export.js`.

- [ ] **Step 7: Write `js/core/export.js`**

```js
// Export at any point (system design §7): JSON for the record, CSV for the CTF scoreboard.
import { attemptsFor } from './event-model.js';
import { formatMs } from './format.js';
import { effectiveMs, standings } from './scoring.js';

export function toJSON(event, now) {
  const data = { exportedAt: new Date(now).toISOString(), config: event.config, attempts: event.attempts };
  return `${JSON.stringify(data, null, 2)}\n`;
}

// One row per university, in standings order.
export function toCSV(event) {
  const n = event.config.attemptsPerCompetitor;
  const header = ['position', 'university', 'participant', 'best', ...Array.from({ length: n }, (_, i) => `attempt ${i + 1}`)];
  const rows = standings(event).map((row) => {
    const team = event.config.teams.find((t) => t.id === row.teamId);
    const attempts = attemptsFor(event, row.teamId);
    const best = row.group === 'ranked' ? formatMs(row.bestMs) : row.group === 'unranked' ? 'DNF' : '';
    return [row.position ?? '', team.university, team.participant, best,
      ...Array.from({ length: n }, (_, i) => attemptCell(attempts[i]))];
  });
  return `${[header, ...rows].map((cells) => cells.map(csvCell).join(',')).join('\n')}\n`;
}

function attemptCell(attempt) {
  if (!attempt) return '';
  if (attempt.status === 'DNF') return 'DNF';
  return attempt.penalty === '+2' ? `${formatMs(effectiveMs(attempt))} (+2)` : formatMs(attempt.ms);
}

function csvCell(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
```

- [ ] **Step 8: Run both**

Run: `node --test test/core/store.test.js test/core/export.test.js`
Expected: `ℹ pass 8`, `ℹ fail 0`.

- [ ] **Step 9: Commit**

```bash
git add js/core/store.js js/core/export.js test/core/store.test.js test/core/export.test.js
git commit -m "Add persistence of the attempt log and JSON/CSV export"
```

---

### Task 15: Window sync and the one-operator rule

This is system design §4 (the snapshot broadcast) and §8 (audience window closed; two operator
windows). Node 24 has both `BroadcastChannel` and `navigator.locks`, so this runs under `node --test`.

**Files:**
- Create: `js/core/channel.js`
- Test: `test/core/channel.test.js`

- [ ] **Step 1: Write the failing test**, `test/core/channel.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claimOperator, createPublisher, createSubscriber } from '../../js/core/channel.js';

const nextSnapshot = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

test('the audience receives what the operator publishes', async (t) => {
  const publisher = createPublisher();
  const received = nextSnapshot();
  const subscriber = createSubscriber(received.resolve);
  t.after(() => { publisher.close(); subscriber.close(); });
  publisher.publish({ phase: 'ARMED', inspectionMs: 6200 });
  assert.deepEqual(await received.promise, { phase: 'ARMED', inspectionMs: 6200 });
});

test('an audience window that opens late catches up with the current snapshot', async (t) => {
  const publisher = createPublisher();
  publisher.publish({ phase: 'RUNNING', displayMs: 4200 });
  const received = nextSnapshot();
  const subscriber = createSubscriber(received.resolve);
  t.after(() => { publisher.close(); subscriber.close(); });
  assert.deepEqual(await received.promise, { phase: 'RUNNING', displayMs: 4200 });
});

test('only the first operator window gets the claim', async () => {
  assert.equal(await claimOperator(), true);
  assert.equal(await claimOperator(), false);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/core/channel.test.js`
Expected: FAIL with `Cannot find module` for `js/core/channel.js`.

- [ ] **Step 3: Write `js/core/channel.js`**

```js
// Operator → audience sync (system design §4). The operator publishes a snapshot on every change;
// the audience renders the latest one and holds nothing else. An audience window that opens late
// says hello and is sent the current snapshot, so it can be closed, reopened or moved at any time.
export const CHANNEL = 'cube-tournament-display';

export function createPublisher() {
  const channel = new BroadcastChannel(CHANNEL);
  let latest = null;
  channel.onmessage = (event) => {
    if (event.data?.type === 'hello' && latest !== null) channel.postMessage({ type: 'snapshot', snapshot: latest });
  };
  return {
    publish(snapshot) {
      latest = snapshot;
      channel.postMessage({ type: 'snapshot', snapshot });
    },
    close() {
      channel.close();
    },
  };
}

export function createSubscriber(onSnapshot) {
  const channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (event) => {
    if (event.data?.type === 'snapshot') onSnapshot(event.data.snapshot);
  };
  channel.postMessage({ type: 'hello' });
  return {
    close() {
      channel.close();
    },
  };
}

// One operator window at a time (system design §8): two windows both holding the microphone and
// both writing results is the worst bug available. The first window takes a Web Lock and holds it
// for its lifetime; the browser releases it when that window closes. Resolves true for the window
// that holds it, false for any other.
export function claimOperator() {
  return new Promise((resolve) => {
    navigator.locks.request(`${CHANNEL}:operator`, { ifAvailable: true }, (lock) => {
      resolve(lock !== null);
      return lock === null ? undefined : new Promise(() => {});
    });
  });
}
```

- [ ] **Step 4: Run the test**

Run: `node --test test/core/channel.test.js`
Expected: `ℹ pass 3`, `ℹ fail 0`, and the process exits on its own. A lock held forever does not keep
Node alive.

- [ ] **Step 5: Commit**

```bash
git add js/core/channel.js test/core/channel.test.js
git commit -m "Add operator-to-audience sync and the one-operator lock"
```

---

### Task 16: The scramble worker client

This is system design §3, "Scrambles". The worker protocol is `[id, type, details]` in and
`[id, type, result]` out. It was confirmed against `cstimer_module@0.1.5` itself. csTimer's scramble
text can end in a space, so the client trims it. The test runs the real module in a Node worker
thread through a small adapter.

**Files:**
- Create: `js/scrambler.js`
- Create: `test/helpers/cstimer-worker.cjs`
- Test: `test/scrambler.test.js`

- [ ] **Step 1: Write the worker adapter**, `test/helpers/cstimer-worker.cjs`

```js
// Runs cstimer_module in a Node worker thread the way a browser runs it as a WebWorker: it installs
// self.onmessage and answers through a global postMessage.
const { parentPort } = require('node:worker_threads');

globalThis.self = globalThis;
globalThis.postMessage = (message) => parentPort.postMessage(message);
require('cstimer_module');
parentPort.on('message', (data) => self.onmessage({ data }));
```

- [ ] **Step 2: Write the failing test**, `test/scrambler.test.js`

```js
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { createScrambler } from '../js/scrambler.js';

// A browser-shaped face on a Node worker running the real cstimer_module.
const thread = new Worker(new URL('./helpers/cstimer-worker.cjs', import.meta.url));
const worker = {
  postMessage: (message) => thread.postMessage(message),
  set onmessage(handler) {
    thread.on('message', (data) => handler({ data }));
  },
};
after(() => thread.terminate());

const scrambler = createScrambler(worker);
const MOVE = /^[URFDLB]['2]?$/;

test('next() returns a trimmed, legal 3x3x3 scramble and its SVG preview', async () => {
  const { scramble, svg } = await scrambler.next();
  assert.equal(scramble, scramble.trim());
  assert.ok(scramble.split(' ').every((move) => MOVE.test(move)), scramble);
  assert.ok(scramble.split(' ').length >= 15, scramble);
  assert.match(svg, /^<svg /);
});

test('concurrent requests each get their own answer', async () => {
  const [a, b] = await Promise.all([scrambler.next(), scrambler.next()]);
  assert.notEqual(a.scramble, b.scramble);
});

test('image() draws the preview for a given scramble', async () => {
  const { scramble, svg } = await scrambler.image("R U R'");
  assert.equal(scramble, "R U R'");
  assert.match(svg, /^<svg /);
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `node --test test/scrambler.test.js`
Expected: FAIL with `Cannot find module` for `js/scrambler.js`.

- [ ] **Step 4: Write `js/scrambler.js`**

```js
// Client for cstimer_module running as a WebWorker (system design §3, "Scrambles"). The worker
// answers each [id, type, details] message with [id, type, result].
export function createScrambler(worker) {
  const waiting = new Map();
  let lastId = 0;
  worker.onmessage = (event) => {
    const [id, , result] = event.data;
    waiting.get(id)?.(result);
    waiting.delete(id);
  };

  function call(type, details) {
    lastId += 1;
    const id = lastId;
    return new Promise((resolve) => {
      waiting.set(id, resolve);
      worker.postMessage([id, type, details]);
    });
  }

  // The preview of a given scramble: { scramble, svg }.
  async function image(scramble) {
    return { scramble, svg: await call('image', [scramble, '333']) };
  }

  return {
    // A new random-state 3x3x3 scramble and its preview. csTimer's text can end in a space.
    async next() {
      return image((await call('scramble', ['333'])).trim());
    },
    image,
  };
}
```

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: `ℹ pass 139`, `ℹ fail 0`, `ℹ skipped 0`.

- [ ] **Step 6: Commit**

```bash
git add js/scrambler.js test/helpers/cstimer-worker.cjs test/scrambler.test.js
git commit -m "Add the client for the cstimer_module scramble worker"
```

---

### Task 17: The two windows, and a browser smoke test

The operator window wires the core to the browser. It publishes a snapshot on every event, and also
when a verdict ends and when the standings update, which happen on time rather than on a mat packet
(UI spec §7.5). The audience window renders snapshots. Both views are debug scaffolding (see Scope):
the audience's shows the verdict only as a field of the snapshot. The smoke test drives both windows in headless Chrome over the
DevTools protocol, with no dependencies. It needs `google-chrome` on the `PATH`, or `CHROME` set to a
Chrome binary. If neither exists, stop and ask the user.

**Files:**
- Create: `test/browser/smoke.js`
- Modify: `package.json` (add the `smoke` script)
- Create: `index.html`, `audience.html`, `css/debug.css`
- Create: `js/ui/operator.js`, `js/ui/operator-debug-view.js`, `js/ui/audience.js`, `js/ui/audience-debug-view.js`

- [ ] **Step 1: Write the smoke test**, `test/browser/smoke.js`

```js
// Browser smoke test: drives the operator window on the mock mat, with the audience window open,
// through headless Chrome over the DevTools protocol. No dependencies beyond Chrome and Node 24.
//   npm run smoke            (CHROME=/path/to/chrome to override the binary)
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStaticServer } from '../../serve.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const DEBUG_PORT = 9333;

const server = createStaticServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://localhost:${server.address().port}`;
const profile = mkdtempSync(join(tmpdir(), 'ctd-chrome-'));
const chrome = spawn(process.env.CHROME ?? 'google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
process.on('exit', () => chrome.kill()); // also when a check throws

async function finish(code) {
  server.close();
  chrome.kill();
  await once(chrome, 'exit');
  rmSync(profile, { recursive: true, force: true });
  process.exit(code);
}

for (let i = 0; i < 50; i += 1) {
  try {
    await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    break;
  } catch {
    await sleep(200);
  }
}

async function openTab(url) {
  const target = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${url}`, { method: 'PUT' })).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  let lastId = 0;
  const waiting = new Map();
  const errors = [];
  socket.addEventListener('message', (e) => {
    const message = JSON.parse(e.data);
    waiting.get(message.id)?.(message);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description);
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    lastId += 1;
    waiting.set(lastId, resolve);
    socket.send(JSON.stringify({ id: lastId, method, params }));
  });
  await send('Runtime.enable');
  const KEYS = { ' ': ['Space', 32], n: ['KeyN', 78], d: ['KeyD', 68], u: ['KeyU', 85], r: ['KeyR', 82] };
  return {
    send,
    errors,
    close: () => socket.close(),
    closeTab: () => fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${target.id}`),
    evaluate: async (expression) =>
      (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value,
    async press(key) {
      const [code, keyCode] = KEYS[key];
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, text: key, windowsVirtualKeyCode: keyCode });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
    },
  };
}

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
}

const text = (tab, id) => tab.evaluate(`document.getElementById('${id}')?.textContent ?? document.body.innerText`);
const phase = async (tab) => (await text(tab, 'status')).match(/phase\s+(\w+)/)?.[1];
const play = (tab, name) => tab.evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent === '${name}').click()`);
const snapshot = async (tab) => JSON.parse(await text(tab, 'snapshot'));

// Real mode first, alone: it must load cleanly and offer the connect control. It never touches the
// microphone until that button is clicked.
const real = await openTab(`${base}/`);
await sleep(1500);
check('real mode loads and offers "Connect mat"', await real.evaluate("[...document.querySelectorAll('button')].some((b) => b.textContent === 'Connect mat')"));
check('real mode has no uncaught errors', real.errors.length === 0, real.errors.join(' | '));
await real.closeTab();
await sleep(500); // closing the tab releases its operator lock

// A hidden tab's timers are throttled, which would stall the mock mat, so the operator stays in
// front. The audience only reacts to messages and works from behind.
const operator = await openTab(`${base}/?driver=mock`);
await sleep(1500);
const audience = await openTab(`${base}/audience.html`);
await operator.send('Page.bringToFront');
await sleep(800);

check('operator starts in STANDBY', (await phase(operator)) === 'STANDBY');
check('an audience window opened late catches up', (await snapshot(audience)).phase === 'STANDBY');

await operator.press('n');
await sleep(2000);
const scramble = await text(operator, 'scramble');
check('N calls the first university, with a scramble', (await phase(operator)) === 'SCRAMBLE' && scramble.length > 20, scramble);
check('the audience gets the cube preview', await audience.evaluate("!!document.querySelector('#cube svg')"));

await play(operator, 'reset');
await sleep(400);
check('mat at 0.00 → ARMED', (await phase(operator)) === 'ARMED');
check('the audience clock waits at 15', (await text(audience, 'clock')) === '15');

await operator.press(' ');
await sleep(1300);
const countdown = await text(audience, 'clock');
check('Space starts the countdown on the audience', ['14', '13'].includes(countdown), countdown);

await play(operator, 'cleanSolve');
await sleep(2500);
check('the solve starts → RUNNING', (await phase(operator)) === 'RUNNING');
await sleep(8500);
check('the timer stops → PENDING at 8.00', (await phase(operator)) === 'PENDING' && (await text(operator, 'status')).includes('8.00'));
check('the audience clock shows 8.00', (await text(audience, 'clock')) === '8.00');

await operator.press(' ');
await sleep(1500);
check('Space accepts → attempt 2', (await text(operator, 'status')).includes('attempt 2 of 3'));
check('the audience is shown the verdict', (await snapshot(audience)).verdict?.kind === 'OK');
await sleep(2000);
const after = await snapshot(audience);
check('the verdict ends after 3 s, and the standings wait to update', after.verdict === null
  && after.standingsBefore?.length === 0 && after.standings.length === 1);
await operator.press('u');
await sleep(300);
check('U reopens PENDING', (await phase(operator)) === 'PENDING');
await operator.press('d');
await sleep(300);
check('D records a DNF', (await text(operator, 'table')).includes('DNF'));

const mockLog = await operator.evaluate("localStorage.getItem('cube-tournament-display:attempts:v1:mock')");
check('the attempt is saved under the mock key', JSON.parse(mockLog).attempts.length === 1);
check('the real event key is untouched', (await operator.evaluate("localStorage.getItem('cube-tournament-display:attempts:v1')")) === null);

const second = await openTab(`${base}/?driver=mock`);
await sleep(1200);
check('a second operator window refuses', (await second.evaluate('document.body.innerText')).includes('Another operator window'));
second.close();

await operator.send('Page.bringToFront');
await operator.send('Page.reload');
await sleep(1500);
check('a reload asks: resume or start fresh', (await operator.evaluate('document.body.innerText')).includes('1 recorded attempts'));
await operator.press('r');
await sleep(800);
check('R resumes with the recorded attempt', (await text(operator, 'table')).includes('DNF'));

check('no uncaught errors in either window', operator.errors.length + audience.errors.length === 0,
  [...operator.errors, ...audience.errors].join(' | '));

operator.close();
audience.close();
console.log(failures === 0 ? '\nsmoke: all checks passed' : `\nsmoke: ${failures} failed`);
await finish(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Add the script** to `package.json`, directly after the `"test"` line:

```json
    "smoke": "node test/browser/smoke.js",
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npm run smoke`
Expected: it fails, either with `FAIL` lines or with an error, because neither window exists yet.

- [ ] **Step 4: Write the two pages and the debug stylesheet**

`index.html`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Operador · Reto del Cubo</title>
    <link rel="stylesheet" href="css/debug.css">
  </head>
  <body>
    <main id="operator"></main>
    <!-- Classic scripts, in this order: the shim supplies the globals the unmodified decoder expects. -->
    <script src="js/drivers/shim.js"></script>
    <script src="vendor/stackmat.js"></script>
    <script type="module" src="js/ui/operator.js"></script>
  </body>
</html>
```

`audience.html`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Reto del Cubo</title>
    <link rel="stylesheet" href="css/debug.css">
  </head>
  <body>
    <main id="audience"></main>
    <script type="module" src="js/ui/audience.js"></script>
  </body>
</html>
```

`css/debug.css`:

```css
/* Debug views only. The designed screens bring their own tokens (UI spec §2.2). */
body { margin: 0; padding: 16px; background: #02010c; color: #e8e6ff; font: 14px/1.5 ui-monospace, monospace; }
pre { margin: 0 0 16px; white-space: pre-wrap; }
button, select { margin: 0 6px 12px 0; font: inherit; }
a { color: #aba6f7; }
.error { color: #ee2737; }
.scramble { font-size: 28px; line-height: 1.3; color: #fff; }
.clock { margin: 0; font-size: 96px; font-weight: 800; color: #fff; }
.cube svg { width: 240px; height: auto; }
```

- [ ] **Step 5: Write the operator's debug view**, `js/ui/operator-debug-view.js`

```js
// Debug rendering for the operator window until screen 10 (OPERATOR PANEL) is designed. It shows
// every value the panel will need as plain text; nothing about layout is decided here.
import { attemptsFor } from '../core/event-model.js';
import { formatMs } from '../core/format.js';
import { suggestedPenalty } from '../core/inspection.js';
import { effectiveMs, standings } from '../core/scoring.js';

const HELP = 'N next university · ←/→ skip · Space: start inspection (ARMED) / accept (PENDING) · '
  + 'Esc cancel inspection · D DNF · 2 +2 · R redo · U undo last result';

export function createOperatorView(root, { mock, scenarios, onScenario, onConnect, listDevices }) {
  root.innerHTML = `
    <div id="controls"></div>
    <p class="error" id="error"></p>
    <pre id="status"></pre>
    <p class="scramble" id="scramble"></p>
    <pre id="table"></pre>
    <p>Export: <a id="export-json" download="reto-del-cubo.json">JSON</a> ·
       <a id="export-csv" download="reto-del-cubo.csv">CSV</a></p>
    <pre>${HELP}</pre>`;
  const byId = (id) => root.querySelector(`#${id}`);
  const controls = byId('controls');

  if (mock) {
    for (const name of scenarios) {
      const button = document.createElement('button');
      button.textContent = name;
      button.addEventListener('click', () => {
        button.blur(); // Space and Enter belong to the operator's keys, not to a focused button
        onScenario(name);
      });
      controls.append(button);
    }
  } else {
    const select = document.createElement('select');
    const connect = document.createElement('button');
    connect.textContent = 'Connect mat';
    const refreshDevices = async () => {
      const devices = await listDevices();
      select.replaceChildren(...devices.map(([id, label]) => new Option(label, id)));
    };
    select.addEventListener('change', () => select.blur());
    connect.addEventListener('click', async () => {
      connect.blur();
      byId('error').textContent = '';
      try {
        await onConnect(select.value || undefined);
        connect.textContent = 'Reconnect';
      } catch (err) {
        byId('error').textContent = err.message;
      }
      await refreshDevices(); // device labels appear only once permission is granted
    });
    controls.append(select, connect);
    refreshDevices();
  }

  let urls = [];
  return {
    setExports(json, csv) {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls = [
        URL.createObjectURL(new Blob([json], { type: 'application/json' })),
        URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      ];
      byId('export-json').href = urls[0];
      byId('export-csv').href = urls[1];
    },
    render(state, snapshot, now) {
      byId('status').textContent = statusLines(state, snapshot, now).join('\n');
      byId('scramble').textContent = snapshot.scramble ?? '';
      byId('table').textContent = tableLines(state.event).join('\n');
    },
  };
}

const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;

function statusLines(state, snapshot, now) {
  const { mat } = state;
  const { competitor: team, result } = snapshot;
  return [
    `phase       ${state.phase}${state.signalOn ? '' : '   (no signal)'}`,
    `university  ${team ? `${team.university}${team.participant ? ` · ${team.participant}` : ''}`
      + ` · attempt ${state.attemptNo} of ${snapshot.attemptsPerCompetitor}` : '—'}`,
    `header      UNIVERSIDAD ${snapshot.startedCount} / ${snapshot.teams.length}`,
    `mat         ${mat ? `${JSON.stringify(mat.signalHeader)} ${formatMs(mat.time_milli)}`
      + `${mat.running ? ' running' : ''} · noise ${mat.noise.toFixed(2)}` : 'no packets yet'}`,
    `inspection  ${inspectionText(state, now)}`,
    `pending     ${state.phase === 'PENDING'
      ? `${formatMs(state.pendingMs)} · suggested penalty: ${suggestedPenalty(state.inspectionMs) ?? 'none'}` : '—'}`,
    `result      ${result ? `${result.teamId} · best ${result.bestMs === null ? '—' : formatMs(result.bestMs)}`
      + ` · position ${result.position ?? '—'}` : '—'}`,
  ];
}

function inspectionText(state, now) {
  if (state.phase === 'ARMED') {
    return state.inspectionStartedAt === null ? 'not started (Space)' : `${seconds(now - state.inspectionStartedAt)} (Esc cancels)`;
  }
  return state.inspectionMs === null ? '—' : `${seconds(state.inspectionMs)} used`;
}

function tableLines(event) {
  return standings(event).map((row) => {
    const team = event.config.teams.find((t) => t.id === row.teamId);
    const times = attemptsFor(event, row.teamId)
      .map((a) => (a.status === 'DNF' ? 'DNF' : `${formatMs(effectiveMs(a))}${a.penalty ? '+' : ''}`));
    const best = row.bestMs === null ? '—' : formatMs(row.bestMs);
    return `${String(row.position ?? '·').padStart(2)}  ${team.university.padEnd(10)} ${row.group.padEnd(9)} ${best.padStart(8)}   ${times.join('  ')}`;
  });
}
```

- [ ] **Step 6: Write the operator window**, `js/ui/operator.js`

```js
// Operator window: owns the mat driver, the event state, persistence and the only getUserMedia call
// (system design §3). The competitive logic is the pure core; this file wires it to the browser.
// `?driver=mock` swaps the mat for the scripted scenarios.
import { loadConfig } from '../config.js';
import { claimOperator, createPublisher } from '../core/channel.js';
import { toCSV, toJSON } from '../core/export.js';
import { commandForKey } from '../core/keymap.js';
import { createState, reduce } from '../core/run-state.js';
import { STANDINGS_UPDATE_MS, VERDICT_MS, buildSnapshot } from '../core/snapshot.js';
import { STORAGE_KEY, createStore } from '../core/store.js';
import { createMockDriver } from '../drivers/mock.js';
import { createRealDriver } from '../drivers/real.js';
import { SCENARIOS } from '../drivers/scenarios.js';
import { createScrambler } from '../scrambler.js';
import { createOperatorView } from './operator-debug-view.js';

const root = document.getElementById('operator');
const mock = new URLSearchParams(location.search).get('driver') === 'mock';
// Mock runs keep their own log, so a rehearsal can never touch a real event's results.
const store = createStore(localStorage, mock ? `${STORAGE_KEY}:mock` : STORAGE_KEY);

async function main() {
  if (!(await claimOperator())) {
    root.textContent = 'Another operator window is already open. Use that one and close this.';
    return;
  }
  const config = await loadConfig();
  run(config, await chooseStart());
}

// Resume or start fresh: always asked, never silent (system design §7).
function chooseStart() {
  const saved = store.load();
  if (saved.status === 'none') return Promise.resolve([]);
  root.textContent = saved.status === 'ok'
    ? `A saved event has ${saved.attempts.length} recorded attempts. Press R to resume or F to start fresh.`
    : 'The saved event cannot be read. Press F to start fresh; the unreadable data is kept under an archive key.';
  return new Promise((resolve) => {
    function onKey(e) {
      const key = e.key.toLowerCase();
      if (key === 'r' && saved.status === 'ok') finish(saved.attempts);
      if (key === 'f') {
        store.archive(Date.now());
        finish([]);
      }
    }
    function finish(attempts) {
      window.removeEventListener('keydown', onKey);
      resolve(attempts);
    }
    window.addEventListener('keydown', onKey);
  });
}

function run(config, attempts) {
  let state = createState(config, attempts);
  let requestedSeq = state.scrambleSeq;
  const publisher = createPublisher();
  const scrambler = createScrambler(new Worker('node_modules/cstimer_module/cstimer_module.js'));
  const driver = mock ? createMockDriver() : createRealDriver();
  const view = createOperatorView(root, {
    mock,
    scenarios: Object.keys(SCENARIOS),
    onScenario: (name) => driver.play(SCENARIOS[name]()),
    onConnect: (deviceId) => driver.start(deviceId),
    listDevices: () => driver.listDevices(),
  });

  function dispatch(action) {
    const previous = state;
    state = reduce(state, action);
    const now = Date.now();
    if (state.event.attempts !== previous.event.attempts) {
      store.save(state.event.attempts);
      view.setExports(toJSON(state.event, now), toCSV(state.event));
    }
    if (state.scrambleSeq !== requestedSeq) requestScramble();
    // The verdict ends and the standings update on time, not on the mat's next packet (UI spec
    // §7.5), so the snapshot is sent again at both moments.
    const decision = state.lastDecision;
    if (decision !== null && decision !== previous.lastDecision) {
      for (const delay of [VERDICT_MS, STANDINGS_UPDATE_MS]) setTimeout(() => dispatch({ type: 'render' }), decision.at + delay - now);
    }
    const snapshot = buildSnapshot(state, now);
    publisher.publish(snapshot);
    view.render(state, snapshot, now);
  }

  function requestScramble() {
    const seq = state.scrambleSeq;
    requestedSeq = seq;
    const job = state.scramble === null ? scrambler.next() : scrambler.image(state.scramble);
    job.then(({ scramble, svg }) => dispatch({ type: 'scramble', seq, scramble, svg }));
  }

  driver.onState((matState) => dispatch({ type: 'mat', state: matState, at: Date.now() }));

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const command = commandForKey(e.key, state.phase);
    if (command === null) return;
    e.preventDefault();
    dispatch({ type: 'command', command, at: Date.now() });
  });

  // Closing the window mid-event asks first (system design §8). Not in mock mode, which is never a
  // live event.
  if (!mock) {
    window.addEventListener('beforeunload', (e) => {
      if (state.event.attempts.length > 0 || state.phase !== 'STANDBY') e.preventDefault();
    });
  }

  view.setExports(toJSON(state.event, Date.now()), toCSV(state.event));
  if (mock) driver.start();
  dispatch({ type: 'render' }); // first render and first snapshot
}

main();
```

- [ ] **Step 7: Write the audience window**, `js/ui/audience-debug-view.js` and `js/ui/audience.js`

```js
// Debug rendering for the audience window until the designed screens replace it (UI spec §3–§5).
import { formatMs } from '../core/format.js';
import { inspectionDisplay } from '../core/inspection.js';

export function createAudienceView(root) {
  root.innerHTML = `
    <p class="clock" id="clock"></p>
    <div class="cube" id="cube"></div>
    <pre id="snapshot">Waiting for the operator window…</pre>`;
  const byId = (id) => root.querySelector(`#${id}`);
  return {
    render(snapshot) {
      byId('clock').textContent = clockText(snapshot);
      byId('cube').innerHTML = snapshot.scrambleSvg ?? ''; // SVG from our own scramble worker
      const { scrambleSvg, teams, ...rest } = snapshot;
      byId('snapshot').textContent = JSON.stringify(rest, null, 2);
    },
  };
}

// What the clock will read: the inspection countdown in ARMED (UI spec §5.2), the time in RUNNING
// and PENDING.
function clockText(snapshot) {
  if (snapshot.phase === 'ARMED') return snapshot.inspectionMs === null ? '15' : inspectionDisplay(snapshot.inspectionMs);
  return snapshot.displayMs === null ? '' : formatMs(snapshot.displayMs);
}
```

```js
// Audience window: renders the operator's latest snapshot and holds no state of its own.
import { createSubscriber } from '../core/channel.js';
import { createAudienceView } from './audience-debug-view.js';

const view = createAudienceView(document.getElementById('audience'));
createSubscriber((snapshot) => view.render(snapshot));
```

- [ ] **Step 8: Run the smoke test**

Run: `npm run smoke`
Expected, in this order, then exit code 0:

```
PASS  real mode loads and offers "Connect mat"
PASS  real mode has no uncaught errors
PASS  operator starts in STANDBY
PASS  an audience window opened late catches up
PASS  N calls the first university, with a scramble  (<a scramble>)
PASS  the audience gets the cube preview
PASS  mat at 0.00 → ARMED
PASS  the audience clock waits at 15
PASS  Space starts the countdown on the audience  (14)
PASS  the solve starts → RUNNING
PASS  the timer stops → PENDING at 8.00
PASS  the audience clock shows 8.00
PASS  Space accepts → attempt 2
PASS  the audience is shown the verdict
PASS  the verdict ends after 3 s, and the standings wait to update
PASS  U reopens PENDING
PASS  D records a DNF
PASS  the attempt is saved under the mock key
PASS  the real event key is untouched
PASS  a second operator window refuses
PASS  a reload asks: resume or start fresh
PASS  R resumes with the recorded attempt
PASS  no uncaught errors in either window

smoke: all checks passed
```

If a check stalls after `mat at 0.00`, the operator tab has gone to the background. Chrome throttles
a hidden tab's timers, and that stops the mock mat. The script keeps the operator tab in front for
this reason. On the day this cannot happen: the two windows are separate and both visible, and the
real mat's audio callback is not throttled.

- [ ] **Step 9: Run the unit suite again**

Run: `npm test`
Expected: `ℹ pass 139`, `ℹ fail 0`. The smoke script is not a `*.test.js` file, so `npm test` does
not pick it up.

- [ ] **Step 10: Commit**

```bash
git add package.json test/browser/smoke.js index.html audience.html css/debug.css js/ui/operator.js js/ui/operator-debug-view.js js/ui/audience.js js/ui/audience-debug-view.js
git commit -m "Add the operator and audience windows with debug views, and a browser smoke test"
```

---

### Task 18: Documentation

**Files:**
- Modify: `README.md`, `ROADMAP.md`, `vendor/PROVENANCE.md`

- [ ] **Step 1: Update the README status.** Replace

```markdown
> **Status:** design complete, implementation not started.
> See [`docs/superpowers/specs/`](docs/superpowers/specs/) for the system design.
```

with

```markdown
> **Status:** the engine runs: run loop, scoring, both StackMat drivers, persistence and window
> sync, with plain-text debug views. The designed screens come next.
> See [`docs/superpowers/specs/`](docs/superpowers/specs/) for the designs.
```

- [ ] **Step 2: Add a "Running it" section** to the README, between the end of the "Hardware"
section and the `---` line above "Licence":

````markdown
## Running it

You need Node 24.2 or newer, and Chrome.

```sh
npm install          # cstimer_module, the scramble generator
npm test             # the core, the drivers and the server; no browser needed
npm run smoke        # both windows in headless Chrome, on the mock mat
npm start            # serves http://localhost:8080
```

Open the operator window at `http://localhost:8080/` and the audience window at
`http://localhost:8080/audience.html`, then drag the audience window to the projector. To rehearse
without a mat, add `?driver=mock` to the operator URL. The mock keeps its own saved results.

`config/event.json` is generated from the CTF database with `npm run gen-event`. Participant names go
in `config/participants.local.json`, as `{ "uce": "José Martínez" }`. Git ignores that file.
````

- [ ] **Step 3: Record what was built** in `ROADMAP.md`. Directly below the Phase 2 table (above the
`---` that precedes `## Risks to clear before October`), add:

```markdown
**Built by the engine plan** (`docs/superpowers/plans/2026-09-18-tournament-engine.md`): rows 0–4 and
8, and row 5's key loop without its panel layout. Plain-text debug views stand in for screens 1–10.
`npm test` covers the core and the drivers; `npm run smoke` covers both windows on the mock mat.
```

- [ ] **Step 4: Note how the browser gets `cstimer_module`.** In `vendor/PROVENANCE.md`, replace

```markdown
- **`cstimer_module`** — installed from npm (`cstimer_module@0.1.5`), not copied into the tree.
```

with

```markdown
- **`cstimer_module`** — installed from npm (`cstimer_module@0.1.5`), not copied into the tree.
  `serve.js` serves it to the browser from `node_modules/cstimer_module/`, so run `npm install` first.
```

- [ ] **Step 5: Commit**

```bash
git add README.md ROADMAP.md vendor/PROVENANCE.md
git commit -m "Document running the engine and record what it built"
```

---

## Spec coverage

| Requirement | Where |
|---|---|
| Roster generated from `init.sql` (system design §1) | Task 2 |
| No build step, served over `http://localhost` (§3, §12) | Task 1 |
| `vendor/stackmat.js` unmodified; globals from `shim.js` (§3 invariant 1) | Task 13 |
| Exactly one `getUserMedia` call, in the operator window (§3 invariant 2) | Tasks 13, 17 |
| `core/` pure, runs under `node --test` (§3 invariant 3) | Tasks 3–11, 14 |
| Scrambles from `cstimer_module` in a WebWorker (§3) | Task 16 |
| Driver interface; drivers interchangeable (§4) | Tasks 12, 13 |
| Snapshot (§4, UI §4.4, UI §5.5, UI §7.6) | Task 11 |
| Mat-driven transitions, the non-zero guard (§5) | Task 8 |
| Operator keys, the PENDING gate, auto-arming (§5) | Tasks 9, 10 |
| Data model, best of 3, `+2`, DNF, unranked, tie-breaks, time format (§6) | Tasks 3, 5, 6 |
| Save every result, resume or start fresh, export JSON and CSV (§7) | Tasks 14, 17 |
| Failures: permission denied, signal lost, reset mid-solve, mat bump, over cutoff, tab closed, audience closed, two operator windows (§8) | Tasks 8, 12, 13, 15, 17 |
| Core tests and mock scenario replays (§9) | Tasks 5, 6, 8, 9, 12 |
| Standings rule and audience slice (UI §4.3) | Task 6 |
| `UNIVERSIDAD {n}` counting (UI §4.2) | Tasks 5, 11 |
| Inspection: rule, core functions, run state, attempt record (UI §5.1, §5.4) | Tasks 4, 8, 9 |
| Inspection tests and scenarios (UI §5.8) | Tasks 4, 8, 12 |
| Operator sees the suggested penalty with `inspectionMs` (UI §5.6) | Task 17 (debug view) |
| RUNNING's cutoff, `formatCutoff` (UI §6.4) | Task 3 |
| The last decision, its DNF reason, and what ends it (UI §7.5) | Task 9; decision 13 |
| `verdict` and `standingsBefore` in the snapshot, `VERDICT_MS` and `STANDINGS_UPDATE_MS` (UI §7.5–§7.6) | Task 11 |
| Verdict scenarios: a clean solve then each key, a cutoff overrun then D, a late start then D (UI §7.9) | Task 12 |
| The verdict ends and the standings update on time, not on the next packet (UI §7.5) | Task 17; `npm run smoke` |

**Deferred with reasons** (see Scope): the device picker's final form and the signal-health meter
(screens 9 and 10; the debug view has a plain device list and shows `noise`), packets per second and
the signal-check screen (screen 8), and hardware validation (roadmap row 10).
