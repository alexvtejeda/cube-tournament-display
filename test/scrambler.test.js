import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { createScrambler } from '../js/scrambler.js';

// A browser-shaped face on a Node worker running the real cstimer_module.
const thread = new Worker(new URL('./helpers/cstimer-worker.cjs', import.meta.url));
const worker = {
  postMessage: (message) => thread.postMessage(message),
  set onmessage(handler) {
    thread.on('message', (data) => handler({ data }));
  },
};
after(() => thread.terminate());

const scrambler = createScrambler(worker);
const MOVE = /^[URFDLB]['2]?$/;

test('next() returns a trimmed, legal 3x3x3 scramble and its SVG preview', async () => {
  const { scramble, svg } = await scrambler.next();
  assert.equal(scramble, scramble.trim());
  assert.ok(scramble.split(' ').every((move) => MOVE.test(move)), scramble);
  assert.ok(scramble.split(' ').length >= 15, scramble);
  assert.match(svg, /^<svg /);
});

test('concurrent requests each get their own answer', async () => {
  const [a, b] = await Promise.all([scrambler.next(), scrambler.next()]);
  assert.notEqual(a.scramble, b.scramble);
});

test('image() draws the preview for a given scramble', async () => {
  const { scramble, svg } = await scrambler.image("R U R'");
  assert.equal(scramble, "R U R'");
  assert.match(svg, /^<svg /);
});
