import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HANDS_MS, SCENARIOS, handsDown, packet, packetBits, packetBytes, sequence, startAfter, timing,
} from '../../js/drivers/scenarios.js';

test('packet derives hands and green light from the header, as the decoder does', () => {
  assert.deepEqual([packet('L', 0).leftHand, packet('L', 0).rightHand], [true, false]);
  assert.deepEqual([packet('R', 0).leftHand, packet('R', 0).rightHand], [false, true]);
  assert.deepEqual([packet('C', 0).leftHand, packet('C', 0).rightHand, packet('C', 0).greenLight], [true, true, false]);
  assert.equal(packet('A', 0).greenLight, true);
  assert.deepEqual([packet(' ', 10, true).leftHand, packet(' ', 10, true).running], [false, true]);
});

test('sequence plays parts back to back, one packet per 100 ms', () => {
  const steps = sequence(timing(0, 300), timing(300, 500));
  assert.deepEqual(steps.map((s) => s.t), [0, 100, 200, 300, 400]);
  assert.deepEqual(steps.map((s) => s.state.time_milli), [0, 100, 200, 300, 400]);
});

test('handsDown lasts HANDS_MS and ends on the green light', () => {
  const steps = handsDown();
  assert.equal(steps.length * 100, HANDS_MS);
  assert.equal(steps.at(-1).state.signalHeader, 'A');
});

test('startAfter starts the timer exactly `ms` in', () => {
  const firstRunning = startAfter(10000).find((s) => s.state.running);
  assert.equal(firstRunning.t, 10000);
});

test('a packet is nine bytes: the header, five digits, a checksum, then \\n \\r', () => {
  assert.deepEqual(packetBytes(packet('A', 0)), ['A', '0', '0', '0', '0', '0', '@', '\n', '\r']);
  assert.deepEqual(packetBytes(packet('S', 6440)).slice(0, 6), ['S', '0', '0', '6', '4', '4']);
});

test('its bits frame every byte with a start and a stop bit', () => {
  const bits = packetBits(packet('A', 0));
  assert.equal(bits.length, packetBytes(packet('A', 0)).length * 10);
  // 'A' is 0x41: a start bit, then 1 0 0 0 0 0 1 0 least significant first, then a stop bit.
  assert.deepEqual(bits.slice(0, 10), [0, 1, 0, 0, 0, 0, 0, 1, 0, 1]);
});

test('every named scenario is sorted by time and ends with the mat on', () => {
  for (const [name, build] of Object.entries(SCENARIOS)) {
    const steps = build();
    assert.ok(steps.every((s, i) => i === 0 || s.t > steps[i - 1].t), `${name} is sorted`);
    assert.equal(steps.at(-1).state.on, true, `${name} ends on`);
  }
});
