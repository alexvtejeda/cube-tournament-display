// What the solo screens' clock and status line say, and in which colour: ARMED's inspection (UI spec
// §5.2), RUNNING's solve (§6.1), and PENDING's review and verdict (§7.1–§7.3). Pure, so every rule
// runs under node --test; js/ui/audience.js paints the result.
//
// A display is { clock, clockTone, status, statusTone, penalty }:
//   clockTone   'plain' #fff · 'waiting' and 'provisional' --violet · 'go' --go · 'over' --red
//   statusTone  'plain' --violet · 'go' --go · 'over' --red
//   penalty     the verdict's tag: null, or { text: '+2' | 'DNF', state: 'in' | 'out' }
import { formatCutoff, formatMs } from '../core/format.js';
import { INSPECTION_DNF_MS, inspectionDisplay } from '../core/inspection.js';

// Every word these lines show, in one place, so the wording can change without touching the rules
// (UI spec §2.6, §7.3).
export const WORDS = {
  inspection: 'INSPECCIÓN',
  handsDown: 'MANOS EN POSICIÓN',
  ready: 'LISTO',
  inspectionOver: 'INSPECCIÓN EXCEDIDA',
  cutoff: (ms) => `LÍMITE ${formatCutoff(ms)}`,
  cutoffOver: 'LÍMITE EXCEDIDO',
  review: 'EN REVISIÓN',
  reviewOver: 'LÍMITE EXCEDIDO · EN REVISIÓN',
  OK: 'TIEMPO VÁLIDO',
  '+2': 'PENALIZACIÓN +2',
  DNF: 'INTENTO INVÁLIDO',
  REDO: 'ANULADO · SE REPITE',
};

// ARMED (§5.2). Four rules; in each, the first match wins.
export function armedDisplay({ inspectionMs, hands }) {
  const clock = inspectionMs === null ? '15' : inspectionDisplay(inspectionMs);
  const penalty = clock === '+2' || clock === 'DNF';
  let clockTone = 'plain';
  if (hands === 'ready' && !penalty) clockTone = 'go';
  else if (inspectionMs === null) clockTone = 'waiting';
  let status = WORDS.inspection;
  if (hands === 'ready') status = WORDS.ready;
  else if (hands === 'down') status = WORDS.handsDown;
  else if (inspectionMs > INSPECTION_DNF_MS) status = WORDS.inspectionOver;
  return { clock, clockTone, status, statusTone: hands === 'ready' ? 'go' : 'plain' };
}

// RUNNING (§6.1). Past the cutoff, strictly, the clock and the status line turn red together.
export function runningDisplay({ displayMs, cutoffMs }) {
  const over = displayMs > cutoffMs;
  return {
    clock: formatMs(displayMs),
    clockTone: over ? 'over' : 'plain',
    status: over ? WORDS.cutoffOver : WORDS.cutoff(cutoffMs),
    statusTone: over ? 'over' : 'plain',
  };
}

// PENDING's review (§7.1): the stopped time is provisional, so --violet, unless it is past the
// cutoff, where RUNNING's red holds.
export function reviewDisplay({ displayMs, cutoffMs }) {
  const over = displayMs > cutoffMs;
  return {
    clock: formatMs(displayMs),
    clockTone: over ? 'over' : 'provisional',
    status: over ? WORDS.reviewOver : WORDS.review,
    statusTone: over ? 'over' : 'plain',
  };
}

// The verdict's two schedule points (§7.2): the tag has entered and been read by TICK_MS, and the
// +2 and the DNF land at LAND_MS, one --t-step later. The redo rewinds over --t-long from TICK_MS.
const TICK_MS = 300;
const LAND_MS = 700;
const REWIND_MS = 800;
// --ease is cubic-bezier(.33, 1, .68, 1), the usual CSS stand-in for this curve.
const easeOutCubic = (p) => 1 - (1 - p) ** 3;

// A DNF names its reason when the room saw it coming (§7.3).
const DNF_WORDS = { CUTOFF: WORDS.cutoffOver, INSPECTION: WORDS.inspectionOver };

// The verdict `sinceKey` ms after the operator's key (§7.2). The clock becomes the result, and
// turns white when it lands; a redo never lands, and rewinds to the 0.00 the mat will show.
// sinceKey = Infinity gives the landed frame, which a window that did not see the review shows at
// once, as does every window under prefers-reduced-motion.
export function verdictDisplay({ kind, ms, reason }, sinceKey = Infinity) {
  const status = kind === 'DNF' ? DNF_WORDS[reason] ?? WORDS.DNF : WORDS[kind];
  const frame = (clock, landed, penalty = null) =>
    ({ clock, clockTone: landed ? 'plain' : 'provisional', status, statusTone: 'plain', penalty });
  switch (kind) {
    case 'OK':
      return frame(formatMs(ms), true);
    case '+2':
      if (sinceKey < TICK_MS) return frame(formatMs(ms), false, { text: '+2', state: 'in' });
      if (sinceKey < LAND_MS) return frame(formatMs(ms + 1000), false, { text: '+2', state: 'in' });
      return frame(formatMs(ms + 2000), true, { text: '+2', state: 'out' });
    case 'DNF':
      if (sinceKey < LAND_MS) return frame(formatMs(ms), false, { text: 'DNF', state: 'in' });
      return frame('DNF', true, { text: 'DNF', state: 'out' });
    default: { // 'REDO'
      const p = Math.min(1, Math.max(0, (sinceKey - TICK_MS) / REWIND_MS));
      return frame(formatMs(Math.round((ms * (1 - easeOutCubic(p))) / 10) * 10), false);
    }
  }
}

// How long a verdict takes to land, after which its frame no longer changes.
export const VERDICT_LANDS_MS = TICK_MS + REWIND_MS;

// Any solo screen. `sinceKey` matters only while a verdict is on screen.
export function soloDisplay(snapshot, sinceKey = Infinity) {
  if (snapshot.verdict !== null) return verdictDisplay(snapshot.verdict, sinceKey);
  if (snapshot.phase === 'ARMED') return { ...armedDisplay(snapshot), penalty: null };
  if (snapshot.phase === 'RUNNING') return { ...runningDisplay(snapshot), penalty: null };
  return { ...reviewDisplay(snapshot), penalty: null };
}

// Whether PENDING's clock holds the university's new best time, and so moves into Resultado's MEJOR
// TIEMPO when the verdict ends (§7.2). A tie counts: the number is the same.
export function clockIsBest({ verdict, result }) {
  if (verdict === null || result === null || result.teamId !== verdict.teamId) return false;
  if (verdict.kind !== 'OK' && verdict.kind !== '+2') return false;
  return verdict.ms + (verdict.kind === '+2' ? 2000 : 0) === result.bestMs;
}
