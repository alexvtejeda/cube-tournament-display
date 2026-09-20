// Client for cstimer_module running as a WebWorker (system design §3, "Scrambles"). The worker
// answers each [id, type, details] message with [id, type, result].
export function createScrambler(worker) {
  const waiting = new Map();
  let lastId = 0;
  worker.onmessage = (event) => {
    const [id, , result] = event.data;
    waiting.get(id)?.(result);
    waiting.delete(id);
  };

  function call(type, details) {
    lastId += 1;
    const id = lastId;
    return new Promise((resolve) => {
      waiting.set(id, resolve);
      worker.postMessage([id, type, details]);
    });
  }

  // The preview of a given scramble: { scramble, svg }.
  async function image(scramble) {
    return { scramble, svg: await call('image', [scramble, '333']) };
  }

  return {
    // A new random-state 3x3x3 scramble and its preview. csTimer's text can end in a space.
    async next() {
      return image((await call('scramble', ['333'])).trim());
    },
    image,
  };
}
