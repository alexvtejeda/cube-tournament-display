// Real StackMat driver (system design §4). Wraps csTimer's decoder, vendor/stackmat.js: a classic
// script that defines a global `stackmat`, loaded after js/drivers/shim.js.
export function createRealDriver({
  decoder = globalThis.stackmat,
  permissions = globalThis.navigator?.permissions,
} = {}) {
  let listener = () => {};
  let lastRaw = null;
  let running = false;
  // When the line idles or the signal drops, the decoder emits the object it emitted last, mutated
  // (vendor/stackmat.js lines 202–213). Copying each state keeps an earlier one from changing under
  // the core — and erases the only clue that a callback was not a new packet, so identity is
  // compared first. SIGNAL CHECK counts packets per second from `fresh` (operator spec §3.2, §4).
  decoder.setCallBack((state) => {
    const fresh = state !== lastRaw;
    lastRaw = state;
    listener({ ...state, fresh });
  });

  return {
    // Call from a click: the decoder creates its AudioContext inside init(), and a context created
    // outside a user gesture starts suspended.
    async start(deviceId) {
      running = false;
      decoder.stop();
      await decoder.init('s', deviceId, true);
      // init() logs and swallows a getUserMedia failure, so ask the browser directly.
      const status = await permissions?.query({ name: 'microphone' }).catch(() => null);
      if (status?.state === 'denied') throw new Error('Microphone permission denied');
      running = true;
    },
    stop() {
      decoder.stop();
      running = false;
    },
    // True once start() has been called and the audio graph is running. False before the first
    // start(), and false again if start() rejected: "never started" and "started and failed" are
    // different states, and only the first is `waiting` (operator spec §4.3).
    connected() {
      return running === true;
    },
    onState(callback) {
      listener = callback;
    },
    getSample(seconds, callback) {
      decoder.getSample(seconds, callback);
    },
    // [[deviceId, label], …]. Labels are blank until microphone permission is granted.
    listDevices() {
      return decoder.updateInputDevices();
    },
  };
}
