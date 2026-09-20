// Debug rendering for the audience window until the designed screens replace it (UI spec §3–§5).
import { formatMs } from '../core/format.js';
import { inspectionDisplay } from '../core/inspection.js';

export function createAudienceView(root) {
  root.innerHTML = `
    <p class="clock" id="clock"></p>
    <div class="cube" id="cube"></div>
    <pre id="snapshot">Waiting for the operator window…</pre>`;
  const byId = (id) => root.querySelector(`#${id}`);
  return {
    render(snapshot) {
      byId('clock').textContent = clockText(snapshot);
      byId('cube').innerHTML = snapshot.scrambleSvg ?? ''; // SVG from our own scramble worker
      const { scrambleSvg, teams, ...rest } = snapshot;
      byId('snapshot').textContent = JSON.stringify(rest, null, 2);
    },
  };
}

// What the clock will read: the inspection countdown in ARMED (UI spec §5.2), the time in RUNNING
// and PENDING.
function clockText(snapshot) {
  if (snapshot.phase === 'ARMED') return snapshot.inspectionMs === null ? '15' : inspectionDisplay(snapshot.inspectionMs);
  return snapshot.displayMs === null ? '' : formatMs(snapshot.displayMs);
}
