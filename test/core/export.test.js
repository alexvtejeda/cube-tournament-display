import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEvent } from '../../js/core/event-model.js';
import { toCSV, toJSON } from '../../js/core/export.js';
import { attempt, dnf, makeConfig, plus2 } from '../helpers/fixtures.js';

const config = makeConfig(['alfa', 'beta', 'gamma']);

test('toJSON carries the config and every attempt', () => {
  const event = createEvent(config, [attempt('alfa', 1, 12470)]);
  const data = JSON.parse(toJSON(event, Date.UTC(2026, 9, 10)));
  assert.equal(data.exportedAt, '2026-10-10T00:00:00.000Z');
  assert.deepEqual(data.config, config);
  assert.deepEqual(data.attempts, event.attempts);
});

test('toCSV has one row per university in standings order', () => {
  const event = createEvent(config, [
    attempt('beta', 1, 25000), plus2('beta', 2, 19000), dnf('beta', 3),
    dnf('gamma', 1), dnf('gamma', 2), dnf('gamma', 3),
  ]);
  assert.equal(toCSV(event), [
    'position,university,participant,best,attempt 1,attempt 2,attempt 3',
    '1,BETA,,21.00,25.00,21.00 (+2),DNF',
    ',GAMMA,,DNF,DNF,DNF,DNF',
    ',ALFA,,,,,',
    '',
  ].join('\n'));
});

test('toCSV quotes a cell that holds a comma or a quote', () => {
  const named = makeConfig(['alfa']);
  named.teams[0].participant = 'Pérez, "Pepe"';
  const csv = toCSV(createEvent(named, [attempt('alfa', 1, 10000)]));
  assert.match(csv, /,"Pérez, ""Pepe""",/);
});
