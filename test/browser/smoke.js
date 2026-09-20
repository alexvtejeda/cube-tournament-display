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
  const KEYS = {
    ' ': ['Space', 32], n: ['KeyN', 78], d: ['KeyD', 68], u: ['KeyU', 85], r: ['KeyR', 82],
    s: ['KeyS', 83], Escape: ['Escape', 27],
  };
  return {
    send,
    errors,
    close: () => socket.close(),
    closeTab: () => fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${target.id}`),
    evaluate: async (expression) =>
      (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value,
    async press(key) {
      const [code, keyCode] = KEYS[key];
      // `text` is the character the key types, so only a printable key has one. Sending "Escape"
      // as text makes Chrome drop the keydown entirely, and the page never hears the key.
      const text = key.length === 1 ? { text: key } : {};
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, ...text, windowsVirtualKeyCode: keyCode });
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

// ── SIGNAL CHECK (operator spec §3.1) ────────────────────────────────────────────────────────
const hidden = () => operator.evaluate("document.getElementById('signal-check').hidden");
await operator.press('n');
await sleep(2000);
check('a university is up again', (await phase(operator)) === 'SCRAMBLE');
const scrambleBefore = await text(operator, 'scramble');
const audienceBefore = (await snapshot(audience)).phase;

await operator.press('s');
await sleep(700);
check('S opens the check', (await hidden()) === false);
check('the check names the mat it is listening to', (await text(operator, 'sc-chain')).includes('Mock mat'));

await play(operator, 'cleanSolve');
await sleep(4000);
check('a whole solve at the mat reaches neither the event nor the room',
  (await phase(operator)) === 'SCRAMBLE' && (await snapshot(audience)).phase === audienceBefore);
check('but the check hears it', (await text(operator, 'sc-clock')) !== '—');
check('and its test ticks', !(await text(operator, 'sc-chain')).includes('0 de 6'));

await operator.press('s');
await sleep(500);
check('S returns to the event where it left it', (await hidden()) === true && (await phase(operator)) === 'SCRAMBLE');
check('with the same scramble', (await text(operator, 'scramble')) === scrambleBefore);

await play(operator, 'reset');
await sleep(500);
check('the mat arms again once the check is closed', (await phase(operator)) === 'ARMED');

await operator.press('s');
await sleep(600);
check('opening the check from ARMED steps back to Mezcla, keeping the scramble',
  (await phase(operator)) === 'SCRAMBLE' && (await text(operator, 'scramble')) === scrambleBefore);
await operator.press('Escape');
await sleep(400);
check('Esc closes it too', (await hidden()) === true);

check('no uncaught errors in either window', operator.errors.length + audience.errors.length === 0,
  [...operator.errors, ...audience.errors].join(' | '));

operator.close();
audience.close();
console.log(failures === 0 ? '\nsmoke: all checks passed' : `\nsmoke: ${failures} failed`);
await finish(failures === 0 ? 0 : 1);
