import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRealDriver } from '../../js/drivers/real.js';
import { loadDecoder, packetBits, silence } from '../helpers/stackmat-signal.js';

function fakeDecoder() {
  const calls = [];
  return {
    calls,
    callback: null,
    setCallBack(fn) { this.callback = fn; },
    stop() { calls.push(['stop']); },
    async init(...args) { calls.push(['init', ...args]); },
    getSample(seconds, cb) { calls.push(['getSample', seconds]); cb('sample'); },
    async updateInputDevices() { return [['dev1', 'Line in']]; },
  };
}

test('start re-initialises the decoder for StackMat on the chosen device', async () => {
  const decoder = fakeDecoder();
  await createRealDriver({ decoder, permissions: undefined }).start('dev1');
  assert.deepEqual(decoder.calls, [['stop'], ['init', 's', 'dev1', true]]);
});

test('start rejects when microphone permission is denied', async () => {
  const permissions = { query: async () => ({ state: 'denied' }) };
  const driver = createRealDriver({ decoder: fakeDecoder(), permissions });
  await assert.rejects(driver.start(), /permission denied/);
});

test('each state is copied, so the decoder mutating it later changes nothing', () => {
  const decoder = fakeDecoder();
  const driver = createRealDriver({ decoder, permissions: undefined });
  const seen = [];
  driver.onState((state) => seen.push(state));
  const state = { on: true, signalHeader: 'A' };
  decoder.callback(state);
  state.on = false;
  decoder.callback(state);
  assert.deepEqual(seen.map((s) => s.on), [true, false]);
  // The second call is the same object again: a re-emission, not a packet.
  assert.deepEqual(seen.map((s) => s.fresh), [true, false]);
  decoder.callback({ on: true, signalHeader: 'C' });
  assert.equal(seen.at(-1).fresh, true);
});

test('listDevices and getSample pass through to the decoder', async () => {
  const decoder = fakeDecoder();
  const driver = createRealDriver({ decoder, permissions: undefined });
  assert.deepEqual(await driver.listDevices(), [['dev1', 'Line in']]);
  driver.getSample(0.5, (sample) => assert.equal(sample, 'sample'));
  assert.deepEqual(decoder.calls.at(-1), ['getSample', 0.5]);
});

test('the vendored decoder, behind the shim, turns a StackMat signal into states', async () => {
  const { decoder, feed } = await loadDecoder();
  const driver = createRealDriver({ decoder, permissions: undefined });
  const seen = [];
  driver.onState((state) => seen.push(state));
  await driver.start();
  feed(packetBits('I', 0)); // the first packet only synchronises the decoder
  feed(packetBits('I', 0));
  feed(packetBits('A', 0));
  feed(packetBits(' ', 1230));
  feed(packetBits(' ', 1330));
  feed(packetBits('S', 1330));
  feed(silence(200)); // no packets for 200 bits: the decoder reports the signal lost
  assert.deepEqual(
    seen.map((s) => [s.on, s.signalHeader, s.time_milli, s.running]),
    [
      [true, 'I', 0, false],
      [true, 'A', 0, false],
      [true, ' ', 1230, true],
      [true, ' ', 1330, true],
      [true, 'S', 1330, false],
      [false, 'S', 1330, false],
    ],
  );
  assert.equal(seen[1].greenLight, true);
});
