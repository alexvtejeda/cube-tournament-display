// Operator window: owns the mat driver, the event state, persistence and the only getUserMedia call
// (system design §3). The competitive logic is the pure core; this file wires it to the browser.
// `?driver=mock` swaps the mat for the scripted scenarios.
import { loadConfig } from '../config.js';
import { claimOperator, createPublisher, holdsOperator } from '../core/channel.js';
import { toCSV, toJSON } from '../core/export.js';
import { commandForKey } from '../core/keymap.js';
import { createState, reduce } from '../core/run-state.js';
import { RESULTS_INTRO_MS, STANDINGS_UPDATE_MS, VERDICT_MS, buildSnapshot } from '../core/snapshot.js';
import { STORAGE_KEY, createStore } from '../core/store.js';
import { createMockDriver } from '../drivers/mock.js';
import { createRealDriver } from '../drivers/real.js';
import { SCENARIOS } from '../drivers/scenarios.js';
import { createScrambler } from '../scrambler.js';
import { createOperatorView } from './operator-debug-view.js';
import { createSetup } from './setup.js';
import { createSignalCheck } from './signal-check.js';

const root = document.getElementById('operator');
const checkRoot = document.getElementById('signal-check');
const setupRoot = document.getElementById('setup');
// Where the chosen input is remembered, beside the store's own key. SETUP (screen 9) reads it too.
const DEVICE_KEY = 'cube-tournament-display:deviceId';
const mock = new URLSearchParams(location.search).get('driver') === 'mock';
// Mock runs keep their own log, so a rehearsal can never touch a real event's results.
const store = createStore(localStorage, mock ? `${STORAGE_KEY}:mock` : STORAGE_KEY);

async function main() {
  if (!(await claimOperator())) {
    root.textContent = 'Another operator window is already open. Use that one and close this.';
    return;
  }
  const config = await loadConfig();
  run(config);
}

