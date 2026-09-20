// Debug rendering for the operator window until screen 10 (OPERATOR PANEL) is designed. It shows
// every value the panel will need as plain text; nothing about layout is decided here.
import { attemptsFor } from '../core/event-model.js';
import { formatMs } from '../core/format.js';
import { suggestedPenalty } from '../core/inspection.js';
import { effectiveMs, standings } from '../core/scoring.js';

const HELP = 'N next university · ←/→ skip · Space: start inspection (ARMED) / accept (PENDING) · '
  + 'Esc cancel inspection · D DNF · 2 +2 · R redo · U undo last result';

export function createOperatorView(root, { mock, scenarios, onScenario, onConnect, listDevices }) {
  root.innerHTML = `
    <div id="controls"></div>
    <p class="error" id="error"></p>
    <pre id="status"></pre>
    <p class="scramble" id="scramble"></p>
    <pre id="table"></pre>
    <p>Export: <a id="export-json" download="reto-del-cubo.json">JSON</a> ·
       <a id="export-csv" download="reto-del-cubo.csv">CSV</a></p>
    <pre>${HELP}</pre>`;
  const byId = (id) => root.querySelector(`#${id}`);
  const controls = byId('controls');

  if (mock) {
    for (const name of scenarios) {
      const button = document.createElement('button');
      button.textContent = name;
      button.addEventListener('click', () => {
        button.blur(); // Space and Enter belong to the operator's keys, not to a focused button
        onScenario(name);
      });
      controls.append(button);
    }
  } else {
    const select = document.createElement('select');
    const connect = document.createElement('button');
    connect.textContent = 'Connect mat';
    const refreshDevices = async () => {
      const devices = await listDevices();
      select.replaceChildren(...devices.map(([id, label]) => new Option(label, id)));
    };
    select.addEventListener('change', () => select.blur());
    connect.addEventListener('click', async () => {
      connect.blur();
      byId('error').textContent = '';
      try {
        await onConnect(select.value || undefined);
        connect.textContent = 'Reconnect';
      } catch (err) {
        byId('error').textContent = err.message;
      }
      await refreshDevices(); // device labels appear only once permission is granted
    });
    controls.append(select, connect);
    refreshDevices();
  }

  let urls = [];
  return {
    setExports(json, csv) {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls = [
        URL.createObjectURL(new Blob([json], { type: 'application/json' })),
        URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      ];
      byId('export-json').href = urls[0];
      byId('export-csv').href = urls[1];
    },
    render(state, snapshot, now) {
      byId('status').textContent = statusLines(state, snapshot, now).join('\n');
      byId('scramble').textContent = snapshot.scramble ?? '';
      byId('table').textContent = tableLines(state.event).join('\n');
    },
  };
}

const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;

function statusLines(state, snapshot, now) {
  const { mat } = state;
  const { competitor: team, result } = snapshot;
  return [
    `phase       ${state.phase}${state.signalOn ? '' : '   (no signal)'}`,
    `university  ${team ? `${team.university}${team.participant ? ` · ${team.participant}` : ''}`
      + ` · attempt ${state.attemptNo} of ${snapshot.attemptsPerCompetitor}` : '—'}`,
    `header      UNIVERSIDAD ${snapshot.startedCount} / ${snapshot.teams.length}`,
    `mat         ${mat ? `${JSON.stringify(mat.signalHeader)} ${formatMs(mat.time_milli)}`
      + `${mat.running ? ' running' : ''} · noise ${mat.noise.toFixed(2)}` : 'no packets yet'}`,
    `inspection  ${inspectionText(state, now)}`,
    `pending     ${state.phase === 'PENDING'
      ? `${formatMs(state.pendingMs)} · suggested penalty: ${suggestedPenalty(state.inspectionMs) ?? 'none'}` : '—'}`,
    `result      ${result ? `${result.teamId} · best ${result.bestMs === null ? '—' : formatMs(result.bestMs)}`
      + ` · position ${result.position ?? '—'}` : '—'}`,
  ];
}

function inspectionText(state, now) {
  if (state.phase === 'ARMED') {
    return state.inspectionStartedAt === null ? 'not started (Space)' : `${seconds(now - state.inspectionStartedAt)} (Esc cancels)`;
  }
  return state.inspectionMs === null ? '—' : `${seconds(state.inspectionMs)} used`;
}

function tableLines(event) {
  return standings(event).map((row) => {
    const team = event.config.teams.find((t) => t.id === row.teamId);
    const times = attemptsFor(event, row.teamId)
      .map((a) => (a.status === 'DNF' ? 'DNF' : `${formatMs(effectiveMs(a))}${a.penalty ? '+' : ''}`));
    const best = row.bestMs === null ? '—' : formatMs(row.bestMs);
    return `${String(row.position ?? '·').padStart(2)}  ${team.university.padEnd(10)} ${row.group.padEnd(9)} ${best.padStart(8)}   ${times.join('  ')}`;
  });
}
