import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnose, levelDb, matDelivering, matLine, THRESHOLDS } from '../../js/core/signal-health.js';
import { emptyTest, tickTest } from '../../js/core/mat-test.js';
import { packet } from '../../js/drivers/scenarios.js';

const NOW = 10_000;
const OPENED = NOW - 5_000; // long enough that the check is no longer measuring
const steady = (count = 20, from = NOW - 2_000) =>
  Array.from({ length: count }, (_, i) => from + i * 100);

// A healthy check: connected, permitted, 10 packets a second, a clean idle mat.
const healthy = (over = {}) => ({
  permission: 'granted', connected: true, deviceLabel: 'Entrada de línea',
  packetTimes: steady(), lastState: packet('I', 0), test: emptyTest(),
  openedAt: OPENED, now: NOW, ...over,
});
const link = (d, key) => d.links.find((l) => l.key === key);
const statuses = (d) => d.links.map((l) => l.status);

test('levelDb rounds and floors at the decoder\'s silence', () => {
  assert.equal(levelDb(1), 0);
  assert.equal(levelDb(0.0001), -40);
  assert.equal(levelDb(0), -40, 'no sample yet must not read as -Infinity');
  assert.equal(levelDb(0.008), -21);
});

test('a clean signal with the test unfinished asks for what is missing', () => {
  const d = diagnose(healthy());
  assert.deepEqual(statuses(d), ['ok', 'ok', 'ok', 'ok', 'unknown']);
  assert.equal(d.bad, false);
  assert.equal(d.verdict.line, 'SEÑAL LIMPIA');
  assert.equal(d.verdict.sentence,
    'Falta probar: mano izquierda, mano derecha, luz verde, arranca, para, vuelve a 0.00.');
  assert.equal(link(d, 'packets').value, '10 / s');
  assert.equal(link(d, 'test').value, '0 de 6');
});

test('a finished test reads TODO LISTO', () => {
  const done = [packet('A', 0), packet(' ', 1230, true), packet('S', 6440), packet('I', 0)]
    .reduce(tickTest, emptyTest());
  const d = diagnose(healthy({ test: done }));
  assert.deepEqual(statuses(d), ['ok', 'ok', 'ok', 'ok', 'ok']);
  assert.equal(d.verdict.line, 'TODO LISTO');
  assert.equal(link(d, 'test').detail, 'completa');
});

test('the first second after opening measures instead of judging', () => {
  const d = diagnose(healthy({ openedAt: NOW - 500, packetTimes: [NOW - 100] }));
  assert.equal(link(d, 'packets').status, 'unknown');
  assert.equal(link(d, 'packets').detail, 'midiendo');
  assert.equal(d.verdict.line, 'MIDIENDO LA ENTRADA');
  assert.equal(d.measuring, true);
  assert.equal(d.bad, false);
});

test('before any packet is heard, nothing is judged', () => {
  const d = diagnose(healthy({ lastState: null, packetTimes: [], openedAt: NOW - 200 }));
  assert.equal(d.verdict.line, 'MIDIENDO LA ENTRADA');
  assert.deepEqual(statuses(d), ['ok', 'unknown', 'unknown', 'unknown', 'unknown']);
});

test('no microphone: denied, and not connected', () => {
  const denied = diagnose(healthy({ permission: 'denied' }));
  assert.equal(denied.verdict.line, 'SIN MICRÓFONO');
  assert.deepEqual(statuses(denied), ['bad', 'unknown', 'unknown', 'unknown', 'unknown']);

  const off = diagnose(healthy({ connected: false, lastState: null, packetTimes: [] }));
  assert.equal(off.verdict.line, 'CRONÓMETRO SIN CONECTAR');
  assert.equal(off.verdict.sentence, 'Pulsa Conectar para empezar a escuchar.');
});

test('not connected is waiting, not broken', () => {
  const off = diagnose(healthy({ connected: false, lastState: null, packetTimes: [] }));
  assert.deepEqual(statuses(off), ['waiting', 'unknown', 'unknown', 'unknown', 'unknown']);
  assert.equal(off.bad, false, 'an unpressed button is not a fault');
  assert.equal(off.waiting, true);
  assert.equal(link(off, 'mic').value, 'Sin conectar');
});

test('a mat that is never connected keeps reading CRONÓMETRO SIN CONECTAR', () => {
  // The regression `waiting` introduces if it does not stop the chain: MICRÓFONO stops being
  // broken, so PAQUETES becomes the first break as soon as its window opens empty, and the screen
  // reads NO SE OYE EL CRONÓMETRO — in red — with nothing connected at all.
  const d = diagnose(healthy({
    connected: false, lastState: null, packetTimes: [], openedAt: NOW - 60_000,
  }));
  assert.equal(d.verdict.line, 'CRONÓMETRO SIN CONECTAR');
  assert.equal(d.bad, false);
  assert.equal(link(d, 'packets').status, 'unknown', 'nothing after MICRÓFONO has been judged');
});

test('a second operator window is refused, and that IS broken', () => {
  // Connecting there is impossible rather than pending, so it keeps the red (operator spec §4.13).
  const d = diagnose(healthy({
    connected: false, canConnect: false, lastState: null, packetTimes: [],
  }));
  assert.equal(d.verdict.line, 'OTRA VENTANA TIENE EL MANDO');
  assert.deepEqual(statuses(d), ['bad', 'unknown', 'unknown', 'unknown', 'unknown']);
  assert.equal(d.bad, true);
  assert.equal(d.waiting, false);
});

