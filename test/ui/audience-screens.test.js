import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduce } from '../../js/core/run-state.js';
import { buildSnapshot } from '../../js/core/snapshot.js';
import { packet } from '../../js/drivers/scenarios.js';
import {
  FRAME_HTML, RESULTS_FRAME_HTML, attractFooter, attractHtml, changeBetween, countHtml, escapeHtml, familyOf,
  mazeFrozen, resultsHtml, sceneOf, scrambleHtml, screenFor, soloWhoHtml, standbyHtml,
} from '../../js/ui/audience-screens.js';
import { attempt, dnf, makeConfig } from '../helpers/fixtures.js';
import { apply, cmd, mat } from '../helpers/actions.js';

const config = makeConfig(); // alfa, beta, gamma, delta · 3 attempts
config.teams[1].participant = 'Ana <Pérez>';
const done = (id, bestMs) => [1, 2, 3].map((n) => attempt(id, n, bestMs + (n - 1) * 1000));
const withScramble = (state) => reduce(state, { type: 'scramble', seq: state.scrambleSeq, scramble: "R U R' <b>", svg: '<svg/>' });

const snapshotOf = (state, now = 0) => buildSnapshot(state, now);
const resultado = (attempts) => snapshotOf(createState(config, attempts));
const mezcla = (attempts = []) => snapshotOf(withScramble(reduce(createState(config, attempts), cmd('next'))));
const armed = (attempts = []) => apply(withScramble(reduce(createState(config, attempts), cmd('next'))), mat(packet('I', 0)));
const running = (attempts = []) => apply(armed(attempts), mat(packet(' ', 100, true)));
const pending = (attempts = [], ms = 12470) => apply(running(attempts), mat(packet('S', ms)));
// The name each element carries, in page order.
const names = (html) => [...html.matchAll(/view-transition-name:([\w-]+)/g)].map((m) => m[1]);

test('screenFor picks the screen from the phase, the result and the verdict (UI spec §4.1, §7.6)', () => {
  assert.equal(screenFor(resultado([])), 'attract');
  assert.equal(screenFor(resultado(done('alfa', 20000))), 'resultado');
  assert.equal(screenFor(mezcla()), 'mezcla');
  assert.equal(screenFor(snapshotOf(armed())), 'armed');
  assert.equal(screenFor(snapshotOf(running())), 'running');
  assert.equal(screenFor(snapshotOf(pending())), 'pending');
  const accepted = reduce(pending(), cmd('accept', 0));
  assert.equal(accepted.phase, 'SCRAMBLE');
  assert.equal(screenFor(snapshotOf(accepted, 2999)), 'pending');
  assert.equal(screenFor(snapshotOf(accepted, 3000)), 'mezcla');
  const last = reduce(pending([attempt('alfa', 1, 20000), attempt('alfa', 2, 21000)]), cmd('accept', 0));
  assert.equal(last.phase, 'STANDBY');
  assert.equal(screenFor(snapshotOf(last, 2999)), 'pending');
  assert.equal(screenFor(snapshotOf(last, 3000)), 'resultado');
});

test('a change moves shared elements between families, and within standby on a new screen or university (§2.7)', () => {
  const scene = (screen, featured = 'alfa', rows = '') => ({ screen, featured, rows: ['resultado', 'mezcla'].includes(screen) ? rows : null });
  assert.equal(changeBetween(null, scene('mezcla')), null);
  assert.equal(changeBetween(scene('attract', null), scene('mezcla')), 'screen');
  assert.equal(changeBetween(scene('mezcla'), scene('armed')), 'screen');
  assert.equal(changeBetween(scene('pending'), scene('resultado')), 'screen');
  assert.equal(changeBetween(scene('resultado'), scene('mezcla', 'beta')), 'screen');
  assert.equal(changeBetween(scene('mezcla'), scene('mezcla', 'beta')), 'screen');
  assert.equal(changeBetween(scene('mezcla', 'alfa', 'a'), scene('mezcla', 'alfa', 'b')), 'standings');
  assert.equal(changeBetween(scene('mezcla'), scene('mezcla')), null);
  assert.equal(changeBetween(scene('armed'), scene('running')), null);
  assert.equal(changeBetween(scene('running'), scene('pending')), null);
  assert.equal(changeBetween(scene('pending'), scene('armed')), null);
});

