// The audience screens (UI spec §3–§7): ATTRACT, STANDBY's Resultado and Mezcla, and the solo layout
// that ARMED, RUNNING and PENDING share. Pure: every function takes snapshot data and returns HTML or
// plain values, so the rules run under node --test. js/ui/audience.js puts the HTML on the page, and
// js/ui/clock-display.js decides what the solo clock says.
import { formatMs } from '../core/format.js';

// Which screen a snapshot shows (UI spec §4.1, §7.6, §8.2, §10.1). PENDING's layout stays up for its
// verdict, after the phase has already moved on to SCRAMBLE or STANDBY.
export function screenFor({ phase, result, verdict, resultsIntro, matSilent }) {
  // The verdict comes first, which is also what exempts PENDING from NO SIGNAL: the mat plays no
  // part while the operator decides, and covering a verdict would destroy it (§10.1.1).
  if (verdict !== null || phase === 'PENDING') return 'pending';
  // The closing board arrives through ATTRACT, which is the bridge (§8.2).
  if (phase === 'RESULTS') return resultsIntro ? 'attract' : 'results';
  if (phase === 'STANDBY') return result === null ? 'attract' : 'resultado';
  if (phase === 'SCRAMBLE') return 'mezcla';
  // Only here: the mat's silence is news exactly where the room is waiting on the mat (§10.1).
  if (matSilent) return 'nosignal';
  return phase === 'ARMED' ? 'armed' : 'running';
}

// The layout families of UI spec §2.7. A screen change moves shared elements when the family
// changes, or within standby when the screen or the featured university changes.
const FAMILY = {
  attract: 'attract', resultado: 'standby', mezcla: 'standby',
  armed: 'solo', running: 'solo', pending: 'solo',
  results: 'results', nosignal: 'signal',
};
export const familyOf = (screen) => FAMILY[screen];

// The standings the column draws: as they were before the last decision until they update (§2.7).
const board = ({ standingsBefore, standings }) => standingsBefore ?? standings;

// What decides whether a change is animated: the screen, the university it features, and the
// standings the column shows.
export function sceneOf(snapshot) {
  const screen = screenFor(snapshot);
  const featured = screen === 'resultado' ? snapshot.result.teamId : snapshot.competitor?.id ?? null;
  const rows = familyOf(screen) === 'standby' ? board(snapshot).map((r) => `${r.teamId} ${r.bestMs}`).join(',') : null;
  return { screen, featured, rows };
}

// 'screen' for a screen change, 'standings' for a standings update on the same standby screen, or
// null when the page is patched in place (UI spec §2.7). The mat's changes within solo are instant.
export function changeBetween(from, to) {
  if (from === null) return null;
  const family = familyOf(to.screen);
  if (familyOf(from.screen) !== family) return 'screen';
  if (family !== 'standby') return null;
  if (from.screen !== to.screen || from.featured !== to.featured) return 'screen';
  return from.rows === to.rows ? null : 'standings';
}

// The maze stops when the solve starts and moves again with the change to Mezcla or Resultado,
// so nothing moves behind the verdict (UI spec §2.5).
export const mazeFrozen = ({ phase, verdict }) => phase === 'RUNNING' || phase === 'PENDING' || verdict !== null;

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);

// An element that keeps its identity across a screen change, and moves there (UI spec §2.7).
const vt = (name) => ` style="view-transition-name:${escapeHtml(name)}"`;

// The university plate (§2.3). Each logo already carries the university's name.
const plate = (team, named = true) =>
  `<div class="plate"${named ? vt(`plate-${team.id}`) : ''} data-team="${escapeHtml(team.id)}">`
  + `<img src="assets/universidades/${escapeHtml(team.id)}.png" alt="${escapeHtml(team.university)}"></div>`;

// The divider at the left edge of a text block. It is an element of its own, so it can move.
const RULE = `<i class="rule"${vt('rule')}></i>`;

// Left out when the roster has no name for the university (§4.2, §5.3).
const nameLine = (team) =>
  (team.participant ? `<div class="name"><span class="piece"${vt(`name-${team.id}`)}>${escapeHtml(team.participant)}</span></div>` : '');

// What ATTRACT is waiting for: the start of the event, or the board that ends it (§8.6). Each
// string lives in one place, as PENDING's do (§2.6, §7.3).
export const attractFooter = ({ phase }) => (phase === 'RESULTS' ? 'Resultados finales' : 'Comenzamos en breve');

