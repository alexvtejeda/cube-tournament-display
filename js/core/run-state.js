// The run loop (system design §5, UI spec §5.4) as one pure reducer. Actions:
//   { type: 'mat', state, at }                  a StackmatState from a driver
//   { type: 'command', command, at }            an operator command (js/core/keymap.js)
//   { type: 'scramble', seq, scramble, svg }    the worker's answer to scramble request `seq`
// The core has no clock: `at` is the Date.now() the operator window stamped on the event.
import { createEvent, findTeam, isComplete, nextAttemptNo, recordAttempt, undoLast } from './event-model.js';
import { suggestedPenalty } from './inspection.js';

// Where the operator may move around the roster. RUNNING is live and PENDING is a gate. RESULTS is
// here so a latecomer can still be called after the board is up (UI spec §8.7).
const IDLE_PHASES = ['STANDBY', 'SCRAMBLE', 'ARMED', 'RESULTS'];

export function createState(config, attempts = []) {
  const last = attempts.at(-1);
  return {
    event: createEvent(config, attempts),
    phase: 'STANDBY',
    // N continues from here. On a resume, that is the university of the last recorded attempt.
    teamIndex: last ? Math.max(0, config.teams.findIndex((t) => t.id === last.teamId)) : 0,
    attemptNo: null,
    // scrambleSeq changes whenever the scramble on screen must change. The operator window then asks
    // the worker for a new one (scramble === null) or for the preview of this one.
    scramble: null,
    scrambleSvg: null,
    scrambleSeq: 0,
    inspectionStartedAt: null,
    inspectionMs: null,
    pendingMs: null,
    mat: null, // the last StackmatState heard with on === true
    signalOn: false,
    // The operator's last decision, shown to the room as a verdict (UI spec §7.5). Only the attempt
    // log is persisted, so a reload drops it.
    lastDecision: null,
    // When F ended the event, for the audience's bridge through ATTRACT (UI spec §8.7). Like
    // lastDecision it is not persisted, so a reload lands back on Resultado.
    resultsAt: null,
  };
}

export function reduce(state, action) {
  switch (action.type) {
    case 'mat':
      return onMat(state, action.state, action.at);
    case 'command':
      return onCommand(state, action.command, action.at);
    case 'scramble':
      return action.seq === state.scrambleSeq ? { ...state, scramble: action.scramble, scrambleSvg: action.svg } : state;
    default:
      return state;
  }
}

function onMat(state, mat, at) {
  // A lost signal changes only the flag. The phase, the inspection start and the last packet all
  // survive, so the run carries on when packets resume (system design §8).
  if (!mat.on) return { ...state, signalOn: false };
  const next = { ...state, mat, signalOn: true };
  switch (state.phase) {
    case 'SCRAMBLE':
      return mat.time_milli === 0 && (mat.signalHeader === 'I' || mat.signalHeader === 'S')
        ? { ...next, phase: 'ARMED', lastDecision: null }
        : next;
    case 'ARMED':
      if (!mat.running) return next;
      return {
        ...next,
        phase: 'RUNNING',
        inspectionMs: state.inspectionStartedAt === null ? null : at - state.inspectionStartedAt,
        inspectionStartedAt: null,
      };
    case 'RUNNING':
      // Verbatim from csTimer: the non-zero guard keeps a reset mid-solve from counting as a finish.
      return state.mat.running && !mat.running && mat.time_milli !== 0
        ? { ...next, phase: 'PENDING', pendingMs: mat.time_milli }
        : next;
    default:
      return next;
  }
}

