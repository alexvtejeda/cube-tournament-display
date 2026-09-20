// js/ui/setup.js — screen 9, SETUP (operator spec §4).
//
// It reuses SIGNAL CHECK's chain, verdict and picker rather than drawing its own: they are the same
// five links measured the same way, and a second copy would drift.

import { diagnose } from '../core/signal-health.js';
import { TEST_ITEMS, emptyTest, tickTest } from '../core/mat-test.js';
import { setupGate, savedSummary } from '../core/setup-gate.js';
import { formatMs } from '../core/format.js';
import { matLine } from '../core/signal-health.js';

const byId = (id) => document.getElementById(id);

// The decoder invents `microphone 1`, `microphone 2`… before permission is granted (spec §2.4).
const deviceName = (label) => label.replace(/^microphone (\d+)$/i, 'Micrófono $1');

// Spanish, and every fixed string lives here so wording can change without touching a rule (§2.4).
const TEXT = {
  title: 'OPERADOR · <b>PREPARAR</b>',
  hold: 'Nada de esto llega a la sala todavía',
  keys: 'comprobar señal',
  eventLabel: 'Evento',
  emptyHeadline: 'No hay nada guardado',
  emptyDetail: 'Este será el primero',
  corruptHeadline: 'Hay un evento guardado',
  corruptDetail: 'No se puede leer. Empezar uno nuevo lo archiva sin borrarlo.',
  inputLabel: 'Entrada',
  inputIdle: 'Elige una entrada al conectar',
  connect: 'Conectar',
  resume: 'Reanudar evento',
  fresh: 'Empezar evento nuevo',
  matLabel: 'Lo que dice el cronómetro',
  testLabel: 'Prueba del cronómetro',
  testNote: 'Se marcan solos mientras usas el cronómetro.',
  rehearsal: 'Ensayo · ',
  confirmText: (n) => `Se borrarán ${n} intentos. Escribe ${n} para confirmar.`,
};

