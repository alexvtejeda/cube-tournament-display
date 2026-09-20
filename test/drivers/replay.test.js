// The scripted scenarios of system design §9 and UI spec §5.8 and §7.9, replayed through the reducer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduce } from '../../js/core/run-state.js';
import { buildSnapshot } from '../../js/core/snapshot.js';
import { suggestedPenalty } from '../../js/core/inspection.js';
import { SCENARIOS, handsDown, packet, sequence, solve, startAfter } from '../../js/drivers/scenarios.js';
import { makeConfig } from '../helpers/fixtures.js';
import { apply, cmd, mat, replay } from '../helpers/actions.js';

const config = makeConfig();
const armed = () => apply(createState(config), cmd('next'), mat(packet('I', 0)));
const upTo = (steps, t) => steps.filter((s) => s.t < t);

test('clean solve: PENDING on the stopped time, recorded on Space', () => {
  const state = replay(armed(), { steps: SCENARIOS.cleanSolve() });
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.pendingMs, 8000);
  assert.equal(reduce(state, cmd('accept')).event.attempts[0].ms, 8000);
});

test('false start: lands in PENDING, and R voids it', () => {
  const state = replay(armed(), { steps: SCENARIOS.falseStart() });
  assert.equal(state.pendingMs, 300);
  const redone = reduce(state, cmd('redo'));
  assert.equal(redone.phase, 'SCRAMBLE');
  assert.equal(redone.event.attempts.length, 0);
});

test('mat bump: a start with no hands still lands in PENDING, never in the standings', () => {
  const state = replay(armed(), { steps: SCENARIOS.matBump() });
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.event.attempts.length, 0);
});

test('reset mid-solve: not a finish; the solve that follows is the one that counts', () => {
  const steps = SCENARIOS.resetMidSolve();
  const firstReset = steps.find((s) => s.state.signalHeader === 'I').t;
  const afterReset = replay(armed(), { steps: upTo(steps, firstReset + 100) });
  assert.equal(afterReset.phase, 'RUNNING');
  const state = replay(armed(), { steps });
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.pendingMs, 6000);
});

test('cutoff overrun: nothing stops at 5:00; the operator decides once the timer stops', () => {
  const steps = SCENARIOS.cutoffOverrun();
  const stop = steps.find((s) => s.state.signalHeader === 'S').t;
  const late = replay(armed(), { steps: upTo(steps, stop) });
  assert.equal(late.phase, 'RUNNING');
  assert.ok(buildSnapshot(late, 0).displayMs > config.cutoffMs);
  const state = replay(armed(), { steps });
  assert.equal(state.pendingMs, 301000);
  assert.equal(reduce(state, cmd('dnf')).event.attempts[0].status, 'DNF');
});

test('signal loss during a run: the clock freezes, then the solve finishes normally', () => {
  const steps = SCENARIOS.signalLossDuringRun();
  const lostAt = steps.find((s) => !s.state.on).t;
  const during = replay(armed(), { steps: upTo(steps, lostAt + 500) });
  assert.equal(during.phase, 'RUNNING');
  assert.equal(during.signalOn, false);
  assert.equal(buildSnapshot(during, 0).displayMs, 1900);
  const state = replay(armed(), { steps });
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.pendingMs, 8000);
});

test('signal loss while waiting: nothing is recorded and nothing moves', () => {
  const start = createState(config);
  const steps = SCENARIOS.signalLossDuringStandby();
  const during = replay(start, { steps: upTo(steps, 1000) });
  assert.equal(during.signalOn, false);
  const state = replay(start, { steps });
  assert.equal(state.phase, 'STANDBY');
  assert.equal(state.signalOn, true);
  assert.equal(state.event.attempts.length, 0);
});

test('inspection: a start inside 15 s suggests nothing', () => {
  const state = replay(armed(), { steps: startAfter(10000), commands: [{ t: 0, command: 'startInspection' }] });
  assert.equal(state.inspectionMs, 10000);
  assert.equal(suggestedPenalty(state.inspectionMs), null);
});

test('inspection: a start between 15 and 17 s suggests +2', () => {
  const state = replay(armed(), { steps: startAfter(16000), commands: [{ t: 0, command: 'startInspection' }] });
  assert.equal(suggestedPenalty(state.inspectionMs), '+2');
});

test('inspection: a start after 17 s suggests DNF, and nothing stopped the competitor', () => {
  const state = replay(armed(), { steps: startAfter(18000), commands: [{ t: 0, command: 'startInspection' }] });
  assert.equal(state.phase, 'PENDING');
  assert.equal(suggestedPenalty(state.inspectionMs), 'DNF');
});

test('inspection never started: the solve runs and nothing is suggested', () => {
  const state = replay(armed(), { steps: sequence(handsDown(), solve(5000)) });
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.inspectionMs, null);
});

test('hands down, then lifted before green: ARMED throughout, hands back to up', () => {
  const steps = SCENARIOS.handsLiftedBeforeGreen();
  const down = replay(armed(), { steps: upTo(steps, 100) });
  assert.equal(buildSnapshot(down, 0).hands, 'down');
  const state = replay(armed(), { steps });
  assert.equal(state.phase, 'ARMED');
  assert.equal(buildSnapshot(state, 0).hands, 'up');
});

test('clean solve, then each key: the verdict the room is shown', () => {
  const state = replay(armed(), { steps: SCENARIOS.cleanSolve() });
  for (const [command, kind] of [['accept', 'OK'], ['plus2', '+2'], ['dnf', 'DNF'], ['redo', 'REDO']]) {
    const decided = reduce(state, cmd(command, 60000));
    assert.deepEqual(buildSnapshot(decided, 60000).verdict, { kind, teamId: 'alfa', attempt: 1, ms: 8000, reason: null }, command);
  }
});

test('cutoff overrun, then D: the verdict names the cutoff', () => {
  const state = reduce(replay(armed(), { steps: SCENARIOS.cutoffOverrun() }), cmd('dnf', 400000));
  assert.equal(buildSnapshot(state, 400000).verdict.reason, 'CUTOFF');
});

test('a start past 17 s of inspection, then D: the verdict names the inspection', () => {
  const state = replay(armed(), { steps: startAfter(18000), commands: [{ t: 0, command: 'startInspection' }] });
  assert.equal(buildSnapshot(reduce(state, cmd('dnf', 60000)), 60000).verdict.reason, 'INSPECTION');
});