function onCommand(state, command, at) {
  const { phase } = state;
  switch (command) {
    case 'next':
      // From STANDBY, N may continue the university at teamIndex if it has attempts left (the start
      // of the event, or a resume). From RESULTS it behaves the same way, for a latecomer (UI spec
      // §8.7). Anywhere else it moves on.
      return IDLE_PHASES.includes(phase)
        ? selectTeam(state, findTeam(state.event, state.teamIndex + (phase === 'STANDBY' || phase === 'RESULTS' ? 0 : 1), 1))
        : state;
    case 'results':
      // F ends the event from any settled screen. The attempt in progress is dropped, exactly as
      // when a university completes, so the bridge starts from a screen that is not mid-attempt.
      // teamIndex is kept, so N can still call a latecomer afterwards (UI spec §8.7).
      return phase === 'STANDBY' || phase === 'SCRAMBLE'
        ? { ...state, ...cleared(), phase: 'RESULTS', resultsAt: at, attemptNo: null, scramble: null, scrambleSvg: null }
        : state;
    case 'nextTeam':
      return IDLE_PHASES.includes(phase) ? selectTeam(state, findTeam(state.event, state.teamIndex + 1, 1)) : state;
    case 'prevTeam':
      return IDLE_PHASES.includes(phase) ? selectTeam(state, findTeam(state.event, state.teamIndex - 1, -1)) : state;
    case 'startInspection':
      return phase === 'ARMED' && state.inspectionStartedAt === null ? { ...state, inspectionStartedAt: at } : state;
    case 'cancelInspection':
      return phase === 'ARMED' ? { ...state, inspectionStartedAt: null } : state;
    case 'accept':
      return phase === 'PENDING' ? decide(state, 'OK', at) : state;
    case 'plus2':
      return phase === 'PENDING' ? decide(state, '+2', at) : state;
    case 'dnf':
      return phase === 'PENDING' ? decide(state, 'DNF', at) : state;
    case 'redo':
      // The time is voided and the same attempt is solved again, on a new scramble.
      return phase === 'PENDING'
        ? { ...state, ...cleared(), ...freshScramble(state), phase: 'SCRAMBLE', lastDecision: decision(state, 'REDO', at) }
        : state;
    case 'undo':
      return IDLE_PHASES.includes(phase) ? undo(state) : state;
    case 'disarm':
      // SIGNAL CHECK opening from ARMED (operator spec §3.1). ARMED is the one held screen that
      // draws live mat data, so it steps back to the scramble already on screen rather than
      // freezing into a lie on the projector. freshScramble is deliberately not used: the
      // competitor has not solved yet and must not be handed a new scramble.
      return phase === 'ARMED' ? { ...state, ...cleared(), phase: 'SCRAMBLE' } : state;
    default:
      return state;
  }
}

const freshScramble = (state) => ({ scramble: null, scrambleSvg: null, scrambleSeq: state.scrambleSeq + 1 });
// Nothing carries over from one attempt to the next, not even the verdict on screen.
const cleared = () => ({ inspectionStartedAt: null, inspectionMs: null, pendingMs: null, lastDecision: null, resultsAt: null });

function selectTeam(state, index) {
  if (index === -1) return state;
  const team = state.event.config.teams[index];
  return {
    ...state,
    ...cleared(),
    ...freshScramble(state),
    phase: 'SCRAMBLE',
    teamIndex: index,
    attemptNo: nextAttemptNo(state.event, team.id),
  };
}

// The verdict the room is shown after a decision (UI spec §7.5): `kind` is 'OK', '+2', 'DNF' or
// 'REDO', and `ms` the stopped time without the penalty. A DNF names its reason when the room saw it
// coming: the time past the cutoff, which wins, or more than 17 s of inspection.
function decision(state, kind, at) {
  const { teams, cutoffMs } = state.event.config;
  let reason = null;
  if (kind === 'DNF' && state.pendingMs > cutoffMs) reason = 'CUTOFF';
  else if (kind === 'DNF' && suggestedPenalty(state.inspectionMs) === 'DNF') reason = 'INSPECTION';
  return { kind, teamId: teams[state.teamIndex].id, attempt: state.attemptNo, ms: state.pendingMs, reason, at };
}

// The PENDING gate's decision. With attempts left, the next scramble appears at once and the system
// waits for the mat to be reset (auto-arming, system design §5). With none left, STANDBY shows this
// university's Resultado until N.
function decide(state, kind, at) {
  const team = state.event.config.teams[state.teamIndex];
  const event = recordAttempt(state.event, {
    teamId: team.id,
    attempt: state.attemptNo,
    ms: state.pendingMs,
    penalty: kind === '+2' ? '+2' : null,
    status: kind === 'DNF' ? 'DNF' : 'OK',
    scramble: state.scramble,
    inspectionMs: state.inspectionMs,
    at,
  });
  const next = { ...state, ...cleared(), event, lastDecision: decision(state, kind, at) };
  if (isComplete(event, team.id)) return { ...next, phase: 'STANDBY', attemptNo: null, scramble: null, scrambleSvg: null };
  return { ...next, ...freshScramble(state), phase: 'SCRAMBLE', attemptNo: nextAttemptNo(event, team.id) };
}

// U takes back the most recent recorded attempt and reopens its PENDING gate with the same time,
// so a wrong key (Space where D was meant, say) is corrected by deciding again.
function undo(state) {
  const undone = undoLast(state.event);
  if (undone === null) return state;
  const { event, attempt } = undone;
  return {
    ...state,
    event,
    phase: 'PENDING',
    teamIndex: event.config.teams.findIndex((t) => t.id === attempt.teamId),
    attemptNo: attempt.attempt,
    pendingMs: attempt.ms,
    inspectionMs: attempt.inspectionMs,
    inspectionStartedAt: null,
    lastDecision: null,
    resultsAt: null,
    // The same scramble, under a new seq so the operator window redraws its preview.
    scramble: attempt.scramble,
    scrambleSvg: null,
    scrambleSeq: state.scrambleSeq + 1,
  };
}
