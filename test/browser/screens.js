// Renders every designed audience state at 1920×1080 and checks the UI spec's invariants (§2.5,
// §4.8, §5.8, §6.8, §7.9). The snapshots come from the real core and the cube preview from the real
// cstimer_module; they reach the audience window over its BroadcastChannel, as the operator's do.
// Each state is also saved to test/browser/out/ to compare with the approved mockups by eye.
//   npm run screens          (CHROME=/path/to/chrome to override the binary)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import { CHANNEL } from '../../js/core/channel.js';
import { createState, reduce } from '../../js/core/run-state.js';
import { RESULTS_INTRO_MS, buildSnapshot } from '../../js/core/snapshot.js';
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

// RESULTS (§8): every university has competed but UNICARIBE, which never arrived. F is pressed from
// Mezcla, so the bridge leaves a university on screen and its plate returns to ATTRACT's grid (§8.2).
const everyone = [...earlier, ...three('pucmm', 235100), ...three('uce', 102180)];
const lastMezcla = next(createState(config, everyone));
const ended = reduce(lastMezcla, cmd('results', 7000));
const finalBoard = at(ended, 7000 + RESULTS_INTRO_MS);
const bridge = at(ended, 7000);
// NO SIGNAL (§10): the solo moments again, with the mat gone quiet.
const gone = (state, now = 0) => buildSnapshot(state, now, { matSilent: true });
const stillRunning = (ms, state = armed) => apply(state, mat(packet(' ', ms, true)));

const { base, openTab, check, finish } = await startHarness(0);
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
// By its slot, not by `.hdr span`: the header's first span is now NO SIGNAL's marker (§10.3).
check('Resultado: the header counts 11 of 13', (await textOf('.hdr [data-slot="count"]')) === 'UNIVERSIDAD 11 / 13');
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

// The maze is a backdrop for the whole window, not for the stage (§2.5). At 1080p the stage fills the
// window, so only a window that is not 16:9 can tell the two apart: there the maze must still reach
// both edges while the stage stays 16:9. Both halves are checked, because widening the stage would
// satisfy the first one alone and that is exactly the fix --stage-w must not receive.
await tab.send('Emulation.setDeviceMetricsOverride', { width: 2560, height: 1080, deviceScaleFactor: 1, mobile: false });
await sleep(600);
const wide = await js(`(() => {
  const canvas = document.getElementById('maze').getBoundingClientRect();
  const stage = document.getElementById('stage').getBoundingClientRect();
  const edges = (selector) => {
    const r = document.querySelector(selector).getBoundingClientRect();
    return [Math.round(r.left), Math.round(r.right)];
  };
  return JSON.stringify({
    window: [innerWidth, innerHeight],
    canvas: [Math.round(canvas.width), Math.round(canvas.height)],
    stage: [Math.round(stage.width), Math.round(stage.height)],
    expectedStage: Math.round(Math.min(innerWidth, innerHeight * 16 / 9)),
    hdr: edges('.hdr'),
    band: edges('.band'),
    stageRight: Math.round(stage.right),
    kittyRight: Math.round(document.querySelector('.kitty').getBoundingClientRect().right),
  });
})()`).then(JSON.parse);
check('a window wider than 16:9: the maze fills the window', wide.canvas[0] === wide.window[0] && wide.canvas[1] === wide.window[1],
  `window ${wide.window.join('\u00d7')}, maze ${wide.canvas.join('\u00d7')}`);
check('a window wider than 16:9: the stage is still 16:9, not stretched', wide.stage[0] === wide.expectedStage
  && Math.abs(wide.stage[0] / wide.stage[1] - 16 / 9) < 0.01,
  `stage ${wide.stage.join('\u00d7')}, expected width ${wide.expectedStage}`);
// The header's rule and the band bleed through the pillarbox to the window's edges, so that neither
// stops short with the maze showing past it (audience.css). Each is checked together with the stage's
// own width, for the same reason the maze is: bars that reach the edges over a stage that was widened
// to get them there is the one fix this must never become. The kitty is the other half \u2014 the bleed
// moves the band's padding box, and everything inside it, the kitty included, has to stay put.
const spans = (bar) => bar[0] === 0 && bar[1] === wide.window[0];
const stageIs16by9 = wide.stage[0] === wide.expectedStage;
check('a window wider than 16:9: the header\u2019s rule spans the window, over a 16:9 stage',
  spans(wide.hdr) && stageIs16by9,
  `header ${wide.hdr.join('\u2013')}, window 0\u2013${wide.window[0]}, stage width ${wide.stage[0]}`);
