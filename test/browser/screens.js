// Renders every designed audience state at 1920×1080 and checks the UI spec's invariants (§2.5,
// §4.8, §5.8, §6.8, §7.9). The snapshots come from the real core and the cube preview from the real
// cstimer_module; they reach the audience window over its BroadcastChannel, as the operator's do.
// Each state is also saved to test/browser/out/ to compare with the approved mockups by eye.
//   npm run screens          (CHROME=/path/to/chrome to override the binary)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import { CHANNEL } from '../../js/core/channel.js';
import { createState, reduce } from '../../js/core/run-state.js';
import { buildSnapshot } from '../../js/core/snapshot.js';
import { packet } from '../../js/drivers/scenarios.js';
import { createScrambler } from '../../js/scrambler.js';
import { attempt, dnf } from '../helpers/fixtures.js';
import { apply, cmd, mat } from '../helpers/actions.js';
import { sleep, startHarness, waitFor } from './harness.js';

const OUT = new URL('./out/', import.meta.url);
mkdirSync(OUT, { recursive: true });

// The mockups' event: the real roster, three participant names, and the longest scramble a
// random-state 3×3 gets (21 moves).
const roster = JSON.parse(readFileSync(new URL('../../config/event.json', import.meta.url), 'utf8'));
const NAMES = { loyola: 'Ana Rodríguez', pucmm: 'Carla Fernández', uce: 'José Martínez' };
const config = { ...roster, teams: roster.teams.map((team) => ({ ...team, participant: NAMES[team.id] ?? '' })) };
// The same event with no names, for the moments where the roster has none.
const unnamed = { ...roster, teams: roster.teams.map((team) => ({ ...team, participant: '' })) };
const SCRAMBLE = "R' U2 B' L' F D' R2 B U' L F2 U2 R2 D B2 D' F2 L2 D2 F2 U";
// The next attempt's scramble, which the band shows from the operator's key (UI spec §7.2).
const NEXT = "F2 D' L2 U R2 B2 U' F2 L2 D R' B L' F D2 R U' B2 L F'";

const thread = new Worker(new URL('../helpers/cstimer-worker.cjs', import.meta.url));
const scrambler = createScrambler({
  postMessage: (message) => thread.postMessage(message),
  set onmessage(handler) { thread.on('message', (data) => handler({ data })); },
});
const { svg } = await scrambler.image(SCRAMBLE);
const { svg: nextSvg } = await scrambler.image(NEXT);
await thread.terminate();

// Ten universities have finished and PUCMM, 9th, is the latest: standby-09-final.html's standings.
const three = (id, bestMs) => [bestMs, bestMs + 9000, bestMs + 17000].map((ms, i) => attempt(id, i + 1, ms));
const allDnf = (id) => [1, 2, 3].map((n) => dnf(id, n));
const earlier = [
  ...three('intec', 84020), ...three('itla', 115880), ...three('unapec', 127310), ...three('unibe', 139040),
  ...three('utesa', 161770), ...three('ucsd', 182150), ...three('uapa', 201400), ...three('unphu', 228600),
  ...three('loyola', 242500), ...allDnf('unicda'),
];
const withScramble = (state) => reduce(state, { type: 'scramble', seq: state.scrambleSeq, scramble: SCRAMBLE, svg });
const next = (state) => withScramble(reduce(state, cmd('next')));

const resultado = createState(config, [...earlier, ...three('pucmm', 235100)]);
const resultadoDnf = createState(config, [...earlier, ...allDnf('pucmm')]);
const mezcla = next(resultado); // UCE, attempt 1
// standby-10-placeholder-rows.html: Loyola first, with nobody ranked; PUCMM fourth, with three ranked.
const mezclaEmpty = next(createState(config));
const mezclaPart = next(createState(config, [...three('loyola', 220100), ...three('intec', 84020), ...three('itla', 115880)]));
// UCE's first attempt was a DNF, so it is on attempt 2 and not in the standings (armed-04-final.html).
const uceFirst = [...earlier, ...three('pucmm', 235100), dnf('uce', 1)];
const armedIn = (cfg) => apply(next(createState(cfg, uceFirst)), mat(packet('I', 0)));
const armed = armedIn(config);
const inspecting = reduce(armed, cmd('startInspection', 0));

