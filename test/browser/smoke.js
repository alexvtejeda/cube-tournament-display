// Browser smoke test: drives the operator window on the mock mat, with the audience window open,
// through headless Chrome.
//   npm run smoke            (CHROME=/path/to/chrome to override the binary)
import { sleep, startHarness, waitFor } from './harness.js';

const { base, openTab, check, finish } = await startHarness(9333);

// Always a string: a poll can evaluate before the document exists, where `document.body` is still
// null and Runtime.evaluate yields nothing. Returning '' lets a predicate say "not ready yet"
// instead of throwing.
const text = async (tab, id) =>
  String((await tab.evaluate(`document.getElementById('${id}')?.textContent ?? document.body?.innerText`)) ?? '');
const phase = async (tab) => (await text(tab, 'status')).match(/phase\s+(\w+)/)?.[1];
const play = (tab, name) => tab.evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent === '${name}').click()`);
const screen = (tab) => tab.evaluate("document.getElementById('stage').dataset.screen");
// The audience window loads the maze before it listens, so it can take a moment to draw at all.
const firstScreen = async (tab) => {
  for (let i = 0; i < 25 && (await screen(tab)) === 'waiting'; i += 1) await sleep(200);
  return screen(tab);
};
const soloClock = (tab) => tab.evaluate("document.querySelector('.solo .digits')?.textContent");
const soloStatus = (tab) => tab.evaluate("document.querySelector('.solo .status')?.textContent");
const filledSlots = (tab) => tab.evaluate("document.querySelectorAll('.side .row:not(.empty)').length");

// Real mode first, alone: it must load cleanly and offer the connect control. It never touches the
// microphone until that button is clicked.
const real = await openTab(`${base}/`);
const offersConnect = "[...document.querySelectorAll('button')].some((b) => b.textContent === 'Connect mat')";
await waitFor(() => real.evaluate(offersConnect), { what: 'real mode to offer "Connect mat"' });
check('real mode loads and offers "Connect mat"', await real.evaluate(offersConnect));
check('real mode has no uncaught errors', real.errors.length === 0, real.errors.join(' | '));
await real.closeTab();
await sleep(500); // closing the tab releases its operator lock

// A hidden tab's timers are throttled, which would stall the mock mat, so the operator stays in
// front. The audience only reacts to messages and works from behind.
const operator = await openTab(`${base}/?driver=mock`);
await waitFor(async () => (await phase(operator)) !== undefined, { what: 'the operator window to report a phase' });
const audience = await openTab(`${base}/audience.html`);
await operator.send('Page.bringToFront');
await sleep(800);

check('operator starts in STANDBY', (await phase(operator)) === 'STANDBY');
check('an audience window opened late catches up: ATTRACT', (await firstScreen(audience)) === 'attract');

await operator.press('n');
await sleep(2000);
const scramble = await text(operator, 'scramble');
check('N calls the first university, with a scramble', (await phase(operator)) === 'SCRAMBLE' && scramble.length > 20, scramble);
check('the audience shows Mezcla with the cube preview', (await screen(audience)) === 'mezcla'
  && await audience.evaluate("!!document.querySelector('.net svg')"));

await play(operator, 'reset');
await sleep(400);
check('mat at 0.00 → ARMED', (await phase(operator)) === 'ARMED');
check('the audience clock waits at 15', (await soloClock(audience)) === '15');

await operator.press(' ');
await sleep(1300);
const countdown = await soloClock(audience);
check('Space starts the countdown on the audience', ['14', '13'].includes(countdown), countdown);

await play(operator, 'cleanSolve');
await sleep(2500);
check('the solve starts → RUNNING', (await phase(operator)) === 'RUNNING');
await sleep(8500);
check('the timer stops → PENDING at 8.00', (await phase(operator)) === 'PENDING' && (await text(operator, 'status')).includes('8.00'));
check('the audience shows PENDING at 8.00', (await screen(audience)) === 'pending' && (await soloClock(audience)) === '8.00');

// This key is both a readiness point and the moment the verdict's 3 s on screen begin. Poll for the
// accept instead of assuming a fixed wait, then hold the rest of the original budget: the two sleeps
// below measure the verdict's real VERDICT_MS and the standings' STANDINGS_UPDATE_MS from this key.
const acceptedAt = Date.now();
await operator.press(' ');
await waitFor(async () => (await text(operator, 'status')).includes('attempt 2 of 3'),
  { what: 'the operator to record the attempt' });
await sleep(Math.max(0, 1500 - (Date.now() - acceptedAt)));
check('Space accepts → attempt 2', (await text(operator, 'status')).includes('attempt 2 of 3'));
check('the audience is shown the verdict', (await screen(audience)) === 'pending' && (await soloStatus(audience)) === 'TIEMPO VÁLIDO');
await sleep(2000);
check('the verdict ends after 3 s, and the standings wait to update', (await screen(audience)) === 'mezcla'
  && (await filledSlots(audience)) === 0);
await sleep(1000);
check('the standings update after the screen change', (await filledSlots(audience)) === 1);
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
const resumePrompt = async () => String((await operator.evaluate('document.body.innerText')) ?? '').includes('1 recorded attempts');
await waitFor(resumePrompt, { what: 'the reloaded operator window to ask: resume or start fresh' });
check('a reload asks: resume or start fresh', await resumePrompt());
await operator.press('r');
await sleep(800);
check('R resumes with the recorded attempt', (await text(operator, 'table')).includes('DNF'));

// ── SIGNAL CHECK (operator spec §3.1) ────────────────────────────────────────────────────────
const hidden = () => operator.evaluate("document.getElementById('signal-check').hidden");
await operator.press('n');
await sleep(2000);
check('a university is up again', (await phase(operator)) === 'SCRAMBLE');
const scrambleBefore = await text(operator, 'scramble');
const audienceBefore = await screen(audience);

await operator.press('s');
await sleep(700);
check('S opens the check', (await hidden()) === false);
check('the check names the mat it is listening to', (await text(operator, 'sc-chain')).includes('Mock mat'));

await play(operator, 'cleanSolve');
await sleep(4000);
check('a whole solve at the mat reaches neither the event nor the room',
  (await phase(operator)) === 'SCRAMBLE' && (await screen(audience)) === audienceBefore);
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
await finish('smoke');
