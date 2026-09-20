// Scripted StackMat signals (system design §9) for the mock driver and the replay tests. A scenario
// is an array of { t, state } steps: t is ms from the scenario's start, one packet every 100 ms like
// a real mat, and every state has the shape the csTimer decoder emits.

export const PACKET_MS = 100;

export function packet(signalHeader, time_milli, running = false) {
  return {
    on: true,
    // A packet the decoder has just read. The real driver marks re-emissions of its last state
    // false, which is how SIGNAL CHECK counts packets per second (operator spec §3.2).
    fresh: true,
    running,
    time_milli,
    unit: 10,
    signalHeader,
    greenLight: signalHeader === 'A',
    leftHand: 'LAC'.includes(signalHeader),
    rightHand: 'RAC'.includes(signalHeader),
    noise: 0.05,
    power: 1,
  };
}

// The decoder reports a lost signal by re-emitting its last state with on = false. Nothing new was
// read, so it is not fresh.
export const offline = (state) => ({ ...state, on: false, fresh: false });

// The bytes a StackMat sends for a state (system design §4): the header, the time as five digits,
// a checksum, then \n \r. SIGNAL CHECK shows the last of them (operator spec §3.7), and the mock
// driver turns them into the audio sample it draws.
export function packetBytes({ signalHeader, time_milli }) {
  const minutes = Math.floor(time_milli / 60000);
  const seconds = String(Math.floor(time_milli / 1000) % 60).padStart(2, '0');
  const centis = String(Math.floor(time_milli / 10) % 100).padStart(2, '0');
  const digits = `${minutes}${seconds}${centis}`;
  const checksum = String.fromCharCode(64 + [...digits].reduce((sum, digit) => sum + Number(digit), 0));
  return [signalHeader, ...digits, checksum, '\n', '\r'];
}

// Those bytes at 1200 baud: a start bit, eight data bits least significant first, then a stop bit.
// 1 is the idle level, the way the decoder's binarised sample holds it.
export function packetBits(state) {
  const bits = [];
  for (const byte of packetBytes(state)) {
    const code = byte.charCodeAt(0);
    bits.push(0);
    for (let i = 0; i < 8; i += 1) bits.push((code >> i) & 1);
    bits.push(1);
  }
  return bits;
}

export function hold(state, ms) {
  return Array.from({ length: Math.round(ms / PACKET_MS) }, (_, i) => ({ t: i * PACKET_MS, state }));
}

// The timer counting from `fromMs` up to (not including) `toMs`.
export function timing(fromMs, toMs) {
  return Array.from({ length: Math.round((toMs - fromMs) / PACKET_MS) }, (_, i) => ({
    t: i * PACKET_MS,
    state: packet(' ', fromMs + i * PACKET_MS, true),
  }));
}

// Plays parts back to back.
export function sequence(...parts) {
  const steps = [];
  let offset = 0;
  for (const part of parts) {
    for (const step of part) steps.push({ t: offset + step.t, state: step.state });
    offset += part.length * PACKET_MS;
  }
  return steps;
}

export const HANDS_MS = 1200;
export const reset = (ms = 300) => hold(packet('I', 0), ms);
export const handsDown = () => sequence(hold(packet('L', 0), 200), hold(packet('C', 0), 500), hold(packet('A', 0), 500));
export const stopAt = (ms) => hold(packet('S', ms), 1000);
export const solve = (ms) => sequence(timing(0, ms), stopAt(ms));

// A solve whose timer starts `ms` after the scenario begins: mat at 0.00, hands down, green, go.
export const startAfter = (ms, solveMs = 5000) => sequence(reset(ms - HANDS_MS), handsDown(), solve(solveMs));

// Named scenarios, played from ARMED unless the name says otherwise. The mock driver's debug view
// offers each one as a button.
export const SCENARIOS = {
  reset: () => reset(),
  cleanSolve: () => sequence(handsDown(), solve(8000)),
  falseStart: () => sequence(handsDown(), solve(300)),
  matBump: () => solve(1500),
  resetMidSolve: () => sequence(handsDown(), timing(0, 3000), reset(), handsDown(), solve(6000)),
  cutoffOverrun: () => sequence(handsDown(), solve(301000)),
  signalLossDuringRun: () => sequence(
    handsDown(), timing(0, 2000), hold(offline(packet(' ', 1900, true)), 1500), timing(3500, 8000), stopAt(8000)),
  signalLossDuringStandby: () => sequence(hold(offline(packet('I', 0)), 1500), reset()),
  handsLiftedBeforeGreen: () => sequence(hold(packet('C', 0), 300), reset()),
};
