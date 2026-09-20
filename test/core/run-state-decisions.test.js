import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduce } from '../../js/core/run-state.js';
import { packet } from '../../js/drivers/scenarios.js';
import { attempt, makeConfig } from '../helpers/fixtures.js';
import { apply, cmd, mat } from '../helpers/actions.js';

const config = makeConfig(); // alfa, beta, gamma, delta · 3 attempts

// Drives the current university from SCRAMBLE to PENDING with the given time.
const solveTo = (state, ms, at = 0) => apply(
  state,
  { type: 'scramble', seq: state.scrambleSeq, scramble: "R U R'", svg: '<svg/>' },
  mat(packet('I', 0), at),
  mat(packet(' ', 100, true), at),
  mat(packet('S', ms), at),
);

const pending = (ms = 12470) => solveTo(reduce(createState(config), cmd('next')), ms);

// PENDING on `ms`, after `inspectionMs` of inspection.
const inspected = (ms, inspectionMs) => apply(
  createState(config),
  cmd('next'),
  { type: 'scramble', seq: 1, scramble: "R U R'", svg: '<svg/>' },
  mat(packet('I', 0)),
  cmd('startInspection', 0),
  mat(packet(' ', 100, true), inspectionMs),
  mat(packet('S', ms)),
);

test('Space in PENDING records the attempt as OK and calls the next one', () => {
  const state = reduce(pending(12470), cmd('accept', 99));
  assert.deepEqual(state.event.attempts, [{
    teamId: 'alfa', attempt: 1, ms: 12470, penalty: null, status: 'OK',
    scramble: "R U R'", inspectionMs: null, at: 99,
  }]);
  assert.equal(state.phase, 'SCRAMBLE');
  assert.equal(state.attemptNo, 2);
  assert.equal(state.scramble, null);
  assert.equal(state.pendingMs, null);
});

test('D records a DNF and keeps the time for the record', () => {
  const [recorded] = reduce(pending(12470), cmd('dnf')).event.attempts;
  assert.equal(recorded.status, 'DNF');
  assert.equal(recorded.ms, 12470);
  assert.equal(recorded.penalty, null);
});

test('2 records the time with a +2 penalty', () => {
  const [recorded] = reduce(pending(12470), cmd('plus2')).event.attempts;
  assert.equal(recorded.status, 'OK');
  assert.equal(recorded.penalty, '+2');
});

test('the inspection time is written onto the recorded attempt', () => {
  const armed = apply(createState(config), cmd('next'), mat(packet('I', 0)), cmd('startInspection', 1000));
  const state = apply(armed, mat(packet(' ', 100, true), 16500), mat(packet('S', 9000), 25000), cmd('accept'));
  assert.equal(state.event.attempts[0].inspectionMs, 15500);
});

test('R voids the time: same attempt again, new scramble, nothing recorded', () => {
  const before = pending();
  const state = reduce(before, cmd('redo'));
  assert.equal(state.phase, 'SCRAMBLE');
  assert.equal(state.attemptNo, 1);
  assert.equal(state.event.attempts.length, 0);
  assert.equal(state.scramble, null);
  assert.equal(state.scrambleSeq, before.scrambleSeq + 1);
});

test('the last attempt of a university ends in STANDBY', () => {
  let state = reduce(createState(config), cmd('next'));
  for (let n = 1; n <= 3; n += 1) state = reduce(solveTo(state, 10000 * n), cmd('accept'));
  assert.equal(state.phase, 'STANDBY');
  assert.equal(state.event.attempts.length, 3);
  assert.equal(state.attemptNo, null);
});

test('N from STANDBY after a completion calls the next university', () => {
  let state = reduce(createState(config), cmd('next'));
  for (let n = 1; n <= 3; n += 1) state = reduce(solveTo(state, 10000), cmd('accept'));
  state = reduce(state, cmd('next'));
  assert.equal(state.teamIndex, 1);
  assert.equal(state.attemptNo, 1);
});

test('PENDING is a gate: N, arrows and undo are ignored until a decision', () => {
  const state = pending();
  for (const command of ['next', 'nextTeam', 'prevTeam', 'undo', 'startInspection']) {
    assert.equal(reduce(state, cmd(command)), state, command);
  }
});

test('RUNNING ignores every command', () => {
  const running = apply(createState(config), cmd('next'), mat(packet('I', 0)), mat(packet(' ', 100, true)));
  for (const command of ['next', 'nextTeam', 'prevTeam', 'undo', 'accept', 'dnf', 'plus2', 'redo']) {
    assert.equal(reduce(running, cmd(command)), running, command);
  }
});

test('← and → skip around the roster and wrap', () => {
  const scramble = reduce(createState(config), cmd('next')); // alfa
  assert.equal(reduce(scramble, cmd('nextTeam')).teamIndex, 1);
  assert.equal(reduce(scramble, cmd('prevTeam')).teamIndex, 3);
});

test('→ from the start of the event skips the first university; N does not', () => {
  const start = createState(config);
  assert.equal(reduce(start, cmd('nextTeam')).teamIndex, 1);
  assert.equal(reduce(start, cmd('next')).teamIndex, 0);
});

