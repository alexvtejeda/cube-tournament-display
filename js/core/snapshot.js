// The snapshot the operator window broadcasts to the audience (system design §4, UI spec §4.4, §5.5
// and §7.6). The audience renders it and holds nothing else. Pure: `now` is passed in.
import { startedCount, undoLast } from './event-model.js';
import { handsFromHeader } from './inspection.js';
import { audienceStandings, latestResult, standings } from './scoring.js';

// How long the room sees a verdict, from the operator's key to the screen change (UI spec §7.2).
export const VERDICT_MS = 3000;
// When the standings update after a verdict: once the screen change (--t-long, 800 ms) and a pause
// (--t-step, 400 ms) have run. The two numbers are the motion tokens of UI spec §2.2.
export const STANDINGS_UPDATE_MS = VERDICT_MS + 800 + 400;
// The bridge through ATTRACT after F: the screen change into it (--t-long, 800 ms) and the hold
// (two --t-long, 1600 ms), UI spec §8.2. The same motion tokens again.
export const RESULTS_INTRO_MS = 800 + 1600;

// `matSilent` comes from the operator window, which owns the microphone and the packet clock: the
// core has neither (UI spec §10.6). It defaults to false so every existing caller and test is
// unaffected, and so a window that never measures shows no takeover rather than a permanent one.
export function buildSnapshot(state, now, { matSilent = false } = {}) {
  const { event, phase } = state;
  const { config } = event;
  const table = standings(event);
  // RESULTS has no competitor, for the same reason STANDBY has none: nobody is up (UI spec §8.8).
  const competitor = phase === 'STANDBY' || phase === 'RESULTS' ? null : config.teams[state.teamIndex];
  return {
    phase,
    teams: config.teams, // the roster in order, for ATTRACT's plates and the standings names
    competitor,
    attemptNo: competitor ? state.attemptNo : null,
    attemptsPerCompetitor: config.attemptsPerCompetitor,
    startedCount: startedCount(event, competitor?.id ?? null),
    displayMs: phase === 'RUNNING' ? state.mat.time_milli : phase === 'PENDING' ? state.pendingMs : null,
    cutoffMs: config.cutoffMs,
    scramble: competitor ? state.scramble : null,
    scrambleSvg: competitor ? state.scrambleSvg : null,
    signal: { on: state.signalOn },
    standings: audienceStandings(table, 8),
    result: latestResult(event, table),
    // Counted from the latest packet, so the countdown moves at the mat's ~10 Hz.
    inspectionMs: phase === 'ARMED' && state.inspectionStartedAt !== null ? now - state.inspectionStartedAt : null,
    hands: state.signalOn ? handsFromHeader(state.mat?.signalHeader) : 'up',
    verdict: verdictAt(state.lastDecision, now),
    standingsBefore: standingsBefore(state, now),
    // The full table — ranked, then all-DNF, then never competed — for the closing board. The
    // capped `standings` above is unchanged (UI spec §4.3, §8.8).
    finalStandings: phase === 'RESULTS' ? table : null,
    // The bridge through ATTRACT, from F to the board (UI spec §8.2).
    resultsIntro: phase === 'RESULTS' && now - state.resultsAt < RESULTS_INTRO_MS,
    matSilent,
  };
}

// The last decision, while the room is shown it (UI spec §7.5).
function verdictAt(decision, now) {
  if (decision === null || now - decision.at >= VERDICT_MS) return null;
  const { kind, teamId, attempt, ms, reason } = decision;
  return { kind, teamId, attempt, ms, reason };
}

// The audience standings as they were before the decision, until they update (UI spec §2.7). A redo
// records nothing, so there is nothing to update.
function standingsBefore({ lastDecision, event }, now) {
  if (lastDecision === null || lastDecision.kind === 'REDO' || now - lastDecision.at >= STANDINGS_UPDATE_MS) return null;
  return audienceStandings(standings(undoLast(event).event), 8);
}
