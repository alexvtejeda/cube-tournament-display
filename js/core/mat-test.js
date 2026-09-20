// The six-item mat test on SIGNAL CHECK (operator spec §3.4). Pure: it folds mat states into a
// record of what the mat has proved it can do. A state with on === false proves nothing, because
// the decoder re-emits its last packet's values when the signal drops.

export const TEST_ITEMS = [
  { key: 'left', label: 'Mano izquierda' },
  { key: 'right', label: 'Mano derecha' },
  { key: 'green', label: 'Luz verde' },
  { key: 'start', label: 'Arranca' },
  { key: 'stop', label: 'Para' },
  { key: 'reset', label: 'Vuelve a 0.00' },
];

export function emptyTest() {
  return { left: false, right: false, green: false, start: false, stop: false, reset: false, wasRunning: false };
}

export function tickTest(test, mat) {
  if (!mat?.on) return test;
  const idle = mat.signalHeader === 'I' || mat.signalHeader === 'S';
  // Item 5 is the run state's own condition, the one taken verbatim from csTimer: the non-zero
  // guard is what keeps a reset mid-solve from counting as a stop.
  const stopped = test.wasRunning && !mat.running && mat.time_milli !== 0;
  const next = {
    left: test.left || mat.leftHand,
    right: test.right || mat.rightHand,
    green: test.green || mat.greenLight,
    start: test.start || (!test.wasRunning && mat.running),
    stop: test.stop || stopped,
    reset: test.reset || ((test.start || test.stop || stopped) && mat.time_milli === 0 && idle),
    wasRunning: mat.running,
  };
  return TEST_ITEMS.every(({ key }) => next[key] === test[key]) && next.wasRunning === test.wasRunning
    ? test
    : next;
}

export function doneCount(test) {
  return TEST_ITEMS.filter(({ key }) => test[key]).length;
}

// The labels still untested, in the order above, for the verdict's sentence (spec §3.3).
export function missingItems(test) {
  return TEST_ITEMS.filter(({ key }) => !test[key]).map(({ label }) => label.toLowerCase());
}