export function createSetup({ root, mat, store, config, onResume, onFresh, mock = false }) {
  let test = emptyTest();
  let packetTimes = [];
  let lastState = null;
  let openedAt = performance.now();
  let confirming = false;
  // Resolved, never the promise: mat.permission() is async and `diagnose` compares it to a string.
  let permission = null;

  root.className = 'sc';
  root.innerHTML = template();
  root.hidden = false;

  // The chain is built once and mutated; see buildChain in Step 4.
  const chain = buildChain(byId('su-chain'));
  const devices = byId('su-input');
  const teamName = (id) => config.teams.find((t) => t.id === id)?.university ?? id;

  chain.get('connect').addEventListener('click', connect);
  devices.addEventListener('change', () => connectTo(devices.value || undefined));
  byId('su-resume').addEventListener('click', () => onResume());
  byId('su-fresh').addEventListener('click', onFreshPressed);

  // Enter presses Conectar while nothing is connected: it is the only action on the screen at that
  // point (spec §4.10). Esc does nothing here — there is nothing to cancel and nowhere to go back
  // to — except inside the typed confirm, which owns its own keys.
  document.addEventListener('keydown', onKey);

  // The picker lists the inputs before permission is granted (spec §4.7), so it is filled the
  // moment the screen opens rather than when Conectar is pressed.
  void (async () => {
    permission = await mat.permission();
    await refreshDevices();
    render();
  })();

  function connect() {
    return connectTo(devices.value || undefined);
  }

  async function connectTo(deviceId) {
    try {
      await mat.connect(deviceId);
    } catch {
      // Nothing to say here: the chain reads the permission below and the verdict explains it.
    }
    permission = await mat.permission();
    resetMeasurement();
    await refreshDevices();
    render();
  }

  // The list changes when something is plugged in or pulled out (spec §3.8).
  async function refreshDevices() {
    const list = await mat.listDevices().catch(() => []);
    const chosen = mat.deviceId();
    devices.replaceChildren(...list.map(([id, label]) => new Option(deviceName(label), id)));
    if (chosen && list.some(([id]) => id === chosen)) devices.value = chosen;
  }

  // The readings belong to the device that produced them, so a device change clears both the
  // packet window and the whole test (spec §3.8, §4.15).
  function resetMeasurement() {
    test = emptyTest();
    packetTimes = [];
    lastState = null;
    openedAt = performance.now();
  }

  function onMatState(state) {
    lastState = state;
    if (state.fresh && state.on) packetTimes.push(performance.now());
    packetTimes = packetTimes.filter((t) => t > performance.now() - 2_000);
    test = tickTest(test, state);
  }

  function onFreshPressed() {
    const gate = currentGate();
    if (!gate.fresh.enabled) return;
    if (gate.fresh.confirm === 'none') return onFresh({ archive: gate.fresh.archive });
    confirming = true;
    render();
    byId('su-confirm-input')?.focus();
  }

  function submitConfirm() {
    const gate = currentGate();
    const typed = byId('su-confirm-input')?.value.trim();
    if (typed !== String(gate.fresh.count)) return; // anything looser is a ritual, not a check
    confirming = false;
    byId('su-confirm').dataset.open = '';
    onFresh({ archive: gate.fresh.archive });
  }

  function onKey(event) {
    if (confirming) {
      if (event.key === 'Enter') submitConfirm();
      if (event.key === 'Escape') closeConfirm();
      return;
    }
    if (event.key === 'Enter' && !mat.connected()) connect();
  }

  // Cancelling is also clicking anywhere else; there is no modal (spec §4.6). Clearing the dataset
  // flag is what lets renderConfirm rebuild the input next time.
  function closeConfirm() {
    confirming = false;
    byId('su-confirm').dataset.open = '';
    render();
  }

  function currentGate() {
    return setupGate({
      diagnosis: currentDiagnosis(),
      test,
      saved: savedSummary(store.load()),
      mock,
      canConnect: mat.canConnect(),
    });
  }

  function currentDiagnosis() {
    return diagnose({
      permission,
      connected: mat.connected(),
      deviceLabel: mat.deviceLabel(),
      canConnect: mat.canConnect(),
      packetTimes,
      lastState,
      test,
      openedAt,
      now: performance.now(),
    });
  }

  function render() {
    const health = currentDiagnosis();
    const saved = savedSummary(store.load());
    const gate = setupGate({
      diagnosis: health, test, saved, mock, canConnect: mat.canConnect(),
    });

    renderChain(chain, health.links, mat.connected());
    // Neither mark while nothing has been judged — measuring, or simply not connected (§3.3, §4.4).
    const mark = health.bad ? '✕ ' : health.measuring || health.waiting ? '' : '✓ ';
    byId('su-verdict').classList.toggle('bad', health.bad);
    byId('su-line').textContent = `${mark}${health.verdict.line}`;
    byId('su-sentence').textContent = health.verdict.sentence;

    renderEvent(byId('su-event'), saved, {
      mock, teams: config.teams, teamName, now: Date.now(),
    });

    byId('su-resume').hidden = !gate.resume.shown;
    byId('su-resume').disabled = !gate.resume.enabled;
    byId('su-fresh').disabled = !gate.fresh.enabled;
    byId('su-why').textContent = gate.fresh.why ?? '';
    renderConfirm(byId('su-confirm'), gate, confirming);

    const on = Boolean(lastState?.on);
    byId('su-clock').textContent = on ? formatMs(lastState.time_milli) : '—';
    byId('su-clock').classList.toggle('off', !on);
    byId('su-state').textContent = matLine(lastState);
    byId('su-left').classList.toggle('on', on && lastState.leftHand);
    byId('su-right').classList.toggle('on', on && lastState.rightHand);
    byId('su-light').classList.toggle('on', on && lastState.greenLight);

    renderTest(byId('su-test'), test);
    byId('su-note').hidden = TEST_ITEMS.every(({ key }) => test[key]);
  }

  return { onMatState, render, resetMeasurement, destroy: () => document.removeEventListener('keydown', onKey) };
}

function template() {
  return `
    <div class="sc-page">
      <header class="sc-hdr">
        <p class="sc-title">${TEXT.title}</p>
        <p class="sc-hold">${TEXT.hold}</p>
        <p class="sc-keys"><kbd>S</kbd> ${TEXT.keys}</p>
      </header>
      <ul class="sc-chain" id="su-chain"></ul>
      <div class="sc-verdict" id="su-verdict">
        <p class="sc-line" id="su-line"></p>
        <p class="sc-sentence" id="su-sentence"></p>
      </div>
      <div class="su-lower">
        <section>
          <div class="su-event" id="su-event"></div>
          <div>
            <p class="sc-label">${TEXT.inputLabel}</p>
            <select class="sc-devices" id="su-input"></select>
          </div>
          <div class="su-actions" id="su-actions">
            <button type="button" class="su-btn" id="su-resume" hidden>${TEXT.resume}</button>
            <button type="button" class="su-btn" id="su-fresh">${TEXT.fresh}</button>
            <div class="su-why" id="su-why"></div>
            <div class="su-confirm" id="su-confirm" hidden></div>
          </div>
        </section>
        <section>
          <p class="sc-label">${TEXT.matLabel}</p>
          <div>
            <p class="sc-clock" id="su-clock"></p>
            <p class="sc-state" id="su-state"></p>
            <div class="sc-hands">
              <span class="sc-hand" id="su-left">IZQ</span>
              <span class="sc-light" id="su-light"></span>
              <span class="sc-hand" id="su-right">DER</span>
            </div>
          </div>
          <div style="margin-top:auto">
            <p class="sc-label">${TEXT.testLabel}</p>
            <ul class="sc-items" id="su-test"></ul>
            <p class="su-note" id="su-note">${TEXT.testNote}</p>
          </div>
        </section>
      </div>
    </div>`;
}

