import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduce } from '../../js/core/run-state.js';
import { buildSnapshot } from '../../js/core/snapshot.js';
import { packet } from '../../js/drivers/scenarios.js';
import {
  VERDICT_LANDS_MS, armedDisplay, clockIsBest, reviewDisplay, runningDisplay, soloDisplay, verdictDisplay,
} from '../../js/ui/clock-display.js';
import { attempt, makeConfig } from '../helpers/fixtures.js';
import { apply, cmd, mat } from '../helpers/actions.js';

const config = makeConfig(); // alfa, beta, gamma, delta · 3 attempts · cutoff 5:00
const pending = (attempts = [], ms = 12470) => apply(
  createState(config, attempts), cmd('next'), mat(packet('I', 0)), mat(packet(' ', 100, true)), mat(packet('S', ms)));
const verdict = (kind, ms = 102180, reason = null) => ({ kind, teamId: 'alfa', attempt: 1, ms, reason });
const frame = (display) => [display.clock, display.clockTone, display.penalty?.text ?? null, display.penalty?.state ?? null];

test('armedDisplay follows the four rules, in the eight moments of UI spec §5.2', () => {
  const moments = [
    [null, 'up', '15', 'waiting', 'INSPECCIÓN', 'plain'],
    [6000, 'up', '9', 'plain', 'INSPECCIÓN', 'plain'],
    [9000, 'down', '6', 'plain', 'MANOS EN POSICIÓN', 'plain'],
    [10000, 'ready', '5', 'go', 'LISTO', 'go'],
    [16000, 'up', '+2', 'plain', 'INSPECCIÓN', 'plain'],
    [16000, 'ready', '+2', 'plain', 'LISTO', 'go'],
    [18000, 'up', 'DNF', 'plain', 'INSPECCIÓN EXCEDIDA', 'plain'],
    [null, 'ready', '15', 'go', 'LISTO', 'go'],
  ];
  for (const [inspectionMs, hands, clock, clockTone, status, statusTone] of moments) {
    assert.deepEqual(armedDisplay({ inspectionMs, hands }), { clock, clockTone, status, statusTone }, `${inspectionMs} ${hands}`);
  }
});

test('armedDisplay: hands down past 17 s still says MANOS EN POSICIÓN', () => {
  assert.equal(armedDisplay({ inspectionMs: 18000, hands: 'down' }).status, 'MANOS EN POSICIÓN');
});

test('RUNNING: the six moments of UI spec §6.1, red only strictly past the cutoff', () => {
  const moments = [
    [7830, '7.83', 'plain', 'LÍMITE 5:00'],
    [42180, '42.18', 'plain', 'LÍMITE 5:00'],
    [134300, '2:14.30', 'plain', 'LÍMITE 5:00'],
    [300000, '5:00.00', 'plain', 'LÍMITE 5:00'],
    [308520, '5:08.52', 'over', 'LÍMITE EXCEDIDO'],
    [192070, '3:12.07', 'plain', 'LÍMITE 5:00'],
  ];
  for (const [displayMs, clock, tone, status] of moments) {
    assert.deepEqual(runningDisplay({ displayMs, cutoffMs: 300000 }), { clock, clockTone: tone, status, statusTone: tone }, clock);
  }
  assert.equal(runningDisplay({ displayMs: 300010, cutoffMs: 300000 }).clockTone, 'over');
  assert.equal(runningDisplay({ displayMs: 1000, cutoffMs: 240000 }).status, 'LÍMITE 4:00');
});

test('the review: violet and EN REVISIÓN, or red past the cutoff (§7.1)', () => {
  assert.deepEqual(reviewDisplay({ displayMs: 102180, cutoffMs: 300000 }),
    { clock: '1:42.18', clockTone: 'provisional', status: 'EN REVISIÓN', statusTone: 'plain' });
  assert.deepEqual(reviewDisplay({ displayMs: 308520, cutoffMs: 300000 }),
    { clock: '5:08.52', clockTone: 'over', status: 'LÍMITE EXCEDIDO · EN REVISIÓN', statusTone: 'over' });
});

test('Space: the time turns official at the key', () => {
  for (const k of [0, 500, Infinity]) assert.deepEqual(frame(verdictDisplay(verdict('OK'), k)), ['1:42.18', 'plain', null, null]);
  assert.equal(verdictDisplay(verdict('OK')).status, 'TIEMPO VÁLIDO');
});

