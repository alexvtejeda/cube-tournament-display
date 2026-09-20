// Mock StackMat driver (system design §4): replays scenarios from ./scenarios.js behind the same
// interface as the real driver, so the core cannot tell them apart. Like a real mat it sends a
// packet every 100 ms, and it keeps repeating its last state once a scenario ends.
import { PACKET_MS, packetBits, packetBytes } from './scenarios.js';

export function createMockDriver() {
  let listener = () => {};
  let timer = null;
  let queue = [];
  let current = null;
  let elapsed = 0;
  let running = false;

  function tick() {
    while (queue.length > 0 && queue[0].t <= elapsed) current = queue.shift().state;
    if (current !== null) listener({ ...current });
    elapsed += PACKET_MS;
  }

  return {
    async start() {
      if (timer === null) timer = setInterval(tick, PACKET_MS);
      running = true;
    },
    stop() {
      clearInterval(timer);
      timer = null;
      running = false;
    },
    // True once start() has been called and the driver is running. False before the first start(),
    // and false again if start() rejected: "never started" and "started and failed" are different
    // states, and only the first is `waiting` (operator spec §4.3).
    connected() {
      return running === true;
    },
    onState(callback) {
      listener = callback;
    },
    // A synthesised trace of the packet playing now, so SIGNAL CHECK (operator spec §3.6) can be
    // rehearsed on a machine with no microphone. 48 kHz is what a browser's AudioContext usually
    // runs at; the screen derives the rate from the sample's own length, so the exact figure only
    // has to be plausible.
    getSample(seconds, callback) {
      const rate = 48000;
      const perBit = Math.round(rate / 1200);
      const bits = current === null ? [] : packetBits(current);
      const bytes = current === null ? [] : packetBytes(current);
      const raw = [];
      const bin = [];
      for (let i = 0; i < Math.round(seconds * rate); i += 1) {
        // The packet's bits, then idle for the rest of the 100 ms it shares with the next packet.
        const index = Math.floor(i / perBit) % 120;
        const bit = index < bits.length ? bits[index] : 1;
        bin.push(bit);
        raw.push(bit ? 1 : -1);
      }
      callback({ raw, bin, bits, bytes });
    },
    async listDevices() {
      return [['mock', 'Mock mat']];
    },
    // Plays a scenario from the next packet on, replacing whatever was playing.
    play(steps) {
      queue = [...steps];
      elapsed = 0;
    },
  };
}