check('a window wider than 16:9: the band spans the window, over a 16:9 stage',
  spans(wide.band) && stageIs16by9,
  `band ${wide.band.join('\u2013')}, window 0\u2013${wide.window[0]}, stage width ${wide.stage[0]}`);
check('a window wider than 16:9: the band\u2019s content does not follow it out, the kitty included',
  Math.abs(wide.stageRight - wide.kittyRight - 2.2 * wide.stage[0] / 100) < 1,
  `kitty right ${wide.kittyRight}, stage right ${wide.stageRight}`);
await tab.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await sleep(600);

// Motion (UI spec §2.2, §2.7, §7.2).
const changeCount = () => js('window.changes.length');
// Shows `snapshot` and checks that exactly one screen change ran, and that every name in `names` was on
// both sides of it. Returns the change.
async function moves(label, snapshot, names) {
  const count = await changeCount();
  await show(snapshot);
  const ran = (await changeCount()) === count + 1;
  const change = ran ? await js('window.changes.at(-1)') : { before: [], after: [], animations: [] };
  const missing = names.filter((name) => !change.before.includes(name) || !change.after?.includes(name));
  check(label, ran && missing.length === 0, ran ? (missing.length ? `not on both sides: ${missing.join(', ')}` : '') : 'no screen change ran');
  return change;
}
async function cuts(label, snapshot, wait) {
  const before = await changeCount();
  await show(snapshot, wait);
  check(label, (await changeCount()) === before);
}
const clockNow = () => js("(() => { const clock = document.querySelector('.solo .clock'); return [clock.querySelector('.digits').textContent, getComputedStyle(clock).color, clock.className]; })()");
const digitsBox = () => js("JSON.stringify(document.querySelector('.solo .digits').getBoundingClientRect())");
const WHO = ['plate-uce', 'rule', 'attempt-word', 'attempt-n', 'attempt-of', 'name-uce', 'band', 'logo'];

await show(at(createState(config), 0), 1000);
const leaving = await moves('ATTRACT → Mezcla: the logo and the called plate move', at(mezclaEmpty, 0), ['logo', 'plate-loyola']);
check('ATTRACT → Mezcla: the band rises, and pushes the plates and the footer up', !leaving.before.includes('band')
  && ['::view-transition-new(band) band-rise', '::view-transition-old(attract-plates) attract-push', '::view-transition-old(attract-footer) attract-push']
    .every((animation) => leaving.animations.includes(animation)));
check("ATTRACT → Mezcla: only the called university's plate leaves the grid", leaving.before.filter((name) => name.startsWith('plate-')).length === 1);

await show(at(resultado, 0), 1000);
const called = await moves('Resultado → Mezcla (N): the label and the divider stay', at(mezcla, 0), ['label', 'rule', 'band', 'logo']);
check("Resultado → Mezcla: the next university's plate crossfades in", called.before.includes('plate-pucmm') && !called.after.includes('plate-pucmm')
  && called.after.includes('plate-uce') && !called.before.includes('plate-uce'));
await show(at(next(createState(config, uceFirst)), 0));
await moves('Mezcla → ARMED (the mat reset): the plate, the divider, INTENTO · n · DE 3 and the name move', at(armed, 0), WHO);
await cuts('ARMED → RUNNING: no screen change, the mat drives it', runningAt(4200));
await cuts('RUNNING → PENDING: no screen change', at(review, 0));
const stop = await js("(() => { const s = getComputedStyle(document.querySelector('.solo .clock')); return s.transitionProperty + ' ' + s.transitionDuration; })()");
check('PENDING: the stopped time turns violet over --t-short', stop === 'color 0.2s', stop);

