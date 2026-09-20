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
import { createSignalCheck } from './signal-check.js';

const root = document.getElementById('operator');
const checkRoot = document.getElementById('signal-check');
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
  // One connection, shared by the debug view's button and the check's picker: the driver itself
  // does not track whether it started, and the check has to say so (operator spec §3.2).
  let connected = mock;
  let deviceId = localStorage.getItem(DEVICE_KEY) ?? '';
  let deviceLabel = mock ? 'Mock mat' : null;
  const matFacade = {
    connected: () => connected,
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
  let checkOpen = false;
  const view = createOperatorView(root, {
    mock,
    scenarios: Object.keys(SCENARIOS),
    onScenario: (name) => driver.play(SCENARIOS[name]()),
    onConnect: (id) => matFacade.connect(id),
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

  // The check is a bench, not a view (operator spec §3.1): while it is open the mat reaches
  // neither the reducer nor, therefore, the audience window.
  driver.onState((matState) => {
    if (checkOpen) {
      signalCheck.onMat(matState);
      return;
    }
    dispatch({ type: 'mat', state: matState, at: Date.now() });
  });

  function openCheck() {
    // ARMED is the one held screen that draws live mat data — the hands, the light, the inspection
    // countdown — so it steps back to SCRAMBLE, keeping the scramble, rather than freezing into a
    // lie on the projector. RESULTS joins this list when that phase exists.
    const armedAndWaiting = state.phase === 'ARMED' && state.inspectionStartedAt === null;
    if (!['STANDBY', 'SCRAMBLE'].includes(state.phase) && !armedAndWaiting) return;
    if (armedAndWaiting) dispatch({ type: 'command', command: 'disarm', at: Date.now() });
    checkOpen = true;
    root.hidden = true;
    signalCheck.open();
  }

  function closeCheck() {
    checkOpen = false;
    signalCheck.close();
    root.hidden = false;
  }

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const command = commandForKey(e.key, state.phase);
    // While the check is open no key reaches the event: a stray D would record a DNF nobody saw.
    if (checkOpen) {
      if (command === 'signalCheck' || e.key === 'Escape') {
        e.preventDefault();
        closeCheck();
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
      if (state.event.attempts.length > 0 || state.phase !== 'STANDBY') e.preventDefault();
    });
  }

  view.setExports(toJSON(state.event, Date.now()), toCSV(state.event));
  if (mock) driver.start();
  dispatch({ type: 'render' }); // first render and first snapshot
}

main();