// ATTRACT (§3). The plates follow the roster, the same order as the turns. None of them is named:
// js/ui/audience.js names the called university's plate just before ATTRACT leaves (§2.7).
// The face and the tagline are named so they can fade on their own over --t-step on the way to
// RESULTS, while the plates move over --t-long (§2.7, §8.2). The footer is a slot, so changing its
// words does not rewrite the grid and re-request thirteen logos (§8.10).
export function attractHtml(teams) {
  return `<div class="attract">
  <div class="hero">
    <div class="eyes"${vt('attract-face')}><img class="face" src="assets/rootkitty-face-attract.svg" alt=""></div>
    <div class="title">
      <img class="logo" src="assets/logo-ctf.svg" alt="CTF Interuniversitario 2026"${vt('logo')}>
      <div class="tag"${vt('attract-tag')}>RETO DEL CUBO</div>
    </div>
  </div>
  <div class="unis"${vt('attract-plates')}>${teams.map((team) => plate(team, false)).join('')}</div>
  <div class="soon" data-slot="footer"${vt('attract-footer')}></div>
</div>`;
}

// The frame every other screen shares (§4.2, §5.3). Only its slots change, so a screen change that
// stays inside it keeps the header and the band.
export const FRAME_HTML = `<div class="frame">
  <header class="hdr"><img src="assets/logo-ctf.svg" alt="CTF Interuniversitario 2026"${vt('logo')}><span data-slot="count"></span></header>
  <div class="body" data-slot="body"></div>
  <footer class="band"${vt('band')}>
    <div class="net" data-slot="net"></div>
    <div><div class="label">MEZCLA</div><div data-slot="scramble"></div></div>
    <img class="kitty" src="assets/rootkitty-face.svg" alt="">
  </footer>
</div>`;

export const countHtml = ({ startedCount, teams }) => `UNIVERSIDAD <b>${startedCount}</b> / ${teams.length}`;

// After a university's last attempt there is no next scramble yet (§4.2, §7.2).
export function scrambleHtml({ phase, scramble }) {
  if (phase === 'STANDBY') return '<div class="scr wait">Se genera al llamar a la siguiente universidad</div>';
  return `<div class="scr">${escapeHtml(scramble ?? '')}</div>`;
}

// STANDBY's body (§4.2): Resultado for the university that just finished, Mezcla for the next one.
export function standbyHtml(snapshot) {
  const resultado = snapshot.phase === 'STANDBY';
  const team = resultado ? snapshot.teams.find((t) => t.id === snapshot.result.teamId) : snapshot.competitor;
  return `<div class="standby">
  <div class="main">
    <div class="label"><span class="piece"${vt('label')}>${resultado ? 'RESULTADO' : 'A CONTINUACIÓN'}</span></div>
    <div class="who">${plate(team)}<div class="figure">${RULE}${resultado ? resultFigure(snapshot.result) : attemptFigure(snapshot)}</div></div>
    ${nameLine(team)}
  </div>
  <div class="side">
    <div class="label">CLASIFICACIÓN · MEJOR DE ${snapshot.attemptsPerCompetitor}</div>
    ${standingsHtml(snapshot, team.id)}
  </div>
</div>`;
}

// MEJOR TIEMPO carries the `time` identity, so PENDING's clock can move into it (§7.2).
function resultFigure({ bestMs, position }) {
  if (bestMs === null) return '<div class="label">MEJOR TIEMPO</div><div class="big">—</div><div class="sub">SIN TIEMPO VÁLIDO</div>';
  return `<div class="label">MEJOR TIEMPO</div><div class="big time"><span class="piece"${vt('time')}>${formatMs(bestMs)}</span></div>`
    + `<div class="sub">PUESTO <b>${position}</b></div>`;
}

const attemptFigure = ({ attemptNo, attemptsPerCompetitor }) =>
  `<div class="label"><span class="piece"${vt('attempt-word')}>INTENTO</span></div>`
  + `<div class="big"><span class="piece"${vt('attempt-n')}>${attemptNo}</span><small class="piece"${vt('attempt-of')}>DE ${attemptsPerCompetitor}</small></div>`;

