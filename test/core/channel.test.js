import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claimOperator, createPublisher, createSubscriber } from '../../js/core/channel.js';

const nextSnapshot = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

test('the audience receives what the operator publishes', async (t) => {
  const publisher = createPublisher();
  const received = nextSnapshot();
  const subscriber = createSubscriber(received.resolve);
  t.after(() => { publisher.close(); subscriber.close(); });
  publisher.publish({ phase: 'ARMED', inspectionMs: 6200 });
  assert.deepEqual(await received.promise, { phase: 'ARMED', inspectionMs: 6200 });
});

test('an audience window that opens late catches up with the current snapshot', async (t) => {
  const publisher = createPublisher();
  publisher.publish({ phase: 'RUNNING', displayMs: 4200 });
  const received = nextSnapshot();
  const subscriber = createSubscriber(received.resolve);
  t.after(() => { publisher.close(); subscriber.close(); });
  assert.deepEqual(await received.promise, { phase: 'RUNNING', displayMs: 4200 });
});

test('only the first operator window gets the claim', async () => {
  assert.equal(await claimOperator(), true);
  assert.equal(await claimOperator(), false);
});