// The verdict plays in the window that saw the review (§7.2).
const reviewBox = await digitsBox();
let before = await changeCount();
await post(decided(review, 'plus2'));
await sleep(150);
const entering = await clockNow();
const taggedBox = await digitsBox();
await sleep(350);
const ticked = await clockNow();
await sleep(600);
const landed = await clockNow();
check('2: the tag enters, and the time is still violet', entering[0] === '1:42.18' && entering[1] === VIOLET && entering[2].includes('penalty-in'), entering.join(' · '));
check('2: the tag never moves the clock', taggedBox === reviewBox);
check('2: the seconds tick', ticked[0] === '1:43.18', ticked[0]);
check('2: the time lands white, +2 applied, and the tag slides away', landed[0] === '1:44.18' && landed[1] === WHITE && landed[2].includes('penalty-out'), landed.join(' · '));
check('the verdict is no screen change', (await changeCount()) === before);
await moves('the verdict → Mezcla: the plate, the divider, INTENTO · n · DE 3 and the name move', at(decide(review, 'plus2'), 3000), WHO);
const update = await moves('the standings update: the universities move to their new slots', at(decide(review, 'plus2'), 4200),
  ['standing-name-intec', 'standing-time-intec', 'standing-name-itla', 'standing-time-itla']);
check('the standings update: UCE enters the board, and UNPHU leaves it', update.after.includes('standing-name-uce') && !update.before.includes('standing-name-uce')
  && update.before.includes('standing-name-unphu') && !update.after.includes('standing-name-unphu'));
const skipped = reduce(decide(review, 'plus2'), cmd('nextTeam'));
await moves('Mezcla → Mezcla (→): the label, the divider and INTENTO · n · DE 3 stay', at(withScramble(skipped), 4200),
  ['label', 'rule', 'attempt-word', 'attempt-n', 'attempt-of', 'band', 'logo']);
await moves('Mezcla → PENDING (U): the same moves, in reverse', at(reduce(skipped, cmd('undo')), 0), ['rule', 'attempt-word', 'attempt-n', 'attempt-of', 'band', 'logo']);

await post(decided(review, 'dnf'));
await sleep(400);
const dnfEntering = await clockNow();
await sleep(600);
const dnfLanded = await clockNow();
check('D: the tag enters over the time, and DNF replaces it', dnfEntering[0] === '1:42.18' && dnfEntering[2].includes('penalty-in')
  && dnfLanded[0] === 'DNF' && dnfLanded[1] === WHITE, `${dnfEntering[0]} → ${dnfLanded[0]}`);
await show(at(review, 0));
await post(decided(review, 'redo'));
await sleep(700);
const rewinding = await clockNow();
await sleep(600);
const rewound = await clockNow();
check('R: the clock rewinds to 0.00, and stays violet', !['1:42.18', '0.00'].includes(rewinding[0]) && rewound[0] === '0.00' && rewound[1] === VIOLET,
  `${rewinding[0]} → ${rewound[0]}`);
await cuts('the verdict → ARMED (a mat reset during it): no screen change', at(apply(decide(review, 'redo'), mat(packet('I', 0))), 0));

// Attempt 3: the clock moves into MEJOR TIEMPO only when it is the university's best time (§7.2).
const third = (ms) => stopAt(ms, apply(next(createState(config, [...uceFirst, attempt('uce', 2, 110000)])), mat(packet('I', 0))));
await show(at(third(102180), 0));
await show(decided(third(102180), 'accept'), 1500);
await moves('the verdict → Resultado: the best time moves into MEJOR TIEMPO', at(decide(third(102180), 'accept'), 3000), ['plate-uce', 'rule', 'name-uce', 'time', 'band', 'logo']);
await show(at(third(120000), 0));
await show(decided(third(120000), 'accept'), 1500);
const slower = await moves('the verdict → Resultado, not the best: the plate, the divider and the name move', at(decide(third(120000), 'accept'), 3000), ['plate-uce', 'rule', 'name-uce']);
check('not the best: the clock fades, and MEJOR TIEMPO fades in', !slower.before.includes('time') && slower.after.includes('time'));

// A window that did not see the review shows the landed frame at once (§7.2).
await show(at(armed, 0));
await show(decided(review, 'plus2'), 100);
check('a verdict this window did not see decided shows its landed frame at once', (await clockNow())[0] === '1:44.18');

