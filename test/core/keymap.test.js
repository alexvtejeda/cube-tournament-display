import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commandForKey } from '../../js/core/keymap.js';

test('Space accepts in PENDING and starts inspection anywhere else', () => {
  assert.equal(commandForKey(' ', 'PENDING'), 'accept');
  assert.equal(commandForKey(' ', 'ARMED'), 'startInspection');
});

test('the system design keys map to their commands, in either case', () => {
  const cases = [['Escape', 'cancelInspection'], ['d', 'dnf'], ['D', 'dnf'], ['2', 'plus2'], ['r', 'redo'],
    ['n', 'next'], ['N', 'next'], ['ArrowLeft', 'prevTeam'], ['ArrowRight', 'nextTeam'], ['u', 'undo'],
    ['s', 'signalCheck'], ['S', 'signalCheck']];
  for (const [key, command] of cases) assert.equal(commandForKey(key, 'ARMED'), command, key);
});

test('other keys map to nothing', () => {
  for (const key of ['x', 'Enter', 'Tab', 'F5', 'Shift']) assert.equal(commandForKey(key, 'ARMED'), null, key);
});
