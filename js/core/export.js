// Export at any point (system design §7): JSON for the record, CSV for the CTF scoreboard.
import { attemptsFor } from './event-model.js';
import { formatMs } from './format.js';
import { effectiveMs, standings } from './scoring.js';

export function toJSON(event, now) {
  const data = { exportedAt: new Date(now).toISOString(), config: event.config, attempts: event.attempts };
  return `${JSON.stringify(data, null, 2)}\n`;
}

// One row per university, in standings order.
export function toCSV(event) {
  const n = event.config.attemptsPerCompetitor;
  const header = ['position', 'university', 'participant', 'best', ...Array.from({ length: n }, (_, i) => `attempt ${i + 1}`)];
  const rows = standings(event).map((row) => {
    const team = event.config.teams.find((t) => t.id === row.teamId);
    const attempts = attemptsFor(event, row.teamId);
    const best = row.group === 'ranked' ? formatMs(row.bestMs) : row.group === 'unranked' ? 'DNF' : '';
    return [row.position ?? '', team.university, team.participant, best,
      ...Array.from({ length: n }, (_, i) => attemptCell(attempts[i]))];
  });
  return `${[header, ...rows].map((cells) => cells.map(csvCell).join(',')).join('\n')}\n`;
}

function attemptCell(attempt) {
  if (!attempt) return '';
  if (attempt.status === 'DNF') return 'DNF';
  return attempt.penalty === '+2' ? `${formatMs(effectiveMs(attempt))} (+2)` : formatMs(attempt.ms);
}

function csvCell(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