// ── RESULTS (§8) and NO SIGNAL (§10) ─────────────────────────────────────────────────────────
const cq = (px) => px / 19.2;
const boxes = (selectors) => js(`JSON.stringify(Object.fromEntries(${JSON.stringify(selectors)}.map((s) => {
  const el = document.querySelector(s);
  if (!el) return [s, null];
  const r = el.getBoundingClientRect();
  return [s, { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }];
})))`).then(JSON.parse);
const teamsIn = (selector) => js(`[...document.querySelectorAll(${JSON.stringify(selector)})].map((p) => p.dataset.team)`);

// The bridge: F from Mezcla goes through ATTRACT, and the plate on screen returns to its slot (§8.2).
await show(at(lastMezcla, 0), 1000);
const toBridge = await moves('Mezcla → ATTRACT (F): the logo moves and the plate returns to the grid',
  bridge, ['logo', 'plate-unicaribe']);
check('the bridge: ATTRACT says Resultados finales', (await textOf('.attract .soon')) === 'Resultados finales');
check('the bridge: all thirteen plates are in ATTRACT’s grid', (await js("document.querySelectorAll('.attract .plate').length")) === 13);
check('the bridge: only the university that was on screen is named', toBridge.after.filter((n) => n.startsWith('plate-')).length === 1);
await save('results-bridge');

// ATTRACT → RESULTS: every plate moves to its own place, so the grid itself must not be named.
const arriving = await moves('ATTRACT → RESULTS: the logo and all thirteen plates move',
  finalBoard, ['logo', ...config.teams.map((t) => `plate-${t.id}`)]);
check('ATTRACT → RESULTS: the grid itself is not named, or it would carry its plates away',
  !arriving.before.includes('attract-plates'));

// The climb (§8.5): the kitty rises its own height while the clip line stays on the plate's edge.
// The visible bottom is the box's bottom less whatever the clip takes off it. `inset()` computes
// with mixed units — `inset(0px 0px 54.76% 0px)` — so the bottom edge is read by position and its
// unit honoured, never by picking out the percentages.
const climbAt = (ms) => js(`new Promise((resolve) => {
  const img = document.querySelector('.results .kit img');
  for (const a of img.getAnimations()) { a.pause(); a.currentTime = ${ms}; }
  requestAnimationFrame(() => {
    const box = img.getBoundingClientRect();
    const parts = (getComputedStyle(img).clipPath.match(/inset\\(([^)]+)\\)/)?.[1] ?? '0px').trim().split(/\\s+/);
    const edge = parts[2] ?? parts[0];
    const clipped = edge.endsWith('%') ? (parseFloat(edge) / 100) * box.height : parseFloat(edge);
    const plate = document.querySelector('.step.p1 .plate').getBoundingClientRect();
    resolve(((box.bottom - clipped) - plate.top) / 19.2);
  });
})`);
const climbOffsets = [];
for (const ms of [800, 1000, 1200, 1400, 1600]) climbOffsets.push(await climbAt(ms));
check('the climb: the kitty’s visible bottom stays on the plate’s edge, all the way up',
  climbOffsets.every((offset) => Math.abs(offset) < 0.05), climbOffsets.map((o) => `${o.toFixed(3)}cqw`).join(', '));
await js("for (const a of document.querySelector('.results .kit img').getAnimations()) a.finish()");
await sleep(200);
await save('results');

// The board (§8.3, §8.6).
check('RESULTS: thirteen plates, one per university', (await js("document.querySelectorAll('#screen .plate').length")) === 13);
check('RESULTS: the podium reads 2nd, 1st, 3rd',
  JSON.stringify(await teamsIn('.podium .plate')) === JSON.stringify(['uce', 'intec', 'itla']));
check('RESULTS: places 4 to 13 go to the grid, in order',
  JSON.stringify(await teamsIn('.grid .plate')) === JSON.stringify(['unapec', 'unibe', 'utesa', 'ucsd', 'uapa', 'unphu', 'pucmm', 'loyola', 'unicda', 'unicaribe']));
check('RESULTS: a dash for competed-without-a-time, and NO PARTICIPÓ for never competed',
  (await textOf('.cell:nth-child(9) .line')) === '—' && (await textOf('.cell:nth-child(10) .line')) === 'NO PARTICIPÓ');
