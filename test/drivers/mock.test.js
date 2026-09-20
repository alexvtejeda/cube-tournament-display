import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockDriver } from '../../js/drivers/mock.js';
import { packet } from '../../js/drivers/scenarios.js';

function started(t) {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const driver = createMockDriver();
  const seen = [];
  driver.onState((state) => seen.push(state));
  driver.start();
  return { driver, seen, tick: (ms) => t.mock.timers.tick(ms) };
}

test('sends nothing until a scenario plays', (t) => {
  const { seen, tick } = started(t);
  tick(500);
  assert.equal(seen.length, 0);
});

test('plays a scenario one packet per 100 ms, then repeats the last state', (t) => {
  const { driver, seen, tick } = started(t);
  driver.play([{ t: 0, state: packet('I', 0) }, { t: 100, state: packet('C', 0) }]);
  tick(400);
  assert.deepEqual(seen.map((s) => s.signalHeader), ['I', 'C', 'C', 'C']);
});

test('a new scenario replaces the one playing', (t) => {
  const { driver, seen, tick } = started(t);
  driver.play([{ t: 0, state: packet('I', 0) }, { t: 1000, state: packet('C', 0) }]);
  tick(200);
  driver.play([{ t: 0, state: packet('A', 0) }]);
  tick(200);
  assert.deepEqual(seen.map((s) => s.signalHeader), ['I', 'I', 'A', 'A']);
});

test('emits copies, so a listener cannot change what comes next', (t) => {
  const { driver, seen, tick } = started(t);
  driver.play([{ t: 0, state: packet('I', 0) }]);
  tick(100);
  seen[0].on = false;
  tick(100);
  assert.equal(seen[1].on, true);
});

test('getSample draws the packet playing now, for the signal check', (t) => {
  const { driver, tick } = started(t);
  driver.play([{ t: 0, state: packet('A', 0) }]);
  tick(100);
  let sample = null;
  driver.getSample(0.2, (result) => { sample = result; });
  assert.equal(sample.raw.length, 9600);
  assert.equal(sample.bin.length, 9600);
  assert.deepEqual(sample.bytes, ['A', '0', '0', '0', '0', '0', '@', '\n', '\r']);
  assert.ok(sample.raw.some((value) => value === -1), 'the packet is in the trace, not just idle');
});

test('stop halts the packets', (t) => {
  const { driver, seen, tick } = started(t);
  driver.play([{ t: 0, state: packet('I', 0) }]);
  tick(200);
  driver.stop();
  tick(500);
  assert.equal(seen.length, 2);
});
