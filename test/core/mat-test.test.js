import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doneCount, emptyTest, missingItems, tickTest } from '../../js/core/mat-test.js';
import { offline, packet } from '../../js/drivers/scenarios.js';

const fold = (states) => states.reduce(tickTest, emptyTest());

test('each item ticks from the packet that proves it', () => {
  const done = fold([
    packet('I', 0), packet('L', 0), packet('R', 0), packet('C', 0), packet('A', 0),
    packet(' ', 1230, true), packet(' ', 4560, true), packet('S', 6440), packet('I', 0),
  ]);
  assert.deepEqual(
    { ...done, wasRunning: undefined },
    { left: true, right: true, green: true, start: true, stop: true, reset: true, wasRunning: undefined },
  );
  assert.equal(doneCount(done), 6);
  assert.deepEqual(missingItems(done), []);
});

test('one hand alone ticks only its own item', () => {
  const left = fold([packet('L', 0)]);
  assert.equal(left.left, true);
  assert.equal(left.right, false);
  assert.equal(left.green, false);
  const right = fold([packet('R', 0)]);
  assert.equal(right.right, true);
  assert.equal(right.left, false);
});

test('a reset mid-solve does not tick Para, and 0.00 still ticks the reset', () => {
  const done = fold([packet(' ', 1230, true), packet('I', 0)]);
  assert.equal(done.start, true);
  assert.equal(done.stop, false, 'the non-zero guard: a reset is not a stop');
  assert.equal(done.reset, true);
});

test('the reset only counts after a start or a stop', () => {
  const done = fold([packet('I', 0), packet('S', 0)]);
  assert.equal(done.reset, false);
});

test('a state with on false proves nothing', () => {
  const started = fold([packet(' ', 1230, true)]);
  const lost = tickTest(started, offline(packet('S', 6440)));
  assert.equal(lost, started, 'the same object: nothing changed');
  assert.equal(lost.stop, false);
});

test('a repeated packet returns the same object', () => {
  const once = fold([packet('A', 0)]);
  assert.equal(tickTest(once, packet('A', 0)), once);
});

test('missingItems reads in the order of the screen', () => {
  const done = fold([packet('L', 0)]);
  assert.deepEqual(missingItems(done), ['mano derecha', 'luz verde', 'arranca', 'para', 'vuelve a 0.00']);
  assert.equal(doneCount(done), 1);
});
