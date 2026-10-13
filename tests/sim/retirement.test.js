import { test, expect } from 'vitest';
import { shouldRetire } from '../../src/sim/retirement.js';

test('a player below the age floor never retires regardless of performance', () => {
  const player = { age: 30 };
  expect(shouldRetire(player, [{ points: 2, rebounds: 1, assists: 0, steals: 0, blocks: 0 }])).toBe(false);
});

test('a player past the performance floor between the age floor and hard cutoff retires', () => {
  const player = { age: 36 };
  expect(shouldRetire(player, [{ points: 4, rebounds: 1, assists: 1, steals: 0, blocks: 0 }])).toBe(true);
});

test('a player at the hard age cutoff retires even coming off a strong season', () => {
  const player = { age: 42 };
  expect(shouldRetire(player, [{ points: 25, rebounds: 8, assists: 6, steals: 2, blocks: 1 }])).toBe(true);
});
