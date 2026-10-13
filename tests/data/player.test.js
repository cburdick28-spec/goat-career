import { test, expect } from 'vitest';
import { createPlayer, ATTRIBUTE_KEYS, ATTRIBUTE_MIN, ATTRIBUTE_MAX } from '../../src/data/player.js';

test('normal mode rejects allocation exceeding the budget', () => {
  const over = { shooting: 99, speed: 99, dunking: 99, defense: 99, passing: 99, rebounding: 1 }; // sums to 496 > 360
  expect(() => createPlayer({ name: 'A', position: 'PG', archetype: 'PLAYMAKER', attributes: over, mode: 'normal' }))
    .toThrow('BUDGET_EXCEEDED');
});

test('normal mode accepts an allocation using exactly the budget', () => {
  const exact = { shooting: 60, speed: 60, dunking: 60, defense: 60, passing: 60, rebounding: 60 }; // sums to 360
  const player = createPlayer({ name: 'A', position: 'PG', archetype: 'PLAYMAKER', attributes: exact, mode: 'normal' });
  expect(player.attributes).toEqual(exact);
});

test('legend mode allows every attribute at ATTRIBUTE_MAX', () => {
  const maxed = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, ATTRIBUTE_MAX]));
  const player = createPlayer({ name: 'A', position: 'C', archetype: 'REBOUNDER', attributes: maxed, mode: 'legend' });
  expect(player.attributes).toEqual(maxed);
});

test('attributes are clamped to [ATTRIBUTE_MIN, ATTRIBUTE_MAX] in both modes', () => {
  const outOfRange = { shooting: 10, speed: 150, dunking: 50, defense: 50, passing: 50, rebounding: 50 };
  const player = createPlayer({ name: 'A', position: 'SF', archetype: 'SLASHER', attributes: outOfRange, mode: 'legend' });
  expect(player.attributes.shooting).toBe(ATTRIBUTE_MIN);
  expect(player.attributes.speed).toBe(ATTRIBUTE_MAX);
});
