// The event: the roster from config/event.json plus the log of recorded attempts, oldest first.
// Only the log is persisted (system design §7). Every function is pure and returns new objects.
//
// An attempt: { teamId, attempt, ms, penalty: null | '+2', status: 'OK' | 'DNF', scramble,
//               inspectionMs, at }   (system design §6, UI spec §5.4)

export function createEvent(config, attempts = []) {
  return { config, attempts };
}

export function attemptsFor(event, teamId) {
  return event.attempts.filter((a) => a.teamId === teamId);
}

export function nextAttemptNo(event, teamId) {
  return attemptsFor(event, teamId).length + 1;
}

export function isComplete(event, teamId) {
  return attemptsFor(event, teamId).length >= event.config.attemptsPerCompetitor;
}

export function recordAttempt(event, attempt) {
  return { ...event, attempts: [...event.attempts, attempt] };
}

// Takes back the most recent attempt, whichever university it belongs to. null when there is none.
export function undoLast(event) {
  if (event.attempts.length === 0) return null;
  return { event: { ...event, attempts: event.attempts.slice(0, -1) }, attempt: event.attempts.at(-1) };
}

// Roster navigation for N and ←/→: the first university at `from` or beyond, moving by `step`
// (1 or -1) and wrapping around, that still has attempts left. -1 when every university is done.
export function findTeam(event, from, step) {
  const { teams } = event.config;
  for (let i = 0; i < teams.length; i += 1) {
    const index = (((from + step * i) % teams.length) + teams.length) % teams.length;
    if (!isComplete(event, teams[index].id)) return index;
  }
  return -1;
}

// The header's UNIVERSIDAD {n} (UI spec §4.2): universities that have started, counting the one on
// screen even before its first attempt is recorded. `onScreenTeamId` is null when none is.
export function startedCount(event, onScreenTeamId) {
  const started = new Set(event.attempts.map((a) => a.teamId));
  if (onScreenTeamId !== null) started.add(onScreenTeamId);
  return started.size;
}
