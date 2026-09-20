// Small builders shared by the core tests.
export function makeConfig(ids = ['alfa', 'beta', 'gamma', 'delta'], overrides = {}) {
  return {
    eventName: 'Test event',
    cutoffMs: 300000,
    attemptsPerCompetitor: 3,
    teams: ids.map((id) => ({ id, university: id.toUpperCase(), participant: '' })),
    ...overrides,
  };
}

export function attempt(teamId, n, ms, extra = {}) {
  return { teamId, attempt: n, ms, penalty: null, status: 'OK', scramble: "R U R'", inspectionMs: null, at: 0, ...extra };
}

export const dnf = (teamId, n, ms = 60000) => attempt(teamId, n, ms, { status: 'DNF' });
export const plus2 = (teamId, n, ms) => attempt(teamId, n, ms, { penalty: '+2' });