const el = (tag, className) => Object.assign(document.createElement(tag), { className });

// Built once and updated in place. Rebuilding innerHTML at the mat's rate — about ten times a
// second — would destroy the Conectar button's listener and any focus on every packet.
function buildChain(root) {
  const parts = new Map();
  for (const key of ['mic', 'sound', 'packets', 'signal', 'test']) {
    const li = el('li', 'sc-link');
    const dot = el('span', 'sc-link-dot');
    const label = el('span', 'sc-link-label');
    const value = el('span', 'sc-link-value');
    const detail = el('span', 'sc-link-detail');
    li.append(dot, label, value, detail);
    if (key === 'mic') {
      const button = el('button', 'su-connect');
      button.type = 'button';
      button.id = 'su-connect';
      button.textContent = TEXT.connect;
      li.append(button);
      parts.set('connect', button);
    }
    root.append(li);
    parts.set(key, { li, dot, label, value, detail });
  }
  return parts;
}

// The class must stay `sc-link ${status}` so Task 3's `waiting` ring applies without a second rule.
// When the mat is not connected, MICRÓFONO's reading is replaced by Conectar (spec §3.8, §4.9).
function renderChain(parts, links, connected) {
  for (const link of links) {
    const p = parts.get(link.key);
    p.li.className = `sc-link ${link.status}`;
    p.dot.textContent = link.status === 'ok' ? '✓' : link.status === 'bad' ? '✕' : '';
    p.label.textContent = link.label;
    p.value.textContent = link.key === 'mic' && !connected ? '' : link.value;
    p.detail.textContent = link.detail || '';
  }
  parts.get('connect').hidden = connected;
}

const ago = (at, now) => {
  const mins = Math.round((now - at) / 60_000);
  if (mins < 1) return 'hace un momento';
  return mins < 60 ? `hace ${mins} min` : `hace ${Math.round(mins / 60)} h`;
};

function renderEvent(root, saved, { mock, teams, teamName, now }) {
  const prefix = mock ? TEXT.rehearsal : '';
  root.classList.toggle('empty', saved === null);
  root.classList.toggle('corrupt', saved?.corrupt === true);

  const [headline, detail] = saved === null
    ? [TEXT.emptyHeadline, `${prefix}${TEXT.emptyDetail}`]
    : saved.corrupt
      ? [TEXT.corruptHeadline, TEXT.corruptDetail]
      : [
        `${saved.started} de ${teams.length} universidades`,
        `${prefix}${saved.attempts} intentos registrados · la última, `
          + `${teamName(saved.lastTeamId)}, ${ago(saved.lastAt, now)}`,
      ];

  root.innerHTML = `<p class="sc-label">${TEXT.eventLabel}</p>
    <p class="su-event-headline"></p><p class="su-event-detail"></p>`;
  root.querySelector('.su-event-headline').textContent = headline;
  root.querySelector('.su-event-detail').textContent = detail;
}

// Rendered only when `confirming` CHANGES. Rewriting it on every mat packet would wipe what the
// operator is halfway through typing.
function renderConfirm(root, gate, confirming) {
  root.hidden = !confirming;
  if (!confirming) { root.innerHTML = ''; return; }
  if (root.dataset.open === 'yes') return;
  root.dataset.open = 'yes';
  root.innerHTML = `<p class="su-confirm-text"></p>
    <input id="su-confirm-input" inputmode="numeric" autocomplete="off">`;
  root.querySelector('.su-confirm-text').textContent = TEXT.confirmText(gate.fresh.count);
}

function renderTest(root, test) {
  root.innerHTML = TEST_ITEMS.map(({ key }) =>
    `<li class="${test[key] ? 'done' : 'todo'}"><span class="sc-mark"></span><span></span></li>`).join('');
  [...root.children].forEach((li, i) => {
    const { key, label } = TEST_ITEMS[i];
    li.querySelector('.sc-mark').textContent = test[key] ? '✓' : '';
    li.lastElementChild.textContent = label;
  });
}
