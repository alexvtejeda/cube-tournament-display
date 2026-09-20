// Persistence (system design §7): the attempt log is written after every change. The config is not
// stored; config/event.json is its source. `storage` is localStorage in the browser, a fake in tests.
export const STORAGE_KEY = 'cube-tournament-display:attempts:v1';

export function createStore(storage, key = STORAGE_KEY) {
  return {
    save(attempts) {
      storage.setItem(key, JSON.stringify({ version: 1, attempts }));
    },
    // { status: 'none' } · { status: 'ok', attempts } · { status: 'corrupt' }
    load() {
      const raw = storage.getItem(key);
      if (raw === null) return { status: 'none' };
      try {
        const data = JSON.parse(raw);
        if (data?.version === 1 && Array.isArray(data.attempts)) return { status: 'ok', attempts: data.attempts };
      } catch {
        // unreadable JSON falls through to corrupt
      }
      return { status: 'corrupt' };
    },
    // Starting fresh never destroys anything: the old log moves to a timestamped key.
    archive(now) {
      const raw = storage.getItem(key);
      if (raw !== null) storage.setItem(`${key}:archived:${now}`, raw);
      storage.removeItem(key);
    },
    // Starting fresh in mock mode: a rehearsal's results can never be wanted back, and archiving
    // every one of them would grow localStorage without bound (operator spec §4.6).
    clear() {
      storage.removeItem(key);
    },
  };
}
