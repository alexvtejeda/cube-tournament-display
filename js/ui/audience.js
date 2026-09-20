// Audience window: renders the operator's latest snapshot. It holds no state of the event, only what
// it needs to animate from one snapshot to the next: the scene on screen, and when a verdict began
// (UI spec §2.7, §7.2). The maze runs under every screen and holds its last frame from the solve
// until the verdict ends (§2.5).
import { createMaze } from '../../vendor/hero-maze3d.js';
import { createSubscriber } from '../core/channel.js';
import {
  FRAME_HTML, RESULTS_FRAME_HTML, SOLO_HTML, attractFooter, attractHtml, changeBetween, countHtml,
  familyOf, mazeFrozen, noSignalHtml, resultsHtml, sceneOf, scrambleHtml, screenFor, signalMarkHtml,
  soloWhoHtml, standbyHtml,
} from './audience-screens.js';
import { VERDICT_LANDS_MS, clockIsBest, soloDisplay } from './clock-display.js';

const stage = document.getElementById('stage');
const backdrop = document.getElementById('backdrop');
const screen = document.getElementById('screen');
const maze = createMaze({ canvas: document.getElementById('maze') });
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Screen changes move shared elements with the View Transitions API. Without it, with reduced
// motion, or while the window is hidden, every change is a cut.
const canAnimate = () => typeof document.startViewTransition === 'function' && !reducedMotion.matches && !document.hidden;

// Snapshots arrive about ten times a second. An element is rewritten only when its HTML changes,
// so nothing is rebuilt between changes and the images never flicker.
const written = new WeakMap();
function patch(element, html) {
  if (written.get(element) === html) return;
  element.innerHTML = html;
  written.set(element, html);
}
const slot = (key) => screen.querySelector(`[data-slot="${key}"]`);

let latest = null;          // the newest snapshot
let shown = null;           // the scene on screen, from sceneOf()
let changePending = false;  // a view transition has captured the old screen and not yet drawn the new
let arriving = false;       // RESULTS came from the bridge, so its times and its kitty animate (§8.5)
let leaving = null;         // the scene a pending change started from, for the plate that returns (§8.2)

function render(snapshot) {
  latest = snapshot;
  if (mazeFrozen(snapshot)) maze.pause();
  else maze.resume();
  followVerdict(snapshot);
  const scene = sceneOf(snapshot);
  const changing = changeBetween(shown, scene) !== null && canAnimate();
  // RESULTS animates its times and its kitty only when it arrives from the bridge by a screen
  // change (§8.5). The flag is then held for as long as the board is up, so a later snapshot can
  // neither restart the climb nor cut it off half-way. A window that opened after the bridge, or
  // one under reduced motion, never sets it and shows the finished board (§8.2).
  if (scene.screen !== 'results') arriving = false;
  else if (changing && shown.screen === 'attract') arriving = true;
  if (changing) {
    // startViewTransition's callback runs after this function has returned, so by the time draw()
    // reads it `shown` is already the new scene. The screen being left is remembered here instead.
    leaving = shown;
    if (shown.screen === 'attract') nameLeavingPlates(scene);
    // ATTRACT's ordinary exit to Mezcla must not fire on the way to RESULTS (§8.2).
    if (arriving) document.documentElement.classList.add('to-results');
    changePending = true;
    const change = document.startViewTransition(() => {
      changePending = false;
      draw(latest);
    });
    change.ready.catch(() => {}); // skipped, when another change arrives first
    change.finished.finally(() => document.documentElement.classList.remove('to-results'));
  } else if (!changePending) {
    // Until the pending change draws, the old screen must stay as it was captured.
    leaving = null;
    draw(snapshot);
  }
  shown = scene;
}

// ATTRACT names only the called university's plate, just before it leaves, so that plate moves into
// Mezcla's while the other twelve go with the grid (UI spec §2.7). Leaving for RESULTS is the one
// exception: every plate moves to its own place, so each is named and the grid itself is not.
function nameLeavingPlates(scene) {
  // Whatever the bridge in named is cleared first (§8.2): that name belongs to a change that has
  // already run, and leaving it on would take a second plate out of the grid on this one.
  for (const plate of screen.querySelectorAll('.attract .plate')) plate.style.viewTransitionName = '';
  if (scene.screen !== 'results') {
    const called = screen.querySelector(`.attract .plate[data-team="${scene.featured}"]`);
    if (called) called.style.viewTransitionName = `plate-${scene.featured}`;
    return;
  }
  const unis = screen.querySelector('.attract .unis');
  if (unis) unis.style.viewTransitionName = 'none';
  for (const plate of screen.querySelectorAll('.attract .plate')) {
    plate.style.viewTransitionName = `plate-${plate.dataset.team}`;
  }
}

