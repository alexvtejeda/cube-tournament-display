// Reading what the decoder's getSample() hands back (operator spec §3.6, §3.7): where to start
// drawing the waveform, and the last whole packet inside the sample. A sample is
// { raw, bin, bits, bytes }: the signal after the decoder's gain control, its binarised copy, and
// the bits and bytes it read while collecting.
//
// Pure array arithmetic, so it runs under node --test with no audio.

export const IDLE_BITS = 10; // the decoder itself calls a run this long idle
export const LEAD_BITS = 8; // drawn before the packet's first edge
export const WINDOW_BITS = 120; // 100 ms at 1200 baud: one packet and the gap after it

// Returns the index of the first sample of the last packet that fits a whole window, or null when
// no idle run is found. `bin` is the decoder's binarised signal, one entry per sample.
export function findPacketStart(bin, samplesPerBit, windowBits = WINDOW_BITS) {
  const idle = Math.round(IDLE_BITS * samplesPerBit);
  const lead = Math.round(LEAD_BITS * samplesPerBit);
  const window = Math.round(windowBits * samplesPerBit);
  let run = 1;
  let best = null;
  for (let i = 1; i < bin.length; i++) {
    if (bin[i] === bin[i - 1]) { run++; continue; }
    if (run >= idle) {
      const start = i - lead;
      if (start >= 0 && start + window <= bin.length) best = start;
      else if (best === null && start >= 0) best = start; // the last one, even if the window runs short
    }
    run = 1;
  }
  return best;
}

// The window to draw: the trigger when there is one, otherwise the newest samples, so noise and
// hiss are drawn as they are.
export function windowFor(bin, samplesPerBit, windowBits = WINDOW_BITS) {
  const window = Math.min(bin.length, Math.round(windowBits * samplesPerBit));
  const start = findPacketStart(bin, samplesPerBit, windowBits);
  return start === null
    ? { start: bin.length - window, length: window, triggered: false }
    : { start, length: Math.min(window, bin.length - start), triggered: true };
}

// ── the last whole packet in a sample (spec §3.7) ────────────────────────────

const HEADERS = ' SILRCA'; // system design §4; every packet begins with one of these

// A packet is 9 or 10 bytes ending in \n \r. Returns the characters of the last complete one, or
// null when the sample caught none.
export function lastPacketBytes(bytes) {
  for (let end = bytes.length; end >= 9; end--) {
    if (bytes[end - 1] !== '\r' || bytes[end - 2] !== '\n') continue;
    // 10 first: in a 10-byte packet the byte 9 back is a digit, never a header.
    for (const size of [10, 9]) {
      const start = end - size;
      if (start >= 0 && HEADERS.includes(bytes[start])) return bytes.slice(start, end);
    }
  }
  return null;
}

// How those bytes are written on screen: the running header is a space, and the terminators are
// spelled out rather than drawn as gaps.
export function byteText(bytes) {
  return bytes
    .map((byte) => (byte === ' ' ? '␣' : byte === '\n' ? '\\n' : byte === '\r' ? '\\r' : byte))
    .join(' ');
}
