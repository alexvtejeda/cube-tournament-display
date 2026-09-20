// Runs the unmodified vendor/stackmat.js, with js/drivers/shim.js, inside a Node vm whose fake
// audio graph lets a test feed it a synthesized StackMat signal. This is the only way to exercise
// the decoder on a machine without a microphone.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const SAMPLE_RATE = 48000;
const SAMPLES_PER_BIT = SAMPLE_RATE / 1200; // the StackMat sends 1200 baud

export async function loadDecoder() {
  let processor = null;
  class FakeAudioContext {
    constructor() {
      this.sampleRate = SAMPLE_RATE;
      this.state = 'running';
      this.destination = {};
    }
    createMediaStreamSource() {
      return { connect() {}, disconnect() {} };
    }
    createScriptProcessor() {
      processor = { connect() {}, disconnect() {} };
      return processor;
    }
  }
  const context = vm.createContext({
    console,
    AudioContext: FakeAudioContext,
    navigator: { mediaDevices: { getUserMedia: async () => ({}) } },
  });
  context.window = context;
  for (const file of ['../../js/drivers/shim.js', '../../vendor/stackmat.js']) {
    vm.runInContext(readFileSync(new URL(file, import.meta.url), 'utf8'), context);
  }
  return {
    decoder: context.stackmat,
    // Plays a list of line levels (1 = idle/mark, 0 = space) into the decoder, one bit each.
    feed(bits) {
      const samples = new Float32Array(bits.length * SAMPLES_PER_BIT);
      bits.forEach((bit, i) => samples.fill(bit ? 1 : -1, i * SAMPLES_PER_BIT, (i + 1) * SAMPLES_PER_BIT));
      for (let i = 0; i < samples.length; i += 1024) {
        const chunk = new Float32Array(1024);
        chunk.set(samples.subarray(i, i + 1024));
        processor.onaudioprocess({ inputBuffer: { getChannelData: () => chunk } });
      }
    },
  };
}

// One 9-byte StackMat packet as line levels: header, five digits (m ss hh), checksum (64 + digit
// sum), CR, LF; each byte a UART frame (start 0, eight data bits LSB first, stop 1), after idle.
export function packetBits(header, ms) {
  const hundredths = Math.floor(ms / 10);
  const digits = [
    Math.floor(hundredths / 6000),
    Math.floor((hundredths % 6000) / 1000),
    Math.floor((hundredths % 1000) / 100),
    Math.floor((hundredths % 100) / 10),
    hundredths % 10,
  ];
  const checksum = String.fromCharCode(64 + digits.reduce((a, b) => a + b, 0));
  const bits = Array(20).fill(1);
  for (const char of [header, ...digits.map(String), checksum, '\n', '\r']) {
    const code = char.charCodeAt(0);
    bits.push(0);
    for (let i = 0; i < 8; i += 1) bits.push((code >> i) & 1);
    bits.push(1);
  }
  return bits;
}

export const silence = (bits) => Array(bits).fill(1);
