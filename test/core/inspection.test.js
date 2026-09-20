import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handsFromHeader, inspectionDisplay, suggestedPenalty } from '../../js/core/inspection.js';

test('inspectionDisplay counts 15 down to 1, then +2, then DNF (UI spec §5.8)', () => {
  const cases = [[0, '15'], [999, '15'], [1000, '14'], [14001, '1'], [15000, '1'],
    [15001, '+2'], [17000, '+2'], [17001, 'DNF'], [60000, 'DNF']];
  for (const [elapsed, shown] of cases) assert.equal(inspectionDisplay(elapsed), shown, `at ${elapsed} ms`);
});

test('suggestedPenalty uses the same limits', () => {
  const cases = [[null, null], [0, null], [15000, null], [15001, '+2'], [17000, '+2'], [17001, 'DNF']];
  for (const [ms, penalty] of cases) assert.equal(suggestedPenalty(ms), penalty, `at ${ms} ms`);
});

test('handsFromHeader: C is down, A is ready, everything else is up', () => {
  assert.equal(handsFromHeader('C'), 'down');
  assert.equal(handsFromHeader('A'), 'ready');
  for (const header of ['L', 'R', 'I', 'S', ' ', undefined]) assert.equal(handsFromHeader(header), 'up');
});
