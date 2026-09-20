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

// --- RESULTS (UI spec §8.7) ---

function resultsConfig() {
  return {
    teams: [
      { id: 'intec', university: 'INTEC', participant: 'José Martínez' },
      { id: 'itla', university: 'ITLA', participant: 'Ana Pérez' },
      { id: 'pucmm', university: 'PUCMM', participant: null },
    ],
    attemptsPerCompetitor: 3,
    cutoffMs: 300000,
  };
}

const command = (state, name, at = 1000) => reduce(state, { type: 'command', command: name, at });

test('results ends the event from STANDBY and stamps resultsAt', () => {
  const state = command(createState(resultsConfig()), 'results', 7000);
  assert.equal(state.phase, 'RESULTS');
  assert.equal(state.resultsAt, 7000);
});

test('results drops the attempt in progress but keeps the roster position', () => {
  const scrambling = command(createState(resultsConfig()), 'next');
  assert.equal(scrambling.phase, 'SCRAMBLE');
  const state = command(scrambling, 'results', 7000);
  assert.equal(state.phase, 'RESULTS');
  assert.equal(state.attemptNo, null);
  assert.equal(state.scramble, null);
  assert.equal(state.scrambleSvg, null);
  assert.equal(state.teamIndex, scrambling.teamIndex);
});

test('results is ignored outside STANDBY and SCRAMBLE', () => {
  const armed = { ...createState(resultsConfig()), phase: 'ARMED' };
  for (const phase of ['ARMED', 'RUNNING', 'PENDING', 'RESULTS']) {
    const state = command({ ...armed, phase }, 'results', 7000);
    assert.equal(state.phase, phase, `${phase} must ignore results`);
  }
});

test('results clears the verdict, so F during one ends it at once', () => {
  const state = command({ ...createState(resultsConfig()), lastDecision: { kind: 'OK', at: 10 } }, 'results', 7000);
  assert.equal(state.lastDecision, null);
});

test('N from RESULTS calls the university at teamIndex, as from STANDBY', () => {
  const results = command(createState(resultsConfig()), 'results', 7000);
  const state = command(results, 'next');
  assert.equal(state.phase, 'SCRAMBLE');
  assert.equal(state.teamIndex, 0);
  assert.equal(state.resultsAt, null);
});

test('undo from RESULTS reopens the last attempt and clears resultsAt', () => {
  const attempts = [
    { teamId: 'intec', attempt: 1, ms: 84020, penalty: null, status: 'OK', scramble: 'R U', inspectionMs: null, at: 5 },
  ];
  const results = command(createState(resultsConfig(), attempts), 'results', 7000);
  const state = command(results, 'undo');
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.pendingMs, 84020);
  assert.equal(state.resultsAt, null);
});

test('RESULTS ignores the mat and every decision key', () => {
  const results = command(createState(resultsConfig()), 'results', 7000);
  for (const name of ['accept', 'plus2', 'dnf', 'redo', 'startInspection', 'cancelInspection']) {
    assert.equal(command(results, name).phase, 'RESULTS', `${name} must not move RESULTS`);
  }
  const mat = reduce(results, { type: 'mat', state: { on: true, running: false, time_milli: 0, signalHeader: 'I' }, at: 8000 });
  assert.equal(mat.phase, 'RESULTS');
  assert.equal(mat.resultsAt, 7000);
});
