// SIGNAL CHECK's diagnosis (operator spec §3.2, §3.3): five links, the first broken one red and
// everything after it unknown, plus the verdict that names what to do. Pure: no DOM, no audio, no
// timers. Every threshold is in THRESHOLDS, to be retuned in one edit after the hardware session
// (roadmap row 10).

import { doneCount, missingItems, TEST_ITEMS } from './mat-test.js';

export const THRESHOLDS = {
  soundFloorDb: -39, // above this, something is coming in. The decoder floors `power` at -40 dB
  packetsPerSecond: 8, // a healthy mat sends about 10
  noiseMax: 0.25, // `noise` is 0–1, and the decoder pins it to 1 on a dead line
  windowMs: 2000, // how far back packets are counted
  measuringMs: 1000, // before this much has passed, PAQUETES has no window to measure
};

// Whether the mat is delivering, by the same rule SIGNAL CHECK's PAQUETES link uses: the *rate*
// across the window, not a raw count. NO SIGNAL reads this (UI spec §10.2, §10.6), so the
// projector and the laptop can never disagree about a dead mat, and one edit after the hardware
// session retunes both. From a healthy ten a second it turns over at about 400 ms of silence.
export function matDelivering(packetTimes, now) {
  const recent = packetTimes.filter((t) => t > now - THRESHOLDS.windowMs).length;
  return recent / (THRESHOLDS.windowMs / 1000) >= THRESHOLDS.packetsPerSecond;
}

// The decoder's `power` is a mean square, floored at 0.0001, so -40 dB is its silence.
export function levelDb(power) {
  return Math.max(-40, Math.round(10 * Math.log10(power || 0)));
}

const dbText = (db) => `${db < 0 ? '−' : ''}${Math.abs(db)} dB`;
const secondsAgo = (ms) => Math.max(1, Math.round(ms / 1000));

const VERDICTS = {
  denied: ['SIN MICRÓFONO', 'El navegador no permite el micrófono. Permítelo y vuelve a abrir esta pantalla.'],
  disconnected: ['CRONÓMETRO SIN CONECTAR', 'Pulsa Conectar para empezar a escuchar.'],
  refused: ['OTRA VENTANA TIENE EL MANDO', 'Ya hay una ventana de operador abierta. Cierra esta y vuelve a la otra.'],
  sound: ['NO ENTRA SONIDO', 'No entra nada por esta entrada. Revisa el cable o elige otra entrada.'],
  silent: ['NO SE OYE EL CRONÓMETRO', 'Entra sonido, pero no trae paquetes. ¿Está encendido el cronómetro? ¿Es la entrada de línea?'],
  lossy: ['SE PIERDEN PAQUETES', 'Llegan {n} de cada 10. Suele ser el cable o el volumen de entrada.'],
  noisy: ['SEÑAL CON RUIDO', 'Los paquetes llegan sucios. Prueba con menos volumen de entrada, u otro cable.'],
  measuring: ['MIDIENDO LA ENTRADA', 'Un momento: escuchando el cronómetro.'],
  clean: ['SEÑAL LIMPIA', 'Falta probar: {missing}.'],
  ready: ['TODO LISTO', 'El cronómetro se oye y responde.'],
};