test('2: the tag enters, the seconds tick at +300 and +700 ms, and the time lands white (§7.2)', () => {
  const at = (k) => frame(verdictDisplay(verdict('+2'), k));
  assert.deepEqual(at(0), ['1:42.18', 'provisional', '+2', 'in']);
  assert.deepEqual(at(299), ['1:42.18', 'provisional', '+2', 'in']);
  assert.deepEqual(at(300), ['1:43.18', 'provisional', '+2', 'in']);
  assert.deepEqual(at(699), ['1:43.18', 'provisional', '+2', 'in']);
  assert.deepEqual(at(700), ['1:44.18', 'plain', '+2', 'out']);
  assert.deepEqual(at(Infinity), ['1:44.18', 'plain', '+2', 'out']);
  assert.equal(verdictDisplay(verdict('+2')).status, 'PENALIZACIÓN +2');
});

test('2 across a minute: the second tick gains the minutes, and the hundredths never change', () => {
  assert.equal(verdictDisplay(verdict('+2', 58500), 300).clock, '59.50');
  assert.equal(verdictDisplay(verdict('+2', 58500), 700).clock, '1:00.50');
});

test('D: the tag enters, and DNF replaces the time at +700 ms, with its reason (§7.2, §7.3)', () => {
  const at = (k) => frame(verdictDisplay(verdict('DNF'), k));
  assert.deepEqual(at(0), ['1:42.18', 'provisional', 'DNF', 'in']);
  assert.deepEqual(at(699), ['1:42.18', 'provisional', 'DNF', 'in']);
  assert.deepEqual(at(700), ['DNF', 'plain', 'DNF', 'out']);
  assert.equal(verdictDisplay(verdict('DNF')).status, 'INTENTO INVÁLIDO');
  assert.equal(verdictDisplay(verdict('DNF', 308520, 'CUTOFF')).status, 'LÍMITE EXCEDIDO');
  assert.equal(verdictDisplay(verdict('DNF', 9000, 'INSPECTION')).status, 'INSPECCIÓN EXCEDIDA');
});

test('R: the clock rewinds from +300 ms over 800 ms to 0.00, and stays violet', () => {
  const at = (k) => frame(verdictDisplay(verdict('REDO'), k));
  assert.deepEqual(at(0), ['1:42.18', 'provisional', null, null]);
  assert.deepEqual(at(300), ['1:42.18', 'provisional', null, null]);
  assert.deepEqual(at(700), ['12.77', 'provisional', null, null]);
  assert.deepEqual(at(1100), ['0.00', 'provisional', null, null]);
  assert.deepEqual(at(Infinity), ['0.00', 'provisional', null, null]);
  assert.equal(verdictDisplay(verdict('REDO')).status, 'ANULADO · SE REPITE');
  assert.equal(VERDICT_LANDS_MS, 1100);
});

test('soloDisplay: ARMED, RUNNING, the review, and the verdict once the phase has moved on', () => {
  const state = pending([], 12470);
  assert.equal(soloDisplay(buildSnapshot(apply(createState(config), cmd('next'), mat(packet('I', 0))), 0)).clock, '15');
  assert.equal(soloDisplay(buildSnapshot(apply(createState(config), cmd('next'), mat(packet('I', 0)), mat(packet(' ', 4200, true))), 0)).clock, '4.20');
  assert.deepEqual(frame(soloDisplay(buildSnapshot(state, 0))), ['12.47', 'provisional', null, null]);
  const decided = buildSnapshot(reduce(state, cmd('plus2', 0)), 100);
  assert.equal(decided.phase, 'SCRAMBLE');
  assert.deepEqual(frame(soloDisplay(decided, 0)), ['12.47', 'provisional', '+2', 'in']);
  assert.deepEqual(frame(soloDisplay(decided)), ['14.47', 'plain', '+2', 'out']);
});

test('the clock holds the best time when attempt 3 sets it, or ties it, with Space or 2 (§7.2)', () => {
  const two = [attempt('alfa', 1, 20000), attempt('alfa', 2, 25000)];
  const decide = (command, ms) => buildSnapshot(reduce(pending(two, ms), cmd(command, 0)), 0);
  assert.equal(clockIsBest(decide('accept', 18000)), true);
  assert.equal(clockIsBest(decide('accept', 20000)), true, 'a tie');
  assert.equal(clockIsBest(decide('plus2', 17000)), true);
  assert.equal(clockIsBest(decide('plus2', 19000)), false, '21.00 with the penalty');
  assert.equal(clockIsBest(decide('accept', 22000)), false);
  assert.equal(clockIsBest(decide('dnf', 18000)), false);
  assert.equal(clockIsBest(buildSnapshot(reduce(pending([], 18000), cmd('accept', 0)), 0)), false, 'attempt 1: no Resultado');
});
