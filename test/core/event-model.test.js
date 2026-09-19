import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attemptsFor, createEvent, findTeam, isComplete, nextAttemptNo, recordAttempt, startedCount, undoLast,
} from '../../js/core/event-model.js';
import { attempt, makeConfig } from '../helpers/fixtures.js';

const config = makeConfig(); // alfa, beta, gamma, delta · 3 attempts each

test('attemptsFor keeps one university in recorded order', () => {
  const event = createEvent(config, [attempt('alfa', 1, 10000), attempt('beta', 1, 20000), attempt('alfa', 2, 9000)]);
  assert.deepEqual(attemptsFor(event, 'alfa').map((a) => a.ms), [10000, 9000]);
  assert.deepEqual(attemptsFor(event, 'gamma'), []);
});

test('nextAttemptNo and isComplete follow the attempts recorded', () => {
  let event = createEvent(config);
  assert.equal(nextAttemptNo(event, 'alfa'), 1);
  event = recordAttempt(event, attempt('alfa', 1, 10000));
  event = recordAttempt(event, attempt('alfa', 2, 10000));
  assert.equal(nextAttemptNo(event, 'alfa'), 3);
  assert.equal(isComplete(event, 'alfa'), false);
  event = recordAttempt(event, attempt('alfa', 3, 10000));
  assert.equal(isComplete(event, 'alfa'), true);
});

test('recordAttempt leaves the original event untouched', () => {
  const event = createEvent(config);
  const next = recordAttempt(event, attempt('alfa', 1, 10000));
  assert.equal(event.attempts.length, 0);
  assert.equal(next.attempts.length, 1);
});

test('undoLast takes back the most recent attempt of any university', () => {
  const event = createEvent(config, [attempt('alfa', 1, 10000), attempt('beta', 1, 20000)]);
  const { event: after, attempt: undone } = undoLast(event);
  assert.equal(undone.teamId, 'beta');
  assert.deepEqual(after.attempts.map((a) => a.teamId), ['alfa']);
  assert.equal(undoLast(createEvent(config)), null);
});

test('findTeam walks the roster, skipping finished universities and wrapping', () => {
  const done = (id) => [1, 2, 3].map((n) => attempt(id, n, 10000));
  const event = createEvent(config, [...done('alfa'), ...done('gamma')]);
  assert.equal(findTeam(event, 0, 1), 1);   // alfa is done → beta
  assert.equal(findTeam(event, 2, 1), 3);   // gamma is done → delta
  assert.equal(findTeam(event, 4, 1), 1);   // past the end wraps to the start
  assert.equal(findTeam(event, -1, -1), 3); // ← from the first university wraps to the last
  assert.equal(findTeam(event, 2, -1), 1);
});

test('findTeam returns -1 when every university is done', () => {
  const all = config.teams.flatMap((t) => [1, 2, 3].map((n) => attempt(t.id, n, 10000)));
  assert.equal(findTeam(createEvent(config, all), 0, 1), -1);
});

test('startedCount counts universities with attempts plus the one on screen', () => {
  const empty = createEvent(config);
  assert.equal(startedCount(empty, null), 0);
  assert.equal(startedCount(empty, 'alfa'), 1);
  const event = createEvent(config, [attempt('alfa', 1, 10000), attempt('beta', 1, 10000)]);
  assert.equal(startedCount(event, 'alfa'), 2);
  assert.equal(startedCount(event, 'gamma'), 3);
  assert.equal(startedCount(event, null), 2);
});
