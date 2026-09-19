import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEvent, undoLast } from '../../js/core/event-model.js';
import { audienceStandings, effectiveMs, latestResult, standings } from '../../js/core/scoring.js';
import { attempt, dnf, makeConfig, plus2 } from '../helpers/fixtures.js';

const config = makeConfig(); // alfa, beta, gamma, delta
const ids = (rows) => rows.map((r) => r.teamId);

test('effectiveMs adds two seconds for +2', () => {
  assert.equal(effectiveMs(attempt('alfa', 1, 10000)), 10000);
  assert.equal(effectiveMs(plus2('alfa', 1, 10000)), 12000);
});

test('ranked by best effective time, with +2 applied', () => {
  const event = createEvent(config, [
    attempt('alfa', 1, 30000),
    plus2('beta', 1, 19000),   // 21.00 effective
    attempt('gamma', 1, 20000),
  ]);
  const table = standings(event);
  assert.deepEqual(ids(table), ['gamma', 'beta', 'alfa', 'delta']);
  assert.deepEqual(table.map((r) => r.position), [1, 2, 3, null]);
  assert.deepEqual(table.map((r) => r.bestMs), [20000, 21000, 30000, null]);
});

test('a tie on best time breaks on second best, then on roster order', () => {
  const event = createEvent(config, [
    attempt('alfa', 1, 20000), attempt('alfa', 2, 40000),
    attempt('beta', 1, 20000), attempt('beta', 2, 30000),
    attempt('gamma', 1, 20000),                            // no second time
    attempt('delta', 1, 20000),                            // no second time either
  ]);
  assert.deepEqual(ids(standings(event)), ['beta', 'alfa', 'gamma', 'delta']);
});

test('DNFs are skipped, never poison the score', () => {
  const event = createEvent(config, [dnf('alfa', 1), attempt('alfa', 2, 25000), dnf('alfa', 3)]);
  assert.deepEqual(standings(event)[0], { teamId: 'alfa', group: 'ranked', position: 1, bestMs: 25000 });
});

test('all-DNF is unranked, no attempts is pending, and neither has a position', () => {
  const event = createEvent(config, [dnf('beta', 1), dnf('beta', 2), attempt('delta', 1, 50000)]);
  const table = standings(event);
  assert.deepEqual(table.map((r) => [r.teamId, r.group, r.position]), [
    ['delta', 'ranked', 1],
    ['beta', 'unranked', null],
    ['alfa', 'pending', null],
    ['gamma', 'pending', null],
  ]);
});

test('audienceStandings keeps ranked rows only, at most eight', () => {
  const many = makeConfig(Array.from({ length: 12 }, (_, i) => `t${i}`));
  const event = createEvent(many, [
    ...Array.from({ length: 10 }, (_, i) => attempt(`t${i}`, 1, 10000 + i)),
    dnf('t10', 1),
  ]);
  const rows = audienceStandings(standings(event), 8);
  assert.equal(rows.length, 8);
  assert.ok(rows.every((r) => r.group === 'ranked'));
  assert.deepEqual(audienceStandings(standings(createEvent(many)), 8), []);
});

test('audienceStandings includes a university mid-turn once it has an OK time', () => {
  const event = createEvent(config, [attempt('alfa', 1, 30000)]);
  assert.deepEqual(ids(audienceStandings(standings(event))), ['alfa']);
});

test('latestResult is null until a university completes its attempts', () => {
  const event = createEvent(config, [attempt('alfa', 1, 30000), attempt('alfa', 2, 20000)]);
  assert.equal(latestResult(event), null);
});

test('latestResult describes the last completion, with its position from the full table', () => {
  const event = createEvent(config, [
    attempt('alfa', 1, 30000), attempt('alfa', 2, 20000), attempt('alfa', 3, 25000),
    attempt('beta', 1, 10000), attempt('beta', 2, 50000), attempt('beta', 3, 50000),
  ]);
  assert.deepEqual(latestResult(event), { teamId: 'beta', bestMs: 10000, position: 1 });
});

test('latestResult is re-derived after an undo', () => {
  const event = createEvent(config, [
    attempt('alfa', 1, 30000), attempt('alfa', 2, 20000), attempt('alfa', 3, 25000),
    attempt('beta', 1, 10000), attempt('beta', 2, 50000), attempt('beta', 3, 50000),
  ]);
  assert.deepEqual(latestResult(undoLast(event).event), { teamId: 'alfa', bestMs: 20000, position: 2 });
});

test('latestResult for an all-DNF university has no time and no position', () => {
  const event = createEvent(config, [dnf('gamma', 1), dnf('gamma', 2), dnf('gamma', 3)]);
  assert.deepEqual(latestResult(event), { teamId: 'gamma', bestMs: null, position: null });
});
