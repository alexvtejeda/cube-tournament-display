import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, createStore } from '../../js/core/store.js';
import { attempt } from '../helpers/fixtures.js';

function fakeStorage() {
  const items = new Map();
  return {
    items,
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
  };
}

test('nothing saved reads as none', () => {
  assert.deepEqual(createStore(fakeStorage()).load(), { status: 'none' });
});

test('saved attempts load back', () => {
  const store = createStore(fakeStorage());
  const attempts = [attempt('alfa', 1, 12470), attempt('alfa', 2, 11000)];
  store.save(attempts);
  assert.deepEqual(store.load(), { status: 'ok', attempts });
});

test('unreadable or unknown data reads as corrupt, never as empty', () => {
  const storage = fakeStorage();
  const store = createStore(storage);
  storage.setItem(STORAGE_KEY, '{not json');
  assert.deepEqual(store.load(), { status: 'corrupt' });
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 9, attempts: [] }));
  assert.deepEqual(store.load(), { status: 'corrupt' });
});

test('archive keeps the old data under a timestamped key and clears the live one', () => {
  const storage = fakeStorage();
  const store = createStore(storage);
  store.save([attempt('alfa', 1, 12470)]);
  const saved = storage.getItem(STORAGE_KEY);
  store.archive(1760000000000);
  assert.equal(storage.getItem(`${STORAGE_KEY}:archived:1760000000000`), saved);
  assert.deepEqual(store.load(), { status: 'none' });
});

test('a store with its own key never touches another', () => {
  const storage = fakeStorage();
  createStore(storage, `${STORAGE_KEY}:mock`).save([attempt('alfa', 1, 1)]);
  assert.deepEqual(createStore(storage).load(), { status: 'none' });
});
