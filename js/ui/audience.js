// Audience window: renders the operator's latest snapshot. It holds no state of the event, only what
// it needs to animate from one snapshot to the next: the scene on screen, and when a verdict began
// (UI spec §2.7, §7.2). The maze runs under every screen and holds its last frame from the solve
// until the verdict ends (§2.5).
import { createMaze } from '../../vendor/hero-maze3d.js';
import { createSubscriber } from '../core/channel.js';
import {
  FRAME_HTML, SOLO_HTML, attractHtml, changeBetween, countHtml, familyOf, mazeFrozen, sceneOf, scrambleHtml,
  screenFor, soloWhoHtml, standbyHtml,
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

function render(snapshot) {
  latest = snapshot;
  if (mazeFrozen(snapshot)) maze.pause();
  else maze.resume();
  followVerdict(snapshot);
  const scene = sceneOf(snapshot);
  if (changeBetween(shown, scene) !== null && canAnimate()) {
    if (shown.screen === 'attract') nameCalledPlate(scene.featured);
    changePending = true;
    const change = document.startViewTransition(() => {
      changePending = false;
      draw(latest);
    });
    change.ready.catch(() => {}); // skipped, when another change arrives first
  } else if (!changePending) {
    // Until the pending change draws, the old screen must stay as it was captured.
    draw(snapshot);
  }
  shown = scene;
}

// ATTRACT names only the called university's plate, just before it leaves, so that plate moves into
// Mezcla's while the other twelve go with the grid (UI spec §2.7).
function nameCalledPlate(teamId) {
  const plate = screen.querySelector(`.attract .plate[data-team="${teamId}"]`);
  if (plate) plate.style.viewTransitionName = `plate-${teamId}`;
}

function draw(snapshot) {
  const name = screenFor(snapshot);
  stage.dataset.screen = name;
  backdrop.dataset.screen = name; // the shade lives on the backdrop and is keyed to the screen
  if (name === 'attract') {
    patch(screen, attractHtml(snapshot.teams));
    return;
  }
  patch(screen, FRAME_HTML);
  patch(slot('count'), countHtml(snapshot));
  patch(slot('net'), snapshot.scrambleSvg ?? ''); // SVG from our own scramble worker
  patch(slot('scramble'), scrambleHtml(snapshot));
  if (familyOf(name) === 'standby') {
    patch(slot('body'), standbyHtml(snapshot));
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
  // PENDING's clock moves into Resultado's MEJOR TIEMPO when it holds the best time (§7.2).
  digits.style.viewTransitionName = clockIsBest(snapshot) ? 'time' : '';
  if (display.penalty) clock.querySelector('.penalty').textContent = display.penalty.text;
  const status = solo.querySelector('.status');
  status.className = `status ${display.statusTone}`;
  if (status.textContent !== display.status) status.textContent = display.status;
}

createSubscriber(render);
