import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildEvent, parseUniversities } from '../../tools/gen-event.js';

const INIT_SQL = new URL('../../../ctf-interuniversitario/init.sql', import.meta.url);
const EVENT_JSON = new URL('../../config/event.json', import.meta.url);

test('parseUniversities reads the CHECK constraint in order', () => {
  const sql = `CREATE TABLE users (
    university VARCHAR(20) NOT NULL,
    CONSTRAINT valid_university CHECK (university IN ('LOYOLA', 'INTEC', 'ITLA')),
    CONSTRAINT other CHECK (x IN ('NOPE'))
  );`;
  assert.deepEqual(parseUniversities(sql), ['LOYOLA', 'INTEC', 'ITLA']);
});

test('parseUniversities fails loudly when the constraint is missing', () => {
  assert.throws(() => parseUniversities('CREATE TABLE t (a int);'), /valid_university/);
});

test('buildEvent derives ids from the university and leaves names empty', () => {
  const event = buildEvent(['LOYOLA', 'UNICARIBE']);
  assert.equal(event.cutoffMs, 300000);
  assert.equal(event.attemptsPerCompetitor, 3);
  assert.deepEqual(event.teams, [
    { id: 'loyola', university: 'LOYOLA', participant: '' },
    { id: 'unicaribe', university: 'UNICARIBE', participant: '' },
  ]);
});

test('config/event.json has 13 teams, each with a logo', () => {
  const event = JSON.parse(readFileSync(EVENT_JSON, 'utf8'));
  assert.equal(event.teams.length, 13);
  for (const team of event.teams) {
    assert.ok(existsSync(new URL(`../../assets/universidades/${team.id}.png`, import.meta.url)), `logo for ${team.id}`);
  }
});

test('config/event.json matches the CTF database', { skip: !existsSync(INIT_SQL) && 'init.sql not checked out' }, () => {
  const expected = buildEvent(parseUniversities(readFileSync(INIT_SQL, 'utf8')));
  assert.deepEqual(JSON.parse(readFileSync(EVENT_JSON, 'utf8')), expected);
});
