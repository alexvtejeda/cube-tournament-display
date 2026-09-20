// Operator → audience sync (system design §4). The operator publishes a snapshot on every change;
// the audience renders the latest one and holds nothing else. An audience window that opens late
// says hello and is sent the current snapshot, so it can be closed, reopened or moved at any time.
export const CHANNEL = 'cube-tournament-display';

export function createPublisher() {
  const channel = new BroadcastChannel(CHANNEL);
  let latest = null;
  channel.onmessage = (event) => {
    if (event.data?.type === 'hello' && latest !== null) channel.postMessage({ type: 'snapshot', snapshot: latest });
  };
  return {
    publish(snapshot) {
      latest = snapshot;
      channel.postMessage({ type: 'snapshot', snapshot });
    },
    close() {
      channel.close();
    },
  };
}

export function createSubscriber(onSnapshot) {
  const channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (event) => {
    if (event.data?.type === 'snapshot') onSnapshot(event.data.snapshot);
  };
  channel.postMessage({ type: 'hello' });
  return {
    close() {
      channel.close();
    },
  };
}

// One operator window at a time (system design §8): two windows both holding the microphone and
// both writing results is the worst bug available. The first window takes a Web Lock and holds it
// for its lifetime; the browser releases it when that window closes. Resolves true for the window
// that holds it, false for any other.
export function claimOperator() {
  return new Promise((resolve) => {
    navigator.locks.request(`${CHANNEL}:operator`, { ifAvailable: true }, (lock) => {
      held = lock !== null;
      resolve(held);
      return lock === null ? undefined : new Promise(() => {});
    });
  });
}

// The claim's outcome, readable without awaiting it again: SETUP and SIGNAL CHECK both gate on
// whether this window is the one in charge (operator spec §4.13). False until claimOperator()
// settles, which is the safe answer while nothing is known.
let held = false;
export const holdsOperator = () => held;
