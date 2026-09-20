// A whole event on the real roster (config/event.json): 13 universities × 3 attempts, driven the
// way the operator window drives it, with the mat's packets from the mock scenarios.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createState, reduce } from '../../js/core/run-state.js';
import { buildSnapshot } from '../../js/core/snapshot.js';
import { SCENARIOS, packet } from '../../js/drivers/scenarios.js';
import { cmd, mat, replay } from '../helpers/actions.js';

const config = JSON.parse(readFileSync(new URL('../../config/event.json', import.meta.url), 'utf8'));

test('13 × 3 attempts run end to end, in roster order, and land in the standings', () => {
  let state = createState(config);
  const order = [];
  for (let u = 0; u < config.teams.length; u += 1) {
    state = reduce(state, cmd('next'));
    for (let n = 1; n <= config.attemptsPerCompetitor; n += 1) {
      assert.equal(state.phase, 'SCRAMBLE');
      assert.equal(state.attemptNo, n);
      state = reduce(state, mat(packet('I', 0)));
      state = replay(state, { steps: SCENARIOS.cleanSolve() });
      assert.equal(state.phase, 'PENDING');
      order.push(config.teams[state.teamIndex].id);
      // Every third university DNFs its last attempt, so the mix is realistic.
      state = reduce(state, cmd(u % 3 === 0 && n === 3 ? 'dnf' : 'accept'));
    }
    assert.equal(state.phase, 'STANDBY');
    assert.equal(buildSnapshot(state, 0).result.teamId, config.teams[u].id);
    assert.equal(buildSnapshot(state, 0).startedCount, u + 1);
  }
  assert.deepEqual(order, config.teams.flatMap((t) => [t.id, t.id, t.id]));
  assert.equal(state.event.attempts.length, 39);
  assert.equal(reduce(state, cmd('next')), state, 'N does nothing once everyone is done');
  assert.equal(buildSnapshot(state, 0).standings.length, 8);
});