test('silence on the input breaks SONIDO before anything else', () => {
  const d = diagnose(healthy({ lastState: { ...packet('I', 0), power: 0.0001, noise: 1 }, packetTimes: [] }));
  assert.equal(d.verdict.line, 'NO ENTRA SONIDO');
  assert.equal(link(d, 'sound').value, '−40 dB');
  assert.equal(link(d, 'sound').detail, 'nada');
  assert.deepEqual(statuses(d), ['ok', 'bad', 'unknown', 'unknown', 'unknown']);
  assert.equal(link(d, 'packets').value, '—', 'nothing after the break has been judged');
  assert.equal(link(d, 'test').value, '0 de 6', 'except the test, which is a fact about the mat');
  assert.equal(link(d, 'test').detail, 'en pausa');
});

test('sound with no packets is the wrong input, and names the age of the last one', () => {
  const d = diagnose(healthy({
    lastState: { ...packet('I', 0), power: 0.0005, noise: 1 },
    packetTimes: [NOW - 14_000],
  }));
  assert.equal(d.verdict.line, 'NO SE OYE EL CRONÓMETRO');
  assert.equal(link(d, 'packets').value, '0 / s');
  assert.equal(link(d, 'packets').detail, 'hace 14 s el último');
  assert.equal(link(d, 'sound').detail, 'entra algo');
});

test('a mat that has never been heard says so', () => {
  const d = diagnose(healthy({ lastState: { ...packet('I', 0), power: 0.0005 }, packetTimes: [] }));
  assert.equal(link(d, 'packets').detail, 'ninguno todavía');
});

test('packets arriving but dropping counts them in the sentence', () => {
  const d = diagnose(healthy({ packetTimes: steady(8) }));
  assert.equal(d.verdict.line, 'SE PIERDEN PAQUETES');
  assert.equal(d.verdict.sentence, 'Llegan 4 de cada 10. Suele ser el cable o el volumen de entrada.');
  assert.equal(link(d, 'packets').value, '4 / s');
});

test('a noisy signal breaks only the last measured link', () => {
  const d = diagnose(healthy({ lastState: { ...packet('I', 0), noise: 0.62 } }));
  assert.equal(d.verdict.line, 'SEÑAL CON RUIDO');
  assert.deepEqual(statuses(d), ['ok', 'ok', 'ok', 'bad', 'unknown']);
  assert.equal(link(d, 'signal').detail, 'ruido 62 %');
});

test('PRUEBA is never red, however broken the signal is', () => {
  for (const over of [{ permission: 'denied' }, { packetTimes: [] }, { lastState: { ...packet('I', 0), noise: 1 } }]) {
    assert.notEqual(diagnose(healthy(over)).links.at(-1).status, 'bad');
  }
});

test('the thresholds are the ones the hardware session will retune', () => {
  assert.deepEqual(THRESHOLDS,
    { soundFloorDb: -39, packetsPerSecond: 8, noiseMax: 0.25, windowMs: 2000, measuringMs: 1000 });
});

test('the mat\'s state line reads the header, and the lost signal first', () => {
  assert.equal(matLine(null), 'SIN SEÑAL');
  assert.equal(matLine({ ...packet('S', 6440), on: false }), 'SIN SEÑAL');
  assert.equal(matLine(packet(' ', 1230, true)), 'CORRIENDO');
  assert.equal(matLine(packet('A', 0)), 'LISTO PARA ARRANCAR');
  assert.equal(matLine(packet('C', 0)), 'MANOS EN POSICIÓN');
  assert.equal(matLine(packet('L', 0)), 'UNA MANO');
  assert.equal(matLine(packet('R', 0)), 'UNA MANO');
  assert.equal(matLine(packet('S', 6440)), 'PARADO');
  assert.equal(matLine(packet('I', 0)), 'EN ESPERA');
});

// --- matDelivering (UI spec §10.2, §10.6) ---

// `n` packets spread across the window, newest last, all inside it.
const spread = (n, now) => Array.from({ length: n }, (_, i) => now - THRESHOLDS.windowMs + 1 + i);

test('a mat that has sent nothing is not delivering', () => {
  assert.equal(matDelivering([], 100000), false);
});

test('a healthy mat at ten packets a second is delivering', () => {
  const now = 100000;
  const steady = Array.from({ length: 20 }, (_, i) => now - 1900 + i * 100);
  assert.equal(matDelivering(steady, now), true);
});

test('the boundary is the rate across the window, not a count', () => {
  const now = 100000;
  const need = THRESHOLDS.packetsPerSecond * (THRESHOLDS.windowMs / 1000);
  assert.equal(matDelivering(spread(need, now), now), true, 'exactly the threshold is delivering');
  assert.equal(matDelivering(spread(need - 1, now), now), false, 'one below is not');
});

test('packets older than the window are not counted', () => {
  const now = 100000;
  const stale = Array.from({ length: 200 }, (_, i) => now - THRESHOLDS.windowMs - 1 - i);
  assert.equal(matDelivering(stale, now), false);
});

test('a healthy mat stops delivering about four hundred milliseconds after it goes quiet', () => {
  // A steady stream that stopped `gap` ago. At ten a second, the window empties past the threshold
  // once a fifth of it has gone by — the ~400 ms of UI spec §10.2.
  const at = (gap) => {
    const now = 100000;
    const last = now - gap;
    return matDelivering(Array.from({ length: 40 }, (_, i) => last - i * 100).filter((t) => t > 0), now);
  };
  assert.equal(at(300), true, 'a 300 ms gap is not a lost signal');
  assert.equal(at(600), false, 'a 600 ms gap is');
});
