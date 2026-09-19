import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCutoff, formatMs } from '../../js/core/format.js';

test('under a minute: seconds and hundredths', () => {
  assert.equal(formatMs(0), '0.00');
  assert.equal(formatMs(9050), '9.05');
  assert.equal(formatMs(12470), '12.47');
  assert.equal(formatMs(59990), '59.99');
});

test('a minute or more: minutes, padded seconds, hundredths', () => {
  assert.equal(formatMs(60000), '1:00.00');
  assert.equal(formatMs(134300), '2:14.30');
  assert.equal(formatMs(299990), '4:59.99');
});

test('millisecond precision is truncated, never rounded up', () => {
  assert.equal(formatMs(154329), '2:34.32');
  assert.equal(formatMs(59999), '59.99');
});

test('the cutoff reads M:SS, with any remainder truncated', () => {
  assert.equal(formatCutoff(300000), '5:00');
  assert.equal(formatCutoff(240000), '4:00');
  assert.equal(formatCutoff(90000), '1:30');
  assert.equal(formatCutoff(45000), '0:45');
  assert.equal(formatCutoff(300999), '5:00');
});