const gridPlate = (await boxes(['.cell .plate']))['.cell .plate'];
check('RESULTS: the grid’s plates are ATTRACT’s own 12.7cqw', Math.abs(cq(gridPlate.width) - 12.7) < 0.05,
  `${cq(gridPlate.width).toFixed(2)}cqw`);
const golden = await js(`[...document.querySelectorAll('.screen *')].filter((el) => getComputedStyle(el).color === 'rgb(255, 234, 149)').map((el) => el.className)`);
check('RESULTS: --gold-text is on the winner’s time and nowhere else',
  JSON.stringify(golden) === JSON.stringify(['time']), golden.join(', '));
const boardColors = await colorsUsed();
check('RESULTS: no --go, and no --red outside the kitty’s glow',
  !boardColors.includes(GO) && !boardColors.includes(RED) && !boardColors.includes(GOLD));
// The kitty's paws hang below the plate's edge by the share of the asset that sits below it (§8.4).
const kitBox = await boxes(['.results .kit', '.step.p1 .plate', '.hdr', '.podium', '.grid', '.results', '#stage']);
const paws = cq(kitBox['.results .kit'].bottom - kitBox['.step.p1 .plate'].top);
check('RESULTS: the kitty sits on the winner’s plate, paws over the edge',
  Math.abs(paws - (11 * 65 / 1200)) < 0.1, `${paws.toFixed(3)}cqw, expected ${(11 * 65 / 1200).toFixed(3)}cqw`);
// The band is gone, so the body is the band's 10.95cqw plus its own 39.02cqw, and the board is
// centred in it. The plan's absolute figures for the podium and the grid were a prediction that did
// not survive centring, so what is checked is the invariant: inside the header, inside the padding,
// and the same gap top and bottom.
const hdrBottom = cq(kitBox['.hdr'].bottom - kitBox['#stage'].top);
const podiumTop = cq(kitBox['.podium'].top - kitBox['#stage'].top);
const gridBottom = cq(kitBox['.grid'].bottom - kitBox['#stage'].top);
check('RESULTS: the header ends at 6.26cqw, as on every other screen', Math.abs(hdrBottom - 6.26) < 0.1, `${hdrBottom.toFixed(2)}cqw`);
check('RESULTS: the body is the band’s 10.95cqw plus its own 39.02cqw',
  Math.abs(cq(kitBox['.results'].height) - 49.97) < 0.1, `${cq(kitBox['.results'].height).toFixed(2)}cqw`);
check('RESULTS: the podium starts clear of the header, and the grid ends clear of the edge',
  podiumTop > hdrBottom + 0.9 && gridBottom < 56.25 - 1.9, `podium ${podiumTop.toFixed(2)}cqw, grid ends ${gridBottom.toFixed(2)}cqw`);
check('RESULTS: the board is centred in the body',
  Math.abs((podiumTop - hdrBottom - 0.9) - (56.25 - 1.9 - gridBottom)) < 0.05);
// The longest line there can be: a two-digit place and a time just under the cutoff.
const lineGap = await js(`(() => {
  const line = document.querySelector('.cell .line');
  const probe = line.cloneNode(true);
  probe.querySelector('.place').textContent = '12';
  const time = probe.querySelector('.time');
  time.className = 'time';
  time.textContent = '4:58.66';
  line.parentNode.append(probe);
  const gap = probe.querySelector('.time').getBoundingClientRect().left - probe.querySelector('.place').getBoundingClientRect().right;
  probe.remove();
  return gap / 19.2;
})()`);
check('RESULTS: the longest line, 12 and 4:58.66, still has its place and time apart', lineGap >= 2, `${lineGap.toFixed(2)}cqw`);

// NO SIGNAL (§10.3–§10.5). RUNNING's own frame first, to compare against.
await show(at(stillRunning(84020), 0), 1000);
const runningWho = await js("document.querySelector('.solo .who').innerHTML");
const runningBand = await js("document.querySelector('.band').innerHTML");
const runningBandHeight = await bandHeight();
await show(gone(stillRunning(84020)), 1000);
await save('nosignal-running');
check('NO SIGNAL: the header’s centre reads SIN SEÑAL', (await textOf('.hdr .sig')) === 'SIN SEÑAL');
const markBoxes = await boxes(['.hdr .sig', '.hdr']);
check('NO SIGNAL: the marker is centred in the header',
  Math.abs(cq((markBoxes['.hdr .sig'].left + markBoxes['.hdr .sig'].right) / 2 - (markBoxes['.hdr'].left + markBoxes['.hdr'].right) / 2)) < 0.5);
