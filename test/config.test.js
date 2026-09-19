import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../js/config.js';

const EVENT = {
  eventName: 'Test',
  cutoffMs: 300000,
  attemptsPerCompetitor: 3,
  teams: [
    { id: 'intec', university: 'INTEC', participant: '' },
    { id: 'uce', university: 'UCE', participant: '' },
  ],
};

function fakeFetch(files) {
  return async (path) => ({ ok: path in files, json: async () => files[path] });
}

test('without a names file, participants stay empty', async () => {
  const config = await loadConfig(fakeFetch({ 'config/event.json': EVENT }));
  assert.deepEqual(config.teams.map((t) => t.participant), ['', '']);
});

test('names from participants.local.json are merged by team id', async () => {
  const config = await loadConfig(fakeFetch({
    'config/event.json': EVENT,
    'config/participants.local.json': { uce: 'José Martínez' },
  }));
  assert.deepEqual(config.teams.map((t) => t.participant), ['', 'José Martínez']);
  assert.equal(config.cutoffMs, 300000);
});