// The bridge in: the plate that was on Resultado or Mezcla returns to its slot in ATTRACT's grid
// (§8.2), so the incoming ATTRACT names it. The screen being left is `leaving`, not `shown`: this
// runs inside the change's callback, by which time `shown` is already the screen being drawn.
//
// It also clears whatever the last change left behind. `vt()` writes these names as inline styles,
// so an imperative one overwrites them and has to put them back by name, not by emptying them.
function nameReturningPlate() {
  const unis = screen.querySelector('.attract .unis');
  if (unis) unis.style.viewTransitionName = 'attract-plates';
  for (const plate of screen.querySelectorAll('.attract .plate')) plate.style.viewTransitionName = '';
  if (leaving === null || familyOf(leaving.screen) !== 'standby' || leaving.featured === null) return;
  const back = screen.querySelector(`.attract .plate[data-team="${leaving.featured}"]`);
  if (back) back.style.viewTransitionName = `plate-${leaving.featured}`;
}

function draw(snapshot) {
  const name = screenFor(snapshot);
  stage.dataset.screen = name;
  backdrop.dataset.screen = name; // the shade lives on the backdrop and is keyed to the screen
  stage.classList.toggle('arriving', arriving);
  if (name === 'attract') {
    patch(screen, attractHtml(snapshot.teams));
    // A slot of its own, so ending the event changes the words without rewriting the grid (§8.10).
    patch(slot('footer'), attractFooter(snapshot));
    nameReturningPlate();
    return;
  }
  if (name === 'results') {
    // RESULTS has a frame of its own, because it has no band (§8.3).
    patch(screen, RESULTS_FRAME_HTML);
    patch(slot('body'), resultsHtml(snapshot));
    return;
  }
  patch(screen, FRAME_HTML);
  patch(slot('count'), countHtml(snapshot));
  patch(slot('signal'), signalMarkHtml(name));
  patch(slot('net'), snapshot.scrambleSvg ?? ''); // SVG from our own scramble worker
  patch(slot('scramble'), scrambleHtml(snapshot));
  if (familyOf(name) === 'standby') {
    patch(slot('body'), standbyHtml(snapshot));
    return;
  }
  if (name === 'nosignal') {
    // The header and the band above and below it are the frame's own, unchanged (§10.3).
    patch(slot('body'), noSignalHtml(snapshot));
    return;
  }
  patch(slot('body'), SOLO_HTML);
  patch(slot('who'), soloWhoHtml(snapshot));
  paintClock(snapshot);
}

// A verdict plays from the moment it arrives if this window saw the review it decides. Otherwise it
// shows its landed frame at once, as it does under reduced motion (UI spec §7.2).
let review = null;  // the review on screen: `${teamId} ${attempt}`
let played = null;  // the verdict on screen: when it began, or -Infinity for its landed frame
function followVerdict({ phase, competitor, attemptNo, verdict }) {
  if (phase === 'PENDING') {
    review = `${competitor.id} ${attemptNo}`;
    played = null;
  } else if (verdict === null) {
    review = null;
    played = null;
  } else if (played === null) {
    const animate = review === `${verdict.teamId} ${verdict.attempt}` && canAnimate();
    played = animate ? performance.now() : -Infinity;
    review = null;
    if (animate) requestAnimationFrame(playVerdict);
  }
}

// Between snapshots the verdict is repainted every frame until it lands, so the rewind runs smoothly.
function playVerdict() {
  if (played === null || changePending || familyOf(screenFor(latest)) !== 'solo') return;
  paintClock(latest);
  if (performance.now() - played < VERDICT_LANDS_MS) requestAnimationFrame(playVerdict);
}

// The clock and the status line are painted in place, never rebuilt, so that PENDING's colour
// changes and the verdict's tag run as CSS transitions (UI spec §7.1–§7.2).
function paintClock(snapshot) {
  const display = soloDisplay(snapshot, played === null ? Infinity : performance.now() - played);
  const solo = screen.querySelector('.solo');
  solo.classList.toggle('pending', snapshot.phase === 'PENDING' || snapshot.verdict !== null);
  const clock = solo.querySelector('.clock');
  clock.className = `clock ${display.clockTone}${display.penalty ? ` penalty-${display.penalty.state}` : ''}`;
  const digits = clock.querySelector('.digits');
  if (digits.textContent !== display.clock) digits.textContent = display.clock;
  // The clock keeps its identity wherever the next screen holds the same time: PENDING's, moving
  // into Resultado's MEJOR TIEMPO when it is the best (§7.2), and RUNNING's, shrinking into NO
  // SIGNAL's TIEMPO CONGELADO (§10.5). Only one screen is ever rendered, so the two cannot collide.
  digits.style.viewTransitionName = snapshot.phase === 'RUNNING' || clockIsBest(snapshot) ? 'time' : '';
  if (display.penalty) clock.querySelector('.penalty').textContent = display.penalty.text;
  const status = solo.querySelector('.status');
  status.className = `status ${display.statusTone}`;
  if (status.textContent !== display.status) status.textContent = display.status;
}

createSubscriber(render);
