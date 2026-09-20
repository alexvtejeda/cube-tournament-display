// Screen 8, SIGNAL CHECK (operator spec §3). While it is open, the operator window routes the mat
// here instead of into the reducer (§3.1), so nothing that happens at the mat reaches the event or
// the audience. This file draws; every rule it draws lives in js/core/.
import { emptyTest, TEST_ITEMS, tickTest } from '../core/mat-test.js';
import { byteText, lastPacketBytes, windowFor } from '../core/sample.js';
import { diagnose, matLine, THRESHOLDS } from '../core/signal-health.js';
import { formatMs } from '../core/format.js';

const BAUD = 1200;
const SAMPLE_SECONDS = 0.2; // two packets, so a whole 100 ms window always fits (decision 1)
const TICK_MS = 200; // the screen's own beat: ages count up with no packets arriving (decision 9)
const FRESH_MS = 500; // older than this and the last packet is stale, and dims (spec §3.7)
const LINKS = ['mic', 'sound', 'packets', 'signal', 'test'];

// The decoder invents `microphone 1`, `microphone 2`… before permission is granted (spec §2.4).
const deviceName = (label) => label.replace(/^microphone (\d+)$/i, 'Micrófono $1');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// `mat` is the operator window's façade over the driver:
//   connected() · deviceId() · deviceLabel() · listDevices() · connect(id) · permission() · sample(s)
export function createSignalCheck({ root, mat }) {
  root.className = 'sc';
  root.hidden = true;
  root.innerHTML = `
    <div class="sc-page">
      <header class="sc-hdr">
        <p class="sc-title">OPERADOR · <b>COMPROBAR SEÑAL</b></p>
        <p class="sc-hold">Evento en espera: el cronómetro no llega al evento ni a la sala</p>
        <p class="sc-keys"><kbd>S</kbd><kbd>Esc</kbd> volver al evento</p>
      </header>
      <ol class="sc-chain" id="sc-chain"></ol>
      <div class="sc-verdict" id="sc-verdict">
        <p class="sc-line" id="sc-line"></p>
        <p class="sc-sentence" id="sc-sentence"></p>
      </div>
      <div class="sc-lower">
        <section class="sc-evidence">
          <p class="sc-label">Onda · 100 ms</p>
          <canvas class="sc-wave" id="sc-wave"></canvas>
          <div class="sc-foot">
            <div>
              <p class="sc-label">Entrada</p>
              <select class="sc-devices" id="sc-devices"></select>
            </div>
            <div class="sc-packet" id="sc-packet">
              <p class="sc-label">Último paquete</p>
              <p class="sc-bytes" id="sc-bytes">—</p>
              <p class="sc-age" id="sc-age"></p>
            </div>
          </div>
        </section>
        <section class="sc-mat">
          <p class="sc-label">Lo que dice el cronómetro</p>
          <div class="sc-readout">
            <p class="sc-clock" id="sc-clock">—</p>
            <p class="sc-state" id="sc-state"></p>
            <div class="sc-hands">
              <span class="sc-hand" id="sc-left">IZQ</span>
              <span class="sc-light" id="sc-light"></span>
              <span class="sc-hand" id="sc-right">DER</span>
            </div>
          </div>
          <div class="sc-test">
            <p class="sc-label">Prueba del cronómetro</p>
            <ul class="sc-items" id="sc-items"></ul>
          </div>
        </section>
      </div>
    </div>`;

  const byId = (id) => root.querySelector(`#${id}`);
  const canvas = byId('sc-wave');
  const devices = byId('sc-devices');

  // The Conectar button is built once and moved nowhere: rebuilding the chain five times a second
  // would destroy it between a mousedown and its mouseup, and the click would never land.
  const connect = document.createElement('button');
  connect.type = 'button';
  connect.className = 'sc-connect';
  connect.textContent = 'Conectar';

  const links = new Map(LINKS.map((key) => {
    const li = document.createElement('li');
    li.className = 'sc-link';
    const parts = { li, text: document.createTextNode('') };
    for (const name of ['dot', 'label', 'value', 'detail']) {
      parts[name] = document.createElement('span');
      parts[name].className = `sc-link-${name}`;
      li.append(parts[name]);
    }
    parts.value.append(parts.text);
    if (key === 'mic') parts.value.append(connect);
    byId('sc-chain').append(li);
    return [key, parts];
  }));

  const items = new Map(TEST_ITEMS.map(({ key, label }) => {
    const li = document.createElement('li');
    const mark = document.createElement('span');
    mark.className = 'sc-mark';
    const text = document.createElement('span');
    text.textContent = label;
    li.append(mark, text);
    byId('sc-items').append(li);
    return [key, { li, mark }];
  }));

  let showing = false;
  let test = emptyTest();
  let packetTimes = [];
  let lastState = null;
  let lastBytes = null;
  let openedAt = 0;
  let permission = null;
  let ticker = null;

  connect.addEventListener('click', () => connectTo(devices.value || undefined));
  devices.addEventListener('change', () => connectTo(devices.value || undefined));

  async function connectTo(deviceId) {
    try {
      await mat.connect(deviceId);
    } catch {
      // Nothing to say here: the chain reads the permission below and the verdict explains it.
    }
    permission = await mat.permission();
    restart();
    await refreshDevices();
    render();
  }

  // A new device's readings have nothing to do with the old one's (spec §3.8), and the test starts
  // again every time the check opens (spec §3.4).
  function restart() {
    test = emptyTest();
    packetTimes = [];
    lastState = null;
    lastBytes = null;
    openedAt = Date.now();
  }

  // The list changes when something is plugged in or pulled out (spec §3.8).
  const onDeviceChange = () => { void refreshDevices(); };

  async function refreshDevices() {
    const list = await mat.listDevices();
    const chosen = mat.deviceId();
    devices.replaceChildren(...list.map(([id, label]) => new Option(deviceName(label), id)));
    if (chosen && list.some(([id]) => id === chosen)) devices.value = chosen;
  }

  async function pump() {
    while (showing) {
      if (!mat.connected()) {
        await sleep(TICK_MS); // asking a decoder that never started for audio would throw
        continue;
      }
      // The real driver takes the whole 200 ms to fill a sample and the mock returns at once; the
      // sleep paces both to about five redraws a second.
      const [sample] = await Promise.all([mat.sample(SAMPLE_SECONDS), sleep(SAMPLE_SECONDS * 1000)]);
      if (!showing) return;
      drawWave(sample);
      const bytes = lastPacketBytes(sample.bytes ?? []);
      if (bytes !== null) lastBytes = bytes;
      render();
    }
  }

  function drawWave(sample) {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    const styles = getComputedStyle(canvas);
    const g = canvas.getContext('2d');
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.clearRect(0, 0, width, height);
    g.lineWidth = 1;
    g.strokeStyle = styles.getPropertyValue('--o-divider').trim();
    g.beginPath();
    g.moveTo(0, height / 2 + 0.5);
    g.lineTo(width, height / 2 + 0.5);
    g.stroke();

    const raw = sample.raw ?? [];
    if (raw.length < 2) return;
    const samplesPerBit = raw.length / SAMPLE_SECONDS / BAUD; // the decoder never reports its rate
    const { start, length } = windowFor(sample.bin ?? raw, samplesPerBit);
    g.lineWidth = 1.6;
    g.lineJoin = 'round';
    g.strokeStyle = styles.getPropertyValue('--o-violet').trim();
    g.beginPath();
    for (let i = 0; i < length; i++) {
      const x = (i / (length - 1)) * width;
      // This is the signal after the decoder's gain control, so ±1 is full scale, whatever the
      // input level is (spec §3.6).
      const y = height / 2 - raw[start + i] * height * 0.36;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }

  function render() {
    const now = Date.now();
    const health = diagnose({
      permission,
      connected: mat.connected(),
      deviceLabel: mat.deviceLabel(),
      packetTimes,
      lastState,
      test,
      openedAt,
      now,
    });

    for (const link of health.links) {
      const parts = links.get(link.key);
      parts.li.className = `sc-link ${link.status}`;
      parts.dot.textContent = link.status === 'ok' ? '✓' : link.status === 'bad' ? '✕' : '';
      parts.label.textContent = link.label;
      parts.detail.textContent = link.detail;
      parts.text.nodeValue = link.key === 'mic' && !mat.connected() ? '' : link.value;
    }
    connect.hidden = mat.connected();

    byId('sc-verdict').classList.toggle('bad', health.bad);
    // MIDIENDO LA ENTRADA and CRONÓMETRO SIN CONECTAR carry neither mark: nothing has been judged
    // yet, and a tick would claim otherwise (spec §3.3). A tick here would also be the screen's
    // only "all good" signal while the mat is not even connected.
    const mark = health.bad ? '✕ ' : health.measuring || health.waiting ? '' : '✓ ';
    byId('sc-line').textContent = `${mark}${health.verdict.line}`;
    byId('sc-sentence').textContent = health.verdict.sentence;

    const on = Boolean(lastState?.on);
    byId('sc-clock').textContent = on ? formatMs(lastState.time_milli) : '—';
    byId('sc-clock').classList.toggle('off', !on);
    byId('sc-state').textContent = matLine(lastState);
    byId('sc-left').classList.toggle('on', on && lastState.leftHand);
    byId('sc-right').classList.toggle('on', on && lastState.rightHand);
    byId('sc-light').classList.toggle('on', on && lastState.greenLight);

    const age = packetTimes.length > 0 ? now - packetTimes[packetTimes.length - 1] : null;
    const stale = age === null || age >= FRESH_MS;
    byId('sc-bytes').textContent = lastBytes === null ? '—' : byteText(lastBytes);
    byId('sc-age').textContent = age === null ? '' : stale ? `hace ${Math.max(1, Math.round(age / 1000))} s` : 'ahora';
    byId('sc-packet').classList.toggle('stale', stale);

    for (const { key } of TEST_ITEMS) {
      const { li, mark } = items.get(key);
      li.className = test[key] ? 'done' : 'todo';
      mark.textContent = test[key] ? '✓' : '';
    }
  }

  return {
    async open() {
      if (showing) return;
      showing = true;
      restart();
      root.hidden = false;
      permission = await mat.permission();
      await refreshDevices();
      navigator.mediaDevices?.addEventListener('devicechange', onDeviceChange);
      render();
      ticker = setInterval(render, TICK_MS);
      void pump();
    },
    close() {
      showing = false;
      clearInterval(ticker);
      ticker = null;
      navigator.mediaDevices?.removeEventListener('devicechange', onDeviceChange);
      root.hidden = true;
    },
    // Every mat state while the check is open (spec §3.1). It goes nowhere else.
    onMat(state, now = Date.now()) {
      if (!showing) return;
      lastState = state;
      if (state.fresh && state.on) packetTimes.push(now);
      while (packetTimes.length > 0 && packetTimes[0] < now - THRESHOLDS.windowMs) packetTimes.shift();
      test = tickTest(test, state);
      render();
    },
  };
}