// Resume or start fresh is SETUP's question now, asked on screen 9 (operator spec §4.2).
function run(config) {
  // The event does not exist until SETUP hands the window over, so nothing here reads `state`
  // before then (spec §4.1, §4.12).
  let state = null;
  let requestedSeq = 0;
  // SETUP owns the window until one of its two actions is taken. The check may borrow it and hands
  // it back to wherever it came from — the same seam, for the same reason (spec §3.1, §4.1, §4.14).
  let screen = 'setup';
  let checkFrom = 'setup';
  const publisher = createPublisher();
  const scrambler = createScrambler(new Worker('node_modules/cstimer_module/cstimer_module.js'));
  const driver = mock ? createMockDriver() : createRealDriver();
  // One connection, shared by SETUP's picker, the debug view's button and the check's: the driver
  // is started by connect() and by nothing else, in mock mode too. A rehearsal that listened to a
  // mat nobody connected would make Conectar — and Enter, its key — untestable (operator spec
  // §4.10), and would report a mock mat as connected before anyone connected it.
  let connected = false;
  let deviceId = localStorage.getItem(DEVICE_KEY) ?? '';
  let deviceLabel = mock ? 'Mock mat' : null;
  const matFacade = {
    connected: () => connected,
    // The Web Lock claim is made once, at startup. A window that lost it never takes the
    // microphone (engine decision 8), so SETUP and SIGNAL CHECK both show it as refused rather
    // than pending.
    canConnect: () => holdsOperator(),
    deviceId: () => deviceId,
    deviceLabel: () => deviceLabel,
    listDevices: () => driver.listDevices(),
    async connect(id) {
      await driver.start(id);
      connected = true;
      deviceId = id ?? '';
      if (deviceId) localStorage.setItem(DEVICE_KEY, deviceId);
      const devices = await driver.listDevices();
      deviceLabel = devices.find(([value]) => value === deviceId)?.[1] ?? devices[0]?.[1] ?? null;
    },
    permission: async () =>
      (await navigator.permissions?.query({ name: 'microphone' }).catch(() => null))?.state ?? null,
    sample: (seconds) => new Promise((resolve) => driver.getSample(seconds, resolve)),
  };
  const signalCheck = createSignalCheck({ root: checkRoot, mat: matFacade });
  const view = createOperatorView(root, {
    mock,
    scenarios: Object.keys(SCENARIOS),
    onScenario: (name) => driver.play(SCENARIOS[name]()),
    onConnect: (id) => matFacade.connect(id),
    listDevices: () => driver.listDevices(),
  });
  root.hidden = true; // SETUP is the first screen; the event window is built but not shown

  const setup = createSetup({
    root: setupRoot,
    mat: matFacade,
    store,
    config, // for the roster size and the university names in the event block
    mock,
    onResume: () => enterEvent({ fresh: false }),
    onFresh: ({ archive }) => enterEvent({ fresh: true, archive }),
  });

  // `archive` comes from the gate, not from here: keeping a real event's log and dropping a
  // rehearsal's is a rule, and rules live in the core (spec §4.6). SETUP is left exactly once.
  function enterEvent({ fresh, archive }) {
    if (fresh) {
      if (archive) store.archive(Date.now());
      else store.clear();
    }
    const saved = store.load();
    state = createState(config, saved.status === 'ok' ? saved.attempts : []);
    requestedSeq = state.scrambleSeq;
    screen = 'event';
    setup.destroy();
    setupRoot.hidden = true;
    root.hidden = false;
    view.setExports(toJSON(state.event, Date.now()), toCSV(state.event));
    // Reanudar catches a reopened audience window up; fresh publishes an empty event. Either way
    // this is the first snapshot the room ever sees (spec §4.12).
    dispatch({ type: 'render' });
  }

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
    // The bridge through ATTRACT ends on time too, and the mat plays no part in it (UI spec §8.2).
    if (state.resultsAt !== null && state.resultsAt !== previous.resultsAt) {
      setTimeout(() => dispatch({ type: 'render' }), state.resultsAt + RESULTS_INTRO_MS - now);
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

  // The check is a bench, not a view (operator spec §3.1): while it is open the mat reaches
  // neither the reducer nor, therefore, the audience window.
  driver.onState((matState) => {
    if (screen === 'check') {
      signalCheck.onMat(matState);
      return;
    }
    if (screen === 'setup') {
      setup.onMatState(matState);
      setup.render();
      return;
    }
    dispatch({ type: 'mat', state: matState, at: Date.now() });
  });

  // The only entry in §3.1's table with no phase to restore: from SETUP the event does not exist
  // yet, so S borrows the window and Esc gives it straight back (spec §4.14).
  function openCheck() {
    if (screen !== 'setup') {
      // ARMED is the one held screen that draws live mat data — the hands, the light, the
      // inspection countdown — so it steps back to SCRAMBLE, keeping the scramble, rather than
      // freezing into a lie on the projector. RESULTS is settled and the mat plays no part in it,
      // so it is safe.
      const armedAndWaiting = state.phase === 'ARMED' && state.inspectionStartedAt === null;
      if (!['STANDBY', 'SCRAMBLE', 'RESULTS'].includes(state.phase) && !armedAndWaiting) return;
      if (armedAndWaiting) dispatch({ type: 'command', command: 'disarm', at: Date.now() });
    }
    checkFrom = screen;
    screen = 'check';
    root.hidden = true;
    setupRoot.hidden = true;
    signalCheck.open();
  }

  function closeCheck() {
    screen = checkFrom;
    signalCheck.close();
    if (screen === 'setup') {
      setupRoot.hidden = false;
      setup.render();
    } else {
      root.hidden = false;
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const command = commandForKey(e.key, state === null ? 'STANDBY' : state.phase);
    // While the check is open no key reaches the event: a stray D would record a DNF nobody saw.
    if (screen === 'check') {
      if (command === 'signalCheck' || e.key === 'Escape') {
        e.preventDefault();
        closeCheck();
      }
      return;
    }
    // SETUP owns its own keys (Enter, and the confirm's Enter and Esc). S is the only one the
    // window takes from it, and there is no event for any other key to reach.
    if (screen === 'setup') {
      if (command === 'signalCheck') {
        e.preventDefault();
        openCheck();
      }
      return;
    }
    if (command === null) return;
    e.preventDefault();
    if (command === 'signalCheck') {
      openCheck();
      return;
    }
    dispatch({ type: 'command', command, at: Date.now() });
  });

  // Closing the window mid-event asks first (system design §8). Not in mock mode, which is never a
  // live event.
  if (!mock) {
    window.addEventListener('beforeunload', (e) => {
      if (state !== null && (state.event.attempts.length > 0 || state.phase !== 'STANDBY')) e.preventDefault();
    });
  }
}

main();