// The standings column (§4.2–§4.3): always 8 slots. Ranked universities fill them from the top, at
// most 8 (the core's audience slice), and the rest are empty slots. The featured university is in
// bold when it is in the slice, and never added when it is not. A university's name and time are
// named, so they move to their new slot when the standings update; the rank and the divider belong to
// the slot and stay (§2.7).
const SLOTS = 8;
function standingsHtml(snapshot, featuredId) {
  const rows = board(snapshot);
  return Array.from({ length: SLOTS }, (_, i) => {
    const row = rows[i];
    if (row === undefined) return `<div class="row empty"><span class="r">${i + 1}</span></div>`;
    const team = snapshot.teams.find((t) => t.id === row.teamId);
    const classes = ['row', row.position === 1 && 'lead', row.teamId === featuredId && 'now'].filter(Boolean).join(' ');
    return `<div class="${classes}"><span class="r">${row.position}</span>`
      + `<span class="u"${vt(`standing-name-${team.id}`)}>${escapeHtml(team.university)}</span>`
      + `<span class="t"${vt(`standing-time-${team.id}`)}>${formatMs(row.bestMs)}</span></div>`;
  }).join('');
}

// The solo body: ARMED, RUNNING and PENDING (§5.3, §6.2, §7.4). The who line changes once per
// attempt, and js/ui/audience.js paints the clock and the status line in place, so that PENDING's
// colour changes and the verdict's tag can run as transitions.
export const SOLO_HTML = `<div class="solo">
  <div class="who" data-slot="who"></div>
  <div class="clock"><span class="digits"></span><span class="penalty"></span></div>
  <div class="status"></div>
</div>`;

// During a verdict the who line shows the attempt just decided, not the next one (§7.2). After a
// university's last attempt `competitor` is null, so the verdict names its university.
export function soloWhoHtml({ competitor, attemptNo, attemptsPerCompetitor, teams, verdict }) {
  const team = verdict ? teams.find((t) => t.id === verdict.teamId) : competitor;
  const attempt = verdict ? verdict.attempt : attemptNo;
  return `${plate(team)}<div class="txt">${RULE}`
    + `<div><span class="piece"${vt('attempt-word')}>INTENTO</span> <b class="piece"${vt('attempt-n')}>${attempt}</b>`
    + ` <span class="piece"${vt('attempt-of')}>DE ${attemptsPerCompetitor}</span></div>`
    + `${nameLine(team)}</div>`;
}

// RESULTS (§8.3). There is no band: thirteen places do not fit above one, and the event has no next
// scramble. Its absence is also what makes the band rise again on the way to Mezcla or PENDING
// (§2.7).
export const RESULTS_FRAME_HTML = `<div class="frame noband">
  <header class="hdr"><img src="assets/logo-ctf.svg" alt="CTF Interuniversitario 2026"${vt('logo')}><span>RESULTADOS FINALES</span></header>
  <div class="body" data-slot="body"></div>
</div>`;

const LUGAR = ['PRIMER LUGAR', 'SEGUNDO LUGAR', 'TERCER LUGAR'];

// What goes where the time goes (§8.6). A dash always means "competed, no valid time", so a
// university that never competed gets words instead (§2.6, locked decision 4).
const boardTime = (row) => (row.group === 'pending' ? 'NO PARTICIPÓ' : row.bestMs === null ? '—' : formatMs(row.bestMs));

// A podium step. An unranked winner gets no label and no gold, and the time reads as in the grid
// (§8.10). The kitty rides the first step, in front of the plate and clipped to it (§8.4).
function podiumStep(row, team, place) {
  const kit = place === 1
    ? '<div class="kit"><img src="assets/rootkitty-from-above.png" alt=""></div>'
    : '';
  const label = row.group === 'ranked' ? `<div class="label">${LUGAR[place - 1]}</div>` : '';
  return `<div class="step p${place}">${kit}${plate(team)}${label}<div class="time">${boardTime(row)}</div></div>`;
}

// A grid cell, places 4 to 13. No place number for a university that is not ranked (§8.6).
const gridCell = (row, team) =>
  `<div class="cell">${plate(team)}<div class="line">`
  + `<span class="place">${row.position ?? ''}</span>`
  + `<span class="time${row.group === 'pending' ? ' never' : ''}">${boardTime(row)}</span>`
  + `</div></div>`;

// The board (§8.3). finalStandings is already in its order: ranked, then all-DNF, then never
// competed (§4.3). Rows 1–3 are the podium and the rest is the grid; the layout is built for
// thirteen, as ATTRACT's is.
export function resultsHtml({ finalStandings, teams }) {
  const of = (id) => teams.find((t) => t.id === id);
  const [first, second, third] = finalStandings;
  return `<div class="results">
  <div class="podium">${podiumStep(second, of(second.teamId), 2)}${podiumStep(first, of(first.teamId), 1)}${podiumStep(third, of(third.teamId), 3)}</div>
  <div class="grid">${finalStandings.slice(3).map((r) => gridCell(r, of(r.teamId))).join('')}</div>
</div>`;
}
