import { test, expect } from 'vitest';
import { applyProgression } from '../../src/sim/progression.js';
import { ATTRIBUTE_KEYS, ATTRIBUTE_MAX } from '../../src/data/player.js';

test('a young player (age <= 26) with strong performance improves', () => {
  const player = { age: 22, attributes: Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 50])) };
  const strongSeason = [{ points: 28, rebounds: 8, assists: 6, steals: 2, blocks: 1 }];
  const next = applyProgression(player, strongSeason);
  expect(next.age).toBe(23);
  const totalBefore = Object.values(player.attributes).reduce((a, b) => a + b, 0);
  const totalAfter = Object.values(next.attributes).reduce((a, b) => a + b, 0);
  expect(totalAfter).toBeGreaterThan(totalBefore);
});

test('a veteran (age >= 32) declines even with a decent season', () => {
  const player = { age: 34, attributes: Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 80])) };
  const next = applyProgression(player, [{ points: 18, rebounds: 5, assists: 4, steals: 1, blocks: 1 }]);
  const totalBefore = Object.values(player.attributes).reduce((a, b) => a + b, 0);
  const totalAfter = Object.values(next.attributes).reduce((a, b) => a + b, 0);
  expect(totalAfter).toBeLessThan(totalBefore);
});

test('attributes never exceed ATTRIBUTE_MAX', () => {
  const player = { age: 22, attributes: Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, ATTRIBUTE_MAX])) };
  const next = applyProgression(player, [{ points: 30, rebounds: 10, assists: 10, steals: 3, blocks: 3 }]);
  ATTRIBUTE_KEYS.forEach((k) => expect(next.attributes[k]).toBeLessThanOrEqual(ATTRIBUTE_MAX));
});
