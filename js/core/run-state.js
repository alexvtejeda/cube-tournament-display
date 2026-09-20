// The run loop (system design §5, UI spec §5.4) as one pure reducer. Actions:
//   { type: 'mat', state, at }                  a StackmatState from a driver
//   { type: 'command', command, at }            an operator command (js/core/keymap.js)
//   { type: 'scramble', seq, scramble, svg }    the worker's answer to scramble request `seq`
// The core has no clock: `at` is the Date.now() the operator window stamped on the event.
import { createEvent, findTeam, nextAttemptNo } from './event-model.js';

// Where the operator may move around the roster. RUNNING is live and PENDING is a gate.
const IDLE_PHASES = ['STANDBY', 'SCRAMBLE', 'ARMED'];

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
        ? { ...next, phase: 'ARMED' }
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
      // of the event, or a resume). Anywhere else it moves on.
      return IDLE_PHASES.includes(phase)
        ? selectTeam(state, findTeam(state.event, state.teamIndex + (phase === 'STANDBY' ? 0 : 1), 1))
        : state;
    case 'startInspection':
      return phase === 'ARMED' && state.inspectionStartedAt === null ? { ...state, inspectionStartedAt: at } : state;
    case 'cancelInspection':
      return phase === 'ARMED' ? { ...state, inspectionStartedAt: null } : state;
    default:
      return state;
  }
}

const freshScramble = (state) => ({ scramble: null, scrambleSvg: null, scrambleSeq: state.scrambleSeq + 1 });
const cleared = () => ({ inspectionStartedAt: null, inspectionMs: null, pendingMs: null });

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