test('sceneOf features the university on screen and the standings the column draws', () => {
  assert.deepEqual(sceneOf(resultado(done('alfa', 20000))), { screen: 'resultado', featured: 'alfa', rows: 'alfa 20000' });
  assert.deepEqual(sceneOf(mezcla()), { screen: 'mezcla', featured: 'alfa', rows: '' });
  assert.deepEqual(sceneOf(snapshotOf(armed())), { screen: 'armed', featured: 'alfa', rows: null });
});

test('the maze is frozen from the solve until the verdict ends (§2.5)', () => {
  assert.equal(mazeFrozen(snapshotOf(armed())), false);
  assert.equal(mazeFrozen(snapshotOf(running())), true);
  assert.equal(mazeFrozen(snapshotOf(pending())), true);
  const accepted = reduce(pending(), cmd('accept', 0));
  assert.equal(mazeFrozen(snapshotOf(accepted, 2999)), true);
  assert.equal(mazeFrozen(snapshotOf(accepted, 3000)), false);
});

test('ATTRACT shows one plate per university, in roster order, none of them named', () => {
  const html = attractHtml(config.teams);
  const ids = [...html.matchAll(/universidades\/(\w+)\.png/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['alfa', 'beta', 'gamma', 'delta']);
  assert.match(html, /rootkitty-face-attract\.svg/);
  // The face and the tagline are named so they can fade on their own on the way to RESULTS (§8.2);
  // no plate is, so the grid moves as one until audience.js names one just before ATTRACT leaves.
  assert.deepEqual(names(html), ['attract-face', 'logo', 'attract-tag', 'attract-plates', 'attract-footer']);
});

test('the frame names the logo and the band', () => {
  assert.deepEqual(names(FRAME_HTML), ['logo', 'band']);
});

test('the header counts started universities out of the roster', () => {
  assert.equal(countHtml(mezcla(done('alfa', 20000))), 'UNIVERSIDAD <b>2</b> / 4');
});

test('the band says a scramble is coming in Resultado, and shows it, escaped, otherwise', () => {
  assert.match(scrambleHtml(resultado(done('alfa', 20000))), /class="scr wait">Se genera al llamar a la siguiente universidad</);
  assert.match(scrambleHtml(mezcla()), /class="scr">R U R&#39; &lt;b&gt;</);
});

test('Resultado: best time, position and name of the university that just finished', () => {
  const html = standbyHtml(resultado([...done('alfa', 20000), ...done('beta', 30000)]));
  assert.match(html, />RESULTADO</);
  assert.match(html, /universidades\/beta\.png/);
  assert.match(html, /MEJOR TIEMPO<\/div><div class="big time"><span class="piece" style="view-transition-name:time">30\.00</);
  assert.match(html, /PUESTO <b>2<\/b>/);
  assert.match(html, /view-transition-name:name-beta">Ana &lt;Pérez&gt;</);
  assert.deepEqual(names(html).slice(0, 5), ['label', 'plate-beta', 'rule', 'time', 'name-beta']);
});

test('Resultado, all DNF: a dash and SIN TIEMPO VÁLIDO, no position, and no time to move into', () => {
  const html = standbyHtml(resultado([dnf('alfa', 1), dnf('alfa', 2), dnf('alfa', 3)]));
  assert.match(html, /<div class="big">—<\/div><div class="sub">SIN TIEMPO VÁLIDO</);
  assert.doesNotMatch(html, /PUESTO/);
  assert.ok(!names(html).includes('time'));
});

test('Mezcla: the next university and its attempt, with the name left out when there is none', () => {
  const html = standbyHtml(mezcla());
  assert.match(html, />A CONTINUACIÓN</);
  assert.match(html, /universidades\/alfa\.png/);
  assert.match(html, /INTENTO<\/span><\/div><div class="big"><span class="piece" style="view-transition-name:attempt-n">1<\/span><small class="piece" style="view-transition-name:attempt-of">DE 3<\/small>/);
  assert.doesNotMatch(html, /class="name"/);
  assert.deepEqual(names(html), ['label', 'plate-alfa', 'rule', 'attempt-word', 'attempt-n', 'attempt-of']);
});

test('standings: always 8 slots; with nothing ranked yet, all 8 are empty', () => {
  const html = standbyHtml(mezcla());
  assert.equal(html.match(/class="row empty"/g).length, 8);
  assert.match(html, /<div class="row empty"><span class="r">1<\/span><\/div>/);
  assert.match(html, /<div class="row empty"><span class="r">8<\/span><\/div>/);
  assert.doesNotMatch(html, /—|Aún no hay tiempos/);
});

test('standings: ranked universities fill the first slots, and the rest stay empty', () => {
  const html = standbyHtml(mezcla([...done('alfa', 20000), ...done('beta', 30000)]));
  assert.equal(html.match(/class="row( lead| now)*"/g).length, 2);
  assert.equal(html.match(/class="row empty"/g).length, 6);
  assert.match(html, /<div class="row empty"><span class="r">3<\/span><\/div>/);
});

test('standings: the leader row, and the featured university in bold when it is in the slice', () => {
  const html = standbyHtml(resultado([...done('alfa', 20000), ...done('beta', 30000)]));
  assert.match(html, /<div class="row lead"><span class="r">1<\/span><span class="u" style="view-transition-name:standing-name-alfa">ALFA<\/span><span class="t" style="view-transition-name:standing-time-alfa">20\.00<\/span><\/div>/);
  assert.match(html, /<div class="row now"><span class="r">2<\/span><span class="u" style="view-transition-name:standing-name-beta">BETA<\/span>/);
});

test('standings: a featured university outside the slice is not added', () => {
  const html = standbyHtml(mezcla([dnf('alfa', 1)]));
  assert.equal(html.match(/class="row empty"/g).length, 8);
});

test('standings: until they update after a verdict, the column draws them as they were before it', () => {
  const before = [...done('alfa', 20000), attempt('beta', 1, 30000), attempt('beta', 2, 31000)];
  const decided = reduce(pending(before, 10000), cmd('accept', 0));
  const waiting = standbyHtml(snapshotOf(decided, 3000));
  assert.match(waiting, /standing-name-alfa">ALFA<\/span><span class="t" style="view-transition-name:standing-time-alfa">20\.00/);
  assert.match(waiting, /standing-time-beta">30\.00/);
  const updated = standbyHtml(snapshotOf(decided, 4200));
  assert.match(updated, /<div class="row lead now"><span class="r">1<\/span><span class="u" style="view-transition-name:standing-name-beta">/);
  assert.match(updated, /standing-time-beta">10\.00/);
});

test('the solo who line names the attempt, and the participant when there is one', () => {
  const alfa = soloWhoHtml(snapshotOf(armed([attempt('alfa', 1, 20000)])));
  assert.match(alfa, /INTENTO<\/span> <b class="piece" style="view-transition-name:attempt-n">2<\/b> <span class="piece" style="view-transition-name:attempt-of">DE 3</);
  assert.doesNotMatch(alfa, /class="name"/);
  assert.deepEqual(names(alfa), ['plate-alfa', 'rule', 'attempt-word', 'attempt-n', 'attempt-of']);
  const beta = soloWhoHtml(snapshotOf(armed(done('alfa', 20000))));
  assert.match(beta, /universidades\/beta\.png/);
  assert.match(beta, /class="name"><span class="piece" style="view-transition-name:name-beta">Ana &lt;Pérez&gt;</);
});

test('during a verdict the who line shows the attempt just decided, even after the university is done', () => {
  const second = reduce(pending([attempt('alfa', 1, 20000)]), cmd('accept', 0));
  assert.equal(second.attemptNo, 3);
  assert.match(soloWhoHtml(snapshotOf(second)), /attempt-n">2</);
  const last = reduce(pending([attempt('alfa', 1, 20000), attempt('alfa', 2, 21000)]), cmd('dnf', 0));
  assert.equal(snapshotOf(last).competitor, null);
  assert.match(soloWhoHtml(snapshotOf(last)), /universidades\/alfa\.png[\s\S]*attempt-n">3</);
});

test('escapeHtml escapes the five special characters', () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});

// --- RESULTS and NO SIGNAL (UI spec §8.2, §10.1) ---

// Only the fields these rules read. A real snapshot has many more.
const view = (extra = {}) => ({
  phase: 'ARMED', result: null, verdict: null, resultsIntro: false, matSilent: false, ...extra,
});

test('RESULTS shows the bridge first and the board after', () => {
  assert.equal(screenFor(view({ phase: 'RESULTS', resultsIntro: true })), 'attract');
  assert.equal(screenFor(view({ phase: 'RESULTS', resultsIntro: false })), 'results');
});

test('a silent mat takes over ARMED and RUNNING', () => {
  assert.equal(screenFor(view({ phase: 'ARMED', matSilent: true })), 'nosignal');
  assert.equal(screenFor(view({ phase: 'RUNNING', matSilent: true })), 'nosignal');
});

test('a silent mat changes nothing anywhere else', () => {
  assert.equal(screenFor(view({ phase: 'PENDING', matSilent: true })), 'pending');
  assert.equal(screenFor(view({ phase: 'STANDBY', matSilent: true })), 'attract');
  assert.equal(screenFor(view({ phase: 'STANDBY', matSilent: true, result: { teamId: 'intec' } })), 'resultado');
  assert.equal(screenFor(view({ phase: 'SCRAMBLE', matSilent: true })), 'mezcla');
  assert.equal(screenFor(view({ phase: 'RESULTS', matSilent: true })), 'results');
});

test('a verdict outlasts a silent mat, so PENDING is never covered', () => {
  const verdict = { kind: 'OK', teamId: 'intec', attempt: 2, ms: 84020, reason: null };
  assert.equal(screenFor(view({ phase: 'SCRAMBLE', matSilent: true, verdict })), 'pending');
});

test('the two new families', () => {
  assert.equal(familyOf('results'), 'results');
  assert.equal(familyOf('nosignal'), 'signal');
});

test('a change runs into and out of NO SIGNAL, but never inside it', () => {
  const solo = { screen: 'running', featured: 'intec', rows: null };
  const gone = { screen: 'nosignal', featured: 'intec', rows: null };
  assert.equal(changeBetween(solo, gone), 'screen');
  assert.equal(changeBetween(gone, solo), 'screen');
  assert.equal(changeBetween(gone, { ...gone }), null);
});

test('a change runs from the bridge to the board', () => {
  assert.equal(changeBetween({ screen: 'attract', featured: null, rows: null }, { screen: 'results', featured: null, rows: null }), 'screen');
});

test("ATTRACT's footer names what the room is waiting for", () => {
  assert.equal(attractFooter({ phase: 'STANDBY' }), 'Comenzamos en breve');
  assert.equal(attractFooter({ phase: 'RESULTS' }), 'Resultados finales');
});

test('ATTRACT names its face and tagline, for the bridge out', () => {
  const html = attractHtml([{ id: 'intec', university: 'INTEC', participant: null }]);
  assert.ok(html.includes('view-transition-name:attract-face'));
  assert.ok(html.includes('view-transition-name:attract-tag'));
  assert.ok(html.includes('data-slot="footer"'), 'the footer is a slot, so its words change in place');
});

// --- The closing board (UI spec §8.3, §8.6) ---

const TEAMS = [
  { id: 'intec', university: 'INTEC', participant: 'José Martínez' },
  { id: 'itla', university: 'ITLA', participant: 'Ana Pérez' },
  { id: 'pucmm', university: 'PUCMM', participant: null },
  { id: 'uapa', university: 'UAPA', participant: null },
  { id: 'unibe', university: 'UNIBE', participant: null },
];

const row = (teamId, group, position, bestMs) => ({ teamId, group, position, bestMs });

const finalBoard = () => ({
  teams: TEAMS,
  finalStandings: [
    row('intec', 'ranked', 1, 84020),
    row('itla', 'ranked', 2, 104180),
    row('pucmm', 'ranked', 3, 115880),
    row('uapa', 'unranked', null, null),
    row('unibe', 'pending', null, null),
  ],
});

test('the podium reads 2nd, 1st, 3rd, and the rest go to the grid', () => {
  const html = resultsHtml(finalBoard());
  const podium = html.slice(html.indexOf('class="podium"'), html.indexOf('class="grid"'));
  assert.deepEqual([...podium.matchAll(/data-team="([a-z]+)"/g)].map((m) => m[1]), ['itla', 'intec', 'pucmm']);
  const grid = html.slice(html.indexOf('class="grid"'));
  assert.deepEqual([...grid.matchAll(/data-team="([a-z]+)"/g)].map((m) => m[1]), ['uapa', 'unibe']);
});

test('every university appears exactly once, and every plate is named', () => {
  const html = resultsHtml(finalBoard());
  for (const team of TEAMS) {
    assert.equal(html.split(`data-team="${team.id}"`).length - 1, 1, `${team.id} appears once`);
    assert.ok(html.includes(`view-transition-name:plate-${team.id}`), `${team.id}'s plate is named`);
  }
});

test('the podium labels the three places, and only a ranked one', () => {
  const html = resultsHtml(finalBoard());
  assert.ok(html.includes('PRIMER LUGAR'));
  assert.ok(html.includes('SEGUNDO LUGAR'));
  assert.ok(html.includes('TERCER LUGAR'));
});

test('an unranked podium row shows no label and no place', () => {
  const board = finalBoard();
  board.finalStandings = [
    row('intec', 'unranked', null, null),
    row('itla', 'pending', null, null),
    row('pucmm', 'pending', null, null),
    row('uapa', 'pending', null, null),
    row('unibe', 'pending', null, null),
  ];
  const html = resultsHtml(board);
  assert.ok(!html.includes('PRIMER LUGAR'));
  assert.ok(html.includes('—'), 'competed, no valid time');
  assert.ok(html.includes('NO PARTICIPÓ'), 'never competed');
});

test('a dash means competed with no valid time, and NO PARTICIPÓ means never competed', () => {
  const html = resultsHtml(finalBoard());
  const cell = (id) => {
    const start = html.indexOf(`data-team="${id}"`);
    return html.slice(start, html.indexOf('</div></div>', start));
  };
  assert.ok(cell('uapa').includes('—'));
  assert.ok(!cell('uapa').includes('NO PARTICIPÓ'));
  assert.ok(cell('unibe').includes('NO PARTICIPÓ'));
});

test('the winner carries the kitty, and nobody else does', () => {
  const html = resultsHtml(finalBoard());
  assert.equal(html.split('class="kit"').length - 1, 1);
  assert.ok(html.indexOf('class="kit"') < html.indexOf('data-team="intec"'), 'inside the first step');
  assert.ok(html.includes('rootkitty-from-above.png'));
});

test('RESULTS has no band, which is what lets the band rise again on the way out', () => {
  assert.ok(!RESULTS_FRAME_HTML.includes('class="band"'));
  assert.ok(RESULTS_FRAME_HTML.includes('RESULTADOS FINALES'));
  assert.ok(RESULTS_FRAME_HTML.includes('view-transition-name:logo'));
});
