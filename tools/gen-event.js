// Writes config/event.json from the CTF database's roster. The valid_university CHECK constraint
// in ctf-interuniversitario/init.sql is the source of truth (system design §1), so a university's
// spelling can never drift from the CTF's. Participant names are not in the database: see
// js/config.js.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export function parseUniversities(sql) {
  const match = sql.match(/CONSTRAINT\s+valid_university\s+CHECK\s*\(\s*university\s+IN\s*\(([^)]*)\)/i);
  if (!match) throw new Error('valid_university constraint not found in init.sql');
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

export function buildEvent(universities) {
  return {
    eventName: 'CTF Interuniversitario 2026 — Reto del Cubo',
    cutoffMs: 300000,
    attemptsPerCompetitor: 3,
    teams: universities.map((university) => ({ id: university.toLowerCase(), university, participant: '' })),
  };
}

if (import.meta.main) {
  const source = process.argv[2] ?? new URL('../../ctf-interuniversitario/init.sql', import.meta.url);
  const event = buildEvent(parseUniversities(readFileSync(source, 'utf8')));
  mkdirSync(new URL('../config/', import.meta.url), { recursive: true }); // a fresh checkout has none
  writeFileSync(new URL('../config/event.json', import.meta.url), `${JSON.stringify(event, null, 2)}\n`);
  console.log(`Wrote ${event.teams.length} teams to config/event.json`);
}
