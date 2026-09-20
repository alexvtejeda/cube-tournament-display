// test/core/setup-gate.test.js
import test from 'node:test';
import assert from 'node:assert/strict';

import { savedSummary, setupGate } from '../../js/core/setup-gate.js';
import { TEST_ITEMS, emptyTest } from '../../js/core/mat-test.js';
import { attempt } from '../helpers/fixtures.js';

// A diagnosis is only ever read for its link statuses, so the tests build them directly.
const links = (over = {}) => ({
  links: ['mic', 'sound', 'packets', 'signal', 'test'].map((key) => ({
    key, status: over[key] ?? 'ok',
  })),
});
const fullTest = () => Object.fromEntries(TEST_ITEMS.map(({ key }) => [key, true]));
const someTest = (n) => Object.fromEntries(TEST_ITEMS.map(({ key }, i) => [key, i < n]));

// What `store.load()` hands back (engine plan, Task 14): 'none' · 'ok' + attempts · 'corrupt'.
const loaded = (attempts) => ({ status: 'ok', attempts });
const ONE = loaded([attempt('alfa', 1, 12_340, { at: 5 })]);

test('nothing saved: no resume button, and fresh still has to pass the gate', () => {
  const g = setupGate({ diagnosis: links(), test: fullTest(), saved: null });
  assert.equal(g.resume.shown, false);
  assert.equal(g.fresh.shown, true);
  assert.equal(g.fresh.enabled, true);
  assert.equal(g.fresh.confirm, 'none', 'there is nothing to destroy');
  assert.equal(g.fresh.count, 0);
});

test('a saved event makes resume available with nothing else asked of it', () => {
  // Deliberately the worst case: no signal at all. Resume must still be reachable, because the
  // only way to read or export recorded results is through the event (spec §4.2).
  const dead = links({ mic: 'waiting', sound: 'unknown', packets: 'unknown', signal: 'unknown' });
  const g = setupGate({ diagnosis: dead, test: emptyTest(), saved: savedSummary(ONE) });

  assert.equal(g.resume.shown, true);
  assert.equal(g.resume.enabled, true);
  assert.equal(g.fresh.enabled, false, 'fresh is gated even though resume is not');
});

test('fresh needs a live signal AND six of six', () => {
  const saved = savedSummary(ONE);

  const untested = setupGate({ diagnosis: links(), test: someTest(3), saved });
  assert.equal(untested.fresh.enabled, false);
  assert.equal(untested.fresh.why, 'Falta completar la prueba del cronómetro (3 de 6)');

  const unheard = setupGate({ diagnosis: links({ packets: 'bad' }), test: fullTest(), saved });
  assert.equal(unheard.fresh.enabled, false);
  assert.equal(unheard.fresh.why, 'Primero hay que conectar y probar el cronómetro');

  const ready = setupGate({ diagnosis: links(), test: fullTest(), saved });
  assert.equal(ready.fresh.enabled, true);
  assert.equal(ready.fresh.why, null);
});

test('a noisy signal does not gate: it is a warning, not a stop', () => {
  const g = setupGate({ diagnosis: links({ signal: 'bad' }), test: fullTest(), saved: null });
  assert.equal(g.fresh.enabled, true);
});

test('destroying a real event types the count; a rehearsal does not', () => {
  const saved = savedSummary(loaded([
    attempt('alfa', 1, 12_340, { at: 5 }),
    attempt('alfa', 2, 11_000, { at: 6 }),
  ]));

  const real = setupGate({ diagnosis: links(), test: fullTest(), saved });
  assert.equal(real.fresh.confirm, 'typed');
  assert.equal(real.fresh.count, 2);
  assert.equal(real.fresh.archive, true, 'a real event is kept, silently (spec §4.6)');

  const rehearsal = setupGate({ diagnosis: links(), test: fullTest(), saved, mock: true });
  assert.equal(rehearsal.fresh.confirm, 'none', 'the mock saves under its own key');
  assert.equal(rehearsal.fresh.archive, false, 'rehearsals must not accumulate');
});

test('an unreadable log is not "nothing saved"', () => {
  // The dangerous case: results exist but cannot be parsed. Reporting that as an empty slate
  // would invite the operator to start fresh over an event they cannot see (spec §4.5).
  const saved = savedSummary({ status: 'corrupt' });
  assert.deepEqual(saved, { corrupt: true });

  const g = setupGate({ diagnosis: links(), test: fullTest(), saved });
  assert.equal(g.resume.shown, false, 'there is nothing parseable to resume');
  assert.equal(g.fresh.enabled, true);
  assert.equal(g.fresh.confirm, 'none', 'there is no count to type');
  assert.equal(g.fresh.archive, true, 'the bytes might still be recovered by hand');

  const rehearsal = setupGate({ diagnosis: links(), test: fullTest(), saved, mock: true });
  assert.equal(rehearsal.fresh.archive, true, 'corrupt is archived even in mock mode');
});

test('a second operator window gates both actions and says why', () => {
  const saved = savedSummary(ONE);
  const g = setupGate({
    diagnosis: links({ mic: 'bad', sound: 'unknown', packets: 'unknown', signal: 'unknown' }),
    test: emptyTest(), saved, canConnect: false,
  });
  assert.equal(g.resume.enabled, false, 'two windows writing results is the worst available bug');
  assert.equal(g.fresh.enabled, false);
  assert.equal(g.fresh.why, 'Ya hay una ventana de operador abierta');
});

test('savedSummary collapses an empty store and an empty log into nothing saved', () => {
  assert.equal(savedSummary({ status: 'none' }), null);
  assert.equal(savedSummary(loaded([])), null);
  assert.equal(savedSummary(null), null);
});

test('savedSummary reports the roster progress and the last attempt', () => {
  assert.deepEqual(savedSummary(loaded([
    attempt('alfa', 1, 12_340, { at: 1_000 }),
    attempt('beta', 1, 9_990, { at: 2_000 }),
    attempt('beta', 2, 9_100, { at: 3_000 }),
  ])), { started: 2, attempts: 3, lastTeamId: 'beta', lastAt: 3_000 });
});
