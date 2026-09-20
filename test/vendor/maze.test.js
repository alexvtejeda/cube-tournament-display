import { test } from 'node:test';
import assert from 'node:assert/strict';

test('importing the maze starts nothing; without a canvas it draws nothing and its controls are no-ops', async () => {
  const { createMaze } = await import('../../vendor/hero-maze3d.js');
  const maze = createMaze({ canvas: null });
  assert.deepEqual(Object.keys(maze), ['pause', 'resume']);
  maze.pause();
  maze.resume();
});
