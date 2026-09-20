// Audience window: renders the operator's latest snapshot and holds no state of its own. The maze runs
// under every screen and holds its last frame from the solve until the verdict ends (UI spec §2.5).
// Every change is a cut, and a verdict shows its landed frame.
import { createMaze } from '../../vendor/hero-maze3d.js';
import { createSubscriber } from '../core/channel.js';
import {
  FRAME_HTML, SOLO_HTML, attractHtml, countHtml, familyOf, mazeFrozen, scrambleHtml, screenFor, soloWhoHtml,
  standbyHtml,
} from './audience-screens.js';
import { soloDisplay } from './clock-display.js';

const stage = document.getElementById('stage');
const screen = document.getElementById('screen');
const maze = createMaze({ canvas: document.getElementById('maze') });

// Snapshots arrive about ten times a second. An element is rewritten only when its HTML changes,
// so nothing is rebuilt between changes and the images never flicker.
const written = new WeakMap();
function patch(element, html) {
  if (written.get(element) === html) return;
  element.innerHTML = html;
  written.set(element, html);
}
const slot = (key) => screen.querySelector(`[data-slot="${key}"]`);

function render(snapshot) {
  if (mazeFrozen(snapshot)) maze.pause();
  else maze.resume();
  const name = screenFor(snapshot);
  stage.dataset.screen = name;
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

// The clock and the status line are painted in place, never rebuilt.
function paintClock(snapshot) {
  const display = soloDisplay(snapshot);
  const clock = screen.querySelector('.solo .clock');
  clock.className = `clock ${display.clockTone}${display.penalty ? ` penalty-${display.penalty.state}` : ''}`;
  const digits = clock.querySelector('.digits');
  if (digits.textContent !== display.clock) digits.textContent = display.clock;
  if (display.penalty) clock.querySelector('.penalty').textContent = display.penalty.text;
  const status = screen.querySelector('.solo .status');
  status.className = `status ${display.statusTone}`;
  if (status.textContent !== display.status) status.textContent = display.status;
}

createSubscriber(render);