const at = (state, now) => buildSnapshot(state, now);
const hands = (header) => mat(packet(header, 0));
const VIOLET = 'rgb(171, 166, 247)';
const WHITE = 'rgb(255, 255, 255)';
const GO = 'rgb(46, 230, 160)';
const RED = 'rgb(238, 39, 55)';
const GOLD = 'rgb(212, 170, 6)';
// [name, snapshot, clock, clock colour, status, status colour] for the eight moments of UI spec §5.2.
const MOMENTS = [
  ['armed-1', at(armed, 0), '15', VIOLET, 'INSPECCIÓN', VIOLET],
  ['armed-2', at(inspecting, 6000), '9', WHITE, 'INSPECCIÓN', VIOLET],
  ['armed-3', at(apply(inspecting, hands('C')), 9000), '6', WHITE, 'MANOS EN POSICIÓN', VIOLET],
  ['armed-4', at(apply(inspecting, hands('A')), 10000), '5', GO, 'LISTO', GO],
  ['armed-5', at(inspecting, 16000), '+2', WHITE, 'INSPECCIÓN', VIOLET],
  ['armed-6', at(apply(inspecting, hands('A')), 16000), '+2', WHITE, 'LISTO', GO],
  ['armed-7', at(inspecting, 18000), 'DNF', WHITE, 'INSPECCIÓN EXCEDIDA', VIOLET],
  ['armed-8', at(apply(armed, hands('A')), 0), '15', GO, 'LISTO', GO],
];
// The six moments of UI spec §6.1, on UCE's attempt 2 (running-06-final.html).
const runningAt = (ms, state = armed) => at(apply(state, mat(packet(' ', ms, true))), 0);
const RUNNING = [
  ['running-1', runningAt(7830), '7.83', WHITE, 'LÍMITE 5:00', VIOLET],
  ['running-2', runningAt(42180), '42.18', WHITE, 'LÍMITE 5:00', VIOLET],
  ['running-3', runningAt(134300), '2:14.30', WHITE, 'LÍMITE 5:00', VIOLET],
  ['running-4', runningAt(300000), '5:00.00', WHITE, 'LÍMITE 5:00', VIOLET],
  ['running-5', runningAt(308520), '5:08.52', RED, 'LÍMITE EXCEDIDO', RED],
  ['running-6', runningAt(192070, armedIn(unnamed)), '3:12.07', WHITE, 'LÍMITE 5:00', VIOLET],
];
// PENDING (§7.1–§7.3), on the same attempt: the review, and each verdict's landed frame.
const stopAt = (ms, state = armed) => apply(state, mat(packet(' ', 100, true)), mat(packet('S', ms)));
const review = stopAt(102180);
const reviewOver = stopAt(308520);
const lateStart = apply(inspecting, mat(packet(' ', 100, true), 18000), mat(packet('S', 102180), 20000));
// A decision at 0, with the next scramble arrived; shown before VERDICT_MS has passed.
const decide = (state, command) => {
  const after = reduce(state, cmd(command, 0));
  return reduce(after, { type: 'scramble', seq: after.scrambleSeq, scramble: NEXT, svg: nextSvg });
};
const decided = (state, command) => at(decide(state, command), 0);
const PENDING = [
  ['pending-review', at(review, 0), '1:42.18', VIOLET, 'EN REVISIÓN', VIOLET],
  ['pending-review-over', at(reviewOver, 0), '5:08.52', RED, 'LÍMITE EXCEDIDO · EN REVISIÓN', RED],
  ['verdict-space', decided(review, 'accept'), '1:42.18', WHITE, 'TIEMPO VÁLIDO', VIOLET],
  ['verdict-2', decided(review, 'plus2'), '1:44.18', WHITE, 'PENALIZACIÓN +2', VIOLET],
  ['verdict-d', decided(review, 'dnf'), 'DNF', WHITE, 'INTENTO INVÁLIDO', VIOLET],
  ['verdict-d-cutoff', decided(reviewOver, 'dnf'), 'DNF', WHITE, 'LÍMITE EXCEDIDO', VIOLET],
  ['verdict-d-inspection', decided(lateStart, 'dnf'), 'DNF', WHITE, 'INSPECCIÓN EXCEDIDA', VIOLET],
  ['verdict-r', decided(review, 'redo'), '0.00', VIOLET, 'ANULADO · SE REPITE', VIOLET],
  ['pending-no-name', at(stopAt(102180, armedIn(unnamed)), 0), '1:42.18', VIOLET, 'EN REVISIÓN', VIOLET],
];

const { base, openTab, check, finish } = await startHarness(9334);
const tab = await openTab(`${base}/audience.html`);
await tab.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

