// Loads config/event.json. Participant names are personal data and are not in the CTF database,
// so they live in config/participants.local.json, { "<teamId>": "<name>" }, which git ignores.
// Without that file every name is empty, and the screens leave the name line out.
export async function loadConfig(fetchFile = (path) => fetch(path)) {
  const config = await (await fetchFile('config/event.json')).json();
  const response = await fetchFile('config/participants.local.json');
  const names = response.ok ? await response.json() : {};
  return {
    ...config,
    teams: config.teams.map((team) => ({ ...team, participant: names[team.id] ?? team.participant })),
  };
}
