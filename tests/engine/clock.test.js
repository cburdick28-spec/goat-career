import { test, expect } from 'vitest';
import { createGameClock, tickClock, isExpired } from '../../src/engine/clock.js';

test('tickClock reduces remaining time and floors at 0', () => {
  let clock = createGameClock(10);
  clock = tickClock(clock, 7);
  expect(clock.remaining).toBe(3);
  clock = tickClock(clock, 7);
  expect(clock.remaining).toBe(0);
});

test('isExpired is true once remaining reaches 0', () => {
  expect(isExpired(tickClock(createGameClock(5), 5))).toBe(true);
  expect(isExpired(createGameClock(5))).toBe(false);
});
