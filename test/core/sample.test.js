import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byteText, findPacketStart, IDLE_BITS, lastPacketBytes, LEAD_BITS, windowFor, WINDOW_BITS } from '../../js/core/sample.js';

const SPB = 40; // samples per bit at 48 kHz and 1200 baud

// A binarised line: `idleBits` of idle, then a packet's bits, then idle to the end.
function line({ idleBits, packetBits, tailBits }) {
  const bits = [
    ...Array(idleBits).fill(1),
    ...Array.from({ length: packetBits }, (_, i) => (i % 3 === 0 ? 0 : 1)),
    ...Array(tailBits).fill(1),
  ];
  return bits.flatMap((b) => Array(SPB).fill(b));
}

test('the trigger sits a fixed lead before the first edge after an idle run', () => {
  const bin = line({ idleBits: 30, packetBits: 90, tailBits: 60 });
  assert.equal(findPacketStart(bin, SPB), (30 - LEAD_BITS) * SPB);
});

test('a run shorter than the decoder\'s idle does not trigger', () => {
  const bin = line({ idleBits: IDLE_BITS - 1, packetBits: 90, tailBits: 200 });
  assert.equal(findPacketStart(bin, SPB), null);
});

test('with two packets in the sample, the later one wins if its window fits', () => {
  const first = line({ idleBits: 30, packetBits: 90, tailBits: 0 });
  const second = line({ idleBits: 30, packetBits: 90, tailBits: 120 });
  const bin = [...first, ...second];
  const expected = (120 + 30 - LEAD_BITS) * SPB;
  assert.equal(findPacketStart(bin, SPB), expected);
  assert.ok(expected + WINDOW_BITS * SPB <= bin.length, 'a whole window fits after it');
});

test('windowFor reports a triggered window of one packet and the gap after it', () => {
  const bin = line({ idleBits: 30, packetBits: 90, tailBits: 120 });
  const w = windowFor(bin, SPB);
  assert.equal(w.triggered, true);
  assert.equal(w.start, (30 - LEAD_BITS) * SPB);
  assert.equal(w.length, WINDOW_BITS * SPB);
});

test('with nothing to lock onto, it draws the newest samples as they are', () => {
  const noise = Array.from({ length: WINDOW_BITS * SPB * 2 }, (_, i) => i % 2);
  const w = windowFor(noise, SPB);
  assert.equal(w.triggered, false);
  assert.equal(w.start, noise.length - WINDOW_BITS * SPB);
  assert.equal(w.length, WINDOW_BITS * SPB);
});

test('a sample shorter than the window is drawn whole', () => {
  const noise = Array.from({ length: 500 }, (_, i) => i % 2);
  const w = windowFor(noise, SPB);
  assert.equal(w.start, 0);
  assert.equal(w.length, 500);
});

// ── the last whole packet in a sample (spec §3.7) ────────────────────────────

const bytesOf = (header, digits) => {
  const sum = String.fromCharCode(64 + [...digits].reduce((a, d) => a + +d, 0));
  return [header, ...digits, sum, '\n', '\r'];
};

test('a nine-byte packet is read back whole', () => {
  const bytes = bytesOf('A', '00000');
  assert.deepEqual(lastPacketBytes(bytes), bytes);
  assert.equal(byteText(bytes), 'A 0 0 0 0 0 @ \\n \\r');
});

test('a ten-byte packet is preferred over its last nine bytes', () => {
  const bytes = bytesOf(' ', '012345');
  assert.equal(bytes.length, 10);
  assert.deepEqual(lastPacketBytes(bytes), bytes);
  assert.equal(byteText(bytes).slice(0, 3), '␣ 0');
});

test('with two packets in the sample, the last one is read', () => {
  const first = bytesOf('I', '00000');
  const second = bytesOf('S', '00644');
  assert.deepEqual(lastPacketBytes([...first, ...second]), second);
});

test('a sample that caught no whole packet reads as none', () => {
  assert.equal(lastPacketBytes([]), null);
  assert.equal(lastPacketBytes(['0', '0', '@', '\n', '\r']), null, 'too short to be a packet');
  assert.equal(lastPacketBytes(bytesOf('A', '00000').slice(0, -1)), null, 'no terminator yet');
});