check('NO SIGNAL: the word is --violet, and only the dot is --red',
  (await colorOf('.hdr .sig')) === VIOLET && (await js("getComputedStyle(document.querySelector('.hdr .sig .dot')).backgroundColor")) === RED);
check('NO SIGNAL: the band is untouched', (await js("document.querySelector('.band').innerHTML")) === runningBand
  && (await bandHeight()) === runningBandHeight);
check('NO SIGNAL: the who line is untouched', (await js("document.querySelector('.solo .who').innerHTML")) === runningWho);
check('NO SIGNAL: the frozen time is the one that was on the clock', (await textOf('.frozen')) === '1:24.02');
check('NO SIGNAL: the countdown and the clock are gone', (await js("document.querySelector('.solo .clock')")) === null);
check('NO SIGNAL: the frozen time is --violet while it is inside the cutoff', (await colorOf('.frozen')) === VIOLET);

await show(gone(stillRunning(320000)), 1000);
await save('nosignal-over');
check('NO SIGNAL: a frozen time past the cutoff keeps its red', (await colorOf('.frozen')) === RED
  && (await textOf('.frozen')) === '5:20.00');

await show(gone(inspecting, 8000), 1000);
await save('nosignal-armed');
check('NO SIGNAL over ARMED: nothing to freeze, and nothing said about a time',
  (await js("document.querySelector('.frozen')")) === null && !(await js("document.querySelector('.solo').textContent")).includes('TIEMPO CONGELADO'));
check('NO SIGNAL over ARMED: the sentence says the attempt has not begun',
  (await js("document.querySelector('.nosignal .sentence').textContent")).includes('aún no ha comenzado'));

// The four exempt screens are byte for byte what they are with a live mat (§10.1, §10.1.1).
for (const [name, state, now] of [['ATTRACT', createState(config), 0], ['Mezcla', mezcla, 0],
  ['Resultado', resultado, 0], ['PENDING', review, 0]]) {
  await show(at(state, now), 1000);
  await show(at(state, now), 400); // settle: the first draw of ATTRACT still carries the leaving name
  const live = await js("document.getElementById('screen').innerHTML");
  await show(gone(state, now), 400);
  const quiet = await js("document.getElementById('screen').innerHTML");
  check(`a silent mat changes nothing on ${name}`, live === quiet && (await js("document.querySelector('.hdr .sig')?.textContent ?? ''")) === '');
}

// The two changes into and out of the takeover (§2.7, §10.5).
await show(at(armed, 0), 1000);
await moves('ARMED → NO SIGNAL: the plate, the divider, INTENTO · n · DE 3, the name and the band hold', gone(inspecting, 8000), WHO);
await moves('NO SIGNAL → ARMED: the same, in reverse', at(armed, 0), WHO);
await show(at(stillRunning(84020), 0), 1000);
await moves('RUNNING → NO SIGNAL: the same, and the clock shrinks into TIEMPO CONGELADO', gone(stillRunning(84020)), [...WHO, 'time']);
await moves('NO SIGNAL → RUNNING: the same, in reverse', at(stillRunning(84020), 0), [...WHO, 'time']);

// With reduced motion every change is a cut, and a verdict lands at once (§2.2).
await tab.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await show(at(review, 0));
await show(decided(review, 'plus2'), 100);
check('reduced motion: the verdict shows its landed frame at once', (await clockNow())[0] === '1:44.18');
await cuts('reduced motion: every screen change is a cut', at(decide(review, 'plus2'), 3000));
await tab.send('Emulation.setEmulatedMedia', { features: [] });

check('no uncaught errors', tab.errors.length === 0, tab.errors.join(' | '));
console.log(`\nScreenshots in ${OUT.pathname}`);
tab.close();
await finish('screens');