// packetTimes holds the timestamps of fresh packets (driver states with fresh && on). The caller
// keeps that array and trims it; only the last THRESHOLDS.windowMs are counted here.
// `canConnect` is false only when another operator window holds the microphone (engine plan
// decision 8). Not connected *and* connectable is `waiting`, not broken: nothing is wrong, the
// operator simply has not pressed Conectar. Not connected and refused IS broken — connecting
// there is impossible, not pending. Operator spec §3.2, §4.3.
export function diagnose({
  permission = null, connected = false, deviceLabel = null, canConnect = true,
  packetTimes = [], lastState = null, test, openedAt, now,
}) {
  const since = now - openedAt;
  const measuring = since < THRESHOLDS.measuringMs;
  const elapsedMs = Math.min(THRESHOLDS.windowMs, Math.max(since, 1));
  const recent = packetTimes.filter((t) => t > now - elapsedMs).length;
  const pps = Math.round(recent / (elapsedMs / 1000));
  const lastPacketAt = packetTimes.length > 0 ? packetTimes[packetTimes.length - 1] : null;
  const heard = lastState !== null;

  const mic = !connected
    ? canConnect
      ? { status: 'waiting', value: 'Sin conectar', detail: '—', verdict: 'disconnected' }
      : { status: 'bad', value: 'Sin conectar', detail: '—', verdict: 'refused' }
    : permission === 'denied'
      ? { status: 'bad', value: 'Sin permiso', detail: deviceLabel ?? '—', verdict: 'denied' }
      : { status: 'ok', value: 'Permitido', detail: deviceLabel ?? '—' };

  const db = heard ? levelDb(lastState.power) : null;
  const sound = !heard
    ? { status: 'unknown', value: '—', detail: 'midiendo' }
    : db > THRESHOLDS.soundFloorDb
      ? { status: 'ok', value: dbText(db), detail: pps > 0 ? 'entra señal' : 'entra algo' }
      : { status: 'bad', value: dbText(db), detail: 'nada', verdict: 'sound' };

  const packets = measuring
    ? { status: 'unknown', value: '—', detail: 'midiendo' }
    : pps >= THRESHOLDS.packetsPerSecond
      ? { status: 'ok', value: `${pps} / s`, detail: 'del cronómetro' }
      : {
        status: 'bad',
        value: `${pps} / s`,
        detail: lastPacketAt === null ? 'ninguno todavía' : `hace ${secondsAgo(now - lastPacketAt)} s el último`,
        verdict: pps === 0 ? 'silent' : 'lossy',
      };

  const noisePct = heard ? Math.round(lastState.noise * 100) : 0;
  const signal = !heard
    ? { status: 'unknown', value: '—', detail: 'midiendo' }
    : lastState.noise <= THRESHOLDS.noiseMax
      ? { status: 'ok', value: 'Limpia', detail: `ruido ${noisePct} %` }
      : { status: 'bad', value: 'Con ruido', detail: `ruido ${noisePct} %`, verdict: 'noisy' };

  const done = doneCount(test);
  const prueba = {
    status: done === TEST_ITEMS.length ? 'ok' : 'unknown',
    value: `${done} de ${TEST_ITEMS.length}`,
    detail: done === TEST_ITEMS.length ? 'completa' : `faltan ${TEST_ITEMS.length - done}`,
  };

  const links = [
    { key: 'mic', label: 'Micrófono', ...mic },
    { key: 'sound', label: 'Sonido', ...sound },
    { key: 'packets', label: 'Paquetes', ...packets },
    { key: 'signal', label: 'Señal', ...signal },
    { key: 'test', label: 'Prueba', ...prueba },
  ];

  // The chain stops at the first link that is broken OR waiting; nothing after it has been judged.
  // PRUEBA keeps its count, which is a fact about the mat, not about the signal.
  //
  // `waiting` has to stop the chain even though it is not a fault. Without this, an unconnected mat
  // would leave MICRÓFONO un-broken, PAQUETES would go bad a second later when its window opened
  // empty, and the screen would read NO SE OYE EL CRONÓMETRO, in red, with nothing connected at all.
  const stop = links.findIndex((link) => link.status === 'bad' || link.status === 'waiting');
  if (stop !== -1) {
    for (let i = stop + 1; i < links.length; i++) {
      links[i] = links[i].key === 'test'
        ? { ...links[i], status: 'unknown', detail: 'en pausa' }
        : { ...links[i], status: 'unknown', value: '—', detail: '' };
    }
  }

  // Computed after the propagation above, so a chain stopped by `waiting` reports nothing broken.
  const broken = links.findIndex((link) => link.status === 'bad');

  const key = stop !== -1 ? links[stop].verdict
    : measuring || !heard ? 'measuring'
      : done === TEST_ITEMS.length ? 'ready' : 'clean';
  const [line, template] = VERDICTS[key];
  const sentence = template
    .replace('{n}', String(pps))
    .replace('{missing}', missingItems(test).join(', '));

  return {
    links,
    bad: broken !== -1,
    waiting: stop !== -1 && broken === -1,
    measuring: key === 'measuring',
    verdict: { key, line, sentence },
  };
}

// What the mat is saying right now, in words (operator spec §3.5). First match wins.
export function matLine(lastState) {
  if (!lastState?.on) return 'SIN SEÑAL';
  if (lastState.running) return 'CORRIENDO';
  switch (lastState.signalHeader) {
    case 'A': return 'LISTO PARA ARRANCAR';
    case 'C': return 'MANOS EN POSICIÓN';
    case 'L': case 'R': return 'UNA MANO';
    case 'S': return 'PARADO';
    default: return 'EN ESPERA';
  }
}
