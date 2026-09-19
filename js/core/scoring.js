// Best-of-N scoring and the standings table (system design §6, UI spec §4.3).
import { attemptsFor } from './event-model.js';

export function effectiveMs(attempt) {
  return attempt.ms + (attempt.penalty === '+2' ? 2000 : 0);
}

const GROUP_ORDER = { ranked: 0, unranked: 1, pending: 2 };

// The full table, one row per university: { teamId, group, position, bestMs }.
//   ranked    at least one OK attempt; by best effective time, then second best, then roster order
//   unranked  attempts, none OK (all DNF); roster order, no position
//   pending   no attempts yet; roster order, no position
export function standings(event) {
  const rows = event.config.teams.map((team, rosterIndex) => {
    const attempts = attemptsFor(event, team.id);
    const times = attempts.filter((a) => a.status === 'OK').map(effectiveMs).sort((a, b) => a - b);
    const group = times.length > 0 ? 'ranked' : attempts.length > 0 ? 'unranked' : 'pending';
    return { teamId: team.id, group, bestMs: times[0] ?? null, secondMs: times[1] ?? Infinity, rosterIndex };
  });
  rows.sort((a, b) =>
    GROUP_ORDER[a.group] - GROUP_ORDER[b.group] ||
    (a.group === 'ranked' ? a.bestMs - b.bestMs || a.secondMs - b.secondMs : 0) ||
    a.rosterIndex - b.rosterIndex);
  let position = 0;
  return rows.map(({ teamId, group, bestMs }) => {
    if (group === 'ranked') position += 1;
    return { teamId, group, position: group === 'ranked' ? position : null, bestMs };
  });
}

// What the room sees (UI spec §4.3): ranked universities only, at most `limit`.
export function audienceStandings(table, limit = 8) {
  return table.filter((row) => row.group === 'ranked').slice(0, limit);
}

// The university that most recently completed its attempts (UI spec §4.4): { teamId, bestMs,
// position }, or null before any has. Derived from the log every time, so an undo can never leave
// a stale result on screen.
export function latestResult(event, table = standings(event)) {
  const last = event.attempts.findLast((a) => a.attempt === event.config.attemptsPerCompetitor);
  if (!last) return null;
  const row = table.find((r) => r.teamId === last.teamId);
  return { teamId: last.teamId, bestMs: row.bestMs, position: row.position };
}