const js = (expression) => tab.evaluate(expression);
// The window is ready once its document has loaded and the stage is on the page. A fixed wait either
// flakes or wastes time, so poll for it.
await waitFor(() => js("document.readyState === 'complete' && !!document.getElementById('stage')"),
  { what: 'the audience window to load' });
// Every screen change the audience animates is recorded: the names on the page before it and after
// it, and the animations it runs (UI spec §2.7). `show` also waits for it to finish, so that no check
// or screenshot catches a change halfway.
await js(`(() => {
  window.changes = [];
  window.transitions = [];
  const start = document.startViewTransition?.bind(document);
  if (!start) return;
  const names = () => [...document.querySelectorAll('*')].map((el) => getComputedStyle(el).viewTransitionName).filter((n) => n !== 'none');
  document.startViewTransition = (update) => {
    const change = { before: names() };
    const transition = start(update);
    window.changes.push(change);
    window.transitions.push(transition);
    transition.ready.then(() => {
      change.after = names();
      change.animations = document.getAnimations().filter((a) => a.effect?.pseudoElement).map((a) => a.effect.pseudoElement + ' ' + a.animationName);
    }, () => {});
    return transition;
  };
})()`);
// Posts a snapshot the way the operator window does.
const post = (snapshot) => js(`(() => {
  const channel = new BroadcastChannel(${JSON.stringify(CHANNEL)});
  channel.postMessage(${JSON.stringify({ type: 'snapshot', snapshot })});
  channel.close();
})()`);
// Posts a snapshot, then waits for the audience to draw it, and for any screen change it animates to
// finish.
const show = async (snapshot, wait = 400) => {
  const started = await js('window.transitions.length');
  await post(snapshot);
  await sleep(wait);
  await js(`Promise.all(window.transitions.slice(${started}).map((t) => t.finished.catch(() => {})))`);
};
const save = async (name) => writeFileSync(new URL(`${name}.png`, OUT), await tab.screenshot());
const textOf = (selector) => js(`document.querySelector(${JSON.stringify(selector)})?.textContent`);
const colorOf = (selector) => js(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).color`);
// Every colour used for text, fills and borders on the visible screen.
const colorsUsed = () => js(`[...document.querySelectorAll('.screen *')].flatMap((el) => {
  const s = getComputedStyle(el);
  return [s.color, s.backgroundColor, s.borderTopColor, s.borderBottomColor, s.borderLeftColor, s.borderRightColor];
})`);
const bandHeight = () => js("document.querySelector('.band').getBoundingClientRect().height");
// Where the solo screens' shared pieces sit: the clock by its top edge and its centre.
const soloLayout = () => js(`(() => {
  const box = (selector) => { const r = document.querySelector(selector).getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); };
  const clock = document.querySelector('.solo .clock').getBoundingClientRect();
  return JSON.stringify({ hdr: box('.hdr'), who: box('.solo .who'), band: box('.band'), clock: [Math.round(clock.top), Math.round(clock.left + clock.width / 2)] });
})()`);
const slots = () => js("[...document.querySelectorAll('.side .row')].map((row) => row.classList.contains('empty') ? 'empty' : 'filled')");

check('WebGL is available, so the maze runs', await js("!!document.createElement('canvas').getContext('webgl')"));
// The font is preloaded and applied the moment it lands (audience.html), so it registers a little
// after the window is up. Poll until it does: every size check below depends on the real font.
const fontLoaded = () => js("document.fonts.load('800 20px roc-grotesk-variable').then(() => document.fonts.check('800 20px roc-grotesk-variable'))");
await waitFor(fontLoaded, { what: 'roc-grotesk to load from Adobe Fonts' }).catch(() => {});
check('roc-grotesk loads from Adobe Fonts', await fontLoaded());

// The audience window listens once its scripts have loaded, and a snapshot posted before then is
// lost, so the first one is posted until it is drawn.
for (let i = 0; i < 50 && (await js("document.getElementById('stage').dataset.screen")) === 'waiting'; i += 1) {
  await post(at(createState(config), 0));
  await sleep(200);
}

// ATTRACT (§3)
await show(at(createState(config), 0), 1500);
await save('attract');
const plates = await js("[...document.querySelectorAll('.attract .plate img')].map((img) => img.getAttribute('src'))");
check('ATTRACT: 13 plates in roster order', JSON.stringify(plates) === JSON.stringify(config.teams.map((t) => `assets/universidades/${t.id}.png`)));

// STANDBY, Resultado (§4)
await show(at(resultado, 0), 1000);
await save('standby-resultado');
check('Resultado: the header counts 11 of 13', (await textOf('.hdr span')) === 'UNIVERSIDAD 11 / 13');
check('Resultado: best time and position', (await textOf('.big')) === '3:55.10' && (await textOf('.sub')) === 'PUESTO 9');
check('Resultado: ranked universities only, capped at 8', JSON.stringify(await slots()) === JSON.stringify(Array(8).fill('filled')));
check('Resultado: the leader row is --gold-text', (await colorOf('.row.lead .u')) === 'rgb(255, 234, 149)');
const resultadoBand = await bandHeight();
check('the band is 10.95cqw tall', Math.abs(resultadoBand / 19.2 - 10.95) < 0.05, `${(resultadoBand / 19.2).toFixed(2)}cqw`);

await show(at(resultadoDnf, 0), 1000);
await save('standby-all-dnf');
check('Resultado, all DNF: a dash and SIN TIEMPO VÁLIDO', (await textOf('.big')) === '—' && (await textOf('.sub')) === 'SIN TIEMPO VÁLIDO');
check('no — in the standings column', !(await textOf('.side')).includes('—'));

// STANDBY, Mezcla (§4)
await show(at(mezcla, 0), 1000);
await save('standby-mezcla');
check('Mezcla: UCE, attempt 1 of 3, with the name', (await textOf('.figure .big')) === '1DE 3' && (await textOf('.main .name')) === 'José Martínez');
check('the band is the same height in Resultado and Mezcla', (await bandHeight()) === resultadoBand);
const scrambleLine = await js(`(() => {
  const range = document.createRange();
  range.selectNodeContents(document.querySelector('.scr'));
  return { lines: range.getClientRects().length, right: range.getBoundingClientRect().right,
    kitty: document.querySelector('.kitty').getBoundingClientRect().left };
})()`);
check('a 21-move scramble stays on one line, clear of the mascot', scrambleLine.lines === 1 && scrambleLine.right < scrambleLine.kitty,
  `ends at ${Math.round(scrambleLine.right)}px, mascot at ${Math.round(scrambleLine.kitty)}px`);
const kittyInBand = await js(`(() => {
  const band = document.querySelector('.band').getBoundingClientRect();
  const kitty = document.querySelector('.kitty').getBoundingClientRect();
  return kitty.top >= band.top && kitty.bottom <= band.bottom && kitty.right <= band.right;
})()`);
check('the mascot sits inside the band', kittyInBand);
check('no --go anywhere on STANDBY', !(await colorsUsed()).includes(GO));

// The standings column always holds 8 slots, filled from the top (§4.2).
await show(at(mezclaEmpty, 0), 1000);
await save('standby-empty');
check('nobody ranked: 8 empty slots', JSON.stringify(await slots()) === JSON.stringify(Array(8).fill('empty')));
await show(at(mezclaPart, 0), 1000);
await save('standby-part');
check('three ranked: 3 filled slots, then 5 empty', JSON.stringify(await slots()) === JSON.stringify([...Array(3).fill('filled'), ...Array(5).fill('empty')]));
const rowHeights = await js("[...document.querySelectorAll('.side .row')].map((row) => row.getBoundingClientRect().height)");
check('an empty slot is as tall as a filled one', rowHeights[1] === rowHeights[3], `${rowHeights[1]}px and ${rowHeights[3]}px`);
check('an empty slot draws its rank in the empty-slot colour', (await colorOf('.row.empty .r')) === 'rgba(171, 166, 247, 0.45)');

// ARMED (§5). Resetting the mat swaps only the body: the header and band are the same elements.
await show(at(mezcla, 0), 1000);
await js("document.querySelector('.band').dataset.kept = 'yes'; document.querySelector('.hdr').dataset.kept = 'yes'");
await show(MOMENTS[0][1], 1000);
check('ARMED keeps the header and band of Mezcla', (await js("document.querySelector('.band').dataset.kept + document.querySelector('.hdr').dataset.kept")) === 'yesyes'
  && (await bandHeight()) === resultadoBand);
const soloMoment = async ([name, snapshot, clock, clockColor, status, statusColor], wait) => {
  await show(snapshot, wait);
  await save(name);
  const shown = [await textOf('.solo .digits'), await colorOf('.solo .clock'), await textOf('.solo .status'), await colorOf('.solo .status')];
  check(`${name}: ${clock} · ${status}`, JSON.stringify(shown) === JSON.stringify([clock, clockColor, status, statusColor]), shown.join(' · '));
  return colorsUsed();
};
for (const moment of MOMENTS) {
  const colors = await soloMoment(moment);
  check(`${moment[0]}: --go only on the green light`, colors.includes(GO) === (moment[1].hands === 'ready'));
  check(`${moment[0]}: no --gold, and no --red`, !colors.includes(GOLD) && !colors.includes(RED));
}
const armedLayout = await soloLayout();
const clockFit = await js(`(() => {
  const clock = document.querySelector('.solo .clock');
  const probe = clock.cloneNode();
  probe.textContent = '4:59.99';
  probe.style.position = 'absolute';
  clock.parentNode.append(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width / 19.2;
})()`);
check('4:59.99 fits at --fs-clock', clockFit < 70, `${clockFit.toFixed(1)}cqw`);

// RUNNING (§6): ARMED's layout, with only the clock's text and colour and the status line changing.
for (const moment of RUNNING) {
  const colors = await soloMoment(moment);
  check(`${moment[0]}: no --go and no --gold`, !colors.includes(GO) && !colors.includes(GOLD));
  if (moment[0] !== 'running-6') check(`${moment[0]}: header, who line, band and clock where ARMED has them`, (await soloLayout()) === armedLayout);
}
await show(runningAt(300010));
check('RUNNING: 5:00.00 is white and 5:00.01 is red', (await colorOf('.solo .clock')) === RED);

// PENDING (§7): RUNNING's layout again, the review, and each verdict's landed frame.
for (const moment of PENDING) {
  const colors = await soloMoment(moment, 1500);
  const redAllowed = moment[0] === 'pending-review-over';
  check(`${moment[0]}: no --go and no --gold${redAllowed ? '' : ', and no --red'}`, !colors.includes(GO) && !colors.includes(GOLD) && (redAllowed || !colors.includes(RED)));
  if (moment[0] !== 'pending-no-name') check(`${moment[0]}: header, who line, band and clock where RUNNING has them`, (await soloLayout()) === armedLayout);
}
await show(decided(review, 'accept'));
check('the verdict shows the attempt it decided, and the next scramble', (await textOf('.solo .who b')) === '2' && (await textOf('.scr')) === NEXT);

// The maze (§2.5): live on ARMED; frozen from the solve until the verdict ends; live again after.
const mazeMoves = async () => {
  const before = await tab.screenshot();
  await sleep(700);
  return !before.equals(await tab.screenshot());
};
// The share of lit pixels in the bottom-right quarter of the maze, with the screen and its shade
// hidden for the moment so that only the maze is drawn. The page cannot read its own WebGL canvas, so
// it decodes a screenshot instead.
const mazeLit = async () => {
  await js("for (const el of document.querySelectorAll('.shade, .screen')) el.style.visibility = 'hidden'");
  const shot = await tab.screenshot();
  await js("for (const el of document.querySelectorAll('.shade, .screen')) el.style.visibility = ''");
  return js(`new Promise((resolve) => {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(image.width / 2, image.height * 0.6, image.width / 2, image.height * 0.4);
    let lit = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] > 90) lit += 1;
    resolve(lit / (data.length / 4));
  };
  image.src = 'data:image/png;base64,${shot.toString('base64')}';
})`);
};
await show(MOMENTS[1][1], 1000);
check('the maze moves on ARMED', await mazeMoves());
await show(RUNNING[0][1]);
check('the maze holds its frame while the solve runs', !(await mazeMoves()));
const litBefore = await mazeLit();
await tab.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
await sleep(600);
const litAfter = await mazeLit();
check('a resize during the solve redraws the held frame', litBefore > 0.1 && litAfter > litBefore / 2,
  `lit ${litBefore.toFixed(2)} before, ${litAfter.toFixed(2)} after`);
await tab.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await show(at(review, 0), 1000);
check('the maze holds its frame through the review', !(await mazeMoves()));
await show(decided(review, 'plus2'), 1500);
check('the maze holds its frame through the verdict', !(await mazeMoves()));
await show(at(decide(review, 'plus2'), 3000), 1000);
check('the maze moves again with the change to Mezcla', (await textOf('.figure .big')) === '3DE 3' && await mazeMoves());

check('no uncaught errors', tab.errors.length === 0, tab.errors.join(' | '));
console.log(`\nScreenshots in ${OUT.pathname}`);
tab.close();
await finish('screens');