test('a skipped university keeps its place: calling it again resumes at its next attempt', () => {
  const state = apply(createState(config, [attempt('alfa', 1, 10000)]), cmd('nextTeam'), cmd('prevTeam'));
  assert.equal(state.teamIndex, 0);
  assert.equal(state.attemptNo, 2);
});

test('finished universities are skipped, and N does nothing once all are done', () => {
  const done = config.teams.slice(0, 3).flatMap((t) => [1, 2, 3].map((n) => attempt(t.id, n, 10000)));
  const state = reduce(createState(config, done), cmd('next'));
  assert.equal(state.teamIndex, 3);
  const all = createState(config, config.teams.flatMap((t) => [1, 2, 3].map((n) => attempt(t.id, n, 10000))));
  assert.equal(reduce(all, cmd('next')), all);
});

test('U reopens the last recorded attempt in PENDING with its time and scramble', () => {
  const accepted = reduce(pending(12470), cmd('accept'));
  const state = reduce(accepted, cmd('undo'));
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.event.attempts.length, 0);
  assert.equal(state.pendingMs, 12470);
  assert.equal(state.attemptNo, 1);
  assert.equal(state.scramble, "R U R'");
  assert.equal(state.scrambleSeq, accepted.scrambleSeq + 1);
  const corrected = reduce(state, cmd('dnf'));
  assert.equal(corrected.event.attempts[0].status, 'DNF');
});

test('U after a completion reopens that university from STANDBY', () => {
  let state = reduce(createState(config), cmd('next'));
  for (let n = 1; n <= 3; n += 1) state = reduce(solveTo(state, 10000), cmd('accept'));
  state = reduce(state, cmd('undo'));
  assert.equal(state.phase, 'PENDING');
  assert.equal(state.attemptNo, 3);
  assert.equal(state.teamIndex, 0);
});

test('U with nothing recorded does nothing', () => {
  const state = reduce(createState(config), cmd('next'));
  assert.equal(reduce(state, cmd('undo')), state);
});

test('each decision leaves a verdict: its kind, the attempt, the stopped time and the key time', () => {
  assert.equal(createState(config).lastDecision, null);
  for (const [command, kind] of [['accept', 'OK'], ['plus2', '+2'], ['dnf', 'DNF'], ['redo', 'REDO']]) {
    assert.deepEqual(reduce(pending(12470), cmd(command, 99)).lastDecision,
      { kind, teamId: 'alfa', attempt: 1, ms: 12470, reason: null, at: 99 }, command);
  }
});

test('a DNF past the cutoff names the cutoff; one exactly on it names nothing', () => {
  assert.equal(reduce(pending(300010), cmd('dnf')).lastDecision.reason, 'CUTOFF');
  assert.equal(reduce(pending(300000), cmd('dnf')).lastDecision.reason, null);
});

test('a DNF after more than 17 s of inspection names inspection; when both apply, the cutoff', () => {
  assert.equal(reduce(inspected(9000, 17001), cmd('dnf')).lastDecision.reason, 'INSPECTION');
  assert.equal(reduce(inspected(9000, 17000), cmd('dnf')).lastDecision.reason, null);
  assert.equal(reduce(inspected(300010, 17001), cmd('dnf')).lastDecision.reason, 'CUTOFF');
});

test('only a DNF has a reason', () => {
  for (const command of ['accept', 'plus2', 'redo']) {
    assert.equal(reduce(inspected(300010, 17001), cmd(command)).lastDecision.reason, null, command);
  }
});

test('N, ←, →, U and the mat reset into ARMED end the verdict; the mat still showing the time does not', () => {
  const decided = reduce(pending(), cmd('accept'));
  for (const command of ['next', 'nextTeam', 'prevTeam', 'undo']) {
    assert.equal(reduce(decided, cmd(command)).lastDecision, null, command);
  }
  assert.equal(reduce(decided, mat(packet('I', 0))).lastDecision, null);
  assert.notEqual(reduce(decided, mat(packet('S', 12470))).lastDecision, null);
});

test('a second Space or an Esc during the verdict changes nothing', () => {
  const decided = reduce(pending(), cmd('accept'));
  assert.equal(reduce(decided, cmd('startInspection')), decided);
  assert.equal(reduce(decided, cmd('cancelInspection')), decided);
});

test('disarm steps ARMED back to its own scramble, and does nothing anywhere else', () => {
  const armed = apply(
    createState(config),
    cmd('next'),
    { type: 'scramble', seq: 1, scramble: "R U R'", svg: '<svg/>' },
    mat(packet('I', 0)),
    cmd('startInspection', 0),
  );
  assert.equal(armed.phase, 'ARMED');
  const back = reduce(armed, cmd('disarm'));
  assert.equal(back.phase, 'SCRAMBLE');
  assert.equal(back.inspectionStartedAt, null);
  assert.equal(back.scramble, "R U R'", 'the competitor has not solved yet: the scramble stands');
  assert.equal(back.scrambleSeq, armed.scrambleSeq);
  assert.equal(back.attemptNo, armed.attemptNo);
  const standby = createState(config);
  assert.equal(reduce(standby, cmd('disarm')), standby);
  assert.equal(reduce(back, cmd('disarm')), back);
});
