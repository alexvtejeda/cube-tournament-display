import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduce } from '../../js/core/run-state.js';
import { STANDINGS_UPDATE_MS, VERDICT_MS, buildSnapshot } from '../../js/core/snapshot.js';
import { packet } from '../../js/drivers/scenarios.js';
import { attempt, dnf, makeConfig } from '../helpers/fixtures.js';
import { apply, cmd, mat } from '../helpers/actions.js';

const config = makeConfig();
const armed = () => apply(createState(config), cmd('next'), mat(packet('I', 0)));
// PENDING on `ms` for the university N calls next.
const pending = (state, ms) => apply(reduce(state, cmd('next')), mat(packet('I', 0)), mat(packet(' ', 100, true)), mat(packet('S', ms)));

test('STANDBY at the start: no competitor, no result, nothing started', () => {
  const snapshot = buildSnapshot(createState(config), 0);
  assert.equal(snapshot.phase, 'STANDBY');
  assert.equal(snapshot.competitor, null);
  assert.equal(snapshot.result, null);
  assert.equal(snapshot.startedCount, 0);
  assert.deepEqual(snapshot.standings, []);
  assert.equal(snapshot.teams.length, 4);
  assert.deepEqual(snapshot.signal, { on: false });
  assert.equal(snapshot.verdict, null);
  assert.equal(snapshot.standingsBefore, null);
});

test('SCRAMBLE carries the competitor, the attempt and the scramble', () => {
  const state = apply(createState(config), cmd('next'), { type: 'scramble', seq: 1, scramble: "R U R'", svg: '<svg/>' });
  const snapshot = buildSnapshot(state, 0);
  assert.equal(snapshot.competitor.id, 'alfa');
  assert.equal(snapshot.attemptNo, 1);
  assert.equal(snapshot.startedCount, 1);
  assert.equal(snapshot.scramble, "R U R'");
  assert.equal(snapshot.scrambleSvg, '<svg/>');
  assert.equal(snapshot.displayMs, null);
});

test('ARMED: inspectionMs is measured from the key press to now', () => {
  assert.equal(buildSnapshot(armed(), 5000).inspectionMs, null);
  const state = apply(armed(), cmd('startInspection', 1000));
  assert.equal(buildSnapshot(state, 7200).inspectionMs, 6200);
});

test('hands follow the header, and read up when the signal is lost', () => {
  assert.equal(buildSnapshot(apply(armed(), mat(packet('C', 0))), 0).hands, 'down');
  assert.equal(buildSnapshot(apply(armed(), mat(packet('A', 0))), 0).hands, 'ready');
  assert.equal(buildSnapshot(apply(armed(), mat(packet('L', 0))), 0).hands, 'up');
  const lost = apply(armed(), mat(packet('A', 0)), mat({ ...packet('A', 0), on: false }));
  assert.equal(buildSnapshot(lost, 0).hands, 'up');
});

test('RUNNING shows the mat time; PENDING shows the stopped time', () => {
  const running = apply(armed(), mat(packet(' ', 4200, true)));
  assert.equal(buildSnapshot(running, 0).displayMs, 4200);
  assert.equal(buildSnapshot(running, 0).inspectionMs, null);
  const pending = apply(running, mat(packet('S', 8120)));
  assert.equal(buildSnapshot(pending, 0).displayMs, 8120);
});

test('standings are the audience slice; result is the latest completion', () => {
  const state = createState(config, [
    attempt('alfa', 1, 30000), attempt('alfa', 2, 20000), attempt('alfa', 3, 25000),
    dnf('beta', 1),
  ]);
  const snapshot = buildSnapshot(state, 0);
  assert.deepEqual(snapshot.standings, [{ teamId: 'alfa', group: 'ranked', position: 1, bestMs: 20000 }]);
  assert.deepEqual(snapshot.result, { teamId: 'alfa', bestMs: 20000, position: 1 });
  assert.equal(snapshot.startedCount, 2);
});

test('a snapshot survives structured cloning, as BroadcastChannel requires', () => {
  const snapshot = buildSnapshot(apply(armed(), cmd('startInspection', 0)), 3000);
  assert.deepEqual(structuredClone(snapshot), snapshot);
});

test('the verdict shows from the key until VERDICT_MS later', () => {
  const decided = reduce(pending(createState(config), 12470), cmd('plus2', 1000));
  assert.deepEqual(buildSnapshot(decided, 1000 + 2999).verdict, { kind: '+2', teamId: 'alfa', attempt: 1, ms: 12470, reason: null });
  assert.equal(buildSnapshot(decided, 1000 + 3000).verdict, null);
  assert.equal(VERDICT_MS, 3000);
});

test('until STANDINGS_UPDATE_MS, standingsBefore is the board without the decided attempt', () => {
  const before = createState(config, [attempt('alfa', 1, 20000), attempt('alfa', 2, 21000), attempt('alfa', 3, 22000)]);
  const decided = reduce(pending(before, 10000), cmd('accept', 1000));
  const waiting = buildSnapshot(decided, 1000 + 4199);
  assert.deepEqual(waiting.standingsBefore, buildSnapshot(before, 0).standings);
  assert.deepEqual(waiting.standings.map((row) => row.teamId), ['beta', 'alfa']);
  assert.equal(buildSnapshot(decided, 1000 + 4200).standingsBefore, null);
  assert.equal(STANDINGS_UPDATE_MS, 4200);
});

test('a redo shows a verdict but has no standings to update', () => {
  const redone = reduce(pending(createState(config), 12470), cmd('redo', 1000));
  assert.equal(buildSnapshot(redone, 1000).verdict.kind, 'REDO');
  assert.equal(buildSnapshot(redone, 1000).standingsBefore, null);
});
